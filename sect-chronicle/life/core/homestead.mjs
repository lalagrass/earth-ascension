// homestead.mjs
// LIFE-V03 人間煙火核心引擎：菜園、藥園、膳房四階名菜、行軍乾糧袋、釀酒缸與圍桌共食

import fs from 'node:fs';

const RECIPES_DATA_URL = new URL('../data/recipes.json', import.meta.url);
export const RECIPES_DATA = JSON.parse(fs.readFileSync(RECIPES_DATA_URL, 'utf-8'));

export const LIFE_V03_CONSTANTS = Object.freeze({
  farming: {
    waterConsumptionPerWatering: 1,
    waterMoistureAdd: 40,
    moistureDecayPerSec: 0.20,
    moistureDecayPerTick: 0.20 / 60, // 0.003333% per tick at 60fps
    dryThreshold: 20,
    growthDurationTicks: {
      cabbage: 3600,
      bambooShoot: 4800,
      herbDiting: 5400,
    },
    yields: {
      cabbage: { normal: 2, rareChance: 0.15, rareItem: 'item.bamboo_shoot' },
      bambooShoot: { normal: 2, rareChance: 0.15, rareItem: 'item.rain_bamboo_shoot' },
      herbDiting: { normal: 2, rareChance: 0.15, rareItem: 'item.golden_herb' },
    },
  },
  culinary: {
    recipes: RECIPES_DATA.recipes,
    rationPouch: {
      maxCapacity: 2,
      riceBall: { satiety: 25, energy: 15, eatDurationSec: 2, eatDurationTicks: 120 },
      chickenLeg: { satiety: 40, energy: 25, eatDurationSec: 2, eatDurationTicks: 120 },
    },
  },
  brewery: {
    monkeyWine: { brewSec: 30, buffDurationSec: 120, buffDurationTicks: 7200, flawCaptureBonus: 0.15 },
    strongLiquor: { brewSec: 30, buffDurationSec: 120, buffDurationTicks: 7200, roarThreatBonus: 20 },
  },
});

/**
 * 菜園與藥園地塊管理器 (GardenPlotManager)
 */
export class GardenPlotManager {
  constructor(initialPlots = []) {
    this.plots = new Map();
    for (const plot of initialPlots) {
      this.plots.set(plot.plotId, { ...plot });
    }
  }

  createPlot({
    plotId,
    type = 'vegetable',
    pos = [0, 0],
    cropId = null,
    moisture = 50,
    matureTicks = null,
    yieldItem = null,
    yieldCount = 2,
    bonusRareYield = null,
  }) {
    const defaultCrop = cropId ? RECIPES_DATA.crops[cropId] || RECIPES_DATA.crops[`crop.${cropId}`] : null;
    const resolvedMatureTicks = matureTicks ?? (defaultCrop ? defaultCrop.matureTicks : (type === 'herb' ? 5400 : 3600));
    const resolvedYieldItem = yieldItem ?? (defaultCrop ? defaultCrop.yieldItem : (type === 'herb' ? 'item.herbal_diting' : 'item.cabbage'));
    const resolvedBonus = bonusRareYield ?? (defaultCrop ? { itemId: defaultCrop.rareItem, chance: defaultCrop.rareChance } : null);

    const plot = {
      plotId,
      type, // 'vegetable' | 'herb'
      pos: [...pos],
      stage: cropId ? 'seeded' : 'empty',
      cropId,
      moisture: Math.max(0, Math.min(100, moisture)),
      growthTicks: 0,
      matureTicks: resolvedMatureTicks,
      reservedBy: null,
      yieldItem: resolvedYieldItem,
      yieldCount,
      bonusRareYield: resolvedBonus,
    };

    this.plots.set(plotId, plot);
    return plot;
  }

  getPlot(plotId) {
    return this.plots.get(plotId) || null;
  }

  getAllPlots() {
    return Array.from(this.plots.values());
  }

  plantCrop(plotId, cropId) {
    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, reason: 'PLOT_NOT_FOUND' };
    if (plot.stage !== 'empty' && plot.cropId) {
      return { ok: false, reason: 'PLOT_NOT_EMPTY' };
    }

    const cropMeta = RECIPES_DATA.crops[cropId] || RECIPES_DATA.crops[`crop.${cropId}`];
    plot.cropId = cropId;
    plot.stage = 'seeded';
    plot.growthTicks = 0;
    if (cropMeta) {
      plot.matureTicks = cropMeta.matureTicks;
      plot.yieldItem = cropMeta.yieldItem;
      plot.yieldCount = cropMeta.yieldCount;
      plot.bonusRareYield = { itemId: cropMeta.rareItem, chance: cropMeta.rareChance };
    }

