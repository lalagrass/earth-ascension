// alchemy-forge.mjs
// LIFE-V08 煉藥洗髓、十全大補湯引海大富、三大特殊修練環境 (寒玉床/瀑布/玉蜂箱) 與百鍛神兵

import fs from 'node:fs';

const ALCHEMY_FORGE_URL = new URL('../data/alchemy-forge-v08.json', import.meta.url);
export const ALCHEMY_FORGE_DATA = JSON.parse(fs.readFileSync(ALCHEMY_FORGE_URL, 'utf-8'));

export const ALCHEMY_V08_CONSTANTS = Object.freeze({
  recipes: {
    xishuiBath: {
      workTicks: 1200, // 20 秒
      herbCost: { rawHerb: 3, spiritGinseng: 1 },
      constitutionBonus: 1,
      innerQiRateMultiplier: 1.25,
    },
    shiquanTonic: {
      workTicks: 1800, // 30 秒
      herbCost: { rawHerb: 5, spiritGinseng: 2, lingzhi: 1 },
      haidafuTriggerChance: 0.75, // 75% 觸發海大富
      haidafuGoldCompensation: 100,
    },
  },
  environments: {
    coldJadeBed: {
      innerQiRegenPerSec: 2.5,
      requiredConstitution: 6,
    },
    waterfallPlatform: {
      impactForce: 75,
      requiredStrength: 7,
      swordProficiencyBonus: 1.50, // +150%
      knockbackBonus: 80,
    },
    jadeBeeHive: {
      zhouBotongFriendshipThreshold: 60,
      dualWieldSimultaneousMoveWindowMs: 50,
      maxComprehensionThreshold: 4,
    },
  },
  forge: {
    heavyIronSword: {
      weightUnits: 70,
      damageMultiplier: 2.2,
      knockbackBonus: 80,
      slashWaveWidthPx: 60,
      requiredStrength: 7,
      twoHanded: true,
      pierceRate: 2.0,
    },
    softGoldArmor: {
      damageReductionRatio: 0.60,
    },
    foreignFlintlock: {
      projectileVolley: true,
      damage: 65,
      rangePx: 180,
    },
    orientalNeedle: {
      windupSec: 0.05,
      multiHitTargetCount: 5,
      damage: 38,
    },
    bronzeBellMegaphone: {
      soundwaveRangeMultiplier: 2.0,
      soundwaveKnockbackBonus: 50,
    },
  },
});

/**
 * 輔助函式：提取弟子四維
 */
function getStat(actor, statName) {
  if (!actor) return 0;
  if (actor.stats && actor.stats[statName] !== undefined) {
    return actor.stats[statName];
  }
  if (statName === 'strength') {
    return actor.stats?.strength ?? actor.strength ?? actor.foundation?.strength ?? 5;
  }
  if (statName === 'constitution' || statName === 'bone') {
    return actor.stats?.constitution ?? actor.stats?.bone ?? actor.constitution ?? actor.bone ?? 5;
  }
  if (statName === 'comprehension') {
    return actor.stats?.comprehension ?? actor.comprehension ?? actor.persona?.comprehension ?? 5;
  }
  return 5;
}

/**
 * 煉藥鼎管理員 (AlchemyCauldronManager) - DoD C1
 */
export class AlchemyCauldronManager {
  static createCauldron(facilityId = 'fac.herbstore') {
    return {
      facilityId,
      currentRecipeId: null,
      progressTicks: 0,
      totalRequiredTicks: 0,
      supremeTonicCount: 0,
      bathReadyCount: 0,
      pillCount: 0,
      haidafuEncounter: {
        triggered: false,
        stolenBatches: 0,
        compensatedGold: 0,
        dialogueBubble: null,
      },
    };
  }

