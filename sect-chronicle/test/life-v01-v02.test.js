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
  ICONIC_TEMPLATES,
  STARTER_TEMPLATES,
  CUSTOM_HERO_TEMPLATE,
  DUO_SYNERGIES,
  PORTRAIT_MANIFEST,
  resolvePortrait,
  getDuoSynergy,
  selectStarterDuo,
  CUSTOM_SECT_BRANCHES,
  SECT_ORIGINS,
  resolveSectOrigin,
} from '../life/core/persona-creation.mjs';

import { ReservationBroker } from '../life/core/reservation.mjs';
import { ToilPipeline, STEP_MS } from '../life/core/toils.mjs';
import { SmartObjectSystem, LIFE_V02_CONSTANTS, getShichenFromTick } from '../life/core/smart-objects.mjs';
import { evaluateDestinyMilestones } from '../life/core/destiny-engine.mjs';
import { SectLeaderAutopilot } from '../life/core/autopilot.mjs';
import { createInitialState, applyPersonaCreation } from '../experiments/water-carry/demo/model.mjs';

function createInitialTestWorld() {
  const broker = new ReservationBroker();
  const toilPipeline = new ToilPipeline(broker);
  const autopilot = new SectLeaderAutopilot(toilPipeline, broker);
  const smartObjects = new SmartObjectSystem();

  const world = {
    tick: 0,
    day: 1,
    teaVat: 1,
    vat: 4,
    vatCapacity: 8,
    inventory: {
      tea: 1,
      thatch: 0,
      stone: 0,
      timber: 0,
      gold: 0,
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

test('反例 1 (配點防呆與搭檔重複反例)：counter_stats_and_duplicate_partner', () => {
  // 1. 單項超出上限 10
  const overflowRes = createPersona({
    stats: { comprehension: 11, constitution: 5, strength: 5, agility: 5, composure: 4 },
    destinyBonusPoints: 0,
  });
  assert.equal(overflowRes.ok, false);
  assert.ok(overflowRes.reason === 'POINT_BUY_EXCEEDED' || overflowRes.reason === 'DUPLICATE_PARTNER_OR_STATS_OVERFLOW');

  // 2. 總和超出 30 點 (如 31 點)
  const sumExceedRes = createPersona({
    stats: { comprehension: 7, constitution: 6, strength: 6, agility: 6, composure: 6 },
    destinyBonusPoints: 0,
  });
  assert.equal(sumExceedRes.ok, false);
  assert.ok(sumExceedRes.reason === 'POINT_BUY_EXCEEDED' || sumExceedRes.reason === 'DUPLICATE_PARTNER_OR_STATS_OVERFLOW');

  // 3. 單項小於下限 1
  const underflowRes = createPersona({
    stats: { comprehension: 0, constitution: 8, strength: 8, agility: 7, composure: 7 },
    destinyBonusPoints: 0,
  });
  assert.equal(underflowRes.ok, false);
  assert.ok(underflowRes.reason === 'POINT_BUY_EXCEEDED' || underflowRes.reason === 'DUPLICATE_PARTNER_OR_STATS_OVERFLOW');

  // 4. 正確 30 點檢核通過
  const validRes = createPersona({
    stats: { comprehension: 6, constitution: 6, strength: 6, agility: 6, composure: 6 },
    destinyBonusPoints: 0,
  });
  assert.equal(validRes.ok, true);
  assert.equal(validRes.disciple.innateStats.comprehension, 6);

  // 5. 掌門選【郭靖】，搭檔又選【郭靖】：系統必須拋出 DUPLICATE_PARTNER_OR_STATS_OVERFLOW
  const dupDuoRes = selectStarterDuo({
    heroMode: 'preset',
    heroTemplateId: 'guo_jing',
    fellowTemplateId: 'guo_jing',
  });
  assert.equal(dupDuoRes.ok, false);
  assert.equal(dupDuoRes.reason, 'DUPLICATE_PARTNER_OR_STATS_OVERFLOW');

  // 6. createPresetDisciple 重複選擇搭檔防呆
  const dupPresetRes = createPresetDisciple('guo_jing', 'guo_jing');
  assert.equal(dupPresetRes.ok, false);
  assert.equal(dupPresetRes.reason, 'DUPLICATE_PARTNER_OR_STATS_OVERFLOW');

  // 7. 自創掌門五維溢出時 selectStarterDuo 也拋出 DUPLICATE_PARTNER_OR_STATS_OVERFLOW
  const customOverflowDuo = selectStarterDuo({
    heroMode: 'custom',
    heroCustom: {
      stats: { comprehension: 11, constitution: 5, strength: 5, agility: 5, composure: 5 },
      destinyBonusPoints: 0,
    },
    fellowTemplateId: 'wei_xiaobao',
  });
  assert.equal(customOverflowDuo.ok, false);
  assert.equal(customOverflowDuo.reason, 'DUPLICATE_PARTNER_OR_STATS_OVERFLOW');
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

test('反例 6 (包租婆水缸催水門檻與羈絆加速反例)：counter_landlady_supervision_water_threshold', () => {
  const world = createInitialTestWorld();
  world.vatCapacity = 8;

  const landlady = createPresetDisciple('landlady').master;
  const ahSing = createPresetDisciple('ah_sing').master;
  const discipleNormal = createPersona({ id: 'disc.normal', name: '外門普通弟子' }).disciple;

  // 1. 當水缸存量為 51% (4.08 / 8) 時：包租婆不可發動催水獅吼
  world.vat = 4.08;
  const res51 = world.autopilot.checkLandladySupervision(world, landlady);
  assert.equal(res51.triggered, false);
  assert.equal(res51.reason, 'WATER_ABOVE_THRESHOLD');
  assert.equal(world.supervisionActive, false);
  assert.equal(world.autopilot.getSpeedMultiplierFor(world, discipleNormal), 1.0);
  assert.equal(world.autopilot.getSpeedMultiplierFor(world, ahSing), 1.0);

  // 2. 當水缸降至 49% (3.92 / 8) 時：精準觸發獅吼
  world.vat = 3.92;
  const res49 = world.autopilot.checkLandladySupervision(world, landlady);
  assert.equal(res49.triggered, true);
  assert.equal(res49.speechBubble, '包租婆～怎麼沒水了呢？！');
  assert.equal(world.supervisionActive, true);

  // 斷言：全場普通外門移速乘以 1.50
  assert.equal(res49.baseMultiplier, 1.50);
  assert.equal(world.autopilot.getSpeedMultiplierFor(world, discipleNormal), 1.50);

  // 斷言：搭檔若為阿星（或韋小寶），移速精準乘以 1.65
  assert.equal(res49.slackerMultiplier, 1.65);
  assert.equal(world.autopilot.getSpeedMultiplierFor(world, ahSing), 1.65);

  const weiXiaobao = createPresetDisciple('wei_xiaobao').master;
  assert.equal(world.autopilot.getSpeedMultiplierFor(world, weiXiaobao), 1.65);
});

test('反例 7 (床位不搶反例)：counter_bed_owner_respect', () => {
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

test('DoD A：雙軌創角問卷與經典主角招募池標記 (六大模板)', () => {
  // A1: 問卷推導道家稱號與批命詩
  const answers = ['q1_a', 'q2_a', 'q3_a', 'q4_b', 'q5_a'];
  const derived = derivePersonaFromAnswers(answers);
  assert.equal(derived.daoTitle, '君子端方');
  assert.deepEqual(derived.natalPoem, ['紫氣東來映華山', '有所不為立人間']);
  assert.equal(derived.heartSeal.code, 0b111);
  assert.equal(derived.heartSeal.overriddenByPlayer, false);

  // A2: 經典角色開局：選郭靖，未選之 4 位角色自動標記 availableForRecruit: true
  const presetGuo = createPresetDisciple('guo_jing', 'wei_xiaobao');
  assert.equal(presetGuo.ok, true);
  assert.equal(presetGuo.master.id, 'disc.preset_guo');
  assert.equal(presetGuo.master.role, 'master');
  assert.equal(presetGuo.master.availableForRecruit, false);
  assert.equal(presetGuo.master.destinyTreeId, 'destiny.guo_jing');

  assert.equal(presetGuo.fellowDisciple.name, '韋小寶');
  assert.equal(presetGuo.fellowDisciple.role, 'senior');
  assert.equal(presetGuo.fellowDisciple.availableForRecruit, false);

  // 剩餘 4 位經典角色在招募池
  assert.equal(presetGuo.recruitPool.length, 4);
  for (const recruit of presetGuo.recruitPool) {
    assert.equal(recruit.availableForRecruit, true);
    assert.equal(recruit.role, 'outer_disciple');
  }
});

test('DoD A2：六大最具反差初始模板資料與五維規格驗證', () => {
  const expectedTemplates = {
    yue_buqun: {
      name: '岳不群',
      patrolStyle: 'orthodox_steady',
      stats: { bone: 6, comprehension: 7, breathing: 5, agility: 7, temperament: 8 },
      perk: 'perk.gentleman_sword',
    },
    guo_jing: {
      name: '郭靖',
      patrolStyle: 'completionist_bulldozer',
      stats: { bone: 9, comprehension: 2, breathing: 8, agility: 4, temperament: 9 },
      perk: 'perk.peerless_talent',
    },
    wei_xiaobao: {
      name: '韋小寶',
      patrolStyle: 'stealth_looter',
      stats: { bone: 3, comprehension: 8, breathing: 3, agility: 9, temperament: 7 },
      perk: 'perk.smooth_talker',
    },
    linghu_chong: {
      name: '令狐沖',
      patrolStyle: 'challenger_seeker',
      stats: { bone: 5, comprehension: 10, breathing: 6, agility: 9, temperament: 4 },
      perk: 'perk.flaw_seeker',
    },
    ah_sing: {
      name: '阿星',
      patrolStyle: 'underdog_brawler',
      stats: { bone: 8, comprehension: 6, breathing: 6, agility: 9, temperament: 8 },
      perk: 'perk.meridian_cocoon',
    },
    landlady: {
      name: '包租婆',
      patrolStyle: 'matriarch_enforcer',
      stats: { bone: 8, comprehension: 7, breathing: 7, agility: 10, temperament: 8 },
      perk: 'perk.lion_roar_supervise',
    },
  };

  for (const [key, exp] of Object.entries(expectedTemplates)) {
    const tmpl = ICONIC_TEMPLATES[key];
    assert.ok(tmpl, `模板 ${key} 必須存在於 ICONIC_TEMPLATES`);
    assert.equal(tmpl.name, exp.name);
    assert.equal(tmpl.patrolStyle, exp.patrolStyle);
    assert.equal(tmpl.portraitId, key);
    assert.match(tmpl.portraitUrl, new RegExp(`assets/portraits/${key}\\.png`));
    assert.ok(tmpl.traits.includes(exp.perk));

    // 驗證先天五維 (bone, comprehension, breathing, agility, temperament)
    assert.equal(tmpl.stats.bone, exp.stats.bone);
    assert.equal(tmpl.stats.comprehension, exp.stats.comprehension);
    assert.equal(tmpl.stats.breathing, exp.stats.breathing);
    assert.equal(tmpl.stats.agility, exp.stats.agility);
    assert.equal(tmpl.stats.temperament, exp.stats.temperament);

    // 驗證 autopilotWeights 與 starterNote 齊備
    assert.ok(tmpl.autopilotWeights, `模板 ${key} 必須有 autopilotWeights`);
    assert.ok(typeof tmpl.starterNote === 'string' && tmpl.starterNote.length > 5);
  }

  // 驗證 custom_hero 元數據
  assert.ok(CUSTOM_HERO_TEMPLATE);
  assert.equal(CUSTOM_HERO_TEMPLATE.portraitId, 'custom_hero');
  assert.equal(CUSTOM_HERO_TEMPLATE.patrolStyle, 'orthodox_steady');
});

test('DoD A3：開局五大黃金同門羈絆與加成結算驗證', () => {
  // 1. 郭靖 + 韋小寶: 實誠與機靈
  const duo1 = getDuoSynergy('guo_jing', 'wei_xiaobao');
  assert.equal(duo1.id, 'duo_synergy.simple_and_slick');
  assert.equal(duo1.name, '實誠與機靈');
  assert.equal(duo1.startingBonus.freeArtisan, true);
  assert.equal(duo1.startingBonus.choreSpeedBonus, 0.25);

  // 2. 岳不群 + 令狐沖: 師徒同門・規矩與酒
  const duo2 = getDuoSynergy('yue_buqun', 'linghu_chong');
  assert.equal(duo2.id, 'duo_synergy.mentor_and_rebel');
  assert.equal(duo2.name, '師徒同門・規矩與酒');
  assert.equal(duo2.startingBonus.prestigeMultiplier, 2.0);
  assert.equal(duo2.startingBonus.sparringExpMultiplier, 2.0);

  // 3. 包租婆 + 阿星: 豬籠城寨・包租婆督工
  const duo3 = getDuoSynergy('landlady', 'ah_sing');
  assert.equal(duo3.id, 'duo_synergy.lion_roar_slacker');
  assert.equal(duo3.name, '豬籠城寨・包租婆督工');
  assert.equal(duo3.startingBonus.lionRoarSpeedBonus, 0.65);

  // 4. 郭靖 + 阿星: 笨鳥與奇才・對練成聖
  const duo4 = getDuoSynergy('guo_jing', 'ah_sing');
  assert.equal(duo4.id, 'duo_synergy.bird_and_prodigy');
  assert.equal(duo4.name, '笨鳥與奇才・對練成聖');
  assert.equal(duo4.startingBonus.timber, 2);
  assert.equal(duo4.startingBonus.stone, 2);

  // 5. 韋小寶 + 令狐沖: 酒色財氣・江湖雙浪
  const duo5 = getDuoSynergy('wei_xiaobao', 'linghu_chong');
  assert.equal(duo5.id, 'duo_synergy.wine_and_fortune');
  assert.equal(duo5.name, '酒色財氣・江湖雙浪');
  assert.equal(duo5.startingBonus.tea, 2);

  // 6. 自創掌門 + 經典同門: 天命掌門與護法開局
  const duoCustom = getDuoSynergy('custom_hero', 'linghu_chong');
  assert.equal(duoCustom.id, 'duo_synergy.custom_destiny_warden');
  assert.equal(duoCustom.name, '天命掌門與護法開局');
  assert.equal(duoCustom.startingBonus.allExpBonus, 0.15);
});

test('DoD A4：水墨淡彩立繪清單 (PORTRAIT_MANIFEST) 與回退字首驗證', () => {
  const allIds = ['custom_hero', 'yue_buqun', 'guo_jing', 'wei_xiaobao', 'linghu_chong', 'ah_sing', 'landlady'];

  for (const id of allIds) {
    const meta = PORTRAIT_MANIFEST[id];
    assert.ok(meta, `立繪 ${id} 必須存在於 PORTRAIT_MANIFEST`);
    assert.equal(meta.portraitId, id);
    assert.equal(meta.portraitUrl, `/experiments/water-carry/demo/assets/portraits/${id}.png`);
    assert.ok(meta.fallbackPalette.bg, '必須有 fallbackPalette.bg');
    assert.ok(meta.fallbackPalette.fg, '必須有 fallbackPalette.fg');
    assert.ok(meta.fallbackPalette.border, '必須有 fallbackPalette.border');
    assert.ok(meta.monogram && meta.monogram.length === 1, '必須有單字 monogram');

    // resolvePortrait 解析
    const resolved = resolvePortrait(id);
    assert.equal(resolved.portraitId, id);
    assert.equal(resolved.portraitUrl, meta.portraitUrl);
  }

  // 未知 ID 回退為 custom_hero
  const fallback = resolvePortrait('unknown_id');
  assert.equal(fallback.portraitId, 'custom_hero');
});

test('DoD A5：createInitialState 與 applyPersonaCreation 雙人初始化與加成結算', () => {
  // 1. 預設雙人狀態初始化
  const state = createInitialState({
    heroMode: 'preset',
    heroTemplateId: 'guo_jing',
    fellowTemplateId: 'wei_xiaobao',
  });

  assert.ok(state.playerPersona);
  assert.equal(state.playerPersona.name, '郭靖');
  assert.ok(state.fellowPersona);
  assert.equal(state.fellowPersona.name, '韋小寶');
  assert.equal(state.fellowPersona.affinity, 65);
  assert.ok(state.activeDuoSynergy);
  assert.equal(state.activeDuoSynergy.name, '實誠與機靈');

  // 驗證加成已注入庫存 (如 startingBonus 原木 +1)
  assert.ok(state.inventory.timber >= 1);
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

test('DoD C & D：零手動 Autopilot 端到端跨日閉關與同門羈絆 (破道館備料 ➔ 敲鐘 ➔ 完工 ➔ 宿命解鎖 ➔ 安睡練拳)', () => {
  const world = createInitialTestWorld();
  const preset = createPresetDisciple('yue_buqun', 'linghu_chong');
  const master = preset.master;
  const fellow = preset.fellowDisciple;
  world.disciples[master.id] = master;
  world.disciples[fellow.id] = fellow;

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

test('SECT_ORIGINS 與 CUSTOM_SECT_BRANCHES 完整定義及 7 大道統註冊', () => {
  const expectedLineages = ['yue_buqun', 'guo_jing', 'wei_xiaobao', 'linghu_chong', 'ah_sing', 'landlady', 'custom'];
  for (const key of expectedLineages) {
    const origin = SECT_ORIGINS[key];
    assert.ok(origin, `SECT_ORIGINS 必須包含 ${key}`);
    assert.ok(origin.sectName, `${key} 必須有名號`);
    assert.ok(origin.plaqueMotto, `${key} 必須有匾額題字`);
    assert.ok(origin.doctrineTitle, `${key} 必須有門規道統`);
    assert.ok(origin.doctrineEffect, `${key} 必須有道統效果`);
    assert.ok(origin.trainingPostName, `${key} 必須有專屬演武器材`);
    assert.ok(origin.founderArtName, `${key} 必須有開山外功武學`);
    assert.ok(origin.internalArtName, `${key} 必須有內功身法`);
  }

  const expectedBranches = ['palm', 'sword', 'internal', 'qimen'];
  for (const b of expectedBranches) {
    const branch = CUSTOM_SECT_BRANCHES[b];
    assert.ok(branch, `CUSTOM_SECT_BRANCHES 必須包含 ${b}`);
    assert.equal(branch.branch, b);
    assert.ok(branch.branchTitle);
    assert.ok(branch.plaqueMotto);
    assert.ok(branch.doctrineTitle);
    assert.ok(branch.doctrineEffect);
    assert.ok(branch.trainingPostName);
    assert.ok(branch.founderArtName);
  }
});

test('resolveSectOrigin 解析經典模板與自創門派道統分支', () => {
  // 經典模板
  const yue = resolveSectOrigin('yue_buqun');
  assert.equal(yue.sectName, '華山別院');
  assert.equal(yue.plaqueMotto, '氣冠紫霞');
  assert.equal(yue.trainingPostName, '青竹君子劍靶');
  assert.equal(yue.founderArtName, '《華山基礎劍法》');

  const guo = resolveSectOrigin('guo_jing');
  assert.equal(guo.sectName, '鎮北武館');
  assert.equal(guo.plaqueMotto, '俠之大者');
  assert.equal(guo.trainingPostName, '千斤重砂木人樁');
  assert.equal(guo.founderArtName, '《基礎羅漢開山掌》');

  // 自創道統四宗分支與自定義門派名
  const customSword = resolveSectOrigin('sword', '天劍門');
  assert.equal(customSword.sectName, '天劍門');
  assert.equal(customSword.branch, 'sword');
  assert.equal(customSword.plaqueMotto, '青雲仗劍');
  assert.equal(customSword.founderArtName, '《青雲流光劍》');
  assert.equal(customSword.trainingPostName, '青鋒懸石試劍架');

  const customInternal = resolveSectOrigin('internal', '太極觀');
  assert.equal(customInternal.sectName, '太極觀');
  assert.equal(customInternal.branch, 'internal');
  assert.equal(customInternal.founderArtName, '《太乙化形綿掌》');
  assert.equal(customInternal.trainingPostName, '太極乾坤運氣樁');

  const customDefault = resolveSectOrigin('unknown_branch');
  assert.equal(customDefault.sectName, '青雲門');
  assert.equal(customDefault.founderArtName, '《開山霹靂掌》');
});

test('selectStarterDuo 返回 sectOrigin 與 2 Universal + 1 Founder + 1 Fellow 雙脈配置', () => {
  // 1. 經典搭檔：岳不群 + 令狐沖
  const duoYueLing = selectStarterDuo({
    mode: 'preset',
    presetKey: 'yue_buqun',
    fellowTemplateId: 'linghu_chong',
  });
  assert.ok(duoYueLing.ok);
  assert.equal(duoYueLing.master.sectOrigin.sectName, '華山別院');
  assert.equal(duoYueLing.fellowDisciple.sectOrigin.sectName, '見性劍廬');

  const loadoutYueLing = duoYueLing.yardDualLineageLoadout;
  assert.ok(loadoutYueLing);
  assert.equal(loadoutYueLing.founderArt, '《華山基礎劍法》');
  assert.equal(loadoutYueLing.fellowArt, '《五嶽快劍基礎》');
  assert.equal(loadoutYueLing.trainingPost, '青竹君子劍靶');
  assert.deepEqual(loadoutYueLing.universalArts, ['《基礎鐵布衫》', '《基礎踏雪無痕》']);
  assert.deepEqual(loadoutYueLing.arts, [
    '《基礎鐵布衫》',
    '《基礎踏雪無痕》',
    '《華山基礎劍法》',
    '《五嶽快劍基礎》',
  ]);

  // 2. 經典搭檔：郭靖 + 韋小寶
  const duoGuoWei = selectStarterDuo({
    mode: 'preset',
    presetKey: 'guo_jing',
    fellowTemplateId: 'wei_xiaobao',
  });
  assert.ok(duoGuoWei.ok);
  assert.equal(duoGuoWei.yardDualLineageLoadout.founderArt, '《基礎羅漢開山掌》');
  assert.equal(duoGuoWei.yardDualLineageLoadout.fellowArt, '《揚州撒灰手・袖裡匕》');
  assert.equal(duoGuoWei.yardDualLineageLoadout.trainingPost, '千斤重砂木人樁');

  // 3. 自創掌門 (百兵劍道宗) + 包租婆
  const duoCustom = selectStarterDuo({
    mode: 'custom',
    name: '林孤鴻',
    sectName: '孤鴻劍宗',
    customBranch: 'sword',
    stats: { comprehension: 8, constitution: 6, strength: 5, agility: 7, composure: 4 },
    fellowTemplateId: 'landlady',
  });
  assert.ok(duoCustom.ok);
  assert.equal(duoCustom.master.sectOrigin.sectName, '孤鴻劍宗');
  assert.equal(duoCustom.master.sectOrigin.founderArtName, '《青雲流光劍》');
  assert.equal(duoCustom.fellowDisciple.sectOrigin.sectName, '豬籠寨大院');
  assert.equal(duoCustom.yardDualLineageLoadout.founderArt, '《青雲流光劍》');
  assert.equal(duoCustom.yardDualLineageLoadout.fellowArt, '《河東獅吼初階》');
  assert.equal(duoCustom.yardDualLineageLoadout.trainingPost, '青鋒懸石試劍架');
});

test('applyPersonaCreation 與 Demo Model 視圖 life 正確注入門派道統與演武配置', () => {
  const world = createInitialTestWorld();
  const res = applyPersonaCreation(world, {
    mode: 'preset',
    presetKey: 'guo_jing',
    fellowTemplateId: 'linghu_chong',
  });
  assert.ok(res.ok);
  assert.ok(world.sectOrigin);
  assert.equal(world.sectOrigin.sectName, '鎮北武館');
  assert.equal(world.yardDualLineageLoadout.trainingPost, '千斤重砂木人樁');
  assert.equal(world.yardDualLineageLoadout.founderArt, '《基礎羅漢開山掌》');
  assert.equal(world.yardDualLineageLoadout.fellowArt, '《五嶽快劍基礎》');
});
