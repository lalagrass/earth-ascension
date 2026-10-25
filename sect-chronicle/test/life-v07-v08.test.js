// life-v07-v08.test.js
// LIFE-V07-V08 專屬單元與確定性反例測試 (DoD A～D 與 6 大直接反例)

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MARTIAL_V07_CONSTANTS,
  MARTIAL_TREES_DATA,
  checkMartialPrerequisites,
  triggerSparringEpiphany,
  enterSecludedBreakthrough,
  getMartialDiagramCatalog,
  advanceLuohanPractice,
  DuguNineSwordsEngine,
  trainDuguOnWoodenDummy,
  gainDuguCombatInsight,
  resolveFlawInterrupt,
  authorScripture,
  synthesizeCrossLineageArt,
} from '../life/core/martial-evolution.mjs';

import {
  ALCHEMY_V08_CONSTANTS,
  ALCHEMY_FORGE_DATA,
  AlchemyCauldronManager,
  brewMedicinalBath,
  brewSupremeTonic,
  resolveHaiDafuTonicVisit,
  cureInjuries,
  SpecialCultivationManager,
  tickColdJadeBed,
  trainWaterfallHeavySword,
  interactJadeBeeHive,
  resolveDualWieldCast,
  DivineForgeManager,
  forgeItem,
  equipItem,
} from '../life/core/alchemy-forge.mjs';

// =========================================================================
// A 組：武學進階樹、四維檢核、頓悟與返璞歸真 (DoD A1 ~ A4)
// =========================================================================

test('A1: 滿足雙前置武學與四維門檻，切磋頓悟第二階武學 (DoD A1)', () => {
  const disciple = {
    id: 'disc.lin',
    name: '林玄真',
    stats: { strength: 5, agility: 5, waistLeg: 5, innerQi: 4, comprehension: 7 },
    martialArts: {
      'art.qingsong_palm': 3,
      'art.panshi_breathing': 2,
    },
  };

  // 1. 檢核前置條件是否滿足
  const check = checkMartialPrerequisites(disciple, 'art.dielang_palm');
  assert.equal(check.satisfied, true);
  assert.equal(check.missing.length, 0);

  // 2. 切磋觸發頓悟
  const epiphanyRes = triggerSparringEpiphany(disciple, { id: 'disc.partner' }, 'art.dielang_palm');
  assert.equal(epiphanyRes.ok, true);
  assert.equal(epiphanyRes.unlocked, true);
  assert.equal(epiphanyRes.artId, 'art.dielang_palm');
  assert.equal(disciple.martialArts['art.dielang_palm'], 1);

  // 3. 前置未達標時頓悟拒絕
  const rookie = {
    id: 'disc.rookie',
    stats: { strength: 2 },
    martialArts: { 'art.qingsong_palm': 1 },
  };
  const failRes = triggerSparringEpiphany(rookie, { id: 'dummy' }, 'art.dielang_palm');
  assert.equal(failRes.ok, false);
  assert.equal(failRes.reason, 'PREREQUISITES_NOT_MET');
  assert.ok(failRes.missing.length >= 1);
});

test('A2: 雙第二階武學大成 ＋ 四維達標，入清幽靜室閉關領悟第三階上乘絕學 (DoD A2)', () => {
  const masterDisciple = {
    id: 'disc.master_sword',
    name: '風清虛',
    stats: { strength: 6, agility: 8, waistLeg: 5, innerQi: 7, comprehension: 9 },
    martialArts: {
      'art.feiyan_sword': 3,
      'art.liuyun_sword': 5,
    },
  };

  const quietRoom = { facilityId: 'fac.quiet', facilityBuilt: true, level: 2 };

  // 閉關突破太清御劍術
  const res = enterSecludedBreakthrough(masterDisciple, 'art.taiqing_sword', quietRoom);
  assert.equal(res.ok, true);
  assert.equal(res.unlocked, true);
  assert.equal(res.artId, 'art.taiqing_sword');
  assert.equal(res.breakthroughAura, 'golden_radiance');
  assert.equal(masterDisciple.martialArts['art.taiqing_sword'], 1);

  // 若靜室尚未擴建，則拒絕突破
  const noRoomRes = enterSecludedBreakthrough(masterDisciple, 'art.tiangang_fuhu_fist', { facilityBuilt: false });
  assert.equal(noRoomRes.ok, false);
  assert.equal(noRoomRes.reason, 'QUIET_ROOM_NOT_CONSTRUCTED');
});

