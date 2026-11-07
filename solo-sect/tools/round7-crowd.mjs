// N31b：同一位郭靖第 20 日狀態，固定 100 個反應分位數，量同時／錯相循環起手的接法。
// node tools/round7-crowd.mjs > artifacts/round7/crowd-head.json
import { pathToFileURL } from 'node:url';
import { createState, tick } from '../src/sim.mjs';
import { MOVES } from '../src/data.mjs';
import { CLASH, interceptOpening, resolveSwing, windOf } from '../src/arts.mjs';
import { BAND_CLASH, bandSyncDelay } from '../src/threat.mjs';
import { teach, TEACH } from '../src/wuxia.mjs';

const KINDS = ['read', 'dodge', 'parry', 'hit'];
const NUMBERS = [1, 2, 3, 4, 6];
const SAMPLES = 100;
const SEED = 21;
const CYCLES = 4;
const bandWind = BAND_CLASH.monCd * CLASH.monWind;

function day20() {
  const state = createState(SEED, { kind: 'template', id: 'guojing', askMajor: false });
  while (state.day < 20) tick(state, 6);
  const master = state.ds.find((d) => d.id === 'hero');
  // N50 removes the guaranteed opening master. Give this fixed combat fixture
  // the same third lesson from Hong Qigong explicitly; the crowd probe compares
  // timing with an already learned technique, not the chance to meet a master.
  teach(state, master, 'xianglong', TEACH.xp[2], ['jianlong', 'feilong', 'kanglong']);
  // 同級好手用郭靖自己已會的「亢龍」作對手招；同一門武學、同一火候，前搖較短。
  const peerMove = MOVES.find((m) => m.id === 'kanglong' && master.moves.includes(m.id));
  if (!peerMove) throw new Error('第 20 日郭靖尚未會亢龍，請檢查固定情境');
  return { state, master, peerMove };
}

function attackSchedule(mode, n) {
  const cd = BAND_CLASH.monCd;
  const actors = Array.from({ length: n }, (_, j) => ({ j, left: CYCLES, next: mode === 'staggered' ? j * cd / n : 0 }));
  const starts = [];
  while (actors.some((a) => a.left > 0)) {
    const at = Math.min(...actors.filter((a) => a.left > 0).map((a) => a.next));
    const ready = actors.filter((a) => a.left > 0 && a.next <= at + 1e-9);
    const snapshot = actors.map((a) => ({ hp: a.left > 0 ? 1 : 0, ring: 1, foe: 'master', cool: a.next - at }));
    const delays = ready.map((a) => bandSyncDelay(snapshot[a.j], snapshot));
    for (let i = 0; i < ready.length; i++) {
      const a = ready[i];
      if (delays[i] > 0) a.next = at + delays[i];
      else { starts.push({ at, j: a.j, cycle: CYCLES - a.left }); a.left--; a.next = at + cd; }
    }
  }
  return starts;
}

function oneCell(master, state, foe, peerMove, mode, n) {
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0]));
  const wind = foe === 'bandit' ? bandWind : windOf(master, peerMove.id, peerMove.cd);
  const starts = attackSchedule(mode, n);
  for (let i = 0; i < SAMPLES; i++) {
    const d = structuredClone(master); d.posture = 100; d.fret = 0; d.raging = false; d.rageUntil = 0; d.busyUntil = state.t;
    const s = { t: state.t, fx: [], log: [], chron: [], codex: structuredClone(state.codex) };
    const events = [];
    const attackers = Array.from({ length: n }, (_, j) => {
      const atk = foe === 'bandit'
        ? { uid: `bandit${j}`, k: 'bandit', i: j, agi: BAND_CLASH.agi[j % BAND_CLASH.agi.length], hp: 50, pos: [d.pos[0] + 20, d.pos[1]] }
        : { ...structuredClone(master), id: `peer${j}`, uid: `peer${j}`, pos: [d.pos[0] + 20, d.pos[1]] };
      const ctx = { wind, depth: foe === 'bandit' ? 2 : undefined, move: foe === 'peer' ? peerMove.id : undefined };
      return { atk, ctx };
    });
    const q = (i + 0.5) / SAMPLES; // 同一分位數讓各人可直接比較；每格重跑完整 100 分位數
    for (const { at, j, cycle } of starts) {
      const attack = { at: state.t + at, j, cycle, ...attackers[j], q, opening: null };
      events.push({ at: attack.at, phase: 0, attack }, { at: attack.at + wind, phase: 1, attack });
    }
    // 同刻先結算已落下的招，再處理新起手；同一刻的多名攻擊者按固定編號。
    events.sort((a, b) => a.at - b.at || b.phase - a.phase || a.attack.j - b.attack.j);
    for (const { at, phase, attack } of events) {
      s.t = at;
      // 此探針隔離「手上動作佔用時間」；每招回到同一焦躁狀態，不混入 N29 長戰壓力。
      d.fret = 0; d.raging = false; d.rageUntil = 0;
      if (phase === 0) {
        const start = interceptOpening(s, attack.atk, d, () => attack.q, attack.ctx);
        if (start.read) { counts[start.read.kind]++; attack.done = true; }
        else attack.opening = start.opening;
      } else if (!attack.done) counts[resolveSwing(s, attack.atk, d, () => attack.q, { ...attack.ctx, opening: attack.opening }).kind]++;
    }
  }
  const total = n * CYCLES * SAMPLES;
  return { n, total, counts, ratio: Object.fromEntries(KINDS.map((k) => [k, +(counts[k] / total).toFixed(3)])) };
}

export function runCrowd() {
  const { state, master, peerMove } = day20();
  const rows = [];
  for (const foe of ['bandit', 'peer']) for (const mode of ['simultaneous', 'staggered']) for (const n of NUMBERS)
    rows.push({ foe, mode, ...oneCell(master, state, foe, peerMove, mode, n) });
  return { seed: SEED, day: state.day, samples: SAMPLES, cycles: CYCLES, cadence: BAND_CLASH.monCd, syncWait: BAND_CLASH.syncWait, hero: { name: master.name, wu: master.wu, agility: master.skills.agility },
    opponents: { bandit: { name: '持刀嘍囉', wind: bandWind, depth: 2 }, peer: { name: '同級好手', move: peerMove.id, wind: windOf(master, peerMove.id, peerMove.cd) } }, rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(runCrowd(), null, 2));
