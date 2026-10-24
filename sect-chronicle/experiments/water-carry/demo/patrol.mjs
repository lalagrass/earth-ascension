// SG-PATROL-01：一次巡山（PF1–PF4）的狀態邏輯。由 model.mjs 在權威 tick 呼叫；幾何只讀 patrol-layout.mjs，掌法常數只讀 palm.mjs。
// 全場唯一巡山名額（s.patrol）；同人與護院／整理／清鼠互斥。出發先交付原趟、必要恢復到 80、精力 ≥40 才從 HOME 出發。
// 沿 LEAD→MAIN 以 ≤40 短段走；每段前預留「本段＋從段尾沿真路返院＋8」。路標首次觀察 1 秒。看見（≤180）林鼠就在
// 離路上限內（離主路 ≤60、離離路點 ≤80、追擊 ≤3 遊戲秒，計時不重置）走近出掌；看見靠近中的野豬 ≤120 就走到 ≤60 喝止 1 秒。
// 返程一旦開始就鎖定，不再接戰；只有真到院才產生戰報、釋放名額，再照最新玩家意圖（不自動再巡）。
import { PALM, SKILLS, dist, stepToward, legs } from './palm.mjs';
import { LEAD, MAIN, WAYPOINTS, FOREST_RATS, PATROL, MAIN_AT, project, inForest } from './patrol-layout.mjs';

export const ROUTE = Object.freeze([...LEAD, ...MAIN.slice(1)]);
export const S0 = LEAD.length - 1;
export const PATROL_MODES = Object.freeze(['patrolGo', 'patrolObs', 'patrolWind', 'patrolRec', 'patrolShout', 'patrolBack']);
export const PATROL_LABEL = { patrolGo: '巡山前進', patrolObs: '路標觀察', patrolWind: '起手', patrolRec: '收勢', patrolShout: '喝止野豬', patrolBack: '巡山返院' };
export const PATROL_END = { end: '巡完 S3 林緣', budget: '精力只夠返程', threat: '近處威脅仍在（不追野豬）', player: '玩家召回／改令', shoutFail: '喝止未成立' };
export const PATROL_RESULT = { down: '擊倒', drove: '我驅離', escaped: '逃走', avoided: '避開', unhandled: '未處理' };
const RANK = { unhandled: 0, avoided: 1, escaped: 2, drove: 3, down: 4 };
const WP_AT = Object.fromEntries(WAYPOINTS.map((w) => [S0 + w.node, w]));
const pt = ([x, y]) => ({ x, y });
const ACT = ['patrolObs', 'patrolWind', 'patrolRec', 'patrolShout'];
export const freshForestRats = () => FOREST_RATS.map((r) => ({ id: r.id, kind: r.kind, x: r.x, y: r.y, mode: 'sniff', exit: 0, why: null }));
export const SUMMARY_KEEP = 12;

