// 武俠小鎮 W0：LLM 不可用（超過每日上限、失敗）時的模板句。
// 無頭模擬的「規則替身」也用同一組模板，保證離線重跑不需要 LLM。
// 句子從清單裡挑，挑法由呼叫端決定（引擎外用 Math.random 或工具用的種子亂數皆可）。

export const START_TEMPLATES = [
  '{other}，你好。',
  '{other}，今天過得如何？',
  '哎，{other}，好巧。',
];
export const CONTINUE_TEMPLATES = ['嗯，我明白。', '原來如此。', '這倒是有意思。', '說得也是。'];
export const LEAVE_TEMPLATES = ['我先走一步，改天再聊。', '時候不早了，告辭。'];

export function pickTemplate(list: string[], r: number, vars: Record<string, string> = {}): string {
  const template = list[Math.min(list.length - 1, Math.floor(r * list.length))];
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

export function conversationTemplate(
  type: 'start' | 'continue' | 'leave',
  r: number,
  vars: { other: string },
): string {
  const list =
    type === 'start' ? START_TEMPLATES : type === 'continue' ? CONTINUE_TEMPLATES : LEAVE_TEMPLATES;
  return pickTemplate(list, r, vars);
}

export const MEMORY_SUMMARY_TEMPLATE = '和{other}聊了一會兒。';
export const MEMORY_IMPORTANCE_FALLBACK = '0';
export const MEMORY_REFLECTION_FALLBACK = '[]';
