/* loop164 v2.4＋v2.5 診斷（規格 tools/diag-v24-v25.mjs；solo-sect 無 tools/，放 harness）。逐局 JSON 行。
   用法：SS_DT=0.25 node test/harness/diag-v24-v25.mjs [strat=bot] [n=40] [start=1001] [days=30]
   strat：idle（不操作）／bot（每日試蓋寢舍、能收就收）／farm（bot＋升正殿／演武場／膳房、缺鐵木靈石時有閒錢就買）／exp（bot＋每日派前 4 人巡山，撤退線 50%）
   門派依種子輪替：峨眉、武當、桃花、古墓、星宿、無名（自創，不指定 sect24）。崩潰記 crash:1 不中斷。 */
import { run } from '../../test/harness/bot.mjs';
import { power, strikeLedger33 } from '../../src/jianghu.mjs';
import { startBuild, buildWhy, facDef, startExpedition, canExpedition } from '../../src/sim.mjs';
import { openExp } from '../../src/world.mjs';
import * as EC from '../../src/economy.mjs';
import * as A0 from '../../src/arts.mjs';
import { ARTS } from '../../src/data.mjs';
const A = { ...A0, ARTS_OWN24: ARTS.filter((a) => a.own24).map((a) => a.id) }; /* loop168 各派專屬武學習得人數 */
import { SECTS } from '../../src/data.mjs';
import { XIA } from '../../src/wuxia.mjs';
const XIAN = new Set(Object.values(XIA).map((x) => x.name)); /* loop181 名俠名單（割草 MVP 是否名俠） */
export const SECTS24 = process.env.SS_SECTS ? process.env.SS_SECTS.split(',').map((x) => (x === 'wuming' ? null : x)) : ['emei', 'wudang', 'taohua', 'gumu', 'xingxiu', null]; /* loop172 SS_SECTS 可覆寫輪替 */
const ST = process.argv[2] || 'bot', N = +(process.argv[3] || 40), S0 = +(process.argv[4] || 1001), D = +(process.argv[5] || 30);
const avg = (a, f) => (a.length ? a.reduce((x, d) => x + f(d), 0) / a.length : 0);
/* loop206：只讀。出手、減傷、內力上限分開記，不寫回狀態。 */
const ledOf = (s) => { const L = strikeLedger33(s); return { dps: +L.dps.toFixed(2), mit: +L.mit.toFixed(3), qi: +L.qi.toFixed(1) }; };
/* loop205：只量測。鉤子不寫存檔。每局開始把計數清掉。 */
const box = { trainHi: { n: 0, da: 0 }, trainLo: { n: 0, calm: 0 }, feedLian: 0, feedBase: 0, daoTrain: 0, daoWho: new Set(), by: {} };
const resetBox = () => { box.trainHi.n = box.trainHi.da = box.trainLo.n = box.trainLo.calm = box.feedLian = box.feedBase = box.daoTrain = 0; box.daoWho = new Set(); box.by = {}; };
const bump = (sect, key) => { const b = (box.by[sect] ??= { hiN: 0, hiDa: 0, hiPostN: 0, hiPostDa: 0, loN: 0, loCalm: 0, loPostN: 0, loPostCalm: 0 }); b[key]++; }; /* loop210：A≤−2 坐不住之後另計，不進模擬 */
A0.meter32.note = (ev) => {
  if (ev.kind === 'feed') { if (ev.mode === 'lian') box.feedLian += ev.xp; else if (ev.mode === 'base') box.feedBase += ev.xp; return; }
  if (ev.kind !== 'train') return;
  if (ev.dao) { box.daoTrain++; box.daoWho.add(ev.id); }
  const sect = ev.sect || 'wuming';
  if (ev.A >= 2) { box.trainHi.n++; bump(sect, 'hiN'); if (ev.k === 'da') { box.trainHi.da++; bump(sect, 'hiDa'); } if (ev.post) { bump(sect, 'hiPostN'); if (ev.k === 'da') bump(sect, 'hiPostDa'); } }
  else if (ev.A <= -2) { box.trainLo.n++; bump(sect, 'loN'); if (ev.k === 'base' || ev.k === 'lian') { box.trainLo.calm++; bump(sect, 'loCalm'); } if (ev.post) { bump(sect, 'loPostN'); if (ev.k === 'base' || ev.k === 'lian') bump(sect, 'loPostCalm'); } } /* 內功在 trainKind31 視同練法，loPostCalm 含內功 */
};
const UP = ['hall', 'yard', 'kitchen'];
const spare = (s, cost) => s.res.coin - cost >= EC.wageBill(s) + EC.facBill(s);
function farm(s, c) {
  for (const id of UP) { if (!s.fac[id]) continue; let w = buildWhy(s, id);
    for (const item of ['tiemu', 'lingshi']) if (w && w.startsWith(item === 'tiemu' ? '鐵木不足' : '靈石不足') && !EC.marketWhy(s, item) && spare(s, EC.priceOf(s, item))) { const r = EC.marketDo(s, item); if (r.ok) c[item === 'tiemu' ? 'buyT' : 'buyL']++; w = buildWhy(s, id); }
    if (!w && !Object.values(s.fac).some((v) => v.site) && spare(s, facDef(id).stages[s.fac[id].stage + 1]?.cost?.coin || 0)) startBuild(s, id); } }
