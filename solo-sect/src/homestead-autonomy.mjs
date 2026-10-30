import {LOOK_OWNERS} from './homestead-autonomy-look.mjs';
import {freshLeisure,validLeisure} from './homestead-autonomy-leisure.mjs';
import {freshTastes,validTastes} from './homestead-autonomy-meals.mjs';
// Runtime-only rule lookup, like the existing display adapters; no top-level access.
import {FACILITIES} from './homestead.mjs';
import {skillLevel} from './homestead-skills.mjs';
import {buildAccess,BUILD_GATES,recipeAccess,preparedCount} from './homestead-content.mjs';
// Plans describe intentions. Only the existing executor changes world resources.
export const GOALS={
 shelter:{name:'蓋第一間木屋',done:s=>s.fac.hut.stage>=1,step:()=> 'hut'},
 hotFood:{name:'穩定吃熱飯',done:s=>s.autonomy.warmMeals>0&&s.fac.garden.stage>0&&s.fac.kitchen.stage>0,step:s=>!s.fac.garden.stage?'garden':!s.fac.kitchen.stage?'kitchen':null},
 comfort:{name:'睡得更好',done:s=>s.autonomy.comfortRests>0,step:s=>s.fac.hut.stage<2?'hut':s.fac.bed.stage<1?'bed':!s.fac.workbench.stage?'workbench':s.fac.bed.stage<2?'bed':null},
 porch:{name:'屋前自在休憩',done:s=>s.fac.bench.stage>0&&s.fac.flowers.stage>0,step:s=>!s.fac.bench.stage?'bench':!s.fac.flowers.stage?'flowers':null},
 personalize:{name:'小家有自己的樣貌',done:s=>['resident','player'].includes(s.autonomy.lookOwnership),step:()=>null},
 herbs:{name:'種出自己的藥草',done:s=>s.autonomy.herbHarvests>0&&s.fac.herbGarden.stage>0,step:s=>!s.fac.herbGarden.stage?'herbGarden':null},
 stew:{name:'學做並嚐到家常燉菜',done:s=>s.autonomy.tastes.stew>0,step:s=>s.fac.kitchen.stage<2?'kitchen':null},
 pantry:{name:'備餐與收納更從容',done:s=>s.fac.store.stage>0&&s.fac.kitchen.stage>=2,step:s=>!s.fac.store.stage?'store':s.fac.kitchen.stage<2?'kitchen':null},
};
export const DIRECTIONS={auto:'自行打算',steady:'先穩定吃住',comfort:'住得舒服',frugal:'少耗材料'};
export const PREFERENCES={quiet:{comfort:6,porch:5,pantry:2},sociable:{comfort:4,porch:6,pantry:2},diligent:{comfort:5,porch:2,pantry:6}};
export const freshAutonomy = () => ({version:1, goal:null, since:0,waiting:null,replanAt:0, completed:[], warmMeals:0, comfortRests:0,herbHarvests:0,careUses:0,lookOwnership:'unclaimed',recess:false, breaks:0,direction:'auto',deferred:[],limit:2,interestLimit:2,journal:[],tastes:freshTastes(),leisure:freshLeisure(),experience:{hunger:0,fatigue:0,effort:0,lastWork:0}});
export function validAutonomy(a,mode,t=Infinity,work=Infinity){
 return a===null || mode==='solo' && a && a.version===1 &&
 (a.goal===null||Object.hasOwn(GOALS,a.goal)) && validWaiting(a,t) && Number.isFinite(a.since) && a.since>=0 && a.since<=t &&
 Array.isArray(a.completed) && a.completed.length<=Object.keys(GOALS).length && new Set(a.completed).size===a.completed.length && a.completed.every(x=>Object.hasOwn(GOALS,x)) && Number.isSafeInteger(a.warmMeals) && a.warmMeals>=0 && Number.isSafeInteger(a.comfortRests) && a.comfortRests>=0 && Number.isInteger(a.herbHarvests)&&a.herbHarvests>=0&&a.herbHarvests<=100 && Number.isInteger(a.careUses)&&a.careUses>=0&&a.careUses<=100 && LOOK_OWNERS.includes(a.lookOwnership) && validLeisure(a.leisure,t)&&[2,3].includes(a.interestLimit)&&validTastes(a.tastes)&&[2,3].includes(a.limit)&&Array.isArray(a.journal)&&a.journal.length<=a.completed.length&&new Set(a.journal.map(x=>x?.goal)).size===a.journal.length&&a.journal.every(x=>x&&a.completed.includes(x.goal)&&(x.at===null||Number.isFinite(x.at)&&x.at>=0&&x.at<=t))&&typeof a.direction==='string'&&Object.hasOwn(DIRECTIONS,a.direction)&&Array.isArray(a.deferred)&&a.deferred.length<=Object.keys(GOALS).length&&new Set(a.deferred).size===a.deferred.length&&a.deferred.every(id=>Object.hasOwn(GOALS,id))&&typeof a.recess==='boolean' && Number.isSafeInteger(a.breaks)&&a.breaks>=0 && a.experience && ['hunger','fatigue','effort'].every(k=>Number.isFinite(a.experience[k])&&a.experience[k]>=0&&a.experience[k]<=3) && Number.isFinite(a.experience.lastWork)&&a.experience.lastWork>=0&&a.experience.lastWork<=work;
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
 if(a.goal==='stew'&&!['auto','stew'].includes(s.mealStyle))a.goal=null;
 if(a.waiting?.goal==='stew'&&!['auto','stew'].includes(s.mealStyle))a.waiting=null;
 if(a.goal==='personalize'&&a.lookOwnership==='preserved')a.goal=null;
 if(a.goal==='herbs'&&((s.herbPlot.state==='empty'&&s.stock.herbs>3)||(s.herbPlot.state==='ripe'&&!api.can('herbFarm')&&s.stock.herbs>3)))a.goal=null;
 if(a.waiting&&(a.deferred.includes(a.waiting.goal)||GOALS[a.waiting.goal].done(s)))a.waiting=null;
 const finished=a.goal&&GOALS[a.goal].done(s);
 for(const [goal,g] of Object.entries(GOALS))if(g.done(s)&&!a.completed.includes(goal)){a.completed.push(goal);a.journal.push({goal,at:s.t});}
 if(finished){a.goal=null;a.recess=true;}
 if(a.recess)return 'leisure';
 if(!a.goal&&a.waiting&&!waitingReason(s,a.waiting.goal)){a.goal=a.waiting.goal;a.waiting=null;a.since=s.t;}
 if(!a.goal){a.goal=chooseDevelopment(s,api,!!a.waiting);a.since=s.t;}
 if(a.goal&&waitingReason(s,a.goal)&&s.t>=a.replanAt){
  a.replanAt=s.t+15;
  if(a.waiting&&!waitingReason(s,a.waiting.goal)){const old=a.goal;a.goal=a.waiting.goal;a.waiting={goal:old,since:s.t};a.since=s.t;}
  else if(!a.waiting){const next=chooseDevelopment(s,api,true,a.goal);if(next){a.waiting={goal:a.goal,since:s.t};a.goal=next;a.since=s.t;}}
 }
 if(!a.goal)return;
 const id=goalStep(s);
 if(id&&!s.fac[id].site&&!planBlock(s))api.start(id);
 if(a.goal==='hotFood'&&s.fac.garden.stage&&s.plot.state==='empty'&&!s.stock.seeds&&api.can('forage'))return 'forage';
 if(a.goal==='comfort'&&!id&&!a.comfortRests)return 'rest';
 if(a.goal==='personalize'&&a.lookOwnership==='unclaimed'&&s.fac.hut.stage)return 'settle';
 if(a.goal==='herbs'&&s.fac.herbGarden.stage){if(!s.stock.herbs&&s.herbPlot.state==='empty'&&api.can('herbal'))return 'herbal';if(api.can('herbFarm'))return 'herbFarm';}
}
const labels={herbGarden:'開藥圃',hut:'修屋',garden:'開菜園',kitchen:'搭灶／改善灶具',bed:'製作床鋪',workbench:'搭木作台',store:'搭儲物棚',bench:'做屋前長凳',flowers:'整理庭院花叢'};
// A missing skill is solved only by other still-useful, real construction.
export function goalStep(s,goal=s.autonomy?.goal){
 if(!goal)return null;
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
 if(!a.goal&&a.waiting)return waitingText(s)+' 先維持吃睡與可用的休憩。';
 if(a.recess)return `剛完成${GOALS[a.completed.at(-1)]?.name||'一段工作'}；${s.fac.bench.stage?'到長凳坐一會':'在屋前看雲片刻'}，這次休憩結束後再繼續改善生活。`;
 if(!a.goal&&a.deferred.length)return `你已暫緩：${a.deferred.map(id=>GOALS[id].name).join('、')}。可維持生活；允許重新考慮也不會偷偷恢復暫停工程。`;
 if(!a.goal&&improvementCount(s)>=a.limit)return '已安居：主要生活打算完成，維持吃睡與喜歡的休憩。還有未做的可選改善，但不必蓋滿；想再經營可改生活方向或自行預覽工程。';
 if(!a.goal)return s.fac.hut.stage?'目前照顧日常；已完成：'+(a.completed.map(id=>GOALS[id].name).join('、')||'住處'):'正在察看空地；下一步打算安家。';
 const g=GOALS[a.goal];if(g.done(s))return `近期打算：${g.name}已達成，下一次決策會確認成果並再打算；暫停時不推進。`;
 const id=goalStep(s),v=id&&s.fac[id].site;
 const next=s.person.hunger<38?'先填飽肚子，再回原打算。':s.person.energy<23?'先歇息，再續作。':planBlock(s)|| (id?v?.paused?'工程由你暫停，等待你恢復。':v?`${labels[id]}：已交木${v.delivered.wood}/${v.need.wood}、搬運中${v.reserved.wood}；施工${v.work.toFixed(1)}/${v.workNeed}。`:`下一步${labels[id]}。`:a.goal==='comfort'?'床已做好，走到床前實際試睡。':a.goal==='personalize'?'到屋前挑選喜歡的家名與既有配色；不花材料，不改休息與技能。':a.goal==='herbs'?s.herbPlot.state==='growing'?'草藥正在生長，等待成熟；照顧吃睡。':s.herbPlot.state==='ripe'?'藥草已熟，等收成空位，真收穫才算完成。':s.stock.herbs?'用手邊一份草藥作插穗。':'先到草藥坡採一份，搬回來作插穗。':a.goal==='stew'?'改良灶已好，照常補真正需要的飯；自然學會後實做燉菜，不為熟練浪費食物。':s.plot.state==='growing'?'青菜正在生長，期間備柴與照顧自己。':s.stock.meal>0?'熱飯已好，餓時實際用餐。':'播種收菜、備柴，再做熱飯。');
 const why=goalCandidates(s).find(c=>c.id===a.goal)?.reason;
 return `近期打算：${g.name}。${why?why+"。":""}${a.direction!=='auto'?`方向：${DIRECTIONS[a.direction]}。`:''}${id&&id!==g.step(s)?"建造經驗不足，先做仍有用途的設施，靠真施工學會。":""}${next}`;
}

