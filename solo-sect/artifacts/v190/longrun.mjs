// GPT review 長跑矩陣重現：5 seeds × 7 開局（plain + 6 經典主角），最多 30 遊戲日，只用一般指令
// （startBuild / recruit / startExpedition），不改資源與數值；每拍檢查 invariants()，首次違反即中止該案。
// 用法：node artifacts/v190/longrun.mjs [days=30] [seeds=3,7,11,17,23] [openings=plain,guojing,...]
import fs from 'node:fs';
import { buildWhy, buyLot, lotCost, lotsOf, lotsUsed } from '../../src/sim.mjs';
import { T as thOf } from '../../src/threat.mjs';
import { suggestTeam } from '../../src/expedition.mjs';
import { createState, tick, startBuild, canRecruit, recruit, startExpedition , startSchoolTrip } from '../../src/sim.mjs';
import { schoolWhy, marketWhy, marketDo, E as econOf, wageBill, facBill } from '../../src/economy.mjs';
import { DAY, FACILITIES } from '../../src/data.mjs';
import { canExpedition } from '../../src/expedition.mjs';
import { invariants } from '../../src/lifecycle.mjs';
const [days = 30, seedArg = '3,7,11,17,23', openArg = 'plain,guojing,weixiaobao,linghuchong,yuebuqun,zhangwuji,axing'] = process.argv.slice(2);
const seeds = String(seedArg).split(',').map(Number), opens = String(openArg).split(','), D = +days;
const out = [];
// v1.9 機器人：花錢的藍圖要留下一次月俸＋維護（玩家常識）；只套在 v1.9 新增、要稀有料的三四階
const reserveOk = (s, f) => { const nx = f.stages[(s.fac[f.id]?.stage ?? 0) + 1]; return !nx?.rare || s.res.coin - (nx.cost.coin || 0) >= wageBill(s) + facBill(s); }; // 只管 v1.9 新的三四階
for (const seed of seeds) for (const op of opens) {
  const s = createState(seed, op === 'plain' ? null : { kind: 'template', id: op, askMajor: false });
  const r = { seed, opening: op, ok: true, t: 0, violation: null, built: [], recruits: 0, exps: 0, raids: 0, daily: [] }; const seenRaid = new Set(); let lastDay = -1;
  try {
    for (let i = 0; s.t < D * DAY; i++) {
      tick(s);
      if (i % 40 === 0) {
        if (!FACILITIES.some((f) => s.fac[f.id]?.site) && FACILITIES.some((f) => /沒有空地/.test(buildWhy(s, f.id) || '')) && s.res.coin > lotCost(s) + wageBill(s) + facBill(s)) buyLot(s); // v1.9 擴地
        if (!FACILITIES.some((f) => s.fac[f.id]?.site)) for (const f of FACILITIES) if (reserveOk(s, f) && startBuild(s, f.id)) { r.built.push(f.id); break; }
        if (canRecruit(s).ok && recruit(s)) r.recruits++;
        { const why = canRecruit(s).why || ''; if (/暫無人選/.test(why) && !schoolWhy(s)) startSchoolTrip(s); } // v1.85 A10
        if ((s.res.pill || 0) > 6 && !marketWhy(s, 'pill')) marketDo(s, 'pill');
        if ((s.res.herb || 0) < 5 && s.res.coin > 300 && !marketWhy(s, 'herb')) marketDo(s, 'herb');
        if (s.res.coin > 500 && !marketWhy(s, 'weapon')) marketDo(s, 'weapon');
        const team = process.env.A9 ? suggestTeam(s, 2).ids : s.ds.filter((d) => d.role !== 'laborer' && d.adult && d.hp > 70).slice(0, 2).map((d) => d.id); // 預設照 v1.85 機器人；A9=1 改用 v1.9 因才派巡（對照組）
        if (!s.exp && team.length && canExpedition(s, team).ok && s.t % (3 * DAY) < 10) { startExpedition(s, team); r.exps++; (r.styles ??= []).push(s.exp?.style); (r.teams ??= []).push(team.join('+')); }
      }
      for (const m of s.mons) if (m.raid && !seenRaid.has(m)) { seenRaid.add(m); r.raids++; }
      const day = Math.floor(s.t / DAY); if (day !== lastDay) { lastDay = day; r.daily.push({ day, threat: (({ pending, rng, hist, ...o }) => o)(thOf(s)), lots: { ...lotsOf(s), used: lotsUsed(s) }, econ: { misses: econOf(s).misses, left: econOf(s).left, paid: econOf(s).paid, disrepair: econOf(s).disrepair, schoolN: econOf(s).schoolN, wage: wageBill(s), fac: facBill(s) }, res: { ...s.res }, ds: s.ds.filter((d) => d.role !== 'laborer').length, labor: s.ds.filter((d) => d.role === 'laborer').length, stages: Object.fromEntries(Object.entries(s.fac).map(([k, f]) => [k, f.stage])), best: s.records?.sect || 0, expN: s.expN || 0, rep: s.rep || 0, ch: !!s.chapter?.done }); }
      const bad = invariants(s); if (bad.length) { r.ok = false; r.violation = bad; break; }
    }
  } catch (e) { r.ok = false; r.violation = [String(e.stack || e)]; }
  r.final = { threat: (({ pending, rng, ...o }) => o)(thOf(s)), lots: { ...lotsOf(s), used: lotsUsed(s) }, res: { ...s.res }, econ: { misses: econOf(s).misses, left: econOf(s).left, paid: econOf(s).paid, disrepair: econOf(s).disrepair, schoolN: econOf(s).schoolN, wage: wageBill(s), fac: facBill(s) }, ds: s.ds.filter((d) => d.role !== 'laborer').length, stages: Object.fromEntries(Object.entries(s.fac).map(([k, f]) => [k, f.stage])), best: s.records?.sect || 0, expN: s.expN || 0, rep: s.rep || 0, chapterDay: s.chapter?.done ? s.chapter.day : null, gen: s.gen?.n, kids: s.gen?.kids?.length || 0, couples: s.gen?.couples?.length || 0, pass: Object.keys(s.passed || {}).length, families: (s.families || []).length, ko: (s.log || []).filter((e) => /重傷|倒地|昏/.test(e.msg)).length, left: (s.log || []).filter((e) => /下山去了|逐出/.test(e.msg)).length, avgMood: +(s.ds.reduce((a, d) => a + d.mood, 0) / s.ds.length).toFixed(1) };
  r.t = s.t; r.days = +(s.t / DAY).toFixed(2); out.push(r); console.log(JSON.stringify({ seed, op, ok: r.ok, days: r.days, v: r.violation?.[0] }));
}
const f = process.env.OUT || new URL(`./longrun-results${process.env.TAG ? '-' + process.env.TAG : ''}.json`, import.meta.url);
fs.writeFileSync(f, JSON.stringify({ days: D, seeds, opens, pass: out.filter((x) => x.ok).length, total: out.length, cases: out }, null, 1));
console.log(`pass ${out.filter((x) => x.ok).length}/${out.length}`);
