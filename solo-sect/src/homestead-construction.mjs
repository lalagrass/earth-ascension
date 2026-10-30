// Presentation facts only. No clock, material mutations or planner.
import{at}from'./homestead-living.mjs';
import{FACILITIES,PLACES,blueprintReason,buildDestination}from'./homestead.mjs';
import{buildingInfo,activityText}from'./homestead-view.mjs';
export const PLOT_BOUNDS={fence:[780,270,30,150],hut:[350,113,187,172],garden:[210,127,120,72],herbGarden:[80,58,110,66],kitchen:[570,320,70,65],store:[493,410,124,87],bench:[318,387,68,36],flowers:[297,274,87,39],workbench:[637,437,78,51],bed:[418,203,48,26]};
export function blueprintInfo(s,id,expectedStage=s.fac[id]?.stage){
 if(!Object.hasOwn(PLOT_BOUNDS,id))return{ok:false,reason:'沒有這個固定地塊'};
 const st=s.fac[id],r=FACILITIES[id].stages[st.stage+1],reason=expectedStage!==st.stage?'設施已變更，請重新預覽':blueprintReason(s,id);
 const b=buildingInfo(s,id);
 return{ok:!reason,reason:reason||'',id,name:r?.name||FACILITIES[id].stages[st.stage].name,bounds:PLOT_BOUNDS[id],point:PLACES[id],cost:r?.cost?.wood||0,available:s.stock.wood,shortage:b.shortage,effect:b.next||b.current,craft:!!r?.craft};
}
export function constructionFacts(s,id){
 const f=s.fac[id],v=f?.site;if(!v)return{phase:f?.stage?'done':'empty',name:f?.stage?'已完成':'未建造',progress:0};
 const progress=Math.min(1,v.work/v.workNeed),phase=v.work===0?'materials':progress<1/3?'foundation':progress<2/3?'frame':'roof';
 const recipe=FACILITIES[id].stages[f.stage+1],label=id==='hut'&&!f.stage?{materials:'立樁備料',foundation:'鋪設地基',frame:'豎起骨架',roof:'上樑覆頂'}[phase]:recipe?.craft&&v.crafted<recipe.craft?(v.delivered.wood<v.need.wood?'搬料到木作台':'木作台加工'):recipe?.craft?'搬回與安裝':v.work===0?'備料／待施工':'施工與收尾';
 return{phase,name:label,progress,delivered:v.delivered.wood,reserved:v.reserved.wood,need:v.need.wood,paused:v.paused,work:v.work,workNeed:v.workNeed};
}
export function inspectionBounds(s,id){const f=s.fac[id],r=FACILITIES[id]?.stages[f?.stage+1];return r?.craft&&f.site?.crafted<r.craft?PLOT_BOUNDS.workbench:PLOT_BOUNDS[id];}
export function plotAt(s,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))return null;
 return Object.keys(PLOT_BOUNDS).filter(id=>s.fac[id]?.stage||s.fac[id]?.site).filter(id=>{const[a,b,w,h]=inspectionBounds(s,id);return x>=a&&x<=a+w&&y>=b&&y<=b+h;}).sort((a,b)=>{const aa=inspectionBounds(s,a),bb=inspectionBounds(s,b);return Number(!!s.fac[b].site)-Number(!!s.fac[a].site)||aa[2]*aa[3]-bb[2]*bb[3];})[0]||null;
}
export function inspectionInfo(s,id){
 if(!Object.hasOwn(PLOT_BOUNDS,id))return null;
 const f=s.fac[id],v=f.site,b=buildingInfo(s,id),t=s.person.task,r=FACILITIES[id].stages[f.stage+1];
 const name=v?r.name:FACILITIES[id].stages[f.stage].name;
 if(!v)return{id,name,text:`${name}：${b.current||'尚未建造'}。${f.stage?'可繼續生活。':blueprintReason(s,id)||'可從建造卡預覽並立藍圖。'}`,site:false};
 const facts=constructionFacts(s,id);let status;
 if(v.paused)status='工程已暫停；材料與已施工進度保留，按繼續才會復工。';
 else if(t?.act==='build'&&t.place===id)status={fetch:'主角正前往住處取料。',deliver:'主角正搬木料到這個工地。',go:t.step==='craft'?'主角正前往木作台加工。':t.step==='pickup'?'主角正去拿已做好的部件。':t.step==='install'?(at({pos:s.fac.bed.site.assemblyAt},PLACES.bed)?'主角正回屋接續安裝；部件已在床位。':'主角正搬部件到屋內安裝。'):'主角正前往這個工作點。',do:t.step==='craft'?'主角正在木作台加工部件。':'主角正在此處施工／安裝。'}[t.phase];
 else if(t?.act==='rest'||t?.act==='eat')status=`主角正在${t.act==='rest'?'休息':'吃飯'}；工程等候，不會自行推進。`;
 else if(b.missing)status=b.shortage?`材料未齊，庫存尚缺${b.shortage}木；主角會按生存／指派／工程意圖安排。`:'材料未齊，可從共用庫存接續搬料；目前尚未全數保留。';
 else status='材料已齊；等待主角完成目前活動並接續工程。';
 if(t&&!(t.act==='build'&&t.place===id)&&!['rest','eat'].includes(t.act))status=`目前主角${activityText(s)}；此工程等候。${status}`;
 return{id,name,site:true,paused:v.paused,phase:facts.phase,text:`${name}：${facts.name}。已交${v.delivered.wood}/${v.need.wood}木，在途${v.reserved.wood}木，待運${b.missing}木；${r.craft?`加工${v.crafted}/${r.craft}，`:''}施工／安裝${Number(v.work.toFixed(2))}/${v.workNeed}。${status}建好後：${b.next}。`};
}

export function constructionRoute(s,id){
 const t=s.person.task,v=s.fac[id]?.site;
 if(!v||v.paused||t?.act!=='build'||t.place!==id)return null;
 const to=buildDestination(s,t);if(!to)return null;
 if(t.phase==='deliver'&&(!s.person.carry||s.person.carry.origin!=='site'))return null;
 const text=t.phase==='fetch'?'前往住處取料（尚未拿料）':t.phase==='deliver'?`正運來${s.person.carry.amount}木；已離庫，交到後才算已交`:t.step==='craft'?'前往木作台加工':t.step==='pickup'?'前往拿已完成部件':t.step==='install'?(at({pos:v.assemblyAt},PLACES.bed)?'前往屋內接續安裝（部件已在床位）':'正把已完成部件搬回屋內安裝'):'前往施工點';
 return{from:[...s.person.pos],to:[...to],text};
}
export function siteMaterials(s,id){const v=s.fac[id]?.site;return v?{available:s.stock.wood,delivered:v.delivered.wood,reserved:v.reserved.wood,needed:Math.max(0,v.need.wood-v.delivered.wood-v.reserved.wood)}:null;}
export function siteStages(s,id){
 const f=s.fac[id],v=f?.site;if(!f)return null;if(!v&&!f.stage)return{labels:['尚未立藍圖'],index:0};
 if(id==='hut'&&(!f.stage||!v))return{labels:['立樁備料','地基','骨架','屋頂','完工'],index:v?{materials:0,foundation:1,frame:2,roof:3}[constructionFacts(s,id).phase]:f.stage?4:0};
 const r=FACILITIES[id].stages[f.stage+1];
 if(v&&r?.craft)return{labels:['搬料到木作台','台前加工','搬回與安裝','完工'],index:v.delivered.wood<v.need.wood?0:v.crafted<r.craft?1:2};
 return{labels:['備料','施工／整理','完工'],index:v?v.work>0?1:0:f.stage?2:0};
}
