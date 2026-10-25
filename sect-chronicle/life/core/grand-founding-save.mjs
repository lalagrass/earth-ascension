// grand-founding-save.mjs
// LIFE-V10 開山立匾大典、自創第四階鎮派神功、跨周目雙軌天命傳家寶與正式版 Save Schema v1 存檔

import fs from 'node:fs';
import crypto from 'node:crypto';

const GRAND_FOUNDING_URL = new URL('../data/grand-founding-v10.json', import.meta.url);
export const GRAND_FOUNDING_DATA = JSON.parse(fs.readFileSync(GRAND_FOUNDING_URL, 'utf-8'));

// =========================================================================
// 1. 開山立匾大典與自創鎮派神功 (GrandFoundingManager)
// =========================================================================

export class GrandFoundingManager {
  static checkFoundingPrerequisites(worldState = {}) {
    const missing = [];

    // 1. 宗門名聲 >= 80
    const reputation =
      worldState.reputation ??
      worldState.sect?.reputation ??
      worldState.sectReputation ??
      0;
    if (reputation < GRAND_FOUNDING_DATA.foundingRequirements.minReputation) {
      missing.push(`REPUTATION_TOO_LOW_${reputation}_REQUIRED_80`);
    }

    // 2. 門徒弟子 >= 8
    const disciples =
      worldState.disciples ||
      worldState.world?.disciples ||
      [];
    if (disciples.length < GRAND_FOUNDING_DATA.foundingRequirements.minDisciples) {
      missing.push(`DISCIPLES_COUNT_TOO_LOW_${disciples.length}_REQUIRED_8`);
    }

    // 3. 藏經閣收錄滿 3 部上乘絕學或已領悟終極絕學
    const scriptures =
      worldState.scriptures ||
      worldState.world?.scriptures ||
      [];
    const hasUltimateOrTier3Art =
      worldState.hasUltimateOrTier3Art === true ||
      scriptures.length >= GRAND_FOUNDING_DATA.foundingRequirements.minScriptures;

    if (!hasUltimateOrTier3Art) {
      missing.push('REQUIRE_AT_LEAST_3_SCRIPTURES_OR_TIER3_ART');
    }

    // 4. 大廳升為三清正殿 (Stage >= 2)
    const hall =
      worldState.facilities?.['fac.hall'] ||
      worldState.facilities?.['fac.hall_sanqing'] ||
      worldState.world?.facilities?.['fac.hall'] ||
      worldState.world?.facilities?.['fac.hall_sanqing'] ||
      {};
    const hallStage =
      worldState.hallStage ??
      hall.stage ??
      hall.level ??
      (hall.builtStage === 'sanqing_hall' ? 2 : 1);

    if (hallStage < GRAND_FOUNDING_DATA.foundingRequirements.minHallStage) {
      missing.push('HALL_NOT_SANQING_GRAND_STAGE');
    }

    return {
      satisfied: missing.length === 0,
      missing,
    };
  }

  static holdGrandFoundingCeremony(worldState = {}, config = {}) {
    const check = this.checkFoundingPrerequisites(worldState);
    if (!check.satisfied) {
      return {
        ok: false,
        reason: 'PREREQUISITES_NOT_MET',
        missing: check.missing,
      };
    }

    let customArt = null;
    if (config.customArtConfig) {
      const artRes = this.createCustomUltimateArt(config.customArtConfig);
      if (!artRes.ok) return artRes;
      customArt = artRes.art;
    } else {
      customArt = {
        artId: 'art.custom_tier4_ultimate',
        customName: config.customArtName || '《松風萬壑劍陣》',
        geometricShape: 'domain',
        elementTag: 'sword_domain',
        damage: 180,
        radiusPx: 120,
        qiCost: 50,
        scriptureAuthoringComplete: true,
      };
    }

    const foundingRecord = {
      sectName: config.sectName || '玄華仙劍門',
      sectEthos: config.sectEthos || '俠義存心、剛柔並濟',
      foundingDay: worldState.gameDay || 1,
      founderDiscipleId: config.founderDiscipleId || 'disc.leader',
      customUltimateArt: customArt,
      plaqueHung: true,
      ceremonyCompleted: true,
    };

    worldState.sect = {
      ...(worldState.sect || {}),
      ...foundingRecord,
    };

    // 加入編年史
    SectChronicleGenerator.addMilestone(worldState, {
      id: 'grand_founding',
      day: worldState.gameDay || 1,
      title: '開宗立匾・自創鎮派神功',
      description: `建元：三清正殿敲響金鐘，立匾『${foundingRecord.sectName}』，著入鎮派神功${foundingRecord.customUltimateArt.customName}！`,
      illustrationId: 'ill.grand_founding',
    });

    return {
      ok: true,
      foundingRecord,
    };
  }

