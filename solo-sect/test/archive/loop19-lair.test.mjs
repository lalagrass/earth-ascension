import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../src/sim.mjs';
import { T } from '../../src/threat.mjs';
import { LAIR, lairDaily, lairStep } from '../../src/threat.mjs';

const sp = { kind: 'custom', name: '測', answers: Array(9).fill(0), peace: true };
const ready = (o) => { const s = createState(1, o); s.day = 20; s.res.food = 50; s.res.coin = 300; T(s).n = LAIR.after; for (const d of s.ds) d.hp = 100; return s; };
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
test('loop19 條件齊就派隊出山（帶糧、留人看家），回來結算', () => {
  const s = ready(sp), f0 = s.res.food; const tr = lairDaily(s); assert.ok(tr); assert.equal(tr.ids.length, LAIR.team);
  assert.equal(f0 - s.res.food, LAIR.team * LAIR.supply); assert.ok(s.ds.some((d) => !d.away)); assert.ok(tr.pow > 0);
  s.t = tr.back; const n0 = T(s).next; lairStep(s); assert.equal(s.lair.trip, null); assert.ok(s.ds.every((d) => !d.away));
  const h = s.lair.hist.at(-1); if (h.win) assert.ok(T(s).next >= s.day + LAIR.peaceDays); else assert.ok(h.hurt); void n0;
});
