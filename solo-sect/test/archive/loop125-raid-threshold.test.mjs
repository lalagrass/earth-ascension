/* loop125：山賊欄的人數門檻顯示要用實際門檻（minPopOf），不是固定的 8 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../src/sim.mjs';
import { threatHtml, minPopOf, RAID } from '../../src/threat.mjs';
import { ALL_ON } from '../harness/bot.mjs';
test('開了太平與備料（m9）：門檻 4，5 人時不再寫「看不上」', () => {
  const s = createState(31, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON });
  assert.ok(s.m9); assert.equal(minPopOf(s), RAID.minPopRules);
  while (s.ds.length < 5) s.ds.push({ ...s.ds[0], id: 'x' + s.ds.length });
  const h = threatHtml(s); assert.doesNotMatch(h, /看不上/); assert.doesNotMatch(h, /8 人起/);
});
test('門檻以下時寫出的人數就是實際門檻', () => {
  const s = createState(32, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON });
  s.ds = s.ds.slice(0, 2); const h = threatHtml(s);
  if (/看不上/.test(h)) assert.match(h, new RegExp(`（${minPopOf(s)} 人起）`));
});
