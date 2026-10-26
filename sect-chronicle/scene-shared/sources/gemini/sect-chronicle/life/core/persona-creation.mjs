// persona-creation.mjs
// 雙軌創角純函式庫：模式 A（先天五維配點 + 5 題武俠情境問卷推導）與模式 B（六大經典主角開局 + 同門搭檔羈絆）。

export const STAT_NAMES = Object.freeze(['comprehension', 'constitution', 'strength', 'agility', 'composure']);
export const STAT_NAMES_EXPANDED = Object.freeze(['bone', 'comprehension', 'breathing', 'agility', 'temperament']);
export const BASE_POINT_POOL = 30;
export const STAT_MIN = 1;
export const STAT_MAX = 10;

// 立繪清單與水墨頭像回退表 (Section 2.3)
export const PORTRAIT_MANIFEST = Object.freeze({
  custom_hero: Object.freeze({
    portraitId: 'custom_hero',
    name: '自創掌門',
    portraitUrl: '/experiments/water-carry/demo/assets/portraits/custom_hero.png',
    fallbackPalette: Object.freeze({ bg: '#2b3a42', fg: '#88c0d0', border: '#4c566a' }),
    monogram: '天',
  }),
  yue_buqun: Object.freeze({
    portraitId: 'yue_buqun',
    name: '岳不群',
    portraitUrl: '/experiments/water-carry/demo/assets/portraits/yue_buqun.png',
    fallbackPalette: Object.freeze({ bg: '#4a2545', fg: '#e8d7f1', border: '#7b3e68' }),
    monogram: '岳',
  }),
  guo_jing: Object.freeze({
    portraitId: 'guo_jing',
    name: '郭靖',
    portraitUrl: '/experiments/water-carry/demo/assets/portraits/guo_jing.png',
    fallbackPalette: Object.freeze({ bg: '#3d3021', fg: '#eedfc9', border: '#785b3a' }),
    monogram: '郭',
  }),
  wei_xiaobao: Object.freeze({
    portraitId: 'wei_xiaobao',
    name: '韋小寶',
    portraitUrl: '/experiments/water-carry/demo/assets/portraits/wei_xiaobao.png',
    fallbackPalette: Object.freeze({ bg: '#1f3d36', fg: '#d0f0c0', border: '#2e6f5e' }),
    monogram: '韋',
  }),
  linghu_chong: Object.freeze({
    portraitId: 'linghu_chong',
    name: '令狐沖',
    portraitUrl: '/experiments/water-carry/demo/assets/portraits/linghu_chong.png',
    fallbackPalette: Object.freeze({ bg: '#20324f', fg: '#cce0ff', border: '#3b5998' }),
    monogram: '令',
  }),
  ah_sing: Object.freeze({
    portraitId: 'ah_sing',
    name: '阿星',
    portraitUrl: '/experiments/water-carry/demo/assets/portraits/ah_sing.png',
    fallbackPalette: Object.freeze({ bg: '#403b2b', fg: '#fff2b2', border: '#8c7b3e' }),
    monogram: '星',
  }),
  landlady: Object.freeze({
    portraitId: 'landlady',
    name: '包租婆',
    portraitUrl: '/experiments/water-carry/demo/assets/portraits/landlady.png',
    fallbackPalette: Object.freeze({ bg: '#4f1d24', fg: '#ffd4d8', border: '#8a2b38' }),
    monogram: '包',
  }),
});

export function resolvePortrait(portraitId) {
  const meta = PORTRAIT_MANIFEST[portraitId] || PORTRAIT_MANIFEST.custom_hero;
  return {
    portraitId: meta.portraitId,
    name: meta.name,
    portraitUrl: meta.portraitUrl,
    fallbackPalette: { ...meta.fallbackPalette },
    monogram: meta.monogram,
  };
}

export const INNATE_PERKS = Object.freeze({
  'perk.gentleman_sword': { id: 'perk.gentleman_sword', name: '君子端方', desc: '大廳早課聲望累積翻倍' },
  'perk.peerless_talent': { id: 'perk.peerless_talent', name: '萬中無一', desc: '武學熟練度提升速率 +50%' },
  'perk.simple_mastery': { id: 'perk.simple_mastery', name: '抱樸守拙', desc: '備料效率 +25%，協建體魄成長翻倍' },
  'perk.smooth_talker': { id: 'perk.smooth_talker', name: '滔滔江水', desc: '山下招工費用為 0，且額外獲贈建材' },
  'perk.flaw_seeker': { id: 'perk.flaw_seeker', name: '破綻劍癡', desc: '同門切磋拆招經驗與領悟翻倍' },
  'perk.meridian_cocoon': { id: 'perk.meridian_cocoon', name: '金剛破繭', desc: '逃命步移速 +35%，重傷可破繭蛻變' },
  'perk.lion_roar_supervise': { id: 'perk.lion_roar_supervise', name: '獅吼催水', desc: '水缸 <50% 獅吼催水，移速提升 +50%~+65%' },
  'perk.food_master': { id: 'perk.food_master', name: '食神轉世', desc: '膳房料理品質提升一階' },
});

