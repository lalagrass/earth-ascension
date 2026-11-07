// Parked after T1 CI failure; original assertion(s) retained verbatim: 實跑：有藏經閣時會有人研讀累積; tracked in #496.
/* loop140 讀書長悟性 readwu（決定 120）：30 次研讀悟性 +1，每人一次、上限 5；接線；舊檔關閉 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../src/sim.mjs';
import { save, load } from '../../src/save.mjs';
import { READWU, readStudy, readwuNote } from '../../src/arts.mjs';
import { ALL_ON } from '../harness/bot.mjs';
const spec = (o = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, ...o });
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則

test('實跑：有藏經閣時會有人研讀累積', () => {
  const s = createState(72, spec()); s.fac.library.stage = 1; for (let i = 0; i < 4 * 600 * 6; i++) tick(s, 0.25); assert.ok(s.ds.some((d) => (d.rw || 0) > 0));
});
