// life-v03-v04.test.js
// LIFE-V03-V04 專屬單元與確定性反例測試 (DoD A～D 與 6 大直接反例)

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GardenPlotManager,
  KitchenManager,
  RationPouchManager,
  BreweryManager,
  runCommunalDining,
  HomesteadManager,
  LIFE_V03_CONSTANTS,
  RECIPES_DATA,
} from '../life/core/homestead.mjs';

import {
  MartialCombatEngine,
  SparringSession,
  resolveSectOrigin,
  resolveSectYardLoadout,
  interpolateMoveStats,
  checkGeometricHit,
  resolveCreekPath,
  LIFE_V04_CONSTANTS,
  SECT_ORIGINS_DATA,
  MARTIAL_ARTS_DATA,
} from '../life/core/martial-combat.mjs';

// =========================================================================
// A 組：菜園灌溉、名菜烹飪、乾糧封裝與後院釀酒 (DoD A1 ~ A4)
// =========================================================================

test('A1: 菜園濕度與作物生長成熟閉環 (農藝與藥理成長)', () => {
  const manager = new GardenPlotManager();

  // 1. 建立四季菜畦與靈草藥圃
  const vegePlot = manager.createPlot({
    plotId: 'plot.vege_1',
    type: 'vegetable',
    cropId: 'crop.cabbage',
    moisture: 60,
  });

  const herbPlot = manager.createPlot({
    plotId: 'plot.herb_1',
    type: 'herb',
    cropId: 'crop.herbal_diting',
    moisture: 50,
  });

  assert.equal(vegePlot.stage, 'seeded');
  assert.equal(vegePlot.growthTicks, 0);

  // 2. 正常推進 1800 ticks (半熟)
  manager.tick(1800, { decayPerTick: 0 }); // 關閉衰減以便測試純進度
  assert.equal(vegePlot.growthTicks, 1800);
  assert.equal(vegePlot.stage, 'sprouting');

  // 3. 推進至成熟 (3600 ticks)
  manager.tick(1800, { decayPerTick: 0 });
  assert.equal(vegePlot.growthTicks, 3600);
  assert.equal(vegePlot.stage, 'mature');

  // 4. 收穫結算
  const disciple = { id: 'disc.tester', skills: { agriculture: 5 } };
  const harvestRes = manager.harvestPlot('plot.vege_1', disciple);

  assert.equal(harvestRes.ok, true);
  assert.equal(harvestRes.yieldItem, 'item.cabbage');
  assert.equal(harvestRes.yieldCount, 2);
  assert.equal(harvestRes.xpAwarded.skill, 'agriculture');
  assert.ok(harvestRes.xpAwarded.amount > 0);
  assert.equal(disciple.skills.agriculture > 5, true);

  // 地塊重設為空
  assert.equal(vegePlot.stage, 'empty');
  assert.equal(vegePlot.cropId, null);
  assert.equal(vegePlot.growthTicks, 0);
});

test('A2: 膳房四階名菜烹飪與 FoodAromaAd 菜香廣告廣播', () => {
  const kitchen = new KitchenManager();
  const inventory = { timber: 10, water: 10 };

  // 1. 凡菜 (common): 粗糧菜飯，不散發菜香
  const res1 = kitchen.cookDish('recipe.vege_rice', { inventory, tick: 100 });
  assert.equal(res1.ok, true);
  assert.equal(res1.dish.tier, 'common');
  assert.equal(res1.dish.satiety, 30);
  assert.equal(res1.aromaAd, null);

  // 2. 珍饈 (rare): 叫化燒雞，散發半徑 300 菜香
  const res2 = kitchen.cookDish('recipe.beggar_chicken', { inventory, tick: 200, kitchenPos: [900, 450] });
  assert.equal(res2.ok, true);
  assert.equal(res2.dish.tier, 'rare');
  assert.equal(res2.dish.satiety, 75);
  assert.notEqual(res2.aromaAd, null);
  assert.equal(res2.aromaAd.type, 'FoodAromaAd');
  assert.equal(res2.aromaAd.radius, 300);
  assert.deepEqual(res2.aromaAd.centerPos, [900, 450]);

  // 3. 絕味 (legendary): 玉笛誰家聽落梅，散發半徑 600 菜香並吸引洪七公
  const res3 = kitchen.cookDish('recipe.plum_blossom', { inventory, tick: 300 });
  assert.equal(res3.ok, true);
  assert.equal(res3.dish.tier, 'legendary');
  assert.equal(res3.dish.satiety, 100);
  assert.equal(res3.aromaAd.radius, 600);
  assert.ok(res3.aromaAd.attracts.includes('hong_qigong'));
});

