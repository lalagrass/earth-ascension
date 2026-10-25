import {harness} from './harness.mjs';const h=await harness('u03-remaining-legends');let error;
async function visit(id){await h.person('leader');await h.tab('stories');await h.click('[data-visit="'+id+'"]');await h.wait(w=>w.people['legend.'+id]?.residence==='visitor','arrived '+id,120000);}
async function story(node){await h.person('leader');await h.tab('stories');await h.click('[data-story="'+node+'"]');await h.wait(w=>w.stories[node].status==='completed','fulfilled '+node,240000);await h.checkpoint(node.replace('.','-'));}
async function depart(id){await h.tab('stories');await h.click('[data-depart="'+id+'"]');await h.wait(w=>w.people['legend.'+id].residence==='departed','departed '+id,120000);}
try{
 await h.start(new URL('../../evidence/development/u03-family-legends-rerun/family-hong-linghu-complete.save.json',import.meta.url).pathname);await depart('linghu');
 for(const id of ['leader','amu']){await h.person(id);await h.click('[data-task="rest"]');await h.wait(w=>w.people[id].energy>=9900&&w.people[id].hp===w.people[id].maxHp,'rested '+id,180000);await h.paused(true);await h.person(id);await h.click('[data-action="stop"]');await h.paused(false);}
 await visit('guo');await story('guo.1');await story('guo.2');await depart('guo');
 await visit('yue');await h.person('leader');await h.click('[data-cook="ration"]');await h.wait(w=>(w.inventories.store.items.ration||0)>=4,'sect promise has real rations',180000);await story('yue.1');await story('yue.2');await depart('yue');
 await visit('qiao');await story('qiao.1');await story('qiao.2');await h.checkpoint('all-five-legends-ten-nodes');
}catch(e){error=e;console.error(e);process.exitCode=1;}finally{await h.close(error);}
