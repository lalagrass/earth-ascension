// smart-objects.mjs
// 設施與活動宣告表 (Smart Objects Advertisement)、FreeSO 式飽和衰減與時辰作息鐘加成

export const LIFE_V02_CONSTANTS = Object.freeze({
  chores: {
    clearWeeds: {
      id: 'chore.clear_weeds',
      name: '除草',
      durationMs: 6000,
      durationTicks: 360,
      energyPerSec: 1,
      yieldItem: 'thatch',
      yieldAmount: 1,
      stationId: 'yard.weeds',
      stationPos: [940, 560],
      skillKey: 'physique',
    },
    salvageRubble: {
      id: 'chore.salvage_rubble',
      name: '拾荒清瓦礫',
      durationMs: 8000,
      durationTicks: 480,
      energyPerSec: 1,
      yieldItem: 'stone',
      yieldAmount: 1,
      stationId: 'hall.rubble',
      stationPos: [880, 260],
      skillKey: 'physique',
    },
    chopWood: {
      id: 'chore.chop_wood',
      name: '枯木砍柴',
      durationMs: 8000,
      durationTicks: 480,
      energyPerSec: 1,
      yieldItem: 'timber',
      yieldAmount: 1,
      stationId: 'woods.log',
      stationPos: [836, 350],
      skillKey: 'physique',
    },
  },

  blueprints: {
    hallRoofRepair: {
      facilityId: 'fac.hall',
      name: '大廳屋頂修繕',
      required: { timber: 4, stone: 4, thatch: 4 },
      workMs: 24000,
      workTicks: 1440,
      scaffoldingBox: [765, 135, 975, 275],
      stationPos: [870, 205],
    },
    dormExpansion: {
      facilityId: 'fac.dorm.a',
      name: '第一間雙人寢舍落成',
      required: { timber: 6, stone: 2, thatch: 2 },
      workMs: 18000,
      workTicks: 1080,
      scaffoldingBox: [1060, 680, 1150, 750],
      stationPos: [1105, 715],
      bedsProvided: ['bed-1', 'bed-2'],
    },
  },

  bell: {
    stationId: 'gate.bell',
    pos: [910, 480],
    ringMs: 1500,
    ringTicks: 90,
    normalCost: { tea: 1 },
    weiXiaobaoFreePerk: true,
    artisanBonusTimber: 1,
  },

  simulation: {
    shichenDurationMs: 60000,
    shichenDurationTicks: 3600,
    fullDayTicks: 43200,
    funCooldownMs: 60000,
    funCooldownTicks: 3600,
    saturationAttenuation: 0.30,
    scheduleBonusMultiplier: 2.50,
  },
});

export const SHICHEN_NAMES = Object.freeze([
  '子時', '丑時', '寅時', '卯時', '辰時', '巳時',
  '午時', '未時', '申時', '酉時', '戌時', '亥時',
]);

// 預設時辰作息偏好表 (門派鐘錶)
export const SCHEDULE_PREFERENCES = Object.freeze({
  卯時: 'train', // 晨起外功演武
  辰時: 'work', // 備料擴建與勞作
  巳時: 'work',
  午時: 'leisure', // 午休、喝茶、同門交流
  未時: 'work',
  申時: 'work',
  酉時: 'work',
  戌時: 'leisure',
  亥時: 'sleep', // 入室就寢
  子時: 'sleep',
  丑時: 'sleep',
  寅時: 'sleep',
});

export function getShichenFromTick(worldTick = 0) {
  const dayTick = worldTick % LIFE_V02_CONSTANTS.simulation.fullDayTicks;
  const index = Math.floor(dayTick / LIFE_V02_CONSTANTS.simulation.shichenDurationTicks);
  return {
    index,
    name: SHICHEN_NAMES[index % 12],
    preferredActivity: SCHEDULE_PREFERENCES[SHICHEN_NAMES[index % 12]] || 'work',
  };
}

export class SmartObjectSystem {
  constructor(constants = LIFE_V02_CONSTANTS) {
    this.constants = constants;
    this.lastActivityCompletion = new Map(); // `${actorId}.${activityId}` -> tick
  }

  recordActivityCompletion(actorId, activityId, tick) {
    this.lastActivityCompletion.set(`${actorId}.${activityId}`, tick);
  }

  getSaturationFactor(actorId, activityId, currentTick) {
    const lastTick = this.lastActivityCompletion.get(`${actorId}.${activityId}`);
    if (lastTick == null) return 1.0;
    const elapsedTicks = currentTick - lastTick;
    if (elapsedTicks < this.constants.simulation.funCooldownTicks) {
      return this.constants.simulation.saturationAttenuation; // 0.30
    }
    return 1.0;
  }

  getScheduleMultiplier(category, currentTick) {
    const shichen = getShichenFromTick(currentTick);
    if (shichen.preferredActivity === category) {
      return this.constants.simulation.scheduleBonusMultiplier; // 2.50
    }
    return 1.0;
  }

  scoreActivity(actor, activity, world) {
    let baseScore = activity.baseWeight || 10;

    // 依五維與性格微調
    if (activity.category === 'work') {
      const c = actor.persona?.base?.conscientious || 0.5;
      baseScore *= (0.5 + c);
    } else if (activity.category === 'train') {
      const p = actor.persona?.base?.open || 0.5;
      baseScore *= (0.6 + p * 0.8);
    } else if (activity.category === 'leisure') {
      const e = actor.persona?.base?.extravert || 0.5;
      baseScore *= (0.6 + e * 0.8);
    }

    // 飽和衰減
    const sat = this.getSaturationFactor(actor.id, activity.id, world.tick || 0);
    baseScore *= sat;

    // 作息鐘加成
    const sched = this.getScheduleMultiplier(activity.category, world.tick || 0);
    baseScore *= sched;

    return baseScore;
  }
}
