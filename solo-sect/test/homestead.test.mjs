import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomestead, startBlueprint, setOrder, setHelperOrder, inviteHelper, acceptApprentice, askHelperLeave, visitorHere, blockReason, tickHomestead, saveHomestead, loadHomestead, DAY } from '../src/homestead.mjs';
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
  const migrated = loadHomestead(saveHomestead(old)); assert.ok(migrated.ok); assert.equal(migrated.state.version, 3);
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

const until = (s, check, limit = 4000) => { for (let i = 0; i < limit && !check(); i++) tickHomestead(s); assert.ok(check(), `等待狀態逾時：${JSON.stringify({ t: s.t, task: s.person.task, helper: s.helper?.task, herbPlot: s.herbPlot, stock: s.stock })}`); };

test('H5a：實際建屋、建藥田、採插穗與兩輪收穫，熟練改變產量', () => {
  const s = createHomestead(); assert.equal(startBlueprint(s, 'herbGarden'), false);
  assert.equal(startBlueprint(s, 'hut'), true); until(s, () => s.fac.hut.stage === 1, 3000);
  assert.equal(startBlueprint(s, 'herbGarden'), true); until(s, () => s.fac.herbGarden.stage === 1, 1800);
  setOrder(s, 'herbal'); until(s, () => s.stock.herbs >= 1 && !s.person.carry);
  assert.equal(s.stock.herbs, 1); assert.equal(s.person.herbalSkill, 1);
  setOrder(s, 'herbFarm'); until(s, () => s.herbPlot.state === 'growing'); assert.equal(s.stock.herbs, 0);
  const mid = loadHomestead(saveHomestead(s)); assert.ok(mid.ok); assert.deepEqual(mid.state, s);
  until(s, () => s.herbPlot.state === 'ripe'); until(s, () => s.person.carry?.kind === 'herbs');
  assert.equal(s.person.carry.amount, 2); until(s, () => s.stock.herbs === 2 && !s.person.carry);
  until(s, () => s.herbPlot.state === 'growing'); assert.equal(s.stock.herbs, 1);
  until(s, () => s.herbPlot.state === 'ripe'); until(s, () => s.person.carry?.kind === 'herbs');
  assert.equal(s.person.carry.amount, 3); until(s, () => s.stock.herbs === 4 && !s.person.carry);
  assert.ok(s.person.herbalSkill >= 5); assert.equal(loadHomestead(saveHomestead(s)).ok, true);
});

test('H5a：每日調養只在需要時扣一份，取消與重複操作不能刷', () => {
  const s = createHomestead(); s.stock.herbs = 3; s.person.energy = 50;
  setOrder(s, 'selfCare'); run(s, 5); assert.equal(s.stock.herbs, 2); assert.equal(s.person.careDay, 1);
  setOrder(s, 'rest'); setOrder(s, 'selfCare'); run(s, 6); assert.equal(s.stock.herbs, 2);
  const mid = loadHomestead(saveHomestead(s)); assert.ok(mid.ok); assert.equal(mid.state.person.careDay, 1);
  s.t = DAY + 65; s.day = 2; s.person.energy = 80; setOrder(s, 'rest'); setOrder(s, 'selfCare'); run(s, 6);
  assert.equal(s.stock.herbs, 2, '精力足夠不得扣藥');
  s.person.energy = 50; until(s, () => s.person.careDay === 2, 100); assert.equal(s.stock.herbs, 1);
  const tired = createHomestead(); tired.person.energy = 0; tired.stock.herbs = 1; setOrder(tired, 'selfCare');
  until(tired, () => tired.person.careDay === 1, 80); assert.ok(tired.person.energy > 0);
});

test('H5a：幫手調養消耗一次草藥，離開再來不重置當日額度', () => {
  const s = host(); s.stock.herbs = 2; s.helper.energy = 10; s.person.energy = 80;
  setOrder(s, 'helperCare'); until(s, () => s.helper.careDay === 1, 100);
  assert.equal(s.stock.herbs, 1); assert.ok(s.helper.energy > 10);
  assert.equal(askHelperLeave(s), true); until(s, () => !s.helper);
  assert.equal(s.visitor.careDay, 1);
  run(s, 230); assert.equal(inviteHelper(s), true);
  assert.equal(s.helper.careDay, 1); assert.equal(loadHomestead(saveHomestead(s)).ok, true);
});

test('H5a：學徒可照料藥田；改令釋放地塊，在途草藥離開前入倉', () => {
  const s = host(); s.visitor.role = 'apprentice'; s.visitor.apprenticeDay = 1; s.fac.herbGarden.stage = 1; s.stock.herbs = 1;
  assert.equal(setHelperOrder(s, 'herbFarm'), true); tickHomestead(s);
  assert.equal(s.leases.herbGarden, 'helper'); assert.equal(s.helper.task.act, 'herbFarm');
  setHelperOrder(s, 'chop'); assert.equal(s.leases.herbGarden, null); assert.equal(s.stock.herbs, 1);
  setHelperOrder(s, 'herbFarm'); until(s, () => s.herbPlot.state === 'ripe');
  until(s, () => s.helper.carry?.kind === 'herbs'); const amount = s.helper.carry.amount;
  assert.ok([2, 3].includes(amount)); assert.equal(loadHomestead(saveHomestead(s)).ok, true);
  assert.equal(askHelperLeave(s), true); until(s, () => !s.helper);
  assert.equal(s.stock.herbs, amount); assert.equal(s.leases.herbGarden, null);
});

