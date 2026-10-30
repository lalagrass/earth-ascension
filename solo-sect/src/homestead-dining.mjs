import{HOME,PLACES}from'./homestead-life-data.mjs';
import{at}from'./homestead-living.mjs';
export const MEAL_PACES={quick:'在住處快吃',seat:'有餘裕時坐長凳慢吃'};
export function setMealPace(s,id){if(!s.frontier||typeof id!=='string'||!Object.hasOwn(MEAL_PACES,id))return false;s.frontier.mealPace=id;return true;}
export const preferSeatedMeal=(s,p=s.person)=>!!s.frontier&&s.frontier.mealPace==='seat'&&s.fac.bench.stage>0&&s.frontier.threat.phase==='quiet'&&s.frontier.trip.phase==='home'&&p.hunger>=38;
export const mealPoint=t=>t.seated?PLACES.bench:HOME;
export const mealDuration=t=>t.seated?4:2;
export function validEatingTask(s,t){if(t.seated!==undefined&&(!s.frontier||typeof t.seated!=='boolean'))return false;if(t.place!==(t.seated?'bench':'home')||t.seated&&!s.fac.bench.stage||t.timer>=mealDuration(t)||t.phase==='go'&&t.timer!==0||t.phase==='do'&&!at(s.person,mealPoint(t)))return false;return true;}
export function mealPaceText(s){return (s.frontier?.mealPace==='seat'?s.fac.bench.stage?'下次有餘裕時走到長凳吃4秒，實吃後座位感受+2/60秒；不加飽腹或工作增益。':'偏好已記；還沒有長凳，先在住處吃2秒。':'在住處快吃2秒，不額外給座位感受。')+' 急餓/林緣動靜先快吃；只影響下次，不改正在進行的用餐。';}
