// Parked after T1 CI failure; original assertion(s) retained verbatim: 沒柵：迎戰仍一次結算，不生地圖山賊；有人守：弟子自主去守柵，把山賊打退；不扣錢、名聲上升; tracked in #496.
// loop3 M3：有木柵時山賊上地圖、沿山路撞柵、弟子自主守柵
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../src/sim.mjs';
import { EDGES } from '../../src/data.mjs';
import { FENCE, buildFence } from '../../src/threat.mjs';
import { BAND, nodePath } from '../../src/threat.mjs';
import { T, raidResolve } from '../../src/threat.mjs';

const H = { think: () => {} };
const setup = (fence = true, pts = 80) => { const s = createState(1); s.day = 20; s.res.coin = 100; s.res.food = 50; s.res.wood = 20; if (fence) buildFence(s);
  T(s).pending = { n: 1, pts, demand: 999, p: 0, at: s.t, until: s.t + 9999, day: s.day }; return s; };
const runUntil = (s, f, max = 4000) => { let n = 0; while (!f() && n++ < max) tick(s, 0.25); return n; };

test('沒柵：迎戰仍一次結算，不生地圖山賊', () => { const s = setup(false); const r = raidResolve(s, 1, H); assert.equal(r.band, undefined); assert.equal(s.band, undefined); });

test('有人守：弟子自主去守柵，把山賊打退；不扣錢、名聲上升', () => {
  const s = setup(true, 40); const rep0 = s.rep || 0; raidResolve(s, 1, H); let saw = false;
  runUntil(s, () => { if (s.ds.some((d) => d.task?.act === 'defend')) saw = true; return !s.band; });
  assert.ok(saw, '應有人自主選守柵'); assert.equal(s.band, null);
  const h = T(s).hist.at(-1); assert.equal(h.fight, 'win'); assert.ok(s.rep > rep0); assert.equal(s.res.coin >= 100 - 0, true);
  assert.ok(s.fence.hp > 0);
});
