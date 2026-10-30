import {recipeReason,preparedCount,RECIPES,autoRecipe} from './homestead-content.mjs';
import {skillLevel} from './homestead-skills.mjs';
export const freshTastes=()=>({basic:0,salad:0,stew:0});
export const validTastes=t=>t&&Object.keys(t).length===3&&['basic','salad','stew'].every(id=>Number.isInteger(t[id])&&t[id]>=0&&t[id]<=100);
export function mealAim(s){if((s.autonomy?.goal==='stew'||s.autonomy?.waiting?.goal==='stew')&&!s.autonomy.tastes.stew)return 'stew';return s.autonomy&&s.autonomy.warmMeals&&s.fac.kitchen.stage&&skillLevel(s,'cook')>=1&&!s.autonomy.tastes.salad?'salad':null;}
export function autonomyRecipe(s){const id=mealAim(s);return id&&(s.mealStyle||'auto')==='auto'&&!recipeReason(s,id)&&!(id==='stew'&&Object.values(s.fac).some(f=>f.site&&!f.site.paused))?id:null;}
export function mealAimText(s){if(s.autonomy?.deferred.includes('stew'))return '你已暫緩燉菜，自主補餐先用基本餐／拌食；明確派一鍋仍可。';const id=mealAim(s);if(!id)return '';const r=RECIPES[id],reason=recipeReason(s,id);return `餐食打算：下次需要補餐時試${r.name}（${r.duration}秒、${r.ingredients.wood?'耗柴'+r.ingredients.wood:'不耗柴'}；先記錄實際吃到）。${s.mealStyle!=='auto'?'你選的口味優先，暫不自選新餐。':preparedCount(s)>=2?'已有夠用成品，先吃現成的，不為練習加做。':reason?`${reason}，可用基本餐／野果求生，不阻塞家園工程。`:'食材足夠，下次補餐會做一鍋。'}`;}
export function recordTaste(s,id){if(s.autonomy)s.autonomy.tastes[id]=Math.min(100,s.autonomy.tastes[id]+1);}

export function autonomyFood(s){return (s.autonomy?.goal==='stew'||s.autonomy?.waiting?.goal==='stew')&&s.stock.stew>0&&s.person.hunger<38?'stew':null;}

export function automaticRecipe(s){
 const recipe=autonomyRecipe(s)||autoRecipe(s);
 if(recipe==='stew'&&s.autonomy?.deferred.includes('stew'))return ['basic','salad'].find(id=>!recipeReason(s,id))||null;
 return recipe;
}
