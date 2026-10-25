import {Q,HZ,DAY} from './data.mjs';
import {stations,position,findPath,los,inRect,walkable} from './map.mjs';
import {event,uid,availableQty as qty,transfer,add,sorted,bagWeight,makePerson,reserve} from './state.mjs';
import {begin,cancel,approach,finish,memory} from './activities.mjs';
import {route,arrived,speed} from './navigation.mjs';
import {insight} from './combat.mjs';
import {visitorCount} from './life.mjs';
function travelRoute(w,p,to){const candidates=[];for(let r=0;r<=40;r+=8)for(let dx=-r;dx<=r;dx+=8)for(let dy=-r;dy<=r;dy+=8)if(Math.max(Math.abs(dx),Math.abs(dy))===r)candidates.push([to[0]+dx,to[1]+dy]);const legal=candidates.find(q=>walkable(w,...q)&&!sorted(w.people).some(o=>o.id!==p.id&&((o.travelGoal&&Math.hypot(o.travelGoal[0]-q[0],o.travelGoal[1]-q[1])<14)||Math.hypot(o.x/Q-q[0],o.y/Q-q[1])<14)));if(!legal){p.blocked='路標周邊無合法空位';return false;}p.travelGoal=legal;return route(w,p,legal);}
const distance=(p,to)=>Math.hypot(p.x/Q-to[0],p.y/Q-to[1]);
export function returnReserve(w,p){const path=findPath(w,position(p),stations['safe.0']);if(!path)return null;let at=position(p),len=0;for(const point of path){const to=point.map(n=>n/Q);len+=Math.hypot(to[0]-at[0],to[1]-at[1]);at=to;}return Math.ceil(len/speed(w,p)*(bagWeight(w,p)?10:5))+1000+(p.x/Q>1870?200:0);}
export function dispatch(w,ids,target='cave'){
 if(w.expedition&&!['returned','cancelled'].includes(w.expedition.phase))return {ok:false,reason:'同時只能一隊遠征'};
 if(ids.length<1||ids.length>3||new Set(ids).size!==ids.length)return {ok:false,reason:'派遣需1–3位不同成人'};
 for(const id of ids){const p=w.people[id];if(!p?.adult||p.residence!=='resident'||p.hp<=0||p.injury>60)return {ok:false,reason:'隊員須為健康成年常住者；孩子／日訪宗師不能派遣'};
  if(!findPath(w,position(p),stations[target]))return {ok:false,reason:'目的地無路可達'};const reserve=returnReserve(w,p);if(reserve===null||p.energy<reserve*2+1000)return {ok:false,reason:p.name+'不足往返精力，請休息／減負'};if(bagWeight(w,p)>2||Object.keys(w.inventories[p.bag].items).some(i=>i!=='ration'))return {ok:false,reason:p.name+'手上太重，先搬交'};
 }
 const needed=ids.reduce((n,id)=>n+Math.max(0,2-qty(w,w.people[id].bag,'ration')),0),held=Object.values(w.reservations).filter(r=>r.key==='source:store:ration').reduce((n,r)=>n+r.n,0);if(qty(w,'store','ration')-held<needed)return {ok:false,reason:'每人需2乾糧；先到最終膳房製作'};
 const e={id:uid(w,'expedition'),actors:[...ids],target,phase:'prepare',started:w.tick,packed:[],seen:[],foodTaken:0,reservedVisitor:false,report:null,returnReason:null};w.expedition=e;
 for(const id of ids){const p=w.people[id];cancel(w,p);p.revision++;p.intent={kind:'expedition',revision:p.revision,args:{target}};p.storyBusy=true;p.manualStop=false;p.reason='遠征：先實走到倉領糧';begin(w,p,'pack',{expedition:e.id,needed:Math.max(0,2-qty(w,p.bag,'ration'))});const a=w.activities[p.activity];if(a.args.needed)reserve(w,a,'source:store:ration',a.args.needed,qty(w,'store','ration')); }
 event(w,'expedition-accepted',ids,{target,expedition:e.id});return {ok:true};
}
export function recallParty(w,reason='玩家召回'){
 const e=w.expedition;if(!e||['returned','cancelled'].includes(e.phase))return {ok:false,reason:'沒有外出隊伍'};
 e.phase='return';e.returnReason=reason;for(const [i,id]of e.actors.entries()){const p=w.people[id];cancel(w,p,reason);p.combatTarget=null;p.action=p.action?.phase==='recover'?p.action:null;p.intent={kind:'return',revision:++p.revision,args:{}};p.reason='召回：不再沿路新採集';route(w,p,stations['safe.'+i]);}
 if(w.people.zhou.helpedBy){const z=w.people.zhou;route(w,z,stations['safe.4']);}event(w,'expedition-recall',e.actors,{reason});return {ok:true};
}
export function negotiate(w){const e=w.expedition;if(!e||e.phase!=='gate')return {ok:false,reason:'須先沿路抵達古洞守路處'};
 if(e.actors.some(id=>w.people[id].combatTarget))return {ok:false,reason:'交戰中先停止追擊、拉開距離'};e.talkUntil=w.tick+200;e.phase='negotiate';event(w,'gate-talk',e.actors,{text:'向守路人說明救人來意，交談10秒。'});return {ok:true};}
