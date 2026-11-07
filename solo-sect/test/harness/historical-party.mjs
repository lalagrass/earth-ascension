// Explicit cast for tests of older mechanics. Live N50 starts with ordinary people;
// these tests need their original named actors to exercise the historical scenario.
import { createState as currentState } from '../../src/sim.mjs';
import { DISCIPLES } from '../../src/data.mjs';
import { mkComp } from '../../src/hero.mjs';
import { seedArts } from '../../src/arts.mjs';

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