test('A3: 低悟性 (<=3) 抱樸守拙弟子突破上限：Lv8 霸體、Lv10 返璞歸真 0.15s 瞬發與破盾 (DoD A3)', () => {
  const guoJing = {
    id: 'disc.guo',
    name: '郭靖',
    stats: { comprehension: 2, strength: 8, constitution: 9, agility: 4 },
    traits: ['抱樸守拙', '坤為地'],
    martialArts: { 'art.luohan_fist': 5 },
  };

  // 1. 突破至 Lv8 登峰造極：解鎖霸體與沉渾拳罡
  const resLv8 = advanceLuohanPractice(guoJing, 5000);
  assert.equal(resLv8.ok, true);
  assert.equal(resLv8.currentLevel, 8);
  assert.equal(resLv8.isMastery, true);
  assert.equal(resLv8.moveState.superArmor, true);
  assert.equal(resLv8.moveState.uninterruptible, true);
  assert.equal(resLv8.moveState.goldenAuraWave, true);
  assert.equal(resLv8.moveState.windupSec, 0.25);
  assert.equal(resLv8.moveState.knockback, 55);

  // 2. 突破至 Lv10 返璞歸真：0.15s 前搖、0 內息、破護盾、渾然無破綻 (flawless)
  const resLv10 = advanceLuohanPractice(guoJing, 10000);
  assert.equal(resLv10.ok, true);
  assert.equal(resLv10.currentLevel, 10);
  assert.equal(resLv10.isPerfection, true);
  assert.equal(resLv10.moveState.windupSec, 0.15);
  assert.equal(resLv10.moveState.buildupTicks, 9); // 0.15s at 60Hz = 9 ticks
  assert.equal(resLv10.moveState.qiCost, 0);
  assert.equal(resLv10.moveState.shattersShield, true);
  assert.equal(resLv10.moveState.pierceShield, true);
  assert.equal(resLv10.moveState.flawless, true);
  assert.equal(resLv10.moveState.knockback, 90);
});

test('A4: 武學圖譜水墨剪影 UI 目錄，未解鎖招式提供清晰線索無黑箱 (DoD A4)', () => {
  const disciple = {
    id: 'disc.yue',
    martialArts: {
      'art.yangwu_sword': 2,
    },
  };

  const catalog = getMartialDiagramCatalog('origin.huashan_junzi', disciple);
  assert.ok(catalog.length >= 5);

  // 已解鎖武學：silhouette 為 false，顯示目前等級
  const yangwu = catalog.find((c) => c.id === 'art.yangwu_sword');
  assert.ok(yangwu);
  assert.equal(yangwu.unlocked, true);
  assert.equal(yangwu.silhouette, false);
  assert.equal(yangwu.level, 2);

  // 未解鎖武學：silhouette 為 true，且包含清晰領悟線索
  const zixia = catalog.find((c) => c.id === 'art.zixia_divine_art');
  assert.ok(zixia);
  assert.equal(zixia.unlocked, false);
  assert.equal(zixia.silhouette, true);
  assert.ok(zixia.hint.length > 0);
  assert.match(zixia.hint, /華山抱元勁/);
});

// =========================================================================
// B 組：獨孤九劍破綻截擊、五破圖譜與藏經閣著書立說 (DoD B1 ~ B4)
// =========================================================================

