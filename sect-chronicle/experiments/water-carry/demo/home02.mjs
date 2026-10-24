// SG-HOME-02（#330／D49）：木料庫、單一寢舍修繕案與兩張穩定床位。全部只本局（閉包，不進 s／存檔）。
// 木料：沿原挑擔四段（woodOut／woodChop／woodBack／woodDeliver）由 model 的通用出發／交付處理；這裡只管庫存、在途預約與容量。
// 修繕：一工地、一工位。下令時同 tick 原子占工位＋預約所缺木料；從院倉領一捆（院倉→在途）真走到工地交付（在途→工地），
// 到位有效施工才累計工時；全料 6 到位且工時滿 18 秒才完成一次並開兩床。未領料取消全釋放；在途取消沿原路帶回入庫；已交料留工地。
// 床位：一房兩床穩定 ID；床主（owner）存這裡，使用者／短期預約由人物真實 motion 推出（不另存可漂移的旗標）。
export const WOOD = Object.freeze({ cap: 12, start: 0, chopMs: 8000 });
export const SITE = Object.freeze({ wood: 6, workMs: 18000 });
export const ROOM_ID = 'dorm-1';
export const BED_IDS = Object.freeze(['bed-1', 'bed-2']);
export const H2_MODES = Object.freeze(['toSite', 'build', 'fromSite']);
export const H2_LABEL = { toSite: '走去寢舍工地', build: '修寢舍', fromSite: '從工地走回院中' };
export const WOOD_JOB = Object.freeze({ label: '砍柴', unit: '捆', place: '柴堆', phases: ['woodOut', 'woodChop', 'woodBack', 'woodDeliver'] });
export const WOOD_PHASE_LABEL = { woodOut: '往林緣枯木（空手）', woodChop: '砍柴', woodBack: '扛木回院', woodDeliver: '堆柴' };
export const STAGE_LABEL = { broken: '破損', building: '施工中', done: '可用' };
// 未指定幾何時的預設長度（舊單元基線）；畫面以 routes.mjs 實際折線覆寫。
export const WOOD_LENGTH = 220, SITE_LENGTH = 300, BED_LENGTH = { 'bed-1': 330, 'bed-2': 345 };