test('A3: 隨身行軍乾糧袋打包、攜帶與 2 秒食用補給', () => {
  const disciple = {
    id: 'disc.patrol_scout',
    satiety: 20,
    energy: 30,
    rationPouch: RationPouchManager.createPouch('disc.patrol_scout', 2),
  };

  // 1. 打包 1 份荷葉飯糰
  const packRes = RationPouchManager.packRation(disciple, 'ration.rice_ball');
  assert.equal(packRes.ok, true);
  assert.equal(disciple.rationPouch.items.length, 1);
  assert.equal(disciple.rationPouch.items[0].satietyAmount, 25);

  // 2. 食用乾糧，於 2 秒 (120 ticks) 補給飽足與精力
  const consumeRes = RationPouchManager.consumeRation(disciple, 0);
  assert.equal(consumeRes.ok, true);
  assert.equal(consumeRes.eatDurationTicks, 120);
  assert.equal(consumeRes.restored.satiety, 25);
  assert.equal(consumeRes.restored.energy, 15);
  assert.equal(disciple.satiety, 45); // 20 + 25
  assert.equal(disciple.energy, 45); // 30 + 15
  assert.equal(disciple.rationPouch.items.length, 0);
});

test('A4: 後院釀酒微醺與豪飲 Buff 結算 (持續 120 秒)', () => {
  const brewery = new BreweryManager();
  const inventory = { water: 5 };

  // 1. 釀造猴兒百果酒
  const brewRes = brewery.brewWine('brew.monkey_wine', { inventory });
  assert.equal(brewRes.ok, true);
  assert.equal(brewRes.wine.name, '猴兒百果酒');

  // 2. 令狐沖飲用猴兒酒，進入微醺狀態 (破綻捕捉率 +15%，持續 7200 ticks / 120s)
  const linghu = { id: 'linghu_chong', name: '令狐沖', buffs: {} };
  const drinkRes = brewery.drinkWine(linghu, brewRes.wine);
  assert.equal(drinkRes.ok, true);
  assert.equal(linghu.buffs.tipsy_sword_flaw_bonus.effects.flawCaptureBonus, 0.15);
  assert.equal(linghu.buffs.tipsy_sword_flaw_bonus.durationTicks, 7200);

  // 3. 釀造關外燒刀子並飲用，獲得豪飲戰意 (威脅喝止度 +20)
  const qiaofeng = { id: 'qiao_feng', name: '喬峰', buffs: {} };
  brewery.drinkWine(qiaofeng, 'brew.strong_liquor');
  assert.equal(qiaofeng.buffs.bold_threat_bonus.effects.roarThreatBonus, 20);
  assert.equal(qiaofeng.buffs.bold_threat_bonus.durationTicks, 7200);
});

test('A5: 餐敘棚圍桌共食 (runCommunalDining) 與好感度累積', () => {
  const disciples = [
    { id: 'd1', name: '岳靈珊', satiety: 30, energy: 40, affinities: {} },
    { id: 'd2', name: '令狐沖', satiety: 25, energy: 35, affinities: {} },
  ];
  const artisans = [
    { id: 'artisan_1', name: '王木匠', satiety: 20, energy: 30, affinities: {} },
  ];

  const diningReport = runCommunalDining(disciples, artisans);
  assert.equal(diningReport.ok, true);
  assert.equal(diningReport.participantsCount, 3);
  assert.ok(disciples[0].satiety > 30);
  assert.ok(disciples[1].energy > 35);
  assert.ok(disciples[0].affinities['d2'] > 0);
  assert.ok(diningReport.dialogueBubbles.length >= 2);
});

