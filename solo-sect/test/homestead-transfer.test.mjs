import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY as H_DAY, createHomestead, saveHomestead, startBlueprint, inviteHelper, setHelperOrder, tickHomestead } from '../src/homestead.mjs';
import { previewTransfer, commitTransfer, TRANSFER_KEY } from '../src/homestead-transfer.mjs';
import { load, save, tick } from '../src/sim.mjs';

const SOURCE_KEY = 'solo-sect.homestead.v1';
const MAIN_KEY = 'solo-sect-save';
class MemoryStore {
  data = new Map();
  getItem(k) { return this.data.has(k) ? this.data.get(k) : null; }
  setItem(k, v) { this.data.set(k, String(v)); }
  removeItem(k) { this.data.delete(k); }
}
const source = (apprentice = false) => {
  const h = createHomestead({ name: '阿雲', personality: 'quiet' });
  h.fac.hut.stage = 2; h.fac.garden.stage = 1; h.fac.herbGarden.stage = 1; h.fac.kitchen.stage = 1; h.fac.store.stage = 1;
  h.cap = { berries: 20, wood: 20, seeds: 10, veg: 16, meal: 15, herbs: 10 };
  Object.assign(h.stock, { berries: 3, meal: 2, veg: 4, wood: 10, herbs: 5 }); h.person.herbalSkill = 8;
  if (apprentice) { h.t = 70; h.visitor.trust = 4; h.visitor.willing = true; assert.ok(inviteHelper(h)); h.visitor.role = 'apprentice'; h.visitor.apprenticeDay = 1; h.helper.herbalSkill = 6; }
  return h;
};
const oldSource = (v) => {
  const h = source(false); h.version = v;
  if (v <= 2) { delete h.fac.herbGarden; delete h.herbPlot; delete h.person.herbalSkill; delete h.person.careDay; delete h.visitor.herbalSkill; delete h.visitor.careDay; delete h.leases.herbGarden; }
  if (v === 1) { for (const k of ['herbs']) { delete h.stock[k]; delete h.cap[k]; delete h.wild[k]; delete h.fac[k]; } delete h.visitor; delete h.helper; delete h.leases; }
  return h;
};

test('H6a：獨居與同意學徒使用白名單；真本篇 loader 可跑一日再存讀', () => {
  for (const withApprentice of [false, true]) {
    const h = source(withApprentice), raw = saveHomestead(h), p = previewTransfer(raw);
    assert.ok(p.ok, p.error); assert.equal(raw, saveHomestead(h), '預演不改來源');
    assert.match(p.dropped.join(''), /修繕小屋休息率 9/);
    assert.match(p.dropped.join(''), /藥田栽種能力不保留/);
    const r = load(p.candidate); assert.ok(r.ok, r.err); const s = r.state;
    assert.deepEqual(s.ds.map((d) => d.id), withApprentice ? ['hero', 'homestead-apprentice'] : ['hero']);
    assert.equal(s.ds[0].name, h.person.name); assert.deepEqual(s.ds[0].personality, ['quiet']);
    assert.equal(s.ds[0].skills.herbal, 8); assert.equal(s.ds[0].needs.hunger, h.person.hunger);
    if (withApprentice) { assert.equal(s.ds[1].name, '阿蓮'); assert.equal(s.ds[1].role, 'outer'); assert.equal(s.ds[1].skills.herbal, 6); }
    assert.equal(s.fac.dorm.stage, 1); assert.equal(s.fac.hall.stage, 0);
    assert.equal(s.log.length, 1); assert.match(s.log[0].msg, /從荒居來到破道館/);
    assert.doesNotMatch(s.log[0].msg, /三人/);
    assert.deepEqual([s.res.food, s.res.veg, s.res.herb, s.res.wood], [5, 4, 5, 10]);
    for (let i = 0; i < 2400; i++) tick(s);
    assert.ok(s.t >= 600); assert.equal(s.day, 2); assert.ok(load(save(s)).ok);
    assert.deepEqual(s.ds.map((d) => d.id), withApprentice ? ['hero', 'homestead-apprentice'] : ['hero']);
  }
});

test('H6a：有效 v1/v2/v3 來源可預演，訪客／短住／離開不會偷帶入', () => {
  for (const version of [1, 2, 3]) { const p = previewTransfer(saveHomestead(oldSource(version))); assert.ok(p.ok, `${version}: ${p.error}`); assert.equal(p.sourceVersion, version); assert.equal(load(p.candidate).state.ds.length, 1); }
  const h = source(true); h.visitor.role = 'helper'; assert.ok(previewTransfer(saveHomestead(h)).ok); assert.equal(previewTransfer(saveHomestead(h)).apprentice, false);
  h.helper = null; h.visitor.role = 'visitor'; assert.equal(previewTransfer(saveHomestead(h)).apprentice, false);
  h.fac.hut.stage = 1; h.fac.garden.stage = 0; h.fac.kitchen.stage = 0; h.fac.herbGarden.stage = 0; h.herbPlot = { state: 'empty', growth: 0 };
  const bare = previewTransfer(saveHomestead(h)); assert.ok(bare.ok, bare.error);
  assert.match(bare.carried.join(''), /未建菜園/); assert.match(bare.carried.join(''), /未建藥田/);
  assert.match(bare.dropped.join(''), /簡陋木屋休息率 6/);
  assert.doesNotMatch(bare.dropped.join(''), /修繕小屋休息率 9/);
});

