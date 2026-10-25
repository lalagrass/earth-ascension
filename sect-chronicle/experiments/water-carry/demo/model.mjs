// 生活開發版：兩人共用一個 60Hz 世界時間，各自做挑水或採藥、成長與接受改工作／停工指令。
// 沿既有展示數值，並非舊 RT 世界的規則／存檔。renderer、影子與 view() 不入帳。
// 一趟出發先向該工作的存放處預約一份容量並鎖腳力；完成交付才釋約、入帳、成長各一次。
// LP-04 精力：只在工作四段每遊戲秒扣 1；交付後（或院中閒置）≤30 走去座位，坐下每秒回 5，自主≥80 返院再重查工作。
// 玩家明確停工可坐到 100 仍不自己開工；往返座位與等待不扣不回。示意值見 docs/LP04_HANDOFF.md，非正式平衡。
// LP-05 偏好休閒：院中、原工作存放處實存已滿、精力>30、非停工／叫回時，各自走去喜好的地方（主角看山、熟手舒展筋骨）。
// 休閒不扣不回精力、不產出、不成長、不占預約；有空位（實存＋在途<容量）就回院重查。玩家可叫回（返院後完成一趟才解除）或恢復自主。
// LP-06 野豬：唯一一隻，有精力與威脅記憶；只在棲地恢復／淡忘。精力≥80、威脅≤20且水缸或藥架有實存才出來，嗅探後沿固定路靠近護欄，
// 每下準備 2 秒、接觸才扣精力加損痕；累了／害怕／院內已空就逃回棲地。沒有首訪／回訪計時、波次或 RNG。
// 玩家可派一人去防守點：野豬在護欄時喝止 1 秒→威脅＋80 逃走；已走就晚到返院。往返不扣不回精力、無收益、不占預約。示意值見 docs/LP06_HANDOFF.md。
// LP-07 自主護院：每人「允許」預設關；主動照看＝看見野豬（嗅探／靠近／到護欄）就有意願，受擾再處理＝本訪被撞過才有意願。
// 意願只是候補：不寫 guardOrder、不占這次來訪；人回到院中端點（交付完一趟、恢復到 80、休閒返院）且仍合法時，才沿原驅離路徑正式出發。
// 同 tick 多人準備好依 AUTO_ORDER 只取一位；每人每訪自主正式受理最多一次。玩家有效改令清意願並抑制該人本訪。示意見 docs/LP07_HANDOFF.md。
// LP-08 護欄整理：玩家選一人單次手動派遣；這段護欄同時只有一個未完成整理（待原趟／恢復／返院、前往、動手）。院中合法才沿防守路出發，
// 到點動手 480 工作 tick（僅這段每秒精力 −1，共 8），完整且安全才損痕 −1 一次；看得見的野豬（嗅探／靠近／撞／可見退走）使未完成效果失效。
// 無材料／XP／趟次／產物；不自動補派或接下一階。示意見 docs/LP08_HANDOFF.md。
// LP-09 自主整理：每人「允許自主整理」預設關（與護院分開）；順手照看＝損痕≥1、累積再整理＝損痕到 3 才有意願。
// 機會只由真護欄接觸開（接觸序號在野豬撞的結算點遞增，封頂後仍開新輪）；全隊每輪最多一次自主正式受理，候補不消耗。
// 候補不寫 fix／fixBy；院中端點合法才沿 LP08 同一路徑正式出發。人工 fix 結束當輪；有效改令清當人候補並抑制到下一次真碰撞。示意見 docs/LP09_HANDOFF.md。
// LP-11 手動掌法清鼠：玩家選一人明派，全場只一份清理（等待／前往／起手／收勢／返院都占額，真返院才釋放）。原趟交付完／必要恢復到 80、
// 院中才出發；沿 palm.mjs 固定節點與 ≤40 短段走，位置在權威 tick 取樣。掌距 ≤28、起手開始扣 2 精力；接觸 tick 重驗同一鼠才擊倒一次。
// 三鼠：兩普通嗅地、一警覺（任何人 ≤50 即察覺，或 100 內同伴實際受掌就以 120／秒沿西出口逃，出界失效不追）。無 HP／XP／收益／趟次。示意見 docs/LP11_HANDOFF.md。
// LP-12 自主清鼠：每人「允許自主清鼠」預設關；固定範圍內有有效鼠才有候補意願（不占名額、不鎖 ID、不扣精力）。
// 原趟交付完、必要恢復到 80、休閒真返院後，院中端點合法才受理；依自主護院→整理→清鼠→下一趟工作優先序，同 tick 依 AUTO_ORDER 只取一位。
// auto／manual 來源分明；有效人工改令撤候補並抑制該人自主清鼠，直到玩家明確重新允許。關允許只取消 auto 來源、保留 manual。示意見 docs/LP12_HANDOFF.md。
import { HOME, RATS, EXIT, PALM, SKILLS, GO_NODES, HOME_NODES, dist, inZone, validRat, nearest, standFor, stepToward, legs } from './palm.mjs';
// SG-PATROL-01：巡山狀態邏輯與林鼠初態（幾何在 patrol-layout.mjs）。
import { createPatrol, PATROL_MODES, PATROL_LABEL, PATROL_END, PATROL_RESULT, freshForestRats } from './patrol.mjs';
export { PATROL_MODES, PATROL_LABEL, PATROL_END, PATROL_RESULT };
// SG-LIFE-02：自主補水方針與一次同門招呼（只本局暫態，不入存檔；見 life02.mjs）。
import { createLife02, MEET_MODES, MEET_LABEL, FILL, MEET } from './life02.mjs';
export { MEET_MODES, MEET_LABEL, FILL, MEET };
// SG-TRAIN-01：練掌到熟練（目標／單位進度只本局；練熟結果寫原 palm）。見 train01.mjs。
import { createTrain01, TRAIN_MODES, TRAIN_LABEL, TRAIN } from './train01.mjs';
export { TRAIN_MODES, TRAIN_LABEL, TRAIN };
import { createTea, TEA_MODES, TEA_LABEL, TEA } from './tea.mjs';
export { TEA_MODES, TEA_LABEL, TEA };
// SG-HOME-02：木料、寢舍修繕與床位（只本局；見 home02.mjs）。
import { createHome02, H2_MODES, H2_LABEL, WOOD, SITE, WOOD_JOB, WOOD_PHASE_LABEL, ROOM_ID, BED_IDS, STAGE_LABEL } from './home02.mjs';
export { H2_MODES, H2_LABEL, WOOD, SITE, ROOM_ID, BED_IDS, STAGE_LABEL };

// LIFE-V01-V02 破道館開局、雙軌創角、預約守恆、宿命樹與全自動掌門自走
import { ReservationBroker } from '../../../life/core/reservation.mjs';
import { ToilPipeline } from '../../../life/core/toils.mjs';
import { SmartObjectSystem, LIFE_V02_CONSTANTS } from '../../../life/core/smart-objects.mjs';
import { evaluateDestinyMilestones } from '../../../life/core/destiny-engine.mjs';
import { SectLeaderAutopilot } from '../../../life/core/autopilot.mjs';
import { createPersona, createPresetDisciple, createIconicRoster, QUESTIONNAIRE } from '../../../life/core/persona-creation.mjs';
export {
  ReservationBroker,
  ToilPipeline,
  SmartObjectSystem,
  LIFE_V02_CONSTANTS,
  evaluateDestinyMilestones,
  SectLeaderAutopilot,
  createPersona,
  createPresetDisciple,
  createIconicRoster,
  QUESTIONNAIRE,
};
export const STEP_MS = 1000 / 60;

export const RULES = Object.freeze({
  maxLevel: 5,
  tripsToNext: [1, 2, 3, 4],
  emptySpeed: { base: 60, perLevel: 0.12, cap: 84 },
  loadSpeed: { base: 40, perLevel: 0.15, cap: 64 },
  dipMs: 4000,
  pourMs: 4000,
  vatCapacity: 8,
  vatStart: 3,
  useEveryMs: 60000,
  // 採藥：生活開發版示意值。採集／交藥沿用取水／倒水時長，藥架容量沿用 8；藥草點不枯竭、藥草不耗用，滿了就等。
  herbCapacity: 8,
  herbStart: 0,
  frameMs: { empty: 110, load: 130, grown: 105 },
  energy: { max: 100, start: 100, workPerSec: 1, restPerSec: 5, restAt: 30, backAt: 80 },
  // LP-06 示意值（PO 依委託選定、未實測）：速度為場景單位／秒，時長為遊戲毫秒。
  boar: { start: 60, threatStart: 0, max: 100, goEnergy: 80, goThreat: 20, restPerSec: 0.5, calmPerSec: 0.25, walkPerSec: 1,
    sniffMs: 2000, approach: 72, flee: 120, hitMs: 2000, hitCost: 18, tiredAt: 30, scaredAt: 60, shoutMs: 1000, shoutThreat: 80, maxMarks: 3 },
  // LP-08 示意值（D18 已批，待真人校準）：動手 8 遊戲秒、這段每秒精力 −1。
  fix: { workMs: 8000, workPerSec: 1 },
  // SG-LIFE-01 自主飲水（owner 核准示意值）：水分 0–100、新局 80、每遊戲秒 −0.5、≤20 想喝；在水缸旁飲 3 遊戲秒，
  // 成功才扣水缸實存 1、水分 +60（上限 100）。取代舊的每 60 秒背景扣水（drink 存在時 useEveryMs 不再生效，不疊加）。
  drink: { max: 100, start: 80, perSec: 0.5, want: 20, drinkMs: 3000, gain: 60, cost: 1 },
});
// 水分以 1/120 點存整數：每 tick −0.5/s＝1，長時間累加沒有浮點漂移。
export const WATER_Q = 120;
export const DRINK_LABEL = { toDrink: '口渴，走去水缸', drink: '喝水', fromDrink: '喝完返回' };
export const DRINK_MODES = Object.freeze(['toDrink', 'drink', 'fromDrink']);
export const DRINK_LENGTH = 40;
export const DRINK_NOTE = { ok: '喝到水：水缸 −1、水分 +60', empty: '到了水缸已沒水：沒喝到，照常工作', canceled: '玩家改令：沒喝完，先回去', dry: '口渴但水缸沒有實存：照常工作，有水再去喝' };
// 野豬精力／威脅以 1/240 點為單位存整數：每 tick 恢復 0.5/s＝2、淡忘 0.25/s＝1、走路 1/s＝4，長時間累加沒有浮點漂移。
export const BOAR_Q = 240;
export const BOAR_MODE = { habitat: '棲地恢復', out: '走出林緣', sniff: '林緣嗅探', approach: '靠近護欄', prep: '撞護欄', flee: '逃回棲地' };
// 未指定路線時的預設長度（棲地→林緣、棲地→護欄外、院中端點→防守點）；畫面用 routes.mjs 的實際折線長度覆寫。
export const BOAR_LENGTH = { edge: 210, total: 720 };
export const GUARD_LENGTH = 250;
// 退走中野豬離棲地多遠以內就看不見：與 routes.mjs boarAt().visible 的固定界線（x > −20）同源，畫面以 boarSeenD 覆寫。
export const BOAR_SEEN = 50;
export const FIX_LABEL = { toFix: '走去整理護欄', fix: '整理護欄', fromFix: '從護欄返院' };
const FIX_MODES = ['toFix', 'fix', 'fromFix'];
// 同 tick 都準備好時的打平順序（明列、穩定，不由迴圈或畫面順序決定）；不是最短 ETA 或排班公平。
export const AUTO_ORDER = Object.freeze(['hero', 'cousin']);
// 預選傾向是可交換 fixture（熟手主動、主角受擾），不由體態／個性推導，也不改速度或能力。
export const AUTO_REACT = Object.freeze({ hero: 'late', cousin: 'early' });
export const REACT_LABEL = { early: '主動照看', late: '受擾再處理' };
// LP-09 預選整理傾向（可交換 fixture）：熟手順手、主角累積；不改速度或能力。
export const UP_REACT = Object.freeze({ hero: 'late', cousin: 'early' });
export const UP_REACT_LABEL = { early: '順手照看', late: '累積再整理' };
export const GUARD_LABEL = { toGuard: '趕去防守點', guardWait: '在防守點等野豬', shout: '喝止／拍掌', fromGuard: '從防守點返院' };
const GUARD_MODES = ['toGuard', 'guardWait', 'shout', 'fromGuard'];
export const CLEAN_LABEL = { toRat: '走向測試鼠', windup: '起手', recover: '收勢', fromRat: '清理結束返院' };
const CLEAN_MODES = ['toRat', 'windup', 'recover', 'fromRat'];
export const CLEAN_END = { clear: '範圍內沒有有效目標', energy: `精力不足 ${PALM.cost}，不能起下一掌`, canceled: '玩家取消／改令', none: '出發時已沒有有效目標' };
export const RAT_MODE = { sniff: '嗅地', flee: '逃離中', down: '擊倒', gone: '逃出範圍（不追）' };
// 兩人各自的偏好活動：可替換的展示 fixture，不由體態或個性數值推導，也沒有效果。
export const PREFS = Object.freeze({
  hero: Object.freeze({ id: 'view', label: '看山', place: '觀景石', doing: '看山' }),
  cousin: Object.freeze({ id: 'stretch', label: '舒展筋骨', place: '院邊空地', doing: '舒展筋骨' }),
});
export const FUN_LABEL = { toFun: '去', fun: '', fromFun: '從休閒返院' };
// 院中端點到各人座位的單程長度（場景單位）；畫面用 routes.mjs 的實際路線長度覆寫，這裡只是未指定時的預設。
export const SEAT_LENGTH = 100;
export const PEOPLE = Object.freeze([
  Object.freeze({ id: 'hero', initialLevel: 1 }),
  Object.freeze({ id: 'cousin', initialLevel: 3 }),
]);
// 兩種工作只差路線、存放處與四段名稱；去程用空手速度、回程用負重速度，共用同一份腳力與成長。
export const JOBS = Object.freeze({
  water: Object.freeze({ label: '挑水', unit: '擔', place: '水缸', phases: ['down', 'dip', 'up', 'pour'] }),
  herb: Object.freeze({ label: '採藥', unit: '份', place: '藥架', phases: ['herbOut', 'herbGather', 'herbBack', 'herbDeliver'] }),
});
export const PHASE_LABEL = {
  down: '下山（空桶）', dip: '取水', up: '上山負重', pour: '倒水',
  herbOut: '往藥圃（空簍）', herbGather: '採藥', herbBack: '背藥回道館', herbDeliver: '交藥',
  ...WOOD_PHASE_LABEL,
};
// 對外 JOBS 不加砍柴（舊存檔驗證逐鍵核 done）；模型內部用 JB。
const JB = Object.freeze({ ...JOBS, wood: WOOD_JOB });

export function speedsFor(level, rules = RULES) {
  const f = (s) => Math.min(s.cap, s.base * (1 + s.perLevel * (level - 1)));
  return { empty: f(rules.emptySpeed), load: f(rules.loadSpeed) };
}
export function tripSteps(level, pathLength, rules = RULES) {
  return phaseSteps(speedsFor(level, rules), pathLength, rules).reduce((a, b) => a + b, 0);
}
function phaseSteps(sp, len, rules, gatherMs = rules.dipMs) {
  const st = (ms) => Math.ceil(ms / STEP_MS - 1e-9);
  return [st(len / sp.empty * 1000), st(gatherMs), st(len / sp.load * 1000), st(rules.pourMs)];
}
const idle = (level) => ({ mode: 'idle', job: null, phase: null, steps: 0, need: null, tripLevel: level });
// 去／回座位：出發時鎖空手速度算步數；坐著沒有固定步數，由精力決定何時起身。
const walkSteps = (level, len, rules) => Math.max(1, Math.ceil(len / speedsFor(level, rules).empty * 1000 / STEP_MS - 1e-9));
export const REST_LABEL = { toSeat: '走去休息', seated: '坐下恢復', back: '返回院中' };

