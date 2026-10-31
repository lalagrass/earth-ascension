import test from 'node:test';
import assert from 'node:assert/strict';
import { axesFromAnswers, typeOf, validateAttrs, traitsOf, makePerson, fromTemplate } from '../src/person.mjs';
import { TEMPLATES, QUESTIONS } from '../src/data.mjs';

// 每題選項 0 推向的方向。
const firstIsPos = QUESTIONS.map((q) => Object.values(q.a[0][1])[0] > 0);
const answerAll = (wantPos) => firstIsPos.map((fp) => (fp === wantPos ? 0 : 1));

test('A3 全選正向 → ENFP，全選負向 → ISTJ', () => {
  assert.equal(typeOf(axesFromAnswers(answerAll(true))), 'ENFP');
  assert.equal(typeOf(axesFromAnswers(answerAll(false))), 'ISTJ');
});

test('A3 軸值夾在 -1..1，未答不影響', () => {
  const ax = axesFromAnswers(answerAll(true));
  for (const v of Object.values(ax)) assert.ok(v <= 1 && v >= -1);
  assert.deepEqual(axesFromAnswers([]), { E: 0, N: 0, F: 0, P: 0 });
});

test('A4 天賦總和與範圍', () => {
  assert.equal(validateAttrs({ gen: 5, wu: 5, shen: 5, li: 5, ding: 5 }).ok, true);
  assert.equal(validateAttrs({ gen: 6, wu: 5, shen: 5, li: 5, ding: 5 }).ok, false);
  assert.equal(validateAttrs({ gen: 0, wu: 7, shen: 6, li: 6, ding: 6 }).ok, false);
  assert.equal(validateAttrs({ gen: 11, wu: 4, shen: 4, li: 3, ding: 3 }).ok, false);
  assert.equal(validateAttrs({ gen: 5.5, wu: 4.5, shen: 5, li: 5, ding: 5 }).ok, false);
  assert.throws(() => makePerson({ id: 'x', name: 'x', axes: {}, attrs: { gen: 9, wu: 9, shen: 9, li: 9, ding: 9 } }));
});

test('A4 六個模板都合法', () => {
  assert.equal(TEMPLATES.length, 6);
  for (const t of TEMPLATES) assert.equal(validateAttrs(t.attrs).ok, true, t.id);
});

test('A5 特質由軸與天賦決定', () => {
  const ax = { E: 0.8, N: -0.5, F: 0, P: 0.1 };
  const at = { gen: 9, wu: 2, shen: 5, li: 5, ding: 4 };
  assert.deepEqual(traitsOf(ax, at), ['social', 'practical', 'slow', 'sturdy']);
  assert.deepEqual(traitsOf(ax, at), traitsOf({ ...ax }, { ...at }));
  const g = fromTemplate('guojing', { id: 'a' });
  assert.ok(g.traits.includes('sturdy') && g.traits.includes('slow') && g.traits.includes('orderly'));
  assert.equal(g.type, 'ISFJ');
});
