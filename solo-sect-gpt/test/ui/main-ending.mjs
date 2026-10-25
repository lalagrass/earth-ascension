import {harness} from './harness.mjs';const h=await harness('journey-05');let error;
try{
 await h.start(new URL('../../evidence/development/journey-04/drill-A-complete.save.json',import.meta.url).pathname);
 for(const id of ['amu','leader']){await h.person(id);await h.click('[data-task="rest"]');await h.wait(w=>w.people[id].energy>=9900&&w.people[id].hp===w.people[id].maxHp,'rested '+id,180000);await h.paused(true);await h.person(id);await h.click('[data-action="stop"]');await h.paused(false);}
 await h.person('leader');await h.page.locator('#target').selectOption('amu');await h.click('[data-action="promote"]');await h.wait(w=>w.people.amu.rank==='inner','real assessment and inner promotion',120000);
 await h.person('leader');await h.click('[data-cook="ration"]');await h.wait(w=>(w.inventories.store.items.ration||0)>=4,'dry provisions cooked',180000);await h.checkpoint('pre-cave');
 await h.tab('travel');await h.page.locator('input[name=party][value=leader]').check();await h.page.locator('input[name=party][value=amu]').check();await h.page.locator('#destination').selectOption('cave');await h.click('[data-special="expedition"]');
 await h.wait(w=>w.expedition?.phase==='gate'&&w.expedition.actors.every(id=>w.people[id].routeAt>=w.people[id].path.length),'party physically at cave roadblock',180000);
 await h.click('[data-special="talkWardens"]');await h.wait(w=>['cave','collect','attach','return'].includes(w.expedition?.phase),'cave reached',120000);
 if((await h.snap()).expedition.phase==='cave')await h.click('[data-choice="rescue"]');await h.click('[data-camera="cave"]');await h.checkpoint('cave-rescue-chosen');
 await h.wait(w=>w.expedition?.phase==='returned','whole party and Zhou physically returned',240000);await h.checkpoint('cave-rescue-returned');
 await h.click('[data-camera="home"]');await h.tab('travel');await h.page.locator('#sect-name').fill('山中留人');await h.click('[data-special="found"]');if(!(await h.snap()).completed)throw Error('founding rejected '+JSON.stringify((await h.snap()).commands.at(-1)));
 await h.page.screenshot({path:new URL('chapter-complete-modal.png',h.out).pathname});await h.click('#close-modal');await h.checkpoint('chapter-complete');
}catch(e){error=e;console.error(e);process.exitCode=1;}finally{await h.close(error);}
