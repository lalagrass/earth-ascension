// 武俠小鎮 W7（#559，元素 id `w07-bond`）：人際三軸、拜師與師兄弟的資料（data/wuxia/bonds.json、dojo-names.json、rules.json）、
// 狀態型別與純函式（由記憶算關係、心念評估用的關係查詢、師父加成、師兄弟）。引擎、前端、工具共用。
// 本檔只 import 純資料模組（w05_mind/data、w04_dojo/data、clock），不 import 任何元素的 index，
// 所以 w03_life／w04_dojo／w06_spar 都可以讀它而不造成循環。
import bondsJson from '../../../data/wuxia/bonds.json';
import dojoNamesJson from '../../../data/wuxia/dojo-names.json';
import rulesJson from '../../../data/wuxia/rules.json';
import type { WuxiaState } from '../state';
import type { BondEvalCtx, Memory, MindPerson, MindState } from '../w05_mind/data';
import { initialSkills, Skills } from '../w04_dojo/data';
import { readClock } from '../clock';
import { socialEffect } from '../a3_silent/data';

export const W07_BOND = 'w07-bond';

export const AXES = ['close', 'respect', 'rival'] as const;
export type Axis = (typeof AXES)[number];
export type Bond = Record<Axis, number>;
export const AXIS_LABELS: Record<Axis, string> = { close: '親近', respect: '敬重', rival: '競爭' };

export const BONDS = bondsJson as unknown as {
  windowDays: number;
  decayPerDay: number;
  evalMinuteOfDay: number;
  min: number;
  max: number;
  effects: Record<string, Partial<Bond>>;
  mixedRival: number;
  skillGap: { key: keyof Skills; respect: number; rival: number };
  siblingClose: number;
  trace: number;
  masterBonus: number;
  maxDisciples: number;
  approachMinutes: number;
  kneelMinutes: number;
  refuseCooldownDays: number;
  bowWindow: [number, number];
  bowMaxNeed: number;
};
export const DOJO_NAMES: string[] = (dojoNamesJson as any).names;
export type RuleDef = { id: string; name: string; text: string; check: string; from?: number; to?: number; minMinutes?: number; do?: string[] };
export const RULES: RuleDef[] = (rulesJson as any).rules;
export const RULE_BY_ID: Record<string, RuleDef> = Object.fromEntries(RULES.map((r) => [r.id, r]));

/** 拜過師的人（鍵是弟子人物 id）。order＝在這位師父門下的入門順序（1 起算，師兄弟依此排）。 */
export type Disciple = { master: string; since: number; day: number; order: number };

/** 進行中的拜師（同時最多一件）。a＝弟子 playerId、b＝師父 playerId。 */
export type BowEvent = {
  id: number;
  a: string;
  b: string;
  ca: string;
  cb: string;
  startGm: number;
  phase: 'approach' | 'kneel';
  approachUntil: number;
  kneelAt?: number;
  kneelUntil?: number;
  spot: [number, number];
  /** 觸發的心念「想拜師」當時的「因為」（記憶 id） */
  causes: number[];
};

/** 拜師紀錄（報告用）。 */
export type BowRecord = {
  id: number;
  day: number;
  gm: number;
  disciple: string;
  master: string;
  accepted: boolean;
  /** 同意／拒絕的理由（規則） */
  reason: string;
  /** 心念「想拜師」的「因為」（記憶 id，記憶在弟子身上） */
  causes: number[];
  /** 當時的關係：弟子對師父的敬重、師父對弟子的親近 */
  respect: number;
  close: number;
  /** 寫進記憶的 id（人物 id → 記憶 id） */
  memories: Record<string, number>;
};

export type Violation = { id: number; day: number; gm: number; rule: string; disciple: string; master: string; memories: Record<string, number> };

export type BondState = {
  v: 1;
  minute: number;
  /** 上次重算關係的遊戲日 */
  evalDay: number;
  /** bonds[A][B]＝A 對 B 的三軸（#559「快取在 wuxia.bonds」；放在元素狀態裡，見 DEVIATIONS W7-1） */
  bonds: Record<string, Record<string, Bond>>;
  /** A1（a1-base）：1＝「徒弟違規」每遊戲日最多算一次（關閉時沒有這個欄位，跟 W9 相同） */
  violationPerDay?: 1;
  disciples: Record<string, Disciple>;
  /** 日程加的時段（人物 id → 時段）：弟子的「辰時練功（門規）」、師父的「指點徒弟」；w03-life 的日程讀它 */
  masterBlocks: Record<string, Array<{ from: number; to: number; label: string; do: string[] }>>;
  /** masterBlocks 是依哪一天、哪一次心念評估、哪些弟子算的（變了就重算） */
  blocksKey?: string;
  seq: number;
  active?: BowEvent;
  events: BowRecord[];
  /** 拜師被拒後，到這個遊戲分鐘之前不再去拜（人物 id → 遊戲分鐘） */
  refusedUntil: Record<string, number>;
  /** 武館名號與掛匾時間（周教頭收第一個徒弟時） */
  dojoName?: string;
  plaqueAt?: number;
  violations: Violation[];
  /** 辰時練功：弟子今天辰時練了幾分（人物 id → [遊戲日, 分鐘]）；checked＝檢查過的遊戲日 */
  drill: Record<string, [number, number]>;
  drillChecked: number;
  /** 已檢查過私鬥的切磋紀錄 id（w06-spar history） */
  sparSeen: number;
  /** 引擎內建 tick（agent.ts）記下的「邀請被拒」，本元素 tick 時轉成記憶 */
  pendingRejects: Array<{ t: number; inviter: string; invitee: string }>;
};

