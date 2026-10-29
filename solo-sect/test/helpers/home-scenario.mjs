import {createHomestead,tickHomestead,pauseProject,inviteHelper,startBlueprint,setOrder,setHelperOrder,loadHomestead,saveHomestead,DAY,FACILITIES} from '../../src/homestead.mjs';
export function homeScenario({personality='quiet',apprentice=false,condition='low',reload=true,days=20,mode='legacy',buildBed=false}={}) {
 let s=createHomestead({personality,mode});s.fac.hut.stage=2;for(const id of ['garden','kitchen','store','herbGarden'])s.fac[id].stage=1;s.cap={berries:20,wood:20,seeds:10,veg:16,meal:15,herbs:10};s.stock.wood=1;s.stock.herbs=1;
 if(condition==='full')s.stock={...s.cap};
 if(apprentice){s.t=70;s.visitor.trust=4;s.visitor.willing=true;inviteHelper(s);s.visitor.role='apprentice';s.visitor.apprenticeDay=1;}
 const initialWood=s.stock.wood,initialMeal=s.stock.meal;
 const projects=['bench','flowers',...(buildBed?['bed']:[])];for(const id of projects)startBlueprint(s,id);let pausedId=null;let harvestedWood=0,produced=0,eaten=0,minH=100,minE=100,zero=0,harvests=0,completedAt=null;const daily=[];let last=s.log[0];
 for(let i=0;i<DAY*days*4;i++){
  if(condition==='interrupted' && i===400){setOrder(s,'chop');if(s.helper)setHelperOrder(s,'farm');}
  if(condition==='interrupted' && i===520){setOrder(s,null);if(s.helper)setHelperOrder(s,null);}
  if(condition==='paused'&&i===100){pausedId=projects.find(id=>s.fac[id].site);if(pausedId)pauseProject(s,pausedId,true);}
  if(condition==='paused'&&i===800&&pausedId)pauseProject(s,pausedId,false);
  tickHomestead(s);
  for(let j=0;s.log[j]&&s.log[j]!==last;j++){const m=s.log[j].msg;if(m.includes('砍得一根木料')||m.includes('砍柴後正搬回'))harvestedWood++;if(m.includes('煮出三份熱飯'))produced+=3;if(m.includes('吃了一份熱飯'))eaten++;if(m.includes('收下青菜')||m.includes('收菜後'))harvests++;}last=s.log[0];
  for(const p of [s.person,s.helper].filter(Boolean)){minH=Math.min(minH,p.hunger);minE=Math.min(minE,p.energy);if(p.hunger===0)zero+=.25;}
  if(completedAt===null&&projects.every(id=>s.fac[id].stage))completedAt=s.t;
  const invested=projects.reduce((n,id)=>n+(s.fac[id].stage?FACILITIES[id].stages[1].cost.wood:s.fac[id].site?.delivered.wood||0),0);
  const onPerson=[s.person,s.helper].reduce((n,p)=>n+(p?.carry?.kind==='wood'?p.carry.amount:0),0);
  if(initialWood+harvestedWood!==s.stock.wood+onPerson+invested+produced/3)throw Error(`wood conservation ${personality}/${apprentice}/${condition}/${i}`);
  if(initialMeal+produced-eaten!==s.stock.meal)throw Error('food accounting');
  if(reload&&i%503===0){const r=loadHomestead(saveHomestead(s));if(!r.ok)throw Error(r.error);s=r.state;last=s.log[0];}
  if((i+1)%(DAY*4)===0)daily.push({day:(i+1)/(DAY*4),meal:s.stock.meal,wood:s.stock.wood,berries:s.stock.berries,veg:s.stock.veg,herbs:s.stock.herbs,produced,eaten,leisure:s.person.leisure,helperLeisure:s.helper?.leisure||0});
 }
 return {personality,apprentice,condition,mode,buildBed,days,initialMeal,produced,eaten,harvests,minH,minE,zero,completedAt,daily,final:s};
}
