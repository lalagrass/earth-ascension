import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, foundHermitageSect, canRecruit } from '../../../src/sim.mjs';
import { save, load } from '../../../src/save.mjs';
import { DAY } from '../../../src/data.mjs';

const opening = (seed) => createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: true, hermitage: true, partner: 'xiaolongnv', starterArt: 'chunyangFist' });

test('H0：未立匾三十日只有開局人物；立匾後恢復登門', () => {
  for (const seed of [1001, 1002]) {
    const s = opening(seed), people = s.ds.map((d) => d.id);
    assert.equal(s.log.some((entry) => entry.msg.includes('一行人來到山腳一間破道館')), false);
    for (let i = 0; i < 30 * DAY / .25; i++) { tick(s); if (s.alert) s.alert = null; }
    assert.deepEqual(s.ds.map((d) => d.id), people, `種子 ${seed} 未立匾不得多出人物`);
    assert.equal(s.choices.some((choice) => choice.xia), false);
    assert.equal(s.xia.pending, null);
    assert.match(canRecruit(s).why, /立匾後/);
  }
  const founded = opening(1001);
  assert.equal(foundHermitageSect(founded).ok, true);
  founded.records.sect = 250;
  tick(founded);
  assert.equal(founded.choices.some((choice) => choice.xia), true, '立匾後恢復原名俠登門排程');
  assert.doesNotMatch(canRecruit(founded).why, /荒山隱居/);


});
