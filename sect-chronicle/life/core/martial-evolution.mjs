// martial-evolution.mjs
// LIFE-V07 天下霸圖式三大武學進階樹、基礎羅漢拳登峰造極・返璞歸真、獨孤九劍破綻截擊與藏經閣著書立說

import fs from 'node:fs';

const MARTIAL_TREES_URL = new URL('../data/martial-trees-v07.json', import.meta.url);
export const MARTIAL_TREES_DATA = JSON.parse(fs.readFileSync(MARTIAL_TREES_URL, 'utf-8'));

export const MARTIAL_V07_CONSTANTS = Object.freeze({
  trackA: {
    dielangPalm: {
      tier: 2,
      windupSec: 0.35,
      buildupTicks: 21,
      activeSec: 0.20,
      actionTicks: 12,
      recoverySec: 0.25,
      recoverTicks: 15,
      qiCost: 15,
      shape: { type: 'cone', radius: 45, angleDeg: 75 },
      knockback: 65,
      waves: 2,
      damage: 48,
    },
    fengcheStaff: {
      tier: 2,
      windupSec: 0.40,
      buildupTicks: 24,
      activeSec: 0.30,
      actionTicks: 18,
      recoverySec: 0.20,
      recoverTicks: 12,
      qiCost: 18,
      shape: { type: 'circle', radius: 50 },
      knockback: 45,
      damage: 42,
      slowRate: 0.50,
    },
    feiyanSword: {
      tier: 2,
      windupSec: 0.20,
      buildupTicks: 12,
      activeSec: 0.20,
      actionTicks: 12,
      recoverySec: 0.15,
      recoverTicks: 9,
      qiCost: 20,
      shape: { type: 'line', length: 90, width: 20 },
      knockback: 30,
      damage: 55,
      penetrateCount: 3,
    },
    tiangangFuhuFist: {
      tier: 3,
      windupSec: 0.30,
      buildupTicks: 18,
      activeSec: 0.25,
      actionTicks: 15,
      recoverySec: 0.25,
      recoverTicks: 15,
      qiCost: 30,
      shape: { type: 'circle', radius: 60 },
      knockback: 85,
      damage: 85,
      applyStun: true,
      pierceShield: true,
    },
    bainiaoChaofengStaff: {
      tier: 3,
      windupSec: 0.25,
      buildupTicks: 15,
      activeSec: 0.40,
      actionTicks: 24,
      recoverySec: 0.20,
      recoverTicks: 12,
      qiCost: 32,
      shape: { type: 'cone', radius: 70, angleDeg: 120 },
      knockback: 60,
      damage: 80,
      chokeLock: true,
    },
    taiqingSword: {
      tier: 3,
      windupSec: 0.25,
      buildupTicks: 15,
      activeSec: 0.40,
      actionTicks: 24,
      recoverySec: 0.20,
      recoverTicks: 12,
      qiCost: 35,
      shape: { type: 'line', length: 120, width: 22 },
      flyingSwordsCount: 3,
      autoTargetRange: 150,
      knockback: 50,
      damage: 95,
    },
  },
  trackB: {
    luohanFistTier5: {
      windupSec: 0.40,
      buildupTicks: 24,
      qiCost: 0,
      knockback: 25,
      damage: 20,
      uninterruptible: false,
    },
    luohanFistTier8Dengfeng: {
      windupSec: 0.25,
      buildupTicks: 15,
      qiCost: 0,
      knockback: 55,
      damage: 50,
      uninterruptible: true,
      superArmor: true,
      goldenAuraWave: true,
    },
    luohanFistTier10Fanpu: {
      windupSec: 0.15,
      buildupTicks: 9,
      qiCost: 0,
      knockback: 90,
      damage: 100,
      uninterruptible: true,
      superArmor: true,
      pierceShield: true,
      shattersShield: true,
      flawless: true,
    },
  },
  trackC: {
    duguNineSwords: {
      dummyExpMultiplier: 0.0,
      flawReactionWindowSec: 0.20,
      instantWindupSec: 0.0,
      duguStartupTicks: 0,
      interceptTick: 12,
      interruptKnockback: 40,
      breakTypes: ['sword', 'palm', 'polearm', 'arrow', 'qi'],
    },
  },
});

/**
 * 輔助函式：提取弟子屬性
 */
