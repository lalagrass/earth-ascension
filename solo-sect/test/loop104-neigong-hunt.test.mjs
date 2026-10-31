/* loop104 內力用途：狩獵運勁、運功療傷（只在內力夠時） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startHunt } from '../src/sim.mjs';
import { NG, qiMax } from '../src/neigong.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...x });
function hunt(seed, ng, qi) {
  const s = createState(seed, spec({ neigong: ng })); for (let i = 0; i < 2400; i++) tick(s, 0.25);
  const team = s.ds.filter((d) => d.hp > 50).slice(0, 3); for (const d of team) if (ng) d.qi = qi(d);
  startHunt(s, team.map((d) => d.id)); const t0 = s.t; const q0 = team.map((d) => d.qi ?? 0);
  while (s.hunt && s.t - t0 < 600) tick(s, 0.25); return { s, team, q0, sec: s.t - t0 };
}
test('有內力：出手扣內力，內力不為負', () => {
  const { team, q0 } = hunt(1001, true, (d) => qiMax(d));
  assert.ok(team.some((d, i) => d.qi < q0[i])); for (const d of team) assert.ok(d.qi >= 0);
});
test('內力為 0 與關閉時同種子清場時間相同（沒有白送）', () => {
  const a = hunt(1002, true, () => 0), b = hunt(1002, false);
  // 0 內力仍可能在狩獵途中歇息回一點，因此只比較沒有任何人回到 strikeCost 的情形
  assert.ok(a.team.every((d) => (d.qi ?? 0) < NG.strikeCost), '前提：沒人回到運勁門檻'); assert.equal(a.sec, b.sec);
});
test('運功療傷：重傷且內力夠才回血並扣 healCost', () => {
  const s = createState(1003, spec({ neigong: true })); for (let i = 0; i < 2400; i++) tick(s, 0.25);
  const d = s.ds.find((x) => x.hp > 50); startHunt(s, [d.id]); let k = 0; while (s.hunt && !s.hunt.started && k++ < 4000) tick(s, 0.25);
  assert.ok(s.hunt?.started, '狩獵已開始'); d.qi = qiMax(d); d.hp = NG.healAt; d.cool = 99; tick(s, 0.25);
  assert.ok(d.hp > NG.healAt); assert.ok(d.qi <= qiMax(d) - NG.healCost + 1e-6);
});
