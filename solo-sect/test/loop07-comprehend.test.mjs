import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { COMP, comprehend, compProgress } from '../src/comprehend.mjs';
import { ARTS } from '../src/data.mjs';

const sp = (o = {}) => ({ kind: 'custom', name: '測', answers: Array(9).fill(0), ...o });
const run = (s, days) => { for (let i = 0; i < 240 * days; i++) tick(s, 6); return s; };
const nop = () => {};
const learned = (s) => s.ds.reduce((n, d) => n + Object.keys(d.arts).length, 0);

test('loop7 預設關閉', () => { assert.equal(createState(4).wu7, undefined); assert.equal(createState(4, sp({ comprehend: true })).wu7, true); });
test('loop7 關閉時 comprehend 不動', () => { const s = createState(4); const d = s.ds[0]; assert.equal(comprehend(s, d, 'train', null, nop, nop), null); assert.equal(d.comp, undefined); });
test('loop7 悟性高悟得快、達門檻即學會', () => {
  const s = createState(4, sp({ comprehend: true })); const d = s.ds.find((x) => x.pendingArt) || s.ds[0];
  if (!d.pendingArt) return; const id = d.pendingArt;
  const lo = { ...d, wu: 1, comp: {} }, hi = { ...d, wu: 5, comp: {} };
  comprehend(s, lo, 'train', null, nop, nop); comprehend(s, hi, 'train', null, nop, nop);
  assert.ok((hi.comp[id] || 0) > (lo.comp[id] || 0));
  let n = 0; while (!d.arts[id] && n++ < 500) comprehend(s, d, 'meditate', null, nop, nop);
  assert.ok(d.arts[id], '應自悟'); assert.ok(!(d.comp || {})[id]);
});
test('loop7 切磋觀摩可偷師對手會的功夫', () => {
  const s = createState(4, sp({ comprehend: true })); const [a, b] = s.ds;
  const art = ARTS.find((x) => !x.secret && !x.req.length && !a.arts[x.id]); if (!art) return;
  b.arts[art.id] = { xp: 50, last: 0 }; a.pendingArt = null;
  let n = 0; while (!a.arts[art.id] && n++ < 500) comprehend(s, a, 'spar', b, nop, nop);
  assert.ok(a.arts[art.id]);
});
test('loop7 開啟跑 5 天：多學到功夫、有頓悟日誌', () => {
  let on = 0, off = 0, ep = 0;
  for (const seed of [1, 2, 3]) { const A = run(createState(seed, sp({ comprehend: true })), 5), B = run(createState(seed, sp()), 5); on += learned(A); off += learned(B); ep += A.log.filter((l) => /悟/.test(l.msg)).length; }
  assert.ok(on >= off); assert.ok(ep > 0);
});
test('loop7 進度顯示', () => assert.deepEqual(compProgress({}), []));