function exp(s, c) { if (s.exp) return; const ids = s.ds.filter((d) => d.role !== 'laborer' && !d.away && d.hp > 70 && d.adult !== false).slice(0, 4).map((d) => d.id);
  if (ids.length < 2 || !canExpedition(openExp(s), ids).ok) return; if (startExpedition(s, ids, { thr: 0.5 }).ok) c.exp++; }
/* 本門純度：正式弟子身上武學（不含基礎拳）屬本門樹的比例；跨派：身上有「他派樹內的名門武學」的件數（觸類旁通／偷師所得） */
function purity(s, ds) { const tree = s.sect?.tree || [], other = new Set(Object.entries(SECTS).filter(([k]) => k !== s.sect?.id).flatMap(([, S]) => [...S.tree, ...(S.tree24 || [])]));
  let own = 0, all = 0, cross = 0, outside = 0; for (const d of ds) for (const id of Object.keys(d.arts || {})) { if (id === 'basicFist') continue; all++; if (tree.includes(id)) own++; else if (A.artById(id)?.classic && !A.artById(id)?.signature) outside++; else if (other.has(id) && A.artById(id)?.classic) cross++; }
  return { ownPct: +(100 * own / (all || 1)).toFixed(1), pureNonOut: +(100 * (1 - outside / (all || 1))).toFixed(1), cross, lsGot: (s.res.lingshi || 0) }; }
