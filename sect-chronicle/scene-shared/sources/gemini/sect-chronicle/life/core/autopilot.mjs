// autopilot.mjs
// 零手動掌門自走引擎 (SectLeaderAutopilot)、敲鐘招工與床位認領守則

import { LIFE_V02_CONSTANTS, getShichenFromTick } from './smart-objects.mjs';
import { evaluateDestinyMilestones } from './destiny-engine.mjs';

const MATERIAL_NAMES = {
  timber: '原木',
  stone: '青石',
  thatch: '茅草',
};

const MATERIAL_UNITS = {
  timber: '捆',
  stone: '塊',
  thatch: '束',
};

export class SectLeaderAutopilot {
  constructor(toilPipeline, broker) {
    this.toilPipeline = toilPipeline;
    this.broker = broker;
  }

  // 1. 敲響山下招工鐘 (Artisan Bell)
  ringArtisanBell(world, actor, facilityId) {
    const site = world.facilities?.[facilityId];
    if (!site) return { ok: false, reason: '找不到擴建工地' };

    const pile = site.stagingPile;
    if (!pile) return { ok: false, reason: '工地缺少備料樁' };

    // 檢核材料是否 100% 備齊 (反例 4 防呆)
    for (const matKey of ['timber', 'stone', 'thatch']) {
      const required = pile[matKey]?.required || 0;
      const current = pile[matKey]?.current || 0;
      if (current < required) {
        const shortfall = required - current;
        const name = MATERIAL_NAMES[matKey] || matKey;
        const unit = MATERIAL_UNITS[matKey] || '份';
        return {
          ok: false,
          reason: `建材尚未備齊：尚缺${name} ${shortfall} ${unit}，無法招工`,
        };
      }
    }

    const isSmoothTalker = actor.innateStats?.innatePerks?.includes('perk.smooth_talker')
      || actor.id === 'disc.preset_wei'
      || actor.name === '韋小寶';

    // 消耗費用判定 (韋小寶 0 成本反例 5)
    if (!isSmoothTalker) {
      if ((world.inventory?.tea || 0) < 1 && (world.teaVat || 0) < 1) {
        // 破道館迎客茶保底或備茶，避免死鎖
        if (!world.inventory) world.inventory = {};
        world.inventory.tea = 1;
      }
      if (world.inventory?.tea > 0) {
        world.inventory.tea -= 1;
      } else if (world.teaVat > 0) {
        world.teaVat -= 1;
      }
    }

    // 啟動木匠進場施工
    site.phase = 'building';
    site.workforce = site.workforce || {};
    site.workforce.mode = 'hire_artisans';
    site.workforce.hiredArtisan = {
      id: 'npc.carpenter_lin',
      name: '山下林木匠',
      status: 'working',
    };
    site.workforce.progressTicks = site.workforce.progressTicks || 0;
    site.workforce.totalTicks = facilityId === 'fac.hall'
      ? LIFE_V02_CONSTANTS.blueprints.hallRoofRepair.workTicks
      : LIFE_V02_CONSTANTS.blueprints.dormExpansion.workTicks;
    site.workforce.activeWorkerId = 'npc.carpenter_lin';
    site.workforce.bonusTimberOnComplete = isSmoothTalker ? 1 : 0;

    const speechBubble = isSmoothTalker
      ? '掌門我憑三寸不爛之舌，哄得山下木匠連夜來效力，還倒送一捆上好原木！'
      : '招工鐘響起，山下木匠進山施工修繕！';

    world.lastSpeechBubble = {
      actorId: actor.id,
      text: speechBubble,
      tick: world.tick || 0,
    };

    return { ok: true, isSmoothTalker, speechBubble };
  }

