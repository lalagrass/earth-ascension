// 單一權威模擬核心：純 JS、無 DOM，可在 Node 測試。
import { readStudy, NG, addQi, spendQi, qiMax, shieldHit, breakChance, growInit, growEnsure, settleGrowth, seedArts, gainArt, learnArt, moveMul, effectTier, effectMul, artById, btReady, resolveBreak, cdMul, visTier, variantOf, artOfMove, comprehend, comprehendVariant, btBoost } from './arts.mjs';
import { workStrCap, isWorkAct, seasonOf, demandBoost, repairDamp, econDaily, schoolStep, startSchool, E as econOf, liftBoost, stewardDaily, stewBoar } from './economy.mjs';
import { ART_GAIN, BREAK, EXP, RULES_VERSION, QUESTIONS, REVEAL_AT, TRAITS, MOOD, REP, RECRUIT, RECRUIT_POOL, ECO, HABITAT, POSTS, RAID_EVERY, HUNT_WAVES, WAVE_GAP, DAY, PHASES, SCHEDULE, PLOT_GROW, HARVEST, NODES, EDGES, FACILITIES, ACTIVITIES, MOVES, MONSTERS, WAVES, DISCIPLES, REL_STAGES, BASE_SPEED, ECON, PLAIN, LABOR_ACTS, LABOR_WORK_MUL, ROOT, LABOR_POOL, CHORE_ACTS, QUOTA, PRIO, PROMOTE, PACE, TRIAL_BOAR, SIG_ACTS, RES_NAMES, FOOD_SEC, RARE, LOTS, SCORE, SCORE_POST } from './data.mjs';
import { clone, dist, clamp, relKey, affKey, log, book, resAdd, pillNote, pipeline, mulText } from './util.mjs';
import { think, moodStep, moodTarget, moodParts, traitMul, moodMul, focusMul, moodLabel, revealStep, knownTraits, relStage, relAdd, compat, aff, initPair, coTrain, askStrong, pairBoost, drawBoost, pickChatMate, admire, archRecruit } from './social.mjs';
import { expStep, startExpedition as startExp0, canExpedition, seeEnemy, codexRows, reportText, segAt, ROUTE_END, dpsOf, raidMul, popStep, fogStep, unlockStep, chapterStep } from './world.mjs';
import { BAND, canDefend, boarRam, fenceUp, fenceHit, repairScore, repairDone, FENCE, FENCE_FAC, finishFenceSite, threatDaily, threatStep, raidResolve, bandStep, lairDaily, lairStep } from './threat.mjs';
import { addMem, chatLine, passPick, passDo, PASS, passScore, passReserve, apprDaily, apprMul, aspStep, likeMeal, likesOf, cliqueDaily, cliqueTrain } from './bonds.mjs';
import { xiaStep, onCook, xiaInit, hsStep, hsInit } from './wuxia.mjs';
import { jhStep, jhInit, jhevDaily } from './jianghu.mjs';
import { sectStep, sectInit, sectRecruit, genStep, genInit, removeDisciple } from './sect.mjs';
import { applyHero, valueMul, easeWexin, onAssign, heroStep, heroAuto, pairBonus, awaken, econCoin, cookBonus } from './hero.mjs';
import { SAVE_VERSION, freshV095 } from './save.mjs';
import { cancelTask, removeActor, whAvail, freeSlot, reserve, sweepResv, actorBusy, needStep, boredMul, markDone, durOf, holder, CORE, STOCK_RESV, stockKey, stockReserved } from './core.mjs';
/* loop140 */
export { canExpedition, codexRows, reportText, segAt, ROUTE_END, dpsOf };
const H = { rand: (s) => rand(s), cancelTask: (s, d, w) => cancelTask(s, d, w), grow: (s, d, k, a, src) => grow(s, d, k, a, src), think: (s, d, id) => think(s, d, id), gate: NODES.gate };
export { recallExpedition } from './world.mjs';
export const startExpedition = (s, ids, opt = {}) => startExp0(s, ids, opt, H);
export { think, moodTarget, moodParts, traitMul, moodMul, focusMul, moodLabel, knownTraits, relStage, relAdd, compat, aff, seasonOf, relKey, log };

const EH = { rand: (s) => rand(s), cancelTask: (s, d, w) => cancelTask(s, d, w), think: (s, d, id) => think(s, d, id), removeDisciple: (s, d, w) => removeDisciple(s, d, w), gate: NODES.gate };
export { SAVE_VERSION };

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

export const facDef = (id) => (id === 'fence' ? FENCE_FAC : FACILITIES.find((f) => f.id === id)); // loop11 柵牆工地
export const facStage = (s, id) => { const S = facDef(id).stages; return S[Math.min(s.fac[id]?.stage || 0, S.length - 1)]; };

