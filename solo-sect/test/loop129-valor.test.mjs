/* loop129 門派勇名 valor：純函式、事件接線、上下限、舊檔維持關閉、山賊欄顯示 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { save, load } from '../src/save.mjs';
import { VALOR, valorAdd, valorPowMul, valorThreatMul, valorHtml } from '../src/valor.mjs';
import { power } from '../src/jianghu.mjs';
import { threatHtml, points } from '../src/threat.mjs';
import { letterOutcome } from '../src/jhevents.mjs';
import { ALL_ON } from './harness/bot.mjs';
const spec = (o = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, ...o });
const run = (s, n) => { for (let i = 0; i < n; i++) tick(s, 0.25); return s; };
test('沒有 s.valor 時全部中性，valorAdd 不會建立欄位', () => {
  const s = {}; valorAdd(s, 50); assert.equal(s.valor, undefined); assert.equal(valorPowMul(s), 1); assert.equal(valorThreatMul(s), 1); assert.equal(valorHtml(s), '');
});
test('上下限 ±100；門檻 50／−50 才有效果', () => {
  const s = { valor: 0 }; for (let i = 0; i < 200; i++) valorAdd(s, 7); assert.equal(s.valor, 100); for (let i = 0; i < 200; i++) valorAdd(s, -7); assert.equal(s.valor, -100);
  s.valor = 49; assert.equal(valorPowMul(s), 1); s.valor = 50; assert.equal(valorPowMul(s), VALOR.powMul); s.valor = -49; assert.equal(valorThreatMul(s), 1); s.valor = -50; assert.equal(valorThreatMul(s), VALOR.threatMul);
});
test('接線：開 → s.valor=0 並顯示在山賊欄；關 → 沒有欄位、不顯示', () => {
  const a = createState(51, spec()), b = createState(51, spec({ valor: false })); assert.equal(a.valor, 0); assert.equal(b.valor, undefined);
  assert.match(threatHtml(a), /勇名 0（尚無名號）/); assert.doesNotMatch(threatHtml(b), /勇名/);
});
test('挑戰帖：接 +2、婉拒 −2', () => {
  const s = createState(52, spec()); s.jhev = { l: 0, lw: 0 }; const c = s.ds[0]; letterOutcome(s, c, false, false); assert.equal(s.valor, 2); letterOutcome(s, c, false, true); assert.equal(s.valor, 0);
});
test('效果：勇名 ≥50 戰力 ×1.05；≤−50 山賊威脅變大（不低於原值）', () => {
  const s = run(createState(53, spec()), 2400), p0 = power(s), t0 = points(s); s.valor = 60; assert.ok(Math.abs(power(s) - p0 * 1.05) < 1e-9); s.valor = -60; assert.ok(points(s) >= t0);
});
test('舊檔（沒有 valor）讀入後維持關閉；全開存讀後續一致', () => {
  const s = run(createState(54, spec()), 400), o = JSON.parse(save(s)); delete o.valor; const r = load(JSON.stringify(o)); assert.ok(r.ok); run(r.state, 2400); assert.equal(r.state.valor, undefined);
  const a = run(createState(55, spec()), 2400), b = load(save(a)).state; assert.equal(b.valor, a.valor); run(a, 2400); run(b, 2400); assert.equal(a.valor, b.valor); assert.equal(JSON.stringify(a.threat), JSON.stringify(b.threat));
});
