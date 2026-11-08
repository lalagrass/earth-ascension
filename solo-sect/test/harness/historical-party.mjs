// Explicit cast for tests of older mechanics. Live N50 starts with ordinary people;
// these tests need their original named actors to exercise the historical scenario.
import { createState as currentState } from '../../src/sim.mjs';
import { DISCIPLES, HEROES, HERO_SECT, OPENING_SCENARIOS } from '../../src/data.mjs';
import { mkComp, mainSub } from '../../src/hero.mjs';
import { seedArts } from '../../src/arts.mjs';
import { sectInit } from '../../src/sect.mjs';
import { TRAINING_HISTORY } from '../../src/practice.mjs';
import { join as liveJoin, makeXiaCandidate } from '../../src/wuxia.mjs';

export function createState(seed = 1, spec = null) {
  // The retired opening no longer exists in production. Build the three actors
  // explicitly for historical mechanics tests, then place them after founding.
  const opening = { ...OPENING_SCENARIOS.solo, initialDisciples: 3 };
  const s = currentState(seed, { ...spec, opening });
  s.hermitage.active = false; s.hermitage.founded = true;
  if (spec?.kind === 'template') {
    const T = HEROES.find((h) => h.id === spec.id);
    if (!T) throw new Error(`unknown historical test actor: ${spec.id}`);
    const H = { kind: 'template', id: T.id, name: T.name, stats: { ...T.stats }, values: { ...T.values }, personality: [...T.personality], hidden: null, lore: T.lore, sealed: !!T.sealed, arc: T.arc };
    [H.main, H.sub] = mainSub(H.values);
    const h = s.ds[0], st = H.stats;
    Object.assign(h, { name: H.name, classic: true, portrait: `assets/portraits/${T.id}.png`, style: T.style, wu: st.wu, root: H.sealed ? 1 : st.gen, ding: st.ding, values: H.values, wexin: 0, personality: H.personality, known: H.personality.slice(0, 2), traits: H.personality.includes('diligent') ? { diligent: 1.2 } : {} });
    h.skills.strength = 4 + st.li * 3; h.skills.agility = 4 + st.shen * 3; seedArts(h);
    s.hero = { ...H, fu: st.fu, askMajor: spec.askMajor ?? true, arcStep: 0, sect24: spec.sect24 || HERO_SECT[T.id] };
    s.encExclude = [T.id]; s.choices = [];
    if (T.coinMul) s.res.coin *= T.coinMul;
    sectInit(s);
  }
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