test('A6: 鎮北武館/郭靖道統行軍乾糧袋上限 +1 擴展驗證 (容量 3 份)', () => {
  const guoJing = {
    id: 'disc.guo_jing',
    name: '郭靖',
    templateId: 'guo_jing',
    sectOriginId: 'origin.beixia_palm',
  };

  const cap = RationPouchManager.getCapacity(guoJing);
  assert.equal(cap, 3, '郭靖/鎮北武館道統乾糧袋容量應為 3 份 (基礎 2 + 1)');

  const r1 = RationPouchManager.packRation(guoJing, 'ration.rice_ball');
  const r2 = RationPouchManager.packRation(guoJing, 'ration.rice_ball');
  const r3 = RationPouchManager.packRation(guoJing, 'ration.chicken_leg');
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.equal(r3.ok, true);
  assert.equal(guoJing.rationPouch.items.length, 3);

  // 第 4 份超出上限拒絕
  const r4 = RationPouchManager.packRation(guoJing, 'ration.chicken_leg');
  assert.equal(r4.ok, false);
  assert.equal(r4.reason, 'RATION_POUCH_FULL');
  assert.equal(guoJing.rationPouch.items.length, 3);
});

// =========================================================================
// B 組：門派道統雙脈武學、三段招式狀態機與四維根基 (DoD B1 ~ B3)
// =========================================================================

test('B1: Veloren 式三段招式狀態機 (Buildup -> Action -> Recover)', () => {
  const actor = { id: 'hero', currentMove: null, foundation: {} };
  const target = { id: 'dummy_target', pos: [30, 0], radius: 10 };

  // 1. 發動推山掌 Lv3
  const moveState = MartialCombatEngine.startMove(actor, 'art.qingsong_palm', 3, 0, [0, 0]);
  assert.equal(moveState.phase, 'buildup');
  assert.equal(moveState.buildupTicks, 30); // Lv3 buildup ticks

  // 2. 推進 Buildup 前 29 ticks，仍處於前搖
  for (let i = 0; i < 29; i++) {
    const res = MartialCombatEngine.tickMove(actor, [target]);
    assert.equal(res.phase, 'buildup');
  }

  // 3. 第 30 tick 轉入 Action 階段，觸發幾何命中
  let hitDetected = false;
  const actionRes = MartialCombatEngine.tickMove(actor, [target], {
    onHit: (t, stats) => {
      hitDetected = true;
      assert.equal(t.id, 'dummy_target');
    },
  });
  assert.equal(actor.currentMove.phase, 'action');
  assert.equal(hitDetected, true);

  // 4. 推進 Action 階段 (12 ticks)
  for (let i = 0; i < 11; i++) {
    MartialCombatEngine.tickMove(actor, [target]);
  }

  // 5. 轉入 Recover 收勢階段 (Lv3 recoverTicks: 24)
  assert.equal(actor.currentMove.phase, 'recover');
  for (let i = 0; i < 24; i++) {
    MartialCombatEngine.tickMove(actor, [target]);
  }

  // 6. 招式完整收勢，狀態機回歸空閒並結算臂力根基
  assert.equal(actor.currentMove, null);
  assert.ok(actor.foundation.strength > 0);
});

