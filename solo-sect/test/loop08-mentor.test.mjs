import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { MENTOR, coTrain, askStrong, pairBoost } from '../src/social.mjs';

const sp = (o = {}) => ({ kind: 'custom', name: '測', answers: Array(9).fill(0), ...o });
const nop = () => {};
test('loop8 預設關閉', () => { assert.equal(createState(2).mentor, undefined); assert.equal(createState(2, sp({ mentor: true })).mentor, true); });
test('loop8 關閉時三個函式都不動', () => {
  const s = createState(2); const [a, b] = s.ds; let g = 0; const grow = () => g++;
  b.task = { act: 'train' }; b.path = [];
  assert.equal(coTrain(s, a, 5, grow, nop, nop), 0); assert.equal(askStrong(s, a, b, grow, nop, nop), null);
  const out = [{ act: 'train', score: 10 }]; a.mates = { [b.id]: 9 }; pairBoost(s, a, out); assert.equal(out[0].score, 10); assert.equal(g, 0);
});
test('loop8 同修：有人同時在練才加、記搭子次數', () => {
  const s = createState(2, sp({ mentor: true })); const [a, b] = s.ds; let g = 0; const grow = (_s, _d, k, v) => { g += v; };
  for (const o of s.ds) o.task = null;
  assert.equal(coTrain(s, a, 5, grow, nop, nop), 0);
  b.task = { act: 'train' }; b.path = [];
  assert.equal(coTrain(s, a, 5, grow, nop, nop), 1); assert.equal(g, 5 * MENTOR.coMul); assert.equal(a.mates[b.id], 1);
});
test('loop8 請教：弱者向強者', () => {
  const s = createState(2, sp({ mentor: true })); const [a, b] = s.ds; a.skills = { strength: 1 }; b.skills = { strength: 60, palm: 60 }; let who = null;
  assert.equal(askStrong(s, b, a, (_s, d) => { who = d; }, nop, nop), a); assert.equal(who, a);
});
test('loop8 搭子在練 → 練功意願提高', () => {
  const s = createState(2, sp({ mentor: true })); const [a, b] = s.ds; b.task = { act: 'train' }; b.path = []; a.mates = { [b.id]: MENTOR.pairAt };
  const out = [{ act: 'train', score: 10 }]; pairBoost(s, a, out); assert.ok(out[0].score > 10);
});
test('loop8 開啟跑 5 天無錯且有同修', () => {
  let co = 0; for (const seed of [1, 2, 3]) { const s = createState(seed, sp({ mentor: true })); for (let i = 0; i < 1200; i++) tick(s, 6); co += s.mentorN?.co || 0; }
  assert.ok(co > 0);
});
