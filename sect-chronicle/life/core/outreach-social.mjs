// outreach-social.mjs
// LIFE-V05 核心引擎：下山免費義學識人、豬籠城寨三隱士、外門雜務定額與解放內門、包租婆水缸催水、因果社交記憶帳本與道侶結契雙人房。

import fs from 'node:fs';

const CANDIDATES_DATA = JSON.parse(
  fs.readFileSync(new URL('../data/outreach-candidates.json', import.meta.url), 'utf-8')
);

// =========================================================================
// 1. 權威常數表 (LIFE_V05_CONSTANTS)
// =========================================================================

export const LIFE_V05_CONSTANTS = Object.freeze({
  choreQuota: Object.freeze({
    dailyRequired: 3,                  // 外門每日必修 3 件雜務
    outerUnfulfilledMultiplier: 3.0,   // 未滿定額時派工優先權重 x3.0
    innerRoutineWeight: 0.0,           // 內門非危急 (存量 ≥15%) 時雜務權重 0.0 (徹底解放)
    emergencyWaterThreshold: 0.15,     // 水糧存量 <15% 觸發全門派緊急補位
    emergencyInnerWeight: 1.5,         // 危急時內門緊急補位權重
    promotionContributionThreshold: 100 // 累積貢獻達 100 可行奉茶禮晉升內門
  }),
  landladySupervision: Object.freeze({
    waterVatThreshold: 0.50,           // 水缸 <50% 觸發
    baseSpeedMultiplier: 1.50,         // 全場外門挑水砍柴移速 +50%
    slackerDuoMultiplier: 1.65,        // 包租婆 + 阿星/韋小寶搭檔移速 +65%
    roarCooldownTicks: 3600            // 獅吼冷卻 60 秒 (3600 ticks)
  }),
  housing: Object.freeze({
    intimacyCohabitThreshold: 5,       // 道侶親密度 5 解鎖同住雙人房
    sharedSleepEnergyBonusPerSec: 1.0  // 道侶同室睡眠精力恢復額外 +1.0/s
  }),
  social: Object.freeze({
    pairCooldownTicks: 1800,           // 同對互動冷卻 30 秒 (1800 ticks) 防刷
    maxMemoriesPerBond: 50             // 記憶帳本上限
  })
});

export const HIDDEN_MASTERS_CATALOG = Object.freeze(CANDIDATES_DATA.hiddenMasters);
export const REACTION_TYPES = Object.freeze(CANDIDATES_DATA.reactionTypes);
export const ORIGIN_AFFINITIES = Object.freeze(CANDIDATES_DATA.originAffinities);

// =========================================================================
// 2. 豬籠城寨三隱士 (HiddenMasterManager & HIDDEN_MASTERS)
// =========================================================================

export class HiddenMasterManager {
  constructor(customMasters = null) {
    this.masters = new Map();
    const source = customMasters || CANDIDATES_DATA.hiddenMasters;
    for (const [key, data] of Object.entries(source)) {
      this.masters.set(key, { ...data });
    }
  }

  getMaster(masterId) {
    return this.masters.get(masterId) || null;
  }

  getChoreSpeedBonus(masterId, choreType) {
    const master = this.masters.get(masterId);
    if (!master) return 1.0;
    if (master.choreType === choreType) {
      return 1.0 + (master.choreSpeedBonus || 0.40);
    }
    return 1.0;
  }

  triggerHiddenMasterAwakening(masterId, options = {}) {
    const master = this.masters.get(masterId);
    if (!master) {
      return { ok: false, reason: 'MASTER_NOT_FOUND' };
    }

    const threatLevel = options.gateThreatLevel ?? 0.8;
    const force = options.force ?? false;

    if (!force && threatLevel < 0.7) {
      return { ok: false, reason: 'THREAT_LEVEL_TOO_LOW_TO_AWAKEN', currentThreat: threatLevel };
    }

    master.apronTorn = true;
    master.isAwakened = true;
    master.awakenedAtTick = options.tick ?? 0;

    return {
      ok: true,
      masterId,
      name: master.name,
      alias: master.alias,
      awakenedArtId: master.awakenedArtId,
      awakenedArtName: master.awakenedArtName,
      awakenedArtTier: master.awakenedArtTier,
      awakeningQuote: master.awakeningQuote,
      damageBonus: master.awakenedDamageBonus,
      isAwakened: true,
      apronTorn: true
    };
  }
}

export const HIDDEN_MASTERS = new HiddenMasterManager();

// =========================================================================
// 3. 下山免費義學講武與識人 (runOutreachTeaching & recruitCandidate)
// =========================================================================

