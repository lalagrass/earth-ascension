import{isPackMove}from'./catalog.mjs';
import {trainingArt,homeSlotIndex} from './martial-config.mjs';
import {applyLifePolicy,supply,shouldYield} from './life-policy.mjs';
import {detachClass} from './classes.mjs';
import {Q,HZ,DAY,FACILITIES,RECIPES,TASKNAME,ART,MEMORY} from './data.mjs';
import {stations,rects,position,bedSlots,findPath,inRect,walkable,los} from './map.mjs';
import {uid,event,inventory,availableQty as qty,qty as physicalQty,add,transfer,sourceFor,bagWeight,reserve,reserveBundle,release,sorted,assignBeds,day} from './state.mjs';
import {route,arrived} from './navigation.mjs';
export function cancel(w,p,reason='玩家改派'){
 detachClass(w,p,reason);
 const life=w.culturePlan?.active;if(life?.status==='running'&&life.casting.cast.includes(p.id)){life.status='cancelled';life.phase='ended';life.ended=w.tick;for(const id of life.casting.cast){const q=w.people[id];q.storyBusy=false;q.pose='idle';q.path=[];q.routeAt=0;}const owner=w.people[life.casting.cast[0]];if(owner.id!==p.id)cancel(w,owner,reason);event(w,'culture-cancelled',life.casting.cast,{reason});}
 const shared=Object.values(w.activities).find(a=>a.kind==='story'&&a.args.partner===p.id&&a.actor!==p.id);if(shared)cancel(w,w.people[shared.actor],reason);
 const a=w.activities[p.activity];if(a){if(['school','reception'].includes(a.kind)&&a.partner&&w.people[a.partner])w.people[a.partner].storyBusy=false;if(a.kind==='story'){p.storyBusy=false;for(const id of [a.traveler,a.guard].filter(Boolean)){const q=w.people[id];if(q){q.storyBusy=false;q.combatTarget=null;q.combatSession=null;if(q.action){q.action.phase='recover';q.action.remaining=q.action.recover;}if(q.id==='escort.traveler'){q.departing=true;route(w,q,stations.spawn);}else if(q.home)route(w,q,q.home);}}const partner=w.people[a.args.partner];if(partner){partner.storyBusy=false;partner.pose='idle';partner.path=[];partner.routeAt=0;if(partner.combatSession===p.combatSession){partner.combatSession=null;partner.combatTarget=null;p.combatSession=null;p.combatTarget=null;}}if(w.stories[a.args.node])w.stories[a.args.node].status='active';}release(w,a.id);delete w.activities[a.id];p.activity=null;
  if(a.partner){const o=w.people[a.partner];if(o&&w.activities[o.activity]?.session===a.session){release(w,o.activity);delete w.activities[o.activity];o.activity=null;o.path=[];o.reason='同伴已中止活動';}}
 }
 if(w.bridge.holder===p.id){p.bridgeExit=true;p.bridgePendingTarget=null;}else{p.path=[];p.routeAt=0;w.bridge.queue=w.bridge.queue.filter(q=>q.id!==p.id);}
 p.reason=reason;p.blocked='';p.pose='idle';
}
export function begin(w,p,kind,args={},manual=false){
 if(!['contentStudy','trailUnload','culture','class','unloadQuest','drink','move','return','gather','build','train','study','rest','sleep','eat','cook','craft','talk','encourage','care','teach','greet','farm','harvestHaul','delivery','school','reception','learn','equip','story','pack','aid','collect'].includes(kind))return {ok:false,reason:'未知活動'};
 if(kind==='contentStudy'&&(!w.contentState||!isPackMove(w,args.move)))return{ok:false,reason:'內容研讀引用失效'};
 if(kind==='trailUnload'&&(!w.expedition?.journey||w.expedition.journey.objective!=='gather'||!w.expedition.actors.includes(p.id)||!Number.isSafeInteger(args.amount)||args.amount<1||args.amount>2))return{ok:false,reason:'返院交藥草需有效遠行及1–2株實物'};
 if(kind==='equip'&&!['punch','staff','sword'].includes(args.art))return {ok:false,reason:'換裝只支援拳、木棍與木劍'};
 if(kind==='gather'&&!['wood','stone','water','veg','herb'].includes(args.item))return {ok:false,reason:'未知採集物'};
 if(kind==='move'&&(!Array.isArray(args.pos)||args.pos.length!==2||args.pos.some(n=>!Number.isFinite(n))||!findPath(w,position(p),args.pos)))return {ok:false,reason:'目標無路可達／水域或封閉邊界'};
 if(kind==='cook'&&!RECIPES[args.recipe||'meal'])return {ok:false,reason:'未知配方'};
 if(kind==='farm'&&!['garden','herb'].includes(args.crop||'garden'))return {ok:false,reason:'未知畦田'};
 if(!p.adult&&!['drink','move','rest','sleep','eat','talk','encourage','return'].includes(kind))return {ok:false,reason:'小禾只參與親情、陪伴與生活'};
 if(kind==='drink'&&p.teaUntil>w.tick)return {ok:false,reason:'藥茶仍在120秒調養間隔內'};
 if(kind==='care'&&!(w.people[args.target]?.injury>0||w.people[args.target]?.hp<w.people[args.target]?.maxHp))return {ok:false,reason:'對方目前不需傷病照料，可先交談／指點'};
 if(kind==='encourage'){const o=w.people[args.target];if((!o?.frustration||(o.encouragedSources||[]).includes(o.frustration.source))&&!o?.injury)return {ok:false,reason:'對方目前沒有受挫／傷病記錄，可先交談'};}
 if(p.hp<=0)return {ok:false,reason:'倒地者需要救援'};
 if(p.injury>60&&!['return','rest','sleep','eat','care','move'].includes(kind))return {ok:false,reason:'傷勢過重，請先照料／休息'};
 cancel(w,p);if(manual){delete p.temporary;p.revision++;p.intent={kind,args:{...args},revision:p.revision};p.manualStop=false;}
 const a={id:uid(w,'activity'),actor:p.id,kind,args:{...args},phase:'init',progress:0,revision:p.revision,started:w.tick,units:0};w.activities[a.id]=a;p.activity=a.id;p.reason=(manual?'玩家指令：':'自主：')+(TASKNAME[kind]||kind);p.next='完成當前單位';return {ok:true};
}
export function restoreTemporary(w,p,a,blocked=false){const t=p.temporary;if(!t||t.revision!==a.revision||!(a.kind===t.kind||t.kind==='farm'&&a.kind==='harvestHaul'))return false;delete p.temporary;p.revision++;p.auto=t.auto;p.manualStop=t.manualStop;p.intent=t.intent?{...structuredClone(t.intent),revision:p.revision}:null;event(w,blocked?'temporary-blocked':'temporary-return',[p.id],{kind:t.kind,revision:t.revision,returnTo:p.intent?.kind||(p.manualStop||!p.auto?'stopped':'schedule')});return true;}
export function finish(w,p,a,text='完成',keepIntent=false){if(!w.activities[a.id]||w.completionIds[a.id])return;w.completionIds[a.id]=true;release(w,a.id);delete w.activities[a.id];p.activity=null;p.pose='idle';p.reason=text;p.path=[];p.routeAt=0;if(!keepIntent&&p.intent?.revision===a.revision&&(p.intent.kind===a.kind||a.kind==='harvestHaul'&&p.intent.kind==='farm'))p.intent=null;restoreTemporary(w,p,a);event(w,'activity-complete',[p.id],{kind:a.kind,completionId:a.id,units:a.units});if(['class','drink','gather','cook','craft','farm','harvestHaul','school','reception','eat','talk','encourage','care','teach'].includes(a.kind)){const at=position(p);route(w,p,[at[0]+20,at[1]+20]);}}
function blocked(p,a,text){p.frustration={reason:text,source:a.id,tick:p.simTick||a.started};a.blocked=text;p.blocked=text;p.next='改善條件後重試';}
export function approach(w,p,a,key,pos){
 const target=pos||stations[key];if(!target){blocked(p,a,'站位不存在：'+key);return false;}
 if(p.bridgeExit)return false;
 if(a.checked!==key){if(!findPath(w,position(p),target)){blocked(p,a,'無路可達：'+key);return false;}a.checked=key;}
 const distance=Math.hypot(p.x/Q-target[0],p.y/Q-target[1]);
 if(distance>42){if(a.destination!==key||arrived(p)){route(w,p,target);a.destination=key;}return false;}
 if(!reserve(w,a,'station:'+key)){
  const holders=Object.values(w.reservations).filter(r=>r.key==='station:'+key);blocked(p,a,'候位：'+key+'／'+holders.map(r=>w.people[r.actor]?.name).join(''));
  if(a.destination!==key+'.queue'||arrived(p)){const index=sorted(w.people).filter(o=>o.id<p.id&&o.blocked.includes(key)).length;const q=[target[0]+22+(index%3)*16,target[1]+24+Math.floor(index/3)*16];if(route(w,p,q))a.destination=key+'.queue';}return false;
 }
 if(distance>1){if(a.destination!==key||arrived(p)){route(w,p,target);a.destination=key;}return false;}
 p.blocked='';a.blocked='';p.path=[];p.routeAt=0;return true;
}
const clearStation=(w,a)=>{for(const k of Object.keys(w.reservations))if(w.reservations[k].activity===a.id&&w.reservations[k].key.startsWith('station:'))delete w.reservations[k];for(const [key,q]of Object.entries(w.queues))if(key.startsWith('station:'))w.queues[key]=q.filter(r=>r.activity!==a.id);a.destination=null;};
function work(p,rate=30){p.workRemainder=(p.workRemainder||0)+rate;const n=Math.floor(p.workRemainder/20);p.energy=Math.max(0,p.energy-n);p.workRemainder%=20;}
function duration(a,ticks){a.progress++;return a.progress>=ticks;}
export function workTick(w,p){const d=String(day(w));p.contribution[d]??={units:0,ticks:0,exempt:null};p.contribution[d].ticks++;}
export function countWork(w,p,a,units=1){const d=String(day(w));p.contribution[d]??={units:0,ticks:0,exempt:null};p.contribution[d].units+=units;}
export function memory(w,kind,one,two,source){if(!one||!two||one.id===two.id)return false;const pair=[one.id,two.id].sort(),key=pair.join('|')+'|'+kind;
 if(w.memories.some(m=>m.key===key&&w.tick-m.tick<2400))return false;
 const id=uid(w,'memory'),m={id,key,kind,actors:pair,tick:w.tick,pos:position(one),source};w.memories.push(m);
 for(const [p,o]of [[one,two],[two,one]]){const k=p.id+'|'+o.id;w.relationships[k]??={trust:0,willingness:0,types:[],events:[],accepted:false};const r=w.relationships[k];r.trust+=MEMORY[kind][1];r.willingness+=kind==='talk'?1:3;if(!r.types.includes(kind))r.types.push(kind);r.events.push(id);}
 event(w,'memory',pair,{kind,text:MEMORY[kind][0],source});return true;
}
export function buildOrder(w,id){const f=Object.hasOwn(w.facilities,id)?w.facilities[id]:null;if(!f||f.stage>=FACILITIES[id].stages.length)return {ok:false,reason:'已完成此建物'};
 if(id==='hall'){
  const slots=bedSlots(w).filter(b=>!b.startsWith('hall.'));const resident=sorted(w.people).filter(p=>p.residence==='resident');const keep=f.stage===0?2:0;
  if(slots.length+keep<resident.length)return {ok:false,reason:'需先修宿舍／側舍，遷出臨鋪'};
  let occupied=new Set(resident.filter(p=>p.bed&&!p.bed.startsWith('hall.')).map(p=>p.bed));
  for(const p of resident.filter(p=>p.bed?.startsWith('hall.'))){const b=slots.find(b=>!occupied.has(b));if(b){occupied.add(b);p.bed=b;cancel(w,p,'臨鋪遷床');if(inRect(p.x/Q,p.y/Q,rects.hall.rect))begin(w,p,'move',{pos:stations['safe.'+(resident.indexOf(p)%10)]});}}
 }
 f.active=true;event(w,'build-order',[],{facility:id,stage:f.stage+1});return {ok:true};
}
function sitePoint(w,id,p){const base=stations[id+'.work']||stations[id+'.worksite'];const other=sorted(w.people).filter(o=>o.id<p.id&&w.activities[o.activity]?.kind==='build'&&w.activities[o.activity]?.args.facility===id).length;return [base[0]+(other%2)*18,base[1]];}
function depositBag(w,p,a){
 const items=Object.entries(w.inventories[p.bag].items);if(!items.length)return true;const [item,n]=items[0],dest=sourceFor(item),key=dest==='vat'?'kitchen.vat':dest==='table'?'dining.1':'store.drop';
 const cap=w.inventories[dest].capacity,held=Object.values(w.reservations).filter(r=>r.key==='dest:'+dest+':'+item&&r.activity!==a.id).reduce((n,r)=>n+r.n,0),available=cap-physicalQty(w,dest,item)-held;if(available<=0){blocked(p,a,'目的倉滿：'+item);return false;}
 if(approach(w,p,a,key)){transfer(w,p.bag,dest,item,Math.min(n,available));clearStation(w,a);}return false;
}
function gatherTick(w,p,a,dest='store',desiredItem=null){
 const item=desiredItem||a.args.item||'wood',source=w.ecology[item],cap=4-bagWeight(w,p),out=item==='water'?2:1;
 if(a.phase==='init'){
  if(qty(w,p.bag,item)>0){a.phase='deliver';}
  else if(bagWeight(w,p)>0){depositBag(w,p,a);return;}
  else {const target=stations[item==='water'?'water.take':item];if(!findPath(w,position(p),target)){release(w,a.id);blocked(p,a,'無路到採集點');return;}
   const left=w.inventories[dest].capacity-qty(w,dest,item);if(left<=0){blocked(p,a,'目的倉滿：'+item);return;}
   if(source&&source.remaining<=0){blocked(p,a,'來源用盡：'+item);return;}
   const stageNeed=dest.startsWith('site.')?FACILITIES[dest.slice(5)].stages[w.facilities[dest.slice(5)].stage][item==='wood'?0:1]-(w.inventories[dest].items[item]||0):left;const n=Math.min(item==='stone'?2:4,left,source?.remaining??4,stageNeed);if(n<=0){release(w,a.id);p.blocked='新到材料下個tick可用';return;}if(!reserve(w,a,'dest:'+dest+':'+item,n,stageNeed)){blocked(p,a,'目的容量已預約');return;}
   a.load=n;a.phase='gather';a.progress=0;
  }
 }
 if(a.phase==='gather'){
  if(!approach(w,p,a,item==='water'?'water.take':item))return;
  work(p);workTick(w,p);if(duration(a,(item==='water'?6:item==='wood'?8:item==='stone'?10:8)*HZ)){
   const n=Math.min(out,a.load-qty(w,p.bag,item),item==='stone'?Math.floor(cap/2):cap,source?.remaining??out);
   if(n>0){if(source)source.remaining-=n;add(w,p.bag,item,n,'gather');event(w,'harvest',[p.id],{item,n});a.units++;}
   a.progress=0;if(qty(w,p.bag,item)>=a.load||source&&source.remaining<=0){a.phase='deliver';clearStation(w,a);}
  }
 }
 if(a.phase==='deliver'){
  if(!qty(w,p.bag,item)){release(w,a.id);a.phase='init';a.progress=0;if(a.kind==='gather')finish(w,p,a,'來源用盡，未取得物資');return;}
  const destKey=dest.startsWith('site.')?dest.slice(5)+'.delivery':dest==='vat'?'kitchen.vat':'store.drop';const pos=dest.startsWith('site.')?sitePoint(w,dest.slice(5),p):null;
  if(approach(w,p,a,destKey,pos)){
   const held=Object.values(w.reservations).filter(r=>r.key==='dest:'+dest+':'+item&&r.activity!==a.id).reduce((n,r)=>n+r.n,0);let n=Math.min(qty(w,p.bag,item),w.inventories[dest].capacity-physicalQty(w,dest,item)-held);if(n<=0){blocked(p,a,'目的容量已預約／目的倉滿：'+item);return;}if(dest.startsWith('site.')){const f=w.facilities[dest.slice(5)],req=FACILITIES[f.id].stages[f.stage];n=Math.min(n,(item==='wood'?req[0]:req[1])-(w.inventories[dest].items[item]||0));}
   if(n>0){transfer(w,p.bag,dest,item,n);countWork(w,p,a);}release(w,a.id);a.destination=null;a.phase='init';a.progress=0;
   if(a.kind==='gather')finish(w,p,a,'採集搬交完成');
  }
 }
}
function buildTick(w,p,a){const id=a.args.facility,f=w.facilities[id];if(!f?.active){finish(w,p,a,'工地已停工');return;}const req=FACILITIES[id].stages[f.stage];if(!req){finish(w,p,a);return;}
 if(a.phase==='gather'||a.phase==='deliver'){gatherTick(w,p,a,'site.'+id,a.material);return;}
 if(a.phase==='withdraw'){
  if(approach(w,p,a,'store.drop')){const n=Math.min(a.load,qty(w,'store',a.material));if(n){transfer(w,'store',p.bag,a.material,n);delete w.reservations[a.id+'|source:store:'+a.material];a.phase='deliver';}else {release(w,a.id);a.phase='init';}clearStation(w,a);}return;
 }
 let missing=['wood','stone'].find((i,j)=>qty(w,'site.'+id,i)<req[j]);
 if(missing){
  if(bagWeight(w,p)>0&&qty(w,p.bag,missing)===0){depositBag(w,p,a);return;}
  const n=Math.min(req[missing==='wood'?0:1]-qty(w,'site.'+id,missing),missing==='stone'?2:4);
  a.material=missing;a.load=n;
  if(qty(w,p.bag,missing)){a.phase='deliver';return;}
  if(!reserve(w,a,'dest:site.'+id+':'+missing,n,req[missing==='wood'?0:1]-qty(w,'site.'+id,missing))){blocked(p,a,'工地材料在途');return;}
  if(qty(w,'store',missing)>0){a.load=Math.min(n,qty(w,'store',missing));if(reserve(w,a,'source:store:'+missing,a.load,qty(w,'store',missing)))a.phase='withdraw';else blocked(p,a,'倉料已預約');}
  else {a.phase='init';gatherTick(w,p,a,'site.'+id,missing);}return;
 }
 const pos=sitePoint(w,id,p),key=id+'.builder.'+(pos[0]);if(!approach(w,p,a,key,pos))return;
 if(f.work<req[2]*HZ){work(p);workTick(w,p);f.work++;a.progress++;if(a.progress%200===0)countWork(w,p,a);}const peers=sorted(w.people).filter(o=>o.id!==p.id&&w.activities[o.activity]?.kind==='build'&&w.activities[o.activity]?.args.facility===id&&Math.hypot(o.x-p.x,o.y-p.y)<60*Q);
 for(const o of peers)if(w.tick-a.started>=400)memory(w,'cowork',p,o,a.id);
 if(f.work>=req[2]*HZ){
  const upcoming={facilities:{...w.facilities,[id]:{...f,stage:f.stage+1}}};const unsafe=sorted(w.people).filter(o=>o.residence!=='departed'&&!o.inactive&&!walkable(upcoming,...position(o)));if(unsafe.length){f.work=req[2]*HZ;for(const [i,o]of unsafe.entries()){const at=sitePoint(w,id,o);begin(w,o,'move',{pos:[at[0]+(i+1)*18,at[1]+20]});o.intent=null;o.reason='建物變更前安全遷出';event(w,'construction-evacuate',[o.id],{facility:id});}blocked(p,a,'等候住者沿路遷出，材料工量保留');return;}
  for(const [item,n]of [['wood',req[0]],['stone',req[1]]])if(n)add(w,'site.'+id,item,-n,'construction');
  f.stage++;f.work=0;f.active=false;assignBeds(w);
  if(id==='store')w.inventories.store.capacity=[24,48,96][f.stage];if(id==='kitchen')w.inventories.vat.capacity=[8,16,24][f.stage];
  event(w,'building-complete',[p.id],{facility:id,stage:f.stage});finish(w,p,a,FACILITIES[id].name+'完成');
 }
}
function stationAvailable(w,base,count,p){const candidates=Array.from({length:count},(_,i)=>base+(i+1));return candidates.find(k=>!Object.values(w.reservations).some(r=>r.key==='station:'+k&&r.actor!==p.id))||candidates[0];}
export function recoverTick(w,p,kind,key){const gain=kind==='sleep'?(key.startsWith('hall')?120:200):80;p.restRemainder=(p.restRemainder||0)+gain*(kind==='sleep'&&!p.meals?3:4);const energy=Math.floor(p.restRemainder/80);p.restRemainder%=80;p.energy=Math.min(10000,p.energy+energy);p.hpRemainder=(p.hpRemainder||0)+1;if(p.hpRemainder>=20){p.hp=Math.min(p.maxHp,p.hp+1);p.hpRemainder-=20;}if(w.tick%200===0)p.injury=Math.max(0,p.injury-1);}
export function activityTick(w,p){const a=w.activities[p.activity];if(!a||p.hp<=0||p.stun)return;if(p.action&&a.kind!=='train')return;
 if(a.kind==='gather'){gatherTick(w,p,a,p.args?.item==='water'?'vat':a.args.item==='water'?'vat':'store');return;}
 if(a.kind==='build'){buildTick(w,p,a);return;}
 if(a.kind==='move'||a.kind==='return'){
  const pos=a.args.pos||stations['safe.'+(sorted(w.people).filter(o=>o.residence==='resident').findIndex(o=>o.id===p.id)%10)];
  if(a.phase==='init'){if(route(w,p,pos)){a.phase='walking';}else blocked(p,a,'無路可回');}
  if(a.phase==='walking'&&arrived(p)&&!p.bridgeExit){if(a.kind==='return'){p.manualStop=true;event(w,'returned',[p.id]);}finish(w,p,a,'已抵達');}return;
 }
 if(a.kind==='train'||a.kind==='study'){
  if(!p.adult){finish(w,p,a);return;}const art=a.args.art||'punch';if(!p.skill[art]){blocked(p,a,'尚未學會這門武學，請先授課');return;}if(w.martialPlan&&a.kind==='train'&&['staff','sword','nine'].includes(art)){const weapon=art==='nine'?'sword':art;if(p.weapon!==weapon||!qty(w,p.equipment,weapon)){blocked(p,a,'先實際領用並裝備'+(weapon==='staff'?'木棍':'木劍')+'再練');return;}}
  if(bagWeight(w,p)){depositBag(w,p,a);return;}
  const key=a.kind==='study'?'quiet.book':(a.station||=stationAvailable(w,'yard.',w.facilities.yard.stage===2?4:w.facilities.yard.stage===1?2:1,p));
  if(a.kind==='study'&&!w.facilities.quiet.stage){blocked(p,a,'先建靜室');return;}
  if(!approach(w,p,a,key))return;work(p,25);p.pose='practice';p.dailyPractice??={};p.dailyPractice[day(w)]=(p.dailyPractice[day(w)]||0)+1;
  if(duration(a,(a.kind==='train'?12:20)*HZ)){
   const s=p.skill[art];if(a.kind==='train'){s.F=Math.min(100,s.F+3);s.practice++;if(s.practice>=6&&!p.skill.step)p.skill.step={U:5,F:0,I:0,contexts:[],practice:0,sources:[]};}
   else{const k=day(w)+'.'+art;p.readUnits??={};if((p.readUnits[k]||0)>=3){finish(w,p,a,'今日研讀已三單位');return;}p.readUnits[k]=(p.readUnits[k]||0)+1;s.U=Math.min(100,s.U+2+Math.floor(p.stats[3]/2));}
   s.sources.push({kind:a.kind,tick:w.tick,activity:a.id});event(w,'growth',[p.id],{art,U:s.U,F:s.F,I:s.I,source:a.kind});a.units++;a.progress=0;
   if(a.args.units&&a.units>=a.args.units)finish(w,p,a,'練習完成');
  }return;
 }
 if(['rest','sleep','eat'].includes(a.kind)){
  if(a.kind==='eat'&&a.args.item==='ration'&&!qty(w,p.bag,'ration')){if(bagWeight(w,p)>=4||!reserve(w,a,'source:store:ration',1,qty(w,'store','ration'))){blocked(p,a,'需一份未預約乾糧與空手位');return;}if(approach(w,p,a,'store.drop')){transfer(w,'store',p.bag,'ration',1);delete w.reservations[a.id+'|source:store:ration'];clearStation(w,a);}return;}
  let key=a.kind==='sleep'?p.bed:a.kind==='eat'?(a.station||=stationAvailable(w,'dining.',[3,6,8][w.facilities.dining.stage],p)):(a.station||='safe.'+homeSlotIndex(w,p));
  if(!key){blocked(p,a,'沒有可用床位');return;}if(a.kind==='eat'&&a.args.item!=='ration'){if(qty(w,'table','meal')<=0){release(w,a.id);finish(w,p,a,'缺餐：先備餐或坐休');return;}if(!reserve(w,a,'source:table:meal',1,qty(w,'table','meal'))){blocked(p,a,'餐已預約，等候下一鍋');return;}}
  if(!approach(w,p,a,key))return;p.pose=a.kind;
  if(a.kind==='eat'){
   if(duration(a,10*HZ)){add(w,a.args.item==='ration'?p.bag:'table',a.args.item==='ration'?'ration':'meal',-1,'eat');p.meals++;if(p.meals<=2)p.energy=Math.min(10000,p.energy+1500);event(w,'ate',[p.id]);finish(w,p,a,'已用餐');}
  }else{
   recoverTick(w,p,a.kind,key);
   if(p.energy>= (a.args.until||10000)&&p.hp>=p.maxHp&&p.injury===0){finish(w,p,a,'恢復完成');p.recovering=false;}
  }return;
 }
 if(a.kind==='cook'||a.kind==='craft'){
  const recipe=a.kind==='craft'?'craft.'+a.args.art:a.args.recipe||'meal',r=a.kind==='craft'?{input:{wood:2},out:{[a.args.art==='staff'?'staff':'sword']:1},seconds:[8,8,8]}:RECIPES[recipe];
  if(!r){blocked(p,a,'未知配方');return;}if(recipe==='ration'&&w.facilities.kitchen.stage<2){blocked(p,a,'乾糧需最終膳房');return;}
  if(a.kind==='craft'&&!w.facilities.hall.stage){blocked(p,a,'需先修補大廳教學');return;}
  const outputOwner=w.facilities[a.kind==='craft'?'hall':'kitchen'];if(a.phase==='init'&&outputOwner.wip?.output&&!w.activities[outputOwner.wip.activity]&&outputOwner.wip.recipe===recipe)a.resumingBatch??=outputOwner.wip.output.id;if(outputOwner.wip?.output?.doneAt!==undefined&&!w.activities[outputOwner.wip.activity])outputOwner.wip=null;
  if(a.resumingBatch&&!outputOwner.wip){finish(w,p,a,'原先成品已實際搬交');return;}
  if(a.phase==='init'&&bagWeight(w,p)>0){depositBag(w,p,a);return;}
  if(a.phase==='init'){
   const old=w.facilities[a.kind==='craft'?'hall':'kitchen'].wip;if(old){if(w.activities[old.activity]&&old.activity!==a.id){blocked(p,a,'灶上有他人正在烹調');return;}if(old.recipe!==recipe){blocked(p,a,'灶上仍有在製品：'+old.recipe+'，先續做');return;}if(w.lifePolicy){old.orderOrigin??=old.output?.orderOrigin||old.output?.id||old.activity;if(p.temporary?.kind===a.kind&&p.temporary.revision===a.revision)p.temporary.originId=old.orderOrigin;}a.committed=true;a.phase=old.output?'haulOutput':'perform';a.progress=old.progress;old.activity=a.id;}
  }
  if(a.phase==='init'){
   for(const [item,n]of Object.entries(r.out)){const dest=item==='meal'?'table':'store';if(!reserve(w,a,'dest:'+dest+':'+item,n,w.inventories[dest].capacity-(w.inventories[dest].items[item]||0))){release(w,a.id);blocked(p,a,'成品目的倉已滿：'+item);return;}}
   for(const [item,n]of Object.entries(r.input))if(qty(w,sourceFor(item),item)<n){release(w,a.id);blocked(p,a,'缺料：'+item);return;}
   if(!Object.entries(r.input).every(([i,n])=>reserve(w,a,'source:'+sourceFor(i)+':'+i,n,qty(w,sourceFor(i),i)))){release(w,a.id);blocked(p,a,'原料已預約');return;}
   a.phase='fetch';a.fetch=Object.keys(r.input);
  }
  if(a.phase==='fetch'){
   const item=a.fetch[0];if(!item){a.phase='perform';a.progress=0;clearStation(w,a);return;}
   const src=sourceFor(item),key=src==='vat'?'kitchen.vat':'store.drop';
   if(approach(w,p,a,key)){const n=r.input[item];if(qty(w,src,item)<n){release(w,a.id);a.phase='init';return;}transfer(w,src,p.bag,item,n);a.fetch.shift();delete w.reservations[a.id+'|source:'+src+':'+item];clearStation(w,a);}return;
  }
  if(a.phase==='haulOutput'){
   const owner=w.facilities[a.kind==='craft'?'hall':'kitchen'],batch=owner.wip?.output;if(!batch){blocked(p,a,'出鍋批次已不在此工作台');return;}
   if(batch.doneAt!==undefined){owner.wip=null;countWork(w,p,a);finish(w,p,a,'成品已實際搬交');return;}
   const item=batch.item,carried=batch.locations[p.bag]||0,source=batch.source;
   if(carried){const available=w.inventories[batch.target].capacity-physicalQty(w,batch.target,item)-Object.values(w.reservations).filter(r=>r.key==='dest:'+batch.target+':'+item&&r.activity!==a.id).reduce((n,r)=>n+r.n,0);if(available<carried){clearStation(w,a);blocked(p,a,'成品目的倉滿，物品仍在手中：'+item);return;}if(approach(w,p,a,batch.target==='table'?'table.drop':'store.drop')){transfer(w,p.bag,batch.target,item,carried);const token=w.reservations[a.id+'|dest:'+batch.target+':'+item];if(token){token.n-=carried;if(token.n<=0)delete w.reservations[a.id+'|dest:'+batch.target+':'+item];}clearStation(w,a);}return;}
   if(bagWeight(w,p)){depositBag(w,p,a);return;}
   const n=Math.min(batch.locations[source]||0,4);if(!n){clearStation(w,a);blocked(p,a,'成品由原搬運者持有，請其先搬交');return;}
   if(approach(w,p,a,batch.sourceStation)){transfer(w,source,p.bag,item,n);clearStation(w,a);}return;
  }
  const key=a.kind==='craft'?'hall.teach':'kitchen.cook';if(!approach(w,p,a,key))return;
  if(!a.committed){
   const existing=w.facilities[a.kind==='craft'?'hall':'kitchen'].wip;if(existing&&existing.activity!==a.id){a.phase='init';clearStation(w,a);blocked(p,a,'先交回手料，再接續保留在製品');return;}
   for(const [item,n]of Object.entries(r.input))add(w,p.bag,item,-n,'recipe');
   a.committed=true;w.facilities[a.kind==='craft'?'hall':'kitchen'].wip={recipe,progress:0,activity:a.id,out:r.out};if(w.lifePolicy)w.facilities[a.kind==='craft'?'hall':'kitchen'].wip.orderOrigin=a.id;event(w,'recipe-start',[p.id],{recipe});
  }
  work(p);workTick(w,p);a.progress++;const owner=w.facilities[a.kind==='craft'?'hall':'kitchen'];owner.wip.progress=a.progress;
  if(a.progress>=r.seconds[w.facilities.kitchen.stage]*HZ){const [item,n]=Object.entries(r.out)[0],source=a.kind==='craft'?'workbench':'pot';if(!w.inventories[source])inventory(w,source,{},96);owner.wip.output={id:a.id,item,total:n,source,sourceStation:key,target:item==='meal'?'table':'store',locations:{[source]:n},delivered:0,consumed:0,actor:p.id};if(w.lifePolicy)owner.wip.output.orderOrigin=owner.wip.orderOrigin||a.id;add(w,source,item,n,'recipe');a.phase='haulOutput';clearStation(w,a);event(w,'recipe-cooked',[p.id],{recipe,batch:a.id,source});}return;
 }
 if(['talk','encourage','care','teach','greet'].includes(a.kind)){
  const o=w.people[a.args.target];if(!o||o.residence==='departed'||o.hp<=0){finish(w,p,a,'對象已離去／失能');return;}
  if(a.phase==='init'){
   if(o.storyBusy||o.activity&&w.activities[o.activity]?.partner!==p.id){blocked(p,a,'對方正在忙，可先叫停再邀');return;}
   if(!reserveBundle(w,a,[['participant:'+o.id],['station:hall.greet'],['station:point.1190.1070']])){blocked(p,a,'雙人站位候位／對方另有約定');return;}
   a.partner=o.id;a.session=a.id;const b={id:uid(w,'activity'),actor:o.id,kind:'paired',partner:p.id,session:a.id,args:{},progress:0,phase:'paired',revision:o.revision,started:w.tick};w.activities[b.id]=b;o.activity=b.id;
   const at=stations['hall.greet'];a.pos=[...at];a.otherPos=[at[0]+20,at[1]];route(w,o,a.otherPos);a.phase='approach';
  }
  if(!approach(w,p,a,'hall.greet',a.pos)||!arrived(o)||Math.hypot(o.x/Q-a.otherPos[0],o.y/Q-a.otherPos[1])>1)return;
  p.pose=a.kind==='teach'?'teach':a.kind==='care'?'help':a.kind==='encourage'?'encourage':'talk';o.pose='listen';if(duration(a,(a.kind==='care'?12:10)*HZ)){
   const kind=a.kind==='greet'?'talk':a.kind;memory(w,kind,p,o,a.id);if(kind==='encourage'&&o.frustration){o.encouragedSources??=[];if(!o.encouragedSources.includes(o.frustration.source))o.encouragedSources.push(o.frustration.source);o.frustration=null;}if(kind==='care')o.injury=Math.max(0,o.injury-5);
   if(o.id==='amu'&&w.memories.some(m=>m.kind==='cowork'&&m.actors.includes('amu'))){w.stories['recruit.worker'].status='completed';o.willingness=6;}
   const b=w.activities[o.activity];if(b){release(w,b.id);delete w.activities[b.id];o.activity=null;o.reason='交談完成';route(w,o,[a.otherPos[0]+20,a.otherPos[1]+20]);}finish(w,p,a,'雙人活動完成');
  }return;
 }
}
export function autonomy(w,p){
 if(!['resident','visitor'].includes(p.residence)||p.hp<=0||p.rank==='rescuer'||p.combatSession||p.combatTarget||p.departing||p.storyBusy)return;
 if(p.mealDay!==day(w)){p.mealDay=day(w);p.meals=0;const prior=p.contribution[day(w)-1];if(p.rank==='outer'&&!prior)p.contribution[day(w)-1]={units:0,ticks:0,exempt:p.injury>60?'傷病休養':null};}
 const down=sorted(w.people).find(o=>o.id!==p.id&&o.residence==='resident'&&o.hp<=0&&Math.hypot(o.x-p.x,o.y-p.y)<120*Q&&los(w,position(p),position(o)));if(down&&p.adult&&p.injury<=60&&w.activities[p.activity]?.kind!=='aid'){const intent=p.intent;begin(w,p,'aid',{target:down.id});p.intent=intent;p.reason='優先照料眼前倒地同門';p.contribution[day(w)]??={units:0,ticks:0,exempt:null};p.contribution[day(w)].exempt='必要照料倒地同門';return;}
 if(p.activity){const a=w.activities[p.activity];if(w.lifePolicy&&p.temporary&&a.revision===p.temporary.revision&&(a.kind===p.temporary.kind||p.temporary.kind==='farm'&&a.kind==='harvestHaul')){const signature=JSON.stringify([p.x,p.y,p.energy,p.hp,p.injury,a.phase,a.progress,a.units,w.inventories[p.bag].items]);if(a.policyWatch?.signature!==signature)a.policyWatch={signature,since:w.tick};if(p.blocked&&w.tick-a.policyWatch.since>=600){cancel(w,p,'臨時工作30秒無進展，回原安排');restoreTemporary(w,p,a,true);return;}}if(shouldYield(w,p,a)){cancel(w,p,'自主工作在安全單位邊界交接，保留修行');return;}if(!p.intent&&(p.blocked||a.blocked)&&w.tick-a.started>600&&!['rest','sleep','eat','paired','aid'].includes(a.kind)){p.lastBlockedTask={kind:a.kind,args:structuredClone(a.args),until:w.tick+200,reason:p.blocked};cancel(w,p,'自主作業受阻，先改選可行工作');return;}if(!['rest','sleep','eat','return','paired'].includes(a.kind)&&(p.energy<2500||w.lifePolicy&&p.injury>60&&!['move','aid'].includes(a.kind))){const intent=p.intent;p.recovering=true;begin(w,p,'rest',{until:7500});p.intent=intent;p.reason=w.lifePolicy&&p.injury>60?'傷勢過重：實際休養後續有效指令':'精力低於25：先照料自己，恢復75後續有效指令';}return;}
 if(p.recovering&&p.energy<7500){begin(w,p,'rest',{until:7500});return;}p.recovering=false;
 if(p.temporary?.unitDelivered){const t=p.temporary;p.intent=null;restoreTemporary(w,p,{kind:t.kind,revision:t.revision});return;}
 if(w.lifePolicy&&p.injury>60&&p.intent&&!p.manualStop&&!['move','return','rest','sleep','eat','aid'].includes(p.intent.kind)){const intent=p.intent;p.recovering=true;begin(w,p,p.bed?'sleep':'rest',{until:7500});p.intent=intent;p.reason='傷勢過重，先實際休養再續有效指令';return;}
 if(p.intent&&!p.manualStop){begin(w,p,p.intent.kind,p.intent.args);return;}
 if(p.energy<2500||p.injury>60){if(p.injury>60){p.contribution[day(w)]??={units:0,ticks:0,exempt:null};p.contribution[day(w)].exempt='傷病休養';}begin(w,p,p.bed?'sleep':'rest',{until:7500});p.reason='必要自理：休息至75';return;}
 if(!w.lifePolicy&&p.taskWaitUntil&&w.tick<p.taskWaitUntil){p.reason='等候作物生長，讓出作業位';return;}
 const phase=w.tick%DAY;
 if(phase>=8400&&p.energy<9900){begin(w,p,p.bed?'sleep':'rest');p.reason='作息：夜間睡眠';return;}
 if(p.meals<2&&qty(w,'table','meal')>0&&(phase<2000||phase>=6000&&phase<8400)){begin(w,p,'eat');p.reason='作息：用餐';return;}
 if(p.manualStop||!p.auto){p.reason='此人已停工；仍可自理';return;}
 if(!p.adult){const adult=sorted(w.people).find(o=>o.adult&&o.residence==='resident'&&!o.activity&&!o.manualStop&&o.hp>0&&Math.hypot(o.x-p.x,o.y-p.y)<120*Q&&los(w,position(p),position(o))&&((o.frustration&&!(o.encouragedSources||[]).includes(o.frustration.source))||o.injury)&&!w.memories.some(m=>m.kind==='encourage'&&m.actors.includes(p.id)&&m.actors.includes(o.id)&&w.tick-m.tick<2400));if(adult){begin(w,p,'encourage',{target:adult.id});p.reason='小禾想陪伴受挫的家人';return;}begin(w,p,'move',{pos:stations['safe.'+(2+(Math.floor(w.tick/200)%3))]});p.reason='小禾在院內散步、等家人';return;}
 let candidates=[];const addC=(kind,args,score,reason)=>{if(p.lastBlockedTask&&w.tick<p.lastBlockedTask.until&&p.lastBlockedTask.kind===kind&&JSON.stringify(p.lastBlockedTask.args)===JSON.stringify(args))return;candidates.push({kind,args,score,reason});};const unreserved=(id,item)=>qty(w,id,item)-Object.values(w.reservations).filter(r=>r.key==='source:'+id+':'+item).reduce((n,r)=>n+r.n,0);
 const residents=sorted(w.people).filter(o=>o.residence==='resident').length,manualGoals=w.goals.manual??w.commands.some(c=>c.type==='goals');const waterTarget=Math.min(w.inventories.vat.capacity,w.lifePolicy?supply(w).waterTarget:manualGoals?w.goals.water:2*residents),mealTarget=w.lifePolicy?supply(w).mealTarget:manualGoals?w.goals.meal:2*residents;
 if(qty(w,'table','meal')<mealTarget&&unreserved('store','veg')>=2&&unreserved('vat','water')>=1)addC('cook',{recipe:'meal'},qty(w,'table','meal')===0?90:60,'缺餐備糧');
 for(const f of sorted(w.facilities))if(f.active)addC('build',{facility:f.id},50+(w.policy==='build'?20:0),'已開工的'+FACILITIES[f.id].name);
 if(qty(w,'vat','water')<waterTarget)addC('gather',{item:'water'},qty(w,'vat','water')===0&&qty(w,'table','meal')===0?98:40,'低於水目標'+waterTarget);
 if(w.facilities.garden.stage&&qty(w,'store','veg')<mealTarget&&sorted(w.plots).some(o=>o.kind==='garden'&&Number(o.id.split('.')[1])<w.facilities.garden.stage&&o.stage!=='growing'&&!Object.values(w.reservations).some(r=>r.key==='plot:'+o.id&&r.actor!==p.id)))addC('farm',{crop:'garden'},55,'耕作維持菜供應');
 if(qty(w,'store','veg')<mealTarget&&w.ecology.veg.remaining)addC('gather',{item:'veg'},qty(w,'table','meal')===0?95:qty(w,'table','meal')<mealTarget?65:30,'補菜以便供餐');
 const record=p.contribution[day(w)],met=record?.units>=2||record?.ticks>=2400;
 if(p.rank==='inner'||p.rank==='outer'&&met||phase>=6000||w.policy==='train')addC('train',{art:trainingArt(w,p),units:5},((p.dailyPractice?.[day(w)]||0)<1200?40:20)+(w.policy==='train'?20:0)+(p.rank==='inner'?25:0),'保留修行窗口');
 if(met&&(p.dailyPractice?.[day(w)]||0)>=1200){const friend=sorted(w.people).find(o=>o.id!==p.id&&o.residence==='resident'&&!o.activity&&!o.combatSession&&!w.memories.some(m=>m.kind==='talk'&&m.actors.includes(p.id)&&m.actors.includes(o.id)&&w.tick-m.tick<2400));if(friend)addC('talk',{target:friend.id},25,'自由時段：與同門交談');else addC('move',{pos:stations['safe.'+homeSlotIndex(w,p)]},21,'自由時段：散步歇腳');}
 if(p.primary==='care'){const hurt=sorted(w.people).find(o=>o.id!==p.id&&o.residence==='resident'&&o.injury>10&&!o.activity);if(hurt)addC('care',{target:hurt.id},55,'照料受傷同門');}
 candidates=applyLifePolicy(w,p,candidates);
 for(const c of candidates){const job=c.kind==='gather'?'gather':['cook','farm'].includes(c.kind)?'production':c.kind==='build'?'build':c.kind==='care'?'care':c.kind==='teach'?'teach':null;c.roleBonus=job===(p.primary||'gather')?15:job===(p.secondary||'production')?5:0;if(!w.lifePolicy)delete c.roleBonus;if(job===(p.primary||'gather'))c.score+=15;else if(job===(p.secondary||'production'))c.score+=5;let trait=0;if(['build','train'].includes(c.kind))trait=Math.max(0,p.traits[0]*3);if(['care','talk','encourage'].includes(c.kind))trait=Math.max(0,p.traits[1]*5);if(c.kind==='move'||w.lifePolicy&&c.kind==='rest')trait=Math.max(0,-p.traits[0]*3);c.traitScore=Math.min(10,trait);c.score+=c.traitScore;const where=c.kind==='gather'?stations[c.args.item==='water'?'water.take':c.args.item]:c.kind==='build'?(stations[c.args.facility+'.work']||stations[c.args.facility+'.worksite']):c.kind==='cook'?stations['kitchen.cook']:c.kind==='train'?stations['yard.1']:c.kind==='talk'||c.kind==='care'?position(w.people[c.args.target]):c.args.pos;c.commutePenalty=where?Math.floor(Math.hypot(p.x/Q-where[0],p.y/Q-where[1])/100):0;c.score=Math.max(0,c.score-c.commutePenalty);}
 if(p.rank==='outer'&&!candidates.some(c=>['build','gather','cook','farm'].includes(c.kind))){p.contribution[day(w)]??={units:0,ticks:0,exempt:null};if(p.contribution[day(w)].units<2&&p.contribution[day(w)].ticks<2400)p.contribution[day(w)].exempt='缺料／物資達標，無可行雜務';}
 if(!candidates.length&&!w.lifePolicy)addC('train',{art:trainingArt(w,p),units:5},20,'物資已達標，練功與自由');
 if(!candidates.length){p.reason='目前可行候選仍受阻，稍候重選';p.taskWaitUntil=w.tick+40;return;}
 candidates.sort((a,b)=>b.score-a.score||a.kind.localeCompare(b.kind));const c=candidates[0];p.candidates=candidates.slice(0,3);begin(w,p,c.kind,c.args);if(w.lifePolicy){const a=w.activities[p.activity];if(a)a.decision={version:1,layer:c.layer,code:c.code,reason:c.reason,chosenAt:w.tick,score:c.score,baseScore:c.baseScore,roleBonus:c.roleBonus,traitScore:c.traitScore,commutePenalty:c.commutePenalty};}p.reason=c.reason+'（'+c.score+'；勤勉'+p.traits[0]+'／顧人'+p.traits[1]+'）';
}
