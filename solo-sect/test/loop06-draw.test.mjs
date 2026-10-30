import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, scoreActs } from '../src/sim.mjs';
import { DRAW, isExtro, powOf, drawOf } from '../src/draw.mjs';

const run = (st, days) => { for (let i = 0; i < 240 * days; i++) tick(st, 6); return st; };
const sp = (o = {}) => ({ kind: 'custom', name: '測', answers: Array(9).fill(0), ...o });

test('loop6 預設關閉：createState 不帶 draw 時沒有 s.draw', () => {
  assert.equal(createState(5).draw, undefined);
  assert.equal(createState(5, sp()).draw, undefined);
  assert.equal(createState(5, sp({ draw: true })).draw, true);
});
test('loop6 外向判定：選 E 型、或帶外向特質', () => {
  assert.ok(isExtro({ mbti: 'ENFP' })); assert.ok(!isExtro({ mbti: 'INTJ', personality: ['sociable'] }));
  assert.ok(isExtro({ personality: ['glib'] })); assert.ok(!isExtro({ personality: ['honest'] }));
});
test('loop6 強者與外向者吸引力較高、有上限', () => {
  const weak = { skills: { strength: 2 } }, strong = { skills: { strength: 30, palm: 40 } };
  assert.ok(powOf(strong) > powOf(weak));
  assert.equal(drawOf(weak, strong), DRAW.powCap);
  assert.equal(drawOf(strong, weak), 0);
  assert.equal(drawOf(weak, { personality: ['sociable'], skills: {} }), DRAW.extroPull);
});
test('loop6 外向主角的聊天分數被放大', () => {
  if (typeof scoreActs !== 'function') return;
  const a = createState(9, sp({ mbti: 'ENFP' })), b = createState(9, sp({ mbti: 'ENFP', draw: true }));
  const h = (s) => s.ds.find((d) => d.id === 'hero');
  const ca = scoreActs(a, h(a)).find((o) => o.act === 'chat'), cb = scoreActs(b, h(b)).find((o) => o.act === 'chat');
  if (ca && cb) assert.ok(cb.f.base > ca.f.base);
});
test('loop6 開啟後跑 5 天：無錯、有仰慕發生', () => {
  let adm = 0;
  for (const seed of [1, 2, 3]) { const s = run(createState(seed, sp({ draw: true })), 5); adm += s.log.filter((l) => /心生仰慕/.test(l.msg)).length; }
  assert.ok(adm > 0, 'no admire');
});
