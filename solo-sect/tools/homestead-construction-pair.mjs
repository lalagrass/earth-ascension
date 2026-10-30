// Compare the unchanged simulation against the exact pre-round source, not a second copy of today's engine.
import fs from'node:fs/promises';import os from'node:os';import path from'node:path';import{pathToFileURL,fileURLToPath}from'node:url';import{execFileSync}from'node:child_process';import assert from'node:assert/strict';
import*as current from'../src/homestead.mjs';import{blueprintInfo,inspectionInfo,constructionRoute,siteMaterials,siteStages}from'../src/homestead-construction.mjs';
const base='0ac7c5487f31ee803e55d1b83695c77a37834803',repo=fileURLToPath(new URL('../../',import.meta.url)),dir=await fs.mkdtemp(path.join(os.tmpdir(),'homestead-construction-pair-')),results=[];
try{for(const name of['homestead','homestead-content','homestead-living','homestead-skills','homestead-look'])await fs.writeFile(path.join(dir,name+'.mjs'),execFileSync('git',['show',`${base}:solo-sect/src/${name}.mjs`],{cwd:repo}));const old=await import(pathToFileURL(path.join(dir,'homestead.mjs')));
 for(const seed of[1,2,3,4,5]){let n=seed;const rng=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n;},personality=['quiet','sociable','diligent'][seed%3];let a=old.createHomestead({mode:'solo',personality}),b=current.createHomestead({mode:'solo',personality}),minH=100,minE=100;old.startBlueprint(a,'hut');current.startBlueprint(b,'hut');
  for(let i=0;i<240*20*4;i++){
   if(i%211===0){const act=[null,'forage','chop','build','farm','cook','leisure','rest'][rng()%8];old.setOrder(a,act);current.setOrder(b,act);}
   if(i%317===0){const id=current.BUILDABLE[rng()%current.BUILDABLE.length];assert.equal(old.startBlueprint(a,id),current.startBlueprint(b,id));}
   if(i%431===0){const id=current.BUILDABLE[rng()%current.BUILDABLE.length],paused=!!(rng()%2);assert.equal(old.pauseProject(a,id,paused),current.pauseProject(b,id,paused));}
   if(i%977===0){const style=['auto','basic','salad','stew'][rng()%4];old.setMealStyle(a,style);current.setMealStyle(b,style);}
   if(i%1231===0){const id=current.BUILDABLE[rng()%current.BUILDABLE.length];assert.equal(old.setProjectFocus(a,id),current.setProjectFocus(b,id));}
   const id=current.BUILDABLE[i%current.BUILDABLE.length];blueprintInfo(b,id);inspectionInfo(b,id);constructionRoute(b,id);siteMaterials(b,id);siteStages(b,id);
   old.tickHomestead(a);current.tickHomestead(b);minH=Math.min(minH,b.person.hunger);minE=Math.min(minE,b.person.energy);if(i%53===0){const aa=old.loadHomestead(old.saveHomestead(a)),bb=current.loadHomestead(current.saveHomestead(b));assert.ok(aa.ok,aa.error);assert.ok(bb.ok,bb.error);a=aa.state;b=bb.state;}assert.equal(current.saveHomestead(b),old.saveHomestead(a),`seed${seed}/tick${i}`);
  }results.push({seed,personality,days:20,ticks:240*20*4,minH,minE,byteIdentical:true});
 }
 const out={base,comparison:'pre-three-round engine vs current; five fixed command seeds, zero grants, per-tick state and reload parity',results};await fs.writeFile(fileURLToPath(new URL('../HOMESTEAD-CONSTRUCTION-PAIR.json',import.meta.url)),JSON.stringify(out,null,2));console.log(JSON.stringify(out));
}finally{await fs.rm(dir,{recursive:true,force:true})}
