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
};
export const EDGES = [['hall', 'court'], ['court', 'yard'], ['court', 'dormP'], ['dormP', 'dorm'], ['court', 'mid'], ['mid', 'kitchen'], ['mid', 'south'], ['south', 's1'], ['s1', 's2'], ['s2', 's3'], ['s3', 'g1'], ['g1', 'g2'], ['g2', 'g3'], ['g3', 'forest'], ['forest', 'g4'], ['g4', 'g5'], ['g5', 'g6'], ['g6', 'herb'], ['forest', 'forest2'], ['s1', 'e1'], ['e1', 'e2'], ['e2', 'e3'], ['e3', 'e4'], ['e4', 'e5'], ['e5', 'v1'], ['v1', 'v2'], ['v2', 'gate'], ['e2', 'veg'], ['e5', 'e6'], ['e6', 'trail1'], ['trail1', 't2a'], ['t2a', 'trail2'], ['trail2', 't3'], ['t3', 't4'], ['t4', 'guard'], ['guard', 't5'], ['t5', 't6'], ['t6', 'den']];

// 設施：每階段宣告提供的活動（smart object）。stage 0 = 荒廢/空地。
export const FACILITIES = [
  { id: 'hall', name: '大廳', node: 'hall', stages: [
    { name: '破道館', sprite: 'hall_s0', offers: ['rest', 'learn'], restRate: 3, beds: 3, learnDur: 8 },
    { name: '大廳', sprite: 'hall_s1', offers: ['rest', 'learn'], restRate: 4, beds: 2, learnDur: 4, cost: { wood: 12 }, work: 30, rep: 20 },
  ] },
  { id: 'yard', name: '外功場', node: 'yard', stages: [
    { name: '空地', sprite: null, offers: ['train'], trainMul: 1 },
    { name: '木樁場', sprite: null, offers: ['train', 'spar'], trainMul: 1.6, dummies: 3, cost: { wood: 6 }, work: 15 },
  ] },
  { id: 'dorm', name: '宿舍', node: 'dorm', stages: [
    { name: '破寢舍', sprite: 'dorm_s0', offers: [] },
    { name: '小寢舍', sprite: 'dorm_s1', offers: ['rest'], restRate: 8, beds: 2, cost: { wood: 6 }, work: 18 },
    { name: '宿舍', sprite: 'dorm_s1', offers: ['rest'], restRate: 8, beds: 6, cost: { wood: 10 }, work: 24, rep: 12 },
  ] },
  { id: 'kitchen', name: '膳房', node: 'kitchen', stages: [
    { name: '露天灶', sprite: 'vat', offers: ['cook', 'eat'], cookDur: 12, cookYield: 3, mealBonus: 0 },
    { name: '膳房', sprite: 'kitchen_s1', offers: ['cook', 'eat'], cookDur: 6, cookYield: 4, mealBonus: 15, cost: { wood: 8 }, work: 20 },
  ] },
  { id: 'veg', name: '菜園', node: 'veg', stages: [{ name: '荒地菜畦', sprite: 'grass', offers: ['farm'], plots: 4 }] },
  { id: 'herb', name: '藥園', node: 'herb', stages: [{ name: '野藥圃', sprite: 'herb', offers: ['forage'] }] },
  { id: 'forest', name: '林緣枯木', node: 'forest2', stages: [{ name: '枯木', sprite: 'log', offers: ['chop'] }] },
  { id: 'store', name: '院倉', node: 'court', stages: [{ name: '柴堆', sprite: 'woodpile', offers: ['chat'] }] },
];

// 活動：時間、需求變化、技能經驗、產出
export const ACTIVITIES = {
  rest:   { name: '歇息', dur: 10, need: { energy: 'rate' } },
  eat:    { name: '用飯', dur: 5, use: { food: 1 }, need: { hunger: 60 } },
  farm:   { name: '種菜', dur: 8, energy: -8, skill: { farming: 6 } }, // 播種或收成，見 sim plots
  cook:   { name: '煮飯', dur: 0, energy: -3, skill: { cooking: 6 } }, // dur 由灶階段決定
  forage: { name: '採藥', dur: 8, energy: -6, skill: { herbal: 6 }, carry: { herb: 1 } },
  chop:   { name: '砍柴', dur: 8, energy: -8, skill: { strength: 5 }, carry: { wood: 1 } },
  train:  { name: '練功', dur: 10, energy: -10, skill: { style: 5 } }, // style＝弟子主修路數
  spar:   { name: '切磋', dur: 8, energy: -10, skill: { style: 4 } },
  learn:  { name: '聽師父講武', dur: 8, energy: -2, skill: { palm: 3 }, social: 10 },
  build:  { name: '施工', dur: 6, energy: -6, skill: { strength: 2 } },
  chat:   { name: '聊天', dur: 6, social: 35 },
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
  { id: 'hero', name: '主角', adult: true, sprite: 'hero', style: 'palm', skills: { leg: 2, palm: 10, strength: 10, farming: 5, herbal: 5, agility: 10, cooking: 3 }, traits: { diligent: 1.2 } },
  { id: 'senior', name: '林師姐', adult: true, sprite: 'senior', style: 'leg', skills: { leg: 10, palm: 5, strength: 5, farming: 15, herbal: 10, agility: 12, cooking: 10 }, traits: { social: 1.3 } },
  { id: 'cousin', name: '堂弟', adult: false, sprite: 'cousin', style: 'leg', skills: { leg: 3, palm: 0, strength: 2, farming: 3, herbal: 8, agility: 15, cooking: 2 }, traits: { playful: 1.4 } },
];

export const REL_STAGES = [[0, '陌生'], [20, '相識'], [45, '好友'], [70, '知己'], [90, '道侶']];
export const BASE_SPEED = 55; // px/s

// 日夜與作息（v0.2）：一日 600 遊戲秒
export const DAY = 600;
export const PHASES = [[0, 'dawn', '晨'], [0.2, 'day', '日'], [0.65, 'dusk', '暮'], [0.8, 'night', '夜']];
export const SCHEDULE = {
  dawn: { train: 1.5, learn: 1.2 },
  day: { farm: 1.2, chop: 1.2, cook: 1.1, forage: 1.1, build: 1.2 },
  dusk: { eat: 1.4, chat: 1.6, cook: 1.3 },
  night: { rest: 2.2, train: 0.3, chop: 0.2, farm: 0.2, forage: 0.2, build: 0.3, chat: 0.6 },
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
  { id: 'aqing', name: '阿青', adult: true, sprite: 'hero', style: 'palm', skills: { leg: 3, palm: 6, strength: 8, farming: 6, herbal: 4, agility: 9, cooking: 4 }, traits: { diligent: 1.3 } },
  { id: 'shitou', name: '石頭', adult: true, sprite: 'hero', style: 'leg', skills: { leg: 8, palm: 2, strength: 14, farming: 4, herbal: 2, agility: 8, cooking: 2 }, traits: {} },
  { id: 'xiaomei', name: '小梅', adult: true, sprite: 'senior', style: 'palm', skills: { leg: 2, palm: 4, strength: 4, farming: 10, herbal: 14, agility: 11, cooking: 12 }, traits: { social: 1.4 } },
  { id: 'laoqi', name: '老七', adult: true, sprite: 'hero', style: 'leg', skills: { leg: 6, palm: 6, strength: 10, farming: 12, herbal: 6, agility: 7, cooking: 8 }, traits: { diligent: 1.1 } },
];
