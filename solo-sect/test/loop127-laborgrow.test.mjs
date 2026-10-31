/* loop127 勞作練體 laborgrow：純函式、每日軟上限、接線、舊檔維持關閉 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { save, load } from '../src/save.mjs';
import { LABOR, strMul, laborPow, workStrCap, laborToday } from '../src/economy.mjs';
import { moveMul } from '../src/arts.mjs';
import { power } from '../src/jianghu.mjs';
import { ALL_ON } from './harness/bot.mjs';
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
test('接線：開關開 → 每人 d.lg、moveMul 吃力氣、戰力變高；關 → 沒有 d.lg、數值不變', () => {
  const a = createState(41, spec()), b = createState(41, spec({ laborgrow: false }));
  assert.ok(a.laborgrow && a.ds.every((d) => d.lg === 1)); assert.ok(!b.laborgrow && b.ds.every((d) => !d.lg));
  const da = a.ds[0], db = b.ds[0]; assert.ok(Math.abs(moveMul(da, 'fist', 0) / moveMul(db, 'fist', 0) - (1 + da.skills.strength / 400)) < 1e-9);
  assert.ok(power(a) > power(b));
});
test('實跑：開關開時做活力氣每人每日不超過 3＋兩成餘量（4 日）', () => {
  const s = run(createState(42, spec()), 4 * 4 * 60 * 2); for (const d of s.ds) assert.ok((d.lgGot || 0) < 3 + 3, `${d.name} ${d.lgGot}`);
});
test('舊檔（沒有 laborgrow）讀入後維持關閉，新入門者也不會被打開；全開存讀後續一致', () => {
  const s = run(createState(43, spec()), 400), o = JSON.parse(save(s)); delete o.laborgrow; for (const d of o.ds) { delete d.lg; delete d.lgDay; delete d.lgGot; }
  const r = load(JSON.stringify(o)); assert.ok(r.ok); run(r.state, 2400); assert.ok(!r.state.laborgrow && r.state.ds.every((d) => !d.lg));
  const a = run(createState(44, spec()), 2400), b = load(save(a)).state; run(a, 2400); run(b, 2400); assert.equal(JSON.stringify(a.ds), JSON.stringify(b.ds));
});
