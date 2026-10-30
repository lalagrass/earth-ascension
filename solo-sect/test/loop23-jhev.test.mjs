import test from 'node:test'; import assert from 'node:assert/strict';
import { run, botDaily } from './harness/bot.mjs';
import { createState, tick } from '../src/sim.mjs';
test('江湖事件：開啟時 30 日內有高人或挑戰帖，且勝率在 0.15–0.85', () => { const s = run(3, {}, 30); assert.equal(typeof s.jhev, 'object'); assert.ok(s.jhev.m + s.jhev.l > 0); });
test('未開啟江湖事件：不產生狀態', () => { const s = createState(3, { kind: 'custom', answers: Array(9).fill(0) }); for (let i = 0; i < 1200; i++) tick(s, 6); assert.equal(s.jhev, undefined); });
test('玩家 bot：10 日內收到第 5 人', () => { const s = run(1, {}, 10, true); assert.ok(s.ds.length >= 5); });