  /**
   * 熬製固本洗髓藥浴，永久提升根骨 +1 與內息速率 +25%
   */
  static brewMedicinalBath(cauldronState, ingredients = {}, disciple = null) {
    const cost = ALCHEMY_V08_CONSTANTS.recipes.xishuiBath.herbCost;
    if (
      ingredients.rawHerb !== undefined &&
      (ingredients.rawHerb < cost.rawHerb || (ingredients.spiritGinseng || 0) < cost.spiritGinseng)
    ) {
      return { ok: false, reason: 'INSUFFICIENT_HERBS' };
    }

    cauldronState.bathReadyCount = (cauldronState.bathReadyCount || 0) + 1;

    let boostedDisciple = null;
    if (disciple) {
      if (!disciple.stats) disciple.stats = {};
      disciple.stats.constitution = (disciple.stats.constitution || 5) + 1;
      disciple.innerQiRateMultiplier = (disciple.innerQiRateMultiplier || 1.0) * 1.25;
      boostedDisciple = disciple;
    }

    return {
      ok: true,
      bathReadyCount: cauldronState.bathReadyCount,
      constitutionBonus: 1,
      innerQiRateMultiplier: 1.25,
      disciple: boostedDisciple,
      message: '固本洗髓藥浴熬製完成，筋骨通透、氣海澎湃！',
    };
  }

  /**
   * 熬製十全大補靈湯
   */
  static brewSupremeTonic(cauldronState, ingredients = {}) {
    const cost = ALCHEMY_V08_CONSTANTS.recipes.shiquanTonic.herbCost;
    if (
      ingredients.rawHerb !== undefined &&
      (ingredients.rawHerb < cost.rawHerb ||
        (ingredients.spiritGinseng || 0) < cost.spiritGinseng ||
        (ingredients.lingzhi || 0) < cost.lingzhi)
    ) {
      return { ok: false, reason: 'INSUFFICIENT_HERBS' };
    }

    cauldronState.supremeTonicCount = (cauldronState.supremeTonicCount || 0) + 1;

    return {
      ok: true,
      supremeTonicCount: cauldronState.supremeTonicCount,
      tonicAromaBroadcast: true,
      aromaRadius: 400,
      message: '十全大補靈湯出鍋，異香撲鼻直達十里之外！',
    };
  }

  /**
   * 海大富偷藥結算 (resolveHaiDafuTonicVisit) - 嚴格物資守恆
   */
  static resolveHaiDafuTonicVisit(cauldronState, inventory = {}, rngRoll = 0.5) {
    // 嚴格檢定：鼎內若無補湯，絕不憑空觸發
    if (!cauldronState || cauldronState.supremeTonicCount <= 0) {
      return {
        triggered: false,
        stolen: 0,
        goldAdded: 0,
        reason: 'NO_TONIC_AVAILABLE',
      };
    }

    // 75% 確定性機率檢定
    const triggerThreshold = ALCHEMY_V08_CONSTANTS.recipes.shiquanTonic.haidafuTriggerChance;
    if (rngRoll <= triggerThreshold) {
      // 鼎內扣 1 份補湯
      cauldronState.supremeTonicCount -= 1;

      // 庫存金兩增加 100
      const goldGain = ALCHEMY_V08_CONSTANTS.recipes.shiquanTonic.haidafuGoldCompensation;
      inventory.gold = (inventory.gold || 0) + goldGain;

      const bubble = '咳咳……小桂子，把藥端來……';
      cauldronState.haidafuEncounter = {
        triggered: true,
        stolenBatches: (cauldronState.haidafuEncounter?.stolenBatches || 0) + 1,
        compensatedGold: (cauldronState.haidafuEncounter?.compensatedGold || 0) + goldGain,
        dialogueBubble: bubble,
      };

      return {
        triggered: true,
        stolen: 1,
        goldAdded: goldGain,
        supremeTonicRemaining: cauldronState.supremeTonicCount,
        dialogueBubble: bubble,
        message: '周星馳版海大富摸入藥房偷喝大補湯，咳了幾聲後在案頭留下百兩紋銀！',
      };
    }

    return {
      triggered: false,
      stolen: 0,
      goldAdded: 0,
      reason: 'RNG_NOT_TRIGGERED',
    };
  }

  /**
   * 張無忌仁心醫館瞬間治癒重傷
   */
  static cureInjuries(disciple, physicianId = 'zhang_wuji') {
    if (physicianId === 'zhang_wuji' || disciple.assignedDoctor === 'zhang_wuji') {
      disciple.injuries = [];
      disciple.isInjured = false;
      disciple.internalInjury = false;
      disciple.health = disciple.maxHealth || 100;
      return {
        ok: true,
        curedBy: '張無忌・仁心醫仙',
        message: '張無忌施展神針祛毒，經脈內傷瞬間完好如初！',
      };
    }
    return { ok: false, reason: 'DOCTOR_NOT_PRESENT' };
  }
}

