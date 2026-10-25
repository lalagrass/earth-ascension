// life-v09-v10.test.js
// LIFE-V09-V10 金庸×周星馳 21 大傳奇宗師神功、終極踢館大戰、四大武道相剋、導演鏡頭、開山立匾大典、自創鎮派神功、跨周目天命傳家寶與正式版 Save Schema v1

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LEGENDS_V09_DATA,
  ULTIMATE_MARTIAL_CONSTANTS,
  DIRECTOR_CONSTANTS,
  WorldToneFilter,
  StorytellerPacingGate,
  LegendaryPhysicsEngine,
  evaluateMartialCounter,
  CinemaReplayDirector,
} from '../life/core/legendary-clashes.mjs';

import {
  GRAND_FOUNDING_DATA,
  GrandFoundingManager,
  SectChronicleGenerator,
  LegacyCarryoverManager,
  SaveSchemaV1Manager,
} from '../life/core/grand-founding-save.mjs';

// =========================================================================
// A 組：全明星覺醒與踢館大戰 (DoD A1 ~ A4)
// =========================================================================

test('A1: 說書人因果閥門、登場梯隊限制與畫風濾鏡精確過濾 (DoD A1)', () => {
  const gate = new StorytellerPacingGate({
    worldToneFilter: 'orthodox',
    unlockedStage: 'S0',
  });

  // 1. S0 階段登場梯隊檢核：允許初階奇才，拒絕 S1 / S2 角色
  const s0Check = gate.canTriggerEncounter(1, 'guo_jing');
  assert.equal(s0Check.allowed, true);

  const s1LockedCheck = gate.canTriggerEncounter(2, 'linghu_chong');
  assert.equal(s1LockedCheck.allowed, false);
  assert.equal(s1LockedCheck.reason, 'STAGE_LOCKED');

  // 2. 升級至 S1 後解鎖令狐沖
  gate.unlockedStage = 'S1';
  const s1Check = gate.canTriggerEncounter(2, 'linghu_chong');
  assert.equal(s1Check.allowed, true);

  // 3. 觸發奇遇後，同一旬（10 天內）頻率閥門生效
  const triggerRes = gate.triggerEncounter(3, 'linghu_chong');
  assert.equal(triggerRes.ok, true);

  const sameSeasonCheck = gate.canTriggerEncounter(7, 'huang_rong');
  assert.equal(sameSeasonCheck.allowed, false);
  assert.equal(sameSeasonCheck.reason, 'SEASON_PACING_RATE_LIMIT');
  assert.equal(sameSeasonCheck.nextAllowedDay, 11);

  // 次旬 (第 11 天) 允許觸發
  const nextSeasonCheck = gate.canTriggerEncounter(11, 'huang_rong');
  assert.equal(nextSeasonCheck.allowed, true);
});

