import assert from'node:assert/strict';import fs from'node:fs/promises';import{launch}from'./ui-kit.mjs';import{decode}from'../../src/save.mjs';
// Normal-UI M30: builds the M24-M30 showcase from the M23 showcase with panels and buttons only, then saves with the in-game manual save. Usage: node m30-demo-ui.mjs <label> <w> <h> [--write-demo]
const [label='initial',width='1440',height='900',flag='']=process.argv.slice(2),k=await launch('m30-demo-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={};
const demo=new URL('../../evidence/optimization/showcase-m23/showcase-m17-m23.save.json',import.meta.url).pathname;
const fit=async ids=>{for(const id of ids){const w=await k.snap(),p=w.people[id];if(p.hp<p.maxHp*.8||p.injury>30){await k.person(id);await k.click('[data-person-tab="life"]');await k.click('[data-task="rest"]');await k.until(x=>x.people[id].hp>=x.people[id].maxHp*.8&&x.people[id].injury<=30,'rest-'+id,600000);await k.person(id);await k.click('[data-action="stop"]');}}};
let failure=null;
try{await k.open();await k.newGame();await k.importSave(demo);await k.calm();
 // A real kitchen job from the facility card.
 await k.tab('build');await k.click('[data-facility-pick="kitchen"]');await page.locator('#facility-actor').selectOption('amu');const m0=(await k.snap()).inventories.table.items.meal||0;await page.locator('#facility-jobs button',{hasText:'做基礎餐'}).click();let w=await k.until(x=>(x.inventories.table.items.meal||0)>m0,'meal',600000);story.meals=[m0,w.inventories.table.items.meal];
 // A flank drill with a line holder.
 await fit(['amu','lin']);await k.tab('travel');for(const el of await page.locator('[data-joint-role]').all()){const id=await el.getAttribute('data-joint-role');await el.selectOption({amu:'front',lin:'line'}[id]||'');}await page.locator('#joint-arrival').selectOption('flank');await k.click('[data-joint-start="A"]');
 w=await k.until(x=>{const d=x.drill,j=d.joint;return d.actors.every(id=>{const p=x.people[id],at=j.points[id];return p.routeAt>=p.path.length&&Math.hypot(p.x/256-at[0],p.y/256-at[1])<=6;});},'assembled',120000,1);await k.tab('travel');await k.click('[data-joint-go]');w=await k.until(x=>x.drill.joint.reviewed,'reviewed',300000);story.review={outcome:w.jointDrill.history.at(-1).outcome,arrival:w.jointDrill.history.at(-1).arrival,intercepts:w.jointDrill.history.at(-1).intercepts};
 await k.tab('save');await k.click('[data-special="save"]');await page.waitForTimeout(500);const text=await page.evaluate(()=>localStorage.getItem('solo-sect-gpt.chapter1.v1.manual'));const s=await decode(text);story.save={tick:s.tick,rulesVersion:s.rulesVersion};await fs.writeFile(new URL('manual-save.json',k.out),text);
 if(flag==='--write-demo'){const dir=new URL('../../evidence/optimization/m30/',import.meta.url);await fs.mkdir(dir,{recursive:true});await fs.writeFile(new URL('showcase-m24-m30.save.json',dir),text);story.demoWritten='evidence/optimization/m30/showcase-m24-m30.save.json';}
 await k.log('done',{save:story.save});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