export function runOutreachTeaching(options = {}) {
  const {
    instructor,
    sectOrigin = 'origin.wanfo_palm',
    pool = CANDIDATES_DATA.candidates,
    selectedCandidateIds = null,
    teachingTicks = 3600
  } = options;

  // 1. 講師資格檢定：掌門、師兄、或任意武學等級 ≥ 3
  if (instructor) {
    const isMaster = instructor.rankTier === 'master' || instructor.role === 'leader';
    const isSenior = instructor.rankTier === 'senior';
    const martialArts = instructor.martialArts || {};
    const hasLv3Art = Object.values(martialArts).some((lvl) => lvl >= 3);
    const hasHighSkill = (instructor.skills?.unarmed || 0) >= 3 || (instructor.skills?.sword || 0) >= 3;

    if (!isMaster && !isSenior && !hasLv3Art && !hasHighSkill) {
      return {
        ok: false,
        reason: 'INSUFFICIENT_INSTRUCTOR_QUALIFICATION',
        detail: '下山開館講武需掌門親臨、資深師兄、或至少一門武學達到 Lv3 熟練'
      };
    }
  }

  // 2. 獲取本門起源的招募偏好
  const affinityConfig = ORIGIN_AFFINITIES[sectOrigin] || {
    preferredArchetypes: [],
    affinityBonus: 0.0,
    biasDescription: '常規門風'
  };

  // 3. 候選人篩選與反應判定
  let candidatePool = pool;
  if (selectedCandidateIds && Array.isArray(selectedCandidateIds)) {
    candidatePool = pool.filter((c) => selectedCandidateIds.includes(c.candidateId));
  }

  const evaluatedCandidates = candidatePool.map((candidate) => {
    const archetype = candidate.archetypeId;
    const isPreferred = affinityConfig.preferredArchetypes?.includes(archetype);
    const affinityMultiplier = isPreferred ? 1.0 + affinityConfig.affinityBonus : 1.0;

    // 依先天五維推導現場跟練反應
    let reactionKey = candidate.reactionTag;
    if (!reactionKey) {
      const { comprehension = 5, constitution = 5, agility = 5, composure = 5 } = candidate.stats || {};
      if (comprehension >= 8) reactionKey = 'insight_prodigy';
      else if (constitution >= 8) reactionKey = 'endurance_worker';
      else if (composure >= 8) reactionKey = 'herb_affinity';
      else if (agility >= 8) reactionKey = 'craft_talent';
      else reactionKey = 'endurance_worker';
    }

    const reactionInfo = REACTION_TYPES[reactionKey] || {
      tag: '💪 吃苦耐勞',
      name: '勤勉棟樑',
      description: '大汗淋漓蹲馬步'
    };

    // 綜合適應度評分
    const baseScore =
      ((candidate.stats?.comprehension || 5) * 1.5 +
        (candidate.stats?.constitution || 5) * 1.2 +
        (candidate.stats?.agility || 5) * 1.0) /
      3.7;
    const finalScore = Number((baseScore * affinityMultiplier).toFixed(2));

    return {
      candidateId: candidate.candidateId,
      name: candidate.name,
      age: candidate.age,
      archetypeId: candidate.archetypeId,
      reactionTag: reactionInfo.tag,
      reactionName: reactionInfo.name,
      reactionDescription: reactionInfo.description,
      stats: { ...candidate.stats },
      isAdopted: Boolean(candidate.isAdopted),
      hiddenMasterKey: candidate.hiddenMasterKey || null,
      affinityBonusApplied: isPreferred,
      affinityMultiplier,
      suitabilityScore: finalScore,
      canRecruit: true
    };
  });

  return {
    ok: true,
    sectOrigin,
    instructorName: instructor?.name || '本門掌門',
    affinityDescription: affinityConfig.biasDescription,
    teachingDurationTicks: teachingTicks,
    candidates: evaluatedCandidates
  };
}

