// loop36：阻斷視窗排隊（外部審查 P2：首次巡山戰報與東方不敗抉擇同時彈出、互相遮住）。
// 一次只顯示一個；已開著的那個先看完。待顯示的依序：大事（剛發生的事，含戰報）→ 抉擇 → 章節總結。純介面，不碰模擬。
export const MODAL_ORDER = ['alert', 'choice', 'chap'];
export function pickModal({ cur = null, alert = false, choice = false, chap = false } = {}) {
  const want = { alert, choice, chap };
  if (cur && want[cur]) return cur;
  return MODAL_ORDER.find((k) => want[k]) || null;
}
export const pending = (S) => ({ alert: !!S?.alert, choice: !!(S?.hero?.askMajor && S?.choices?.[0]), chap: !!(S?.chapter?.done && !S.chapter.seen) });
