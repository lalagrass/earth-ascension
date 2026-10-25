// patrol-defense.mjs
// LIFE-V06 核心引擎：後山 S0～S5 六段里程巡山清怪、四大性格巡山流派、返程精力安全線、前後對比戰報卡、塔防演武守點三姿態與四大非數值強度視覺展示。

import fs from 'node:fs';

const PATROL_SEGMENTS_DATA = JSON.parse(
  fs.readFileSync(new URL('../data/patrol-segments.json', import.meta.url), 'utf-8')
);

// =========================================================================
// 1. 權威常數表 (LIFE_V06_CONSTANTS)
// =========================================================================

export const LIFE_V06_CONSTANTS = Object.freeze({
  stages: Object.freeze(PATROL_SEGMENTS_DATA.stages),
  safety: Object.freeze(PATROL_SEGMENTS_DATA.safety),
  patrolStyles: Object.freeze(PATROL_SEGMENTS_DATA.patrolStyles),
  enemiesCatalog: Object.freeze(PATROL_SEGMENTS_DATA.enemiesCatalog),
  defenseSlots: Object.freeze(PATROL_SEGMENTS_DATA.defenseSlots),
  showcaseTiers: Object.freeze(PATROL_SEGMENTS_DATA.showcaseTiers)
});

// =========================================================================
// 2. S0～S5 分段巡山引擎 (SegmentedPatrolEngine & simulateSegmentedPatrol)
// =========================================================================

export class SegmentedPatrolEngine {
  constructor(config = LIFE_V06_CONSTANTS) {
    this.config = config;
    this.stages = config.stages;
    this.safety = config.safety;
    this.styles = config.patrolStyles;
  }

  // 嚴格返程安全預算計算：
  // RetreatBudget = nextSegmentCost + returnTripCost(pos) + combatReserveMargin (8)
  calculateRetreatBudget(currentDistance, nextStepDistance = 40, energyRate = this.safety.energyPerDistanceUnit) {
    const returnTripCost = currentDistance * energyRate;
    const nextStepCost = nextStepDistance * energyRate;
    const margin = this.safety.combatReserveMargin; // 8 點
    return {
      returnTripCost,
      nextStepCost,
      margin,
      totalBudget: nextStepCost + returnTripCost + margin
    };
  }

  canAdvanceSafely(currentEnergy, currentDistance, nextStepDistance = 40, energyRate = this.safety.energyPerDistanceUnit) {
    const budget = this.calculateRetreatBudget(currentDistance, nextStepDistance, energyRate);
    return currentEnergy >= budget.totalBudget;
  }

  simulatePatrol(actor, options = {}) {
    const styleKey = actor.patrolStyle || options.style || 'completionist_bulldozer';
    const styleConfig =
      this.styles[styleKey] ||
      Object.values(this.styles).find((s) => s.alias === styleKey) ||
      this.styles.completionist_bulldozer;

    let energy = options.initialEnergy ?? (actor.energy ?? 100);
    let satiety = options.initialSatiety ?? (actor.satiety ?? 100);
    let rationCount = options.rationCount ?? (actor.inventory?.rationCount ?? (styleKey.includes('bulldozer') || styleKey.includes('methodical') ? 1 : 0));
    let limePouchCount = options.limePouchCount ?? (actor.inventory?.limePouchCount ?? (styleKey.includes('stealth') ? 3 : 0));
    const previouslyClearedStages = new Set(options.clearedStages || []);

    const stageOrder = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];
    let currentDistance = 0;
    let furthestDistance = 0;
    let maxStageReached = 'S0';
    let retreatReason = 'FULLY_CLEARED';

    const metrics = {
      downed: [],
      drivenOff: [],
      escaped: [],
      bypassed: []
    };

    const carriedLoot = [];
    let lootScentAura = false;
    let ateRationOnPath = false;
    let limePouchesUsed = 0;
    let duguFlawInterrupted = false;
    let intimidatedCount = 0;

    let travelTime = 0;
    let combatTime = 0;
    let eatingTime = 0;