export function recruitCandidate(candidate, options = {}) {
  const targetTier = options.targetTier || 'outer';
  const discipleId = options.discipleId || `disc.${candidate.archetypeId}_${Date.now()}`;

  const isOuter = targetTier === 'outer';
  const quotaState = {
    discipleId,
    rankTier: targetTier,
    dailyQuota: isOuter ? LIFE_V05_CONSTANTS.choreQuota.dailyRequired : 0,
    choresCompletedToday: 0,
    isQuotaFulfilled: !isOuter,
    unlockedMartialPractice: !isOuter,
    contributionPoints: 0
  };

  const disciple = {
    id: discipleId,
    name: candidate.name,
    age: candidate.age || 18,
    gender: candidate.gender || 'male',
    archetypeId: candidate.archetypeId,
    rankTier: targetTier,
    isAdopted: Boolean(candidate.isAdopted),
    hiddenMasterKey: candidate.hiddenMasterKey || null,
    stats: { ...(candidate.stats || { comprehension: 5, constitution: 5, strength: 5, agility: 5, composure: 5 }) },
    skills: { legStrength: 1, qinggong: 1, physique: 1, unarmed: 1, sword: 0, carryWater: 1 },
    energy: 100,
    maxEnergy: 100,
    satiety: 100,
    currentActivity: 'idle',
    choreQuota: quotaState
  };

  return {
    ok: true,
    disciple,
    message: `${candidate.name} 已正式拜入山門，受領【${targetTier === 'outer' ? '外門粗布道袍' : '內門雲紋青衫'}】`
  };
}

// =========================================================================
// 4. 外門每日雜務定額與內門解放 (ChoreQuotaManager)
// =========================================================================

export class ChoreQuotaManager {
  constructor(constants = LIFE_V05_CONSTANTS.choreQuota) {
    this.constants = constants;
    this.quotaStates = new Map();
  }

  getOrCreateQuota(disciple) {
    if (!disciple || !disciple.id) return null;
    if (this.quotaStates.has(disciple.id)) {
      return this.quotaStates.get(disciple.id);
    }

    const isOuter = disciple.rankTier === 'outer';
    const initialQuota = {
      discipleId: disciple.id,
      rankTier: disciple.rankTier || 'outer',
      dailyQuota: isOuter ? this.constants.dailyRequired : 0,
      choresCompletedToday: 0,
      isQuotaFulfilled: !isOuter,
      unlockedMartialPractice: !isOuter,
      contributionPoints: 0
    };

    this.quotaStates.set(disciple.id, initialQuota);
    return initialQuota;
  }

  recordChoreCompletion(discipleId, choreType = 'carry_water') {
    const quota = this.quotaStates.get(discipleId);
    if (!quota) {
      return { ok: false, reason: 'DISCIPLE_QUOTA_NOT_FOUND' };
    }

    quota.choresCompletedToday += 1;
    quota.contributionPoints += 5;

    if (quota.choresCompletedToday >= quota.dailyQuota) {
      quota.isQuotaFulfilled = true;
      quota.unlockedMartialPractice = true;
    }

    return {
      ok: true,
      choreType,
      choresCompletedToday: quota.choresCompletedToday,
      dailyQuota: quota.dailyQuota,
      isQuotaFulfilled: quota.isQuotaFulfilled,
      unlockedMartialPractice: quota.unlockedMartialPractice,
      contributionPoints: quota.contributionPoints
    };
  }

  attemptClaimMartialPractice(discipleId) {
    const quota = this.quotaStates.get(discipleId);
    if (!quota) {
      return { ok: false, reason: 'DISCIPLE_NOT_REGISTERED' };
    }

    // 外門弟子每日做滿 3 件雜務才解鎖練拳
    if (quota.rankTier === 'outer' && quota.choresCompletedToday < quota.dailyQuota) {
      return {
        ok: false,
        reason: 'CHORE_QUOTA_INCOMPLETE',
        completedChores: quota.choresCompletedToday,
        requiredChores: quota.dailyQuota,
        message: `外門弟子今日雜務尚未達標（${quota.choresCompletedToday}/${quota.dailyQuota}），不可領取外功場練武籌碼`
      };
    }

    return {
      ok: true,
      unlockedMartialPractice: true,
      message: '今日雜務已畢，准予申時前往外功場練拳切磋'
    };
  }

  getChoreDispatchPriority(disciple, choreType, worldResources = { waterRatio: 1.0, foodRatio: 1.0 }) {
    const quota = this.getOrCreateQuota(disciple);
    const { waterRatio = 1.0, foodRatio = 1.0 } = worldResources;
    const isEmergency = waterRatio < this.constants.emergencyWaterThreshold || foodRatio < this.constants.emergencyWaterThreshold;

    // 1. 內門弟子與掌門：非危急時優先度一律 0.0，徹底解放專注練功！
    if (quota.rankTier === 'inner' || quota.rankTier === 'senior' || quota.rankTier === 'master') {
      if (!isEmergency) {
        return {
          priorityWeight: this.constants.innerRoutineWeight, // 0.0
          isExempt: true,
          suggestedActivity: 'martial_practice',
          reason: '門派水糧充足，內門弟子免除日常雜務'
        };
      }
      return {
        priorityWeight: this.constants.emergencyInnerWeight, // 1.5
        isExempt: false,
        suggestedActivity: 'emergency_chore',
        reason: '門派水糧告急（<15%），內門弟子緊急補位救亡'
      };
    }

    // 2. 外門弟子：未完成定額時賦予 3.0 絕對優先權！
    if (!quota.isQuotaFulfilled) {
      return {
        priorityWeight: this.constants.outerUnfulfilledMultiplier, // 3.0
        isExempt: false,
        suggestedActivity: 'chore',
        reason: '外門今日定額未滿，優先派工挑水砍柴'
      };
    }

    // 外門已完成定額：常規優先級 (1.0)
    return {
      priorityWeight: 1.0,
      isExempt: false,
      suggestedActivity: 'martial_practice',
      reason: '外門今日定額已完成，可自由活動或自主練武'
    };
  }