// loop143（v2.2 baseline）：已驗證、原本預設勾選的規則轉正；開局畫面的新局帶 v22:true 一律開（明寫 false 仍可關，供 A/B）。
// createState(seed) 不帶 spec、或 { legacyGolden: true } 時不套用，保護舊 golden 與舊測試。
export const BASELINE_V22 = Object.freeze({ grow: true, growdr: true, neigong: true, ngshield: true, prof: true, laborgrow: true, valor: true, valormid: true, rumor: true, readwu: true, comprehend: true, mentor: true, mpool: true, cotrain: true, cofun: true, paypill: true, longwatch: true, masterask: true, letterask: true, cropcare: true, mfit: true, jhrefuse: true, qshare: true, jhui: true, jhev: true, peace: true, lairpow: true, lift: true, bt25: true, draw: true });
export function createState(seed = 1, heroSpec = null) {
  if (heroSpec?.legacyGolden && !heroSpec.kind) heroSpec = null;
  if (heroSpec?.v22 && !heroSpec.legacyGolden) heroSpec = { ...BASELINE_V22, ...heroSpec };
  const s = {
    v: SAVE_VERSION, rules: RULES_VERSION, seed, t: 0, xia: xiaInit(), hs: hsInit(), jh: jhInit(), res: { wood: 0, stone: 0, coin: ECON.coinStart, food: 6, herb: 0, veg: 0, water: 0, pill: 0, tiemu: 0, lingshi: 0 }, lots: { n: LOTS.start, bought: 0 }, plots: Array.from({ length: 4 }, () => ({ st: 'empty', g: 0 })),  cap: { wood: 12, stone: 12, water: 12, pill: 10 }, day: 1, ledger: { day: 1, in: {}, out: {} }, ledgerPrev: null, laborGone: [],
    fac: Object.fromEntries(FACILITIES.map((f) => [f.id, { stage: 0, site: null }])),
    ds: DISCIPLES.map((d, i) => mkDisciple(d, i)),
    rel: {}, aff: {}, families: [], eco: Object.fromEntries(Object.entries(ECO).map(([k, e]) => [k, { n: e.start, timer: 0 }])), wild: [], post: 'guard', raidT: 0, rep: 0, log: [], hunt: null, mons: [], fx: [], rngN: 0,
  };
  for (let i = 0; i < s.ds.length; i++) for (let j = i + 1; j < s.ds.length; j++) initPair(s, s.ds[i], s.ds[j], 10);
  freshV095(s);
  log(s, '師徒三人來到山腳一間破道館。');
  s.hero = null; s.choices = []; s.encExclude = []; s.unlock = []; s.chapter = { done: false }; for (const d of s.ds) d.wu ??= d.root;
  if (heroSpec) applyHero(s, heroSpec, initPair);
  if (heroSpec?.draw) s.draw = true;
  if (heroSpec?.comprehend) s.wu7 = true;
  if (heroSpec?.mentor) s.mentor = true;
  if (heroSpec?.qshare) s.qshare = true;
  if (heroSpec?.mpool) s.mpool = true; /* loop55 高人殘譜 */
  if (heroSpec?.cotrain) s.cotrain = true; /* loop56 同修作伴 */
  if (heroSpec?.grow) s.grow = true; /* loop79 成長分層 */
  if (heroSpec?.stewyard) s.stewyard = true; /* loop95 執事立樁 */
  if (heroSpec?.prof) s.prof = true; /* loop91 熟練度十重 */
  if (heroSpec?.neigong) { s.neigong = true; s.ngshield = true; } /* loop142 一版淘汰：開內功即護體真氣 */ /* loop115 護體真氣 */ /* loop103 最小內功 */
  if (heroSpec?.cofun) s.cofun = true; /* loop62 有伴解悶 */
  if (heroSpec?.longwatch) s.longwatch = true; /* loop67 哨崗久守 */
  if (heroSpec?.paypill) s.paypill = true; /* loop71 欠俸先賣丹 */
  if (heroSpec?.masterask) s.masterask = true; /* loop59 高人指點由我定 */
  if (heroSpec?.stewkit) s.stewkit = true; /* loop60 執事顧灶 */
  if (heroSpec?.letterask) s.letterask = true; /* loop49 挑戰帖由我定奪 */
  if (heroSpec?.cropcare) s.cropcare = true; /* loop47 誰種誰心疼 */
  if (heroSpec?.mfit) s.mfit = true; // loop41 高人因材施教
  if (heroSpec?.jhrefuse) s.jhrefuse = true; // loop40 挑戰帖量力而為 // loop39 人多分攤日課
  if (heroSpec?.jhui) s.jhui = true; // loop34 介面可讀性（純顯示）
  if (heroSpec?.laborgrow) s.laborgrow = true; if (heroSpec?.valor) s.valor = 0; if (heroSpec?.valor && heroSpec?.valormid) s.valormid = true; if (heroSpec?.readwu) s.readwu = true; /* loop140 */ /* loop138 */ /* loop129 勇名 */ /* loop127 勞作練體 */ if (heroSpec?.steward) s.steward = true; if (heroSpec?.rumor) s.rumor = true; if (heroSpec?.grow && heroSpec?.growdr) s.growdr = true; /* loop122 造詣遞減 */ /* loop119 傳聞預警 */ // loop30 執事自主（選用）
  if (heroSpec?.lairpow) s.lairpow = true; // loop29 寨強看戰力（選用）
  if (heroSpec?.lift) s.lift = true; // loop28 心情自救（選用）
  if (heroSpec?.bt25) s.bt25 = true; // loop25 突破排程（選用）
  if (heroSpec?.jhev) s.jhev = true; // loop23 江湖事件（選用）
  if (heroSpec?.peace) s.m9 = true; // loop9 太平與防禦經濟（選用） // loop8 同修請教（選用） // loop7 領悟（選用） // loop6 人以群分（選用）
  if (heroSpec?.v22 && !heroSpec.legacyGolden) s.v22 = true; /* loop143 */
  sectInit(s); s.gen = genInit(); if (heroSpec?.bonus) s.gen.suhuiStart = heroSpec.bonus;
  if (s.grow) growInit(s);
  if (s.prof) for (const d of s.ds) d.pf = 1; /* loop91 */
  if (s.neigong) for (const d of s.ds) { d.ng = 1; d.qi = 0; d.ng2 = 1; } /* loop103 */
  if (s.laborgrow) for (const d of s.ds) d.lg = 1; /* loop127 */
  return s;
}
function mkDisciple(d, i, at = 'court', personality = d.personality || [], known = personality.slice(0, 1)) {
  return seedArts({
      id: d.id, name: d.name, root: d.root ?? 3, rootKnown: true, style: d.style, personality: [...personality], known: [...known], together: 0, mood: MOOD.base, thoughts: [], why: [], adult: d.adult, sprite: d.sprite, traits: d.traits,
      skills: { ...d.skills }, moves: ['fist'], pendingMove: null,
      needs: { energy: 80, hunger: 70 - i * 10, social: 50, fun: 60 }, hp: 100,
      at, pos: [...NODES[at]].map((v, k) => v + (k ? 0 : (i - 1) * 16)), path: [],
      role: 'inner', duties: [...CHORE_ACTS], prio: 'normal', chore: 0, choreDebt: 0, contrib: 0, task: null, order: null, reason: at === 'gate' ? '慕名上山' : '剛到道館', carry: null, cool: 0, walked: 0, face: 1, anim: null,
    });
}
// ---- v0.6 性格與心情 ----
// ---- v0.5 名聲、床位、招收、母版階段 ----
export const isLabor = (d) => d.role === 'laborer';
export const disciples = (s) => s.ds.filter((d) => !isLabor(d));
export const laborers = (s) => s.ds.filter(isLabor);
export const outers = (s) => s.ds.filter((d) => d.role === 'outer');
export const emergency = (s) => s.res.food <= 0 || s.mons.some((m) => m.raid && !m.gone);
// loop39：8 人時內門多、外門少（常 4 外門撐 8 人），日課過半做不完；「人多分攤」開時全派人數 ≥ 外門×QUOTA.shareAt，每位外門日課 −1。
export const shareOn = (s) => !!s?.qshare && s.ds.length >= QUOTA.shareAt * Math.max(1, outers(s).length);
export const quotaOf = (d, s) => QUOTA.points - (shareOn(s) ? 1 : 0) + (d.choreDebt || 0);
// 內門／首徒免雜務：外門已有人手（≥2）才免；缺糧或野豬下山時全員暫時回來幫忙
export const skipsChores = (s, d) => (d.role === 'inner' || d.role === 'head') && outers(s).length >= QUOTA.outerMin && !emergency(s);
export function setDuty(s, id, act, on) { const d = byId(s, id); if (!d || !CHORE_ACTS.includes(act)) return; d.duties = d.duties.filter((a) => a !== act); if (on) d.duties.push(act); }
export function setPrio(s, id, p) { const d = byId(s, id); if (d && PRIO[p]) d.prio = p; }
export function canPromote(s, id) {
  const d = byId(s, id); if (!d || d.role !== 'outer') return { ok: false, why: '不是外門' };
  if (!d.rootKnown) return { ok: false, why: `根骨未明（相處 ${Math.floor(Math.max(d.cowork || 0, d.together || 0))}/${ROOT.revealAt}）` };
  if (d.root < PROMOTE.rootMin) return { ok: false, why: `根骨${ROOT.names[d.root]}，不足入內門` };
  if ((d.contrib || 0) < PROMOTE.contrib) return { ok: false, why: `貢獻不足（${d.contrib || 0}/${PROMOTE.contrib}）` };
  if ((d.trialCool || 0) >= s.day) return { ok: false, why: '考核剛失敗，明日再試' };
  if (d.task?.trial) return { ok: false, why: '考核進行中' };
  const ex = s.ds.filter((o) => (o.role === 'inner' || o.role === 'head') && o.adult).sort((a, b) => b.skills[b.style] - a.skills[a.style])[0];
  if (!ex) return { ok: false, why: '沒有內門可以主考' };
  return { ok: true, d, ex };
}
// 切磋考核：在木樁場對練，結束時結算（根骨×5＋主修＋力氣/2＋雜訊 ≥ 門檻）
export function startTrial(s, id) {
  const c = canPromote(s, id); if (!c.ok) return c; const { d, ex } = c;
  cancelTask(s, d, '去考核'); if (ex.task) cancelTask(s, ex, `主考${d.name}`); d.order = null;
  d.task = { act: 'spar', fac: 'yard', node: 'yard', phase: 'go', partner: ex.id, trial: true }; ex.task = { act: 'spar', fac: 'yard', node: 'yard', phase: 'go', partner: d.id, examiner: true };
  goto(d, 'yard'); goto(ex, 'yard'); d.reason = '入內門切磋考核'; ex.reason = `主考${d.name}`; log(s, `${ex.name}在木樁場主考${d.name}入內門。`); return { ok: true };
}
function resolveTrial(s, d) {
  const score = d.root * 5 + d.skills[d.style] + d.skills.strength / 2 + rand(s) * 10; d.trialScore = Math.round(score);
  if (score >= PROMOTE.pass) { d.role = 'inner'; d.contrib -= PROMOTE.contrib; d.choreDebt = 0; think(s, d, 'promoted'); s.rep = (s.rep || 0) + 2; log(s, `${d.name}通過考核（${d.trialScore}/${PROMOTE.pass}），升入內門！`); }
  else { d.trialCool = s.day + PROMOTE.cooldown - 1; think(s, d, 'trialFail'); log(s, `${d.name}考核未過（${d.trialScore}/${PROMOTE.pass}），明日再來。`); }
}
export { book }; // v1.8 移到 util.mjs（各模組共用）
export function capacity(s) { return FACILITIES.reduce((a, f) => a + (facStage(s, f.id).beds || 0), 0); }
export function recruitNeed(s) { return RECRUIT.baseRep + RECRUIT.stepRep * (disciples(s).length - 3); }
export function canRecruit(s) {
  const next = RECRUIT_POOL.find((p) => !s.ds.some((d) => d.id === p.id)) || econOf(s).pool[0]; /* v1.85 A10：名冊用完後收義學帶回的人 */
  if (!next) return { ok: false, why: '暫無人選' };
  if (disciples(s).length >= capacity(s)) return { ok: false, why: `床位已滿（${disciples(s).length}/${capacity(s)}），先擴建宿舍` };
  if (!next.school && s.rep < recruitNeed(s)) return { ok: false, why: `名聲不足（${s.rep}/${recruitNeed(s)}）` };
  if (s.res.food < RECRUIT.food) return { ok: false, why: `存糧不足 ${RECRUIT.food}` };
  return { ok: true, next };
}
// 三問心印：預設答案取人選天性；答案→前兩個不重複特質為明面，人選天性補為第三（暗，相處 900 秒揭露）
export function defaultAnswers(p) { return QUESTIONS.map((q) => { const i = q.a.findIndex(([, t]) => (p.personality || []).includes(t)); return i < 0 ? 0 : i; }); }
export function personalityFrom(p, answers = defaultAnswers(p)) {
  const shown = []; QUESTIONS.forEach((q, i) => { const t = q.a[answers[i] ?? 0]?.[1]; if (t && !shown.includes(t) && shown.length < 2) shown.push(t); });
  const hidden = (p.personality || []).find((t) => !shown.includes(t));
  return { personality: hidden ? [...shown, hidden] : shown, known: shown };
}
export function recruit(s, answers) {
  const c = canRecruit(s); if (!c.ok) return c;
  const { personality, known } = personalityFrom(c.next, answers);
  if (rand(s) < 0.3) { const x = rand(s) < 0.5 ? 'lazy' : 'stubborn'; if (!personality.includes(x)) personality.push(x); } // v0.97 一般弟子也可能懶散／較真（暗）
  s.res.food -= RECRUIT.food; book(s, 'out', 'food', RECRUIT.food); const d = mkDisciple(c.next, 1, 'gate', personality, known); d.together = 0; Object.assign(d, { role: 'outer', root: 2 + Math.floor(rand(s) * 4), rootKnown: false }); if (s.draw) { const A = archRecruit(() => rand(s)); Object.assign(d, { arch: A.id, root: A.root, wu: A.wu }); if (!d.personality.includes(A.trait)) d.personality.push(A.trait); } /* loop21 原型 */ s.ds.push(d); if (c.next.school) econOf(s).pool.shift();
  for (const o of s.ds) if (o !== d) initPair(s, o, d, 5); sectRecruit(s, d);
  log(s, `${d.name}慕名從村路上山，拜入門下。`); return { ok: true, d };
}
export function mapStage(s) {
  if (s.fac.hall.stage >= 1 && s.fac.yard.stage >= 1) return 'S2';
  if (s.fac.dorm.stage >= 1 && s.fac.kitchen.stage >= 1) return 'S1';
  return 'S0';
}
// v0.95 每 tick 建一次 id→弟子 查表（不入存檔；增人時退回線性搜尋、減人時清表）
const BYID = new WeakMap();
export function byId(s, id) { const m = BYID.get(s); const d = m?.get(id); if (d && !d.removed) return d; const x = s.ds.find((o) => o.id === id); if (x && m) m.set(id, x); return x; }
function rand(s) { const r = rng(s.seed * 7919 + s.rngN++); return r(); }
export function phaseOf(s) { const f = (s.t % DAY) / DAY; let p = PHASES[0]; for (const x of PHASES) if (f >= x[0]) p = x; return { id: p[1], name: p[2], day: Math.floor(s.t / DAY) + 1, frac: f }; }

