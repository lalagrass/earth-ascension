// legendary-clashes.mjs
// LIFE-V09 金庸×周星馳全明星覺醒、終極踢館大戰、八大傳奇戰鬥物理、四大武道相剋環與視聽導演重播

import fs from 'node:fs';
import crypto from 'node:crypto';

const LEGENDS_V09_URL = new URL('../data/legends-v09.json', import.meta.url);
export const LEGENDS_V09_DATA = JSON.parse(fs.readFileSync(LEGENDS_V09_URL, 'utf-8'));

export const ULTIMATE_MARTIAL_CONSTANTS = Object.freeze({
  dragonPalm: Object.freeze({
    windupSec: 0.30,
    activeSec: 0.35,
    recoverySec: 0.25,
    qiCost: 40,
    shape: Object.freeze({ type: 'line', length: 160, width: 40 }),
    damage: 120,
    knockback: 110,
  }),
  landladyBellRoar: Object.freeze({
    windupSec: 0.40,
    activeSec: 0.50,
    recoverySec: 0.30,
    qiCost: 50,
    shape: Object.freeze({ type: 'circle', radius: 180 }),
    damage: 90,
    shatterProjectiles: true,
    rangeMultiplier: 2.0,
    knockback: 130,
  }),
  toadMissileCharge: Object.freeze({
    windupSec: 0.60,
    activeSec: 0.25,
    recoverySec: 0.35,
    qiCost: 45,
    shape: Object.freeze({ type: 'line', length: 200, width: 30 }),
    damage: 140,
    knockback: 150,
  }),
  starBuddhaPalm: Object.freeze({
    windupSec: 0.75,
    activeSec: 0.60,
    recoverySec: 0.40,
    qiCost: 80,
    shape: Object.freeze({ type: 'circle', radius: 240 }),
    damage: 220,
    groundCraterPermanent: true,
    knockback: 180,
  }),
  haidafuTurtleWave: Object.freeze({
    windupSec: 0.50,
    activeSec: 0.45,
    recoverySec: 0.40,
    qiCost: 60,
    shape: Object.freeze({ type: 'line', length: 250, width: 50 }),
    damage: 160,
  }),
  orientalNeedleRush: Object.freeze({
    windupSec: 0.05,
    activeSec: 0.15,
    recoverySec: 0.10,
    qiCost: 20,
    shape: Object.freeze({ type: 'point', count: 5 }),
    damage: 85,
  }),
});

export const DIRECTOR_CONSTANTS = Object.freeze({
  cinematicZoom: Object.freeze({
    targetZoom: 1.35,
    panDurationMs: 600,
    slowMotionMultiplier: 0.30,
    slowMotionDurationMs: 1500,
  }),
  hitstop: Object.freeze({
    durationMs: 120,
    durationTicks: 7,
    screenShakeIntensityPx: 3,
  }),
  replay: Object.freeze({
    snapshotMaxSizeBytes: 4096,
    replayDurationTicks: 600,
    snapshotPreRollTicks: 300,
  }),
});

// =========================================================================
// 1. 世界畫風濾鏡 (WorldToneFilter)
// =========================================================================

const ARCHETYPE_ALIAS_MAP = {
  '火雲邪神': 'the_beast',
  'huoyun_xieshen': 'the_beast',
  'the_beast': 'the_beast',
  '包租婆': 'landlady',
  'landlady': 'landlady',
  '包租公': 'landlord',
  'landlord': 'landlord',
  '阿星': 'ah_sing',
  'ah_sing': 'ah_sing',
  '海大富': 'hai_dafu',
  'hai_dafu': 'hai_dafu',
  '韋小寶': 'wei_xiaobao',
  'wei_xiaobao': 'wei_xiaobao',
  '天殘地缺': 'tiancan_dique',
  'tiancan_dique': 'tiancan_dique',
  '苦力強': 'kuli_qiang',
  'kuli_qiang': 'kuli_qiang',
  '裁縫師傅': 'tailor_hong',
  'tailor_hong': 'tailor_hong',
  '油炸鬼': 'youzha_gui',
  'youzha_gui': 'youzha_gui',
  '岳不群': 'yue_buqun',
  'yue_buqun': 'yue_buqun',
  '令狐沖': 'linghu_chong',
  'linghu_chong': 'linghu_chong',
  '郭靖': 'guo_jing',
  'guo_jing': 'guo_jing',
  '喬峰': 'qiao_feng',
  'qiao_feng': 'qiao_feng',
  '黃蓉': 'huang_rong',
  'huang_rong': 'huang_rong',
  '楊過': 'yang_guo',
  'yang_guo': 'yang_guo',
  '小龍女': 'xiaolongnu',
  'xiaolongnu': 'xiaolongnu',
  '張無忌': 'zhang_wuji',
  'zhang_wuji': 'zhang_wuji',
  '段譽': 'duan_yu',
  'duan_yu': 'duan_yu',
  '洪七公': 'hong_qigong',
  'hong_qigong': 'hong_qigong',
  '周伯通': 'zhou_botong',
  'zhou_botong': 'zhou_botong',
  '東方不敗': 'dongfang_bubai',
  'dongfang_bubai': 'dongfang_bubai',
};

