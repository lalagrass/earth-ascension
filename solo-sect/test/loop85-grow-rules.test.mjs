/* loop85 規則說明：數字取自實際參數 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rulesHtml } from '../src/panel-ui.mjs';
import { GROW } from '../src/arts.mjs';
import { JH } from '../src/data.mjs';
test('規則說明與參數一致', () => { const h = rulesHtml();
  for (const v of [GROW.k, GROW.src.fight, GROW.pass, GROW.cap[1], GROW.cap[4], GROW.init, GROW.acc.max, GROW.acc.fade, JH.twin]) assert.ok(h.includes(String(v)), String(v));
  assert.match(h, /本版規則/); assert.match(h, /止於小成/); assert.match(h, /<details[^>]*data-keep="grow-rules"/); });
