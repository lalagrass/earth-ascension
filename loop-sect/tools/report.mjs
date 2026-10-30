// M10 長跑報表：12 種子 × 10 日 × 兩個情境。印每日飢餓、最差種子、進食次數、社交、猜個性的準確率，並判 M10-A5–A7。
// 用法：node loop-sect/tools/report.mjs [--seeds 12] [--days 10]
import { createWorld, step } from '../src/sim.mjs';
import { TICKS_PER_DAY } from '../src/data.mjs';
import { rosterFor, script, PAUSED } from './soak-checks.mjs';
import { atLeast } from '../src/social.mjs';
import { lifeShares } from '../src/chronicle.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const SEEDS = arg('seeds', 12), DAYS = arg('days', 10);
const HUNGRY = 15;
const EATS = ['eat', 'eatRaw', 'eatCarried', 'ration'];
const pct = (v) => `${(100 * v).toFixed(1)}%`;
const failures = [];
const expect = (id, ok, text) => {
  const paused = PAUSED.has(id.split('-')[0]);
  console.log(`${ok ? 'ok  ' : paused ? '暫停' : 'FAIL'} ${id} ${text}`);
  if (!ok && !paused) failures.push(id);
};

const lives = [];
const membersBy = {};
for (const scenario of ['base', 'exp', 'grow']) {
  const dayH = Array(DAYS).fill(0), dayN = Array(DAYS).fill(0);
  const seedRows = [];
  let friends = 0, masters = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const s = createWorld({ seed, people: rosterFor(seed) });
    const start = new Set(s.people.map((p) => p.id));
    let h = 0, n = 0;
    for (let t = 0; t < DAYS * TICKS_PER_DAY; t++) {
      script(s, scenario); step(s);
      const d = Math.floor(t / TICKS_PER_DAY);
      for (const p of s.people) {
        if (p.guest) continue;
        n++; dayN[d]++;
        if (p.needs.food < HUNGRY) { h++; dayH[d]++; }
      }
    }
    const m = s.people.filter((p) => !p.guest);
    const eats = EATS.reduce((a, k) => a + (s.counts[k] || 0), 0);
    if (m.some((a) => m.some((b) => a !== b && atLeast(s, a, b, 'friend')))) friends++;
    masters += s.events.filter((e) => e.kind === 'master').length;
    seedRows.push({ seed, hunger: h / n, eatsPerDay: eats / (n / TICKS_PER_DAY), members: m.length });
    if (scenario === 'base') for (const p of s.people) if (start.has(p.id)) lives.push({ seed, p, share: lifeShares(p) });
  }
  const daily = dayH.map((x, i) => x / dayN[i]);
  const worst = seedRows.reduce((a, b) => (b.hunger > a.hunger ? b : a));
  const eatLo = Math.min(...seedRows.map((r) => r.eatsPerDay)), eatHi = Math.max(...seedRows.map((r) => r.eatsPerDay));
  console.log(`--- 情境 ${scenario}（${SEEDS} 種子 × ${DAYS} 日）---`);
  console.log(`每日飢餓：${daily.map((v, i) => `d${i + 1} ${pct(v)}`).join(' ')}`);
  console.log(`各種子飢餓：${seedRows.map((r) => `s${r.seed} ${pct(r.hunger)}`).join(' ')}`);
  console.log(`每人每日進食 ${eatLo.toFixed(2)}–${eatHi.toFixed(2)} 次；結束時同門 ${seedRows.map((r) => r.members).join('/')}`);
  membersBy[scenario] = seedRows.map((r) => r.members);
  // M11-A7：grow 情境人多一半，門檻放在 3%／6%（規格寫在量之前）。
  const [dayMax, seedMax, id] = scenario === 'grow' ? [0.03, 0.06, 'M11-A7'] : [0.02, 0.04, 'M10-A5'];
  expect(`${id}[${scenario}]`, Math.max(...daily) <= dayMax && worst.hunger <= seedMax && eatLo >= 1.5 && eatHi <= 4,
    `最差日 ${pct(Math.max(...daily))}（≤ ${pct(dayMax)}）、最差種子 s${worst.seed} ${pct(worst.hunger)}（≤ ${pct(seedMax)}）、進食 ${eatLo.toFixed(2)}–${eatHi.toFixed(2)}（1.5–4）`);
  expect(`M10-A7[${scenario}]`, friends >= 6 && masters >= 1, `有朋友的種子 ${friends}/${SEEDS}（≥ 6）、拜師 ${masters} 次（≥ 1）`);
}

// M11-A6：蓋了宿舍，山上就熱鬧起來。
{
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const g = membersBy.grow, b = membersBy.base;
  const seven = g.filter((n) => n >= 7).length;
  console.log('--- 宿舍與人口 ---');
  expect('M11-A6', seven >= Math.ceil(SEEDS * 8 / 12) && mean(g) - mean(b) >= 1.5,
    `grow 十日後同門 ≥ 7 人的種子 ${seven}/${SEEDS}（≥ ${Math.ceil(SEEDS * 8 / 12)}）；平均 grow ${mean(g).toFixed(1)}、base ${mean(b).toFixed(1)}（差 ≥ 1.5）`);
}

// A6：只看生平的時間占比猜個性。依全體中位數切：聊天切磋多 → 外向；幹活多 → 條理。
const median = (xs) => { const a = [...xs].sort((x, y) => x - y); return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; };
function guess(key, isPos) {
  const mid = median(lives.map((l) => l.share[key]));
  const right = lives.filter((l) => (l.share[key] > mid) === isPos(l.p)).length;
  return right / lives.length;
}
const eAcc = guess('social', (p) => p.axes.E > 0);
const jAcc = guess('work', (p) => p.axes.P < 0);
console.log('--- 猜個性（base，開局三人）---');
expect('M10-A6', eAcc >= 0.75 && jAcc >= 0.7, `外內向 ${pct(eAcc)}（≥ 75%）、條理隨性 ${pct(jAcc)}（≥ 70%），共 ${lives.length} 人`);

if (failures.length) { console.error(`\nFAIL ${failures.join(', ')}`); process.exit(1); }
console.log('\nOK report');
