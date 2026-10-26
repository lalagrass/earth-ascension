// v1.4 第二代（ROADMAP §9.2 G、§4 v1.4；擁有人決定：後代只做收養，不做生育）
// 道侶（好感 ≥90 且雙向相容 ≥1）成親 → 可收養孤兒；孩子在地圖上長大、承襲養父母傾向；師承傳功加成；
// 衣缽：主角任一武學化境 → 指定內門傳人，傳人繼承 1 門 50% 熟練＋1 顆星，開啟下一代；每代宿慧 +1（最多 +3）；名人只退隱不死；門派身分延續
import { DAY, NODES } from './data.mjs';
import { seedArts, learnArt, artTier, artById } from './arts.mjs';
import { compat } from './social.mjs';
import { affKey, relKey, log, resAdd, resSet } from './util.mjs';
import { removeActor, cancelTask } from './lifecycle.mjs';
export const GEN = { yearDays: 28, childYearDays: 3, adoptAge: 6, adultAge: 14, adoptEvery: 7, adoptFood: 6, maxKids: 4, lineMul: 1.2, lineTier: 2, heirShare: 0.5, suhuiMax: 3, startAge: 22 };
export const genInit = () => ({ n: 1, couples: [], kids: [], lineage: [], retired: [], lastAdopt: -1e9, suhui: 0, day: -1, kidN: 0 });
const KID_NAMES = ['小石', '阿蓮', '小虎', '青兒', '小滿', '念慈', '承志', '若蘭', '小魚', '阿福'];
const hero = (s) => s.ds.find((d) => d.id === 'hero');
// ---- 移出門派（逐出、退隱、名人離開共用）：清掉任務、隊伍、好感鍵 ----
export function removeDisciple(s, d, why) {
  if (!d || d.id === 'hero') return false;
  return removeActor(s, d, why);
}
// ---- 成親：道侶＋雙向相容 ≥1 ----
export function marriable(s, a, b) { return a.adult && b.adult && (s.rel[relKey(a.id, b.id)] || 0) >= 90 && compat(a, b) * compat(b, a) >= 1; }
function checkCouples(s) {
  const G = s.gen;
  for (const k of s.families || []) { if (G.couples.some((c) => c.join('|') === k)) continue; const [a, b] = k.split('|').map((id) => s.ds.find((d) => d.id === id)); if (a && b && marriable(s, a, b)) { G.couples.push([a.id, b.id].sort()); a.spouse = b.id; b.spouse = a.id; log(s, `【成親】${a.name}與${b.name}在大廳拜堂，${s.sect?.name || '門派'}上下喝了一夜喜酒。`); } }
}
// ---- 收養：承襲養父母傾向（性格各取一、價值觀平均之半、悟性根骨部分承襲） ----
export function adopt(s, pa, pb, rnd = Math.random) {
  const G = s.gen, ps = [pa, pb].filter(Boolean); if (!ps.length) return null;
  const tpl = ps[0], id = `kid${++G.kidN}`, name = KID_NAMES[(G.kidN - 1) % KID_NAMES.length];
  const pers = [...new Set(ps.map((p) => p.personality[Math.floor(rnd() * p.personality.length)]).filter(Boolean))].slice(0, 2);
  const avg = (f) => ps.reduce((a, p) => a + (f(p) ?? 3), 0) / ps.length, part = (v) => Math.max(1, Math.min(5, Math.round((v + 3) / 2 + (rnd() < 0.3 ? 1 : 0))));
  let values = null; if (ps.some((p) => p.values)) { values = {}; for (const k of ['xia', 'sect', 'qing', 'free', 'wu', 'fame']) values[k] = Math.round(ps.reduce((a, p) => a + (p.values?.[k] || 0), 0) / ps.length / 2); }
  const d = { ...JSON.parse(JSON.stringify(tpl)), id, name, adult: false, child: { since: s.t, parents: ps.map((p) => p.id) }, age: GEN.adoptAge, sprite: 'cousin', role: 'inner', personality: pers, known: pers.slice(0, 1), values, wexin: 0, classic: false, xia: null, portrait: null, spouse: null,
    root: part(avg((p) => p.root)), wu: part(avg((p) => p.wu ?? p.root)), rootKnown: true, arts: {}, moves: ['fist'], pendingArt: null, focus: null, skills: { leg: 2, palm: 2, strength: 2, farming: 2, herbal: 2, agility: 6, cooking: 1 },
    needs: { energy: 80, hunger: 70, social: 50, fun: 70 }, hp: 100, mood: 60, thoughts: [], why: [], task: null, path: [], order: null, carry: null, away: false, at: 'hall', pos: [NODES.hall[0] + 20 * G.kids.length, NODES.hall[1] + 40], reason: '剛被收養', together: 0, master: null, oneArm: false, hidden: null, takeMul: null, reflect: null, awakened: false, duanqing: null, moodCap: null };
  seedArts(d); s.ds.push(d); G.kids.push(id); G.lastAdopt = s.t;
  for (const o of s.ds) if (o !== d) { const v = ps.includes(o) ? 60 : 15; s.aff[affKey(o.id, d.id)] = v; s.aff[affKey(d.id, o.id)] = v; s.rel[relKey(o.id, d.id)] = v; }
  setMaster(s, d, ps.slice().sort((a, b) => bestTier(b) - bestTier(a))[0]);
  log(s, `【收養】${ps.map((p) => p.name).join('與')}收養了孤兒${name}（${GEN.adoptAge} 歲；承襲${pers.join('、') || '—'}、悟性${d.wu}・根骨${d.root}）。`); return d;
}
const bestTier = (d) => Math.max(-1, ...Object.keys(d.arts || {}).map((k) => artTier(d, k)));
// ---- 師承：徒弟學師父大成以上的武學 ×1.2（arts.mjs 讀 d.lineArts） ----
export function setMaster(s, d, m) { if (!m || m === d) return; d.master = m.id; refreshLine(s, d); const top = d.lineArts[0]; if (top) { learnArt(d, top, s.t); d.arts[top].xp = Math.max(d.arts[top].xp, 10); } log(s, `${d.name}拜${m.name}為師。`); }
function refreshLine(s, d) { const m = s.ds.find((x) => x.id === d.master); d.lineArts = m ? Object.keys(m.arts || {}).filter((k) => artTier(m, k) >= GEN.lineTier).sort((a, b) => artTier(m, b) - artTier(m, a)) : []; }
export function adoptCard(s) {
  const G = s.gen; if (G.kids.length >= GEN.maxKids || s.t - G.lastAdopt < GEN.adoptEvery * DAY || !s.choices || s.choices.some((c) => c.gen)) return;
  const c = G.couples.find((p) => !G.kids.some((k) => s.ds.find((d) => d.id === k)?.child?.parents?.includes(p[0]))); if (!c) return;
  const [a, b] = c.map((id) => s.ds.find((d) => d.id === id)); if (!a || !b) return;
  s.choices.push({ id: `gen-adopt-${Math.floor(s.t)}`, gen: 'adopt', pair: c, title: '【收養】山門口的孤兒', text: `山下鬧了饑荒，一個孩子蹲在山門口。${a.name}和${b.name}對看一眼：「要不……我們養吧？」（糧 −${GEN.adoptFood}）`, opts: ['收養，跟著我們姓', '送去山下善堂'], portrait: null, at: s.t });
  if (!s.hero?.askMajor) s.autoAt = s.t;
}
// ---- 衣缽 ----
export const heirArt = (d) => Object.keys(d.arts || {}).find((k) => artTier(d, k) >= 4 || d.arts[k].guizhen);
export const canSucceed = (s) => { const h = hero(s); if (!h || !heirArt(h)) return { ok: false, why: '掌門還沒有任何一門武學到化境' }; if (!heirs(s).length) return { ok: false, why: '沒有成年的內門弟子可傳' }; return { ok: true }; };
export const heirs = (s) => s.ds.filter((d) => d.id !== 'hero' && d.adult && (d.role === 'inner' || d.role === 'head') && !d.xia && !d.classic);
export function succeed(s, heirId, artId) {
  const c = canSucceed(s); if (!c.ok) return c; const h = hero(s), n = s.ds.find((d) => d.id === heirId && heirs(s).includes(d)); if (!n) return { ok: false, why: '傳人不合格' };
  const art = artId && artTier(h, artId) >= 0 ? artId : heirArt(h), G = s.gen;
  G.lineage.push({ gen: G.n, name: h.name, art: artById(art)?.name, heir: n.name, day: s.day }); G.retired.push(h.name);
  learnArt(n, art, s.t); const r = n.arts[art]; r.xp = Math.max(r.xp, h.arts[art].xp * GEN.heirShare); if (r.xp >= 55) r.bt1 = true; if (r.xp >= 100) r.bt2 = true; r.stars = (r.stars || 0) + 1; r.amla = true; learnArt(n, art, s.t);
  const oldName = h.name, keepPos = h.pos, oldId = n.id;
  // 傳人接掌：資料搬進 id='hero'，好感鍵改名；老掌門（不論是否經典人物）退隱，不會死
  for (const k of Object.keys(s.aff)) if (k.startsWith('hero>') || k.endsWith('>hero')) delete s.aff[k];
  for (const k of Object.keys(s.rel)) if (k.split('|').includes('hero')) delete s.rel[k];
  for (const k of Object.keys(s.aff)) { const [a, b] = k.split('>'); if (a === oldId || b === oldId) { s.aff[affKey(a === oldId ? 'hero' : a, b === oldId ? 'hero' : b)] = s.aff[k]; delete s.aff[k]; } }
  for (const k of Object.keys(s.rel)) { const p = k.split('|'); if (p.includes(oldId)) { s.rel[relKey(...p.map((x) => (x === oldId ? 'hero' : x)))] = s.rel[k]; delete s.rel[k]; } }
  s.families = (s.families || []).map((k) => k.split('|').map((x) => (x === 'hero' ? '__old' : x === oldId ? 'hero' : x)).sort().join('|')).filter((k) => !k.includes('__old'));
  G.couples = G.couples.filter((c) => !c.includes('hero')).map((c) => c.map((x) => (x === oldId ? 'hero' : x)).sort());
  for (const d of s.ds) { if (d.master === 'hero') d.master = null; if (d.master === oldId) d.master = 'hero'; if (d.spouse === 'hero') d.spouse = null; if (d.spouse === oldId) d.spouse = 'hero'; if (d.child) d.child.parents = d.child.parents.map((x) => (x === 'hero' ? `退隱的${oldName}` : x === oldId ? 'hero' : x)); }
  cancelTask(s, h, '退隱'); if (h.carry) { for (const [k, v] of Object.entries(h.carry)) resAdd(s, k, v); h.carry = null; } for (const o of s.ds) if (o.task?.partner === 'hero' && o !== h) cancelTask(s, o, `${oldName}退隱了`);
  const idx = s.ds.indexOf(h); s.ds.splice(idx, 1); h.removed = true; s.ds = s.ds.map((d) => (d === n ? Object.assign(n, { id: 'hero', role: 'inner' }) : d));
  // review P1-3：傳人補齊主角欄位（價值觀、違心、已知性格），卡片/面板投影一致
  const baseVals = { xia: 0, sect: 0, qing: 0, free: 0, wu: 0, fame: 0 };
  n.values = { ...baseVals, ...(n.values || s.hero?.values || {}) }; n.wexin ??= 0; n.personality ??= []; n.known ??= n.personality.slice(0, 1); n.adult = true;
  if (n.task) cancelTask(s, n, '接掌門派');
  G.n++; G.suhui = Math.min(GEN.suhuiMax, G.suhui + 1);
  s.hero = { ...(s.hero || {}), kind: 'heir', id: 'heir', name: n.name, gen: G.n, arc: null, arcStep: 0, values: n.values, stats: s.hero?.stats || { wu: n.wu ?? n.root ?? 2, gen: n.root ?? 2, li: 2, shen: 2, ding: 2, fu: 2 }, companion: s.hero?.companion };
  log(s, `【衣缽】${oldName}把${artById(art).name}（五成火候＋一顆星）傳給${n.name}，飄然退隱。${s.sect?.name || '門派'}第 ${G.n} 代掌門接位。宿慧 +1（${G.suhui}/${GEN.suhuiMax}）。`);
  return { ok: true, heir: n, keepPos };
}
// ---- 每日 ----
export function genStep(s) {
  s.gen ??= genInit(); const G = s.gen;
  if (G.day === s.day) return; G.day = s.day;
  for (const d of s.ds) {
    d.age ??= d.adult ? GEN.startAge : 10;
    if (d.child && !d.adult) { if ((s.day - Math.floor(d.child.since / DAY)) % GEN.childYearDays === 0 && s.day * DAY > d.child.since + DAY) { d.age++; if (d.age >= GEN.adultAge) { d.adult = true; d.sprite = (d.personality || []).includes('gentle') ? 'senior' : 'hero'; d.child.grown = s.day; log(s, `【成年】${d.name}長大成人（${d.age} 歲），可以練高深武學、出巡、成親了。`); } } }
    else if (s.day % GEN.yearDays === 0) d.age++;
    if (d.master) refreshLine(s, d);
  }
  checkCouples(s); adoptCard(s);
}
export function genResolve(s, ch, i) {
  s.choices = s.choices.filter((c) => c !== ch);
  if (ch.gen === 'adopt') { if (i === 0) { const [a, b] = ch.pair.map((id) => s.ds.find((d) => d.id === id)); resSet(s, 'food', Math.max(0, s.res.food - GEN.adoptFood)); adopt(s, a, b, () => ((s.gen.kidN * 37 + s.day) % 100) / 100); } else { s.gen.lastAdopt = s.t; log(s, '孩子被送去山下善堂。'); } }
  return true;
}
