/* loop122 造詣邊際遞減（s.growdr，預設勾選、需 grow；只動投入型，里程碑不變） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/start-ui.mjs';
import { settleGrowth, GROW } from '../src/arts.mjs';
import { ARTS } from '../src/data.mjs';
import { createState } from '../src/sim.mjs';
import { save, load } from '../src/save.mjs';
const A = (id) => ARTS.find((a) => a.id === id);
const mk = (dr, e) => ({ gdr: dr ? 1 : 0, arts: { basicFist: { xp: 60, gm: { e, ms: 1 } }, pushPalm: { xp: 10, gm: { e: 0, ms: 0 } } } });
const train = (d) => settleGrowth(d, A('pushPalm'), d.arts.pushPalm, { src: 'train', raw: 5, xp0: 10, xp1: 11 }).quanzhang ?? 0;
test('規則轉正（loop143）：growdr 在 v2.2 底層規則', async () => { const { BASELINE_V22 } = await import('../src/sim.mjs'); assert.equal(BASELINE_V22.growdr, true); });
test('造詣 0 時不變；造詣越高增量越少，比例符合公式', () => {
  assert.equal(train(mk(true, 0)), train(mk(false, 0)));
  const off = train(mk(false, 20)), on = train(mk(true, 20)); assert.ok(on < off);
  assert.ok(Math.abs(on - off / (1 + 20 * GROW.dr)) < 1e-9);
});
test('里程碑（衝關）不遞減', () => {
  const a = mk(true, 20), b = mk(false, 20);
  const f = (d) => settleGrowth(d, A('pushPalm'), d.arts.pushPalm, { src: 'break', stage: 1 }).quanzhang;
  assert.equal(f(a), f(b));
});
test('接線：開局設 d.gdr；只勾它（沒成長分層）不生效；舊檔關閉', () => {
  const sp = (x) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...x });
  const s = createState(3, sp({ grow: true, growdr: true }));
  assert.ok(s.growdr); assert.ok(!createState(3, sp({ growdr: true })).growdr);
  assert.ok(load(save(s)).state.growdr); assert.ok(!load(save(createState(3, sp({ grow: true })))).state.growdr);
});