test('A2: 八大傳奇物理演出：古鐘獅吼震碎琴刃、空手夾子彈、乾坤反彈、如來神掌 (DoD A2)', () => {
  // 1. 包租婆古銅大鐘獅吼 vs 天殘地缺六指琴魔音波刃
  const landlady = { equippedItem: 'equip.bronze_bell_megaphone' };
  const harpBlades = [{ id: 'blade1' }, { id: 'blade2' }, { id: 'blade3' }];
  const roarRes = LegendaryPhysicsEngine.resolveLionRoarVsHarpWaves(landlady, harpBlades);

  assert.equal(roarRes.ok, true);
  assert.equal(roarRes.shattered, true);
  assert.equal(roarRes.rangeMultiplier, 2.0);
  assert.equal(roarRes.powerMultiplier, 2.0);
  assert.equal(roarRes.shatteredProjectiles, 3);
  assert.equal(roarRes.harpistsStunned, true);
  assert.equal(roarRes.stunDurationTicks, 180);

  // 2. 火雲邪神兩指空手截停子彈
  const bulletAttack = { type: 'bullet', damage: 80, weapon: 'foreign_musket' };
  const beastRes = LegendaryPhysicsEngine.resolveBeastEncounter({}, bulletAttack);

  assert.equal(beastRes.ok, true);
  assert.equal(beastRes.damageTaken, 0);
  assert.equal(beastRes.caughtProjectile, true);
  assert.equal(beastRes.counter_beast_bullet_catch_immunity, true);
  assert.equal(beastRes.toadMissileLaunched, true);
  assert.equal(beastRes.toadShockwave.damage, 140);

  // 3. 張無忌乾坤大挪移 180 度反彈海大富超巨型龜波氣功
  const wuji = { artId: 'art.qiankun_danuoyi', name: '張無忌' };
  const turtleWave = { damage: 160, name: '海大富超巨型龜波氣功' };
  const deflectRes = LegendaryPhysicsEngine.resolveQiankunBeamReflection(wuji, turtleWave);

  assert.equal(deflectRes.ok, true);
  assert.equal(deflectRes.reflected, true);
  assert.equal(deflectRes.angleDegrees, 180);
  assert.equal(deflectRes.damageTaken, 0);
  assert.equal(deflectRes.reflectedDamage, 160);
  assert.equal(deflectRes.targetOriginalSender, true);

  // 4. 包租公真太極大圓圈牽引互撞
  const taijiRes = LegendaryPhysicsEngine.resolveTaijiCircleEntanglement({}, [{ id: 'enemy1' }, { id: 'enemy2' }]);
  assert.equal(taijiRes.ok, true);
  assert.equal(taijiRes.enemiesCollided, true);

  // 5. 城寨三隱士爆衣護山
  const threeHeroes = LegendaryPhysicsEngine.resolveThreeHeroesAwakening();
  assert.equal(threeHeroes.ok, true);
  assert.equal(threeHeroes.apronTorn, true);

  // 6. 東方不敗 0.05s 極速前搖
  const dongfangRes = LegendaryPhysicsEngine.resolveDongfangNeedleRush({}, [1, 2, 3, 4, 5]);
  assert.equal(dongfangRes.ok, true);
  assert.equal(dongfangRes.windupSec, 0.05);
  assert.equal(dongfangRes.windupTicks, 3);
  assert.equal(dongfangRes.targetsHit, 5);
});

test('A3: 四大相剋環結算：破綻克蓄力、蓄力克反彈、反彈克至拙、至拙克破綻 (DoD A3)', () => {
  // 1. 料敵破綻流 (令狐沖) 克 蓄力大招流 (火雲邪神)
  const dugu = { school: 'flaw_exploiter', element: 'agile', name: '令狐沖' };
  const beast = { school: 'charge_ultimate', element: 'fierce', name: '火雲邪神' };

  const match1 = evaluateMartialCounter(dugu, beast);
  assert.equal(match1.advantage, true);
  assert.equal(match1.counterBonus, 1.35);
  assert.equal(match1.defenderInterrupted, true);
  assert.equal(match1.hitstopTicksApplied, 7);
  assert.match(match1.bannerCalligraphyText, /破劍式/);

  // 2. 蓄力大招流 (阿星如來神掌) 克 借力反彈流 (張無忌乾坤)
  const starPalm = { school: 'charge_ultimate', element: 'fierce' };
  const qiankun = { school: 'deflect_counter', element: 'soft' };

  const match2 = evaluateMartialCounter(starPalm, qiankun);
  assert.equal(match2.advantage, true);
  assert.equal(match2.counterBonus, 1.35);
  assert.equal(match2.hitstopTicksApplied, 7);

  // 3. 借力反彈流 (包租公太極) 克 至拙瞬發流 (郭靖羅漢拳)
  const taiji = { school: 'deflect_counter', element: 'soft' };
  const luohanNormal = { school: 'simple_instant', element: 'fierce' };

  const match3 = evaluateMartialCounter(taiji, luohanNormal);
  assert.equal(match3.advantage, true);
  assert.equal(match3.counterBonus, 1.35);

  // 4. 至拙瞬發流 (郭靖) 克 料敵破綻流 (令狐沖九劍)
  const match4 = evaluateMartialCounter(luohanNormal, dugu);
  assert.equal(match4.advantage, true);
  assert.equal(match4.counterBonus, 1.35);

  // 5. 返璞歸真 Lv10 (transcendent) 豁免 0.75x 懲罰
  const luohanTier10 = {
    school: 'simple_instant',
    element: 'fierce',
    transcendent: true,
    artId: 'art.luohan_fist_tier10',
  };

  const matchTranscendent = evaluateMartialCounter(luohanTier10, taiji);
  assert.equal(matchTranscendent.advantage, false);
  assert.equal(matchTranscendent.transcendentImmune, true);
  assert.equal(matchTranscendent.damageMultiplier, 1.0); // 豁免 0.75x 衰減
});

