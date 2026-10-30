import fs from 'node:fs';import assert from 'node:assert/strict';
import {createHomestead,tickHomestead,FACILITIES,saveHomestead,loadHomestead} from '../src/homestead.mjs';
import {RECIPES} from '../src/homestead-content.mjs';
const results=[];
for(const approach of ['guard','learn','peace']){
 const s=createHomestead({mode:'solo',autonomy:true,frontier:true,approach}),events=[];let minH=100,minE=100,gathered=0,fuel=0,sourceCount=null,previous='home';
 for(let i=0;i<4800*4;i++){
  const wood=s.wild.wood,t=s.person.task?{...s.person.task}:null,food={...s.stock};tickHomestead(s);gathered+=Math.round(Math.min(4,wood+.25/28)-s.wild.wood);
  if(t?.act==='cook'&&t.phase==='do'&&s.stock[RECIPES[t.recipe||'basic'].output]>food[RECIPES[t.recipe||'basic'].output])fuel+=RECIPES[t.recipe||'basic'].ingredients.wood||0;
  minH=Math.min(minH,s.person.hunger);minE=Math.min(minE,s.person.energy);
  if(s.frontier.source.cleared&&sourceCount===null)sourceCount=s.frontier.threat.incursions;
  if(s.frontier.trip.phase!==previous){events.push({t:s.t,phase:s.frontier.trip.phase,energy:s.person.energy,hunger:s.person.hunger});previous=s.frontier.trip.phase;}
  if(i%960===0){const r=loadHomestead(saveHomestead(s));assert.ok(r.ok,r.error);assert.deepEqual(r.state,s);}
 }
 const sites=Object.values(s.fac).reduce((n,f)=>n+(f.site?.delivered?.wood||0),0),carry=[s.person,s.helper,s.frontier.companion].filter(Boolean).reduce((n,p)=>n+(p.carry?.kind==='wood'?p.carry.amount:0),0),built=Object.entries(s.fac).reduce((n,[id,f])=>n+FACILITIES[id].stages.slice(1,f.stage+1).reduce((n,r)=>n+(r.cost?.wood||0),0),0),accounted=s.stock.wood+sites+carry+built+fuel+s.frontier.repairWood;
 assert.equal(gathered,accounted,'one authoritative wood ledger');assert.ok(minH>0);if(approach==='peace'){assert.ok(s.frontier.source.cleared);assert.equal(s.frontier.threat.incursions,sourceCount);}
 results.push({approach,personality:'quiet',worldSeconds:s.t,minH,minE,incursions:s.frontier.threat.incursions,damage:s.frontier.threat.damage,scares:s.frontier.threat.scares,sourceClearAt:s.frontier.source.clearAt,quietSinceClear:s.frontier.source.clearAt===null?null:s.t-s.frontier.source.clearAt,wood:{gathered,accounted,stock:s.stock.wood,sites,carry,built,cookingFuel:fuel,repairs:s.frontier.repairWood},martial:{...s.frontier.martial},leisure:s.person.leisure,trip:{...s.frontier.trip},events});
}
fs.writeFileSync('FRONTIER-R9-METRICS.json',JSON.stringify({scenario:'same quiet personality/fresh modest stocks, no work/build input, deterministic .25 ticks; not a human fun study',results},null,2)+'\n');console.log(JSON.stringify(results.map(({approach,minH,minE,incursions,sourceClearAt,quietSinceClear,wood,martial,leisure})=>({approach,minH,minE,incursions,sourceClearAt,quietSinceClear,wood,hits:martial.hits,practices:martial.practices,leisure}))));
