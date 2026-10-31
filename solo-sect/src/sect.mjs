import { DAY, NODES, SECTS, SECT_K, RULE_LIB, HERO_SECT, CUSTOM_BY_VALUE, CUSTOM_RIVALS } from './data.mjs';
import { seedArts, learnArt, artTier, artById } from './arts.mjs';
import { compat } from './social.mjs';
import { affKey, relKey, log, resAdd, resSet } from './util.mjs';
import { removeActor, cancelTask } from './core.mjs';
import { addWexin } from './hero.mjs';
import { xidOf } from './wuxia.mjs';
// ==== （原 gen.mjs）====
// v1.4 第二代（ROADMAP §9.2 G、§4 v1.4；擁有人決定：後代只做收養，不做生育）
// 道侶（好感 ≥90 且雙向相容 ≥1）成親 → 可收養孤兒；孩子在地圖上長大、承襲養父母傾向；師承傳功加成；
// 衣缽：主角任一武學化境 → 指定內門傳人，傳人繼承 1 門 50% 熟練＋1 顆星，開啟下一代；每代宿慧 +1（最多 +3）；名人只退隱不死；門派身分延續
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
// v1.8（ROADMAP I-3，擁有人預設）：門派最多 cap 對、每 everyDays 日最多 1 對（第一場不早於第 everyDays 日）、好感 ≥rel、心上人互相鎖定、喜事花 cost 香火錢
export const MARRY = { cap: 5, everyDays: 5, rel: 90, cost: 100 };
export function marriable(s, a, b) { return a.adult && b.adult && !a.spouse && !b.spouse && a.sweet === b.id && b.sweet === a.id && (s.rel[relKey(a.id, b.id)] || 0) >= MARRY.rel && compat(a, b) * compat(b, a) >= 1; }
export const weddingWhy = (s) => { const G = s.gen; if (G.couples.length >= MARRY.cap) return `門派已有 ${MARRY.cap} 對夫妻`; if (s.t - (G.lastWed ?? 0) < MARRY.everyDays * DAY) return `喜事每 ${MARRY.everyDays} 日最多一場`; if ((s.res.coin || 0) < MARRY.cost) return `辦喜事要 ${MARRY.cost} 香火錢`; return null; };
function checkCouples(s) {
  const G = s.gen;
  for (const k of s.families || []) { if (G.couples.some((c) => c.join('|') === k)) continue; const [a, b] = k.split('|').map((id) => s.ds.find((d) => d.id === id)); if (a && b && marriable(s, a, b) && !weddingWhy(s)) { resAdd(s, 'coin', -MARRY.cost); G.lastWed = s.t; G.couples.push([a.id, b.id].sort()); a.spouse = b.id; b.spouse = a.id; log(s, `【成親】${a.name}與${b.name}在大廳拜堂（喜事花了 ${MARRY.cost} 香火錢），${s.sect?.name || '門派'}上下喝了一夜喜酒。`); } }
}
// ---- 收養：承襲養父母傾向（性格各取一、價值觀平均之半、悟性根骨部分承襲） ----
export function adopt(s, pa, pb, rnd = Math.random) {
  const G = s.gen, ps = [pa, pb].filter(Boolean); if (!ps.length) return null;
  const tpl = ps[0], id = `kid${++G.kidN}`, name = KID_NAMES[(G.kidN - 1) % KID_NAMES.length];
  const pers = [...new Set(ps.map((p) => p.personality[Math.floor(rnd() * p.personality.length)]).filter(Boolean))].slice(0, 2);
  const avg = (f) => ps.reduce((a, p) => a + (f(p) ?? 3), 0) / ps.length, part = (v) => Math.max(1, Math.min(5, Math.round((v + 3) / 2 + (rnd() < 0.3 ? 1 : 0))));
  let values = null; if (ps.some((p) => p.values)) { values = {}; for (const k of ['xia', 'sect', 'qing', 'free', 'wu', 'fame']) values[k] = Math.round(ps.reduce((a, p) => a + (p.values?.[k] || 0), 0) / ps.length / 2); }
  const d = { ...JSON.parse(JSON.stringify(tpl)), id, name, adult: false, child: { since: s.t, parents: ps.map((p) => p.id) }, age: GEN.adoptAge, sprite: 'cousin', role: 'inner', personality: pers, known: pers.slice(0, 1), values, wexin: 0, classic: false, xia: null, portrait: null, spouse: null, acts: undefined, deeds: undefined, deedN: undefined, /* M1 傳記不沿用範本 */
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
/* loop72：收養卡後果說明（純顯示，只寫玩家看得到的結果） */
export const genHints = (ch) => (ch?.gen === 'adopt' ? [`糧 −${GEN.adoptFood}；多一個孩子：佔床位、要吃飯，長大才能正式練功`, '孩子送去善堂；過一陣子才會再有收養的機會'] : null);
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

// ==== （原 sect.mjs）====
// v1.35 門派身分（ROADMAP §18）：門規、鎮派設施、招人風格、宿敵守關、名俠加權、外門武學、叛派
export function sectOf(hero) {
  const id = hero?.kind === 'template' ? HERO_SECT[hero.id] || 'wuming' : 'wuming', B = SECTS[id];
  const o = { id, name: B.name, plaque: B.plaque, color: B.color, flag: B.flag, bias: { ...B.bias }, tree: [...B.tree], ban: [...B.ban], rules: [...B.rules], rivals: [...B.rivals], rep: 0, fac: false, viol: {}, violN: 0, lastViolT: -1e9, keptDay: 0, day: -1, questioned: {}, defect: {}, expelled: [], beaten: {}, rivalI: 0 };
  if (id === 'wuming' && hero?.kind === 'custom') { const [tag, rule] = CUSTOM_BY_VALUE[hero.main] || ['拙', 'rescue']; o.bias = { [tag]: SECT_K.biasCap }; o.rules = [rule]; o.rivals = [CUSTOM_RIVALS[(hero.name || '').length % CUSTOM_RIVALS.length]]; o.plaque = `${hero.name || '無名'}派`; o.name = o.plaque; }
  return o;
}
export const sectInit = (s) => (s.sect = sectOf(s.hero));
const heroD = (s) => s.ds.find((d) => d.id === 'hero');
export const sectFac = (s) => SECTS[s.sect?.id]?.fac;
// ---- 門規檢查（每日一次；違反只加違心，同條三天冷卻） ----
export function ruleBroken(s, k) {
  const R = RULE_LIB[k]; if (!R || R.flavor) return null; const ds = s.ds.filter((d) => !d.away && d.role !== 'laborer');
  if (R.who) { const w = s.ds.find((d) => R.who.includes(xidOf(s, d)) && !s.sect.viol['demon:' + xidOf(s, d)]); if (w) { s.sect.viol['demon:' + xidOf(s, w)] = s.t; return `收留了${w.name}`; } return null; }
  if (R.food != null) return s.res.food > R.food ? `存糧 ${Math.floor(s.res.food)} 不分` : null;
  if (R.herb != null) { const w = ds.find((d) => d.hp < R.hp); return w && (s.res.herb || 0) >= R.herb ? `${w.name}重傷，藥材在庫卻沒醫` : null; }
  if (R.hp != null) { const w = ds.find((d) => d.hp < R.hp); return w ? `${w.name}重傷無人照料` : null; }
  if (R.coin != null && R.mood != null) { const w = ds.find((d) => d.mood < R.mood); return s.res.coin > R.coin && w ? `錢 ${s.res.coin} 卻讓${w.name}心寒` : null; }
  if (R.coin != null) return s.res.coin < R.coin ? '欠了包租婆的租' : null;
  if (R.mood != null) { const w = ds.find((d) => d.mood < R.mood); return w ? `${w.name}被冷落（心情 ${Math.round(w.mood)}）` : null; }
  return null;
}
function checkRules(s) {
  const S = s.sect, h = heroD(s); let broke = false;
  for (const k of S.rules) {
    if (!RULE_LIB[k].who && s.t - (S.viol[k] ?? -1e9) < SECT_K.ruleCd * DAY) continue;
    const why = ruleBroken(s, k); if (!why) continue; broke = true; S.viol[k] = s.t; S.violN++; S.lastViolT = s.t;
    if (h && !addWexin(s, h, `違反門規「${RULE_LIB[k].text}」：${why}`)) log(s, `【門規】${RULE_LIB[k].text}——${why}。`);
  }
  if (!broke && s.t - S.lastViolT >= 7 * DAY && s.day - S.keptDay >= 7) { S.keptDay = s.day; S.rep += SECT_K.keepWeek; log(s, `【門規】七日無違，${S.name}門風整肅（門派聲望 +${SECT_K.keepWeek}）。`); }
}
// ---- 外門武學與叛派 ----
export function artKind(s, d, id) {
  const S = s.sect, a = artById(id); if (!S || !a) return 'common';
  if (S.ban.includes(id)) return 'ban'; if (S.tree.includes(id)) return 'own'; if (a.signature) return 'guest'; if (a.classic) return 'outside'; return 'common';
}
export const KIND_NAME = { own: '本門', guest: '客傳', outside: '外門', ban: '禁學', common: '通用' };
function checkArts(s) {
  const S = s.sect;
  for (const d of s.ds) for (const id of Object.keys(d.arts || {})) {
    const k = artKind(s, d, id), key = `${d.id}:${id}`;
    if (k === 'ban' && !S.defect[key]) { S.defect[key] = s.t; const n = Object.keys(S.defect).filter((x) => x.startsWith(d.id + ':')).length; S.rep = Math.max(0, S.rep - SECT_K.defectRep); const h = heroD(s); if (h) addWexin(s, h, `${d.name}偷學禁學「${artById(id).name}」`); log(s, `【叛派】${d.name}學了門規明禁的${artById(id).name}（門派聲望 −${SECT_K.defectRep}）。`); if (n >= SECT_K.expelAt && d.id !== 'hero' && !S.expelled.includes(d.id)) { S.expelled.push(d.name); removeDisciple(s, d, `三犯門規，被逐出${S.name}，收拾包袱下山去了。`); return; } }
    if (k === 'outside' && artTier(d, id) >= 2 && !S.questioned[key] && s.choices) { S.questioned[key] = s.t; s.choices.push({ id: `sect-q-${key}-${Math.floor(s.t)}`, sect: 'question', who: d.id, art: id, title: `【師門質疑】${d.name}的${artById(id).name}`, text: `同門議論紛紛：「${d.name}練的${artById(id).name}不是本門功夫，已到大成——這還算${S.name}的人嗎？」（外門武學練速 ×${SECT_K.outside}）`, opts: ['准他續練：武學無門戶之見', '命他收手：本門功夫要緊（該武學 −10）'], portrait: null, at: s.t }); if (!s.hero?.askMajor) s.autoAt = s.t; }
  }
}
export function sectResolve(s, ch, i) {
  s.choices = s.choices.filter((c) => c !== ch); const d = s.ds.find((x) => x.id === ch.who), r = d?.arts?.[ch.art];
  if (i === 1 && r) { r.xp = Math.max(0, r.xp - 10); log(s, `${d.name}收起了${artById(ch.art).name}，回頭練本門功夫。`); } else log(s, `${d?.name || '弟子'}的${artById(ch.art).name}照練不誤——武學無門戶之見。`);
  return true;
}
// ---- 鎮派設施 ----
export function canBuildFac(s) {
  const F = sectFac(s), S = s.sect; if (!F) return { ok: false, why: '無' }; if (S.fac) return { ok: false, why: '已建成' };
  if (S.rep < SECT_K.facRep) return { ok: false, why: `門派聲望不足（${S.rep}/${SECT_K.facRep}）` };
  for (const [k, v] of Object.entries(F.cost)) if ((s.res[k] || 0) < v) return { ok: false, why: `${k} 不足 ${v}` };
  return { ok: true };
}
export function buildFac(s, force) {
  const c = canBuildFac(s); if (!c.ok && !force) return c; const F = sectFac(s);
  if (!force) for (const [k, v] of Object.entries(F.cost)) resAdd(s, k, -v);
  s.sect.fac = true; if (s.fac.sig) s.fac.sig.stage = 1; log(s, `【鎮派】${F.name}落成：${F.desc}`); return { ok: true };
}
function facDaily(s) {
  const F = sectFac(s); if (!s.sect.fac || !F) return;
  for (const [k, v] of Object.entries(F.daily || {})) { if (k === 'rep') s.rep = (s.rep || 0) + v; else resAdd(s, k, v); }
  const h = heroD(s); if (F.mood && h) h.mood = Math.min(100, h.mood + F.mood);
  if (F.ease && h?.wexin > 0 && s.day % F.ease === 0) { h.wexin--; log(s, `${h.name}在${F.name}面壁，違心稍解（${h.wexin}）。`); }
}
// ---- 招人風格 ----
export function sectRecruit(s, d) {
  const S = s.sect; if (!S) return; const R = SECTS[S.id].recruit || {};
  if (R.root) d.root = Math.min(5, d.root + R.root); if (R.wu) d.wu = Math.max(1, Math.min(5, (d.wu ?? d.root) + R.wu)); if (R.hp) d.hp = Math.min(d.hp, R.hp); if (R.mood) d.mood = Math.min(100, d.mood + R.mood);
  if (R.trait && !d.personality.includes(R.trait)) d.personality.push(R.trait); if (R.skill) d.skills[R.skill] = Math.min(100, d.skills[R.skill] + 6);
  d.recruitNote = R.text; log(s, `【${S.name}收徒】${R.text}`);
}
// ---- 宿敵守關：第 2、4、6… 道關卡由宿敵門派把守；打贏得門派聲望 ----
export function rivalGate(s, G, i) {
  const S = s.sect; if (!G || !S?.rivals?.length || i % 2 !== 1) return G;
  const r = S.rivals[Math.floor(i / 2) % S.rivals.length];
  return { ...G, gateName: `${r}高手（${G.gateName}）`, scale: (G.scale || 1) * SECT_K.rivalScale, rival: r };
}
export function rivalWon(s, G) { if (!G?.rival || !s.sect) return; s.sect.rep += SECT_K.rivalRep; s.sect.beaten[G.rival] = (s.sect.beaten[G.rival] || 0) + 1; log(s, `【宿敵】擊退${G.rival}守關高手，${s.sect.name}聲望 +${SECT_K.rivalRep}。`); }
// ---- 名俠加權：本派相關名俠排到池子前面 ----
export function favSort(s, keys) { const f = SECTS[s.sect?.id]?.fav || []; return [...keys].sort((a, b) => (f.includes(b) ? 1 : 0) - (f.includes(a) ? 1 : 0)); }
// ---- 每 tick ----
export function sectStep(s) {
  if (!s.sect) return; const S = s.sect;
  for (const d of s.ds) { d.sbias = S.bias; d.stree = S.tree; d.sgain = S.fac ? sectFac(s).gain || 1 : 1; }
  if (s.day === S.day) return; S.day = s.day; checkRules(s); checkArts(s); facDaily(s);
}

// ==== （原 valor.mjs）====
/* loop129 門派勇名 `valor`（docs/DAXIA-EVAL.md §3）。借鏡大俠立志傳勇德（打贏上升、逃跑下降，兩端各有特性），只做門派一條軸。
   s.valor 只在開關開啟時存在；沒有時全部回中性值。 */
export const VALOR = { min: -100, max: 100, fight: 2, win: 2, pay: -3, accept: 2, refuse: -2, hi: 50, lo: -50, powMul: 1.05, threatMul: 1.1, mid: 25, midMul: 1.02 };
/* loop138 中段名號（決定 118）：s.valormid 開時，25≤勇名<50「小有勇名」戰力 ×1.02 */
const midOn = (s) => !!s?.valormid && hasValor(s) && s.valor >= VALOR.mid && s.valor < VALOR.hi;
export const hasValor = (s) => typeof s?.valor === 'number';
export function valorAdd(s, v) { if (!hasValor(s)) return; s.valor = Math.max(VALOR.min, Math.min(VALOR.max, s.valor + v)); }
export const valorPowMul = (s) => (hasValor(s) && s.valor >= VALOR.hi ? VALOR.powMul : midOn(s) ? VALOR.midMul : 1);
export const valorThreatMul = (s) => (hasValor(s) && s.valor <= VALOR.lo ? VALOR.threatMul : 1);
export const valorLabel = (s) => (!hasValor(s) ? '' : s.valor >= VALOR.hi ? '勇名在外（戰力 ×1.05）' : s.valor <= VALOR.lo ? '軟柿子（山賊威脅 ×1.1）' : midOn(s) ? '小有勇名（戰力 ×1.02）' : '尚無名號');
export const valorHtml = (s) => (hasValor(s) ? `・勇名 ${s.valor}（${valorLabel(s)}）` : '');
