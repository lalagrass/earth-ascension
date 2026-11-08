import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../../src/sim.mjs';

test('25e 山賊退去後喊援守柵指派解除，空飯有菜的人能改去煮', () => {
  const s = createState(1001, { kind: 'custom', hermitage: true, opening: 'solo' });
  const d = s.ds.find(x => x.id === 'hero');
  s.res.food = 0; s.res.veg = 10;
  d.needs.hunger = 0; d.needs.energy = 100;
  d.task = null; d.order = 'defend';
  assert.ok(!s.band);
  tick(s, 0.25);
  assert.equal(d.order, null);
  assert.equal(d.task?.act, 'cook');
});
