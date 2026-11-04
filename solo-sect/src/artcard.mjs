/* #403 武學卡。#408 起，招式傷害只留形狀，強度走扇形曲線。
   曲線數字是本遊戲自己的。本檔不讀外部資料、不進口訣。 */
import { ARTS, MOVES } from './data.mjs';

export const CURVE_SHAPE = [0.40, 0.58, 0.74, 0.88, 1];
/* 入門、小成先不按名次拉開。大成起名次才進威力。 */
export const FAN_F = [0, 0, 0.35, 0.7, 1];
export const TIER_R = { 入門: 0.8, 常見: 1, 名門: 1.6, 一流: 2.4, 絕頂: 3.5 };
/* 造詣上限沿用品階表。出手不讀這張表，所以它不是第二條威力梯子。 */
const GROW_CAP = { 1: 20, 2: 35, 3: 55, 4: 75 };
/* 前置比例：練功不得超過這些武學裡最高的熟練。劇情直接給的熟練不在這裡砍。 */
export const CEILING = {
  taijiSword: ['taiji'],
  taijiClaw: ['taiji'],
  xuanxuBlade: ['taiji'],
  qiankun: ['shenghuoXinfa', 'jiuyang'],
};
/* 大成、圓滿、化境各一招。太極劍、七傷拳資料裡只有兩招。
   獨孤九劍標了 forms，這張表只記觀破該落在哪一檔，unlockTechs 不發招。
   總訣仍由第四晚傳授，不在表上。破劍等式約大成，破氣約圓滿，狂風卷地約化境。 */
export const SPECIALS = {
  xianglong: [{ tier: 2, move: 'jianlong' }, { tier: 3, move: 'feilong' }, { tier: 4, move: 'kanglong' }],
  bixie: [{ tier: 2, move: 'bx1' }, { tier: 3, move: 'bx2' }, { tier: 4, move: 'bx3' }],
  taijiSword: [{ tier: 2, move: 'tjs1' }, { tier: 3, move: 'tjs2' }],
  qishangFist: [{ tier: 2, move: 'qs1' }, { tier: 3, move: 'qs2' }],
  dagou: [{ tier: 2, move: 'banzi' }, { tier: 3, move: 'chuozi' }, { tier: 4, move: 'wugou' }],
  dugu: [{ tier: 2, move: 'dg1' }, { tier: 3, move: 'dg8' }, { tier: 4, move: 'dg9' }],
};
/* #404 六門絕活。代價是耗內力、傷己、先手只有一下，或看破之後自己不擋。
   need 是火候階。數字是本遊戲自己定的，不是從別的程式抄來的。
   事件名：hit、block、dodge、crit、gethit、kill。沒寫到的事件就是不觸發。 */
