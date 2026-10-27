import assert from'node:assert/strict';import fs from'node:fs/promises';import{launch}from'./ui-kit.mjs';import{decode}from'../../src/save.mjs';
// Normal-UI M44: builds the M41-M44 showcase from the M40 showcase with panels and buttons only: a pot of food to the table; a joint drill fought out to its
// natural end, saved while exiting (M41 freeze); 沈禾 punches in that paused tick; the review. Usage: node m44-demo-ui.mjs <label> <w> <h> [--write-demo]
const [label='initial',width='1440',height='900',flag='']=process.argv.slice(2),k=await launch('m44-demo-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={};
const demo=new URL('../../evidence/optimization/m40/showcase-m37-m40.save.json',import.meta.url).pathname,out=new URL('../../evidence/optimization/m44/',import.meta.url);
const life=async id=>{await k.person(id);await k.click('[data-person-tab="life"]');};
const manual=async()=>{await k.tab('save');await k.click('[data-special="save"]');await page.waitForTimeout(500);return page.evaluate(()=>localStorage.getItem('solo-sect-gpt.chapter1.v1.manual'));};
let failure=null;
try{await k.open();await k.newGame();await k.importSave(demo);await k.calm();
 const m0=(await k.snap()).inventories.table.items.meal||0;await k.tab('build');await k.click('[data-facility-pick="kitchen"]');await page.locator('#facility-actor').selectOption('amu');await page.locator('#facility-jobs button',{hasText:'做基礎餐'}).click();let w=await k.until(x=>(x.inventories.table.items.meal||0)>m0,'meal',600000,2);story.meals=[m0,w.inventories.table.items.meal];
 await life('amu');await k.click('#p-cmds [data-action="stop"]');
 for(const id of['amu','shen']){w=await k.snap();const p=w.people[id];if(p.hp<p.maxHp*.8||p.injury>30){await life(id);await k.click('#p-cmds [data-task="rest"]');await k.until(x=>x.people[id].hp>=x.people[id].maxHp*.8&&x.people[id].injury<=30,'rest-'+id,600000);await life(id);await k.click('#p-cmds [data-action="stop"]');}}
 await k.tab('travel');for(const el of await page.locator('[data-joint-role]').all()){const id=await el.getAttribute('data-joint-role');await el.selectOption({amu:'front',shen:'front'}[id]||'');}await page.locator('#joint-arrival').selectOption('together');await k.click('[data-joint-start="A"]');
 w=await k.until(x=>{const d=x.drill,j=d.joint;return d.actors.every(id=>{const p=x.people[id],at=j.points[id];return p.routeAt>=p.path.length&&Math.hypot(p.x/256-at[0],p.y/256-at[1])<=6;});},'assembled',120000,1);await k.tab('travel');await k.click('[data-joint-go]');
 w=await k.until(x=>x.drill.status==='exiting'||x.drill.joint.reviewed,'exiting',600000,1);assert.equal(w.drill.status,'exiting');story.exit={tick:w.tick,closedAt:w.drill.joint.closedAt,bodyAt:w.drill.joint.bodyAt,start:w.drill.joint.body};
 const mid=await manual();const md=await decode(mid);assert.equal(md.drill.status,'exiting');assert.equal(md.drill.joint.closedAt,story.exit.closedAt);await fs.writeFile(new URL('manual-exit-midway.json',k.out),mid);
 await life('shen');await k.click('[data-person-tab="martial"]');await k.click('[data-person-art="punch"]');await k.click('[data-person-move="punch"]');const e0=(await k.snap()).people.shen.energy;await k.click('#move-detail [data-content-attack]');w=await k.snap();story.punch={tick:w.tick,before:e0,after:w.people.shen.energy};assert.equal(w.tick,story.exit.tick);assert.ok(story.punch.after<e0);
 w=await k.until(x=>x.drill.joint.reviewed,'reviewed',300000,1);story.review=w.jointDrill.history.at(-1).body;for(const id of['amu','shen'])assert.equal(story.review[id].energyUsed,story.exit.start[id].energy-story.exit.bodyAt[id].energy,id);
 await life('shen');const text=await manual();const s=await decode(text);story.save={tick:s.tick};await fs.writeFile(new URL('manual-save.json',k.out),text);
 if(flag==='--write-demo'){await fs.writeFile(new URL('showcase-m41-m44.save.json',out),text);await fs.writeFile(new URL('drill-exit-midway.save.json',out),mid);story.demoWritten=['evidence/optimization/m44/showcase-m41-m44.save.json','evidence/optimization/m44/drill-exit-midway.save.json'];}
 await k.log('done',{save:story.save,review:story.review});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
