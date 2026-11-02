/* #403 武學卡。化境數字來自 docs/systems/arts-ranking.md，是本遊戲自己的錨點。
   五檔＝化境 × 0.40、0.58、0.74、0.88、1，四捨五入。沒點名的武學錨在 45，火候係數與舊的每階加成對齊。
   本檔不讀外部資料、不進口訣。 */

export const CURVE_SHAPE = [0.40, 0.58, 0.74, 0.88, 1];
export const CURVE_ANCHOR = 45;
/* 舊出手： (1 + 0.1×階) ，圓滿與化境再 ×1.15。錨點曲線除掉這段，名功只多曲線比。 */
const OLD = [1, 1.1, 1.2, 1.495, 1.61];
const REF = CURVE_SHAPE.map((s) => Math.round(CURVE_ANCHOR * s));
/* 造詣上限沿用品階表。出手不讀這張表，所以它不是第二條威力梯子。 */
const GROW_CAP = { 1: 20, 2: 35, 3: 55, 4: 75 };
/* 前置比例：練功不得超過這些武學裡最高的熟練。劇情直接給的熟練不在這裡砍。 */
const CEILING = {
  taijiSword: ['taiji'],
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

const HUA = {
  kuihua: 100, bixie: 100, xianglong: 98, dugu: 96, jiuyang: 96, taiji: 94, qiankun: 92, dagou: 92,
  hama: 86, xuantie: 84, taijiSword: 84, anran: 82, yuxiaoSword: 82, kongming: 80, yunv: 80, hanbingPalm: 78,
  zixia: 68, linjiZhuang: 66, yunvSword: 66, wudangJiuyang: 66, qishangFist: 64, huifengSword: 64, jiuyinClaw: 64, lanhuaHand: 62, kuangfengSword: 62, huagongDafa: 60, sanxianSword: 60, luoyingPalm: 58, sanyinClaw: 58, shenxingStep: 58,
  hunyuanPalm: 48, shenghuoXinfa: 48, biboXinfa: 48, huntianGong: 48, emeiJiuyang: 48, huashanSword: 46, jindingPalm: 46, tiangangFinger: 46, rouyunSword: 46, mianPalm: 46, tianluoPalm: 46, chousuiPalm: 46, yingzhuaHand: 46, lianhuaPalm: 46, fengmoStaff: 46, emeiSword: 44, qingfuStep: 44, yunlongXinfa: 44, baihuaFist: 44, yunlongSword: 44, xiaoyaoStep: 44, zhaixingStep: 44, stepEight: 44, wudangFist: 42, wavePalm: 42, whirlLeg: 42, wuhuBlade: 42, shaolinStaff: 42, tuinaHand: 42, stepFeather: 42, snowStep: 40,
  pishiFist: 28, pushPalm: 26, huashanXinfa: 26, jianzongXinfa: 26, wudangXinfa: 26, basicFist: 24, basicSword: 24, sweepLeg: 24, breath: 22,
};

export function curveOfPeak(peak) { return CURVE_SHAPE.map((s) => Math.round(peak * s)); }
export function curveMulOf(curve, t) {
  const i = Math.max(0, Math.min(4, t | 0));
  const ref = REF[i] || 1;
  return OLD[i] * ((curve?.[i] ?? ref) / ref);
}
export function stampCard(a) {
  if (!a?.id) return a;
  const peak = Object.prototype.hasOwnProperty.call(HUA, a.id) ? HUA[a.id] : CURVE_ANCHOR;
  a.curve = curveOfPeak(peak);
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
