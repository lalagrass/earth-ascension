// life-v05-v06.test.js
// LIFE-V05-V06 專屬單元與確定性反例測試 (DoD A～D 與 6 大直接反例)

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LIFE_V05_CONSTANTS,
  HIDDEN_MASTERS,
  HiddenMasterManager,
  runOutreachTeaching,
  recruitCandidate,
  ChoreQuotaManager,
  LandladySupervisionManager,
  SocialLedger,
  REACTION_TYPES,
  ORIGIN_AFFINITIES,
} from '../life/core/outreach-social.mjs';

import {
  LIFE_V06_CONSTANTS,
  SegmentedPatrolEngine,
  simulateSegmentedPatrol,
  buildPatrolTelemetryComparison,
  DefenseSlotManager,
  evaluateVisualStrengthShowcases,
} from '../life/core/patrol-defense.mjs';

// =========================================================================
// A 組：下山免費義學、外門雜務定額、內門解放與包租婆催水 (DoD A1 ~ A4)
// =========================================================================

test('A1: 下山免費義學識人、反應標籤與門派起源偏好加成 (DoD A1)', () => {
  const instructor = {
    id: 'disc.leader',
    name: '岳掌門',
    rankTier: 'master',
    role: 'leader',
    martialArts: { 'art.huashan_basic_sword': 3 },
  };

  // 1. 華山君子派講武
  const resHuashan = runOutreachTeaching({
    instructor,
    sectOrigin: 'origin.huashan_junzi',
  });

  assert.equal(resHuashan.ok, true);
  assert.equal(resHuashan.sectOrigin, 'origin.huashan_junzi');

  // 檢查候選人的跟練反應標籤
  const scholar = resHuashan.candidates.find((c) => c.archetypeId === 'scholar_swordsman');
  assert.ok(scholar);
  assert.equal(scholar.reactionTag, '💡 觸類旁通');
  assert.equal(scholar.affinityBonusApplied, true);
  assert.equal(scholar.affinityMultiplier > 1.0, true);

  // 2. 萬佛武館講武：偏好市井奇才 (阿星) 與三隱士
  const resWanfo = runOutreachTeaching({
    instructor,
    sectOrigin: 'origin.wanfo_palm',
  });
  const ahSing = resWanfo.candidates.find((c) => c.archetypeId === 'ah_sing');
  assert.ok(ahSing);
  assert.equal(ahSing.affinityBonusApplied, true);

  // 3. 邀請拜入外門
  const recruitRes = recruitCandidate(scholar, { targetTier: 'outer' });
  assert.equal(recruitRes.ok, true);
  assert.equal(recruitRes.disciple.rankTier, 'outer');
  assert.equal(recruitRes.disciple.choreQuota.dailyQuota, 3);
  assert.equal(recruitRes.disciple.choreQuota.isQuotaFulfilled, false);
});

test('A1-2: 豬籠城寨三隱士平時高效打雜 (+40%) 與山門告急撕圍裙覺醒 (DoD A1)', () => {
  const masterMgr = new HiddenMasterManager();

  // 1. 平時打雜效率檢驗：挑水、裁縫、炸油條各 +40%
  const kuliSpeed = masterMgr.getChoreSpeedBonus('kuli_qiang', 'carry_water');
  assert.equal(kuliSpeed, 1.40);

  const tailorSpeed = masterMgr.getChoreSpeedBonus('tailor_hong', 'crafting');
  assert.equal(tailorSpeed, 1.40);

  const cookSpeed = masterMgr.getChoreSpeedBonus('youzha_gui', 'cooking');
  assert.equal(cookSpeed, 1.40);

  // 2. 山門威脅不足 (0.5 < 0.7) 時不覺醒
  const calmRes = masterMgr.triggerHiddenMasterAwakening('kuli_qiang', { gateThreatLevel: 0.5 });
  assert.equal(calmRes.ok, false);
  assert.equal(calmRes.reason, 'THREAT_LEVEL_TOO_LOW_TO_AWAKEN');

  // 3. 山門告急 (threat >= 0.7) 撕開圍裙覺醒三階神功！
  const awakenRes = masterMgr.triggerHiddenMasterAwakening('kuli_qiang', { gateThreatLevel: 0.85 });
  assert.equal(awakenRes.ok, true);
  assert.equal(awakenRes.isAwakened, true);
  assert.equal(awakenRes.apronTorn, true);
  assert.equal(awakenRes.awakenedArtId, 'art.tan_twelve_kicks');
  assert.equal(awakenRes.awakenedArtTier, 3);
  assert.match(awakenRes.awakeningQuote, /十二路譚腿|腿/);
});

