// 單一權威模擬核心：純 JS、無 DOM，可在 Node 測試。
import { TRAITS, THOUGHTS, NEED_MOOD, MOOD, WORK_ACTS, LEISURE_ACTS, REP, RECRUIT, RECRUIT_POOL, ECO, HABITAT, POSTS, RAID_EVERY, HUNT_WAVES, WAVE_GAP, DAY, PHASES, SCHEDULE, PLOT_GROW, HARVEST, NODES, EDGES, FACILITIES, ACTIVITIES, MOVES, MONSTERS, WAVES, DISCIPLES, REL_STAGES, BASE_SPEED } from './data.mjs';

export const SAVE_VERSION = 1;
const clone = (o) => JSON.parse(JSON.stringify(o));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- 路網 ----
const ADJ = {};
for (const [a, b] of EDGES) { const w = dist(NODES[a], NODES[b]); (ADJ[a] ||= []).push([b, w]); (ADJ[b] ||= []).push([a, w]); }
export function route(from, to) {
  const D = { [from]: 0 }, P = {}, Q = new Set(Object.keys(NODES));
  while (Q.size) {
    let u = null; for (const q of Q) if (D[q] !== undefined && (u === null || D[q] < D[u])) u = q;
    if (u === null || u === to) break; Q.delete(u);
    for (const [v, w] of ADJ[u] || []) if (Q.has(v) && (D[v] === undefined || D[u] + w < D[v])) { D[v] = D[u] + w; P[v] = u; }
  }
  const path = [to]; while (path[0] !== from) { const p = P[path[0]]; if (!p) return [from]; path.unshift(p); }
  return path;
}
export const routeLength = (a, b) => { const p = route(a, b); let L = 0; for (let i = 1; i < p.length; i++) L += dist(NODES[p[i - 1]], NODES[p[i]]); return L; };

export const facDef = (id) => FACILITIES.find((f) => f.id === id);
export const facStage = (s, id) => facDef(id).stages[s.fac[id].stage];
export const relKey = (a, b) => [a, b].sort().join('|');
export const relStage = (v) => { let n = REL_STAGES[0][1]; for (const [t, name] of REL_STAGES) if (v >= t) n = name; return n; };

export function createState(seed = 1) {
  const s = {
    v: SAVE_VERSION, seed, t: 0, res: { wood: 0, food: 6, herb: 0, veg: 0 }, plots: Array.from({ length: 4 }, () => ({ st: 'empty', g: 0 })), vegRes: 0, cap: { wood: 12 },
    fac: Object.fromEntries(FACILITIES.map((f) => [f.id, { stage: 0, site: null }])),
    ds: DISCIPLES.map((d, i) => mkDisciple(d, i)),
    rel: {}, families: [], eco: Object.fromEntries(Object.entries(ECO).map(([k, e]) => [k, { n: e.start, timer: 0 }])), wild: [], post: 'guard', raidT: 0, rep: 0, log: [], hunt: null, mons: [], fx: [], rngN: 0,
  };
  for (let i = 0; i < s.ds.length; i++) for (let j = i + 1; j < s.ds.length; j++) s.rel[relKey(s.ds[i].id, s.ds[j].id)] = 10;
  log(s, '師徒三人來到山腳一間破道館。');
  return s;
}
function mkDisciple(d, i, at = 'court') {
  return ({
      id: d.id, name: d.name, style: d.style, personality: [...(d.personality || [])], mood: MOOD.base, thoughts: [], adult: d.adult, sprite: d.sprite, traits: d.traits,
      skills: { ...d.skills }, moves: ['fist'], pendingMove: null,
      needs: { energy: 80, hunger: 70 - i * 10, social: 50 }, hp: 100,
      at, pos: [...NODES[at]].map((v, k) => v + (k ? 0 : (i - 1) * 16)), path: [],
      task: null, order: null, reason: at === 'gate' ? '慕名上山' : '剛到道館', carry: null, cool: 0, walked: 0, face: 1, anim: null,
    });
}
// ---- v0.6 性格與心情 ----
export function think(s, d, id, extra = '') {
  const T = THOUGHTS[id]; if (!T) return;
  let v = T.v; for (const p of d.personality || []) { const m = TRAITS[p]?.thoughtMul; if (m?.[T.tag]) v *= m[T.tag]; if (m?.bad && v < 0 && T.tag !== 'bad') v *= 1; }
  const ex = d.thoughts.find((x) => x.id === id);
  if (ex) { ex.left = T.ttl; ex.v = Math.round(v); } else d.thoughts.push({ id, text: T.text + extra, v: Math.round(v), left: T.ttl });
}
export function moodTarget(d) {
  let t = MOOD.base;
  for (const p of d.personality || []) t += TRAITS[p]?.moodBase || 0;
  for (const th of d.thoughts) t += th.v;
  for (const [k, [thr, v, tag]] of Object.entries(NEED_MOOD)) if (d.needs[k] < thr) { let x = v; for (const p of d.personality || []) { const m = TRAITS[p]?.thoughtMul; if (m?.[tag]) x *= m[tag]; } t += x; }
  return clamp(t, 0, 100);
}
function moodStep(d, dt) {
  for (const th of d.thoughts) th.left -= dt; d.thoughts = d.thoughts.filter((x) => x.left > 0);
  const tgt = moodTarget(d), diff = tgt - d.mood; d.mood = clamp(d.mood + clamp(diff, -MOOD.down * dt, MOOD.up * dt), 0, 100);
}
export function traitMul(d, act) { let m = 1; for (const p of d.personality || []) m *= TRAITS[p]?.mods?.[act] || 1; return m; }
export function moodMul(d, act) {
  if (d.mood < MOOD.low) return WORK_ACTS.includes(act) ? 0.6 : LEISURE_ACTS.includes(act) ? 1.35 : 1;
  if (d.mood > MOOD.high) return WORK_ACTS.includes(act) ? 1.15 : 1;
  return 1;
}
export const focusMul = (d) => 0.8 + 0.4 * (d.mood / 100); // DF focus：心情影響成長 0.8–1.2
export const moodLabel = (m) => (m < 15 ? '崩潰邊緣' : m < MOOD.low ? '低落' : m < MOOD.high ? '平穩' : m < 90 ? '愉快' : '意氣風發');

