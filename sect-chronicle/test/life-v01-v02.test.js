// life-v01-v02.test.js
// LIFE-V01-V02 專屬單元與確定性反例測試 (DoD A～D 與 6 大直接反例)

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPersona,
  createPresetDisciple,
  createIconicRoster,
  derivePersonaFromAnswers,
  QUESTIONNAIRE,
} from '../life/core/persona-creation.mjs';

import { ReservationBroker } from '../life/core/reservation.mjs';
import { ToilPipeline, STEP_MS } from '../life/core/toils.mjs';
import { SmartObjectSystem, LIFE_V02_CONSTANTS, getShichenFromTick } from '../life/core/smart-objects.mjs';
import { evaluateDestinyMilestones } from '../life/core/destiny-engine.mjs';
import { SectLeaderAutopilot } from '../life/core/autopilot.mjs';

function createInitialTestWorld() {
  const broker = new ReservationBroker();
  const toilPipeline = new ToilPipeline(broker);
  const autopilot = new SectLeaderAutopilot(toilPipeline, broker);
  const smartObjects = new SmartObjectSystem();

  const world = {
    tick: 0,
    day: 1,
    teaVat: 1,
    inventory: {
      tea: 1,
      thatch: 0,
      stone: 0,
      timber: 0,
    },
    facilities: {
      'fac.hall': {
        facilityId: 'fac.hall',
        name: '大廳屋頂修繕',
        targetStage: 'S1',
        phase: 'staging_materials',
        stagingPile: {
          timber: { current: 0, required: 4, reservedInFlight: 0 },
          stone: { current: 0, required: 4, reservedInFlight: 0 },
          thatch: { current: 0, required: 4, reservedInFlight: 0 },
        },
        workforce: {
          mode: 'hire_artisans',
          hiredArtisan: null,
          progressTicks: 0,
          totalTicks: LIFE_V02_CONSTANTS.blueprints.hallRoofRepair.workTicks,
          activeWorkerId: null,
          bonusTimberOnComplete: 0,
        },
      },
      'fac.dorm.a': {
        facilityId: 'fac.dorm.a',
        name: '第一間雙人寢舍落成',
        targetStage: 'S1',
        phase: 'staging_materials',
        stagingPile: {
          timber: { current: 0, required: 6, reservedInFlight: 0 },
          stone: { current: 0, required: 2, reservedInFlight: 0 },
          thatch: { current: 0, required: 2, reservedInFlight: 0 },
        },
        workforce: {
          mode: 'hire_artisans',
          hiredArtisan: null,
          progressTicks: 0,
          totalTicks: LIFE_V02_CONSTANTS.blueprints.dormExpansion.workTicks,
          activeWorkerId: null,
          bonusTimberOnComplete: 0,
        },
      },
    },
    housing: {
      beds: [],
    },
    disciples: {},
    broker,
    toilPipeline,
    autopilot,
    smartObjects,
  };

  return world;
}

// -------------------------------------------------------------
// 1. 六大直接反例測試 (Anti-Patterns & Direct Counter-Examples)
// -------------------------------------------------------------

test('反例 1 (配點防呆反例)：counter_stats_overflow', () => {
  // 1. 單項超出上限 10
  const overflowRes = createPersona({
    stats: { comprehension: 11, constitution: 5, strength: 5, agility: 5, composure: 4 },
    destinyBonusPoints: 0,
  });
  assert.equal(overflowRes.ok, false);
  assert.equal(overflowRes.reason, 'POINT_BUY_EXCEEDED');

  // 2. 總和超出 30 點 (如 31 點)
  const sumExceedRes = createPersona({
    stats: { comprehension: 7, constitution: 6, strength: 6, agility: 6, composure: 6 },
    destinyBonusPoints: 0,
  });
  assert.equal(sumExceedRes.ok, false);
  assert.equal(sumExceedRes.reason, 'POINT_BUY_EXCEEDED');

  // 3. 單項小於下限 1
  const underflowRes = createPersona({
    stats: { comprehension: 0, constitution: 8, strength: 8, agility: 7, composure: 7 },
    destinyBonusPoints: 0,
  });
  assert.equal(underflowRes.ok, false);
  assert.equal(underflowRes.reason, 'POINT_BUY_EXCEEDED');

  // 4. 正確 30 點檢核通過
  const validRes = createPersona({
    stats: { comprehension: 6, constitution: 6, strength: 6, agility: 6, composure: 6 },
    destinyBonusPoints: 0,
  });
  assert.equal(validRes.ok, true);
  assert.equal(validRes.disciple.innateStats.comprehension, 6);
});

