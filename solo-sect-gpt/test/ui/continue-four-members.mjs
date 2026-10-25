import {harness} from './harness.mjs';const h=await harness('journey-04');let error;
try{
 await h.start(new URL('../../evidence/development/journey-03/interrupted.save.json',import.meta.url).pathname);
 // Recover from the real insufficient-unreserved-food rejection, preserving Shen's identity.
 await h.person('leader');await h.click('[data-cook="meal"]');await h.wait(w=>!w.people.leader.intent||w.people.leader.intent.kind!=='cook','first extra meal batch',180000);
 await h.person('leader');await h.click('[data-cook="meal"]');await h.wait(w=>(w.inventories.table.items.meal||0)>=16,'food beyond existing reservations',180000);
 await h.paused(true);await h.person('leader');await h.page.locator('#target').selectOption('shen');await h.click('[data-action="invite"]');if((await h.snap()).people.shen.rank!=='outer')throw Error('Shen still declined '+JSON.stringify((await h.snap()).commands.at(-1)));
 await h.checkpoint('four-adult-members');await h.paused(false);
 for(const id of ['leader','amu']){await h.person(id);await h.click('[data-task="train"]');}
 await h.wait(w=>w.people.leader.skill.punch.F>=90&&w.people.amu.skill.punch.F>=90,'normally practiced both F90',420000);
 for(const id of ['leader','amu']){await h.person(id);await h.click('[data-task="rest"]');await h.wait(w=>w.people[id].energy>=9900&&w.people[id].hp===w.people[id].maxHp,'rested '+id,180000);await h.paused(true);await h.person(id);await h.click('[data-action="stop"]');await h.paused(false);}
 await h.checkpoint('before-drill');await h.tab('travel');await h.page.locator('input[name=party][value=leader]').check();await h.page.locator('input[name=party][value=amu]').check();await h.click('[data-drill="A"]');await h.wait(w=>w.drill?.status==='completed','two-wave A complete',180000);await h.checkpoint('drill-A-complete');
}catch(e){error=e;console.error(e);process.exitCode=1;}finally{await h.close(error);}
