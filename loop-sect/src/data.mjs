// 所有可調的內容與數值都放這裡；規則檔只讀不改。

export const TICKS_PER_DAY = 1440;          // 1 tick = 1 遊戲分鐘
export const TICKS_PER_SECOND = 20;         // 1× 時每真實秒的 tick 數
export const BASE_SPEED = 0.2;              // 格／tick（M3 由 0.12 調高，見 LOOP_LOG loop 3）

export const ATTRS = [
  { id: 'gen', label: '根骨', desc: '體魄與耐力，影響精力與外功成長' },
  { id: 'wu', label: '悟性', desc: '理解與領悟，影響學習與開竅' },
  { id: 'shen', label: '身法', desc: '輕靈敏捷，影響走路與閃避' },
  { id: 'li', label: '膂力', desc: '力氣，影響搬運與勞動' },
  { id: 'ding', label: '定力', desc: '專注與心性，影響修練與抗壓' },
];
export const ATTR_TOTAL = 25;
export const ATTR_MIN = 1;
export const ATTR_MAX = 10;

// 四軸：正值是 E / N / F / P，負值是 I / S / T / J。
export const AXES = [
  { id: 'E', pos: 'E', neg: 'I', posLabel: '外向', negLabel: '內向' },
  { id: 'N', pos: 'N', neg: 'S', posLabel: '直覺', negLabel: '實感' },
  { id: 'F', pos: 'F', neg: 'T', posLabel: '情感', negLabel: '思考' },
  { id: 'P', pos: 'P', neg: 'J', posLabel: '隨性', negLabel: '條理' },
];

// 每題兩個選項，各推一軸 ±0.5。
export const QUESTIONS = [
  { q: '初到陌生市集，你會……', a: [['找攤販聊聊，打聽消息', { E: 0.5 }], ['先在角落看清楚再說', { E: -0.5 }]] },
  { q: '練了一整天功，晚上你想……', a: [['和同門喝酒說笑', { E: 0.5 }], ['一個人靜坐調息', { E: -0.5 }]] },
  { q: '師父傳你一套拳，你先……', a: [['照著一招一式練熟', { N: -0.5 }], ['琢磨招式背後的道理', { N: 0.5 }]] },
  { q: '山裡有條沒人走過的小徑……', a: [['走熟路比較穩當', { N: -0.5 }], ['一定要去看看通到哪', { N: 0.5 }]] },
  { q: '同伴犯了錯害大家受累，你……', a: [['先問他還好嗎', { F: 0.5 }], ['先講清楚錯在哪', { F: -0.5 }]] },
  { q: '判斷一個人，你更看重……', a: [['他待人是否真誠', { F: 0.5 }], ['他做事是否有理', { F: -0.5 }]] },
  { q: '明天要出遠門，今晚你……', a: [['把行囊一件件備妥', { P: -0.5 }], ['明早再說，船到橋頭', { P: 0.5 }]] },
  { q: '一天的作息，你喜歡……', a: [['晨起練功、午後勞作、定時就寢', { P: -0.5 }], ['想做什麼就做什麼', { P: 0.5 }]] },
];

// 武俠人物模板：只是靈感標籤，名字與數值都可改。天賦總和皆為 25。
export const TEMPLATES = [
  { id: 'guojing', label: '憨直苦練', inspired: '郭靖', name: '石敬',
    axes: { E: -0.3, N: -0.8, F: 0.6, P: -0.8 }, attrs: { gen: 9, wu: 2, shen: 4, li: 6, ding: 4 },
    blurb: '資質平平卻肯下死功夫，待人厚道。' },
  { id: 'linghu', label: '灑脫不羈', inspired: '令狐沖', name: '柳沖',
    axes: { E: 0.8, N: 0.7, F: 0.5, P: 0.9 }, attrs: { gen: 4, wu: 8, shen: 7, li: 3, ding: 3 },
    blurb: '愛酒愛朋友，劍走偏鋒，最怕規矩。' },
  { id: 'qiaofeng', label: '豪邁俠義', inspired: '喬峰', name: '蕭峻',
    axes: { E: 0.7, N: -0.3, F: 0.3, P: -0.4 }, attrs: { gen: 7, wu: 4, shen: 4, li: 8, ding: 2 },
    blurb: '一身是膽，扛得起事，也最護著身邊人。' },
  { id: 'huangrong', label: '聰慧機變', inspired: '黃蓉', name: '黃苓',
    axes: { E: 0.6, N: 0.9, F: -0.2, P: 0.5 }, attrs: { gen: 2, wu: 10, shen: 6, li: 2, ding: 5 },
    blurb: '一點就透，鬼主意多，嘴上不饒人。' },
  { id: 'longnv', label: '清冷專一', inspired: '小龍女', name: '龍湘',
    axes: { E: -0.9, N: 0.4, F: 0.2, P: -0.6 }, attrs: { gen: 4, wu: 6, shen: 8, li: 1, ding: 6 },
    blurb: '不喜人多，心無旁騖，身法飄逸。' },
  { id: 'zhangsan', label: '沉潛悟道', inspired: '張三丰', name: '張岳',
    axes: { E: -0.5, N: 0.8, F: -0.5, P: 0.2 }, attrs: { gen: 5, wu: 8, shen: 3, li: 2, ding: 7 },
    blurb: '慢條斯理，愛想事情的本源，定力過人。' },
];