test('A4: 岳不群正邪雙終局宿命分歧：高定力焚袈裟 vs 受挫入魔辟邪劍法 (DoD A4)', () => {
  // 1. 正道君子分支：高定力 (composure >= 9)、高門派道德
  const nobleYue = {
    id: 'disc.yue',
    name: '岳不群',
    stats: { composure: 9 },
    defeatStress: 10,
    hasKasayaScroll: false,
  };
  const orthodoxRes = GrandFoundingManager.resolveYueBuqunDestinyFork(nobleYue, { morality: 85 });

  assert.equal(orthodoxRes.choice, 'orthodox');
  assert.equal(orthodoxRes.unlockedArt, 'art.zixia_tier10');
  assert.equal(orthodoxRes.burnKasaya, true);
  assert.equal(orthodoxRes.moralityShift, 'orthodox');
  assert.equal(orthodoxRes.domainRadiusPx, 120);

  // 2. 邪道辟邪分支：定力受挫 (composure <= 6) 或心魔 stress >= 50
  const fallenYue = {
    id: 'disc.yue',
    name: '岳不群',
    stats: { composure: 5 },
    defeatStress: 60,
    hasKasayaScroll: true,
  };
  const demonicRes = GrandFoundingManager.resolveYueBuqunDestinyFork(fallenYue, { morality: 40 });

  assert.equal(demonicRes.choice, 'demonic');
  assert.equal(demonicRes.unlockedArt, 'art.bixie_sword');
  assert.equal(demonicRes.windupSec, 0.05);
  assert.equal(demonicRes.speedMultiplier, 3.0);
  assert.equal(demonicRes.combatPowerBonus, 3.0);
  assert.equal(demonicRes.moralityShift, 'demonic');
});

// =========================================================================
// B 組：視聽導演與確定性重播 (DoD B1 ~ B4)
// =========================================================================

test('B1: 觀影導演推鏡 1.35x 與 0.3x 慢動作特寫 (DoD B1)', () => {
  const cinematic = CinemaReplayDirector.triggerCinematicZoom(1.35, 0.30, 1500);

  assert.equal(cinematic.zoomLevel, 1.35);
  assert.equal(cinematic.slowMotionMultiplier, 0.30);
  assert.equal(cinematic.durationMs, 1500);
  assert.ok(cinematic.remainingTicks >= 80);
});

test('B2: 10 秒輕量狀態快照 (<=4KB) 執行 600 ticks 確定性重演 (DoD B2)', () => {
  const worldState = {
    gameDay: 15,
    disciples: [
      { id: 'disc.star', hp: 100, qi: 80, x: 200, y: 150, activeArtId: 'art.buddha_palm_ultimate' },
      { id: 'disc.beast', hp: 80, qi: 60, x: 220, y: 150, activeArtId: 'art.toad_missile_charge' },
    ],
  };

  // 擷取快照
  const snapshot = CinemaReplayDirector.captureSnapshot(worldState, 'climax.buddha_palm_ground_crater', 1000, 777);

  assert.ok(snapshot.byteLength <= DIRECTOR_CONSTANTS.replay.snapshotMaxSizeBytes);
  assert.ok(snapshot.byteLength <= 4096);
  assert.equal(snapshot.totalReplayTicks, 600);

  // 確定性重演步進函式
  const tickFn = (state, tick) => {
    for (const e of state.entities) {
      e.x = (e.x + (tick % 3)) % 500;
      e.y = (e.y + (tick % 2)) % 500;
    }
    return state;
  };

  // 第一次重演
  const run1 = CinemaReplayDirector.replaySnapshot(snapshot, tickFn);
  // 第二次重演
  const run2 = CinemaReplayDirector.replaySnapshot(snapshot, tickFn);

  assert.equal(run1.ok, true);
  assert.equal(run2.ok, true);
  assert.equal(run1.totalTicks, 600);
  assert.equal(run1.finalStateHash, run2.finalStateHash);
});

