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
  ] },
  { id: 'yard', name: '外功場', node: 'yard', stages: [
    { name: '空地', sprite: null, offers: ['train'], trainMul: 1 },
    { name: '木樁場', sprite: null, offers: ['train', 'spar'], trainMul: 1.6, dummies: 3, cost: { wood: 6 }, work: 15 },
  ] },
  { id: 'dorm', name: '宿舍', node: 'dorm', stages: [
    { name: '破寢舍', sprite: 'dorm_s0', offers: [] },
    { name: '小寢舍', sprite: 'dorm_s1', offers: ['rest'], restRate: 8, beds: 2, cost: { wood: 6 }, work: 18 },
    { name: '宿舍', sprite: 'dorm_s1', offers: ['rest'], restRate: 8, beds: 6, cost: { wood: 10, stone: 4 }, work: 24, rep: 12 },
  ] },
  { id: 'kitchen', name: '膳房', node: 'kitchen', stages: [
    { name: '露天灶', sprite: 'vat', offers: ['cook', 'eat'], cookDur: 12, cookYield: 3, mealBonus: 0 },
    { name: '膳房', sprite: 'kitchen_s1', offers: ['cook', 'eat'], cookDur: 6, cookYield: 4, mealBonus: 15, cost: { wood: 8 }, work: 20 },
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
];

export const MONSTERS = {
  rat:  { name: '山鼠', hp: 10, speed: 40, dmg: 2, sprite: 'rat' },
  boar: { name: '野豬', hp: 40, speed: 28, dmg: 6, sprite: 'boar' },
};
export const WAVES = [
  [{ t: 0, k: 'rat' }, { t: 2, k: 'rat' }, { t: 4, k: 'rat' }, { t: 7, k: 'boar' }],
];

export const DISCIPLES = [
  { id: 'hero', name: '主角', adult: true, sprite: 'hero', style: 'palm', skills: { leg: 2, palm: 10, strength: 10, farming: 5, herbal: 5, agility: 10, cooking: 3 }, traits: { diligent: 1.2 }, personality: ['diligent', 'worrier'] },
  { id: 'senior', name: '林師姐', adult: true, sprite: 'senior', style: 'leg', skills: { leg: 10, palm: 5, strength: 5, farming: 15, herbal: 10, agility: 12, cooking: 10 }, traits: { social: 1.3 }, personality: ['gentle', 'optimist'] },
  { id: 'cousin', name: '堂弟', adult: false, sprite: 'cousin', style: 'leg', skills: { leg: 3, palm: 0, strength: 2, farming: 3, herbal: 8, agility: 15, cooking: 2 }, traits: { playful: 1.4 }, personality: ['playful', 'glutton'] },
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
  { id: 'shitou', name: '石頭', adult: true, sprite: 'hero', style: 'leg', skills: { leg: 8, palm: 2, strength: 14, farming: 4, herbal: 2, agility: 8, cooking: 2 }, traits: {}, personality: ['brave', 'glutton'] },
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
  glutton: { name: '貪吃', desc: '吃得好心情就好，餓了特別煩', mods: { eat: 1.3 }, thoughtMul: { food: 1.8 } },
};
// 想法（記憶）：值、持續秒數、分類（給 thoughtMul 用）
export const THOUGHTS = {
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
  workedWith:{ text: '和人一起幹活', v: 3, ttl: 200, tag: 'social' },
};
export const NEED_MOOD = { hunger: [20, -10, 'food'], energy: [30, -8, 'bad'], social: [25, -6, 'social'], fun: [25, -6, 'bad'] };
export const MOOD = { base: 50, up: 3, down: 2, low: 30, high: 70 }; // 每秒向目標移動；低／高門檻
export const WORK_ACTS = ['train', 'chop', 'quarry', 'build', 'spar']; // 低落時被壓低的「可延後」工作；種菜煮飯屬求生，不壓，避免餓→低落→不煮的死亡螺旋
export const LEISURE_ACTS = ['rest', 'chat', 'forage', 'eat', 'leisure'];

// ---- v0.7 ----
export const RULES_VERSION = '0.8';
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
export const RES_NAMES = { wood: '木', stone: '石', coin: '香火錢', veg: '菜', food: '飯', herb: '藥' };
// 雇工能做的事（不練武、不聽講、不下廚種菜）；幹活時分數加成
export const LABOR_ACTS = ['rest', 'eat', 'chat', 'leisure', 'chop', 'quarry', 'build'];
export const LABOR_WORK_MUL = 1.4;
// 根骨（隱藏潛力 1–5）：與弟子一起幹活／聊天累積「共事」秒數後揭露；≥ inviteMin 且弟子平均好感 ≥ inviteAff 可邀入門
export const ROOT = { revealAt: 240, inviteMin: 3, inviteAff: 18, names: ['', '平平', '尚可', '中上', '良材', '奇才'] };
export const LABOR_POOL = [
  { id: 'dazhu', name: '大柱', adult: true, sprite: 'hero', style: 'palm', root: 4, skills: { leg: 2, palm: 3, strength: 14, farming: 4, herbal: 1, agility: 7, cooking: 2 }, traits: {}, personality: ['diligent', 'glutton'] },
  { id: 'erya', name: '二丫', adult: true, sprite: 'senior', style: 'leg', root: 2, skills: { leg: 3, palm: 1, strength: 7, farming: 9, herbal: 6, agility: 10, cooking: 8 }, traits: { social: 1.2 }, personality: ['sociable', 'optimist'] },
  { id: 'laohuang', name: '老黃', adult: true, sprite: 'hero', style: 'palm', root: 1, skills: { leg: 1, palm: 2, strength: 11, farming: 8, herbal: 3, agility: 5, cooking: 5 }, traits: {}, personality: ['gentle', 'worrier'] },
  { id: 'xiaoliu', name: '小六', adult: true, sprite: 'cousin', style: 'leg', root: 5, skills: { leg: 6, palm: 2, strength: 6, farming: 3, herbal: 4, agility: 14, cooking: 1 }, traits: { playful: 1.2 }, personality: ['playful', 'brave'] },
  { id: 'achun', name: '阿春', adult: true, sprite: 'senior', style: 'palm', root: 3, skills: { leg: 2, palm: 4, strength: 8, farming: 7, herbal: 9, agility: 9, cooking: 9 }, traits: {}, personality: ['gentle', 'diligent'] },
  { id: 'tiezi', name: '鐵子', adult: true, sprite: 'hero', style: 'leg', root: 2, skills: { leg: 5, palm: 3, strength: 13, farming: 2, herbal: 1, agility: 8, cooking: 2 }, traits: {}, personality: ['brave', 'worrier'] },
];
