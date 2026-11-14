// 武俠小鎮 W3（#555 驗收）：從實跑 journal 統計生活與對話地點。不打 LLM、不需 Convex。
// 用法：npm run wuxia:life-report -- docs/wuxia/fixtures/w03-live.jsonl [--json out.json]
// 重播 journal（hash 必須相符），每個 step 用 LifeTracer 取樣：對話在哪裡開始（邀請當下兩人所在地點）、
// 預約 ≤ capacity、選不到事做、hunger > 90、對話長度。只算有說到話（≥1 則訊息）的對話。
import { writeFileSync } from 'node:fs';
import { readJournal, replayJournal } from './replay';
import { LifeTracer, conversationPlaceStats } from './life-trace';
import { parseArgs, quietConsole } from './sim';
import { placeName } from '../../convex/wuxia/w03_life/data';

export function lifeReport(file: string) {
  const j = readJournal(file);
  const tracer = new LifeTracer();
  const r = replayJournal(j, (game, step) => tracer.sample(game, step.endTs ?? step.now));
  const withMessages = new Set((j.messages ?? []).map((m: any) => m.conversationId));
  const spoken = Object.fromEntries(
    Object.entries(tracer.conversations).filter(([id]) => withMessages.has(id)),
  );
  return {
    replay: r,
    checks: tracer.checks,
    all: conversationPlaceStats(tracer.conversations),
    spoken: conversationPlaceStats(spoken),
    messages: (j.messages ?? []).length,
    conversations: tracer.conversations,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const file = args._[0];
  if (!file) throw new Error('usage: life-report <journal.jsonl>');
  const rep = lifeReport(file);
  const say = (s: string) => process.stdout.write(s + '\n');
  say(`file ${file}`);
  say(`replay ${rep.replay.ok ? 'MATCH' : 'MISMATCH'} steps=${rep.replay.steps} hash ${rep.replay.finalHash}`);
  say(`遊戲分鐘取樣 ${rep.checks.minutes}；訊息 ${rep.messages} 則`);
  const name = (k: string) => (k.startsWith('table:') ? `飯桌（${placeName(k.slice(6))}）` : placeName(k));
  const list = (o: Record<string, number>) =>
    Object.entries(o)
      .map(([k, v]) => `${name(k)} ${v}`)
      .join('、');
  const fmt = (s: ReturnType<typeof conversationPlaceStats>) =>
    `${s.total} 段；開始地點 ${list(s.byPlace)}；說話地點 ${list(s.byTalkPlace)}；說話在茶館／飯桌／河邊 ${s.social}/${s.total}${s.ratio === null ? '' : `（${(s.ratio * 100).toFixed(1)}%）`}`;
  say(`對話（有說到話）：${fmt(rep.spoken)}`);
  say(`對話（含被婉拒、沒說到話）：${fmt(rep.all)}`);
  const c = rep.checks;
  say(
    `預約逐分檢查：超額預約 ${c.reservationOverCapacity}、超額使用 ${c.usingOverCapacity}、重複預約 ${c.doubleBooked}`,
  );
  say(`最長選不到事做 ${Math.max(0, ...Object.values(c.maxNoChoiceMinutes))} 分；最長 hunger>90 ${Math.max(0, ...Object.values(c.maxHungerOver90Minutes))} 分；最長對話 ${c.maxConversationMinutes} 遊戲分鐘`);
  if (args.json) writeFileSync(args.json, JSON.stringify(rep, null, 2) + '\n');
  if (!rep.replay.ok) process.exit(1);
}

if (process.argv[1]?.endsWith('life-report.ts')) main();
