import { NEW_TRAITS } from './hero-data.mjs';
// 資料驅動定義：地圖節點、設施階段、活動、武學、角色。改數值只動這裡。
// v0.5：座標＝SCENE04 母版 MU（1280×720）×1.25，路網沿母版 routes（挑水/遠採藥/巡山/村路）與院南口 portal
export const WORLD = { w: 1600, h: 900 };
export const MAPS = { S0: 'map_s0', S1: 'map_s1', S2: 'map_s2' };
export const NODES = {
  hall: [1125, 340],
  court: [1038, 394],
  yard: [1175, 419],
  dormP: [960, 319],
  dorm: [931, 210],
  mid: [950, 431],
  kitchen: [800, 362],
  south: [960, 506],
  s1: [965, 569],
  s2: [931, 631],
  s3: [894, 681],
  g1: [862, 700],
  g2: [750, 694],
  g3: [625, 656],
  forest: [456, 665],
  forest2: [412, 631],
  g4: [375, 681],
  g5: [300, 738],
  g6: [269, 812],
  herb: [281, 875],
  e1: [1062, 572],
  e2: [1150, 588],
  veg: [1200, 515],
  e3: [1250, 644],
  e4: [1350, 644],
  e5: [1431, 625],
  v1: [1412, 700],
  v2: [1450, 800],
  gate: [1475, 875],
  e6: [1475, 525],
  trail1: [1494, 438],
  t2a: [1538, 362],
  trail2: [1550, 275],
  t3: [1500, 181],
  t4: [1412, 125],
  guard: [1344, 148],
  t5: [1344, 88],
  t6: [1412, 50],
  den: [1475, 22],
  quarry: [560, 770],
  shed: [1080, 486],
};
export const EDGES = [['hall', 'court'], ['court', 'yard'], ['court', 'dormP'], ['dormP', 'dorm'], ['court', 'mid'], ['mid', 'kitchen'], ['mid', 'south'], ['south', 's1'], ['s1', 's2'], ['s2', 's3'], ['s3', 'g1'], ['g1', 'g2'], ['g2', 'g3'], ['g3', 'forest'], ['forest', 'g4'], ['g4', 'g5'], ['g5', 'g6'], ['g6', 'herb'], ['forest', 'forest2'], ['s1', 'e1'], ['e1', 'e2'], ['e2', 'e3'], ['e3', 'e4'], ['e4', 'e5'], ['e5', 'v1'], ['v1', 'v2'], ['v2', 'gate'], ['e2', 'veg'], ['e5', 'e6'], ['e6', 'trail1'], ['trail1', 't2a'], ['t2a', 'trail2'], ['trail2', 't3'], ['t3', 't4'], ['t4', 'guard'], ['guard', 't5'], ['t5', 't6'], ['t6', 'den'], ['g3', 'quarry'], ['south', 'shed']];

// 設施：每階段宣告提供的活動（smart object）。stage 0 = 荒廢/空地。
export const FACILITIES = [
  { id: 'hall', name: '大廳', node: 'hall', stages: [
    { name: '破道館', sprite: 'hall_s0', offers: ['rest', 'learn'], restRate: 3, beds: 3, learnDur: 8 },
    { name: '大廳', sprite: 'hall_s1', offers: ['rest', 'learn'], restRate: 4, beds: 2, learnDur: 4, cost: { wood: 12, stone: 6, coin: 6 }, work: 30, rep: 20 },
    { name: '正殿', sprite: 'hall_s1', offers: ['rest', 'learn'], restRate: 5, beds: 2, learnDur: 3, cost: { wood: 16, stone: 10, coin: 60 }, rare: { tiemu: 2 }, work: 40, rep: 40 }, // v1.9 I-2 三階：名聲＋巡山遠段稀有料
    { name: '大殿', sprite: 'hall_s1', offers: ['rest', 'learn'], restRate: 6, beds: 3, learnDur: 2, cost: { wood: 20, stone: 14, coin: 120 }, rare: { tiemu: 3, lingshi: 2 }, work: 50, rep: 70 },
  ] },
  { id: 'yard', name: '外功場', node: 'yard', stages: [
    { name: '空地', sprite: null, offers: ['train', 'meditate'], trainMul: 1 },
    { name: '木樁場', sprite: null, offers: ['train', 'spar', 'meditate'], trainMul: 1.6, dummies: 3, cost: { wood: 6 }, work: 15 },
    { name: '演武場', sprite: null, offers: ['train', 'spar', 'meditate'], trainMul: 1.8, dummies: 4, cost: { wood: 12, stone: 8, coin: 40 }, rare: { tiemu: 2 }, work: 30, rep: 30 },
    { name: '演武廣場', sprite: null, offers: ['train', 'spar', 'meditate'], trainMul: 2.0, dummies: 5, cost: { wood: 14, stone: 12, coin: 90 }, rare: { tiemu: 2, lingshi: 1 }, work: 40, rep: 60 },
  ] },
  { id: 'dorm', name: '宿舍', node: 'dorm', stages: [
    { name: '破寢舍', sprite: 'dorm_s0', offers: [] },
    { name: '小寢舍', sprite: 'dorm_s1', offers: ['rest'], restRate: 8, beds: 2, cost: { wood: 6 }, work: 18 },
    { name: '宿舍', sprite: 'dorm_s1', offers: ['rest'], restRate: 8, beds: 6, cost: { wood: 10, stone: 4 }, work: 24, rep: 12 },
    { name: '大通鋪', sprite: 'dorm_s1', offers: ['rest'], restRate: 8, beds: 10, cost: { wood: 16, stone: 8, coin: 40 }, work: 30, rep: 10 }, // v1.85 I-5：plain 能收到 10 人以上
  ] },
  { id: 'kitchen', name: '膳房', node: 'kitchen', stages: [
    { name: '露天灶', sprite: 'vat', offers: ['cook', 'eat'], cookDur: 12, cookYield: 3, mealBonus: 0 },
    { name: '膳房', sprite: 'kitchen_s1', offers: ['cook', 'eat'], cookDur: 6, cookYield: 4, mealBonus: 15, cost: { wood: 8 }, work: 20 },
    { name: '大膳房', sprite: 'kitchen_s1', offers: ['cook', 'eat'], cookDur: 5, cookYield: 5, mealBonus: 18, cost: { wood: 12, stone: 6, coin: 40 }, rare: { tiemu: 1 }, work: 26, rep: 25 },
  ] },
  { id: 'veg', name: '菜園', node: 'veg', stages: [{ name: '荒地菜畦', sprite: 'grass', offers: ['farm'], plots: 4 }] },
  { id: 'herb', name: '藥園', node: 'herb', stages: [{ name: '野藥圃', sprite: 'herb', offers: ['forage'] }] },
  { id: 'forest', name: '林緣枯木', node: 'forest2', stages: [{ name: '枯木', sprite: 'log', offers: ['chop'] }] },
  { id: 'quarry', name: '後山石場', node: 'quarry', stages: [{ name: '亂石坡', sprite: null, offers: ['quarry'] }] },
  { id: 'shed', name: '工寮', node: 'shed', stages: [
    { name: '空地', sprite: null, offers: [], laborBeds: 0 },
    { name: '工寮', sprite: 'dorm_s0', offers: ['rest'], restRate: 6, laborBeds: 2, laborOnly: true, cost: { wood: 6 }, work: 16 },
    { name: '大工寮', sprite: 'dorm_s1', offers: ['rest'], restRate: 7, laborBeds: 4, laborOnly: true, cost: { wood: 8, stone: 6, coin: 4 }, work: 22, rep: 10 },
  ] },
  { id: 'store', name: '院倉', node: 'court', stages: [{ name: '柴堆', sprite: 'woodpile', offers: ['chat', 'leisure'] }] },
];

