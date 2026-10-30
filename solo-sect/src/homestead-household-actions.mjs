// Context controls adapt the existing commands; they never produce resources or tasks.
import{offers,blockReason,setOrder,requestRecipe,requestFood}from'./homestead.mjs';
import{RECIPES,recipeReason,RESOURCE_NAMES}from'./homestead-content.mjs';
export function householdActions(s,place){
 if(s.mode!=='solo'||!s.fac[place]||!s.fac[place].stage&&place!=='hut'||!['hut','bed','bench','flowers','garden','kitchen'].includes(place))return[];
 const p=s.person,actions=['hut','bed'].includes(place)?[{id:'rest',label:'歇到精神恢復（一次）',reason:p.energy>=100?'精神已滿，現在不需要歇息':null,active:p.order==='rest'}]:['bench','flowers'].includes(place)?[{id:'leisure',label:place==='flowers'?'到長凳看花（持續）':'在長凳閒坐（持續）',reason:s.fac.bench.stage?null:'需要先建長凳並實際坐下',active:p.order==='leisure'}]:place==='garden'?[{id:'farm',label:'持續照料菜園',reason:offers(s,'garden','farm')?null:'菜園尚未建成',note:blockReason(s,'farm'),active:p.order==='farm'}]:Object.entries(RECIPES).flatMap(([id,r])=>[
  {id:`cook-${id}`,label:`只做這一鍋${r.name}`,detail:`${Object.entries(r.ingredients).map(([k,n])=>RESOURCE_NAMES[k]+n).join('＋')} → ${r.servings}份；製作${r.duration}秒，每份飽腹${r.hunger}${r.energy?`、精力+${r.energy}`:''}${!r.ingredients.wood?'；不耗柴':''}。`,reason:recipeReason(s,id),active:p.order==='cook'&&p.cookRequest===id},
  {id:`eat-${id}`,label:`吃一份${r.name}`,reason:!s.stock[r.output]?'沒有這份現成料理':p.hunger>=95?'現在已吃飽':null,active:p.order==='eat'&&p.foodRequest===id},
 ]);
 return[...actions,{id:'clear',label:'清除目前指派 · 自主生活',reason:p.order?null:'目前已是自主生活'}];
}
export function performHouseholdAction(s,place,id){
 const a=householdActions(s,place).find(a=>a.id===id);
 if(!a||a.reason)return{ok:false,message:a?.reason||'這個地塊目前沒有這項操作'};
 let ok,message;
 if(id==='rest'){ok=setOrder(s,'rest');message='這次到100後恢復自主生活；開始前先顧吃飯與搬運，可改令取消。';}
 else if(id==='leisure'){ok=setOrder(s,'leisure');message='已持續指派長凳閒坐；開始下一活動時仍先顧急需吃睡，清除指派即可回自主。';}
 else if(id==='clear'){ok=setOrder(s,null);message='已清除目前手動指派；手上物資仍要搬回，之後自主生活。';}
 else if(id==='farm'){ok=setOrder(s,'farm');message=`已持續指派照料菜園；直到清除指派。${a.note?`目前暫候：${a.note}。`:'仍先顧吃睡與搬運。'}`;}
 else if(id.startsWith('cook-')){ok=requestRecipe(s,id.slice(5));message='只做這一鍋，完成後自主生活；仍先顧吃睡與手上搬運，可改令取消。';}
 else {ok=requestFood(s,id.slice(4));message='只吃這一份，吃完自主生活；可改令取消。';}
 return{ok,message:ok?message:'條件已變更，沒有新增指派'};
}

export function householdActionHelp(place){const use=['hut','bed'].includes(place)?'休息一次到100完成回自主。':['bench','flowers'].includes(place)?'閒坐是持續指派，直到清除；吃睡仍優先，完成小憩才得感受。':'菜園是持續照料，料理一鍋／吃飯一份完成即回自主。';return `按下才派工；${use}清除會取消目前任何手動指派，手上物資仍要實際搬回。`;}