export function createHome02(ctx) {
  const { s, ids, rules } = ctx, E = rules.energy, STEP = 1000 / 60;
  const WORK = Math.ceil(SITE.workMs / STEP - 1e-9);
  const per = (v) => Object.fromEntries(ids.map((id) => [id, v]));
  const fresh = () => ({
    wood: WOOD.start, woodIn: 0, delivered: per(0),
    site: { stage: 'broken', at: 0, work: 0, by: null, resv: 0, bundle: null },
    want: per(false), done: per(false), note: per(null),
    beds: BED_IDS.map((id) => ({ id, owner: null })), events: [],
  });
  let t = fresh();
  const siteLen = () => ctx.siteLength || SITE_LENGTH;
  const bedLen = (id) => (ctx.bedLengths && ctx.bedLengths[id]) || BED_LENGTH[id];
  const event = (p, kind, text) => { t.events.push({ tick: s.tick, person: p ? p.id : null, kind, text }); if (t.events.length > 40) t.events.shift(); };
  const note = (p, text) => { t.note[p.id] = text; };
  const inSite = (p) => H2_MODES.includes(p.motion.mode);
  const active = (p) => !!t.want[p.id] || inSite(p);
  const gate = (p) => !!t.want[p.id];
  // ---------- 木料 ----------
  const bundleN = () => (t.site.bundle ? t.site.bundle.n : 0);
  // 容量：實存＋砍柴在途＋修繕在途的一捆（它要嘛進工地、要嘛退回院倉）都占位，所以退回時一定放得下。
  const store = () => ({ amount: t.wood, inFlight: t.woodIn + bundleN(), cap: WOOD.cap });
  const reserveTrip = (d) => { t.woodIn += d; };
  const avail = () => t.wood - t.site.resv;
  function deliverWood(p) {
    t.woodIn -= 1; t.wood += 1; t.delivered[p.id] += 1;
    event(p, 'wood', `交柴 1 捆：院倉 ${t.wood}／${WOOD.cap}`);
  }
  // ---------- 修繕 ----------
  const committed = () => t.site.at + t.site.resv + bundleN();
  const shortfall = () => Math.max(0, SITE.wood - committed());
  function reason(p) {
    const st = t.site;
    if (st.stage === 'done') return '寢舍已修好';
    if (active(p)) return '已在修寢舍：改派其他工作或停工即取消';
    if (st.by && st.by !== p.id) return `工位正被${ctx.nameOf(st.by)}使用（一個施工位）`;
    const need = shortfall();
    if (need > avail()) return `缺木料：工地還缺 ${need}，院倉可用 ${Math.max(0, avail())}（先砍柴）`;
    return null;
  }
  function order(p) {
    const r = reason(p);
    if (r) return { ok: false, reason: r };
    // 同 tick 原子：占唯一工位＋預約所缺木料（之後別人可用量立刻扣掉這份）。
    const need = shortfall();
    t.site.by = p.id; t.site.resv += need; t.want[p.id] = true; t.done[p.id] = false; note(p, null);
    event(p, 'order', need ? `玩家指派修寢舍：占工位、預約木 ${need}` : '玩家指派修寢舍：料已在工地，占工位');
    return { ok: true, need };
  }
  function walk(p, mode, a, b, carrying) {
    const len = Math.abs(b - a) * siteLen();
    const need = carrying ? ctx.loadSteps(p.level, len) : ctx.walkSteps(p.level, len);
    p.motion = { mode, job: null, phase: null, steps: 0, need: Math.max(1, need), tripLevel: p.level, a, b, hold: s.tick };
  }
  const uNow = (h) => (h.mode === 'build' ? 1 : h.a + (h.b - h.a) * Math.min(1, h.steps / h.need));
  function release(p) {
    const st = t.site;
    if (st.by === p.id) { st.resv = 0; st.by = null; } // 只有工位持有者能有院倉預約
  }
  // 較新有效指令：取消意圖、放工位與未領預約；手上那捆沿原路帶回院倉。已交料與有效工時留工地。
  function cancelBy(p, why = '玩家改令') {
    if (t.done[p.id]) t.done[p.id] = false;
    if (!active(p)) return false;
    const m = p.motion.mode;
    t.want[p.id] = false;
    const carry = t.site.bundle && t.site.bundle.by === p.id;
    release(p);
    event(p, 'cancel', `${why}：${carry ? `手上木 ${t.site.bundle.n} 帶回院倉` : m === 'build' ? `停手，工時 ${secs(t.site.work)} 秒與已交料留工地` : '取消修寢舍，預約釋放'}`);
    if (m === 'toSite' || m === 'build') walk(p, 'fromSite', uNow(p.motion), 0, carry);
    return true;
  }
  const secs = (n) => Math.floor(n * STEP / 1000);
  function complete(p) {
    const st = t.site;
    st.stage = 'done'; st.by = null; t.want[p.id] = false; t.done[p.id] = true;
    event(p, 'done', `寢舍修好：用木 ${SITE.wood}、工時 ${SITE.workMs / 1000} 秒；兩張床可用`);
    note(p, '寢舍修好了');
    walk(p, 'fromSite', 1, 0, false);
  }
  function move(p) {
    const h = p.motion, st = t.site;
    if (h.hold === s.tick) return;
    if (h.mode === 'build') {
      if (p.energy <= E.restAt) {
        // 精力不足：工時保留、工位與意圖保留，先回去自理；恢復到 80 回院再來。
        event(p, 'tired', `精力 ${Math.floor(p.energy)} ≤ ${E.restAt}：先回去恢復，工時 ${secs(st.work)} 秒保留`);
        walk(p, 'fromSite', 1, 0, false);
        return;
      }
      st.work += 1;
      if (st.work >= WORK && st.at >= SITE.wood) complete(p);
      return;
    }
    h.steps += 1;
    if (h.steps < h.need) return;
    if (h.mode === 'toSite') {
      if (st.bundle && st.bundle.by === p.id) {
        st.at += st.bundle.n;
        event(p, 'haul', `木 ${st.bundle.n} 交到工地：工地 ${st.at}／${SITE.wood}`);
        st.bundle = null;
      }
      if (st.stage === 'broken') st.stage = 'building';
      p.motion = { mode: 'build', job: null, phase: null, steps: 0, need: WORK, tripLevel: p.level };
      return;
    }
    // fromSite 到院中：帶著的那捆歸還院倉（容量早已占位）。
    if (st.bundle && st.bundle.by === p.id) { t.wood += st.bundle.n; event(p, 'return', `木 ${st.bundle.n} 歸還院倉：${t.wood}／${WOOD.cap}`); st.bundle = null; }
    p.motion = { mode: 'idle', job: null, phase: null, steps: 0, need: null, tripLevel: p.level };
    if (t.done[p.id]) { t.done[p.id] = false; p.rest = 'manual'; p.why = '寢舍修好：回院中待命，再選工作才繼續'; p.recall = false; }
    ctx.atHome(p);
  }
  // 院中有空才出發；精力低先照原自理恢復，意圖仍在再去。出發時把預約真正領出（院倉→在途）。
  function step() {
    for (const id of ids) {
      const p = s.people[id], st = t.site;
      if (!t.want[id] || p.motion.mode !== 'idle' || p.rest === 'auto' || ctx.blocked(p)) continue;
      let carry = false;
      if (st.by === id && st.resv > 0) {
        t.wood -= st.resv; st.bundle = { by: id, n: st.resv }; st.resv = 0; carry = true;
        event(p, 'pick', `從院倉領木 ${st.bundle.n}：扛去工地`);
      }
      walk(p, 'toSite', 0, 1, carry);
    }
  }
  // ---------- 床位 ----------
  const bed = (id) => t.beds.find((b) => b.id === id);
  const userOf = (id) => ids.find((q) => { const h = s.people[q].motion; return h.bed === id && (h.mode === 'seated' || h.mode === 'back'); }) || null;
  const resvOf = (id) => ids.find((q) => { const h = s.people[q].motion; return h.bed === id && h.mode === 'toSeat'; }) || null;
  const bedIdle = (id) => !userOf(id) && !resvOf(id);
  // 要休息時選床：己床優先；沒有床就依穩定順序認領第一張無主且閒置的床；都沒有回 null（石凳備案）。
  function bedFor(p) {
    if (t.site.stage !== 'done') return null;
    const own = t.beds.find((b) => b.owner === p.id);
    if (own) return bedIdle(own.id) ? own.id : null;
    const free = t.beds.find((b) => !b.owner && bedIdle(b.id));
    if (!free) return null;
    free.owner = p.id;
    event(p, 'claim', `自己認床：${free.id}`);
    return free.id;
  }
  function bedWhy(p) {
    if (t.site.stage !== 'done') return '寢舍未修好：在石凳恢復';
    const own = t.beds.find((b) => b.owner === p.id);
    if (own) return bedIdle(own.id) ? null : `${own.id} 正在用：在石凳恢復`;
    return t.beds.some((b) => !b.owner) ? null : '兩張床都有主人：在石凳恢復';
  }
  // 玩家床牌：只在床閒置（無使用／預約）時可指派或解除；改派已有床的人時原子解除舊床（舊床也必須閒置）。
  function assign(bedId, pid) {
    const b = bed(bedId);
    if (!b) return { ok: false, reason: '沒有這張床' };
    if (t.site.stage !== 'done') return { ok: false, reason: '寢舍還沒修好' };
    if (!bedIdle(bedId)) return { ok: false, reason: `${bedId} 正有人使用或正在走去：不能改床主` };
    if (pid == null) { const was = b.owner; b.owner = null; event(null, 'unassign', `解除 ${bedId} 床主${was ? `（原 ${ctx.nameOf(was)}）` : ''}`); return { ok: true, text: `${bedId} 改為無主` }; }
    if (!ids.includes(pid)) return { ok: false, reason: '沒有這個人' };
    if (b.owner === pid) return { ok: false, reason: `${bedId} 已是${ctx.nameOf(pid)}的床` };
    const old = t.beds.find((x) => x.owner === pid);
    if (old && !bedIdle(old.id)) return { ok: false, reason: `${ctx.nameOf(pid)}正在用 ${old.id}：不能換床` };
    if (b.owner && !bedIdle(bedId)) return { ok: false, reason: `${bedId} 正在用` };
    if (old) old.owner = null;
    const prev = b.owner; b.owner = pid;
    event(s.people[pid], 'assign', `玩家指派 ${bedId} 給${ctx.nameOf(pid)}${old ? `（解除 ${old.id}）` : ''}${prev ? `；原床主${ctx.nameOf(prev)}改為無床` : ''}`);
    return { ok: true, text: `${bedId} 床主：${ctx.nameOf(pid)}` };
  }
  function bedsView() {
    return t.beds.map((b) => ({ id: b.id, owner: b.owner, user: userOf(b.id), resv: resvOf(b.id), idle: bedIdle(b.id), open: t.site.stage === 'done' }));
  }
  function view(p) {
    const h = p.motion, id = p.id, st = t.site;
    const out = { want: !!t.want[id], active: active(p), mode: inSite(p) ? h.mode : null, leg: null, note: t.note[id], now: null, next: null, reason: reason(p),
      carrying: !!(st.bundle && st.bundle.by === id), bundle: st.bundle && st.bundle.by === id ? st.bundle.n : 0 };
    if (inSite(p)) out.leg = { a: h.a ?? 1, b: h.b ?? 1, u: uNow(h) };
    if (h.mode === 'toSite') { out.now = out.carrying ? `扛木 ${out.bundle} 去工地` : '走去寢舍工地'; out.next = out.carrying ? '到工地交料，接著施工' : '到工地施工'; }
    else if (h.mode === 'build') { out.now = `修寢舍 ${secs(st.work)}／${SITE.workMs / 1000} 秒（木 ${st.at}／${SITE.wood}）`; out.next = `每秒 −1 精力；精力 ≤ ${E.restAt} 先回去恢復，工時保留`; }
    else if (h.mode === 'fromSite') { out.now = out.carrying ? `帶木 ${out.bundle} 走回院倉` : '走回院中'; out.next = t.done[id] ? '回院中待命' : t.want[id] ? `先恢復到 ${E.backAt} 再回工地` : '回院中照新指令'; }
    else if (t.want[id]) { out.now = '待修寢舍'; out.next = h.mode === 'carry' ? '這趟交付後去工地' : p.rest === 'auto' ? `先恢復到 ${E.backAt}，再去工地` : '回到院中就去工地'; }
    return out;
  }
  function world() {
    const st = t.site;
    return { roomId: ROOM_ID, wood: t.wood, woodIn: t.woodIn, cap: WOOD.cap, avail: avail(), resv: st.resv, bundle: st.bundle ? { ...st.bundle } : null,
      site: { stage: st.stage, label: STAGE_LABEL[st.stage], at: st.at, need: SITE.wood, work: secs(st.work), workMs: SITE.workMs, k: Math.min(1, st.work / WORK), by: st.by },
      beds: bedsView(), delivered: { ...t.delivered }, events: t.events.map((e) => ({ ...e })), unsaved: true };
  }
  // 存檔 guard：人物正在新模式／新工作（含床上）時不呼叫原寫入，舊檔不被覆寫。其餘時候可存，但木料／工地／床不在檔內（明示）。
  function saveBlock() {
    for (const id of ids) {
      const p = s.people[id], h = p.motion;
      if (inSite(p) || t.want[id]) return '修寢舍中（含往返）：這段新活動不在存檔範圍，回到院中並結束後才能存；舊存檔未覆寫';
      if (p.job === 'wood' || p.pending === 'wood' || h.job === 'wood') return '目前工作是砍柴（新工作不在存檔格式內）：改派挑水或採藥後再存；舊存檔未覆寫';
      if (h.bed) return '有人在寢舍床位（含走去／起身）：床位不在存檔範圍，離床回院後才能存；舊存檔未覆寫';
    }
    return null;
  }
  return { WORK, store, reserveTrip, avail, deliverWood, order, cancelBy, gate, active, inSite, move, step, reason, bedFor, bedWhy, bedLen, assign, bedsView, view, world, saveBlock,
    snapshot: () => JSON.parse(JSON.stringify(t)), restoreSnap: (x) => { t = JSON.parse(JSON.stringify(x)); }, reset: () => { t = fresh(); },
    get state() { return t; }, events: () => t.events.map((e) => ({ ...e })) };
}