// ---- v0.5 名聲、床位、招收、母版階段 ----
export function capacity(s) { return FACILITIES.reduce((a, f) => a + (facStage(s, f.id).beds || 0), 0); }
export function recruitNeed(s) { return RECRUIT.baseRep + RECRUIT.stepRep * (s.ds.length - 3); }
export function canRecruit(s) {
  const next = RECRUIT_POOL.find((p) => !s.ds.some((d) => d.id === p.id));
  if (!next) return { ok: false, why: '暫無人選' };
  if (s.ds.length >= capacity(s)) return { ok: false, why: `床位已滿（${s.ds.length}/${capacity(s)}），先擴建宿舍` };
  if (s.rep < recruitNeed(s)) return { ok: false, why: `名聲不足（${s.rep}/${recruitNeed(s)}）` };
  if (s.res.food < RECRUIT.food) return { ok: false, why: `存糧不足 ${RECRUIT.food}` };
  return { ok: true, next };
}
export function recruit(s) {
  const c = canRecruit(s); if (!c.ok) return c;
  s.res.food -= RECRUIT.food; const d = mkDisciple(c.next, 1, 'gate'); s.ds.push(d);
  for (const o of s.ds) if (o !== d) s.rel[relKey(o.id, d.id)] = 5;
  log(s, `${d.name}慕名從村路上山，拜入門下。`); return { ok: true, d };
}
export function mapStage(s) {
  if (s.fac.hall.stage >= 1 && s.fac.yard.stage >= 1) return 'S2';
  if (s.fac.dorm.stage >= 1 && s.fac.kitchen.stage >= 1) return 'S1';
  return 'S0';
}
function rand(s) { const r = rng(s.seed * 7919 + s.rngN++); return r(); }
export function phaseOf(s) { const f = (s.t % DAY) / DAY; let p = PHASES[0]; for (const x of PHASES) if (f >= x[0]) p = x; return { id: p[1], name: p[2], day: Math.floor(s.t / DAY) + 1, frac: f }; }
export function log(s, msg) { s.log.unshift({ t: Math.floor(s.t), msg }); if (s.log.length > 60) s.log.pop(); }

// ---- 建造 ----
export function startBuild(s, id) {
  const f = facDef(id), st = s.fac[id], next = f.stages[st.stage + 1];
  if (!next || st.site) return false;
  if (next.rep && (s.rep || 0) < next.rep) return false;
  st.site = { need: { ...next.cost }, delivered: 0, reserved: 0, work: 0, workNeed: next.work };
  log(s, `開工：${f.name} → ${next.name}（需木 ${next.cost.wood}、工時 ${next.work}s）`);
  return true;
}
function finishBuild(s, id) {
  const f = facDef(id), st = s.fac[id]; st.stage++; st.site = null; s.rep = (s.rep || 0) + REP.build;
  log(s, `完工：${f.name}成了「${f.stages[st.stage].name}」，解鎖：${f.stages[st.stage].offers.map((a) => ACTIVITIES[a].name).join('、')}`);
}
const siteOf = (s) => { const e = Object.entries(s.fac).find(([, v]) => v.site); return e ? [e[0], e[1].site] : null; };