// Remaining costs count delivered and in-transit wood once, never as spendable stock.
export function remainingWood(s,id){
 const routes={comfort:{hut:2,bed:2,workbench:1},porch:{bench:1,flowers:1},pantry:{store:1,kitchen:2}};
 let n=0;for(const [key,target] of Object.entries(routes[id]||{})){for(let stage=s.fac[key].stage+1;stage<=target;stage++)n+=FACILITIES[key].stages[stage].cost.wood;const site=s.fac[key].site;if(site)n-=(site.delivered.wood||0)+(site.reserved.wood||0);}return Math.max(0,n);
}
export function setAutonomyDirection(s,id){if(!s.autonomy||!Object.hasOwn(DIRECTIONS,id))return false;if(s.autonomy.direction!==id){s.autonomy.direction=id;if(improvementCount(s)>=s.autonomy.limit)s.autonomy.limit=3;if(interestCount(s)>=s.autonomy.interestLimit)s.autonomy.interestLimit=3;s.autonomy.goal=null;s.autonomy.waiting=null;}return true;}

export const improvementCount=s=>['comfort','porch','pantry'].filter(id=>GOALS[id].done(s)).length;
export function lifeStage(s){if(!s.autonomy)return '原生活模式';if(!s.fac.hut.stage)return '落腳';if(!s.autonomy.warmMeals)return '溫飽';const n=improvementCount(s);return n>=s.autonomy.limit&&(!s.autonomy.goal||!['shelter','hotFood','comfort','porch','pantry'].includes(s.autonomy.goal))?'安居':n?'自己的小家':'改善';}
export function autonomyHistory(s){return s.autonomy.journal.map(x=>`${GOALS[x.goal].name}（${x.at===null?'舊進度，未記時':`第${1+Math.floor(x.at/240)}日首次確認・${x.at.toFixed(1)}世界秒`}）`).join(' → ');}

