import assert from'node:assert/strict';import fs from'node:fs/promises';import{launch}from'./ui-kit.mjs';
// Normal-UI M16 save protection: bad file refused, preview cancelled leaves the game and other slots untouched, the new demo continues. Usage: node m16-compat-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m16-compat-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page;
const demo=new URL('../../evidence/optimization/showcase-m16/showcase-m12-m16.save.json',import.meta.url).pathname,bad=new URL('bad-demo.save.json',k.out).pathname,story={};
const slots=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('solo-sect-gpt.')).sort().map(k=>[k,localStorage.getItem(k)])));
let failure=null;
try{const x=JSON.parse(await fs.readFile(demo,'utf8'));x.checksum='0'.repeat(64);await fs.writeFile(bad,JSON.stringify(x));
 await k.open();await k.newGame();await k.tab('save');await k.click('[data-special="save"]');await page.waitForTimeout(400);const s0=await slots(),w0=await k.snap();
 await page.locator('#import-file').setInputFiles(bad);await k.click('[data-special="import"]');await page.waitForTimeout(300);story.badToast=await k.toast();assert.match(story.badToast,/校驗碼/);assert.equal(JSON.stringify(await k.snap()),JSON.stringify(w0),'bad file left the game unchanged');assert.deepEqual(await slots(),s0,'slots unchanged after a refused file');await k.shot('01-bad-file-refused');
 await page.locator('#import-file').setInputFiles(demo);await k.click('[data-special="import"]');await page.locator('#confirm-import').waitFor();story.preview=await page.locator('#modal-content').innerText();await k.shot('02-preview');await k.click('#close-modal');await page.waitForTimeout(200);assert.equal(JSON.stringify(await k.snap()),JSON.stringify(w0),'cancelled preview left the game unchanged');assert.deepEqual(await slots(),s0);
 await k.importSave(demo);let w=await k.snap();assert.equal(w.rulesVersion,'chapter1-joint-1');assert.deepEqual(await slots(),s0,'importing does not overwrite saved slots');const t0=w.tick;w=await k.until(x=>x.tick>=t0+600,'continued-30s',120000);story.continued={from:t0,to:w.tick};await k.tab('records');await k.shot('03-demo-continues');
 await page.reload();await page.waitForFunction(()=>window.__game);story.afterReload=Object.keys(await slots()).length;await k.log('done',{story});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
