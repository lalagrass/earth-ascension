// 資料驅動定義：地圖節點、設施階段、活動、武學、角色。改數值只動這裡。
export const WORLD = { w: 1600, h: 1000 };

// 路網節點（加權路徑；長山路刻意保留距離）
export const NODES = {
  gate: [800, 900], court: [800, 600], hall: [800, 420], yard: [1050, 620],
  dorm: [560, 560], kitchen: [600, 760], veg: [380, 800], herb: [1000, 820],
  well: [1180, 800], forest: [250, 480], forest2: [120, 300],
  trail1: [1250, 420], trail2: [1380, 260], guard: [1450, 170], den: [1560, 60],
};
export const EDGES = [
  ['gate', 'court'], ['court', 'hall'], ['court', 'yard'], ['court', 'dorm'], ['court', 'kitchen'],
  ['kitchen', 'veg'], ['court', 'herb'], ['herb', 'well'], ['yard', 'well'], ['dorm', 'forest'],
  ['forest', 'forest2'], ['yard', 'trail1'], ['trail1', 'trail2'], ['trail2', 'guard'], ['guard', 'den'],
];

// 設施：每階段宣告提供的活動（smart object）。stage 0 = 荒廢/空地。
export const FACILITIES = [
  { id: 'hall', name: '大廳', node: 'hall', stages: [
    { name: '破道館', sprite: 'hall_s0', offers: ['rest', 'learn'], restRate: 3 },
  ] },
  { id: 'yard', name: '外功場', node: 'yard', stages: [
    { name: '空地', sprite: null, offers: ['train'] },
  ] },
  { id: 'dorm', name: '宿舍', node: 'dorm', stages: [
    { name: '破寢舍', sprite: 'dorm_s0', offers: [] },
    { name: '小寢舍', sprite: 'dorm_s1', offers: ['rest'], restRate: 8, cost: { wood: 6 }, work: 18 },
  ] },
  { id: 'kitchen', name: '膳房', node: 'kitchen', stages: [
    { name: '露天灶', sprite: 'vat', offers: ['eat'] },
  ] },
  { id: 'veg', name: '菜園', node: 'veg', stages: [{ name: '荒地菜畦', sprite: 'grass', offers: ['farm'] }] },
  { id: 'herb', name: '藥園', node: 'herb', stages: [{ name: '野藥圃', sprite: 'herb', offers: ['forage'] }] },
  { id: 'forest', name: '林緣枯木', node: 'forest2', stages: [{ name: '枯木', sprite: 'log', offers: ['chop'] }] },
  { id: 'store', name: '院倉', node: 'court', stages: [{ name: '柴堆', sprite: 'woodpile', offers: ['chat'] }] },
];

// 活動：時間、需求變化、技能經驗、產出
export const ACTIVITIES = {
  rest:   { name: '歇息', dur: 10, need: { energy: 'rate' } },
  eat:    { name: '用飯', dur: 5, use: { food: 1 }, need: { hunger: 60 } },
  farm:   { name: '種菜', dur: 10, energy: -8, skill: { farming: 6 }, carry: { food: 2 } },
  forage: { name: '採藥', dur: 8, energy: -6, skill: { herbal: 6 }, carry: { herb: 1 } },
  chop:   { name: '砍柴', dur: 8, energy: -8, skill: { strength: 5 }, carry: { wood: 1 } },
  train:  { name: '練掌', dur: 10, energy: -10, skill: { palm: 5 } },
  learn:  { name: '聽師父講武', dur: 8, energy: -2, skill: { palm: 3 }, social: 10 },
  build:  { name: '施工', dur: 6, energy: -6, skill: { strength: 2 } },
  chat:   { name: '聊天', dur: 6, social: 35 },
};

// 武學：熟練門檻解鎖；範圍/冷卻/傷害由 palm 技能放大
export const MOVES = [
  { id: 'fist', name: '基礎拳', req: 0, range: 34, cd: 1.0, dmg: 4, aoe: 0, color: '#8a6a4a' },
  { id: 'push', name: '推山掌', req: 25, range: 60, cd: 1.6, dmg: 8, aoe: 0, color: '#b0482e' },
  { id: 'wave', name: '迴風掌', req: 60, range: 80, cd: 3.0, dmg: 7, aoe: 70, color: '#3d6b8a' },
];

export const MONSTERS = {
  rat:  { name: '山鼠', hp: 10, speed: 40, dmg: 2, sprite: 'rat' },
  boar: { name: '野豬', hp: 40, speed: 28, dmg: 6, sprite: 'boar' },
};
export const WAVES = [
  [{ t: 0, k: 'rat' }, { t: 2, k: 'rat' }, { t: 4, k: 'rat' }, { t: 7, k: 'boar' }],
];

export const DISCIPLES = [
  { id: 'hero', name: '主角', adult: true, sprite: 'hero', skills: { palm: 10, strength: 10, farming: 5, herbal: 5, agility: 10 }, traits: { diligent: 1.2 } },
  { id: 'senior', name: '林師姐', adult: true, sprite: 'senior', skills: { palm: 5, strength: 5, farming: 15, herbal: 10, agility: 12 }, traits: { social: 1.3 } },
  { id: 'cousin', name: '堂弟', adult: false, sprite: 'cousin', skills: { palm: 0, strength: 2, farming: 3, herbal: 8, agility: 15 }, traits: { playful: 1.4 } },
];

export const REL_STAGES = [[0, '陌生'], [20, '相識'], [45, '好友'], [70, '知己'], [90, '道侶']];
export const BASE_SPEED = 55; // px/s
