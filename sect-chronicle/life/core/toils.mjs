// toils.mjs
// 通用五步原子工序引擎 (reserve -> goto -> interact -> transfer -> complete) 與異常清理鉤子 onCleanup

export const STEP_MS = 1000 / 60;

export function calculateSpeed(level = 1, isLoaded = false) {
  const lv = Math.max(1, level);
  if (isLoaded) {
    return Math.min(64, 40 * (1 + 0.15 * (lv - 1)));
  }
  return Math.min(84, 60 * (1 + 0.12 * (lv - 1)));
}

export function distance2D(p1, p2) {
  if (!p1 || !p2) return 0;
  const dx = (p2[0] ?? p2.x ?? 0) - (p1[0] ?? p1.x ?? 0);
  const dy = (p2[1] ?? p2.y ?? 0) - (p1[1] ?? p1.y ?? 0);
  return Math.hypot(dx, dy);
}

export class ToilPipeline {
  constructor(broker) {
    this.broker = broker;
  }

  // 初始化或啟動一項新工序
  startToil(world, actor, toilDef) {
    const context = {
      toilId: toilDef.toilId,
      step: 'reserve',
      stationId: toilDef.stationId,
      stationPos: toilDef.stationPos || [962, 512],
      targetPos: toilDef.targetPos || toilDef.stationPos || [962, 512],
      sourceItem: toilDef.sourceItem || null,
      amount: toilDef.amount || 1,
      targetFacilityId: toilDef.targetFacilityId || null,
      targetStagingPileKey: toilDef.targetStagingPileKey || toilDef.sourceItem || null,
      durationTicks: toilDef.durationTicks || Math.ceil((toilDef.durationMs || 6000) / STEP_MS),
      progressTicks: 0,
      energyPerSec: toilDef.energyPerSec || 1,
      skillKey: toilDef.skillKey || 'physique',
      phase: 'reserve',
      u: 0,
      walkingTicks: 0,
      totalWalkingTicks: 1,
    };

    actor.decision.currentToil = context;
    return this.stepToil(world, actor);
  }

