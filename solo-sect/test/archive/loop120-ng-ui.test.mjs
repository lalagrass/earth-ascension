/* loop120 窄欄「氣 x/y」、提示、二版規則說明、傳聞角落倒數 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { qiStatus, axesOf, QI_AXIS2, growthHtml } from '../../src/panel-ui.mjs';
import { createState } from '../../src/sim.mjs';
const spec = (x = {}) => ({ kind: 'custom', answers: Array(9).fill(0), askMajor: false, neigong: true, ...x });
test('未學內功：氣 0/0；學了：氣 x/y＋減傷提示；力竭標記', () => {
  assert.match(qiStatus({ arts: {}, ng: 1, ng2: 1, qi: 0 }), /氣 0\/0（未學內功）/);
  const d = { arts: { breath: { xp: 30 } }, ng: 1, ng2: 1, qi: 12 };
  const h = qiStatus(d, 0); assert.match(h, /氣 12\/25/); assert.match(h, /減傷 5%/); assert.doesNotMatch(h, /力竭）/);
  d.spentUntil = 10; assert.match(qiStatus(d, 5), /（力竭）/);
});
test('二版用 0–100 的內力軸與二版規則說明；一版不變', () => {
  const s = createState(3, spec({ ngshield: true })), d = s.ds[0];
  assert.equal(axesOf(d).at(-1), QI_AXIS2);
  const h = growthHtml(d, {}, 1, s.t, true); assert.match(h, /護體真氣怎麼算/); assert.match(h, /氣 /); assert.doesNotMatch(h, /內力怎麼算|狩獵出手扣/);
  const v1 = createState(3, spec()).ds[0]; assert.doesNotMatch(growthHtml(v1, {}, 1, 0, true), /內力怎麼算/); /* loop142 一版說明淘汰 */
});
test('角落倒數接線：時鐘列讀 rumorDays', () => { assert.match(readFileSync(new URL('../../src/main.mjs', import.meta.url), 'utf8'), /山賊傳聞：約 \$\{rumorDays\(S\)\} 日/); });