export function createPatrol(m) {
  const { s, rules, ids, walkSteps, Q, B } = m;
  const perTick = (perSec) => perSec / 60;
  const P = () => s.patrol;
  const active = (p) => !!s.patrol && s.patrol.by === p.id;
  const ratById = (id) => s.prats.find((r) => r.id === id);
  const validPrat = (r) => (r.mode === 'sniff' || r.mode === 'flee') && inForest(r.x, r.y);
  const log = (p, kind, extra = {}) => s.log.push({ tick: s.tick, person: p.id, kind: 'patrol:' + kind, ...extra });

  // 返程：（離路就先回離路點）→ 已走過的路節點逆序 → HOME；每段 ≤40，各段整數 tick 向上取整後加總。
  function homeNodes(pa) { const out = []; if (pa.off) out.push([pa.off.from.x, pa.off.from.y]); for (let i = pa.ri; i >= 0; i--) out.push(ROUTE[i]); return out; }
  function returnTicks(pos, pa, lvl = pa.lvl) { return legs(pos, homeNodes(pa)).reduce((n, q, i, a) => n + walkSteps(lvl, dist(i ? a[i - 1] : pos, q), rules), 0); }
  const walkCost = (ticks) => ticks * perTick(PATROL.walkPerSec);
  const returnCost = (pos, pa) => walkCost(returnTicks(pos, pa));
  // 段前預留：本段 + 段尾返程 + 8（8 只是保底，不扣）。
  function canWalk(p, to, pa, offAfter = pa.off) {
    const seg = walkCost(walkSteps(pa.lvl, dist(p.pos, to), rules)), ret = walkCost(returnTicks(to, { ...pa, off: offAfter }));
    return p.energy >= seg + ret + PATROL.reserve;
  }
  const canAct = (p, ticks, extra, pa) => p.energy >= extra + ticks * perTick(PATROL.actPerSec) + returnCost(p.pos, pa) + PATROL.reserve;

  function walk(p, mode, to, queue = []) {
    const from = { x: p.pos.x, y: p.pos.y };
    if (Math.abs(to.x - from.x) > 1e-9) p.cface = to.x < from.x ? -1 : 1;
    p.motion = { mode, job: null, phase: null, steps: 0, need: walkSteps(P().lvl, dist(from, to), rules), tripLevel: P().lvl, from, to, queue };
  }
  const act = (p, mode, need, extra = {}) => { p.motion = { mode, job: null, phase: null, steps: 0, need, tripLevel: P().lvl, ...extra }; };

  function mark(id, kind, res) {
    const pa = P(), cur = pa.seen[id];
    if (!cur || RANK[res] > RANK[cur.res]) pa.seen[id] = { kind, res };
  }
  // ---------- 派遣 ----------
  function reason(p) {
    const pa = P();
    if (active(p)) return pa.phase === 'back' ? '正在巡山返院：到院中才釋放名額' : '已在巡山（重送不重新出發）';
    if (pa) return `${m.nameOf(pa.by)}正在巡山（全場只一份）`;
    if (p.rest === 'manual') return '已停工：先下令開始工作再派巡山';
    if (p.pending === 'rest') return '已排定本趟後停工';
    if (p.guardOrder != null || m.GUARD_MODES.includes(p.motion.mode)) return '正在驅離野豬（含返院）：回院中後再派';
    if (p.fix || m.FIX_MODES.includes(p.motion.mode)) return '正在整理護欄（含返院）：回院中後再派';
    if (m.cleaning(p)) return '正在清理測試鼠（含返院）：回院中後再派';
    return '';
  }
  function order(p) {
    s.patrol = { by: p.id, phase: 'wait', src: 'manual', lvl: p.level, ri: 0, off: null, cancel: false, end: null, tick: s.tick,
      e0: p.energy, far: 0, obs: [], seen: {}, boarVisit: null, boarTry: null,
      t: { move: 0, obs: 0, fight: 0, back: 0 }, walked: 0, spent: 0 };
    log(p, 'order');
    const md = p.motion.mode;
    if (md === 'idle') { m.atHome(p); return { ok: true, text: P() && P().phase === 'wait' ? `精力 ${Math.floor(p.energy)}：先恢復到 ${rules.energy.backAt} 再去巡山` : '從院中出發，往西坡巡山一趟' }; }
    if (md === 'carry') return { ok: true, text: `本趟${m.jobLabel(p.motion.job)}交付後去巡山`, pending: true };
    if (md === 'toSeat' || md === 'seated') return { ok: true, text: `先恢復到 ${rules.energy.backAt}，回院中再去巡山` };
    return { ok: true, text: '回到院中就去巡山' };
  }
  // 院中端點：出發門檻 40；不足就走原座位恢復到 80（沿 LP-04），回院再出發。
  function atHome(p) {
    const pa = P();
    if (p.energy < PATROL.depart) { p.rest = 'auto'; p.why = `巡山出發需精力 ≥${PATROL.depart}，先恢復到 ${rules.energy.backAt}`; m.goSeat(p); return; }
    pa.phase = 'go'; pa.lvl = p.level; pa.e0 = p.energy; pa.tick = s.tick; pa.ri = 0; p.pos = pt(ROUTE[0]);
    p.why = '玩家派去巡山';
    log(p, 'depart', { energy: p.energy, level: pa.lvl });
    decide(p);
    if (p.motion.mode === 'patrolGo') p.motion.hold = s.tick;
  }
  // 召回／改令：前進中走完當前短段；觀察、喝止立刻返；起手中止（已扣不退）；收勢中保留結果後返。返程中拒絕。
  function cancel(p, why = 'player') {
    const pa = P();
    if (!pa || pa.by !== p.id || pa.phase === 'back') return false;
    log(p, 'cancel', { mode: p.motion.mode });
    if (pa.phase === 'wait') { s.patrol = null; return true; }
    pa.cancel = true;
    const md = p.motion.mode;
    if (md === 'patrolWind') log(p, 'windAbort', { target: p.motion.target });
    if (md !== 'patrolGo') goBack(p, why);
    return true;
  }
  // ---------- 決策（站在短段端點／動作結束時）----------
  function goBack(p, why) {
    const pa = P();
    pa.phase = 'back'; pa.end = pa.end || why; releaseBoar();
    for (const r of s.prats) if (dist(r, p.pos) <= PATROL.sense && !pa.seen[r.id] && r.mode === 'sniff') mark(r.id, r.kind, 'unhandled');
    log(p, 'back', { why: pa.end, energy: p.energy, need: returnCost(p.pos, pa) });
    const q = legs(p.pos, homeNodes(pa));
    pa.off = null;
    if (q.length) { const to = q.shift(); walk(p, 'patrolBack', to, q); } else arrive(p);
  }
  function releaseBoar() { const pa = P(); if (pa) pa.boarVisit = null; }
  const onMain = (pa) => pa.ri >= S0;
  // 野豬：唯一一隻、同一 visit；被察覺（可見且 ≤180）、靠近中（走出／嗅探／靠近／撞）、≤120 才算近威脅。
  function boarThreat(p) {
    const b = s.boar;
    if (!b.active || !['out', 'sniff', 'approach', 'prep'].includes(b.mode) || !m.boarAt) return null;
    const at = m.boarAt(b);
    if (!at.visible) return null;
    const d = dist(p.pos, at);
    return d <= PATROL.boarNear ? { at, d } : null;
  }
  function offOk(pa, to) {
    const from = pa.off ? pa.off.from : null;
    if (project(to.x, to.y).off > PATROL.offMain + 1e-9) return false;
    if (from && dist(from, to) > PATROL.offStart + 1e-9) return false;
    if (pa.off && pa.off.ticks >= PATROL.chaseTicks) return false;
    return true;
  }
  // 朝目標走一短段（離路）；回傳是否已出發。
  function offStep(p, pa, goal, target) {
    const to = stepToward(p.pos, goal, PALM.seg);
    const off = pa.off || { from: { x: p.pos.x, y: p.pos.y }, ri: pa.ri, ticks: 0, target };
    const from = off.from;
    // 整趟離路先看終點：站位離主路 >60 或離離路點 >80 就還不能去（沿主路繼續走，靠近後再看）。
    if (!pa.off && (project(goal.x, goal.y).off > PATROL.offMain + 1e-9 || dist(from, goal) > PATROL.offStart + 1e-9)) return 'far';
    if (project(to.x, to.y).off > PATROL.offMain + 1e-9 || dist(from, to) > PATROL.offStart + 1e-9 || off.ticks >= PATROL.chaseTicks) return 'limit';
    if (!canWalk(p, to, pa, off)) return 'budget';
    if (!pa.off) { pa.off = off; log(p, 'leave', { target, at: from }); }
    pa.off.target = target;
    walk(p, 'patrolGo', to);
    return 'go';
  }
  function decide(p) {
    const pa = P();
    if (pa.cancel) return goBack(p, 'player');
    if (onMain(pa)) {
      // 1) 野豬近威脅
      const th = boarThreat(p), b = s.boar;
      if (th) {
        const who = m.assignee();
        if ((who && who !== p.id) || pa.boarTry === b.visit) return goBack(p, 'threat');
        pa.boarVisit = b.visit; mark('boar', 'boar', 'unhandled');
        if (th.d <= PATROL.shoutRange) {
          const need = m.shoutSteps;
          if (!canAct(p, need, PALM.cost, pa)) return goBack(p, 'budget');
          p.energy -= PALM.cost; pa.spent += PALM.cost; pa.boarTry = b.visit;
          p.cface = th.at.x < p.pos.x ? -1 : 1;
          log(p, 'shout', { visit: b.visit, d: th.d });
          return act(p, 'patrolShout', need, { visit: b.visit });
        }
        const near = { x: th.at.x + (p.pos.x - th.at.x) * (PATROL.shoutRange - 5) / th.d, y: th.at.y + (p.pos.y - th.at.y) * (PATROL.shoutRange - 5) / th.d };
        const r = offStep(p, pa, near, 'boar');
        if (r === 'go') return;
        return goBack(p, r === 'budget' ? 'budget' : 'threat'); // 走不到 ≤60（離路上限）就不追豬，返院
      }
      // 2) 林鼠：看得見（≤180）、仍有效、未擊倒；最近者（距離打平用 ID）
      const cands = s.prats.filter((r) => validPrat(r) && dist(r, p.pos) <= PATROL.sense && !(pa.seen[r.id] && ['down', 'avoided'].includes(pa.seen[r.id].res)))
        .sort((a, c) => dist(a, p.pos) - dist(c, p.pos) || (a.id < c.id ? -1 : 1));
      for (const r of cands) {
        if (!pa.seen[r.id]) mark(r.id, r.kind, 'unhandled');
        if (dist(r, p.pos) <= PALM.reach) {
          const need = SKILLS[p.palm].windup + SKILLS[p.palm].recover;
          if (!canAct(p, need, PALM.cost, pa)) { mark(r.id, r.kind, 'avoided'); return goBack(p, 'budget'); }
          p.energy -= PALM.cost; pa.spent += PALM.cost;
          p.cface = r.x < p.pos.x ? -1 : 1;
          log(p, 'windup', { target: r.id, skill: p.palm });
          return act(p, 'patrolWind', SKILLS[p.palm].windup, { target: r.id });
        }
        const stand = { x: r.x + (p.pos.x >= r.x ? PALM.stand : -PALM.stand), y: r.y };
        const res = offStep(p, pa, stand, r.id);
        if (res === 'go') return;
        if (res === 'far') continue;
        mark(r.id, r.kind, 'avoided'); log(p, 'avoid', { target: r.id, why: res });
      }
    }
    // 3) 離路中沒有目標：回離路點
    if (pa.off) {
      const back = pa.off.from;
      if (dist(p.pos, back) > 1e-6) { walk(p, 'patrolGo', stepToward(p.pos, back, PALM.seg)); p.motion.rejoin = true; return; }
      pa.off = null;
    }
    // 4) 路標首次觀察 1 秒
    const at = ROUTE[pa.ri], wp = WP_AT[pa.ri];
    if (wp && !pa.obs.includes(wp.id) && dist(p.pos, pt(at)) < 1e-6) {
      if (!canAct(p, PATROL.observeTicks, 0, pa)) return goBack(p, 'budget');
      log(p, 'observe', { wp: wp.id });
      return act(p, 'patrolObs', PATROL.observeTicks, { wp: wp.id });
    }
    // 5) 主路盡頭
    if (pa.ri >= ROUTE.length - 1) return goBack(p, 'end');
    // 6) 下一短段
    const to = stepToward(p.pos, pt(ROUTE[pa.ri + 1]), PALM.seg);
    if (!canWalk(p, to, pa)) return goBack(p, 'budget');
    walk(p, 'patrolGo', to);
  }
  // ---------- 每 tick ----------
  function ratStep() {
    for (const r of s.prats) {
      const ex = FOREST_RATS.find((q) => q.id === r.id).exit;
      if ((r.mode !== 'flee' && r.mode !== 'gone') || r.exit >= ex.length) continue;
      let left = PALM.flee / 60;
      while (left > 0 && r.exit < ex.length) {
        const [tx, ty] = ex[r.exit], d = Math.hypot(tx - r.x, ty - r.y);
        if (d <= left) { r.x = tx; r.y = ty; left -= d; r.exit += 1; } else { r.x += (tx - r.x) * left / d; r.y += (ty - r.y) * left / d; left = 0; }
      }
      if (r.mode === 'flee' && !inForest(r.x, r.y)) { r.mode = 'gone'; s.log.push({ tick: s.tick, kind: 'prat:gone', rat: r.id }); if (P() && P().seen[r.id]) mark(r.id, r.kind, 'escaped'); }
    }
  }
  function flee(r, why) { r.mode = 'flee'; r.why = why; s.log.push({ tick: s.tick, kind: 'prat:flee', rat: r.id, why }); }
  function step() {
    ratStep();
    const pa = P();
    if (pa && pa.phase !== 'wait') {
      const p = s.people[pa.by], h = p.motion;
      if (h.hold === s.tick) { /* 本 tick 在院中受理，下一 tick 才走第一步 */ }
      else if (h.mode === 'patrolGo' || h.mode === 'patrolBack') {
        p.energy = Math.max(0, p.energy - perTick(PATROL.walkPerSec));
        pa.t.move += 1; if (h.mode === 'patrolBack') pa.t.back += 1;
        if (pa.off && pa.off.target != null && !h.rejoin) pa.off.ticks += 1;
        h.steps += 1;
        const k = Math.min(1, h.steps / h.need), px = p.pos.x, py = p.pos.y;
        p.pos = h.steps >= h.need ? { x: h.to.x, y: h.to.y } : { x: h.from.x + (h.to.x - h.from.x) * k, y: h.from.y + (h.to.y - h.from.y) * k };
        const dd = Math.hypot(p.pos.x - px, p.pos.y - py); p.walked += dd; pa.walked += dd;
        if (h.steps >= h.need) {
          if (h.mode === 'patrolBack') { if (h.queue.length) { const to = h.queue.shift(); walk(p, 'patrolBack', to, h.queue); } else arrive(p); }
          else {
            if (!pa.off && dist(p.pos, pt(ROUTE[pa.ri + 1] || ROUTE[pa.ri])) < 1e-6 && pa.ri < ROUTE.length - 1) pa.ri += 1;
            if (!pa.off && onMain(pa)) pa.far = Math.max(pa.far, project(p.pos.x, p.pos.y).d);
            if (pa.off && h.rejoin && dist(p.pos, pa.off.from) < 1e-6) pa.off = null;
            decide(p);
          }
        }
      } else if (ACT.includes(h.mode)) {
        p.energy = Math.max(0, p.energy - perTick(PATROL.actPerSec));
        if (h.mode === 'patrolObs') pa.t.obs += 1; else pa.t.fight += 1;
        h.steps += 1;
        if (h.steps >= h.need) {
          if (h.mode === 'patrolObs') { pa.obs.push(h.wp); decide(p); }
          else if (h.mode === 'patrolWind') contact(p);
          else if (h.mode === 'patrolRec') decide(p);
          else shoutDone(p);
        }
      }
    }
    // 林鼠察覺：任何人 ≤50 警覺鼠就逃（只按固定世界距離）。
    for (const r of s.prats) {
      if (r.kind !== 'alert' || r.mode !== 'sniff') continue;
      const who = ids.find((id) => { const at = m.personAt(s.people[id]); return at && dist(r, at) <= PALM.see; });
      if (who) flee(r, `察覺${m.nameOf(who)}逼近`);
    }
  }
  // 接觸 tick 重驗同一 ID；成立才擊倒一次，再傳同伴目擊。
  function contact(p) {
    const pa = P(), t = ratById(p.motion.target);
    if (t && validPrat(t) && dist(p.pos, t) <= PALM.reach) {
      t.mode = 'down'; t.why = `${m.nameOf(p.id)}巡山一掌擊倒`;
      mark(t.id, t.kind, 'down'); log(p, 'hit', { target: t.id });
      for (const r of s.prats) if (r.kind === 'alert' && r.mode === 'sniff' && dist(r, t) <= PALM.witness) flee(r, `同伴${t.id}受掌`);
      return act(p, 'patrolRec', SKILLS[p.palm].recover, { target: t.id });
    }
    log(p, 'miss', { target: p.motion.target });
    if (t && t.mode !== 'down') mark(t.id, t.kind, t.mode === 'gone' || t.mode === 'flee' ? 'escaped' : 'unhandled');
    decide(p);
  }
  // 喝止完成：重驗同一隻、同一 visit、仍靠近中、距離 ≤60；成立才沿既有 +80 威脅使其逃走。
  function shoutDone(p) {
    const pa = P(), b = s.boar, v = p.motion.visit, at = m.boarAt ? m.boarAt(b) : null;
    const ok = b.active && b.visit === v && pa.boarVisit === v && ['out', 'sniff', 'approach', 'prep'].includes(b.mode) && at && at.visible && dist(p.pos, at) <= PATROL.shoutRange + 1e-9;
    if (ok) {
      b.t = Math.min(B.max * Q, b.t + B.shoutThreat * Q);
      mark('boar', 'boar', 'drove'); log(p, 'shoutOk', { visit: v });
      m.boarFlee(`被${m.nameOf(p.id)}巡山喝止，害怕`);
      releaseBoar();
      return decide(p);
    }
    log(p, 'shoutFail', { visit: v });
    if (!b.active || b.visit !== v) mark('boar', 'boar', 'escaped');
    releaseBoar();
    goBack(p, 'shoutFail');
  }
  // 真到院：產生最近一份戰報、寫有界摘要、釋放名額，再照最新玩家意圖（atHome）。
  function arrive(p) {
    const pa = P();
    p.pos = pt(ROUTE[0]);
    if (s.boar.visit && pa.seen.boar && pa.seen.boar.res === 'unhandled' && !s.boar.active) mark('boar', 'boar', 'escaped');
    const rep = {
      by: p.id, startTick: pa.tick, endTick: s.tick, far: Math.round(pa.far * 10) / 10,
      obs: [...pa.obs], segs: WAYPOINTS.slice(1).filter((w) => pa.far >= MAIN_AT[w.node] - 1e-6).map((w, i) => `${WAYPOINTS[i].id}→${w.id}`),
      walked: Math.round(pa.walked * 10) / 10, t: { ...pa.t }, total: s.tick - pa.tick,
      seen: Object.entries(pa.seen).map(([id, v]) => ({ id, kind: v.kind, res: v.res })),
      end: pa.end, e0: pa.e0, e1: p.energy, spent: Math.round((pa.e0 - p.energy) * 100) / 100, home: true, palm: p.palm, lvl: pa.lvl,
    };
    s.patrolReport = rep;
    s.patrolLog.push({ by: p.id, tick: s.tick, far: rep.far, end: rep.end, down: rep.seen.filter((x) => x.res === 'down').length, drove: rep.seen.some((x) => x.res === 'drove') });
    while (s.patrolLog.length > SUMMARY_KEEP) s.patrolLog.shift();
    s.patrol = null;
    log(p, 'home', { far: rep.far, end: rep.end });
    if (p.why === '玩家派去巡山') p.why = null;
    p.motion = m.idle(p.level);
    m.atHomeLife(p);
  }
  function view(p) {
    const pa = active(p) ? P() : null;
    if (!pa) return null;
    const h = p.motion, wp = WAYPOINTS.find((w) => S0 + w.node > pa.ri) || WAYPOINTS.at(-1);
    return { phase: pa.phase, ri: pa.ri, next: wp.id, nextLabel: wp.label, far: pa.far, off: !!pa.off, target: pa.off ? pa.off.target : h.target || null,
      returnNeed: pa.phase === 'wait' ? null : Math.round(returnCost(p.pos, pa) * 100) / 100, end: pa.end, cancel: pa.cancel, obs: [...pa.obs] };
  }
  return { active, reason, order, atHome, cancel, step, view, returnCost, returnTicks, homeNodes, validPrat };
}