test('反例 2 (最後一份建材競爭反例)：counter_material_double_spend', () => {
  const broker = new ReservationBroker();
  let availableStock = 1; // 庫存僅剩 1 份茅草

  const getStock = () => availableStock;

  // 弟子 A 與 弟子 B 在同一 tick 同時宣告 reserve
  const resA = broker.reserveMaterial('thatch', 1, 'disc.hero', getStock);
  const resB = broker.reserveMaterial('thatch', 1, 'disc.cousin', getStock);

  // 斷言：只有一位能成功獲得，另一位收到 LACK_OF_MATERIAL
  assert.equal(resA.ok, true, '第一位預約者成功取得');
  assert.equal(resB.ok, false, '第二位預約者應因材料不足失敗');
  assert.equal(resB.reason, 'LACK_OF_MATERIAL');
  assert.equal(broker.getReservedMaterial('thatch'), 1, '在途鎖定嚴格為 1');
});

test('反例 3 (在途改派退料守恆反例)：counter_in_flight_cancellation_preservation', () => {
  const world = createInitialTestWorld();
  const discipleRes = createPersona();
  const actor = discipleRes.disciple;
  world.disciples[actor.id] = actor;

  const initialTotalStone = 10;
  world.inventory.stone = initialTotalStone;

  // 弟子抱著 1 塊青石走向工地
  world.inventory.stone -= 1;
  actor.carrying = { item: 'stone', amount: 1 };
  world.facilities['fac.hall'].stagingPile.stone.reservedInFlight = 1;

  actor.decision.currentToil = {
    toilId: 'toil.deliver_stone',
    step: 'goto',
    targetFacilityId: 'fac.hall',
    targetStagingPileKey: 'stone',
    u: 0.5,
  };

  // 在 u = 0.5 處玩家下達 Tier 1 停工令
  world.toilPipeline.onCleanup(world, actor, 'MANUAL_INTERRUPT');

  // 斷言：青石安全返回庫存，總量嚴格守恆
  const finalTotalStone = world.inventory.stone + world.facilities['fac.hall'].stagingPile.stone.current;
  assert.equal(actor.carrying.amount, 0, '弟子手中材料已被安全清空卸載');
  assert.equal(finalTotalStone, initialTotalStone, '庫存與工地石頭總數嚴格等於初始總數');
  assert.equal(world.facilities['fac.hall'].stagingPile.stone.reservedInFlight, 0, '在途預約清零');
});

test('反例 4 (未備齊建材敲鐘反例)：counter_premature_artisan_hire', () => {
  const world = createInitialTestWorld();
  const preset = createPresetDisciple('yue_buqun');
  const master = preset.master;

  // 大廳備料未齊：原木缺 1 根 (3/4)
  world.facilities['fac.hall'].stagingPile.timber.current = 3;
  world.facilities['fac.hall'].stagingPile.stone.current = 4;
  world.facilities['fac.hall'].stagingPile.thatch.current = 4;

  const initialTea = world.inventory.tea;
  const res = world.autopilot.ringArtisanBell(world, master, 'fac.hall');

  // 斷言：系統拒絕招工，工匠不進場，茶水不扣除
  assert.equal(res.ok, false);
  assert.match(res.reason, /建材尚未備齊：尚缺原木 1 捆，無法招工/);
  assert.equal(world.facilities['fac.hall'].phase, 'staging_materials');
  assert.equal(world.facilities['fac.hall'].workforce.hiredArtisan, null);
  assert.equal(world.inventory.tea, initialTea, '茶水存量完全不變');
});

