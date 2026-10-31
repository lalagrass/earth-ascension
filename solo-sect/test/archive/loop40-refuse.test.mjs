// loop40：挑戰帖量力而為（預設勾選）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../src/sim.mjs';
import { jhevDaily, JHEV } from '../../src/jianghu.mjs';
import { jhevPanel } from '../../src/panel-ui.mjs';
const mk = (on) => { const s = createState(1, { kind: 'custom', answers: Array(9).fill(0), jhev: true, jhui: true, ...(on ? { jhrefuse: true } : {}) }); s.rep = 10; s.day = 200; return s; };
const force = (s) => { const P = { ...JHEV.master }, L = JHEV.letter.p; JHEV.master.p = 0; JHEV.letter.p = 1; try { jhevDaily(s); } finally { Object.assign(JHEV.master, P); JHEV.letter.p = L; } };
test('勝算低時：開→婉拒（名聲 −1、不計應戰、心情不動）；關→照常應戰', () => {
  const a = mk(true), m0 = a.ds.map((d) => d.mood); force(a); assert.equal(a.jhev.lr, 1); assert.equal(a.jhev.l, 0); assert.equal(a.rep, 10 - JHEV.letter.refuse.rep); assert.deepEqual(a.ds.map((d) => d.mood), m0);
  assert.match(jhevPanel(a), /婉拒 1/);
  const b = mk(false); force(b); assert.equal(b.jhev.l, 1); assert.ok(!b.jhev.lr);
  assert.equal(a.jhev.rng, b.jhev.rng, '亂數流一致');
});
