import{createHomestead,startBlueprint,requestRecipe,setOrder,tickHomestead,saveHomestead,loadHomestead,DAY}from'../../src/homestead.mjs';
import{recipeReason}from'../../src/homestead-content.mjs';
// No state/XP grants. Acts only through the same command functions used by UI.
export function growthRoute(personality='quiet',{reload=true}={}){
 let s=createHomestead({mode:'solo',personality}),phase=0,last=s.log[0],minH=100,minE=100;const commands=[],events=[],made={basic:0,salad:0,stew:0},ate={basic:0,salad:0,stew:0};
 const command=(type,id)=>{const ok=type==='build'?startBlueprint(s,id):type==='recipe'?requestRecipe(s,id):setOrder(s,id);if(!ok&&type!=='order')throw Error(`command failed ${type}/${id}`);commands.push({t:s.t,type,id});};
 const record=name=>events.push({name,t:s.t,day:s.day,skills:{...s.person.skills},stock:{...s.stock}});
 command('build','hut');
 for(let i=0;i<DAY*30*4;i++){
  tickHomestead(s);
  for(let j=0;s.log[j]&&s.log[j]!==last;j++){const m=s.log[j].msg;if(m.includes('煮出三份熱飯'))made.basic++;if(m.includes('吃了一份熱飯'))ate.basic++;for(const[id,name]of[['salad','蔬果拌食'],['stew','家常燉菜']]){if(m.includes('做成'+name))made[id]++;if(m.includes('吃下'+name))ate[id]++;}}
  last=s.log[0];minH=Math.min(minH,s.person.hunger);minE=Math.min(minE,s.person.energy);
  if(phase===0&&s.fac.hut.stage===1){record('first house');command('build','garden');phase++;}
  else if(phase===1&&s.fac.garden.stage===1){command('build','kitchen');phase++;}
  else if(phase===2&&s.fac.kitchen.stage===1){command('build','bed');phase++;}
  else if(phase===3&&s.fac.bed.stage===1&&made.basic&&!recipeReason(s,'salad')){record('basic and cooking Lv1');command('recipe','salad');phase++;}
  else if(phase===4&&ate.salad){record('salad eaten');command('build','workbench');phase++;}
  else if(phase===5&&s.fac.workbench.stage===1){command('build','kitchen');phase++;}
  else if(phase===6&&s.fac.kitchen.stage===2){command('build','bed');phase++;}
  else if(phase===7&&s.fac.bed.stage===2){record('comfortable bed built');command('order','rest');phase++;}
  else if(phase===8&&s.person.energy>=99&&s.person.feelings.rested>s.t){record('comfortable bed used');command('order',null);command('build','hut');phase++;}
  else if(phase===9&&s.fac.hut.stage===2){command('build','store');phase++;}
  else if(phase===10&&s.fac.store.stage===1){command('build','bench');phase++;}
  else if(phase===11&&s.fac.bench.stage===1){command('build','flowers');phase++;}
  else if(phase===12&&s.fac.flowers.stage===1&&!recipeReason(s,'stew')){record('cooking Lv2 and stove2');command('recipe','stew');phase++;}
  else if(phase===13&&ate.stew){record('stew eaten');command('order','leisure');phase++;}
  else if(phase===14&&s.person.feelings.flowers>s.t){record('chosen leisure');return{personality,seconds:s.t,days:s.t/DAY,minH,minE,made,ate,commands,events,final:s};}
  if(reload&&i%503===0){const r=loadHomestead(saveHomestead(s));if(!r.ok)throw Error(r.error);s=r.state;last=s.log[0];}
 }
 throw Error(`growth route exceeded30days ${personality}/${phase}`);
}
export function replayGrowth(route,dt){const s=createHomestead({mode:'solo',personality:route.personality});let index=0;while(s.t+(s.subtick||0)<route.seconds-1e-9){while(index<route.commands.length&&Math.abs(route.commands[index].t-s.t-(s.subtick||0))<1e-8){const c=route.commands[index++];if(c.type==='build')startBlueprint(s,c.id);else if(c.type==='recipe')requestRecipe(s,c.id);else setOrder(s,c.id);}const boundary=Math.min(route.seconds,route.commands[index]?.t??Infinity),left=boundary-s.t-(s.subtick||0);tickHomestead(s,Math.min(dt,left));}return s;}
