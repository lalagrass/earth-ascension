/*
 * SG-RT-02V／03a／04：把控制器、場景、畫面與存讀接到瀏覽器。只處理 DOM 事件、requestAnimationFrame、分頁可見性與 localStorage。
 * 選取、hover、鏡頭、選單與動畫都只是畫面狀態，不碰世界；世界只經 controller 的 frame（推進）與 dispatch（下令）改變。
 * 打開選單或編輯器時記下意圖（世代＋revision），送出時用它；播放中開選單會自動暫停，並記住原本是否在播放。
 * 每幀只更新內容有變的 DOM（依字串或人物、事件 key 比對），播放中點按鈕不會被重建吃掉，焦點也保留。
 * 保存只在控制器通知的幀末保存點、暫停與「立即保存」時發生；下令後只刷新保存狀態（未保存），不另加保存時機。
 */
(function () {
  'use strict';
  const ns = window.SectChronicle;
  const Controller = ns.ViewerController;
  const View = ns.ViewerView;
  const Actions = ns.ViewerActions;
  const Scene = ns.ViewerScene;
  const Storage = ns.Storage;
  const Realtime = ns.Realtime;
  const deps = { Rules: ns.Rules, StoryData: ns.StoryData, Story: ns.Story, Progression: ns.Progression, Realtime };
  const $ = (id) => document.getElementById(id);
  const esc = View.esc;
  const clone = (v) => JSON.parse(JSON.stringify(v));

  // 本分頁的寫者 id：只用來分辨分頁，不用世界 RNG，也不進世界。
  const writerId = window.crypto && typeof window.crypto.randomUUID === 'function'
    ? window.crypto.randomUUID() : `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  let localStorageRef = null;
  try {
    localStorageRef = window.localStorage;
  } catch (e) {
    localStorageRef = null; // 權限被擋：當成本地保存不可用
  }
  const store = Storage.createStore({ storage: localStorageRef, locks: navigator.locks || null, writerId });
  const session = Storage.createSession(store);
  let inspection = store.open();
  const metrics = { lastSave: null, lastLoad: null };

  const ctl = Controller.createController(Realtime, { onSavePoint: (reasons) => autosave(reasons.join('+')) });
  const scene = Scene.createScene($('scene'), deps);
  const DEFAULT_GOALS = Realtime.createWorld('defaults').state.goals;
  const GOAL_CATALOG = Actions.goalCatalog(deps.Rules, DEFAULT_GOALS);
  const CHOICES = Actions.characterChoices(deps.Rules, deps.StoryData);
  // ui 全是畫面狀態。menu：{ target, anchor, intent, draft }；pausedByMenu：選單打開時是否由我們暫停。
  const ui = { selected: null, hover: null, hoverPerson: null, menu: null, pausedByMenu: false };
  const setup = {
    characterOptions: clone(ns.State.DEFAULT_CHARACTER_OPTIONS),
    policy: clone(Realtime.DEFAULT_POLICY),
    goals: clone(DEFAULT_GOALS),
  };
  let model = null;
  let modelWorld = null;
  let seenEvents = 0; // 已轉成回饋的事件數
  let dirtyUi = true;

  // ---------- 存讀 ----------

  function recordSave(r, ms) {
    if (r && r.ok && !r.skipped) metrics.lastSave = { tick: r.tick, slot: r.slot, bytes: r.bytes, ms: Math.round(ms * 10) / 10 };
  }

  function autosave(reason) {
    if (!ctl.world) return;
    const t0 = performance.now();
    session.request(ctl.world, { reason }).then((r) => {
      recordSave(r, performance.now() - t0);
      refreshInspection();
      dirtyUi = true;
      draw();
    });
    dirtyUi = true;
    draw();
  }

  // 立即保存：遇到需要確認的情況才問；確認後只帶對應的旗標再試一次，不默默覆蓋。
  async function saveNow() {
    if (!ctl.world) return;
    const flags = { manual: true };
    const t0 = performance.now();
    let r = await session.request(ctl.world, flags);
    for (let i = 0; i < 2 && !r.ok; i += 1) {
      if ((r.code === 'not_owner' || r.code === 'external_change') && !flags.takeover) {
        const why = r.code === 'not_owner' ? '這個瀏覽器已有其他分頁或之前留下的存檔。' : '另一個分頁已改動存檔。';
        if (!window.confirm(`${why}\n要在此分頁接續並保存目前的世界嗎？目前的存檔會留作上一份備份。`)) break;
        flags.takeover = true;
      } else if (r.code === 'overwrite_broken_slot' && !flags.overwriteBroken) {
        if (!window.confirm(`${r.reason}\n確定覆寫嗎？`)) break;
        flags.overwriteBroken = true;
      } else {
        break;
      }
      r = await session.request(ctl.world, flags);
    }
    recordSave(r, performance.now() - t0);
    refreshInspection();
    dirtyUi = true;
    draw();
    return r;
  }

  function confirmDiscard(action) {
    if (!ctl.world || ctl.mode === 'setup' || !session.isDirty(ctl.world)) return true;
    return window.confirm(`目前的世界還沒保存。${action}會換掉它，確定嗎？`);
  }

  function enterViewer() {
    $('setup').hidden = true;
    $('viewer').hidden = false;
    dirtyUi = true;
    draw();
  }

  function showSetup() {
    inspection = store.inspect();
    $('setup').hidden = false;
    $('viewer').hidden = true;
    $('setup-save-error').textContent = '';
    prepare();
  }

  function replaceWorld(world, kind, baseline, ms) {
    const r = ctl.load(world);
    if (!r.ok) return r;
    session.begin(kind, baseline);
    worldReplaced();
    refreshInspection();
    if (ms !== undefined) metrics.lastLoad = { tick: world.clock.tick, ms: Math.round(ms * 10) / 10 };
    enterViewer();
    return r;
  }

  async function loadSaved() {
    if (!confirmDiscard('讀取存檔')) return;
    const t0 = performance.now();
    const seen = inspection;
    let r;
    if (store.canWrite) {
      r = await store.adopt(seen.pointer.raw);
    } else {
      const slot = seen.slots[seen.active].result;
      r = slot.ok ? Object.assign({ slot: seen.active }, slot) : slot;
    }
    if (!r.ok) {
      $('setup-save-error').textContent = `沒有讀取：${r.code}：${r.reason}`;
      inspection = store.inspect();
      renderSetupSave();
      return;
    }
    replaceWorld(r.world, 'load', { revision: r.envelope.revision, tick: r.envelope.tick, slot: r.slot }, performance.now() - t0);
  }

  async function restoreSlot(slot) {
    if (!window.confirm(`把存檔恢復成${slot === 'a' ? '槽 A' : '槽 B'}？另一槽的資料不會刪除；若它損壞，之後保存前會再問一次。`)) return;
    if (!confirmDiscard('恢復存檔')) return;
    const t0 = performance.now();
    const r = await store.restore(slot, inspection.pointer ? inspection.pointer.raw : null);
    if (!r.ok) {
      $('setup-save-error').textContent = `沒有恢復：${r.code}：${r.reason}`;
      inspection = store.inspect();
      renderSetupSave();
      return;
    }
    replaceWorld(r.world, 'load', { revision: r.envelope.revision, tick: r.envelope.tick, slot: r.slot }, performance.now() - t0);
  }

  function download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportWorld() {
    if (!ctl.world) return;
    const env = Storage.makeEnvelope(ctl.world, new Date().toISOString());
    if (!env.ok) {
      $('save-status').textContent = `不能匯出：${env.code}：${env.reason}`;
      return;
    }
    download(Storage.exportFileName(ctl.world), env.text);
  }

  function exportRaw(which) {
    const key = which === 'pointer' ? Storage.POINTER_KEY : Storage.SLOT_KEYS[which];
    const r = store.readRaw(key);
    if (r.ok && r.raw !== null) download(`${key.replace(/:/g, '-')}.raw.json`, r.raw);
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const t0 = performance.now();
      const r = Storage.readSave(String(reader.result));
      const where = $('setup').hidden ? $('save-status') : $('setup-save-error');
      if (!r.ok) {
        where.textContent = `沒有匯入（現有世界與存檔都沒改）：${r.code}：${r.reason}`;
        return;
      }
      if (!confirmDiscard('匯入')) return;
      // 匯入只換記憶體裡的世界；之後保存時照同一套寫者規則處理。
      replaceWorld(r.world, 'import', null, performance.now() - t0);
    };
    reader.onerror = () => {
      $('setup-save-error').textContent = '讀不到這個檔案';
    };
    reader.readAsText(file);
  }


  // ---------- 局部 DOM 更新 ----------

  // 內容沒變就不動 DOM。重建時保留已展開的 <details> 與焦點（依 data-focus-key）。
  function setHtml(el, html) {
    if (el._html === html) return;
    const open = [...el.querySelectorAll('details')].map((d) => d.open);
    const active = document.activeElement && el.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
    el._html = html;
    el.innerHTML = html;
    const now = el.querySelectorAll('details');
    if (now.length === open.length) now.forEach((d, i) => { d.open = open[i]; });
    if (active) {
      const again = el.querySelector(`[data-focus-key="${CSS.escape(active)}"]`);
      if (again) again.focus();
    }
  }
  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  // 依 key 維持一組子節點：新的才建立，舊的只更新內容，不在的移除。
  function keyedList(box, items, keyOf, create, update) {
    const have = new Map([...box.children].filter((c) => c.dataset.key !== undefined).map((c) => [c.dataset.key, c]));
    const empty = box.querySelector(':scope > .empty');
    if (items.length === 0) {
      for (const c of have.values()) c.remove();
      if (!empty) box.insertAdjacentHTML('beforeend', '<p class="empty hint">（沒有）</p>');
      return;
    }
    if (empty) empty.remove();
    let prev = null;
    for (const item of items) {
      const key = keyOf(item);
      let el = have.get(key);
      if (!el) {
        const tmp = document.createElement('div');
        tmp.innerHTML = create(item).trim();
        el = tmp.firstElementChild;
        el.dataset.key = key;
      }
      have.delete(key);
      update(el, item);
      const want = prev ? prev.nextElementSibling : box.firstElementChild;
      if (want !== el) box.insertBefore(el, want);
      prev = el;
    }
    for (const c of have.values()) c.remove();
  }

  // ---------- 開局：建角、政策與目標 ----------

  const ATTR_NAMES = Actions.ATTRIBUTE_NAMES;
  function readableReason(reason) {
    let out = String(reason || '');
    for (const k of Object.keys(ATTR_NAMES)) out = out.split(k).join(ATTR_NAMES[k]);
    return out;
  }

  function renderCharacterForm() {
    const c = setup.characterOptions;
    const tpl = CHOICES.templates.map((t) => `<label><input type="radio" name="tpl" value="${esc(t.id)}" ${t.id === c.templateId ? 'checked' : ''}>
      ${esc(t.label)} <small>（${CHOICES.attributes.map((a) => `${esc(a.label)} ${t.base[a.key]}`).join('、')}）</small></label>`).join('');
    const alloc = CHOICES.attributes.map((a) => `<label>${esc(a.label)} +<input type="number" min="0" max="${CHOICES.freePoints}" step="1" data-alloc="${esc(a.key)}" value="${c.allocation[a.key]}">
      → <strong data-final="${esc(a.key)}"></strong></label>`).join('');
    const pers = (key, title) => `<span role="radiogroup" aria-label="${title}">${title}：${CHOICES.personality[key].map((o) => `<label><input type="radio" name="${key}" value="${esc(o.value)}" ${o.value === c.personality[key] ? 'checked' : ''}>${esc(o.label)}</label>`).join('')}</span>`;
    $('setup-character').innerHTML = `<legend>主角</legend>
      <div class="choice" role="radiogroup" aria-label="出身">出身：${tpl}</div>
      <div class="choice">配點（共 ${CHOICES.freePoints} 點，最終每項 ${CHOICES.min}～${CHOICES.max}）：${alloc} <span id="alloc-left"></span></div>
      <div class="choice">${pers('risk', '性格・行事')} ${pers('bond', '性格・待人')}</div>
      <p class="hint">性格只影響事件建議與台詞，不改效率。</p>`;
    updateCharacterSummary();
  }

  function updateCharacterSummary() {
    const c = setup.characterOptions;
    const base = CHOICES.templates.find((t) => t.id === c.templateId).base;
    let used = 0;
    for (const a of CHOICES.attributes) {
      used += Number(c.allocation[a.key]) || 0;
      setText(document.querySelector(`[data-final="${a.key}"]`), String(base[a.key] + (Number(c.allocation[a.key]) || 0)));
    }
    setText($('alloc-left'), `剩 ${CHOICES.freePoints - used} 點`);
  }

  // 政策與目標的編輯器：開局與遊戲中共用。scope 是 'setup' 或 'menu'；draft 是 { policy, goals }。
  function renderEditor(draft, scope) {
    const pol = Object.keys(View.POLICY_LABELS).map((k) => {
      const meta = View.POLICY_LABELS[k];
      const opts = Object.keys(meta.values).map((v) => `<option value="${esc(v)}" ${draft.policy[k] === v ? 'selected' : ''}>${esc(meta.values[v])}</option>`).join('');
      return `<li><label>${esc(meta.name)}：<select data-ed="${scope}" data-policy="${esc(k)}" data-focus-key="${scope}-policy-${esc(k)}">${opts}</select></label> <code>${esc(draft.policy[k])}</code></li>`;
    }).join('');
    const n = draft.goals.length;
    const goals = draft.goals.map((g, i) => `<li><span>${i + 1}. ${esc(View.goalText(deps.Rules, g))}</span>
      <span class="buttons">
      <button type="button" data-ed="${scope}" data-goal-move="${i}:-1" data-focus-key="${scope}-up-${i}" aria-label="上移 ${esc(View.goalText(deps.Rules, g))}" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" data-ed="${scope}" data-goal-move="${i}:1" data-focus-key="${scope}-down-${i}" aria-label="下移 ${esc(View.goalText(deps.Rules, g))}" ${i === n - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" data-ed="${scope}" data-goal-remove="${i}" data-focus-key="${scope}-rm-${i}">移除</button></span></li>`).join('');
    const missing = GOAL_CATALOG.filter((g) => !draft.goals.some((x) => x.id === g.id));
    const add = missing.length === 0 ? '' : `<label>加入目標：<select data-ed="${scope}" data-goal-pick data-focus-key="${scope}-pick">${missing.map((g) => `<option value="${esc(g.id)}">${esc(View.goalText(deps.Rules, g))}</option>`).join('')}</select></label>
      <button type="button" data-ed="${scope}" data-goal-add data-focus-key="${scope}-add">加入</button>`;
    return `<h3>政策</h3><ul class="plain policy-edit">${pol}</ul>
      <h3>目標順序</h3><p class="hint">空閒的人依這個順序挑第一個能推進的目標。</p><ol class="plain goal-edit">${goals || '<li>沒有目標：空閒時預設修行</li>'}</ol>${add}`;
  }

  function editorDraft(scope) {
    if (scope === 'setup') return setup;
    return ui.menu && ui.menu.target.kind === 'settings' ? ui.menu.draft : null;
  }

  function editorChanged(scope) {
    if (scope === 'setup') {
      renderSetupSettings();
      prepare();
    } else {
      dirtyUi = true;
    }
  }

  function renderSetupSettings() {
    setHtml($('setup-settings'), renderEditor(setup, 'setup'));
  }

  // ---------- 選單（點地點、回應詢問、取消手動令、改政策與目標） ----------

  function names() {
    const out = {};
    if (model) for (const p of model.people) out[p.id] = p.name;
    return out;
  }

  function menuSpec(target) {
    const world = ctl.world;
    if (target.kind === 'place') return Actions.placeActions(deps, world, target.key, ui.selected);
    if (target.kind === 'person') {
      const spec = Actions.personActions(deps, world, target.id);
      return Object.assign({ title: names()[target.id] || target.id }, spec);
    }
    if (target.kind === 'ask') {
      const ask = Actions.pendingAsks(deps, world).find((q) => q.eventId === target.eventId);
      if (!ask) return { title: '詢問已經不在了', info: ['這則詢問已回覆或逾期，選單已更新。'], actions: [] };
      const left = ask.left === null ? '' : `還有 ${ask.left} tick 逾期（暫停時不倒數）。`;
      return { title: ask.title, info: [ask.body, left], actions: ask.options.map((o) => Object.assign({ disabled: null, warn: null }, o)) };
    }
    return { title: '修改政策與目標', info: [], actions: [] };
  }

  function openMenu(target, anchor) {
    if (ctl.mode === 'setup') return;
    if (ctl.mode === 'playing') {
      ctl.pause();
      ui.pausedByMenu = true;
    } else if (!ui.menu) {
      ui.pausedByMenu = false; // 原本就暫停（含讀檔後）：關選單時保持暫停
    }
    ui.menu = { target, anchor: anchor || null, intent: ctl.intent(), draft: null, focus: true };
    if (target.kind === 'settings') ui.menu.draft = { policy: clone(ctl.world.policy), goals: clone(ctl.world.goals) };
    dirtyUi = true;
    draw();
  }

  function closeMenu(resume) {
    const was = ui.pausedByMenu;
    ui.menu = null;
    ui.pausedByMenu = false;
    const el = $('menu');
    el.hidden = true;
    el._html = '';
    el.innerHTML = '';
    if (resume && was && ctl.mode === 'paused' && !ctl.snapshot().autoPaused) ctl.resume();
    dirtyUi = true;
  }

  function renderMenu() {
    const el = $('menu');
    if (!ui.menu) {
      el.hidden = true;
      return;
    }
    const t = ui.menu.target;
    const spec = menuSpec(t);
    const paused = ui.pausedByMenu ? '<p class="sub">（已自動暫停；下令或關閉後繼續播放）</p>' : '';
    let body;
    if (t.kind === 'settings') {
      body = `${renderEditor(ui.menu.draft, 'menu')}<div class="buttons"><button type="button" data-apply-settings data-focus-key="apply">套用</button></div>`;
    } else {
      const items = spec.actions.length === 0 ? '<li class="sub">這裡現在沒有可做的操作。</li>'
        : spec.actions.map((a) => `<li><button type="button" data-act="${esc(a.key)}" data-focus-key="act-${esc(a.key)}" class="${a.warn ? 'warn' : ''}" ${a.disabled ? 'disabled' : ''}>
          <span class="main">${esc(a.label)}</span><span class="why">${esc(a.disabled || (a.warn ? `${a.why}；${a.warn}` : a.why))}</span></button></li>`).join('');
      body = `<ul class="actions">${items}</ul>`;
    }
    const info = spec.info.filter(Boolean).map((x) => `<p class="sub">${esc(x)}</p>`).join('');
    setHtml(el, `<button type="button" class="close" aria-label="關閉選單（Esc）" data-close data-focus-key="close">×</button>
      <h3>${esc(spec.title)}</h3>${info}${spec.who ? `<p class="who">${esc(spec.who)}</p>` : ''}${paused}${body}`);
    el.hidden = false;
    const wrap = $('scene-wrap');
    const a = ui.menu.anchor;
    if (a && window.innerWidth > 720) {
      el.classList.add('floating');
      el.classList.remove('docked');
      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      const mw = Math.min(300, W - 16);
      const gap = 60 * scene.zoom;
      let left = a.x + gap;
      if (left + mw > W - 8) left = a.x - gap - mw;
      el.style.left = `${Math.max(8, Math.min(W - mw - 8, left))}px`;
      el.style.top = `${Math.max(8, Math.min(H - el.offsetHeight - 8, a.y - 40))}px`;
    } else {
      el.classList.remove('floating');
      el.classList.add('docked');
      el.style.left = '';
      el.style.top = '';
    }
    if (ui.menu.focus) {
      ui.menu.focus = false;
      const first = el.querySelector('[data-act]:not(:disabled), [data-apply-settings], select') || el.querySelector('[data-close]');
      if (first) first.focus();
    }
  }

  // 送出：用開選單時記下的意圖。被拒時世界不動，選單依現在的世界更新並換一個新意圖，等玩家再選；不自動重送。
  function send(commands, after) {
    const menu = ui.menu;
    const r = ctl.dispatch(menu.intent, commands);
    if (!r.ok) {
      toast(Actions.rejectText(r), 'bad');
      if (ui.menu === menu) menu.intent = ctl.intent();
      dirtyUi = true;
      draw();
      return null;
    }
    const list = Array.isArray(commands) ? commands : [commands];
    model = View.describe(ctl.world, deps);
    modelWorld = ctl.world;
    const texts = [];
    let openPlace = null;
    for (const c of list) {
      const pid = ctl.world.protagonistId;
      const next = c.type === 'orderActivity' ? (model.people.find((p) => p.id === pid).why.next.text) : null;
      const fb = Actions.commandFeedback(deps, r.before, ctl.world, c, r.events, next);
      texts.push(fb.text);
      if (fb.openPlace) openPlace = fb.openPlace;
      if (c.type === 'orderActivity' || c.type === 'cancelManualOrder') scene.pulse(pid, c.type === 'orderActivity' ? '令' : '解除', 'order');
    }
    toast(texts.join(' '), 'ok');
    if (after) after();
    if (openPlace) {
      const was = ui.pausedByMenu;
      ui.menu = null;
      openMenu({ kind: 'place', key: openPlace }, null);
      ui.pausedByMenu = ui.pausedByMenu || was;
    } else {
      closeMenu(true);
    }
    draw();
    return r;
  }

  function doAction(key) {
    if (!ui.menu) return;
    const spec = menuSpec(ui.menu.target);
    const a = spec.actions.find((x) => x.key === key);
    if (!a || a.disabled) {
      toast('選單已依目前的世界更新，請再選一次。', 'bad');
      ui.menu.intent = ctl.intent();
      dirtyUi = true;
      draw();
      return;
    }
    send(a.command);
  }

  function applySettings() {
    const d = ui.menu.draft;
    const w = ctl.world;
    const cmds = [];
    if (JSON.stringify(d.policy) !== JSON.stringify(w.policy)) cmds.push({ type: 'setPolicy', payload: { policy: clone(d.policy) } });
    if (JSON.stringify(d.goals) !== JSON.stringify(w.goals)) cmds.push({ type: 'setGoals', payload: { goals: clone(d.goals) } });
    if (cmds.length === 0) {
      toast('沒有改動。', '');
      closeMenu(true);
      draw();
      return;
    }
    send(cmds);
  }

  // ---------- 回饋 ----------

  let toastTimer = null;
  function toast(text, tone) {
    const t = $('toast');
    t.textContent = text;
    t.dataset.tone = tone || '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.textContent = ''; }, 6000);
  }
  let bannerTimer = null;
  function banner(text) {
    const b = $('banner');
    b.textContent = text;
    b.hidden = false;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { b.hidden = true; }, 2400);
  }

  function feedNewEvents() {
    const w = ctl.world;
    if (!w || w.eventLog.length <= seenEvents) return;
    const events = w.eventLog.slice(seenEvents);
    seenEvents = w.eventLog.length;
    for (const f of Actions.tickFeedback(deps, w, events, names())) {
      if (f.kind === 'pulse') scene.pulse(f.id, f.text, f.tone);
      else if (f.kind === 'toast') toast(f.text, f.tone);
      else if (f.kind === 'banner') banner(f.text);
    }
  }

  function worldReplaced() {
    ui.selected = null;
    closeMenu(false);
    seenEvents = ctl.world ? ctl.world.eventLog.length : 0;
    model = null;
    modelWorld = null;
    dirtyUi = true;
  }

  // ---------- 畫面 ----------

  function rosterCard(p) {
    return `<button type="button" class="person" data-person="${esc(p.id)}">
      <span class="who"><span class="avatar"></span><strong class="pname"></strong><small class="meta"></small></span>
      <span class="state"></span><span class="text"></span><span class="fallback"></span>
      <span class="progressline"></span><span class="stats"></span></button>`;
  }

  function updateRoster() {
    const w = ctl.world;
    keyedList($('people'), model.people, (p) => p.id, rosterCard, (el, p) => {
      const s = p.status;
      const d = w.disciples.find((x) => x.id === p.id);
      el.classList.toggle('selected', p.id === ui.selected);
      el.classList.toggle('absent', !p.joined);
      el.setAttribute('aria-pressed', String(p.id === ui.selected));
      const av = el.querySelector('.avatar');
      av.style.background = Scene.colorOf(d);
      setText(av, Scene.glyphOf(w, d, s));
      setText(el.querySelector('.pname'), p.name);
      setText(el.querySelector('.meta'), `${p.role}${d.manualOrder ? '・玩家令' : ''}`);
      const st = el.querySelector('.state');
      st.className = `state state-${s.kind}`;
      setText(st, `${s.label}${s.status ? `・${s.status}` : ''}`);
      setText(el.querySelector('.text'), s.text);
      setText(el.querySelector('.fallback'), s.fallback || '');
      setText(el.querySelector('.progressline'), s.progress ? `${s.progress.done}/${s.progress.total} ${s.progress.unit}` : '');
      setText(el.querySelector('.stats'), `體力 ${p.stamina}・心境 ${p.mind}・修為 ${p.cultivation}・傷勢 ${p.injury}・突破 ${p.breakthroughs}`);
    });
  }

  function updateAsks() {
    const asks = Actions.pendingAsks(deps, ctl.world);
    const box = $('asks');
    if (!box.firstElementChild) box.innerHTML = '<h3>待回應的詢問</h3><div class="ask-list"></div>';
    keyedList(box.querySelector('.ask-list'), asks, (q) => q.eventId, (q) => `<div class="ask" data-kind="${esc(q.kind)}">
      <strong class="title"></strong> <span class="left"></span>
      <button type="button" data-open-ask="${esc(q.eventId)}" data-focus-key="ask-${esc(q.eventId)}">回應…</button></div>`, (el, q) => {
      setText(el.querySelector('.title'), q.title);
      setText(el.querySelector('.left'), q.left === null ? '' : `還有 ${q.left} tick`);
    });
  }

  function updateDetailActions() {
    const p = ui.selected && ctl.world.disciples.find((d) => d.id === ui.selected);
    const html = p && p.id === ctl.world.protagonistId && p.manualOrder
      ? '<button type="button" data-open-person data-focus-key="open-person">取消／解除主角的手動指令…</button>'
      : (p && p.id === ctl.world.protagonistId ? '<p class="hint">點場景裡的地點（或下方地點清單）看主角能做什麼。</p>' : '');
    setHtml($('detail-actions'), html);
  }

  function updatePlaces() {
    const list = Actions.places(deps.Rules, ctl.world);
    setHtml($('places'), `<details><summary>地點清單（鍵盤操作）</summary><div class="place-grid">${list.map((q) => `<button type="button" data-place="${esc(q.key)}" data-focus-key="place-${esc(q.key)}">${esc(q.title)}</button>`).join('')}</div></details>`);
  }

  function hintText() {
    if (ctl.mode === 'error') return '世界已停止；可以保存或匯出最後合法的世界，或開新局。';
    if (ui.menu) return '選一個操作，或按 Esc／點空白處關閉。';
    if (ui.selected === ctl.world.protagonistId) return '點場景裡的地點（礦點、草點、空地、道館、村口），看主角能在那裡做什麼。';
    if (ui.selected) return '這位依宗門目標自主行動。點主角（藍衣）可以下令；拖曳平移、滾輪縮放。';
    return '點人物看他在做什麼、為什麼；點地點看主角能做的事。空白鍵暫停／繼續。';
  }

  let drawnKey = null;
  function draw() {
    const s = ctl.snapshot();
    if (!s.world || s.mode === 'setup') return;
    if (modelWorld !== s.world) {
      model = View.describe(s.world, deps);
      modelWorld = s.world;
      dirtyUi = true;
    }
    const st = session.status(s.world);
    const saveKey = `${st.dirty}|${st.busy}|${st.stopped ? st.stopped.code : ''}|${st.saved ? st.saved.tick : ''}`;
    const key = `${s.mode}|${s.speed}|${s.autoPaused}|${s.error ? s.error.code : ''}|${saveKey}|${ui.selected}`;
    if (!dirtyUi && key === drawnKey) return;
    dirtyUi = false;
    drawnKey = key;
    setHtml($('hud'), View.renderHud(model, s));
    updateRoster();
    updateAsks();
    setHtml($('detail'), View.renderDetail(model, ui.selected));
    updateDetailActions();
    setHtml($('settings'), View.renderSettings(model).replace('政策（安穩發展）', '政策'));
    setHtml($('stock'), View.renderStock(model));
    setHtml($('events'), View.renderEvents(model));
    updatePlaces();
    renderMenu();
    setText($('hint'), hintText());
    for (const b of document.querySelectorAll('[data-speed]')) b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s.speed));
    $('toggle').disabled = s.mode === 'error';
    setText($('toggle'), s.mode === 'playing' ? '❚❚ 暫停（空白鍵）' : '▶ 繼續（空白鍵）');
    $('edit-settings').disabled = s.mode === 'error';
    const err = s.error;
    $('error').hidden = !err;
    const how = err && err.kind === 'rejected' ? '引擎拒絕推進，這一批沒有任何 tick' : `出錯前同一批已提交 ${err ? err.committedTicks : 0} tick，畫面保留到此`;
    setText($('error'), err ? `世界停在 tick ${err.tick}（${how}）：${err.code}：${err.reason}。不會繼續推進；可以保存這個最後合法的世界，或開新局。` : '');
    const text = View.saveStatusText(st);
    setText($('save-status'), text.text);
    $('save-status').dataset.kind = text.kind;
    $('save-now').disabled = !st.canWrite;
  }

  function loop(now) {
    ctl.frame(now);
    if (ctl.world && ctl.mode !== 'setup') {
      feedNewEvents();
      draw();
      if (model) scene.draw(ctl.world, model, ui, now);
    }
    window.requestAnimationFrame(loop);
  }

  // ---------- 開局 ----------

  function prepare() {
    const seed = $('seed').value;
    const r = ctl.prepare(seed, setup);
    const seedBad = r.ok ? '' : (r.code === 'bad_seed' ? `${r.code}：${r.reason}` : '');
    $('seed-error').textContent = seedBad;
    $('setup-error').textContent = r.ok || seedBad ? '' : `不能開始：${readableReason(r.reason)}`;
    $('start').disabled = !r.ok;
    renderSetupSave();
    return r.ok;
  }

  function renderSetupSave() {
    $('save-panel').innerHTML = View.renderSavePanel(inspection);
  }

  // 重新讀三個 key；遊戲畫面上也列出無法讀取的槽或指標的原始資料匯出（例如恢復備份後仍損壞的另一槽）。
  function refreshInspection() {
    inspection = store.inspect();
    $('viewer-save-raw').innerHTML = View.renderRawExports(inspection, false);
  }

  function start() {
    if (!prepare()) return;
    session.begin('new');
    ctl.start();
    worldReplaced();
    ui.selected = ctl.world.protagonistId;
    refreshInspection();
    enterViewer();
  }

  // ---------- 事件 ----------

  $('seed').addEventListener('input', prepare);
  $('setup-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    start();
  });
  $('setup-character').addEventListener('change', (ev) => {
    const t = ev.target;
    const c = setup.characterOptions;
    if (t.name === 'tpl') c.templateId = t.value;
    else if (t.name === 'risk' || t.name === 'bond') c.personality[t.name] = t.value;
    else return;
    updateCharacterSummary();
    prepare();
  });
  $('setup-character').addEventListener('input', (ev) => {
    const key = ev.target.dataset.alloc;
    if (!key) return;
    const v = Number(ev.target.value);
    setup.characterOptions.allocation[key] = Number.isInteger(v) ? v : ev.target.value;
    updateCharacterSummary();
    prepare();
  });
  $('toggle').addEventListener('click', () => {
    ui.pausedByMenu = false; // 玩家自己按了播放／暫停：關選單時不再替他恢復
    ctl.toggle();
    dirtyUi = true;
    draw();
  });
  for (const b of document.querySelectorAll('[data-speed]')) {
    b.addEventListener('click', () => {
      ctl.setSpeed(Number(b.dataset.speed));
      draw();
    });
  }
  $('save-now').addEventListener('click', () => { saveNow(); });
  $('export').addEventListener('click', exportWorld);
  $('to-setup').addEventListener('click', () => {
    if (!confirmDiscard('開新局或讀取存檔')) return;
    closeMenu(false);
    ctl.pause();
    showSetup();
  });
  for (const b of document.querySelectorAll('[data-import]')) {
    b.addEventListener('click', () => {
      $('import-file').value = '';
      $('import-file').click();
    });
  }
  $('import-file').addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (f) importFile(f);
  });
  $('save-panel').addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.id === 'load-saved') loadSaved();
    else if (t.dataset.restore) restoreSlot(t.dataset.restore);
    else if (t.dataset.exportRaw) exportRaw(t.dataset.exportRaw);
  });
  $('viewer-save-raw').addEventListener('click', (ev) => {
    if (ev.target.dataset.exportRaw) exportRaw(ev.target.dataset.exportRaw);
  });
  $('edit-settings').addEventListener('click', () => openMenu({ kind: 'settings' }, null));

  // 編輯器（開局與選單共用）
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (!t.dataset || !t.dataset.ed || t.dataset.policy === undefined) return;
    const d = editorDraft(t.dataset.ed);
    if (!d) return;
    d.policy[t.dataset.policy] = t.value;
    editorChanged(t.dataset.ed);
  });

  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('button, [data-person]');
    if (!t) return;
    const ds = t.dataset;
    if (ds.ed) {
      const d = editorDraft(ds.ed);
      if (!d) return;
      if (ds.goalMove) {
        const [i, dir] = ds.goalMove.split(':').map(Number);
        const j = i + dir;
        if (j < 0 || j >= d.goals.length) return;
        [d.goals[i], d.goals[j]] = [d.goals[j], d.goals[i]];
      } else if (ds.goalRemove !== undefined) {
        d.goals.splice(Number(ds.goalRemove), 1);
      } else if (ds.goalAdd !== undefined) {
        const pick = t.parentElement.querySelector('[data-goal-pick]');
        const g = pick && GOAL_CATALOG.find((x) => x.id === pick.value);
        if (g) d.goals.push(clone(g));
      } else {
        return;
      }
      editorChanged(ds.ed);
      draw();
      return;
    }
    if (ds.person !== undefined) {
      ui.selected = ui.selected === ds.person ? null : ds.person;
      dirtyUi = true;
    } else if (ds.close !== undefined) {
      closeMenu(true);
    } else if (ds.act !== undefined) {
      doAction(ds.act);
      return;
    } else if (ds.applySettings !== undefined) {
      applySettings();
      return;
    } else if (ds.place !== undefined) {
      openMenu({ kind: 'place', key: ds.place }, null);
      return;
    } else if (ds.openAsk !== undefined) {
      openMenu({ kind: 'ask', eventId: ds.openAsk }, null);
      return;
    } else if (ds.openPerson !== undefined) {
      openMenu({ kind: 'person', id: ctl.world.protagonistId }, null);
      return;
    } else {
      return;
    }
    draw();
  });

  // 場景：點人物選取；點地點打開該地點的選單；點空白處關選單。拖曳平移、滾輪縮放。
  const canvas = $('scene');
  let drag = null;
  canvas.addEventListener('pointerdown', (ev) => {
    drag = { x: ev.clientX, y: ev.clientY, lx: ev.clientX, ly: ev.clientY, moved: false };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', (ev) => {
    const rect = canvas.getBoundingClientRect();
    if (drag) {
      if (Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) > 6) drag.moved = true;
      if (drag.moved) scene.pan(ev.clientX - drag.lx, ev.clientY - drag.ly);
      drag.lx = ev.clientX;
      drag.ly = ev.clientY;
    }
    const h = scene.hitTest(ev.clientX - rect.left, ev.clientY - rect.top);
    ui.hover = h && h.kind === 'place' ? h.key : null;
    ui.hoverPerson = h && h.kind === 'person' ? h.id : null;
    canvas.style.cursor = h ? 'pointer' : 'default';
  });
  canvas.addEventListener('pointerup', (ev) => {
    const d = drag;
    drag = null;
    if (!d || d.moved) return;
    const rect = canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const h = scene.hitTest(sx, sy);
    if (!h) {
      if (ui.menu) closeMenu(true);
    } else if (h.kind === 'person') {
      ui.selected = h.id;
    } else {
      openMenu({ kind: 'place', key: h.key }, { x: sx, y: sy });
    }
    dirtyUi = true;
    draw();
  });
  canvas.addEventListener('pointerleave', () => { ui.hover = null; ui.hoverPerson = null; });
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    scene.zoomBy(ev.deltaY < 0 ? 1.1 : 0.9);
  }, { passive: false });

  document.addEventListener('keydown', (ev) => {
    const tag = ev.target && ev.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (ctl.mode === 'setup') return;
    if (ev.key === ' ') {
      if (tag === 'BUTTON' || tag === 'SUMMARY') return; // 讓按鈕自己處理空白鍵
      ev.preventDefault();
      ui.pausedByMenu = false;
      ctl.toggle();
    } else if (ev.key === '1' || ev.key === '2' || ev.key === '4') {
      ctl.setSpeed(Number(ev.key));
    } else if (ev.key === 'Escape') {
      if (!ui.menu) return;
      closeMenu(true);
    } else if (ev.key === '[' || ev.key === ']') {
      const ids = model ? model.people.filter((p) => p.joined).map((p) => p.id) : [];
      if (ids.length === 0) return;
      const i = ids.indexOf(ui.selected);
      const n = ids.length;
      ui.selected = i < 0 ? ids[ev.key === ']' ? 0 : n - 1] : ids[(i + (ev.key === ']' ? 1 : n - 1)) % n];
    } else if (ev.target === canvas && ev.key.startsWith('Arrow')) {
      ev.preventDefault();
      const s = 30;
      scene.pan(ev.key === 'ArrowLeft' ? s : (ev.key === 'ArrowRight' ? -s : 0), ev.key === 'ArrowUp' ? s : (ev.key === 'ArrowDown' ? -s : 0));
      return;
    } else if (ev.target === canvas && (ev.key === '+' || ev.key === '=' || ev.key === '-')) {
      scene.zoomBy(ev.key === '-' ? 0.9 : 1.1);
      return;
    } else if (ev.target === canvas && ev.key === '0') {
      scene.fit();
      return;
    } else {
      return;
    }
    dirtyUi = true;
    draw();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      ctl.hide();
      dirtyUi = true;
      draw();
    }
  });
  window.addEventListener('resize', () => { dirtyUi = true; });
  // 其他分頁改了存檔：立即停自動保存並更新存檔清單，不等下一次保存才發現。
  window.addEventListener('storage', (ev) => {
    if (ev.key !== null && ev.key !== Storage.POINTER_KEY && ev.key !== Storage.SLOT_KEYS.a && ev.key !== Storage.SLOT_KEYS.b) return;
    if (ev.key === Storage.POINTER_KEY || ev.key === null) session.noticeExternal(ev.key === null ? null : ev.newValue);
    refreshInspection();
    if (!$('setup').hidden) renderSetupSave();
    dirtyUi = true;
    draw();
  });
  window.addEventListener('beforeunload', (ev) => {
    if (ctl.world && ctl.mode !== 'setup' && session.isDirty(ctl.world)) {
      ev.preventDefault();
      ev.returnValue = '';
    }
  });

  // 給瀏覽器驗證讀狀態用；只讀，不提供推進、保存、下令或改世界的入口。座標只算畫面，給腳本點擊用。
  function slotInfo(slot) {
    if (!slot) return null;
    return { bytes: slot.raw === null ? 0 : slot.raw.length, ok: slot.result.ok, code: slot.result.ok ? null : slot.result.code, tick: slot.result.ok ? slot.result.envelope.tick : null };
  }
  Object.defineProperty(window, 'sectViewer', {
    value: Object.freeze({
      snapshot: () => {
        const s = ctl.snapshot();
        const w = s.world;
        const menu = ui.menu ? menuSpec(ui.menu.target) : null;
        return {
          mode: s.mode, seed: s.seed, speed: s.speed, autoPaused: s.autoPaused, error: s.error, totals: s.totals, lastStep: s.lastStep,
          generation: s.generation,
          tick: w ? w.clock.tick : null,
          revision: w ? w.revision : null,
          hash: w ? Realtime.hashWorld(w) : null,
          rngState: w ? w.rngState.slice() : null,
          selected: ui.selected,
          pausedByMenu: ui.pausedByMenu,
          menu: menu ? { kind: ui.menu.target.kind, title: menu.title, actions: menu.actions.map((a) => ({ key: a.key, disabled: a.disabled })) } : null,
          asks: w && s.mode !== 'setup' ? Actions.pendingAsks(deps, w).map((q) => ({ eventId: q.eventId, kind: q.kind })) : [],
          protagonist: w ? (() => { const d = w.disciples.find((x) => x.id === w.protagonistId); const a = d.activityId ? w.activities.find((x) => x.id === d.activityId) : null; return { manualOrder: d.manualOrder ? d.manualOrder.kind : null, activity: a ? { kind: a.kind, status: a.status, origin: a.origin, departTick: a.departTick } : null }; })() : null,
          facilities: w ? w.activities.filter((a) => a.kind === 'build' && a.status !== 'cancelled').map((a) => ({ type: a.target.facilityType, tileId: a.target.tileId, done: a.status === 'done' })) : [],
          resources: w ? Object.assign({ pills: w.inventory['breakthrough-pill'] }, w.resources) : null,
          policy: w ? Object.assign({}, w.policy) : null,
          goals: w ? w.goals.map((g) => g.id) : null,
          characterOptions: w ? clone(w.characterOptions) : null,
          toast: $('toast').textContent,
        };
      },
      screenOf: (key) => scene.screenOf(key),
      personScreen: (id) => scene.personScreen(id),
      saveInfo: () => {
        const view = store.inspect();
        const st = ctl.world && ctl.mode !== 'setup' ? session.status(ctl.world) : null;
        return {
          storage: view.state, active: view.active, canWrite: store.canWrite, owned: store.owned,
          slots: view.slots ? { a: slotInfo(view.slots.a), b: slotInfo(view.slots.b) } : null,
          pointer: view.pointer && view.pointer.result && view.pointer.result.ok ? view.pointer.result.pointer : null,
          status: st ? { dirty: st.dirty, busy: st.busy, saved: st.saved, stopped: st.stopped, last: st.last ? { ok: st.last.ok, code: st.last.code || null } : null } : null,
          lastSave: metrics.lastSave, lastLoad: metrics.lastLoad,
        };
      },
    }),
  });

  renderCharacterForm();
  renderSetupSettings();
  prepare();
  $('seed').focus();
  window.requestAnimationFrame(loop);
})();
