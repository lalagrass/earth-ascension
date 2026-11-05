import test from 'node:test';
import assert from 'node:assert/strict';
import { teachMul, TEACH_ART } from '../src/bonds.mjs';
import { createState } from '../src/sim.mjs';

test('N25：師父缺席不加速，同場才傳授', () => {
  const s = createState(8), [m, d] = s.ds;
  m.arts.basicFist = { xp: 150, bt1: true, bt2: true, bt3: true, bt4: true };
  d.arts.basicFist = { xp: 0 }; d.master = m.id;
  m.teaching = { pupil: d.id, art: 'basicFist' }; m.teachCool = 10;
  m.task = { act: 'teach', phase: 'do' }; d.task = { act: 'train', teach: m.id };
  m.pos = [0, 0]; d.pos = [0, 0];
  m.away = true; assert.equal(teachMul(s, d, 'basicFist'), 1);
  m.away = false; assert.equal(teachMul(s, d, 'basicFist'), TEACH_ART.mul);
});
