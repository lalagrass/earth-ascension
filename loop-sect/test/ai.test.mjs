import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, release, scorePois, companionsFor } from '../src/sim.mjs';
import { candidates } from '../src/ai.mjs';

const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
const noon = (s) => { s.tick = 12 * 60; return s; };

test('M2-A2 很餓只考慮吃或採', () => {
  const s = noon(world());
  const p = s.people[0];
  p.needs = { food: 8, energy: 60, social: 10, fun: 10 };
  const { list, forced } = candidates(s, p, scorePois);
  assert.ok(forced);
  for (const c of list) assert.ok(['eat', 'eatRaw', 'eatCarried', 'forage', 'deliver'].includes(c.kind), c.kind);
  assert.equal(list[0].kind, 'eat');
});

test('M2-A2 很累只考慮睡；又餓又累先顧比較缺的', () => {
  const s = noon(world());
  const p = s.people[0];
  p.needs = { food: 80, energy: 5, social: 10, fun: 10 };
  let r = candidates(s, p, scorePois);
  for (const c of r.list) assert.ok(c.kind === 'sleep' || c.kind === 'sleepGround');
  p.needs = { food: 3, energy: 8, social: 50, fun: 50 };
  r = candidates(s, p, scorePois);
  assert.ok(r.list.every((c) => c.kind !== 'sleep'), '飽食更缺時應先吃');
});

test('M2-A3 一張床同時只有一人，中斷後釋放', () => {
  const s = world();
  const beds = s.objects.filter((o) => o.kind === 'bed');
  // 三人都累，第四張床不存在：最多三人上床，其餘席地。
  for (const p of s.people) p.needs = { food: 90, energy: 10, social: 90, fun: 90 };
  s.tick = 23 * 60;
  for (let t = 0; t < 120; t++) step(s);
  for (const b of beds) assert.ok(b.users.filter(Boolean).length <= 1);
  const sleeper = s.people.find((p) => p.task?.kind === 'sleep');
  assert.ok(sleeper, '應有人在床上睡');
  const bed = s.objects.find((o) => o.id === sleeper.task.obj);
  release(s, sleeper);
  assert.equal(bed.users.filter(Boolean).length, 0);
});

test('M2-A3 預約吃飯會扣住一份飯，中斷歸還', () => {
  const s = noon(world());
  const p = s.people[0];
  p.needs = { food: 5, energy: 90, social: 90, fun: 90 };
  const before = s.stock.meal;
  p.x = 10; p.y = 30; // 離桌子遠一點，確定還在路上
  step(s);
  assert.equal(p.task.kind, 'eat');
  assert.equal(s.stock.meal, before - 1);
  release(s, p);
  assert.equal(s.stock.meal, before);
});

test('外向者寂寞時首選找人聊天，內向者首選坐石凳', () => {
  const pickFor = (tpl) => {
    const s = noon(createWorld({ seed: 4, people: [{ template: tpl, name: '甲' }, { template: 'guojing', name: '乙' }, { template: 'zhangsan', name: '丙' }] }));
    const p = s.people[0];
    p.needs = { food: 90, energy: 90, social: 30, fun: 30 };
    return candidates(s, p, scorePois).list[0].kind;
  };
  assert.equal(pickFor('linghu'), 'chat');
  assert.equal(pickFor('longnv'), 'sit');
});
