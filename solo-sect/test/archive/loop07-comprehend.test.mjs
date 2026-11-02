import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../src/sim.mjs';
import { COMP, comprehend, compProgress } from '../../src/arts.mjs';
import { ARTS } from '../../src/data.mjs';

const sp = (o = {}) => ({ kind: 'custom', name: '測', answers: Array(9).fill(0), ...o });
const run = (s, days) => { for (let i = 0; i < 240 * days; i++) tick(s, 6); return s; };
const nop = () => {};
const learned = (s) => s.ds.reduce((n, d) => n + Object.keys(d.arts).length, 0);

// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
test('loop7 悟性高悟得快、達門檻即學會', () => {
  const s = createState(4, sp({ comprehend: true })); const d = s.ds.find((x) => x.pendingArt) || s.ds[0];
  if (!d.pendingArt) return; const id = d.pendingArt;
  const lo = { ...d, wu: 1, comp: {} }, hi = { ...d, wu: 5, comp: {} };
  comprehend(s, lo, 'train', null, nop, nop); comprehend(s, hi, 'train', null, nop, nop);
  assert.ok((hi.comp[id] || 0) > (lo.comp[id] || 0));
  let n = 0; while (!d.arts[id] && n++ < 500) comprehend(s, d, 'meditate', null, nop, nop);
  assert.ok(d.arts[id], '應自悟'); assert.ok(!(d.comp || {})[id]);
});
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
test('loop7 開啟跑 5 天：多學到功夫、有頓悟日誌', () => {
  let on = 0, off = 0, ep = 0;
  for (const seed of [1, 2, 3]) { const A = run(createState(seed, sp({ comprehend: true })), 5), B = run(createState(seed, sp()), 5); on += learned(A); off += learned(B); ep += A.log.filter((l) => /悟/.test(l.msg)).length; }
  assert.ok(on >= off); assert.ok(ep > 0);
});
test('loop7 進度顯示', () => assert.deepEqual(compProgress({}), []));
