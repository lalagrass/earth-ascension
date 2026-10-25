import {harness} from './harness.mjs';
const h=await harness(process.env.EVIDENCE_NAME||'u02-return-rescue');let error;
try{
 await h.start(process.env.NORMAL_SAVE||new URL('../../evidence/development/u02-seed29/food-branch-complete.save.json',import.meta.url).pathname);
 await h.paused(true);const before=await h.snap();if(before.storyChoice!=='food'||before.people.zhou.residence!=='cave')throw Error('source is not normal food branch');await h.paused(false);
 if(before.expedition.phase!=='cave'){
 for(const id of ['leader','amu']){await h.person(id);await h.click('[data-task="rest"]');await h.wait(w=>w.people[id].energy>=9900&&w.people[id].injury===0,'actual recovery '+id,240000);await h.paused(true);await h.person(id);await h.click('[data-action="stop"]');await h.paused(false);}
 await h.paused(true);for(const id of ['leader','amu']){await h.person(id);await h.click('[data-action="stop"]');}await h.person('leader');await h.tab('travel');for(const id of ['leader','amu'])await h.page.locator('input[name=party][value='+id+']').check();await h.click('[data-special="expedition"]');await h.paused(false);
 await h.wait(w=>w.expedition.phase==='gate'&&w.expedition.actors.every(id=>w.people[id].routeAt>=w.people[id].path.length),'second journey gate',240000);await h.click('[data-special="talkWardens"]');await h.wait(w=>w.expedition.phase==='cave','second cave reached',180000);}
 await h.paused(true);await h.checkpoint('before-second-choice');await h.tab('travel');await h.click('[data-choice="rescue"]');await h.paused(false);
 await h.wait(w=>w.expedition.phase==='attach','real assistance started',120000);await h.checkpoint('second-rescue-attaching');await h.wait(w=>w.expedition.phase==='returned','person rescued after food',240000);
 const after=await h.snap();if(after.people.zhou.residence!=='visitor'||after.primaryChoice!=='food'||after.promises.cave.status!=='fulfilled'||!after.promiseHistory.some(p=>p.choice==='food'&&p.status==='fulfilled'))throw Error('branch history or physical result lost');await h.checkpoint('food-then-person-returned');await h.log('passed U02 continuation',{reports:after.reports,promiseHistory:after.promiseHistory});
}catch(e){error=e;console.error(e);process.exitCode=1;}finally{await h.close(error);}