test('B2: 六大經典掌門道統與雙脈四招配置 (resolveSectYardLoadout)', () => {
  // 測試 1：岳不群（華山君子）+ 令狐沖客座搭檔
  const yueLoadout = resolveSectYardLoadout('yue_buqun', 'linghu_chong');
  assert.equal(yueLoadout.trainingPostTheme, 'bamboo_sword_target');
  assert.equal(yueLoadout.trainingPostName, '青竹君子劍靶');
  assert.deepEqual(yueLoadout.universalArts, ['basic_iron_shirt', 'taxue_wuhen']);
  assert.equal(yueLoadout.founderArt, 'art.huashan_basic_sword');
  assert.equal(yueLoadout.fellowGuestArt, 'art.wuyue_fast_sword');
  assert.equal(yueLoadout.allUnlockedArts.length, 4);

  // 測試 2：郭靖（鎮北武館）+ 韋小寶客座搭檔
  const guoLoadout = resolveSectYardLoadout('guo_jing', 'wei_xiaobao');
  assert.equal(guoLoadout.trainingPostTheme, 'heavy_sand_post');
  assert.equal(guoLoadout.trainingPostName, '千斤重砂木人樁');
  assert.equal(guoLoadout.founderArt, 'art.luohan_open_palm');
  assert.equal(guoLoadout.fellowGuestArt, 'art.yangzhou_lime_dagger');

  // 測試 3：阿星（萬佛武館）+ 包租婆客座搭檔
  const singLoadout = resolveSectYardLoadout('ah_sing', 'landlady');
  assert.equal(singLoadout.trainingPostTheme, 'sandbag_straw_dummy');
  assert.equal(singLoadout.founderArt, 'art.booklet_rulai_palm');
  assert.equal(singLoadout.fellowGuestArt, 'art.hedong_lion_roar');

  // 測試 4：包租婆（豬籠寨大院）
  const landladyOrigin = resolveSectOrigin('landlady');
  assert.equal(landladyOrigin.trainingPostTheme, 'bronze_echo_gong');
  assert.equal(landladyOrigin.plaque, '大隱於市');
});

test('B3: 幾何判定形態覆蓋 (Cone/Sector, Arc, Line, Circle)', () => {
  // 1. 扇形/錐形 (Cone): 正前方在半徑內命中，後方未命中
  const coneHitFront = checkGeometricHit({
    shape: 'cone',
    origin: [0, 0],
    facingDeg: 0,
    targetPos: [25, 5],
    radius: 35,
    angleDeg: 60,
  });
  const coneHitBack = checkGeometricHit({
    shape: 'cone',
    origin: [0, 0],
    facingDeg: 0,
    targetPos: [-25, 0],
    radius: 35,
    angleDeg: 60,
  });
  assert.equal(coneHitFront, true);
  assert.equal(coneHitBack, false);

  // 2. 直線穿透 (Line): 沿著出招軸心命中，兩側過遠未命中
  const lineHitFront = checkGeometricHit({
    shape: 'line',
    origin: [0, 0],
    facingDeg: 90, // 朝正下
    targetPos: [0, 50],
    length: 70,
    width: 16,
  });
  const lineMissSide = checkGeometricHit({
    shape: 'line',
    origin: [0, 0],
    facingDeg: 90,
    targetPos: [35, 30],
    length: 70,
    width: 16,
  });
  assert.equal(lineHitFront, true);
  assert.equal(lineMissSide, false);

  // 3. 圓形音浪 (Circle)
  const circleHit = checkGeometricHit({
    shape: 'circle',
    origin: [100, 100],
    targetPos: [130, 100],
    radius: 40,
  });
  assert.equal(circleHit, true);
});

