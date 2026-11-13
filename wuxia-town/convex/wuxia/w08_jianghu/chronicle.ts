// 武俠小鎮 W8（#560）：山腳鎮誌。每個事件結束寫一條規則產生的模板句（index.ts finishEvent）；
// 亥時把當日的條目交給 LLM 改寫成 80 字內古風段落（rewrite.ts，經 W2 守門），失敗就用這裡的模板段落。
// 純函式：引擎、action、工具與 jest 共用。
import { renderPrompt } from '../w02_folk';
import { checkReply, countChars, GuardResult } from '../w02_folk/guard';
import { zhNumber } from '../w06_spar/narration';
import { ChronicleEntry, JIANGHU, JianghuState } from './data';

/** 第幾日（中文數字，1–999）。 */
export function zhDay(n: number): string {
  if (n < 100) return zhNumber(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return `${zhNumber(h)}百${rest === 0 ? '' : rest < 10 ? `零${zhNumber(rest)}` : zhNumber(rest)}`;
}

/** 當日模板段落：「第十二日。藥鋪進了五箱藥材。行商路過茶館……」 */
export function chronicleTemplateDay(day: number, entries: ChronicleEntry[]): string {
  return `第${zhDay(day)}日。${entries.map((e) => e.text.replace(/[。]$/, '')).join('。')}。`;
}

export function chroniclePrompt(day: number, entries: string[]): string {
  return renderPrompt('chronicle', { day: zhDay(day), entries: entries.map((e) => `- ${e}`).join('\n') });
}

/** W2 守門＋段落限 80 字（不算標點）。 */
export function checkChronicle(text: string): GuardResult {
  const r = checkReply(text);
  const reasons = [...r.reasons];
  if (countChars(text) > JIANGHU.chronicle.maxChars) reasons.push(`chronicle>${JIANGHU.chronicle.maxChars}`);
  return { ok: reasons.length === 0, reasons };
}

/** 鎮誌全文（依日期列出；有 LLM 段落的日子用段落，沒有就用模板段落）。 */
export function chronicleLines(st: JianghuState): Array<{ day: number; text: string; guard: string }> {
  const days = [...new Set(st.chronicle.map((e) => e.day))].sort((a, b) => a - b);
  return days.map((day) => {
    const d = st.chronicleDays.find((x) => x.day === day);
    const entries = st.chronicle.filter((e) => e.day === day);
    return d ? { day, text: d.text, guard: d.guard } : { day, text: chronicleTemplateDay(day, entries), guard: 'template' };
  });
}

/**
 * A1（#564 審查第 4 項）：記事的重要度。武館重開／掛匾、俠客、山賊、小比、說書是「大事」；藥鋪進貨、行商路過是「例行」。
 * 只依 kind 決定（不寫進狀態，hash 不變）；鎮誌面板預設只列大事，例行的收在「全部」。
 */
export type ChronicleImportance = 'major' | 'routine';
const ROUTINE_KINDS: ReadonlySet<string> = new Set(['restock', 'merchant']);
export function chronicleImportance(e: Pick<ChronicleEntry, 'kind'>): ChronicleImportance {
  return ROUTINE_KINDS.has(e.kind) ? 'routine' : 'major';
}

/** 只列大事的鎮誌（每天用大事條目組模板段落；當天沒有大事就不列）。 */
export function chronicleMajorLines(st: JianghuState): Array<{ day: number; text: string }> {
  const days = [...new Set(st.chronicle.filter((e) => chronicleImportance(e) === 'major').map((e) => e.day))].sort((a, b) => a - b);
  return days.map((day) => ({
    day,
    text: chronicleTemplateDay(
      day,
      st.chronicle.filter((e) => e.day === day && chronicleImportance(e) === 'major'),
    ),
  }));
}