const STEPHEN_CHOW_ARCHETYPES = new Set([
  'the_beast',
  'huoyun_xieshen',
  'landlady',
  'landlord',
  'ah_sing',
  'hai_dafu',
  'wei_xiaobao',
  'tiancan_dique',
  'kuli_qiang',
  'tailor_hong',
  'youzha_gui',
]);

const JINYONG_ARCHETYPES = new Set([
  'yue_buqun',
  'linghu_chong',
  'guo_jing',
  'qiao_feng',
  'huang_rong',
  'yang_guo',
  'xiaolongnu',
  'zhang_wuji',
  'duan_yu',
  'hong_qigong',
  'zhou_botong',
  'dongfang_bubai',
]);

export class WorldToneFilter {
  static normalizeArchetypeId(idOrName) {
    if (!idOrName) return '';
    return ARCHETYPE_ALIAS_MAP[idOrName] || idOrName;
  }

  static normalizeFilterMode(mode) {
    if (mode === 'orthodox_jinyong' || mode === 'orthodox') return 'orthodox';
    if (mode === 'stephen_chow_universe' || mode === 'stephen_chow') return 'stephen_chow';
    return 'hybrid';
  }

  static canSpawnCharacter(characterIdOrName, filterMode = 'hybrid') {
    const normMode = this.normalizeFilterMode(filterMode);
    const normId = this.normalizeArchetypeId(characterIdOrName);

    if (normMode === 'orthodox') {
      if (STEPHEN_CHOW_ARCHETYPES.has(normId)) {
        return {
          allowed: false,
          reason: 'BLOCKED_BY_ORTHODOX_TONE_FILTER',
          archetypeId: normId,
          filterMode: normMode,
        };
      }
    }

    if (normMode === 'stephen_chow') {
      if (JINYONG_ARCHETYPES.has(normId)) {
        return {
          allowed: false,
          reason: 'BLOCKED_BY_STEPHEN_CHOW_TONE_FILTER',
          archetypeId: normId,
          filterMode: normMode,
        };
      }
    }

    const charDef = LEGENDS_V09_DATA.characters[normId];
    return {
      allowed: true,
      archetypeId: normId,
      filterMode: normMode,
      character: charDef || null,
    };
  }

  static filterRoster(characterList, filterMode = 'hybrid') {
    return characterList.filter(id => this.canSpawnCharacter(id, filterMode).allowed);
  }
}

// =========================================================================
// 2. 說書人因果節奏閥門 (StorytellerPacingGate)
// =========================================================================

export class StorytellerPacingGate {
  constructor(config = {}) {
    this.worldToneFilter = WorldToneFilter.normalizeFilterMode(config.worldToneFilter || 'hybrid');
    this.unlockedStage = config.unlockedStage || 'S0';
    this.minCooldownTicks = config.minCooldownTicks ?? 3600;
    this.seasonDurationDays = config.seasonDurationDays ?? 10;
    this.lastEncounterDay = config.lastEncounterDay ?? null;
    this.lastEncounterTick = config.lastEncounterTick ?? null;
    this.lastChallengeTick = config.lastChallengeTick ?? null;
    this.activeCastIds = Array.isArray(config.activeCastIds) ? [...config.activeCastIds] : [];
    this.pendingRivals = Array.isArray(config.pendingRivals) ? [...config.pendingRivals] : [];
  }

