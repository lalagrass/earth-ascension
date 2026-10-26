import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecentEvents, eventView } from '../contract.mjs';
import { createOfficialEventAdapter, createGrokEventAdapter, createGPTEventAdapter } from '../adapters.mjs';
import { recentHtml } from '../render.mjs';
import { createGeminiCore } from '../../scene-shared/checks/cores.mjs';
import { createWorld, command, step } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/world.mjs';
import { createState, tick, setOrder } from '../../scene-shared/sources/grok/solo-sect/src/sim.mjs';
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);for(const v of Object.values(o))freeze(v);}return o;};
const sort=rows=>rows.toSorted((a,b)=>a.id.localeCompare(b.id));
for(const fixed of [false,true])test(`${fixed?'fixed Gemini':'official'} real events preserve authority, time, dedup, batched IDs and event-local cause`,()=>{
  const a=createGeminiCore(fixed),b=createGeminiCore(fixed),read=createOfficialEventAdapter({getModel:()=>a.model,fixed}),batch=createOfficialEventAdapter({getModel:()=>b.model,fixed}),cache=createRecentEvents();
  read.snapshot();batch.snapshot();
  for(const x of [a,b])assert.ok(x.model.dispatch('work:herb','cousin').ok);
  const all=[],other=[];
  for(let n=0;n<14000;n++){
    a.model.step();b.model.step();
    if(n%71===0){const before=JSON.stringify(a.model.exportState(Infinity)),s=freeze(read.snapshot());all.push(...s.events);cache.ingest(s);cache.ingest(s);assert.equal(JSON.stringify(a.model.exportState(Infinity)),before);assert.deepEqual(read.snapshot().events,[]);}
    if(n%503===0)other.push(...batch.snapshot().events);
  }
  all.push(...read.snapshot().events);other.push(...batch.snapshot().events);
  assert.deepEqual(sort(all),sort(other));assert.deepEqual(a.model.exportState(Infinity),b.model.exportState(Infinity));
  const trip=all.find(e=>e.kind==='trip'&&e.actors.includes('cousin'));assert.ok(trip);assert.equal(trip.tick,a.model.state.log.find(e=>e.kind==='trip'&&e.person==='cousin').tick);assert.match(trip.unit,/60Hz/);assert.equal(trip.facility,'rack');assert.equal(trip.result.value.job,'herb');assert.equal(trip.reason.availability,'unknown');
  assert.ok(cache.list({actorId:'hero',category:'work'}).every(e=>e.actors.includes('hero')&&e.category==='work'));
  const before=a.model.exportState(Infinity);freeze(a.model.state);read.snapshot();assert.deepEqual(a.model.exportState(Infinity),before,'frozen core can be observed');
});
test('official existing training records expose completed units and actual learned result without inferred cause',()=>{
 const {model}=createGeminiCore(),r=createOfficialEventAdapter({getModel:()=>model});r.snapshot();assert.ok(model.dispatch('train','hero').ok);
 for(let n=0;n<20000&&!model.view().people.hero.train01.adept;n++)model.step();
 const before={core:model.exportState(Infinity),train:structuredClone(model.train01.state)},rows=r.snapshot().events;
 assert.equal(rows.filter(e=>e.stream==='train01'&&e.kind==='unit').length,6);
 const learned=rows.find(e=>e.kind==='palm:skill'&&e.result.value.src==='train');assert.ok(learned);assert.equal(learned.action,'basic-palm:first');assert.equal(learned.result.value.skill,'adept');assert.equal(learned.reason.availability,'unknown');
 assert.deepEqual({core:model.exportState(Infinity),train:structuredClone(model.train01.state)},before);
});
test('true GPT native journal IDs, native 20Hz time, ring replay and paired world/RNG remain exact',()=>{
 const a=createWorld({seed:11}),b=createWorld({seed:11}),r=createGPTEventAdapter({getWorld:()=>a}),cache=createRecentEvents();const first=r.snapshot();cache.ingest(first);cache.ingest(first);assert.equal(cache.size,first.events.length);assert.ok(first.events[0].id.endsWith(a.journal[0].id));
 for(const w of [a,b])assert.ok(command(w,{type:'task',actor:'leader',kind:'gather',args:{item:'wood'}}).ok);
 const rows=[];for(let n=0;n<3000;n++){step(a);step(b);if(n%79===0){const before=JSON.stringify(a);const s=r.snapshot();rows.push(...s.events);cache.ingest(s);assert.equal(JSON.stringify(a),before);}}
 rows.push(...r.snapshot().events);assert.deepEqual(a,b);assert.ok(rows.some(e=>e.kind==='harvest'));assert.ok(rows.every(e=>e.unit.startsWith('20Hz')));assert.ok(rows.every(e=>a.journal.some(x=>e.id.endsWith(':'+x.id))||e.tick<a.journal[0].tick));
});
test('true Grok log carries native seconds/classified actor only, observes reversed native ring without inventing action or cause',()=>{
 const a=createState(11),b=createState(11),r=createGrokEventAdapter({getState:()=>a}),rows=[...r.snapshot().events];for(const s of [a,b])setOrder(s,s.ds[0].id,'water');
 for(let n=0;n<1800;n++){tick(a,.25);tick(b,.25);if(n%19===0){const before=JSON.stringify(a);rows.push(...r.snapshot().events);assert.equal(JSON.stringify(a),before);assert.deepEqual(r.snapshot().events,[]);}}
 rows.push(...r.snapshot().events);assert.deepEqual(a,b);assert.ok(rows.length>1);assert.ok(rows.every(e=>e.unit.includes('整秒')&&e.action===null&&e.facility===null&&e.reason.availability==='unknown'));assert.equal(new Set(rows.map(e=>e.id)).size,rows.length);
});
test('mask before cache/filter/link/HTML; hidden native actors never expose payload or structured metadata',()=>{
 const e=eventView({id:'safe',source:'test',stream:'log',sequence:1,tick:9,unit:'原tick',kind:'secret-kind',actors:['secret-actor'],facility:'secret-fac',action:'secret-art',result:'secret-result',reason:'secret-cause',visibility:'hidden'}),c=createRecentEvents();c.ingest({source:'test',epoch:1,events:[e]});const html=recentHtml(c.list());assert.ok(!JSON.stringify(c.list()).includes('secret-'));assert.ok(!html.includes('secret-'));assert.equal(c.list({actorId:'secret-actor'}).length,0);assert.equal(e.result.availability,'hidden');
 const w=createWorld({seed:11}),r=createGPTEventAdapter({getWorld:()=>w});r.snapshot();w.journal.push({id:'hidden-native',type:'growth',tick:w.tick,actors:['rat.1'],art:'secret-art',U:99,reason:'secret-cause'});const hidden=r.snapshot().events[0];assert.equal(hidden.visibility,'hidden');assert.ok(!JSON.stringify(hidden).includes('secret-'));
});
test('hidden GPT event existence/time never reaches player rows, filters or counts; cursor still consumes replay',()=>{
 const w=createWorld({seed:11}),r=createGPTEventAdapter({getWorld:()=>w}),cache=createRecentEvents();cache.ingest(r.snapshot());
 const publicRows=cache.list(),publicCount=cache.size;
 w.journal.push({id:'private-event-unique',type:'growth',tick:987654321,actors:['rat.1'],art:'secret-art',U:99,reason:'secret-cause'});
 const hidden=r.snapshot();assert.equal(hidden.events.length,1);assert.equal(hidden.events[0].visibility,'hidden');
 cache.ingest(hidden);cache.ingest(hidden);
 assert.deepEqual(cache.list(),publicRows);assert.equal(cache.size,publicCount);assert.equal(cache.dedupSize,publicCount);
 assert.deepEqual(cache.list({actorId:'rat.1'}),[]);assert.deepEqual(cache.list({category:'martial'}),[]);
 const html=recentHtml(cache.list(),{size:cache.size});assert.ok(!html.includes('987654321'));assert.ok(!html.includes('private-event-unique'));assert.ok(!html.includes('secret-'));assert.ok(!html.includes('hidden'));
 const directHtml=recentHtml(hidden.events,{size:1});assert.ok(!directHtml.includes('<time>'));assert.ok(!directHtml.includes('987654321'));assert.ok(directHtml.includes('此人 0／快取 0'));
 assert.deepEqual(r.snapshot().events,[],'hidden native ring record cannot replay');
});
test('UI bounds and repeated evicted batch never replay, core switch/reset isolate identity, repeated same tick records stay distinct',()=>{
 const c=createRecentEvents({capacity:3}),records=Array.from({length:250},(_,i)=>eventView({id:`a:${i}`,source:'a',stream:'log',sequence:i+1,tick:i,unit:'tick',kind:'event',actors:['hero'],result:i})),snapshot={source:'a',epoch:1,events:records};c.ingest(snapshot);const saved=c.list();c.ingest(snapshot);assert.deepEqual(c.list(),saved);assert.equal(c.size,3);assert.equal(c.dedupSize,3);assert.equal(c.cursorSize,1);
 c.ingest({source:'b',epoch:1,events:[]});assert.equal(c.size,0);c.ingest(snapshot);c.ingest({source:'a',epoch:2,events:[]});assert.equal(c.size,0);
 let {model}=createGeminiCore();const r=createOfficialEventAdapter({getModel:()=>model});r.snapshot();model.state.log.push({tick:0,person:'hero',kind:'rest'},{tick:0,person:'hero',kind:'rest'});const duplicate=r.snapshot();assert.equal(new Set(duplicate.events.map(e=>e.id)).size,2);assert.equal(r.snapshot().events.length,0);
 model=createGeminiCore().model;const fresh=r.snapshot();assert.notEqual(fresh.epoch,duplicate.epoch);assert.equal(fresh.events.length,0);r.reset();assert.equal(r.snapshot().events.length,0);
});
test('public event text escapes original public content and has no causal inference',()=>{
 const e=eventView({id:'x',source:'s',stream:'log',sequence:1,tick:1,unit:'s',kind:'<img src=x>',actors:['<script>'],result:'<script>alert(1)</script>'});const html=recentHtml([e]);assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('可證原因：未知'));
});
