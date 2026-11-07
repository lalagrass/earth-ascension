import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, canRecruit, canFoundHermitageSect, queueHermitageFounding, foundHermitageSect, setOrder } from '../../../src/sim.mjs';
import { artById, ownLineageArt } from '../../../src/arts.mjs';
import { sectBiasMul, DAY } from '../../../src/data.mjs';
import { E as econOf, UPKEEP } from '../../../src/economy.mjs';
import { assignDiscipleHall, sectRecruit, twinSwordsDamageFactor } from '../../../src/sect.mjs';

const hermit = (partner = 'xiaolongnv', starterArt = 'chunyangFist') => createState(42, { kind: 'custom', answers: Array(9).fill(0), askMajor: true, hermitage: true, partner, starterArt });

test('Phase 7：固定武道里程碑出三選一卡，雙堂開山保留雙脈正宗與十日俸期', () => {
  const s = hermit(), h = s.ds.find(d => d.id === 'hero'), p = s.ds.find(d => d.id === 'partner-xln');
  assert.equal(canRecruit(s).ok, false);
  assert.equal(canFoundHermitageSect(s).ok, false);
  h.arts.quanzhenXinfa = { xp: 25 }; h.arts.jinyanStep = { xp: 25 }; p.partnerStage = 2;
  assert.equal(canFoundHermitageSect(s).martial, true);
  assert.equal(queueHermitageFounding(s).ok, true);
  assert.deepEqual(s.choices.find(c => c.sect === 'hermitageFounding').opts.length, 3);
  assert.equal(s.choices.find(c => c.sect === 'hermitageFounding').forcePrompt, true);
  s.day = 17; s.t = 16 * DAY;
  const rep = s.rep, result = foundHermitageSect(s, 'dualHall');
  assert.equal(result.ok, true); assert.equal(s.hermitage.active, false); assert.equal(s.hermitage.foundedDay, 17);
  assert.equal(s.sect.id, 'zhongnan'); assert.equal(s.sect.plaque, '終南山・雙劍山莊');
  assert.equal(econOf(s).graceUntil, 17 + UPKEEP.graceDay); assert.equal(s.rep, rep + 10);
  assert.equal(s.herbalDiet, true); assert.equal(s.choices.some(c => c.sect === 'hermitageFounding'), false);
  for (const id of ['chunyangFist', 'quanzhenXinfa', 'quanzhenSword', 'tianluoPalm', 'yunvJian', 'yunv']) {
    const a = artById(id); assert.equal(ownLineageArt(h, a), true, id); assert.equal(ownLineageArt(p, a), true, id);
    assert.equal(sectBiasMul(h, a)[1], 1, id);
  }
  const yin = { ...structuredClone(h), id: 'new-yin', wu: 5, root: 2, personality: ['gentle'], arts: {}, role: 'outer' };
  const yang = { ...structuredClone(h), id: 'new-yang', wu: 2, root: 5, personality: ['honest'], arts: {}, role: 'outer' };
  s.ds.push(yin, yang); sectRecruit(s, yin); sectRecruit(s, yang);
  assert.equal(yin.hall, 'yin'); assert.equal(yin.master, p.id); assert.equal(yang.hall, 'yang'); assert.equal(yang.master, h.id);
  assert.equal(s.sect.firstDiscipleId, yin.id);
  h.arts.quanzhenSword = { xp: 25 }; p.arts.yunvSword = { xp: 25 };
  h.task = { act: 'defend' }; p.task = { act: 'defend' }; h.at = p.at = 'veg'; s.band = {};
  assert.equal(twinSwordsDamageFactor(s, h, 'qz1'), 1.35);
  assert.equal(twinSwordsDamageFactor(s, h, 'fist'), 1);
  p.away = true; assert.equal(twinSwordsDamageFactor(s, h, 'qz1'), 1);
  h.skills.agility = 16; assert.equal(setOrder(s, h.id, 'cliffForage1'), true);
});

test('Phase 7：正宗立匾只讓掌門、伴侶、首徒使用秘傳；無名派可自訂匾', () => {
  const s = hermit(); const h = s.ds.find(d => d.id === 'hero'), p = s.ds.find(d => d.id === 'partner-xln');
  assert.equal(foundHermitageSect(s, 'orthodox', { banner: 'partner', plaque: '古墓新脈' }).ok, true);
  assert.equal(s.sect.id, 'gumu'); assert.equal(s.sect.plaque, '古墓新脈');
  assert.ok(s.sect.secretLineage.includes('quanzhenXinfa'));
  assert.equal(ownLineageArt(h, artById('quanzhenXinfa')), true);
  const first = { ...structuredClone(h), id: 'first', arts: {}, role: 'outer', personality: [] };
  const later = { ...structuredClone(h), id: 'later', arts: {}, role: 'outer', personality: [] };
  s.ds.push(first, later); sectRecruit(s, first); sectRecruit(s, later);
  assert.equal(ownLineageArt(first, artById('quanzhenXinfa')), true);
  assert.equal(ownLineageArt(later, artById('quanzhenXinfa')), false);
  assert.equal(sectBiasMul(later, artById('quanzhenXinfa'))[1] < 1, true);
  assert.equal(ownLineageArt(later, artById('yunvJian')), true);
  assert.equal(p.hall, 'yin');
  const w = hermit('huangrong', 'luohanHands');
  assert.equal(foundHermitageSect(w, 'dualHall').sect.id, 'longrong');
  const n = hermit(); assert.equal(foundHermitageSect(n, 'wuming', '山林自創派').sect.plaque, '山林自創派');
  assert.equal(n.sect.id, 'wuming');
});