// 活動：時間、需求變化、技能經驗、產出
export const ACTIVITIES = {
  rest:   { name: '歇息', dur: 10, need: { energy: 'rate' } },
  eat:    { name: '用飯', dur: 5, use: { food: 1 }, need: { hunger: 60 } },
  farm:   { name: '種菜', dur: 8, energy: -8, skill: { farming: 6 } }, // 播種或收成，見 sim plots
  cook:   { name: '煮飯', dur: 0, energy: -3, skill: { cooking: 6 } }, // dur 由灶階段決定
  forage: { name: '採藥', dur: 8, energy: -6, skill: { herbal: 6 }, carry: { herb: 1 } },
  quarry: { name: '採石', dur: 10, energy: -9, skill: { strength: 6 }, carry: { stone: 1 } },
  chop:   { name: '砍柴', dur: 8, energy: -8, skill: { strength: 5 }, carry: { wood: 1 } },
  train:  { name: '練功', dur: 10, energy: -10, skill: { style: 5 } }, // style＝弟子主修路數
  meditate: { name: '打坐衝關', dur: 12, energy: -8 },
  spar:   { name: '切磋', dur: 8, energy: -10, skill: { style: 4 } },
  learn:  { name: '聽師父講武', dur: 8, energy: -2, skill: { palm: 3 }, social: 10 },
  build:  { name: '施工', dur: 6, energy: -6, skill: { strength: 2 } },
  chat:   { name: '聊天', dur: 6, social: 35, fun: 20 },
  encourage: { name: '鼓勵同門', dur: 6, social: 20 },
  leisure: { name: '閒坐看雲', dur: 8, fun: 45, energy: 3 },
  deliver: { name: '送回院倉', dur: 0 },
};

// 武學：熟練門檻解鎖；範圍/冷卻/傷害由 palm 技能放大
export const MOVES = [
  { id: 'fist', skill: 'palm', name: '基礎拳', req: 0, range: 34, cd: 1.0, dmg: 4, aoe: 0, color: '#8a6a4a' },
  { id: 'push', skill: 'palm', name: '推山掌', req: 25, range: 60, cd: 1.6, dmg: 8, aoe: 0, color: '#b0482e' },
  { id: 'wave', skill: 'palm', name: '迴風掌', req: 60, range: 80, cd: 3.0, dmg: 7, aoe: 70, color: '#3d6b8a' },
  { id: 'kick', skill: 'leg', name: '掃堂腿', req: 20, range: 40, cd: 1.4, dmg: 6, aoe: 40, color: '#6b8a3d' },
  { id: 'whirl', skill: 'leg', name: '旋風腿', req: 50, range: 55, cd: 2.4, dmg: 9, aoe: 60, color: '#8a3d7a' },
  { id: 'storm', skill: 'palm', name: '風雷掌腿', req: 999, range: 90, cd: 3.4, dmg: 14, aoe: 90, color: '#c9a227' },
  // v0.92 每門三招（入門／小成／大成）
  { id: 'fist2', skill: 'palm', name: '連環拳', req: 999, range: 36, cd: 0.8, dmg: 5, aoe: 0, color: '#9a7a5a' },
  { id: 'fist3', skill: 'palm', name: '崩拳', req: 999, range: 38, cd: 1.6, dmg: 9, aoe: 30, color: '#7a5a3a' },
  { id: 'push2', skill: 'palm', name: '排雲推手', req: 999, range: 70, cd: 1.8, dmg: 10, aoe: 0, color: '#c0583e' },
  { id: 'push3', skill: 'palm', name: '開山掌', req: 999, range: 64, cd: 2.4, dmg: 13, aoe: 50, color: '#a0381e' },
  { id: 'wave2', skill: 'palm', name: '回風拂柳', req: 999, range: 84, cd: 2.8, dmg: 8, aoe: 80, color: '#4d7b9a' },
  { id: 'wave3', skill: 'palm', name: '狂風捲', req: 999, range: 90, cd: 3.6, dmg: 10, aoe: 100, color: '#2d5b7a' },
  { id: 'kick2', skill: 'leg', name: '掃葉腿', req: 999, range: 44, cd: 1.5, dmg: 7, aoe: 50, color: '#7b9a4d' },
  { id: 'kick3', skill: 'leg', name: '鐵掃帚', req: 999, range: 46, cd: 2.0, dmg: 10, aoe: 60, color: '#5b7a2d' },
  { id: 'whirl2', skill: 'leg', name: '連環旋踢', req: 999, range: 58, cd: 2.4, dmg: 10, aoe: 65, color: '#9a4d8a' },
  { id: 'whirl3', skill: 'leg', name: '龍捲腿', req: 999, range: 62, cd: 3.0, dmg: 13, aoe: 80, color: '#7a2d6a' },
  { id: 'storm2', skill: 'palm', name: '風捲雷鳴', req: 999, range: 95, cd: 3.4, dmg: 16, aoe: 95, color: '#d9b237' },
  { id: 'storm3', skill: 'palm', name: '雷動九天', req: 999, range: 100, cd: 4.0, dmg: 20, aoe: 110, color: '#e9c247' },
];

// v1.55a 敵人表合併：家裡（狩獵／獸襲）與巡山共用 ENEMIES；MONSTERS 只是 ENEMIES 帶 home 欄位者的檢視（見檔尾）
export const MONSTERS = {};
export const WAVES = [
  [{ t: 0, k: 'rat' }, { t: 2, k: 'rat' }, { t: 4, k: 'rat' }, { t: 7, k: 'boar' }],
];

export const DISCIPLES = [
  { id: 'hero', name: '主角', root: 3, adult: true, sprite: 'hero', style: 'palm', skills: { leg: 2, palm: 10, strength: 10, farming: 5, herbal: 5, agility: 10, cooking: 3 }, traits: { diligent: 1.2 }, personality: ['diligent', 'worrier'] },
  { id: 'senior', name: '林師姐', root: 4, adult: true, sprite: 'senior', style: 'leg', skills: { leg: 10, palm: 5, strength: 5, farming: 15, herbal: 10, agility: 12, cooking: 10 }, traits: { social: 1.3 }, personality: ['gentle', 'optimist'] },
  { id: 'cousin', name: '堂弟', root: 2, adult: false, sprite: 'cousin', style: 'leg', skills: { leg: 3, palm: 0, strength: 2, farming: 3, herbal: 8, agility: 15, cooking: 2 }, traits: { playful: 1.4 }, personality: ['playful', 'glutton'] },
];

export const REL_STAGES = [[0, '陌生'], [20, '相識'], [45, '好友'], [70, '知己'], [90, '道侶']];
export const BASE_SPEED = 55; // px/s

// 日夜與作息（v0.2）：一日 600 遊戲秒
export const DAY = 600;
export const PHASES = [[0, 'dawn', '晨'], [0.2, 'day', '日'], [0.65, 'dusk', '暮'], [0.8, 'night', '夜']];
export const SCHEDULE = {
  dawn: { train: 1.5, learn: 1.2 },
  day: { farm: 1.2, chop: 1.2, quarry: 1.2, cook: 1.1, forage: 1.1, build: 1.2 },
  dusk: { eat: 1.4, chat: 1.6, cook: 1.3, leisure: 1.5, encourage: 1.4 },
  night: { rest: 2.2, train: 0.3, chop: 0.2, quarry: 0.2, farm: 0.2, forage: 0.2, build: 0.3, chat: 0.6, leisure: 0.4, encourage: 0.5 },
};
export const PLOT_GROW = 90; // 秒，播種到成熟
export const HARVEST = 3;    // 每畦收菜
export const STYLES = { palm: '掌法', leg: '腿法' };
// v0.4 後山生態：族群有上限與繁衍；狩獵是真的取走個體
export const ECO = { rat: { start: 6, max: 8, regen: 50 }, boar: { start: 2, max: 3, regen: 150 } };
export const HABITAT = { c: [1450, 60], r: 70 };
export const POSTS = { guard: '山頂守點', trail2: '山腰岔口', trail1: '山腳路口' };
export const RAID_EVERY = 160; // 秒；野豬下山拱菜
export const HUNT_WAVES = 3, WAVE_GAP = 6;

// v0.5 名聲與招收
export const REP = { build: 5, kill: 1, learn: 2 };
export const RECRUIT = { baseRep: 8, stepRep: 6, food: 3 };
export const RECRUIT_POOL = [
  { id: 'aqing', name: '阿青', adult: true, sprite: 'hero', style: 'palm', skills: { leg: 3, palm: 6, strength: 8, farming: 6, herbal: 4, agility: 9, cooking: 4 }, traits: { diligent: 1.3 }, personality: ['diligent', 'brave'] },
  { id: 'shitou', name: '石頭', adult: true, sprite: 'hero', style: 'leg', skills: { leg: 8, palm: 2, strength: 14, farming: 4, herbal: 2, agility: 8, cooking: 2 }, traits: {}, personality: ['honest', 'brave'] },
  { id: 'xiaomei', name: '小梅', adult: true, sprite: 'senior', style: 'palm', skills: { leg: 2, palm: 4, strength: 4, farming: 10, herbal: 14, agility: 11, cooking: 12 }, traits: { social: 1.4 }, personality: ['gentle', 'sociable'] },
  { id: 'laoqi', name: '老七', adult: true, sprite: 'hero', style: 'leg', skills: { leg: 6, palm: 6, strength: 10, farming: 12, herbal: 6, agility: 7, cooking: 8 }, traits: { diligent: 1.1 }, personality: ['gentle', 'optimist'] },
];

