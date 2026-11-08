import { chiefLocked24, growEnsure, settleGrowth, artById, artTier, learnArt, curCap, reqMissing, topTier, gated, autoBranch } from './arts.mjs';
import { fanRank, CEILING, SPECIALS, BRANCHES } from './artcard.mjs';
import { ARTS, TRAITS, DAY, ACTIVITIES } from './data.mjs';
import { aff, relAdd } from './social.mjs';
import { log, resAdd } from './util.mjs';
import { recordSocialEvent } from './social-thoughts.mjs';
import { HERMITAGE_VOLUMES, teachableHermitageBook } from './hermitage-books.mjs';
// ==== （原 bonds.mjs）====
// v1.65 人物與門派運作：共同記憶帳本、名俠池畫風濾鏡、傳功、收徒（資料表＋小解讀器）

// ---- 共同記憶：每筆有時、地、事；聊天從帳本取材 ----
export const MEM = { cap: 80, perPair: 6 };
export const MEM_KINDS = {
  chat:   { where: '前院', text: '{a}和{b}在前院聊了一下午' },
  spar:   { where: '木樁場', text: '{a}和{b}在木樁場拆了幾十招' },
  patrol: { where: '後山', text: '{a}和{b}並肩巡山，走到{x}' },
  pass:   { where: '大廳', text: '{a}把「{x}」親手傳給{b}' },
  apprentice: { where: '祖師像前', text: '{a}在祖師像前收{b}為徒' },
  heal:   { where: '醫館', text: '{a}受了傷，{b}守在醫館' },
};
const pk = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export function addMem(s, a, b, k, x = '') {
  if (!a || !b || a.id === b.id) return null; const K = MEM_KINDS[k]; if (!K) return null; const M = (s.mem ??= []), key = pk(a.id, b.id);
  const m = { p: key, a: a.id, b: b.id, k, day: s.day, where: K.where, text: K.text.replace('{a}', a.name).replace('{b}', b.name).replace('{x}', x) };
  M.push(m); const mine = M.filter((o) => o.p === key); if (mine.length > MEM.perPair) M.splice(M.indexOf(mine[0]), 1); while (M.length > MEM.cap) M.shift(); return m;
}
export const memsOf = (s, a, b) => (s.mem || []).filter((m) => m.p === pk(a.id ?? a, b.id ?? b));
export const memsWith = (s, a) => (s.mem || []).filter((m) => m.a === (a.id ?? a) || m.b === (a.id ?? a));
// 聊天氣泡：有共同記憶就挑最近一筆（不用亂數）
export function chatLine(s, a, b) { const L = memsOf(s, a, b); const m = L[L.length - 1]; return m ? `${a.name}和${b.name}又說起第 ${m.day} 日：${m.text}` : null; }

// ---- 名俠池畫風濾鏡（只過濾名俠池） ----
export const XIA_SRC = { baozupo: 'zhou', baozugong: 'zhou' }; // 未列者＝金庸
export const XIA_STYLES = { all: { name: '全明星', src: ['jin', 'zhou'] }, jin: { name: '純金庸', src: ['jin'] }, zhou: { name: '純周星馳', src: ['zhou'] } };
export const srcOf = (k) => XIA_SRC[k] || 'jin';
export const styleOk = (s, k) => (XIA_STYLES[s.xiaStyle || 'all'] || XIA_STYLES.all).src.includes(srcOf(k));

