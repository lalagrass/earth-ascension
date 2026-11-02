import test from 'node:test'; import assert from 'node:assert/strict';
import { btBoost, BT25 } from '../../src/arts.mjs';
test('卡瓶頸可衝關：打坐抬到練功×k', () => { const out = [{ act: 'train', score: 130 }, { act: 'meditate', score: 80, f: { btOk: true } }]; btBoost({ bt25: true }, out); assert.equal(out[1].score, 130 * BT25.k); });
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
