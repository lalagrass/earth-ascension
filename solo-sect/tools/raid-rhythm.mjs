// N43 自然 bot12 日程的山賊季節帳；不在測試中注入敵人或改威脅點數。
import { createState, tick } from '../src/sim.mjs';
import { DAY, SEASON_DAYS } from '../src/data.mjs';
import { ALL_ON, botDaily } from '../test/harness/bot.mjs';
import { sectOfSeed } from '../test/golden/scenarios.mjs';
import { T, raidPhase, RAID, RAID_RHYTHM } from '../src/threat.mjs';
const args = process.argv.slice(2), get = (k, def) => { const i = args.indexOf('--' + k); return i < 0 ? args.find(x => x.startsWith('--' + k + '='))?.split('=')[1] ?? def : args[i + 1]; };
const one = get('seed', null), days = Number(get('days', 30));
if (one != null && !Number.isSafeInteger(Number(one)) || !Number.isSafeInteger(days) || days < 1) throw Error('--seed 要整數，--days 要正整數');
const seeds = one == null ? Array.from({ length: 12 }, (_, i) => 1001 + i) : [Number(one)], rows = [];
for (const seed of seeds) {
  const sect = sectOfSeed(seed), s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, ...(sect ? { sect24: sect } : {}) });
  let day = s.day;
  for (let i = 0; i < days * DAY / 6; i++) { for (let j = 0; j < 24; j++) tick(s, .25); if (s.alert) s.alert = null; if (s.day !== day) { day = s.day; botDaily(s); } }
  const history = T(s).hist || [], seasons = Array.from({ length: Math.ceil(days / SEASON_DAYS) }, (_, i) => {
    const first = 1 + i * SEASON_DAYS, last = Math.min(days, first + SEASON_DAYS - 1), events = history.filter(h => h.day >= first && h.day <= last);
    return { first, last, complete: last - first + 1 === SEASON_DAYS, raids: new Set(events.map(h => h.n)).size, fights: events.filter(h => h.fight).length, hurt: events.filter(h => h.hurt).length };
  });
  const cycles = Array.from({ length: raidPhase({ day: days }).cycle + 1 }, (_, i) => {
    const start = RAID.first + i * (RAID_RHYTHM.pressureDays + RAID_RHYTHM.respiteDays), end = start + RAID_RHYTHM.pressureDays - 1;
    return { start, end, raids: new Set(history.filter(h => h.day >= start && h.day <= end).map(h => h.n)).size };
  });
  rows.push({ seed, seasons, cycles, history, homeHurt: T(s).homeHurt });
}
const complete = rows.flatMap(r => r.seasons.filter(s => s.complete && s.first >= RAID.first));
console.log(JSON.stringify({ days, seeds, rows, completeSeasonsAfterFirst: complete.length, completeSeasonsWithHurt: complete.filter(s => s.hurt > 0).length,
  cyclesOverCap: rows.flatMap(r => r.cycles).filter(c => c.raids > RAID_RHYTHM.maxBig).length }, null, 2));
