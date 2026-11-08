// R9 #529：同版隱居存檔可讀；跨版及舊道館存檔只顯示版本不符。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../../src/sim.mjs';
import { load, save } from '../../../src/save.mjs';
import { RULES_VERSION } from '../../../src/data.mjs';

test('唯一隱居局同版存讀原樣，跨版與舊道館拒載', () => {
  const s = createState(3), roundtrip = load(save(s));
  assert.equal(roundtrip.ok, true); assert.equal(roundtrip.state.rules, RULES_VERSION);
  const oldRule = structuredClone(s); oldRule.rules = '4.9';
  assert.deepEqual(load(JSON.stringify(oldRule)), { ok: false, err: '存檔版本不符' });
  const oldStart = structuredClone(s); delete oldStart.hermitage;
  assert.deepEqual(load(JSON.stringify(oldStart)), { ok: false, err: '存檔版本不符' });
});
