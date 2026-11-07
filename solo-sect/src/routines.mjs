import { playbackParams } from './growth-playback.mjs';
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
  axeReady: { legs:'horse',arms:'bladeReady',lean:0,weapon:'axe' },
  axeSwing: { legs:'horse',arms:'bladeCut',lean:4,weapon:'axe' },
  carry: { legs:'stand',arms:'carry',lean:0 },
  walkLeft: { legs:'leftBow',arms:'rightPalm',lean:-2 },
  walkRight: { legs:'rightBow',arms:'leftPalm',lean:2 },
  sit: { legs:'sit',arms:'sit',lean:1 },
  pick: { legs:'crouch',arms:'pick',lean:6 },
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
// 出自 Phase 4 規格：純陽拳十二段畫面姿勢，沿用本專案自繪骨架，不讀外部拳譜圖。
export const CHUNYANG_FORMS = generic(
  ['守一立架', '抱元沉肩', '左步護中', '右步護中', '純陽直進', '轉身回護', '三花起勢', '左掌開門', '右掌開門', '沉身蓄勁', '雙拳貫出', '收勢歸一'],
  [['ready', 'salute', 'sink', 'ready'], ['ready', 'sink', 'block', 'sink'], ['sink', 'leftStep', 'block', 'leftFist'], ['sink', 'rightStep', 'block', 'rightFist'], ['ready', 'rightStep', 'rightFist', 'leftFist'], ['leftStep', 'block', 'rightStep', 'ready'], ['sink', 'doubleUp', 'wing', 'doubleFist'], ['leftStep', 'leftPalm', 'leftFist', 'block'], ['rightStep', 'rightPalm', 'rightFist', 'block'], ['ready', 'sink', 'downFist', 'doubleUp'], ['rightStep', 'rightFist', 'leftFist', 'doubleFist'], ['doubleFist', 'block', 'ready', 'salute']],
);
export const ROUTINES = {
  chunyang: { name: '純陽拳十二式', forms: CHUNYANG_FORMS, generic: false },
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

export { COMBAT_MOVE_SETS } from './combat-pose-sets.mjs';

// 每種動作只有此一序列；初學/熟練只讀不同的播放參數。
// Smart object 的 pose 名稱只選此表；任務／地點缺資料時由 renderer 選 stand。
export const DAILY_POSES = {
  stand: ['ready', 'ready'],
  walk: ['walkLeft', 'ready', 'walkRight', 'ready'],
  crouch: ['ready', 'crouch', 'pick', 'crouch'],
  sit: ['sit', 'sit'],
  chop: ['axeReady', 'axeReady', 'axeSwing', 'axeReady'],
  pick: ['crouch', 'pick', 'crouch'],
  carry: ['carry', 'carry'],
  water: ['carry', 'carry'],
};
export const EXTRA_TASK_POSES = { water: 'water' };
export function routineFrame(art, d, t, suppliedPlayback=null) {
  const routine=ROUTINES[art?.routine]||ROUTINES.fist, playback=suppliedPlayback||playbackParams(d,art);
  const f=Math.floor(t/playback.formSeconds)%routine.forms.length;
  const seconds=t%playback.formSeconds;
  const phase=Math.max(0,(seconds-playback.pause)/(playback.formSeconds-playback.pause));
  return {routine,form:f+1,formName:routine.forms[f].name,poses:routine.forms[f].poses,phase,wrong:false,playback};
}

export function lerpPose(a, b, u) {
  const x = POSTURES[a] || POSTURES.ready, y = POSTURES[b] || POSTURES.ready;
  return { from: x, to: y, u: Math.min(1, Math.max(0, u)) };
}
