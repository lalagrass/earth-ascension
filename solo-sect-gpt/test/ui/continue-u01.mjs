import {harness} from './harness.mjs';
const h=await harness('journey-03');let error;
try{
 await h.start(new URL('../../evidence/development/journey-01/s2-construction.save.json',import.meta.url).pathname);
 await h.person('amu');await h.click('[data-action="resume"]');await h.person('leader');await h.click('[data-task="rest"]');
 await h.wait(w=>w.people.leader.energy>=9000,'leader recovered',180000);
 // Resume the artisan so the normal supply policy can cook before invitations.
 await h.person('leader');await h.click('[data-action="resume"]');
 await h.wait(w=>(w.inventories.table.items.meal||0)>=12,'meals for invitation',300000);
 await h.paused(true);await h.person('amu');await h.click('[data-action="stop"]');await h.person('leader');await h.click('[data-action="stop"]');await h.page.locator('#target').selectOption('amu');await h.click('[data-social="talk"]');await h.paused(false);
 await h.wait(w=>w.memories.some(m=>m.kind==='talk'&&m.actors.includes('leader')&&m.actors.includes('amu')),'real conversation',180000);
 await h.paused(true);await h.person('leader');await h.page.locator('#target').selectOption('amu');await h.click('[data-action="invite"]');
 if((await h.snap()).people.amu.rank!=='outer')throw Error('worker not invited: '+JSON.stringify((await h.snap()).commands.at(-1)));
 await h.checkpoint('amu-joined');await h.paused(false);
 await h.person('amu');await h.click('[data-action="resume"]');await h.person('leader');await h.click('[data-action="resume"]');
 await h.wait(w=>(w.inventories.table.items.meal||0)>=10,'food for school and fame',300000);
 await h.tab('stories');await h.click('[data-special="school"]');await h.wait(w=>w.stories['recruit.school'].status==='completed','school physically complete',240000);
 await h.person('leader');await h.page.locator('#target').selectOption('lin');await h.click('[data-action="invite"]');if((await h.snap()).people.lin.rank!=='outer')throw Error('Lin invitation failed');
 await h.tab('stories');await h.click('[data-special="fame"]');await h.wait(w=>w.stories['recruit.fame'].status==='completed','fame reception complete',180000);
 await h.person('leader');await h.page.locator('#target').selectOption('shen');await h.click('[data-action="invite"]');if((await h.snap()).people.shen.rank!=='outer')throw Error('Shen invitation failed');
 await h.checkpoint('four-adult-members');
 // Preserve a genuine before-training configuration for the later comparison.
 for(const id of ['leader','amu']){await h.person(id);await h.click('[data-task="train"]');}
 await h.wait(w=>w.people.leader.skill.punch.F>=90&&w.people.amu.skill.punch.F>=90,'both naturally practiced F90',360000);
 await h.person('leader');await h.click('[data-task="rest"]');await h.person('amu');await h.click('[data-task="rest"]');await h.wait(w=>['leader','amu'].every(id=>w.people[id].energy>=9900&&w.people[id].hp===w.people[id].maxHp),'rested for real drill',180000);
 await h.tab('travel');await h.page.locator('input[name=party][value=leader]').check();await h.page.locator('input[name=party][value=amu]').check();await h.click('[data-drill="A"]');await h.wait(w=>w.drill?.status==='completed','drill A two waves',180000);
 await h.checkpoint('first-complete-drill');
}catch(e){error=e;console.error(e);process.exitCode=1;}finally{await h.close(error);}
