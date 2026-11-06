// N48：只供畫面使用的動作資料。招序採釋德建系的 22 段（含起收），
// 姿勢由本專案自行擺出，沒有複製任何現代圖解或授權不明的舊插圖。
// source: https://alphabethankakueisuj.livedoor.blog/archives/1642688.html
// source: https://www.sohu.com/a/207559342_768497
// 每式四個關鍵架子；renderer 對所有人物使用同一個補間器。
export const POSTURES = {
  salute: { legs: 'stand', arms: 'salute', lean: 0 },
  ready: { legs: 'stand', arms: 'guard', lean: 0 },
  sink: { legs: 'horse', arms: 'guard', lean: 0 },
  leftStep: { legs: 'leftBow', arms: 'guard', lean: -3 },
  rightStep: { legs: 'rightBow', arms: 'guard', lean: 3 },
  leftChop: { legs: 'leftBow', arms: 'leftChop', lean: -4 },
  rightChop: { legs: 'rightBow', arms: 'rightChop', lean: 4 },
  leftPalm: { legs: 'leftBow', arms: 'leftPalm', lean: -5 },
  rightPalm: { legs: 'rightBow', arms: 'rightPalm', lean: 5 },
  doublePalm: { legs: 'horse', arms: 'doublePalm', lean: 0 },
  highPalm: { legs: 'leftBow', arms: 'highPalm', lean: -3 },
  lowPalm: { legs: 'rightBow', arms: 'lowPalm', lean: 4 },
  block: { legs: 'horse', arms: 'block', lean: -3 },
  leftElbow: { legs: 'leftBow', arms: 'leftElbow', lean: -7 },
  rightElbow: { legs: 'rightBow', arms: 'rightElbow', lean: 7 },
  leftFist: { legs: 'leftBow', arms: 'leftFist', lean: -5 },
  rightFist: { legs: 'rightBow', arms: 'rightFist', lean: 5 },
  doubleFist: { legs: 'horse', arms: 'doubleFist', lean: 0 },
  downFist: { legs: 'crouch', arms: 'downFist', lean: 6 },
  backFist: { legs: 'rightBow', arms: 'backFist', lean: 5 },
  doubleUp: { legs: 'oneLeg', arms: 'doubleUp', lean: 0 },
  doubleDownPalm: { legs: 'horse', arms: 'doubleDownPalm', lean: 0 },
  tiger: { legs: 'crouch', arms: 'tiger', lean: 4 },
  wing: { legs: 'oneLeg', arms: 'wing', lean: -2 },
  crouch: { legs: 'crouch', arms: 'block', lean: 7 },
  leftKick: { legs: 'leftKick', arms: 'guard', lean: -5 },
  rightKick: { legs: 'rightKick', arms: 'guard', lean: 5 },
  swordReady: { legs: 'rightBow', arms: 'swordReady', lean: 3, weapon: 'sword' },
  swordCut: { legs: 'leftBow', arms: 'swordCut', lean: -5, weapon: 'sword' },
  swordThrust: { legs: 'leftBow', arms: 'swordThrust', lean: -5, weapon: 'sword' },
  bladeReady: { legs: 'horse', arms: 'bladeReady', lean: 2, weapon: 'blade' },
  bladeCut: { legs: 'rightBow', arms: 'bladeCut', lean: 6, weapon: 'blade' },
  staffReady: { legs: 'horse', arms: 'staffReady', lean: 0, weapon: 'staff' },
  staffThrust: { legs: 'leftBow', arms: 'staffThrust', lean: -5, weapon: 'staff' },
};

const form = (name, poses) => ({ name, poses });
export const LUOHAN_EIGHTEEN_HANDS = [
  form('朝山拜佛', ['ready', 'salute', 'sink', 'salute']),
  form('斬手劈心掌', ['ready', 'rightStep', 'block', 'rightChop']),
  form('亮翅斬手劈心掌', ['ready', 'wing', 'leftStep', 'leftChop']),
  form('撥攔連三掌', ['rightStep', 'rightPalm', 'leftPalm', 'rightPalm']),
  form('斬手穿喉下劈掌', ['ready', 'leftChop', 'highPalm', 'rightChop']),
  form('托塔雙推山', ['sink', 'doubleUp', 'rightStep', 'doublePalm']),
  form('霸王鞭伏虎掌', ['rightStep', 'rightChop', 'crouch', 'leftPalm']),
  form('扳面掌', ['ready', 'block', 'leftStep', 'highPalm']),
  form('力貫千斤砸', ['rightStep', 'wing', 'crouch', 'downFist']),
  form('回身頂心肘', ['leftStep', 'block', 'rightStep', 'rightElbow']),
  form('火龍步斬手下劈掌', ['rightStep', 'wing', 'rightChop', 'crouch']),
  form('撩手下插掌', ['sink', 'leftStep', 'doubleUp', 'doublePalm']),
  form('雙摘襠', ['doubleUp', 'sink', 'block', 'doubleFist']),
  form('雙衝錘', ['sink', 'rightStep', 'leftFist', 'doubleFist']),
  form('墊步連三錘', ['leftStep', 'leftFist', 'rightFist', 'doubleFist']),
  form('回頂肘', ['rightStep', 'block', 'leftStep', 'leftElbow']),
  form('天地拳', ['sink', 'rightFist', 'backFist', 'downFist']),
  form('馬步雙摔掌', ['ready', 'sink', 'wing', 'doubleDownPalm']),
  form('白鶴亮翅', ['leftStep', 'doublePalm', 'wing', 'highPalm']),
  form('仙人歸洞顯法像', ['rightStep', 'wing', 'leftStep', 'rightPalm']),
  form('羅漢打虎', ['leftStep', 'crouch', 'tiger', 'downFist']),
  form('歸山拜佛', ['ready', 'leftStep', 'doubleDownPalm', 'salute']),
];

