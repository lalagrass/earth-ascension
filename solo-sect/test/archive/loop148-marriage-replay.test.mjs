import { createState } from '../harness/historical-party.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { tick } from '../../src/sim.mjs';

test('loop148 重現：郭靖模板 seed 1 林師姐欠俸離山後，郭靖不會再與令狐沖拜堂（v2.2 第 23 日重婚）', () => {
  const s = createState(1, { kind: 'template', id: 'guojing', askMajor: false, xiaStyle: 'all', v22: true, steward: true, stewkit: true, stewyard: true });
  const wed = {}; let last = null;
  for (let i = 0; i < 26 * 100; i++) { tick(s, 6); s.alert = null; for (const e of s.log) { if (e === last) break; const m = e.msg.match(/【成親】(.+?)與(.+?)在大廳/); if (m) for (const x of [m[1], m[2]]) wed[x] = (wed[x] || 0) + 1; } last = s.log[0]; }
  assert.ok(Object.keys(wed).length > 0, '有人成親'); for (const [k, v] of Object.entries(wed)) assert.equal(v, 1, `${k} 拜堂 ${v} 次`);
});