  canTriggerEncounter(day, characterIdOrName, stageOverride = null) {
    const stage = stageOverride || this.unlockedStage;
    const filterRes = WorldToneFilter.canSpawnCharacter(characterIdOrName, this.worldToneFilter);
    if (!filterRes.allowed) {
      return filterRes;
    }

    const normId = filterRes.archetypeId;
    const charDef = LEGENDS_V09_DATA.characters[normId];

    // 1. 每旬頻率閥門：同一旬內只能觸發 1 次奇遇
    if (this.lastEncounterDay !== null) {
      const lastSeason = Math.floor((this.lastEncounterDay - 1) / this.seasonDurationDays);
      const currentSeason = Math.floor((day - 1) / this.seasonDurationDays);

      if (currentSeason === lastSeason) {
        const nextAllowedDay = (lastSeason + 1) * this.seasonDurationDays + 1;
        return {
          allowed: false,
          reason: 'SEASON_PACING_RATE_LIMIT',
          lastEncounterDay: this.lastEncounterDay,
          currentDay: day,
          nextAllowedDay,
          archetypeId: normId,
        };
      }
    }

    // 2. 階段登場限制
    if (charDef && charDef.unlockStage) {
      const requiredStage = charDef.unlockStage;
      if (stage === 'S0' && requiredStage !== 'S0') {
        return {
          allowed: false,
          reason: 'STAGE_LOCKED',
          currentStage: stage,
          requiredStage,
          archetypeId: normId,
        };
      }
      if (stage === 'S1' && requiredStage === 'S2') {
        return {
          allowed: false,
          reason: 'STAGE_LOCKED',
          currentStage: stage,
          requiredStage,
          archetypeId: normId,
        };
      }
    }

    return {
      allowed: true,
      archetypeId: normId,
      currentDay: day,
    };
  }

  triggerEncounter(day, characterIdOrName, currentTick = 0) {
    const check = this.canTriggerEncounter(day, characterIdOrName);
    if (!check.allowed) return check;

    const normId = check.archetypeId;
    this.lastEncounterDay = day;
    this.lastEncounterTick = currentTick;
    if (!this.activeCastIds.includes(normId)) {
      this.activeCastIds.push(normId);
    }
    return {
      ok: true,
      archetypeId: normId,
      day,
      tick: currentTick,
    };
  }

  canTriggerRivalChallenge(currentTick, rivalId, sectReadiness = 100) {
    if (this.lastChallengeTick !== null) {
      const elapsed = currentTick - this.lastChallengeTick;
      if (elapsed < this.minCooldownTicks) {
        return {
          allowed: false,
          reason: 'COOLDOWN_ACTIVE',
          counter_storyteller_consecutive_raid_spam: true,
          remainingTicks: this.minCooldownTicks - elapsed,
          minCooldownTicks: this.minCooldownTicks,
        };
      }
    }

    if (sectReadiness < 30) {
      return {
        allowed: false,
        reason: 'SECT_READINESS_TOO_LOW',
        sectReadiness,
      };
    }

    const scaledThreat = Math.max(50, Math.min(250, Math.round(sectReadiness * 1.25)));
    return {
      allowed: true,
      rivalId,
      scaledThreat,
      sectReadiness,
    };
  }

  triggerRivalChallenge(currentTick, rivalId, sectReadiness = 100) {
    const check = this.canTriggerRivalChallenge(currentTick, rivalId, sectReadiness);
    if (!check.allowed) return check;

    this.lastChallengeTick = currentTick;
    return {
      ok: true,
      rivalId,
      tick: currentTick,
      scaledThreat: check.scaledThreat,
    };
  }
}

// =========================================================================
// 3. 八大傳奇戰鬥物理引擎 (LegendaryPhysicsEngine)
// =========================================================================

export class LegendaryPhysicsEngine {
  /**
   * ① 包租婆古鐘獅吼 vs 天殘地缺琴魔音波切刃
   */
  static resolveLionRoarVsHarpWaves(landladyState = {}, harpWaveProjectiles = []) {
    const hasBronzeBell =
      landladyState.equippedItem === 'equip.bronze_bell_megaphone' ||
      landladyState.hasBronzeBell === true ||
      landladyState.item === 'bronze_bell_megaphone';

    const count = Array.isArray(harpWaveProjectiles) ? harpWaveProjectiles.length : 0;

    if (hasBronzeBell) {
      return {
        ok: true,
        rangeMultiplier: 2.0,
        powerMultiplier: 2.0,
        shattered: true,
        shatteredProjectiles: count,
        projectilesRemaining: [],
        harpistsStunned: true,
        stunDurationTicks: 180, // 3.0s at 60Hz
        damage: 180,
        knockback: 180,
        calligraphy: '【大喇叭獅吼・震碎琴魔！】',
      };
    }

    return {
      ok: true,
      rangeMultiplier: 1.0,
      powerMultiplier: 1.0,
      shattered: false,
      shatteredProjectiles: Math.min(count, 1),
      projectilesRemaining: Array.isArray(harpWaveProjectiles) ? harpWaveProjectiles.slice(1) : [],
      harpistsStunned: false,
      damage: 90,
      knockback: 130,
      calligraphy: '【河東獅吼】',
    };
  }

