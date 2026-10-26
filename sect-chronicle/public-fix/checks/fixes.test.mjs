import test from 'node:test';
import assert from 'node:assert/strict';
import { Container, Texture } from '../../experiments/water-carry/demo/vendor/pixi.min.mjs';
import { createSceneRenderer } from '../../scene-shared/renderer.mjs';
import { createGPTAdapter, gptDefinition } from '../../scene-shared/adapters/gpt.mjs';
import { createGPTEventAdapter } from '../../event-view/adapters.mjs';
import { createRecentEvents } from '../../event-view/contract.mjs';
import { createWorld } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/world.mjs';
import { visibleEntity } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/view.mjs';
import { Q } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/data.mjs';
import { gptCard } from '../../character-card/gpt.mjs';
import { geminiCard } from '../../character-card/gemini.mjs';
import { createGeminiCore } from '../../scene-shared/checks/cores.mjs';
const appearance = () => ({asset:'dot',frame:0,anchor:{x:.5,y:1},body:{x:-8,y:-20,w:16,h:20}});
test('F1 original GPT visibility controls the same renderer, pick and card; only original LOS changes reveal actors',()=>{
 const world=createWorld({seed:11}),adapter=createGPTAdapter({world,appearance});
 const renderer=createSceneRenderer({stage:new Container(),definition:{...gptDefinition(),layers:[]},bindings:{texture:()=>Texture.EMPTY}});
 const hidden=Object.values(world.people).filter(p=>['wild','cave'].includes(p.residence)&&!visibleEntity(world,p));
 assert.ok(hidden.length,'original opening contains genuinely hidden field/cave actors');
 const before=structuredClone(world),snapshot=adapter.snapshot();renderer.render(snapshot);
 for(const p of hidden){assert.equal(snapshot.actors.some(a=>a.id===p.id),false);assert.equal(renderer.actors.has(p.id),false);assert.notEqual(renderer.pick(p.x/Q,p.y/Q-8,1),p.id);assert.equal(gptCard(world,p.id),null);}
 assert.deepEqual(world,before,'projection/render/pick leave original visibility, LOS and journal unchanged');
 const target=hidden[0],resident=world.people.leader;
 // A bounded visibility fixture moves only the observer at the original map;
 // no production core/LOS/discovery function is replaced.
 resident.x=target.x;resident.y=target.y;assert.equal(visibleEntity(world,target),true);
 const revealed=adapter.snapshot();renderer.render(revealed);assert.ok(renderer.actors.has(target.id));assert.ok(gptCard(world,target.id));
 // At overlapping feet, pick may choose either visible person; isolate the
 // snapshot actor in the same production picker without altering authority.
 assert.equal(revealed.actors.some(a=>a.id===target.id),true);
 resident.x=before.people.leader.x;resident.y=before.people.leader.y;
 renderer.render(adapter.snapshot());assert.equal(renderer.actors.has(target.id),false);renderer.destroy();
});
test('F1 scene raw journal cannot bypass #351 hidden-event policy, leak existence/time or replay on reveal',()=>{
 const w=createWorld(),a=createGPTAdapter({world:w,appearance}),r=createGPTEventAdapter({getWorld:()=>w}),cache=createRecentEvents();a.snapshot();cache.ingest(r.snapshot());
 const p=Object.values(w.people).find(p=>['wild','cave'].includes(p.residence));
 for(const e of [
  {id:'private-wild',type:'growth',tick:987654321,actors:[p.id],reason:'SECRET-WILD'},
  {id:'private-explicit',type:'growth',tick:987654322,actors:['leader'],visibility:'hidden',reason:'SECRET-EXPLICIT'},
  {id:'private-missing',type:'growth',tick:987654323,actors:['missing'],reason:'SECRET-MISSING'},
  {id:'public',type:'harvest',tick:w.tick,actors:['leader'],item:'herb',n:1},
 ])w.journal.push(e);
 const before=structuredClone(w),s=a.snapshot();assert.deepEqual(w,before);
 assert.equal(s.events.length,1);assert.equal(s.events[0].kind,'harvest');assert.ok(!JSON.stringify(s).includes('98765432'));assert.ok(!JSON.stringify(s).includes('SECRET-'));
 const originalSize=cache.size;cache.ingest(r.snapshot());assert.equal(cache.size,originalSize+1);assert.equal(cache.list().filter(e=>e.id.endsWith(':public')).length,1);
 w.people.leader.x=p.x;w.people.leader.y=p.y;assert.equal(visibleEntity(w,p),true);
 assert.deepEqual(a.snapshot().events,[],'revealing an actor cannot replay its consumed hidden event');
 assert.deepEqual(r.snapshot().events,[]);
});
function teaPair(){const a=createGeminiCore().model,b=createGeminiCore().model;
 for(const m of [a,b]){m.dispatch('restAfterTrip','hero');assert.ok(m.dispatch('work:herb','cousin').ok);}
 let n=0;while(a.view().herbs<1&&n++<15000){a.step();b.step();}
 assert.ok(n<15000);for(const m of [a,b])assert.ok(m.dispatch('tea','hero').ok);return [a,b];}
