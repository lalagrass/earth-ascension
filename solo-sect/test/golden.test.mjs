// R0（#388）行為鎖定（quick 層）：新局 4 種情境 × 種子 1001 × 10 日，以及 6 份舊版存檔讀入回放。
// 不符時：若是重構，表示行為變了，要找出原因；若是有意改規則，跑 `node tools/golden.mjs --write --tier quick`（及 full／saves）
// 並在 PR 寫明哪些鍵改了、為什麼。完整矩陣（8 種子 × 30 日）用 `node tools/golden.mjs --check`，重構 PR 必跑。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { casesOf, runCase, replaySave } from './golden/scenarios.mjs';

const G = new URL('./golden/', import.meta.url), read = (f) => JSON.parse(fs.readFileSync(new URL(f, G), 'utf8'));
const quick = read('quick.json').runs, saves = read('saves.json');

for (const c of casesOf('quick')) test(`golden quick：${c.key}`, () => assert.deepEqual(runCase(c), quick[c.key]));

for (const f of Object.keys(saves)) test(`golden 存檔回放：${f}`, () => {
  assert.deepEqual(replaySave(fs.readFileSync(new URL(`saves/${f}`, G), 'utf8')), saves[f]);
});

test('golden 檔案與情境表一致（沒有漏跑或多出來的格子）', () => {
  assert.deepEqual(Object.keys(quick).sort(), casesOf('quick').map((c) => c.key).sort());
  assert.deepEqual(Object.keys(read('full.json').runs).sort(), casesOf('full').map((c) => c.key).sort());
  assert.deepEqual(Object.keys(saves).sort(), fs.readdirSync(new URL('saves/', G)).filter((f) => f.endsWith('.json')).sort());
});
