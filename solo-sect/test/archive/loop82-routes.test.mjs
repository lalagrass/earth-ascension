/* loop82 三路線：同有效時間下，分散修練不會比專精拿到更多同類造詣，也不會更快到高階 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
test('三路線同有效時間比較', () => {
  const j = JSON.parse(execFileSync(process.execPath, ['test/harness/diag-routes.mjs', '2', '1001', '300'], { env: { ...process.env, SS_DT: '0.25' }, cwd: new URL('../..', import.meta.url).pathname }).toString()), S = j.summary;
  for (const r of ['spec', 'same', 'cross']) { assert.equal(S[r].done, 2); assert.equal(S[r].train, 300); }
  assert.ok(S.spec.mQ >= S.same.mQ, '同類多門不該刷出更多拳掌造詣');
  assert.ok(S.spec.mQ + S.spec.mT >= S.cross.mQ + S.cross.mT - 0.5, '跨類總造詣不該明顯多於專精');
  assert.ok(S.spec.maxTier >= S.same.maxTier && S.spec.maxTier >= S.cross.maxTier);
  assert.ok(S.cross.mT > 0 && S.spec.mT === 0);
});