// v0.6 切片：性格特質（RimWorld traits／DF facets 的簡化版）與心情
// mods：活動分數乘數；moodBase：常駐心情；thoughtMul：對某類想法放大
export const TRAITS = {
  diligent: { name: '勤奮', desc: '閒不下來，練功砍柴都起勁', mods: { train: 1.25, chop: 1.15, build: 1.15, farm: 1.1, chat: 0.85 } },
  sociable: { name: '健談', desc: '愛找人說話，聊完心情特別好', mods: { chat: 1.5, spar: 1.1 }, thoughtMul: { social: 1.6 } },
  playful: { name: '貪玩', desc: '愛往外跑採藥，坐不住練功', mods: { forage: 1.4, train: 0.7, chat: 1.2 } },
  gentle: { name: '溫和', desc: '愛下廚照顧人，不愛打鬥', mods: { cook: 1.4, farm: 1.15, spar: 0.6 }, thoughtMul: { fight: 1.5 } },
  brave: { name: '膽大', desc: '受傷不太放在心上，愛切磋', mods: { spar: 1.4 }, thoughtMul: { fight: 0.4 } },
  optimist: { name: '樂天', desc: '天塌下來也笑得出來', moodBase: 8 },
  worrier: { name: '多慮', desc: '小事也掛心', moodBase: -6, thoughtMul: { bad: 1.4 } },
  honest: { name: '憨厚', desc: '學得慢卻肯下笨功夫，基礎武學練得特別紮實', mods: { train: 1.1, leisure: 0.8 } },
  free: { name: '灑脫', desc: '不拘一格，練功隨興，巧變的武學一點就通', mods: { train: 0.9, chat: 1.15, leisure: 1.2 } },
  glutton: { name: '貪吃', desc: '吃得好心情就好，餓了特別煩', mods: { eat: 1.3 }, thoughtMul: { food: 1.8 } },
};
// 想法（記憶）：值、持續秒數、分類（給 thoughtMul 用）
export const THOUGHTS = {
  recordSect: { text: '本門巡山走出新紀錄', v: 5, ttl: 600, tag: 'good' },
  recordSelf: { text: '巡山走得比上次更遠', v: 4, ttl: 500, tag: 'good' },
  likeFood:  { text: '今天的菜正合胃口', v: 4, ttl: 300, tag: 'good' },
  likeDrink: { text: '喝到愛喝的', v: 3, ttl: 300, tag: 'good' },
  forcedStyle:{ text: '被巡山令逼著照別人的路子走', v: -6, ttl: 400, tag: 'bad' },
  quarrel:   { text: '巡山時跟人吵了一架', v: -5, ttl: 300, tag: 'social' },
  xiaJoin:   { text: '名俠入門，門派有了底氣', v: 6, ttl: 600, tag: 'good' },
  xiaTaught: { text: '得名師親傳絕學', v: 15, ttl: 900, tag: 'good' },
  jealous:   { text: '首徒的劍比我快……（嫉）', v: -10, ttl: 900, tag: 'bad' },
  bixieShock:{ text: '掌門變了個人，陰陽怪氣', v: -8, ttl: 1800, tag: 'bad' },
  zixiaUp:   { text: '紫霞神功又進一層', v: 8, ttl: 600, tag: 'good' },
  duguGot:   { text: '劍隨意走，無招勝有招', v: 12, ttl: 900, tag: 'good' },
  aspDone:   { text: '志向得償', v: 12, ttl: 900, tag: 'good' },
  expHurt:   { text: '巡山掛了彩', v: -8, ttl: 400, tag: 'fight' },
  raidHurt:  { text: '守山門被山賊打成重傷', v: -10, ttl: 500, tag: 'fight' }, // v1.9 I-6
  btFail:    { text: '衝關失敗，氣血翻湧', v: -5, ttl: 300, tag: 'bad' },
  btWin:     { text: '衝破瓶頸！', v: 18, ttl: 500, tag: 'good' },
  learned:   { text: '學會了新招', v: 15, ttl: 400, tag: 'good' },
  goodChat:  { text: '和人聊得開心', v: 6, ttl: 150, tag: 'social' },
  bedSleep:  { text: '睡在床上', v: 5, ttl: 300, tag: 'good' },
  floorSleep:{ text: '睡破地鋪', v: -5, ttl: 300, tag: 'bad' },
  hallMeal:  { text: '在膳房吃了熱飯', v: 6, ttl: 200, tag: 'food' },
  hurt:      { text: '狩獵受傷', v: -12, ttl: 400, tag: 'fight' },
  wonHunt:   { text: '守住了後山', v: 8, ttl: 300, tag: 'good' },
  cropLost:  { text: '菜被野豬拱了', v: -5, ttl: 200, tag: 'bad' },
  encouraged:{ text: '被同門鼓勵', v: 12, ttl: 300, tag: 'social' },
  helped:    { text: '幫人打了氣', v: 4, ttl: 200, tag: 'good' },
  badChat:   { text: '話不投機', v: -4, ttl: 150, tag: 'social' },
  newLook:   { text: '門派有了新氣象', v: 8, ttl: 600, tag: 'good' },
  wellFed:   { text: '存糧充足，心裡踏實', v: 4, ttl: 300, tag: 'food' },
  idled:     { text: '偷得浮生半日閒', v: 5, ttl: 200, tag: 'good' },
  paid:      { text: '領了工錢', v: 4, ttl: 300, tag: 'good' },
  unpaid:    { text: '工錢沒著落', v: -10, ttl: 600, tag: 'bad' },
  invited:   { text: '被邀入門', v: 15, ttl: 600, tag: 'good' },
  quotaMet:  { text: '日課做完了', v: 4, ttl: 300, tag: 'good' },
  quotaMiss: { text: '日課沒做完', v: -6, ttl: 400, tag: 'bad' },
  promoted:  { text: '升入內門', v: 18, ttl: 800, tag: 'good' },
  trialFail: { text: '入內門考核沒過', v: -8, ttl: 400, tag: 'bad' },
  headDisc:  { text: '成了首徒', v: 15, ttl: 800, tag: 'good' },
  workedWith:{ text: '和人一起幹活', v: 3, ttl: 200, tag: 'social' },
};
export const NEED_MOOD = { hunger: [20, -10, 'food'], energy: [30, -8, 'bad'], social: [25, -6, 'social'], fun: [25, -6, 'bad'] };
export const MOOD = { base: 50, up: 3, down: 2, low: 30, high: 70 }; // 每秒向目標移動；低／高門檻
export const WORK_ACTS = ['train', 'chop', 'quarry', 'build', 'spar']; // 低落時被壓低的「可延後」工作；種菜煮飯屬求生，不壓，避免餓→低落→不煮的死亡螺旋
export const LEISURE_ACTS = ['rest', 'chat', 'forage', 'eat', 'leisure'];

// ---- v0.7 ----
export const RULES_VERSION = '1.95';
// 季節：沿用一日 600 秒，每季 7 日
export const SEASON_DAYS = 7;
export const SEASONS = [
  { id: 'spring', name: '春', grow: 0.8, mood: 3, hunger: 1 },
  { id: 'summer', name: '夏', grow: 1.0, mood: 0, hunger: 1 },
  { id: 'autumn', name: '秋', grow: 0.9, mood: 2, hunger: 1 },
  { id: 'winter', name: '冬', grow: 1.8, mood: -3, hunger: 1.2 },
];
// 相容度：對立特質扣、欣賞特質加（a 看 b，有方向）
export const OPPOSE = [['diligent', 'playful'], ['optimist', 'worrier'], ['gentle', 'brave']];
export const LIKES = { glutton: ['gentle'], worrier: ['optimist', 'gentle'], sociable: ['sociable', 'optimist'], diligent: ['diligent'], playful: ['playful', 'sociable'], brave: ['brave'], gentle: ['worrier'], optimist: [] };
// 特質揭露：第 i 個特質在「相處」累積 REVEAL_AT[i] 秒後才看得出來（聊天加速）
export const REVEAL_AT = [0, 300, 900];
// 三問心印：每題答案對應一個特質；前兩個不重複者成為明面性格，人選原本的天性為第三個（暗）
export const QUESTIONS = [
  { q: '初見山門，你先？', a: [['拿起掃帚掃落葉', 'diligent'], ['找人攀談', 'sociable'], ['四處張望後山', 'playful']] },
  { q: '同伴受了傷，你？', a: [['包紮熬湯', 'gentle'], ['替他出頭', 'brave'], ['擔心了一整夜', 'worrier']] },
  { q: '一碗熱粥端來，你？', a: [['細細品味', 'glutton'], ['先讓給別人', 'gentle'], ['笑說明天會更好', 'optimist']] },
];

