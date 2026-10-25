// martial-combat.mjs
// LIFE-V04 同圖基礎武學、雙脈道統演武場、Veloren 3段狀態機、切磋會話與輕功捷徑

import fs from 'node:fs';

const SECT_ORIGINS_URL = new URL('../data/sect-origins.json', import.meta.url);
const MARTIAL_ARTS_URL = new URL('../data/martial-arts-v04.json', import.meta.url);

export const SECT_ORIGINS_DATA = JSON.parse(fs.readFileSync(SECT_ORIGINS_URL, 'utf-8'));
export const MARTIAL_ARTS_DATA = JSON.parse(fs.readFileSync(MARTIAL_ARTS_URL, 'utf-8'));

export const LIFE_V04_CONSTANTS = Object.freeze({
  moves: {
    pinePushMountain: {
      artId: 'art.qingsong_palm',
      moveId: 'move.pine_push',
      buildupTicks: [48, 42, 36, 30, 24, 20],
      actionTicks: 12,
      recoverTicks: [36, 32, 28, 24, 20, 18],
      hitShape: 'cone',
      radius: [28, 30, 32, 34, 36, 38],
      angleDeg: [50, 55, 60, 65, 70, 75],
      knockback: [40, 46, 52, 58, 64, 70],
      damage: [15, 18, 22, 26, 30, 35],
    },
    staffSweepAll: {
      artId: 'art.qimei_staff',
      moveId: 'move.staff_sweep',
      buildupTicks: [54, 48, 42, 36, 30, 26],
      actionTicks: 16,
      recoverTicks: [42, 38, 32, 28, 24, 20],
      hitShape: 'arc',
      radius: [36, 38, 41, 44, 46, 48],
      angleDeg: [140, 148, 156, 164, 172, 180],
      knockback: [25, 30, 35, 40, 45, 50],
      damage: [12, 15, 19, 23, 27, 32],
      slowRate: 0.40,
    },
    swordCloudPierce: {
      artId: 'art.liuyun_sword',
      moveId: 'move.cloud_pierce',
      buildupTicks: [36, 32, 28, 24, 20, 16],
      actionTicks: 8,
      recoverTicks: [28, 25, 22, 19, 16, 14],
      hitShape: 'line',
      length: [55, 60, 66, 72, 78, 85],
      width: 16,
      knockback: [10, 15, 20, 25, 30, 35],
      damage: [18, 22, 27, 32, 38, 45],
    },
    snowStepQinggong: {
      artId: 'art.taxue_wuhen',
      speedMultiplier: [1.10, 1.15, 1.20, 1.25, 1.30, 1.35],
      shortcutUnlockLevel: 3,
      stepStonesCoords: [[810, 620], [890, 640]],
    },
  },
  sparring: {
    durationTicks: 720, // 12 seconds
    healthFloor: 0.50, // 50% health floor
    baseExp: 3,
    flawSeekerBonusExp: 3,
    cooldownTicks: 1800,
  },
  navigation: {
    bridgePathCost: 240,
    shortcutPathCost: 40,
    shortcutRequiredLevel: 3,
  },
});

/**
 * 查詢門派道統配置 (resolveSectOrigin)
 */
export function resolveSectOrigin(originOrTemplateId) {
  if (!originOrTemplateId) return null;

  // 1. 直接是 originId
  if (SECT_ORIGINS_DATA.origins[originOrTemplateId]) {
    return SECT_ORIGINS_DATA.origins[originOrTemplateId];
  }

  // 2. 透過 archetypeMap (e.g. yue_buqun -> origin.huashan_junzi)
  const mappedOriginId = SECT_ORIGINS_DATA.archetypeMap[originOrTemplateId];
  if (mappedOriginId && SECT_ORIGINS_DATA.origins[mappedOriginId]) {
    return SECT_ORIGINS_DATA.origins[mappedOriginId];
  }

  // 3. 遍歷 origins 的 archetypeId
  for (const origin of Object.values(SECT_ORIGINS_DATA.origins)) {
    if (origin.archetypeId === originOrTemplateId) {
      return origin;
    }
  }

  // 4. 自創自定回退
  return SECT_ORIGINS_DATA.origins['origin.custom_palm'];
}

/**
 * 門派演武場雙脈武學加載器 (resolveSectYardLoadout)
 * 輸出：專屬練功樁 + 2 通用築基 + 1 掌門本門開山功 + 1 同門搭檔客座功 (合計 4 招)
 */
