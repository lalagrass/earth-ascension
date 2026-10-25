// persona-creation.mjs
// 雙軌創角純函式庫：模式 A（先天五維配點 + 5 題武俠情境問卷推導）與模式 B（經典主角開局）。

export const STAT_NAMES = Object.freeze(['comprehension', 'constitution', 'strength', 'agility', 'composure']);
export const BASE_POINT_POOL = 30;
export const STAT_MIN = 1;
export const STAT_MAX = 10;

export const INNATE_PERKS = Object.freeze({
  'perk.gentleman_sword': { id: 'perk.gentleman_sword', name: '君子端方', desc: '大廳早課聲望累積翻倍' },
  'perk.peerless_talent': { id: 'perk.peerless_talent', name: '萬中無一', desc: '武學熟練度提升速率 +50%' },
  'perk.smooth_talker': { id: 'perk.smooth_talker', name: '滔滔江水', desc: '山下招工費用為 0，且額外獲贈建材' },
  'perk.food_master': { id: 'perk.food_master', name: '食神轉世', desc: '膳房料理品質提升一階' },
});

export const QUESTIONNAIRE = Object.freeze([
  {
    id: 'q1',
    title: '山門初創，前坪雜草叢生、瓦礫遍地，此時有鄉里少年投奔，你會？',
    options: [
      { id: 'q1_a', text: '親自帶領少年除草拾荒，言傳身教。', weights: { conscientious: 0.25, care: 0.20 } },
      { id: 'q1_b', text: '考察其根骨稟賦，若非良才不可輕入。', weights: { safe: 0.25, open: -0.10 } },
      { id: 'q1_c', text: '擺茶言歡，廣結善緣，來者皆客。', weights: { extravert: 0.25, agreeable: 0.20 } },
      { id: 'q1_d', text: '帶其探索後山險隘，以觀膽識。', weights: { explore: 0.25, open: 0.20 } },
    ],
  },
  {
    id: 'q2',
    title: '偶得一本無名古卷，字跡模糊，隱隱有魔道氣息，你將？',
    options: [
      { id: 'q2_a', text: '焚毀殘卷，正道門規不容絲毫邪念。', weights: { safe: 0.25, conscientious: 0.20 } },
      { id: 'q2_b', text: '參詳推演，取其精華去其糟粕。', weights: { open: 0.25, explore: 0.15, stable: 0.10 } },
      { id: 'q2_c', text: '封存於密室，待定力深厚時再做定奪。', weights: { stable: 0.25, safe: 0.15 } },
      { id: 'q2_d', text: '與信任的同門共同研討參驗。', weights: { agreeable: 0.20, extravert: 0.15, care: 0.15 } },
    ],
  },
  {
    id: 'q3',
    title: '山下富商收買官府，欲強佔門派藥圃與水井，你將如何應對？',
    options: [
      { id: 'q3_a', text: '隱忍退讓，暗中備足物資以圖後發。', weights: { safe: 0.25, stable: 0.20 } },
      { id: 'q3_b', text: '當面力爭，以理服人，陳說利害。', weights: { agreeable: 0.20, extravert: 0.20, conscientious: 0.10 } },
      { id: 'q3_c', text: '夜探官府，巧施妙計令其知難而退。', weights: { explore: 0.25, open: 0.20 } },
      { id: 'q3_d', text: '拔劍相向，寸土不讓，護我山門。', weights: { care: 0.25, conscientious: 0.20, stable: 0.10 } },
    ],
  },
  {
    id: 'q4',
    title: '寒夜風雪，山門前有一負傷逃亡的蒙面怪客叩門求庇護，你將？',
    options: [
      { id: 'q4_a', text: '迎入大廳，包紮施藥，不問過往。', weights: { care: 0.30, agreeable: 0.20 } },
      { id: 'q4_b', text: '隔門盤問，核驗其傷勢與來歷。', weights: { safe: 0.25, conscientious: 0.20 } },
      { id: 'q4_c', text: '觀察其武功路數，伺機而動。', weights: { open: 0.25, explore: 0.20 } },
      { id: 'q4_d', text: '贈以乾糧傷藥，勸其另覓避難所。', weights: { stable: 0.20, safe: 0.20 } },
    ],
  },
  {
    id: 'q5',
    title: '門派立匾大典，你期望後世弟子如何稱道本門？',
    options: [
      { id: 'q5_a', text: '君子如玉，規矩森嚴，名震天下。', weights: { conscientious: 0.30, safe: 0.15 } },
      { id: 'q5_b', text: '勤能補拙，抱樸守常，意存高遠。', weights: { conscientious: 0.25, agreeable: 0.25 } },
      { id: 'q5_c', text: '八面玲瓏，通達人情，安身立命。', weights: { extravert: 0.30, explore: 0.20 } },
      { id: 'q5_d', text: '超然物外，逍遙天地，太上忘情。', weights: { open: 0.30, stable: 0.20 } },
    ],
  },
]);

