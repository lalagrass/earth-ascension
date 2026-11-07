import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, migrate, scoreActs, setForayPolicy, setOrder, startExpedition, tick } from '../../../src/sim.mjs';
import { openExp } from '../../../src/world.mjs';
import { EXP_BOUT } from '../../../src/exp-map-combat.mjs';
import { ROUTE, TIERS } from '../../../src/data.mjs';
import { FOE_ACTIONS } from '../../../src/starter-combat.mjs';
import { clashOdds, learnArt, resolveSwing } from '../../../src/arts.mjs';
import { ensurePractice, eyeKey, learningWeight } from '../../../src/practice.mjs';
import { COVERS } from '../../../src/tactics.mjs';
import { TECHNIQUES } from '../../../src/techniques.mjs';
import { forayChoice, forayChoices } from '../../../src/foray-choice.mjs';

function shortage(seed = 17) {
  const s = openExp(createState(seed));
  s.res.food = 0; s.res.veg = 0;
  s.ds[0].needs = { energy: 100, hunger: 90, social: 100, fun: 65 };
  return s;
}

test('N62 缺糧與獸跡使人自主出獵；禁令阻止自主出獵，明確指派仍可出發', () => {
  const allow = shortage();
  assert.equal(scoreActs(allow, allow.ds[0])[0].act, 'foray');
  tick(allow, .25);
  assert.deepEqual(allow.exp?.team, ['hero']);
  assert.equal(allow.exp.autonomous, true);
  assert.match(allow.ds[0].reason, /存糧不足.*獸跡/);

  const forbid = shortage();
  assert.equal(setForayPolicy(forbid, 'forbid'), true);
  assert.equal(scoreActs(forbid, forbid.ds[0]).some(row => row.act === 'foray'), false);
  tick(forbid, .25);
  assert.equal(forbid.exp, null);
  assert.equal(setOrder(forbid, 'hero', 'foray'), true);
  tick(forbid, .25);
  assert.deepEqual(forbid.exp?.team, ['hero']);
  assert.equal(forbid.exp.autonomous, false);

  const patrol = shortage();
  assert.equal(setOrder(patrol, 'hero', 'patrol'), true);
  tick(patrol, .25);
  assert.ok(ROUTE.some(seg => patrol.exp?.target === seg.to - seg.every), '指定巡山依真對手所在路段選終點');
  assert.ok(patrol.exp?.focus?.p >= 0 && patrol.exp.focus.p <= 1);

  const choice = shortage(); choice.camps = { camp1: true };
  const candidates = forayChoices(choice, choice.ds[0], 'practice');
  assert.ok(candidates.some(row => row.seg === 'gorge' && row.key === 'bear'), '深谷已是逐招候選');
  assert.equal(forayChoice(choice, choice.ds[0], 'practice').key, candidates[0].key);
  assert.ok(candidates.every(row => candidates[0].gap <= row.gap), '想練實戰選交手勝算最接近一半');
  const edible = forayChoices(choice, choice.ds[0], 'food');
  assert.ok(edible.every(row => edible[0].p >= row.p), '缺糧時選原交手式估計最易應付的獵物');
  const veteran = shortage(11); veteran.camps = { camp1: true };
  const expert = veteran.ds[0]; expert.skills.palm = expert.skills.leg = 200; expert.skills.agility = expert.skills.strength = 100;
  learnArt(expert, 'pushPalm'); expert.arts.pushPalm.xp = TIERS[3][0];
  const match = forayChoice(veteran, expert, 'practice');
  assert.equal(match.key, 'chief', '練到能應付山賊時，深谷寨主成為勢均力敵對手');
  assert.ok(match.p >= .4 && match.p <= .6);
  assert.equal(match.from, 'camp1');

  for (const key of ['bear', 'chief']) {
    const gorge = openExp(createState(key === 'bear' ? 61 : 62)); gorge.camps = { camp1: true }; gorge.res.food = 20;
    assert.equal(startExpedition(gorge, ['hero'], { from: 'camp1', target: 500 }).ok, true);
    gorge.exp.dist = ROUTE[3].from + ROUTE[3].every - 1; gorge.exp.nextAt = ROUTE[3].from + ROUTE[3].every;
    gorge.exp.focus = { seg: 'gorge', key };
    for (let i = 0; i < 8 && !gorge.exp.bout; i++) tick(gorge, .25);
    assert.equal(gorge.exp.bout?.key, key, '深谷熊與寨主都進逐招小地圖');
    assert.equal(gorge.exp.bout?.near, false);
    const bout = gorge.exp.bout;
    const [entryX, entryY] = bout.source;
    assert.ok(entryX === bout.left || entryX === bout.left + 2 * EXP_BOUT.halfWidth || entryY === bout.top || entryY === bout.top + 2 * EXP_BOUT.halfHeight, '深谷來敵從小地圖四邊走來');
    assert.ok(FOE_ACTIONS[bout.foes[0].k]);
    for (let i = 0; i < 400 && bout.exchanges === 0 && gorge.exp?.bout === bout; i++) tick(gorge, .25);
    assert.ok(bout.exchanges > 0, `${key} 有真起手與接法`);
  }
  const bridge = openExp(createState(63)); bridge.camps = { camp1: true }; bridge.res.food = 20;
  assert.equal(startExpedition(bridge, ['hero'], { from: 'camp1', target: ROUTE[3].to + ROUTE[3].every }).ok, true);
  bridge.exp.dist = ROUTE[3].to - 1; bridge.exp.gateI = 3; bridge.exp.nextAt = 1000;
  for (let i = 0; i < 8 && !bridge.exp.bout; i++) tick(bridge, .25);
  assert.equal(bridge.exp.bout?.key, 'bear', '橋頭黑熊守關亦逐招交手');
  assert.equal(bridge.exp.pendingGate?.id, 'gorge');

  const old = shortage(); old.rules = '4.0'; delete old.forayPolicy; delete old.forayStats;
  old.exp = { n: 7, team: ['hero'], phase: 'out' };
  migrate(old);
  assert.equal(old.forayPolicy, 'allow');
  assert.deepEqual(old.forayStats, { starts: 0, patrols: 0, hurt: 0, discoveries: 0, targets: [] });
  assert.deepEqual(old.exp, { n: 7, team: ['hero'], phase: 'out' }, '舊局已在外隊伍原樣保留');
});