// ---- 傳功（ROADMAP §G）：圓滿以上帶人練同一門，對方熟練 +15，每門每對一次，好感 +6 ----
// v1.8 降頻（ROADMAP I-4）：基礎分 80→60；同一對 pairDays 日內不再傳；門派當日每傳一次，下一次分數 ×sat（飽和衰減）
export const PASS = { minTier: 3, gain: 0, apprBonus: 0, aff: 6, dur: 20, base: 60, pairDays: 2, sat: 0.3, perDay: 2, why: '傳功' }; /* 舊活動只供舊任務讀取，不再直接給熟練 */
export const passToday = (s) => (s.passN?.day === s.day ? s.passN.n : 0);
export const passScore = (s) => (passToday(s) >= PASS.perDay ? 0 : PASS.base * PASS.sat ** passToday(s));
const pairRecent = (s, a, b) => Object.entries(s.passed || {}).some(([k, day]) => k.startsWith(`${a}>${b}:`) && s.day - day < PASS.pairDays);
const able = (d) => d && d.role !== 'laborer' && !d.away && d.adult !== false;
export function passPick(s, d) {
  if (!able(d) || (d.passDay === s.day) || passToday(s) >= PASS.perDay) return null; /* v1.8：門派每日傳功上限 */ const P = s.passed || {};
  if (s.hermitage) for (const pupil of s.ds.filter(p => p !== d && able(p) && !p.task?.partner && p.task?.act !== 'meditate')) {
    const volume = teachableHermitageBook(s, d, pupil);
    if (volume && !pairRecent(s, d.id, pupil.id) && !P[`${d.id}>${pupil.id}:${volume.art}`]) return { p: pupil, art: volume.art }; // R3：有真本領者沿既有雙人傳功時鐘教授卷中武學。
  }
  if (s.hermitage) return null; // 隱居局只教會者真會且前置已滿的卷，不落回舊門派通用傳功候選。
  const arts = ARTS.filter((a) => !a.deprecated && (!a.secret || (a.derived && s.sect?.tree.includes(a.id))) && (!a.classic || (a.own24 && s.sect?.tree.includes(a.id))) && artTier(d, a.id) >= PASS.minTier); /* loop168 本門專屬武學可傳功 */ /* loop165 合參絕學可作本門絕學傳功 */ /* 名俠絕學走各自劇情，不走一般傳功 */ if (d.stree) arts.sort((x, y) => d.stree.includes(y.id) - d.stree.includes(x.id)); /* loop164 本門優先傳 */ if (!arts.length) return null;
  const cands = s.ds.filter((p) => p !== d && able(p) && !p.task?.partner && p.task?.act !== 'meditate').sort((x, y) => (y.master === d.id) - (x.master === d.id) || aff(s, d, y) - aff(s, d, x));
  for (const p of cands) if (!pairRecent(s, d.id, p.id)) for (const a of arts) if (artTier(p, a.id) < PASS.minTier && !P[`${d.id}>${p.id}:${a.id}`] && !chiefLocked24(p, a)) return { p, art: a.id }; /* loop171 鎮派絕學只傳掌門／首徒／魁首 */
  return null;
}
export const passReserve = (s) => { s.passN = { day: s.day, n: passToday(s) + 1 }; }; // 開始傳功即佔當日名額（多人同時起手不會超量）
export function passDo(s, d, p, art) {
  const key = `${d.id}>${p.id}:${art}`; (s.passed ??= {}); if (s.passed[key]) return false; s.passed[key] = s.day; d.passDay = s.day;
  const a = learnArt(p, art, s.t); relAdd(s, d, p, PASS.aff); addMem(s, d, p, 'pass', a.name); recordSocialEvent(s, 'taught', d, p, a.name); log(s, `【傳授】${d.name}帶${p.name}練「${a.name}」`);
  if (s.hermitage) {
    const volume = HERMITAGE_VOLUMES.find(v => v.art === art && v.stage);
    if (volume) { p.awakeningStage = Math.max(p.awakeningStage || 0, volume.stage); s.hermitage.stage = Math.max(s.hermitage.stage || 0, volume.stage);
      if (volume.stage === 4 && volume.route === 'gumu') { s.hermitage.contemplateUntil = s.t + ACTIVITIES.meditate.dur; s.hermitage.contemplateActors = [d.id, p.id]; } }
  }
  return true;
}

// ---- 收徒：內門／首徒對好感夠的外門收一名徒弟；徒弟在師父在場時練功 ×1.15 ----
export const APPR = { aff: 30, max: 1, trainMul: 1 };
const isSenior = (d) => d.role === 'inner' || d.role === 'head';
export const pupilsOf = (s, m) => s.ds.filter((d) => d.master === m.id);
export function apprCands(s, m) { if (!isSenior(m) || m.away || pupilsOf(s, m).length >= APPR.max) return []; return s.ds.filter((d) => d !== m && d.role === 'outer' && !d.master && aff(s, m, d) >= APPR.aff && aff(s, d, m) >= APPR.aff); }
export function takePupil(s, m, d) { if (!d || d.master || !isSenior(m) || pupilsOf(s, m).length >= APPR.max || d.role !== 'outer') return false; d.master = m.id; relAdd(s, m, d, 4); addMem(s, m, d, 'apprentice'); log(s, `【收徒】${m.name}收${d.name}為徒`); return true; }
export function apprDaily(s) { for (const m of s.ds) { const c = apprCands(s, m).sort((x, y) => aff(s, m, y) - aff(s, m, x))[0]; if (c) takePupil(s, m, c); } }
export const apprMul = () => 1;

