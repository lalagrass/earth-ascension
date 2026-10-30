import{createHomestead,startBlueprint,setMealStyle,setProjectFocus,requestFood,setOrder,pauseProject,requestRecipe,tickHomestead,saveHomestead,loadHomestead,FACILITIES,BUILDABLE}from'../../src/homestead.mjs';
import{RECIPES,preparedCount}from'../../src/homestead-content.mjs';
export function autonomyTraffic(seed,{chooseMeals=false,chooseIntents=false}={}){
 let rng=seed,roll=()=>((rng=(rng*1664525+1013904223)>>>0)/2**32),s=createHomestead({mode:'solo',autonomy:true,personality:['quiet','sociable','diligent'][(seed-1)%3]});
 const base=Object.fromEntries(BUILDABLE.map(id=>[id,s.fac[id].stage]));
 const made={basic:0,salad:0,stew:0},ate={basic:0,salad:0,stew:0};let wildHerbs=0,grownHerbs=0,cuttings=0,herbUses=0,harvestEvents=0;let wood=0,fruit=0,fruitEaten=0,sown=0,harvest=0,last=s.log[0],loads=0,minH=100,minE=100;
 for(let i=0;i<20000;i++){
  if(i%193===0){for(const id of['hut','bench','flowers','bed','workbench','kitchen'])startBlueprint(s,id);}
  if(i%97===0){const act=[null,'farm','cook','chop','rest','forage','leisure','build',...(chooseMeals?['eat']:[])][Math.floor(roll()*(chooseMeals?9:8))];if(act==='eat')requestFood(s,['basic','salad','stew'][Math.floor(roll()*3)]);else if(act==='cook')requestRecipe(s,['basic','salad','stew'][Math.floor(roll()*3)]);else setOrder(s,act);}
  if(i%347===0){const id=BUILDABLE[Math.floor(roll()*BUILDABLE.length)];if(s.fac[id].site)pauseProject(s,id,roll()<.3);}
  if(chooseIntents&&i%211===0)setMealStyle(s,['auto','basic','salad','stew'][Math.floor(roll()*4)]);
  if(chooseIntents&&i%317===0){const ids=BUILDABLE.filter(id=>s.fac[id].site&&!s.fac[id].site.paused);setProjectFocus(s,ids.length?ids[Math.floor(roll()*ids.length)]:null);}
  tickHomestead(s);
  for(let j=0;s.log[j]&&s.log[j]!==last;j++){const m=s.log[j].msg;if(m.includes('採到一份虛構草藥'))wildHerbs++;if(m.includes('用一份草藥在藥田插穗'))cuttings++;const herbMatch=m.match(/收下 (\d+) 份藥田草藥/);if(herbMatch){grownHerbs+=Number(herbMatch[1]);harvestEvents++;}if(m.includes('用一份草藥調養自己'))herbUses++;if(m.includes('砍得一根木料'))wood++;if(m.includes('採到野果'))fruit++;if(m.includes('吃了野果'))fruitEaten++;if(m.includes('播下種子'))sown++;if(m.includes('收下青菜與種子'))harvest++;if(m.includes('煮出三份熱飯'))made.basic++;if(m.includes('吃了一份熱飯'))ate.basic++;for(const id of['salad','stew']){if(m.includes('做成'+RECIPES[id].name))made[id]++;if(m.includes('吃下'+RECIPES[id].name))ate[id]++;}}
  last=s.log[0];let invested=0,effort=0;
  for(const id of BUILDABLE){const f=s.fac[id];for(let stage=base[id]+1;stage<=f.stage;stage++){const r=FACILITIES[id].stages[stage];invested+=r.cost.wood;effort+=r.work+(r.craft||0);}if(f.site){invested+=f.site.delivered.wood;effort+=f.site.work+f.site.crafted;}}
  const used=key=>Object.entries(RECIPES).reduce((n,[id,r])=>n+made[id]*(r.ingredients[key]||0),0),held=key=>s.person.carry?.kind===key?s.person.carry.amount:0;
  if(wood!==s.stock.wood+held('wood')+invested+used('wood'))throw Error(`wood ${seed}/${i}`);
  if(wildHerbs+grownHerbs-cuttings-herbUses!==s.stock.herbs+held('herbs'))throw Error(`herbs ${seed}/${i}`);
  if(s.person.herbalSkill!==wildHerbs+cuttings+harvestEvents+herbUses)throw Error(`herbal skill ${seed}/${i}`);
  if(fruit!==s.stock.berries+held('berries')+fruitEaten+used('berries'))throw Error(`berries ${seed}/${i}`);
  if(harvest*2!==s.stock.veg+held('veg')+used('veg'))throw Error(`veg ${seed}/${i}`);
  for(const[id,r]of Object.entries(RECIPES))if(s.stock[r.output]!==made[id]*r.servings-ate[id])throw Error(`dish ${id} ${seed}/${i}`);
  const expected={gather:Math.min(12,wood+fruit),build:Math.min(40,effort),farm:Math.min(12,sown+harvest),cook:Math.min(8,Object.entries(RECIPES).reduce((n,[id,r])=>n+made[id]*r.xp,0))};
  for(const id of Object.keys(expected))if(Math.abs(s.person.skills[id]-expected[id])>1e-9)throw Error(`xp ${id} ${seed}/${i}`);
  if(preparedCount(s)>s.cap.meal)throw Error('shared meal capacity');
  minH=Math.min(minH,s.person.hunger);minE=Math.min(minE,s.person.energy);
  if(i%53===0){const raw=saveHomestead(s),r=loadHomestead(raw);if(!r.ok||saveHomestead(r.state)!==raw)throw Error(`reload ${seed}/${i}: ${r.error}`);s=r.state;last=s.log[0];loads++;}
 }
 return{seed,ticks:20000,seconds:s.t,minH,minE,loads,made,ate,wood,fruit,harvest,skills:s.person.skills,stock:s.stock,fac:Object.fromEntries(BUILDABLE.map(id=>[id,s.fac[id].stage]))};
}