  static resolveYueBuqunDestinyFork(actor = {}, worldState = {}) {
    const composure = actor.stats?.composure ?? 7;
    const morality = worldState.morality ?? 70;
    const defeatStress = actor.defeatStress ?? 0;
    const hasKasaya = actor.hasKasayaScroll === true;
    const obsession = actor.obsession === true;

    // 正道分支：堅守君子本心、高定力、低壓力
    const orthodoxQualifies = (composure >= 9 || (composure >= 7 && morality >= 70)) && defeatStress < 30 && !obsession;

    if (orthodoxQualifies && !hasKasaya) {
      return {
        choice: 'orthodox',
        unlockedArt: 'art.zixia_tier10',
        title: '《紫霞十重・混元太華劍陣》',
        burnKasaya: true,
        moralityShift: 'orthodox',
        aura: 'purple_mist_sanqing',
        domainRadiusPx: 120,
        dialogue: '君子有所為有所不為，焚此袈裟，以浩然正氣護我太華！',
      };
    }

    // 邪道分支：心魔入魔、深夜引刀自宮
    return {
      choice: 'demonic',
      unlockedArt: 'art.bixie_sword',
      title: '《辟邪劍法》',
      windupSec: 0.05,
      speedMultiplier: 3.0,
      combatPowerBonus: 3.0, // +300%
      moralityShift: 'demonic',
      dialogue: '欲練神功，引刀自宮！身法如鬼魅，鮮紅繡衣遮天！',
    };
  }

  static createCustomUltimateArt(config = {}) {
    const damage = config.damage ?? 120;
    const radiusPx = config.radiusPx ?? 80;
    const knockback = config.knockback ?? 60;
    const qiCost = config.qiCost ?? 40;
    const cooldownSec = config.cooldownSec ?? 5.0;

    const weights = GRAND_FOUNDING_DATA.customUltimateArtBudget.weights;
    const maxBudget = GRAND_FOUNDING_DATA.customUltimateArtBudget.maxBudgetPoints; // 100

    // 點數預算公式
    const cost =
      damage * weights.damage +
      radiusPx * weights.radiusPx +
      knockback * weights.knockback -
      (qiCost - 30) * weights.qiCostDiscount -
      (cooldownSec - 3.0) * weights.cooldownDiscount;

    if (cost > maxBudget) {
      return {
        ok: false,
        reason: 'EXCEEDS_BALANCE_BUDGET',
        cost: Math.round(cost * 10) / 10,
        maxBudget,
      };
    }

    const art = {
      artId: config.artId || `art.custom_${Date.now()}`,
      customName: config.customName || '《松風萬壑劍陣》',
      geometricShape: config.geometricShape || 'domain',
      elementTag: config.elementTag || 'sword_domain',
      damage,
      radiusPx,
      knockback,
      qiCost,
      cooldownSec,
      allocatedBudget: Math.round(cost * 10) / 10,
      scriptureAuthoringComplete: true,
    };

    return {
      ok: true,
      art,
    };
  }
}

// =========================================================================
// 2. 宗門編年史長卷 (SectChronicleGenerator)
// =========================================================================

export class SectChronicleGenerator {
  static generateChronicleScroll(events = []) {
    const templates = GRAND_FOUNDING_DATA.chronicleTemplates;

    const defaultScroll = [
      {
        day: 1,
        title: templates.s0_repair.title,
        description: templates.s0_repair.template,
        illustrationId: 'ill.s0_repair',
      },
      {
        day: 30,
        title: templates.ah_sing_cocoon.title,
        description: templates.ah_sing_cocoon.template,
        illustrationId: 'ill.ah_sing_cocoon',
      },
      {
        day: 60,
        title: templates.grand_founding.title,
        description: templates.grand_founding.template,
        illustrationId: 'ill.grand_founding',
      },
    ];

    if (!Array.isArray(events) || events.length === 0) {
      return defaultScroll;
    }

    return events.map(ev => ({
      day: ev.day || 1,
      title: ev.title || '宗門大事',
      description: ev.description || ev.text || '',
      illustrationId: ev.illustrationId || 'ill.generic',
    }));
  }

  static addMilestone(worldState, milestone) {
    if (!worldState) return;
    if (!worldState.chronicle) {
      worldState.chronicle = [];
    }
    worldState.chronicle.push(milestone);
  }
}

