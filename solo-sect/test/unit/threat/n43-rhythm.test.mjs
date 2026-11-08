import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, clone } from '../../../src/sim.mjs';
import { T, threatDaily, threatStep, raidPhase, RAID_RHYTHM } from '../../../src/threat.mjs';
import { recordRumor } from '../../../src/rumors.mjs';

test('N43／R8：未傳聞不來犯；每則傳聞只引一夥，餘黨與第二波沿原事件延續', () => {
  const s = createState(17, { kind: 'custom', hermitage: true, opening: 'solo' });
  s.hermitage.active = false; s.hermitage.founded = true;
  while (s.ds.length < 4) { const d = clone(s.ds[0]); d.id = `guard${s.ds.length}`; s.ds.push(d); }
  s.res.coin = 1000;
  const X = T(s); X.adapt = 0.6;
  assert.equal(raidPhase(s).id, 'respite');
  s.day = 10; threatDaily(s);
  assert.equal(X.pending, null, '即使家底與人數足夠，沒有外人見聞也不上門');
  assert.ok(X.adapt > 0.6, '適應係數仍逐日恢復');

  recordRumor(s, 'trade', '藥舖掌櫃', 'market');
  assert.equal(raidPhase(s).id, 'respite', '消息傳開後仍須走完來犯路程');
  s.day = 12; threatDaily(s);
  assert.ok(X.pending, '已傳開的財物消息引來第一夥山賊');
  assert.equal(X.rhythmStrikes, RAID_RHYTHM.maxBig);
  X.pending = null;
  s.day = 14; threatDaily(s);
  assert.equal(X.pending, null, '同一見聞不能重複引來新山賊');

  X.wave = { at: 0, pts: 80, kind: 'liukou', n: 7, day: 12 };
  threatStep(s);
  assert.equal(X.pending?.wave, 2, '敗退者的第二波可由原事件延續，無須另一則見聞');
  X.pending = null; X.wave = null;

  X.boss = { day: 16, state: 'wait' };
  s.day = 16; threatDaily(s);
  assert.equal(X.pending?.boss, true, '剿寨餘黨知道仇家，依既有復仇事件回來');
  X.pending = null; X.boss.state = 'done';

  s.day = 17; recordRumor(s, 'provisions', '山產行商', 'teahouse');
  s.day = 18; threatDaily(s);
  assert.equal(X.pending, null, '負傷後的最短喘息間隔仍有效');
  s.day = 19; threatDaily(s);
  assert.ok(X.pending, '第二則見聞走完路程後可引來另一夥');
});
