import{createHomestead,setMealStyle,setProjectFocus,startBlueprint,pauseProject,setOrder,tickHomestead,saveHomestead,loadHomestead,DAY,FACILITIES,BUILDABLE}from'../../src/homestead.mjs';import{RECIPES,preparedCount}from'../../src/homestead-content.mjs';
export function dailyIntent({personality='quiet',style='auto',condition='low',reload=true,days=20}={}){
 let s=createHomestead({mode:'solo',personality});for(const[id,stage]of Object.entries({hut:1,garden:1,kitchen:2,workbench:1,bed:1,bench:1,store:1}))s.fac[id].stage=stage;
 s.cap={berries:20,wood:20,seeds:10,veg:16,meal:15,herbs:10};Object.assign(s.stock,{berries:1,wood:1});s.person.skills.build=40;s.person.skills.cook=5;setMealStyle(s,style);
 if(condition==='full')Object.assign(s.stock,s.cap);
 const initial={...s.stock},base=Object.fromEntries(BUILDABLE.map(id=>[id,s.fac[id].stage]));for(const id of['hut','flowers','bed'])startBlueprint(s,id);setProjectFocus(s,'bed');
 const made={basic:0,salad:0,stew:0},ate={basic:0,salad:0,stew:0};let wood=0,fruit=0,raw=0,sow=0,harvest=0,gained=0,minH=100,minE=100,zero=0,last=s.log[0],complete=null;const daily=[];
 for(let i=0;i<DAY*days*4;i++){
  if(condition==='interrupted'&&i===400)setOrder(s,'chop');if(condition==='interrupted'&&i===520)setOrder(s,null);
  if(condition==='paused'&&i===100)pauseProject(s,'bed');if(condition==='paused'&&i===800){pauseProject(s,'bed',false);setProjectFocus(s,'bed');}
  const beforeH=s.person.hunger;tickHomestead(s);
  for(let j=0;s.log[j]&&s.log[j]!==last;j++){const m=s.log[j].msg;if(m.includes('砍得一根木料'))wood++;if(m.includes('採到野果'))fruit++;if(m.includes('播下種子'))sow++;if(m.includes('收下青菜與種子'))harvest++;if(m.includes('吃了野果')){raw++;gained+=s.person.hunger-Math.max(0,beforeH-.035);}if(m.includes('煮出三份熱飯'))made.basic++;if(m.includes('吃了一份熱飯')){ate.basic++;gained+=s.person.hunger-Math.max(0,beforeH-.035);}for(const[id,r]of Object.entries(RECIPES).filter(([id])=>id!=='basic')){if(m.includes('做成'+r.name))made[id]++;if(m.includes('吃下'+r.name)){ate[id]++;gained+=s.person.hunger-Math.max(0,beforeH-.035);}}}last=s.log[0];
  let invested=0;for(const id of BUILDABLE){const f=s.fac[id];for(let stage=base[id]+1;stage<=f.stage;stage++)invested+=FACILITIES[id].stages[stage].cost.wood;if(f.site)invested+=f.site.delivered.wood;}
  const used=k=>Object.entries(RECIPES).reduce((n,[id,r])=>n+made[id]*(r.ingredients[k]||0),0),held=k=>s.person.carry?.kind===k?s.person.carry.amount:0;
  if(initial.wood+wood!==s.stock.wood+held('wood')+invested+used('wood'))throw Error('intent wood conservation');if(initial.berries+fruit!==s.stock.berries+held('berries')+raw+used('berries'))throw Error('intent fruit conservation');if(initial.veg+harvest*2!==s.stock.veg+held('veg')+used('veg'))throw Error('intent veg conservation');
  for(const[id,r]of Object.entries(RECIPES))if(s.stock[r.output]!==initial[r.output]+made[id]*r.servings-ate[id])throw Error('intent dish '+id);
  const xp={gather:Math.min(12,wood+fruit),build:40,farm:Math.min(12,sow+harvest),cook:Math.min(8,5+Object.entries(RECIPES).reduce((n,[id,r])=>n+made[id]*r.xp,0))};for(const id of Object.keys(xp))if(Math.abs(s.person.skills[id]-xp[id])>1e-9)throw Error('intent XP '+id);
  if(preparedCount(s)>s.cap.meal)throw Error('intent meal capacity');minH=Math.min(minH,s.person.hunger);minE=Math.min(minE,s.person.energy);if(s.person.hunger===0)zero+=.25;
  if(complete===null&&s.fac.hut.stage===2&&s.fac.bed.stage===2&&s.fac.flowers.stage===1)complete=s.t;
  if(reload&&i%503===0){const r=loadHomestead(saveHomestead(s));if(!r.ok)throw Error(r.error);s=r.state;last=s.log[0];}
  if((i+1)%(DAY*4)===0)daily.push({day:(i+1)/(DAY*4),wood:s.stock.wood,berries:s.stock.berries,veg:s.stock.veg,meal:s.stock.meal,salad:s.stock.salad,stew:s.stock.stew,made:{...made},ate:{...ate},leisure:s.person.leisure});
 }
 return{personality,style,condition,days,minH,minE,zero,complete,made,ate,woodHarvested:wood,fruitHarvested:fruit,rawEaten:raw,hungerActuallyRestored:gained,leisure:s.person.leisure,finalStock:s.stock,daily,final:s};
}
