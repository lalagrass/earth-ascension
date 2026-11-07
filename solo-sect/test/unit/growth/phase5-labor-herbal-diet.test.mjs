import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, emergency, foodLow, scoreActs, setOrder, tick } from '../../../src/sim.mjs';
import { BODY_CONDITION, stepWorkCondition, restBodyCondition, ensureBodyCondition, cookMedicatedMeal, applyMedicatedMeal } from '../../../src/economy.mjs';
import { choreFluencyTier, ergonomicFrame } from '../../../src/growth-playback.mjs';
import { renderMicroStage } from '../../../src/pose-render.mjs';
import { gainArt } from '../../../src/arts.mjs';

test('Phase 5：未採藥的一日做活至疲勞滿，體魄受 18 與 1.2 上限，歇息後須等次日', () => {
  const old = createState(42), oldHero = old.ds[0];
  assert.equal(stepWorkCondition(oldHero, old, 'chop').active, false);
  assert.equal('muscleFatigue' in oldHero, false);
  const s = createState(42, { hermitage: true }), d = s.ds[0];
  d.skills.strength = 10;
  for (let i = 0; i < 4; i++) stepWorkCondition(d, s, 'chop');
  assert.ok(Math.abs(d.skills.strength - 11.2) < 1e-9);
  assert.equal(d.muscleFatigue, 100); assert.equal(d.soreness, true);
  stepWorkCondition(d, s, 'chop'); assert.ok(Math.abs(d.skills.strength - 11.2) < 1e-9);
  assert.equal(restBodyCondition(d, s), true); assert.equal(d.recoveryCyclesToday, 1);
  stepWorkCondition(d, s, 'chop'); assert.ok(Math.abs(d.skills.strength - 11.2) < 1e-9);
  s.day++; ensureBodyCondition(d, s.day); assert.equal(d.recoveryCyclesToday, 0);
  d.skills.strength = 17.9; stepWorkCondition(d, s, 'chop'); assert.equal(d.skills.strength, BODY_CONDITION.mundaneCap);
  s.res.herb = 0; assert.equal(cookMedicatedMeal(s, d), null); assert.equal(s.res.medFood, 0);
});

