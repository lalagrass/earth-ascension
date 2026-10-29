// v2.1 長跑：沿用 v1.78 無目標機器人。快照多記療傷丹的產出、治傷、賣出、陳化。
// 用法：node artifacts/v210/longrun60.mjs [days=60] [seeds] [opens]；OUT=檔名
import { POP } from '../../src/world.mjs';
import fs from 'node:fs';
import { buildWhy, buyLot, lotCost, lotsOf, lotsUsed } from '../../src/sim.mjs';
import { T as thOf } from '../../src/threat.mjs';
import { suggestTeam } from '../../src/expedition.mjs';
import { createState, tick, startBuild, canRecruit, recruit, startExpedition, foodLow, startSchoolTrip } from '../../src/sim.mjs';
import { schoolWhy, marketWhy, marketDo, E as econOf, wageBill, facBill } from '../../src/economy.mjs';
import { DAY, FACILITIES, ENDLESS } from '../../src/data.mjs';
import { canExpedition, ROUTE_END } from '../../src/expedition.mjs';
import { invariants } from '../../src/lifecycle.mjs';
const [days = 60, seedArg = '3,7,11,17,23', openArg = 'plain,guojing,weixiaobao,linghuchong,yuebuqun,zhangwuji,axing'] = process.argv.slice(2);
const seeds = String(seedArg).split(',').map(Number), opens = String(openArg).split(','), D = +days; const out = [];
// v1.9 機器人：花錢的藍圖要留下一次月俸＋維護（玩家常識）；只套在 v1.9 新增、要稀有料的三四階
const reserveOk = (s, f) => { const nx = f.stages[(s.fac[f.id]?.stage ?? 0) + 1]; return !nx?.rare || s.res.coin - (nx.cost.coin || 0) >= wageBill(s) + facBill(s); }; // 只管 v1.9 新的三四階
const depth = (b) => (b > ROUTE_END ? Math.floor((b - ROUTE_END) / ENDLESS.len) + 1 : 0);
const ECO_LOW = 0.3, ECO_REC = 0.6; // v1.95：≤30% 基本上限算「壓低」，之後 ≥60% 算回升
for (const seed of seeds) for (const op of opens) {
  const s = createState(seed, op === 'plain' ? null : { kind: 'template', id: op, askMajor: false });
  const r = { seed, opening: op, ok: true, snaps: [], foodLowTicks: 0, raids: 0, hurt: 0, deaths: 0, expStarts: 0 }; const seen = new Set(); let ids = new Set(s.ds.map((d) => d.id));
  const snap = () => r.snaps.push({ day: Math.round(s.t / DAY), threat: (({ pending, rng, hist, ...o }) => o)(thOf(s)), lots: { ...lotsOf(s), used: lotsUsed(s) }, econ: { misses: econOf(s).misses, left: econOf(s).left, paid: econOf(s).paid, disrepair: econOf(s).disrepair, schoolN: econOf(s).schoolN, wage: wageBill(s), fac: facBill(s) }, coin: s.res.coin, food: s.res.food, pill: s.res.pill || 0, pills: { ...(s.pills || { made: 0, used: 0, sold: 0, aged: 0 }) }, stages: Object.fromEntries(FACILITIES.map((f) => [f.id, s.fac[f.id]?.stage || 0])),
    built: FACILITIES.reduce((a, f) => a + (s.fac[f.id]?.stage || 0), 0), pop: Object.fromEntries(Object.entries(s.pop || {}).map(([k, v]) => [k, v.n])), eco: Object.fromEntries(Object.entries(s.eco || {}).map(([k, v]) => [k, v.n])),
    raids: r.raids, hurt: Math.round(r.hurt), deaths: r.deaths, best: s.records?.sect || 0, endless: depth(s.records?.sect || 0), ds: s.ds.filter((d) => d.role !== 'laborer').length, couples: s.gen?.couples?.length || 0, pass: Object.keys(s.passed || {}).length, rep: s.rep || 0 });
  try {
    for (let i = 0; s.t < D * DAY; i++) {
      const hp0 = new Map(s.ds.map((d) => [d.id, d.hp])); const d0 = Math.floor(s.t / DAY); tick(s);
      r.ticks = i + 1; if (foodLow(s)) r.foodLowTicks++;
      for (const m of s.mons) if (m.raid && !seen.has(m.uid)) { seen.add(m.uid); r.raids++; }
      for (const d of s.ds) { const h = hp0.get(d.id); if (h != null && d.hp < h && !s.exp?.team?.includes?.(d.id)) r.hurt += h - d.hp; }
      const now = new Set(s.ds.map((d) => d.id)); for (const id of ids) if (!now.has(id)) r.deaths++; ids = now; // 離開（死亡／離門）
      if (i % 40 === 0) {
        if (!FACILITIES.some((f) => s.fac[f.id]?.site) && FACILITIES.some((f) => /沒有空地/.test(buildWhy(s, f.id) || '')) && s.res.coin > lotCost(s) + wageBill(s) + facBill(s)) buyLot(s); // v1.9 擴地
        if (!FACILITIES.some((f) => s.fac[f.id]?.site)) for (const f of FACILITIES) if (reserveOk(s, f) && startBuild(s, f.id)) break;
        if (canRecruit(s).ok) recruit(s);
        { const E = (r.eco ??= {}); for (const [k, P] of Object.entries(POP)) { const e = s.pop?.[k]; if (!e) continue; const x = e.n / P.max, R = (E[k] ??= { lo: 1, tLo: null, tRec: null, razed: 0 }); R.lo = Math.min(R.lo, x); R.razed = e.razed || 0; if (x <= ECO_LOW && R.tLo == null) R.tLo = +(s.t / DAY).toFixed(2); if (R.tLo != null && R.tRec == null && x >= ECO_REC) R.tRec = +(s.t / DAY).toFixed(2); } } // v1.95 生態
        { const why = canRecruit(s).why || ''; if (/暫無人選/.test(why) && !schoolWhy(s)) startSchoolTrip(s); } // v1.85 A10
        if ((s.res.pill || 0) > 6 && !marketWhy(s, 'pill')) marketDo(s, 'pill');
        if ((s.res.herb || 0) < 5 && s.res.coin > 300 && !marketWhy(s, 'herb')) marketDo(s, 'herb');
        if (s.res.coin > 500 && !marketWhy(s, 'weapon')) marketDo(s, 'weapon');
        const team = process.env.A9 ? suggestTeam(s, 2).ids : s.ds.filter((d) => d.role !== 'laborer' && d.adult && d.hp > 70).slice(0, 2).map((d) => d.id); // 預設照 v1.85 機器人；A9=1 改用 v1.9 因才派巡（對照組）
        if (!s.exp && team.length && canExpedition(s, team).ok && s.t % (3 * DAY) < 10) { startExpedition(s, team, { target: 'inf' }); r.expStarts++; (r.styles ??= []).push(s.exp?.style); (r.teams ??= []).push(team.join('+')); }
      }
      if (Math.floor(s.t / DAY) !== d0 && Math.floor(s.t / DAY) % 10 === 0) snap();
      const bad = invariants(s); if (bad.length) { r.ok = false; r.violation = bad; break; }
    }
  } catch (e) { r.ok = false; r.violation = [String(e.stack || e)]; }
  r.foodLowDays = +(r.foodLowTicks / r.ticks * D).toFixed(2); r.final = r.snaps.at(-1); // 糧荒日數依實際拍數換成遊戲日
  out.push(r); console.log(JSON.stringify({ seed, op, ok: r.ok, best: r.final?.best, endless: r.final?.endless, coin: r.final?.coin, built: r.final?.built, raids: r.raids, foodLowTicks: r.foodLowTicks }));
}
fs.writeFileSync(process.env.OUT || `artifacts/v210/longrun${D}.json`, JSON.stringify({ days: D, cases: out }, null, 1));
