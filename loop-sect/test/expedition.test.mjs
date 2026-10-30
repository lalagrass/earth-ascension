import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, startExpedition } from '../src/sim.mjs';
import { canLaunch, partyFor, nestOf } from '../src/expedition.mjs';
import { courage } from '../src/martial.mjs';
import { raidSchedule } from '../src/raid.mjs';
import { EXPEDITION, TICKS_PER_DAY } from '../src/data.mjs';

const DAY3_9 = 2 * TICKS_PER_DAY + 9 * 60;
// 第 3 日 9 時、沒有侵擾、灶上有飯、三人精神飽滿。
function world(seed = 4) {
  const s = createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
  s.tick = DAY3_9;
  s.raids = [];
  s.stock.meal = 6;
  for (const p of s.people) p.needs = { food: 95, energy: 95, social: 95, fun: 95 };
  return s;
}
const strong = (p) => { Object.assign(p.moves, { changquan: 100, kaishan: 100, liuyun: 100, poyue: 100 }); };
const tireless = (s) => { for (const p of s.people) if (p.exp) p.needs.energy = Math.max(p.needs.energy, 80); };
const homeHash = (s) => s.people.map((p) => `${p.exp}`).join();

test('M9-A1 組隊：條件夠的同門、依膽識排序；人不夠不能出發；乾糧從存糧扣', () => {
  const s = world();
  const party = partyFor(s);
  assert.ok(party.length >= EXPEDITION.PARTY_MIN && party.length <= EXPEDITION.PARTY_MAX);
  for (let i = 1; i < party.length; i++) assert.ok(courage(party[i - 1]) >= courage(party[i]));
  // 累的人不去。
  const tired = party[0];
  tired.needs.energy = EXPEDITION.MIN_ENERGY - 1;
  assert.ok(!partyFor(s).includes(tired));
  for (const p of s.people) p.needs.energy = 10;
  assert.equal(canLaunch(s, 'den').ok, false);
  for (const p of s.people) p.needs.energy = 95;
  // 沒帶糧不出發（loop 9 實作中的變更）。
  s.stock.meal = 0;
  assert.match(canLaunch(s, 'den').reason, /乾糧不夠/);
  s.stock.meal = 6;
  const r = startExpedition(s, 'den');
  assert.ok(r.ok);
  const packed = r.party.reduce((a, p) => a + p.pack, 0);
  assert.equal(s.stock.meal, 6 - packed);
  assert.equal(packed, Math.min(6, r.party.length * EXPEDITION.PACK));
  assert.equal(canLaunch(s, 'camp').ok, false, '同時只能一支隊伍');
});

test('M9-A2 行軍：一步不超過速度上限、途中不接自主行動、走到巢旁', () => {
  const s = world();
  const { party } = startExpedition(s, 'den');
  const den = nestOf(s, 'den');
  let last = party.map((p) => ({ x: p.x, y: p.y }));
  for (let i = 0; i < 600 && s.expedition?.phase === 'march'; i++) {
    tireless(s);
    step(s);
    party.forEach((p, k) => {
      assert.ok(Math.hypot(p.x - last[k].x, p.y - last[k].y) <= 1.01, `${p.name} 一步走太遠`);
      assert.ok(['expedition', 'ration', 'fight'].includes(p.task?.kind ?? 'expedition'), `${p.name} 行軍中去做 ${p.task?.kind}`);
    });
    last = party.map((p) => ({ x: p.x, y: p.y }));
  }
  assert.notEqual(s.expedition.phase, 'march', '應該走到巢旁');
  for (const p of party) assert.ok(Math.hypot(p.x - den.x, p.y - den.y) <= EXPEDITION.STAGE_R + 2);
});

test('M9-A3 討伐成功：夠強的隊伍拆掉野豬窩，之後的侵擾沒有野豬', () => {
  const s = world();
  for (const p of s.people) strong(p);
  startExpedition(s, 'den');
  for (let i = 0; i < 1200 && s.expedition; i++) { tireless(s); step(s); }
  assert.ok(nestOf(s, 'den').cleared, '野豬窩應該被拆掉');
  assert.equal(s.expedition, null, '隊伍應該回到山上解散');
  assert.ok(s.people.every((p) => !p.exp));
  // 之後的侵擾：換回真正的排程，跑兩天，沒有野豬出生。
  s.raids = raidSchedule(s.seed).filter((r) => r.tick > s.tick && r.tick < s.tick + 2 * TICKS_PER_DAY);
  assert.ok(s.raids.some((r) => r.kinds.includes('boar')), '排程上本來有野豬');
  const born = new Set();
  for (let i = 0; i < 2 * TICKS_PER_DAY; i++) { step(s); for (const e of s.enemies) if (!e.nest) born.add(`${e.kind}:${e.id}`); }
  assert.ok(![...born].some((k) => k.startsWith('boar')), `拆掉後還有野豬：${[...born]}`);
  if (s.raids.some((r) => r.kinds.includes('bandit'))) assert.ok([...born].some((k) => k.startsWith('bandit')), '山賊照樣會來');
});

test('M9-A4 撤退：精力不支就撤，巢與守衛回滿血，回到院子後恢復自主', () => {
  const s = world();
  const { party } = startExpedition(s, 'den');
  const den = nestOf(s, 'den');
  for (let i = 0; i < 800 && s.expedition?.phase !== 'fight'; i++) { tireless(s); step(s); }
  assert.equal(s.expedition.phase, 'fight');
  for (let i = 0; i < 40; i++) { tireless(s); step(s); }
  party[0].needs.energy = EXPEDITION.RETREAT_ENERGY - 1;
  step(s);
  assert.equal(s.expedition.phase, 'return');
  assert.equal(s.expedition.result, 'retreat');
  assert.equal(den.hp, den.hpMax);
  const guards = s.enemies.filter((e) => e.nest === 'den');
  assert.equal(guards.length, 2);
  for (const g of guards) assert.equal(g.hp, g.hpMax);
  for (let i = 0; i < EXPEDITION.RETURN_MAX + 10 && s.expedition; i++) step(s);
  assert.equal(s.expedition, null);
  assert.ok(!den.cleared);
  for (const p of party) { assert.equal(p.exp, false); assert.equal(p.pack, 0); }
  // 解散後各自回到自主行動。
  for (let i = 0; i < 30; i++) step(s);
  assert.ok(party.some((p) => p.task && p.task.kind !== 'expedition'), homeHash(s));
});

test('M9-A5 乾糧：隊員餓了吃一份，背包減一、帳上記一份、飽食上升', () => {
  const s = world();
  const { party } = startExpedition(s, 'den');
  const p = party[0];
  const eaten0 = s.ledger.mealsEaten, pack0 = p.pack;
  p.needs.food = EXPEDITION.EAT_AT - 5;
  let ate = false;
  for (let i = 0; i < 60 && !ate; i++) { tireless(s); step(s); ate = p.pack < pack0; }
  assert.ok(ate, '應該吃乾糧');
  assert.equal(p.pack, pack0 - 1);
  assert.equal(s.ledger.mealsEaten, eaten0 + 1);
  assert.ok(p.needs.food > EXPEDITION.EAT_AT - 5 + EXPEDITION.RATION_FOOD - 5);
});