  // 每 Tick 推進工序狀態機
  stepToil(world, actor) {
    const ctx = actor.decision.currentToil;
    if (!ctx) return { ok: false, reason: 'NO_ACTIVE_TOIL' };

    switch (ctx.step) {
      case 'reserve': {
        // 1. 預約站位鎖
        if (ctx.stationId) {
          const resStation = this.broker.reserveStation(ctx.stationId, actor.id);
          if (!resStation.ok) {
            this.onCleanup(world, actor, 'STATION_BUSY');
            return { ok: false, reason: 'STATION_BUSY' };
          }
        }

        // 2. 預約物資 (若需要從既有庫存領取)
        if (ctx.sourceItem && ctx.requireStock) {
          const resMat = this.broker.reserveMaterial(
            ctx.sourceItem,
            ctx.amount,
            actor.id,
            () => world.inventory[ctx.sourceItem] || 0
          );
          if (!resMat.ok) {
            this.onCleanup(world, actor, 'LACK_OF_MATERIAL');
            return { ok: false, reason: 'LACK_OF_MATERIAL' };
          }
        }

        // 3. 預約目的地容量 (若有備料樁或倉儲上限)
        if (ctx.targetFacilityId && ctx.targetStagingPileKey) {
          const site = world.facilities[ctx.targetFacilityId];
          if (site && site.stagingPile && site.stagingPile[ctx.targetStagingPileKey]) {
            const pile = site.stagingPile[ctx.targetStagingPileKey];
            const remaining = Math.max(0, pile.required - pile.current);
            const resDest = this.broker.reserveDestination(
              `${ctx.targetFacilityId}.${ctx.targetStagingPileKey}`,
              ctx.amount,
              actor.id,
              remaining
            );
            if (!resDest.ok) {
              this.onCleanup(world, actor, 'DESTINATION_FULL');
              return { ok: false, reason: 'DESTINATION_FULL' };
            }
            pile.reservedInFlight = (pile.reservedInFlight || 0) + ctx.amount;
          }
        }

        // 預約成功，計算路程進入 goto
        ctx.step = 'goto';
        const actorPos = actor.pos || [962, 512];
        const dist = distance2D(actorPos, ctx.stationPos);
        const speed = calculateSpeed(actor.skills?.legStrength?.level || 1, actor.carrying?.amount > 0);
        ctx.walkingTicks = 0;
        ctx.totalWalkingTicks = Math.max(1, Math.ceil((dist / speed) * (1000 / STEP_MS)));
        return { ok: true, step: 'goto' };
      }

      case 'goto': {
        ctx.walkingTicks += 1;
        ctx.u = Math.min(1.0, ctx.walkingTicks / ctx.totalWalkingTicks);
        if (actor.pos && ctx.stationPos) {
          const curX = actor.pos[0] ?? actor.pos.x ?? 962;
          const curY = actor.pos[1] ?? actor.pos.y ?? 512;
          const targetX = ctx.stationPos[0] ?? ctx.stationPos.x ?? 962;
          const targetY = ctx.stationPos[1] ?? ctx.stationPos.y ?? 512;
          actor.pos = [
            curX + (targetX - curX) * (1 / (ctx.totalWalkingTicks - ctx.walkingTicks + 1)),
            curY + (targetY - curY) * (1 / (ctx.totalWalkingTicks - ctx.walkingTicks + 1)),
          ];
        }

        if (ctx.walkingTicks >= ctx.totalWalkingTicks) {
          ctx.step = 'interact';
          ctx.progressTicks = 0;
          return { ok: true, step: 'interact' };
        }
        return { ok: true, step: 'goto', u: ctx.u };
      }

      case 'interact': {
        // 扣除精力
        const energyCostPerTick = ctx.energyPerSec * (STEP_MS / 1000);
        actor.needs.energy.current = Math.max(0, actor.needs.energy.current - energyCostPerTick);

        // 生理疲倦中斷保護
        if (actor.needs.energy.current <= (actor.needs.energy.restAt || 30)) {
          this.onCleanup(world, actor, 'TIRED_INTERRUPT');
          return { ok: false, reason: 'TIRED_INTERRUPT' };
        }

        ctx.progressTicks += 1;
        // 施工站位若對應建築工地，同步記錄累計工時
        if (ctx.targetFacilityId) {
          const site = world.facilities[ctx.targetFacilityId];
          if (site && site.workforce) {
            site.workforce.progressTicks = (site.workforce.progressTicks || 0) + 1;
          }
        }

        if (ctx.progressTicks >= ctx.durationTicks) {
          ctx.step = 'transfer';
          return { ok: true, step: 'transfer' };
        }
        return { ok: true, step: 'interact', progress: ctx.progressTicks / ctx.durationTicks };
      }

      case 'transfer': {
        // 物資所有權移轉 (守恆保證)
        if (ctx.sourceItem && !ctx.targetFacilityId) {
          // 採集完成：物資產出至 actor 手中
          actor.carrying = {
            item: ctx.sourceItem,
            amount: ctx.amount,
          };
        } else if (ctx.targetFacilityId && ctx.targetStagingPileKey) {
          // 搬運至工地備料樁交付
          const site = world.facilities[ctx.targetFacilityId];
          if (site && site.stagingPile && site.stagingPile[ctx.targetStagingPileKey]) {
            const pile = site.stagingPile[ctx.targetStagingPileKey];
            pile.current = Math.min(pile.required, pile.current + ctx.amount);
            pile.reservedInFlight = Math.max(0, (pile.reservedInFlight || 0) - ctx.amount);
          }
          if (actor.carrying && actor.carrying.item === ctx.targetStagingPileKey) {
            actor.carrying = { item: null, amount: 0 };
          }
        }

        ctx.step = 'complete';
        return { ok: true, step: 'complete' };
      }

      case 'complete': {
        // 技能經驗提升
        if (actor.skills) {
          if (actor.skills.legStrength) actor.skills.legStrength.exp += 1;
          if (ctx.skillKey && actor.skills[ctx.skillKey]) {
            actor.skills[ctx.skillKey].exp += 1;
          }
        }

        // 釋放站位鎖與預約
        this.broker.clearActor(actor.id);
        actor.decision.currentToil = null;
        return { ok: true, step: 'complete', completed: true };
      }

      default:
        return { ok: false, reason: 'UNKNOWN_STEP' };
    }
  }

  // 異常清理鉤子 onCleanup
  onCleanup(world, actor, reason = 'MANUAL_INTERRUPT') {
    const ctx = actor.decision?.currentToil;

    // 1. 站位鎖釋放
    this.broker.clearActor(actor.id);

    // 2. 在途物資安全退回與守恆
    if (actor.carrying && actor.carrying.amount > 0) {
      const item = actor.carrying.item;
      const amt = actor.carrying.amount;

      // 若手上有材料，在安全返程中歸還至庫存
      if (item && world.inventory) {
        world.inventory[item] = (world.inventory[item] || 0) + amt;
      }
      // 若曾預約過工地備料容量，將在途 reservedInFlight 扣減還原
      if (ctx?.targetFacilityId && ctx?.targetStagingPileKey) {
        const site = world.facilities[ctx.targetFacilityId];
        if (site?.stagingPile?.[ctx.targetStagingPileKey]) {
          const pile = site.stagingPile[ctx.targetStagingPileKey];
          pile.reservedInFlight = Math.max(0, (pile.reservedInFlight || 0) - amt);
        }
      }
      actor.carrying = { item: null, amount: 0 };
    }

    // 3. 施工已累積之 progressTicks 絕對保留 (不重置)
    // （在 stepToil 中 progressTicks 已經直接記錄在 site.workforce.progressTicks 上，此處不重設）

    actor.decision.currentToil = null;
    return { ok: true, reason };
  }
}
