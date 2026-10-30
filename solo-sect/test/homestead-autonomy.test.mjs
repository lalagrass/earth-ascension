import test from 'node:test';import assert from 'node:assert/strict';
import * as M from '../src/homestead.mjs';
const fresh=personality=>M.createHomestead({mode:'solo',autonomy:true,personality});
const run=(s,t,dt=.25)=>{for(let i=0;i<Math.round(t/dt);i++)M.tickHomestead(s,dt);return s;};
test('A01 zero command shelter built, used, low needs survive and no legacy auto build',()=>{
 for(const personality of ['quiet','diligent','sociable']){const s=fresh(personality);let used=false,min=100;for(let i=0;i<2400;i++){M.tickHomestead(s);if(s.fac.hut.stage&&s.person.task?.act==='rest')used=true;min=Math.min(min,s.person.hunger);}assert.ok(s.fac.hut.stage>=1);assert.ok(used);assert.ok(min>0);assert.ok(s.autonomy.completed.includes('shelter'));}
 const old=M.createHomestead({mode:'solo'});run(old,600);assert.equal(old.fac.hut.stage,0);
});
test('A01 pause, in-transit reload and time slicing preserve world',()=>{
 const s=fresh();while(s.person.task?.phase!=='deliver')M.tickHomestead(s);
 const loaded=M.loadHomestead(M.saveHomestead(s));assert.ok(loaded.ok,loaded.error);assert.deepEqual(run(loaded.state,300),run(structuredClone(s),300));
 M.pauseProject(s,'hut');const before=structuredClone(s.fac.hut.site);run(s,100);assert.deepEqual(s.fac.hut.site,before);M.pauseProject(s,'hut',false);run(s,300);assert.ok(s.fac.hut.stage>=1);
 assert.deepEqual(run(fresh(),600,1),run(fresh(),600,.1));
 const raw=JSON.parse(M.saveHomestead(fresh()));delete raw.autonomy;assert.equal(M.loadHomestead(JSON.stringify(raw)).state.autonomy,null);raw.autonomy={version:1,goal:'invented',since:0,completed:[]};assert.equal(M.loadHomestead(JSON.stringify(raw)).ok,false);
});

test('A01 reject future and duplicate planning facts',()=>{const s=fresh();s.autonomy.since=1;assert.equal(M.loadHomestead(M.saveHomestead(s)).ok,false);s.autonomy.since=0;s.autonomy.completed=['shelter','shelter'];assert.equal(M.loadHomestead(M.saveHomestead(s)).ok,false);});

test('A02 zero command hot food is grown, cooked and really eaten',()=>{for(const personality of ['quiet','sociable','diligent']){const s=fresh(personality);run(s,1200);assert.ok(s.fac.garden.stage&&s.fac.kitchen.stage);assert.ok(s.autonomy.warmMeals>0);assert.ok(s.person.skills.farm>0&&s.person.skills.cook>0);assert.ok(s.autonomy.completed.includes('hotFood'));const r=M.loadHomestead(M.saveHomestead(s));assert.ok(r.ok,r.error);assert.deepEqual(run(r.state,50),run(structuredClone(s),50));}});

test('A03 zero command real XP crosses comfort prerequisites and bed gets used',()=>{for(const personality of ['quiet','diligent','sociable']){const s=fresh(personality);let maxSites=0;for(let i=0;i<7200;i++){M.tickHomestead(s);maxSites=Math.max(maxSites,Object.values(s.fac).filter(f=>f.site).length);}assert.equal(maxSites,1);assert.equal(s.fac.bed.stage,2);assert.ok(s.fac.workbench.stage);assert.ok(s.autonomy.comfortRests>0);assert.ok(s.autonomy.completed.includes('comfort'));assert.equal(s.person.skills.build,40);assert.ok(M.loadHomestead(M.saveHomestead(s)).ok);}});

test('A03 pause bed crafting, rest then reload resumes and tries completed bed',()=>{let s=fresh();while(!(s.person.task?.step==='craft'&&s.fac.bed.site?.crafted>=2))M.tickHomestead(s);M.pauseProject(s,'bed');run(s,100);const r=M.loadHomestead(M.saveHomestead(s));assert.ok(r.ok,r.error);s=r.state;M.pauseProject(s,'bed',false);run(s,600);assert.ok(s.autonomy.comfortRests>0);assert.ok(s.autonomy.completed.includes('comfort'));});

test('A04 personality orders diverge without locking anyone out',()=>{const orders=[];for(const personality of ['quiet','sociable','diligent']){const s=fresh(personality);let min=100;for(let i=0;i<9600;i++){M.tickHomestead(s);min=Math.min(min,s.person.hunger);}assert.ok(min>0);assert.ok(s.fac.bed.stage===2&&s.fac.bench.stage&&s.fac.flowers.stage&&s.fac.store.stage&&s.fac.kitchen.stage===2);orders.push(s.autonomy.completed.join('/'));}assert.equal(new Set(orders).size,3);});