// -------------------------------------------------------------
// 門派起源與道統註冊表 (Section 2.3.4(3) 掌門即道統)
// -------------------------------------------------------------
export const CUSTOM_SECT_BRANCHES = Object.freeze({
  palm: Object.freeze({
    id: 'origin.custom_palm',
    branch: 'palm',
    branchTitle: '拳掌剛猛宗',
    sectName: '青雲門',
    plaqueMotto: '剛毅雄健',
    doctrineTitle: '以拳證道・百煉金剛',
    doctrineEffect: '拳掌外功威力 +20%，破甲擊退增強',
    trainingPostName: '青石開山練拳樁',
    founderArtName: '《開山霹靂掌》',
    internalArtName: '《磐石吐納功》',
  }),
  sword: Object.freeze({
    id: 'origin.custom_sword',
    branch: 'sword',
    branchTitle: '百兵劍道宗',
    sectName: '青雲門',
    plaqueMotto: '青雲仗劍',
    doctrineTitle: '劍意凌霄・身隨劍動',
    doctrineEffect: '劍法攻速 +20%，身法身段靈動',
    trainingPostName: '青鋒懸石試劍架',
    founderArtName: '《青雲流光劍》',
    internalArtName: '《流雲踏風步》',
  }),
  internal: Object.freeze({
    id: 'origin.custom_internal',
    branch: 'internal',
    branchTitle: '玄門內家宗',
    sectName: '青雲門',
    plaqueMotto: '道法自然',
    doctrineTitle: '清靜無為・陰陽調和',
    doctrineEffect: '吐納回氣速率 +25%，靜室領悟提升',
    trainingPostName: '太極乾坤運氣樁',
    founderArtName: '《太乙化形綿掌》',
    internalArtName: '《太乙引氣真經》',
  }),
  qimen: Object.freeze({
    id: 'origin.custom_qimen',
    branch: 'qimen',
    branchTitle: '奇門百藝宗',
    sectName: '青雲門',
    plaqueMotto: '千變萬化',
    doctrineTitle: '機變無方・百藝齊全',
    doctrineEffect: '百藝製造與奇門身法 +25%',
    trainingPostName: '八卦奇門機關樁',
    founderArtName: '《奇門梅花暗影匕》',
    internalArtName: '《迷蹤步法》',
  }),
});

export const SECT_ORIGINS = Object.freeze({
  yue_buqun: Object.freeze({
    id: 'origin.huashan_junzi',
    sectName: '華山別院',
    plaqueMotto: '氣冠紫霞',
    doctrineTitle: '紫霞養氣・君子端方',
    doctrineEffect: '早課講學與讀書領悟 +25%',
    trainingPostName: '青竹君子劍靶',
    founderArtName: '《華山基礎劍法》',
    internalArtName: '《華山抱元勁》',
  }),
  guo_jing: Object.freeze({
    id: 'origin.beixia_palm',
    sectName: '鎮北武館',
    plaqueMotto: '俠之大者',
    doctrineTitle: '抱樸守拙・苦練樁功',
    doctrineEffect: '低悟性打樁熟練 +30%，乾糧袋容量 +1',
    trainingPostName: '千斤重砂木人樁',
    founderArtName: '《基礎羅漢開山掌》',
    internalArtName: '《全真金雁吐納》',
  }),
  wei_xiaobao: Object.freeze({
    id: 'origin.luding_qimen',
    sectName: '通吃山莊',
    plaqueMotto: '鹿鼎奇門',
    doctrineTitle: '義氣聚財・奇門暗器',
    doctrineEffect: '招工採買與募捐銀兩 +35%',
    trainingPostName: '九宮泥鰍梅花樁',
    founderArtName: '《揚州撒灰手・袖裡匕》',
    internalArtName: '《神行百變基礎步》',
  }),
  linghu_chong: Object.freeze({
    id: 'origin.xiaoyao_sword',
    sectName: '見性劍廬',
    plaqueMotto: '笑傲江湖',
    doctrineTitle: '無招勝有招・美酒論劍',
    doctrineEffect: '釀酒與切磋拆招效率 +30%，飲酒微醺劍意',
    trainingPostName: '思過崖懸石劍樁',
    founderArtName: '《五嶽快劍基礎》',
    internalArtName: '《醉酒踏雪步》',
  }),
  ah_sing: Object.freeze({
    id: 'origin.wanfo_palm',
    sectName: '萬佛武館',
    plaqueMotto: '萬中無一',
    doctrineTitle: '懲惡揚善・絕境逢生',
    doctrineEffect: '挨打切磋獲筋骨寸進，義學易招奇才與三隱士',
    trainingPostName: '破麻袋鐵砂草人',
    founderArtName: '《地攤如來神掌圖冊》',
    internalArtName: '《無影踩腳趾飛毛腿》',
  }),
  landlady: Object.freeze({
    id: 'origin.zhulong_compound',
    sectName: '豬籠寨大院',
    plaqueMotto: '大隱於市',
    doctrineTitle: '包租當家・一吼百應',
    doctrineEffect: '外門雜務產出 +30%，獅吼督工常駐，陣位堅韌 +25%',
    trainingPostName: '震音青銅試音鑼',
    founderArtName: '《河東獅吼初階》',
    internalArtName: '《風火輪追命步》',
  }),
  custom: Object.freeze(CUSTOM_SECT_BRANCHES.palm),
});

export function resolveSectOrigin(templateIdOrCustomBranch, customSectName) {
  let key = templateIdOrCustomBranch;
  let name = customSectName;
  let branch = 'palm';

  if (typeof templateIdOrCustomBranch === 'object' && templateIdOrCustomBranch !== null) {
    key = templateIdOrCustomBranch.templateId || templateIdOrCustomBranch.heroTemplateId || templateIdOrCustomBranch.branch || templateIdOrCustomBranch.customBranch || templateIdOrCustomBranch.id || 'custom';
    name = templateIdOrCustomBranch.sectName || templateIdOrCustomBranch.customSectName || customSectName;
    branch = templateIdOrCustomBranch.branch || templateIdOrCustomBranch.customBranch || 'palm';
  }

  if (key === 'custom' || key === 'custom_hero' || key === 'origin.custom_sect' || !key) {
    const brKey = (branch && CUSTOM_SECT_BRANCHES[branch]) ? branch : 'palm';
    const base = CUSTOM_SECT_BRANCHES[brKey] || CUSTOM_SECT_BRANCHES.palm;
    return {
      ...base,
      sectName: (name && String(name).trim()) ? String(name).trim() : '青雲門',
    };
  }

  if (CUSTOM_SECT_BRANCHES[key]) {
    const base = CUSTOM_SECT_BRANCHES[key];
    return {
      ...base,
      sectName: (name && String(name).trim()) ? String(name).trim() : '青雲門',
    };
  }

  const found = SECT_ORIGINS[key];
  if (found) {
    return {
      ...found,
      sectName: (name && String(name).trim()) ? String(name).trim() : found.sectName,
    };
  }

  return {
    ...CUSTOM_SECT_BRANCHES.palm,
    sectName: (name && String(name).trim()) ? String(name).trim() : '青雲門',
  };
}

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

