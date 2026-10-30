// Plans describe intentions. Only the existing executor changes world resources.
export const freshAutonomy = () => ({version:1, goal:null, since:0, completed:[], warmMeals:0, comfortRests:0});
export function validAutonomy(a,mode,t=Infinity){
 return a===null || mode==='solo' && a && a.version===1 &&
 [null,'shelter','hotFood','comfort'].includes(a.goal) && Number.isFinite(a.since) && a.since>=0 && a.since<=t &&
 Array.isArray(a.completed) && a.completed.length<=3 && new Set(a.completed).size===a.completed.length && a.completed.every(x=>['shelter','hotFood','comfort'].includes(x)) && Number.isSafeInteger(a.warmMeals) && a.warmMeals>=0 && Number.isSafeInteger(a.comfortRests) && a.comfortRests>=0;
}
export function advanceAutonomy(s,api){
 const a=s.autonomy;if(!a)return;
 const done=a.goal==='shelter'?s.fac.hut.stage>=1:a.goal==='hotFood'?a.warmMeals>0:a.goal==='comfort'?a.comfortRests>0:false;
 if(done){if(!a.completed.includes(a.goal))a.completed.push(a.goal);a.goal=null;}
 if(!a.goal){a.goal=!s.fac.hut.stage?'shelter':a.warmMeals===0?'hotFood':a.comfortRests===0?'comfort':null;a.since=s.t;}
 let id=null;
 if(a.goal==='shelter')id='hut';
 if(a.goal==='hotFood')id=!s.fac.garden.stage?'garden':!s.fac.kitchen.stage?'kitchen':null;
 if(a.goal==='comfort')id=s.fac.hut.stage<2?'hut':s.fac.bed.stage<1?'bed':!s.fac.workbench.stage?'workbench':s.fac.bed.stage<2?'bed':null;
 if(id&&!s.fac[id].site&&!Object.values(s.fac).some(f=>f.site))api.start(id);
 if(a.goal==='comfort'&&!id&&!a.comfortRests)return 'rest';
}
export function autonomyText(s){
 const a=s.autonomy;if(!a)return '';
 if(a.goal==='comfort'){const id=s.fac.hut.stage<2?'hut':s.fac.bed.stage<1?'bed':!s.fac.workbench.stage?'workbench':s.fac.bed.stage<2?'bed':null;return `近期打算：睡得更好。${id?`下一步${{hut:'修繕小屋',bed:s.fac.bed.stage?'製作舒適床':'鋪設木床',workbench:'搭木作台'}[id]}${s.fac[id].site?.paused?'（由你暫停，待你恢復）':''}；吃睡後繼續。`:'舒適床已好，等真正使用歇息再驗收。'}`;}
 if(a.goal==='hotFood'){const id=!s.fac.garden.stage?'garden':!s.fac.kitchen.stage?'kitchen':null;const v=id&&s.fac[id].site;return `近期打算：穩定吃熱飯。${id?`${id==='garden'?'先開菜園':'接著搭灶'}${v?.paused?'（由你暫停）':v?`，已交木${v.delivered.wood}/${v.need.wood}`:'，等下一次決策立計畫'}`:s.plot.state==='growing'?'青菜正在生長；期間備柴與照顧自己。':s.stock.meal>0?'熱飯已做好，餓時實際用餐。':'播種收菜、備柴，再做熱飯。'}`;}
 if(a.goal==='shelter'){
  const v=s.fac.hut.site;
  return `近期打算：蓋第一間木屋。${s.person.hunger<38?'先填飽肚子，再回來安家。':s.person.energy<23?'先歇息，再回來安家。':v?.paused?'木屋工程由你暫停，等你恢復。':v?`已交木${v.delivered.wood}/${v.need.wood}、搬運中${v.reserved.wood}；施工${v.work.toFixed(1)}/${v.workNeed}。`:'下一步立木屋藍圖。'}`;
 }
 return s.fac.hut.stage?'已完成打算：第一間木屋；目前照顧日常。':'正在察看空地；下一步打算安家。';
}