test('F2 real tea phases source current/target/next and original event cause, never command-disable reason; reassign/stop remain native',()=>{
 const [m,twin]=teaPair(),seen=new Set();let n=0;
 while(n++<6000){
  m.step();twin.step();const p=m.view().people.hero,c=geminiCard(m,'hero');
  if(p.tea.active){seen.add(p.tea.mode||'pending');assert.equal(c.action.id,'tea');assert.equal(c.action.current,p.tea.now);assert.equal(c.action.phase,p.tea.mode||'pending');
   assert.equal(c.action.target,p.tea.mode==='fromTea'?'院中':'茶座');assert.match(c.action.reason.value,/玩家指派|喝完茶/);assert.notEqual(c.action.reason.value,p.tea.reason);assert.equal(c.action.next,p.tea.next);
   if(p.tea.mode==='brew')assert.equal(c.action.progress.value,p.tea.brewK);if(p.tea.mode==='sip')assert.equal(c.action.progress.value,p.tea.sipK);
   const before=m.exportState(Infinity);for(let i=0;i<5;i++)geminiCard(m,'hero');assert.deepEqual(m.exportState(Infinity),before);
  }
  if(seen.has('fromTea')&&!p.tea.active)break;
 }
 assert.ok(['toTea','brew','sip','fromTea'].every(k=>seen.has(k)));assert.deepEqual(m.exportState(Infinity),twin.exportState(Infinity));
 for(const owner of [m,twin])assert.ok(owner.dispatch('work:herb','hero').ok);
 assert.equal(geminiCard(m,'hero').action.id,'herb');assert.equal(geminiCard(m,'hero').action.target,'採藥');
 for(const owner of [m,twin])assert.ok(owner.dispatch('restAfterTrip','hero').ok);
 assert.equal(geminiCard(m,'hero').action.reason.value,m.view().people.hero.life02?.why||m.view().people.hero.why||null);
 const view=m.view();view.people.hero.tea={...view.people.hero.tea,active:true,now:'煮茶',mode:'brew',reason:'DO-NOT-USE',next:null};view.teaEvents=[];
 assert.equal(geminiCard({view:()=>view,actions:id=>m.actions(id)},'hero').action.reason.availability,'unknown');
});
test('F2 cancelling while brewing uses the actual cancel event and returns to the native reassigned activity',()=>{
 const [m,twin]=teaPair();let n=0;while(m.view().people.hero.mode!=='brew'&&n++<6000){m.step();twin.step();}assert.ok(n<6000);
 for(const owner of [m,twin])assert.ok(owner.dispatch('work:herb','hero').ok);
 const c=geminiCard(m,'hero');assert.equal(c.action.id,'tea');assert.equal(c.action.phase,'fromTea');assert.match(c.action.reason.value,/玩家改令.*煮茶中止/);assert.equal(c.action.next,null,'no stale standby promise after newer work command');
 n=0;while(m.view().people.hero.tea.active&&n++<6000){m.step();twin.step();}assert.ok(n<6000);
 assert.equal(geminiCard(m,'hero').action.id,'herb');assert.deepEqual(m.exportState(Infinity),twin.exportState(Infinity));
});
