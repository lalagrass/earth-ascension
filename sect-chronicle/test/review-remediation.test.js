// review-remediation.test.js
// 針對外部審查（GPT / Gemini Argon）提出之 5 項核心問題進行直接反例與回歸斷言

import test from 'node:test';
import assert from 'node:assert/strict';

import { ReservationBroker } from '../life/core/reservation.mjs';
import { ToilPipeline } from '../life/core/toils.mjs';
import { createModel } from '../experiments/water-carry/demo/model.mjs';
import { makeSave, validateSave, loadInto } from '../experiments/water-carry/demo/life-save.mjs';

test('審查修復 1 (P2): ToilPipeline 零庫存搬料必須被拒絕，禁止 0 原料開工', () => {
  const broker = new ReservationBroker();
  const pipeline = new ToilPipeline(broker);
  const world = {
    inventory: { timber: 0 },
    facilities: {},
  };
  const actor = {
    id: 'hero',
    pos: [962, 512],
    decision: {},
    needs: { energy: { current: 100 } },
  };

  const res = pipeline.startToil(world, actor, {
    toilId: 'haul_timber',
    sourceItem: 'timber',
    requireStock: true,
    amount: 1,
  });

  assert.equal(res.ok, false);
  assert.equal(res.reason, 'LACK_OF_MATERIAL');
  assert.equal(actor.decision.currentToil, null);
});

test('審查修復 2 (P1): 消除雙重競爭模擬，掌門精力與工種在自走接管下嚴格唯一', () => {
  const model = createModel(1700);
  model.life.initPersona('guo_jing', 'linghu_chong');
  model.life.setAutopilot(true);

  for (let t = 0; t < 600; t++) {
    model.step();
  }

  const heroEnergy = model.state.people.hero.energy;
  const masterEnergy = model.life.master.needs.energy.current;
  assert.ok(Math.abs(heroEnergy - masterEnergy) < 1e-6, `精力必須唯一：hero ${heroEnergy} vs master ${masterEnergy}`);
  assert.equal(model.state.people.hero.motion.mode, 'carry');
  assert.equal(model.state.people.hero.motion.job, 'thatch');
});

test('審查修復 3 (P1): 開宗立派大典在前置大殿未完工 (0/4) 時必須被拒絕', () => {
  const model = createModel(1700);
  model.life.initPersona('guo_jing', 'linghu_chong');

  // 大殿材料未齊備 (0/4)
  const resFail = model.life.holdGrandFoundingCeremony('太華伏魔功');
  assert.equal(resFail.ok, false);
  assert.equal(resFail.reason, 'HALL_NOT_COMPLETED');
  assert.match(resFail.speechBubble, /大殿尚未完工/);

  // 大殿修繕完工後方可立派
  model.life.facilities['fac.hall'].phase = 'completed';
  const resOk = model.life.holdGrandFoundingCeremony('太華伏魔功');
  assert.equal(resOk.ok, true);
  assert.equal(resOk.saveSchemaV1.deterministicReplayVerified, false);
});

test('審查修復 4 (P1): 膳房烹飪必須扣除真實原料，零食材時嚴格拒絕', () => {
  const model = createModel(1700);
  model.state.herbs = 0;
  model.state.vat = 4;

  const resFail = model.life.cookSignatureDish('beggar_chicken');
  assert.equal(resFail.ok, false);
  assert.equal(resFail.reason, 'LACK_OF_INGREDIENTS');

  // 補充食材後成功，並真實扣減庫存
  model.state.herbs = 5;
  model.state.vat = 4;
  const resOk = model.life.cookSignatureDish('beggar_chicken');
  assert.equal(resOk.ok, true);
  assert.equal(model.state.herbs, 3);
  assert.equal(model.state.vat, 3);
});

test('審查修復 5 (P1): 巡山按鈕檢查精力底線 (<20 拒絕) 並扣除真實精力', () => {
  const model = createModel(1700);
  model.state.people.hero.energy = 10;
  if (model.life.master?.needs?.energy) {
    model.life.master.needs.energy.current = 10;
  }

  const resFail = model.life.dispatchSegmentedPatrol();
  assert.equal(resFail.ok, false);
  assert.equal(resFail.reason, 'ENERGY_TOO_LOW');

  // 精力充足時成功並扣除 15 點
  model.state.people.hero.energy = 80;
  if (model.life.master?.needs?.energy) {
    model.life.master.needs.energy.current = 80;
  }
  const resOk = model.life.dispatchSegmentedPatrol();
  assert.equal(resOk.ok, true);
  assert.equal(model.state.people.hero.energy, 65);
});

test('審查修復 6 (P1): 狀態雜湊隨真實權威水缸實存動態變化，誠實標記未回放', () => {
  const model = createModel(1700);
  model.state.vat = 3;
  const snap1 = model.life.verifySaveSchemaV1Snapshot();
  assert.equal(snap1.verified, false);
  assert.equal(snap1.saveSchemaV1.deterministicReplayVerified, false);

  model.state.vat = 7;
  const snap2 = model.life.verifySaveSchemaV1Snapshot();
  assert.notEqual(snap1.saveHash, snap2.saveHash, '水缸變化必須改變狀態快照雜湊');
});

test('審查修復 7 (P1 存檔隔離): 1200 ticks 創角長跑後，存檔與讀檔成功且無 extra-field 錯誤', () => {
  const ROUTE_LEN = 1700;
  const fresh = createModel(ROUTE_LEN);
  const template = fresh.exportState();

  const model = createModel(ROUTE_LEN);
  model.life.initPersona('guo_jing', 'linghu_chong');
  model.life.setAutopilot(true);

  for (let t = 0; t < 1200; t++) {
    model.step();
  }

  const saved = makeSave(model);
  const validated = validateSave(saved, model, template);
  assert.ok(validated);

  const loadRes = loadInto(model, saved, template);
  assert.equal(loadRes.ok, true);
  assert.match(loadRes.text, /已讀檔/);
});
