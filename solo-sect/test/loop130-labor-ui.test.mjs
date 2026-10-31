/* loop130 勞作練體顯示：開才顯示、數字正確 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { laborNote } from '../src/labor-ui.mjs';
import { DAY } from '../src/data.mjs';
test('關閉不顯示；開啟寫今日勞作與招式倍率', () => {
  assert.equal(laborNote({ t: 0 }, { skills: { strength: 40 } }), '');
  const d = { lg: 1, skills: { strength: 40 }, lgDay: 2, lgGot: 1.25 };
  assert.equal(laborNote({ t: 2 * DAY + 5 }, d), '（勞作今日 1.3/3・招式 ×1.10）'); assert.equal(laborNote({ t: 3 * DAY }, d), '（勞作今日 0.0/3・招式 ×1.10）');
});
