import {BODY_MECHANICS} from './contact.mjs';
import {makeBare} from './starter-combat.mjs';
import { DAY, NODES, SECTS, SECT_K, RULE_LIB, HERO_SECT, CUSTOM_BY_VALUE, CUSTOM_RIVALS, WUMING_KIT24, ARTS, SECT_PICK24 } from './data.mjs';
import { seedArts, learnArt, artTier, artById, artOk, reqMissing, curCap, focusOf, specK, bestSpec, chiefLocked24, mastery, primaryCat, CATS, qiInjuryFight28, temperOf, TEMPER29, yunvOpen24, ponderLuoying, practiceLuoying } from './arts.mjs';
import { HERMITAGE_VOLUMES, volumeLineage } from './hermitage-books.mjs';
import { dpsOf } from './world.mjs';
import { compat, think } from './social.mjs';
import { APPR } from './bonds.mjs';
import { UPKEEP, E as econOf } from './economy.mjs';
import { affKey, relKey, log, resAdd, resSet, recordDeed } from './util.mjs';
import { removeActor, cancelTask } from './core.mjs';
import { addWexin } from './hero.mjs';
export { TWIN_SWORDS_DAMAGE, twinSwordsPartner, twinSwordsDamageFactor } from './twin-swords.mjs';
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
/* loop148 v2.25（決定 144）：v22 下成過親的人（d.wed）不再拜堂——根因：配偶欠俸離山或名俠退隱時 removeActor 把 spouse 清空，留下的人就能再娶再嫁，玩家看起來像重婚。 */
export function marriable(s, a, b) { return a.adult && b.adult && !a.spouse && !b.spouse && !((a.wed || b.wed)) && a.sweet === b.id && b.sweet === a.id && (s.rel[relKey(a.id, b.id)] || 0) >= MARRY.rel && compat(a, b) * compat(b, a) >= 1; }
export const weddingWhy = (s) => { const G = s.gen; if (G.couples.length >= MARRY.cap) return `門派已有 ${MARRY.cap} 對夫妻`; if (s.t - (G.lastWed ?? 0) < MARRY.everyDays * DAY) return `喜事每 ${MARRY.everyDays} 日最多一場`; if ((s.res.coin || 0) < MARRY.cost) return `辦喜事要 ${MARRY.cost} 香火錢`; return null; };
function checkCouples(s) {
  const G = s.gen;
  for (const k of s.families || []) { if (G.couples.some((c) => c.join('|') === k)) continue; const [a, b] = k.split('|').map((id) => s.ds.find((d) => d.id === id)); if (a && b && marriable(s, a, b) && !weddingWhy(s)) { resAdd(s, 'coin', -MARRY.cost); G.lastWed = s.t; G.couples.push([a.id, b.id].sort()); a.spouse = b.id; b.spouse = a.id; a.wed = b.id; b.wed = a.id; log(s, `【成親】${a.name}與${b.name}在大廳拜堂（喜事花了 ${MARRY.cost} 香火錢），${s.sect?.name || '門派'}上下喝了一夜喜酒。`); } }
}
// ---- 收養：承襲養父母傾向（性格各取一、價值觀平均之半、悟性根骨部分承襲） ----
export function adopt(s, pa, pb, rnd = Math.random) {
  const G = s.gen, ps = [pa, pb].filter(Boolean); if (!ps.length) return null;
  const tpl = ps[0], id = `kid${++G.kidN}`, name = KID_NAMES[(G.kidN - 1) % KID_NAMES.length];
  const pers = [...new Set(ps.map((p) => p.personality[Math.floor(rnd() * p.personality.length)]).filter(Boolean))].slice(0, 2);
  const avg = (f) => ps.reduce((a, p) => a + (f(p) ?? 3), 0) / ps.length, part = (v) => Math.max(1, Math.min(5, Math.round((v + 3) / 2 + (rnd() < 0.3 ? 1 : 0))));
  let values = null; if (ps.some((p) => p.values)) { values = {}; for (const k of ['xia', 'sect', 'qing', 'free', 'wu', 'fame']) values[k] = Math.round(ps.reduce((a, p) => a + (p.values?.[k] || 0), 0) / ps.length / 2); }
  const d = { ...JSON.parse(JSON.stringify(tpl)), id, name, adult: false, child: { since: s.t, parents: ps.map((p) => p.id) }, age: GEN.adoptAge, sprite: 'cousin', role: 'inner', personality: pers, known: pers.slice(0, 1), values, wexin: 0, classic: false, xia: null, portrait: null, spouse: null, ...({ sweet: null, wed: undefined }), /* loop148 孩子不沿用範本的心上人 */ acts: undefined, deeds: undefined, deedN: undefined, /* M1 傳記不沿用範本 */
    root: part(avg((p) => p.root)), wu: part(avg((p) => p.wu ?? p.root)), rootKnown: true, arts: {}, moves: ['fist'], pendingArt: null, focus: null, skills: { leg: 2, palm: 2, strength: 2, farming: 2, herbal: 2, agility: 6, cooking: 1 },
    needs: { energy: 80, hunger: 70, social: 50, fun: 70 }, hp: 100, mood: 60, thoughts: [], why: [], task: null, path: [], order: null, carry: null, away: false, at: 'hall', pos: [NODES.hall[0] + 20 * G.kids.length, NODES.hall[1] + 40], reason: '剛被收養', together: 0, master: null, oneArm: false, hidden: null, takeMul: null, reflect: null, awakened: false, duanqing: null, moodCap: null };
  // A new person does not inherit the parent's lived encounters or the parent's time sheet.
  makeBare(d);d.practice={hands:{},eyes:{},origin:{}};
  for(const k of ['glimmer','selection','trainingWish','trainingWishes','timeToday','timePrev','guidanceTotal','guidanceMentor','originRelation','originRelationKind','originInvented','lastDodge','techniqueContact','flightSeen','lastCombatMove','sure','intentTarget','foe','tactics','lureUntil','lurePos','lastHelpAt','scarred','survived'])delete d[k];
  Object.assign(d,{wounds:[],part:null,pain:0,painAt:s.t,fret:0,raging:false,rageUntil:0,visionUntil:0,posture:BODY_MECHANICS.balance,downUntil:0,faintUntil:0,balanceOpenUntil:0,busyUntil:0,swing:null,bswing:null});
  s.ds.push(d); G.kids.push(id); G.lastAdopt = s.t;
  for (const o of s.ds) if (o !== d) { const v = ps.includes(o) ? 60 : 15; s.aff[affKey(o.id, d.id)] = v; s.aff[affKey(d.id, o.id)] = v; s.rel[relKey(o.id, d.id)] = v; }
  setMaster(s, d, ps.slice().sort((a, b) => bestTier(b) - bestTier(a))[0]);
  log(s, `【收養】${ps.map((p) => p.name).join('與')}收養了孤兒${name}（${GEN.adoptAge} 歲；承襲${pers.join('、') || '—'}、悟性${d.wu}・根骨${d.root}）。`); return d;
}
const bestTier = (d) => Math.max(-1, ...Object.keys(d.arts || {}).map((k) => artTier(d, k)));
// ---- 師承：名冊只留可傳的武學；加速由外功場共同傳授結算 ----
export function setMaster(s, d, m) { if (!m || m === d) return; d.master = m.id; refreshLine(s, d); log(s, `${d.name}拜${m.name}為師。`); }
function refreshLine(s, d) { const m = s.ds.find((x) => x.id === d.master); d.mentorArts31 = m ? Object.keys(m.arts || {}).filter((k) => artTier(m, k) >= GEN.lineTier).sort((a, b) => artTier(m, b) - artTier(m, a)) : []; }
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
  s.hero = { ...(s.hero || {}), kind: 'heir', id: 'heir', name: n.name, gen: G.n, arc: null, arcStep: 0, values: n.values, stats: s.hero?.stats || { wu: n.wu ?? n.root ?? 2, gen: n.root ?? 2, li: 2, shen: 2, ding: 2, fu: 2 },  };
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
  checkCouples(s); if (!s.hermitage?.active) adoptCard(s); // H0／R4：未立匾的山居不可增列收養門人；立匾後沿原事件。
}
export function genResolve(s, ch, i) {
  s.choices = s.choices.filter((c) => c !== ch);
  if (ch.gen === 'adopt') { if (i === 0) { const [a, b] = ch.pair.map((id) => s.ds.find((d) => d.id === id)); resSet(s, 'food', Math.max(0, s.res.food - GEN.adoptFood), 'adopt'); adopt(s, a, b, () => ((s.gen.kidN * 37 + s.day) % 100) / 100); } else { s.gen.lastAdopt = s.t; log(s, '孩子被送去山下善堂。'); } }
  return true;
}

