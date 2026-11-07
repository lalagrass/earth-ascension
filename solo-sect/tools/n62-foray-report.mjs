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
console.log(JSON.stringify({ days: [30, 60], seeds, rows, totals }, null, 2));
