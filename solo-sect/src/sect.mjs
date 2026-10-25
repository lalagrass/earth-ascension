// v1.35 門派身分（ROADMAP §18）：門規、鎮派設施、招人風格、宿敵守關、名俠加權、外門武學、叛派
import { SECTS, SECT_K, RULE_LIB, HERO_SECT, CUSTOM_BY_VALUE, CUSTOM_RIVALS } from './sect-data.mjs';
import { DAY } from './data.mjs';
import { artTier, artById } from './arts.mjs';
import { addWexin } from './hero.mjs';
import { log } from './util.mjs';
import { xidOf } from './wuxia.mjs';
import { removeDisciple } from './gen.mjs';
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
  if (!force) for (const [k, v] of Object.entries(F.cost)) s.res[k] -= v;
  s.sect.fac = true; log(s, `【鎮派】${F.name}落成：${F.desc}`); return { ok: true };
}
function facDaily(s) {
  const F = sectFac(s); if (!s.sect.fac || !F) return;
  for (const [k, v] of Object.entries(F.daily || {})) { if (k === 'rep') s.rep = (s.rep || 0) + v; else s.res[k] = (s.res[k] || 0) + v; }
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
