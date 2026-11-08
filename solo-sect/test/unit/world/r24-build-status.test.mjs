import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY } from '../../../src/data.mjs';
import { stalledSiteHtml } from '../../../src/build-status.mjs';

test('24a 缺石一日未動：工地說出缺料、每個可做工者的當下理由與現有指派入口', () => {
  const site = { need: { stone: 4 }, delivered: { stone: 1 }, reserved: { stone: 0 }, work: 0, paused: false };
  const s = { t: 0, ds: [
    { name: '阿青', adult: true, hp: 100, role: 'inner', task: { act: 'train' }, why: [{ why: '想練：基本拳' }] },
    { name: '小石', adult: true, hp: 100, role: 'laborer', task: { act: 'chop' }, why: [{ why: '今日日課先劈柴' }] },
    { name: '幼童', adult: false, hp: 100, role: 'inner' },
  ] };
  const seen = new WeakMap();
  assert.equal(stalledSiteHtml(s, site, seen), '');
  s.t = DAY - 1; assert.equal(stalledSiteHtml(s, site, seen), '');
  s.t = DAY; const html = stalledSiteHtml(s, site, seen);
  for (const text of ['缺石 3', '阿青', '想練：基本拳', '小石', '今日日課先劈柴', '職責／優先設定']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('幼童'));
  site.delivered.stone = 2; assert.equal(stalledSiteHtml(s, site, seen), '');
});
