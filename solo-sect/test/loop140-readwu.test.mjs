/* loop140 讀書長悟性 readwu（決定 120）：30 次研讀悟性 +1，每人一次、上限 5；接線；舊檔關閉 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { save, load } from '../src/save.mjs';
import { READWU, readStudy, readwuNote } from '../src/readwu.mjs';
import { ALL_ON } from './harness/bot.mjs';
const spec = (o = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, ...o });
test('30 次才 +1；只一次；5 不再升', () => {
  const s = { readwu: true }, d = { wu: 3 }; for (let i = 0; i < READWU.need - 1; i++) assert.equal(readStudy(s, d), null); assert.equal(d.wu, 3);
  assert.equal(readStudy(s, d), 4); for (let i = 0; i < 200; i++) readStudy(s, d); assert.equal(d.wu, 4); assert.equal(d.rwDone, true);
  const e = { wu: 5 }; for (let i = 0; i < 40; i++) readStudy(s, e); assert.equal(e.wu, 5);
  const f = { root: 2 }; for (let i = 0; i < 30; i++) readStudy(s, f); assert.equal(f.wu, 3);
});
test('關閉時什麼都不記', () => { const d = { wu: 3 }; for (let i = 0; i < 50; i++) readStudy({}, d); assert.deepEqual(d, { wu: 3 }); assert.equal(readwuNote({}, d), ''); });
test('顯示：研讀 x/30 → 讀書已開竅', () => { const s = { readwu: true }, d = { wu: 2 }; assert.equal(readwuNote(s, d), '（研讀 0/30）'); for (let i = 0; i < 30; i++) readStudy(s, d); assert.equal(readwuNote(s, d), '（讀書已開竅）'); });
test('接線：開 → s.readwu；關 → 沒有', () => { assert.equal(createState(71, spec()).readwu, true); assert.equal(createState(71, spec({ readwu: false })).readwu, undefined); });
test('實跑：有藏經閣時會有人研讀累積', () => {
  const s = createState(72, spec()); s.fac.library.stage = 1; for (let i = 0; i < 4 * 600 * 6; i++) tick(s, 0.25); assert.ok(s.ds.some((d) => (d.rw || 0) > 0));
});
test('舊檔沒有 readwu → 讀入維持關閉', () => {
  const s = createState(73, spec()), o = JSON.parse(save(s)); delete o.readwu; const r = load(JSON.stringify(o)); assert.ok(r.ok); assert.equal(r.state.readwu, undefined);
});
