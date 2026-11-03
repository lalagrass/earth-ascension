/* #403 武學卡。#408 起，招式傷害只留形狀，強度走扇形曲線。
   曲線數字是本遊戲自己的。本檔不讀外部資料、不進口訣。 */

export const CURVE_SHAPE = [0.40, 0.58, 0.74, 0.88, 1];
/* 基準：常見段正中、化境時最強一招的每秒傷害。沿用原來的常見錨點，正規化之後它就是強度本身。 */
export const CURVE_ANCHOR = 45;
export const FAN_BASE = CURVE_ANCHOR;
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
/* 大成、圓滿、化境各一招。太極劍、七傷拳資料裡只有兩招。獨孤九劍標了 forms，招式仍走觀破，這裡只記火候。 */
const SPECIALS = {
  xianglong: [{ tier: 2, move: 'jianlong' }, { tier: 3, move: 'feilong' }, { tier: 4, move: 'kanglong' }],
  bixie: [{ tier: 2, move: 'bx1' }, { tier: 3, move: 'bx2' }, { tier: 4, move: 'bx3' }],
  taijiSword: [{ tier: 2, move: 'tjs1' }, { tier: 3, move: 'tjs2' }],
  qishangFist: [{ tier: 2, move: 'qs1' }, { tier: 3, move: 'qs2' }],
  dagou: [{ tier: 2, move: 'banzi' }, { tier: 3, move: 'chuozi' }, { tier: 4, move: 'wugou' }],
  dugu: [{ tier: 2, move: 'dg0' }, { tier: 3, move: 'dg1' }, { tier: 4, move: 'dg8' }],
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
};
/* 名次段內的順序就是名功榜。排前面的略高，排後面的略低，上下各一成。沒點名的走常見正中，不做這層微調。
   打狗棒法放一流段末，乾坤大挪移放名門段末：名聲在，傷害不是它們的本分。 */
const FAN_BANDS = [
  ['絕頂', ['kuihua', 'bixie', 'xianglong', 'dugu', 'jiuyang', 'taiji']],
  ['一流', ['hama', 'xuantie', 'taijiSword', 'anran', 'yuxiaoSword', 'kongming', 'yunv', 'hanbingPalm', 'dagou']],
  ['名門', ['zixia', 'linjiZhuang', 'yunvSword', 'wudangJiuyang', 'qishangFist', 'huifengSword', 'jiuyinClaw', 'lanhuaHand', 'kuangfengSword', 'huagongDafa', 'sanxianSword', 'luoyingPalm', 'sanyinClaw', 'shenxingStep', 'qiankun']],
  ['常見', ['hunyuanPalm', 'shenghuoXinfa', 'biboXinfa', 'huntianGong', 'emeiJiuyang', 'huashanSword', 'jindingPalm', 'tiangangFinger', 'rouyunSword', 'mianPalm', 'tianluoPalm', 'chousuiPalm', 'yingzhuaHand', 'lianhuaPalm', 'fengmoStaff', 'emeiSword', 'qingfuStep', 'yunlongXinfa', 'baihuaFist', 'yunlongSword', 'xiaoyaoStep', 'zhaixingStep', 'stepEight', 'wudangFist', 'wavePalm', 'whirlLeg', 'wuhuBlade', 'shaolinStaff', 'tuinaHand', 'stepFeather', 'snowStep']],
  ['入門', ['pishiFist', 'pushPalm', 'huashanXinfa', 'jianzongXinfa', 'wudangXinfa', 'basicFist', 'basicSword', 'sweepLeg', 'breath']],
];

function fanRank(id) {
  for (const [tier, ids] of FAN_BANDS) {
    const i = ids.indexOf(id);
    if (i < 0) continue;
    const n = ids.length;
    const u = n <= 1 ? 0 : 1 - (2 * i) / (n - 1);
    return { fanTier: tier, fanR: TIER_R[tier] * (1 + 0.1 * u) };
  }
  return { fanTier: '常見', fanR: 1 };
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
