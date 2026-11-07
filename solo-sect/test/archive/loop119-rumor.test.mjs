/* loop119 傳聞預警（s.rumor，預設勾選；不用亂數，不改寨匪結果） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../../src/start-ui.mjs';
import { createState, tick } from '../../src/sim.mjs';
import { save, load } from '../../src/save.mjs';
import { T, RUMOR, rumorDays, threatHtml } from '../../src/threat.mjs';
import { run, ALL_ON } from '../harness/bot.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, peace: true, ...x });
const msgs = (s) => s.log.map((l) => l.msg);
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
test('沒有執事時，開關只加傳聞、不改寨匪結果（同種子）', () => {
  const a = run(1003, { steward: false }, 20, true), b = run(1003, { rumor: false, steward: false }, 20, true);
  assert.deepEqual(T(a).hist.map((h) => [h.day, h.fight, h.pay]), T(b).hist.map((h) => [h.day, h.fight, h.pay]));
});
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