test('B4: 完整 6 大經典道統與 4 大自定宗派 (Custom Branches) 專屬武學映照驗證', () => {
  // 1. 岳不群 ➔ 華山君子劍派
  const yue = resolveSectOrigin('yue_buqun');
  assert.equal(yue.originId, 'origin.huashan_junzi');
  assert.equal(yue.sectName, '華山別院');
  assert.equal(yue.plaque, '氣冠紫霞');
  assert.equal(yue.doctrine, '紫霞養氣・君子端方');
  assert.equal(yue.trainingPostTheme, 'bamboo_sword_target');
  assert.equal(yue.founderArtId, 'art.huashan_basic_sword');
  assert.equal(yue.internalArtId, 'art.huashan_baoyuan_qi');

  // 2. 郭靖 ➔ 鎮北武館
  const guo = resolveSectOrigin('guo_jing');
  assert.equal(guo.originId, 'origin.beixia_palm');
  assert.equal(guo.sectName, '鎮北武館');
  assert.equal(guo.plaque, '俠之大者');
  assert.equal(guo.doctrine, '抱樸守拙・苦練樁功');
  assert.equal(guo.trainingPostTheme, 'heavy_sand_post');
  assert.equal(guo.founderArtId, 'art.luohan_open_palm');
  assert.equal(guo.internalArtId, 'art.quanzhen_jinyan');

  // 3. 韋小寶 ➔ 通吃山莊
  const wei = resolveSectOrigin('wei_xiaobao');
  assert.equal(wei.originId, 'origin.luding_qimen');
  assert.equal(wei.sectName, '通吃山莊');
  assert.equal(wei.plaque, '鹿鼎奇門');
  assert.equal(wei.doctrine, '義氣聚財・奇門暗器');
  assert.equal(wei.trainingPostTheme, 'nine_palace_poles');
  assert.equal(wei.founderArtId, 'art.yangzhou_lime_dagger');
  assert.equal(wei.internalArtId, 'art.shenxing_basic_step');

  // 4. 令狐沖 ➔ 見性劍廬
  const linghu = resolveSectOrigin('linghu_chong');
  assert.equal(linghu.originId, 'origin.xiaoyao_sword');
  assert.equal(linghu.sectName, '見性劍廬');
  assert.equal(linghu.plaque, '笑傲江湖');
  assert.equal(linghu.doctrine, '無招勝有招・美酒論劍');
  assert.equal(linghu.trainingPostTheme, 'cliff_rock_post');
  assert.equal(linghu.founderArtId, 'art.wuyue_fast_sword');
  assert.equal(linghu.internalArtId, 'art.drunken_snow_step');

  // 5. 阿星 ➔ 萬佛武館
  const sing = resolveSectOrigin('ah_sing');
  assert.equal(sing.originId, 'origin.wanfo_palm');
  assert.equal(sing.sectName, '萬佛武館');
  assert.equal(sing.plaque, '萬中無一');
  assert.equal(sing.doctrine, '懲惡揚善・絕境逢生');
  assert.equal(sing.trainingPostTheme, 'sandbag_straw_dummy');
  assert.equal(sing.founderArtId, 'art.booklet_rulai_palm');
  assert.equal(sing.internalArtId, 'art.street_shadow_step');

  // 6. 包租婆 ➔ 豬籠寨大院
  const landlady = resolveSectOrigin('landlady');
  assert.equal(landlady.originId, 'origin.zhulong_compound');
  assert.equal(landlady.sectName, '豬籠寨大院');
  assert.equal(landlady.plaque, '大隱於市');
  assert.equal(landlady.doctrine, '包租當家・一吼百應');
  assert.equal(landlady.trainingPostTheme, 'bronze_echo_gong');
  assert.equal(landlady.founderArtId, 'art.hedong_lion_roar');
  assert.equal(landlady.internalArtId, 'art.windfire_chase_step');

  // 7~10. 自創宗派 (Custom branches) 映照 4 門基礎武學
  const customPalm = resolveSectOrigin('custom_palm');
  assert.equal(customPalm.originId, 'origin.custom_palm');
  assert.equal(customPalm.founderArtId, 'art.qingsong_palm');
  assert.equal(customPalm.internalArtId, 'art.panshi_breathing');

  const customSword = resolveSectOrigin('custom_sword');
  assert.equal(customSword.originId, 'origin.custom_sword');
  assert.equal(customSword.founderArtId, 'art.liuyun_sword');
  assert.equal(customSword.internalArtId, 'art.taxue_wuhen');

  const customInternal = resolveSectOrigin('custom_internal');
  assert.equal(customInternal.originId, 'origin.custom_internal');
  assert.equal(customInternal.founderArtId, 'art.panshi_breathing');

  const customQimen = resolveSectOrigin('custom_qimen');
  assert.equal(customQimen.originId, 'origin.custom_qimen');
  assert.equal(customQimen.founderArtId, 'art.qimei_staff');
});

