// 生活開發版：兩人共用一個 60Hz 世界時間與水缸，各自挑水、成長與接受停工指令。
// 沿既有展示數值，並非舊 RT 世界的規則／存檔。renderer、影子與 view() 不入帳。
// 一趟出發先預約一擔容量並鎖腳力；完成倒水才釋約、產水、成長各一次。
export const STEP_MS = 1000 / 60;

export const RULES = Object.freeze({
  maxLevel: 5,
  tripsToNext: [1, 2, 3, 4],
  emptySpeed: { base: 60, perLevel: 0.12, cap: 84 },
  loadSpeed: { base: 40, perLevel: 0.15, cap: 64 },
  dipMs: 4000,
  pourMs: 4000,
  vatCapacity: 8,
  vatStart: 3,
  useEveryMs: 60000,
  frameMs: { empty: 110, load: 130, grown: 105 },
});
export const PEOPLE = Object.freeze([
  Object.freeze({ id: 'hero', initialLevel: 1 }),
  Object.freeze({ id: 'cousin', initialLevel: 3 }),
]);
const PHASES = ['down', 'dip', 'up', 'pour'];
export const PHASE_LABEL = { down: '下山（空桶）', dip: '取水', up: '上山負重', pour: '倒水' };

export function speedsFor(level, rules = RULES) {
  const f = (s) => Math.min(s.cap, s.base * (1 + s.perLevel * (level - 1)));
  return { empty: f(rules.emptySpeed), load: f(rules.loadSpeed) };
}
export function tripSteps(level, pathLength, rules = RULES) {
  return phaseSteps(speedsFor(level, rules), pathLength, rules).reduce((a, b) => a + b, 0);
}
function phaseSteps(sp, len, rules) {
  const st = (ms) => Math.ceil(ms / STEP_MS - 1e-9);
  return [st(len / sp.empty * 1000), st(rules.dipMs), st(len / sp.load * 1000), st(rules.pourMs)];
}
const idle = (level) => ({ mode: 'idle', phase: null, steps: 0, need: null, tripLevel: level });

