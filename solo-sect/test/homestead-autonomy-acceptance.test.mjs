import test from 'node:test';import assert from 'node:assert/strict';import * as M from '../src/homestead.mjs';import {lifeStage} from '../src/homestead-autonomy.mjs';import {autonomyTraffic} from './helpers/autonomy-traffic.mjs';
function scenario(personality,condition,reload){let s=M.createHomestead({mode:'solo',autonomy:true,personality});if(condition==='low'){s.person.hunger=25;s.person.energy=0;s.wild.berries=0;}if(condition==='full'){for(const k of Object.keys(s.stock))s.stock[k]=s.cap[k]||0;s.stock.salad=0;s.stock.stew=0;}
 let minH=100,minE=100,held=null,paused=null;
 for(let i=0;i<20*M.DAY*4;i++){
  if(condition==='paused'&&i===1600){paused=Object.keys(s.fac).find(k=>s.fac[k].site);if(paused){M.pauseProject(s,paused);held=structuredClone(s.fac[paused].site);}}
  if(paused&&i===2000){assert.deepEqual(s.fac[paused].site,held);M.pauseProject(s,paused,false);}
  if(condition==='interrupted'&&i===1600)M.setOrder(s,'rest');if(condition==='interrupted'&&i===2000)M.setOrder(s,null);
  M.tickHomestead(s);minH=Math.min(minH,s.person.hunger);minE=Math.min(minE,s.person.energy);
  for(const [k,n] of Object.entries(s.stock))assert.ok(Number.isFinite(n)&&n>=0,`${condition} ${k}`);
  if(reload&&i%503===0){const raw=M.saveHomestead(s),r=M.loadHomestead(raw);assert.ok(r.ok,r.error);assert.equal(M.saveHomestead(r.state),raw);s=r.state;}
 }
 assert.equal(lifeStage(s),'安居',`${personality}/${condition}`);assert.ok(minH>0);assert.ok(s.person.energy>0&&s.person.leisure>0);assert.ok(!s.helper&&!s.visitor.injury);return {s,minH,minE};}
test('A10 three personalities x five conditions x20 days and same-state reload controls',()=>{for(const personality of ['quiet','sociable','diligent'])for(const condition of ['fresh','low','full','interrupted','paused']){const a=scenario(personality,condition,true),b=scenario(personality,condition,false);assert.deepEqual(a,b);console.log('A10 long',JSON.stringify({personality,condition,days:20,minH:a.minH,minE:a.minE,completed:a.s.autonomy.completed,leisure:a.s.person.leisure}));}});
test('A10 fixed five command seeds x20000 ticks exact material, meals, XP and reload ledger',()=>{for(const seed of [1,2,3,4,5]){const r=autonomyTraffic(seed,{chooseMeals:true,chooseIntents:true});assert.ok(r.minH>0&&r.minE>0,JSON.stringify(r));console.log('A10 traffic',JSON.stringify(r));}});
test('A10 zero command full development is identical across .1/.25/1 time slicing',()=>{const states=[];for(const dt of [.1,.25,1]){const s=M.createHomestead({mode:'solo',autonomy:true});for(let i=0;i<2400/dt;i++)M.tickHomestead(s,dt);states.push(M.saveHomestead(s));}assert.equal(states[0],states[1]);assert.equal(states[1],states[2]);});
