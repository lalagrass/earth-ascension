/* loop78 成長分層（開關 s.grow）：成長門類 metadata、造詣單一結算入口、同類學習加速。
   造詣不另存門類值：造詣＝Σ 各武學紀錄 r.gm 的有界貢獻 × 門類權重（衍生值，不會與 skills.palm 漂移）。
   skills.palm／leg 是戰鬥能力值（劍招也吃 skills.palm），與造詣用途不同，不互相轉換。 */
import { ARTS } from './data.mjs';
/* 成長門類：sup = 'full' 已驗證造詣＋加速；'part' 只累積與顯示；'none' 尚未支援（不累積） */
export const CATS = {
  quanzhang: { name: '拳掌', sup: 'full' }, tuifa: { name: '腿法', sup: 'full' }, jianfa: { name: '劍法', sup: 'full' },
  neigong: { name: '內功', sup: 'part' }, shenfa: { name: '身法', sup: 'part' },
  gunbang: { name: '棍棒', sup: 'none' }, qimen: { name: '奇門', sup: 'none' }, zaxue: { name: '雜學', sup: 'none' },
  yishu: { name: '醫術', sup: 'none' }, dushu: { name: '毒術', sup: 'none' }, zhenfa: { name: '陣法', sup: 'none' },
};
export const CAT_ORDER = ['quanzhang', 'tuifa', 'jianfa', 'neigong', 'shenfa', 'gunbang', 'qimen', 'zaxue', 'yishu', 'dushu', 'zhenfa'];
/* 每門武學 → 成長門類權重（與戰鬥 school 分開；school=palm 的劍法、內功在此各歸其類） */
export const ART_CAT = {
  basicFist: { quanzhang: 1 }, pushPalm: { quanzhang: 1 }, wavePalm: { quanzhang: 1 }, fengLei: { quanzhang: 0.5, tuifa: 0.5 },
  sweepLeg: { tuifa: 1 }, whirlLeg: { tuifa: 1 }, tantui: { tuifa: 1 },
  breath: { neigong: 1 }, snowStep: { shenfa: 1 },
  rulai: { quanzhang: 1 }, xianglong: { quanzhang: 1 }, anran: { quanzhang: 1 }, kongming: { quanzhang: 1 }, taiji: { quanzhang: 1 }, tiexian: { quanzhang: 1 }, huagu: { quanzhang: 1 },
  bixie: { jianfa: 1 }, dugu: { jianfa: 1 }, xuantie: { jianfa: 1 },
  zixia: { neigong: 1 }, yunv: { neigong: 1 }, jiuyang: { neigong: 1 }, qiankun: { neigong: 1 }, hama: { neigong: 1 }, shihou: { neigong: 1 },
  dagou: { gunbang: 1 }, bagua: { gunbang: 1 }, kuihua: { qimen: 1 }, zuoyou: { zaxue: 1 },
};
export const GROW = {
  k: 0.05, /* 每單位原始修練投入 → 造詣 */
  src: { train: 1, fight: 0.3 }, /* 投入型來源權重 */
  pass: 0.6, /* 傳功（每對每門一次的鍵）固定造詣 */
  ms: [[1, 1], [2, 2], [4, 3]], /* 里程碑 [bit, 造詣]：自然練到小成、打坐破大成、打坐破化境 */
  cap: { 1: 20, 2: 35, 3: 55, 4: 75 }, /* 每門武學最多提供的造詣（依品階） */
  acc: { amp: 0.8, ref: 40, fade: 55, grade: { 1: 1, 2: 0.5 }, max: 1.8 },
  init: 0.15, /* 開局既有熟練 → 造詣（一次，標 init） */
};
export const LEVELS = [[0, '未窺門徑'], [5, '初窺門徑'], [20, '略有小成'], [40, '融會貫通'], [60, '爐火純青'], [80, '登峰造極']];
export const levelOf = (v) => LEVELS.reduce((m, [t, n]) => (v >= t ? n : m), LEVELS[0][1]);
const artBy = (id) => ARTS.find((a) => a.id === id);
const cats = (id) => Object.entries(ART_CAT[id] || {}).filter(([c]) => CATS[c].sup !== 'none');
export const primaryCat = (id) => Object.entries(ART_CAT[id] || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
const contrib = (id, r) => (r?.gm ? Math.min(GROW.cap[artBy(id).grade] || 20, r.gm.e) : 0);
/* 門類造詣（衍生）；skip＝排除某門武學自己的貢獻 */
export function mastery(d, cat, skip = null) {
  let v = 0; for (const [id, r] of Object.entries(d.arts || {})) { if (id === skip) continue; const w = ART_CAT[id]?.[cat]; if (w && CATS[cat].sup !== 'none') v += contrib(id, r) * w; }
  return Math.min(100, v);
}
/* 同類學習加速：用結算前的「他門」同類造詣；凡／良品、熟練未到 fade 才有 */
export function accelOf(d, a, xp) {
  const c = primaryCat(a.id), g = GROW.acc.grade[a.grade] || 0; if (!c || CATS[c].sup !== 'full' || !g) return { mul: 1, cat: c, base: 0 };
  const base = mastery(d, c, a.id), f = Math.max(0, 1 - xp / GROW.acc.fade);
  return { mul: Math.min(GROW.acc.max, 1 + GROW.acc.amp * Math.min(1, base / GROW.acc.ref) * g * f), cat: c, base };
}
/* 單一結算入口：所有造詣變動只經此處。ctx = { src:'train'|'fight'|'pass'|'break', raw, xp0, xp1, stage }
   回傳本次造詣增量 { [cat]: Δ }。練滿／卡瓶頸（xp 沒動）不給投入型造詣；里程碑以 bit 記，只領一次。 */
export function settleGrowth(d, a, r, ctx) {
  if (!cats(a.id).length) return {};
  r.gm ??= { e: 0, ms: 0 }; const cap = GROW.cap[a.grade] || 20, before = Object.fromEntries(cats(a.id).map(([c]) => [c, mastery(d, c)]));
  let add = 0;
  if (ctx.src === 'train' || ctx.src === 'fight') { if ((ctx.xp1 ?? 0) > (ctx.xp0 ?? 0) + 1e-9 && ctx.raw > 0) add += ctx.raw * GROW.k * GROW.src[ctx.src]; if ((ctx.xp0 ?? 0) < 25 && (ctx.xp1 ?? 0) >= 25 && !(r.gm.ms & 1)) { r.gm.ms |= 1; add += GROW.ms[0][1]; } }
  else if (ctx.src === 'pass') add += GROW.pass;
  else if (ctx.src === 'break') { const [bit, v] = GROW.ms[ctx.stage] || []; if (bit && !(r.gm.ms & bit)) { r.gm.ms |= bit; add += v; } }
  r.gm.e = Math.min(cap, r.gm.e + add);
  const out = {}; for (const [c] of cats(a.id)) { const dv = mastery(d, c) - before[c]; if (dv > 0) out[c] = dv; }
  return out;
}
/* 開局一次：既有熟練折算造詣（標 init，不是新修練成果；已有 gm 的不動 → 重複呼叫冪等） */
/* 每人一次（開局或入門後第一次結算前）：入門時已有的武學折算；d.gInit 標記後不再折算 */
export function growEnsure(d) {
  if (d.gInit) return d; d.gInit = true;
  for (const [id, r] of Object.entries(d.arts || {})) { const a = artBy(id); if (!a || r.gm || !cats(id).length) continue; r.gm = { e: Math.min(GROW.cap[a.grade] || 20, r.xp * GROW.init), ms: r.xp >= 25 ? 1 : 0, init: true }; }
  return d;
}
export function growInit(s) { for (const d of s.ds || []) growEnsure(d); return s; }
