// 武俠小鎮 W0／W9：journal（jsonl）的組裝。tools/wuxia/journal.ts（命令列匯出）與遊戲畫面的「匯出 journal」按鈕（W9）共用，
// 兩邊輸出同一個格式，都能用 npm run wuxia:replay 重播。純函式，不碰 Convex 執行環境。
export function journalLinesFrom(p: {
  source: string;
  worldId: string;
  exportedAt: string;
  snapshot: any;
  inputs: any[];
  messages: any[];
  steps: any[];
  current: { hash: string; running?: boolean };
  note?: string;
}): string[] {
  const messages = [...p.messages].sort((a, b) => a.at - b.at);
  const byConversation = new Map<string, any[]>();
  for (const m of messages) {
    const list = byConversation.get(m.conversationId) ?? [];
    list.push(m);
    byConversation.set(m.conversationId, list);
  }
  for (const list of byConversation.values()) {
    const authors = [...new Set(list.map((m) => m.author))];
    list.forEach((m, i) => {
      m.to = authors.find((a) => a !== m.author) ?? null;
      m.index = i;
    });
  }
  const last = p.steps[p.steps.length - 1];
  return [
    JSON.stringify({
      type: 'header',
      version: 1,
      source: p.source,
      worldId: p.worldId,
      exportedAt: p.exportedAt,
      dbHashAtExport: p.current.hash,
      engineRunningAtExport: p.current.running,
      note: p.note,
    }),
    JSON.stringify({ type: 'snapshot', ...p.snapshot }),
    ...p.inputs.map((i) => JSON.stringify({ type: 'input', ...i })),
    ...messages.map((m) => JSON.stringify({ type: 'message', ...m })),
    ...p.steps.map((s) => JSON.stringify({ type: 'step', ...s })),
    JSON.stringify({ type: 'final', hash: last.hash, steps: p.steps.length }),
  ];
}

/** 分頁讀 steps 與 inputs（命令列與按鈕共用）。fetch 是「呼叫某個查詢」的函式。 */
export async function collectJournal(
  fetch: (fn: 'snapshot' | 'steps' | 'inputs' | 'currentHash' | 'messages', args: any) => Promise<any>,
  worldId: string,
  page = 400,
) {
  const snapshot = await fetch('snapshot', { worldId });
  if (!snapshot) throw new Error(`World ${worldId} has no wuxiaSnapshots (was it created before W0?)`);
  const steps: any[] = [];
  let after = snapshot.generation - 1;
  for (;;) {
    const rows = await fetch('steps', { worldId, afterGeneration: after, limit: page });
    steps.push(...rows);
    if (rows.length < page) break;
    after = rows[rows.length - 1].generation;
  }
  if (steps.length === 0) throw new Error('No steps recorded');
  const inputs: any[] = [];
  let afterNumber = snapshot.engine.processedInputNumber ?? -1;
  const lastNeeded = Math.max(...steps.map((s) => s.inputsThrough ?? -1));
  while (afterNumber < lastNeeded) {
    const rows = await fetch('inputs', { engineId: snapshot.engineId, afterNumber, limit: page });
    if (rows.length === 0) break;
    for (const i of rows) {
      if (i.number > lastNeeded) break;
      inputs.push({ number: i.number, name: i.name, args: i.args, received: i.received, _id: i._id });
    }
    afterNumber = rows[rows.length - 1].number;
    if (rows.length < page) break;
  }
  const current = await fetch('currentHash', { worldId });
  const messages: any[] = (await fetch('messages', { worldId })) ?? [];
  return { snapshot, steps, inputs, current, messages };
}