  /**
   * ② 火雲邪神空手夾子彈 + 蛤蟆功
   */
  static resolveBeastEncounter(beastState = {}, incomingAttack = {}) {
    const isBulletOrDart =
      incomingAttack.isBullet === true ||
      incomingAttack.type === 'bullet' ||
      incomingAttack.type === 'dart' ||
      incomingAttack.weapon === 'foreign_musket' ||
      incomingAttack.isDart === true ||
      incomingAttack.category === 'projectile';

    if (isBulletOrDart) {
      return {
        ok: true,
        damageTaken: 0,
        caughtProjectile: true,
        counter_beast_bullet_catch_immunity: true,
        catchDistancePx: 0,
        quote: '天下武功，無堅不破，唯快不破！',
        toadMissileLaunched: true,
        toadShockwave: {
          shape: { type: 'line', length: 200, width: 30 },
          damage: 140,
          knockback: 150,
          parabolicLeap: true,
        },
      };
    }

    const isRulaiPalm =
      incomingAttack.artId === 'art.buddha_palm_ultimate' ||
      (incomingAttack.name && incomingAttack.name.includes('如來神掌'));

    if (isRulaiPalm) {
      return {
        ok: true,
        damageTaken: incomingAttack.damage || 220,
        caughtProjectile: false,
        groundCrater: true,
        toadMissileSuppressed: true,
        beastPacified: true,
        lollipopReceived: true,
        quote: '想學啊？我教你啊。',
      };
    }

    return {
      ok: true,
      damageTaken: incomingAttack.damage || 50,
      caughtProjectile: false,
      toadMissileLaunched: false,
    };
  }

  /**
   * ③ 阿星木乃伊破繭與如來神掌
   */
  static resolveAhSingCocoonAndRulaiPalm(ahSingState, incomingDamage = 0) {
    if (!ahSingState) {
      return { ok: false, reason: 'INVALID_AH_SING_STATE' };
    }

    const maxHp = ahSingState.maxHp || 100;
    const currentHp = ahSingState.hp ?? maxHp;
    const nextHp = currentHp - incomingDamage;

    // 重傷瀕死 (<=10% HP) 進入白色木乃伊繭
    if (nextHp <= maxHp * 0.10 && !ahSingState.inCocoon && !ahSingState.cocoonReborn) {
      ahSingState.inCocoon = true;
      ahSingState.cocoonTicksRemaining = 300;
      ahSingState.hp = Math.max(1, Math.round(maxHp * 0.10));
      return {
        ok: true,
        inCocoon: true,
        cocoonEntered: true,
        dialogue: '被包成白色木乃伊繭抬入藥房，一夜金光洗禮...',
      };
    }

    ahSingState.hp = Math.max(0, nextHp);
    return {
      ok: true,
      inCocoon: Boolean(ahSingState.inCocoon),
      hp: ahSingState.hp,
    };
  }

  static completeAhSingCocoon(ahSingState) {
    if (!ahSingState) return { ok: false, reason: 'INVALID_STATE' };
    ahSingState.inCocoon = false;
    ahSingState.cocoonReborn = true;
    ahSingState.renDuUnlocked = true;
    ahSingState.speedMultiplier = 3.0;
    ahSingState.qiMultiplier = 3.0;
    ahSingState.hp = ahSingState.maxHp || 100;
    return {
      ok: true,
      cocoonReborn: true,
      renDuUnlocked: true,
      speedMultiplier: 3.0,
      qiMultiplier: 3.0,
      hp: ahSingState.hp,
    };
  }

  static executeAhSingRulaiPalm(ahSingState, target = {}) {
    if (!ahSingState || (!ahSingState.inCocoon && !ahSingState.cocoonReborn)) {
      return {
        ok: false,
        reason: 'REQUIRES_MUMMY_COCOON_REBIRTH',
        counter_ahsing_premature_rulai_without_cocoon: true,
      };
    }

    return {
      ok: true,
      moveName: '《如來神掌・萬佛朝宗》',
      damage: 220,
      shape: { type: 'circle', radius: 240 },
      groundCraterPermanent: true,
      craterRadiusPx: 240,
      craterShape: 'five_finger_crater',
      knockback: 180,
      suppressedToadStyle: true,
      lollipopGiven: true,
      quote: '一掌震天，留五指巨坑！',
    };
  }