export function getDiscipleStat(actor, statName) {
  if (!actor) return 0;
  if (actor.stats && actor.stats[statName] !== undefined) {
    return actor.stats[statName];
  }
  if (statName === 'strength') {
    return actor.stats?.strength ?? actor.strength ?? actor.foundation?.strength ?? 5;
  }
  if (statName === 'waistLeg' || statName === 'legwork') {
    return actor.stats?.waistLeg ?? actor.stats?.legwork ?? actor.waistLeg ?? actor.legwork ?? actor.foundation?.legwork ?? 5;
  }
  if (statName === 'agility') {
    return actor.stats?.agility ?? actor.agility ?? actor.foundation?.agility ?? 5;
  }
  if (statName === 'innerQi' || statName === 'breathing') {
    return actor.stats?.innerQi ?? actor.innerQi ?? actor.foundation?.innerQi ?? 5;
  }
  if (statName === 'constitution' || statName === 'bone') {
    return actor.stats?.constitution ?? actor.stats?.bone ?? actor.constitution ?? actor.bone ?? 5;
  }
  if (statName === 'comprehension') {
    return actor.stats?.comprehension ?? actor.comprehension ?? actor.persona?.comprehension ?? 5;
  }
  if (statName === 'composure' || statName === 'temperament') {
    return actor.stats?.composure ?? actor.composure ?? actor.foundation?.composure ?? 5;
  }
  return 5;
}

/**
 * 輔助函式：提取弟子特質與性格
 */
export function getDiscipleTraits(actor) {
  const traits = [];
  if (Array.isArray(actor.traits)) traits.push(...actor.traits);
  if (Array.isArray(actor.perks)) traits.push(...actor.perks);
  if (Array.isArray(actor.persona?.traits)) traits.push(...actor.persona.traits);
  if (actor.temperament) traits.push(actor.temperament);
  if (actor.persona?.temperamentTitle) traits.push(actor.persona.temperamentTitle);
  if (actor.persona?.title) traits.push(actor.persona.title);
  if (actor.mind印) traits.push(actor.mind印);
  return traits;
}

/**
 * 尋找武學定義 (Universal 或門派道統專屬)
 */
export function findArtDefinition(artId) {
  // 1. Universal Tier 2
  if (MARTIAL_TREES_DATA.trackA.universal.tier2[artId]) {
    return MARTIAL_TREES_DATA.trackA.universal.tier2[artId];
  }
  // 2. Universal Tier 3
  if (MARTIAL_TREES_DATA.trackA.universal.tier3[artId]) {
    return MARTIAL_TREES_DATA.trackA.universal.tier3[artId];
  }
  // 3. Sect Origins
  for (const origin of Object.values(MARTIAL_TREES_DATA.trackA.sectOrigins)) {
    if (origin.tier2 && origin.tier2[artId]) return origin.tier2[artId];
    if (origin.tier3 && origin.tier3[artId]) return origin.tier3[artId];
  }
  // 4. Track B
  if (MARTIAL_TREES_DATA.trackB[artId]) {
    return MARTIAL_TREES_DATA.trackB[artId];
  }
  // 5. Track C
  if (artId === 'art.dugu_nine_swords') {
    return {
      id: 'art.dugu_nine_swords',
      name: '獨孤九劍',
      tier: 3,
      category: 'sword',
      governingStat: 'agility',
      silhouetteHint: '需《五嶽破招劍》Lv3 ＋ 悟性 8 ＋ 身法 7，外功切磋無招破綻',
    };
  }
  return null;
}

/**
 * 檢查武學前置條件 (checkMartialPrerequisites)
 */
export function checkMartialPrerequisites(disciple, targetArtId) {
  const artDef = findArtDefinition(targetArtId);
  if (!artDef) {
    return { satisfied: false, missing: [`未知的武學 ID: ${targetArtId}`] };
  }

  const missing = [];
  const prereqs = artDef.prerequisites || {};

  // 1. 檢查前置武學與等級
  if (prereqs.requiredArts) {
    const discipleArts = disciple.martialArts || {};
    for (const [reqArtId, reqLevel] of Object.entries(prereqs.requiredArts)) {
      const currentLevel = discipleArts[reqArtId] || 0;
      if (currentLevel < reqLevel) {
        missing.push(`需《${reqArtId}》Lv${reqLevel} (當前: Lv${currentLevel})`);
      }
    }
  }

  // 2. 檢查四維屬性門檻
  if (prereqs.minStats) {
    for (const [statKey, reqVal] of Object.entries(prereqs.minStats)) {
      const actualVal = getDiscipleStat(disciple, statKey);
      if (actualVal < reqVal) {
        missing.push(`需 ${statKey} >= ${reqVal} (當前: ${actualVal})`);
      }
    }
  }

  // 3. 檢查悟性上限 (若為低悟性破限)
  if (prereqs.maxComprehension !== undefined) {
    const comp = getDiscipleStat(disciple, 'comprehension');
    if (comp > prereqs.maxComprehension) {
      missing.push(`悟性過高無法修習此法 (需 <= ${prereqs.maxComprehension})`);
    }
  }

  return {
    satisfied: missing.length === 0,
    missing,
    artDef,
  };
}