test('A2 & A3: 外門雜務定額 (3件) 與內門弟子徹底解放 (DoD A2, A3)', () => {
  const choreMgr = new ChoreQuotaManager();

  const outerDisciple = { id: 'disc.outer_1', rankTier: 'outer' };
  const innerDisciple = { id: 'disc.inner_1', rankTier: 'inner' };

  // 1. 外門弟子初始狀態
  const outerQuota = choreMgr.getOrCreateQuota(outerDisciple);
  assert.equal(outerQuota.dailyQuota, 3);
  assert.equal(outerQuota.choresCompletedToday, 0);
  assert.equal(outerQuota.isQuotaFulfilled, false);

  // 2. 內門弟子初始狀態：0 定額，已直接解鎖練功
  const innerQuota = choreMgr.getOrCreateQuota(innerDisciple);
  assert.equal(innerQuota.dailyQuota, 0);
  assert.equal(innerQuota.isQuotaFulfilled, true);
  assert.equal(innerQuota.unlockedMartialPractice, true);

  // 3. 外門做滿 3 件雜務
  choreMgr.recordChoreCompletion('disc.outer_1', 'carry_water');
  choreMgr.recordChoreCompletion('disc.outer_1', 'chop_wood');
  assert.equal(choreMgr.getOrCreateQuota(outerDisciple).isQuotaFulfilled, false);

  choreMgr.recordChoreCompletion('disc.outer_1', 'carry_water');
  const finishedQuota = choreMgr.getOrCreateQuota(outerDisciple);
  assert.equal(finishedQuota.isQuotaFulfilled, true);
  assert.equal(finishedQuota.unlockedMartialPractice, true);

  // 4. 申時練武申請成功
  const claimRes = choreMgr.attemptClaimMartialPractice('disc.outer_1');
  assert.equal(claimRes.ok, true);
  assert.equal(claimRes.unlockedMartialPractice, true);
});

test('A4: 包租婆水缸催水督導獅吼 (DoD A4)', () => {
  const landladyMgr = new LandladySupervisionManager();

  // 1. 水缸存量 60% (>= 50%)：不發動獅吼
  const calmState = landladyMgr.checkWaterVatSupervision({
    waterVatRatio: 0.60,
    landladyPresent: true,
    currentTick: 100,
  });
  assert.equal(calmState.triggered, false);

  // 2. 水缸存量 40% (< 50%)：發動獅吼
  const roarState = landladyMgr.checkWaterVatSupervision({
    waterVatRatio: 0.40,
    landladyPresent: true,
    currentTick: 200,
  });
  assert.equal(roarState.triggered, true);
  assert.equal(roarState.baseSpeedMultiplier, 1.50);
  assert.equal(roarState.slackerDuoMultiplier, 1.65);
  assert.match(roarState.roarQuote, /包租婆～怎麼沒水了呢/);

  // 3. 移速加成：普通外門 +50%，阿星/韋小寶 +65%
  const outerDisc = { id: 'disc.outer_a', rankTier: 'outer', archetypeId: 'farmer_boy' };
  const ahSing = { id: 'disc.ah_sing', rankTier: 'outer', archetypeId: 'ah_sing' };
  const weiXiaobao = { id: 'disc.wei', rankTier: 'outer', archetypeId: 'wei_xiaobao' };

  assert.equal(landladyMgr.getSpeedMultiplier(outerDisc, { isRoarActive: true, choreType: 'carry_water' }), 1.50);
  assert.equal(landladyMgr.getSpeedMultiplier(ahSing, { isRoarActive: true, choreType: 'carry_water' }), 1.65);
  assert.equal(landladyMgr.getSpeedMultiplier(weiXiaobao, { isRoarActive: true, choreType: 'chop_wood' }), 1.65);
});

