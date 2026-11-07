import test from 'node:test';
import assert from 'node:assert/strict';
import { duelExchangeFrame, ergonomicFrame } from '../../../src/growth-playback.mjs';
import { renderMicroStage, selectMicroStageFocal } from '../../../src/pose-render.mjs';

function createMockCtx() {
  const log = [];
  const calls = {};
  const record = (name, ...args) => {
    log.push({ name, args });
    calls[name] = (calls[name] || 0) + 1;
  };
  return {
    log,
    calls,
    save() { record('save'); },
    restore() { record('restore'); },
    beginPath() { record('beginPath'); },
    closePath() { record('closePath'); },
    moveTo(x, y) { record('moveTo', x, y); },
    lineTo(x, y) { record('lineTo', x, y); },
    stroke() { record('stroke'); },
    fill() { record('fill'); },
    fillRect(x, y, w, h) { record('fillRect', x, y, w, h); },
    strokeRect(x, y, w, h) { record('strokeRect', x, y, w, h); },
    arc(x, y, r, sa, ea) { record('arc', x, y, r, sa, ea); },
    ellipse(x, y, rx, ry, rot, sa, ea) { record('ellipse', x, y, rx, ry, rot, sa, ea); },
    fillText(text, x, y) { record('fillText', text, x, y); },
    quadraticCurveTo(cx, cy, x, y) { record('quadraticCurveTo', cx, cy, x, y); },
    scale(sx, sy) { record('scale', sx, sy); },
    translate(tx, ty) { record('translate', tx, ty); },
    rotate(rad) { record('rotate', rad); },
    setLineDash(dash) { record('setLineDash', dash); },
    measureText() { return { width: 15 }; }
  };
}

test('1. 場景 A（菜雞互啄 Rookie Pecking）：初階弟子淺層交鋒迸發火花與微震，架勢搖晃無內傷', () => {
  const dNovice = {
    id: 'hero',
    name: '初入江湖弟子',
    hp: 100,
    max: 100,
    skills: { strength: 12, agility: 14 },
    arts: { basicFist: { xp: 10 } }
  };
  const oppNovice = {
    id: 'bandit_1',
    name: '山賊斥候',
    hp: 100,
    max: 100,
    k: 'bandit',
    skills: { strength: 14, agility: 12 }
  };

  const fShallow = duelExchangeFrame(dNovice, {}, { opponent: oppNovice, blocked: true });
  assert.equal(fShallow.exchangeMode, 'rookiePecking', 'Novice blocked clash should trigger rookiePecking');
  assert.equal(fShallow.clashSparks, true, 'Blocked shallow hit triggers clashSparks');
  assert.equal(fShallow.microShiverPx, 3.0, 'Blocked shallow hit produces 3.0px microShiver');
  assert.equal(dNovice.hp, 100, 'Defender hp unaffected by shallow clashing');

  // Verify renderMicroStage draws clash sparks and clash text
  const ctx = createMockCtx();
  renderMicroStage(ctx, {}, dNovice, { opponent: oppNovice, blocked: true });
  assert.ok(ctx.calls.stroke > 0, 'Canvas stroke called for sparks');
  const hasClashText = ctx.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('噹！兵刃交擊'));
  assert.ok(hasClashText, 'Micro-stage should display clash sound text');
});