test('B1: 獨孤九劍木人樁 0 經驗限制，唯有活人切磋增加五破圖譜經驗 (DoD B1)', () => {
  const linghu = {
    id: 'disc.linghu',
    name: '令狐沖',
    stats: { comprehension: 10, agility: 9 },
    duguState: DuguNineSwordsEngine.createDuguState(),
  };

  // 1. 打木人樁 100 次：經驗嚴格等於 0
  const dummyRes = trainDuguOnWoodenDummy(linghu, 6000);
  assert.equal(dummyRes.expGained, 0);
  assert.equal(linghu.duguState.dummyTrainingExpGained, 0);

  // 2. 與掌法師弟切磋：增加【破掌式】經驗
  const sparRes1 = gainDuguCombatInsight(linghu, 'palm', 40);
  assert.equal(sparRes1.ok, true);
  assert.equal(sparRes1.breakKey, 'breakPalm');
  assert.equal(sparRes1.expGained, 40);
  assert.equal(linghu.duguState.unlockedBreaks.breakPalm.unlocked, true);

  // 3. 與劍客交手：增加【破劍式】經驗
  const sparRes2 = gainDuguCombatInsight(linghu, 'sword', 80);
  assert.equal(sparRes2.ok, true);
  assert.equal(sparRes2.breakKey, 'breakSword');
  assert.equal(sparRes2.expGained, 80);
  assert.equal(linghu.duguState.totalCombatExp, 120);
});

test('B2: 看破敵方 Buildup 起手前搖，0s 後發先至截擊打斷敵招 (DoD B2)', () => {
  const linghu = { id: 'disc.linghu', name: '令狐沖' };

  // 敵方野豬王或踢館宗師進入 Buildup 前搖 (0.6s / 36 ticks)
  const enemyMove = {
    name: '野豬烈衝',
    phase: 'buildup',
    buildupTicks: 36,
    windupSec: 0.6,
    damage: 60,
    category: 'palm',
    cancelled: false,
  };

  // 九劍傳人發動截擊
  const interruptRes = resolveFlawInterrupt(linghu, enemyMove);

  assert.equal(interruptRes.triggered, true);
  assert.equal(interruptRes.intercepted, true);
  assert.equal(interruptRes.targetCancelled, true);
  assert.equal(interruptRes.duguStartupTicks, 0); // 0s 瞬發起手
  assert.equal(interruptRes.interceptTick, 12); // 第 0.2s 搶先刺中
  assert.equal(interruptRes.damageToDugu, 0); // 敵招被打斷，對九劍傳人 0 傷害
  assert.equal(enemyMove.cancelled, true);
  assert.equal(enemyMove.phase, 'interrupted');
});

test('B3: 雙宗師切磋共鳴：九劍傳人遇 Lv10 返璞歸真羅漢拳，無破綻跳出共鳴氣泡 (DoD B3)', () => {
  const linghu = { id: 'disc.linghu', name: '令狐沖' };

  // 大師兄使出 Lv10 返璞歸真・推山直拳 (flawless: true, 0.15s 前搖)
  const masterFistMove = {
    name: '返璞歸真・一拳破萬法',
    phase: 'action',
    windupSec: 0.15,
    buildupTicks: 9,
    flawless: true,
    damage: 100,
  };

  const res = resolveFlawInterrupt(linghu, masterFistMove);

  // 斷言：九劍尋找不到任何破綻，截擊不觸發，跳出相視共鳴氣泡
  assert.equal(res.triggered, false);
  assert.equal(res.grandmasterResonance, true);
  assert.equal(res.dialogueBubble, '至拙無破綻，無招遇返璞！');
  assert.equal(res.reason, 'TARGET_MOVE_IS_FLAWLESS');
});

