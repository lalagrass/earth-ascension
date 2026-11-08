import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, canRecruit, recruit, setRecruitPolicy } from '../../../src/sim.mjs';
import { RECRUIT_POOL, DAY, RULES_VERSION } from '../../../src/data.mjs';
import { E } from '../../../src/economy.mjs';
import { BODY_BASE } from '../../../src/starter-combat.mjs';
import { availableAdmissionWork, bookAdmissionWork, returnFromWork, supportOffer } from '../../../src/recruitment.mjs';

test('N58 小修：當日真工作格用完，無束脩者下山做工後帶糧回來', () => {
  const s = createState(17, { kind: 'custom', hermitage: true, opening: 'solo' });
  s.hermitage.active = false; s.hermitage.founded = true; s.fac.dorm.stage = 1; s.res.food = 10; s.rep = 100;
  s.ds[0].practice.hands = Object.fromEntries(BODY_BASE.map((id) => [id, 500]));
  s.ds[0].skills.palm = 100; s.ds[0].timePrev = { day: 0, elapsed: DAY, free: 400, guided: 0 };
  setRecruitPolicy(s, 'wide');
  const candidate = { ...RECRUIT_POOL[0], adult: true, support: {}, school: true };
  E(s).pool = [candidate];
  const first = availableAdmissionWork(s);
  assert.equal(first, 'plot:0');
  bookAdmissionWork(s, first);
  assert.equal(availableAdmissionWork(s), 'plot:1', '同一天不可拿同一格承諾兩次');
  s.resv ??= {};
  for (let i = 0; i < s.plots.length; i++) s.resv[`plot:${i}`] = s.ds[0].id;
  s.res.wood = s.cap.wood; s.res.stone = s.cap.stone;
  assert.equal(supportOffer(s, candidate), null);
  assert.equal(canRecruit(s).workAway, true);
  assert.equal(recruit(s).away, true);
  assert.equal(s.recruitment.departures, 1);
  s.t += DAY; s.day++;
  returnFromWork(s);
  assert.equal(supportOffer(s, candidate).kind, 'food');

});