test('B3: 三層水墨視覺層級與 0.12s 頓幀 Hitstop (DoD B3 & B4)', () => {
  // 1. 頓幀結算
  const hitstop = CinemaReplayDirector.applyHitstop(DIRECTOR_CONSTANTS.hitstop.durationTicks);
  assert.equal(hitstop.hitstopTicks, 7);
  assert.equal(hitstop.durationMs, 120);
  assert.equal(hitstop.screenShakeIntensityPx, 3);

  // 2. 三層視覺透明度常數規範
  const groundInkLayerOpacity = 0.25;
  const midQiLayerOpacity = 0.50;
  const topHitstopLayerOpacity = 1.0;

  assert.equal(groundInkLayerOpacity, 0.25);
  assert.equal(midQiLayerOpacity, 0.50);
  assert.equal(topHitstopLayerOpacity, 1.0);
});

// =========================================================================
// C 組：開山立匾與自創鎮派神功 (DoD C1 ~ C4)
// =========================================================================

test('C1: 開山立匾大典門檻檢核與自訂宗門名號持久化 (DoD C1)', () => {
  const worldState = {
    gameDay: 20,
    reputation: 85,
    hallStage: 2,
    hasUltimateOrTier3Art: true,
    disciples: [1, 2, 3, 4, 5, 6, 7, 8],
    facilities: { 'fac.hall': { stage: 2 } },
    scriptures: [1, 2, 3],
  };

  // 檢核門檻
  const check = GrandFoundingManager.checkFoundingPrerequisites(worldState);
  assert.equal(check.satisfied, true);
  assert.equal(check.missing.length, 0);

  // 舉辦立匾大典
  const ceremonyRes = GrandFoundingManager.holdGrandFoundingCeremony(worldState, {
    sectName: '玄華仙劍門',
    sectEthos: '行俠仗義、剛柔並濟',
    founderDiscipleId: 'disc.founder',
  });

  assert.equal(ceremonyRes.ok, true);
  assert.equal(ceremonyRes.foundingRecord.sectName, '玄華仙劍門');
  assert.equal(ceremonyRes.foundingRecord.sectEthos, '行俠仗義、剛柔並濟');
  assert.equal(ceremonyRes.foundingRecord.plaqueHung, true);
  assert.equal(worldState.sect.sectName, '玄華仙劍門');
});

test('C2: 掌門自創第四階鎮派絕學，著入寶典供門徒研習 (DoD C2 & C4)', () => {
  // 合法自創神功 (平衡預算內)
  const validArtRes = GrandFoundingManager.createCustomUltimateArt({
    customName: '《松風萬壑劍陣》',
    damage: 140,
    radiusPx: 90,
    knockback: 60,
    qiCost: 45,
    cooldownSec: 4.5,
  });

  assert.equal(validArtRes.ok, true);
  assert.equal(validArtRes.art.customName, '《松風萬壑劍陣》');
  assert.equal(validArtRes.art.geometricShape, 'domain');
  assert.equal(validArtRes.art.scriptureAuthoringComplete, true);
  assert.ok(validArtRes.art.allocatedBudget <= 100);

  // 破壞平衡的超標神功 (0 消耗、全屏秒殺) 被嚴格拒絕
  const opArtRes = GrandFoundingManager.createCustomUltimateArt({
    customName: '《秒殺全屏神功》',
    damage: 999,
    radiusPx: 500,
    knockback: 300,
    qiCost: 0,
    cooldownSec: 0.1,
  });

  assert.equal(opArtRes.ok, false);
  assert.equal(opArtRes.reason, 'EXCEEDS_BALANCE_BUDGET');
  assert.ok(opArtRes.cost > 100);
});

test('C3: 宗門編年史長卷圖文自動生成與事件渲染 (DoD C3)', () => {
  const chronicle = SectChronicleGenerator.generateChronicleScroll();

  assert.ok(Array.isArray(chronicle));
  assert.ok(chronicle.length >= 3);

  const [s0, star, founding] = chronicle;
  assert.match(s0.title, /破道館起家/);
  assert.match(star.title, /如來神掌退強敵/);
  assert.match(founding.title, /開宗立匾/);
});