// 第一參數是單程長度：數字＝兩份工作同長（舊單人基線與反例沿用），或 { water, herb, seat: { [id]: 長度 } }。
// 第三參數只指定新局人物與起始腳力；不承接舊 RT 存檔。
// 第四參數是偏好 fixture（預設 PREFS）；傳 {} 表示沒有人有偏好活動，只給隔離 LP-04 門檻的反例用。
// 第五參數 sense.placeOf(id, 幾何欄位)：由畫面同一份純幾何（routes.mjs createRoutes().of）提供人物在權威 tick 的場景位置，
// 只給 LP-11 警覺鼠的固定世界距離察覺用；未提供時（舊單元基線）只有清理者有模型位置。
export function createModel(routes, rules = RULES, characters = PEOPLE, prefs = PREFS, sense = {}) {
  const lengths = typeof routes === 'number' ? { water: routes, herb: routes } : { ...routes };
  const pathLength = lengths.water;
  const seatLen = (id) => (lengths.seat && lengths.seat[id]) || SEAT_LENGTH;
  const funLen = (id) => (lengths.fun && lengths.fun[id]) || SEAT_LENGTH;
  const boarLen = { ...BOAR_LENGTH, ...(lengths.boar || {}) }, guardLen = lengths.guard || GUARD_LENGTH;
  const seenD = boarLen.seen ?? BOAR_SEEN, fixSteps = Math.ceil(rules.fix.workMs / STEP_MS - 1e-9);
  const B = rules.boar, Q = BOAR_Q, perQ = (perSec) => Math.round(perSec * Q / 60), msSteps = (ms) => Math.ceil(ms / STEP_MS - 1e-9);
  const E = rules.energy, perTick = (perSec) => perSec * STEP_MS / 1000;
  const ids = characters.map((p) => p.id);
  // SG-HOME-02：砍柴路長由 sense 帶入（不進 lengths，免改存檔幾何比對）；採集 8 秒。
  const jobLen = (job) => job === 'wood' ? (sense.woodLength || 220) : lengths[job];
  const tripNeed = (lv, job) => phaseSteps(speedsFor(lv, rules), jobLen(job), rules, job === 'wood' ? WOOD.chopMs : rules.dipMs);
  // HOME-01／D45：口渴衰減與自動喝水移除（rules.thirst 預設關）；drink 規則只留給舊存檔在喝水模式中的那一趟照原收尾。
  const D = rules.drink, WQ = WATER_Q, THIRST = !!(D && rules.thirst), wq = (v) => Math.round(v * WQ);
  const drinkLen = (origin, id) => origin === 'seat' ? ((lengths.drinkSeat && lengths.drinkSeat[id]) || seatLen(id) + (lengths.drink || DRINK_LENGTH)) : (lengths.drink || DRINK_LENGTH);
  const s = {
    tick: 0, vat: rules.vatStart, inFlight: 0, herbs: rules.herbStart, herbInFlight: 0, useMs: 0, nextPerson: 0,
    people: Object.fromEntries(characters.map(({ id, initialLevel }) => [id, {
      id, initialLevel, level: initialLevel, xp: 0, trips: 0, motion: idle(initialLevel),
      job: 'water', pending: null, lastTrip: null, done: { water: 0, herb: 0 },
      // rest：為什麼在休息流程（auto＝精力低自主、manual＝玩家停工），返院途中 manual＝走完再回座位；why 是給玩家看的原因。
      energy: E.start, rest: null, why: null,
      // LP-05：recall＝玩家叫回待命（完成返院後新開始的一趟才解除）；funCap＝去程中見過空位，到點就回。
      recall: false, funCap: false,
      // LP-06：guardOrder＝被派去驅離的來訪編號（同一來訪最多一人）；guardResult 只是給玩家看的最近結果。
      guardOrder: null, guardResult: null, shoutDone: false,
      // LP-07：guardSrc＝正式驅離來源 auto／manual；want＝有意願的來訪（候補）；suppress＝玩家本訪改派；tried＝本訪已自主出發過。
      // autoNote 是給玩家看的最近原因（變動才記 log）。
      guardSrc: null, autoAllow: false, react: AUTO_REACT[id] || 'late', want: null, suppress: null, tried: null, autoNote: null,
      // LP-08：fix＝這人持有的未完成整理（wait 待原趟／恢復／返院、go 已出發或動手中）；fixResult 只是給玩家看的最近結果。
      fix: null, fixDue: false, fixResult: null,
      // LP-09：fixSrc／fixOpp＝正式整理的來源與受理時的碰撞機會；upWant＝整理候補（機會編號）；upSuppress＝玩家改令抑制的機會。
      fixSrc: null, fixOpp: null, upAllow: false, upReact: UP_REACT[id] || 'late', upWant: null, upSuppress: null, upNote: null,
      // LP-11：pos＝清理中的模型場景位置（不清理時在院中端點）；cface 朝向；walked 只給畫面換步；palm＝掌法比較 fixture（新局初學）。
      pos: { x: HOME[0], y: HOME[1] }, cface: -1, walked: 0, palm: 'novice', cleanResult: null,
      // LP-12：cleanAllow＝允許自主清鼠（預設 false）；cleanWant＝候補意願；cleanSuppress＝玩家改派抑制；cleanSrc＝正式清理來源 auto／manual；cleanNote＝最近原因。
      cleanAllow: false, cleanWant: false, cleanSuppress: false, cleanSrc: null, cleanNote: null,
      // SG-LIFE-01：waterQ＝水分（1/120 點整數）；drinkHold＝玩家剛取消、先照指令做事；drinkNote＝最近結果或原因（變動才記 log）。
      waterQ: D ? wq(D.start) : 0, drinkNote: null, drinkHold: false,
    }])),
    // LP-09：contact＝最新真護欄接觸序號（＝目前整理機會）；upUsed＝已被自主或人工受理結束的機會。
    contact: 0, upUsed: 0,
    fixBy: null, // 這段護欄唯一的未完成整理名額（人物 id）
    // LP-11：clean＝全場唯一清理名額（by／phase wait|go|back／target／downs／spent）；rats 只在新局重設。
    clean: null, rats: RATS.map((r) => ({ ...r, mode: 'sniff', exit: 0, why: null })),
    // 野豬：d＝離棲地沿固定路的距離；visit 是最近一次來訪編號，active＝這次來訪仍可派人（退走開始即失效）。
    boar: { mode: 'habitat', e: B.start * Q, t: B.threatStart * Q, d: 0, leg: null, steps: 0, need: 0, visit: 0, active: false, hits: 0, marks: 0, why: null, last: null },
    shadow: { active: false, job: null, phase: null, steps: 0, need: null },
    // SG-PATROL-01：patrol＝全場唯一巡山名額（null 或進行中）；patrolReport＝最近一份戰報；patrolLog＝有界活動摘要；prats＝三隻林鼠（新局才重設）。
    patrol: null, patrolReport: null, patrolLog: [], prats: freshForestRats(),
    log: [],
  };
  const pt = createPatrol({ s, rules, ids, Q, B, walkSteps, idle, GUARD_MODES, FIX_MODES, shoutSteps: msSteps(B.shoutMs), boarAt: sense.boarAt,
    nameOf: (id) => nameOf(id), cleaning: (p) => cleaning(p), jobLabel: (j) => JB[j].label, atHome: (p) => atHome(p), atHomeLife: (p) => atHome(p),
    goSeat: (p) => goSeat(p), assignee: () => assignee(), boarFlee: (why) => boarFlee(why), personAt: (p) => personAt(p) });
  const patrolling = (p) => pt.active(p); // 含等待與返院：真到院才釋放
  // SG-LIFE-02：暫態在 L2 閉包，不進 s；busy＝必要自理／人工／護院巡山承諾或候補、待執行（招呼不能插隊）。
  const L2 = createLife02({ s, ids, rules, meetLengths: sense.meetLengths, walkSteps, nameOf: (id) => nameOf(id), funLen: (id) => funLen(id), order: AUTO_ORDER,
    atHome: (p) => atHome(p), store: (job) => store(job), cleaning: (p) => cleaning(p), patrolling: (p) => patrolling(p), thirsty: (p) => thirsty(p),
    busy: (p) => !!p.rest || p.recall || T1.active(p) || TE.active(p) || H2.active(p) || p.pending != null || p.guardOrder != null || !!p.fix || cleaning(p) || patrolling(p) || wants(p) || wantsUp(p) || wantsClean(p) || (thirsty(p) && s.vat >= D.cost) || p.energy <= E.restAt });
  // SG-TRAIN-01：練掌暫態在 T1 閉包；blocked＝人工／護院巡山等既有承諾（這些先照原規則做完或被玩家取消）。
  const T1 = createTrain01({ s, ids, rules, SKILLS, walkSteps, nameOf: (id) => nameOf(id), trainLengths: sense.trainLengths,
    atHome: (p) => atHome(p), thirsty: (p) => thirsty(p), canDrink: () => !!D && s.vat >= D.cost,
    blocked: (p) => p.pending != null || p.guardOrder != null || !!p.fix || cleaning(p) || patrolling(p),
    adept: (p) => { p.palm = 'adept'; clog(p, 'palm:skill', { skill: 'adept', src: 'train' }); } });
  // HOME-01：茶座暫態在 TE 閉包（座位、真料預約、意圖、小事件），不進 s。
  const TE = createTea({ s, ids, rules, walkSteps, nameOf: (id) => nameOf(id), teaLength: sense.teaLength, atHome: (p) => atHome(p),
    blocked: (p) => p.pending != null || p.guardOrder != null || !!p.fix || cleaning(p) || patrolling(p) });
  // SG-HOME-02：木料庫／修繕工地／床位暫態在 H2 閉包。
  const H2 = createHome02({ s, ids, rules, nameOf: (id) => nameOf(id), atHome: (p) => atHome(p), siteLength: sense.siteLength, bedLengths: sense.bedLengths,
    walkSteps: (lv, len) => walkSteps(lv, len, rules), loadSteps: (lv, len) => Math.max(1, Math.ceil(len / speedsFor(lv, rules).load * 1000 / STEP_MS - 1e-9)),
    blocked: (p) => p.pending != null || p.guardOrder != null || !!p.fix || cleaning(p) || patrolling(p) || T1.gate(p) || TE.gate(p) });

  // LIFE-V01-V02 整合
  const lifeBroker = new ReservationBroker();
  const lifePipeline = new ToilPipeline(lifeBroker);
  const lifeAutopilot = new SectLeaderAutopilot(lifePipeline, lifeBroker);
  const lifeSmartObjects = new SmartObjectSystem();
  let masterDisciple = createPresetDisciple('yue_buqun').master;
  let recruitPool = createPresetDisciple('yue_buqun').recruitPool;
  let autopilotActive = false;

  const facilities = {
    'fac.hall': {
      facilityId: 'fac.hall',
      name: '大廳屋頂修繕',
      targetStage: 'S1',
      phase: 'staging_materials',
      stagingPile: {
        timber: { current: 0, required: 4, reservedInFlight: 0 },
        stone: { current: 0, required: 4, reservedInFlight: 0 },
        thatch: { current: 0, required: 4, reservedInFlight: 0 },
      },
      workforce: {
        mode: 'hire_artisans',
        hiredArtisan: null,
        progressTicks: 0,
        totalTicks: LIFE_V02_CONSTANTS.blueprints.hallRoofRepair.workTicks,
        activeWorkerId: null,
        bonusTimberOnComplete: 0,
      },
    },
    'fac.dorm.a': {
      facilityId: 'fac.dorm.a',
      name: '第一間雙人寢舍落成',
      targetStage: 'S1',
      phase: 'staging_materials',
      stagingPile: {
        timber: { current: 0, required: 6, reservedInFlight: 0 },
        stone: { current: 0, required: 2, reservedInFlight: 0 },
        thatch: { current: 0, required: 2, reservedInFlight: 0 },
      },
      workforce: {
        mode: 'hire_artisans',
        hiredArtisan: null,
        progressTicks: 0,
        totalTicks: LIFE_V02_CONSTANTS.blueprints.dormExpansion.workTicks,
        activeWorkerId: null,
        bonusTimberOnComplete: 0,
      },
    },
  };

  const housing = {
    beds: [
      { id: 'bed-1', owner: null, occupant: null },
      { id: 'bed-2', owner: null, occupant: null },
    ],
  };

  const lifeInventory = {
    tea: 2,
    timber: 0,
    stone: 0,
    thatch: 0,
  };
  // 存放處：數量、容量與在途預約；挑水沿用舊欄位名 vat／inFlight。
  const store = (job) => job === 'wood' ? H2.store() : job === 'herb'
    ? { amount: s.herbs, inFlight: s.herbInFlight, cap: rules.herbCapacity }
    : { amount: s.vat, inFlight: s.inFlight, cap: rules.vatCapacity };
  const full = (job) => { const st = store(job); return st.amount + st.inFlight >= st.cap; };
  const stocked = (job) => { const st = store(job); return st.amount >= st.cap; }; // 實存已滿（不含在途）
  const reserve = (job, d) => { if (job === 'wood') H2.reserveTrip(d); else if (job === 'herb') s.herbInFlight += d; else s.inFlight += d; };

  function depart(p) {
    if (p.motion.mode !== 'idle' || p.rest || p.guardOrder != null || p.fix || cleaning(p) || patrolling(p) || full(p.job) || L2.gate(p) || T1.gate(p) || TE.gate(p) || H2.gate(p)) return false;
    p.motion = { mode: 'carry', job: p.job, phase: 0, steps: 0, need: tripNeed(p.level, p.job), tripLevel: p.level, tripStart: s.tick };
    reserve(p.job, 1);
    if (p.id === 'hero' && p.job !== 'wood') s.shadow = { active: true, job: p.job, phase: 0, steps: 0, need: phaseSteps(speedsFor(p.initialLevel, rules), lengths[p.job], rules) };
    return true;
  }

  function finishTrip(p) {
    // 這一趟已持有一份預約，故不需 Math.min 截掉同刻另一人的入帳。
    const job = p.motion.job;
    if (job === 'wood') H2.deliverWood(p); // 在途→院倉：交付才入帳一次
    else { reserve(job, -1); if (job === 'herb') s.herbs += 1; else s.vat += 1; }
    p.trips += 1;
    if (job !== 'wood') p.done[job] += 1;
    L2.tripDone(p); // SG-LIFE-02：完成一趟新工作才可再發起招呼
    // 叫回只在休閒中可下，所以叫回時人一定不在工作；此後交付的第一趟必是返院後新開始的，完成即解除。
    if (p.recall) { p.recall = false; s.log.push({ tick: s.tick, person: p.id, kind: 'recallDone' }); }
    p.lastTrip = { job, level: p.motion.tripLevel, steps: s.tick - p.motion.tripStart };
    let grew = false;
    if (p.level < rules.maxLevel) {
      p.xp += 1;
      if (p.xp >= rules.tripsToNext[p.level - 1]) { p.level += 1; p.xp = 0; grew = true; }
    }
    s.log.push({ tick: s.tick, person: p.id, kind: 'trip', job, trips: p.trips, level: p.level, grew });
    p.motion = idle(p.level);
    // 待執行意圖只在交付後生效：停工或改做另一份工作，二者只留一個（最新的）。
    if (p.pending === 'rest') {
      p.rest = 'manual'; p.why = '玩家下令停工';
      s.log.push({ tick: s.tick, person: p.id, kind: 'rest' });
    } else if (p.pending) {
      p.job = p.pending;
      s.log.push({ tick: s.tick, person: p.id, kind: 'switch', job: p.job });
    }
    p.pending = null;
    atHome(p);
  }

  // 人在院中端點（交付完、返院到達、閒置）：玩家停工先去座位；否則精力≤30 自主去恢復；再否則留在院中由出發迴圈按容量出發或等待。
  function atHome(p) {
    if (p.rest !== 'manual' && p.energy <= E.restAt) { p.rest = 'auto'; p.why = `精力 ${Math.floor(p.energy)} ≤ ${E.restAt}，自己去恢復`; }
    if (p.rest) goSeat(p);
    else if (cleaning(p) && s.clean.phase === 'wait') goClean(p);
    else if (patrolling(p) && s.patrol.phase === 'wait') pt.atHome(p);
    else if (p.fix === 'wait') goFix(p);
    else if (p.guardOrder != null && guardLive(p)) goGuard(p);
    else { if (p.guardOrder != null) expireGuard(p); p.motion = idle(p.level); p.why = null; }
  }
  // ---------- LP-06 驅離（人物側）----------
  const guardLive = (p) => s.boar.active && p.guardOrder === s.boar.visit;
  const guardWalk = (p, mode) => ({ mode, job: null, phase: null, steps: 0, need: walkSteps(p.level, guardLen, rules), tripLevel: p.level });
  function goGuard(p) {
    p.why = p.guardSrc === 'auto' ? '自己去驅離野豬' : '玩家派去驅離野豬';
    p.motion = guardWalk(p, 'toGuard');
    s.log.push({ tick: s.tick, person: p.id, kind: 'toGuard', visit: p.guardOrder });
  }
  function leaveGuard(p) {
    p.motion = guardWalk(p, 'fromGuard'); p.shoutDone = false;
    s.log.push({ tick: s.tick, person: p.id, kind: 'fromGuard' });
  }
  function result(p, kind) {
    p.guardResult = { visit: p.guardOrder, kind, tick: s.tick, src: p.guardSrc };
    s.log.push({ tick: s.tick, person: p.id, kind: 'guard:' + kind, visit: p.guardOrder, src: p.guardSrc });
    if (p.guardSrc === 'auto') note(p, kind === 'canceled' ? (p.autoAllow ? 'canceled' : 'off') : kind, p.guardOrder);
    p.guardOrder = null; p.shoutDone = false; p.guardSrc = null;
  }
  // 目標已退走：還沒出發的清掉意圖照原流程；到了防守點（或喝止中）的就是晚到，從防守點走回去。
  function expireGuard(p) { result(p, 'expired'); if (p.why === '玩家派去驅離野豬') p.why = null; }
  // ---------- LP-07 自主護院 ----------
  // 原因只在變動時記 log；同一來訪同一原因不重複。
  function note(p, kind, visit = s.boar.visit) {
    if (p.autoNote && p.autoNote.kind === kind && p.autoNote.visit === visit) return;
    p.autoNote = { kind, visit, tick: s.tick };
    s.log.push({ tick: s.tick, person: p.id, kind: 'auto:' + kind, visit });
  }
  const live = () => s.boar.active;
  const wants = (p) => live() && p.want === s.boar.visit;
  function dropWant(p, kind) { if (!wants(p)) return false; p.want = null; note(p, kind); return true; }
  // 玩家有效改令：清候補、抑制該人這次來訪；沒有進行中的來訪就不抑制未來。
  function override(p) { if (!live()) return; dropWant(p, 'player'); p.suppress = s.boar.visit; }
  // 硬限制：沒允許、本訪被玩家改派或已自主出發過、停工／待停工、LP05 叫回、自己已有正式驅離、同伴已正式處理。
  function blocked(p) {
    const v = s.boar.visit, who = assignee();
    if (!p.autoAllow) return 'off';
    if (p.suppress === v) return 'player';
    if (p.tried === v) return 'tried';
    if (p.rest === 'manual' || p.pending === 'rest' || p.recall || T1.active(p) || TE.active(p) || H2.active(p)) return 'held';
    if (p.guardOrder != null || cleaning(p) || patrolling(p)) return 'self';
    if (who && who !== p.id) return 'peer';
    return null;
  }
  // 早反應看可察覺的嗅探／靠近／到護欄（畫外 out 不讀心）；晚反應看本訪 hits（不看全局 marks，封頂後仍會反應）。
  const triggered = (p) => (p.react === 'early' ? ['sniff', 'approach', 'prep'].includes(s.boar.mode) : s.boar.hits >= 1);
  function wantStep() {
    if (!live()) return;
    for (const id of ids) {
      const p = s.people[id], why = blocked(p);
      if (why) { if (why === 'peer') dropWant(p, 'peer'); continue; }
      // 未正式受理的候補每次都用最新傾向重評：改成受擾後，本訪未被撞就收回意願（已出發的 guard 不在此列）。
      if (p.want === s.boar.visit && !triggered(p)) dropWant(p, 'react');
      else if (p.want !== s.boar.visit && triggered(p)) { p.want = s.boar.visit; note(p, 'want'); }
    }
  }
  // 正式受理：只在院中端點（idle、不在恢復、交付已完成），在原工作／休閒再出發之前；同 tick 依 AUTO_ORDER 只取一位。
  function acceptStep() {
    if (!live() || assignee()) return;
    for (const id of AUTO_ORDER) {
      const p = s.people[id];
      if (!p || !wants(p) || blocked(p) || !triggered(p) || p.motion.mode !== 'idle' || p.rest) continue;
      p.want = null; p.tried = s.boar.visit; p.guardOrder = s.boar.visit; p.guardSrc = 'auto'; p.guardResult = null;
      s.log.push({ tick: s.tick, person: p.id, kind: 'guard', visit: p.guardOrder, src: 'auto' });
      note(p, 'go');
      goGuard(p);
      for (const q of ids) if (q !== id) dropWant(s.people[q], 'peer');
      return;
    }
  }
  // 設定：允許／傾向。暫停時也可改，零進度；不清本訪抑制／已嘗試，也不重啟已出發的驅離。
  function setAuto(id, { allow, react } = {}) {
    const p = s.people[id];
    if (!p) return { ok: false, reason: '沒有這個工作者' };
    if (react && react !== p.react) {
      if (!REACT_LABEL[react]) return { ok: false, reason: '沒有這個傾向' };
      p.react = react; s.log.push({ tick: s.tick, person: id, kind: 'auto:react', react });
      if (wants(p) && !triggered(p)) dropWant(p, 'react'); // 候補立即照新傾向；已正式受理的不重啟也不取消
    }
    if (allow != null && !!allow !== p.autoAllow) {
      p.autoAllow = !!allow;
      s.log.push({ tick: s.tick, person: id, kind: 'auto:allow', allow: p.autoAllow });
      if (!p.autoAllow) {
        dropWant(p, 'off');
        // 只取消自主來源尚未完成的效果；玩家明派的保留。去防守點途中走完這段，到點發現已取消就返院。
        if (p.guardSrc === 'auto') cancelGuard(p);
      }
    }
    return { ok: true, text: p.autoAllow ? `允許自主護院：${REACT_LABEL[p.react]}` : '不自主護院（仍可由玩家派遣）' };
  }
  // 新改工作／開始／停工：取消尚未完成的驅離；在防守點等或喝止中立刻返院，去防守點途中走完這段再回。
  function cancelGuard(p) {
    if (p.guardOrder == null) return false;
    result(p, 'canceled');
    if (p.motion.mode === 'guardWait' || p.motion.mode === 'shout') leaveGuard(p);
    return true;
  }
  function arriveGuard(p) {
    if (guardLive(p)) { p.motion = { mode: 'guardWait', job: null, phase: null, steps: 0, need: null, tripLevel: p.level }; s.log.push({ tick: s.tick, person: p.id, kind: 'guardWait' }); return; }
    if (p.guardOrder != null) result(p, 'late');
    leaveGuard(p);
  }
  // ---------- LP-08 護欄整理 ----------
  // 看得見的野豬：嗅探／靠近／撞護欄，或退走中仍在可見界線內。畫外 out／棲地不讀心，也不隨鏡頭／視窗改變。
  const boarSeen = () => { const b = s.boar; return ['sniff', 'approach', 'prep'].includes(b.mode) || (b.mode === 'flee' && b.d > seenD); };
  const fixWalk = (p, mode) => ({ mode, job: null, phase: null, steps: 0, need: walkSteps(p.level, guardLen, rules), tripLevel: p.level });
  // 名額只在這裡釋放一次：完成、失效或玩家取消。
  function endFix(p, kind) {
    p.fixResult = { kind, tick: s.tick, marks: s.boar.marks, src: p.fixSrc };
    s.log.push({ tick: s.tick, person: p.id, kind: 'fix:' + kind, marks: s.boar.marks, src: p.fixSrc, opp: p.fixOpp });
    // 只結算這一份已受理的整理；不改目前機會或已用標記（途中出現的新碰撞不會被舊任務結果關掉）。
    if (p.fixSrc === 'auto') upNote(p, kind === 'canceled' && !p.upAllow ? 'off' : kind, p.fixOpp);
    p.fix = null; p.fixDue = false; s.fixBy = null; p.fixSrc = null; p.fixOpp = null;
    if (p.why === '玩家派去整理護欄' || p.why === '自己去整理護欄') p.why = null;
  }
  // 院中端點出發：再核安全與損痕；不合法就失效，不等野豬走後自動補派。
  function goFix(p) {
    if (boarSeen()) { endFix(p, 'threat'); p.motion = idle(p.level); return; }
    if (s.boar.marks <= 0) { endFix(p, 'clean'); p.motion = idle(p.level); return; }
    p.fix = 'go'; p.why = p.fixSrc === 'auto' ? '自己去整理護欄' : '玩家派去整理護欄';
    p.motion = fixWalk(p, 'toFix');
    s.log.push({ tick: s.tick, person: p.id, kind: 'toFix' });
  }
  function leaveFix(p) {
    p.motion = fixWalk(p, 'fromFix');
    s.log.push({ tick: s.tick, person: p.id, kind: 'fromFix' });
  }
  function arriveFix(p) {
    if (p.fix === 'go' && !boarSeen() && s.boar.marks > 0) {
      p.motion = { mode: 'fix', job: null, phase: null, steps: 0, need: fixSteps, tripLevel: p.level };
      s.log.push({ tick: s.tick, person: p.id, kind: 'fix' });
      return;
    }
    if (p.fix) endFix(p, boarSeen() ? 'threat' : 'clean');
    leaveFix(p);
  }
  // 取消尚未完成的整理（玩家有效改令／專用取消／叫回／安全失效）：前往途中走完這段再回，動手中立刻返院，待執行只清名額。
  function dropFix(p, kind) {
    if (!p.fix) return false;
    endFix(p, kind);
    if (p.motion.mode === 'fix') leaveFix(p);
    return true;
  }
  // 每 tick 野豬結算後：先看安全（看得見就失效，不補效果），再結算本 tick 做滿的那一下。
  function fixStep() {
    for (const id of ids) {
      const p = s.people[id];
      if (!p.fix) continue;
      if (boarSeen()) { dropFix(p, 'threat'); continue; }
      if (p.fixDue) {
        s.boar.marks = Math.max(0, s.boar.marks - 1);
        endFix(p, 'done');
        leaveFix(p);
      }
    }
  }
  function fixOrder(p) {
    p.fix = 'wait'; s.fixBy = p.id; p.fixResult = null; p.fixSrc = 'manual'; p.fixOpp = s.contact;
    s.log.push({ tick: s.tick, person: p.id, kind: 'fixOrder', marks: s.boar.marks, src: 'manual' });
    // 有效人工整理結束當時最新的自主機會，撤回全隊未受理候補；人工本身不受輪次上限。
    if (s.contact > 0 && s.upUsed !== s.contact) s.upUsed = s.contact;
    for (const id of ids) dropUp(s.people[id], 'manual');
    const m = p.motion.mode;
    if (m === 'idle') { atHome(p); return { ok: true, text: p.rest ? `精力低，先恢復到 ${E.backAt} 再去整理護欄` : '走去西坡護欄整理一階損痕' }; }
    if (m === 'carry') return { ok: true, text: `本趟${JB[p.motion.job].label}交付後去整理護欄`, pending: true };
    if (m === 'toFun') return { ok: true, text: `走到${prefs[p.id].place}後回院中，再去整理護欄` };
    if (m === 'fun' || m === 'fromFun') return { ok: true, text: '回院中後去整理護欄' };
    if (m === 'toSeat' || m === 'seated') return { ok: true, text: `先恢復到 ${E.backAt}，回院中再去整理護欄` };
    return { ok: true, text: '回到院中就去整理護欄' };
  }
  function fixReason(p) {
    const m = p.motion.mode;
    if (s.fixBy === p.id) return '已在整理這段護欄（重送不重新出發）';
    if (s.fixBy) return `${nameOf(s.fixBy)}已在整理這段護欄`;
    if (m === 'fromFix') return '正從護欄返院：回到院中後才能再派';
    if (p.guardOrder != null || GUARD_MODES.includes(m)) return '正在驅離野豬（含返院）：回院中後再派';
    if (cleaning(p)) return '正在清理測試鼠（含返院）：回院中後再派';
    if (patrolling(p)) return '正在巡山（含返院）：回院中後再派';
    if (s.boar.marks <= 0) return '護欄沒有損痕';
    if (boarSeen()) return '看得見野豬：等牠離開視線再整理';
    if (p.rest === 'manual') return '已停工：下令開始工作才解除';
    if (p.pending === 'rest') return '已排定本趟後停工';
    return '';
  }
  // ---------- LP-09 自主整理 ----------
  function upNote(p, kind, opp = s.contact) {
    if (p.upNote && p.upNote.kind === kind && p.upNote.opp === opp) return;
    p.upNote = { kind, opp, tick: s.tick };
    s.log.push({ tick: s.tick, person: p.id, kind: 'up:' + kind, opp });
  }
  // 候補只對最新機會有效；新接觸後舊候補自然失效（不能在新輪偷受理）。
  const wantsUp = (p) => s.contact > 0 && p.upWant === s.contact;
  function dropUp(p, kind) { if (!wantsUp(p)) { p.upWant = null; return false; } p.upWant = null; upNote(p, kind); return true; }
  // 玩家有效改令：清當人整理候補並抑制目前機會；沒有機會（0）時下一次真碰撞就不再受抑制。
  function upOverride(p) { dropUp(p, 'player'); p.upSuppress = s.contact; }
  const upTriggered = (p) => (p.upReact === 'early' ? s.boar.marks >= 1 : s.boar.marks >= B.maxMarks);
  // 硬限制（依序）：沒允許、沒有機會、本輪已用、玩家抑制、停工／待停工／叫回、自己有正式護院或整理、同伴持有整理名額、看得見野豬、沒有損痕。
  function upBlocked(p) {
    if (!p.upAllow) return 'off';
    if (s.contact <= 0) return 'none';
    if (s.upUsed === s.contact) return 'used';
    if (p.upSuppress === s.contact) return 'player';
    if (p.rest === 'manual' || p.pending === 'rest' || p.recall || T1.active(p) || TE.active(p) || H2.active(p)) return 'held';
    if (p.guardOrder != null) return 'guard';
    if (p.fix || cleaning(p) || patrolling(p)) return 'self';
    if (s.fixBy) return 'peer';
    if (boarSeen()) return 'threat';
    if (s.boar.marks <= 0) return 'clean';
    return null;
  }
  // 這些限制讓本輪候補失效（撤回）；其餘（看得見野豬、名額被舊輪整理占著、自己正在護院）只是暫緩正式受理。
  const UP_DROP = ['off', 'none', 'used', 'player', 'held', 'clean'];
  function upWantStep() {
    for (const id of ids) {
      const p = s.people[id], why = upBlocked(p);
      if (why) { if (UP_DROP.includes(why)) dropUp(p, why === 'used' ? 'used' : why); else if (!wantsUp(p) && p.upWant != null) p.upWant = null; continue; }
      if (wantsUp(p) && !upTriggered(p)) dropUp(p, 'react');
      else if (!wantsUp(p) && upTriggered(p)) { p.upWant = s.contact; upNote(p, 'want'); }
    }
  }
  // 正式受理：院中端點（idle、不在恢復、交付已完成），在原工作／休閒再出發之前；同 tick 依 AUTO_ORDER 只取一位並立即出發。
  function upAcceptStep() {
    if (s.fixBy) return;
    for (const id of AUTO_ORDER) {
      const p = s.people[id];
      if (!p || !wantsUp(p) || upBlocked(p) || !upTriggered(p) || p.motion.mode !== 'idle' || p.rest) continue;
      p.upWant = null; s.upUsed = s.contact;
      p.fix = 'wait'; s.fixBy = p.id; p.fixResult = null; p.fixSrc = 'auto'; p.fixOpp = s.contact;
      s.log.push({ tick: s.tick, person: p.id, kind: 'fixOrder', marks: s.boar.marks, src: 'auto', opp: s.contact });
      upNote(p, 'go');
      goFix(p);
      for (const q of ids) if (q !== id) dropUp(s.people[q], 'used');
      return;
    }
  }
  // 設定：允許／傾向。暫停時也可改（零進度）；不清抑制／已用機會，也不重啟已正式受理的整理。
  function setUpkeep(id, { allow, react } = {}) {
    const p = s.people[id];
    if (!p) return { ok: false, reason: '沒有這個工作者' };
    if (react && react !== p.upReact) {
      if (!UP_REACT_LABEL[react]) return { ok: false, reason: '沒有這個傾向' };
      p.upReact = react; s.log.push({ tick: s.tick, person: id, kind: 'up:reactSet', react });
      if (wantsUp(p) && !upTriggered(p)) dropUp(p, 'react');
    }
    if (allow != null && !!allow !== p.upAllow) {
      p.upAllow = !!allow;
      s.log.push({ tick: s.tick, person: id, kind: 'up:allow', allow: p.upAllow });
      if (!p.upAllow) {
        dropUp(p, 'off');
        // 只取消自主來源尚未完成的整理；前往途中走完這段再回，動手中立刻返院；人工來源保留。
        if (p.fix && p.fixSrc === 'auto') dropFix(p, 'canceled');
      }
    }
    return { ok: true, text: p.upAllow ? `允許自主整理：${UP_REACT_LABEL[p.upReact]}` : '不自主整理（仍可由玩家派遣）' };
  }
  // ---------- LP-11 手動掌法清鼠 ----------
  const cleaning = (p) => !!s.clean && s.clean.by === p.id; // 含等待與返院：名額到真返院才釋放
  const ratById = (id) => s.rats.find((r) => r.id === id);
  const clog = (p, kind, extra = {}) => s.log.push({ tick: s.tick, person: p.id, kind, ...extra });
  // 一短段：出發時鎖目前腳力的空手速度與實際距離算步數；位置每 tick 由 from→to 取樣。
  function walkTo(p, mode, to, queue = []) {
    const from = { x: p.pos.x, y: p.pos.y }, len = dist(from, to);
    p.cface = Math.abs(to.x - from.x) < 1e-9 ? p.cface : to.x < from.x ? -1 : 1;
    p.motion = { mode, job: null, phase: null, steps: 0, need: walkSteps(p.level, len, rules), tripLevel: p.level, from, to, queue };
  }
  const walkQueue = (p, mode, queue) => { const to = queue.shift(); walkTo(p, mode, to, queue); };
  function cleanOrder(p) {
    s.clean = { by: p.id, phase: 'wait', target: null, downs: 0, spent: 0, end: null, tick: s.tick, src: 'manual' };
    p.cleanResult = null;
    p.cleanSrc = 'manual';
    clog(p, 'cleanOrder', { src: 'manual' });
    const m = p.motion.mode;
    if (m === 'idle') { atHome(p); return { ok: true, text: p.rest ? `精力低，先恢復到 ${E.backAt} 再去清理` : '從院中出發，去西院清理測試鼠' }; }
    if (m === 'carry') return { ok: true, text: `本趟${JB[p.motion.job].label}交付後去清理測試鼠`, pending: true };
    if (m === 'toFun') return { ok: true, text: `走到${prefs[p.id].place}後回院中，再去清理` };
    if (m === 'fun' || m === 'fromFun') return { ok: true, text: '回院中後去清理' };
    if (m === 'toSeat' || m === 'seated') return { ok: true, text: `先恢復到 ${E.backAt}，回院中再去清理` };
    return { ok: true, text: '回到院中就去清理' };
  }
  function cleanReason(p) {
    const m = p.motion.mode;
    if (cleaning(p)) return s.clean.phase === 'back' ? '正在清理返院：回到院中後才能再派' : '已在清理（重送不重新出發）';
    if (s.clean) return `${nameOf(s.clean.by)}已在清理（全場只一份）`;
    if (p.rest === 'manual') return '已停工：下令開始工作才解除';
    if (p.pending === 'rest') return '已排定本趟後停工';
    if (p.guardOrder != null || GUARD_MODES.includes(m)) return '正在驅離野豬（含返院）：回院中後再派';
    if (p.fix || FIX_MODES.includes(m)) return '正在整理護欄（含返院）：回院中後再派';
    if (patrolling(p)) return '正在巡山（含返院）：回院中後再派';
    if (!s.rats.some(validRat)) return '範圍內沒有有效的測試鼠';
    return '';
  }
  // 院中端點出發：再核有效目標；沒有就結束、立即釋放（還沒離開院中）。
  function goClean(p) {
    const t = nearest(s.rats, p.pos), src = s.clean ? s.clean.src : 'manual';
    if (!t) { p.cleanResult = { kind: 'none', downs: 0, spent: 0, tick: s.tick, src }; clog(p, 'clean:none', { src }); s.clean = null; p.motion = idle(p.level); return; }
    s.clean.phase = 'go'; s.clean.target = t.id; p.why = src === 'auto' ? '自己去清理測試鼠' : '玩家派去清理測試鼠';
    clog(p, 'toRat', { target: t.id, src });
    walkQueue(p, 'toRat', legs(p.pos, GO_NODES));
    p.motion.hold = s.tick; // 回院端點這 tick 已用掉原活動的移動；第一步留給下一權威 tick（每人每 tick 只走一次）
  }
  // 站在節點上：目標失效就換最近有效者；沒有 2 精力就收工；在掌距內就起手；否則朝站位再走一短段。
  function approach(p) {
    const c = s.clean;
    let t = ratById(c.target);
    if (!t || !validRat(t)) {
      t = nearest(s.rats, p.pos);
      if (!t) { finishClean(p, 'clear'); return; }
      c.target = t.id; clog(p, 'palm:retarget', { target: t.id });
    }
    if (p.energy < PALM.cost) { finishClean(p, 'energy'); return; }
    if (dist(p.pos, t) <= PALM.reach) { windup(p, t); return; }
    walkTo(p, 'toRat', stepToward(p.pos, standFor(t)));
  }
  function windup(p, t) {
    p.energy -= PALM.cost; s.clean.spent += PALM.cost; // 真正開始起手才扣，一次；中止不退
    p.cface = t.x < p.pos.x ? -1 : 1;
    p.motion = { mode: 'windup', job: null, phase: null, steps: 0, need: SKILLS[p.palm].windup, tripLevel: p.level, target: t.id };
    clog(p, 'palm:windup', { target: t.id, skill: p.palm, src: s.clean.src });
  }
  // 接觸 tick：用本 tick 已移動／出界後的鼠與人物位置重驗同一 ID；成立才擊倒一次，之後才傳同伴目擊。
  function contact(p) {
    const t = ratById(p.motion.target), src = s.clean ? s.clean.src : 'manual';
    if (t && validRat(t) && dist(p.pos, t) <= PALM.reach) {
      t.mode = 'down'; t.why = `${nameOf(p.id)}一掌擊倒`;
      s.clean.downs += 1; s.clean.lastHit = { rat: t.id, tick: s.tick };
      clog(p, 'palm:hit', { target: t.id, skill: p.palm, src });
      for (const r of s.rats) if (r.kind === 'alert' && r.mode === 'sniff' && dist(r, t) <= PALM.witness) fleeRat(r, `同伴鼠${t.id}受掌`);
      p.motion = { mode: 'recover', job: null, phase: null, steps: 0, need: SKILLS[p.palm].recover, tripLevel: p.level, target: t.id };
      return;
    }
    clog(p, 'palm:miss', { target: p.motion.target, src });
    approach(p); // 目標先失效：不出掌、不隔空補中，已花不退；換有效目標或結束
  }
  function finishClean(p, kind) {
    const c = s.clean, src = c ? c.src : 'manual';
    c.phase = 'back'; c.end = kind;
    p.cleanResult = { kind, downs: c.downs, spent: c.spent, tick: s.tick, src };
    clog(p, 'clean:' + kind, { downs: c.downs, src });
    goHomeClean(p);
  }
  function goHomeClean(p) {
    const q = legs(p.pos, HOME_NODES);
    if (q.length) walkQueue(p, 'fromRat', q); else homeClean(p);
  }
  // 真返院：才釋放名額，再核最新工作／停工／必要恢復與容量（沿 atHome 與出發迴圈）。
  function homeClean(p) {
    p.pos = { x: HOME[0], y: HOME[1] };
    const src = s.clean ? s.clean.src : p.cleanSrc || 'manual';
    s.clean = null;
    clog(p, 'clean:home', { src });
    if (p.why === '玩家派去清理測試鼠' || p.why === '自己去清理測試鼠') p.why = null;
    p.motion = idle(p.level);
    atHome(p);
  }
  // 專用取消／有效改令：未出發立即釋放；前往走完當前短段再返院；起手中止（不退）、收勢中保留結果都立刻返院；返院中拒絕。
  function cancelClean(p) {
    const c = s.clean, src = c ? c.src : 'manual';
    if (!c || c.by !== p.id || c.phase === 'back') return false;
    p.cleanResult = { kind: 'canceled', downs: c.downs, spent: c.spent, tick: s.tick, src };
    clog(p, 'clean:canceled', { downs: c.downs, mode: p.motion.mode, src });
    if (c.phase === 'wait') { s.clean = null; return true; }
    c.phase = 'back'; c.end = 'canceled';
    if (p.why === '玩家派去清理測試鼠' || p.why === '自己去清理測試鼠') p.why = null;
    if (p.motion.mode === 'windup' || p.motion.mode === 'recover') goHomeClean(p);
    return true;
  }
  function fleeRat(r, why, by = null) { r.mode = 'flee'; r.why = why; s.log.push({ tick: s.tick, kind: 'rat:flee', rat: r.id, why, by }); }
  // routes.of() 需要的最少欄位：模式、工作／階段進度與各往返腿進度；清理中直接用模型 pos。
  function geoView(p) {
    const h = p.motion, k = h.need && h.mode !== 'carry' ? Math.min(1, h.steps / h.need) : 0, leg = { k };
    return { mode: h.mode, job: h.mode === 'carry' ? h.job : p.job,
      phase: h.mode === 'carry' ? { name: JB[h.job].phases[h.phase], k: Math.min(1, h.steps / h.need[h.phase]) } : null,
      restLeg: leg, funLeg: leg, guardLeg: leg, fixLeg: leg,
      drinkLeg: DRINK_MODES.includes(h.mode) ? { k, span: h.span ?? 1, from: h.from } : null,
      cleaning: CLEAN_MODES.includes(h.mode), patrolling: PATROL_MODES.includes(h.mode), pos: p.pos, cface: p.cface, walked: p.walked,
      life02: MEET_MODES.includes(h.mode) ? L2.view(p) : null, train01: TRAIN_MODES.includes(h.mode) ? T1.view(p) : null, tea: TEA_MODES.includes(h.mode) ? TE.view(p) : null };
  }
  // 人物目前的場景位置：清理中讀模型 pos；其餘由共用純幾何取樣（沒提供就沒有位置）。
  const personAt = (p) => (CLEAN_MODES.includes(p.motion.mode) || PATROL_MODES.includes(p.motion.mode) ? p.pos : sense.placeOf ? sense.placeOf(p.id, geoView(p)) : null);
  function ratStep() {
    for (const r of s.rats) {
      if ((r.mode !== 'flee' && r.mode !== 'gone') || r.exit >= EXIT.length) continue;
      let left = PALM.flee / 60;
      while (left > 0 && r.exit < EXIT.length) {
        const [tx, ty] = EXIT[r.exit], d = Math.hypot(tx - r.x, ty - r.y);
        if (d <= left) { r.x = tx; r.y = ty; left -= d; r.exit += 1; } else { r.x += (tx - r.x) * left / d; r.y += (ty - r.y) * left / d; left = 0; }
      }
      if (r.mode === 'flee' && !inZone(r.x, r.y)) { r.mode = 'gone'; s.log.push({ tick: s.tick, kind: 'rat:gone', rat: r.id }); }
    }
  }
  function cleanStep() {
    ratStep();
    const c = s.clean;
    if (c && c.phase !== 'wait') {
      const p = s.people[c.by], h = p.motion;
      if (h.hold === s.tick) { /* 本 tick 才在人物迴圈受理：不再推第一段 */ }
      else if (h.mode === 'toRat' || h.mode === 'fromRat') {
        h.steps += 1;
        const k = Math.min(1, h.steps / h.need), px = p.pos.x, py = p.pos.y;
        p.pos = h.steps >= h.need ? { x: h.to.x, y: h.to.y } : { x: h.from.x + (h.to.x - h.from.x) * k, y: h.from.y + (h.to.y - h.from.y) * k };
        p.walked += Math.hypot(p.pos.x - px, p.pos.y - py);
        if (h.steps >= h.need) {
          if (h.mode === 'fromRat') { if (h.queue.length) walkQueue(p, 'fromRat', h.queue); else homeClean(p); }
          else if (c.phase === 'back') goHomeClean(p); // 取消：走完這段就從這裡返院，不續走原路
          else if (h.queue.length) walkQueue(p, 'toRat', h.queue);
          else approach(p);
        }
      } else if (h.mode === 'windup') { h.steps += 1; if (h.steps >= h.need) contact(p); }
      else if (h.mode === 'recover') { h.steps += 1; if (h.steps >= h.need) approach(p); }
    }
    // 察覺：任何人（不論是否清理、在做什麼）本 tick 結算後的場景位置 ≤50 就逃；只按固定世界距離，不讀鏡頭／所選人／未送指令，無遮擋視線。
    // 依 ids 固定順序找第一個觸發者只影響記錄的原因文字，不影響結果。
    for (const r of s.rats) {
      if (r.kind !== 'alert' || r.mode !== 'sniff') continue;
      const who = ids.find((id) => { const at = personAt(s.people[id]); return at && dist(r, at) <= PALM.see; });
      if (who) fleeRat(r, `察覺${nameOf(who)}逼近`, who);
    }
  }
  // 掌法比較 fixture：只有全場沒有清理任務時可換；不算人工工作覆寫。
  function setPalm(id, skill) {
    const p = s.people[id];
    if (!p) return { ok: false, reason: '沒有這個工作者' };
    if (!SKILLS[skill]) return { ok: false, reason: '沒有這個掌法設定' };
    if (s.clean) return { ok: false, reason: '有清理任務（含等待與返院）：真返院後才能換掌法比較設定' };
    if (s.patrol) return { ok: false, reason: '有巡山任務（含等待與返院）：真返院後才能換掌法比較設定' };
    if (p.palm !== skill) { p.palm = skill; clog(p, 'palm:skill', { skill }); }
    return { ok: true, text: `掌法比較 fixture：${SKILLS[skill].label}（起手 ${SKILLS[skill].windup}／收勢 ${SKILLS[skill].recover} tick）` };
  }
  // ---------- LP-12 自主清鼠 ----------
  function cleanNote(p, kind) {
    if (p.cleanNote && p.cleanNote.kind === kind) return;
    p.cleanNote = { kind, tick: s.tick };
    s.log.push({ tick: s.tick, person: p.id, kind: 'autoclean:' + kind });
  }
  const wantsClean = (p) => p.cleanAllow && !p.cleanSuppress && p.cleanWant;
  function dropCleanWant(p, kind) {
    if (!p.cleanWant) return false;
    p.cleanWant = false;
    cleanNote(p, kind);
    return true;
  }
  function cleanOverride(p) {
    dropCleanWant(p, 'player');
    p.cleanSuppress = true;
  }
  function cleanBlocked(p) {
    if (!p.cleanAllow) return 'off';
    if (p.cleanSuppress) return 'player';
    if (p.rest === 'manual' || p.pending === 'rest' || p.recall || T1.active(p) || TE.active(p) || H2.active(p)) return 'held';
    if (cleaning(p) || patrolling(p)) return 'self';
    if (!s.rats.some(validRat)) return 'none';
    return null;
  }
  function cleanWantStep() {
    const hasRats = s.rats.some(validRat);
    for (const id of ids) {
      const p = s.people[id], why = cleanBlocked(p);
      if (why) {
        if (p.cleanWant) dropCleanWant(p, why);
        continue;
      }
      if (s.clean && s.clean.by !== p.id) {
        if (p.cleanWant) cleanNote(p, 'peer');
        else if (hasRats) { p.cleanWant = true; cleanNote(p, 'peer'); }
        continue;
      }
      if (!p.cleanWant && hasRats) {
        p.cleanWant = true;
        cleanNote(p, 'want');
      }
    }
  }
  function cleanAcceptStep() {
    if (s.clean) return;
    if (!s.rats.some(validRat)) return;
    for (const id of AUTO_ORDER) {
      const p = s.people[id];
      if (!p || !p.cleanAllow || p.cleanSuppress || p.motion.mode !== 'idle' || p.rest) continue;
      if (p.rest === 'manual' || p.pending === 'rest' || p.recall || T1.active(p) || TE.active(p) || H2.active(p)) continue;
      if (p.guardOrder != null || p.fix || cleaning(p) || patrolling(p)) continue;
      if (p.energy <= E.restAt) continue;
      p.cleanWant = false;
      cleanNote(p, 'go');
      s.clean = { by: p.id, phase: 'wait', target: null, downs: 0, spent: 0, end: null, tick: s.tick, src: 'auto' };
      p.cleanResult = null;
      p.cleanSrc = 'auto';
      clog(p, 'cleanOrder', { src: 'auto' });
      goClean(p);
      break;
    }
  }
  function setAutoClean(id, { allow } = {}) {
    const p = s.people[id];
    if (!p) return { ok: false, reason: '沒有這個工作者' };
    if (allow == null) return { ok: true, allow: p.cleanAllow };
    const bool = !!allow;
    if (bool) {
      const wasSuppressed = p.cleanSuppress, wasAllow = p.cleanAllow;
      p.cleanAllow = true;
      p.cleanSuppress = false;
      if (!wasAllow || wasSuppressed) {
        s.log.push({ tick: s.tick, person: id, kind: 'autoclean:allow', allow: true });
      }
      return { ok: true, text: '允許自主清鼠' };
    } else {
      p.cleanAllow = false;
      p.cleanSuppress = false;
      dropCleanWant(p, 'off');
      s.log.push({ tick: s.tick, person: id, kind: 'autoclean:allow', allow: false });
      if (s.clean && s.clean.by === id && s.clean.src === 'auto') {
        cancelClean(p);
      }
      return { ok: true, text: '不自主清鼠（仍可由玩家派遣）' };
    }
  }
  function cleanAutoView(p) {
    const hasRats = s.rats.some(validRat);
    const base = { allow: p.cleanAllow, wanting: wantsClean(p), suppressed: p.cleanSuppress };
    const say = (state, text) => ({ ...base, state, text });
    if (p.cleanSrc === 'auto' && s.clean && s.clean.by === p.id) {
      if (s.clean.phase === 'back') {
        if (p.cleanSuppress) return say('player', '玩家改令，取消自己出發的清理返院');
        return say('back', '清理結束，返回院中');
      }
      if (p.cleanSuppress) return say('player', '玩家改令，取消自己出發的清理');
      return say('go', '自己出發清理測試鼠（全場唯一處理者）');
    }
    if (p.cleanSrc === 'manual' && s.clean && s.clean.by === p.id) return say('manual', '玩家派遣清理中（不受自主開關影響）');
    if (s.clean && s.clean.by !== p.id) return say('peer', `${nameOf(s.clean.by)}已在清理，等待同伴`);
    if (!p.cleanAllow) return say('off', '尚未允許自主清鼠（仍可由玩家派遣）');
    if (p.cleanSuppress) return say('player', '受玩家改派抑制，這次不自己清鼠');
    if (p.rest === 'manual' || p.pending === 'rest') return say('held', '已停工：不自己清鼠');
    if (p.recall) return say('held', '玩家叫回中：不自己清鼠');
    if (p.guardOrder != null) return say('held', '正在驅離野豬：回院中後再評估');
    if (p.fix) return say('held', '正在整理護欄：回院中後再評估');
    if (!hasRats) return say('none', '範圍內沒有有效的測試鼠');
    if (p.motion.mode === 'carry') return say('wait', '本趟交付後自己去清理');
    if (p.motion.mode === 'toSeat' || p.motion.mode === 'seated') return say('wait', `先恢復到 ${rules.energy.backAt}，回院中自己去清理`);
    if (p.motion.mode === 'toFun' || p.motion.mode === 'fun' || p.motion.mode === 'fromFun') return say('wait', '回院中後自己去清理');
    if (p.cleanWant) return say('wait', '等待出發去清理');
    return say('watch', '觀察中：範圍內有測試鼠就想去清理');
  }
  const restLen = (p, bed) => bed ? H2.bedLen(bed) : seatLen(p.id);
  function goSeat(p) {
    // SG-HOME-02：寢舍可用時己床優先、否則依穩定順序認領空床；沒有床照原石凳。
    const bed = H2.bedFor(p);
    p.motion = { mode: 'toSeat', job: null, phase: null, steps: 0, need: walkSteps(p.level, restLen(p, bed), rules), tripLevel: p.level, ...(bed ? { bed } : {}) };
    s.log.push({ tick: s.tick, person: p.id, kind: 'toSeat', rest: p.rest });
  }
  // 休閒往返：出發時鎖空手速度算步數；活動本身沒有固定步數，有空位或玩家介入就結束。
  const funWalk = (p, mode) => ({ mode, job: null, phase: null, steps: 0, need: walkSteps(p.level, funLen(p.id), rules), tripLevel: p.level });
  function goFun(p) {
    p.funCap = false; p.why = `${JB[p.job].place}已滿，有空閒`;
    p.motion = funWalk(p, 'toFun');
    s.log.push({ tick: s.tick, person: p.id, kind: 'toFun', fun: prefs[p.id].id });
  }
  function leaveFun(p) {
    p.motion = funWalk(p, 'fromFun');
    s.log.push({ tick: s.tick, person: p.id, kind: 'fromFun' });
  }
  // 什麼讓人離開休閒：玩家停工、叫回，或原工作出現輪得到他的空位。空位先算給已在院中等／正在返院的人，
  // 剩下的依出發輪替順序分給休閒中的人；只有一個空位時只回一人，另一人繼續活動，慢的人也輪得到，不是誰先跑回來誰拿。
  // 這只決定誰起身回去，不是預約：到院仍照出發迴圈重查容量。
  const isFun = (m) => m === 'toFun' || m === 'fun';
  function slotFor(p) {
    const st = store(p.job);
    let free = (L2.capFor(p) ?? st.cap) - st.amount - st.inFlight; // SG-LIFE-02：方針者只看本輪上限 6
    if (free <= 0) return false;
    for (const id of ids) {
      const q = s.people[id];
      if (q.job === p.job && !q.rest && (q.motion.mode === 'idle' || q.motion.mode === 'fromFun')) free -= 1;
    }
    for (let n = 0; n < ids.length && free > 0; n++) {
      const q = s.people[ids[(s.nextPerson + n) % ids.length]];
      if (q.job !== p.job || q.rest || q.recall || !isFun(q.motion.mode)) continue;
      if (q === p) return true;
      free -= 1;
    }
    return false;
  }
  // 停工或待恢復（rest 非空）都要離開休閒；恢復自主只清叫回，不能讓待恢復的人卡在活動點。
  // LP-12：自主清鼠意願成立時亦離開休閒，沿 fromFun 返院後在院中端點重新查驗受理。
  const funOver = (p) => !!p.rest || p.recall || T1.gate(p) || TE.gate(p) || H2.gate(p) || p.guardOrder != null || !!p.fix || cleaning(p) || patrolling(p) || wants(p) || wantsUp(p) || wantsClean(p) || (thirsty(p) && s.vat >= D.cost) || slotFor(p);
  function goBack(p) {
    p.why = `精力恢復到 ${E.backAt}，自己回去`;
    const bed = p.motion.bed;
    p.motion = { mode: 'back', job: null, phase: null, steps: 0, need: walkSteps(p.level, restLen(p, bed), rules), tripLevel: p.level, ...(bed ? { bed } : {}) };
    s.log.push({ tick: s.tick, person: p.id, kind: 'back' });
  }

  // ---------- SG-LIFE-01 自主飲水 ----------
  const thirsty = (p) => THIRST && p.waterQ <= wq(D.want);
  const busyElse = (p) => p.guardOrder != null || !!p.fix || cleaning(p) || patrolling(p) || wants(p) || wantsUp(p) || wantsClean(p);
  function drinkNote(p, kind) {
    if (p.drinkNote === kind) return;
    p.drinkNote = kind;
    s.log.push({ tick: s.tick, person: p.id, kind: 'drink:' + kind, vat: s.vat, water: p.waterQ / WQ });
  }
  // 出發條件：院中閒著（不在恢復）或玩家停工坐著且精力已到 80；沒有護院／整理／清鼠／候補；水缸有實存。不預約：到點才扣。
  function drinkStep() {
    for (const id of ids) {
      const p = s.people[id], m = p.motion.mode;
      // 玩家取消過的那次：等他真的去做別的事（出發工作／護院／整理／清理／休閒）後才再想喝，不在院中來回切換。
      if (p.drinkHold) { if (m !== 'idle' && m !== 'seated' && !DRINK_MODES.includes(m)) p.drinkHold = false; else continue; }
      if (!thirsty(p) || busyElse(p)) continue;
      const home = m === 'idle' && !p.rest, seat = m === 'seated' && p.rest === 'manual' && p.energy >= E.backAt;
      if (!home && !seat) continue;
      if (TE.avail().water < D.cost) { drinkNote(p, 'dry'); continue; }
      const from = home ? 'home' : 'seat';
      p.drinkNote = null;
      p.motion = { mode: 'toDrink', job: null, phase: null, steps: 0, need: walkSteps(p.level, drinkLen(from, id), rules), tripLevel: p.level, from };
      s.log.push({ tick: s.tick, person: id, kind: 'toDrink', from, water: p.waterQ / WQ, vat: s.vat });
    }
  }
  // span＝要走回的比例（取消去程時只走回已走的那段）；畫面用同一比例取樣路線，不瞬移。
  function drinkBack(p, from, span) {
    p.motion = { mode: 'fromDrink', job: null, phase: null, steps: 0, need: walkSteps(p.level, drinkLen(from, p.id) * span, rules), tripLevel: p.level, from, span };
  }
  // 返回：從座位出發且仍停工就回座位坐著；否則回院中端點照常重查（恢復、指令、工作）。
  function endDrink(p) {
    const from = p.motion.from;
    s.log.push({ tick: s.tick, person: p.id, kind: 'drinkHome', from });
    if (from === 'seat' && p.rest === 'manual') { p.motion = { mode: 'seated', job: null, phase: null, steps: 0, need: null, tripLevel: p.level }; return; }
    // 從座位來、途中已解除停工：人在座位旁，沿座位路走回院中（不瞬移）。
    if (from === 'seat') { p.motion = { mode: 'back', job: null, phase: null, steps: 0, need: walkSteps(p.level, seatLen(p.id), rules), tripLevel: p.level }; return; }
    atHome(p);
  }
  // 玩家改令：去程或飲用中取消，沿已走的距離返回（不扣水缸、不加水分）；返回途中不受影響。
  function cancelDrink(p) {
    const h = p.motion;
    if (h.mode !== 'toDrink' && h.mode !== 'drink') return false;
    drinkNote(p, 'canceled'); p.drinkHold = true;
    drinkBack(p, h.from, h.mode === 'toDrink' ? Math.max(1, h.steps) / h.need : 1);
    return true;
  }

  function step() {
    s.tick += 1;
    // 舊背景扣水只在沒有飲水規則時保留（舊 fixture）；有飲水時水缸只因真喝水而減少。
    if (!D) {
      s.useMs += STEP_MS;
      if (s.useMs >= rules.useEveryMs) { s.useMs -= rules.useEveryMs; s.vat = Math.max(0, s.vat - 1); }
    }
    const sh = s.shadow;
    if (sh.active) {
      sh.steps += 1;
      if (sh.steps >= sh.need[sh.phase]) { sh.steps = 0; sh.phase += 1; if (sh.phase >= 4) { sh.active = false; sh.phase = null; } }
    }
    for (const id of ids) {
      const p = s.people[id], h = p.motion;
      // 每人每步只依步前活動計一次精力：工作扣、坐著回；走路、等待不變。之後才結算進度與轉場。
      if (h.mode === 'carry') p.energy = Math.max(0, p.energy - perTick(E.workPerSec));
      else if (h.mode === 'build') p.energy = Math.max(0, p.energy - perTick(E.workPerSec));
      else if (h.mode === 'fix') p.energy = Math.max(0, p.energy - perTick(rules.fix.workPerSec));
      else if (h.mode === 'seated') p.energy = Math.min(E.max, p.energy + perTick(E.restPerSec));
      if (THIRST) p.waterQ = Math.max(0, p.waterQ - Math.round(D.perSec * WQ * STEP_MS / 1000));
      if (h.mode === 'carry') {
        h.steps += 1;
        if (h.steps >= h.need[h.phase]) {
          h.steps = 0; h.phase += 1;
          if (h.phase >= 4) finishTrip(p);
        }
      } else if (h.mode === 'toSeat' || h.mode === 'back') {
        h.steps += 1;
        if (h.steps >= h.need) {
          if (h.mode === 'toSeat') { p.motion = { mode: 'seated', job: null, phase: null, steps: 0, need: null, tripLevel: p.level, ...(h.bed ? { bed: h.bed } : {}) }; s.log.push({ tick: s.tick, person: id, kind: 'seated', rest: p.rest }); }
          else atHome(p);
        }
      } else if (h.mode === 'seated') {
        h.steps += 1;
        if (p.rest === 'auto' && p.energy >= E.backAt) { p.rest = null; goBack(p); }
      } else if (h.mode === 'toFun' || h.mode === 'fromFun') {
        if (h.mode === 'toFun' && slotFor(p)) p.funCap = true;
        h.steps += 1;
        if (h.steps >= h.need) {
          if (h.mode === 'fromFun') atHome(p);
          else if (p.funCap || funOver(p)) leaveFun(p); // 去程中出現空位／叫回／停工：走完這段才回
          else { p.motion = { mode: 'fun', job: null, phase: null, steps: 0, need: null, tripLevel: p.level }; s.log.push({ tick: s.tick, person: id, kind: 'fun' }); }
        }
      } else if (h.mode === 'fun') {
        h.steps += 1; // 只給畫面換動作幀；不是計時獎勵
        if (funOver(p)) leaveFun(p);
      } else if (h.mode === 'toGuard' || h.mode === 'fromGuard') {
        h.steps += 1;
        if (h.steps >= h.need) { if (h.mode === 'fromGuard') { s.log.push({ tick: s.tick, person: id, kind: 'guardHome' }); atHome(p); } else arriveGuard(p); }
      } else if (h.mode === 'toFix' || h.mode === 'fromFix') {
        h.steps += 1;
        if (h.steps >= h.need) { if (h.mode === 'fromFix') { s.log.push({ tick: s.tick, person: id, kind: 'fixHome' }); atHome(p); } else arriveFix(p); }
      } else if (h.mode === 'fix') {
        // 動手：每 tick 推一格；做滿只記到期，效果等本 tick 野豬結算後才定（同 tick 看得見野豬就失效）。
        h.steps += 1;
        if (h.steps >= h.need) p.fixDue = true;
      } else if (h.mode === 'guardWait') {
        // 野豬到了護欄（準備撞）才喝止；還在嗅探／靠近就等它。看的是上一 tick 結束時的野豬。
        if (s.boar.mode === 'prep') { p.motion = { mode: 'shout', job: null, phase: null, steps: 0, need: msSteps(B.shoutMs), tripLevel: p.level }; s.log.push({ tick: s.tick, person: id, kind: 'shout' }); }
      } else if (h.mode === 'shout') {
        h.steps += 1;
        if (h.steps >= h.need) p.shoutDone = true; // 成效在本 tick 野豬結算時才判，不在這裡提高威脅
      } else if (h.mode === 'toDrink' || h.mode === 'fromDrink') {
        h.steps += 1;
        if (h.steps >= h.need) {
          if (h.mode === 'toDrink') { p.motion = { mode: 'drink', job: null, phase: null, steps: 0, need: msSteps(D.drinkMs), tripLevel: p.level, from: h.from }; s.log.push({ tick: s.tick, person: id, kind: 'drink' }); }
          else endDrink(p);
        }
      } else if (h.mode === 'drink') {
        // 飲滿 3 秒才結算；人物迴圈依固定 ids 順序，同 tick 只剩 1 份水時只有排前面的人成功。
        h.steps += 1;
        if (h.steps >= h.need) {
          if (TE.avail().water >= D.cost) { s.vat -= D.cost; p.waterQ = Math.min(wq(D.max), p.waterQ + wq(D.gain)); drinkNote(p, 'ok'); }
          else drinkNote(p, 'empty');
          drinkBack(p, h.from, 1);
        }
      } else if (MEET_MODES.includes(h.mode)) L2.move(p);
      else if (TRAIN_MODES.includes(h.mode)) T1.move(p);
      else if (TEA_MODES.includes(h.mode)) TE.move(p);
      else if (H2_MODES.includes(h.mode)) H2.move(p);
      else if (h.mode === 'idle' && !p.rest && p.energy <= E.restAt) atHome(p);
    }
    // LP-11：鼠移動→清理者移動／起手／接觸→察覺；回到院中的清理者在護院／整理判斷與出發迴圈之前就已重查生活。
    cleanStep();
    // SG-PATROL-01：林鼠移動→巡山者移動／觀察／出掌／喝止→林鼠察覺；到院者在護院／整理判斷與出發迴圈之前已重查生活。
    pt.step();
    // LP-07：人物結算後、原工作出發迴圈前，集中判意願與正式受理；回到院中端點的人先決定是否護院，才會接下一趟。
    wantStep();
    acceptStep();
    // LP-09：護院之後判整理候補與正式受理（同人 guard／fix 互斥；看得見野豬時整理本就不合法）。
    upWantStep();
    upAcceptStep();
    // LP-12：護院與整理之後判清鼠候補與正式受理（同人互斥；優先序為護院→整理→清鼠→一般工作）。
    cleanWantStep();
    cleanAcceptStep();
    // SG-LIFE-01：護院／整理／清鼠受理之後、下一趟出發之前，閒著（或停工坐著且精力已回 80）的口渴者先去喝水。
    if (THIRST) drinkStep();
    // SG-LIFE-02：補水輪上下限（實存 ≤3 啟動、≥6 結束）在出發迴圈前更新。
    L2.roundStep();
    // 空位少時輪流獲得下一個出發機會，避免滿缸後每次用水都被同一人搶走。
    const first = s.nextPerson;
    for (let n = 0; n < ids.length; n++) {
      const i = (first + n) % ids.length;
      if (depart(s.people[ids[i]])) s.nextPerson = (i + 1) % ids.length;
    }
    // 出發輪替之後才看閒暇：有合法容量一定先工作；只在實存滿時去休閒，僅在途占滿就留在院中等。
    for (const id of ids) {
      const p = s.people[id];
      if (p.motion.mode === 'idle' && !p.rest && !p.recall && p.guardOrder == null && !cleaning(p) && !patrolling(p) && !wants(p) && !wantsUp(p) && !wantsClean(p) && p.energy > E.restAt && prefs[id] && !T1.gate(p) && !TE.gate(p) && !H2.gate(p) && L2.leisureOk(p, stocked(p.job))) goFun(p);
    }
    // SG-LIFE-02：出發與休閒之後才看招呼（取消→推進→新發起）；有合法工作或必要自理一定先做。
    L2.step();
    H2.step(); // SG-HOME-02：有修繕意圖、院中有空才領料走去工地
    TE.step(); // HOME-01：有泡茶意圖、院中有空才走去茶座
    T1.step(); // SG-TRAIN-01：有目標、院中有空才走去練功樁

    // LIFE-V02：掌門全自動自走引擎
    if (autopilotActive && masterDisciple) {
      const lifeWorld = {
        tick: s.tick,
        day: Math.floor(s.tick / LIFE_V02_CONSTANTS.simulation.fullDayTicks) + 1,
        teaVat: s.vat,
        inventory: lifeInventory,
        facilities,
        housing,
        disciples: { [masterDisciple.id]: masterDisciple },
        lastSpeechBubble: s.lastSpeechBubble || null,
      };
      lifeAutopilot.step(lifeWorld, masterDisciple);
      s.lastSpeechBubble = lifeWorld.lastSpeechBubble;

      const hero = s.people.hero;
      if (hero) {
        if (masterDisciple.pos) {
          hero.lifePos = {
            x: masterDisciple.pos[0] ?? 962,
            y: masterDisciple.pos[1] ?? 512,
            face: (masterDisciple.pos[0] ?? 962) >= 962 ? 1 : -1,
          };
        }
        hero.decision = masterDisciple.decision;
        hero.carrying = masterDisciple.carrying;
      }
    }
    // 人的工作交付、移動與喝止進度都先結算完，最後才結算野豬（誘因看交付後的實存）。
    boarStep();
    // LP-08：野豬狀態確定後才判整理安全與完成；不改野豬自身的喝止／退走／碰撞先後。
    fixStep();
  }

  // ---------- LP-06 野豬 ----------
  const lure = () => s.vat > 0 || s.herbs > 0; // 只看實存，不看在途預約
  function boarLeg(mode, to, speed) {
    const b = s.boar;
    b.mode = mode; b.leg = { from: b.d, to }; b.steps = 0;
    b.need = Math.max(1, Math.ceil(Math.abs(to - b.d) / speed * 1000 / STEP_MS - 1e-9));
  }
  // 自行退走的原因（每個決策 tick 重看）：累了、害怕或院內已空。
  function fleeWhy() {
    const b = s.boar;
    if (b.e <= B.tiredAt * Q) return `累了（精力 ≤ ${B.tiredAt}）`;
    if (b.t >= B.scaredAt * Q) return `害怕（威脅 ≥ ${B.scaredAt}）`;
    if (!lure()) return '院內已空，沒有水／藥草氣味';
    return null;
  }
  function boarFlee(why) {
    const b = s.boar;
    b.active = false; b.why = why;
    boarLeg('flee', 0, B.flee);
    s.log.push({ tick: s.tick, kind: 'boar:flee', visit: b.visit, why });
    // 還沒出發的候補：意願過期（不是到場晚到）。先於 active=false 判斷會讀錯，所以直接比來訪編號。
    for (const id of ids) { const p = s.people[id]; if (p.want === b.visit) { p.want = null; note(p, 'expired'); } }
    // 目標退走：等著或喝止中的人晚到返院；還沒出發的清掉意圖；正在路上的到防守點再發現晚到。
    for (const id of ids) {
      const p = s.people[id];
      if (p.guardOrder !== b.visit) continue;
      const m = p.motion.mode;
      if (m === 'guardWait' || m === 'shout') { result(p, 'late'); leaveGuard(p); }
      else if (m !== 'toGuard') expireGuard(p);
    }
  }
  function boarStep() {
    const b = s.boar;
    if (b.mode === 'habitat') {
      b.e = Math.min(B.max * Q, b.e + perQ(B.restPerSec));
      b.t = Math.max(0, b.t - perQ(B.calmPerSec));
      if (b.e >= B.goEnergy * Q && b.t <= B.goThreat * Q && lure()) {
        b.visit += 1; b.active = true; b.hits = 0; b.why = '水／藥草氣味，精力夠、不害怕';
        boarLeg('out', boarLen.edge, B.approach);
        s.log.push({ tick: s.tick, kind: 'boar:out', visit: b.visit });
      }
      return;
    }
    if (b.mode === 'out' || b.mode === 'approach' || b.mode === 'flee') {
      b.e = Math.max(0, b.e - perQ(B.walkPerSec));
      b.steps += 1;
      b.d = b.leg.from + (b.leg.to - b.leg.from) * Math.min(1, b.steps / b.need);
      if (b.steps < b.need) return;
      b.d = b.leg.to;
      if (b.mode === 'out') { b.mode = 'sniff'; b.steps = 0; b.need = msSteps(B.sniffMs); b.leg = null; }
      else if (b.mode === 'approach') { b.mode = 'prep'; b.steps = 0; b.need = msSteps(B.hitMs); b.leg = null; s.log.push({ tick: s.tick, kind: 'boar:fence', visit: b.visit, e: b.e / Q }); }
      else { b.mode = 'habitat'; b.leg = null; b.steps = 0; b.need = 0; b.last = { visit: b.visit, hits: b.hits, why: b.why }; s.log.push({ tick: s.tick, kind: 'boar:home', visit: b.visit }); }
      return;
    }
    if (b.mode === 'sniff') {
      b.steps += 1;
      if (b.steps < b.need) return;
      // 嗅探完：院內已空就回棲地；否則沿路靠近，途中誘因消失也先走完這段到護欄再判。
      if (!lure()) boarFlee('院內已空，沒有水／藥草氣味');
      else boarLeg('approach', boarLen.total, B.approach);
      return;
    }
    // prep：在護欄外。先判自行退走（已逃就不能被喝止補成功），再判喝止完成（取消尚未接觸的這一下），最後才是到期接觸。
    const why = fleeWhy();
    if (why) { boarFlee(why); return; }
    const shouter = ids.map((id) => s.people[id]).find((p) => p.shoutDone && p.guardOrder === b.visit);
    if (shouter) {
      b.t = Math.min(B.max * Q, b.t + B.shoutThreat * Q);
      result(shouter, 'success');
      leaveGuard(shouter);
      boarFlee(`被${shouter.id === 'hero' ? '主角' : '熟手'}喝止，害怕`);
      return;
    }
    b.steps += 1;
    if (b.steps < b.need) return;
    b.e = Math.max(0, b.e - B.hitCost * Q);
    b.hits += 1;
    s.contact += 1; // LP-09：每次真接觸開一個新整理機會（封頂後仍開）
    const grew = b.marks < B.maxMarks;
    if (grew) b.marks += 1;
    s.log.push({ tick: s.tick, kind: 'boar:hit', visit: b.visit, marks: b.marks, grew, contact: s.contact });
    b.steps = 0;
    const after = fleeWhy();
    if (after) boarFlee(after);
  }

  // 改做某工作：當趟途中只記待執行（再下當趟的工作＝取消待執行）；閒置時立刻換並嘗試出發。
  // 休息流程中只更新要回去的工作：解除玩家停工，但仍要恢復到 80、走回院中才出發；不移動、不加精力。
  function work(p, job) {
    const name = JB[job].label, mode = p.motion.mode;
    cancelGuard(p); // 較新的改工作／開始取消尚未完成的驅離
    dropFix(p, 'canceled'); // 也取消尚未完成的整理；前往途中走完這段再回
    cancelClean(p); // 也取消清理；前往途中走完這段、起手／收勢中立刻返院
    pt.cancel(p); // 也召回巡山：前進中走完當前短段，其餘立刻沿原路返院
    if (DRINK_MODES.includes(mode)) {
      const cut = cancelDrink(p);
      p.job = job; p.pending = null;
      s.log.push({ tick: s.tick, person: p.id, kind: 'start', job });
      if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null;
      p.why = p.rest === 'auto' ? `已解除停工；精力未到 ${E.backAt}，先恢復` : null;
      return { ok: true, text: cut ? `沒喝完，先回院中${name}` : `喝完回院中後${name}` };
    }
    if (mode === 'carry') {
      if (job === p.motion.job) { p.pending = null; return { ok: true, text: `取消待執行，繼續${name}` }; }
      p.pending = job;
      return { ok: true, text: `本趟${JB[p.motion.job].label}交付後改去${name}`, pending: true };
    }
    p.job = job; p.pending = null;
    s.log.push({ tick: s.tick, person: p.id, kind: 'start', job });
    // 休閒中明確下工作＝叫回去做它；停工中的明確開始同時解除停工（LP-04 規則：只有明確開始能解除）。
    // 解除停工時精力未到 80，沿 LP-04 轉為自主恢復：走完本段、返院後先去座位恢復到 80，再回院做最新工作（叫回仍保留）。
    if (mode === 'toFun' || mode === 'fun' || mode === 'fromFun') {
      const r = recall(p, name);
      if (p.rest === 'manual') {
        if (p.energy < E.backAt) { p.rest = 'auto'; p.why = `已解除停工；精力未到 ${E.backAt}，先恢復`; return { ok: true, text: `回院中後先恢復到 ${E.backAt} 再${name}` }; }
        p.rest = null;
      }
      return r;
    }
    if (MEET_MODES.includes(mode)) {
      if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null;
      return { ok: true, text: `結束招呼，走回院中後${name}` };
    }
    if (H2_MODES.includes(mode)) {
      if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null;
      return { ok: true, text: `不修寢舍了：走回院中後${name}` };
    }
    if (TEA_MODES.includes(mode)) {
      if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null;
      return { ok: true, text: `不泡茶了：走回院中後${name}` };
    }
    if (TRAIN_MODES.includes(mode)) {
      if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null;
      return { ok: true, text: `停止練掌，走回院中後${name}` };
    }
    if (mode === 'back') {
      p.rest = null; p.why = null;
      return { ok: true, text: `正在回院中，到了就${name}` };
    }
    // 整理往返中：同驅離，只改要回去的工作；走完當前腿返院。
    if (FIX_MODES.includes(mode)) {
      p.job = job; p.pending = null;
      if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null;
      p.why = p.rest === 'auto' ? `已解除停工；精力未到 ${E.backAt}，先恢復` : null;
      return { ok: true, text: mode === 'toFix' ? `走到護欄後回院中${name}` : `回院中後${name}` };
    }
    // 清理往返中：只改要回去的工作；走完當前短段（或立刻收手）真返院後才做。
    if (CLEAN_MODES.includes(mode)) {
      p.job = job; p.pending = null;
      if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null;
      p.why = p.rest === 'auto' ? `已解除停工；精力未到 ${E.backAt}，先恢復` : null;
      return { ok: true, text: mode === 'toRat' ? `取消清理：走完這段後回院中${name}` : `回院中後${name}` };
    }
    if (PATROL_MODES.includes(mode)) {
      p.job = job; p.pending = null;
      if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null;
      p.why = p.rest === 'auto' ? `已解除停工；精力未到 ${E.backAt}，先恢復` : null;
      return { ok: true, text: `巡山召回：真回到院中後${name}` };
    }
    // 驅離往返中：只改要回去的工作；去防守點途中走完這段，等候／喝止中已立刻返院。停工中的明確開始照 LP-04 解除，未到 80 先恢復。
    if (GUARD_MODES.includes(mode)) {
      p.job = job; p.pending = null;
      if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null;
      p.why = p.rest === 'auto' ? `已解除停工；精力未到 ${E.backAt}，先恢復` : null;
      return { ok: true, text: mode === 'toGuard' ? `走到防守點後回院中${name}` : `回院中後${name}` };
    }
    if (mode === 'toSeat' || mode === 'seated') {
      const was = p.rest;
      p.rest = 'auto';
      if (mode === 'seated' && p.energy >= E.backAt) { p.why = null; p.rest = null; goBack(p); return { ok: true, text: `起身回院中，到了就${name}` }; }
      if (was === 'manual') p.why = `已解除停工；精力未到 ${E.backAt}，先恢復`;
      return { ok: true, text: `先恢復到 ${E.backAt} 再回去${name}` };
    }
    depart(p);
    return { ok: true, text: p.motion.mode === 'carry' ? `開始${name}，做完一趟自己接下一趟` : `改為${name}，等${JB[job].place}有空位再出發` };
  }

  // 叫回：保留（或剛改的）工作，實際走回院中；去程走完這段、活動中下一步起身、返院途中只記意圖。
  function recall(p, name = JB[p.job].label) {
    p.recall = true; p.why = '玩家叫回';
    dropFix(p, 'canceled'); // 有效叫回也取消待整理
    cancelClean(p); // 也取消尚未出發的清理
    pt.cancel(p);
    s.log.push({ tick: s.tick, person: p.id, kind: 'recall', job: p.job });
    const m = p.motion.mode;
    return { ok: true, text: m === 'toFun' ? `走到${prefs[p.id].place}後回院中${name}` : m === 'fun' ? `起身回院中${name}` : `回到院中就${name}；沒有空位就待命` };
  }
  function dispatch(cmd, id = 'hero') {
    // LIFE-V02 自定義事件與指令
    if (typeof cmd === 'object' && cmd !== null) {
      if (cmd.type === 'TOGGLE_AUTOPILOT') {
        autopilotActive = cmd.enabled !== undefined ? !!cmd.enabled : !autopilotActive;
        if (masterDisciple?.persona?.autopilot) {
          masterDisciple.persona.autopilot.enabled = autopilotActive;
        }
        return { ok: true, enabled: autopilotActive };
      }
      if (cmd.type === 'RING_BELL') {
        const lifeWorld = {
          tick: s.tick,
          day: Math.floor(s.tick / LIFE_V02_CONSTANTS.simulation.fullDayTicks) + 1,
          teaVat: s.vat,
          inventory: lifeInventory,
          facilities,
          housing,
          disciples: { [masterDisciple.id]: masterDisciple },
        };
        const res = lifeAutopilot.ringArtisanBell(lifeWorld, masterDisciple, cmd.facilityId || 'fac.hall');
        s.lastSpeechBubble = lifeWorld.lastSpeechBubble;
        return res;
      }
      if (cmd.type === 'INIT_PERSONA') {
        const payload = cmd.payload || {};
        if (payload.mode === 'preset') {
          const res = createPresetDisciple(payload.presetKey);
          if (!res.ok) return res;
          masterDisciple = res.master;
          recruitPool = res.recruitPool;
        } else {
          const res = createPersona(payload);
          if (!res.ok) return res;
          masterDisciple = res.disciple;
          recruitPool = createIconicRoster();
        }
        autopilotActive = true;
        if (masterDisciple.persona?.autopilot) {
          masterDisciple.persona.autopilot.enabled = true;
        }
        evaluateDestinyMilestones({ day: 1, facilities }, masterDisciple);
        return { ok: true, master: masterDisciple };
      }
    }

    const p = s.people[id];
    if (!p) return { ok: false, reason: '沒有這個工作者' };
    const a = actions(id).find((x) => x.id === cmd);
    if (!a) return { ok: false, reason: '沒有這個指令' };
    if (!a.enabled) return { ok: false, reason: a.reason };

    // Tier 1 玩家手動改派：主角暫時退出 Autopilot
    if (id === 'hero' && autopilotActive) {
      autopilotActive = false;
      if (masterDisciple?.persona?.autopilot) {
        masterDisciple.persona.autopilot.enabled = false;
      }
    }
    // SG-LIFE-02：玩家任何有效指令先取消此人所在的招呼（雙方釋放、各自走回）；改派／停工／巡山等退出自主補水方針。
    const metCanceled = L2.cancelBy(p);
    // SG-TRAIN-01：較新的任何有效指令都取消練掌目標與未完成單位（「練掌」本身是新目標，另處理）。
    if (cmd !== 'train') T1.cancelBy(p);
    // HOME-01：較新的任何有效指令取消泡茶（煮完前全退、煮完後不退料）；「泡茶」本身另處理。
    if (cmd !== 'tea') TE.cancelBy(p);
    // SG-HOME-02：較新的任何有效指令取消修寢舍（未領料全退；手上那捆帶回；已交料／工時留工地）；「修寢舍」本身另處理。
    if (cmd !== 'build') H2.cancelBy(p);
    if (cmd === 'buildCancel') return buildStop(p);
    if (cmd === 'teaCancel') return teaStop(p);
    if (cmd === 'trainCancel') return trainStop(p);
    if (['start', 'restAfterTrip', 'recall', 'guard', 'fix', 'clean', 'patrol', 'train', 'tea', 'build'].includes(cmd) || cmd.startsWith('work:')) L2.setFill(p, false);
    if (cmd === 'meetCancel') return { ok: true, text: metCanceled ? '取消這次招呼：兩人各自走回院中' : '沒有進行中的招呼' };
    if (cmd === 'fill') return fillOrder(p);
    // LP-07：以下有效指令（改工作／開始／停工／取消待執行／叫回）清該人候補並抑制本訪自主；拒絕的已在上面返回。
    if (['start', 'restAfterTrip', 'cancel', 'recall', 'fix', 'fixCancel', 'clean', 'cleanCancel', 'patrol', 'patrolCancel', 'fill', 'train', 'tea', 'build'].includes(cmd) || cmd.startsWith('work:')) override(p);
    // LP-09：同一批有效指令＋人工護院也清當人整理候補、抑制目前碰撞機會（與 LP07 的本訪抑制分開記）。
    if (['start', 'restAfterTrip', 'cancel', 'recall', 'fixCancel', 'guard', 'clean', 'cleanCancel', 'patrol', 'patrolCancel', 'train', 'tea', 'build'].includes(cmd) || cmd.startsWith('work:')) upOverride(p);
    // LP-12：有效人工改令撤當人清鼠候補並抑制自主清鼠直到明確重新允許。
    if (['start', 'restAfterTrip', 'cancel', 'recall', 'guard', 'fix', 'fixCancel', 'clean', 'cleanCancel', 'patrol', 'patrolCancel', 'train', 'tea', 'build'].includes(cmd) || cmd.startsWith('work:')) cleanOverride(p);
    // SG-LIFE-01：會改變去向的有效指令先取消未喝完的水（走回已走的那段），返院後照指令走。
    if (['restAfterTrip', 'guard', 'fix', 'clean', 'patrol'].includes(cmd)) cancelDrink(p);
    if (cmd === 'clean') return cleanOrder(p);
    if (cmd === 'train') return trainOrder(p);
    if (cmd === 'tea') return teaOrder(p);
    if (cmd === 'build') return buildOrder(p);
    if (cmd === 'patrol') return pt.order(p);
    if (cmd === 'patrolCancel') {
      const m = p.motion.mode, waiting = s.patrol.phase === 'wait';
      pt.cancel(p);
      return { ok: true, text: waiting ? '取消巡山：還沒出發，名額已釋放，原工作照舊' : m === 'patrolGo' ? '召回：走完這段後沿原路返院' : m === 'patrolWind' ? '召回：收手返院（這掌未出，已花 2 精力不退）' : '召回：沿原路返院' };
    }
    if (cmd === 'cleanCancel') {
      const m = p.motion.mode, waiting = s.clean.phase === 'wait';
      cancelClean(p);
      return { ok: true, text: waiting ? '取消清理：還沒出發，名額已釋放，原工作照舊' : m === 'toRat' ? '取消清理：走完這段後返院' : m === 'windup' ? '取消清理：收手返院（這掌未出，已花 2 精力不退）' : '取消清理：收勢後的結果保留，返院' };
    }
    if (cmd === 'upCancel') { upOverride(p); return { ok: true, text: '已取消這輪整理意願；下一次護欄被撞才再想' }; }
    if (cmd === 'fix') return fixOrder(p);
    if (cmd === 'fixCancel') {
      const m = p.motion.mode;
      dropFix(p, 'canceled');
      return { ok: true, text: m === 'toFix' ? '取消整理：走到護欄後直接返院' : m === 'fix' ? '取消整理：停手返院（這一階未完成，不清痕）' : '取消整理：原工作照舊' };
    }
    if (cmd === 'start') return work(p, p.motion.mode === 'carry' ? p.motion.job : p.job);
    if (cmd.startsWith('work:')) return work(p, cmd.slice(5));
    if (cmd === 'guard') return guard(p);
    if (cmd === 'restAfterTrip') {
      cancelGuard(p);
      dropFix(p, 'canceled');
      cancelClean(p);
      pt.cancel(p);
      const mode = p.motion.mode;
      if (mode === 'carry') { p.pending = 'rest'; return { ok: true, text: `本趟${JB[p.motion.job].label}交付後停工休息`, pending: true }; }
      p.rest = 'manual'; p.why = '玩家下令停工'; p.pending = null; p.recall = false;
      s.log.push({ tick: s.tick, person: p.id, kind: 'rest' });
      if (mode === 'idle') { goSeat(p); return { ok: true, text: '停工，走去座位休息' }; }
      if (mode === 'toFun') return { ok: true, text: `走到${prefs[p.id].place}後回院中，再去座位停工` };
      if (mode === 'fun' || mode === 'fromFun') return { ok: true, text: '回院中後去座位停工' };
      if (mode === 'back') return { ok: true, text: '走回院中後再回座位停工' };
      if (mode === 'toGuard') return { ok: true, text: '走到防守點後回院中，再去座位停工' };
      if (mode === 'fromGuard' || mode === 'fromFix' || mode === 'fix') return { ok: true, text: '回院中後去座位停工' };
      if (mode === 'toFix') return { ok: true, text: '走到護欄後回院中，再去座位停工' };
      if (mode === 'toRat') return { ok: true, text: '取消清理：走完這段後回院中，再去座位停工' };
      if (mode === 'fromDrink') return { ok: true, text: '從水缸回院中後去座位停工' };
      if (CLEAN_MODES.includes(mode) || PATROL_MODES.includes(mode)) return { ok: true, text: '回院中後去座位停工' };
      return { ok: true, text: '改為停工：回滿也不會自己開工' };
    }
    if (cmd === 'recall') return recall(p);
    if (cmd === 'resume') {
      p.recall = false;
      s.log.push({ tick: s.tick, person: p.id, kind: 'resume' });
      if (p.rest === 'auto') return { ok: true, text: `恢復自主：先恢復到 ${E.backAt}，之後有空位就做，滿了就去休閒` };
      p.why = null;
      return { ok: true, text: '恢復自主：有空位就做，滿了就去休閒' };
    }
    if (cmd === 'cancel') {
      p.pending = null;
      // 尚未生效（還沒走上防守路）的驅離也一起取消；已在走的路與停工不受影響。
      if (p.guardOrder != null && !guardBusy(p)) result(p, 'canceled');
      return { ok: true, text: s.boar.active ? '已取消待執行指令；這次野豬不再自己去' : '已取消待執行指令' };
    }
    return { ok: false, reason: '沒有這個指令' };
  }

  // SG-LIFE-02：選自主補水＝正式玩家指令。沿原工作入口（取消驅離／整理／清理／巡山、搬運中待交付生效）；休閒中不叫回，
  // 由補水輪決定何時起身。停工中選它＝明確開始，照 LP-04 解除（精力未到 80 先恢復）。
  function fillOrder(p) {
    L2.setFill(p, true);
    const m = p.motion.mode;
    if (m === 'toFun' || m === 'fun' || m === 'fromFun') {
      if (p.job !== 'water') { p.job = 'water'; s.log.push({ tick: s.tick, person: p.id, kind: 'start', job: 'water' }); }
      p.recall = false;
      if (p.rest === 'manual') { p.rest = p.energy < E.backAt ? 'auto' : null; }
      return { ok: true, text: `自主補水：實存 ≤${FILL.start} 補到 ${FILL.stop}；${L2.state.round ? '輪到就回院挑水' : '現在夠用，繼續自由活動'}（只本局，不存檔）` };
    }
    const r = work(p, 'water');
    if (!r.ok) return r;
    const lead = m === 'carry' && p.motion.job !== 'water' ? `本趟${JB[p.motion.job].label}交付後` : '';
    return { ok: true, text: `${lead}自主補水：實存 ≤${FILL.start} 補到 ${FILL.stop}，夠用就歇（只本局，不存檔）`, pending: r.pending };
  }
  // SG-TRAIN-01：練掌到熟練＝新有限人工目標。先立目標（出發／休閒閘立刻生效），再沿原 work() 合法邊界收尾舊事：
  // 搬運中這趟照原交付、驅離／整理／清理／巡山真返程、休閒叫回、停工解除（未到 80 先恢復）；喝水照喝完。
  function trainOrder(p) {
    const r0 = T1.order(p);
    if (!r0.ok) return r0;
    const m = p.motion.mode;
    if (DRINK_MODES.includes(m)) { if (p.recall) { p.recall = false; p.why = null; } /* review5638238207：喝水中承接舊工作叫回 */ if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null; return { ok: true, text: '喝完回院中後去練功樁' }; }
    const r = work(p, p.job);
    // 休閒中承接時 work() 走原 recall（起身真返程）；這個工作叫回旗標由練掌意圖消費，否則回院後 recall 與目標互擋（review P2①）。
    if (p.recall) { p.recall = false; p.why = null; }
    const lead = m === 'carry' ? `本趟${JB[p.motion.job || p.job].label}交付後` : r.text && /恢復/.test(r.text) ? `先恢復到 ${E.backAt} 再` : '';
    return { ok: true, text: `${lead}練掌到熟練：每 ${TRAIN.unitMs / 1000} 秒 1 單位、${TRAIN.units} 單位練熟（進度只本局；練熟結果沿原掌法欄位保存）` };
  }
  // HOME-01：泡茶＝有限人工目標。先核缺料／座位（拒絕不清舊意圖），再沿原 work() 合法邊界收尾舊事：搬運這趟先交付、
  // 驅離／整理／清理／巡山真返程、休閒叫回、停工解除（精力未到 80 先恢復）。舊存檔的喝水那趟照原喝完。
  function teaOrder(p) {
    const r0 = TE.order(p);
    if (!r0.ok) return r0;
    const m = p.motion.mode;
    if (DRINK_MODES.includes(m)) { p.recall = false; if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null; return { ok: true, text: '喝完回院中後去茶座' }; }
    const r = work(p, p.job);
    if (p.recall) { p.recall = false; p.why = null; }
    const lead = m === 'carry' ? `本趟${JB[p.motion.job || p.job].label}交付後` : r.text && /恢復/.test(r.text) ? `先恢復到 ${E.backAt} 再` : '';
    return { ok: true, text: `${lead}去茶座泡茶：水 ${TEA.water}＋藥草 ${TEA.herb}，煮 ${TEA.brewMs / 1000} 秒、喝 ${TEA.sipMs / 1000} 秒，精力 +${TEA.gain}（只本局）` };
  }
  // SG-HOME-02：修寢舍＝有限人工目標。先原子占工位＋預約缺料（拒絕不清舊意圖），再沿原 work() 合法邊界收尾舊事。
  function buildOrder(p) {
    const r0 = H2.order(p);
    if (!r0.ok) return r0;
    const m = p.motion.mode;
    if (DRINK_MODES.includes(m)) { p.recall = false; if (p.rest === 'manual') p.rest = p.energy < E.backAt ? 'auto' : null; return { ok: true, text: '喝完回院中後去寢舍工地' }; }
    const r = work(p, p.job);
    // 明確下令即解除停工（院中閒置停工的人也算）；精力未到 80 先恢復。
    if (p.rest === 'manual' && m !== 'carry') { p.rest = p.energy < E.backAt ? 'auto' : null; p.why = p.rest ? `已解除停工；精力未到 ${E.backAt}，先恢復` : null; }
    if (p.recall) { p.recall = false; p.why = null; }
    const lead = m === 'carry' ? `本趟${JB[p.motion.job || p.job].label}交付後` : r.text && /恢復/.test(r.text) ? `先恢復到 ${E.backAt} 再` : '';
    return { ok: true, text: `${lead}去修寢舍：${r0.need ? `從院倉領木 ${r0.need} 扛去工地，` : ''}木 ${SITE.wood}＋有效施工 ${SITE.workMs / 1000} 秒（每秒 −1 精力；只本局）` };
  }
  function buildStop(p) {
    p.rest = 'manual'; p.why = '玩家取消修寢舍：回院中待命'; p.pending = null; p.recall = false;
    s.log.push({ tick: s.tick, person: p.id, kind: 'rest' });
    if (p.motion.mode === 'idle') goSeat(p);
    return { ok: true, text: '取消修寢舍：未領的料退回、手上的料帶回院倉、已交的料與工時留工地；回院中待命' };
  }
  // 取消泡茶＝明確待命：從所在處走回院中，之後停工待命、不默恢復舊工作。
  function teaStop(p) {
    p.rest = 'manual'; p.why = '玩家取消泡茶：回院中待命'; p.pending = null; p.recall = false;
    s.log.push({ tick: s.tick, person: p.id, kind: 'rest' });
    if (p.motion.mode === 'idle') goSeat(p);
    return { ok: true, text: '取消泡茶：煮完前取消不扣料；回院中待命' };
  }
  // 停止練掌＝明確待命（review P2②）：練功／往返／待自理都依合法邊界返院（T1.cancelBy 已從原地走回），之後保持停工、不默恢復舊工作；
  // 進行中的舊搬運照原交付這趟後停工。已完成單位保留；再選工作／練掌／自主補水即重新開始。
  function trainStop(p) {
    const text = '停止練掌：未完成的單位不算，已完成單位保留；回院中待命';
    if (p.motion.mode === 'carry') { p.pending = 'rest'; return { ok: true, text: `本趟${JB[p.motion.job].label}交付後${text.slice(5)}`, pending: true }; }
    p.rest = 'manual'; p.why = '玩家停止練掌：回院中待命'; p.pending = null; p.recall = false;
    s.log.push({ tick: s.tick, person: p.id, kind: 'rest' });
    if (p.motion.mode === 'idle') goSeat(p);
    return { ok: true, text };
  }
  const guardBusy = (p) => ['toGuard', 'guardWait', 'shout'].includes(p.motion.mode);
  const nameOf = (id) => (id === 'hero' ? '主角' : id === 'cousin' ? '熟手' : id);
  // SG-PATROL-01：巡山者喝止時沿用同一 visit 的唯一處理名額（不搶別人的）。
  const assignee = () => (s.boar.active ? ids.find((id) => s.people[id].guardOrder === s.boar.visit) || (s.patrol && s.patrol.boarVisit === s.boar.visit ? s.patrol.by : null) : null);
  // 派遣驅離：只接受這次有效來訪；同一來訪最多一人；已在處理不重啟。工作／恢復中只記意圖，交付或恢復到 80 後目標仍在才出發。
  function guard(p) {
    p.guardOrder = s.boar.visit; p.guardResult = null; p.guardSrc = 'manual';
    if (p.want === s.boar.visit) p.want = null; // 玩家明派取代自己的候補；不算自主已嘗試
    s.log.push({ tick: s.tick, person: p.id, kind: 'guard', visit: p.guardOrder, src: 'manual' });
    for (const q of ids) if (q !== p.id) dropWant(s.people[q], 'peer');
    const m = p.motion.mode;
    if (m === 'idle') { atHome(p); return { ok: true, text: '去防守點驅離野豬' }; }
    if (m === 'carry') return { ok: true, text: `本趟${JB[p.motion.job].label}交付後去驅離（野豬還在才去）`, pending: true };
    if (m === 'toFun') return { ok: true, text: `走到${prefs[p.id].place}後回院中，再去驅離` };
    if (m === 'fun' || m === 'fromFun') return { ok: true, text: '回院中後去驅離' };
    if (m === 'toSeat' || m === 'seated') return { ok: true, text: `先恢復到 ${E.backAt}，野豬還在才去` };
    if (m === 'toGuard') return { ok: true, text: '繼續走向防守點' };
    return { ok: true, text: '回到院中就去驅離' };
  }

  function actions(id = 'hero') {
    const p = s.people[id];
    if (!p) return [];
    const carrying = p.motion.mode === 'carry';
    const cur = carrying ? p.motion.job : p.job;
    const stopped = p.rest === 'manual', fun = ['toFun', 'fun', 'fromFun'].includes(p.motion.mode);
    const guarding = GUARD_MODES.includes(p.motion.mode), g = guarding || p.guardOrder != null;
    const fixing = FIX_MODES.includes(p.motion.mode), f = fixing || !!p.fix || cleaning(p) || patrolling(p);
    const drinking = DRINK_MODES.includes(p.motion.mode), meeting = MEET_MODES.includes(p.motion.mode), trainingNow = TRAIN_MODES.includes(p.motion.mode);
    const teaNow = TEA_MODES.includes(p.motion.mode) || H2_MODES.includes(p.motion.mode);
    const inRest = p.motion.mode !== 'idle' && !carrying && !fun && !guarding && !fixing && !drinking && !meeting && !trainingNow && !teaNow && !CLEAN_MODES.includes(p.motion.mode) && !PATROL_MODES.includes(p.motion.mode);
    // 已在做這份工作、也沒有別的待執行時，再下同一工作沒有意義。
    const workOpt = (job) => {
      const name = JB[job].label;
      // 休息流程中下同一工作仍有意義：解除停工；自主恢復中則已會回去做它。
      // 驅離中（或已排定）下同一工作＝取消驅離、回來做它，仍有意義。
      // 整理中（或已排定）下同一工作＝取消整理、回來做它，也有意義，不能因同工作而卡死。
      const same = !stopped && !g && !f && job === cur && (carrying ? p.pending == null : true) && !L2.state.fill[p.id] && !T1.gate(p) && !TE.gate(p) && !H2.gate(p); // SG-TRAIN-01：練掌目標中按原工作＝明確改令，同理； SG-LIFE-02：方針中按同工作持續＝明確切回人工持續、退出方針，不算重複
      return { id: `work:${job}`, label: `${name}（持續）`,
        detail: carrying ? (job === cur ? `取消待執行，繼續${name}` : `本趟${JB[cur].label}交付後改去${name}`)
          : guarding ? `取消驅離，回院中${name}` : meeting ? `結束招呼，回院中${name}` : trainingNow ? `停止練掌，回院中${name}` : teaNow ? `不泡茶了，回院中${name}` : drinking ? (p.motion.mode === 'fromDrink' ? `喝完回院中後${name}` : `沒喝完，先回院中${name}`) : fixing ? `${p.fix ? '取消整理，' : ''}回院中${name}` : p.fix ? `取消整理，${name}` : inRest ? `恢復到 ${E.backAt} 並回院中後${name}` : fun ? `叫回院中改${name}` : '做完一趟自己接下一趟，沒有空位就等',
        enabled: !same && (p.pending !== job || L2.state.fill[p.id]), reason: p.pending === job ? `已排定交付後改去${name}` : fun ? '這是原工作：要回去請按「叫回工作」' : `已在持續${name}中` };
    };
    const lv = L2.view(p);
    return [
      workOpt('water'),
      workOpt('herb'),
      workOpt('wood'),
      ((r) => ({ id: 'build', label: `修寢舍（木 ${SITE.wood}＋${SITE.workMs / 1000} 秒）`, detail: `一個施工位：下令即占位並預約缺的木料，從院倉扛去工地；到位施工每秒 −1 精力，工時中斷保留。只本局`,
        enabled: !r, reason: r, hidden: H2.world().site.stage === 'done' && !H2.active(p) }))(H2.reason(p)),
      { id: 'buildCancel', label: '取消修寢舍', detail: '未領料：工位與預約全退；扛料途中：沿原路帶回院倉；已交料與工時留工地。之後回院中待命', enabled: H2.active(p), hidden: !H2.active(p), reason: '沒有修寢舍' },
      { id: 'fill', label: '自主補水（夠用就歇）', detail: `水缸實存 ≤${FILL.start} 才去補、補到 ${FILL.stop} 就自由活動；實存＋在途 ≥${FILL.stop} 不再出發。只本局，不存檔`,
        enabled: !lv.fill, reason: '已選自主補水：改派其他工作或停工即退出' },
      ((tv) => ({ id: 'train', label: '練掌到熟練（6 單位）', detail: `到練功樁練這一式：完整 ${TRAIN.unitMs / 1000} 秒算 1 單位，${TRAIN.units} 單位練熟（每秒 −1 精力；已 ${tv.units}／${TRAIN.units}）。進度只本局，練熟結果沿原掌法欄位保存`,
        enabled: !tv.adept && !tv.goal, reason: tv.adept ? '這一式已練熟（本包上限）' : '已在練掌：改派其他工作或停工即退出' }))(T1.view(p)),
      ((ev) => ({ id: 'tea', label: '泡茶（水 1＋藥草 1）', detail: `到茶座煮 ${TEA.brewMs / 1000} 秒、喝 ${TEA.sipMs / 1000} 秒，喝完精力 +${TEA.gain}（上限 ${E.max}）。可用：水 ${Math.max(0, ev.avail.water)}、藥草 ${Math.max(0, ev.avail.herb)}`,
        enabled: !ev.reason, reason: ev.reason }))(TE.view(p)),
      { id: 'teaCancel', label: '取消泡茶', detail: '煮好前取消：座位與預約全退、不扣料；煮好後取消：料不退、沒喝完沒有精力。之後回院中待命', enabled: TE.active(p), hidden: !TE.active(p), reason: '沒有泡茶' },
      { id: 'trainCancel', label: '停止練掌', detail: '未完成的單位不算，已完成單位保留；回院中待命', enabled: T1.active(p), hidden: !T1.active(p), reason: '沒有練掌目標' },
      { id: 'meetCancel', label: '取消招呼', detail: '兩人各自從所在處走回院中', enabled: !!lv.meet, hidden: !lv.meet, reason: '沒有進行中的招呼' },
      { id: 'start', label: `開始${JB[cur].label}（持續）`, detail: '恢復目前工作', hidden: true,
        enabled: stopped || p.pending != null, reason: `已在持續${JB[cur].label}中` },
      { id: 'recall', label: '叫回工作', detail: `回院中${JB[cur].label}；滿了就待命，做完一趟才解除`, hidden: !fun && !p.recall,
        enabled: fun && !p.recall && !stopped, reason: stopped ? '已停工：下令開始工作才解除' : p.recall ? '已叫回' : '不在休閒中' },
      { id: 'resume', label: '恢復自主', detail: '解除叫回：有空位就做，滿了可再去休閒；不解除停工', hidden: !p.recall,
        enabled: p.recall && !stopped, reason: stopped ? '停工中：恢復自主不能解除停工' : '沒有叫回' },
      { id: 'restAfterTrip', label: carrying ? '本趟後停工' : '停工休息', detail: carrying ? '這趟交付後去座位停工；不影響另一人' : '去座位坐著，回滿也不自己開工',
        enabled: !stopped && p.pending !== 'rest', reason: stopped ? '已停工' : '已下過這個指令' },
      { id: 'pourNow', label: '立即倒水', detail: '', enabled: false, hidden: cur !== 'water',
        reason: carrying && p.motion.phase >= 2 ? '還沒走到水缸' : '肩上是空桶：要先到泉水裝水' },
      { id: 'cancel', label: '取消待執行', detail: wants(p) ? '取消這次自己去護院的意願' : '', enabled: p.pending != null || (p.guardOrder != null && !guardBusy(p)) || wants(p), reason: stopped ? '停工已生效：下令開始工作才解除' : '沒有待執行指令', hidden: true },
      guardOpt(p, stopped),
      fixOpt(p),
      { id: 'fixCancel', label: '取消本次整理', detail: p.motion.mode === 'toFix' ? '走到護欄後直接返院；不清痕' : p.motion.mode === 'fix' ? '停手返院；這一階未完成、已花的時間精力不退' : '只取消整理，原工作／叫回／恢復照舊',
        enabled: !!p.fix, hidden: !p.fix, reason: '沒有未完成的整理' },
      cleanOpt(p),
      patrolOpt(p),
      { id: 'patrolCancel', label: '召回巡山', detail: p.motion.mode === 'patrolGo' ? '走完這段後沿原路返院' : p.motion.mode === 'patrolWind' ? '收手返院；這掌已花 2 精力不退' : s.patrol && s.patrol.phase === 'wait' ? '還沒出發：立即釋放名額，原工作照舊' : '沿原路返院',
        enabled: patrolling(p) && s.patrol.phase !== 'back' && !s.patrol.cancel, hidden: !patrolling(p), reason: patrolling(p) ? '已在返院：到院中才釋放名額' : '沒有巡山任務' },
      { id: 'cleanCancel', label: '取消清理', detail: p.motion.mode === 'toRat' ? '走完這段後返院' : p.motion.mode === 'windup' ? '收手返院；這掌已花 2 精力不退' : p.motion.mode === 'recover' ? '已接觸的結果保留，返院' : '還沒出發：立即釋放名額，原工作照舊',
        enabled: cleaning(p) && s.clean.phase !== 'back', hidden: !cleaning(p), reason: cleaning(p) ? '已在返院：到院中才釋放名額，不重複取消' : '沒有清理任務' },
      { id: 'upCancel', label: '取消整理意願', detail: '只取消這輪自己去整理的意願；不解除停工／叫回／恢復', enabled: wantsUp(p), hidden: !wantsUp(p), reason: '沒有整理意願' },
    ];
  }
  function patrolOpt(p) {
    const reason = pt.reason(p);
    return { id: 'patrol', label: '巡山一趟', detail: p.motion.mode === 'carry' ? '本趟交付後出西柵巡山（S0→S3），精力只夠返程就回' : '出西柵巡山（S0→S3）：看見林鼠出掌、靠近的野豬喝止，精力只夠返程就回',
      enabled: !reason, reason, hidden: false };
  }
  function cleanOpt(p) {
    const reason = cleanReason(p);
    return { id: 'clean', label: '清理測試鼠', detail: p.motion.mode === 'carry' ? '本趟交付後去西院清理（掌法，一掌起手扣 2 精力）' : '走去西院清理測試鼠（掌法，一掌起手扣 2 精力），結束後返院',
      enabled: !reason, reason, hidden: false };
  }
  function fixOpt(p) {
    const reason = fixReason(p);
    return { id: 'fix', label: '整理護欄', detail: p.motion.mode === 'carry' ? '本趟交付後走去護欄動手 8 秒，清一階損痕' : '走去護欄動手 8 秒（只這段扣 8 精力），清一階損痕後回院',
      enabled: !reason, reason, hidden: s.boar.marks <= 0 && !p.fix && !FIX_MODES.includes(p.motion.mode) };
  }
  function guardOpt(p, stopped) {
    const b = s.boar, who = assignee();
    const reason = !b.active ? (b.mode === 'flee' ? '野豬已在退走：這次來訪不能再派' : '野豬不在院外：沒有可驅離的來訪')
      : who === p.id ? '已在處理這次野豬（重送不重新出發）'
        : who ? `${nameOf(who)}已在處理；要換人先對${nameOf(who)}改工作或停工`
          : stopped ? '已停工：下令開始工作才解除' : p.pending === 'rest' ? '已排定本趟後停工'
            : p.fix || FIX_MODES.includes(p.motion.mode) ? '正在整理護欄（含返院）：先回院中再派驅離'
              : cleaning(p) ? '正在清理測試鼠（含返院）：先回院中再派驅離'
                : patrolling(p) ? '正在巡山（含返院）：巡山中看見靠近的野豬會自己喝止' : '';
    return { id: 'guard', label: '驅離野豬', detail: p.motion.mode === 'carry' ? '本趟交付後去防守點；野豬到護欄時喝止' : '走去防守點；野豬到護欄時喝止，已走就返院',
      enabled: !reason, reason, hidden: !b.active && p.guardOrder == null };
  }

  function phaseView(m) {
    if (!m.need || m.phase == null) return null;
    return { name: JB[m.job].phases[m.phase], k: Math.min(1, m.steps / m.need[m.phase]), steps: m.steps, ms: m.steps * STEP_MS };
  }
  function personView(p) {
    const h = p.motion, ph = phaseView(h), sp = speedsFor(p.level, rules);
    const job = h.mode === 'carry' ? h.job : p.job, st = store(p.job), place = JB[p.job].place;
    const stopped = p.rest === 'manual', name = JB[p.job].label, pref = prefs[p.id] || { place: '院中', doing: '休息' };
    const fun = h.mode === 'toFun' || h.mode === 'fun' || h.mode === 'fromFun';
    const status = h.mode === 'carry' ? PHASE_LABEL[ph.name]
      : h.mode === 'seated' ? (stopped ? '已停工，需下令開始' : '坐下恢復')
        : h.mode === 'toSeat' ? (stopped ? '走去休息（停工）' : '走去休息（精力低）')
          : h.mode === 'back' ? '返回院中'
            : h.mode === 'toFun' ? `去${pref.place}${pref.doing}`
              : h.mode === 'fun' ? pref.doing
                : h.mode === 'fromFun' ? '從休閒返院'
                  : GUARD_LABEL[h.mode] ? GUARD_LABEL[h.mode]
                  : FIX_LABEL[h.mode] ? FIX_LABEL[h.mode]
                  : DRINK_LABEL[h.mode] ? (h.mode === 'fromDrink' && p.drinkNote === 'canceled' ? '沒喝完，返回' : DRINK_LABEL[h.mode])
                  : PATROL_LABEL[h.mode] ? (h.mode === 'patrolGo' && s.patrol && s.patrol.cancel ? '已召回，走完這段' : PATROL_LABEL[h.mode])
                  : CLEAN_LABEL[h.mode] ? (h.mode === 'toRat' && s.clean && s.clean.phase === 'back' ? '清理已取消，走完這段' : CLEAN_LABEL[h.mode])
            : p.recall ? (st.amount + st.inFlight >= st.cap ? `玩家叫回，等${place}空位` : '玩家叫回，準備出發')
            : st.amount >= st.cap ? (p.job === 'herb' ? '等空位（藥架已滿，藥草不會自己耗用）' : '等用水（水缸已滿）')
              : st.amount + st.inFlight >= st.cap ? `等空位（${place}與在途已滿）` : '準備出發';
    const nextJob = p.pending && p.pending !== 'rest' ? p.pending : job;
    const E = rules.energy;
    // 下一步：把「為什麼停下」與「什麼時候、做什麼」講清楚；自主恢復與玩家停工不共用一句「休息中」。
    const guardNext = p.guardOrder != null && (h.mode === 'toGuard' ? '到防守點等野豬到護欄，再喝止' : h.mode === 'guardWait' ? '野豬到護欄就喝止／拍掌' : h.mode === 'shout' ? '喝止完成野豬就會逃' : null);
    const fixNext = h.mode === 'toFix' ? (p.fix ? '到護欄動手 8 秒，清一階損痕' : `整理已取消：走到護欄後回院中${name}`)
      : h.mode === 'fix' ? '做滿 8 秒且看不見野豬才清一階'
        : h.mode === 'fromFix' ? (stopped ? '到院中後回座位停工' : p.energy <= E.restAt ? `到院中後先去恢復到 ${E.backAt}` : `到院中重查${place}，有空位就${name}`)
          : p.fix === 'wait' ? (h.mode === 'carry' ? `交付後去整理護欄，回來${JB[nextJob].label}` : p.rest ? `先恢復到 ${E.backAt}，回院中再去整理護欄` : '回到院中就去整理護欄')
            : null;
    const cl = cleaning(p) ? s.clean : null, tgt = cl && cl.target;
    const cleanNext = h.mode === 'toRat' ? (cl.phase === 'back' ? '走完這段後返院' : `走到鼠${tgt}旁（掌距 ≤${PALM.reach}）再起手`)
      : h.mode === 'windup' ? `起手中：到點以最新位置重驗鼠${tgt}，仍在掌距才擊倒`
        : h.mode === 'recover' ? '收勢後換最近的有效目標，沒有就返院'
          : h.mode === 'fromRat' ? (stopped ? '到院中後回座位停工' : p.energy <= E.restAt ? `到院中後先去恢復到 ${E.backAt}` : `到院中重查${place}，有空位就${name}`)
            : cl && cl.phase === 'wait' ? (h.mode === 'carry' ? `交付後去清理測試鼠，回來${JB[nextJob].label}` : p.rest ? `先恢復到 ${E.backAt}，回院中再去清理` : '回到院中就去清理')
              : null;
    const drinkNext = h.mode === 'toDrink' ? `到水缸旁喝 ${D.drinkMs / 1000} 秒；到時水缸還有水才扣 ${D.cost}、水分 +${D.gain}`
      : h.mode === 'drink' ? `喝滿 ${D.drinkMs / 1000} 秒才結算（水缸 ${s.vat}）`
        : h.mode === 'fromDrink' ? (h.from === 'seat' && stopped ? '回座位繼續停工' : stopped ? '到院中後回座位停工' : h.from === 'seat' ? `回院中${name}` : `到院中重查${place}，有空位就${name}`)
          : null;
    const pv = pt.view(p);
    const patrolNext = !pv ? null : pv.phase === 'wait' ? (h.mode === 'carry' ? `交付後去巡山，回來${JB[nextJob].label}` : p.rest ? `先恢復到 ${E.backAt}，回院中再去巡山` : '回到院中就去巡山')
      : pv.phase === 'back' ? `返院（${PATROL_END[pv.end] || ''}）；到院後${stopped ? '回座位停工' : name}`
        : pv.cancel ? '走完這段就返院' : `往 ${pv.next} ${pv.nextLabel}；返程需 ${pv.returnNeed} 精力`;
    const next = patrolNext ? patrolNext : drinkNext ? drinkNext : cleanNext ? cleanNext : fixNext ? fixNext : guardNext ? guardNext
      : h.mode === 'fromGuard' ? (stopped ? '到院中後回座位停工' : `到院中重查${place}，有空位就${name}`)
      : h.mode === 'toGuard' ? `走到防守點後回院中${name}`
      : p.guardOrder != null && h.mode === 'carry' ? `交付後去驅離野豬，回來${JB[nextJob].label}`
      : wants(p) && h.mode === 'carry' ? '交付後在院中自己去護院（野豬還在、沒人處理才去）'
      : wantsUp(p) && h.mode === 'carry' ? `交付後${p.energy <= E.restAt ? `先恢復到 ${E.backAt}，再` : ''}在院中自己去整理護欄（看不見野豬、沒人整理才去）`
      : h.mode === 'carry'
      ? (p.pending === 'rest' ? '交付後去座位停工' : p.energy <= E.restAt ? `交付後精力 ≤ ${E.restAt}，去休息再回來${JB[nextJob].label}` : `交付後繼續${JB[nextJob].label}`)
      : h.mode === 'back' ? (stopped ? '到院中後回座位停工' : `到院中重查${place}，有空位就${name}`)
        : fun && stopped ? (h.mode === 'toFun' ? `走到${pref.place}後回院中，再去座位停工` : '回院中後去座位停工')
          : fun && p.rest === 'auto' ? `回院中後先去座位恢復至 ${E.backAt}，再${name}`
          : fun && (p.recall || p.funCap || !full(p.job)) && h.mode !== 'fun' ? (h.mode === 'toFun' ? `走到${pref.place}後回院中${name}` : `到院中重查${place}，有空位就${name}${p.recall ? '，滿了待命' : ''}`)
            : h.mode === 'toFun' ? `到了就${pref.doing}；${place}有空位會回去`
              : h.mode === 'fun' ? `${place}有空位就回去${name}；這是閒暇，不回精力`
        : stopped ? `已停工，需下令開始（回滿 ${E.max} 也不會自己去）`
          : h.mode === 'toSeat' || h.mode === 'seated' ? `恢復至 ${E.backAt} 後返回${name}`
            : p.recall && st.amount + st.inFlight >= st.cap ? `等${place}有空位再${name}；做完一趟才解除叫回，或按「恢復自主」`
              : st.amount + st.inFlight >= st.cap ? (st.amount >= st.cap ? `${place}已滿，去${pref.place}${pref.doing}` : `等${place}有空位再${name}（有人在補位）`) : `出發${name}`;
    const l2 = L2.view(p), t1 = T1.view(p), te = TE.view(p), h2 = H2.view(p);
    return {
      id: p.id, initialLevel: p.initialLevel, level: p.level, xp: p.xp, trips: p.trips, done: { ...p.done },
      job, jobLabel: JB[job].label, pending: p.pending, nextJob,
      nextNeed: p.level < rules.maxLevel ? rules.tripsToNext[p.level - 1] : null, maxLevel: rules.maxLevel,
      tripLevel: h.tripLevel, speeds: sp, tripSpeeds: speedsFor(h.tripLevel, rules), speedsInitial: speedsFor(p.initialLevel, rules),
      atCap: sp.empty >= rules.emptySpeed.cap && sp.load >= rules.loadSpeed.cap,
      // 下趟預計：用目前腳力、下一趟實際要走的工作路線（有待切換就用新工作）。本趟：出發時鎖定的步數。
      tripSeconds: tripNeed(p.level, nextJob).reduce((a, b) => a + b, 0) * STEP_MS / 1000,
      tripSecondsNow: h.mode === 'carry' ? h.need.reduce((a, b) => a + b, 0) * STEP_MS / 1000 : null,
      tripSecondsInitial: tripNeed(p.initialLevel, nextJob).reduce((a, b) => a + b, 0) * STEP_MS / 1000,
      lastTrip: p.lastTrip && { job: p.lastTrip.job, level: p.lastTrip.level, seconds: p.lastTrip.steps * STEP_MS / 1000 },
      mode: h.mode, phase: ph, status: (h2.mode && H2_LABEL[h2.mode]) || (h2.want && '待修寢舍') || (h.bed && h.mode === 'seated' ? (stopped ? `躺在 ${h.bed}（停工）` : '躺下恢復') : null) || (h.bed && h.mode === 'toSeat' ? `走去 ${h.bed}` : null) || (h.bed && h.mode === 'back' ? `起身離開 ${h.bed}` : null) || (te.mode && TEA_LABEL[te.mode]) || (te.want && '待泡茶') || t1.status || l2.status || status,
      tripProgress: h.mode === 'carry' ? (h.need.slice(0, h.phase).reduce((a, b) => a + b, 0) + h.steps) / h.need.reduce((a, b) => a + b, 0) : 0,
      restOrder: p.pending === 'rest', resting: stopped,
      energy: p.energy, energyMax: E.max, rest: p.rest, why: p.why, next: h2.next || te.next || t1.next || l2.next || next, life02: l2, train01: t1, tea: te, home02: h2, bed: h.bed || null, bedWhy: (h.mode === 'toSeat' || h.mode === 'seated') && !h.bed ? H2.bedWhy(p) : null,
      restLeg: h.mode === 'toSeat' || h.mode === 'back' ? { k: Math.min(1, h.steps / h.need), steps: h.steps, need: h.need } : null,
      pref: prefs[p.id] || null, recall: p.recall, leisure: fun,
      funLeg: h.mode === 'toFun' || h.mode === 'fromFun' ? { k: Math.min(1, h.steps / h.need), steps: h.steps, need: h.need } : null,
      funSteps: h.mode === 'fun' ? h.steps : 0,
      guardOrder: p.guardOrder, guardResult: p.guardResult, guarding: GUARD_MODES.includes(h.mode), guardSrc: p.guardSrc,
      auto: autoView(p), up: upView(p), fixSrc: p.fixSrc,
      guardLeg: h.mode === 'toGuard' || h.mode === 'fromGuard' ? { k: Math.min(1, h.steps / h.need), steps: h.steps, need: h.need } : null,
      shoutK: h.mode === 'shout' ? Math.min(1, h.steps / h.need) : 0,
      fix: p.fix, fixing: FIX_MODES.includes(h.mode), fixResult: p.fixResult,
      fixLeg: h.mode === 'toFix' || h.mode === 'fromFix' ? { k: Math.min(1, h.steps / h.need), steps: h.steps, need: h.need } : null,
      fixWork: h.mode === 'fix' ? { k: Math.min(1, h.steps / h.need), steps: h.steps, need: h.need } : null,
      // LP-11：位置只在清理中離開院中端點；palm 是比較 fixture。
      patrolling: PATROL_MODES.includes(h.mode), patrol: pv,
      cleaning: CLEAN_MODES.includes(h.mode), clean: cl ? { phase: cl.phase, target: cl.target, downs: cl.downs, spent: cl.spent, end: cl.end, src: cl.src } : null,
      cleanResult: p.cleanResult, pos: { x: p.pos.x, y: p.pos.y }, cface: p.cface, walked: p.walked,
      palm: p.palm, palmLabel: SKILLS[p.palm].label, palmTicks: { windup: SKILLS[p.palm].windup, recover: SKILLS[p.palm].recover },
      palmStep: ['windup', 'recover', 'patrolWind', 'patrolRec'].includes(h.mode) ? { k: Math.min(1, h.steps / h.need), steps: h.steps, need: h.need, target: h.target } : null,
      cleanLeg: h.mode === 'toRat' || h.mode === 'fromRat' ? { k: Math.min(1, h.steps / h.need), steps: h.steps, need: h.need, from: { ...h.from }, to: { ...h.to } } : null,
      // LP-12：自主清鼠原因與狀態。
      autoClean: cleanAutoView(p), cleanSrc: p.cleanSrc,
      // SG-LIFE-01：水分、口渴、喝水階段與最近結果（原因字串由模型給，畫面不另判）。
      water: D ? p.waterQ / WQ : null, waterMax: D ? D.max : null, thirsty: thirsty(p), drinking: DRINK_MODES.includes(h.mode),
      drinkFrom: DRINK_MODES.includes(h.mode) ? h.from : null, drinkNote: p.drinkNote, drinkText: drinkText(p),
      drinkLeg: DRINK_MODES.includes(h.mode) ? { k: h.need ? Math.min(1, h.steps / h.need) : 0, steps: h.steps, need: h.need, span: h.span ?? 1, from: h.from } : null,
    };
  }
  function drinkText(p) {
    if (!D) return null;
    const m = p.motion.mode, w = Math.floor(p.waterQ / WQ);
    if (m === 'toDrink') return `口渴（水分 ${w} ≤ ${D.want}），走去水缸`;
    if (m === 'drink') return `喝水中（${D.drinkMs / 1000} 秒）`;
    if (m === 'fromDrink') return DRINK_NOTE[p.drinkNote] || '喝完返回';
    if (thirsty(p)) {
      if (p.drinkHold) return '口渴：剛被玩家改令，先照指令做事，之後再去喝';
      if (s.vat < D.cost) return DRINK_NOTE.dry;
      if (busyElse(p)) return '口渴：先處理護院／整理／清鼠，回院中再喝';
      if (m === 'carry') return '口渴：交付這趟後先去喝水';
      if (p.rest === 'auto') return `口渴：先恢復到 ${E.backAt} 再去喝水`;
      if (p.rest === 'manual') return p.energy >= E.backAt ? '口渴：停工中，起身去喝' : `口渴：停工中，精力回到 ${E.backAt} 才起身喝`;
      return '口渴：回院中就去喝水';
    }
    if (p.drinkNote === 'ok') return `${DRINK_NOTE.ok}；水分 ≤ ${D.want} 才再想喝`;
    if (p.drinkNote === 'empty' || p.drinkNote === 'canceled') return DRINK_NOTE[p.drinkNote];
    return `不渴（水分 ≤ ${D.want} 才想喝）`;
  }
  // 自主護院原因：把「沒允許／觀察中／有意願待交付或恢復／玩家改派／同伴處理／已出發／結果／意願過期」分開講，不用一句「護院中」。
  function autoView(p) {
    const b = s.boar, v = b.visit, n = p.autoNote && p.autoNote.visit === v ? p.autoNote.kind : null, m = p.motion.mode;
    const base = { allow: p.autoAllow, react: p.react, reactLabel: REACT_LABEL[p.react], wanting: wants(p), suppressed: live() && p.suppress === v };
    const say = (state, text) => ({ ...base, state, text });
    if (p.guardSrc === 'auto' && p.guardOrder != null) return say('go', '自己出發護院（本訪唯一處理者）');
    if (p.guardSrc === 'manual' && p.guardOrder != null) return say('manual', '玩家派遣中（不受自主開關影響）');
    if (n === 'success') return say('success', '自己去喝止成功，野豬逃走');
    if (n === 'late') return say('late', '自己去了，到場時野豬已走（到場晚到）');
    if (wants(p)) {
      const why = p.react === 'early' ? '看見野豬靠近' : '本訪護欄被撞';
      return say('want', m === 'carry' ? `${why}，有意願：交付這趟後回院中再去（尚未占名額）`
        : p.rest === 'auto' ? `${why}，有意願：先恢復到 ${rules.energy.backAt} 再候補（尚未占名額）`
          : m === 'toFun' || m === 'fun' || m === 'fromFun' ? `${why}，有意願：走回院中再去（尚未占名額）` : `${why}，有意願：回到院中就去`);
    }
    if (n === 'expired') return say('expired', '意願過期：還沒出發野豬就走了（不是到場晚到）');
    if (n === 'peer' && live() && assignee()) return say('peer', `同伴處理：${nameOf(assignee() || '')}已正式出發／受派，不搶單`);
    if (live() && p.suppress === v) return say('player', '本訪由玩家改派，這次不自己搶回');
    // 已自己出發後被關閉／改令（tried 只在正式受理時記）；只取消意願的不說成取消出發。
    if ((n === 'off' || n === 'canceled') && p.tried === v) return say(n, n === 'off' ? '已關閉自主，取消自己出發的這次護院' : '玩家改令，取消自己出發的這次護院');
    if (!p.autoAllow) return say('off', '尚未允許自主護院（仍可由玩家派遣）');
    if (live() && p.tried === v) return say('tried', '這次來訪已自己出發過一次，不再自主受理');
    if (p.rest === 'manual' || p.pending === 'rest') return say('held', '已停工：不自己護院');
    if (p.recall) return say('held', '玩家叫回中：不自己護院');
    return say('watch', p.react === 'early' ? '觀察中：看見野豬靠近就想去' : '觀察中：本訪護欄被撞才想去');
  }
  // 自主整理原因：沒允許／沒有機會／觀察中／有意願待交付或恢復／等安全／玩家改派／本輪已用／出發／結果，分開講。
  function upView(p) {
    const n = p.upNote && p.upNote.opp === s.contact ? p.upNote.kind : null, m = p.motion.mode, c = s.contact, why = upBlocked(p);
    const base = { allow: p.upAllow, react: p.upReact, reactLabel: UP_REACT_LABEL[p.upReact], wanting: wantsUp(p), opp: c, used: c > 0 && s.upUsed === c };
    const say = (state, text) => ({ ...base, state, text });
    if (p.fix && p.fixSrc === 'auto') return say('go', '自己去整理護欄（本輪唯一自主受理）');
    if (p.fix && p.fixSrc === 'manual') return say('manual', '玩家派去整理中（不受自主開關影響）');
    const r = p.fixResult && p.fixResult.src === 'auto' && n && n === p.fixResult.kind ? n : null;
    if (r === 'done') return say('done', '自己整理完一階，回去生活；本輪不再整理');
    if (r === 'threat') return say('threat', '自己整理時看見野豬，中止返院；本輪不重試');
    if (r === 'canceled') return say('canceled', '玩家改令，取消自己出發的這次整理；本輪不重試');
    if (n === 'off' && p.fixResult && p.fixResult.src === 'auto') return say('off', '已關閉自主整理，取消自己出發的這次整理');
    if (wantsUp(p)) {
      const lead = p.upReact === 'early' ? '護欄有損痕' : '損痕累積到 3 階';
      return say('want', why === 'threat' ? `${lead}，有意願：看得見野豬，等牠離開視線（尚未占名額）`
        : why === 'peer' ? `${lead}，有意願：等${nameOf(s.fixBy)}這次整理結束（尚未占名額）`
          : why === 'guard' ? `${lead}，有意願：先處理野豬（尚未占名額）`
            : m === 'carry' ? `${lead}，有意願：交付這趟後回院中再去（尚未占名額）`
              : p.rest === 'auto' ? `${lead}，有意願：先恢復到 ${rules.energy.backAt} 再去（尚未占名額）`
                : m === 'toFun' || m === 'fun' || m === 'fromFun' ? `${lead}，有意願：走回院中再去（尚未占名額）` : `${lead}，有意願：回到院中就去（尚未占名額）`);
    }
    if (!p.upAllow) return say('off', '尚未允許自主整理（仍可由玩家派遣）');
    const cond = p.upReact === 'early' ? '護欄有損痕就想去' : '損痕到 3 階才想去';
    if (c <= 0) return say('none', `還沒有真碰撞：沒有整理機會（之後${cond}）`);
    if (why === 'player') return say('player', '本輪由玩家改令，下一次護欄被撞才再想去');
    if (why === 'used') return say('used', n === 'manual' || n === 'used' ? '本輪已有人受理整理（玩家或同伴），下一次護欄被撞才再想' : '本輪已處理過，下一次護欄被撞才再想');
    if (why === 'held') return say('held', p.recall ? '玩家叫回中：不自己整理' : '已停工：不自己整理');
    if (why === 'clean') return say('clean', '護欄沒有損痕');
    if (why === 'threat') return say('threat', '看得見野豬：安全後才想去整理');
    return say('watch', `觀察中：${cond}（現在 ${s.boar.marks} 階）`);
  }
  function boarView() {
    const b = s.boar, e = b.e / Q, t = b.t / Q, lured = lure();
    // 原因：為什麼來、為什麼走、為什麼還留在棲地。不提供任何「下次襲擊」倒數。
    const stay = b.mode !== 'habitat' ? null
      : [e < B.goEnergy ? `精力未到 ${B.goEnergy}` : null, t > B.goThreat ? `還記得威脅（> ${B.goThreat}）` : null, !lured ? '院內水缸與藥架都空，沒有氣味' : null].filter(Boolean);
    return {
      mode: b.mode, label: BOAR_MODE[b.mode], energy: e, threat: t, max: B.max, d: b.d, edge: boarLen.edge, total: boarLen.total,
      legK: b.need ? Math.min(1, b.steps / b.need) : 0, prepK: b.mode === 'prep' ? Math.min(1, b.steps / b.need) : 0, sniffK: b.mode === 'sniff' ? Math.min(1, b.steps / b.need) : 0,
      visit: b.visit, active: b.active, hits: b.hits, marks: b.marks, maxMarks: B.maxMarks, lure: lured, assignee: assignee(), last: b.last,
      seen: boarSeen(), fixBy: s.fixBy, contact: s.contact, upUsed: s.contact > 0 && s.upUsed === s.contact,
      why: b.mode === 'habitat' ? (stay.length ? `留在棲地：${stay.join('、')}` : '條件都到了') : b.why,
    };
  }
  function view() {
    const people = Object.fromEntries(ids.map((id) => [id, personView(s.people[id])]));
    return {
      // 舊局部檢查的頂層人物欄位仍指主角；新介面使用 people[id]，共用資料只存在這一層。
      ...people.hero,
      tick: s.tick, seconds: s.tick * STEP_MS / 1000,
      vat: s.vat, vatCapacity: rules.vatCapacity, inFlight: s.inFlight,
      herbs: s.herbs, herbCapacity: rules.herbCapacity, herbInFlight: s.herbInFlight, people,
      shadow: s.shadow.active ? phaseView(s.shadow) : null,
      boar: boarView(),
      rats: s.rats.map((r) => ({ id: r.id, kind: r.kind, mode: r.mode, label: RAT_MODE[r.mode], x: r.x, y: r.y, valid: validRat(r), why: r.why })),
      clean: s.clean ? { ...s.clean } : null,
      prats: s.prats.map((r) => ({ id: r.id, kind: r.kind, mode: r.mode, label: RAT_MODE[r.mode], x: r.x, y: r.y, valid: pt.validPrat(r), why: r.why })),
      patrol: s.patrol ? { by: s.patrol.by, phase: s.patrol.phase, end: s.patrol.end, seen: Object.entries(s.patrol.seen).map(([id, x]) => ({ id, kind: x.kind, res: x.res })) } : null,
      patrolReport: s.patrolReport ? JSON.parse(JSON.stringify(s.patrolReport)) : null, patrolLog: s.patrolLog.map((x) => ({ ...x })),
      log: s.log.slice(-5), drinkRules: D ? { ...D } : null, thirst: THIRST,
      teaEvents: TE.events(), teaAvail: TE.avail(), teaSeat: TE.state.seat,
      home02: H2.world(),
      life: {
        autopilotActive,
        master: masterDisciple ? {
          id: masterDisciple.id,
          name: masterDisciple.name,
          originMode: masterDisciple.originMode,
          destinyTreeId: masterDisciple.destinyTreeId,
          daoTitle: masterDisciple.persona?.daoTitle || '清微持中',
          natalPoem: masterDisciple.persona?.natalPoem || [],
          heartSeal: masterDisciple.persona?.heartSeal || { code: 0b110 },
          innateStats: masterDisciple.innateStats,
          unlockedArts: masterDisciple.unlockedArts || [],
          explain: masterDisciple.decision?.explain || { doing: '待命', reason: '等待指令', nextPlan: '無' },
          carrying: masterDisciple.carrying,
        } : null,
        facilities: {
          hall: facilities['fac.hall'],
          dorm: facilities['fac.dorm.a'],
        },
        inventory: lifeInventory,
        housing,
        speechBubble: s.lastSpeechBubble || null,
        recruitPool: recruitPool.map((r) => ({ id: r.id, name: r.name, availableForRecruit: r.availableForRecruit })),
      },
    };
  }
  // SG-LIFE-01 手動存讀：權威狀態全在 s；匯出為深拷貝（紀錄只留最近 logKeep 筆，規則與還原都不讀紀錄）。
  // restore 只整份替換（呼叫端須先完整驗證）；不推進 tick、不結算任何獎勵。
  function exportState(logKeep = 200) {
    const out = JSON.parse(JSON.stringify(s));
    out.log = out.log.slice(-logKeep);
    return out;
  }
  function restore(next) {
    const copy = JSON.parse(JSON.stringify(next));
    for (const k of Object.keys(s)) delete s[k];
    Object.assign(s, copy);
  }
  return {
    state: s, patrol: pt, life02: L2, train01: T1, tea: TE, home02: H2,
    life: {
      broker: lifeBroker,
      toilPipeline: lifePipeline,
      autopilot: lifeAutopilot,
      smartObjects: lifeSmartObjects,
      get master() { return masterDisciple; },
      get facilities() { return facilities; },
      get inventory() { return lifeInventory; },
      get housing() { return housing; },
      get autopilotActive() { return autopilotActive; },
      setAutopilot: (val) => {
        autopilotActive = !!val;
        if (masterDisciple?.persona?.autopilot) masterDisciple.persona.autopilot.enabled = autopilotActive;
      },
      initPersona: (payload) => dispatch({ type: 'INIT_PERSONA', payload }),
      ringBell: (facId) => dispatch({ type: 'RING_BELL', facilityId: facId }),
    },
    step, dispatch, assignBed: (bed, pid) => H2.assign(bed, pid), actions, view, setAuto, setUpkeep, setPalm, setAutoClean, pathLength, lengths, rules, exportState, restore
  };
}

// 牆鐘只決定餵幾步；長空檔最多算250ms，不追趕背景時間。
export function createClock({ maxFrameMs = 250 } = {}) {
  let acc = 0;
  return {
    feed(dtMs, speed) {
      acc += Math.min(maxFrameMs, Math.max(0, dtMs)) * speed;
      const n = Math.floor(acc / STEP_MS + 1e-9);
      acc -= n * STEP_MS;
      return n;
    },
    clear() { acc = 0; },
  };
}