// 別名導出
export const brewMedicinalBath = AlchemyCauldronManager.brewMedicinalBath;
export const brewSupremeTonic = AlchemyCauldronManager.brewSupremeTonic;
export const resolveHaiDafuTonicVisit = AlchemyCauldronManager.resolveHaiDafuTonicVisit;
export const cureInjuries = AlchemyCauldronManager.cureInjuries;

/**
 * 特殊修練環境管理員 (SpecialCultivationManager) - DoD C2 ~ C4
 */
export class SpecialCultivationManager {
  /**
   * 🛏️【古墓寒玉床】(tickColdJadeBed) - DoD C2
   * 小龍女或高根骨弟子睡覺每秒漲 2.5 內息
   */
  static tickColdJadeBed(disciple, ticks = 60) {
    const isXiaoLongnu = disciple.archetypeId === 'xiao_longnu' || disciple.name?.includes('龍女');
    const consti = getStat(disciple, 'constitution');
    const requiredConsti = ALCHEMY_V08_CONSTANTS.environments.coldJadeBed.requiredConstitution;

    if (!isXiaoLongnu && consti < requiredConsti) {
      return {
        ok: false,
        reason: 'CONSTITUTION_TOO_LOW_FOR_COLD_JADE',
        message: `寒氣入體難以承受 (需根骨 >= ${requiredConsti})`,
      };
    }

    // 每 60 ticks (1 秒) 漲 2.5 內息
    const ratePerSec = ALCHEMY_V08_CONSTANTS.environments.coldJadeBed.innerQiRegenPerSec;
    const gained = (ticks / 60) * ratePerSec;

    disciple.innerQi = (disciple.innerQi || 0) + gained;
    return {
      ok: true,
      innerQiGained: gained,
      currentInnerQi: disciple.innerQi,
      message: '睡於古墓寒玉床上，內息高速自行運轉精進！',
    };
  }

  /**
   * 🌊【後山山洪瀑布台】(trainWaterfallHeavySword) - DoD C3
   * 臂力 >= 7 弟子頂激流揮舞重劍，熟練度 +150% 並解鎖重劍巨浪判定
   */
  static trainWaterfallHeavySword(disciple, ticks = 60) {
    const str = getStat(disciple, 'strength');
    const requiredStr = ALCHEMY_V08_CONSTANTS.environments.waterfallPlatform.requiredStrength;

    if (str < requiredStr) {
      return {
        ok: false,
        reason: 'STRENGTH_BELOW_WATERFALL_THRESHOLD',
        message: `水流萬鈞無法立足 (需臂力 >= ${requiredStr})`,
      };
    }

    const bonusRate = ALCHEMY_V08_CONSTANTS.environments.waterfallPlatform.swordProficiencyBonus;
    const effectiveMultiplier = 1.0 + bonusRate; // 2.5x

    if (!disciple.unlockedTraits) disciple.unlockedTraits = [];
    if (!disciple.unlockedTraits.includes('torrent_wave_cleave')) {
      disciple.unlockedTraits.push('torrent_wave_cleave');
    }

    return {
      ok: true,
      expMultiplier: effectiveMultiplier,
      torrentWaveCleaveUnlocked: true,
      knockbackBonus: ALCHEMY_V08_CONSTANTS.environments.waterfallPlatform.knockbackBonus,
      message: '頂著萬鈞山洪揮舞玄鐵重劍，領悟「重劍無鋒、大巧不工」！',
    };
  }

