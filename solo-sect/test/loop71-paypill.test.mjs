/* loop71：欠俸先賣丹（s.paypill，預設勾選） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/start-ui.mjs';
import { createState } from '../src/sim.mjs';
import { settle, wageBill } from '../src/economy.mjs';
import { ALL_ON as A0 } from './harness/bot.mjs';
const A = { ...A0 }; delete A.paypill;
const H = { think() {}, removeDisciple() {}, rand: () => 0.5, cancelTask() {} };
const mk = (on) => ({ day: 10, res: { coin: 0, pill: 6 }, fac: {}, paypill: on, ledger: { in: {}, out: {} }, log: [], ds: [{ id: 'hero', role: 'head' }, { id: 'a', role: 'inner', adult: true }, { id: 'b', role: 'inner', adult: true }] });
test('規則預設勾選', () => assert.equal(RULES.find((r) => r[0] === 'paypill')?.[3], true));
test('開局 spec 接線', () => { assert.equal(createState(7, { ...A, paypill: true }).paypill, true); assert.ok(!createState(7, A).paypill); });
test('開啟時月俸不夠會先賣丹，關閉時不賣', () => {
  const on = mk(true), off = mk(false); settle(on, H); settle(off, H);
  assert.ok(on.res.pill < 6); assert.equal(off.res.pill, 6);
});
test('錢已足夠時不賣丹', () => { const s = mk(true); s.res.coin = wageBill(s) + 1; settle(s, H); assert.equal(s.res.pill, 6); });
