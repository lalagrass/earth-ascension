// loop8 M8 同修與請教：一起練功互相砥礪、向強者請教得武學經驗、常一起練的人會結伴。
// 只在 s.mentor 開啟時生效（golden 不變）；不改任何既有成長數值，只在新路徑上「另加」一小筆。
import { powOf } from './draw.mjs';
export const MENTOR = {
  coMul: 0.25,      // 同修：同時在練的人，額外加一次 25% 的練功量
  coRel: 1,         // 同修一次加關係
  askGap: 20,       // 對方武力高出這麼多才算「請教」
  askAmt: 2,        // 請教一次的主修路數經驗（原練功一次為 5）
  pairAt: 3,        // 同修這麼多次算「練功搭子」
  pairMul: 1.15,    // 搭子正在練時，自己去練的意願
};
const training = (s, d) => s.ds.filter((o) => o !== d && !o.away && o.task?.act === 'train' && !o.path?.length);
// 練功完成時
export function coTrain(s, d, amt, grow, relAdd, log) {
  if (!s.mentor) return 0; const mates = training(s, d); if (!mates.length) return 0;
  grow(s, d, 'style', amt * MENTOR.coMul);
  for (const m of mates) { (d.mates ??= {}); d.mates[m.id] = (d.mates[m.id] || 0) + 1; if (d.id < m.id) relAdd(s, d, m, MENTOR.coRel);
    if (d.mates[m.id] === MENTOR.pairAt) log(s, `${d.name}和${m.name}常一起練功，成了練功搭子`, 'low'); }
  (s.mentorN ??= { co: 0, ask: 0 }).co++; return mates.length;
}
// 聊天／切磋完成時：弱的一方向強的一方請教
export function askStrong(s, d, p, grow, think, log) {
  if (!s.mentor || !p) return null;
  for (const [a, b] of [[d, p], [p, d]]) if (powOf(b) - powOf(a) >= MENTOR.askGap) {
    grow(s, a, 'style', MENTOR.askAmt); (s.mentorN ??= { co: 0, ask: 0 }).ask++;
    const K = `ask|${a.id}|${b.id}`; (s.memTalk ??= {}); if (s.memTalk[K] !== s.day) { s.memTalk[K] = s.day; log(s, `${a.name}向${b.name}請教功夫，頗有心得`, 'low'); }
    return a;
  }
  return null;
}
// 評分：搭子正在練 → 想去一起練
export function pairBoost(s, d, out) {
  if (!s.mentor || !d.mates) return; const pals = training(s, d).filter((o) => (d.mates[o.id] || 0) >= MENTOR.pairAt);
  if (pals.length) for (const o of out) if (o.act === 'train') { o.score *= MENTOR.pairMul; o.why = `${pals[0].name}在練功，一起去`; }
}
