import {completeContactMove} from './contact.mjs';
import {TECHNIQUE_MOVES} from './technique-data.mjs';
import { BODY_MOVES } from './starter-combat.mjs';
import TREES from './destiny-trees.json' with { type: 'json' };
import { COMBAT_MOVE_SETS } from './combat-pose-sets.mjs';
// ==== （原 hero-data.mjs）====
// v0.96 主角建立：六屬性、六價值觀、九問問心、六位經典模板、開局同門候選
export const STATS = [['wu', '悟性'], ['gen', '根骨'], ['li', '臂力'], ['shen', '身法'], ['ding', '定力'], ['fu', '福緣']];
export const STAT_BUDGET = 12; // 六項起始各 1，共 12 點（含起始的 6）→ 可再分配 6；悟性停在 1 退 1 點（笨功夫）
export const VALUES = [['xia', '俠義'], ['sect', '門派'], ['qing', '情義'], ['free', '自在'], ['wu', '武道'], ['fame', '名望']];
// 行動標籤 → 價值觀（autopilot：價值 × 標籤 進入天賦組）
export const ACT_TAGS = {
  train: ['wu'], spar: ['wu', 'fame'], meditate: ['wu'], learn: ['wu'],
  searchFragment: ['wu'], // 找武學是武道（讀譜、自創按所代替的練功／靜坐算）
  chat: ['qing'], encourage: ['qing', 'xia'],
  leisure: ['free'], forage: ['free'],
  build: ['sect'], chop: ['sect'], quarry: ['sect'], farm: ['sect'], cook: ['sect', 'qing'],
  hunt: ['xia', 'fame'],
};
export const VALUE_K = 0.006;      // 價值 40 → 動作分數 +24%
export const WEXIN = { max: 3, mood: -6, classicMul: 1.5, at: -25 };
// 九問問心：每個答案 = [文字, {價值增減}, 特質票]
export const Q9 = [
  { q: '出身', a: [['農家子弟', { sect: 2, wu: 1 }, 'diligent'], ['市井混混', { free: 2, fame: 1 }, 'glib'], ['書香門第', { fame: 2, xia: 1 }, 'worrier']] },
  { q: '最珍貴的是', a: [['朋友', { qing: 3 }, 'sociable'], ['自由', { free: 3 }, 'free'], ['名聲', { fame: 3 }, 'brave']] },
  { q: '最可惡的是', a: [['欺凌弱小', { xia: 3 }, 'brave'], ['背叛師門', { sect: 3 }, 'honest'], ['被人管束', { free: 2, sect: -1 }, 'playful']] },
  { q: '兩難：師門令你殺一個無辜者', a: [['抗命', { xia: 3, sect: -2 }, 'brave'], ['遵命', { sect: 3, xia: -2 }, 'honest'], ['裝病推掉', { free: 2 }, 'glib']] },
  { q: '兩難：一本絕世祕笈，代價是同伴的信任', a: [['拿', { wu: 3, qing: -2 }, 'diligent'], ['不拿', { qing: 3 }, 'gentle'], ['偷看一眼再還', { wu: 1, free: 1 }, 'playful']] },
  { q: '練功時你', a: [['一招練一萬遍', { wu: 2 }, 'honest'], ['一點就通就好', { free: 1, wu: 1 }, 'free'], ['練累了就去吃', { free: 1 }, 'glutton']] },
  { q: '心性：輸了比武', a: [['回去苦練', { wu: 2 }, 'diligent'], ['笑一笑', { free: 1 }, 'optimist'], ['整夜睡不著', { fame: 2 }, 'worrier']] },
  { q: '心性：同門被欺負', a: [['挺身而出', { xia: 2, sect: 1 }, 'brave'], ['先安慰他', { qing: 2 }, 'gentle'], ['找師父告狀', { sect: 2 }, 'honest']] },
  { q: '心性：意外得了一筆錢', a: [['捐給門派', { sect: 2 }, 'gentle'], ['請大家吃一頓', { qing: 2 }, 'glutton'], ['存起來', { fame: 1, free: 1 }, 'worrier']] },
];
// 經典模板（屬性可超過 12；人格固定；違心 ×1.5）
export const HEROES = [
  { id: 'guojing', name: '郭靖', diff: 3, hard: true, tag: '【困難開局】憨厚苦練：悟性 1、根骨 5，衝關難；前 20 日降龍掌衝關較易', stats: { wu: 1, gen: 5, li: 4, shen: 2, ding: 4, fu: 2 }, personality: ['honest', 'diligent', 'stubborn'], values: { xia: 40, sect: 25, qing: 20, free: -10, wu: 10, fame: 0 }, style: 'palm', lore: ['江南七怪雜學', '全真內功入門'], companions: ['huangrong', 'munianci'], arc: 'guojing' },
  { id: 'weixiaobao', name: '韋小寶', diff: 3, tag: '不靠武功：經濟、說謊、收人才；巡山專門溜走', stats: { wu: 3, gen: 1, li: 1, shen: 4, ding: 1, fu: 5 }, personality: ['glib', 'lazy', 'optimist'], values: { free: 40, fame: 25, qing: 20, wu: -30, xia: 0, sect: 0 }, style: 'leg', lore: ['神行百變（逃命部分）'], coinMul: 3, companions: ['shuanger', 'ake'], arc: 'weixiaobao' },
  { id: 'linghuchong', name: '令狐沖', diff: 2, tag: '悟性派：灑脫嗜酒，以巧破招；被逐出華山自立門戶', stats: { wu: 5, gen: 3, li: 2, shen: 4, ding: 1, fu: 2 }, personality: ['free', 'drinker', 'sociable'], values: { free: 40, qing: 35, xia: 20, sect: -10, fame: -20, wu: 10 }, style: 'palm', lore: ['華山劍法（精階）', '氣宗內功（低）'], companions: ['yuelingshan', 'renyingying', 'tianboguang'], arc: 'linghuchong' },
  { id: 'yuebuqun', name: '岳不群', diff: 3, tag: '偽君子：紫霞九層、辟邪誘惑、違心越積越多', stats: { wu: 4, gen: 3, li: 2, shen: 3, ding: 4, fu: 2 }, personality: ['rigid', 'worrier', 'hypocrite', 'diligent'], values: { fame: 40, sect: 35, xia: 10, qing: -10, free: -10, wu: 15 }, style: 'palm', lore: ['華山劍法（小成）', '紫霞神功（第一層）'], companions: ['ningzhongze', 'linghuchong'], arc: 'yuebuqun' },
  { id: 'zhangwuji', name: '張無忌', diff: 2, tag: '柔：九陽內功天才，但優柔寡斷，抉擇常拖延', stats: { wu: 4, gen: 5, li: 2, shen: 3, ding: 2, fu: 3 }, personality: ['gentle', 'indecisive', 'kind'], values: { qing: 40, xia: 35, sect: 10, fame: -20, wu: -10, free: 0 }, style: 'palm', lore: ['九陽神功（第一層）', '醫術'], companions: ['zhaomin', 'xiaozhao'], arc: 'zhangwuji' },
  { id: 'axing', name: '阿星', diff: 4, tag: '大器晚成：根骨被封，瀕死後覺醒如來神掌', stats: { wu: 1, gen: 1, li: 3, shen: 3, ding: 2, fu: 2 }, sealed: true, personality: ['rascal', 'lazy', 'brave'], values: { fame: 40, free: 20, xia: -20, qing: 0, sect: 0, wu: 0 }, style: 'palm', lore: ['街頭打架', '《如來神掌》小冊子（被騙買的）'], companions: ['afang', 'feizaicong'], arc: 'axing' },
];
// 開局同門候選（也是名俠池的一部分；被選中就移出名俠池）
export const COMPANIONS = {
  huangrong: { name: '黃蓉', fem: true, sprite: 'senior', style: 'palm', root: 2, wu: 5, personality: ['clever', 'nimble', 'picky'], skills: { leg: 6, palm: 10, strength: 4, farming: 6, herbal: 12, agility: 18, cooking: 30 }, tag: '巧：悟性高、根骨低；廚藝引洪七公、精打細算', lore: ['落英神劍掌（之後）', '打狗棒法（之後）'], econ: 1, pair: { guojing: 0.25 } },
  munianci: { name: '穆念慈', fem: true, sprite: 'senior', style: 'leg', root: 3, wu: 3, personality: ['honest', 'gentle'], skills: { leg: 10, palm: 6, strength: 8, farming: 8, herbal: 6, agility: 10, cooking: 10 }, tag: '踏實：楊家槍，忠厚可靠' },
  shuanger: { name: '雙兒', fem: true, sprite: 'senior', style: 'leg', root: 4, wu: 3, personality: ['gentle', 'diligent'], skills: { leg: 14, palm: 8, strength: 8, farming: 8, herbal: 6, agility: 14, cooking: 12 }, tag: '忠心：武功好、任勞任怨，替主角打架' },
  ake: { name: '阿珂', fem: true, sprite: 'senior', style: 'palm', root: 3, wu: 4, personality: ['brave', 'picky'], skills: { leg: 6, palm: 12, strength: 6, farming: 2, herbal: 4, agility: 12, cooking: 2 }, tag: '高傲：劍法不錯，但對主角好感很低' },
  yuelingshan: { name: '岳靈珊', fem: true, sprite: 'senior', style: 'palm', root: 3, wu: 3, personality: ['playful', 'sociable'], skills: { leg: 6, palm: 10, strength: 5, farming: 4, herbal: 4, agility: 12, cooking: 6 }, tag: '小師妹：玉女劍法，情義牽絆' },
  renyingying: { name: '任盈盈', fem: true, sprite: 'senior', style: 'palm', root: 4, wu: 4, personality: ['clever', 'worrier'], skills: { leg: 6, palm: 12, strength: 5, farming: 2, herbal: 10, agility: 12, cooking: 6 }, tag: '聖姑：琴音療傷、黑木崖人脈' },
  tianboguang: { name: '田伯光', sprite: 'hero', style: 'leg', root: 4, wu: 3, personality: ['brave', 'drinker'], skills: { leg: 14, palm: 8, strength: 12, farming: 2, herbal: 2, agility: 20, cooking: 2 }, tag: '浪子：輕功快刀，巡山疾行；名聲差' },
  ningzhongze: { name: '寧中則', fem: true, sprite: 'senior', style: 'palm', root: 4, wu: 4, personality: ['gentle', 'brave'], skills: { leg: 8, palm: 14, strength: 8, farming: 8, herbal: 8, agility: 10, cooking: 10 }, tag: '寧氏一劍：正直，看穿偽君子會失望' },
  linghuchong: { name: '令狐沖', sprite: 'hero', style: 'palm', root: 3, wu: 5, personality: ['free', 'drinker', 'sociable'], skills: { leg: 6, palm: 12, strength: 6, farming: 2, herbal: 2, agility: 12, cooking: 2 }, tag: '首徒：灑脫，九劍伏筆；會不會被逐出看你' },
  linpingzhi: { name: '林平之', sprite: 'hero', style: 'palm', root: 3, wu: 3, personality: ['stubborn', 'worrier'], skills: { leg: 6, palm: 10, strength: 6, farming: 2, herbal: 2, agility: 10, cooking: 2 }, tag: '福威鏢局少鏢頭：滅門之恨，家傳劍譜' },
  zhaomin: { name: '趙敏', fem: true, sprite: 'senior', style: 'palm', root: 3, wu: 5, personality: ['clever', 'brave'], skills: { leg: 6, palm: 10, strength: 4, farming: 2, herbal: 6, agility: 12, cooking: 4 }, tag: '郡主：謀略與資源，正派名俠好感 −' },
  xiaozhao: { name: '小昭', fem: true, sprite: 'senior', style: 'leg', root: 3, wu: 4, personality: ['gentle', 'diligent'], skills: { leg: 8, palm: 6, strength: 4, farming: 8, herbal: 8, agility: 10, cooking: 14 }, tag: '溫柔：照顧人、心情加成，身世之謎' },
  afang: { name: '阿芳', fem: true, sprite: 'senior', style: 'leg', root: 2, wu: 3, personality: ['gentle', 'optimist'], skills: { leg: 4, palm: 2, strength: 2, farming: 8, herbal: 6, agility: 8, cooking: 8 }, tag: '啞女：善良，喚起阿星的良心（俠義 +）' },
  feizaicong: { name: '肥仔聰', sprite: 'hero', style: 'palm', root: 2, wu: 2, personality: ['glutton', 'lazy'], skills: { leg: 2, palm: 6, strength: 10, farming: 4, herbal: 2, agility: 4, cooking: 6 }, tag: '跟班：一起詐騙賺錢，打架只會壯聲勢' },
};
export const CUSTOM_COMPANIONS = ['huangrong', 'shuanger', 'xiaozhao', 'yuelingshan'];
// 新特質（加入 TRAITS）
export const NEW_TRAITS = {
  clever: { name: '聰慧', desc: '一點就通，巧勁武學學得快；也精打細算', mods: { train: 0.95, cook: 1.2 } },
  nimble: { name: '靈動', desc: '腳下輕快，愛到處跑', mods: { forage: 1.3 } },
  picky: { name: '挑嘴', desc: '吃得講究，飯菜差會不高興，自己下廚卻特別用心', mods: { cook: 1.4, eat: 0.9 }, thoughtMul: { food: 1.5 } },
  lazy: { name: '懶散', desc: '能躺就不坐，練功提不起勁', mods: { train: 0.7, leisure: 1.4, rest: 1.15 } },
  glib: { name: '油嘴', desc: '說話好聽，招人、買賣都佔便宜', mods: { chat: 1.3 } },
  drinker: { name: '嗜酒', desc: '有酒心情就好，醉了悟性高、定力差', mods: { leisure: 1.2 }, moodBase: 3 },
  rigid: { name: '拘謹', desc: '規矩方正，練正統功夫一板一眼；學不來無招之劍', composure: 'steady', mods: {}, mods24: { train: 1.15, study: 1.15, chat: 0.85, rest: 0.9 } },
  bold: { name: '豪爽', desc: '大口喝酒大塊吃肉，出手不拘章法', mods: { chat: 1.1 } },
  hypocrite: { name: '偽君子', desc: '人前君子，人後算計；名望受損時心情大跌', mods: {}, mods24: { chat: 1.25, study: 1.15 } },
  indecisive: { name: '優柔', desc: '重大抉擇總要拖上幾天', mods: {}, mods24: { chat: 1.15, rest: 1.15, defend: 0.85 } },
  kind: { name: '仁厚', desc: '見不得人受苦，愛照顧傷者', mods: { encourage: 1.4 } },
  rascal: { name: '混混', desc: '街頭出身，偷懶耍詐，心底未泯', mods: { train: 0.8, forage: 1.2 } },
};
// 專屬主線第一步（v0.96 只做第一步；完整事件鏈依 ROADMAP 原版本）
export const ARCS = {
  guojing: { day: 2, title: '洪七公聞香而來', text: '一個背酒葫蘆的老叫化在門口嗅了嗅：「好香！誰燒的菜？」', opts: [['請他吃一頓，好好招待', { xia: 5, qing: 5 }, 'hong'], ['門派窮，請他離開', { sect: 5, xia: -5 }, null]] },
  weixiaobao: { day: 2, title: '天地會來人', text: '一個自稱天地會的漢子塞給你一塊令牌：「香主，總舵主有請。」', opts: [['收下令牌，兩頭都賺', { free: 5, fame: 5 }, 'tdh'], ['裝傻推掉', { free: 3 }, null]] },
  linghuchong: { day: 2, title: '思過崖的老人', text: '後山崖洞裡似乎有人。洞壁刻著五嶽劍法和破法。', opts: [['進洞看個究竟', { wu: 5, free: 5 }, 'feng'], ['不去，喝酒', { free: 5 }, null]] },
  yuebuqun: { day: 2, title: '林平之上山投靠', text: '福威鏢局的少鏢頭林平之跪在門口，身上帶著家傳劍譜的傳聞。', opts: [['收他入門（君子之風）', { fame: 5, xia: 5 }, 'lin'], ['不收，免惹麻煩', { sect: 5, xia: -5 }, null]] },
  zhangwuji: { day: 2, title: '明教殘部求救', text: '幾個明教弟子帶著傷來求醫：「六大派正在圍剿光明頂……」', opts: [['收留醫治', { qing: 5, xia: 5 }, 'mj'], ['正派會不滿，婉拒', { sect: 5, qing: -5 }, null]] },
  axing: { day: 2, title: '豬籠城寨的包租婆', text: '你想冒充斧頭幫去收保護費，迎面撞上叼著菸的包租婆。', opts: [['硬著頭皮詐她', { fame: 5, xia: -5 }, 'zhulong'], ['腳底抹油', { free: 5 }, null]] },
};

// ==== （原 data.mjs）====
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
  cliff1: [335, 595], cliff2: [800, 455], cliff3: [900, 145], // 出自 Phase 6 規格：三階山崖在 1600×900 既有地圖上的可見節點。
};
export const EDGES = [['hall', 'court'], ['court', 'yard'], ['court', 'dormP'], ['dormP', 'dorm'], ['court', 'mid'], ['mid', 'kitchen'], ['mid', 'south'], ['south', 's1'], ['s1', 's2'], ['s2', 's3'], ['s3', 'g1'], ['g1', 'g2'], ['g2', 'g3'], ['g3', 'forest'], ['forest', 'g4'], ['g4', 'g5'], ['g5', 'g6'], ['g6', 'herb'], ['forest', 'forest2'], ['s1', 'e1'], ['e1', 'e2'], ['e2', 'e3'], ['e3', 'e4'], ['e4', 'e5'], ['e5', 'v1'], ['v1', 'v2'], ['v2', 'gate'], ['e2', 'veg'], ['e5', 'e6'], ['e6', 'trail1'], ['trail1', 't2a'], ['t2a', 'trail2'], ['trail2', 't3'], ['t3', 't4'], ['t4', 'guard'], ['guard', 't5'], ['t5', 't6'], ['t6', 'den'], ['g3', 'quarry'], ['south', 'shed']];