// ---- 建造 ----
export const MATS = ['wood', 'stone'];
// v1.9 I-2：v1.6 建築佔地；地塊上限 s.lots.n，擴地花錢（每塊 ×LOTS.rise）
export const lotsOf = (s) => (s.lots ??= { n: LOTS.start, bought: 0 });
export const lotsUsed = (s) => FACILITIES.filter((f) => f.v16 && !f.sig && (s.fac[f.id]?.stage > 0 || s.fac[f.id]?.site)).length;
export const lotCost = (s) => Math.round(LOTS.cost * LOTS.rise ** lotsOf(s).bought);
export function lotWhy(s) { const L = lotsOf(s); if (L.n >= LOTS.max) return '山頭已經沒有地可擴'; if (s.res.coin < lotCost(s)) return `錢不夠（擴地 ${lotCost(s)}）`; return null; }
export function buyLot(s) { const w = lotWhy(s); if (w) return { ok: false, why: w }; const c = lotCost(s), L = lotsOf(s); resAdd(s, 'coin', -c); L.n++; L.bought++; log(s, `擴地：花 ${c} 錢整出一塊新地（地塊 ${lotsUsed(s)}/${L.n}）`); return { ok: true, c }; }
export function buildWhy(s, id) {
  const f = facDef(id), st = s.fac[id], next = f.stages[st.stage + 1];
  if (!next) return '已到頂'; if (st.site) return '施工中'; if (f.sig || next.noBlueprint) return '鎮派建築走門派面板';
  if (next.rep && (s.rep || 0) < next.rep) return `名聲不足（${Math.floor(s.rep || 0)}/${next.rep}）`;
  for (const [k, v] of Object.entries(next.rare || {})) if ((s.res[k] || 0) < v) return `${RARE[k]}不足（${s.res[k] || 0}/${v}，巡山遠段才撿得到）`;
  if (f.v16 && st.stage === 0 && lotsUsed(s) >= lotsOf(s).n) return `沒有空地（${lotsUsed(s)}/${lotsOf(s).n}），先擴地`;
  if (s.res.coin < (next.cost.coin || 0)) return `錢不夠（${next.cost.coin}）`;
  return null;
}
export function startBuild(s, id) {
  const f = facDef(id), st = s.fac[id], next = f.stages[st.stage + 1];
  if (buildWhy(s, id)) return false; // v1.6 鎮派建築只能走門派面板；v1.9 名聲／稀有料／地塊
  const coin = next.cost.coin || 0;
  s.res.coin -= coin; book(s, 'out', 'coin', coin);
  for (const [k, v] of Object.entries(next.rare || {})) resAdd(s, k, -v);
  const need = Object.fromEntries(MATS.map((k) => [k, next.cost[k] || 0]));
  st.site = { need, delivered: { wood: 0, stone: 0 }, reserved: { wood: 0, stone: 0 }, work: 0, workNeed: next.work, paused: false };
  log(s, `立藍圖：${f.name} → ${next.name}（收集包：${MATS.filter((k) => need[k]).map((k) => `${k === 'wood' ? '木' : '石'} ${need[k]}`).join('、')}${coin ? `，香火錢 ${coin} 已付` : ''}；工時 ${next.work}s）`);
  return true;
}
export const missingOf = (v, k) => v.need[k] - v.delivered[k] - v.reserved[k];
export const siteReady = (v) => MATS.every((k) => v.delivered[k] >= v.need[k]);
// 暫停工地：在途的人放下手邊搬運，料退回院倉；已運到工地料堆的料留在原地
export function togglePause(s, id) {
  const site = s.fac[id]?.site; if (!site) return false; site.paused = !site.paused;
  if (site.paused) for (const d of s.ds) if (d.task?.act === 'build' && d.task.fac === id) cancelTask(s, d, '工地暫停');
  log(s, `${facDef(id).name}工地${site.paused ? '暫停' : '復工'}`); return true;
}
function finishBuild(s, id) {
  if (id === 'fence') { finishFenceSite(s); return; } // loop11
  const f = facDef(id), st = s.fac[id]; st.stage++; st.site = null; s.rep = (s.rep || 0) + REP.build;
  for (const d of s.ds) think(s, d, 'newLook'); log(s, `完工：${f.name}成了「${f.stages[st.stage].name}」${f.stages[st.stage].offers.length ? '，解鎖：' + f.stages[st.stage].offers.map((a) => ACTIVITIES[a].name).join('、') : ''}`);
}
const siteOf = (s) => { const e = Object.entries(s.fac).find(([, v]) => v.site && !v.site.paused); return e ? [e[0], e[1].site] : null; };

// ---- 指令 ----
export function setStyle(s, id, st) { const d = byId(s, id); if (d && (st === 'palm' || st === 'leg')) d.style = st; }
export function setOrder(s, id, order) {
  const d = byId(s, id); if (!d) return false;
  if (order && order !== 'hunt' && !ACTIVITIES[order]) return false;
  d.order = order || null; cancelTask(s, d, '玩家改派');
  return true;
}

// ---- 效用 AI ----
// 可被邀聊：無玩家指派、未負重、未在施工/狩獵/歇息/聊天中
function chatMates(s, d) { return s.ds.filter((o) => o !== d && !o.away && o.task?.act !== 'trial' && !o.order && o.hp > 30 && !o.carry && !['build', 'hunt', 'rest', 'chat', 'spar', 'learn', 'encourage', 'meditate'].includes(o.task?.act) && o.task?.phase !== 'return' && !actorBusy(s, o.id)); }
function offered(s, act) { return FACILITIES.filter((f) => facStage(s, f.id).offers.includes(act)); }
// v1.5：依登錄表找「有空 slot」的設施；床滿了就打地鋪（大廳 floor，明確記帳、不算床位）
function bestFac(s, d, act) {
  const fs = offered(s, act).filter((f) => !facStage(s, f.id).laborOnly || isLabor(d)); if (!fs.length) return null;
  if (act === 'rest') fs.sort((a, b) => (facStage(s, b.id).restRate || 0) - (facStage(s, a.id).restRate || 0));
  if (act === 'meditate') fs.sort((a, b) => (facStage(s, b.id).medEase || 1) - (facStage(s, a.id).medEase || 1)); // v1.6 靜室優先，滿了才回外功場
  for (const f of fs) { const key = freeSlot(s, f.id, act, d); if (key) return { f, key }; }
  if (act === 'rest') { const f = facDef('hall'); return { f, key: `hall:floor:${d.id}`, floor: true }; }
  return null;
}
// ---- v1.6 資料驅動的建築活動：條件、每日上限、效果解讀 ----
const GEN_ACTS = Object.entries(ACTIVITIES).filter(([, A]) => A.gen);
export const GEN_COND = { always: () => true, injured: (s, d) => d.hp < 60, herb2: (s) => s.res.herb >= 2 && s.res.pill < s.cap.pill, water: (s) => s.res.water < s.cap.water, bell: (s) => phaseOf(s).id === 'dawn' };
export const actDef = (s, act) => (act === 'sig' ? (SIG_ACTS[s.sect?.id] ? { ...ACTIVITIES.sig, ...SIG_ACTS[s.sect.id] } : null) : ACTIVITIES[act]);
const genOf = (s, act, A) => { if (act !== 'sig') return A.gen; const S = SIG_ACTS[s.sect?.id]; return S && { ...A.gen, why: S.why, perDay: S.perDay }; };
const dayOk = (s, act, n) => { if (!n) return true; const c = s.daily?.[act]; return !c || c.day !== s.day || c.n < n; };
const dayUse = (s, act) => { const D = (s.daily ??= {}), c = D[act]; if (!c || c.day !== s.day) D[act] = { day: s.day, n: 1 }; else c.n++; };
// 效果：use 不夠就改用 alt；全部由資料決定，無亂數
export function applyEff(s, d, E, actName) { if (!E) return;
  if (E.use && Object.entries(E.use).some(([k, v]) => (s.res[k] || 0) < v)) return applyEff(s, d, E.alt, actName);
  for (const [k, v] of Object.entries(E.use || {})) { s.res[k] -= v; book(s, 'out', k, v); if (k === 'pill') pillNote(s, 'used', v); }
  for (const [k, v] of Object.entries(E.res || {})) { const nv = Math.min(s.cap[k] ?? Infinity, (s.res[k] || 0) + v); const got = nv - (s.res[k] || 0); book(s, 'in', k, got); s.res[k] = nv; if (k === 'pill') pillNote(s, 'made', got); }
  if (E.hp) d.hp = clamp(d.hp + E.hp, 0, 100); if (E.mood) d.mood = clamp(d.mood + E.mood, 0, 100); if (E.rep) s.rep = Math.round(((s.rep || 0) + E.rep) * 10) / 10;
  if (E.wexin) for (let i = 0; i < E.wexin; i++) easeWexin(s, d);
  if (E.allMood) { for (const o of s.ds) if (!o.away) o.mood = clamp(o.mood + E.allMood, 0, 100); log(s, `${d.name}敲響晨鐘，全派精神一振`); }
  if (E.watch) s.watch = s.t;
  if (E.log !== false && (E.use || E.res || E.hp)) log(s, `${d.name}${actName}${E.res ? '：' + Object.entries(E.res).map(([k, v]) => `${RES_NAMES[k] || k}+${v}`).join('、') : ''}${E.hp ? `：氣血+${E.hp}` : ''}${E.use ? `（用${Object.entries(E.use).map(([k, v]) => `${RES_NAMES[k] || k}${v}`).join('、')}）` : ''}`); }
