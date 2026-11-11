// 武俠小鎮 W5（#557）：心念紀錄（無頭模擬取樣，只讀世界狀態）＋ mind-trace 工具。
// 取樣：每次寅正評估後記一次每人的心念（名稱、強度、因為的記憶 id）與這次的變化；被引用的記憶全文另存，
// 武館重開的遊戲分鐘也記下。輸出放進 headless summary.mind，給 wuxia:mind-report 與本工具用。
//
// 用法（#557 驗收「因果可驗」）：
//   npx tsx tools/wuxia/mind-trace.ts /tmp/on.json --thought 想學武 --who 阿青
//     → 列出這個心念第一次出現的日子與觸發記憶（id、時間、內容）
//   npx tsx tools/wuxia/mind-trace.ts /tmp/on.json --thought 想學武 --who 阿青 --drop-memory 123[,456]
//     → 用 on.json 的 seed／日數／元素開關重跑，但不寫入這些 id 的記憶，比較心念出現的日子（延後或不出現）
//   --drop-memory auto ＝ 丟掉第一次出現時的第一筆觸發記憶
import { readFileSync } from 'node:fs';
import type { Game } from '../../convex/aiTown/game';
import { gameMinutes, readClock } from '../../convex/wuxia/clock';
import { W04_DOJO, DojoState } from '../../convex/wuxia/w04_dojo';
import { FOLK_CHARACTERS } from '../../convex/wuxia/w02_folk';
import { placeName } from '../../convex/wuxia/w03_life/data';
import {
  Memory,
  MindState,
  THOUGHT_BY_ID,
  THOUGHT_BY_NAME,
  ThoughtChange,
  W05_MIND,
  describeMemory,
} from '../../convex/wuxia/w05_mind/data';
import { parseArgs } from './sim';
import { defaultWuxiaConfig } from '../../convex/wuxia/state';

export type MindEval = {
  day: number;
  /** cid → 心念 */
  people: Record<string, Array<{ name: string; s: number; causes: number[] }>>;
  changes: ThoughtChange[];
};

export type MindTrace = {
  on: boolean;
  evals: MindEval[];
  /** 被引用過的記憶（id → 記憶＋持有人 cid） */
  memories: Record<string, Memory & { owner: string }>;
  /** 武館重開的遊戲分鐘與日子（w04-dojo 開才有） */
  dojoOpenedAt: number | null;
  dojoOpenedDay: number | null;
  /** 每人每日記憶筆數（依種類），days[d-1][cid][kind] */
  memoryCounts: Array<Record<string, Record<string, number>>>;
  /** 最後每人的記憶筆數 */
  finalMemories: Record<string, number>;
};

export const nameOf = (cid: string) => FOLK_CHARACTERS.find((c) => c.id === cid)?.name ?? cid;
export const cidOf = (name: string) => FOLK_CHARACTERS.find((c) => c.name === name || c.id === name)?.id ?? name;

export class MindTracer {
  trace: MindTrace = {
    on: false,
    evals: [],
    memories: {},
    dojoOpenedAt: null,
    dojoOpenedDay: null,
    memoryCounts: [],
    finalMemories: {},
  };
  private lastEval = 0;
  private lastSeq = 1;

  sample(game: Game, now: number) {
    const w = game.world.wuxia;
    if (!w || w.clockEpoch === undefined || !w.enabled[W05_MIND]) return;
    const m = w.elements[W05_MIND] as (MindState & { last?: ThoughtChange[] }) | undefined;
    if (!m) return;
    this.trace.on = true;
    const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
    const day = readClock(gm).day;
    // 新記憶計數
    if (m.seq !== this.lastSeq) {
      while (this.trace.memoryCounts.length < day) this.trace.memoryCounts.push({});
      const row = this.trace.memoryCounts[day - 1];
      for (const p of Object.values(m.people)) {
        for (let i = p.memories.length - 1; i >= 0 && p.memories[i].id >= this.lastSeq; i--) {
          const k = p.memories[i].kind;
          ((row[p.cid] ??= {})[k] ??= 0);
          row[p.cid][k]++;
        }
      }
      this.lastSeq = m.seq;
    }
    const dojo = w.enabled[W04_DOJO] ? (w.elements[W04_DOJO] as DojoState | undefined) : undefined;
    if (dojo?.openedAt !== undefined && this.trace.dojoOpenedAt === null) {
      this.trace.dojoOpenedAt = dojo.openedAt;
      this.trace.dojoOpenedDay = readClock(dojo.openedAt).day;
    }
    if (m.evalDay === this.lastEval) return;
    this.lastEval = m.evalDay;
    if (!m.last) return;
    const people: MindEval['people'] = {};
    for (const pid of Object.keys(m.people).sort()) {
      const p = m.people[pid];
      people[p.cid] = p.thoughts.map((t) => ({ name: THOUGHT_BY_ID[t.id]?.name ?? t.id, s: t.s, causes: t.causes }));
      for (const t of p.thoughts)
        for (const id of t.causes) {
          const mem = p.memories.find((x) => x.id === id);
          if (mem && !this.trace.memories[id]) this.trace.memories[id] = { ...mem, owner: p.cid };
        }
    }
    this.trace.evals.push({ day: m.evalDay, people, changes: m.last });
  }

