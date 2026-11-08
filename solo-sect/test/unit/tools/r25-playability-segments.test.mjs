import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentReport, aggregateSegments } from '../../../tools/playability-segments.mjs';

test('25a 十五日段保留每日末庫存、人物秒數分母與來犯見聞', () => {
  const days = Array.from({ length: 16 }, (_, i) => ({ day: i + 1, veg: i + 1, food: 19 - i, hpMedian: 90,
    samples: 10, famished: i === 0 ? 5 : 0, lowMood: i === 0 ? 2 : 0,
    raids: i === 4 ? [{ day: 5, n: 1, kind: 'bandit', rumorId: 7, rumorKind: 'provisions' }] : [] }));
  const segments = segmentReport(days);
  assert.deepEqual(segments.map(row => [row.from, row.to, row.raids]), [[1, 15, 1], [16, 16, 0]]);
  assert.deepEqual(segments[0].rumorTriggers, [{ day: 5, n: 1, kind: 'bandit', rumorId: 7, rumorKind: 'provisions' }]);
  assert.equal(segments[0].vegMedian, 8);
  assert.equal(segments[0].cookedFoodMedian, 12);
  assert.equal(segments[0].famishedShare, 0.033);
  assert.equal(segments[0].lowMoodShare, 0.013);
  assert.equal(segments[0].hpMedian, 90);
  const aggregate = aggregateSegments([{ segments }, { segments }]);
  assert.equal(aggregate[0].raidsTotal, 2);
  assert.equal(aggregate[0].vegMedian, 8);
});