// 特質：軸 |值| ≥ 0.4 或天賦 ≥ 8 / ≤ 2 時出現。
export const TRAIT_RULES = [
  { id: 'social', label: '愛熱鬧', when: (a) => a.E >= 0.4, desc: '喜歡待在人多的地方' },
  { id: 'quiet', label: '喜清靜', when: (a) => a.E <= -0.4, desc: '喜歡獨處與安靜的角落' },
  { id: 'curious', label: '好奇', when: (a) => a.N >= 0.4, desc: '愛去遠處沒去過的地方' },
  { id: 'practical', label: '務實', when: (a) => a.N <= -0.4, desc: '待在熟悉的地方比較安心' },
  { id: 'kind', label: '心軟', when: (a) => a.F >= 0.4, desc: '在意別人的感受' },
  { id: 'cool', label: '冷靜', when: (a) => a.F <= -0.4, desc: '就事論事' },
  { id: 'free', label: '隨性', when: (a) => a.P >= 0.4, desc: '想到什麼做什麼，待不久' },
  { id: 'orderly', label: '有條理', when: (a) => a.P <= -0.4, desc: '照固定順序輪流做事' },
  { id: 'genius', label: '天資聰穎', when: (a, t) => t.wu >= 8, desc: '學東西快' },
  { id: 'slow', label: '開竅晚', when: (a, t) => t.wu <= 2, desc: '學得慢，但不代表學不深' },
  { id: 'sturdy', label: '筋骨奇佳', when: (a, t) => t.gen >= 8, desc: '耐操耐打' },
  { id: 'frail', label: '體弱', when: (a, t) => t.gen <= 2, desc: '容易累' },
  { id: 'light', label: '身輕如燕', when: (a, t) => t.shen >= 8, desc: '走得快' },
  { id: 'strong', label: '力大', when: (a, t) => t.li >= 8, desc: '扛得多' },
  { id: 'calm', label: '心如止水', when: (a, t) => t.ding >= 8, desc: '做事專注不易分心' },
];

// 地圖 64×40，字元見 M01 規格。用程式畫出固定版型，再以種子撒樹石。
export const MAP_W = 64;            // M19b 暫停中（loop 26）：試做值 80（往東加 16 欄溪東山林，舊的 64 欄不變）
export const VIEW_W = 64;           // 畫面一次看 64 欄，左右捲動
export const MAP_H = 40;

// 去處（POI）：M1 走動 AI 的候選。tags 決定個性加權。
export const POIS = [
  { id: 'yard', label: '院子', x: 31, y: 25, tags: { social: 1, home: 1 } },
  { id: 'hall', label: '道館內', x: 31, y: 18, tags: { home: 1, quiet: 0.3 } },
  { id: 'stream', label: '溪邊', x: 48, y: 15, tags: { quiet: 1 } },
  { id: 'bridge', label: '橋頭', x: 48, y: 25, tags: { social: 0.3 } },
  { id: 'woods', label: '林邊', x: 16, y: 20, tags: { quiet: 0.8 } },
  { id: 'slope', label: '石坡', x: 31, y: 7, tags: { quiet: 0.5 } },
  { id: 'berries', label: '莓叢', x: 26, y: 33, tags: { home: 0.2 } },
  { id: 'trail', label: '東山徑', x: 60, y: 30, tags: { quiet: 0.4 } },
  { id: 'deepwood', label: '林深處', x: 5, y: 10, tags: { quiet: 1 } },
];

export const NAMES = ['阿禾', '小滿', '石頭', '青竹', '墨言', '秋娘', '大牛', '雲生', '杏兒', '老顧'];

