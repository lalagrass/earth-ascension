// v2.1 留下可於隱居立匾後驗證的威脅與丹藥規則。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../harness/historical-party.mjs';
import { applyEff } from '../../src/sim.mjs';
import { ACTIVITIES } from '../../src/data.mjs';
import { RAID, T, dayMul, threatDaily, raidResolve } from '../../src/threat.mjs';
import { agePills, marketDo } from '../../src/economy.mjs';

const hero = (s) => s.ds.find((d) => d.id === 'hero');
const H = { think: () => {} };
const grow = (s, n) => { const b = s.ds.find((d) => d.id !== 'hero'); while (s.ds.length < n) s.ds.push({ ...structuredClone(b), id: `p${s.ds.length}`, adult: true, role: 'inner', hp: 100 }); return s; };

test('威脅：第 30 日係數與舊線性相同，之後對數更低；重傷把下次上門推後 2 日，不死', () => {
  const old = (day) => Math.min(RAID.dayMax, 0.5 + day / RAID.dayK);
  assert.equal(dayMul({ day: 30 }), old(30));
  assert.ok(dayMul({ day: 60 }) < old(60));
  assert.ok(dayMul({ day: 60 }) > dayMul({ day: 30 }), '對數仍在成長');
  const s = grow(createState(1), 9); s.day = 40; s.res.coin = 5;
  for (const d of s.ds) { d.hp = 100; d.needs.energy = 0; } /* #431：無可應戰者走即時勝算結算 */
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