test('2. 場景 B（高手對峙與一擊破綻 Master Standoff & Flaw Strike）：高身法宗師對決與看破破綻', () => {
  const dMaster = {
    id: 'hero',
    name: '宗師主角',
    skills: { strength: 32, agility: 30 },
    arts: { taiji: { xp: 85 } }
  };
  const oppMaster = {
    id: 'master_foe',
    name: '成名宿敵',
    skills: { strength: 30, agility: 28 },
    arts: { luohanHands: { xp: 80 } }
  };

  // 2.1 高手對峙（未起破綻時為 masterStandoff）
  const fStandoff = duelExchangeFrame(dMaster, {}, { opponent: oppMaster, usedRatio: 0.5 });
  assert.equal(fStandoff.exchangeMode, 'masterStandoff', 'High agility/tier duel with no flaw should trigger masterStandoff');

  const ctxStandoff = createMockCtx();
  renderMicroStage(ctxStandoff, {}, dMaster, { opponent: oppMaster, usedRatio: 0.5 });
  const hasStandoffText = ctxStandoff.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('凝神對峙'));
  assert.ok(hasStandoffText, 'Master standoff displays eye-lock standoff text');
  assert.ok(ctxStandoff.calls.setLineDash > 0, 'Master standoff draws dashed eye-lock line');

  // 2.2 看破破綻一擊必殺（對手前搖末段 progress >= 0.7 且主角身法/眼力足夠）
  const oppSwinging = {
    ...oppMaster,
    swing: { mv: 'heavySlash', wind: 0.5, t: 0.40 } // 0.40 / 0.5 = 0.8 >= 0.7
  };
  const fFlaw = duelExchangeFrame(dMaster, {}, { opponent: oppSwinging });
  assert.equal(fFlaw.flawWindow.open, true, 'Opponent late windup should open flawWindow');
  assert.ok(['eye', 'hand', 'body'].includes(fFlaw.flawWindow.part), 'Flaw part should be eye, hand, or body');
  assert.equal(fFlaw.exchangeMode, 'flawStrike', 'Open flaw window triggers flawStrike mode');

  const ctxFlaw = createMockCtx();
  renderMicroStage(ctxFlaw, {}, dMaster, { opponent: oppSwinging });
  const hasFlawText = ctxFlaw.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('看破破綻・一擊必殺'));
  assert.ok(hasFlawText, 'Flaw strike displays flaw piercing text');
  assert.ok(ctxFlaw.calls.arc > 0, 'Flaw strike draws target crosshair arc');
});

test('3. 場景 C（原地擺頭避刃＋瞬發反擊掌 Head-Slip + Instant Counter-Palm）：足不移位隨手反震', () => {
  const dAgile = {
    id: 'hero',
    name: '輕盈弟子',
    skills: { strength: 22, agility: 32 },
    personality: ['steady']
  };
  const oppSingle = {
    id: 'bandit_2',
    name: '落單山賊',
    swing: { mv: 'looterBlade', wind: 0.55 }
  };

  const fSlip = duelExchangeFrame(dAgile, {}, { opponent: oppSingle, usedRatio: 0.22, loadL: 0.2 });
  assert.equal(fSlip.dodgeTier, 'headSlip', 'Low usedRatio and loadL triggers headSlip');
  assert.equal(fSlip.footShiftPx, 0, 'Head-slip must keep feet planted with 0px shift');
  assert.equal(fSlip.headTiltDeg, 15, 'Head-slip head tilt degree should be 15');
  assert.equal(fSlip.instantCounterPalm, true, 'Instant counter palm triggered on minimal-cost head-slip');
  assert.equal(fSlip.exchangeMode, 'headSlipCounter', 'Exchange mode should be headSlipCounter');

  const ctxSlip = createMockCtx();
  renderMicroStage(ctxSlip, {}, dAgile, { opponent: oppSingle, usedRatio: 0.22, loadL: 0.2 });
  const hasSlipText = ctxSlip.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('原地擺頭避刃'));
  const hasCounterText = ctxSlip.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('隨手一掌反震'));
  assert.ok(hasSlipText, 'Micro stage displays head-slip blade evasion text');
  assert.ok(hasCounterText, 'Micro stage displays counter palm shockwave text');
});

