import {finishIncident} from './homestead-threat.mjs';
import {barrierCells,segmentBlocked,route} from './homestead-spatial.mjs';
import {preparedCount} from './homestead-content.mjs';
export const MOVES={brace:{name:'穩步擋勢',damage:3,energy:1,xp:0},drive:{name:'進身推掌',damage:6,energy:5,xp:3},sweep:{name:'回身掃勢',damage:2,energy:3,xp:6,insight:1}};
export const MARTIAL_ACTIONS={practice:{name:'練習步勢',place:'practice',duration:8,frontierOnly:true},fight:{name:'近身應戰',place:'encounter',duration:2,frontierOnly:true}};
export const freshMartial=()=>({xp:0,practices:0,hits:0,partnerRounds:0,insights:0,stance:'brace',avoid:false});
export const freshTalents=(body=1)=>({body:[0,1,2].includes(body)?body:1,mind:2-([0,1,2].includes(body)?body:1)});
export function moveKnown(s,id){const m=MOVES[id],a=s.frontier?.martial;return !!m&&!!a&&a.xp>=m.xp&&a.insights>=(m.insight||0);}
export function martialTarget(s,act){if(act==='practice')return [500,350];const b=s.frontier?.threat.beast;return b?[b.pos[0],Math.max(15,b.pos[1]-40)]:[500,350];}
export function martialReason(s,act){const f=s.frontier;if(!f)return '只在生活與山林試作';if(act==='practice')return !s.fac.hut.stage?'先安家':f.martial.xp>=12?'練習已達本段上限':s.person.energy<12?'先休息':null;if(act==='fight')return !f.threat.beast?'目前沒有近身威脅':f.martial.avoid?'已選擇避戰':!moveKnown(s,f.martial.stance)?'還未學會這招':s.person.energy<MOVES[f.martial.stance].energy?'精力不足，先休息':!route(s,s.person.pos,martialTarget(s,act)).length?'對手所在位置暫不可達':null;return null;}
export function martialPlan(s){const f=s.frontier;if(!f||f.approach!=='learn'||!s.autonomy.warmMeals)return null;if(f.threat.beast&&!martialReason(s,'fight')&&s.person.energy>25)return 'fight';if(f.martial.xp<6&&s.person.hunger>50&&s.person.energy>50&&preparedCount(s)>0&&!martialReason(s,'practice'))return 'practice';return null;}
const log=(s,msg)=>{s.log.unshift({day:s.day,msg});s.log.length=Math.min(80,s.log.length);};
export function martialComplete(s,act){const f=s.frontier;if(!f||martialReason(s,act))return false;const p=s.person,m=f.martial;
 if(act==='practice'){if(Math.hypot(p.pos[0]-500,p.pos[1]-350)>1)return false;const before=m.xp;m.xp=Math.min(12,m.xp+1+f.talents.mind*.5);m.practices++;p.energy=Math.max(0,p.energy-(6-2*f.talents.body));if(before<3&&m.xp>=3)log(s,'從有效練習學會進身推掌；省力擋勢仍可選。');return true;}
 if(act==='fight'){const b=f.threat.beast,r=MOVES[m.stance];if(!b||Math.hypot(p.pos[0]-b.pos[0],p.pos[1]-b.pos[1])>55||barrierCells(s).some(([x,y])=>segmentBlocked(p.pos,b.pos,[x*30,y*30,30,30])))return false;const hit=Math.min(b.hp,r.damage);b.hp-=hit;p.energy=Math.max(0,p.energy-r.energy);m.hits++;m.xp=Math.min(12,m.xp+.25);if(m.stance==='sweep')b.lastStrike=s.t;log(s,`${r.name}實中${hit}，耗${r.energy}精力。`);if(b.hp<=0)finishIncident(s,'山豬被擊退，沒有憑空掉落物資。');return true;}
 return false;
}
export function validMartial(f){const m=f.martial,t=f.talents;return !!t&&[t.body,t.mind].every(n=>Number.isInteger(n)&&n>=0&&n<=2)&&t.body+t.mind===2&&!!m&&Number.isFinite(m.xp)&&m.xp>=0&&m.xp<=12&&['practices','hits','partnerRounds','insights'].every(k=>Number.isInteger(m[k])&&m[k]>=0)&&typeof m.avoid==='boolean'&&Object.hasOwn(MOVES,m.stance)&&m.xp>=MOVES[m.stance].xp&&m.insights>=(MOVES[m.stance].insight||0);}
export function martialText(s){const f=s.frontier,m=f.martial;return `根骨${f.talents.body}／悟性${f.talents.mind}，步勢${m.xp.toFixed(2)}/12；${Object.entries(MOVES).map(([id,r])=>`${r.name}：${moveKnown(s,id)?'已會':`需步勢${r.xp}${r.insight?'及交流領悟1':''}`}（${r.damage}傷／${r.energy}精力${id==='sweep'?'／重計敵攻3秒':''}）`).join('；')}。${m.avoid?'目前避戰':'按方向選擇應戰'}，急需吃睡優先。`;}

export function validMartialTask(s){const t=s.person.task;if(!t||!Object.hasOwn(MARTIAL_ACTIONS,t.act))return true;if(!s.frontier||!Number.isFinite(t.timer)||t.timer<0||t.timer>=MARTIAL_ACTIONS[t.act].duration||t.phase==='go'&&t.timer!==0)return false;return t.phase!=='do'||(t.act==='practice'?Math.hypot(s.person.pos[0]-500,s.person.pos[1]-350)<=1:!!s.frontier.threat.beast&&Math.hypot(s.person.pos[0]-s.frontier.threat.beast.pos[0],s.person.pos[1]-s.frontier.threat.beast.pos[1])<=55);}