test('B5: 招式熟練度 Lv0~Lv5 連續線性內插 (interpolateMoveStats)', () => {
  // 青松掌・推山掌：Lv0 (48t, 28px, 50°) ➔ Lv3 (30t, 34px, 65°) ➔ Lv5 (20t, 38px, 75°)
  const palmLv0 = interpolateMoveStats('art.qingsong_palm', 0);
  const palmLv3 = interpolateMoveStats('art.qingsong_palm', 3);
  const palmLv5 = interpolateMoveStats('art.qingsong_palm', 5);

  assert.equal(palmLv0.buildupTicks, 48);
  assert.equal(palmLv0.radius, 28);
  assert.equal(palmLv0.angleDeg, 50);

  assert.equal(palmLv3.buildupTicks, 30);
  assert.equal(palmLv3.radius, 34);
  assert.equal(palmLv3.angleDeg, 65);

  assert.equal(palmLv5.buildupTicks, 20);
  assert.equal(palmLv5.radius, 38);
  assert.equal(palmLv5.angleDeg, 75);

  // 流雲劍訣・穿雲刺：Lv0 (36t, 55px) ➔ Lv5 (16t, 85px)
  const swordLv0 = interpolateMoveStats('art.liuyun_sword', 0);
  const swordLv5 = interpolateMoveStats('art.liuyun_sword', 5);

  assert.equal(swordLv0.buildupTicks, 36);
  assert.equal(swordLv0.length, 55);
  assert.equal(swordLv5.buildupTicks, 16);
  assert.equal(swordLv5.length, 85);
});

// =========================================================================
// C 組：同門切磋、破綻拆招加成與輕功溪石捷徑 (DoD C1 ~ C3)
// =========================================================================

test('C1: 雙人點到為止切磋 (12 秒正常超時結束與基礎經驗 +3)', () => {
  const challenger = { id: 'c1', name: '郭靖', maxHp: 100, hp: 100, martialExp: 0, sectOriginId: 'origin.beixia_palm' };
  const opponent = { id: 'c2', name: '楊過', maxHp: 100, hp: 100, martialExp: 0, sectOriginId: 'origin.custom_sword' };

  const session = new SparringSession({ challenger, opponent });
  assert.equal(session.stage, 'active');

  // 推進 720 ticks (12 秒)
  session.runTick(720);
  assert.equal(session.stage, 'saluting');
  assert.equal(challenger.martialExp, 3);
  assert.equal(opponent.martialExp, 3);
  assert.equal(session.crossLineageProgress, 1); // 跨門派切磋兼修進度 +1
});

test('C2: 令狐沖無招拆招流雙倍經驗加成 (基礎 +3 + 特質 +3 = +6)', () => {
  const linghu = {
    id: 'disc.linghu',
    name: '令狐沖',
    templateId: 'linghu_chong',
    traits: ['perk.flaw_seeker'],
    maxHp: 100,
    hp: 100,
    martialExp: 0,
  };
  const partner = {
    id: 'disc.lu',
    name: '陸大有',
    maxHp: 100,
    hp: 100,
    martialExp: 0,
  };

  const session = new SparringSession({ challenger: linghu, opponent: partner });
  session.runTick(720);

  // 令狐沖獲得 +6 經驗，普通弟子獲得 +3
  assert.equal(linghu.martialExp, 6);
  assert.equal(partner.martialExp, 3);
});

