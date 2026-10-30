// 所有可調的內容與數值都放這裡；規則檔只讀不改。

export const TICKS_PER_DAY = 1440;          // 1 tick = 1 遊戲分鐘
export const TICKS_PER_SECOND = 20;         // 1× 時每真實秒的 tick 數
export const BASE_SPEED = 0.12;             // 格／tick

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
export const MAP_W = 64;
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