export function resolveSectYardLoadout(founderOriginOrTemplateId, fellowTemplateId) {
  const founderOrigin = resolveSectOrigin(founderOriginOrTemplateId) || SECT_ORIGINS_DATA.origins['origin.huashan_junzi'];
  const fellowOrigin = resolveSectOrigin(fellowTemplateId);

  const trainingPostTheme = founderOrigin.trainingPostTheme;
  const trainingPostName = founderOrigin.trainingPostName;

  // 2 通用築基武學
  const universalArts = ['basic_iron_shirt', 'taxue_wuhen'];

  // 1 掌門本門開山外功
  const founderArt = founderOrigin.founderArtId;

  // 1 初始同門搭檔客座外功
  let fellowGuestArt = 'art.qingsong_palm';
  if (fellowOrigin && fellowOrigin.founderArtId) {
    fellowGuestArt = fellowOrigin.founderArtId;
  } else if (fellowTemplateId) {
    fellowGuestArt = fellowTemplateId.startsWith('art.') ? fellowTemplateId : `art.${fellowTemplateId}`;
  }

  // 組合 4 門外功雙脈清單
  const allUnlockedArts = [
    ...universalArts,
    founderArt,
    fellowGuestArt,
  ];

  return {
    trainingPostTheme,
    trainingPostName,
    universalArts,
    founderArt,
    fellowGuestArt,
    allUnlockedArts,
    founderOriginId: founderOrigin.originId,
    founderSectName: founderOrigin.sectName,
    fellowOriginId: fellowOrigin?.originId || null,
  };
}

/**
 * 數值連續內插：Lv0 初學 ➔ Lv5 大成 (interpolateMoveStats)
 */
export function interpolateMoveStats(artIdOrMove, level = 0) {
  let moveMeta = null;

  if (typeof artIdOrMove === 'string') {
    // 檢查 LIFE_V04_CONSTANTS.moves
    for (const m of Object.values(LIFE_V04_CONSTANTS.moves)) {
      if (m.artId === artIdOrMove || m.moveId === artIdOrMove) {
        moveMeta = m;
        break;
      }
    }

    // 檢查 MARTIAL_ARTS_DATA.arts
    if (!moveMeta) {
      const art = MARTIAL_ARTS_DATA.arts[artIdOrMove] || MARTIAL_ARTS_DATA.arts[`art.${artIdOrMove}`];
      if (art && art.moves) {
        moveMeta = Object.values(art.moves)[0];
      }
    }
  } else if (artIdOrMove && typeof artIdOrMove === 'object') {
    moveMeta = artIdOrMove;
  }

  if (!moveMeta) {
    // 回退預設推山掌
    moveMeta = LIFE_V04_CONSTANTS.moves.pinePushMountain;
  }

  const clampedLv = Math.max(0, Math.min(5, level));
  const floorLv = Math.floor(clampedLv);
  const ceilLv = Math.min(5, Math.ceil(clampedLv));
  const t = clampedLv - floorLv;

  const lerpVal = (arr) => {
    if (!Array.isArray(arr)) return arr;
    if (floorLv === ceilLv) return arr[floorLv];
    const v0 = arr[floorLv];
    const v1 = arr[ceilLv];
    return +(v0 + (v1 - v0) * t).toFixed(2);
  };

  return {
    artId: moveMeta.artId,
    moveId: moveMeta.moveId,
    name: moveMeta.name,
    level: clampedLv,
    hitShape: moveMeta.hitShape,
    buildupTicks: Array.isArray(moveMeta.buildupTicks) ? (t === 0 ? moveMeta.buildupTicks[floorLv] : Math.round(lerpVal(moveMeta.buildupTicks))) : moveMeta.buildupTicks,
    actionTicks: moveMeta.actionTicks,
    recoverTicks: Array.isArray(moveMeta.recoverTicks) ? (t === 0 ? moveMeta.recoverTicks[floorLv] : Math.round(lerpVal(moveMeta.recoverTicks))) : moveMeta.recoverTicks,
    radius: lerpVal(moveMeta.radius),
    angleDeg: lerpVal(moveMeta.angleDeg),
    length: lerpVal(moveMeta.length),
    width: moveMeta.width,
    knockback: lerpVal(moveMeta.knockback),
    damage: lerpVal(moveMeta.damage),
    slowRate: moveMeta.slowRate,
    flawInterruptPower: moveMeta.flawInterruptPower,
    blindDurationTicks: moveMeta.blindDurationTicks,
  };
}

