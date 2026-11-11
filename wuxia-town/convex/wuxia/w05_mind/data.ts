// 武俠小鎮 W5（#557，元素 id `w05-mind`）：心念資料（data/wuxia/thoughts.json）、記憶與心念的型別、
// 以及純函式（條件評估、日程時段、邀請倍率、對話 prompt 的「心事」）。引擎、前端、工具共用；不碰世界狀態以外的東西。
// 本檔不 import w03_life／w04_dojo 的 index（w03_life 會反過來 import 本檔的效果函式）。
import thoughtsJson from '../../../data/wuxia/thoughts.json';
import type { ScheduleBlock } from '../w03_life/data';
import type { WuxiaState } from '../state';
import { readClock } from '../clock';

export const W05_MIND = 'w05-mind';
/** 跟 w04_dojo 相同的 id（避免 import w04_dojo/index 造成循環） */
const W04_DOJO_ID = 'w04-dojo';

export type MemoryKind =
  | 'listen'
  | 'talk'
  | 'meal_with'
  | 'first_visit'
  | 'trained'
  | 'tier_up'
  | 'gaze'
  | 'loiter_seen'
  | 'gaze_home'
  | 'newcomer'
  | 'spar_lost';

/** #557：`{t, kind, other?, place?, weight}`；另加 id（全世界唯一、遞增，給 --drop-memory 用）與 n（數量，例如練功分鐘）。 */
export type Memory = {
  id: number;
  t: number;
  kind: MemoryKind;
  other?: string;
  place?: string;
  n?: number;
  /** 合併進這筆的最後一次事件時間（mergeSameDay） */
  tEnd?: number;
  /** 升階：例如「拳腳入門」 */
  what?: string;
  weight: number;
};

export type Thought = {
  id: string;
  /** 強度 0–100 */
  s: number;
  /** 出現的遊戲日 */
  since: number;
  /** 觸發它的記憶 id（最近評估時） */
  causes: number[];
};

export type MindPerson = {
  cid: string;
  memories: Memory[];
  thoughts: Thought[];
  /** 去過的地點（第一次去才記憶） */
  places: string[];
  /** 今天（上次評估後）練功分鐘 */
  trainMin: number;
  /** 各技能目前的階（tier 索引），升階才記憶 */
  tiers?: Record<string, number>;
};

export type MindState = {
  v: 1;
  minute: number;
  /** 上次評估的遊戲日 */
  evalDay: number;
  /** 下一筆記憶的 id */
  seq: number;
  /** 鍵是 playerId */
  people: Record<string, MindPerson>;
  /** 對照實驗：這些 id 的記憶不寫入（mind-trace --drop-memory） */
  drop?: number[];
  /** 對照實驗：被丟掉的事件（pid → 種類 → 遊戲日），當天的後續同類事件一起不記 */
  dropped?: Record<string, Partial<Record<MemoryKind, number>>>;
};

type Cond =
  | { all: Cond[] }
  | { any: Cond[] }
  | { count: MemoryKind; min: number }
  | { skill: string; lt: number }
  | { daysSince: MemoryKind; min: number };

export type ThoughtDef = {
  id: string;
  name: string;
  who: '*' | string[];
  when: Cond;
  start: number;
  grow: number;
  effects: {
    inviteX?: { with: string; x: number };
    preferNewcomer?: boolean;
    reopenDojo?: boolean;
    schedule?: Record<
      string,
      { dojoClosed?: ScheduleBlock[]; dojoOpen?: ScheduleBlock[]; always?: ScheduleBlock[] }
    >;
  };
};

export const MIND = thoughtsJson as unknown as {
  memorySize: number;
  decayPerDay: number;
  windowDays: number;
  evalMinuteOfDay: number;
  maxPerPerson: number;
  decay: number;
  causes: number;
  newcomerAfter: number;
  mergeSameDay: MemoryKind[];
  weights: Record<MemoryKind, number>;
  thoughts: ThoughtDef[];
};
export const THOUGHTS: ThoughtDef[] = MIND.thoughts;
export const THOUGHT_BY_ID: Record<string, ThoughtDef> = Object.fromEntries(THOUGHTS.map((t) => [t.id, t]));
export const THOUGHT_BY_NAME: Record<string, ThoughtDef> = Object.fromEntries(
  THOUGHTS.map((t) => [t.name, t]),
);

export function mindOf(w: WuxiaState | undefined): MindState | undefined {
  if (!w || !w.enabled[W05_MIND]) return undefined;
  return w.elements[W05_MIND] as MindState | undefined;
}

/** 評估用的情境：此刻遊戲分鐘、技能值、新人名單。 */
export type EvalCtx = { gm: number; skills?: Record<string, number> };

