import {HUNGER_PER_SECOND,admissionStatus,unfoundedHermitage,mentorFor,guidanceSeconds,clockActor,noteGuidance,guidanceLearning,guidanceDaily} from './admission.mjs';
import {applicantAway,bookAdmissionWork,discipleCount,policyCap,recruitmentInit,recruitmentOf,returnFromWork,sendApplicantToWork,setRecruitPolicy} from './recruitment.mjs';
export {policyCap,setRecruitPolicy} from './recruitment.mjs';
import {transferredDamage,moveStats,hermitageInnerActive,hermitageStepActive,artTeacher} from './arts.mjs';
import { inventable, inventArt, readableRareBook, readRareBook } from './rare-arts.mjs';
import { rareBookSearchStep } from './rare-search.mjs';
import { HERMITAGE_VOLUMES, seedHermitageBooks, bookStatus, readHermitageBook, cliffBook, forestFragment, volumeById } from './hermitage-books.mjs';
import { spreadRumors, rumorForCandidate } from './rumors.mjs';
import { donateRepairs } from './repair-donation.mjs';
import { canLeapCliff, cliffSlopeFactor, CLIFF_ACT_NODE } from './cliff.mjs';
import {ringCapacity,attackTokenLimit,pursueFleeing,rememberEscape,restoreSurvivor,moveToward} from './tactics.mjs';
import {pickupDrop} from './techniques.mjs';
import {forayChoice} from './foray-choice.mjs';
import {finishTrainingWish,TRAINING_CAUSES} from './decision.mjs';
import { ensurePractice, rehearse, practiceWork, practiceWindow } from './practice.mjs';
import { BODY_TIMING, BODY_MOVES, BODY_BASE, makeBare, acquireWorkTool, moveAvailable, foeAction, FOE_ACTIONS } from './starter-combat.mjs';
// 單一權威模擬核心：純 JS、無 DOM，可在 Node 測試。
import { combatTacticStep, chooseCombatMove, fretStep, noteFret, interceptOpening, breakWindup, taijiReturn, partHit, partHeal, ZJ, zjHas, zjMark, zjWindK, zjIntercept, zjRegen, perfectDodge, witchK, WITCH, lightCross, FLAIR, RING, handleTake, CLASH, windOf, windFrac, resolveSwing, depthOf, postureRegen, postureOf, focusOf, CATS, temperOf, TEMPER29, qiInjuryAdd28, qiInjuryCure28, DRIVE28, innerDrive28, stepDrive, mastery, mainOuterArt, studyChart24, qiOf, NG23, yuqiOn, yuqiMul, qiStrikeMul, qiAoeAdd, swordCdMul, swordDmgMul, medQi, restQi, hasSpec, SPEC, specM, specK, bestSpec, zhenK, specGrow, readStudy, NG, addQi, spendQi, qiMax, shieldHit, breakChance, growInit, growEnsure, settleGrowth, seedArts, gainArt, learnArt, moveMul, effectTier, effectMul, artById, btReady, resolveBreak, cdMul, visTier, variantOf, artOfMove, btBoost, noteTrain31, appetiteActMul31, applyArtOn, innerOnHit, innerOnGetHit, jiuyangEase, boutWhy } from './arts.mjs';
import { workStrCap, isWorkAct, seasonOf, demandBoost, repairDamp, econDaily, schoolStep, startSchool, schoolWhy, E as econOf, liftBoost, stewardDaily, stewBoar, bodyConditionOn, ensureBodyCondition, stepWorkCondition, restBodyCondition, cookMedicatedMeal, applyMedicatedMeal, applyPlainMeal } from './economy.mjs';
import { SOURCES } from './data.mjs';
import { RECRUIT_TRAIT_VARIATION, LABOR_ACTS23, LABOR_POOL23, LABOR23, ART_GAIN, BREAK, EXP, RULES_VERSION, QUESTIONS, REVEAL_AT, TRAITS, MOOD, REP, RECRUIT_POOL, ECO, HABITAT, POSTS, RAID_EVERY, HUNT_WAVES, WAVE_GAP, DAY, PHASES, SCHEDULE, ROUTINE_DEFAULT, ROUTINE_MODES, PLOT_GROW, HARVEST, NODES, EDGES, CLIFFS, FACILITIES, FENCE_FAC, ACTIVITIES, MOVES, MONSTERS, WAVES, DISCIPLES, openingScenario, REL_STAGES, BASE_SPEED, ECON, LABOR_ACTS, LABOR_WORK_MUL, ROOT, LABOR_POOL, CHORE_ACTS, QUOTA, PRIO, PROMOTE, PACE, TRIAL_BOAR, SIG_ACTS, RES_NAMES, FOOD_SEC, RARE, LOTS, SCORE, SCORE_POST, ROUTE, ENEMIES } from './data.mjs';
import { chronOf, clone, dist, clamp, relKey, affKey, log, book, resAdd, pillNote, pipeline, mulText, recordDeed, tallyAct } from './util.mjs';
import { MENTOR, think, moodStep, moodTarget, moodParts, traitMul, moodMul, focusMul, moodLabel, revealStep, knownTraits, relStage, relAdd, compat, aff, initPair, coTrain, askStrong, pairBoost, drawBoost, pickChatMate, admire, archRecruit } from './social.mjs';
import { expStep, startExpedition as startExp0, canExpedition, seeEnemy, codexRows, reportText, segAt, ROUTE_END, dpsOf, raidMul, popStep, POP, fogStep, unlockStep, chapterStep } from './world.mjs';
import { BAND, canDefend, boarRam, fenceUp, fenceHit, repairScore, repairDone, FENCE, finishFenceSite, threatDaily, threatStep, raidResolve, bandStep, lairDaily, lairStep, siegeDaily27, crusadeDaily27, crusadeStep27, startCrusade27 } from './threat.mjs';
import { addMem, chatLine, passPick, passDo, PASS, passScore, passReserve, apprDaily, apprMul, aspStep, likeMeal, likesOf, cliqueDaily, cliqueTrain, teachDaily, teachMul } from './bonds.mjs';
import { recordSocialEvent, fadeSocialThoughts } from './social-thoughts.mjs';
import { readLuohanBook } from './luohan-book.mjs';
import { xiaStep, onCook, xiaInit, hsStep, hsInit } from './wuxia.mjs';
import { jhStep, jhInit, jhevDaily } from './jianghu.mjs';
import { sectStep, sectInit, sectRecruit, genStep, genInit, removeDisciple, canBuildFac, buildFac, queueHermitageFounding, foundHermitageSect, canFoundHermitageSect, pairedSwordArrival } from './sect.mjs';
import { applyHero, valueMul, easeWexin, onAssign, heroStep, heroAuto, pairBonus, awaken, econCoin, cookBonus } from './hero.mjs';
import { SAVE_VERSION, initStateFields } from './save.mjs';
import { bodyMassMul, expecting, isBaby } from './family.mjs';
const BABY_ACTS = ['eat', 'rest']; // R7：嬰兒只吃和睡。
import { cancelTask, removeActor, whAvail, freeSlot, freeSpot, reserve, sweepResv, actorBusy, needStep, boredMul, markDone, durOf, holder, CORE, STOCK_RESV, stockKey, stockReserved } from './core.mjs';
/* loop140 */
export { canExpedition, codexRows, reportText, segAt, ROUTE_END, dpsOf };
const H = { rand: (s) => rand(s), cancelTask: (s, d, w) => cancelTask(s, d, w), grow: (s, d, k, a, src) => grow(s, d, k, a, src), think: (s, d, id) => think(s, d, id), gate: NODES.gate };
export { recallExpedition } from './world.mjs';
export const startExpedition = (s, ids, opt = {}) => startExp0(s, ids, opt, H);
export { think, moodTarget, moodParts, traitMul, moodMul, focusMul, moodLabel, knownTraits, relStage, relAdd, compat, aff, seasonOf, relKey, log };

const EH = { rand: (s) => rand(s), cancelTask: (s, d, w) => cancelTask(s, d, w), think: (s, d, id) => think(s, d, id), removeDisciple: (s, d, w) => removeDisciple(s, d, w), gate: NODES.gate };
export { SAVE_VERSION };
export { foundHermitageSect, canFoundHermitageSect, queueHermitageFounding }; // 出自 Phase 7 規格：模擬 API 與玩家抉擇共用同一條開山路。

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- 路網 ----
const ADJ = {};
for (const [a, b] of EDGES) { const w = dist(NODES[a], NODES[b]); (ADJ[a] ||= []).push([b, w]); (ADJ[b] ||= []).push([a, w]); }
export function route(from, to, d = null) {
  // 出自 Phase 6 規格：平地尋路沿舊圖；只有進出山崖時才納入已達門檻的崖點，避免舊局多一條捷徑。
  const cliffTrip = !!(CLIFFS[from] || CLIFFS[to] || from === CLIFFS.cliff3.detour || to === CLIFFS.cliff3.detour);
  const D = { [from]: 0 }, P = {}, Q = new Set(Object.keys(NODES).filter(id => id === from || !CLIFFS[id] || (cliffTrip && canLeapCliff(d, id))));
  while (Q.size) {
    let u = null; for (const q of Q) if (D[q] !== undefined && (u === null || D[q] < D[u])) u = q;
    if (u === null || u === to) break; Q.delete(u);
    for (const [v, w] of ADJ[u] || []) if (Q.has(v) && (D[v] === undefined || D[u] + w < D[v])) { D[v] = D[u] + w; P[v] = u; }
  }
  const path = [to]; while (path[0] !== from) { const p = P[path[0]]; if (!p) return [from]; path.unshift(p); }
  return path;
}
export const routeLength = (a, b, d = null) => { const p = route(a, b, d); let L = 0; for (let i = 1; i < p.length; i++) L += dist(NODES[p[i - 1]], NODES[p[i]]); return L; };

export const facDef = (id) => (id === 'fence' ? FENCE_FAC : FACILITIES.find((f) => f.id === id)); // loop11 柵牆工地
export const facStage = (s, id) => { const S = facDef(id).stages; return S[Math.min(s.fac[id]?.stage || 0, S.length - 1)]; };