  resetDailyQuotas() {
    for (const quota of this.quotaStates.values()) {
      quota.choresCompletedToday = 0;
      const isOuter = quota.rankTier === 'outer';
      quota.isQuotaFulfilled = !isOuter;
      quota.unlockedMartialPractice = !isOuter;
    }
  }
}

// =========================================================================
// 5. 包租婆水缸催水獅吼督導 (LandladySupervisionManager)
// =========================================================================

export class LandladySupervisionManager {
  constructor(constants = LIFE_V05_CONSTANTS.landladySupervision) {
    this.constants = constants;
    this.lastRoarTick = -99999;
  }

  checkWaterVatSupervision(worldState = {}) {
    const {
      waterVatRatio = 1.0,
      landladyPresent = true,
      currentTick = 0
    } = worldState;

    if (!landladyPresent) {
      return { triggered: false, reason: 'LANDLADY_NOT_PRESENT' };
    }

    // 嚴格檢定：水缸水量跌破 50% (< 0.50)
    if (waterVatRatio >= this.constants.waterVatThreshold) {
      return {
        triggered: false,
        reason: 'WATER_ABOVE_THRESHOLD',
        currentWaterRatio: waterVatRatio,
        threshold: this.constants.waterVatThreshold
      };
    }

    // 冷卻檢定
    if (currentTick - this.lastRoarTick < this.constants.roarCooldownTicks) {
      return {
        triggered: false,
        reason: 'ROAR_ON_COOLDOWN',
        remainingTicks: this.constants.roarCooldownTicks - (currentTick - this.lastRoarTick)
      };
    }

    this.lastRoarTick = currentTick;

    return {
      triggered: true,
      reason: 'WATER_BELOW_FIFTY_PERCENT',
      roarQuote: '包租婆～怎麼沒水了呢？！快去挑水！',
      waterVatRatio,
      baseSpeedMultiplier: this.constants.baseSpeedMultiplier,      // 1.50
      slackerDuoMultiplier: this.constants.slackerDuoMultiplier,   // 1.65
      affectedRoles: ['outer'],
      affectedChores: ['carry_water', 'chop_wood', 'harvest_garden']
    };
  }

  getSpeedMultiplier(disciple, options = {}) {
    const { isRoarActive = false, choreType = 'carry_water' } = options;
    if (!isRoarActive) return 1.0;

    const relevantChores = ['carry_water', 'chop_wood', 'harvest_garden', 'haul_materials'];
    if (!relevantChores.includes(choreType)) return 1.0;

    // 阿星或韋小寶：逃命步疊加至 +65%
    const isSlackerDuo = disciple.archetypeId === 'ah_sing' || disciple.archetypeId === 'wei_xiaobao';
    if (isSlackerDuo) {
      return this.constants.slackerDuoMultiplier; // 1.65
    }

    // 外門弟子：常規獅吼加速 +50%
    if (disciple.rankTier === 'outer') {
      return this.constants.baseSpeedMultiplier; // 1.50
    }

    return 1.0;
  }
}

// =========================================================================
// 6. 因果社交記憶帳本與道侶雙人房結契成家 (SocialLedger)
// =========================================================================

export class SocialLedger {
  constructor(constants = LIFE_V05_CONSTANTS.social) {
    this.constants = constants;
    this.bonds = new Map(); // key: 'discA:discB'
  }

  static bondKey(idA, idB) {
    return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
  }

