// R8（#507）：既有季節傷者帳保留；來犯改列實際見聞，不再假設固定來犯週期。
import { createState, tick, foundHermitageSect } from '../src/sim.mjs';
import { DAY, SEASON_DAYS } from '../src/data.mjs';
import { ALL_ON, botDaily } from '../test/harness/bot.mjs';
import { T } from '../src/threat.mjs';
const args = process.argv.slice(2), get = (k, def) => { const i = args.indexOf('--' + k); return i < 0 ? args.find(x => x.startsWith('--' + k + '='))?.split('=')[1] ?? def : args[i + 1]; };
const one = get('seed', null), days = Number(get('days', 30));
if (one != null && !Number.isSafeInteger(Number(one)) || !Number.isSafeInteger(days) || days < 1) throw Error('--seed 要整數，--days 要正整數');
const seeds = one == null ? Array.from({ length: 12 }, (_, i) => 1001 + i) : [Number(one)], rows = [];
for (const seed of seeds) {
  const s = createState(seed, { kind: 'custom', opening: 'solo', answers: Array(9).fill(0), askMajor: false, ...ALL_ON });
  const founded = foundHermitageSect(s, 'single'); if (!founded.ok) throw Error(`seed ${seed}: ${founded.why}`);
  let day = s.day;
  for (let i = 0; i < days * DAY / 6; i++) { for (let j = 0; j < 24; j++) tick(s, .25); if (s.alert) s.alert = null; if (s.day !== day) { day = s.day; botDaily(s); } }
  const history = T(s).hist || [], seasons = Array.from({ length: Math.ceil(days / SEASON_DAYS) }, (_, i) => {
    const first = 1 + i * SEASON_DAYS, last = Math.min(days, first + SEASON_DAYS - 1), events = history.filter(h => h.day >= first && h.day <= last);
    return { first, last, complete: last - first + 1 === SEASON_DAYS, raids: new Set(events.map(h => h.n)).size, fights: events.filter(h => h.fight).length, hurt: events.filter(h => h.hurt).length };
  });
  rows.push({ seed, seasons, rumorCount: s.rumorSerial || 0, usedRumors: T(s).usedRumors || [], history, homeHurt: T(s).homeHurt });
}
const complete = rows.flatMap(r => r.seasons.filter(s => s.complete));
console.log(JSON.stringify({ days, seeds, rows, completeSeasons: complete.length, completeSeasonsWithHurt: complete.filter(s => s.hurt > 0).length,
  totalRumors: rows.reduce((n, r) => n + r.rumorCount, 0), totalUsedRumors: rows.reduce((n, r) => n + r.usedRumors.length, 0) }, null, 2));
