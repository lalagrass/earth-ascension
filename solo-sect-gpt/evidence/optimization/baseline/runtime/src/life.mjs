import {Q,HZ,DAY,LEGENDS,MEMORY} from './data.mjs';
import {stations,position,bedSlots} from './map.mjs';
import {event,availableQty as qty,add,transfer,inventory,makePerson,sorted,assignBeds,day,reserve,release,uid,bagWeight,inventorySpace} from './state.mjs';
import {approach,begin,cancel,finish,memory,workTick,countWork} from './activities.mjs';
import {route,arrived} from './navigation.mjs';
import {beginSpar} from './combat.mjs';
export function recruitmentReason(w,p){
 if(!p?.adult)return '只有成人可入門';if(['leader','outer','inner'].includes(p.rank))return '已是門人';
 if(p.canonicalIdentity&&w.identityMode==='matureGuest')return '成熟宗師只作客，不永久入門';
 const residents=sorted(w.people).filter(p=>p.residence==='resident'),n=residents.length+(p.residence==='resident'?0:1);
 if(n>8)return '常住已滿8人，可日訪後再約';
 if(!p.bed&&bedSlots(w).length<=residents.length)return '沒有空床；先修宿舍／側舍';
 const reserved=Object.values(w.reservations).filter(r=>r.key==='source:store:ration'||r.key==='source:table:meal').reduce((n,r)=>n+r.n,0);
 if(qty(w,'table','meal')+qty(w,'store','ration')-reserved<2*n)return '供餐不足：需'+2*n+'份未預約餐／乾糧';
 if(w.facilities.garden.stage===0&&w.ecology.veg.remaining<4)return '缺少可持續的菜供應，先開菜園';
 if((p.willingness||0)<6)return '本人尚未形成入門意願；先履行入口約定';
 if(p.id==='amu'&&(w.relationships['leader|amu']?.trust||0)<12)return '阿木尚需互信12（共作、交談、鼓勵、指點皆可）';
 return null;
}
export function invite(w,id){const p=w.people[id],reason=recruitmentReason(w,p);if(reason)return {ok:false,reason};p.rank='outer';p.residence='resident';p.auto=true;p.visits++;assignBeds(w);p.paidThrough=day(w);event(w,'joined',[p.id],{text:p.name+'願意留在門中；原有工作與物品仍在。'});if(id==='amu')w.stories['recruit.worker'].status='completed';return {ok:true};}
export function visit(w,legend){const l=Object.hasOwn(LEGENDS,legend)?LEGENDS[legend]:null;if(!l)return {ok:false,reason:'未知來客'};
 if(w.people.leader.canonicalIdentity===legend)return {ok:false,reason:'此人就是掌門；約定改為自身故事'};
 const existing=sorted(w.people).find(p=>p.canonicalIdentity===legend);
 if(existing&&existing.residence!=='departed')return {ok:false,reason:'此人已在世界中'};
 if(w.visitorQueue.includes(legend))return {ok:false,reason:'已在到訪表等候'};
 w.visitorQueue.push(legend);event(w,'visit-booked',[],{legend,text:l.name+'已約訪；日訪滿兩人會依序入圖。'});return {ok:true};
}
export function depart(w,id){const p=w.people[id]||sorted(w.people).find(p=>p.canonicalIdentity===id);if(!p||p.residence!=='visitor')return {ok:false,reason:'此人不是可送走的日訪客'};
 if(p.rank==='rescuer'&&w.expedition?.rescue&&!['completed'].includes(w.expedition.rescue.phase))return {ok:false,reason:'救援者仍在照料傷員，完成這趟承諾才離開'};
 cancel(w,p,'送客沿南路離去');p.intent=null;p.auto=false;p.departing=true;route(w,p,stations.spawn);return {ok:true};}
