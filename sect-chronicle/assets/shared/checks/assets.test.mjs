import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pins, verifyLocal } from './verify.mjs';
import { createPin, validateManifest, resolveAsset, portraitFor } from '../resolve.mjs';
import { portrait } from '../../../character-card/portrait.mjs';
import { identityHtml } from '../../../character-card/render.mjs';
import { createGeminiCore } from '../../../scene-shared/checks/cores.mjs';
import { createWorld, step } from '../../../scene-shared/sources/gpt/solo-sect-gpt/src/world.mjs';
import { createState, tick } from '../../../scene-shared/sources/grok/solo-sect/src/sim.mjs';

test('all three pins verify real local bytes, exact recipe and full source commits',async()=>{
 for(const pin of Object.values(pins)) assert.deepEqual((await verifyLocal(pin)).errors,[]);
 assert.notEqual(pins.gpt.manifest.coreCommit,pins.gemini.manifest.coreCommit);
});
test('duplicate IDs/paths, missing entries, unsafe paths and unknown sources rejected',()=>{
 const m=structuredClone(pins.gemini.manifest);
 m.assets.push(structuredClone(m.assets[0]));
 assert.ok(validateManifest(m).some(x=>x.includes('assetId')));assert.ok(validateManifest(m).some(x=>x.includes('duplicate path')));
 m.assets.pop();m.portraits['dev:bad']='no-such-id';assert.ok(validateManifest(m).some(x=>x.includes('missing mapped entry')));
 delete m.portraits['dev:bad'];m.assets[0].source.commit=null;assert.ok(validateManifest(m).some(x=>x.includes('unknown source')));
 assert.equal(resolveAsset({manifest:m},'person.hero.sheet').availability,'unknown');
 m.assets[0].path='sect-chronicle/../secret';assert.ok(validateManifest(m).some(x=>x.includes('unsafe')));
});
test('explicit branch repin changes only that mapping; original versions stay frozen',()=>{
 const before=JSON.stringify(pins.gpt), next=structuredClone(pins.gemini.manifest);
 next.version='gemini-1.0.1-test';next.portraits['dev:hero']='person.adopted-girl.portrait';
 const newPin=createPin(next,createHash('sha256').update(JSON.stringify(next)).digest('hex'));
 assert.equal(portraitFor(newPin,'dev','hero').availability,'missing');
 assert.match(identityHtml({branch:'dev',actorId:'hero',identity:{name:'主角',role:'主角',portrait:portraitFor(newPin,'dev','hero')}}),/收養女孩正式立繪尚缺/);
 assert.equal(portraitFor(pins.gemini,'dev','hero').availability,'known');
 assert.equal(JSON.stringify(pins.gpt),before);
 assert.throws(()=>{pins.gpt.manifest.portraits['gpt:leader']='person.adopted-girl.portrait';},TypeError);
});
test('missing local bytes and edits to an existing pinned version fail verification',async()=>{
 const m=structuredClone(pins.gemini.manifest);m.assets[0].path='sect-chronicle/assets/shared/no-such-file.png';
 const report=await verifyLocal({manifest:m,expectedSha256:pins.gemini.expectedSha256});
 assert.ok(report.errors.some(x=>x.includes('manifest digest changed')));
 assert.ok(report.errors.some(x=>x.includes('local file missing')));
});
test('girl/classic/unknown IDs use readable fallback and never a borrowed senior portrait',()=>{
 assert.equal(portrait('dev','hero').portraitAssetId,'person.hero.sheet');
 assert.equal(portrait('dev','cousin').availability,'unsupported');
 assert.equal(portrait('dev','girl').availability,'missing');
 assert.equal(portrait('gpt','child').availability,'missing');
 assert.equal(portrait('grok','limochou').availability,'unsupported');
 assert.equal(pins.gemini.manifest.version,'gemini-1.1.0');
 assert.equal(pins.gpt.manifest.version,'gpt-1.0.0');
 assert.equal(pins.grok.manifest.version,'grok-1.0.0');
 assert.equal(pins.gemini.manifest.portraits['dev:hero'],'person.hero.sheet');
 assert.equal(pins.gemini.manifest.portraits['gemini:hero'],'person.hero.sheet');
 assert.equal(pins.gemini.manifest.portraits['gemini:girl'],'person.adopted-girl.portrait');
 assert.equal(portrait('dev','hero').label,'既有活動圖裁切（非新立繪）');
 for (const id of ['axing','huangrong','xiaolongnv','limochou','dongfangbubai','baozupo','baozugong','kulijiang','caifeng','youzhagui','huoyunxieshen','linghuchong','zhoubotong','guojing']) {
  const assetId=`person.research.${id}.portrait`;
  const asset=pins.gemini.manifest.assets.find(a=>a.assetId===assetId);
  assert.equal(asset.availability,'known');
  assert.equal(asset.alpha.channel,false);
  assert.equal(asset.recipe.type,'portrait');
  assert.deepEqual(asset.recipe.rect,{x:0,y:0,w:asset.dimensions.width,h:asset.dimensions.height});
  assert.equal(asset.anchor.x,0.5);assert.equal(asset.anchor.y,1);
  assert.equal(pins.gemini.manifest.portraits[`dev:${id}`],assetId);
  assert.equal(pins.gemini.manifest.portraits[`gemini:${id}`],undefined);
  assert.equal(pins.gpt.manifest.portraits[`dev:${id}`],undefined);
  assert.equal(pins.grok.manifest.portraits[`dev:${id}`],undefined);
  assert.equal(portrait('dev',id).portraitAssetId,assetId);
  assert.equal(portrait('dev',id).label,'公開立繪');
  assert.equal(portrait('gemini',id).availability,'unsupported');
  assert.notEqual(assetId,'person.adopted-girl.portrait');
  assert.notEqual(assetId,'person.hero.sheet');
 }
 assert.match(resolveAsset(pins.grok,'bad').label,/不支援/);
 assert.match(identityHtml({branch:'dev',actorId:'girl',identity:{name:'女孩',role:'家人',portrait:portrait('dev','girl')}}),/來源／權利未知/);
});
test('asset reads preserve genuine official, fixed Gemini/GPT/Grok world results',()=>{
 const official=createGeminiCore(),fixed=createGeminiCore(true),w=createWorld({seed:11}),s=createState(11);
 const offControl=createGeminiCore(),fixControl=createGeminiCore(true),wControl=createWorld({seed:11}),sControl=createState(11);
 for(let n=0;n<60;n++){
  for(const [branch,pin] of Object.entries(pins)){
   for(const a of pin.manifest.assets)resolveAsset(pin,a.assetId);
   portraitFor(pin,branch,branch==='gpt'?'leader':'hero');
  }
  for(const c of [official,fixed,offControl,fixControl])c.model.step();
  step(w);step(wControl);tick(s,.25);tick(sControl,.25);
 }
 assert.deepEqual(official.model.exportState(),offControl.model.exportState());
 assert.deepEqual(fixed.model.exportState(),fixControl.model.exportState());
 assert.deepEqual(w,wControl);assert.deepEqual(s,sControl);
});
