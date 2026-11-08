import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, foundHermitageSect, setRecruitPolicy } from '../../../src/sim.mjs';
import { admissionStatus } from '../../../src/admission.mjs';
import { BODY_BASE } from '../../../src/starter-combat.mjs';
import { DAY, RECRUIT_POOL } from '../../../src/data.mjs';

test('25c 只聽立匾的安穩人家不來，缺糧者聽見退賊本事會來', () => {
  assert.ok(RECRUIT_POOL.every(row => ['food', 'bed', 'safety'].every(key => key in row.situation)), '五列處境都明寫吃住安全');
  const s = createState(17, { kind: 'custom', hermitage: true, opening: 'solo' });
  assert.equal(foundHermitageSect(s, 'single').ok, true);
  s.fac.dorm.stage = 1;
  s.res.food = 10;
  const master = s.ds[0];
  master.practice.hands = Object.fromEntries(BODY_BASE.map(id => [id, 500]));
  master.timePrev = { day: 0, elapsed: DAY, free: 400, guided: 0 };
  setRecruitPolicy(s, 'wide');
  const base = { id: 'applicant', adult: true, skills: { palm: 2, leg: 2 }, practice: { hands: {} }, support: { food: 3 } };
  const settled = admissionStatus(s, { ...base, situation: { food: 1, bed: 1, safety: 1, autonomy: 1, reason: '有家有田' } }, { kind: 'banner' });
  assert.ok(settled.advantage <= 0, settled.reason);
  assert.equal(settled.ok, false);
  const hungry = admissionStatus(s, { ...base, situation: { food: 0, bed: 0, safety: 0, autonomy: 0, reason: '家裡缺糧' } }, { kind: 'defend' });
  assert.ok(hungry.advantage > 0, hungry.reason);
  assert.equal(hungry.ok, true, hungry.why);
  assert.ok(hungry.utility.status > settled.utility.status, '功夫只由聽到的退賊傳聞推導');
});
