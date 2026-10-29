import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomestead, startBlueprint, setOrder, setHelperOrder, inviteHelper, acceptApprentice, askHelperLeave, visitorHere, tickHomestead, saveHomestead, loadHomestead, DAY } from '../src/homestead.mjs';
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

test('H3：訪客按時段來去，喜靜者可一直獨居', () => {
  const s = createHomestead({ personality: 'quiet' });
  run(s, 59); assert.equal(visitorHere(s), false);
  run(s, 2); assert.equal(visitorHere(s), true);
  run(s, 110); assert.equal(visitorHere(s), false);
  run(s, DAY * 6);
  assert.equal(s.helper, null); assert.ok(s.person.hunger > 0 && s.person.energy > 0);
});

test('H3：三種性情都可選獨居並維持求生', () => {
  for (const personality of ['quiet', 'sociable', 'diligent']) {
    const s = createHomestead({ personality });
    run(s, DAY * 10);
    assert.equal(s.helper, null); assert.ok(s.person.hunger > 0 && s.person.energy > 0, personality);
    assert.equal(loadHomestead(saveHomestead(s)).ok, true);
  }
});

test('H3：交談與送飯每日只記一次，讀檔不重置', () => {
  const s = createHomestead(); s.t = 70; s.stock.meal = 2;
  setOrder(s, 'chat'); run(s, 20); assert.equal(s.visitor.trust, 1);
  setOrder(s, 'gift'); run(s, 20); assert.equal(s.visitor.trust, 2); assert.equal(s.stock.meal, 1);
  setOrder(s, 'chat'); run(s, 12); assert.equal(s.visitor.trust, 2);
  const loaded = loadHomestead(saveHomestead(s)); assert.ok(loaded.ok); assert.equal(loaded.state.visitor.lastGift, 1);
  run(loaded.state, 15); assert.equal(loaded.state.visitor.trust, 2);
});

test('H3：虛構草藥照料只消耗一次，事件不隨重載重來', () => {
  const s = createHomestead(); s.t = DAY + 70; s.day = 2; s.visitor.injury = true; s.stock.herbs = 2;
  setOrder(s, 'care'); run(s, 25);
  assert.equal(s.stock.herbs, 1); assert.equal(s.visitor.trust, 2); assert.equal(s.visitor.cared, true);
  setOrder(s, 'care'); run(s, 20); assert.equal(s.stock.herbs, 1); assert.equal(s.visitor.trust, 2);
  const loaded = loadHomestead(saveHomestead(s)); assert.ok(loaded.ok); assert.equal(loaded.state.visitor.cared, true);
});

const host = () => { const s = createHomestead(); s.t = 70; s.fac.hut.stage = 1; s.visitor.trust = 2; s.visitor.willing = true; assert.equal(inviteHelper(s), true); return s; };

test('H4：邀請需雙方意願；幫手獨立砍三次且主角能休閒', () => {
  const no = createHomestead(); no.t = 70; no.visitor.trust = 2; assert.equal(inviteHelper(no), false);
  no.fac.hut.stage = 1; assert.equal(inviteHelper(no), false, '沒有對方意願仍不可邀請');
  const s = host(); assert.equal(inviteHelper(s), false); setHelperOrder(s, 'chop'); setOrder(s, 'leisure'); run(s, 100);
  assert.ok(s.helper.work >= 3, `雜務 ${s.helper.work}`); assert.ok(s.person.leisure > 0);
  assert.equal(s.leases.wood, s.helper.task?.act === 'chop' ? 'helper' : null);
});

test('H4：兩人爭用菜園、改令、存讀與離開時物資守恆', () => {
  const s = host(); s.fac.garden.stage = 1; s.stock.seeds = 2;
  setOrder(s, 'farm'); setHelperOrder(s, 'farm');
  run(s, 8); assert.ok([null, 'person', 'helper'].includes(s.leases.garden));
  setOrder(s, 'rest'); setHelperOrder(s, 'chop');
  assert.equal(s.leases.garden, null);
  for (let i = 0; i < 600 && !s.helper.carry; i++) tickHomestead(s);
  assert.ok(s.helper.carry, '幫手有實際在途物資');
  const wood = s.stock.wood + (s.helper.carry.kind === 'wood' ? 1 : 0);
  const loaded = loadHomestead(saveHomestead(s)); assert.ok(loaded.ok);
  const r = loaded.state;
  assert.equal(askHelperLeave(r), true); assert.equal(askHelperLeave(r), false);
  run(r, 20); assert.equal(r.helper, null); assert.equal(r.visitor.role, 'visitor');
  assert.equal(r.stock.wood, wood); assert.equal(r.leases.wood, null);
});

