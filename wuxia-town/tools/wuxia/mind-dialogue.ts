// 武俠小鎮 W5（#557 驗收最後一條）：「有心念的人談到相關話題的比例」的 LLM 抽樣。
// 用法：npx tsx tools/wuxia/mind-dialogue.ts --seed 7 --days 14 --n 20 --out docs/wuxia/w05/dialogue.jsonl
//        [--model qwen2.5:3b] [--url http://127.0.0.1:11434/v1/chat/completions] [--turns 4] [--sample-seed 5]
//        --md docs/wuxia/w05/dialogue.jsonl      → 只把已產生的 jsonl 轉成 Markdown 表（W5.md 人工標記用），不打 LLM
// 流程：無頭模擬（規則決定誰在何時跟誰聊）→ 挑出至少一方當時有心念的對話 → 依種子抽 n 段 →
//   用跟 live 同一套的 prompt（folkSystemPrompt＋「你最近的心事」、folkLine、folkCue）與守門（guardedReply），
//   打本機 Ollama（OpenAI 相容端點）生成 turns 句；同一段再生成一次「不給心事」的對照組。
// 這不是 Convex 實跑（沒有雲端金鑰，見 DEVIATIONS W5-13），但 prompt、守門、模板後備都是 live 的程式。
// 規則不等 LLM：本工具在模擬跑完後才打 LLM，結果不回寫規則。已寫好的段落（同 id）會跳過，中斷後可續跑。
import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { runHeadless } from './headless';
import { parseArgs, quietConsole } from './sim';
import { sample } from './sample-dialogue';
import { gameMinutes, readClock } from '../../convex/wuxia/clock';
import { folkCue, folkLine, folkRetryPrompt, folkStopWords, folkSystemPrompt } from '../../convex/wuxia/w02_folk/prompt';
import { FOLK_CHARACTERS, folkTemplate } from '../../convex/wuxia/w02_folk';
import { guardedReply } from '../../convex/wuxia/w02_folk/guard';
import { MIND } from '../../convex/wuxia/w05_mind/data';
import type { MindTrace } from './mind-trace';

type Conv = { id: string; t: number; gm: number; a: string; b: string; thoughtsA?: string; thoughtsB?: string };

function thoughtsAt(trace: MindTrace, cid: string, gm: number): string | undefined {
  const c = readClock(gm);
  const day = c.minuteOfDay >= MIND.evalMinuteOfDay ? c.day : c.day - 1;
  let row;
  for (const e of trace.evals) if (e.day <= day) row = e;
  const ts = row?.people[cid] ?? [];
  return ts.length ? ts.map((t) => `${t.name}（強度 ${t.s}）`).join('、') : undefined;
}

const cidByName = (name: string) => FOLK_CHARACTERS.find((c) => c.name === name)!.id;
const profile = (name: string) => FOLK_CHARACTERS.find((c) => c.name === name)!;

async function chat(url: string, model: string, messages: any[], stop: string[]) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages, max_tokens: 150, stop, temperature: 0.7 }),
    });
    if (!r.ok) return { content: '', fallback: true };
    const j: any = await r.json();
    return { content: String(j.choices?.[0]?.message?.content ?? ''), fallback: false };
  } catch {
    return { content: '', fallback: true };
  }
}

async function dialogue(conv: Conv, withThoughts: boolean, turns: number, url: string, model: string) {
  const lines: Array<{ author: string; text: string; guard: string }> = [];
  const names = [conv.a, conv.b];
  for (let i = 0; i < turns; i++) {
    const speaker = names[i % 2];
    const other = names[(i + 1) % 2];
    const stage = i === 0 ? 'start' : i === turns - 1 ? 'leave' : 'continue';
    const me = profile(speaker);
    const you = profile(other);
    const system = folkSystemPrompt({
      stage,
      player: { name: speaker },
      otherPlayer: { name: other },
      agent: { identity: me.identity, plan: me.plan },
      otherAgent: { identity: you.identity, plan: you.plan },
      hasMemories: false,
      memoryWithOtherPlayer: false,
      thoughts: withThoughts ? (i % 2 === 0 ? conv.thoughtsA : conv.thoughtsB) : undefined,
    });
    const history = lines.map((l) => ({
      role: 'user',
      content: folkLine(l.author, l.author === speaker ? other : speaker, l.text),
    }));
    const cue = folkCue(speaker, other);
    const avoid = lines.filter((l) => l.author === speaker).map((l) => l.text);
    const r = await guardedReply({
      speaker,
      avoid,
      generate: async (retry) => {
        const msgs: any[] = [{ role: 'system', content: system }, ...history];
        if (retry) msgs.push({ role: 'user', content: folkRetryPrompt(retry) });
        msgs.push({ role: 'user', content: cue });
        const c = await chat(url, model, msgs, folkStopWords(speaker, other));
        return { content: c.content.startsWith(cue) ? c.content.slice(cue.length).trim() : c.content, fallback: c.fallback };
      },
      template: () => folkTemplate(speaker, stage, (i + 1) / (turns + 1), { other }, avoid[avoid.length - 1]),
    });
    lines.push({ author: speaker, text: r.text, guard: r.metadata.guard });
  }
  return lines;
}

