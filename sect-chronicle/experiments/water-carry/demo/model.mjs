// 生活開發版：兩人共用一個 60Hz 世界時間，各自做挑水或採藥、成長與接受改工作／停工指令。
// 沿既有展示數值，並非舊 RT 世界的規則／存檔。renderer、影子與 view() 不入帳。
// 一趟出發先向該工作的存放處預約一份容量並鎖腳力；完成交付才釋約、入帳、成長各一次。
// LP-04 精力：只在工作四段每遊戲秒扣 1；交付後（或院中閒置）≤30 走去座位，坐下每秒回 5，自主≥80 返院再重查工作。
// 玩家明確停工可坐到 100 仍不自己開工；往返座位與等待不扣不回。示意值見 docs/LP04_HANDOFF.md，非正式平衡。
// LP-05 偏好休閒：院中、原工作存放處實存已滿、精力>30、非停工／叫回時，各自走去喜好的地方（主角看山、熟手舒展筋骨）。
// 休閒不扣不回精力、不產出、不成長、不占預約；有空位（實存＋在途<容量）就回院重查。玩家可叫回（返院後完成一趟才解除）或恢復自主。
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
  energy: { max: 100, start: 100, workPerSec: 1, restPerSec: 5, restAt: 30, backAt: 80 },
});
// 兩人各自的偏好活動：可替換的展示 fixture，不由體態或個性數值推導，也沒有效果。
export const PREFS = Object.freeze({
  hero: Object.freeze({ id: 'view', label: '看山', place: '觀景石', doing: '看山' }),
  cousin: Object.freeze({ id: 'stretch', label: '舒展筋骨', place: '院邊空地', doing: '舒展筋骨' }),
});
export const FUN_LABEL = { toFun: '去', fun: '', fromFun: '從休閒返院' };
// 院中端點到各人座位的單程長度（場景單位）；畫面用 routes.mjs 的實際路線長度覆寫，這裡只是未指定時的預設。
export const SEAT_LENGTH = 100;
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
// 去／回座位：出發時鎖空手速度算步數；坐著沒有固定步數，由精力決定何時起身。
const walkSteps = (level, len, rules) => Math.max(1, Math.ceil(len / speedsFor(level, rules).empty * 1000 / STEP_MS - 1e-9));
export const REST_LABEL = { toSeat: '走去休息', seated: '坐下恢復', back: '返回院中' };