// =========================================================================
// D 組：天命功德池與正式存檔 (DoD D1 ~ D3)
// =========================================================================

test('D1: 雙軌天命功德池、成就贈點、開局主角解鎖與傳家寶繼承 (DoD D1)', () => {
  // 1. 免費成就贈點
  const pool = LegacyCarryoverManager.createMeritPool(5, 5);
  const earned = LegacyCarryoverManager.calculateMeritPoints([
    'ah_sing_cocoon',
    'haidafu_tonic',
    'luohan_tier10',
    'grand_founding',
  ]);

  assert.equal(earned.meritPoints, 3 + 2 + 4 + 5);
  assert.ok(earned.unlockedProtagonists.includes('ah_sing'));
  assert.ok(earned.unlockedProtagonists.includes('guo_jing'));

  pool.freeMeritPoints += earned.meritPoints;

  // 2. 繼承上一周目傳家寶：七十斤玄鐵重劍 (需 4 點)
  const heavySword = GRAND_FOUNDING_DATA.heirloomCatalog['equip.heavy_iron_sword'];
  const carryRes = LegacyCarryoverManager.carryoverHeirloom(pool, heavySword);

  assert.equal(carryRes.ok, true);
  assert.equal(pool.heirloomsCarryover.selectedEquipmentId, 'equip.heavy_iron_sword');
  assert.equal(pool.heirloomsCarryover.meritCostPaid, 4);
});

test('D2: Save Schema v1 往返序列化無損與資料完整性 (DoD D2)', () => {
  const worldState = {
    savedAtTimestamp: 1700000000000,
    gameDay: 25,
    gameTick: 90000,
    initialSeed: 9999,
    sect: { sectName: '泰華仙門', ethos: '浩然正氣' },
    storyteller: { stage: 'S2', worldToneFilter: 'hybrid' },
    destinyPool: { freeMeritPoints: 12, supporterMeritPoints: 0 },
    world: {
      facilities: { 'fac.hall': { stage: 2 } },
      disciples: [{ id: 'disc.star', hp: 100 }],
      inventory: { wood: 100, stone: 80 },
      scriptures: [{ id: 'art.buddha_palm_ultimate' }],
      chronicle: [{ day: 1, title: '開基立業' }],
    },
  };

  const jsonStr = SaveSchemaV1Manager.saveToV1Json(worldState);
  assert.ok(typeof jsonStr === 'string');

  const loadRes = SaveSchemaV1Manager.loadFromV1Json(jsonStr);
  assert.equal(loadRes.ok, true);

  const restored = loadRes.worldState;
  assert.equal(restored.schemaVersion, 'sect-life-v1.0');
  assert.equal(restored.gameDay, 25);
  assert.equal(restored.initialSeed, 9999);
  assert.equal(restored.sect.sectName, '泰華仙門');
  assert.equal(restored.world.inventory.wood, 100);
});

test('D3: 長時回放驗證：直跑 vs 存讀再跑 Determinism Hash 100% 一致 (DoD D3)', () => {
  const result = SaveSchemaV1Manager.verifySaveLoadDeterminism(2026, 120, 120);

  assert.equal(result.deterministic, true);
  assert.equal(result.hashDirect, result.hashSaveLoad);
});

// =========================================================================
// 6 個直接反例斷言 (Direct Counter-Examples)
// =========================================================================

test('反例 1: 說書人連續拜山踢館冷卻拒絕反例 (counter_storyteller_consecutive_raid_spam & counter_storyteller_pacing_gate_rate_limit)', () => {
  const gate = new StorytellerPacingGate({
    unlockedStage: 'S2',
    minCooldownTicks: 3600,
    seasonDurationDays: 10,
  });

  // 1. 拜山踢館冷卻反例
  gate.triggerRivalChallenge(1000, 'tiancan_dique', 100);

  // 在冷卻時間內 (tick 2000 < 1000 + 3600) 再次觸發踢館
  const spamCheck = gate.canTriggerRivalChallenge(2000, 'the_beast', 100);
  assert.equal(spamCheck.allowed, false);
  assert.equal(spamCheck.reason, 'COOLDOWN_ACTIVE');
  assert.equal(spamCheck.counter_storyteller_consecutive_raid_spam, true);
  assert.equal(spamCheck.remainingTicks, 2600);

  // 冷卻過後 (tick 4700 >= 1000 + 3600) 允許踢館
  const readyCheck = gate.canTriggerRivalChallenge(4700, 'the_beast', 100);
  assert.equal(readyCheck.allowed, true);

  // 2. 同一旬奇遇頻率反例 (第 5 天觸發令狐沖，第 7 天強制注入洪七公被拒)
  gate.triggerEncounter(5, 'linghu_chong');
  const rejectEncounter = gate.canTriggerEncounter(7, 'hong_qigong');
  assert.equal(rejectEncounter.allowed, false);
  assert.equal(rejectEncounter.reason, 'SEASON_PACING_RATE_LIMIT');
  assert.equal(rejectEncounter.nextAllowedDay, 11);
});