// ---- v0.8 資源→建設、雇工 ----
// 香火錢：每日晨起入帳 base + floor(名聲/perRep)；雇工每日工錢 wage，付不出累計 unpaid，達 leaveAfter 日離開
export const ECON = { coinStart: 4, coinBase: 2, coinPerRep: 5, wage: 2, hireCoin: 4, hireFood: 2, leaveAfter: 2, carry: 2, laborCarry: 3 };
// v2.1：照舊開局（沒有 hero 模板）前 earlyDays 日的香火多 earlyBonus；之後只把「聲望帶來的那一段」乘 repMul。經典開局不走這條，維護費也不動。
export const PLAIN = { earlyDays: 10, earlyBonus: 4, repMul: 0.6 };
export const RES_NAMES = { wood: '木', stone: '石', coin: '香火錢', veg: '菜', food: '飯', herb: '藥', hide: '獸皮', gall: '熊膽', page1: '凡階殘頁', page2: '精階殘頁', tiemu: '鐵木', lingshi: '靈石' };
// 雇工能做的事（不練武、不聽講、不下廚種菜）；幹活時分數加成
export const LABOR_ACTS = ['rest', 'eat', 'chat', 'leisure', 'chop', 'quarry', 'build'];
export const LABOR_WORK_MUL = 1.4;
// 根骨（隱藏潛力 1–5）：與弟子一起幹活／聊天累積「共事」秒數後揭露；≥ inviteMin 且弟子平均好感 ≥ inviteAff 可邀入門
export const ROOT = { revealAt: 240, inviteMin: 3, inviteAff: 18, names: ['', '平平', '尚可', '中上', '良材', '奇才'] };
export const LABOR_POOL = [
  { id: 'dazhu', name: '大柱', adult: true, sprite: 'hero', style: 'palm', root: 4, skills: { leg: 2, palm: 3, strength: 14, farming: 4, herbal: 1, agility: 7, cooking: 2 }, traits: {}, personality: ['diligent', 'honest'] },
  { id: 'erya', name: '二丫', adult: true, sprite: 'senior', style: 'leg', root: 2, skills: { leg: 3, palm: 1, strength: 7, farming: 9, herbal: 6, agility: 10, cooking: 8 }, traits: { social: 1.2 }, personality: ['sociable', 'optimist'] },
  { id: 'laohuang', name: '老黃', adult: true, sprite: 'hero', style: 'palm', root: 1, skills: { leg: 1, palm: 2, strength: 11, farming: 8, herbal: 3, agility: 5, cooking: 5 }, traits: {}, personality: ['gentle', 'worrier'] },
  { id: 'xiaoliu', name: '小六', adult: true, sprite: 'cousin', style: 'leg', root: 5, skills: { leg: 6, palm: 2, strength: 6, farming: 3, herbal: 4, agility: 14, cooking: 1 }, traits: { playful: 1.2 }, personality: ['free', 'brave'] },
  { id: 'achun', name: '阿春', adult: true, sprite: 'senior', style: 'palm', root: 3, skills: { leg: 2, palm: 4, strength: 8, farming: 7, herbal: 9, agility: 9, cooking: 9 }, traits: {}, personality: ['gentle', 'diligent'] },
  { id: 'tiezi', name: '鐵子', adult: true, sprite: 'hero', style: 'leg', root: 2, skills: { leg: 5, palm: 3, strength: 13, farming: 2, herbal: 1, agility: 8, cooking: 2 }, traits: {}, personality: ['brave', 'worrier'] },
];

// v0.85 內外門與日課
export const CHORE_ACTS = ['chop', 'quarry', 'farm', 'cook', 'build', 'forage'];
export const CHORE_NAMES = { chop: '砍柴', quarry: '採石', farm: '種菜', cook: '煮飯', build: '營建', forage: '採藥' };
export const QUOTA = { points: 4, debtMax: 4, outerMin: 2, headRate: 0.8, headTrain: 1.5, dutyMul: 1.4 };
export const PRIO = { high: [1.5, '優先'], normal: [1, '一般'], low: [0.6, '少做'] };
export const PROMOTE = { rootMin: 3, contrib: 6, pass: 30, cooldown: 1 };
export const RANK_NAMES = { head: '首徒', inner: '內門', outer: '外門', laborer: '雇工' };

// v0.9 武學骨架
export const TIERS = [[0, '入門'], [25, '小成'], [55, '大成'], [85, '圓滿'], [100, '化境']];
export const GRADES = ['', '凡', '良', '精', '絕', '神'];
export const SCHOOLS = { fist: '拳', palm: '掌', leg: '腿', inner: '內功', step: '身法' };
export const ARTS = [
  { id: 'basicFist', name: '基礎拳', school: 'fist', grade: 1, tags: ['拙'], req: [], techs: ['fist', 'fist2', 'fist3'], tech: 'fist' },
  { id: 'pushPalm', name: '推山掌', school: 'palm', grade: 1, tags: ['剛'], req: [{ art: 'basicFist', tier: 1 }], techs: ['push', 'push2', 'push3'], tech: 'push' },
  { id: 'wavePalm', name: '迴風掌', school: 'palm', grade: 2, tags: ['巧'], req: [{ art: 'pushPalm', tier: 2 }], techs: ['wave', 'wave2', 'wave3'], tech: 'wave', wuxingMin: 2 },
  { id: 'sweepLeg', name: '掃堂腿', school: 'leg', grade: 1, tags: ['拙'], req: [{ art: 'basicFist', tier: 1 }], techs: ['kick', 'kick2', 'kick3'], tech: 'kick' },
  { id: 'whirlLeg', name: '旋風腿', school: 'leg', grade: 2, tags: ['巧'], req: [{ art: 'sweepLeg', tier: 2 }], techs: ['whirl', 'whirl2', 'whirl3'], tech: 'whirl', wuxingMin: 2 },
  { id: 'breath', name: '吐納', school: 'inner', grade: 1, tags: ['柔'], req: [], tech: null, techs: ['調息', '綿息', '胎息'], effect: 'rest' },
  { id: 'snowStep', name: '踏雪步', school: 'step', grade: 1, tags: ['巧'], req: [{ art: 'sweepLeg', tier: 1 }], tech: null, techs: ['輕身', '踏雪無痕', '凌空步'], effect: 'speed' },
  { id: 'fengLei', name: '風雷掌腿', school: 'palm', grade: 3, tags: ['剛'], req: [{ art: 'wavePalm', tier: 2 }, { art: 'whirlLeg', tier: 2 }], techs: ['storm', 'storm2', 'storm3'], tech: 'storm', wuxingMin: 3 },
];
// 悟性（根骨）× 品階：低悟性練凡階更快（笨功夫），高悟性練高階更快
export const WUXING_MUL = { 1: [1.4, 0.7], 2: [1.2, 0.85], 3: [1, 1], 4: [0.9, 1.2], 5: [0.85, 1.45] };
export const ART_GAIN = { base: 0.35, gated: 0.3, gateCap: 54.9, reqBonus: 0.1, tierDmg: 0.1, honest: [1.3, 0.8], tagTrait: { free: ['巧', 1.1], diligent: ['拙', 1.1] }, restPerTier: 0.06, speedPerTier: 0.04 };