/**
 * 幾何判定檢驗函式 (checkGeometricHit)
 * 支援 cone/sector (扇形), arc (圓弧), line (直線), circle (圓形)
 */
export function checkGeometricHit({
  shape = 'cone',
  origin = [0, 0],
  facingDeg = 0,
  targetPos = [0, 0],
  radius = 35,
  angleDeg = 60,
  length = 60,
  width = 16,
  targetRadius = 10,
}) {
  const dx = targetPos[0] - origin[0];
  const dy = targetPos[1] - origin[1];
  const dist = Math.hypot(dx, dy);

  if (shape === 'circle') {
    return dist <= radius + targetRadius;
  }

  if (shape === 'line') {
    // 直線長度沿著 facingDeg 方向投影
    const rad = (facingDeg * Math.PI) / 180;
    const forwardX = Math.cos(rad);
    const forwardY = Math.sin(rad);
    const sideX = -forwardY;
    const sideY = forwardX;

    const projLong = dx * forwardX + dy * forwardY;
    const projLat = Math.abs(dx * sideX + dy * sideY);

    const withinLength = projLong >= -targetRadius && projLong <= length + targetRadius;
    const withinWidth = projLat <= width / 2 + targetRadius;
    return withinLength && withinWidth;
  }

  if (shape === 'cone' || shape === 'sector' || shape === 'arc') {
    if (dist > radius + targetRadius) return false;
    if (dist === 0) return true;

    // 計算目標相對角度與面對方向差
    let targetAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    let diff = Math.abs(targetAngleDeg - facingDeg) % 360;
    if (diff > 180) diff = 360 - diff;

    return diff <= angleDeg / 2;
  }

  return dist <= radius + targetRadius;
}

/**
 * Veloren 式三段招式狀態機 (MartialCombatEngine)
 */
export class MartialCombatEngine {
  constructor() {
    this.activeActors = new Map();
  }

  static startMove(actor, artIdOrMove, level = 0, facingDeg = 0, pos = [0, 0]) {
    const stats = interpolateMoveStats(artIdOrMove, level);

    const moveState = {
      artId: stats.artId,
      moveId: stats.moveId,
      name: stats.name,
      level,
      stats,
      facingDeg,
      pos: [...pos],
      phase: 'buildup', // 'buildup' -> 'action' -> 'recover' -> 'completed' / 'interrupted'
      phaseElapsedTicks: 0,
      phaseTotalTicks: stats.buildupTicks,
      buildupTicks: stats.buildupTicks,
      actionTicks: stats.actionTicks,
      recoverTicks: stats.recoverTicks,
      isInterrupted: false,
      actionTriggered: false,
      staggerTicks: 0,
    };

    actor.currentMove = moveState;
    actor.isStaggered = false;
    return moveState;
  }

  /**
   * 招式 Buildup 階段被打斷反例 (counter_buildup_interruption)
   * 角色在 Buildup 起手前搖受到強烈擊退破招，強制中斷，Action 絕不觸發，轉入硬直
   */
  static interruptMove(actor, reason = 'knockback') {
    const move = actor?.currentMove;
    if (!move) return { ok: false, reason: 'NO_ACTIVE_MOVE' };

    if (move.phase === 'buildup') {
      move.isInterrupted = true;
      move.phase = 'interrupted';
      move.actionTriggered = false; // 嚴格保證 Action 判定不被觸發！
      actor.isStaggered = true;
      actor.staggerTicks = 30; // 進入受擊硬直
      return {
        ok: true,
        interrupted: true,
        phase: 'interrupted',
        reason,
        actionTriggered: false,
      };
    }

    // 若非 buildup，標記中斷
    move.isInterrupted = true;
    move.phase = 'interrupted';
    actor.isStaggered = true;
    return {
      ok: true,
      interrupted: true,
      phase: 'interrupted',
      reason,
      actionTriggered: move.actionTriggered,
    };
  }