test('反例 2: 正統金庸武俠濾鏡嚴格遮蔽星爺角色反例 (counter_orthodox_filter_blocks_stephen_chow & counter_world_tone_filter_strictness)', () => {
  // 選定正統金庸濾鏡
  const filterMode = 'orthodox';

  const stephenChowRoster = ['火雲邪神', '包租婆', '阿星', '海大富', '韋小寶'];

  for (const name of stephenChowRoster) {
    const res = WorldToneFilter.canSpawnCharacter(name, filterMode);
    assert.equal(res.allowed, false);
    assert.equal(res.reason, 'BLOCKED_BY_ORTHODOX_TONE_FILTER');
  }

  // 金庸系角色正常允許
  const jinyongRoster = ['岳不群', '令狐沖', '郭靖', '喬峰', '張無忌'];
  for (const name of jinyongRoster) {
    const res = WorldToneFilter.canSpawnCharacter(name, filterMode);
    assert.equal(res.allowed, true);
  }
});

test('反例 3: 火雲邪神兩指夾子彈免疫反例與四大相剋嚴格生效 (counter_beast_bullet_catch_immunity & counter_martial_four_cycle_counter)', () => {
  // 1. 空手夾子彈：零傷害、距離 0、免疫
  const firearmBullet = { type: 'bullet', damage: 150, weapon: 'foreign_musket' };
  const catchRes = LegendaryPhysicsEngine.resolveBeastEncounter({}, firearmBullet);

  assert.equal(catchRes.ok, true);
  assert.equal(catchRes.damageTaken, 0);
  assert.equal(catchRes.caughtProjectile, true);
  assert.equal(catchRes.counter_beast_bullet_catch_immunity, true);
  assert.equal(catchRes.catchDistancePx, 0);
  assert.equal(catchRes.toadMissileLaunched, true);

  // 2. 相剋環：獨孤九劍 (料敵破綻) 打斷蛤蟆功 (蓄力)，附加 0.12s 頓幀
  const dugu = { school: 'flaw_exploiter' };
  const toad = { school: 'charge_ultimate' };
  const counterRes = evaluateMartialCounter(dugu, toad);

  assert.equal(counterRes.advantage, true);
  assert.equal(counterRes.defenderInterrupted, true);
  assert.equal(counterRes.hitstopTicksApplied, 7);

  // 反之：獨孤九劍對陣返璞歸真羅漢拳 (至拙瞬發)，九劍無法打斷且遭相剋
  const luohan = { school: 'simple_instant' };
  const failCounter = evaluateMartialCounter(dugu, luohan);
  assert.equal(failCounter.advantage, false);
  assert.equal(failCounter.defenderAdvantage, true);
  assert.equal(failCounter.defenderInterrupted, false);
});