// ---- v1.7 打分解讀器：情境 c、前提 PRED、數值規格 valOf、理由模板 fillWhy（資料在 score-data.mjs） ----
function scoreCtx(s, d) {
  const n = d.needs, others = chatMates(s, d), pp = passPick(s, d), bt = btReady(d, s.t), site0 = siteOf(s)?.[1];
  const short = (k) => !!(site0 && site0.need[k] > site0.delivered[k] + site0.reserved[k] + whAvail(s, k));
  const low = d.adult && d.mood >= 45 ? others.filter((o) => o.mood < 35).sort((a, b) => a.mood - b.mood)[0] : null, site = siteOf(s);
  const haul = !!site && MATS.some((k) => missingOf(site[1], k) > 0 && s.res[k] > 0);
  return { s, d, n, tr: d.traits, others, pp, low, bt, fun: n.fun ?? 60, food: s.res.food, negWexin: -(d.wexin || 0), ph: phaseOf(s).id,
    shortWood: short('wood'), shortStone: short('stone'), haul, site, PASS, FS: FOOD_SEC, passScore: pp ? passScore(s) : 0,
    wood: s.res.wood + s.ds.reduce((a, o) => a + (o.task?.act === 'chop' ? 1 : 0), 0), stone: s.res.stone + s.ds.reduce((a, o) => a + (o.task?.act === 'quarry' ? 1 : 0), 0),
    passWhy: pp ? `${PASS.why}：帶${pp.p.name}練「${artById(pp.art).name}」` : '', pendingName: d.pendingArt ? artById(d.pendingArt).name : '', btName: bt ? artById(bt).name : '', buildWhy: haul ? '把料搬到工地料堆' : '料齊了，去施工' };
}
export const PRED = {
  tired: (c) => c.d.tired, wake: (c) => c.n.energy < CORE.wakeAt, hurt: (c) => c.d.hp < 40, hasFood: (c) => c.s.res.food > 0, foodLow: (c) => foodLow(c.s), starving: (c) => !!c.d.famished || c.n.hunger < 15, /* v1.7 遲滯：餓昏後吃到 50 才解除 */ hungry: (c) => c.n.hunger < 30,
  others: (c) => c.others.length > 0, pp: (c) => !!c.pp, dull: (c) => c.fun < 25, encourageOk: (c) => !!c.low, pending: (c) => !!c.d.pendingArt,
  btOk: (c) => !!c.bt && c.d.mood >= BREAK.moodMin && c.n.energy >= BREAK.energyMin, wexin: (c) => c.d.wexin > 0,
  sparOk: (c) => (facStage(c.s, 'yard').offers.includes('spar') || !!c.s.wu7) /* loop15：領悟開時空地也能徒手過招 */ && c.n.energy > 45 && c.others.some((o) => o.needs.energy > 45),
  woodRoom: (c) => c.wood < c.s.cap.wood, stoneRoom: (c) => c.stone < c.s.cap.stone, shortWood: (c) => c.shortWood, shortStone: (c) => c.shortStone,
  ripe: (c) => c.s.plots.some((p) => p.st === 'ripe'), siteWork: (c) => !!c.site && (c.haul || siteReady(c.site[1])),
  nightRest: (c) => c.ph === 'night' && c.n.energy < 95, cookable: (c) => vegFree(c.s) >= 2 && c.s.res.food < 10,
};
const path = (c, p) => { if (p === true) return true; const v = String(p).split('.').reduce((o, k) => o?.[k], c); return String(p).startsWith('tr.') ? v || 1 : v; };
export function valOf(v, c) { if (typeof v === 'number') return v; if (typeof v === 'string') return path(c, v);
  let x = v.pick ? (path(c, v.pick[0]) ? v.pick[1] : v.pick[2]) : v.lin[1] - path(c, v.lin[0]);
  for (const m of v.mul || []) x *= typeof m === 'number' ? m : typeof m === 'string' ? path(c, m) : valOf(m, c);
  return v.plus != null ? v.plus + x : x; }
export const foodLow = (s) => s.res.food + s.res.veg < FOOD_SEC.perHead * s.ds.filter((d) => !d.away).length; // v1.76 糧食安全
export const vegFree = (s) => s.res.veg - stockReserved(s, 'veg');
const fillWhy = (w, c) => (w || '').replace(/\{([\w.]+)\}/g, (_, p) => path(c, p) ?? '');
// v1.8 後處理解讀器（規則在 score-data.mjs 的 SCORE_POST）
const POST_PRED = { plotWork: (c) => c.plotWork, skip: (c) => c.skip, outer: (c) => c.d.role === 'outer', em: (c) => c.em, myDuty: (c, o) => (c.d.duties || CHORE_ACTS).includes(o.act), owe: (c) => c.owe > 0, foodLow: (c) => foodLow(c.s), head: (c) => c.d.role === 'head' };
const postTest = (k, c, o) => (k === true ? true : k[0] === '!' ? !POST_PRED[k.slice(1)](c, o) : POST_PRED[k](c, o));
function postRows(s, d, out, plotWork) {
  const lab = isLabor(d), c = { s, d, plotWork, FS: FOOD_SEC, K: { LABOR_ACTS, LABOR_WORK_MUL, CHORE_ACTS, QUOTA } };
  if (!lab) { c.skip = skipsChores(s, d); c.em = emergency(s); c.owe = quotaOf(d, s) - (d.chore || 0); c.prioMul = PRIO[d.prio || 'normal'][0]; }
  const list = (v) => (typeof v === 'string' ? path(c, v) : v);
  for (const R of SCORE_POST) {
    if (R.who === 'labor' ? !lab : R.who === 'notLabor' ? lab : false) continue; if (R.if && !R.if.every((k) => postTest(k, c))) continue;
    const acts = R.acts && list(R.acts), exc = R.except && list(R.except);
    for (let i = out.length - 1; i >= 0; i--) { const o = out[i]; if (acts && !acts.includes(o.act)) continue; if (exc && exc.includes(o.act)) continue;
      if (R.drop && postTest(R.drop, c, o)) { out.splice(i, 1); continue; }
      if (R.muls) { let m = 1; for (const M of R.muls) { if (M.if && !postTest(M.if, c, o)) continue; const v = path(c, M.v); m *= v; if (!(M.hide1 && v === 1)) o.f.P.ext.push([M.name, v]); } o.f[R.key] = m; } }
  }
}
export function scoreActs(s, d) {
  const out = []; needStep(d); const c = scoreCtx(s, d);
  for (const R of SCORE) { if (R.gen) { for (const [act, A] of GEN_ACTS) { if (!offered(s, act).length) continue; const g = genOf(s, act, A); if (!g || !GEN_COND[g.cond]?.(s, d) || !dayOk(s, act, g.perDay)) continue; if (g.base > 0) out.push({ act, score: g.base, why: g.why, ...(g.layer ? { layer: g.layer } : {}) }); } continue; }
    if (R.when && !R.when.every((k) => PRED[k](c))) continue; const T = R.tiers ? R.tiers.find((x) => !x.if || PRED[x.if](c)) : R; if (!T) continue;
    const score = valOf(T.v, c); if (score > 0) out.push({ act: R.act, score, why: fillWhy(T.why, c), ...(T.layer || R.layer ? { layer: T.layer || R.layer } : {}) }); }
  if (s.band && BAND.defendScore > 0 && canDefend(d)) out.push({ act: 'defend', score: BAND.defendScore, why: s.band.state === 'go' ? '山賊往菜園來了，去柵邊守著' : '山賊在撞柵，去打退他們' }); // loop3
  drawBoost(s, d, out); // loop6
  pairBoost(s, d, out); // loop8
  { const rs = repairScore(s, d); if (rs > 0) out.push({ act: 'repair', score: rs, why: s.fence.hp <= 0 ? '柵被撞破了，得趕快補上' : '柵有破損，去補一補' }); } // loop2 修柵廣告
  if (s.m9) { demandBoost(s, d, out); repairDamp(s, out); } // loop9 缺料需求／loop10 不急修
  const ph = c.ph, sch = SCHEDULE[ph] || {}, n = d.needs;
  const plotWork = s.plots.some((p) => p.st === 'empty' || p.st === 'ripe');
  // v0.95 統一倍率管線：作息是時段閘門（管線外），性格→天賦組、心情→狀態組、職責/首徒/雇工→外部組
  const tparts = (act) => { const r = (d.personality || []).map((p) => [TRAITS[p]?.name || p, TRAITS[p]?.mods?.[act] || 1]).filter(([, v]) => v !== 1); const vm = valueMul(d, act); if (vm !== 1) r.push(['價值觀', vm]); return r; };
  for (const o of out) { const f = { base: o.score, sched: sch[o.act] || 1, trait: traitMul(d, o.act), mood: moodMul(d, o.act), noise: rand(s) * 8, P: { talent: tparts(o.act), state: o.act && moodMul(d, o.act) !== 1 ? [['心情', moodMul(d, o.act)]] : [], ext: [] } }; o.f = f; }
  postRows(s, d, out, plotWork);
  for (const o of out) { const f = o.f, p = pipeline(f.P); f.talent = p.talent; f.state = p.state; f.ext = p.ext; f.total = p.total; f.text = mulText(p); f.bored = boredMul(s, d, o.act); o.score = f.base * f.sched * p.total * f.bored + f.noise; delete f.P;
    o.layer ??= f.duty || f.labor ? 'duty' : f.sched >= 1.3 ? 'sched' : 'trait'; }
  if (s.bt25) { const bt = c.bt && PRED.btOk(c); for (const o of out) if (o.act === 'meditate' && o.f) o.f.btOk = bt; btBoost(s, out); } // loop25
  if (s.lift) liftBoost(s, d, out); // loop28
  return out.sort((a, b) => b.score - a.score);
}

