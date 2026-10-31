/* loop105 內力衝關：扣 btCost，成功率 +btBonus（封頂 0.9）；不夠內力時與關閉相同 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { NG, qiMax } from '../src/arts.mjs';
import { breakChance } from '../src/arts.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...x });
function trial(seed, qi) {
  const s = createState(seed, spec({ neigong: true })); const d = s.ds[0]; d.arts.breath = { xp: 25 }; d.arts.basicFist.xp = 54.9;
  d.qi = qi; d.needs.energy = 80; d.mood = 50;
  const c = breakChance(d); s.rng = s.rng; d.task = { act: 'meditate', timer: 99, fac: 'hall', phase: 'do' }; d.at = 'hall'; d.path = [];
  const q0 = d.qi; tick(s, 0.25); return { d, c, q0, ok: !!d.arts.basicFist.bt1 };
}
test('卡瓶頸打坐：內力夠就扣 btCost', () => {
  const { d, q0 } = trial(1001, 100); const r = d.arts.basicFist;
  assert.ok(r.bt1 || r.btCd, '有衝關'); assert.ok(d.qi <= Math.min(q0, qiMax(d)) - NG.btCost + NG.med + 1e-6);
});
test('成功率：160 種子，有內力的成功次數 ≥ 沒內力', () => {
  let a = 0, b = 0; for (let k = 0; k < 160; k++) { a += trial(1001 + k, 100).ok; b += trial(1001 + k, 0).ok; }
  assert.ok(a >= b, `${a} vs ${b}`); assert.ok(a > b, '應該有差'); console.log(JSON.stringify({ withQi: a, noQi: b }));
});
