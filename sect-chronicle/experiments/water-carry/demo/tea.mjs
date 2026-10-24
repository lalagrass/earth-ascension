// HOME-01（#309／D45）：一個茶座，水 1＋藥草 1 → 煮 6 秒 → 喝 4 秒 → 精力 +40（上限 100）。
// 全部新暫態（茶意圖、座位、真料預約、提示、小事件）在本模組閉包 t，不寫進 model 權威狀態 s（v2 存檔欄位不變、不升版）。
// 規則：到座同一 tick 原子占座＋預約真料；煮完一次扣料；喝完一次給益；煮完前取消全退不扣；煮完後取消不退料、未喝完無益。
// 可用料＝實存−未結算預約，最後一份不能被兩人同用；缺料／座位忙給清楚原因，不排長隊、不默默重試。
export const TEA = Object.freeze({ water: 1, herb: 1, brewMs: 6000, sipMs: 4000, gain: 40 });
export const TEA_MODES = Object.freeze(['toTea', 'brew', 'sip', 'fromTea']);
export const TEA_LABEL = { toTea: '走去茶座', brew: '煮茶', sip: '喝茶', fromTea: '走回院中' };
export const TEA_LENGTH = 60;
const EVENT_KEEP = 30;

// ctx：s、ids、rules、walkSteps、atHome、teaLength
export function createTea(ctx) {
  const { s, ids, rules, walkSteps } = ctx;
  const BREW = Math.ceil(TEA.brewMs / (1000 / 60) - 1e-9), SIP = Math.ceil(TEA.sipMs / (1000 / 60) - 1e-9);
  const per = (v) => Object.fromEntries(ids.map((id) => [id, v]));
  const fresh = () => ({ want: per(false), seat: null, resv: { water: 0, herb: 0 }, held: per(false), done: per(false), note: per(null), events: [] });
  let t = fresh();
  const len = () => ctx.teaLength || TEA_LENGTH;
  const inTea = (p) => TEA_MODES.includes(p.motion.mode);
  const active = (p) => !!t.want[p.id] || inTea(p);
  const avail = () => ({ water: s.vat - t.resv.water, herb: s.herbs - t.resv.herb });
  const event = (p, kind, text) => { t.events.push({ tick: s.tick, person: p.id, kind, text }); if (t.events.length > EVENT_KEEP) t.events.shift(); };
  const note = (p, text) => { t.note[p.id] = text; };
  function lack() {
    const a = avail(), miss = [];
    if (a.water < TEA.water) miss.push(`水缸可用 ${Math.max(0, a.water)}`);
    if (a.herb < TEA.herb) miss.push(`藥草可用 ${Math.max(0, a.herb)}`);
    return miss.length ? `缺料：${miss.join('、')}（需水 1＋藥草 1，已扣他人預約）` : null;
  }
  const busy = (p) => (t.seat && t.seat !== p.id ? `茶座正被${ctx.nameOf(t.seat)}使用` : null);
  const reason = (p) => (active(p) ? '已在泡茶：改派其他工作或停工即取消' : busy(p) || lack());
  function walk(p, mode, a, b) {
    p.motion = { mode, job: null, phase: null, steps: 0, need: Math.max(1, walkSteps(p.level, Math.abs(b - a) * len())), tripLevel: p.level, a, b, hold: s.tick };
  }
  const uNow = (h) => (h.mode === 'brew' || h.mode === 'sip' ? 1 : h.a + (h.b - h.a) * Math.min(1, h.steps / h.need));
  function release(p) {
    if (t.held[p.id]) { t.resv.water -= TEA.water; t.resv.herb -= TEA.herb; t.held[p.id] = false; }
    if (t.seat === p.id) t.seat = null;
  }
  function order(p) {
    const r = reason(p);
    if (r) return { ok: false, reason: r };
    t.want[p.id] = true; t.done[p.id] = false; note(p, null);
    event(p, 'order', '玩家指派：去茶座泡一杯茶');
    return { ok: true };
  }
  // 較新的有效指令：取消意圖；煮完前放掉座位與預約（不扣料），喝的途中取消不退料、不給益；從原地走回院中。
  function cancelBy(p, why = '玩家改令') {
    if (!active(p)) return false;
    const m = p.motion.mode;
    t.want[p.id] = false;
    if (m === 'brew') event(p, 'cancel', `${why}：煮茶中止，座位與預約釋放，沒有扣料`);
    else if (m === 'sip') event(p, 'cancel', `${why}：沒喝完，料已用掉不退，也沒有精力`);
    else event(p, 'cancel', `${why}：取消泡茶`);
    release(p);
    if (m === 'toTea' || m === 'brew' || m === 'sip') walk(p, 'fromTea', uNow(p.motion), 0);
    return true;
  }
  const gate = (p) => !!t.want[p.id];
  function fail(p, text) {
    t.want[p.id] = false; t.done[p.id] = true; note(p, text); event(p, 'fail', text);
    walk(p, 'fromTea', 1, 0);
  }
  function move(p) {
    const h = p.motion;
    if (h.hold === s.tick) return;
    if (h.mode === 'brew') {
      h.steps += 1;
      if (h.steps < BREW) return;
      // 煮完：一次結算預約的真料。
      s.vat -= TEA.water; s.herbs -= TEA.herb; t.resv.water -= TEA.water; t.resv.herb -= TEA.herb; t.held[p.id] = false;
      event(p, 'brewed', '茶煮好了：用掉水 1、藥草 1');
      p.motion = { mode: 'sip', job: null, phase: null, steps: 0, need: SIP, tripLevel: p.level };
      return;
    }
    if (h.mode === 'sip') {
      h.steps += 1;
      if (h.steps < SIP) return;
      const before = p.energy;
      p.energy = Math.min(rules.energy.max, p.energy + TEA.gain);
      t.want[p.id] = false; t.done[p.id] = true;
      if (t.seat === p.id) t.seat = null;
      const text = `喝完茶：精力 ${Math.floor(before)} → ${Math.floor(p.energy)}`;
      note(p, text); event(p, 'drank', text);
      walk(p, 'fromTea', 1, 0);
      return;
    }
    h.steps += 1;
    if (h.steps < h.need) return;
    if (h.mode === 'toTea') {
      // 到座同一 tick：原子核座位與可用料，成功就占座＋預約。
      const why = busy(p) || lack();
      if (why) { fail(p, `到了茶座但${why}：不排隊，回院中待命`); return; }
      t.seat = p.id; t.resv.water += TEA.water; t.resv.herb += TEA.herb; t.held[p.id] = true;
      event(p, 'seat', '到茶座：占座並預約水 1、藥草 1，開始煮茶');
      p.motion = { mode: 'brew', job: null, phase: null, steps: 0, need: BREW, tripLevel: p.level };
      return;
    }
    // fromTea 到院中：manual 待命，不默默恢復舊工作。
    p.motion = { mode: 'idle', job: null, phase: null, steps: 0, need: null, tripLevel: p.level };
    if (t.done[p.id]) { t.done[p.id] = false; p.rest = 'manual'; p.why = '泡茶結束：回院中待命，再選工作才繼續'; p.recall = false; }
    ctx.atHome(p);
  }
  // 院中有空才出發；精力低先照原自理恢復，目標仍在再去。
  function step() {
    for (const id of ids) {
      const p = s.people[id];
      if (!t.want[id] || p.motion.mode !== 'idle' || p.rest === 'auto' || ctx.blocked(p)) continue;
      const why = busy(p) || lack();
      if (why) { const text = `${why}：取消泡茶，回院待命`; t.want[id] = false; note(p, text); event(p, 'fail', text); p.rest = 'manual'; p.why = text; continue; }
      walk(p, 'toTea', 0, 1);
      event(p, 'go', '出發去茶座');
    }
  }
  function view(p) {
    const h = p.motion, id = p.id, a = avail();
    const out = { want: !!t.want[id], active: active(p), mode: inTea(p) ? h.mode : null, leg: null, seat: t.seat, resv: { ...t.resv }, avail: a, note: t.note[id], now: null, next: null,
      brewK: h.mode === 'brew' ? h.steps / BREW : h.mode === 'sip' ? 1 : 0, sipK: h.mode === 'sip' ? h.steps / SIP : 0, reason: reason(p) };
    if (inTea(p)) out.leg = { a: h.a ?? 1, b: h.b ?? 1, u: uNow(h) };
    if (h.mode === 'toTea') { out.now = '走去茶座'; out.next = '到座時占座並預約水 1＋藥草 1'; }
    else if (h.mode === 'brew') { out.now = `煮茶 ${Math.floor(h.steps / 60)}／${TEA.brewMs / 1000} 秒`; out.next = '煮好才扣料，接著喝 4 秒'; }
    else if (h.mode === 'sip') { out.now = `喝茶 ${Math.floor(h.steps / 60)}／${TEA.sipMs / 1000} 秒`; out.next = `喝完精力 +${TEA.gain}（上限 100）`; }
    else if (h.mode === 'fromTea') { out.now = '走回院中'; out.next = '回院中待命'; }
    else if (t.want[id]) { out.now = '待泡茶'; out.next = h.mode === 'carry' ? '這趟交付後去茶座' : p.rest === 'auto' ? '先恢復，再去茶座' : '回到院中就去茶座'; }
    return out;
  }
  const saveBlock = () => (ids.some((id) => inTea(s.people[id])) ? '泡茶中（含走去／走回茶座）：這段新活動不在存檔範圍，回到院中後才能存；舊存檔未覆寫' : null);
  return { order, cancelBy, gate, active, inTea, move, step, view, saveBlock, avail, reason,
    snapshot: () => JSON.parse(JSON.stringify(t)), restoreSnap: (x) => { t = JSON.parse(JSON.stringify(x)); }, reset: () => { t = fresh(); },
    get state() { return t; }, events: () => t.events.map((e) => ({ ...e })) };
}
