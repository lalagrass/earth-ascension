// loop55：殘譜指點（s.mpool，預設勾選）：高人無武學可傳時改留殘譜，替前置武學加經驗
// loop59：改成直接呼叫 masterOutcome 的單元測試（長跑版在框架改成全自動玩家後太慢）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../src/sim.mjs';
import { masterOutcome, JHEV } from '../../src/jianghu.mjs';
import { ARTS } from '../../src/data.mjs';
import { reqMissing, fits, learnArt } from '../../src/arts.mjs';
import { RULES } from '../../src/start-ui.mjs';
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
/* 造一個「沒有可傳武學、但有一套只差前置」的弟子：除了目標與其前置外，所有非秘傳武學都標成已會 */
function setup(mpool) {
  const s = createState(1, { kind: 'custom', answers: Array(9).fill(0), jhev: true, mpool }); s.jhev = { m: 0, l: 0, lw: 0, mNext: 0, lNext: 0 };
  const d = s.ds.find((x) => Object.keys(x.arts || {}).length); const X = ARTS.find((x) => !x.secret && x.req.length && fits(d, x) && !d.arts[x.id] && x.req.every((q) => true));
  for (const q of X.req) if (!d.arts[q.art]) learnArt(d, q.art, 0); for (const q of X.req) d.arts[q.art].xp = 0;
  for (const a of ARTS) if (!a.secret && a.id !== X.id && !d.arts[a.id]) learnArt(d, a.id, 0);
  assert.ok(reqMissing(d, X).length); return { s, d, X };
}
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
