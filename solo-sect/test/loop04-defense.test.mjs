// loop4 M4：石牆升級、修補材料底線、野豬會撞破柵、防洗版日誌、執事把柵算進去
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { FENCE, buildFence, upgradeFence, canUpgradeFence, repairScore, boarRam, repairDone } from '../src/fence.mjs';
import { T, raidAuto, fenceHolds } from '../src/threat.mjs';

const logs = (s) => (s.log || []).map((x) => (typeof x === 'string' ? x : x.msg || x.text || JSON.stringify(x))).join('\n');
const fenced = (seed = 1) => { const s = createState(seed); s.res.wood = 20; s.res.stone = 0; buildFence(s); return s; };

test('石牆：石不夠被擋；夠就扣 12 石、耐久上限 150、修補改耗石', () => {
  const s = fenced(); assert.equal(canUpgradeFence(s).ok, false); assert.equal(upgradeFence(s).ok, false);
  s.res.stone = 20; assert.equal(upgradeFence(s).ok, true); assert.equal(s.res.stone, 8); assert.equal(s.fence.max, 150); assert.equal(s.fence.hp, 150);
  assert.equal(upgradeFence(s).ok, false, '已是最高');
  s.fence.hp = 100; const w = s.res.wood, st = s.res.stone; repairDone(s, s.ds[0]);
  assert.equal(s.res.wood, w); assert.equal(s.res.stone, st - 1); assert.equal(s.fence.hp, 125);
});

test('材料底線：倉裡料 ≤ 底線就不廣告修柵', () => {
  const s = fenced(); s.fence.hp = 10;
  s.res.wood = FENCE.floor; for (const d of s.ds) assert.equal(repairScore(s, d), 0);
  s.res.wood = FENCE.floor + 1; assert.ok(s.ds.some((d) => d.adult !== false && repairScore(s, d) > 0));
});

test('野豬：連撞會撞破低耐久柵（不再全擋），且擋住時不每次記日誌', () => {
  const s = fenced(); const n0 = (s.log || []).length;
  assert.equal(boarRam(s), true); assert.equal(s.fence.hp, 36); assert.equal((s.log || []).length, n0, '還在一半以上不記'); assert.equal(boarRam(s), true); assert.equal(s.fence.hp, 12); assert.equal(s.log.length, n0 + 1, '跌破一半記一次');
  s.fence.hp = 59; s.fence.warned = true; const n1 = s.log.length; boarRam(s); assert.equal(s.log.length, n1, '已警告過不再記');
  s.fence.hp = 20; assert.equal(boarRam(s), false); assert.equal(s.fence.hp, 0); assert.match(logs(s), /撞破/);
});

test('5 日長跑：柵相關日誌 ≤ 每日 2 行（野豬下山、拱菜是原有日誌，不算）', () => {
  const s = fenced(2); for (let i = 0; i < 600 * 5 / 0.25; i++) tick(s, 0.25);
  const n = (logs(s).match(/撞柵|撞破|修補完好|木柵（耐久/g) || []).length; assert.ok(n <= 10, `柵日誌 ${n} 行`);
});

test('執事：有柵且守得住就迎戰；沒柵維持舊判斷', () => {
  const s = fenced(); s.day = 20; s.res.coin = 200; s.res.food = 50;
  T(s).pending = { n: 1, pts: 40, demand: 10, p: 0.1, at: s.t, until: s.t + 99, day: s.day };
  assert.equal(fenceHolds(s, 40), true); assert.equal(raidAuto(s), 1);
  const o = createState(1); o.day = 20; o.res.coin = 200; o.res.food = 50; T(o).pending = { ...T(s).pending };
  assert.equal(fenceHolds(o, 40), false); assert.equal(raidAuto(o), 0, '沒柵：勒索金小於預期損失就付');
});
