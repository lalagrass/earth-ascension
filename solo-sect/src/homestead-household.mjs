import{at,restRate,FEELINGS,currentFeelings}from'./homestead-living.mjs';
// Read-only facts for existing facilities. Eligibility stays in the executor's rules.
import{FACILITIES,PLACES,ACTIONS,blockReason}from'./homestead.mjs';
import{RECIPES,recipeReason,preparedCount}from'./homestead-content.mjs';
import{activityText,resourceSummary}from'./homestead-view.mjs';
export function householdFacts(s,id){
 if(s.mode!=='solo'||!s.fac[id]||!s.fac[id].stage&&id!=='hut')return null;
 if(id==='hut'||id==='bed'){
  const p=s.person,t=p.task,here=at(p,PLACES.hut),rate=restRate(s,{pos:PLACES.hut}),bed=s.fac.bed.stage?FACILITIES.bed.stages[s.fac.bed.stage].name:'現有鋪蓋',feeling=currentFeelings(s).active.find(f=>f.id==='rested');
  const state=t?.act==='rest'?(t.phase==='do'&&here?`正在${s.fac.hut.stage?'屋內實際':'席地'}休息，每秒恢復${restRate(s)}精力；這次目標${p.order==='rest'?100:85}。`:t.phase==='go'?'正在前往休息位置，尚未開始休息。':'目前歇息未在屋內使用位置，床鋪加成沒有生效。'):p.order==='rest'?`這次休息尚候，主角先${activityText(s)}。`:'現在沒有在此休息；家具放著不會直接恢復精力。';
  return{title:'這裡的休息',lines:[`目前精力${Number(p.energy.toFixed(1))}；${s.fac.hut.stage?`到屋內使用${bed}`:'到空地席地歇息'}每秒恢復${rate}精力。屋舍與床使用同一休息位置。`,state,'手動歇到100後自主生活，自主歇息以85為目標。開始前先顧吃飯與手上搬運，可改令取消。',feeling?`上次實際安睡留下「${feeling.name}」，尚餘${feeling.left}秒；離床仍按原時效消退。`:'目前沒有床鋪安睡感受；必須有床且實際休息完成才會得到。']};
 }
 if(id==='bench'||id==='flowers'){
  const t=s.person.task,seat=!!s.fac.bench.stage,using=t?.act==='leisure'&&t.place==='bench'&&t.phase==='do'&&at(s.person,PLACES.bench),going=t?.act==='leisure'&&t.place==='bench'&&t.phase==='go',feelings=currentFeelings(s).active.filter(f=>['seated','flowers'].includes(f.id));
  return{title:'屋前的小憩',lines:[!seat?'這裡已有花，但尚無長凳。花不會在全圖自動提供感受；建好長凳再坐下看花。':using?`正在長凳實際小憩（已${Number(t.timer.toFixed(1))}/${ACTIONS.leisure.duration}秒）；未完成不給這次成果。`:going?'正在走向長凳，還沒坐下，也沒得到這次小憩成果。':'現在沒有坐在長凳；擺設本身不給精力或感受。',`到長凳閒坐完成${ACTIONS.leisure.duration}秒，恢復最多5精力並留下「${FEELINGS.seated.name}」+${FEELINGS.seated.value}／${FEELINGS.seated.duration}秒${s.fac.flowers.stage?`；旁邊有花，另有「${FEELINGS.flowers.name}」+${FEELINGS.flowers.value}／${FEELINGS.flowers.duration}秒`:''}。不增加產量／工作效率，同類不累加。`,feelings.length?`最近實際小憩留下：${feelings.map(f=>`${f.name}尚餘${f.left}秒`).join('、')}。`:'目前沒有小憩留下的感受。']};
 }

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
