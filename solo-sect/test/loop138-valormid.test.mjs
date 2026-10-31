/* loop138 小有勇名 valormid（決定 118）：25≤勇名<50 戰力 ×1.02；需 valor；舊檔關閉 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { save, load } from '../src/save.mjs';
import { VALOR, valorPowMul, valorLabel } from '../src/sect.mjs';
import { power } from '../src/jianghu.mjs';
import { threatHtml } from '../src/threat.mjs';
import { ALL_ON } from './harness/bot.mjs';
const spec = (o = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, ...o });
const run = (s, n) => { for (let i = 0; i < n; i++) tick(s, 0.25); return s; };
test('門檻：24 無、25～49 ×1.02、50 起 ×1.05；沒有 valormid 時 25～49 仍是 1', () => {
  const s = { valor: 24, valormid: true }; assert.equal(valorPowMul(s), 1); s.valor = 25; assert.equal(valorPowMul(s), VALOR.midMul); assert.match(valorLabel(s), /小有勇名/);
  s.valor = 49; assert.equal(valorPowMul(s), VALOR.midMul); s.valor = 50; assert.equal(valorPowMul(s), VALOR.powMul);
  const o = { valor: 30 }; assert.equal(valorPowMul(o), 1); assert.match(valorLabel(o), /尚無名號/);
});
test('接線：開 → s.valormid；關或沒開 valor → 沒有', () => {
  assert.equal(createState(61, spec()).valormid, true); assert.equal(createState(61, spec({ valormid: false })).valormid, undefined); assert.equal(createState(61, spec({ valor: false })).valormid, undefined);
});
test('戰力與山賊欄', () => {
  const s = run(createState(62, spec()), 2400); s.valor = 0; const p0 = power(s); s.valor = 30; assert.ok(Math.abs(power(s) - p0 * 1.02) < 1e-9); assert.match(threatHtml(s), /勇名 30（小有勇名/);
});
test('舊檔沒有 valormid → 讀入維持關閉', () => {
  const s = run(createState(63, spec()), 400), o = JSON.parse(save(s)); delete o.valormid; const r = load(JSON.stringify(o)); assert.ok(r.ok); r.state.valor = 30; assert.equal(valorPowMul(r.state), 1);
});
