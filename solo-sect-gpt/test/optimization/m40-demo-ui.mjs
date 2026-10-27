import assert from'node:assert/strict';import fs from'node:fs/promises';import{launch}from'./ui-kit.mjs';import{decode}from'../../src/save.mjs';
// Normal-UI M40: builds the M37-M40 showcase from the M36 showcase with panels and buttons only: a pot of food carried to the table, a mentor talk to the sword,
// a paused flank drill where 沈禾 leaves and punches in the same tick (mid-drill save after the punch), then the review. Usage: node m40-demo-ui.mjs <label> <w> <h> [--write-demo]
const [label='initial',width='1440',height='900',flag='']=process.argv.slice(2),k=await launch('m40-demo-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={};
const demo=new URL('../../evidence/optimization/m36/showcase-m31-m36.save.json',import.meta.url).pathname,out=new URL('../../evidence/optimization/m40/',import.meta.url);
const life=async id=>{await k.person(id);await k.click('[data-person-tab="life"]');};
const sec=async(who,id)=>{await life(who);const d=page.locator('details[data-section="'+id+'"]');if(!await d.evaluate(e=>e.open))await d.locator('summary').click();await d.scrollIntoViewIfNeeded();};
const manual=async()=>{await k.tab('save');await k.click('[data-special="save"]');await page.waitForTimeout(500);return page.evaluate(()=>localStorage.getItem('solo-sect-gpt.chapter1.v1.manual'));};
const bond=w=>w.mentorPlan.bonds.find(b=>b.status==='active');
let failure=null;
try{await k.open();await k.newGame();await k.importSave(demo);await k.calm();
 // 1 a pot of food (M37 transit)
 const m0=(await k.snap()).inventories.table.items.meal||0;await k.tab('build');await k.click('[data-facility-pick="kitchen"]');await page.locator('#facility-actor').selectOption('amu');await page.locator('#facility-jobs button',{hasText:'做基礎餐'}).click();let w=await k.until(x=>(x.inventories.table.items.meal||0)>m0,'meal',600000,2);story.meals=[m0,w.inventories.table.items.meal];
 await life('amu');await k.click('#p-cmds [data-action="stop"]');
 // 2 mentor talk (chronicle)
 const b0=bond(await k.snap());await sec(b0.master,'mentor');await k.click('[data-mentor-direction-cancel]');await sec(b0.master,'mentor');await page.locator('#mentor-direction').selectOption('weapon:sword');await k.click('[data-mentor-direction]');await sec(b0.disciple,'mentor');await k.click('[data-mentor-direction-respond="1"]');
 w=await k.until(x=>{const b=bond(x);return !b.lastEvent||x.tick-b.lastEvent>=1200;},'cooldown',180000);await sec(b0.master,'mentor');await k.click('[data-mentor-event="mentor.direction-set"]');w=await k.until(x=>bond(x).direction.state==='set'&&bond(x).direction.art==='sword','set',180000);story.mentor=bond(w).direction;
 // 3 paused drill: leave, punch in the same tick (M37 cut-off)
 for(const id of['amu','shen']){w=await k.snap();const p=w.people[id];if(p.hp<p.maxHp*.8||p.injury>30){await life(id);await k.click('#p-cmds [data-task="rest"]');await k.until(x=>x.people[id].hp>=x.people[id].maxHp*.8&&x.people[id].injury<=30,'rest-'+id,600000);await life(id);await k.click('#p-cmds [data-action="stop"]');}}
 await k.tab('travel');for(const el of await page.locator('[data-joint-role]').all()){const id=await el.getAttribute('data-joint-role');await el.selectOption({amu:'front',shen:'line'}[id]||'');}await page.locator('#joint-arrival').selectOption('flank');await k.click('[data-joint-start="A"]');
 w=await k.until(x=>{const d=x.drill,j=d.joint;return d.actors.every(id=>{const p=x.people[id],at=j.points[id];return p.routeAt>=p.path.length&&Math.hypot(p.x/256-at[0],p.y/256-at[1])<=6;});},'assembled',120000,1);await k.tab('travel');await k.click('[data-joint-go]');w=await k.until(x=>x.drill.opponents.length>0&&x.tick>=x.drill.joint.goAt+60&&!x.people.shen.action,'wave',60000,1);
 const start=w.drill.joint.body.shen.energy;await life('shen');await page.locator('.sit button',{hasText:'自己退出'}).click();w=await k.snap();story.leave={tick:w.tick,energy:w.people.shen.energy};
 await k.click('[data-person-tab="martial"]');await k.click('[data-person-art="punch"]');await k.click('[data-person-move="punch"]');await k.click('#move-detail [data-content-attack]');w=await k.snap();story.punch={tick:w.tick,energy:w.people.shen.energy};assert.equal(story.punch.tick,story.leave.tick);assert.ok(story.punch.energy<story.leave.energy);
 const mid=await manual();const md=await decode(mid);assert.equal(md.drill.joint.cut?.shen,story.leave.tick);story.midSave={tick:md.tick,cut:md.drill.joint.cut};await fs.writeFile(new URL('manual-mid-drill.json',k.out),mid);
 await k.until(x=>x.tick>=story.leave.tick+40,'play-on',30000,1);await k.tab('travel');await k.click('[data-special="endDrill"]');w=await k.until(x=>x.drill.joint.reviewed,'reviewed',30000,1);story.review=w.jointDrill.history.at(-1).body;story.startEnergy=start;assert.equal(story.review.shen.energyUsed,start-story.leave.energy);
 // 4 manual save
 await life('shen');const text=await manual();const s=await decode(text);story.save={tick:s.tick,rulesVersion:s.rulesVersion};await fs.writeFile(new URL('manual-save.json',k.out),text);
 if(flag==='--write-demo'){await fs.writeFile(new URL('showcase-m37-m40.save.json',out),text);await fs.writeFile(new URL('drill-cut-midway.save.json',out),mid);story.demoWritten=['evidence/optimization/m40/showcase-m37-m40.save.json','evidence/optimization/m40/drill-cut-midway.save.json'];}
 await k.log('done',{save:story.save,review:story.review});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