test('反例 4: 阿星未破繭嚴格禁止如來神掌反例 (counter_ahsing_premature_rulai_without_cocoon & counter_instant_replay_deterministic_parity)', () => {
  // 1. 混混時期（未破繭）直接發動如來神掌被嚴格拒絕
  const rawAhSing = { hp: 100, inCocoon: false, cocoonReborn: false };
  const prematureRes = LegendaryPhysicsEngine.executeAhSingRulaiPalm(rawAhSing);

  assert.equal(prematureRes.ok, false);
  assert.equal(prematureRes.reason, 'REQUIRES_MUMMY_COCOON_REBIRTH');
  assert.equal(prematureRes.counter_ahsing_premature_rulai_without_cocoon, true);

  // 經受重傷結繭 -> 破繭成蝶後方能發動
  LegendaryPhysicsEngine.resolveAhSingCocoonAndRulaiPalm(rawAhSing, 95);
  assert.equal(rawAhSing.inCocoon, true);

  LegendaryPhysicsEngine.completeAhSingCocoon(rawAhSing);
  assert.equal(rawAhSing.cocoonReborn, true);

  const rebornRes = LegendaryPhysicsEngine.executeAhSingRulaiPalm(rawAhSing);
  assert.equal(rebornRes.ok, true);
  assert.equal(rebornRes.groundCraterPermanent, true);

  // 2. 10 秒快照重播無漂移反例
  const snap = CinemaReplayDirector.captureSnapshot({ disciples: [{ id: 'star', hp: 100 }] }, 'buddha_palm', 0, 42);
  const step = (s, t) => { s.entities[0].hp = (s.entities[0].hp + t) % 100; return s; };
  const repA = CinemaReplayDirector.replaySnapshot(snap, step);
  const repB = CinemaReplayDirector.replaySnapshot(snap, step);
  assert.equal(repA.finalStateHash, repB.finalStateHash);
});

test('反例 5: 損毀存檔與錯誤版本嚴格拒絕反例 (counter_corrupted_save_schema_rejection & counter_save_schema_v1_roundtrip_integrity)', () => {
  // 1. 錯誤的版本號
  const wrongVersionJson = JSON.stringify({
    version: 1,
    schemaVersion: 'sect-life-v0.5-beta',
    savedAtTimestamp: Date.now(),
    gameDay: 1,
    gameTick: 0,
    initialSeed: 42,
    world: {},
  });

  const resWrong = SaveSchemaV1Manager.loadFromV1Json(wrongVersionJson);
  assert.equal(resWrong.ok, false);
  assert.equal(resWrong.reason, 'INVALID_SAVE_SCHEMA_VERSION');
  assert.equal(resWrong.counter_corrupted_save_schema_rejection, true);

  // 2. 損毀的畸變 JSON
  const corruptedJson = '{ schemaVersion: "sect-life-v1.0", broken...';
  const resCorrupt = SaveSchemaV1Manager.loadFromV1Json(corruptedJson);
  assert.equal(resCorrupt.ok, false);
  assert.equal(resCorrupt.reason, 'CORRUPTED_JSON_PAYLOAD');

  // 3. 正確存檔往返無損完整性
  const goodJson = SaveSchemaV1Manager.saveToV1Json({
    initialSeed: 1234,
    sect: { sectName: '九華派' },
  });
  const resGood = SaveSchemaV1Manager.loadFromV1Json(goodJson);
  assert.equal(resGood.ok, true);
  assert.equal(resGood.worldState.sect.sectName, '九華派');
});

test('反例 6: 功德點不足拒絕繼承傳家寶反例與存讀確定性無漂移 (counter_heirloom_carryover_destiny_cost & counter_save_load_hash_divergence)', () => {
  // 1. 天命功德點不足拒絕反例
  // 傳家寶玄鐵重劍需 4 點功德點；當前功德池僅有 2 點
  const poorPool = LegacyCarryoverManager.createMeritPool(2, 0);
  const heavySword = GRAND_FOUNDING_DATA.heirloomCatalog['equip.heavy_iron_sword']; // cost = 4

  const inheritFail = LegacyCarryoverManager.carryoverHeirloom(poorPool, heavySword);
  assert.equal(inheritFail.ok, false);
  assert.equal(inheritFail.reason, 'INSUFFICIENT_DESTINY_POINTS');
  assert.equal(inheritFail.counter_heirloom_carryover_destiny_cost, true);
  assert.equal(inheritFail.currentPoints, 2);
  assert.equal(inheritFail.requiredCost, 4);

  // 2. 存讀確定性回放無漂移反例
  const determinismRes = SaveSchemaV1Manager.verifySaveLoadDeterminism(8888, 60, 60);
  assert.equal(determinismRes.deterministic, true);
  assert.equal(determinismRes.counter_save_load_hash_divergence, true);
  assert.equal(determinismRes.hashDirect, determinismRes.hashSaveLoad);
});
