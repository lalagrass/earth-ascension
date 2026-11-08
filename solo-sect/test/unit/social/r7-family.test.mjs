// R7 #524：成親的人各自決定要不要孩子；孩子由父母所生，跟大人同一個年曆長大。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, speedOf } from '../../../src/sim.mjs';
import { DAY } from '../../../src/data.mjs';
import { genStep } from '../../../src/sect.mjs';
import { canDefend } from '../../../src/threat.mjs';
import { FAMILY, childWish, conceiveDaily, gestationDays, bodyMassMul, expecting, bearChild } from '../../../src/family.mjs';

const couple = () => {
  const s = createState(7, { opening: 'xiaolongnv' }); tick(s);
  const [h, x] = s.ds; h.spouse = x.id; x.spouse = h.id; s.gen.couples.push([h.id, x.id].sort());
  h.values = { xia: 30, sect: 10, qing: 40, free: 0, wu: 20, fame: 0 }; x.personality = ['gentle'];
  return { s, h, x };
};
const day = (s, rnd) => { s.day++; s.t = s.day * DAY; genStep(s, rnd); };

test('A：只有一方想要時不會懷孕，即使亂數落在最容易懷上的一端', () => {
  const { s, h, x } = couple();
  h.values.wu = 90; // 一心在武道
  for (let i = 0; i < 2 * FAMILY.yearDays; i++) day(s, () => 0);
  assert.equal(childWish(s, h, x).want, false);
  assert.equal(childWish(s, x, h).want, true);
  assert.ok(!x.pregnant && !h.pregnant, '只有一方想要');
  assert.equal(s.ds.length, 2);
});

test('A：處境不夠（挨餓、不太平、年紀）時不想要', () => {
  const { s, h, x } = couple();
  s.emergency = true;
  assert.match(childWish(s, h, x).why.join(), /挨餓/);
  s.emergency = false; h.famished = true;
  assert.match(childWish(s, x, h).why.join(), /挨餓/);
  h.famished = false; s.band = { state: 'go' };
  assert.match(childWish(s, x, h).why.join(), /不太平/);
  s.band = null; x.age = FAMILY.motherMaxAge + 1;
  assert.match(childWish(s, h, x).why.join(), /年紀/);
});

test('A：兩人都想才懷孕；懷孕足月出生，根骨與悟性落在父母之間', () => {
  for (const q of [0, 0.5, 0.999]) {
    const { s, h, x } = couple();
    h.root = 2; x.root = 5; h.wu = 4; x.wu = 1;
    day(s, () => (q < conceiveDaily() ? q : 0));
    assert.ok(x.pregnant, '兩人都想、亂數落在每日受孕機率內');
    for (let i = 0; i < gestationDays(); i++) day(s, () => q);
    const kid = s.ds.find((d) => d.child?.born != null);
    assert.ok(kid, '足月出生');
    assert.deepEqual(kid.child.parents.sort(), [h.id, x.id].sort());
    assert.ok(kid.root >= 2 && kid.root <= 5, `根骨 ${kid.root}`);
    assert.ok(kid.wu >= 1 && kid.wu <= 4, `悟性 ${kid.wu}`);
    assert.equal(kid.age, 0);
  }
});

test('A：孩子按大人的年曆長大，14 歲成年', () => {
  const { s, h, x } = couple();
  const kid = bearChild(s, x, h, () => 0.5);
  const born = s.day;
  for (let i = 0; i < FAMILY.yearDays - 1; i++) day(s, () => 1);
  assert.equal(kid.age, 0, '未滿一年');
  day(s, () => 1);
  assert.equal(kid.age, 1, '滿一個大人年');
  const before = h.age;
  while (!kid.adult) day(s, () => 1);
  assert.equal(s.day - born, FAMILY.adultAge * FAMILY.yearDays);
  assert.equal(h.age - before, FAMILY.adultAge - 1, '大人與孩子同一個時鐘');
});

test('A：懷孕讓母親走得慢、做活慢；知道有孕後不上陣', () => {
  const { s, x } = couple();
  const v0 = speedOf(x, s);
  x.pregnant = { since: s.t, father: 'hero' };
  assert.equal(expecting(s, x), false, '剛懷上還不知道');
  assert.equal(canDefend(x, s), canDefend({ ...x, pregnant: undefined }, s));
  s.t += gestationDays() * DAY * 0.9;
  assert.ok(expecting(s, x));
  assert.equal(canDefend(x, s), false);
  assert.ok(bodyMassMul(s, x) > 1.19 && bodyMassMul(s, x) < 1.21);
  assert.ok(speedOf(x, s) < v0 / 1.19);
});

test('A：嬰兒只吃和睡', () => {
  const { s, h, x } = couple();
  const kid = bearChild(s, x, h, () => 0.5);
  const seen = new Set();
  for (let i = 0; i < 400; i++) { tick(s); if (kid.task) seen.add(kid.task.act); }
  assert.ok(seen.size > 0, '嬰兒會吃會睡');
  for (const a of seen) assert.ok(['eat', 'rest'].includes(a), a);
});
