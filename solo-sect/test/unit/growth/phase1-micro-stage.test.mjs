import test from 'node:test';
import assert from 'node:assert/strict';
import { ergonomicFrame } from '../../../src/growth-playback.mjs';
import { renderMicroStage } from '../../../src/pose-render.mjs';
import { renderMicroStage as renderMicroStagePaperDoll } from '../../../src/paper-doll.mjs';

test('1. 挑水成長物理對照：初學 waterTilt 大且極值點水花濺出 vs 熟練 waterTilt 低且無水花', () => {
  const dNovice = {
    id: 'hero',
    bare: true,
    skills: { strength: 10, agility: 0 },
    practice: { hands: { 'work:water': 0 } }
  };
  const clockExtreme = Math.PI / 8;
  const frameNovice = ergonomicFrame(dNovice, {}, { work: 'water', clock: clockExtreme });
  assert.ok(frameNovice.playback.waterTilt > 18, `Expected waterTilt > 18, got ${frameNovice.playback.waterTilt}`);
  assert.equal(frameNovice.laborDetail.waterSplash, true, 'Novice should splash water at step footfall peak');
  assert.ok(frameNovice.laborDetail.poleBend >= 4.5, `Expected noticeable poleBend >= 4.5, got ${frameNovice.laborDetail.poleBend}`);

  const dMaster = {
    id: 'hero',
    bare: true,
    skills: { strength: 30, agility: 30 },
    practice: { hands: { 'work:water': 60 } }
  };
  const frameMaster = ergonomicFrame(dMaster, {}, { work: 'water', clock: clockExtreme });
  assert.ok(frameMaster.playback.waterTilt <= 8, `Expected master waterTilt <= 8, got ${frameMaster.playback.waterTilt}`);
  assert.equal(frameMaster.laborDetail.waterSplash, false, 'Master should not splash water');
});

test('2. 砍柴卡斧與一斧開木對照：初學卡斧長停頓 vs 熟練不卡斧俐落劈開', () => {
  const dNovice = {
    id: 'hero',
    bare: true,
    skills: { strength: 10, agility: 5 },
    practice: { hands: { 'work:chop': 0 } }
  };
  const frameNovice = ergonomicFrame(dNovice, {}, { work: 'chop', isImpact: true });
  assert.equal(frameNovice.laborDetail.isAxeStuck, true, 'Novice chop should get axe stuck');
  assert.equal(frameNovice.laborDetail.woodSplit, false, 'Novice chop should not cleanly split wood');
  assert.ok(frameNovice.playback.chopPause >= 0.45, `Expected long chopPause >= 0.45, got ${frameNovice.playback.chopPause}`);

  const dExperienced = {
    id: 'hero',
    bare: true,
    skills: { strength: 25, agility: 20 },
    practice: { hands: { 'work:chop': 60 } }
  };
  const frameExp = ergonomicFrame(dExperienced, {}, { work: 'chop', isImpact: true });
  assert.equal(frameExp.laborDetail.isAxeStuck, false, 'Experienced chop should not get stuck');
  assert.equal(frameExp.laborDetail.woodSplit, true, 'Experienced chop should cleanly split wood');
  assert.ok(frameExp.playback.chopPause < 0.3, `Expected shorter chopPause < 0.3, got ${frameExp.playback.chopPause}`);
});

test('3. 羅漢拳 22 式與單足平衡（白鶴亮翅）對照：初學重心失衡踉蹌 vs 練熟平穩深馬步', () => {
  const dNovice = {
    id: 'hero',
    bare: true,
    skills: { strength: 10, agility: 5 },
    practice: { hands: { bodyPush: 0 } }
  };
  const frameNovice = ergonomicFrame(dNovice, {}, { formName: '白鶴亮翅', poses: ['leftStep', 'doublePalm', 'wing', 'highPalm'] });
  assert.ok(Math.abs(frameNovice.jointSpring.comOffset) > 0.75, `Expected |comOffset| > 0.75, got ${Math.abs(frameNovice.jointSpring.comOffset)}`);
  assert.equal(frameNovice.jointSpring.isStumbling, true, 'Novice crane stance should stumble');
  assert.equal(frameNovice.playback.hipHeight, 17, 'Novice hip should remain upright at 17');

  const dMaster = {
    id: 'hero',
    bare: true,
    skills: { strength: 35, agility: 35 },
    practice: { hands: { bodyPush: 80 } }
  };
  const frameMaster = ergonomicFrame(dMaster, {}, { formName: '白鶴亮翅', poses: ['leftStep', 'doublePalm', 'wing', 'highPalm'] });
  assert.ok(Math.abs(frameMaster.jointSpring.comOffset) <= 0.75, `Expected |comOffset| <= 0.75, got ${Math.abs(frameMaster.jointSpring.comOffset)}`);
  assert.equal(frameMaster.jointSpring.isStumbling, false, 'Master crane stance should not stumble');
  assert.ok(frameMaster.playback.hipHeight < 13, `Master hipHeight should approach deep limit (8.5), got ${frameMaster.playback.hipHeight}`);
});

