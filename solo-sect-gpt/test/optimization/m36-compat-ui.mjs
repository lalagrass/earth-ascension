import assert from'node:assert/strict';import fs from'node:fs/promises';import{launch}from'./ui-kit.mjs';
// Normal-UI M36 compatibility: the M31-M36 showcase is protected like earlier ones (bad checksum, cancelled preview, confirm, refresh); older showcases and the new one keep running; the mid-drill file ends with 沈禾 counted to her leave; a refused load keeps open sections and the chronicle, a successful one resets them. Usage: node m36-compat-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m36-compat-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={runs:[]};
const ev=p=>new URL('../../evidence/optimization/'+p,import.meta.url).pathname,demo=ev('m36/showcase-m31-m36.save.json'),mid=ev('m36/drill-left-midway.save.json'),bad=new URL('bad-demo.save.json',k.out).pathname;
const slots=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('solo-sect-gpt.')).sort().map(k=>[k,localStorage.getItem(k)])));
const life=async id=>{await k.person(id);await k.click('[data-person-tab="life"]');};
let failure=null;
try{const x=JSON.parse(await fs.readFile(demo,'utf8'));x.checksum='0'.repeat(64);await fs.writeFile(bad,JSON.stringify(x));
 // 1 protection on the new showcase
 await k.open();await k.newGame();await k.tab('save');await k.click('[data-special="save"]');await page.waitForTimeout(400);const s0=await slots(),w0=await k.snap();
 await page.locator('#import-file').setInputFiles(bad);await k.click('[data-special="import"]');await page.waitForTimeout(300);story.badToast=await k.toast();assert.match(story.badToast,/校驗碼/);assert.equal(JSON.stringify(await k.snap()),JSON.stringify(w0));assert.deepEqual(await slots(),s0);await k.shot('01-bad-file-refused');
 await page.locator('#import-file').setInputFiles(demo);await k.click('[data-special="import"]');await page.locator('#confirm-import').waitFor();story.preview=await page.locator('#modal-content').innerText();await k.click('#close-modal');await page.waitForTimeout(200);assert.equal(JSON.stringify(await k.snap()),JSON.stringify(w0));assert.deepEqual(await slots(),s0);
 await k.importSave(demo);let w=await k.snap();assert.equal(w.rulesVersion,'chapter1-follow-1');assert.deepEqual(await slots(),s0);
 // 2 a refused load keeps view state and the chronicle; a successful one resets them
 await life('amu');const work=page.locator('details[data-section="work"]');if(!await work.evaluate(e=>e.open))await work.locator('summary').click();const rec=page.locator('details[data-section="recent"]');if(!await rec.evaluate(e=>e.open))await rec.locator('summary').click();await page.locator('#recent-events').waitFor();const epoch=await page.locator('#recent-events').getAttribute('data-epoch');
 await k.tab('save');await page.locator('#import-file').setInputFiles(bad);await k.click('[data-special="import"]');await page.waitForTimeout(300);await life('amu');assert.equal(await work.evaluate(e=>e.open),true);assert.equal(await page.locator('#recent-events').getAttribute('data-epoch'),epoch);
 await k.importSave(demo);await life('amu');assert.equal(await work.evaluate(e=>e.open),false);assert.equal(await page.locator('#recent-events').count(),0);story.viewState={epochBefore:epoch};
 // 3 continue the new showcase, then refresh
 w=await k.snap();const t0=w.tick;w=await k.until(x=>x.tick>=t0+600,'continued-30s',120000);story.continued={from:t0,to:w.tick};await page.reload();await page.waitForFunction(()=>window.__game);story.afterReload=Object.keys(await slots()).length;assert.ok(story.afterReload>=1);await k.shot('02-after-reload');
 // 4 older showcases keep running
 await k.open();await k.newGame();for(const f of['showcase-m23/showcase-m17-m23.save.json','m30/showcase-m24-m30.save.json','m36/showcase-m31-m36.save.json']){await k.importSave(ev(f));const a=await k.snap();const b=await k.until(x=>x.tick>=a.tick+600,'run-'+f.split('/').at(-1),120000,4);story.runs.push({file:f,from:a.tick,to:b.tick});for(const t of['people','build','records','travel'])await k.tab(t);assert.equal(k.errors.length,0,k.errors.join('\n'));}
 // 5 the mid-drill file: 沈禾 had left; ending the drill counts her only to the leave
 await k.importSave(mid);w=await k.snap();assert.ok(w.drill.joint.bodyAt?.shen);const left=w.drill.joint.bodyAt.shen,start=w.drill.joint.body.shen;await k.tab('travel');await k.click('[data-special="endDrill"]');w=await k.until(x=>x.drill.joint.reviewed,'reviewed',30000,1);story.midReview=w.jointDrill.history.at(-1).body;assert.equal(story.midReview.shen.energyUsed,start.energy-left.energy);await k.tab('travel');story.midReviewText=await page.locator('#joint-review').innerText();await k.shot('03-mid-drill-review');
 await k.log('done',{runs:story.runs.length});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
