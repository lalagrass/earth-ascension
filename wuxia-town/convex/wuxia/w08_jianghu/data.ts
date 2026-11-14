// 武俠小鎮 W8（#560，元素 id `w08-jianghu`）：江湖事件導演、傳聞與編年的資料（data/wuxia/events.json）、型別與純函式。
// 引擎、前端、工具共用；不碰世界狀態以外的東西。傳聞的文字與走樣全由規則決定（LLM 不參與）。
import eventsJson from '../../../data/wuxia/events.json';
import charactersJson from '../../../data/wuxia/characters.json';
import townsfolkJson from '../../../data/wuxia/townsfolk.json';
import type { WuxiaState } from '../state';
import type { Fighter, Bout } from '../w06_spar/duel';
import { zhNumber } from '../w06_spar/narration';

export const W08_JIANGHU = 'w08-jianghu';

export type EventKind = 'xiake' | 'bandit' | 'xiaobi' | 'story';
export const EVENT_KINDS: EventKind[] = ['xiake', 'bandit', 'xiaobi', 'story'];
export type RumorAbout = 'dojo' | 'wealth' | 'bandit' | 'xiake' | 'master';

type Range = [number, number];
type Cause = { out?: RumorAbout; noOut?: 'fighter'; dojoDays?: number; tellerKnows?: boolean };
export type EventDef = {
  name: string;
  big: boolean;
  weight: number;
  cooldownDays: number;
  cause: Cause;
  [k: string]: any;
};

export const JIANGHU = eventsJson as unknown as {
  director: { rollMinuteOfDay: number; chance: number; quietDays: number; boostAfterDays: number; boost: number };
  events: Record<EventKind, EventDef>;
  rumor: {
    distort: number;
    spreadBase: number;
    spreadPerClose: number;
    spreadMin: number;
    spreadMax: number;
    perTalk: number;
    outDays: number;
  };
  merchant: {
    everyDays: number;
    arriveMinuteOfDay: number;
    leaveMinuteOfDay: number;
    name: string;
    listenMinutes: number;
    tellChance: number;
  };
  restock: { everyDays: number; offsetDay: number; minuteOfDay: number; goods: Range };
  chronicle: { llmMinuteOfDay: number; maxChars: number };
  places: {
    gate: [number, number];
    mountain: [number, number];
    teahouse: [number, number];
    pharmacy: [number, number];
    dojoRing: [[number, number], [number, number]];
    dojoCrowd: [number, number];
  };
};

const CHAR_NAMES: Record<string, string> = Object.fromEntries(
  [
    ...((charactersJson as any).characters ?? charactersJson),
    // A2（#575）：候選池與大師
    ...(townsfolkJson as any).pool,
    (townsfolkJson as any).master,
  ].map((c: any) => [c.id, c.name]),
);
/** 人物 id → 名字（鎮民用 characters.json；外人與行商的「id」本身就是名字）。 */
export function cidName(cid: string | undefined): string {
  if (!cid) return '某人';
  return CHAR_NAMES[cid] ?? cid;
}

// ---------- 傳聞 ----------

export type Facts = {
  /** dojo：reopen／plaque／xiaobi */
  feat?: string;
  coach?: string;
  /** A2：大師人物 id、傳說中的歲數（往大裡說） */
  master?: string;
  age?: number;
  disciples?: number;
  dojoName?: string;
  winner?: string;
  /** wealth：箱數 */
  goods?: number;
  /** bandit */
  count?: number;
  outcome?: 'fled' | 'robbed';
  heroes?: string[];
  loot?: number;
  /** xiake */
  name?: string;
  opp?: string;
  result?: 'town' | 'xiake' | 'draw' | 'none';
  rounds?: number;
  days?: number;
};

/** #560 `{id, about, text, truth}`；另記來自哪個事件、哪天發生。 */
export type Rumor = { id: number; about: RumorAbout; text: string; truth: Facts; day: number; gm: number; event?: number };

/** 某人聽到的版本。from＝誰告訴他（親眼看到時沒有）；hop＝第幾手（親眼 0）。 */
export type Heard = { rid: number; facts: Facts; text: string; from?: string; via: Via; hop: number; day: number; gm: number; distorted: boolean };
export type Via = 'saw' | 'talk' | 'story';

/** 傳聞路徑的一筆（rumor-trace 讀這份）。to＝人物 id 或「行商」。 */
export type TrailEntry = {
  rid: number;
  day: number;
  gm: number;
  from?: string;
  to: string;
  via: Via | 'merchant';
  hop: number;
  distorted: boolean;
  text: string;
};

export type OutRumor = { rid: number; about: RumorAbout; facts: Facts; text: string; day: number; gm: number; from: string };

/** 數量（量詞前）：2 說「兩」，其他用中文數字（0–99）。 */
export function zhCount(v: number): string {
  const x = Math.max(0, Math.min(99, Math.round(v)));
  return x === 2 ? '兩' : zhNumber(x);
}