// 設施：每階段宣告提供的活動（smart object）。stage 0 = 荒廢/空地。
// N53：使用點相對設施節點，間隔約一個人物寬；樁位與空地共用預約表，不得雙占。
const YARD_OPEN_SPOTS = [40, 80, 120].flatMap((y, row) => [-75, -25, 25, 75].map((x, col) => ({ id: `open${row * 4 + col}`, offset: [x, y], acts: ['train', 'meditate'], kind: 'open' })));
const YARD_DUMMY_SPOTS = [-60, 0, 60, -90, 90].map((x, i) => ({ id: `dummy${i}`, offset: [x, -25], acts: ['train'], kind: 'dummy' }));
export const FACILITIES = [
  { id: 'hall', name: '大廳', node: 'hall', stages: [
    { name: '破道館', sprite: 'hall_s0', offers: ['rest', 'learn'], restRate: 3, beds: 3, learnDur: 8 },
    { name: '大廳', sprite: 'hall_s1', offers: ['rest', 'learn'], restRate: 4, beds: 2, learnDur: 4, cost: { wood: 12, stone: 6, coin: 6 }, work: 30, rep: 20 },
    { name: '正殿', sprite: 'hall_s1', offers: ['rest', 'learn'], restRate: 5, beds: 2, learnDur: 3, cost: { wood: 16, stone: 10, coin: 60 }, rare: { tiemu: 2 }, work: 40, rep: 40 }, // v1.9 I-2 三階：名聲＋巡山遠段稀有料
    { name: '大殿', sprite: 'hall_s1', offers: ['rest', 'learn'], restRate: 6, beds: 3, learnDur: 2, cost: { wood: 20, stone: 14, coin: 120 }, rare: { tiemu: 3, lingshi: 2 }, work: 50, rep: 70 },
  ] },
  { id: 'yard', name: '外功場', node: 'yard', stages: [
    { name: '空地', sprite: null, offers: ['train', 'meditate'], trainMul: 1, spots: YARD_OPEN_SPOTS },
    { name: '木樁場', sprite: null, offers: ['train', 'spar', 'meditate'], trainMul: 1.6, dummies: 3, spots: [...YARD_DUMMY_SPOTS.slice(0, 3), ...YARD_OPEN_SPOTS], cost: { wood: 6 }, work: 15 },
    { name: '演武場', sprite: null, offers: ['train', 'spar', 'meditate'], trainMul: 1.8, dummies: 4, spots: [...YARD_DUMMY_SPOTS.slice(0, 4), ...YARD_OPEN_SPOTS], cost: { wood: 12, stone: 8, coin: 40 }, rare: { tiemu: 2 }, work: 30, rep: 30 },
    { name: '演武廣場', sprite: null, offers: ['train', 'spar', 'meditate'], trainMul: 2.0, dummies: 5, spots: [...YARD_DUMMY_SPOTS, ...YARD_OPEN_SPOTS], cost: { wood: 14, stone: 12, coin: 90 }, rare: { tiemu: 2, lingshi: 1 }, work: 40, rep: 60 },
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
  { id: 'herb', name: '藥園', node: 'herb', stages: [
    { name: '野藥圃', sprite: 'herb', offers: ['forage'] },
    { name: '整理藥圃', sprite: 'herb', offers: ['forage', 'heal'], slots: { heal: 1 }, cost: { wood: 6 }, work: 15, proposal: '把野藥圃整理好，傷了可以就近敷藥' },
    { name: '藥園 Lv1', sprite: 'herb', offers: ['forage', 'heal'], slots: { heal: 2 }, healBonus: 12, woundSteps: 2, cost: { wood: 12 }, work: 30, proposal: '多闢一處治傷位，藥草也能敷得更仔細' },
    { name: '藥園 Lv2', sprite: 'herb', offers: ['forage', 'heal'], slots: { heal: 3 }, healBonus: 25, woundSteps: 3, cost: { wood: 18 }, work: 45, proposal: '再添藥床，傷重的人不用等別人敷完' },
  ] },
  { id: 'forest', name: '林緣枯木', node: 'forest2', stages: [{ name: '枯木', sprite: 'log', offers: ['chop'] }] },
  { id: 'quarry', name: '後山石場', node: 'quarry', stages: [{ name: '亂石坡', sprite: null, offers: ['quarry'] }] },
  { id: 'shed', name: '工寮', node: 'shed', stages: [
    { name: '空地', sprite: null, offers: [], laborBeds: 0 },
    { name: '工寮', sprite: 'dorm_s0', offers: ['rest'], restRate: 6, laborBeds: 2, laborOnly: true, cost: { wood: 6 }, work: 16 },
    { name: '大工寮', sprite: 'dorm_s1', offers: ['rest'], restRate: 7, laborBeds: 4, laborOnly: true, cost: { wood: 8, stone: 6, coin: 4 }, work: 22, rep: 10 },
    { name: '村舍大院', sprite: 'dorm_s1', offers: ['rest'], restRate: 8, laborBeds: 8, laborOnly: true, cost: { wood: 12, stone: 8, coin: 12 }, work: 28, rep: 15 }, /* loop155 v2.3 起可蓋 */
  ] },
  { id: 'store', name: '院倉', node: 'court', stages: [{ name: '柴堆', sprite: 'woodpile', offers: ['chat', 'leisure'] }] },
];

// N47: The fence is built through its existing work site; each stage advertises
// the defend activity and the physical number of enemies able to press in.
export const FENCE_FAC = { id: 'fence', name: '菜園柵', node: 'veg', stages: [
  { name: '未築', offers: [], coverSlots: 0, proposal: '上次被圍時沒有牆可以靠，先把柵築起來' },
  { name: '木柵', offers: ['defend'], coverSlots: 2, proposal: '先築木柵，守門時有地方靠' },
  { name: '石牆', offers: ['defend'], coverSlots: 1, proposal: '上次被圍時木柵守不住，把通道收窄' },
  { name: '山門壘', offers: ['defend'], coverSlots: 1, proposal: '把石牆加固，守住窄處' },
] };

// 活動：時間、需求變化、技能經驗、產出
export const ACTIVITIES = {
  rest:   { name: '歇息', dur: 10, pose: 'sit', need: { energy: 'rate' } },
  eat:    { name: '用飯', dur: 5, pose: 'sit', use: { food: 1 }, need: { hunger: 60 } },
  farm:   { name: '種菜', dur: 8, pose: 'crouch', energy: -8, skill: { farming: 6 } }, // 播種或收成，見 sim plots
  cook:   { name: '煮飯', dur: 0, pose: 'sit', energy: -3, skill: { cooking: 6 } }, // dur 由灶階段決定
  forage: { name: '採藥', dur: 8, pose: 'pick', energy: -6, skill: { herbal: 6 }, carry: { herb: 1 } },
  cliffForage1: { name: '低崖採靈草', dur: 8, pose: 'pick', energy: -6, skill: { herbal: 6 }, carry: { herb: 2, beeJelly: 1 } }, // 出自 Phase 6 規格：沿採藥工時，帶回藥材×2與玉蜂漿。
  cliffTrain: { name: '試劍崖練功', dur: 10, pose: 'stand', energy: -10, skill: { style: 5 } }, // 出自 Phase 6 規格：沿練功工時，外功經驗×1.25。
  cliffWater: { name: '寒潭挑靈泉', dur: 8, pose: 'carry', energy: -7, skill: { strength: 4 }, carry: { coldWater: 1 } }, // 出自 Phase 6 規格：沿挑水工時，帶回一份寒潭靈泉。
  waterfallTrain: { name: '飛瀑練體', dur: 10, pose: 'stand', energy: -10, skill: { style: 5 } }, // 出自 Phase 6 規格：沿練功工時，體魄與外功經驗×1.4。
  cliffComprehend: { name: '絕頂參悟石刻', dur: 12, pose: 'sit', energy: -8 }, // 出自 Phase 6 規格：沿打坐工時，絕頂才有參悟機會。
  quarry: { name: '採石', dur: 10, pose: 'chop', energy: -9, skill: { strength: 6 }, carry: { stone: 1 } },
  chop:   { name: '砍柴', dur: 8, pose: 'chop', energy: -8, skill: { strength: 5 }, carry: { wood: 1 } },
  train:  { name: '練功', dur: 10, pose: 'stand', energy: -10, skill: { style: 5 } }, // style＝弟子主修路數；做功時由 routineFrame 覆蓋
  meditate: { name: '打坐衝關', dur: 12, pose: 'sit', energy: -8 },
  spar:   { name: '切磋', dur: 8, pose: 'stand', energy: -10, skill: { style: 4 } },
  learn:  { name: '聽師父講武', dur: 8, pose: 'sit', energy: -2, skill: { palm: 3 }, social: 10 },
  build:  { name: '施工', dur: 6, pose: 'carry', energy: -6, skill: { strength: 2 } },
  chat:   { name: '聊天', dur: 6, pose: 'sit', social: 35, fun: 20 },
  encourage: { name: '鼓勵同門', dur: 6, pose: 'stand', social: 20 },
  leisure: { name: '閒坐看雲', dur: 8, pose: 'sit', fun: 45, energy: 3 },
  deliver: { name: '送回院倉', dur: 0, pose: 'carry' },
  defend: { name: '守柵迎敵', dur: 6, pose: 'stand', energy: -8, skill: { style: 1 } }, // loop3：只有山賊在地圖上時出現
  foray: { name: '後山出獵', dur: 0, pose: 'walk' }, // N62：效用 AI 發起 N45 巡山，不佔設施工作格
  patrol: { name: '巡山練招', dur: 0, pose: 'walk' }, // N62：沿已走過的後山路段遇真對手
  repair: { name: '修柵', dur: 8, pose: 'chop', energy: -6, skill: { strength: 2 } }, // loop2：只有築了木柵且受損時才會出現
};

// 武學：熟練門檻解鎖；範圍/冷卻/傷害由 palm 技能放大
export const MOVES = [
  ...BODY_MOVES,
  ...TECHNIQUE_MOVES,
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

// R4（#520）：開局是人物與物資資料，不替人物建立「伴侶」身分。
// 出自 R4 規格：既有雙人起手原值保留；獨行沒有第二人或額外物資。
export const OPENING_SCENARIOS = Object.freeze({
  xiaolongnv: { initialDisciples: 1, origins: false, people: [{ id: 'xiaolongnv', name: '小龍女', originSect: 'gumu', style: 'palm', adult: true, fem: true, sprite: 'senior', personality: ['gentle', 'diligent'], skills: { herbal: 14, agility: 16 }, traits: { bees: true }, arts: { stepFeather: 10, basicSword: 15 }, portrait: 'assets/portraits/xiaolongnv.png', mealName: '百花玉蜂藥膳', affinity: 55, awakeningPath: 'gumu' }], supplies: {} },
  huangrong: { initialDisciples: 1, origins: false, people: [{ id: 'huangrong', template: COMPANIONS.huangrong, name: '黃蓉', originSect: 'taohua', style: 'palm', adult: true, fem: true, sprite: 'senior', personality: ['clever', 'nimble', 'picky'], root: 2, wu: 5, skills: { herbal: 12, cooking: 16 }, arts: { basicFist: 10, xiaoyaoStep: 10 }, portrait: 'assets/portraits/huangrong.png', mealName: '桃花歸元藥膳', affinity: 55, awakeningPath: 'taohua' }], supplies: {} },
  solo: { initialDisciples: 1, origins: false, people: [], supplies: {} },
});
export const openingScenario = (spec) => spec?.hermitage && typeof spec.opening === 'object' ? spec.opening : OPENING_SCENARIOS[spec?.opening || spec?.partner || 'xiaolongnv'] || OPENING_SCENARIOS.xiaolongnv;

export const DISCIPLES = [
  { id: 'hero', name: '主角', root: 3, adult: true, sprite: 'hero', style: 'palm', skills: { leg: 2, palm: 10, strength: 10, farming: 5, herbal: 5, agility: 10, cooking: 3 }, traits: { diligent: 1.2 }, personality: ['diligent', 'worrier'] },
  { id: 'senior', name: '林師姐', root: 4, adult: true, fem: true, sprite: 'senior', style: 'leg', skills: { leg: 10, palm: 5, strength: 5, farming: 15, herbal: 10, agility: 12, cooking: 10 }, traits: { social: 1.3 }, personality: ['gentle', 'optimist'] },
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
export const ROUTINE_MODES = { train: '練功', meditate: '靜坐', work: '幹活', free: '自由' };
export const ROUTINE_PERIODS = { dawn: '早課', day: '白天', dusk: '晚上' };
export const ROUTINE_DEFAULT = { dawn: 'train', day: 'free', dusk: 'free' };
export const PLOT_GROW = 90; // 秒，播種到成熟
export const HARVEST = 3;    // 每畦收菜
export const STYLES = { palm: '掌法', leg: '腿法' };
// v0.4 後山生態：族群有上限與繁衍；狩獵是真的取走個體
export const ECO = { dog: { start: 5, max: 8, regen: 90 }, rat: { start: 6, max: 8, regen: 50 }, boar: { start: 2, max: 3, regen: 150 } };
export const HABITAT = { c: [1450, 60], r: 70 };
/* #419 N15 合法出生點：敵人只從這張表出來——離地圖邊緣 ≤ edge、離大殿 ≥ hall。獸從獸穴、棲地、東嶺；山賊從山門。
   via：出生點到守點山路的座標（都在山那一側，不從門派背後冒出來）；接上 guard 之後沿原山路走。 */
export const SOURCES = {
  den: { pos: [1475, 22], for: 'beast', via: [], organization: 2 },
  habitat: { pos: [1440, 40], for: 'beast', via: [[1392, 96]], organization: 2 },
  ridge: { pos: [1585, 120], for: 'beast', via: [[1470, 150]], organization: 2 },
  gate: { pos: [1475, 875], for: 'bandit', via: [], organization: 2 },
};
export const SRC_RULE = { edge: 80, hall: 400 };
export const srcOk = (p) => Math.min(p[0], p[1], WORLD.w - p[0], WORLD.h - p[1]) <= SRC_RULE.edge && Math.hypot(p[0] - NODES.hall[0], p[1] - NODES.hall[1]) >= SRC_RULE.hall;
export const POSTS = { guard: '山頂守點', trail2: '山腰岔口', trail1: '山腳路口' };
export const RAID_EVERY = 160; // 秒；野豬下山拱菜
export const HUNT_WAVES = 3, WAVE_GAP = 6;

// v0.5 名聲與招收
export const REP = { build: 5, kill: 1, learn: 2 };
export const RECRUIT = { food: 3 }; // R8 #526：束脩量沿 N58；數字名聲招募門檻退場。
export const RECRUIT_POOL = [
  { id: 'aqing', name: '阿青', adult: true, sprite: 'hero', style: 'palm', skills: { leg: 3, palm: 6, strength: 8, farming: 6, herbal: 4, agility: 9, cooking: 4 }, traits: { diligent: 1.3 }, personality: ['diligent', 'brave'], support: { food: 3 }, situation: { seek: 'teaching', where: 'village', reason: '在村路尋一處願意教人的山門' } },
  { id: 'shitou', name: '石頭', adult: true, sprite: 'hero', style: 'leg', skills: { leg: 8, palm: 2, strength: 14, farming: 4, herbal: 2, agility: 8, cooking: 2 }, traits: {}, personality: ['honest', 'brave'], situation: { seek: 'safety', where: 'village', reason: '村路屢遭山賊，想學守住家人的本事' } },
  // N58: the younger version has only an entry art and uses the same pool/admission path.
  // Age 13 is one year below the existing adult threshold 14; skills borrow Shitou's starter tier.
  { id: 'guojing', name: '郭靖', adult: false, age: 13, child: { since: 0, parents: [] }, youngHero: true, sprite: 'cousin', style: 'leg', skills: { leg: 8, palm: 2, strength: 14, farming: 4, herbal: 2, agility: 8, cooking: 2 }, traits: {}, personality: ['honest', 'brave'], support: { food: 3 }, starterArts: ['basicFist'], root: 3, situation: { seek: 'safety', where: 'village', reason: '村路不太平，想學一身護人的功夫' } },
  { id: 'xiaomei', name: '小梅', adult: true, fem: true, sprite: 'senior', style: 'palm', skills: { leg: 2, palm: 4, strength: 4, farming: 10, herbal: 14, agility: 11, cooking: 12 }, traits: { social: 1.4 }, personality: ['gentle', 'sociable'], support: { coin: 3 }, situation: { seek: 'healing', where: 'market', reason: '在市集幫藥舖做事，想學療傷' } },
  { id: 'laoqi', name: '老七', adult: true, sprite: 'hero', style: 'leg', skills: { leg: 6, palm: 6, strength: 10, farming: 12, herbal: 6, agility: 7, cooking: 8 }, traits: { diligent: 1.1 }, personality: ['gentle', 'optimist'], situation: { seek: 'food', where: 'market', reason: '在市集討生活，家裡缺糧' } },
];

// v0.6 切片：性格特質（RimWorld traits／DF facets 的簡化版）與心情
// mods：活動分數乘數；moodBase：常駐心情；thoughtMul：對某類想法放大
export const TRAITS = {
  diligent: { name: '勤奮', desc: '閒不下來，練功砍柴都起勁', mods: { train: 1.25, chop: 1.15, build: 1.15, farm: 1.1, chat: 0.85 } },
  sociable: { name: '健談', desc: '愛找人說話，聊完心情特別好', mods: { chat: 1.5, spar: 1.1 }, thoughtMul: { social: 1.6 } },
  playful: { name: '貪玩', desc: '愛往外跑採藥，坐不住練功', composure: 'hot', mods: { forage: 1.4, train: 0.7, chat: 1.2 } },
  gentle: { name: '溫和', desc: '愛下廚照顧人，不愛打鬥', composure: 'steady', mods: { cook: 1.4, farm: 1.15, spar: 0.6 }, thoughtMul: { fight: 1.5 } },
  brave: { name: '膽大', desc: '受傷不太放在心上，愛切磋', composure: 'hot', mods: { spar: 1.4 }, thoughtMul: { fight: 0.4 } },
  optimist: { name: '樂天', desc: '天塌下來也笑得出來', moodBase: 8 },
  worrier: { name: '多慮', desc: '小事也掛心', moodBase: -6, thoughtMul: { bad: 1.4 } },
  honest: { name: '憨厚', desc: '學得慢卻肯下笨功夫，基礎武學練得特別紮實', composure: 'steady', mods: { train: 1.1, leisure: 0.8 } },
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
  rageSpent: { text: '剛才被纏得惱羞，氣息未平', v: -4, ttl: 300, tag: 'fight' },
  btFail:    { text: '衝關失敗，氣血翻湧', v: -5, ttl: 300, tag: 'bad' },
  btWin:     { text: '衝破瓶頸！', v: 18, ttl: 500, tag: 'good' },
  learned:   { text: '學會了新招', v: 15, ttl: 400, tag: 'good' },
  goodChat:  { text: '和人聊得開心', v: 6, ttl: 150, tag: 'social' },
  epiphany:  { text: '豁然開朗，悟了一門功夫', v: 10, ttl: 300, tag: 'good' }, // loop7
  admire:    { text: '仰慕對方的功夫', v: 4, ttl: 200, tag: 'social' }, // loop6
  bedSleep:  { text: '睡在床上', v: 5, ttl: 300, tag: 'good' },
  floorSleep:{ text: '睡破地鋪', v: -5, ttl: 300, tag: 'bad' },
  hallMeal:  { text: '在膳房吃了熱飯', v: 6, ttl: 200, tag: 'food' },
  mealPair:  { text: '和要好的人一起吃飯', v: 4, ttl: 200, tag: 'social' },
  fedBy:     { text: '忙到一半有人送飯來', v: 6, ttl: 300, tag: 'good' },
  sheltered: { text: '柵破時躲進屋裡，嚇得不輕', v: -3, ttl: 200, tag: 'bad' },
  hurt:      { text: '狩獵受傷', v: -12, ttl: 400, tag: 'fight' },
  wonHunt:   { text: '守住了後山', v: 8, ttl: 300, tag: 'good' },
  cropLost:  { text: '菜被野豬拱了', v: -5, ttl: 200, tag: 'bad' },
  cropLostLite: { text: '聽說菜被野豬拱了', v: -2, ttl: 200, tag: 'bad' }, /* loop47 cropcare：不種菜的人只聽說 */
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
export const RULES_VERSION = '5.6'; /* 第二十二輪 #488：奇書見聞與遠行搜尋；異版存檔拒載 */
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
/* loop188 v2.9：經典特質相剋／相惜，只 v24 新局（compat 中 a.v24 時才加） */
export const OPPOSE24 = [['rigid', 'free'], ['rigid', 'drinker'], ['hypocrite', 'honest'], ['hypocrite', 'bold'], ['quiet', 'glib'], ['stubborn', 'rascal'], ['picky', 'glutton']];
export const LIKES24 = [['bold', 'drinker'], ['bold', 'brave'], ['honest', 'kind'], ['honest', 'diligent'], ['quiet', 'chi'], ['clever', 'free'], ['stubborn', 'rigid']];
export const RECRUIT_TRAIT_VARIATION = { p: 0.35, pool: ['clever', 'nimble', 'bold', 'drinker', 'rigid', 'kind', 'stubborn', 'quiet', 'chi', 'hypocrite'] }; /* loop193 偽君子入池，梟雄強練才抽得到 */
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
export const RES_NAMES = { wood: '木', stone: '石', coin: '香火錢', veg: '菜', food: '飯', herb: '藥', hide: '獸皮', gall: '熊膽', page1: '凡階殘頁', page2: '精階殘頁', tiemu: '鐵木', lingshi: '靈石' };
// 雇工能做的事（不練武、不聽講、不下廚種菜）；幹活時分數加成
export const LABOR_ACTS = ['rest', 'eat', 'chat', 'leisure', 'chop', 'quarry', 'build'];
export const LABOR_WORK_MUL = 1.4;
// loop155 v2.3 村中幫工：多做種菜、煮飯、挑水、修柵、採藥（隱世高人另可守柵）；專長活 ×1.35 評分、快 20%
export const LABOR_ACTS23 = [...LABOR_ACTS, 'farm', 'cook', 'water', 'repair', 'forage', 'defend'];
export const LABOR23 = { specMul: 1.35, specSpeed: 1.2, hermitMaxD: 3, hermitMinL: 2, hermitBuff: 1.2, hermitActs: ['train', 'meditate', 'study'], stewHireCoin: 60,
  spec: { dazhu: 'chop', erya: 'farm', laohuang: 'water', xiaoliu: 'forage', achun: 'cook', tiezi: 'quarry', shibo: 'repair', axiu: 'cook', shuisheng: 'water', caogen: 'farm' } };
// 根骨（隱藏潛力 1–5）：與弟子一起幹活／聊天累積「共事」秒數後揭露；≥ inviteMin 且弟子平均好感 ≥ inviteAff 可邀入門
export const ROOT = { revealAt: 240, inviteMin: 3, inviteAff: 18, names: ['', '平平', '尚可', '中上', '良材', '奇才'] };
export const LABOR_POOL = [
  { id: 'dazhu', name: '大柱', adult: true, sprite: 'hero', style: 'palm', root: 4, skills: { leg: 2, palm: 3, strength: 14, farming: 4, herbal: 1, agility: 7, cooking: 2 }, traits: {}, personality: ['diligent', 'honest'] },
  { id: 'erya', name: '二丫', adult: true, fem: true, sprite: 'senior', style: 'leg', root: 2, skills: { leg: 3, palm: 1, strength: 7, farming: 9, herbal: 6, agility: 10, cooking: 8 }, traits: { social: 1.2 }, personality: ['sociable', 'optimist'] },
  { id: 'laohuang', name: '老黃', adult: true, sprite: 'hero', style: 'palm', root: 1, skills: { leg: 1, palm: 2, strength: 11, farming: 8, herbal: 3, agility: 5, cooking: 5 }, traits: {}, personality: ['gentle', 'worrier'] },
  { id: 'xiaoliu', name: '小六', adult: true, sprite: 'cousin', style: 'leg', root: 5, skills: { leg: 6, palm: 2, strength: 6, farming: 3, herbal: 4, agility: 14, cooking: 1 }, traits: { playful: 1.2 }, personality: ['free', 'brave'] },
  { id: 'achun', name: '阿春', adult: true, fem: true, sprite: 'senior', style: 'palm', root: 3, skills: { leg: 2, palm: 4, strength: 8, farming: 7, herbal: 9, agility: 9, cooking: 9 }, traits: {}, personality: ['gentle', 'diligent'] },
  { id: 'tiezi', name: '鐵子', adult: true, sprite: 'hero', style: 'leg', root: 2, skills: { leg: 5, palm: 3, strength: 13, farming: 2, herbal: 1, agility: 8, cooking: 2 }, traits: {}, personality: ['brave', 'worrier'] },
];
export const LABOR_POOL23 = [ /* loop155 v2.3：只在 s.v23 接在原六人之後 */
  { id: 'shibo', name: '石伯', adult: true, sprite: 'hero', style: 'palm', root: 1, skills: { leg: 1, palm: 2, strength: 12, farming: 3, herbal: 1, agility: 4, cooking: 3 }, traits: {}, personality: ['honest', 'diligent'] },
  { id: 'axiu', name: '阿秀', adult: true, fem: true, sprite: 'senior', style: 'leg', root: 2, skills: { leg: 2, palm: 1, strength: 5, farming: 6, herbal: 5, agility: 8, cooking: 12 }, traits: {}, personality: ['gentle', 'sociable'] },
  { id: 'shuisheng', name: '水生', adult: true, sprite: 'cousin', style: 'leg', root: 3, skills: { leg: 4, palm: 2, strength: 10, farming: 5, herbal: 2, agility: 9, cooking: 2 }, traits: {}, personality: ['optimist', 'diligent'] },
  { id: 'caogen', name: '草根', adult: true, sprite: 'hero', style: 'palm', root: 2, skills: { leg: 2, palm: 2, strength: 8, farming: 12, herbal: 4, agility: 6, cooking: 4 }, traits: {}, personality: ['honest', 'worrier'] },
];

// v0.85 內外門與日課
export const CHORE_ACTS = ['chop', 'quarry', 'farm', 'cook', 'build', 'forage'];
export const CHORE_NAMES = { chop: '砍柴', quarry: '採石', farm: '種菜', cook: '煮飯', build: '營建', forage: '採藥' };
export const QUOTA = { points: 4, debtMax: 4, outerMin: 2, headRate: 0.8, headTrain: 1.5, dutyMul: 1.4, shareAt: 2 };
export const PRIO = { high: [1.5, '優先'], normal: [1, '一般'], low: [0.6, '少做'] };
export const PROMOTE = { rootMin: 3, contrib: 6, pass: 30, cooldown: 1 };
export const RANK_NAMES = { head: '首徒', inner: '內門', outer: '外門', laborer: '雇工' };

// v0.9 武學骨架
export const TIERS = [[0, '入門'], [25, '小成'], [55, '大成'], [85, '圓滿'], [100, '化境']];
export const GRADES = ['', '凡', '良', '精', '絕', '神'];
export const SCHOOLS = { fist: '拳', palm: '掌', leg: '腿', inner: '內功', step: '身法' };
export const ARTS = [
  { id: 'basicFist', name: '基礎拳', school: 'fist', grade: 1, tags: ['拙'], req: [], techs: ['fist', 'fist2', 'fist3'], tech: 'fist', mode: 'base', qiScale: 0.15, isPublic: true, cats: { quanzhang: 1 }},
  { id: 'pushPalm', name: '推山掌', school: 'palm', grade: 1, tags: ['剛'], req: [{ art: 'basicFist', tier: 1 }], techs: ['push', 'push2', 'push3'], tech: 'push', mode: 'base', qiScale: 0.15, isPublic: true, cats: { quanzhang: 1 }},
  { id: 'wavePalm', name: '迴風掌', school: 'palm', grade: 2, tags: ['巧'], req: [{ art: 'pushPalm', tier: 2 }], techs: ['wave', 'wave2', 'wave3'], tech: 'wave', wuxingMin: 2, mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 1 }},
  { id: 'sweepLeg', name: '掃堂腿', school: 'leg', grade: 1, tags: ['拙'], req: [{ art: 'basicFist', tier: 1 }], techs: ['kick', 'kick2', 'kick3'], tech: 'kick', mode: 'base', qiScale: 0.15, isPublic: true, cats: { tuifa: 1 }},
  { id: 'whirlLeg', name: '旋風腿', school: 'leg', grade: 2, tags: ['巧'], req: [{ art: 'sweepLeg', tier: 2 }], techs: ['whirl', 'whirl2', 'whirl3'], tech: 'whirl', wuxingMin: 2, mode: 'da', qiScale: 0.08, isPublic: false, cats: { tuifa: 1 }},
  { id: 'breath', name: '吐納', school: 'inner', grade: 1, tags: ['柔'], attr: 'he', req: [], tech: null, techs: ['調息', '綿息', '胎息'], effect: 'rest', isPublic: true, cats: { neigong: 1 }}, /* loop191：吐納是中性調和，不與陰／陽外功相沖 */
  { id: 'snowStep', name: '踏雪步', school: 'step', grade: 1, tags: ['巧'], req: [{ art: 'sweepLeg', tier: 1 }], tech: null, techs: ['輕身', '踏雪無痕', '凌空步'], effect: 'speed', mode: 'base', qiScale: 0.15, isPublic: true, cats: { shenfa: 1 }},
  { id: 'fengLei', name: '風雷掌腿', school: 'palm', grade: 3, tags: ['剛'], req: [{ art: 'wavePalm', tier: 2 }, { art: 'whirlLeg', tier: 2 }], techs: ['storm', 'storm2', 'storm3'], tech: 'storm', wuxingMin: 3, mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 0.5, tuifa: 0.5 }},
];
/* loop160 v2.4 Batch 1：公共基礎武學擴充（v24:true＝只有 v2.4 新局的人看得到、學得到；舊局與舊 golden 不受影響）。
   attr＝陰陽屬性（Batch 2 共鳴用）；weapon＝兵器（劍判定用）；svg＝武學圖格位 [欄, 列]（避免和舊圖重疊） */
/* #409 二長老：基本功與本門入門武學都到小成，才進高階。氣宗、劍宗各看自己的入門。 */
const HUASHAN_ELDER = {
  qizong: [{ art: 'huashanXinfa', tier: 1 }, { art: 'pishiFist', tier: 1 }, { art: 'basicSword', tier: 1 }, { art: 'hunyuanPalm', tier: 1 }, { art: 'huashanSword', tier: 1 }],
  jianzong: [{ art: 'jianzongXinfa', tier: 1 }, { art: 'basicSword', tier: 1 }, { art: 'huashanSword', tier: 1 }],
};
/* #409 明教：本門內功與鷹爪到小成，才進聖火一系的高階。不改張無忌主線。 */
const MING_ELDER = { mingjiao: [{ art: 'shenghuoXinfa', tier: 1 }, { art: 'yingzhuaHand', tier: 1 }] };
ARTS.push(
  { id: 'basicSword', name: '基礎劍法', school: 'palm', grade: 1, tags: ['巧'], weapon: 'sword', attr: 'he', req: [], techs: ['bs1', 'bs2'], tech: 'bs1', v24: true, svg: [0, 5], mode: 'base', qiScale: 0.15, isPublic: true, cats: { jianfa: 1 }},
  { id: 'huashanSword', name: '華山劍法', school: 'palm', grade: 2, tags: ['巧'], weapon: 'sword', attr: 'yang', req: [{ art: 'basicSword', tier: 1 }], techs: ['hs1', 'hs2'], tech: 'hs1', v24: true, svg: [1, 5], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { jianfa: 1 }},
  { id: 'sanxianSword', name: '奪命連環三仙劍', school: 'palm', grade: 3, tags: ['快', '巧'], weapon: 'sword', attr: 'yin', req: [{ art: 'huashanSword', tier: 2 }], elder: HUASHAN_ELDER, techs: ['sx1', 'sx2'], tech: 'sx1', v24: true, svg: [2, 5], mode: 'da', qiScale: 0.08, isPublic: false, cats: { jianfa: 1 }},
  { id: 'wuhuBlade', name: '五虎斷門刀', school: 'palm', grade: 2, tags: ['剛'], weapon: 'blade', attr: 'yang', req: [{ art: 'basicFist', tier: 1 }], techs: ['wh1', 'wh2'], tech: 'wh1', v24: true, svg: [1, 6], mode: 'da', qiScale: 0.08, isPublic: true, cats: { quanzhang: 0.5, gunbang: 0.5 }},
  { id: 'shaolinStaff', name: '少林棍法', school: 'leg', grade: 2, tags: ['剛', '拙'], weapon: 'staff', attr: 'yang', req: [{ art: 'sweepLeg', tier: 1 }], techs: ['sl1', 'sl2'], tech: 'sl1', v24: true, svg: [2, 6], mode: 'lian', qiScale: 0.40, isPublic: true, cats: { gunbang: 1 }},
  { id: 'tuinaHand', name: '分筋錯骨手', school: 'palm', grade: 2, tags: ['巧'], attr: 'yin', req: [{ art: 'basicFist', tier: 1 }], techs: ['tn1', 'tn2'], tech: 'tn1', v24: true, svg: [0, 6], mode: 'da', qiScale: 0.08, isPublic: true, cats: { quanzhang: 0.5, qimen: 0.5 }},
  { id: 'stepFeather', name: '飛絮身法', school: 'step', grade: 2, tags: ['巧', '柔'], effect: 'speed', attr: 'yin', req: [{ art: 'snowStep', tier: 1 }], tech: null, techs: ['飄絮', '迴風'], v24: true, svg: [1, 7], mode: 'lian', qiScale: 0.40, isPublic: true, cats: { shenfa: 1 }},
  { id: 'stepEight', name: '八卦遊龍步', school: 'step', grade: 2, tags: ['巧'], effect: 'speed', attr: 'he', req: [{ art: 'snowStep', tier: 1 }], tech: null, techs: ['走圈', '遊龍'], v24: true, svg: [2, 7], mode: 'lian', qiScale: 0.40, isPublic: true, cats: { shenfa: 0.7, zhenfa: 0.3 }},
);
/* loop165 v2.5 Batch 5.1：宗師合參推演新武功（derived：只能由 checkDeriveArt 合參取得；secret：不進一般學習池；v24 新局才有） */
export const DERIVED24 = ['hanbingPalm', 'liufengSword', 'fuguFinger', 'qiankunBlade'];
ARTS.push(
  { id: 'hanbingPalm', name: '寒冰神掌', school: 'palm', grade: 3, tags: ['剛', '柔'], attr: 'yin', req: [], techs: ['hb1', 'hb2'], tech: 'hb1', secret: true, derived: true, v24: true, hint: '剛猛掌法與陰柔內功俱大成、拳掌造詣 ≥45 時合參推演', svg: [2, 1], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 0.7, neigong: 0.3 }},
  { id: 'liufengSword', name: '流風迴雪劍', school: 'palm', grade: 3, tags: ['快', '巧'], weapon: 'sword', attr: 'he', req: [], techs: ['lf1', 'lf2'], tech: 'lf1', secret: true, derived: true, v24: true, hint: '劍法與身法俱大成、劍法造詣 ≥45 時合參推演', svg: [2, 4], mode: 'da', qiScale: 0.08, isPublic: false, cats: { jianfa: 0.7, shenfa: 0.3 }},
  { id: 'fuguFinger', name: '腐骨抽髓指', school: 'palm', grade: 3, tags: ['巧'], type: 'finger', attr: 'yin', req: [], techs: ['fg1', 'fg2'], tech: 'fg1', secret: true, derived: true, v24: true, hint: '點穴指法與毒術俱大成、拳掌造詣 ≥40 時合參推演', svg: [1, 4], mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 0.5, dushu: 0.5 }},
  { id: 'qiankunBlade', name: '乾坤霸刀', school: 'palm', grade: 3, tags: ['剛'], weapon: 'blade', attr: 'yang', req: [], techs: ['qkb1', 'qkb2'], tech: 'qkb1', secret: true, derived: true, v24: true, hint: '刀棍與內功俱大成、棍棒造詣 ≥45 時合參推演', svg: [0, 4], mode: 'da', qiScale: 0.08, isPublic: false, cats: { gunbang: 0.7, neigong: 0.3 }},
);
MOVES.push(
  { id: 'hb1', skill: 'palm', name: '寒冰掌勁', req: 0, range: 50, cd: 1.6, dmg: 18, aoe: 0, color: '#9fd8f0' }, { id: 'hb2', skill: 'palm', name: '冰封千里', req: 0, range: 50, cd: 2.6, dmg: 22, aoe: 50, color: '#c8f0ff' },
  { id: 'lf1', skill: 'palm', name: '流風', req: 0, range: 58, cd: 0.9, dmg: 11, aoe: 0, color: '#d8e8f8' }, { id: 'lf2', skill: 'palm', name: '迴雪', req: 0, range: 58, cd: 1.3, dmg: 15, aoe: 30, color: '#f0f8ff' },
  { id: 'fg1', skill: 'palm', name: '腐骨', req: 0, range: 44, cd: 1.3, dmg: 15, aoe: 0, color: '#6a8a3a' }, { id: 'fg2', skill: 'palm', name: '抽髓', req: 0, range: 44, cd: 2.0, dmg: 20, aoe: 0, color: '#4a6a2a' },
  { id: 'qkb1', skill: 'palm', name: '霸刀斬', req: 0, range: 54, cd: 1.8, dmg: 20, aoe: 30, color: '#c86a3a' }, { id: 'qkb2', skill: 'palm', name: '乾坤一擲', req: 0, range: 60, cd: 2.8, dmg: 26, aoe: 60, color: '#e88a4a' },
);
/* loop168 v2.55：五大新門派專屬武學（t190 補齊 t189 截斷項）。classic＋v24、非 secret：本門弟子順 req 自悟／傳功；own24＝所屬門派，他派（含無名派）受 lockedArt24 保護，偷師為跨派管道。
   svg 第 8–10 列：各派只看得到本門（他派鎖住不畫），所以各派共用同一組格位 */
ARTS.push(
  { id: 'emeiJiuyang', name: '峨眉九陽功', school: 'inner', grade: 2, tags: ['柔', '剛'], attr: 'he', req: [], tech: null, techs: ['九陽', '歸元'], effect: 'rest', v24: true, classic: true, own24: 'emei', svg: [1, 8], isPublic: false, cats: { neigong: 1 }},
  { id: 'linjiZhuang', chiefOnly24: true, name: '臨濟十二莊', school: 'inner', grade: 3, tags: ['柔'], attr: 'he', req: [{ art: 'emeiJiuyang', tier: 1 }], tech: null, techs: ['天字莊', '地字莊', '玄字莊', '黃字莊', '宇字莊', '宙字莊'], zhuang: ['天字莊', '地字莊', '玄字莊', '黃字莊', '宇字莊', '宙字莊'], zhuangAt: [1, 2, 3, 5, 6], effect: 'rest', v24: true, classic: true, own24: 'emei', svg: [2, 8], isPublic: false, cats: { neigong: 0.8, yishu: 0.2 }},
  { id: 'emeiSword', name: '峨眉劍法', school: 'palm', grade: 1, tags: ['巧', '柔'], weapon: 'sword', attr: 'yin', req: [], techs: ['em1', 'em2'], tech: 'em1', v24: true, classic: true, own24: 'emei', svg: [0, 9], mode: 'base', qiScale: 0.15, isPublic: false, cats: { jianfa: 1 }},
  { id: 'huifengSword', name: '回風拂柳劍', school: 'palm', grade: 3, tags: ['巧', '柔'], weapon: 'sword', attr: 'he', req: [{ art: 'emeiSword', tier: 2 }], techs: ['hf1', 'hf2'], tech: 'hf1', v24: true, classic: true, own24: 'emei', svg: [2, 9], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { jianfa: 1 }},
  { id: 'jindingPalm', name: '金頂綿掌', school: 'palm', grade: 2, tags: ['柔'], attr: 'yin', req: [], techs: ['jd1', 'jd2'], tech: 'jd1', v24: true, classic: true, own24: 'emei', svg: [1, 10], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 1 }},
  { id: 'tiangangFinger', name: '天罡指穴法', school: 'palm', grade: 2, tags: ['巧'], type: 'finger', attr: 'he', req: [{ art: 'jindingPalm', tier: 1 }], techs: ['tg1', 'tg2'], tech: 'tg1', v24: true, classic: true, own24: 'emei', svg: [2, 10], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 0.5, qimen: 0.5 }},
  { id: 'jiuyinClaw', name: '九陰白骨爪', school: 'palm', grade: 3, tags: ['快', '陰'], attr: 'yin', req: [], techs: ['jy1', 'jy2'], tech: 'jy1', v24: true, classic: true, own24: 'ban', svg: [0, 10], mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 1 }},
  { id: 'wudangJiuyang', chiefOnly24: true, name: '純陽無極功', school: 'inner', grade: 3, tags: ['柔', '剛'], attr: 'he', req: [{ art: 'wudangXinfa', tier: 1 }], tech: null, techs: ['純陽', '無極'], effect: 'rest', v24: true, classic: true, own24: 'wudang', svg: [2, 8], isPublic: false, cats: { neigong: 1 }},
  { id: 'wudangFist', name: '武當長拳', school: 'fist', grade: 1, tags: ['柔', '拙'], attr: 'he', req: [], techs: ['wd1', 'wd2'], tech: 'wd1', v24: true, classic: true, own24: 'wudang', svg: [0, 9], mode: 'base', qiScale: 0.15, isPublic: false, cats: { quanzhang: 1 }},
  { id: 'rouyunSword', name: '柔雲劍法', school: 'palm', grade: 2, tags: ['柔', '巧'], weapon: 'sword', attr: 'he', req: [{ art: 'basicSword', tier: 1 }], techs: ['ry1', 'ry2'], tech: 'ry1', v24: true, classic: true, own24: 'wudang', svg: [1, 10], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { jianfa: 1 }},
  { id: 'taijiSword', chiefOnly24: true, name: '太極劍', school: 'palm', grade: 3, tags: ['柔', '巧'], weapon: 'sword', attr: 'he', req: [{ art: 'rouyunSword', tier: 2 }], alt24: [{ art: 'taiji', tier: 2 }], techs: ['tjs1', 'tjs2'], tech: 'tjs1', v24: true, classic: true, own24: 'wudang', svg: [2, 10], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { jianfa: 1 }},
  { id: 'biboXinfa', name: '碧波心法', school: 'inner', grade: 2, tags: ['巧', '柔'], attr: 'yin', req: [], tech: null, techs: ['碧海', '潮生'], effect: 'rest', v24: true, classic: true, own24: 'taohua', svg: [1, 8], isPublic: false, cats: { neigong: 0.7, qimen: 0.3 }},
  { id: 'luoyingPalm', name: '落英神劍掌', school: 'palm', grade: 2, tags: ['巧'], attr: 'yin', req: [], techs: ['ly1', 'ly2'], tech: 'ly1', v24: true, classic: true, own24: 'taohua', secret: true, self24: true, hint: '碧波心法到小成後，在島上對著落花自己練，不經師父傳', svg: [1, 9], mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 0.7, jianfa: 0.3 }},
  { id: 'lanhuaHand', chiefOnly24: true, name: '蘭花拂穴手', school: 'palm', grade: 3, tags: ['巧'], attr: 'yin', req: [{ art: 'luoyingPalm', tier: 2 }], techs: ['lh1', 'lh2'], tech: 'lh1', v24: true, classic: true, own24: 'taohua', svg: [2, 9], mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 0.5, qimen: 0.5 }},
  { id: 'yuxiaoSword', name: '玉簫劍法', school: 'palm', grade: 3, tags: ['巧'], weapon: 'sword', attr: 'he', req: [{ art: 'biboXinfa', tier: 1 }, { art: 'basicSword', tier: 1 }], techs: ['yx1', 'yx2'], tech: 'yx1', v24: true, classic: true, own24: 'taohua', svg: [2, 10], mode: 'da', qiScale: 0.08, isPublic: false, cats: { jianfa: 0.7, qimen: 0.3 }},
  { id: 'tianluoPalm', name: '天羅地網勢', school: 'palm', grade: 2, tags: ['快', '巧'], attr: 'yin', req: [], techs: ['tl1', 'tl2'], tech: 'tl1', v24: true, classic: true, own24: 'gumu', svg: [1, 8], mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 0.6, shenfa: 0.4 }},
  { id: 'yunvSword', chiefOnly24: true, name: '玉女素心劍', school: 'palm', grade: 3, tags: ['巧', '柔'], weapon: 'sword', attr: 'yin', req: [{ art: 'tianluoPalm', tier: 2 }], techs: ['ys1', 'ys2'], tech: 'ys1', v24: true, classic: true, own24: 'gumu', svg: [2, 8], mode: 'da', qiScale: 0.08, isPublic: false, cats: { jianfa: 1 }},
  { id: 'shenmuGong', name: '神木毒功', school: 'inner', grade: 2, tags: ['陰', '巧'], attr: 'yin', req: [{ art: 'breath', tier: 1 }], tech: null, techs: ['神木', '化毒'], effect: 'rest', v24: true, classic: true, own24: 'xingxiu', deprecated: true, secret: true, cats: { neigong: 0.7, dushu: 0.3 }, svg: [1, 8], isPublic: false}, /* loop201：退出學習池。舊開發存檔仍讀得到這門內功 */
  { id: 'huagongDafa', chiefOnly24: true, name: '化功大法', school: 'inner', grade: 3, tags: ['陰', '剛'], attr: 'yin', req: [], tech: null, techs: ['化功', '散功'], effect: 'rest', v24: true, classic: true, own24: 'xingxiu', svg: [2, 8], isPublic: false, cats: { neigong: 0.6, dushu: 0.4 }},
  { id: 'chousuiPalm', name: '抽髓掌', school: 'palm', grade: 2, tags: ['陰'], attr: 'yin', req: [], techs: ['cs1', 'cs2'], tech: 'cs1', v24: true, classic: true, own24: 'xingxiu', svg: [1, 9], mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 0.5, dushu: 0.5 }},
  { id: 'sanyinClaw', name: '三陰蜈蚣爪', school: 'palm', grade: 3, tags: ['快', '陰'], attr: 'yin', req: [{ art: 'chousuiPalm', tier: 2 }], techs: ['sy1', 'sy2'], tech: 'sy1', v24: true, classic: true, own24: 'xingxiu', svg: [2, 9], mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 0.5, dushu: 0.5 }},
  /* loop174 v2.6（t191）*/
  { id: 'yunlongXinfa', name: '雲龍心法', school: 'inner', grade: 2, tags: ['巧', '剛'], attr: 'he', req: [{ art: 'breath', tier: 1 }], tech: null, techs: ['雲龍', '風虎'], effect: 'rest', v24: true, classic: true, own24: 'tiandihui', svg: [1, 18], isPublic: false, cats: { neigong: 1 }},
  { id: 'shenxingStep', name: '神行百變', school: 'step', grade: 3, tags: ['巧', '快'], attr: 'yin', req: [{ art: 'snowStep', tier: 2 }], tech: null, techs: ['神行', '百變'], effect: 'speed', v24: true, classic: true, own24: 'tiandihui', svg: [2, 18], mode: 'da', qiScale: 0.08, isPublic: false, cats: { shenfa: 1 }},
  { id: 'baihuaFist', name: '百花錯拳', school: 'fist', grade: 2, tags: ['巧', '柔'], attr: 'he', req: [{ art: 'basicFist', tier: 1 }], techs: ['bh1', 'bh2', 'bh3'], tech: 'bh1', v24: true, classic: true, own24: 'tiandihui', svg: [1, 19], mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 1 }},
  { id: 'yunlongSword', name: '雲龍劍法', school: 'palm', grade: 2, tags: ['巧', '剛'], weapon: 'sword', attr: 'yang', req: [{ art: 'basicSword', tier: 1 }], techs: ['yl1', 'yl2', 'yl3'], tech: 'yl1', v24: true, classic: true, own24: 'tiandihui', svg: [2, 19], mode: 'da', qiScale: 0.08, isPublic: false, cats: { jianfa: 1 }},
  { id: 'zhaixingStep', name: '摘星功', school: 'step', grade: 2, tags: ['快', '陰'], attr: 'yin', req: [], tech: null, techs: ['摘星', '飛星'], effect: 'speed', v24: true, classic: true, own24: 'xingxiu', svg: [1, 20], mode: 'da', qiScale: 0.08, isPublic: false, cats: { shenfa: 1 }},
  /* loop173 v2.6（t191）*/
  { id: 'huntianGong', name: '混天氣功', school: 'inner', grade: 2, tags: ['剛'], attr: 'yang', req: [{ art: 'breath', tier: 1 }], tech: null, techs: ['混天', '氣壯'], effect: 'rest', v24: true, classic: true, own24: 'gaibang', svg: [1, 14], isPublic: false, cats: { neigong: 1 }},
  { id: 'xiaoyaoStep', name: '逍遙遊', school: 'step', grade: 2, tags: ['巧', '柔'], attr: 'he', req: [{ art: 'snowStep', tier: 1 }], tech: null, techs: ['逍遙', '遊身'], effect: 'speed', v24: true, classic: true, own24: 'gaibang', svg: [1, 15], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { shenfa: 1 }},
  { id: 'lianhuaPalm', name: '蓮花掌', school: 'palm', grade: 2, tags: ['剛', '巧'], attr: 'yang', req: [{ art: 'pushPalm', tier: 1 }], techs: ['lp1', 'lp2'], tech: 'lp1', v24: true, classic: true, own24: 'gaibang', svg: [2, 14], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 1 }},
  { id: 'fengmoStaff', name: '瘋魔杖法', school: 'leg', grade: 2, tags: ['剛', '快'], weapon: 'staff', attr: 'yang', req: [{ art: 'sweepLeg', tier: 1 }], techs: ['fm1', 'fm2'], tech: 'fm1', v24: true, classic: true, own24: 'gaibang', svg: [2, 15], mode: 'da', qiScale: 0.08, isPublic: false, cats: { gunbang: 1 }},
  { id: 'shenghuoXinfa', name: '聖火心法', school: 'inner', grade: 2, tags: ['剛', '柔'], attr: 'yang', req: [{ art: 'breath', tier: 1 }], tech: null, techs: ['聖火', '不滅'], effect: 'rest', v24: true, classic: true, own24: 'mingjiao', svg: [1, 16], isPublic: false, cats: { neigong: 1 }},
  { id: 'qingfuStep', name: '青蝠身法', school: 'step', grade: 2, tags: ['快', '巧'], attr: 'yin', req: [{ art: 'snowStep', tier: 1 }], tech: null, techs: ['青蝠', '掠影'], effect: 'speed', v24: true, classic: true, own24: 'mingjiao', svg: [1, 17], mode: 'da', qiScale: 0.08, isPublic: false, cats: { shenfa: 1 }},
  { id: 'yingzhuaHand', name: '鷹爪擒拿手', school: 'palm', grade: 2, tags: ['剛', '巧'], attr: 'yang', req: [{ art: 'basicFist', tier: 1 }], techs: ['yz1', 'yz2'], tech: 'yz1', v24: true, classic: true, own24: 'mingjiao', svg: [2, 16], mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 0.7, qimen: 0.3 }},
  { id: 'qishangFist', chiefOnly24: true, name: '七傷拳', school: 'fist', grade: 3, tags: ['剛'], attr: 'yang', req: [{ art: 'yingzhuaHand', tier: 1 }], techs: ['qs1', 'qs2'], tech: 'qs1', v24: true, classic: true, own24: 'mingjiao', svg: [3, 16], mode: 'da', qiScale: 0.40, isPublic: false, cats: { quanzhang: 1 }},
  /* loop172 v2.6（t191）*/
  { id: 'huashanXinfa', name: '華山心法', school: 'inner', grade: 1, tags: ['柔'], attr: 'he', req: [], tech: null, techs: ['紫氣', '養元'], effect: 'rest', v24: true, classic: true, own24: 'qizong', svg: [0, 11], isPublic: false, cats: { neigong: 1 }},
  { id: 'pishiFist', name: '劈石破玉拳', school: 'fist', grade: 1, tags: ['剛'], attr: 'yang', req: [], techs: ['ps1', 'ps2'], tech: 'ps1', v24: true, classic: true, own24: 'qizong', svg: [0, 12], mode: 'base', qiScale: 0.15, isPublic: false, cats: { quanzhang: 1 }},
  { id: 'hunyuanPalm', name: '混元掌', school: 'palm', grade: 2, tags: ['柔', '剛'], attr: 'he', req: [{ art: 'pishiFist', tier: 1 }, { art: 'huashanXinfa', tier: 1 }], techs: ['hy1', 'hy2'], tech: 'hy1', v24: true, classic: true, own24: 'qizong', svg: [1, 12], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 0.7, neigong: 0.3 }},
  { id: 'kuangfengSword', chiefOnly24: true, name: '狂風快劍', school: 'palm', grade: 3, tags: ['快', '巧'], weapon: 'sword', attr: 'yin', req: [{ art: 'huashanSword', tier: 2 }], elder: HUASHAN_ELDER, techs: ['kf1', 'kf2'], tech: 'kf1', v24: true, classic: true, own24: 'jianzong', svg: [2, 12], mode: 'da', qiScale: 0.08, isPublic: false, cats: { jianfa: 1 }},
  { id: 'jianzongXinfa', name: '劍宗心法', school: 'inner', grade: 1, tags: ['巧'], attr: 'he', req: [], tech: null, techs: ['養劍', '凝氣'], effect: 'rest', v24: true, classic: true, own24: 'jianzong', svg: [0, 21], isPublic: false, cats: { neigong: 1 }}, /* loop191：劍宗本門樹原本只有外功專屬，補一品內功才湊得齊三才 */
  { id: 'wudangXinfa', name: '武當心法', school: 'inner', grade: 1, tags: ['柔'], attr: 'he', req: [], tech: null, techs: ['守一', '歸真'], effect: 'rest', v24: true, classic: true, own24: 'wudang', svg: [0, 13], isPublic: false, cats: { neigong: 1 }},
  { id: 'mianPalm', name: '武當綿掌', school: 'palm', grade: 2, tags: ['柔'], attr: 'he', req: [{ art: 'wudangFist', tier: 1 }], techs: ['mp1', 'mp2'], tech: 'mp1', v24: true, classic: true, own24: 'wudang', svg: [1, 13], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 1 }},
);
MOVES.push(
  { id: 'em1', skill: 'palm', name: '金頂佛光', req: 0, range: 46, cd: 1.0, dmg: 7, aoe: 0, color: '#c8a8c8' }, { id: 'em2', skill: 'palm', name: '峨眉刺', req: 0, range: 50, cd: 1.4, dmg: 10, aoe: 0, color: '#b898b8' },
  { id: 'hf1', skill: 'palm', name: '回風', req: 0, range: 58, cd: 1.1, dmg: 13, aoe: 0, color: '#d8c8e8' }, { id: 'hf2', skill: 'palm', name: '拂柳', req: 0, range: 62, cd: 1.8, dmg: 19, aoe: 40, color: '#c8b8d8' },
  { id: 'jd1', skill: 'palm', name: '綿掌', req: 0, range: 40, cd: 1.3, dmg: 11, aoe: 0, color: '#d8b8c8' }, { id: 'jd2', skill: 'palm', name: '金頂迎風', req: 0, range: 46, cd: 1.9, dmg: 14, aoe: 30, color: '#c8a8b8' },
  { id: 'tg1', skill: 'palm', name: '點穴', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#a898c8' }, { id: 'tg2', skill: 'palm', name: '天罡封脈', req: 0, range: 44, cd: 1.7, dmg: 13, aoe: 0, color: '#9888b8' },
  { id: 'jy1', skill: 'palm', name: '白骨爪', req: 0, range: 40, cd: 1.2, dmg: 18, aoe: 0, color: '#d8d8c0' }, { id: 'jy2', skill: 'palm', name: '九陰神爪', req: 0, range: 44, cd: 2.0, dmg: 26, aoe: 0, color: '#c8c8a8' },
  { id: 'wd1', skill: 'palm', name: '長拳', req: 0, range: 34, cd: 1.0, dmg: 6, aoe: 0, color: '#8aa0b8' }, { id: 'wd2', skill: 'palm', name: '真武沖拳', req: 0, range: 38, cd: 1.5, dmg: 9, aoe: 0, color: '#7a90a8' },
  { id: 'ry1', skill: 'palm', name: '柔雲', req: 0, range: 54, cd: 1.4, dmg: 11, aoe: 0, color: '#c8d8e8' }, { id: 'ry2', skill: 'palm', name: '雲出岫', req: 0, range: 56, cd: 2.0, dmg: 14, aoe: 40, color: '#b8c8d8' },
  { id: 'tjs1', skill: 'palm', name: '三環套月', req: 0, range: 58, cd: 1.1, dmg: 13, aoe: 0, color: '#e0e0e0' }, { id: 'tjs2', skill: 'palm', name: '太極劍圈', req: 0, range: 62, cd: 1.9, dmg: 19, aoe: 50, color: '#d0d0d0' },
  { id: 'ly1', skill: 'palm', name: '落英', req: 0, range: 48, cd: 1.3, dmg: 11, aoe: 0, color: '#e8a8b8' }, { id: 'ly2', skill: 'palm', name: '繽紛', req: 0, range: 52, cd: 1.9, dmg: 14, aoe: 40, color: '#d898a8' },
  { id: 'lh1', skill: 'palm', name: '蘭花拂穴', req: 0, range: 42, cd: 1.0, dmg: 13, aoe: 0, color: '#c8a8d8' }, { id: 'lh2', skill: 'palm', name: '拈花', req: 0, range: 46, cd: 1.7, dmg: 19, aoe: 0, color: '#b898c8' },
  { id: 'yx1', skill: 'palm', name: '簫中劍', req: 0, range: 56, cd: 1.1, dmg: 13, aoe: 0, color: '#a8d8c8' }, { id: 'yx2', skill: 'palm', name: '碧海潮生', req: 0, range: 62, cd: 1.9, dmg: 19, aoe: 50, color: '#98c8b8' },
  { id: 'tl1', skill: 'palm', name: '天羅', req: 0, range: 44, cd: 1.1, dmg: 10, aoe: 0, color: '#a8b8d0' }, { id: 'tl2', skill: 'palm', name: '地網', req: 0, range: 50, cd: 1.7, dmg: 13, aoe: 50, color: '#98a8c0' },
  { id: 'ys1', skill: 'palm', name: '素心', req: 0, range: 56, cd: 1.0, dmg: 13, aoe: 0, color: '#e0e8f8' }, { id: 'ys2', skill: 'palm', name: '玉女投梭', req: 0, range: 60, cd: 1.8, dmg: 19, aoe: 30, color: '#d0d8f0' },
  { id: 'cs1', skill: 'palm', name: '抽髓', req: 0, range: 40, cd: 1.3, dmg: 11, aoe: 0, color: '#6a9a4a' }, { id: 'cs2', skill: 'palm', name: '腐屍毒掌', req: 0, range: 44, cd: 1.9, dmg: 14, aoe: 30, color: '#5a8a3a' },
  { id: 'sy1', skill: 'palm', name: '蜈蚣爪', req: 0, range: 40, cd: 1.0, dmg: 13, aoe: 0, color: '#7a8a3a' }, { id: 'sy2', skill: 'palm', name: '三陰絕戶', req: 0, range: 44, cd: 1.7, dmg: 19, aoe: 0, color: '#6a7a2a' },
  { id: 'bh1', skill: 'palm', name: '錯拳', req: 0, range: 38, cd: 1.2, dmg: 11, aoe: 0, color: '#5a9a6a' }, { id: 'bh2', skill: 'palm', name: '百花齊放', req: 0, range: 42, cd: 1.9, dmg: 14, aoe: 30, color: '#4a8a5a' },
  { id: 'yl1', skill: 'palm', name: '雲龍', req: 0, range: 54, cd: 1.3, dmg: 11, aoe: 0, color: '#7aba8a' }, { id: 'yl2', skill: 'palm', name: '龍騰', req: 0, range: 58, cd: 1.9, dmg: 14, aoe: 40, color: '#6aaa7a' },
  { id: 'lp1', skill: 'palm', name: '蓮花', req: 0, range: 42, cd: 1.3, dmg: 11, aoe: 0, color: '#c8a070' }, { id: 'lp2', skill: 'palm', name: '步步生蓮', req: 0, range: 46, cd: 1.9, dmg: 14, aoe: 30, color: '#b89060' },
  { id: 'fm1', skill: 'palm', name: '瘋魔', req: 0, range: 48, cd: 1.2, dmg: 11, aoe: 0, color: '#a08050' }, { id: 'fm2', skill: 'palm', name: '群魔亂舞', req: 0, range: 52, cd: 1.9, dmg: 14, aoe: 40, color: '#907040' },
  { id: 'yz1', skill: 'palm', name: '鷹爪', req: 0, range: 40, cd: 1.2, dmg: 11, aoe: 0, color: '#c86a4a' }, { id: 'yz2', skill: 'palm', name: '擒拿', req: 0, range: 44, cd: 1.8, dmg: 14, aoe: 0, color: '#b85a3a' },
  { id: 'qs1', skill: 'palm', name: '七傷', req: 0, range: 40, cd: 1.2, dmg: 18, aoe: 0, color: '#d84a2a' }, { id: 'qs2', skill: 'palm', name: '一拳七勁', req: 0, range: 44, cd: 2.0, dmg: 26, aoe: 0, color: '#c83a1a' },
  { id: 'ps1', skill: 'palm', name: '劈石', req: 0, range: 36, cd: 1.0, dmg: 7, aoe: 0, color: '#8a9ab8' }, { id: 'ps2', skill: 'palm', name: '破玉', req: 0, range: 40, cd: 1.4, dmg: 10, aoe: 0, color: '#7a8aa8' },
  { id: 'hy1', skill: 'palm', name: '混元一氣', req: 0, range: 42, cd: 1.3, dmg: 11, aoe: 0, color: '#9aa8d0' }, { id: 'hy2', skill: 'palm', name: '氣貫長虹', req: 0, range: 46, cd: 1.9, dmg: 14, aoe: 30, color: '#8a98c0' },
  { id: 'kf1', skill: 'palm', name: '狂風', req: 0, range: 54, cd: 0.7, dmg: 10, aoe: 0, color: '#c8d0d8' }, { id: 'kf2', skill: 'palm', name: '快劍連環', req: 0, range: 58, cd: 1.2, dmg: 15, aoe: 30, color: '#b8c0c8' },
  { id: 'mp1', skill: 'palm', name: '綿掌', req: 0, range: 40, cd: 1.3, dmg: 11, aoe: 0, color: '#9ab0c8' }, { id: 'mp2', skill: 'palm', name: '綿裡藏針', req: 0, range: 44, cd: 1.9, dmg: 14, aoe: 30, color: '#8aa0b8' },
  { id: 'bh3', skill: 'palm', name: '百花錯落', req: 0, range: 48, cd: 1.5, dmg: 20, aoe: 40, color: '#3a7a4a' },
  { id: 'yl3', skill: 'palm', name: '雲龍三折', req: 0, range: 62, cd: 1.6, dmg: 22, aoe: 40, color: '#5a9a6a' },
);
/* #409 各派武學樹補完。這些門不進名次段，R＝1。入門、小成跟大家一樣；大成才多開的那一招，是跟入門拉開的地方。 */
ARTS.push(
  { id: 'wulian', name: '劍掌五連環', school: 'palm', grade: 3, tags: ['巧', '快'], weapon: 'sword', attr: 'he', req: [{ art: 'huashanSword', tier: 2 }, { art: 'hunyuanPalm', tier: 2 }], elder: HUASHAN_ELDER, techs: ['n6wl1', 'n6wl2', 'n6wl3'], tech: 'n6wl1', v24: true, classic: true, own24: 'qizong', svg: [0, 22], mode: 'da', qiScale: 0.08, isPublic: false, cats: { jianfa: 0.5, quanzhang: 0.5 }},
  { id: 'yangwu', name: '養吾劍法', school: 'palm', grade: 3, tags: ['巧'], weapon: 'sword', attr: 'yang', req: [{ art: 'huashanSword', tier: 2 }], elder: HUASHAN_ELDER, techs: ['n6yw1', 'n6yw2', 'n6yw3'], tech: 'n6yw1', v24: true, svg: [1, 22], mode: 'da', qiScale: 0.08, isPublic: false, cats: { jianfa: 1 }},
  { id: 'taiyue', name: '太岳三青峰', school: 'palm', grade: 3, tags: ['剛'], weapon: 'sword', attr: 'yang', req: [{ art: 'huashanSword', tier: 2 }], elder: HUASHAN_ELDER, techs: ['n6ty1', 'n6ty2', 'n6ty3'], tech: 'n6ty1', v24: true, svg: [2, 22], mode: 'da', qiScale: 0.08, isPublic: false, cats: { jianfa: 1 }},
  { id: 'taijiClaw', name: '太極爪', school: 'palm', grade: 3, tags: ['柔', '巧'], attr: 'he', req: [{ art: 'mianPalm', tier: 1 }], alt24: [{ art: 'wudangFist', tier: 1 }], techs: ['n6tc1', 'n6tc2', 'n6tc3'], tech: 'n6tc1', v24: true, classic: true, own24: 'wudang', svg: [0, 23], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 1 }},
  { id: 'xuanxuBlade', name: '玄虛刀', school: 'palm', grade: 3, tags: ['柔'], weapon: 'blade', attr: 'he', req: [{ art: 'mianPalm', tier: 1 }], alt24: [{ art: 'wudangFist', tier: 1 }], techs: ['n6xd1', 'n6xd2', 'n6xd3'], tech: 'n6xd1', v24: true, classic: true, own24: 'wudang', svg: [1, 23], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { gunbang: 0.7, quanzhang: 0.3 }},
  { id: 'yanhang', name: '雁行刀', school: 'palm', grade: 2, tags: ['快'], weapon: 'blade', attr: 'yang', req: [{ art: 'huifengSword', tier: 1 }], techs: ['n6yh1', 'n6yh2'], tech: 'n6yh1', v24: true, classic: true, own24: 'emei', svg: [0, 24], mode: 'da', qiScale: 0.08, isPublic: false, cats: { gunbang: 0.6, quanzhang: 0.4 }},
  { id: 'jieshou', name: '截手九式', school: 'palm', grade: 3, tags: ['巧'], attr: 'he', req: [{ art: 'tiangangFinger', tier: 1 }], techs: ['n6js1', 'n6js2', 'n6js3'], tech: 'n6js1', v24: true, classic: true, own24: 'emei', svg: [1, 24], mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 0.6, qimen: 0.4 }},
  { id: 'tanzhi', name: '彈指神通', school: 'palm', grade: 3, tags: ['巧'], type: 'finger', attr: 'yin', req: [{ art: 'biboXinfa', tier: 1 }], techs: ['n6tz1', 'n6tz2', 'n6tz3'], tech: 'n6tz1', v24: true, classic: true, own24: 'taohua', svg: [2, 24], mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 0.7, qimen: 0.3 }},
  { id: 'meinvFist', name: '美女拳', school: 'fist', grade: 2, tags: ['巧', '柔'], attr: 'yin', req: [{ art: 'tianluoPalm', tier: 1 }], techs: ['n6mn1', 'n6mn2'], tech: 'n6mn1', v24: true, classic: true, own24: 'gumu', svg: [0, 25], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 1 }},
  { id: 'yunvJian', name: '玉女劍法', school: 'palm', grade: 3, tags: ['柔', '巧'], weapon: 'sword', attr: 'yin', req: [{ art: 'basicSword', tier: 1 }], techs: ['n6yj1', 'n6yj2', 'n6yj3'], tech: 'n6yj1', v24: true, classic: true, own24: 'gumu', svg: [1, 25], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { jianfa: 1 }},
  { id: 'changhen', name: '長恨鞭', school: 'palm', grade: 2, tags: ['柔'], weapon: 'whip', attr: 'yin', req: [{ art: 'tianluoPalm', tier: 1 }], techs: ['n6ch1', 'n6ch2'], tech: 'n6ch1', v24: true, classic: true, own24: 'gumu', svg: [2, 25], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { gunbang: 0.6, quanzhang: 0.4 }},
  { id: 'qianmie', name: '千滅銀針', school: 'palm', grade: 2, tags: ['巧'], attr: 'yin', req: [{ art: 'tianluoPalm', tier: 1 }], techs: ['n6qm1', 'n6qm2'], tech: 'n6qm1', v24: true, classic: true, own24: 'gumu', svg: [0, 26], mode: 'da', qiScale: 0.08, isPublic: false, cats: { qimen: 1 }},
  { id: 'qufeng', name: '驅蜂術', school: 'palm', grade: 2, tags: ['巧'], attr: 'yin', req: [{ art: 'tianluoPalm', tier: 1 }], techs: ['n6qf1', 'n6qf2'], tech: 'n6qf1', v24: true, classic: true, own24: 'gumu', svg: [1, 26], mode: 'da', qiScale: 0.08, isPublic: false, cats: { qimen: 0.5, dushu: 0.5 }},
  { id: 'jiuyinGong', chiefOnly24: true, name: '九陰神功', school: 'inner', grade: 3, tags: ['陰'], attr: 'yin', req: [{ art: 'breath', tier: 1 }], tech: null, techs: ['九陰', '總綱'], effect: 'rest', v24: true, classic: true, own24: 'gumu', svg: [2, 26], isPublic: false, cats: { neigong: 1 }},
  { id: 'xianyunStep', name: '纖雲步', school: 'step', grade: 2, tags: ['柔'], effect: 'speed', attr: 'yin', req: [{ art: 'stepFeather', tier: 1 }], tech: null, techs: ['纖雲', '踏影'], v24: true, classic: true, own24: 'gumu', svg: [0, 27], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { shenfa: 1 }},
  { id: 'tianshanStaff', name: '天山杖法', school: 'leg', grade: 2, tags: ['剛'], weapon: 'staff', attr: 'yang', req: [{ art: 'chousuiPalm', tier: 1 }], techs: ['n6ts1', 'n6ts2'], tech: 'n6ts1', v24: true, classic: true, own24: 'xingxiu', svg: [1, 27], mode: 'da', qiScale: 0.08, isPublic: false, cats: { gunbang: 1 }},
  { id: 'zhaixingHand', name: '摘星手', school: 'palm', grade: 2, tags: ['快'], attr: 'yin', req: [{ art: 'chousuiPalm', tier: 1 }], techs: ['n6zx1', 'n6zx2'], tech: 'n6zx1', v24: true, classic: true, own24: 'xingxiu', svg: [2, 27], mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 0.6, shenfa: 0.4 }},
  { id: 'mingtian', name: '冥天九式', school: 'palm', grade: 3, tags: ['陰'], attr: 'yin', req: [{ art: 'chousuiPalm', tier: 2 }], techs: ['n6mt1', 'n6mt2', 'n6mt3'], tech: 'n6mt1', v24: true, classic: true, own24: 'xingxiu', svg: [0, 28], mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 0.5, dushu: 0.5 }},
  { id: 'xiaowuxiang', chiefOnly24: true, name: '小無相功', school: 'inner', grade: 3, tags: ['柔'], attr: 'yin', req: [{ art: 'breath', tier: 1 }], tech: null, techs: ['無相', '摹形'], effect: 'rest', v24: true, classic: true, own24: 'xingxiu', svg: [1, 28], isPublic: false, cats: { neigong: 1 }},
  { id: 'liuheBlade', name: '六合刀', school: 'palm', grade: 2, tags: ['剛'], weapon: 'blade', attr: 'yang', req: [{ art: 'basicFist', tier: 1 }], techs: ['n6ld1', 'n6ld2'], tech: 'n6ld1', v24: true, classic: true, own24: 'gaibang', svg: [2, 28], mode: 'da', qiScale: 0.08, isPublic: false, cats: { gunbang: 0.7, quanzhang: 0.3 }},
  { id: 'shexingHand', name: '蛇形刁手', school: 'palm', grade: 2, tags: ['巧', '柔'], attr: 'yin', req: [{ art: 'lianhuaPalm', tier: 1 }], techs: ['n6sx1', 'n6sx2'], tech: 'n6sx1', v24: true, classic: true, own24: 'gaibang', svg: [0, 29], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 1 }},
  { id: 'guangmingGong', name: '光明聖火功', school: 'inner', grade: 2, tags: ['剛', '柔'], attr: 'yang', req: [{ art: 'shenghuoXinfa', tier: 1 }], elder: MING_ELDER, tech: null, techs: ['光明', '薪傳'], effect: 'rest', v24: true, classic: true, own24: 'mingjiao', svg: [1, 29], isPublic: false, cats: { neigong: 1 }},
  { id: 'shenghuoLing', name: '聖火令', school: 'palm', grade: 3, tags: ['剛'], weapon: 'ling', attr: 'yang', req: [{ art: 'shenghuoXinfa', tier: 1 }], elder: MING_ELDER, techs: ['n6sl1', 'n6sl2', 'n6sl3'], tech: 'n6sl1', v24: true, classic: true, own24: 'mingjiao', svg: [2, 29], mode: 'da', qiScale: 0.08, isPublic: false, cats: { gunbang: 0.5, qimen: 0.5 }},
  { id: 'lieyanBlade', name: '烈焰刀', school: 'palm', grade: 2, tags: ['剛', '快'], weapon: 'blade', attr: 'yang', req: [{ art: 'yingzhuaHand', tier: 1 }], techs: ['n6ly1', 'n6ly2'], tech: 'n6ly1', v24: true, classic: true, own24: 'mingjiao', svg: [0, 30], mode: 'da', qiScale: 0.08, isPublic: false, cats: { gunbang: 0.8, quanzhang: 0.2 }},
  { id: 'hanbingMian', name: '寒冰綿掌', school: 'palm', grade: 2, tags: ['柔'], attr: 'yin', req: [{ art: 'yingzhuaHand', tier: 1 }], techs: ['n6hm1', 'n6hm2'], tech: 'n6hm1', v24: true, classic: true, own24: 'mingjiao', svg: [1, 30], mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 1 }},
  { id: 'feihua', name: '飛花摘葉', school: 'palm', grade: 2, tags: ['巧'], attr: 'he', req: [{ art: 'yingzhuaHand', tier: 1 }], techs: ['n6fh1', 'n6fh2'], tech: 'n6fh1', v24: true, classic: true, own24: 'mingjiao', svg: [2, 30], mode: 'da', qiScale: 0.08, isPublic: false, cats: { qimen: 0.7, quanzhang: 0.3 }},
  { id: 'datengnuo', name: '大騰挪', school: 'step', grade: 2, tags: ['快'], effect: 'speed', attr: 'yin', req: [{ art: 'qingfuStep', tier: 1 }], elder: MING_ELDER, tech: null, techs: ['騰挪', '換影'], v24: true, classic: true, own24: 'mingjiao', svg: [0, 31], mode: 'da', qiScale: 0.08, isPublic: false, cats: { shenfa: 1 }},
);
MOVES.push(
  { id: 'n6wl1', skill: 'palm', name: '劍掌起手', req: 0, range: 52, cd: 1.2, dmg: 12, aoe: 0, color: '#9a8ac8' }, { id: 'n6wl2', skill: 'palm', name: '五環', req: 0, range: 56, cd: 1.6, dmg: 14, aoe: 30, color: '#8a7ab8' }, { id: 'n6wl3', skill: 'palm', name: '連環盡', req: 0, range: 60, cd: 1.4, dmg: 20, aoe: 40, color: '#7a6aa8' },
  { id: 'n6yw1', skill: 'palm', name: '養吾式', req: 0, range: 58, cd: 1.3, dmg: 11, aoe: 0, color: '#a8c0d8' }, { id: 'n6yw2', skill: 'palm', name: '劍意', req: 0, range: 60, cd: 1.7, dmg: 13, aoe: 0, color: '#98b0c8' }, { id: 'n6yw3', skill: 'palm', name: '劍歸', req: 0, range: 64, cd: 1.35, dmg: 18, aoe: 30, color: '#88a0b8' },
  { id: 'n6ty1', skill: 'palm', name: '一峰', req: 0, range: 56, cd: 1.4, dmg: 12, aoe: 0, color: '#8aa0c0' }, { id: 'n6ty2', skill: 'palm', name: '二峰', req: 0, range: 60, cd: 1.8, dmg: 15, aoe: 30, color: '#7a90b0' }, { id: 'n6ty3', skill: 'palm', name: '三青峰', req: 0, range: 66, cd: 1.4, dmg: 19, aoe: 40, color: '#6a80a0' },
  { id: 'n6tc1', skill: 'palm', name: '雲手', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#c8d0d8' }, { id: 'n6tc2', skill: 'palm', name: '拈爪', req: 0, range: 42, cd: 1.5, dmg: 12, aoe: 0, color: '#b8c0c8' }, { id: 'n6tc3', skill: 'palm', name: '爪落', req: 0, range: 46, cd: 1.2, dmg: 16, aoe: 0, color: '#a8b0b8' },
  { id: 'n6xd1', skill: 'palm', name: '玄虛', req: 0, range: 50, cd: 1.4, dmg: 11, aoe: 0, color: '#b0b8c8' }, { id: 'n6xd2', skill: 'palm', name: '刀圈', req: 0, range: 54, cd: 1.8, dmg: 14, aoe: 30, color: '#a0a8b8' }, { id: 'n6xd3', skill: 'palm', name: '一刀', req: 0, range: 58, cd: 1.45, dmg: 18, aoe: 30, color: '#9098a8' },
  { id: 'n6yh1', skill: 'palm', name: '雁行', req: 0, range: 50, cd: 1.3, dmg: 11, aoe: 0, color: '#c8a8d0' }, { id: 'n6yh2', skill: 'palm', name: '斜飛', req: 0, range: 54, cd: 1.9, dmg: 14, aoe: 30, color: '#b898c0' },
  { id: 'n6js1', skill: 'palm', name: '截手', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#b8a0c8' }, { id: 'n6js2', skill: 'palm', name: '封脈', req: 0, range: 42, cd: 1.5, dmg: 12, aoe: 0, color: '#a890b8' }, { id: 'n6js3', skill: 'palm', name: '九式', req: 0, range: 44, cd: 1.25, dmg: 16, aoe: 0, color: '#9880a8' },
  { id: 'n6tz1', skill: 'palm', name: '彈指', req: 0, range: 46, cd: 1.0, dmg: 9, aoe: 0, color: '#e0a0b0' }, { id: 'n6tz2', skill: 'palm', name: '一指', req: 0, range: 48, cd: 1.4, dmg: 12, aoe: 0, color: '#d090a0' }, { id: 'n6tz3', skill: 'palm', name: '指風', req: 0, range: 50, cd: 1.2, dmg: 16, aoe: 0, color: '#c08090' },
  { id: 'n6mn1', skill: 'palm', name: '睇盼', req: 0, range: 36, cd: 1.2, dmg: 10, aoe: 0, color: '#e0b0c0' }, { id: 'n6mn2', skill: 'palm', name: '折花', req: 0, range: 40, cd: 1.8, dmg: 13, aoe: 0, color: '#d0a0b0' },
  { id: 'n6yj1', skill: 'palm', name: '玉女劍', req: 0, range: 54, cd: 1.2, dmg: 11, aoe: 0, color: '#d0d8f0' }, { id: 'n6yj2', skill: 'palm', name: '穿花', req: 0, range: 58, cd: 1.6, dmg: 13, aoe: 0, color: '#c0c8e0' }, { id: 'n6yj3', skill: 'palm', name: '回身劍', req: 0, range: 62, cd: 1.4, dmg: 18, aoe: 30, color: '#b0b8d0' },
  { id: 'n6ch1', skill: 'palm', name: '長恨', req: 0, range: 48, cd: 1.4, dmg: 11, aoe: 0, color: '#a0a8c0' }, { id: 'n6ch2', skill: 'palm', name: '抽鞭', req: 0, range: 54, cd: 1.9, dmg: 14, aoe: 30, color: '#9098b0' },
  { id: 'n6qm1', skill: 'palm', name: '銀針', req: 0, range: 36, cd: 1.0, dmg: 8, aoe: 0, color: '#c0c8d0' }, { id: 'n6qm2', skill: 'palm', name: '千滅', req: 0, range: 40, cd: 1.5, dmg: 11, aoe: 0, color: '#b0b8c0' },
  { id: 'n6qf1', skill: 'palm', name: '驅蜂', req: 0, range: 40, cd: 1.2, dmg: 9, aoe: 30, color: '#c0a060' }, { id: 'n6qf2', skill: 'palm', name: '蜂擁', req: 0, range: 48, cd: 1.6, dmg: 12, aoe: 40, color: '#b09050' },
  { id: 'n6ts1', skill: 'leg', name: '杖掃', req: 0, range: 56, cd: 1.5, dmg: 11, aoe: 40, color: '#6a8a4a' }, { id: 'n6ts2', skill: 'leg', name: '點杖', req: 0, range: 64, cd: 2.0, dmg: 14, aoe: 0, color: '#5a7a3a' },
  { id: 'n6zx1', skill: 'palm', name: '摘星', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#7a9a5a' }, { id: 'n6zx2', skill: 'palm', name: '拿雲', req: 0, range: 44, cd: 1.6, dmg: 13, aoe: 0, color: '#6a8a4a' },
  { id: 'n6mt1', skill: 'palm', name: '冥天', req: 0, range: 42, cd: 1.3, dmg: 12, aoe: 0, color: '#5a6a3a' }, { id: 'n6mt2', skill: 'palm', name: '九式起', req: 0, range: 46, cd: 1.7, dmg: 14, aoe: 0, color: '#4a5a2a' }, { id: 'n6mt3', skill: 'palm', name: '冥盡', req: 0, range: 48, cd: 1.5, dmg: 20, aoe: 30, color: '#3a4a1a' },
  { id: 'n6ld1', skill: 'palm', name: '六合', req: 0, range: 50, cd: 1.4, dmg: 12, aoe: 0, color: '#a08050' }, { id: 'n6ld2', skill: 'palm', name: '合刀', req: 0, range: 56, cd: 1.9, dmg: 15, aoe: 30, color: '#907040' },
  { id: 'n6sx1', skill: 'palm', name: '蛇行', req: 0, range: 38, cd: 1.2, dmg: 10, aoe: 0, color: '#8a9a60' }, { id: 'n6sx2', skill: 'palm', name: '刁拿', req: 0, range: 42, cd: 1.7, dmg: 13, aoe: 0, color: '#7a8a50' },
  { id: 'n6sl1', skill: 'palm', name: '令擊', req: 0, range: 48, cd: 1.3, dmg: 12, aoe: 0, color: '#d07040' }, { id: 'n6sl2', skill: 'palm', name: '令火', req: 0, range: 52, cd: 1.7, dmg: 15, aoe: 30, color: '#c06030' }, { id: 'n6sl3', skill: 'palm', name: '令環', req: 0, range: 56, cd: 1.45, dmg: 20, aoe: 40, color: '#b05020' },
  { id: 'n6ly1', skill: 'palm', name: '烈焰', req: 0, range: 48, cd: 1.3, dmg: 12, aoe: 30, color: '#e06030' }, { id: 'n6ly2', skill: 'palm', name: '刀焰', req: 0, range: 54, cd: 1.8, dmg: 16, aoe: 40, color: '#d05020' },
  { id: 'n6hm1', skill: 'palm', name: '寒綿', req: 0, range: 40, cd: 1.4, dmg: 11, aoe: 0, color: '#a0c0d0' }, { id: 'n6hm2', skill: 'palm', name: '冰意', req: 0, range: 46, cd: 1.9, dmg: 14, aoe: 0, color: '#90b0c0' },
  { id: 'n6fh1', skill: 'palm', name: '飛花', req: 0, range: 42, cd: 1.0, dmg: 8, aoe: 0, color: '#d0a080' }, { id: 'n6fh2', skill: 'palm', name: '摘葉', req: 0, range: 48, cd: 1.4, dmg: 11, aoe: 30, color: '#c09070' },
);
/* loop160 Batch 1.2：藏經閣「圖譜」——v2.4 讀書時可能撿到的輔助抄本（secret：不進一般學習池；只在 study 完成時取得） */
ARTS.push(
  { id: 'zhenTu', name: '陣圖殘篇', school: 'palm', grade: 1, tags: ['巧'], req: [], techs: [], tech: null, secret: true, v24: true, hint: '藏經閣讀書時偶得', svg: [0, 7], mode: 'base', qiScale: 0.15, isPublic: false, cats: { zhenfa: 1 }},
  { id: 'yiJing', name: '醫經抄本', school: 'palm', grade: 1, tags: ['柔'], req: [], techs: [], tech: null, secret: true, v24: true, hint: '藏經閣讀書時偶得', svg: [0, 7], mode: 'base', qiScale: 0.15, isPublic: false, cats: { yishu: 1 }},
  { id: 'duPu', name: '百毒譜', school: 'palm', grade: 1, tags: ['巧'], req: [], techs: [], tech: null, secret: true, v24: true, hint: '藏經閣讀書時偶得', svg: [0, 7], mode: 'base', qiScale: 0.15, isPublic: false, cats: { dushu: 1 }}, /* loop196：輔助毒術圖譜，無招式、無 own24，不進主修 */
);
MOVES.push(
  { id: 'bs1', skill: 'palm', name: '刺劍式', req: 0, range: 44, cd: 1.0, dmg: 6, aoe: 0, color: '#9fb4c8' }, { id: 'bs2', skill: 'palm', name: '撩劍式', req: 0, range: 48, cd: 1.4, dmg: 9, aoe: 0, color: '#8fa4b8' },
  { id: 'hs1', skill: 'palm', name: '白虹貫日', req: 0, range: 60, cd: 1.5, dmg: 12, aoe: 0, color: '#c8d8e8' }, { id: 'hs2', skill: 'palm', name: '蒼松迎客', req: 0, range: 56, cd: 2.0, dmg: 14, aoe: 40, color: '#6a8a6a' },
  { id: 'sx1', skill: 'palm', name: '三仙連環', req: 0, range: 58, cd: 1.0, dmg: 13, aoe: 0, color: '#b0a0d0' }, { id: 'sx2', skill: 'palm', name: '奪命三連', req: 0, range: 64, cd: 1.8, dmg: 20, aoe: 50, color: '#9080c0' },
  { id: 'wh1', skill: 'palm', name: '猛虎下山', req: 0, range: 50, cd: 1.6, dmg: 12, aoe: 30, color: '#c07030' }, { id: 'wh2', skill: 'palm', name: '斷門一刀', req: 0, range: 56, cd: 2.2, dmg: 17, aoe: 50, color: '#a05020' },
  { id: 'sl1', skill: 'leg', name: '橫掃千軍', req: 0, range: 60, cd: 1.8, dmg: 11, aoe: 60, color: '#b09040' }, { id: 'sl2', skill: 'leg', name: '韋陀獻杵', req: 0, range: 66, cd: 2.4, dmg: 15, aoe: 70, color: '#907020' },
  { id: 'tn1', skill: 'palm', name: '錯骨', req: 0, range: 36, cd: 1.1, dmg: 9, aoe: 0, color: '#8a6aa0' }, { id: 'tn2', skill: 'palm', name: '分筋', req: 0, range: 38, cd: 1.6, dmg: 12, aoe: 0, color: '#7a5a90' },
);
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
  dog: { name: '野狗', kind: '獸', weapon: '利齒', hp: 14, dmg: 3, cd: 1.2, flee: 0.5, loot: {}, home: { sprite: 'dog', speed: 65 } },
  rat:    { name: '山鼠',     kind: '獸', weapon: '利齒', hp: 10,  dmg: 2,  cd: 1.0, flee: 0.5,  loot: {} },
  hare:   { name: '野兔',     kind: '獸', weapon: '牙爪', hp: 8,   dmg: 1,  cd: 1.2, flee: 0.6,  loot: { food: 1 } },
  boar:   { name: '野豬',     kind: '獸', weapon: '獠牙', hp: 40,  dmg: 6,  cd: 1.3, flee: 0.1,  loot: { food: 3, hide: 1 } },
  boars:  { name: '野豬群',   kind: '獸', weapon: '獠牙', hp: 110,  dmg: 11,  cd: 1.1, flee: 0.15, loot: { food: 5, hide: 2 } },
  wolf:   { name: '狼',       kind: '獸', weapon: '牙爪', hp: 60,  dmg: 10,  cd: 0.9, flee: 0.2,  loot: { hide: 1 } },
  snake:  { name: '毒蛇',     kind: '獸', weapon: '毒牙', hp: 25,  dmg: 12, cd: 1.5, flee: 0.35, loot: { herb: 2 } },
  bandit: { name: '山賊嘍囉', kind: '人', weapon: '刀',   hp: 120,  dmg: 14,  cd: 1.2, flee: 0.3,  loot: { coin: 3, page1: 0.15 } },
  archer: { name: '獵戶暗箭', kind: '人', weapon: '暗器', hp: 75,  dmg: 17, cd: 1.5, flee: 0.45, loot: { coin: 2, page1: 0.1 } },
  bear:   { name: '黑熊',     kind: '獸', weapon: '熊掌', hp: 420, dmg: 28, cd: 1.6, flee: 0.05, loot: { food: 6, gall: 1 } },
  chief:  { name: '山賊頭目', kind: '人', weapon: '刀／鞭', hp: 360, dmg: 24, cd: 1.1, flee: 0.2, practiceTier: 3, loot: { coin: 12, page2: 0.35 } },
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
// N51：登門高手的承傷／每招損傷沿用本作同級遠段敵人的尺度，差別由招式秒數和理由資料決定。
ENEMIES.dfbb = { ...ENEMIES.peakguard, name: '東方不敗', weapon: '繡花針', loot: {} };
ENEMIES.hy = { ...ENEMIES.whiteape, name: '火雲邪神', kind: '人', weapon: '掌', loot: {} };
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
ARTS.push({ id: 'rulai', name: '如來神掌', school: 'palm', grade: 3, tags: ['剛'], req: [], techs: ['rulai'], tech: 'rulai', secret: true, hint: '阿星開局：重傷瀕死時覺醒，封印的根骨解開而自悟', mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 1 }});
MOVES.push({ id: 'rulai', skill: 'palm', name: '如來神掌', req: 999, range: 120, cd: 4.0, dmg: 24, aoe: 120, color: '#f2c14e' });
export const AWAKEN = { gen: 5, li: 2, ding: 1, shen: 1 }; // 阿星覺醒：封印根骨解開（1→5 為 +4，其餘 +4，共 +8）

// ---- v1.1 名俠奇遇：招牌武學（各三招；只能由本人或親傳取得） ----
ARTS.push({ id: 'xianglong', name: '降龍十八掌', school: 'palm', grade: 3, tags: ['剛', '拙'], req: [], techs: ['jianlong', 'feilong', 'kanglong'], tech: 'jianlong', secret: true, hint: '洪七公上山後，每煮一頓合他胃口的飯傳一段（共三段），挑資質憨直的人當傳人', classic: true, signature: 'hongqigong', mode: 'da', qiScale: 0.45, isPublic: false, cats: { quanzhang: 1 }});
ARTS.push({ id: 'dagou', name: '打狗棒法', school: 'palm', grade: 3, tags: ['巧'], req: [], techs: ['banzi', 'chuozi', 'wugou'], tech: 'banzi', secret: true, hint: '洪七公傳到降龍第二段起，把打狗棒法傳給黃蓉（黃蓉在場才傳）', classic: true, signature: 'hongqigong', mode: 'da', qiScale: 0.08, isPublic: false, cats: { gunbang: 1 }});
MOVES.push({ id: 'jianlong', skill: 'palm', name: '見龍在田', req: 0, range: 50, cd: 1.0, dmg: 14, aoe: 0, color: '#e8b33a', fx: 'dragon' });
MOVES.push({ id: 'feilong', skill: 'palm', name: '飛龍在天', req: 0, range: 70, cd: 1.4, dmg: 20, aoe: 80, color: '#f0c040', fx: 'dragon' });
MOVES.push({ id: 'kanglong', skill: 'palm', name: '亢龍有悔', req: 0, range: 90, cd: 1.6, dmg: 30, aoe: 100, color: '#ffd24a', fx: 'dragon' });
MOVES.push({ id: 'banzi', skill: 'leg', name: '絆字訣', req: 0, range: 40, cd: 0.7, dmg: 9, aoe: 0, color: '#3fae5a', fx: 'staff' });
MOVES.push({ id: 'chuozi', skill: 'leg', name: '戳字訣', req: 0, range: 50, cd: 0.9, dmg: 14, aoe: 0, color: '#2f9e6a', fx: 'staff' });
MOVES.push({ id: 'wugou', skill: 'leg', name: '天下無狗', req: 0, range: 80, cd: 1.6, dmg: 26, aoe: 90, color: '#5fd38a', fx: 'staff' });

// ---- loop150 v2.3 專長招牌（程瑛／阿紫／程靈素；secret：只由本人入門時帶來，不進傳功、領悟、高人傳授） ----
ARTS.push({ id: 'qimenZhen', name: '奇門五轉', school: 'palm', grade: 3, tags: ['巧'], req: [], techs: ['qm1', 'qm2'], tech: 'qm1', secret: true, hint: '程瑛入門時帶來（桃花島奇門陣法）', classic: true, signature: 'chengying', mode: 'da', qiScale: 0.08, isPublic: false, cats: { zhenfa: 0.8, qimen: 0.2 }});
ARTS.push({ id: 'xingxiuDu', name: '星宿毒經', school: 'palm', grade: 3, tags: ['巧'], req: [], techs: ['xx1', 'xx2'], tech: 'xx1', secret: true, hint: '阿紫入門時帶來（星宿派毒術）', classic: true, signature: 'azi', mode: 'da', qiScale: 0.08, isPublic: false, cats: { dushu: 1 }});
ARTS.push({ id: 'yaowang', name: '藥王神篇', school: 'palm', grade: 3, tags: ['柔'], req: [], techs: [], tech: null, secret: true, hint: '程靈素入門時帶來（藥王谷醫術）', classic: true, signature: 'chenglingsu', effect: 'med', mode: 'lian', qiScale: 0.40, isPublic: false, cats: { yishu: 1 }});
MOVES.push({ id: 'qm1', skill: 'palm', name: '落英陣步', req: 0, range: 50, cd: 1.0, dmg: 10, aoe: 0, color: '#d98fb0' });
MOVES.push({ id: 'qm2', skill: 'palm', name: '五轉迷陣', req: 0, range: 70, cd: 1.6, dmg: 14, aoe: 70, color: '#e0a0c0' });
MOVES.push({ id: 'xx1', skill: 'palm', name: '抽髓掌', req: 0, range: 40, cd: 0.9, dmg: 10, aoe: 0, color: '#5a9a3a' });
MOVES.push({ id: 'xx2', skill: 'palm', name: '腐屍毒', req: 0, range: 60, cd: 1.5, dmg: 12, aoe: 50, color: '#6aaa2a' });
// ---- v1.2 華山線：紫霞神功（九層）、辟邪劍法（捷徑）、獨孤九劍（九式，口傳不入秘笈） ----
ARTS.push({ id: 'zixia', chiefOnly24: true, name: '紫霞神功', school: 'palm', grade: 3, tags: ['柔'], req: [], techs: [], secret: true, hint: '岳不群開局：開局即得第一層，之後在華山劇情中逐層修煉', classic: true, layered: true, mode: 'lian', qiScale: 0.40, isPublic: false, cats: { neigong: 1 }});
ARTS.push({ id: 'bixie', name: '辟邪劍法', school: 'palm', grade: 4, tags: ['快'], req: [], techs: ['bx1', 'bx2', 'bx3'], tech: 'bx1', secret: true, hint: '岳不群開局：華山劇情中選擇練辟邪劍譜（自宮＋斷情）', classic: true, mode: 'da', qiScale: 0.08, isPublic: false, cats: { jianfa: 1 }});
ARTS.push({ id: 'dugu', name: '獨孤九劍', school: 'palm', grade: 4, tags: ['巧'], type: 'sword', req: [], techs: [], secret: true, hint: '華山劇情「思過崖的老人」：請教風清揚三晚，第四晚過招後得總訣；其餘各式要對該敵人有足夠觀破。破劍一類約在熟其招式，破掌再深，破氣要到看破，狂風卷地還要過了看破', classic: true, forms: true, mode: 'da', qiScale: 0.20, isPublic: false, cats: { jianfa: 1 }});
// N40：藏經閣內的實物拳譜，22 段招序由 luohan18 套路資料提供；不得從日課憑空自悟。
ARTS.push({ id: 'luohanHands', name: '少林羅漢十八手', school: 'palm', grade: 1, tags: ['拙'], req: [], techs: ['lhChop', 'lhPush', 'lhTiger'], tech: 'lhChop', secret: true, bookOnly: true, chainFromPose: true, routine: 'luohan18', lifeStages: ['十八手', '小羅漢拳', '大羅漢拳', '十八羅漢拳', '一百零八打', '三百六十打'], lifeMove: { stage: 3, move: 'lhReturn' }, mode: 'base', qiScale: 0.15, isPublic: false, cats: { quanzhang: 1 }, hint: '藏經閣有羅漢十八手拳譜；逐段研讀，不會憑空自悟' });
for (const [source, id, name, poses] of [
  ['push', 'lhChop', '斬手劈心掌', ['ready', 'rightStep', 'block', 'rightChop']],
  ['push2', 'lhPush', '托塔雙推山', ['rightChop', 'doubleUp', 'rightStep', 'doublePalm']],
  ['fist3', 'lhTiger', '羅漢打虎', ['doublePalm', 'crouch', 'tiger', 'downFist']],
  ['push2', 'lhReturn', '回身頂心肘', ['leftStep', 'block', 'rightStep', 'rightElbow']],
]) MOVES.push({ ...MOVES.find((m) => m.id === source), id, name, poses, fx: 'luohanHands' });
MOVES.push({ id: 'bx1', skill: 'palm', name: '流星飛墮', req: 0, range: 60, cd: 0.45, dmg: 9, aoe: 0, color: '#c03060', fx: 'bixie' });
MOVES.push({ id: 'bx2', skill: 'palm', name: '群邪辟易', req: 0, range: 60, cd: 0.6, dmg: 13, aoe: 60, color: '#d04070', fx: 'bixie' });
MOVES.push({ id: 'bx3', skill: 'palm', name: '鍾馗抉目', req: 0, range: 70, cd: 0.7, dmg: 18, aoe: 0, color: '#e05080', fx: 'bixie' });
/* #410 觀破對齊五檔的形狀。數字是本遊戲的觀破值：30 熟其招式、60 看破。
   破劍等式約大成，破掌在大成與圓滿之間，總訣仍是第四晚的根本，破氣約圓滿，狂風卷地約化境。
   不把別處的等級抄進來。specials 不繞過 formReady。 */
export const DUGU = [
  { id: 'dg0', name: '總訣式', foes: [], need: 0, dmg: 16 },
  { id: 'dg1', name: '破劍式', foes: ['hermit', 'swordtomb'], need: 30, dmg: 24 },
  { id: 'dg2', name: '破刀式', foes: ['bandit', 'chief'], need: 30, dmg: 22 },
  { id: 'dg3', name: '破槍式', foes: ['post'], need: 30, dmg: 22 },
  { id: 'dg4', name: '破鞭式', foes: ['chief'], need: 30, dmg: 22 },
  { id: 'dg5', name: '破索式', foes: ['python', 'pythonking'], need: 30, dmg: 26 },
  { id: 'dg6', name: '破掌式', foes: ['ape', 'whiteape', 'bear'], need: 45, dmg: 28 },
  { id: 'dg7', name: '破箭式', foes: ['archer'], need: 30, dmg: 24 },
  { id: 'dg8', name: '破氣式', foes: ['peakguard'], need: 60, dmg: 36, inner: true },
  { id: 'dg9', name: '狂風卷地', foes: ['peakguard'], need: 100, dmg: 40, cd: 1.1, wide: true },
];
for (const f of DUGU) MOVES.push({ id: f.id, skill: 'palm', name: f.name, req: 0, range: 80, cd: f.cd || 1.0, dmg: f.dmg, aoe: f.id === 'dg0' || f.inner || f.wide ? 70 : 0, color: '#9fb8d8', fx: 'dugu' });
export const HS = { zxNeed: 240, carvPer: 1, carvInsight: 6, cleanDays: 7, zxMoodMin: 60, zxDingMin: 4, zxPow: 0.03, zxGuard: 0.03, bixieDayPow: 0.04, bixieCap: 0.6, songEvery: 4, fengNights: 3, softP: 0.05, duguHeal: 1, secondWind: 0.5, windHp: 0.5 };

// ---- v1.3 江湖群像（ROADMAP §13.8–13.11）：神鵰、倚天、鹿鼎、功夫 ----
const A13 = (id, name, school, grade, tags, moves, extra = {}) => { ARTS.push({ id, name, school, grade, tags, req: [], techs: moves.map((m) => m[0]), tech: moves[0]?.[0], secret: true, classic: true, ...extra });
  for (const [mid, mn, cd, dmg, aoe, color] of moves) MOVES.push({ id: mid, skill: school === 'leg' ? 'leg' : 'palm', name: mn, req: 0, range: 60 + aoe / 2, cd, dmg, aoe, color, fx: id }); };
A13('anran', '黯然銷魂掌', 'palm', 4, ['柔', '情'], [['ar1', '心驚肉跳', 1.2, 18, 0, '#7a8ca8'], ['ar2', '杞人憂天', 1.4, 22, 60, '#6a7c98'], ['ar3', '拖泥帶水', 1.8, 32, 90, '#5a6c88']], { signature: 'yangguo', mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 1 }});
A13('xuantie', '玄鐵劍法', 'palm', 3, ['剛', '拙'], [['xt1', '重劍無鋒', 1.6, 30, 70, '#3a3a3a']], { signature: 'yangguo', mode: 'lian', qiScale: 0.50, isPublic: false, cats: { jianfa: 1 }});
A13('yunv', '玉女心經', 'palm', 3, ['巧', '靈'], [['yn1', '小園藝菊', 0.8, 12, 0, '#e8e8f8'], ['yn2', '西窗夜話', 1.0, 16, 50, '#d8dcf8']], { signature: 'xiaolongnv', mode: 'da', qiScale: 0.08, isPublic: false, cats: { neigong: 1 }});
A13('zuoyou', '左右互搏', 'palm', 3, ['巧'], [], { signature: 'zhoubotong', effect: 'twin', mode: 'da', qiScale: 0.08, isPublic: false, cats: { zaxue: 1 }});
A13('kongming', '空明拳', 'palm', 3, ['柔'], [['km1', '空碗盛飯', 0.9, 13, 0, '#c8d8c8'], ['km2', '妙手空空', 1.2, 19, 50, '#b8c8b8']], { signature: 'zhoubotong', mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 1 }});
A13('kuihua', '葵花寶典', 'leg', 4, ['快'], [['kh1', '繡花針', 0.35, 8, 0, '#d04050']], { signature: 'dongfangbubai', mode: 'da', qiScale: 0.08, isPublic: false, cats: { qimen: 1 }});
A13('huagu', '化骨綿掌', 'palm', 4, ['柔', '陰'], [['hg1', '化骨綿掌', 1.6, 34, 0, '#9a8aa8']], { signature: 'haidafu', mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 1 }});
A13('jiuyang', '九陽神功', 'palm', 3, ['剛', '內'], [], { signature: 'zhangwuji', mode: 'da', qiScale: 0.08, isPublic: false, cats: { neigong: 1 }});
A13('qiankun', '乾坤大挪移', 'palm', 4, ['巧'], [['qk1', '借力打力', 1.2, 20, 40, '#e0a040']], { signature: 'zhangwuji', mode: 'da', qiScale: 0.08, isPublic: false, cats: { neigong: 1 }});
A13('taiji', '太極拳', 'palm', 3, ['柔'], [['tj1', '攬雀尾', 1.0, 12, 0, '#d8d8d8'], ['tj2', '雲手', 1.2, 16, 60, '#c8c8c8']], { signature: 'zhangwuji', mode: 'lian', qiScale: 0.40, isPublic: false, cats: { quanzhang: 1 }});
A13('shihou', '獅子吼', 'palm', 3, ['剛'], [['sh1', '獅子吼', 2.0, 18, 140, '#f0d070']], { signature: 'baozupo', mode: 'da', qiScale: 0.08, isPublic: false, cats: { neigong: 1 }});
A13('tantui', '十二路譚腿', 'leg', 2, ['剛'], [['tt1', '十二路譚腿', 0.8, 14, 0, '#a07040']], { hint: '深藏不露的雜工身懷此功：斧頭幫上山勒索時讓他出手才會現身', mode: 'da', qiScale: 0.08, isPublic: false, cats: { tuifa: 1 }});
A13('tiexian', '洪家鐵線拳', 'palm', 2, ['剛'], [['tx1', '鐵線拳', 1.0, 16, 0, '#808890']], { hint: '深藏不露的雜工身懷此功：斧頭幫上山勒索時讓他出手才會現身', mode: 'da', qiScale: 0.08, isPublic: false, cats: { quanzhang: 1 }});
A13('bagua', '五郎八卦棍', 'leg', 2, ['剛'], [['bg1', '五郎八卦棍', 1.0, 15, 50, '#8a6a3a']], { hint: '深藏不露的雜工身懷此功：斧頭幫上山勒索時讓他出手才會現身', mode: 'da', qiScale: 0.08, isPublic: false, cats: { gunbang: 1 }});
A13('hama', '蛤蟆功', 'palm', 4, ['剛', '蓄'], [['hm1', '蛤蟆功', 2.2, 40, 60, '#6a8a3a']], { signature: 'huoyunxieshen', mode: 'da', qiScale: 0.08, isPublic: false, cats: { neigong: 1 }});
// 每門武學都有動作型別；兵器列繼承既有 weapon，指法與獨孤在資料列明寫。
for (const art of ARTS) {
  art.type ??= ({sword:'sword',blade:'blade',staff:'staff',finger:'finger'})[art.weapon]||'fist';
  art.routine ??= ({ sword: 'sword', 劍: 'sword', blade: 'blade', 刀: 'blade', staff: 'staff', whip: 'staff' })[art.weapon]
    || (art.cats?.jianfa ? 'sword' : art.cats?.gunbang ? 'staff' : null)
    || (art.school === 'leg' ? 'leg' : art.school === 'palm' ? 'palm' : 'fist');
}
for (const mv of MOVES) {
  const art = ARTS.find((a) => a.techs?.includes(mv.id));
  const kind = art?.routine || (mv.skill === 'leg' ? 'leg' : 'fist');
  mv.type ??= kind==='leg'?'leg':art?.type||kind;
  const choices = COMBAT_MOVE_SETS[kind] || COMBAT_MOVE_SETS.fist;
  mv.poses ??= choices[Math.max(0, art?.techs?.indexOf(mv.id) ?? 0) % choices.length];
}
export const JH = {
  comedyWeek: 2, comedyDays: 7,
  anranMood: 30, anranMax: 1.5, twin: 1.3, kongming: 1.15, pair: 0.25,
  gambleBase: 2, gambleCap: 6, recruitBonus: 0.4, baoyi: 0.5, reflect: 0.3, jiuyangSta: 30,
  hiddenMax: 3, hiddenP: 0.35, residueXp: 20, diaoFeeds: 3, honeyHeal: 15,
};
Object.assign(TRAITS, { quiet: { name: '清冷', desc: '心情起伏減半，不喜熱鬧', composure: 'steady', mods: { train: 1.05, leisure: 0.9 } }, chi: { name: '癡', desc: '心情隨意中人起伏', mods: {}, mods24: { train: 1.25, study: 1.2, chat: 0.8 } } }); /* loop187 v2.9 mods24：只 d.v24 新局生效（舊局 mods 不動） */
TRAITS.quiet.mods24 = { meditate: 1.35, study: 1.2, chat: 0.75 };

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
// 出自 Phase 6 規格：低崖連藥圃與林場，中崖連井與低崖，高崖只連中崖；R6 改由路線難度與體能驗攀登。
NODES.cliff3Detour = [1050, 310]; // R6 #523：繞開光壁的可見路肩，位置按 cliff2／cliff3 的地圖空地配置。
EDGES.push(['herb', 'cliff1'], ['forest2', 'cliff1'], ['well', 'cliff2'], ['cliff1', 'cliff2'], ['cliff2', 'cliff3Detour'], ['cliff3Detour', 'cliff3']);
export const CLIFFS = Object.freeze({
  cliff1: { name: '斷木試劍崖', height: '三丈', heightZhang: 3, routeGrade: 1, hardest: '易攀岩面', acts: ['cliffForage1', 'cliffTrain'] },
  cliff2: { name: '飛瀑寒潭崖', height: '七丈', heightZhang: 7, routeGrade: 2, hardest: '中段疏點', acts: ['cliffWater', 'waterfallTrain'] },
  cliff3: { name: '終南絕頂・古墓石室崖', height: '十五丈', heightZhang: 15, routeGrade: 3, hardest: '頂端光壁', detour: 'cliff3Detour', acts: ['cliffComprehend'] },
}); // R6 #523 規格高度 3／7／15 丈與易／中／難三路；最難一段只列性質，直上光壁不可攀，繞路可達。
const B = (id, name, node, built, cost, work, offers, extra = {}, rep = 0) => ({ id, name, node, v16: true, stages: [{ name: '空地', sprite: null, offers: [] }, { name: built, sprite: null, offers, cost, work, rep: rep || undefined, ...extra }] });
FACILITIES.push(
  B('library', '藏經閣', 'library', '藏經閣', { wood: 10, stone: 6, coin: 6 }, 26, ['study'], { slots: { study: 2 } }, 15),
  B('quiet', '靜室', 'quiet', '靜室', { wood: 6, stone: 4 }, 18, ['meditate'], { spots: [{ id: 'mat0', offset: [-18, 0], acts: ['meditate'], kind: 'mat' }, { id: 'mat1', offset: [18, 0], acts: ['meditate'], kind: 'mat' }], medEase: 2 }),
  B('shrine', '祠堂', 'shrine', '祠堂', { wood: 8, stone: 6, coin: 4 }, 22, ['worship'], { slots: { worship: 2 } }, 10),
  B('alchemy', '丹房', 'alchemy', '丹房', { wood: 6, stone: 8, coin: 6 }, 24, ['brew'], { slots: { brew: 1 } }, 12),
  B('clinic', '醫館', 'clinic', '醫館', { wood: 8, stone: 4, coin: 4 }, 20, ['heal'], { slots: { heal: 2 }, upgrade: { healBonus: [12, 25], woundSteps: [2, 3] } }),
  B('guest', '客房', 'guest', '客房', { wood: 10, stone: 4, coin: 6 }, 22, ['host'], { slots: { host: 1 } }, 18),
  B('well', '井', 'well', '水井', { stone: 6 }, 14, ['water'], { slots: { water: 2 } }),
  B('bell', '鐘樓', 'bell', '鐘樓', { wood: 8, stone: 6 }, 20, ['bell'], { slots: { bell: 1 } }, 8),
  B('watch', '哨崗', 'guard', '護山哨', { wood: 8, stone: 4 }, 18, ['watch'], { slots: { watch: 1 } }),
  // 鎮派建築的地：不能從藍圖蓋，跟著「鎮派」落成一起開（sect.buildFac 把 stage 設成 1）；活動內容依門派查 SIG_ACTS
  { id: 'sig', name: '鎮派地', node: 'sig', v16: true, sig: true, stages: [{ name: '空地', sprite: null, offers: [] }, { name: '鎮派建築', sprite: null, offers: ['sig'], slots: { sig: 2 }, noBlueprint: true }] },
);
// N47: A built smart object keeps its original repair stage, then gains Lv1/Lv2.
// Material and time follow the already calibrated first build at 2x/3x;
// each upgrade adds one work place. No new activity-specific condition is needed.
for (const f of FACILITIES.filter((o) => o.v16 && !o.sig)) {
  const repair = f.stages[1];
  for (let level = 2; level <= 3; level++) f.stages.push({ ...repair,
    name: `${f.name} Lv${level - 1}`,
    slots: Object.fromEntries(Object.entries(repair.slots || {}).map(([act, cap]) => [act, cap + level - 1])),
    spots: repair.spots ? [...repair.spots, ...Array.from({ length: level - 1 }, (_, i) => ({ ...repair.spots[i % repair.spots.length], id: `extension${i}`, offset: [(i + 1) * 18, 18] }))] : undefined,
    cost: Object.fromEntries(Object.entries(repair.cost).map(([material, amount]) => [material, amount * level])),
    work: repair.work * level,
    ...Object.fromEntries(Object.entries(repair.upgrade || {}).map(([field, values]) => [field, values[level - 2]])),
    proposal: `把${f.name}再擴一處，多一個人能同時在這裡做事`,
  });
}
// The kitchen had three stages; its last stage uses the preceding stage's
// material/time scale and keeps the same cooking activity with one more place.
{ const kitchen = FACILITIES.find((f) => f.id === 'kitchen'), prev = kitchen.stages[2];
  kitchen.stages.push({ ...prev, name: '膳房 Lv2', slots: { cook: 2, eat: 3 }, cost: Object.fromEntries(Object.entries(prev.cost).map(([k, v]) => [k, v + (kitchen.stages[1].cost[k] || 0)])), work: prev.work + kitchen.stages[1].work, proposal: '多設一口灶，出獵的人回來不用等飯' }); }