// loop143（v2.2 baseline）：已驗證的規則轉正（表在 data.mjs）。#390 起所有新局都套用，不再有舊規則開局。
export function createState(seed = 1, heroSpec = null) {
  // R9 #529：唯一新局是隱居；未提供規格時使用同一條預設路徑。
  heroSpec = { ...heroSpec, kind: 'custom', hermitage: true, opening: heroSpec?.opening || heroSpec?.partner || 'xiaolongnv' };
  const s = {
    v: SAVE_VERSION, rules: RULES_VERSION, seed, t: 0, xia: xiaInit(), hs: hsInit(), jh: jhInit(), routine: { ...ROUTINE_DEFAULT }, socialThoughts: [], forayPolicy: 'allow', forayStats: { starts: 0, patrols: 0, hurt: 0, discoveries: 0, targets: [] }, res: { wood: 0, stone: 0, coin: ECON.coinStart, food: 6, herb: 0, veg: 0, water: 0, pill: 0, tiemu: 0, lingshi: 0 }, lots: { n: LOTS.start, bought: 0 }, plots: Array.from({ length: 4 }, () => ({ st: 'empty', g: 0 })),  cap: { wood: 12, stone: 12, water: 12, pill: 10 }, day: 1, ledger: { day: 1, in: {}, out: {} }, ledgerPrev: null, laborGone: [],
    fac: Object.fromEntries(FACILITIES.map((f) => [f.id, { stage: 0, site: null }])),
    ds: DISCIPLES.slice(0, openingScenario(heroSpec).initialDisciples).map((d,i)=>mkDisciple(d,i)),
    rel: {}, aff: {}, families: [], eco: Object.fromEntries(Object.entries(ECO).map(([k, e]) => [k, { n: e.start, timer: 0 }])), wild: [], post: 'guard', raidT: 0, rep: 0, rumors: [], rumorSerial: 0, log: [], hunt: null, mons: [], fx: [], rngN: 0,
  };
  for (let i = 0; i < s.ds.length; i++) for (let j = i + 1; j < s.ds.length; j++) initPair(s, s.ds[i], s.ds[j], 10);
  initStateFields(s);
  const opening = openingScenario(heroSpec);
  if (opening.log) log(s, opening.log);
  s.hero = null; s.choices = []; s.encExclude = []; s.unlock = []; s.chapter = { done: false }; for (const d of s.ds) d.wu ??= d.root;
  applyHero(s, heroSpec, initPair);
  {
    s.hermitage = { active: true, stage: 0, founded: false, livedDays: 0, opening: typeof heroSpec?.opening === 'string' ? heroSpec.opening : heroSpec?.partner || 'custom' }; // R4：情境來源，不記人物關係身分。
    s.res.medFood = 0; s.medFoodBatches = [];
    s.res.beeJelly = 0; s.res.coldWater = 0; s.hermitage.exploredCliffs = [];
    Object.assign(s.res, opening.supplies);
    if (s.hero) s.hero.sect24 = 'quanzhen';
    const hero = byId(s, 'hero');
    // R10 #530：白身開局沒有入門拳譜，只能靠身體硬打，再去找師父、找譜。
    const starter = heroSpec.starterArt === 'none' ? null : heroSpec.starterArt === 'luohanHands' ? 'luohanHands' : 'chunyangFist';
    if (starter) { learnArt(hero, starter, s.t); hero.focus = starter; } else makeBare(hero); hero.hermitageStarter = starter;
    for (const row of opening.people) {
      const base = row.template || DISCIPLES[0];
      const person = mkDisciple({ ...base, ...row, skills: { ...DISCIPLES[0].skills, ...base.skills, ...row.skills } }, s.ds.length);
      person.wu = row.wu ?? person.root; person.xia = row.id; person.originSect = row.originSect;
      person.portrait = row.portrait; person.mealName = row.mealName; person.best = 0; person.insight = {}; person.away = false;
      person.traits = { ...(row.traits || {}) }; person.arts = {}; person.moves = []; person.pendingArt = null;
      person.awakeningPath = row.awakeningPath;
      for (const [id, xp] of Object.entries(row.arts || {})) { person.arts[id] = { xp }; learnArt(person, id, s.t); }
      s.ds.push(person); initPair(s, hero, person, row.affinity);
      s.encExclude.push(person.xia);
    }
    seedHermitageBooks(s, opening, starter);
    log(s, `【荒山隱居】${[hero, ...s.ds.filter((d) => d !== hero)].map((d) => d.name).join('與')}在終南茅廬安頓，先做活練功。`);
  }
  // #390 part 2（擁有人 2026-11-02）：30 個規則開關已刪，所有局都是現行規則；spec 只剩主角與玩家選項（執事三項）。
  if (heroSpec?.steward) s.steward = true; /* loop30 執事自主 */ if (heroSpec?.stewyard) s.stewyard = true; /* loop95 執事立樁 */ if (heroSpec?.stewkit) s.stewkit = true; /* loop60 執事顧灶 */
  s.valor = 0; /* loop129 勇名 */
  sectInit(s); s.gen = genInit(); if (heroSpec?.bonus) s.gen.suhuiStart = heroSpec.bonus;
  growInit(s);
  for (const d of s.ds) d.pf = 1; /* loop91 */
  for (const d of s.ds) { d.ng = 1; d.qi = 0; d.ng2 = 1; } /* loop103 */
  for (const d of s.ds) d.lg = 1; /* loop127 */
  for (const d of s.ds) { d.moves=[...new Set([...d.moves,...BODY_BASE])];ensurePractice(d,s.codex); }
  if (bodyConditionOn(s)) for (const d of s.ds) ensureBodyCondition(d, s.day); // 出自 Phase 5 規格：僅選新局起手建立疲勞週期。
  s.recruitment = recruitmentInit(discipleCount(s));
  return s;
}
function mkDisciple(d, i, at = 'court', personality = d.personality || [], known = personality.slice(0, 1)) {
  // Templates can be reused by later golden cases; adulthood mutates child.grown.
  return seedArts({
      id: d.id, name: d.name, root: d.root ?? 3, rootKnown: true, style: d.style, personality: [...personality], known: [...known], together: 0, mood: MOOD.base, thoughts: [], why: [], adult: d.adult, age: d.age, child: d.child ? { ...d.child, parents: [...d.child.parents] } : d.child, youngHero: d.youngHero, sprite: d.sprite, fem: d.fem, traits: d.traits,
      skills: { ...d.skills }, moves: ['fist'], pendingMove: null,
      needs: { energy: 80, hunger: 70 - i * 10, social: 50, fun: 60 }, hp: 100, fret: 0, raging: false, rageUntil: 0, busyUntil: 0,
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
const readyMealCount = (s) => s.res.food + (s.res.medFood || 0); // R9：唯一開局可獨立食用藥膳。
export const emergency = (s) => readyMealCount(s) <= 0 || s.mons.some((m) => m.raid && !m.gone);
// loop39：8 人時內門多、外門少（常 4 外門撐 8 人），日課過半做不完；「人多分攤」開時全派人數 ≥ 外門×QUOTA.shareAt，每位外門日課 −1。
export const shareOn = (s) => !!s && s.ds.length >= QUOTA.shareAt * Math.max(1, outers(s).length);
export const quotaOf = (d, s) => QUOTA.points - (shareOn(s) ? 1 : 0) + (d.choreDebt || 0) + (d.boardByWork ? 1 : 0);
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
  if ((d.known || []).length < (d.personality || []).length) return { ok: false, why: '師父還沒看清他的性情' };
  const ex = s.ds.filter((o) => (o.role === 'inner' || o.role === 'head') && o.adult && aff(s, o, d) >= ROOT.inviteAff).sort((a, b) => b.skills[b.style] - a.skills[a.style])[0];
  if (!ex) return { ok: false, why: `尚無相熟的內門師父願意主考（好感需 ${ROOT.inviteAff}）` };
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
export function canRecruit(s) {
  if (unfoundedHermitage(s)) return { ok: false, why: '荒山隱居中，立匾後才收徒' }; // 出自 H0 規格：收徒在開山後解鎖。
  const candidates = [...econOf(s).pool.filter(p => !applicantAway(s,p.id)), ...RECRUIT_POOL.filter(p => !s.ds.some(d => d.id === p.id || (d.id === 'hero' && s.hero?.id === p.id)) && !applicantAway(s,p.id))];
  const next = candidates.find(p => rumorForCandidate(s, p)) || candidates[0]; // R8：義學也要親眼聽過；傳聞對上處境的人才會走到門口。
  if (!next) return { ok: false, why: '暫無人選' };
  const rumor = rumorForCandidate(s, next);
  if (!rumor) {
    const levers = [];
    if (!schoolWhy(s)) levers.push({ id: 'school', text: '派弟子下山義學，讓想拜師的人親眼看見授課' });
    if (s.choices?.some(ch => ch.sect === 'huiwu')) levers.push({ id: 'tournament', text: '應戰當前會武；勝出後觀眾會傳授藝見聞' });
    return { ok: false, why: '尚無符合處境的人聽過山門的傳聞', heard: false, next, levers };
  }
  const candidate=makeBare({id:next.id,adult:next.adult,skills:{...next.skills},situation:next.situation,support:next.support,canWork:next.canWork});
  const heardReason = `在${rumor.where}聽${rumor.witness}說「${rumor.text}」；${next.situation?.reason || '想找合適的師門'}`;
  return {...admissionStatus(s,candidate),next,heard:true,heardReason,rumor:rumor.id};
}
// 三問心印：預設答案取人選天性；答案→前兩個不重複特質為明面，人選天性補為第三（暗，相處 900 秒揭露）
export function defaultAnswers(p) { return QUESTIONS.map((q) => { const i = q.a.findIndex(([, t]) => (p.personality || []).includes(t)); return i < 0 ? 0 : i; }); }
export function personalityFrom(p, answers = defaultAnswers(p)) {
  const shown = []; QUESTIONS.forEach((q, i) => { const t = q.a[answers[i] ?? 0]?.[1]; if (t && !shown.includes(t) && shown.length < 2) shown.push(t); });
  const hidden = (p.personality || []).find((t) => !shown.includes(t));
  return { personality: hidden ? [...shown, hidden] : shown, known: shown };
}
const stableTraitHash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
export function recruit(s, answers) {
  const c = canRecruit(s); if (!c.ok) { if (c.workAway && c.next && sendApplicantToWork(s,c.next.id)) { log(s,`${c.next.name}付不起束脩，山門暫無可抵食宿的工作，先下山做工，攢夠再回來。`); return {...c,away:true}; } return c; }
  const { personality, known } = personalityFrom(c.next, answers);
  if (rand(s) < 0.3) { const x = rand(s) < 0.5 ? 'lazy' : 'stubborn'; if (!personality.includes(x)) personality.push(x); } // v0.97 一般弟子也可能懶散／較真（暗）
  if(c.offer.kind==='food')resAdd(s,'food',c.offer.amount,'tuition');
  if(c.offer.kind==='coin')resAdd(s,'coin',c.offer.amount,'tuition');
  if(c.offer.kind==='work')bookAdmissionWork(s,c.offer.slot);
  resAdd(s, 'food', -ACTIVITIES.eat.use.food, 'admission'); { const h = stableTraitHash(`${s.seed}:trait29:${c.next.id}:${s.ds.length}`); if (h < RECRUIT_TRAIT_VARIATION.p) { const x = RECRUIT_TRAIT_VARIATION.pool[Math.floor(stableTraitHash(`${s.seed}:trait29b:${c.next.id}:${s.ds.length}`) * RECRUIT_TRAIT_VARIATION.pool.length)]; if (!personality.includes(x)) { const old = personality[1]; personality[1] = x; const k = known.indexOf(old); if (k >= 0) known[k] = x; (s.v29n ??= {}).recruitTrait = (s.v29n.recruitTrait || 0) + 1; } } } /* loop188 v2.9 經典特質（雜湊，不吃亂數流） */
  const d = makeBare(mkDisciple(c.next,1,'gate',personality,known)); d.guidanceMentor=c.mentor;d.admissionReason=`${c.heardReason}；${c.reason}`; d.together = 0; d.boardByWork=c.offer.kind==='work'; Object.assign(d, { role: 'outer', root: 2 + Math.floor(rand(s) * 4), rootKnown: false }); { const A = archRecruit(() => rand(s)); Object.assign(d, { arch: A.id, root: c.next.root??A.root, wu: c.next.wu??A.wu }); if (!d.personality.includes(A.trait)) d.personality.push(A.trait); } /* loop21 原型 */ for(const art of c.next.starterArts||[])learnArt(d,art,s.t); s.ds.push(d); delete recruitmentOf(s).returned[c.next.id]; if (c.next.school) econOf(s).pool.splice(econOf(s).pool.findIndex((x)=>x.id===c.next.id),1);
  for (const o of s.ds) if (o !== d) initPair(s, o, d, 5); sectRecruit(s, d);
  log(s, `${d.name}慕名從村路上山，${c.offer.kind==='work'?'做工抵食宿與教學':`繳${c.offer.kind==='food'?'糧':'錢'}束脩`}，拜入外門。`); recordDeed(s, d, 'join', { chron: `${d.name}慕名上山，拜入門下` }); return { ok: true, d };
}
export function mapStage(s) {
  if (s.fac.hall.stage >= 1 && s.fac.yard.stage >= 1) return 'S2';
  if (s.fac.dorm.stage >= 1 && s.fac.kitchen.stage >= 1) return 'S1';
  return 'S0';
}
// v0.95 每 tick 建一次 id→弟子 查表（不入存檔；增人時退回線性搜尋、減人時清表）
const BYID = new WeakMap();
export function byId(s, id) { const m = BYID.get(s); const d = m?.get(id); if (d && !d.removed) return d; const x = s.ds.find((o) => o.id === id); if (x && m) m.set(id, x); return x; }
export function rand(s) { const r = rng(s.seed * 7919 + s.rngN++); return r(); }
export function phaseOf(s) { const f = (s.t % DAY) / DAY; let p = PHASES[0]; for (const x of PHASES) if (f >= x[0]) p = x; return { id: p[1], name: p[2], day: Math.floor(s.t / DAY) + 1, frac: f }; }

// ---- 建造 ----
export const MATS = ['wood', 'stone'];
// v1.9 I-2：v1.6 建築佔地；地塊上限 s.lots.n，擴地花錢（每塊 ×LOTS.rise）
export const lotsOf = (s) => (s.lots ??= { n: LOTS.start, bought: 0 });
export const lotsUsed = (s) => FACILITIES.filter((f) => f.v16 && !f.sig && (s.fac[f.id]?.stage > 0 || s.fac[f.id]?.site)).length;
export const lotCost = (s) => Math.round(LOTS.cost * LOTS.rise ** lotsOf(s).bought);
export function lotWhy(s) { if (s.hermitage?.active) return '立匾開山後才能擴地'; const L = lotsOf(s); if (L.n >= LOTS.max) return '山頭已經沒有地可擴'; if (s.res.coin < lotCost(s)) return `錢不夠（擴地 ${lotCost(s)}）`; return null; } // 出自 Phase 7 規格：隱居期尚無門派土地帳。
export function buyLot(s) { const w = lotWhy(s); if (w) return { ok: false, why: w }; const c = lotCost(s), L = lotsOf(s); resAdd(s, 'coin', -c); L.n++; L.bought++; log(s, `擴地：花 ${c} 錢整出一塊新地（地塊 ${lotsUsed(s)}/${L.n}）`); return { ok: true, c }; }
export const LIB23_REP = 10;
export function buildWhy(s, id) {
  if (s.hermitage?.active) return '荒山隱居中，立匾後才擴建'; // 出自 Phase 7 規格：開山後開放完整建設。
  const f = facDef(id), st = s.fac[id], next = f.stages[st.stage + 1];
  if (!next || (false)) return '已到頂'; if (st.site) return '施工中'; if (f.sig || next.noBlueprint) return '鎮派建築走門派面板';
  const rq = id === 'library' && st.stage === 0 ? LIB23_REP : next.rep; /* loop157 P7：v23 藏經閣名聲 15→10 */
  if (rq && (s.rep || 0) < rq) return `名聲不足（${Math.floor(s.rep || 0)}/${rq}）`;
  for (const [k, v] of Object.entries(next.rare || {})) if ((s.res[k] || 0) < v) return `${RARE[k]}不足（${s.res[k] || 0}/${v}，巡山遠段才撿得到${'，山下市集也有限量賣'}）`;
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
  while (s.plots.length < (f.stages[st.stage].plots || 0)) s.plots.push({ st: 'empty', g: 0 });
  recordDeed(s, null, 'build', { chron: `${f.name}落成「${f.stages[st.stage].name}」` }); for (const d of s.ds) think(s, d, 'newLook'); log(s, `完工：${f.name}成了「${f.stages[st.stage].name}」${f.stages[st.stage].offers.length ? '，解鎖：' + f.stages[st.stage].offers.map((a) => ACTIVITIES[a].name).join('、') : ''}`);
}
const siteOf = (s) => { const e = Object.entries(s.fac).find(([, v]) => v.site && !v.site.paused); return e ? [e[0], e[1].site] : null; };

// ---- 指令 ----
export function setStyle(s, id, st) { const d = byId(s, id); if (d && (st === 'palm' || st === 'leg')) d.style = st; }
export function setForayPolicy(s, policy) { if (!['allow', 'forbid'].includes(policy)) return false; s.forayPolicy = policy; return true; }
export function setOrder(s, id, order) {
  const d = byId(s, id); if (!d) return false;
  if (order && order !== 'hunt' && !ACTIVITIES[order]) return false;
  if (CLIFF_ACT_NODE[order] && !canLeapCliff(d, CLIFF_ACT_NODE[order])) return false; // 出自 Phase 7 規格：立派後仍可上崖，門檻不變。
  d.order = order || null; cancelTask(s, d, '玩家改派');
  return true;
}
export function chooseHermitageBook(s, id, volume) {
  const d = byId(s, id);
  if (!d || !bookStatus(s, d, volume).ok) return false;
  d.manualChoice = volume;
  return setOrder(s, id, 'readBook');
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
  for (const f of fs) { const key = freeSlot(s, f.id, act, d); if (key) return { f, key, ...freeSpot(s, f.id, act, d) }; }
  if (act === 'rest') { const f = facDef('hall'); return { f, key: `hall:floor:${d.id}`, floor: true }; }
  return null;
}
// ---- v1.6 資料驅動的建築活動：條件、每日上限、效果解讀 ----
const GEN_ACTS = Object.entries(ACTIVITIES).filter(([, A]) => A.gen);
export const GEN_COND = { always: () => true, injured: (s, d) => d.hp < 60 || !!d.part, herb2: (s) => s.res.herb >= 2 && s.res.pill < s.cap.pill, water: (s) => s.res.water < s.cap.water, bell: (s) => phaseOf(s).id === 'dawn' };
export const actDef = (s, act) => (act === 'sig' ? (SIG_ACTS[s.sect?.id] ? { ...ACTIVITIES.sig, ...SIG_ACTS[s.sect.id] } : null) : ACTIVITIES[act]);
const genOf = (s, act, A) => { if (act !== 'sig') return A.gen; const S = SIG_ACTS[s.sect?.id]; return S && { ...A.gen, why: S.why, perDay: S.perDay }; };
const dayOk = (s, act, n) => { if (!n) return true; const c = s.daily?.[act]; return !c || c.day !== s.day || c.n < n; };
const dayUse = (s, act) => { const D = (s.daily ??= {}), c = D[act]; if (!c || c.day !== s.day) D[act] = { day: s.day, n: 1 }; else c.n++; };
// 效果：use 不夠就改用 alt；全部由資料決定，無亂數
export function applyEff(s, d, E, actName) { if (!E) return;
  if (E.use && Object.entries(E.use).some(([k, v]) => (s.res[k] || 0) < v)) return applyEff(s, d, E.alt, actName);
  for (const [k, v] of Object.entries(E.use || {})) { s.res[k] -= v; book(s, 'out', k, v); if (k === 'pill') pillNote(s, 'used', v); }
  for (const [k, v] of Object.entries(E.res || {})) { const nv = Math.min(s.cap[k] ?? Infinity, (s.res[k] || 0) + v); const got = nv - (s.res[k] || 0); book(s, 'in', k, got, 'work'); s.res[k] = nv; if (k === 'pill') pillNote(s, 'made', got); }
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
  return { s, d, n, tr: d.traits, others, pp, low, bt, fun: n.fun ?? 60, food: readyMealCount(s), negWexin: -(d.wexin || 0), ph: phaseOf(s).id,
    shortWood: short('wood'), shortStone: short('stone'), haul, site, PASS, FS: FOOD_SEC, passScore: pp ? passScore(s) : 0,
    wood: s.res.wood + s.ds.reduce((a, o) => a + (o.task?.act === 'chop' ? 1 : 0), 0), stone: s.res.stone + s.ds.reduce((a, o) => a + (o.task?.act === 'quarry' ? 1 : 0), 0),
    passWhy: pp ? `${PASS.why}：帶${pp.p.name}練「${artById(pp.art).name}」` : '', pendingName: d.pendingArt ? artById(d.pendingArt).name : '', btName: bt ? artById(bt).name : '', buildWhy: haul ? '把料搬到工地料堆' : '料齊了，去施工' };
}
const hasMeal = (s) => readyMealCount(s) > 0;
export const PRED = {
  tired: (c) => c.d.tired, wake: (c) => c.n.energy < CORE.wakeAt, hurt: (c) => c.d.hp < 40, hasFood: (c) => hasMeal(c.s), foodLow: (c) => foodLow(c.s), starving: (c) => !!c.d.famished || c.n.hunger < 15, /* v1.7 遲滯：餓昏後吃到 50 才解除 */ hungry: (c) => c.n.hunger < 30,
  others: (c) => c.others.length > 0, pp: (c) => !!c.pp, dull: (c) => c.fun < 25, encourageOk: (c) => !!c.low, pending: (c) => !!c.d.pendingArt && !!artTeacher(c.s, c.d, c.d.pendingArt), // R10：沒有會的人在，就沒有師父能傳
  btOk: (c) => !!c.bt && c.d.mood >= BREAK.moodMin && c.n.energy >= BREAK.energyMin, wexin: (c) => c.d.wexin > 0,
  sparOk: (c) => /* loop15：空地也能徒手過招 */ c.n.energy > 45 && c.others.some((o) => o.needs.energy > 45),
  woodRoom: (c) => c.wood < c.s.cap.wood, stoneRoom: (c) => c.stone < c.s.cap.stone, shortWood: (c) => c.shortWood, shortStone: (c) => c.shortStone,
  ripe: (c) => c.s.plots.some((p) => p.st === 'ripe'), siteWork: (c) => !!c.site && (c.haul || siteReady(c.site[1])),
  nightRest: (c) => c.ph === 'night' && c.n.energy < 95, cookable: (c) => vegFree(c.s) >= 2 && readyMealCount(c.s) < 10,
  forayReady: (c) => c.s.forayPolicy !== 'forbid' && !c.s.band && !c.s.hunt && c.d.role !== 'laborer' && c.d.adult !== false && !expecting(c.s, c.d) && c.n.energy >= 45 && c.n.hunger >= 30 && canExpedition(c.s, [c.d.id]).ok,
  patrolReady: (c) => PRED.forayReady(c) && !!forayChoice(c.s, c.d, 'practice'),
  animalTracks: (c) => (c.s.eco?.boar?.n || 0) > 0 && (c.s.pop?.foot?.n ?? POP.foot.start) > 0,
  practiceStuck: (c) => !!c.d.trainingWish || !!c.bt,
};
const path = (c, p) => { if (p === true) return true; const v = String(p).split('.').reduce((o, k) => o?.[k], c); return String(p).startsWith('tr.') ? v || 1 : v; };
export function valOf(v, c) { if (typeof v === 'number') return v; if (typeof v === 'string') return path(c, v);
  let x = v.pick ? (path(c, v.pick[0]) ? v.pick[1] : v.pick[2]) : v.lin[1] - path(c, v.lin[0]);
  for (const m of v.mul || []) x *= typeof m === 'number' ? m : typeof m === 'string' ? path(c, m) : valOf(m, c);
  return v.plus != null ? v.plus + x : x; }
export const foodLow = (s) => readyMealCount(s) + s.res.veg < FOOD_SEC.perHead * s.ds.filter((d) => !d.away).length; // v1.76 糧食安全；出自 Phase 5 規格：藥膳計一份存糧。
export const vegFree = (s) => s.res.veg - stockReserved(s, 'veg');
const fillWhy = (w, c) => (w || '').replace(/\{([\w.]+)\}/g, (_, p) => path(c, p) ?? '');
// v1.8 後處理解讀器（規則在 score-data.mjs 的 SCORE_POST）
const POST_PRED = { plotWork: (c) => c.plotWork, skip: (c) => c.skip, outer: (c) => c.d.role === 'outer', em: (c) => c.em, myDuty: (c, o) => (c.d.duties || CHORE_ACTS).includes(o.act), owe: (c) => c.owe > 0, foodLow: (c) => foodLow(c.s), head: (c) => c.d.role === 'head' };
const postTest = (k, c, o) => (k === true ? true : k[0] === '!' ? !POST_PRED[k.slice(1)](c, o) : POST_PRED[k](c, o));
function postRows(s, d, out, plotWork) {
  const lab = isLabor(d), c = { s, d, plotWork, FS: FOOD_SEC, K: { LABOR_ACTS: LABOR_ACTS23, LABOR_WORK_MUL, CHORE_ACTS, QUOTA } };
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
  // 25b：沒有熟飯而有菜可下鍋時，煮飯接住同一人的吃飯急迫度。
  // 取 eat 資料列的分數與 need 層，不另設飢餓常數，也不多抽一次選招雜訊。
  if (!hasMeal(s)) {
    const cook = out.find(o => o.act === 'cook');
    const eatRule = SCORE.find(row => row.act === 'eat');
    const tier = eatRule?.tiers.find(row => !row.if || PRED[row.if](c));
    if (cook && tier?.layer === 'need') {
      cook.score = valOf(tier.v, c);
      cook.layer = tier.layer;
      cook.as = 'eat';
      cook.why = '沒飯了，先煮';
    }
  }
  for (const [act, base] of Object.entries({ cliffForage1: 'forage', cliffTrain: 'train', cliffWater: 'water', waterfallTrain: 'train', cliffComprehend: 'meditate' })) {
    const cliffId = CLIFF_ACT_NODE[act], source = out.find(o => o.act === base);
    if (source && canLeapCliff(d, cliffId)) out.push({ act, score: source.score, why: `輕功可到${CLIFFS[cliffId].name}，${ACTIVITIES[act].name}` });
  } // 出自 Phase 6 規格：解鎖後 AI 借原活動分數選崖上同類工作，不另立任意偏好常數。
  {
    const next = HERMITAGE_VOLUMES.find(v => bookStatus(s, d, v.id).ok);
    // 擁有人 2026-11-08：沒有武學的人更想去找師父、找譜。練功的心思沒有東西可練，就整份轉到找武學上：
    // 找譜、讀譜承接當下最想做的自我進修（練功、讀書）的分數，而不只是採集或讀書那一份。
    const bare = !Object.keys(d.arts || {}).length;
    const improve = bare ? out.filter(o => o.act === 'train' || o.act === 'study').sort((a, b) => b.score - a.score)[0] : null;
    const study = out.find(o => o.act === 'study' || o.act === 'train');
    if (next && study) out.push({ act: 'readBook', as: 'train', score: Math.max(study.score, improve?.score || 0), why: `讀《${artById(next.art).name}》的實物卷${bare ? '（還沒有武學可練）' : ''}` });
    const forage = out.find(o => o.act === 'forage') || improve;
    if (s.hermitage.active && forage && d.id === 'hero' && s.ds.length === 1 && !s.hermitage.books?.some(id => volumeById(id)?.source === 'fragment')) out.push({ act: 'searchFragment', ...(bare ? { as: 'train' } : {}), score: Math.max(forage.score, improve?.score || 0), why: `到林中山洞找另一脈拳譜殘卷${bare ? '（還沒有武學可練）' : ''}` });
    // R11 #531：配方齊了才有「自創」可選，工時借打坐；奇書在自己手上、代價付過才讀得了。
    const inv = inventable(s, d), still = out.find(o => o.act === 'meditate') || study;
    if (inv && still) out.push({ act: 'invent', as: 'meditate', score: still.score, why: `把會的幾門融成《${artById(inv.art).name}》` });
    const rare = readableRareBook(s, d);
    if (rare && study) out.push({ act: 'readRare', as: 'train', score: study.score, why: `讀手上的《${rare.name}》` });
  }
  if (s.band && BAND.defendScore > 0 && canDefend(d, s)) out.push({ act: 'defend', score: BAND.defendScore, why: s.band.state === 'go' ? '山賊往菜園來了，去柵邊守著' : '山賊在撞柵，去打退他們' }); // loop3
  if (d.ng && qiMax(d) > 0 && qiOf(d) < qiMax(d) * NG23.medLow) for (const o of out) if (o.act === 'meditate') { o.score *= NG23.medBoost; o.why += '（內力不足，先打坐回氣）'; } /* loop153 */
  if (d.lspec && isLabor(d)) for (const o of out) if (o.act === d.lspec) { o.score *= LABOR23.specMul; o.why += '（拿手活）'; } /* loop155 */
  drawBoost(s, d, out); // loop6
  pairBoost(s, d, out); // loop8
  { const rs = repairScore(s, d); if (rs > 0) out.push({ act: 'repair', score: rs, why: s.fence.hp <= 0 ? '柵被撞破了，得趕快補上' : '柵有破損，去補一補' }); } // loop2 修柵廣告
  demandBoost(s, d, out); repairDamp(s, out); // loop9 缺料需求／loop10 不急修
  const ph = c.ph, sch = SCHEDULE[ph] || {}, n = d.needs;
  const routine = s.routine?.[ph] || ROUTINE_DEFAULT[ph] || 'free';
  // 來犯時回到原本的危機評分；門規作息只安排平日，不使守山者離開柵邊。
  const chosen = s.band ? 'free' : routine === 'train' && d.mood < MOOD.low ? 'meditate' : routine;
  if (chosen === 'meditate' && !out.some((o) => o.act === 'meditate') && offered(s, 'meditate').length) out.push({ act: 'meditate', score: 0, why: '心情低落，照早課門規先靜坐', layer: 'sched' });
  const plotWork = s.plots.some((p) => p.st === 'empty' || p.st === 'ripe');
  // v0.95 統一倍率管線：作息是時段閘門（管線外），性格→天賦組、心情→狀態組、職責/首徒/雇工→外部組
  const tparts = (act) => { const r = (d.personality || []).map((p) => [TRAITS[p]?.name || p, (TRAITS[p]?.mods24?.[act]) || TRAITS[p]?.mods?.[act] || 1]).filter(([, v]) => v !== 1); const vm = valueMul(d, act); if (vm !== 1) r.push(['價值觀', vm]); return r; };
  for (const o of out) { const k = o.as || o.act; /* 找譜、讀譜、自創按它所代替的練功／靜坐算作息、性格與心情 */ const f = { base: o.score, sched: sch[k] || 1, trait: traitMul(d, k), mood: moodMul(d, k), noise: rand(s) * 8, P: { talent: tparts(k), state: k && moodMul(d, k) !== 1 ? [['心情', moodMul(d, k)]] : [], ext: [] } }; o.f = f; }
  postRows(s, d, out, plotWork);
  for (const o of out) { const f = o.f, p = pipeline(f.P); f.talent = p.talent; f.state = p.state; f.ext = p.ext; f.total = p.total; f.text = mulText(p); f.bored = boredMul(s, d, o.act); o.score = f.base * f.sched * p.total * f.bored + f.noise; delete f.P;
    o.layer ??= f.duty || f.labor ? 'duty' : f.sched >= 1.3 ? 'sched' : 'trait'; }
  { const bt = c.bt && PRED.btOk(c); for (const o of out) if (o.act === 'meditate' && o.f) o.f.btOk = bt; btBoost(s, out); } // loop25
  liftBoost(s, d, out); // loop28
  for (const o of out) { const m = appetiteActMul31(d, o.act); if (m !== 1) o.score *= m; } /* loop203：偏好帶日程，不另抽 rand。遠征不在評分動作裡 */
  if(d.trainingWish)for(const o of out)if(d.trainingWish.acts.includes(o.act)&&o.layer!=='need'){const evidence=d.selection?.failures?.[d.trainingWish.kind]||1;o.score*=1+evidence/(1+evidence);o.why+='；想練：'+d.trainingWish.name;}
  const wanted = (o) => chosen === 'work' ? CHORE_ACTS.includes(o.act) : o.act === chosen || o.as === chosen; // 讀譜、自創算在練功／靜坐的作息裡
  for (const o of out) if (chosen !== 'free' && wanted(o) && o.layer !== 'need') { o.why = `門規作息：${ROUTINE_MODES[routine]}${chosen !== routine ? '，心情低落先靜坐' : ''}`; o.layer = 'sched'; }
  return out.sort((a, b) => (b.layer === 'need') - (a.layer === 'need') || (chosen !== 'free' ? Number(wanted(b)) - Number(wanted(a)) : 0) || b.score - a.score);
}

function assign(s, d, act, why) {
  if (act === 'readBook') {
    const volume = d.manualChoice && bookStatus(s, d, d.manualChoice).ok ? d.manualChoice : HERMITAGE_VOLUMES.find(v => bookStatus(s, d, v.id).ok)?.id;
    if (!volume) return false;
    d.task = { act, node: 'hall', phase: 'go', volume }; goto(d, 'hall'); d.reason = why || '讀拳譜'; return true;
  }
  if (act === 'invent') {
    const r = inventable(s, d); if (!r) return false;
    d.task = { act, node: 'hall', phase: 'go', art: r.art }; goto(d, 'hall'); d.reason = why || `閉關自創《${artById(r.art).name}》`; return true;
  }
  if (act === 'readRare') {
    const b = readableRareBook(s, d); if (!b) return false;
    d.task = { act, node: 'hall', phase: 'go', book: b.id }; goto(d, 'hall'); d.reason = why || `研讀《${b.name}》`; return true;
  }
  if (act === 'searchFragment') {
    if (!s.hermitage?.active || d.id !== 'hero' || s.ds.length !== 1 || s.hermitage.books?.some(id => volumeById(id)?.source === 'fragment')) return false;
    d.task = { act, node: 'forest2', phase: 'go' }; goto(d, 'forest2'); d.reason = why || '林中山洞尋殘卷'; return true;
  }
  if (CLIFF_ACT_NODE[act]) {
    const cliffId = CLIFF_ACT_NODE[act]; if (!canLeapCliff(d, cliffId)) return false;
    d.task = { act, node: cliffId, phase: 'go' }; goto(d, cliffId); d.reason = why || `上${CLIFFS[cliffId].name}${ACTIVITIES[act].name}`; return true;
  }
  if (act === 'foray' || act === 'patrol') {
    if ((act === 'foray' && !PRED.animalTracks({ s })) || d.needs.energy < 45 || d.needs.hunger < 30) return false;
    const motive = act === 'foray' ? 'food' : 'practice', choice = forayChoice(s, d, motive); if (!choice) return false;
    const result = startExp0(s, [d.id], { target: choice.target }, H); if (!result.ok) return false;
    s.exp.autonomous = why !== '玩家指派'; s.exp.outing = act; s.exp.focus = { seg: choice.seg, key: choice.key, motive };
    s.exp.glimmerBefore = (d.glimmer?.known || []).length;
    const stats = (s.forayStats ??= { starts: 0, patrols: 0, hurt: 0, discoveries: 0, targets: [] }); stats.starts++; if (act === 'patrol') stats.patrols++;
    (stats.targets ??= []).push({ day: s.day, seg: choice.seg, key: choice.key, motive });
    d.reason = choice.key ? `${why}；追${ENEMIES[choice.key].name}` : `${why}；走${ROUTE[choice.index].name}看獸跡`;
    log(s, `${d.name}決定${act === 'foray' ? '出獵' : '巡山'}：${d.reason}`); return true;
  }
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
    const p = act === 'encourage' ? chatMates(s, d).filter((o) => o.mood < 35).sort((a, b) => a.mood - b.mood)[0] : (act === 'chat' ? pickChatMate(s, d, chatMates(s, d), aff) : chatMates(s, d).sort((a, b) => aff(s, d, b) - aff(s, d, a))[0]);
    if (!p) return false;
    if (p.task) cancelTask(s, p, `被${d.name}拉去${act === 'spar' ? '切磋' : '聊天'}`);
    const node = act === 'spar' ? 'yard' : 'court'; d.task = { act, fac: 'yard', node, phase: 'go', partner: p.id, resv: [`actor:${p.id}`] }; p.task = { act, fac: 'yard', node, phase: 'go', partner: d.id, resv: [`actor:${d.id}`] }; reserve(s, d, `actor:${p.id}`); reserve(s, p, `actor:${d.id}`);
    goto(d, node); goto(p, node); d.reason = why; p.reason = act === 'spar' ? `${d.name}邀來切磋` : act === 'encourage' ? `${d.name}來陪我說說話` : `${d.name}找來聊天`; if (act === 'encourage') p.task.act = 'chat', p.task.encouragedBy = d.id; return true;
  }
  if (act === 'defend') { if (!s.band || !canDefend(d, s)) return false; d.task = { act, node: FENCE.node, phase: 'go' }; goto(d, FENCE.node); d.reason = why; return true; }
  if (act === 'repair') { if (!(repairScore(s, d) > 0)) return false; d.task = { act, node: FENCE.node, phase: 'go' }; goto(d, FENCE.node); d.reason = why; return true; }
  if (act === 'eat' && !hasMeal(s)) return false;
  if (act === 'eat' && !d.noPairMeal) mealInvite(s, d);
  if (act === 'cook' && vegFree(s) < STOCK_RESV.cook.amt) return false;
  let plot; if (act === 'farm') { plot = s.plots.findIndex((p, i) => (p.st === 'ripe' || p.st === 'empty') && !holder(s, `plot:${i}`)); if (plot < 0) return false; }
  const b = bestFac(s, d, act); if (!b) { if (act === 'train' || act === 'meditate') d.reason = `${ACTIVITIES[act].name}的站位都有人，先在附近等或改做別的事`; return false; } const f = b.f;
  const resv = [b.key]; if (act === 'cook') resv.push(stockKey('veg', d)); if (act === 'farm') resv.push(`plot:${plot}`); for (const k of resv) reserve(s, d, k);
  if (ACTIVITIES[act]?.gen) dayUse(s, act);
  d.task = { act, fac: f.id, node: f.node, phase: 'go', plot, resv, floor: b.floor || undefined, spot: b.spot, spotKind: b.spotKind }; goto(d, f.node, b.xy); d.reason = why; return true;
}
function arrangeGuidance(s){
  if(emergency(s)||s.band||phaseOf(s).id==='night')return;
  const free=d=>!d.away&&!d.order&&!d.carry&&d.hp>30&&d.needs.energy>45&&d.needs.hunger>30&&!d.path?.length&&(!d.task||['train','leisure','meditate'].includes(d.task.act));
  for(const p of s.ds){if(p.role==='laborer'||(!p.guidanceMentor&&!p.originRelation)||!free(p)||(p.timeToday?.guided||0)>=guidanceSeconds(p))continue;
    const choice=mentorFor(s,p),m=choice?.m;if(!m||!free(m))continue;p.guidanceMentor=m.id;
    cancelTask(s,m,'騰出時辰指點');cancelTask(s,p,'請師父餵招');const a=bestFac(s,m,'train');if(!a)continue;
    reserve(s,m,a.key);m.task={act:'spar',fac:a.f.id,node:a.f.node,phase:'go',partner:p.id,guidanceFor:p.id,resv:[a.key,`actor:${p.id}`],spot:a.spot,spotKind:a.spotKind};reserve(s,m,`actor:${p.id}`);
    const b=bestFac(s,p,'train');if(!b){cancelTask(s,m,'等不到共同指點站位');continue;}
    reserve(s,p,b.key);reserve(s,p,`actor:${m.id}`);p.task={act:'spar',fac:b.f.id,node:b.f.node,phase:'go',partner:m.id,guidanceFrom:m.id,resv:[b.key,`actor:${m.id}`],spot:b.spot,spotKind:b.spotKind};
    goto(m,a.f.node,a.xy);goto(p,b.f.node,b.xy);m.reason=`花真時辰指點${p.name}`;p.reason=`請${m.name}糾正生招`;
  }
}
function goto(d, node, xy = null) { const p = route(d.at, node, d); d.path = p.slice(1).map((n) => ({ n, xy: NODES[n] })); if (!d.path.length) d.path = [{ n: node, xy: NODES[node] }]; if (xy) d.path.push({ n: node, xy }); }

// ---- M3（loop148）結伴吃飯、送飯給忙碌／受傷的另一半；柵破避難 ----
export const PAIR = { mealSocial: 6, mealRel: 1, hungry: 30, hurt: 50, feedHunger: 35, feedRel: 3, inviteMax: 70 };
const BUSY = new Set(['build', 'farm', 'cook', 'chop', 'quarry', 'repair', 'defend', 'train', 'meditate', 'study', 'forage', 'deliver']);
export function pairOf(s, d) {
  const sp = d.spouse && byId(s, d.spouse); if (sp && !sp.removed) return sp;
  const sw = d.sweet && byId(s, d.sweet); if (sw && sw.sweet === d.id) return sw;
  const m = d.mates ? Object.entries(d.mates).filter(([, n]) => n >= MENTOR.pairAt).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0] : null;
  return m ? byId(s, m[0]) || null : null;
}
function mealInvite(s, d) {
  const p = pairOf(s, d); if (!p || p.away || p.order || p.carry || p.needs.hunger > PAIR.inviteMax || readyMealCount(s) < 2) return;
  if (p.task && !['leisure', 'chat'].includes(p.task.act)) return;
  if (p.task) cancelTask(s, p, `${d.name}喊一起吃飯`);
  p.noPairMeal = true; const ok = assign(s, p, 'eat', `${d.name}喊一起吃飯`); p.noPairMeal = false;
  if (ok) { p.task.mate = d.id; d.pendingMate = p.id; }
}
function feedGo(s, d) {
  if (d.order || d.needs.hunger < 50 || d.needs.energy < 30 || s.res.food < 1) return false;
  const p = pairOf(s, d); if (!p || p.away || p.removed || p.needs.hunger >= PAIR.hungry) return false;
  const busy = p.task && BUSY.has(p.task.act), hurt = p.hp < PAIR.hurt; if (!busy && !hurt) return false;
  if (s.ds.some((o) => o.task?.act === 'feed' && o.task.to === p.id)) return false;
  d.task = { act: 'feed', phase: 'go', to: p.id, node: p.at || 'court', why: hurt ? 'hurt' : 'busy' }; goto(d, p.at || 'court');
  d.reason = `給${hurt ? '受傷' : '忙著'}的${p.name}送飯`; d.decision = { layer: 'pair', act: 'feed', why: d.reason }; return true;
}
function feedStep(s, d) {
  const t = d.task, p = byId(s, t.to); if (!p || p.away || s.res.food < 1) { d.task = null; return; }
  if (d.path.length) return; if (p.path?.length || dist(d.pos, p.pos) > 60) { goto(d, p.at || 'court'); if (d.path.length) return; }
  resAdd(s, 'food', -1, 'feeding'); p.needs.hunger = clamp(p.needs.hunger + PAIR.feedHunger, 0, 100); relAdd(s, d, p, PAIR.feedRel); think(s, p, 'fedBy'); think(s, d, 'helped');
  tallyAct(d, 'feed', 2); recordDeed(s, d, 'feed', { to: p.id }); log(s, `${d.name}端了一碗飯給${t.why === 'hurt' ? '養傷' : '正忙'}的${p.name}`, 'low'); d.task = null; d.anim = null;
}
function shelterGo(s, d) {
  if (!(d.shelter > s.t)) return false; const node = d.shelterAt || 'hall';
  d.task = { act: 'shelter', phase: 'go', node }; goto(d, node); d.reason = '柵破了，先躲進屋裡'; d.decision = { layer: 'pair', act: 'shelter', why: d.reason }; return true;
}
const STAGE_NAME = ['', '踏入大成', '臻至化境', '返璞歸真'];
/* M1：衝關事蹟；大事紀只記「本門第一位達到此境」與「某人第一門返璞歸真」，免得洗版 */
/* loop148 v2.25（決定 140）：v22 只有本門第一位化境、第一位返璞歸真、掌門本人化境才暫停（top）；其餘化境走竹簡（mid）。舊局回 null＝照舊依字樣分級 */
export function breakTier(s, d, r) {
  if (r.stage < 2) return null; const A = (s.alertFirst ??= {}), k = `b${r.stage}`, top = !A[k] || (r.stage === 2 && d.id === 'hero');
  A[k] = true; return top ? 'top' : 'mid';
}
function breakDeed(s, d, r) {
  const firstSect = !(s.chronFirst ||= {})[`break${r.stage}`], firstSelf = r.stage === 3 && !(d.deedN?.break3);
  recordDeed(s, d, 'break'); recordDeed(s, d, `break${r.stage}`);
  if (r.stage >= 2 && (firstSect || firstSelf)) { s.chronFirst[`break${r.stage}`] = true; recordDeed(s, null, 'breakChron', { chron: `${d.name}「${r.art.name}」${STAGE_NAME[r.stage]}${firstSect ? '（本門第一人）' : ''}` }); }
}
function decide(s, d) {
  if (d.carry) { d.task = { act: 'deliver', phase: 'return', node: 'court', walkStart: d.walked }; goto(d, 'court'); d.reason = '先把東西送回院倉'; d.decision = { layer: 'carry', act: 'deliver', why: d.reason }; return true; }
  if (d.order) {
    const o = d.order; if (o !== 'hunt' && (d.needs.energy < 15 || (o !== 'eat' && d.needs.hunger < 10 && hasMeal(s)))) { const a = d.needs.energy < 15 ? 'rest' : 'eat'; d.decision = { layer: 'need', act: a, why: '指派中先自理' }; return assign(s, d, a, '指派中先自理'); }
    if (assign(s, d, o, '玩家指派')) { onAssign(s, d, o, true); d.decision = { layer: 'order', act: o, why: '玩家指派' }; return true; }
    if (!d.reason?.includes('站位都有人')) d.reason = `指派「${o === 'hunt' ? '狩獵' : ACTIVITIES[o].name}」暫不可行`; return false;
  }
  if ((shelterGo(s, d) || feedGo(s, d))) return true; // M3
  const sc = scoreActs(s, d).filter((c) => !isBaby(d) || BABY_ACTS.includes(c.act)); d.why = sc.slice(0, 3).map((c) => ({ act: c.act, score: Math.round(c.score), f: c.f, why: c.why }));
  let noPracticeSpot = '';
  for (const c of sc) {
    if (assign(s, d, c.act, c.why)) { if (noPracticeSpot) d.reason = `${noPracticeSpot}；${d.reason}`; d.picked = c.act; d.decision = { layer: c.layer, act: c.act, why: d.reason }; return true; }
    if ((c.act === 'train' || c.act === 'meditate') && d.reason?.includes('站位都有人')) noPracticeSpot = d.reason;
  }
  return false;
}

export function speedOf(d, s = null) { return BASE_SPEED / (s ? bodyMassMul(s, d) : 1) * (1 + d.skills.agility / 100) * (d.carry ? 0.7 : 1) * (d.needs.energy < 30 ? 0.8 : 1) * (1 + NG23.speedPerTier * Math.max(0, effectTier(d, 'speed') + 1) * stepDrive(d)) * (1 + 0.002 * mastery(d, 'shenfa')) * (d.path?.length ? yuqiMul(d) : 1) * (hermitageStepActive(d) ? 1.35 : 1); } /* 出自 Phase 6 規格：隱居主角悟輕功後腳程 +35%；舊角色沿原公式。 */

export function moveStep(d, dt, s = null) {
  if (d.path.length && yuqiOn(d)) d.qi = Math.max(qiMax(d) * NG23.yuqi.keep, qiOf(d) - NG23.yuqi.drain * dt); /* loop153 御氣耗氣，留三成底、不會力竭 */
  let left = speedOf(d, s) * dt;
  while (left > 0 && d.path.length) {
    const tgt = d.path[0].xy, L = dist(d.pos, tgt), slope = cliffSlopeFactor(d.at, d.path[0].n);
    if (L <= left * slope) { d.pos = [...tgt]; d.at = d.path[0].n; d.path.shift(); left -= L / slope; d.walked += L; }
    else { const step = left * slope; d.face = tgt[0] >= d.pos[0] ? 1 : -1; d.pos[0] += (tgt[0] - d.pos[0]) * step / L; d.pos[1] += (tgt[1] - d.pos[1]) * step / L; d.walked += step; left = 0; }
  }
  d.skills.agility = Math.min(100, d.skills.agility + 0); // 腳力成長於交付時結算
}

function grow(s, d, sk, amt, src = 'train') {
  if (sk === 'style') sk = d.style; const raw = amt; /* loop79：造詣只吃原始投入（師父在場倍率前） */
  if (bodyConditionOn(s) && src === 'labor' && ['strength', 'agility'].includes(sk)) return; // 出自 Phase 5 規格：新局體魄由疲勞週期結算，不能從舊勞作通路繞過 18 點上限。
  const before = d.skills[sk]; d.skills[sk] = Math.min(100, before + amt * (d.traits.diligent || 1) * 0.3 * (1 - before / 130) * focusMul(d));
  if (src === 'labor' && sk === 'strength' && d.lg) d.skills[sk] = before + workStrCap(d, Math.floor(s.t / DAY), d.skills[sk] - before); // loop127 做活力氣每日軟上限
  if (sk === d.style) { growEnsure(d); const o = gainArt(d, amt * (d.arts ? teachMul(s, d, focusOf(d)) : 1), focusMul(d), s.t, { raw, src }); /* #415 N12 師父傳授時段：這門名功練得快 */ if (o.feed) log(s, `${d.name}【${o.feed.label}】內功《${o.feed.name}》長進 ${o.feed.xp.toFixed(2)}`); if (o.next) log(s, `${d.name}功夫到了火候，可向師父求學「${o.next.name}」`); for (const m of o.moves) log(s, `${d.name}把已學套路的「${MOVES.find((x) => x.id === m).name}」練成了`); if (o.star) log(s, `${d.name}的基本功又添一顆星`); return o; }
}

export const scenicRecovery = (d, cliff, seconds) => {
  if (!cliff?.scenery) return;
  d.needs.fun = clamp((d.needs.fun ?? 60) + ACTIVITIES.leisure.fun * seconds / ACTIVITIES.leisure.dur, 0, 100);
}; // 24e：景致用現有休閒同秒數的解悶速率，心情再由 moodStep 回復。
function doTask(s,d,dt){
  if(d.downUntil>s.t){d.anim='down';if(d.task?.act==='trial')trialStep(s,d,dt);return;}
  if(pickupDrop(s,d))return;
  const t = d.task, A = actDef(s, t.act) || {};
  if (t.act === 'hunt') return;
  if (t.act === 'trial') return trialStep(s, d, dt);
  if (t.act === 'feed') return feedStep(s, d);
  if (t.act === 'shelter') { if (!(d.shelter > s.t)) { d.task = null; d.anim = null; d.shelter = undefined; } return; }
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
    if (CLIFFS[t.node] && !s.hermitage.exploredCliffs?.includes(t.node)) { (s.hermitage.exploredCliffs ??= []).push(t.node); log(s, `${d.name}踏上${CLIFFS[t.node].name}，望見山路又開了一層。`); }
    t.phase = 'do'; t.timer = 0; d.anim = t.act;
  }
  if (t.phase === 'do') {
    noteGuidance(s,d,dt);
    if (t.act === 'build') { const site = s.fac[t.fac].site; if (!site || site.paused || !siteReady(site)) { d.task = null; d.anim = null; return; } }
    t.timer += dt;
    if (t.partner && !byId(s, t.partner)) { cancelTask(s, d, '對手不在了'); return; }
    if (t.act === 'spar' && t.partner && Math.floor(t.timer / 1.2) !== Math.floor((t.timer - dt) / 1.2)) { const p = byId(s, t.partner); const mv = MOVES.find((m) => m.id === d.moves[d.moves.length - 1]); s.fx.push({ kind: 'move', mfx: mv.fx, zx: (d.zixia || 0) >= 5, name: mv.name, color: mv.color, from: [...d.pos], to: [...p.pos], r: 12, ttl: 0.6 }); d.face = p.pos[0] >= d.pos[0] ? 1 : -1; d.anim = 'strike'; }
    const effDur = durOf(s, t) * bodyMassMul(s, d) / (laborSpeed(s, d, t.act)); /* R7：孕期多出的體重讓活做得慢 */ /* loop155 幫工專長／清修 */
    if (A.energy && effDur > 0) d.needs.energy = clamp(d.needs.energy + A.energy * dt / effDur * (['water', 'chop', 'quarry', 'farm', 'forage', 'cliffForage1', 'cliffTrain', 'cliffWater', 'waterfallTrain'].includes(t.act) && hermitageInnerActive(d) ? 0.75 : 1), 0, 100); // 出自 Phase 6 規格：悟心法後做活精力消耗 −25%。
    if (t.act === 'rest' && d.ng) addQi(d, (restQi(d)) * dt); // loop103 歇息回內力
    if (t.act === 'rest') { const rate = (facStage(s, t.fac).restRate || 3) * (t.floor ? 0.6 : 1) * (1 + ART_GAIN.restPerTier * Math.max(0, effectTier(d, 'rest') + 1)) * effectMul(d, 'rest', s.t); if (t.timer < dt * 1.5) think(s, d, t.floor || (t.fac === 'hall' && s.fac.hall.stage === 0) ? 'floorSleep' : 'bedSleep'); d.needs.energy = clamp(d.needs.energy + rate * dt, 0, 100); d.hp = clamp(d.hp + 3 * dt, 0, 100); const night = phaseOf(s).id === 'night' && !s.hunt?.team.includes(d.id); if (!night && (d.needs.energy >= 100 || (d.order !== 'rest' && d.needs.energy >= CORE.wakeAt && t.timer > 4))) { restBodyCondition(d, s); finish(s, d); } return; }
    if (t.act === 'build') { const site = s.fac[t.fac].site; site.work += dt; d.needs.energy = clamp(d.needs.energy - dt, 0, 100); grow(s, d, 'strength', 0.2 * dt, 'labor'); if (site.work >= site.workNeed) { finishBuild(s, t.fac); finish(s, d); } else if (t.timer >= A.dur) finish(s, d); return; }
    const dur = effDur;
    if (t.timer >= dur) {
      if (t.act === 'cook') { const st = facStage(s, t.fac); resAdd(s, 'veg', -2); t.phase = 'done'; const wat = s.res.water >= 1 ? 1 : 0; if (wat) { s.res.water -= 1; book(s, 'out', 'water', 1); } const yld = st.cookYield + cookBonus(d) + wat; /* v1.6 有井水多煮一份 */ onCook(s, d); resAdd(s, 'food', yld, 'kitchen'); log(s, `${d.name}在${st.name}煮好 ${yld} 份飯`); const meal = cookMedicatedMeal(s, d); if (meal) log(s, `${d.name}採藥入鍋，把其中一份升作${meal}。`); grow(s, d, 'cooking', 6); finish(s, d); return; }
      if (t.act === 'farm') { const p = s.plots[t.plot]; t.resv = []; grow(s, d, 'farming', 6); stepWorkCondition(d, s, 'farm', 1, effDur); if (p.st === 'ripe') { p.st = 'empty'; p.g = 0; d.carry = { veg: HARVEST }; t.phase = 'return'; d.anim = null; goto(d, 'court'); t.walkStart = d.walked; return; } p.st = 'grow'; p.g = 0; finish(s, d); return; }
      if (A.use) {
        if (t.act === 'eat' && bodyConditionOn(s) && s.res.medFood > 0) { const meal = applyMedicatedMeal(d, s); if (meal) { if (meal.cold || meal.bee) { addQi(d, restQi(d)); d.mood = clamp(d.mood + PAIR.mealSocial, 0, 100); } log(s, `${d.name}吃下${meal.name}，有肉有藥，做活長得比只吃白飯快${meal.cold || meal.bee ? `；${meal.cold ? '寒潭靈泉' : '玉蜂漿'}也回了內息與心情` : ''}。`); } }
        else { if (s.res.food < 1) { d.task = null; d.anim = null; d.reason = '沒糧了'; return; } resAdd(s, 'food', -1, 'meal'); if (t.act === 'eat') applyPlainMeal(d, s); }
      }
      if (A.need?.hunger) { const b = facStage(s, t.fac).mealBonus || 0; d.needs.hunger = clamp(d.needs.hunger + A.need.hunger + b, 0, 100); if (b) { d.needs.social = clamp(d.needs.social + b / 2, 0, 100); think(s, d, 'hallMeal'); } likeMeal(s, d, think); }
      let trainedArt = null;
      acquireWorkTool(d, t.act);
      finishTrainingWish(d,t.act);
      if (['train', 'spar', 'cliffTrain', 'waterfallTrain'].includes(t.act)) { const moves = d.moves.map((id) => MOVES.find((m) => m.id === id)).filter((m) => m && moveAvailable(d,m)); rehearse(s,d,moves,effDur*guidanceLearning(d),{partner:t.act === 'spar' ? byId(s,t.partner) : null}); }
      else if (['chop','quarry','water','farm','forage', 'cliffForage1', 'cliffWater'].includes(t.act)) practiceWork(s,d,CLIFF_ACT_NODE[t.act] ? t.act === 'cliffWater' ? 'water' : 'forage' : t.act,effDur);
      if (['chop', 'quarry', 'water', 'forage', 'train'].includes(t.act)) stepWorkCondition(d, s, t.act, 1, effDur);
      if (t.act === 'cliffForage1') stepWorkCondition(d, s, 'forage', 1, effDur);
      if (t.act === 'cliffWater') stepWorkCondition(d, s, 'water', 1, effDur);
      if (t.act === 'cliffTrain') stepWorkCondition(d, s, 'train', 1, effDur);
      if (t.act === 'waterfallTrain') stepWorkCondition(d, s, 'train', 1, effDur); // 24e：比例與衝擊力有量尺前，不另加瀑下負荷。
      if (A.skill) for (const [k, v] of Object.entries(A.skill)) { if (t.act === 'cliffWater' && k === 'strength') continue; const o = grow(s, d, k, v * (['train', 'spar', 'cliffTrain', 'waterfallTrain'].includes(t.act) ? guidanceLearning(d) : 1), isWorkAct(t.act) ? 'labor' : 'train'); if (['train', 'cliffTrain', 'waterfallTrain'].includes(t.act) && o?.trained) trainedArt = o.trained; } // 24e：木樁場多站位與切磋，不給地點 XP 倍率；同人同心情崖／場每次成長相等。
      if (A.skill) cliqueTrain(s, d, t.act, A.skill, grow); // loop20 小派同修
      if (t.act === 'train') coTrain(s, d, A.skill?.style || 0, grow, relAdd, log); // loop8 同修
      if (trainedArt) noteTrain31(d, artById(trainedArt)); /* 一次練功只記一次，同修再長的熟練不另計 */
      if ((t.act === 'chat' || t.act === 'spar') && t.partner && d.id < t.partner) askStrong(s, d, byId(s, t.partner), grow, think, log); // loop8 請教
      // N42：平常練習只累積 N33 的手眼熟；整門功夫須有師父或譜。
      if (t.act === 'spar' && t.partner) { const p = byId(s, t.partner); if (d.id < p.id) { relAdd(s, d, p, 2); log(s, `${d.name}與${p.name}在${facStage(s, 'yard').offers.includes('spar') ? '木樁場' : '空地上徒手'}切磋`); addMem(s, d, p, 'spar'); const strength = (x) => (x.skills?.palm || 0) + (x.skills?.leg || 0) + (x.skills?.agility || 0); if (strength(d) !== strength(p)) recordSocialEvent(s, 'sparLoss', strength(d) > strength(p) ? d : p, strength(d) > strength(p) ? p : d); } }
      // R3：隱居局不再因練功或切磋而直接取得整門武學；須讀卷或由會的人傳授。
      if (A.fun) d.needs.fun = clamp((d.needs.fun ?? 60) + A.fun, 0, 100);
      if (t.act === 'leisure') think(s, d, 'idled');
      if (t.act === 'forage') d.needs.fun = clamp((d.needs.fun ?? 60) + (d.personality.includes('playful') ? 20 : 8), 0, 100);
      if (t.act === 'eat' && readyMealCount(s) >= 8) think(s, d, 'wellFed');
      if (t.act === 'eat' && (t.mate || d.pendingMate)) { const p = byId(s, t.mate || d.pendingMate); d.pendingMate = undefined; if (p && (p.task?.act === 'eat' || p.lastAte === s.t) && (p.task?.mate === d.id || p.pendingMate === d.id || t.mate === p.id)) { d.needs.social = clamp(d.needs.social + PAIR.mealSocial, 0, 100); think(s, d, 'mealPair'); if (d.id < p.id) { relAdd(s, d, p, PAIR.mealRel); log(s, `${d.name}和${p.name}湊在一桌吃飯`, 'low'); } } }
      if (A.social) d.needs.social = clamp(d.needs.social + A.social, 0, 100);
      if (t.act === 'meditate') { const b = btReady(d, s.t); if (!b) for (let i = 0; i < (facStage(s, t.fac).medEase || 1); i++) easeWexin(s, d); const r = b && resolveBreak(d, b, s.t, rand(s) - ngBreak(d)); /* loop105 內力衝關：成功率 +btBonus，仍封頂 0.9；loop108 已達 0.9 不扣 */ if (r?.ok && r.stage <= 2) { growEnsure(d); settleGrowth(d, r.art, d.arts[r.art.id], { src: 'break', stage: r.stage }); } /* loop79 突破里程碑 */ const bTier = r?.ok && breakTier(s, d, r); if (r?.ok) breakDeed(s, d, r); if (r?.ok) { think(s, d, 'btWin'); log(s, `${d.name}打坐衝關成功：「${r.art.name}」${r.stage === 1 ? '踏入大成' : r.stage === 2 ? '臻至化境' : '返璞歸真'}！`, bTier || undefined); s.fx.push({ kind: 'break', pos: [...d.pos], ttl: 1.2 }); } else if (r) { think(s, d, 'btFail'); log(s, `${d.name}衝關「${r.art.name}」失敗，歇一天再試`); } }
      if (t.act === 'meditate' && d.ng) addQi(d, medQi(d)); // loop103 打坐一次回內力（衝關扣用在前）
      if (t.act === 'learn' && d.pendingArt) { const teacher = artTeacher(s, d, d.pendingArt); if (teacher) { const m = learnArt(d, d.pendingArt, s.t); s.rep = (s.rep || 0) + REP.learn; log(s, `${teacher.name}傳授${d.name}「${m.name}」！`); think(s, d, 'learned'); } }
      if ((t.act === 'chat' || t.act === 'spar') && t.partner && d.id < t.partner) { const c = (s.cnt ??= { chat: 0, spar: 0 }); c[t.act]++; } // loop22 完成場次計數（opt-in）
      if (t.act === 'chat' && t.partner) { const p = byId(s, t.partner); d.together += 20; if (isLabor(d) && !isLabor(p)) d.cowork = (d.cowork || 0) + 30;
        if (t.encouragedBy) { think(s, d, 'encouraged', `（${p.name}）`); }
        else if (d.id < p.id) { const cm = Math.min(compat(d, p), compat(p, d)); if (cm < 1 && rand(s) < (1 - cm) * 0.8) { relAdd(s, d, p, 1); for (const x of [d, p]) think(s, x, 'badChat', `（${x === d ? p.name : d.name}）`); log(s, `${d.name}與${p.name}聊不到一塊`); } else { relAdd(s, d, p, 4 * Math.max(d.traits.social || 1, p.traits.social || 1)); think(s, d, 'goodChat', `（${p.name}）`); think(s, p, 'goodChat', `（${d.name}）`); const ln = chatLine(s, d, p), K = `${d.id}|${p.id}`; (s.memTalk ??= {}); if (ln && s.memTalk[K] !== s.day) { s.memTalk[K] = s.day; log(s, ln, 'low'); } addMem(s, d, p, 'chat'); admire(s, d, p, relAdd, think, log); } } }
      if (t.act === 'encourage' && t.partner) { const p = byId(s, t.partner); think(s, d, 'helped'); relAdd(s, d, p, 3); log(s, `${d.name}陪心情低落的${p.name}說了好一會兒話`); }
      if (t.act === 'repair') repairDone(s, d);
      if (t.act === 'pass' && t.lead && t.partner) { const p = byId(s, t.partner); if (p) passDo(s, d, p, t.art); }
      if (t.act === 'study') { const w = readStudy(s, d); if (w) log(s, `${d.name}在藏經閣讀了許久，忽然開竅——悟性長進了${d.rootKnown ? `（${w}）` : ''}。`); } // loop140 讀書長悟性
      if (t.act === 'study' && t.fac === 'library') { const page = readLuohanBook(d, effDur, s.t); if (page.learned) { log(s, `【拳譜】${d.name}對照身體起手，把《少林羅漢十八手》的二十二段讀完，開始依譜練掌。`); think(s, d, 'learned'); } else if (page.form) log(s, `${d.name}讀《羅漢十八手》到「${page.form}」，照著圖譜試擺。`, 'low'); }
      if (t.act === 'readBook') { const result = readHermitageBook(s, d, t.volume, effDur); if (result.learned) { d.manualChoice = null; think(s, d, 'learned'); } }
      if (t.act === 'searchFragment') forestFragment(s, d);
      if (t.act === 'invent' && inventArt(s, d, t.art).ok) think(s, d, 'learned'); // R11：完成時配方仍要齊
      if (t.act === 'readRare' && readRareBook(s, d, t.book).learned) think(s, d, 'learned');
      if (t.act === 'cliffComprehend') {
        cliffBook(s, d); // R3：拓錄成實物卷，回山讀完才學會。
      }
      // 合參創派不由讀書或打坐的次數自動送出整門功夫。
      /* loop181 v2.8 經脈內傷：練功／切磋逆催累積，打坐／醫館化解 */
        finishTrainingWish(d,t.act);
      if (t.act === 'train' || t.act === 'spar') { const w = qiInjuryAdd28(s, d); if (w) log(s, `【經脈暗傷】${d.name}強以異種內息催動他派武學《${w.name}》，真氣逆行，經脈隱隱作痛！`); }
        if (t.act === 'meditate') qiInjuryCure28(s, d, DRIVE28.med);
        if (t.act === 'heal' && (d.part||d.wounds?.length)) for (let i = 0; i < (facStage(s, t.fac).woundSteps || 1); i++) partHeal(s, d, specK(bestSpec(s, 'yishu')) > 0 ? 'doctor' : 'heal'); /* #427 療傷 */
        if (t.act === 'heal' && d.qiInjury) qiInjuryCure28(s, d, specK(bestSpec(s, 'yishu')) > 0 || s.ds.some((o) => o.arts?.linjiZhuang) ? 100 : DRIVE28.heal);
      const hp0 = d.hp, pill0 = s.res.pill || 0; if (A.eff) applyEff(s, d, A.eff, A.name);
      if (t.act === 'heal' && facStage(s, t.fac).healBonus) applyEff(s, d, { hp: facStage(s, t.fac).healBonus, log: false }, A.name);
      specGrow(d, t.act); /* loop151 v2.3 專長 */
        if (t.act === 'heal' && d.hp > hp0) { const k = specK(bestSpec(s, 'yishu')); if (k > 0) d.hp = Math.min(100, d.hp + (d.hp - hp0) * SPEC.healMax * k); }
        if (t.act === 'brew' && (s.res.pill || 0) > pill0 && specM(d, 'yishu') > 0) { d.brewN = (d.brewN || 0) + 1; if (d.brewN % SPEC.brewEvery === 0) { resAdd(s, 'pill', 1); log(s, `${d.name}依醫書配伍，多煉出一顆丹藥。`); } }
      if (A.carry && t.act === 'forage' && specM(d, 'dushu') > 0) { d.carry = { ...A.carry, herb: (A.carry.herb || 0) + 1 }; t.phase = 'return'; d.anim = null; goto(d, 'court'); t.walkStart = d.walked; return; }
      if (A.carry) { d.carry = { ...A.carry }; t.phase = 'return'; d.anim = null; goto(d, 'court'); t.walkStart = d.walked; return; }
      finish(s, d);
    }
  }
  if (t.phase === 'return' && !d.path.length) {
    for (const [k, v] of Object.entries(d.carry)) { const nv = Math.min(s.cap[k] ?? 99, s.res[k] + v); book(s, 'in', k, nv - s.res[k], 'work'); s.res[k] = nv; }
    d.carry = null; finish(s, d);
  }
}
function finish(s, d) { if (d.task) markDone(s, d, d.task.act); if (d.task && CHORE_ACTS.includes(d.task.act) && !isLabor(d)) d.chore = (d.chore || 0) + 1; if (d.task?.trial) resolveTrial(s, d); d.task = null; d.anim = null; }