test('4. 場景 D（多敵鎖角圍攻閃避降級與心性崩潰 Multi-Attacker Angle Locking & Fret Rage）', () => {
  const dHero = {
    id: 'hero',
    name: '主角',
    skills: { strength: 20, agility: 26 },
    fret: 0,
    personality: ['normal']
  };
  const opp1 = { id: 'mon1', k: 'bandit' };
  const opp2 = { id: 'mon2', k: 'bandit' };
  const opp3 = { id: 'mon3', k: 'bandit' };
  const opp4 = { id: 'mon4', k: 'bandit' };

  // 4.1 1 敵：headSlip (從容)
  const f1 = duelExchangeFrame(dHero, {}, { opponent: opp1, opponents: [opp1], L: 0.35 });
  assert.equal(f1.dodgeTier, 'headSlip', '1 opponent with L < 0.4 stays headSlip');

  // 4.2 2 敵：sideStep (側步避讓)
  const f2 = duelExchangeFrame(dHero, {}, { opponent: opp1, opponents: [opp1, opp2], L: 0.55 });
  assert.equal(f2.dodgeTier, 'sideStep', '2 opponents with L = 0.55 degrades to sideStep');
  assert.equal(f2.footShiftPx, -8, 'Side-step foot shift should be -8px');

  // 4.3 3~4 敵：scramble (狼狽大閃避)
  const f4 = duelExchangeFrame(dHero, {}, { opponent: opp1, opponents: [opp1, opp2, opp3, opp4], L: 1.1 });
  assert.equal(f4.dodgeTier, 'scramble', '4 opponents with L >= 0.8 forced to scramble');
  assert.equal(f4.footShiftPx, -18, 'Scramble foot shift should be -18px');
  assert.equal(f4.instantCounterPalm, false, 'Cannot counter palm during scramble defense');
  assert.equal(f4.exchangeMode, 'scrambleDefense', 'Exchange mode degrades to scrambleDefense');

  // 4.4 心性崩潰惱羞硬拼（fret >= composure 或 d.raging）
  const dRaged = {
    ...dHero,
    raging: true,
    fret: 1.5
  };
  const fRage = duelExchangeFrame(dRaged, {}, { opponent: opp1, isRaging: true });
  assert.equal(fRage.isRaging, true, 'isRaging should be true');
  assert.equal(fRage.exchangeMode, 'rageAllOut', 'Raging character switches to rageAllOut mode');
  assert.equal(fRage.instantCounterPalm, false, 'Raging character loses instant counter calmness');

  const ctxRage = createMockCtx();
  renderMicroStage(ctxRage, {}, dRaged, { opponent: opp1, opponents: [opp1, opp2, opp3], angleLockCount: 3, isRaging: true });
  const hasLockBadge = ctxRage.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('眾敵鎖角 ×3'));
  const hasRageText = ctxRage.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('惱羞硬拼'));
  assert.ok(hasLockBadge, 'Micro stage displays multi-angle locking badge');
  assert.ok(hasRageText, 'Micro stage displays rage all-out text');
});

test('5. 場景 E（林克時間與四大絕學異象 Witch Time & Signature Art Flair）', () => {
  const dHero = { id: 'hero', name: '主角', skills: { strength: 25, agility: 25 } };
  const foe = { id: 'foe', name: '強敵' };

  // 5.1 林克時間
  const fWitch = duelExchangeFrame(dHero, { witch: true }, { opponent: foe });
  assert.equal(fWitch.witchSlowMo, true, 's.witch triggers witchSlowMo');

  // 5.2 九陽反震
  const dJiuyang = { ...dHero, arts: { jiuyang: { xp: 60 } } };
  const fJiuyang = duelExchangeFrame(dJiuyang, {}, { opponent: foe, rebound: true });
  assert.equal(fJiuyang.zjEffect, 'jiuyang', 'Jiuyang or rebound triggers jiuyang effect');
  assert.equal(fJiuyang.reboundShock, true, 'Rebound shock is true');

  const ctxJiuyang = createMockCtx();
  renderMicroStage(ctxJiuyang, {}, dJiuyang, { opponent: foe, rebound: true });
  const hasJiuyangText = ctxJiuyang.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('九陽護體・反震敵手'));
  assert.ok(hasJiuyangText, 'Jiuyang shield displays bell shield text');

  // 5.3 太極圓弧卸力
  const dTaiji = { ...dHero, arts: { taiji: { xp: 50 } } };
  const fTaiji = duelExchangeFrame(dTaiji, {}, { opponent: foe });
  assert.equal(fTaiji.zjEffect, 'taiji', 'Taiji art triggers taiji effect');

  const ctxTaiji = createMockCtx();
  renderMicroStage(ctxTaiji, {}, dTaiji, { opponent: foe });
  const hasTaijiText = ctxTaiji.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('四兩撥千斤'));
  assert.ok(hasTaijiText, 'Taiji displays 4-liang deflection text');

  // 5.4 葵花鬼魅殘影
  const dKuihua = { ...dHero, arts: { kuihua: { xp: 50 } } };
  const fKuihua = duelExchangeFrame(dKuihua, {}, { opponent: foe });
  assert.equal(fKuihua.zjEffect, 'kuihua', 'Kuihua art triggers kuihua effect');

  const ctxKuihua = createMockCtx();
  renderMicroStage(ctxKuihua, {}, dKuihua, { opponent: foe });
  const hasKuihuaText = ctxKuihua.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('來去無蹤'));
  assert.ok(hasKuihuaText, 'Kuihua displays phantom shadow text');

  // 5.5 獨孤九劍破招
  const dDugu = { ...dHero, arts: { dugu: { xp: 50 } } };
  const fDugu = duelExchangeFrame(dDugu, {}, { opponent: foe });
  assert.equal(fDugu.zjEffect, 'dugu', 'Dugu art triggers dugu effect');

  const ctxDugu = createMockCtx();
  renderMicroStage(ctxDugu, {}, dDugu, { opponent: foe });
  const hasDuguText = ctxDugu.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('無招勝有招'));
  assert.ok(hasDuguText, 'Dugu displays nine-swords text');
});