// ==== （原 sect.mjs）====
// v1.35 門派身分（ROADMAP §18）：門規、鎮派設施、招人風格、宿敵守關、名俠加權、外門武學、叛派
export function sectOf(hero) {
  const id = SECTS[hero?.sect24] && (!SECTS[hero.sect24].phase7Only || hero.phase7Founded) && (SECTS[hero.sect24].v24 || SECT_PICK24.includes(hero.sect24)) ? hero.sect24 : /* loop169 自創主角也可選華山二宗、丐幫、明教 */ 'wuming', B = SECTS[id]; /* 出自 Phase 7 規格：新合宗門派只由隱居開山選擇，舊開局不可偷選。 */
  const o = { id, name: B.name, plaque: B.plaque, color: B.color, flag: B.flag, bias: { ...B.bias }, tree: [...B.tree], ban: [...B.ban], rules: [...B.rules], rivals: [...B.rivals], rep: 0, fac: false, viol: {}, violN: 0, lastViolT: -1e9, keptDay: 0, day: -1, questioned: {}, defect: {}, expelled: [], beaten: {}, rivalI: 0 };
  if (id === 'wuming' && hero?.kind === 'custom') { const [tag, rule] = CUSTOM_BY_VALUE[hero.main] || ['拙', 'rescue']; o.bias = { [tag]: SECT_K.biasCap }; o.rules = [rule]; o.rivals = [CUSTOM_RIVALS[(hero.name || '').length % CUSTOM_RIVALS.length]]; o.plaque = `${hero.name || '無名'}派`; o.name = o.plaque; }
  return o;
}
export const sectInit = (s) => { s.sect = sectOf(s.hero); grantSectRoots(s); return s.sect; };
// R4（#520）：只從人在山上實際會的非通用武學找出可立的脈；出身不會憑空授武。
const knownLineage = (d) => {
  const known = Object.keys(d.arts || {}).map(artById).filter((a) => a && !a.isPublic);
  const preferred = d.originSect && known.some((a) => a.own24 === d.originSect || SECTS[d.originSect]?.tree.includes(a.id)) ? d.originSect : null;
  return preferred || known.map((a) => a.own24 || Object.keys(SECTS).find((id) => SECTS[id].tree.includes(a.id) && !SECTS[id].phase7Only)).find((id) => id && SECTS[id])
    || known.map((a) => Object.keys(SECTS).find((id) => SECTS[id].tree.includes(a.id))).find(Boolean) || null;
};
const hermitageLineages = (s) => {
  const routes = [];
  for (const person of s.ds) {
    const primary = knownLineage(person);
    const fromVolumes = HERMITAGE_VOLUMES.filter(v => s.hermitage?.books?.includes(v.id) && person.arts?.[v.art]).map(volumeLineage).filter(Boolean);
    const candidates = person.originSect && fromVolumes.includes(person.originSect) ? fromVolumes : [primary, ...fromVolumes];
    for (const id of candidates) if (id && !routes.some((r) => r.id === id)) routes.push({ id, teacher: person.id, tree: [...SECTS[id].tree] }); // R3：獨行者讀到第二脈真卷，可由同一人立兩脈。
  }
  return routes;
};
const lineageTreeFor = (s, d) => {
  const S = s.sect; if (!s.hermitage?.founded || !S?.secretLineage?.length) return S.tree;
  return ['hero', ...(S.lineageGuides || []).map((r) => r.teacher), S.firstDiscipleId].includes(d.id) ? [...new Set([...S.tree, ...S.secretLineage])] : S.tree;
};
export function applySectLineage(s, d) {
  if (!s.sect || !d) return d;
  d.sectId = s.sect.id; d.stree = lineageTreeFor(s, d); d.sbias = s.sect.bias;
  d.foundedLineage = !!s.hermitage?.founded && (s.sect.doctrine !== 'orthodox' || d.stree.length > s.sect.tree.length);
  return d;
}
export function canFoundHermitageSect(s) {
  if (!s.hermitage?.active || s.hermitage.founded) return { ok: false, why: '已非荒山隱居時期' };
  const h = heroD(s); if (!h || h.away || h.hp <= 0) return { ok: false, why: '主角尚未在山中' };
  const routes = hermitageLineages(s);
  return { ok: !!routes.length, routes, why: routes.length ? '' : '尚未帶有可立脈的武學' }; // R3 #522：玩家第 1 日即可決定立匾；不再看武道、山崖或守山。
}
export function queueHermitageFounding(s) {
  const ready = canFoundHermitageSect(s); if (!ready.ok) return ready;
  if (s.choices?.some((c) => c.sect === 'hermitageFounding')) return { ok: true };
  const dual = ready.routes.length >= 2;
  const doctrines = dual ? ['dualHall', 'orthodox', 'wuming'] : ['single', 'wuming'];
  const opts = dual ? ['陰陽合宗・雙堂並立', '正宗立匾・內堂秘傳', '萬流歸宗・無名自創派'] : ['單脈立匾・傳承所學', '無名自創派'];
  s.choices ??= []; s.choices.push({ id: `hermitage-found-${s.day}`, sect: 'hermitageFounding', doctrines, forcePrompt: true, title: '開山立宗・道統抉擇', text: dual ? '兩路功夫在荒山相遇。立匾後以哪一脈傳人？' : '山中只有一路可傳的武學。立匾後立此單脈，或自創山門。', opts, portrait: null, at: s.t });
  return { ok: true };
}
const knownTeacher = (s, pupil, tree) => s.ds.filter((d) => d !== pupil && !d.away && Object.keys(d.arts || {}).some((id) => tree.includes(id)) && (s.aff?.[affKey(pupil.id, d.id)] || 0) >= APPR.aff && (s.aff?.[affKey(d.id, pupil.id)] || 0) >= APPR.aff)
  .sort((a, b) => (s.aff[affKey(pupil.id, b.id)] || 0) - (s.aff[affKey(pupil.id, a.id)] || 0) || bestTier(b) - bestTier(a))[0];
