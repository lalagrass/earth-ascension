// 武俠小鎮 W6（#558）：切磋判定。#562 W6-11：判定只經過這個檔的介面，第二系列會整個換成「時間對決」。
// 其他系統（W3 決策、W5 心念、畫面、報告）只能用 startBout／stepBout／boutOutcome／boutView，不直接讀「勢」。
// 純函式、確定性：亂數一律由呼叫端傳入 rng（引擎裡是 game.rng()）。
import sparJson from '../../../data/wuxia/spar.json';

export const SPAR = sparJson as unknown as {
  places: string[];
  maxFatigue: number;
  motivation: string[];
  agreeFistGap: number;
  coachAlwaysAgrees: string;
  perPairPerDay: number;
  score: number;
  roundMs: number;
  maxRounds: number;
  activityMinutes: number;
  approachMinutes: number;
  ring: Record<string, [number, number][]>;
  reaction: { base: number; div: number; stanceDiv: number; min: number; max: number };
  shi: { base: number; staminaDiv: number };
  moves: string[];
  firstAttacker: 'coin';
  growth: { act: string; key: 'fist'; minutes: number };
  needsAfter: Record<string, number>;
  narrationMaxChars: number;
};

/** 判定看的技能（W4 的四項）。 */
export type Fighter = { fist: number; power: number; stance: number; stamina: number };

export type Exchange = {
  /** 第幾回合（1 起） */
  round: number;
  /** 進攻方：0＝發起人、1＝對方 */
  att: 0 | 1;
  move: string;
  /** 守方反應成功率（記下來給報告與單元測試） */
  p: number;
  /** true＝守方沒反應過來、被擊中 */
  hit: boolean;
};

/**
 * 一場切磋的判定狀態。「勢」只在這裡（shi），其他系統看 boutView／boutOutcome。
 * 第二系列換成時間對決時，換掉這個型別與下面的函式即可。
 */
export type Bout = {
  kind: 'odds-v1';
  fighters: [Fighter, Fighter];
  shi: [number, number];
  shi0: [number, number];
  att: 0 | 1;
  round: number;
  log: Exchange[];
  /** 0／1＝那一方贏；'draw'＝平手；undefined＝還在打 */
  winner?: 0 | 1 | 'draw';
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round4 = (v: number) => Math.round(v * 1e4) / 1e4;

/** #558：反應成功率 = clamp(0.5 + (守.拳腳 + 守.下盤/2 − 攻.拳腳) / 600, 0.1, 0.9) */
export function reactionChance(attacker: Fighter, defender: Fighter): number {
  const r = SPAR.reaction;
  return round4(
    clamp(r.base + (defender.fist + defender.stance / r.stanceDiv - attacker.fist) / r.div, r.min, r.max),
  );
}

/** #558：起始勢 = 3 + 耐力/250（取整數）。 */
export function startingShi(f: Fighter): number {
  return Math.floor(SPAR.shi.base + f.stamina / SPAR.shi.staminaDiv);
}

/**
 * #562 W6-11 的單一介面：一次攻防。先用 rng 選招（只給畫面與旁白），再用 rng 判定守方反應。
 * 每次固定耗 2 個亂數。
 */
export function resolveExchange(
  attacker: Fighter,
  defender: Fighter,
  rng: () => number,
): { move: string; p: number; hit: boolean } {
  const move = SPAR.moves[Math.min(SPAR.moves.length - 1, Math.floor(rng() * SPAR.moves.length))];
  const p = reactionChance(attacker, defender);
  const hit = !(rng() < p);
  return { move, p, hit };
}

/** first：誰先出手（引擎裡由 game.rng() 擲，見 spar.json firstAttacker）。 */
export function startBout(challenger: Fighter, other: Fighter, first: 0 | 1 = 0): Bout {
  const shi: [number, number] = [startingShi(challenger), startingShi(other)];
  return {
    kind: 'odds-v1',
    fighters: [{ ...challenger }, { ...other }],
    shi,
    shi0: [shi[0], shi[1]],
    att: first,
    round: 0,
    log: [],
  };
}

/** 打一回合。已分出結果就不動、回傳 undefined。 */
export function stepBout(bout: Bout, rng: () => number): Exchange | undefined {
  if (bout.winner !== undefined) return undefined;
  const att = bout.att;
  const def = (1 - att) as 0 | 1;
  const r = resolveExchange(bout.fighters[att], bout.fighters[def], rng);
  bout.round += 1;
  const ex: Exchange = { round: bout.round, att, move: r.move, p: r.p, hit: r.hit };
  bout.log.push(ex);
  if (r.hit) {
    bout.shi[def] -= 1;
    if (bout.shi[def] <= 0) {
      bout.shi[def] = 0;
      bout.winner = att;
      return ex;
    }
  } else {
    bout.att = def;
  }
  if (bout.round >= SPAR.maxRounds) bout.winner = 'draw';
  return ex;
}

/** 擲先手：rng() < 0.5 → 發起人（0）先出手。耗 1 個亂數。 */
export function firstAttacker(rng: () => number): 0 | 1 {
  return rng() < 0.5 ? 0 : 1;
}

/** 一口氣打完（spar-sim 與單元測試用）：先擲先手，再逐回合打。 */
export function runBout(challenger: Fighter, other: Fighter, rng: () => number): Bout {
  const bout = startBout(challenger, other, firstAttacker(rng));
  while (bout.winner === undefined) stepBout(bout, rng);
  return bout;
}

export type BoutOutcome = { done: boolean; winner?: 0 | 1 | 'draw'; rounds: number; hits: [number, number] };

export function boutOutcome(bout: Bout): BoutOutcome {
  const hits: [number, number] = [0, 0];
  for (const e of bout.log) if (e.hit) hits[e.att] += 1;
  return { done: bout.winner !== undefined, winner: bout.winner, rounds: bout.round, hits };
}

/** 畫面用：頭上圓點（剩幾點／起始幾點）、最後一招。 */
export type BoutView = {
  dots: [number, number];
  max: [number, number];
  last?: Exchange;
  /** 目前誰佔上風：剩餘勢比例高的一方；相同時 undefined */
  ahead?: 0 | 1;
};

export function boutView(bout: Bout): BoutView {
  const ratio = (i: 0 | 1) => bout.shi[i] / Math.max(1, bout.shi0[i]);
  const a = ratio(0);
  const b = ratio(1);
  return {
    dots: [bout.shi[0], bout.shi[1]],
    max: [bout.shi0[0], bout.shi0[1]],
    last: bout.log[bout.log.length - 1],
    ahead: a === b ? undefined : a > b ? 0 : 1,
  };
}