  // 檢查包租婆水缸催水獅吼 (反例 6)
  checkLandladySupervision(world, actor) {
    const isLandlady = actor?.templateId === 'landlady'
      || actor?.id === 'disc.preset_landlady'
      || actor?.name === '包租婆'
      || actor?.traits?.includes('perk.lion_roar_supervise')
      || actor?.innateStats?.innatePerks?.includes('perk.lion_roar_supervise');

    if (!isLandlady) {
      return { triggered: false, reason: 'NOT_LANDLADY' };
    }

    const vatCurrent = world.vat ?? world.waterVat ?? (world.inventory?.water ?? 0);
    const vatCapacity = world.vatCapacity ?? 8;
    const waterRatio = vatCapacity > 0 ? (vatCurrent / vatCapacity) : 1.0;

    // 水缸存量 < 50% 精準觸發 (反例 6: 51% 不發動, 49% 精準觸發)
    const threshold = LIFE_V02_CONSTANTS.supervision?.waterThreshold ?? 0.50;
    if (waterRatio >= threshold) {
      world.supervisionActive = false;
      return { triggered: false, waterRatio, reason: 'WATER_ABOVE_THRESHOLD' };
    }

    world.supervisionActive = true;
    const speechBubble = '包租婆～怎麼沒水了呢？！';
    world.lastSpeechBubble = {
      actorId: actor.id,
      text: speechBubble,
      tick: world.tick || 0,
    };

    const baseMultiplier = 1.0 + (LIFE_V02_CONSTANTS.supervision?.baseSpeedBonus ?? 0.50); // 1.50
    const slackerMultiplier = 1.0 + (LIFE_V02_CONSTANTS.supervision?.slackerDuoSpeedBonus ?? 0.65); // 1.65

    return {
      triggered: true,
      waterRatio,
      baseMultiplier,
      slackerMultiplier,
      speechBubble,
    };
  }

  // 計算指定弟子的移速倍率 (含催水獅吼與搭檔加成)
  getSpeedMultiplierFor(world, disciple) {
    if (!world?.supervisionActive) {
      return 1.0;
    }
    const isSlacker = disciple?.templateId === 'ah_sing'
      || disciple?.templateId === 'wei_xiaobao'
      || disciple?.id === 'disc.preset_sing'
      || disciple?.id === 'disc.preset_wei'
      || disciple?.name === '阿星'
      || disciple?.name === '韋小寶';

    return isSlacker
      ? 1.0 + (LIFE_V02_CONSTANTS.supervision?.slackerDuoSpeedBonus ?? 0.65)
      : 1.0 + (LIFE_V02_CONSTANTS.supervision?.baseSpeedBonus ?? 0.50);
  }

  // 2. 結算建築完工
  completeConstruction(world, facilityId, actor = null) {
    const site = world.facilities?.[facilityId];
    if (!site) return;

    site.phase = 'completed';
    site.stage = 'completed';
    if (site.workforce) {
      if (site.workforce.bonusTimberOnComplete > 0) {
        if (!world.inventory) world.inventory = {};
        world.inventory.timber = (world.inventory.timber || 0) + site.workforce.bonusTimberOnComplete;
      }
      site.workforce.hiredArtisan = null;
      site.workforce.activeWorkerId = null;
    }

    // 若寢舍完工，初始化床位
    if (facilityId === 'fac.dorm.a') {
      world.housing = world.housing || {};
      if (!world.housing.beds || world.housing.beds.length === 0) {
        world.housing.beds = [
          { id: 'bed-1', owner: null, occupant: null },
          { id: 'bed-2', owner: null, occupant: null },
        ];
      }
    }

    // 評估宿命樹進階
    if (actor) {
      evaluateDestinyMilestones(world, actor);
    }
    if (world.disciples) {
      for (const d of Object.values(world.disciples)) {
        evaluateDestinyMilestones(world, d);
      }
    }
  }

