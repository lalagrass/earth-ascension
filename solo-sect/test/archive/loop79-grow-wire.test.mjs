/* loop79 成長分層接線（s.grow，預設勾選；golden 不開） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../../src/start-ui.mjs';
import { createState, tick } from '../../src/sim.mjs';
import { save, load } from '../../src/save.mjs';
import { mastery } from '../../src/arts.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...x });
const runDays = (s, days, dt = 6) => { for (let i = 0; i < days * 600 / dt; i++) tick(s, dt); return s; };
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
test('開啟後練功累積造詣，倍率說明含同類底子或不含（依真實結算）', () => { const s = runDays(createState(11, spec({ grow: true })), 3); const h = s.ds[0];
  assert.ok(mastery(h, 'quanzhang') > 0 || mastery(h, 'tuifa') > 0); assert.ok(Object.values(h.arts).some((r) => r.gm && r.gm.e > 0)); });
test('存讀檔後繼續，結果與不存讀一致', () => { const a = runDays(createState(13, spec({ grow: true })), 1); const b = load(save(a)).state; runDays(a, 1); runDays(b, 1);
  for (const [i, d] of a.ds.entries()) for (const [id, r] of Object.entries(d.arts)) assert.deepEqual(r.gm, b.ds[i].arts[id].gm, `${d.name} ${id}`); });
test('讀檔不重新折算開局造詣（冪等）', () => { const a = createState(17, spec({ grow: true })); const e0 = JSON.stringify(a.ds.map((d) => d.arts)); const b = load(save(a)).state; assert.equal(JSON.stringify(b.ds.map((d) => d.arts)), e0); });
