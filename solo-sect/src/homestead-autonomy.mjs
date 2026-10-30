// Runtime-only rule lookup, like the existing display adapters; no top-level access.
import {FACILITIES} from './homestead.mjs';
import {skillLevel} from './homestead-skills.mjs';
import {buildAccess,BUILD_GATES} from './homestead-content.mjs';
// Plans describe intentions. Only the existing executor changes world resources.
export const GOALS={
 shelter:{name:'蓋第一間木屋',done:s=>s.fac.hut.stage>=1,step:()=> 'hut'},
 hotFood:{name:'穩定吃熱飯',done:s=>s.autonomy.warmMeals>0,step:s=>!s.fac.garden.stage?'garden':!s.fac.kitchen.stage?'kitchen':null},
 comfort:{name:'睡得更好',done:s=>s.autonomy.comfortRests>0,step:s=>s.fac.hut.stage<2?'hut':s.fac.bed.stage<1?'bed':!s.fac.workbench.stage?'workbench':s.fac.bed.stage<2?'bed':null},
 porch:{name:'屋前自在休憩',done:s=>s.fac.bench.stage>0&&s.fac.flowers.stage>0,step:s=>!s.fac.bench.stage?'bench':!s.fac.flowers.stage?'flowers':null},
 pantry:{name:'備餐與收納更從容',done:s=>s.fac.store.stage>0&&s.fac.kitchen.stage>=2,step:s=>!s.fac.store.stage?'store':s.fac.kitchen.stage<2?'kitchen':null},
};
export const DIRECTIONS={auto:'自行打算',steady:'先穩定吃住',comfort:'住得舒服',frugal:'少耗材料'};
export const PREFERENCES={quiet:{comfort:6,porch:5,pantry:2},sociable:{comfort:4,porch:6,pantry:2},diligent:{comfort:5,porch:2,pantry:6}};
export const freshAutonomy = () => ({version:1, goal:null, since:0, completed:[], warmMeals:0, comfortRests:0,recess:false, breaks:0,direction:'auto',deferred:[],experience:{hunger:0,fatigue:0,effort:0,lastWork:0}});
export function validAutonomy(a,mode,t=Infinity,work=Infinity){
 return a===null || mode==='solo' && a && a.version===1 &&
 (a.goal===null||Object.hasOwn(GOALS,a.goal)) && Number.isFinite(a.since) && a.since>=0 && a.since<=t &&
 Array.isArray(a.completed) && a.completed.length<=Object.keys(GOALS).length && new Set(a.completed).size===a.completed.length && a.completed.every(x=>Object.hasOwn(GOALS,x)) && Number.isSafeInteger(a.warmMeals) && a.warmMeals>=0 && Number.isSafeInteger(a.comfortRests) && a.comfortRests>=0 && typeof a.direction==='string'&&Object.hasOwn(DIRECTIONS,a.direction)&&Array.isArray(a.deferred)&&a.deferred.length<=5&&new Set(a.deferred).size===a.deferred.length&&a.deferred.every(id=>Object.hasOwn(GOALS,id))&&typeof a.recess==='boolean' && Number.isSafeInteger(a.breaks)&&a.breaks>=0 && a.experience && ['hunger','fatigue','effort'].every(k=>Number.isFinite(a.experience[k])&&a.experience[k]>=0&&a.experience[k]<=3) && Number.isFinite(a.experience.lastWork)&&a.experience.lastWork>=0&&a.experience.lastWork<=work;
}
export function observeAutonomy(s,dt){
 const e=s.autonomy?.experience;if(!e)return;
 const clamp=n=>Math.max(0,Math.min(3,n));
 e.hunger=clamp(e.hunger-dt/720+(s.person.hunger<30?dt/30:0));
 e.fatigue=clamp(e.fatigue-dt/720+(s.person.energy<25?dt/30:0));
 e.effort=clamp(e.effort-dt/720+Math.max(0,s.person.work-e.lastWork)/10);
 e.lastWork=s.person.work;
}
export function goalCandidates(s){
 const e=s.autonomy.experience;
 return Object.entries(PREFERENCES[s.person.personality]).filter(([id])=>!GOALS[id].done(s)&&!s.autonomy.deferred.includes(id)).map(([id,base])=>{
  const bonus=id==='pantry'?12*e.hunger:id==='comfort'?3*e.fatigue:.5*e.effort;
  const direction=s.autonomy.direction,guide=direction==='steady'&&id==='pantry'||direction==='comfort'&&id==='comfort'?12:direction==='frugal'?-2*remainingWood(s,id):0;
  return {id,score:base+bonus+guide,reason:`${{quiet:'喜靜',sociable:'開朗',diligent:'勤勞'}[s.person.personality]}偏好${GOALS[id].name}${bonus>.1?id==='pantry'?'；近期曾缺糧':id==='comfort'?'；近期疲倦':'；近期工作後想休憩':''}`};
 }).sort((a,b)=>b.score-a.score);
}
export function advanceAutonomy(s,api){
 const a=s.autonomy;if(!a)return;
 if(a.goal&&GOALS[a.goal].done(s)){if(!a.completed.includes(a.goal))a.completed.push(a.goal);a.goal=null;a.recess=true;}
 if(a.recess)return 'leisure';
 if(!a.goal){a.goal=!s.fac.hut.stage?(a.deferred.includes('shelter')?null:'shelter'):a.warmMeals===0&&!a.deferred.includes('hotFood')?'hotFood':goalCandidates(s)[0]?.id||null;a.since=s.t;}
 if(!a.goal)return;
 const id=goalStep(s);
 if(id&&!s.fac[id].site&&!planBlock(s))api.start(id);
 if(a.goal==='hotFood'&&s.fac.garden.stage&&s.plot.state==='empty'&&!s.stock.seeds&&api.can('forage'))return 'forage';
 if(a.goal==='comfort'&&!id&&!a.comfortRests)return 'rest';
}
const labels={hut:'修屋',garden:'開菜園',kitchen:'搭灶／改善灶具',bed:'製作床鋪',workbench:'搭木作台',store:'搭儲物棚',bench:'做屋前長凳',flowers:'整理庭院花叢'};
// A missing skill is solved only by other still-useful, real construction.
export function goalStep(s){
 const goal=s.autonomy?.goal;if(!goal)return null;
 const id=GOALS[goal].step(s);if(!id)return null;
 const gate=BUILD_GATES[`${id}:${s.fac[id].stage+1}`]||BUILD_GATES[id];
 if(gate&&skillLevel(s,'build')<gate.level){
  const other=['store','bench','flowers','kitchen'].find(k=>k!==id&&s.fac[k].stage<(k==='kitchen'?2:1)&&!buildAccess(s,k,s.fac[k].stage+1));
  if(other)return other;
 }
 return id;
}
export function planBlock(s){
 const a=s.autonomy;if(!a?.goal)return null;
 const id=goalStep(s);
 const paused=Object.entries(s.fac).find(([k,f])=>k===id&&f.site?.paused);
 if(paused)return `你已暫停${labels[paused[0]]||'工程'}，保留材料與工量，等待你恢復。`;
 const other=Object.entries(s.fac).find(([k,f])=>f.site&&!f.site.paused&&k!==id);
 if(other)return `先完成既有${labels[other[0]]||'工程'}，不另開工地搶料。`;
 if(id){const reason=buildAccess(s,id,s.fac[id].stage+1);if(reason)return reason;}
 if(a.goal==='hotFood'&&s.fac.garden.stage&&s.plot.state==='empty'&&!s.stock.seeds)return s.stock.berries>=s.cap.berries?'缺菜種且野果倉滿；先按需求吃果騰位，再採果取種。':s.wild.berries<1?'缺菜種，等野果再生後採果取種。':'缺菜種，改採野果取一份種子，再回菜園。';
 return null;
}
export function autonomyText(s){
 const a=s.autonomy;if(!a)return '';
 if(a.recess)return `剛完成${GOALS[a.completed.at(-1)]?.name||'一段工作'}；${s.fac.bench.stage?'到長凳坐一會':'在屋前看雲片刻'}，這次休憩結束後再繼續改善生活。`;
 if(!a.goal&&a.deferred.length)return `你已暫緩：${a.deferred.map(id=>GOALS[id].name).join('、')}。可維持生活；允許重新考慮也不會偷偷恢復暫停工程。`;
 if(!a.goal)return s.fac.hut.stage?'目前照顧日常；已完成：'+(a.completed.map(id=>GOALS[id].name).join('、')||'住處'):'正在察看空地；下一步打算安家。';
 const g=GOALS[a.goal],id=goalStep(s),v=id&&s.fac[id].site;
 const next=s.person.hunger<38?'先填飽肚子，再回原打算。':s.person.energy<23?'先歇息，再續作。':planBlock(s)|| (id?v?.paused?'工程由你暫停，等待你恢復。':v?`${labels[id]}：已交木${v.delivered.wood}/${v.need.wood}、搬運中${v.reserved.wood}；施工${v.work.toFixed(1)}/${v.workNeed}。`:`下一步${labels[id]}。`:a.goal==='comfort'?'床已做好，走到床前實際試睡。':s.plot.state==='growing'?'青菜正在生長，期間備柴與照顧自己。':s.stock.meal>0?'熱飯已好，餓時實際用餐。':'播種收菜、備柴，再做熱飯。');
 const why=goalCandidates(s).find(c=>c.id===a.goal)?.reason;
 return `近期打算：${g.name}。${why?why+"。":""}${a.direction!=='auto'?`方向：${DIRECTIONS[a.direction]}。`:''}${id&&id!==g.step(s)?"建造經驗不足，先做仍有用途的設施，靠真施工學會。":""}${next}`;
}

// Remaining costs count delivered and in-transit wood once, never as spendable stock.
export function remainingWood(s,id){
 const routes={comfort:{hut:2,bed:2,workbench:1},porch:{bench:1,flowers:1},pantry:{store:1,kitchen:2}};
 let n=0;for(const [key,target] of Object.entries(routes[id]||{})){for(let stage=s.fac[key].stage+1;stage<=target;stage++)n+=FACILITIES[key].stages[stage].cost.wood;const site=s.fac[key].site;if(site)n-=(site.delivered.wood||0)+(site.reserved.wood||0);}return Math.max(0,n);
}
export function setAutonomyDirection(s,id){if(!s.autonomy||!Object.hasOwn(DIRECTIONS,id))return false;if(s.autonomy.direction!==id){s.autonomy.direction=id;s.autonomy.goal=null;}return true;}