// ---- 指令 ----
export function setStyle(s, id, st) { const d = s.ds.find((x) => x.id === id); if (d && (st === 'palm' || st === 'leg')) d.style = st; }
export function setOrder(s, id, order) {
  const d = s.ds.find((x) => x.id === id); if (!d) return false;
  if (order && order !== 'hunt' && !ACTIVITIES[order]) return false;
  d.order = order || null; cancelTask(s, d, '玩家改派');
  return true;
}
function cancelTask(s, d, why) {
  const t = d.task; if (!t) return;
  if (t.act === 'build' && d.carry?.wood) { const site = s.fac[t.fac].site; if (site) site.reserved -= d.carry.wood; s.res.wood += d.carry.wood; d.carry = null; }
  else if (t.act === 'build' && t.reservedWood) { const site = s.fac[t.fac].site; if (site) site.reserved -= t.reservedWood; }
  if (t.act === 'cook' && t.phase !== 'done') s.vegRes -= 2;
  if (t.act === 'farm' && t.plot >= 0 && s.plots[t.plot]?.busy === d.id) s.plots[t.plot].busy = null;
  if (t.partner) { const p = s.ds.find((x) => x.id === t.partner); if (p?.task?.partner === d.id) { p.task = null; p.path = []; } }
  d.task = null; d.path = []; d.anim = null; d.reason = why;
}

// ---- 效用 AI ----
// 可被邀聊：無玩家指派、未負重、未在施工/狩獵/歇息/聊天中
function chatMates(s, d) { return s.ds.filter((o) => o !== d && !o.order && o.hp > 30 && !o.carry && !['build', 'hunt', 'rest', 'chat', 'spar', 'learn'].includes(o.task?.act) && o.task?.phase !== 'return'); }
function offered(s, act) { return FACILITIES.filter((f) => facStage(s, f.id).offers.includes(act)); }
function bestFac(s, d, act) {
  const fs = offered(s, act); if (!fs.length) return null;
  if (act === 'rest') {
    fs.sort((a, b) => (facStage(s, b.id).restRate || 0) - (facStage(s, a.id).restRate || 0));
    const used = (id) => s.ds.filter((o) => o !== d && o.task?.act === 'rest' && o.task.fac === id).length;
    return fs.find((f) => used(f.id) < (facStage(s, f.id).beds || 1)) || fs[fs.length - 1];
  }
  return fs[0];
}
export function scoreActs(s, d) {
  const n = d.needs, tr = d.traits, out = [];
  const add = (act, score, why) => { if (score > 0) out.push({ act, score, why }); };
  add('rest', n.energy < 30 ? 100 : (100 - n.energy) * 0.7, n.energy < 30 ? '精力見底，先歇' : '有點累');
  if (s.res.food > 0) add('eat', n.hunger < 30 ? 95 : (100 - n.hunger) * 0.6, n.hunger < 30 ? '餓了' : '順便吃點');
  const others = chatMates(s, d);
  if (others.length) add('chat', (100 - n.social) * 0.6 * (tr.social || 1) * (tr.playful || 1) * 0.8, '想找人說話');
  if (d.pendingMove) add('learn', 80, `師父能傳「${MOVES.find((m) => m.id === d.pendingMove).name}」`);
  add('train', (d.adult ? 40 : 18) * (tr.diligent || 1), '練功變強');
  if (facStage(s, 'yard').offers.includes('spar') && n.energy > 45 && chatMates(s, d).some((o) => o.needs.energy > 45)) add('spar', 34 * (tr.diligent || 1), '找人切磋');
  const wood = s.res.wood + s.ds.reduce((a, o) => a + (o.task?.act === 'chop' ? 1 : 0), 0);
  if (wood < s.cap.wood) add('chop', siteOf(s) ? 50 : 28, siteOf(s) ? '工地缺木' : '備柴');
  add('farm', s.plots.some((p) => p.st === 'ripe') ? 50 : 30, s.plots.some((p) => p.st === 'ripe') ? '菜熟了' : '菜畦空著該播種');
  add('forage', 18 * (tr.playful || 1), '採藥');
  const site = siteOf(s);
  if (site) { const v = site[1]; const missing = v.need.wood - v.delivered - v.reserved; if ((missing > 0 && s.res.wood > 0) || (missing <= 0 && v.delivered >= v.need.wood)) add('build', 55 * (d.adult ? 1 : 0.6), '去工地幫忙'); }
  const ph = phaseOf(s).id, sch = SCHEDULE[ph] || {};
  if (ph === 'night' && n.energy < 95) add('rest', 60, '入夜歇息');
  const plotWork = s.plots.some((p) => p.st === 'empty' || p.st === 'ripe');
  const cookable = s.res.veg - s.vegRes >= 2 && s.res.food < 10;
  if (cookable) add('cook', 30 + (10 - s.res.food) * 4, '灶上該煮飯了');
  for (const o of out) { o.score *= (sch[o.act] || 1) * traitMul(d, o.act) * moodMul(d, o.act); o.score += rand(s) * 8; } // 作息×性格×心情＋雜訊
  for (let i = out.length - 1; i >= 0; i--) if (out[i].act === 'farm' && !plotWork) out.splice(i, 1);
  return out.sort((a, b) => b.score - a.score);
}

