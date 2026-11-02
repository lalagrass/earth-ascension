/* loop127 勞作練體 laborgrow：純函式、每日軟上限、接線、舊檔維持關閉 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../src/sim.mjs';
import { save, load } from '../../src/save.mjs';
import { LABOR, strMul, laborPow, workStrCap, laborToday } from '../../src/economy.mjs';
import { moveMul } from '../../src/arts.mjs';
import { power } from '../../src/jianghu.mjs';
import { ALL_ON } from '../harness/bot.mjs';
const spec = (o = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, ...o });
const run = (s, n) => { for (let i = 0; i < n; i++) tick(s, 0.25); return s; };
test('沒有 d.lg 時全部中性：倍率 1、戰力 +0、上限不介入', () => {
  const d = { skills: { strength: 80 } }; assert.equal(strMul(d), 1); assert.equal(laborPow(d), 0); assert.equal(workStrCap(d, 3, 5), 5); assert.equal(d.lgGot, undefined);
});
test('倍率與戰力：力氣 40 → ×1.1、+4；負力氣當 0', () => {
  assert.equal(strMul({ lg: 1, skills: { strength: 40 } }), 1.1); assert.equal(laborPow({ lg: 1, skills: { strength: 40 } }), 4);
  assert.equal(strMul({ lg: 1, skills: { strength: -20 } }), 1); assert.equal(laborPow({ lg: 1, skills: { strength: -20 } }), 0);
});
test('每日軟上限：當日前 3 點全拿，之後兩成；換日重算；負值與 0 不累計', () => {
  const d = { lg: 1 }; assert.equal(workStrCap(d, 1, 2), 2); assert.ok(Math.abs(workStrCap(d, 1, 2) - (1 + 0.2)) < 1e-12); assert.ok(Math.abs(workStrCap(d, 1, 1) - 0.2) < 1e-12);
  assert.ok(Math.abs(laborToday(d, 1) - 3.4) < 1e-12); assert.equal(laborToday(d, 2), 0); assert.equal(workStrCap(d, 2, 2), 2);
  assert.equal(workStrCap(d, 2, -1), -1); assert.equal(workStrCap(d, 2, 0), 0); assert.equal(d.lgGot, 2);
  let got = 0; const e = { lg: 1 }; for (let i = 0; i < 1000; i++) got += workStrCap(e, 9, 0.5); assert.ok(got <= LABOR.cap + 0.2 * 500 + 1e-9);
});
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
test('實跑：開關開時做活力氣每人每日不超過 3＋兩成餘量（4 日）', () => {
  const s = run(createState(42, spec()), 4 * 4 * 60 * 2); for (const d of s.ds) assert.ok((d.lgGot || 0) < 3 + 3, `${d.name} ${d.lgGot}`);
});
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
