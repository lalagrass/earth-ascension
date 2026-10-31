/* loop80 成長分層流程量測：A 新手專精／B 同類高手／C 跨類轉修。遊戲內時間（日）＋有效修練時間（練功分鐘）。
   用法：SS_DT=0.25 node test/harness/diag-grow.mjs [n=40] [start=1001] > /tmp/grow-flows.json */
import { createState, tick } from '../../src/sim.mjs';
import { learnArt } from '../../src/arts.mjs';
import { mastery, accelOf } from '../../src/arts.mjs';
import { ARTS } from '../../src/data.mjs';
import { ALL_ON } from './bot.mjs';
const DT = +(process.env.SS_DT || 0.25), N = +(process.argv[2] || 40), S0 = +(process.argv[3] || 1001), MAXD = 12;
function setup(seed, flow, grow = true) {
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, grow, growdr: process.env.GROWDR !== '0' }), h = s.ds[0]; /* loop122 GROWDR=0 → 遞減關 */
  /* 兩組武學狀態完全相同（同熟練、同招式），只差造詣紀錄 gm */
  learnArt(h, 'pushPalm', 0); learnArt(h, 'wavePalm', 0); h.arts.basicFist.xp = 60; h.arts.basicFist.bt1 = true; h.arts.wavePalm.xp = 30; h.arts.pushPalm.xp = 0;
  if (flow.startsWith('C')) { learnArt(h, flow === 'C-sword' ? 'xuantie' : 'sweepLeg', 0); }
  for (const r of Object.values(h.arts)) if (grow) r.gm = { e: 0, ms: 0 };
  if (grow && flow !== 'A') { h.arts.basicFist.gm.e = 20; h.arts.wavePalm.gm.e = 20; }
  const tgt = { A: 'pushPalm', B: 'pushPalm', 'C-leg': 'sweepLeg', 'C-sword': 'xuantie' }[flow]; h.focus = tgt; if (flow === 'C-leg') h.style = 'leg';
  return { s, h, tgt };
}
function one(seed, flow, grow = true) {
  const { s, h, tgt } = setup(seed, flow, grow), r = h.arts[tgt], out = { seed, flow, grow, acc0: grow ? +accelOf(h, ARTS.find((a) => a.id === tgt), 0).mul.toFixed(3) : 1 };
  let train = 0;
  for (let i = 0; i < MAXD * 600 / DT; i++) { tick(s, DT); if (h.task?.act === 'train' || h.task?.act === 'spar') train += DT;
    if (out.t25 == null && r.xp >= 25) { out.t25 = +(s.t / 600).toFixed(3); out.m25 = +train.toFixed(1); }
    if (out.t549 == null && r.xp >= 54.9 - 1e-6) { out.t549 = +(s.t / 600).toFixed(3); out.m549 = +train.toFixed(1); break; } }
  out.xpEnd = +r.xp.toFixed(1); out.trainEnd = +train.toFixed(1); out.mQ = +mastery(h, 'quanzhang').toFixed(2); out.mT = +mastery(h, 'tuifa').toFixed(2); out.mJ = +mastery(h, 'jianfa').toFixed(2); out.moves = h.moves.length;
  return out;
}
const rows = [];
for (let k = 0; k < N; k++) { for (const f of ['A', 'B', 'C-leg', 'C-sword']) rows.push(one(S0 + k, f)); for (const f of ['A', 'B']) rows.push({ ...one(S0 + k, f, false), flow: f + '-off' }); }
const avg = (f, key) => { const v = rows.filter((r) => r.flow === f && r[key] != null).map((r) => r[key]); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3) : null; };
const sum = Object.fromEntries(['A', 'B', 'C-leg', 'C-sword', 'A-off', 'B-off'].map((f) => [f, { n: rows.filter((r) => r.flow === f).length, reach25: rows.filter((r) => r.flow === f && r.t25 != null).length, reach549: rows.filter((r) => r.flow === f && r.t549 != null).length, acc0: avg(f, 'acc0'), day25: avg(f, 't25'), min25: avg(f, 'm25'), day549: avg(f, 't549'), min549: avg(f, 'm549'), mQ: avg(f, 'mQ'), mT: avg(f, 'mT'), mJ: avg(f, 'mJ') }]));
console.log(JSON.stringify({ dt: DT, seeds: [S0, S0 + N - 1], maxDays: MAXD, summary: sum, rows }));