test('B4: 藏經閣著書立說 (+100%研讀加速) 與靜室兩派合參《雙脈合參秘笈》 (DoD B4)', () => {
  const masterDisciple = {
    id: 'disc.hero',
    name: '林玄真',
    martialArts: { 'art.dielang_palm': 4 },
  };

  // 1. 著書立說入藏經閣
  const authRes = authorScripture(masterDisciple, 'art.dielang_palm');
  assert.equal(authRes.ok, true);
  assert.equal(authRes.studyEfficiencyMultiplier, 2.0); // +100% 研讀效率
  assert.equal(authRes.scripture.title, '《疊浪排雲掌手札》');
  assert.equal(authRes.scripture.authorDiscipleId, 'disc.hero');

  // 2. 掌門 (郭靖) × 同門 (令狐沖) 靜室兩派合參
  const founder = {
    id: 'disc.guo',
    martialArts: { 'art.xianglong_eighteen_palms': 5 },
  };
  const fellow = {
    id: 'disc.linghu',
    martialArts: { 'art.dugu_nine_swords': 4 },
  };

  const synthRes = synthesizeCrossLineageArt(founder, fellow);
  assert.equal(synthRes.ok, true);
  assert.equal(synthRes.manualTitle, '《剛柔劍掌雙絕》');
  assert.equal(synthRes.studyEfficiencyMultiplier, 2.5);
  assert.deepEqual(synthRes.coAuthors, ['disc.guo', 'disc.linghu']);

  // 若等級未滿 Lv4 則無法合參
  const lowLevelFellow = { id: 'disc.rookie', martialArts: { 'art.wuyue_fast_sword': 2 } };
  const failSynth = synthesizeCrossLineageArt(founder, lowLevelFellow);
  assert.equal(failSynth.ok, false);
  assert.equal(failSynth.reason, 'PREREQUISITE_LEVEL_INSUFFICIENT');
});

// =========================================================================
// C 組：煉藥洗髓、特殊修練環境與周伯通 (DoD C1 ~ C4)
// =========================================================================

test('C1: 藥浴洗髓永久增益、十全大補湯引海大富與張無忌仁醫回血 (DoD C1)', () => {
  const cauldron = AlchemyCauldronManager.createCauldron('fac.herbstore');
  const inventory = { gold: 50 };
  const disciple = { id: 'disc.a', stats: { constitution: 5 }, innerQiRateMultiplier: 1.0 };

  // 1. 熬製洗髓藥浴：根骨 +1，內息增長率 +25%
  const bathRes = brewMedicinalBath(cauldron, { rawHerb: 3, spiritGinseng: 1 }, disciple);
  assert.equal(bathRes.ok, true);
  assert.equal(disciple.stats.constitution, 6);
  assert.equal(disciple.innerQiRateMultiplier, 1.25);

  // 2. 熬製十全大補靈湯
  const tonicRes = brewSupremeTonic(cauldron, { rawHerb: 5, spiritGinseng: 2, lingzhi: 1 });
  assert.equal(tonicRes.ok, true);
  assert.equal(cauldron.supremeTonicCount, 1);

  // 3. 海大富摸入偷喝試藥：扣 1 補湯，補償 100 銀兩
  const encounterRes = resolveHaiDafuTonicVisit(cauldron, inventory, 0.5); // 0.5 <= 0.75 觸發
  assert.equal(encounterRes.triggered, true);
  assert.equal(cauldron.supremeTonicCount, 0);
  assert.equal(inventory.gold, 150);
  assert.equal(encounterRes.dialogueBubble, '咳咳……小桂子，把藥端來……');

  // 4. 張無忌仁心醫館治癒重傷
  const wounded = { id: 'disc.hurt', isInjured: true, injuries: ['broken_rib', 'poison'], health: 20 };
  const healRes = cureInjuries(wounded, 'zhang_wuji');
  assert.equal(healRes.ok, true);
  assert.equal(wounded.isInjured, false);
  assert.equal(wounded.injuries.length, 0);
  assert.equal(wounded.health, 100);
});