  finish(game: Game) {
    const m = game.world.wuxia?.elements[W05_MIND] as MindState | undefined;
    if (!m) return;
    for (const p of Object.values(m.people)) this.trace.finalMemories[p.cid] = p.memories.length;
  }
}

export function memoryText(m: Memory): string {
  return describeMemory(m, nameOf, placeName);
}

/** 某人某心念第一次出現的日子與當時的「因為」。 */
export function firstAppearance(trace: MindTrace, cid: string, thought: string) {
  for (const e of trace.evals) {
    const t = e.people[cid]?.find((x) => x.name === thought);
    if (t) return { day: e.day, s: t.s, causes: t.causes };
  }
  return undefined;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args._[0];
  const thought = String(args.thought ?? '');
  const cid = cidOf(String(args.who ?? ''));
  if (!file || !thought || !args.who) {
    throw new Error('usage: mind-trace run.json --thought 想學武 --who 阿青 [--drop-memory id[,id]|auto]');
  }
  if (!THOUGHT_BY_NAME[thought]) throw new Error(`沒有這個心念：${thought}`);
  const summary = JSON.parse(readFileSync(file, 'utf8'));
  const trace = summary.mind as MindTrace | undefined;
  if (!trace?.on) throw new Error(`${file} 沒有心念紀錄：請用 wuxia:headless -- --days N（w05-mind 開）產生`);
  const say = (s: string) => process.stdout.write(s + '\n');
  const first = firstAppearance(trace, cid, thought);
  say(`# ${nameOf(cid)}「${thought}」（seed ${summary.seed}，hash ${String(summary.finalHash).slice(0, 16)}…）`);
  if (!first) {
    say(`${nameOf(cid)}在這 ${trace.evals.length} 次評估裡都沒有「${thought}」`);
  } else {
    say(`第一次出現：第 ${first.day} 日寅正，強度 ${first.s}`);
    say('觸發記憶：');
    for (const id of first.causes) {
      const mem = trace.memories[id];
      say(`  #${id} ${mem ? memoryText(mem) : '(不在紀錄裡)'}`);
    }
  }
  const dropArg = args['drop-memory'];
  if (dropArg === undefined) return;
  const drop =
    String(dropArg) === 'auto'
      ? first
        ? [first.causes[0]]
        : []
      : String(dropArg)
          .split(',')
          .filter(Boolean)
          .map(Number);
  if (drop.length === 0) throw new Error('--drop-memory 沒有可丟的記憶 id');
  const { runHeadless } = await import('./headless');
  const { quietConsole } = await import('./sim');
  quietConsole(false);
  const days = summary.life?.days ?? Math.round((summary.clock?.gameMinute ?? 0) / 1440);
  const run = runHeadless({
    seed: summary.seed,
    minutes: 0,
    untilGameMinute: days * 1440,
    trace: true,
    elements: Object.fromEntries(
      Object.keys(defaultWuxiaConfig.elements).map((id) => [id, (summary.enabledElements ?? []).includes(id)]),
    ),
    dropMemories: drop,
  });
  const again = firstAppearance(run.summary.mind!, cid, thought);
  say('');
  say(`## 丟掉記憶 ${drop.map((d) => `#${d}`).join('、')} 重跑（${days} 日，hash ${run.finalHash.slice(0, 16)}…）`);
  for (const id of drop) {
    const mem = trace.memories[id];
    if (mem) say(`  丟掉 #${id} ${memoryText(mem)}`);
  }
  if (!again) say(`結果：「${thought}」沒有出現（原本第 ${first?.day ?? '—'} 日）`);
  else {
    say(`結果：「${thought}」第 ${again.day} 日出現（原本第 ${first?.day ?? '—'} 日）`);
    say('這次的觸發記憶：');
    for (const id of again.causes) {
      const mem = run.summary.mind!.memories[id];
      say(`  #${id} ${mem ? memoryText(mem) : '(不在紀錄裡)'}`);
    }
  }
  const delayed = !again || !first || again.day > first.day;
  say(delayed ? 'PASS 心念延後或不出現' : 'FAIL 心念沒有延後');
  if (!delayed) process.exit(1);
}

if (process.argv[1]?.endsWith('mind-trace.ts')) main();