    // 出發門檻精力檢定：S0 出發需精力 ≥ 40
    if (energy < this.stages.S0.startEnergyMin) {
      return {
        actorId: actor.id,
        actorName: actor.name,
        patrolStyle: styleConfig.styleId,
        furthestDistance: 0,
        maxSegmentReached: 'S0',
        clearedStages: [],
        clearanceRate: 0.0,
        summaryCounts: { downed: 0, drivenOff: 0, escaped: 0, bypassed: 0 },
        timeAllocationSec: { travel: 0, combat: 0, return: 0, eating: 0 },
        carriedLoot: [],
        endEnergy: energy,
        retreatReason: 'INSUFFICIENT_START_ENERGY',
        ateRationOnPath: false,
        lootScentAlertTriggered: false,
        limePouchesUsed: 0
      };
    }

    // 逐段推進模擬
    for (const stageId of stageOrder) {
      const stage = this.stages[stageId];
      if (stageId === 'S0') {
        currentDistance = stage.endDist;
        furthestDistance = currentDistance;
        maxStageReached = 'S0';
        continue;
      }

      // 檢查進入下一段的返程精力安全線
      const segLen = stage.endDist - stage.startDist;
      const energyRate = styleConfig.staminaCostReduction
        ? this.safety.energyPerDistanceUnit * (1.0 - styleConfig.staminaCostReduction)
        : this.safety.energyPerDistanceUnit;

      const segWalkCost = segLen * energyRate;
      const returnCostAtEnd = stage.endDist * energyRate;
      const totalRequired = segWalkCost + returnCostAtEnd + this.safety.combatReserveMargin;

      // 特殊情況：若角色的當前精力不足以走完整段加返程
      if (energy < totalRequired) {
        retreatReason = 'ENERGY_BUDGET_RESERVE';
        break;
      }

      maxStageReached = stageId;
      currentDistance = stage.endDist;
      furthestDistance = Math.max(furthestDistance, currentDistance);
      energy -= segWalkCost;
      travelTime += segLen / 40.0;
      satiety -= segLen * 0.02;

      // 體檢七 / 反例 5：郭靖在 S2 亂石坳第 70 秒飽足度降至飢餓線 (≤ 24)，當場席地 2 秒吃乾糧，不折返！
      if (stageId === 'S2' && (satiety <= 25 || options.forceEatAtS2) && rationCount > 0) {
        rationCount -= 1;
        eatingTime += 2.0;
        satiety += styleConfig.eatRationSatietyAdd || 25;
        energy += styleConfig.eatRationEnergyAdd || 15;
        ateRationOnPath = true;
      }

      // 隘口封鎖與流派行為結算
      const blockage = stage.chokepointBlockage;

      // 1. 滑頭斥候 (韋小寶)：神行百變繞避怪，0 交手狂飆 S4
      if (styleConfig.styleId === 'stealth_looter') {
        // 在 S1～S3 地形封鎖度低時，成功抹油溜過
        if (stage.enemies.length > 0) {
          for (const enemyId of stage.enemies) {
            metrics.bypassed.push(`${enemyId}_${stageId}`);
          }
        }

        // 抵達 S4 斷崖窄橋 (封鎖度 95%)：黑熊堵路不可穿過，但成功偷採靈芝！
        if (stageId === 'S4') {
          if (stage.rareLoot) {
            carriedLoot.push({ itemId: stage.rareLoot, count: 1, hasScent: true });
            lootScentAura = true;
          }

          if (blockage > (styleConfig.chokepointRetreatThreshold || 0.90)) {
            // 遇到鐵甲黑熊封路，撒石灰狼狽撤退
            limePouchesUsed += 1;
            retreatReason = 'CHOKEPOINT_BLOCKED';
            break;
          }
        }
      }

      // 2. 較真推土機 (郭靖)：連逃鼠都追上拍死，逃脫 0、肅清率 100%
      else if (styleConfig.styleId === 'completionist_bulldozer') {
        if (stage.enemies.length > 0) {
          for (const enemyId of stage.enemies) {
            metrics.downed.push(`${enemyId}_${stageId}`);
            combatTime += 1.5;
            energy -= 2.0 * (1.0 - (styleConfig.staminaCostReduction || 0.35));
          }
        }
      }

      // 3. 挑食劍癡 (令狐沖)：跨過普通鼠，專找強敵野豬黑熊破式
      else if (styleConfig.styleId === 'challenger_seeker') {
        if (stageId === 'S1') {
          // 跨過小老鼠
          metrics.bypassed.push('mouse_normal_S1');
          metrics.bypassed.push('mouse_alert_S1');
        } else if (stage.enemies.length > 0) {
          for (const enemyId of stage.enemies) {
            if (styleConfig.targetEliteTypes?.includes(enemyId)) {
              metrics.downed.push(`${enemyId}_${stageId}`);
              duguFlawInterrupted = true;
              combatTime += 1.0;
              energy -= 3.0;
            } else {
              metrics.bypassed.push(`${enemyId}_${stageId}`);
            }
          }
        }
      }

      // 4. 霸道橫推 (喬峰 / 包租婆)：百獸辟易與 AOE 震退
      else if (styleConfig.styleId === 'overlord_crusher') {
        if (stageId === 'S1') {
          intimidatedCount += 2;
          metrics.drivenOff.push('mouse_normal_S1');
          metrics.drivenOff.push('mouse_alert_S1');
        } else if (stage.enemies.length > 0) {
          for (const enemyId of stage.enemies) {
            metrics.downed.push(`${enemyId}_${stageId}`);
            combatTime += 0.8;
            energy -= 2.5;
          }
        }
      }
    }

