import {recipeReason,preparedCount,RECIPES} from './homestead-content.mjs';
import {skillLevel} from './homestead-skills.mjs';
export const freshTastes=()=>({basic:0,salad:0,stew:0});
export const validTastes=t=>t&&Object.keys(t).length===3&&['basic','salad','stew'].every(id=>Number.isInteger(t[id])&&t[id]>=0&&t[id]<=100);
export function mealAim(s){return s.autonomy&&s.autonomy.warmMeals&&s.fac.kitchen.stage&&skillLevel(s,'cook')>=1&&!s.autonomy.tastes.salad?'salad':null;}
export function autonomyRecipe(s){const id=mealAim(s);return id&&(s.mealStyle||'auto')==='auto'&&!recipeReason(s,id)?id:null;}
export function mealAimText(s){const id=mealAim(s);if(!id)return '';const r=RECIPES[id],reason=recipeReason(s,id);return `餐食打算：下次需要補餐時試${r.name}（${r.duration}秒、不耗柴；先記錄實際吃到）。${s.mealStyle!=='auto'?'你選的口味優先，暫不自選新餐。':preparedCount(s)>=2?'已有夠用成品，先吃現成的，不為練習加做。':reason?`${reason}，可用基本餐／野果求生，不阻塞家園工程。`:'食材足夠，下次補餐會做一鍋。'}`;}
export function recordTaste(s,id){if(s.autonomy)s.autonomy.tastes[id]=Math.min(100,s.autonomy.tastes[id]+1);}
