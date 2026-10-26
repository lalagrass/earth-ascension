import assert from'node:assert/strict';import fs from'node:fs/promises';import{launch}from'./ui-kit.mjs';
// Normal-UI M17: cancel an unfinished direction and redirect; a save with empty joint-drill stats is refused. Usage: node m17-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m17-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page;
const demo=new URL('../../evidence/optimization/showcase-m16/showcase-m12-m16.save.json',import.meta.url).pathname,story={};
const sec=async(who,id)=>{await k.person(who);const d=page.locator('details[data-section="'+id+'"]');if(!await d.evaluate(e=>e.open))await d.locator('summary').click();await d.scrollIntoViewIfNeeded();};
const bond=w=>w.mentorPlan.bonds.find(b=>b.status==='active');
let failure=null;
try{await k.open();await k.newGame();await k.importSave(demo);await sec('leader','mentor');story.before=await page.locator('#mentor-arc').innerText();await k.shot('01-before-cancel');
 await k.click('[data-mentor-direction-cancel]');let w=await k.snap();assert.equal(bond(w).direction.state,'cancelled');await sec('leader','mentor');await page.locator('#mentor-direction').selectOption('weapon:staff');await k.click('[data-mentor-direction]');w=await k.snap();assert.equal(bond(w).direction.kind,'weapon',await k.toast());await sec('lin','mentor');await k.click('[data-mentor-direction-respond="1"]');
 w=await k.until(x=>{const b=bond(x);return !b.lastEvent||x.tick-b.lastEvent>=1200;},'cooldown',120000);await sec('leader','mentor');await k.click('[data-mentor-event="mentor.direction-set"]');w=await k.until(x=>bond(x).direction.state==='set','new-direction-set',180000);await sec('leader','mentor');story.after=await page.locator('#mentor-arc').innerText();assert.match(story.after,/過去的方向/);assert.match(story.after,/學一種器械/);await k.shot('02-redirected');
 const x=JSON.parse(await fs.readFile(demo,'utf8'));const raw=x.payload;raw.jointDrill.history[0].people.amu={};const {hash}=await import('../../src/save.mjs');x.checksum=await hash(raw);const bad=new URL('empty-stats.save.json',k.out).pathname;await fs.writeFile(bad,JSON.stringify(x));
 const w0=await k.snap();await k.tab('save');await page.locator('#import-file').setInputFiles(bad);await k.click('[data-special="import"]');await page.waitForTimeout(300);story.badToast=await k.toast();assert.match(story.badToast,/聯合演練/);assert.equal(JSON.stringify(await k.snap()),JSON.stringify(w0));await k.shot('03-bad-joint-refused');await k.log('done',{story});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
