// loop36：阻斷視窗排隊（審查 P2）
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickModal, pending } from '../src/modalq.mjs';

test('同時有大事與抉擇：先大事，看完才輪到抉擇', () => {
  assert.equal(pickModal({ alert: true, choice: true }), 'alert');
  assert.equal(pickModal({ alert: false, choice: true }), 'choice');
});
test('已開著的視窗不被後來的插隊', () => {
  assert.equal(pickModal({ cur: 'choice', alert: true, choice: true }), 'choice');
  assert.equal(pickModal({ cur: 'chap', alert: true, chap: true }), 'chap');
  assert.equal(pickModal({ cur: 'alert', alert: false, choice: true }), 'choice');
});
test('章節總結排在最後；都沒有就 null', () => {
  assert.equal(pickModal({ choice: true, chap: true }), 'choice'); assert.equal(pickModal({ chap: true }), 'chap'); assert.equal(pickModal({}), null);
});
test('pending 讀狀態：抉擇只在 askMajor 時算', () => {
  assert.deepEqual(pending({ alert: { msg: 'x' }, hero: { askMajor: false }, choices: [{}] }), { alert: true, choice: false, chap: false });
  assert.deepEqual(pending({ hero: { askMajor: true }, choices: [{ id: 'a' }], chapter: { done: true, seen: false } }), { alert: false, choice: true, chap: true });
});