// ---- 名功門內師徒傳授（#415 N12）----
// MUD learn 模型：師父真的花時間教（每日預約半日 teachCool，這段時間不接別的活），
// 徒弟這門名功在師父教的時段裡修練加速（TEACH_ART.mul），火候仍靠自己練，不直接給檔。
// 受者須是師父的徒弟「且」好感達 TEACH_ART.aff；最高只到傳者層級 − 1。
// 每位師父每門名功一生只收一位傳人（風清揚只傳令狐沖）。
// 名功只算 secret＋classic 的原著名功；辟邪須受者已付自宮代價，獨孤九劍限華山一脈。
export const TEACH_ART = { aff: 60, mul: 1.4, minTier: 3, normalTier: 2, session: DAY / 2 };
export function isFamousArt(a) {
  if (!a) return false;
  const art = typeof a === 'string' ? artById(a) : a;
  return !!(art && art.secret && art.classic && !art.derived);
}
/* #417 N13：每局都有 s.hs，不能拿來當條件。華山劇情確實走過＝令狐沖上過思過崖或風清揚現身過。 */
export const hsWalked = (s) => !!(s?.hs && (s.hs.siguo || s.hs.feng || s.hs.fengLeft));
function costOk(s, d, a, m) {
  if (a.id === 'bixie') return d.duanqing != null;
  if (a.id === 'dugu') return hsWalked(s) || (m?.sectId === 'huashan' && d?.sectId === 'huashan');
  return true;
}

export function canTeachArt(s, m, d, artId) {
  if (!m || !d || m === d || m.removed || d.removed) return false;
  if (m.away || d.away) return false;
  if ((m.hp ?? 100) <= 25 || (d.hp ?? 100) <= 25) return false;
  if (m.role === 'laborer' || d.role === 'laborer') return false;
  const a = typeof artId === 'string' ? artById(artId) : artId;
  if (!a || a.deprecated || (a.secret && !isFamousArt(a))) return false;
  const mTier = artTier(m, a.id);
  if (mTier < (isFamousArt(a) ? TEACH_ART.minTier : TEACH_ART.normalTier)) return false;
  const heir = m.taught28?.[a.id];
  if (isFamousArt(a) && heir && heir !== d.id) return false; /* 一門名功一生只傳一人 */
  if (d.master !== m.id) return false;
  if (aff(s, m, d) < TEACH_ART.aff || aff(s, d, m) < TEACH_ART.aff) return false; /* 師徒「且」好感 */
  if (!costOk(s, d, a, m)) return false;
  if (gated(d, a)) return false;
  if (reqMissing(d, a).length > 0) return false;
  const ceilingArts = a.learn?.ceiling?.arts || CEILING[a.id];
  if (ceilingArts?.length) {
    const maxC = Math.max(-1, ...ceilingArts.map((cId) => artTier(d, cId)));
    if (maxC < 0) return false;
  }
  const dTier = d.arts?.[a.id] ? artTier(d, a.id) : -1;
  if (dTier >= mTier - 1) return false;
  if (m.teaching && m.teaching.pupil !== d.id) return false;
  if (s?.ds?.some((o) => o !== m && o.teaching?.pupil === d.id)) return false;
  return true;
}

export function startTeachArt(s, m, d, artId) {
  if (!canTeachArt(s, m, d, artId)) return false;
  const id = typeof artId === 'string' ? artId : artId.id;
  m.teaching = { pupil: d.id, art: id };
  if (isFamousArt(id)) (m.taught28 ||= {})[id] = d.id;
  if (!d.arts?.[id]) { learnArt(d, id, s.t); growEnsure(d); log(s, `【傳授】${m.name}開始教${d.name}《${artById(id).name}》`); addMem(s, m, d, 'pass', artById(id).name); recordSocialEvent(s, 'taught', m, d, artById(id).name); }
  return true;
}

export function stopTeachArt(s, m) {
  if (!m || !m.teaching) return false;
  m.teaching = null;
  return true;
}

