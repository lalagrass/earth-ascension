import assert from'node:assert/strict';import fs from'node:fs/promises';import{launch}from'./ui-kit.mjs';import{hash}from'../../src/save.mjs';
// #372 P2-B (Mac local normal UI): import an old-shape exiting file (labeled fixture: the M44 natural-exit save with closedAt/bodyAt removed and the
// checksum recomputed), punch at once while paused, then play to the review: the punch is not counted. Usage: node p2b-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('372-p2b-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={};
const src=new URL('../../evidence/optimization/m44/drill-exit-midway.save.json',import.meta.url),old=new URL('old-shape-exiting.save.json',k.out).pathname;
const life=async id=>{await k.person(id);await k.click('[data-person-tab="life"]');};
let failure=null;
try{const x=JSON.parse(await fs.readFile(src,'utf8'));delete x.payload.drill.joint.closedAt;delete x.payload.drill.joint.bodyAt;x.checksum=await hash(x.payload);await fs.writeFile(old,JSON.stringify(x));
 await k.open();await k.newGame();await k.importSave(old);let w=await k.snap();assert.equal(w.drill.status,'exiting');story.load={tick:w.tick,energy:w.people.shen.energy,start:w.drill.joint.body.shen.energy,closedAt:w.drill.joint.closedAt??null};
 await life('shen');await k.click('[data-person-tab="martial"]');await k.click('[data-person-art="punch"]');await k.click('[data-person-move="punch"]');await k.click('#move-detail [data-content-attack]');w=await k.snap();story.punch={tick:w.tick,energy:w.people.shen.energy};assert.equal(w.tick,story.load.tick,'no step before the punch');assert.ok(story.punch.energy<story.load.energy);await k.shot('01-punch-after-load');
 w=await k.until(x=>x.drill.joint.reviewed,'reviewed',300000,1);story.review=w.jointDrill.history.at(-1).body.shen;assert.equal(story.review.energyUsed,story.load.start-story.load.energy,'counted to the load, not the punch');
 await life('shen');await k.tab('travel');story.reviewText=(await page.locator('#joint-review').innerText()).slice(0,300);await page.locator('#joint-review').scrollIntoViewIfNeeded();await k.shot('02-review');
 assert.equal(k.errors.length,0,k.errors.join('\n'));await k.log('done',{load:story.load,punch:story.punch,review:story.review});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure.split('\n')[0]);process.exit(1);}
