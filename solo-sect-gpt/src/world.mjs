import {Q,FACILITIES} from './data.mjs';
import {createWorld,event,sorted,invariants,bagWeight,day} from './state.mjs';
import {begin,cancel,activityTick,autonomy,buildOrder} from './activities.mjs';
import {moveAll} from './navigation.mjs';
import {combatAI,combatTick,sessionsTick,ecologyTick,beginSpar,startDrill,startAction} from './combat.mjs';
import {invite,visit,depart,school,fame,partnerProposal,acceptPartner,cohabit,separate,promote,lifeTick,lifeActivityTick} from './life.mjs';
import {dispatch,recallParty,negotiate,chooseCave,requestRescue,travelActivityTick,expeditionTick} from './expedition.mjs';
import {story,storyActivityTick,storiesTick,found} from './stories.mjs';
import {discover} from './view.mjs';
export {createWorld,invariants};
export function command(w,c){
 const id=c.id||'cmd.'+(w.commandSeq+1);if(w.seenCommands[id])return w.seenCommands[id];
 let result={ok:true};const p=w.people[c.actor||'leader'];
 if(c.type==='task'){
  if(!p)result={ok:false,reason:'人物不存在'};
  else if(p.kind!=='human')result={ok:false,reason:'野生個體不能接受門派勞作命令'};else result=begin(w,p,c.kind,c.args||{},true);
 }else if(c.type==='stop'){
  cancel(w,p,'玩家停工');p.revision++;p.manualStop=true;p.intent=null;
 }else if(c.type==='resume'){p.manualStop=false;p.intent=null;p.auto=true;}
 else if(c.type==='recall'){result=begin(w,p,'return',{},true);}
 else if(c.type==='policy'){w.policy=c.policy;}
 else if(c.type==='guard'){if(!p.adult||p.kind!=='human')result={ok:false,reason:'守點需成年門人'};else{const pos=c.point==='B'?[1430,1150]:[1340,1220];p.guardPoint=pos;p.protect=c.protect||null;p.chaseLimit=Number(c.limit)||100;result=begin(w,p,'move',{pos},true);p.manualStop=true;p.team='residents';}}
 else if(c.type==='goals'){for(const k of ['water','meal']){const n=Number(c[k]);if(Number.isInteger(n)&&n>=0&&n<=(k==='water'?w.inventories.vat.capacity:96))w.goals[k]=n;else result={ok:false,reason:'目標超出容量／需整數'};}}
 else if(c.type==='auto'){p.auto=!!c.value;}
 else if(c.type==='build'){
  result=buildOrder(w,c.facility);if(result.ok){const actors=c.actors||[p.id];for(const id of actors)if(w.people[id])begin(w,w.people[id],'build',{facility:c.facility},true);}
 }else if(c.type==='pauseBuild'){
  const f=w.facilities[c.facility];if(!f)result={ok:false,reason:'不存在工地'};else{f.active=false;for(const o of sorted(w.people))if(w.activities[o.activity]?.args.facility===f.id)cancel(w,o,'工地停工');}
 }else if(c.type==='story')result=story(w,p,c.node);
 else if(c.type==='found')result=found(w,c.name);
 else if(c.type==='expedition')result=dispatch(w,c.actors||[],c.target);
 else if(c.type==='recallParty')result=recallParty(w);
 else if(c.type==='talkWardens')result=negotiate(w);
 else if(c.type==='choice')result=chooseCave(w,c.choice);
 else if(c.type==='rescue')result=requestRescue(w);
 else if(c.type==='invite')result=invite(w,c.target);
 else if(c.type==='promote')result=promote(w,w.people[c.target]);
 else if(c.type==='partner')result=partnerProposal(w,p,w.people[c.target]);
 else if(c.type==='acceptPartner')result=acceptPartner(w,p,w.people[c.target],c.accept!==false);
 else if(c.type==='cohabit')result=cohabit(w,p,c.room);
 else if(c.type==='separate')result=separate(w,p);
 else if(c.type==='visit')result=visit(w,c.legend);
 else if(c.type==='depart')result=depart(w,c.legend);
 else if(c.type==='school')result=school(w,p);
 else if(c.type==='fame')result=fame(w,p);
 else if(c.type==='spar')result=beginSpar(w,p,w.people[c.target]);
 else if(c.type==='drill')result=startDrill(w,c.actors,c.config);
 else if(c.type==='endDrill'){if(w.drill)w.drill.status='cancelled';for(const o of sorted(w.people))if(o.combatSession===w.drill?.id){o.combatSession=null;o.combatTarget=null;o.action=null;o.manualStop=false;}}
 else if(c.type==='attack')result=startAction(w,p,c.move,w.people[c.target],true);
 else if(c.type==='tutorial'){w.tutorial=c.value;}
 else result={ok:false,reason:'尚未支援的指令：'+c.type};
 w.commandSeq++;w.commands.push({...c,id,tick:w.tick,seq:w.commandSeq,result});w.seenCommands[id]=result;
 event(w,result.ok?'command':'rejected',p?[p.id]:[],{commandId:id,command:c.type,reason:result.reason||null});return result;
}
export function step(w,batch=[]){for(const c of batch)command(w,c);w.tick++;
 for(const p of sorted(w.people)){
  if(p.stun)p.stun--;
  if(w.tick%20===sorted(w.people).findIndex(o=>o.id===p.id)%20)autonomy(w,p);
 }
 ecologyTick(w);sessionsTick(w);combatAI(w);
 moveAll(w);combatTick(w);
 for(const p of sorted(w.people)){
  if(p.moving){p.energyRemainder+=(bagWeight(w,p)?10:5);while(p.energyRemainder>=20){p.energy=Math.max(0,p.energy-1);p.energyRemainder-=20;}}
  if(!travelActivityTick(w,p)&&!storyActivityTick(w,p)&&!lifeActivityTick(w,p))activityTick(w,p);
  // Energy uses a fixed hundredth-point accumulator; no renderer state enters rules.
  p.energy=Math.round(p.energy*1000)/1000;
 }
 lifeTick(w);expeditionTick(w);storiesTick(w);discover(w);
 for(const item of ['veg','herb']){const s=w.ecology[item];if(s.day<day(w)){s.day=day(w);s.remaining=8;event(w,'resource-regrow',[],{item});}}
 return w;
}
