/* loop82 三路線比較：同樣有效修練時間（練功／切磋分鐘）下，專精一門／同類多門／跨類分修。
   用法：SS_DT=0.25 node test/harness/diag-routes.mjs [n=40] [start=1001] [T=400] > out.json */
import { createState, tick } from '../../src/sim.mjs';
import { learnArt, artTier } from '../../src/arts.mjs';
import { mastery } from '../../src/arts.mjs';
import { ALL_ON } from './bot.mjs';
const DT = +(process.env.SS_DT || 0.25), N = +(process.argv[2] || 40), S0 = +(process.argv[3] || 1001), T = +(process.argv[4] || 400), MAXD = 20, SWAP = 60;
const ROUTES = { spec: ['pushPalm'], same: ['basicFist', 'pushPalm'], cross: ['pushPalm', 'sweepLeg'] };
function one(seed, route) {
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, grow: true }), h = s.ds[0];
  learnArt(h, 'pushPalm', 0); learnArt(h, 'sweepLeg', 0); h.arts.basicFist.xp = 0; h.arts.basicFist.bt1 = false;
  for (const r of Object.values(h.arts)) { r.xp = 0; r.bt1 = false; r.bt2 = false; r.gm = { e: 0, ms: 0 }; }
  const list = ROUTES[route], p0 = h.skills.palm, l0 = h.skills.leg, m0 = h.moves.length; let train = 0, k = 0, lastSwap = 0, i = 0; h.focus = list[0];
  for (; i < MAXD * 600 / DT && train < T; i++) { tick(s, DT); if (h.task?.act === 'train' || h.task?.act === 'spar') train += DT;
    if (list.length > 1 && train - lastSwap >= SWAP) { lastSwap = train; k = (k + 1) % list.length; h.focus = list[k]; } }
  const arts = Object.fromEntries(['basicFist', 'pushPalm', 'sweepLeg'].map((id) => [id, { xp: +h.arts[id].xp.toFixed(1), tier: artTier(h, id) }]));
  return { seed, route, done: train >= T, days: +(s.t / 600).toFixed(3), train: +train.toFixed(1), mQ: +mastery(h, 'quanzhang').toFixed(2), mT: +mastery(h, 'tuifa').toFixed(2),
    dPalm: +(h.skills.palm - p0).toFixed(2), dLeg: +(h.skills.leg - l0).toFixed(2), newMoves: h.moves.length - m0, arts, maxTier: Math.max(...list.map((id) => artTier(h, id))) };
}
const rows = []; for (let n = 0; n < N; n++) for (const r of Object.keys(ROUTES)) rows.push(one(S0 + n, r));
const av = (r, f) => { const v = rows.filter((x) => x.route === r).map(f); return +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3); };
const summary = Object.fromEntries(Object.keys(ROUTES).map((r) => [r, { n: rows.filter((x) => x.route === r).length, done: rows.filter((x) => x.route === r && x.done).length, days: av(r, (x) => x.days), train: av(r, (x) => x.train), mQ: av(r, (x) => x.mQ), mT: av(r, (x) => x.mT), dPalm: av(r, (x) => x.dPalm), dLeg: av(r, (x) => x.dLeg), newMoves: av(r, (x) => x.newMoves), maxTier: av(r, (x) => x.maxTier), ...Object.fromEntries(['basicFist', 'pushPalm', 'sweepLeg'].map((id) => [id, av(r, (x) => x.arts[id].xp)])) }]));
console.log(JSON.stringify({ dt: DT, seeds: [S0, S0 + N - 1], T, swap: SWAP, summary, rows }));