// The natural work sites are facilities too: repair them in the same four-stage
// sequence. Six wood / fifteen seconds is the existing yard-repair work pack.
const NATURAL_SITES = { veg: { capacity: 'plots', start: 4, gain: 2 }, forest: { capacity: 'chop', start: 1, gain: 1 }, quarry: { capacity: 'quarry', start: 1, gain: 1 }, store: { capacity: 'chat', start: 1, gain: 1 } };
for (const [id, rule] of Object.entries(NATURAL_SITES)) {
  const f = FACILITIES.find((row) => row.id === id), base = f.stages[0];
  if (rule.capacity !== 'plots') base.slots = Object.fromEntries(base.offers.map((act) => [act, rule.start]));
  for (let stage = 1; stage <= 3; stage++) f.stages.push({ ...base,
    name: `${f.name}${stage === 1 ? '修復' : ` Lv${stage - 1}`}`,
    cost: { wood: 6 * stage }, work: 15 * stage,
    [rule.capacity]: rule.start + rule.gain * stage,
    ...(rule.capacity === 'plots' ? {} : { slots: Object.fromEntries(base.offers.map((act) => [act, rule.start + rule.gain * stage])) }),
    proposal: `把${f.name}整理好，讓${rule.start + rule.gain * stage}個人能同時在這裡做事`,
  });
}
for (const f of FACILITIES.filter((o) => o.stages.length === 4))
  for (let i = 1; i < f.stages.length; i++) f.stages[i].proposal ??= `把${f.name}修到${f.stages[i].name}，大家才有地方做${f.stages[i].offers.map((a) => ACTIVITIES[a]?.name || a).join('、') || '日常事'}`;
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
// R3（#522）：沿既有 study／forage 的工時與耗力，不新增調勝率的常數。
ACTIVITIES.readBook = { name: '茅廬研讀拳譜', dur: ACTIVITIES.study.dur, energy: ACTIVITIES.study.energy };
ACTIVITIES.searchFragment = { name: '林中山洞尋殘卷', dur: ACTIVITIES.forage.dur, energy: ACTIVITIES.forage.energy };
// R11 #531：自創沿用打坐的工時（閉關把會的幾門融在一起）；讀奇書沿用讀卷的工時。
ACTIVITIES.invent = { name: '閉關自創武學', dur: ACTIVITIES.meditate.dur, energy: ACTIVITIES.meditate.energy, pose: 'sit' };
ACTIVITIES.readRare = { name: '研讀奇書', dur: ACTIVITIES.readBook.dur, energy: ACTIVITIES.readBook.energy };
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
RES_NAMES.water = '水'; RES_NAMES.pill = '療傷丹'; RES_NAMES.medFood = '藥膳'; // 出自 Phase 5 規格：新路線藥膳存糧名稱。
RES_NAMES.beeJelly = '玉蜂漿'; RES_NAMES.coldWater = '寒潭靈泉'; // 出自 Phase 6 規格：山崖專屬採集物。