function assign(s, d, act, why) {
  if (act === 'hunt') { const post = s.hunt?.post || s.post; d.task = { act: 'hunt', node: post, phase: 'go' }; goto(d, post); d.reason = why || '後山守點'; return true; }
  if (act === 'build') {
    const site = siteOf(s); if (!site) return false; const [fid, v] = site;
    const mat = MATS.find((k) => missingOf(v, k) > 0 && whAvail(s, k) > 0);
    if (mat) { const take = Math.min(isLabor(d) ? ECON.laborCarry : ECON.carry, missingOf(v, mat), whAvail(s, mat)); v.reserved[mat] += take; d.task = { act, fac: fid, phase: 'fetch', mat, reservedAmt: take, node: 'court', resv: [stockKey(mat, d)] }; reserve(s, d, stockKey(mat, d)); goto(d, 'court'); }
    else if (siteReady(v)) { d.task = { act, fac: fid, phase: 'go', node: facDef(fid).node }; goto(d, facDef(fid).node); }
    else return false;
    d.reason = why; return true;
  }
  if (act === 'pass') { const pp = passPick(s, d); if (!pp) return false; passReserve(s); const p = pp.p; if (p.task) cancelTask(s, p, `被${d.name}叫去傳功`);
    d.task = { act, fac: 'hall', node: 'hall', phase: 'go', partner: p.id, art: pp.art, lead: true, resv: [`actor:${p.id}`] }; p.task = { act, fac: 'hall', node: 'hall', phase: 'go', partner: d.id, art: pp.art, resv: [`actor:${d.id}`] };
    reserve(s, d, `actor:${p.id}`); reserve(s, p, `actor:${d.id}`); goto(d, 'hall'); goto(p, 'hall'); d.reason = why; p.reason = `${d.name}要傳功`; return true; }
  if (act === 'chat' || act === 'spar' || act === 'encourage') {
    const p = act === 'encourage' ? chatMates(s, d).filter((o) => o.mood < 35).sort((a, b) => a.mood - b.mood)[0] : (s.draw && act === 'chat' ? pickChatMate(s, d, chatMates(s, d), aff) : chatMates(s, d).sort((a, b) => aff(s, d, b) - aff(s, d, a))[0]);
    if (!p) return false;
    if (p.task) cancelTask(s, p, `被${d.name}拉去${act === 'spar' ? '切磋' : '聊天'}`);
    const node = act === 'spar' ? 'yard' : 'court'; d.task = { act, fac: 'yard', node, phase: 'go', partner: p.id, resv: [`actor:${p.id}`] }; p.task = { act, fac: 'yard', node, phase: 'go', partner: d.id, resv: [`actor:${d.id}`] }; reserve(s, d, `actor:${p.id}`); reserve(s, p, `actor:${d.id}`);
    goto(d, node); goto(p, node); d.reason = why; p.reason = act === 'spar' ? `${d.name}邀來切磋` : act === 'encourage' ? `${d.name}來陪我說說話` : `${d.name}找來聊天`; if (act === 'encourage') p.task.act = 'chat', p.task.encouragedBy = d.id; return true;
  }
  if (act === 'defend') { if (!s.band || !canDefend(d)) return false; d.task = { act, node: FENCE.node, phase: 'go' }; goto(d, FENCE.node); d.reason = why; return true; }
  if (act === 'repair') { if (!(repairScore(s, d) > 0)) return false; d.task = { act, node: FENCE.node, phase: 'go' }; goto(d, FENCE.node); d.reason = why; return true; }
  if (act === 'eat' && s.res.food <= 0) return false;
  if (act === 'cook' && vegFree(s) < STOCK_RESV.cook.amt) return false;
  let plot; if (act === 'farm') { plot = s.plots.findIndex((p, i) => (p.st === 'ripe' || p.st === 'empty') && !holder(s, `plot:${i}`)); if (plot < 0) return false; }
  const b = bestFac(s, d, act); if (!b) return false; const f = b.f;
  const resv = [b.key]; if (act === 'cook') resv.push(stockKey('veg', d)); if (act === 'farm') resv.push(`plot:${plot}`); for (const k of resv) reserve(s, d, k);
  if (ACTIVITIES[act]?.gen) dayUse(s, act);
  d.task = { act, fac: f.id, node: f.node, phase: 'go', plot, resv, floor: b.floor || undefined }; goto(d, f.node); d.reason = why; return true;
}
function goto(d, node) { const p = route(d.at, node); d.path = p.slice(1).map((n) => ({ n, xy: NODES[n] })); if (!d.path.length) d.path = [{ n: node, xy: NODES[node] }]; }

function decide(s, d) {
  if (d.carry) { d.task = { act: 'deliver', phase: 'return', node: 'court', walkStart: d.walked }; goto(d, 'court'); d.reason = '先把東西送回院倉'; d.decision = { layer: 'carry', act: 'deliver', why: d.reason }; return true; }
  if (d.order) {
    const o = d.order; if (o !== 'hunt' && (d.needs.energy < 15 || (o !== 'eat' && d.needs.hunger < 10 && s.res.food > 0))) { const a = d.needs.energy < 15 ? 'rest' : 'eat'; d.decision = { layer: 'need', act: a, why: '指派中先自理' }; return assign(s, d, a, '指派中先自理'); }
    if (assign(s, d, o, '玩家指派')) { onAssign(s, d, o, true); d.decision = { layer: 'order', act: o, why: '玩家指派' }; return true; }
    d.reason = `指派「${o === 'hunt' ? '狩獵' : ACTIVITIES[o].name}」暫不可行`; return false;
  }
  const sc = scoreActs(s, d); d.why = sc.slice(0, 3).map((c) => ({ act: c.act, score: Math.round(c.score), f: c.f, why: c.why }));
  for (const c of sc) if (assign(s, d, c.act, c.why)) { d.picked = c.act; d.decision = { layer: c.layer, act: c.act, why: c.why }; return true; }
  return false;
}

export function speedOf(d) { return BASE_SPEED * (1 + d.skills.agility / 100) * (d.carry ? 0.7 : 1) * (d.needs.energy < 30 ? 0.8 : 1) * (1 + ART_GAIN.speedPerTier * Math.max(0, effectTier(d, 'speed') + 1)); }

function moveStep(d, dt) {
  let left = speedOf(d) * dt;
  while (left > 0 && d.path.length) {
    const tgt = d.path[0].xy, L = dist(d.pos, tgt);
    if (L <= left) { d.pos = [...tgt]; d.at = d.path[0].n; d.path.shift(); left -= L; d.walked += L; }
    else { d.face = tgt[0] >= d.pos[0] ? 1 : -1; d.pos[0] += (tgt[0] - d.pos[0]) * left / L; d.pos[1] += (tgt[1] - d.pos[1]) * left / L; d.walked += left; left = 0; }
  }
  d.skills.agility = Math.min(100, d.skills.agility + 0); // 腳力成長於交付時結算
}

function grow(s, d, sk, amt, src = 'train') {
  if (sk === 'style') sk = d.style; const raw = amt; /* loop79：造詣只吃原始投入（師父在場倍率前） */
  amt *= apprMul(s, d); // v1.65 師父在場，徒弟練得快
  const before = d.skills[sk]; d.skills[sk] = Math.min(100, before + amt * (d.traits.diligent || 1) * 0.3 * (1 - before / 130) * focusMul(d));
  if (src === 'labor' && sk === 'strength' && d.lg) d.skills[sk] = before + workStrCap(d, Math.floor(s.t / DAY), d.skills[sk] - before); // loop127 做活力氣每日軟上限
  if (sk === d.style) { if (s.grow) growEnsure(d); const o = gainArt(d, amt, focusMul(d), s.t, s.grow ? { raw, src } : null); if (o.next) log(s, `${d.name}功夫到了火候，可向師父求學「${o.next.name}」`); for (const m of o.moves) log(s, `${d.name}練熟了，自悟新招「${MOVES.find((x) => x.id === m).name}」`); if (o.star) log(s, `${d.name}的基本功又添一顆星`); }
}

