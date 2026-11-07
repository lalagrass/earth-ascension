// N36 同一個負荷/士氣/移動模型；物種只供資料，不用招名/角色特例。
import {NODES,SOURCES,MONSTERS,BASE_SPEED,DAY} from './data.mjs';
import {FOE_ACTIONS} from './starter-combat.mjs';
import {RING} from './combat-space.mjs';
import {familiarUses,PRACTICE,emitPractice} from './practice.mjs';
import {pickupDrop} from './techniques.mjs';
export const COVERS=[
 {id:'hallWall',kind:'wall',pos:NODES.hall,stand:[NODES.hall[0]+RING.step,NODES.hall[1]],slots:1},
 {id:'gate',kind:'gate',pos:NODES.gate,stand:[NODES.gate[0]-RING.step,NODES.gate[1]],slots:2,slotsByStage:[2,2,1,1]},
 {id:'guardTree',kind:'tree',pos:[NODES.guard[0]+RING.engage,NODES.guard[1]],stand:[NODES.guard[0]+RING.step,NODES.guard[1]],slots:1},
 {id:'trailTree',kind:'tree',pos:[NODES.trail2[0]+RING.engage,NODES.trail2[1]],stand:[NODES.trail2[0]+RING.step,NODES.trail2[1]],slots:1},
];
export const distance=(a,b)=>Math.hypot((a?.[0]||0)-(b?.[0]||0),(a?.[1]||0)-(b?.[1]||0));
export const faction=a=>a.faction||(a.k?'outside':'home');
export const combatants=s=>[...(s.ds||[]),...(s.mons||[]),...(s.band?.members||[])];
export function opponents(s,a,extra=null){const list=combatants(s).filter(t=>t!==a&&!t.gone&&!t.away&&(t.hp??1)>0&&faction(t)!==faction(a));if(extra&&!list.includes(extra))list.push(extra);return list;}
export function allies(s,a){return combatants(s).filter(t=>t!==a&&!t.gone&&!t.away&&(t.hp??1)>0&&faction(t)===faction(a));}
export function movementSpeed(a){return a.k?(MONSTERS[a.k]?.speed||BASE_SPEED*(1+(a.agi||0)/100)):BASE_SPEED*(1+(a.skills?.agility||0)/100);}
export function coverFor(a,s){return COVERS.filter(c=>distance(a.pos,c.stand)<=RING.engage/2).map(c=>({...c,slots:c.slotsByStage?.[s?.fence?.lv||0]??c.slots})).sort((a,b)=>a.slots-b.slots)[0]||null;}
export function backToBackPartner(s,a) {
 if(!s || !a?.pos) return null;
 return allies(s,a).filter(b=>b.pos&&distance(a.pos,b.pos)<=RING.step*2
   && (b.pos[0]-a.pos[0])*(a.face||1)<0 && (b.pos[0]-a.pos[0])*(b.face||1)>0)
   .sort((x,y)=>distance(a.pos,x.pos)-distance(a.pos,y.pos)||String(x.id).localeCompare(String(y.id)))[0]||null;
}
export const ringCapacity=(a,s)=>Math.min(coverFor(a,s)?.slots||RING.slots,backToBackPartner(s,a)?RING.slots/2:RING.slots);
export function loadFromForecast(a,rows,s){
 const slots=ringCapacity(a,s),active=rows.filter(r=>r.active),waiting=rows.filter(r=>!r.active).sort((x,y)=>x.window+x.travel-y.window-y.travel);
 // 開放地形仍照 N28 將所有可預見來招計入；實際背靠背／掩體才排除站不進來的候補。
 const relevant=slots<RING.slots?[...active,...waiting.slice(0,Math.max(0,slots-active.length))]:rows;
 const parts=relevant.map(r=>({...r,share:r.need/(r.window+r.travel)}));return {L:parts.reduce((n,r)=>n+r.share,0),rows:parts,slots};
}
export const attackTokenLimit=(organization,slots)=>Math.min(organization,slots);
export function moraleOf(a,{L,enemies,allies:friends,fallen=0,initialFriends=friends+1,threat=0,tolerance=1}){
 const health=Math.max(0,1-(a.hp??a.max??MONSTERS[a.k]?.hp??100)/(a.max||MONSTERS[a.k]?.hp||100)),fatigue=1-(a.needs?.energy??a.energy??100)/100;
 const profile=FOE_ACTIONS[a.k]||{},reserve=tolerance+(profile.injuryAnger?health:0)+friends/(enemies+1);
 // 寡不敵眾用多出的人數佔交戰總人數的比例；兩人對一人仍有壓力，四人包圍更大。
 const surplus=Math.max(0,enemies-(friends+1))/(enemies+friends+1);
 const pressure=health+fatigue+fallen/Math.max(1,friends+1)+surplus+L/(1+L)+threat;
 const state=pressure<reserve/2?'steady':pressure<reserve?'shaken':pressure<2*reserve?'broken':'routing';
 return {reserve,pressure,state,health,fatigue};
}
export function chooseTactic(s,a,assessment,{temper=1,normalTemper=1,canHelp=false,enemies=opponents(s,a).filter(e=>distance(e.pos,a.pos)<=RING.outer+RING.leash),friends=allies(s,a)}={}){
 const nearFriends=friends.filter(f=>f.pos&&distance(f.pos,a.pos)<=RING.outer+RING.leash),profile=FOE_ACTIONS[a.k]||{};
 let threat=0,anger=false;
 for(const enemy of enemies)for(const[tool,response]of Object.entries(profile.threat||{}))if(enemy.tools?.[tool]&&distance(enemy.pos,a.pos)<=RING.outer+RING.leash){if(response==='back')threat++;if(response==='anger')anger=true;}
 const fallen=(s.band?.members||[]).filter(m=>faction(m)===faction(a)&&(m.hp<=0||m.gone)).length;
 const morale=moraleOf(a,{L:assessment.L,enemies:enemies.length,allies:nearFriends.length,fallen,initialFriends:friends.length+fallen+1,threat,tolerance:normalTemper/temper});
 const threshold=normalTemper/temper;
 if(a.raging||a.rageUntil>s.t)return {action:'press',morale,L:assessment.L,anger};
 if(assessment.L<threshold&&['steady','shaken'].includes(morale.state)&&!threat)return {action:'hold',morale,L:assessment.L,anger};
 const available=canHelp?nearFriends.filter(f=>!f.order&&!f.swing&&!f.bswing&&(!s.hunt||!s.hunt.team.includes(f.id))):[];
 if(available.length)return {action:'shout',helper:available.sort((x,y)=>distance(x.pos,a.pos)-distance(y.pos,a.pos))[0].id,morale,L:assessment.L,anger};
 const cover=COVERS.filter(c=>distance(c.stand,a.pos)<=RING.leash).sort((x,y)=>x.slots-y.slots||distance(x.stand,a.pos)-distance(y.stand,a.pos))[0];
 if(cover&&morale.state!=='routing')return {action:'cover',cover:cover.id,destination:cover.stand,morale,L:assessment.L,anger};
 const fastest=Math.max(0,...enemies.map(t=>{const f=familiarUses(a,t,t.swing?.mv||t.lastCombatMove||'',s.codex),known=a.flightSeen?.[t.k||t.id];return movementSpeed(t)*(known?1:f/(f+PRACTICE.eyeHalf));}));
 if(movementSpeed(a)>fastest||morale.state==='routing'||threat){const source=SOURCES[profile.escapeSource||'den'];const dest=a.k?source.pos:(nearFriends[0]?.pos||NODES.gate);return {action:'flee',destination:dest,morale,L:assessment.L,anger};}
 return {action:'brace',morale,L:assessment.L,anger};
}
export function moveToward(a,to,speed,dt){if(!a.pos)return false;const L=distance(a.pos,to),travel=Math.min(L,speed*dt);if(L>0){a.pos[0]+=(to[0]-a.pos[0])*travel/L;a.pos[1]+=(to[1]-a.pos[1])*travel/L;}return L<=speed*dt;}
export function stepTactic(s,a,assessment,dt,H={}){
 if(a.downUntil>s.t)return true;if(pickupDrop(s,a,FOE_ACTIONS[a.k]?.hands??2))return true;
 let choice=chooseTactic(s,a,assessment,{...H,canHelp:typeof H.help==='function'});if(a.k&&a.escapeDestination&&!a.raging)choice={...choice,action:'flee',destination:a.escapeDestination};const before=a.tactics?.action;
 a.tactics={...(a.tactics||{}),...choice,cover:choice.cover||null,at:s.t};
 if(choice.anger&&!a.raging)H.anger?.(a);
 if(before!==choice.action){a.reason=`${choice.action}：應接負荷${assessment.L.toFixed(2)}，士氣${choice.morale.state}`;emitPractice(s,{type:'tactic',who:a.id||a.uid||a.k,action:choice.action,L:assessment.L,morale:choice.morale.state});}
 if(choice.action==='shout'&&a.lastHelpAt!==s.t){H.help?.(a,choice.helper);a.lastHelpAt=s.t;}
 if(a.lureUntil>s.t&&a.lurePos){moveToward(a,a.lurePos,H.speed||movementSpeed(a),dt);return true;}
 if(choice.action==='cover'||choice.action==='flee'){
   if(choice.action==='flee'&&a.k)a.escapeDestination=[...choice.destination];
   a.path=[];const arrived=moveToward(a,choice.destination,H.speed||movementSpeed(a),dt);
   if(choice.action==='flee'&&arrived)H.exit?.(a);return !arrived||choice.action==='flee'||(assessment.L>=(H.normalTemper||1)/(H.temper||1)&&!a.raging);
 }
 return choice.action==='brace';
}
export function pursueFleeing(a,target,dt,speed=movementSpeed(a)){
 if(!FOE_ACTIONS[a.k]?.chase||target.tactics?.action!=='flee')return false;
 moveToward(a,target.pos,speed,dt);return true;
}
export function rememberEscape(s,a){if(!a.k)return;const uid=a.uid||`${a.k}-${s.rngN++}`;const copy=JSON.parse(JSON.stringify(a));delete copy.swing;delete copy.bswing;delete copy.tactics;delete copy.path;delete copy.escapeDestination;copy.escapedAt=s.t;copy.survived=true;copy.scarred=!!(a.scarred||a.wounds?.length||(a.hp??1)<(a.max||100));(s.survivors??={})[uid]=copy;emitPractice(s,{type:'escape',who:uid,kind:a.k,hp:a.hp,opponent:a.intentTarget||a.foe||null});}
export function restoreSurvivor(s,k,fresh){const entries=Object.entries(s?.survivors||{}).filter(([,m])=>m.k===k).sort((a,b)=>a[1].escapedAt-b[1].escapedAt);if(!entries.length)return fresh;const[id,m]=entries[0];delete s.survivors[id];const hp=fresh.hp*Math.min(1,(m.hp??m.max)/(m.max||m.hp||1));for(const key of ['uid','practice','glimmer','moves','selection','tools','weapon','flightSeen','scarred','survived','wounds'])if(m[key]!=null)fresh[key]=m[key];if(fresh.wounds){const days=Math.floor(Math.max(0,s.t-m.escapedAt)/DAY);fresh.wounds=fresh.wounds.map(w=>({...w,days:w.days-days})).filter(w=>w.days>0);}fresh.hp=hp;return fresh;}
