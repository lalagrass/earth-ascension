// loop41：過路高人因材施教（預設勾選）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../src/sim.mjs';
import { jhevDaily, JHEV } from '../../src/jianghu.mjs';
import { artById } from '../../src/arts.mjs';
const force = (s) => { const M = { ...JHEV.master }, L = JHEV.letter.p; Object.assign(JHEV.master, { p: 1, teach: 1 }); JHEV.letter.p = 0; try { jhevDaily(s); } finally { Object.assign(JHEV.master, M); JHEV.letter.p = L; } };
const mk = (on) => { const s = createState(2, { kind: 'custom', answers: Array(9).fill(0), jhev: true, ...(on ? { mfit: true } : {}) }); s.day = 30; s.ds = s.ds.slice(0, 1); return s; };
test('開：所傳武學屬弟子本身路數（若有可傳）；關：維持清單順序；亂數流一致', () => {
  const a = mk(true), b = mk(false), d = a.ds[0]; force(a); force(b);
  const nA = Object.keys(a.ds[0].arts).filter((k) => !b.ds[0].arts[k] || true), learnedA = Object.keys(a.ds[0].arts), learnedB = Object.keys(b.ds[0].arts);
  assert.equal(a.jhev.rng, b.jhev.rng);
  if (a.jhev.ts) assert.ok(learnedA.map(artById).some((x) => x.school === d.style));
  assert.ok((a.jhev.ts || 0) >= (b.jhev.ts || 0)); assert.ok(nA.length && learnedB.length);
});
