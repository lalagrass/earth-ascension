import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI M32: vegetables run out through real cooking -> resource overview -> store card -> a vegetable run -> transit -> delivery -> cooking. Usage: node m32-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m32-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={};
const demo=new URL('../../evidence/optimization/m30/showcase-m24-m30.save.json',import.meta.url).pathname;
const row=async item=>{await k.tab('build');const r=page.locator('details[data-resource="'+item+'"]');if(!await r.evaluate(e=>e.open))await r.locator('summary').first().click();return{amount:await r.locator('[data-resource-field="amount"]').innerText(),incoming:await r.locator('[data-resource-field="incoming"]').innerText(),reserved:await r.locator('[data-resource-field="reserved"]').innerText(),available:await r.locator('[data-resource-field="available"]').innerText()};};
const job=async(fac,who,text)=>{await k.tab('build');await k.click('[data-facility-pick="'+fac+'"]');await page.locator('#facility-actor').selectOption(who);await page.locator('#facility-jobs button',{hasText:text}).click();};
let failure=null;
try{await k.open();await k.newGame();await k.importSave(demo);await k.calm();story.start=await row('veg');
 for(let n=0;n<4&&((await k.snap()).inventories.store.items.veg||0)>=2;n++){await job('kitchen','amu','做基礎餐');const t=(await k.snap()).tick;await k.until(x=>!x.people.amu.activity||x.tick>t+4000,'cook-'+n,300000);}
 story.empty=await row('veg');assert.match(story.empty.amount,/^0/);await k.shot('01-veg-zero');
 await page.locator('details[data-resource="veg"] [data-resource-link="store"]').click();assert.equal(await page.locator('#facility-card').getAttribute('data-facility'),'store');await page.locator('#facility-actor').selectOption('lin');await page.locator('#facility-jobs button',{hasText:'採菜入倉'}).click();
 let w=await k.until(x=>x.activities[x.people.lin.activity]?.phase==='deliver'&&(x.inventories['bag.lin'].items.veg||0)>0,'lin-back',600000,2);story.transit=await row('veg');assert.match(story.transit.incoming,/^[1-9]/);await k.shot('02-veg-transit');
 w=await k.until(x=>(x.inventories.store.items.veg||0)>=2,'veg-in',300000);story.delivered=await row('veg');assert.match(story.delivered.incoming,/^0/);
 const m0=w.inventories.table.items.meal||0;await job('kitchen','amu','做基礎餐');w=await k.until(x=>(x.inventories.table.items.meal||0)>m0,'meal',600000);story.meals=[m0,w.inventories.table.items.meal];story.after=await row('meal');await k.shot('03-meal');
 await k.log('done',{meals:story.meals});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
