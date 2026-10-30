// Read-only facts for existing facilities. Eligibility stays in the executor's rules.
import{FACILITIES,blockReason}from'./homestead.mjs';
import{RECIPES,recipeReason,preparedCount}from'./homestead-content.mjs';
import{activityText,resourceSummary}from'./homestead-view.mjs';
export function householdFacts(s,id){
 if(s.mode!=='solo'||!s.fac[id]?.stage)return null;
 if(id==='garden'){
  const plot=s.plot,coming=resourceSummary(s).incoming.filter(c=>c.kind==='veg').reduce((n,c)=>n+c.amount,0),reason=blockReason(s,'farm');
  const state={empty:'待播種',growing:`生長中（已生長${Math.floor(plot.growth)}秒，尚不能採收）`,ripe:'已成熟，尚未採收'}[plot.state];
  const current=s.person.task?.act==='farm'?`目前：${activityText(s)}；完成前不發成果。`:reason?`照料暫候：${reason}。`:'可照料菜園；仍依需求與指派安排，檢視不會派工。';
  return{title:'這畦菜的現在',lines:[state,`庫存菜種${s.stock.seeds}；青菜${s.stock.veg}/${s.cap.veg}，另有${coming}份青菜在途（尚未入庫）。`,current,'收穫要實際搬回住處才入庫；生長與田間作物不算現成食物。']};
 }
 if(id==='kitchen'){
  const t=s.person.task,active=t?.act==='cook',r=active&&RECIPES[t.recipe||'basic'];
  const cooking=active?`目前：${activityText(s)}${t.phase==='do'?`（已料理${Number(t.timer.toFixed(1))}/${r.duration}秒）`:''}；完成時才扣食材、入庫與累積本領。`:'目前沒有正在料理的一鍋；灶有能力不代表正在煮。';
  return{title:'這座灶的現在',lines:[`可用：${FACILITIES.kitchen.stages[s.fac.kitchen.stage].name}${s.fac.kitchen.site?'；升級工程未完工，仍按舊灶能力':''}。`,cooking,`現成料理共${preparedCount(s)}/${s.cap.meal}份（共用容量）；${Object.values(RECIPES).map(r=>`${r.name}${s.stock[r.output]||0}`).join('／')}。`,...Object.entries(RECIPES).map(([id,r])=>`${r.name}：${recipeReason(s,id)||'這一鍋配方條件足夠；開始仍先顧吃睡及手上搬運'}。`)]};
 }
 return null;
}
