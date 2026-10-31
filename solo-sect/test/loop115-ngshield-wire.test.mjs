/* loop115 護體真氣接線（s.ngshield，預設勾選、需內功；golden 不開；舊檔關閉） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/start-ui.mjs';
import { createState, tick } from '../src/sim.mjs';
import { save, load } from '../src/save.mjs';
import { qiMax } from '../src/neigong.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...x });
const runDays = (s, days, dt = 6) => { for (let i = 0; i < days * 600 / dt; i++) tick(s, dt); return s; };
test('規則轉正（loop143）：ngshield 在 v2.2 底層規則', async () => { const { BASELINE_V22 } = await import('../src/sim.mjs'); assert.equal(BASELINE_V22.ngshield, true); });
test('開局接線；開局內力上限 0；沒勾內功時不生效', () => {
  const on = createState(7, spec({ neigong: true, ngshield: true }));
  assert.ok(on.ngshield && on.ds.every((d) => d.ng2 && d.qi === 0));
  assert.ok(on.ds.filter((d) => !Object.keys(d.arts || {}).some((k) => ['breath','zixia','yunv','jiuyang','qiankun','hama','shihou'].includes(k))).every((d) => qiMax(d) === 0));
  const only = createState(7, spec({ ngshield: true })); assert.ok(!only.ngshield && only.ds.every((d) => !d.ng2));
  const v1 = runDays(createState(7, spec({ neigong: true })), 1); assert.ok(v1.ngshield && v1.ds.every((d) => d.ng2)); /* loop142 一版淘汰 */
});
test('二版關閉運勁與運功療傷的日誌', () => {
  const s = runDays(createState(9, spec({ neigong: true, ngshield: true })), 3);
  assert.ok(!s.log.some((l) => /運功療傷/.test(typeof l === 'string' ? l : l.msg ?? l.text ?? '')));
  for (const d of s.ds) assert.ok(d.qi <= qiMax(d) + 1e-9);
});
test('存讀檔保留；舊一版檔（有內功沒 ngshield）讀入後改護體真氣（loop142 決定 126）', () => {
  const s = runDays(createState(11, spec({ neigong: true, ngshield: true })), 1); const b = load(save(s)).state; runDays(b, 1);
  assert.ok(b.ngshield && b.ds.every((d) => d.ng2));
  const x = JSON.parse(save(createState(11, spec({ neigong: true })))); delete x.ngshield; for (const d of x.ds) { delete d.ng2; d.qi = 30; } const o = load(JSON.stringify(x)).state; runDays(o, 1); assert.ok(o.ngshield && o.ds.every((d) => d.ng2 && d.qi <= qiMax(d)));
  const n = load(save(createState(11, spec()))).state; runDays(n, 1); assert.ok(!n.neigong && !n.ngshield && n.ds.every((d) => !d.ng2)); /* 沒開內功的舊檔不強開 */
});