// ---- #417 N13 傳功共同任務：師父走到外功場等徒弟；徒弟到齊才倒數，徒弟在場練那門才 ×2 ----
export const TEACH_JOIN = { node: 'yard', wait: DAY / 8 };
function teachStep(s, m, dt) {
  const p = m.teaching && byId(s, m.teaching.pupil);
  if (!p || p.away || !(m.teachCool > 0)) { if (p) p.teachArt = null; if (m.task?.act === 'teach') m.task = null; m.teachCool = 0; return false; }
  if (!m.task) { const b = bestFac(s, m, 'train'); if (!b) { m.reason = `傳功站位都有人，等有人練完`; return true; }
    reserve(s, m, b.key); m.task = { act: 'teach', node: TEACH_JOIN.node, phase: 'go', partner: p.id, wait: 0, resv: [b.key], spot: b.spot, spotKind: b.spotKind }; goto(m, TEACH_JOIN.node, b.xy); m.reason = `到外功場傳授${p.name}`; }
  const t = m.task;
  if (m.path.length) { moveStep(m, dt, s); return true; }
  t.phase = 'do';
  if (!p.task && !p.order) { const b = bestFac(s, p, 'train'); if (b) { reserve(s, p, b.key); p.task = { act: 'train', fac: b.f.id, node: b.f.node, phase: 'go', teach: m.id, resv: [b.key], spot: b.spot, spotKind: b.spotKind }; goto(p, b.f.node, b.xy); p.reason = `${m.name}要傳授武學`; } else p.reason = '傳功時練功站位都有人，暫在旁等候'; }
  const near = p.task?.teach === m.id && !p.path.length && dist(p.pos, m.pos) <= 60;
  if (!near) { p.teachArt = null; t.wait += dt; if (t.wait >= TEACH_JOIN.wait) { m.teachCool = 0; m.task = null; m.reason = `${p.name}沒來，今日傳授作罷`; } return true; }
  p.teachArt = m.teaching.art;
  m.teachCool = Math.max(0, m.teachCool - dt); m.reason = `傳授${p.name}`;
  if (m.teachCool <= 0) { m.task = null; p.teachArt = null; if (p.task?.teach === m.id) p.task.teach = null; }
  return true;
}

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
const MON_PATH = route('den', 'yard'), GUARD_PATH = route('guard', 'yard');
function spawnWave(s) {
  const h = s.hunt, i = h.wave, list = []; waveCommit(s, h);
  const nr = Math.min(s.eco.dog.n, 3 + i), nb = i === h.waves - 1 ? Math.min(1, s.eco.boar.n) : 0;
  const ns = nr + nb >= 5 ? 3 : nr + nb >= 2 ? 2 : 1, STREAMS = ['den', 'habitat', 'ridge']; /* #419 一波分 2–3 路，都從山那一側 */
  for (let k = 0; k < nr; k++) list.push({ k: 'dog', t: k * 1.5, src: STREAMS[k % ns] }); for (let k = 0; k < nb; k++) list.push({ k: 'boar', t: nr * 1.5 + 1, src: 'den' });
  s.eco.dog.n -= nr; s.eco.boar.n -= nb; h.queue = list; h.wt = 0; h.perWave.push({ dog: nr, boar: nb });
  removeWild(s, 'dog', nr); removeWild(s, 'boar', nb);
  log(s, list.length ? `第 ${i + 1} 波：野狗 ${nr}${nb ? '、野豬 ' + nb : ''}` : `第 ${i + 1} 波：山裡沒有獸出來`);
}
function ngBreak(d) { const add = Math.max(0, Math.min(NG.btBonus, 0.9 - breakChance(d))); return add > 0 && spendQi(d, NG.btCost) ? add : 0; }
function knockPos(from, pos, dist) {
  if (!from || !pos || !(dist > 0)) return;
  const dx = pos[0] - from[0], dy = pos[1] - from[1], L = Math.hypot(dx, dy) || 1;
  pos[0] += dx / L * dist; pos[1] += dy / L * dist;
}
function noteWhy(s, on, inn) {
  const h = s.hunt; if (!h) return;
  const bag = (h.why ??= []); if (bag.length > 24) return;
  if (on?.fired?.art) bag.push(on.fired.art);
  else if (on?.dry) bag.push('dry');
  if (inn?.line) bag.push('inner');
}
function landOn(s, d, tgt, mv, power, foeName) {
  const on = applyArtOn(s, 'hit', d, tgt, { power, move: mv.id, foeName, map: true });
  const inn = innerOnHit(s, d, tgt, { power: on.power ?? power, move: mv.id, fired: on.fired });
  if (on.knock) knockPos(d.pos, tgt.pos, on.knock);
  if (on.trip) { tgt.tripUntil = s.t + 2.5; tgt.cool = Math.max(tgt.cool || 0, on.trip); }
  if (on.disturb) { tgt.tripUntil = s.t + 2.5; tgt.cool = Math.max(tgt.cool || 0, on.disturb); }
  noteWhy(s, on, inn); /* #406 只記主因，不改這一擊的傷害 */
  return inn.power ?? on.power ?? power;
}
// ---- #418 N14 見招拆招：地圖上的出手（前搖預警、四種接法、架勢）----
const MON_REACH = 26, MON_CD = 1.2;
/* 前搖預警：地上紅色扇形，越滿越接近出手。只影響顯示。 */
function warnFx(s, atk, tgt, r, wind) { if (!(wind > 0)) return; s.fx.push({ kind: 'warn', from: [...atk.pos], to: [...tgt.pos], r: Math.max(18, Math.min(110, r)), dur: wind, ttl: wind, t0: s.t }); }
/* 接法浮字：破（看破）、閃、震（反震）、現（架勢空了挨重擊）。 */
const CLASH_WORD = { read: ['破', '#f2d06b'], dodge: ['閃', '#cfe0f5'], jolt: ['震', '#e9a33a'], heavy: ['現', '#ff5a3c'] };
function clashFx(s, who, key) { const w = CLASH_WORD[key]; if (!w || !who?.pos) return; s.fx.push({ kind: 'clash', word: w[0], color: w[1], pos: [...who.pos], ttl: 0.8 }); (s.clashN ??= {})[key] = (s.clashN[key] || 0) + 1; }
function orbitStep(m, foe, step) { const R = RING.outer, a = Math.atan2(m.pos[1] - foe.pos[1], m.pos[0] - foe.pos[0]) + step / R; moveToward(m,[foe.pos[0]+Math.cos(a)*R,foe.pos[1]+Math.sin(a)*R],step,1); }
function stepToward(m, p, step, stop) { const L = dist(m.pos, p); if (L <= stop) return; const k = Math.min(step, L - stop) / L; m.pos[0] += (p[0] - m.pos[0]) * k; m.pos[1] += (p[1] - m.pos[1]) * k; }
function monStrike(s, h, m, foe, M, zk, w) {
  handleTake(s, foe);
  const incoming0 = M.dmg * (m.psn > s.t ? 1 - SPEC.poisonWeak : 1) * (1 - SPEC.zhenMit * zk);
  const r = resolveSwing(s, m, foe, () => rand(s), { depth: depthOf(m), move: w.mv, wind: w.wind, force: w.force, opening: w.opening, map: true });
  if (r.kind === 'read') { m.hp -= r.counterDamage; if (m.hp <= 0) { m.gone = true; h.kills++; seeEnemy(s, m.k, 'kill', foe); } clashFx(s, foe, 'read'); return r; }
  if(r.kind==='dodge'&&r.counter){m.hp-=r.counterDamage;if(m.hp<=0){m.gone=true;h.kills++;seeEnemy(s,m.k,'kill',foe);}}
  if (r.kind === 'dodge') { const on = applyArtOn(s, 'dodge', foe, m, { foeName: M.name, map: true }); clashFx(s, foe, 'dodge'); noteWhy(s, on); if (perfectDodge(s, foe, () => rand(s), { strain: r.strain })) h.witch = (h.witch || 0) + 1; return r; } /* 進身閃吃力才會觸發林克時間 */
  if (r.kind === 'parry') { const on = applyArtOn(s, 'block', foe, m, { foeName: M.name, map: true }); if (r.jolt) clashFx(s, foe, 'jolt'); noteWhy(s, on); return r; }
  const incoming = incoming0 * (r.heavy ? CLASH.heavy : 1) * r.contact.damageFactor; if (r.heavy) clashFx(s, foe, 'heavy');
  const got = applyArtOn(s, 'gethit', foe, m, { dmg: incoming, foeName: M.name, map: true }); /* #404 挨打：太極劍借力、乾坤挪移 */
  if (got.reflect) m.hp -= transferredDamage(s,foe,m,incoming*got.reflect,r.contact.force*got.reflect);
  let taken = got.dmg ?? incoming;
  if (zjHas(foe, 'taiji') || zjHas(foe, 'taijiSword')) { /* #426 太極：來力卸一半，轉給身後的同伴或打回來者 */
    const back = s.mons.find((o) => o !== m && !o.gone && o.hp > 0 && dist(o.pos, m.pos) <= 40) || m, share = taijiReturn(m, null, w.wind); back.hp -= transferredDamage(s,foe,back,taken*share,r.contact.force*share); taken *= 1 - share;
    zjMark(s, foe, zjHas(foe, 'taiji') ? 'taiji' : 'taijiSword'); s.zjN.shift = (s.zjN.shift || 0) + 1; s.fx.push({ kind: 'dash', from: [...foe.pos], to: [...back.pos], ttl: 0.4, color: '#d8d8d8' });
    if (back !== m && back.hp <= 0) { back.gone = true; h.kills++; seeEnemy(s, back.k, 'kill', foe); }
  }
  if (zjHas(foe, 'jiuyang')) { postureHit(s, m, ZJ.jiuyang.shock); zjMark(s, foe, 'jiuyang'); } /* #426 九陽圓滿：挨打自動反震架勢 */
  if (m.hp <= 0) { m.gone = true; h.kills++; seeEnemy(s, m.k, 'kill', foe); return r; }
  partHit(s, foe, r, { attack: m, rnd: () => rand(s) });
  breakWindup(s, m, foe, w.mv, w.wind, r.contact);
  foe.hp -= shieldHit(foe, taken, s.t); /* loop116 護體真氣 */
  const innBack = innerOnGetHit(s, foe); /* #405 純陽無極功：挨打化進氣血 */
  noteWhy(s, got, innBack);
  s.fx.push({ kind: 'bite', pos: [...foe.pos], ttl: 0.4 });
  return r;
}
/* #420 招名浮字（每人每 FLAIR.nameGap 秒最多一次）與第一次實戰使出的大事記 */
function flairName(s, d, mv) {
  if (s.t - (d.nameT ?? -1e9) >= FLAIR.nameGap - 1e-9) { d.nameT = s.t; s.fx.push({ kind: 'mvname', who: d.id, name: mv.name, color: mv.color, pos: [...d.pos], ttl: FLAIR.nameTtl }); }
  const fm = (d.firstMoves ||= []); if (!fm.includes(mv.id)) { fm.push(mv.id); chronOf(s, d, 'move1', { chron: `${d.name}第一次在實戰中使出「${mv.name}」` }); }
}
/* #420 單波最多擊退：一波結束（換波或收隊）時結算，破紀錄記大事記 */
function waveCommit(s, h) { for (const [id, n] of Object.entries(h.wk || {})) { const d = byId(s, id); if (d && n > (d.waveBest || 0)) { d.waveBest = n; if (n >= 2) chronOf(s, d, 'waveBest', { chron: `${d.name}一波擊退 ${n} 隻，破了自己的紀錄` }); } } h.wk = {}; }
/* #420 大成滑步：目標在原射程外、加長射程內，先滑過去（離守點 ≤ RING.leash） */
function dashTo(s, d, tgt, reach, post) {
  const L = dist(d.pos, tgt.pos); if (L <= reach) return true;
  const P = NODES[post] || d.pos, want = L - reach * 0.85; let nx = d.pos[0] + (tgt.pos[0] - d.pos[0]) * want / L, ny = d.pos[1] + (tgt.pos[1] - d.pos[1]) * want / L;
  const PL = Math.hypot(nx - P[0], ny - P[1]); if (PL > RING.leash) { nx = P[0] + (nx - P[0]) * RING.leash / PL; ny = P[1] + (ny - P[1]) * RING.leash / PL; }
  s.fx.push({ kind: 'dash', from: [...d.pos], to: [nx, ny], ttl: 0.35, color: '#cfe0f5' }); d.pos = [nx, ny];
  return dist(d.pos, tgt.pos) <= reach * 1.25;
}
function dStrike(s, h, d, live, w) {
  const mv = MOVES.find((x) => x.id === w.mv), tgt = live.find((m) => m.uid === w.tgt);
  if (!mv || !tgt || dist(tgt.pos, d.pos) > w.reach * 1.25) { d.anim = null; return null; } /* 目標走遠或已倒：招落空 */
  const lv = d.skills[mv.skill];
  let power = mv.dmg * (1 + lv / 50) * moveMul(d, mv.id, s.t); // R5 #523：同伴只改出手時機，不改傷害。
  const ar = mv.aoe ? mv.aoe + qiAoeAdd(d, mv) : 0, hitList = mv.aoe ? live.filter(m=>dist(m.pos,mv.aoeCenter==='actor'?d.pos:tgt.pos)<=ar) : [tgt];
  const r = resolveSwing(s, d, tgt, () => rand(s), { depth: depthOf(d, mv.id), wind: w.wind, move: mv.id, force: w.force, map: true, targetApproachingAtWindup:w.targetApproachingAtWindup, dodgeAtWindup:w.dodgeAtWindup });
  if(r.counter){d.hp=Math.max(0,d.hp-r.counterDamage);clashFx(s,tgt,'read');}
  flairName(s, d, mv);
  h.hits[d.id] = (h.hits[d.id] || 0) + 1; grow(s, d, mv.skill, 1.5, 'fight');
  d.anim = 'strike'; d.needs.energy = clamp(d.needs.energy - 1, 0, 100);
  { const tier = visTier(d, mv.id), a = artOfMove(mv.id), va = a && variantOf(d, a.id, s.t); s.fx.push({ kind: 'move', mfx: mv.fx, zx: (d.zixia || 0) >= 5, name: mv.name, color: mv.color, from: [...d.pos], to: [...tgt.pos], r: mv.aoe || 16, ttl: tier >= 3 ? 1.0 : 0.6, tier, vcolor: va?.color || null, sprite: d.sprite, face: d.face }); if (tier >= 3) s.fx.push({ kind: 'shake', ttl: 0.35 }); }
  const each = mv.aoe ? new Map(hitList.map((m) => [m.uid, m === tgt ? r : resolveSwing(s, d, m, () => rand(s), { depth: depthOf(d, mv.id), wind: w.wind, move: mv.id, map: true })])) : null;
  if (each) h.aoeEach = (h.aoeEach || 0) + hitList.length;
  const lt = each ? hitList.find((m) => each.get(m.uid).kind === 'hit') : r.kind === 'hit' ? tgt : null;
  if (!lt) { if (r.kind === 'dodge') clashFx(s, tgt, 'dodge'); return r; }
  noteFret(s, d, 'strike'); if (d.raging) spendQi(d, Math.min(qiOf(d), CLASH.fret.attackQi * CLASH.fret.qi));
  if (r.heavy && lt === tgt) clashFx(s, tgt, 'heavy');
  const base = landOn(s, d, lt, mv, power, MONSTERS[lt.k].name); power = base * (r.heavy ? CLASH.heavy : 1); /* #404 打中：降龍、辟邪、七傷、打狗、獨孤。範圍先圈定，再震退 */
  const psn = specM(d, 'dushu') > 0; for (const m of hitList) { let pw = power; if (each) { const rr = each.get(m.uid); if (rr.kind !== 'hit') { if (rr.kind === 'dodge') clashFx(s, m, 'dodge'); continue; } pw = base * (rr.heavy ? CLASH.heavy : 1); if (rr.heavy && m !== tgt) clashFx(s, m, 'heavy'); } const contact=each?each.get(m.uid).contact:r.contact;pw*=contact.damageFactor;breakWindup(s, d, m, mv.id, w.wind, contact); m.hp -= pw; if (psn) m.psn = s.t + SPEC.poisonT; if (m.hp <= 0 && !m.gone) { m.gone = true; h.kills++; if (artOfMove(mv.id)?.id === 'kuihua' && zjHas(d, 'kuihua')) s.fx.push({ kind: 'fall', pos: [...m.pos], k: m.k, delay: ZJ.kuihua.fall, ttl: ZJ.kuihua.fall + 0.6 }); /* #426 葵花：中針的一起晚一拍倒下 */ (h.wk ??= {})[d.id] = (h.wk[d.id] || 0) + 1; seeEnemy(s, m.k, 'kill', d); applyArtOn(s, 'kill', d, m, { move: mv.id, foeName: MONSTERS[m.k].name }); log(s, `${d.name}以「${mv.name}」擊退${MONSTERS[m.k].name}`); if (m.k === 'boar') resAdd(s, 'food', 3, 'hunt'); } }
  return r;
}
function huntStep(s, dt) {
  const h = s.hunt; if (!h) return;
  const team = s.ds.filter((d) => h.team.includes(d.id));
  if (!h.started) { if (!team.every((d) => d.at === h.post || d.hp <= 25)) return; h.started = true; spawnWave(s); }
  h.t += dt; h.wt += dt; const zk = zhenK(s); /* loop151 陣法：減傷、減速 */
  while (h.queue.length && h.queue[0].t <= h.wt) { const q = h.queue.shift(), M = MONSTERS[q.k]; const S0 = SOURCES[q.src] || SOURCES.den; s.mons.push(restoreSurvivor(s,q.k,{ uid: `${q.k}${s.rngN++}`, k: q.k, hp: M.hp, max: M.hp, pos: [...S0.pos], src: q.src || 'den', path: S0.via.length ? [...S0.via.map((p) => [...p]), ...GUARD_PATH] : MON_PATH.slice(1), cool: 0 })); }
  for (const m of s.mons) {
    if (m.raid||m.gone||m.hp<=0) continue;
    const M = MONSTERS[m.k];
    fretStep(s,m);
    const foe = team.filter((d) => d.hp > 25).sort((a, b) => dist(a.pos, m.pos) - dist(b.pos, m.pos))[0];
    const wk = witchK(s, m.pos), mdt = dt * wk; /* #425 林克時間：圈內的獸前搖、冷卻、移動都慢下來（不改全域 dt） */
    m.cool -= mdt; if (m.swing && wk < 1) m.swing.at += dt - mdt;
    if (m.psn > s.t) { m.hp -= SPEC.poisonDps * (s.psnK24 || 1) * dt; if (m.hp <= 0) { m.gone = true; h.kills++; log(s, `${M.name}毒發倒地`); continue; } } /* loop151 毒術 */
    postureRegen(s,m,dt);if(m.downUntil>s.t)continue;
    m.intentTarget=foe?.id;
    if(!m.swing&&combatTacticStep(s,m,mdt,{exit:a=>{rememberEscape(s,a);a.gone=true;h.escaped++;s.eco[a.k].n++;}}))continue;
    if (m.swing) { const action = FOE_ACTIONS[m.k]?.moves.find((a) => a.id === m.swing.mv); if (action?.travel && foe) stepToward(m, foe.pos, action.range / action.wind * mdt, MON_REACH * .8); /* #418 N14 前搖中站定；前搖結束才判接法 */
      if (s.t + 1e-9 < m.swing.at) continue;
      const w = m.swing, tgt = team.find((d) => d.id === w.tgt); m.swing = null;
      if (!action?.feint&&tgt && tgt.hp > 25 && dist(tgt.pos, m.pos) < (w.reach || MON_REACH) * 1.3) monStrike(s, h, m, tgt, M, zk, w);
      if (m.gone) continue;
    }
    const near = foe ? dist(foe.pos, m.pos) : 1e9, actionRange = foeAction(m, near)?.range || MON_REACH;
    if (foe && near < (m.orbit === foe.id ? RING.outer + 10 : m.slot === foe.id ? Math.max(RING.engage, actionRange) : actionRange)) { /* #419 交戰圈：4 個近戰位，第 5 隻起在外圈繞 */
      if (m.slot !== foe.id||s.mons.filter(o=>!o.gone&&o.slot===foe.id).indexOf(m)>=ringCapacity(foe,s)) { const held = s.mons.filter((o) => o !== m && !o.gone && o.slot === foe.id).length;
        if (held >= ringCapacity(foe,s)) { m.orbit = foe.id; m.slot = null; orbitStep(m, foe, M.speed * mdt); continue; }
        m.slot = foe.id; m.orbit = null; }
      if (near > MON_REACH * 0.95 && !foeAction(m, near)?.minDistance) { stepToward(m, foe.pos, M.speed * mdt, MON_REACH * 0.8); continue; }
      if(m.cool<=0&&!(m.downUntil>s.t)){ /* #426 獨孤：觀破過的獸一起手就被截；太極圈內前搖拉長 */
        const source=SOURCES[m.src||FOE_ACTIONS[m.k]?.escapeSource||'den']||SOURCES.den;
        const limit=attackTokenLimit(source.organization??SOURCES.den.organization,ringCapacity(foe,s));
        if(s.mons.filter(o=>o!==m&&!o.gone&&o.swing?.tgt===foe.id).length>=limit)continue;
        if (zjIntercept(s, m, team)) { m.cool = MON_CD; continue; }
        const pick=chooseCombatMove(s,m,foe,()=>rand(s),{distance:near}),action=pick?.move||foeAction(m,near),wind=(windOf(m,action?.id,MON_CD)+(pick?.seconds||0))*zjWindK(s,m.pos,team);
        const start = interceptOpening(s, m, foe, () => rand(s), { depth: depthOf(m), move: action?.id, wind, map: true });
        m.cool = MON_CD+(pick?.seconds||0);m.energy=(m.energy??100)-1;
        if (start.read?.kind === 'read') { m.hp -= start.read.counterDamage; clashFx(s, foe, 'read'); if (m.hp <= 0) { m.gone = true; h.kills++; seeEnemy(s, m.k, 'kill', foe); } continue; }
        m.opened=true;m.swing = { mv: action?.id, reach: action?.range || MON_REACH, tgt: foe.id, at: s.t + wind, wind, opening: start.opening }; warnFx(s, m, foe, MON_REACH, wind); }
      continue;
    }
    m.slot = null; m.orbit = null;
    if(foe&&pursueFleeing(m,foe,mdt,M.speed))continue;
    if (monWalk(m, M.speed * (m.tripUntil > s.t ? 0.45 : 1) * (1 - SPEC.zhenSlow * zk) * mdt)) { m.gone = true; h.escaped++; rememberEscape(s,m);s.eco[m.k].n++; log(s, `${M.name}衝過守點逃回山裡`); }
  }
  for (const d of team) {
    zjRegen(d, dt); /* #426 九陽 */
    if (d.hp <= 25 || d.faintUntil>s.t) { if (d.task?.act === 'hunt') { d.order = null; cancelTask(s, d, '傷重退回院中'); assign(s, d, 'rest', '傷重歇息'); log(s, `${d.name}受傷退下`); think(s, d, 'hurt'); } const bag = (h.why ??= []), tag = qiOf(d) <= 0 ? 'dry' : 'hurt'; if (bag.length < 24 && !bag.includes(tag)) bag.push(tag); continue; }
    postureRegen(s, d, dt);
    if (d.task?.act!=='hunt'||d.at !== h.post || d.path.length) continue;
    d.cool -= dt;
    const live = s.mons.filter((m) => !m.gone && m.hp > 0 && !m.raid);
    if (d.swing) { if (s.t + 1e-9 >= d.swing.at) { const w = d.swing; d.swing = null; dStrike(s, h, d, live, w); } continue; } /* #418 前搖 → 出手；收招＝冷卻剩下的時間 */
    // 山路上有散石：看見尚在來路上的敵人時，空手者彎身撿一顆。
    // 一人一次巡山只拿得住一顆，動作花 N32 的真 .2 秒；不是免費發射物。
    const stoneMove=BODY_MOVES.find(m=>m.id==='toolStone');
    if(!d.tools?.stone&&!(h.stonePicked||[]).includes(d.id)&&d.cool<=0&&(d.busyUntil||0)<=s.t&&
       live.some(m=>m.path?.length&&!m.swing&&dist(m.pos,d.pos)<=stoneMove.range&&dist(m.pos,d.pos)>RING.outer)&&
       !live.some(m=>dist(m.pos,d.pos)<=RING.outer)){
      (h.stonePicked??=[]).push(d.id);(d.tools??={}).stone=true;
      if(!d.moves.includes(stoneMove.id))d.moves.push(stoneMove.id);
      d.busyUntil=s.t+BODY_TIMING.simple;d.reason='山路上撿起一顆石頭迎敵';continue;
    }
    if(combatTacticStep(s,d,dt,{speed:speedOf(d),help:(a,id)=>{const helper=byId(s,id);if(helper&&!h.team.includes(id)){h.team.push(id);helper.order='hunt';cancelTask(s,helper,`${a.name}喊來幫手`);assign(s,helper,'hunt','同門喊援，沿山路趕去');}},exit:a=>{a.order=null;cancelTask(s,a,'不敵先退');assign(s,a,'rest','退到山門後歇息');}}))continue;
    if(d.cool>0||(d.busyUntil||0)>s.t||(d.downUntil||0)>s.t) continue;
    const aim=live.sort((a,b)=>dist(a.pos,d.pos)-dist(b.pos,d.pos))[0];if(!aim)continue;
    const candidates=d.moves.map(id=>MOVES.find(m=>m.id===id)).filter(m=>m&&moveAvailable(d,m)&&dist(aim.pos,d.pos)<=m.range*(1+(d.skills[m.skill]||0)/200)+(m.range>=FLAIR.dash.minRange&&visTier(d,m.id)>=FLAIR.dash.tier?FLAIR.dash.add:0));
    const pick=chooseCombatMove(s,d,aim,()=>rand(s),{moves:candidates});const ms=pick?[pick.move]:[];
    for (const mv of ms) {
      const lv = d.skills[mv.skill]; const reach = mv.range * (1 + lv / 200), canDash = mv.range >= FLAIR.dash.minRange && visTier(d, mv.id) >= FLAIR.dash.tier;
      const tgt = live.filter((m) => dist(m.pos, d.pos) <= reach + (canDash ? FLAIR.dash.add : 0)).sort((a, b) => a.hp - b.hp)[0]; if (!tgt) continue;
      if (canDash && !dashTo(s, d, tgt, reach, h.post)) continue; /* #420 大成：滑步上前 */
      const cd = mv.cd * cdMul(d, mv.id, s.t), kh = artOfMove(mv.id)?.id === 'kuihua' && zjHas(d, 'kuihua'); /* #426 葵花：沒有前搖 */
      let wind = (kh ? 0 : windOf(d,mv.id,cd,s.t))+(pick?.seconds||0);
      if (!kh) wind = pairedSwordArrival(s, d, mv.id, tgt, team, s.t + wind) - s.t;
      if (kh) zjMark(s, d, 'kuihua');
      if (mv.consumable) delete d.tools?.[mv.tool];
      d.swing = { mv: mv.id, tgt: tgt.uid, at: s.t + wind, wind, reach, targetApproachingAtWindup:!!tgt.path?.length&&!tgt.swing&&!tgt.bswing, dodgeAtWindup:d.lastDodge?.target===tgt.uid&&d.lastDodge.until>=s.t?{...d.lastDodge}:null }; d.cool = cd+(pick?.seconds||0); d.face = tgt.pos[0] >= d.pos[0] ? 1 : -1; d.anim = 'wind';
      warnFx(s, d, tgt, reach, wind);
      break;
    }
  }
  // 全員已因傷退回院中時，守點已無人可接下一拍；在途野獸留作倖存者。
  const anyFit = team.some((d) => d.hp > 25 && d.task?.act === 'hunt');
  if(!anyFit){for(const m of s.mons.filter(m=>!m.raid&&!m.gone)){rememberEscape(s,m);m.gone=true;h.escaped++;s.eco[m.k].n++;}for(const q of h.queue){h.escaped++;s.eco[q.k].n++;}h.queue=[];}
  s.mons = s.mons.filter((m) => !m.gone);
  const waveClear = !h.queue.length && !s.mons.some((m) => !m.raid);
  if (waveClear) { h.gap += dt; if (h.gap >= WAVE_GAP && h.wave + 1 < h.waves && anyFit && (s.eco.dog.n + s.eco.boar.n) > 0) { h.wave++; h.gap = 0; spawnWave(s); } }
  if ((waveClear && (h.wave + 1 >= h.waves || !anyFit || s.eco.dog.n + s.eco.boar.n === 0) && h.gap >= 1) || (!anyFit && waveClear)) {
    const rep = `狩獵戰報（${POSTS[h.post]}，${h.wave + 1} 波）：擊退 ${h.kills}、溜走 ${h.escaped}；` + team.map((d) => `${d.name}出手 ${h.hits[d.id] || 0} 次`).join('，') + `｜山中尚餘 狗${s.eco.dog.n} 豬${s.eco.boar.n}。${boutWhy(h.why)}`;
    waveCommit(s, h); log(s, rep); s.lastReport = rep; if (h.kills > h.escaped) for (const d of team) if (d.hp > 25) think(s, d, 'wonHunt'); s.rep = (s.rep || 0) + h.kills;
    for (const d of team) { if (d.order === 'hunt') d.order = null; if (d.task?.act === 'hunt') { d.task = null; d.anim = null; } d.reason = '狩獵結束回院'; }
    s.hunt = null;
  }
}
function monWalk(m, step) {
  while (step > 0 && m.path.length) { const tgt = typeof m.path[0] === 'string' ? NODES[m.path[0]] : m.path[0], L = dist(m.pos, tgt);
    if (L <= step) { m.pos = [...tgt]; m.path.shift(); step -= L; } else { m.pos[0] += (tgt[0] - m.pos[0]) * step / L; m.pos[1] += (tgt[1] - m.pos[1]) * step / L; step = 0; } }
  return !m.path.length;
}
// 生態：繁衍、棲地遊蕩、野豬下山拱菜（有目的、會離開）
/* loop56「同修作伴」（s.cotrain）：練功、打坐或閒著（沒事做）時，80px 內有別人（不論在做什麼），寂寞增加速度減半（不加念頭、不加關係） */
const CO_ACTS = ['train', 'meditate', undefined];
export function cotrainNear(s, d) { if (!CO_ACTS.includes(d.task?.act) || !d.pos) return false; return s.ds.some((o) => o !== d && !o.away && o.pos && Math.hypot(o.pos[0] - d.pos[0], o.pos[1] - d.pos[1]) < 80); }
/* loop47「誰種誰心疼」（s.cropcare）：菜被拱時，只有農事最好的兩人（實際照顧菜園）全額心疼，其餘在山上的人只是「聽說」（−2），巡山在外的人不知道。關閉時維持全派 −5。 */
export function cropMood(s) {

  const here = s.ds.filter((d) => !d.away), top = new Set([...here].sort((a, b) => (b.skills?.farming || 0) - (a.skills?.farming || 0)).slice(0, 2).map((d) => d.id));
  for (const d of here) think(s, d, top.has(d.id) ? 'cropLost' : 'cropLostLite');
}
function removeWild(s, k, n) { for (let i = 0; i < n; i++) { const j = s.wild.findIndex((w) => w.k === k); if (j >= 0) s.wild.splice(j, 1); } }
const WATCH_WARN = 120; // 秒：有人在哨崗守過，這段時間內下山的野豬會被嚇回
/* loop67「哨崗久守」（s.longwatch）：示警窗加倍為 240 秒（守哨一趟管得比較久）；不改守哨次數與亂數 */
function ecoStep(s, dt) {
  for (const [k, E] of Object.entries(ECO)) { const e = s.eco[k] ??= { n: E.start, timer: 0 }; if (e.n < E.max) { e.timer += dt; if (e.timer >= E.regen) { e.n++; e.timer = 0; } } }
  const R = HABITAT.r;
  for (const k of Object.keys(ECO)) { let have = s.wild.filter((w) => w.k === k).length; while (have < s.eco[k].n) { s.wild.push({ k, pos: [...SOURCES.habitat.pos], tgt: null }); have++; } if (have > s.eco[k].n) removeWild(s, k, have - s.eco[k].n); }
  for (const w of s.wild) { if (!w.tgt || dist(w.pos, w.tgt) < 4) w.tgt = [HABITAT.c[0] + (rand(s) - 0.5) * 2 * R, HABITAT.c[1] + (rand(s) - 0.5) * R]; const L = dist(w.pos, w.tgt), st = MONSTERS[w.k].speed * 0.3 * dt; w.pos[0] += (w.tgt[0] - w.pos[0]) * Math.min(1, st / L); w.pos[1] += (w.tgt[1] - w.pos[1]) * Math.min(1, st / L); w.face = w.tgt[0] >= w.pos[0] ? 1 : -1; }
  s.raidT += dt;
  if (!s.hunt && s.raidT >= RAID_EVERY * raidMul(s) && s.eco.boar.n > 0 && !s.mons.some((m) => m.raid) && s.watch != null && s.t - s.watch < WATCH_WARN * (2)) { s.raidT = 0; s.watched = (s.watched || 0) + 1; log(s, '護山哨示警：野豬剛下山就被鑼聲嚇回去了。'); } // v1.6 哨崗預警
  if (!s.hunt && s.raidT >= RAID_EVERY * raidMul(s) && s.eco.boar.n > 0 && !s.mons.some((m) => m.raid)) {
    s.raidT = 0; s.eco.boar.n--; removeWild(s, 'boar', 1);
    s.mons.push(restoreSurvivor(s,'boar',{ uid: `raid${s.rngN++}`, k: 'boar', hp: MONSTERS.boar.hp, max: MONSTERS.boar.hp, pos: [...SOURCES.den.pos], src: 'den', path: route('den', 'veg').slice(1), raid: 'go', cool: 0 }));
    log(s, '一頭野豬循山路下來，朝菜園去了。'); stewBoar(s);
  }
  for (const m of s.mons) if (m.raid) {
    if(m.raid==='go'&&combatTacticStep(s,m,dt,{exit:a=>{rememberEscape(s,a);a.gone=true;s.eco[a.k].n=Math.min(ECO[a.k].max,s.eco[a.k].n+1);}}))continue;
    if (monWalk(m, MONSTERS[m.k].speed * dt)) {
      if (m.raid === 'go' && fenceUp(s) && boarRam(s)) { m.raid = 'back'; m.path = route('veg', 'den').slice(1); }
      else if (m.raid === 'go') { const p = s.plots.find((x) => x.st === 'ripe') || s.plots.find((x) => x.st === 'grow'); if (p) { p.st = 'empty'; p.g = 0; log(s, '野豬拱壞了一畦菜，吃飽回山。'); cropMood(s); } else log(s, '野豬在菜園沒找到吃的，回山了。'); m.raid = 'back'; m.path = route('veg', 'den').slice(1); }
      else { rememberEscape(s,m);m.gone = true; s.eco.boar.n = Math.min(ECO.boar.max, s.eco.boar.n + 1); }
    }
  }
  s.mons = s.mons.filter((m) => !m.gone);
}