export function chooseCave(w,choice){const e=w.expedition;if(!e||e.phase!=='cave'||w.stories['cave.see'].status!=='completed')return {ok:false,reason:'需親自看見古洞旅人與糧袋'};
 if(!['rescue','food'].includes(choice))return {ok:false,reason:'未知選擇'};
 if(choice==='rescue'&&visitorCount(w)>=2)return {ok:false,reason:'周行需一日訪預留，先送客釋出名額'};
 const z=w.people.zhou;e.choice=choice;w.storyChoice=choice;w.stories['cave.choice'].status='completed';w.promises.cave={choice,tick:w.tick,status:'promised',foodExpected:choice==='rescue'?2:4,personExpected:choice==='rescue',foodDelivered:0};e.reservedVisitor=choice==='rescue';e.phase='collect';e.collectGoal=Math.min(choice==='rescue'?2:4,qty(w,'cave.food','ration'));e.collectActor=0;e.pendingAuto=null;e.collectParking=true;for(const [i,id]of e.actors.entries())route(w,w.people[id],[2170+i*18,200]);
 if(choice==='rescue'){e.helper=e.actors.find(id=>w.people[id].adult);z.storyBusy=true;}
 event(w,'cave-choice',e.actors,{choice,text:choice==='rescue'?'先扶周行；少帶糧，真走回家才履約。':'先保糧；周行仍在洞中安全區，承諾可以回來履行。'});return {ok:true};
}
export function requestRescue(w){const e=w.expedition;if(!e||e.phase==='returned')return {ok:false,reason:'沒有需要救援的隊伍'};if(!e.actors.some(id=>w.people[id].hp<=0||w.people[id].energy<500))return {ok:false,reason:'尚有人能自行回程，可先召回'};if(e.rescue)return {ok:false,reason:'救援已受理'};
 e.rescue={requested:w.tick,ready:w.tick+2400,helpers:[],phase:'waiting',returned:[],costPaid:false};event(w,'rescue-request',e.actors,{text:'救援已受理，120模擬秒後沿南路出發，需等待實際步行。'});
 for(const p of sorted(w.people))if(p.rank==='warden'){p.hostile=false;p.combatTarget=null;p.action=null;}
 for(const id of e.actors){w.people[id].combatTarget=null;}return {ok:true};}