function toMarkdown(rows: any[]): string {
  const out = [
    '| # | 時間 | 甲（心事） | 乙（心事） | 有心事的對話 | 對照（不給心事） |',
    '|---|---|---|---|---|---|',
  ];
  rows.forEach((r, i) => {
    const fmt = (ls: any[]) => ls.map((l: any) => `${l.author}：${l.text}${l.guard === 'template' ? '〔模板〕' : ''}`).join('<br>');
    out.push(
      `| ${i + 1} | ${readClock(r.gm).label} | ${r.a}（${r.thoughtsA ?? '—'}） | ${r.b}（${r.thoughtsB ?? '—'}） | ${fmt(r.with)} | ${fmt(r.without)} |`,
    );
  });
  return out.join('\n') + '\n';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.md) {
    const rows = readFileSync(String(args.md), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    process.stdout.write(toMarkdown(rows));
    return;
  }
  quietConsole(false);
  const seed = Number(args.seed ?? 7);
  const days = Number(args.days ?? 14);
  const n = Number(args.n ?? 20);
  const turns = Number(args.turns ?? 4);
  const model = String(args.model ?? process.env.OLLAMA_MODEL ?? 'qwen2.5:3b');
  const url = String(args.url ?? 'http://127.0.0.1:11434/v1/chat/completions');
  const out = String(args.out ?? '/tmp/mind-dialogue.jsonl');
  const run = runHeadless({ seed, minutes: 0, untilGameMinute: days * 1440, trace: true });
  const trace = run.summary.mind!;
  const w = run.game.world.wuxia!;
  const convs = new Map<string, Conv>();
  for (const m of run.messages) {
    if (convs.has(m.conversationId)) continue;
    const gm = gameMinutes(m.t, w.clockEpoch!, w.timeScale);
    const c: Conv = { id: m.conversationId, t: m.t, gm, a: m.author, b: m.to };
    c.thoughtsA = thoughtsAt(trace, cidByName(c.a), gm);
    c.thoughtsB = thoughtsAt(trace, cidByName(c.b), gm);
    convs.set(m.conversationId, c);
  }
  const all = [...convs.values()];
  const withMind = all.filter((c) => c.thoughtsA || c.thoughtsB);
  // 讓有心事的人先開口（甲＝有心事的一方）
  for (const c of withMind)
    if (!c.thoughtsA) [c.a, c.b, c.thoughtsA, c.thoughtsB] = [c.b, c.a, c.thoughtsB, c.thoughtsA];
  const picked = sample(withMind, n, Number(args['sample-seed'] ?? 5)).sort((x, y) => x.gm - y.gm);
  process.stdout.write(`對話 ${all.length} 段，至少一方有心念 ${withMind.length} 段，抽 ${picked.length} 段（seed ${seed}，${days} 日，hash ${run.finalHash.slice(0, 16)}…），模型 ${model}\n`);
  mkdirSync(dirname(out), { recursive: true });
  const done = new Set(
    existsSync(out)
      ? readFileSync(out, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).id)
      : [],
  );
  for (const c of picked) {
    if (done.has(c.id)) continue;
    const withT = await dialogue(c, true, turns, url, model);
    const without = await dialogue(c, false, turns, url, model);
    appendFileSync(out, JSON.stringify({ ...c, model, with: withT, without }) + '\n');
    process.stdout.write(`${readClock(c.gm).label} ${c.a}（${c.thoughtsA}）↔ ${c.b}（${c.thoughtsB ?? '—'}）\n`);
  }
}

if (process.argv[1]?.endsWith('mind-dialogue.ts')) main();
