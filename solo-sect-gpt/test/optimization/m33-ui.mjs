import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI M33: original job -> one temporary job -> back to the original; stop -> resume; switching people; an injured member rests and resumes. Usage: node m33-ui.mjs <label> <w> <h>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m33-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={};
const demo=new URL('../../evidence/optimization/m30/showcase-m24-m30.save.json',import.meta.url).pathname,hurt=new URL('../../evidence/development/u05-rescue-current/normal-failed-journey-rescued.save.json',import.meta.url).pathname;
const life=async id=>{await k.person(id);await k.click('[data-person-tab="life"]');};
const panel=async()=>{const s=page.locator('section.public-intent');if(!await s.locator('details[data-view-key="intent"]').evaluate(e=>e.open))await s.locator('details[data-view-key="intent"] summary').click();return(await s.innerText())+'\n'+(await page.locator('#intent-extra').innerText());};
const temp=async on=>{const box=page.locator('#temporary-order');if(await box.isChecked()!==on)await box.click();};
const gather=async item=>{const d=page.locator('details[data-section="work"]');if(!await d.evaluate(e=>e.open))await d.locator('summary').click();await k.click('[data-gather="'+item+'"]');};
let failure=null;
try{await k.open();await k.newGame();await k.importSave(demo);await k.calm();
 // 1 original job, then one temporary job that returns to it.
 await life('amu');await temp(false);await gather('wood');let w=await k.snap();assert.equal(w.people.amu.intent?.kind,'gather');story.original=await panel();assert.match(story.original,/既有工作目標：採集（木）/);
 await temp(true);await gather('veg');w=await k.snap();assert.ok(w.people.amu.temporary,await k.toast());await life('amu');story.temporary=await panel();assert.match(story.temporary,/臨時工作：採集 → 回原指令：採集（木）/);assert.match(story.temporary,/目標來源：臨時指令/);await k.shot('01-temporary');
 w=await k.until(x=>!x.people.amu.temporary,'temporary-done',600000);assert.equal(w.people.amu.intent?.args?.item,'wood');await life('amu');story.returned=await panel();assert.match(story.returned,/既有工作目標：採集（木）/);assert.match(story.returned,/臨時工作：不適用/);await k.shot('02-returned');
 // 2 stop -> resume through the intent buttons; each press is one command.
 let n0=(await k.snap()).commands.length;await k.click('#p-cmds [data-action="stop"]');w=await k.snap();assert.equal(w.people.amu.manualStop,true);assert.equal(w.commands.length,n0+1);await life('amu');assert.match(await page.locator('[data-intent-result]').innerText(),/最近一次操作（停工）：已送出/);story.stopped=await panel();assert.match(story.stopped,/明確停工：是/);
 await k.click('#p-cmds [data-action="resume"]');w=await k.snap();assert.equal(w.people.amu.manualStop,false);assert.equal(w.people.amu.auto,true);assert.equal(w.commands.length,n0+2);await life('amu');await k.shot('03-resumed');
 // 3 switch people: amu's result stays on amu; an amu button left on lin's screen is refused (labeled DOM fixture: a stale copy of amu's 停工 button).
 await life('lin');const linResult=await page.locator('[data-intent-result]').allInnerTexts();assert.ok(!linResult.some(t=>/（恢復自主）/.test(t)),'amu result leaked to lin');const lin0=(await k.snap()).people.lin.manualStop;n0=(await k.snap()).commands.length;
 await life('amu');const stale=await page.locator('#p-cmds [data-action="stop"]').evaluate(b=>b.outerHTML);await life('lin');await page.evaluate(html=>{const box=document.createElement('div');box.id='m33-stale';box.innerHTML=html;document.querySelector('section.public-intent').append(box);},stale);await k.click('#m33-stale button');
 w=await k.snap();assert.equal(w.commands.length,n0);assert.equal(w.people.amu.manualStop,false);assert.equal(w.people.lin.manualStop,lin0);story.staleToast=await k.toast();assert.match(story.staleToast,/人物已切換/);assert.deepEqual(await page.locator('[data-intent-result]').allInnerTexts(),linResult);await life('amu');story.amuResult=await page.locator('[data-intent-result]').innerText();assert.match(story.amuResult,/人物已切換/);await k.shot('04-switched');
 // 4 an injured member rests (core recovery) and then goes back to the schedule.
 await k.importSave(hurt);await life('shen');if(await page.locator('[data-action="adoptLifePolicy"]').count())await k.click('[data-action="adoptLifePolicy"]');await k.tab('life');await k.click('[data-autonomy-adopt]');w=await k.snap();assert.ok(w.autonomyPlan&&w.lifePolicy,await k.toast());story.hurt={injury:w.people.shen.injury};
 await life('shen');if(!(await k.snap()).people.shen.auto)await k.click('#p-cmds [data-action="toggleAuto"]');await k.click('#p-cmds [data-action="resume"]');
 w=await k.until(x=>x.people.shen.recovering||/^必要自理/.test(x.people.shen.reason||''),'recovering',180000);await life('shen');story.resting=await panel();assert.match(story.resting,/恢復：必要/);await k.shot('05-recovering');
 w=await k.until(x=>{const p=x.people.shen,a=x.activities[p.activity];return!p.recovering&&p.injury<=60&&a&&!['rest','sleep','eat'].includes(a.kind);},'back',1500000);await life('shen');story.back=await panel();assert.match(story.back,/恢復：沒有/);assert.doesNotMatch(story.back,/目標來源：不支援/);await k.shot('06-back');
 await k.log('done',{});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