function startReturn(w,e){if(e.choice==='rescue'&&!e.escortAttached){e.phase='attach';e.attachTicks=0;const z=w.people.zhou,h=w.people[e.helper];route(w,h,[z.x/Q-16,z.y/Q+12]);return;}e.phase='return';for(const [i,id]of e.actors.entries()){const p=w.people[id];cancel(w,p);p.combatTarget=null;p.intent={kind:'return',revision:++p.revision,args:{}};route(w,p,stations['safe.'+i]);}
 if(w.people.zhou.helpedBy)route(w,w.people.zhou,stations['safe.4']);
}
function rescuedTick(w,e){const r=e.rescue;if(!r)return;
 if(r.phase==='waiting'&&w.tick>=r.ready){
  const local=sorted(w.people).find(p=>p.adult&&p.residence==='resident'&&!e.actors.includes(p.id)&&p.hp>0&&p.injury<50);
  let helper=local;if(!helper){if(visitorCount(w)>=2){const guest=sorted(w.people).find(p=>p.residence==='visitor'&&p.id!=='zhou');if(guest&&!guest.departing){cancel(w,guest);guest.departing=true;guest.auto=false;route(w,guest,stations.spawn);}return;}const helperId=['rescue.village.1','rescue.village.2'].find(id=>!w.people[id]||w.people[id].residence==='departed');if(!helperId)return;helper=w.people[helperId]||makePerson(w,helperId,helperId.endsWith('1')?'杜衡・救援者':'季梨・救援者',stations.spawn,{residence:'visitor',rank:'rescuer',color:'#776b9a',auto:false});helper.residence='visitor';helper.departing=false;}
  cancel(w,helper);helper.storyBusy=true;helper.rankBeforeRescue=helper.rank;helper.rank='rescuer';r.helpers.push(helper.id);r.phase='outbound';event(w,'rescue-departed',[helper.id],{requested:r.requested,wait:w.tick-r.requested});
 }
 const helper=w.people[r.helpers[0]];if(!helper)return;
 let victim=w.people[r.victim];if(!victim){const id=e.actors.find(id=>!r.returned.includes(id)&&(w.people[id].hp<=0||w.people[id].energy<500));if(!id){r.phase='completed';helper.storyBusy=false;helper.rank=helper.rankBeforeRescue;if(helper.residence==='visitor'){helper.departing=true;route(w,helper,stations.spawn);}startReturn(w,e);return;}victim=w.people[id];r.victim=id;r.phase='outbound';const at=position(victim);const to=inRect(...at,[1863,419,84,42])?[victim.x/Q<1905?1840:1970,440]:[at[0]-16,at[1]+8];route(w,helper,to);}
 if(r.phase==='outbound'&&arrived(helper)){
  if(w.bridge.holder===victim.id){const direction=victim.x/Q<1905?-1:1,edge=direction<0?1858:1952;victim.x+=Math.round(direction*6*Q/HZ);victim.y=440*Q;event(w,'rescue-rope',[helper.id,victim.id],{x:victim.x,y:victim.y});if(direction<0?victim.x/Q>edge:victim.x/Q<edge)return;w.bridge.holder=null;w.bridge.direction=null;}
  r.lift=(r.lift||0)+1;if(r.lift>=160){victim.hp=10;victim.injury=Math.max(70,victim.injury);victim.energy=Math.max(1500,victim.energy);const loss=Math.floor(Math.max(0,qty(w,victim.bag,'ration')-(victim.caveFood||0))/2);if(loss){add(w,victim.bag,'ration',-loss,'rescue-loss');event(w,'rescue-food-loss',[victim.id],{n:loss});}victim.helpedBy=helper.id;helper.helping=victim.id;r.phase='homebound';r.lift=0;route(w,helper,stations['safe.6']);route(w,victim,stations['safe.'+e.actors.indexOf(victim.id)]);event(w,'rescued',[helper.id,victim.id]);}
 }
 if(r.phase==='homebound'&&arrived(helper)&&arrived(victim)){
  victim.helpedBy=null;helper.helping=null;r.returned.push(victim.id);r.victim=null;
  if(!r.costPaid){const n=Math.min(5,qty(w,'store','money'));if(n)add(w,'store','money',-n,'rescue');r.costPaid=true;if(n<5)event(w,'rescue-favor',[helper.id]);event(w,'rescue-cost',[helper.id],{money:n});}
  event(w,'rescue-arrived',[helper.id,victim.id],{elapsed:w.tick-r.requested});
 }
}
export function travelActivityTick(w,p){const a=w.activities[p.activity];if(!a)return false;if(a.kind==='pack'){
 const n=a.args.needed??Math.max(0,2-qty(w,p.bag,'ration'));if(qty(w,'store','ration')<n){p.blocked='倉內乾糧不足，補齊再出發';return true;}
 if(n&&!approach(w,p,a,'store.drop'))return true;if(n)transfer(w,'store',p.bag,'ration',n);w.expedition.packed.push(p.id);finish(w,p,a,'已領糧，等待集合',true);route(w,p,stations['safe.'+(5+w.expedition.actors.indexOf(p.id))]);return true;
 }return false;}