    return { ok: true, plot };
  }

  waterPlot(plotId, amount = LIFE_V03_CONSTANTS.farming.waterMoistureAdd, inventory = null) {
    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, reason: 'PLOT_NOT_FOUND' };

    if (inventory && typeof inventory.water === 'number') {
      if (inventory.water < 1) {
        return { ok: false, reason: 'INSUFFICIENT_WATER' };
      }
      inventory.water -= 1;
    }

    plot.moisture = Math.min(100, plot.moisture + amount);
    return { ok: true, plotId, moisture: plot.moisture };
  }

  tick(deltaTicks = 1, options = {}) {
    const decayPerTick = options.decayPerTick ?? LIFE_V03_CONSTANTS.farming.moistureDecayPerTick;
    const dryThreshold = options.dryThreshold ?? LIFE_V03_CONSTANTS.farming.dryThreshold;

    for (const plot of this.plots.values()) {
      // 1. 濕度衰減
      if (decayPerTick > 0) {
        plot.moisture = Math.max(0, +(plot.moisture - decayPerTick * deltaTicks).toFixed(4));
      }

      // 2. 缺水停止生長防呆反例 (counter_crop_wither_without_water)
      if (plot.moisture < dryThreshold) {
        // 濕度低於 20%，停止生長，growthTicks 完全凍結
        continue;
      }

      // 3. 正常生長進度累計
      if (plot.cropId && plot.stage !== 'empty') {
        if (plot.growthTicks < plot.matureTicks) {
          plot.growthTicks += deltaTicks;
        }

        // 更新外觀階段
        if (plot.growthTicks >= plot.matureTicks) {
          plot.stage = 'mature';
        } else if (plot.growthTicks >= plot.matureTicks * 0.6) {
          plot.stage = 'growing';
        } else if (plot.growthTicks >= plot.matureTicks * 0.25) {
          plot.stage = 'sprouting';
        } else {
          plot.stage = 'seeded';
        }
      }
    }
  }

  harvestPlot(plotId, disciple = null, options = {}) {
    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, reason: 'PLOT_NOT_FOUND' };
    if (plot.stage !== 'mature') {
      return { ok: false, reason: 'NOT_MATURE', currentGrowthTicks: plot.growthTicks, matureTicks: plot.matureTicks };
    }

    const yieldCount = plot.yieldCount;
    const yieldItem = plot.yieldItem;
    let gotBonus = false;
    let bonusItem = null;

    const farmingSkillLv = disciple?.skills?.farming ?? (disciple?.skills?.agriculture ?? 1);
    const herbalismSkillLv = disciple?.skills?.herbalism ?? 1;
    const relevantLevel = plot.type === 'herb' ? herbalismSkillLv : farmingSkillLv;

    if (plot.bonusRareYield) {
      const bonusChance = options.forceRare ? 1.0 : (plot.bonusRareYield.chance + (relevantLevel >= 3 ? 0.20 : 0.0));
      const roll = options.rngRoll ?? Math.random();
      if (roll <= bonusChance) {
        gotBonus = true;
        bonusItem = plot.bonusRareYield.itemId;
      }
    }

    const xpSkill = plot.type === 'herb' ? 'herbalism' : 'agriculture';
    const xpAmount = 15 + relevantLevel * 5;
    if (disciple && disciple.skills) {
      disciple.skills[xpSkill] = (disciple.skills[xpSkill] || 0) + xpAmount;
    }

    // 重設地塊
    plot.stage = 'empty';
    plot.cropId = null;
    plot.growthTicks = 0;

    return {
      ok: true,
      yieldItem,
      yieldCount,
      gotBonus,
      bonusItem,
      xpAwarded: { skill: xpSkill, amount: xpAmount },
      plot,
    };
  }
}

/**
 * 乾糧袋管理器 (RationPouchManager)
 */
export class RationPouchManager {
  static createPouch(ownerId, capacity = LIFE_V03_CONSTANTS.culinary.rationPouch.maxCapacity) {
    return {
      ownerId,
      capacity,
      items: [],
    };
  }

  static getCapacity(discipleOrOrigin, baseCapacity = 2) {
    if (!discipleOrOrigin) return baseCapacity;

    // 鎮北武館/郭靖道統特技：膳房行軍乾糧袋容量 +1
    const hasBeixiaDoctrine =
      discipleOrOrigin.sectOriginId === 'origin.beixia_palm' ||
      discipleOrOrigin.originId === 'origin.beixia_palm' ||
      discipleOrOrigin.doctrinePassive?.rationCapacityBonus ||
      discipleOrOrigin.templateId === 'guo_jing';

    return hasBeixiaDoctrine ? baseCapacity + 1 : baseCapacity;
  }

