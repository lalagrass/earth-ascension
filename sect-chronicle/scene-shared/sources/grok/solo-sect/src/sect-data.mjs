// v1.35 門派身分（ROADMAP §18）：主角＝門派。純資料，無 import（arts.mjs 也會用）
// bias：剛柔巧拙偏向（學該標籤武學速度，合計夾在 ±15%）；tree：本派武學；ban：門規明文禁止（學了＝叛派）
// rules：門規（違反只加違心）；fac：鎮派設施；rivals：宿敵（守巡山關卡）；fav：名俠加權；recruit：招人風格
export const SECT_K = { biasCap: 0.15, outside: 0.7, ruleCd: 3, rivalRep: 3, rivalScale: 1.15, keepWeek: 1, defectRep: 3, expelAt: 3, facRep: 5 };
export const RULE_LIB = {
  demon: { text: '不得與魔教往來', who: ['renyingying', 'tianboguang', 'zhaomin', 'dongfangbubai'] },
  hoard: { text: '不囤積、不吃獨食', food: 40 },
  rescue: { text: '同門有難，不得見死不救', hp: 25 },
  heal: { text: '行善去惡、救死扶傷', hp: 25, herb: 2 },
  rent: { text: '準時交租，不欠一文', coin: 5 },
  share: { text: '兄弟有福同享', coin: 200, mood: 30 },
  heart: { text: '不許冷落同門', mood: 20 },
  fanqing: { text: '反清復明（兩頭都賺不算違心——韋小寶的特權）', flavor: true },
  jiu: { text: '劍不離手、酒不離口', flavor: true },
  qi: { text: '以氣御劍，氣宗為正', flavor: true },
};
export const SECTS = {
  gaibang: { name: '丐幫', plaque: '丐幫・北丐一脈', color: '#8a5a2b', flag: '丐', bias: { 剛: 0.1, 拙: 0.05 }, tree: ['xianglong', 'dagou', 'pushPalm', 'basicFist'], ban: [], rules: ['hoard', 'rescue'],
    fac: { name: '打狗棒堂', cost: { wood: 10, coin: 10 }, daily: { food: 2 }, desc: '污衣淨衣議事；弟子沿村乞討，每日糧 +2' }, rivals: ['鐵掌幫', '白駝山'], fav: ['hongqigong', 'huangrong'],
    recruit: { root: 1, wu: -1, text: '一個根骨粗壯、腦筋不太靈光的小乞兒捧著破碗上山。' } },
  qizong: { name: '華山派', plaque: '華山派・氣宗', color: '#3b5f8a', flag: '華', bias: { 柔: 0.15, 快: -0.1 }, tree: ['zixia', 'breath', 'wavePalm'], ban: ['kuihua', 'huagu', 'hama'], rules: ['demon', 'qi'],
    fac: { name: '思過崖', cost: { stone: 10, coin: 6 }, ease: 3, desc: '面壁思過：每三天消一層掌門違心' }, rivals: ['嵩山派', '華山劍宗'], fav: ['linghuchong', 'ningzhongze', 'linpingzhi'],
    recruit: { wu: 1, text: '一位世家子弟執禮甚恭，遞上拜帖。' } },
  jianzong: { name: '華山劍宗', plaque: '思過崖・劍宗', color: '#5b6b7a', flag: '劍', bias: { 巧: 0.15 }, tree: ['dugu', 'wavePalm', 'snowStep'], ban: [], rules: ['rescue', 'jiu'],
    fac: { name: '酒窖', cost: { wood: 8, coin: 8 }, mood: 5, desc: '好酒在窖：掌門每日心情 +5' }, rivals: ['華山氣宗', '嵩山派'], fav: ['renyingying', 'tianboguang', 'yuelingshan'],
    recruit: { mood: 10, text: '一個背著酒葫蘆的浪子聽說這裡管酒，笑嘻嘻來拜師。' } },
  mingjiao: { name: '明教', plaque: '明教・光明頂', color: '#b33a1f', flag: '火', bias: { 柔: 0.08, 巧: 0.07 }, tree: ['jiuyang', 'qiankun', 'taiji', 'breath'], ban: [], rules: ['heal', 'rescue'],
    fac: { name: '聖火壇', cost: { stone: 10, coin: 10 }, gain: 1.1, desc: '聖火不滅：全派練武 +10%' }, rivals: ['少林', '武當', '峨眉', '崑崙', '崆峒', '華山'], fav: ['zhaomin', 'xiaozhao'],
    recruit: { hp: 60, text: '一個帶傷的明教教眾跌跌撞撞上山求醫，傷好後不肯走了。' } },
  tiandihui: { name: '天地會', plaque: '天地會・青木堂', color: '#2f6a3a', flag: '洪', bias: { 巧: 0.05 }, tree: ['snowStep', 'huagu'], ban: [], rules: ['fanqing', 'share'],
    fac: { name: '香堂', cost: { wood: 8, coin: 6 }, daily: { coin: 3 }, desc: '拜香堂、收會費：每日香火錢 +3' }, rivals: ['神龍教', '朝廷鷹犬'], fav: ['shuanger', 'ake', 'haidafu'],
    recruit: { trait: 'glib', text: '一個市井混混對了暗號：「地振高岡，一派溪山千古秀。」' } },
  zhulong: { name: '豬籠城寨', plaque: '豬籠城寨', color: '#8a7a3a', flag: '寨', bias: { 剛: 0.15 }, tree: ['rulai', 'tantui', 'tiexian', 'bagua', 'shihou', 'basicFist'], ban: [], rules: ['rent', 'heart'],
    fac: { name: '大雜院', cost: { wood: 10, stone: 4 }, daily: { food: 1, coin: 1 }, desc: '包租婆收租：每日糧 +1、香火錢 +1' }, rivals: ['斧頭幫', '火雲邪神'], fav: ['baozupo', 'baozugong', 'afang'],
    recruit: { skill: 'strength', text: '一個扛米的苦力放下麻袋：「聽說這裡包吃包住？」' } },
  wuming: { name: '無名小派', plaque: '無名小派', color: '#6a5a4a', flag: '武', bias: {}, tree: [], ban: [], rules: [],
    fac: { name: '祖師堂', cost: { wood: 8, stone: 4 }, daily: { rep: 0.5 }, desc: '供奉開山祖師：名聲每日 +0.5' }, rivals: [], fav: [],
    recruit: { text: '一個慕名而來的年輕人上山拜師。' } },
};
export const HERO_SECT = { guojing: 'gaibang', yuebuqun: 'qizong', linghuchong: 'jianzong', zhangwuji: 'mingjiao', weixiaobao: 'tiandihui', axing: 'zhulong' };
// 自創主角：九問主價值 → 流派偏向＋一條門規
export const CUSTOM_BY_VALUE = { xia: ['剛', 'rescue'], sect: ['拙', 'hoard'], qing: ['柔', 'heart'], free: ['巧', 'heart'], wu: ['拙', 'rescue'], fame: ['剛', 'rent'] };
export const CUSTOM_RIVALS = ['青城派', '鐵掌幫', '星宿派'];
export function sectBiasMul(d, a) { // [流派偏向, 外門] 兩個乘數；沒門派資料的弟子回 [1,1]
  if (!d.stree) return [1, 1];
  const b = d.sbias || {}, sum = (a.tags || []).reduce((x, t) => x + (b[t] || 0), 0), m = 1 + Math.max(-SECT_K.biasCap, Math.min(SECT_K.biasCap, sum));
  const out = a.classic && !a.signature && !d.stree.includes(a.id) ? SECT_K.outside : 1; // 名俠招牌＝客傳，不罰
  return [m, out];
}
