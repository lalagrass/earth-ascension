// Plans describe intentions. Only the existing executor changes world resources.
export const GOALS={
 shelter:{name:'蓋第一間木屋',done:s=>s.fac.hut.stage>=1,step:()=> 'hut'},
 hotFood:{name:'穩定吃熱飯',done:s=>s.autonomy.warmMeals>0,step:s=>!s.fac.garden.stage?'garden':!s.fac.kitchen.stage?'kitchen':null},
 comfort:{name:'睡得更好',done:s=>s.autonomy.comfortRests>0,step:s=>s.fac.hut.stage<2?'hut':s.fac.bed.stage<1?'bed':!s.fac.workbench.stage?'workbench':s.fac.bed.stage<2?'bed':null},
 porch:{name:'屋前自在休憩',done:s=>s.fac.bench.stage>0&&s.fac.flowers.stage>0,step:s=>!s.fac.bench.stage?'bench':!s.fac.flowers.stage?'flowers':null},
 pantry:{name:'備餐與收納更從容',done:s=>s.fac.store.stage>0&&s.fac.kitchen.stage>=2,step:s=>!s.fac.store.stage?'store':s.fac.kitchen.stage<2?'kitchen':null},
};
export const PREFERENCES={quiet:{comfort:6,porch:5,pantry:2},sociable:{comfort:4,porch:6,pantry:2},diligent:{comfort:5,porch:2,pantry:6}};
export const freshAutonomy = () => ({version:1, goal:null, since:0, completed:[], warmMeals:0, comfortRests:0});
export function validAutonomy(a,mode,t=Infinity){
 return a===null || mode==='solo' && a && a.version===1 &&
 (a.goal===null||Object.hasOwn(GOALS,a.goal)) && Number.isFinite(a.since) && a.since>=0 && a.since<=t &&
 Array.isArray(a.completed) && a.completed.length<=Object.keys(GOALS).length && new Set(a.completed).size===a.completed.length && a.completed.every(x=>Object.hasOwn(GOALS,x)) && Number.isSafeInteger(a.warmMeals) && a.warmMeals>=0 && Number.isSafeInteger(a.comfortRests) && a.comfortRests>=0;
}
export function goalCandidates(s){return Object.entries(PREFERENCES[s.person.personality]).filter(([id])=>!GOALS[id].done(s)).map(([id,score])=>({id,score,reason:`${{quiet:'喜靜',sociable:'開朗',diligent:'勤勞'}[s.person.personality]}偏好：${GOALS[id].name}`})).sort((a,b)=>b.score-a.score);}
export function advanceAutonomy(s,api){
 const a=s.autonomy;if(!a)return;
 if(a.goal&&GOALS[a.goal].done(s)){if(!a.completed.includes(a.goal))a.completed.push(a.goal);a.goal=null;}
 if(!a.goal){a.goal=!s.fac.hut.stage?'shelter':a.warmMeals===0?'hotFood':goalCandidates(s)[0]?.id||null;a.since=s.t;}
 if(!a.goal)return;
 const id=GOALS[a.goal].step(s);
 if(id&&!s.fac[id].site&&!Object.values(s.fac).some(f=>f.site))api.start(id);
 if(a.goal==='comfort'&&!id&&!a.comfortRests)return 'rest';
}
const labels={hut:'修屋',garden:'開菜園',kitchen:'搭灶／改善灶具',bed:'製作床鋪',workbench:'搭木作台',store:'搭儲物棚',bench:'做屋前長凳',flowers:'整理庭院花叢'};
export function autonomyText(s){
 const a=s.autonomy;if(!a)return '';
 if(!a.goal)return s.fac.hut.stage?'目前照顧日常；已完成：'+(a.completed.map(id=>GOALS[id].name).join('、')||'住處'):'正在察看空地；下一步打算安家。';
 const g=GOALS[a.goal],id=g.step(s),v=id&&s.fac[id].site;
 const next=s.person.hunger<38?'先填飽肚子，再回原打算。':s.person.energy<23?'先歇息，再續作。':id?v?.paused?'工程由你暫停，等待你恢復。':v?`${labels[id]}：已交木${v.delivered.wood}/${v.need.wood}、搬運中${v.reserved.wood}；施工${v.work.toFixed(1)}/${v.workNeed}。`:`下一步${labels[id]}。`:a.goal==='comfort'?'床已做好，走到床前實際試睡。':s.plot.state==='growing'?'青菜正在生長，期間備柴與照顧自己。':s.stock.meal>0?'熱飯已好，餓時實際用餐。':'播種收菜、備柴，再做熱飯。';
 return `近期打算：${g.name}。${next}`;
}