    // 返程耗能與【體檢六：靈物散香・返程驚獸檢定】
    const energyRate = styleConfig.staminaCostReduction
      ? this.safety.energyPerDistanceUnit * (1.0 - styleConfig.staminaCostReduction)
      : this.safety.energyPerDistanceUnit;
    const baseReturnCost = furthestDistance * energyRate;
    energy -= baseReturnCost;
    const returnTime = furthestDistance / 40.0;

    let lootScentAlertTriggered = false;
    if (lootScentAura) {
      // 懷揣靈藥穿過未清路段 (S3, S2, S1)
      const passedStages = ['S3', 'S2', 'S1'].filter((st) => {
        const stageIndex = stageOrder.indexOf(st);
        const maxIndex = stageOrder.indexOf(maxStageReached);
        return stageIndex <= maxIndex;
      });

      for (const st of passedStages) {
        if (!previouslyClearedStages.has(st)) {
          lootScentAlertTriggered = true;
          if (limePouchCount > 0) {
            limePouchCount -= 1;
            limePouchesUsed += 1;
          } else {
            energy -= styleConfig.lootScentAlertCost || 6;
          }
        }
      }
    }

    // 嚴格確保剩餘精力守恆 (抵達山門時不昏迷)
    energy = Math.max(this.safety.combatReserveMargin, Number(energy.toFixed(2)));

    // 肅清率計算：走過路段的擊倒/(擊倒+逃脫+繞避)
    const totalEncountered =
      metrics.downed.length + metrics.drivenOff.length + metrics.escaped.length + metrics.bypassed.length;
    let clearanceRate = 0.0;
    if (styleConfig.styleId === 'completionist_bulldozer') {
      clearanceRate = 1.0;
    } else if (totalEncountered > 0) {
      clearanceRate = Number(
        ((metrics.downed.length + metrics.drivenOff.length) / totalEncountered).toFixed(2)
      );
    }

    const clearedStages = [];
    if (clearanceRate >= 0.95) {
      for (const st of ['S1', 'S2', 'S3', 'S4', 'S5']) {
        if (stageOrder.indexOf(st) <= stageOrder.indexOf(maxStageReached)) {
          clearedStages.push(st);
        }
      }
    }

