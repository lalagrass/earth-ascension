import assert from'node:assert/strict';import{launch}from'./ui-kit.mjs';
// Normal-UI M7 check: a normal save source, every order through panels. Usage: node m7-ui.mjs <label> <width> <height>
const [label='initial',width='1440',height='900']=process.argv.slice(2),k=await launch('m7-ui-'+label+'-'+width,{width:Number(width),height:Number(height)});
const source=new URL('../../evidence/development/visual-final/visual-final.save.json',import.meta.url).pathname,stuck=new URL('../../evidence/optimization/m7-model/stuck-prepare-spar.save.json',import.meta.url).pathname;
const party=async ids=>{await k.tab('travel');for(const box of await k.page.locator('input[name=party]').all())await box.setChecked(ids.includes(await box.getAttribute('value')));};
let failure=null;
try{await k.open();await k.newGame();await k.importSave(source);await k.calm();
 await party(['leader']);await k.page.locator('#destination').selectOption('forest');await k.click('[data-special="expedition"]');let w=await k.snap();assert.equal(w.expedition.phase,'prepare');await k.log('dispatched',{phase:w.expedition.phase,activity:w.activities[w.people.leader.activity]?.kind});
 await k.person('leader');await k.page.locator('#target').selectOption('amu');await k.click('[data-action="spar"]');const sparToast=await k.toast();w=await k.snap();assert.match(sparToast,/召回全隊/);assert.equal(w.activities[w.people.leader.activity]?.kind,'pack');await k.log('spar-rejected',{toast:sparToast});await k.shot('01-spar-rejected');
 await k.click('[data-action="recall"]');const recallToast=await k.toast();w=await k.snap();assert.equal(w.expedition.phase,'cancelled');assert.equal(w.people.leader.storyBusy,false);await k.log('recall-cancelled',{toast:recallToast,phase:w.expedition.phase});await k.tab('travel');await k.shot('02-recall-cancelled');
 await party(['leader']);await k.page.locator('#destination').selectOption('forest');await k.click('[data-special="expedition"]');w=await k.until(x=>x.expedition.phase==='outbound'&&x.people.leader.x/256>1300,'outbound-again');
 await k.person('leader');await k.click('[data-action="recall"]');const back=await k.toast();w=await k.snap();assert.equal(w.expedition.phase,'return');await k.log('outbound-recall',{toast:back});await k.shot('03-outbound-party-recall');
 w=await k.until(x=>x.expedition.phase==='returned','returned-home');assert.equal(w.people.leader.storyBusy,false);await k.tab('travel');await k.shot('04-returned');
 await k.importSave(stuck);await k.tab('travel');const warn=await k.page.locator('#panel .warn').first().textContent();assert.match(warn,/領糧活動已被取代/);await k.page.locator('#panel .warn').first().scrollIntoViewIfNeeded();await k.log('stuck-diagnosed',{warning:warn});await k.shot('05-stuck-save-diagnosed');
 await k.click('[data-special="recallParty"]');w=await k.snap();assert.equal(w.expedition.phase,'cancelled');assert.equal(await k.page.locator('#panel .warn').count(),0);await k.log('stuck-recovered',{phase:w.expedition.phase,toast:await k.toast()});await k.shot('06-stuck-recovered');
 await party(['leader']);await k.click('[data-special="expedition"]');w=await k.snap();assert.equal(w.expedition.phase,'prepare');await k.log('redispatch-after-recovery');
}catch(e){failure=e.stack;await k.shot('failure').catch(()=>{});}
const s=await k.finish({label,viewport:[width,height],failure});console.log(failure?'FAILED':'PASSED',s.wallSeconds);if(failure){console.error(failure);process.exit(1);}
