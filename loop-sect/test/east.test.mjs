import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createWorld } from '../src/sim.mjs';
import { rosterFor } from '../tools/soak-checks.mjs';
import { MAP_W } from '../src/data.mjs';

// M19b（暫停中，MAP_W 64）：往東加寬時，前 64 欄要跟以前一樣。這組雜湊是 loop 25 的地圖。
const OLD = { 1: '924179815b5f', 2: 'c29cae776ef2', 3: '9f353a105101', 4: '872a33a7ba90', 5: '86dda0b942d2' };

test('M19b-A1 前 64 欄跟以前一樣；大路與東山徑通到東邊', () => {
  for (const [seed, h] of Object.entries(OLD)) {
    const s = createWorld({ seed: Number(seed), people: rosterFor(Number(seed)) });
    assert.equal(s.map[0].length, MAP_W);
    assert.equal(createHash('md5').update(s.map.map((r) => r.slice(0, 64)).join('\n')).digest('hex').slice(0, 12), h, `seed ${seed}`);
    assert.equal(s.map[25][MAP_W - 1], ':');
    assert.equal(s.map[30][MAP_W - 1], ':');
  }
});
