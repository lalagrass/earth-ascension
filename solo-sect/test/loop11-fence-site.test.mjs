import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { startFenceSite, canStartFenceSite, fenceSite, FENCE } from '../src/fence.mjs';
import { invariants as checkInvariants } from '../src/lifecycle.mjs';

const run = (s, n) => { for (let i = 0; i < n && fenceSite(s); i++) tick(s, 6); return s; };
test('loop11 立藍圖不立刻扣料、不立刻有柵', () => {
  const s = createState(1); s.res.wood = 20; const r = startFenceSite(s); assert.ok(r.ok);
  assert.equal(s.res.wood, 20); assert.equal(s.fence, undefined); assert.deepEqual(fenceSite(s).need, { wood: FENCE.cost.wood, stone: 0 });
  assert.equal(canStartFenceSite(s).ok, false);
});
test('loop11 弟子搬木施工 → 木柵完工、料從院倉扣', () => {
  const s = createState(1); s.res.wood = 20; startFenceSite(s); run(s, 2400);
  assert.ok(s.fence, '應完工'); assert.equal(s.fence.lv, 1); assert.equal(fenceSite(s), null);
  assert.ok(s.log.some((l) => /送 .* 木到工地料堆/.test(l.msg)));
});
test('loop11 加砌石牆也走工地', () => {
  const s = createState(2); s.res.wood = 20; s.res.stone = 30; startFenceSite(s); run(s, 2400); assert.ok(s.fence);
  const c = canStartFenceSite(s); assert.equal(c.kind, 'up'); startFenceSite(s); assert.equal(s.fence.lv, 1); run(s, 3600);
  assert.equal(s.fence.lv, 2); assert.equal(s.fence.max, FENCE.levels[2].max);
});
test('loop11 柵工地期間不違反工地不變式', () => {
  if (typeof checkInvariants !== 'function') return;
  const s = createState(3); s.res.wood = 20; startFenceSite(s); for (let i = 0; i < 600; i++) { tick(s, 6); const b = checkInvariants(s); if (Array.isArray(b)) assert.deepEqual(b.filter((x) => /fence/.test(x)), []); }
});
