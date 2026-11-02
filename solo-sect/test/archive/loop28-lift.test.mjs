import test from 'node:test'; import assert from 'node:assert/strict';
import { liftBoost, LIFT } from '../../src/economy.mjs';
const mk = (mood, needs) => ({ mood, needs });
const outs = () => [{ act: 'train', score: 100, why: 'a' }, { act: 'chat', score: 50, why: 'b' }, { act: 'leisure', score: 40, why: 'c' }];
test('心情低＋最寂寞 → 聊天被抬高', () => { const o = outs(); liftBoost({ lift: true }, mk(30, { social: 10, fun: 40, energy: 80 }), o); assert.equal(o[1].score, 50 * LIFT.k); assert.equal(o[2].score, 40); });
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
