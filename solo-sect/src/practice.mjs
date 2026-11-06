// N33 共用成長底層：此模組不依賴 ARTS／DOM，人物、獸、山賊皆用同一份紀錄。
export const PRACTICE = Object.freeze({ halfUses: 50, alpha: Math.log(2) / Math.log(51), bodyScale: 10, reactionFloor: .2, reactionSpan: .4, eyeHalf: 3, ordinaryWu: 3, reactionShape: 2, codexUnit: 1, eventLimit: 512 });
export const learningWeight = (p) => 4 * p * (1 - p);
export const practiceResidual = (n = 0) => (1 + n) ** -PRACTICE.alpha;
export const handUses = (d, move) => d?.practice?.hands?.[move] || 0;
export function ensurePractice(d, codex = {}) {
  d.practice ??= { hands: {}, eyes: {}, origin: Object.fromEntries(Object.entries(codex).map(([k,v]) => [k, (v.insight || 0) / PRACTICE.codexUnit])) };
  return d.practice;
}
export const eyeKey = (attacker, move) => `${attacker?.k || 'human'}:${move}`;
export function familiarUses(d, attacker, move, codex = {}) {
  const key = eyeKey(attacker, move);
  return d?.practice?.eyes?.[key] ?? d?.practice?.origin?.[attacker?.k] ?? (!d.practice && attacker?.k ? (codex[attacker.k]?.insight || 0) / PRACTICE.codexUnit : 0);
}
export function familiarReaction(d, attacker, move, codex = {}) {
  const f = familiarUses(d, attacker, move, codex), half = PRACTICE.eyeHalf * PRACTICE.ordinaryWu / (d?.wu || d?.root || PRACTICE.ordinaryWu);
  return PRACTICE.reactionFloor + PRACTICE.reactionSpan * half / (half + f);
}
export function practiceWindow(d, move, start, { tier = 0, skill = 'agility' } = {}) {
  const body = d?.skills?.[skill] || d?.agi || 0;
  const floor = start / (1 + body / PRACTICE.bodyScale + tier);
  const residual = practiceResidual(handUses(d, move));
  return { start, floor, n: handUses(d, move), residual, wind: floor + (start - floor) * residual };
}
export function emitPractice(s, row) {
  if (!s?.captureEvents) return;
  (s.events ||= []).push({ t: s.t, day: s.day, ...row });
  if (s.events.length > PRACTICE.eventLimit) s.events.splice(0, s.events.length - PRACTICE.eventLimit);
}
export function recordExchange(s, attacker, defender, move, p, result) {
  const w = learningWeight(p), a = ensurePractice(attacker, s?.codex), d = ensurePractice(defender, s?.codex), key = eyeKey(attacker, move);
  a.hands[move] = (a.hands[move] || 0) + w;
  d.eyes[key] = (d.eyes[key] ?? d.origin[attacker?.k] ?? 0) + w;
  const row = { type: 'exchange', attacker: attacker.id || attacker.uid || attacker.k, defender: defender.id || defender.uid || defender.k, move, p, w, kind: result.kind, hand: a.hands[move], eye: d.eyes[key] };
  emitPractice(s, row); return row;
}
export function rehearse(s, d, moves, seconds, { partner = null } = {}) {
  const hand = ensurePractice(d, s?.codex).hands;
  for (const mv of moves) {
    // 自己可把節奏放慢一倍；對練最多只練到夥伴現有手熟，不憑空刷出高手。
    const p = partner ? 1 / (1 + (handUses(partner,mv.id) + 1) / (handUses(d,mv.id) + 1)) : 2 / 3;
    const w = learningWeight(p), attempts = seconds / mv.cd / moves.length;
    const gain = partner ? Math.min(w * attempts, Math.max(0, handUses(partner,mv.id) - (hand[mv.id] || 0))) : w * attempts;
    hand[mv.id] = (hand[mv.id] || 0) + gain;
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