export function derivePersonaFromAnswers(selectedOptionIds = []) {
  const base = {
    open: 0.50,
    conscientious: 0.50,
    extravert: 0.50,
    agreeable: 0.50,
    stable: 0.50,
    explore: 0.50,
    safe: 0.50,
    care: 0.50,
  };

  const optionMap = new Map();
  for (const q of QUESTIONNAIRE) {
    for (const opt of q.options) {
      optionMap.set(opt.id, opt.weights);
    }
  }

  for (const optId of selectedOptionIds) {
    const weights = optionMap.get(optId);
    if (!weights) continue;
    for (const [k, v] of Object.entries(weights)) {
      if (k in base) {
        base[k] = Math.max(0.0, Math.min(1.0, +(base[k] + v).toFixed(2)));
      }
    }
  }

  // 確定性推導道家稱號、批命詩與八卦心印
  let daoTitle = '清微持中';
  let natalPoem = ['修持守一明心性', '清微淡泊悟真常'];
  let heartSealCode = 0b110; // ☴ 巽為風

  if (base.conscientious >= 0.70 && base.safe >= 0.65) {
    daoTitle = '君子端方';
    natalPoem = ['紫氣東來映華山', '有所不為立人間'];
    heartSealCode = 0b111; // ☰ 乾為天
  } else if (base.conscientious >= 0.70 && base.agreeable >= 0.65) {
    daoTitle = '抱樸守拙';
    natalPoem = ['抱樸守拙知常在', '苦練千回意自純'];
    heartSealCode = 0b000; // ☷ 坤為地
  } else if (base.extravert >= 0.70 && base.explore >= 0.65) {
    daoTitle = '八面玲瓏';
    natalPoem = ['神行百變戲王侯', '巧舌如簧解千愁'];
    heartSealCode = 0b011; // ☱ 兌為澤
  } else if (base.care >= 0.70 && base.agreeable >= 0.65) {
    daoTitle = '太上仁心';
    natalPoem = ['仁心廣濟春風度', '甘潤乾坤萬物生'];
    heartSealCode = 0b010; // ☵ 坎為水
  } else if (base.open >= 0.70 && base.stable >= 0.65) {
    daoTitle = '玄同澄照';
    natalPoem = ['玄同澄照融天地', '虛靜無為道自成'];
    heartSealCode = 0b101; // ☲ 離為火
  } else if (base.explore >= 0.65) {
    daoTitle = '狂狷任誕';
    natalPoem = ['任誕長歌行萬里', '不隨流俗自成峰'];
    heartSealCode = 0b100; // ☳ 震為雷
  }

  return {
    base,
    daoTitle,
    natalPoem,
    heartSeal: { code: heartSealCode, overriddenByPlayer: false },
  };
}