// v1.65 傳功（夥伴活動，由 bonds.mjs 判斷誰傳誰）
// ---- v1.7 四大武道相剋環（ADOPTION A17）：破綻→蓄力→卸力→歸真→破綻（前者剋後者）----
// 弟子的武道＝最熟那門武學的 tag；敵人的武道直接查表。v1.46 試玩：巡山／來犯威脅偏低、開局弱，故只取 ±10%，不讓相剋左右勝負
export const DAO = { tagOf: { 巧: '破綻', 剛: '蓄力', 柔: '卸力', 拙: '歸真' }, ring: ['破綻', '蓄力', '卸力', '歸真'], up: 1.1, down: 0.9,
  enemy: { rat: '破綻', hare: '破綻', wolf: '破綻', snake: '破綻', archer: '破綻', bat: '破綻', vulture: '破綻', hermit: '破綻',
    boar: '蓄力', boars: '蓄力', bear: '蓄力', bandit: '蓄力', chief: '蓄力', ape: '蓄力', whiteape: '蓄力',
    wolfking: '破綻', post: '蓄力', python: '卸力', pythonking: '卸力', swordtomb: '歸真', peakguard: '歸真' } };
// ---- v1.76 糧食安全閘（BALANCE-REPORT-v175 P0）：存糧＋菜 < 每人 perHead 份 → 種菜升為需求層、其餘非必要活動 ×gateMul ----
export const FOOD_SEC = { perHead: 1.5, farm: 75, gateMul: 0.35, keep: ['eat', 'rest', 'farm', 'cook', 'heal', 'watch', 'trial', 'build', 'deliver', 'foray'] };

