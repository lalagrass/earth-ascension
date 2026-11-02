/* loop133 舊版存檔相容。#390 起舊檔讀入即升到現行規則（擁有人 2026-11-02 決定），所以改驗：讀入後兩條借鏡規則已開、跑 2 日不出錯 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tick } from '../../src/sim.mjs';
import { load } from '../../src/save.mjs';
import { threatHtml } from '../../src/threat.mjs';
import { laborNote } from '../../src/panel-ui.mjs';
const FIX = new URL('../fixtures/', import.meta.url);
const files = fs.readdirSync(FIX).filter((f) => /^v[\d.]+\.json$/.test(f));
test('至少有 6 個舊版存檔', () => assert.ok(files.length >= 6, files.join(',')));
for (const f of files) test(`${f}：讀入後兩條借鏡規則已開（#390）`, () => {
  const r = load(fs.readFileSync(new URL(f, FIX), 'utf8')); assert.ok(r.ok, f); const s = r.state;
  for (let i = 0; i < 2 * 4 * 60 * 2; i++) tick(s, 0.25);
  assert.equal(typeof s.valor, 'number'); assert.ok(s.ds.every((d) => typeof laborNote(s, d) === 'string'));
  assert.match(threatHtml(s), /勇名/);
});
