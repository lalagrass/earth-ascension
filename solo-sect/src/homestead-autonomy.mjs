// Plans describe intentions. Only the existing executor changes world resources.
export const freshAutonomy = () => ({version:1, goal:null, since:0, completed:[]});
export function validAutonomy(a,mode,t=Infinity){
 return a===null || mode==='solo' && a && a.version===1 &&
 [null,'shelter'].includes(a.goal) && Number.isFinite(a.since) && a.since>=0 && a.since<=t &&
 Array.isArray(a.completed) && a.completed.length<=1 && new Set(a.completed).size===a.completed.length && a.completed.every(x=>x==='shelter');
}
export function advanceAutonomy(s,api){
 const a=s.autonomy;if(!a)return;
 if(a.goal==='shelter'&&s.fac.hut.stage>=1){a.completed.push('shelter');a.goal=null;}
 if(!a.goal&&!s.fac.hut.stage){a.goal='shelter';a.since=s.t;}
 if(a.goal==='shelter'&&!s.fac.hut.site&&!s.fac.hut.stage)api.start('hut');
}
export function autonomyText(s){
 const a=s.autonomy;if(!a)return '';
 if(a.goal==='shelter'){
  const v=s.fac.hut.site;
  return `近期打算：蓋第一間木屋。${s.person.hunger<38?'先填飽肚子，再回來安家。':s.person.energy<23?'先歇息，再回來安家。':v?.paused?'木屋工程由你暫停，等你恢復。':v?`已交木${v.delivered.wood}/${v.need.wood}、搬運中${v.reserved.wood}；施工${v.work.toFixed(1)}/${v.workNeed}。`:'下一步立木屋藍圖。'}`;
 }
 return s.fac.hut.stage?'已完成打算：第一間木屋；目前照顧日常。':'正在察看空地；下一步打算安家。';
}
