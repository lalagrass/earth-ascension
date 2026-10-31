/* loop84 存檔／重播影響：舊檔不開、新入門立即折算、同種子重跑一致、存讀中斷一致 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { save, load } from '../src/save.mjs';
const spec = { kind: 'custom', answers: Array(9).fill(0), grow: true };
const run = (s, n) => { for (let i = 0; i < n; i++) tick(s, 0.25); return s; };
test('舊檔（無 grow）讀入後仍關閉、不產生 gm', () => { const s = run(createState(11), 400), r = load(save(s)); assert.ok(r.ok); assert.ok(!r.state.grow); run(r.state, 400);
  assert.ok(r.state.ds.every((d) => !d.gInit && Object.values(d.arts || {}).every((a) => !a.gm))); });
test('開啟後新入門者下一步就有折算', () => { const s = run(createState(12, spec), 4); const d = { ...structuredClone(s.ds[1]), id: 'newbie', gInit: false }; for (const r of Object.values(d.arts)) delete r.gm; s.ds.push(d); tick(s, 0.25); assert.ok(d.gInit); assert.ok(Object.values(d.arts).every((r) => r.gm)); });
test('同種子重跑完全相同', () => { assert.equal(JSON.stringify(run(createState(13, spec), 2400)), JSON.stringify(run(createState(13, spec), 2400))); });
test('中途存讀後續相同', () => { const a = run(createState(14, spec), 1200), b = load(save(a)).state; run(a, 1200); run(b, 1200); assert.equal(JSON.stringify({ ...a, fx: [] }.ds), JSON.stringify(b.ds)); });
