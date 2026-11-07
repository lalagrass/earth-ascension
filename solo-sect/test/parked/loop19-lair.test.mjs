// Parked after T1 CI failure; original assertion(s) retained verbatim: loop19 江湖規則長跑：有剿寨且有成功; tracked in #496.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../src/sim.mjs';
import { T } from '../../src/threat.mjs';
import { LAIR, lairDaily, lairStep } from '../../src/threat.mjs';

const sp = { kind: 'custom', name: '測', answers: Array(9).fill(0), peace: true };
const ready = (o) => { const s = createState(1, o); s.day = 20; s.res.food = 50; s.res.coin = 300; T(s).n = LAIR.after; for (const d of s.ds) d.hp = 100; return s; };
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則

test('loop19 江湖規則長跑：有剿寨且有成功', () => {
  const s = createState(2, { ...sp, draw: true, comprehend: true, mentor: true }); for (let i = 0; i < 4800; i++) tick(s, 6);
  assert.ok((s.lair?.n || 0) >= 1); assert.ok((s.lair?.won || 0) >= 1);
});