// ---------- M2 需求與自主生活 ----------
export const NEEDS = [
  { id: 'food', label: '飽食' },
  { id: 'energy', label: '精力' },
  { id: 'social', label: '交流' },
  { id: 'fun', label: '樂趣' },
];
export const NEED_DECAY = { food: 0.1, energy: 0.055, social: 0.045, fun: 0.035 };
export const WALK_ENERGY = 0.02;
export const FORCE = { food: 15, energy: 12 };   // 低於此值只顧自理
export const NIGHT_FROM = 22;
export const NIGHT_TO = 6;

// 物件：可站在物件格上使用；slots 是可同時使用的位置。
export const OBJECTS = [
  { kind: 'bed', label: '地鋪', slots: [[28, 15]] },
  { kind: 'bed', label: '地鋪', slots: [[30, 15]] },
  { kind: 'bed', label: '地鋪', slots: [[32, 15]] },
  { kind: 'table', label: '舊桌', slots: [[33, 19], [34, 19], [33, 20], [34, 20]] },
  { kind: 'hearth', label: '灶', slots: [[34, 26]] },
  { kind: 'bench', label: '溪邊石凳', slots: [[47, 14]] },
  { kind: 'bench', label: '院中石凳', slots: [[29, 27]] },
];
export const BUSH_MAX = 4;
export const BUSH_REGROW = 240;
export const START_STOCK = { raw: 6, meal: 3 }; // M16 藥草 stock.herb 收成時才加上（舊情境的雜湊不變）
// M22 睡前先吃：飽食 < FOOD 時，越累越想先吃一口再睡。
export const SUPPER = { FOOD: 60, K: 0 }; // 暫停中（loop 25）：K 0 時跟以前一樣；試做值 K 1
export const MEAL_TARGET = 6;     // 飯少於此數才有人想煮
export const COOK_RAW = 2;
// M21 灶邊接力：生食材堆得越多，路過的人越想順手煮；飯沒到 CAP 都可以煮。
export const KITCHEN = { ON: false, RAW0: 6, RAW_K: 8, PULL: 1.2, CAP: 12, J: 0.3 }; // 暫停中（loop 24）：ON false 時跟以前一樣
export const COOK_MEALS = 3;
export const FORAGE_TAKE = 3;

// 每種行動：持續 tick、每 tick 對需求的影響。
export const ACTS = {
  sleep: { label: '睡覺', dur: 480, per: { energy: 0.22 } },
  sleepGround: { label: '席地而睡', dur: 480, per: { energy: 0.12 } },
  eat: { label: '吃飯', dur: 30, per: { food: 3 } },
  eatRaw: { label: '生吃莓果', dur: 10, per: { food: 1.5 } },
  eatCarried: { label: '吃身上的莓果', dur: 10, per: { food: 1.5 } },
  forage: { label: '採莓', dur: 25, per: { fun: 0.02 } },
  deliver: { label: '放下莓果', dur: 3, per: {} },
  cook: { label: '煮飯', dur: 40, per: { fun: 0.04 } },
  chat: { label: '聊天', dur: 30, per: { social: 1.2, fun: 0.2 } },
  sit: { label: '坐著發呆', dur: 40, per: { fun: 0.35, energy: 0.05 } },
  wander: { label: '閒逛', dur: 0, per: {} },
  idle: { label: '發呆', dur: 20, per: { fun: 0.02 } },
};

// ---------- M3 資源採集與建設 ----------
export const PILE = { label: '倉堆', x: 25, y: 24 };
export const TREE_WOOD = 8;   // M4 由 4 調為 8：否則一棵樹只夠一趟，「多扛」技能被樹量吃掉
export const ROCK_STONE = 10; // M4 由 6 調為 10，理由同上
export const STOCK_TARGET = { wood: 10, stone: 6 };
export const START_MATERIALS = { wood: 0, stone: 0 };
export const SITE_WORKERS = 2;

