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
const CEILING = {
  taijiSword: ['taiji'],
  taijiClaw: ['taiji'],
  xuanxuBlade: ['taiji'],
  qiankun: ['shenghuoXinfa', 'jiuyang'],
};
/* 大成、圓滿、化境各一招。太極劍、七傷拳資料裡只有兩招。
   獨孤九劍標了 forms，這張表只記觀破該落在哪一檔，unlockTechs 不發招。
   總訣仍由第四晚傳授，不在表上。破劍等式約大成，破氣約圓滿，狂風卷地約化境。 */
const SPECIALS = {
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
  xianglong: { hit: { need: 2, qi: 16, dmg: 1.4, knock: 22, log: '使出降龍，掌力震得對手退了一步，真氣瀉出一大截' } },
  dugu: {
    hit: { need: 0, seen: true, dmg: 1.2, log: '獨孤劍意看破破綻，劍勢直取，自己不收勢格擋' },
    dodge: { need: 0, seen: true, see: true, noParry: true, log: '獨孤劍意料中來勢，側身讓過，這一招自己不擋' },
  },
  bixie: { hit: { need: 2, qi: 6, first: true, flurry: 2, log: '快劍先至，連刺數劍' } },
  taijiSword: { gethit: { need: 2, reflect: 0.45, log: '太極劍走圓轉，把來力反震了回去' } },
  qishangFist: { hit: { need: 2, selfHp: 6, dmg: 1.2, log: '七傷拳打實，自己的內腑也震了一下' } },
  dagou: { hit: { need: 2, qi: 4, trip: 1.2, log: '打狗棒一纏一絆，對手腳下亂了' } },
  /* #410 第二批。心情不在這裡乘：黯然的輕重已經在 jhMul。乾坤的反震取代舊的 d.reflect，不要兩條一起算。 */
  xuantie: { hit: { need: 2, breakParry: true, dmg: 1.25, log: '重劍壓下，對手的招架被破開' } },
  anran: { hit: { need: 2, mood: true, log: '心緒越沉，這一掌越重' } },
  hama: { hit: { need: 2, charge: true, hpBelow: 50, qiKeep: 0.5, qi: 10, dmg: 1.5, log: '氣血見底，蓄起的掌力反擊出去' } },
  qiankun: { gethit: { need: 0, reflect: 0.3, shift: 0.25, log: '乾坤一挪，來力從身旁過去，餘勢反震回去' } },
  jiuyinClaw: { hit: { need: 2, breakGuard: true, dmg: 1.2, xia: -2, log: '爪勁透進護體，這一爪傷了自己的俠義' } },
  yuxiaoSword: { hit: { need: 2, disturb: 1.2, log: '簫聲一繞，對手的節奏亂了' } },
  /* #411 豬籠城寨系列。依電影勝負：如來壓軸絕頂、譚腿先發踢亂、鐵線破招架、八卦逼退。 */
  rulai: { hit: { need: 2, qi: 20, dmg: 1.6, knock: 30, log: '萬佛朝宗自天而降，掌力雄渾震退對手' } },
  tantui: { hit: { need: 2, first: true, trip: 1.3, log: '十二路譚腿先發制人，腿風掃亂對手下盤' } },
  tiexian: { hit: { need: 2, breakParry: true, dmg: 1.25, log: '鐵線拳雙臂硬開硬進，破開招架' } },
  bagua: { hit: { need: 2, qi: 4, knock: 16, log: '八卦棍長兵點刺，將對手逼退一段' } },
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
export const FAN_BASE = computeFanBase();
export const CURVE_ANCHOR = FAN_BASE;
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
