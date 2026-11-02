/* loop138 小有勇名 valormid（決定 118）：25≤勇名<50 戰力 ×1.02；需 valor；舊檔關閉 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../src/sim.mjs';
import { save, load } from '../../src/save.mjs';
import { VALOR, valorPowMul, valorLabel } from '../../src/sect.mjs';
import { power } from '../../src/jianghu.mjs';
import { threatHtml } from '../../src/threat.mjs';
import { ALL_ON } from '../harness/bot.mjs';
const spec = (o = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, ...o });
const run = (s, n) => { for (let i = 0; i < n; i++) tick(s, 0.25); return s; };
// #390 退役：此測試含規則開關關閉時的斷言，開關已刪（擁有人 2026-11-02）
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
test('戰力與山賊欄', () => {
  const s = run(createState(62, spec()), 2400); s.valor = 0; const p0 = power(s); s.valor = 30; assert.ok(Math.abs(power(s) - p0 * 1.02) < 1e-9); assert.match(threatHtml(s), /勇名 30（小有勇名/);
});
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