// 藍圖：tiles 是完工後的格（null 表示不改地圖），cost 是材料，work 是總工時。
export const BLUEPRINTS = [
  {
    id: 'fence-s', label: '南柵欄', desc: '院子南邊一道木柵，留一個門口', kind: 'fence',
    cells: Array.from({ length: 16 }, (_, i) => [24 + i, 30]).filter(([x]) => x !== 29),
    costPerCell: { wood: 1 }, workPerCell: 12,
  },
  {
    id: 'hut-e', label: '東茅屋', desc: '道館東邊一間茅屋，兩張床', kind: 'hut',
    rect: [39, 15, 43, 19], door: [41, 19], beds: [[40, 16], [42, 16]],
    cost: { wood: 10, stone: 4 }, work: 180,
  },
  // M11 宿舍：兩個階段。第一階段立牆、四張床；第二階段在同一間裡再擺四張床（要先完成第一階段）。
  {
    id: 'dorm-1', label: '西宿舍', desc: '道館西邊一間長屋，四張床（試做中）', kind: 'hut',
    rect: [17, 12, 24, 18], door: [20, 18], beds: [[18, 13], [20, 13], [22, 13], [18, 15]],
    cost: { wood: 14, stone: 6 }, work: 240,
  },
  {
    id: 'dorm-2', label: '宿舍擴建', desc: '西宿舍裡再擺四張床（試做中）', kind: 'beds', of: 'dorm-1', requires: 'dorm-1',
    beds: [[20, 15], [22, 15], [18, 17], [22, 17]],
    cost: { wood: 12, stone: 2 }, work: 160,
  },
  // M12 菜園：院子東邊、大路南側一排六畦。完工變成可走的菜畦格。
  {
    id: 'garden', label: '菜園', desc: '院子東邊六畦地：播種、長成、收成（試做中）', kind: 'farm',
    cells: Array.from({ length: 6 }, (_, i) => [38 + i, 27]),
    cost: { wood: 4 }, work: 60,
  },
  {
    id: 'hearth2', label: '石灶台', desc: '把露天灶砌成石灶台：煮得快、一鍋多一份', kind: 'upgrade',
    target: 'hearth', cost: { stone: 4 }, work: 90,
  },
  {
    // M13：道館東邊一塊夯土地、三個木人。木人立在站位右邊一格（跟木樁同畫法）。
    id: 'yard', label: '外功場', desc: '道館東邊一塊夯土地、三個木人；在這裡練功熟練多長兩成五', kind: 'yard',
    cells: Array.from({ length: 24 }, (_, i) => [40 + (i % 8), 21 + Math.floor(i / 8)]),
    dummies: [[41, 22], [43, 22], [45, 22]],
    cost: { wood: 8, stone: 4 }, work: 100,
  },
  {
    // M14：南柵欄內側兩座木台，門口兩邊各一。
    id: 'posts', label: '哨位', desc: '南柵欄內側兩座木台，敵人進了範圍才出手（試做中：目前會把衝出去迎敵的人拉上台，防守反而變弱）', kind: 'posts', requires: 'fence-s',
    posts: [[26, 29], [33, 29]],
    cost: { wood: 6 }, work: 60,
  },
];
// base soak 自 M3 起放的三張藍圖；之後加的藍圖不放進 base，免得改到舊 milestone 的量測。
export const FIRST_BLUEPRINTS = ['fence-s', 'hut-e', 'hearth2'];

export const HEARTH_LEVELS = [
  { cookDur: 40, meals: 3 },
  { cookDur: 25, meals: 4 },
];

export const FOCUS = [
  { id: null, label: '不指定' },
  { id: 'wood', label: '伐木', kinds: ['chop'] },
  { id: 'stone', label: '採石', kinds: ['quarry'] },
  { id: 'build', label: '營造', kinds: ['haul', 'build'] },
  { id: 'cook', label: '炊事', kinds: ['cook'] },
  { id: 'gather', label: '採集', kinds: ['forage', 'sow', 'harvest'] },
];
export const FOCUS_BONUS = 1.5;
export const WORK_KINDS = new Set(['chop', 'quarry', 'haul', 'build', 'cook', 'forage', 'deliver', 'store', 'repair', 'sow', 'harvest']);

// ---------- M12 柴火與菜園 ----------
// 柴火：煮一鍋要燒幾根木。loop 13 暫停為 0（停用），原因與四次嘗試見 specs/M12.md；恢復時改回 1。
export const FIRE = { WOOD_PER_POT: 0 };
export const FARM = {
  SOW_DUR: 20, HARVEST_DUR: 20,
  GROW: 1080,          // 播下到熟：18 小時
  YIELD: 3,            // 一畦收幾份生菜（再加採集熟練 ⌊v/40⌋）
  SOW_WORK: 1.0, HARVEST_WORK: 1.5,
};

