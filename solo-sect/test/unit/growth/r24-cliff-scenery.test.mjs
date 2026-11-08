import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITIES, CLIFFS, NODES } from '../../../src/data.mjs';
import { createState, scenicRecovery, tick } from '../../../src/sim.mjs';
import { focusMul, moodStep, moodTarget } from '../../../src/social.mjs';
import { cookMedicatedMeal, applyMedicatedMeal } from '../../../src/economy.mjs';

test('24e 崖與空地同一練功基數；景致按休閒同秒數解悶並提高專注', () => {
  assert.deepEqual(ACTIVITIES.cliffTrain.skill, ACTIVITIES.train.skill);
  assert.deepEqual(ACTIVITIES.waterfallTrain.skill, ACTIVITIES.train.skill);
  const d = { needs: { fun: 10 }, mood: 25 };
  const before = focusMul(d);
  scenicRecovery(d, CLIFFS.cliff1, ACTIVITIES.leisure.dur);
  assert.equal(d.needs.fun, 10 + ACTIVITIES.leisure.fun);
  d.mood = 50;
  assert.ok(focusMul(d) > before);
  const practice = (act, node) => {
    const s = createState(17, { kind: 'custom', hermitage: true, opening: 'solo', starterArt: 'chunyangFist' });
    const hero = s.ds[0]; hero.at = node; hero.pos = [...NODES[node]]; hero.path = [];
    hero.task = { act, node, ...(act === 'train' ? { fac: 'yard' } : {}), phase: 'do', timer: 0 };
    for (let n = 0; n < ACTIVITIES.train.dur / 0.25; n++) {
      hero.mood = 50; hero.needs.fun = 60;
      tick(s, 0.25);
    }
    return { style: hero.skills[hero.style], xp: hero.arts.chunyangFist.xp };
  };
  assert.deepEqual(practice('cliffTrain', 'cliff1'), practice('train', 'yard'));
  const s = createState(17, { kind: 'custom', hermitage: true, opening: 'solo', starterArt: 'chunyangFist' });
  s.res.food = 1; s.res.herb = 1; s.res.beeJelly = 1; s.res.coldWater = 0;
  assert.ok(cookMedicatedMeal(s, s.ds[0]));
  assert.equal(s.res.beeJelly, 0);
  assert.equal(applyMedicatedMeal(s.ds[0], s).bee, true);
  const viewed = createState(18, { kind: 'custom', hermitage: true, opening: 'solo', starterArt: 'chunyangFist' });
  const visitor = viewed.ds[0]; visitor.thoughts = []; visitor.needs.fun = 0;
  visitor.mood = moodTarget(visitor, viewed);
  const lowMood = visitor.mood;
  scenicRecovery(visitor, CLIFFS.cliff1, ACTIVITIES.leisure.dur);
  assert.equal(visitor.needs.fun, ACTIVITIES.leisure.fun);
  moodStep(viewed, visitor, 1);
  assert.ok(visitor.mood > lowMood, '景致解悶後，心情沿現有目標回復');
});
