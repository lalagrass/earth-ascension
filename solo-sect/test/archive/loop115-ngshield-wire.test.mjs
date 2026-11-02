/* loop115 護體真氣接線（s.ngshield，預設勾選、需內功；golden 不開；舊檔關閉） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../../src/start-ui.mjs';
import { createState, tick } from '../../src/sim.mjs';
import { save, load } from '../../src/save.mjs';
import { qiMax } from '../../src/arts.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...x });
const runDays = (s, days, dt = 6) => { for (let i = 0; i < days * 600 / dt; i++) tick(s, dt); return s; };
test('規則轉正（loop143）：ngshield 在 v2.2 底層規則', async () => { const { BASELINE_V22 } = await import('../../src/sim.mjs'); assert.equal(BASELINE_V22.ngshield, true); });
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
test('二版關閉運勁與運功療傷的日誌', () => {
  const s = runDays(createState(9, spec({ neigong: true, ngshield: true })), 3);
  assert.ok(!s.log.some((l) => /運功療傷/.test(typeof l === 'string' ? l : l.msg ?? l.text ?? '')));
  for (const d of s.ds) assert.ok(d.qi <= qiMax(d) + 1e-9);
});
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
