// loop56：同修作伴（s.cotrain，預設勾選）：練功／打坐／閒著且身邊有人時，寂寞增加速度減半
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, cotrainNear } from '../../src/sim.mjs';
import { RULES } from '../../src/start-ui.mjs';
const mk = (x) => createState(3, { kind: 'custom', answers: Array(9).fill(0), ...x });
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
test('身邊有人才算；距離遠或在做別的事（聊天、農事）不算', () => {
  const s = mk({ cotrain: true }), [a, b] = s.ds; for (const d of s.ds) d.away = true; a.away = b.away = false;
  a.pos = [100, 100]; b.pos = [150, 100]; a.task = { act: 'train' }; assert.equal(cotrainNear(s, a), true);
  a.task = null; assert.equal(cotrainNear(s, a), true);
  a.task = { act: 'farm' }; assert.equal(cotrainNear(s, a), false);
  a.task = { act: 'train' }; b.pos = [300, 100]; assert.equal(cotrainNear(s, a), false);
  b.pos = [150, 100]; b.away = true; assert.equal(cotrainNear(s, a), false);
});
