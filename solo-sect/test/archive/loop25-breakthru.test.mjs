import test from 'node:test'; import assert from 'node:assert/strict';
import { btBoost, BT25 } from '../../src/arts.mjs';
test('卡瓶頸可衝關：打坐抬到練功×k', () => { const out = [{ act: 'train', score: 130 }, { act: 'meditate', score: 80, f: { btOk: true } }]; btBoost({ bt25: true }, out); assert.equal(out[1].score, 130 * BT25.k); });
test('未卡瓶頸或未開啟：不變', () => { const a = [{ act: 'train', score: 130 }, { act: 'meditate', score: 80, f: { btOk: false } }]; btBoost({ bt25: true }, a); assert.equal(a[1].score, 80);
  const b = [{ act: 'train', score: 130 }, { act: 'meditate', score: 80, f: { btOk: true } }]; btBoost({}, b); assert.equal(b[1].score, 80); });
