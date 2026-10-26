import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { field } from '../contract.mjs';
import { geminiCard, geminiCommand } from '../gemini.mjs';
import { gptCard, gptCommand } from '../gpt.mjs';
import { grokCard, grokCommand } from '../grok.mjs';
import { renderCard } from '../render.mjs';
import { portrait } from '../portrait.mjs';
import { createGeminiCore } from '../../scene-shared/checks/cores.mjs';
import { createWorld } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/state.mjs';
import { createState } from '../../scene-shared/sources/grok/solo-sect/src/sim.mjs';
import { createGrokAdapter } from '../../scene-shared/adapters/grok.mjs';
test('zero, unknown, hidden, unsupported; hidden payload absent before UI',()=>{
 const x=['known','unknown','hidden','unsupported'].map(availability=>field('secret',0,{source:'test',availability}));
 assert.equal(x[0].value,0);for(const f of x.slice(1))assert.ok(!Object.hasOwn(f,'value'));
 assert.throws(()=>field('bad',1));assert.equal(new Set(x.map(f=>f.availability)).size,4);
});
test('official / fixed Gemini cards read worker authority and never mutate or infer initial energy',()=>{
 for(const fixed of [false,true]){const {model}=createGeminiCore(fixed);const before=JSON.stringify(model.state);const c=geminiCard(model,'hero',{fixed});
 assert.equal(JSON.stringify(model.state),before);assert.equal(c.action.current,model.view().people.hero.status);
 assert.equal(c.fields.find(f=>f.semanticId==='energy'&&f.layer==='initial').availability,'unknown');
 assert.equal(c.fields.find(f=>f.semanticId==='leg.level'&&f.layer==='initial').value,1);
 c.fields[0].value=-999;assert.notEqual(model.view().people.hero.energy,-999);
 assert.equal(geminiCommand(model,'hero','fake').ok,false);assert.equal(geminiCommand(model,'hero','work:herb').ok,true);
 assert.equal(model.view().people.hero.nextJob,'herb');}
});
test('GPT true world readonly / native units / legal command only',()=>{const w=createWorld(),before=JSON.stringify(w),c=gptCard(w,'leader');assert.equal(JSON.stringify(w),before);assert.equal(c.fields[0].value,10000);assert.equal(c.fields[0].unit,'原生百分之一點');assert.equal(gptCommand(w,'leader','fake').ok,false);assert.ok(c.commands.length);assert.ok(gptCommand(w,'leader',c.commands.find(x=>x.enabled).id));});
test('Grok masking follows rootKnown/known, no inferred initial skills',()=>{const s=createState();const d=s.ds[0];d.rootKnown=false;d.root=987654;d.wu=876543;d.personality=['hidden-secret'];d.known=[];const before=JSON.stringify(s),c=grokCard(s,d.id);assert.equal(JSON.stringify(s),before);const out=JSON.stringify(c);assert.ok(!out.includes('987654'));assert.ok(!out.includes('876543'));assert.ok(!out.includes('hidden-secret'));assert.equal(c.fields.find(f=>f.semanticId==='skills.strength'&&f.layer==='initial').availability,'unknown');assert.equal(grokCommand(s,d.id,'fake').ok,false);assert.equal(grokCommand(s,d.id,'water').ok,true);});
test('Grok source hash closure is unchanged',()=>{const base=new URL('../../scene-shared/sources/grok/',import.meta.url),m=JSON.parse(readFileSync(new URL('manifest.json',base)));for(const [path,hash]of Object.entries(m.files))assert.equal(createHash('sha256').update(readFileSync(new URL(path,base))).digest('hex'),hash,path);});
test('Grok actual core movement uses native positions; snapshot does not mutate',()=>{const s=createState(),id=s.ds[0].id;const adapter=createGrokAdapter({state:s,appearance:()=>({asset:'dot',frame:0,anchor:{x:.5,y:1},body:{x:-10,y:-30,w:20,h:30}})});assert.equal(adapter.command({actorId:id,action:'train'}),true);const start=s.ds[0].pos.slice();for(let i=0;i<80;i++)adapter.observeStep();const before=JSON.stringify(s),snap=adapter.snapshot();assert.equal(JSON.stringify(s),before);assert.deepEqual([snap.actors[0].x,snap.actors[0].y],s.ds[0].pos);assert.notDeepEqual(s.ds[0].pos,start);assert.equal(snap.actors[0].positionSource,'core.pos');});
test('same renderer escapes source values and portraits never borrow #343 candidates',()=>{const {model}=createGeminiCore();const c=geminiCard(model,'hero',{identity:{name:'<script>alert(1)</script>'}});assert.ok(!renderCard(c).includes('<script>'));for(const id of ['cousin','child','limochou'])assert.equal(portrait('dev',id).portraitAssetId,null);});
test('official work and training cards follow real completion, stop and latest reassignment',()=>{
 const {model}=createGeminiCore();const id='hero';
 const initial=geminiCard(model,id);geminiCommand(model,id,'work:herb');
 for(let n=0;n<20000 && model.view().people[id].done.herb===0;n++)model.step();
 assert.ok(model.view().people[id].done.herb>0);const after=geminiCard(model,id);
 assert.notDeepEqual(after.fields.filter(f=>['leg.level','leg.xp'].includes(f.semanticId)&&f.layer==='base'),initial.fields.filter(f=>['leg.level','leg.xp'].includes(f.semanticId)&&f.layer==='base'));
 assert.equal(geminiCommand(model,id,'train').ok,true);
 for(let n=0;n<30000 && !model.view().people[id].train01.adept;n++)model.step();
 assert.ok(model.view().people[id].train01.adept);assert.equal(geminiCard(model,id).martial[0].id,'adept');
 const tick=model.view().tick;geminiCommand(model,id,'work:water');geminiCommand(model,id,'restAfterTrip');
 assert.equal(model.view().tick,tick);assert.ok(model.view().people[id].pending==='rest'||model.view().people[id].resting);
});
