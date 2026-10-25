// v0.96 主角建立：六屬性、六價值觀、九問問心、六位經典模板、開局同門候選
export const STATS = [['wu', '悟性'], ['gen', '根骨'], ['li', '臂力'], ['shen', '身法'], ['ding', '定力'], ['fu', '福緣']];
export const STAT_BUDGET = 12; // 六項起始各 1，共 12 點（含起始的 6）→ 可再分配 6；悟性停在 1 退 1 點（笨功夫）
export const VALUES = [['xia', '俠義'], ['sect', '門派'], ['qing', '情義'], ['free', '自在'], ['wu', '武道'], ['fame', '名望']];
// 行動標籤 → 價值觀（autopilot：價值 × 標籤 進入天賦組）
export const ACT_TAGS = {
  train: ['wu'], spar: ['wu', 'fame'], meditate: ['wu'], learn: ['wu'],
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
  { id: 'guojing', name: '郭靖', diff: 1, tag: '憨厚苦練：悟性 1、根骨 5，天天練就會變強', stats: { wu: 1, gen: 5, li: 4, shen: 2, ding: 4, fu: 2 }, personality: ['honest', 'diligent', 'stubborn'], values: { xia: 40, sect: 25, qing: 20, free: -10, wu: 10, fame: 0 }, style: 'palm', lore: ['江南七怪雜學', '全真內功入門'], companions: ['huangrong', 'munianci'], arc: 'guojing' },
  { id: 'weixiaobao', name: '韋小寶', diff: 3, tag: '不靠武功：經濟、說謊、收人才；巡山專門溜走', stats: { wu: 3, gen: 1, li: 1, shen: 4, ding: 1, fu: 5 }, personality: ['glib', 'lazy', 'optimist'], values: { free: 40, fame: 25, qing: 20, wu: -30, xia: 0, sect: 0 }, style: 'leg', lore: ['神行百變（逃命部分）'], coinMul: 3, companions: ['shuanger', 'ake'], arc: 'weixiaobao' },
  { id: 'linghuchong', name: '令狐沖', diff: 2, tag: '悟性派：灑脫嗜酒，以巧破招；被逐出華山自立門戶', stats: { wu: 5, gen: 3, li: 2, shen: 4, ding: 1, fu: 2 }, personality: ['free', 'drinker', 'sociable'], values: { free: 40, qing: 35, xia: 20, sect: -10, fame: -20, wu: 10 }, style: 'palm', lore: ['華山劍法（精階）', '氣宗內功（低）'], companions: ['yuelingshan', 'renyingying', 'tianboguang'], arc: 'linghuchong' },
  { id: 'yuebuqun', name: '岳不群', diff: 3, tag: '偽君子：紫霞九層、辟邪誘惑、違心越積越多', stats: { wu: 4, gen: 3, li: 2, shen: 3, ding: 4, fu: 2 }, personality: ['worrier', 'diligent', 'hypocrite'], values: { fame: 40, sect: 35, xia: 10, qing: -10, free: -10, wu: 15 }, style: 'palm', lore: ['華山劍法（小成）', '紫霞神功（第一層）'], companions: ['ningzhongze', 'linghuchong'], arc: 'yuebuqun' },
  { id: 'zhangwuji', name: '張無忌', diff: 2, tag: '柔：九陽內功天才，但優柔寡斷，抉擇常拖延', stats: { wu: 4, gen: 5, li: 2, shen: 3, ding: 2, fu: 3 }, personality: ['gentle', 'indecisive', 'kind'], values: { qing: 40, xia: 35, sect: 10, fame: -20, wu: -10, free: 0 }, style: 'palm', lore: ['九陽神功（第一層）', '醫術'], companions: ['zhaomin', 'xiaozhao'], arc: 'zhangwuji' },
  { id: 'axing', name: '阿星', diff: 4, tag: '大器晚成：根骨被封，瀕死後覺醒如來神掌', stats: { wu: 1, gen: 1, li: 3, shen: 3, ding: 2, fu: 2 }, sealed: true, personality: ['rascal', 'lazy', 'brave'], values: { fame: 40, free: 20, xia: -20, qing: 0, sect: 0, wu: 0 }, style: 'palm', lore: ['街頭打架', '《如來神掌》小冊子（被騙買的）'], companions: ['afang', 'feizaicong'], arc: 'axing' },
];
// 開局同門候選（也是名俠池的一部分；被選中就移出名俠池）
export const COMPANIONS = {
  huangrong: { name: '黃蓉', sprite: 'senior', style: 'palm', root: 2, wu: 5, personality: ['clever', 'nimble', 'picky'], skills: { leg: 6, palm: 10, strength: 4, farming: 6, herbal: 12, agility: 18, cooking: 30 }, tag: '巧：悟性高、根骨低；廚藝引洪七公、精打細算', lore: ['落英神劍掌（之後）', '打狗棒法（之後）'], econ: 1, pair: { guojing: 0.25 } },
  munianci: { name: '穆念慈', sprite: 'senior', style: 'leg', root: 3, wu: 3, personality: ['honest', 'gentle'], skills: { leg: 10, palm: 6, strength: 8, farming: 8, herbal: 6, agility: 10, cooking: 10 }, tag: '踏實：楊家槍，忠厚可靠' },
  shuanger: { name: '雙兒', sprite: 'senior', style: 'leg', root: 4, wu: 3, personality: ['gentle', 'diligent'], skills: { leg: 14, palm: 8, strength: 8, farming: 8, herbal: 6, agility: 14, cooking: 12 }, tag: '忠心：武功好、任勞任怨，替主角打架' },
  ake: { name: '阿珂', sprite: 'senior', style: 'palm', root: 3, wu: 4, personality: ['brave', 'picky'], skills: { leg: 6, palm: 12, strength: 6, farming: 2, herbal: 4, agility: 12, cooking: 2 }, tag: '高傲：劍法不錯，但對主角好感很低' },
  yuelingshan: { name: '岳靈珊', sprite: 'senior', style: 'palm', root: 3, wu: 3, personality: ['playful', 'sociable'], skills: { leg: 6, palm: 10, strength: 5, farming: 4, herbal: 4, agility: 12, cooking: 6 }, tag: '小師妹：玉女劍法，情義牽絆' },
  renyingying: { name: '任盈盈', sprite: 'senior', style: 'palm', root: 4, wu: 4, personality: ['clever', 'worrier'], skills: { leg: 6, palm: 12, strength: 5, farming: 2, herbal: 10, agility: 12, cooking: 6 }, tag: '聖姑：琴音療傷、黑木崖人脈' },
  tianboguang: { name: '田伯光', sprite: 'hero', style: 'leg', root: 4, wu: 3, personality: ['brave', 'drinker'], skills: { leg: 14, palm: 8, strength: 12, farming: 2, herbal: 2, agility: 20, cooking: 2 }, tag: '浪子：輕功快刀，巡山疾行；名聲差' },
  ningzhongze: { name: '寧中則', sprite: 'senior', style: 'palm', root: 4, wu: 4, personality: ['gentle', 'brave'], skills: { leg: 8, palm: 14, strength: 8, farming: 8, herbal: 8, agility: 10, cooking: 10 }, tag: '寧氏一劍：正直，看穿偽君子會失望' },
  linghuchong: { name: '令狐沖', sprite: 'hero', style: 'palm', root: 3, wu: 5, personality: ['free', 'drinker', 'sociable'], skills: { leg: 6, palm: 12, strength: 6, farming: 2, herbal: 2, agility: 12, cooking: 2 }, tag: '首徒：灑脫，九劍伏筆；會不會被逐出看你' },
  zhaomin: { name: '趙敏', sprite: 'senior', style: 'palm', root: 3, wu: 5, personality: ['clever', 'brave'], skills: { leg: 6, palm: 10, strength: 4, farming: 2, herbal: 6, agility: 12, cooking: 4 }, tag: '郡主：謀略與資源，正派名俠好感 −' },
  xiaozhao: { name: '小昭', sprite: 'senior', style: 'leg', root: 3, wu: 4, personality: ['gentle', 'diligent'], skills: { leg: 8, palm: 6, strength: 4, farming: 8, herbal: 8, agility: 10, cooking: 14 }, tag: '溫柔：照顧人、心情加成，身世之謎' },
  afang: { name: '阿芳', sprite: 'senior', style: 'leg', root: 2, wu: 3, personality: ['gentle', 'optimist'], skills: { leg: 4, palm: 2, strength: 2, farming: 8, herbal: 6, agility: 8, cooking: 8 }, tag: '啞女：善良，喚起阿星的良心（俠義 +）' },
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
  hypocrite: { name: '偽君子', desc: '人前君子，人後算計；名望受損時心情大跌', mods: {} },
  indecisive: { name: '優柔', desc: '重大抉擇總要拖上幾天', mods: {} },
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
