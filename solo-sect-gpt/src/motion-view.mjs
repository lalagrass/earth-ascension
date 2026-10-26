// M29 native phase -> presentation intent. Reads the core action/activity only; no clock, no hit test, no timing change.
import{moveFor}from'./catalog.mjs';
const FAMILY={punch:'punch',push:'palm',sweep:'staff',thrust:'sword',intercept:'sword-nine',step:'step'};
const PHASE={windup:'起手',active:'出招',recover:'收勢'};
export function motionFor(w,p){const ac=p.action;if(ac){const m=moveFor(w,ac.contentMove||ac.move),base=ac.move,family=FAMILY[base]||null,weapon=['sweep','thrust','intercept'].includes(base)?(base==='sweep'?'staff':'sword'):null,held=weapon?p.weapon===weapon:true;
  return{actionId:'martial.'+(ac.contentMove||ac.move),name:m?.name||ac.move,family:family&&held?family:'neutral',fallback:!family||!held,phase:ac.phase,phaseLabel:PHASE[ac.phase],remaining:ac.remaining,source:'core action.phase'};}
 const a=w.activities[p.activity],load=Object.entries(w.inventories[p.bag]?.items||{}).some(([i,n])=>n>0&&i!=='money');
 if(p.moving)return{actionId:load?'life.carry':'life.walk',family:load?'carry':'walk',fallback:false,phase:'travel',phaseLabel:load?'搬運中':'行走',source:'core moving + bag'};
 if(a?.kind==='train')return{actionId:'life.train',family:'practice',fallback:false,phase:'practice',phaseLabel:'練功',source:'core activity'};
 return null;}
