// N35 自製technique資料。只借CDDA條件/效果詞彙，不複製其招式/數值。
import {BODY_MOVES,BODY_TIMING} from './starter-combat.mjs';
import {learningWeight,emitPractice} from './practice.mjs';
export const TECHNIQUES=[
 {id:'disarm',name:'奪械',base:'bodyGrab',parents:['guard','push','grapple'],conditions:['hands','opponentWeapon','opponentWind'],difficulty:72,effects:['interrupt','disarm']},
 {id:'flankStrike',name:'側身打肋',base:'bodyKick',parents:['leg','staff'],conditions:['afterDodge','opponentCharge'],difficulty:72,effects:['armorBypass','interrupt']},
 {id:'staffSweep',name:'掃',base:'toolStaff',parents:['staff'],conditions:['surrounded'],difficulty:72,effects:['area'],area:65},
 {id:'bodyThrow',name:'摔',base:'bodyPush',parents:['push','grapple'],conditions:['hands','opponentUnbalanced'],difficulty:72,effects:['knockdown']},
 {id:'dustCast',name:'撒土',base:'toolStone',parents:['pickup','stone','guard'],conditions:['hands','losing','cornered'],difficulty:96,effects:['blind','dishonor'],noTool:true},
 {id:'stoneOpening',name:'擲石開場',base:'toolStone',parents:['stone'],conditions:['approaching'],difficulty:48,effects:['interrupt','lure']},
];
export const TECHNIQUE_MOVES=TECHNIQUES.map(row=>{const base=BODY_MOVES.find(m=>m.id===row.base);return {...base,id:row.id,name:row.name,technique:true,aoe:row.area||0,aoeCenter:row.area?'actor':undefined,...(row.noTool?{tool:null,consumable:false}:{}),effectWords:row.effects};});
export const CONDITIONS={hands:f=>f.hands>0,opponentWeapon:f=>!!f.weapon&&f.weapon!=='fist',opponentWind:f=>!!f.opponentWind,afterDodge:f=>!!f.afterDodge,opponentCharge:f=>!!f.opponentCharge,surrounded:f=>f.enemies>=3,opponentUnbalanced:f=>!!f.opponentUnbalanced,losing:f=>!!f.losing,cornered:f=>!!f.cornered,approaching:f=>!!f.approaching};
export const matchesTechnique=(row,facts)=>row.conditions.every(word=>CONDITIONS[word]?.(facts));
export const learningRate=p=>learningWeight(p)*(1-p); // 只供期望診斷；真正失手時只加w，不再乘(1-p)。
export function learnFromLoss(s,d,parents,facts,p,{lost,expected=false}={}){
  if(!lost||expected)return [];const memory=d.glimmer??={progress:{},known:[],firstDay:null},learned=[];
  for(const row of TECHNIQUES){if(memory.known.includes(row.id)||!row.parents.some(tag=>parents.includes(tag))||!matchesTechnique(row,facts))continue;
    const gain=learningWeight(p),n=memory.progress[row.id]=(memory.progress[row.id]||0)+gain,threshold=row.difficulty/(d.wu||d.root||3);
    emitPractice(s,{type:'glimmerProgress',who:d.id||d.uid||d.k,move:row.id,p,w:gain,n,threshold,lost:true});
    if(n<threshold)continue;memory.known.push(row.id);memory.firstDay??=s.day;memory.firstAt??=s.t;(d.moves??=[]).push(row.id);learned.push(row);emitPractice(s,{type:'discovery',who:d.id||d.uid||d.k,move:row.id,n,threshold});
  }return learned;
}
export const EFFECTS={
 interrupt:(s,a,t,f)=>{const bypass=a.techniqueContact?.at===s.t&&a.techniqueContact.bypassArmor;if(f.force<=f.opponentForce&&!bypass)return false;t.swing=null;t.bswing=null;return true;},
 disarm:(s,a,t,f)=>{if(f.force<=f.opponentForce||!f.weapon||f.weapon==='fist')return false;const tool={blade:'knife',staff:'staff',knife:'knife',hoe:'hoe',pole:'pole'}[f.weapon]||f.weapon;delete t.tools?.[tool];t.weapon='fist';t.swing=null;t.bswing=null;(s.drops??=[]).push({kind:'weapon',tool,pos:[...(t.pos||[0,0])],owner:t.id||t.uid,at:s.t});return true;},
 armorBypass:(s,a,t,f)=>{a.techniqueContact={at:s.t,target:t.uid||t.id||t.k,bypassArmor:true};return true;},
 area:()=>true,
 knockdown:(s,a,t,f)=>{if(!f.opponentUnbalanced||f.force<=f.opponentForce)return false;t.downUntil=s.t+BODY_TIMING.recovery+BODY_TIMING.step;t.busyUntil=Math.max(t.busyUntil||0,t.downUntil);t.swing=null;t.bswing=null;return true;},
 blind:(s,a,t)=>{t.visionUntil=s.t+BODY_TIMING.recovery+BODY_TIMING.reaction;return true;},
 dishonor:(s,a)=>{if(a.values)a.values.xia=(a.values.xia||0)-1;return true;},
 lure:(s,a,t)=>{t.lurePos=[...(a.pos||[0,0])];t.lureUntil=s.t+BODY_TIMING.recovery+BODY_TIMING.reaction;return true;},
};
export function applyTechnique(s,a,t,move,facts){const row=TECHNIQUES.find(r=>r.id===move);if(!row||!a.glimmer?.known.includes(move)||!matchesTechnique(row,facts))return null;const effects={};for(const word of row.effects)effects[word]=EFFECTS[word](s,a,t,facts)!==false;emitPractice(s,{type:'technique',who:a.id||a.uid||a.k,move,effects});return effects;}

export function pickupDrop(s,a,hands=2){if(!hands||a.swing||a.bswing||(a.busyUntil||0)>s.t)return false;const drop=(s.drops||[]).find(d=>!d.taken&&a.pos&&Math.hypot(d.pos[0]-a.pos[0],d.pos[1]-a.pos[1])<=BODY_MOVES.find(m=>m.id==='bodyGrab').range);if(!drop)return false;
  drop.taken=true;(a.tools??={})[drop.tool]=true;const move=BODY_MOVES.find(m=>m.tool===drop.tool);if(move&&!(a.moves||[]).includes(move.id))(a.moves??=[]).push(move.id);a.weapon={knife:'blade',staff:'staff',pole:'staff',hoe:'staff'}[drop.tool]||a.weapon;a.busyUntil=s.t+BODY_TIMING.simple;emitPractice(s,{type:'pickup',who:a.id||a.uid||a.k,tool:drop.tool});return true;
}