/**
 * 切磋或打樁頓悟第二階武學 (triggerSparringEpiphany) - DoD A1
 */
export function triggerSparringEpiphany(disciple, partnerOrDummy, targetArtId) {
  const check = checkMartialPrerequisites(disciple, targetArtId);
  if (!check.satisfied) {
    return {
      ok: false,
      unlocked: false,
      artId: targetArtId,
      reason: 'PREREQUISITES_NOT_MET',
      missing: check.missing,
    };
  }

  if (!disciple.martialArts) {
    disciple.martialArts = {};
  }
  disciple.martialArts[targetArtId] = 1;

  return {
    ok: true,
    unlocked: true,
    artId: targetArtId,
    epiphanyType: 'sparring',
    artName: check.artDef.name,
    message: `恭喜頓悟第二階武學《${check.artDef.name}》！`,
  };
}

/**
 * 靜室閉關突破第三階上乘絕學 (enterSecludedBreakthrough) - DoD A2
 */
export function enterSecludedBreakthrough(disciple, targetArtId, quietRoomState = {}) {
  // 靜室存在檢核
  if (quietRoomState.facilityBuilt === false) {
    return {
      ok: false,
      unlocked: false,
      artId: targetArtId,
      reason: 'QUIET_ROOM_NOT_CONSTRUCTED',
      message: '尚未擴建清幽靜室與藏經閣 (fac.quiet)',
    };
  }

  const check = checkMartialPrerequisites(disciple, targetArtId);
  if (!check.satisfied) {
    return {
      ok: false,
      unlocked: false,
      artId: targetArtId,
      reason: 'PREREQUISITES_NOT_MET',
      missing: check.missing,
    };
  }

  if (!disciple.martialArts) {
    disciple.martialArts = {};
  }
  disciple.martialArts[targetArtId] = 1;

  return {
    ok: true,
    unlocked: true,
    artId: targetArtId,
    stage: 'completed',
    artName: check.artDef.name,
    breakthroughAura: 'golden_radiance',
    message: `出關金光灌頂，正式領悟第三階上乘絕學《${check.artDef.name}》！`,
  };
}

/**
 * 武學圖譜水墨剪影目錄 (getMartialDiagramCatalog) - DoD A4
 */
export function getMartialDiagramCatalog(sectOriginId, disciple = null) {
  const catalog = [];
  const discipleArts = disciple?.martialArts || {};

  // 1. Universal Tier 2 & Tier 3
  const uniTier2 = Object.values(MARTIAL_TREES_DATA.trackA.universal.tier2);
  const uniTier3 = Object.values(MARTIAL_TREES_DATA.trackA.universal.tier3);

  for (const art of [...uniTier2, ...uniTier3]) {
    const isUnlocked = Boolean(discipleArts[art.id]);
    catalog.push({
      id: art.id,
      name: art.name,
      tier: art.tier,
      category: art.category,
      unlocked: isUnlocked,
      level: isUnlocked ? discipleArts[art.id] : 0,
      silhouette: !isUnlocked,
      hint: isUnlocked ? null : art.silhouetteHint,
      requirements: art.prerequisites,
    });
  }

  // 2. 門派專屬武學
  const originData = MARTIAL_TREES_DATA.trackA.sectOrigins[sectOriginId];
  if (originData) {
    const sectArts = [
      ...Object.values(originData.tier2 || {}),
      ...Object.values(originData.tier3 || {}),
    ];
    for (const art of sectArts) {
      const isUnlocked = Boolean(discipleArts[art.id]);
      catalog.push({
        id: art.id,
        name: art.name,
        tier: art.tier,
        category: art.category,
        unlocked: isUnlocked,
        level: isUnlocked ? discipleArts[art.id] : 0,
        silhouette: !isUnlocked,
        hint: isUnlocked ? null : art.silhouetteHint,
        requirements: art.prerequisites,
      });
    }
  }

  return catalog;
}

