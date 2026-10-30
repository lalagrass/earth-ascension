// Plans describe intentions. Only the existing executor changes world resources.
export const freshAutonomy = () => ({version:1, goal:null, since:0, completed:[], warmMeals:0});
export function validAutonomy(a,mode,t=Infinity){
 return a===null || mode==='solo' && a && a.version===1 &&
 [null,'shelter','hotFood'].includes(a.goal) && Number.isFinite(a.since) && a.since>=0 && a.since<=t &&
 Array.isArray(a.completed) && a.completed.length<=2 && new Set(a.completed).size===a.completed.length && a.completed.every(x=>['shelter','hotFood'].includes(x)) && Number.isSafeInteger(a.warmMeals) && a.warmMeals>=0;
}
export function advanceAutonomy(s,api){
 const a=s.autonomy;if(!a)return;
 const done=a.goal==='shelter'?s.fac.hut.stage>=1:a.goal==='hotFood'?a.warmMeals>0:false;
 if(done){if(!a.completed.includes(a.goal))a.completed.push(a.goal);a.goal=null;}
 if(!a.goal){a.goal=!s.fac.hut.stage?'shelter':a.warmMeals===0?'hotFood':null;a.since=s.t;}
 let id=null;
 if(a.goal==='shelter')id='hut';
 if(a.goal==='hotFood')id=!s.fac.garden.stage?'garden':!s.fac.kitchen.stage?'kitchen':null;
 if(id&&!s.fac[id].site&&!Object.values(s.fac).some(f=>f.site))api.start(id);
}
export function autonomyText(s){
 const a=s.autonomy;if(!a)return '';
 if(a.goal==='hotFood'){const id=!s.fac.garden.stage?'garden':!s.fac.kitchen.stage?'kitchen':null;const v=id&&s.fac[id].site;return `近期打算：穩定吃熱飯。${id?`${id==='garden'?'先開菜園':'接著搭灶'}${v?.paused?'（由你暫停）':v?`，已交木${v.delivered.wood}/${v.need.wood}`:'，等下一次決策立計畫'}`:s.plot.state==='growing'?'青菜正在生長；期間備柴與照顧自己。':s.stock.meal>0?'熱飯已做好，餓時實際用餐。':'播種收菜、備柴，再做熱飯。'}`;}
 if(a.goal==='shelter'){
  const v=s.fac.hut.site;
  return `近期打算：蓋第一間木屋。${s.person.hunger<38?'先填飽肚子，再回來安家。':s.person.energy<23?'先歇息，再回來安家。':v?.paused?'木屋工程由你暫停，等你恢復。':v?`已交木${v.delivered.wood}/${v.need.wood}、搬運中${v.reserved.wood}；施工${v.work.toFixed(1)}/${v.workNeed}。`:'下一步立木屋藍圖。'}`;
 }
 return s.fac.hut.stage?'已完成打算：第一間木屋；目前照顧日常。':'正在察看空地；下一步打算安家。';
}
