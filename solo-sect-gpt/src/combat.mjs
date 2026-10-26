import{moveFor}from'./catalog.mjs';
import {Q,MOVES,ART} from './data.mjs';
import directions from '../data/directions.mjs';
import {position,los,sweep,stations,inRect,walkable} from './map.mjs';
import {uid,event,sorted,bagWeight,inventory,transfer,makePerson,qty} from './state.mjs';
import {route,arrived} from './navigation.mjs';
import {cancel,begin,memory} from './activities.mjs';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)/Q;
export function face(p,target){let best=-Infinity,angle=0,dx=target.x-p.x,dy=target.y-p.y;for(let i=0;i<360;i++){const v=directions[i],dot=dx*v[0]+dy*v[1];if(dot>best){best=dot;angle=i;}}let turn=((angle-p.angle+540)%360)-180,max=Math.max(10,15+Math.max(0,p.stats[2]-4));p.angle=(p.angle+Math.max(-max,Math.min(max,turn))+360)%360;}
export function insight(w,p,art,kind,source){const s=p.skill[art];if(p.kind!=='human'||p.rank==='training'||!s||s.contexts.includes(kind))return;s.contexts.push(kind);s.I=Math.min(100,s.I+5);s.sources.push({kind,tick:w.tick,source});event(w,'insight',[p.id],{art,kind,text:ART[art]+'：'+({guard:'守點配合',dodge:'避開明顯招式',protect:'護人',return:'受傷後安全返程'}[kind]||kind)});}
export function hitGeometry(w,p,t,move,aim,definition=null){const m=definition||moveFor(w,move),dx=t.x-p.x,dy=t.y-p.y,v=aim||directions[p.angle],dot=dx*v[0]+dy*v[1],cross=Math.abs(dx*v[1]-dy*v[0]);
 if(dot<0||dx*dx+dy*dy>((m.range+6)*Q)**2||!los(w,position(p),position(t)))return false;
 if((m.base||move)==='sweep')return true;if(move==='push')return cross<=dot;return cross<=(m.width/2+6)*Q*10000&&dot<=(m.range+6)*Q*10000;
}
export function interceptionReason(w,p,target){
 const o=p.observation[target?.id],ac=target?.action;if(!p.skill.nine)return '尚未學會九劍';if(w.martialPlan&&(p.weapon!=='sword'||!qty(w,p.equipment,'sword')))return '先實際領用木劍';if(!target||dist(p,target)>30)return '距離太遠';if(!los(w,position(p),position(target)))return '視線被遮擋';if(!o||o.last!==ac?.id||o.continuous<12||o.patterns<2)return '尚未連續觀察／辨識兩次起手';if(!ac||ac.phase!=='windup'||ac.remaining<9)return '起手太短或出手太晚';if(p.energy<400)return '精力不足';return null;
}
function sweepRoom(w,p,aim=directions[p.angle]){const at=position(p),side=[-aim[1]/10000*16,aim[0]/10000*16];return sweep(w,at,[at[0]+side[0],at[1]+side[1]],2)&&sweep(w,at,[at[0]-side[0],at[1]-side[1]],2);}
export function actionTiming(p,move,w=null){const m=moveFor(w,move);const s=p.skill[m.art],level=s?.F>=90&&s?.I>=10?2:s?.F>=18?1:0;
 let wind=m.wind,recover=m.recover;if(move==='punch'){wind=[16,12,10][level];recover=[14,10,7][level];}else recover=Math.ceil(recover*[1,.9,.8][level]);
 if(move==='step')recover=Math.max(12,recover+4-p.stats[2]);return{wind,active:m.active,recover,cost:m.cost,range:m.range};}