test('4. 交手「微震」與「擺頭閃避（headSlip）」判定：未達皮破微震不扣血 vs 原地擺頭與圍攻狼狽避閃', () => {
  const d = {
    id: 'hero',
    hp: 100,
    max: 100,
    skills: { strength: 20, agility: 20 }
  };
  const fShallow = ergonomicFrame(d, {}, { depth: -1 });
  assert.ok(fShallow.combatDetail.microShiverPx > 0, 'Shallow hit produces microShiver');
  assert.equal(d.hp, 100, 'Defender HP remains untouched on shallow hit');

  const fBlocked = ergonomicFrame(d, {}, { blocked: true, depth: 1 });
  assert.ok(fBlocked.combatDetail.microShiverPx > 0, 'Blocked hit produces microShiver');
  assert.equal(d.hp, 100, 'Defender HP remains untouched on blocked hit');

  const fPenetrated = ergonomicFrame(d, {}, { blocked: false, depth: 2 });
  assert.equal(fPenetrated.combatDetail.microShiverPx, 0, 'Deep penetrating hit is knockback, not shallow microShiver');

  const dHigh = {
    id: 'hero',
    skills: { strength: 25, agility: 35 },
    practice: { eyes: { 'dog:dogBite': 10 } }
  };
  const foe = { k: 'dog', swing: { mv: 'dogBite', wind: 0.5 } };
  const fSlip = ergonomicFrame(dHigh, {}, { opponent: foe, usedRatio: 0.25 });
  assert.equal(fSlip.combatDetail.dodgeTier, 'headSlip', 'High agility vs slow attack triggers headSlip');

  const fScramble = ergonomicFrame(dHigh, {}, { opponent: foe, L: 0.85 });
  assert.equal(fScramble.combatDetail.dodgeTier, 'scramble', 'High multi-opponent load L >= 0.8 degrades dodge to scramble');
});

test('5. 零模擬污染保證（Zero State Mutation）：連續呼叫 ergonomicFrame 與 renderMicroStage 100 次前後狀態完全一致', () => {
  const s = {
    t: 123.45,
    day: 5,
    rng: 42,
    ds: [
      { id: 'hero', name: '主角', hp: 95, max: 100, skills: { strength: 18, agility: 14 }, task: { act: 'train' } },
      { id: 'senior', name: '師兄', hp: 80, max: 100, skills: { strength: 22, agility: 16 }, task: { act: 'water' } }
    ],
    mons: [],
    fx: []
  };
  const jsonBefore = JSON.stringify(s);
  const rngBefore = s.rng;

  const mockCtx = {
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, stroke() {},
    fill() {}, fillRect() {}, strokeRect() {}, arc() {}, ellipse() {}, fillText() {}, quadraticCurveTo() {},
    scale() {}, translate() {}, rotate() {}, measureText() { return { width: 10 }; }
  };

  for (let i = 0; i < 100; i++) {
    ergonomicFrame(s.ds[0], s, { work: 'water', clock: i * 0.1 });
    renderMicroStage(mockCtx, s, s.ds[0]);
    renderMicroStagePaperDoll(mockCtx, s, s.ds[1]);
  }

  // 額外確認：當弟子正在練習已學武學（如羅漢十八手）時，renderMicroStage 不會因 view.frame.routine 拋出 ReferenceError
  const sTrain = {
    t: 15.2,
    ds: [{ id: 'hero', name: '主角', arts: { luohanHands: { xp: 20 } }, focus: 'luohanHands', skills: { strength: 15, agility: 15 }, practice: { hands: { lhChop: 8 } }, task: { act: 'train', phase: 'do' } }],
    mons: [],
    fx: []
  };
  const ergoTrain = renderMicroStage(mockCtx, sTrain, sTrain.ds[0]);
  assert.ok(ergoTrain, 'renderMicroStage should succeed during active routine training');

  const jsonAfter = JSON.stringify(s);
  assert.equal(jsonAfter, jsonBefore, 'Simulation state must not be modified by rendering');
  assert.equal(s.rng, rngBefore, 'World rng must not be stepped or mutated');
});