test('H5a：v1/v2 舊檔遷移及異常藥田預約、在途拒讀', () => {
  const v2 = host(); v2.version = 2;
  delete v2.fac.herbGarden; delete v2.herbPlot; delete v2.person.herbalSkill; delete v2.person.careDay;
  delete v2.helper.herbalSkill; delete v2.helper.careDay; delete v2.visitor.herbalSkill; delete v2.visitor.careDay; delete v2.leases.herbGarden;
  const migrated = loadHomestead(saveHomestead(v2)); assert.ok(migrated.ok); assert.equal(migrated.state.version, 3);
  assert.equal(migrated.state.fac.herbGarden.stage, 0); assert.equal(migrated.state.helper.herbalSkill, 0);
  const bad = createHomestead(); bad.fac.herbGarden.stage = 1; bad.leases.herbGarden = 'helper';
  assert.equal(loadHomestead(saveHomestead(bad)).ok, false);
  bad.leases.herbGarden = null; bad.person.carry = { kind: 'herbs', amount: 100, origin: 'wild' };
  assert.equal(loadHomestead(saveHomestead(bad)).ok, false);
  assert.equal(loadHomestead(saveHomestead({ ...bad, version: 99 })).ok, false);
});

test('H5b：停工原因與需求優先按實際狀態變更', () => {
  const s = createHomestead(); s.fac.hut.stage = 1; s.fac.garden.stage = 1; s.fac.kitchen.stage = 1;
  assert.equal(blockReason(s, 'farm'), null);
  s.plot.state = 'growing'; assert.match(blockReason(s, 'farm'), /生長/);
  s.plot.state = 'empty'; s.stock.seeds = 0; assert.match(blockReason(s, 'farm'), /缺菜種/);
  s.plot.state = 'ripe'; s.stock.veg = 7; assert.match(blockReason(s, 'farm'), /需空位 2 格，現有 1 格/);
  s.plot.state = 'empty'; s.stock.veg = 0;
  assert.match(blockReason(s, 'cook'), /缺青菜/);
  s.stock.veg = 2; assert.match(blockReason(s, 'cook'), /缺木料/);
  s.stock.wood = 1; assert.equal(blockReason(s, 'cook'), null);
  s.person.hunger = 20; assert.match(blockReason(s, 'cook'), /缺糧|先吃/);
  const h = host(); h.fac.herbGarden.stage = 1; h.visitor.role = 'apprentice'; setHelperOrder(h, 'herbFarm');
  assert.match(blockReason(h, 'herbFarm', 'helper'), /缺一份草藥/);
  h.fac.garden.stage = 1; h.plot.state = 'ripe'; tickHomestead(h);
  assert.equal(h.helper.task?.act, 'farm', '缺藥時應改做可收的食物田');
  setHelperOrder(h, null); setHelperOrder(h, 'herbFarm'); h.helper.hunger = 20; tickHomestead(h); assert.notEqual(h.helper.task?.act, 'herbFarm');
  assert.ok(['forage', 'eat', 'return'].includes(h.helper.task?.act));
  const leaving = host(); leaving.stock.herbs = 1; leaving.helper.energy = 40;
  assert.equal(askHelperLeave(leaving), true); setOrder(leaving, 'helperCare');
  assert.match(blockReason(leaving, 'helperCare'), /回村/);
  assert.match(blockReason(leaving, 'talkHelper'), /回村/);
  tickHomestead(leaving); assert.equal(leaving.stock.herbs, 1, '離開中不能遠端調養');
  const full = createHomestead(); full.fac.herbGarden.stage = 1; full.herbPlot.state = 'ripe'; full.person.herbalSkill = 3; full.stock.herbs = 4;
  assert.match(blockReason(full, 'herbFarm'), /需空位 3 格，現有 2 格/);
});

