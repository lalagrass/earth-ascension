// M20 二十日長跑：base 與 exp，前十日、後十日分開記，看各支柱的主張後半段還在不在、有沒有種子垮掉。
// 用法：node loop-sect/tools/long.mjs [--from 1] [--seeds 12] [--days 20]
import { createWorld, step } from '../src/sim.mjs';
import { TICKS_PER_DAY, PILE } from '../src/data.mjs';
import { RES_TILE, remaining } from '../src/build.mjs';
import { atLeast } from '../src/social.mjs';
import { rosterFor, script } from './soak-checks.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const FROM = arg('from', 1), SEEDS = arg('seeds', 12), DAYS = arg('days', 20);
const HALF = Math.floor(DAYS / 2) * TICKS_PER_DAY;
const HUNGRY = 15;
const EATS = ['eat', 'eatRaw', 'eatCarried', 'ration']; // 跟 report 一樣用 counts（吃完才記）
const pct = (v) => `${(100 * v).toFixed(1)}%`;
const members = (s) => s.people.filter((p) => !p.guest);
function nearestTree(s) {
  let best = Infinity;
  s.map.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === RES_TILE.wood) best = Math.min(best, Math.hypot(x - PILE.x, y - PILE.y)); });
  return best;
}
const C = ['drillDone', 'comprehend', 'enemies', 'repelled', 'raids'];
const out = { seeds: [] };
for (const scenario of ['base', 'exp']) {
  for (let seed = FROM; seed < FROM + SEEDS; seed++) {
    const s = createWorld({ seed, people: rosterFor(seed) });
    const tree0 = nearestTree(s);
    let h = 0, n = 0, streakMax = 0, noWood = 0, noWoodMax = 0;
    const streak = {}, memberTicks = [0, 0];
    const ate = () => EATS.reduce((a, c) => a + (s.counts[c] || 0), 0);
    let eatHalf = 0;
    let half = null, m10 = 0;
    for (let t = 0; t < DAYS * TICKS_PER_DAY; t++) {
      script(s, scenario); step(s);
      const k = t < HALF ? 0 : 1;
      for (const p of members(s)) {
        n++; memberTicks[k]++;
        if (p.needs.food < HUNGRY) { h++; streak[p.id] = (streak[p.id] ?? 0) + 1; streakMax = Math.max(streakMax, streak[p.id]); } else streak[p.id] = 0;
      }
      if (k === 1) {
        const short = s.sites.some((x) => remaining(x, 'wood') > 0) && s.stock.wood === 0;
        noWood = short ? noWood + 1 : 0; noWoodMax = Math.max(noWoodMax, noWood);
      }
      if (t === HALF - 1) {
        half = Object.fromEntries(C.map((c) => [c, s.counts[c] || 0]));
        m10 = members(s).length; eatHalf = ate();
        half.family = s.events.some((e) => e.kind === 'family');
      }
    }
    const end = Object.fromEntries(C.map((c) => [c, s.counts[c] || 0]));
    const m = members(s);
    const days = DAYS / 2;
    out.seeds.push({
      scenario, seed, hunger: h / n, streakMax, m10, m20: m.length,
      eat1: eatHalf / (memberTicks[0] / TICKS_PER_DAY), eat2: (ate() - eatHalf) / (memberTicks[1] / TICKS_PER_DAY),
      tree0, tree20: nearestTree(s), noWoodMax,
      family10: half.family, family20: s.events.some((e) => e.kind === 'family'),
      friends: m.some((a) => m.some((b) => a !== b && atLeast(s, a, b, 'friend'))),
      first: half, second: Object.fromEntries(C.map((c) => [c, end[c] - half[c]])),
      days,
    });
  }
}

