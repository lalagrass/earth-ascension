import{adoptCulture,selectCulture,startLife,cultureActivityTick,stopLife}from'./culture.mjs';
import {rulesFor} from './save-features.mjs';
import {adoptMartial,setFocus,chooseStyle,startPractice,martialTick,cancelPractice} from './martial.mjs';
import {DEFAULT_LIFE_POLICY,validateLifePolicy,LIFE_RULES} from './life-policy.mjs';
import {beginClass,classActivityTick} from './classes.mjs';
import {Q,FACILITIES} from './data.mjs';
import {createWorld,event,sorted,invariants,bagWeight,day,openTick,closeTick,uid} from './state.mjs';
import {begin,cancel,activityTick,autonomy,buildOrder} from './activities.mjs';
import {moveAll} from './navigation.mjs';
import {combatAI,combatTick,sessionsTick,ecologyTick,beginSpar,startDrill,startAction,interruptCombat} from './combat.mjs';
import {invite,visit,depart,school,fame,partnerProposal,acceptPartner,cohabit,separate,promote,lifeTick,lifeActivityTick} from './life.mjs';
import {dispatch,recallParty,negotiate,challengeWardens,chooseCave,requestRescue,travelActivityTick,expeditionTick} from './expedition.mjs';
import {story,storyActivityTick,storiesTick,found} from './stories.mjs';
import {discover} from './view.mjs';
export {createWorld,invariants};
export function command(w,c){
 if(c?.temporary!==undefined&&typeof c.temporary!=='boolean')return {ok:false,reason:'臨時指令需布林值'};
 if(!c||typeof c.type!=='string'||c.actor!==undefined&&!Object.hasOwn(w.people,c.actor)||c.id!==undefined&&(typeof c.id!=='string'||!/^[-a-zA-Z0-9._]+$/.test(c.id)||['__proto__','constructor','prototype'].includes(c.id)))return {ok:false,reason:'人物／指令識別不合法',reasonCode:'invalid_command'};
 if(c.executeTick!==undefined&&(!Number.isSafeInteger(c.executeTick)||c.executeTick<0))return {ok:false,reason:'排程tick需非負整數',reasonCode:'invalid_execute_tick'};
 const id=c.id||(c.executeTick>w.tick?uid(w,'queued-command'):'cmd.'+(w.commandSeq+1));if(Object.hasOwn(w.seenCommands,id))return w.seenCommands[id];
 w.pendingCommands??=[];if(c.executeTick>w.tick){const existing=w.pendingCommands.find(q=>q.id===id);if(existing)return {ok:true,queued:true};w.commandArrivalSeq=(w.commandArrivalSeq||0)+1;w.pendingCommands.push({...structuredClone(c),id,arrivalSeq:w.commandArrivalSeq});return {ok:true,queued:true};}
 let result={ok:true};const p=w.people[c.actor||'leader'];
 if(w.martialPlan&&p&&!['resident','visitor'].includes(p.residence)&&['task','stop','resume','recall','guard','roles','auto','attack','preferred','martialFocus','martialStyle','practice','practiceStop'].includes(c.type))return {ok:false,reason:'教習／野外人物只供觀察，不能代下門人命令'};
 if(w.lifePolicy&&c.temporary&&(p?.storyBusy||p?.classSession||w.expedition?.actors.includes(p?.id)&&!['returned','cancelled'].includes(w.expedition.phase)))return {ok:false,reason:'遠征／約定／同堂進行中不支援一次回復；請先完成或取消勾選作普通改派'};
 if(['task','stop'].includes(c.type)&&w.expedition?.actors.includes(p?.id)&&!['returned','cancelled'].includes(w.expedition.phase)){w.expedition.phase='halted';w.expedition.haltReason='隊員接到新指令／停工';p.storyBusy=false;if(w.people.zhou.helpedBy===p.id){const z=w.people.zhou;cancel(w,z,'扶助已中止');z.helpedBy=null;p.helping=null;w.expedition.reservedVisitor=false;event(w,'escort-interrupted',[p.id,z.id]);}}
 if(['task','stop','recall'].includes(c.type)&&p?.combatSession){cancelPractice(w,p);interruptCombat(w,p);}
 if(c.type==='task'){
  if(!p)result={ok:false,reason:'人物不存在'};
  else if(p.residence==='visitor'&&p.canonicalIdentity&&w.identityMode==='matureGuest'&&!['move','rest','sleep','eat','talk','encourage','care'].includes(c.kind))result={ok:false,reason:'成熟宗師只作客，請透過約定交流'};else if(p.kind!=='human')result={ok:false,reason:'野生個體不能接受門派勞作命令'};else {const prior=p.temporary?{auto:p.temporary.auto,manualStop:p.temporary.manualStop,intent:structuredClone(p.temporary.intent)}:{auto:p.auto,manualStop:p.manualStop,intent:p.intent?structuredClone(p.intent):null},args={...(c.args||{})};if(w.lifePolicy&&c.temporary&&['train','study'].includes(c.kind))args.units=1;result=begin(w,p,c.kind,args,true);if(result.ok){delete p.temporary;if(w.lifePolicy&&c.temporary)p.temporary={version:1,revision:p.revision,kind:c.kind,...prior,originId:p.activity};}}
 }else if(c.type==='stop'){
  cancel(w,p,'玩家停工');delete p.temporary;p.revision++;p.manualStop=true;p.intent=null;
 }else if(c.type==='resume'){if(p.temporary){cancel(w,p,'取消臨時工作，恢復自主');delete p.temporary;}p.manualStop=false;p.intent=null;p.auto=true;}
 else if(c.type==='recall'){result=begin(w,p,'return',{},true);}
 else if(c.type==='lifePolicy'){try{const policy=structuredClone(c.policy||DEFAULT_LIFE_POLICY);validateLifePolicy(policy,w.inventories.vat.capacity);w.lifePolicy=policy;w.rulesVersion=rulesFor(w);event(w,'life-policy-adopted',[],{version:policy.version});}catch(e){result={ok:false,reason:e.message};}}
 else if(c.type==='adoptCulture')result=adoptCulture(w);
 else if(c.type==='culturePack')result=selectCulture(w,c.pack);
 else if(c.type==='cultureEvent')result=startLife(w,p,c.event,c.choice,c.mode,c.callback);
 else if(c.type==='cultureStop')result=stopLife(w);
 else if(c.type==='adoptMartial')result=adoptMartial(w);
 else if(c.type==='martialFocus')result=setFocus(w,p,c.focus);
 else if(c.type==='martialStyle')result=chooseStyle(w,p,c.style);
 else if(c.type==='practice')result=startPractice(w,p,c.pattern);
 else if(c.type==='practiceStop'){cancelPractice(w,p);interruptCombat(w,p);p.manualStop=true;p.intent=null;martialTick(w);}
 else if(c.type==='policy'){w.policy=c.policy;}
 else if(c.type==='guard'){if(!p.adult||p.kind!=='human')result={ok:false,reason:'守點需成年門人'};else{const pos=c.point==='B'?[1430,1150]:[1340,1220];p.guardPoint=pos;p.protect=c.protect||null;p.chaseLimit=Number(c.limit)||100;result=begin(w,p,'move',{pos},true);p.manualStop=true;p.team='residents';}}
 else if(c.type==='roles'){if(['gather','production','build','teach','care'].includes(c.primary)&&['gather','production','build','teach','care'].includes(c.secondary)){p.primary=c.primary;p.secondary=c.secondary;}else result={ok:false,reason:'未知職務'};}
 else if(c.type==='goals'){if(w.lifePolicy){const water=Number(c.water),meal=Number(c.meal);if(!Number.isInteger(water)||water<0||water>w.inventories.vat.capacity||!Number.isInteger(meal)||meal<0||meal>96)result={ok:false,reason:'目標超出容量／需整數；未修改原目標'};else w.goals={...w.goals,manual:true,water,meal};}else{w.goals.manual=true;for(const k of ['water','meal']){const n=Number(c[k]);if(Number.isInteger(n)&&n>=0&&n<=(k==='water'?w.inventories.vat.capacity:96))w.goals[k]=n;else result={ok:false,reason:'目標超出容量／需整數'};}}}
 else if(c.type==='auto'){p.auto=!!c.value;if(p.temporary)p.temporary.auto=p.auto;}
 else if(c.type==='build'){
  const actors=c.actors||[p.id];if(actors.some(id=>!w.people[id]?.adult||w.people[id].residence!=='resident'||w.people[id].kind!=='human'))result={ok:false,reason:'施工指令需成年常住者'};else result=buildOrder(w,c.facility);if(result.ok){const actors=c.actors||[p.id];for(const id of actors)if(w.people[id])begin(w,w.people[id],'build',{facility:c.facility},true);}
 }else if(c.type==='pauseBuild'){
  const f=w.facilities[c.facility];if(!f)result={ok:false,reason:'不存在工地'};else{f.active=false;for(const o of sorted(w.people))if(w.activities[o.activity]?.args.facility===f.id)cancel(w,o,'工地停工');}
 }else if(c.type==='class')result=beginClass(w,p,c.students,c.art);
 else if(c.type==='story')result=story(w,p,c.node);
 else if(c.type==='found')result=found(w,c.name);
 else if(c.type==='expedition')result=dispatch(w,c.actors||[],c.target);
 else if(c.type==='recallParty')result=recallParty(w);
 else if(c.type==='challengeWardens')result=challengeWardens(w);
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
 else if(c.type==='endDrill'){if(w.drill)w.drill.status='cancelled';for(const o of sorted(w.people))if(o.combatSession===w.drill?.id){o.combatSession=null;o.combatTarget=null;if(o.action){o.action.phase='recover';o.action.remaining=o.action.recover;}o.manualStop=false;if(o.rank==='training'){o.trainingDefeated=true;}}}
 else if(c.type==='preferred'){if(c.move==='push'&&p.pushLearned||c.move==='punch')p.move=c.move;else result={ok:false,reason:'偏好只選已學拳／掌；棍劍請先換裝'};}
 else if(c.type==='attack'&&(p.kind!=='human'||p.residence!=='resident'))result={ok:false,reason:'試招請選成年門人；訪客透過同意的約定交流'};
 else if(c.type==='attack'&&p.residence==='visitor'&&p.canonicalIdentity&&w.identityMode==='matureGuest'&&!p.combatSession)result={ok:false,reason:'成熟宗師不接受代打指令'};
 else if(c.type==='attack')result=startAction(w,p,c.move,w.people[c.target],true);
 else if(c.type==='tutorial'){w.tutorial=c.value;}
 else result={ok:false,reason:'尚未支援的指令：'+c.type};
 if(result.ok&&w.lifePolicy&&['class','spar','expedition','drill','recallParty'].includes(c.type)){const ids=c.type==='class'?[p.id,...c.students]:c.type==='spar'?[p.id,c.target]:c.type==='recallParty'?w.expedition?.actors||[]:c.actors||[];for(const id of ids)if(w.people[id])delete w.people[id].temporary;}
 if(!result.ok&&!result.reasonCode)result.reasonCode=c.type+'.rejected';
 w.commandSeq++;w.commands.push({...c,id,tick:w.tick,seq:w.commandSeq,result});w.seenCommands[id]=result;
 event(w,result.ok?'command':'rejected',p?[p.id]:[],{commandId:id,command:c.type,reason:result.reason||null});return result;
}
export function step(w,batch=[]){for(const c of batch)command(w,c);w.tick++;w.pendingCommands??=[];const due=w.pendingCommands.filter(c=>c.executeTick<=w.tick).sort((a,b)=>a.executeTick-b.executeTick||a.arrivalSeq-b.arrivalSeq);w.pendingCommands=w.pendingCommands.filter(c=>c.executeTick>w.tick);for(const c of due)command(w,c);openTick(w);
 for(const p of sorted(w.people)){
  p.simTick=w.tick;if(p.stun)p.stun--;
  if(w.tick%20===sorted(w.people).findIndex(o=>o.id===p.id)%20)autonomy(w,p);
 }
 ecologyTick(w);martialTick(w);sessionsTick(w);combatAI(w);
 moveAll(w);combatTick(w);martialTick(w);
 const activityOrder=sorted(w.people).sort((a,b)=>(w.activities[a.activity]?.started??Infinity)-(w.activities[b.activity]?.started??Infinity)||a.id.localeCompare(b.id));
 for(const p of activityOrder){
  if(p.moving){p.energyRemainder+=(bagWeight(w,p)?10:5);while(p.energyRemainder>=20){p.energy=Math.max(0,p.energy-1);p.energyRemainder-=20;}}
  if(!cultureActivityTick(w,p)&&!classActivityTick(w,p)&&!travelActivityTick(w,p)&&!storyActivityTick(w,p)&&!lifeActivityTick(w,p))activityTick(w,p);
  // Energy uses a fixed hundredth-point accumulator; no renderer state enters rules.
  p.energy=Math.round(p.energy*1000)/1000;
 }
 lifeTick(w);expeditionTick(w);storiesTick(w);discover(w);
 for(const item of ['veg','herb']){const s=w.ecology[item];if(s.day<day(w)){s.day=day(w);s.remaining=8;event(w,'resource-regrow',[],{item});}}
 closeTick(w);const violations=invariants(w);if(violations.length)throw Error('World invariant at seed '+w.seed+' tick '+w.tick+': '+violations.join('; '));return w;
}
