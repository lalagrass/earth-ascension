/* loop103 最小內功接線（s.neigong，預設勾選；golden 不開） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/start-ui.mjs';
import { createState, tick } from '../src/sim.mjs';
import { save, load } from '../src/save.mjs';
import { qiMax } from '../src/arts.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...x });
const runDays = (s, days, dt = 6) => { for (let i = 0; i < days * 600 / dt; i++) tick(s, dt); return s; };
test('規則轉正（loop143）：neigong 在 v2.2 底層規則', async () => { const { BASELINE_V22 } = await import('../src/sim.mjs'); assert.equal(BASELINE_V22.neigong, true); });
test('開局接線；沒勾時不寫 ng／qi', () => {
  const on = createState(7, spec({ neigong: true })), off = createState(7, spec());
  assert.ok(on.neigong && on.ds.every((d) => d.ng && d.qi === 0));
  runDays(off, 2); assert.ok(!off.neigong && off.ds.every((d) => !d.ng && d.qi === undefined));
});
test('打坐、歇息回內力，不超上限', () => {
  const s = runDays(createState(9, spec({ neigong: true })), 2);
  assert.ok(s.ds.some((d) => d.qi > 0)); for (const d of s.ds) assert.ok(d.qi <= qiMax(d) + 1e-9);
});
test('新入門者與存讀檔；舊檔（沒有 neigong）維持關閉', () => {
  const s = runDays(createState(11, spec({ neigong: true })), 1); const b = load(save(s)).state;
  assert.ok(b.neigong && b.ds.every((d) => d.ng)); assert.deepEqual(b.ds.map((d) => d.qi), s.ds.map((d) => d.qi));
  const o = createState(11, spec()); const ob = load(save(o)).state; runDays(ob, 1); assert.ok(!ob.neigong && ob.ds.every((d) => !d.ng));
});
