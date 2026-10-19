'use strict';
// 完整驗收：保留原20 seed／2700 tick矩陣，dev快速套件不包含此目錄。
const test = require('node:test');
const assert = require('node:assert/strict');
const Auto = require('../../tools/rt-auto-replay.js');

test('rt-auto-life-v1：20 seed × 2700 tick，三種政策、分塊、存讀與一次固定介入', { timeout: 600000 }, () => {
  const result = Auto.replayMatrix();
  assert.equal(result.ok, true, JSON.stringify(result.failures, null, 2));
  assert.equal(result.script, 'rt-auto-life-v1');
  assert.equal(result.rows.length, 20);
  assert.deepEqual(result.rows.map((row) => row.policy), [
    ...Array(10).fill('安穩發展'),
    ...Array(5).fill('全部詢問'),
    ...Array(5).fill('自訂'),
  ]);
  assert.equal(result.rows.every((row) => row.breakthroughTick === 2148), false);
});
