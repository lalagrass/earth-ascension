// 武俠小鎮 W0：從活的 Convex 世界匯出 journal（#549 第 5 節）。
// 用法（在 wuxia-town/ 下，已設定好 Convex 部署，例如 .env.local 的 CONVEX_SELF_HOSTED_URL／ADMIN_KEY）：
//   npx tsx tools/wuxia/journal.ts export [--world <worldId>] --out docs/wuxia/fixtures/w0-live.jsonl
// 內容：初始快照（wuxiaSnapshots）＋所有 inputs（含 received）＋每個 step 的邊界與 hash（wuxiaSteps）＋final hash。
// 透過 `npx convex run` 呼叫 convex/wuxia/journal.ts 的 internal 查詢（需要部署的 admin 權限）。
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from './sim';

const PAGE = 400;

function convexRun(fn: string, args: Record<string, unknown>): any {
  const out = execFileSync('npx', ['convex', 'run', fn, JSON.stringify(args)], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return JSON.parse(out.trim() || 'null');
}

function exportJournal(worldId: string | undefined, outPath: string, note?: string) {
  if (!worldId) {
    const def = convexRun('wuxia/journal:defaultWorld', {});
    if (!def) throw new Error('No default world found');
    worldId = def.worldId as string;
  }
  const snapshot = convexRun('wuxia/journal:snapshot', { worldId });
  if (!snapshot)
    throw new Error(`World ${worldId} has no wuxiaSnapshots (was it created before W0?)`);
  const steps: any[] = [];
  let after = snapshot.generation - 1;
  for (;;) {
    const page = convexRun('wuxia/journal:steps', { worldId, afterGeneration: after, limit: PAGE });
    steps.push(...page);
    if (page.length < PAGE) break;
    after = page[page.length - 1].generation;
  }
  if (steps.length === 0) throw new Error('No steps recorded');
  const inputs: any[] = [];
  let afterNumber = snapshot.engine.processedInputNumber ?? -1;
  const lastNeeded = Math.max(...steps.map((s) => s.inputsThrough ?? -1));
  while (afterNumber < lastNeeded) {
    const page = convexRun('wuxia/journal:inputs', {
      engineId: snapshot.engineId,
      afterNumber,
      limit: PAGE,
    });
    if (page.length === 0) break;
    for (const i of page) {
      if (i.number > lastNeeded) break;
      inputs.push({
        number: i.number,
        name: i.name,
        args: i.args,
        received: i.received,
        _id: i._id,
      });
    }
    afterNumber = page[page.length - 1].number;
    if (page.length < PAGE) break;
  }
  const current = convexRun('wuxia/journal:currentHash', { worldId });
  // W2：對話訊息（含守門 metadata）也寫進 journal；不進狀態 hash，重播時略過，只給 sample-dialogue 讀
  const messages: any[] = convexRun('wuxia/journal:messages', { worldId }) ?? [];
  messages.sort((a, b) => a.at - b.at);
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
  const last = steps[steps.length - 1];
  const lines = [
    JSON.stringify({
      type: 'header',
      version: 1,
      source: 'live-convex',
      worldId,
      exportedAt: new Date().toISOString(),
      dbHashAtExport: current.hash,
      engineRunningAtExport: current.running,
      note,
    }),
    JSON.stringify({ type: 'snapshot', ...snapshot }),
    ...inputs.map((i) => JSON.stringify({ type: 'input', ...i })),
    ...messages.map((m) => JSON.stringify({ type: 'message', ...m })),
    ...steps.map((s) => JSON.stringify({ type: 'step', ...s })),
    JSON.stringify({ type: 'final', hash: last.hash, steps: steps.length }),
  ];
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join('\n') + '\n');
  process.stdout.write(
    `exported ${steps.length} steps, ${inputs.length} inputs, ${messages.length} messages → ${outPath}\nfinal ${last.hash}\ndb    ${current.hash}\n`,
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd] = args._;
  if (cmd !== 'export' || !args.out) {
    throw new Error('usage: journal export [--world <worldId>] --out file.jsonl [--note text]');
  }
  exportJournal(args.world, args.out, args.note);
}

main();