  static tickMove(actor, targets = [], callbacks = {}) {
    const move = actor?.currentMove;
    if (!move) return { phase: 'idle' };

    // 若處於硬直或被打斷狀態
    if (move.isInterrupted || actor.isStaggered) {
      if (actor.staggerTicks > 0) {
        actor.staggerTicks--;
      } else {
        actor.isStaggered = false;
        actor.currentMove = null;
      }
      return { phase: 'interrupted', actionTriggered: false, isStaggered: actor.isStaggered };
    }

    move.phaseElapsedTicks++;

    // 1. Buildup 階段
    if (move.phase === 'buildup') {
      if (move.phaseElapsedTicks >= move.stats.buildupTicks) {
        move.phase = 'action';
        move.phaseElapsedTicks = 1;
        move.phaseTotalTicks = move.stats.actionTicks;
      } else {
        return { phase: 'buildup', elapsed: move.phaseElapsedTicks, total: move.stats.buildupTicks };
      }
    }

    // 2. Action 階段 (幾何判定生效)
    if (move.phase === 'action') {
      if (!move.actionTriggered) {
        move.actionTriggered = true;

        // 幾何命中檢定
        const hits = [];
        for (const target of targets) {
          const hit = checkGeometricHit({
            shape: move.stats.hitShape,
            origin: move.pos,
            facingDeg: move.facingDeg,
            targetPos: target.pos || [0, 0],
            radius: move.stats.radius,
            angleDeg: move.stats.angleDeg,
            length: move.stats.length,
            width: move.stats.width,
            targetRadius: target.radius || 10,
          });

          if (hit) {
            hits.push(target);
            if (callbacks.onHit) {
              callbacks.onHit(target, move.stats);
            }
          }
        }
        move.hits = hits;
      }

      if (move.phaseElapsedTicks >= move.stats.actionTicks) {
        move.phase = 'recover';
        move.phaseElapsedTicks = 0;
        move.phaseTotalTicks = move.stats.recoverTicks;
      }
      return { phase: 'action', elapsed: move.phaseElapsedTicks, total: move.stats.actionTicks, hits: move.hits };
    }

    // 3. Recover 階段 (收勢硬直)
    if (move.phase === 'recover') {
      if (move.phaseElapsedTicks >= move.stats.recoverTicks) {
        move.phase = 'completed';

        // 結算四維根基淬鍊入帳 (臂力、腰腿、身法、內息)
        MartialCombatEngine.awardFoundationXp(actor, move.stats.artId);

        actor.currentMove = null;
        return { phase: 'completed', ok: true };
      }
      return { phase: 'recover', elapsed: move.phaseElapsedTicks, total: move.stats.recoverTicks };
    }

    return { phase: move.phase };
  }

  /**
   * 結算四維根基淬鍊入帳
   */
  static awardFoundationXp(actor, artId) {
    if (!actor) return;
    actor.foundation = actor.foundation || {};
    actor.foundation.strength = actor.foundation.strength || 0;
    actor.foundation.legwork = actor.foundation.legwork || 0;
    actor.foundation.agility = actor.foundation.agility || 0;
    actor.foundation.qi = actor.foundation.qi || 0;

    const art = MARTIAL_ARTS_DATA.arts[artId] || MARTIAL_ARTS_DATA.arts[`art.${artId}`];
    const governingStat = art?.governingStat || 'strength';

    switch (governingStat) {
      case 'strength':
        actor.foundation.strength += 2;
        break;
      case 'legwork':
        actor.foundation.legwork += 2;
        break;
      case 'agility':
        actor.foundation.agility += 2;
        break;
      case 'qi':
        actor.foundation.qi += 2;
        break;
      default:
        actor.foundation.strength += 1;
    }
  }
}

/**
 * 同門點到為止切磋會話管理 (SparringSession)
 */
