// Parked after T1 CI failure; original assertion(s) retained verbatim: 勾了：空地＋人數夠 → 執事立木樁場; tracked in #496.
/* loop95 執事立樁（s.stewyard，預設勾選；golden 不開） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../../src/start-ui.mjs';
import { createState, tick } from '../../src/sim.mjs';
import { STEW } from '../../src/economy.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, steward: true, ...x });
const runDays = (s, days, dt = 1) => { for (let i = 0; i < days * 600 / dt; i++) tick(s, dt); return s; };

test('勾了：空地＋人數夠 → 執事立木樁場', () => { const s = createState(7, spec({ stewyard: true })); assert.ok(s.ds.length >= STEW.yardAt, `人數 ${s.ds.length}`); assert.equal(s.fac.yard.stage, 0);
  runDays(s, 8); assert.ok((s.stew?.built || []).includes('yard') || s.fac.yard.stage >= 1, JSON.stringify(s.stew)); });
