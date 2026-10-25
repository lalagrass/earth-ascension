// v1.75 新系統量測：與 artifacts/review-fix/longrun.mjs 同一迴圈、同一組指令（逐字相同的腳本玩家），只多旁觀統計：
// 各活動開工次數（brew／pass／打水…）、丹藥與水的產耗、收徒、ring 族群、氣血最低、獸襲中受傷。
// DAO=off 時把相剋倍率設為 1，做 A/B。用法：node artifacts/v175/longrun-extra.mjs [days] [seeds] [opens]
import fs from 'node:fs';
import { createState, tick, startBuild, canRecruit, recruit, startExpedition } from '../../src/sim.mjs';
import { DAY, FACILITIES, DAO } from '../../src/data.mjs';
import { canExpedition } from '../../src/expedition.mjs';
import { invariants } from '../../src/lifecycle.mjs';
const [days = 30, seedArg = '3,7,11,17,23', openArg = 'plain,guojing,weixiaobao,linghuchong,yuebuqun,zhangwuji,axing'] = process.argv.slice(2);
if (process.env.DAO === 'off') DAO.up = DAO.down = 1;
const seeds = String(seedArg).split(',').map(Number), opens = String(openArg).split(','), D = +days; const out = [];
for (const seed of seeds) for (const op of opens) {
  const s = createState(seed, op === 'plain' ? null : { kind: 'template', id: op, askMajor: false });
  const r = { seed, opening: op, ok: true, acts: {}, pillMade: 0, pillUsed: 0, waterMade: 0, waterUsed: 0, minHp: 100, raidHurt: 0, raidHurtEvents: 0, pop: [] }; let lastDay = -1; const lastTask = new Map(); let prev = { ...s.res };
  try {
    for (let i = 0; s.t < D * DAY; i++) {
      const hp0 = new Map(s.ds.map((d) => [d.id, d.hp])); tick(s);
      if (i % 40 === 0) {
        if (!FACILITIES.some((f) => s.fac[f.id]?.site)) for (const f of FACILITIES) if (startBuild(s, f.id)) break;
        if (canRecruit(s).ok) recruit(s);
        const team = s.ds.filter((d) => d.role !== 'laborer' && d.adult && d.hp > 70).slice(0, 2).map((d) => d.id);
        if (!s.exp && team.length && canExpedition(s, team).ok && s.t % (3 * DAY) < 10) startExpedition(s, team);
      }
      for (const d of s.ds) { const o0 = lastTask.get(d.id); if (o0?.act === 'pass' && o0 !== d.task) { const k = `${o0.lead ? 'lead' : 'pupil'}:${o0.phase}`; (r.passEnds ??= {})[k] = (r.passEnds[k] || 0) + 1; } if (d.task && o0 !== d.task) r.acts[d.task.act] = (r.acts[d.task.act] || 0) + 1; lastTask.set(d.id, d.task);
        if (!s.exp?.team?.includes?.(d.id)) r.minHp = Math.min(r.minHp, d.hp);
        const h0 = hp0.get(d.id); if (h0 != null && d.hp < h0 && s.mons.some((m) => m.raid)) { r.raidHurt += h0 - d.hp; r.raidHurtEvents++; } }
      for (const [k, a, b] of [['pill', 'pillMade', 'pillUsed'], ['water', 'waterMade', 'waterUsed']]) { const dv = (s.res[k] || 0) - (prev[k] || 0); if (dv > 0) r[a] += dv; else r[b] -= dv; }
      prev = { ...s.res };
      const day = Math.floor(s.t / DAY); if (day !== lastDay) { lastDay = day; r.pop.push({ day, ...Object.fromEntries(Object.entries(s.pop || {}).map(([k, v]) => [k, v.n])) }); }
      const bad = invariants(s); if (bad.length) { r.ok = false; r.violation = bad; break; }
    }
  } catch (e) { r.ok = false; r.violation = [String(e.stack || e)]; }
  const L = s.log || [];
  r.final = { ds: s.ds.filter((d) => d.role !== 'laborer').length, best: s.records?.sect || 0, expN: s.expN || 0, rep: s.rep || 0, coin: s.res.coin, couples: s.gen?.couples?.length || 0,
    pass: Object.keys(s.passed || {}).length, passLog: L.filter((e) => e.msg.includes('【傳功】')).length, logLen: L.length, masters: s.ds.filter((d) => d.master).length, mem: (s.mem || []).length, pill: s.res.pill, water: s.res.water,
    codex: Object.fromEntries(Object.entries(s.codex || {}).map(([k, v]) => [k, v.kills])), escaped: s.exp ? null : undefined };
  out.push(r); console.log(JSON.stringify({ seed, op, ok: r.ok, best: r.final.best, pass: r.final.pass, brew: r.acts.brew || 0, masters: r.final.masters }));
}
fs.writeFileSync(process.env.OUT || 'artifacts/v175/extra.json', JSON.stringify({ days: D, dao: process.env.DAO || 'on', cases: out }, null, 1));
