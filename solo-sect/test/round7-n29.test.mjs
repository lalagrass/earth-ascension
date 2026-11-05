import test from 'node:test';
import assert from 'node:assert/strict';
import { composure, noteFret, fretStep } from '../src/arts.mjs';
import { createState } from '../src/sim.mjs';

test('N29：四鼠圍攻時急躁者先惱羞，結束後焦躁歸零', () => {
  const s = createState(3), hot = s.ds[0], steady = s.ds[1];
  hot.personality = ['brave']; steady.personality = ['quiet'];
  assert.ok(composure(hot) < composure(steady));
  for (let i = 0; i < 4; i++) { noteFret(s, hot, 'dodge'); noteFret(s, steady, 'dodge'); }
  assert.equal(hot.raging, true); assert.notEqual(steady.raging, true);
  s.t = hot.rageUntil; assert.equal(fretStep(s, hot), true); assert.equal(hot.fret, 0);
});
