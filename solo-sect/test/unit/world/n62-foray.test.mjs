import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, scoreActs, setForayPolicy, setOrder, startExpedition, tick } from '../../../src/sim.mjs';
import { openExp } from '../../../src/world.mjs';
import { ROUTE } from '../../../src/data.mjs';
import { forayChoices } from '../../../src/foray-choice.mjs';

function shortage(seed = 17) {
  const s = openExp(createState(seed, { kind: 'custom', hermitage: true, opening: 'solo' }));
  s.hermitage.active = false; s.hermitage.founded = true;
  s.res.food = 0; s.res.veg = 0;
  s.ds[0].needs = { energy: 100, hunger: 90, social: 100, fun: 65 };
  s.ds[0].values = Object.fromEntries(Object.keys(s.ds[0].values).map(k => [k, 0]));
  return s;
}

test('N62 缺糧獸跡出獵、門規指定及效用雜訊期望', t => {
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
  assert.ok(ROUTE.slice(0, 3).some(seg => seg.id === patrol.exp?.focus?.seg));

  const choice = shortage();
  const candidates = forayChoices(choice, choice.ds[0], 'practice');
  assert.ok(candidates.every(row => ROUTE.slice(0, 3).some(seg => seg.id === row.seg)), '只追前三段可見真地圖對手');
  const edible = forayChoices(choice, choice.ds[0], 'food');
  assert.ok(edible.every(row => row.effort >= edible[0].effort), '缺糧先追較易取糧的獵物');

  // B：有雜訊時仍用原評分公式推期望，不增出獵骰。
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
  // 原評分對每個候選獨立加 U(0,8)；對其它候選的 CDF 積分算出出獵被選中的期望。
  const slices = 8192;
  const p = Array.from({ length: slices }, (_, i) => rivals.reduce((v, other) => v * clamp01((b + 8 * (i + .5) / slices - other) / 8), 1)).reduce((a, x) => a + x, 0) / slices;
  const n = 6000;
  let wins = 0;
  for (let i = 0; i < n; i++) wins += scoreActs(s, d)[0].act === 'foray';
  const observed = wins / n, margin = 3.291 * Math.sqrt(p * (1 - p) / n) + 1 / n;
  t.diagnostic(JSON.stringify({ expected: p, observed, n, margin }));
  assert.ok(Math.abs(observed - p) <= margin, `expected ${p}, observed ${observed}, margin ${margin}`);
});
