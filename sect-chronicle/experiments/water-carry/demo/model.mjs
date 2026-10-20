// SG-EXP-01 V3 極小展示模型：一名主角在道館與泉水之間挑水，腳力隨完成的趟數成長。
// 這是展示用的獨立模型，不是正式 world，也不寫存檔；所有數值都是示意值，不代表正式平衡。
//
// 規則：
// - 只用固定步進推進（每步 STEP_MS 遊戲毫秒）。畫面幀率、播放倍率、暫停與背景只決定「餵幾步」，不改結果。
// - 一趟 = 下山（空桶）→ 取水 → 上山（負重）→ 倒水。出發時鎖定本趟腳力；倒完水才入帳一次、成長一次，下一趟才變快。
// - 速度有上限：腳力到頂後再挑也不會更快。
// - 自主：沒有休息指令時，水缸未滿就自己出發；滿了就在道館等用水。
// - 初始腳力影子：每趟和主角同時出發、用 Lv 1 的速度走同一條路，只用來對照，永遠不產水。
// - view() 只讀，不改狀態。

export const STEP_MS = 1000 / 60;

export const RULES = Object.freeze({
  maxLevel: 5,
  // 升到下一級需要的完成趟數（Lv1→2 要 1 趟、Lv2→3 要 2 趟……）
  tripsToNext: [1, 2, 3, 4],
  emptySpeed: { base: 60, perLevel: 0.12, cap: 84 }, // 場景單位／秒
  loadSpeed: { base: 40, perLevel: 0.15, cap: 64 },
  dipMs: 4000,
  pourMs: 4000,
  vatCapacity: 8, // 擔；一趟倒一擔（兩桶）
  vatStart: 3,
  useEveryMs: 60000, // 道館每 60 秒用掉一擔水
  frameMs: { empty: 110, load: 130, grown: 105 },
});

const PHASES = ['down', 'dip', 'up', 'pour'];
export const PHASE_LABEL = { down: '下山（空桶）', dip: '取水', up: '上山負重', pour: '倒水' };

export function speedsFor(level, rules = RULES) {
  const f = (s) => Math.min(s.cap, s.base * (1 + s.perLevel * (level - 1)));
  return { empty: f(rules.emptySpeed), load: f(rules.loadSpeed) };
}

// 一整趟在固定步進下需要的步數（倒水完成那一步算進去）
export function tripSteps(level, pathLength, rules = RULES) {
  const sp = speedsFor(level, rules);
  return phaseSteps(sp, pathLength, rules).reduce((a, b) => a + b, 0);
}
function phaseSteps(sp, len, rules) {
  const st = (ms) => Math.ceil(ms / STEP_MS - 1e-9);
  return [st(len / sp.empty * 1000), st(rules.dipMs), st(len / sp.load * 1000), st(rules.pourMs)];
}

