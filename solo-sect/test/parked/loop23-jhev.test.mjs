// Parked after T1 CI failure; original assertion(s) retained verbatim: 玩家 bot：10 日內收到第 5 人; tracked in #496.
import test from 'node:test'; import assert from 'node:assert/strict';
import { run, botDaily } from '../harness/bot.mjs';
import { createState, tick } from '../../src/sim.mjs';
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則

test('玩家 bot：10 日內收到第 5 人', () => { const s = run(1, {}, 10, true); assert.ok(s.ds.length >= 5); });