// -------------------------------------------------------------
// 六大極致反差初始模板 (Section 2.1)
// -------------------------------------------------------------
export const ICONIC_TEMPLATES = Object.freeze({
  yue_buqun: Object.freeze({
    id: 'disc.preset_yue',
    templateId: 'yue_buqun',
    name: '岳不群',
    title: '君子端方 · 正邪雙面',
    patrolStyle: 'orthodox_steady',
    portraitId: 'yue_buqun',
    portraitUrl: PORTRAIT_MANIFEST.yue_buqun.portraitUrl,
    originMode: 'preset_iconic',
    destinyTreeId: 'destiny.yue_buqun',
    stats: Object.freeze({
      bone: 6,
      comprehension: 7,
      breathing: 5,
      agility: 7,
      temperament: 8,
      constitution: 6,
      strength: 5,
      composure: 8,
    }),
    innateStats: Object.freeze({
      comprehension: 7,
      constitution: 6,
      strength: 5,
      agility: 7,
      composure: 8,
      bone: 6,
      breathing: 5,
      temperament: 8,
      destinyBonusPoints: 0,
      innatePerks: Object.freeze(['perk.gentleman_sword']),
    }),
    traits: Object.freeze(['perk.gentleman_sword']),
    autopilotWeights: Object.freeze({
      build: 0.85,
      chore: 0.50,
      train: 0.65,
      socialize: 0.70,
      explore: 0.30,
    }),
    starterNote: '君子端方・正邪雙面，重視山門規矩與門面；自動優先修補大廳屋頂與早課；大廳授課聲望累積翻倍',
    persona: Object.freeze({
      base: Object.freeze({
        open: 0.70,
        conscientious: 0.88,
        extravert: 0.65,
        agreeable: 0.40,
        stable: 0.75,
        explore: 0.50,
        safe: 0.82,
        care: 0.60,
      }),
      daoTitle: '君子端方',
      natalPoem: Object.freeze(['紫氣東來映華山', '有所不為立人間']),
      heartSeal: Object.freeze({ code: 0b111, overriddenByPlayer: false }),
      autopilot: Object.freeze({ enabled: true, policy: 'focus_build' }),
    }),
  }),

  guo_jing: Object.freeze({
    id: 'disc.preset_guo',
    templateId: 'guo_jing',
    name: '郭靖',
    title: '抱樸守拙 · 至拙推土機',
    patrolStyle: 'completionist_bulldozer',
    portraitId: 'guo_jing',
    portraitUrl: PORTRAIT_MANIFEST.guo_jing.portraitUrl,
    originMode: 'preset_iconic',
    destinyTreeId: 'destiny.guo_jing',
    stats: Object.freeze({
      bone: 9,
      comprehension: 2,
      breathing: 8,
      agility: 4,
      temperament: 9,
      constitution: 9,
      strength: 8,
      composure: 9,
    }),
    innateStats: Object.freeze({
      comprehension: 2,
      constitution: 9,
      strength: 8,
      agility: 4,
      composure: 9,
      bone: 9,
      breathing: 8,
      temperament: 9,
      destinyBonusPoints: 0,
      innatePerks: Object.freeze(['perk.peerless_talent', 'perk.simple_mastery']),
    }),
    traits: Object.freeze(['perk.peerless_talent', 'perk.simple_mastery']),
    autopilotWeights: Object.freeze({
      build: 0.95,
      chore: 0.95,
      train: 0.80,
      socialize: 0.40,
      explore: 0.20,
    }),
    starterNote: '抱樸守拙・至拙推土機，任勞任怨第一名，砍柴挑水除草備料效率極高；修繕時專注協建，體魄成長翻倍',
    persona: Object.freeze({
      base: Object.freeze({
        open: 0.15,
        conscientious: 0.95,
        extravert: 0.45,
        agreeable: 0.90,
        stable: 0.90,
        explore: 0.30,
        safe: 0.60,
        care: 0.85,
      }),
      daoTitle: '抱樸守拙',
      natalPoem: Object.freeze(['抱樸守拙知常在', '苦練千回意自純']),
      heartSeal: Object.freeze({ code: 0b000, overriddenByPlayer: false }),
      autopilot: Object.freeze({ enabled: true, policy: 'focus_train' }),
    }),
  }),

  wei_xiaobao: Object.freeze({
    id: 'disc.preset_wei',
    templateId: 'wei_xiaobao',
    name: '韋小寶',
    title: '滑頭斥候 · 滔滔江水',
    patrolStyle: 'stealth_looter',
    portraitId: 'wei_xiaobao',
    portraitUrl: PORTRAIT_MANIFEST.wei_xiaobao.portraitUrl,
    originMode: 'preset_iconic',
    destinyTreeId: 'destiny.wei_xiaobao',
    stats: Object.freeze({
      bone: 3,
      comprehension: 8,
      breathing: 3,
      agility: 9,
      temperament: 7,
      constitution: 3,
      strength: 3,
      composure: 7,
    }),
    innateStats: Object.freeze({
      comprehension: 8,
      constitution: 3,
      strength: 3,
      agility: 9,
      composure: 7,
      bone: 3,
      breathing: 3,
      temperament: 7,
      destinyBonusPoints: 0,
      innatePerks: Object.freeze(['perk.smooth_talker']),
    }),
    traits: Object.freeze(['perk.smooth_talker']),
    autopilotWeights: Object.freeze({
      build: 0.30,
      chore: 0.20,
      train: 0.30,
      socialize: 0.95,
      explore: 0.90,
    }),
    starterNote: '滑頭斥候・滔滔江水，雜務偷懶但善於社交；敲鐘招工觸發【滔滔江水】0 成本免茶水且木匠倒貼原木 +1！',
    persona: Object.freeze({
      base: Object.freeze({
        open: 0.80,
        conscientious: 0.25,
        extravert: 0.92,
        agreeable: 0.70,
        stable: 0.60,
        explore: 0.88,
        safe: 0.75,
        care: 0.50,
      }),
      daoTitle: '八面玲瓏',
      natalPoem: Object.freeze(['神行百變戲王侯', '巧舌如簧解千愁']),
      heartSeal: Object.freeze({ code: 0b011, overriddenByPlayer: false }),
      autopilot: Object.freeze({ enabled: true, policy: 'smooth_talker' }),
    }),
  }),

  linghu_chong: Object.freeze({
    id: 'disc.preset_linghu',
    templateId: 'linghu_chong',
    name: '令狐沖',
    title: '狂狷浪子 · 破綻劍癡',
    patrolStyle: 'challenger_seeker',
    portraitId: 'linghu_chong',
    portraitUrl: PORTRAIT_MANIFEST.linghu_chong.portraitUrl,
    originMode: 'preset_iconic',
    destinyTreeId: 'destiny.linghu_chong',
    stats: Object.freeze({
      bone: 5,
      comprehension: 10,
      breathing: 6,
      agility: 9,
      temperament: 4,
      constitution: 5,
      strength: 6,
      composure: 4,
    }),
    innateStats: Object.freeze({
      comprehension: 10,
      constitution: 5,
      strength: 6,
      agility: 9,
      composure: 4,
      bone: 5,
      breathing: 6,
      temperament: 4,
      destinyBonusPoints: 0,
      innatePerks: Object.freeze(['perk.flaw_seeker']),
    }),
    traits: Object.freeze(['perk.flaw_seeker']),
    autopilotWeights: Object.freeze({
      build: 0.40,
      chore: 0.30,
      train: 0.90,
      socialize: 0.85,
      explore: 0.75,
    }),
    starterNote: '狂狷浪子・無招破綻劍癡，打木人樁會打哈欠，最愛喝茶飲酒與找同門切磋拆招；同門切磋經驗獲取翻倍',
    persona: Object.freeze({
      base: Object.freeze({
        open: 0.95,
        conscientious: 0.30,
        extravert: 0.88,
        agreeable: 0.75,
        stable: 0.65,
        explore: 0.92,
        safe: 0.35,
        care: 0.80,
      }),
      daoTitle: '狂狷任誕',
      natalPoem: Object.freeze(['任誕長歌行萬里', '不隨流俗自成峰']),
      heartSeal: Object.freeze({ code: 0b100, overriddenByPlayer: false }),
      autopilot: Object.freeze({ enabled: true, policy: 'challenger_seeker' }),
    }),
  }),

  ah_sing: Object.freeze({
    id: 'disc.preset_sing',
    templateId: 'ah_sing',
    name: '阿星',
    title: '草根混混 · 如來神掌',
    patrolStyle: 'underdog_brawler',
    portraitId: 'ah_sing',
    portraitUrl: PORTRAIT_MANIFEST.ah_sing.portraitUrl,
    originMode: 'preset_iconic',
    destinyTreeId: 'destiny.ah_sing',
    stats: Object.freeze({
      bone: 8,
      comprehension: 6,
      breathing: 6,
      agility: 9,
      temperament: 8,
      constitution: 8,
      strength: 6,
      composure: 8,
    }),
    innateStats: Object.freeze({
      comprehension: 6,
      constitution: 8,
      strength: 6,
      agility: 9,
      composure: 8,
      bone: 8,
      breathing: 6,
      temperament: 8,
      destinyBonusPoints: 0,
      innatePerks: Object.freeze(['perk.meridian_cocoon']),
    }),
    traits: Object.freeze(['perk.meridian_cocoon']),
    autopilotWeights: Object.freeze({
      build: 0.50,
      chore: 0.50,
      train: 0.65,
      socialize: 0.60,
      explore: 0.85,
    }),
    starterNote: '草根混混・破繭如來神掌，開局手拿十塊錢《如來神掌》小人書，開鎖奇快，被追時逃命步移速 +35%',
    persona: Object.freeze({
      base: Object.freeze({
        open: 0.60,
        conscientious: 0.45,
        extravert: 0.75,
        agreeable: 0.70,
        stable: 0.80,
        explore: 0.85,
        safe: 0.60,
        care: 0.75,
      }),
      daoTitle: '赤子金剛',
      natalPoem: Object.freeze(['塵泥不掩如來相', '破繭金光照大千']),
      heartSeal: Object.freeze({ code: 0b101, overriddenByPlayer: false }),
      autopilot: Object.freeze({ enabled: true, policy: 'underdog_brawler' }),
    }),
  }),

  landlady: Object.freeze({
    id: 'disc.preset_landlady',
    templateId: 'landlady',
    name: '包租婆',
    title: '暴躁當家 · 獅吼催水',
    patrolStyle: 'matriarch_enforcer',
    portraitId: 'landlady',
    portraitUrl: PORTRAIT_MANIFEST.landlady.portraitUrl,
    originMode: 'preset_iconic',
    destinyTreeId: 'destiny.landlady',
    stats: Object.freeze({
      bone: 8,
      comprehension: 7,
      breathing: 7,
      agility: 10,
      temperament: 8,
      constitution: 8,
      strength: 7,
      composure: 8,
    }),
    innateStats: Object.freeze({
      comprehension: 7,
      constitution: 8,
      strength: 7,
      agility: 10,
      composure: 8,
      bone: 8,
      breathing: 7,
      temperament: 8,
      destinyBonusPoints: 0,
      innatePerks: Object.freeze(['perk.lion_roar_supervise']),
    }),
    traits: Object.freeze(['perk.lion_roar_supervise']),
    autopilotWeights: Object.freeze({
      build: 0.85,
      chore: 0.95,
      train: 0.70,
      socialize: 0.60,
      explore: 0.40,
    }),
    starterNote: '暴躁當家・獅吼催水，只要水缸存量 <50% 就叉腰獅吼，全場挑水砍柴移速瞬間 +50%！',
    persona: Object.freeze({
      base: Object.freeze({
        open: 0.40,
        conscientious: 0.95,
        extravert: 0.85,
        agreeable: 0.35,
        stable: 0.70,
        explore: 0.40,
        safe: 0.85,
        care: 0.90,
      }),
      daoTitle: '雷霆當家',
      natalPoem: Object.freeze(['獅吼一聲驚萬壑', '當家治舍若雷霆']),
      heartSeal: Object.freeze({ code: 0b010, overriddenByPlayer: false }),
      autopilot: Object.freeze({ enabled: true, policy: 'matriarch_enforcer' }),
    }),
  }),
});