function doTask(s, d, dt) {
  const t = d.task, A = actDef(s, t.act) || {};
  if (t.act === 'hunt') return;
  if (t.act === 'trial') return trialStep(s, d, dt);
  if (t.phase === 'fetch' && !d.path.length) { // 建造取料
    const site = s.fac[t.fac]?.site, n = Math.min(t.reservedAmt, Math.max(0, s.res[t.mat])); // 取料當下原子驗證：倉裡不夠就只拿有的，差額釋放
    if (site) site.reserved[t.mat] -= t.reservedAmt - n; t.reservedAmt = 0;
    if (!site || n <= 0) { if (site && n > 0) site.reserved[t.mat] -= n; d.task = null; d.reason = '院倉的料被搬光了'; return; }
    s.res[t.mat] -= n; book(s, 'out', t.mat, n); d.carry = { [t.mat]: n };
    t.phase = 'deliver'; goto(d, facDef(t.fac).node); return;
  }
  if (t.phase === 'deliver' && !d.path.length) {
    const site = s.fac[t.fac].site, n = d.carry[t.mat]; site.reserved[t.mat] -= n; site.delivered[t.mat] += n; log(s, `${d.name}送 ${n} ${t.mat === 'wood' ? '木' : '石'}到工地料堆（${site.delivered[t.mat]}/${site.need[t.mat]}）`); if (!isLabor(d)) d.chore = (d.chore || 0) + 1; d.carry = null; d.task = null; return;
  }
  if (t.phase === 'go' && !d.path.length) {
  if (t.partner) { const p = byId(s, t.partner); if (!p || p.task?.partner !== d.id) { d.task = null; return; } if (p.path.length) return; }
    t.phase = 'do'; t.timer = 0; d.anim = t.act;
  }
  if (t.phase === 'do') {
    if (t.act === 'build') { const site = s.fac[t.fac].site; if (!site || site.paused || !siteReady(site)) { d.task = null; d.anim = null; return; } }
    t.timer += dt;
    if (t.partner && !byId(s, t.partner)) { cancelTask(s, d, '對手不在了'); return; }
    if (t.act === 'spar' && t.partner && Math.floor(t.timer / 1.2) !== Math.floor((t.timer - dt) / 1.2)) { const p = byId(s, t.partner); const mv = MOVES.find((m) => m.id === d.moves[d.moves.length - 1]); s.fx.push({ kind: 'move', mfx: mv.fx, zx: (d.zixia || 0) >= 5, name: mv.name, color: mv.color, from: [...d.pos], to: [...p.pos], r: 12, ttl: 0.6 }); d.face = p.pos[0] >= d.pos[0] ? 1 : -1; d.anim = 'strike'; }
    const effDur = durOf(s, t);
    if (A.energy && effDur > 0) d.needs.energy = clamp(d.needs.energy + A.energy * dt / effDur, 0, 100);
    if (t.act === 'rest' && d.ng) addQi(d, NG.rest * dt); // loop103 歇息回內力
    if (t.act === 'rest') { const rate = (facStage(s, t.fac).restRate || 3) * (t.floor ? 0.6 : 1) * (1 + ART_GAIN.restPerTier * Math.max(0, effectTier(d, 'rest') + 1)) * effectMul(d, 'rest', s.t); if (t.timer < dt * 1.5) think(s, d, t.floor || (t.fac === 'hall' && s.fac.hall.stage === 0) ? 'floorSleep' : 'bedSleep'); d.needs.energy = clamp(d.needs.energy + rate * dt, 0, 100); d.hp = clamp(d.hp + 3 * dt, 0, 100); const night = phaseOf(s).id === 'night' && !s.hunt?.team.includes(d.id); if (!night && (d.needs.energy >= 100 || (d.order !== 'rest' && d.needs.energy >= CORE.wakeAt && t.timer > 4))) finish(s, d); return; }
    if (t.act === 'build') { const site = s.fac[t.fac].site; site.work += dt; d.needs.energy = clamp(d.needs.energy - dt, 0, 100); grow(s, d, 'strength', 0.2 * dt, 'labor'); if (site.work >= site.workNeed) { finishBuild(s, t.fac); finish(s, d); } else if (t.timer >= A.dur) finish(s, d); return; }
    const dur = effDur;
    if (t.timer >= dur) {
      if (t.act === 'cook') { const st = facStage(s, t.fac); resAdd(s, 'veg', -2); t.phase = 'done'; const wat = s.res.water >= 1 ? 1 : 0; if (wat) { s.res.water -= 1; book(s, 'out', 'water', 1); } const yld = st.cookYield + cookBonus(d) + wat; /* v1.6 有井水多煮一份 */ onCook(s, d); s.res.food += yld; book(s, 'in', 'food', yld); log(s, `${d.name}在${st.name}煮好 ${yld} 份飯`); grow(s, d, 'cooking', 6); finish(s, d); return; }
      if (t.act === 'farm') { const p = s.plots[t.plot]; t.resv = []; grow(s, d, 'farming', 6); if (p.st === 'ripe') { p.st = 'empty'; p.g = 0; d.carry = { veg: HARVEST }; t.phase = 'return'; d.anim = null; goto(d, 'court'); t.walkStart = d.walked; return; } p.st = 'grow'; p.g = 0; finish(s, d); return; }
      if (A.use) { if (s.res.food < 1) { d.task = null; d.anim = null; d.reason = '沒糧了'; return; } s.res.food -= 1; book(s, 'out', 'food', 1); }
      if (A.need?.hunger) { const b = facStage(s, t.fac).mealBonus || 0; d.needs.hunger = clamp(d.needs.hunger + A.need.hunger + b, 0, 100); if (b) { d.needs.social = clamp(d.needs.social + b / 2, 0, 100); think(s, d, 'hallMeal'); } likeMeal(s, d, think); }
      if (A.skill) for (const [k, v] of Object.entries(A.skill)) grow(s, d, k, v * (t.act === 'train' || t.act === 'spar' ? facStage(s, 'yard').trainMul || 1 : 1), isWorkAct(t.act) ? 'labor' : 'train');
      if (s.draw && A.skill) cliqueTrain(s, d, t.act, A.skill, grow); // loop20 小派同修
      if (s.mentor && t.act === 'train') coTrain(s, d, A.skill?.style || 0, grow, relAdd, log); // loop8 同修
      if (s.mentor && (t.act === 'chat' || t.act === 'spar') && t.partner && d.id < t.partner) askStrong(s, d, byId(s, t.partner), grow, think, log); // loop8 請教
      if (s.wu7) { comprehend(s, d, t.act, t.partner ? byId(s, t.partner) : null, think, log); comprehendVariant(s, d, t.act, t.partner ? byId(s, t.partner) : null, think, log); } // loop7 領悟＋loop16 變式
      if (t.act === 'spar' && t.partner) { const p = byId(s, t.partner); if (d.id < p.id) { relAdd(s, d, p, 2); log(s, `${d.name}與${p.name}在${facStage(s, 'yard').offers.includes('spar') ? '木樁場' : '空地上徒手'}切磋`); addMem(s, d, p, 'spar'); } }
      if (A.fun) d.needs.fun = clamp((d.needs.fun ?? 60) + A.fun, 0, 100);
      if (t.act === 'leisure') think(s, d, 'idled');
      if (t.act === 'forage') d.needs.fun = clamp((d.needs.fun ?? 60) + (d.personality.includes('playful') ? 20 : 8), 0, 100);
      if (t.act === 'eat' && s.res.food >= 8) think(s, d, 'wellFed');
      if (A.social) d.needs.social = clamp(d.needs.social + A.social, 0, 100);
      if (t.act === 'meditate') { const b = btReady(d, s.t); if (!b) for (let i = 0; i < (facStage(s, t.fac).medEase || 1); i++) easeWexin(s, d); const r = b && resolveBreak(d, b, s.t, rand(s) - ngBreak(d)); /* loop105 內力衝關：成功率 +btBonus，仍封頂 0.9；loop108 已達 0.9 不扣 */ if (r?.ok && s.grow && r.stage <= 2) { growEnsure(d); settleGrowth(d, r.art, d.arts[r.art.id], { src: 'break', stage: r.stage }); } /* loop79 突破里程碑 */ if (r?.ok) { think(s, d, 'btWin'); log(s, `${d.name}打坐衝關成功：「${r.art.name}」${r.stage === 1 ? '踏入大成' : r.stage === 2 ? '臻至化境' : '返璞歸真'}！`); s.fx.push({ kind: 'break', pos: [...d.pos], ttl: 1.2 }); } else if (r) { think(s, d, 'btFail'); log(s, `${d.name}衝關「${r.art.name}」失敗，歇一天再試`); } }
      if (t.act === 'meditate' && d.ng) addQi(d, NG.med); // loop103 打坐一次回內力（衝關扣用在前）
      if (t.act === 'learn' && d.pendingArt) { const m = learnArt(d, d.pendingArt, s.t); s.rep = (s.rep || 0) + REP.learn; log(s, `師父傳授${d.name}「${m.name}」！`); think(s, d, 'learned'); }
      if (s.draw && (t.act === 'chat' || t.act === 'spar') && t.partner && d.id < t.partner) { const c = (s.cnt ??= { chat: 0, spar: 0 }); c[t.act]++; } // loop22 完成場次計數（opt-in）
      if (t.act === 'chat' && t.partner) { const p = byId(s, t.partner); d.together += 20; if (isLabor(d) && !isLabor(p)) d.cowork = (d.cowork || 0) + 30;
        if (t.encouragedBy) { think(s, d, 'encouraged', `（${p.name}）`); }
        else if (d.id < p.id) { const cm = Math.min(compat(d, p), compat(p, d)); if (cm < 1 && rand(s) < (1 - cm) * 0.8) { relAdd(s, d, p, 1); for (const x of [d, p]) think(s, x, 'badChat', `（${x === d ? p.name : d.name}）`); log(s, `${d.name}與${p.name}聊不到一塊`); } else { relAdd(s, d, p, 4 * Math.max(d.traits.social || 1, p.traits.social || 1)); think(s, d, 'goodChat', `（${p.name}）`); think(s, p, 'goodChat', `（${d.name}）`); const ln = chatLine(s, d, p), K = `${d.id}|${p.id}`; (s.memTalk ??= {}); if (ln && s.memTalk[K] !== s.day) { s.memTalk[K] = s.day; log(s, ln, 'low'); } addMem(s, d, p, 'chat'); admire(s, d, p, relAdd, think, log); } } }
      if (t.act === 'encourage' && t.partner) { const p = byId(s, t.partner); think(s, d, 'helped'); relAdd(s, d, p, 3); log(s, `${d.name}陪心情低落的${p.name}說了好一會兒話`); }
      if (t.act === 'repair') repairDone(s, d);
      if (t.act === 'pass' && t.lead && t.partner) { const p = byId(s, t.partner); if (p) passDo(s, d, p, t.art); }
      if (t.act === 'study' && s.readwu) { const w = readStudy(s, d); if (w) log(s, `${d.name}在藏經閣讀了許久，忽然開竅——悟性長進了${d.rootKnown ? `（${w}）` : ''}。`); } // loop140 讀書長悟性
      if (A.eff) applyEff(s, d, A.eff, A.name);
      if (A.carry) { d.carry = { ...A.carry }; t.phase = 'return'; d.anim = null; goto(d, 'court'); t.walkStart = d.walked; return; }
      finish(s, d);
    }
  }
  if (t.phase === 'return' && !d.path.length) {
    for (const [k, v] of Object.entries(d.carry)) { const nv = Math.min(s.cap[k] ?? 99, s.res[k] + v); book(s, 'in', k, nv - s.res[k]); s.res[k] = nv; }
    const walk = d.walked - (t.walkStart || 0); d.skills.agility = Math.min(100, d.skills.agility + walk / 400); // 負重長路→腳力
    d.carry = null; finish(s, d);
  }
}
function finish(s, d) { if (d.task) markDone(s, d, d.task.act); if (d.task && CHORE_ACTS.includes(d.task.act) && !isLabor(d)) d.chore = (d.chore || 0) + 1; if (d.task?.trial) resolveTrial(s, d); d.task = null; d.anim = null; }