/** 規則產生的傳聞文字（names 已含在 cidName）。 */
export function rumorText(about: RumorAbout, f: Facts): string {
  const n = (v: number | undefined) => zhCount(v ?? 0);
  switch (about) {
    case 'wealth':
      return `藥鋪新進了${n(f.goods)}箱藥材`;
    case 'dojo': {
      const coach = cidName(f.coach);
      const dis = (f.disciples ?? 0) > 0 ? `，門下已有${n(f.disciples)}個徒弟` : '';
      if (f.feat === 'plaque') return `武館掛上「${f.dojoName ?? '武館'}」的匾${dis}，${coach}寶刀未老`;
      if (f.feat === 'xiaobi')
        return f.winner === f.coach ? `武館辦小比，${coach}親自下場考較${dis ? `，門下${n(f.disciples)}個徒弟都不是對手` : '，沒人接得住'}` : `武館辦小比，${cidName(f.winner)}拔了頭籌${dis}`;
      return `${coach}把破武館重新開了${dis}`;
    }
    case 'bandit':
      if (f.outcome === 'fled')
        return `${n(f.count)}個山賊下山搶藥鋪，被${(f.heroes ?? []).map(cidName).join('、') || '鎮上的人'}打跑了`;
      return `${n(f.count)}個山賊下山搶走藥鋪${n(f.loot)}箱藥材，沒人敢攔`;
    case 'master':
      // A2（#575）：「鎮上來了高人」（feat arrive）／徒弟改投（feat switch，winner＝弟子，coach＝舊師父）
      if (f.feat === 'switch') return `${cidName(f.winner)}離開${cidName(f.coach)}，改投${cidName(f.master)}門下`;
      return `鎮上來了一位高人${cidName(f.master)}${(f.age ?? 0) > 0 ? `，聽說已經${zhCount(f.age!)}歲了` : ''}，每天清早在小廣場打拳`;
    case 'xiake': {
      const who = `外地俠客${f.name ?? ''}`;
      if (f.result === 'town') return `${who}到武館討教，鬥了${n(f.rounds)}回合敗給${cidName(f.opp)}`;
      if (f.result === 'xiake') return `${who}到武館討教，${n(f.rounds)}回合就勝了${cidName(f.opp)}`;
      if (f.result === 'draw') return `${who}跟${cidName(f.opp)}在武館鬥了${n(f.rounds)}回合，不分勝負`;
      return `${who}在茶館住了${n(f.days)}日，沒找到人切磋就走了`;
    }
  }
}

/**
 * #560「每傳一手有 20% 機率走樣，規則決定走樣方式（例：山賊 3 人 → 5 人）」。
 * 走樣只改數字（往大裡說），不改結局；不耗亂數（是否走樣由呼叫端擲）。
 */
export function distortFacts(about: RumorAbout, f: Facts): Facts {
  const g = { ...f, heroes: f.heroes ? [...f.heroes] : undefined };
  if (g.heroes === undefined) delete g.heroes;
  switch (about) {
    case 'wealth':
      g.goods = (g.goods ?? 1) * 2;
      break;
    case 'bandit':
      g.count = (g.count ?? 2) + 2;
      if (g.outcome === 'robbed') g.loot = (g.loot ?? 1) + 2;
      break;
    case 'dojo':
      g.disciples = (g.disciples ?? 0) + 2;
      break;
    case 'master':
      g.age = (g.age ?? 70) + 30;
      break;
    case 'xiake':
      g.rounds = (g.rounds ?? 1) * 2;
      if (g.result === 'none') g.days = (g.days ?? 1) + 3;
      break;
  }
  return g;
}

/** 「鎮上有人能打」：山賊被打跑、或俠客輸給鎮上的人。 */
export function isFighterRumor(about: RumorAbout, f: Facts): boolean {
  return (about === 'bandit' && f.outcome === 'fled') || (about === 'xiake' && f.result === 'town');
}

// ---------- 外人（行商、俠客、山賊）----------

export type Figure = {
  id: string;
  kind: 'merchant' | 'xiake' | 'bandit';
  name: string;
  x: number;
  y: number;
  /** 走路的目的地（每遊戲分鐘走 1 格，先橫後直） */
  to?: [number, number];
  emoji: string;
  activity?: string;
  skills?: Fighter;
  /** 走到目的地後消失（離鎮） */
  leaving?: boolean;
};

/** 一場外人參與的對打（判定用 W6 duel.ts 的介面）。side：鎮民 pid 或外人 figure id。 */
export type Fight = {
  a: { pid?: string; cid?: string; fid?: string; name: string };
  b: { pid?: string; cid?: string; fid?: string; name: string };
  bout: Bout;
  startGm: number;
};

// ---------- 事件與編年 ----------