test('6. 自動導播聚焦（Auto-Director Spotlight）：自動捕捉交鋒弟子 vs 手動釘選優先', () => {
  const S = {
    t: 10.0,
    ds: [
      { id: 'hero', name: '掌門主角', task: { act: 'train' } },
      { id: 'senior', name: '大師兄', task: { act: 'patrol' }, swing: { mv: 'slash', wind: 0.5, at: 10.3 } },
      { id: 'junior', name: '小師弟', task: { act: 'water' } }
    ]
  };

  // 6.1 未手動釘選時，主角在練功、大師兄正在出招交火 ➔ 自動導播大師兄
  const r1 = selectMicroStageFocal(S, 'hero', false);
  assert.equal(r1.actor.id, 'senior', 'Auto-director should spotlight actively swinging disciple');
  assert.equal(r1.autoDirected, true, 'autoDirected should be true');

  // 6.2 玩家手動釘選主角 ➔ 保持主角，不強行切換
  const r2 = selectMicroStageFocal(S, 'hero', true);
  assert.equal(r2.actor.id, 'hero', 'Pinned view must respect user selection');
  assert.equal(r2.autoDirected, false, 'autoDirected should be false when pinned');

  // 6.3 當前聚焦弟子自身就在交手 ➔ 正常維持自身
  const r3 = selectMicroStageFocal(S, 'senior', false);
  assert.equal(r3.actor.id, 'senior', 'Focus already on combatant remains on combatant');
  assert.equal(r3.autoDirected, false, 'autoDirected should be false if already on combatant');
});

test('7. 零模擬污染鐵律（Zero Simulation Contamination）：純投影與無狀態副作用', () => {
  const s = {
    t: 88.8,
    day: 12,
    rng: 1337,
    ds: [
      { id: 'hero', name: '主角', hp: 90, max: 100, skills: { strength: 25, agility: 28 }, arts: { basicFist: { xp: 45 } } },
      { id: 'senior', name: '師兄', hp: 85, max: 100, skills: { strength: 20, agility: 20 } }
    ],
    mons: [
      { id: 'bandit_boss', name: '黑風寨寨主', hp: 120, max: 120, k: 'bandit' }
    ],
    fx: []
  };

  const jsonBefore = JSON.stringify(s);
  const rngBefore = s.rng;
  const mockCtx = createMockCtx();

  for (let i = 0; i < 50; i++) {
    const f1 = duelExchangeFrame(s.ds[0], s, { opponent: s.mons[0], clock: i * 0.1 });
    const ergo = ergonomicFrame(s.ds[0], s, { opponent: s.mons[0], clock: i * 0.1 });
    assert.ok(f1 && ergo && ergo.duel, 'Outputs must be valid objects');
    renderMicroStage(mockCtx, s, s.ds[0]);
  }

  const jsonAfter = JSON.stringify(s);
  assert.equal(jsonAfter, jsonBefore, 'State JSON representation must be 100% identical');
  assert.equal(s.rng, rngBefore, 's.rng must not be called or modified');
});
