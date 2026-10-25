import {Q,FACILITIES} from './data.mjs';
import {createWorld,event,sorted,invariants,bagWeight,day} from './state.mjs';
import {begin,cancel,activityTick,autonomy,buildOrder} from './activities.mjs';
import {moveAll} from './navigation.mjs';
export {createWorld,invariants};
export function command(w,c){
 const id=c.id||'cmd.'+(w.commandSeq+1);if(w.seenCommands[id])return w.seenCommands[id];
 let result={ok:true};const p=w.people[c.actor||'leader'];
 if(c.type==='task'){
  if(!p)result={ok:false,reason:'人物不存在'};
  else result=begin(w,p,c.kind,c.args||{},true);
 }else if(c.type==='stop'){
  cancel(w,p,'玩家停工');p.revision++;p.manualStop=true;p.intent=null;
 }else if(c.type==='resume'){p.manualStop=false;p.intent=null;p.auto=true;}
 else if(c.type==='recall'){result=begin(w,p,'return',{},true);}
 else if(c.type==='policy'){w.policy=c.policy;}
 else if(c.type==='auto'){p.auto=!!c.value;}
 else if(c.type==='build'){
  result=buildOrder(w,c.facility);if(result.ok){const actors=c.actors||[p.id];for(const id of actors)if(w.people[id])begin(w,w.people[id],'build',{facility:c.facility},true);}
 }else if(c.type==='pauseBuild'){
  const f=w.facilities[c.facility];if(!f)result={ok:false,reason:'不存在工地'};else{f.active=false;for(const o of sorted(w.people))if(w.activities[o.activity]?.args.facility===f.id)cancel(w,o,'工地停工');}
 }else if(c.type==='tutorial'){w.tutorial=c.value;}
 else result={ok:false,reason:'尚未支援的指令：'+c.type};
 w.commandSeq++;w.commands.push({...c,id,tick:w.tick,seq:w.commandSeq,result});w.seenCommands[id]=result;
 event(w,result.ok?'command':'rejected',p?[p.id]:[],{commandId:id,command:c.type,reason:result.reason||null});return result;
}
export function step(w,batch=[]){for(const c of batch)command(w,c);w.tick++;
 for(const p of sorted(w.people)){
  if(p.stun)p.stun--;
  if(w.tick%20===sorted(w.people).findIndex(o=>o.id===p.id)%20)autonomy(w,p);
 }
 moveAll(w);
 for(const p of sorted(w.people)){
  if(p.moving){p.energyRemainder+=(bagWeight(w,p)?10:5);while(p.energyRemainder>=20){p.energy=Math.max(0,p.energy-1);p.energyRemainder-=20;}}
  activityTick(w,p);
  // Energy uses a fixed hundredth-point accumulator; no renderer state enters rules.
  p.energy=Math.round(p.energy*1000)/1000;
 }
 for(const item of ['veg','herb']){const s=w.ecology[item];if(s.day<day(w)){s.day=day(w);s.remaining=8;event(w,'resource-regrow',[],{item});}}
 return w;
}
