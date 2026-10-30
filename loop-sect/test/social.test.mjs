import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, scorePois } from '../src/sim.mjs';
import { candidates } from '../src/ai.mjs';
import { compat, stageOf, addAff, aff, teachTopic, prestige } from '../src/social.mjs';
import { fromTemplate } from '../src/person.mjs';

const world = (seed = 4, tpl = 'qiaofeng') => createWorld({ seed, people: [{ template: tpl, name: '甲' }, ...companionsFor(seed, tpl)] });
const calm = (p) => { p.needs = { food: 95, energy: 95, social: 95, fun: 95 }; };

test('M5-A1 相合度 0.7–1.3，越像越高；階段門檻', () => {
  const a = fromTemplate('guojing', { id: 'a' }), b = fromTemplate('guojing', { id: 'b' }), c = fromTemplate('zhangsan', { id: 'c' });
  assert.ok(Math.abs(compat(a, b) - 1.3) < 1e-9);
  assert.ok(compat(a, c) < compat(a, b) && compat(a, c) >= 0.7);
  const s = { aff: {}, events: [], tick: 0 };
  assert.equal(stageOf(s, a, b).id, 'stranger');
  addAff(s, a, b, 12); addAff(s, b, a, 10);
  assert.equal(stageOf(s, a, b).id, 'known');
  addAff(s, a, b, 25); addAff(s, b, a, 25);
  assert.equal(stageOf(s, a, b).id, 'friend');
  addAff(s, a, b, 25); addAff(s, b, a, 25);
  assert.equal(stageOf(s, a, b).id, 'close');
  addAff(s, a, b, 500);
  assert.equal(aff(s, a, b), 100);
});

// 讓 a 站到發呆中的 b 身邊、很想聊，第三人在忙，跑到這次聊天結束。
function chatOnce(s) {
  const [a, b, c] = s.people;
  for (const o of s.people) calm(o);
  c.act = 'do'; c.task = { kind: 'idle', left: 99999 };
  a.needs.social = 10; s.tick = 12 * 60;
  b.act = 'idle'; b.task = null; b.wait = 400;
  a.x = b.x; a.y = b.y; b.needs.social = 40;
  let started = false;
  for (let t = 0; t < 400; t++) {
    step(s);
    b.needs.social = 40;
    if (a.task?.kind === 'chat' && a.act === 'do') started = true;
    if (started && a.task?.kind !== 'chat') break;
  }
  return { a, b, started };
}

test('M5-A2 聊完雙方好感上升', () => {
  const s = world();
  const { a, b, started } = chatOnce(s);
  assert.ok(started, '應該聊起來');
  assert.ok(aff(s, a, b) > 0 && aff(s, b, a) > 0, `a→b ${aff(s, a, b)} b→a ${aff(s, b, a)}`);
});

test('M5-A2 被婉拒會降好感；同桌吃完會升', () => {
  const s = world(4, 'linghu');
  const [a] = s.people;
  const quiet = s.people.find((x) => x.axes.E < -0.4) ?? s.people[2];
  quiet.axes.E = -0.9; quiet.needs.social = 100; quiet.act = 'idle'; quiet.wait = 50; quiet.task = null;
  a.x = quiet.x; a.y = quiet.y;
  a.task = { kind: 'chat', partner: quiet.id }; a.act = 'walk'; a.path = [];
  step(s);
  assert.ok(aff(s, a, quiet) < 0, '被婉拒應降好感');
  const w = world(5);
  const table = w.objects.find((o) => o.kind === 'table');
  const [x, y] = w.people;
  for (const o of w.people) calm(o);
  x.needs.food = y.needs.food = 20;
  w.tick = 12 * 60;
  for (let t = 0; t < 600 && !(aff(w, x, y) > 0); t++) { step(w); x.needs.social = y.needs.social = 95; }
  assert.ok(aff(w, x, y) > 0 || aff(w, y, x) > 0, '同桌吃飯應升好感');
  assert.ok(table);
});

test('M5-A3 只改好感：越喜歡的人，找他聊天的分數越高', () => {
  const s = world();
  const [a, b] = s.people;
  calm(a); a.needs.social = 30; s.tick = 12 * 60;
  const score = () => {
    s.rng = 12345;
    return candidates(s, a, scorePois).list.find((c) => c.kind === 'chat' && c.partner === b.id).score;
  };
  const base = score();
  addAff(s, a, b, 50);
  assert.ok(score() > base);
});

test('M5-A6 只改對方名望：仰慕使分數較高', () => {
  const s = world();
  const [a, b] = s.people;
  calm(a); a.needs.social = 30; s.tick = 12 * 60;
  const score = () => { s.rng = 999; return candidates(s, a, scorePois).list.find((c) => c.kind === 'chat' && c.partner === b.id).score; };
  const base = score();
  b.skills.chop = 90; b.skills.build = 90;
  assert.ok(prestige(b) > prestige(a));
  assert.ok(score() > base);
});

test('M5-A4 請教：差距 ≥ 15 為請教話題，聊完請教者技能上升、對方不變', () => {
  const s = world();
  const [a, b, c] = s.people;
  b.skills.chop = 60;
  assert.equal(teachTopic(a, b), 'chop');
  assert.equal(teachTopic(b, a), null);
  for (const o of s.people) calm(o);
  c.act = 'do'; c.task = { kind: 'idle', left: 99999 };
  a.needs.social = 10; s.tick = 12 * 60;
  b.act = 'idle'; b.task = null; b.wait = 400;
  a.x = b.x; a.y = b.y; b.needs.social = 40;
  for (let t = 0; t < 400 && !(s.counts.taught > 0); t++) { step(s); b.needs.social = 40; if (b.act === 'idle' && !b.task) b.wait = 400; }
  assert.ok(s.counts.taught > 0, '應發生請教');
  assert.ok(a.skills.chop > 0);
  assert.equal(b.skills.chop, 60);
});