// =========================================================================
// B 組：因果社交記憶帳本與道侶雙人房結契同住 (DoD B1 ~ B2)
// =========================================================================

test('B1: 因果社交記憶原子入帳與 30s 冷卻防刷 (DoD B1)', () => {
  const ledger = new SocialLedger();
  const discipleA = { id: 'disc.guo_jing', name: '郭靖', age: 19 };
  const discipleB = { id: 'disc.huang_rong', name: '黃蓉', age: 18 };

  // 1. 初次同桌共食
  const event1 = ledger.recordInteraction(discipleA, discipleB, {
    timestampTick: 100,
    eventType: 'co_dining',
    sentimentDelta: 2,
    description: '午膳於餐敘棚共食荷葉筍尖湯，言談甚歡',
  });
  assert.equal(event1.ok, true);
  assert.equal(event1.intimacyLevel, 2);
  assert.equal(event1.track, 'romantic_dao_companion');

  // 2. 30 秒 (1800 ticks) 內重複觸發：冷卻防刷
  const spamEvent = ledger.recordInteraction(discipleA, discipleB, {
    timestampTick: 500, // 距上次僅 400 ticks (< 1800)
    eventType: 'co_tea',
    sentimentDelta: 1,
  });
  assert.equal(spamEvent.ok, false);
  assert.equal(spamEvent.reason, 'PAIR_INTERACTION_ON_COOLDOWN');

  // 3. 經過 1800 ticks 後再次互動
  const event2 = ledger.recordInteraction(discipleA, discipleB, {
    timestampTick: 2000,
    eventType: 'water_assist',
    sentimentDelta: 3,
    description: '午後演武場代挑一擔清泉，互勉武道',
  });
  assert.equal(event2.ok, true);
  assert.equal(event2.intimacyLevel, 5); // 2 + 3 = 5
});

test('B2: 成年道侶結契與分配入住雙人雅室 (DoD B2)', () => {
  const ledger = new SocialLedger();
  const actorA = { id: 'disc.yang_guo', name: '楊過', age: 20 };
  const actorB = { id: 'disc.xiaolongnu', name: '小龍女', age: 22 };

  // 1. 建立親密關係至 5
  ledger.recordInteraction(actorA, actorB, { timestampTick: 0, sentimentDelta: 5 });

  // 2. 結契為道侶
  const daoRes = ledger.proposeDaoCompanion(actorA, actorB);
  assert.equal(daoRes.ok, true);
  assert.equal(daoRes.status, 'DAO_COMPANIONS_CONFIRMED');

  // 3. 分配入住雙人房 fac.dorm.b
  const dormRes = ledger.assignCoupleDorm(actorA, actorB, 'fac.dorm.b');
  assert.equal(dormRes.ok, true);
  assert.equal(dormRes.isCoHabiting, true);
  assert.equal(dormRes.dormId, 'fac.dorm.b');
  assert.equal(dormRes.sleepEnergyBonus, 1.0);
});

// =========================================================================
// C 組：後山 S0～S5 六段里程、四大性格巡山流派與戰報卡 (DoD C1 ~ C5)
// =========================================================================

test('C1 & C2: 後山 S0～S5 六段里程推進與嚴格返程精力預算守恆 (DoD C1, C2)', () => {
  const engine = new SegmentedPatrolEngine();

  // 1. 充足精力角色推進巡山
  const hero = {
    id: 'disc.swordsman',
    name: '青松劍客',
    patrolStyle: 'completionist_bulldozer',
    energy: 100,
    satiety: 100,
  };

  const report = engine.simulatePatrol(hero, { initialEnergy: 100 });
  assert.ok(report.furthestDistance >= 600);
  assert.ok(report.endEnergy >= 8); // 守住安全底線
  assert.equal(report.summaryCounts.escaped, 0);
});

