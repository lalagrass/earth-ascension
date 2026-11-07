// N32：身體／工具／敵人皆為資料，不以角色名稱分支。秒數與尺度詳 combat.md。
export const BODY_TIMING = { reaction: 0.6, simple: 0.2, step: 0.3, guard: 0, recovery: 0.55, bodyMass: 70, forceSkill: 0.2 };
const action = (id, name, wind, skill, range, dmg, force, type, poses, extra = {}) => ({ id, name, wind, skill, range, dmg, force, type, poses, cd: wind + BODY_TIMING.recovery, req: 999, aoe: 0, color: '#8a6a4a', body: true, ...extra });
export const BODY_MOVES = [
  action('bodyPunch', '揮拳', .45, 'palm', 28, 4, 12, 'fist', ['ready','leftStep','rightFist']),
  action('bodyPush', '推', .5, 'strength', 24, 2, 16, 'push', ['ready','sink','doublePalm'], { unbalance: true, impulse: 70 }),
  action('bodyGrab', '抱', .5, 'strength', 20, 2, 16, 'grapple', ['ready','sink','doubleFist'], { unbalance: true, impulse: 70 }),
  action('bodyKick', '踢', .6, 'leg', 38, 6, 22, 'kick', ['ready','wing','rightKick'], { impulse: 90 }),
  action('toolStaff', '棍', .7, 'strength', 65, 8, 28, 'staff', ['staffReady','leftStep','staffThrust'], { tool: 'staff', impulse: 90 }),
  action('toolPole', '扁擔', .7, 'strength', 65, 8, 28, 'staff', ['staffReady','leftStep','staffThrust'], { tool: 'pole', impulse: 90 }),
  action('toolHoe', '鋤頭', .7, 'strength', 60, 8, 28, 'staff', ['staffReady','rightStep','staffThrust'], { tool: 'hoe', impulse: 90 }),
  action('toolKnife', '柴刀', .55, 'strength', 32, 7, 24, 'blade', ['bladeReady','rightStep','bladeCut'], { tool: 'knife', cut: true, looseGrip: true }),
  action('toolStone', '擲石', .8, 'strength', 120, 5, 18, 'stone', ['ready','highPalm','rightPalm'], { tool: 'stone', consumable: true }),
];
export const BODY_BASE = BODY_MOVES.filter((m) => !m.tool).map((m) => m.id);
export const INSTINCTS = { guard: { name: '抬手擋', action: 0 }, back: { name: '退', action: BODY_TIMING.step }, shout: { name: '喊', action: 0 } };
export const WORK_TOOLS = { chop: 'knife', farm: 'hoe', water: 'pole', quarry: 'stone', forage: 'staff' };
export const FOE_ACTIONS = {
  hare: { body:{balance:35},escapeSource:'den',hands:0,mass: 8, armor:1, force:5, speed:35, moves:[{id:'hareNip',name:'回頭咬',family:'bite',type:'bite',wind:.4,force:5,range:24,bite:true}] },
  dog: { body:{balance:50},escapeSource:'den',hands:0,mass: 24, armor: 2, force: 10, speed: 38, chase: true, circle: true, threat: { stone: 'back', staff: 'anger' }, moves: [{ id:'dogBite', name:'撲咬', family:'bite', wind:.4, force:10, range:26, bite:true }] },
  boar: { body:{balance:70},injuryAnger:true,escapeSource:'habitat',hands:0,mass: 120, armor: 32, force: 40, speed: 18, moves: [{id:'survivorFeint',name:'假衝',wind:.5,force:40,range:80,feint:true,requiresSurvived:true,once:true},{ id:'boarCharge',name:'衝撞',family:'charge',type:'charge',wind:1,force:40,range:80,minDistance:40,travel:true }, { id:'boarToss',name:'拱挑',family:'charge',type:'charge',wind:.5,force:32,range:26 }] },
  wolf: { body:{balance:60},escapeSource:'habitat',hands:0,mass: 38, armor: 4, force: 24, speed: 40, chase:true, circle:true, moves:[{id:'wolfLunge',name:'側撲',family:'pounce',type:'bite',wind:.55,force:24,range:54,travel:true},{id:'wolfBite',name:'咬',family:'bite',type:'bite',wind:.4,force:20,range:25,bite:true}] },
  snake: { body:{balance:25},escapeSource:'habitat',hands:0,mass: 6, armor: 1, force: 8, speed: 14, moves:[{id:'snakeFang',name:'毒牙前探',family:'bite',type:'bite',wind:.65,force:8,range:26,bite:true},{id:'snakeCoil',name:'盤身纏',family:'grapple',type:'grapple',wind:.8,force:9,range:18}] },
  bandit: { body:{balance:60},escapeSource:'gate',hands:2,mass:70, armor:8, force:14, speed:28, moves:[{ id:'looterStone',type:'stone',name:'丟石頭',family:'throw',wind:.5,force:18,range:120,minDistance:60,once:true }, { id:'looterBlade',type:'blade',name:'砍',family:'cut',wind:.6,force:25,range:32,weapon:'blade',cut:true }, { id:'looterStaff',type:'staff',name:'棍',family:'thrust',wind:.5,force:24,range:60,weapon:'staff' }, { id:'looterFist',type:'fist',name:'空手拳',family:'punch',wind:.5,force:14,range:28 }] },
  archer: { body:{balance:45},escapeSource:'gate',hands:2,mass: 70, armor: 4, force:18,speed:25,moves:[{id:'archerArrow',name:'搭箭射',family:'shoot',type:'stone',wind:1.2,force:22,range:140,minDistance:45},{id:'archerKnife',name:'拔刀',family:'cut',type:'blade',wind:.6,force:16,range:28,cut:true}] },
  dfbb: { body:{balance:80},escapeSource:'gate',hands:2,mass:70,armor:8,force:25,speed:95,moves:[{id:'visitorNeedle',name:'飛針點穴',family:'needle',type:'finger',wind:.3,force:25,range:45},{id:'visitorPalm',name:'貼身一掌',family:'palm',type:'fist',wind:.4,force:24,range:28}] },
  hy: { body:{balance:90},escapeSource:'gate',hands:2,mass:70,armor:32,force:40,speed:18,moves:[{id:'visitorToad',name:'伏身蛤蟆撲',family:'charge',type:'charge',wind:.9,force:40,range:60,travel:true},{id:'visitorCrush',name:'沉肩撞',family:'strike',type:'fist',wind:.6,force:32,range:28}] },
};
export const bodyMove = (id) => BODY_MOVES.find((m) => m.id === id);
export function foeAction(w, distance = 0) {
  const p = FOE_ACTIONS[w?.k]; if (!p) return null;
  const weapon = w.weapon || ['blade','staff','fist'][(w.i || 0) % 3];
  return p.moves.find((m) => (!m.requiresSurvived||w.survived)&&(!m.once || !w.opened) && (!m.minDistance || distance >= m.minDistance) && (!m.weapon || m.weapon === weapon)&&limbAvailable(w,m)) || BODY_MOVES.find(m=>m.id==='bodyKick'&&limbAvailable(w,m));
}
export function makeBare(d) {
  d.bare = true; d.arts = {}; d.moves = [...BODY_BASE]; d.tools = {}; d.focus = null; d.pendingArt = null; d.pendingMove = null; d.skills.palm = 0; d.skills.leg = 0;
  return d;
}
export function acquireWorkTool(d, act) {
  const tool = WORK_TOOLS[act]; if (!d.bare || !tool) return;
  d.tools ||= {}; d.tools[tool] = true;
  const move = BODY_MOVES.find((m) => m.tool === tool); if (move && !d.moves.includes(move.id)) d.moves.push(move.id);
}
export const limbAvailable=(d,m)=>!(m.limbs||['rightHand']).some(limb=>limb.endsWith('Hand')&&(d.wounds||[]).some(w=>w.where==='hand'&&w.side===(limb.startsWith('left')?'左':'右')&&w.layer==='bone'&&w.days>0));
export const moveAvailable = (d, m) => (!m.tool || !!d.tools?.[m.tool])&&limbAvailable(d,m);