test('C2: 古墓寒玉床高速回氣 (+2.5 內息/秒) (DoD C2)', () => {
  // 1. 小龍女睡寒玉床
  const xiaoLongnu = { id: 'disc.longnu', archetypeId: 'xiao_longnu', innerQi: 10 };
  const res1 = tickColdJadeBed(xiaoLongnu, 120); // 2 秒 (120 ticks)
  assert.equal(res1.ok, true);
  assert.equal(res1.innerQiGained, 5.0); // 2.5 * 2 = 5.0
  assert.equal(xiaoLongnu.innerQi, 15);

  // 2. 高根骨 (>=6) 普通弟子睡寒玉床亦可
  const strongDisciple = { id: 'disc.monk', stats: { constitution: 7 }, innerQi: 20 };
  const res2 = tickColdJadeBed(strongDisciple, 60);
  assert.equal(res2.ok, true);
  assert.equal(res2.innerQiGained, 2.5);

  // 3. 根骨不足 (<6) 承受不住寒氣
  const weakling = { id: 'disc.weak', stats: { constitution: 3 }, innerQi: 5 };
  const res3 = tickColdJadeBed(weakling, 60);
  assert.equal(res3.ok, false);
  assert.equal(res3.reason, 'CONSTITUTION_TOO_LOW_FOR_COLD_JADE');
});

test('C3: 後山山洪瀑布台重劍無鋒：臂力 >= 7 弟子修練速度 +150% 並解鎖重劍巨浪 (DoD C3)', () => {
  // 1. 楊過 (臂力 9) 頂激流練劍
  const yangGuo = { id: 'disc.yang', stats: { strength: 9 }, unlockedTraits: [] };
  const res1 = trainWaterfallHeavySword(yangGuo, 60);
  assert.equal(res1.ok, true);
  assert.equal(res1.expMultiplier, 2.5); // +150% 即 2.5 倍
  assert.equal(res1.torrentWaveCleaveUnlocked, true);
  assert.equal(res1.knockbackBonus, 80);
  assert.ok(yangGuo.unlockedTraits.includes('torrent_wave_cleave'));

  // 2. 臂力不足 (<7) 無法立足
  const weakBoy = { id: 'disc.boy', stats: { strength: 4 } };
  const res2 = trainWaterfallHeavySword(weakBoy, 60);
  assert.equal(res2.ok, false);
  assert.equal(res2.reason, 'STRENGTH_BELOW_WATERFALL_THRESHOLD');
});

test('C4: 百花玉蜂箱引周伯通捉迷藏，好感達標傳授《左右互搏術》 (DoD C4)', () => {
  const hiveState = { zhouBotongFriendship: 40 };

  // 1. 老實單純郭靖玩捉迷藏好感達標
  const guoJing = { id: 'disc.guo', archetypeId: 'guo_jing', stats: { comprehension: 2 } };
  const res1 = interactJadeBeeHive(guoJing, hiveState, 'hide_and_seek');
  assert.equal(res1.ok, true);
  assert.equal(res1.friendship, 60);
  assert.equal(res1.dualWieldUnlocked, true);
  assert.equal(guoJing.hasDualWield, true);

  // 2. 機巧雜念過多弟子 (悟性 8) 無法分心二用
  const smartGuy = { id: 'disc.smart', stats: { comprehension: 8 } };
  const res2 = interactJadeBeeHive(smartGuy, hiveState, 'hide_and_seek');
  assert.equal(res2.ok, false);
  assert.equal(res2.dualWieldUnlocked, false);
  assert.equal(res2.reason, 'MIND_TOO_CRAFTY_FOR_DUAL_WIELD');
});

// =========================================================================
// D 組：百鍛神兵裝備、特質生效 (DoD D1 ~ D2)
// =========================================================================