Object.assign(ACTS, {
  chop: { label: '砍樹', dur: 60, per: { energy: -0.015 } },
  sow: { label: '播種', dur: 20, per: { energy: -0.01 } },
  harvest: { label: '收菜', dur: 20, per: { energy: -0.01 } },
  quarry: { label: '敲石', dur: 70, per: { energy: -0.02 } },
  store: { label: '把木石放上倉堆', dur: 3, per: {} },
  haul: { label: '搬料', dur: 3, per: {} },
  build: { label: '施工', dur: 30, per: { energy: -0.015 } },
});

// ---------- M4 生活技能 ----------
export const SKILLS = [
  { id: 'chop', label: '伐木', attr: 'gen' },
  { id: 'quarry', label: '採石', attr: 'gen' },
  { id: 'build', label: '營造', attr: 'wu' },
  { id: 'cook', label: '烹飪', attr: 'wu' },
  { id: 'forage', label: '採集', attr: 'wu' },
  { id: 'foot', label: '腳力', attr: 'gen' },
];
export const SKILL_GAIN = 2.4;
export const SKILL_MILESTONES = [25, 50, 75];
export const FOOT_STEP = 10;   // 負重每走幾格算一次腳力的「完成」

// ---------- M5 人際 ----------
export const SOCIAL = {
  CHAT_GAIN: 4, MEAL_GAIN: 0.6, WORK_GAIN: 0.8, REFUSE_LOSS: 2, TEACH_GAIN: 1.5,
  TEACH_GAP: 15, TEACH_MUL: 0.5,
  STAGES: [
    { id: 'stranger', label: '陌生', min: -Infinity },
    { id: 'known', label: '相識', min: 10 },
    { id: 'friend', label: '朋友', min: 30 },
    { id: 'close', label: '知己', min: 60 },
  ],
};

// ---------- M6 武學 ----------
// 招式資料化：req 是領悟這招需要的前置熟練；attr 決定練這招的天賦倍率；power 給武力計算（M7 守禦用）。
export const MOVES = [
  { id: 'changquan', form: 'fist', label: '長拳', attr: 'gen', power: 1, req: null, desc: '人人都會的基本拳路' },
  { id: 'kaishan', form: 'palm', label: '開山掌', attr: 'li', power: 2, req: { changquan: 30 }, desc: '以力催掌，勢大力沉' },
  { id: 'liuyun', form: 'hand', label: '流雲手', attr: 'shen', power: 2, req: { changquan: 30 }, desc: '借力卸力，手如行雲' },
  { id: 'poyue', form: 'palm', label: '破岳勢', attr: 'gen', power: 3.5, req: { kaishan: 50 }, desc: '開山掌練到極處，一勢破岳' },
  { id: 'feiyan', form: 'kick', label: '飛燕腿', attr: 'shen', power: 3, req: { liuyun: 50 }, desc: '流雲手的步法化成腿法' },
  { id: 'taichu', form: 'fist', label: '太初拳', attr: 'ding', power: 5, req: { kaishan: 40, liuyun: 40 }, desc: '剛柔並濟，返璞歸真' },
];
export const START_MOVES = ['changquan'];
export const MARTIAL = {
  MOVE_GAIN: 3,          // 一次練完的基本熟練
  COMP_BASE: 0.1,        // 每次練完、每招可領悟招式的基本機率；loop 6 由 0.06 調高：soak 中多數人第 3–4 日才到門檻，之後只剩約 4 次練功，0.06 時只有 5/12 種子有人領悟
  SPAR_MUL: 1.5,         // 切磋比打木樁長得快
  SPAR_GAIN: 3,          // 切磋完的好感
  POINT_P: 0.35,         // 朋友以上切磋時，對方會而我不會的招被指點學會的機率
  POINT_STAGE: 'friend',
  POINT_START: 5,        // 被指點學會時的起始熟練
  DRILL_MIN_ENERGY: 35,
  DRILL_BASE: 0.5,       // loop 6 由 0.35 調高：診斷時練功候選平均 0.83、第一名平均 1.98，白天只贏 3%
  DRILL_FUN: 0.5,        // 同上，由 0.3 調高，讓練功能跟坐石凳、閒逛搶休閒時間
  SPAR_MIN_ENERGY: 45,
  SPAR_MIN_AFF: 0,       // loop 6 原本要相識才切磋；診斷時沒有切磋候選的原因 1560/4000 是「陌生」，改成以武會友
  PRESTIGE_PER_POWER: 4, // 名望 = 技能平均 + 武力 × 此值（強者吸引人）
  INSIGHT_WU: 0.03, INSIGHT_N: 0.12, // 琢磨招式：悟性與直覺帶來的練功動機（loop 8 加，見 ai.mjs insight）
  YARD_MUL: 1.25,        // M13：在外功場木人練完，熟練多長
  YARD_PULL: 0.2,        // M13：知道外功場練得好，願意多走幾步（loop 15 嘗試 1：沒有這項時只有 28% 在外功場練，開始練功時舊樁平均近 3.5 格）
};
// M13 出招演出：間隔 round(BASE × (1 − FAST × 熟練/100)) tick；大小 SIZE0 + SIZE_GAIN × 熟練/100；畫面停留 LIFE tick。
export const STRIKE = { BASE: 16, FAST: 0.5, SIZE0: 0.8, SIZE_GAIN: 0.6, LIFE: 8 };
// 四種形狀：reach 伸出幾格（× size）、spread 張角（度）、step 前踏幾格（只畫）。
export const FORMS = {
  fist: { label: '拳', shape: 'line', reach: 1.6, spread: 0, width: 0.2 },
  palm: { label: '掌', shape: 'sector', reach: 1.3, spread: 100 },
  hand: { label: '手', shape: 'ring', reach: 1.0, spread: 300 },
  kick: { label: '腿', shape: 'sweep', reach: 2.2, spread: 50, step: 0.3 },
};
OBJECTS.push(
  { kind: 'dummy', label: '木樁', slots: [[36, 23]] },
  { kind: 'dummy', label: '木樁', slots: [[32, 28]] }, // 不放灶旁：灶的存糧標籤會蓋住樁
);
FOCUS.push({ id: 'martial', label: '練功', kinds: ['drill', 'spar'] });
Object.assign(ACTS, {
  drill: { label: '練功', dur: 50, per: { energy: -0.03, fun: 0.1 } },
  spar: { label: '切磋', dur: 40, per: { energy: -0.04, fun: 0.15, social: 0.4 } },
});