test('H6a：壞檔、未知版、未建屋、工地、在途與超量均明確拒絕', () => {
  assert.equal(previewTransfer('{bad').ok, false);
  const h = source(); h.version = 99; assert.equal(previewTransfer(saveHomestead(h)).ok, false);
  h.version = 3; h.fac.hut.stage = 0; assert.match(previewTransfer(saveHomestead(h)).error, /小屋/);
  h.fac.hut.stage = 1; assert.ok(startBlueprint(h, 'hut')); assert.match(previewTransfer(saveHomestead(h)).error, /藍圖/);
  h.fac.hut.site = null; h.person.carry = { kind: 'berries', amount: 1, origin: 'wild' }; h.person.task = { act: 'return', place: 'home', phase: 'go', timer: 0 };
  assert.match(previewTransfer(saveHomestead(h)).error, /在途/);
  h.person.carry = null; h.person.task = null; h.fac.store.stage = 0; h.stock.wood = 20;
  assert.match(previewTransfer(saveHomestead(h)).error, /上限/);
  h.stock.wood = 0; h.person.name = '<img onerror=alert(1)>';
  assert.match(previewTransfer(saveHomestead(h)).error, /名字/);
  h.person.name = '   '; assert.match(previewTransfer(saveHomestead(h)).error, /名字/);
});

test('H6b：確認僅寫新槽；取消、變更、重點、寫入失敗均不碰舊檔', () => {
  const store = new MemoryStore(), raw = saveHomestead(source(true));
  const oldMain = '{"old":"main bytes"}', auto = '{"old":"auto bytes"}';
  store.setItem(SOURCE_KEY, raw); store.setItem(MAIN_KEY, oldMain); store.setItem('solo-sect-auto-0', auto);
  const p = previewTransfer(raw); assert.ok(p.ok);
  assert.equal(store.getItem(TRANSFER_KEY), null, '預演與取消不寫入');
  store.setItem(SOURCE_KEY, raw + ' '); assert.match(commitTransfer(store, p).error, /變更/); store.setItem(SOURCE_KEY, raw);
  const broken = { ...store, getItem: store.getItem.bind(store), removeItem: store.removeItem.bind(store), setItem(k, v) { if (k === TRANSFER_KEY) throw new Error('quota'); store.setItem(k, v); } };
  assert.match(commitTransfer(broken, p).error, /寫入失敗/); assert.equal(store.getItem(TRANSFER_KEY), null);
  const partial = { getItem: store.getItem.bind(store), removeItem: store.removeItem.bind(store), setItem(k, v) { store.setItem(k, v); throw new Error('write interrupted'); } };
  assert.match(commitTransfer(partial, p).error, /寫入失敗/); assert.equal(store.getItem(TRANSFER_KEY), null, '寫入後報錯也須清理新槽');
  assert.ok(commitTransfer(store, p).ok); assert.equal(store.getItem(TRANSFER_KEY), p.candidate);
  assert.match(commitTransfer(store, p).error, /已有/);
  assert.equal(store.getItem(SOURCE_KEY), raw); assert.equal(store.getItem(MAIN_KEY), oldMain); assert.equal(store.getItem('solo-sect-auto-0'), auto);
});

test('H5 補證：每日記錄獨居／雙人的產出、食用與庫存，十二日無消耗初始庫存假象', () => {
  for (const people of [1, 2]) {
    const h = createHomestead(); h.fac.hut.stage = 1; h.fac.garden.stage = 1; h.fac.kitchen.stage = 1; h.stock.wood = 1; h.t = 70;
    if (people === 2) { h.visitor.trust = 2; h.visitor.willing = true; assert.ok(inviteHelper(h)); setHelperOrder(h, 'farm'); }
    let last = h.log[0], harvests = 0, cooks = 0, eaten = 0, berryEaten = 0;
    const days = [];
    for (let i = 0; i < H_DAY * 12 * 4; i++) {
      tickHomestead(h);
      for (let j = 0; h.log[j] && h.log[j] !== last; j++) {
        const msg = h.log[j].msg;
        if (msg.includes('收下青菜') || msg.includes('收菜後')) harvests++;
        if (msg.includes('煮出三份熱飯')) cooks++;
        if (msg.includes('吃了一份熱飯')) eaten++;
        if (msg.includes('吃了野果')) berryEaten++;
      }
      last = h.log[0];
      if (i % (H_DAY * 4) === H_DAY * 4 - 1) days.push({ harvests, producedMeals: cooks * 3, eatenMeals: eaten, berryEaten, stockMeals: h.stock.meal, stockBerries: h.stock.berries, stockVeg: h.stock.veg });
    }
    assert.equal(days.length, 12);
    for (const day of days) { assert.equal(day.stockMeals, day.producedMeals - day.eatenMeals); assert.ok(day.stockMeals >= 0); }
    assert.ok(days.at(-1).producedMeals > days.at(-1).eatenMeals, `${people} 人食物淨收支`);
    assert.ok(days.at(-1).harvests >= 6 && days.at(-1).stockMeals >= 4);
    assert.equal(days.at(-1).stockBerries, 8, '野果作求生備糧，熱飯仍由菜園持續產出');
  }
});
