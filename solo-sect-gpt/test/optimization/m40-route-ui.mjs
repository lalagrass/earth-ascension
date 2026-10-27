import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI M40 reading route. A: new game, 郭靖 / 令狐沖 look and introduction, the 郭靖 card with its whole portrait. B: the M37-M40 showcase: a pot of food on its way and on the table,
// the sword talk in 林青's chronicle, the drill review where 沈禾's same-tick punch after leaving is not counted. Usage: node m40-route-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m40-route-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={marks:[]};
const demo=new URL('../../evidence/optimization/m40/showcase-m37-m40.save.json',import.meta.url).pathname,t0=Date.now(),mark=async n=>story.marks.push([n,(Date.now()-t0)/1000,(await k.snap())?.tick??null]);
const life=async id=>{await k.person(id);await k.click('[data-person-tab="life"]');};
const row=async item=>{await k.tab('build');const r=page.locator('details[data-resource="'+item+'"]');if(!await r.evaluate(e=>e.open))await r.locator('summary').first().click();return{amount:await r.locator('[data-resource-field="amount"]').innerText(),incoming:await r.locator('[data-resource-field="incoming"]').innerText()};};
let failure=null;
try{await k.open();
 // A1 start dialog
 for(const[t,asset]of[['guo','person.research.guojing.portrait'],['linghu','person.research.linghuchong.portrait']]){await page.locator('#template').selectOption(t);assert.equal(await page.locator('.creation-art').getAttribute('data-asset-id'),asset);assert.equal(await page.locator('#creation-profile .public-profile').getAttribute('data-profile-id'),'gpt-'+t);await k.shot('a1-dialog-'+t);}
 story.marks.push(['dialog',(Date.now()-t0)/1000,null]);
 // A2 郭靖 card
 await page.locator('#template').selectOption('guo');await k.newGame();await life('leader');await page.locator('#panel details.portrait-expand summary').click();await page.waitForFunction(()=>document.querySelector('#panel img.portrait-full')?.naturalWidth>0);await page.locator('#panel .portrait+.public-profile .public-background summary').click();story.guoCard=(await page.locator('#panel').innerText()).slice(0,400);await k.shot('a2-guo-card');await mark('guo-card');
 // B1 showcase: a pot of food
 await k.importSave(demo);await k.calm();const m0=(await k.snap()).inventories.table.items.meal||0;await k.tab('build');await k.click('[data-facility-pick="kitchen"]');await page.locator('#facility-actor').selectOption('amu');await page.locator('#facility-jobs button',{hasText:'做基礎餐'}).click();await mark('cook');
 let w=await k.until(x=>x.activities[x.people.amu.activity]?.phase==='haulOutput'&&(x.inventories['bag.amu'].items.meal||0)>0,'carrying',600000,2);story.carry=await row('meal');assert.match(story.carry.incoming,/^[1-9]/);await k.shot('b1-meal-on-the-way');await mark('carrying');
 w=await k.until(x=>(x.inventories.table.items.meal||0)>m0,'on-table',300000,2);story.onTable=await row('meal');assert.match(story.onTable.incoming,/^0/);await k.shot('b2-meal-on-table');await mark('on-table');
 // B2 the mentor talk in 林青's chronicle
 await life('lin');const d=page.locator('details[data-section="recent"]');if(!await d.evaluate(e=>e.open))await d.locator('summary').click();await page.locator('#recent-events').waitFor();story.linChronicle=(await page.locator('#recent-events').innerText()).slice(0,900);assert.match(story.linChronicle,/學劍|定向|師徒/);await k.shot('b3-lin-chronicle');await mark('chronicle');
 // B3 the drill review
 await k.tab('travel');story.review=await page.locator('#joint-review').innerText();assert.match(story.review,/兩翼包抄/);assert.match(story.review,/沈禾（守線）[^\n]*耗精力0/);await page.locator('#joint-review').scrollIntoViewIfNeeded();await k.shot('b4-review');await mark('review');
 await k.log('done',{marks:story.marks});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
