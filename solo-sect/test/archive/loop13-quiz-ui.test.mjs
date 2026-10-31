import test from 'node:test';
import assert from 'node:assert/strict';
import { MBTI_Q, quizResult, typeFromAnswers } from '../../src/social.mjs';
import { mbtiBlock } from '../../src/start-ui.mjs';
import { defaultStats } from '../../src/hero.mjs';

const st = (o = {}) => ({ stats: defaultStats(), mbti: '', mbtiMode: 'none', mq: Array(MBTI_Q.length).fill(null), ...o });
test('loop13 未答完回 null、答完與 typeFromAnswers 一致', () => {
  assert.equal(quizResult(Array(MBTI_Q.length).fill(null)), null);
  assert.equal(quizResult([0, 0, 0, 0, 0, 0, 0, null]), null);
  const all1 = Array(MBTI_Q.length).fill(1); assert.equal(quizResult(all1), typeFromAnswers(all1)); assert.equal(quizResult(Array(MBTI_Q.length).fill(0)), 'ESTJ');
});
test('loop13 三種模式：不選／答八題／直接選型（下拉保留）', () => {
  const a = mbtiBlock(st()); assert.match(a, /答八題/); assert.match(a, /直接選型/); assert.ok(!/data-mq/.test(a)); assert.ok(!/id="st-mbti"/.test(a));
  const q = mbtiBlock(st({ mbtiMode: 'quiz' })); assert.equal((q.match(/data-mq=/g) || []).length, MBTI_Q.length); assert.match(q, /還有 8 題沒答/);
  const p = mbtiBlock(st({ mbtiMode: 'pick' })); assert.match(p, /id="st-mbti"/); assert.equal((p.match(/<option value="[A-Z]{4}"/g) || []).length, 16);
});
test('loop13 答完顯示型與「參考」標籤', () => {
  const mq = Array(MBTI_Q.length).fill(0); const h = mbtiBlock(st({ mbtiMode: 'quiz', mq, mbti: quizResult(mq) }));
  assert.match(h, /ESTJ・/); assert.match(h, /（參考：[^）]+）/); assert.ok(!/題沒答/.test(h));
});