test('反例 5 (韋小寶 0 成本與額外贈料反例)：counter_wei_xiaobao_free_perk', () => {
  const world = createInitialTestWorld();
  const preset = createPresetDisciple('wei_xiaobao');
  const wei = preset.master;

  // 大廳備料 100% 齊備
  world.facilities['fac.hall'].stagingPile.timber.current = 4;
  world.facilities['fac.hall'].stagingPile.stone.current = 4;
  world.facilities['fac.hall'].stagingPile.thatch.current = 4;

  const initialTea = world.inventory.tea;
  const initialTimber = world.inventory.timber;

  // 韋小寶敲鐘招工
  const ringRes = world.autopilot.ringArtisanBell(world, wei, 'fac.hall');
  assert.equal(ringRes.ok, true);
  assert.equal(ringRes.isSmoothTalker, true);
  assert.equal(world.inventory.tea, initialTea, '韋小寶 0 成本：茶水存量完全不扣除');

  // 工匠完工結算
  world.autopilot.completeConstruction(world, 'fac.hall', wei);
  assert.equal(world.facilities['fac.hall'].phase, 'completed');
  assert.equal(world.inventory.timber, initialTimber + 1, '完工結算時 inventory.timber 確實獲贈 1 捆原木');
});

test('反例 6 (床位不搶反例)：counter_bed_owner_respect', () => {
  const world = createInitialTestWorld();
  world.housing.beds = [
    { id: 'bed-1', owner: 'disc.preset_yue', occupant: null },
    { id: 'bed-2', owner: null, occupant: null },
  ];

  const discipleA = createPersona({ id: 'disc.hero', name: '弟子甲' }).disciple;
  const discipleB = createPersona({ id: 'disc.cousin', name: '弟子乙' }).disciple;

  // 1. 弟子甲回房認床：因 bed-1 已有掌門岳不群為 owner，弟子甲必須認領未有主的 bed-2
  const resA = world.autopilot.claimAndUseBed(world, discipleA);
  assert.equal(resA.ok, true);
  assert.equal(resA.bedId, 'bed-2', '弟子甲認領未有主之 bed-2');
  assert.equal(world.housing.beds[1].occupant, 'disc.hero');

  // 2. 弟子乙也回房認床：此時兩張床均有主且 bed-2 正在被弟子甲躺臥，弟子乙不可將人擠下床
  const resB = world.autopilot.claimAndUseBed(world, discipleB);
  assert.equal(resB.ok, false);
  assert.equal(resB.reason, 'ALL_BEDS_OCCUPIED_OR_OWNED');
  assert.equal(world.housing.beds[1].occupant, 'disc.hero', '弟子甲依然安睡在 bed-2，未被擠落');
});

// -------------------------------------------------------------
// 2. 系統功能全覆蓋測試 (DoD Group A ～ D)
// -------------------------------------------------------------

test('DoD A：雙軌創角問卷與經典主角招募池標記', () => {
  // A1: 問卷推導道家稱號與批命詩
  const answers = ['q1_a', 'q2_a', 'q3_a', 'q4_b', 'q5_a'];
  const derived = derivePersonaFromAnswers(answers);
  assert.equal(derived.daoTitle, '君子端方');
  assert.deepEqual(derived.natalPoem, ['紫氣東來映華山', '有所不為立人間']);
  assert.equal(derived.heartSeal.code, 0b111);
  assert.equal(derived.heartSeal.overriddenByPlayer, false);

  // A2: 經典角色開局：選郭靖，未選之岳不群與韋小寶標記 availableForRecruit: true
  const presetGuo = createPresetDisciple('guo_jing');
  assert.equal(presetGuo.ok, true);
  assert.equal(presetGuo.master.id, 'disc.preset_guo');
  assert.equal(presetGuo.master.role, 'master');
  assert.equal(presetGuo.master.availableForRecruit, false);
  assert.equal(presetGuo.master.destinyTreeId, 'destiny.guo_jing');

  assert.equal(presetGuo.recruitPool.length, 2);
  for (const recruit of presetGuo.recruitPool) {
    assert.equal(recruit.availableForRecruit, true);
    assert.equal(recruit.role, 'outer_disciple');
  }
});