test('Phase 5：黃蓉煮飯和用飯走真任務，藥膳消疲勞、四週期並破 18', () => {
  const s = createState(17, { hermitage: true, partner: 'huangrong' }), d = s.ds[1];
  s.res.veg = 10;
  assert.equal(setOrder(s, d.id, 'forage'), true);
  for (let i = 0; i < 4000 && !s.res.herb; i++) tick(s);
  assert.ok(s.res.herb >= 1, '採藥任務將草藥帶回庫存');
  assert.equal(setOrder(s, d.id, 'cook'), true);
  for (let i = 0; i < 4000 && !s.res.medFood; i++) tick(s);
  assert.equal(s.res.medFood, 1); assert.equal(s.res.herb, 0);
  assert.equal(s.medFoodBatches[0].name, '桃花歸元藥膳');
  d.muscleFatigue = 100; d.soreness = true; d.skills.strength = 18;
  assert.equal(setOrder(s, d.id, 'eat'), true); d.needs.hunger = 10;
  for (let i = 0; i < 4000 && !(d.herbalDietUntil > s.t); i++) tick(s);
  assert.equal(s.res.medFood, 0); assert.equal(d.muscleFatigue, 35);
  assert.equal(d.maxCyclesToday, 4); assert.equal(d.recoveryCyclesToday, 1);
  stepWorkCondition(d, s, 'chop'); assert.ok(d.skills.strength > 18 && d.skills.strength <= 36);
  for (let i = 0; i < 12; i++) { stepWorkCondition(d, s, 'chop'); if (d.soreness) restBodyCondition(d, s); }
  assert.ok(d.bodyGainToday > BODY_CONDITION.dailyGain, '藥膳容許當日第二輪以上成長');
  assert.ok(d.bodyGainToday <= BODY_CONDITION.dailyGain * 4);
  const ordinary = createState(19, { hermitage: true }), cook = ordinary.ds[0]; ordinary.res.herb = 1;
  cookMedicatedMeal(ordinary, cook); assert.equal(applyMedicatedMeal(cook, ordinary).cycles, 3);
  const batch = createState(19, { hermitage: true }); batch.res.food = 1; batch.res.herb = 1;
  assert.ok(cookMedicatedMeal(batch, batch.ds[0]));
  assert.equal(batch.res.food, 0); assert.equal(batch.res.medFood, 1); assert.equal(batch.res.herb, 0);
  assert.equal(batch.ledger.out.food, 1); assert.equal(batch.ledger.out.herb, 1); assert.equal(batch.ledger.in.medFood, 1);
  for (const plainFood of [0, 1]) {
    const mealState = createState(17, { hermitage: true, partner: 'huangrong' }), eater = mealState.ds[0], chef = mealState.ds[1];
    mealState.res.food = plainFood; mealState.res.medFood = 1; mealState.res.veg = 0; mealState.res.herb = 0;
    mealState.medFoodBatches = [{ name: '桃花歸元藥膳', chef: chef.id, rong: true }]; chef.away = true;
    eater.needs.hunger = 10; eater.muscleFatigue = 100; eater.soreness = true;
    assert.equal(scoreActs(mealState, eater).some(x => x.act === 'eat'), true, `普通飯 ${plainFood} 時藥膳可用`);
    assert.equal(setOrder(mealState, eater.id, 'eat'), true);
    for (let i = 0; i < 300 && !eater.herbalDietUntil; i++) tick(mealState);
    assert.ok(eater.herbalDietUntil > mealState.t); assert.ok(eater.needs.hunger > 10); assert.equal(eater.muscleFatigue, 35);
    assert.equal(mealState.res.food, plainFood); assert.equal(mealState.res.medFood, 0);
    assert.equal(mealState.ledger.out.medFood, 1); assert.equal(mealState.ledger.out.food || 0, 0, '一餐只扣藥膳，不雙扣普通飯');
  }
  const oldMeal = createState(19); oldMeal.res.food = 0; oldMeal.res.medFood = 1;
  assert.equal(scoreActs(oldMeal, oldMeal.ds[0]).some(x => x.act === 'eat'), false, '舊局不啟用藥膳庫存');
  oldMeal.res.veg = 0; oldMeal.res.medFood = 8;
  assert.equal(emergency(oldMeal), true); assert.equal(foodLow(oldMeal), true, '舊局只計原本可用的存糧');
  const stores = createState(17, { hermitage: true }); stores.res.food = 0; stores.res.veg = 0; stores.res.medFood = 8; stores.mons = [];
  stores.ds.forEach((member) => { member.role = 'outer'; member.needs.hunger = 95; }); stores.emergency = false;
  assert.equal(emergency(stores), false); assert.equal(foodLow(stores), false);
  assert.notEqual(scoreActs(stores, stores.ds[0]).find((a) => a.act === 'farm')?.why, '存糧見底，先顧菜畦');
  tick(stores); assert.equal(stores.emergency, false); assert.equal(stores.log.some((entry) => entry.msg.includes('斷糧了')), false);
  stores.res.medFood = 0; tick(stores);
  assert.equal(stores.emergency, true); assert.equal(stores.log.filter((entry) => entry.msg.includes('斷糧了')).length, 1);
  stores.res.medFood = 8; tick(stores);
  assert.equal(stores.emergency, false); assert.equal(stores.log.filter((entry) => entry.msg.includes('危機解除')).length, 1);
  stores.res.veg = 2; stores.res.medFood = 10;
  assert.equal(scoreActs(stores, stores.ds[0]).some((a) => a.act === 'cook'), false, '足夠藥膳已是備好的飯，不應再因普通飯為零而排煮飯');
  const plain = createState(17, { hermitage: true }).ds[0], warmed = createState(17, { hermitage: true }).ds[0];
  warmed.herbalDietUntil = 600;
  gainArt(plain, 5, 1, 0, { raw: 5, src: 'train' });
  gainArt(warmed, 5, 1, 0, { raw: 5, src: 'train' });
  assert.ok(warmed.arts.chunyangFist.xp > plain.arts.chunyangFist.xp);
});

test('Phase 5：10／18／26 體魄的流暢度、濺水與藥氣繪製不同，渲染不改狀態', () => {
  const s = createState(17, { hermitage: true }), d = s.ds[0];
  const view = { work: 'water', clock: Math.PI / 8, isFootfall: true };
  const frames = [10, 18, 26].map((n) => { d.skills.strength = n; d.skills.agility = n; return ergonomicFrame(d, s, view); });
  assert.deepEqual(frames.map((f) => f.choreFluencyTier), [0, 2, 3]);
  assert.deepEqual(frames.map((f) => f.laborDetail.waterSplash), [true, false, false]);
  assert.ok(frames[0].playback.waterTilt > frames[1].playback.waterTilt && frames[1].playback.waterTilt > frames[2].playback.waterTilt);
  assert.equal(choreFluencyTier(d, 'chop'), 3);
  d.herbalDietUntil = s.t + 600; d.herbalBuffName = '百花玉蜂藥膳';
  const before = JSON.stringify(s), labels = [], colors = [];
  const g = { save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, stroke() {},
    fill() { colors.push(this.fillStyle); }, fillRect() {}, strokeRect() {}, arc() {}, ellipse() {},
    fillText(x) { labels.push(x); }, quadraticCurveTo() {}, scale() {}, translate() {}, rotate() {}, measureText() { return { width: 10 }; } };
  renderMicroStage(g, s, d, view);
  assert.ok(labels.some((x) => x.includes('藥膳溫養中')) || labels.some((x) => x.includes('百花玉蜂藥膳溫養中')));
  assert.ok(colors.includes('#d99a45'));
  assert.equal(JSON.stringify(s), before);
});