/**
 * 軌道 B：低悟性基礎羅漢拳進階 (advanceLuohanPractice) - DoD A3
 * 突破常規 Lv5 上限，直達 Lv8 登峰造極與 Lv10 返璞歸真
 */
export function advanceLuohanPractice(actor, practiceCount = 1) {
  const comp = getDiscipleStat(actor, 'comprehension');
  const targetArtId = 'art.luohan_fist';
  if (!actor.martialArts) {
    actor.martialArts = {};
  }

  const currentLvl = actor.martialArts[targetArtId] || actor.luohanLevel || 1;

  // 1. 高悟性檢核 (comprehension > 3)：嚴格卡在 Lv5
  if (comp > 3) {
    actor.martialArts[targetArtId] = Math.min(5, Math.max(currentLvl, 1));
    return {
      ok: false,
      cappedAtLv5: true,
      currentLevel: actor.martialArts[targetArtId],
      reason: 'MIND_TOO_COMPLEX_FOR_SIMPLE_MASTERY',
      message: '心有雜念，過於聰穎，無法抱樸守拙修成返璞歸真！',
    };
  }

  // 2. 低悟性且性格抱樸守拙檢核
  const traits = getDiscipleTraits(actor);
  const eligiblePerks = ['抱樸守拙', 'simple_heart', 'simple_minded', '篤實守靜', '艮為山', '坤為地'];
  const hasSimpleHeart = traits.some((t) =>
    eligiblePerks.some((p) => String(t).includes(p))
  );

  if (!hasSimpleHeart && comp <= 3) {
    // 沒有老實心性，亦暫卡在 Lv5
    return {
      ok: false,
      cappedAtLv5: true,
      currentLevel: Math.min(5, currentLvl),
      reason: 'REQUIRES_SIMPLE_HEART_TEMPERAMENT',
    };
  }

  // 3. 突破 Lv5，根據練習次數或既有等級推進
  let newLevel = currentLvl;
  if (practiceCount >= 10000) {
    newLevel = 10;
  } else if (practiceCount >= 5000) {
    newLevel = Math.max(8, newLevel);
  } else if (practiceCount >= 1000) {
    newLevel = Math.max(6, newLevel);
  } else {
    // 漸進練習推進
    const currentExp = (actor.luohanPracticeStrikes || 0) + practiceCount;
    actor.luohanPracticeStrikes = currentExp;
    if (currentExp >= 10000) newLevel = 10;
    else if (currentExp >= 5000) newLevel = 8;
    else if (currentExp >= 2000) newLevel = 6;
    else if (currentExp >= 500) newLevel = 5;
  }

  newLevel = Math.min(10, Math.max(newLevel, 1));
  actor.martialArts[targetArtId] = newLevel;
  actor.luohanLevel = newLevel;

  // 定義招式數值
  let moveState;
  if (newLevel === 10) {
    moveState = {
      name: '返璞歸真・一拳破萬法',
      windupSec: 0.15,
      buildupTicks: 9,
      qiCost: 0,
      knockback: 90,
      damage: 100,
      superArmor: true,
      uninterruptible: true,
      goldenAuraWave: true,
      shattersShield: true,
      pierceShield: true,
      flawless: true,
    };
  } else if (newLevel >= 8) {
    moveState = {
      name: '登峰造極・沉渾拳罡',
      windupSec: 0.25,
      buildupTicks: 15,
      qiCost: 0,
      knockback: 55,
      damage: 50,
      superArmor: true,
      uninterruptible: true,
      goldenAuraWave: true,
      shattersShield: false,
      pierceShield: false,
      flawless: false,
    };
  } else {
    moveState = {
      name: '基礎直拳',
      windupSec: 0.40,
      buildupTicks: 24,
      qiCost: 0,
      knockback: 25,
      damage: 20,
      superArmor: false,
      uninterruptible: false,
      flawless: false,
    };
  }

  return {
    ok: true,
    cappedAtLv5: false,
    currentLevel: newLevel,
    isMastery: newLevel >= 8,
    isPerfection: newLevel === 10,
    moveState,
  };
}

/**
 * 軌道 C：獨孤九劍無招破綻流引擎 (DuguNineSwordsEngine) - DoD B1 ~ B3
 */
