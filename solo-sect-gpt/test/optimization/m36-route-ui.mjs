import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI M36 reading route, two parts. A: a new game's start dialog, the chosen leader's card, the resource overview. B: the M31-M36 showcase: a wood gap, a store job with real transit and delivery, the temporary-job record, the mentor talk and return in the recent chronicle, the drill review that stops at 沈禾's leave. Usage: node m36-route-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m36-route-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={marks:[]};
const demo=new URL('../../evidence/optimization/m36/showcase-m31-m36.save.json',import.meta.url).pathname,t0=Date.now(),mark=n=>story.marks.push([n,(Date.now()-t0)/1000]);
const row=async item=>{await k.tab('build');const r=page.locator('details[data-resource="'+item+'"]');if(!await r.evaluate(e=>e.open))await r.locator('summary').first().click();return{amount:await r.locator('[data-resource-field="amount"]').innerText(),incoming:await r.locator('[data-resource-field="incoming"]').innerText()};};
const life=async id=>{await k.person(id);await k.click('[data-person-tab="life"]');};
let failure=null;
try{await k.open();
 // A1 start dialog
 for(const t of['guo','linghu','yue','custom']){await page.locator('#template').selectOption(t);assert.equal(await page.locator('#creation-profile .public-profile').getAttribute('data-profile-id'),'gpt-'+t);}await page.locator('#template').selectOption('linghu');await page.locator('#creation-profile details summary').click();story.dialog=await page.locator('#creation-profile').innerText();await k.shot('a1-dialog');mark('dialog');
 // A2 leader card with background and work goal
 await k.newGame();await life('leader');assert.equal(await page.locator('#panel .portrait+.public-profile').getAttribute('data-profile-id'),'gpt-linghu');await page.locator('#panel .portrait+.public-profile .public-background summary').click();await page.locator('section.public-intent details[data-view-key="intent"] summary').click();story.leader=(await page.locator('#panel').innerText()).slice(0,700);await k.shot('a2-leader');mark('leader');
 // A3 resource overview
 story.newWood=await row('wood');await k.shot('a3-resources');mark('resources-new');
 // B0 showcase, recent chronicle per person: the mentor talk on 林青, the return to the original job on 阿木
 await k.importSave(demo);const recent=async id=>{await life(id);const d=page.locator('details[data-section="recent"]');if(!await d.evaluate(e=>e.open))await d.locator('summary').click();await page.locator('#recent-events').waitFor();return(await page.locator('#recent-events').innerText()).slice(0,900);};
 story.linChronicle=await recent('lin');assert.match(story.linChronicle,/師徒後續|定向/);await k.shot('b0-lin-chronicle');await recent('amu');await k.click('[data-event-filter="life"]');story.amuChronicle=(await page.locator('#recent-events').innerText()).slice(0,900);assert.match(story.amuChronicle,/回復原安排/);await k.shot('b0-amu-chronicle-life');await k.click('[data-event-filter="all"]');mark('chronicle');
 // B1 wood gap -> store card -> job
story.gap=await row('wood');assert.match(story.gap.amount,/^0/);await page.locator('details[data-resource="wood"] [data-resource-link="store"]').click();assert.equal(await page.locator('#facility-card').getAttribute('data-facility'),'store');await page.locator('#facility-actor').selectOption('lin');await page.locator('#facility-jobs button',{hasText:'採木'}).first().click();await k.shot('b1-store-job');mark('job');
 // B2 transit then delivery
 await k.until(x=>x.activities[x.people.lin.activity]?.phase==='deliver'&&(x.inventories['bag.lin'].items.wood||0)>0,'lin-back',600000,2);story.transit=await row('wood');assert.match(story.transit.incoming,/^[1-9]/);await k.shot('b2-transit');await k.until(x=>(x.inventories.store.items.wood||0)>0,'wood-in',300000,2);story.delivered=await row('wood');assert.match(story.delivered.amount,/^[1-9]/);mark('delivered');
 // B3 work goal panel after the temporary job
 await life('amu');await page.locator('section.public-intent details[data-view-key="intent"] summary').click();story.amu=await page.locator('section.public-intent').innerText();await k.shot('b3-amu-intent');mark('intent');
 // B5 drill review
 await k.tab('travel');story.review=await page.locator('#joint-review').innerText();assert.match(story.review,/兩翼包抄/);assert.match(story.review,/沈禾/);await page.locator('#joint-review').scrollIntoViewIfNeeded();await k.shot('b5-review');mark('review');
 await k.log('done',{marks:story.marks});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