  static packRation(discipleOrPouch, rationItemOrId, options = {}) {
    let pouch = discipleOrPouch.rationPouch || (discipleOrPouch.items ? discipleOrPouch : null);
    if (!pouch && discipleOrPouch.id) {
      const cap = this.getCapacity(discipleOrPouch, LIFE_V03_CONSTANTS.culinary.rationPouch.maxCapacity);
      discipleOrPouch.rationPouch = this.createPouch(discipleOrPouch.id, cap);
      pouch = discipleOrPouch.rationPouch;
    }

    if (!pouch) {
      pouch = this.createPouch('unknown', 2);
    }

    const maxCap = pouch.capacity ?? this.getCapacity(discipleOrPouch, LIFE_V03_CONSTANTS.culinary.rationPouch.maxCapacity);

    // 行軍乾糧袋防溢出反例 (counter_ration_pouch_overflow)
    if (pouch.items.length >= maxCap) {
      return {
        ok: false,
        reason: 'RATION_POUCH_FULL',
        currentCount: pouch.items.length,
        capacity: maxCap,
      };
    }

    let rationObj = rationItemOrId;
    if (typeof rationItemOrId === 'string') {
      const meta = RECIPES_DATA.rations.items[rationItemOrId] || RECIPES_DATA.rations.items[`ration.${rationItemOrId}`];
      if (meta) {
        rationObj = { ...meta };
      } else {
        rationObj = {
          rationId: rationItemOrId,
          name: rationItemOrId,
          satietyAmount: 25,
          energyAmount: 15,
        };
      }
    }

    pouch.items.push(rationObj);
    return {
      ok: true,
      pouch,
      addedItem: rationObj,
      totalCount: pouch.items.length,
      capacity: maxCap,
    };
  }

  static consumeRation(disciple, rationIndex = 0) {
    const pouch = disciple.rationPouch;
    if (!pouch || pouch.items.length === 0) {
      return { ok: false, reason: 'NO_RATIONS' };
    }

    const index = Math.max(0, Math.min(pouch.items.length - 1, rationIndex));
    const [ration] = pouch.items.splice(index, 1);

    const satietyAdd = ration.satietyAmount || 25;
    const energyAdd = ration.energyAmount || 15;

    if (typeof disciple.satiety === 'number') {
      disciple.satiety = Math.min(100, disciple.satiety + satietyAdd);
    }
    if (typeof disciple.energy === 'number') {
      disciple.energy = Math.min(100, disciple.energy + energyAdd);
    }

    return {
      ok: true,
      ration,
      restored: { satiety: satietyAdd, energy: energyAdd },
      remainingCount: pouch.items.length,
      eatDurationTicks: 120, // 2s (120 ticks)
    };
  }
}

/**
 * 膳房大陶灶烹飪管理器 (KitchenManager)
 */
export class KitchenManager {
  constructor(recipes = RECIPES_DATA.recipes) {
    this.recipes = recipes;
    this.cookedDishes = [];
    this.aromaAds = [];
  }

  cookDish(recipeId, options = {}) {
    const rawId = recipeId.startsWith('recipe.') ? recipeId : `recipe.${recipeId}`;
    const recipe = this.recipes[rawId] || this.recipes[recipeId];
    if (!recipe) {
      return { ok: false, reason: 'RECIPE_NOT_FOUND' };
    }

    const inventory = options.inventory;
    if (inventory) {
      if (typeof inventory.timber === 'number' && inventory.timber < recipe.woodCost) {
        return { ok: false, reason: 'INSUFFICIENT_TIMBER' };
      }
      if (typeof inventory.water === 'number' && inventory.water < recipe.waterCost) {
        return { ok: false, reason: 'INSUFFICIENT_WATER' };
      }
      // 扣減材料
      if (typeof inventory.timber === 'number') inventory.timber -= recipe.woodCost;
      if (typeof inventory.water === 'number') inventory.water -= recipe.waterCost;
    }

    const dish = {
      dishId: `dish_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipeId: recipe.recipeId,
      name: recipe.name,
      tier: recipe.tier,
      tierName: recipe.tierName,
      satiety: recipe.satiety,
      energyBuff: recipe.energyBuff,
      buffDurationTicks: recipe.buffDurationTicks,
      aromaRadius: recipe.aromaRadius,
      canPackRation: recipe.canPackRation,
      packRationId: recipe.packRationId,
      createdTick: options.tick || 0,
    };

    this.cookedDishes.push(dish);

    // 珍饈 (tier 3) 與 絕味 (tier 4) 廣播 FoodAromaAd
    let aromaAd = null;
    if (recipe.aromaRadius >= 300) {
      aromaAd = {
        type: 'FoodAromaAd',
        recipeId: recipe.recipeId,
        dishName: recipe.name,
        tier: recipe.tier,
        radius: recipe.aromaRadius,
        centerPos: options.kitchenPos || [920, 480],
        attracts: recipe.attracts || ['hungry_disciples'],
        createdTick: options.tick || 0,
        expiresTick: (options.tick || 0) + 1800,
      };
      this.aromaAds.push(aromaAd);
    }

    return {
      ok: true,
      dish,
      aromaAd,
    };
  }
}

/**
 * 後院青石釀酒缸管理器 (BreweryManager)
 */
export class BreweryManager {
  constructor(brews = RECIPES_DATA.brews) {
    this.brews = brews;
    this.storage = [];
  }

  brewWine(brewId, options = {}) {
    const rawId = brewId.startsWith('brew.') ? brewId : `brew.${brewId}`;
    const formula = this.brews[rawId] || this.brews[brewId];
    if (!formula) {
      return { ok: false, reason: 'FORMULA_NOT_FOUND' };
    }

    const inventory = options.inventory;
    if (inventory && typeof inventory.water === 'number') {
      if (inventory.water < 1) {
        return { ok: false, reason: 'INSUFFICIENT_WATER' };
      }
      inventory.water -= 1;
    }

    const wine = {
      wineId: `wine_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      brewId: formula.brewId,
      name: formula.name,
      buffId: formula.buffId,
      buffName: formula.buffName,
      buffDurationTicks: formula.buffDurationTicks || 7200,
      buffEffects: {
        flawCaptureBonus: formula.flawCaptureBonus || 0,
        roarThreatBonus: formula.roarThreatBonus || 0,
      },
    };

    this.storage.push(wine);
    return { ok: true, wine };
  }

