/* loop104 → loop142 改寫：一版「狩獵運勁、運功療傷」已淘汰。狩獵不再扣內力加威力、重傷不再自動回血；受擊改由護體真氣吸收 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startHunt } from '../src/sim.mjs';
import { qiMax, NG } from '../src/arts.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...x });
test('NG 不再有運勁／療傷參數', () => { for (const k of ['strikeCost', 'strikeMul', 'healAt', 'healCost', 'heal', 'base', 'perTier']) assert.equal(NG[k], undefined, k); });
test('開內功即護體真氣（沒有一版可選）', () => { const s = createState(1001, spec({ neigong: true, ngshield: false })); assert.equal(s.ngshield, true); assert.ok(s.ds.every((d) => d.ng2 === 1)); });
test('重傷不再運功療傷：內力滿、生命 40 時一拍後生命不回升', () => {
  const s = createState(1003, spec({ neigong: true })); for (let i = 0; i < 2400; i++) tick(s, 0.25);
  const d = s.ds.find((x) => x.hp > 50); startHunt(s, [d.id]); let k = 0; while (s.hunt && !s.hunt.started && k++ < 4000) tick(s, 0.25);
  assert.ok(s.hunt?.started, '狩獵已開始'); d.arts.breath ??= { xp: 0 }; d.qi = qiMax(d); d.hp = 40; d.cool = 99; const q = d.qi; tick(s, 0.25);
  assert.ok(d.hp <= 40); assert.ok(d.qi <= q);
});
