import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI walk of the DELIVERY-M24-M30 viewing route from the M24-M30 showcase. Usage: node m30-route-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m30-route-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={marks:[]};
const demo=new URL('../../evidence/optimization/m30/showcase-m24-m30.save.json',import.meta.url).pathname,t0=Date.now(),mark=n=>story.marks.push({step:n,wallSeconds:(Date.now()-t0)/1000});
const fit=async ids=>{for(const id of ids){const w=await k.snap(),p=w.people[id];if(p.hp<p.maxHp*.8||p.injury>30){await k.person(id);await k.click('[data-person-tab="life"]');await k.click('[data-task="rest"]');await k.until(x=>x.people[id].hp>=x.people[id].maxHp*.8&&x.people[id].injury<=30,'rest-'+id,600000);await k.person(id);await k.click('[data-action="stop"]');}}};
let failure=null;
try{await k.open();await k.newGame();await k.importSave(demo);await k.calm();mark('import');
 // 1 人物卡
 await k.person('leader');await k.click('[data-person-tab="life"]');assert.equal(await page.locator('.portrait .portrait-box').getAttribute('data-appearance'),'known');await k.shot('r1-person-card');mark('person');
 // 2 設施卡派工 3 真實進展
 await k.tab('build');await k.click('[data-facility-pick="store"]');await page.locator('#facility-actor').selectOption('lin');await page.locator('#facility-jobs button',{hasText:'採菜入倉'}).click();await k.until(x=>(x.inventories['bag.lin'].items.veg||0)>0,'lin-carrying',300000,2);await k.tab('build');story.store=await page.locator('#facility-card').innerText();assert.match(story.store,/正在送來：菜\d+（林青）/);await k.shot('r2-store-job');mark('assign');
 const v0=(await k.snap()).inventories.store.items.veg||0;await k.until(x=>(x.inventories.store.items.veg||0)>v0,'veg-delivered',600000);await k.tab('build');story.storeAfter=await page.locator('#facility-card').innerText();await k.shot('r3-delivered');mark('progress');
 // 4 近期紀事
 await k.tab('records');const r=page.locator('#recent-events');story.recent=(await r.innerText()).slice(0,400);await r.locator('[data-event-actor="lin"]').first().click();assert.match(await page.locator('.portrait h3').innerText(),/林青/);await k.shot('r4-recent-to-person');mark('chronicle');
 // 5 武學條件
 await k.click('[data-person-tab="martial"]');await k.click('[data-person-art="punch"]');const d=page.locator('#art-conditions');await d.locator('summary').first().click();await d.locator('article details summary').first().click();story.conditions=(await d.innerText()).slice(0,300);await d.scrollIntoViewIfNeeded();await k.shot('r5-conditions');mark('martial');
 // 6 集合與分工
 await fit(['amu','lin']);await k.tab('travel');for(const el of await page.locator('[data-joint-role]').all()){const id=await el.getAttribute('data-joint-role');await el.selectOption({amu:'front',lin:'line'}[id]||'');}await page.locator('#joint-arrival').selectOption('flank');await k.click('[data-joint-start="A"]');let w=await k.until(x=>{const dd=x.drill,j=dd.joint;return dd.actors.every(id=>{const p=x.people[id],at=j.points[id];return p.routeAt>=p.path.length&&Math.hypot(p.x/256-at[0],p.y/256-at[1])<=6;});},'assembled',120000,1);await k.tab('travel');await k.click('[data-joint-go]');w=await k.until(x=>x.drill.joint.reviewed,'reviewed',300000);await k.tab('travel');story.review=await page.locator('#joint-review').innerText();assert.match(story.review,/兩翼包抄/);await page.locator('#joint-review').scrollIntoViewIfNeeded();await k.shot('r6-drill');mark('drill');
 // 7 回生活
 await k.person('amu');await k.click('[data-person-tab="life"]');if(!(await k.snap()).people.amu.auto)await k.click('[data-action="toggleAuto"]');await k.click('[data-action="resume"]');w=await k.until(x=>!!x.activities[x.people.amu.activity]?.decision,'amu-back',300000);await k.person('amu');story.back=(await page.locator('#situation-card').innerText()).slice(0,200);assert.match(story.back,/目標來源/);await k.shot('r7-back-to-life');mark('life');
 story.wallSeconds=(Date.now()-t0)/1000;await k.log('done',{wall:story.wallSeconds});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
