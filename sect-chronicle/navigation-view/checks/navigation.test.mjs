import {officialNavigationFacilities} from '../official.mjs';
import {TEA_SEAT,WOOD_PATH,DORM,TRAIN_POSTS} from '../../experiments/water-carry/demo/routes.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraFrame,mapTransform,navigationView,navigationLayers,pickNavigation} from '../contract.mjs';
import {createCamera} from '../../scene-shared/camera.mjs';
import {createGeminiAdapter} from '../../scene-shared/adapters/gemini.mjs';
import {createGeminiCore} from '../../scene-shared/checks/cores.mjs';
import {createGPTAdapter,gptDefinition} from '../../scene-shared/adapters/gpt.mjs';
import {createWorld} from '../../scene-shared/sources/gpt/solo-sect-gpt/src/world.mjs';
import {visibleEntity} from '../../scene-shared/sources/gpt/solo-sect-gpt/src/view.mjs';
import {Q} from '../../scene-shared/sources/gpt/solo-sect-gpt/src/data.mjs';
const appearance=()=>({asset:'dot',frame:0,anchor:{x:.5,y:1},body:{x:-8,y:-20,w:16,h:20}});
const camera={x:800,y:675,zoom:1},viewport={width:1440,height:1000};
test('native meet transform and camera viewport match original camera math through drag/zoom and bounds',()=>{
 for(const bounds of [{width:1600,height:1350},{width:2400,height:1800}]){
  const map=mapTransform(bounds,280,236);
  for(const [x,y] of [[0,0],[bounds.width,bounds.height],[123,456]]){const at=map.toScreen(x,y),back=map.toMap(at.x,at.y);assert.ok(Math.abs(back.x-x)<1e-9&&Math.abs(back.y-y)<1e-9);}
  const cam=createCamera({x:bounds.width/2,y:bounds.height/2,zoom:1},bounds);cam.resize(viewport.width,viewport.height);
  cam.state.x-=180;cam.state.y+=70;cam.zoomAt(600,400,1.3);
  const top=cam.toWorld(0,0),bottom=cam.toWorld(viewport.width,viewport.height),frame=cameraFrame(cam.state,viewport,bounds);
  assert.deepEqual(frame,{x:Math.max(0,top.x),y:Math.max(0,top.y),width:Math.min(bounds.width,bottom.x)-Math.max(0,top.x),height:Math.min(bounds.height,bottom.y)-Math.max(0,top.y)});
 }
 assert.deepEqual(cameraFrame({x:0,y:0,zoom:.1},viewport,{width:1600,height:1350}),{x:0,y:0,width:1600,height:1350});
});
test('official navigation reads the same confirmed feet, preserves native speeds and never changes authority or infers a route',()=>{
 const core=createGeminiCore(),adapter=createGeminiAdapter({getModel:()=>core.model,geometry:core.geometry,source:core.source,appearance,facilities:[{id:'public',label:'已知設施',x:962,y:512}]});
 for(let n=0;n<100;n++)adapter.observeStep();const before=core.model.exportState(Infinity),snapshot=adapter.snapshot({paused:true}),view=navigationView({definition:core.definition,snapshot,camera,viewport,selectedId:'hero'});
 assert.deepEqual(view.actors.map(p=>[p.id,p.x,p.y]),snapshot.actors.map(p=>[p.id,p.x,p.y]));
 assert.ok(core.model.view().people.hero.tripSpeeds.empty<core.model.view().people.cousin.tripSpeeds.empty);
 assert.equal(view.route.availability,'unsupported');assert.equal(Object.hasOwn(view,'paths'),false);
 for(let n=0;n<50;n++){pickNavigation(view,'actor','hero');navigationLayers(view,{actors:false});cameraFrame({...camera,x:n},viewport,view.bounds);}
 assert.deepEqual(core.model.exportState(Infinity),before);
});
test('original GPT LOS invisible-visible-invisible and epoch reset never retain hidden actors, picks, names or routes',()=>{
 const world=createWorld({seed:11}),adapter=createGPTAdapter({world,appearance}),definition=gptDefinition();
 const project=()=>navigationView({definition,snapshot:adapter.snapshot({paused:true}),camera,viewport});
 const target=Object.values(world.people).find(p=>['wild','cave'].includes(p.residence)&&!visibleEntity(world,p));assert.ok(target);
 const resident=world.people.leader,home={x:resident.x,y:resident.y},before=structuredClone(world),hidden=project();
 assert.equal(hidden.bounds.width,2400);assert.equal(hidden.bounds.height,1800);
 assert.equal(pickNavigation(hidden,'actor',target.id),null);assert.ok(!JSON.stringify(hidden).includes(`"${target.id}"`));assert.deepEqual(world,before);
 // Bounded observer placement fixture, exactly as accepted #357 proof: original LOS/core are never replaced.
 resident.x=target.x-60*Q;resident.y=target.y;assert.equal(visibleEntity(world,target),true);
 const shown=project();assert.ok(pickNavigation(shown,'actor',target.id));
 Object.assign(resident,home);assert.equal(visibleEntity(world,target),false);const concealed=project();
 assert.equal(pickNavigation(concealed,'actor',target.id),null);assert.ok(!JSON.stringify(concealed).includes(`"${target.id}"`));
 const preReset=structuredClone(world);adapter.reset();const reset=project();assert.notEqual(reset.identity,shown.identity);assert.deepEqual(world,preReset);
 assert.equal(pickNavigation(reset,'actor',target.id),null);assert.equal(reset.route.availability,'unsupported');
});
test('projection masks hidden/unknown facilities and extra payloads; layer-off data cannot be picked and no definition fallback is used',()=>{
 const raw={version:1,source:'test',epoch:0,tick:0,actors:[{id:'safe',x:0,y:0,label:'已知',secret:'NEVER-RAW'},{id:'SECRET-ACTOR',x:1,y:2,visibility:'hidden'}],facilities:[{id:'SECRET-PLACE',label:'PRIVATE-LABEL',x:3,y:4,availability:'unknown'}]};
 const before=structuredClone(raw),view=navigationView({definition:{width:10,height:10,facilities:[{id:'DEFINITION-SECRET',x:2,y:2}]},snapshot:raw,camera:{x:5,y:5,zoom:1},viewport});
 assert.equal(view.actors.length,1);assert.deepEqual(view.facilities,[]);assert.ok(!/SECRET|PRIVATE|NEVER-RAW/.test(JSON.stringify(view)));
 assert.equal(pickNavigation(navigationLayers(view,{actors:false}),'actor','safe'),null);assert.equal(pickNavigation(view,'facility','SECRET-PLACE'),null);assert.deepEqual(raw,before);
});

test('official known anchors reuse public route/layout exports without exposing indoor beds or decorative future sites',()=>{
 const points=officialNavigationFacilities({vat:{label:'水缸',x:1000,y:520}});
 for(const [id,original] of [['tea',TEA_SEAT.stove],['woods',WOOD_PATH.log],['dorm',DORM.site],['woodpile',DORM.woodpile],['training:hero',TRAIN_POSTS.hero.stake]]){
  const p=points.find(p=>p.id===id);assert.equal(p.x,original.x);assert.equal(p.y,original.y);
 }
 assert.equal(points.some(p=>p.id.includes('bed')),false);assert.equal(points.some(p=>p.id==='shed_reserved'),false);
});