// Persistent move conditions shared by startAction and read-only projections; situational checks stay in startAction.
export function moveLearnError(w,p,id){const m=moveFor(w,id);if(!m)return'未知招式';if(m.base&&!p.contentMoves?.includes(id))return'先實際研讀這個內容招式';if(m.base&&(!p.skill[m.art]||p.skill[m.art].U<m.requires.U||p.skill[m.art].F<m.requires.F))return'武學前置不足';return null;}
export function moveKitError(w,p,move){const m=moveFor(w,move);if(!p.skill[m.art]&&p.kind==='human')return'尚未學會這門武學';if(['staff','sword'].includes(m.art)&&(p.weapon!==m.art||!qty(w,p.equipment,m.art)))return'先到倉庫實際領用並裝備這種器械';if(w.martialPlan&&move==='intercept'&&(p.weapon!=='sword'||!qty(w,p.equipment,'sword')))return'九劍需實際領用並裝備木劍';if(move==='push'&&!p.pushLearned)return'推掌需洪七公真授課';return null;}
export function startAction(w,p,move,target=null,forced=false){
 const requestedMove=move,m=moveFor(w,move);if(!m)return {ok:false,reason:'未知招式'};
 const learn=moveLearnError(w,p,requestedMove);if(learn)return{ok:false,reason:learn};move=m.base||move;
 if(target&&!target.adult)return {ok:false,reason:'未成年不能成為攻防或切磋對象'};
 if(!p.adult)return {ok:false,reason:'未成年不參戰'};
 if(p.action||p.stun||p.hp<=0)return {ok:false,reason:'仍在起手／收勢／失能'};
 const kit=moveKitError(w,p,move);if(kit)return {ok:false,reason:kit};
 if(move==='sweep'&&(inRect(p.x/Q,p.y/Q,[1854,415,102,50])||!sweepRoom(w,p)))return {ok:false,reason:'窄橋空間不足，不能棍掃'};
 if(move==='step'){const v=directions[p.angle],at=position(p),to=[at[0]+v[0]/10000*24,at[1]+v[1]/10000*24];if(!sweep(w,at,to)||inRect(to[0],to[1],[1860,415,90,50])&&w.bridge.holder!==p.id||sorted(w.people).some(o=>o.id!==p.id&&o.residence!=='departed'&&!o.inactive&&Math.hypot(o.x/Q-to[0],o.y/Q-to[1])<12))return {ok:false,reason:'短步無合法落腳；不能穿牆、越溪或搶橋'};}
 if(p.energy<m.cost)return {ok:false,reason:'精力不足'};
 if(bagWeight(w,p)>2||Object.keys(w.inventories[p.bag].items).some(k=>['wood','stone','water'].includes(k))){
  const pile=inventory(w,uid(w,'ground'),{},96);w.inventories[pile].pos=position(p);for(const [i,n]of Object.entries(w.inventories[p.bag].items))transfer(w,p.bag,pile,i,n);event(w,'set-down',[p.id],{inventory:pile});
 }
 let failure=move==='intercept'?interceptionReason(w,p,target):null;if(failure&&!forced)return {ok:false,reason:failure};
 const {wind,recover}=actionTiming(p,requestedMove,w);
 if(target)face(p,target);const ac={id:uid(w,'action'),move,target:target?.id||null,phase:'windup',remaining:wind,wind,active:m.active,recover,hitSet:[],aim:[...directions[p.angle]],started:w.tick,initialThreat:target?hitGeometry(w,p,target,move,undefined,m):false,failure,expectedTargetAction:target?.action?.id||null,energyCost:m.cost};
 if(m.base)ac.contentMove=requestedMove;
 if(w.martialPlan&&p.rank==='training'&&p.martialPattern==='feint'){p.attackCount=(p.attackCount||0)+1;if(p.attackCount%3===0)ac.feintTick=w.tick+14;}
 if(p.rank==='warden'){p.attackCount=(p.attackCount||0)+1;if(p.attackCount%3===0)ac.feintTick=w.tick+Math.min(10,Math.max(3,wind-5));}
 p.action=ac;p.energy-=m.cost;p.path=[];p.routeAt=0;w.metrics.actions++;event(w,'action-start',[p.id,...(target?[target.id]:[])],{action:ac.id,move:requestedMove,wind,recover,...(w.martialPlan||m.base?{energyCost:ac.energyCost}:{})});return {ok:true};
}
function opposite(w,p,t){if(!t||p.id===t.id||!t.adult||t.residence==='departed'||t.inactive||t.trainingDefeated||t.hp<=0)return false;return p.combatSession&&p.combatSession===t.combatSession&&p.team!==t.team||p.kind!=='human'&&t.kind==='human'&&t.adult||p.kind==='human'&&t.kind!=='human'||p.rank==='warden'&&p.hostile&&t.residence==='resident'||t.rank==='warden'&&t.hostile&&p.residence==='resident';}
export function combatAI(w){
 for(const p of sorted(w.people)){
  if(!p.adult||p.hp<=0||p.inactive||p.trainingDefeated)continue;if(p.kind!=='human'&&['returning','recovering','evade'].includes(p.mode)){p.combatTarget=null;continue;}
  if(p.guardPoint&&!p.combatTarget){const enemy=sorted(w.people).find(t=>t.kind!=='human'&&!t.inactive&&t.mode!=='returning'&&t.mode!=='recovering'&&Math.hypot(t.x/Q-p.guardPoint[0],t.y/Q-p.guardPoint[1])<p.chaseLimit&&dist(p,t)<120&&los(w,position(p),position(t)));if(enemy)p.combatTarget=enemy.id;}
  const target=w.people[p.combatTarget];if(!opposite(w,p,target)||target?.mode==='returning'||target?.mode==='recovering'){p.combatTarget=null;continue;}
  if(dist(p,target)>120&&!p.combatSession){p.combatTarget=null;continue;}
  if(dist(p,target)>120||!los(w,position(p),position(target))){if(p.combatSession&&w.tick%20===0)route(w,p,p.rank==='training'?[1280,1240]:position(target));continue;}
  if(p.action){if(p.action.phase==='windup'&&p.action.remaining>4){face(p,target);p.action.aim=[...directions[p.angle]];}continue;}
  let move=p.kind==='rat'?'bite':p.kind==='boar'?'gore':p.weapon==='staff'&&p.skill.staff?'sweep':p.weapon==='sword'&&p.skill.sword?'thrust':p.move==='push'&&p.pushLearned?'push':'punch';
  const preference=p.contentPreferred,custom=preference&&moveFor(w,preference);if(custom&&p.contentMoves?.includes(preference)&&p.skill[custom.art]&&p.skill[custom.art].U>=custom.requires.U&&p.skill[custom.art].F>=custom.requires.F&&(custom.art==='punch'||p.weapon===custom.art&&qty(w,p.equipment,custom.art)))move=preference;
  const ac=target.action;
  // A legal sidestep while a visible opponent telegraphs an attack; no invulnerability.
  if(ac?.phase==='windup'&&ac.remaining>7&&ac.initialThreat&&ac.target===p.id&&p.lastAvoid!==ac.id&&p.stats[2]>=3){
   const aim=ac.aim,at=position(p),sign=p.id<target.id?1:-1,dx=-aim[1]/10000*18*sign,dy=aim[0]/10000*18*sign,to=[at[0]+dx,at[1]+dy];
   p.lastAvoid=ac.id;if(sweep(w,at,to)&&!sorted(w.people).some(o=>o.id!==p.id&&Math.hypot(o.x/Q-to[0],o.y/Q-to[1])<12)){route(w,p,to);continue;}
  }
  if(p.lastAvoid&&p.lastAvoid===target.action?.id&&!arrived(p))continue;
  const desired=w.martialPlan?.styles[p.id]==='counter'?26:moveFor(w,move).range-2;
  if(dist(p,target)>desired){if(w.tick%10===0){let dx=p.x-target.x,dy=p.y-target.y,d=Math.hypot(dx,dy)||1;const to=[target.x/Q+dx/d*(desired-2),target.y/Q+dy/d*(desired-2)];route(w,p,to);}continue;}
  if(p.assessment){const window=Math.floor((w.tick-p.sparStarted)/200);if(p.assessmentWindow===window)continue;p.assessmentWindow=window;}
  face(p,target);if(w.martialPlan?.styles[p.id]==='counter'&&p.skill.nine&&p.weapon==='sword'){if(!target.action||target.action.phase==='recover')continue;if(target.action.phase==='windup'&&target.action.wind>=21){if(!interceptionReason(w,p,target))startAction(w,p,'intercept',target);continue;}}if(p.skill.nine&&!interceptionReason(w,p,target))startAction(w,p,'intercept',target);else {const r=startAction(w,p,move,target);if(!r.ok&&(moveFor(w,move)?.base||move)==='sweep')startAction(w,p,'punch',target);}
 }
}
export function combatTick(w){
 const entities=sorted(w.people),hits=[];
 for(const p of entities){if(!p.adult||p.inactive||p.hp<=0)continue;
  // Observations only consume visible action information.
  for(const t of entities){if(t.id===p.id||!t.action||dist(p,t)>120||!los(w,position(p),position(t)))continue;let o=p.observation[t.id]??={continuous:0,patterns:0,last:null,seen:[]};o.continuous++;if(o.last!==t.action.id){o.last=t.action.id;o.continuous=1;}
   if(t.action.phase==='active'&&!o.seen.includes(t.action.id)){o.patterns++;o.seen.push(t.action.id);if(o.seen.length>10)o.seen.shift();}
  }
  for(const [id,o]of Object.entries(p.observation))if(!w.people[id]||dist(p,w.people[id])>120||!los(w,position(p),position(w.people[id])))o.continuous=0;
  const a=p.action;if(!a||a.justInterruptedAt===w.tick)continue;if(a.phase==='windup'&&a.feintTick===w.tick){a.phase='recover';a.remaining=a.recover;a.feinted=true;a.justInterruptedAt=w.tick;event(w,'feint',[p.id],{action:a.id,move:a.move,text:'佯攻收手'});continue;}a.remaining--;
  if(a.phase==='windup'&&a.remaining<=0){a.phase='active';a.remaining=a.active;if(a.move==='sweep'&&!sweepRoom(w,p,a.aim)){a.failure='橫掃左右淨空不足';p.blocked=a.failure;event(w,'move-failed',[p.id],{action:a.id,reason:a.failure});}if(a.move==='intercept'){const t=w.people[a.target];const reason=!t||dist(p,t)>30?'距離太遠':!los(w,position(p),position(t))?'視線被遮擋':t.action?.id!==a.expectedTargetAction?'對方已取消／換招':t.action?.phase!=='windup'?(t.action?.feinted?'對方佯攻已收手':'已出招，截擊太晚'):null;if(reason||a.failure){a.failure=reason||a.failure;event(w,'intercept-failed',[p.id],{reason:a.failure,action:a.id});}else {t.action.phase='recover';t.action.remaining=20;t.action.justInterruptedAt=w.tick;event(w,'intercept-success',[p.id,t.id],{action:a.id});}}}
  if(a.phase==='active'){
   if(a.move==='step'){const at=position(p),to=[at[0]+a.aim[0]/10000*4,at[1]+a.aim[1]/10000*4];if(sweep(w,at,to)&&(!inRect(to[0],to[1],[1860,415,90,50])||w.bridge.holder===p.id)&&!entities.some(o=>o.id!==p.id&&Math.hypot(o.x/Q-to[0],o.y/Q-to[1])<12)){const before=[p.x,p.y];p.x=Math.round(to[0]*Q);p.y=Math.round(to[1]*Q);p.distance+=Math.round(Math.hypot(p.x-before[0],p.y-before[1]));}}
   else if(!a.failure){const targets=entities.filter(t=>opposite(w,p,t)&&!a.hitSet.includes(t.id)&&hitGeometry(w,p,t,a.move,a.aim,moveFor(w,a.contentMove||a.move))).sort((u,v)=>dist(p,u)-dist(p,v)||u.id.localeCompare(v.id));
    for(const t of targets.slice(0,a.move==='sweep'?3:1)){a.hitSet.push(t.id);hits.push({p,t,a,damage:Math.max(1,moveFor(w,a.contentMove||a.move).damage+(p.kind==='human'?p.stats[1]-4:0))});}
   }
  }
  if(a.remaining<=0){if(a.phase==='active'){a.phase='recover';a.remaining=a.recover;if(!a.hitSet.length&&moveFor(w,a.contentMove||a.move).damage){w.metrics.misses++;event(w,'miss',[p.id],{action:a.id,move:a.move});const t=w.people[a.target];if(t&&a.initialThreat&&dist(p,t)<80){insight(w,t,t.weapon==='punch'?'punch':t.weapon,'dodge',a.id);}}}
   else if(a.phase==='recover'){event(w,'action-end',[p.id],{action:a.id,move:a.move,hits:a.hitSet});p.action=null;}}
 }
 for(const {p,t,a,damage}of hits){const safe=!!p.combatSession&&p.combatSession===t.combatSession;const before=t.hp;t.hp=Math.max(safe?Math.ceil(t.maxHp/2):0,t.hp-damage);if(!safe)t.injury=Math.min(100,t.injury+Math.ceil(damage/2));w.metrics.hits++;
  t.stun=4;if(t.action?.phase==='windup'){const protectedId=t.action.target,actual=w.people[protectedId];t.action.phase='recover';t.action.remaining=Math.max(4,t.action.recover);if(actual&&actual.id!==p.id&&actual.kind==='human'&&p.kind==='human'){
   (w.pendingProtection??=[]).push({actor:p.id,protected:actual.id,enemy:t.id,art:moveFor(w,a.contentMove||a.move).art,action:a.id,tick:w.tick});}}
  for(const o of Object.values(t.observation)){o.continuous=0;o.patterns=Math.max(0,o.patterns-Math.max(0,2-Math.floor(t.stats[4]/3)));}
  const art=moveFor(w,a.contentMove||a.move).art,s=p.skill[art];if(s&&p.kind==='human'&&p.rank!=='training'){p.sessionHits??={};const key=p.combatSession||w.expedition?.id||'home';p.sessionHits[key]??=0;if(p.sessionHits[key]<6){s.F=Math.min(100,s.F+1);p.sessionHits[key]++;}}
  if(w.expedition?.actors.includes(p.id)&&!['returned','cancelled'].includes(w.expedition.phase)){w.expedition.usedArts??={};w.expedition.usedArts[p.id]??=[];if(!w.expedition.usedArts[p.id].includes(art))w.expedition.usedArts[p.id].push(art);}
  event(w,'hit',[p.id,t.id],{action:a.id,move:a.move,damage:before-t.hp,safe});
  if(a.move==='push'){const from=position(t),to=[from[0]+a.aim[0]/10000*18,from[1]+a.aim[1]/10000*18];let end=from;for(let i=1;i<=18;i++){const q=[from[0]+(to[0]-from[0])*i/18,from[1]+(to[1]-from[1])*i/18];if(!sweep(w,from,q)||entities.some(o=>o.id!==t.id&&Math.hypot(o.x/Q-q[0],o.y/Q-q[1])<12))break;end=q;}t.x=Math.round(end[0]*Q);t.y=Math.round(end[1]*Q);}
  t.recentHits??=[];t.recentHits=t.recentHits.filter(h=>w.tick-h.tick<=60);for(const h of t.recentHits){const other=w.people[h.actor];if(other&&other.id!==p.id&&other.team===p.team){insight(w,p,art,'guard',a.id);insight(w,other,h.art,'guard',a.id);}}t.recentHits.push({actor:p.id,art,tick:w.tick});
  if(safe&&t.hp<=t.maxHp/2){t.trainingDefeated=true;t.combatTarget=null;t.action=null;route(w,t,t.rank==='training'?t.prep:stations['safe.'+(entities.indexOf(t)%10)]);event(w,'training-defeated',[t.id],{session:t.combatSession});}
  else if(!safe&&t.hp<=0){cancel(w,t,'倒地待救');t.action=null;t.combatTarget=null;if(t.kind!=='human'){t.inactive=true;t.mode='down';event(w,'natural-down',[t.id]);}else event(w,'downed',[t.id]);}
 }
 if(w.pendingProtection){for(const r of w.pendingProtection.filter(r=>w.tick-r.tick>=40)){const recent=w.journal.some(e=>e.type==='hit'&&e.actors[0]===r.enemy&&e.actors[1]===r.protected&&e.tick>r.tick);if(!recent){const p=w.people[r.actor],o=w.people[r.protected];insight(w,p,r.art,'protect',r.action);memory(w,'protect',p,o,r.action);}}w.pendingProtection=w.pendingProtection.filter(r=>w.tick-r.tick<40);}
}
export function beginSpar(w,p,o,assessment=false){if(!p?.adult||!o?.adult||p.id===o.id)return {ok:false,reason:'切磋需兩位成年同意者'};if(p.injury>30||o.injury>30||p.hp<p.maxHp*.8||o.hp<o.maxHp*.8)return {ok:false,reason:'先休養到生命八成，傷勢30以下'};
 const id=uid(w,'spar');cancel(w,p);cancel(w,o);for(const [i,q]of [p,o].entries()){q.combatSession=id;q.team=i?'spar.b':'spar.a';q.combatTarget=i?p.id:o.id;q.trainingDefeated=false;q.assessment=assessment;q.assessmentWindow=-1;q.sparUntil=w.tick+600;q.sparStarted=w.tick;q.sparPartner=i?p.id:o.id;q.reason=assessment?'安全對練：留出觀察時間，完成三組攻防':'雙方同意自由切磋';q.next='安全下限或30秒後結束';q.manualStop=true;route(w,q,[1340+i*30,1220]);}event(w,'spar-start',[p.id,o.id],{session:id});return {ok:true};}
