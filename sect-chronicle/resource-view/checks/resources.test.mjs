import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiCore } from '../../scene-shared/checks/cores.mjs';
import { createWorld,step,command } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/world.mjs';
import { availableQty,qty } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/state.mjs';
import { createState } from '../../scene-shared/sources/grok/solo-sect/src/sim.mjs';
import { officialResources,OFFICIAL_SHA } from '../official.mjs';
import { gptResources } from '../gpt.mjs';
import { grokResources } from '../grok.mjs';
import { resourceView,field,RESOURCE_FIELDS } from '../contract.mjs';
import { resourcesHtml } from '../render.mjs';
const full=m=>({authority:m.exportState(Infinity),tea:m.tea.snapshot(),home02:m.home02.snapshot()});
const get=(m,id)=>officialResources(m).find(r=>r.nativeId===id);
test('official per-field source, known zero, native units and detached query; missing view remains unknown',()=>{
 const m=createGeminiCore().model,before=full(m),rows=officialResources(m);
 assert.equal(rows.length,3);assert.equal(get(m,'herb').fields.amount.value,0);assert.equal(get(m,'wood').fields.amount.value,0);
 assert.deepEqual(rows.map(r=>r.unit),['擔','份','捆']);
 for(const r of rows)for(const k of RESOURCE_FIELDS){assert.equal(r.fields[k].availability,'known');assert.match(r.fields[k].source,new RegExp(OFFICIAL_SHA));assert.ok(r.fields[k].unit);}
 rows[0].fields.amount.value=999;rows[0].commands.push({id:'fake'});resourcesHtml(officialResources(m));assert.deepEqual(full(m),before);
 const v=m.view();delete v.home02;delete v.teaAvail;const sparse={view:()=>v,actions:id=>m.actions(id)};
 assert.equal(get(sparse,'wood').fields.capacity.availability,'unknown');assert.equal(get(sparse,'water').fields.available.availability,'unknown');
});
test('real long water/herb delivery, tea reservation/cancel/consumption preserve original full state without double count',()=>{
 const a=createGeminiCore().model,b=createGeminiCore().model;
 for(const m of [a,b]){for(const id of ['hero','cousin'])m.dispatch('restAfterTrip',id);assert.ok(m.dispatch('work:water','hero').ok);assert.ok(m.dispatch('work:herb','cousin').ok);}
 const observed=new Set();let n=0;
 function advance(until,max=18000){let i=0;while(!until()&&i++<max){a.step();b.step();n++;if(n%137===0){const before=full(a);const rows=officialResources(a);resourcesHtml(rows);assert.deepEqual(full(a),before);for(const r of rows)if(r.fields.incoming.value>0)observed.add(r.nativeId);}}assert.ok(i<max,'original route must finish within bounded steps');}
 advance(()=>a.view().people.hero.done.water>0&&a.view().people.cousin.done.herb>0);
 assert.ok(n>2000,'long original commutes really happened');assert.ok(observed.has('water')&&observed.has('herb'));
 for(const m of [a,b])assert.ok(m.dispatch('tea','hero').ok);
 advance(()=>a.view().people.hero.tea.mode==='brew');
 const water=get(a,'water'),herb=get(a,'herb'),v=a.view();
 for(const [r,id] of [[water,'water'],[herb,'herb']]){assert.equal(r.fields.reserved.value,1);assert.equal(r.fields.available.value,v.teaAvail[id]);}
 assert.equal(herb.fields.amount.value,v.herbs);assert.equal(herb.fields.incoming.value,v.herbInFlight);
 assert.equal(herb.fields.available.value,herb.fields.amount.value-herb.fields.reserved.value,'original tea avail excludes only its own held consumption, not incoming');
 const amounts=[v.vat,v.herbs];for(const m of [a,b])assert.ok(m.dispatch('teaCancel','hero').ok);
 assert.deepEqual([a.view().vat,a.view().herbs],amounts,'cancel before brew completion consumes nothing');
 assert.equal(get(a,'herb').fields.reserved.value,0);assert.equal(get(a,'herb').fields.available.value,a.view().teaAvail.herb);
 advance(()=>!a.view().people.hero.tea.active);
 for(const m of [a,b])assert.ok(m.dispatch('tea','hero').ok);
 advance(()=>a.view().people.hero.tea.mode==='sip');
 assert.equal(get(a,'water').fields.reserved.value,0);assert.equal(get(a,'herb').fields.reserved.value,0);
 assert.ok(a.view().teaEvents.some(e=>e.kind==='brewed'));
 assert.deepEqual(full(a),full(b),'all world/RNG/log and tea/home02 closures match the twin without reading resources');
});
test('real wood stock/reservation/availability use native HOME02 query, not construction cargo twice',()=>{
 const m=createGeminiCore().model;for(const id of ['hero','cousin'])m.dispatch('restAfterTrip',id);
 assert.ok(m.dispatch('work:wood','cousin').ok);let ticks=0;
 while(m.view().home02.wood<6&&ticks++<60000)m.step();assert.ok(ticks<60000);
 assert.ok(m.dispatch('build','hero').ok);
 let r=get(m,'wood'),h=m.view().home02;assert.equal(r.fields.reserved.value,h.resv);assert.equal(r.fields.reserved.value,6);assert.equal(r.fields.available.value,h.avail);
 while(!m.view().home02.bundle&&ticks++<62000)m.step();assert.ok(ticks<62000);h=m.view().home02;r=get(m,'wood');
 assert.equal(r.fields.incoming.value,h.woodIn);assert.equal(r.fields.amount.value,h.wood);assert.equal(r.fields.reserved.value,0,'withdrawn cargo is no longer a warehouse consumption hold');
 assert.ok(h.bundle.n>0);assert.notEqual(r.fields.incoming.value,m.home02.store().inFlight,'core store return-capacity includes construction bundle; resource incoming deliberately reads exact woodIn only');
});
test('real fixed GPT resource adapter preserves raw unit/scope, destination capacity is not incoming cargo',()=>{
 const a=createWorld({seed:11}),b=createWorld({seed:11}),c={actor:'leader',type:'task',kind:'gather',args:{item:'herb'}};
 assert.ok(command(a,c).ok);assert.ok(command(b,c).ok);let delivered=false,destination=false;
 for(let n=0;n<3200;n++){
  step(a);step(b);if(n%31!==0)continue;
  const before=structuredClone(a),rows=gptResources(a),r=rows.find(r=>r.nativeId==='herb');resourcesHtml(rows);
  assert.equal(r.fields.amount.value,qty(a,'store','herb'));assert.equal(r.fields.available.value,availableQty(a,'store','herb'));
  assert.equal(r.fields.incoming.availability,'unsupported');assert.match(r.unit,/原生計數/);assert.ok(!['擔','份','捆'].includes(r.unit));
  const holds=Object.values(a.reservations);destination ||= holds.some(r=>r.key==='dest:store:herb');
  assert.equal(r.fields.reserved.value,holds.filter(r=>r.key==='source:store:herb').reduce((n,r)=>n+r.n,0));
  delivered ||= a.journal.some(e=>e.type==='transfer'&&e.to==='store'&&e.item==='herb');assert.deepEqual(a,before);
  if(delivered)break;
 }
 assert.ok(destination);assert.ok(delivered,'real harvest and return to original store');assert.deepEqual(a,b);
});
test('third true Grok source capability inventory keeps absent herb cap unknown and task accounting unsupported',()=>{
 const s=createState(11),before=structuredClone(s),rows=grokResources(s),herb=rows.find(r=>r.nativeId==='herb');
 assert.equal(herb.fields.amount.value,s.res.herb);assert.equal(herb.fields.capacity.availability,'unknown');
 assert.equal(rows.find(r=>r.nativeId==='water').fields.capacity.value,s.cap.water);
 for(const r of rows)for(const k of ['incoming','reserved','available'])assert.equal(r.fields[k].availability,'unsupported');
 resourcesHtml(rows);assert.deepEqual(s,before);
});
test('boundary fixtures only: known zero vs unknown/hidden/unsupported, source required and hidden payload masked before renderer',()=>{
 const real=get(createGeminiCore().model,'water');
 for(const availability of ['unknown','hidden','unsupported']){
  const input={namespace:'boundary',sha:OFFICIAL_SHA,nativeId:'test',label:'edge',unit:'native',source:'test source',values:Object.fromEntries(RESOURCE_FIELDS.map(k=>[k,{value:88776655,source:'fixture',availability}])),uses:{value:88776655,source:'fixture',availability}};
  const row=resourceView(input);assert.ok(!JSON.stringify(row).includes('88776655'));assert.ok(!resourcesHtml([row]).includes('88776655'));assert.ok(RESOURCE_FIELDS.every(k=>!Object.hasOwn(row.fields[k],'value')));
 }
 real.availability='hidden';assert.ok(!resourcesHtml([real]).includes('data-resource="water"'));
 assert.throws(()=>resourceView({namespace:'bad'}),/provenance/);
 assert.equal(field('zero',0,{source:'real-known-zero'}).availability,'known');
});
