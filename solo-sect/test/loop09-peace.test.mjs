import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { PEACE, peaceDelay, mateBonus, fenceNeeds, demandBoost } from '../src/peace.mjs';
import { EXP } from '../src/data.mjs';
import { buildFence } from '../src/fence.mjs';

const sp = (o = {}) => ({ kind: 'custom', name: '測', answers: Array(9).fill(0), ...o });
const calm = (s) => { s.records ??= {}; s.records.qing = { foot: EXP.peaceQing }; };

test('loop9 預設關閉、關閉時全部為零', () => {
  const s = createState(3); assert.equal(s.m9, undefined); calm(s);
  assert.equal(peaceDelay(s), 0); assert.equal(mateBonus(s, s.ds[0], s.ds[1]), 0); assert.deepEqual(fenceNeeds(s), []);
  assert.equal(createState(3, sp({ peace: true })).m9, true);
});
test('loop9 太平才延後山賊', () => {
  const s = createState(3, sp({ peace: true })); assert.equal(peaceDelay(s), 0); calm(s); assert.equal(peaceDelay(s), PEACE.banditDelay);
});
test('loop9 搭子派隊加分有上限', () => {
  const s = createState(3, sp({ peace: true })); const [a, b] = s.ds; a.mates = { [b.id]: 2 }; assert.equal(mateBonus(s, a, b), 4);
  a.mates[b.id] = 99; assert.equal(mateBonus(s, a, b), PEACE.mateCap);
});
test('loop9 柵缺料 → 砍柴／採石意願提高', () => {
  const s = createState(3, sp({ peace: true })); s.res.wood = 50; if (!buildFence(s)) return assert.fail('buildFence');
  s.res.wood = 0; s.res.stone = 0; s.fence.hp = 10;
  const need = fenceNeeds(s); assert.ok(need.includes('wood')); assert.ok(need.includes('stone'));
  const out = [{ act: 'chop', score: 10 }, { act: 'quarry', score: 10 }, { act: 'train', score: 10 }];
  demandBoost(s, s.ds[0], out); assert.ok(out[0].score > 10 && out[1].score > 10); assert.equal(out[2].score, 10);
  s.res.wood = 99; s.res.stone = 99; assert.deepEqual(fenceNeeds(s), []);
});
test('loop9 開啟跑 5 天無錯', () => { for (const seed of [1, 2, 3]) { const s = createState(seed, sp({ peace: true })); for (let i = 0; i < 1200; i++) tick(s, 6); } });
test('loop10 柵還撐得住時修柵意願打折、快破時不打折', async () => {
  const { repairDamp } = await import('../src/peace.mjs');
  const s = createState(3, sp({ peace: true })); s.res.wood = 50; buildFence(s);
  const o1 = [{ act: 'repair', score: 10 }]; s.fence.hp = s.fence.max * 0.9; repairDamp(s, o1); assert.equal(o1[0].score, 10 * PEACE.repairCalm);
  const o2 = [{ act: 'repair', score: 10 }]; s.fence.hp = 1; repairDamp(s, o2); assert.equal(o2[0].score, 10);
  const off = createState(3); off.fence = { ...s.fence, hp: 50 }; const o3 = [{ act: 'repair', score: 10 }]; repairDamp(off, o3); assert.equal(o3[0].score, 10);
});
