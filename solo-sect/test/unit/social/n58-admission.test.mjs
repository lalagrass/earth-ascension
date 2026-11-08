import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, canRecruit, recruit, canPromote, quotaOf, setRecruitPolicy, foundHermitageSect } from '../../../src/sim.mjs';
import { RECRUIT_POOL, DAY, ROOT, PROMOTE } from '../../../src/data.mjs';
import { E } from '../../../src/economy.mjs';
import { book } from '../../../src/util.mjs';
import { returnFromWork } from '../../../src/recruitment.mjs';
import { BODY_BASE } from '../../../src/starter-combat.mjs';
import { T } from '../../../src/threat.mjs';
import { recordRumor, fameOf, publicRumors } from '../../../src/rumors.mjs';

test('N58 收徒方針、束脩／做工、少年名俠共用入門與師父熟識', () => {
  const mk = () => {
    const s = createState(17, { kind: 'custom', hermitage: true, opening: 'solo' });
    assert.equal(foundHermitageSect(s, 'single').ok, true); s.fac.dorm.stage = 1; s.res.food = 10; s.rep = 100;
    recordRumor(s, 'school', '村中教塾先生', 'village');
    recordRumor(s, 'rescue', '回村的樵夫', 'village');
    recordRumor(s, 'trade', '藥舖掌櫃', 'market');
    const master = s.ds[0];
    master.practice.hands = Object.fromEntries(BODY_BASE.map((id) => [id, 500]));
    master.skills.palm = 100; master.timePrev = { day: 0, elapsed: DAY, free: 400, guided: 0 };
    setRecruitPolicy(s, 'wide');
    return s;
  };
  const fixture = (row) => { const s = mk(); E(s).pool = [{ ...row, school: true }]; return s; };
  const ordinary = fixture(RECRUIT_POOL[0]), youth = fixture(RECRUIT_POOL.find((p) => p.youngHero));
  const a = recruit(ordinary), b = recruit(youth);
  assert.equal(a.ok, true, a.why); assert.equal(b.ok, true, b.why);
  assert.equal(a.d.role, 'outer'); assert.equal(b.d.role, 'outer');
  assert.equal(b.d.youngHero, true); assert.equal(b.d.adult, false);
  assert.deepEqual(Object.keys(b.d.arts), ['basicFist']);
  assert.equal(a.d.boardByWork, false);

  const fee = fixture(RECRUIT_POOL.find((p) => p.id === 'xiaomei'));
  const coins = fee.res.coin;
  assert.equal(canRecruit(fee).offer.kind, 'coin');
  assert.equal(recruit(fee).ok, true);
  assert.equal(fee.res.coin, coins + 3);

  const withWorker = fixture(RECRUIT_POOL[0]);
  setRecruitPolicy(withWorker, 'casual');
  withWorker.ds.push({ id: 'hired-only', role: 'laborer' });
  assert.equal(canRecruit(withWorker).ok, true, '雇工不佔弟子床位與收徒人口上限');

  const work = fixture(RECRUIT_POOL.find((p) => p.id === 'shitou'));
  assert.equal(canRecruit(work).offer.kind, 'work');
  const w = recruit(work); assert.equal(w.ok, true, w.why);
  assert.equal(w.d.boardByWork, true); assert.equal(quotaOf(w.d, work), quotaOf(a.d, ordinary) + 1);

  const noWork = fixture({ ...RECRUIT_POOL[1], id: 'no-work', support: {}, canWork: false });
  assert.equal(canRecruit(noWork).workAway, true);
  const left = recruit(noWork); assert.equal(left.away, true); assert.equal(noWork.recruitment.departures, 1);
  assert.equal(noWork.ds.some((d) => d.id === 'no-work'), false);
  noWork.t += DAY; assert.equal(returnFromWork(noWork).length, 1);
  assert.equal(canRecruit(noWork).offer.kind, 'food');
  assert.equal(recruit(noWork).ok, true);

  const produced = mk(), before = fameOf(produced), heard = publicRumors(produced).length;
  book(produced, 'in', 'wood', 3, 'market'); assert.equal(fameOf(produced), before);
  book(produced, 'in', 'wood', 3, 'work'); assert.equal(fameOf(produced), before, '自產若無外人見證，不會自動變成外界名聲');
  T(produced).won++; assert.equal(publicRumors(produced).length, heard, '只改戰績帳，不能憑空生見聞');
  recordRumor(produced, 'provisions', '山產行商', 'teahouse');
  assert.equal(fameOf(produced), before + 1, '行商真的看見交易後才多一名知情者');
  T(produced).deaths++; assert.equal(fameOf(produced), before + 1, '內部傷亡不直接改傳聞');

  const trainee = w.d; trainee.root = PROMOTE.rootMin; trainee.rootKnown = true;
  trainee.contrib = PROMOTE.contrib; trainee.known = [...trainee.personality];
  for (const d of work.ds) work.aff[`${d.id}>${trainee.id}`] = 0;
  assert.match(canPromote(work, trainee.id).why, /相熟/);
  work.aff[`${work.ds[0].id}>${trainee.id}`] = ROOT.inviteAff;
  assert.equal(canPromote(work, trainee.id).ok, true);

  const closed = mk(), original = new Set(closed.ds.map((d) => d.id));
  setRecruitPolicy(closed, 'closed');
  for (let i = 0; i < 30 * DAY / 0.25; i++) { tick(closed, 0.25); if (canRecruit(closed).ok) recruit(closed); }
  assert.equal(closed.ds.some((d) => !original.has(d.id) && d.role !== 'laborer'), false);
  assert.equal(canRecruit(closed).ok, false);
});