export function teachCandidates(s, m) {
  if (!m || m.away || m.removed || (m.hp ?? 100) <= 25 || m.role === 'laborer') return [];
  const arts = ARTS.filter((a) => !a.deprecated && (!a.secret || isFamousArt(a)) && artTier(m, a.id) >= (isFamousArt(a) ? TEACH_ART.minTier : TEACH_ART.normalTier)).sort((a, b) => Number(isFamousArt(b)) - Number(isFamousArt(a)));
  if (!arts.length) return [];
  const cands = [];
  for (const d of s.ds) {
    if (d === m || d.away || d.removed || (d.hp ?? 100) <= 25 || d.role === 'laborer') continue;
    for (const a of arts) if (canTeachArt(s, m, d, a.id)) cands.push({ d, art: a.id });
  }
  cands.sort((x, y) => (y.d.master === m.id) - (x.d.master === m.id) || aff(s, m, y.d) - aff(s, m, x.d));
  return cands;
}

/* 一個傳授時段：師父預約半日（teachCool），不直接給檔。 */
export function teachStage(s, m, d, artId) {
  if (!canTeachArt(s, m, d, artId)) return false;
  const a = typeof artId === 'string' ? artById(artId) : artId;
  if (!m.teaching) startTeachArt(s, m, d, a.id);
  m.teachCool = TEACH_ART.session;
  m.reason = `傳授${d.name}《${a.name}》`;
  relAdd(s, m, d, 1);
  return true;
}
/* #417 N13：傳功是師徒兩人的共同任務（sim.mjs teachStep）。師父在外功場（task.act === 'teach'、phase 'do'），
   徒弟也在他身旁練這門（task.teach === 師父 id）時，徒弟才拿 ×TEACH_ART.mul；師父手上有別的活一律不加速。 */
export const TEACH_NEAR = 60;
export function teachMul(s, d, artId) {
  const m = s?.ds?.find((o) => o.teaching?.pupil === d.id);
  if (!m || m.away || !(m.teachCool > 0) || (artId && m.teaching.art !== artId)) return 1;
  if (artTier(d, m.teaching.art) >= artTier(m, m.teaching.art) - 1) return 1;
  if (m.task?.act !== 'teach' || m.task.phase !== 'do' || d.task?.teach !== m.id) return 1;
  if (!m.pos || !d.pos || Math.hypot(m.pos[0] - d.pos[0], m.pos[1] - d.pos[1]) > TEACH_NEAR) return 1;
  return TEACH_ART.mul;
}

export function teachDaily(s) {
  for (const m of s.ds) {
    if (!m.teaching) {
      const cand = teachCandidates(s, m)[0];
      if (cand) startTeachArt(s, m, cand.d, cand.art);
    }
    if (m.teaching) {
      const { pupil, art } = m.teaching;
      const d = s.ds.find((x) => x.id === pupil);
      if (d && canTeachArt(s, m, d, art)) teachStage(s, m, d, art);
      else { if (d && artById(art)) log(s, `【傳功】${m.name}傳${d.name}《${artById(art).name}》告一段落`); m.teaching = null; }
    }
  }
}

