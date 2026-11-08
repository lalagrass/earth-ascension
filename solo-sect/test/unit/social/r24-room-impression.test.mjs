import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../../src/sim.mjs';
import { moodTarget } from '../../../src/social.mjs';

test('24f 名望者嫌破屋、修好回升；自在者不受房間觀感影響', () => {
  const s = createState(17, { kind: 'custom', hermitage: true, opening: 'solo', starterArt: 'chunyangFist' });
  s.hermitage.active = false;
  const d = s.ds[0]; d.personality = []; d.thoughts = []; d.values = { fame: 25, free: 0 };
  const worn = moodTarget(d, s);
  s.fac.dorm.stage = 2;
  const repaired = moodTarget(d, s);
  assert.ok(repaired > worn);
  d.values = { fame: 0, free: 25 };
  const adaptable = moodTarget(d, s);
  s.fac.dorm.stage = 0;
  assert.equal(moodTarget(d, s), adaptable);
});