test('C3: 四大性格巡山流派差異對比 (韋小寶 vs 郭靖 vs 令狐沖 vs 喬峰) (DoD C3)', () => {
  // 1. 韋小寶 (stealth_looter)：神行百變繞避 9 隻，0 擊倒狂飆深山偷靈芝
  const weiXiaobao = {
    id: 'disc.wei',
    name: '韋小寶',
    patrolStyle: 'stealth_looter',
    energy: 90,
    satiety: 90,
  };
  const weiReport = simulateSegmentedPatrol(weiXiaobao);
  assert.equal(weiReport.summaryCounts.downed, 0);
  assert.ok(weiReport.summaryCounts.bypassed > 0);
  assert.equal(weiReport.maxSegmentReached, 'S4');
  assert.equal(weiReport.retreatReason, 'CHOKEPOINT_BLOCKED');
  assert.ok(weiReport.carriedLoot.some((l) => l.itemId === 'item.lingzhi_1000y'));

  // 2. 郭靖 (completionist_bulldozer)：較真推土機，逃脫 0，肅清率 100%
  const guoJing = {
    id: 'disc.guo',
    name: '郭靖',
    patrolStyle: 'completionist_bulldozer',
    energy: 100,
    satiety: 80,
    inventory: { rationCount: 1 },
  };
  const guoReport = simulateSegmentedPatrol(guoJing);
  assert.equal(guoReport.summaryCounts.escaped, 0);
  assert.equal(guoReport.summaryCounts.bypassed, 0);
  assert.equal(guoReport.clearanceRate, 1.0);
  assert.ok(guoReport.summaryCounts.downed > 0);

  // 3. 令狐沖 (challenger_seeker)：跨過 S1 小鼠，專攻強敵破式
  const linghu = {
    id: 'disc.linghu',
    name: '令狐沖',
    patrolStyle: 'challenger_seeker',
    energy: 90,
    satiety: 90,
  };
  const linghuReport = simulateSegmentedPatrol(linghu);
  assert.ok(linghuReport.summaryCounts.bypassed > 0); // 跨過小鼠
  assert.equal(linghuReport.duguFlawInterrupted, true);

  // 4. 喬峰 (overlord_crusher)：百獸辟易與範圍橫推
  const qiaoFeng = {
    id: 'disc.qiao',
    name: '喬峰',
    patrolStyle: 'overlord_crusher',
    energy: 100,
    satiety: 100,
  };
  const qiaoReport = simulateSegmentedPatrol(qiaoFeng);
  assert.ok(qiaoReport.summaryCounts.drivenOff > 0); // S1 鼠群嚇跑
  assert.ok(qiaoReport.intimidatedCount > 0);
});

test('C4: 靈物散香返程驚獸與同門接力 0 損耗閉環 (DoD C4)', () => {
  const actor = {
    id: 'disc.wei',
    name: '韋小寶',
    patrolStyle: 'stealth_looter',
    energy: 90,
    inventory: { limePouchCount: 3 },
  };

  // 1. 單獨一人硬偷：去程溜過，回程經過未清路段觸發靈藥驚獸，消耗白石灰袋
  const soloReport = simulateSegmentedPatrol(actor, {
    clearedStages: [], // 前方全是未清怪區
  });
  assert.equal(soloReport.lootScentAlertTriggered, true);
  assert.ok(soloReport.limePouchesUsed > 0);

  // 2. 郭靖先打通 S1～S3 安全山道，韋小寶接力深山摸寶：0 驚動、0 損耗完美帶回！
  const relayReport = simulateSegmentedPatrol(actor, {
    clearedStages: ['S1', 'S2', 'S3'],
  });
  assert.equal(relayReport.lootScentAlertTriggered, false);
  assert.equal(relayReport.limePouchesUsed, 1); // 僅 S4 窄橋黑熊撤退時用 1 包石灰，返程 0 消耗
});

