import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createState } from '../../harness/historical-party.mjs';
import { canRecruit } from '../../../src/sim.mjs';
import { RUMOR_KINDS } from '../../../src/rumors.mjs';

test('24b 每種傳聞都有正式產生處；收徒提示只列當下可做的行動', () => {
  const sources = ['economy', 'sect', 'threat', 'rare-search'].map(name => fs.readFileSync(new URL(`../../../src/${name}.mjs`, import.meta.url), 'utf8')).join('\n');
  for (const kind of Object.keys(RUMOR_KINDS)) assert.match(sources, new RegExp(`recordRumor\\(s,\\s*'${kind}'`), kind);
  const s = createState(17); s.res.coin = 100;
  assert.match(canRecruit(s).why, /尚無符合處境的人/);
  assert.deepEqual(canRecruit(s).levers.map(l => l.id), ['school']);
  s.res.coin = 0; assert.deepEqual(canRecruit(s).levers, [], '沒錢不能派義學');
  s.choices.push({ sect: 'huiwu' });
  assert.deepEqual(canRecruit(s).levers.map(l => l.id), ['tournament'], '只有當前待決的會武可提示');
});