export type ActiveEvent = {
  id: number;
  kind: EventKind;
  day: number;
  startGm: number;
  phase: string;
  /** 被事件接手的鎮民（phase 'event'） */
  enlisted: string[];
  figures: string[];
  fight?: Fight;
  data: Record<string, any>;
  forced?: boolean;
  /** 來因：哪些出鎮傳聞讓這個事件的權重 > 0 */
  causes: number[];
};

export type EventRecord = {
  id: number;
  kind: EventKind;
  name: string;
  day: number;
  startGm: number;
  endGm: number;
  forced?: boolean;
  causes: number[];
  /** 結局摘要（報告並列用） */
  outcome: Record<string, any>;
  rumors: number[];
  text: string;
};

export type ChronicleEntry = {
  day: number;
  gm: number;
  event?: number;
  kind: EventKind | 'restock' | 'dojo' | 'merchant';
  /** 規則產生的模板句 */
  text: string;
};

/** 亥時 LLM 改寫的當日段落（經 W2 守門）；沒有就用當日模板句。 */
export type ChronicleDay = { day: number; text: string; guard: string };

export type DirectorRoll = { day: number; p: number; r?: number; candidates: Array<{ kind: EventKind; w: number }>; picked?: EventKind; skipped?: string };

export type JianghuState = {
  v: 1;
  minute: number;
  seq: number;
  rumorSeq: number;
  /** 上一次導演擲骰的遊戲日 */
  rollDay: number;
  /** 大事件結束後平靜到這一天（含）為止 */
  quietUntil: number;
  /** 上一次有事件開始的遊戲日（連續無事加倍用） */
  lastEventDay: number;
  cooldown: Partial<Record<EventKind, number>>;
  active?: ActiveEvent;
  history: EventRecord[];
  rolls: DirectorRoll[];
  rumors: Rumor[];
  /** 人物 id → 聽到的傳聞 */
  known: Record<string, Heard[]>;
  trail: TrailEntry[];
  out: OutRumor[];
  /** 說書說過的傳聞 id */
  told: number[];
  figures: Figure[];
  merchant?: { day: number; arrived?: boolean; met: Record<string, number>; told: Record<string, true> };
  /** 已處理過的對話 id（傳聞只在對話開始時傳一次） */
  convSeen: string[];
  chronicle: ChronicleEntry[];
  chronicleDays: ChronicleDay[];
  /** 已產生的「非事件」傳聞（武館重開、掛匾）：避免重複 */
  born: Record<string, number>;
  /** 藥鋪被搶的箱數累計 */
  pharmacyLoss: number;
  /** 對照實驗（headless）：--force-event kind --day N、--no-rumor-out */
  force?: { kind: EventKind; day: number; done?: boolean };
  noRumorOut?: boolean;
};

export function initJianghuState(): JianghuState {
  return {
    v: 1,
    minute: -1,
    seq: 1,
    rumorSeq: 1,
    rollDay: 0,
    quietUntil: 0,
    lastEventDay: 0,
    cooldown: {},
    history: [],
    rolls: [],
    rumors: [],
    known: {},
    trail: [],
    out: [],
    told: [],
    figures: [],
    convSeen: [],
    chronicle: [],
    chronicleDays: [],
    born: {},
    pharmacyLoss: 0,
  };
}

export function jianghuOf(w: WuxiaState | undefined): JianghuState | undefined {
  if (!w?.enabled[W08_JIANGHU]) return undefined;
  return w.elements[W08_JIANGHU] as JianghuState | undefined;
}

/** 某範圍內的整數（含兩端），耗 1 個亂數。 */
export function rollInt(r: () => number, [lo, hi]: Range): number {
  return lo + Math.floor(r() * (hi - lo + 1));
}

export function rollSkills(r: () => number, s: Record<string, Range>): Fighter {
  return { fist: rollInt(r, s.fist), power: rollInt(r, s.power), stance: rollInt(r, s.stance), stamina: rollInt(r, s.stamina) };
}

/** 有效的出鎮傳聞（outDays 日內）。 */
export function activeOut(st: JianghuState, day: number): OutRumor[] {
  return st.out.filter((o) => day - o.day <= JIANGHU.rumor.outDays);
}

/** 對話 prompt 用：「你最近聽說：…」；沒聽過傳聞回傳 undefined。最多 3 則，最新的在前。 */
export function rumorsLine(w: WuxiaState | undefined, cid: string, max = 3): string | undefined {
  const st = jianghuOf(w);
  const list = st?.known[cid];
  if (!list || list.length === 0) return undefined;
  return list
    .slice(-max)
    .reverse()
    .map((h) => h.text)
    .join('；');
}

/** 對話 prompt 用（playerId 版）。 */
export function rumorsLineForPlayer(w: WuxiaState | undefined, playerId: string): string | undefined {
  const life = w?.elements['w03-life'] as { people?: Record<string, { cid: string }> } | undefined;
  const cid = life?.people?.[playerId]?.cid;
  return cid ? rumorsLine(w, cid) : undefined;
}
