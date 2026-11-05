import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, placeBlueprint, startExpedition } from '../src/sim.mjs';
import { LIFE_CATS, catOf, lifeShares, habits, habitText, personEvents, eventsIn, EVENT_GROUPS, sectStats, LIFE_MIN } from '../src/chronicle.mjs';
import { addAff, withStage } from '../src/social.mjs';
import { TICKS_PER_DAY } from '../src/data.mjs';

const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
const total = (p) => Object.values(p.life ?? {}).reduce((a, b) => a + b, 0);

test('M10-A1 時間帳：每 tick 每人一筆，八類加總等於 tick 數；走去吃算吃飯', () => {
  const s = world();
  for (let i = 0; i < 600; i++) step(s);
  for (const p of s.people) {
    assert.equal(total(p), 600);
    const sh = lifeShares(p);
    assert.ok(Math.abs(LIFE_CATS.reduce((a, c) => a + sh[c.id], 0) - 1) < 1e-9 || (p.life.other ?? 0) > 0);
  }
  assert.equal(catOf({ act: 'walk', task: { kind: 'eat' } }), 'eat');
  assert.equal(catOf({ act: 'do', task: { kind: 'quarry' } }), 'work');
  assert.equal(catOf({ act: 'idle', task: null }), 'leisure');
  assert.equal(catOf({ act: 'walk', task: { kind: 'expedition' } }), 'away');
});

test('M10-A2 習性：只改一人的帳，寫出差最多的那類與方向；資料不到半天不比', () => {
  const s = world();
  const base = { work: 300, social: 60, drill: 60, leisure: 120, sleep: 400, eat: 60 };
  for (const p of s.people) p.life = { ...base };
  const [a] = s.people;
  assert.equal(habitText(s, a), '跟同門過得差不多');
  a.life = { ...base, social: 260, work: 100 };
  const hs = habits(s, a);
  assert.equal(hs.length, 2);
  assert.deepEqual(hs.map((h) => h.id).sort(), ['social', 'work']);
  assert.ok(hs.find((h) => h.id === 'social').diff > 0 && hs.find((h) => h.id === 'work').diff < 0);
  assert.match(habitText(s, a), /比同門多花時間聊天切磋/);
  assert.match(habitText(s, a), /比同門少花時間幹活/);
  a.life = { social: LIFE_MIN - 1 };
  assert.deepEqual(habits(s, a), []);
});

test('M10-A3 紀事帶到相關的人；生平只列自己的', () => {
  const s = world();
  const [a, b, c] = s.people;
  withStage(s, a, b, () => { addAff(s, a, b, 12); addAff(s, b, a, 12); });
  assert.equal(s.events.at(-1).kind, 'rel');
  assert.deepEqual(personEvents(s, c).map((e) => e.kind), []);
  assert.equal(personEvents(s, a).length, 1);
  // 遠征紀事帶到隊員。
  s.tick = 2 * TICKS_PER_DAY + 540; s.raids = []; s.stock.meal = 6;
  for (const p of s.people) p.needs = { food: 95, energy: 95, social: 95, fun: 95 };
  const r = startExpedition(s, 'den');
  const ev = s.events.at(-1);
  assert.equal(ev.kind, 'exp');
  assert.deepEqual(ev.who, r.party.map((p) => p.id));
  // 完工紀事帶到施工者：自然跑到灶台完工。
  const t = world(2);
  placeBlueprint(t, 'hearth2');
  for (let i = 0; i < 3 * TICKS_PER_DAY && !t.built.includes('hearth2'); i++) step(t);
  const built = t.events.find((e) => e.kind === 'built');
  assert.ok(built, '灶台應該完工');
  assert.ok(built.who.length >= 1 && built.who.every((id) => t.people.some((p) => p.id === id)));
  for (const id of built.who) assert.ok(personEvents(t, t.people.find((p) => p.id === id)).includes(built));
});

test('M10-A4 紀事分類只含該類；統計跟帳本一致', () => {
  const s = world();
  for (let i = 0; i < 2 * TICKS_PER_DAY; i++) step(s);
  for (const g of EVENT_GROUPS) if (g.kinds) for (const e of eventsIn(s, g.id)) assert.ok(g.kinds.includes(e.kind), `${g.id} 混進 ${e.kind}`);
  assert.equal(eventsIn(s, 'all').length, s.events.length);
  const st = Object.fromEntries(sectStats(s));
  assert.equal(st['煮好／吃掉的飯'], `${s.ledger.mealsMade}／${s.ledger.mealsEaten}`);
  assert.equal(st['在山上'], '3 日');
  assert.equal(st['完工'], `${s.built.length} 處`);
  // 每一種出現過的紀事都歸得到一類（不會只在「全部」裡）。
  const known = new Set(EVENT_GROUPS.flatMap((g) => g.kinds ?? []));
  for (const e of s.events) assert.ok(known.has(e.kind), `沒有分類的紀事 ${e.kind}`);
});