// v0.92 突破、變式、歸真、荒疏
export const PERKS = { small: { name: '熟極而流', cd: 0.9 }, full: { name: '圓轉如意', dmg: 1.15 } };
export const VARIANTS = {
  fist: [{ id: 'gang', name: '沉猛', dmg: 1.2, cd: 1.1, color: '#c0392b' }, { id: 'ling', name: '迅捷', dmg: 0.95, cd: 0.8, color: '#2e86c1' }],
  palm: [{ id: 'gang', name: '剛猛', dmg: 1.2, cd: 1.1, color: '#c0392b' }, { id: 'ling', name: '輕靈', dmg: 0.95, cd: 0.8, color: '#2e86c1' }],
  leg: [{ id: 'gang', name: '重腿', dmg: 1.2, cd: 1.1, color: '#c0392b' }, { id: 'ling', name: '飛腿', dmg: 0.95, cd: 0.8, color: '#2e86c1' }],
  inner: [{ id: 'gang', name: '綿長', eff: 1.3, color: '#8e44ad' }, { id: 'ling', name: '精純', eff: 1.15, energy: 0.8, color: '#16a085' }],
  step: [{ id: 'gang', name: '疾行', eff: 1.3, color: '#d35400' }, { id: 'ling', name: '飄忽', eff: 1.15, energy: 0.8, color: '#27ae60' }],
};
export const BREAK = { caps: [54.9, 99.9], moodMin: 45, energyMin: 40, base: 0.35, cooldown: DAY, rechoose: DAY / 2 };
export const GUIZHEN = { rootMax: 2, traits: ['diligent', 'honest'], star: 0.04, cost0: 20, costStep: 4 };
export const RUST = { after: 2 * DAY, perDay: 0.15, max: 0.6, shake: 0.05 };
export const AURA = { fist: '#b08a5a', palm: '#d0582e', leg: '#6b9a3d', inner: '#8e44ad', step: '#2e86c1' };

// ---- v0.95 敵人種類與圖鑑（觀破值）----
// kind：獸／人；flee：殘血時逃走機率；loot：整數必得、小數為機率
export const ENEMIES = {
  rat:    { name: '山鼠',     kind: '獸', weapon: '利齒', hp: 10,  dmg: 2,  cd: 1.0, flee: 0.5,  loot: {} },
  hare:   { name: '野兔',     kind: '獸', weapon: '牙爪', hp: 8,   dmg: 1,  cd: 1.2, flee: 0.6,  loot: { food: 1 } },
  boar:   { name: '野豬',     kind: '獸', weapon: '獠牙', hp: 40,  dmg: 6,  cd: 1.3, flee: 0.1,  loot: { food: 3, hide: 1 } },
  boars:  { name: '野豬群',   kind: '獸', weapon: '獠牙', hp: 110,  dmg: 11,  cd: 1.1, flee: 0.15, loot: { food: 5, hide: 2 } },
  wolf:   { name: '狼',       kind: '獸', weapon: '牙爪', hp: 60,  dmg: 10,  cd: 0.9, flee: 0.2,  loot: { hide: 1 } },
  snake:  { name: '毒蛇',     kind: '獸', weapon: '毒牙', hp: 25,  dmg: 12, cd: 1.5, flee: 0.35, loot: { herb: 2 } },
  bandit: { name: '山賊嘍囉', kind: '人', weapon: '刀',   hp: 120,  dmg: 14,  cd: 1.2, flee: 0.3,  loot: { coin: 3, page1: 0.15 } },
  archer: { name: '獵戶暗箭', kind: '人', weapon: '暗器', hp: 75,  dmg: 17, cd: 1.5, flee: 0.45, loot: { coin: 2, page1: 0.1 } },
  bear:   { name: '黑熊',     kind: '獸', weapon: '熊掌', hp: 420, dmg: 28, cd: 1.6, flee: 0.05, loot: { food: 6, gall: 1 } },
  chief:  { name: '山賊頭目', kind: '人', weapon: '刀／鞭', hp: 360, dmg: 24, cd: 1.1, flee: 0.2, loot: { coin: 12, page2: 0.35 } },
  // v1.0 第五段以後（基準數值；實戰再乘路段倍率 ×1.25^k）
  vulture:{ name: '禿鷲',     kind: '獸', weapon: '鐵喙', hp: 120, dmg: 12, cd: 1.0, flee: 0.4,  loot: { hide: 1 } },
  ape:    { name: '崖猿',     kind: '獸', weapon: '巨臂', hp: 200, dmg: 15, cd: 1.3, flee: 0.2,  loot: { food: 4, herb: 1 } },
  bat:    { name: '洞蝠群',   kind: '獸', weapon: '利齒', hp: 150, dmg: 11, cd: 0.8, flee: 0.3,  loot: { herb: 1, page1: 0.2 } },
  python: { name: '巨蟒',     kind: '獸', weapon: '纏絞', hp: 320, dmg: 18, cd: 1.6, flee: 0.1,  loot: { gall: 1, page1: 0.3 } },
  hermit: { name: '瘋癲劍客', kind: '人', weapon: '劍',   hp: 300, dmg: 20, cd: 1.0, flee: 0.25, loot: { coin: 10, page2: 0.3 } },
  whiteape:{ name: '白猿',    kind: '獸', weapon: '巨臂', hp: 480, dmg: 22, cd: 1.2, flee: 0,    loot: { food: 8, page2: 0.5 } },
  pythonking:{ name: '古洞蟒王', kind: '獸', weapon: '纏絞', hp: 260, dmg: 22, cd: 1.5, flee: 0, loot: { gall: 2, page2: 0.7 } },
  swordtomb:{ name: '劍塚守者', kind: '人', weapon: '玄鐵重劍', hp: 600, dmg: 24, cd: 1.3, flee: 0, loot: { coin: 30, page2: 1 } },
  peakguard:{ name: '無名高手', kind: '人', weapon: '？', hp: 560, dmg: 22, cd: 1.2, flee: 0, loot: { coin: 20, page2: 1 } },
};
// 觀破值：照面 +1、交手 +2、擊倒 +5；10 識其來路、30 熟其招式、60 看破（對其傷害 +10%）
export const INSIGHT = { see: 1, fight: 2, kill: 5, tiers: [[10, '識其來路'], [30, '熟其招式'], [60, '看破']], dmgAt: 60, dmg: 0.1 };
// ---- v0.95 巡山遠征：固定名單，從不讀玩家強度 ----
export const ROUTE = [
  { id: 'foot',   name: '山腳', from: 0,   to: 100, every: 20, roster: [['hare', 3], ['boar', 1]],               find: { food: 0.5 } }, // v1.9：tiemu 鐵木（深谷起）、lingshi 靈石（古洞起）＝三四階建築的稀有料
  { id: 'wood',   name: '林地', from: 100, to: 250, every: 25, roster: [['boars', 1], ['wolf', 2], ['snake', 2]], find: { herb: 0.5, wood: 0.5 } },
  { id: 'slope',  name: '山腰', from: 250, to: 450, every: 30, roster: [['bandit', 3], ['archer', 2]],            find: { coin: 0.5 } },
  { id: 'gorge',  name: '深谷', from: 450, to: 700, every: 35, roster: [['bear', 1], ['chief', 1]],               find: { herb: 0.5, tiemu: 0.25 } },
  { id: 'cliff',  name: '斷崖', from: 700, to: 950, every: 40, roster: [['vulture', 2], ['ape', 2]], find: { herb: 0.5, tiemu: 0.35 }, scale: 1.25 },
  { id: 'cave',   name: '古洞', from: 950, to: 1250, every: 45, roster: [['bat', 3], ['python', 1]], find: { page1: 0.3, lingshi: 0.3 }, scale: 1.25 ** 2 },
  { id: 'peak',   name: '無名絕頂', from: 1250, to: 1600, every: 50, roster: [['hermit', 2], ['ape', 1]], find: { coin: 1, page2: 0.1, lingshi: 0.4 }, scale: 1.25 ** 3 },
];
// v1.0 無盡段：無名絕頂之後每 200 步一段、段末固定守關「無名高手」、每段 ×1.25
export const ENDLESS = { len: 200, mul: 1.18, dmgExp: 0.5, roster: [['hermit', 2], ['ape', 1], ['python', 1]], find: { coin: 1, page2: 0.15, lingshi: 0.4 }, gate: 'peakguard' };
// v1.9 I-2：稀有料名稱；建築槽位（藏經閣等 v1.6 建築各佔一塊地，開山 4 塊，擴地花錢、每塊 ×1.5）
export const RARE = { tiemu: '鐵木', lingshi: '靈石' };
export const LOTS = { start: 4, cost: 50, rise: 1.5, max: 10 };
// 營地：第三段（山腰）與第五段（斷崖）盡頭；過關即設營，可補給、下次可從營地出發
export const CAMPS = [{ id: 'camp1', seg: 2, name: '山腰營地' }, { id: 'camp2', seg: 4, name: '斷崖營地' }];
export const EXP = { maxTeam: 4, thr: [0.3, 0.5, 0.7], thrDefault: 0.5, moodMin: 30, walk: 5, back: 12, gateBail: 0.25, supplyHeal: 35, supplyPer: 2, supplyMax: 6, campCarry: 2, sta: 100, staStep: 0.05, staFight: 1.5, patFight: 1.5, patLazy: 1, orderPatCap: 0.7, scoutAt: 35, scoutBonus: 0.2, scoutT: 3, cool: 90, coolFast: 0.5, quarrel: 6, peaceQing: 3, peaceRaid: 2, peaceSpeed: 1.3, orderMood: -6, classicGuard: 0.6, classicTier: 3, minHp: 50, hurtLight: 60, hurtHeavy: 25, retSta: 6, retLoss: 0.5 }; // v1.45 返程驚獸：每段未清段扣耐力 6；耐力見底才掉一半戰利品；不受傷
export const RES_NAMES_095 = { page1: '凡階殘頁', page2: '精階殘頁', hide: '獸皮', gall: '熊膽' };
// 前期節奏：前三天每天一個里程碑；導引旁白可略過
export const PACE = [
  { id: 'trial', day: 1, name: '黃昏試煉：首個小成', guide: '師父：「天黑前，木樁場有頭餓瘋的野豬闖進來，讓主角試試身手。」' },
  { id: 'firstExp', day: 2, name: '第一次巡山', guide: '師父：「後山不太平。挑一到四人去巡山，看看能走多遠——傷到一半就回來。」（下方「巡山遠征」）' },
  { id: 'firstBuild', day: 3, name: '第一次動工', guide: '師父：「巡山帶回的木料夠了就動工吧，膳房或工寮都行。」（上方「建造」）' },
];
export const TRIAL_BOAR = { hp: 24, hit: 1.0 };