test('H5b：三種性情獨居與雙人派工 20 日維持飲食、休息與熱飯', () => {
  for (const personality of ['quiet', 'sociable', 'diligent']) for (const mode of ['solo', 'auto', 'farm', 'chop', 'herbFarm']) {
    const s = createHomestead({ personality }); s.fac.hut.stage = 2; s.fac.garden.stage = 1; s.fac.kitchen.stage = 1; s.fac.herbGarden.stage = 1;
    s.fac.store.stage = 1; s.cap = { berries: 20, wood: 20, seeds: 10, veg: 16, meal: 15, herbs: 10 };
    s.stock.herbs = 1; s.t = 70;
    if (mode !== 'solo') { s.visitor.trust = 4; s.visitor.willing = true; inviteHelper(s); if (mode === 'herbFarm') { s.visitor.role = 'apprentice'; s.visitor.apprenticeDay = 1; } if (mode !== 'auto') setHelperOrder(s, mode); }
    let minH = 100, minEnergy = 100, meals = 0, last = s.log[0];
    for (let i = 0; i < DAY * 20 * 4; i++) { tickHomestead(s); minH = Math.min(minH, s.person.hunger, s.helper?.hunger ?? 100); minEnergy = Math.min(minEnergy, s.person.energy, s.helper?.energy ?? 100); if (s.log[0] !== last) { if (s.log[0]?.msg.includes('煮出三份熱飯')) meals++; last = s.log[0]; } }
    assert.ok(minH > 0 && minEnergy > 0, `${personality}/${mode}: hunger ${minH}, energy ${minEnergy}`);
    assert.ok(meals > 0 && s.person.leisure > 0, `${personality}/${mode}: meals ${meals}, leisure ${s.person.leisure}`);
    assert.equal(loadHomestead(saveHomestead(s)).ok, true, `${personality}/${mode}`);
  }
});

test('H5b：從少量庫存跑八日，單雙人均完成三輪菜與飯，消耗帳相符', () => {
  for (const people of [1, 2]) {
    const s = createHomestead(); s.fac.hut.stage = 1; s.fac.garden.stage = 1; s.fac.kitchen.stage = 1; s.stock.wood = 1; s.t = 70;
    if (people === 2) { s.visitor.trust = 2; s.visitor.willing = true; inviteHelper(s); setHelperOrder(s, 'farm'); }
    let last = s.log[0], harvests = 0, cooks = 0, hotMealsEaten = 0, minH = 100;
    for (let i = 0; i < DAY * 8 * 4; i++) {
      tickHomestead(s);
      for (let j = 0; s.log[j] && s.log[j] !== last; j++) {
        const msg = s.log[j].msg;
        if (msg.includes('收下青菜') || msg.includes('收菜後')) harvests++;
        if (msg.includes('煮出三份熱飯')) cooks++;
        if (msg.includes('吃了一份熱飯')) hotMealsEaten++;
      }
      last = s.log[0]; minH = Math.min(minH, s.person.hunger, s.helper?.hunger ?? 100);
    }
    assert.ok(harvests >= 3 && cooks >= 3 && hotMealsEaten >= 3, `${people} 人：${harvests} 收菜、${cooks} 煮飯、${hotMealsEaten} 吃飯`);
    assert.equal(s.stock.meal, cooks * 3 - hotMealsEaten, '已煮與已吃應精確對上庫存');
    assert.ok(minH > 0 && s.person.leisure > 0, `${people} 人最低飢餓 ${minH}`);
  }
});

test('H5b：照料前、田間生長及幫手受派中，重載後逐拍一致', () => {
  const s = host(); s.fac.herbGarden.stage = 1; s.fac.garden.stage = 1; s.fac.kitchen.stage = 1;
  s.stock.herbs = 2; s.herbPlot.state = 'growing'; s.herbPlot.growth = 21;
  setHelperOrder(s, 'farm'); tickHomestead(s);
  s.person.energy = 45; setOrder(s, 'helperCare'); s.helper.energy = 30;
  const copy = loadHomestead(saveHomestead(s)); assert.ok(copy.ok); assert.deepEqual(copy.state, s);
  for (let i = 0; i < 300; i++) { tickHomestead(s); tickHomestead(copy.state); assert.deepEqual(copy.state, s); }
});

test('H5b：五組固定改令／離開／存讀 20,000 tick 不失守恆與容量', () => {
  for (let seed = 1; seed <= 5; seed++) {
    let randomState = seed; const roll = () => ((randomState = (randomState * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    let s = host(); s.fac.garden.stage = 1; s.fac.kitchen.stage = 1; s.fac.herbGarden.stage = 1; s.stock.herbs = 2;
    s.visitor.role = 'apprentice'; s.visitor.apprenticeDay = 1;
    for (let i = 0; i < 20000; i++) {
      if (i % 97 === 0) setOrder(s, [null, 'farm', 'herbFarm', 'herbal', 'selfCare', 'helperCare', 'cook', 'chop', 'rest'][Math.floor(roll() * 9)]);
      if (i % 113 === 0 && s.helper) setHelperOrder(s, [null, 'farm', 'herbFarm', 'chop'][Math.floor(roll() * 4)]);
      if (i % 503 === 0) { if (s.helper && roll() < .3) askHelperLeave(s); else if (!s.helper) inviteHelper(s); }
      tickHomestead(s);
      if (i % 53 === 0) { const loaded = loadHomestead(saveHomestead(s)); assert.ok(loaded.ok, `${seed}/${i}: ${loaded.error}`); assert.deepEqual(loaded.state, s); s = loaded.state; }
    }
  }
});
