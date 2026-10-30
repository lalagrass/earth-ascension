// M15 演武：外功場上的木人波次。trialTick 是遊戲與 runTrial 共用的一步；runTrial 不用亂數、不改人。
import { TRIAL, DEFENSE } from './data.mjs';
import { period, bestMove } from './forms.mjs';
import { prowess } from './martial.mjs';
import { activeEnemies } from './raid.mjs';
import { hurt } from './injury.mjs';

export const trialDmg = (p) => TRIAL.HIT * (1 + prowess(p)) * (0.7 + 0.06 * p.attrs.li);

// 第 k 波：k 個木人在人左右站開（只影響畫面與出招方向）。
function wave(k) {
  return TRIAL.MEN.slice(0, k).map(([dx, dy]) => ({ dx, dy, ang: Math.atan2(dy, dx), hp: TRIAL.HP }));
}

export function newTrial(p, energy) {
  const move = bestMove(p);
  return { move, every: period(p.moves[move] ?? 0), dmg: trialDmg(p), energy, e0: energy, t: 0, wave: 1, men: wave(1), waveAt: 0, next: period(p.moves[move] ?? 0), waves: 0, ticks: [], done: false };
}

// 一步：先扣站著的木人的精力，再看撐不撐得住，到了出手時間就打第一個還站著的木人。回傳這一下打中的木人（畫面用）。
export function trialTick(tr) {
  if (tr.done) return null;
  tr.t++;
  const up = tr.men.filter((m) => m.hp > 0);
  tr.energy = Math.max(0, tr.energy - TRIAL.DRAIN * up.length);
  if (tr.energy < DEFENSE.FIGHT_QUIT) { tr.done = true; return null; }
  if (tr.t < tr.next) return null;
  const m = up[0];
  m.hp -= tr.dmg;
  tr.next = tr.t + tr.every;
  if (tr.men.every((x) => x.hp <= 0)) {
    tr.ticks.push(tr.t - tr.waveAt);
    tr.waves++;
    if (tr.wave >= TRIAL.WAVES) tr.done = true;
    else { tr.wave++; tr.men = wave(tr.wave); tr.waveAt = tr.t; tr.next = tr.t + tr.every; }
  }
  return m;
}

export const trialRecord = (tr) => ({ waves: tr.waves, ticks: [...tr.ticks] });

// 用這個人現在的招式與屬性從頭跑到結束，不改任何東西。
export function runTrial(p, energy = 100) {
  const tr = newTrial(p, energy);
  while (!tr.done) trialTick(tr);
  return trialRecord(tr);
}

// 誰的成績比較好：撐的波數多，同波數比第一波快。
export const better = (a, b) => !b || a.waves > b.waves || (a.waves === b.waves && (a.ticks[0] ?? Infinity) < (b.ticks[0] ?? Infinity));

export function trialText(name, r) {
  return r.waves ? `演武：${name}撐過 ${r.waves} 波（第一波 ${r.ticks[0]} 刻）` : `演武：${name}第一波就撐不住`;
}

// 能不能開演武：回傳 { ok, why }。
export function canTrial(state, p) {
  if (!state.built.includes('yard')) return { ok: false, why: '還沒有外功場' };
  if (p.guest) return { ok: false, why: '訪客不演武' };
  if (p.exp) return { ok: false, why: '正在遠征' };
  if (hurt(p)) return { ok: false, why: '受了傷，先養傷' };
  if (activeEnemies(state).length) return { ok: false, why: '有敵人在場' };
  if (state.people.some((o) => o.task?.kind === 'trial')) return { ok: false, why: '已經有人在演武' };
  if (p.needs.energy < TRIAL.MIN_ENERGY) return { ok: false, why: `太累了（精力 ${Math.floor(p.needs.energy)}，要 ${TRIAL.MIN_ENERGY}）` };
  return { ok: true, why: '' };
}