const ON = {
  xianglong: { hit: { need: 2, qi: 16, dmg: 1.4, knock: 22, log: '使出降龍，掌力震得對手退了一步，真氣瀉出一大截', fx: { word: '震', color: '#ffdc60', kind: 'dragon' } } },
  dugu: {
    hit: { need: 0, seen: true, dmg: 1.2, log: '獨孤劍意看破破綻，劍勢直取，自己不收勢格擋', fx: { word: '破', color: '#cfe0f5', kind: 'dugu' } },
    dodge: { need: 0, seen: true, see: true, noParry: true, log: '獨孤劍意料中來勢，側身讓過，這一招自己不擋', fx: { word: '破', color: '#cfe0f5', kind: 'dugu' } },
  },
  bixie: { hit: { need: 2, qi: 6, first: true, flurry: 2, log: '快劍先至，連刺數劍', fx: { word: '刺', color: '#d04070', kind: 'bixie' } } },
  taijiSword: { gethit: { need: 2, reflect: 0.45, log: '太極劍走圓轉，把來力反震了回去', fx: { word: '借', color: '#a0c0e0', kind: 'ring' } } },
  qishangFist: { hit: { need: 2, selfHp: 6, dmg: 1.2, log: '七傷拳打實，自己的內腑也震了一下', fx: { word: '傷', color: '#e05030', kind: 'heavy' } } },
  dagou: { hit: { need: 2, qi: 4, trip: 1.2, log: '打狗棒一纏一絆，對手腳下亂了', fx: { word: '絆', color: '#4fc47a', kind: 'staff' } } },
  /* #410 第二批。心情不在這裡乘：黯然的輕重已經在 jhMul。乾坤的反震取代舊的 d.reflect，不要兩條一起算。 */
  xuantie: { hit: { need: 2, breakParry: true, dmg: 1.25, log: '重劍壓下，對手的招架被破開', fx: { word: '壓', color: '#555555', kind: 'heavy' } } },
  anran: { hit: { need: 2, mood: true, log: '心緒越沉，這一掌越重', fx: { word: '意', color: '#6888a8', kind: 'tear' } } },
  hama: { hit: { need: 2, charge: true, hpBelow: 50, qiKeep: 0.5, qi: 10, dmg: 1.5, log: '氣血見底，蓄起的掌力反擊出去', fx: { word: '蓄', color: '#55aa44', kind: 'toad' } } },
  qiankun: { gethit: { need: 0, reflect: 0.3, shift: 0.25, log: '乾坤一挪，來力從身旁過去，餘勢反震回去', fx: { word: '移', color: '#d4af37', kind: 'ring' } } },
  jiuyinClaw: { hit: { need: 2, breakGuard: true, dmg: 1.2, xia: -2, log: '爪勁透進護體，這一爪傷了自己的俠義', fx: { word: '爪', color: '#882244', kind: 'needle' } } },
  yuxiaoSword: { hit: { need: 2, disturb: 1.2, log: '簫聲一繞，對手的節奏亂了', fx: { word: '律', color: '#44aa99', kind: 'ring' } } },
  /* #411 豬籠城寨系列。依電影勝負：如來壓軸絕頂、譚腿先發踢亂、鐵線破招架、八卦逼退。 */
  rulai: { hit: { need: 2, qi: 20, dmg: 1.6, knock: 30, log: '萬佛朝宗自天而降，掌力雄渾震退對手', fx: { word: '神', color: '#ffd700', kind: 'dragon' } } },
  tantui: { hit: { need: 2, first: true, trip: 1.3, log: '十二路譚腿先發制人，腿風掃亂對手下盤', fx: { word: '踢', color: '#c08040', kind: 'strike' } } },
  tiexian: { hit: { need: 2, breakParry: true, dmg: 1.25, log: '鐵線拳雙臂硬開硬進，破開招架', fx: { word: '硬', color: '#a0a0a0', kind: 'heavy' } } },
  bagua: { hit: { need: 2, qi: 4, knock: 16, log: '八卦棍長兵點刺，將對手逼退一段', fx: { word: '刺', color: '#b07040', kind: 'staff' } } },
};
export const BRANCHES = {
  xianglong: {
    A: { name: '剛猛', desc: '掌力剛猛暴烈，震退更遠，但耗真氣更多', hit: { qi: 24, dmg: 1.6, knock: 35, log: '掌力排山倒海，將對手震得暴退！', fx: { word: '剛', color: '#ffaa20', kind: 'dragon' } } },
    B: { name: '留力', desc: '留力三分收放由心，不震退，耗真氣大減', hit: { qi: 8, dmg: 1.25, knock: 0, log: '掌發留三分力，收放由心，下一招來得極快', fx: { word: '柔', color: '#ffd060', kind: 'dragon' } } },
  },
  dugu: {
    A: { name: '無招', desc: '無招勝有招，料敵機先完全不收勢格擋，攻勢更凌厲', hit: { need: 0, seen: true, dmg: 1.35, log: '獨孤無招直取破綻，劍勢無匹！', fx: { word: '意', color: '#cfe0f5', kind: 'dugu' } }, dodge: { need: 0, seen: true, see: true, noParry: true, log: '獨孤無招直取，自己不收勢格擋', fx: { word: '意', color: '#cfe0f5', kind: 'dugu' } } },
    B: { name: '破式', desc: '專破兵刃招架，保留部分招架防身', hit: { need: 0, seen: true, dmg: 1.15, breakParry: true, log: '獨孤劍式破開對手來招！', fx: { word: '破', color: '#a0d0ff', kind: 'dugu' } }, dodge: { need: 0, seen: true, see: true, noParry: false, log: '獨孤劍式料敵先機，半攻半守', fx: { word: '破', color: '#a0d0ff', kind: 'dugu' } } },
  },
  bixie: {
    A: { name: '鬼魅', desc: '迅雷連刺三劍，先手爆發更強但耗內力', hit: { need: 2, qi: 10, first: true, flurry: 3, log: '身如鬼魅，迅雷連刺三劍！', fx: { word: '疾', color: '#e03070', kind: 'bixie' } } },
    B: { name: '穿隙', desc: '快劍直取要害穿透護體，真氣消耗減半', hit: { need: 2, qi: 3, first: true, flurry: 2, breakGuard: true, log: '快劍穿隙破開護體！', fx: { word: '銳', color: '#d04070', kind: 'bixie' } } },
  },
  taijiSword: {
    A: { name: '借力', desc: '綿綿不絕借力打力，反震威力提升', gethit: { need: 2, reflect: 0.65, log: '太極劍借力打力，將大半來力反震回去！', fx: { word: '借', color: '#80b0e0', kind: 'ring' } } },
    B: { name: '圓轉', desc: '化勁圓融卸去三成傷害，餘勢微震', gethit: { need: 2, reflect: 0.25, shift: 0.35, log: '太極劍圈一轉，卸去三成傷害，餘勢微震', fx: { word: '轉', color: '#a0c0e0', kind: 'ring' } } },
  },
  qishangFist: {
    A: { name: '摧肝', desc: '七傷極意猛烈催發，威力大增但自損加劇', hit: { need: 2, selfHp: 10, dmg: 1.45, log: '七傷拳極力催發，重創對手，自己內腑亦劇痛！', fx: { word: '煞', color: '#c02010', kind: 'heavy' } } },
    B: { name: '調氣', desc: '剛柔相濟吞吐有度，自損極輕', hit: { need: 2, selfHp: 2, dmg: 1.15, log: '拳力吞吐有度，傷己甚微', fx: { word: '平', color: '#e07050', kind: 'heavy' } } },
  },
  dagou: {
    A: { name: '絆跌', desc: '絆字訣絆倒對手下盤，阻滯極久', hit: { need: 2, qi: 6, trip: 2.2, log: '綠竹杖絆住下盤，對手一個踉蹌栽倒！', fx: { word: '跌', color: '#3fb06a', kind: 'staff' } } },
    B: { name: '纏打', desc: '轉字訣如影隨形，擾亂對手出手節奏', hit: { need: 2, qi: 3, trip: 1.0, disturb: 1.5, log: '杖法如影隨形，對手節奏大亂！', fx: { word: '纏', color: '#5fd48a', kind: 'staff' } } },
  },
  xuantie: {
    A: { name: '重拙', desc: '大巧不工橫掃擊退，沉猛無比', hit: { need: 2, breakParry: true, dmg: 1.4, knock: 20, log: '重劍橫掃，沉猛力道直接盪開兵刃！', fx: { word: '重', color: '#404040', kind: 'heavy' } } },
    B: { name: '順勢', desc: '輕重隨心順勢推舟，破開招架毫無滯礙且不耗力', hit: { need: 2, breakParry: true, dmg: 1.2, qi: 0, log: '借劍身之勢順水推舟，破開招架！', fx: { word: '順', color: '#666666', kind: 'heavy' } } },
  },
  anran: {
    A: { name: '心死', desc: '銷魂極慟萬念俱灰，心情低於 35 時這一掌 ×1.35，平常不加', hit: { need: 2, mood: true, moodBelow: 35, dmg: 1.35, log: '萬念俱灰，悲慟之中掌力暴漲！', fx: { word: '慟', color: '#486898', kind: 'tear' } } },
    B: { name: '懷念', desc: '相思綿綿平常心境即可激發，任何心情這一掌 ×1.1', hit: { need: 2, mood: true, dmg: 1.1, log: '思緒綿綿，平常心境亦能激發黯然真意', fx: { word: '思', color: '#7898b8', kind: 'tear' } } },
  },
  hama: {
    A: { name: '逆息', desc: '背水反擊真氣逆行急衝，蓄勢更快但傷身', hit: { need: 2, charge: true, hpBelow: 65, qiKeep: 0.3, qi: 8, dmg: 1.4, selfHp: 4, log: '真氣逆行急衝，負傷強發猛擊！', fx: { word: '逆', color: '#448833', kind: 'toad' } } },
    B: { name: '純蓄', desc: '盤石蓄勁穩住一口純陽真氣，絕地反撲威力更大', hit: { need: 2, charge: true, hpBelow: 40, qiKeep: 0.6, qi: 15, dmg: 1.75, log: '穩住一口純陽真氣，絕地反撲！', fx: { word: '蓄', color: '#66bb55', kind: 'toad' } } },
  },
  qiankun: {
    A: { name: '挪移', desc: '引動陰陽大幅度反震來力', gethit: { need: 0, reflect: 0.45, shift: 0.35, log: '乾坤大挪移引動陰陽，將大部分勁道回贈對手！', fx: { word: '轉', color: '#e0c040', kind: 'ring' } } },
    B: { name: '卸勁', desc: '牽引避鋒化去半數來力入地，反震較弱', gethit: { need: 0, reflect: 0.15, shift: 0.5, log: '心法牽引，對手勁力全數落空卸入地下！', fx: { word: '空', color: '#c0a030', kind: 'ring' } } },
  },
  jiuyinClaw: {
    A: { name: '狠戾', desc: '九陰煞勁陰毒入骨，破防威力劇增但損俠義更甚', hit: { need: 2, breakGuard: true, dmg: 1.4, xia: -4, log: '白骨爪陰毒無比直取要害，煞氣大盛！', fx: { word: '煞', color: '#771133', kind: 'needle' } } },
    B: { name: '收攝', desc: '道門玄功收束心魔，正氣催動不減俠義', hit: { need: 2, breakGuard: true, dmg: 1.15, xia: 0, log: '收束心魔，純以正道玄門真氣催動爪法！', fx: { word: '正', color: '#aa3355', kind: 'needle' } } },
  },
  yuxiaoSword: {
    A: { name: '音波', desc: '碧海潮生曲音擾亂更深', hit: { need: 2, disturb: 2.2, log: '簫聲如怒濤起伏，對手心煩意亂節奏崩潰！', fx: { word: '潮', color: '#339988', kind: 'ring' } } },
    B: { name: '清心', desc: '劍隨聲走聲助劍威，兼顧鋒芒傷害', hit: { need: 2, disturb: 1.0, dmg: 1.25, log: '劍隨聲走聲助劍威，鋒芒大盛！', fx: { word: '韻', color: '#55bbaa', kind: 'ring' } } },
  },
  rulai: {
    A: { name: '佛光', desc: '萬佛朝宗普度眾生，掌力磅礴暴退強敵', hit: { need: 2, qi: 28, dmg: 1.85, knock: 45, log: '萬佛朝宗金光萬丈，強烈掌風將對手震得倒飛！', fx: { word: '佛', color: '#ffe030', kind: 'dragon' } } },
    B: { name: '慈悲', desc: '如來法印降魔制敵，封制下盤消耗減半', hit: { need: 2, qi: 12, dmg: 1.35, trip: 2.0, knock: 10, log: '如來法印沉凝肅穆，只封不殺，制住對手下盤', fx: { word: '印', color: '#e6c820', kind: 'dragon' } } },
  },
  tantui: {
    A: { name: '連環', desc: '起霸連環十二腿，踢擊連出壓制對手', hit: { need: 2, first: true, flurry: 2, trip: 1.2, log: '起霸連環十二腿，踢得對手招架不及！', fx: { word: '連', color: '#d08030', kind: 'strike' } } },
    B: { name: '截下', desc: '低掃下盤掃堂斷根，下盤阻滯更劇', hit: { need: 2, first: true, trip: 2.2, log: '低掃下盤沉猛無比，直接斷敵立足！', fx: { word: '斷', color: '#b06020', kind: 'strike' } } },
  },
  tiexian: {
    A: { name: '硬橋', desc: '硬橋硬馬破開招架，拳力剛猛但微損自力', hit: { need: 2, breakParry: true, dmg: 1.45, selfHp: 2, log: '鐵環齊鳴硬攻硬打，強破防禦，拳鋒霸道！', fx: { word: '霸', color: '#909090', kind: 'heavy' } } },
    B: { name: '化勁', desc: '以柔制剛雙臂鐵環卸勁反震', hit: { need: 2, breakParry: true, dmg: 1.15, reflect: 0.25, log: '雙臂鐵環牽引來力，卸勁反逼！', fx: { word: '卸', color: '#b0b0b0', kind: 'heavy' } } },
  },
  bagua: {
    A: { name: '五郎', desc: '五郎陷陣悍勇衝殺，長兵逼退更遠', hit: { need: 2, qi: 8, knock: 28, dmg: 1.3, log: '五郎棍法悍勇衝陣，棍勢橫掃逼退強敵！', fx: { word: '陣', color: '#c07030', kind: 'staff' } } },
    B: { name: '八卦', desc: '陰陽周流虛實莫測，步法生生不息擾亂敵方', hit: { need: 2, qi: 2, knock: 10, disturb: 1.4, log: '八卦步法生生不息，棍頭虛實莫測擾亂敵方節奏', fx: { word: '卦', color: '#a06020', kind: 'staff' } } },
  },
};