test('C5: 巡山返院前後對比戰報卡 (DoD C5)', () => {
  const prevRun = {
    actorName: '郭靖',
    furthestDistance: 390,
    maxSegmentReached: 'S2',
    clearanceRate: 0.40,
    summaryCounts: { downed: 4, drivenOff: 1, escaped: 3, bypassed: 0 },
    timeAllocationSec: { travel: 20.0, combat: 11.2, return: 10.0, eating: 0.0 },
    retreatReason: 'ENERGY_BUDGET_RESERVE',
  };

  const currRun = {
    actorName: '郭靖',
    furthestDistance: 1080,
    maxSegmentReached: 'S4',
    clearanceRate: 1.00,
    summaryCounts: { downed: 10, drivenOff: 2, escaped: 0, bypassed: 0 },
    timeAllocationSec: { travel: 38.0, combat: 12.0, return: 18.0, eating: 2.0 },
    retreatReason: 'ENERGY_BUDGET_RESERVE',
  };

  const comparison = buildPatrolTelemetryComparison(prevRun, currRun);
  assert.equal(comparison.distanceDelta, 690);
  assert.equal(comparison.maxDistanceDelta, '+690 單位');
  assert.equal(comparison.stageProgression, 'S2 ➔ S4');
  assert.match(comparison.escapeRateDelta, /38%|37%|0%/);
  assert.match(comparison.telemetryCardText, /郭靖/);
  assert.match(comparison.telemetryCardText, /\+690 單位/);
});

// =========================================================================
// D 組：塔防演武守點三姿態與四大非數值強度視覺 (DoD D1 ~ D2)
// =========================================================================

test('D1: 山門塔防演武守點陣位與三姿態波次防衛 (DoD D1)', () => {
  const slotMgr = new DefenseSlotManager();

  // 1. 配置陣位姿態
  const assign1 = slotMgr.assignSlot('slot.bridge_front', 'disc.qiao_feng', 'solid_anchor');
  assert.equal(assign1.ok, true);
  assert.equal(assign1.doctrine, 'solid_anchor');
  assert.equal(assign1.engagementRadius, 40);

  const assign2 = slotMgr.assignSlot('slot.gate_arch', 'disc.linghu_chong', 'intercept_vanguard');
  assert.equal(assign2.ok, true);
  assert.equal(assign2.doctrine, 'intercept_vanguard');
  assert.equal(assign2.engagementRadius, 120);

  // 2. 迎擊獸潮波次
  const wave = [
    { id: 'beast.boar_1', type: 'boar_thick_hide' },
    { id: 'beast.wolf_1', type: 'wolf_pack' },
  ];

  const defenseRes = slotMgr.evaluateWaveDefense(wave, new Map([
    ['disc.qiao_feng', { id: 'disc.qiao_feng', skills: { unarmed: 5 } }],
    ['disc.linghu_chong', { id: 'disc.linghu_chong', skills: { sword: 5 } }],
  ]));

  assert.equal(defenseRes.ok, true);
  assert.equal(defenseRes.allDefended, true);
  assert.equal(defenseRes.interceptedCount, 2);
  assert.equal(defenseRes.breachedCount, 0);
});

test('D2: 四大非數值強度視覺展示 (斷樁/辟易/石碑/留痕) (DoD D2)', () => {
  const noviceDisciple = { id: 'disc.novice' };
  const masterDisciple = { id: 'disc.master' };

  // 1. 初學者視覺：木樁紋絲不動，野鼠近身才跑
  const noviceShowcase = evaluateVisualStrengthShowcases(noviceDisciple, {
    martialLevel: 1,
    patrolFurthestDistance: 120,
    sectOrigin: 'origin.huashan_junzi',
  });
  assert.equal(noviceShowcase.postDestructionStage, 1);
  assert.match(noviceShowcase.postDestructionDesc, /初學手痛/);
  assert.equal(noviceShowcase.beastIntimidationAura.active, false);

  // 2. 大成宗師視覺：一掌斷樁青石裂、野鼠 180 單位辟易、留門派劍痕、師弟躬身行禮
  const masterShowcase = evaluateVisualStrengthShowcases(masterDisciple, {
    martialLevel: 8,
    patrolFurthestDistance: 1050,
    sectOrigin: 'origin.huashan_junzi',
  });
  assert.equal(masterShowcase.postDestructionStage, 3);
  assert.match(masterShowcase.postDestructionDesc, /一掌打斷木人樁/);
  assert.equal(masterShowcase.beastIntimidationAura.active, true);
  assert.equal(masterShowcase.beastIntimidationAura.fleeRadius, 180);
  assert.equal(masterShowcase.sectCombatTrace.traceId, 'bamboo_sword_cuts');
  assert.equal(masterShowcase.fellowDisciplesGreeting.active, true);
  assert.match(masterShowcase.fellowDisciplesGreeting.greetingQuote, /見過大師兄/);
});