// ==== （原 clique.mjs）====
// loop20 好友圈成派：彼此好感都 ≥ CLQ.aff 的一群（≥2 人、每人至多一派）結成「同門小派」。
// 效果（新路徑另加一小筆，不改既有倍率）：①同派有人同時在做同一件事（練功／打坐／切磋）→ 技藝另加 bonus；②剿寨優先派同派的人同行。
// 只在 s.draw（人以群分）時生效；golden 不變。
export const CLQ = { aff: 85, leave: 70, bonus: 0.1, acts: ['train', 'meditate', 'spar'] };
const pool = (s) => s.ds.filter((d) => !d.removed && d.role !== 'laborer' && d.adult !== false);
const ok = (s, g, th) => g.every((a, i) => g.every((b, j) => j <= i || aff(s, a, b) >= th));
// 每日：先檢查舊派（低於 leave 就散），再用貪婪法從好感最高的一對長出新派
export function cliqueDaily(s) {
   const ds = pool(s), byId = (id) => ds.find((d) => d.id === id); const old = s.cliques || [];
  const keep = []; for (const c of old) { const g = c.ids.map(byId).filter(Boolean); if (g.length >= 2 && ok(s, g, CLQ.leave)) keep.push({ ...c, ids: g.map((d) => d.id) }); else log(s, `【小派】${c.name}漸漸疏遠，散了。`); }
  const used = new Set(keep.flatMap((c) => c.ids)); const pairs = [];
  for (const a of ds) for (const b of ds) if (a.id < b.id && !used.has(a.id) && !used.has(b.id) && aff(s, a, b) >= CLQ.aff) pairs.push([aff(s, a, b), a, b]);
  pairs.sort((x, y) => y[0] - x[0]);
  for (const [, a, b] of pairs) { if (used.has(a.id) || used.has(b.id)) continue; const g = [a, b];
    for (const o of ds) if (!used.has(o.id) && !g.includes(o) && ok(s, [...g, o], CLQ.aff)) g.push(o);
    for (const d of g) used.add(d.id); const c = { ids: g.map((d) => d.id), name: `${g[0].name}一派`, day: s.day }; keep.push(c);
    log(s, `【小派】${g.map((d) => d.name).join('、')}意氣相投，結成「${c.name}」，從此同進同退。`); (s.cliqueN ??= 0); s.cliqueN++; }
  s.cliques = keep;
}
export const cliqueOf = (s, d) => (s.cliques || []).find((c) => c.ids.includes(d.id)) || null;
export const mates = (s, d) => { const c = cliqueOf(s, d); return c ? c.ids.filter((id) => id !== d.id) : []; };
// 活動完成時：同派有人正在做同一件事（或切磋對手即同派）→ 技藝另加 bonus
export function cliqueTrain(s, d, act, skill, grow) {
  if (!skill || !CLQ.acts.includes(act)) return false; const m = mates(s, d); if (!m.length) return false;
  const with_ = s.ds.some((o) => m.includes(o.id) && (o.task?.act === act || d.task?.partner === o.id)); if (!with_) return false;
  for (const [k, v] of Object.entries(skill)) grow(s, d, k, v * CLQ.bonus); s.cliqueBoost = (s.cliqueBoost || 0) + 1; return true;
}

