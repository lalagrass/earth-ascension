import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../../src/sim.mjs';
import { FACILITIES, NODES } from '../../../src/data.mjs';
import { freeSpot, registry, reserve } from '../../../src/core.mjs';
import { ringCapacity } from '../../../src/tactics.mjs';

test('N47 外功場升至 Lv1 後，額外實體站位可同時讓更多人練功', () => {
  const s = createState(17, { kind: 'bare', askMajor: false });
  const cap = () => registry(s).find((row) => row.fac === 'yard' && row.act === 'train').cap;
  const before = cap();
  s.fac.yard.stage = 2;
  assert.ok(cap() > before);
  for (let i = 0; i < cap(); i++) {
    const spot = freeSpot(s, 'yard', 'train', { id: `trainee${i}` });
    assert.ok(spot, `第 ${i + 1} 人能取得不同站位`);
    reserve(s, { id: `trainee${i}` }, spot.key);
  }
  assert.equal(freeSpot(s, 'yard', 'train', { id: 'extra' }), null);
  assert.equal(FACILITIES.find((f) => f.id === 'clinic').stages.length, 4);
  const defender = { pos: [NODES.gate[0] - 24, NODES.gate[1]] };
  assert.equal(ringCapacity(defender, s), 2);
  s.fence = { lv: 2 };
  assert.equal(ringCapacity(defender, s), 1);
});
