import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI walk of the DELIVERY-M17-M23 viewing route from the new demo save. Usage: node m23-route-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m23-route-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={};
const demo=new URL('../../evidence/optimization/showcase-m23/showcase-m17-m23.save.json',import.meta.url).pathname,t0=Date.now(),mark=n=>{story.marks=(story.marks||[]).concat({step:n,wallSeconds:(Date.now()-t0)/1000});};
const fit=async ids=>{for(const id of ids){const w=await k.snap(),p=w.people[id];if(p.hp<p.maxHp*.8||p.injury>30){await k.person(id);await k.click('[data-person-tab="life"]');await k.click('[data-task="rest"]');await k.until(x=>x.people[id].hp>=x.people[id].maxHp*.8&&x.people[id].injury<=30,'rest-'+id,600000);await k.person(id);await k.click('[data-action="stop"]');}}};
let failure=null;
try{await k.open();await k.newGame();await k.importSave(demo);mark('import');
 // 1 看卡
 await k.person('lin');await k.click('[data-person-tab="martial"]');await k.click('[data-person-art="punch"]');await k.click('[data-person-move="advanced.closefist"]');story.r1=await page.locator('#move-detail').innerText();assert.match(story.r1,/前置/);await k.shot('r1-card');mark('card');
 // 2 日課：讓阿木、林青恢復自主，看目標來源
 for(const id of['amu','lin']){await k.person(id);await k.click('[data-person-tab="life"]');if(!(await k.snap()).people[id].auto)await k.click('[data-action="toggleAuto"]');await k.click('[data-action="resume"]');}
 let w=await k.until(x=>!!x.activities[x.people.amu.activity]?.decision,'amu-schedule',300000);await k.person('amu');await k.click('[data-person-tab="life"]');story.r2=await page.locator('#situation-card').innerText();assert.match(story.r2,/目標來源/);await k.tab('life');await k.shot('r2-schedule');mark('schedule');
 // 3 一段後續：同住之後第二段的狀態（條件不足就照實顯示）
 await k.tab('stories');story.r3=await page.locator('#followups').innerText();await page.locator('#followups').scrollIntoViewIfNeeded();await k.shot('r3-followup');mark('followup');
 // 4 試招：阿木以短打快拳朝空地
 await k.person('amu');await k.click('[data-person-tab="life"]');await k.click('[data-action="stop"]');await k.click('[data-person-tab="martial"]');await k.click('[data-person-art="punch"]');await k.click('[data-person-move="advanced.closefist"]');const tt=(await k.snap()).tick;await k.click('#move-detail [data-content-attack]');w=await k.until(x=>x.journal.some(e=>e.tick>=tt&&e.type==='action-start'&&e.actors[0]==='amu'&&e.move==='advanced.closefist'),'amu-trial',60000,1);await k.shot('r4-trial');mark('trial');
 // 5 集合與聯合演練
 await fit(['amu','shen']);await k.tab('travel');for(const el of await page.locator('[data-joint-role]').all()){const id=await el.getAttribute('data-joint-role');await el.selectOption({amu:'front',shen:'line'}[id]||'');}await page.locator('#joint-arrival').selectOption('together');await k.click('[data-joint-start="A"]');w=await k.snap();assert.equal(w.drill.status,'assembling',await k.toast());await k.click('[data-camera="yard"]');await k.shot('r5a-assembling');
 w=await k.until(x=>{const d=x.drill,j=d.joint;return d.actors.every(id=>{const p=x.people[id],at=j.points[id];return p.routeAt>=p.path.length&&Math.hypot(p.x/256-at[0],p.y/256-at[1])<=6;});},'assembled',120000,1);await k.tab('travel');await k.click('[data-joint-go]');w=await k.until(x=>x.drill.joint.reviewed,'reviewed',300000);await k.tab('travel');story.r5=await page.locator('#joint-review').innerText();await page.locator('#joint-review').scrollIntoViewIfNeeded();await k.shot('r5b-review');mark('drill');
 // 6 回生活
 await k.person('amu');await k.click('[data-person-tab="life"]');await k.click('[data-action="resume"]');w=await k.until(x=>!x.people.amu.combatSession&&!!x.people.amu.activity,'amu-back',300000);story.r6=await page.locator('#situation-card').innerText();assert.doesNotMatch(story.r6,/演武中/);await k.shot('r6-back-to-life');mark('life');
 story.wallSeconds=(Date.now()-t0)/1000;await k.log('done',{wall:story.wallSeconds});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