// ==== （原 sect-data.mjs）====
// v1.35 門派身分（ROADMAP §18）：主角＝門派。純資料，無 import（arts.mjs 也會用）
// bias：剛柔巧拙偏向（學該標籤武學速度，合計夾在 ±15%）；tree：本派武學；ban：門規明文禁止（學了＝叛派）
// rules：門規（違反只加違心）；fac：鎮派設施；rivals：宿敵（守巡山關卡）；fav：名俠加權；recruit：招人風格
export const SECT_K = { biasCap: 0.15, outside: 0.7, ruleCd: 3, rivalRep: 3, rivalScale: 1.15, keepWeek: 1, defectRep: 3, expelAt: 3, facRep: 5 };
export const RULE_LIB = {
  demon: { text: '不得與魔教往來', who: ['renyingying', 'tianboguang', 'zhaomin', 'dongfangbubai'] },
  hoard: { text: '不囤積、不吃獨食', food: 40 },
  rescue: { text: '同門有難，不得見死不救', hp: 25 },
  heal: { text: '行善去惡、救死扶傷', hp: 25, herb: 2 },
  rent: { text: '準時交租，不欠一文', coin: 5 },
  share: { text: '兄弟有福同享', coin: 200, mood: 30 },
  heart: { text: '不許冷落同門', mood: 20 },
  fanqing: { text: '反清復明（兩頭都賺不算違心——韋小寶的特權）', flavor: true },
  jiu: { text: '劍不離手、酒不離口', flavor: true },
  qi: { text: '以氣御劍，氣宗為正', flavor: true },
};
// 出自 Phase 4 規格：純陽入門三手、全真雙脈；只在終南兩脈出現。
ARTS.push(...[
  { id: 'chunyangFist', name: '純陽拳', school: 'fist', grade: 1, tags: ['剛'], attr: 'yang', req: [], techs: ['cy1', 'cy2', 'cy3'], tech: 'cy1', mode: 'base', qiScale: 0.15, routine: 'chunyang', v24: true, classic: true, own24: 'quanzhen', isPublic: false, cats: { quanzhang: 1 } },
  { id: 'quanzhenXinfa', name: '玄門心法', school: 'inner', grade: 2, tags: ['柔', '剛'], attr: 'yang', req: [{ art: 'chunyangFist', tier: 1 }], tech: null, techs: ['守一', '抱元'], effect: 'rest', v24: true, classic: true, own24: 'quanzhen', isPublic: false, cats: { neigong: 1 } },
  { id: 'jinyanStep', name: '金雁功', school: 'step', grade: 2, tags: ['巧'], attr: 'yang', req: [{ art: 'quanzhenXinfa', tier: 1 }], tech: null, techs: ['提縱', '金雁'], effect: 'speed', mode: 'lian', qiScale: 0.4, v24: true, classic: true, own24: 'quanzhen', isPublic: false, cats: { shenfa: 1 } },
  { id: 'haotianPalm', name: '昊天掌', school: 'palm', grade: 2, tags: ['剛'], attr: 'yang', req: [{ art: 'chunyangFist', tier: 1 }], techs: ['ht1', 'ht2'], tech: 'ht1', mode: 'lian', qiScale: 0.4, v24: true, classic: true, own24: 'quanzhen', isPublic: false, cats: { quanzhang: 1 } },
  { id: 'quanzhenSword', name: '全真劍法', school: 'palm', grade: 3, tags: ['巧', '剛'], weapon: 'sword', attr: 'yang', req: [{ art: 'chunyangFist', tier: 1 }], alt24: [{ art: 'basicSword', tier: 1 }], techs: ['qz1', 'qz2'], tech: 'qz1', mode: 'lian', qiScale: 0.4, v24: true, classic: true, own24: 'quanzhen', isPublic: false, cats: { jianfa: 1 } },
  { id: 'xiantianGong', name: '先天功', school: 'inner', grade: 3, tags: ['柔', '剛'], attr: 'he', req: [{ art: 'quanzhenXinfa', tier: 2 }], tech: null, techs: ['返先天', '抱一'], effect: 'rest', secret: true, hint: '高崖絕頂參悟石刻；山崖路線由 Phase 6 開通', v24: true, classic: true, own24: 'quanzhen', isPublic: false, cats: { neigong: 1 } },
].map((art) => ({ ...art, hermitageLineage: true })));
// 出自 Phase 6 規格：羅漢路線的心法與身法只進隱居羅漢主角候選，不改舊局武學池。
ARTS.push(
  { id: 'shaolinXinfa', name: '少林心法', school: 'inner', grade: 2, tags: ['剛', '拙'], attr: 'yang', req: [], tech: null, techs: ['調息', '守心'], effect: 'rest', classic: true, own24: 'shaolin', phase6Only: true, isPublic: false, cats: { neigong: 1 } }, // 羅漢拳是秘密拳譜，沿既有 schema 規則由確定性頓悟檢核它，不在通用 req 表引用秘密武學。
  { id: 'shaolinStep', name: '少林身法', school: 'step', grade: 2, tags: ['拙', '巧'], attr: 'yang', req: [{ art: 'shaolinXinfa', tier: 1 }], tech: null, techs: ['提氣', '疾行'], effect: 'speed', mode: 'lian', qiScale: 0.4, classic: true, own24: 'shaolin', phase6Only: true, isPublic: false, cats: { shenfa: 1 } },
  { id: 'shaolinArhat', name: '羅漢養氣訣', school: 'inner', grade: 3, tags: ['剛', '拙'], attr: 'yang', req: [{ art: 'shaolinXinfa', tier: 1 }], tech: null, techs: ['調息', '貫頂'], effect: 'rest', classic: true, secret: true, own24: 'shaolin', phase6Only: true, isPublic: false, cats: { neigong: 1 } }, // 出自 Phase 6 規格：絕頂石壁的高階少林分路，不借外作招式資料。
);
// 出自 Phase 4 規格的招式名稱；秒數、射程與勁沿用同階既有拳掌／基礎劍，不另造平衡常數。
const lineageMove = (base, id, name) => ({ ...MOVES.find((m) => m.id === base), id, name });
MOVES.push(
  lineageMove('fist', 'cy1', '守一架'), lineageMove('fist2', 'cy2', '純陽衝拳'), lineageMove('fist3', 'cy3', '三花聚頂勢'),
  lineageMove('push', 'ht1', '昊天起掌'), lineageMove('push2', 'ht2', '昊天合掌'),
  lineageMove('bs1', 'qz1', '全真起劍'), lineageMove('bs2', 'qz2', '金雁迴鋒'),
);
export const SECTS = {
  gaibang: { name: '丐幫', plaque: '丐幫・北丐一脈', color: '#8a5a2b', flag: '丐', bias: { 剛: 0.1, 拙: 0.05 }, tree: ['xianglong', 'dagou', 'pushPalm', 'basicFist'], tree24: ['breath', 'huntianGong', 'snowStep', 'xiaoyaoStep', 'lianhuaPalm', 'sweepLeg', 'fengmoStaff', 'liuheBlade', 'shexingHand'], ban: [], rules: ['hoard', 'rescue'],
    fac: { name: '打狗棒堂', cost: { wood: 10, coin: 10 }, daily: { food: 2 }, desc: '污衣淨衣議事；弟子沿村乞討，每日糧 +2' }, rivals: ['鐵掌幫', '白駝山'], fav: ['hongqigong', 'huangrong'],
    recruit: { root: 1, wu: -1, text: '一個根骨粗壯、腦筋不太靈光的小乞兒捧著破碗上山。' } },
  qizong: { name: '華山派', plaque: '華山派・氣宗', color: '#3b5f8a', flag: '華', bias: { 柔: 0.15, 快: -0.1 }, tree: ['zixia', 'breath', 'wavePalm'], tree24: ['huashanXinfa', 'zixia', 'pishiFist', 'hunyuanPalm', 'basicSword', 'huashanSword', 'sanxianSword', 'yangwu', 'taiyue', 'wulian', 'snowStep'], unlock24: { zixia: [{ art: 'huashanXinfa', tier: 2 }] }, ban: ['kuihua', 'huagu', 'hama'], rules: ['demon', 'qi'],
    fac: { name: '思過崖', cost: { stone: 10, coin: 6 }, ease: 3, desc: '面壁思過：每三天消一層掌門違心' }, rivals: ['嵩山派', '華山劍宗'], fav: ['linghuchong', 'ningzhongze', 'linpingzhi'],
    recruit: { wu: 1, text: '一位世家子弟執禮甚恭，遞上拜帖。' } },
  jianzong: { name: '華山劍宗', plaque: '思過崖・劍宗', color: '#5b6b7a', flag: '劍', bias: { 巧: 0.15 }, tree: ['dugu', 'wavePalm', 'snowStep'], tree24: ['breath', 'jianzongXinfa', 'basicSword', 'huashanSword', 'sanxianSword', 'yangwu', 'taiyue', 'kuangfengSword', 'snowStep', 'stepFeather', 'dugu'], ban: [], rules: ['rescue', 'jiu'], /* loop191：劍宗心法補本門內功 */
    fac: { name: '酒窖', cost: { wood: 8, coin: 8 }, mood: 5, desc: '好酒在窖：掌門每日心情 +5' }, rivals: ['華山氣宗', '嵩山派'], fav: ['renyingying', 'tianboguang', 'yuelingshan'],
    recruit: { mood: 10, text: '一個背著酒葫蘆的浪子聽說這裡管酒，笑嘻嘻來拜師。' } },
  mingjiao: { name: '明教', plaque: '明教・光明頂', color: '#b33a1f', flag: '火', bias: { 柔: 0.08, 巧: 0.07 }, tree: ['jiuyang', 'qiankun', 'taiji', 'breath'], tree24: ['shenghuoXinfa', 'snowStep', 'qingfuStep', 'yingzhuaHand', 'qishangFist', 'guangmingGong', 'shenghuoLing', 'lieyanBlade', 'hanbingMian', 'feihua', 'datengnuo'], ban: [], rules: ['heal', 'rescue'],
    fac: { name: '聖火壇', cost: { stone: 10, coin: 10 }, gain: 1.1, desc: '聖火不滅：全派練武 +10%' }, rivals: ['少林', '武當', '峨眉', '崑崙', '崆峒', '華山'], fav: ['zhaomin', 'xiaozhao'],
    recruit: { hp: 60, text: '一個帶傷的明教教眾跌跌撞撞上山求醫，傷好後不肯走了。' } },
  tiandihui: { name: '天地會', plaque: '天地會・青木堂', color: '#2f6a3a', flag: '洪', bias: { 巧: 0.05 }, tree: ['snowStep', 'huagu'], tree24: ['breath', 'yunlongXinfa', 'shenxingStep', 'basicFist', 'baihuaFist', 'basicSword', 'yunlongSword'], ban: [], rules: ['fanqing', 'share'],
    fac: { name: '香堂', cost: { wood: 8, coin: 6 }, daily: { coin: 3 }, desc: '拜香堂、收會費：每日香火錢 +3' }, rivals: ['神龍教', '朝廷鷹犬'], fav: ['shuanger', 'ake', 'haidafu'],
    recruit: { trait: 'glib', text: '一個市井混混對了暗號：「地振高岡，一派溪山千古秀。」' } },
  zhulong: { name: '豬籠城寨', plaque: '豬籠城寨', color: '#8a7a3a', flag: '寨', bias: { 剛: 0.15 }, tree: ['breath', 'snowStep', 'rulai', 'tantui', 'tiexian', 'bagua', 'shihou', 'basicFist'], ban: [], rules: ['rent', 'heart'], /* loop191：普通弟子需可學內功，三才需身法 */
    fac: { name: '大雜院', cost: { wood: 10, stone: 4 }, daily: { food: 1, coin: 1 }, desc: '包租婆收租：每日糧 +1、香火錢 +1' }, rivals: ['斧頭幫', '火雲邪神'], fav: ['baozupo', 'baozugong', 'afang'],
    recruit: { skill: 'strength', text: '一個扛米的苦力放下麻袋：「聽說這裡包吃包住？」' } },
  /* loop163 v2.4 Batch 4：五個新門派（v24:true；只能在 v2.4 新局以 heroSpec.sect24 指定，開局畫面維持三選項不加選單——見決定 §13） */
  emei: { v24: true, name: '峨眉派', plaque: '峨眉派・金頂', color: '#a07aa0', flag: '峨', bias: { 柔: 0.1, 巧: 0.05 }, tree: ['breath', 'emeiJiuyang', 'linjiZhuang', 'emeiSword', 'huifengSword', 'yanhang', 'jindingPalm', 'tiangangFinger', 'jieshou', 'stepFeather'], ban: ['jiuyinClaw'], rules: ['heal', 'rescue'],
    fac: { name: '金頂佛堂', cost: { stone: 8, coin: 8 }, mood: 3, daily: { rep: 0.3 }, desc: '金頂禮佛：掌門每日心情 +3、名聲每日 +0.3' }, rivals: ['明教', '崑崙派'], fav: [],
    recruit: { mood: 5, text: '一位帶髮修行的小師太持劍上山，說是師父讓她來歷練。' } },
  wudang: { v24: true, name: '武當派', plaque: '武當派・紫霄宮', color: '#4a6a8a', flag: '武', bias: { 柔: 0.12 }, tree: ['breath', 'wudangXinfa', 'wudangJiuyang', 'wudangFist', 'mianPalm', 'taiji', 'taijiClaw', 'basicSword', 'rouyunSword', 'taijiSword', 'xuanxuBlade', 'stepEight'], unlock24: { taiji: [{ art: 'wudangFist', tier: 2 }] }, ban: [], rules: ['qi', 'rescue'],
    fac: { name: '紫霄宮', cost: { wood: 10, stone: 6 }, gain: 1.1, def24: 1.18, desc: '真武坐鎮：全派練武 +10%；太極守禦：山門防禦戰力 +18%' }, rivals: ['少林', '明教'], fav: [],
    recruit: { wu: 1, text: '一個背著松紋古劍的少年道童叩門求道。' } },
  taohua: { v24: true, name: '桃花島', plaque: '桃花島・試劍亭', color: '#c06a7a', flag: '桃', bias: { 巧: 0.15 }, tree: ['breath', 'biboXinfa', 'tanzhi', 'lanhuaHand', 'basicSword', 'yuxiaoSword', 'stepEight'], ban: [], rules: ['heart', 'share'],
    fac: { name: '奇門桃林', cost: { wood: 12, coin: 6 }, daily: { coin: 2 }, desc: '桃林布陣、島上租佃：每日香火錢 +2' }, rivals: ['全真教', '江南七怪'], fav: ['chengying'],
    recruit: { wu: 1, text: '一個讀過幾本奇門雜書的書生搖著扇子上山。' } },
  gumu: { v24: true, name: '古墓派', plaque: '古墓派・活死人墓', color: '#7a8ca8', flag: '墓', bias: { 柔: 0.1, 快: 0.05 }, tree: ['breath', 'yunv', 'tianluoPalm', 'meinvFist', 'yunvJian', 'yunvSword', 'changhen', 'qianmie', 'qufeng', 'jiuyinGong', 'xianyunStep', 'xuantie', 'anran', 'stepFeather'], ban: [], rules: ['heart'],
    fac: { name: '寒玉床', cost: { stone: 12, coin: 8 }, gain: 1.5, gainMaxDs: 5, med24: 1.5, desc: '寒玉床上練功打坐：門人 ≤5 時全派練武、打坐回氣與衝關率 +50%' }, rivals: ['全真教'], fav: [],
    recruit: { text: '一個不太說話的姑娘在墓門外站了一整天。' } },
  xingxiu: { v24: true, name: '星宿派', plaque: '星宿派・星宿海', color: '#5a7a3a', flag: '星', bias: { 巧: 0.1, 剛: 0.05 }, tree: ['breath', 'huagongDafa', 'chousuiPalm', 'sanyinClaw', 'tianshanStaff', 'zhaixingHand', 'mingtian', 'xiaowuxiang', 'duPu', 'zhaixingStep'], ban: [], rules: ['hoard'],
    fac: { name: '神木王鼎', cost: { stone: 8, coin: 6 }, daily: { herb: 1, coin: 1 }, psn24: 1.35, desc: '神木王鼎煉毒：每日藥材 +1、香火錢 +1、門人毒傷 +35%；新人入門即帶《百毒譜》' }, rivals: ['丐幫', '逍遙派'], fav: ['azi'],
    recruit: { text: '一個臉色發青的小子捧著毒蟲罐子上山。', art24: 'duPu' } },
  wuming: { name: '無名小派', plaque: '無名小派', color: '#6a5a4a', flag: '武', bias: {}, tree: [], ban: [], rules: [],
    fac: { name: '祖師堂', cost: { wood: 8, stone: 4 }, daily: { rep: 0.5 }, gain24: 1.12, desc: '供奉開山祖師：名聲每日 +0.5（新局另全派練武 +12%）' }, rivals: [], fav: [],
    recruit: { text: '一個慕名而來的年輕人上山拜師。' } },
  quanzhen: { v24: true, name: '全真派', plaque: '終南・全真', color: '#a8804a', flag: '真', bias: {}, tree: ['chunyangFist', 'quanzhenXinfa', 'jinyanStep', 'haotianPalm', 'quanzhenSword', 'xiantianGong'], ban: [], rules: [], rivals: [], fav: [] },
  zhongnan: { v24: true, name: '終南雙劍宗', plaque: '終南・雙劍', color: '#8c7192', flag: '雙', bias: {}, tree: ['chunyangFist', 'quanzhenXinfa', 'quanzhenSword', 'yunvJian', 'yunvSword'], ban: [], rules: [], rivals: [], fav: [] },
  // 出自 Phase 7 規格：羅漢外堂與桃花內堂只由隱居開山選擇，不進舊局可選門派清單。
  shaolin: { v24: true, phase7Only: true, name: '少林別院', plaque: '少林別院', color: '#9c784e', flag: '禪', bias: {}, tree: ['luohanHands', 'shaolinXinfa', 'shaolinStep', 'shaolinArhat'], ban: [], rules: [], rivals: [], fav: [] },
  longrong: { v24: true, phase7Only: true, name: '剛巧合宗', plaque: '隱龍山莊', color: '#a17b6b', flag: '龍', bias: {}, tree: ['luohanHands', 'shaolinXinfa', 'shaolinStep', 'shaolinArhat', 'lanhuaHand', 'biboXinfa', 'yuxiaoSword'], ban: [], rules: [], rivals: [], fav: [], recruit: { text: '聽聞兩堂並立，來人請求拜師學藝。' } },
};
/* loop169 t190 待決 4：自創主角開局可選的開山道統（custom-sect24 下拉；wuming＝不指定） */
export const SECT_PICK24 = ['wuming', 'emei', 'wudang', 'taohua', 'gumu', 'xingxiu', 'qizong', 'jianzong', 'gaibang', 'mingjiao', 'tiandihui']; /* loop174 加天地會 */
export const HERO_SECT = { guojing: 'gaibang', yuebuqun: 'qizong', linghuchong: 'jianzong', zhangwuji: 'mingjiao', weixiaobao: 'tiandihui', axing: 'zhulong' };
// 自創主角：九問主價值 → 流派偏向＋一條門規
export const CUSTOM_BY_VALUE = { xia: ['剛', 'rescue'], sect: ['拙', 'hoard'], qing: ['柔', 'heart'], free: ['巧', 'heart'], wu: ['拙', 'rescue'], fame: ['剛', 'rent'] };
/* loop164 v2.4 Batch 4.2 自創無名派家傳入門三件套（依主價值） */
export const WUMING_KIT24 = { free: ['basicSword', 'snowStep', 'breath'], qing: ['basicSword', 'snowStep', 'breath'], xia: ['wuhuBlade', 'pushPalm', 'breath'], fame: ['wuhuBlade', 'pushPalm', 'breath'], wu: ['shaolinStaff', 'sweepLeg', 'breath'], sect: ['shaolinStaff', 'sweepLeg', 'breath'] };
export const CUSTOM_RIVALS = ['青城派', '鐵掌幫', '星宿派'];
export function sectBiasMul(d, a) { // [流派偏向, 外門] 兩個乘數；沒門派資料的弟子回 [1,1]
  if (!d.stree) return [1, 1];
  const b = d.sbias || {}, sum = (a.tags || []).reduce((x, t) => x + (b[t] || 0), 0), m = 1 + Math.max(-SECT_K.biasCap, Math.min(SECT_K.biasCap, sum));
  const out = a.classic && !a.signature && !d.stree.includes(a.id) && !(d.sectId === 'wuming') ? SECT_K.outside : 1; // 名俠招牌＝客傳，不罰；loop164 無名派【百納海川】不罰
  return [m, out];
}