// 第三參數只指定新局人物與起始腳力，亦供單人基線及同速反例；不承接舊 RT 存檔。
export function createModel(pathLength, rules = RULES, characters = PEOPLE) {
  const ids = characters.map((p) => p.id);
  const s = {
    tick: 0, vat: rules.vatStart, inFlight: 0, useMs: 0, nextPerson: 0,
    people: Object.fromEntries(characters.map(({ id, initialLevel }) => [id, {
      id, initialLevel, level: initialLevel, xp: 0, trips: 0, motion: idle(initialLevel),
      restOrder: false, resting: false, lastTrip: null,
    }])),
    shadow: { active: false, phase: null, steps: 0, need: null },
    log: [],
  };

  function depart(p) {
    if (p.motion.mode !== 'idle' || p.resting || s.vat + s.inFlight >= rules.vatCapacity) return false;
    p.motion = { mode: 'carry', phase: 0, steps: 0, need: phaseSteps(speedsFor(p.level, rules), pathLength, rules), tripLevel: p.level, tripStart: s.tick };
    s.inFlight += 1;
    if (p.id === 'hero') s.shadow = { active: true, phase: 0, steps: 0, need: phaseSteps(speedsFor(p.initialLevel, rules), pathLength, rules) };
    return true;
  }

  function finishTrip(p) {
    // 這一趟已持有一擔預約，故不需 Math.min 截掉同刻另一人的入帳。
    s.inFlight -= 1;
    s.vat += 1;
    p.trips += 1;
    p.lastTrip = { level: p.motion.tripLevel, steps: s.tick - p.motion.tripStart };
    let grew = false;
    if (p.level < rules.maxLevel) {
      p.xp += 1;
      if (p.xp >= rules.tripsToNext[p.level - 1]) { p.level += 1; p.xp = 0; grew = true; }
    }
    s.log.push({ tick: s.tick, person: p.id, kind: 'trip', trips: p.trips, level: p.level, grew });
    p.motion = idle(p.level);
    if (p.restOrder) {
      p.restOrder = false; p.resting = true;
      s.log.push({ tick: s.tick, person: p.id, kind: 'rest' });
    }
  }

  function step() {
    s.tick += 1;
    s.useMs += STEP_MS;
    if (s.useMs >= rules.useEveryMs) { s.useMs -= rules.useEveryMs; s.vat = Math.max(0, s.vat - 1); }
    const sh = s.shadow;
    if (sh.active) {
      sh.steps += 1;
      if (sh.steps >= sh.need[sh.phase]) { sh.steps = 0; sh.phase += 1; if (sh.phase >= 4) { sh.active = false; sh.phase = null; } }
    }
    for (const id of ids) {
      const p = s.people[id], h = p.motion;
      if (h.mode !== 'carry') continue;
      h.steps += 1;
      if (h.steps >= h.need[h.phase]) {
        h.steps = 0; h.phase += 1;
        if (h.phase >= 4) finishTrip(p);
      }
    }
    // 空位少時輪流獲得下一個出發機會，避免滿缸後每次用水都被同一人搶走。
    const first = s.nextPerson;
    for (let n = 0; n < ids.length; n++) {
      const i = (first + n) % ids.length;
      if (depart(s.people[ids[i]])) s.nextPerson = (i + 1) % ids.length;
    }
  }

  function dispatch(cmd, id = 'hero') {
    const p = s.people[id];
    if (!p) return { ok: false, reason: '沒有這個工作者' };
    const a = actions(id).find((x) => x.id === cmd);
    if (!a) return { ok: false, reason: '沒有這個指令' };
    if (!a.enabled) return { ok: false, reason: a.reason };
    if (cmd === 'start') {
      p.resting = false; p.restOrder = false;
      s.log.push({ tick: s.tick, person: id, kind: 'start' });
      depart(p);
      return { ok: true, text: p.motion.mode === 'carry' ? '持續挑水，本趟完成後接下一趟' : '持續挑水，等水缸有空位再出發' };
    }
    if (cmd === 'restAfterTrip') {
      if (p.motion.mode === 'carry') { p.restOrder = true; return { ok: true, text: '本趟倒水完成後停工休息', pending: true }; }
      p.resting = true; return { ok: true, text: '留在道館休息，不再自己出發' };
    }
    if (cmd === 'cancel') { p.restOrder = false; return { ok: true, text: '已取消待執行休息指令' }; }
    return { ok: false, reason: '沒有這個指令' };
  }

  function actions(id = 'hero') {
    const p = s.people[id];
    if (!p) return [];
    const carrying = p.motion.mode === 'carry';
    return [
      { id: 'start', label: '開始挑水（持續）', detail: '挑完一趟自己接下一趟，沒有空位就等',
        enabled: p.resting || p.restOrder, reason: '已在持續挑水中' },
      { id: 'restAfterTrip', label: '本趟後休息', detail: carrying ? '這趟倒進水缸後停工；不影響另一人' : '留在道館休息，不再自己出發',
        enabled: !p.resting && !p.restOrder, reason: p.resting ? '已在休息' : '已下過這個指令' },
      { id: 'pourNow', label: '立即倒水', detail: '', enabled: false,
        reason: carrying && p.motion.phase >= 2 ? '還沒走到水缸' : '肩上是空桶：要先到泉水裝水' },
      { id: 'cancel', label: '取消待執行', detail: '', enabled: p.restOrder, reason: '沒有待執行指令', hidden: true },
    ];
  }

  function phaseView(p) {
    if (!p.need || p.phase == null) return null;
    return { name: PHASES[p.phase], k: Math.min(1, p.steps / p.need[p.phase]), steps: p.steps, ms: p.steps * STEP_MS };
  }
  function personView(p) {
    const h = p.motion, ph = phaseView(h), sp = speedsFor(p.level, rules);
    const status = h.mode === 'carry' ? PHASE_LABEL[ph.name] : p.resting ? '休息（停工指令生效）'
      : s.vat >= rules.vatCapacity ? '等用水（水缸已滿）' : s.vat + s.inFlight >= rules.vatCapacity ? '等空位（水缸與在途已滿）' : '準備出發';
    return {
      id: p.id, initialLevel: p.initialLevel, level: p.level, xp: p.xp, trips: p.trips,
      nextNeed: p.level < rules.maxLevel ? rules.tripsToNext[p.level - 1] : null, maxLevel: rules.maxLevel,
      tripLevel: h.tripLevel, speeds: sp, tripSpeeds: speedsFor(h.tripLevel, rules), speedsInitial: speedsFor(p.initialLevel, rules),
      atCap: sp.empty >= rules.emptySpeed.cap && sp.load >= rules.loadSpeed.cap,
      tripSeconds: tripSteps(p.level, pathLength, rules) * STEP_MS / 1000,
      tripSecondsInitial: tripSteps(p.initialLevel, pathLength, rules) * STEP_MS / 1000,
      lastTrip: p.lastTrip && { level: p.lastTrip.level, seconds: p.lastTrip.steps * STEP_MS / 1000 },
      mode: h.mode, phase: ph, status,
      tripProgress: h.mode === 'carry' ? (h.need.slice(0, h.phase).reduce((a, b) => a + b, 0) + h.steps) / h.need.reduce((a, b) => a + b, 0) : 0,
      restOrder: p.restOrder, resting: p.resting,
    };
  }
  function view() {
    const people = Object.fromEntries(ids.map((id) => [id, personView(s.people[id])]));
    return {
      // 舊局部檢查的頂層人物欄位仍指主角；新介面使用 people[id]，共用資料只存在這一層。
      ...people.hero,
      tick: s.tick, seconds: s.tick * STEP_MS / 1000,
      vat: s.vat, vatCapacity: rules.vatCapacity, inFlight: s.inFlight, people,
      shadow: s.shadow.active ? phaseView(s.shadow) : null,
      log: s.log.slice(-5),
    };
  }
  return { state: s, step, dispatch, actions, view, pathLength, rules };
}

// 牆鐘只決定餵幾步；長空檔最多算250ms，不追趕背景時間。
export function createClock({ maxFrameMs = 250 } = {}) {
  let acc = 0;
  return {
    feed(dtMs, speed) {
      acc += Math.min(maxFrameMs, Math.max(0, dtMs)) * speed;
      const n = Math.floor(acc / STEP_MS + 1e-9);
      acc -= n * STEP_MS;
      return n;
    },
    clear() { acc = 0; },
  };
}