/* 名次段內的順序就是名功榜。排前面的略高，排後面的略低，上下各一成。沒點名的走常見正中，不做這層微調。
   打狗棒法放一流段末，乾坤大挪移放名門段末：名聲在，傷害不是它們的本分。
   如來神掌排在絕頂段末，在降龍等三方一致名功之後。 */
export const FAN_BANDS = [
  ['絕頂', ['kuihua', 'bixie', 'xianglong', 'dugu', 'jiuyang', 'taiji', 'rulai']],
  ['一流', ['hama', 'xuantie', 'taijiSword', 'anran', 'yuxiaoSword', 'kongming', 'yunv', 'hanbingPalm', 'dagou']],
  ['名門', ['zixia', 'linjiZhuang', 'yunvSword', 'wudangJiuyang', 'qishangFist', 'huifengSword', 'jiuyinClaw', 'lanhuaHand', 'kuangfengSword', 'bagua', 'tiexian', 'huagongDafa', 'sanxianSword', 'luoyingPalm', 'sanyinClaw', 'shenxingStep', 'qiankun']],
  ['常見', ['tantui', 'hunyuanPalm', 'shenghuoXinfa', 'biboXinfa', 'huntianGong', 'emeiJiuyang', 'huashanSword', 'jindingPalm', 'tiangangFinger', 'rouyunSword', 'mianPalm', 'tianluoPalm', 'chousuiPalm', 'yingzhuaHand', 'lianhuaPalm', 'fengmoStaff', 'emeiSword', 'qingfuStep', 'yunlongXinfa', 'baihuaFist', 'yunlongSword', 'xiaoyaoStep', 'zhaixingStep', 'stepEight', 'wudangFist', 'wavePalm', 'whirlLeg', 'wuhuBlade', 'shaolinStaff', 'tuinaHand', 'stepFeather', 'snowStep']],
  ['入門', ['pishiFist', 'pushPalm', 'huashanXinfa', 'jianzongXinfa', 'wudangXinfa', 'basicFist', 'basicSword', 'sweepLeg', 'breath']],
];

