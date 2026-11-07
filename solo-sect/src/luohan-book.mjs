// N40：書是明確的武學來源；讀過的姿勢與既有身體招相接，不靠抽籤領悟整門。
import { ACTIVITIES } from './data.mjs';
import { artById, learnArt } from './arts.mjs';
import { handUses, practiceResidual, PRACTICE, ensurePractice } from './practice.mjs';
import { LUOHAN_EIGHTEEN_HANDS, CHUNYANG_FORMS } from './routines.mjs';
import { ensureSelection } from './decision.mjs';

// 22 段的分組以圖譜所示的拳、掌、格、步和白身起手對照。起收與換架另學。
const recognized = new Map([[1, 'bodyPunch'], [2, 'bodyPunch'], [3, 'bodyPush'], [4, 'bodyPush'], [7, 'bodyGrab'], [13, 'bodyPunch'], [14, 'bodyPunch'], [16, 'bodyPunch']]);
const retrain = new Map([[5, 'bodyPunch'], [11, 'bodyPunch'], [17, 'bodyPunch']]);
export const LUOHAN_READING = LUOHAN_EIGHTEEN_HANDS.map((form, index) => ({
  index, name: form.name,
  kind: recognized.has(index) ? 'recognize' : retrain.has(index) ? 'retrain' : 'new',
  parent: recognized.get(index) || retrain.get(index) || null,
}));

// 一次研讀活動的四分之一是「讀、對照、試擺、再看」一段的基準時間。
// 認得的式隨既有手熟縮短；全新的式要讀譜再試擺；拳改掌先退回舊習再改。
export function readingSeconds(d, row) {
  const unit = ACTIVITIES.study.dur / 4;
  const residual = row.parent ? practiceResidual(handUses(d, row.parent)) : 1;
  return row.kind === 'recognize' ? unit * residual : row.kind === 'retrain' ? unit * (2 + residual) : unit * 2;
}

export function readLuohanBook(d, seconds = ACTIVITIES.study.dur, now = 0) {
  if (d.arts?.luohanHands) return { done: true, learned: false, form: null };
  const state = (d.luohanRead ??= { index: 0, credit: 0 });
  let time = seconds, form = null;
  while (time > 0 && state.index < LUOHAN_READING.length) {
    const row = LUOHAN_READING[state.index], left = readingSeconds(d, row) - state.credit;
    if (time < left) { state.credit += time; break; }
    time -= left; state.index++; state.credit = 0; form = row.name;
  }
  if (state.index < LUOHAN_READING.length) return { done: false, learned: false, form, index: state.index };
  const art = artById('luohanHands');
  learnArt(d, art.id, now);
  d.arts[art.id].source = 'book';
  const hands = ensurePractice(d).hands;
  for (const [move, parent] of [['lhChop', 'bodyPunch'], ['lhPush', 'bodyPush'], ['lhTiger', 'bodyPunch']])
    hands[move] = Math.max(hands[move] || 0, handUses(d, parent) * PRACTICE.familyTransfer);
  // 拳譜分成三段，每段「認得」的式各算一次初始勝例；真交手會改寫它。
  const moveIds = art.techs, selection = ensureSelection(d);
  selection.priors ??= {};
  for (let k = 0; k < moveIds.length; k++)
    selection.priors[moveIds[k]] = { win: LUOHAN_READING.filter((row) => row.kind === 'recognize' && Math.floor(row.index * moveIds.length / LUOHAN_READING.length) === k).length, loss: 0 };
  if (d.bare) { d.bare = false; d.focus = art.id; }
  return { done: true, learned: true, form, index: state.index };
}

// 出自 Phase 4 規格：每段研讀與現有 study 活動共用時長；羅漢譜原流程不改。
export function readChunyangBook(d, seconds = ACTIVITIES.study.dur, now = 0) {
  if (d.arts?.chunyangFist) return { done: true, learned: false, form: null };
  const state = (d.chunyangRead ??= { index: 0, credit: 0 });
  let time = seconds, form = null;
  const perForm = ACTIVITIES.study.dur;
  while (time > 0 && state.index < CHUNYANG_FORMS.length) {
    const left = perForm - state.credit;
    if (time < left) { state.credit += time; break; }
    time -= left; form = CHUNYANG_FORMS[state.index++].name; state.credit = 0;
  }
  if (state.index < CHUNYANG_FORMS.length) return { done: false, learned: false, form, index: state.index };
  const art = learnArt(d, 'chunyangFist', now);
  d.arts[art.id].source = 'book';
  if (d.bare) { d.bare = false; d.focus = art.id; }
  return { done: true, learned: true, form, index: state.index };
}

export function readStarterBook(d, artId, seconds = ACTIVITIES.study.dur, now = 0) {
  if (artId === 'luohanHands') return readLuohanBook(d, seconds, now);
  if (artId === 'chunyangFist') return readChunyangBook(d, seconds, now);
  throw new Error(`未知入門拳譜 ${artId}`);
}