export function createModel(pathLength, rules = RULES) {
  const s = {
    tick: 0,
    vat: rules.vatStart,
    useMs: 0,
    trips: 0,
    level: 1,
    xp: 0, // 本級已完成的趟數
    hero: { mode: 'idle', phase: null, steps: 0, need: null, tripLevel: 1 },
    shadow: { active: false, phase: null, steps: 0, need: null },
    restOrder: false, // 「本趟後休息」待執行
    resting: false, // 休息指令生效中：不再自主出發
    lastTrip: null, // 上一趟 { level, steps }
    log: [],
  };

  function depart() {
    const sp = speedsFor(s.level, rules);
    s.hero = { mode: 'carry', phase: 0, steps: 0, need: phaseSteps(sp, pathLength, rules), tripLevel: s.level, tripStart: s.tick };
    s.shadow = { active: true, phase: 0, steps: 0, need: phaseSteps(speedsFor(1, rules), pathLength, rules) };
  }

  function finishTrip() {
    s.vat = Math.min(rules.vatCapacity, s.vat + 1);
    s.trips += 1;
    s.lastTrip = { level: s.hero.tripLevel, steps: s.tick - s.hero.tripStart };
    let grew = false;
    if (s.level < rules.maxLevel) {
      s.xp += 1;
      if (s.xp >= rules.tripsToNext[s.level - 1]) { s.level += 1; s.xp = 0; grew = true; }
    }
    s.log.push({ tick: s.tick, kind: 'trip', trips: s.trips, level: s.level, grew });
    s.hero = { mode: 'idle', phase: null, steps: 0, need: null, tripLevel: s.level };
    if (s.restOrder) { s.restOrder = false; s.resting = true; s.log.push({ tick: s.tick, kind: 'rest' }); }
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
    const h = s.hero;
    if (h.mode === 'carry') {
      h.steps += 1;
      if (h.steps >= h.need[h.phase]) {
        h.steps = 0;
        h.phase += 1;
        if (h.phase >= 4) finishTrip();
      }
    }
    if (s.hero.mode === 'idle' && !s.resting && s.vat < rules.vatCapacity) depart();
  }

  // 玩家指令：只在這裡改狀態；回傳 { ok, text } 或 { ok:false, reason }
  function dispatch(cmd) {
    const a = actions().find((x) => x.id === cmd);
    if (!a) return { ok: false, reason: '沒有這個指令' };
    if (!a.enabled) return { ok: false, reason: a.reason };
    if (cmd === 'start') { s.resting = false; s.restOrder = false; s.log.push({ tick: s.tick, kind: 'start' }); if (s.hero.mode === 'idle' && s.vat < rules.vatCapacity) depart(); return { ok: true, text: s.hero.mode === 'carry' ? '主角出發挑水' : '水缸已滿，等用水後自己出發' }; }
    if (cmd === 'restAfterTrip') {
      if (s.hero.mode === 'carry') { s.restOrder = true; return { ok: true, text: '本趟倒水完成後休息', pending: true }; }
      s.resting = true; return { ok: true, text: '主角留在道館休息' };
    }
    if (cmd === 'cancel') { s.restOrder = false; return { ok: true, text: '已取消待執行指令' }; }
    return { ok: false, reason: '沒有這個指令' };
  }

  // 目前可下的指令與做不到的原因（選單直接用這份清單）
  function actions() {
    const carrying = s.hero.mode === 'carry';
    return [
      { id: 'start', label: '開始挑水（持續）', detail: '挑完一趟自己接下一趟，水缸滿了就等',
        enabled: s.resting || s.restOrder, reason: s.restOrder ? '' : '已在挑水中' },
      { id: 'restAfterTrip', label: '本趟後休息', detail: carrying ? '這趟挑完、倒進水缸後停手回道館休息' : '留在道館休息，不再自己出發',
        enabled: !s.resting && !s.restOrder, reason: s.resting ? '已在休息' : '已下過這個指令' },
      { id: 'pourNow', label: '立即倒水', detail: '', enabled: false,
        reason: carrying && s.hero.phase >= 2 ? '還沒走到水缸' : '肩上是空桶：要先到泉水裝水' },
      { id: 'helper', label: '派師兄一起挑', detail: '', enabled: false, reason: '示範只開放主角下令' },
      { id: 'cancel', label: '取消待執行', detail: '', enabled: s.restOrder, reason: '沒有待執行指令', hidden: true },
    ];
  }

  function phaseView(p) {
    if (!p.need || p.phase == null) return null;
    const name = PHASES[p.phase];
    return { name, k: Math.min(1, p.steps / p.need[p.phase]), steps: p.steps, ms: p.steps * STEP_MS };
  }

  function view() {
    const h = s.hero;
    const ph = phaseView(h);
    const sp = speedsFor(s.level, rules);
    const status = h.mode === 'carry' ? PHASE_LABEL[ph.name]
      : s.resting ? '休息（休息指令生效）' : s.vat >= rules.vatCapacity ? '等用水（水缸已滿）' : '準備出發';
    const nextNeed = s.level < rules.maxLevel ? rules.tripsToNext[s.level - 1] : null;
    return {
      tick: s.tick,
      seconds: s.tick * STEP_MS / 1000,
      vat: s.vat, vatCapacity: rules.vatCapacity,
      trips: s.trips,
      level: s.level, xp: s.xp, nextNeed, maxLevel: rules.maxLevel,
      tripLevel: h.tripLevel,
      speeds: sp, speedsInitial: speedsFor(1, rules), atCap: sp.empty >= rules.emptySpeed.cap && sp.load >= rules.loadSpeed.cap,
      tripSeconds: tripSteps(s.level, pathLength, rules) * STEP_MS / 1000,
      tripSecondsInitial: tripSteps(1, pathLength, rules) * STEP_MS / 1000,
      lastTrip: s.lastTrip && { level: s.lastTrip.level, seconds: s.lastTrip.steps * STEP_MS / 1000 },
      mode: h.mode, phase: ph, status,
      tripProgress: h.mode === 'carry' ? (h.need.slice(0, h.phase).reduce((a, b) => a + b, 0) + h.steps) / h.need.reduce((a, b) => a + b, 0) : 0,
      restOrder: s.restOrder, resting: s.resting,
      shadow: s.shadow.active ? phaseView(s.shadow) : null,
      log: s.log.slice(-5),
    };
  }

  return { state: s, step, dispatch, actions, view, pathLength, rules };
}

// 牆鐘 → 步數。dtMs 是真實經過的毫秒；長空檔（例如分頁卡住）只算 maxFrameMs，不追趕。
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
