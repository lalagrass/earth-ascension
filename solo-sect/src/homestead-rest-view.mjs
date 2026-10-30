import{FACILITIES,PLACES}from'./homestead.mjs';import{restRate}from'./homestead-living.mjs';
// A matched reference scenario, never a forecast that advances or grants anything.
export function restComparison(s,id){
 if(s.mode!=='solo'||!['hut','bed'].includes(id)||!s.fac[id]||!FACILITIES[id].stages[s.fac[id].stage+1]||id==='bed'&&!s.fac.hut.stage)return null;
 const projected={...s,fac:{...s.fac,[id]:{...s.fac[id],stage:s.fac[id].stage+1}}},from=30,to=100,beforeRate=restRate(s,{pos:PLACES.hut}),afterRate=restRate(projected,{pos:PLACES.hut});
 const seconds=r=>Math.ceil((to-from)/r/.25-1e-12)*.25,before=seconds(beforeRate),after=seconds(afterRate);
 return{from,to,beforeRate,afterRate,before,after,saved:before-after};
}
export function restComparisonText(s,id){const r=restComparison(s,id);return r?`同從${r.from}精力歇到${r.to}，到休息位置後的純恢復估算：目前${r.before}秒 → 建好後${r.after}秒，少等${r.saved}秒。不含走路或其他活動；這是同條件例子，並非已建成／已使用或實際遊玩耗時。`:'';}
