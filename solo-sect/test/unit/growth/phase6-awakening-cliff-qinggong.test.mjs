import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, route, setOrder, speedOf, tick } from '../../../src/sim.mjs';
import { checkExteriorToInteriorAwakening, gainArt } from '../../../src/arts.mjs';
import { canLeapCliff } from '../../../src/cliff.mjs';
import { ergonomicFrame } from '../../../src/growth-playback.mjs';
import { renderMicroStage } from '../../../src/pose-render.mjs';

const until = (s, condition) => {
  for (let i = 0; i < 4000 && !condition(); i++) tick(s);
  assert.ok(condition(), '真實任務須在固定時間內完成');
};

test('Phase 6：純陽與羅漢由外而內兩階確定性頓悟，舊局不觸發', () => {
  for (const [starter, heart, step] of [['chunyangFist', 'quanzhenXinfa', 'jinyanStep'], ['luohanHands', 'shaolinXinfa', 'shaolinStep']]) {
    const s = createState(17, { hermitage: true, starterArt: starter }), d = s.ds[0];
    assert.equal(checkExteriorToInteriorAwakening(d, s), null);
    d.arts[starter].xp = 25; d.skills.strength = 15;
    assert.equal(checkExteriorToInteriorAwakening(d, s), heart);
    assert.equal(checkExteriorToInteriorAwakening(d, s), null);
    gainArt(d, 5, 1, s.t, { raw: 5, src: 'train' });
    assert.ok(d.arts[heart].xp > 0, '兩路外功都回饋已悟心法');
    const beforeSpeed = speedOf(d);
    d.arts[heart].xp = 25; d.skills.agility = 16;
    assert.equal(checkExteriorToInteriorAwakening(d, s), step);
    assert.ok(speedOf(d) > beforeSpeed);
    assert.ok(Math.abs(speedOf(d) / speedOf({ ...d, hermitageStarter: null }) - 1.35) < 1e-9);
    assert.equal(checkExteriorToInteriorAwakening(d, s), null);
  }
  const old = createState(17), hero = old.ds[0];
  hero.hermitageStarter = 'chunyangFist'; hero.arts.chunyangFist = { xp: 25 }; hero.skills.strength = 15;
  assert.equal(checkExteriorToInteriorAwakening(hero, old), null);
  assert.equal(hero.arts.quanzhenXinfa, undefined);
});

test('Phase 6：三級山崖依火候／身法逐一開放，真任務帶回草藥、玉蜂漿與寒潭水', () => {
  const s = createState(17, { hermitage: true }), d = s.ds[0];
  assert.equal(canLeapCliff(d, 'cliff1'), false);
  assert.equal(setOrder(s, d.id, 'cliffForage1'), false);
  d.arts.chunyangFist.xp = 25; d.skills.strength = 15;
  checkExteriorToInteriorAwakening(d, s);
  d.arts.quanzhenXinfa.xp = 25; d.skills.agility = 16;
  checkExteriorToInteriorAwakening(d, s);
  assert.deepEqual(['cliff1', 'cliff2', 'cliff3'].map(id => canLeapCliff(d, id)), [true, false, false]);
  assert.equal(setOrder(s, d.id, 'cliffForage1'), true);
  until(s, () => s.res.beeJelly === 1);
  assert.equal(s.res.herb, 2);
  assert.deepEqual(s.hermitage.exploredCliffs, ['cliff1']);
  assert.equal(setOrder(s, d.id, 'cliffWater'), false);
  d.skills.agility = 24; d.arts.jinyanStep.xp = 25;
  assert.deepEqual(['cliff1', 'cliff2', 'cliff3'].map(id => canLeapCliff(d, id)), [true, true, false]);
  assert.equal(setOrder(s, d.id, 'cliffWater'), true);
  until(s, () => s.res.coldWater === 1);
  assert.ok(s.hermitage.exploredCliffs.includes('cliff2'));
  s.res.veg = 10;
  assert.equal(setOrder(s, d.id, 'cook'), true);
  until(s, () => s.res.medFood === 1);
  assert.equal(s.res.coldWater, 0);
  assert.equal(s.medFoodBatches[0].cold, true);
  d.qi = 0; d.mood = 40; d.needs.hunger = 10;
  assert.equal(setOrder(s, d.id, 'eat'), true);
  until(s, () => d.herbalDietUntil > s.t);
  assert.ok(d.qi > 0 && d.mood > 40, '靈泉藥膳在真用飯任務補內息與心情');
  d.skills.agility = 32; d.arts.jinyanStep.xp = 55;
  assert.equal(canLeapCliff(d, 'cliff3'), true);
  assert.equal(setOrder(s, d.id, 'cliffComprehend'), true);
  until(s, () => !!d.arts.quanzhenSword);
  assert.ok(s.hermitage.exploredCliffs.includes('cliff3'));
  assert.equal(route('herb', 'well').some(id => id.startsWith('cliff')), false, '平地路徑不借山崖捷徑');
});

test('Phase 6：身法縱躍與崖景只讀狀態，Canvas 有淡青軌跡、絕壁與三段式', () => {
  const s = createState(17, { hermitage: true }), d = s.ds[0];
  d.arts.jinyanStep = { xp: 25 }; d.task = { act: 'cliffWater', node: 'cliff2', phase: 'do' }; d.at = 'cliff2';
  const view = { work: 'water', clock: 1.5 };
  const frame = ergonomicFrame(d, s, view);
  assert.equal(frame.qinggongLeaping, true);
  assert.ok(frame.leapArcY > 0);
  assert.equal(frame.cliffLeapStage.id, 'cliff2');
  assert.equal(frame.cliffLeapStage.phase, 'air');
  const before = JSON.stringify(s), colors = [], labels = [];
  const g = { save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, stroke() { colors.push(this.strokeStyle); },
    fill() {}, fillRect() { colors.push(this.fillStyle); }, strokeRect() {}, arc() {}, ellipse() {},
    fillText(x) { labels.push(x); }, quadraticCurveTo() {}, scale() {}, translate() {}, rotate() {}, measureText() { return { width: 10 }; } };
  renderMicroStage(g, s, d, view);
  assert.ok(colors.includes('#6ab8ad'), '淡青色氣流殘影進入 Canvas');
  assert.ok(colors.includes('#7e8580'), '絕壁進入 Canvas');
  assert.equal(frame.leapArcY, 24);
  assert.equal(JSON.stringify(s), before);
});
