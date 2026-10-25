import {Q,HZ,DAY,FACILITIES,RECIPES,TASKNAME,ART,MEMORY} from './data.mjs';
import {stations,rects,position,bedSlots,findPath,inRect} from './map.mjs';
import {uid,event,inventory,qty,add,transfer,sourceFor,bagWeight,reserve,release,sorted,assignBeds,day} from './state.mjs';
import {route,arrived} from './navigation.mjs';
export function cancel(w,p,reason='玩家改派'){
 const a=w.activities[p.activity];if(a){release(w,a.id);delete w.activities[a.id];p.activity=null;
  if(a.partner){const o=w.people[a.partner];if(o&&w.activities[o.activity]?.session===a.session){release(w,o.activity);delete w.activities[o.activity];o.activity=null;o.path=[];o.reason='同伴已中止活動';}}
 }
 if(w.bridge.holder===p.id)p.bridgeExit=true;else{p.path=[];p.routeAt=0;w.bridge.queue=w.bridge.queue.filter(q=>q.id!==p.id);}
 p.reason=reason;p.blocked='';
}
export function begin(w,p,kind,args={},manual=false){
 if(!p.adult&&!['move','rest','sleep','eat','talk','encourage','return'].includes(kind))return {ok:false,reason:'小禾只參與親情、陪伴與生活'};
 if(p.hp<=0)return {ok:false,reason:'倒地者需要救援'};
 if(p.injury>60&&!['return','rest','sleep','eat','care','move'].includes(kind))return {ok:false,reason:'傷勢過重，請先照料／休息'};
 cancel(w,p);if(manual){p.revision++;p.intent={kind,args:{...args},revision:p.revision};p.manualStop=false;}
 const a={id:uid(w,'activity'),actor:p.id,kind,args:{...args},phase:'init',progress:0,revision:p.revision,started:w.tick,units:0};w.activities[a.id]=a;p.activity=a.id;p.reason=(manual?'玩家指令：':'自主：')+(TASKNAME[kind]||kind);p.next='完成當前單位';return {ok:true};
}
export function finish(w,p,a,text='完成',keepIntent=false){if(!w.activities[a.id])return;release(w,a.id);delete w.activities[a.id];p.activity=null;p.reason=text;p.path=[];p.routeAt=0;if(!keepIntent&&p.intent?.revision===a.revision)p.intent=null;event(w,'activity-complete',[p.id],{kind:a.kind,completionId:a.id,units:a.units});}
function blocked(p,a,text){a.blocked=text;p.blocked=text;p.next='改善條件後重試';}
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
const clearStation=(w,a)=>{for(const k of Object.keys(w.reservations))if(w.reservations[k].activity===a.id&&w.reservations[k].key.startsWith('station:'))delete w.reservations[k];a.destination=null;};
function work(p,rate=30){p.energy=Math.max(0,p.energy-rate/20);}
function duration(a,ticks){a.progress++;return a.progress>=ticks;}
function countWork(w,p,a,units=1){const d=String(day(w));p.contribution[d]??={units:0,ticks:0,exempt:null};p.contribution[d].units+=units;p.contribution[d].ticks+=a.progress;}
export function memory(w,kind,one,two,source){if(!one||!two||one.id===two.id)return false;const pair=[one.id,two.id].sort(),key=pair.join('|')+'|'+kind;
 if(w.memories.some(m=>m.key===key&&w.tick-m.tick<2400))return false;
 const id=uid(w,'memory'),m={id,key,kind,actors:pair,tick:w.tick,pos:position(one),source};w.memories.push(m);
 for(const [p,o]of [[one,two],[two,one]]){const k=p.id+'|'+o.id;w.relationships[k]??={trust:0,willingness:0,types:[],events:[],accepted:false};const r=w.relationships[k];r.trust+=MEMORY[kind][1];r.willingness+=kind==='talk'?1:3;if(!r.types.includes(kind))r.types.push(kind);r.events.push(id);}
 event(w,'memory',pair,{kind,text:MEMORY[kind][0],source});return true;
}
export function buildOrder(w,id){const f=w.facilities[id];if(!f||f.stage>=FACILITIES[id].stages.length)return {ok:false,reason:'已完成此建物'};
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
 const cap=w.inventories[dest].capacity,available=cap-qty(w,dest,item);if(available<=0){blocked(p,a,'目的倉滿：'+item);return false;}
 if(approach(w,p,a,key)){transfer(w,p.bag,dest,item,Math.min(n,available));clearStation(w,a);}return false;
}
function gatherTick(w,p,a,dest='store',desiredItem=null){
 const item=desiredItem||a.args.item||'wood',source=w.ecology[item],cap=4-bagWeight(w,p),out=item==='water'?2:1;
 if(a.phase==='init'){
  if(qty(w,p.bag,item)>0){a.phase='deliver';}
  else if(bagWeight(w,p)>0){depositBag(w,p,a);return;}
  else {const target=stations[item==='water'?'water.take':item];if(!findPath(w,position(p),target)){blocked(p,a,'無路到採集點');return;}
   const left=w.inventories[dest].capacity-qty(w,dest,item);if(left<=0){blocked(p,a,'目的倉滿：'+item);return;}
   if(source&&source.remaining<=0){blocked(p,a,'來源用盡：'+item);return;}
   const n=Math.min(item==='stone'?2:4,left,source?.remaining??4);if(!reserve(w,a,'dest:'+dest+':'+item,n,w.inventories[dest].capacity-qty(w,dest,item))){blocked(p,a,'目的容量已預約');return;}
   a.load=n;a.phase='gather';a.progress=0;
  }
 }
 if(a.phase==='gather'){
  if(!approach(w,p,a,item==='water'?'water.take':item))return;
  work(p);if(duration(a,(item==='water'?6:item==='wood'?8:item==='stone'?10:8)*HZ)){
   const n=Math.min(out,a.load-qty(w,p.bag,item),item==='stone'?Math.floor(cap/2):cap,source?.remaining??out);
   if(n>0){if(source)source.remaining-=n;add(w,p.bag,item,n,'gather');event(w,'harvest',[p.id],{item,n});a.units++;countWork(w,p,a);}
   a.progress=0;if(qty(w,p.bag,item)>=a.load||source&&source.remaining<=0){a.phase='deliver';clearStation(w,a);}
  }
 }
 if(a.phase==='deliver'){
  const destKey=dest.startsWith('site.')?dest.slice(5)+'.delivery':dest==='vat'?'kitchen.vat':'store.drop';const pos=dest.startsWith('site.')?sitePoint(w,dest.slice(5),p):null;
  if(approach(w,p,a,destKey,pos)){
   let n=qty(w,p.bag,item);if(dest.startsWith('site.')){const f=w.facilities[dest.slice(5)],req=FACILITIES[f.id].stages[f.stage];n=Math.min(n,(item==='wood'?req[0]:req[1])-qty(w,dest,item));}
   if(n>0)transfer(w,p.bag,dest,item,n);release(w,a.id);a.destination=null;a.phase='init';a.progress=0;
   if(a.kind==='gather')finish(w,p,a,'採集搬交完成');
  }
 }
}
function buildTick(w,p,a){const id=a.args.facility,f=w.facilities[id];if(!f?.active){finish(w,p,a,'工地已停工');return;}const req=FACILITIES[id].stages[f.stage];if(!req){finish(w,p,a);return;}
 if(a.phase==='gather'||a.phase==='deliver'){gatherTick(w,p,a,'site.'+id,a.material);return;}
 if(a.phase==='withdraw'){
  if(approach(w,p,a,'store.drop')){const n=Math.min(a.load,qty(w,'store',a.material));if(n){transfer(w,'store',p.bag,a.material,n);a.phase='deliver';}else {release(w,a.id);a.phase='init';}clearStation(w,a);}return;
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
 work(p);f.work++;a.progress++;if(a.progress%200===0)countWork(w,p,a);const peers=sorted(w.people).filter(o=>o.id!==p.id&&w.activities[o.activity]?.kind==='build'&&w.activities[o.activity]?.args.facility===id&&Math.hypot(o.x-p.x,o.y-p.y)<60*Q);
 for(const o of peers)if(w.tick-a.started>=400)memory(w,'cowork',p,o,a.id);
 if(f.work>=req[2]*HZ){
  for(const [item,n]of [['wood',req[0]],['stone',req[1]]])if(n)add(w,'site.'+id,item,-n,'construction');
  f.stage++;f.work=0;f.active=false;assignBeds(w);
  if(id==='store')w.inventories.store.capacity=[24,48,96][f.stage];if(id==='kitchen')w.inventories.vat.capacity=[8,16,24][f.stage];
  event(w,'building-complete',[p.id],{facility:id,stage:f.stage});finish(w,p,a,FACILITIES[id].name+'完成');
 }
}
function stationAvailable(w,base,count,p){const candidates=Array.from({length:count},(_,i)=>base+(i+1));return candidates.find(k=>!Object.values(w.reservations).some(r=>r.key==='station:'+k&&r.actor!==p.id))||candidates[0];}
export function activityTick(w,p){const a=w.activities[p.activity];if(!a||p.hp<=0||p.stun)return;if(p.action&&a.kind!=='train')return;
 if(a.kind==='gather'){gatherTick(w,p,a,p.args?.item==='water'?'vat':a.args.item==='water'?'vat':'store');return;}
 if(a.kind==='build'){buildTick(w,p,a);return;}
 if(a.kind==='move'||a.kind==='return'){
  const pos=a.args.pos||stations['safe.'+(sorted(w.people).filter(o=>o.residence==='resident').findIndex(o=>o.id===p.id)%10)];
  if(a.phase==='init'){if(route(w,p,pos)){a.phase='walking';}else blocked(p,a,'無路可回');}
  if(a.phase==='walking'&&arrived(p)&&!p.bridgeExit){if(a.kind==='return'){p.manualStop=true;event(w,'returned',[p.id]);}finish(w,p,a,'已抵達');}return;
 }
 if(a.kind==='train'||a.kind==='study'){
  if(!p.adult){finish(w,p,a);return;}const art=a.args.art||'punch';if(!p.skill[art]){blocked(p,a,'尚未學會這門武學，請先授課');return;}
  if(bagWeight(w,p)){depositBag(w,p,a);return;}
  const key=a.kind==='study'?'quiet.book':(a.station||=stationAvailable(w,'yard.',w.facilities.yard.stage===2?4:w.facilities.yard.stage===1?2:1,p));
  if(a.kind==='study'&&!w.facilities.quiet.stage){blocked(p,a,'先建靜室');return;}
  if(!approach(w,p,a,key))return;work(p,25);p.pose='practice';
  if(duration(a,(a.kind==='train'?12:20)*HZ)){
   const s=p.skill[art];if(a.kind==='train'){s.F=Math.min(100,s.F+3);s.practice++;if(s.practice>=6&&!p.skill.step)p.skill.step={U:5,F:0,I:0,contexts:[],practice:0,sources:[]};}
   else{const k=day(w)+'.'+art;p.readUnits??={};if((p.readUnits[k]||0)>=3){finish(w,p,a,'今日研讀已三單位');return;}p.readUnits[k]=(p.readUnits[k]||0)+1;s.U=Math.min(100,s.U+2+Math.floor(p.stats[3]/2));}
   s.sources.push({kind:a.kind,tick:w.tick,activity:a.id});event(w,'growth',[p.id],{art,U:s.U,F:s.F,I:s.I,source:a.kind});a.units++;a.progress=0;
   if(a.args.units&&a.units>=a.args.units)finish(w,p,a,'練習完成');
  }return;
 }
 if(['rest','sleep','eat'].includes(a.kind)){
  let key=a.kind==='sleep'?p.bed:a.kind==='eat'?(a.station||=stationAvailable(w,'dining.',[3,6,8][w.facilities.dining.stage],p)):(a.station||='safe.'+(sorted(w.people).findIndex(o=>o.id===p.id)%10));
  if(!key){blocked(p,a,'沒有可用床位');return;}if(a.kind==='eat'&&qty(w,'table','meal')<=0){blocked(p,a,'缺餐，請採菜、取水與烹調');return;}
  if(!approach(w,p,a,key))return;p.pose=a.kind;
  if(a.kind==='eat'){
   if(duration(a,10*HZ)){add(w,'table','meal',-1,'eat');p.meals++;if(p.meals<=2)p.energy=Math.min(10000,p.energy+1500);event(w,'ate',[p.id]);finish(w,p,a,'已用餐');}
  }else{
   const gain=a.kind==='sleep'?(key.startsWith('hall')?120:200):80;
   p.energy=Math.min(10000,p.energy+gain/HZ*(a.kind==='sleep'&&!p.meals?0.75:1));p.hp=Math.min(p.maxHp,p.hp+1/HZ);if(w.tick%200===0)p.injury=Math.max(0,p.injury-1);
   if(p.energy>= (a.args.until||10000)&&p.hp>=p.maxHp&&p.injury===0){finish(w,p,a,'恢復完成');p.recovering=false;}
  }return;
 }
 if(a.kind==='cook'||a.kind==='craft'){
  const recipe=a.args.recipe||'meal',r=a.kind==='craft'?{input:{wood:2},out:{[a.args.art==='staff'?'staff':'sword']:1},seconds:[8,8,8]}:RECIPES[recipe];
  if(!r){blocked(p,a,'未知配方');return;}if(recipe==='ration'&&w.facilities.kitchen.stage<2){blocked(p,a,'乾糧需最終膳房');return;}
  if(a.kind==='craft'&&!w.facilities.hall.stage){blocked(p,a,'需先修補大廳教學');return;}
  if(a.phase==='init'){
   for(const [item,n]of Object.entries(r.input))if(qty(w,sourceFor(item),item)<n){blocked(p,a,'缺料：'+item);return;}
   if(!Object.entries(r.input).every(([i,n])=>reserve(w,a,'source:'+sourceFor(i)+':'+i,n,qty(w,sourceFor(i),i)))){release(w,a.id);blocked(p,a,'原料已預約');return;}
   a.phase='fetch';a.fetch=Object.keys(r.input);
  }
  if(a.phase==='fetch'){
   const item=a.fetch[0];if(!item){a.phase='perform';a.progress=0;clearStation(w,a);return;}
   const src=sourceFor(item),key=src==='vat'?'kitchen.vat':'store.drop';
   if(approach(w,p,a,key)){const n=r.input[item];if(qty(w,src,item)<n){release(w,a.id);a.phase='init';return;}transfer(w,src,p.bag,item,n);a.fetch.shift();clearStation(w,a);}return;
  }
  const key=a.kind==='craft'?'hall.teach':'kitchen.cook';if(!approach(w,p,a,key))return;
  if(!a.committed){
   for(const [item,n]of Object.entries(r.input))add(w,p.bag,item,-n,'recipe');
   a.committed=true;w.facilities[a.kind==='craft'?'hall':'kitchen'].wip={recipe,progress:0,activity:a.id,out:r.out};event(w,'recipe-start',[p.id],{recipe});
  }
  work(p);a.progress++;const owner=w.facilities[a.kind==='craft'?'hall':'kitchen'];owner.wip.progress=a.progress;
  if(a.progress>=r.seconds[w.facilities.kitchen.stage]*HZ){for(const [item,n]of Object.entries(r.out))add(w,item==='meal'?'table':'store',item,n,'recipe');owner.wip=null;countWork(w,p,a);event(w,'recipe-complete',[p.id],{recipe});finish(w,p,a,'成品已完成');}return;
 }
 if(['talk','encourage','care','teach','greet'].includes(a.kind)){
  const o=w.people[a.args.target];if(!o||o.residence==='departed'||o.hp<=0){finish(w,p,a,'對象已離去／失能');return;}
  if(a.phase==='init'){
   if(o.activity&&w.activities[o.activity]?.partner!==p.id){blocked(p,a,'對方正在忙，可先叫停再邀');return;}
   if(!reserve(w,a,'participant:'+o.id)){blocked(p,a,'對方另有約定');return;}
   a.partner=o.id;a.session=a.id;const b={id:uid(w,'activity'),actor:o.id,kind:'paired',partner:p.id,session:a.id,args:{},progress:0,phase:'paired',revision:o.revision,started:w.tick};w.activities[b.id]=b;o.activity=b.id;
   const at=stations['hall.greet'];a.pos=[...at];a.otherPos=[at[0]+20,at[1]];route(w,o,a.otherPos);a.phase='approach';
  }
  if(!approach(w,p,a,'pair.'+a.id,a.pos)||!arrived(o)||Math.hypot(o.x/Q-a.otherPos[0],o.y/Q-a.otherPos[1])>1)return;
  p.pose='talk';o.pose='listen';if(duration(a,(a.kind==='care'?12:10)*HZ)){
   const kind=a.kind==='greet'?'talk':a.kind;memory(w,kind,p,o,a.id);if(kind==='care')o.injury=Math.max(0,o.injury-5);
   if(o.id==='amu'&&w.memories.some(m=>m.kind==='cowork'&&m.actors.includes('amu'))){w.stories['recruit.worker'].status='completed';o.willingness=6;}
   const b=w.activities[o.activity];if(b){release(w,b.id);delete w.activities[b.id];o.activity=null;o.reason='交談完成';}finish(w,p,a,'雙人活動完成');
  }return;
 }
}
export function autonomy(w,p){
 if(!['resident','visitor'].includes(p.residence)||p.hp<=0||p.rank==='rescuer')return;
 if(p.mealDay!==day(w)){p.mealDay=day(w);p.meals=0;const prior=p.contribution[day(w)-1];if(p.rank==='outer'&&!prior)p.contribution[day(w)-1]={units:0,ticks:0,exempt:p.injury?'傷病':'缺料／無可行工作'};}
 if(p.activity){const a=w.activities[p.activity];if(!['rest','sleep','eat','return','paired'].includes(a.kind)&&p.energy<2500){const intent=p.intent;p.recovering=true;begin(w,p,'rest',{until:7500});p.intent=intent;p.reason='精力低於25：先照料自己，恢復75後續有效指令';}return;}
 if(p.recovering&&p.energy<7500){begin(w,p,'rest',{until:7500});return;}p.recovering=false;
 if(p.intent&&!p.manualStop){begin(w,p,p.intent.kind,p.intent.args);return;}
 if(p.energy<2500||p.injury>60){begin(w,p,p.bed?'sleep':'rest',{until:7500});p.reason='必要自理：休息至75';return;}
 const phase=w.tick%DAY;
 if(phase>=8400&&p.energy<9900){begin(w,p,p.bed?'sleep':'rest');p.reason='作息：夜間睡眠';return;}
 if(p.meals<2&&qty(w,'table','meal')>0&&(phase<2000||phase>=6000&&phase<8400)){begin(w,p,'eat');p.reason='作息：用餐';return;}
 if(p.manualStop||!p.auto){p.reason='此人已停工；仍可自理';return;}
 if(!p.adult){begin(w,p,'move',{pos:stations['safe.'+(2+(Math.floor(w.tick/200)%3))]});p.reason='小禾在院內散步、等家人';return;}
 const candidates=[];const addC=(kind,args,score,reason)=>candidates.push({kind,args,score,reason});
 const waterTarget=Math.min(w.inventories.vat.capacity,w.goals.water),mealTarget=w.goals.meal;
 if(qty(w,'table','meal')<mealTarget&&qty(w,'store','veg')>=2&&qty(w,'vat','water')>=1)addC('cook',{recipe:'meal'},60,'缺餐備糧');
 for(const f of sorted(w.facilities))if(f.active)addC('build',{facility:f.id},50+(w.policy==='build'?20:0),'已開工的'+FACILITIES[f.id].name);
 if(qty(w,'vat','water')<waterTarget)addC('gather',{item:'water'},40,'低於水目標'+waterTarget);
 if(qty(w,'store','veg')<mealTarget&&w.ecology.veg.remaining)addC('gather',{item:'veg'},qty(w,'table','meal')<mealTarget?65:30,'補菜以便供餐');
 const record=p.contribution[day(w)],met=record?.units>=2||record?.ticks>=2400;
 if(p.rank==='outer'&&met||phase>=6000||w.policy==='train')addC('train',{art:'punch',units:5},40+(w.policy==='train'?20:0)+p.traits[0]*3,'保留修行窗口');
 if(!candidates.length)addC('train',{art:'punch',units:5},20,'物資已達標，練功與自由');
 candidates.sort((a,b)=>b.score-a.score||a.kind.localeCompare(b.kind));const c=candidates[0];p.candidates=candidates.slice(0,3);begin(w,p,c.kind,c.args);p.reason=c.reason+'（'+c.score+'；勤勉'+p.traits[0]+'／顧人'+p.traits[1]+'）';
}