// ==== （原 score-data.mjs）====
// v1.7 活動打分＝純資料：每列一個候選活動。sim.mjs 的 scoreRows() 是唯一解讀器。
// when：前提（PRED 名，全部要成立）；tiers：依序第一個 if 成立者生效；v：數值規格；why：理由模板（{路徑}）；layer：仲裁層
// 數值規格：數字，或 { pick:[路徑,真,假] | lin:[路徑, 基準] → (基準−值), mul:[數字|路徑|pick…], plus:數字 }；tr.* 路徑缺省為 1
export const SCORE = [
  { act: 'rest', tiers: [{ if: 'tired', v: 130, why: '精力見底，睡到飽再起', layer: 'need' }, { if: 'wake', v: { lin: ['n.energy', 100], mul: [0.6] }, why: '有點累' }] },
  { act: 'rest', when: ['hurt'], v: 90, why: '傷還沒好，躺著養傷', layer: 'need' },
  { act: 'eat', when: ['hasFood'], tiers: [{ if: 'starving', v: 160, why: '餓得發昏，先吃', layer: 'need' }, { if: 'hungry', v: 95, why: '餓了', layer: 'need' }, { v: { lin: ['n.hunger', 100], mul: [0.6] }, why: '順便吃點' }] },
  { act: 'chat', when: ['others'], v: { lin: ['n.social', 100], mul: [0.6, 'tr.social', 'tr.playful', 0.8] }, why: '想找人說話' },
  { act: 'leisure', tiers: [{ if: 'dull', v: { lin: ['fun', 100], mul: [0.55] }, why: '悶得慌，想偷閒' }, { v: { lin: ['fun', 100], mul: [0.55] }, why: '想坐坐看雲' }] },
  { act: 'encourage', when: ['encourageOk'], v: { lin: ['low.mood', 35], mul: [1.5], plus: 40 }, why: '{low.name}心情低落，去打打氣' },
  { act: 'learn', when: ['pending'], v: 80, why: '師父能傳「{pendingName}」' },
  { act: 'meditate', tiers: [{ if: 'btOk', v: 75, why: '「{btName}」卡在瓶頸，打坐衝關' }, { if: 'wexin', v: { lin: ['negWexin', 0], mul: [20], plus: 30 }, why: '心中違心，閉關靜坐' }] },
  { act: 'train', v: { pick: ['d.adult', 40, 18], mul: ['tr.diligent'] }, why: '練功變強' },
  { act: 'spar', when: ['sparOk'], v: { pick: [true, 34, 34], mul: ['tr.diligent'] }, why: '找人切磋' },
  { act: 'chop', when: ['woodRoom'], tiers: [{ if: 'shortWood', v: 50, why: '工地缺木' }, { v: 28, why: '備柴' }] },
  { act: 'quarry', when: ['stoneRoom'], tiers: [{ if: 'shortStone', v: 50, why: '工地缺石' }, { v: 14, why: '備石' }] },
  { act: 'farm', tiers: [{ if: 'foodLow', v: 'FS.farm', why: '存糧見底，先顧菜畦', layer: 'need' }, { if: 'ripe', v: 50, why: '菜熟了' }, { v: 30, why: '菜畦空著該播種' }] },
  { act: 'foray', when: ['forayReady', 'animalTracks'], tiers: [{ if: 'foodLow', v: 95, why: '存糧不足，沿後山獸跡找獵物', layer: 'need' }, { v: 20, why: '後山有獸跡，想去看看' }] },
  { act: 'patrol', when: ['practiceStuck', 'patrolReady'], v: 60, why: '招式卡住了，想去走過的後山實戰' },
  { act: 'forage', v: { pick: [true, 18, 18], mul: ['tr.playful'] }, why: '採藥' },
  { gen: true }, // v1.6 建築活動（ACTIVITIES[].gen）在這個位置展開
  { act: 'build', when: ['siteWork'], v: { pick: [true, 55, 55], mul: [{ pick: ['d.adult', 1, 0.6] }] }, why: '{buildWhy}' },
  { act: 'rest', when: ['nightRest'], v: 60, why: '入夜歇息' },
  { act: 'cook', when: ['cookable'], v: { lin: ['food', 10], mul: [4], plus: 30 }, why: '灶上該煮飯了' },
];
// v1.8 打分後處理＝純資料（原 scoreActs 內的 if）：依序套用；sim.mjs 的 postRows() 是唯一解讀器。
// who：labor／notLabor；if：前提（POST_PRED 名，「!」開頭取反）；acts／except：作用範圍（陣列或 K.* 常數名）；
// drop：true 或述詞名 → 移除；muls：[{ name, v, if?, hide1? }] → 推入外部組倍率並把乘積寫到 f[key]
export const SCORE_POST = [
  { acts: ['farm'], drop: '!plotWork' },
  { who: 'labor', except: 'K.LABOR_ACTS', drop: true },
  { who: 'labor', acts: ['chop', 'quarry', 'build'], muls: [{ name: '雇工', v: 'K.LABOR_WORK_MUL' }], key: 'labor' },
  { who: 'notLabor', acts: 'K.CHORE_ACTS', if: ['skip'], drop: true },
  { who: 'notLabor', acts: 'K.CHORE_ACTS', if: ['outer', '!em'], drop: '!myDuty', muls: [{ name: '優先度', v: 'prioMul', hide1: true }, { name: '日課未滿', v: 'K.QUOTA.dutyMul', if: 'owe' }], key: 'duty' },
  { who: 'notLabor', if: ['foodLow'], except: 'FS.keep', muls: [{ name: '糧荒', v: 'FS.gateMul' }], key: 'food' }, // v1.76 糧荒
  { who: 'notLabor', if: ['head'], acts: ['train'], muls: [{ name: '首徒', v: 'K.QUOTA.headTrain' }], key: 'head' },
];

