import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor } from '../src/sim.mjs';
import { raidSchedule, scheduleRevenge } from '../src/raid.mjs';
import { RAID, BOSS, ENEMIES, TICKS_PER_DAY } from '../src/data.mjs';

const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });

test('M23-A1 排程：前 12 日跟沒有上限時一樣；之後每筆 ≤ CAP', () => {
  for (const seed of [1, 4, 9, 13, 22]) {
    const capped = raidSchedule(seed);
    const cap = RAID.CAP; RAID.CAP = Infinity;
    const open = raidSchedule(seed);
    RAID.CAP = cap;
    assert.deepEqual(capped.slice(0, 12 - RAID.START_DAY), open.slice(0, 12 - RAID.START_DAY), `seed ${seed}`);
    assert.ok(capped.every((r) => r.kinds.length <= RAID.CAP));
    assert.ok(open.some((r) => r.kinds.length > RAID.CAP), '沒有上限時後期會超過');
  }
});

test('M23-A2 拆巢後第 DELAY 日 HOUR 時，頭目（血 ×HP_MUL、有名字）帶 ESCORT 隻來；紀事寫報仇', () => {
  const s = world();
  s.raids = []; s.visits = [];
  const den = s.nests.find((n) => n.id === 'den');
  den.cleared = true;
  s.tick = 3 * TICKS_PER_DAY + 500;
  scheduleRevenge(s, den);
  const r = s.revenge[0];
  assert.equal(r.tick, (3 + BOSS.DELAY) * TICKS_PER_DAY + BOSS.HOUR * 60);
  assert.ok(BOSS.NAMES.boar.includes(r.name));
  const n0 = s.enemies.length;
  s.tick = r.tick - 1;
  step(s);
  const fresh = s.enemies.slice(n0);
  assert.equal(fresh.length, 1 + BOSS.ESCORT);
  const boss = fresh.find((e) => e.boss);
  assert.equal(boss.kind, 'boar');
  assert.equal(boss.hpMax, ENEMIES.boar.hp * BOSS.HP_MUL);
  assert.equal(boss.label, `${BOSS.TITLE.boar}${r.name}`);
  assert.ok(s.events.some((e) => e.text === `${boss.label}帶著${BOSS.ESCORT}頭野豬來報仇`));
  // 只來一次；拆了巢後一般排程的野豬照樣不來。
  for (let i = 0; i < 5; i++) step(s);
  assert.equal(s.enemies.filter((e) => e.boss).length, 1);
  s.raids = [{ tick: s.tick + 1, kinds: ['boar'], xs: [30] }]; s.raidAt = 0;
  const n1 = s.counts.enemies;
  step(s); step(s);
  assert.equal(s.counts.enemies, n1, '拆了野豬窩，一般的野豬不來');
});