export const interestCount=s=>['stew','herbs','personalize'].filter(id=>GOALS[id].done(s)).length;
export function interestCandidates(s){
 const a=s.autonomy,p=s.person.personality,result=[];
 if(!a.deferred.includes('stew')&&!GOALS.stew.done(s)&&['auto','stew'].includes(s.mealStyle))result.push({id:'stew',score:p==='sociable'?6:p==='diligent'?5:4,reason:'想運用學會的料理，嚐一份更飽足的餐'});
 if(!a.deferred.includes('herbs')&&!GOALS.herbs.done(s)&&s.stock.herbs<=3)result.push({id:'herbs',score:p==='diligent'?7:p==='quiet'?6:4,reason:'想種出自己可用的草藥，不只去坡上採'});
 if(!a.deferred.includes('personalize')&&a.lookOwnership==='unclaimed')result.push({id:'personalize',score:p==='sociable'?8:p==='quiet'?5:3,reason:'想替自己的小家選一個樣子'});
 for(const c of result)if(a.direction==='steady'&&c.id==='stew'||a.direction==='comfort'&&c.id==='herbs'||a.direction==='frugal'&&c.id==='personalize')c.score+=12;
 return result.sort((a,b)=>b.score-a.score);
}

function validWaiting(a,t){return Number.isFinite(a.replanAt)&&a.replanAt>=0&&a.replanAt<=t+15&&(a.waiting===null||a.waiting&&Object.hasOwn(GOALS,a.waiting.goal)&&a.waiting.goal!==a.goal&&Number.isFinite(a.waiting.since)&&a.waiting.since>=0&&a.waiting.since<=t&&!a.deferred?.includes(a.waiting.goal));}
export function waitingReason(s,goal){
 if(!goal||GOALS[goal].done(s))return null;const id=goalStep(s,goal);
 if(id&&s.fac[id].site?.paused)return '工程由你暫停，須由你恢復';
 if(id){const gate=buildAccess(s,id,s.fac[id].stage+1);if(gate)return gate;}
 if(goal==='herbs'&&s.fac.herbGarden.stage&&s.herbPlot.state==='growing')return '藥苗正在生長';
 if(goal==='stew'&&!id){if(s.stock.stew>0&&s.person.hunger>=38)return '燉菜已備好，等真正需要用餐';if(preparedCount(s)>=2)return recipeAccess(s,'stew')?'已有飯可吃，等日常料理自然熟練，不為XP加做':'已有夠用飯菜，等下次需要補餐再試新做法';}
 return null;
}
function productive(s,goal,api){
 if(waitingReason(s,goal))return false;const id=goalStep(s,goal);
 if(id)return !s.fac[id].site?.paused&&!buildAccess(s,id,s.fac[id].stage+1);
 if(goal==='personalize')return s.autonomy.lookOwnership==='unclaimed';
 if(goal==='herbs')return api.can('herbFarm')||!s.stock.herbs&&api.can('herbal');
 if(goal==='comfort')return true;
 if(goal==='stew'||goal==='hotFood')return preparedCount(s)<2&&(api.can('cook')||api.can('farm')||s.stock.wood<2&&api.can('chop'));
 return false;
}
function chooseDevelopment(s,api,requireProductive=false,reserve=null){
 const a=s.autonomy,held=reserve||a.waiting?.goal,allowed=id=>id!==held&&!a.deferred.includes(id)&&(!requireProductive||productive(s,id,api));
 if(!s.fac.hut.stage)return allowed('shelter')?'shelter':null;
 if(!GOALS.hotFood.done(s)&&allowed('hotFood'))return 'hotFood';
 const houseReserve=held&&['comfort','porch','pantry'].includes(held)&&!GOALS[held].done(s)?1:0,interestReserve=held&&['stew','herbs','personalize'].includes(held)&&!GOALS[held].done(s)?1:0;
 if(improvementCount(s)+houseReserve<a.limit){const next=goalCandidates(s).find(c=>allowed(c.id));if(next)return next.id;}
 if(GOALS.hotFood.done(s)&&interestCount(s)+interestReserve<a.interestLimit){const next=interestCandidates(s).find(c=>allowed(c.id));if(next)return next.id;}
 return null;
}
export function waitingText(s){const w=s.autonomy?.waiting;if(!w)return '';if(GOALS[w.goal].done(s))return `暫候打算：${GOALS[w.goal].name}已達成，下一次決策確認並移除暫候。`;return `暫候打算：${GOALS[w.goal].name}；${waitingReason(s,w.goal)||'條件已恢復，這一件告段落後接回'}。不會自動恢復你暫停的工地。`;}
