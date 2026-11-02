/* loop97 熟練度十重說明：數字取自實際參數 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { profRulesHtml, growthHtml } from '../../src/panel-ui.mjs';
import { PROF } from '../../src/arts.mjs';
import { TIERS, BREAK } from '../../src/data.mjs';
import { createState } from '../../src/sim.mjs';
test('說明與參數一致', () => { const h = profRulesHtml(); assert.ok(h.includes(`+${(PROF.perLv * 100).toFixed(1)}%`)); for (const [x, n] of TIERS) { assert.ok(h.includes(n)); assert.ok(h.includes(String(x))); } for (const c of BREAK.caps) assert.ok(h.includes(String(c))); assert.match(h, /data-keep="prof-rules"/); assert.match(h, /不影響門派戰力/); });
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
