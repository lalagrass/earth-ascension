import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, companionsFor, step } from '../src/sim.mjs';
import { rosterFor, script } from '../tools/soak-checks.mjs';
import { sectHistory, TREND_COLS } from '../src/chronicle.mjs';
import { TICKS_PER_DAY } from '../src/data.mjs';

const world = () => createWorld({ seed: 4, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(4, 'qiaofeng')] });
const ev = (s, day, kind, text, who) => s.events.push({ tick: day * TICKS_PER_DAY + 10, kind, text, ...(who ? { who } : {}) });

test('M25-A1 大事：每種只取第一次，頭目報仇每次都取，照時間排', () => {
  const s = world(); s.events = []; s.tick = 6 * TICKS_PER_DAY;
  ev(s, 0, 'built', '石灶台完工'); ev(s, 1, 'built', '木床完工');
  ev(s, 1, 'raid', '野豬從南邊山林來了（1）');
  ev(s, 2, 'raid', '野豬王帶著2頭野豬來報仇');
  ev(s, 3, 'chat', '閒聊'); ev(s, 3, 'move', '甲領悟了開山掌', [s.people[0].id]);
  ev(s, 4, 'raid', '山寨頭目帶著2頭山賊來報仇');
  const h = sectHistory(s).highlights.map((e) => e.text);
  assert.deepEqual(h, ['石灶台完工', '野豬王帶著2頭野豬來報仇', '甲領悟了開山掌', '山寨頭目帶著2頭山賊來報仇']);
});

test('M25-A1 生平：每位同門一句、訪客不寫；寫師父、學會的招、家人', () => {
  const s = world(); s.events = [];
  const [a, b] = s.people;
  a.master = b.id; a.kin = b.id; b.kin = a.id;
  ev(s, 2, 'move', `${b.name}指點${a.name}學會了開山掌`, [a.id, b.id]);
  ev(s, 3, 'family', `${a.name}與${b.name}結為道侶`, [a.id, b.id]);
  s.people.push({ ...s.people[2], id: 'g1', name: '客', guest: { until: 99 } });
  const { lives } = sectHistory(s);
  assert.equal(lives.length, s.people.length - 1);
  assert.ok(!lives.some((l) => l.id === 'g1'));
  const la = lives.find((l) => l.id === a.id).text;
  assert.match(la, new RegExp(`拜${b.name}為師`));
  assert.match(la, /學會開山掌/);
  assert.match(la, /結為道侶/);
  assert.match(lives.find((l) => l.id === b.id).text, /開山就在/);
  assert.ok(!/學會/.test(lives.find((l) => l.id === b.id).text), '指點別人的人沒學會');
});

test('M25-A1 走勢：每日一列，各欄等於那日紀事數', () => {
  const s = world(); s.events = []; s.tick = 3 * TICKS_PER_DAY + 5;
  ev(s, 0, 'built', 'x'); ev(s, 2, 'raid', 'x'); ev(s, 2, 'repel', 'x'); ev(s, 2, 'repel', 'x'); ev(s, 3, 'join', 'x');
  const t = sectHistory(s).trend;
  assert.equal(t.length, 4);
  assert.deepEqual(t.map((r) => TREND_COLS.map((c) => r[c.id])), [[1, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 1, 2, 0, 0], [0, 0, 0, 0, 1]]);
});

test('M25-A2 48 個種子 base 二十日，大事都 ≥ 5 種', () => {
  for (let seed = 1; seed <= 48; seed++) {
    const s = createWorld({ seed, people: rosterFor(seed) });
    for (let t = 0; t < 20 * TICKS_PER_DAY; t++) { script(s, 'base'); step(s); }
    const kinds = new Set(sectHistory(s).highlights.map((e) => e.kind));
    assert.ok(kinds.size >= 5, `種子 ${seed}：${[...kinds].join('、')}`);
  }
});