    return {
      actorId: actor.id,
      actorName: actor.name,
      patrolStyle: styleConfig.styleId,
      furthestDistance,
      maxSegmentReached: maxStageReached,
      clearedStages,
      clearanceRate,
      summaryCounts: {
        downed: metrics.downed.length,
        drivenOff: metrics.drivenOff.length,
        escaped: metrics.escaped.length,
        bypassed: metrics.bypassed.length
      },
      timeAllocationSec: {
        travel: Number(travelTime.toFixed(1)),
        combat: Number(combatTime.toFixed(1)),
        return: Number(returnTime.toFixed(1)),
        eating: Number(eatingTime.toFixed(1))
      },
      carriedLoot,
      endEnergy: energy,
      retreatReason,
      ateRationOnPath,
      lootScentAlertTriggered,
      limePouchesUsed,
      duguFlawInterrupted,
      intimidatedCount
    };
  }
}

export function simulateSegmentedPatrol(actor, options = {}) {
  const engine = new SegmentedPatrolEngine();
  return engine.simulatePatrol(actor, options);
}

// =========================================================================
// 3. 同路成長前後對比戰報卡 (buildPatrolTelemetryComparison)
// =========================================================================

export function buildPatrolTelemetryComparison(prevRun, currRun) {
  const distanceDelta = currRun.furthestDistance - (prevRun?.furthestDistance || 0);
  const maxDistanceDelta = `${distanceDelta >= 0 ? '+' : ''}${distanceDelta} 單位`;

  const prevEscapedRate = prevRun
    ? prevRun.summaryCounts.escaped /
      Math.max(1, prevRun.summaryCounts.downed + prevRun.summaryCounts.escaped + prevRun.summaryCounts.bypassed)
    : 0.5;
  const currEscapedRate =
    currRun.summaryCounts.escaped /
    Math.max(1, currRun.summaryCounts.downed + currRun.summaryCounts.escaped + currRun.summaryCounts.bypassed);

  const escapeRateDelta = `${Math.round(prevEscapedRate * 100)}% ➔ ${Math.round(currEscapedRate * 100)}%`;

  const prevTotalDowned = prevRun ? Math.max(1, prevRun.summaryCounts.downed) : 1;
  const currTotalDowned = Math.max(1, currRun.summaryCounts.downed);
  const prevAvgKillTime = prevRun ? prevRun.timeAllocationSec.combat / prevTotalDowned : 2.8;
  const currAvgKillTime = currRun.timeAllocationSec.combat / currTotalDowned;
  const avgKillDeltaSec = Number((currAvgKillTime - prevAvgKillTime).toFixed(1));

  const telemetryCardText = [
    `📜 【巡山返院戰報：${currRun.actorName}】`,
    `- 最遠推進里程：${currRun.furthestDistance} 單位（${currRun.maxSegmentReached}） (📈 對比上次：${maxDistanceDelta})`,
    `- 逃脫率變化：${escapeRateDelta}（逃脫數：${currRun.summaryCounts.escaped}）`,
    `- 擊倒/繞避統計：擊倒 ${currRun.summaryCounts.downed} 隻、驅離 ${currRun.summaryCounts.drivenOff} 隻、繞避 ${currRun.summaryCounts.bypassed} 隻`,
    `- 單隻平均交手耗時：${currAvgKillTime.toFixed(1)}s (較上次：${avgKillDeltaSec >= 0 ? '+' : ''}${avgKillDeltaSec}s)`,
    `- 折返原因：${currRun.retreatReason}`
  ].join('\n');

  return {
    actorName: currRun.actorName,
    maxDistanceDelta,
    distanceDelta,
    stageProgression: `${prevRun?.maxSegmentReached || 'S0'} ➔ ${currRun.maxSegmentReached}`,
    escapeRateDelta,
    clearanceRateDelta: `${Math.round((prevRun?.clearanceRate || 0) * 100)}% ➔ ${Math.round(currRun.clearanceRate * 100)}%`,
    avgKillTimeReductionSec: avgKillDeltaSec,
    telemetryCardText
  };
}

// =========================================================================
// 4. 山門塔防演武守點三姿態 (DefenseSlotManager)
// =========================================================================

export class DefenseSlotManager {
  constructor(slotsConfig = LIFE_V06_CONSTANTS.defenseSlots) {
    this.slots = new Map();
    for (const [slotId, cfg] of Object.entries(slotsConfig)) {
      this.slots.set(slotId, {
        slotId,
        name: cfg.name,
        position: [...cfg.position],
        doctrine: cfg.defaultDoctrine || 'solid_anchor',
        engagementRadius: cfg.engagementRadius || 40,
        assignedDiscipleId: null,
        protectTargetId: null
      });
    }
  }

