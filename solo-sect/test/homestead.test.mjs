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

test('H2：設施未完工不可用；種子播種收菜並用柴煮飯', () => {
  const s = createHomestead(); s.fac.hut.stage = 1; s.stock.wood = 8;
  assert.equal(startBlueprint(s, 'garden'), true);
  assert.equal(startBlueprint(s, 'kitchen'), true);
  assert.equal(startBlueprint(s, 'garden'), false);
  assert.equal(s.fac.garden.stage, 0);
  run(s, 450);
  assert.equal(s.fac.garden.stage, 1);
  assert.equal(s.fac.kitchen.stage, 1);
  assert.ok(s.log.some((x) => x.msg.includes('播下種子')));
  assert.ok(s.log.some((x) => x.msg.includes('收下青菜')));
  assert.ok(s.log.some((x) => x.msg.includes('煮出三份熱飯')));
  assert.ok(s.stock.seeds >= 1);
  assert.ok(s.stock.veg >= 0 && s.stock.meal >= 0 && s.stock.wood >= 0);
});

test('H2：儲物棚提高容量，修繕小屋提高休息效率', () => {
  const s = createHomestead(); s.fac.hut.stage = 1; s.stock.wood = 8;
  const base = s.cap.wood; assert.equal(startBlueprint(s, 'store'), true); run(s, 160);
  assert.equal(s.fac.store.stage, 1); assert.ok(s.cap.wood > base);
  s.stock.wood = 7; assert.equal(startBlueprint(s, 'hut'), true); run(s, 160);
  assert.equal(s.fac.hut.stage, 2);
  s.person.energy = 20; s.person.hunger = 90; setOrder(s, 'rest'); run(s, 10); assert.ok(s.person.energy >= 50, `${s.person.energy}`);
});

test('H2：取消在途材料、重點藍圖與舊 H1 檔相容', () => {
  const s = createHomestead(); s.fac.hut.stage = 1; s.stock.wood = 3; startBlueprint(s, 'kitchen'); setOrder(s, 'build');
  for (let i = 0; i < 100 && s.person.task?.phase !== 'deliver'; i++) tickHomestead(s);
  const before = totalWood(s) + (s.fac.kitchen.site?.delivered.wood || 0);
  setOrder(s, 'chop'); run(s, 10);
  assert.equal(s.stock.wood + (s.person.carry?.kind === 'wood' ? s.person.carry.amount : 0) + s.fac.kitchen.site.delivered.wood, before);
  assert.equal(s.fac.kitchen.site.reserved.wood, 0);
  const old = createHomestead(); for (const k of ['seeds', 'veg', 'meal']) { delete old.stock[k]; delete old.cap[k]; } for (const k of ['garden', 'kitchen', 'store']) delete old.fac[k]; delete old.plot;
  const loaded = loadHomestead(saveHomestead(old)); assert.ok(loaded.ok); assert.equal(loaded.state.stock.seeds, 2); assert.equal(loaded.state.fac.garden.stage, 0);
});

test('H2：缺種可從野果找回；十日自主循環有熱飯與閒暇', () => {
  const s = createHomestead(); s.fac.hut.stage = 2; s.fac.garden.stage = 1; s.fac.kitchen.stage = 1; s.fac.store.stage = 1;
  s.cap = { berries: 20, wood: 20, seeds: 10, veg: 16, meal: 15 }; s.stock.seeds = 0; s.stock.wood = 2;
  s.person.hunger = 30; s.person.energy = 30;
  run(s, 2400);
  assert.ok(s.stock.seeds > 0, '野果能恢復種子');
  assert.ok(s.log.some((x) => x.msg.includes('煮出三份熱飯')));
  assert.ok(s.person.leisure > 0 && s.person.hunger > 0 && s.person.energy > 0);
  assert.ok(Object.values(s.stock).every((v) => v >= 0));
});

test('H2：異常的在途、工地和需求存檔拒讀', () => {
  const s = createHomestead(); s.fac.hut.stage = 1; s.stock.wood = 1; startBlueprint(s, 'garden');
  const bad = structuredClone(s); bad.fac.garden.site.reserved.wood = 1;
  assert.equal(loadHomestead(saveHomestead(bad)).ok, false);
  bad.fac.garden.site.reserved.wood = 0; bad.person.hunger = Number.NaN;
  assert.equal(loadHomestead(saveHomestead(bad)).ok, false);
  const wrongPlace = structuredClone(s); wrongPlace.person.task = { act: 'build', phase: 'fetch', place: 'home', timer: 0, mat: 'wood' };
  assert.equal(loadHomestead(saveHomestead(wrongPlace)).ok, false, '建造取料的地點不可為 home');
  const transit = createHomestead(); transit.stock.wood = 2; startBlueprint(transit, 'hut'); setOrder(transit, 'build');
  for (let i = 0; i < 100 && transit.person.task?.phase !== 'deliver'; i++) tickHomestead(transit);
  assert.equal(loadHomestead(saveHomestead(transit)).ok, true, '正常在途檔可讀');
  transit.fac.hut.site.reserved.wood = 2;
  assert.equal(loadHomestead(saveHomestead(transit)).ok, false, '多出的一份預約會卡住工地，必須拒讀');
  const missingWild = createHomestead(); delete missingWild.fac.berries;
  assert.equal(loadHomestead(saveHomestead(missingWild)).ok, false, '缺少野果地塊不能載入後崩潰');
});
