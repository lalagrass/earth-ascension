// scene-physical-grounding.test.js
// 驗證公版場景對接、實體落位、四項設施路徑取樣與走位閉環

import test from 'node:test';
import assert from 'node:assert/strict';

import { createModel } from '../experiments/water-carry/demo/model.mjs';
import { createRoutes } from '../experiments/water-carry/demo/routes.mjs';
import { PUBLIC_FACILITIES, FACILITIES_MAP } from '../experiments/water-carry/demo/facilities.mjs';
import { SOUND } from '../experiments/water-carry/demo/audio.mjs';

test('SG-SCENE-01: 四大公版實體設施坐標錨點與契約吻合', () => {
  assert.equal(PUBLIC_FACILITIES.length, 4);
  assert.deepEqual(FACILITIES_MAP['fac.kitchen'].entrance, { x: 1040, y: 480 });
  assert.equal(FACILITIES_MAP['fac.kitchen'].x, 1040);
  assert.equal(FACILITIES_MAP['fac.kitchen'].y, 480);

  assert.deepEqual(FACILITIES_MAP['fac.garden'].entrance, { x: 1320, y: 680 });
  assert.deepEqual(FACILITIES_MAP['fac.yard'].entrance, { x: 860, y: 530 });
  assert.deepEqual(FACILITIES_MAP['fac.patrol_gate'].entrance, { x: 640, y: 410 });
});

test('SG-SCENE-02: 幾何路徑取樣 routes.of 正確映射設施點位與 lifePos', () => {
  const routes = createRoutes();

  // 1. lifePos 直接落位
  const pLife = { lifePos: { x: 1040, y: 480, face: 1 }, mode: 'cook' };
  const atLife = routes.of('hero', pLife);
  assert.equal(atLife.x, 1040);
  assert.equal(atLife.y, 480);
  assert.equal(atLife.face, 1);
  assert.equal(atLife.geo, 'cook');

  // 2. 膳房烹飪路徑 station
  const pCook = { mode: 'cook' };
  const atCook = routes.of('hero', pCook);
  assert.equal(atCook.x, 1040);
  assert.equal(atCook.y, 480);

  // 3. 四季菜畦澆灌路徑 station
  const pGarden = { mode: 'waterCrops' };
  const atGarden = routes.of('hero', pGarden);
  assert.equal(atGarden.x, 1320);
  assert.equal(atGarden.y, 680);

  // 4. 演武坪拆招切磋 station
  const pSpar = { mode: 'spar' };
  const atSpar = routes.of('hero', pSpar);
  assert.equal(atSpar.x, 860);
  assert.equal(atSpar.y, 530);

  // 5. 後山巡山界碑 station
  const pPatrol = { mode: 'toPatrol' };
  const atPatrol = routes.of('hero', pPatrol);
  assert.equal(atPatrol.x, 640);
  assert.equal(atPatrol.y, 410);
});

test('SG-SCENE-03: 自走 Autopilot 啟動後推進 100 ticks 不拋出 phases 崩潰例外', () => {
  const routes = createRoutes();
  const SENSE = { placeOf: routes.of };
  const model = createModel(1700, undefined, undefined, undefined, SENSE);
  model.life.initPersona('guo_jing', 'linghu_chong');
  model.life.setAutopilot(true);

  // 執行 100 步權威推進，確保 line 1895 及各工種 phase 解析穩定
  assert.doesNotThrow(() => {
    for (let i = 0; i < 100; i++) {
      model.step();
    }
  });

  const v = model.view();
  assert.ok(v.people.hero);
  assert.ok(v.people.cousin);
});

test('SG-SCENE-04: 互動指令驅動權威實體位移，且在指定工期後自動返院閉環', () => {
  const routes = createRoutes();
  const SENSE = { placeOf: routes.of };
  const model = createModel(1700, undefined, undefined, undefined, SENSE);
  model.life.initPersona('guo_jing', 'linghu_chong');

  // 準備原料以供烹飪
  model.state.herbs = 10;
  model.state.vat = 10;

  // 1. 烹飪指令 -> 實體移至大陶灶
  const cookRes = model.life.cookSignatureDish('bamboo_soup');
  assert.equal(cookRes.ok, true);
  assert.deepEqual(model.state.people.hero.lifePos, { x: 1040, y: 480, face: 1 });
  assert.equal(model.state.people.hero.motion.mode, 'cook');

  // 推進 60 ticks，仍在烹飪
  for (let i = 0; i < 60; i++) model.step();
  assert.equal(model.state.people.hero.motion.mode, 'cook');
  assert.equal(model.view().people.hero.lifePos.x, 1040);

  // 推進滿 180 ticks -> 完工返回，離開大陶灶，切換回日常/自走狀態
  for (let i = 0; i < 130; i++) model.step();
  assert.notEqual(model.state.people.hero.motion.mode, 'cook');
  assert.notDeepEqual(model.state.people.hero.lifePos, { x: 1040, y: 480, face: 1 });

  // 2. 切磋指令 -> 兩人面對面站立於演武坪
  const sparRes = model.life.triggerCrossLineageSpar();
  assert.equal(sparRes.ok, true);
  assert.deepEqual(model.state.people.hero.lifePos, { x: 840, y: 530, face: 1 });
  assert.deepEqual(model.state.people.cousin.lifePos, { x: 880, y: 530, face: -1 });
  assert.equal(model.state.people.hero.motion.mode, 'spar');
  assert.equal(model.state.people.cousin.motion.mode, 'spar');

  // 3. 巡山指令 -> 移至巡山界碑
  model.state.people.hero.energy = 80;
  const patrolRes = model.life.dispatchSegmentedPatrol('completionist_bulldozer');
  assert.equal(patrolRes.ok, true);
  assert.deepEqual(model.state.people.hero.lifePos, { x: 640, y: 410, face: -1 });
  assert.equal(model.state.people.hero.motion.mode, 'toPatrol');
});

test('SG-SCENE-05: Web Audio 程序合成器在無 DOM / Node 環境下安全調用', () => {
  // 在 Node.js 環境中 AudioContext 為 undefined，SOUND 應無痛靜默返回而不拋錯
  assert.doesNotThrow(() => {
    SOUND.cook();
    SOUND.punch();
    SOUND.bell();
    SOUND.breakthrough();
  });
});
