// 生活開發版：兩人共用一個 60Hz 世界時間，各自做挑水或採藥、成長與接受改工作／停工指令。
// 沿既有展示數值，並非舊 RT 世界的規則／存檔。renderer、影子與 view() 不入帳。
// 一趟出發先向該工作的存放處預約一份容量並鎖腳力；完成交付才釋約、入帳、成長各一次。
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
  // 採藥：生活開發版示意值。採集／交藥沿用取水／倒水時長，藥架容量沿用 8；藥草點不枯竭、藥草不耗用，滿了就等。
  herbCapacity: 8,
  herbStart: 0,
  frameMs: { empty: 110, load: 130, grown: 105 },
});
export const PEOPLE = Object.freeze([
  Object.freeze({ id: 'hero', initialLevel: 1 }),
  Object.freeze({ id: 'cousin', initialLevel: 3 }),
]);
// 兩種工作只差路線、存放處與四段名稱；去程用空手速度、回程用負重速度，共用同一份腳力與成長。
export const JOBS = Object.freeze({
  water: Object.freeze({ label: '挑水', unit: '擔', place: '水缸', phases: ['down', 'dip', 'up', 'pour'] }),
  herb: Object.freeze({ label: '採藥', unit: '份', place: '藥架', phases: ['herbOut', 'herbGather', 'herbBack', 'herbDeliver'] }),
});
export const PHASE_LABEL = {
  down: '下山（空桶）', dip: '取水', up: '上山負重', pour: '倒水',
  herbOut: '往藥圃（空簍）', herbGather: '採藥', herbBack: '背藥回道館', herbDeliver: '交藥',
};

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
const idle = (level) => ({ mode: 'idle', job: null, phase: null, steps: 0, need: null, tripLevel: level });