// =========================================================================
// E 組：六大確定性直接反例驗證 (Anti-Patterns & Direct Counter-Examples)
// =========================================================================

test('反例 1: 外門弟子未滿雜務定額嚴禁練拳 (counter_outer_disciple_chore_skip)', () => {
  const choreMgr = new ChoreQuotaManager();
  const disciple = { id: 'disc.lazy_outer', rankTier: 'outer' };

  choreMgr.getOrCreateQuota(disciple);
  // 只做了 1 件雜務 (< 3)
  choreMgr.recordChoreCompletion('disc.lazy_outer', 'carry_water');

  // 企圖領取練武籌碼：必須嚴格拒絕
  const claimRes = choreMgr.attemptClaimMartialPractice('disc.lazy_outer');
  assert.equal(claimRes.ok, false);
  assert.equal(claimRes.reason, 'CHORE_QUOTA_INCOMPLETE');
  assert.match(claimRes.message, /今日雜務尚未達標/);
});

test('反例 1b: 門派水糧充足時內門弟子雜務權重為 0.0 (counter_inner_disciple_chore_exemption)', () => {
  const choreMgr = new ChoreQuotaManager();
  const masterBro = { id: 'disc.senior_brother', rankTier: 'senior' };

  // 水缸存量 60% (>= 15%)，水糧充足
  const priorityInfo = choreMgr.getChoreDispatchPriority(masterBro, 'carry_water', {
    waterRatio: 0.60,
    foodRatio: 0.80,
  });

  assert.equal(priorityInfo.priorityWeight, 0.0);
  assert.equal(priorityInfo.isExempt, true);
  assert.equal(priorityInfo.suggestedActivity, 'martial_practice');
  assert.match(priorityInfo.reason, /內門弟子免除日常雜務/);
});

test('反例 2: 包租婆催水獅吼 50% 臨界門檻反例 (counter_landlady_roar_trigger_threshold)', () => {
  const landladyMgr = new LandladySupervisionManager();

  // 1. 水缸存量 51%：不可發動獅吼
  const res51 = landladyMgr.checkWaterVatSupervision({
    waterVatRatio: 0.51,
    landladyPresent: true,
    currentTick: 0,
  });
  assert.equal(res51.triggered, false);
  assert.equal(res51.reason, 'WATER_ABOVE_THRESHOLD');

  // 2. 水缸存量 49%：精準觸發催水獅吼
  const res49 = landladyMgr.checkWaterVatSupervision({
    waterVatRatio: 0.49,
    landladyPresent: true,
    currentTick: 10,
  });
  assert.equal(res49.triggered, true);
  assert.equal(res49.reason, 'WATER_BELOW_FIFTY_PERCENT');
  assert.equal(res49.baseSpeedMultiplier, 1.50);
  assert.equal(res49.slackerDuoMultiplier, 1.65);
});

test('反例 3: 未成年收養親情軌道嚴禁道侶結契 (counter_underage_romance_block / counter_youth_adoption_no_marriage)', () => {
  const ledger = new SocialLedger();
  const hero = { id: 'disc.hero', name: '少年掌門', age: 20 };
  const adoptedGirl = { id: 'disc.ling_er', name: '小玲兒', age: 12, isAdopted: true };

  // 即使累積 5 點親密度
  ledger.recordInteraction(hero, adoptedGirl, { timestampTick: 0, sentimentDelta: 5 });

  // 1. 嘗試道侶提議：嚴格拒絕
  const romanceRes = ledger.proposeDaoCompanion(hero, adoptedGirl);
  assert.equal(romanceRes.ok, false);
  assert.equal(romanceRes.reason, 'KINSHIP_ADOPTION_FORBIDS_ROMANCE');

  // 2. 嘗試入住雙人房：嚴格拒絕
  const dormRes = ledger.assignCoupleDorm(hero, adoptedGirl, 'fac.dorm.b');
  assert.equal(dormRes.ok, false);
  assert.equal(dormRes.reason, 'UNDERAGE_OR_INVALID_ROMANCE_TRACK');
  assert.match(dormRes.message, /未成年弟子或親情軌道不可分配/);
});