function assign(s, d, act, why) {
  if (act === 'hunt') { const post = s.hunt?.post || s.post; d.task = { act: 'hunt', node: post, phase: 'go' }; goto(d, post); d.reason = why || '後山守點'; return true; }
  if (act === 'build') {
    const site = siteOf(s); if (!site) return false; const [fid, v] = site;
    const missing = v.need.wood - v.delivered - v.reserved;
    if (missing > 0) { const take = Math.min(2, missing, s.res.wood); if (take <= 0) return false; v.reserved += take; d.task = { act, fac: fid, phase: 'fetch', reservedWood: take, node: 'court' }; goto(d, 'court'); }
    else if (v.delivered >= v.need.wood) { d.task = { act, fac: fid, phase: 'go', node: facDef(fid).node }; goto(d, facDef(fid).node); }
    else return false;
    d.reason = why; return true;
  }
  if (act === 'chat' || act === 'spar') {
    const p = chatMates(s, d).sort((a, b) => (s.rel[relKey(b.id, d.id)] || 0) - (s.rel[relKey(a.id, d.id)] || 0))[0];
    if (!p) return false;
    if (p.task) cancelTask(s, p, `被${d.name}拉去${act === 'spar' ? '切磋' : '聊天'}`);
    const node = act === 'spar' ? 'yard' : 'court'; d.task = { act, fac: 'yard', node, phase: 'go', partner: p.id }; p.task = { act, fac: 'yard', node, phase: 'go', partner: d.id };
    goto(d, node); goto(p, node); d.reason = why; p.reason = act === 'spar' ? `${d.name}邀來切磋` : `${d.name}找來聊天`; return true;
  }
  if (act === 'eat' && s.res.food <= 0) return false;
  if (act === 'cook') { if (s.res.veg - s.vegRes < 2) return false; s.vegRes += 2; }
  if (act === 'farm') { const i = s.plots.findIndex((p) => (p.st === 'ripe' || p.st === 'empty') && !p.busy); if (i < 0) return false; s.plots[i].busy = d.id; }
  const f = bestFac(s, d, act); if (!f) return false;
  d.task = { act, fac: f.id, node: f.node, phase: 'go', plot: act === 'farm' ? s.plots.findIndex((p) => p.busy === d.id) : undefined }; goto(d, f.node); d.reason = why; return true;
}
function goto(d, node) { const p = route(d.at, node); d.path = p.slice(1).map((n) => ({ n, xy: NODES[n] })); if (!d.path.length) d.path = [{ n: node, xy: NODES[node] }]; }

function decide(s, d) {
  if (d.carry) { d.task = { act: 'deliver', phase: 'return', node: 'court', walkStart: d.walked }; goto(d, 'court'); d.reason = '先把東西送回院倉'; return true; }
  if (d.order) {
    const o = d.order; if (o !== 'hunt' && (d.needs.energy < 15 || (o !== 'eat' && d.needs.hunger < 10 && s.res.food > 0))) return assign(s, d, d.needs.energy < 15 ? 'rest' : 'eat', '指派中先自理');
    if (assign(s, d, o, '玩家指派')) return true;
    d.reason = `指派「${o === 'hunt' ? '狩獵' : ACTIVITIES[o].name}」暫不可行`; return false;
  }
  for (const c of scoreActs(s, d)) if (assign(s, d, c.act, c.why)) return true;
  return false;
}

export function speedOf(d) { return BASE_SPEED * (1 + d.skills.agility / 100) * (d.carry ? 0.7 : 1) * (d.needs.energy < 30 ? 0.8 : 1); }

function moveStep(d, dt) {
  let left = speedOf(d) * dt;
  while (left > 0 && d.path.length) {
    const tgt = d.path[0].xy, L = dist(d.pos, tgt);
    if (L <= left) { d.pos = [...tgt]; d.at = d.path[0].n; d.path.shift(); left -= L; d.walked += L; }
    else { d.face = tgt[0] >= d.pos[0] ? 1 : -1; d.pos[0] += (tgt[0] - d.pos[0]) * left / L; d.pos[1] += (tgt[1] - d.pos[1]) * left / L; d.walked += left; left = 0; }
  }
  d.skills.agility = Math.min(100, d.skills.agility + 0); // 腳力成長於交付時結算
}

