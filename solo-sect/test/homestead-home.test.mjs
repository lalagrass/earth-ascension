import test from 'node:test';
import assert from 'node:assert/strict';
import {createHomestead,startBlueprint,saveHomestead} from '../src/homestead.mjs';
import {activityText,buildingInfo,nextStep} from '../src/homestead-view.mjs';
test('H9：顯示真實工地與改善，不改變世界',()=>{
 const s=createHomestead();const before=saveHomestead(s);assert.match(nextStep(s),/5木/);assert.equal(buildingInfo(s,'hut').shortage,5);assert.match(buildingInfo(s,'hut').next,/6/);assert.equal(saveHomestead(s),before);
 startBlueprint(s,'hut');s.person.task={act:'build',phase:'fetch',place:'hut',mat:'wood',timer:0};assert.match(activityText(s),/簡陋木屋/);s.person.task.phase='deliver';assert.match(activityText(s),/搬1根木料/);
 s.fac.hut.stage=1;s.fac.hut.site=null;s.person.task={act:'leisure',phase:'do',place:'home',timer:0};assert.match(activityText(s),/閒坐/);assert.doesNotMatch(nextStep(s),/立「簡陋木屋」/);assert.match(buildingInfo(s,'hut').next,/9/);
});
