// 武俠小鎮 A2（#575）：給 w07-bond 呼叫的小掛鉤（只讀狀態、不寫）。a2-master 關閉時全部回 undefined／false，W7 行為與 hash 不變。
import type { WuxiaState } from '../state';
import type { MindState } from '../w05_mind/data';
import { A2_MASTER, A2State, MASTER, MASTER_CID } from './data';
import { hiddenException } from '../a4_play/data';

function st(w: WuxiaState | undefined): A2State | undefined {
  return w?.enabled[A2_MASTER] ? (w.elements[A2_MASTER] as A2State | undefined) : undefined;
}

/** 「惡行」記憶：門規違規（violated）。#575 selective「沒有『惡行』記憶的人」 */
export function hasMisdeed(mind: MindState | undefined, cid: string): boolean {
  if (!mind) return false;
  for (const p of Object.values(mind.people)) if (p.cid === cid) return p.memories.some((m) => m.kind === 'violated');
  return false;
}

/** 大師受不受這個拜師（#575 三種態度）。不是拜大師、或元素關閉時回 undefined（照 W7 原規則）。 */
export function a2BowVerdict(
  w: WuxiaState,
  mind: MindState | undefined,
  disciple: string,
  master: string,
  close: number,
  count: number,
): { accepted: boolean; reason: string } | undefined {
  const s = st(w);
  if (!s || master !== MASTER_CID) return undefined;
  if (s.policy === 'hidden') {
    // A4（#576 劇本二）：a4-play 開著時，親近 ≥ 60 破例收一人；關閉時照舊不收
    if (hiddenException(w, close, count)) return { accepted: true, reason: `不傳之秘：親近 ${close} ≥ 60，破例收一人` };
    return { accepted: false, reason: '大師不傳（hidden）' };
  }
  if (s.policy === 'selective') {
    const S = MASTER.selective;
    if (count >= S.maxDisciples) return { accepted: false, reason: `擇徒：已帶 ${S.maxDisciples} 個徒弟` };
    if (close < S.close) return { accepted: false, reason: `擇徒：大師對他的親近 ${close} < ${S.close}` };
    if (hasMisdeed(mind, disciple)) return { accepted: false, reason: '擇徒：有惡行（違規）記憶' };
    return { accepted: true, reason: `擇徒：親近 ${close} ≥ ${S.close}、無惡行、徒弟 ${count} < ${S.maxDisciples}` };
  }
  return undefined; // open：照 W7（親近 ≥ 0 且收徒 < 3）
}

/** 門規「辰時練功」：大師的徒弟改在廣場空地練拳。 */
export function a2DrillDo(w: WuxiaState, master: string): string[] | undefined {
  if (!st(w) || master !== MASTER_CID) return undefined;
  return ['practice_form'];
}

export function a2Practising(w: WuxiaState, person: { cur?: { phase: string; act: string } } | undefined): boolean {
  if (!st(w)) return false;
  return person?.cur?.phase === 'do' && person.cur.act === 'practice_form';
}
