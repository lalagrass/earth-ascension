// N37 自製受力/分層傷口。只借DF分層及Sekiro回正概念；常數理由見combat.md。
import {BODY_TIMING,FOE_ACTIONS,limbAvailable} from './starter-combat.mjs';
import {emitPractice} from './practice-events.mjs';
export const CONTACT_MEDIA={impact:{momentum:true,tissue:true},irritant:{momentum:false,tissue:false}};
export const BODY_MECHANICS={mass:70,averageAdultSkill:10,balance:100,balanceRecovery:12,recoveryDelay:2.5,openSeconds:BODY_TIMING.reaction+BODY_TIMING.recovery+BODY_TIMING.step,painLimit:100,painRecovery:1}; // 24d：成年體能 10 沿開局主角，作入門卷閱讀速度基準。
// 山鼠是環境動物，沒有進攻招表；仍保留原本較弱的架勢資料。
export const PASSIVE_BODIES={rat:{balance:30}};
export const TISSUES={blunt:[{id:'bruise',name:'瘀青',threshold:10,pain:1},{id:'skin',name:'皮破',threshold:24,pain:4},{id:'tendon',name:'傷筋',threshold:40,pain:9},{id:'bone',name:'斷骨',threshold:72,pain:16}],edge:[{id:'bruise',name:'瘀青',threshold:4,pain:1},{id:'skin',name:'皮破',threshold:8,pain:4},{id:'tendon',name:'傷筋',threshold:24,pain:9},{id:'bone',name:'斷骨',threshold:72,pain:16}]};
export const BODY_PARTS={body:{name:'身',resistance:1},hand:{name:'手',resistance:.65},eye:{name:'目',resistance:.25}};
export const bodyOf=a=>({...BODY_MECHANICS,...PASSIVE_BODIES[a?.k],...FOE_ACTIONS[a?.k]?.body,mass:FOE_ACTIONS[a?.k]?.mass||BODY_MECHANICS.mass,balanceRecovery:(FOE_ACTIONS[a?.k]?.body?.balanceRecovery||BODY_MECHANICS.balanceRecovery)*(1+(a?.skills?.agility||a?.agi||0)/100)});
export function completeContactMove(m){m.medium??='impact';if(!CONTACT_MEDIA[m.medium])throw Error('未知接觸媒介：'+m.medium);m.balanceImpulse??=m.impulse||BODY_MECHANICS.mass;m.contactSites??=m.poses?.at(-1)?.startsWith('double')?2:1;m.limbs??=m.bite?['mouth']:m.travel?['body']:m.type==='kick'||m.type==='leg'?['rightLeg']:m.type==='staff'?['leftHand','rightHand']:m.poses?.at(-1)?.startsWith('double')?['leftHand','rightHand']:m.poses?.at(-1)?.startsWith('left')?['leftHand']:['rightHand'];m.contactPart??=m.effectWords?.includes('blind')?'eye':m.bite?'hand':['sword','blade','finger'].includes(m.type)||m.cut?'hand':'body';return m;}
for(const p of Object.values(FOE_ACTIONS))for(const m of p.moves)completeContactMove(m);
export function partWound(a,where,side=null){return (a.wounds||[]).filter(w=>w.where===where&&(!side||w.side===side)&&w.days>0).sort((a,b)=>b.depth-a.depth)[0];}
export const usableMove=(a,m)=>limbAvailable(a,m);
export function woundWind(a,m){return Math.max(1,...(m.limbs||['rightHand']).map(limb=>{const w=limb.endsWith('Hand')&&partWound(a,'hand',limb.startsWith('left')?'左':'右');return w?.layer==='tendon'?1+w.force/(w.force+w.threshold):1;}));}
export function shiftBalance(s,a,amount){const body=bodyOf(a);a.posture??=body.balance;const before=a.posture;a.posture=Math.max(0,a.posture-amount);a.postT=s.t;if(before>0&&a.posture===0){a.balanceOpenUntil=s.t+body.openSeconds;a.downUntil=Math.max(a.downUntil||0,a.balanceOpenUntil);a.swing=null;a.bswing=null;emitPractice(s,{type:'balanceBreak',who:a.id||a.uid||a.k,until:a.balanceOpenUntil,seconds:body.openSeconds});}return a.posture;}
export function recoverBody(s,a,dt,{engaged=false}={}){const b=bodyOf(a);a.posture??=b.balance;
 // 舊存檔可能只有posture=0，補一次資料化回正期，不讓它永遠不能回正。
 if(a.posture<=0&&!a.balanceOpenUntil){a.balanceOpenUntil=s.t+b.openSeconds;a.downUntil=Math.max(a.downUntil||0,a.balanceOpenUntil);}
 if(a.posture<=0&&a.balanceOpenUntil&&s.t>=a.balanceOpenUntil){a.posture=Math.min(b.balance,b.balanceRecovery*b.openSeconds);a.balanceOpenUntil=0;a.postT=s.t;}
 else if(a.posture>0&&s.t-(a.postT??-1e9)>=b.recoveryDelay)a.posture=Math.min(b.balance,a.posture+b.balanceRecovery*dt);
 if(!engaged&&s.t-(a.painAt??-1e9)>=b.recoveryDelay)a.pain=Math.max(0,(a.pain||0)-b.painRecovery*dt);
}
function push(a,t,pixels){if(!a.pos||!t.pos)return;const dx=t.pos[0]-a.pos[0],dy=t.pos[1]-a.pos[1],L=Math.hypot(dx,dy)||1;t.pos[0]+=dx/L*pixels;t.pos[1]+=dy/L*pixels;}
export function contactImpact(s,a,t,{move,force,armor=0,guard=0,blocked=false,bypass=false,nearby=2}={}){
 const body=bodyOf(t),m=completeContactMove({...move}),where=blocked?'hand':m.contactPart,side=m.limbs?.[0]?.startsWith('left')?'左':'右';
 const medium=CONTACT_MEDIA[m.medium],sourceForce=force;force=medium.momentum?force:0;
 const pressure=blocked||!medium.tissue?0:Math.max(0,force/m.contactSites-(bypass?0:armor)-guard),scale=(body.mass/BODY_MECHANICS.mass)**(2/3)*BODY_PARTS[where].resistance;
 const layers=TISSUES[m.cut||m.bite||['sword','blade','finger'].includes(m.type)?'edge':'blunt'];let depth=-1;for(let i=0;i<layers.length;i++)if(pressure>layers[i].threshold*scale)depth=i;
 const row=layers[depth],skin=layers.find(r=>r.id==='skin').threshold*scale,damageFactor=depth>=1?(pressure-skin)/(pressure+skin):0;
 const knock=blocked?0:(m.impulse??BODY_TIMING.step*24)*force/body.mass;
 const balance=force*m.balanceImpulse/body.mass;
 if(force>0)shiftBalance(s,t,balance);if(!blocked&&force>0)push(a,t,knock);
 let wound=null;if(row){const threshold=row.threshold*scale;wound={where,side:where==='body'?'':side,layer:row.id,depth,force:pressure,threshold,days:depth+1,at:s.t};const wounds=t.wounds??=[],old=wounds.find(w=>w.where===where&&w.side===wound.side&&w.days>0);if(!old||old.depth<depth){if(old)wounds.splice(wounds.indexOf(old),1);wounds.push(wound);}t.pain=(t.pain||0)+row.pain*pressure/(layers[0].threshold*scale);t.painAt=s.t;t.scarred=true;
   if(depth>=2)t.part={where,side:wound.side,days:wound.days,layer:row.id};
   if(t.pain>=body.painLimit){t.faintUntil=s.t+body.openSeconds;t.downUntil=Math.max(t.downUntil||0,t.faintUntil);t.swing=null;t.bswing=null;}
 }
 const result={force,...(sourceForce!==force?{sourceForce,medium:m.medium}:{}),contactSites:m.contactSites,forcePerSite:force/m.contactSites,pressure,where,side,layer:row?.id||null,depth,damageFactor,injured:!!row,knock,balance,pain:t.pain||0};
 if(force>0)(s.fx??=[]).push({kind:'contact',at:s.t,ttl:1,force,nearby,attacker:a.uid||a.id||a.k,defender:t.uid||t.id||t.k,from:[...(a.pos||[0,0])],to:[...(t.pos||[0,0])]});
 emitPractice(s,{type:'contact',attacker:a.uid||a.id||a.k,defender:t.uid||t.id||t.k,move:m.id,...result});
 return result;
}
export function healWounds(a,how){for(const w of a.wounds||[])w.days=how==='doctor'?0:w.days-1;a.wounds=(a.wounds||[]).filter(w=>w.days>0);if(how==='doctor')a.pain=0;}
