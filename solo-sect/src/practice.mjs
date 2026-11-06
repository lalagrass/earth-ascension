// N33 共用成長底層：只讀武學資料，不依賴 arts.mjs／DOM。
import { ARTS, MOVES, ENEMIES, TIERS } from './data.mjs';
import { FOE_ACTIONS, bodyMove } from './starter-combat.mjs';
export const PRACTICE = Object.freeze({ halfUses: 50, alpha: Math.log(2) / Math.log(51), bodyScale: 10, reactionFloor: .2, reactionSpan: .4, eyeHalf: 3, ordinaryWu: 3, reactionShape: 2, codexUnit: 1, eventLimit: 512, familyTransfer: .5 });
// Each row is a prior history in effective exchanges. Bare actors use tier -1.
export const TRAINING_HISTORY = Object.freeze([
  { tier: 0, uses: 4 }, { tier: 1, uses: 12 }, { tier: 2, uses: 50 },
  { tier: 3, uses: 120 }, { tier: 4, uses: 250 },
]);
const tierOfXp = (xp) => { let tier = 0; for (let i = 0; i < TIERS.length; i++) if (xp >= TIERS[i][0]) tier = i; return tier; };
const artCache = new Map();
function artForMove(move) {
  if (!artCache.has(move)) artCache.set(move, ARTS.find((a) => a.tech === move || a.techs?.includes(move)) || ARTS.find((a) => a.id === MOVES.find((m) => m.id === move)?.fx) || null);
  return artCache.get(move);
}
export const moveTier = (d, move) => { const art = artForMove(move); return art && d?.arts?.[art.id] ? tierOfXp(d.arts[art.id].xp) : -1; };
let combatArts;
export function veteranTier(d) {
  if (d?.k) return ENEMIES[d.k]?.practiceTier ?? -1;
  combatArts ??= new Set(ARTS.filter((a) => a.school !== 'inner' && a.school !== 'step').map((a) => a.id));
  let tier = -1;
  for (const [id, progress] of Object.entries(d?.arts || {})) if (combatArts.has(id)) tier = Math.max(tier, tierOfXp(progress.xp));
  return tier;
}
export const priorUses = (tier) => TRAINING_HISTORY[tier]?.uses || 0;
const FAMILY_BY_MOVE = new Map(Object.values(FOE_ACTIONS).flatMap((foe) => foe.moves.map((m) => [m.id, m.family])));
export const moveFamily = (move) => FAMILY_BY_MOVE.get(move) || bodyMove(move)?.type || (move === 'fist' ? 'punch' : move);
export const learningWeight = (p) => 4 * p * (1 - p);
export const practiceResidual = (n = 0) => (1 + n) ** -PRACTICE.alpha;
export const handUses = (d, move) => Math.max(d?.practice?.hands?.[move] || 0, priorUses(d?.k ? veteranTier(d) : moveTier(d, move)));
export function ensurePractice(d, codex = {}) {
  d.practice ??= { hands: {}, eyes: {}, origin: Object.fromEntries(Object.entries(codex).map(([k,v]) => [k, (v.insight || 0) / PRACTICE.codexUnit])) };
  d.practice.families ??= {};
  return d.practice;
}
export const eyeKey = (attacker, move) => `${attacker?.k || 'human'}:${move}`;
export function familiarUses(d, attacker, move, codex = {}) {
  const key = eyeKey(attacker, move);
  const oldCodex = d?.practice?.origin?.[attacker?.k] ?? (!d?.practice && attacker?.k ? (codex[attacker.k]?.insight || 0) / PRACTICE.codexUnit : 0);
  const related = (d?.practice?.families?.[moveFamily(move)] || 0) * PRACTICE.familyTransfer;
  return Math.max(d?.practice?.eyes?.[key] || 0, oldCodex || 0, priorUses(veteranTier(d)), related);
}
export function familiarReaction(d, attacker, move, codex = {}) {
  const f = familiarUses(d, attacker, move, codex), half = PRACTICE.eyeHalf * PRACTICE.ordinaryWu / (d?.wu || d?.root || PRACTICE.ordinaryWu);
  return PRACTICE.reactionFloor + PRACTICE.reactionSpan * half / (half + f);
}
export function practiceWindow(d, move, start, { tier = d?.k ? veteranTier(d) : 0, skill = 'agility' } = {}) {
  const body = d?.skills?.[skill] || d?.agi || 0;
  const floor = start / (1 + body / PRACTICE.bodyScale + Math.max(0, tier));
  const residual = practiceResidual(handUses(d, move));
  return { start, floor, n: handUses(d, move), residual, wind: floor + (start - floor) * residual };
}
export function emitPractice(s, row) {
  if (!s?.captureEvents) return;
  (s.events ||= []).push({ t: s.t, day: s.day, ...row });
  if (s.events.length > PRACTICE.eventLimit) s.events.splice(0, s.events.length - PRACTICE.eventLimit);
}
export function recordExchange(s, attacker, defender, move, p, result) {
  const w = learningWeight(p), priorHand = handUses(attacker, move), priorEye = familiarUses(defender, attacker, move, s?.codex);
  const a = ensurePractice(attacker, s?.codex), d = ensurePractice(defender, s?.codex), key = eyeKey(attacker, move), family = moveFamily(move);
  a.hands[move] = priorHand + w;
  d.eyes[key] = priorEye + w;
  (d.families ||= {})[family] = (d.families[family] || 0) + w;
  const row = { type: 'exchange', attacker: attacker.id || attacker.uid || attacker.k, defender: defender.id || defender.uid || defender.k, move, p, w, kind: result.kind, hand: a.hands[move], eye: d.eyes[key] };
  emitPractice(s, row); return row;
}
export function rehearse(s, d, moves, seconds, { partner = null } = {}) {
  const hand = ensurePractice(d, s?.codex).hands;
  for (const mv of moves) {
    // 自己可把節奏放慢一倍；對練最多只練到夥伴現有手熟，不憑空刷出高手。
    const p = partner ? 1 / (1 + (handUses(partner,mv.id) + 1) / (handUses(d,mv.id) + 1)) : 2 / 3;
    const w = learningWeight(p), attempts = seconds / mv.cd / moves.length;
    const current = handUses(d,mv.id), gain = partner ? Math.min(w * attempts, Math.max(0, handUses(partner,mv.id) - current)) : w * attempts;
    hand[mv.id] = current + gain;
    emitPractice(s, { type:'practice', who:d.id, move:mv.id, p, w, attempts, gain, n:hand[mv.id] });
  }
}
export function practiceWork(s, d, act, seconds) {
  const key = `work:${act}`, hand = ensurePractice(d, s?.codex).hands;
  // 勞動的可控制節奏同樣以兩倍所需時間練，沒有額外的視覺經驗條。
  const p = 2 / 3, w = learningWeight(p);
  hand[key] = (hand[key] || 0) + w;
  emitPractice(s, { type:'work', who:d.id, move:key, seconds, p, w, n:hand[key] });
}
