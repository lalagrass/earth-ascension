// SG-LIFE-02（#300／D42）：自主補水方針與一次同門招呼。只本局、不入存檔：全部暫態在本模組閉包 t，
// 不寫進 model 的權威狀態 s（v2 存檔照模板嚴格比欄位，新欄位不能塞進舊快照）。同一 60Hz 模型 tick 驅動，不另開時鐘。
// P1：選了方針的人共享水缸「補水輪」：實存 ≤3 啟動、實存 ≥6 結束；實存＋在途 ≥6 不新增自主出發（容量仍 8，人工持續搬運不受影響）。
// P2：兩人都在自由活動（fun）且沒有必要自理／人工／護院巡山承諾時，發起者一次真走近→轉向→發起（2 秒）→對方回應（2 秒）→各自走回院中。
//     對方忙就放棄本次（不追逐、不占位）；完成或取消一起釋放；任何一人發起過（含被拒），完成一趟新工作前不再發起。
// 3／6、4 秒是 D42 已批示意值，不是平衡結論。
export const FILL = Object.freeze({ start: 3, stop: 6 });
export const MEET = Object.freeze({ greetMs: 2000, replyMs: 2000 });
export const MEET_MODES = Object.freeze(['toMeet', 'meet', 'fromMeet']);
export const MEET_LABEL = { toMeet: '走去打招呼', meet: '打招呼', fromMeet: '招呼完走回院中' };
export const MEET_LENGTH = 40; // 未指定幾何時（單元反例）休閒點→院中→招呼站位的預設額外長度
const KEEP = 8;