// ==== （原 v10.mjs）====
// v1.0：秘笈殘章合成、喜好（飲食合一）、志向、頭頂單一狀態圖示
// ---- 秘笈殘章 → 可學的武學 ----
export const MANUALS = { page1: { need: 5, grade: 1, name: '凡階秘笈' }, page2: { need: 3, grade: 2, name: '精階秘笈' } };
export const canAssemble = (s, k) => (s.res[k] || 0) >= MANUALS[k].need;
export function assemble(s, k) {
  if (!canAssemble(s, k)) return { ok: false, why: `殘頁不足 ${MANUALS[k].need} 張` };
  const pool = ARTS.filter((a) => !a.deprecated && !a.secret && !a.chiefOnly24 && !(a.own24 && !s.sect?.tree.includes(a.id)) && a.grade === MANUALS[k].grade); /* loop168 他派專屬不入殘頁 */ if (!pool.length) return { ok: false, why: '無可對應武學' };
  const known = (a) => s.ds.filter((d) => d.arts?.[a.id]).length, art = pool.reduce((b, a) => (known(a) < known(b) ? a : b));
  resAdd(s, k, -MANUALS[k].need); (s.manuals ??= []).push({ k, art: art.id });
  log(s, `【秘笈】${MANUALS[k].need} 張${k === 'page1' ? '凡階' : '精階'}殘頁湊成《${art.name}》${MANUALS[k].name}，可指定弟子研讀`); return { ok: true, art: art.id };
}
export function learnManual(s, i, did, think) {
  const m = s.manuals?.[i], d = s.ds.find((x) => x.id === did); if (!m || !d) return { ok: false, why: '查無' };
  const a = artById(m.art); if (d.arts?.[a.id]) return { ok: false, why: `${d.name}已會${a.name}` };
  const miss = reqMissing(d, a); if (miss.length) return { ok: false, why: `${d.name}還差：${miss.join('、')}` };
  learnArt(d, a.id, s.t); s.manuals.splice(i, 1); think?.(s, d, 'learned'); log(s, `${d.name}研讀秘笈，學會了${a.name}`); return { ok: true };
}
// ---- 喜好：吃與喝合成一套；嗜酒者必好酒 ----
export const FOODS = ['紅燒肉', '叫化雞', '陽春麵', '饅頭鹹菜'], DRINKS = ['女兒紅', '竹葉青', '清茶'];
const h = (x) => [...String(x)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
export function likesOf(d) {
  if (!d.likes) { const k = h(d.id + d.name); d.likes = { food: FOODS[k % FOODS.length], drink: (d.personality || []).includes('drinker') ? '女兒紅' : DRINKS[(k >>> 3) % DRINKS.length] }; }
  return d.likes;
}
export const menuOf = (s) => { const day = Math.floor(s.t / DAY); return { food: FOODS[day % FOODS.length], drink: DRINKS[day % DRINKS.length] }; };
export function likeMeal(s, d, think) {
  const L = likesOf(d), m = menuOf(s), hit = []; if (L.food === m.food) { think(s, d, 'likeFood'); hit.push('food'); }
  if (L.drink === m.drink) { think(s, d, 'likeDrink'); hit.push('drink'); } return hit;
}
// ---- 志向：由主價值觀生出，達成給一個特質 ----
Object.assign(TRAITS, {
  focused: { name: '專注', desc: '志在武學，練功心無旁騖', mods: { train: 1.15, meditate: 1.1 } },
  loyal: { name: '忠心', desc: '門派興旺就心安', moodBase: 4 },
  righteous: { name: '俠骨', desc: '見不平就出手', mods: { spar: 1.15 } },
  warm: { name: '重情', desc: '有知己相伴，聊天更起勁', mods: { chat: 1.2 }, moodBase: 2 },
  wanderer: { name: '遊俠', desc: '走過的山多了，腳程更穩', moodBase: 3 },
  famed: { name: '揚名', desc: '江湖上有了名號', moodBase: 5 },
});
const kills = (s) => Object.values(s.codex || {}).reduce((a, c) => a + c.kills, 0);
export const ASPIRATIONS = {
  wu: { name: '武學登峰', goal: '任一武學練到第 4 層', ok: (s, d) => topTier(d).t >= 3, trait: 'focused' },
  sect: { name: '光大門楣', goal: '本門名聲達 30', ok: (s) => (s.rep || 0) >= 30, trait: 'loyal' },
  xia: { name: '行俠仗義', goal: '本門累計擊倒 30 個敵人', ok: (s) => kills(s) >= 30, trait: 'righteous' },
  qing: { name: '知己相伴', goal: '與任一人好感達 60', ok: (s, d) => Object.entries(s.aff || {}).some(([k, v]) => k.startsWith(d.id + '>') && v >= 60), trait: 'warm' },
  free: { name: '遊遍群山', goal: '親自巡山走到 700 步', ok: (s, d) => (d.best || 0) >= 700, trait: 'wanderer' },
  fame: { name: '名動江湖', goal: '本門巡山紀錄達 950 步（過斷崖）', ok: (s) => (s.records?.sect || 0) >= 950, trait: 'famed' },
};
export function aspOf(d) {
  if (!d.values) return null;
  if (!d.asp) { const top = Object.entries(d.values).sort((a, b) => b[1] - a[1])[0]?.[0]; if (!ASPIRATIONS[top]) return null; d.asp = { id: top, done: false }; }
  return d.asp;
}
export function aspStep(s, think) {
  for (const d of s.ds) { const a = aspOf(d); if (!a || a.done) continue; const A = ASPIRATIONS[a.id]; if (!A.ok(s, d)) continue;
    a.done = true; a.t = Math.round(s.t); if (!(d.personality || []).includes(A.trait)) d.personality.push(A.trait); if (d.known && !d.known.includes(A.trait)) d.known.push(A.trait);
    think(s, d, 'aspDone'); log(s, `【志向】${d.name}「${A.name}」得償，養成「${TRAITS[A.trait].name}」`); }
}
// ---- 地圖可讀性：每顆頭只放一個狀態圖示（優先序：傷 > 餓 > 累 > 心情差 > 違心 > 正在做的事） ----
export function statusIcon(d, actIcon = '') {
  if ((d.hp ?? 100) < 50) return '🩹'; if ((d.needs?.hunger ?? 100) < 20) return '🍚'; if ((d.needs?.energy ?? 100) < 15) return '💤';
  if ((d.mood ?? 50) < 25) return '☁'; if (d.wexin >= 2) return '😣'; return actIcon;
}