test('D1: 巧匠鍛造玄鐵重劍、金絲軟甲、洋人火銃、繡花針與古銅擴音罩生效 (DoD D1)', () => {
  // 1. 鍛造七十斤玄鐵重劍
  const swordCraft = forgeItem('equip.heavy_iron_sword');
  assert.equal(swordCraft.ok, true);
  assert.equal(swordCraft.item.weightUnits, 70);
  assert.equal(swordCraft.item.damageMultiplier, 2.2);
  assert.equal(swordCraft.item.twoHanded, true);

  // 2. 裝備檢核：臂力需 >= 7
  const yangGuo = { id: 'disc.yang', stats: { strength: 9 }, equipment: {} };
  const equipRes = equipItem(yangGuo, swordCraft.item);
  assert.equal(equipRes.ok, true);
  assert.equal(yangGuo.equipment.weapon_main.id, 'equip.heavy_iron_sword');

  // 臂力不足裝備失敗
  const weakling = { id: 'disc.weak', stats: { strength: 4 }, equipment: {} };
  const failEquip = equipItem(weakling, swordCraft.item);
  assert.equal(failEquip.ok, false);
  assert.equal(failEquip.reason, 'STRENGTH_INSUFFICIENT');

  // 3. 鍛造金絲軟甲 (減傷 60%)
  const armorCraft = forgeItem('equip.soft_gold_armor');
  assert.equal(armorCraft.ok, true);
  assert.equal(armorCraft.item.damageReductionRatio, 0.60);

  // 4. 鍛造東方不敗繡花針 (0.05s 極速前搖)
  const needleCraft = forgeItem('equip.oriental_needle');
  assert.equal(needleCraft.ok, true);
  assert.equal(needleCraft.item.windupSec, 0.05);
  assert.equal(needleCraft.item.multiHitTargetCount, 5);

  // 5. 古銅大鐘擴音罩 (獅吼範圍加倍)
  const bellCraft = forgeItem('equip.bronze_bell_megaphone');
  assert.equal(bellCraft.ok, true);
  assert.equal(bellCraft.item.soundwaveRangeMultiplier, 2.0);
});

// =========================================================================
// 6 個直接反例斷言 (Direct Counter-Examples)
// =========================================================================

test('反例 1: 木人無招不可練反例 (counter_wooden_dummy_no_dugu_xp)', () => {
  const actor = {
    id: 'disc.linghu_test',
    duguState: DuguNineSwordsEngine.createDuguState(),
  };

  // 對木人樁連續揮劍 100 次 (6000 ticks)
  for (let i = 0; i < 100; i++) {
    const res = trainDuguOnWoodenDummy(actor, 60);
    assert.equal(res.expGained, 0);
  }
  assert.equal(actor.duguState.dummyTrainingExpGained, 0);
  assert.equal(actor.duguState.totalCombatExp, 0);

  // 與活人同門切磋 1 次，破式經驗精準增加
  const sparRes = gainDuguCombatInsight(actor, 'sword', 25);
  assert.equal(sparRes.ok, true);
  assert.equal(sparRes.expGained, 25);
  assert.equal(actor.duguState.unlockedBreaks.breakSword.exp, 25);
  assert.equal(actor.duguState.totalCombatExp, 25);
});

test('反例 2: 破綻截擊後發先至打斷反例 (counter_flaw_interrupt_precedence)', () => {
  const duguActor = { id: 'disc.linghu' };
  const bossMove = {
    name: '開山巨斧劈',
    phase: 'buildup',
    buildupTicks: 36, // 0.6s 前搖
    windupSec: 0.6,
    damage: 80,
    category: 'polearm',
    cancelled: false,
  };

  const res = resolveFlawInterrupt(duguActor, bossMove);

  assert.equal(res.triggered, true);
  assert.equal(res.duguStartupTicks, 0); // 己方 0s 瞬發起手
  assert.equal(res.interceptTick, 12); // 第 0.2s 搶先刺中
  assert.equal(bossMove.cancelled, true); // 強制打斷敵方 Action
  assert.equal(res.damageToDugu, 0); // 敵方未對九劍傳人造成傷害
});