function grow(s, d, sk, amt) {
  if (sk === 'style') sk = d.style;
  const before = d.skills[sk]; d.skills[sk] = Math.min(100, before + amt * (d.traits.diligent || 1) * 0.3 * (1 - before / 130) * focusMul(d));
  for (const m of MOVES) if (m.skill === sk && !d.moves.includes(m.id) && d.skills[sk] >= m.req && d.pendingMove !== m.id && !d.pendingMove) { d.pendingMove = m.id; log(s, `${d.name}${sk === 'palm' ? '掌法' : '腿法'}到了火候，可向師父求學「${m.name}」`); }
}

function relAdd(s, a, b, amt) {
  const k = relKey(a.id, b.id), before = s.rel[k] || 0;
  let v = before + amt; if (!(a.adult && b.adult)) v = Math.min(v, 89); // 未成年不進道侶
  s.rel[k] = clamp(v, 0, 100);
  if (relStage(before) !== relStage(s.rel[k])) {
    log(s, `${a.name}與${b.name}成了「${relStage(s.rel[k])}」`);
    if (s.rel[k] >= 90 && !s.families.includes(k)) { s.families.push(k); log(s, `${a.name}與${b.name}結為道侶，門中多了一個家。`); }
  }
}

function doTask(s, d, dt) {
  const t = d.task, A = ACTIVITIES[t.act];
  if (t.act === 'hunt') return;
  if (t.phase === 'fetch' && !d.path.length) { // 建造取料
    const site = s.fac[t.fac].site; s.res.wood -= t.reservedWood; d.carry = { wood: t.reservedWood }; t.reservedWood = 0;
    t.phase = 'deliver'; goto(d, facDef(t.fac).node); return;
  }
  if (t.phase === 'deliver' && !d.path.length) {
    const site = s.fac[t.fac].site; site.reserved -= d.carry.wood; site.delivered += d.carry.wood; log(s, `${d.name}送 ${d.carry.wood} 木到工地（${site.delivered}/${site.need.wood}）`); d.carry = null; d.task = null; return;
  }
  if (t.phase === 'go' && !d.path.length) {
  if (t.partner) { const p = s.ds.find((x) => x.id === t.partner); if (!p || p.task?.partner !== d.id) { d.task = null; return; } if (p.path.length) return; }
    t.phase = 'do'; t.timer = 0; d.anim = t.act;
  }
  if (t.phase === 'do') {
    if (t.act === 'build') { const site = s.fac[t.fac].site; if (!site) { d.task = null; d.anim = null; return; } }
    t.timer += dt;
    if (t.act === 'spar' && t.partner && Math.floor(t.timer / 1.2) !== Math.floor((t.timer - dt) / 1.2)) { const p = s.ds.find((x) => x.id === t.partner); const mv = MOVES.find((m) => m.id === d.moves[d.moves.length - 1]); s.fx.push({ kind: 'move', name: mv.name, color: mv.color, from: [...d.pos], to: [...p.pos], r: 12, ttl: 0.6 }); d.face = p.pos[0] >= d.pos[0] ? 1 : -1; d.anim = 'strike'; }
    if (A.energy) d.needs.energy = clamp(d.needs.energy + A.energy * dt / A.dur, 0, 100);
    if (t.act === 'rest') { const rate = facStage(s, t.fac).restRate || 3; if (t.timer < dt * 1.5) think(s, d, t.fac === 'hall' && s.fac.hall.stage === 0 ? 'floorSleep' : 'bedSleep'); d.needs.energy = clamp(d.needs.energy + rate * dt, 0, 100); d.hp = clamp(d.hp + 3 * dt, 0, 100); const night = phaseOf(s).id === 'night' && !s.hunt?.team.includes(d.id); if (!night && (d.needs.energy >= 100 || (d.order !== 'rest' && d.needs.energy >= 80 && t.timer > 4))) finish(s, d); return; }
    if (t.act === 'build') { const site = s.fac[t.fac].site; site.work += dt; d.needs.energy = clamp(d.needs.energy - dt, 0, 100); grow(s, d, 'strength', 0.2 * dt); if (site.work >= site.workNeed) { finishBuild(s, t.fac); finish(s, d); } else if (t.timer >= A.dur) finish(s, d); return; }
    const dur = t.act === 'cook' ? facStage(s, t.fac).cookDur : t.act === 'learn' ? facStage(s, 'hall').learnDur : A.dur;
    if (t.timer >= dur) {
      if (t.act === 'cook') { const st = facStage(s, t.fac); s.res.veg -= 2; s.vegRes -= 2; t.phase = 'done'; s.res.food += st.cookYield; log(s, `${d.name}在${st.name}煮好 ${st.cookYield} 份飯`); grow(s, d, 'cooking', 6); finish(s, d); return; }
      if (t.act === 'farm') { const p = s.plots[t.plot]; p.busy = null; grow(s, d, 'farming', 6); if (p.st === 'ripe') { p.st = 'empty'; p.g = 0; d.carry = { veg: HARVEST }; t.phase = 'return'; d.anim = null; goto(d, 'court'); t.walkStart = d.walked; return; } p.st = 'grow'; p.g = 0; finish(s, d); return; }
      if (A.use) { if (s.res.food < 1) { d.task = null; d.anim = null; d.reason = '沒糧了'; return; } s.res.food -= 1; }
      if (A.need?.hunger) { const b = facStage(s, t.fac).mealBonus || 0; d.needs.hunger = clamp(d.needs.hunger + A.need.hunger + b, 0, 100); if (b) { d.needs.social = clamp(d.needs.social + b / 2, 0, 100); think(s, d, 'hallMeal'); } }
      if (A.skill) for (const [k, v] of Object.entries(A.skill)) grow(s, d, k, v * (t.act === 'train' || t.act === 'spar' ? facStage(s, 'yard').trainMul : 1));
      if (t.act === 'spar' && t.partner) { const p = s.ds.find((x) => x.id === t.partner); if (d.id < p.id) { relAdd(s, d, p, 2); log(s, `${d.name}與${p.name}在木樁場切磋`); } }
      if (A.social) d.needs.social = clamp(d.needs.social + A.social, 0, 100);
      if (t.act === 'learn' && d.pendingMove) { const m = MOVES.find((x) => x.id === d.pendingMove); d.moves.push(m.id); d.pendingMove = null; s.rep = (s.rep || 0) + REP.learn; log(s, `師父傳授${d.name}「${m.name}」！`); think(s, d, 'learned'); }
      if (t.act === 'chat' && t.partner) { const p = s.ds.find((x) => x.id === t.partner); if (d.id < p.id) relAdd(s, d, p, 4 * Math.max(d.traits.social || 1, p.traits.social || 1)); think(s, d, 'goodChat', `（${p.name}）`); }
      if (A.carry) { d.carry = { ...A.carry }; t.phase = 'return'; d.anim = null; goto(d, 'court'); t.walkStart = d.walked; return; }
      finish(s, d);
    }
  }
  if (t.phase === 'return' && !d.path.length) {
    for (const [k, v] of Object.entries(d.carry)) { s.res[k] = Math.min(s.cap[k] ?? 99, s.res[k] + v); }
    const walk = d.walked - (t.walkStart || 0); d.skills.agility = Math.min(100, d.skills.agility + walk / 400); // 負重長路→腳力
    d.carry = null; finish(s, d);
  }
}
function finish(s, d) { d.task = null; d.anim = null; }