test('反例 4: 韋小寶 S4 窄橋封鎖必退與靈物散香驚怪 (counter_weixiaobao_loot_scent_alert / counter_stealth_bypass_chokepoint_and_scent)', () => {
  const actor = {
    id: 'disc.wei',
    name: '韋小寶',
    patrolStyle: 'stealth_looter',
    energy: 90,
    inventory: { limePouchCount: 3 },
  };

  // 韋小寶未清理前路，推進至 S4 窄橋被黑熊阻擋撤退
  const report = simulateSegmentedPatrol(actor, { clearedStages: [] });

  assert.equal(report.maxSegmentReached, 'S4');
  assert.equal(report.retreatReason, 'CHOKEPOINT_BLOCKED');
  assert.equal(report.lootScentAlertTriggered, true);
  assert.ok(report.limePouchesUsed >= 1);
});

test('反例 5: 郭靖攜帶乾糧巡山跨時辰不中斷 (counter_guojing_zero_escape_guarantee / counter_guo_jing_ration_expedition)', () => {
  const actor = {
    id: 'disc.guo_jing',
    name: '郭靖',
    patrolStyle: 'completionist_bulldozer',
    energy: 95,
    satiety: 24, // < 25 飢餓線
    inventory: { rationCount: 1 },
  };

  const report = simulateSegmentedPatrol(actor, {
    forceEatAtS2: true,
  });

  // 斷言：郭靖不可中斷回院吃飯，而是現場席地吃掉乾糧，完成肅清
  assert.equal(report.ateRationOnPath, true);
  assert.equal(report.summaryCounts.escaped, 0);
  assert.equal(report.clearanceRate, 1.0);
  assert.ok(report.timeAllocationSec.eating > 0);
});

test('反例 6: 塔防陣位雙重佔用嚴格拒絕 (counter_td_slot_double_occupancy)', () => {
  const slotMgr = new DefenseSlotManager();

  // 1. 弟子 A 佔用橋頭陣位
  const resA = slotMgr.assignSlot('slot.bridge_front', 'disc.disciple_a', 'solid_anchor');
  assert.equal(resA.ok, true);

  // 2. 弟子 B 試圖佔用同一個已被駐守的陣位：必須被拒絕！
  const resB = slotMgr.assignSlot('slot.bridge_front', 'disc.disciple_b', 'intercept_vanguard');
  assert.equal(resB.ok, false);
  assert.equal(resB.reason, 'SLOT_ALREADY_OCCUPIED');
  assert.equal(resB.currentOccupant, 'disc.disciple_a');
});

test('反例 6b: 巡山返程精力預算嚴格守恆無昏迷 (counter_retreat_energy_exhaustion / counter_retreat_budget_exact_preservation)', () => {
  const engine = new SegmentedPatrolEngine();

  // 角色精力僅剩 28，此處回程路耗需 20 點精力，安全餘裕 8 點。
  // 檢算 28 <= 20 + 8，角色必須立即停止前進返院，抵達山門時剩餘精力 >= 8
  const budget = engine.calculateRetreatBudget(1000, 40, 0.02);
  // returnTripCost = 1000 * 0.02 = 20
  assert.equal(budget.returnTripCost, 20);
  assert.equal(budget.margin, 8);
  assert.equal(budget.totalBudget, 40 * 0.02 + 20 + 8); // 0.8 + 20 + 8 = 28.8

  const canAdvance = engine.canAdvanceSafely(28, 1000, 40, 0.02);
  assert.equal(canAdvance, false); // 精力 28 不足以支撐下一段 + 回程 + 8

  // 執行巡山模擬，給予有限精力
  const wearyDisciple = {
    id: 'disc.weary',
    name: '疲憊弟子',
    patrolStyle: 'completionist_bulldozer',
    energy: 45,
  };

  const report = engine.simulatePatrol(wearyDisciple, { initialEnergy: 45 });
  assert.equal(report.retreatReason, 'ENERGY_BUDGET_RESERVE');
  assert.ok(report.endEnergy >= 8); // 嚴格大於等於 8 點，無昏迷送死！
});
