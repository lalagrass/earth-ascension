import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, clone } from '../../../src/sim.mjs';
import { T, threatDaily, threatStep, raidPhase, RAID_RHYTHM } from '../../../src/threat.mjs';

test('N43 喘息期不排大威脅、餘黨順延；來犯期至多兩次', () => {
  const s = createState(17, { kind: 'bare', askMajor: false });
  while (s.ds.length < 4) { const d = clone(s.ds[0]); d.id = `guard${s.ds.length}`; s.ds.push(d); }
  s.res.coin = 1000;
  const X = T(s); X.adapt = 0.6; X.next = 15; X.boss = { day: 15, state: 'wait' };
  assert.equal(raidPhase({ day: 14 }).id, 'pressure');
  assert.equal(raidPhase({ day: 15 }).id, 'respite');
  s.day = 15; threatDaily(s);
  assert.equal(X.pending, null);
  assert.equal(X.next, 17);
  assert.equal(X.boss.day, 17);
  assert.ok(X.adapt > 0.6, '適應係數仍逐日恢復');
  X.wave = { at: 0, pts: 80, kind: 'liukou', n: 7, day: 14 };
  threatStep(s);
  assert.equal(X.pending, null, '前一期已排出的第二波在喘息期也不上山');
  X.wave = null;
  s.day = 17; threatDaily(s);
  assert.equal(X.pending?.boss, true);
  assert.equal(X.rhythmStrikes, 1);
  X.pending = null; X.boss.state = 'done'; X.next = 18;
  s.day = 18; threatDaily(s);
  assert.equal(X.pending, null, '兩次大威脅須至少隔原排程最短天數');
  assert.equal(X.next, 21);
  s.day = 21; threatDaily(s);
  assert.ok(X.pending);
  assert.equal(X.rhythmStrikes, RAID_RHYTHM.maxBig);
  X.pending = null; X.next = 22;
  s.day = 22; threatDaily(s);
  assert.equal(X.pending, null);
  assert.equal(X.next, 26);
});