export const CUSTOM_HERO_TEMPLATE = Object.freeze({
  id: 'disc.hero',
  templateId: 'custom_hero',
  name: '自創掌門',
  title: '天命掌門',
  patrolStyle: 'orthodox_steady',
  portraitId: 'custom_hero',
  portraitUrl: PORTRAIT_MANIFEST.custom_hero.portraitUrl,
  starterNote: '天命掌門，先天五維自由配點，情境問卷推導心印與道家稱號，搭配初始同門護法開局',
  stats: Object.freeze({
    bone: 6,
    comprehension: 6,
    breathing: 6,
    agility: 6,
    temperament: 6,
    constitution: 6,
    strength: 6,
    composure: 6,
  }),
  traits: Object.freeze(['perk.peerless_talent']),
  autopilotWeights: Object.freeze({
    build: 0.60,
    chore: 0.60,
    train: 0.60,
    socialize: 0.60,
    explore: 0.60,
  }),
});

export const STARTER_TEMPLATES = Object.freeze({
  custom_hero: CUSTOM_HERO_TEMPLATE,
  ...ICONIC_TEMPLATES,
});

// -------------------------------------------------------------
// 開局五大黃金同門羈絆 (Section 2.2)
// -------------------------------------------------------------
export const DUO_SYNERGIES = Object.freeze({
  'duo_synergy.simple_and_slick': Object.freeze({
    id: 'duo_synergy.simple_and_slick',
    name: '實誠與機靈',
    title: '至拙與至巧・最佳損友開局',
    characters: Object.freeze(['guo_jing', 'wei_xiaobao']),
    desc: '老實人郭靖除草、拾荒、砍柴備料效率 +25%；韋小寶敲鐘招工 0 成本免茶水且木匠倒貼原木 +1！後山巡山郭靖全清前路，韋小寶溜邊摸寶。',
    startingBonus: Object.freeze({
      choreSpeedBonus: 0.25,
      freeArtisan: true,
      bonusTimberOnComplete: 1,
      timber: 1,
    }),
  }),

  'duo_synergy.mentor_and_rebel': Object.freeze({
    id: 'duo_synergy.mentor_and_rebel',
    name: '師徒同門・規矩與酒',
    title: '華山師徒・正奇相生開局',
    characters: Object.freeze(['yue_buqun', 'linghu_chong']),
    desc: '師父岳不群修大廳與早課授課聲望翻倍；大徒弟令狐沖每日找岳不群切磋對練，招式經驗與破劍式領悟速率翻倍 (x2.0)！',
    startingBonus: Object.freeze({
      prestigeMultiplier: 2.0,
      sparringExpMultiplier: 2.0,
    }),
  }),

  'duo_synergy.lion_roar_slacker': Object.freeze({
    id: 'duo_synergy.lion_roar_slacker',
    name: '豬籠城寨・包租婆督工',
    title: '豬籠城寨・雞飛狗跳開局',
    characters: Object.freeze(['landlady', 'ah_sing']),
    desc: '水缸存量 <50% 時包租婆叉腰獅吼，阿星/韋小寶觸發逃命步，挑水與搬木移速疊加飆升至 +65%！守山門時獅吼震暈全場，阿星如來神掌破繭轟頂！',
    startingBonus: Object.freeze({
      lionRoarSpeedBonus: 0.65,
      moodFloor: 50,
    }),
  }),

  'duo_synergy.bird_and_prodigy': Object.freeze({
    id: 'duo_synergy.bird_and_prodigy',
    name: '笨鳥與奇才・對練成聖',
    title: '笨鳥與奇才・苦練與天賦開局',
    characters: Object.freeze(['guo_jing', 'ah_sing']),
    desc: '郭靖之勤勉補拙與阿星之絕頂天資交融互促，外門體魄與身法修練速度 +20%，初始木石材料 +2！',
    startingBonus: Object.freeze({
      timber: 2,
      stone: 2,
      trainSpeedBonus: 0.20,
    }),
  }),

  'duo_synergy.wine_and_fortune': Object.freeze({
    id: 'duo_synergy.wine_and_fortune',
    name: '酒色財氣・江湖雙浪',
    title: '酒色財氣・江湖雙浪開局',
    characters: Object.freeze(['wei_xiaobao', 'linghu_chong']),
    desc: '韋小寶摸金聚財與令狐沖狂狷灑脫相得益彰，初始茶水 +2、銅錢/物資充裕，飲酒與泡茶精力恢復翻倍！',
    startingBonus: Object.freeze({
      tea: 2,
      gold: 50,
      restRecoveryMultiplier: 1.5,
    }),
  }),

  'duo_synergy.fist_and_sword': Object.freeze({
    id: 'duo_synergy.fist_and_sword',
    name: '一拳一劍・雙絕鎮山',
    title: '一拳一劍・雙絕鎮山開局',
    characters: Object.freeze(['guo_jing', 'linghu_chong']),
    desc: '至拙無破綻 vs 無招勝有招，切磋頓悟速率提升，體魄與外功經驗 +25%！',
    startingBonus: Object.freeze({
      trainSpeedBonus: 0.25,
    }),
  }),

  'duo_synergy.custom_destiny_warden': Object.freeze({
    id: 'duo_synergy.custom_destiny_warden',
    name: '天命掌門與護法開局',
    title: '天命掌門與護法同行',
    characters: Object.freeze(['custom_hero', 'any']),
    desc: '自創主角獲得同門護法加持，全屬性修練心得提升 +15%，且繼承所選同門搭檔專屬特技！',
    startingBonus: Object.freeze({
      allExpBonus: 0.15,
      choreSpeedBonus: 0.10,
    }),
  }),

  'duo_synergy.fellow_disciples': Object.freeze({
    id: 'duo_synergy.fellow_disciples',
    name: '同門同心',
    title: '同門風雨同舟',
    characters: Object.freeze(['any', 'any']),
    desc: '同處破道館風雨同舟，互為後盾，基礎工作與休息效率 +10%！',
    startingBonus: Object.freeze({
      choreSpeedBonus: 0.10,
    }),
  }),
});