export function school(w,p){if(!w.facilities.hall.stage||qty(w,'table','meal')<4)return {ok:false,reason:'義學需修補大廳、備四餐'};return begin(w,p,'school',{},true);}
export function fame(w,p){if(w.people.amu.rank==='worker'||!w.facilities.dorm.stage)return {ok:false,reason:'慕名接待需阿木入門與宿舍可用'};if(w.people.shen&&w.people.shen.residence!=='departed')return begin(w,p,'greet',{target:'shen'},true);if(visitorCount(w)>=2)return {ok:false,reason:'日訪兩人已滿，先送客'};
 const o=w.people.shen||makePerson(w,'shen','沈禾',stations.spawn,{rank:'guest',residence:'visitor',color:'#797c99',auto:false});o.residence='visitor';o.departing=false;o.storyBusy=true;route(w,o,[1190,1095]);w.stories['recruit.fame'].status='active';const result=begin(w,p,'reception',{target:o.id},true);if(result.ok)w.activities[p.activity].partner=o.id;return result;
}
export function visitorCount(w){return sorted(w.people).filter(p=>p.residence==='visitor').length+(w.expedition?.reservedVisitor?1:0);}
export function partnerProposal(w,p,o){
 if(!p?.adult||!o?.adult||p.id===o.id||p.kin?.includes(o.id)||o.kin?.includes(p.id))return {ok:false,reason:'結伴需兩位成年且非親屬'};
 if(p.family||o.family)return {ok:false,reason:'已有互斥結伴關係'};
 for(const [a,b]of [[p,o],[o,p]]){const r=w.relationships[a.id+'|'+b.id];if(!r||r.types.length<3||r.trust<20||r.willingness<6)return {ok:false,reason:a.name+'尚需三類記憶、互信20、意願6'};}
 w.relationships[p.id+'|'+o.id].accepted=true;event(w,'partner-proposed',[p.id,o.id],{text:p.name+'表達結伴意願，仍需'+o.name+'自己接受。'});return {ok:true};
}
export function acceptPartner(w,p,o,accept=true){const mine=w.relationships[p.id+'|'+o.id],other=w.relationships[o.id+'|'+p.id];if(!other?.accepted)return {ok:false,reason:'尚未收到對方提議'};if(!accept){other.accepted=false;event(w,'partner-declined',[p.id,o.id]);return {ok:true};}
 const result=partnerProposal(w,p,o);if(!result.ok)return result;mine.accepted=true;const id=uid(w,'family');w.families[id]={id,members:[p.id,o.id],status:'partnered',beds:[]};p.family=id;o.family=id;event(w,'partnered',[p.id,o.id]);return {ok:true};}
export function cohabit(w,p,room='annex'){const f=w.families[p.family];if(!f)return {ok:false,reason:'尚未雙方接受結伴'};const [one,two]=f.members.map(id=>w.people[id]);const occupied=new Set(sorted(w.people).filter(p=>!f.members.includes(p.id)).map(p=>p.bed));const slots=bedSlots(w).filter(b=>b.startsWith(room+'.')&&!occupied.has(b));let pair=null;for(let i=1;i<slots.length;i++)if(Number(slots[i].split('.').at(-1))-Number(slots[i-1].split('.').at(-1))===1){pair=[slots[i-1],slots[i]];break;}
 if(!pair)return {ok:false,reason:'同房相鄰空床不足，可選宿舍或側舍'};f.beds=pair;f.status='moving';for(const [i,o]of [one,two].entries()){o.bed=pair[i];begin(w,o,'move',{pos:stations[pair[i]]},true);}return {ok:true};}
export function separate(w,p){const f=w.families[p.family];if(!f)return {ok:false,reason:'尚無結伴'};f.status='separated';for(const id of f.members)w.people[id].family=null;event(w,'separated',f.members,{text:'解除結伴，過往記憶仍在。'});return {ok:true};}
export function promote(w,p){if(!p||p.rank!=='outer')return {ok:false,reason:'需外門本人參加考核'};
 const records=Object.values(p.contribution).filter(r=>r.units>=2||r.ticks>=2400||r.exempt);
 if(records.length<2)return {ok:false,reason:'需兩日貢獻或豁免記錄'};if(p.skill.punch.F<18)return {ok:false,reason:'基礎拳需先熟練18'};
 if(!p.sparHistory?.some(r=>r.duration>=600&&r.hits>=3)){p.pendingPromotion=true;return beginSpar(w,p,w.people.leader,true);}
 p.rank='inner';event(w,'promoted',[p.id],{text:p.name+'完成考核，自願接下內門責任。'});return {ok:true};}
