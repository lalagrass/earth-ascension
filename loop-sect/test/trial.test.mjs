import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, placeBlueprint, startTrial, stateHash } from '../src/sim.mjs';
import { canTrial, runTrial, newTrial, trialTick } from '../src/trial.mjs';
import { spawnEnemy } from '../src/raid.mjs';
import { TRIAL, DEFENSE, TICKS_PER_DAY } from '../src/data.mjs';
import { period, bestMove } from '../src/forms.mjs';

const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
const fed = (s) => { for (const p of s.people) p.needs = { food: 95, energy: 95, social: 95, fun: 95 }; };
function withYard(seed = 4) {
  const s = world(seed);
  s.raids = []; s.visits = [];
  s.stock.wood = 40; s.stock.stone = 20;
  assert.ok(placeBlueprint(s, 'yard').ok);
  for (let i = 0; i < 3 * TICKS_PER_DAY && !s.built.includes('yard'); i++) { fed(s); step(s); }
  assert.ok(s.built.includes('yard'), '外功場應該完工');
  return s;
}
const yardWorld = withYard();

test('M15-A1 能不能開：各種不能開的原因；可以時開始', () => {
  const s0 = world();
  const a0 = s0.people[0];
  a0.needs.energy = 95;
  assert.match(canTrial(s0, a0).why, /外功場/);
  assert.equal(startTrial(s0, a0.id).ok, false);

  const s = structuredClone(yardWorld);
  const [a, b] = s.people;
  fed(s);
  assert.ok(canTrial(s, a).ok);
  a.needs.energy = TRIAL.MIN_ENERGY - 1;
  assert.match(canTrial(s, a).why, /太累/);
  a.needs.energy = 95;
  a.exp = true; assert.match(canTrial(s, a).why, /遠征/); a.exp = false;
  a.guest = { arrived: 0, until: 1e9 }; assert.match(canTrial(s, a).why, /訪客/); a.guest = null;
  const e = spawnEnemy(s, 'boar', 30);
  assert.match(canTrial(s, a).why, /敵人/);
  e.hp = 0;
  assert.ok(startTrial(s, a.id).ok);
  assert.equal(a.task.kind, 'trial');
  assert.match(canTrial(s, b).why, /已經有人/);
});

test('M15-A2 波次：第 k 波 k 個木人、站著的扣精力、紀錄與 runTrial 相同', () => {
  const p = { moves: { changquan: 0 }, attrs: { li: 5 } };
  const tr = newTrial(p, 100);
  const seen = new Map();
  let prevE = tr.energy;
  while (!tr.done) {
    const up = tr.men.filter((m) => m.hp > 0).length;
    const w = tr.wave;
    trialTick(tr);
    if (!seen.has(w)) seen.set(w, tr.men.length);
    if (!tr.done && tr.wave === w) assert.ok(Math.abs(prevE - tr.energy - TRIAL.DRAIN * up) < 1e-9, '每個站著的木人扣 DRAIN');
    prevE = tr.energy;
  }
  for (const [w, n] of seen) if (w === tr.wave || seen.has(w + 1)) assert.equal(n, w, `第 ${w} 波 ${w} 個木人`);
  assert.ok(tr.waves === TRIAL.WAVES || tr.energy < DEFENSE.FIGHT_QUIT, '打完五波或精力見底才結束');
  assert.equal(tr.ticks.length, tr.waves);
  assert.deepEqual(runTrial(p), { waves: 3, ticks: [48, 96, 144] }, '規格粗估：第一日的人撐過 3 波、第一波 48 刻');

  // 遊戲裡跑完的紀錄與開始那一刻 runTrial 的結果相同。
  const s = structuredClone(yardWorld);
  fed(s);
  const a = s.people[0];
  assert.ok(startTrial(s, a.id).ok);
  let expect = null;
  for (let i = 0; i < 2000 && !s.events.some((x) => x.kind === 'trial'); i++) {
    for (const o of s.people) if (o !== a) o.needs = { food: 95, energy: 95, social: 95, fun: 95 };
    if (a.act !== 'do') { a.needs.food = 95; a.needs.energy = 95; }
    step(s);
    if (!expect && a.act === 'do' && a.task?.kind === 'trial') expect = runTrial({ ...a, moves: { ...a.moves } }, a.task.trial.e0);
  }
  assert.ok(expect, '應該開打');
  assert.deepEqual(a.trialBest, expect);
});

test('M15-A3 越強越快；runTrial 不改人', () => {
  const p = { moves: { changquan: 20 }, attrs: { li: 5 } };
  const before = JSON.stringify(p);
  const lo = runTrial(p);
  assert.equal(JSON.stringify(p), before, 'runTrial 不改人');
  const hi = runTrial({ ...p, moves: { changquan: 80 } });
  assert.ok(hi.ticks[0] < lo.ticks[0], `熟練 80 第一波 ${hi.ticks[0]} 刻，熟練 20 ${lo.ticks[0]} 刻`);
  assert.ok(hi.waves >= lo.waves);
  assert.equal(period(80) < period(20), true);
  assert.equal(bestMove(p), 'changquan');
});

test('M15-A4 遊戲裡：走到外功場才開打、紀事與最好成績、結束後回到自主行動', () => {
  const s = structuredClone(yardWorld);
  fed(s);
  const a = s.people[0];
  const h0 = stateHash(s);
  assert.ok(startTrial(s, a.id).ok);
  assert.notEqual(stateHash(s), h0);
  let started = null, hitWhileWalking = false, ended = null;
  for (let i = 0; i < 2000; i++) {
    for (const o of s.people) if (o !== a) o.needs = { food: 95, energy: 95, social: 95, fun: 95 };
    if (a.act !== 'do') { a.needs.food = 95; a.needs.energy = 95; }
    step(s);
    if (a.task?.kind === 'trial' && a.act === 'walk' && a.strike?.kind === 'trial') hitWhileWalking = true;
    if (started == null && a.task?.kind === 'trial' && a.act === 'do') started = { x: a.x, y: a.y };
    if (s.events.some((x) => x.kind === 'trial')) { ended = i; break; }
  }
  assert.ok(started, '應該開打');
  assert.deepEqual([Math.round(started.x), Math.round(started.y)], TRIAL.SPOT, '在外功場中間開打');
  assert.equal(hitWhileWalking, false);
  const ev = s.events.find((x) => x.kind === 'trial');
  assert.match(ev.text, /^演武：甲撐過 \d 波（第一波 \d+ 刻）$/);
  assert.ok(a.trialBest && a.trialBest.waves >= 1);
  assert.notEqual(a.task?.kind, 'trial', '結束後不在演武');
  for (let i = 0; i < 60; i++) { fed(s); step(s); }
  assert.ok(a.task && a.task.kind !== 'trial', `回到自主行動（${a.task?.kind}）`);
});
