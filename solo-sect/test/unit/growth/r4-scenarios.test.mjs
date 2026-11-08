import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, queueHermitageFounding, foundHermitageSect } from '../../../src/sim.mjs';
import { assignDiscipleHall, applySectLineage } from '../../../src/sect.mjs';
import { affKey } from '../../../src/util.mjs';
import { DAY } from '../../../src/data.mjs';
import { save, load } from '../../../src/save.mjs';

test('R4：獨行只立單脈；情境新增任意人物由已會武學與好感決定道統及師承', () => {
  const spec = { kind: 'custom', hermitage: true, opening: 'solo', answers: Array(9).fill(0) };
  const solo = createState(42, spec);
  assert.deepEqual(solo.ds.map((d) => d.id), ['hero']);
  assert.equal(solo.hermitage.partnerId, undefined);
  assert.equal(solo.hero.companion, undefined);
  assert.equal(queueHermitageFounding(solo, true).ok, true);
  assert.deepEqual(solo.choices.find((c) => c.sect === 'hermitageFounding').doctrines, ['single', 'wuming']);
  assert.equal(foundHermitageSect(solo).sect.id, 'quanzhen');
  assert.equal(solo.sect.doctrine, 'single');
  assert.equal(solo.sect.lineages.yin, null);

  const opening = { initialDisciples: 1, origins: false, supplies: { herb: 2 }, people: [{
    id: 'mountain-guest', name: '山中客', originSect: 'gumu', style: 'palm', adult: true,
    personality: ['gentle'], skills: { herbal: 9, agility: 12 }, arts: { tianluoPalm: 25 }, affinity: 55,
  }] };
  const s = createState(42, { ...spec, opening });
  assert.deepEqual(s.ds.map((d) => d.id), ['hero', 'mountain-guest']);
  assert.equal(s.res.herb, 2);
  assert.equal(queueHermitageFounding(s, true).ok, true);
  assert.deepEqual(s.choices.find((c) => c.sect === 'hermitageFounding').doctrines, ['dualHall', 'orthodox', 'wuming']);
  assert.equal(foundHermitageSect(s, 'dualHall').sect.id, 'zhongnan');
  const pupil = { ...structuredClone(s.ds[0]), id: 'pupil', arts: {}, personality: ['gentle'], role: 'outer', master: null };
  s.ds.push(pupil); applySectLineage(s, pupil);
  s.aff[affKey(pupil.id, 'mountain-guest')] = 0;
  assert.equal(assignDiscipleHall(s, pupil), 'yin');
  assert.equal(pupil.master, null);
  s.aff[affKey(pupil.id, 'mountain-guest')] = 60;
  s.aff[affKey('mountain-guest', pupil.id)] = 60;
  assignDiscipleHall(s, pupil);
  assert.equal(pupil.master, 'mountain-guest');

  const unbannered = createState(1001, { ...spec, opening: 'xiaolongnv' });
  for (let elapsed = 0; elapsed < 30 * DAY; elapsed += 6) { tick(unbannered, 6); if (unbannered.alert) unbannered.alert = null; }
  assert.deepEqual(unbannered.ds.map((d) => d.id), ['hero', 'xiaolongnv'], '受控較粗步長也不應在開山前多出收養門人');

  const prior = JSON.parse(save(createState(17, { ...spec, opening: 'xiaolongnv' })));
  prior.rules = '4.7'; delete prior.hermitage.opening; prior.hermitage.partnerId = 'xiaolongnv';
  const priorResident = prior.ds[1]; priorResident.id = 'partner-xln'; priorResident.partnerStage = 2; priorResident.hermitagePartner = true;
  delete priorResident.awakeningPath; delete priorResident.awakeningStage;
  prior.hero.companion = priorResident.id; prior.aff[affKey('hero', priorResident.id)] = 55;
  const restored = load(JSON.stringify(prior)).state;
  assert.equal(restored.ds[1].id, 'partner-xln', '舊檔人物 id 不改');
  assert.equal(restored.ds[1].awakeningStage, 2);
  assert.equal(restored.ds[1].awakeningPath, 'gumu');
  assert.equal(restored.aff[affKey('hero', 'partner-xln')], 55);
  assert.equal(restored.hermitage.partnerId, undefined);
  assert.equal(restored.hero.companion, undefined);
});
