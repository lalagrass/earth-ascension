import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, companionsFor, release, scorePois } from '../src/sim.mjs';
import { candidates } from '../src/ai.mjs';
import { urgency } from '../src/needs.mjs';
import { SUPPER } from '../src/data.mjs';

// M22 暫停中（SUPPER.K 0）；規則照試做值 K 1 測。
const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
function eatOf(s, p, food, energy) {
  release(s, p); p.task = null; p.act = 'idle'; p.wait = 0;
  p.needs = { food, energy, social: 80, fun: 80 };
  const table = s.objects.find((o) => o.kind === 'table');
  return candidates(s, p, scorePois).list.find((c) => c.kind === 'eat' && c.obj === table.id);
}

test('M22-A1 飽食 < FOOD 時，吃飯需求多 K × 精力緊迫；飽食 ≥ FOOD 時沒有', () => {
  const s = world(); s.stock.meal = 5;
  const p = s.people[0];
  const off = eatOf(s, p, 50, 20).f.need;
  SUPPER.K = 1;
  try {
    const on = eatOf(s, p, 50, 20);
    assert.ok(Math.abs(on.f.need - off - urgency(20)) < 1e-9, `${off} → ${on.f.need}`);
    assert.match(on.label, /睡前先吃一口/);
    const full = eatOf(s, p, SUPPER.FOOD, 20).f.need;
    assert.ok(Math.abs(full - 2 * urgency(SUPPER.FOOD)) < 1e-9, '飽食到門檻就不加');
  } finally { SUPPER.K = 0; }
});