// ---- 狩獵（同圖塔防波次，v0.4 接生態） ----
export function setPost(s, node) { if (POSTS[node] && !s.hunt) { s.post = node; return true; } return false; }
export function startHunt(s, ids, waves = HUNT_WAVES) {
  if (s.hunt) return false;
  const team = s.ds.filter((d) => ids.includes(d.id) && d.hp > 30); if (!team.length) return false;
  s.hunt = { wave: 0, waves, gap: 0, t: 0, kills: 0, escaped: 0, hits: {}, team: team.map((d) => d.id), post: s.post, perWave: [] };
  for (const d of team) { d.order = 'hunt'; cancelTask(s, d, '奉命上後山'); }
  log(s, `${team.map((d) => d.name).join('、')}上山，守在「${POSTS[s.post]}」，預計 ${waves} 波。`);
  return true;
}
const MON_PATH = route('den', 'yard');
function spawnWave(s) {
  const h = s.hunt, i = h.wave, list = [];
  const nr = Math.min(s.eco.rat.n, 2 + i), nb = i === h.waves - 1 ? Math.min(1, s.eco.boar.n) : 0;
  for (let k = 0; k < nr; k++) list.push({ k: 'rat', t: k * 1.5 }); for (let k = 0; k < nb; k++) list.push({ k: 'boar', t: nr * 1.5 + 1 });
  s.eco.rat.n -= nr; s.eco.boar.n -= nb; h.queue = list; h.wt = 0; h.perWave.push({ rat: nr, boar: nb });
  removeWild(s, 'rat', nr); removeWild(s, 'boar', nb);
  log(s, list.length ? `第 ${i + 1} 波：山鼠 ${nr}${nb ? '、野豬 ' + nb : ''}` : `第 ${i + 1} 波：山裡沒有獸出來`);
}
function huntStep(s, dt) {
  const h = s.hunt; if (!h) return;
  const team = s.ds.filter((d) => h.team.includes(d.id));
  if (!h.started) { if (!team.every((d) => d.at === h.post || d.hp <= 25)) return; h.started = true; spawnWave(s); }
  h.t += dt; h.wt += dt;
  while (h.queue.length && h.queue[0].t <= h.wt) { const q = h.queue.shift(), M = MONSTERS[q.k]; s.mons.push({ uid: `${q.k}${s.rngN++}`, k: q.k, hp: M.hp, max: M.hp, pos: [...NODES.den], path: MON_PATH.slice(1), cool: 0 }); }
  for (const m of s.mons) {
    if (m.raid) continue;
    const M = MONSTERS[m.k];
    const foe = team.filter((d) => d.hp > 25).sort((a, b) => dist(a.pos, m.pos) - dist(b.pos, m.pos))[0];
    m.cool -= dt;
    if (foe && dist(foe.pos, m.pos) < 26) { if (m.cool <= 0) { foe.hp -= M.dmg; m.cool = 1.2; s.fx.push({ kind: 'bite', pos: [...foe.pos], ttl: 0.4 }); } continue; }
    if (monWalk(m, M.speed * dt)) { m.gone = true; h.escaped++; s.eco[m.k].n++; log(s, `${M.name}衝過守點逃回山裡`); }
  }
  for (const d of team) {
    if (d.hp <= 25) { if (d.task?.act === 'hunt') { d.order = null; cancelTask(s, d, '傷重退回院中'); assign(s, d, 'rest', '傷重歇息'); log(s, `${d.name}受傷退下`); think(s, d, 'hurt'); } continue; }
    if (d.at !== h.post || d.path.length) continue;
    d.cool -= dt; if (d.cool > 0) continue;
    const ms = d.moves.map((id) => MOVES.find((m) => m.id === id)).sort((a, b) => b.dmg * (1 + (b.aoe ? 1 : 0)) - a.dmg * (1 + (a.aoe ? 1 : 0)));
    const live = s.mons.filter((m) => !m.gone && m.hp > 0 && !m.raid);
    for (const mv of ms) {
      const lv = d.skills[mv.skill]; const reach = mv.range * (1 + lv / 200);
      const tgt = live.filter((m) => dist(m.pos, d.pos) <= reach).sort((a, b) => a.hp - b.hp)[0]; if (!tgt) continue;
      const power = mv.dmg * (1 + lv / 50);
      const hitList = mv.aoe ? live.filter((m) => dist(m.pos, tgt.pos) <= mv.aoe) : [tgt];
      for (const m of hitList) { m.hp -= power; if (m.hp <= 0 && !m.gone) { m.gone = true; h.kills++; log(s, `${d.name}以「${mv.name}」擊退${MONSTERS[m.k].name}`); if (m.k === 'boar') s.res.food += 3; } }
      h.hits[d.id] = (h.hits[d.id] || 0) + 1; grow(s, d, mv.skill, 1.5);
      d.cool = mv.cd; d.face = tgt.pos[0] >= d.pos[0] ? 1 : -1; d.anim = 'strike';
      s.fx.push({ kind: 'move', name: mv.name, color: mv.color, from: [...d.pos], to: [...tgt.pos], r: mv.aoe || 16, ttl: 0.6 });
      d.needs.energy = clamp(d.needs.energy - 1, 0, 100);
      break;
    }
  }
  s.mons = s.mons.filter((m) => !m.gone);
  const waveClear = !h.queue.length && !s.mons.some((m) => !m.raid);
  const anyFit = team.some((d) => d.hp > 25);
  if (waveClear) { h.gap += dt; if (h.gap >= WAVE_GAP && h.wave + 1 < h.waves && anyFit && (s.eco.rat.n + s.eco.boar.n) > 0) { h.wave++; h.gap = 0; spawnWave(s); } }
  if ((waveClear && (h.wave + 1 >= h.waves || !anyFit || s.eco.rat.n + s.eco.boar.n === 0) && h.gap >= 1) || (!anyFit && waveClear)) {
    const rep = `狩獵戰報（${POSTS[h.post]}，${h.wave + 1} 波）：擊退 ${h.kills}、溜走 ${h.escaped}；` + team.map((d) => `${d.name}出手 ${h.hits[d.id] || 0} 次`).join('，') + `｜山中尚餘 鼠${s.eco.rat.n} 豬${s.eco.boar.n}`;
    log(s, rep); s.lastReport = rep; if (h.kills > h.escaped) for (const d of team) if (d.hp > 25) think(s, d, 'wonHunt'); s.rep = (s.rep || 0) + h.kills;
    for (const d of team) { if (d.order === 'hunt') d.order = null; if (d.task?.act === 'hunt') { d.task = null; d.anim = null; } d.reason = '狩獵結束回院'; }
    s.hunt = null;
  }
}
function monWalk(m, step) {
  while (step > 0 && m.path.length) { const tgt = NODES[m.path[0]], L = dist(m.pos, tgt);
    if (L <= step) { m.pos = [...tgt]; m.path.shift(); step -= L; } else { m.pos[0] += (tgt[0] - m.pos[0]) * step / L; m.pos[1] += (tgt[1] - m.pos[1]) * step / L; step = 0; } }
  return !m.path.length;
}
// 生態：繁衍、棲地遊蕩、野豬下山拱菜（有目的、會離開）
function removeWild(s, k, n) { for (let i = 0; i < n; i++) { const j = s.wild.findIndex((w) => w.k === k); if (j >= 0) s.wild.splice(j, 1); } }
function ecoStep(s, dt) {
  for (const [k, E] of Object.entries(ECO)) { const e = s.eco[k]; if (e.n < E.max) { e.timer += dt; if (e.timer >= E.regen) { e.n++; e.timer = 0; } } }
  const R = HABITAT.r;
  for (const k of Object.keys(ECO)) { let have = s.wild.filter((w) => w.k === k).length; while (have < s.eco[k].n) { s.wild.push({ k, pos: [HABITAT.c[0] + (rand(s) - 0.5) * R, HABITAT.c[1] + (rand(s) - 0.5) * R], tgt: null }); have++; } if (have > s.eco[k].n) removeWild(s, k, have - s.eco[k].n); }
  for (const w of s.wild) { if (!w.tgt || dist(w.pos, w.tgt) < 4) w.tgt = [HABITAT.c[0] + (rand(s) - 0.5) * 2 * R, HABITAT.c[1] + (rand(s) - 0.5) * R]; const L = dist(w.pos, w.tgt), st = MONSTERS[w.k].speed * 0.3 * dt; w.pos[0] += (w.tgt[0] - w.pos[0]) * Math.min(1, st / L); w.pos[1] += (w.tgt[1] - w.pos[1]) * Math.min(1, st / L); w.face = w.tgt[0] >= w.pos[0] ? 1 : -1; }
  s.raidT += dt;
  if (!s.hunt && s.raidT >= RAID_EVERY && s.eco.boar.n > 0 && !s.mons.some((m) => m.raid)) {
    s.raidT = 0; s.eco.boar.n--; removeWild(s, 'boar', 1);
    s.mons.push({ uid: `raid${s.rngN++}`, k: 'boar', hp: MONSTERS.boar.hp, max: MONSTERS.boar.hp, pos: [...NODES.den], path: route('den', 'veg').slice(1), raid: 'go', cool: 0 });
    log(s, '一頭野豬循山路下來，朝菜園去了。');
  }
  for (const m of s.mons) if (m.raid) {
    if (monWalk(m, MONSTERS.boar.speed * dt)) {
      if (m.raid === 'go') { const p = s.plots.find((x) => x.st === 'ripe') || s.plots.find((x) => x.st === 'grow'); if (p) { p.st = 'empty'; p.g = 0; log(s, '野豬拱壞了一畦菜，吃飽回山。'); for (const d of s.ds) think(s, d, 'cropLost'); } else log(s, '野豬在菜園沒找到吃的，回山了。'); m.raid = 'back'; m.path = route('veg', 'den').slice(1); }
      else { m.gone = true; s.eco.boar.n++; }
    }
  }
  s.mons = s.mons.filter((m) => !m.gone);
}

