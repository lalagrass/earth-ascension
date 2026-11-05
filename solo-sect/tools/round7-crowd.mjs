// N31b：同一位郭靖第 20 日狀態，固定 100 個反應分位數，量同時／輪流起手的接法。
// node tools/round7-crowd.mjs > artifacts/round7/crowd-head.json
import { pathToFileURL } from 'node:url';
import { createState, tick } from '../src/sim.mjs';
import { MOVES } from '../src/data.mjs';
import { CLASH, interceptOpening, resolveSwing, windOf } from '../src/arts.mjs';
import { BAND_CLASH } from '../src/threat.mjs';

const KINDS = ['read', 'dodge', 'parry', 'hit'];
const NUMBERS = [1, 2, 3, 4, 6];
const SAMPLES = 100;
const SEED = 21;
const bandWind = BAND_CLASH.monCd * CLASH.monWind;

function day20() {
  const state = createState(SEED, { kind: 'template', id: 'guojing', askMajor: false });
  while (state.day < 20) tick(state, 6);
  const master = state.ds.find((d) => d.id === 'hero');
  // 同級好手用郭靖自己已會的「亢龍」作對手招；同一門武學、同一火候，前搖較短。
  const peerMove = MOVES.find((m) => m.id === 'kanglong' && master.moves.includes(m.id));
  if (!peerMove) throw new Error('第 20 日郭靖尚未會亢龍，請檢查固定情境');
  return { state, master, peerMove };
}

function oneCell(master, state, foe, peerMove, mode, n) {
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0]));
  const wind = foe === 'bandit' ? bandWind : windOf(master, peerMove.id, peerMove.cd);
  for (let i = 0; i < SAMPLES; i++) {
    const d = structuredClone(master); d.posture = 100; d.fret = 0; d.raging = false; d.rageUntil = 0; d.busyUntil = state.t;
    const s = { t: state.t, fx: [], log: [], chron: [], codex: structuredClone(state.codex) };
    const pending = [];
    for (let j = 0; j < n; j++) {
      // 此探針只隔離「手上動作佔用時間」；每招回到同一焦躁狀態，不混入 N29 長戰壓力。
      d.fret = 0; d.raging = false; d.rageUntil = 0;
      const atk = foe === 'bandit'
        ? { uid: `bandit${j}`, k: 'bandit', i: j, agi: BAND_CLASH.agi[j % BAND_CLASH.agi.length], hp: 50, pos: [d.pos[0] + 20, d.pos[1]] }
        : { ...structuredClone(master), id: `peer${j}`, uid: `peer${j}`, pos: [d.pos[0] + 20, d.pos[1]] };
      const q = (i + 0.5) / SAMPLES; // 同一分位數讓各人可直接比較；每格重跑完整 100 分位數
      if (mode === 'staggered') s.t = state.t + j * BAND_CLASH.monCd;
      const ctx = { wind, depth: foe === 'bandit' ? 2 : undefined, move: foe === 'peer' ? peerMove.id : undefined };
      const start = interceptOpening(s, atk, d, () => q, ctx);
      if (start.read) counts[start.read.kind]++;
      else if (mode === 'staggered') { s.t += wind; counts[resolveSwing(s, atk, d, () => q, { ...ctx, opening: start.opening }).kind]++; }
      else pending.push({ atk, q, ctx, opening: start.opening });
    }
    if (mode === 'simultaneous') {
      s.t = state.t + wind;
      for (const p of pending) counts[resolveSwing(s, p.atk, d, () => p.q, { ...p.ctx, opening: p.opening }).kind]++;
    }
  }
  return { n, total: n * SAMPLES, counts, ratio: Object.fromEntries(KINDS.map((k) => [k, +(counts[k] / (n * SAMPLES)).toFixed(3)])) };
}

export function runCrowd() {
  const { state, master, peerMove } = day20();
  const rows = [];
  for (const foe of ['bandit', 'peer']) for (const mode of ['simultaneous', 'staggered']) for (const n of NUMBERS)
    rows.push({ foe, mode, ...oneCell(master, state, foe, peerMove, mode, n) });
  return { seed: SEED, day: state.day, samples: SAMPLES, hero: { name: master.name, wu: master.wu, agility: master.skills.agility },
    opponents: { bandit: { name: '持刀嘍囉', wind: bandWind, depth: 2 }, peer: { name: '同級好手', move: peerMove.id, wind: windOf(master, peerMove.id, peerMove.cd) } }, rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(runCrowd(), null, 2));
