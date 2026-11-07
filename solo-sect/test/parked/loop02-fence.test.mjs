// Parked after T1 CI failure; original assertion(s) retained verbatim: 山賊迎戰（沒築柵）：仍是原本一次結算、照舊損失（有柵的地圖戰見 loop03）; tracked in #496.
// loop2 M2：菜園木柵——耐久、野豬／山賊先打柵、自主修柵
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, scoreActs } from '../../src/sim.mjs';
import { DAY } from '../../src/data.mjs';
import { FENCE, buildFence, canBuildFence, repairScore } from '../../src/threat.mjs';
import { T, raidResolve } from '../../src/threat.mjs';

const H = { think: () => {} };
const run = (s, secs) => { for (let i = 0; i < secs / 0.25; i++) tick(s, 0.25); };
const logs = (s) => (s.log || []).map((x) => (typeof x === 'string' ? x : x.msg || x.text || JSON.stringify(x))).join('\n');
const bandit = (s, pts = 80) => { T(s).pending = { n: 1, pts, demand: 999, p: 0, at: s.t, until: s.t + 999, day: s.day }; return raidResolve(s, 1, H); };

test('山賊迎戰（沒築柵）：仍是原本一次結算、照舊損失（有柵的地圖戰見 loop03）', () => {
  const c = createState(1); c.day = 20; c.res.coin = 100; c.res.food = 50; const r3 = bandit(c);
  assert.equal(r3.win, false); assert.equal(c.band, undefined); assert.ok(c.res.coin < 100);
});
