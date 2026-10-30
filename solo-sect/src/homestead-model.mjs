// Display-only snapshot. Never pass this to the simulation or storage.
import{FACILITIES}from'./homestead.mjs';import{PLOT_BOUNDS}from'./homestead-construction.mjs';
export function facilityModelView(s,id,after=false,expectedStage=s.fac[id]?.stage){
 if(!Object.hasOwn(PLOT_BOUNDS,id)||s.fac[id].stage!==expectedStage)return null;
 const stage=expectedStage+(after?1:0);if(!FACILITIES[id].stages[stage])return null;
 const view=structuredClone(s);view.kind='homestead-preview';view.fac[id].stage=stage;view.fac[id].site=null;return view;
}
export function modelCrop(id){if(!Object.hasOwn(PLOT_BOUNDS,id))return null;if(id==='bed')return[418,203,48,22];const[x,y,w,h]=PLOT_BOUNDS[id];return[Math.max(0,x-12),Math.max(0,y-12),w+24,h+24];}
export const WOODWORK=['bench','workbench','store'];
export function woodworkProgress(s,id){if(!WOODWORK.includes(id))return 0;const f=s.fac[id],v=f?.site;if(f?.stage)return 1;if(!v||v.delivered.wood<v.need.wood)return 0;return Math.max(0,Math.min(1,v.work/v.workNeed));}
export const LIFE_BUILD=['garden','kitchen'];
export function lifeBuildProgress(s,id){const v=s.fac[id]?.site;if(!LIFE_BUILD.includes(id)||!v||v.delivered.wood<v.need.wood)return 0;return Math.max(0,Math.min(1,v.work/v.workNeed));}
