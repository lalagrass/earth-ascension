/* loop71：欠俸先賣丹（s.paypill，預設勾選） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../../src/start-ui.mjs';
import { createState } from '../../src/sim.mjs';
import { settle, wageBill } from '../../src/economy.mjs';
import { ALL_ON as A0 } from '../harness/bot.mjs';
const A = { ...A0 }; delete A.paypill;
const H = { think() {}, removeDisciple() {}, rand: () => 0.5, cancelTask() {} };
const mk = (on) => ({ day: 10, res: { coin: 0, pill: 6 }, fac: {}, paypill: on, ledger: { in: {}, out: {} }, log: [], ds: [{ id: 'hero', role: 'head' }, { id: 'a', role: 'inner', adult: true }, { id: 'b', role: 'inner', adult: true }] });
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
test('錢已足夠時不賣丹', () => { const s = mk(true); s.res.coin = wageBill(s) + 1; settle(s, H); assert.equal(s.res.pill, 6); });