// ---------- 印 ----------
const fails = [];
const expect = (id, ok, text) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} ${text}`); if (!ok) fails.push(id); };
console.log(`種子 ${FROM}–${FROM + SEEDS - 1}，${DAYS} 日（前 ${DAYS / 2} 日／後 ${DAYS / 2} 日）`);
for (const scenario of ['base', 'exp']) {
  const R = out.seeds.filter((r) => r.scenario === scenario);
  console.log(`--- 情境 ${scenario} ---`);
  console.log('各種子飢餓：' + R.map((r) => `s${r.seed} ${pct(r.hunger)}`).join(' '));
  const worst = R.reduce((a, r) => (r.hunger > a.hunger ? r : a));
  const streak = R.reduce((a, r) => (r.streakMax > a.streakMax ? r : a));
  const shrank = R.filter((r) => r.m20 < r.m10);
  expect(`M20-A2[${scenario}]`, worst.hunger <= 0.08 && streak.streakMax < TICKS_PER_DAY && !shrank.length,
    `最差種子 s${worst.seed} ${pct(worst.hunger)}（≤ 8%）、最長連續飢餓 s${streak.seed} ${streak.streakMax} tick（< ${TICKS_PER_DAY}）、人數變少的種子 ${shrank.length}（第 10 日 ${R.map((r) => r.m10).join('/')}，第 20 日 ${R.map((r) => r.m20).join('/')}）`);
  const e2 = R.map((r) => r.eat2), e1 = R.map((r) => r.eat1);
  expect(`M20-A3[${scenario}]`, Math.min(...e2) >= 1.5 && Math.max(...e2) <= 4,
    `後十日每人每日進食 ${Math.min(...e2).toFixed(2)}–${Math.max(...e2).toFixed(2)}（1.5–4）；前十日 ${Math.min(...e1).toFixed(2)}–${Math.max(...e1).toFixed(2)}`);
  const far = R.filter((r) => r.tree20 > 2 * r.tree0 + 5);
  const noWood = Math.max(...R.map((r) => r.noWoodMax));
  expect(`M20-A4[${scenario}]`, !far.length && noWood <= TICKS_PER_DAY / 2,
    `最近的樹 第 1 日 ${R.map((r) => r.tree0.toFixed(0)).join('/')} → 第 20 日 ${R.map((r) => r.tree20.toFixed(0)).join('/')}（≤ 2 倍＋5，超過的種子 ${far.length}）；後十日缺木最長 ${noWood} tick（≤ ${TICKS_PER_DAY / 2}）`);
  if (scenario === 'base') {
    const fam10 = R.filter((r) => r.family10).length, fam20 = R.filter((r) => r.family20).length, fr = R.filter((r) => r.friends).length;
    console.log(`M20-A5 有一家的種子 第 10 日 ${fam10}/${SEEDS} → 第 20 日 ${fam20}/${SEEDS}（兩組合起來要 ≥ 14/24）`);
    expect('M20-A5 朋友', fr >= Math.ceil(SEEDS * 10 / 12), `第 20 日有朋友的種子 ${fr}/${SEEDS}（≥ 10/12）`);
    const sum = (k, part) => R.reduce((a, r) => a + r[part][k], 0);
    const r1 = sum('repelled', 'first') / Math.max(1, sum('enemies', 'first')), r2 = sum('repelled', 'second') / Math.max(1, sum('enemies', 'second'));
    console.log(`M20-A6 打退率 前十日 ${pct(r1)}（${sum('repelled', 'first')}/${sum('enemies', 'first')}）→ 後十日 ${pct(r2)}（${sum('repelled', 'second')}/${sum('enemies', 'second')}）（兩組合起來判：後 ≥ 前 − 15 點）`);
    const d1 = sum('drillDone', 'first'), d2 = sum('drillDone', 'second'), c1 = sum('comprehend', 'first'), c2 = sum('comprehend', 'second');
    expect('M20-A7', d2 >= 0.5 * d1 && c2 >= 0.25 * c1, `練完 ${d1} → ${d2}（≥ 50%）、領悟 ${c1} → ${c2}（≥ 25%）`);
  }
}
console.log(fails.length ? `\nFAIL ${fails.join(', ')}` : '\nOK long');
// 合起來判的兩條（A5 成家、A6 打退率）印成一行給兩組對照：
const B = out.seeds.filter((r) => r.scenario === 'base');
const tally = (part, k) => B.reduce((a, r) => a + r[part][k], 0);
console.log(`JSON ${JSON.stringify({ fam20: B.filter((r) => r.family20).length, rep1: tally('first', 'repelled'), en1: tally('first', 'enemies'), rep2: tally('second', 'repelled'), en2: tally('second', 'enemies') })}`);
process.exitCode = fails.length ? 1 : 0;
