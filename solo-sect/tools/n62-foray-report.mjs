// N62 natural schedule: same initial sect/spec and 0.25s tick as bot12, 12 fixed seeds.
import { createState, tick } from '../src/sim.mjs';
import { DAY } from '../src/data.mjs';
import { ALL_ON, botDaily } from '../test/harness/bot.mjs';
import { sectOfSeed } from '../test/golden/scenarios.mjs';

const seeds = Array.from({ length: 12 }, (_, i) => 1001 + i);
const rows = [];
for (const seed of seeds) {
  const sect = sectOfSeed(seed);
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, v22: true, ...(sect ? { sect24: sect } : {}) });
  let day = s.day;
  const snapshots = {};
  for (let i = 0; i < 60 * DAY / .25; i++) {
    tick(s, .25);
    if (s.alert) s.alert = null;
    if (s.day !== day) {
      day = s.day;
      if (day === 31 || day === 61) {
        snapshots[day - 1] = { ...s.forayStats, targets: [...s.forayStats.targets], totalDiscoveries: s.ds.reduce((n, d) => n + (d.glimmer?.known?.length || 0), 0), expN: s.expN || 0 };
      }
      botDaily(s);
    }
  }
  rows.push({ seed, day30: snapshots[30], day60: snapshots[60] });
}
const totals = Object.fromEntries([30, 60].map(day => [day, Object.fromEntries(['starts', 'patrols', 'hurt', 'discoveries', 'totalDiscoveries'].map(key => [key, rows.reduce((n, row) => n + (row[`day${day}`]?.[key] || 0), 0)]))]));
const targetOdds = Object.fromEntries([30, 60].map(day => [day, Object.fromEntries(['food', 'practice'].map(motive => {
  const list = rows.flatMap(row => row[`day${day}`]?.targets || []).filter(row => row.motive === motive).map(row => row.p).sort((a, b) => a - b);
  const quantile = q => list.length ? list[Math.floor((list.length - 1) * q)] : null;
  return [motive, { n: list.length, q10: quantile(.1), median: quantile(.5), q90: quantile(.9) }];
}))]));
console.log(JSON.stringify({ days: [30, 60], seeds, rows, totals, targetOdds }, null, 2));