const generic = (names, frames) => names.map((name, i) => form(name, frames[i]));
export const ROUTINES = {
  luohan18: { name: '羅漢十八手', forms: LUOHAN_EIGHTEEN_HANDS, generic: false },
  fist: { name: '拳', forms: generic(['立架', '直拳', '回護'], [['ready', 'sink', 'leftFist', 'rightFist'], ['rightStep', 'rightFist', 'leftStep', 'leftFist'], ['block', 'leftElbow', 'ready', 'sink']]), generic: true },
  palm: { name: '掌', forms: generic(['開掌', '推掌', '收掌'], [['ready', 'wing', 'leftPalm', 'rightPalm'], ['leftStep', 'leftPalm', 'rightStep', 'doublePalm'], ['block', 'lowPalm', 'ready', 'salute']]), generic: true },
  leg: { name: '腿', forms: generic(['提膝', '踢腿', '落步'], [['ready', 'wing', 'leftKick', 'sink'], ['rightStep', 'rightKick', 'leftStep', 'leftKick'], ['block', 'sink', 'ready', 'rightStep']]), generic: true },
  sword: { name: '劍', forms: generic(['持劍', '劈劍', '刺劍'], [['ready', 'swordReady', 'swordCut', 'swordReady'], ['swordReady', 'leftStep', 'swordCut', 'rightStep'], ['swordReady', 'swordThrust', 'swordCut', 'swordReady']]), generic: true },
  blade: { name: '刀', forms: generic(['持刀', '劈刀', '收刀'], [['ready', 'bladeReady', 'bladeCut', 'bladeReady'], ['rightStep', 'bladeCut', 'leftStep', 'bladeCut'], ['block', 'bladeCut', 'bladeReady', 'ready']]), generic: true },
  staff: { name: '棍', forms: generic(['持棍', '掃棍', '突棍'], [['ready', 'staffReady', 'staffThrust', 'staffReady'], ['staffReady', 'leftStep', 'rightStep', 'staffThrust'], ['block', 'staffThrust', 'staffReady', 'ready']]), generic: true },
};

export const COMBAT_POSES = {
  intercept: ['ready', 'leftStep', 'rightFist'],
  entryDodge: ['ready', 'crouch', 'leftStep'],
  parry: ['ready', 'block', 'leftPalm'],
  hit: ['ready', 'rightStep', 'crouch'],
};

export const COMBAT_MOVE_SETS = {
  fist: [['ready', 'leftStep', 'rightFist'], ['ready', 'rightStep', 'leftFist'], ['block', 'sink', 'doubleFist'], ['ready', 'leftElbow', 'rightFist']],
  palm: [['ready', 'leftStep', 'rightPalm'], ['block', 'rightStep', 'leftPalm'], ['sink', 'wing', 'doublePalm'], ['ready', 'lowPalm', 'highPalm']],
  leg: [['ready', 'wing', 'rightKick'], ['ready', 'leftStep', 'leftKick'], ['block', 'rightStep', 'rightKick'], ['ready', 'crouch', 'leftKick']],
  sword: [['swordReady', 'leftStep', 'swordCut'], ['swordReady', 'rightStep', 'swordThrust'], ['swordReady', 'wing', 'swordCut'], ['swordReady', 'block', 'swordThrust']],
  blade: [['bladeReady', 'rightStep', 'bladeCut'], ['bladeReady', 'leftStep', 'bladeCut'], ['bladeReady', 'wing', 'bladeCut'], ['bladeReady', 'block', 'bladeCut']],
  staff: [['staffReady', 'leftStep', 'staffThrust'], ['staffReady', 'rightStep', 'staffThrust'], ['staffReady', 'wing', 'staffThrust'], ['staffReady', 'block', 'staffThrust']],
};

export function routineFrame(art, d, t) {
  const routine = ROUTINES[art?.routine] || ROUTINES.fist;
  const skill = Math.min(1, Math.max(0, (d?.arts?.[art?.id]?.xp || 0) / 100));
  // 一式約 2 秒，讓 30 秒早課能辨出換式；新手每式停半秒再接。
  const formSeconds = 2 + (1 - skill) * 0.5;
  const f = Math.floor(t / formSeconds) % routine.forms.length;
  const u = t / formSeconds % 1;
  const poses = routine.forms[f].poses;
  const wrong = skill < 0.35 && f % 5 === 3 && u < 0.22;
  const phase = Math.max(0, (u - (1 - skill) * 0.18) / (1 - (1 - skill) * 0.18));
  return { routine, form: f + 1, formName: routine.forms[f].name, poses, phase, wrong };
}

export function lerpPose(a, b, u) {
  const x = POSTURES[a] || POSTURES.ready, y = POSTURES[b] || POSTURES.ready;
  return { from: x, to: y, u: Math.min(1, Math.max(0, u)) };
}