// ctx：模型提供的最少接口；meetLengths 由畫面同一份純幾何（routes.mjs meetLengths）經 createModel 第五參數 sense 傳入，
// 不放進 lengths（lengths 是 v2 存檔的幾何相容識別，加欄位會讓舊檔被拒）。（讀 s、步數換算、忙碌判定、院中端點）。
export function createLife02(ctx) {
  const { s, ids, rules, walkSteps, atHome, nameOf, store } = ctx;
  const ticks = (ms) => Math.ceil(ms / (1000 / 60) - 1e-9);
  const GREET = ticks(MEET.greetMs), TALK = GREET + ticks(MEET.replyMs);
  const fresh = () => ({ fill: Object.fromEntries(ids.map((id) => [id, false])), round: false,
    ready: Object.fromEntries(ids.map((id) => [id, true])), meet: null, note: Object.fromEntries(ids.map((id) => [id, null])), events: [], log: [] });
  let t = fresh();
  // 招呼路：休閒點沿原休閒路反走回院中端點，再接院中短折線到站位；uHome＝院中端點在這條複合路上的比例。
  const lenOf = (id) => { const m = ctx.meetLengths && ctx.meetLengths[id]; return m || { total: ctx.funLen(id) + MEET_LENGTH, home: ctx.funLen(id) }; };
  const uHome = (id) => { const m = lenOf(id); return m.home / m.total; };
  const meeting = (p) => MEET_MODES.includes(p.motion.mode);
  const log = (p, kind, extra = {}) => { t.log.push({ tick: s.tick, person: p && p.id, kind, ...extra }); if (t.log.length > 40) t.log.shift(); };
  function note(p, text) { if (t.note[p.id] === text) return; t.note[p.id] = text; if (text) log(p, 'note', { text }); } // 只在原因改變時記

  // ---------- P1 自主補水 ----------
  const filling = (p) => !!t.fill[p.id] && p.job === 'water';
  const capFor = (p) => (filling(p) ? (t.round ? FILL.stop : 0) : null); // 給休閒回院判定：方針者只看本輪上限
  function roundStep() {
    if (!ids.some((id) => t.fill[id])) { t.round = false; return; }
    if (!t.round && s.vat <= FILL.start) { t.round = true; log(null, 'round:start', { vat: s.vat }); }
    else if (t.round && s.vat >= FILL.stop) { t.round = false; log(null, 'round:end', { vat: s.vat }); }
  }
  // 出發閘：方針者只在補水輪中且實存＋全部在途 <6 才出發；未選方針的人不受影響（原容量 8）。
  const gate = (p) => filling(p) && !(t.round && s.vat + s.inFlight < FILL.stop);
  const leisureOk = (p, stocked) => (filling(p) ? !t.round : stocked);
  function setFill(p, on) {
    if (!!t.fill[p.id] === on) return false;
    t.fill[p.id] = on; log(p, on ? 'fill:on' : 'fill:off');
    if (on) roundStep();
    return true;
  }

  // ---------- P2 一次招呼 ----------
  const workCall = (p) => { const cap = capFor(p), st = store(p.job); return (cap ?? st.cap) - st.amount - st.inFlight > 0; };
  // 自主有空：在自己的休閒點，無必要自理／人工／護院巡山／候補、無待執行，也不是工作輪到他。
  const free = (p) => p.motion.mode === 'fun' && !ctx.busy(p) && !workCall(p) && p.energy > rules.energy.restAt;
  function busyText(q) {
    const m = q.motion.mode;
    if (m === 'carry') return `${nameOf(q.id)}${q.motion.job === 'herb' ? '採藥' : '搬運'}中，這次不打擾`;
    if (['toDrink', 'drink', 'fromDrink'].includes(m)) return `${nameOf(q.id)}在喝水，這次不打擾`;
    if (['toSeat', 'seated', 'back'].includes(m) || q.rest) return `${nameOf(q.id)}在休息／停工，這次不打擾`;
    if (q.guardOrder != null || q.fix || ctx.cleaning(q) || ctx.patrolling(q)) return `${nameOf(q.id)}有護院／整理／清鼠／巡山的事，這次不打擾`;
    if (m === 'toFun' || m === 'fromFun') return `${nameOf(q.id)}還在路上，這次不打擾`;
    return `${nameOf(q.id)}正忙，這次不打擾`;
  }
  function walk(p, mode, a, b) {
    const L = lenOf(p.id).total;
    p.motion = { mode, job: null, phase: null, steps: 0, need: walkSteps(p.level, Math.abs(b - a) * L), tripLevel: p.level, a, b };
  }
  const uNow = (h) => (h.mode === 'meet' ? 1 : h.mode === 'toMeet' || h.mode === 'fromMeet' ? h.a + (h.b - h.a) * Math.min(1, h.steps / h.need) : 0);
  function start(p, q) {
    t.meet = { a: p.id, b: q.id, phase: 'go', steps: 0, tick: s.tick };
    for (const x of [p, q]) { walk(x, 'toMeet', 0, 1); x.motion.hold = s.tick; note(x, null); }
    log(p, 'meet:start', { with: q.id });
  }
  // 雙方一起釋放、從所在處真走回院中端點（不瞬移）；同一 tick 只設定、不再推進。
  function release(kind, by) {
    const m = t.meet; if (!m) return false;
    for (const id of [m.a, m.b]) {
      const x = s.people[id];
      if (x.motion.mode === 'toMeet' || x.motion.mode === 'meet') walk(x, 'fromMeet', uNow(x.motion), uHome(id));
      t.ready[id] = false;
    }
    if (kind !== 'done') { log(s.people[m.a], 'meet:cancel', { kind, by }); note(s.people[m.a], kind === 'player' ? '玩家介入：這次招呼取消' : '有事要做：這次招呼取消'); note(s.people[m.b], kind === 'player' ? '玩家介入：這次招呼取消' : '有事要做：這次招呼取消'); }
    t.meet = null;
    return true;
  }
  // 人物迴圈：只推本人一步；到站等對方，回到院中走原生活判定。
  function move(p) {
    const h = p.motion;
    if (h.hold === s.tick) return;
    if (h.mode === 'toMeet' || h.mode === 'fromMeet') {
      h.steps += 1;
      if (h.steps < h.need) return;
      if (h.mode === 'toMeet') p.motion = { mode: 'meet', job: null, phase: null, steps: 0, need: null, tripLevel: p.level, a: 1, b: 1 };
      else { p.motion = { mode: 'idle', job: null, phase: null, steps: 0, need: null, tripLevel: p.level }; atHome(p); }
    }
  }
  // 人物結算、出發與休閒判定之後：先看取消條件，再推招呼，最後才看新發起。
  function step() {
    const m = t.meet;
    if (m) {
      const A = s.people[m.a], B = s.people[m.b];
      const live = (x) => x.motion.mode === 'toMeet' || x.motion.mode === 'meet';
      if (!live(A) || !live(B)) release('lost');
      else if ([A, B].some((x) => ctx.busy(x) || workCall(x))) release('need', [A, B].find((x) => ctx.busy(x) || workCall(x)).id);
      else if (A.motion.mode === 'meet' && B.motion.mode === 'meet') {
        m.phase = 'talk'; m.steps += 1;
        if (m.steps >= TALK) {
          t.events.push({ a: m.a, b: m.b, tick: s.tick, result: 'greeted' }); if (t.events.length > KEEP) t.events.shift();
          log(A, 'meet:done', { with: m.b });
          note(A, `剛和${nameOf(m.b)}打過招呼`); note(B, `${nameOf(m.a)}來打招呼，回應了`);
          release('done');
        }
      }
      return;
    }
    for (const id of ctx.order) {
      const p = s.people[id];
      if (!t.ready[id] || !filling(p) || !free(p)) continue; // 只有本局明確選了自主補水的人會發起（舊局／持續工作預設不變）
      const q = s.people[ids.find((x) => x !== id)];
      t.ready[id] = false; // 一次機會：成功或被拒都要完成一趟新工作才再發起
      if (q && free(q)) start(p, q);
      else if (q) note(p, busyText(q));
      return;
    }
  }
  function tripDone(p) { t.ready[p.id] = true; }
  // 玩家對任一方的有效指令：雙方取消、各自走回；指令本身照原模型入口。
  const cancelBy = (p) => (t.meet && (t.meet.a === p.id || t.meet.b === p.id) ? release('player', p.id) : false);

  // ---------- P3 可讀回饋 ----------
  function view(p) {
    const h = p.motion, m = t.meet, inMeet = m && (m.a === p.id || m.b === p.id), partner = inMeet ? (m.a === p.id ? m.b : m.a) : null;
    const role = inMeet ? (m.a === p.id ? 'greet' : 'reply') : null;
    const talkK = inMeet && m.phase === 'talk' ? m.steps / TALK : 0;
    const vatLine = `${s.vat}／${FILL.stop}擔${s.inFlight ? `（在途 ${s.inFlight}）` : ''}`;
    let now = null, src = null, why = null, next = null, status = null;
    if (meeting(p)) {
      src = inMeet ? (role === 'greet' ? '自己發起（自主有空）' : `${nameOf(partner)}來打招呼`) : '招呼結束';
      status = MEET_LABEL[h.mode];
      if (h.mode === 'toMeet') { now = `走去和${nameOf(partner)}打招呼`; next = '到院中站位面向對方，兩人都到才開始（共 4 秒）'; }
      else if (h.mode === 'meet') { now = !m || m.phase === 'go' ? `等${nameOf(partner)}走到` : talkK < 0.5 ? (role === 'greet' ? '發起招呼／鼓勵' : '聽對方招呼') : (role === 'greet' ? '聽對方回應' : '回應／鼓勵'); next = '說完各自走回院中，續原生活'; }
      else { now = '走回院中'; next = filling(p) ? '到院中照自主補水方針重查' : '到院中重查工作／休閒'; }
      why = t.note[p.id];
    } else if (filling(p)) {
      src = '玩家選的自主補水（只本局，不存檔）';
      const thirsty = ctx.thirsty(p);
      if (h.mode === 'carry') { now = `自主補水：${vatLine}`; next = '交付後重查：實存＋在途到 6 就不再出發'; }
      else if (t.round) { now = `自主補水：${vatLine}，本輪補到 6`; next = thirsty ? '先喝水' : p.rest ? `先恢復到 ${rules.energy.backAt}` : s.vat + s.inFlight >= FILL.stop ? '在途已夠 6，等交付' : '出發挑水'; }
      else { now = `自主補水：${vatLine}，夠用了`; next = thirsty ? '先喝水' : `自由活動；實存 ≤${FILL.start} 再去補`; }
      why = t.note[p.id] || (t.round ? `實存曾 ≤${FILL.start}，補水輪進行中` : `實存 ${s.vat} > ${FILL.start}，不用補`);
    } else {
      src = '持續工作（原規則）';
      why = t.note[p.id];
    }
    return { fill: !!t.fill[p.id], filling: filling(p), round: t.round, now, src, why, next, status, meeting: meeting(p),
      meet: inMeet ? { partner, role, phase: m.phase, k: talkK } : null,
      leg: meeting(p) ? { a: h.a, b: h.b, k: h.need ? Math.min(1, h.steps / h.need) : 1, u: uNow(h) } : null, ready: t.ready[p.id] };
  }
  // ---------- P4 保存界線 ----------
  const saveBlock = () => (ids.some((id) => meeting(s.people[id])) ? '同門招呼進行中（含走回院中）：這段新互動不在存檔範圍，回到院中後才能存；舊存檔未覆寫' : null);
  const snapshot = () => JSON.parse(JSON.stringify(t));
  const restoreSnap = (x) => { t = JSON.parse(JSON.stringify(x)); };
  const reset = () => { t = fresh(); };
  const anyFill = () => ids.some((id) => t.fill[id]);
  return { anyFill, gate, leisureOk, capFor, roundStep, setFill, filling, move, step, tripDone, cancelBy, view, saveBlock, snapshot, restoreSnap, reset, meeting,
    get state() { return t; }, events: () => t.events.map((e) => ({ ...e })), log: () => t.log.slice() };
}

// SG-LIFE-02 P4 存讀邊界（app 與反例共用同一段，不另造框架）：
// 招呼或其返程進行中→不呼叫原存檔、舊檔不被覆寫；讀檔成功才重設本局暫態，失敗則連暫態也還原。
export function guardedSave(model, save) {
  const block = model.life02.saveBlock();
  if (block) return { ok: false, code: 'life02', text: `暫不能存檔：${block}` };
  const r = save();
  if (r.ok && model.life02.anyFill()) r.text += '；自主補水方針與招呼只本局，不寫入存檔（讀檔後回原持續工作）';
  return r;
}
export function guardedLoad(model, load) {
  const keep = model.life02.snapshot();
  const r = load();
  if (r.ok) { model.life02.reset(); r.text += '；自主補水／招呼不在存檔內，已回預設'; } else model.life02.restoreSnap(keep);
  return r;
}
