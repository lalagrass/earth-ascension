#!/usr/bin/env node
// R5／R6 #523 C：固定 12 種子；C 數字只報告，不校準常數。
import { createState, tick, rand } from '../src/sim.mjs';
import { foundHermitageSect } from '../src/sect.mjs';
import { startMapBout, stepMapBout } from '../src/exp-map-combat.mjs';
import { DAY } from '../src/data.mjs';

const days = Number(process.argv.find(a => a.startsWith('--days='))?.slice(7) || 30);
const seeds = Array.from({ length: 12 }, (_, i) => 1001 + i);
const start = seed => createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, hermitage: true,
  partner: seed % 2 ? 'xiaolongnv' : 'huangrong', starterArt: seed % 2 ? 'chunyangFist' : 'luohanHands' });
function bout(seed, paired) {
  const s = start(seed); s.ds[1].arts.tianluoPalm = { xp: 25 }; foundHermitageSect(s, 'dualHall');
  const [h, p] = s.ds; h.arts.quanzhenSword = { xp: 25 }; p.arts.yunvSword = { xp: 25 };
  h.moves = ['qz1']; p.moves = ['ys1'];
  const team = paired ? [h, p] : [h], owner = { team: team.map(d => d.id), n: 0, encN: 0 };
  const B = startMapBout(s, owner, 'bandit', { id: 'foot', from: 0, scale: 1 }, team, [150, 100], [0, 100]);
  B.foes[0].pos = [150, 100]; h.pos = [126, 100]; p.pos = [174, 100];
  let result = null;
  for (let n = 0; n < 90 / .25 && !result; n++) { s.t += .25; result = stepMapBout(s, owner, .25, { rand, guardOf: () => 1 }); }
  return { won: !!result?.won, result, hp: team.map(d => +d.hp.toFixed(2)) };
}
const rows = [];
for (const seed of seeds) {
  const s = start(seed), h = s.ds[0], firstCliffDay = { cliff1: null, cliff2: null, cliff3: null };
  for (let n = 0; n < days * DAY / .25; n++) {
    if (s.alert) s.alert = null;
    tick(s, .25);
    if (Object.hasOwn(firstCliffDay, h.at) && firstCliffDay[h.at] === null) firstCliffDay[h.at] = s.day;
  }
  rows.push({ seed, firstCliffDay, solo: bout(seed, false), duo: bout(seed, true) });
}
const wins = mode => rows.filter(r => r[mode].won).length;
console.log(JSON.stringify({ days, dt: .25, alertPolicy: 'acknowledged before next tick', scope: 'no player orders for cliff days; fixed opposing-side map bout for duo C',
  wins: { solo: wins('solo'), duo: wins('duo') }, firstCliffReached: Object.fromEntries(['cliff1', 'cliff2', 'cliff3'].map(id => [id, rows.filter(r => r.firstCliffDay[id] !== null).length])), rows }, null, 2));