export class DuguNineSwordsEngine {
  static createDuguState() {
    return {
      unlockedBreaks: {
        breakPalm: { level: 1, exp: 0, unlocked: false },
        breakPolearm: { level: 1, exp: 0, unlocked: false },
        breakSword: { level: 1, exp: 0, unlocked: false },
        breakArrow: { level: 1, exp: 0, unlocked: false },
        breakQi: { level: 1, exp: 0, unlocked: false },
      },
      dummyTrainingExpGained: 0,
      activeFlawDetected: null,
      totalCombatExp: 0,
    };
  }

  /**
   * 木人樁無招不可練 (trainDuguOnWoodenDummy) - DoD B1
   * 木人無意，經驗嚴格為 0
   */
  static trainDuguOnWoodenDummy(actor, ticks = 60) {
    if (!actor.duguState) {
      actor.duguState = DuguNineSwordsEngine.createDuguState();
    }
    // 嚴格保證經驗增量為 0
    actor.duguState.dummyTrainingExpGained = 0;
    return {
      expGained: 0,
      dummyTrainingExpGained: 0,
      reason: 'WOODEN_DUMMY_HAS_NO_INTENT',
      message: '木人無招，唯有活人有破綻；打木人樁經驗為 0。',
    };
  }

  /**
   * 透過實戰或同門切磋增加五破圖譜經驗 (gainDuguCombatInsight)
   */
  static gainDuguCombatInsight(actor, opponentCategory, amount = 10) {
    if (!actor.duguState) {
      actor.duguState = DuguNineSwordsEngine.createDuguState();
    }

    const catMap = {
      palm: 'breakPalm',
      fist: 'breakPalm',
      polearm: 'breakPolearm',
      staff: 'breakPolearm',
      sword: 'breakSword',
      arrow: 'breakArrow',
      ranged: 'breakArrow',
      projectile: 'breakArrow',
      qi: 'breakQi',
      internal: 'breakQi',
    };

    const breakKey = catMap[opponentCategory] || 'breakSword';
    const breakRecord = actor.duguState.unlockedBreaks[breakKey];

    breakRecord.unlocked = true;
    breakRecord.exp += amount;
    actor.duguState.totalCombatExp += amount;

    if (breakRecord.exp >= 100) {
      breakRecord.level += Math.floor(breakRecord.exp / 100);
      breakRecord.exp %= 100;
    }

    return {
      ok: true,
      breakKey,
      expGained: amount,
      currentLevel: breakRecord.level,
      unlocked: breakRecord.unlocked,
    };
  }

  /**
   * 看破前搖・後發先至截擊打斷 (resolveFlawInterrupt) - DoD B2 & B3
   */
  static resolveFlawInterrupt(duguActor, targetMoveState) {
    // 1. 若敵方招式渾然天成無破綻 (flawless === true，如 Lv10 羅漢拳)，不觸發破綻紅芒
    if (targetMoveState && targetMoveState.flawless === true) {
      return {
        triggered: false,
        intercepted: false,
        grandmasterResonance: true,
        dialogueBubble: '至拙無破綻，無招遇返璞！',
        reason: 'TARGET_MOVE_IS_FLAWLESS',
        damageToDugu: targetMoveState.damage || 0,
        flawWindow: null,
      };
    }

    // 2. 正常敵方起手前搖 (Buildup)：觸發後發先至截擊
    const windupTicks = targetMoveState?.buildupTicks ?? Math.round((targetMoveState?.windupSec ?? 0.6) * 60);

    if (windupTicks > 0) {
      // 九劍傳人 0s 前搖，第 12 tick (0.2s) 搶先命中
      if (targetMoveState) {
        targetMoveState.cancelled = true;
        targetMoveState.phase = 'interrupted';
      }

      return {
        triggered: true,
        intercepted: true,
        targetCancelled: true,
        duguStartupTicks: 0,
        interceptTick: 12,
        damageToDugu: 0,
        damageToTarget: 45,
        interruptKnockback: 40,
        flawType: targetMoveState?.category || 'sword',
        dialogueBubble: '🎯 破綻在此！後發先至！',
      };
    }

    return {
      triggered: false,
      intercepted: false,
      targetCancelled: false,
      damageToDugu: targetMoveState?.damage || 0,
    };
  }
}

// 實用輔助函式別名直接導出
export const trainDuguOnWoodenDummy = DuguNineSwordsEngine.trainDuguOnWoodenDummy;
export const gainDuguCombatInsight = DuguNineSwordsEngine.gainDuguCombatInsight;
export const resolveFlawInterrupt = DuguNineSwordsEngine.resolveFlawInterrupt;