test('H4：同住後談天可達雙方同意收徒，不能同日強收', () => {
  const s = host(); s.visitor.trust = 3;
  assert.equal(acceptApprentice(s), false);
  run(s, DAY); assert.equal(s.day, 2);
  setOrder(s, 'talkHelper'); run(s, 12);
  assert.ok(s.visitor.trust >= 4); assert.equal(acceptApprentice(s), true); assert.equal(acceptApprentice(s), false);
});

test('H4：晚間邀請跨過午夜仍未住滿一日', () => {
  const s = createHomestead(); s.t = 169.75; s.fac.hut.stage = 1; s.visitor.trust = 4; s.visitor.willing = true;
  assert.equal(inviteHelper(s), true); assert.equal(s.visitor.inviteTime, 169.75);
  run(s, 71); assert.equal(s.day, 2); assert.equal(acceptApprentice(s), false);
  run(s, DAY - 71); s.helper.hunger = 80;
  assert.equal(acceptApprentice(s), true);
  assert.equal(loadHomestead(saveHomestead(s)).ok, true);
});

test('H4：H1–H2 v1 舊檔遷移與雙人壞檔拒讀', () => {
  const old = createHomestead(); old.version = 1;
  for (const k of ['herbs']) { delete old.stock[k]; delete old.cap[k]; delete old.wild[k]; delete old.fac[k]; }
  for (const k of ['visitor', 'helper', 'leases']) delete old[k];
  const migrated = loadHomestead(saveHomestead(old)); assert.ok(migrated.ok); assert.equal(migrated.state.version, 2);
  const s = host(); setHelperOrder(s, 'chop'); run(s, 3);
  const bad = structuredClone(s); bad.leases.wood = null;
  assert.equal(loadHomestead(saveHomestead(bad)).ok, false);
  const badRole = structuredClone(s); badRole.visitor.role = 'visitor';
  assert.equal(loadHomestead(saveHomestead(badRole)).ok, false);
  assert.equal(loadHomestead(saveHomestead(s)).ok, true);
});

test('H4：離開後同日不可重邀，隔日回來保留需求與學徒身份', () => {
  const s = host(); s.visitor.role = 'apprentice'; s.visitor.apprenticeDay = 1;
  s.helper.hunger = 0; s.helper.energy = 0;
  assert.equal(askHelperLeave(s), true); tickHomestead(s);
  assert.equal(s.helper, null); assert.equal(inviteHelper(s), false);
  run(s, 230); assert.equal(s.day, 2);
  assert.equal(inviteHelper(s), true); assert.equal(s.visitor.role, 'apprentice');
  assert.equal(s.helper.hunger, 0); assert.equal(s.helper.energy, 0);
  assert.equal(loadHomestead(saveHomestead(s)).ok, true);
});

test('H4：幫手收菜在途存讀有效，額外獎勵鍵拒讀', () => {
  const s = host(); s.fac.garden.stage = 1; s.plot.state = 'ripe'; setHelperOrder(s, 'farm');
  for (let i = 0; i < 200 && s.helper.carry?.kind !== 'veg'; i++) tickHomestead(s);
  assert.equal(s.helper.carry?.kind, 'veg'); assert.equal(loadHomestead(saveHomestead(s)).ok, true);
  const bad = structuredClone(s); bad.helper.carry.bonus.wood = 3;
  assert.equal(loadHomestead(saveHomestead(bad)).ok, false);
});

test('H3 回歸：儲物棚完工保留草藥容量，採滿後可重讀', () => {
  const s = createHomestead(); s.fac.hut.stage = 1; s.stock.wood = 4;
  assert.equal(startBlueprint(s, 'store'), true); run(s, 160);
  assert.equal(s.fac.store.stage, 1); assert.equal(s.cap.herbs, 10);
  setOrder(s, 'herbal'); run(s, 220);
  assert.ok(s.stock.herbs <= s.cap.herbs);
  assert.equal(loadHomestead(saveHomestead(s)).ok, true);
});