export function fanRank(id) {
  for (const [tier, ids] of FAN_BANDS) {
    const i = ids.indexOf(id);
    if (i < 0) continue;
    const n = ids.length;
    const u = n <= 1 ? 0 : 1 - (2 * i) / (n - 1);
    return { fanTier: tier, fanR: TIER_R[tier] * (1 + 0.1 * u) };
  }
  return { fanTier: '常見', fanR: 1 };
}
/* 基準：取 ARTS 裡常見段各門最強一招每秒傷害的中位數（約 9.0），乘上舊規則常見武學化境實際倍率（1.61），結果約 14.5。
   由程式在載入時動態計算，不寫死常數。 */
export function computeFanBase() {
  const bests = [];
  for (const a of ARTS) {
    if (fanRank(a.id).fanTier !== '常見') continue;
    const ids = new Set(a.techs || []);
    if (a.tech) ids.add(a.tech);
    if (a.moves) for (const m of a.moves) ids.add(m);
    if (SPECIALS[a.id]) for (const sp of SPECIALS[a.id]) ids.add(sp.move);
    for (const m of MOVES) if (m.fx === a.id) ids.add(m.id);
    let best = 0;
    for (const id of ids) {
      const mv = MOVES.find((m) => m.id === id);
      if (!mv || !(mv.cd > 0) || !(mv.dmg > 0)) continue;
      const dps = mv.dmg / mv.cd;
      if (dps > best) best = dps;
    }
    if (best > 0) bests.push(best);
  }
  bests.sort((a, b) => a - b);
  const mid = Math.floor(bests.length / 2);
  const median = bests.length % 2 === 0 ? (bests[mid - 1] + bests[mid]) / 2 : bests[mid];
  const OLD_HUA_MUL = 1.61;
  return (median || 9.0) * OLD_HUA_MUL;
}
/* #408 第三輪：改用實測校準。tools/calib-fan.mjs 跑 bot 12 種子（1001–1012，第 30 日），
   讓「常見段」使用者 dps 中位數落在 base（codex/solo-sect-grok 08a0306f）的 ±20%。結果記在 docs/arts.md。
   computeFanBase()（全表中位數 × 1.61）只留作參考，不再採用。#417 N13：遊戲程式不讀環境變數；校準腳本 import 後呼叫 setFanBase 覆寫。 */
