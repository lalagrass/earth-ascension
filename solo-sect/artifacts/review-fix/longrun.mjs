// GPT review 長跑矩陣重現：5 seeds × 7 開局（plain + 6 經典主角），最多 30 遊戲日，只用一般指令
// （startBuild / recruit / startExpedition），不改資源與數值；每拍檢查 invariants()，首次違反即中止該案。
// 用法：node artifacts/review-fix/longrun.mjs [days=30] [seeds=3,7,11,17,23] [openings=plain,guojing,...]
import fs from 'node:fs';
import { createState, tick, startBuild, canRecruit, recruit, startExpedition } from '../../src/sim.mjs';
import { DAY, FACILITIES } from '../../src/data.mjs';
import { canExpedition } from '../../src/expedition.mjs';
import { invariants } from '../../src/lifecycle.mjs';
const [days = 30, seedArg = '3,7,11,17,23', openArg = 'plain,guojing,weixiaobao,linghuchong,yuebuqun,zhangwuji,axing'] = process.argv.slice(2);
const seeds = String(seedArg).split(',').map(Number), opens = String(openArg).split(','), D = +days;
const out = [];
for (const seed of seeds) for (const op of opens) {
  const s = createState(seed, op === 'plain' ? null : { kind: 'template', id: op, askMajor: false });
  const r = { seed, opening: op, ok: true, t: 0, violation: null, built: [], recruits: 0, exps: 0 };
  try {
    for (let i = 0; s.t < D * DAY; i++) {
      tick(s);
      if (i % 40 === 0) {
        if (!FACILITIES.some((f) => s.fac[f.id]?.site)) for (const f of FACILITIES) if (startBuild(s, f.id)) { r.built.push(f.id); break; }
        if (canRecruit(s).ok && recruit(s)) r.recruits++;
        const team = s.ds.filter((d) => d.role !== 'laborer' && d.adult && d.hp > 70).slice(0, 2).map((d) => d.id);
        if (!s.exp && team.length && canExpedition(s, team).ok && s.t % (3 * DAY) < 10) { startExpedition(s, team); r.exps++; }
      }
      const bad = invariants(s); if (bad.length) { r.ok = false; r.violation = bad; break; }
    }
  } catch (e) { r.ok = false; r.violation = [String(e.stack || e)]; }
  r.t = s.t; r.days = +(s.t / DAY).toFixed(2); out.push(r); console.log(JSON.stringify({ seed, op, ok: r.ok, days: r.days, v: r.violation?.[0] }));
}
const f = new URL(`./longrun-results${process.env.TAG ? '-' + process.env.TAG : ''}.json`, import.meta.url);
fs.writeFileSync(f, JSON.stringify({ days: D, seeds, opens, pass: out.filter((x) => x.ok).length, total: out.length, cases: out }, null, 1));
console.log(`pass ${out.filter((x) => x.ok).length}/${out.length}`);
