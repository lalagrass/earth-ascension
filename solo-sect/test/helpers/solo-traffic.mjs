import {createHomestead,startBlueprint,setOrder,pauseProject,tickHomestead,loadHomestead,saveHomestead,FACILITIES}from'../../src/homestead.mjs';
export function soloTraffic(seed){
 let state=seed,roll=()=>((state=(state*1664525+1013904223)>>>0)/2**32),s=createHomestead({mode:'solo',personality:['quiet','sociable','diligent'][(seed-1)%3]});s.fac.hut.stage=1;s.fac.garden.stage=1;s.fac.kitchen.stage=1;s.stock.wood=2;
 const projects=['bench','flowers','bed'];for(const id of projects)startBlueprint(s,id);
 let last=s.log[0],wood=0,cooks=0,eaten=0,gather=0,farm=0,minH=100,minE=100,loads=0;
 for(let i=0;i<20000;i++){
  if(i%97===0)setOrder(s,[null,'farm','cook','chop','rest','forage','leisure','build'][Math.floor(roll()*8)]);
  if(i%347===0){const id=projects[Math.floor(roll()*3)];if(s.fac[id].site)pauseProject(s,id,roll()<.3);}
  tickHomestead(s);
  for(let j=0;s.log[j]&&s.log[j]!==last;j++){const m=s.log[j].msg;if(m.includes('砍得一根木料')){wood++;gather++;}if(m.includes('採到野果'))gather++;if(m.includes('在小菜園播下種子')||m.includes('收下青菜與種子'))farm++;if(m.includes('煮出三份熱飯'))cooks++;if(m.includes('吃了一份熱飯'))eaten++;}last=s.log[0];
  const invested=projects.reduce((n,id)=>n+(s.fac[id].stage?FACILITIES[id].stages[1].cost.wood:s.fac[id].site.delivered.wood),0),progress=projects.reduce((n,id)=>n+(s.fac[id].stage?FACILITIES[id].stages[1].work:s.fac[id].site.work),0);
  if(2+wood!==s.stock.wood+(s.person.carry?.kind==='wood'?s.person.carry.amount:0)+invested+cooks)throw Error(`wood ${seed}/${i}`);
  if(s.stock.meal!==cooks*3-eaten)throw Error(`food ${seed}/${i}`);
  const expected={gather:Math.min(12,gather),farm:Math.min(12,farm),cook:Math.min(8,cooks),build:Math.min(40,progress)};
  for(const id of Object.keys(expected))if(Math.abs(s.person.skills[id]-expected[id])>1e-9)throw Error(`xp ${id} ${seed}/${i}`);
  minH=Math.min(minH,s.person.hunger);minE=Math.min(minE,s.person.energy);
  if(i%53===0){const raw=saveHomestead(s),r=loadHomestead(raw);if(!r.ok||saveHomestead(r.state)!==raw)throw Error(`reload ${seed}/${i}: ${r.error}`);s=r.state;last=s.log[0];loads++;}
 }
 return {seed,ticks:20000,seconds:s.t,minH,minE,loads,woodHarvested:wood,mealProduced:cooks*3,mealEaten:eaten,stock:s.stock,skills:s.person.skills};
}
