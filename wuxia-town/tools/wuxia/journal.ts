// 武俠小鎮 W0：從活的 Convex 世界匯出 journal（#549 第 5 節）。
// 用法（在 wuxia-town/ 下，已設定好 Convex 部署，例如 .env.local 的 CONVEX_SELF_HOSTED_URL／ADMIN_KEY）：
//   npx tsx tools/wuxia/journal.ts export [--world <worldId>] --out docs/wuxia/fixtures/w0-live.jsonl
// 內容：初始快照（wuxiaSnapshots）＋所有 inputs（含 received）＋每個 step 的邊界與 hash（wuxiaSteps）＋final hash。
// 透過 `npx convex run` 呼叫 convex/wuxia/journal.ts 的 internal 查詢（需要部署的 admin 權限）。
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from './sim';
import { collectJournal, journalLinesFrom } from '../../convex/wuxia/journalFormat';

const PAGE = 400;

function convexRun(fn: string, args: Record<string, unknown>): any {
  const out = execFileSync('npx', ['convex', 'run', fn, JSON.stringify(args)], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return JSON.parse(out.trim() || 'null');
}

async function exportJournal(worldId: string | undefined, outPath: string, note?: string) {
  if (!worldId) {
    const def = convexRun('wuxia/journal:defaultWorld', {});
    if (!def) throw new Error('No default world found');
    worldId = def.worldId as string;
  }
  // W9：讀取與組裝改用 convex/wuxia/journalFormat.ts（遊戲畫面的「匯出 journal」按鈕共用同一份），輸出格式不變
  const j = await collectJournal(async (fn, args) => convexRun(`wuxia/journal:${fn}`, args), worldId, PAGE);
  const lines = journalLinesFrom({
    source: 'live-convex',
    worldId,
    exportedAt: new Date().toISOString(),
    note,
    ...j,
  });
  const last = j.steps[j.steps.length - 1];
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join('\n') + '\n');
  process.stdout.write(
    `exported ${j.steps.length} steps, ${j.inputs.length} inputs, ${j.messages.length} messages → ${outPath}\nfinal ${last.hash}\ndb    ${j.current.hash}\n`,
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd] = args._;
  if (cmd !== 'export' || !args.out) {
    throw new Error('usage: journal export [--world <worldId>] --out file.jsonl [--note text]');
  }
  void exportJournal(args.world, args.out, args.note);
}

main();
