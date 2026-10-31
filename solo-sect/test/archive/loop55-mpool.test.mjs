// loop55：殘譜指點（s.mpool，預設勾選）：高人無武學可傳時改留殘譜，替前置武學加經驗
// loop59：改成直接呼叫 masterOutcome 的單元測試（長跑版在框架改成全自動玩家後太慢）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../src/sim.mjs';
import { masterOutcome, JHEV } from '../../src/jianghu.mjs';
import { ARTS } from '../../src/data.mjs';
import { reqMissing, fits, learnArt } from '../../src/arts.mjs';
import { RULES } from '../../src/start-ui.mjs';
test('規則轉正（loop143）：mpool 在 v2.2 底層規則', async () => { const { BASELINE_V22 } = await import('../../src/sim.mjs'); assert.equal(BASELINE_V22.mpool, true); });
/* 造一個「沒有可傳武學、但有一套只差前置」的弟子：除了目標與其前置外，所有非秘傳武學都標成已會 */
function setup(mpool) {
  const s = createState(1, { kind: 'custom', answers: Array(9).fill(0), jhev: true, mpool }); s.jhev = { m: 0, l: 0, lw: 0, mNext: 0, lNext: 0 };
  const d = s.ds.find((x) => Object.keys(x.arts || {}).length); const X = ARTS.find((x) => !x.secret && x.req.length && fits(d, x) && !d.arts[x.id] && x.req.every((q) => true));
  for (const q of X.req) if (!d.arts[q.art]) learnArt(d, q.art, 0); for (const q of X.req) d.arts[q.art].xp = 0;
  for (const a of ARTS) if (!a.secret && a.id !== X.id && !d.arts[a.id]) learnArt(d, a.id, 0);
  assert.ok(reqMissing(d, X).length); return { s, d, X };
}
test('開：留殘譜，前置武學加經驗、日誌可見；關：不留', () => {
  const on = setup(true), xp0 = on.X.req.reduce((a, q) => a + on.d.arts[q.art].xp, 0); masterOutcome(on.s, on.d, true);
  assert.equal(on.s.jhev.pg, 1); assert.ok(on.X.req.reduce((a, q) => a + on.d.arts[q.art].xp, 0) > xp0); assert.ok(on.s.log.some((l) => l.msg.includes('殘譜')));
  const off = setup(false); masterOutcome(off.s, off.d, true); assert.ok(!off.s.jhev.pg);
  assert.equal(JHEV.master.xp, 8);
});
