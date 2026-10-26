import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI M21: new game with the daily schedule, adopt autonomy v1, watch one full simulated day at 4x; one temporary order returns to the schedule; the card shows the goal source. Usage: node m21-ui.mjs <label> <w> <h> [full|card]
const [label='initial',width='1440',height='900',mode='full']=process.argv.slice(2),k=await launch('m21-ui-'+label+'-'+width,{width:Number(width),height:Number(height)}),page=k.page,story={samples:[]};
const DAY=12000,card=async id=>{await k.person(id);await k.click('[data-person-tab="life"]');return page.locator('#situation-card').innerText();};
let failure=null;
try{await k.open();await k.newGame();await k.tab('life');await k.click('[data-autonomy-adopt]');let w=await k.snap();assert.equal(w.rulesVersion,'chapter1-autonomy-1',await k.toast());await k.tab('life');story.adopted=await page.locator('#autonomy').innerText();await k.shot('01-adopted');
 const t0=w.tick,wall0=Date.now();story.start={tick:t0,speed:4};
 if(mode==='card'){w=await k.until(x=>x.tick>=t0+3000,'card-sample',300000,4);for(const id of['leader','amu']){const t=await card(id);story.samples.push({id,tick:(await k.snap()).tick,text:t});assert.match(t,/目標來源/);}await k.shot('02-card');}
 else{for(const [i,at]of[[1,2500],[2,6100],[3,7600]].entries()){w=await k.until(x=>x.tick>=t0+at[1],'sample-'+at[0],600000,4);for(const id of['leader','amu']){const t=await card(id);story.samples.push({id,tick:w.tick,text:t.slice(0,400)});}await k.shot('0'+(i+2)+'-day-'+at[1]);}
  // One temporary order: amu fetches wood once, then returns to the schedule by itself.
  await k.person('amu');await k.click('[data-person-tab="life"]');const temp=page.locator('#temporary-order');if(await temp.count()&&!await temp.isChecked())await temp.check();await page.locator('details[data-section="work"] summary').click();await k.click('[data-gather="wood"]');w=await k.snap();assert.ok(w.people.amu.temporary,'temporary order accepted: '+await k.toast());story.temporaryAt=w.tick;story.temporaryCard=await card('amu');w=await k.until(x=>!x.people.amu.temporary,'temporary-done',300000,4);story.restoredAt=w.tick;story.afterTemporary=(await card('amu')).slice(0,300);await k.shot('05-after-temporary');
  w=await k.until(x=>x.tick>=t0+DAY,'full-day',900000,4);story.end={tick:w.tick,simSeconds:(w.tick-t0)/20,wallSeconds:(Date.now()-wall0)/1000,speed:4};story.meals=Object.fromEntries(Object.values(w.people).filter(p=>p.residence==='resident').map(p=>[p.id,[p.mealDay,p.meals]]));await k.tab('records');await k.shot('06-day-end');}
 for(const s of story.samples)assert.doesNotMatch(s.text,/勤勉-?\d|顧人-?\d/);await k.log('done',{end:story.end});
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure,story});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
