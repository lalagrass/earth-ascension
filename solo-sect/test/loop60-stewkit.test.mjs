// loop60：執事顧灶（s.stewkit，預設勾選，需執事自主）
import test from 'node:test';
import assert from 'node:assert/strict';
import { stewardDaily } from '../src/steward.mjs';
import { RULES } from '../src/start-ui.mjs';
const H = { siteOf: () => null, capacity: () => 99, startBuild: () => true };
const S = (o) => ({ steward: true, stewkit: true, ds: Array(8).fill(0), fac: { watch: { stage: 1 }, kitchen: { stage: 0 } }, res: { food: 3 }, log: [], t: 0, ...o });
test('規則轉正（loop143）：併入「執事自動營建」勾選', async () => { const { buildSpec } = await import('../src/start-ui.mjs'); assert.ok(buildSpec({ tab: 'custom', ans: Array(9).fill(0) }).stewkit); });
test('8 人、存飯不夠、露天灶 → 蓋膳房', () => assert.equal(stewardDaily(S({}), H), 'kitchen'));
test('人少、飯夠、已有膳房、規則關或執事關 → 不蓋', () => {
  assert.equal(stewardDaily(S({ ds: Array(7).fill(0) }), H), null); assert.equal(stewardDaily(S({ res: { food: 8 } }), H), null);
  assert.equal(stewardDaily(S({ fac: { watch: { stage: 1 }, kitchen: { stage: 1 } } }), H), null); assert.equal(stewardDaily(S({ stewkit: false }), H), null); assert.equal(stewardDaily(S({ steward: false }), H), null);
});
test('寢舍優先於膳房', () => assert.equal(stewardDaily(S({}), { ...H, capacity: () => 4 }), 'dorm'));
