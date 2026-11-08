import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, emergency, foodLow, scoreActs, setOrder, tick } from '../../../src/sim.mjs';
import { BODY_CONDITION, SORE_AT, FITNESS_SCALE, bodyCapOf, stepWorkCondition, restBodyCondition, ensureBodyCondition, cookMedicatedMeal, applyMedicatedMeal, applyPlainMeal } from '../../../src/economy.mjs';
import { choreFluencyTier, ergonomicFrame } from '../../../src/growth-playback.mjs';
import { renderMicroStage } from '../../../src/pose-render.mjs';
import { gainArt } from '../../../src/arts.mjs';

test('R2：同一份活對變強的人刺激較小；白飯長得比藥膳慢；休息日疲勞下降；上限由根骨推導', () => {
  const old = createState(42), oldHero = old.ds[0];
  assert.equal(stepWorkCondition(oldHero, old, 'chop').active, false);
  assert.equal('muscleFatigue' in oldHero, false, '舊局不加身體欄位');
  // 負重比：同一擔柴，力氣 10 的人是全力，力氣 15 的人只算 12/15。
  const s = createState(42, { hermitage: true }), weak = s.ds[0];
  ensureBodyCondition(weak, s.day);
  weak.skills.strength = 10; const a = stepWorkCondition(weak, s, 'chop').stimulus;
  weak.skills.strength = 15; const b = stepWorkCondition(weak, s, 'chop').stimulus;
  assert.equal(a, 1); assert.ok(Math.abs(b - BODY_CONDITION.load.chop / 15) < 1e-12); assert.ok(b < a);
  // 營養：同樣二十份活，吃藥膳的人比只吃白飯的人長得多。
  const grow = (rich) => { const g = createState(42, { hermitage: true }), d = g.ds[0]; ensureBodyCondition(d, g.day);
    if (rich) { g.res.medFood = 1; applyMedicatedMeal(d, g); } else applyPlainMeal(d, g);
    for (let day = 0; day < 10; day++) { for (let i = 0; i < 2; i++) stepWorkCondition(d, g, 'chop', 1, 60); g.day++; ensureBodyCondition(d, g.day); }
    return d.skills.strength - d.bodyBase.strength; };
  assert.ok(grow(true) > grow(false), '藥膳長得比白飯快');
  // 體能－疲勞：做到痠痛後只累不長；休息日疲勞按 7 日時間常數下降。
  const t = createState(43, { hermitage: true }), d = t.ds[0]; ensureBodyCondition(d, t.day);
  while (!d.soreness) stepWorkCondition(d, t, 'quarry');
  const sore = d.skills.strength; stepWorkCondition(d, t, 'quarry'); assert.equal(d.skills.strength, sore, '痠痛時不長');
  assert.equal(restBodyCondition(d, t), true, '歇息不會當場消痠痛');
  const before = d.bodyFatigue; t.day++; ensureBodyCondition(d, t.day);
  assert.ok(Math.abs(d.bodyFatigue - before * Math.exp(-1 / BODY_CONDITION.fatigueTau)) < 1e-9);
  assert.ok(d.bodyFatigue < before);
  // 上限：起始值 ×(1 + 2 × 根骨/5)，做再久也不超過；不再有 18／36。
  for (const root of [1, 5]) { const u = createState(44, { hermitage: true }), p = u.ds[0]; p.root = root; ensureBodyCondition(p, u.day); p.nutrition = BODY_CONDITION.nutrition.rich;
    for (let day = 0; day < 400; day++) { for (let i = 0; i < 3; i++) stepWorkCondition(p, u, 'chop'); u.day++; ensureBodyCondition(p, u.day); }
    const cap = bodyCapOf(p, 'strength'); assert.ok(Math.abs(cap - p.bodyBase.strength * (1 + BODY_CONDITION.bestGain * root / 5)) < 1e-9); assert.ok(p.skills.strength <= cap + 1e-9); assert.ok(p.skills.strength > p.bodyBase.strength); }
  assert.ok(SORE_AT > 0 && FITNESS_SCALE > 0);
  s.res.herb = 0; assert.equal(cookMedicatedMeal(s, weak), null); assert.equal(s.res.medFood, 0);
});

test('Phase 5：黃蓉煮飯和用飯走真任務；R2 起藥膳只給足營養，不消疲勞、不破上限', () => {
  const s = createState(17, { hermitage: true, partner: 'huangrong' }), d = s.ds[1];
  s.res.veg = 10;
  assert.equal(setOrder(s, d.id, 'forage'), true);
  for (let i = 0; i < 4000 && !s.res.herb; i++) tick(s);
  assert.ok(s.res.herb >= 1, '採藥任務將草藥帶回庫存');
  assert.equal(setOrder(s, d.id, 'cook'), true);
  for (let i = 0; i < 4000 && !s.res.medFood; i++) tick(s);
  assert.equal(s.res.medFood, 1); assert.equal(s.res.herb, 0);
  assert.equal(s.medFoodBatches[0].name, '桃花歸元藥膳');
  ensureBodyCondition(d, s.day); d.bodyFatigue = SORE_AT * 2; ensureBodyCondition(d, s.day);
  assert.equal(setOrder(s, d.id, 'eat'), true); d.needs.hunger = 10;
  for (let i = 0; i < 4000 && !(d.herbalDietUntil > s.t); i++) tick(s);
  assert.equal(s.res.medFood, 0); assert.equal(d.nutrition, BODY_CONDITION.nutrition.rich);
  assert.equal(d.soreness, true, '藥膳不消疲勞');
  const ordinary = createState(19, { hermitage: true }), cook = ordinary.ds[0]; ordinary.res.herb = 1;
  cookMedicatedMeal(ordinary, cook); assert.equal(applyMedicatedMeal(cook, ordinary).nutrition, BODY_CONDITION.nutrition.rich);
  const batch = createState(19, { hermitage: true }); batch.res.food = 1; batch.res.herb = 1;
  assert.ok(cookMedicatedMeal(batch, batch.ds[0]));
  assert.equal(batch.res.food, 0); assert.equal(batch.res.medFood, 1); assert.equal(batch.res.herb, 0);
  assert.equal(batch.ledger.out.food, 1); assert.equal(batch.ledger.out.herb, 1); assert.equal(batch.ledger.in.medFood, 1);
  for (const plainFood of [0, 1]) {
    const mealState = createState(17, { hermitage: true, partner: 'huangrong' }), eater = mealState.ds[0], chef = mealState.ds[1];
    mealState.res.food = plainFood; mealState.res.medFood = 1; mealState.res.veg = 0; mealState.res.herb = 0;
    mealState.medFoodBatches = [{ name: '桃花歸元藥膳', chef: chef.id, rong: true }]; chef.away = true;
    eater.needs.hunger = 10;
    assert.equal(scoreActs(mealState, eater).some(x => x.act === 'eat'), true, `普通飯 ${plainFood} 時藥膳可用`);
    assert.equal(setOrder(mealState, eater.id, 'eat'), true);
    for (let i = 0; i < 300 && !eater.herbalDietUntil; i++) tick(mealState);
    assert.ok(eater.herbalDietUntil > mealState.t); assert.ok(eater.needs.hunger > 10); assert.equal(eater.nutrition, BODY_CONDITION.nutrition.rich);
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
