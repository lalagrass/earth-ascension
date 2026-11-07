import test from 'node:test'; import assert from 'node:assert/strict';
import { run, botDaily } from '../harness/bot.mjs';
import { createState, tick } from '../../src/sim.mjs';
test('江湖事件：開啟時 30 日內有高人或挑戰帖，且勝率在 0.15–0.85', () => { const s = run(3, {}, 30); assert.equal(typeof s.jhev, 'object'); assert.ok(s.jhev.m + s.jhev.l > 0); });
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
