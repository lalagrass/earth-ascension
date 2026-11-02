/* loop125：山賊欄的人數門檻顯示要用實際門檻（minPopOf），不是固定的 8 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../src/sim.mjs';
import { threatHtml, minPopOf, RAID } from '../../src/threat.mjs';
import { ALL_ON } from '../harness/bot.mjs';
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
test('門檻以下時寫出的人數就是實際門檻', () => {
  const s = createState(32, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON });
  s.ds = s.ds.slice(0, 2); const h = threatHtml(s);
  if (/看不上/.test(h)) assert.match(h, new RegExp(`（${minPopOf(s)} 人起）`));
});