test('DoD B：Toil 施工中斷工時保留', () => {
  const world = createInitialTestWorld();
  const actor = createPersona().disciple;

  // 模擬施工 50%
  const totalTicks = 1000;
  world.facilities['fac.hall'].workforce.totalTicks = totalTicks;
  world.facilities['fac.hall'].workforce.progressTicks = 500;

  actor.decision.currentToil = {
    toilId: 'toil.build',
    step: 'interact',
    targetFacilityId: 'fac.hall',
    progressTicks: 500,
    durationTicks: totalTicks,
  };

  // 下達玩家改派中斷指令
  world.toilPipeline.onCleanup(world, actor, 'MANUAL_INTERRUPT');

  // 斷言：工時 500 完整保留在工地，不因改派而重置
  assert.equal(world.facilities['fac.hall'].workforce.progressTicks, 500);
});

test('DoD C & D：零手動 Autopilot 端到端跨日閉環 (破道館備料 ➔ 敲鐘 ➔ 完工 ➔ 宿命解鎖 ➔ 安睡練拳)', () => {
  const world = createInitialTestWorld();
  const preset = createPresetDisciple('yue_buqun');
  const master = preset.master;
  world.disciples[master.id] = master;

  // 1. 宿命樹初始評估 (第 1 階自動解鎖)
  const initialMilestones = evaluateDestinyMilestones(world, master);
  assert.equal(initialMilestones.length, 1);
  assert.equal(initialMilestones[0].stage, 1);
  assert.ok(master.unlockedArts.includes('art.huashan_basic_sword'));

  // 2. 模擬 Autopilot 跑滿大廳備料樁
  world.facilities['fac.hall'].stagingPile.timber.current = 4;
  world.facilities['fac.hall'].stagingPile.stone.current = 4;
  world.facilities['fac.hall'].stagingPile.thatch.current = 4;

  // 3. Autopilot 自動觸發敲鐘招工
  world.autopilot.step(world, master);
  assert.equal(world.facilities['fac.hall'].phase, 'building');

  // 4. 木匠施工完成大廳
  world.autopilot.completeConstruction(world, 'fac.hall', master);
  assert.equal(world.facilities['fac.hall'].phase, 'completed');

  // 5. 驗證大廳完工後，宿命樹第 2 階 (君子名劍) 達標解鎖
  master.artLevels['art.huashan_basic_sword'] = 2; // 滿足劍法 Lv2
  const stage2Milestones = evaluateDestinyMilestones(world, master);
  assert.equal(stage2Milestones.length, 1);
  assert.equal(stage2Milestones[0].stage, 2);
  assert.ok(master.unlockedArts.includes('art.yangwu_sword'));

  // 6. 寢舍完工並建立床位
  world.facilities['fac.dorm.a'].stagingPile.timber.current = 6;
  world.facilities['fac.dorm.a'].stagingPile.stone.current = 2;
  world.facilities['fac.dorm.a'].stagingPile.thatch.current = 2;
  world.autopilot.completeConstruction(world, 'fac.dorm.a', master);
  assert.equal(world.facilities['fac.dorm.a'].phase, 'completed');
  assert.equal(world.housing.beds.length, 2);

  // 7. 夜間 Autopilot 自走認領 bed-1 安睡
  world.tick = LIFE_V02_CONSTANTS.simulation.shichenDurationTicks * 9; // 亥時 (夜間)
  master.needs.energy.current = 25; // 精力低
  world.autopilot.step(world, master);

  assert.equal(master.housing.bedId, 'bed-1');
  assert.equal(world.housing.beds[0].owner, master.id);
  assert.equal(world.housing.beds[0].occupant, master.id);

  // 8. 睡眠恢復至 80+
  for (let i = 0; i < 700; i++) {
    world.autopilot.step(world, master);
  }
  assert.ok(master.needs.energy.current >= 80, '安睡恢復精力已達到 80 以上');

  // 9. 晨起 (卯時) 演武練拳
  world.tick = LIFE_V02_CONSTANTS.simulation.shichenDurationTicks * 3; // 卯時
  world.autopilot.step(world, master);
  assert.match(master.decision.explain.doing, /演練/);
});