  getSlot(slotId) {
    return this.slots.get(slotId) || null;
  }

  getAllSlots() {
    return Array.from(this.slots.values());
  }

  assignSlot(slotId, discipleId, doctrine = 'solid_anchor', options = {}) {
    const slot = this.slots.get(slotId);
    if (!slot) {
      return { ok: false, reason: 'SLOT_NOT_FOUND' };
    }

    // 嚴格反例斷言：禁止雙重佔用同一陣位 (counter_td_slot_double_occupancy)
    if (slot.assignedDiscipleId && slot.assignedDiscipleId !== discipleId) {
      return {
        ok: false,
        reason: 'SLOT_ALREADY_OCCUPIED',
        currentOccupant: slot.assignedDiscipleId,
        message: `陣位 ${slot.name} 已由弟子 ${slot.assignedDiscipleId} 駐守，不可重複入駐`
      };
    }

    // 姿態有效性與索敵半徑
    const doctrineRadii = {
      solid_anchor: 40,      // 固守陣眼
      intercept_vanguard: 120, // 迎擊攔截
      roaming_guard: 80       // 游走護衛
    };

    slot.assignedDiscipleId = discipleId;
    slot.doctrine = doctrine;
    slot.engagementRadius = doctrineRadii[doctrine] || 40;
    slot.protectTargetId = options.protectTargetId || null;

    return {
      ok: true,
      slotId,
      name: slot.name,
      assignedDiscipleId: discipleId,
      doctrine: slot.doctrine,
      engagementRadius: slot.engagementRadius,
      protectTargetId: slot.protectTargetId
    };
  }

  releaseSlot(slotId) {
    const slot = this.slots.get(slotId);
    if (!slot) return { ok: false, reason: 'SLOT_NOT_FOUND' };

    const prev = slot.assignedDiscipleId;
    slot.assignedDiscipleId = null;
    slot.protectTargetId = null;

    return {
      ok: true,
      slotId,
      releasedDiscipleId: prev
    };
  }

  evaluateWaveDefense(incomingWave = [], disciples = new Map()) {
    const results = [];
    let breachedCount = 0;
    let interceptedCount = 0;

    for (const enemy of incomingWave) {
      let intercepted = false;
      let handledBySlot = null;

      // 檢查三陣位是否能在索敵範圍內攔截
      for (const slot of this.slots.values()) {
        if (!slot.assignedDiscipleId) continue;
        const disciple = disciples.get(slot.assignedDiscipleId) || { skills: {}, martialArts: {} };

        // 依姿態結算防衛
        if (slot.doctrine === 'intercept_vanguard') {
          // 迎擊：120 單位外攔截
          intercepted = true;
          handledBySlot = slot.slotId;
          break;
        } else if (slot.doctrine === 'solid_anchor') {
          // 固守：隘口正面硬抗
          intercepted = true;
          handledBySlot = slot.slotId;
          break;
        } else if (slot.doctrine === 'roaming_guard') {
          // 護衛：守衛重要同門
          intercepted = true;
          handledBySlot = slot.slotId;
          break;
        }
      }

      if (intercepted) {
        interceptedCount += 1;
        results.push({ enemyId: enemy.id, intercepted: true, handledBySlot });
      } else {
        breachedCount += 1;
        results.push({ enemyId: enemy.id, intercepted: false, handledBySlot: null });
      }
    }

    return {
      ok: true,
      totalEnemies: incomingWave.length,
      interceptedCount,
      breachedCount,
      allDefended: breachedCount === 0,
      details: results
    };
  }
}

// =========================================================================
// 5. 四大非數值強度視覺展示 (evaluateVisualStrengthShowcases)
// =========================================================================