  /**
   * ④ 乾坤大挪移 / 獨孤九劍破氣式 反彈海大富龜波氣功
   */
  static resolveQiankunBeamReflection(defender = {}, incomingBeam = {}) {
    const hasReflectionArt =
      defender.artId === 'art.qiankun_danuoyi' ||
      defender.hasQiankun === true ||
      defender.name === '張無忌' ||
      (defender.duguNineSwords && defender.unlockedBreakGas);

    if (hasReflectionArt) {
      const beamDamage = incomingBeam.damage || 160;
      return {
        ok: true,
        reflected: true,
        angleDegrees: 180,
        damageTaken: 0,
        reflectedDamage: beamDamage,
        targetOriginalSender: true,
        calligraphyBanner: '【乾坤挪移！】',
      };
    }

    return {
      ok: true,
      reflected: false,
      damageTaken: incomingBeam.damage || 160,
    };
  }

  /**
   * ⑤ 包租公真・太極大圓圈牽引互撞
   */
  static resolveTaijiCircleEntanglement(landlordState = {}, enemies = []) {
    const count = Array.isArray(enemies) ? enemies.length : 2;
    return {
      ok: true,
      enemiesCollided: true,
      headOnCollision: true,
      enemiesCount: count,
      damagePerEnemy: 60,
      calligraphy: '【真・太極大圓圈】',
    };
  }

  /**
   * ⑥ 豬籠城寨三隱士爆衣護山
   */
  static resolveThreeHeroesAwakening(heroes = []) {
    return {
      ok: true,
      apronTorn: true,
      awakened: true,
      heroes: ['苦力強: 十二路譚腿', '裁縫: 洪家鐵線拳', '油炸鬼: 五郎八卦棍'],
      damageBonus: 0.45,
    };
  }

  /**
   * ⑦ 東方不敗 0.05s 極速繡花針
   */
  static resolveDongfangNeedleRush(dongfangState = {}, targets = []) {
    const targetCount = Array.isArray(targets) ? Math.min(5, targets.length) : 5;
    return {
      ok: true,
      windupSec: 0.05,
      windupTicks: 3,
      targetsHit: targetCount,
      damagePerHit: 85,
      ghostAfterimage: true,
    };
  }

  /**
   * ⑧ 海大富延遲化骨綿掌
   */
  static resolveBoneMeltingPalm(victim = {}) {
    return {
      ok: true,
      delayedStepTicks: 3,
      skeletonExplosion: true,
      damage: 130,
      calligraphy: '【化骨綿掌・步盡骨碎】',
    };
  }
}

// =========================================================================
// 4. 四大武道相剋環 (evaluateMartialCounter)
// =========================================================================