test('反例 3: 返璞歸真渾然無破綻反例 (counter_luohan_tier10_no_flaw)', () => {
  const duguActor = { id: 'disc.linghu' };
  const lv10Fist = {
    name: '返璞歸真・一拳破萬法',
    phase: 'action',
    windupSec: 0.15,
    buildupTicks: 9,
    flawless: true, // 渾然天成無破綻
    damage: 90,
  };

  const res = resolveFlawInterrupt(duguActor, lv10Fist);

  // 斷言：flawWindow 不觸發，無法執行 0s 截擊打斷
  assert.equal(res.triggered, false);
  assert.equal(res.intercepted, false);
  assert.equal(res.grandmasterResonance, true);
  assert.match(res.dialogueBubble, /至拙無破綻/);
});

test('反例 4: 高悟性無法突破羅漢拳 Lv10 反例 (counter_high_comprehension_cannot_breakthrough_luohan_tier10)', () => {
  const smartDisciple = {
    id: 'disc.smart',
    stats: { comprehension: 8, strength: 7 },
    traits: ['聰穎過人', '讀書破萬卷'],
    martialArts: { 'art.luohan_fist': 5 },
  };

  // 對木人樁苦練揮拳 10,000 次
  const res = advanceLuohanPractice(smartDisciple, 10000);

  // 斷言：等級被嚴格卡在 Lv5，無法解鎖 Lv6~Lv10 登峰造極
  assert.equal(res.ok, false);
  assert.equal(res.cappedAtLv5, true);
  assert.equal(res.currentLevel, 5);
  assert.equal(res.reason, 'MIND_TOO_COMPLEX_FOR_SIMPLE_MASTERY');
});

test('反例 5: 海大富偷藥守恆反例 (counter_haidafu_tonic_theft_preservation)', () => {
  const cauldron = AlchemyCauldronManager.createCauldron();
  const inventory = { gold: 100 };

  // 1. 鼎內為空 (supremeTonicCount === 0)，海大富偷藥絕不觸發
  cauldron.supremeTonicCount = 0;
  const noTonicRes = resolveHaiDafuTonicVisit(cauldron, inventory, 0.1);
  assert.equal(noTonicRes.triggered, false);
  assert.equal(inventory.gold, 100);

  // 2. 鼎內產出 1 份補湯，觸發偷藥
  cauldron.supremeTonicCount = 1;
  const visitRes = resolveHaiDafuTonicVisit(cauldron, inventory, 0.5);
  assert.equal(visitRes.triggered, true);
  assert.equal(cauldron.supremeTonicCount, 0); // 補湯精準扣 1
  assert.equal(inventory.gold, 200); // 金兩精準增加 100
});

test('反例 6: 左右互搏雙手空閒檢定反例 (counter_dual_wield_requires_both_hands_free)', () => {
  const actor = {
    id: 'disc.dual_master',
    hasDualWield: true,
    equipment: {
      weapon_main: {
        id: 'equip.heavy_iron_sword',
        name: '七十斤玄鐵重劍',
        twoHanded: true,
      },
    },
  };

  // 裝備雙手玄鐵重劍時試圖發動左右互搏
  const resHeavy = resolveDualWieldCast(actor, 'move.luohan_straight_punch', 'move.xianglong_kanglong');
  assert.equal(resHeavy.ok, false);
  assert.equal(resHeavy.reason, 'TWO_HANDED_WEAPON_EQUIPPED');

  // 卸除重劍改為空手時，雙招齊發成功
  actor.equipment.weapon_main = null;
  const resUnarmed = resolveDualWieldCast(actor, 'move.luohan_straight_punch', 'move.xianglong_kanglong');
  assert.equal(resUnarmed.ok, true);
  assert.equal(resUnarmed.simultaneous, true);
  assert.equal(resUnarmed.leftMove, 'move.luohan_straight_punch');
  assert.equal(resUnarmed.rightMove, 'move.xianglong_kanglong');
});
