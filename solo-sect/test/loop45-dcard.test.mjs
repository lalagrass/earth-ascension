// loop45：弟子卡摘要
import test from 'node:test';
import assert from 'node:assert/strict';
import { dsum } from '../src/panel-ui.mjs';
test('摘要：心情、飽足、精力；低需求示警；可學武學', () => {
  const d = { mood: 62.7, needs: { hunger: 20, energy: 80, social: 10, fun: 90 }, pendingArt: 'pushPalm' };
  const h = dsum(d, (id) => (id === 'pushPalm' ? '推山掌' : id));
  assert.match(h, /心情 62/); assert.match(h, /飽足 20・精力 80/); assert.match(h, /餓、寂寞/); assert.ok(!/累|悶/.test(h)); assert.match(h, /可學：推山掌/);
  assert.ok(!/示警|<b/.test(dsum({ mood: 50, needs: { hunger: 90, energy: 90, social: 90, fun: 90 } })));
});
