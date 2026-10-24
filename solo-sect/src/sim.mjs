// 單一權威模擬核心：純 JS、無 DOM，可在 Node 測試。
import { NODES, EDGES, FACILITIES, ACTIVITIES, MOVES, MONSTERS, WAVES, DISCIPLES, REL_STAGES, BASE_SPEED } from './data.mjs';

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
    v: SAVE_VERSION, seed, t: 0, res: { wood: 0, food: 4, herb: 0 }, cap: { wood: 12 },
    fac: Object.fromEntries(FACILITIES.map((f) => [f.id, { stage: 0, site: null }])),
    ds: DISCIPLES.map((d, i) => ({
      id: d.id, name: d.name, adult: d.adult, sprite: d.sprite, traits: d.traits,
      skills: { ...d.skills }, moves: ['fist'], pendingMove: null,
      needs: { energy: 80, hunger: 70 - i * 10, social: 50 }, hp: 100,
      at: 'court', pos: [...NODES.court].map((v, k) => v + (k ? 0 : (i - 1) * 30)), path: [],
      task: null, order: null, reason: '剛到道館', carry: null, cool: 0, walked: 0, face: 1, anim: null,
    })),
    rel: {}, families: [], log: [], hunt: null, mons: [], fx: [], rngN: 0,
  };
  for (let i = 0; i < s.ds.length; i++) for (let j = i + 1; j < s.ds.length; j++) s.rel[relKey(s.ds[i].id, s.ds[j].id)] = 10;
  log(s, '師徒三人來到山腳一間破道館。');
  return s;
}
function rand(s) { const r = rng(s.seed * 7919 + s.rngN++); return r(); }
export function log(s, msg) { s.log.unshift({ t: Math.floor(s.t), msg }); if (s.log.length > 60) s.log.pop(); }

// ---- 建造 ----
export function startBuild(s, id) {
  const f = facDef(id), st = s.fac[id], next = f.stages[st.stage + 1];
  if (!next || st.site) return false;
  st.site = { need: { ...next.cost }, delivered: 0, reserved: 0, work: 0, workNeed: next.work };
  log(s, `開工：${f.name} → ${next.name}（需木 ${next.cost.wood}、工時 ${next.work}s）`);
  return true;
}
function finishBuild(s, id) {
  const f = facDef(id), st = s.fac[id]; st.stage++; st.site = null;
  log(s, `完工：${f.name}成了「${f.stages[st.stage].name}」，解鎖：${f.stages[st.stage].offers.map((a) => ACTIVITIES[a].name).join('、')}`);
}
const siteOf = (s) => { const e = Object.entries(s.fac).find(([, v]) => v.site); return e ? [e[0], e[1].site] : null; };

// ---- 指令 ----
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
  if (t.partner) { const p = s.ds.find((x) => x.id === t.partner); if (p?.task?.partner === d.id) { p.task = null; p.path = []; } }
  d.task = null; d.path = []; d.anim = null; d.reason = why;
}

// ---- 效用 AI ----
// 可被邀聊：無玩家指派、未負重、未在施工/狩獵/歇息/聊天中
function chatMates(s, d) { return s.ds.filter((o) => o !== d && !o.order && o.hp > 30 && !o.carry && !['build', 'hunt', 'rest', 'chat', 'learn'].includes(o.task?.act) && o.task?.phase !== 'return'); }
function offered(s, act) { return FACILITIES.filter((f) => facStage(s, f.id).offers.includes(act)); }
function bestFac(s, d, act) {
  const fs = offered(s, act); if (!fs.length) return null;
  if (act === 'rest') fs.sort((a, b) => (facStage(s, b.id).restRate || 0) - (facStage(s, a.id).restRate || 0));
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
  const wood = s.res.wood + s.ds.reduce((a, o) => a + (o.task?.act === 'chop' ? 1 : 0), 0);
  if (wood < s.cap.wood) add('chop', siteOf(s) ? 50 : 28, siteOf(s) ? '工地缺木' : '備柴');
  add('farm', s.res.food < 6 ? 48 : 15, s.res.food < 6 ? '存糧不多' : '照顧菜畦');
  add('forage', 18 * (tr.playful || 1), '採藥');
  const site = siteOf(s);
  if (site) { const v = site[1]; const missing = v.need.wood - v.delivered - v.reserved; if ((missing > 0 && s.res.wood > 0) || (missing <= 0 && v.delivered >= v.need.wood)) add('build', 55 * (d.adult ? 1 : 0.6), '去工地幫忙'); }
  for (const o of out) o.score += rand(s) * 8; // 個性雜訊
  return out.sort((a, b) => b.score - a.score);
}

