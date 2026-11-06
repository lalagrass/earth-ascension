// N50：所有人相同的食宿/真指導時間/處境比較；不儲存名俠容量或第二份好感。
import {DAY,FACILITIES,ACTIVITIES,PHASES} from './data.mjs';
import {BODY_BASE,BODY_TIMING} from './starter-combat.mjs';
import {PRACTICE,handUses,practiceResidual} from './practice.mjs';
import {seasonOf} from './economy.mjs';
export const HUNGER_PER_SECOND=.35;
export const bedCount=s=>FACILITIES.reduce((n,f)=>n+(f.stages[s.fac?.[f.id]?.stage||0]?.beds||0),0);
export const dailyRations=s=>DAY*HUNGER_PER_SECOND*seasonOf(s).hunger/ACTIVITIES.eat.need.hunger;
export const bodyExperience=d=>BODY_BASE.reduce((n,id)=>n+handUses(d,id),0)/BODY_BASE.length;
export const guidanceSeconds=d=>PRACTICE.halfUses*BODY_TIMING.reaction*practiceResidual(bodyExperience(d));
export const competence=d=>Math.max(0,...['palm','leg','sword','staff','blade','fist'].map(k=>d.skills?.[k]||0),PRACTICE.bodyScale*(1/practiceResidual(bodyExperience(d))-1));
const available=d=>{const c=d.timePrev||d.timeToday;if(!c?.elapsed)return 0;return Math.min(DAY*PHASES.find(p=>p[1]==='night')[0],c.free*DAY/c.elapsed);};
export function mentorFor(s,pupil){return s.ds.filter(m=>m!==pupil&&m.role!=='laborer'&&!m.away&&m.hp>30&&!(m.downUntil>s.t)&&bodyExperience(m)>bodyExperience(pupil)).map(m=>({m,free:available(m)-s.ds.filter(p=>p.guidanceMentor===m.id&&p!==pupil).reduce((n,p)=>n+guidanceSeconds(p),0)})).sort((a,b)=>b.free-a.free||a.m.id.localeCompare(b.m.id))[0]||null;}
export function admissionStatus(s,candidate){
 const beds=bedCount(s),mouths=s.ds.length+1,rations=dailyRations(s),foodNeed=mouths*rations,mentor=mentorFor(s,candidate),need=guidanceSeconds(candidate);
 const outside={food:0,bed:0,status:competence(candidate),safety:0,autonomy:1,reason:'在村路討生活',...candidate.situation};
 const opinion=Math.max(0,...s.ds.map(d=>s.aff?.[`${candidate.id}>${d.id}`]||0))/100;
 const status=Math.max(0,...s.ds.map(competence));
 const safety=(s.fac?.watch?.stage||0)+(s.fence?.hp>0?s.fence.hp/(s.fence.max||s.fence.hp):0);
 const utility={food:1-outside.food,bed:1-outside.bed,status:(status-outside.status)/PRACTICE.bodyScale,safety:safety-outside.safety,opinion,autonomy:-outside.autonomy};
 const advantage=Object.values(utility).reduce((n,v)=>n+v,0),reason=`${outside.reason}；本門/現況差 ${advantage.toFixed(2)}（食${utility.food.toFixed(2)}、住${utility.bed.toFixed(2)}、功夫${utility.status.toFixed(2)}、安全${utility.safety.toFixed(2)}、交情${opinion.toFixed(2)}、牽掛${utility.autonomy.toFixed(2)}）`;
 let why=s.ds.some(d=>d.id===candidate.id)?'已在門中':s.ds.length>=beds?`床位已滿（${s.ds.length}/${beds}）`:s.res.food<foodNeed?`存糧不足全門一日（${s.res.food.toFixed(1)}/${foodNeed.toFixed(1)}）`:!mentor||mentor.free<need?`師父實際空檔不足（${(mentor?.free||0).toFixed(1)}/${need.toFixed(1)}秒）`:advantage<=0?reason:null;
 return {ok:!why,why:why||reason,beds,foodNeed,need,mentor:mentor?.m.id,mentorFree:mentor?.free||0,advantage,utility,reason};
}
export function prepareAdmission(s,candidate){const c=admissionStatus(s,candidate);if(!c.ok){if(s.ds.length>=c.beds)s.admissionDemand={candidate:candidate.id,at:s.t,reason:c.why};return c;}candidate.guidanceMentor=c.mentor;candidate.admissionReason=c.reason;return c;}
export function clockActor(s,d,dt){
 if(d.timeToday?.day!==s.day){if(d.timeToday)d.timePrev=d.timeToday;d.timeToday={day:s.day,elapsed:0,free:0,guided:0};}
 const c=d.timeToday;c.elapsed+=dt;
 if(!d.away&&!d.order&&!d.path?.length&&(!d.task||['train','meditate','leisure'].includes(d.task.act)||d.task.guidanceFor||d.task.guidanceFrom))c.free+=dt;
}
export function noteGuidance(s,d,dt){if(!d.task?.guidanceFrom||d.task.phase!=='do')return;const m=s.ds.find(m=>m.id===d.task.guidanceFrom);if(m?.task?.guidanceFor===d.id&&m.task.phase==='do'&&!m.path?.length&&!d.path?.length&&Math.hypot(m.pos[0]-d.pos[0],m.pos[1]-d.pos[1])<=60){d.timeToday.guided+=dt;d.guidanceTotal=(d.guidanceTotal||0)+dt;}}
export function guidanceLearning(d){if(!d.guidanceMentor||!d.timePrev)return 1;const need=guidanceSeconds(d),miss=Math.max(0,need-d.timePrev.guided);return need/(need+miss);}
export function guidanceDaily(s){for(const d of s.ds){if(!d.guidanceMentor||!d.timeToday)continue;const need=guidanceSeconds(d),miss=Math.max(0,need-d.timeToday.guided)/need;d.thoughts=d.thoughts.filter(t=>t.id!=='guidanceMiss');if(miss>0)d.thoughts.push({id:'guidanceMiss',text:`師父忙不過來，缺${(miss*100).toFixed(0)}%指點`,v:-Math.round(10*miss),left:DAY});}}
