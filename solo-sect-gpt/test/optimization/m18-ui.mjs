import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI M18: open the read-only public preview for leader, amu and child while paused; the world must not change and hidden rows carry no value. Usage: node m18-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m18-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page;
const demo=new URL('../../evidence/optimization/showcase-m16/showcase-m12-m16.save.json',import.meta.url).pathname,story={};
const sec=async(who,id)=>{await k.person(who);const d=page.locator('details[data-section="'+id+'"]');if(!await d.evaluate(e=>e.open))await d.locator('summary').click();await page.waitForTimeout(400);await page.locator('#public-preview').scrollIntoViewIfNeeded();};
let failure=null;
try{await k.open();await k.newGame();await k.importSave(demo);const before=JSON.stringify(await k.snap());
 for(const id of['leader','amu','child']){await sec(id,'public');const box=page.locator('#public-preview');assert.equal(await box.getAttribute('data-actor'),id);const text=await box.innerText();story[id]={text:text.slice(0,1600)};
  const hidden=await page.locator('#public-preview .pub-row[data-availability="hidden"]').evaluateAll(rows=>rows.map(r=>r.outerHTML));story[id].hiddenRows=hidden.length;for(const h of hidden)assert.doesNotMatch(h.replace(/data-semantic="[^"]*"/,''),/\d/,'hidden row carries a number: '+h);
  if(id==='leader'){assert.equal(hidden.length,0);assert.match(text,/悟性：4/);assert.match(text,/本版規則沒有讀取這項/);}else{assert.equal(hidden.length,7);assert.match(text,/未揭露/);}
  if(id==='child')assert.match(text,/未成年不參戰|請選成年常住門人/);await k.shot('0'+(['leader','amu','child'].indexOf(id)+1)+'-'+id);}
 const after=JSON.stringify(await k.snap());story.worldUnchanged=before===after;assert.ok(story.worldUnchanged,'opening the preview changed the world');await k.log('done',{worldUnchanged:story.worldUnchanged});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