Object.assign(TRAITS, NEW_TRAITS); // v0.96 主角／同門新特質
// ---- v0.97 巡山風格（ROADMAP §15.8）----
// 警覺 detect：閃避門檻；速度 speed：追擊門檻
Object.assign(ENEMIES.rat, { detect: 15, speed: 30 }); Object.assign(ENEMIES.hare, { detect: 10, speed: 35 }); Object.assign(ENEMIES.boar, { detect: 20, speed: 15 });
Object.assign(ENEMIES.boars, { detect: 30, speed: 15 }); Object.assign(ENEMIES.wolf, { detect: 45, speed: 40 }); Object.assign(ENEMIES.snake, { detect: 5, speed: 5 });
Object.assign(ENEMIES.bandit, { detect: 35, speed: 20 }); Object.assign(ENEMIES.archer, { detect: 55, speed: 25 }); Object.assign(ENEMIES.bear, { detect: 30, speed: 20 }); Object.assign(ENEMIES.chief, { detect: 50, speed: 20 });
ENEMIES.wolfking = { name: '狼王', kind: '獸', weapon: '牙爪', hp: 170, dmg: 14, cd: 1.0, flee: 0, loot: { hide: 2 }, detect: 60, speed: 45 };
ENEMIES.post = { name: '山賊哨卡', kind: '人', weapon: '刀槍', hp: 300, dmg: 18, cd: 1.1, flee: 0, loot: { coin: 6, page1: 0.4 }, detect: 70, speed: 20 };
// 段尾守關敵：一定要打、不能繞；打不贏＝回頭
Object.assign(ROUTE[0], { gate: 'boar', gateName: '擋路的野豬' }); Object.assign(ROUTE[1], { gate: 'wolfking', gateName: '狼王' });
Object.assign(ROUTE[2], { gate: 'post', gateName: '山賊哨卡' }); Object.assign(ROUTE[3], { gate: 'bear', gateName: '橋頭黑熊' });
Object.assign(ROUTE[4], { gate: 'whiteape', gateName: '白猿' }); Object.assign(ROUTE[5], { gate: 'pythonking', gateName: '古洞蟒王' }); Object.assign(ROUTE[6], { gate: 'swordtomb', gateName: '劍塚守者' });
export const EXP_STYLES = {
  clear:  { name: '清場', speed: 0.7, evade: 'never', chase: 1 },
  steady: { name: '穩推', speed: 1.0, evade: 'never', chase: 0.3 }, // 穩推中較真者 30% 會追
  dash:   { name: '疾行', speed: 1.3, evade: 'weak', chase: 0 },     // 打不過才繞
  slip:   { name: '溜走', speed: 1.5, evade: 'always', chase: 0 },
};
export const STYLE_TRAIT = { honest: 2, stubborn: 2, diligent: 1, brave: 1, playful: -1, free: -1, lazy: -2, worrier: -1, rascal: -1, glib: -1 };
export const EVADE = { lazyBonus: 10, tierPts: 10, chaseTime: 6 };
Object.assign(TRAITS, { stubborn: { name: '較真', desc: '凡事做到底，逃掉的兔子也要追回來', mods: { train: 1.1, leisure: 0.85 } } });
ARTS.push({ id: 'rulai', name: '如來神掌', school: 'palm', grade: 3, tags: ['剛'], req: [], techs: ['rulai'], tech: 'rulai', secret: true, hint: '阿星開局：重傷瀕死時覺醒，封印的根骨解開而自悟' });
MOVES.push({ id: 'rulai', skill: 'palm', name: '如來神掌', req: 999, range: 120, cd: 4.0, dmg: 24, aoe: 120, color: '#f2c14e' });
export const AWAKEN = { gen: 5, li: 2, ding: 1, shen: 1 }; // 阿星覺醒：封印根骨解開（1→5 為 +4，其餘 +4，共 +8）

// ---- v1.1 名俠奇遇：招牌武學（各三招；只能由本人或親傳取得） ----
ARTS.push({ id: 'xianglong', name: '降龍十八掌', school: 'palm', grade: 3, tags: ['剛', '拙'], req: [], techs: ['jianlong', 'feilong', 'kanglong'], tech: 'jianlong', secret: true, hint: '洪七公上山後，每煮一頓合他胃口的飯傳一段（共三段），挑資質憨直的人當傳人', classic: true, signature: 'hongqigong' });
ARTS.push({ id: 'dagou', name: '打狗棒法', school: 'palm', grade: 3, tags: ['巧'], req: [], techs: ['banzi', 'chuozi', 'wugou'], tech: 'banzi', secret: true, hint: '洪七公傳到降龍第二段起，會把打狗棒法傳給主角', classic: true, signature: 'hongqigong' });
MOVES.push({ id: 'jianlong', skill: 'palm', name: '見龍在田', req: 0, range: 50, cd: 1.0, dmg: 14, aoe: 0, color: '#e8b33a', fx: 'dragon' });
MOVES.push({ id: 'feilong', skill: 'palm', name: '飛龍在天', req: 0, range: 70, cd: 1.4, dmg: 20, aoe: 80, color: '#f0c040', fx: 'dragon' });
MOVES.push({ id: 'kanglong', skill: 'palm', name: '亢龍有悔', req: 0, range: 90, cd: 1.6, dmg: 30, aoe: 100, color: '#ffd24a', fx: 'dragon' });
MOVES.push({ id: 'banzi', skill: 'leg', name: '絆字訣', req: 0, range: 40, cd: 0.7, dmg: 9, aoe: 0, color: '#3fae5a', fx: 'staff' });
MOVES.push({ id: 'chuozi', skill: 'leg', name: '戳字訣', req: 0, range: 50, cd: 0.9, dmg: 14, aoe: 0, color: '#2f9e6a', fx: 'staff' });
MOVES.push({ id: 'wugou', skill: 'leg', name: '天下無狗', req: 0, range: 80, cd: 1.6, dmg: 26, aoe: 90, color: '#5fd38a', fx: 'staff' });