export function evaluateMartialCounter(attacker = {}, defender = {}) {
  const attackerSchool = attacker.school || attacker.baseSchool;
  const defenderSchool = defender.school || defender.baseSchool;

  const attackerAttr = attacker.element || attacker.elementalAttribute;
  const defenderAttr = defender.element || defender.elementalAttribute;

  const isTranscendent =
    attacker.transcendent === true ||
    attacker.artId === 'art.luohan_fist_tier10' ||
    attacker.artId === 'art.dugu_nine_swords_stance';

  const schoolMatrix = LEGENDS_V09_DATA.martialCounterMatrix;
  const elementMatrix = LEGENDS_V09_DATA.elementalCounterMatrix;

  let attackerAdvantage = false;
  let defenderAdvantage = false;
  let calligraphy = '';

  // 1. 學校相剋檢定
  if (attackerSchool && defenderSchool && schoolMatrix[attackerSchool]) {
    if (schoolMatrix[attackerSchool].counters.includes(defenderSchool)) {
      attackerAdvantage = true;
      calligraphy = schoolMatrix[attackerSchool].calligraphy || '【破招！】';
    } else if (schoolMatrix[attackerSchool].counteredBy.includes(defenderSchool)) {
      defenderAdvantage = true;
    }
  }

  // 2. 元素相剋檢定 (剛猛 > 奇巧 > 陰柔 > 剛猛)
  if (!attackerAdvantage && !defenderAdvantage && attackerAttr && defenderAttr) {
    if (elementMatrix[attackerAttr] && elementMatrix[attackerAttr].counters.includes(defenderAttr)) {
      attackerAdvantage = true;
      calligraphy = `【${elementMatrix[attackerAttr].name}破${elementMatrix[defenderAttr].name}！】`;
    } else if (elementMatrix[attackerAttr] && elementMatrix[attackerAttr].counteredBy.includes(defenderAttr)) {
      defenderAdvantage = true;
    }
  }

  // 結算
  if (attackerAdvantage) {
    return {
      advantage: true,
      isCounter: true,
      counterBonus: 1.35,
      damageMultiplier: 1.35,
      defenderInterrupted: true,
      hitstopTicksApplied: 7, // 0.12s
      bannerCalligraphyText: calligraphy || '【破招！】',
    };
  }

  if (defenderAdvantage) {
    if (isTranscendent) {
      return {
        advantage: false,
        defenderAdvantage: true,
        transcendent: true,
        transcendentImmune: true,
        counterPenaltyImmune: true,
        damageMultiplier: 1.0,
        defenderInterrupted: false,
        hitstopTicksApplied: 0,
        bannerCalligraphyText: '【返璞歸真・無破可破！】',
      };
    }
    return {
      advantage: false,
      defenderAdvantage: true,
      transcendent: false,
      counteredPenalty: 0.75,
      damageMultiplier: 0.75,
      defenderInterrupted: false,
      hitstopTicksApplied: 0,
      bannerCalligraphyText: '',
    };
  }

  return {
    advantage: false,
    defenderAdvantage: false,
    damageMultiplier: 1.0,
    defenderInterrupted: false,
    hitstopTicksApplied: 0,
    bannerCalligraphyText: '',
  };
}

// =========================================================================
// 5. 觀影導演推鏡與 10 秒確定性重播 (CinemaReplayDirector)
// =========================================================================

export class CinemaReplayDirector {
  static captureSnapshot(worldState, triggerEvent = 'climax.buddha_palm', startTick = 0, rngSeed = 42) {
    // 萃取關鍵核心實體生成輕量快照 (<= 4096 bytes)
    const compactPayload = {
      t: startTick,
      seed: rngSeed,
      ev: triggerEvent,
      entities: Array.isArray(worldState?.disciples)
        ? worldState.disciples.map(d => ({
            id: d.id,
            hp: d.hp,
            qi: d.qi,
            x: d.x ?? 0,
            y: d.y ?? 0,
            art: d.activeArtId || null,
          }))
        : [],
      worldDay: worldState?.gameDay ?? 1,
    };

    const jsonStr = JSON.stringify(compactPayload);
    const b64 = Buffer.from(jsonStr, 'utf-8').toString('base64');

    if (b64.length > 4096) {
      throw new Error(`Snapshot exceeds 4096 bytes: got ${b64.length}`);
    }

    return {
      snapshotId: `snap.${Date.now()}.${Math.floor(Math.random() * 1000)}`,
      triggerEvent,
      snapshotStartTick: startTick,
      totalReplayTicks: 600, // 10s at 60Hz
      worldStateBinarySnapshotBase64: b64,
      recordedRngSeed: rngSeed,
      byteLength: b64.length,
    };
  }

  static replaySnapshot(snapshot, tickStepFunction) {
    if (!snapshot || !snapshot.worldStateBinarySnapshotBase64) {
      throw new Error('Invalid replay snapshot');
    }

    const jsonStr = Buffer.from(snapshot.worldStateBinarySnapshotBase64, 'base64').toString('utf-8');
    const reconstructed = JSON.parse(jsonStr);

    let currentState = reconstructed;
    const totalTicks = snapshot.totalReplayTicks || 600;

    for (let tick = 0; tick < totalTicks; tick++) {
      if (typeof tickStepFunction === 'function') {
        currentState = tickStepFunction(currentState, tick + snapshot.snapshotStartTick);
      }
    }

    const finalStateHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(currentState))
      .digest('hex');

    return {
      ok: true,
      totalTicks,
      finalState: currentState,
      finalStateHash,
    };
  }

  static applyHitstop(ticks = 7) {
    return {
      hitstopTicks: ticks,
      durationMs: 120,
      screenShakeIntensityPx: 3,
    };
  }

  static triggerCinematicZoom(zoom = 1.35, slowMotion = 0.30, durationMs = 1500) {
    return {
      zoomLevel: zoom,
      slowMotionMultiplier: slowMotion,
      durationMs,
      remainingTicks: Math.round(durationMs / 16.666),
    };
  }
}