export function assignDiscipleHall(s, d) {
  if (!s.hermitage?.founded || !d || d.id === 'hero') return null;
  const S = s.sect, traits = d.personality || [];
  if (S.doctrine === 'wuming') return null;
  if (S.doctrine === 'single') d.hall = 'yang';
  else if (S.doctrine === 'orthodox') d.hall = (S.lineageGuides || []).some((r) => r.teacher === d.id && r.id === S.lineages.yin) ? 'yin' : S.bannerHall;
  else d.hall = traits.includes('honest') || traits.includes('stubborn') ? 'yang' : traits.includes('gentle') || traits.includes('free') || (d.wu || 0) > (d.root || 0) ? 'yin' : 'yang';
  const tree = S.dualTree[d.hall] || S.tree, mentor = knownTeacher(s, d, tree);
  if (mentor) setMaster(s, d, mentor);
  return d.hall;
}
export function foundHermitageSect(s, doctrine = null, customPlaque = '') {
  const ready = canFoundHermitageSect(s); if (!ready.ok) return ready;
  const routes = ready.routes, dual = routes.length >= 2;
  doctrine ??= dual ? 'dualHall' : 'single';
  if (!(dual ? ['dualHall', 'orthodox', 'wuming'] : ['single', 'wuming']).includes(doctrine)) return { ok: false, why: '目前武學脈絡不支援此道統' };
  const opts = typeof customPlaque === 'object' && customPlaque ? customPlaque : { plaque: customPlaque };
  const [first, second] = routes, alternate = opts.banner === 'partner' || opts.banner === 'secondary';
  const banner = doctrine === 'orthodox' && alternate ? second : first;
  const yang = first.id, yin = second?.id || null;
  const sectId = doctrine === 'wuming' ? 'wuming' : doctrine === 'orthodox' || doctrine === 'single' ? banner.id : yang === 'quanzhen' && yin === 'gumu' ? 'zhongnan' : yang === 'shaolin' && yin === 'taohua' ? 'longrong' : 'wuming';
  const hero = heroD(s), secondPerson = second && s.ds.find((d) => d.id === second.teacher);
  s.hero.phase7Founded = true; s.hero.sect24 = sectId; const S = sectOf(s.hero);
  S.doctrine = doctrine; S.lineages = { yang, yin }; S.lineageGuides = routes;
  S.bannerHall = alternate ? 'yin' : 'yang'; S.dualTree = { yang: first.tree, yin: second?.tree || [] };
  S.tree = doctrine === 'orthodox' || doctrine === 'single' ? [...SECTS[banner.id].tree] : [...new Set([...S.tree, ...first.tree, ...(second?.tree || [])])];
  S.secretLineage = doctrine === 'orthodox' ? [...SECTS[banner === first ? second.id : first.id].tree] : [];
  S.firstDiscipleId = null;
  const defaultPlaque = doctrine === 'dualHall' ? sectId === 'zhongnan' ? '終南山・雙劍山莊' : sectId === 'longrong' ? '隱龍山莊' : '雙脈山莊' : S.plaque;
  S.plaque = String(opts.plaque || defaultPlaque).replace(/[<>&"'`]/g, ''); S.name = S.plaque; s.sect = S;
  s.hermitage.active = false; s.hermitage.founded = true; s.hermitage.foundedDay = s.day; s.hermitage.doctrine = doctrine;
  s.herbalDiet = true; econOf(s).graceUntil = s.day + UPKEEP.graceDay; s.rep = (s.rep || 0) + 10;
  for (const d of s.ds) { applySectLineage(s, d); think(s, d, 'newLook'); }
  hero.hall = 'yang'; if (secondPerson) secondPerson.hall = 'yin';
  s.choices = (s.choices || []).filter((c) => c.sect !== 'hermitageFounding');
  log(s, `【開山立宗】${[hero, secondPerson].filter(Boolean).map((d) => d.name).join('與')}立匾「${S.plaque}」，定下${doctrine === 'single' ? '單脈傳承' : doctrine === 'dualHall' ? '陰陽雙堂' : doctrine === 'orthodox' ? '正宗與內堂秘傳' : '萬流歸宗'}之路；名聲 +10。`);
  return { ok: true, sect: S };
}
/* loop164 v2.4 Batch 4.1⑥／4.2：華山劍宗、氣宗補華山劍法線；掌門開局自帶本門 T1 根基（無前置的入門內功＋外功）；自創無名派依主價值帶家傳三件套並納入本門樹 */
export const T1_XP24 = 12;
export function grantSectRoots(s) {
  const S = s.sect, B = SECTS[S.id], h = s.ds.find((d) => d.id === 'hero'); for (const id of B.tree24 || []) if (!S.tree.includes(id)) S.tree.push(id);
  if (s.hermitage?.active) return; // 出自 Phase 4 規格：尚未開山，不發掌門本門根基禮包。
  if (!h) return; const give = (id) => { if (!artById(id)) return; const had = !!h.arts?.[id]; h.arts ??= {}; learnArt(h, id, s.t); if (!had) h.arts[id].xp = Math.max(h.arts[id].xp, T1_XP24); };
  if (S.id === 'wuming' && s.hero?.kind === 'custom') { const kit = WUMING_KIT24[s.hero.main] || WUMING_KIT24.wu; for (const id of kit) { give(id); if (!S.tree.includes(id)) S.tree.push(id); } S.kit24 = kit; return; }
  const t1 = S.tree.map(artById).filter((a) => a && !a.secret && !a.signature && !(a.req || []).length);
  /* loop191：吐納補在峨眉、桃花、星宿樹首時，掌門仍帶原本那門無前置的本門內功。武當、氣宗等本來就以吐納為 T1，不改。 */
  const inners = t1.filter((a) => a.school === 'inner');
  const ownInner = inners.find((a) => !a.isPublic && a.own24 === S.id);
  const inner = (['emei', 'taohua', 'xingxiu'].includes(S.id) && ownInner) ? ownInner : inners[0], outer = t1.find((a) => a.school !== 'inner' && a.school !== 'step'); for (const a of [inner, outer]) if (a) give(a.id);
}
const heroD = (s) => s.ds.find((d) => d.id === 'hero');
export const sectFac = (s) => SECTS[s.sect?.id]?.fac;
/* loop163 古墓寒玉床：門人（不含幫工）≤ gainMaxDs 才有加成 */
export const sgainOf = (s) => { const F = sectFac(s), g = F?.gain || (F?.gain24); /* loop176 祖師堂 gain24 只 v24 */ if (!g) return 1; if (F.gainMaxDs && s.ds.filter((d) => d.role !== 'laborer').length > F.gainMaxDs) return 1; return g; };
/* loop176 t192 待決 1B：武當紫霄宮太極守禦，v24 建成後守方戰力 ×def24 */
export const def24Of = (s) => { const F = sectFac(s); return s.sect?.fac && F?.def24 ? F.def24 : 1; };
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
  if (S.ban.includes(id)) return 'ban'; if (S.tree.includes(id) || (S.secretLineage?.includes(id) && d?.stree?.includes(id))) return 'own'; if (a.self24 && d?.sectId === a.own24) return 'own'; if (a.signature) return 'guest'; if (a.classic) return 'outside'; return 'common';
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
  if (ch.sect === 'huiwu') return huiwuResolve(s, ch, i); /* loop166 */
  if (ch.sect === 'hermitageFounding') return foundHermitageSect(s, (ch.doctrines || ['dualHall', 'orthodox', 'wuming'])[i], ch.foundingOptions || '');
  s.choices = s.choices.filter((c) => c !== ch); const d = s.ds.find((x) => x.id === ch.who), r = d?.arts?.[ch.art];
  if (i === 1 && r) { r.xp = Math.max(0, r.xp - 10); log(s, `${d.name}收起了${artById(ch.art).name}，回頭練本門功夫。`); } else log(s, `${d?.name || '弟子'}的${artById(ch.art).name}照練不誤——武學無門戶之見。`);
  return true;
}
// ---- 鎮派設施 ----
export function canBuildFac(s) {
  const F = sectFac(s), S = s.sect; if (s.hermitage?.active) return { ok: false, why: '立匾開山後才能建鎮派設施' }; if (!F) return { ok: false, why: '無' }; if (S.fac) return { ok: false, why: '已建成' };
  if (S.rep < SECT_K.facRep && !((s.rep || 0) >= SECT_K.facRep)) return /* loop183 v2.8：v24 門派名聲（s.rep）達標亦可 */ { ok: false, why: `門派聲望不足（${S.rep}/${SECT_K.facRep}）` };
  for (const [k, v] of Object.entries(F.cost)) if ((s.res[k] || 0) < v) return { ok: false, why: `${k} 不足 ${v}` };
  return { ok: true };
}
export function buildFac(s, force) {
  const c = canBuildFac(s); if (!c.ok && !force) return c; const F = sectFac(s);
  if (!force) for (const [k, v] of Object.entries(F.cost)) resAdd(s, k, -v);
  s.sect.fac = true; if (s.fac.sig) s.fac.sig.stage = 1; log(s, `【鎮派】${F.name}落成：${F.desc}`); return { ok: true };
}
/* #409 桃花：碧波心法到小成後，在島上自己看出落英，次日才上手。不經師父。 */
function luoyingDaily(s) {
  if (s.hermitage || s.sect?.id !== 'taohua') return; // R3：隱居路線不沿用舊桃花自悟整門。
  for (const d of s.ds) {
    if (d.role === 'laborer' || d.away) continue;
    if (!d.luoyingClue) { if (ponderLuoying(d)) log(s, `${d.name}在島上對著落花比劃，掌路自己浮出來。`); }
    else if (practiceLuoying(d, s.t)) log(s, `${d.name}照著落花自己練會了落英神劍掌，沒有師父傳。`);
  }
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
  if (R.art24) { d.arts ??= {}; d.arts[R.art24] ??= { xp: 0, last: s.t }; } /* loop163 星宿派：新人帶《百毒譜》 */
  if (s.hermitage?.founded) {
    S.firstDiscipleId ??= d.id; applySectLineage(s, d); assignDiscipleHall(s, d);
  }
  d.recruitNote = R.text || '新弟子拜入山門。'; log(s, `【${S.name}收徒】${d.recruitNote}`); // 出自 Phase 7 規格：新合宗無舊派收徒列；舊局逐欄、逐字不變。
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
  for (const d of s.ds) { d.sbias = S.bias; d.stree = lineageTreeFor(s, d); d.sgain = S.fac ? sgainOf(s) : 1; }
  if (s.hermitage?.active) return; // 出自 Phase 4 規格：門規與門派會武延後到開山。
  { const F = sectFac(s), on = S.fac && F; const mk = on && F.med24 && sgainOf(s) > 1 ? F.med24 : 1; for (const d of s.ds) d.medK24 = mk; s.psnK24 = on && F.psn24 ? F.psn24 : 1; } /* loop168 寒玉床打坐 ×1.5、神木王鼎毒傷 ×1.35 */
  if (s.day === S.day) return; S.day = s.day; checkRules(s); checkArts(s); facDaily(s); luoyingDaily(s);
  bisaiDaily24(s); /* loop166 Batch 5.2 */
}

// ==== loop166 v2.5 Batch 5.2：旬日山門大比（第 10、20 日）＋天下門派會武（第 15 日名門會武、第 26 日天下論劍；三戰兩勝、排陣、臨陣偷師）。只在 s.v24 ====
/* 戰力＝巡山 dpsOf（已吃 moveMul／cdMul：劍氣二宗、內功、共鳴、詞綴）。勝負用「種子＋日＋場次」雜湊擲骰，不吃 RNG 流。
   對手三人戰力依 loop166 量測（12 種子 bot 局本門前三 dps 中位：第 15 日約 280／255／245，第 26 日約 365／300／265）定錨。 */
export const BISAI24 = { days: [10, 20], minN: 2, champMood: 15, champXp: 25, allXp: 10, newXp: 10 };
export const HUIWU24 = { days: { 15: { name: '名門會武', title: '名門會武魁首', opp: [230, 265, 310] }, 26: { name: '天下論劍', title: '論劍魁首', opp: [255, 305, 375] } },
  pool: ['emei', 'wudang', 'qizong', 'jianzong', 'gaibang', 'mingjiao', 'taohua', 'gumu', 'xingxiu', 'tiandihui', 'zhulong'], /* loop183 v2.8 天地會、豬籠城寨入池 */ rep: 15, coin: 45, lingshi: 1, steal: 0.55, /* loop169 t190 0.40→0.55 */ guiK: 0.25, sharp: 2,
  opts: ['堂堂正正：主將對主將', '田忌賽馬：以下駟耗其上駟，精銳搶攻先鋒與中堅', '奇門詭道：以陣法／醫毒窺破應戰'] };
const hh = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
const fighters24 = (s) => s.ds.filter((d) => d.role !== 'laborer' && !d.away && d.adult !== false && d.hp > 30);
const ownTree = (s) => s.sect?.tree || [];
function bump(d, id, n) { const r = d.arts?.[id], a = artById(id); if (!r || !a) return; r.xp = Math.min(curCap(d, a), r.xp + n); }
export function bisaiDaily24(s) {
  const E = (s.v24ev ??= {}); if (BISAI24.days.includes(s.day) && !E['b' + s.day]) { E['b' + s.day] = 1; bisai24(s); }
  const H = HUIWU24.days[s.day]; if (H && !E['h' + s.day]) { E['h' + s.day] = 1; huiwuCard24(s, s.day); }
}
export function bisai24(s) {
  const ds = fighters24(s); if (ds.length < BISAI24.minN) return null;
  const rank = ds.map((d) => ({ d, p: dpsOf(s, d) * (0.85 + 0.3 * hh(`${s.seed}:bisai:${s.day}:${d.id}`)) })).sort((a, b) => b.p - a.p || (a.d.id < b.d.id ? -1 : 1)); const c = rank[0].d;
  c.mood = Math.min(100, (c.mood || 0) + BISAI24.champMood);
  for (const d of s.ds) if (d.champ28) d.champ28 = false; c.champ28 = true; /* loop183 v2.8 當屆大比首徒：練功 +25%、割草 +0.25，至下屆大比 */
  c.chief24 = true; /* loop171 v2.6 大比魁首升任魁首位階，可受鎮派絕學（chiefOnly24） */
  const nxt = ownTree(s).map(artById).find((a) => a && !c.arts?.[a.id] && artOk(c, a) && (!a.secret || a.derived || yunvOpen24(c, a)) && (!a.signature || yunvOpen24(c, a)) && !reqMissing(c, a).length);
  let gift; if (nxt) { learnArt(c, nxt.id, s.t); c.arts[nxt.id].xp = Math.max(c.arts[nxt.id].xp, BISAI24.newXp); gift = `掌門親傳《${nxt.name}》`; }
  else { const own = Object.keys(c.arts || {}).filter((id) => ownTree(s).includes(id)); const id = own.sort((a, b) => c.arts[b].xp - c.arts[a].xp)[0] || focusOf(c); if (id) { bump(c, id, BISAI24.champXp); gift = `《${artById(id).name}》熟練 +${BISAI24.champXp}`; } }
  for (const { d } of rank) { const id = focusOf(d); if (id) bump(d, id, BISAI24.allXp); }
  const N = (s.v24n ??= {}); N.bisai = (N.bisai || 0) + 1; (N.champs ??= []).push(c.name);
  log(s, `【山門大比】第 ${s.day} 日，${rank.length} 名弟子在演武場同門切磋，${c.name}技壓同儕，奪得演武魁首（心情 +${BISAI24.champMood}${gift ? '、' + gift : ''}）；全派比武印證，修練 +${BISAI24.allXp}。`);
  recordDeed(s, c, 'champ', { chron: `${c.name}奪得第 ${s.day} 日山門大比魁首` }); return c;
}
/* loop182 v2.8「外行看熱鬧、內行看門道」：對手樹（O.tree＋tree24）可偷武學 × 我方出陣者，score＝主門類造詣＋悟性（5：+18、4：+6），門檻 need＝12×品；
   取 score−need 最大的一組（同分取 own24 在前）；未達門檻 p＝0，達標 p＝min(0.85, 0.45＋0.015×(score−need))。回 null＝無可偷 */
export const STEAL28 = { per: 12, wu5: 18, wu4: 6, base: 0.45, k: 0.015, max: 0.85 };
export function stealCheck28(s, team, O) {
  const C = [...new Set([...(O.tree || []), ...(O.tree24 || [])])].map(artById).filter((a) => a && !a.deprecated && !a.secret && !a.signature && !a.derived && !a.isPublic).sort((x, y) => !!y.own24 - !!x.own24);
  let best = null; for (const a of C) { const cat = primaryCat(a.id), g = a.grade || 2, need = STEAL28.per * g;
    for (const d of team) { if (d.arts?.[a.id] || !artOk(d, a)) continue; const wu = d.wu ?? 3, sc = (cat ? mastery(d, cat) : 0) + (wu >= 5 ? STEAL28.wu5 : wu >= 4 ? STEAL28.wu4 : 0) + (temperOf(d).ling ? TEMPER29.steal : 0); /* loop187 靈心慧眼 */
      if (!best || sc - need > best.score - best.need) best = { a, d, cat, need, score: sc }; } }
  if (!best) return null; best.p = best.score < best.need ? 0 : Math.min(STEAL28.max, STEAL28.base + (best.score - best.need) * STEAL28.k); return best;
}
const pickOpp = (s, day) => { const P = HUIWU24.pool.filter((k) => k !== s.sect?.id && SECTS[k]); return P[Math.floor(hh(`${s.seed}:huiwu:${day}`) * P.length)]; };
export function huiwuTeam(s) { return fighters24(s).map((d) => ({ d, p: dpsOf(s, d) })).sort((a, b) => b.p - a.p || (a.d.id < b.d.id ? -1 : 1)).slice(0, 3); }
const guiMul = (s, team) => 1 + HUIWU24.guiK * Math.max(...['zhenfa', 'yishu', 'dushu'].map((c) => specK(bestSpec(s, c, team.map((x) => x.d)))), 0);
/* 排陣：回傳三場 [我方, 對手戰力]；對手依序 先鋒、中堅、主將 */
export function lineup24(s, team, opp, i) {
  const T = [...team]; while (T.length < 3) T.push(null); const [A, B, C] = T, [van, mid, chief] = opp, g = i === 2 ? guiMul(s, team) : 1;
  const pairs = i === 1 ? [[B, van], [A, mid], [C, chief]] : [[C, van], [B, mid], [A, chief]];
  return pairs.map(([x, o]) => ({ d: x?.d || null, p: (x?.p || 0) * g, o }));
}
export const boutWin = (p, o, sharp = HUIWU24.sharp) => (p <= 0 ? 0 : p ** sharp / (p ** sharp + o ** sharp));
export const expWins = (s, team, opp, i) => lineup24(s, team, opp, i).reduce((a, b) => a + boutWin(b.p, b.o), 0);
export function huiwuCard24(s, day) {
  const H = HUIWU24.days[day], team = huiwuTeam(s); if (!team.length) return null; const k = pickOpp(s, day), O = SECTS[k];
  const ev = [0, 1, 2].map((i) => expWins(s, team, H.opp, i)); const auto = ev.indexOf(Math.max(...ev));
  const ch = { id: `huiwu-${day}`, sect: 'huiwu', day, opp: k, auto, title: `【${H.name}】${O.name}代表團上門`, text: `${O.name}遣先鋒、中堅、主將三人來會，三戰兩勝。我方出陣：${team.map((x) => x.d.name).join('、')}。如何排陣？`, opts: HUIWU24.opts, portrait: null, at: s.t };
  s.choices ??= []; s.choices.push(ch); log(s, `【抉擇】${ch.title}：${ch.text}`); if (!s.hero?.askMajor) s.autoAt = s.t; return ch;
}
export function huiwuResolve(s, ch, i) {
  s.choices = s.choices.filter((c) => c !== ch); const H = HUIWU24.days[ch.day], O = SECTS[ch.opp], team = huiwuTeam(s); if (!team.length) { log(s, `【${H.name}】門下無人可出陣，只得作罷。`); return true; }
  const L = lineup24(s, team, H.opp, i), res = L.map((b, k) => hh(`${s.seed}:bout:${ch.day}:${k}`) < boutWin(b.p, b.o)); const w = res.filter(Boolean).length, win = w >= 2;
  const N = (s.v24n ??= {}); N.huiwu = (N.huiwu || 0) + 1; N.huiwuWin = (N.huiwuWin || 0) + (win ? 1 : 0); (N.lineup ??= [0, 0, 0])[i]++;
  qiInjuryFight28(s, L.filter((b) => b.d).map((b) => b.d), log); /* loop186 會武實戰累積逆催內傷 */
  const pos = ['先鋒', '中堅', '主將'], txt = L.map((b, k) => `${pos[k]}${b.d ? b.d.name : '（缺陣）'}${res[k] ? '勝' : '負'}`).join('、');
  if (win) { s.rep = (s.rep || 0) + HUIWU24.rep; resAdd(s, 'coin', HUIWU24.coin); resAdd(s, 'lingshi', HUIWU24.lingshi); (s.sect.trophies ??= []).push(`【${H.title}】`);
    log(s, `【${H.name}】以「${HUIWU24.opts[i].split('：')[0]}」排陣，${txt}——${w} 勝，力挫${O.name}！名聲 +${HUIWU24.rep}、賞銀 +${HUIWU24.coin}、靈石 +${HUIWU24.lingshi}，得【${H.title}】。`);
    recordDeed(s, null, 'huiwu', { chron: `${H.name}力挫${O.name}，得【${H.title}】` }); }
  else log(s, `【${H.name}】以「${HUIWU24.opts[i].split('：')[0]}」排陣，${txt}——不敵${O.name}。`);
  const fs = L.filter((b) => b.d).map((b) => b.d), thief = (i === 2 ? [...fs].sort((a, b) => Math.max(...['zhenfa', 'yishu', 'dushu'].map((c) => bestSpec(s, c, [b]))) - Math.max(...['zhenfa', 'yishu', 'dushu'].map((c) => bestSpec(s, c, [a]))) || (b.wu ?? 3) - (a.wu ?? 3)) : [...fs].sort((a, b) => (b.wu ?? 3) - (a.wu ?? 3)))[0];
  if (fs.length) { const r = stealCheck28(s, fs, O), u = hh(`${s.seed}:steal:${ch.day}`), W = (s.v28n ??= {}); /* loop182 v2.8 造詣門道偷師 */
    if (r) { W.stealTry = (W.stealTry || 0) + 1; const { a, d: who, need, cat } = r;
      if (!r.p) { W.stealZero = (W.stealZero || 0) + 1; if (u < 0.5) log(s, `【臨陣觀摩】${who.name}見${O.name}使出《${a.name}》精妙非凡，奈何自身${CATS[cat]?.name || '武學'}造詣未至（需 ${need}），未能窺破門道。`); }
      else if (u < r.p) { learnArt(who, a.id, s.t); who.arts[a.id].xp = Math.max(who.arts[a.id].xp, BISAI24.newXp); N.steal = (N.steal || 0) + 1; log(s, `【臨陣偷師】${who.name}在場邊看出${O.name}招式精要，竟學會了《${a.name}》！`); recordDeed(s, who, 'steal', { chron: `${who.name}在${H.name}上偷師${O.name}《${a.name}》` }); } } }
  else if (thief && hh(`${s.seed}:steal:${ch.day}`) < HUIWU24.steal) { const C = O.tree.map(artById).filter((a) => a && !thief.arts?.[a.id] && artOk(thief, a) && !a.secret && !a.signature && !a.derived), a = C.find((x) => x.own24) || C[0];
    if (a) { learnArt(thief, a.id, s.t); thief.arts[a.id].xp = Math.max(thief.arts[a.id].xp, BISAI24.newXp); N.steal = (N.steal || 0) + 1; log(s, `【臨陣偷師】${thief.name}在場邊看出${O.name}招式精要，竟學會了《${a.name}》！`); recordDeed(s, thief, 'steal', { chron: `${thief.name}在${H.name}上偷師${O.name}《${a.name}》` }); } }
  return true;
}

// ==== （原 valor.mjs）====
/* loop129 門派勇名 `valor`（docs/systems/evaluations/daxia.md §3）。借鏡大俠立志傳勇德（打贏上升、逃跑下降，兩端各有特性），只做門派一條軸。
   s.valor 只在開關開啟時存在；沒有時全部回中性值。 */
export const VALOR = { min: -100, max: 100, fight: 2, win: 2, pay: -3, accept: 2, refuse: -2, hi: 50, lo: -50, powMul: 1.05, threatMul: 1.1, mid: 25, midMul: 1.02 };
/* loop138 中段名號（決定 118）：s.valormid 開時，25≤勇名<50「小有勇名」戰力 ×1.02 */
const midOn = (s) => !!s && hasValor(s) && s.valor >= VALOR.mid && s.valor < VALOR.hi;
export const hasValor = (s) => typeof s?.valor === 'number';
export function valorAdd(s, v) { if (!hasValor(s)) return; s.valor = Math.max(VALOR.min, Math.min(VALOR.max, s.valor + v)); }
export const valorPowMul = (s) => (hasValor(s) && s.valor >= VALOR.hi ? VALOR.powMul : midOn(s) ? VALOR.midMul : 1);
export const valorThreatMul = (s) => (hasValor(s) && s.valor <= VALOR.lo ? VALOR.threatMul : 1);
export const valorLabel = (s) => (!hasValor(s) ? '' : s.valor >= VALOR.hi ? '勇名在外（戰力 ×1.05）' : s.valor <= VALOR.lo ? '軟柿子（山賊威脅 ×1.1）' : midOn(s) ? '小有勇名（戰力 ×1.02）' : '尚無名號');
export const valorHtml = (s) => (hasValor(s) ? `・勇名 ${s.valor}（${valorLabel(s)}）` : '');