// 第一參數是單程長度：數字＝兩份工作同長（舊單人基線與反例沿用），或 { water, herb }。
// 第三參數只指定新局人物與起始腳力；不承接舊 RT 存檔。
export function createModel(routes, rules = RULES, characters = PEOPLE) {
  const lengths = typeof routes === 'number' ? { water: routes, herb: routes } : { ...routes };
  const pathLength = lengths.water;
  const ids = characters.map((p) => p.id);
  const s = {
    tick: 0, vat: rules.vatStart, inFlight: 0, herbs: rules.herbStart, herbInFlight: 0, useMs: 0, nextPerson: 0,
    people: Object.fromEntries(characters.map(({ id, initialLevel }) => [id, {
      id, initialLevel, level: initialLevel, xp: 0, trips: 0, motion: idle(initialLevel),
      job: 'water', pending: null, resting: false, lastTrip: null, done: { water: 0, herb: 0 },
    }])),
    shadow: { active: false, job: null, phase: null, steps: 0, need: null },
    log: [],
  };
  // 存放處：數量、容量與在途預約；挑水沿用舊欄位名 vat／inFlight。
  const store = (job) => job === 'herb'
    ? { amount: s.herbs, inFlight: s.herbInFlight, cap: rules.herbCapacity }
    : { amount: s.vat, inFlight: s.inFlight, cap: rules.vatCapacity };
  const full = (job) => { const st = store(job); return st.amount + st.inFlight >= st.cap; };
  const reserve = (job, d) => { if (job === 'herb') s.herbInFlight += d; else s.inFlight += d; };

  function depart(p) {
    if (p.motion.mode !== 'idle' || p.resting || full(p.job)) return false;
    p.motion = { mode: 'carry', job: p.job, phase: 0, steps: 0, need: phaseSteps(speedsFor(p.level, rules), lengths[p.job], rules), tripLevel: p.level, tripStart: s.tick };
    reserve(p.job, 1);
    if (p.id === 'hero') s.shadow = { active: true, job: p.job, phase: 0, steps: 0, need: phaseSteps(speedsFor(p.initialLevel, rules), lengths[p.job], rules) };
    return true;
  }

  function finishTrip(p) {
    // 這一趟已持有一份預約，故不需 Math.min 截掉同刻另一人的入帳。
    const job = p.motion.job;
    reserve(job, -1);
    if (job === 'herb') s.herbs += 1; else s.vat += 1;
    p.trips += 1;
    p.done[job] += 1;
    p.lastTrip = { job, level: p.motion.tripLevel, steps: s.tick - p.motion.tripStart };
    let grew = false;
    if (p.level < rules.maxLevel) {
      p.xp += 1;
      if (p.xp >= rules.tripsToNext[p.level - 1]) { p.level += 1; p.xp = 0; grew = true; }
    }
    s.log.push({ tick: s.tick, person: p.id, kind: 'trip', job, trips: p.trips, level: p.level, grew });
    p.motion = idle(p.level);
    // 待執行意圖只在交付後生效：休息或改做另一份工作，二者只留一個（最新的）。
    if (p.pending === 'rest') {
      p.resting = true;
      s.log.push({ tick: s.tick, person: p.id, kind: 'rest' });
    } else if (p.pending) {
      p.job = p.pending;
      s.log.push({ tick: s.tick, person: p.id, kind: 'switch', job: p.job });
    }
    p.pending = null;
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

  // 改做某工作：當趟途中只記待執行（再下當趟的工作＝取消待執行）；閒置或休息時立刻換並嘗試出發。
  function work(p, job) {
    const name = JOBS[job].label;
    if (p.motion.mode === 'carry') {
      if (job === p.motion.job) { p.pending = null; return { ok: true, text: `取消待執行，繼續${name}` }; }
      p.pending = job;
      return { ok: true, text: `本趟${JOBS[p.motion.job].label}交付後改去${name}`, pending: true };
    }
    p.job = job; p.resting = false; p.pending = null;
    s.log.push({ tick: s.tick, person: p.id, kind: 'start', job });
    depart(p);
    return { ok: true, text: p.motion.mode === 'carry' ? `開始${name}，做完一趟自己接下一趟` : `改為${name}，等${JOBS[job].place}有空位再出發` };
  }

  function dispatch(cmd, id = 'hero') {
    const p = s.people[id];
    if (!p) return { ok: false, reason: '沒有這個工作者' };
    const a = actions(id).find((x) => x.id === cmd);
    if (!a) return { ok: false, reason: '沒有這個指令' };
    if (!a.enabled) return { ok: false, reason: a.reason };
    if (cmd === 'start') return work(p, p.motion.mode === 'carry' ? p.motion.job : p.job);
    if (cmd.startsWith('work:')) return work(p, cmd.slice(5));
    if (cmd === 'restAfterTrip') {
      if (p.motion.mode === 'carry') { p.pending = 'rest'; return { ok: true, text: `本趟${JOBS[p.motion.job].label}交付後停工休息`, pending: true }; }
      p.resting = true; p.pending = null; return { ok: true, text: '留在道館休息，不再自己出發' };
    }
    if (cmd === 'cancel') { p.pending = null; return { ok: true, text: '已取消待執行指令' }; }
    return { ok: false, reason: '沒有這個指令' };
  }

  function actions(id = 'hero') {
    const p = s.people[id];
    if (!p) return [];
    const carrying = p.motion.mode === 'carry';
    const cur = carrying ? p.motion.job : p.job;
    // 已在做這份工作、也沒有別的待執行時，再下同一工作沒有意義。
    const workOpt = (job) => {
      const name = JOBS[job].label;
      const same = !p.resting && job === cur && (carrying ? p.pending == null : true);
      return { id: `work:${job}`, label: `${name}（持續）`,
        detail: carrying ? (job === cur ? `取消待執行，繼續${name}` : `本趟${JOBS[cur].label}交付後改去${name}`) : '做完一趟自己接下一趟，沒有空位就等',
        enabled: !same && p.pending !== job, reason: p.pending === job ? `已排定交付後改去${name}` : `已在持續${name}中` };
    };
    return [
      workOpt('water'),
      workOpt('herb'),
      { id: 'start', label: `開始${JOBS[cur].label}（持續）`, detail: '恢復目前工作', hidden: true,
        enabled: p.resting || p.pending != null, reason: `已在持續${JOBS[cur].label}中` },
      { id: 'restAfterTrip', label: '本趟後休息', detail: carrying ? '這趟交付後停工；不影響另一人' : '留在道館休息，不再自己出發',
        enabled: !p.resting && p.pending !== 'rest', reason: p.resting ? '已在休息' : '已下過這個指令' },
      { id: 'pourNow', label: '立即倒水', detail: '', enabled: false, hidden: cur === 'herb',
        reason: carrying && p.motion.phase >= 2 ? '還沒走到水缸' : '肩上是空桶：要先到泉水裝水' },
      { id: 'cancel', label: '取消待執行', detail: '', enabled: p.pending != null, reason: '沒有待執行指令', hidden: true },
    ];
  }

  function phaseView(m) {
    if (!m.need || m.phase == null) return null;
    return { name: JOBS[m.job].phases[m.phase], k: Math.min(1, m.steps / m.need[m.phase]), steps: m.steps, ms: m.steps * STEP_MS };
  }
  function personView(p) {
    const h = p.motion, ph = phaseView(h), sp = speedsFor(p.level, rules);
    const job = h.mode === 'carry' ? h.job : p.job, st = store(p.job), place = JOBS[p.job].place;
    const status = h.mode === 'carry' ? PHASE_LABEL[ph.name] : p.resting ? '休息（停工指令生效）'
      : st.amount >= st.cap ? (p.job === 'herb' ? '等空位（藥架已滿，藥草不會自己耗用）' : '等用水（水缸已滿）')
        : st.amount + st.inFlight >= st.cap ? `等空位（${place}與在途已滿）` : '準備出發';
    const nextJob = p.pending && p.pending !== 'rest' ? p.pending : job;
    return {
      id: p.id, initialLevel: p.initialLevel, level: p.level, xp: p.xp, trips: p.trips, done: { ...p.done },
      job, jobLabel: JOBS[job].label, pending: p.pending, nextJob,
      nextNeed: p.level < rules.maxLevel ? rules.tripsToNext[p.level - 1] : null, maxLevel: rules.maxLevel,
      tripLevel: h.tripLevel, speeds: sp, tripSpeeds: speedsFor(h.tripLevel, rules), speedsInitial: speedsFor(p.initialLevel, rules),
      atCap: sp.empty >= rules.emptySpeed.cap && sp.load >= rules.loadSpeed.cap,
      // 下趟預計：用目前腳力、下一趟實際要走的工作路線（有待切換就用新工作）。本趟：出發時鎖定的步數。
      tripSeconds: tripSteps(p.level, lengths[nextJob], rules) * STEP_MS / 1000,
      tripSecondsNow: h.mode === 'carry' ? h.need.reduce((a, b) => a + b, 0) * STEP_MS / 1000 : null,
      tripSecondsInitial: tripSteps(p.initialLevel, lengths[nextJob], rules) * STEP_MS / 1000,
      lastTrip: p.lastTrip && { job: p.lastTrip.job, level: p.lastTrip.level, seconds: p.lastTrip.steps * STEP_MS / 1000 },
      mode: h.mode, phase: ph, status,
      tripProgress: h.mode === 'carry' ? (h.need.slice(0, h.phase).reduce((a, b) => a + b, 0) + h.steps) / h.need.reduce((a, b) => a + b, 0) : 0,
      restOrder: p.pending === 'rest', resting: p.resting,
    };
  }
  function view() {
    const people = Object.fromEntries(ids.map((id) => [id, personView(s.people[id])]));
    return {
      // 舊局部檢查的頂層人物欄位仍指主角；新介面使用 people[id]，共用資料只存在這一層。
      ...people.hero,
      tick: s.tick, seconds: s.tick * STEP_MS / 1000,
      vat: s.vat, vatCapacity: rules.vatCapacity, inFlight: s.inFlight,
      herbs: s.herbs, herbCapacity: rules.herbCapacity, herbInFlight: s.herbInFlight, people,
      shadow: s.shadow.active ? phaseView(s.shadow) : null,
      log: s.log.slice(-5),
    };
  }
  return { state: s, step, dispatch, actions, view, pathLength, lengths, rules };
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
