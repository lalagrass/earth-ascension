// N43：從同一自然成長日程複製當日局面，以正常玩家指令出獵量單波擊退紀錄。
import { createState, tick, startHunt, clone, dpsOf } from '../src/sim.mjs';
import { ALL_ON, botDaily } from '../test/harness/bot.mjs';
import { sectOfSeed } from '../test/golden/scenarios.mjs';
import { DAY } from '../src/data.mjs';

const get = (args, key, fallback) => { const i = args.indexOf('--' + key); return i < 0 ? args.find(x => x.startsWith('--' + key + '='))?.split('=')[1] ?? fallback : args[i + 1]; };
const percentile = (rows, p) => { const sorted = rows.filter(Number.isFinite).sort((a, b) => a - b); if (!sorted.length) return null; const pos = (sorted.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos); return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo); };
function huntProbe(source) {
  const s = clone(source); s.alert = null;
  let waited = 0;
  while (s.band && waited < DAY) { tick(s, .25); waited += .25; if (s.alert) s.alert = null; }
  if (s.band) return { best: null, reason: '守山交手未結束', waited };
  if (s.threat?.pending) return { best: null, reason: '山賊待決', waited };
  const team = s.ds.filter(d => d.role !== 'laborer' && !d.away && d.hp > 30).sort((a, b) => dpsOf(s, b) - dpsOf(s, a) || a.id.localeCompare(b.id)).slice(0, 3);
  if (!team.length || !startHunt(s, team.map(d => d.id))) return { best: null, reason: '無可出獵者', waited };
  const at = s.t;
  while (s.hunt && s.t - at < DAY * 1.5) { tick(s, .25); if (s.alert) s.alert = null; }
  return { best: Math.max(0, ...team.map(d => s.ds.find(x => x.id === d.id)?.waveBest || 0)), unfinished: !!s.hunt, waited, effectiveDay: s.day };
}
export function waveBestReport(args = process.argv.slice(2)) {
  const days = get(args, 'days', '0,30,60').split(',').map(Number), range = get(args, 'seeds', '1-20');
  const one = get(args, 'seed', null), pair = /^(-?\d+)-(-?\d+)$/.exec(range);
  const seeds = one == null ? pair ? Array.from({ length: Number(pair[2]) - Number(pair[1]) + 1 }, (_, i) => Number(pair[1]) + i) : [] : [Number(one)];
  if (!days.length || !days.every(n => Number.isSafeInteger(n) && n >= 0) || !seeds.length || !seeds.every(Number.isSafeInteger)) throw Error('--days 要非負整數列表；--seeds 要起迄整數，或用 --seed X');
  const last = Math.max(...days), rows = [];
  for (const seed of seeds) {
    const sect = sectOfSeed(seed), s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, ...(sect ? { sect24: sect } : {}) });
    let day = s.day; const probes = {};
    if (days.includes(0)) probes[0] = huntProbe(s);
    for (let i = 0; i < last * DAY / 6; i++) {
      if (s.band) for (let j = 0; j < 24; j++) tick(s, .25); else tick(s, 6);
      if (s.alert) s.alert = null;
      if (s.day !== day) { const completed = day; day = s.day; if (days.includes(completed)) probes[completed] = huntProbe(s); botDaily(s); }
    }
    if (days.some(d => !probes[d])) throw Error(`seed ${seed}: missing day ${days.filter(d => !probes[d])}`);
    rows.push({ seed, probes });
  }
  const summary = Object.fromEntries(days.map(day => { const values = rows.map(row => row.probes[day].best); return [day, { n: values.filter(Number.isFinite).length, median: percentile(values, .5), q1: percentile(values, .25), q3: percentile(values, .75), unfinished: rows.filter(row => row.probes[day].unfinished).length, values }]; }));
  return { days, seeds, scenario: `自然日程每日 bot 建寢舍／可收則收；第 ${days.join('、')} 日各複製局面，正常派前三人出獵至多 900 遊戲秒；不灌能力或野獸，探針不回寫原局`, rows, summary };
}