// ---- v1.2 華山線：紫霞神功（九層）、辟邪劍法（捷徑）、獨孤九劍（九式，口傳不入秘笈） ----
ARTS.push({ id: 'zixia', name: '紫霞神功', school: 'palm', grade: 3, tags: ['柔'], req: [], techs: [], secret: true, hint: '岳不群開局：開局即得第一層，之後在華山劇情中逐層修煉', classic: true, layered: true });
ARTS.push({ id: 'bixie', name: '辟邪劍法', school: 'palm', grade: 4, tags: ['快'], req: [], techs: ['bx1', 'bx2', 'bx3'], tech: 'bx1', secret: true, hint: '岳不群開局：華山劇情中選擇練辟邪劍譜（自宮＋斷情）', classic: true });
ARTS.push({ id: 'dugu', name: '獨孤九劍', school: 'palm', grade: 4, tags: ['巧'], req: [], techs: [], secret: true, hint: '華山劇情「思過崖的老人」：請教風清揚三晚，第四晚過招後得總訣；其餘各式要對該敵人有足夠觀破', classic: true, forms: true });
MOVES.push({ id: 'bx1', skill: 'palm', name: '流星飛墮', req: 0, range: 60, cd: 0.45, dmg: 9, aoe: 0, color: '#c03060', fx: 'bixie' });
MOVES.push({ id: 'bx2', skill: 'palm', name: '群邪辟易', req: 0, range: 60, cd: 0.6, dmg: 13, aoe: 60, color: '#d04070', fx: 'bixie' });
MOVES.push({ id: 'bx3', skill: 'palm', name: '鍾馗抉目', req: 0, range: 70, cd: 0.7, dmg: 18, aoe: 0, color: '#e05080', fx: 'bixie' });
// 獨孤九劍九式：總訣式是根本；其餘八式要「見過」對應敵人（觀破值）才悟得出
export const DUGU = [
  { id: 'dg0', name: '總訣式', foes: [], need: 0, dmg: 16 },
  { id: 'dg1', name: '破劍式', foes: ['hermit', 'swordtomb'], need: 30, dmg: 24 },
  { id: 'dg2', name: '破刀式', foes: ['bandit', 'chief'], need: 30, dmg: 22 },
  { id: 'dg3', name: '破槍式', foes: ['post'], need: 30, dmg: 22 },
  { id: 'dg4', name: '破鞭式', foes: ['chief'], need: 30, dmg: 22 },
  { id: 'dg5', name: '破索式', foes: ['python', 'pythonking'], need: 30, dmg: 26 },
  { id: 'dg6', name: '破掌式', foes: ['ape', 'whiteape', 'bear'], need: 50, dmg: 28 },
  { id: 'dg7', name: '破箭式', foes: ['archer'], need: 40, dmg: 24 },
  { id: 'dg8', name: '破氣式', foes: ['peakguard'], need: 60, dmg: 36, inner: true },
];
for (const f of DUGU) MOVES.push({ id: f.id, skill: 'palm', name: f.name, req: 0, range: 80, cd: 1.0, dmg: f.dmg, aoe: f.id === 'dg0' || f.inner ? 70 : 0, color: '#9fb8d8', fx: 'dugu' });
export const HS = { zxNeed: 240, carvPer: 1, carvInsight: 6, cleanDays: 7, zxMoodMin: 60, zxDingMin: 4, zxPow: 0.03, zxGuard: 0.03, bixieDayPow: 0.04, bixieCap: 0.6, songEvery: 4, fengNights: 3, softP: 0.05, duguHeal: 1, secondWind: 0.5, windHp: 0.5 };

// ---- v1.3 江湖群像（ROADMAP §13.8–13.11）：神鵰、倚天、鹿鼎、功夫 ----
const A13 = (id, name, school, grade, tags, moves, extra = {}) => { ARTS.push({ id, name, school, grade, tags, req: [], techs: moves.map((m) => m[0]), tech: moves[0]?.[0], secret: true, classic: true, ...extra });
  for (const [mid, mn, cd, dmg, aoe, color] of moves) MOVES.push({ id: mid, skill: school === 'leg' ? 'leg' : 'palm', name: mn, req: 0, range: 60 + aoe / 2, cd, dmg, aoe, color, fx: id }); };
A13('anran', '黯然銷魂掌', 'palm', 4, ['柔', '情'], [['ar1', '心驚肉跳', 1.2, 18, 0, '#7a8ca8'], ['ar2', '杞人憂天', 1.4, 22, 60, '#6a7c98'], ['ar3', '拖泥帶水', 1.8, 32, 90, '#5a6c88']], { signature: 'yangguo' });
A13('xuantie', '玄鐵劍法', 'palm', 3, ['剛', '拙'], [['xt1', '重劍無鋒', 1.6, 30, 70, '#3a3a3a']], { signature: 'yangguo' });
A13('yunv', '玉女心經', 'palm', 3, ['巧', '靈'], [['yn1', '小園藝菊', 0.8, 12, 0, '#e8e8f8'], ['yn2', '西窗夜話', 1.0, 16, 50, '#d8dcf8']], { signature: 'xiaolongnv' });
A13('zuoyou', '左右互搏', 'palm', 3, ['巧'], [], { signature: 'zhoubotong', effect: 'twin' });
A13('kongming', '空明拳', 'palm', 3, ['柔'], [['km1', '空碗盛飯', 0.9, 13, 0, '#c8d8c8'], ['km2', '妙手空空', 1.2, 19, 50, '#b8c8b8']], { signature: 'zhoubotong' });
A13('kuihua', '葵花寶典', 'leg', 4, ['快'], [['kh1', '繡花針', 0.35, 8, 0, '#d04050']], { signature: 'dongfangbubai' });
A13('huagu', '化骨綿掌', 'palm', 4, ['柔', '陰'], [['hg1', '化骨綿掌', 1.6, 34, 0, '#9a8aa8']], { signature: 'haidafu' });
A13('jiuyang', '九陽神功', 'palm', 3, ['剛', '內'], [], { signature: 'zhangwuji' });
A13('qiankun', '乾坤大挪移', 'palm', 4, ['巧'], [['qk1', '借力打力', 1.2, 20, 40, '#e0a040']], { signature: 'zhangwuji' });
A13('taiji', '太極拳', 'palm', 3, ['柔'], [['tj1', '攬雀尾', 1.0, 12, 0, '#d8d8d8'], ['tj2', '雲手', 1.2, 16, 60, '#c8c8c8']], { signature: 'zhangwuji' });
A13('shihou', '獅子吼', 'palm', 3, ['剛'], [['sh1', '獅子吼', 2.0, 18, 140, '#f0d070']], { signature: 'baozupo' });
A13('tantui', '十二路譚腿', 'leg', 2, ['剛'], [['tt1', '十二路譚腿', 0.8, 14, 0, '#a07040']], { hint: '深藏不露的雜工身懷此功：斧頭幫上山勒索時讓他出手才會現身' });
A13('tiexian', '洪家鐵線拳', 'palm', 2, ['剛'], [['tx1', '鐵線拳', 1.0, 16, 0, '#808890']], { hint: '深藏不露的雜工身懷此功：斧頭幫上山勒索時讓他出手才會現身' });
A13('bagua', '五郎八卦棍', 'leg', 2, ['剛'], [['bg1', '五郎八卦棍', 1.0, 15, 50, '#8a6a3a']], { hint: '深藏不露的雜工身懷此功：斧頭幫上山勒索時讓他出手才會現身' });
A13('hama', '蛤蟆功', 'palm', 4, ['剛', '蓄'], [['hm1', '蛤蟆功', 2.2, 40, 60, '#6a8a3a']], { signature: 'huoyunxieshen' });
export const JH = {
  comedyWeek: 2, comedyDays: 7, morningOpts: 3,
  anranMood: 30, anranMax: 1.5, twin: 1.3, kongming: 1.15, pair: 0.25,
  gambleBase: 2, gambleCap: 6, recruitBonus: 0.4, baoyi: 0.5, reflect: 0.3, jiuyangSta: 30,
  hiddenMax: 3, hiddenP: 0.35, residueXp: 20, dfbbPow: 40, hyPow: 50, diaoFeeds: 3, honeyHeal: 15,
};
Object.assign(TRAITS, { quiet: { name: '清冷', desc: '心情起伏減半，不喜熱鬧', mods: { train: 1.05, leisure: 0.9 } }, chi: { name: '癡', desc: '心情隨意中人起伏', mods: {} } });

// ---- v1.55a 合併敵人表：家裡用的地圖走速與立繪掛在 ENEMIES[k].home；ring＝牠在巡山第幾環（族群歸屬）----
Object.assign(ENEMIES.rat, { home: { speed: 40, sprite: 'rat' } }); Object.assign(ENEMIES.boar, { home: { speed: 28, sprite: 'boar' } });
for (const [k, e] of Object.entries(ENEMIES)) { const i = ROUTE.findIndex((g) => g.roster.some(([x]) => x === k)); e.ring = i >= 0 ? ROUTE[i].id : null; }
ENEMIES.rat.ring = 'foot'; // 山鼠不在巡山名單，棲在山腳
for (const [k, e] of Object.entries(ENEMIES)) if (e.home) MONSTERS[k] = { name: e.name, hp: e.hp, speed: e.home.speed, dmg: e.dmg, sprite: e.home.sprite, ring: e.ring };

