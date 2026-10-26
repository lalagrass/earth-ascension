import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI M15: one completed joint drill and one stopped midway that returns everyone to daily life. Usage: node m15-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m15-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page;
const showcase=new URL('../../evidence/optimization/showcase/showcase-all-features.save.json',import.meta.url).pathname,story={};
const roles=async r=>{await k.tab('travel');for(const id of['leader','amu','lin','shen'])await page.locator('#joint-role-'+id).selectOption(r[id]||'');};
let failure=null;
try{await k.open();await k.newGame();await k.importSave(showcase);await k.calm();await k.tab('travel');await k.click('[data-joint-adopt]');let w=await k.snap();assert.equal(w.rulesVersion,'chapter1-joint-1');
 await roles({amu:'front',shen:'front',lin:'line'});await page.locator('#joint-role-amu').scrollIntoViewIfNeeded();await k.shot('01-roles');await k.click('[data-joint-start="A"]');w=await k.snap();assert.ok(w.drill?.joint,'started: '+await k.toast());
 await k.until(x=>x.drill.wave>=1&&x.drill.opponents.length,'wave-1',120000);await k.tab('travel');await page.locator('#joint-live').scrollIntoViewIfNeeded();await k.shot('02-live');
 w=await k.until(x=>x.drill.joint.reviewed,'reviewed',300000);story.first=w.jointDrill.history.at(-1);await k.tab('travel');await page.locator('#joint-review').scrollIntoViewIfNeeded();story.firstText=await page.locator('#joint-review').innerText();await k.shot('03-review');
 w=await k.until(x=>!Object.values(x.people).some(p=>p.rank==='training'&&!p.inactive&&!p.trainingDefeated),'field-quiet',120000);
 await roles({amu:'front',lin:'line'});await k.click('[data-joint-start="B"]');w=await k.snap();assert.ok(w.drill.joint&&!w.drill.joint.reviewed,'second started: '+await k.toast());const t0=w.tick;await k.until(x=>x.tick>=t0+300,'running-15s',120000);await k.tab('travel');await k.click('[data-special="endDrill"]');w=await k.until(x=>x.drill.joint.reviewed,'stopped',120000);story.second=w.jointDrill.history.at(-1);assert.equal(story.second.outcome,'cancelled');
 w=await k.until(x=>x.tick>=w.tick+200,'settle',60000);for(const id of['amu','lin']){await k.person(id);const card=await page.locator('#situation-card').innerText();story['card_'+id]=card.slice(0,160);assert.doesNotMatch(card,/演武/,id+' still owned by the drill');}await k.shot('04-back-to-life');await k.log('done',{story});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
