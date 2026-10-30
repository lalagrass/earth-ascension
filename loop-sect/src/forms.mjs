// M13 出招演出：每一門招式的形狀、熟練決定的節奏與大小。只寫 p.strike，不用亂數、不進雜湊。
import { MOVES, STRIKE, FORMS } from './data.mjs';

const BY_ID = Object.fromEntries(MOVES.map((m) => [m.id, m]));
export const formOf = (moveId) => BY_ID[moveId].form;

export const period = (v) => Math.round(STRIKE.BASE * (1 - STRIKE.FAST * v / 100));
export const sizeOf = (v) => STRIKE.SIZE0 + STRIKE.SIZE_GAIN * v / 100;

// 形狀描述（格為單位、張角為弧度），render 與測試共用。
export function shapeOf(form, size) {
  const f = FORMS[form];
  return { shape: f.shape, reach: f.reach * size, spread: f.spread * Math.PI / 180, width: (f.width ?? 0) * size, step: f.step ?? 0 };
}

// 迎敵時出最強的招：威力 × 熟練最大。
export function bestMove(p) {
  let best = null, bv = -1;
  for (const [id, v] of Object.entries(p.moves)) { const s = BY_ID[id].power * Math.max(v, 1); if (s > bv) { bv = s; best = id; } }
  return best;
}

const STRIKES = new Set(['drill', 'spar', 'fight']);

// 每 tick 呼叫：在練功、切磋、迎敵（已交手）時，到了間隔就出一招；方向朝木樁、對手或敵人。
export function stepStrike(state, p, target) {
  if (p.act !== 'do' || !STRIKES.has(p.task?.kind)) { p.strikeNext = null; return; }
  const move = p.task.kind === 'fight' ? bestMove(p) : p.task.move;
  const v = p.moves[move] ?? 0;
  if (p.strikeNext == null) p.strikeNext = state.tick;
  if (state.tick < p.strikeNext) return;
  const ang = target ? Math.atan2(target.y - p.y, target.x - p.x) : 0;
  p.strike = { move, form: formOf(move), kind: p.task.kind, at: state.tick, ang, size: sizeOf(v), n: (p.strike?.n ?? 0) + 1 };
  p.strikeNext = state.tick + period(v);
  state.counts.strikes = (state.counts.strikes || 0) + 1;
}
