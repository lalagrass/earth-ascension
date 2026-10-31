// loop37：右欄收合（審查：右欄資訊過長）
import test from 'node:test';
import assert from 'node:assert/strict';
import { isFolded, setAll, FOLD_DEFAULT, foldKey } from '../src/panel-ui.mjs';
test('預設：較少用的區塊收合、主要區塊展開', () => {
  for (const id of ['arts', 'codex', 'hunt', 'labor', 'ledger', 'rel']) assert.equal(isFolded({}, id), true);
  for (const id of ['build', 'exp', 'ds', 'recruit', 'log']) assert.equal(isFolded({}, id), false);
});
test('玩家設定優先於預設；全部收合／展開', () => {
  assert.equal(isFolded({ [foldKey('codex')]: false }, 'codex'), false); assert.equal(isFolded({ [foldKey('ds')]: true }, 'ds'), true);
  const K = setAll({}, ['ds', 'codex'], false); assert.equal(isFolded(K, 'codex'), false); setAll(K, ['ds'], true); assert.equal(isFolded(K, 'ds'), true);
  assert.ok(Object.keys(FOLD_DEFAULT).length <= 7);
});
