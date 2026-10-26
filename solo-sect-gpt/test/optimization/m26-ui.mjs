import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI M26: martial detail shows the adopted four-layer conditions; hidden rows carry no numbers; viewing does not change the world. Usage: node m26-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m26-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={};
const demo=new URL('../../evidence/optimization/showcase-m16/showcase-m12-m16.save.json',import.meta.url).pathname;
const art=async(who,a)=>{await k.person(who);await k.click('[data-person-tab="martial"]');await k.click('[data-person-art="'+a+'"]');const d=page.locator('#art-conditions');if(!await d.evaluate(e=>e.open))await d.locator('summary').first().click();const inner=d.locator('article details');if(await inner.count()&&!await inner.first().evaluate(e=>e.open))await inner.first().locator('summary').click();await d.scrollIntoViewIfNeeded();return d.innerText();};
const noDigits=async()=>{for(const h of await page.locator('.pub-row[data-availability="hidden"]').evaluateAll(r=>r.map(x=>x.outerHTML)))assert.doesNotMatch(h.replace(/data-semantic="[^"]*"/,''),/\d/);};
let failure=null;
try{await k.open();await k.newGame();await k.importSave(demo);const before=JSON.stringify(await k.snap());
 story.lin=await art('lin','punch');assert.match(story.lin,/入門／理解/);assert.match(story.lin,/短打快拳：未達前置/);assert.match(story.lin,/承載/);await k.shot('01-lin-conditions');
 story.leader=await art('leader','nine');assert.match(story.leader,/九劍需實際領用並裝備木劍/);await k.shot('02-leader-nine-special');
 story.amu=await art('amu','punch');assert.match(story.amu,/推掌.*真授/);await noDigits();story.child=await art('child','punch');await noDigits();await k.shot('03-child');
 story.unchanged=JSON.stringify(await k.snap())===before;assert.ok(story.unchanged);await k.log('done',{unchanged:story.unchanged});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