test('C3: 踏雪無痕輕功捷徑連通 (Lv2 繞橋 vs Lv3 踏石渡溪)', () => {
  // 1. Lv2: 繞行溪橋 240 步
  const resLv2 = resolveCreekPath('yard', 'tan_south', 2);
  assert.equal(resLv2.usedShortcut, false);
  assert.equal(resLv2.totalCost, 240);
  assert.ok(resLv2.path.includes('creek_bridge'));

  // 2. Lv3: 踏石渡溪 40 步
  const resLv3 = resolveCreekPath('yard', 'tan_south', 3);
  assert.equal(resLv3.usedShortcut, true);
  assert.equal(resLv3.totalCost, 40);
  assert.ok(resLv3.path.includes('step_stones'));
});

// =========================================================================
// 6 個強制直接反例斷言 (Mandatory Direct Counter-Examples)
// =========================================================================

test('反例 1: 缺水停止生長防呆反例 (counter_crop_wither_without_water)', () => {
  const manager = new GardenPlotManager();
  const plot = manager.createPlot({
    plotId: 'plot.test_wither',
    cropId: 'crop.cabbage',
    moisture: 19, // < 20%
  });

  // 菜畦濕度降至 19% (< 20%) 時推進 1,000 ticks
  manager.tick(1000, { decayPerTick: 0 });

  // 斷言 plot.growthTicks 完全凍結不增長
  assert.equal(plot.growthTicks, 0, 'counter_crop_wither_without_water: growthTicks must stay frozen when moisture < 20%');

  // 手動澆灌水桶補水至 59% (19 + 40 = 59%)
  const waterRes = manager.waterPlot('plot.test_wither', 40);
  assert.equal(waterRes.ok, true);
  assert.equal(plot.moisture, 59);

  // 澆水後再次推進 500 ticks，生長進度立即恢復累計
  manager.tick(500, { decayPerTick: 0 });
  assert.equal(plot.growthTicks, 500, 'counter_crop_wither_without_water: growthTicks must resume after watering');
});

test('反例 2: 行軍乾糧袋防溢出反例 (counter_ration_pouch_overflow)', () => {
  const disciple = {
    id: 'disc.overflow_test',
    rationPouch: RationPouchManager.createPouch('disc.overflow_test', 2),
  };

  // 裝入前 2 份荷葉飯糰
  const r1 = RationPouchManager.packRation(disciple, 'ration.rice_ball');
  const r2 = RationPouchManager.packRation(disciple, 'ration.rice_ball');
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.equal(disciple.rationPouch.items.length, 2);

  // 弟子腰間乾糧袋已有 2 份，膳房再次嘗試向其派發叫化雞腿
  const overflowRes = RationPouchManager.packRation(disciple, 'ration.chicken_leg');

  // 系統必須拒絕並回傳 { ok: false, reason: 'RATION_POUCH_FULL' }，乾糧袋數量嚴格保持為 2
  assert.deepEqual(
    { ok: overflowRes.ok, reason: overflowRes.reason },
    { ok: false, reason: 'RATION_POUCH_FULL' },
    'counter_ration_pouch_overflow: system must reject overflow with RATION_POUCH_FULL'
  );
  assert.equal(disciple.rationPouch.items.length, 2);
});

test('反例 3: 招式 Buildup 階段被打斷反例 (counter_buildup_interruption)', () => {
  const actor = { id: 'hero.interrupted_test', currentMove: null };
  const target = { id: 'target_dummy', pos: [30, 0] };

  // 角色發動《青松掌・推山掌》
  MartialCombatEngine.startMove(actor, 'art.qingsong_palm', 0, 0, [0, 0]);
  assert.equal(actor.currentMove.phase, 'buildup');

  // 推進至第 10 tick
  for (let i = 0; i < 10; i++) {
    MartialCombatEngine.tickMove(actor, [target]);
  }
  assert.equal(actor.currentMove.phaseElapsedTicks, 10);
  assert.equal(actor.currentMove.phase, 'buildup');

  // 角色處於第 10 tick 時受到強烈擊退破招中斷
  const interruptRes = MartialCombatEngine.interruptMove(actor, 'heavy_knockback');
  assert.equal(interruptRes.interrupted, true);

  // 斷言該次出招立即被強制中斷，Action 判定不被觸發，角色直接轉入受擊硬直
  assert.equal(actor.currentMove.phase, 'interrupted');
  assert.equal(actor.currentMove.actionTriggered, false);
  assert.equal(actor.isStaggered, true);

  // 後續再推進 100 ticks，Action 判定絕不穿透出掌
  for (let i = 0; i < 50; i++) {
    MartialCombatEngine.tickMove(actor, [target]);
  }
  assert.equal(actor.currentMove, null); // 硬直結束後招式已清空，絕無 Action 生效
});