export function initBondState(): BondState {
  return {
    v: 1,
    minute: -1,
    evalDay: 0,
    bonds: {},
    disciples: {},
    masterBlocks: {},
    seq: 1,
    events: [],
    refusedUntil: {},
    violations: [],
    drill: {},
    drillChecked: 0,
    sparSeen: 0,
    pendingRejects: [],
  };
}

export function bondOf(w: WuxiaState | undefined): BondState | undefined {
  if (!w || !w.enabled[W07_BOND]) return undefined;
  return w.elements[W07_BOND] as BondState | undefined;
}

export function zeroBond(): Bond {
  return { close: 0, respect: 0, rival: 0 };
}

export function masterOf(w: WuxiaState | undefined, cid: string): string | undefined {
  return bondOf(w)?.disciples[cid]?.master;
}

export function disciplesOf(state: BondState, master: string): string[] {
  return Object.keys(state.disciples)
    .filter((c) => state.disciples[c].master === master)
    .sort((a, b) => state.disciples[a].order - state.disciples[b].order);
}

/** 同門師兄弟：兩人都拜了同一個師父。回傳 a 對 b 的稱呼（「師兄」「師弟」）；不是同門回 undefined。 */
export function siblingTitle(state: BondState | undefined, a: string, b: string): string | undefined {
  const da = state?.disciples[a];
  const db = state?.disciples[b];
  if (!da || !db || da.master !== db.master) return undefined;
  return db.order < da.order ? '師兄' : '師弟';
}

/** 拳腳差距的記憶種類對應到 bonds.json 的 effects 鍵。 */
function effectKey(m: Memory): string | undefined {
  if (m.kind === 'saw_skill') {
    const gap = m.n ?? 0;
    if (gap >= BONDS.skillGap.respect) return 'saw_skill_high';
    if (Math.abs(gap) <= BONDS.skillGap.rival) return 'saw_skill_near';
    return undefined;
  }
  if (m.kind === 'spar_seen') return m.n === 0 ? undefined : 'spar_seen';
  return m.kind;
}

/** 一筆貢獻：一筆記憶（或固定項）對 A→B 三軸各加多少。 */
export type Contribution = { memory?: Memory; label?: string; delta: Partial<Bond> };

const round4 = (v: number) => Math.round(v * 1e4) / 1e4;

/** 這筆記憶是關於誰（spar_seen 的 other 是贏家）。 */
function aboutWhom(m: Memory): string | undefined {
  return m.other;
}

/**
 * A（記憶的主人，人物 id ca）對 B（cb）的所有貢獻：近 windowDays 日的記憶 × effects × 衰減，
 * 加上「切磋互有勝負」與「師兄弟」兩個固定項。
 */
export function contributions(
  person: MindPerson | undefined,
  ca: string,
  cb: string,
  gm: number,
  state: BondState | undefined,
): Contribution[] {
  const out: Contribution[] = [];
  if (!person) return out;
  const since = gm - BONDS.windowDays * 1440;
  let won = 0;
  let lost = 0;
  // A1（#564 第 8 項，a1-base）：師父對同一個徒弟的「徒弟違規」每個遊戲日最多算一次（記憶照記，敬重只扣一次）
  const violatedDays = new Set<number>();
  for (const m of person.memories) {
    if (m.t < since || m.t > gm) continue;
    if (aboutWhom(m) !== cb) continue;
    if (m.kind === 'disciple_violated' && state?.violationPerDay) {
      const d = readClock(m.t).day;
      if (violatedDays.has(d)) continue;
      violatedDays.add(d);
    }
    if (m.kind === 'spar_won') won++;
    if (m.kind === 'spar_lost') lost++;
    // A3（#574）：無言互動的記憶自帶三軸效果（interactions.json），每筆可追到互動紀錄 id（m.n）
    const key = m.kind === 'social' ? undefined : effectKey(m);
    const eff = m.kind === 'social' ? socialEffect(m) : key ? BONDS.effects[key] : undefined;
    if (!eff) continue;
    const f = Math.pow(BONDS.decayPerDay, (gm - m.t) / 1440);
    const delta: Partial<Bond> = {};
    // A2（#575）：看到大師晨練加的敬重依好武縮放（記憶的 n＝好武×100）
    const scale = m.kind === 'saw_form' ? (m.n ?? 100) / 100 : 1;
    for (const a of AXES) if (eff[a]) delta[a] = round4(eff[a]! * f * scale);
    if (Object.keys(delta).length) out.push({ memory: m, delta });
  }
  if (won > 0 && lost > 0) out.push({ label: `切磋互有勝負（贏 ${won} 輸 ${lost}）`, delta: { rival: BONDS.mixedRival * Math.min(won, lost) } });
  const title = siblingTitle(state, ca, cb);
  if (title) out.push({ label: `同門${title}`, delta: { close: BONDS.siblingClose } });
  return out;
}