// ---- tick ----
export function tick(s, dt = 0.25) {
  s.t += dt;
  for (const p of s.plots) if (p.st === 'grow' && (p.g += dt) >= PLOT_GROW) p.st = 'ripe';
  for (const d of s.ds) {
    d.needs.hunger = clamp(d.needs.hunger - 0.35 * dt, 0, 100);
    d.needs.social = clamp(d.needs.social - 0.4 * dt, 0, 100);
    moodStep(d, dt);
    if (!d.task) decide(s, d);
    if (d.task) { moveStep(d, dt); doTask(s, d, dt); }
    if (d.anim === 'strike' && d.cool < 0.6) d.anim = null;
  }
  huntStep(s, dt);
  ecoStep(s, dt);
  for (const f of s.fx) f.ttl -= dt; s.fx = s.fx.filter((f) => f.ttl > 0);
}

// ---- 存檔 ----
export function save(s) { return JSON.stringify({ ...s, fx: [] }); }
export function load(str) {
  let o; try { o = JSON.parse(str); } catch { return { ok: false, err: '存檔損毀' }; }
  if (!o || o.v !== SAVE_VERSION || !Array.isArray(o.ds)) return { ok: false, err: `不支援的存檔版本 ${o?.v}` };
  for (const d of o.ds) { d.mood ??= MOOD.base; d.thoughts ??= []; d.personality ??= []; } // v0.5 檔補預設
  return { ok: true, state: o };
}
export { clone };
