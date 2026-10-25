import {Q,LEGENDS,ART,FACILITIES} from './data.mjs';
import {stations,position,los} from './map.mjs';
import {event,sorted,qty,add,transfer,reserve,release,uid,makePerson} from './state.mjs';
import {begin,cancel,approach,finish,memory} from './activities.mjs';
import {beginSpar,startAction,interceptionReason,startDrill} from './combat.mjs';
import {route,arrived} from './navigation.mjs';
const mark=(w,node,actors,extra={})=>{const s=w.stories[node];s.status='completed';s.completedAt=w.tick;s.cast=actors;event(w,'story-complete',actors,{node,...extra});const npc=actors.map(id=>w.people[id]).find(p=>p?.canonicalIdentity&&p.id!=='leader');if(npc){npc.willingness=(npc.willingness||0)+3;npc.storyBusy=false;}return {ok:true};};
export function story(w,p,node){const s=w.stories[node];if(!s)return {ok:false,reason:'未知約定'};if(s.status==='completed')return {ok:false,reason:'此節點已完成，紀事仍在'};
 const [key,part]=node.split('.'),npc=sorted(w.people).find(o=>o.canonicalIdentity===key),own=w.people.leader.canonicalIdentity===key;
 let o=own?sorted(w.people).find(o=>o.adult&&o.residence==='resident'&&o.id!==p.id):npc;
 if(!o||o.residence==='departed')return {ok:false,reason:'先約訪，等客人沿南路入院'};
 if(o.id===p.id)return {ok:false,reason:'請讓另一位成人一起參與自身故事'};
 if(part==='2'&&w.stories[key+'.1'].status!=='completed')return {ok:false,reason:'先完成第一個約定'};
 if(!p.adult||p.hp<=0||o.hp<=0)return {ok:false,reason:'約定需可參與的成人'};
 if(key==='hong'&&part==='1'&&qty(w,'table','meal')<2)return {ok:false,reason:'需自製並備好兩餐才能招待'};
 if(key==='hong'&&part==='1'&&!w.facts['recipe-complete'])return {ok:false,reason:'請先親手製成一鍋餐'};
 if(key==='linghu'&&part==='1'&&w.facilities.yard.stage<1)return {ok:false,reason:'需兩位外功場，請先修場'};
 if(key==='guo'&&part==='1'&&p.skill.punch.F<18)return {ok:false,reason:'先讓一位成人基礎拳熟練18'};
 if(key==='guo'&&part==='2'&&(p.skill.punch.F<90||p.skill.punch.I<10))return {ok:false,reason:'先以真攻防兩種情境取得體悟10、熟練90'};
 if(key==='yue'&&(!w.facilities.hall.stage||w.people.amu.rank==='worker'))return {ok:false,reason:'修廳且至少一人入門，才能共定門派承諾'};
 if(key==='yue'&&part==='2'&&w.stories['cave.return'].status!=='completed')return {ok:false,reason:'先從古洞實際返院，依結果回應'};
 if(key==='qiao'&&sorted(w.people).filter(q=>q.residence==='visitor'&&q.id!=='escort.traveler').length>=2)return {ok:false,reason:'護送旅人需要一日訪空位，先送客'};
 if(key==='qiao'&&part==='1'&&!w.expedition?.seen?.includes('forest')&&!w.facts['waypoint-reached'])return {ok:false,reason:'先正常出門發現林緣，再約護送'};
 if(key==='linghu'&&part==='2'&&own&&!w.facilities.quiet.stage)return {ok:false,reason:'自身故事先建靜室研讀'};
 s.status='active';s.cast=[p.id,o.id];s.started=w.tick;s.own=own;
 if(key==='linghu'&&part==='1'){const result=beginSpar(w,p,o);if(!result.ok){s.status='unseen';return result;}s.session=p.combatSession;return result;}
 if(key==='guo'&&part==='2'){const result=startDrill(w,[p.id,o.id],'A');if(!result.ok){s.status='active';return result;}s.session=w.drill.id;s.before={F:p.skill.punch.F,I:p.skill.punch.I,energy:p.energy,weapon:p.weapon};return result;}
 const result=begin(w,p,'story',{node,partner:o.id},true);if(result.ok){cancel(w,o,'接受有限約定');o.storyBusy=true;p.storyBusy=true;}return result;
}
function pairApproach(w,p,o,a,one,two){if(!reserve(w,a,'participant:'+o.id)){p.blocked='同伴有其他約定';return false;}if(!a.otherRouted){route(w,o,two);a.otherRouted=true;}return approach(w,p,a,'story:'+a.args.node,one)&&arrived(o)&&Math.hypot(o.x/Q-two[0],o.y/Q-two[1])<2;}
function end(w,p,o,a,extra){p.storyBusy=false;o.storyBusy=false;mark(w,a.args.node,[p.id,o.id],extra);finish(w,p,a,'約定已完成');}
export function storyActivityTick(w,p){const a=w.activities[p.activity];if(!a||a.kind!=='story')return false;
 const node=a.args.node,[key,part]=node.split('.'),o=w.people[a.args.partner],s=w.stories[node];if(!o||o.residence==='departed'||o.hp<=0){cancel(w,p,'同伴離去／受傷；可以重約');p.storyBusy=false;if(o)o.storyBusy=false;s.status='active';return true;}
 if(key==='hong'){
  const first=part==='1',one=first?stations['dining.1']:stations['yard.1'],two=first?stations['dining.2']:stations['yard.2'];
  if(!pairApproach(w,p,o,a,one,two))return true;p.pose=first?'eat':'practice';o.pose=first?'eat':'teach';a.progress++;
  if(a.progress>=(first?200:400)){if(first){if(qty(w,'table','meal')<2){p.blocked='餐已用完，補做後可繼續招待';return true;}add(w,'table','meal',-2,'hospitality');memory(w,'talk',p,o,a.id);}else{p.pushLearned=true;p.skill.punch.U=Math.min(100,p.skill.punch.U+6+p.stats[3]);memory(w,'teach',p,o,a.id);}end(w,p,o,a);}return true;
 }
 if(key==='guo'&&part==='1'){
  if(!pairApproach(w,p,o,a,stations['yard.1'],stations['yard.2']))return true;p.pose=o.pose='practice';a.progress++;
  if(a.progress%240===0){for(const q of [p,o]){q.skill.punch.F=Math.min(100,q.skill.punch.F+3);q.skill.punch.practice++;}s.progress++;event(w,'growth',[p.id,o.id],{art:'punch',source:'guo-practice',unit:s.progress});}
  if(s.progress>=6){memory(w,'teach',p,o,a.id);end(w,p,o,a);}return true;
 }
 if(key==='linghu'&&part==='2'){
  if(!pairApproach(w,p,o,a,stations['guard.front'],[1362,1220]))return true;
  if(!a.demo){a.demo={count:0,lastEnd:w.tick,session:uid(w,'lesson'),failSeen:false};p.skill.nine??={U:5,F:0,I:0,contexts:[],practice:0,sources:[{kind:'linghu-teaching',tick:w.tick}]};for(const q of [p,o]){q.combatSession=a.demo.session;q.team=q===p?'student':'teacher';q.combatTarget=null;}o.pushLearned=true;}
  const d=a.demo;
  if(!o.action&&w.tick-d.lastEnd>=40){const move=d.count===2?'punch':'push';o.angle=0;startAction(w,o,move,null);event(w,'lesson-demonstration',[o.id,p.id],{move,text:d.count===2?'短起手反例':'朝空地完整示範長起手，讓學生觀察'});d.count++;d.lastEnd=w.tick;}
  if(o.action?.phase==='windup'&&d.count>=3&&!p.action){const reason=interceptionReason(w,p,o);if(!reason)startAction(w,p,'intercept',o);else if(d.count===3&&!d.failSeen&&p.observation[o.id]?.last===o.action?.id&&(p.observation[o.id]?.continuous||0)>=12){const result=startAction(w,p,'intercept',o,true);if(result.ok){d.failSeen=true;event(w,'lesson-short-start',[p.id,o.id],{reason:reason||'短起手反例'});}}}
  const success=w.journal.some(e=>e.type==='intercept-success'&&e.actors[0]===p.id&&e.tick>=s.started),failure=w.journal.some(e=>e.type==='intercept-failed'&&e.actors[0]===p.id&&e.tick>=s.started);
  if(success&&failure){for(const q of [p,o]){q.combatSession=null;q.combatTarget=null;q.action=null;q.trainingDefeated=false;}memory(w,'teach',p,o,a.id);end(w,p,o,a,{success:true,failure:true});}return true;
 }
 if(key==='qiao'){
  let traveler=w.people['escort.traveler'];
  if(!a.escortPhase){
   if(!traveler)traveler=makePerson(w,'escort.traveler','往來村人',stations.spawn,{residence:'visitor',rank:'guest',color:'#ac9374',auto:false});
   traveler.residence='visitor';traveler.storyBusy=true;traveler.departing=false;
   a.escortPhase='out';route(w,p,[1660,520]);route(w,o,[1625,525]);route(w,traveler,[1645,520]);a.otherRouted=true;
   event(w,'escort-start',[p.id,o.id,traveler.id],{node});return true;
  }
  if(a.escortPhase==='out'&&arrived(p)&&arrived(o)&&arrived(traveler)){
   if(part==='2'){
    a.escortPhase='obstruction';const guard=w.people['warden.0'];guard.storyBusy=true;guard.combatTarget=null;guard.hostile=false;route(w,guard,[1665,535]);a.guard=guard.id;a.exercise=uid(w,'road-exercise');
    for(const q of [p,traveler,guard]){q.combatSession=a.exercise;q.team=q===guard?'obstruction':'escort';q.trainingDefeated=false;}
    guard.pushLearned=true;guard.move='push';event(w,'road-obstruction',[guard.id,traveler.id],{text:'守路人沿原路前來作有限非致命阻攔，不刷新自然獸。'});
   }else a.escortPhase='home';
  }
  if(a.escortPhase==='obstruction'){
   const guard=w.people[a.guard];if(arrived(guard)&&!guard.trainingDefeated){guard.combatTarget=traveler.id;if(guard.action?.target===traveler.id)p.combatTarget=guard.id;}
   if(w.memories.some(m=>m.kind==='protect'&&m.actors.includes(p.id)&&m.actors.includes(traveler.id)&&m.tick>=s.started)){
    for(const q of [p,traveler,guard]){q.combatTarget=null;q.combatSession=null;q.action=null;q.trainingDefeated=false;}guard.storyBusy=false;guard.move='punch';route(w,guard,guard.home);a.escortPhase='home';
   }else if(guard.trainingDefeated){p.blocked='尚未形成護衛記憶，可重新約護送';return true;}
  }
  if(a.escortPhase==='home'&&!a.homeRouted){a.homeRouted=true;route(w,p,[940,1100]);route(w,o,[964,1100]);route(w,traveler,[988,1100]);}
  if(a.escortPhase==='home'&&arrived(p)&&arrived(o)&&arrived(traveler)){memory(w,'care',p,traveler,a.id);traveler.storyBusy=false;traveler.departing=true;route(w,traveler,stations.spawn);end(w,p,o,a,{traveler:traveler.id});}
  return true;
 }
 if(key==='yue'){
  if(!pairApproach(w,p,o,a,stations['hall.greet'],[1190,1070]))return true;a.progress++;p.pose='talk';o.pose='listen';
  if(a.progress>=200){if(part==='1'){if(qty(w,'store','ration')<4){p.blocked='共同承諾：先實際備好4乾糧';return true;}w.promises.sect={kind:'prepare-ration',amount:4,status:'fulfilled',tick:w.tick};}else s.response={choice:w.storyChoice,result:w.promises.cave?.status};memory(w,'talk',p,o,a.id);end(w,p,o,a,{response:s.response||null});}return true;
 }
 return true;
}
function faceTeacher(o,p){const dx=p.x-o.x,dy=p.y-o.y;o.angle=Math.abs(dx)>Math.abs(dy)?(dx>0?0:180):(dy>0?90:270);}
export function storiesTick(w){
 const linghu=w.stories['linghu.1'];if(linghu.status==='active'&&linghu.session&&linghu.cast.some(id=>w.people[id].sparHistory?.some(h=>h.tick>=linghu.started))){mark(w,'linghu.1',linghu.cast);}
 const guo=w.stories['guo.2'];if(guo.status==='active'&&w.drill?.id===guo.session&&w.drill.status==='completed')mark(w,'guo.2',guo.cast,{before:guo.before});
 const qiao=w.stories['qiao.2'];if(qiao.status==='active'&&qiao.awaitProtection&&qiao.cast.some(id=>w.people[id].sparHistory?.some(h=>h.tick>=qiao.started))){
  // Completion still requires an actual protective interrupt, not merely a completed spar.
  if(w.memories.some(m=>m.kind==='protect'&&m.actors.some(id=>qiao.cast.includes(id))&&m.tick>=qiao.started))mark(w,'qiao.2',qiao.cast);else{qiao.awaitProtection=false;event(w,'story-retry',qiao.cast,{node:'qiao.2',reason:'護衛行動尚未成立，可再約'});}
 }
}
export function completionConditions(w){const result=[];for(const id of ['hall','dorm','annex','store','kitchen','dining','yard','garden','herb'])result.push({id:'building.'+id,label:FACILITIES[id].name+'可用'+(['hall','store','kitchen','dining','yard'].includes(id)?'最終階段':''),ok:w.facilities[id].stage>=(['hall','store','kitchen','dining','yard'].includes(id)?FACILITIES[id].stages.length:1)});
 result.push({id:'adults',label:'至少四位成年門人',ok:sorted(w.people).filter(p=>p.adult&&p.residence==='resident'&&['leader','outer','inner'].includes(p.rank)).length>=4},{id:'amu',label:'阿木自願入門',ok:w.people.amu.rank!=='worker'},{id:'inner',label:'一位外門經真考核晉內門',ok:sorted(w.people).some(p=>p.id!=='leader'&&p.rank==='inner')},{id:'child',label:'小禾有合法床位',ok:!!w.people.child.bed&&bedSlotsSafe(w).includes(w.people.child.bed)},{id:'depth',label:'基礎拳深修 F90／I10',ok:sorted(w.people).some(p=>p.skill.punch?.F>=90&&p.skill.punch?.I>=10)},{id:'drill',label:'完整兩波演武',ok:!!w.facts['drill-complete']},{id:'cave',label:'古洞選擇與全隊真返院',ok:w.stories['cave.return'].status==='completed'});return result;}
function bedSlotsSafe(w){const a=[];for(const p of sorted(w.people))if(p.bed)a.push(p.bed);return a;}
export function found(w,name){const missing=completionConditions(w).filter(c=>!c.ok);if(missing.length)return {ok:false,reason:'尚缺：'+missing.map(c=>c.label).join('、')};if(w.completed)return {ok:false,reason:'已立匾，可以繼續生活'};w.completed=true;w.sectName=(name||'山中留人').trim().slice(0,20);w.completedAt=w.tick;event(w,'chapter-complete',sorted(w.people).filter(p=>p.residence==='resident').map(p=>p.id),{text:w.sectName+'：在山中留下來。',choice:w.storyChoice});return {ok:true};}