export function createPersona(options = {}) {
  const {
    id = 'disc.hero',
    name = '林玄真',
    stats = { comprehension: 6, constitution: 6, strength: 6, agility: 6, composure: 6 },
    destinyBonusPoints = 0,
    innatePerks = ['perk.peerless_talent'],
    questionnaireAnswers = ['q1_a', 'q2_b', 'q3_b', 'q4_a', 'q5_b'],
    destinyTreeId = 'destiny.guo_jing',
  } = options;

  // 1. 防呆檢核五維配點
  if (destinyBonusPoints !== 0 && destinyBonusPoints !== 10) {
    return { ok: false, reason: 'POINT_BUY_EXCEEDED' };
  }

  let totalPoints = 0;
  for (const stat of STAT_NAMES) {
    const val = stats[stat];
    if (typeof val !== 'number' || !Number.isInteger(val)) {
      return { ok: false, reason: 'POINT_BUY_EXCEEDED' };
    }
    if (val < STAT_MIN || val > STAT_MAX) {
      return { ok: false, reason: 'POINT_BUY_EXCEEDED' };
    }
    totalPoints += val;
  }

  const expectedTotal = BASE_POINT_POOL + destinyBonusPoints;
  if (totalPoints !== expectedTotal) {
    return { ok: false, reason: 'POINT_BUY_EXCEEDED' };
  }

  // 2. 確定性性向與批命推導
  const derived = derivePersonaFromAnswers(questionnaireAnswers);

  const disciple = {
    id,
    name,
    originMode: 'custom_point_buy',
    destinyTreeId,
    role: 'master',
    availableForRecruit: false,
    innateStats: {
      comprehension: stats.comprehension,
      constitution: stats.constitution,
      strength: stats.strength,
      agility: stats.agility,
      composure: stats.composure,
      destinyBonusPoints,
      innatePerks: [...innatePerks],
    },
    persona: {
      base: derived.base,
      current: { ...derived.base },
      daoTitle: derived.daoTitle,
      natalPoem: derived.natalPoem,
      heartSeal: derived.heartSeal,
      autopilot: {
        enabled: true,
        policy: 'balanced',
      },
    },
    needs: {
      energy: { current: 100, max: 100, restAt: 30, backAt: 80 },
      thirst: { current: 80, max: 80, wantAt: 20 },
    },
    skills: {
      legStrength: { level: 1, exp: 0, nextExp: 100 },
      physique: { level: 1, exp: 0, nextExp: 100 },
      construction: { level: 1, exp: 0, nextExp: 100 },
    },
    carrying: {
      item: null,
      amount: 0,
    },
    housing: {
      roomId: null,
      bedId: null,
    },
    decision: {
      tier: 3,
      currentToil: null,
      explain: {
        doing: '初入破道館',
        reason: '整理山門',
        nextPlan: '清除前坪雜草',
      },
    },
    unlockedArts: [],
  };

  return { ok: true, disciple };
}