// ==== （原 portrait-set.mjs）====
// v1.8 PB-15/16/18：新舊畫像並存開關。v2＝批次後製版（去背壓淡＋描邊；小尺寸用臉部頭像），舊檔不刪。
export const POST_IDS = new Set('afang ake axing baozugong baozupo caifeng dongfangbubai feizaicong fengqingyang guojing haidafu hongqigong huangrong huoyunxieshen kulijiang linghuchong linpingzhi munianci ningzhongze renyingying shuanger tianboguang weixiaobao xiaolongnv xiaozhao yangguo youzhagui yuebuqun yuelingshan zhangwuji zhaomin zhoubotong '.trim().split(' '));
export const PSET_KEY = 'solo-sect-portraits';
export const SMALL_PX = 72; // 顯示寬 ≤72px 改用頭像
export function portraitSrc(src, set, small = false) {
  const m = /^(.*?)assets\/portraits\/(?:v2\/post\/)?([\w]+?)(?:-head)?\.png$/.exec(src || ''); if (!m || !POST_IDS.has(m[2])) return src;
  return set === 'v2' ? `${m[1]}assets/portraits/v2/post/${m[2]}${small ? '-head' : ''}.png` : `${m[1]}assets/portraits/${m[2]}.png`;
}
export function applyPortraitSet(root, set) {
  for (const img of root.querySelectorAll('img[src*="assets/portraits/"]')) { const cur = img.getAttribute('src'); const w = img.clientWidth || img.width || 999; const nx = portraitSrc(cur, set, w > 0 && w <= SMALL_PX); if (nx !== cur) img.setAttribute('src', nx); }
}
export function bindPortraitSet(doc, store, btn) {
  let set = store.getItem(PSET_KEY) === 'v2' ? 'v2' : 'v1'; const label = () => { if (btn) btn.textContent = set === 'v2' ? '畫像：新（v2）' : '畫像：舊'; };
  let busy = false; const run = () => { if (busy) return; busy = true; try { applyPortraitSet(doc, set); } finally { busy = false; } };
  new doc.defaultView.MutationObserver(run).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  if (btn) btn.onclick = () => { set = set === 'v2' ? 'v1' : 'v2'; store.setItem(PSET_KEY, set); label(); run(); };
  label(); run(); return () => set;
}