  /**
   * 🐝【百花玉蜂箱】引周伯通捉迷藏傳授左右互搏 (interactJadeBeeHive) - DoD C4
   */
  static interactJadeBeeHive(disciple, hiveState = {}, action = 'hide_and_seek') {
    if (hiveState.zhouBotongFriendship === undefined) {
      hiveState.zhouBotongFriendship = 0;
    }

    if (action === 'hide_and_seek') {
      hiveState.zhouBotongFriendship += 20;
    }

    const threshold = ALCHEMY_V08_CONSTANTS.environments.jadeBeeHive.zhouBotongFriendshipThreshold;
    if (hiveState.zhouBotongFriendship >= threshold) {
      const comp = getStat(disciple, 'comprehension');
      const isPureHeart =
        disciple.archetypeId === 'guo_jing' ||
        disciple.archetypeId === 'xiao_longnu' ||
        comp <= ALCHEMY_V08_CONSTANTS.environments.jadeBeeHive.maxComprehensionThreshold;

      if (isPureHeart) {
        disciple.hasDualWield = true;
        return {
          ok: true,
          friendship: hiveState.zhouBotongFriendship,
          dualWieldUnlocked: true,
          message: '老頑童周伯通玩得興起，親自傳授獨門神技《左右互搏術》！',
        };
      } else {
        return {
          ok: false,
          friendship: hiveState.zhouBotongFriendship,
          dualWieldUnlocked: false,
          reason: 'MIND_TOO_CRAFTY_FOR_DUAL_WIELD',
          message: '心思雜念太多，左手畫方右手畫圓總是打架，無法學會左右互搏！',
        };
      }
    }

    return {
      ok: true,
      friendship: hiveState.zhouBotongFriendship,
      dualWieldUnlocked: false,
      message: `與老頑童周伯通捉迷藏，好感度提升至 ${hiveState.zhouBotongFriendship}/${threshold}。`,
    };
  }

  /**
   * 左右互搏出招檢定 (resolveDualWieldCast) - 反例 6 雙手空閒檢定
   */
  static resolveDualWieldCast(actor, leftMoveId, rightMoveId) {
    if (!actor.hasDualWield) {
      return { ok: false, reason: 'DUAL_WIELD_NOT_LEARNED' };
    }

    // 檢視裝備武器：若裝備了需要雙手揮舞的雙手兵器 (如七十斤玄鐵重劍)，嚴格拒絕發動！
    const mainWeapon = actor.equipment?.weapon_main;
    const isTwoHanded =
      mainWeapon &&
      (mainWeapon.twoHanded === true ||
        mainWeapon.id === 'equip.heavy_iron_sword' ||
        mainWeapon.name?.includes('玄鐵重劍'));

    if (isTwoHanded) {
      return {
        ok: false,
        reason: 'TWO_HANDED_WEAPON_EQUIPPED',
        message: '雙手揮舞七十斤玄鐵重劍時，無法分心兼施兩招！',
      };
    }

    return {
      ok: true,
      simultaneous: true,
      leftMove: leftMoveId,
      rightMove: rightMoveId,
      windowMs: ALCHEMY_V08_CONSTANTS.environments.jadeBeeHive.dualWieldSimultaneousMoveWindowMs,
      message: '左右雙手各施神技，雙招齊出！',
    };
  }
}

// 別名導出
export const tickColdJadeBed = SpecialCultivationManager.tickColdJadeBed;
export const trainWaterfallHeavySword = SpecialCultivationManager.trainWaterfallHeavySword;
export const interactJadeBeeHive = SpecialCultivationManager.interactJadeBeeHive;
export const resolveDualWieldCast = SpecialCultivationManager.resolveDualWieldCast;

/**
 * 巧匠鍛造神兵管理員 (DivineForgeManager) - DoD D1
 */
export class DivineForgeManager {
  static forgeItem(recipeId, craftsmanDisciple = null, materials = {}) {
    const itemDef = ALCHEMY_FORGE_DATA.forge[recipeId];
    if (!itemDef) {
      return { ok: false, reason: 'UNKNOWN_EQUIPMENT_RECIPE' };
    }

    const craftedItem = { ...itemDef };
    return {
      ok: true,
      item: craftedItem,
      message: `百鍛爐火純青，成功鑄就傳奇神兵【${craftedItem.name}】！`,
    };
  }

  static equipItem(disciple, item) {
    if (!disciple.equipment) {
      disciple.equipment = {};
    }

    // 臂力檢核
    if (item.requiredStrength) {
      const str = getStat(disciple, 'strength');
      if (str < item.requiredStrength) {
        return {
          ok: false,
          reason: 'STRENGTH_INSUFFICIENT',
          requiredStrength: item.requiredStrength,
          currentStrength: str,
          message: `臂力不足以駕馭【${item.name}】 (需臂力 >= ${item.requiredStrength})`,
        };
      }
    }

    disciple.equipment[item.slot] = item;
    return {
      ok: true,
      disciple,
      equippedItem: item,
      message: `成功裝備【${item.name}】！`,
    };
  }
}

// 別名導出
export const forgeItem = DivineForgeManager.forgeItem;
export const equipItem = DivineForgeManager.equipItem;
