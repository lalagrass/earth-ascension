import test from 'node:test';
import assert from 'node:assert/strict';
import { recordSocialEvent, fadeSocialThoughts, socialThoughtHtml } from '../../../src/social-thoughts.mjs';

test('被掩護的人記得原因，好感上升且大事不淡去', () => {
  const helper = { id: 'lin', name: '林師姐', adult: true };
  const saved = { id: 'mei', name: '梅師弟', adult: true };
  const s = { day: 1, ds: [helper, saved], aff: {}, rel: {} };
  recordSocialEvent(s, 'covered', helper, saved);
  assert.ok(s.aff['mei>lin'] > 0);
  assert.match(socialThoughtHtml(s, saved), /林師姐替梅師弟攔住了來招/);
  s.day = 100;
  fadeSocialThoughts(s);
  assert.equal(s.aff['mei>lin'], 8);
  assert.match(socialThoughtHtml(s, saved), /銘記/);
});
