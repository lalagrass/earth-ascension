import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomestead, startBlueprint, setOrder, tickHomestead, saveHomestead, loadHomestead, DAY } from '../src/homestead.mjs';
const run = (s, seconds) => { for (let i = 0; i < seconds * 4; i++) tickHomestead(s); };
const totalWood = (s) => s.stock.wood + (s.person.carry?.kind === 'wood' ? s.person.carry.amount : 0) + (s.fac.hut.site?.delivered.wood || 0);

test('H1：孤身開局、自主採食搬回、建屋、睡眠改善', () => {
  const s = createHomestead({ name: '阿禾', personality: 'quiet' });
  assert.equal(s.person.name, '阿禾'); assert.equal(s.fac.hut.stage, 0);
  assert.equal(startBlueprint(s, 'hut'), true); assert.equal(startBlueprint(s, 'hut'), false);
  run(s, 550);
  assert.equal(s.fac.hut.stage, 1, JSON.stringify({ stock: s.stock, task: s.person.task, log: s.log.slice(0, 3) }));
  s.person.energy = 30; const e = s.person.energy; setOrder(s, 'rest'); run(s, 3); assert.ok(s.person.energy > e);
  assert.ok(s.log.some((x) => x.msg.includes('完工')));
});

test('H1：斷糧與耗力後仍能採食和睡眠恢復', () => {
  const s = createHomestead(); s.person.hunger = 0; s.person.energy = 0; s.stock.berries = 0; setOrder(s, 'chop');
  run(s, 160);
  assert.ok(s.person.hunger > 0, `${s.person.hunger}`);
  assert.ok(s.person.energy > 0, `${s.person.energy}`);
  assert.ok(s.log.some((x) => x.msg.includes('吃了野果')));
});

test('H1：取消在途建材與重複指派不複製木材', () => {
  const s = createHomestead(); s.stock.wood = 2; startBlueprint(s, 'hut'); setOrder(s, 'build');
  for (let i = 0; i < 100 && s.person.task?.phase !== 'deliver'; i++) tickHomestead(s);
  assert.equal(s.person.task?.phase, 'deliver'); const before = totalWood(s);
  setOrder(s, 'rest'); setOrder(s, 'rest'); run(s, 10);
  assert.equal(totalWood(s), before); assert.equal(s.fac.hut.site.reserved.wood, 0);
});

test('H1：荒居存讀保留在途與工地，拒絕本篇及未知版本', () => {
  const s = createHomestead(); s.stock.wood = 2; startBlueprint(s, 'hut'); setOrder(s, 'build');
  for (let i = 0; i < 100 && s.person.task?.phase !== 'deliver'; i++) tickHomestead(s);
  const r = loadHomestead(saveHomestead(s)); assert.ok(r.ok); assert.deepEqual(r.state, s);
  run(r.state, 10); assert.equal(totalWood(r.state), 2);
  assert.equal(loadHomestead(JSON.stringify({ ...s, kind: 'solo-sect' })).ok, false);
  assert.equal(loadHomestead(JSON.stringify({ ...s, version: 99 })).ok, false);
  assert.equal(loadHomestead('{bad').ok, false);
  run(s, DAY); assert.equal(s.day, 2);
});