  getOrCreateBond(actorA, actorB) {
    const key = SocialLedger.bondKey(actorA.id, actorB.id);
    if (this.bonds.has(key)) {
      return this.bonds.get(key);
    }

    // 嚴格雙軌分流判定：若任一方未成年或具備收養關係，永遠鎖定為親情長幼軌道
    const isUnderage = (actorA.age != null && actorA.age < 18) || (actorB.age != null && actorB.age < 18);
    const isAdoption = Boolean(actorA.isAdopted || actorB.isAdopted || actorA.archetypeId === 'adopted_child' || actorB.archetypeId === 'adopted_child');

    const track = (isUnderage || isAdoption) ? 'kinship_adoption' : 'romantic_dao_companion';

    const bond = {
      bondKey: key,
      discipleA: actorA.id,
      discipleB: actorB.id,
      intimacyLevel: 0,
      track,
      isCoHabiting: false,
      sharedRoomId: null,
      lastInteractionTick: -99999,
      memories: []
    };

    this.bonds.set(key, bond);
    return bond;
  }

  recordInteraction(actorA, actorB, event = {}) {
    const bond = this.getOrCreateBond(actorA, actorB);
    const tick = event.timestampTick ?? 0;

    // 30 秒 (1800 ticks) 冷卻防刷
    if (tick - bond.lastInteractionTick < this.constants.pairCooldownTicks) {
      return {
        ok: false,
        reason: 'PAIR_INTERACTION_ON_COOLDOWN',
        remainingTicks: this.constants.pairCooldownTicks - (tick - bond.lastInteractionTick)
      };
    }

    bond.lastInteractionTick = tick;
    const delta = event.sentimentDelta ?? 1;
    bond.intimacyLevel = Math.min(5, bond.intimacyLevel + delta);

    const memory = {
      memoryId: `mem.${bond.bondKey}_${tick}`,
      timestampTick: tick,
      partnerA: actorA.id,
      partnerB: actorB.id,
      eventType: event.eventType || 'share_tea',
      sentimentDelta: delta,
      description: event.description || '同門共處相談甚歡'
    };

    bond.memories.push(memory);
    if (bond.memories.length > this.constants.maxMemoriesPerBond) {
      bond.memories.shift();
    }

    return {
      ok: true,
      bondKey: bond.bondKey,
      intimacyLevel: bond.intimacyLevel,
      track: bond.track,
      memory
    };
  }

  proposeDaoCompanion(actorA, actorB) {
    const bond = this.getOrCreateBond(actorA, actorB);

    // 嚴格反例斷言：未成年或收養軌道嚴禁結契成家
    if (bond.track === 'kinship_adoption' || actorA.age < 18 || actorB.age < 18) {
      return {
        ok: false,
        reason: 'KINSHIP_ADOPTION_FORBIDS_ROMANCE',
        detail: 'UNDERAGE_OR_INVALID_ROMANCE_TRACK',
        message: '未成年收養與長幼親情軌道嚴禁結為道侶成家'
      };
    }

    // 親密度需達到門檻 5
    if (bond.intimacyLevel < LIFE_V05_CONSTANTS.housing.intimacyCohabitThreshold) {
      return {
        ok: false,
        reason: 'INTIMACY_BELOW_THRESHOLD',
        required: LIFE_V05_CONSTANTS.housing.intimacyCohabitThreshold,
        current: bond.intimacyLevel
      };
    }

    bond.isDaoCompanion = true;
    return {
      ok: true,
      bondKey: bond.bondKey,
      status: 'DAO_COMPANIONS_CONFIRMED',
      message: `${actorA.name} 與 ${actorB.name} 結契為本門道侶！`
    };
  }

  assignCoupleDorm(actorA, actorB, dormId = 'fac.dorm.b') {
    const bond = this.getOrCreateBond(actorA, actorB);

    // 嚴格反例斷言：未成年或非道侶軌道嚴禁入住雙人雅室
    if (bond.track === 'kinship_adoption' || actorA.age < 18 || actorB.age < 18) {
      return {
        ok: false,
        reason: 'UNDERAGE_OR_INVALID_ROMANCE_TRACK',
        detail: 'KINSHIP_ADOPTION_FORBIDS_ROMANCE',
        message: '未成年弟子或親情軌道不可分配至道侶雙人雅室'
      };
    }

    if (bond.intimacyLevel < LIFE_V05_CONSTANTS.housing.intimacyCohabitThreshold) {
      return {
        ok: false,
        reason: 'INTIMACY_BELOW_THRESHOLD',
        required: LIFE_V05_CONSTANTS.housing.intimacyCohabitThreshold,
        current: bond.intimacyLevel
      };
    }

    bond.isCoHabiting = true;
    bond.sharedRoomId = dormId;

    return {
      ok: true,
      dormId,
      bondKey: bond.bondKey,
      isCoHabiting: true,
      sleepEnergyBonus: LIFE_V05_CONSTANTS.housing.sharedSleepEnergyBonusPerSec,
      message: `${actorA.name} 與 ${actorB.name} 遷入雙人房 ${dormId} 同住`
    };
  }
}