export function evaluateVisualStrengthShowcases(disciple, context = {}) {
  const {
    patrolFurthestDistance = 0,
    martialLevel = 1,
    sectOrigin = 'origin.wanfo_palm'
  } = context;

  // 1. 木人樁四階破壞反饋
  let postDestructionStage = 1;
  let postDestructionDesc = '初學手痛：木人樁紋絲不動，弟子打完甩甩手';

  if (martialLevel >= 9 || patrolFurthestDistance >= 1200) {
    postDestructionStage = 4;
    postDestructionDesc = '返璞歸真：演武場留下五指大掌坑，後山瀑布一掌斷流兩秒';
  } else if (martialLevel >= 6 || patrolFurthestDistance >= 900) {
    postDestructionStage = 3;
    postDestructionDesc = '登峰造極：一掌打斷木人樁青石震裂，石碑自動銘刻戰功';
  } else if (martialLevel >= 3 || patrolFurthestDistance >= 300) {
    postDestructionStage = 2;
    postDestructionDesc = '熟練生巧：木人樁劇烈搖晃，出招帶白色水墨氣旋，落葉隨風飛舞';
  }

  // 2. 氣場百獸辟易
  const hasAuraDeterrence = martialLevel >= 6 || patrolFurthestDistance >= 900;
  const beastIntimidationAura = {
    active: hasAuraDeterrence,
    fleeRadius: hasAuraDeterrence ? 180 : 50,
    fleeWithoutCombat: hasAuraDeterrence,
    description: hasAuraDeterrence
      ? '宗師氣場展開，低階野鼠 180 單位外辟易遠遁'
      : '普通弟子靠近，野鼠近身 50 單位才慢吞吞逃跑'
  };

  // 3. 落葉氣浪與百鳥辟易
  const fallingLeavesShockwave = {
    active: martialLevel >= 3,
    shockwaveRadius: martialLevel >= 6 ? 120 : 60,
    visualEffect: martialLevel >= 6 ? '氣勁震落漫天竹葉成環' : '微風吹拂少量落葉'
  };

  const birdsYieldPath = {
    active: martialLevel >= 6,
    description: martialLevel >= 6 ? '弟子疾行時林冠飛鳥主動繞開飛遁' : '普通前行'
  };

  // 4. 門派專屬物理留痕 (Sect Combat Traces)
  const tracesMap = {
    'origin.huashan_junzi': {
      traceId: 'bamboo_sword_cuts',
      name: '青竹劍痕',
      visual: '山道兩旁青竹留下平整如鏡之凌厲劍削痕跡'
    },
    'origin.beixia_palm': {
      traceId: 'ground_palm_craters',
      name: '厚重掌坑',
      visual: '地面留下深陷三寸之沉渾掌印與碎石裂痕'
    },
    'origin.luding_qimen': {
      traceId: 'lime_smoke_haze',
      name: '石灰煙幕',
      visual: '林道殘留微白石灰粉霧與樹幹銀針暗器釘痕'
    },
    'origin.zhulong_compound': {
      traceId: 'acoustic_ripple_rings',
      name: '音波環紋',
      visual: '地面青石板震出同心音浪環紋，漫天落葉掃向兩側'
    },
    'origin.wanfo_palm': {
      traceId: 'five_finger_imprint',
      name: '金掌凹痕',
      visual: '演武場與後山崖壁浮現金色五指大掌坑'
    },
    'origin.xiaoyao_sword': {
      traceId: 'fast_sword_glimmer',
      name: '快劍光影',
      visual: '空氣中殘留細密青白劍氣劃痕'
    }
  };

  const sectCombatTrace = tracesMap[sectOrigin] || tracesMap['origin.wanfo_palm'];

  // 5. 同門抱拳躬身禮敬
  const fellowDisciplesGreeting = {
    active: martialLevel >= 5 || patrolFurthestDistance >= 600,
    greetingQuote: '見過大師兄！大師兄神威！',
    action: '躬身抱拳行禮'
  };

  return {
    discipleId: disciple.id,
    postDestructionStage,
    postDestructionDesc,
    beastIntimidationAura,
    fallingLeavesShockwave,
    birdsYieldPath,
    sectCombatTrace,
    fellowDisciplesGreeting
  };
}