/** 條件是否成立；成立時回傳觸發的記憶（最近的在前）。 */
export function evalCond(
  cond: Cond,
  person: MindPerson,
  ctx: EvalCtx,
): { ok: boolean; causes: Memory[] } {
  const since = ctx.gm - MIND.windowDays * 1440;
  if ('all' in cond) {
    const parts = cond.all.map((c) => evalCond(c, person, ctx));
    return { ok: parts.every((p) => p.ok), causes: parts.flatMap((p) => p.causes) };
  }
  if ('any' in cond) {
    const parts = cond.any.map((c) => evalCond(c, person, ctx)).filter((p) => p.ok);
    return { ok: parts.length > 0, causes: parts.flatMap((p) => p.causes) };
  }
  if ('count' in cond) {
    const hits = person.memories.filter((m) => m.kind === cond.count && m.t >= since && m.t <= ctx.gm);
    return { ok: hits.length >= cond.min, causes: hits.slice().reverse() };
  }
  if ('skill' in cond) {
    const v = ctx.skills?.[cond.skill] ?? 0;
    return { ok: v < cond.lt, causes: [] };
  }
  // daysSince：距最後一筆某種記憶 ≥ min 日（沒有就從開局算）
  const last = [...person.memories].reverse().find((m) => m.kind === cond.daysSince);
  const from = last ? last.t : 0;
  return { ok: ctx.gm - from >= cond.min * 1440, causes: last ? [last] : [] };
}

export function appliesTo(def: ThoughtDef, cid: string): boolean {
  return def.who === '*' || def.who.includes(cid);
}

/** 挑「因為」：觸發記憶依 weight 高→低、再依時間新→舊，取前 MIND.causes 筆。 */
export function pickCauses(causes: Memory[]): number[] {
  const uniq = new Map<number, Memory>();
  for (const m of causes) uniq.set(m.id, m);
  return [...uniq.values()]
    .sort((a, b) => b.weight - a.weight || b.t - a.t || b.id - a.id)
    .slice(0, MIND.causes)
    .map((m) => m.id);
}

export type ThoughtChange = { cid: string; thought: string; kind: 'appear' | 'grow' | 'fade' | 'vanish'; s: number };

/**
 * 一次寅時評估（#557「心念」）。直接改 person.thoughts；回傳變化（給報告）。
 * 條件成立：沒有就出現（start）、有就 +grow（上限 100）；不成立：−decay，到 0 消失；超過 maxPerPerson 留強的。
 */
export function evaluatePerson(person: MindPerson, ctx: EvalCtx, day: number): ThoughtChange[] {
  const changes: ThoughtChange[] = [];
  const next: Thought[] = [];
  for (const def of THOUGHTS) {
    if (!appliesTo(def, person.cid)) continue;
    const cur = person.thoughts.find((t) => t.id === def.id);
    const r = evalCond(def.when, person, ctx);
    if (r.ok) {
      const causes = pickCauses(r.causes);
      if (cur) {
        const s = Math.min(100, cur.s + def.grow);
        if (s !== cur.s) changes.push({ cid: person.cid, thought: def.name, kind: 'grow', s });
        next.push({ ...cur, s, causes: causes.length ? causes : cur.causes });
      } else {
        changes.push({ cid: person.cid, thought: def.name, kind: 'appear', s: def.start });
        next.push({ id: def.id, s: def.start, since: day, causes });
      }
    } else if (cur) {
      const s = Math.max(0, cur.s - MIND.decay);
      if (s > 0) {
        changes.push({ cid: person.cid, thought: def.name, kind: 'fade', s });
        next.push({ ...cur, s });
      } else changes.push({ cid: person.cid, thought: def.name, kind: 'vanish', s: 0 });
    }
  }
  // 最多 maxPerPerson 個：強度高的留下（同強度先出現的優先，再依定義順序）
  const order = (t: Thought) => THOUGHTS.findIndex((d) => d.id === t.id);
  next.sort((a, b) => b.s - a.s || a.since - b.since || order(a) - order(b));
  const kept = next.slice(0, MIND.maxPerPerson);
  for (const t of next.slice(MIND.maxPerPerson)) {
    const name = THOUGHT_BY_ID[t.id].name;
    const i = changes.findIndex((c) => c.thought === name && c.cid === person.cid);
    if (i >= 0) changes.splice(i, 1);
    changes.push({ cid: person.cid, thought: name, kind: 'vanish', s: 0 });
  }
  kept.sort((a, b) => order(a) - order(b));
  person.thoughts = kept;
  return changes;
}

