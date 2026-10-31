/* loop116 護體真氣接到狩獵（山獸咬人）與巡山（遠行逐擊） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startHunt } from '../../src/sim.mjs';
import { qiMax, mitOf } from '../../src/arts.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, neigong: true, ngshield: true, ...x });
function hunt(seed, full) {
  const s = createState(seed, spec()); for (let i = 0; i < 7200; i++) tick(s, 0.25);
  const team = s.ds.filter((d) => d.hp > 50).slice(0, 3); for (const d of team) { d.qi = full ? qiMax(d) : 0; d.hp = 100; }
  startHunt(s, team.map((d) => d.id)); const t0 = s.t; const q0 = team.map((d) => d.qi);
  let lost = 0, used = 0; const hp = new Map(team.map((d) => [d.id, d.hp]));
  while (s.hunt && s.t - t0 < 900) { for (const d of team) d.cool = 99; /* 不出手，讓山獸近身 */ const q = team.map((d) => d.qi); tick(s, 0.25); team.forEach((d, i) => { if (d.qi < q[i] - 1e-9) used++; }); for (const d of team) { lost += Math.max(0, hp.get(d.id) - d.hp); hp.set(d.id, d.hp); } }
  return { team, q0, lost, used };
}
test('狩獵：有內力的人被咬先扣內力、內力不為負', () => {
  let used = 0;
  for (const seed of [1001, 1002, 1003, 1004]) { const r = hunt(seed, true); used += r.used; for (const d of r.team) assert.ok(d.qi >= 0); }
  assert.ok(used > 0, '至少有人用內力擋過');
});
test('狩獵：同種子滿內力的生命損失少於零內力', () => {
  let a = 0, b = 0; for (const seed of [1001, 1002, 1003, 1004]) { a += hunt(seed, true).lost; b += hunt(seed, false).lost; }
  assert.ok(a < b, `${a} < ${b}`);
});
test('開局沒有人有減傷', () => { const s = createState(5, spec()); for (const d of s.ds) if (!Object.keys(d.arts).length || qiMax(d) === 0) assert.equal(mitOf(d), 0); });
