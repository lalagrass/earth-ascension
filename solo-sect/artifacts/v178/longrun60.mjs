// v1.78「無目標」長跑：與 artifacts/review-fix/longrun.mjs 同一腳本玩家，唯一差別是巡山 target:'inf'（走進絕頂之上無盡段）。
// 額外記錄：每 10 日快照（錢、設施階段、ring 族群、獸襲次數、受傷、死亡、最遠步數／無盡層數、弟子、夫妻、丹藥）與糧荒閘日數。
// 用法：node artifacts/v178/longrun60.mjs [days=60] [seeds] [opens]；OUT=檔名
import fs from 'node:fs';
import { createState, tick, startBuild, canRecruit, recruit, startExpedition, foodLow } from '../../src/sim.mjs';
import { DAY, FACILITIES, ENDLESS } from '../../src/data.mjs';
import { canExpedition, ROUTE_END } from '../../src/expedition.mjs';
import { invariants } from '../../src/lifecycle.mjs';
const [days = 60, seedArg = '3,7,11,17,23', openArg = 'plain,guojing,weixiaobao,linghuchong,yuebuqun,zhangwuji,axing'] = process.argv.slice(2);
const seeds = String(seedArg).split(',').map(Number), opens = String(openArg).split(','), D = +days; const out = [];
const depth = (b) => (b > ROUTE_END ? Math.floor((b - ROUTE_END) / ENDLESS.len) + 1 : 0);
for (const seed of seeds) for (const op of opens) {
  const s = createState(seed, op === 'plain' ? null : { kind: 'template', id: op, askMajor: false });
  const r = { seed, opening: op, ok: true, snaps: [], foodLowTicks: 0, raids: 0, hurt: 0, deaths: 0, expStarts: 0 }; const seen = new Set(); let ids = new Set(s.ds.map((d) => d.id));
  const snap = () => r.snaps.push({ day: Math.round(s.t / DAY), coin: s.res.coin, food: s.res.food, pill: s.res.pill || 0, stages: Object.fromEntries(FACILITIES.map((f) => [f.id, s.fac[f.id]?.stage || 0])),
    built: FACILITIES.reduce((a, f) => a + (s.fac[f.id]?.stage || 0), 0), pop: Object.fromEntries(Object.entries(s.pop || {}).map(([k, v]) => [k, v.n])), eco: Object.fromEntries(Object.entries(s.eco || {}).map(([k, v]) => [k, v.n])),
    raids: r.raids, hurt: Math.round(r.hurt), deaths: r.deaths, best: s.records?.sect || 0, endless: depth(s.records?.sect || 0), ds: s.ds.filter((d) => d.role !== 'laborer').length, couples: s.gen?.couples?.length || 0, rep: s.rep || 0 });
  try {
    for (let i = 0; s.t < D * DAY; i++) {
      const hp0 = new Map(s.ds.map((d) => [d.id, d.hp])); const d0 = Math.floor(s.t / DAY); tick(s);
      r.ticks = i + 1; if (foodLow(s)) r.foodLowTicks++;
      for (const m of s.mons) if (m.raid && !seen.has(m.uid)) { seen.add(m.uid); r.raids++; }
      for (const d of s.ds) { const h = hp0.get(d.id); if (h != null && d.hp < h && !s.exp?.team?.includes?.(d.id)) r.hurt += h - d.hp; }
      const now = new Set(s.ds.map((d) => d.id)); for (const id of ids) if (!now.has(id)) r.deaths++; ids = now; // 離開（死亡／離門）
      if (i % 40 === 0) {
        if (!FACILITIES.some((f) => s.fac[f.id]?.site)) for (const f of FACILITIES) if (startBuild(s, f.id)) break;
        if (canRecruit(s).ok) recruit(s);
        const team = s.ds.filter((d) => d.role !== 'laborer' && d.adult && d.hp > 70).slice(0, 2).map((d) => d.id);
        if (!s.exp && team.length && canExpedition(s, team).ok && s.t % (3 * DAY) < 10) { startExpedition(s, team, { target: 'inf' }); r.expStarts++; }
      }
      if (Math.floor(s.t / DAY) !== d0 && Math.floor(s.t / DAY) % 10 === 0) snap();
      const bad = invariants(s); if (bad.length) { r.ok = false; r.violation = bad; break; }
    }
  } catch (e) { r.ok = false; r.violation = [String(e.stack || e)]; }
  r.foodLowDays = +(r.foodLowTicks / r.ticks * D).toFixed(2); r.final = r.snaps.at(-1); // 糧荒日數依實際拍數換成遊戲日
  out.push(r); console.log(JSON.stringify({ seed, op, ok: r.ok, best: r.final?.best, endless: r.final?.endless, coin: r.final?.coin, built: r.final?.built, raids: r.raids, foodLowTicks: r.foodLowTicks }));
}
fs.writeFileSync(process.env.OUT || 'artifacts/v178/longrun60.json', JSON.stringify({ days: D, cases: out }, null, 1));