export const FAN_BASE_CALIB = 13;
export let FAN_BASE = FAN_BASE_CALIB;
export let CURVE_ANCHOR = FAN_BASE;
/* 只給 tools/calib-fan.mjs、tools/bot12.mjs --fan 掃描用：改基準並重蓋 list 裡每張卡的曲線。 */
export function setFanBase(v, list = []) {
  if (!(v > 0)) return FAN_BASE;
  FAN_BASE = v; CURVE_ANCHOR = v;
  for (const a of list) if (a?.fanR != null) a.curve = [0, 1, 2, 3, 4].map((t) => fanMul(a.fanR, t));
  return FAN_BASE;
}
/* mul(t) = 基準 × 共同形狀(t) × (1 + (R − 1) × f(t))。R 已含同段微調。 */
export function fanMul(R, t) {
  const i = Math.max(0, Math.min(4, t | 0));
  return FAN_BASE * CURVE_SHAPE[i] * (1 + (R - 1) * FAN_F[i]);
}
export function curveMulOf(curve, t) {
  const i = Math.max(0, Math.min(4, t | 0));
  const v = curve?.[i];
  return Number.isFinite(v) ? v : fanMul(1, i);
}
export function stampCard(a) {
  if (!a?.id) return a;
  const rank = fanRank(a.id);
  a.fanTier = rank.fanTier;
  a.fanR = rank.fanR;
  a.curve = [0, 1, 2, 3, 4].map((t) => fanMul(rank.fanR, t));
  const learn = { req: a.req || [], secret: !!a.secret };
  if (a.wuxingMin != null) learn.wuxingMin = a.wuxingMin;
  if (a.alt24) learn.alt24 = a.alt24;
  if (CEILING[a.id]) learn.ceiling = { arts: CEILING[a.id].slice() };
  a.learn = learn;
  a.growCap = GROW_CAP[a.grade] || 20;
  if (SPECIALS[a.id]) a.specials = SPECIALS[a.id].map((sp) => ({ tier: sp.tier, move: sp.move }));
  a.on = ON[a.id] ? JSON.parse(JSON.stringify(ON[a.id])) : null;
  return a;
}
