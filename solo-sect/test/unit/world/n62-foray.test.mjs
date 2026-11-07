import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, migrate, scoreActs, setForayPolicy, setOrder, startExpedition, tick } from '../../../src/sim.mjs';
import { openExp } from '../../../src/world.mjs';
import { ROUTE } from '../../../src/data.mjs';
import { forayChoices } from '../../../src/foray-choice.mjs';

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
  assert.ok(ROUTE.slice(0, 3).some(seg => seg.id === patrol.exp?.focus?.seg));

  const choice = shortage();
  const candidates = forayChoices(choice, choice.ds[0], 'practice');
  assert.ok(candidates.every(row => ROUTE.slice(0, 3).some(seg => seg.id === row.seg)), '只追前三段可見真地圖對手');
  const edible = forayChoices(choice, choice.ds[0], 'food');
  assert.ok(edible.every(row => row.effort >= edible[0].effort), '缺糧先追較易取糧的獵物');

  const old = shortage(); old.rules = '4.0'; delete old.forayPolicy; delete old.forayStats;
  old.exp = { n: 7, team: ['hero'], phase: 'out' };
  migrate(old);
  assert.equal(old.forayPolicy, 'allow');
  assert.deepEqual(old.forayStats, { starts: 0, patrols: 0, hurt: 0, discoveries: 0, targets: [] });
  assert.deepEqual(old.exp, { n: 7, team: ['hero'], phase: 'out' }, '舊局已在外隊伍原樣保留');
});
