/* loop95 執事立樁（s.stewyard，預設勾選；golden 不開） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../../src/start-ui.mjs';
import { createState, tick } from '../../src/sim.mjs';
import { STEW } from '../../src/economy.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, steward: true, ...x });
const runDays = (s, days, dt = 1) => { for (let i = 0; i < days * 600 / dt; i++) tick(s, dt); return s; };
test('規則轉正（loop143）：併入「執事自動營建」勾選', async () => { const { buildSpec } = await import('../../src/start-ui.mjs'); assert.ok(buildSpec({ tab: 'custom', ans: Array(9).fill(0) }).stewyard); });
test('勾了：空地＋人數夠 → 執事立木樁場', () => { const s = createState(7, spec({ stewyard: true })); assert.ok(s.ds.length >= STEW.yardAt, `人數 ${s.ds.length}`); assert.equal(s.fac.yard.stage, 0);
  runDays(s, 8); assert.ok((s.stew?.built || []).includes('yard') || s.fac.yard.stage >= 1, JSON.stringify(s.stew)); });
test('沒勾或沒開執事自主：不立', () => { for (const x of [{}, { stewyard: true, steward: false }]) { const s = runDays(createState(7, spec(x)), 3); assert.ok(!(s.stew?.built || []).includes('yard')); } });
test('已有木樁場就不再立', () => { const s = createState(7, spec({ stewyard: true })); s.fac.yard.stage = 1; runDays(s, 3); assert.ok(!(s.stew?.built || []).includes('yard')); });
