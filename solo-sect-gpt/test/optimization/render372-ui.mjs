import assert from'node:assert/strict';import fs from'node:fs/promises';import{launch}from'./ui-kit.mjs';
// #372 renderers (Mac local normal UI): the 00f4dbe martial render's per-entry details keep their state per person while playing, do not carry over
// to another person, survive a refused load and reset on a successful one; the recent chronicle still renders. Usage: node render372-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('372-render-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={checks:[]};
const demo=new URL('../../evidence/optimization/m44/showcase-m41-m44.save.json',import.meta.url).pathname,bad=new URL('bad.save.json',k.out).pathname;
const ok=(name,cond,detail)=>story.checks.push({name,pass:!!cond,detail});
const martial=async id=>{await k.person(id);await k.click('[data-person-tab="martial"]');await k.click('[data-person-art="punch"]');const c=page.locator('#art-conditions');if(!await c.evaluate(e=>e.open))await c.locator('summary').first().click();};
const inner=()=>page.locator('#art-conditions details[data-view-key^="martial:"]').first();
let failure=null;
try{const x=JSON.parse(await fs.readFile(demo,'utf8'));x.checksum='0'.repeat(64);await fs.writeFile(bad,JSON.stringify(x));
 await k.open();await k.newGame();await k.importSave(demo);
 await martial('amu');story.key=await inner().getAttribute('data-view-key');ok('keyed',/^martial:/.test(story.key||''),story.key);await inner().locator('summary').click();ok('opened',await inner().evaluate(e=>e.open));const t0=(await k.snap()).tick;await k.until(x=>x.tick>t0+100,'redraws',60000,2);ok('kept-while-playing',await inner().evaluate(e=>e.open));await k.shot('01-amu-open');
 await martial('lin');ok('not-carried-to-lin',!(await inner().evaluate(e=>e.open)));await martial('amu');ok('back-to-amu-open',await inner().evaluate(e=>e.open));
 ok('values-shared-markup',await page.locator('#art-conditions [data-availability]').count()>0);ok('no-true-false',!/\b(true|false)\b/.test(await page.locator('#art-conditions').innerText()));
 await k.tab('save');await page.locator('#import-file').setInputFiles(bad);await k.click('[data-special="import"]');await page.waitForTimeout(300);await k.person('amu');await k.click('[data-person-tab="martial"]');ok('refused-load-keeps',await page.locator('#art-conditions').count()&&await inner().evaluate(e=>e.open));
 await k.importSave(demo);await k.person('amu');await k.click('[data-person-tab="martial"]');ok('good-load-resets',!(await page.locator('#art-conditions').count())||!(await page.locator('#art-conditions').evaluate(e=>e.open)));
 await k.person('amu');await k.click('[data-person-tab="life"]');const rec=page.locator('details[data-section="recent"]');if(!await rec.evaluate(e=>e.open))await rec.locator('summary').click();await page.locator('#recent-events').waitFor();ok('chronicle-renders',(await page.locator('#recent-events').innerText()).length>20);await k.shot('02-chronicle');
 ok('no-page-errors',k.errors.length===0,k.errors);const failed=story.checks.filter(c=>!c.pass);await k.log('done',{failed:failed.map(c=>c.name)});if(failed.length)throw Error('checks failed: '+failed.map(c=>c.name).join(', '));
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure.split('\n')[0]);process.exit(1);}
