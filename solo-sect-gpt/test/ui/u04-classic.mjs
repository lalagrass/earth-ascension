import {harness} from './harness.mjs';const template=process.argv[2]||'linghu',h=await harness('u04-'+template+(process.env.NORMAL_SAVE?'-resume':''));let error;
async function build(id){await h.person('leader');await h.tab('build');const old=(await h.snap()).facilities[id].stage;await h.click('[data-build="'+id+'"]');await h.wait(w=>w.facilities[id].stage>old,'built '+id,420000);}
async function rest(id){await h.person(id);await h.click('[data-task="rest"]');await h.wait(w=>w.people[id].energy>=9900&&w.people[id].hp===w.people[id].maxHp,'rest '+id,180000);await h.paused(true);await h.person(id);await h.click('[data-action="stop"]');await h.paused(false);}
async function story(node){await h.person('leader');await h.tab('stories');await h.click('[data-story="'+node+'"]');await h.wait(w=>w.stories[node].status==='completed','own story '+node,240000);await h.checkpoint(node.replace('.','-'));}
try{
 await h.start(process.env.NORMAL_SAVE||null,{template,seed:template==='guo'?47:template==='linghu'?71:101});if(!process.env.NORMAL_SAVE){await h.paused(true);const start=await h.snap();if(start.people.leader.skill.punch.F!==0||start.inventories.store.items.money!==30)throw Error('template gave a head start');await h.checkpoint('normal-template-start');await h.paused(false);
 await h.person('leader');await h.page.locator('#meal-goal').fill('16');await h.click('[data-action="goals"]');await build('dorm');await build('hall');
 await h.person('leader');await h.click('[data-task="train"]');await h.wait(w=>w.people.leader.skill.punch.F>=18,'normal template practice',180000);
 }
 if(template==='linghu'){
  await build('yard');await build('quiet');await rest('leader');await rest('amu');await story('linghu.1');await story('linghu.2');
 }else if(template==='guo'){
  await build('yard');await story('guo.1');for(const id of ['leader','amu']){await h.person(id);await h.click('[data-task="train"]');}await h.wait(w=>['leader','amu'].every(id=>w.people[id].skill.punch.F>=90),'both F90 by full practice',420000);await rest('amu');await rest('leader');
  await h.tab('travel');await h.page.locator('input[name=party][value=amu]').check();await h.page.locator('input[name=party][value=leader]').check();await h.click('[data-drill="A"]');await h.wait(w=>w.drill?.status==='completed','real deep-practice drill',180000);if((await h.snap()).people.leader.skill.punch.I<10)throw Error('Guo depth contexts incomplete');await rest('amu');await rest('leader');await story('guo.2');
 }else{
  await h.person('leader');await h.click('[data-action="resume"]');await h.person('amu');await h.click('[data-action="resume"]');await h.wait(w=>(w.inventories.table.items.meal||0)>=12,'food for Amu',240000);
  for(const kind of ['talk','teach']){await h.paused(true);for(const id of ['amu','leader']){await h.person(id);await h.click('[data-action="stop"]');}await h.person('leader');await h.page.locator('#target').selectOption('amu');await h.click('[data-social="'+kind+'"]');await h.paused(false);await h.wait(w=>w.memories.some(m=>m.kind===kind&&m.actors.includes('amu')&&m.actors.includes('leader')),'social '+kind,180000);}
  await h.person('leader');await h.page.locator('#target').selectOption('amu');await h.click('[data-action="invite"]');if((await h.snap()).people.amu.rank!=='outer')throw Error('Yue needs actual Amu invitation');
  await build('kitchen');await build('kitchen');await h.person('leader');await h.click('[data-cook="ration"]');await h.wait(w=>(w.inventories.store.items.ration||0)>=4,'four real rations',180000);await story('yue.1');await rest('amu');await rest('leader');
  await h.tab('travel');await h.page.locator('input[name=party][value=amu]').check();await h.page.locator('input[name=party][value=leader]').check();await h.click('[data-special="expedition"]');await h.wait(w=>w.expedition?.phase==='gate'&&w.expedition.actors.every(id=>w.people[id].routeAt>=w.people[id].path.length),'actual cave gate',180000);await h.click('[data-special="talkWardens"]');await h.wait(w=>w.expedition?.phase==='cave'||w.storyChoice,'cave choice',120000);if((await h.snap()).expedition.phase==='cave')await h.click('[data-choice="food"]');await h.wait(w=>w.expedition?.phase==='returned','actual cave return',240000);await story('yue.2');
 }
 const w=await h.snap();if(Object.values(w.people).filter(p=>p.canonicalIdentity===template).length!==1)throw Error('duplicate classic identity');await h.checkpoint('own-two-nodes-complete');
}catch(e){error=e;console.error(e);process.exitCode=1;}finally{await h.close(error);}
