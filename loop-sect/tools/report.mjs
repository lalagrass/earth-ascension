// M10 長跑報表：12 種子 × 10 日 × 兩個情境。印每日飢餓、最差種子、進食次數、社交、猜個性的準確率，並判 M10-A5–A7。
// 用法：node loop-sect/tools/report.mjs [--seeds 12] [--days 10] [--fire 1] [--duty 0] [--from 1]
// --from 13：改用種子 13–24，量同一指標換一組種子差多少（retro 5：舊指標的雜訊）。
// --fire 1：煮飯燒柴（M18-A4）；--duty 0：關掉值日，跟有值日比。
import { createWorld, step } from '../src/sim.mjs';
import { TICKS_PER_DAY, FIRE, DUTY, COOK_RAW } from '../src/data.mjs';
import { dutyOf, pressure, ROLE } from '../src/duty.mjs';
import { isNight } from '../src/needs.mjs';
import { rosterFor, script, PAUSED } from './soak-checks.mjs';
import { atLeast } from '../src/social.mjs';
import { lifeShares } from '../src/chronicle.mjs';
import { hurt } from '../src/injury.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const SEEDS = arg('seeds', 12), DAYS = arg('days', 10), FROM = arg('from', 1);
FIRE.WOOD_PER_POT = arg('fire', FIRE.WOOD_PER_POT);
DUTY.ON = arg('duty', DUTY.ON ? 1 : 0) === 1;
const FIRE_ON = FIRE.WOOD_PER_POT > 0;
console.log(`燒柴 ${FIRE_ON ? '開' : '關'}、值日 ${DUTY.ON ? '開' : '關'}`);
const SLEEPS = new Set(['sleep', 'sleepGround']);
// M18-A6：依職、條理／隨性累計 tick。loop 14 第一次量是「每人一筆平均」，混了職別（條理的人多排到伙房，伙房本來就做得少），
// 改成同一職裡比、再依 tick 加權；扛回去（送莓、扛木回倉堆）算本職；伙房只算有得煮的時候。
const adh = {};
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
const membersBy = {}, dailyBy = {};
const m12 = {};
const raid = {};   // M14-A5：各情境十日的撞破格數與被偷份數
const inj = {};    // M16-A5／A6：受傷人·tick、受傷次數、傷重撤退
for (const scenario of ['base', 'exp', 'grow', 'farm', 'post', 'herb']) {
  const dayH = Array(DAYS).fill(0), dayN = Array(DAYS).fill(0);
  const seedRows = [];
  let friends = 0, masters = 0;
  for (let seed = FROM; seed < FROM + SEEDS; seed++) {
    const s = createWorld({ seed, people: rosterFor(seed) });
    const start = new Set(s.people.map((p) => p.id));
    let h = 0, n = 0;
    const snap = {};
    for (let t = 0; t < DAYS * TICKS_PER_DAY; t++) {
      script(s, scenario); step(s);
      // M12：第 5 日結束時記一次，好比第 6–10 日。
      if (s.tick === 5 * TICKS_PER_DAY) snap.d5 = { cut: s.ledger.woodCut, veg: s.ledger.veg, picked: s.ledger.picked, chop: Math.max(...s.people.map((p) => p.skills.chop)) };
      const d = Math.floor(t / TICKS_PER_DAY);
      // M18-A6：值日迫切的白天、醒著、沒被迫自理時，在做本職嗎。
      if (scenario === 'base' && !isNight(s.tick)) for (const p of s.people) {
        const role = dutyOf(s, p);
        if (!role || p.guest || p.exp || p.forced || SLEEPS.has(p.task?.kind) || pressure(s, role) <= 0.5) continue;
        if (role === 'cook' && !(s.stock.raw >= COOK_RAW && s.stock.wood >= FIRE.WOOD_PER_POT)) continue;
        if (p.axes.P === 0) continue;
        const k = (adh[`${role}:${p.axes.P < 0 ? 'J' : 'P'}`] ??= { on: 0, doing: 0, who: new Set() });
        k.on++; k.who.add(`${seed}:${p.id}`);
        const kind = p.task?.kind;
        if (ROLE[role].kinds.includes(kind) || kind === ROLE[role].carry) k.doing++;
      }
      const I = (inj[scenario] ??= { ticks: 0, n: 0, heavyRetreat: 0, seedsHeavy: new Set() });
      for (const p of s.people) if (hurt(p)) I.ticks++;
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
    if (snap.d5 && DAYS >= 10) {
      const M = (m12[scenario] ??= { cut: 0, chopGain: 0, veg: 0, picked: 0, n: 0 });
      M.n++; M.cut += s.ledger.woodCut - snap.d5.cut; M.veg += s.ledger.veg - snap.d5.veg; M.picked += s.ledger.picked - snap.d5.picked;
      M.chopGain += Math.max(...s.people.map((p) => p.skills.chop)) - snap.d5.chop;
    }
    inj[scenario].n += s.counts.injured || 0;
    const hr = s.events.filter((e) => e.kind === 'exp' && /撤退：傷重/.test(e.text)).length;
    inj[scenario].heavyRetreat += hr; if (hr) inj[scenario].seedsHeavy.add(seed);
    const R = (raid[scenario] ??= { breaches: 0, stolen: 0, steals: 0 });
    R.breaches += s.counts.breaches || 0; R.steals += s.counts.stealHits || 0;
    R.stolen += s.ledger.rawStolen + s.ledger.mealsStolen + s.ledger.woodStolen + s.ledger.stoneStolen;
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
  dailyBy[scenario] = daily;
  // M11-A7：grow 情境人多一半，門檻放在 3%／6%（規格寫在量之前）。
  // M18-A4：燒柴時用同一組門檻。
  const [dayMax, seedMax, id] = FIRE_ON ? (scenario === 'grow' ? [0.03, 0.06, 'M18-A4'] : [0.02, 0.04, 'M18-A4']) : scenario === 'post' ? [0.02, 0.04, 'M14-A7'] : scenario === 'grow' ? [0.03, 0.06, 'M11-A7'] : scenario === 'farm' ? [0.02, 0.04, 'M12-A6'] : scenario === 'herb' ? [0.02, 0.04, 'M16-A7'] : [0.02, 0.04, 'M10-A5'];
  expect(`${id}[${scenario}]`, Math.max(...daily) <= dayMax && worst.hunger <= seedMax && eatLo >= 1.5 && eatHi <= 4,
    `最差日 ${pct(Math.max(...daily))}（≤ ${pct(dayMax)}）、最差種子 s${worst.seed} ${pct(worst.hunger)}（≤ ${pct(seedMax)}）、進食 ${eatLo.toFixed(2)}–${eatHi.toFixed(2)}（1.5–4）`);
  expect(`M10-A7[${scenario}]`, friends >= 6 && masters >= 1, `有朋友的種子 ${friends}/${SEEDS}（≥ 6）、拜師 ${masters} 次（≥ 1）`);
}

// M18-A6：守值日。
if (DUTY.ON) {
  console.log('--- 值日 ---');
  let diff = 0, w = 0, nJ = 0, nP = 0;
  for (const r of DUTY.ROLES) {
    const J = adh[`${r.id}:J`], P = adh[`${r.id}:P`];
    if (!J || !P) continue;
    const rj = J.doing / J.on, rp = P.doing / P.on, wt = J.on + P.on;
    console.log(`${r.label}：條理 ${pct(rj)}（${J.who.size} 人次、${J.on} tick）、隨性 ${pct(rp)}（${P.who.size} 人次、${P.on} tick）`);
    diff += (rj - rp) * wt; w += wt; nJ += J.who.size; nP += P.who.size;
  }
  const small = nJ < 20 || nP < 20 ? '（小樣本）' : '';
  expect('M18-A6', w > 0 && diff / w >= 0.1, `值日迫切時做本職，同一職裡條理比隨性多 ${(100 * diff / Math.max(1, w)).toFixed(1)} 個百分點（≥ 10；條理 ${nJ}、隨性 ${nP} 人次）${small}`);
}

// M14-A5：有哨位比沒有，撞破與被偷都少 ≥ 30%。
{
  const b = raid.base, p = raid.post;
  const small = b.breaches < 20 || b.steals < 20 ? '（小樣本）' : '';
  console.log('--- 守點 ---');
  expect('M14-A5', p.breaches <= 0.7 * b.breaches && p.stolen <= 0.7 * b.stolen,
    `撞破 base ${b.breaches} 格、post ${p.breaches} 格（≤ ${(0.7 * b.breaches).toFixed(1)}）；被偷 base ${b.stolen} 份（${b.steals} 次）、post ${p.stolen} 份（${p.steals} 次）（≤ ${(0.7 * b.stolen).toFixed(1)}）${small}`);
}

// M16-A5／A6：有藥園，每次受傷養得比較短；遠征有傷重撤退。
{
  const per = (k) => inj[k].ticks / Math.max(1, inj[k].n);
  const b = inj.base, h = inj.herb, x = inj.exp;
  console.log('--- 受傷與藥園 ---');
  console.log(`受傷次數 base ${b.n}、herb ${h.n}、exp ${x.n}；受傷人·tick base ${b.ticks}、herb ${h.ticks}`);
  expect('M16-A5', b.n > 0 && per('herb') <= 0.7 * per('base'), `平均每次受傷 base ${per('base').toFixed(0)} tick、herb ${per('herb').toFixed(0)} tick（≤ ${(0.7 * per('base')).toFixed(0)}，短 ${(100 * (1 - per('herb') / per('base'))).toFixed(0)}%）${b.n < 20 ? '（小樣本）' : ''}`);
  expect('M16-A6', x.heavyRetreat >= 1, `exp 情境「傷重」撤退 ${x.heavyRetreat} 次（${x.seedsHeavy.size} 個種子；≥ 1）`);
}

// M12-A5／A6：山上一直有活幹；菜園供得上糧。
if (m12.base && FIRE_ON) {
  const b = m12.base, f = m12.farm;
  console.log('--- 柴火與菜園（第 6–10 日）---');
  expect('M12-A5', b.cut / b.n / 5 >= 2 && b.chopGain / b.n >= 5,
    `base 每種子每日砍木 ${(b.cut / b.n / 5).toFixed(1)}（≥ 2.0）、最高伐木熟練第 5→10 日 +${(b.chopGain / b.n).toFixed(1)}（≥ 5）`);
  const share = f.veg / Math.max(1, f.picked);
  const worse = Math.max(...dailyBy.farm) - Math.max(...dailyBy.base);
  expect('M12-A6', share >= 0.25 && Math.max(...dailyBy.farm) <= 0.02 && worse <= 0.005,
    `farm 生菜占食材 ${pct(share)}（≥ 25%）；最差日 farm ${pct(Math.max(...dailyBy.farm))}、base ${pct(Math.max(...dailyBy.base))}（≤ 2%、不比 base 差 0.5 個百分點以上）`);
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