export class SparringSession {
  constructor({
    sessionId = `spar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    challenger,
    opponent,
    location = [940, 520],
  }) {
    this.sessionId = sessionId;
    this.challenger = challenger;
    this.opponent = opponent;
    this.location = [...location];
    this.stage = 'active'; // 'approaching' -> 'active' -> 'saluting' -> 'completed'
    this.elapsedTicks = 0;
    this.maxTicks = LIFE_V04_CONSTANTS.sparring.durationTicks; // 720 ticks (12s)
    this.healthFloorPercent = LIFE_V04_CONSTANTS.sparring.healthFloor; // 50%
    this.scores = {
      challengerHits: 0,
      opponentHits: 0,
    };
    this.crossLineageProgress = 0;
    this.expAwarded = null;

    // 儲存切磋前血量基準
    if (this.challenger) {
      this.challenger.maxHp = this.challenger.maxHp || 100;
      this.challenger.hp = this.challenger.hp ?? this.challenger.maxHp;
    }
    if (this.opponent) {
      this.opponent.maxHp = this.opponent.maxHp || 100;
      this.opponent.hp = this.opponent.hp ?? this.opponent.maxHp;
    }
  }

  /**
   * 切磋血量底線不傷真元反例 (counter_sparring_no_injury)
   * 角色血量強制降至 50% 以下時立即收招抱拳，真實血量絕不可低於 50%
   */
  checkHealthFloors() {
    let triggered = false;

    for (const combatant of [this.challenger, this.opponent]) {
      if (!combatant) continue;
      const maxHp = combatant.maxHp || 100;
      const minHp = maxHp * this.healthFloorPercent;

      if (combatant.hp < minHp) {
        // 強制回彈 clamp 至 50%，不傷真元
        combatant.hp = minHp;
        triggered = true;
      }
    }

    if (triggered && this.stage === 'active') {
      this.stage = 'saluting';
      this.resolveCompletion();
    }

    return triggered;
  }

  runTick(deltaTicks = 1) {
    if (this.stage !== 'active') return this.stage;

    this.elapsedTicks += deltaTicks;

    // 檢核血量底線
    if (this.checkHealthFloors()) {
      return this.stage;
    }

    // 時間結束 (720 ticks / 12s)
    if (this.elapsedTicks >= this.maxTicks) {
      this.stage = 'saluting';
      this.resolveCompletion();
    }

    return this.stage;
  }

  resolveCompletion() {
    this.stage = 'saluting';

    // 結算切磋經驗
    const baseExp = LIFE_V04_CONSTANTS.sparring.baseExp; // +3

    const calcExp = (actor) => {
      let exp = baseExp;
      // 令狐沖等拆招流 (perk.flaw_seeker) 獲得雙倍經驗 (+3 + 3 = +6)
      if (
        actor?.traits?.includes('perk.flaw_seeker') ||
        actor?.innateStats?.innatePerks?.includes('perk.flaw_seeker') ||
        actor?.templateId === 'linghu_chong'
      ) {
        exp += LIFE_V04_CONSTANTS.sparring.flawSeekerBonusExp;
      }
      return exp;
    };

    const challengerExp = calcExp(this.challenger);
    const opponentExp = calcExp(this.opponent);

    if (this.challenger) {
      this.challenger.martialExp = (this.challenger.martialExp || 0) + challengerExp;
    }
    if (this.opponent) {
      this.opponent.martialExp = (this.opponent.martialExp || 0) + opponentExp;
    }

    // 雙脈道統兼修進度
    if (this.challenger?.sectOriginId !== this.opponent?.sectOriginId) {
      this.crossLineageProgress += 1;
      if (this.challenger) this.challenger.crossLineageProgress = (this.challenger.crossLineageProgress || 0) + 1;
      if (this.opponent) this.opponent.crossLineageProgress = (this.opponent.crossLineageProgress || 0) + 1;
    }

    this.expAwarded = {
      challenger: challengerExp,
      opponent: opponentExp,
      crossLineageProgress: this.crossLineageProgress,
    };

    return this.expAwarded;
  }
}

/**
 * 輕功溪石捷徑導航連通器 (resolveCreekPath)
 * 未達輕功等級溪石捷徑阻擋反例 (counter_qinggong_shortcut_level_lock)
 */
export function resolveCreekPath(startNode = 'yard', endNode = 'tan_south', qinggongLevel = 0) {
  const reqLevel = LIFE_V04_CONSTANTS.navigation.shortcutRequiredLevel; // Lv3

  if (qinggongLevel < reqLevel) {
    // 未達 Lv3：必須繞行東南溪橋 (路長 240 單位)
    return {
      usedShortcut: false,
      qinggongLevel,
      path: [startNode, 'path.east_slope', 'creek_bridge', 'path.creek_south', endNode],
      totalCost: LIFE_V04_CONSTANTS.navigation.bridgePathCost, // 240
      description: '輕功未達 Lv3，尋路繞行溪橋',
    };
  }

  // 達到 Lv3+：飛身躍過溪石渡口 (step_stones，僅需 40 單位)
  return {
    usedShortcut: true,
    qinggongLevel,
    path: [startNode, 'step_stones', endNode],
    totalCost: LIFE_V04_CONSTANTS.navigation.shortcutPathCost, // 40
    description: '踏雪無痕 Lv3+ 飛身踏石渡溪',
  };
}
