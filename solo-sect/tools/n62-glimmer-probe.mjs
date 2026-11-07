// N62 diagnostic only. An ordinary bare disciple repeatedly loses the same
// boar charge while cornered; print the real N35 probability and progress.
import { createState } from '../src/sim.mjs';
import { resolveSwing } from '../src/arts.mjs';
import { restoreSurvivor, COVERS } from '../src/tactics.mjs';
import { TECHNIQUES } from '../src/techniques.mjs';
const s = createState(17, { kind: 'bare', askMajor: false });
const d = s.ds[0]; d.wu = 3; d.pos = [...COVERS[0].stand]; d.skills.agility = 1; d.hp = 40; d.posture = 0;
const boar = restoreSurvivor(s, 'boar', { uid: 'boar-fixed', k: 'boar', hp: 40, max: 40, pos: [d.pos[0] + 50, d.pos[1]], cool: 0, energy: 100, agi: 18 });
const rows = [];
for (let i = 1; i <= 150; i++) {
  // This isolates the learning rule: each bout resumes with the disciple still
  // cornered and exposed. No glimmer, eye or hand history is reset.
  d.posture = 0; d.busyUntil = 0;
  const r = resolveSwing(s, boar, d, () => .999, { move: 'boarCharge', wind: 1 });
  if ([1, 2, 3, 6, 10, 24, 150].includes(i)) rows.push({ hit: i, kind: r.kind, p: r.learning.p, w: r.learning.w, progress: d.glimmer?.progress.dustCast || 0 });
}
const threshold = TECHNIQUES.find(x => x.id === 'dustCast').difficulty / d.wu;
console.log(JSON.stringify({ seed: 17, foe: 'boarCharge', quantile: .999, losses: 150, threshold, known: d.glimmer?.known || [], rows }, null, 2));
