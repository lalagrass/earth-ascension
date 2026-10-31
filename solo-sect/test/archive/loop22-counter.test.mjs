import test from 'node:test'; import assert from 'node:assert/strict';
import { createState, tick } from '../../src/sim.mjs';
test('聊天/切磋完成場次計數只在人以群分開啟時存在', () => {
  const a = createState(2, { kind: 'custom', answers: Array(9).fill(0), draw: true }); for (let i = 0; i < 1500; i++) tick(a, 6); assert.ok(a.cnt && a.cnt.chat > 0);
  const b = createState(2, { kind: 'custom', answers: Array(9).fill(0) }); for (let i = 0; i < 1500; i++) tick(b, 6); assert.equal(b.cnt, undefined); });
