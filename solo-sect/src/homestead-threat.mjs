import {move} from './homestead-spatial.mjs';
export const WARNING=30,INCIDENT=26,INTERVAL=480;
export const freshThreat=()=>({phase:'quiet',next:720,warnAt:0,until:0,beast:null,incursions:0,damage:0,scares:0});
const log=(s,msg)=>{s.log.unshift({day:s.day,msg});s.log.length=Math.min(80,s.log.length);};
export function finishIncident(s,reason){const t=s.frontier.threat;t.beast=null;t.phase='quiet';t.next=s.t+INTERVAL;t.until=0;log(s,reason);}
export function tickThreat(s,dt){
 const f=s.frontier;if(!f)return;const t=f.threat;
 if(t.phase==='quiet'&&s.t>=t.next){t.phase='warning';t.warnAt=s.t;t.until=s.t+WARNING;log(s,'林緣傳來山豬足跡；30秒後可能靠近。可守家，或繼續生活避開。');}
 if(t.phase==='warning'&&s.t>=t.until){t.phase='active';t.incursions++;t.beast={pos:[875,345],hp:18,born:s.t,lastStrike:s.t,scared:false};t.until=s.t+INCIDENT;log(s,'一隻山豬進入林緣。');}
 const b=t.beast;if(!b)return;
 if(s.t>=t.until){finishIncident(s,'山豬離開了；家園仍可繼續生活。');return;}
 const barrier=s.fac.fence.stage&&f.fenceHp>0&&!f.gateOpen,target=barrier?[825,345]:[445,345];
 move(s,b,target,dt,35);
 if(barrier&&Math.hypot(b.pos[0]-825,b.pos[1]-345)<2&&s.t-b.lastStrike>=3){const hit=Math.min(4,f.fenceHp);f.fenceHp-=hit;t.damage+=hit;b.lastStrike=s.t;log(s,`山豬撞擊柵欄，耐久減少${hit}。`);}
 if(!barrier&&!b.scared&&Math.hypot(b.pos[0]-s.person.pos[0],b.pos[1]-s.person.pos[1])<45){const hit=Math.min(8,s.person.energy);s.person.energy-=hit;b.scared=true;t.scares++;log(s,'山豬驚擾讓人疲憊，先照顧吃睡，牠稍後會離去。');}
}
export function validThreat(s){const t=s.frontier?.threat;if(!t||!['quiet','warning','active'].includes(t.phase)||['next','warnAt','until','incursions','damage','scares'].some(k=>!Number.isFinite(t[k])||t[k]<0)||['incursions','damage','scares'].some(k=>!Number.isInteger(t[k])))return false;
 if(t.phase==='quiet'&&(t.beast!==null||t.until!==0)||t.phase==='warning'&&(t.beast!==null||t.warnAt>s.t||t.until!==t.warnAt+WARNING||t.until<s.t)||t.phase==='active'&&(!t.beast||t.until<s.t))return false;
 const b=t.beast;return !b||!!(Array.isArray(b.pos)&&b.pos.length===2&&b.pos.every(Number.isFinite)&&b.pos[0]>=0&&b.pos[0]<=900&&b.pos[1]>=0&&b.pos[1]<=560&&b.hp>0&&b.hp<=18&&Number.isFinite(b.hp)&&Number.isFinite(b.born)&&Number.isFinite(b.lastStrike)&&b.born<=s.t&&b.born>=0&&b.lastStrike>=b.born&&b.lastStrike<=s.t&&t.until===b.born+INCIDENT&&typeof b.scared==='boolean');}
export function threatText(s){const t=s.frontier.threat;return t.phase==='warning'?`預警：山豬約${Math.max(0,Math.ceil(t.until-s.t))}秒後靠近；先備防或避開。`:t.beast?`山豬正在林緣，還有${Math.max(0,Math.ceil(t.until-s.t))}秒離開；屏障已承受${t.damage}傷害。`:`目前平靜；約${Math.max(0,Math.ceil(t.next-s.t))}秒後再留意林緣。`;}
