// Presentation facts only. No clock, material mutations or planner.
import{FACILITIES,PLACES,blueprintReason}from'./homestead.mjs';
import{buildingInfo}from'./homestead-view.mjs';
export const PLOT_BOUNDS={hut:[350,113,187,172],garden:[210,127,120,72],herbGarden:[80,58,110,66],kitchen:[570,320,70,65],store:[493,410,124,87],bench:[318,387,68,36],flowers:[297,274,87,39],workbench:[637,437,78,51],bed:[418,203,48,26]};
export function blueprintInfo(s,id,expectedStage=s.fac[id]?.stage){
 if(!Object.hasOwn(PLOT_BOUNDS,id))return{ok:false,reason:'沒有這個固定地塊'};
 const st=s.fac[id],r=FACILITIES[id].stages[st.stage+1],reason=expectedStage!==st.stage?'設施已變更，請重新預覽':blueprintReason(s,id);
 const b=buildingInfo(s,id);
 return{ok:!reason,reason:reason||'',id,name:r?.name||FACILITIES[id].stages[st.stage].name,bounds:PLOT_BOUNDS[id],point:PLACES[id],cost:r?.cost?.wood||0,available:s.stock.wood,shortage:b.shortage,effect:b.next||b.current,craft:!!r?.craft};
}
export function constructionFacts(s,id){
 const f=s.fac[id],v=f?.site;if(!v)return{phase:f?.stage?'done':'empty',name:f?.stage?'已完成':'未建造',progress:0};
 const progress=Math.min(1,v.work/v.workNeed),phase=v.work===0?'materials':progress<1/3?'foundation':progress<2/3?'frame':'roof';
 return{phase,name:{materials:'立樁備料',foundation:'鋪設地基',frame:'豎起骨架',roof:'上樑覆頂'}[phase],progress,delivered:v.delivered.wood,reserved:v.reserved.wood,need:v.need.wood,paused:v.paused,work:v.work,workNeed:v.workNeed};
}