// ==== （原 destiny.mjs）====
// v2.0 A8 宿命樹檢核器：各角色主線步驟、抉擇卡文字、主線觸發條件皆在 destiny-trees.json；
// 引擎只負責（1）把卡資料與效果函式組成 CARDS（2）依序評估宣告式檢核。純重構：檢核順序、條件、亂數呼叫與原本 if 鏈完全一致。
export { TREES };
export const buildCards = (data, fx) => Object.fromEntries(Object.entries(data).map(([id, c]) => {
  const f = fx[id]; if (!f || f.length !== c.opts.length) throw new Error(`destiny: card ${id} 效果數與選項數不符`);
  return [id, { ...c, opts: c.opts.map((o, i) => ('values' in o ? [o.label, o.values, f[i]] : [o.label, f[i]])) }];
}));
// 檢核欄位：arc [lo,hi) 主線步數區間；day 最低日；art [武學, 最低階]；unless s.jh 旗標須為假；flag s.hero 旗標須為真；
// card 觸發卡（force 強制）；then 成功後推進的主線步 [[n,文字]]。回傳 true＝本 tick 已處理（呼叫端 return）。
export function destinyStep(s, id, ctx) {
  const list = TREES.checks[id]; if (!list) return false; const n = s.hero?.arcStep || 0;
  for (const c of list) {
    if (n < c.arc[0] || n >= c.arc[1]) continue;
    if (c.flag && !s.hero[c.flag]) continue;
    if (c.art && ctx.artTier(ctx.d0, c.art[0]) < c.art[1]) continue;
    if (c.day != null && s.day < c.day) continue;
    if (c.unless && s.jh[c.unless]) continue;
    if (c.card) { if (!ctx.card(s, c.card, c.force)) continue; for (const [k, t] of c.then || []) ctx.arc(s, id, k, t); return true; }
    for (const [k, t] of c.then || []) ctx.arc(s, id, k, t); return false;
  }
  return false;
}

// 共用接觸資料補全：招式可逐列覆寫肢側、部位、偏移衝量。
for(const m of MOVES)completeContactMove(m);
