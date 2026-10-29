import test from 'node:test';import assert from 'node:assert/strict';
import {createHomestead,tickHomestead,startBlueprint,setOrder,visitorHere,inviteHelper,loadHomestead,saveHomestead} from '../src/homestead.mjs';
import {resourceSummary} from '../src/homestead-view.mjs';
const step=(s,n)=>{for(let i=0;i<n*4;i++)tickHomestead(s);};
test('H14：新solo三種性格無訪客/扭傷/社交仍可從零建家',()=>{for(const personality of ['quiet','sociable','diligent']){const s=createHomestead({mode:'solo',personality});startBlueprint(s,'hut');step(s,720);assert.equal(s.fac.hut.stage,1);assert.equal(visitorHere(s),false);assert.equal(inviteHelper(s),false);assert.equal(setOrder(s,'chat'),false);assert.equal(s.visitor.injury,false);assert.ok(!s.log.some(x=>x.msg.includes('阿蓮')));assert.equal(loadHomestead(saveHomestead(s)).state.mode,'solo');}});
test('H14：舊路徑仍legacy，新局模式與舊資料互不猜測',()=>{const s=createHomestead();delete s.mode;const r=loadHomestead(saveHomestead(s));assert.ok(r.ok);assert.equal(r.state.mode,'legacy');r.state.t=70;assert.equal(visitorHere(r.state),true);s.mode='unknown';assert.equal(loadHomestead(saveHomestead(s)).ok,false);});
test('H14：工地在途與已交不再算可用，取消只退預約不複製',()=>{const s=createHomestead({mode:'solo'});s.stock.wood=5;startBlueprint(s,'hut');setOrder(s,'build');for(let i=0;i<200&&s.person.task?.phase!=='deliver';i++)tickHomestead(s);let r=resourceSummary(s);assert.equal(r.available.wood,4);assert.equal(r.reserved,1);assert.equal(r.delivered,0);setOrder(s,'leisure');r=resourceSummary(s);assert.equal(r.available.wood,4);assert.equal(r.reserved,0);assert.equal(r.incoming[0].amount,1);step(s,10);assert.equal(s.stock.wood,5);});
import {skillLevel,workCost}from'../src/homestead-skills.mjs';
test('H15：採集只在有效結算成長，取消走路/重載不發XP',()=>{const s=createHomestead({mode:'solo'});setOrder(s,'chop');tickHomestead(s);assert.equal(s.person.skills.gather,0);setOrder(s,'rest');assert.equal(s.person.skills.gather,0);setOrder(s,'chop');for(let i=0;i<400&&!s.person.carry;i++)tickHomestead(s);assert.equal(s.person.skills.gather,1);const r=loadHomestead(saveHomestead(s));assert.ok(r.ok);assert.equal(r.state.person.skills.gather,1);step(r.state,2);assert.equal(r.state.person.skills.gather,1);});
test('H15：四技能上限與實際耗力，施工依有效工量，失敗料理不給XP',()=>{const s=createHomestead({mode:'solo'});s.person.skills={gather:12,build:40,farm:12,cook:8};for(const id of Object.keys(s.person.skills)){assert.equal(skillLevel(s,id),2);assert.equal(workCost(s,id,5),4);}s.person.skills.build=0;s.person.hunger=90;s.person.energy=100;startBlueprint(s,'hut');s.fac.hut.site.delivered.wood=5;s.person.pos=[440,225];setOrder(s,'build');tickHomestead(s);assert.equal(s.person.skills.build,.25);assert.equal(s.fac.hut.site.work,.25);setOrder(s,'rest');assert.equal(s.person.skills.build,.25);
 const c=createHomestead({mode:'solo'});c.fac.kitchen.stage=1;c.person.pos=[605,365];c.person.task={act:'cook',phase:'do',place:'kitchen',timer:7.75};tickHomestead(c);assert.equal(c.person.skills.cook,0);assert.equal(c.stock.meal,0);
});
test('H15：實際四種工作新手/滿級產出相同、耗力可比較',()=>{
 for(const [act,skill,base,place,duration]of[['chop','gather',7,'wood',7],['farm','farm',5,'garden',7],['cook','cook',4,'kitchen',8]]){
  const results=[];for(const xp of[0,{gather:12,farm:12,cook:8}[skill]]){const s=createHomestead({mode:'solo'});s.person.skills[skill]=xp;s.fac.hut.stage=1;s.fac.garden.stage=1;s.fac.kitchen.stage=1;s.stock.wood=1;s.stock.veg=2;s.person.energy=100;s.person.hunger=90;s.person.task={act,phase:'do',place,timer:duration-.25};if(act==='chop')s.leases.wood='person';if(act==='farm')s.leases.garden='person';tickHomestead(s);results.push(s);}
  assert.ok(Math.abs(results[0].person.energy-(100-base))<1e-9);assert.ok(Math.abs(results[1].person.energy-(100-base*.8))<1e-9);assert.deepEqual(results[0].stock,results[1].stock);assert.deepEqual(results[0].person.carry,results[1].person.carry);assert.equal(results[0].person.skills[skill],1);
 }
});
import {currentFeelings,restRate}from'../src/homestead-living.mjs';
import {HOME,PLACES}from'../src/homestead.mjs';
test('H16：床鋪只有到屋內使用才加休息率，休息完成才有安睡感受',()=>{
 const s=createHomestead({mode:'solo'});s.fac.hut.stage=1;s.person.pos=[...PLACES.hut];assert.equal(restRate(s),6);s.fac.bed.stage=1;assert.equal(restRate(s),7);s.person.pos=[...HOME];assert.equal(restRate(s),6);s.person.task={act:'rest',phase:'go',place:'hut',timer:0};tickHomestead(s);assert.equal(currentFeelings(s).value,0);
 s.person.pos=[...PLACES.hut];s.person.task={act:'rest',phase:'do',place:'hut',timer:0};s.person.energy=84;tickHomestead(s);assert.equal(s.person.energy,85.75);assert.equal(s.person.feelings.rested,s.t+60);assert.ok(loadHomestead(saveHomestead(s)).ok);
});
test('H16：吃飯與小憩有效完成才給感受，有時效且不能無限疊加',()=>{
 const s=createHomestead({mode:'solo'});s.fac.hut.stage=1;s.fac.bench.stage=1;s.fac.flowers.stage=1;s.stock.meal=1;s.person.hunger=30;s.person.pos=[...HOME];s.person.task={act:'eat',phase:'do',place:'home',timer:1.75};tickHomestead(s);assert.equal(s.stock.meal,0);assert.ok(Math.abs(s.person.hunger-81.965)<1e-8);assert.equal(currentFeelings(s).value,2);
 s.person.pos=[...PLACES.bench];for(let i=0;i<4;i++){s.person.task={act:'leisure',phase:'do',place:'bench',timer:7.75};tickHomestead(s);}assert.equal(currentFeelings(s).value,5);assert.equal(Object.keys(s.person.feelings).length,3);
 s.t+=61;s.day=1+Math.floor(s.t/240);assert.equal(currentFeelings(s).value,0);assert.ok(loadHomestead(saveHomestead(s)).ok);
 const unused=createHomestead({mode:'solo'});unused.fac.bench.stage=1;unused.fac.flowers.stage=1;step(unused,1);assert.equal(currentFeelings(unused).value,0);
});
