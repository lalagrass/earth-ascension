// loop55：殘譜指點（s.mpool，預設勾選）：高人無武學可傳時改留殘譜，替前置武學加經驗
import test from 'node:test';
import assert from 'node:assert/strict';
import { run, seedRange } from './harness/bot.mjs';
import { RULES } from '../src/start-ui.mjs';
test('規則在開局清單且預設勾選', () => { const r = RULES.find((x) => x[0] === 'mpool'); assert.ok(r); assert.equal(r[3], true); });
test('開：會留殘譜（日誌可見）；關：不留。來訪次數不受影響', () => {
  let pg = 0, logs = 0, seen = null;
  for (const seed of seedRange(5, 1001)) {
    const a = run(seed, {}, 60, true, (s) => { if (s.log[0]?.msg.includes('殘譜') && s.log[0] !== seen) { seen = s.log[0]; logs++; } }), b = run(seed, { mpool: false }, 60, true);
    assert.equal(a.jhev.m, b.jhev.m); assert.ok(!b.jhev.pg); pg += a.jhev.pg || 0;
    for (const d of a.ds) for (const r of Object.values(d.arts || {})) assert.ok(r.xp <= 100);
  }
  assert.ok(pg > 0); assert.ok(logs > 0);
});