// 第一參數是單程長度：數字＝兩份工作同長（舊單人基線與反例沿用），或 { water, herb, seat: { [id]: 長度 } }。
// 第三參數只指定新局人物與起始腳力；不承接舊 RT 存檔。
// 第四參數是偏好 fixture（預設 PREFS）；傳 {} 表示沒有人有偏好活動，只給隔離 LP-04 門檻的反例用。
export function createModel(routes, rules = RULES, characters = PEOPLE, prefs = PREFS) {
  const lengths = typeof routes === 'number' ? { water: routes, herb: routes } : { ...routes };
  const pathLength = lengths.water;
  const seatLen = (id) => (lengths.seat && lengths.seat[id]) || SEAT_LENGTH;
  const funLen = (id) => (lengths.fun && lengths.fun[id]) || SEAT_LENGTH;
  const E = rules.energy, perTick = (perSec) => perSec * STEP_MS / 1000;
  const ids = characters.map((p) => p.id);
  const s = {
    tick: 0, vat: rules.vatStart, inFlight: 0, herbs: rules.herbStart, herbInFlight: 0, useMs: 0, nextPerson: 0,
    people: Object.fromEntries(characters.map(({ id, initialLevel }) => [id, {
      id, initialLevel, level: initialLevel, xp: 0, trips: 0, motion: idle(initialLevel),
      job: 'water', pending: null, lastTrip: null, done: { water: 0, herb: 0 },
      // rest：為什麼在休息流程（auto＝精力低自主、manual＝玩家停工），返院途中 manual＝走完再回座位；why 是給玩家看的原因。
      energy: E.start, rest: null, why: null,
      // LP-05：recall＝玩家叫回待命（完成返院後新開始的一趟才解除）；funCap＝去程中見過空位，到點就回。
      recall: false, funCap: false,
    }])),
    shadow: { active: false, job: null, phase: null, steps: 0, need: null },
    log: [],
  };
  // 存放處：數量、容量與在途預約；挑水沿用舊欄位名 vat／inFlight。
  const store = (job) => job === 'herb'
    ? { amount: s.herbs, inFlight: s.herbInFlight, cap: rules.herbCapacity }
    : { amount: s.vat, inFlight: s.inFlight, cap: rules.vatCapacity };
  const full = (job) => { const st = store(job); return st.amount + st.inFlight >= st.cap; };
  const stocked = (job) => { const st = store(job); return st.amount >= st.cap; }; // 實存已滿（不含在途）
  const reserve = (job, d) => { if (job === 'herb') s.herbInFlight += d; else s.inFlight += d; };

  function depart(p) {
    if (p.motion.mode !== 'idle' || p.rest || full(p.job)) return false;
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
    // 叫回只在休閒中可下，所以叫回時人一定不在工作；此後交付的第一趟必是返院後新開始的，完成即解除。
    if (p.recall) { p.recall = false; s.log.push({ tick: s.tick, person: p.id, kind: 'recallDone' }); }
    p.lastTrip = { job, level: p.motion.tripLevel, steps: s.tick - p.motion.tripStart };
    let grew = false;
    if (p.level < rules.maxLevel) {
      p.xp += 1;
      if (p.xp >= rules.tripsToNext[p.level - 1]) { p.level += 1; p.xp = 0; grew = true; }
    }
    s.log.push({ tick: s.tick, person: p.id, kind: 'trip', job, trips: p.trips, level: p.level, grew });
    p.motion = idle(p.level);
    // 待執行意圖只在交付後生效：停工或改做另一份工作，二者只留一個（最新的）。
    if (p.pending === 'rest') {
      p.rest = 'manual'; p.why = '玩家下令停工';
      s.log.push({ tick: s.tick, person: p.id, kind: 'rest' });
    } else if (p.pending) {
      p.job = p.pending;
      s.log.push({ tick: s.tick, person: p.id, kind: 'switch', job: p.job });
    }
    p.pending = null;
    atHome(p);
  }

  // 人在院中端點（交付完、返院到達、閒置）：玩家停工先去座位；否則精力≤30 自主去恢復；再否則留在院中由出發迴圈按容量出發或等待。
  function atHome(p) {
    if (p.rest !== 'manual' && p.energy <= E.restAt) { p.rest = 'auto'; p.why = `精力 ${Math.floor(p.energy)} ≤ ${E.restAt}，自己去恢復`; }
    if (p.rest) goSeat(p);
    else { p.motion = idle(p.level); p.why = null; }
  }
  function goSeat(p) {
    p.motion = { mode: 'toSeat', job: null, phase: null, steps: 0, need: walkSteps(p.level, seatLen(p.id), rules), tripLevel: p.level };
    s.log.push({ tick: s.tick, person: p.id, kind: 'toSeat', rest: p.rest });
  }
  // 休閒往返：出發時鎖空手速度算步數；活動本身沒有固定步數，有空位或玩家介入就結束。
  const funWalk = (p, mode) => ({ mode, job: null, phase: null, steps: 0, need: walkSteps(p.level, funLen(p.id), rules), tripLevel: p.level });
  function goFun(p) {
    p.funCap = false; p.why = `${JOBS[p.job].place}已滿，有空閒`;
    p.motion = funWalk(p, 'toFun');
    s.log.push({ tick: s.tick, person: p.id, kind: 'toFun', fun: prefs[p.id].id });
  }
  function leaveFun(p) {
    p.motion = funWalk(p, 'fromFun');
    s.log.push({ tick: s.tick, person: p.id, kind: 'fromFun' });
  }
  // 什麼讓人離開休閒：玩家停工、叫回，或原工作出現輪得到他的空位。空位先算給已在院中等／正在返院的人，
  // 剩下的依出發輪替順序分給休閒中的人；只有一個空位時只回一人，另一人繼續活動，慢的人也輪得到，不是誰先跑回來誰拿。
  // 這只決定誰起身回去，不是預約：到院仍照出發迴圈重查容量。
  const isFun = (m) => m === 'toFun' || m === 'fun';
  function slotFor(p) {
    const st = store(p.job);
    let free = st.cap - st.amount - st.inFlight;
    if (free <= 0) return false;
    for (const id of ids) {
      const q = s.people[id];
      if (q.job === p.job && !q.rest && (q.motion.mode === 'idle' || q.motion.mode === 'fromFun')) free -= 1;
    }
    for (let n = 0; n < ids.length && free > 0; n++) {
      const q = s.people[ids[(s.nextPerson + n) % ids.length]];
      if (q.job !== p.job || q.rest || q.recall || !isFun(q.motion.mode)) continue;
      if (q === p) return true;
      free -= 1;
    }
    return false;
  }
  const funOver = (p) => p.rest === 'manual' || p.recall || slotFor(p);
  function goBack(p) {
    p.why = `精力恢復到 ${E.backAt}，自己回去`;
    p.motion = { mode: 'back', job: null, phase: null, steps: 0, need: walkSteps(p.level, seatLen(p.id), rules), tripLevel: p.level };
    s.log.push({ tick: s.tick, person: p.id, kind: 'back' });
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
      // 每人每步只依步前活動計一次精力：工作扣、坐著回；走路、等待不變。之後才結算進度與轉場。
      if (h.mode === 'carry') p.energy = Math.max(0, p.energy - perTick(E.workPerSec));
      else if (h.mode === 'seated') p.energy = Math.min(E.max, p.energy + perTick(E.restPerSec));
      if (h.mode === 'carry') {
        h.steps += 1;
        if (h.steps >= h.need[h.phase]) {
          h.steps = 0; h.phase += 1;
          if (h.phase >= 4) finishTrip(p);
        }
      } else if (h.mode === 'toSeat' || h.mode === 'back') {
        h.steps += 1;
        if (h.steps >= h.need) {
          if (h.mode === 'toSeat') { p.motion = { mode: 'seated', job: null, phase: null, steps: 0, need: null, tripLevel: p.level }; s.log.push({ tick: s.tick, person: id, kind: 'seated', rest: p.rest }); }
          else atHome(p);
        }
      } else if (h.mode === 'seated') {
        h.steps += 1;
        if (p.rest === 'auto' && p.energy >= E.backAt) { p.rest = null; goBack(p); }
      } else if (h.mode === 'toFun' || h.mode === 'fromFun') {
        if (h.mode === 'toFun' && slotFor(p)) p.funCap = true;
        h.steps += 1;
        if (h.steps >= h.need) {
          if (h.mode === 'fromFun') atHome(p);
          else if (p.funCap || funOver(p)) leaveFun(p); // 去程中出現空位／叫回／停工：走完這段才回
          else { p.motion = { mode: 'fun', job: null, phase: null, steps: 0, need: null, tripLevel: p.level }; s.log.push({ tick: s.tick, person: id, kind: 'fun' }); }
        }
      } else if (h.mode === 'fun') {
        h.steps += 1; // 只給畫面換動作幀；不是計時獎勵
        if (funOver(p)) leaveFun(p);
      } else if (h.mode === 'idle' && !p.rest && p.energy <= E.restAt) atHome(p);
    }
    // 空位少時輪流獲得下一個出發機會，避免滿缸後每次用水都被同一人搶走。
    const first = s.nextPerson;
    for (let n = 0; n < ids.length; n++) {
      const i = (first + n) % ids.length;
      if (depart(s.people[ids[i]])) s.nextPerson = (i + 1) % ids.length;
    }
    // 出發輪替之後才看閒暇：有合法容量一定先工作；只在實存滿時去休閒，僅在途占滿就留在院中等。
    for (const id of ids) {
      const p = s.people[id];
      if (p.motion.mode === 'idle' && !p.rest && !p.recall && p.energy > E.restAt && prefs[id] && stocked(p.job)) goFun(p);
    }
  }

  // 改做某工作：當趟途中只記待執行（再下當趟的工作＝取消待執行）；閒置時立刻換並嘗試出發。
  // 休息流程中只更新要回去的工作：解除玩家停工，但仍要恢復到 80、走回院中才出發；不移動、不加精力。
  function work(p, job) {
    const name = JOBS[job].label, mode = p.motion.mode;
    if (mode === 'carry') {
      if (job === p.motion.job) { p.pending = null; return { ok: true, text: `取消待執行，繼續${name}` }; }
      p.pending = job;
      return { ok: true, text: `本趟${JOBS[p.motion.job].label}交付後改去${name}`, pending: true };
    }
    p.job = job; p.pending = null;
    s.log.push({ tick: s.tick, person: p.id, kind: 'start', job });
    // 休閒中明確下工作＝叫回去做它；停工中的明確開始同時解除停工（LP-04 規則：只有明確開始能解除）。
    if (mode === 'toFun' || mode === 'fun' || mode === 'fromFun') { if (p.rest === 'manual') p.rest = null; return recall(p, name); }
    if (mode === 'back') {
      p.rest = null; p.why = null;
      return { ok: true, text: `正在回院中，到了就${name}` };
    }
    if (mode === 'toSeat' || mode === 'seated') {
      const was = p.rest;
      p.rest = 'auto';
      if (mode === 'seated' && p.energy >= E.backAt) { p.why = null; p.rest = null; goBack(p); return { ok: true, text: `起身回院中，到了就${name}` }; }
      if (was === 'manual') p.why = `已解除停工；精力未到 ${E.backAt}，先恢復`;
      return { ok: true, text: `先恢復到 ${E.backAt} 再回去${name}` };
    }
    depart(p);
    return { ok: true, text: p.motion.mode === 'carry' ? `開始${name}，做完一趟自己接下一趟` : `改為${name}，等${JOBS[job].place}有空位再出發` };
  }

  // 叫回：保留（或剛改的）工作，實際走回院中；去程走完這段、活動中下一步起身、返院途中只記意圖。
  function recall(p, name = JOBS[p.job].label) {
    p.recall = true; p.why = '玩家叫回';
    s.log.push({ tick: s.tick, person: p.id, kind: 'recall', job: p.job });
    const m = p.motion.mode;
    return { ok: true, text: m === 'toFun' ? `走到${prefs[p.id].place}後回院中${name}` : m === 'fun' ? `起身回院中${name}` : `回到院中就${name}；沒有空位就待命` };
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
      const mode = p.motion.mode;
      if (mode === 'carry') { p.pending = 'rest'; return { ok: true, text: `本趟${JOBS[p.motion.job].label}交付後停工休息`, pending: true }; }
      p.rest = 'manual'; p.why = '玩家下令停工'; p.pending = null; p.recall = false;
      s.log.push({ tick: s.tick, person: p.id, kind: 'rest' });
      if (mode === 'idle') { goSeat(p); return { ok: true, text: '停工，走去座位休息' }; }
      if (mode === 'toFun') return { ok: true, text: `走到${prefs[p.id].place}後回院中，再去座位停工` };
      if (mode === 'fun' || mode === 'fromFun') return { ok: true, text: '回院中後去座位停工' };
      if (mode === 'back') return { ok: true, text: '走回院中後再回座位停工' };
      return { ok: true, text: '改為停工：回滿也不會自己開工' };
    }
    if (cmd === 'recall') return recall(p);
    if (cmd === 'resume') {
      p.recall = false; p.why = null;
      s.log.push({ tick: s.tick, person: p.id, kind: 'resume' });
      return { ok: true, text: '恢復自主：有空位就做，滿了就去休閒' };
    }
    if (cmd === 'cancel') { p.pending = null; return { ok: true, text: '已取消待執行指令' }; }
    return { ok: false, reason: '沒有這個指令' };
  }

  function actions(id = 'hero') {
    const p = s.people[id];
    if (!p) return [];
    const carrying = p.motion.mode === 'carry';
    const cur = carrying ? p.motion.job : p.job;
    const stopped = p.rest === 'manual', fun = ['toFun', 'fun', 'fromFun'].includes(p.motion.mode);
    const inRest = p.motion.mode !== 'idle' && !carrying && !fun;
    // 已在做這份工作、也沒有別的待執行時，再下同一工作沒有意義。
    const workOpt = (job) => {
      const name = JOBS[job].label;
      // 休息流程中下同一工作仍有意義：解除停工；自主恢復中則已會回去做它。
      const same = !stopped && job === cur && (carrying ? p.pending == null : true);
      return { id: `work:${job}`, label: `${name}（持續）`,
        detail: carrying ? (job === cur ? `取消待執行，繼續${name}` : `本趟${JOBS[cur].label}交付後改去${name}`)
          : inRest ? `恢復到 ${E.backAt} 並回院中後${name}` : fun ? `叫回院中改${name}` : '做完一趟自己接下一趟，沒有空位就等',
        enabled: !same && p.pending !== job, reason: p.pending === job ? `已排定交付後改去${name}` : fun ? '這是原工作：要回去請按「叫回工作」' : `已在持續${name}中` };
    };
    return [
      workOpt('water'),
      workOpt('herb'),
      { id: 'start', label: `開始${JOBS[cur].label}（持續）`, detail: '恢復目前工作', hidden: true,
        enabled: stopped || p.pending != null, reason: `已在持續${JOBS[cur].label}中` },
      { id: 'recall', label: '叫回工作', detail: `回院中${JOBS[cur].label}；滿了就待命，做完一趟才解除`, hidden: !fun && !p.recall,
        enabled: fun && !p.recall && !stopped, reason: stopped ? '已停工：下令開始工作才解除' : p.recall ? '已叫回' : '不在休閒中' },
      { id: 'resume', label: '恢復自主', detail: '解除叫回：有空位就做，滿了可再去休閒；不解除停工', hidden: !p.recall,
        enabled: p.recall && !stopped, reason: stopped ? '停工中：恢復自主不能解除停工' : '沒有叫回' },
      { id: 'restAfterTrip', label: carrying ? '本趟後停工' : '停工休息', detail: carrying ? '這趟交付後去座位停工；不影響另一人' : '去座位坐著，回滿也不自己開工',
        enabled: !stopped && p.pending !== 'rest', reason: stopped ? '已停工' : '已下過這個指令' },
      { id: 'pourNow', label: '立即倒水', detail: '', enabled: false, hidden: cur === 'herb',
        reason: carrying && p.motion.phase >= 2 ? '還沒走到水缸' : '肩上是空桶：要先到泉水裝水' },
      { id: 'cancel', label: '取消待執行', detail: '', enabled: p.pending != null, reason: stopped ? '停工已生效：下令開始工作才解除' : '沒有待執行指令', hidden: true },
    ];
  }

  function phaseView(m) {
    if (!m.need || m.phase == null) return null;
    return { name: JOBS[m.job].phases[m.phase], k: Math.min(1, m.steps / m.need[m.phase]), steps: m.steps, ms: m.steps * STEP_MS };
  }
  function personView(p) {
    const h = p.motion, ph = phaseView(h), sp = speedsFor(p.level, rules);
    const job = h.mode === 'carry' ? h.job : p.job, st = store(p.job), place = JOBS[p.job].place;
    const stopped = p.rest === 'manual', name = JOBS[p.job].label, pref = prefs[p.id] || { place: '院中', doing: '休息' };
    const fun = h.mode === 'toFun' || h.mode === 'fun' || h.mode === 'fromFun';
    const status = h.mode === 'carry' ? PHASE_LABEL[ph.name]
      : h.mode === 'seated' ? (stopped ? '已停工，需下令開始' : '坐下恢復')
        : h.mode === 'toSeat' ? (stopped ? '走去休息（停工）' : '走去休息（精力低）')
          : h.mode === 'back' ? '返回院中'
            : h.mode === 'toFun' ? `去${pref.place}${pref.doing}`
              : h.mode === 'fun' ? pref.doing
                : h.mode === 'fromFun' ? '從休閒返院'
            : p.recall ? (st.amount + st.inFlight >= st.cap ? `玩家叫回，等${place}空位` : '玩家叫回，準備出發')
            : st.amount >= st.cap ? (p.job === 'herb' ? '等空位（藥架已滿，藥草不會自己耗用）' : '等用水（水缸已滿）')
              : st.amount + st.inFlight >= st.cap ? `等空位（${place}與在途已滿）` : '準備出發';
    const nextJob = p.pending && p.pending !== 'rest' ? p.pending : job;
    const E = rules.energy;
    // 下一步：把「為什麼停下」與「什麼時候、做什麼」講清楚；自主恢復與玩家停工不共用一句「休息中」。
    const next = h.mode === 'carry'
      ? (p.pending === 'rest' ? '交付後去座位停工' : p.energy <= E.restAt ? `交付後精力 ≤ ${E.restAt}，去休息再回來${JOBS[nextJob].label}` : `交付後繼續${JOBS[nextJob].label}`)
      : h.mode === 'back' ? (stopped ? '到院中後回座位停工' : `到院中重查${place}，有空位就${name}`)
        : fun && stopped ? (h.mode === 'toFun' ? `走到${pref.place}後回院中，再去座位停工` : '回院中後去座位停工')
          : fun && (p.recall || p.funCap || !full(p.job)) && h.mode !== 'fun' ? (h.mode === 'toFun' ? `走到${pref.place}後回院中${name}` : `到院中重查${place}，有空位就${name}${p.recall ? '，滿了待命' : ''}`)
            : h.mode === 'toFun' ? `到了就${pref.doing}；${place}有空位會回去`
              : h.mode === 'fun' ? `${place}有空位就回去${name}；這是閒暇，不回精力`
        : stopped ? `已停工，需下令開始（回滿 ${E.max} 也不會自己去）`
          : h.mode === 'toSeat' || h.mode === 'seated' ? `恢復至 ${E.backAt} 後返回${name}`
            : p.recall && st.amount + st.inFlight >= st.cap ? `等${place}有空位再${name}；做完一趟才解除叫回，或按「恢復自主」`
              : st.amount + st.inFlight >= st.cap ? (st.amount >= st.cap ? `${place}已滿，去${pref.place}${pref.doing}` : `等${place}有空位再${name}（有人在補位）`) : `出發${name}`;
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
      restOrder: p.pending === 'rest', resting: stopped,
      energy: p.energy, energyMax: E.max, rest: p.rest, why: p.why, next,
      restLeg: h.mode === 'toSeat' || h.mode === 'back' ? { k: Math.min(1, h.steps / h.need), steps: h.steps, need: h.need } : null,
      pref: prefs[p.id] || null, recall: p.recall, leisure: fun,
      funLeg: h.mode === 'toFun' || h.mode === 'fromFun' ? { k: Math.min(1, h.steps / h.need), steps: h.steps, need: h.need } : null,
      funSteps: h.mode === 'fun' ? h.steps : 0,
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