export function sumBond(cs: Contribution[]): Bond {
  const b = zeroBond();
  for (const c of cs) for (const a of AXES) b[a] += c.delta[a] ?? 0;
  for (const a of AXES) b[a] = Math.max(BONDS.min, Math.min(BONDS.max, Math.round(b[a])));
  return b;
}

/** 貢獻最大的幾筆（依某軸的絕對值，同值依時間新→舊、再依 id）。 */
export function topContributions(cs: Contribution[], axis: Axis, n = BONDS.trace): Contribution[] {
  return cs
    .filter((c) => (c.delta[axis] ?? 0) !== 0)
    .sort(
      (x, y) =>
        Math.abs(y.delta[axis] ?? 0) - Math.abs(x.delta[axis] ?? 0) ||
        (y.memory?.t ?? Infinity) - (x.memory?.t ?? Infinity) ||
        (y.memory?.id ?? 0) - (x.memory?.id ?? 0),
    )
    .slice(0, n);
}

/** 重算全部關係（每遊戲日寅初）。鍵與順序固定（人物 id 排序）。 */
export function computeBonds(mind: MindState, state: BondState, gm: number): Record<string, Record<string, Bond>> {
  const people = Object.values(mind.people)
    .map((p) => p)
    .sort((x, y) => (x.cid < y.cid ? -1 : x.cid > y.cid ? 1 : 0));
  const out: Record<string, Record<string, Bond>> = {};
  for (const a of people) {
    const row: Record<string, Bond> = {};
    for (const b of people) {
      if (a.cid === b.cid) continue;
      row[b.cid] = sumBond(contributions(a, a.cid, b.cid, gm, state));
    }
    out[a.cid] = row;
  }
  return out;
}

export function bondBetween(w: WuxiaState | undefined, a: string, b: string): Bond {
  return bondOf(w)?.bonds[a]?.[b] ?? zeroBond();
}

function skillsOf(w: WuxiaState, cid: string): Skills {
  const dojo = w.enabled['w04-dojo'] ? (w.elements['w04-dojo'] as { skills?: Record<string, Skills> } | undefined) : undefined;
  return dojo?.skills?.[cid] ?? initialSkills(cid);
}

/**
 * W5 心念評估用的關係查詢（w05_mind 的 bond／noMaster 條件）。w07-bond 關閉時回 undefined。
 * best：A 對誰的 axis ≥ min 且對方 skill − 自己 ≥ gap；多人符合取最高（同分依人物 id），「因為」＝該軸貢獻最大的記憶。
 */
export function bondEvalCtx(w: WuxiaState, mind: MindState, pid: string, gm: number): BondEvalCtx | undefined {
  const state = bondOf(w);
  if (!state) return undefined;
  const me = mind.people[pid];
  if (!me) return undefined;
  return {
    hasMaster: !!state.disciples[me.cid],
    best: (axis, min, skill, gap) => {
      const row = state.bonds[me.cid] ?? {};
      const mine = (skillsOf(w, me.cid) as any)[skill] ?? 0;
      let hit: { cid: string; v: number } | undefined;
      for (const other of Object.keys(row).sort()) {
        const v = row[other][axis];
        if (v < min) continue;
        if (((skillsOf(w, other) as any)[skill] ?? 0) - mine < gap) continue;
        if (!hit || v > hit.v) hit = { cid: other, v };
      }
      if (!hit) return undefined;
      const causes = topContributions(contributions(me, me.cid, hit.cid, gm, state), axis)
        .filter((c) => c.memory && (c.delta[axis] ?? 0) > 0)
        .map((c) => c.memory!);
      return { cid: hit.cid, causes };
    },
  };
}

/** W4 練功的加成：師父在場（師父在武館、醒著、不在對話）時用 masterBonus（#559「1.5 → 2.0」）。 */
export function masterBonusFor(w: WuxiaState, cid: string, present: (cid: string) => boolean): number | undefined {
  const m = masterOf(w, cid);
  if (!m) return undefined;
  return present(m) ? BONDS.masterBonus : undefined;
}

/** W6：兩人「彼此競爭」都 ≥ min（#558「（W7 後）彼此競爭高」也能切磋）。 */
export function mutualRival(w: WuxiaState | undefined, a: string, b: string, min: number): boolean {
  const s = bondOf(w);
  if (!s) return false;
  return (s.bonds[a]?.[b]?.rival ?? 0) >= min && (s.bonds[b]?.[a]?.rival ?? 0) >= min;
}

/** 依世界 seed 選武館名號（不耗 game.rng()）。 */
export function dojoNameFor(seed: number): string {
  const n = DOJO_NAMES.length;
  return DOJO_NAMES[((Math.trunc(seed) % n) + n) % n];
}
