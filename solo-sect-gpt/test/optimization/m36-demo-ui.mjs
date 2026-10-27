import assert from'node:assert/strict';import fs from'node:fs/promises';import{launch}from'./ui-kit.mjs';import{decode}from'../../src/save.mjs';
// Normal-UI M36: builds the M31-M36 showcase from the M30 showcase with panels and buttons only (temporary job and return, a mentor direction talk, a flank drill where 沈禾 leaves early and punches afterwards), saving a mid-drill file after the leave and the final file with the in-game manual save. Usage: node m36-demo-ui.mjs <label> <w> <h> [--write-demo]
const [label='initial',width='1440',height='900',flag='']=process.argv.slice(2),k=await launch('m36-demo-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={};
const demo=new URL('../../evidence/optimization/m30/showcase-m24-m30.save.json',import.meta.url).pathname,out=new URL('../../evidence/optimization/m36/',import.meta.url);
const life=async id=>{await k.person(id);await k.click('[data-person-tab="life"]');};
const sec=async(who,id)=>{await life(who);const d=page.locator('details[data-section="'+id+'"]');if(!await d.evaluate(e=>e.open))await d.locator('summary').click();await d.scrollIntoViewIfNeeded();};
const manual=async()=>{await k.tab('save');await k.click('[data-special="save"]');await page.waitForTimeout(500);return page.evaluate(()=>localStorage.getItem('solo-sect-gpt.chapter1.v1.manual'));};
const bond=w=>w.mentorPlan.bonds.find(b=>b.status==='active');
let failure=null;
try{await k.open();await k.newGame();await k.importSave(demo);await k.calm();
 // 1 temporary job and return (M33)
 await sec('amu','work');const box=page.locator('#temporary-order');if(await box.isChecked())await box.click();await k.click('[data-gather="wood"]');await box.click();await k.click('[data-gather="veg"]');let w=await k.snap();assert.ok(w.people.amu.temporary,await k.toast());w=await k.until(x=>!x.people.amu.temporary,'temporary-return',600000);assert.equal(w.people.amu.intent?.args?.item,'wood');story.temporary=w.journal.filter(e=>e.type==='temporary-return').at(-1)?.data;
 await life('amu');await k.click('#p-cmds [data-action="stop"]');
 // 2 mentor direction talk (M31 chronicle)
 const b0=bond(await k.snap());story.pair=[b0.master,b0.disciple];await sec(b0.master,'mentor');await k.click('[data-mentor-direction-cancel]');await sec(b0.master,'mentor');await page.locator('#mentor-direction').selectOption('weapon:staff');await k.click('[data-mentor-direction]');await sec(b0.disciple,'mentor');await k.click('[data-mentor-direction-respond="1"]');
 w=await k.until(x=>{const b=bond(x);return !b.lastEvent||x.tick-b.lastEvent>=1200;},'cooldown',180000);await sec(b0.master,'mentor');await k.click('[data-mentor-event="mentor.direction-set"]');w=await k.until(x=>bond(x).direction.state==='set'&&bond(x).direction.art==='staff','set',180000);story.mentor=bond(w).direction;
 // 3 flank drill, 沈禾 leaves, punches three times, then the drill ends (M31 body cut-off)
 for(const id of['amu','shen']){w=await k.snap();const p=w.people[id];if(p.hp<p.maxHp*.8||p.injury>30){await life(id);await k.click('#p-cmds [data-task="rest"]');await k.until(x=>x.people[id].hp>=x.people[id].maxHp*.8&&x.people[id].injury<=30,'rest-'+id,600000);await life(id);await k.click('#p-cmds [data-action="stop"]');}}
 await k.tab('travel');for(const el of await page.locator('[data-joint-role]').all()){const id=await el.getAttribute('data-joint-role');await el.selectOption({amu:'front',shen:'line'}[id]||'');}await page.locator('#joint-arrival').selectOption('flank');await k.click('[data-joint-start="A"]');
 w=await k.until(x=>{const d=x.drill,j=d.joint;return d.actors.every(id=>{const p=x.people[id],at=j.points[id];return p.routeAt>=p.path.length&&Math.hypot(p.x/256-at[0],p.y/256-at[1])<=6;});},'assembled',120000,1);await k.tab('travel');await k.click('[data-joint-go]');w=await k.until(x=>x.drill.opponents.length>0,'wave',60000,1);
 await life('shen');await page.locator('.sit button',{hasText:'自己退出'}).click();w=await k.until(x=>x.drill.joint.bodyAt?.shen,'left',30000,1);story.atLeave=w.drill.joint.bodyAt.shen;story.start=w.drill.joint.body.shen;
 const mid=await manual();story.midSave={tick:(await decode(mid)).tick};await fs.writeFile(new URL('manual-mid-drill.json',k.out),mid);
 for(let i=0;i<3;i++){await k.person('shen');await k.click('[data-person-tab="martial"]');await k.click('[data-person-art="punch"]');await k.click('[data-person-move="punch"]');const t=(await k.snap()).tick;await k.click('#move-detail [data-content-attack]');await k.until(x=>x.tick>t+50&&!x.people.shen.action,'punch-'+i,30000,1);}
 await k.tab('travel');await k.click('[data-special="endDrill"]');w=await k.until(x=>x.drill.joint.reviewed,'reviewed',30000,1);story.review=w.jointDrill.history.at(-1).body;assert.equal(story.review.shen.energyUsed,story.start.energy-story.atLeave.energy);
 // 4 manual save
 const text=await manual();const s=await decode(text);story.save={tick:s.tick,rulesVersion:s.rulesVersion};await fs.writeFile(new URL('manual-save.json',k.out),text);
 if(flag==='--write-demo'){await fs.writeFile(new URL('showcase-m31-m36.save.json',out),text);await fs.writeFile(new URL('drill-left-midway.save.json',out),mid);story.demoWritten=['evidence/optimization/m36/showcase-m31-m36.save.json','evidence/optimization/m36/drill-left-midway.save.json'];}
 await k.log('done',{save:story.save});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
