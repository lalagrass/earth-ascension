import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { TYPES, typeLabel, mbtiPersonality, traitsOf } from '../src/social.mjs';

const spec = (mbti) => ({ kind: 'custom', name: '測', answers: Array(9).fill(0), ...(mbti ? { mbti } : {}) });
const hero = (s) => s.ds.find((d) => d.id === 'hero');
const safe = (sp) => { try { return createState(7, sp); } catch (e) { return e; } };

test('loop5 選型：特質來自 16 型，記下 mbti', () => {
  const s = safe(spec('ENTP')); if (s instanceof Error) return assert.fail(s.message);
  const h = hero(s);
  assert.equal(h.mbti, 'ENTP');
  assert.deepEqual(h.personality.slice(0, 2), traitsOf('ENTP'));
});
test('loop5 不選型：與舊版完全相同', () => {
  const a = safe(spec(null)), b = safe({ ...spec(null) });
  assert.ok(!(a instanceof Error)); assert.equal(hero(a).mbti, undefined);
  assert.deepEqual(hero(a).personality, hero(b).personality);
});
test('loop5 悟性 1 仍先得憨厚', () => assert.equal(mbtiPersonality('ENTP', 1)[0], 'honest'));
test('loop5 未知型拒絕', () => assert.throws(() => createState(7, spec('XXXX'))));
test('loop5 標籤只標「參考」', () => {
  for (const k of Object.keys(TYPES)) { const l = typeLabel(k); assert.match(l, /（參考：[^）]+）$/); assert.ok(!/即是|就是|=/.test(l)); }
  assert.equal(typeLabel('nope'), '');
});
test('loop5 16 型都能開局並跑一天', () => {
  for (const k of Object.keys(TYPES)) { const s = createState(3, spec(k)); for (let i = 0; i < 240; i++) tick(s, 6); assert.ok(s.ds.length > 0); }
});
