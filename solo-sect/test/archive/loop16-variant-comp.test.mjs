import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../src/sim.mjs';
import { comprehendVariant, vLean, COMP } from '../../src/arts.mjs';
import { learnArt } from '../../src/arts.mjs';

const sp = { kind: 'custom', name: '測', answers: Array(9).fill(0), comprehend: true };
const noop = () => {};
const prep = (s) => { const d = s.ds[0]; learnArt(d, 'pushPalm', 0); d.arts.pushPalm.xp = 80; return d; };
test('loop16 舊局不悟變式', () => { const s = createState(1); const d = prep(s); for (let i = 0; i < 99; i++) comprehendVariant(s, d, 'train', null, noop, noop); assert.equal(d.arts.pushPalm.variant, undefined); });
test('loop16 大成後自悟變式（依根骨／悟性傾向），不覆蓋玩家已選', () => {
  const s = createState(1, sp); const d = prep(s); let n = 0; while (!d.arts.pushPalm.variant && n++ < 200) comprehendVariant(s, d, 'meditate', null, noop, noop);
  assert.equal(d.arts.pushPalm.variant, vLean(d)); assert.ok(COMP.vneed > 0);
  const s2 = createState(1, sp); const e = prep(s2); e.arts.pushPalm.variant = vLean(e) === 'gang' ? 'ling' : 'gang'; const keep = e.arts.pushPalm.variant;
  for (let i = 0; i < 200; i++) comprehendVariant(s2, e, 'meditate', null, noop, noop); assert.equal(e.arts.pushPalm.variant, keep);
});
test('loop16 切磋觀摩：對手已有變式就學他那路', () => {
  const s = createState(1, sp); const d = prep(s), p = s.ds[1]; learnArt(p, 'pushPalm', 0); p.arts.pushPalm.xp = 80; p.arts.pushPalm.variant = vLean(d) === 'gang' ? 'ling' : 'gang';
  let n = 0; while (!d.arts.pushPalm.variant && n++ < 200) comprehendVariant(s, d, 'spar', p, noop, noop);
  assert.equal(d.arts.pushPalm.variant, p.arts.pushPalm.variant); assert.equal(s.compN.vwatch, 1);
});
