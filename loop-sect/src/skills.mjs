// 技能：只在 finish（真的做完）時成長；效果是純函式，給 ai／sim 查。
import { SKILLS, SKILL_GAIN, SKILL_MILESTONES } from './data.mjs';

const BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const SKILL_OF_TASK = { chop: 'chop', quarry: 'quarry', build: 'build', cook: 'cook', forage: 'forage' };

export function newSkills() {
  return Object.fromEntries(SKILLS.map((s) => [s.id, 0]));
}

export function talentMul(p, id) {
  return 0.6 + 0.08 * p.attrs[BY_ID[id].attr];
}

export function gainFor(p, id) {
  const v = p.skills[id];
  return SKILL_GAIN * Math.max(0, 1 - v / 120) * talentMul(p, id);
}

// 成長；跨過門檻時回傳門檻值，讓呼叫端寫紀事。
export function grow(p, id) {
  const before = p.skills[id];
  const after = Math.min(100, before + gainFor(p, id));
  p.skills[id] = after;
  return SKILL_MILESTONES.find((m) => before < m && after >= m) ?? null;
}

const lv = (p, id) => p.skills?.[id] ?? 0;
export const extraTake = (p, id) => Math.floor(lv(p, id) / (id === 'forage' ? 40 : 35));
export const workTimeMul = (p, id) => 1 - (0.4 * lv(p, id)) / 100;
export const buildRate = (p) => 1 + lv(p, 'build') / 100;
export const extraMeal = (p) => (lv(p, 'cook') >= 60 ? 1 : 0);
export const footMul = (p) => 1 + (0.3 * lv(p, 'foot')) / 100;

// 給人物卡看的效果說明。
export function effectText(p, id) {
  const v = lv(p, id);
  const pct = (x) => `${Math.round(x)}%`;
  switch (id) {
    case 'chop': case 'quarry': return `一趟多扛 ${extraTake(p, id)}、快 ${pct(40 * v / 100)}`;
    case 'build': return `工時 ×${buildRate(p).toFixed(2)}`;
    case 'cook': return `煮得快 ${pct(40 * v / 100)}${extraMeal(p) ? '、一鍋多 1 份' : ''}`;
    case 'forage': return `多摘 ${extraTake(p, id)} 顆`;
    case 'foot': return `走得快 ${pct(30 * v / 100)}`;
    default: return '';
  }
}

export function skillLabel(id) {
  return BY_ID[id].label;
}
