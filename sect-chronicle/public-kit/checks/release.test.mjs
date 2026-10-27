import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import * as Kit from '../index.mjs';
import {buildManifest,checkManifest,closure,root} from '../tools/release.mjs';
import {facilityHtml} from '../../facility-view/render.mjs';
import {resourcesHtml} from '../../resource-view/render.mjs';
import {resourceView} from '../../resource-view/contract.mjs';
const field=Kit.Character.field;
test('release is deterministic; DOM runtime imports only the manifest closure, no fixed core, pins, harness or Pixi',async()=>{
 const m=JSON.parse(await readFile(path.join(root,'public-kit/releases/1.0.0.json')));assert.deepEqual(await buildManifest(),m);await checkManifest(m);
 assert.equal(Kit.PUBLIC_KIT_VERSION,'1.0.0');assert.equal(Kit.DATA_CONTRACTS.character,1);
 assert.ok(m.runtime.files.every(f=>!/(sources|checks|evidence|harness|pins|vendor)\//.test(f.path)));
 assert.ok(m.optionalScene.files.some(f=>f.path.endsWith('pixi.min.mjs')));
 const bytes=new Map(await Promise.all(m.runtime.files.map(async f=>[f.path,await readFile(path.join(root,f.path))])));
 const staged=async p=>{if(!bytes.has(p))throw Error(`Missing staged dependency: ${p}`);return bytes.get(p);};
 assert.deepEqual(await closure(m.runtime.entries,staged),m.runtime.files);
 bytes.delete('public-ui/values.mjs');await assert.rejects(closure(m.runtime.entries,staged),/Missing staged dependency/);
 bytes.set('public-ui/values.mjs',Buffer.from("import './checks/private-payload.mjs';"));await assert.rejects(closure(m.runtime.entries,staged),/Forbidden runtime/);
 await assert.rejects(checkManifest({...m,contentSha256:'0'.repeat(64)}),/summary mismatch/);
 await assert.rejects(checkManifest(m,async p=>p===m.adapterExamples[0].path?Buffer.from('changed adapter'):readFile(path.join(root,p))),/Missing\/changed selected content/);
});
test('package pin rejects legacy/floating source and keeps package, contracts, assets, adapter/core and save separate',()=>{
 const data={sourceSha:'a'.repeat(40),manifestSha256:'b'.repeat(64),assetPin:{path:'assets/shared/pins/gpt.mjs',version:'gpt-1.0.0',manifestSha256:'c'.repeat(64)},adapter:{id:'my.native-adapter',sourceSha:'d'.repeat(40),coreSha:'e'.repeat(40)}};
 const p=Kit.createConsumerReceipt(data);assert.equal(p.package,'public-kit@1.0.0');assert.equal(p.adapter.coreSha,'e'.repeat(40));assert.ok(!Object.hasOwn(p,'saveSchema'));assert.ok(Object.isFrozen(p.assetPin));
 assert.throws(()=>Kit.createConsumerReceipt({...data,sourceSha:Kit.LEGACY_SOURCE_SHA}));assert.throws(()=>Kit.createConsumerReceipt({...data,sourceSha:'dev'}));assert.throws(()=>Kit.createConsumerReceipt({...data,assetPin:{version:'latest'}}));
});
test('explicit current writer and position ownership never borrow stale Persona fields or reconstruct initial history',()=>{
 const f=field('energy',0,{source:'worker.view.energy',layer:'effective'}),observed=Kit.withObservation(f,{branch:'native',sha:'a'.repeat(40),writer:'Worker',mode:'manual',tick:0,secret:'DO-NOT-COPY'});
 assert.equal(observed.value,0);assert.equal(observed.layer,'effective');assert.ok(!JSON.stringify(observed).includes('DO-NOT-COPY'));assert.ok(!Object.hasOwn(f,'observation'));
 assert.equal(Kit.Character.missing('energy','public.history').availability,'unknown');
 const input={scenePosition:null,lifePosition:{x:999,y:999},routePosition:{x:20,y:30}};
 assert.equal(Kit.positionForOwner({...input,owner:'worker.scenePosition'}),null);
 assert.deepEqual(Kit.positionForOwner({...input,owner:'worker.routeProjection'}),{x:20,y:30,owner:'worker.routeProjection'});
 assert.deepEqual(Kit.positionForOwner({...input,owner:'persona.lifePos'}),{x:999,y:999,owner:'persona.lifePos'});
 assert.throws(()=>Kit.positionForOwner({...input,owner:'guess'}));
});
test('a nonzero HOME/world origin translates camera and public feet/facilities together, preserving native scale/body anchors',()=>{
 const input={definition:{width:800,height:600},snapshot:{source:'public-native',epoch:0,tick:12,actors:[{id:'p',label:'人',x:1300,y:-200,depth:-200,anchor:{x:.5,y:1},body:{x:-4,y:-8,w:8,h:8}}],facilities:[{id:'door',x:1400,y:-100}],events:[]},camera:{x:1400,y:-100,zoom:1},viewport:{width:400,height:300},origin:{x:1000,y:-500}};
 const original=structuredClone(input),local=Kit.localNavigationInput(input),view=Kit.Navigation.navigationView(local);
 assert.deepEqual(view.actors[0],{kind:'actor',id:'p',label:'人',x:300,y:300});assert.deepEqual(view.frame,{x:200,y:250,width:400,height:300});assert.deepEqual(local.snapshot.actors[0].body,input.snapshot.actors[0].body);assert.deepEqual(input,original);
 assert.throws(()=>Kit.localNavigationInput({...input,origin:null}));
});
test('hidden value sources do not leak through facility tooltip wrappers or resource source details; known zero and missing stay distinct',()=>{
 const hidden=field('private',123,{source:'PRIVATE-SOURCE',availability:'hidden'}),known=field('amount',0,{source:'public.amount'}),absent=field('capacity',null,{source:'public.capacity'});
 const facility={id:'public',label:'公開設施',interactionPoint:{id:'door',entrance:hidden},users:hidden,stock:{amount:known,capacity:absent,incoming:hidden},activities:[],capabilities:{stationCapacity:hidden,stationReservations:hidden,queue:hidden},stage:hidden};
 const html=facilityHtml(facility,{actorId:'p',actors:{p:{name:'人'}}});assert.ok(!html.includes('PRIVATE-SOURCE'));assert.match(html,/>0</);assert.ok(html.includes('未知'));
 const resource=resourceView({namespace:'native',sha:'a'.repeat(40),nativeId:'water',label:'水',unit:'份',source:'public.inventory',values:Object.fromEntries(['amount','capacity','incoming','reserved','available'].map(k=>[k,k==='amount'?known:hidden])),uses:hidden});
 const rendered=resourcesHtml([resource]);assert.ok(!rendered.includes('PRIVATE-SOURCE'));assert.ok(rendered.includes('來源已遮罩'));
 assert.equal(hidden.availability,'hidden');assert.ok(!Object.hasOwn(hidden,'value'),'the v1 field masks raw values before rendering; host still supplies public-only provenance');
});
