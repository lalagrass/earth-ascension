// Explicit cast for tests of older mechanics. Live N50 starts with ordinary people;
// these tests need their original named actors to exercise the historical scenario.
import { createState as currentState } from '../../src/sim.mjs';
import { DISCIPLES } from '../../src/data.mjs';
import { mkComp } from '../../src/hero.mjs';
import { seedArts } from '../../src/arts.mjs';
import { TRAINING_HISTORY } from '../../src/practice.mjs';
import { join as liveJoin, makeXiaCandidate } from '../../src/wuxia.mjs';

export function createState(seed = 1, spec = null) {
  const s = currentState(seed, spec);
  for (let i = 1; i <= 2; i++) {
    const d = s.ds[i], old = DISCIPLES[i];
    Object.assign(d, {
      id: old.id, name: old.name, root: old.root, wu: old.root,
      style: old.style, personality: [...old.personality], known: old.personality.slice(0, 1),
      adult: old.adult, fem: !!old.fem, sprite: old.sprite,
      traits: { ...old.traits }, skills: { ...old.skills },
      moves: ['fist'], arts: {}, bare: false, companion: false,
      portrait: null, originRelation: null, originRelationKind: null,
    });
    seedArts(d);
  }
  const id = (part) => part === 'origin-1' ? 'senior' : part === 'origin-2' ? 'cousin' : part;
  s.rel = Object.fromEntries(Object.entries(s.rel).map(([k, v]) => [k.split('|').map(id).sort().join('|'), v]));
  s.aff = Object.fromEntries(Object.entries(s.aff).map(([k, v]) => [k.split('>').map(id).join('>'), v]));
  if (s.hero) { s.hero.companion = null; s.hero.companions = []; }
  if (spec?.companion) {
    const d = mkComp(spec.companion, s.ds.length);
    s.ds.push(d);
    s.hero.companion = d.id;
    s.hero.companions = [d.id];
    s.encExclude.push(d.id);
    s.aff[`hero>${d.id}`] = 45;
    s.aff[`${d.id}>hero`] = 45;
  }
  return s;
}

// Older story tests arrange a sect able to house and teach the visiting actor.
// The actual N50 admission formula still decides whether the guest joins.
export function prepareHistoricalAdmission(s, guest) {
  s.res.food = Math.max(200, s.res.food);
  s.fac.dorm.stage = Math.max(2, s.fac.dorm.stage);
  const candidate = makeXiaCandidate(s, guest);
  s.ds[0].skills.palm = Math.max(s.ds[0].skills.palm, 2 * candidate.skills.palm);
  prepareHistoricalMentor(s);
  s.aff[`${guest}>hero`] = Math.max(45, s.aff[`${guest}>hero`] || 0);
  return s;
}

export function prepareHistoricalMentor(s) {
  for (const d of s.ds) {
    d.practice ||= { hands: {}, eyes: {}, origin: {} };
    for (const move of ['bodyPunch', 'bodyPush', 'bodyGrab', 'bodyKick']) d.practice.hands[move] = Math.max(TRAINING_HISTORY.at(-1).uses, d.practice.hands[move] || 0);
    d.timeToday = { day: s.day, elapsed: 600, free: 500, guided: 0 };
    d.timePrev = { day: s.day - 1, elapsed: 600, free: 500, guided: 0 };
  }
  return s;
}

export function historicJoin(s, guest) {
  prepareHistoricalAdmission(s, guest);
  return liveJoin(s, guest);
}