test('反例 4: 初學與大成起手判定幾何不變量反例 (counter_martial_proficiency_scaling)', () => {
  // 同一名角色分別在 Lv0 與 Lv5 施展《齊眉棍・橫掃千軍》
  const statsLv0 = interpolateMoveStats('art.qimei_staff', 0);
  const statsLv5 = interpolateMoveStats('art.qimei_staff', 5);

  // 斷言 Lv0 的 Buildup 嚴格等於 54 ticks 且圓弧為 140°
  assert.equal(
    statsLv0.buildupTicks,
    54,
    'counter_martial_proficiency_scaling: Lv0 buildupTicks must strictly equal 54'
  );
  assert.equal(
    statsLv0.angleDeg,
    140,
    'counter_martial_proficiency_scaling: Lv0 angleDeg must strictly equal 140'
  );

  // 斷言 Lv5 的 Buildup 嚴格等於 26 ticks 且圓弧為 180°
  assert.equal(
    statsLv5.buildupTicks,
    26,
    'counter_martial_proficiency_scaling: Lv5 buildupTicks must strictly equal 26'
  );
  assert.equal(
    statsLv5.angleDeg,
    180,
    'counter_martial_proficiency_scaling: Lv5 angleDeg must strictly equal 180'
  );
});

test('反例 5: 切磋血量底線不傷真元反例 (counter_sparring_no_injury)', () => {
  const challenger = { id: 'c.sparrer_1', name: '小師弟', maxHp: 100, hp: 100, martialExp: 0 };
  const opponent = { id: 'c.sparrer_2', name: '大師兄', maxHp: 100, hp: 100, martialExp: 0 };

  const session = new SparringSession({ challenger, opponent });

  // 在同門切磋過程中，將挑戰者血量強制壓低至 49%
  challenger.hp = 49;
  session.runTick(1);

  // 斷言切磋狀態立即轉入 saluting，雙方停止出招並抱拳致意
  assert.equal(
    session.stage,
    'saluting',
    'counter_sparring_no_injury: sparring session must transition immediately to saluting when hp < 50%'
  );

  // 角色真實生命值不可低於 50%
  assert.equal(
    challenger.hp,
    50,
    'counter_sparring_no_injury: real hp must be clamped to health floor (>= 50%)'
  );
});

test('反例 6: 未達輕功等級溪石捷徑阻擋反例 (counter_qinggong_shortcut_level_lock)', () => {
  // 角色《踏雪無痕》等級為 Lv2 時從院子導航至潭南石階
  const pathLv2 = resolveCreekPath('yard', 'tan_south', 2);

  // 斷言路徑節點嚴格包含溪橋迂迴點
  assert.equal(pathLv2.usedShortcut, false);
  assert.ok(
    pathLv2.path.includes('creek_bridge'),
    'counter_qinggong_shortcut_level_lock: Lv2 navigation must route through creek_bridge'
  );
  assert.equal(pathLv2.totalCost, 240);

  // 將其等級提升至 Lv3 後再次尋路
  const pathLv3 = resolveCreekPath('yard', 'tan_south', 3);

  // 路徑節點立即直連 step_stones 溪石渡口
  assert.equal(pathLv3.usedShortcut, true);
  assert.ok(
    pathLv3.path.includes('step_stones'),
    'counter_qinggong_shortcut_level_lock: Lv3 navigation must use step_stones shortcut'
  );
  assert.equal(pathLv3.totalCost, 40);
});
