/* loop79 成長分層接線（s.grow，預設勾選；golden 不開） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/start-ui.mjs';
import { createState, tick } from '../src/sim.mjs';
import { save, load } from '../src/save.mjs';
import { mastery } from '../src/growth.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...x });
const runDays = (s, days, dt = 6) => { for (let i = 0; i < days * 600 / dt; i++) tick(s, dt); return s; };
test('規則預設勾選', () => assert.equal(RULES.find((r) => r[0] === 'grow')?.[3], true));
test('開局 spec 接線；沒勾時不寫 gm', () => { const on = createState(7, spec({ grow: true })), off = createState(7, spec());
  assert.equal(on.grow, true); assert.ok(!off.grow); assert.ok(on.ds.every((d) => d.gInit)); assert.ok(off.ds.every((d) => !d.gInit && Object.values(d.arts).every((r) => !r.gm)));
  runDays(off, 3); assert.ok(off.ds.every((d) => Object.values(d.arts).every((r) => !r.gm)), '未啟用路徑三日後仍無造詣欄位'); });
test('開啟後練功累積造詣，倍率說明含同類底子或不含（依真實結算）', () => { const s = runDays(createState(11, spec({ grow: true })), 3); const h = s.ds[0];
  assert.ok(mastery(h, 'quanzhang') > 0 || mastery(h, 'tuifa') > 0); assert.ok(Object.values(h.arts).some((r) => r.gm && r.gm.e > 0)); });
test('存讀檔後繼續，結果與不存讀一致', () => { const a = runDays(createState(13, spec({ grow: true })), 1); const b = load(save(a)).state; runDays(a, 1); runDays(b, 1);
  for (const [i, d] of a.ds.entries()) for (const [id, r] of Object.entries(d.arts)) assert.deepEqual(r.gm, b.ds[i].arts[id].gm, `${d.name} ${id}`); });
test('讀檔不重新折算開局造詣（冪等）', () => { const a = createState(17, spec({ grow: true })); const e0 = JSON.stringify(a.ds.map((d) => d.arts)); const b = load(save(a)).state; assert.equal(JSON.stringify(b.ds.map((d) => d.arts)), e0); });