  // 3. 認領床位與作息休息 (反例 6 尊重床主規則)
  claimAndUseBed(world, actor, preferredBedId = null) {
    const beds = world.housing?.beds || [];
    if (beds.length === 0) return { ok: false, reason: 'NO_BEDS_AVAILABLE' };

    // 1. 若自身已有已認領之床位，且該床無他人躺臥
    let myBed = beds.find((b) => b.owner === actor.id);
    if (myBed) {
      if (myBed.occupant && myBed.occupant !== actor.id) {
        // 自己的床正被占用，尋找其他閒置且無主的床
        myBed = null;
      }
    }

    // 2. 若無自身床位，依順序尋找無主且無占用的床
    if (!myBed) {
      if (preferredBedId) {
        const pref = beds.find((b) => b.id === preferredBedId);
        if (pref && !pref.owner && !pref.occupant) {
          myBed = pref;
        }
      }
      if (!myBed) {
        myBed = beds.find((b) => !b.owner && !b.occupant);
      }
    }

    // 3. 防呆反例 6：若兩張床都有主人或都被占用，絕不把正在躺臥者擠下床！
    if (!myBed) {
      return { ok: false, reason: 'ALL_BEDS_OCCUPIED_OR_OWNED' };
    }

    if (!myBed.owner) {
      myBed.owner = actor.id;
    }
    myBed.occupant = actor.id;
    actor.housing = actor.housing || {};
    actor.housing.roomId = 'fac.dorm.a';
    actor.housing.bedId = myBed.id;

    return { ok: true, bedId: myBed.id };
  }

  // 4. 掌門自走單步決策 (Autopilot Tick Step)
  step(world, actor) {
    if (!actor.persona?.autopilot?.enabled) {
      return;
    }

    // 包租婆獅吼催水主動檢查
    if (actor.traits?.includes('perk.lion_roar_supervise') || actor.name === '包租婆' || actor.templateId === 'landlady') {
      this.checkLandladySupervision(world, actor);
    }

    // 若有進行中的 Toil，繼續步進
    if (actor.decision.currentToil) {
      const res = this.toilPipeline.stepToil(world, actor);
      if (!res.ok) {
        // 中斷自理
        if (actor.needs.energy.current <= (actor.needs.energy.restAt || 30)) {
          this.handleResting(world, actor);
        }
      }
      return;
    }

    // 若正處於休息自理中 (tier 2)，在床上或石凳恢復精力至 backAt (80)
    if (actor.decision.tier === 2) {
      actor.needs.energy.current = Math.min(
        actor.needs.energy.max || 100,
        actor.needs.energy.current + (5 * (1 / 60))
      );
      const placeName = actor.housing?.bedId || '院中石凳';
      actor.decision.explain = {
        doing: `在 ${placeName} 安睡恢復中`,
        reason: '恢復精力（+5/s）',
        nextPlan: '精力達 80 後晨練或勞作',
      };
      if (actor.needs.energy.current >= (actor.needs.energy.backAt || 80)) {
        if (actor.housing?.bedId) {
          const bed = world.housing?.beds?.find((b) => b.id === actor.housing.bedId);
          if (bed && bed.occupant === actor.id) {
            bed.occupant = null;
          }
        }
        actor.decision.tier = 3;
      }
      return;
    }

    // 生理精力不足自理 (觸發進入 tier 2 休息)
    if (actor.needs.energy.current <= (actor.needs.energy.restAt || 30)) {
      this.handleResting(world, actor);
      return;
    }

    const shichen = getShichenFromTick(world.tick || 0);

    // 依作息偏好：亥/子/丑/寅時若寢舍可用則入室安睡
    if (shichen.preferredActivity === 'sleep' && world.facilities?.['fac.dorm.a']?.phase === 'completed') {
      const bedRes = this.claimAndUseBed(world, actor);
      if (bedRes.ok) {
        actor.decision.tier = 2;
        actor.decision.explain = {
          doing: `夜深就寢，認領並臥於 ${bedRes.bedId}`,
          reason: '時辰入夜，寢舍已落成安睡',
          nextPlan: '晨起卯時前往外功場練拳',
        };
        return;
      }
    }

    // 卯時演武晨練
    if (shichen.preferredActivity === 'train' && (actor.unlockedArts?.length || 0) > 0) {
      actor.decision.explain = {
        doing: `站立木人樁演練 ${actor.unlockedArts[0]}`,
        reason: '卯時晨起，勤練本門武學',
        nextPlan: '辰時開始山門備料修繕',
      };
      // 晨練獲得微量體魄/腳力經驗
      if (world.tick % 60 === 0) {
        actor.skills.physique.exp += 1;
      }
      return;
    }

    // 備料擴建閉環決策
    this.decideConstructionLoop(world, actor);
  }

