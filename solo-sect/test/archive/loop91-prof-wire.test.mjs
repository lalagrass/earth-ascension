/* loop91 熟練度十重接線（s.prof，預設勾選；golden 不開） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../../src/start-ui.mjs';
import { createState, tick } from '../../src/sim.mjs';
import { save, load } from '../../src/save.mjs';
import { moveMul } from '../../src/arts.mjs';
import { profMul } from '../../src/arts.mjs';
import { ARTS } from '../../src/data.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...x });
const runDays = (s, days, dt = 6) => { for (let i = 0; i < days * 600 / dt; i++) tick(s, dt); return s; };
test('規則轉正（loop143）：prof 在 v2.2 底層規則', async () => { const { BASELINE_V22 } = await import('../../src/sim.mjs'); assert.equal(BASELINE_V22.prof, true); });
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
test('開啟時招式威力恰好多乘 profMul(xp)', () => { const s = createState(9, spec({ prof: true })); const d = s.ds[0]; const a = ARTS.find((x) => d.arts[x.id] && x.techs?.length); d.arts[a.id].xp = 22;
  const on = moveMul(d, a.techs[0], s.t); d.pf = 0; const off = moveMul(d, a.techs[0], s.t); d.pf = 1; assert.ok(Math.abs(on / off - profMul(22)) < 1e-12); assert.ok(profMul(22) > 1); });
test('新入門者與存讀檔', () => { const s = runDays(createState(11, spec({ prof: true })), 1); const b = load(save(s)).state; assert.ok(b.prof && b.ds.every((d) => d.pf)); });