export function sessionsTick(w){
 const people=sorted(w.people);
 for(const p of people)if(p.sparUntil&&(w.tick>=p.sparUntil||p.trainingDefeated||w.people[p.sparPartner]?.trainingDefeated)){
  // M24: a spar ends for both sides at once; ending one side alone left the partner in a half-closed session.
  const o=w.people[p.sparPartner],session=p.combatSession;for(const q of[p,o])if(q&&q.sparUntil&&q.combatSession===session){q.sparHistory??=[];q.sparHistory.push({tick:w.tick,duration:w.tick-q.sparStarted,hits:w.journal.filter(e=>e.type==='hit'&&e.tick>=q.sparStarted&&e.actors.includes(q.id)).length});q.combatSession=null;q.combatTarget=null;q.sparUntil=null;q.assessment=false;if(q.action){q.action.phase='recover';q.action.remaining=q.action.recover;}q.trainingDefeated=false;q.manualStop=false;}memory(w,'teach',p,o,'spar');event(w,'spar-end',[p.id,o.id]);
 }
 const d=w.drill;if(!d||d.status==='completed'||d.status==='cancelled'||d.status==='assembling')return;
 if(d.witnessId&&d.wave===0){const observer=w.people[d.witnessId],at=d.witnessPoint;if(!observer||!arrived(observer)||Math.hypot(observer.x/Q-at[0],observer.y/Q-at[1])>2){d.nextWave=null;return;}}
 if(d.status==='exiting'){if(d.allOpponents.every(id=>arrived(w.people[id]))){d.status='completed';for(const id of d.allOpponents){const p=w.people[id];p.hp=p.maxHp;p.combatSession=null;p.combatTarget=null;p.action=null;}event(w,'drill-complete',d.actors,{config:d.config,session:d.id,leaked:d.leaked||0});}return;}
 for(const id of d.opponents){const p=w.people[id];if(!p.trainingDefeated&&p.x/Q<1300){p.trainingDefeated=true;p.drillLeaked=true;p.combatTarget=null;p.action=null;route(w,p,p.prep);d.leaked=(d.leaked||0)+1;event(w,'drill-leaked',[id],{session:d.id});}}
 const active=d.opponents.map(id=>w.people[id]).filter(p=>!p.trainingDefeated&&!p.inactive);
 if(!active.length){if(d.wave===2){d.status='exiting';for(const id of [...d.actors,...(d.allOpponents||d.opponents)]){const p=w.people[id];if(p.combatSession!==d.id)continue;p.combatSession=null;p.combatTarget=null;p.action=null;p.manualStop=false;}return;}
  d.nextWave??=w.tick+200;if(w.tick<d.nextWave)return;d.wave++;d.nextWave=null;d.opponents=[];
  for(let i=0;i<2;i++){
   const id='training.'+((d.wave-1)*2+i+1),prep=[1490+(i%2)*24,1170+(d.wave-1)*110+i*25];
   let p=w.people[id];if(!p)p=makePerson(w,id,'演武對手'+((d.wave-1)*2+i+1),prep,{residence:'training',rank:'training',hp:40,maxHp:40,auto:false,color:'#8f7168',prep});
   p.hp=40;p.energy=10000;p.injury=0;p.skill={punch:{U:5,F:0,I:0,contexts:[],practice:0,sources:[]}};p.observation={};p.combatSession=d.id;p.team='opponents';p.trainingDefeated=false;p.drillLeaked=false;p.combatTarget=null;p.manualStop=true;p.action=null;p.path=[];p.routeAt=0;d.opponents.push(id);d.allOpponents.push(id);event(w,'training-enter',[id],{session:d.id,wave:d.wave});
  }
 }
 // Only people still in this session; someone who left and later sparred elsewhere is no longer managed here.
 const inSession=id=>{const p=w.people[id];return p.combatSession===d.id&&!p.trainingDefeated;};
 for(const id of d.actors){const p=w.people[id];if(inSession(id)&&(!p.combatTarget||w.people[p.combatTarget]?.trainingDefeated||!d.opponents.includes(p.combatTarget)))p.combatTarget=d.opponents.find(id=>!w.people[id].trainingDefeated);}
 for(const id of d.opponents){const p=w.people[id];if(!p.trainingDefeated)p.combatTarget=d.actors.find(inSession);}
 if(!d.actors.some(inSession)){d.status='cancelled';event(w,'drill-failed',d.actors,{reason:'全員已退出'});for(const id of d.actors){const p=w.people[id];if(p.combatSession!==d.id)continue;p.combatSession=null;p.combatTarget=null;p.action=null;p.manualStop=false;}}
}
export function startDrill(w,actors,config='A'){
 if(w.drill&&!['completed','cancelled'].includes(w.drill.status))return {ok:false,reason:'演武仍在進行'};
 if(!actors.length||actors.some(id=>!w.people[id]?.adult||w.people[id].residence!=='resident'))return {ok:false,reason:'演武需成年門人'};
 const id=uid(w,'drill');w.drill={id,config,actors:[...actors],status:'running',wave:0,opponents:[],allOpponents:[],started:w.tick};for(const [i,pid]of actors.entries()){const p=w.people[pid];cancel(w,p);p.combatSession=id;p.team='residents';p.trainingDefeated=false;p.manualStop=true;p.intent=null;route(w,p,[config==='A'?1340:1430,1220+i*20]);}event(w,'drill-start',actors,{config,session:id});return {ok:true};
}
export function ecologyTick(w){
 if(!w.ecology.homeEncounter&&w.tick>=3600){const p=w.people['boar.1'];if(!p.inactive){route(w,p,[1450,1130]);p.mode='home-visit';p.visitUntil=w.tick+2400;event(w,'home-encounter',[p.id],{text:'北坡一頭野豬沿山門靠近外帶；可守點驅離，或叫回避讓。'});}w.ecology.homeEncounter=true;}
 for(const p of sorted(w.people).filter(p=>p.kind!=='human'&&!p.inactive)){
  if(['returning','recovering','evade'].includes(p.mode)){p.combatTarget=null;if(p.action?.phase==='windup'){p.action.phase='recover';p.action.remaining=p.action.recover;}}
  if(p.mode==='recovering'&&Math.hypot(p.x/Q-p.habitat[0],p.y/Q-p.habitat[1])>125){p.mode='returning';route(w,p,p.habitat);event(w,'natural-back-to-habitat',[p.id]);}
  if(p.mode==='returning'&&arrived(p)&&Math.hypot(p.x/Q-p.habitat[0],p.y/Q-p.habitat[1])>10)route(w,p,p.habitat);
  if(p.mode==='forage'&&p.kind==='rat'){const person=sorted(w.people).find(o=>o.residence==='resident'&&o.adult&&dist(p,o)<60&&los(w,position(p),position(o)));if(person){const dx=p.x-person.x,dy=p.y-person.y,d=Math.hypot(dx,dy)||1,to=[p.x/Q+dx/d*35,p.y/Q+dy/d*35];if(walkable(w,...to)){p.mode='evade';p.recoverAt=w.tick+12000;route(w,p,to);event(w,'natural-escaping',[p.id]);}}}
  if(p.mode==='evade'&&arrived(p)){p.mode='recovering';event(w,'natural-escaped',[p.id]);}
  if(p.mode==='forage'&&arrived(p)&&w.tick-(p.lastRoam||0)>=300){p.lastRoam=w.tick;p.roamDirection??=p.angle;p.roamCount=(p.roamCount||0)+1;const v=directions[(p.roamDirection+p.roamCount*137)%360],to=[p.habitat[0]+v[0]/10000*30,p.habitat[1]+v[1]/10000*30];if(walkable(w,...to)&&!sorted(w.people).some(o=>o.id!==p.id&&Math.hypot(o.x/Q-to[0],o.y/Q-to[1])<14))route(w,p,to);}
  if(p.mode==='forage'&&Math.hypot(p.x/Q-p.habitat[0],p.y/Q-p.habitat[1])>125){p.mode='returning';p.combatTarget=null;for(const t of sorted(w.people))if(t.combatTarget===p.id)t.combatTarget=null;route(w,p,p.habitat);}
  if(p.mode==='home-visit'&&w.tick>=p.visitUntil){p.mode='returning';p.recoverAt=w.tick+12000;p.combatTarget=null;route(w,p,p.habitat);event(w,'natural-avoided',[p.id]);}
  const nearby=sorted(w.people).filter(t=>t.adult&&t.kind==='human'&&t.residence==='resident'&&dist(p,t)<(p.kind==='boar'?36:22)&&los(w,position(p),position(t)));
  if(nearby.length&&p.kind==='boar'&&!['returning','recovering','evade'].includes(p.mode)){const t=nearby[0];p.combatTarget=t.id;t.combatTarget=p.id;}
  if(p.hp<=p.maxHp/2&&!['returning','recovering','evade'].includes(p.mode)){p.mode='returning';p.combatTarget=null;for(const t of sorted(w.people))if(t.combatTarget===p.id)t.combatTarget=null;p.recoverAt=w.tick+12000;route(w,p,p.habitat);event(w,'natural-driven',[p.id]);}
  if(p.mode==='returning'&&arrived(p)){p.mode='recovering';p.combatTarget=null;for(const t of nearby)if(t.combatTarget===p.id)t.combatTarget=null;}
  if(p.mode==='recovering'&&p.recoverAt===undefined){p.recoverAt=w.tick+12000;event(w,'recovery-scheduled',[p.id]);}
  if(p.mode==='recovering'&&w.tick>p.recoverAt){p.mode='forage';p.hp=p.maxHp;}
 }
}

export function interruptCombat(w,p){
 if(p.sparUntil){const o=w.people[p.sparPartner];for(const q of [p,o].filter(Boolean)){q.sparUntil=null;q.assessment=false;q.combatSession=null;q.combatTarget=null;q.pendingPromotion=false;if(q.action){q.action.phase='recover';q.action.remaining=q.action.recover;}}event(w,'spar-cancelled',[p.id,...(o?[o.id]:[])]);}
 else if(p.combatSession){p.trainingDefeated=true;p.combatTarget=null;p.combatSession=null;if(p.action){p.action.phase='recover';p.action.remaining=p.action.recover;}}
}