/**
 * 藏經閣著書立說 (authorScripture) - DoD B4
 */
export function authorScripture(disciple, artId) {
  const discipleArts = disciple.martialArts || {};
  const lvl = discipleArts[artId] || 0;
  const artDef = findArtDefinition(artId);

  // 必須精通二/三階或 Lv10 返璞歸真才可撰寫
  const eligible = (artDef?.tier >= 2 && lvl >= 3) || (artDef?.tier === 3 && lvl >= 1) || (artId === 'art.luohan_fist' && lvl === 10);

  if (!eligible && lvl < 3) {
    return {
      ok: false,
      reason: 'MARTIAL_LEVEL_INSUFFICIENT_FOR_AUTHORING',
      message: '武學造詣尚未大成，無法撰寫手札入閣！',
    };
  }

  const artName = artDef?.name || artId;
  const scripture = {
    id: `scripture.${artId.replace('art.', '')}_manual`,
    title: `《${artName}手札》`,
    sourceArtId: artId,
    authorDiscipleId: disciple.id,
    authorName: disciple.name,
    createdAtDay: 1,
    quality: lvl >= 5 ? 'perfection' : 'master',
    studyEfficiencyMultiplier: 2.0, // +100% 研讀速度
    assignedInstructorId: disciple.id,
  };

  return {
    ok: true,
    scripture,
    studyEfficiencyMultiplier: 2.0,
    message: `成功將心得撰寫成《${artName}手札》存入藏經閣！`,
  };
}

/**
 * 靜室兩派合參 (synthesizeCrossLineageArt) - DoD B4
 * 掌門與客座同門搭檔武學皆 >= Lv4，閉關合參撰寫《雙脈合參秘笈》
 */
export function synthesizeCrossLineageArt(founderDisciple, fellowDisciple, quietRoomState = {}) {
  const founderArts = founderDisciple.martialArts || {};
  const fellowArts = fellowDisciple.martialArts || {};

  // 尋找最高等級武學
  const getHighestArt = (arts) => {
    let topId = null;
    let maxLvl = 0;
    for (const [id, lvl] of Object.entries(arts)) {
      if (lvl > maxLvl) {
        maxLvl = lvl;
        topId = id;
      }
    }
    return { topId, maxLvl };
  };

  const founderTop = getHighestArt(founderArts);
  const fellowTop = getHighestArt(fellowArts);

  if (!founderTop.topId || founderTop.maxLvl < 4 || !fellowTop.topId || fellowTop.maxLvl < 4) {
    return {
      ok: false,
      reason: 'PREREQUISITE_LEVEL_INSUFFICIENT',
      minLevelRequired: 4,
      founderCurrentLvl: founderTop.maxLvl,
      fellowCurrentLvl: fellowTop.maxLvl,
      message: '雙方武學皆需達到 Lv4+ 方可入靜室合參！',
    };
  }

  // 命名典故
  let manualTitle;
  if (
    (founderTop.topId.includes('xianglong') || founderTop.topId.includes('luohan')) &&
    (fellowTop.topId.includes('sword') || fellowTop.topId.includes('wuyue') || fellowTop.topId.includes('dugu'))
  ) {
    manualTitle = '《剛柔劍掌雙絕》';
  } else if (
    (founderTop.topId.includes('zixia') || founderTop.topId.includes('huashan')) &&
    (fellowTop.topId.includes('lion') || fellowTop.topId.includes('hedong'))
  ) {
    manualTitle = '《紫霞千里傳音》';
  } else if (
    (founderTop.topId.includes('zixia') || founderTop.topId.includes('huashan')) &&
    (fellowTop.topId.includes('dugu') || fellowTop.topId.includes('wuyue'))
  ) {
    manualTitle = '《紫霞九劍合參》';
  } else {
    manualTitle = `《雙脈合參秘笈・${founderTop.topId} × ${fellowTop.topId}》`;
  }

  const synthesizedArtId = `art.synth_${founderTop.topId.replace('art.', '')}_${fellowTop.topId.replace('art.', '')}`;

  return {
    ok: true,
    manualTitle,
    synthesizedArtId,
    studyEfficiencyMultiplier: 2.5,
    founderArtId: founderTop.topId,
    fellowArtId: fellowTop.topId,
    coAuthors: [founderDisciple.id, fellowDisciple.id],
    message: `兩派同心合參，成功著成${manualTitle}！`,
  };
}