// ---- v0.8 雇工：有名有姓、有性格、有隱藏根骨 ----
// loop155 v2.3 清修山莊：弟子 ≤3 且幫工 ≥2；練功／打坐／讀書快 20%
export const isEliteHermit = (s) => !!(disciples(s).length <= LABOR23.hermitMaxD && laborers(s).length >= LABOR23.hermitMinL);
export const laborSpeed = (s, d, act) => (isLabor(d) && d.lspec === act ? LABOR23.specSpeed : 1) * (!isLabor(d) && LABOR23.hermitActs.includes(act) && isEliteHermit(s) ? LABOR23.hermitBuff : 1);
export function laborCap(s) { return FACILITIES.reduce((a, f) => a + (facStage(s, f.id).laborBeds || 0), 0); }
export function canHire(s) {
  const next = ([...LABOR_POOL, ...LABOR_POOL23]).find((p) => !s.ds.some((d) => d.id === p.id) && !s.laborGone.includes(p.id));
  if (!next) return { ok: false, why: '村裡暫時沒人想上山做工' };
  if (laborers(s).length >= laborCap(s)) return { ok: false, why: laborCap(s) ? `工寮已滿（${laborers(s).length}/${laborCap(s)}）` : '先蓋工寮讓雇工有地方睡' };
  if (s.res.coin < ECON.hireCoin) return { ok: false, why: `香火錢不足（${s.res.coin}/${ECON.hireCoin}）` };
  if (s.res.food < ECON.hireFood) return { ok: false, why: `存糧不足 ${ECON.hireFood}` };
  return { ok: true, next };
}
export function hire(s) {
  const c = canHire(s); if (!c.ok) return c;
  s.res.coin -= ECON.hireCoin; resAdd(s, 'food', -ECON.hireFood, 'hire'); book(s, 'out', 'coin', ECON.hireCoin);
  const d = mkDisciple(c.next, 1, 'gate', c.next.personality, c.next.personality.slice(0, 1));
  Object.assign(d, { role: 'laborer', root: c.next.root, rootKnown: false, cowork: 0, unpaid: 0, reason: '應雇上山' }); if (LABOR23.spec[d.id]) d.lspec = LABOR23.spec[d.id]; /* loop155 幫工專長 */
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
  if (disciples(s).length >= policyCap(s)) return { ok: false, why: '收徒方針的人口上限已滿' };
  if (d.hidden?.shown) { if (disciples(s).length >= capacity(s)) return { ok: false, why: `弟子床位已滿（${disciples(s).length}/${capacity(s)}）` }; return { ok: true, d }; } /* loop155 隱世高人身分已明：不必再看根骨與好感 */
  if (!d.rootKnown) return { ok: false, why: `還看不出根骨（共事 ${Math.floor(d.cowork || 0)}/${ROOT.revealAt}）` };
  if (d.root < ROOT.inviteMin) return { ok: false, why: `根骨${ROOT.names[d.root]}，不宜習武` };
  if (avgAff(s, d) < ROOT.inviteAff) return { ok: false, why: `同門對他還不熟（好感 ${avgAff(s, d).toFixed(0)}/${ROOT.inviteAff}）` };
  if (disciples(s).length >= capacity(s)) return { ok: false, why: `弟子床位已滿（${disciples(s).length}/${capacity(s)}）` };
  return { ok: true, d };
}
export function invite(s, id) {
  const c = canInvite(s, id); if (!c.ok) return c; const d = c.d;
  cancelTask(s, d, '拜入外門'); d.role = 'outer'; delete d.unpaid; d.duties = [...CHORE_ACTS]; d.prio = 'normal'; d.chore = 0; d.choreDebt = 0; d.contrib = 0; think(s, d, 'invited'); s.rep = (s.rep || 0) + 1;
  log(s, `${d.name}放下扁擔，拜入外門（根骨${ROOT.names[d.root]}）。`); recordDeed(s, d, 'join', { chron: `雇工${d.name}拜入外門` }); return { ok: true, d };
}
function dismissLabor(s, d, why) {
  removeActor(s, d, why, { quiet: true }); BYID.delete(s); s.laborGone.push(d.id);
  log(s, `${d.name}${why}，下山去了。`);
}
// R9：唯一隱居開局的香火由底數、現有門派事件與聲望段構成。
export function incenseOf(s) {
  const rep = Math.floor((s.rep || 0) / ECON.coinPerRep);
  return ECON.coinBase + econCoin(s) + rep;
}
export function payday(s) {
  guidanceDaily(s);
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
// loop145 R3：換日時依序執行的每日結算（順序即亂數消耗順序，不可任意調換）
/* loop181 v2.8：內傷 ≥50 每日扣氣血 8、心情 4；主修外功已不逆催（改修同屬／調和內功）則每日自癒 6 */
/* loop187 v2.9：小門派旗標（清冷清修）＋守正先練根基按特質計數（每人一次） */
export function temperDaily29(s) { const W = (s.v29n ??= {}), B = (W.baseByTrait ??= { honest: 0, diligent: 0, stubborn: 0, rigid: 0, sect: 0 }); const small = s.ds.length <= TEMPER29.small;
  for (const d of s.ds) { d.small29 = small; if (d.base28 && !d.base29c) { d.base29c = true; const t = ['rigid', 'stubborn', 'honest', 'diligent'].find((x) => (d.personality || []).includes(x)) || 'sect'; B[t]++; } /* loop193 拘謹優先，不讓勤奮／憨厚蓋過 */
    if (d.xiao29 && !d.xiao29c) { d.xiao29c = true; W.xiao = (W.xiao || 0) + 1; } if (d.ling29 && !d.ling29c) { d.ling29c = true; W.ling = (W.ling || 0) + 1; } if (temperOf(d).qing && !d.qing29c) { d.qing29c = true; W.qing = (W.qing || 0) + 1; } } }
function injuryDaily(s) { for (const d of [...s.ds,...s.mons,...(s.band?.members||[])]) if (d.part||d.wounds?.length) partHeal(s,d,'day'); /* 新層1–4遊戲日；舊部位傷仍可遷移 */ for (const d of s.ds) { if (!d.qiInjury) continue; if (d.qiInjury >= DRIVE28.injHeavy) { d.hp = clamp(d.hp - DRIVE28.hp, 1, 100); d.mood = clamp((d.mood ?? 50) - DRIVE28.mood, 0, 100); } const a = mainOuterArt(d); if (!a || innerDrive28(d, a).tier !== 4) qiInjuryCure28(s, d, DRIVE28.rest); } }
export function dailyPipeline(s) {
  spreadRumors(s); // R8：見聞跟著目擊者走到聚落，並按 N46 記憶時限淡去。
  if (bodyConditionOn(s)) for (const d of s.ds) ensureBodyCondition(d, s.day); // 出自 Phase 5 規格：睡眠換日恢復並歸零每日週期。
  {
    const hero = s.ds.find((d) => d.id === 'hero');
    if (hero && !hero.away && s.ds.some((d) => d !== hero && !d.away)) s.hermitage.livedDays = (s.hermitage.livedDays || 0) + 1;
    // R3：不再由天數、身體數值或上崖事件自動送出整門武學或立匾卡。
  }
  fadeSocialThoughts(s);
  for (const x of returnFromWork(s)) log(s, `${x.id}下山做工攢足束脩，回到山門口等掌門決定。`);
  payday(s); donateRepairs(s); econDaily(s, EH); apprDaily(s); teachDaily(s); threatDaily(s); // 24g：先開本日帳本再記具名捐修。
  cliqueDaily(s);
  lairDaily(s, EH);
  jhevDaily(s);
  temperDaily29(s); injuryDaily(s); siegeDaily27(s); crusadeDaily27(s, EH); /* loop181 經脈內傷每日 */ /* loop179 傾巢討伐（執事自動）；loop178 v2.7 魔教圍山（雜湊擲骰，不吃亂數流） */
  if (s.steward) stewardDaily(s, { siteOf, capacity, startBuild, admissionStatus, canRecruit, canBuildFac, buildFac, ...({ hire, canHire, laborCap, laborers, stewHireCoin: LABOR23.stewHireCoin }) });
}
export { recordDeed, DEED_CAP, CHRON_CAP, tallyAct, bioLine, bioLean } from './util.mjs';
export function tick(s, dt = 0.25) {
  s.t += dt; BYID.set(s, new Map(s.ds.map((d) => [d.id, d])));
  for (const d of s.ds) if (!d.pf) d.pf = 1; /* loop91 新入門者也吃熟練度十重 */
  for (const d of s.ds) { d.sectId = s.sect?.id || null; if (d.ng && hasSpec(d, 'jiuyang') && !d.path?.length) { addQi(d, 0.25 * dt); jiuyangEase(d, dt); } /* #405 大成起，不動時內傷緩緩褪 */ } if (s.jh?.poison && bestSpec(s, 'yishu') > 0) { s.jh.poison = null; log(s, '醫者出手，化骨綿掌的餘毒被解了。'); } /* loop151 */
  for (const d of s.ds) { if (!d.ng) { d.ng = 1; d.qi ??= 0; } if (!d.ng2) { d.ng2 = 1; d.qi = Math.min(d.qi ?? 0, qiMax(d)); } } /* loop142 一版舊檔改護體真氣 */ /* loop103 */
  for (const d of s.ds) d.lg = 1; /* loop127 新入門者 */
  for (const d of s.ds) { if (!d.gInit) growEnsure(d); d.gdr = 1; } /* loop84 新入門者立即折算，介面不必寫狀態 */
  { const day = Math.floor(s.t / DAY) + 1; if (day !== s.day) { s.day = day; dailyPipeline(s); } }
  schoolStep(s, EH); rareBookSearchStep(s); threatStep(s, EH); bandStep(s, dt, EH); if (s.lair) lairStep(s, EH, dt); if (s.v27n?.cru) crusadeStep27(s, EH);
  const se = seasonOf(s); for (const p of s.plots) if (p.st === 'grow' && (p.g += dt / se.grow) >= PLOT_GROW) p.st = 'ripe';
  const seIdx = se.i; if (s.seasonI !== seIdx) { if (s.seasonI !== undefined) log(s, `入${se.name}了。${{ spring: '萬物萌發，菜長得快。', summer: '天長日暖。', autumn: '秋高氣爽，心情開闊。', winter: '天寒地凍，菜長得慢，飯量變大。' }[se.id]}`); s.seasonI = seIdx; }
  arrangeGuidance(s);
  for (const d of s.ds) {
    clockActor(s,d,dt);
    if (d.away) { moodStep(s, d, dt); continue; } // 巡山中：背景模擬，不在地圖上
    if(!['hunt','trial'].includes(d.task?.act)&&!(d.task?.act==='defend'&&d.task.phase==='do'&&s.band))postureRegen(s,d,dt);
    d.needs.hunger = clamp(d.needs.hunger - HUNGER_PER_SECOND * se.hunger * dt, 0, 100);
    d.needs.fun = clamp((d.needs.fun ?? 60) - 0.22 * dt * (cotrainNear(s, d) ? 0.5 : 1), 0, 100); /* loop62「有伴解悶」（s.cofun）：與 cotrain 同條件，樂趣下降速度減半 */
    if (!d.path?.length) scenicRecovery(d, CLIFFS[d.at], dt);
    d.needs.social = clamp(d.needs.social - 0.4 * dt * (cotrainNear(s, d) ? 0.5 : 1), 0, 100);
    moodStep(s, d, dt); revealStep(s, d, dt); if (isLabor(d)) coworkStep(s, d, dt); else if (d.role === 'outer' && !d.rootKnown && Math.max(d.cowork || 0, d.together || 0) >= ROOT.revealAt) { d.rootKnown = true; log(s, `相處久了，看出外門${d.name}根骨「${ROOT.names[d.root]}」。`); }
    if (d.task?.act === 'teach' || (d.teachCool > 0 && !d.task && !d.order)) { if (teachStep(s, d, dt)) continue; } /* #417 N13 傳功＝師徒共同任務 */
    if (!d.task) decide(s, d);
    if (d.task) { if(!(d.downUntil>s.t))moveStep(d,dt,s); tallyAct(d, d.task.act, dt); doTask(s, d, dt); } // M1 傳記：看得見的行為時間
    if (d.anim === 'strike' && d.cool < 0.6) d.anim = null;
  }
  { const em = emergency(s); if (em !== !!s.emergency) { s.emergency = em; if (outers(s).length >= QUOTA.outerMin) log(s, em ? (readyMealCount(s) <= 0 ? '斷糧了！內門弟子暫時放下功課回來幫忙。' : '野豬下山！內門弟子暫時回來顧家。') : '危機解除，內門弟子回去練功。'); } }
  huntStep(s, dt);
  for (const d of s.ds) {
    if (d.raging && d.task?.act === 'defend' && !d.rageHeld) {
      const helper = s.ds.find((p) => p !== d && p.task?.act === 'defend' && !p.raging && !p.away && (p.hp ?? 0) > 0 && !p.swing && (p.busyUntil || 0) <= s.t && p.pos && d.pos && dist(p.pos, d.pos) <= RING.step * 2);
      if (helper) { recordSocialEvent(s, 'rageHeld', helper, d); d.raging = false; d.rageUntil = 0; d.fret = 0; d.rageHeld = true; log(s, `${helper.name}拉住惱羞硬攻的${d.name}`); }
    }
    if (fretStep(s, d)) think(s, d, 'rageSpent');
    if (!d.raging) d.rageHeld = false;
    if (!s.hunt && !s.band && d.fret) d.fret = 0;
  }
  ecoStep(s, dt);
  expStep(s, dt, H);
  popStep(s, dt); fogStep(s); // v1.55c 迷霧；v1.55a 各環族群（無亂數）
  paceStep(s); unlockStep(s); chapterStep(s); if (Math.floor(s.t) !== Math.floor(s.t - dt)) aspStep(s, think);
  xiaStep(s, H); hsStep(s, 0.25, H); jhStep(s, 0.25, H); sectStep(s); genStep(s, () => rand(s));
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
    P.trial = 'on'; cancelTask(s, h, '山路傳來狗吠'); h.order = null; h.task = { act: 'trial', phase: 'go', node: 'yard', timer: 0 }; goto(h, 'yard'); h.reason = '黃昏守院：沿山路走來的野狗';
    s.mons.push({ uid: 'firstDog', k: 'dog', trial: true, hp: MONSTERS.dog.hp, max: MONSTERS.dog.hp, pos: [...SOURCES.den.pos], src: 'den', path: MON_PATH.slice(1), cool: 0 }); log(s, '黃昏，一隻野狗從獸穴口沿山路走向木樁場。師父：「別轉身跑，站穩看看牠。」'); } } /* #419 從 den 下山，不再憑空出現在木樁場 */
  if (!P.done.includes('firstExp') && s.lastExp) milestone(s, 'firstExp');
  if (!P.done.includes('firstBuild') && Object.values(s.fac).some((f) => f.site || f.stage > 0)) milestone(s, 'firstBuild');
}
function finishTrial(s,d,m,mv){
  applyArtOn(s,'kill',d,m,{move:mv?.id,foeName:MONSTERS[m.k].name});s.mons=s.mons.filter(x=>x!==m);seeEnemy(s,m.k,'kill',d);resAdd(s,'food',2,'trial');
  const r=d.arts.basicFist;if(r&&r.xp<25)r.xp=25.5;const learned=gainArt(d,0,1,s.t);for(const id of learned.moves)log(s,`${d.name}把已學套路的「${MOVES.find(x=>x.id===id).name}」練成了`);
  log(s,`${d.name}站穩腳步，終於把來犯的野獸趕回山裡。`);think(s,d,'learned');s.pace.trial='done';milestone(s,'trial');d.task=null;d.anim=null;d.swing=null;
}
function trialStep(s,d,dt){
  const task=d.task,m=s.mons.find(x=>x.trial);if(!m){d.task=null;d.anim=null;return;}
  postureRegen(s,d,dt);postureRegen(s,m,dt);m.intentTarget=d.id;fretStep(s,m);
  // 兩人的真前搖各自前進；一人倒地不能順便凍住另一人的模擬。
  if(!(m.downUntil>s.t)){
    const moved=!m.swing&&combatTacticStep(s,m,dt,{exit:a=>{rememberEscape(s,a);a.gone=true;s.mons=s.mons.filter(x=>x!==a);s.pace.trial='done';milestone(s,'trial');d.task=null;d.swing=null;}});
    if(m.gone)return;
    if(!moved){
      const near=dist(m.pos,d.pos);
      if(near>MON_REACH){if(m.path?.length)monWalk(m,MONSTERS[m.k].speed*dt);else stepToward(m,d.pos,MONSTERS[m.k].speed*dt,MON_REACH*.8);}
      m.cool=(m.cool||0)-dt;
      if(m.swing&&s.t+1e-9>=m.swing.at){const w=m.swing;m.swing=null;if(dist(m.pos,d.pos)<=w.reach*1.3){const r=resolveSwing(s,m,d,()=>rand(s),{move:w.mv,wind:w.wind,opening:w.opening});if(r.counter)m.hp-=r.counterDamage;if(r.kind==='hit')d.hp=Math.max(30,d.hp-3*(r.heavy?CLASH.heavy:1)*r.contact.damageFactor);else clashFx(s,d,r.kind==='parry'?(r.jolt?'jolt':null):r.kind);}}
      else if(!m.swing&&m.cool<=0&&dist(m.pos,d.pos)<=MON_REACH){const action=foeAction(m,dist(m.pos,d.pos)),wind=windOf(m,action.id,MON_CD);const start=interceptOpening(s,m,d,()=>rand(s),{move:action.id,wind});m.cool=MON_CD;m.energy=(m.energy??100)-1;if(start.read)m.hp-=start.read.counterDamage;else{m.swing={mv:action.id,tgt:d.id,at:s.t+wind,wind,reach:action.range,opening:start.opening};warnFx(s,m,d,action.range,wind);}}
    }
  }
  if(m.hp<=0){finishTrial(s,d,m,null);return;}
  if(d.downUntil>s.t||d.path.length)return;
  if(!d.swing&&combatTacticStep(s,d,dt,{speed:speedOf(d),exit:a=>{a.tactics={action:'brace'};}}))return;
  task.phase='do';task.timer+=dt;d.face=m.pos[0]>=d.pos[0]?1:-1;d.cool=(d.cool||0)-dt;
  if(d.swing){if(s.t+1e-9<d.swing.at)return;const w=d.swing;d.swing=null;const mv=MOVES.find(x=>x.id===w.mv);if(!mv||dist(m.pos,d.pos)>mv.range*1.3)return;
    const r=resolveSwing(s,d,m,()=>rand(s),{move:mv.id,wind:w.wind,opening:w.opening,targetApproachingAtWindup:w.targetApproachingAtWindup,dodgeAtWindup:w.dodgeAtWindup});d.anim='strike';
    if(r.counter)d.hp=Math.max(30,d.hp-r.counterDamage);
    if(r.kind==='hit'){m.hp-=landOn(s,d,m,mv,mv.dmg*(1+d.skills[mv.skill]/50)*moveMul(d,mv.id,s.t),MONSTERS[m.k].name)*(r.heavy?CLASH.heavy:1)*r.contact.damageFactor;breakWindup(s,d,m,mv.id,w.wind,r.contact);}
    else clashFx(s,m,r.kind==='parry'?(r.jolt?'jolt':null):r.kind);
    s.fx.push({kind:'move',mfx:mv.fx,name:mv.name,color:mv.color,from:[...d.pos],to:[...m.pos],r:16,ttl:.6,tier:visTier(d,mv.id),sprite:d.sprite,face:d.face});
    if(m.hp<=0)finishTrial(s,d,m,mv);return;
  }
  if(d.cool>0||(d.busyUntil||0)>s.t)return;
  const pick=chooseCombatMove(s,d,m,()=>rand(s)),mv=pick?.move;if(!mv||dist(m.pos,d.pos)>mv.range)return;
  const wind=windOf(d,mv.id,mv.cd,s.t)+pick.seconds,start=interceptOpening(s,d,m,()=>rand(s),{move:mv.id,wind});d.cool=mv.cd+pick.seconds;if(mv.consumable)delete d.tools?.[mv.tool];
  if(start.read){d.hp=Math.max(30,d.hp-start.read.counterDamage);return;}
  d.swing={mv:mv.id,tgt:m.uid,at:s.t+wind,wind,opening:start.opening,targetApproachingAtWindup:!!m.path?.length&&!m.swing&&!m.bswing,dodgeAtWindup:d.lastDodge?.target===m.uid&&d.lastDodge.until>=s.t?{...d.lastDodge}:null};d.anim='wind';warnFx(s,d,m,mv.range,wind);
}
// ---- 存檔（v0.95 移到 save.mjs，逐版遷移）----
export { save, load } from './save.mjs';
export { clone };

export { cancelTask, removeActor };

export const startSchoolTrip = (s) => startSchool(s, EH); // v1.85 A10 下山義學

export const resolveRaid = (s, i) => raidResolve(s, i, EH); // v1.9 I-6：玩家按鈕

/* loop179 玩家手動傾巢討伐 */
export const crusade27 = (s) => startCrusade27(s, EH, false);
