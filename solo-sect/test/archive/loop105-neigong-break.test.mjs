/* loop105 內力衝關：扣 btCost，成功率 +btBonus（封頂 0.9）；不夠內力時與關閉相同 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../src/sim.mjs';
import { NG, qiMax } from '../../src/arts.mjs';
import { breakChance } from '../../src/arts.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...x });
function trial(seed, qi) {
  const s = createState(seed, spec({ neigong: true })); const d = s.ds[0]; d.arts.breath = { xp: 25 }; d.arts.basicFist.xp = 54.9;
  d.qi = qi; d.needs.energy = 80; d.mood = 50;
  const c = breakChance(d); s.rng = s.rng; d.task = { act: 'meditate', timer: 99, fac: 'hall', phase: 'do' }; d.at = 'hall'; d.path = [];
  const q0 = d.qi; tick(s, 0.25); return { d, c, q0, ok: !!d.arts.basicFist.bt1 };
}
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
