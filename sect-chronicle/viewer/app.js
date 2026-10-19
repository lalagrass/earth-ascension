/*
 * SG-RT-02V／03a：把控制器、畫面與存讀接到瀏覽器。只處理 DOM 事件、requestAnimationFrame、分頁可見性與 localStorage。
 * 選取人物只改 ui，不碰世界；render 只讀 controller 給的世界。保存只在控制器通知的幀末保存點、暫停與「立即保存」時發生。
 */
(function () {
  'use strict';
  const ns = window.SectChronicle;
  const Controller = ns.ViewerController;
  const View = ns.ViewerView;
  const Storage = ns.Storage;
  const deps = { Rules: ns.Rules, StoryData: ns.StoryData };
  const $ = (id) => document.getElementById(id);

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

  const ctl = Controller.createController(ns.Realtime, { onSavePoint: (reasons) => autosave(reasons.join('+')) });
  const ui = { selected: null };
  const dom = {
    hud: $('hud'), map: $('map'), people: $('people'), detail: $('detail'),
    stock: $('stock'), settings: $('settings'), events: $('events'), error: $('error'),
  };
  let drawn = null; // 上次畫面的依據；相同就不重畫

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
      draw(true);
    });
    draw(true);
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
    draw(true);
    return r;
  }

  function confirmDiscard(action) {
    if (!ctl.world || ctl.mode === 'setup' || !session.isDirty(ctl.world)) return true;
    return window.confirm(`目前的世界還沒保存。${action}會換掉它，確定嗎？`);
  }

  function enterViewer() {
    $('setup').hidden = true;
    $('viewer').hidden = false;
    draw(true);
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
    ui.selected = null;
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

  // ---------- 開局與畫面 ----------

  function prepare() {
    const seed = $('seed').value;
    const r = ctl.prepare(seed);
    $('seed-error').textContent = r.ok ? '' : `${r.code}：${r.reason}`;
    $('start').disabled = !r.ok;
    $('setup-settings').innerHTML = r.ok ? View.renderSettings(View.describe(ctl.world, deps)) : '';
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

  function draw(force) {
    const s = ctl.snapshot();
    if (!s.world || s.mode === 'setup') return;
    const st = session.status(s.world);
    const saveKey = `${st.dirty}|${st.busy}|${st.stopped ? st.stopped.code : ''}|${st.saved ? st.saved.tick : ''}`;
    const key = `${s.world.revision}|${s.mode}|${s.speed}|${s.autoPaused}|${ui.selected}|${s.error ? s.error.code : ''}|${saveKey}`;
    if (!force && key === drawn) return;
    drawn = key;
    View.render(dom, View.describe(s.world, deps), s, ui);
    for (const b of document.querySelectorAll('[data-speed]')) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s.speed));
    }
    $('toggle').disabled = s.mode === 'error';
    const text = View.saveStatusText(st);
    $('save-status').textContent = text.text;
    $('save-status').dataset.kind = text.kind;
    $('save-now').disabled = !st.canWrite;
  }

  function loop(now) {
    ctl.frame(now);
    draw(false);
    window.requestAnimationFrame(loop);
  }

  function start() {
    if (!prepare()) return;
    session.begin('new');
    ctl.start();
    refreshInspection();
    enterViewer();
  }

  $('seed').addEventListener('input', prepare);
  $('setup-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    start();
  });
  $('toggle').addEventListener('click', () => {
    ctl.toggle();
    draw(true);
  });
  for (const b of document.querySelectorAll('[data-speed]')) {
    b.addEventListener('click', () => {
      ctl.setSpeed(Number(b.dataset.speed));
      draw(true);
    });
  }
  $('save-now').addEventListener('click', () => { saveNow(); });
  $('export').addEventListener('click', exportWorld);
  $('to-setup').addEventListener('click', () => {
    if (!confirmDiscard('開新局或讀取存檔')) return;
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
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-person]');
    if (!el) return;
    ui.selected = ui.selected === el.dataset.person ? null : el.dataset.person;
    draw(true);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.target instanceof HTMLInputElement) return;
    if (ctl.mode === 'setup') return;
    if (ev.key === ' ') {
      ev.preventDefault();
      ctl.toggle();
    } else if (ev.key === '1' || ev.key === '2' || ev.key === '4') {
      ctl.setSpeed(Number(ev.key));
    } else {
      return;
    }
    draw(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      ctl.hide();
      draw(true);
    }
  });
  // 其他分頁改了存檔：立即停自動保存並更新存檔清單，不等下一次保存才發現。
  window.addEventListener('storage', (ev) => {
    if (ev.key !== null && ev.key !== Storage.POINTER_KEY && ev.key !== Storage.SLOT_KEYS.a && ev.key !== Storage.SLOT_KEYS.b) return;
    if (ev.key === Storage.POINTER_KEY || ev.key === null) session.noticeExternal(ev.key === null ? null : ev.newValue);
    refreshInspection();
    if (!$('setup').hidden) renderSetupSave();
    draw(true);
  });
  window.addEventListener('beforeunload', (ev) => {
    if (ctl.world && ctl.mode !== 'setup' && session.isDirty(ctl.world)) {
      ev.preventDefault();
      ev.returnValue = '';
    }
  });

  // 給瀏覽器驗證讀狀態用；只讀，不提供推進、保存或改世界的入口。
  function slotInfo(slot) {
    if (!slot) return null;
    return { bytes: slot.raw === null ? 0 : slot.raw.length, ok: slot.result.ok, code: slot.result.ok ? null : slot.result.code, tick: slot.result.ok ? slot.result.envelope.tick : null };
  }
  Object.defineProperty(window, 'sectViewer', {
    value: Object.freeze({
      snapshot: () => {
        const s = ctl.snapshot();
        return {
          mode: s.mode, seed: s.seed, speed: s.speed, autoPaused: s.autoPaused, error: s.error, totals: s.totals, lastStep: s.lastStep,
          tick: s.world ? s.world.clock.tick : null,
          revision: s.world ? s.world.revision : null,
          hash: s.world ? ns.Realtime.hashWorld(s.world) : null,
          rngState: s.world ? s.world.rngState.slice() : null,
        };
      },
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

  prepare();
  $('seed').focus();
  window.requestAnimationFrame(loop);
})();