// =========================================================================
// 3. 跨周目雙軌天命功德池與傳家寶 (LegacyCarryoverManager)
// =========================================================================

export class LegacyCarryoverManager {
  static createMeritPool(initialFree = 0, initialSupporter = 0) {
    return {
      freeMeritPoints: initialFree,
      supporterMeritPoints: initialSupporter,
      unlockedProtagonists: [],
      heirloomsCarryover: {
        selectedScriptureId: null,
        selectedEquipmentId: null,
        meritCostPaid: 0,
      },
    };
  }

  static calculateMeritPoints(completedMilestones = []) {
    let meritPoints = 0;
    const unlockedProtagonists = [];

    for (const ms of completedMilestones) {
      if (ms === 'ah_sing_cocoon') {
        meritPoints += 3;
        unlockedProtagonists.push('ah_sing');
      } else if (ms === 'haidafu_tonic') {
        meritPoints += 2;
        unlockedProtagonists.push('hai_dafu');
      } else if (ms === 'luohan_tier10') {
        meritPoints += 4;
        unlockedProtagonists.push('guo_jing');
      } else if (ms === 'yue_buqun_orthodox' || ms === 'yue_buqun_bixie') {
        meritPoints += 5;
        unlockedProtagonists.push('yue_buqun');
      } else if (ms === 'grand_founding') {
        meritPoints += 5;
      }
    }

    return {
      meritPoints,
      unlockedProtagonists,
    };
  }

  static carryoverHeirloom(meritPool, heirloomConfig = {}) {
    if (!meritPool) {
      return { ok: false, reason: 'INVALID_MERIT_POOL' };
    }

    const cost = heirloomConfig.meritCost ?? heirloomConfig.cost ?? 0;
    const available = (meritPool.freeMeritPoints || 0) + (meritPool.supporterMeritPoints || 0);

    if (available < cost) {
      return {
        ok: false,
        reason: 'INSUFFICIENT_DESTINY_POINTS',
        counter_heirloom_carryover_destiny_cost: true,
        currentPoints: available,
        requiredCost: cost,
      };
    }

    // 先扣免費天命點，不足再扣支持者點
    let remainingCost = cost;
    if (meritPool.freeMeritPoints >= remainingCost) {
      meritPool.freeMeritPoints -= remainingCost;
      remainingCost = 0;
    } else {
      remainingCost -= meritPool.freeMeritPoints;
      meritPool.freeMeritPoints = 0;
      meritPool.supporterMeritPoints = Math.max(0, meritPool.supporterMeritPoints - remainingCost);
    }

    meritPool.heirloomsCarryover = {
      selectedScriptureId: heirloomConfig.type === 'scripture' ? heirloomConfig.itemId : null,
      selectedEquipmentId: heirloomConfig.type === 'equipment' || heirloomConfig.type === 'weapon' || heirloomConfig.type === 'armor' ? heirloomConfig.itemId : null,
      meritCostPaid: cost,
    };

    return {
      ok: true,
      remainingPoints: meritPool.freeMeritPoints + meritPool.supporterMeritPoints,
      carriedHeirloom: heirloomConfig,
    };
  }
}

// =========================================================================
// 4. 正式版 Save Schema v1 序列化與確定性長時回放 (SaveSchemaV1Manager)
// =========================================================================

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = canonicalize(obj[key]);
  }
  return sorted;
}

export class SaveSchemaV1Manager {
  static CURRENT_SCHEMA_VERSION = 'sect-life-v1.0';

  static computeStateHash(stateObj) {
    const canonicalJson = JSON.stringify(canonicalize(stateObj));
    return crypto.createHash('sha256').update(canonicalJson).digest('hex');
  }

  static serializeWorldSaveV1(worldState = {}) {
    const payload = {
      version: 1,
      schemaVersion: this.CURRENT_SCHEMA_VERSION,
      savedAtTimestamp: worldState.savedAtTimestamp || Date.now(),
      gameDay: worldState.gameDay || 1,
      gameTick: worldState.gameTick || 0,
      initialSeed: worldState.initialSeed ?? 42,
      sect: worldState.sect || null,
      storyteller: worldState.storyteller || null,
      destinyPool: worldState.destinyPool || null,
      world: {
        facilities: worldState.world?.facilities || worldState.facilities || {},
        disciples: worldState.world?.disciples || worldState.disciples || [],
        inventory: worldState.world?.inventory || worldState.inventory || {},
        scriptures: worldState.world?.scriptures || worldState.scriptures || [],
        chronicle: worldState.world?.chronicle || worldState.chronicle || [],
      },
    };

    return JSON.stringify(canonicalize(payload), null, 2);
  }