function assign(s, d, act, why) {
  if (act === 'hunt') { d.task = { act: 'hunt', node: 'guard', phase: 'go' }; goto(d, 'guard'); d.reason = why || '後山守點'; return true; }
  if (act === 'build') {
    const site = siteOf(s); if (!site) return false; const [fid, v] = site;
    const missing = v.need.wood - v.delivered - v.reserved;
    if (missing > 0) { const take = Math.min(2, missing, s.res.wood); if (take <= 0) return false; v.reserved += take; d.task = { act, fac: fid, phase: 'fetch', reservedWood: take, node: 'court' }; goto(d, 'court'); }
    else if (v.delivered >= v.need.wood) { d.task = { act, fac: fid, phase: 'go', node: facDef(fid).node }; goto(d, facDef(fid).node); }
    else return false;
    d.reason = why; return true;
  }
  if (act === 'chat') {
    const p = chatMates(s, d).sort((a, b) => (s.rel[relKey(b.id, d.id)] || 0) - (s.rel[relKey(a.id, d.id)] || 0))[0];
    if (!p) return false;
    if (p.task) cancelTask(s, p, `被${d.name}拉去聊天`);
    const node = 'court'; d.task = { act, node, phase: 'go', partner: p.id }; p.task = { act, node, phase: 'go', partner: d.id };
    goto(d, node); goto(p, node); d.reason = why; p.reason = `${d.name}找來聊天`; return true;
  }
  if (act === 'eat' && s.res.food <= 0) return false;
  const f = bestFac(s, d, act); if (!f) return false;
  d.task = { act, fac: f.id, node: f.node, phase: 'go' }; goto(d, f.node); d.reason = why; return true;
}
function goto(d, node) { const p = route(d.at, node); d.path = p.slice(1).map((n) => ({ n, xy: NODES[n] })); if (!d.path.length) d.path = [{ n: node, xy: NODES[node] }]; }