/** 武館開了沒：w04-dojo 有開而且 openedAt 有值。w04-dojo 沒開＝沒有武館（W5 的武館相關效果都不生效）。 */
export function dojoOpen(w: WuxiaState): boolean {
  const d = w.enabled[W04_DOJO_ID] ? (w.elements[W04_DOJO_ID] as { openedAt?: number } | undefined) : undefined;
  return d?.openedAt !== undefined;
}

export function hasThought(m: MindState | undefined, pid: string, id: string): boolean {
  return !!m?.people[pid]?.thoughts.some((t) => t.id === id);
}

/** cid → 心念加的日程時段（放在原日程前面，所以優先；thoughts.json 保證只放在留白）。 */
export function mindBlocks(w: WuxiaState): Record<string, ScheduleBlock[]> | undefined {
  const m = mindOf(w);
  if (!m) return undefined;
  const open = dojoOpen(w);
  const hasDojo = !!w.enabled[W04_DOJO_ID];
  const out: Record<string, ScheduleBlock[]> = {};
  for (const pid of Object.keys(m.people).sort()) {
    const p = m.people[pid];
    for (const t of p.thoughts) {
      const sched = THOUGHT_BY_ID[t.id]?.effects.schedule?.[p.cid];
      if (!sched) continue;
      const blocks = [
        ...(sched.always ?? []),
        ...(hasDojo ? ((open ? sched.dojoOpen : sched.dojoClosed) ?? []) : []),
      ];
      if (blocks.length) (out[p.cid] ??= []).push(...blocks);
    }
  }
  return out;
}

/** w04-dojo 的日程覆蓋要不要擋下：w05-mind 開著、武館還沒重開。 */
export function closedOverlays(w: WuxiaState): string[] | undefined {
  if (!mindOf(w)) return undefined;
  return dojoOpen(w) ? [] : [W04_DOJO_ID];
}

/** 新人：開局 newcomerAfter 分鐘之後才進鎮的人（pid 集合）。 */
export function newcomers(m: MindState): Set<string> {
  const out = new Set<string>();
  for (const p of Object.values(m.people))
    for (const mem of p.memories) if (mem.kind === 'newcomer' && mem.other) out.add(mem.other);
  return out;
}

/** #557 邀請機率倍率：a 有心念 inviteX 且 b 是 with 的人（或新人）。 */
export function inviteMultiplier(m: MindState | undefined, pidA: string, cidB: string, newcomerB: boolean): number {
  if (!m) return 1;
  let x = 1;
  for (const t of m.people[pidA]?.thoughts ?? []) {
    const e = THOUGHT_BY_ID[t.id]?.effects.inviteX;
    if (!e) continue;
    if (e.with === cidB || (e.with === 'newcomer' && newcomerB)) x = Math.max(x, e.x);
  }
  return x;
}

export function prefersNewcomer(m: MindState | undefined, pid: string): boolean {
  return !!m?.people[pid]?.thoughts.some((t) => THOUGHT_BY_ID[t.id]?.effects.preferNewcomer);
}

/** 對話 prompt 用：「想學武（強度 70）、想變強（強度 50）」；沒有心念回傳 undefined。 */
export function thoughtsLine(w: WuxiaState | undefined, pid: string): string | undefined {
  const m = mindOf(w);
  const p = m?.people[pid];
  if (!p || p.thoughts.length === 0) return undefined;
  return p.thoughts.map((t) => `${THOUGHT_BY_ID[t.id]?.name ?? t.id}（強度 ${t.s}）`).join('、');
}

const KIND_TEXT: Record<MemoryKind, string> = {
  listen: '聽書{times}',
  talk: '跟{other}聊天',
  meal_with: '跟{other}一起吃飯',
  first_visit: '第一次去{place}',
  trained: '練功 {n} 分',
  tier_up: '{what}（升階）',
  gaze: '在武館外張望',
  loiter_seen: '{other}在武館外徘徊',
  gaze_home: '在城門外張望',
  newcomer: '{other}到鎮上',
  spar_lost: '切磋輸給{other}',
};

/** 記憶的說明文字（畫面「因為…」與報告共用）。names：cid → 名字；places：地點 id → 名字。 */
export function describeMemory(
  m: Memory,
  names: (cid: string) => string = (c) => c,
  places: (id: string) => string = (p) => p,
): string {
  const day = readClock(m.t).day;
  const body = KIND_TEXT[m.kind]
    .replace('{other}', m.other ? names(m.other) : '某人')
    .replace('{place}', m.place ? places(m.place) : '某處')
    .replace('{n}', String(m.n ?? ''))
    .replace('{what}', m.what ?? '')
    .replace('{times}', m.kind === 'listen' && (m.n ?? 1) > 1 ? ` ${m.n} 場` : '');
  const where = m.place && m.kind !== 'first_visit' ? `（${places(m.place)}）` : '';
  return `第 ${day} 日 ${body}${where}`;
}