export const ICONIC_TEMPLATES = Object.freeze({
  yue_buqun: {
    id: 'disc.preset_yue',
    name: '岳不群',
    originMode: 'preset_iconic',
    destinyTreeId: 'destiny.yue_buqun',
    innateStats: {
      comprehension: 7,
      constitution: 6,
      strength: 5,
      agility: 7,
      composure: 8,
      destinyBonusPoints: 0,
      innatePerks: ['perk.gentleman_sword'],
    },
    persona: {
      base: {
        open: 0.70,
        conscientious: 0.88,
        extravert: 0.65,
        agreeable: 0.40,
        stable: 0.75,
        explore: 0.50,
        safe: 0.82,
        care: 0.60,
      },
      daoTitle: '君子端方',
      natalPoem: ['紫氣東來映華山', '有所不為立人間'],
      heartSeal: { code: 0b111, overriddenByPlayer: false },
      autopilot: { enabled: true, policy: 'focus_build' },
    },
  },
  guo_jing: {
    id: 'disc.preset_guo',
    name: '郭靖',
    originMode: 'preset_iconic',
    destinyTreeId: 'destiny.guo_jing',
    innateStats: {
      comprehension: 2,
      constitution: 9,
      strength: 8,
      agility: 4,
      composure: 9,
      destinyBonusPoints: 0,
      innatePerks: ['perk.peerless_talent'],
    },
    persona: {
      base: {
        open: 0.15,
        conscientious: 0.95,
        extravert: 0.45,
        agreeable: 0.90,
        stable: 0.90,
        explore: 0.30,
        safe: 0.60,
        care: 0.85,
      },
      daoTitle: '抱樸守拙',
      natalPoem: ['抱樸守拙知常在', '苦練千回意自純'],
      heartSeal: { code: 0b000, overriddenByPlayer: false },
      autopilot: { enabled: true, policy: 'focus_train' },
    },
  },
  wei_xiaobao: {
    id: 'disc.preset_wei',
    name: '韋小寶',
    originMode: 'preset_iconic',
    destinyTreeId: 'destiny.wei_xiaobao',
    innateStats: {
      comprehension: 8,
      constitution: 3,
      strength: 3,
      agility: 9,
      composure: 7,
      destinyBonusPoints: 0,
      innatePerks: ['perk.smooth_talker'],
    },
    persona: {
      base: {
        open: 0.80,
        conscientious: 0.25,
        extravert: 0.92,
        agreeable: 0.70,
        stable: 0.60,
        explore: 0.88,
        safe: 0.75,
        care: 0.50,
      },
      daoTitle: '八面玲瓏',
      natalPoem: ['神行百變戲王侯', '巧舌如簧解千愁'],
      heartSeal: { code: 0b011, overriddenByPlayer: false },
      autopilot: { enabled: true, policy: 'smooth_talker' },
    },
  },
});

export function createIconicRoster(chosenPresetKey = null) {
  const roster = [];
  const keys = ['yue_buqun', 'guo_jing', 'wei_xiaobao'];

  for (const k of keys) {
    const tmpl = ICONIC_TEMPLATES[k];
    const isMaster = (k === chosenPresetKey);
    const disciple = {
      id: tmpl.id,
      name: tmpl.name,
      originMode: 'preset_iconic',
      destinyTreeId: tmpl.destinyTreeId,
      role: isMaster ? 'master' : 'outer_disciple',
      availableForRecruit: !isMaster,
      innateStats: {
        ...tmpl.innateStats,
        innatePerks: [...tmpl.innateStats.innatePerks],
      },
      persona: {
        base: { ...tmpl.persona.base },
        current: { ...tmpl.persona.base },
        daoTitle: tmpl.persona.daoTitle,
        natalPoem: [...tmpl.persona.natalPoem],
        heartSeal: { ...tmpl.persona.heartSeal },
        autopilot: { ...tmpl.persona.autopilot },
      },
      needs: {
        energy: { current: 100, max: 100, restAt: 30, backAt: 80 },
        thirst: { current: 80, max: 80, wantAt: 20 },
      },
      skills: {
        legStrength: { level: 1, exp: 0, nextExp: 100 },
        physique: { level: 1, exp: 0, nextExp: 100 },
        construction: { level: 1, exp: 0, nextExp: 100 },
      },
      carrying: {
        item: null,
        amount: 0,
      },
      housing: {
        roomId: null,
        bedId: null,
      },
      decision: {
        tier: 3,
        currentToil: null,
        explain: {
          doing: isMaster ? '初任掌門' : '候選招募',
          reason: isMaster ? '整飭破道館' : '山下奇遇池中',
          nextPlan: isMaster ? '清除前坪雜草備料' : '等待機緣',
        },
      },
      unlockedArts: [],
    };
    roster.push(disciple);
  }

  return roster;
}

export function createPresetDisciple(presetKey) {
  const tmpl = ICONIC_TEMPLATES[presetKey];
  if (!tmpl) {
    return { ok: false, reason: 'INVALID_PRESET' };
  }
  const roster = createIconicRoster(presetKey);
  const master = roster.find((d) => d.id === tmpl.id);
  const recruitPool = roster.filter((d) => d.id !== tmpl.id);
  return { ok: true, master, recruitPool, roster };
}
