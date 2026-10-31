// v2.1：照舊開局無名主線、plain 香火曲線、第 30 日後對數威脅、山門重傷冷卻、丹藥只計數
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, incenseOf, applyEff, payday } from '../src/sim.mjs';
import { DAY, ECON, PLAIN, ACTIVITIES } from '../src/data.mjs';
import { jhStep, jhResolve, card } from '../src/jianghu.mjs';
import { artTier } from '../src/arts.mjs';
import { RAID, T, dayMul, threatDaily, raidResolve } from '../src/threat.mjs';
import { agePills, marketDo } from '../src/economy.mjs';
import { TREES } from '../src/data.mjs';

const hero = (s) => s.ds.find((d) => d.id === 'hero');
const H = { think: () => {} };
const grow = (s, n) => { const b = s.ds.find((d) => d.id !== 'hero'); while (s.ds.length < n) s.ds.push({ ...structuredClone(b), id: `p${s.ds.length}`, adult: true, role: 'inner', hp: 100 }); return s; };

test('無名主線寫在宿命樹：第 15 日才出，兩條都是大成，經典開局不觸發', () => {
  assert.equal(TREES.checks.plain[0].card, 'wuming');
  assert.equal(TREES.checks.plain[0].day, 15);
  const s = createState(3);
  s.day = 14; jhStep(s, 0.25);
  assert.equal(artTier(hero(s), 'fengLei'), -1, '第 14 日還沒有');
  s.day = 15; s.choices = [{ id: 'stuck', jh: 'dfbb' }];
  jhStep(s, 0.25);
  assert.ok(artTier(hero(s), 'fengLei') >= 2, '卡住的江湖卡不會擋住無名主線');
  assert.ok(s.jh.wuming);
  assert.ok(!s.choices.some((c) => c.jh === 'wuming'), '照舊開局無人點選，當場結算');
  assert.ok(s.choices.some((c) => c.jh === 'dfbb'), '反例：其他卡住的卡不會被一起清掉');
  jhStep(s, 0.25);
  assert.equal(hero(s).arts.fengLei.xp >= 55, true);
  const g = createState(3, { kind: 'template', id: 'guojing', askMajor: false });
  g.day = 20; jhStep(g, 0.25);
  assert.equal(artTier(hero(g), 'fengLei'), -1, '反例：經典開局不走無名主線');
  const b = createState(4); b.day = 15;
  const ch = card(b, 'wuming', true); jhResolve(b, ch, 1);
  assert.ok(artTier(hero(b), 'fengLei') >= 2);
  assert.match(b.log[0].msg, /拳師/);
});

test('plain 香火：前 10 日更高，之後聲望段更低；有 hero 的開局公式不變', () => {
  const s = createState(1); s.rep = 20;
  s.day = 5;
  const classic = ECON.coinBase + Math.floor(20 / ECON.coinPerRep);
  assert.equal(incenseOf({ ...s, hero: { kind: 'template', id: 'x' } }), classic);
  assert.equal(incenseOf(s), classic + PLAIN.earlyBonus);
  s.day = 20;
  assert.equal(incenseOf(s), ECON.coinBase + Math.floor(Math.floor(20 / ECON.coinPerRep) * PLAIN.repMul));
  assert.ok(incenseOf(s) < classic, '反例：第 10 日之後 plain 不會比經典更高');
  const coin = s.res.coin; s.day = 6; payday(s); assert.equal(s.res.coin, coin + incenseOf(s));
});

test('威脅：第 30 日係數與舊線性相同，之後對數更低；重傷把下次上門推後 2 日，不死', () => {
  const old = (day) => Math.min(RAID.dayMax, 0.5 + day / RAID.dayK);
  assert.equal(dayMul({ day: 30 }), old(30));
  assert.ok(dayMul({ day: 60 }) < old(60));
  assert.ok(dayMul({ day: 60 }) > dayMul({ day: 30 }), '對數仍在成長');
  const s = grow(createState(1), 9); s.day = 40; s.res.coin = 5;
  for (const d of s.ds) d.hp = 100;
  T(s).pending = { n: 1, pts: 80, demand: 999, p: 0, at: s.t, until: s.t, day: s.day };
  T(s).next = 46;
  raidResolve(s, 1, H);
  assert.ok(T(s).homeHurt >= 1);
  assert.equal(T(s).next, 48);
  assert.equal(T(s).deaths, 0);
  assert.equal(s.ds.length, 9, '反例：重傷不會死人');
  const quiet = createState(2); quiet.day = 10; threatDaily(quiet); const scheduled = T(quiet).next;
  assert.ok(scheduled >= quiet.day, '沒有重傷時不額外推後');
});

test('丹藥計數：煉出來、治傷、賣出、陳化分開記，庫存算法不變', () => {
  const s = createState(1); s.res.herb = 4; s.res.pill = 0; s.cap.pill = 10;
  const d = hero(s); d.hp = 40;
  applyEff(s, d, ACTIVITIES.brew.eff, '煉藥');
  assert.equal(s.res.pill, 1); assert.equal(s.pills.made, 1); assert.equal(s.pills.used || 0, 0);
  applyEff(s, d, ACTIVITIES.heal.eff, '治傷');
  assert.equal(s.res.pill, 0); assert.equal(s.pills.used, 1); assert.ok(d.hp > 40);
  s.res.pill = 12; s.day = 5; const before = s.res.pill; const lost = agePills(s);
  assert.equal(s.pills.aged, lost); assert.equal(s.res.pill, before - lost);
  s.res.pill = 1; s.res.coin = 0; assert.equal(marketDo(s, 'pill').ok, true);
  assert.equal(s.pills.sold, 1); assert.equal(s.res.pill, 0);
  const ratio = s.pills.made / (s.pills.used + s.pills.sold + s.pills.aged);
  assert.ok(ratio > 0 && ratio < 1, '這一例產得少、用得多，比率有數字');
});

test('照舊開局跑過第 15 日：風雷掌腿在身上，而且遊戲日會自己推進', () => {
  const s = createState(5);
  while (s.day < 16 && s.t < 20 * DAY) tick(s);
  assert.ok(s.day >= 16);
  assert.ok(artTier(hero(s), 'fengLei') >= 2);
  assert.match(s.log.map((e) => e.msg).join('\n'), /風雷掌腿/);
});
