import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, scoreActs } from '../../../src/sim.mjs';

test('25b 餓昏且沒飯有菜先煮；有熟飯先吃', () => {
  const s = createState(17, { kind: 'custom', hermitage: true, opening: 'solo', starterArt: 'chunyangFist' });
  const d = s.ds.find(row => row.id === 'hero');
  d.needs.hunger = 0;
  d.needs.energy = 80;
  d.famished = true;
  s.res.veg = 64;
  s.res.food = 0;
  s.res.medFood = 0;
  const hungry = scoreActs(s, d);
  assert.equal(hungry[0].act, 'cook');
  assert.equal(hungry[0].layer, 'need');
  assert.equal(hungry[0].why, '沒飯了，先煮');
  assert.equal(hungry[0].f.base, 160, '沿用 eat 的餓昏資料列');
  s.res.food = 1;
  const fed = scoreActs(s, d);
  assert.equal(fed[0].act, 'eat');
  assert.equal(fed[0].layer, 'need');
});
