// 武俠小鎮 W4（#556）：練功與技能的資料（data/wuxia/training.json、characters.json 的 skills）與純函式。
// 引擎、前端、工具共用；不碰世界狀態。
import trainingJson from '../../../data/wuxia/training.json';
import { profileById } from '../w02_folk';

export const SKILL_KEYS = ['fist', 'power', 'stance', 'stamina'] as const;
export type SkillKey = (typeof SKILL_KEYS)[number];
export type Skills = Record<SkillKey, number>;

export const SKILL_LABELS: Record<SkillKey, string> = {
  fist: '拳腳',
  power: '力',
  stance: '下盤',
  stamina: '耐力',
};

export type Tier = { min: number; name: string; emoji: string };

export const TRAINING = trainingJson as unknown as {
  max: number;
  display: number;
  exponent: number;
  coachBonus: number;
  tiredAbove: number;
  tiredFactor: number;
  base: number;
  activities: Record<string, { weight: Partial<Skills> }>;
  tiers: Tier[];
  strikes: { base: number; per: number };
};

/** 練功活動（objects.json 裡屬於 w04-dojo 的活動）。 */
export const TRAINING_ACTS = new Set(Object.keys(TRAINING.activities));
export const COACH_ID = 'zhou-jiaotou';
export const COACH_ACT = 'coach';

/** 起始技能值（characters.json 的 skills；沒寫的算 0）。 */
export function initialSkills(cid: string): Skills {
  const s = (profileById(cid) as any)?.skills ?? {};
  const out = {} as Skills;
  for (const k of SKILL_KEYS) out[k] = Math.max(0, Math.min(TRAINING.max, Math.trunc(s[k] ?? 0)));
  return out;
}

/** 每遊戲分鐘的成長量（未乘分鐘數）。 */
export function gainPerMinute(
  act: string,
  key: SkillKey,
  level: number,
  coach: boolean | number,
  fatigue: number,
): number {
  const w = TRAINING.activities[act]?.weight[key] ?? 0;
  if (!w) return 0;
  const room = Math.max(0, 1 - level / TRAINING.max);
  // W7：coach 也可以直接給倍率（師父在場的 2.0）；true／false 照舊是 coachBonus／1
  const bonus = typeof coach === 'number' ? coach : coach ? TRAINING.coachBonus : 1;
  const tired = fatigue > TRAINING.tiredAbove ? TRAINING.tiredFactor : 1;
  return TRAINING.base * w * Math.pow(room, TRAINING.exponent) * bonus * tired;
}

export function tierOf(level: number): Tier {
  let t = TRAINING.tiers[0];
  for (const x of TRAINING.tiers) if (level >= x.min) t = x;
  return t;
}

/** #556：打樁時每遊戲分鐘打樁數 = 5 + fist/40（取整）。 */
export function strikesPerMinute(fist: number): number {
  return Math.floor(TRAINING.strikes.base + fist / TRAINING.strikes.per);
}

/** 顯示用：/10 取一位小數。 */
export function showSkill(level: number): string {
  return (level / TRAINING.display).toFixed(1);
}

/** 打樁頭上的字：「打樁 ×7」。 */
export function dummyLabel(fist: number): string {
  return `打樁 ${strikesPerMinute(fist)}下/分`;
}