export function getDuoSynergy(heroTemplateId, fellowTemplateId) {
  if (!heroTemplateId || heroTemplateId === 'custom' || heroTemplateId === 'custom_hero') {
    return DUO_SYNERGIES['duo_synergy.custom_destiny_warden'];
  }

  const pair = new Set([heroTemplateId, fellowTemplateId]);

  if (pair.has('guo_jing') && pair.has('wei_xiaobao')) {
    return DUO_SYNERGIES['duo_synergy.simple_and_slick'];
  }
  if (pair.has('yue_buqun') && pair.has('linghu_chong')) {
    return DUO_SYNERGIES['duo_synergy.mentor_and_rebel'];
  }
  if (pair.has('landlady') && (pair.has('ah_sing') || pair.has('wei_xiaobao'))) {
    return DUO_SYNERGIES['duo_synergy.lion_roar_slacker'];
  }
  if (pair.has('guo_jing') && pair.has('ah_sing')) {
    return DUO_SYNERGIES['duo_synergy.bird_and_prodigy'];
  }
  if (pair.has('wei_xiaobao') && pair.has('linghu_chong')) {
    return DUO_SYNERGIES['duo_synergy.wine_and_fortune'];
  }
  if (pair.has('guo_jing') && pair.has('linghu_chong')) {
    return DUO_SYNERGIES['duo_synergy.fist_and_sword'];
  }

  return DUO_SYNERGIES['duo_synergy.fellow_disciples'];
}