  // 休息自理
  handleResting(world, actor) {
    actor.decision.tier = 2;
    if (world.facilities?.['fac.dorm.a']?.phase === 'completed') {
      const res = this.claimAndUseBed(world, actor);
      if (res.ok) {
        actor.decision.explain = {
          doing: `走入寢舍躺臥 ${res.bedId}`,
          reason: '精力不足 (≤30)，自理入寢安睡',
          nextPlan: '精力恢復至 80 後繼續掌門工序',
        };
        return;
      }
    }

    // 備案：石凳或就地歇息
    actor.needs.energy.current = Math.min(
      actor.needs.energy.max || 100,
      actor.needs.energy.current + (5 * (1 / 60))
    );
    actor.decision.explain = {
      doing: '在院中石凳歇息',
      reason: '精力不足 (≤30)，靜坐調息',
      nextPlan: '精力恢復至 80 後開工',
    };
    if (actor.needs.energy.current >= (actor.needs.energy.backAt || 80)) {
      actor.decision.tier = 3;
    }
  }

  // 擴建備料閉環決策
  decideConstructionLoop(world, actor) {
    const hall = world.facilities?.['fac.hall'];
    const dorm = world.facilities?.['fac.dorm.a'];

    // 1. 若手上有物資，優先搬運往工地備料樁交付
    if (actor.carrying?.amount > 0) {
      const item = actor.carrying.item;
      let targetFac = null;
      if (hall && hall.phase !== 'completed') {
        targetFac = 'fac.hall';
      } else if (dorm && dorm.phase !== 'completed') {
        targetFac = 'fac.dorm.a';
      }

      if (targetFac) {
        const facName = targetFac === 'fac.hall' ? '大廳屋頂工地' : '雙人寢舍工地';
        actor.decision.explain = {
          doing: `搬運【${MATERIAL_NAMES[item] || item}】往${facName}`,
          reason: 'Autopilot 備料擴建親手搬運交付',
          nextPlan: '交付建材入備料樁',
        };
        const destPos = targetFac === 'fac.hall' ? [870, 205] : [1105, 715];
        this.toilPipeline.startToil(world, actor, {
          toilId: `toil.deliver_${item}`,
          stationId: `${targetFac}.staging`,
          stationPos: destPos,
          targetFacilityId: targetFac,
          targetStagingPileKey: item,
          durationMs: 1000,
          energyPerSec: 1,
          skillKey: 'legStrength',
        });
        return;
      }
    }

    // 2. 確定目前工程階段 (大廳優先，其次寢舍)
    let currentFacId = null;
    let currentFac = null;
    if (hall && hall.phase !== 'completed') {
      currentFacId = 'fac.hall';
      currentFac = hall;
    } else if (dorm && dorm.phase !== 'completed') {
      currentFacId = 'fac.dorm.a';
      currentFac = dorm;
    }

    if (!currentFacId) {
      // 兩者皆完工，自由巡山或練拳
      actor.decision.explain = {
        doing: '巡視已擴建之山門與後山',
        reason: '大廳屋頂與雙人寢舍皆已落成完備',
        nextPlan: '演練高階武學或招收外門弟子',
      };
      return;
    }

    const pile = currentFac.stagingPile;
    const isBuilding = currentFac.phase === 'building';

    // 3. 若正在施工中
    if (isBuilding) {
      actor.decision.explain = {
        doing: '在旁監工與協建',
        reason: `${currentFac.name} 施工中（累積 ${currentFac.workforce?.progressTicks || 0}/${currentFac.workforce?.totalTicks || 1000} ticks）`,
        nextPlan: '完工後驗收啟用',
      };
      // 推進木匠工期
      if (currentFac.workforce) {
        currentFac.workforce.progressTicks = (currentFac.workforce.progressTicks || 0) + 1;
        if (currentFac.workforce.progressTicks >= currentFac.workforce.totalTicks) {
          this.completeConstruction(world, currentFacId, actor);
        }
      }
      return;
    }

    // 4. 檢查是否三料皆滿 100% -> 自動敲鐘招工
    const missingTimber = Math.max(0, (pile.timber?.required || 0) - (pile.timber?.current || 0));
    const missingStone = Math.max(0, (pile.stone?.required || 0) - (pile.stone?.current || 0));
    const missingThatch = Math.max(0, (pile.thatch?.required || 0) - (pile.thatch?.current || 0));

    if (missingTimber === 0 && missingStone === 0 && missingThatch === 0) {
      actor.decision.explain = {
        doing: '走往山門木樁敲響招工鐘',
        reason: `${currentFac.name} 備料已 100% 齊備，招請山下木匠`,
        nextPlan: '木匠上山施工搭設鷹架',
      };
      this.ringArtisanBell(world, actor, currentFacId);
      return;
    }

    // 5. 尚缺建材：依缺口決定採集工序 (茅草 -> 青石 -> 原木)
    if (missingThatch > 0) {
      actor.decision.explain = {
        doing: '在前坪除草收集【茅草】',
        reason: `${currentFac.name} 尚缺茅草 ${missingThatch} 束`,
        nextPlan: '除草完畢後送至工地備料樁',
      };
      const def = LIFE_V02_CONSTANTS.chores.clearWeeds;
      this.toilPipeline.startToil(world, actor, {
        toilId: 'toil.gather_thatch',
        stationId: def.stationId,
        stationPos: def.stationPos,
        sourceItem: def.yieldItem,
        amount: def.yieldAmount,
        durationMs: def.durationMs,
        energyPerSec: def.energyPerSec,
        skillKey: def.skillKey,
      });
      return;
    }

    if (missingStone > 0) {
      actor.decision.explain = {
        doing: '在正堂廢墟拾荒清理【青石】',
        reason: `${currentFac.name} 尚缺青石 ${missingStone} 塊`,
        nextPlan: '搬運青石送至工地備料樁',
      };
      const def = LIFE_V02_CONSTANTS.chores.salvageRubble;
      this.toilPipeline.startToil(world, actor, {
        toilId: 'toil.gather_stone',
        stationId: def.stationId,
        stationPos: def.stationPos,
        sourceItem: def.yieldItem,
        amount: def.yieldAmount,
        durationMs: def.durationMs,
        energyPerSec: def.energyPerSec,
        skillKey: def.skillKey,
      });
      return;
    }

    if (missingTimber > 0) {
      actor.decision.explain = {
        doing: '在林緣枯木砍伐【原木】',
        reason: `${currentFac.name} 尚缺原木 ${missingTimber} 捆`,
        nextPlan: '扛原木送至工地備料樁',
      };
      const def = LIFE_V02_CONSTANTS.chores.chopWood;
      this.toilPipeline.startToil(world, actor, {
        toilId: 'toil.gather_timber',
        stationId: def.stationId,
        stationPos: def.stationPos,
        sourceItem: def.yieldItem,
        amount: def.yieldAmount,
        durationMs: def.durationMs,
        energyPerSec: def.energyPerSec,
        skillKey: def.skillKey,
      });
    }
  }
}
