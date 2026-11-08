import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../../src/sim.mjs';
import { DAY } from '../../../src/data.mjs';
import { jhStep, jhResolve, visitorEligible, visitorReason, VISITOR_INCIDENTS } from '../../../src/jianghu.mjs';

test('N51 登門須有狀態理由與來犯點數，應戰後才在地圖逐招分勝負', () => {
  const s = createState(17, { kind: 'custom', hermitage: true, opening: 'solo', askMajor: false });
  s.hermitage.active = false; s.hermitage.founded = true;
  s.day = 8; s.t = 7 * DAY; s.res.coin = 2000;
  for (let i = 1; i < 4; i++) s.ds.push({ ...s.ds[0], id: `visitor-fixture-${i}`, pos: [...s.ds[0].pos] });
  const row = VISITOR_INCIDENTS.find(x => x.id === 'dfbb');
  assert.equal(visitorReason(s, row), null);
  assert.equal(visitorEligible(s, row), false, '沒殘頁且名聲未到正殿，不登門');
  jhStep(s, .25, { rand: () => .5 });
  assert.equal(s.choices.some(x => x.jh === 'dfbb'), false);
  s.rep = 60;
  s.day = 9; s.t += DAY;
  assert.equal(visitorEligible(s, row), true, '同一威脅點數夠格，且名聲有明確理由');
  jhStep(s, .25, { rand: () => .5 });
  const ch = s.choices.find(x => x.jh === 'dfbb');
  assert.match(ch.text, /名聲/);
  jhResolve(s, ch, 0, { rand: () => .5 });
  const B = s.jh.visitor?.bout;
  assert.ok(B && B.near && B.foes.length === 1);
  assert.equal(s.jh.dfbb, 0, '選擇應戰當下不得骰出勝負');
  for (let i = 0; i < 400 && s.jh.visitor?.bout; i++) {
    s.t += .25; jhStep(s, .25, { rand: () => .5 });
  }
  assert.ok(B.exchanges > 0, '訪客與門人真正在地圖交手');
  assert.equal(s.ds.some(d => d.id === 'dongfangbubai'), false, '成年訪客不能當作弟子招收');

});
