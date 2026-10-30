// loop6 M6：人以群分——外向的人主動交友、強者吸引人靠近。只在 s.draw 開啟時生效（golden 不變）。
export const DRAW = {
  extroTraits: ['sociable', 'glib', 'playful', 'bold'], // 只出現在 E 型的特質
  chatMul: 1.35,       // 外向者想找人聊的意願
  extroPull: 6,        // 被選為聊天對象時，外向者加分（同好感度刻度）
  powPull: 0.25,       // 每 1 點武力差加分，上限 powCap
  powCap: 12,
  admireGap: 20,       // 對方武力高出這麼多 → 仰慕
  admireRel: 2,
  affBand: 10,         // 只在好感度接近最佳者的人選裡比吸引力（避免拆散既有交情）        // 仰慕額外關係
};
export const isExtro = (d) => (d.mbti ? d.mbti[0] === 'E' : (d.personality || []).some((t) => DRAW.extroTraits.includes(t)));
const MARTIAL = ['palm', 'leg', 'sword', 'fist', 'staff', 'blade'];
export function powOf(d) { const k = d.skills || {}; return (k.strength || 0) + (k.agility || 0) + Math.max(0, ...MARTIAL.map((m) => k[m] || 0)); }
export function drawOf(d, o) { return (isExtro(o) ? DRAW.extroPull : 0) + Math.min(DRAW.powCap, Math.max(0, powOf(o) - powOf(d)) * DRAW.powPull); }
export function drawBoost(s, d, out) { if (!s.draw || !isExtro(d)) return; for (const o of out) if (o.act === 'chat') o.score *= DRAW.chatMul; }
export function pickChatMate(s, d, mates, aff) { if (!mates.length) return undefined; const best = Math.max(...mates.map((o) => aff(s, d, o))); return mates.filter((o) => aff(s, d, o) >= best - DRAW.affBand).sort((a, b) => (aff(s, d, b) + drawOf(d, b)) - (aff(s, d, a) + drawOf(d, a)))[0]; }
// 聊完：弱的一方若對方明顯更強 → 仰慕（多一點關係＋一則想法）
export function admire(s, d, p, relAdd, think, log) {
  if (!s.draw) return;
  for (const [a, b] of [[d, p], [p, d]]) if (powOf(b) - powOf(a) >= DRAW.admireGap) {
    relAdd(s, a, b, DRAW.admireRel); think(s, a, 'admire', `（${b.name}）`);
    const K = `adm|${a.id}|${b.id}`; (s.memTalk ??= {}); if (s.memTalk[K] !== s.day) { s.memTalk[K] = s.day; log(s, `${a.name}對${b.name}的功夫心生仰慕`, 'low'); }
  }
}
