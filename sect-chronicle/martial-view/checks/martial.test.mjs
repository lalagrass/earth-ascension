import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { martialEntry } from '../contract.mjs';
import { resolveMotion, motionIntent } from '../motion.mjs';
import { martialHtml } from '../render.mjs';
import { geminiCard } from '../../character-card/gemini.mjs';
import { grokCard } from '../../character-card/grok.mjs';
import { gptCard } from '../../character-card/gpt.mjs';
import { field } from '../../character-card/contract.mjs';
import { createGeminiCore } from '../../scene-shared/checks/cores.mjs';
import { createGeminiAdapter } from '../../scene-shared/adapters/gemini.mjs';
import { createEventCursor } from '../../scene-shared/events.mjs';
import { createAnimator } from '../../experiments/water-carry/template/animator.mjs';
import { createWorld } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/state.mjs';
import { createState } from '../../scene-shared/sources/grok/solo-sect/src/sim.mjs';
const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const template = json('../../experiments/water-carry/template/actions.json');
const sheets = Object.fromEntries(['hero','cousin'].map(id => [id, json(`../../experiments/water-carry/demo/assets/art184-production/${id}.json`)]));
const animators = Object.fromEntries(Object.entries(sheets).map(([id,s]) => [id,createAnimator(template,s)]));
function resolve(id,p,geometry) { const skin=sheets[id].meta;return resolveMotion(p,{animator:animators[id],skin,at:geometry.of(id,p),anchor:{x:skin.anchorPx.x/skin.frameSize.w,y:skin.anchorPx.y/skin.frameSize.h}}); }
test('martial fields distinguish learned/proficiency/execution and mask missing knowledge before rendering',()=>{
 const m=martialEntry({id:'test',name:'<script>',source:'source',proficiency:field('xp',0,{source:'source'}),
  conditions:{special:{result:field('condition',987654,{source:'source',availability:'hidden'})}}});
 assert.equal(m.proficiency.value,0);assert.equal(m.execution.availability,'unknown');assert.equal(m.risk.availability,'unknown');
 assert.equal(m.conditions.length,4);assert.equal(m.conditions[1].result.availability,'unsupported');
 const html=martialHtml({martial:[m]});assert.ok(!html.includes('<script>'));assert.ok(!JSON.stringify(m).includes('987654'));assert.match(html,/未知不表示安全/);
});
test('three true cores preserve native learned bindings/units and never grant skills or expose hidden gates',()=>{
 const {model}=createGeminiCore(),g=createWorld(),k=createState();k.ds[0].rootKnown=false;k.ds[0].wu=987654;
 for(const [owner,get] of [[model,()=>geminiCard(model,'hero')],[g,()=>gptCard(g,'leader')],[k,()=>grokCard(k,k.ds[0].id)]]) {
  const before=JSON.stringify(owner===model?model.exportState(Infinity):owner),c=get();assert.ok(c.martial.length);
  assert.equal(JSON.stringify(owner===model?model.exportState(Infinity):owner),before);assert.ok(!JSON.stringify(c).includes('987654'));
  for(const m of c.martial){assert.equal(m.learned.availability,'known');assert.equal(m.conditions.length,4);assert.equal(m.risk.availability,'unknown');}
 }
 assert.equal(geminiCard(model,'hero').martial[0].id,'basic-palm:first');
 assert.match(gptCard(g,'leader').martial[0].proficiency.unit,/U／F／I/);
 assert.equal(grokCard(k,k.ds[0].id).martial[0].proficiency.unit,'原生XP');
 const before=JSON.stringify(k);for(let i=0;i<20;i++)grokCard(k,k.ds[0].id);assert.equal(JSON.stringify(k),before);
});
test('two real skins share walk/load/palm meanings, keep per-frame foot/socket geometry and support clip override/fallback',()=>{
 const at={x:101,y:202,face:-1,travelled:42};
 for(const id of ['hero','cousin']) {
  const skin=sheets[id].meta,animator=animators[id];
  for(const ph of ['down','up','herbOut','herbBack']){
   const p={mode:'carry',phase:{name:ph,k:.4},tripLevel:3},before=structuredClone(p);
   const x=resolveMotion(p,{animator,skin,at});assert.deepEqual(p,before);assert.equal(x.face,-1);assert.deepEqual(x.motion.attachments.foot,[0,0]);
   if(['down','up'].includes(ph)){assert.ok(x.motion.attachments.pole);assert.ok(Math.abs(x.motion.attachments.pole[0])<20);}
  }
  const p={mode:'windup',palm:'novice',palmStep:{steps:4}};
  const x=resolveMotion(p,{animator,skin,at});assert.equal(x.motion.actionId,'martial.basic-palm');assert.equal(x.motion.phase,'windup');
  assert.deepEqual(x.motion.attachments.shoulder,skin.palmShoulder.herbHand);
  const breath=resolveMotion({mode:'train',palm:'novice',train01:{cyc:{phase:'breath',steps:1}}},{animator,skin,at});
  assert.equal(breath.index,0,'stationary breath keeps original standing frame, not a walking-distance cycle');
  const override=resolveMotion(p,{animator,skin:{...skin,clips:{'martial.basic-palm':{windup:{clip:'stretch',fx:'vector-palm'}}}},at});assert.equal(override.action,'stretch');
  const absent=resolveMotion({...p,palm:null},{animator,skin,at});assert.equal(absent.motion.availability,'unsupported');assert.equal(absent.palm,null);assert.equal(absent.action,'idle');assert.match(absent.motion.fallback,/缺技能不授予/);
  const fallback=resolveMotion(p,{animator:createAnimator(template,{animations:{idle:['idle-0']}}),skin,at});assert.equal(fallback.motion.availability,'unsupported');assert.equal(fallback.action,'idle');
  assert.equal(resolveMotion(p,{animator,skin,at,intent:{actionId:'unprovided',phase:'active'}}).action,'idle');
 }
 assert.notDeepEqual(sheets.hero.meta.palmShoulder,sheets.cousin.meta.palmShoulder);
});
function run(batch,actorId) {
 const {model,geometry}=createGeminiCore(),baseline=createGeminiCore().model,cursor=createEventCursor();
 const adapter=createGeminiAdapter({getModel:()=>model,geometry,source:'test',appearance:(id,p)=>{const x=resolve(id,p,geometry);return {asset:id,frame:x?.frame||'idle-0',anchor:{x:.5,y:1},body:{x:-10,y:-40,w:20,h:40},motion:x?.motion};}});
 for(const m of [model,baseline])assert.ok(m.dispatch('restAfterTrip',actorId==='hero'?'cousin':'hero').ok);
 for(const m of [model,baseline])assert.ok(m.dispatch('clean',actorId).ok);
 let steps=0,events=[],phases=new Set();
 while(steps<2200){
  for(let i=0;i<batch&&steps<2200;i++,steps++){
   adapter.observeStep();baseline.step();const p=model.view().people[actorId];const intent=motionIntent(p);if(intent?.actionId==='martial.basic-palm')phases.add(intent.phase);
  }
  const snapshot=adapter.snapshot();events.push(...cursor.consume(snapshot));assert.equal(cursor.consume(snapshot).length,0);
  const before=model.exportState(Infinity);
  for(let n=0;n<3;n++){for(const id of ['hero','cousin'])martialHtml(geminiCard(model,id));const paused=adapter.snapshot({paused:true});assert.equal(cursor.consume(paused).length,0);}
  assert.deepEqual(model.exportState(Infinity),before,'paused reads, repeated frames and selection leave authority unchanged');
 }
 assert.deepEqual(model.exportState(Infinity),baseline.exportState(Infinity),'full original result/log/RNG state unchanged');
 const palms=events.filter(e=>e.kind.startsWith('palm:'));
 assert.ok(palms.some(e=>e.kind==='palm:hit'));assert.deepEqual([...phases].sort(),['recover','strike','windup']);
 assert.equal(new Set(events.map(e=>e.id)).size,events.length);return {state:model.exportState(Infinity),events,palms};
}
test('actual two-person clean flow keeps outcome and once-only events under pause/selection/1x and 4x batches',()=>{
 for(const id of ['hero','cousin']){const a=run(1,id),b=run(4,id);assert.deepEqual(a,b);}
});
