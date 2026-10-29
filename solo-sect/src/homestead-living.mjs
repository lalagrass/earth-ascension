// 短期感受來自實際使用事件；不轉成工作倍率，也不把地圖家具全域加總。
export const FEELINGS={warmMeal:{name:'吃過熱飯',value:2,duration:60},rested:{name:'床鋪安睡',value:2,duration:60},seated:{name:'坐得舒服',value:2,duration:60},flowers:{name:'看花小憩',value:1,duration:60}};
export const at=(p,point)=>Math.hypot(p.pos[0]-point[0],p.pos[1]-point[1])<1;
export function feel(s,id){if(s.mode==='solo')s.person.feelings[id]=s.t+FEELINGS[id].duration;}
export function currentFeelings(s){const active=Object.entries(s.person.feelings||{}).filter(([,until])=>until>s.t).map(([id,until])=>({id,...FEELINGS[id],left:Math.ceil(until-s.t)}));return {active,value:Math.min(5,active.reduce((n,f)=>n+f.value,0))};}
export function restRate(s,p=s.person){return [3,6,9][s.fac.hut.stage]+(s.mode==='solo'&&s.fac.bed?.stage&&at(p,[440,225])?1:0);}