function decide(s, d) {
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
  const before = d.skills[sk]; d.skills[sk] = Math.min(100, before + amt * (d.traits.diligent || 1) * 0.3 * (1 - before / 130));
  if (sk === 'palm') for (const m of MOVES) if (!d.moves.includes(m.id) && d.skills.palm >= m.req && d.pendingMove !== m.id && !d.pendingMove) { d.pendingMove = m.id; log(s, `${d.name}掌法到了火候，可向師父求學「${m.name}」`); }
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
    if (A.energy) d.needs.energy = clamp(d.needs.energy + A.energy * dt / A.dur, 0, 100);
    if (t.act === 'rest') { const rate = facStage(s, t.fac).restRate || 3; d.needs.energy = clamp(d.needs.energy + rate * dt, 0, 100); d.hp = clamp(d.hp + 3 * dt, 0, 100); if (d.needs.energy >= 100 || (d.order !== 'rest' && d.needs.energy >= 80 && t.timer > 4)) finish(s, d); return; }
    if (t.act === 'build') { const site = s.fac[t.fac].site; site.work += dt; d.needs.energy = clamp(d.needs.energy - dt, 0, 100); grow(s, d, 'strength', 0.2 * dt); if (site.work >= site.workNeed) { finishBuild(s, t.fac); finish(s, d); } else if (t.timer >= A.dur) finish(s, d); return; }
    if (t.timer >= A.dur) {
      if (A.use) { if (s.res.food < 1) { d.task = null; d.anim = null; d.reason = '沒糧了'; return; } s.res.food -= 1; }
      if (A.need?.hunger) d.needs.hunger = clamp(d.needs.hunger + A.need.hunger, 0, 100);
      if (A.skill) for (const [k, v] of Object.entries(A.skill)) grow(s, d, k, v);
      if (A.social) d.needs.social = clamp(d.needs.social + A.social, 0, 100);
      if (t.act === 'learn' && d.pendingMove) { const m = MOVES.find((x) => x.id === d.pendingMove); d.moves.push(m.id); d.pendingMove = null; log(s, `師父傳授${d.name}「${m.name}」！`); }
      if (t.act === 'chat' && t.partner) { const p = s.ds.find((x) => x.id === t.partner); if (d.id < p.id) relAdd(s, d, p, 4 * Math.max(d.traits.social || 1, p.traits.social || 1)); }
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

// ---- 狩獵（同圖塔防波次） ----
export function startHunt(s, ids) {
  if (s.hunt) return false;
  const team = s.ds.filter((d) => ids.includes(d.id)); if (!team.length) return false;
  s.hunt = { wave: 0, t: 0, spawned: 0, kills: 0, escaped: 0, hits: {}, team: team.map((d) => d.id) };
  for (const d of team) { d.order = 'hunt'; cancelTask(s, d, '奉命上後山'); }
  log(s, `後山獸群出沒，${team.map((d) => d.name).join('、')}上山守點。`);
  return true;
}
const MON_PATH = ['den', 'guard', 'trail2', 'trail1', 'yard'];
function huntStep(s, dt) {
  const h = s.hunt; if (!h) return;
  const team = s.ds.filter((d) => h.team.includes(d.id));
  const ready = team.every((d) => d.at === 'guard' || d.hp <= 25);
  if (!ready && !h.started) return; h.started = true; h.t += dt;
  const wave = WAVES[h.wave];
  while (h.spawned < wave.length && wave[h.spawned].t <= h.t) {
    const k = wave[h.spawned].k, M = MONSTERS[k];
    s.mons.push({ uid: `${k}${h.spawned}`, k, hp: M.hp, max: M.hp, pos: [...NODES.den], seg: 1, cool: 0 }); h.spawned++;
  }
  for (const m of s.mons) {
    const M = MONSTERS[m.k];
    const foe = team.filter((d) => d.hp > 25).sort((a, b) => dist(a.pos, m.pos) - dist(b.pos, m.pos))[0];
    m.cool -= dt;
    if (foe && dist(foe.pos, m.pos) < 26) { if (m.cool <= 0) { foe.hp -= M.dmg; m.cool = 1.2; s.fx.push({ kind: 'bite', pos: [...foe.pos], ttl: 0.4 }); } continue; }
    const tgt = NODES[MON_PATH[m.seg]]; const L = dist(m.pos, tgt), step = M.speed * dt;
    if (L <= step) { m.pos = [...tgt]; m.seg++; if (m.seg >= MON_PATH.length) { m.gone = true; h.escaped++; log(s, `${M.name}衝下山溜走了`); } }
    else { m.pos[0] += (tgt[0] - m.pos[0]) * step / L; m.pos[1] += (tgt[1] - m.pos[1]) * step / L; }
  }
  for (const d of team) {
    if (d.hp <= 25) { if (d.task?.act === 'hunt') { d.order = null; cancelTask(s, d, '傷重退回院中'); assign(s, d, 'rest', '傷重歇息'); log(s, `${d.name}受傷退下`); } continue; }
    if (d.at !== 'guard') continue;
    d.cool -= dt; if (d.cool > 0) continue;
    const ms = d.moves.map((id) => MOVES.find((m) => m.id === id)).sort((a, b) => b.dmg * (1 + (b.aoe ? 1 : 0)) - a.dmg * (1 + (a.aoe ? 1 : 0)));
    const live = s.mons.filter((m) => !m.gone && m.hp > 0);
    for (const mv of ms) {
      const reach = mv.range * (1 + d.skills.palm / 200);
      const tgt = live.filter((m) => dist(m.pos, d.pos) <= reach).sort((a, b) => a.hp - b.hp)[0]; if (!tgt) continue;
      const power = mv.dmg * (1 + d.skills.palm / 50);
      const hitList = mv.aoe ? live.filter((m) => dist(m.pos, tgt.pos) <= mv.aoe) : [tgt];
      for (const m of hitList) { m.hp -= power; if (m.hp <= 0) { m.gone = true; h.kills++; log(s, `${d.name}以「${mv.name}」擊退${MONSTERS[m.k].name}`); if (m.k === 'boar') s.res.food += 3; } }
      h.hits[d.id] = (h.hits[d.id] || 0) + 1; grow(s, d, 'palm', 1.5);
      d.cool = mv.cd; d.face = tgt.pos[0] >= d.pos[0] ? 1 : -1; d.anim = 'strike';
      s.fx.push({ kind: 'move', name: mv.name, color: mv.color, from: [...d.pos], to: [...tgt.pos], r: mv.aoe || 16, ttl: 0.6 });
      d.needs.energy = clamp(d.needs.energy - 1, 0, 100);
      break;
    }
  }
  s.mons = s.mons.filter((m) => !m.gone);
  if (h.spawned >= wave.length && !s.mons.length) {
    const rep = `狩獵戰報：擊退 ${h.kills}、溜走 ${h.escaped}；` + team.map((d) => `${d.name}出手 ${h.hits[d.id] || 0} 次`).join('，');
    log(s, rep); s.lastReport = rep;
    for (const d of team) { if (d.order === 'hunt') d.order = null; if (d.task?.act === 'hunt') { d.task = null; d.anim = null; } d.reason = '狩獵結束回院'; }
    s.hunt = null;
  }
}

// ---- tick ----
export function tick(s, dt = 0.25) {
  s.t += dt;
  for (const d of s.ds) {
    d.needs.hunger = clamp(d.needs.hunger - 0.35 * dt, 0, 100);
    d.needs.social = clamp(d.needs.social - 0.4 * dt, 0, 100);
    if (!d.task) decide(s, d);
    if (d.task) { moveStep(d, dt); doTask(s, d, dt); }
    if (d.anim === 'strike' && d.cool < 0.6) d.anim = null;
  }
  huntStep(s, dt);
  for (const f of s.fx) f.ttl -= dt; s.fx = s.fx.filter((f) => f.ttl > 0);
}

// ---- 存檔 ----
export function save(s) { return JSON.stringify({ ...s, fx: [] }); }
export function load(str) {
  let o; try { o = JSON.parse(str); } catch { return { ok: false, err: '存檔損毀' }; }
  if (!o || o.v !== SAVE_VERSION || !Array.isArray(o.ds)) return { ok: false, err: `不支援的存檔版本 ${o?.v}` };
  return { ok: true, state: o };
}
export { clone };
