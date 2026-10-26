// SG-TRAIN-01（#305／D43）：練一式掌法到熟練。全部新暫態在本模組閉包 t（目標、已完成單位、本單位步數、途中狀態），
// 不寫進 model 的權威狀態 s（v2 存檔嚴格比欄位）；同一 60Hz 模型 tick 驅動。只有「練熟」結果寫進原合法 palm 欄位（novice→adept），
// 由原清鼠／巡山直接讀（起手 48→24、收勢 36→18 tick；掌距、對敵起手成本、命中規則不變）。
// T2 示意值（D43 已批，不是平衡結論）：站位上完整 12 遊戲秒＝1 單位、6 單位練熟；練習中每遊戲秒扣 1 精力。
export const TRAIN = Object.freeze({ unitMs: 12000, units: 6, perSec: 1, breathTicks: 36, strikeTicks: 12 });
export const TRAIN_MODES = Object.freeze(['toTrain', 'train', 'fromTrain']);
export const TRAIN_LABEL = { toTrain: '走去練功樁', train: '練掌', fromTrain: '練完走回院中' };
export const TRAIN_LENGTH = 120; // 未指定幾何時（單元反例）院中端點→練功站位的預設長度
const LOG_KEEP = 40;

// ctx：s、ids、rules、SKILLS、walkSteps、atHome、nameOf、thirsty、canDrink、blocked(p)（人工／護院巡山等承諾）、adept(p)（寫原 palm）、trainLengths。
export function createTrain01(ctx) {
  const { s, ids, rules, SKILLS, walkSteps, nameOf } = ctx;
  const UNIT = Math.ceil(TRAIN.unitMs / (1000 / 60) - 1e-9), DRAIN = TRAIN.perSec / 60;
  const per = (v) => Object.fromEntries(ids.map((id) => [id, v]));
  const fresh = () => ({ goal: per(false), units: per(0), cur: per(0), done: per(false), note: per(null), log: [] });
  let t = fresh();
  const len = (id) => (ctx.trainLengths && ctx.trainLengths[id]) || TRAIN_LENGTH;
  const training = (p) => TRAIN_MODES.includes(p.motion.mode);
  const active = (p) => !!t.goal[p.id] || training(p);
  const log = (p, kind, extra = {}) => { t.log.push({ tick: s.tick, person: p.id, kind, ...extra }); if (t.log.length > LOG_KEEP) t.log.shift(); };
  function note(p, text) { if (t.note[p.id] === text) return; t.note[p.id] = text; if (text) log(p, 'note', { text }); }
  const needCare = (p) => p.energy <= rules.energy.restAt || ctx.thirsty(p);
  function walk(p, mode, a, b) {
    p.motion = { mode, job: null, phase: null, steps: 0, need: walkSteps(p.level, Math.abs(b - a) * len(p.id)), tripLevel: p.level, a, b, hold: s.tick };
  }
  const uNow = (h) => (h.mode === 'train' ? 1 : h.a + (h.b - h.a) * Math.min(1, h.steps / h.need));
  // 中止本單位（未完成歸零、已完成保留、耗掉的精力不退），從所在處真走回院中端點。
  function leave(p, why) {
    if (t.cur[p.id] > 0) log(p, 'unit:drop', { steps: t.cur[p.id], why });
    t.cur[p.id] = 0;
    const h = p.motion;
    if (h.mode === 'toTrain' || h.mode === 'train') walk(p, 'fromTrain', uNow(h), 0);
  }

  // 玩家指令「練掌到熟練」：新有限人工目標（不是同 job 重複）。由 model 先設目標再沿原 work() 合法邊界收尾舊事。
  function order(p) {
    if (p.palm !== 'novice') return { ok: false, reason: '這一式已練熟（本包上限）' };
    t.goal[p.id] = true; t.done[p.id] = false; note(p, null);
    log(p, 'goal:on', { units: t.units[p.id] });
    return { ok: true };
  }
  // 玩家任何較新的有效指令：退出目標、丟未完成單位，在練功路上就從原地走回。已完成單位保留。
  function cancelBy(p) {
    if (!active(p) && !t.done[p.id]) return false;
    const had = t.goal[p.id] || training(p);
    t.goal[p.id] = false; t.done[p.id] = false;
    if (had) { log(p, 'goal:off', { units: t.units[p.id] }); note(p, '玩家改令：練掌目標取消（已完成單位保留）'); }
    leave(p, 'player');
    return had;
  }
  // 出發／休閒閘：有練掌目標的人不再自己接下一趟工作或去休閒（搬運中的這趟照原規則交付）。
  const gate = (p) => !!t.goal[p.id];

  // 人物迴圈：只推本人一步（起步當 tick 不推進）。
  function move(p) {
    const h = p.motion;
    if (h.hold === s.tick) return;
    if (h.mode === 'train') {
      if (needCare(p)) { note(p, p.energy <= rules.energy.restAt ? `精力 ${Math.floor(p.energy)} ≤ ${rules.energy.restAt}：中止本單位，先去恢復` : '口渴：中止本單位，先去喝水'); leave(p, 'care'); return; }
      p.energy = Math.max(0, p.energy - DRAIN);
      t.cur[p.id] += 1;
      if (t.cur[p.id] < UNIT) return;
      t.cur[p.id] = 0; t.units[p.id] = Math.min(TRAIN.units, t.units[p.id] + 1);
      log(p, 'unit', { units: t.units[p.id] });
      if (t.units[p.id] >= TRAIN.units) {
        ctx.adept(p);
        t.goal[p.id] = false; t.done[p.id] = true;
        log(p, 'adept'); note(p, '這一式練熟了：起手、收勢變快');
        walk(p, 'fromTrain', 1, 0);
      }
      return;
    }
    if (h.mode === 'toTrain' && needCare(p)) { note(p, '要先自理：這次不去練功樁'); leave(p, 'care'); return; }
    h.steps += 1;
    if (h.steps < h.need) return;
    if (h.mode === 'toTrain') p.motion = { mode: 'train', job: null, phase: null, steps: 0, need: null, tripLevel: p.level };
    else {
      p.motion = { mode: 'idle', job: null, phase: null, steps: 0, need: null, tripLevel: p.level };
      if (t.done[p.id]) { t.done[p.id] = false; p.rest = 'manual'; p.why = '練熟了：回院休息待命，再選工作或自主補水才繼續'; }
      ctx.atHome(p);
    }
  }
  // 出發與休閒判定之後：有目標、在院中有空、不用自理才真走去站位。
  function step() {
    for (const id of ids) {
      const p = s.people[id];
      if (!t.goal[id] || p.motion.mode !== 'idle') continue;
      if (p.rest || p.recall || ctx.blocked(p)) continue;
      if (p.energy <= rules.energy.restAt) { note(p, '精力不足：先恢復'); continue; }
      if (ctx.thirsty(p)) { note(p, ctx.canDrink() ? '口渴：先喝水' : '口渴但水缸沒水：等有人補水（可改派挑水）'); continue; }
      note(p, null);
      walk(p, 'toTrain', 0, 1);
      log(p, 'go', { units: t.units[id] });
    }
  }

  function cycle(p, steps) {
    const sk = SKILLS[p.palm], W = sk.windup, R = sk.recover, C = W + R + TRAIN.breathTicks, k = steps % C;
    if (k < W) return { phase: 'windup', steps: k, need: W };
    if (k < W + R) return { phase: 'recover', steps: k - W, need: R };
    return { phase: 'breath', steps: k - W - R, need: TRAIN.breathTicks };
  }
  function view(p) {
    const h = p.motion, id = p.id, u = t.units[id], sk = SKILLS[p.palm];
    const out = { goal: !!t.goal[id], units: u, max: TRAIN.units, unitK: t.cur[id] / UNIT, unitSec: Math.floor(t.cur[id] / 60), unitMax: TRAIN.unitMs / 1000,
      adept: p.palm === 'adept', palm: { windup: sk.windup, recover: sk.recover, from: SKILLS.novice, to: SKILLS.adept },
      training: training(p), leg: null, cyc: null, now: null, src: null, why: t.note[id], next: null, status: null };
    if (!out.goal && !out.training) return out;
    out.src = '玩家指派：練掌到熟練（師父的基礎指點）';
    if (training(p)) out.leg = { a: h.a ?? 1, b: h.b ?? 1, k: h.need ? Math.min(1, h.steps / h.need) : 1, u: uNow(h) };
    out.status = training(p) ? TRAIN_LABEL[h.mode] : '待練掌';
    if (h.mode === 'train') { out.cyc = cycle(p, t.cur[id]); out.now = `練掌：第 ${u + 1} 單位 ${out.unitSec}／${out.unitMax} 秒`; out.next = `完整 ${out.unitMax} 秒算 1 單位；${TRAIN.units} 單位練熟`; }
    else if (h.mode === 'toTrain') { out.now = '走去練功樁'; out.next = '到站位開始一個 12 秒單位'; }
    else if (h.mode === 'fromTrain') { out.now = '走回院中'; out.next = out.goal ? '自理完、目標仍在就再去練' : t.done[id] ? '回院休息待命' : '到院中照最新指令'; }
    else { out.now = `待練（已 ${u}／${TRAIN.units} 單位）`; out.next = h.mode === 'carry' ? '這趟交付後去練功樁' : '院中有空、不用自理就去練功樁'; }
    return out;
  }
  const saveBlock = () => (ids.some((id) => training(s.people[id])) ? '練掌中（含走去／走回練功樁）：這段新活動不在存檔範圍，回到院中後才能存；舊存檔未覆寫' : null);
  return {
    order, cancelBy, gate, active, training, move, step, view, saveBlock,
    snapshot: () => JSON.parse(JSON.stringify(t)), restoreSnap: (x) => { t = JSON.parse(JSON.stringify(x)); }, reset: () => { t = fresh(); },
    get state() { return t; }, log: () => t.log.slice(),
  };
}
