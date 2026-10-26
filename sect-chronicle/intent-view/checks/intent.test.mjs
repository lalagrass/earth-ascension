import test from 'node:test';import assert from 'node:assert/strict';
import {createOfficialIntentAdapter} from '../official.mjs';import {createGPTIntentAdapter} from '../gpt.mjs';import {intentHtml} from '../render.mjs';
import {createGeminiCore} from '../../scene-shared/checks/cores.mjs';import {geminiCard} from '../../character-card/gemini.mjs';
import {createWorld,step,command} from '../../scene-shared/sources/gpt/solo-sect-gpt/src/world.mjs';import {Q} from '../../scene-shared/sources/gpt/solo-sect-gpt/src/data.mjs';
const setup=()=>{const {model}=createGeminiCore();return {model,adapter:createOfficialIntentAdapter({getModel:()=>model})};};
function send(a,id,native,expected=id){const v=a.snapshot(id),c=v.commands.find(c=>c.nativeId===native);assert.ok(c,native);return a.command({actorId:id,commandId:c.id,payload:c.payload},{expectedActorId:expected});}
test('official projection shares current action and separates one pending, manual stop, auto recovery and known policies without mutation',()=>{
 const {model,adapter}=setup(),before=model.exportState(Infinity),v=adapter.snapshot('hero');
 assert.deepEqual(v.current,geminiCard(model,'hero').action);assert.equal(v.fields.queue.availability,'unsupported');assert.equal(v.policies.length,2);
 for(let i=0;i<20;i++)intentHtml(adapter.snapshot(i%2?'hero':'cousin'));
 assert.deepEqual(model.exportState(Infinity),before);v.fields.workGoal.value='fake';v.commands[0].payload.actorId='fake';assert.equal(model.view().people.hero.job,'water');
 assert.ok(adapter.snapshot('hero').commands.some(c=>c.nativeId==='work:wood'),'all original visible commands retained');
});
test('actual official work/reassign/cancel/manual stop/recovery/resume retains original complete state and no duplicate dispatch',()=>{
 const {model:m,adapter:a}=setup(),t=createGeminiCore().model;
 for(const owner of [m,t])owner.dispatch('restAfterTrip','cousin');
 const both=n=>{const actual=send(a,'hero',n),original=t.dispatch(n,'hero');assert.deepEqual(actual,original);assert.deepEqual(m.exportState(Infinity),t.exportState(Infinity));return actual;};
 both('work:herb');m.step();t.step();both('work:water');assert.equal(m.view().people.hero.pending,'water');assert.match(a.snapshot('hero').fields.pending.value,/挑水/);
 const dup=both('work:water');assert.equal(dup.ok,false);both('cancel');assert.equal(m.view().people.hero.pending,null);
 both('restAfterTrip');let n=0;while(m.view().people.hero.mode!=='seated'&&n++<12000){m.step();t.step();intentHtml(a.snapshot('hero'));}assert.ok(n<12000);
 let trips=m.view().people.hero.trips;for(let i=0;i<1500;i++){m.step();t.step();}assert.equal(m.view().people.hero.trips,trips);assert.equal(m.view().people.hero.rest,'manual');assert.equal(m.view().people.hero.energy,100);
 both('work:herb');n=0;while(m.view().people.hero.rest!=='auto'&&n++<25000){m.step();t.step();if(n%83===0)intentHtml(a.snapshot('hero'));}assert.ok(n<25000,'real work eventually invokes native low-energy recovery');
 assert.equal(a.snapshot('hero').fields.rest.value,'自主恢復');assert.equal(m.view().people.hero.resting,false);n=0;
 while((m.view().people.hero.rest==='auto'||m.view().people.hero.mode!=='carry')&&n++<10000){m.step();t.step();}assert.ok(n<10000,'native auto recovery resumes original work');
 assert.deepEqual(m.exportState(Infinity),t.exportState(Infinity));
});
test('policy commands call only original setters, guard stale payload/person and preserve independent allows and raw core reasons',()=>{
 const {model,adapter}=setup(),t=createGeminiCore().model;const c=adapter.snapshot('hero').commands.find(c=>c.id==='policy:guard:allow');
 assert.equal(adapter.command({actorId:'hero',commandId:c.id,payload:c.payload},{expectedActorId:'cousin'}).ok,false);assert.equal(model.view().people.hero.auto.allow,false);
 assert.ok(adapter.command({actorId:'hero',commandId:c.id,payload:c.payload},{expectedActorId:'hero'}).ok);t.setAuto('hero',{allow:true});
 const frozen=model.exportState(Infinity);assert.equal(adapter.command({actorId:'hero',commandId:c.id,payload:c.payload}).ok,false);assert.deepEqual(model.exportState(Infinity),frozen,'old toggle cannot undo the new setting');
 send(adapter,'hero','setAuto:early');t.setAuto('hero',{react:'early'});send(adapter,'hero','setUpkeep:allow');t.setUpkeep('hero',{allow:true});send(adapter,'hero','setUpkeep:late');t.setUpkeep('hero',{react:'late'});
 assert.equal(model.view().people.cousin.auto.allow,false);assert.deepEqual(model.exportState(Infinity),t.exportState(Infinity));
 const before=model.exportState(Infinity);assert.equal(adapter.command({actorId:'hero',commandId:'dispatch:fake'}).ok,false);assert.deepEqual(model.exportState(Infinity),before);
 const v=adapter.snapshot('hero');assert.equal(v.policies[0].reason.value,model.view().people.hero.auto.text);assert.equal(v.policies[1].reason.value,model.view().people.hero.up.text);
 const command=v.commands.find(c=>c.nativeId==='work:water');assert.equal(command.enabled,false);assert.equal(command.reason,model.actions('hero').find(c=>c.id==='work:water').reason);assert.ok(intentHtml(v).includes(command.reason));
});
test('fixed true GPT uses same HTML and native command with original stop semantics, visibility and missing capability masking',()=>{
 const w=createWorld(),t=createWorld(),a=createGPTIntentAdapter({getWorld:()=>w});const before=structuredClone(w),v=a.snapshot('leader');
 intentHtml(v);assert.deepEqual(w,before);assert.equal(v.fields.recall.availability,'unsupported');assert.equal(v.policies[0].reaction.availability,'unsupported');
 const stop=v.commands.find(c=>c.nativeId==='stop');assert.ok(stop);assert.ok(a.command({actorId:'leader',commandId:stop.id,payload:stop.payload},{expectedActorId:'leader'}).ok);command(t,stop.payload.command);
 assert.equal(w.people.leader.manualStop,true);assert.equal(a.snapshot('leader').fields.stop.value,true);
 for(let i=0;i<200;i++){step(w);step(t);if(i%20===0)intentHtml(a.snapshot('leader'));}assert.deepEqual(w,t);
 const resume=a.snapshot('leader').commands.find(c=>c.nativeId==='resume');assert.ok(a.command({actorId:'leader',commandId:resume.id,payload:resume.payload}).ok);command(t,resume.payload.command);assert.deepEqual(w,t);
 const rat=w.people['rat.1'];rat.x=2300*Q;rat.y=1700*Q;assert.equal(a.snapshot(rat.id),null);
 w.people.leader.secretPersonality='HIDDEN-TALENT';assert.ok(!JSON.stringify(a.snapshot('leader')).includes('HIDDEN-TALENT'));
});