// -------------------------------------------------------------
// 創角與搭檔選擇器 (Starter Duo Selection)
// -------------------------------------------------------------

export function createFellowDisciple(fellowTemplateId, masterId, synergyId = null) {
  const tmpl = ICONIC_TEMPLATES[fellowTemplateId] || ICONIC_TEMPLATES.guo_jing;
  const fellowSectOrigin = resolveSectOrigin(fellowTemplateId);
  return {
    id: `disc.fellow_${fellowTemplateId}`,
    templateId: fellowTemplateId,
    name: tmpl.name,
    title: tmpl.title,
    originMode: 'preset_iconic',
    destinyTreeId: tmpl.destinyTreeId,
    role: 'senior',
    availableForRecruit: false,
    portraitId: tmpl.portraitId,
    portraitUrl: tmpl.portraitUrl,
    patrolStyle: tmpl.patrolStyle,
    starterNote: tmpl.starterNote,
    autopilotWeights: { ...tmpl.autopilotWeights },
    sectOrigin: fellowSectOrigin,
    affinity: 65,
    stats: { ...tmpl.stats },
    traits: [...tmpl.traits],
    innateStats: {
      ...tmpl.innateStats,
      innatePerks: [...tmpl.innateStats.innatePerks],
    },
    starterDuo: {
      isHero: false,
      partnerId: masterId,
      synergyPerkId: synergyId,
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
    carrying: { item: null, amount: 0 },
    housing: { roomId: null, bedId: null },
    decision: {
      tier: 3,
      currentToil: null,
      explain: {
        doing: '初入破道館',
        reason: '同門相依為命',
        nextPlan: '清除前坪雜草備料',
      },
    },
    unlockedArts: [fellowSectOrigin.founderArtName],
    artLevels: {},
  };
}

export function createMasterFromTemplate(heroTemplateId) {
  const tmpl = ICONIC_TEMPLATES[heroTemplateId] || ICONIC_TEMPLATES.yue_buqun;
  const masterSectOrigin = resolveSectOrigin(heroTemplateId);
  return {
    id: tmpl.id,
    templateId: heroTemplateId,
    name: tmpl.name,
    title: tmpl.title,
    originMode: 'preset_iconic',
    destinyTreeId: tmpl.destinyTreeId,
    role: 'master',
    availableForRecruit: false,
    portraitId: tmpl.portraitId,
    portraitUrl: tmpl.portraitUrl,
    patrolStyle: tmpl.patrolStyle,
    starterNote: tmpl.starterNote,
    autopilotWeights: { ...tmpl.autopilotWeights },
    sectOrigin: masterSectOrigin,
    stats: { ...tmpl.stats },
    traits: [...tmpl.traits],
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
      autopilot: { ...tmpl.persona.autopilot, enabled: true },
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
    carrying: { item: null, amount: 0 },
    housing: { roomId: null, bedId: null },
    decision: {
      tier: 3,
      currentToil: null,
      explain: {
        doing: '初任掌門',
        reason: '整飭破道館',
        nextPlan: '清除前坪雜草備料',
      },
    },
    unlockedArts: [masterSectOrigin.founderArtName],
    artLevels: {},
  };
}

export function selectStarterDuo(options = {}) {
  const heroMode = options.heroMode || options.mode || (options.hero?.mode === 'custom_point_buy' ? 'custom' : 'preset');
  let heroTemplateId = options.heroTemplateId || options.presetKey || options.hero?.presetArchetypeId || (heroMode === 'custom' ? 'custom_hero' : null);
  let fellowTemplateId = options.fellowTemplateId || options.partner?.presetArchetypeId || options.fellowPresetKey || null;

  // 自創掌門模式
  if (heroMode === 'custom' || options.hero?.customSettings) {
    const customOpts = options.heroCustom || options.hero?.customSettings || options;
    if (!fellowTemplateId) {
      fellowTemplateId = 'guo_jing';
    }
    const fellowTmpl = ICONIC_TEMPLATES[fellowTemplateId];
    if (!fellowTmpl) {
      return { ok: false, reason: 'INVALID_FELLOW_TEMPLATE' };
    }
    const heroRes = createPersona(customOpts);
    if (!heroRes.ok) {
      return { ok: false, reason: 'DUPLICATE_PARTNER_OR_STATS_OVERFLOW', detail: heroRes.reason };
    }
    const master = heroRes.disciple;
    const duoSynergy = getDuoSynergy('custom_hero', fellowTemplateId);
    const fellowPersona = createFellowDisciple(fellowTemplateId, master.id, duoSynergy.id);
    master.starterDuo = {
      isHero: true,
      partnerId: fellowPersona.id,
      synergyPerkId: duoSynergy.id,
    };
    master.activeDuoSynergy = duoSynergy;

    const masterSectOrigin = master.sectOrigin || resolveSectOrigin(customOpts.customBranch || customOpts.branch || 'palm', customOpts.sectName || customOpts.customSectName);
    const fellowSectOrigin = fellowPersona.sectOrigin || resolveSectOrigin(fellowTemplateId);
    master.sectOrigin = masterSectOrigin;
    fellowPersona.sectOrigin = fellowSectOrigin;

    const yardDualLineageLoadout = {
      trainingPost: masterSectOrigin.trainingPostName,
      trainingPostName: masterSectOrigin.trainingPostName,
      founderArt: masterSectOrigin.founderArtName,
      fellowArt: fellowSectOrigin.founderArtName,
      fellowGuestArt: fellowSectOrigin.founderArtName,
      universalArts: ['《基礎鐵布衫》', '《基礎踏雪無痕》'],
      arts: [
        '《基礎鐵布衫》',
        '《基礎踏雪無痕》',
        masterSectOrigin.founderArtName,
        fellowSectOrigin.founderArtName,
      ],
      unlockedArts: [
        '《基礎鐵布衫》',
        '《基礎踏雪無痕》',
        masterSectOrigin.founderArtName,
        fellowSectOrigin.founderArtName,
      ],
    };
    master.yardDualLineageLoadout = yardDualLineageLoadout;
    master.unlockedArts = [...yardDualLineageLoadout.unlockedArts];

    const roster = createIconicRoster([fellowTemplateId]);
    const recruitPool = roster.filter((d) => d.availableForRecruit);
    return {
      ok: true,
      master,
      playerPersona: master,
      fellowPersona,
      fellowDisciple: fellowPersona,
      activeDuoSynergy: duoSynergy,
      duoSynergy,
      sectOrigin: masterSectOrigin,
      founderMartialSeed: masterSectOrigin.founderArtName,
      fellowMartialSeed: fellowSectOrigin.founderArtName,
      yardDualLineageLoadout,
      recruitPool,
      roster,
    };
  }

  // 經典角色模式
  if (!heroTemplateId) heroTemplateId = 'yue_buqun';
  if (!fellowTemplateId) {
    // 預設互補搭檔
    fellowTemplateId = heroTemplateId === 'guo_jing' ? 'wei_xiaobao'
      : heroTemplateId === 'wei_xiaobao' ? 'guo_jing'
      : heroTemplateId === 'yue_buqun' ? 'linghu_chong'
      : heroTemplateId === 'linghu_chong' ? 'yue_buqun'
      : heroTemplateId === 'landlady' ? 'ah_sing'
      : heroTemplateId === 'ah_sing' ? 'landlady'
      : 'guo_jing';
  }

  // 反例 1：掌門與同門搭檔不可為同一個經典角色！
  if (heroTemplateId === fellowTemplateId) {
    return { ok: false, reason: 'DUPLICATE_PARTNER_OR_STATS_OVERFLOW' };
  }

  const heroTmpl = ICONIC_TEMPLATES[heroTemplateId];
  const fellowTmpl = ICONIC_TEMPLATES[fellowTemplateId];
  if (!heroTmpl || !fellowTmpl) {
    return { ok: false, reason: 'INVALID_TEMPLATE_ID' };
  }

  const duoSynergy = getDuoSynergy(heroTemplateId, fellowTemplateId);
  const master = createMasterFromTemplate(heroTemplateId);
  const fellowPersona = createFellowDisciple(fellowTemplateId, master.id, duoSynergy.id);

  master.starterDuo = {
    isHero: true,
    partnerId: fellowPersona.id,
    synergyPerkId: duoSynergy.id,
  };
  master.activeDuoSynergy = duoSynergy;

  const masterSectOrigin = master.sectOrigin || resolveSectOrigin(heroTemplateId, options.sectName || options.customSectName);
  const fellowSectOrigin = fellowPersona.sectOrigin || resolveSectOrigin(fellowTemplateId);
  master.sectOrigin = masterSectOrigin;
  fellowPersona.sectOrigin = fellowSectOrigin;

  const yardDualLineageLoadout = {
    trainingPost: masterSectOrigin.trainingPostName,
    trainingPostName: masterSectOrigin.trainingPostName,
    founderArt: masterSectOrigin.founderArtName,
    fellowArt: fellowSectOrigin.founderArtName,
    fellowGuestArt: fellowSectOrigin.founderArtName,
    universalArts: ['《基礎鐵布衫》', '《基礎踏雪無痕》'],
    arts: [
      '《基礎鐵布衫》',
      '《基礎踏雪無痕》',
      masterSectOrigin.founderArtName,
      fellowSectOrigin.founderArtName,
    ],
    unlockedArts: [
      '《基礎鐵布衫》',
      '《基礎踏雪無痕》',
      masterSectOrigin.founderArtName,
      fellowSectOrigin.founderArtName,
    ],
  };
  master.yardDualLineageLoadout = yardDualLineageLoadout;
  master.unlockedArts = [...yardDualLineageLoadout.unlockedArts];

  const roster = createIconicRoster([heroTemplateId, fellowTemplateId]);
  const recruitPool = roster.filter((d) => d.availableForRecruit);

  return {
    ok: true,
    master,
    playerPersona: master,
    fellowPersona,
    fellowDisciple: fellowPersona,
    activeDuoSynergy: duoSynergy,
    duoSynergy,
    sectOrigin: masterSectOrigin,
    founderMartialSeed: masterSectOrigin.founderArtName,
    fellowMartialSeed: fellowSectOrigin.founderArtName,
    yardDualLineageLoadout,
    recruitPool,
    roster,
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
    fellowTemplateId = 'guo_jing',
  } = options;

  // 1. 防呆檢核五維配點
  if (destinyBonusPoints !== 0 && destinyBonusPoints !== 10) {
    return { ok: false, reason: 'POINT_BUY_EXCEEDED' };
  }

  const comp = stats.comprehension;
  const consti = stats.constitution ?? stats.bone;
  const str = stats.strength ?? stats.breathing;
  const agi = stats.agility;
  const compo = stats.composure ?? stats.temperament;

  const normalizedStats = {
    comprehension: comp,
    constitution: consti,
    strength: str,
    agility: agi,
    composure: compo,
    bone: consti,
    breathing: str,
    temperament: compo,
  };

  let totalPoints = 0;
  for (const stat of STAT_NAMES) {
    const val = normalizedStats[stat];
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

  const masterSectOrigin = resolveSectOrigin(options.customBranch || options.branch || 'palm', options.sectName || options.customSectName || '青雲門');
  const fellowSectOrigin = resolveSectOrigin(fellowTemplateId);
  const yardDualLineageLoadout = {
    trainingPost: masterSectOrigin.trainingPostName,
    trainingPostName: masterSectOrigin.trainingPostName,
    founderArt: masterSectOrigin.founderArtName,
    fellowArt: fellowSectOrigin.founderArtName,
    fellowGuestArt: fellowSectOrigin.founderArtName,
    universalArts: ['《基礎鐵布衫》', '《基礎踏雪無痕》'],
    arts: [
      '《基礎鐵布衫》',
      '《基礎踏雪無痕》',
      masterSectOrigin.founderArtName,
      fellowSectOrigin.founderArtName,
    ],
    unlockedArts: [
      '《基礎鐵布衫》',
      '《基礎踏雪無痕》',
      masterSectOrigin.founderArtName,
      fellowSectOrigin.founderArtName,
    ],
  };

  const disciple = {
    id,
    templateId: 'custom_hero',
    name,
    title: '天命掌門',
    patrolStyle: 'orthodox_steady',
    portraitId: 'custom_hero',
    portraitUrl: PORTRAIT_MANIFEST.custom_hero.portraitUrl,
    originMode: 'custom_point_buy',
    destinyTreeId,
    role: 'master',
    availableForRecruit: false,
    starterNote: '天命掌門，先天五維自由配點，情境問卷推導心印與道家稱號，搭配初始同門護法開局',
    autopilotWeights: { build: 0.60, chore: 0.60, train: 0.60, socialize: 0.60, explore: 0.60 },
    sectOrigin: masterSectOrigin,
    yardDualLineageLoadout,
    stats: { ...normalizedStats },
    traits: [...innatePerks],
    innateStats: {
      comprehension: normalizedStats.comprehension,
      constitution: normalizedStats.constitution,
      strength: normalizedStats.strength,
      agility: normalizedStats.agility,
      composure: normalizedStats.composure,
      bone: normalizedStats.bone,
      breathing: normalizedStats.breathing,
      temperament: normalizedStats.temperament,
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
    unlockedArts: [...yardDualLineageLoadout.unlockedArts],
    artLevels: {},
  };

  const duoSynergy = getDuoSynergy('custom_hero', fellowTemplateId);
  const fellowPersona = createFellowDisciple(fellowTemplateId, disciple.id, duoSynergy.id);
  disciple.starterDuo = {
    isHero: true,
    partnerId: fellowPersona.id,
    synergyPerkId: duoSynergy.id,
  };
  disciple.activeDuoSynergy = duoSynergy;

  return {
    ok: true,
    disciple,
    master: disciple,
    playerPersona: disciple,
    fellowPersona,
    fellowDisciple: fellowPersona,
    activeDuoSynergy: duoSynergy,
    duoSynergy,
    sectOrigin: masterSectOrigin,
    founderMartialSeed: masterSectOrigin.founderArtName,
    fellowMartialSeed: fellowSectOrigin.founderArtName,
    yardDualLineageLoadout,
  };
}

export function createIconicRoster(chosenKeys = []) {
  if (typeof chosenKeys === 'string') chosenKeys = [chosenKeys];
  const heroKey = chosenKeys[0] || null;
  const fellowKey = chosenKeys[1] || null;
  const roster = [];
  const keys = ['yue_buqun', 'guo_jing', 'wei_xiaobao', 'linghu_chong', 'ah_sing', 'landlady'];

  for (const k of keys) {
    const tmpl = ICONIC_TEMPLATES[k];
    const isMaster = (k === heroKey);
    const isFellow = (k === fellowKey);
    const isChosen = isMaster || isFellow;
    const sectOrigin = resolveSectOrigin(k);

    const disciple = {
      id: tmpl.id,
      templateId: k,
      name: tmpl.name,
      title: tmpl.title,
      originMode: 'preset_iconic',
      destinyTreeId: tmpl.destinyTreeId,
      role: isMaster ? 'master' : isFellow ? 'senior' : 'outer_disciple',
      availableForRecruit: !isChosen,
      portraitId: tmpl.portraitId,
      portraitUrl: tmpl.portraitUrl,
      patrolStyle: tmpl.patrolStyle,
      starterNote: tmpl.starterNote,
      autopilotWeights: { ...tmpl.autopilotWeights },
      sectOrigin,
      stats: { ...tmpl.stats },
      traits: [...tmpl.traits],
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
          doing: isMaster ? '初任掌門' : isFellow ? '同門相依' : '候選招募',
          reason: isMaster ? '整飭破道館' : isFellow ? '同門相依' : '山下奇遇池中',
          nextPlan: isMaster ? '清除前坪雜草備料' : isFellow ? '除草備料' : '等待機緣',
        },
      },
      unlockedArts: [sectOrigin.founderArtName],
      artLevels: {},
    };
    roster.push(disciple);
  }

  return roster;
}

export function createPresetDisciple(presetKey, options = {}) {
  const fellowTemplateId = typeof options === 'string' ? options : options.fellowTemplateId;
  const duoRes = selectStarterDuo({
    heroMode: 'preset',
    heroTemplateId: presetKey,
    fellowTemplateId,
  });
  if (!duoRes.ok) return duoRes;
  return {
    ok: true,
    master: duoRes.master,
    playerPersona: duoRes.master,
    fellowPersona: duoRes.fellowPersona,
    fellowDisciple: duoRes.fellowDisciple,
    activeDuoSynergy: duoRes.activeDuoSynergy,
    duoSynergy: duoRes.duoSynergy,
    sectOrigin: duoRes.sectOrigin,
    founderMartialSeed: duoRes.founderMartialSeed,
    fellowMartialSeed: duoRes.fellowMartialSeed,
    yardDualLineageLoadout: duoRes.yardDualLineageLoadout,
    recruitPool: duoRes.recruitPool,
    roster: duoRes.roster,
  };
}