  static saveToV1Json(worldState) {
    return this.serializeWorldSaveV1(worldState);
  }

  static deserializeWorldSaveV1(jsonPayload) {
    if (typeof jsonPayload !== 'string') {
      return {
        ok: false,
        reason: 'INVALID_PAYLOAD_TYPE',
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonPayload);
    } catch {
      return {
        ok: false,
        reason: 'CORRUPTED_JSON_PAYLOAD',
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        ok: false,
        reason: 'CORRUPTED_JSON_OBJECT',
      };
    }

    // 嚴格檢核 Schema Version
    if (parsed.schemaVersion !== this.CURRENT_SCHEMA_VERSION) {
      return {
        ok: false,
        reason: 'INVALID_SAVE_SCHEMA_VERSION',
        counter_corrupted_save_schema_rejection: true,
        actualVersion: parsed.schemaVersion,
        expectedVersion: this.CURRENT_SCHEMA_VERSION,
      };
    }

    // 檢核頂層結構完整性
    const requiredKeys = ['version', 'schemaVersion', 'savedAtTimestamp', 'gameDay', 'gameTick', 'initialSeed', 'world'];
    for (const key of requiredKeys) {
      if (!(key in parsed)) {
        return {
          ok: false,
          reason: `MISSING_REQUIRED_KEY_${key}`,
        };
      }
    }

    return {
      ok: true,
      worldState: parsed,
    };
  }

  static loadFromV1Json(jsonPayload) {
    return this.deserializeWorldSaveV1(jsonPayload);
  }

  /**
   * 驗證長時確定性回放：直接跑 vs 存檔載入再跑 終態 Hash 100% 一致
   */
  static verifySaveLoadDeterminism(initialSeed = 1001, ticksBeforeSave = 100, ticksAfterSave = 100) {
    const advanceTick = (state, tick) => {
      // 確定性偽世界步進器
      state.gameTick++;
      if (state.gameTick % 60 === 0) {
        state.gameDay++;
      }
      for (const d of state.world.disciples) {
        d.x = (d.x + ((state.initialSeed * 17 + tick * 31) % 7)) % 1000;
        d.y = (d.y + ((state.initialSeed * 19 + tick * 37) % 5)) % 1000;
        d.qi = (d.qi + 1) % 100;
      }
      return state;
    };

    const createInitialState = () => ({
      version: 1,
      schemaVersion: this.CURRENT_SCHEMA_VERSION,
      savedAtTimestamp: 1700000000000,
      gameDay: 1,
      gameTick: 0,
      initialSeed,
      sect: { sectName: '泰華宗', ethos: '浩然正氣' },
      storyteller: { stage: 'S1' },
      destinyPool: { freeMeritPoints: 10, supporterMeritPoints: 0 },
      world: {
        facilities: { 'fac.hall': { stage: 2 } },
        disciples: [
          { id: 'disc.leader', x: 100, y: 100, qi: 50 },
          { id: 'disc.star', x: 200, y: 200, qi: 30 },
        ],
        inventory: { wood: 50, stone: 30 },
        scriptures: [{ id: 'art.basic_sword' }],
        chronicle: [],
      },
    });

    // 1. 直跑到底 (ticksBeforeSave + ticksAfterSave)
    const directState = createInitialState();
    const totalTicks = ticksBeforeSave + ticksAfterSave;
    for (let t = 0; t < totalTicks; t++) {
      advanceTick(directState, t);
    }
    const hashDirect = this.computeStateHash(directState);

    // 2. 跑前段 -> 存檔 -> 讀檔 -> 跑後段
    const saveLoadState = createInitialState();
    for (let t = 0; t < ticksBeforeSave; t++) {
      advanceTick(saveLoadState, t);
    }

    const saveJson = this.serializeWorldSaveV1(saveLoadState);
    const loadRes = this.deserializeWorldSaveV1(saveJson);
    if (!loadRes.ok) {
      throw new Error(`Save/load failed during determinism check: ${loadRes.reason}`);
    }

    const resumedState = loadRes.worldState;
    for (let t = ticksBeforeSave; t < totalTicks; t++) {
      advanceTick(resumedState, t);
    }
    const hashSaveLoad = this.computeStateHash(resumedState);

    return {
      deterministic: hashDirect === hashSaveLoad,
      hashDirect,
      hashSaveLoad,
      counter_save_load_hash_divergence: hashDirect === hashSaveLoad,
    };
  }
}
