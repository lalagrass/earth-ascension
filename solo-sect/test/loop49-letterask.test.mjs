// loop49：挑戰帖由我定奪（預設勾選，僅在「重大抉擇問我」時生效）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim.mjs';
import { jhevDaily, JHEV } from '../src/jianghu.mjs';
import { resolveChoice, autoPick } from '../src/hero.mjs';
const mk = (x) => { const s = createState(1, { kind: 'custom', answers: Array(9).fill(0), jhev: true, ...x }); s.rep = 10; s.day = 30; s.choices ??= []; return s; };
const force = (s) => { const P = JHEV.master.p, L = JHEV.letter.p; JHEV.master.p = 0; JHEV.letter.p = 1; try { jhevDaily(s); } finally { JHEV.master.p = P; JHEV.letter.p = L; } };
test('開＋問我：出抉擇卡（只顯示勝算），不立即結算；應戰→結算、婉拒→名聲 −1', () => {
  const s = mk({ letterask: true, askMajor: true }); s.hero.askMajor = true; force(s); const ch = s.choices.find((c) => c.letter);
  assert.ok(ch); assert.match(ch.text, /勝算約 \d+%/); assert.equal(s.jhev.l, 0); assert.equal(s.rep, 10);
  const t = structuredClone(s); resolveChoice(t, ch.id, 1); assert.equal(t.rep, 10 - JHEV.letter.refuse.rep); assert.equal(t.jhev.lr, 1);
  resolveChoice(s, ch.id, 0); assert.equal(s.jhev.l, 1); assert.ok(!s.choices.some((c) => c.letter));
});
test('沒勾「問我」或關閉：照舊自動結算；亂數流一致', () => {
  const a = mk({ letterask: true }); a.hero && (a.hero.askMajor = false); force(a); assert.ok(!a.choices.some((c) => c.letter)); assert.equal(a.jhev.l + (a.jhev.lr || 0), 1);
  const b = mk({ letterask: true }); b.hero.askMajor = true; force(b); assert.equal(a.jhev.rng, b.jhev.rng);
  assert.equal(autoPick(b, { letter: true, p: 0.2 }), 0); b.jhrefuse = true; assert.equal(autoPick(b, { letter: true, p: 0.2 }), 1);
});
