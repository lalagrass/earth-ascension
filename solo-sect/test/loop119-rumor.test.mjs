/* loop119 傳聞預警（s.rumor，預設勾選；不用亂數，不改寨匪結果） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/start-ui.mjs';
import { createState, tick } from '../src/sim.mjs';
import { save, load } from '../src/save.mjs';
import { T, RUMOR, rumorDays, threatHtml } from '../src/threat.mjs';
import { run, ALL_ON } from './harness/bot.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, peace: true, ...x });
const msgs = (s) => s.log.map((l) => l.msg);
test('規則轉正（loop143）：rumor 在 v2.2 底層規則', async () => { const { BASELINE_V22 } = await import('../src/sim.mjs'); assert.equal(BASELINE_V22.rumor, true); });
test('寨匪來前一兩日出現傳聞，且早於寨匪；只說約幾日', () => {
  const seen = new Set(), m = []; run(1001, {}, 9, true, (s) => { for (const l of s.log.slice(0, 40).reverse()) if (!seen.has(l)) { seen.add(l); m.push(l.msg); } });
  const i = m.findIndex((x) => /【傳聞】山下茶攤/.test(x)), j = m.findIndex((x) => /山賊/.test(x) && /威脅/.test(x));
  assert.ok(i >= 0 && j > i, `${i} ${j}`); assert.doesNotMatch(m[i], /威脅|\d+ 人/);
});
test('沒有執事時，開關只加傳聞、不改寨匪結果（同種子）', () => {
  const a = run(1003, { steward: false }, 20, true), b = run(1003, { rumor: false, steward: false }, 20, true);
  assert.deepEqual(T(a).hist.map((h) => [h.day, h.fight, h.pay]), T(b).hist.map((h) => [h.day, h.fight, h.pay]));
});
test('山賊欄：開了只寫風聲，不寫下次日期', () => {
  const big = (x) => { const s = createState(5, spec(x)); while (s.ds.length < 8) s.ds.push({ ...s.ds[1], id: 'x' + s.ds.length }); return s; };
  const s = big({ rumor: true }); assert.match(threatHtml(s), /暫無風聲/); assert.doesNotMatch(threatHtml(s), /下次約第/);
  const o = big({}); assert.match(threatHtml(o), /下次約第/);
  const X = T(s); X.next = 3; s.day = 1; X.rumorFor = 3; assert.equal(rumorDays(s), 2); assert.match(threatHtml(s), /傳聞約 2 日內/);
});
test('存讀檔保留；舊檔沒有 rumor 就關閉', () => {
  const s = createState(7, spec({ rumor: true })); assert.ok(load(save(s)).state.rumor);
  assert.ok(!load(save(createState(7, spec()))).state.rumor); assert.ok(RUMOR.lead >= 1);
});