// ---------- M7 侵擾與防禦 ----------
export const ENEMIES = {
  boar: { label: '野豬', hp: 40, speed: 0.15, bash: 1, hit: 0.25, steal: 4, target: 'hearth' },
  bandit: { label: '山賊', hp: 70, speed: 0.17, bash: 0.7, hit: 0.35, steal: 4, target: 'pile' },
};
export const RAID = {
  START_DAY: 1,        // 0 起算：第 2 日開始
  HOUR_FROM: 9, HOUR_TO: 17, // loop 7 由 16–20 時改到白天：傍晚精力最低，313 次決定裡 57 次因沒力不能迎敵、睡覺排第一 62 次
  GROW_EVERY: 2,       // 每兩日多一頭
  BANDIT_DAY: 2,       // 0 起算：第 3 日起有山賊
  BANDIT_P: 0.5,
  DAYS: 30,            // 預先排好的天數
  SPAWN_Y: 39, SPAWN_X: [18, 46],
  STEAL_TICKS: 40,     // loop 7 由 20 調高：敵人中位數 122 tick 走到、142 tick 就偷完走人，來不及趕到
  LURK_TICKS: 60,      // 出生後先在林邊徘徊（地圖上看得到），給人反應時間；理由同上
  MAX_LIFE: 720,       // 半日還沒走就自己離開，免得卡住
};
export const DEFENSE = {
  FENCE_HP: 30,
  FENCE_COST: 3,         // loop 7 由 6 調低：72 頭只有 8 頭撞過柵欄，幾乎都繞門口
  ALERT_R: 25, FIGHT_MIN_ENERGY: 30, FIGHT_QUIT: 18,
  FIGHT_WORK: 3.0,       // loop 7 由 1.6 調高：診斷時迎敵候選 234 次只排第一 15 次，72 頭敵人只打退 3 頭
  FIGHT_DMG: 0.6,        // loop 7 由 0.3 調高：25 場迎敵有 19 場打到精力見底；單人打野豬要 130 tick、耗 32 精力，傍晚只剩約 25 可用
  FIGHT_MUL: 2,
  ALARM_LEISURE: 0.3,
  ALARM_BREAKS: ['drill', 'sit', 'idle', 'spar', 'chat'], // 敵人來時會丟下手邊這些事重新決定
  WILLING_BASE: 0.7,     // loop 7 由 0.5 調高：膽識 0 附近的人迎敵分數（約 1.9）輸給施工（2.2），344 次迎敵候選只贏 58 次
  // 危機感：被偷、被撞破之後大家比較想練功；一日約減半。loop 7 加：侵擾占去白天後，練完次數 293→146，M6-A5 失敗
  THREAT_RAID: 0.5,      // 看到敵人來也會怕；只算被偷時，打退率 60% 的情況下危機感多半是 0，練完次數沒有回升（146→147）
  THREAT_STEAL: 0.5, THREAT_BREACH: 0.3, THREAT_DECAY: 0.9995, THREAT_DRILL: 0.4,
  HIDE_BASE: 0.8, HIDE_DUR: 60,
  REPAIR_DUR: 15, REPAIR_WORK: 1.8,
};
FOCUS.push({ id: 'guard', label: '守衛', kinds: ['fight', 'repair', 'watch'] });
// M14 守點（loop 16 暫停，見 specs/M14.md）：PREF 讓守哨略勝追擊；RANGE 格內才出手；站在台上每 tick 扣 DRAIN 精力（不被反擊）。
export const POST = { PREF: 1.2, RANGE: 4.5, DRAIN: 0.01 };
Object.assign(ACTS, {
  fight: { label: '迎敵', dur: 9999, per: {} },
  watch: { label: '守哨位', dur: 9999, per: {} },
  hide: { label: '躲著', dur: 60, per: { fun: -0.02 } },
  repair: { label: '修柵欄', dur: 15, per: { energy: -0.015 } },
});

