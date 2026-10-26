// v1.7 活動打分＝純資料：每列一個候選活動。sim.mjs 的 scoreRows() 是唯一解讀器。
// when：前提（PRED 名，全部要成立）；tiers：依序第一個 if 成立者生效；v：數值規格；why：理由模板（{路徑}）；layer：仲裁層
// 數值規格：數字，或 { pick:[路徑,真,假] | lin:[路徑, 基準] → (基準−值), mul:[數字|路徑|pick…], plus:數字 }；tr.* 路徑缺省為 1
export const SCORE = [
  { act: 'rest', tiers: [{ if: 'tired', v: 130, why: '精力見底，睡到飽再起', layer: 'need' }, { if: 'wake', v: { lin: ['n.energy', 100], mul: [0.6] }, why: '有點累' }] },
  { act: 'rest', when: ['hurt'], v: 90, why: '傷還沒好，躺著養傷', layer: 'need' },
  { act: 'eat', when: ['hasFood'], tiers: [{ if: 'starving', v: 160, why: '餓得發昏，先吃', layer: 'need' }, { if: 'hungry', v: 95, why: '餓了', layer: 'need' }, { v: { lin: ['n.hunger', 100], mul: [0.6] }, why: '順便吃點' }] },
  { act: 'chat', when: ['others'], v: { lin: ['n.social', 100], mul: [0.6, 'tr.social', 'tr.playful', 0.8] }, why: '想找人說話' },
  { act: 'pass', when: ['pp'], v: 'passScore', why: '{passWhy}' },
  { act: 'leisure', tiers: [{ if: 'dull', v: { lin: ['fun', 100], mul: [0.55] }, why: '悶得慌，想偷閒' }, { v: { lin: ['fun', 100], mul: [0.55] }, why: '想坐坐看雲' }] },
  { act: 'encourage', when: ['encourageOk'], v: { lin: ['low.mood', 35], mul: [1.5], plus: 40 }, why: '{low.name}心情低落，去打打氣' },
  { act: 'learn', when: ['pending'], v: 80, why: '師父能傳「{pendingName}」' },
  { act: 'meditate', tiers: [{ if: 'btOk', v: 75, why: '「{btName}」卡在瓶頸，打坐衝關' }, { if: 'wexin', v: { lin: ['negWexin', 0], mul: [20], plus: 30 }, why: '心中違心，閉關靜坐' }] },
  { act: 'train', v: { pick: ['d.adult', 40, 18], mul: ['tr.diligent'] }, why: '練功變強' },
  { act: 'spar', when: ['sparOk'], v: { pick: [true, 34, 34], mul: ['tr.diligent'] }, why: '找人切磋' },
  { act: 'chop', when: ['woodRoom'], tiers: [{ if: 'shortWood', v: 50, why: '工地缺木' }, { v: 28, why: '備柴' }] },
  { act: 'quarry', when: ['stoneRoom'], tiers: [{ if: 'shortStone', v: 50, why: '工地缺石' }, { v: 14, why: '備石' }] },
  { act: 'farm', tiers: [{ if: 'foodLow', v: 'FS.farm', why: '存糧見底，先顧菜畦', layer: 'need' }, { if: 'ripe', v: 50, why: '菜熟了' }, { v: 30, why: '菜畦空著該播種' }] },
  { act: 'forage', v: { pick: [true, 18, 18], mul: ['tr.playful'] }, why: '採藥' },
  { gen: true }, // v1.6 建築活動（ACTIVITIES[].gen）在這個位置展開
  { act: 'build', when: ['siteWork'], v: { pick: [true, 55, 55], mul: [{ pick: ['d.adult', 1, 0.6] }] }, why: '{buildWhy}' },
  { act: 'rest', when: ['nightRest'], v: 60, why: '入夜歇息' },
  { act: 'cook', when: ['cookable'], v: { lin: ['food', 10], mul: [4], plus: 30 }, why: '灶上該煮飯了' },
];
// v1.8 打分後處理＝純資料（原 scoreActs 內的 if）：依序套用；sim.mjs 的 postRows() 是唯一解讀器。
// who：labor／notLabor；if：前提（POST_PRED 名，「!」開頭取反）；acts／except：作用範圍（陣列或 K.* 常數名）；
// drop：true 或述詞名 → 移除；muls：[{ name, v, if?, hide1? }] → 推入外部組倍率並把乘積寫到 f[key]
export const SCORE_POST = [
  { acts: ['farm'], drop: '!plotWork' },
  { who: 'labor', except: 'K.LABOR_ACTS', drop: true },
  { who: 'labor', acts: ['chop', 'quarry', 'build'], muls: [{ name: '雇工', v: 'K.LABOR_WORK_MUL' }], key: 'labor' },
  { who: 'notLabor', acts: 'K.CHORE_ACTS', if: ['skip'], drop: true },
  { who: 'notLabor', acts: 'K.CHORE_ACTS', if: ['outer', '!em'], drop: '!myDuty', muls: [{ name: '優先度', v: 'prioMul', hide1: true }, { name: '日課未滿', v: 'K.QUOTA.dutyMul', if: 'owe' }], key: 'duty' },
  { who: 'notLabor', if: ['foodLow'], except: 'FS.keep', muls: [{ name: '糧荒', v: 'FS.gateMul' }], key: 'food' }, // v1.76 糧荒
  { who: 'notLabor', if: ['head'], acts: ['train'], muls: [{ name: '首徒', v: 'K.QUOTA.headTrain' }], key: 'head' },
];