export function lifeActivityTick(w,p){const a=w.activities[p.activity];if(!a)return false;
 if(a.kind==='drink'){
  if(p.teaUntil>w.tick){p.blocked='藥茶120秒間隔尚未到';return true;}
  if(a.phase==='init'){if(!qty(w,p.bag,'tea')){if(qty(w,'store','tea')<1||bagWeight(w,p)>3){release(w,a.id);p.blocked='需要一杯現成藥茶與空手位';return true;}if(!reserve(w,a,'source:store:tea',1,qty(w,'store','tea'))){p.blocked='藥茶已預約';return true;}if(!approach(w,p,a,'store.drop'))return true;transfer(w,'store',p.bag,'tea',1);release(w,a.id);a.destination=null;}a.phase='sit';}
  a.seat??=Array.from({length:[3,6,8][w.facilities.dining.stage]},(_,i)=>'dining.'+(i+1)).find(k=>!Object.values(w.reservations).some(r=>r.key==='station:'+k))||'dining.1';if(!approach(w,p,a,a.seat))return true;p.pose='drink';if(++a.progress>=80){add(w,p.bag,'tea',-1,'drink');p.energy=Math.min(10000,p.energy+2500);p.injury=Math.max(0,p.injury-3);p.teaUntil=w.tick+2400;event(w,'tea-drunk',[p.id],{source:a.id});finish(w,p,a,'藥茶飲畢，休養間隔120秒');}return true;
 }
 if(a.kind==='aid'){
  const o=w.people[a.args.target];if(!o||o.hp>0){finish(w,p,a,'傷員已獲扶起');return true;}const pos=[o.x/Q-16,o.y/Q+8];if(!approach(w,p,a,'aid:'+o.id,pos))return true;p.pose='help';a.progress++;if(a.progress>=160){o.hp=10;o.injury=Math.max(70,o.injury);o.combatTarget=null;o.action=null;o.manualStop=true;memory(w,'care',p,o,a.id);event(w,'aided',[p.id,o.id],{text:'近身照料8秒後扶起，仍需休養。'});finish(w,p,a,'已扶起傷員');}return true;
 }
 if(a.kind==='collect'){
  const inv=w.inventories[a.args.inventory];if(!inv?.pos){p.blocked='沒有這個地面包裹';return true;}
  if(a.phase==='init'){if(!approach(w,p,a,'ground:'+inv.id,inv.pos))return true;for(const [item,n]of Object.entries(inv.items)){const amount=Math.min(n,Math.floor((4-bagWeight(w,p))/(item==='stone'?2:1)));if(amount>0)transfer(w,inv.id,p.bag,item,amount);}release(w,a.id);a.destination=null;a.phase='deliver';}
  if(a.phase==='deliver'&&Object.entries(w.inventories[p.bag].items).some(([i,n])=>inventorySpace(w,'store',i,a.id)<n)){release(w,a.id);a.destination=null;p.blocked='目的倉滿，手中物資保留';return true;}if(a.phase==='deliver'&&approach(w,p,a,'store.drop')){for(const [item,n]of Object.entries(w.inventories[p.bag].items))transfer(w,p.bag,'store',item,n);finish(w,p,a,'地面物資已搬回');}return true;
 }
 if(a.kind==='farm'){
  const kind=a.args.crop||'garden';if(!w.facilities[kind].stage){p.blocked='先開墾'+(kind==='garden'?'菜園':'藥園');return true;}
  let plot=w.plots[a.plot];if(!plot){const possible=sorted(w.plots).filter(o=>o.kind===kind&&Number(o.id.split('.')[1])<w.facilities[kind].stage&&o.stage!=='growing');plot=possible.find(o=>reserve(w,a,'plot:'+o.id));if(!plot){p.taskWaitUntil=w.tick+200;finish(w,p,a,'畦田成長／他人作業，先讓出站位',true);return true;}a.plot=plot.id;}
  const station=kind+'.work'+(plot.id.endsWith('.0')?'':'2');
  if(plot.stage==='planted'&&!plot.watered){
   if(!qty(w,p.bag,'water')){if(qty(w,'vat','water')<1){p.blocked='需要搬1水澆灌';return true;}if(approach(w,p,a,'kitchen.vat')){transfer(w,'vat',p.bag,'water',1);release(w,a.id);reserve(w,a,'plot:'+plot.id);a.destination=null;}return true;}
  }
  if(!approach(w,p,a,station))return true;p.pose='farm';a.progress++;workTick(w,p);p.energy=Math.max(0,p.energy-1);
  const n=plot.stage==='planted'?80:160;if(a.progress<n)return true;a.progress=0;
  if(plot.stage==='empty'){plot.stage='planted';event(w,'planted',[p.id],{plot:plot.id});release(w,a.id);reserve(w,a,'plot:'+plot.id);a.destination=null;}
  else if(plot.stage==='planted'){add(w,p.bag,'water',-1,'irrigation');plot.watered=true;plot.stage='growing';plot.progress=0;event(w,'watered',[p.id],{plot:plot.id});finish(w,p,a,'已澆水，等待生長',true);}
  else if(plot.stage==='ready'){const item=kind==='garden'?'veg':'herb',n=kind==='garden'?6:3;const pile=inventory(w,uid(w,'harvest'),{[item]:n},8);w.inventories[pile].pos=stations[station];w.ledger[item].produced+=n;a.harvest=pile;a.phase='haul';plot.stage='empty';plot.watered=false;countWork(w,p,a);event(w,'crop-harvest',[p.id],{plot:plot.id,n,item});}
  if(a.phase==='haul')a.kind='harvestHaul';return true;
 }
 if(a.kind==='harvestHaul'){
  const inv=w.inventories[a.harvest],item=Object.keys(inv.items)[0];if(!item&&!bagWeight(w,p)){finish(w,p,a,'收成已搬入倉');return true;}
  if(!bagWeight(w,p)){const key='harvest.'+a.harvest;if(approach(w,p,a,key,inv.pos)){transfer(w,a.harvest,p.bag,item,Math.min(4,qty(w,a.harvest,item)));release(w,a.id);a.destination=null;}}else if(Object.entries(w.inventories[p.bag].items).some(([i,n])=>inventorySpace(w,'store',i,a.id)<n)){release(w,a.id);a.destination=null;p.blocked='目的倉滿，收成仍在手中';return true;}else if(approach(w,p,a,'store.drop')){for(const [i,n]of Object.entries(w.inventories[p.bag].items))transfer(w,p.bag,'store',i,n);release(w,a.id);a.destination=null;}
  return true;
 }
 if(a.kind==='delivery'){
  if(w.lastDeliveryDay===day(w)){p.blocked='今日交貨已完成一次';return true;}
  if(a.phase==='init'){if(qty(w,'store','veg')<4){p.blocked='交貨需4菜';return true;}if(!reserve(w,a,'source:store:veg',4,qty(w,'store','veg'))){p.blocked='菜已預約';return true;}if(approach(w,p,a,'store.drop')){transfer(w,'store',p.bag,'veg',4);release(w,a.id);a.destination=null;a.phase='deliver';}}
  else if(approach(w,p,a,'south')){add(w,p.bag,'veg',-4,'delivery');add(w,'store','money',6,'village-delivery');w.lastDeliveryDay=day(w);event(w,'delivery',[p.id],{text:'村路交菜4，收入6錢'});finish(w,p,a,'交貨完成');}return true;
 }
 if(a.kind==='school'){
  if(!approach(w,p,a,'south'))return true;
  let o=w.people.lin;if(!o||o.residence==='departed'){if(visitorCount(w)>=2){p.blocked='日訪已滿，先送客再開課';return true;}o=w.people.lin||makePerson(w,'lin','林青',stations.spawn,{residence:'visitor',rank:'guest',color:'#60928b',auto:false});o.residence='visitor';o.departing=false;o.storyBusy=true;a.partner=o.id;route(w,o,[1474,1700]);}
  if(!arrived(o))return true;a.progress++;p.pose='teach';o.pose='listen';if(a.progress>=400){o.willingness=6;o.storyBusy=false;w.stories['recruit.school'].status='completed';memory(w,'teach',p,o,a.id);event(w,'school-complete',[p.id,o.id]);finish(w,p,a,'義學完成，可邀請林青');}return true;
 }
 if(a.kind==='reception'){
  const o=w.people[a.args.target];if(!o){finish(w,p,a);return true;}if(!approach(w,p,a,'hall.greet')||!arrived(o)||Math.hypot(o.x/Q-1190,o.y/Q-1095)>2)return true;
  a.progress++;if(a.progress>=200){o.willingness=6;o.storyBusy=false;w.stories['recruit.fame'].status='completed';memory(w,'talk',p,o,a.id);finish(w,p,a,'接待完成，可邀沈禾');}return true;
 }
 if(a.kind==='learn'){
  const art=a.args.art;if(!['staff','sword','nine'].includes(art)){p.blocked='未知教學';return true;}if(!w.facilities.hall.stage){p.blocked='先修廳，才有教學場所';return true;}
  if(art==='nine'&&!w.facilities.quiet.stage){p.blocked='自身九劍需先建靜室研讀';return true;}
  const item=art==='staff'?'staff':'sword';if(art!=='nine'&&qty(w,'store',item)<1){p.blocked='先用2木製作練習器械';return true;}
  if(!approach(w,p,a,art==='nine'?'quiet.book':'hall.teach'))return true;a.progress++;p.pose='teach';
  if(a.progress>=400){p.skill[art]??={U:0,F:0,I:0,contexts:[],practice:0,sources:[]};p.skill[art].U+=6+p.stats[3];p.skill[art].sources.push({kind:'learn',tick:w.tick,activity:a.id});event(w,'learned',[p.id],{art});finish(w,p,a,'已理解入門原理');}return true;
 }
 if(a.kind==='equip'){
  const art=a.args.art;if(art!=='punch'&&!p.skill[art]){p.blocked='未學會這種器械';return true;}if(p.action){p.blocked='收勢後才能換武器';return true;}
  if(!p.equipment){p.equipment='equipment.'+p.id;inventory(w,p.equipment,{},2);}const item=art==='staff'?'staff':'sword';if(art!=='punch'&&!qty(w,p.equipment,item)&&!qty(w,'store',item)){release(w,a.id);p.blocked='倉裡沒有可領用的練習器械';return true;}if(art!=='punch'&&Object.entries(w.inventories[p.equipment].items).some(([i,n])=>(w.inventories.store.items[i]||0)+n>w.inventories.store.capacity)){release(w,a.id);p.blocked='倉庫放不下換出的器械';return true;}if(!approach(w,p,a,'store.drop'))return true;if(++a.progress>=120){if(art!=='punch'&&!qty(w,p.equipment,item)){for(const [old,n]of Object.entries(w.inventories[p.equipment].items))transfer(w,p.equipment,'store',old,n);transfer(w,'store',p.equipment,item,1);}p.weapon=art;p.move=art==='staff'?'sweep':art==='sword'?'thrust':'punch';finish(w,p,a,'裝備完成');}return true;
 }
 return false;
}
export function lifeTick(w){
 for(const plot of sorted(w.plots))if(plot.stage==='growing'&&plot.watered){plot.progress++;if(plot.progress>=(plot.kind==='garden'?90:120)*HZ){plot.stage='ready';event(w,'crop-ready',[],{plot:plot.id});}}
 for(const p of sorted(w.people)){
  if(w.identityMode==='matureGuest'&&p.canonicalIdentity&&p.residence==='visitor'&&!p.storyBusy&&!p.departing&&p.visitStarted!==undefined&&w.tick-p.visitStarted>=DAY)depart(w,p.id);
  if(p.departing&&arrived(p)&&Math.hypot(p.x/Q-stations.spawn[0],p.y/Q-stations.spawn[1])<2){p.residence='departed';p.departing=false;event(w,'departed',[p.id]);}
  if(p.rank==='worker'&&day(w)>p.paidThrough&&w.tick%DAY===0){if(qty(w,'store','money')>=3){add(w,'store','money',-3,'wages');p.paidThrough=day(w);event(w,'wage-paid',[p.id]);}else{p.manualStop=true;cancel(w,p,'工資不足，契約暫停；可交菜恢復');}}
  if(p.pendingPromotion&&p.sparHistory?.some(r=>r.duration>=600&&r.hits>=3)){p.pendingPromotion=false;promote(w,p);}
 }
 const slots=2-visitorCount(w);if(slots>0&&w.visitorQueue.length&&w.tick%40===0){const legend=w.visitorQueue.shift(),l=LEGENDS[legend];let p=sorted(w.people).find(p=>p.canonicalIdentity===legend);
  if(!p)p=makePerson(w,'legend.'+legend,l.name,stations.spawn,{residence:'visitor',rank:'guest',canonicalIdentity:legend,color:l.color,stats:l.stats||[4,4,4,4,4],traits:l.traits||[0,0],auto:false});else{p.residence='visitor';p.departing=false;}
  if(legend==='hong'){p.pushLearned=true;p.move='push';}if(legend==='linghu')p.skill.nine??={U:5,F:0,I:0,contexts:[],practice:0,sources:[{kind:'family-teaching',tick:w.tick}]};route(w,p,[1170,1100]);p.visitStarted=w.tick;event(w,'visitor-arrived',[p.id],{legend});
 }
 for(const f of Object.values(w.families))if(f.status==='moving'&&f.members.every((id,i)=>{const p=w.people[id],pos=stations[f.beds[i]];return Math.hypot(p.x/Q-pos[0],p.y/Q-pos[1])<2;})){f.status='cohabiting';event(w,'cohabiting',f.members,{text:'兩人已各自走到同房相鄰床位。'});}
}
