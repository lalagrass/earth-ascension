import {skillLevel} from './homestead-skills.mjs';
export const RECIPES={
 basic:{name:'基本熱飯',skill:0,facility:1,ingredients:{veg:2,wood:1},output:'meal',servings:3,duration:8,hunger:52,energy:0,xp:2,feeling:'warmMeal'},
 salad:{name:'蔬果拌食',skill:1,facility:1,ingredients:{veg:1,berries:1},output:'salad',servings:2,duration:5,hunger:38,energy:0,xp:1,feeling:'freshMeal'},
 stew:{name:'家常燉菜',skill:2,facility:2,ingredients:{veg:3,wood:2},output:'stew',servings:2,duration:12,hunger:70,energy:6,xp:2,feeling:'heartyMeal'},
};
export const hasRecipe=id=>typeof id==='string'&&Object.hasOwn(RECIPES,id);
export const BUILD_GATES={workbench:{level:1,fac:{hut:1}},'kitchen:2':{level:1,fac:{hut:1}},'bed:2':{level:2,fac:{hut:1,bed:1,workbench:1}}};
export const RESOURCE_NAMES={wood:'木料',veg:'青菜',berries:'野果'};
export const preparedCount=s=>s.stock.meal+(s.stock.salad||0)+(s.stock.stew||0);
export const edibleEnergy=s=>s.stock.berries*26+Object.values(RECIPES).reduce((n,r)=>n+(s.stock[r.output]||0)*r.hunger,0);
export function recipeAccess(s,id){if(!hasRecipe(id))return '未知食譜';const r=RECIPES[id];if(s.mode!=='solo'&&id!=='basic')return '舊模式只用基本熱飯';if(skillLevel(s,'cook')<r.skill)return `料理需要Lv${r.skill}`;if(s.fac.kitchen.stage<r.facility)return r.facility===2?'需要改良灶具':'需要露天灶';return null;}
export function recipeReason(s,id){const r=RECIPES[id],locked=recipeAccess(s,id);if(locked)return locked;for(const[k,n]of Object.entries(r.ingredients))if(s.stock[k]<n)return `缺${RESOURCE_NAMES[k]}${n-s.stock[k]}`;if(preparedCount(s)+r.servings>s.cap.meal)return `料理共用容量不足，需${r.servings}份空位`;return null;}
export function buildAccess(s,id,next){const g=BUILD_GATES[`${id}:${next}`]||BUILD_GATES[id];if(!g)return null;if(s.mode!=='solo')return '新木作只在獨居模式';if(skillLevel(s,'build')<g.level)return `建造需要Lv${g.level}`;for(const[f,n]of Object.entries(g.fac))if((s.fac[f]?.stage||0)<n)return `需要${{hut:'木屋',bed:'木床鋪',workbench:'木作台'}[f]}`;return null;}
export function availableUnlocks(s){if(s.mode!=='solo')return [];return [...Object.keys(RECIPES).filter(id=>id!=='basic'&&!recipeAccess(s,id)).map(id=>`食譜：${RECIPES[id].name}`),...Object.entries({workbench:1,kitchen:2,bed:2}).filter(([id,n])=>!buildAccess(s,id,n)).map(([id])=>({workbench:'木作台',kitchen:'改良灶具',bed:'舒適床鋪'}[id]))];}
export function autoRecipe(s){
 if(s.mode!=='solo')return recipeReason(s,'basic')?null:'basic';
 const building=Object.values(s.fac).some(f=>f.site&&!f.site.paused);
 if(!building&&s.person.energy<50&&!recipeReason(s,'stew'))return 'stew';
 if(!recipeReason(s,'basic'))return 'basic';
 if(!s.stock.wood&&!recipeReason(s,'salad'))return 'salad';
 return null;
}
export function chooseFood(s){if(s.stock.stew>0&&(s.person.energy<60||s.person.hunger<30))return 'stew';if(s.stock.salad>0&&s.person.energy>=60&&s.person.hunger>=30)return 'salad';if(s.stock.meal>0)return 'basic';if(s.stock.salad>0)return 'salad';if(s.stock.stew>0)return 'stew';return null;}

export function nextUnlocks(s,skill){const level=skillLevel(s,skill)+1;if(level>2)return '已學會本輪所有等級做法；不必繼續刷工作。';if(skill==='cook')return `下級新做法：${Object.values(RECIPES).filter(r=>r.skill===level).map(r=>`${r.name}（需${r.facility===2?'改良灶具':'露天灶'}）`).join('、')}。`;if(skill==='build')return `下級新做法：${Object.entries(BUILD_GATES).filter(([,g])=>g.level===level).map(([id])=>({workbench:'木作台','kitchen:2':'改良灶具','bed:2':'舒適床鋪（需木床與木作台）'}[id])).join('、')}。`;return '下級讓有效工作更省體力；沒有額外配方樹。';}