// ---- 狩獵（同圖塔防波次，v0.4 接生態） ----
export function setPost(s, node) { if (POSTS[node] && !s.hunt) { s.post = node; return true; } return false; }
export function startHunt(s, ids, waves = HUNT_WAVES) {
  if (s.hunt) return false;
  const team = s.ds.filter((d) => ids.includes(d.id) && d.hp > 30 && !d.away); if (!team.length) return false;
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
function ngBreak(d) { const add = Math.max(0, Math.min(NG.btBonus, 0.9 - breakChance(d))); return add > 0 && spendQi(d, NG.btCost) ? add : 0; }
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
    if (foe && dist(foe.pos, m.pos) < 26) { if (m.cool <= 0) { foe.hp -= shieldHit(foe, M.dmg, s.t); /* loop116 護體真氣 */ m.cool = 1.2; s.fx.push({ kind: 'bite', pos: [...foe.pos], ttl: 0.4 }); } continue; }
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
      const power = mv.dmg * (1 + lv / 50) * moveMul(d, mv.id, s.t);
      const hitList = mv.aoe ? live.filter((m) => dist(m.pos, tgt.pos) <= mv.aoe) : [tgt];
      for (const m of hitList) { m.hp -= power; if (m.hp <= 0 && !m.gone) { m.gone = true; h.kills++; seeEnemy(s, m.k, 'kill', d); log(s, `${d.name}以「${mv.name}」擊退${MONSTERS[m.k].name}`); if (m.k === 'boar') resAdd(s, 'food', 3); } }
      h.hits[d.id] = (h.hits[d.id] || 0) + 1; grow(s, d, mv.skill, 1.5, 'fight');
      d.cool = mv.cd * cdMul(d, mv.id, s.t); d.face = tgt.pos[0] >= d.pos[0] ? 1 : -1; d.anim = 'strike';
      { const tier = visTier(d, mv.id), a = artOfMove(mv.id), va = a && variantOf(d, a.id, s.t); s.fx.push({ kind: 'move', mfx: mv.fx, zx: (d.zixia || 0) >= 5, name: mv.name, color: mv.color, from: [...d.pos], to: [...tgt.pos], r: mv.aoe || 16, ttl: tier >= 3 ? 1.0 : 0.6, tier, vcolor: va?.color || null, sprite: d.sprite, face: d.face }); if (tier >= 3) s.fx.push({ kind: 'shake', ttl: 0.35 }); }
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
/* loop56「同修作伴」（s.cotrain）：練功、打坐或閒著（沒事做）時，80px 內有別人（不論在做什麼），寂寞增加速度減半（不加念頭、不加關係） */
const CO_ACTS = ['train', 'meditate', undefined];
export function cotrainNear(s, d) { if (!CO_ACTS.includes(d.task?.act) || !d.pos) return false; return s.ds.some((o) => o !== d && !o.away && o.pos && Math.hypot(o.pos[0] - d.pos[0], o.pos[1] - d.pos[1]) < 80); }
/* loop47「誰種誰心疼」（s.cropcare）：菜被拱時，只有農事最好的兩人（實際照顧菜園）全額心疼，其餘在山上的人只是「聽說」（−2），巡山在外的人不知道。關閉時維持全派 −5。 */
export function cropMood(s) {
  if (!s.cropcare) { for (const d of s.ds) think(s, d, 'cropLost'); return; }
  const here = s.ds.filter((d) => !d.away), top = new Set([...here].sort((a, b) => (b.skills?.farming || 0) - (a.skills?.farming || 0)).slice(0, 2).map((d) => d.id));
  for (const d of here) think(s, d, top.has(d.id) ? 'cropLost' : 'cropLostLite');
}
function removeWild(s, k, n) { for (let i = 0; i < n; i++) { const j = s.wild.findIndex((w) => w.k === k); if (j >= 0) s.wild.splice(j, 1); } }
const WATCH_WARN = 120; // 秒：有人在哨崗守過，這段時間內下山的野豬會被嚇回
/* loop67「哨崗久守」（s.longwatch）：示警窗加倍為 240 秒（守哨一趟管得比較久）；不改守哨次數與亂數 */
function ecoStep(s, dt) {
  for (const [k, E] of Object.entries(ECO)) { const e = s.eco[k]; if (e.n < E.max) { e.timer += dt; if (e.timer >= E.regen) { e.n++; e.timer = 0; } } }
  const R = HABITAT.r;
  for (const k of Object.keys(ECO)) { let have = s.wild.filter((w) => w.k === k).length; while (have < s.eco[k].n) { s.wild.push({ k, pos: [HABITAT.c[0] + (rand(s) - 0.5) * R, HABITAT.c[1] + (rand(s) - 0.5) * R], tgt: null }); have++; } if (have > s.eco[k].n) removeWild(s, k, have - s.eco[k].n); }
  for (const w of s.wild) { if (!w.tgt || dist(w.pos, w.tgt) < 4) w.tgt = [HABITAT.c[0] + (rand(s) - 0.5) * 2 * R, HABITAT.c[1] + (rand(s) - 0.5) * R]; const L = dist(w.pos, w.tgt), st = MONSTERS[w.k].speed * 0.3 * dt; w.pos[0] += (w.tgt[0] - w.pos[0]) * Math.min(1, st / L); w.pos[1] += (w.tgt[1] - w.pos[1]) * Math.min(1, st / L); w.face = w.tgt[0] >= w.pos[0] ? 1 : -1; }
  s.raidT += dt;
  if (!s.hunt && s.raidT >= RAID_EVERY * raidMul(s) && s.eco.boar.n > 0 && !s.mons.some((m) => m.raid) && s.watch != null && s.t - s.watch < WATCH_WARN * (s.longwatch ? 2 : 1)) { s.raidT = 0; s.watched = (s.watched || 0) + 1; log(s, '護山哨示警：野豬剛下山就被鑼聲嚇回去了。'); } // v1.6 哨崗預警
  if (!s.hunt && s.raidT >= RAID_EVERY * raidMul(s) && s.eco.boar.n > 0 && !s.mons.some((m) => m.raid)) {
    s.raidT = 0; s.eco.boar.n--; removeWild(s, 'boar', 1);
    s.mons.push({ uid: `raid${s.rngN++}`, k: 'boar', hp: MONSTERS.boar.hp, max: MONSTERS.boar.hp, pos: [...NODES.den], path: route('den', 'veg').slice(1), raid: 'go', cool: 0 });
    log(s, '一頭野豬循山路下來，朝菜園去了。'); stewBoar(s);
  }
  for (const m of s.mons) if (m.raid) {
    if (monWalk(m, MONSTERS.boar.speed * dt)) {
      if (m.raid === 'go' && fenceUp(s) && boarRam(s)) { m.raid = 'back'; m.path = route('veg', 'den').slice(1); }
      else if (m.raid === 'go') { const p = s.plots.find((x) => x.st === 'ripe') || s.plots.find((x) => x.st === 'grow'); if (p) { p.st = 'empty'; p.g = 0; log(s, '野豬拱壞了一畦菜，吃飽回山。'); cropMood(s); } else log(s, '野豬在菜園沒找到吃的，回山了。'); m.raid = 'back'; m.path = route('veg', 'den').slice(1); }
      else { m.gone = true; s.eco.boar.n = Math.min(ECO.boar.max, s.eco.boar.n + 1); }
    }
  }
  s.mons = s.mons.filter((m) => !m.gone);
}

// ---- v0.8 雇工：有名有姓、有性格、有隱藏根骨 ----
export function laborCap(s) { return FACILITIES.reduce((a, f) => a + (facStage(s, f.id).laborBeds || 0), 0); }
export function canHire(s) {
  const next = LABOR_POOL.find((p) => !s.ds.some((d) => d.id === p.id) && !s.laborGone.includes(p.id));
  if (!next) return { ok: false, why: '村裡暫時沒人想上山做工' };
  if (laborers(s).length >= laborCap(s)) return { ok: false, why: laborCap(s) ? `工寮已滿（${laborers(s).length}/${laborCap(s)}）` : '先蓋工寮讓雇工有地方睡' };
  if (s.res.coin < ECON.hireCoin) return { ok: false, why: `香火錢不足（${s.res.coin}/${ECON.hireCoin}）` };
  if (s.res.food < ECON.hireFood) return { ok: false, why: `存糧不足 ${ECON.hireFood}` };
  return { ok: true, next };
}
export function hire(s) {
  const c = canHire(s); if (!c.ok) return c;
  s.res.coin -= ECON.hireCoin; s.res.food -= ECON.hireFood; book(s, 'out', 'coin', ECON.hireCoin); book(s, 'out', 'food', ECON.hireFood);
  const d = mkDisciple(c.next, 1, 'gate', c.next.personality, c.next.personality.slice(0, 1));
  Object.assign(d, { role: 'laborer', root: c.next.root, rootKnown: false, cowork: 0, unpaid: 0, reason: '應雇上山' });
  s.ds.push(d); for (const o of s.ds) if (o !== d) initPair(s, o, d, 0);
  log(s, `雇了山下的${d.name}來做工（香火錢 ${ECON.hireCoin}、糧 ${ECON.hireFood}；每日工錢 ${ECON.wage}）。`); return { ok: true, d };
}
// 共事：雇工與弟子在同一工地／同一處砍柴採石「做」的時候累積；夠了就看出根骨
function coworkStep(s, d, dt) {
  const W = ['build', 'chop', 'quarry'], t = d.task; if (!t || !W.includes(t.act)) return checkRoot(s, d);
  const mate = s.ds.find((o) => !isLabor(o) && W.includes(o.task?.act) && dist(o.pos, d.pos) < 120); // 同在工地／林子／石場附近幹活
  if (mate) { d.cowork = (d.cowork || 0) + dt; if (Math.floor(d.cowork / 30) !== Math.floor((d.cowork - dt) / 30)) { relAdd(s, d, mate, 1); think(s, d, 'workedWith', `（${mate.name}）`); think(s, mate, 'workedWith', `（${d.name}）`); } }
  checkRoot(s, d);
}
function checkRoot(s, d) { if (!d.rootKnown && (d.cowork || 0) >= ROOT.revealAt) { d.rootKnown = true; log(s, `一起幹活久了，看出${d.name}根骨「${ROOT.names[d.root]}」${d.root >= ROOT.inviteMin ? '，是塊練武的料！' : '。'}`); } }
export const avgAff = (s, d) => { const ds = disciples(s); return ds.length ? ds.reduce((a, o) => a + aff(s, o, d), 0) / ds.length : 0; };
export function canInvite(s, id) {
  const d = byId(s, id); if (!d || !isLabor(d)) return { ok: false, why: '不是雇工' };
  if (!d.rootKnown) return { ok: false, why: `還看不出根骨（共事 ${Math.floor(d.cowork || 0)}/${ROOT.revealAt}）` };
  if (d.root < ROOT.inviteMin) return { ok: false, why: `根骨${ROOT.names[d.root]}，不宜習武` };
  if (avgAff(s, d) < ROOT.inviteAff) return { ok: false, why: `同門對他還不熟（好感 ${avgAff(s, d).toFixed(0)}/${ROOT.inviteAff}）` };
  if (disciples(s).length >= capacity(s)) return { ok: false, why: `弟子床位已滿（${disciples(s).length}/${capacity(s)}）` };
  return { ok: true, d };
}
export function invite(s, id) {
  const c = canInvite(s, id); if (!c.ok) return c; const d = c.d;
  cancelTask(s, d, '拜入外門'); d.role = 'outer'; delete d.unpaid; d.duties = [...CHORE_ACTS]; d.prio = 'normal'; d.chore = 0; d.choreDebt = 0; d.contrib = 0; think(s, d, 'invited'); s.rep = (s.rep || 0) + 1;
  log(s, `${d.name}放下扁擔，拜入外門（根骨${ROOT.names[d.root]}）。`); return { ok: true, d };
}
function dismissLabor(s, d, why) {
  removeActor(s, d, why, { quiet: true }); BYID.delete(s); s.laborGone.push(d.id);
  log(s, `${d.name}${why}，下山去了。`);
}
// 香火＝底數＋聲望段＋同伴加成。照舊開局才套 PLAIN：前 10 日底數略高，之後聲望段乘 repMul。
export function incenseOf(s) {
  const rep = Math.floor((s.rep || 0) / ECON.coinPerRep);
  const base = ECON.coinBase + econCoin(s);
  if (s.hero) return base + rep;
  if ((s.day || 1) <= PLAIN.earlyDays) return base + PLAIN.earlyBonus + rep;
  return base + Math.floor(rep * PLAIN.repMul);
}
export function payday(s) {
  s.ledgerPrev = s.ledger; s.ledger = { day: s.day, in: {}, out: {} };
  const inc = incenseOf(s); s.res.coin += inc; book(s, 'in', 'coin', inc);
  for (const d of laborers(s)) {
    if (s.res.coin >= ECON.wage) { s.res.coin -= ECON.wage; book(s, 'out', 'coin', ECON.wage); d.unpaid = 0; think(s, d, 'paid'); }
    else { d.unpaid = (d.unpaid || 0) + 1; think(s, d, 'unpaid'); log(s, `付不出${d.name}的工錢（欠 ${d.unpaid} 日）`); if (d.unpaid >= ECON.leaveAfter) dismissLabor(s, d, '工錢一直沒著落'); }
  }
  { let need = 0, done = 0; const os = outers(s);
    for (const d of os) { const q = quotaOf(d, s), c = d.chore || 0; need += q; done += Math.min(c, q);
      if (c >= q) { const sur = c - q; d.contrib = (d.contrib || 0) + sur; d.choreDebt = 0; think(s, d, 'quotaMet'); if (sur) log(s, `外門${d.name}日課超額 ${sur}，記貢獻（共 ${d.contrib}）`); }
      else { d.choreDebt = Math.min(QUOTA.debtMax, q - c); think(s, d, 'quotaMiss'); log(s, `外門${d.name}日課差 ${q - c}，順延到今日。`); } }
    for (const d of s.ds) d.chore = 0;
    s.choreRate = need ? done / need : null;
    const hero = s.ds.find((d) => d.id === 'hero');
    if (hero && hero.role === 'inner' && os.length >= QUOTA.outerMin && s.choreRate >= QUOTA.headRate) { hero.role = 'head'; think(s, hero, 'headDisc'); s.rep = (s.rep || 0) + 2; log(s, `外門日課完成 ${Math.round(s.choreRate * 100)}%，主角升為首徒，專心練功！`); } }
  log(s, `第 ${s.day} 日晨，香火錢入帳 ${inc}${laborers(s).length ? `，付工錢 ${laborers(s).length * ECON.wage}` : ''}。`);
}

// ---- tick ----
export function tick(s, dt = 0.25) {
  s.t += dt; BYID.set(s, new Map(s.ds.map((d) => [d.id, d])));
  if (s.prof) for (const d of s.ds) if (!d.pf) d.pf = 1; /* loop91 新入門者也吃熟練度十重 */
  if (s.neigong) { s.ngshield = true; for (const d of s.ds) { if (!d.ng) { d.ng = 1; d.qi ??= 0; } if (!d.ng2) { d.ng2 = 1; d.qi = Math.min(d.qi ?? 0, qiMax(d)); } } } /* loop142 一版舊檔改護體真氣 */ /* loop103 */
  if (s.laborgrow) for (const d of s.ds) d.lg = 1; /* loop127 新入門者 */
  if (s.grow) for (const d of s.ds) { if (!d.gInit) growEnsure(d); if (s.growdr) d.gdr = 1; } /* loop84 新入門者立即折算，介面不必寫狀態 */
  { const day = Math.floor(s.t / DAY) + 1; if (day !== s.day) { s.day = day; payday(s); econDaily(s, EH); apprDaily(s); threatDaily(s); if (s.draw) cliqueDaily(s); if (s.m9) lairDaily(s, EH); if (s.jhev) jhevDaily(s); if (s.steward) stewardDaily(s, { siteOf, capacity, startBuild }); } }
  schoolStep(s, EH); threatStep(s, EH); bandStep(s, dt, EH); if (s.lair) lairStep(s, EH);
  const se = seasonOf(s); for (const p of s.plots) if (p.st === 'grow' && (p.g += dt / se.grow) >= PLOT_GROW) p.st = 'ripe';
  const seIdx = se.i; if (s.seasonI !== seIdx) { if (s.seasonI !== undefined) log(s, `入${se.name}了。${{ spring: '萬物萌發，菜長得快。', summer: '天長日暖。', autumn: '秋高氣爽，心情開闊。', winter: '天寒地凍，菜長得慢，飯量變大。' }[se.id]}`); s.seasonI = seIdx; }
  for (const d of s.ds) {
    if (d.away) { moodStep(s, d, dt); continue; } // 巡山中：背景模擬，不在地圖上
    d.needs.hunger = clamp(d.needs.hunger - 0.35 * se.hunger * dt, 0, 100);
    d.needs.fun = clamp((d.needs.fun ?? 60) - 0.22 * dt * (s.cofun && cotrainNear(s, d) ? 0.5 : 1), 0, 100); /* loop62「有伴解悶」（s.cofun）：與 cotrain 同條件，樂趣下降速度減半 */
    d.needs.social = clamp(d.needs.social - 0.4 * dt * (s.cotrain && cotrainNear(s, d) ? 0.5 : 1), 0, 100);
    moodStep(s, d, dt); revealStep(s, d, dt); if (isLabor(d)) coworkStep(s, d, dt); else if (d.role === 'outer' && !d.rootKnown && Math.max(d.cowork || 0, d.together || 0) >= ROOT.revealAt) { d.rootKnown = true; log(s, `相處久了，看出外門${d.name}根骨「${ROOT.names[d.root]}」。`); }
    if (!d.task) decide(s, d);
    if (d.task) { moveStep(d, dt); doTask(s, d, dt); }
    if (d.anim === 'strike' && d.cool < 0.6) d.anim = null;
  }
  { const em = emergency(s); if (em !== !!s.emergency) { s.emergency = em; if (outers(s).length >= QUOTA.outerMin) log(s, em ? (s.res.food <= 0 ? '斷糧了！內門弟子暫時放下功課回來幫忙。' : '野豬下山！內門弟子暫時回來顧家。') : '危機解除，內門弟子回去練功。'); } }
  huntStep(s, dt);
  ecoStep(s, dt);
  expStep(s, dt, H);
  popStep(s, dt); fogStep(s); // v1.55c 迷霧；v1.55a 各環族群（無亂數）
  paceStep(s); unlockStep(s); chapterStep(s); if (Math.floor(s.t) !== Math.floor(s.t - dt)) aspStep(s, think);
  xiaStep(s, H); hsStep(s, 0.25, H); jhStep(s, 0.25, H); sectStep(s); genStep(s);
  if (s.hero) { const h = byId(s, 'hero'); if (h && !h.away && h.hp <= EXP.hurtHeavy) awaken(s, h); heroStep(s); heroAuto(s); for (const d of s.ds) d.pairMul = pairBonus(s, d, aff); }
  sweepResv(s);
  for (const f of s.fx) f.ttl -= dt; s.fx = s.fx.filter((f) => f.ttl > 0);
}

// ---- v0.95 前期節奏：第一天黃昏野豬試煉、前三天每天一個里程碑、可略過的導引旁白 ----
export function guideSay(s, text) { if (s.guide?.on) s.guide.msg = text; }
export function skipGuide(s, all = false) { if (!s.guide) return; s.guide.msg = null; if (all) s.guide.on = false; }
function milestone(s, id) { if (s.pace.done.includes(id)) return; const P = PACE.find((p) => p.id === id); s.pace.done.push(id); s.rep = (s.rep || 0) + 3; log(s, `【里程碑】${P.name}（名聲 +3）`); for (const d of disciples(s)) think(s, d, 'wonHunt'); }
function paceStep(s) {
  const ph = phaseOf(s), P = s.pace, G = s.guide;
  for (const m of PACE) if (ph.day >= m.day && !G.seen.includes(m.id) && !P.done.includes(m.id)) { G.seen.push(m.id); guideSay(s, m.guide); }
  if (ph.day === 1 && ph.frac >= PHASES[2][0] && !P.trial) { const h = byId(s, 'hero'); if (h && !h.away && !s.hunt) {
    P.trial = 'on'; cancelTask(s, h, '師父命主角試打野豬'); h.order = null; h.task = { act: 'trial', phase: 'go', node: 'yard', timer: 0 }; goto(h, 'yard'); h.reason = '黃昏試煉：木樁場的野豬';
    const [x, y] = NODES.yard; s.mons.push({ uid: 'trialBoar', k: 'boar', trial: true, hp: TRIAL_BOAR.hp, max: TRIAL_BOAR.hp, pos: [x + 40, y + 6], path: [], cool: 0 }); log(s, '黃昏，一頭餓瘋的小野豬闖進木樁場。師父：「主角，你來。」'); } }
  if (!P.done.includes('firstExp') && s.lastExp) milestone(s, 'firstExp');
  if (!P.done.includes('firstBuild') && Object.values(s.fac).some((f) => f.site || f.stage > 0)) milestone(s, 'firstBuild');
}
function trialStep(s, d, dt) {
  const t = d.task, m = s.mons.find((x) => x.trial);
  if (!m) { d.task = null; d.anim = null; return; }
  if (d.path.length) return;
  t.phase = 'do'; t.timer += dt; d.face = m.pos[0] >= d.pos[0] ? 1 : -1;
  if (t.timer >= TRIAL_BOAR.hit) { t.timer = 0; const mv = MOVES.find((x) => x.id === d.moves[d.moves.length - 1]); const p = mv.dmg * (1 + d.skills[mv.skill] / 50) * moveMul(d, mv.id, s.t); m.hp -= p; d.anim = 'strike'; d.cool = 1;
    s.fx.push({ kind: 'move', mfx: mv.fx, zx: (d.zixia || 0) >= 5, name: mv.name, color: mv.color, from: [...d.pos], to: [...m.pos], r: 16, ttl: 0.6, tier: visTier(d, mv.id), sprite: d.sprite, face: d.face }); d.hp = Math.max(30, d.hp - 3);
    if (m.hp <= 0) { s.mons = s.mons.filter((x) => x !== m); seeEnemy(s, 'boar', 'kill', d); resAdd(s, 'food', 2);
      const r = d.arts.basicFist; if (r && r.xp < 25) { r.xp = 25.5; } const o = gainArt(d, 0, 1, s.t); for (const id of o.moves) log(s, `${d.name}練熟了，自悟新招「${MOVES.find((x) => x.id === id).name}」`);
      log(s, `${d.name}一拳撂倒野豬！師父點撥：「這一下有了火候。」基礎拳入小成。`); think(s, d, 'learned'); s.pace.trial = 'done'; milestone(s, 'trial'); d.task = null; d.anim = null; } }
}
// ---- 存檔（v0.95 移到 save.mjs，逐版遷移）----
export { save, load, migrate, MIGRATIONS } from './save.mjs';
export { clone };

export { cancelTask, removeActor };

export const startSchoolTrip = (s) => startSchool(s, EH); // v1.85 A10 下山義學

export const resolveRaid = (s, i) => raidResolve(s, i, EH); // v1.9 I-6：玩家按鈕
