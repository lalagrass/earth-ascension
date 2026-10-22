// 生活開發版：兩人共用一個 60Hz 世界時間，各自做挑水或採藥、成長與接受改工作／停工指令。
// 沿既有展示數值，並非舊 RT 世界的規則／存檔。renderer、影子與 view() 不入帳。
// 一趟出發先向該工作的存放處預約一份容量並鎖腳力；完成交付才釋約、入帳、成長各一次。
// LP-04 精力：只在工作四段每遊戲秒扣 1；交付後（或院中閒置）≤30 走去座位，坐下每秒回 5，自主≥80 返院再重查工作。
// 玩家明確停工可坐到 100 仍不自己開工；往返座位與等待不扣不回。示意值見 docs/LP04_HANDOFF.md，非正式平衡。
// LP-05 偏好休閒：院中、原工作存放處實存已滿、精力>30、非停工／叫回時，各自走去喜好的地方（主角看山、熟手舒展筋骨）。
// 休閒不扣不回精力、不產出、不成長、不占預約；有空位（實存＋在途<容量）就回院重查。玩家可叫回（返院後完成一趟才解除）或恢復自主。
// LP-06 野豬：唯一一隻，有精力與威脅記憶；只在棲地恢復／淡忘。精力≥80、威脅≤20且水缸或藥架有實存才出來，嗅探後沿固定路靠近護欄，
// 每下準備 2 秒、接觸才扣精力加損痕；累了／害怕／院內已空就逃回棲地。沒有首訪／回訪計時、波次或 RNG。
// 玩家可派一人去防守點：野豬在護欄時喝止 1 秒→威脅＋80 逃走；已走就晚到返院。往返不扣不回精力、無收益、不占預約。示意值見 docs/LP06_HANDOFF.md。
// LP-07 自主護院：每人「允許」預設關；主動照看＝看見野豬（嗅探／靠近／到護欄）就有意願，受擾再處理＝本訪被撞過才有意願。
// 意願只是候補：不寫 guardOrder、不占這次來訪；人回到院中端點（交付完一趟、恢復到 80、休閒返院）且仍合法時，才沿原驅離路徑正式出發。
// 同 tick 多人準備好依 AUTO_ORDER 只取一位；每人每訪自主正式受理最多一次。玩家有效改令清意願並抑制該人本訪。示意見 docs/LP07_HANDOFF.md。
// LP-08 護欄整理：玩家選一人單次手動派遣；這段護欄同時只有一個未完成整理（待原趟／恢復／返院、前往、動手）。院中合法才沿防守路出發，
// 到點動手 480 工作 tick（僅這段每秒精力 −1，共 8），完整且安全才損痕 −1 一次；看得見的野豬（嗅探／靠近／撞／可見退走）使未完成效果失效。
// 無材料／XP／趟次／產物；不自動補派或接下一階。示意見 docs/LP08_HANDOFF.md。
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
  // LP-06 示意值（PO 依委託選定、未實測）：速度為場景單位／秒，時長為遊戲毫秒。
  boar: { start: 60, threatStart: 0, max: 100, goEnergy: 80, goThreat: 20, restPerSec: 0.5, calmPerSec: 0.25, walkPerSec: 1,
    sniffMs: 2000, approach: 72, flee: 120, hitMs: 2000, hitCost: 18, tiredAt: 30, scaredAt: 60, shoutMs: 1000, shoutThreat: 80, maxMarks: 3 },
  // LP-08 示意值（D18 已批，待真人校準）：動手 8 遊戲秒、這段每秒精力 −1。
  fix: { workMs: 8000, workPerSec: 1 },
});
// 野豬精力／威脅以 1/240 點為單位存整數：每 tick 恢復 0.5/s＝2、淡忘 0.25/s＝1、走路 1/s＝4，長時間累加沒有浮點漂移。
export const BOAR_Q = 240;
export const BOAR_MODE = { habitat: '棲地恢復', out: '走出林緣', sniff: '林緣嗅探', approach: '靠近護欄', prep: '撞護欄', flee: '逃回棲地' };
// 未指定路線時的預設長度（棲地→林緣、棲地→護欄外、院中端點→防守點）；畫面用 routes.mjs 的實際折線長度覆寫。
export const BOAR_LENGTH = { edge: 210, total: 720 };
export const GUARD_LENGTH = 250;
// 退走中野豬離棲地多遠以內就看不見：與 routes.mjs boarAt().visible 的固定界線（x > −20）同源，畫面以 boarSeenD 覆寫。
export const BOAR_SEEN = 50;
export const FIX_LABEL = { toFix: '走去整理護欄', fix: '整理護欄', fromFix: '從護欄返院' };
const FIX_MODES = ['toFix', 'fix', 'fromFix'];
// 同 tick 都準備好時的打平順序（明列、穩定，不由迴圈或畫面順序決定）；不是最短 ETA 或排班公平。
export const AUTO_ORDER = Object.freeze(['hero', 'cousin']);
// 預選傾向是可交換 fixture（熟手主動、主角受擾），不由體態／個性推導，也不改速度或能力。
export const AUTO_REACT = Object.freeze({ hero: 'late', cousin: 'early' });
export const REACT_LABEL = { early: '主動照看', late: '受擾再處理' };
export const GUARD_LABEL = { toGuard: '趕去防守點', guardWait: '在防守點等野豬', shout: '喝止／拍掌', fromGuard: '從防守點返院' };
const GUARD_MODES = ['toGuard', 'guardWait', 'shout', 'fromGuard'];
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
  const boarLen = { ...BOAR_LENGTH, ...(lengths.boar || {}) }, guardLen = lengths.guard || GUARD_LENGTH;
  const seenD = boarLen.seen ?? BOAR_SEEN, fixSteps = Math.ceil(rules.fix.workMs / STEP_MS - 1e-9);
  const B = rules.boar, Q = BOAR_Q, perQ = (perSec) => Math.round(perSec * Q / 60), msSteps = (ms) => Math.ceil(ms / STEP_MS - 1e-9);
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
      // LP-06：guardOrder＝被派去驅離的來訪編號（同一來訪最多一人）；guardResult 只是給玩家看的最近結果。
      guardOrder: null, guardResult: null, shoutDone: false,
      // LP-07：guardSrc＝正式驅離來源 auto／manual；want＝有意願的來訪（候補）；suppress＝玩家本訪改派；tried＝本訪已自主出發過。
      // autoNote 是給玩家看的最近原因（變動才記 log）。
      guardSrc: null, autoAllow: false, react: AUTO_REACT[id] || 'late', want: null, suppress: null, tried: null, autoNote: null,
      // LP-08：fix＝這人持有的未完成整理（wait 待原趟／恢復／返院、go 已出發或動手中）；fixResult 只是給玩家看的最近結果。
      fix: null, fixDue: false, fixResult: null,
    }])),
    fixBy: null, // 這段護欄唯一的未完成整理名額（人物 id）
    // 野豬：d＝離棲地沿固定路的距離；visit 是最近一次來訪編號，active＝這次來訪仍可派人（退走開始即失效）。
    boar: { mode: 'habitat', e: B.start * Q, t: B.threatStart * Q, d: 0, leg: null, steps: 0, need: 0, visit: 0, active: false, hits: 0, marks: 0, why: null, last: null },
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
    if (p.motion.mode !== 'idle' || p.rest || p.guardOrder != null || p.fix || full(p.job)) return false;
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
    else if (p.fix === 'wait') goFix(p);
    else if (p.guardOrder != null && guardLive(p)) goGuard(p);
    else { if (p.guardOrder != null) expireGuard(p); p.motion = idle(p.level); p.why = null; }
  }
  // ---------- LP-06 驅離（人物側）----------
  const guardLive = (p) => s.boar.active && p.guardOrder === s.boar.visit;
  const guardWalk = (p, mode) => ({ mode, job: null, phase: null, steps: 0, need: walkSteps(p.level, guardLen, rules), tripLevel: p.level });
  function goGuard(p) {
    p.why = p.guardSrc === 'auto' ? '自己去驅離野豬' : '玩家派去驅離野豬';
    p.motion = guardWalk(p, 'toGuard');
    s.log.push({ tick: s.tick, person: p.id, kind: 'toGuard', visit: p.guardOrder });
  }
  function leaveGuard(p) {
    p.motion = guardWalk(p, 'fromGuard'); p.shoutDone = false;
    s.log.push({ tick: s.tick, person: p.id, kind: 'fromGuard' });
  }
  function result(p, kind) {
    p.guardResult = { visit: p.guardOrder, kind, tick: s.tick, src: p.guardSrc };
    s.log.push({ tick: s.tick, person: p.id, kind: 'guard:' + kind, visit: p.guardOrder, src: p.guardSrc });
    if (p.guardSrc === 'auto') note(p, kind === 'canceled' ? (p.autoAllow ? 'canceled' : 'off') : kind, p.guardOrder);
    p.guardOrder = null; p.shoutDone = false; p.guardSrc = null;
  }
  // 目標已退走：還沒出發的清掉意圖照原流程；到了防守點（或喝止中）的就是晚到，從防守點走回去。
  function expireGuard(p) { result(p, 'expired'); if (p.why === '玩家派去驅離野豬') p.why = null; }
  // ---------- LP-07 自主護院 ----------
  // 原因只在變動時記 log；同一來訪同一原因不重複。
  function note(p, kind, visit = s.boar.visit) {
    if (p.autoNote && p.autoNote.kind === kind && p.autoNote.visit === visit) return;
    p.autoNote = { kind, visit, tick: s.tick };
    s.log.push({ tick: s.tick, person: p.id, kind: 'auto:' + kind, visit });
  }
  const live = () => s.boar.active;
  const wants = (p) => live() && p.want === s.boar.visit;
  function dropWant(p, kind) { if (!wants(p)) return false; p.want = null; note(p, kind); return true; }
  // 玩家有效改令：清候補、抑制該人這次來訪；沒有進行中的來訪就不抑制未來。
  function override(p) { if (!live()) return; dropWant(p, 'player'); p.suppress = s.boar.visit; }
  // 硬限制：沒允許、本訪被玩家改派或已自主出發過、停工／待停工、LP05 叫回、自己已有正式驅離、同伴已正式處理。
  function blocked(p) {
    const v = s.boar.visit, who = assignee();
    if (!p.autoAllow) return 'off';
    if (p.suppress === v) return 'player';
    if (p.tried === v) return 'tried';
    if (p.rest === 'manual' || p.pending === 'rest' || p.recall) return 'held';
    if (p.guardOrder != null) return 'self';
    if (who && who !== p.id) return 'peer';
    return null;
  }
  // 早反應看可察覺的嗅探／靠近／到護欄（畫外 out 不讀心）；晚反應看本訪 hits（不看全局 marks，封頂後仍會反應）。
  const triggered = (p) => (p.react === 'early' ? ['sniff', 'approach', 'prep'].includes(s.boar.mode) : s.boar.hits >= 1);
  function wantStep() {
    if (!live()) return;
    for (const id of ids) {
      const p = s.people[id], why = blocked(p);
      if (why) { if (why === 'peer') dropWant(p, 'peer'); continue; }
      // 未正式受理的候補每次都用最新傾向重評：改成受擾後，本訪未被撞就收回意願（已出發的 guard 不在此列）。
      if (p.want === s.boar.visit && !triggered(p)) dropWant(p, 'react');
      else if (p.want !== s.boar.visit && triggered(p)) { p.want = s.boar.visit; note(p, 'want'); }
    }
  }
  // 正式受理：只在院中端點（idle、不在恢復、交付已完成），在原工作／休閒再出發之前；同 tick 依 AUTO_ORDER 只取一位。
  function acceptStep() {
    if (!live() || assignee()) return;
    for (const id of AUTO_ORDER) {
      const p = s.people[id];
      if (!p || !wants(p) || blocked(p) || !triggered(p) || p.motion.mode !== 'idle' || p.rest) continue;
      p.want = null; p.tried = s.boar.visit; p.guardOrder = s.boar.visit; p.guardSrc = 'auto'; p.guardResult = null;
      s.log.push({ tick: s.tick, person: p.id, kind: 'guard', visit: p.guardOrder, src: 'auto' });
      note(p, 'go');
      goGuard(p);
      for (const q of ids) if (q !== id) dropWant(s.people[q], 'peer');
      return;
    }
  }
  // 設定：允許／傾向。暫停時也可改，零進度；不清本訪抑制／已嘗試，也不重啟已出發的驅離。
  function setAuto(id, { allow, react } = {}) {
    const p = s.people[id];
    if (!p) return { ok: false, reason: '沒有這個工作者' };
    if (react && react !== p.react) {
      if (!REACT_LABEL[react]) return { ok: false, reason: '沒有這個傾向' };
      p.react = react; s.log.push({ tick: s.tick, person: id, kind: 'auto:react', react });
      if (wants(p) && !triggered(p)) dropWant(p, 'react'); // 候補立即照新傾向；已正式受理的不重啟也不取消
    }
    if (allow != null && !!allow !== p.autoAllow) {
      p.autoAllow = !!allow;
      s.log.push({ tick: s.tick, person: id, kind: 'auto:allow', allow: p.autoAllow });
      if (!p.autoAllow) {
        dropWant(p, 'off');
        // 只取消自主來源尚未完成的效果；玩家明派的保留。去防守點途中走完這段，到點發現已取消就返院。
        if (p.guardSrc === 'auto') cancelGuard(p);
      }
    }
    return { ok: true, text: p.autoAllow ? `允許自主護院：${REACT_LABEL[p.react]}` : '不自主護院（仍可由玩家派遣）' };
  }
  // 新改工作／開始／停工：取消尚未完成的驅離；在防守點等或喝止中立刻返院，去防守點途中走完這段再回。
  function cancelGuard(p) {
    if (p.guardOrder == null) return false;
    result(p, 'canceled');
    if (p.motion.mode === 'guardWait' || p.motion.mode === 'shout') leaveGuard(p);
    return true;
  }
  function arriveGuard(p) {
    if (guardLive(p)) { p.motion = { mode: 'guardWait', job: null, phase: null, steps: 0, need: null, tripLevel: p.level }; s.log.push({ tick: s.tick, person: p.id, kind: 'guardWait' }); return; }
    if (p.guardOrder != null) result(p, 'late');
    leaveGuard(p);
  }
  // ---------- LP-08 護欄整理 ----------
  // 看得見的野豬：嗅探／靠近／撞護欄，或退走中仍在可見界線內。畫外 out／棲地不讀心，也不隨鏡頭／視窗改變。
  const boarSeen = () => { const b = s.boar; return ['sniff', 'approach', 'prep'].includes(b.mode) || (b.mode === 'flee' && b.d > seenD); };
  const fixWalk = (p, mode) => ({ mode, job: null, phase: null, steps: 0, need: walkSteps(p.level, guardLen, rules), tripLevel: p.level });
  // 名額只在這裡釋放一次：完成、失效或玩家取消。
  function endFix(p, kind) {
    p.fixResult = { kind, tick: s.tick, marks: s.boar.marks };
    s.log.push({ tick: s.tick, person: p.id, kind: 'fix:' + kind, marks: s.boar.marks });
    p.fix = null; p.fixDue = false; s.fixBy = null;
    if (p.why === '玩家派去整理護欄') p.why = null;
  }
  // 院中端點出發：再核安全與損痕；不合法就失效，不等野豬走後自動補派。
  function goFix(p) {
    if (boarSeen()) { endFix(p, 'threat'); p.motion = idle(p.level); return; }
    if (s.boar.marks <= 0) { endFix(p, 'clean'); p.motion = idle(p.level); return; }
    p.fix = 'go'; p.why = '玩家派去整理護欄';
    p.motion = fixWalk(p, 'toFix');
    s.log.push({ tick: s.tick, person: p.id, kind: 'toFix' });
  }
  function leaveFix(p) {
    p.motion = fixWalk(p, 'fromFix');
    s.log.push({ tick: s.tick, person: p.id, kind: 'fromFix' });
  }
  function arriveFix(p) {
    if (p.fix === 'go' && !boarSeen() && s.boar.marks > 0) {
      p.motion = { mode: 'fix', job: null, phase: null, steps: 0, need: fixSteps, tripLevel: p.level };
      s.log.push({ tick: s.tick, person: p.id, kind: 'fix' });
      return;
    }
    if (p.fix) endFix(p, boarSeen() ? 'threat' : 'clean');
    leaveFix(p);
  }
  // 取消尚未完成的整理（玩家有效改令／專用取消／叫回／安全失效）：前往途中走完這段再回，動手中立刻返院，待執行只清名額。
  function dropFix(p, kind) {
    if (!p.fix) return false;
    endFix(p, kind);
    if (p.motion.mode === 'fix') leaveFix(p);
    return true;
  }
  // 每 tick 野豬結算後：先看安全（看得見就失效，不補效果），再結算本 tick 做滿的那一下。
  function fixStep() {
    for (const id of ids) {
      const p = s.people[id];
      if (!p.fix) continue;
      if (boarSeen()) { dropFix(p, 'threat'); continue; }
      if (p.fixDue) {
        s.boar.marks = Math.max(0, s.boar.marks - 1);
        endFix(p, 'done');
        leaveFix(p);
      }
    }
  }
  function fixOrder(p) {
    p.fix = 'wait'; s.fixBy = p.id; p.fixResult = null;
    s.log.push({ tick: s.tick, person: p.id, kind: 'fixOrder', marks: s.boar.marks });
    const m = p.motion.mode;
    if (m === 'idle') { atHome(p); return { ok: true, text: p.rest ? `精力低，先恢復到 ${E.backAt} 再去整理護欄` : '走去西坡護欄整理一階損痕' }; }
    if (m === 'carry') return { ok: true, text: `本趟${JOBS[p.motion.job].label}交付後去整理護欄`, pending: true };
    if (m === 'toFun') return { ok: true, text: `走到${prefs[p.id].place}後回院中，再去整理護欄` };
    if (m === 'fun' || m === 'fromFun') return { ok: true, text: '回院中後去整理護欄' };
    if (m === 'toSeat' || m === 'seated') return { ok: true, text: `先恢復到 ${E.backAt}，回院中再去整理護欄` };
    return { ok: true, text: '回到院中就去整理護欄' };
  }
  function fixReason(p) {
    const m = p.motion.mode;
    if (s.fixBy === p.id) return '已在整理這段護欄（重送不重新出發）';
    if (s.fixBy) return `${nameOf(s.fixBy)}已在整理這段護欄`;
    if (m === 'fromFix') return '正從護欄返院：回到院中後才能再派';
    if (p.guardOrder != null || GUARD_MODES.includes(m)) return '正在驅離野豬（含返院）：回院中後再派';
    if (s.boar.marks <= 0) return '護欄沒有損痕';
    if (boarSeen()) return '看得見野豬：等牠離開視線再整理';
    if (p.rest === 'manual') return '已停工：下令開始工作才解除';
    if (p.pending === 'rest') return '已排定本趟後停工';
    return '';
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
  // 停工或待恢復（rest 非空）都要離開休閒；恢復自主只清叫回，不能讓待恢復的人卡在活動點。
  const funOver = (p) => !!p.rest || p.recall || p.guardOrder != null || !!p.fix || wants(p) || slotFor(p);
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
      else if (h.mode === 'fix') p.energy = Math.max(0, p.energy - perTick(rules.fix.workPerSec));
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
      } else if (h.mode === 'toGuard' || h.mode === 'fromGuard') {
        h.steps += 1;
        if (h.steps >= h.need) { if (h.mode === 'fromGuard') { s.log.push({ tick: s.tick, person: id, kind: 'guardHome' }); atHome(p); } else arriveGuard(p); }
      } else if (h.mode === 'toFix' || h.mode === 'fromFix') {
        h.steps += 1;
        if (h.steps >= h.need) { if (h.mode === 'fromFix') { s.log.push({ tick: s.tick, person: id, kind: 'fixHome' }); atHome(p); } else arriveFix(p); }
      } else if (h.mode === 'fix') {
        // 動手：每 tick 推一格；做滿只記到期，效果等本 tick 野豬結算後才定（同 tick 看得見野豬就失效）。
        h.steps += 1;
        if (h.steps >= h.need) p.fixDue = true;
      } else if (h.mode === 'guardWait') {
        // 野豬到了護欄（準備撞）才喝止；還在嗅探／靠近就等它。看的是上一 tick 結束時的野豬。
        if (s.boar.mode === 'prep') { p.motion = { mode: 'shout', job: null, phase: null, steps: 0, need: msSteps(B.shoutMs), tripLevel: p.level }; s.log.push({ tick: s.tick, person: id, kind: 'shout' }); }
      } else if (h.mode === 'shout') {
        h.steps += 1;
        if (h.steps >= h.need) p.shoutDone = true; // 成效在本 tick 野豬結算時才判，不在這裡提高威脅
      } else if (h.mode === 'idle' && !p.rest && p.energy <= E.restAt) atHome(p);
    }
    // LP-07：人物結算後、原工作出發迴圈前，集中判意願與正式受理；回到院中端點的人先決定是否護院，才會接下一趟。
    wantStep();
    acceptStep();
    // 空位少時輪流獲得下一個出發機會，避免滿缸後每次用水都被同一人搶走。
    const first = s.nextPerson;
    for (let n = 0; n < ids.length; n++) {
      const i = (first + n) % ids.length;
      if (depart(s.people[ids[i]])) s.nextPerson = (i + 1) % ids.length;
    }
    // 出發輪替之後才看閒暇：有合法容量一定先工作；只在實存滿時去休閒，僅在途占滿就留在院中等。
    for (const id of ids) {
      const p = s.people[id];
      if (p.motion.mode === 'idle' && !p.rest && !p.recall && p.guardOrder == null && !wants(p) && p.energy > E.restAt && prefs[id] && stocked(p.job)) goFun(p);
    }
    // 人的工作交付、移動與喝止進度都先結算完，最後才結算野豬（誘因看交付後的實存）。
    boarStep();
    // LP-08：野豬狀態確定後才判整理安全與完成；不改野豬自身的喝止／退走／碰撞先後。
    fixStep();
  }

  // ---------- LP-06 野豬 ----------
  const lure = () => s.vat > 0 || s.herbs > 0; // 只看實存，不看在途預約
  function boarLeg(mode, to, speed) {
    const b = s.boar;
    b.mode = mode; b.leg = { from: b.d, to }; b.steps = 0;
    b.need = Math.max(1, Math.ceil(Math.abs(to - b.d) / speed * 1000 / STEP_MS - 1e-9));
  }
  // 自行退走的原因（每個決策 tick 重看）：累了、害怕或院內已空。
  function fleeWhy() {
    const b = s.boar;
    if (b.e <= B.tiredAt * Q) return `累了（精力 ≤ ${B.tiredAt}）`;
    if (b.t >= B.scaredAt * Q) return `害怕（威脅 ≥ ${B.scaredAt}）`;
    if (!lure()) return '院內已空，沒有水／藥草氣味';
    return null;
  }
  function boarFlee(why) {
    const b = s.boar;
    b.active = false; b.why = why;
    boarLeg('flee', 0, B.flee);
    s.log.push({ tick: s.tick, kind: 'boar:flee', visit: b.visit, why });
    // 還沒出發的候補：意願過期（不是到場晚到）。先於 active=false 判斷會讀錯，所以直接比來訪編號。
    for (const id of ids) { const p = s.people[id]; if (p.want === b.visit) { p.want = null; note(p, 'expired'); } }
    // 目標退走：等著或喝止中的人晚到返院；還沒出發的清掉意圖；正在路上的到防守點再發現晚到。
    for (const id of ids) {
      const p = s.people[id];
      if (p.guardOrder !== b.visit) continue;
      const m = p.motion.mode;
      if (m === 'guardWait' || m === 'shout') { result(p, 'late'); leaveGuard(p); }
      else if (m !== 'toGuard') expireGuard(p);
    }
  }
  function boarStep() {
    const b = s.boar;
    if (b.mode === 'habitat') {
      b.e = Math.min(B.max * Q, b.e + perQ(B.restPerSec));
      b.t = Math.max(0, b.t - perQ(B.calmPerSec));
      if (b.e >= B.goEnergy * Q && b.t <= B.goThreat * Q && lure()) {
        b.visit += 1; b.active = true; b.hits = 0; b.why = '水／藥草氣味，精力夠、不害怕';
        boarLeg('out', boarLen.edge, B.approach);
        s.log.push({ tick: s.tick, kind: 'boar:out', visit: b.visit });
      }
      return;
    }
    if (b.mode === 'out' || b.mode === 'approach' || b.mode === 'flee') {
      b.e = Math.max(0, b.e - perQ(B.walkPerSec));
      b.steps += 1;
      b.d = b.leg.from + (b.leg.to - b.leg.from) * Math.min(1, b.steps / b.need);
      if (b.steps < b.need) return;
      b.d = b.leg.to;
      if (b.mode === 'out') { b.mode = 'sniff'; b.steps = 0; b.need = msSteps(B.sniffMs); b.leg = null; }
      else if (b.mode === 'approach') { b.mode = 'prep'; b.steps = 0; b.need = msSteps(B.hitMs); b.leg = null; s.log.push({ tick: s.tick, kind: 'boar:fence', visit: b.visit, e: b.e / Q }); }
      else { b.mode = 'habitat'; b.leg = null; b.steps = 0; b.need = 0; b.last = { visit: b.visit, hits: b.hits, why: b.why }; s.log.push({ tick: s.tick, kind: 'boar:home', visit: b.visit }); }
      return;
    }
    if (b.mode === 'sniff') {
      b.steps += 1;
      if (b.steps < b.need) return;
      // 嗅探完：院內已空就回棲地；否則沿路靠近，途中誘因消失也先走完這段到護欄再判。
      if (!lure()) boarFlee('院內已空，沒有水／藥草氣味');
      else boarLeg('approach', boarLen.total, B.approach);
      return;
    }
    // prep：在護欄外。先判自行退走（已逃就不能被喝止補成功），再判喝止完成（取消尚未接觸的這一下），最後才是到期接觸。
    const why = fleeWhy();
    if (why) { boarFlee(why); return; }
    const shouter = ids.map((id) => s.people[id]).find((p) => p.shoutDone && p.guardOrder === b.visit);
    if (shouter) {
      b.t = Math.min(B.max * Q, b.t + B.shoutThreat * Q);
      result(shouter, 'success');
      leaveGuard(shouter);
      boarFlee(`被${shouter.id === 'hero' ? '主角' : '熟手'}喝止，害怕`);
      return;
    }
    b.steps += 1;
    if (b.steps < b.need) return;
    b.e = Math.max(0, b.e - B.hitCost * Q);
    b.hits += 1;
    const grew = b.marks < B.maxMarks;
    if (grew) b.marks += 1;
    s.log.push({ tick: s.tick, kind: 'boar:hit', visit: b.visit, marks: b.marks, grew });
    b.steps = 0;
    const after = fleeWhy();
    if (after) boarFlee(after);
  }

  // 改做某工作：當趟途中只記待執行（再下當趟的工作＝取消待執行）；閒置時立刻換並嘗試出發。
  // 休息流程中只更新要回去的工作：解除玩家停工，但仍要恢復到 80、走回院中才出發；不移動、不加精力。
  function work(p, job) {
    const name = JOBS[job].label, mode = p.motion.mode;
    cancelGuard(p); // 較新的改工作／開始取消尚未完成的驅離
    dropFix(p, 'canceled'); // 也取消尚未完成的整理；前往途中走完這段再回
    if (mode === 'carry') {
      if (job === p.motion.job) { p.pending = null; return { ok: true, text: `取消待執行，繼續${name}` }; }
      p.pending = job;
      return { ok: true, text: `本趟${JOBS[p.motion.job].label}交付後改去${name}`, pending: true };
    }
    p.job = job; p.pending = null;
    s.log.push({ tick: s.tick, person: p.id, kind: 'start', job });
    // 休閒中明確下工作＝叫回去做它；停工中的明確開始同時解除停工（LP-04 規則：只有明確開始能解除）。
    // 解除停工時精力未到 80，沿 LP-04 轉為自主恢復：走完本段、返院後先去座位恢復到 80，再回院做最新工作（叫回仍保留）。
    if (mode === 'toFun' || mode === 'fun' || mode === 'fromFun') {
      const r = recall(p, name);
      if (p.rest === 'manual') {
        if (p.energy < E.backAt) { p.rest = 'auto'; p.why = `已解除停工；精力未到 ${E.backAt}，先恢復`; return { ok: true, text: `回院中後先恢復到 ${E.backAt} 再${name}` }; }
        p.rest = null;
      }
      return r;
    }
    if (mode === 'back') {
      p.rest = null; p.why = null;
      return { ok: true, text: `正在回院中，到了就${name}` };
    }
    // 整理往返中：同驅離，只改要回去的工作；走完當前腿返院。
    if (FIX_MODES.includes(mode)) {
      p.job = job; p.pending = null;
      if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null;
      p.why = p.rest === 'auto' ? `已解除停工；精力未到 ${E.backAt}，先恢復` : null;
      return { ok: true, text: mode === 'toFix' ? `走到護欄後回院中${name}` : `回院中後${name}` };
    }
    // 驅離往返中：只改要回去的工作；去防守點途中走完這段，等候／喝止中已立刻返院。停工中的明確開始照 LP-04 解除，未到 80 先恢復。
    if (GUARD_MODES.includes(mode)) {
      p.job = job; p.pending = null;
      if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null;
      p.why = p.rest === 'auto' ? `已解除停工；精力未到 ${E.backAt}，先恢復` : null;
      return { ok: true, text: mode === 'toGuard' ? `走到防守點後回院中${name}` : `回院中後${name}` };
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
    dropFix(p, 'canceled'); // 有效叫回也取消待整理
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
    // LP-07：以下有效指令（改工作／開始／停工／取消待執行／叫回）清該人候補並抑制本訪自主；拒絕的已在上面返回。
    if (['start', 'restAfterTrip', 'cancel', 'recall', 'fix', 'fixCancel'].includes(cmd) || cmd.startsWith('work:')) override(p);
    if (cmd === 'fix') return fixOrder(p);
    if (cmd === 'fixCancel') {
      const m = p.motion.mode;
      dropFix(p, 'canceled');
      return { ok: true, text: m === 'toFix' ? '取消整理：走到護欄後直接返院' : m === 'fix' ? '取消整理：停手返院（這一階未完成，不清痕）' : '取消整理：原工作照舊' };
    }
    if (cmd === 'start') return work(p, p.motion.mode === 'carry' ? p.motion.job : p.job);
    if (cmd.startsWith('work:')) return work(p, cmd.slice(5));
    if (cmd === 'guard') return guard(p);
    if (cmd === 'restAfterTrip') {
      cancelGuard(p);
      dropFix(p, 'canceled');
      const mode = p.motion.mode;
      if (mode === 'carry') { p.pending = 'rest'; return { ok: true, text: `本趟${JOBS[p.motion.job].label}交付後停工休息`, pending: true }; }
      p.rest = 'manual'; p.why = '玩家下令停工'; p.pending = null; p.recall = false;
      s.log.push({ tick: s.tick, person: p.id, kind: 'rest' });
      if (mode === 'idle') { goSeat(p); return { ok: true, text: '停工，走去座位休息' }; }
      if (mode === 'toFun') return { ok: true, text: `走到${prefs[p.id].place}後回院中，再去座位停工` };
      if (mode === 'fun' || mode === 'fromFun') return { ok: true, text: '回院中後去座位停工' };
      if (mode === 'back') return { ok: true, text: '走回院中後再回座位停工' };
      if (mode === 'toGuard') return { ok: true, text: '走到防守點後回院中，再去座位停工' };
      if (mode === 'fromGuard' || mode === 'fromFix' || mode === 'fix') return { ok: true, text: '回院中後去座位停工' };
      if (mode === 'toFix') return { ok: true, text: '走到護欄後回院中，再去座位停工' };
      return { ok: true, text: '改為停工：回滿也不會自己開工' };
    }
    if (cmd === 'recall') return recall(p);
    if (cmd === 'resume') {
      p.recall = false;
      s.log.push({ tick: s.tick, person: p.id, kind: 'resume' });
      if (p.rest === 'auto') return { ok: true, text: `恢復自主：先恢復到 ${E.backAt}，之後有空位就做，滿了就去休閒` };
      p.why = null;
      return { ok: true, text: '恢復自主：有空位就做，滿了就去休閒' };
    }
    if (cmd === 'cancel') {
      p.pending = null;
      // 尚未生效（還沒走上防守路）的驅離也一起取消；已在走的路與停工不受影響。
      if (p.guardOrder != null && !guardBusy(p)) result(p, 'canceled');
      return { ok: true, text: s.boar.active ? '已取消待執行指令；這次野豬不再自己去' : '已取消待執行指令' };
    }
    return { ok: false, reason: '沒有這個指令' };
  }

  const guardBusy = (p) => ['toGuard', 'guardWait', 'shout'].includes(p.motion.mode);
  const nameOf = (id) => (id === 'hero' ? '主角' : id === 'cousin' ? '熟手' : id);
  const assignee = () => (s.boar.active ? ids.find((id) => s.people[id].guardOrder === s.boar.visit) || null : null);
  // 派遣驅離：只接受這次有效來訪；同一來訪最多一人；已在處理不重啟。工作／恢復中只記意圖，交付或恢復到 80 後目標仍在才出發。
  function guard(p) {
    p.guardOrder = s.boar.visit; p.guardResult = null; p.guardSrc = 'manual';
    if (p.want === s.boar.visit) p.want = null; // 玩家明派取代自己的候補；不算自主已嘗試
    s.log.push({ tick: s.tick, person: p.id, kind: 'guard', visit: p.guardOrder, src: 'manual' });
    for (const q of ids) if (q !== p.id) dropWant(s.people[q], 'peer');
    const m = p.motion.mode;
    if (m === 'idle') { atHome(p); return { ok: true, text: '去防守點驅離野豬' }; }
    if (m === 'carry') return { ok: true, text: `本趟${JOBS[p.motion.job].label}交付後去驅離（野豬還在才去）`, pending: true };
    if (m === 'toFun') return { ok: true, text: `走到${prefs[p.id].place}後回院中，再去驅離` };
    if (m === 'fun' || m === 'fromFun') return { ok: true, text: '回院中後去驅離' };
    if (m === 'toSeat' || m === 'seated') return { ok: true, text: `先恢復到 ${E.backAt}，野豬還在才去` };
    if (m === 'toGuard') return { ok: true, text: '繼續走向防守點' };
    return { ok: true, text: '回到院中就去驅離' };
  }

  function actions(id = 'hero') {
    const p = s.people[id];
    if (!p) return [];
    const carrying = p.motion.mode === 'carry';
    const cur = carrying ? p.motion.job : p.job;
    const stopped = p.rest === 'manual', fun = ['toFun', 'fun', 'fromFun'].includes(p.motion.mode);
    const guarding = GUARD_MODES.includes(p.motion.mode), g = guarding || p.guardOrder != null;
    const fixing = FIX_MODES.includes(p.motion.mode), f = fixing || !!p.fix;
    const inRest = p.motion.mode !== 'idle' && !carrying && !fun && !guarding && !fixing;
    // 已在做這份工作、也沒有別的待執行時，再下同一工作沒有意義。
    const workOpt = (job) => {
      const name = JOBS[job].label;
      // 休息流程中下同一工作仍有意義：解除停工；自主恢復中則已會回去做它。
      // 驅離中（或已排定）下同一工作＝取消驅離、回來做它，仍有意義。
      // 整理中（或已排定）下同一工作＝取消整理、回來做它，也有意義，不能因同工作而卡死。
      const same = !stopped && !g && !f && job === cur && (carrying ? p.pending == null : true);
      return { id: `work:${job}`, label: `${name}（持續）`,
        detail: carrying ? (job === cur ? `取消待執行，繼續${name}` : `本趟${JOBS[cur].label}交付後改去${name}`)
          : guarding ? `取消驅離，回院中${name}` : fixing ? `${p.fix ? '取消整理，' : ''}回院中${name}` : p.fix ? `取消整理，${name}` : inRest ? `恢復到 ${E.backAt} 並回院中後${name}` : fun ? `叫回院中改${name}` : '做完一趟自己接下一趟，沒有空位就等',
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
      { id: 'cancel', label: '取消待執行', detail: wants(p) ? '取消這次自己去護院的意願' : '', enabled: p.pending != null || (p.guardOrder != null && !guardBusy(p)) || wants(p), reason: stopped ? '停工已生效：下令開始工作才解除' : '沒有待執行指令', hidden: true },
      guardOpt(p, stopped),
      fixOpt(p),
      { id: 'fixCancel', label: '取消本次整理', detail: p.motion.mode === 'toFix' ? '走到護欄後直接返院；不清痕' : p.motion.mode === 'fix' ? '停手返院；這一階未完成、已花的時間精力不退' : '只取消整理，原工作／叫回／恢復照舊',
        enabled: !!p.fix, hidden: !p.fix, reason: '沒有未完成的整理' },
    ];
  }
  function fixOpt(p) {
    const reason = fixReason(p);
    return { id: 'fix', label: '整理護欄', detail: p.motion.mode === 'carry' ? '本趟交付後走去護欄動手 8 秒，清一階損痕' : '走去護欄動手 8 秒（只這段扣 8 精力），清一階損痕後回院',
      enabled: !reason, reason, hidden: s.boar.marks <= 0 && !p.fix && !FIX_MODES.includes(p.motion.mode) };
  }
  function guardOpt(p, stopped) {
    const b = s.boar, who = assignee();
    const reason = !b.active ? (b.mode === 'flee' ? '野豬已在退走：這次來訪不能再派' : '野豬不在院外：沒有可驅離的來訪')
      : who === p.id ? '已在處理這次野豬（重送不重新出發）'
        : who ? `${nameOf(who)}已在處理；要換人先對${nameOf(who)}改工作或停工`
          : stopped ? '已停工：下令開始工作才解除' : p.pending === 'rest' ? '已排定本趟後停工'
            : p.fix || FIX_MODES.includes(p.motion.mode) ? '正在整理護欄（含返院）：先回院中再派驅離' : '';
    return { id: 'guard', label: '驅離野豬', detail: p.motion.mode === 'carry' ? '本趟交付後去防守點；野豬到護欄時喝止' : '走去防守點；野豬到護欄時喝止，已走就返院',
      enabled: !reason, reason, hidden: !b.active && p.guardOrder == null };
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
                  : GUARD_LABEL[h.mode] ? GUARD_LABEL[h.mode]
                  : FIX_LABEL[h.mode] ? FIX_LABEL[h.mode]
            : p.recall ? (st.amount + st.inFlight >= st.cap ? `玩家叫回，等${place}空位` : '玩家叫回，準備出發')
            : st.amount >= st.cap ? (p.job === 'herb' ? '等空位（藥架已滿，藥草不會自己耗用）' : '等用水（水缸已滿）')
              : st.amount + st.inFlight >= st.cap ? `等空位（${place}與在途已滿）` : '準備出發';
    const nextJob = p.pending && p.pending !== 'rest' ? p.pending : job;
    const E = rules.energy;
    // 下一步：把「為什麼停下」與「什麼時候、做什麼」講清楚；自主恢復與玩家停工不共用一句「休息中」。
    const guardNext = p.guardOrder != null && (h.mode === 'toGuard' ? '到防守點等野豬到護欄，再喝止' : h.mode === 'guardWait' ? '野豬到護欄就喝止／拍掌' : h.mode === 'shout' ? '喝止完成野豬就會逃' : null);
    const fixNext = h.mode === 'toFix' ? (p.fix ? '到護欄動手 8 秒，清一階損痕' : `整理已取消：走到護欄後回院中${name}`)
      : h.mode === 'fix' ? '做滿 8 秒且看不見野豬才清一階'
        : h.mode === 'fromFix' ? (stopped ? '到院中後回座位停工' : p.energy <= E.restAt ? `到院中後先去恢復到 ${E.backAt}` : `到院中重查${place}，有空位就${name}`)
          : p.fix === 'wait' ? (h.mode === 'carry' ? `交付後去整理護欄，回來${JOBS[nextJob].label}` : p.rest ? `先恢復到 ${E.backAt}，回院中再去整理護欄` : '回到院中就去整理護欄')
            : null;
    const next = fixNext ? fixNext : guardNext ? guardNext
      : h.mode === 'fromGuard' ? (stopped ? '到院中後回座位停工' : `到院中重查${place}，有空位就${name}`)
      : h.mode === 'toGuard' ? `走到防守點後回院中${name}`
      : p.guardOrder != null && h.mode === 'carry' ? `交付後去驅離野豬，回來${JOBS[nextJob].label}`
      : wants(p) && h.mode === 'carry' ? '交付後在院中自己去護院（野豬還在、沒人處理才去）'
      : h.mode === 'carry'
      ? (p.pending === 'rest' ? '交付後去座位停工' : p.energy <= E.restAt ? `交付後精力 ≤ ${E.restAt}，去休息再回來${JOBS[nextJob].label}` : `交付後繼續${JOBS[nextJob].label}`)
      : h.mode === 'back' ? (stopped ? '到院中後回座位停工' : `到院中重查${place}，有空位就${name}`)
        : fun && stopped ? (h.mode === 'toFun' ? `走到${pref.place}後回院中，再去座位停工` : '回院中後去座位停工')
          : fun && p.rest === 'auto' ? `回院中後先去座位恢復至 ${E.backAt}，再${name}`
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
      guardOrder: p.guardOrder, guardResult: p.guardResult, guarding: GUARD_MODES.includes(h.mode), guardSrc: p.guardSrc,
      auto: autoView(p),
      guardLeg: h.mode === 'toGuard' || h.mode === 'fromGuard' ? { k: Math.min(1, h.steps / h.need), steps: h.steps, need: h.need } : null,
      shoutK: h.mode === 'shout' ? Math.min(1, h.steps / h.need) : 0,
      fix: p.fix, fixing: FIX_MODES.includes(h.mode), fixResult: p.fixResult,
      fixLeg: h.mode === 'toFix' || h.mode === 'fromFix' ? { k: Math.min(1, h.steps / h.need), steps: h.steps, need: h.need } : null,
      fixWork: h.mode === 'fix' ? { k: Math.min(1, h.steps / h.need), steps: h.steps, need: h.need } : null,
    };
  }
  // 自主護院原因：把「沒允許／觀察中／有意願待交付或恢復／玩家改派／同伴處理／已出發／結果／意願過期」分開講，不用一句「護院中」。
  function autoView(p) {
    const b = s.boar, v = b.visit, n = p.autoNote && p.autoNote.visit === v ? p.autoNote.kind : null, m = p.motion.mode;
    const base = { allow: p.autoAllow, react: p.react, reactLabel: REACT_LABEL[p.react], wanting: wants(p), suppressed: live() && p.suppress === v };
    const say = (state, text) => ({ ...base, state, text });
    if (p.guardSrc === 'auto' && p.guardOrder != null) return say('go', '自己出發護院（本訪唯一處理者）');
    if (p.guardSrc === 'manual' && p.guardOrder != null) return say('manual', '玩家派遣中（不受自主開關影響）');
    if (n === 'success') return say('success', '自己去喝止成功，野豬逃走');
    if (n === 'late') return say('late', '自己去了，到場時野豬已走（到場晚到）');
    if (wants(p)) {
      const why = p.react === 'early' ? '看見野豬靠近' : '本訪護欄被撞';
      return say('want', m === 'carry' ? `${why}，有意願：交付這趟後回院中再去（尚未占名額）`
        : p.rest === 'auto' ? `${why}，有意願：先恢復到 ${rules.energy.backAt} 再候補（尚未占名額）`
          : m === 'toFun' || m === 'fun' || m === 'fromFun' ? `${why}，有意願：走回院中再去（尚未占名額）` : `${why}，有意願：回到院中就去`);
    }
    if (n === 'expired') return say('expired', '意願過期：還沒出發野豬就走了（不是到場晚到）');
    if (n === 'peer' && live() && assignee()) return say('peer', `同伴處理：${nameOf(assignee() || '')}已正式出發／受派，不搶單`);
    if (live() && p.suppress === v) return say('player', '本訪由玩家改派，這次不自己搶回');
    // 已自己出發後被關閉／改令（tried 只在正式受理時記）；只取消意願的不說成取消出發。
    if ((n === 'off' || n === 'canceled') && p.tried === v) return say(n, n === 'off' ? '已關閉自主，取消自己出發的這次護院' : '玩家改令，取消自己出發的這次護院');
    if (!p.autoAllow) return say('off', '尚未允許自主護院（仍可由玩家派遣）');
    if (live() && p.tried === v) return say('tried', '這次來訪已自己出發過一次，不再自主受理');
    if (p.rest === 'manual' || p.pending === 'rest') return say('held', '已停工：不自己護院');
    if (p.recall) return say('held', '玩家叫回中：不自己護院');
    return say('watch', p.react === 'early' ? '觀察中：看見野豬靠近就想去' : '觀察中：本訪護欄被撞才想去');
  }
  function boarView() {
    const b = s.boar, e = b.e / Q, t = b.t / Q, lured = lure();
    // 原因：為什麼來、為什麼走、為什麼還留在棲地。不提供任何「下次襲擊」倒數。
    const stay = b.mode !== 'habitat' ? null
      : [e < B.goEnergy ? `精力未到 ${B.goEnergy}` : null, t > B.goThreat ? `還記得威脅（> ${B.goThreat}）` : null, !lured ? '院內水缸與藥架都空，沒有氣味' : null].filter(Boolean);
    return {
      mode: b.mode, label: BOAR_MODE[b.mode], energy: e, threat: t, max: B.max, d: b.d, edge: boarLen.edge, total: boarLen.total,
      legK: b.need ? Math.min(1, b.steps / b.need) : 0, prepK: b.mode === 'prep' ? Math.min(1, b.steps / b.need) : 0, sniffK: b.mode === 'sniff' ? Math.min(1, b.steps / b.need) : 0,
      visit: b.visit, active: b.active, hits: b.hits, marks: b.marks, maxMarks: B.maxMarks, lure: lured, assignee: assignee(), last: b.last,
      seen: boarSeen(), fixBy: s.fixBy,
      why: b.mode === 'habitat' ? (stay.length ? `留在棲地：${stay.join('、')}` : '條件都到了') : b.why,
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
      boar: boarView(),
      log: s.log.slice(-5),
    };
  }
  return { state: s, step, dispatch, actions, view, setAuto, pathLength, lengths, rules };
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
