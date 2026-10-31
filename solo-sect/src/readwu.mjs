/* loop140 讀書長悟性 `readwu`（決定 120；借鏡大俠立志傳「悟性靠讀書」，只做最小版）。
   s.readwu 開時，每完成一次「藏經閣研讀」記一次；累積 READWU.need 次悟性 +1（每人一生一次、不超過 5）。 */
export const READWU = { need: 30, max: 5 };
export function readStudy(s, d) { if (!s?.readwu || d.rwDone) return null;
  d.rw = (d.rw || 0) + 1; if (d.rw < READWU.need) return null;
  d.rwDone = true; const w0 = d.wu ?? d.root ?? 3; if (w0 >= READWU.max) return null; d.wu = w0 + 1; return d.wu; }
export const readwuNote = (s, d) => (!s?.readwu ? '' : d.rwDone ? '（讀書已開竅）' : `（研讀 ${d.rw || 0}/${READWU.need}）`);