// ---------- M8 招人與成派 ----------
export const RECRUIT = {
  START_DAY: 1, HOUR_FROM: 8, HOUR_TO: 15, DAYS: 30,
  BASE: 0.4, PRESTIGE_DIV: 40, MAX: 0.9,    // 來訪機率 = BASE + 最高名望 / PRESTIGE_DIV。loop 8 BASE 0.25→0.4：第 2 日最高名望平均只有 6.3（規格估 10–20），每種子 5 日期望只來 2.2 人
  CAP: 10,                                 // 人數上限（含訪客）。loop 12 由 8 調高：宿舍兩階段後床位 3+2+8=13，上限改由床位決定
  STAY: 480,                               // 訪客待多久再決定
  PRESTIGE_REF: 30, AFF_REF: 15, JOIN_MIN: 0.45,
  ENTRY: { x: 63, y: 30 },                 // 東山徑口
  MASTER_GAP: 15, MASTER_MUL: 2,
};
export const SECT = {
  FOUND_MIN: 4, FOUND_PRESTIGE: 15,
  NAMES: ['青嵐派', '石泉派', '松風派', '雲棲派', '鐵竹派', '明溪派'],
  RULES: {
    drill: { label: '勤練', desc: '同門更常練功' },
    help: { label: '互助', desc: '同門聊天更投緣' },
    open: { label: '廣納', desc: '訪客更願意留下' },
    free: { label: '自在', desc: '同門更常休息玩樂' },
  },
  RULE_DRILL: 0.2, RULE_CHAT: 1.25, RULE_JOIN: 0.15, RULE_FREE: 0.1,
};
ACTS.leave = { label: '下山', dur: 0, per: {} };

// ---------- M9 遠征 ----------
// M19b 暫停中：試做時兩個巢的 x 是 76。
export const NESTS = [
  { id: 'den', label: '野豬窩', kind: 'boar', x: 58, y: 36, hp: 120, guards: ['boar', 'boar'] },
  { id: 'camp', label: '山寨', kind: 'bandit', x: 58, y: 6, hp: 200, guards: ['bandit', 'bandit', 'bandit'] },
];
export const EXPEDITION = {
  PARTY_MIN: 2, PARTY_MAX: 3, MIN_ENERGY: 60, MIN_FOOD: 50, PACK: 2,
  STAGE_R: 4, RAZE: 0.5,
  EAT_AT: 45,
  MIN_RATIONS: 1,        // loop 9 加：沒帶糧就出征的那幾趟（種子 6）撤退後全隊餓著過夜，見 M09 實作中的變更
  RATION_FOOD: 30,
  RETREAT_ENERGY: 25, RETREAT_FOOD: 20, RETREAT_HOUR: 20, RETURN_MAX: 600,
};
Object.assign(ACTS, {
  expedition: { label: '遠征', dur: 0, per: {} },
  raze: { label: '拆巢', dur: 9999, per: { energy: -0.02 } },
  ration: { label: '吃乾糧', dur: 10, per: {} },
});