  drinkWine(disciple, wineOrBrewId) {
    let wineMeta = null;
    if (typeof wineOrBrewId === 'string') {
      const rawId = wineOrBrewId.startsWith('brew.') ? wineOrBrewId : `brew.${wineOrBrewId}`;
      wineMeta = this.brews[rawId] || this.brews[wineOrBrewId];
    } else if (wineOrBrewId && wineOrBrewId.buffId) {
      wineMeta = wineOrBrewId;
    }

    if (!wineMeta) {
      return { ok: false, reason: 'WINE_NOT_FOUND' };
    }

    const buff = {
      buffId: wineMeta.buffId,
      name: wineMeta.buffName || wineMeta.name,
      durationTicks: wineMeta.buffDurationTicks || 7200, // 120s
      elapsedTicks: 0,
      effects: {
        flawCaptureBonus: wineMeta.flawCaptureBonus || wineMeta.buffEffects?.flawCaptureBonus || 0,
        roarThreatBonus: wineMeta.roarThreatBonus || wineMeta.buffEffects?.roarThreatBonus || 0,
      },
    };

    if (disciple) {
      disciple.buffs = disciple.buffs || {};
      disciple.buffs[buff.buffId] = buff;
    }

    return {
      ok: true,
      buff,
      discipleId: disciple?.id,
    };
  }
}

/**
 * 餐敘棚圍桌共食 (runCommunalDining)
 */
export function runCommunalDining(disciples = [], hiredArtisans = [], options = {}) {
  const participants = [...disciples, ...hiredArtisans];
  if (participants.length === 0) {
    return { ok: false, reason: 'NO_PARTICIPANTS' };
  }

  const mealDish = options.dish || {
    name: '熱飯菜與鮮筍湯',
    satiety: 40,
    energyRestore: 25,
  };

  const satietyAmount = mealDish.satiety || 35;
  const energyAmount = mealDish.energyRestore || 20;
  const affinityGain = 5;

  for (const person of participants) {
    if (typeof person.satiety === 'number') {
      person.satiety = Math.min(100, person.satiety + satietyAmount);
    }
    if (typeof person.energy === 'number') {
      person.energy = Math.min(100, person.energy + energyAmount);
    }
    if (person.affinities) {
      for (const other of participants) {
        if (other !== person && other.id) {
          person.affinities[other.id] = (person.affinities[other.id] || 0) + affinityGain;
        }
      }
    }
  }

  const dialogueBubbles = [
    { speaker: participants[0]?.name || '掌門', text: '「大家辛苦了，趁熱多吃些！」' },
    { speaker: hiredArtisans[0]?.name || '木匠師傅', text: '「山上的飯菜比山下館子還香！」' },
  ];

  return {
    ok: true,
    participantsCount: participants.length,
    satietyRestored: satietyAmount,
    energyRestored: energyAmount,
    affinityGain,
    dialogueBubbles,
  };
}

/**
 * 人間煙火統一掌門/門派生活整合器 (HomesteadManager)
 */
export class HomesteadManager {
  constructor() {
    this.garden = new GardenPlotManager();
    this.kitchen = new KitchenManager();
    this.brewery = new BreweryManager();
  }

  tick(deltaTicks = 1, context = {}) {
    this.garden.tick(deltaTicks, context);
  }
}
