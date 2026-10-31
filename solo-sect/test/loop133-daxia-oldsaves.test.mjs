/* loop133 舊版存檔相容：所有 fixtures 舊檔讀入後，laborgrow／valor 都是關的，跑 2 日也不會被打開，畫面不顯示 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tick } from '../src/sim.mjs';
import { load } from '../src/save.mjs';
import { threatHtml } from '../src/threat.mjs';
import { laborNote } from '../src/panel-ui.mjs';
const FIX = new URL('./fixtures/', import.meta.url);
const files = fs.readdirSync(FIX).filter((f) => /^v[\d.]+\.json$/.test(f));
test('至少有 6 個舊版存檔', () => assert.ok(files.length >= 6, files.join(',')));
for (const f of files) test(`${f}：讀入後兩條借鏡規則維持關閉`, () => {
  const r = load(fs.readFileSync(new URL(f, FIX), 'utf8')); assert.ok(r.ok, f); const s = r.state;
  for (let i = 0; i < 2 * 4 * 60 * 2; i++) tick(s, 0.25);
  assert.ok(!s.laborgrow); assert.equal(s.valor, undefined); assert.ok(s.ds.every((d) => !d.lg && laborNote(s, d) === ''));
  assert.doesNotMatch(threatHtml(s), /勇名/);
});