// ---------- M18 值日 ----------
// 伙房、採集、柴火各排一人；carry 是把東西扛回去那一步（量守值日時算本職，不加分）。
// 被排到的人做本職時加分 BONUS × 迫切 × 可靠（可靠 = 1 − SLACK × 隨性程度）。
// loop 14：暫停（見 specs/M18.md），預設關；遊戲裡可以在紀事簿打開試。
export const DUTY = {
  ON: false,
  ROLES: [
    { id: 'cook', label: '伙房', kinds: ['cook'], skill: 'cook' },
    { id: 'gather', label: '採集', kinds: ['forage', 'sow', 'harvest'], carry: 'deliver', skill: 'forage' },
    { id: 'wood', label: '柴火', kinds: ['chop'], carry: 'store', skill: 'chop' },
  ],
  ORDER: ['cook', 'gather', 'wood', 'gather', 'cook', 'wood'],
  BONUS: 1.5,
  SLACK: 0.4,
  HOUR: 5,
};
// M15 演武：第 k 波 k 個木人，各 HP 血；出手間隔沿用 M13 period；每個站著的木人每 tick 扣 DRAIN 精力；
// 精力 MIN_ENERGY 以上才能開；SPOT 是外功場下排中間（中排是木人練功位）；木人在同一排左右站開（MEN 是相對人的格數，第 k 波用前 k 個）。
export const TRIAL = { WAVES: 5, HP: 12, HIT: 4, DRAIN: 0.1, MIN_ENERGY: 60, SPOT: [43, 23], MEN: [[1.5, 0], [-1.5, 0], [3, 0], [-3, 0], [4.5, 0]] };
Object.assign(ACTS, { trial: { label: '演武', dur: 9999, per: {} } });
// M16 受傷：敵人扣 1 精力加 RATE 傷勢；≥ MIN 受傷（走得慢、不練功不迎敵）、≥ HEAVY 傷重（遠征撤退）；
// 每 tick 退 HEAL、睡覺退 HEAL_SLEEP；煎藥喝一次退 MED，想喝的程度 MED_NEED0 + 傷勢 × MED_NEED_K。
// loop 18 暫停：RATE 0（不會受傷），開了會讓遠征那兩日的飢餓升高，見 specs/M16.md；恢復時改回 1 並放回嘗試 1、2。
export const INJURY = { RATE: 0, MIN: 8, HEAVY: 20, HEAL: 0.006, HEAL_SLEEP: 0.02, SLOW: 0.75, MED: 12, MED_NEED0: 0.5, MED_NEED_K: 0.05 };
// 藥園：收成一畦得 YIELD 份藥草；藥草少於 TARGET 才種才收。
export const HERB = { YIELD: 2, TARGET: 4, WORK: 1.5, SOW: 1.0 };
Object.assign(ACTS, { medicate: { label: '煎藥喝', dur: 30, per: {} } });
BLUEPRINTS.push({
  // M16：菜園再過去兩畦藥畦。
  id: 'herbs', label: '藥園', desc: '院子東邊兩畦藥草：受傷的人在灶邊煎藥喝，好得快（試做中：受傷目前關著）', kind: 'farm', herb: true,
  cells: [[44, 27], [45, 27]],
  cost: { wood: 4 }, work: 40,
});
// M17 親密與成家：朋友以上聊天（談心）好感 × DEEP；家人在的桌加 EAT、家人睡的床 BED_R 格內加 BED。
export const FAMILY = { DEEP: 3, EAT: 0.8, BED: 0.6, BED_R: 3 };
// ---------- M19a 後山打獵 ----------
// 獵戶小屋蓋好後，林間有 HERD 頭鹿在吃草（不動）；被獵走或跑掉的，RESPAWN tick 後在林間別處再出現。
// 打獵 DUR tick，成功率 P0 + P_SHEN × (身法 − 5)；成功扛回 MEAT 份肉，送到灶邊算生食材。
export const HUNT = { HERD: 4, RESPAWN: 360, DUR: 40, P0: 0.6, P_SHEN: 0.05, MEAT: 4, WORK: 1.6, MIN_ENERGY: 40, X0: 3, X1: 13 };
Object.assign(ACTS, { hunt: { label: '打獵', dur: 40, per: { energy: -0.03 } } });
BLUEPRINTS.push({
  // M19a：西邊林子口一間獵戶小屋。
  id: 'lodge', label: '獵戶小屋', desc: '西邊林子口一間小屋：蓋好後林間有鹿，弟子會去打獵、扛肉回灶邊（試做中：目前會讓院子裡做飯的人手變少）', kind: 'lodge',
  spots: [[16, 26]],
  cost: { wood: 6 }, work: 50,
});
WORK_KINDS.add('hunt');
FOCUS.find((f) => f.id === 'gather').kinds.push('hunt');
