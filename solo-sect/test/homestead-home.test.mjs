import test from 'node:test';
import assert from 'node:assert/strict';
import {createHomestead,startBlueprint,saveHomestead} from '../src/homestead.mjs';
import {activityText,buildingInfo,nextStep} from '../src/homestead-view.mjs';
test('H9：顯示真實工地與改善，不改變世界',()=>{
 const s=createHomestead();const before=saveHomestead(s);assert.match(nextStep(s),/5木/);assert.equal(buildingInfo(s,'hut').shortage,5);assert.match(buildingInfo(s,'hut').next,/6/);assert.equal(saveHomestead(s),before);
 startBlueprint(s,'hut');s.person.task={act:'build',phase:'fetch',place:'hut',mat:'wood',timer:0};assert.match(activityText(s),/簡陋木屋/);s.person.task.phase='deliver';assert.match(activityText(s),/搬1根木料/);
 s.fac.hut.stage=1;s.fac.hut.site=null;s.person.task={act:'leisure',phase:'do',place:'home',timer:0};assert.match(activityText(s),/閒坐/);assert.doesNotMatch(nextStep(s),/立「簡陋木屋」/);assert.match(buildingInfo(s,'hut').next,/9/);
});
import {sceneFacts} from '../src/homestead-scene.mjs';
test('H10：灶火只跟實際料理、作物隨生長、畫面不推時間',()=>{
 const s=createHomestead();s.fac.kitchen.stage=1;assert.equal(sceneFacts(s).cooking,false);
 s.person.task={act:'cook',phase:'go'};assert.equal(sceneFacts(s).cooking,false);s.person.task.phase='do';assert.equal(sceneFacts(s).cooking,true);
 s.person.task={act:'rest',phase:'do'};assert.equal(sceneFacts(s).resting,1);s.plot={state:'growing',growth:2};const early=sceneFacts(s).gardenScale;s.plot.growth=30;assert.ok(sceneFacts(s).gardenScale>early);const before=saveHomestead(s);sceneFacts(s);assert.equal(saveHomestead(s),before);
});
import {tickHomestead,setOrder,loadHomestead,FACILITIES,PLACES,DAY} from '../src/homestead.mjs';
import {activityReason} from '../src/homestead-view.mjs';
const step=(s,seconds)=>{for(let i=0;i<seconds*4;i++)tickHomestead(s);};
const until=(s,predicate,max=12000)=>{for(let i=0;i<max&&!predicate(s);i++)tickHomestead(s);assert.ok(predicate(s),'within bounded ticks');};
test('H9 review：在途工地木料不宣稱入庫',()=>{const s=createHomestead();s.person.carry={kind:'wood',amount:1,origin:'site'};assert.match(activityReason(s),/工地/);assert.doesNotMatch(activityReason(s),/入庫/);});
test('H11：獨居零木起步，兩個選擇可反序完成且無額外增益',()=>{
 for(const order of [['bench','flowers'],['flowers','bench']]){
  const s=createHomestead();startBlueprint(s,'hut');until(s,()=>s.fac.hut.stage===1);
  for(const id of order){assert.equal(startBlueprint(s,id),true);assert.equal(startBlueprint(s,id),false);until(s,()=>s.fac[id].stage===1);}
  setOrder(s,'leisure');until(s,()=>s.person.task?.act==='leisure'&&s.person.task?.phase==='do');assert.deepEqual(s.person.pos,PLACES.bench);const before=s.person.energy;step(s,8);assert.ok(s.person.energy<=Math.min(100,before+5));assert.ok(loadHomestead(saveHomestead(s)).ok);
 }
});
test('H11：新工地在途取消與重載守恆，舊檔補地塊且拒絕未建座位任務',()=>{
 const s=createHomestead();s.fac.hut.stage=1;s.stock.wood=3;s.person.hunger=90;s.person.energy=100;startBlueprint(s,'flowers');setOrder(s,'build');until(s,()=>s.person.task?.phase==='deliver');
 assert.equal(s.fac.flowers.site.reserved.wood,1);const all=()=>s.stock.wood+(s.person.carry?.amount||0)+s.fac.flowers.site.delivered.wood;assert.equal(all(),3);assert.ok(loadHomestead(saveHomestead(s)).ok);
 setOrder(s,'leisure');assert.equal(s.fac.flowers.site.reserved.wood,0);assert.equal(all(),3);until(s,()=>!s.person.carry);assert.equal(all(),3);const r=loadHomestead(saveHomestead(s));assert.ok(r.ok);assert.equal(saveHomestead(r.state),saveHomestead(s));
 const old=createHomestead();delete old.fac.bench;delete old.fac.flowers;assert.ok(loadHomestead(saveHomestead(old)).ok);old.fac.bench={stage:0,site:null};old.person.task={act:'leisure',place:'bench',phase:'go',timer:0};assert.equal(loadHomestead(saveHomestead(old)).ok,false);
});
import {homeScenario} from './helpers/home-scenario.mjs';
test('H12：三性格×單雙人×低庫存/滿倉/中斷20日，糧木逐拍守恆與閒暇',()=>{
 for(const personality of ['quiet','sociable','diligent'])for(const apprentice of [false,true])for(const condition of ['low','full','interrupted']){
 const r=homeScenario({personality,apprentice,condition});assert.ok(r.minH>0 && r.minE>0,JSON.stringify({personality,apprentice,condition,H:r.minH,E:r.minE}));assert.equal(r.zero,0);assert.ok(r.completedAt!==null);if(condition!=='full')assert.ok(r.harvests>=6);else assert.ok(r.daily.at(-1).meal<=r.initialMeal,'滿倉先用現存食物，不硬做無需的收成');assert.ok(r.final.person.leisure>0);assert.equal(r.daily.length,20);assert.ok(loadHomestead(saveHomestead(r.final)).ok);
 const control=homeScenario({personality,apprentice,condition,reload:false});assert.equal(saveHomestead(control.final),saveHomestead(r.final),'中途讀取與原流程相同');
 }
});
test('H11/H12：異常低成本工地拒讀；手動指派仍可超過自主目標',()=>{
 const s=createHomestead();s.fac.hut.stage=1;startBlueprint(s,'flowers');s.fac.flowers.site.need.wood=0;assert.equal(loadHomestead(saveHomestead(s)).ok,false);s.fac.flowers.site=null;setOrder(s,'chop');until(s,()=>s.stock.wood===s.cap.wood);assert.equal(s.stock.wood,8);
});
import {blockReason} from '../src/homestead.mjs';
test('H13：已吃飽、缺食物、當日聊過與訪客不在不再顯示空白原因',()=>{
 const s=createHomestead();s.person.hunger=90;assert.match(blockReason(s,'eat'),/沒有.*食物/);assert.match(blockReason(s,'chat'),/不在村路/);s.t=70;s.visitor.lastChat=1;assert.match(blockReason(s,'chat'),/已經談/);assert.match(blockReason(s,'gift'),/缺熱飯/);s.stock.berries=1;s.person.hunger=100;assert.match(blockReason(s,'eat'),/吃飽/);
});
test('H13 review：多工地提示與正在施工的對象相同',()=>{
 const s=createHomestead();s.fac.hut.stage=1;startBlueprint(s,'flowers');s.fac.flowers.site.delivered.wood=3;startBlueprint(s,'bench');s.person.task={act:'build',phase:'do',place:'flowers',timer:0};assert.ok(loadHomestead(saveHomestead(s)).ok);assert.match(nextStep(s),/目前工程：庭院花叢/);s.person.task=null;assert.match(nextStep(s),/目前工程：庭院花叢/);
});
import {projectMaterials} from '../src/homestead-view.mjs';
test('H13 review：兩工地不可把同一庫存宣稱各自已保留',()=>{
 const s=createHomestead();s.fac.hut.stage=1;s.stock.wood=3;startBlueprint(s,'bench');startBlueprint(s,'flowers');assert.deepEqual(projectMaterials(s),{count:2,needed:5,shortage:2});assert.match(nextStep(s),/合計尚缺2木/);s.fac.bench.site.delivered.wood=2;s.stock.wood=1;assert.deepEqual(projectMaterials(s),{count:2,needed:3,shortage:2});
});