for (let k = 0; k < N; k++) {
  resetBox();
  const LG = { last: null, opp: {}, steal: {} }, NM = Object.fromEntries(Object.entries(SECTS).map(([k2, S]) => [S.name, k2])); /* loop171 會武對手／偷師來源（解析事件流，舊版程式也能量） */
  const scan = (s) => { const L = s.log || []; for (const e of L) { if (e === LG.last) break; const m = String(e.msg || ''); let r;
    if ((r = m.match(/^【抉擇】【(名門會武|天下論劍)】(.+?)代表團上門/))) LG.opp[NM[r[2]] || r[2]] = (LG.opp[NM[r[2]] || r[2]] || 0) + 1;
    if ((r = m.match(/^【臨陣偷師】.+?在場邊看出(.+?)招式精要/))) LG.steal[NM[r[1]] || r[1]] = (LG.steal[NM[r[1]] || r[1]] || 0) + 1; } LG.last = L[0] || null; };
  const seed = S0 + k, sect = SECTS24[((seed - 1001) % SECTS24.length + SECTS24.length) % SECTS24.length], c = { n: 0, hungry: 0, buyT: 0, buyL: 0, exp: 0, harm: 0 }; let i = 0, day = 0, s = null, crash = 0, err = null;
  try {
    s = run(seed, { v22: true, ...(sect ? { sect24: sect } : {}) }, D, ST !== 'idle', (s) => {
      if (s.alert) s.alert = null; scan(s);
      if (s.day !== day) { day = s.day; if (c.pow10 == null && day >= 10) { c.pow10 = +power(s).toFixed(1); c.led10 = ledOf(s); } if (day === 28) { c.pow28 = +power(s).toFixed(1); c.led28 = ledOf(s); } if (day === 29) { c.pow29 = +power(s).toFixed(1); c.led29 = ledOf(s); } if (day === 30) { c.pow30 = +power(s).toFixed(1); c.led30 = ledOf(s); } if (ST === 'farm') farm(s, c); if (ST === 'exp') exp(s, c); } /* loop200：第 10 日記前期戰力；loop205 再記 28–30 日；loop206 同日記出手 */
      if (++i % 40) return; for (const d of s.ds) { if (d.role === 'laborer' || d.away) continue; c.n++; if ((d.needs?.hunger ?? 100) < 30) c.hungry++; if (A.harmonyOf?.(d)) c.harm++; } });
  } catch (e) { crash = 1; err = String(e?.stack || e).split('\n').slice(0, 2).join(' | '); }
  if (crash) { console.log(JSON.stringify({ strat: ST, seed, sect: sect || 'wuming', crash, err })); continue; }
  const ds = s.ds.filter((d) => d.role !== 'laborer'), X = s.threat || {}, V = s.v24n || {}, tiers = Object.entries(s.fac).filter(([id]) => !facDef(id)?.v16);
  const bestM = (d) => Math.max(0, ...Object.keys(A.CATS).map((q) => A.mastery(d, q))), N24 = ['basicSword', 'huashanSword', 'sanxianSword', 'wuhuBlade', 'shaolinStaff', 'tuinaHand', 'stepFeather', 'stepEight'];
  const le = s.lastExp || {};
  console.log(JSON.stringify({ strat: ST, seed, sect: s.sect?.id, crash: 0, n: ds.length, coin: s.res.coin, mood: +avg(ds, (d) => d.mood).toFixed(1), hungryPct: +(100 * c.hungry / (c.n || 1)).toFixed(2),
    fought: X.fought || 0, won: X.won || 0, pow: +power(s).toFixed(1), pow10: c.pow10 ?? null, pow28: c.pow28 ?? null, pow29: c.pow29 ?? null, pow30: c.pow30 ?? null, qiAvg: +avg(ds, (d) => A.qiMax(d)).toFixed(1), qiPeak: +Math.max(0, ...ds.map((d) => A.qiMax(d))).toFixed(1), mast: +Math.max(0, ...ds.map(bestM)).toFixed(1), /* loop200 內力與前期戰力；loop205 記 28–30 日 */
    lib: s.fac.library?.stage || 0, t3: tiers.filter(([, f]) => f.stage >= 3).length, buyT: c.buyT, buyL: c.buyL, lingshi: s.res.lingshi || 0, lsFirst: Object.keys(s.records?.lsFirst || {}).length,
    produce: V.produce || 0, stewLib: V.stewLib || 0, chart: V.chart || 0, affix: V.affix || 0, fengxue: V.fengxue || 0, formation: V.formation || 0, harmPct: +(100 * c.harm / (c.n || 1)).toFixed(1),
    bisai: V.bisai || 0, huiwu: V.huiwu || 0, huiwuWin: V.huiwuWin || 0, lineup: V.lineup || [0, 0, 0], steal: V.steal || 0, derive: V.derive || 0, trophies: (s.sect?.trophies || []).length,
    ...purity(s, ds), new24: ds.reduce((a, d) => a + N24.filter((id) => d.arts?.[id]).length, 0), exp: c.exp, expDist: le.dist || 0, expN: s.expN || 0, own24: Object.fromEntries(A.ARTS_OWN24.map((id) => [id, ds.filter((d) => d.arts?.[id]).length]).filter(([, n]) => n)), med24: ds[0]?.medK24 || 1, psn24: s.psnK24 || 1,
    oppBy: LG.opp, stealBy: LG.steal, syn2: ds.filter((d) => A.sectClasses24?.(d) === 2).length, pmD: ds.filter((d) => A.polymath24?.(d) === 1).length, pmC: ds.filter((d) => A.polymath24?.(d) === 2).length, /* loop204：syn3 每局都很多，報表不再列 */
    v27: s.v27n ? { siege: Object.fromEntries(Object.entries(s.v27n.siege || {}).map(([k, v]) => [k, { n: v.n, win: v.win, won: v.won, total: v.total, mvp: v.mvp, mk: v.mvpKills }])), crusade: s.v27n.crusade || [] } : null, /* loop178 v2.7 */
    v28: (() => { const W = s.v28n || {}, dr = [0, 0, 0, 0, 0]; const da = [0, 0, 0, 0, 0]; if (A.innerDrive28) for (const d of ds) { const a = A.mainOuterArt(d); if (a) dr[A.innerDrive28(d, a).tier]++; for (const id of Object.keys(d.arts || {})) { const b = A.artById(id); if (b && b.school !== 'inner' && A.artTier(d, id) >= 1) da[A.innerDrive28(d, b).tier]++; } } /* loop181 v2.8 */
      const mv = [...Object.values(s.v27n?.siege || {}).map((v) => v.mvp), ...(s.v27n?.crusade || []).map((c) => c.mvp)].filter(Boolean);
      return { drive: A.innerDrive28 ? dr.slice(1) : null, driveAll: A.innerDrive28 ? da.slice(1) : null, inj: W.inj || 0, root: A.rootFoundation28 ? [0, 1, 2, 3, 4].map((t) => ds.filter((d) => A.rootFoundation28(d) === t).length) : null, base: ds.filter((d) => d.base28).length, cure: W.cure || 0, injNow: ds.filter((d) => (d.qiInjury || 0) >= 20).length, stealTry: W.stealTry ?? null, stealZero: W.stealZero ?? null, fac: s.sect?.fac ? 1 : 0, facAuto: W.facAuto || 0, mvpN: mv.length, mvpFam: mv.filter((n) => XIAN.has(n)).length }; })(),
    v29: s.v29n || null, rootBy: A.rootFoundation28 ? ds.filter((d) => A.rootFoundation28(d) >= 2).length : 0, /* loop187 v2.9 */
    v32: (() => { const q = { base: [], lian: [], da: [] }; let daoNow = 0; for (const d of ds) { if (A.dao31?.(d)) daoNow++; for (const id of Object.keys(d.arts || {})) { const a = A.artById(id); if (a?.mode && q[a.mode]) q[a.mode].push(A.qiStrikeMul(d, a)); } } const mean = (xs) => (xs.length ? +(xs.reduce((x, y) => x + y, 0) / xs.length).toFixed(3) : null); return { feedLian: +box.feedLian.toFixed(1), feedBase: +box.feedBase.toFixed(1), daoTrain: box.daoTrain, daoWho: box.daoWho.size, daoNow, trainHi: { ...box.trainHi }, trainLo: { ...box.trainLo }, trainBy: box.by, qiMul: { base: mean(q.base), lian: mean(q.lian), da: mean(q.da) }, qiN: { base: q.base.length, lian: q.lian.length, da: q.da.length } }; })(), /* loop205 只量測；loop208 分派與坐不住之後另計，不是門檻 */
    v33: { ...ledOf(s), d10: c.led10 ?? null, d28: c.led28 ?? null, d29: c.led29 ?? null, d30: c.led30 ?? null }, /* loop206：出手與減傷、內力上限並陳，pow 欄仍是 power() */
    chief: (() => { const o = { rank: 0, other: 0, n: 0 }; for (const d of ds) for (const id of Object.keys(d.arts || {})) { const a = A.artById(id); if (!a?.chiefOnly24 || !d.stree?.includes(id)) continue; o.n++; if (d.id === 'hero' || d.role === 'head' || d.chief24) o.rank++; else o.other++; } o.champs = ds.filter((d) => d.chief24).length; return o; })() }));
}