// ---- v1.6 補建築（ROADMAP §19、DESIGN-REVIEW §1.2）：全部是 smart object 資料 ----
// 新活動用資料宣告：gen＝{ base 基礎分, why 理由, cond 條件名（見 sim GEN_COND）, perDay 每日全派上限 }；eff＝完成時效果（sim applyEff 解讀）
// eff 鍵：res{k:+n} 入庫（受 cap 限）、use{k:n} 消耗（不夠就不做）、hp、mood、rep、wexin（−層數）、allMood（全派心情）、alt（use 不夠時改用的效果）
Object.assign(NODES, { library: [1235, 300], quiet: [1265, 395], shrine: [1110, 255], alchemy: [705, 335], clinic: [870, 470], guest: [860, 290], well: [1035, 655], bell: [1040, 325], sig: [1290, 480] });
EDGES.push(['hall', 'library'], ['yard', 'quiet'], ['hall', 'shrine'], ['kitchen', 'alchemy'], ['mid', 'clinic'], ['dormP', 'guest'], ['s1', 'well'], ['court', 'bell'], ['yard', 'sig']);
const B = (id, name, node, built, cost, work, offers, extra = {}, rep = 0) => ({ id, name, node, v16: true, stages: [{ name: '空地', sprite: null, offers: [] }, { name: built, sprite: null, offers, cost, work, rep: rep || undefined, ...extra }] });
FACILITIES.push(
  B('library', '藏經閣', 'library', '藏經閣', { wood: 10, stone: 6, coin: 6 }, 26, ['study'], { slots: { study: 2 } }, 15),
  B('quiet', '靜室', 'quiet', '靜室', { wood: 6, stone: 4 }, 18, ['meditate'], { slots: { meditate: 2 }, medEase: 2 }),
  B('shrine', '祠堂', 'shrine', '祠堂', { wood: 8, stone: 6, coin: 4 }, 22, ['worship'], { slots: { worship: 2 } }, 10),
  B('alchemy', '丹房', 'alchemy', '丹房', { wood: 6, stone: 8, coin: 6 }, 24, ['brew'], { slots: { brew: 1 } }, 12),
  B('clinic', '醫館', 'clinic', '醫館', { wood: 8, stone: 4, coin: 4 }, 20, ['heal'], { slots: { heal: 2 } }),
  B('guest', '客房', 'guest', '客房', { wood: 10, stone: 4, coin: 6 }, 22, ['host'], { slots: { host: 1 } }, 18),
  B('well', '井', 'well', '水井', { stone: 6 }, 14, ['water'], { slots: { water: 2 } }),
  B('bell', '鐘樓', 'bell', '鐘樓', { wood: 8, stone: 6 }, 20, ['bell'], { slots: { bell: 1 } }, 8),
  B('watch', '哨崗', 'guard', '護山哨', { wood: 8, stone: 4 }, 18, ['watch'], { slots: { watch: 1 } }),
  // 鎮派建築的地：不能從藍圖蓋，跟著「鎮派」落成一起開（sect.buildFac 把 stage 設成 1）；活動內容依門派查 SIG_ACTS
  { id: 'sig', name: '鎮派地', node: 'sig', v16: true, sig: true, stages: [{ name: '空地', sprite: null, offers: [] }, { name: '鎮派建築', sprite: null, offers: ['sig'], slots: { sig: 2 }, noBlueprint: true }] },
);
Object.assign(ACTIVITIES, {
  study:   { name: '藏經閣研讀', dur: 10, energy: -4, skill: { style: 3 }, gen: { base: 40, why: '去藏經閣翻殘頁', cond: 'always' }, eff: { pageXP: 1 } },
  worship: { name: '祠堂上香', dur: 6, energy: -1, gen: { base: 46, why: '給祖師爺上炷香', cond: 'always', perDay: 3 }, eff: { mood: 6, rep: 0.3 } },
  brew:    { name: '丹房煉藥', dur: 12, energy: -6, skill: { herbal: 5 }, gen: { base: 34, why: '藥材夠了，煉療傷丹', cond: 'herb2' }, eff: { use: { herb: 2 }, res: { pill: 1 } } },
  heal:    { name: '醫館治傷', dur: 8, gen: { base: 115, why: '傷得不輕，去醫館', cond: 'injured', layer: 'need' }, eff: { use: { pill: 1 }, hp: 45, alt: { use: { herb: 1 }, hp: 25, alt: { hp: 12 } } } },
  host:    { name: '客房待客', dur: 8, social: 20, gen: { base: 36, why: '打掃客房、陪客人說話', cond: 'always', perDay: 2 }, eff: { rep: 0.5, mood: 3 } },
  water:   { name: '挑水', dur: 8, energy: -7, skill: { strength: 4 }, carry: { water: 2 }, gen: { base: 50, why: '水缸見底，去挑水', cond: 'water' } },
  bell:    { name: '敲晨鐘', dur: 4, energy: -1, gen: { base: 90, why: '天亮了，去敲晨鐘', cond: 'bell', perDay: 1 }, eff: { allMood: 3 } },
  watch:   { name: '護山哨瞭望', dur: 10, energy: -5, skill: { agility: 3 }, gen: { base: 40, why: '上哨崗守獸道', cond: 'always', perDay: 4 }, eff: { watch: 1 } },
  sig:     { name: '鎮派功課', dur: 8, gen: { base: 48, why: '鎮派建築的功課', cond: 'always' } }, // 實際名稱／時長／效果見 SIG_ACTS
});
// 7 座鎮派建築各自的活動（sect id → 活動資料，形狀同上）
export const SIG_ACTS = {
  gaibang:   { name: '沿村乞討', dur: 10, energy: -6, perDay: 3, why: '打狗棒堂：沿村討口飯', eff: { res: { food: 2 } } },
  qizong:    { name: '思過崖面壁', dur: 12, energy: -3, perDay: 2, why: '思過崖：面壁思過', eff: { wexin: 1, mood: 2 } },
  jianzong:  { name: '酒窖品酒', dur: 6, fun: 35, perDay: 3, why: '酒窖：喝兩口好酒', eff: { mood: 5 } },
  mingjiao:  { name: '護聖火', dur: 10, energy: -8, skill: { style: 5 }, perDay: 4, why: '聖火壇：守火練功', eff: {} },
  tiandihui: { name: '拜香堂收會費', dur: 8, energy: -3, perDay: 3, why: '香堂：拜香收會費', eff: { res: { coin: 2 } } },
  zhulong:   { name: '大雜院收租', dur: 8, energy: -4, perDay: 2, why: '大雜院：挨家收租', eff: { res: { coin: 1, food: 1 } } },
  wuming:    { name: '祖師堂祭祖', dur: 6, energy: -1, perDay: 2, why: '祖師堂：祭拜開山祖師', eff: { rep: 0.5, mood: 3 } },
};
RES_NAMES.water = '水'; RES_NAMES.pill = '療傷丹';

// v1.65 傳功（夥伴活動，由 bonds.mjs 判斷誰傳誰）
ACTIVITIES.pass = { name: '傳功', dur: 20, energy: -4 };
// ---- v1.7 四大武道相剋環（ADOPTION A17）：破綻→蓄力→卸力→歸真→破綻（前者剋後者）----
// 弟子的武道＝最熟那門武學的 tag；敵人的武道直接查表。v1.46 試玩：巡山／來犯威脅偏低、開局弱，故只取 ±10%，不讓相剋左右勝負
export const DAO = { tagOf: { 巧: '破綻', 剛: '蓄力', 柔: '卸力', 拙: '歸真' }, ring: ['破綻', '蓄力', '卸力', '歸真'], up: 1.1, down: 0.9,
  enemy: { rat: '破綻', hare: '破綻', wolf: '破綻', snake: '破綻', archer: '破綻', bat: '破綻', vulture: '破綻', hermit: '破綻',
    boar: '蓄力', boars: '蓄力', bear: '蓄力', bandit: '蓄力', chief: '蓄力', ape: '蓄力', whiteape: '蓄力',
    wolfking: '破綻', post: '蓄力', python: '卸力', pythonking: '卸力', swordtomb: '歸真', peakguard: '歸真' } };
// ---- v1.76 糧食安全閘（BALANCE-REPORT-v175 P0）：存糧＋菜 < 每人 perHead 份 → 種菜升為需求層、其餘非必要活動 ×gateMul ----
export const FOOD_SEC = { perHead: 1.5, farm: 75, gateMul: 0.35, keep: ['eat', 'rest', 'farm', 'cook', 'heal', 'watch', 'trial', 'build', 'deliver'] };