test('N62 出獵沿原效用雜訊選擇，實測落在獨立均勻分數的 99.9% 區間', t => {
  const s = openExp(createState(17)), d = s.ds[0];
  s.res.food = 10; s.res.wood = s.cap.wood; s.res.stone = s.cap.stone;
  s.plots.forEach(p => { p.st = 'grow'; });
  d.needs = { energy: 100, hunger: 100, social: 100, fun: 65 };
  d.traits.diligent = .1; d.mood = 50;
  s.routine = { dawn: 'free', day: 'free', dusk: 'free' };
  const rows = scoreActs(s, d), own = rows.find(r => r.act === 'foray');
  assert.ok(own);
  const b = own.score - own.f.noise, rivals = rows.filter(r => r !== own).map(r => r.score - r.f.noise);
  const clamp01 = x => Math.max(0, Math.min(1, x));
  // P(own wins) = integral of the rivals' uniform CDFs over own U(0,8) noise.
  const slices = 8192;
  const p = Array.from({ length: slices }, (_, i) => rivals.reduce((v, other) => v * clamp01((b + 8 * (i + .5) / slices - other) / 8), 1)).reduce((a, x) => a + x, 0) / slices;
  const n = 6000;
  let wins = 0;
  for (let i = 0; i < n; i++) wins += scoreActs(s, d)[0].act === 'foray';
  const observed = wins / n, margin = 3.291 * Math.sqrt(p * (1 - p) / n) + 1 / n;
  t.diagnostic(JSON.stringify({ expected: p, observed, n, margin }));
  assert.ok(Math.abs(observed - p) <= margin, `expected ${p}, observed ${observed}, margin ${margin}`);
});

test('N62 卡關的接招勝算由 clashOdds 推出，失手剛好加 w；熟到只剩偶失則不悟', t => {
  const threshold = TECHNIQUES.find(row => row.id === 'dustCast').difficulty / 3;
  const losses = (eye, count) => {
    const s = createState(17, { kind: 'bare', askMajor: false }), d = s.ds[0];
    const dog = { k: 'dog', uid: 'practice-dog', hp: 14, max: 14, pos: [0, 0], practice: { hands: {}, eyes: {}, origin: {} } };
    d.wu = 3; s.mons = [dog];
    let p, w;
    for (let i = 1; i <= count; i++) {
      // 每一回合重建相同受困局面，只保留 N35 悟招進度；眼熟固定才能隔離 w 的驗收。
      Object.assign(d, { hp: 40, posture: 100, busyUntil: 0, swing: null, pain: 0, wounds: [], fret: 0, downUntil: 0, faintUntil: 0, part: null, sure: null, pos: [...COVERS[0].stand] });
      Object.assign(dog, { pos: [d.pos[0] + 20, d.pos[1]], posture: 100, sure: null });
      ensurePractice(d); d.practice.eyes[eyeKey(dog, 'dogBite')] = eye; d.practice.families = {}; d.practice.origin.dog = 0;
      p = 1 - clashOdds(s, dog, d, { move: 'dogBite', wind: .4 }).hit;
      w = learningWeight(p);
      const before = d.glimmer?.progress?.dustCast || 0;
      const result = resolveSwing(s, dog, d, () => .999, { move: 'dogBite', wind: .4 });
      assert.equal(result.kind, 'hit');
      assert.ok(Math.abs(d.glimmer.progress.dustCast - before - w) < 1e-9, `loss ${i}`);
      if (i < count) assert.equal(d.glimmer?.known.includes('dustCast'), false, `early discovery at ${i}`);
    }
    return { s, d, p, w };
  };
  const probe = losses(4, 1), n = Math.ceil(threshold / probe.w);
  assert.ok(probe.p >= .4 && probe.p <= .6, `中段接招勝算 ${probe.p}`);
  const mid = losses(4, n);
  assert.equal(mid.d.glimmer.known.includes('dustCast'), true);
  assert.match(mid.s.log.map(row => row.msg).join('\n'), /悟出「撒土」：敗勢中被逼到角落/);
  const easy = losses(30, 150);
  assert.ok(easy.p >= .9, `熟悉的接招勝算 ${easy.p}`);
  assert.equal(easy.d.glimmer.known.includes('dustCast'), false);
  t.diagnostic(JSON.stringify({ midP: mid.p, midW: mid.w, threshold, firstAt: n, easyP: easy.p, easyProgress: easy.d.glimmer.progress.dustCast }));
});
