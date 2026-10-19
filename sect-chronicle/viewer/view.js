/*
 * SG-RT-02V：唯讀生活 viewer 的畫面。
 *
 * describe() 把正式世界讀成畫面用的純資料，不改世界、不讀 RNG、不另算產出或編原因：
 * 進度、等待與 fallback 原因都直接取自世界裡的活動與 autonomy 欄位。render() 只把那份資料畫進 DOM。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module && module.exports) {
    module.exports = factory();
  } else {
    const ns = root.SectChronicle || (root.SectChronicle = {});
    ns.ViewerView = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ELEMENT_LABELS = Object.freeze({ wood: '木', fire: '火', earth: '土', metal: '金', water: '水' });
  const ROLE_LABELS = Object.freeze({ master: '師父', protagonist: '主角', apprentice: '學徒' });
  const STATUS_LABELS = Object.freeze({ traveling: '移動中', working: '工作中', done: '已完成', cancelled: '已取消' });
  const RESOURCE_LABELS = Object.freeze({ spiritMaterial: '靈材', spiritHerb: '靈草', spiritStone: '靈石', reputation: '聲望' });
  const WAIT_LABELS = Object.freeze({
    goals_done: '目標都已完成，無效果等待',
    'blocked:herb_locked': '靈草還沒長出來，等待',
    breakthrough_ask_open: '突破詢問待回覆',
    breakthrough_later: '突破稍後再問',
    cultivation_full: '修為已滿，突破未開放，等待',
  });
  const FALLBACK_LABELS = Object.freeze({
    insufficient_resource: '資源不足',
    no_seat: '沒有空位',
    participant_busy: '參與者忙碌',
    facility_missing: '設施未建',
    facility_not_ready: '設施未完工',
    cultivation_full: '修為已滿',
    breakthrough_done: '已突破',
  });
  const POLICY_LABELS = Object.freeze({
    aid: { name: '援村', values: { 'auto-free': '自動徒手協助', 'auto-supplied': '自動備料協助', ask: '詢問', off: '關閉' } },
    recruit: { name: '收徒', values: { 'auto-accept': '自動接受', ask: '詢問', off: '關閉' } },
    breakthrough: { name: '突破', values: { auto: '自動', ask: '詢問', off: '關閉' } },
    breakthroughPill: { name: '突破用丹', values: { use: '使用', never: '不用' } },
    breakthroughSupport: { name: '突破支援', values: { auto: '自動找人', never: '不找' } },
  });
  const EVENT_TAIL = 40;

  function label(map, key) {
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : String(key);
  }

  function kindLabel(Rules, kind) {
    const a = Rules.ACTIONS[kind];
    return a ? a.label : String(kind);
  }

  function facilityLabel(Rules, type) {
    const f = Rules.FACILITIES[type];
    return f ? f.label : String(type);
  }

  function phaseOf(Rules, tick) {
    return Rules.phaseAtEq(Math.floor(tick / Rules.TICKS_PER_SLOT));
  }

  function goalText(Rules, g) {
    if (g.kind === 'buildFacility') return `建造${facilityLabel(Rules, g.facilityType)}`;
    if (g.kind === 'stockPills') return `存凝氣丹 ${g.count} 顆`;
    if (g.kind === 'aid') return '援村';
    if (g.kind === 'recruit') return '收徒';
    if (g.kind === 'cultivateTo100') return `修為到 100（${g.discipleId === 'all' ? '全員' : g.discipleId}）`;
    if (g.kind === 'breakthrough') return `突破（${g.discipleId === 'all' ? '全員' : g.discipleId}）`;
    return g.kind;
  }

  function nameTable(world, StoryData) {
    const templates = StoryData && StoryData.STORY_DATA ? StoryData.STORY_DATA.templates : {};
    const base = {};
    for (const d of world.disciples) {
      const t = d.templateId && templates[d.templateId] ? templates[d.templateId].label : null;
      if (d.role === 'master') base[d.id] = '師父';
      else if (d.role === 'protagonist') base[d.id] = t ? `主角・${t}` : '主角';
      else base[d.id] = t || label(ROLE_LABELS, d.role);
    }
    // 同名角色加上 id，畫面上仍可分辨。
    const count = {};
    for (const id of Object.keys(base)) count[base[id]] = (count[base[id]] || 0) + 1;
    const names = {};
    for (const id of Object.keys(base)) names[id] = count[base[id]] > 1 ? `${base[id]}（${id}）` : base[id];
    return names;
  }

  // 地圖格子很小，只放兩個字；同名學徒用候選序號分開。
  function shortName(d) {
    if (d.role === 'master') return '師父';
    if (d.role === 'protagonist') return '主角';
    const m = /(\d+)$/.exec(d.id);
    return m ? `徒${m[1]}` : d.id.slice(0, 2);
  }

  function activityStatus(Rules, world, d, act) {
    const unitTicks = Rules.TICKS_PER_SLOT;
    const kind = kindLabel(Rules, act.kind);
    const out = { kind: 'activity', activityId: act.id, label: kind, status: label(STATUS_LABELS, act.status), origin: act.origin };
    if (act.fallback) out.fallback = `由${kindLabel(Rules, act.fallback.from)}轉來：${label(FALLBACK_LABELS, act.fallback.reason)}`;
    if (act.status === 'traveling') {
      const steps = act.path.length;
      out.text = act.partnerWait
        ? `${kind}：已到場，等待同伴`
        : `${kind}：前往 (${act.dest.r},${act.dest.c})，已走 ${act.pathIndex}/${steps} 格`;
      out.progress = { done: act.pathIndex, total: Math.max(steps, 1), unit: '格' };
    } else {
      const total = act.units * unitTicks;
      out.text = `${kind}：第 ${Math.min(act.unitsDone + 1, act.units)}/${act.units} 單位，${act.workTicks % unitTicks}/${unitTicks} tick`;
      if (act.partnerWait) out.text += '（等待同伴）';
      out.progress = { done: act.workTicks, total, unit: 'tick' };
    }
    if (act.target && act.target.tileId) out.where = act.target.tileId;
    if (act.target && act.target.facilityType) out.label = `${kind}${facilityLabel(Rules, act.target.facilityType)}`;
    return out;
  }

  function personStatus(Rules, world, d) {
    if (d.joinTick > world.clock.tick) return { kind: 'notJoined', label: '未入隊', text: `預定 tick ${d.joinTick} 入隊` };
    if (d.activityId !== null) {
      const act = world.activities.find((a) => a.id === d.activityId);
      if (act) return activityStatus(Rules, world, d, act);
    }
    if (d.autonomy && d.autonomy.wait) {
      const w = d.autonomy.wait;
      return {
        kind: 'wait', label: '等待', code: w.reason,
        text: `${label(WAIT_LABELS, w.reason)}（自 tick ${w.sinceTick}，下次復查 tick ${w.recheckTick}）`,
      };
    }
    // 剛完成工作的人要到下一 tick 的階段 2 才決策（RT00 §1.3）：畫面只標示，不替角色安排。
    return { kind: 'decide', label: '待決策', text: '本 tick 剛空出來，下一 tick 由自主規劃決定' };
  }

  function describePeople(Rules, world, names) {
    return world.disciples.map((d) => ({
      id: d.id,
      name: names[d.id],
      short: shortName(d),
      role: label(ROLE_LABELS, d.role),
      joined: d.joinTick <= world.clock.tick,
      pos: { r: d.pos.r, c: d.pos.c },
      stamina: d.stamina,
      mind: d.mind,
      cultivation: d.cultivation,
      injury: d.injury,
      breakthroughs: d.breakthroughs,
      attributes: { rootBone: d.attributes.rootBone, comprehension: d.attributes.comprehension, craft: d.attributes.craft },
      manualOrder: d.manualOrder ? kindLabel(Rules, d.manualOrder.kind) : null,
      status: personStatus(Rules, world, d),
    }));
  }

  function describeFacilities(Rules, world) {
    const unitTicks = Rules.TICKS_PER_SLOT;
    return world.activities
      .filter((a) => a.kind === 'build' && a.status !== 'cancelled')
      .map((a) => ({
        activityId: a.id,
        type: a.target.facilityType,
        label: facilityLabel(Rules, a.target.facilityType),
        tileId: a.target.tileId,
        done: a.status === 'done',
        progress: { done: a.workTicks, total: a.units * unitTicks },
        completedTick: a.completedTick,
      }));
  }

  function describeMap(Rules, world, people, facilities) {
    const rows = [];
    const size = Rules.MAP_SIZE;
    const gate = Rules.VILLAGE_GATE;
    const dojo = Rules.DOJO;
    for (let r = 0; r < size; r += 1) {
      const cells = [];
      // 村口在地圖外一格（第 2 列左側）；其他列這一欄留空。
      cells.push(r === gate.r
        ? { kind: 'gate', r, c: gate.c, label: '村口', people: people.filter((p) => p.joined && p.pos.r === r && p.pos.c === gate.c).map((p) => p.id) }
        : { kind: 'void', r, c: gate.c });
      for (let c = 0; c < size; c += 1) {
        const tile = world.tiles.find((t) => t.row === r && t.col === c);
        const fac = facilities.filter((f) => f.tileId === tile.id);
        cells.push({
          kind: 'tile', r, c, id: tile.id,
          terrain: tile.terrain,
          terrainLabel: Rules.TERRAIN[tile.terrain] ? Rules.TERRAIN[tile.terrain].label : tile.terrain,
          element: label(ELEMENT_LABELS, tile.element),
          dojo: r === dojo.r && c === dojo.c,
          facilities: fac.map((f) => ({ label: f.label, done: f.done })),
          people: people.filter((p) => p.joined && p.pos.r === r && p.pos.c === c).map((p) => p.id),
        });
      }
      rows.push(cells);
    }
    return rows;
  }

  function signed(n) {
    return n > 0 ? `+${n}` : String(n);
  }

  function statDelta(before, after) {
    const parts = [];
    for (const k of ['stamina', 'mind', 'cultivation', 'injury']) {
      if (!before || !after || before[k] === after[k]) continue;
      const name = { stamina: '體力', mind: '心境', cultivation: '修為', injury: '傷勢' }[k];
      parts.push(`${name}${signed(after[k] - before[k])}`);
    }
    return parts.join(' ');
  }

  function eventText(Rules, names, e) {
    const who = e.discipleId ? names[e.discipleId] || e.discipleId : '';
    const kind = e.kind ? kindLabel(Rules, e.kind) : '';
    switch (e.type) {
      case 'activityDeparted': return `${who} 開始${kind}`;
      case 'unitCompleted': {
        const delta = statDelta(e.before, e.after);
        const fb = e.fallback ? `（由${kindLabel(Rules, e.fallback.from)}轉來：${label(FALLBACK_LABELS, e.fallback.reason)}）` : '';
        return `${who} 完成${kind}第 ${e.unit} 單位${fb}${delta ? `：${delta}` : ''}`;
      }
      case 'activityDone': return `${who} 結束${kind}`;
      case 'dayReport': {
        const res = Object.keys(RESOURCE_LABELS).map((k) => `${RESOURCE_LABELS[k]} ${e.resources[k]}`).join('、');
        return `第 ${e.day} 天結束：${res}，凝氣丹 ${e.inventory['breakthrough-pill']}`;
      }
      case 'phaseNotice': {
        const p = Rules.SPIRIT_PHASES.find((x) => x.id === e.phaseId);
        return `靈氣進入「${p ? p.label : e.phaseId}」`;
      }
      case 'candidateAccepted': return `${names[e.candidateId] || e.candidateId} 入隊`;
      case 'breakthroughResolved': {
        const o = e.outcome || {};
        const ok = o.result === 'success';
        const chance = typeof o.chanceBp === 'number' ? `，成功率 ${o.chanceBp / 100}%，擲 ${o.roll}` : '';
        return `${who} 突破${ok ? '成功' : '失敗'}${chance}`;
      }
      case 'autonomyWait': return `${who} 等待：${label(WAIT_LABELS, e.reason)}`;
      case 'autonomyResumed': return `${who} 恢復自主（${e.reason}）`;
      case 'breakthroughAskOpened': return `${who} 想突破，詢問待回覆`;
      case 'askExpired': return `詢問逾期：${e.eventId}`;
      default: {
        const rest = Object.keys(e).filter((k) => !['seq', 'tick', 'type'].includes(k))
          .map((k) => `${k}=${typeof e[k] === 'object' ? JSON.stringify(e[k]) : e[k]}`).join(' ');
        return `${e.type}${who ? ` ${who}` : ''}${rest ? ` ${rest}` : ''}`;
      }
    }
  }

  function describe(world, deps) {
    const Rules = deps.Rules;
    const names = nameTable(world, deps.StoryData);
    const tick = world.clock.tick;
    const phase = phaseOf(Rules, tick);
    const people = describePeople(Rules, world, names);
    const facilities = describeFacilities(Rules, world);
    const slot = Math.floor(tick / Rules.TICKS_PER_SLOT);
    return {
      seed: world.seed,
      versions: { scenario: world.scenarioId, schema: world.schemaVersion, rule: world.ruleVersion, rng: world.rngVersion },
      clock: {
        tick,
        day: Math.floor(tick / Rules.TICKS_PER_DAY) + 1,
        slotOfDay: (slot % Rules.SLOTS_PER_DAY) + 1,
        slotsPerDay: Rules.SLOTS_PER_DAY,
        phase: phase.label,
        horizon: Rules.OBSERVATION_TICKS,
      },
      revision: world.revision,
      people,
      map: describeMap(Rules, world, people, facilities),
      facilities,
      resources: Object.keys(RESOURCE_LABELS).map((k) => ({ key: k, label: RESOURCE_LABELS[k], value: world.resources[k] })),
      pills: world.inventory['breakthrough-pill'],
      policy: Object.keys(POLICY_LABELS).map((k) => ({
        key: k, name: POLICY_LABELS[k].name, value: world.policy[k], text: label(POLICY_LABELS[k].values, world.policy[k]),
      })),
      goals: world.goals.map((g) => ({ id: g.id, text: goalText(Rules, g) })),
      pending: world.pendingEvents.map((p) => ({ text: JSON.stringify(p) })),
      events: world.eventLog.slice(-EVENT_TAIL).reverse().map((e) => ({
        seq: e.seq, tick: e.tick, type: e.type, text: eventText(Rules, names, e),
      })),
      eventCount: world.eventLog.length,
    };
  }

  // ---------- DOM ----------

  function esc(v) {
    return String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function bar(value, max, cls) {
    const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
    return `<span class="bar ${cls}"><span style="width:${pct}%"></span></span>`;
  }

  const MODE_LABELS = Object.freeze({ setup: '尚未開始', playing: '播放中', paused: '已暫停', error: '已停止（錯誤）' });

  function renderHud(model, ctl) {
    const c = model.clock;
    const mode = ctl.autoPaused && ctl.mode === 'paused' ? '已暫停（分頁在背景時自動暫停）' : label(MODE_LABELS, ctl.mode);
    const horizon = c.tick >= c.horizon ? `已過觀察期 ${c.horizon} tick，世界照常繼續` : `觀察期 ${c.tick}/${c.horizon} tick`;
    return `<div class="clock"><strong>第 ${c.day} 天・第 ${c.slotOfDay}/${c.slotsPerDay} 時段</strong>
      <span>tick ${c.tick}</span><span>靈氣：${esc(c.phase)}</span><span>${esc(horizon)}</span></div>
      <div class="mode" data-mode="${esc(ctl.mode)}">${esc(mode)}・${ctl.speed}×（每秒 ${4 * ctl.speed} tick）</div>`;
  }

  function renderMap(model, selected) {
    const rows = model.map.map((cells) => cells.map((cell) => {
      if (cell.kind === 'void') return '<div class="cell void"></div>';
      const tokens = cell.people.map((id) => {
        const p = model.people.find((x) => x.id === id);
        return `<button type="button" class="token${id === selected ? ' selected' : ''}" data-person="${esc(id)}" title="${esc(p.name)}：${esc(p.status.text)}">${esc(p.short)}</button>`;
      }).join('');
      if (cell.kind === 'gate') return `<div class="cell gate"><span class="terrain">村口</span><div class="tokens">${tokens}</div></div>`;
      const fac = cell.facilities.map((f) => `<span class="facility${f.done ? '' : ' building'}">${esc(f.label)}${f.done ? '' : '（建造中）'}</span>`).join('');
      return `<div class="cell t-${esc(cell.terrain)}${cell.dojo ? ' dojo' : ''}" title="${esc(cell.id)}">
        <span class="terrain">${cell.dojo ? '道館' : esc(cell.terrainLabel)}</span><span class="element">${esc(cell.element)}</span>
        ${fac}<div class="tokens">${tokens}</div></div>`;
    }).join('')).join('');
    return `<div class="grid">${rows}</div>`;
  }

  function renderPeople(model, selected) {
    return model.people.map((p) => {
      const s = p.status;
      const prog = s.progress ? `${bar(s.progress.done, s.progress.total, 'progress')}<small>${s.progress.done}/${s.progress.total} ${esc(s.progress.unit)}</small>` : '';
      return `<button type="button" class="person${p.id === selected ? ' selected' : ''}${p.joined ? '' : ' absent'}" data-person="${esc(p.id)}">
        <span class="who"><strong>${esc(p.name)}</strong><small>${esc(p.role)}・${esc(p.id)}・(${p.pos.r},${p.pos.c})</small></span>
        <span class="state state-${esc(s.kind)}">${esc(s.label)}${s.status ? `・${esc(s.status)}` : ''}</span>
        <span class="text">${esc(s.text)}</span>${s.fallback ? `<span class="fallback">${esc(s.fallback)}</span>` : ''}
        <span class="progressline">${prog}</span>
        <span class="stats">體力 ${p.stamina}${bar(p.stamina, 100, 'stamina')} 心境 ${p.mind}${bar(p.mind, 100, 'mind')}
          修為 ${p.cultivation}${bar(p.cultivation, 100, 'cultivation')} 傷勢 ${p.injury} 突破 ${p.breakthroughs}</span>
      </button>`;
    }).join('');
  }

  function renderDetail(model, selected) {
    const p = model.people.find((x) => x.id === selected);
    if (!p) return '<p class="hint">點地圖上的人物或左側名單查看細節（只改畫面選取，不影響世界）。</p>';
    const s = p.status;
    const rows = [
      ['身分', `${p.role}（${p.id}）`],
      ['位置', `(${p.pos.r},${p.pos.c})`],
      ['狀態', `${s.label}${s.status ? `・${s.status}` : ''}`],
      ['說明', s.text],
      ['來源', s.origin ? (s.origin === 'auto' ? '自主規劃' : '手動指令') : '—'],
      ['fallback', s.fallback || '—'],
      ['等待原因碼', s.code || '—'],
      ['手動指令', p.manualOrder || '無'],
      ['根骨／悟性／手藝', `${p.attributes.rootBone}／${p.attributes.comprehension}／${p.attributes.craft}`],
    ];
    return `<h3>${esc(p.name)}</h3><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
  }

  function renderStock(model) {
    const res = model.resources.map((r) => `<li>${esc(r.label)} <strong>${r.value}</strong></li>`).join('');
    const fac = model.facilities.length === 0 ? '<li>尚無</li>' : model.facilities.map((f) => `<li>${esc(f.label)}・${esc(f.tileId)}・${f.done ? `完工 tick ${f.completedTick}` : `建造中 ${f.progress.done}/${f.progress.total} tick`}</li>`).join('');
    return `<h3>庫存</h3><ul>${res}<li>凝氣丹 <strong>${model.pills}</strong></li></ul><h3>設施</h3><ul>${fac}</ul>`;
  }

  function renderSettings(model) {
    const pol = model.policy.map((p) => `<li>${esc(p.name)}：<strong>${esc(p.text)}</strong> <code>${esc(p.value)}</code></li>`).join('');
    const goals = model.goals.map((g, i) => `<li>${i + 1}. ${esc(g.text)}</li>`).join('');
    return `<h3>政策（安穩發展）</h3><ul>${pol}</ul><h3>目標順序</h3><ol class="plain">${goals}</ol>`;
  }

  function renderEvents(model) {
    const rows = model.events.map((e) => `<li data-type="${esc(e.type)}"><span class="tick">t${e.tick}</span> ${esc(e.text)}</li>`).join('');
    const pending = model.pending.length === 0 ? '' : `<h3>待處理事件（唯讀）</h3><ul>${model.pending.map((p) => `<li><code>${esc(p.text)}</code></li>`).join('')}</ul>`;
    return `${pending}<h3>最近事件（共 ${model.eventCount} 筆，顯示最新 ${model.events.length} 筆）</h3><ul class="events">${rows || '<li>尚無事件</li>'}</ul>`;
  }

  function render(dom, model, ctl, ui) {
    dom.hud.innerHTML = renderHud(model, ctl);
    dom.map.innerHTML = renderMap(model, ui.selected);
    dom.people.innerHTML = renderPeople(model, ui.selected);
    dom.detail.innerHTML = renderDetail(model, ui.selected);
    dom.stock.innerHTML = renderStock(model);
    dom.settings.innerHTML = renderSettings(model);
    dom.events.innerHTML = renderEvents(model);
    const err = ctl.error;
    dom.error.hidden = !err;
    dom.error.textContent = err ? `世界停在 tick ${err.tick}：${err.code}：${err.reason}。不會繼續推進；重新整理頁面會開新局。` : '';
  }

  return Object.freeze({ describe, render, eventText, renderSettings, WAIT_LABELS, FALLBACK_LABELS });
});