export function expeditionTick(w){const e=w.expedition;if(!e||e.phase==='returned'||e.phase==='cancelled')return;
 const party=e.actors.map(id=>w.people[id]);for(const p of party){p.returnReserve=returnReserveCached(w,p);if(p.hp<=0){p.blocked='倒地；可請求救援';continue;}if(!e.rescue&&p.energy<=p.returnReserve&&e.phase!=='return'&&e.phase!=='prepare'){recallParty(w,'精力抵回程預留');break;}}
 if(e.rescue){rescuedTick(w,e);if(e.rescue.phase!=='completed')return;}
 if(e.phase==='prepare'&&e.packed.length===e.actors.length&&party.every(p=>arrived(p))){e.phase='outbound';for(const [i,p]of party.entries()){travelRoute(w,p,[1450+i*16,670]);p.reason='沿北門實走到林緣';}e.segment='forest';}
 if(e.phase==='outbound'){for(const p of party)if(!p.combatTarget&&!p.action&&arrived(p)&&p.travelGoal&&distance(p,p.travelGoal)>2)route(w,p,p.travelGoal);}
 if(e.phase==='outbound'&&party.every(p=>arrived(p)&&(!p.travelGoal||distance(p,p.travelGoal)<3))){
  if(!e.seen.includes(e.segment)){e.seen.push(e.segment);event(w,'waypoint-reached',e.actors,{target:e.segment});}
  if(e.segment===e.target){if(e.target==='cave'){e.phase='cave';w.stories['cave.see'].status='completed';event(w,'cave-seen',e.actors,{text:'親眼看見周行與有限的四份糧袋。'});}else{e.phase='resting';event(w,'waypoint-reached',e.actors,{target:e.target});}return;}
  if(e.segment==='camp'&&!e.rested){e.phase='campRest';e.restUntil=w.tick+200;return;}
  const next=e.segment==='forest'?'camp':e.segment==='camp'?'valley':e.segment==='valley'?'gate':'cave';
  if(next==='gate'){e.phase='gate';for(const [i,p]of party.entries())travelRoute(w,p,[2070+i*10,300+i*10]);event(w,'gate-arrival',e.actors,{text:'前方兩位守路人。可說明救人來意，或交戰後通行。'});return;}
  e.segment=next;for(const [i,p]of party.entries()){const to=stations[next];travelRoute(w,p,[to[0]+i*14,to[1]+i*10]);}
 }
 if(e.phase==='campRest'&&w.tick>=e.restUntil){for(const p of party)if(qty(w,p.bag,'ration')>0){add(w,p.bag,'ration',-1,'trail-meal');p.energy=Math.min(10000,p.energy+1500);}e.rested=true;e.phase='outbound';event(w,'camp-meal',e.actors);}
 if(e.phase==='negotiate'&&party.every(p=>arrived(p))&&w.tick>=e.talkUntil){e.permission=true;e.segment='cave';e.phase='outbound';for(const p of sorted(w.people).filter(p=>p.rank==='warden')){p.hostile=false;p.combatTarget=null;route(w,p,[p.id.endsWith('0')?2115:2185,245]);}for(const [i,p]of party.entries())travelRoute(w,p,[2200+i*14,150+i*10]);event(w,'passage-granted',e.actors);}
 if(e.phase==='cave'){
  const hero=w.people.leader;if(hero.auto&&party.includes(hero)&&!w.storyChoice){e.pendingAuto??=w.tick+100;hero.reason=hero.traits[1]>=0?'自主預覽：顧人，先救旅人（5秒內可覆寫）':'自主預覽：自持，先保口糧（5秒內可覆寫）';if(w.tick>=e.pendingAuto)chooseCave(w,hero.traits[1]>=0?'rescue':'food');}
 }
 if(e.phase==='collect'){
  if(e.collectParking){if(!party.every(p=>arrived(p)))return;e.collectParking=false;}
  const p=party[e.collectActor%party.length];if(e.foodTaken>=e.collectGoal||e.collectActor>=party.length){startReturn(w,e);return;}
  if(!e.collectRouted){route(w,p,stations['cave.food']);e.collectRouted=true;return;}
  if(arrived(p)){const n=Math.min(e.collectGoal-e.foodTaken,Math.max(0,4-bagWeight(w,p)-(e.choice==='rescue'&&p.id===e.helper?2:0)),qty(w,'cave.food','ration'));if(n){transfer(w,'cave.food',p.bag,'ration',n);p.caveFood=(p.caveFood||0)+n;e.foodTaken+=n;}route(w,p,[2170+e.collectActor*18,200]);e.collectActor++;e.collectRouted=false;}
 }
 if(e.phase==='attach'){const h=w.people[e.helper],z=w.people.zhou;if(arrived(h)&&Math.hypot(h.x-z.x,h.y-z.y)<=24*Q){e.attachTicks++;h.pose='help';if(e.attachTicks>=160){e.escortAttached=true;z.helpedBy=h.id;h.helping=z.id;event(w,'escort-attached',[h.id,z.id]);startReturn(w,e);}}}
 if(e.phase==='return'){
  const z=w.people.zhou;if(z.helpedBy){const h=w.people[z.helpedBy];if(h.hp<=0){z.path=[];z.blocked='扶助者倒地，先救援';}else if(arrived(z)&&distance(z,stations['safe.4'])>30)route(w,z,stations['safe.4']);}
  const home=party.every(p=>p.hp>0&&distance(p,stations['safe.'+party.indexOf(p)])<20);
  if(home&&(!z.helpedBy||distance(z,stations['safe.4'])<20)){
   let food=0;for(const p of party){const n=Math.min(p.caveFood||0,qty(w,p.bag,'ration'));if(n){transfer(w,p.bag,'store','ration',n);food+=n;p.caveFood=0;}p.storyBusy=false;p.intent=null;p.manualStop=true;if(p.injury>0)for(const art of (e.usedArts?.[p.id]||[]))insight(w,p,art,'return',e.id);}
   const rescued=!!z.helpedBy;if(rescued){w.people[z.helpedBy].helping=null;z.helpedBy=null;z.residence='visitor';z.rank='traveler';z.willingness=6;z.storyBusy=false;memory(w,'care',party[0],z,e.id);}
   e.reservedVisitor=false;e.phase='returned';e.report=uid(w,'report');if(w.promises.cave){const p=w.promises.cave;p.foodDelivered+=food;p.personDelivered=rescued;p.status=(p.personExpected?rescued:food>=p.foodExpected)?'fulfilled':food>0||rescued?'partial':'unfulfilled';w.stories['cave.return'].status='completed';}
   event(w,'expedition-returned',e.actors,{report:e.report,choice:e.choice||null,rescued,food,elapsed:w.tick-e.started,text:'全隊已實際返院。'+(rescued?'周行已安置。':'')+'帶回古洞糧 '+food+'。'});
  }
 }
}
function returnReserveCached(w,p){if(w.tick%20===0||p.returnReserve===undefined)return returnReserve(w,p)??100000;return p.returnReserve;}
