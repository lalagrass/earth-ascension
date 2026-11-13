// 武俠小鎮 W9（#561）：遊戲畫面的「匯出 journal」按鈕。跟 tools/wuxia/journal.ts（W0 命令列）讀同樣的資料、
// 用同一個組裝函式（convex/wuxia/journalFormat.ts），下載的 .jsonl 可以直接 npm run wuxia:replay 重播。
import { ConvexReactClient } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { collectJournal, journalLinesFrom } from '../../convex/wuxia/journalFormat';

const FN = {
  snapshot: api.wuxia.journal.exportSnapshot,
  steps: api.wuxia.journal.exportSteps,
  inputs: api.wuxia.journal.exportInputs,
  currentHash: api.wuxia.journal.exportCurrentHash,
  messages: api.wuxia.journal.exportMessages,
} as const;

export async function exportJournalFile(convex: ConvexReactClient, worldId: string) {
  const j = await collectJournal((fn, args) => convex.query(FN[fn] as any, args), worldId);
  const lines = journalLinesFrom({
    source: 'live-convex-button',
    worldId,
    // 匯出時刻只寫進 header（不進狀態、不影響重播）；引擎內不用 Date
    exportedAt: new Date().toISOString(),
    ...j,
  });
  const blob = new Blob([lines.join('\n') + '\n'], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wuxia-journal-${worldId}-${j.steps.length}.jsonl`;
  a.click();
  URL.revokeObjectURL(url);
  return { steps: j.steps.length, hash: j.steps[j.steps.length - 1].hash };
}
