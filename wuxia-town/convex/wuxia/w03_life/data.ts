// 武俠小鎮 W3（#555）：生活資料（物件、需求、日程、地點）的型別與載入。純資料，引擎與前端共用。
import objectsJson from '../../../data/wuxia/objects.json';
import needsJson from '../../../data/wuxia/needs.json';
import schedulesJson from '../../../data/wuxia/schedules.json';
import placesJson from '../../../data/wuxia/places.json';
import townsfolkJson from '../../../data/wuxia/townsfolk.json';
import type { WuxiaState } from '../state';
import { closedOverlays, mindBlocks, mindOf } from '../w05_mind/data';

export type Need = 'hunger' | 'fatigue' | 'boredom' | 'chore';
export type Resource = 'water' | 'meal' | 'wood';
export type Needs = Record<Need, number>;
export type Stock = Record<Resource, number>;

export type ActivityDef = {
  id: string;
  label: string;
  emoji: string;
  minutes: number;
  roles: string[];
  needs?: Partial<Needs>;
  gives?: Partial<Stock>;
  consumes?: Partial<Stock>;
  requires?: {
    timeOfDay?: [number, number];
    whileActive?: string;
    minGap?: number;
    scheduledOrNeed?: Need;
    /** W4：只有日程排到才做（練功不會在留白時亂入） */
    scheduledOnly?: boolean;
  };
  leisure?: boolean;
};

export type ObjectDef = {
  id: string;
  name: string;
  place: string;
  tile: [number, number];
  capacity: number;
  slots: Array<[number, number]>;
  owner?: string;
  household?: string;
  /** W4：只有這個元素開啟時才存在的物件（例如武館的木人樁屬於 w04-dojo）。沒寫＝W3 起就有 */
  element?: string;
  activities: ActivityDef[];
};

export type ScheduleBlock = {
  from: number;
  to: number;
  label: string;
  do: string[];
  /** W4：每幾天一次（第 1 日起算，第 1、1+n、1+2n… 日才有這個時段）。沒寫＝每天 */
  everyDays?: number;
};
export type Schedule = { worker: boolean; blocks: ScheduleBlock[] };

export type PlaceDef = {
  id: string;
  name: string;
  rect: [number, number, number, number];
  entry: [number, number];
  kind: string;
};

const raw = objectsJson as any;
export const OBJECTS: ObjectDef[] = raw.objects.map((o: any) => {
  const activities = typeof o.activities === 'string' ? raw.templates[o.activities] : o.activities;
  const slots = o.slots ?? [o.tile];
  return { ...o, slots, activities } as ObjectDef;
});

export const NEEDS_CONFIG = needsJson as {
  needs: Need[];
  perHour: Needs;
  initial: Needs;
  jitter: number;
  talk: Partial<Needs>;
  urgency: { soft: number; hard: number; softMax: number; hardBase: number; hardSlope: number };
  stock: { initial: Stock; max: Stock };
  /** A1（#564 第 8 項）：同一活動連做超過 after 次，日程權重每多一次 ×factor */
  repeat: { after: number; factor: number; exempt: string[] };
};
export const NEED_KEYS: Need[] = NEEDS_CONFIG.needs;
export const RESOURCES: Resource[] = ['water', 'meal', 'wood'];

export const SCHEDULES = {
  ...(schedulesJson as any).schedules,
  // A2（#575）：候選池與大師的日程（新的人物 id，不影響原本 6 位）
  ...Object.fromEntries((townsfolkJson as any).pool.map((p: any) => [p.id, p.schedule])),
  [(townsfolkJson as any).master.id]: (townsfolkJson as any).master.schedule,
} as Record<string, Schedule>;
/**
 * W4：元素開啟時替換某些人的日程（schedules.json 的 overlays，鍵是元素 id）。
 * 例如 w04-dojo 開啟時周教頭改成「辰–午 武館」。元素關閉時完全用 W3 的日程。
 */
export const SCHEDULE_OVERLAYS = ((schedulesJson as any).overlays ?? {}) as Record<
  string,
  Record<string, Schedule>
>;
/**
 * 日程情境：哪些元素的日程覆蓋生效、今天第幾日（everyDays 用）。不給＝W3 的日程。
 * W5：blocks＝心念加的時段（cid → 時段，排在原日程前面，所以優先）；closed＝暫時不生效的覆蓋
 * （w05-mind 開著而武館還沒重開時，w04-dojo 的覆蓋不生效）。w05-mind 關閉時兩者都是 undefined，跟 W4 相同。
 */
export type SchedCtx = {
  overlays: string[];
  day?: number;
  blocks?: Record<string, ScheduleBlock[]>;
};

/** 依世界的元素開關算日程情境（只看有 overlays 的元素）。W5：mind＝心念的時段與擋下的覆蓋。 */
export function schedCtx(
  enabled: Record<string, boolean> | undefined,
  day?: number,
  mind?: { blocks?: Record<string, ScheduleBlock[]>; closed?: string[] },
): SchedCtx {
  const ctx: SchedCtx = {
    overlays: Object.keys(SCHEDULE_OVERLAYS).filter(
      (id) => !!enabled?.[id] && !(mind?.closed ?? []).includes(id),
    ),
    day,
  };
  if (mind?.blocks) ctx.blocks = mind.blocks;
  return ctx;
}

/** W5：世界此刻的日程情境（w03-life 的決策、面板、工具共用）。w05-mind 關閉時＝schedCtx(enabled, day)。 */
export function lifeSchedCtx(w: WuxiaState | undefined, day?: number): SchedCtx {
  if (!w || !mindOf(w)) return schedCtx(w?.enabled, day);
  const ctx = schedCtx(w.enabled, day, { blocks: mindBlocks(w), closed: closedOverlays(w) });
  // W7：師父的「指點徒弟」時段（w07-bond 算好放在元素狀態裡；排在心念時段前面）。w07-bond 關閉或沒有徒弟時不動
  const master = w.enabled['w07-bond']
    ? (w.elements['w07-bond'] as { masterBlocks?: Record<string, ScheduleBlock[]> } | undefined)?.masterBlocks
    : undefined;
  if (master && Object.keys(master).length) {
    const blocks: Record<string, ScheduleBlock[]> = { ...(ctx.blocks ?? {}) };
    for (const cid of Object.keys(master)) blocks[cid] = [...master[cid], ...(blocks[cid] ?? [])];
    ctx.blocks = blocks;
  }
  // A2（#575）：看晨練／跟著練／傍晚請教的時段（a2-master 每日算好放在元素狀態裡；排在最前面）。關閉時不動
  const a2 = w.enabled['a2-master']
    ? (w.elements['a2-master'] as { blocks?: Record<string, ScheduleBlock[]> } | undefined)?.blocks
    : undefined;
  if (a2 && Object.keys(a2).length) {
    const blocks: Record<string, ScheduleBlock[]> = { ...(ctx.blocks ?? {}) };
    for (const cid of Object.keys(a2)) blocks[cid] = [...a2[cid], ...(blocks[cid] ?? [])];
    ctx.blocks = blocks;
  }
  return ctx;
}

export function scheduleFor(cid: string, ctx?: SchedCtx): Schedule | undefined {
  let base: Schedule | undefined = SCHEDULES[cid];
  for (const id of ctx?.overlays ?? []) {
    const o = SCHEDULE_OVERLAYS[id]?.[cid];
    if (o && typeof o === 'object' && Array.isArray(o.blocks)) {
      base = o;
      break;
    }
  }
  const extra = ctx?.blocks?.[cid];
  if (!extra || extra.length === 0 || !base) return base;
  return { worker: base.worker, blocks: [...extra, ...base.blocks] };
}

function blockToday(b: ScheduleBlock, day: number | undefined): boolean {
  if (!b.everyDays || day === undefined) return true;
  return (day - 1) % b.everyDays === 0;
}
export const ONCE_PER_BLOCK: string[] = (schedulesJson as any).once;

export const PLACES: PlaceDef[] = (placesJson as any).places;

export const ACTIVITY_BY_ID: Record<string, ActivityDef> = {};
for (const o of OBJECTS) for (const a of o.activities) ACTIVITY_BY_ID[a.id] = a;

export const OBJECT_BY_ID: Record<string, ObjectDef> = Object.fromEntries(
  OBJECTS.map((o) => [o.id, o]),
);

/** 這個世界有哪些物件：W3 的全部，加上開啟中元素的物件（W4 武館）。 */
export function activeObjects(enabled: Record<string, boolean> | undefined): ObjectDef[] {
  return OBJECTS.filter((o) => !o.element || !!enabled?.[o.element]);
}

export const LEISURE = new Set(
  Object.values(ACTIVITY_BY_ID)
    .filter((a) => a.leisure)
    .map((a) => a.id),
);

/** [from, to) 的當日分鐘區間，from > to 表示跨午夜。 */
export function inRange(minuteOfDay: number, range: [number, number]): boolean {
  const [from, to] = range;
  return from <= to ? minuteOfDay >= from && minuteOfDay < to : minuteOfDay >= from || minuteOfDay < to;
}

/** 目前時段（沒有＝留白）。重疊時列在前面的時段優先（W4 的 everyDays 時段放在前面）。 */
export function currentBlock(
  cid: string,
  minuteOfDay: number,
  ctx?: SchedCtx,
): ScheduleBlock | undefined {
  return scheduleFor(cid, ctx)?.blocks.find(
    (b) => blockToday(b, ctx?.day) && inRange(minuteOfDay, [b.from, b.to]),
  );
}

/** 下一個時段（給面板顯示「下一件事」）。 */
export function nextBlock(cid: string, minuteOfDay: number, ctx?: SchedCtx): ScheduleBlock | undefined {
  const blocks = (scheduleFor(cid, ctx)?.blocks ?? []).filter((b) => blockToday(b, ctx?.day));
  let best: ScheduleBlock | undefined;
  let bestDelta = Infinity;
  for (const b of blocks) {
    if (inRange(minuteOfDay, [b.from, b.to])) continue;
    const delta = (b.from - minuteOfDay + 1440) % 1440;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = b;
    }
  }
  return best;
}

/** 每人每天留白的分鐘數（沒有被任何時段蓋到）。 */
export function blankMinutesPerDay(cid: string, ctx?: SchedCtx): number {
  let blank = 0;
  for (let m = 0; m < 1440; m++) if (!currentBlock(cid, m, ctx)) blank++;
  return blank;
}

/**
 * 位置 → 地點 id。先看是不是站在某個物件的座位上（物件自己標了地點），
 * 再看落在哪個地點的範圍（往外擴 1 格，小的地點優先），都不是就是 'outside'。
 */
const PLACES_BY_AREA = [...PLACES].sort(
  (a, b) => a.rect[2] * a.rect[3] - b.rect[2] * b.rect[3],
);
// A2：a2-master 的物件不參與「站在座位上→地點」的判定（元素關閉時地點判定跟 A1 相同；這些座位都在所屬地點範圍內或旁邊）
const PLACE_OBJECTS = OBJECTS.filter((o) => o.element !== 'a2-master');
export function placeAt(x: number, y: number): string {
  for (const o of PLACE_OBJECTS) {
    for (const [sx, sy] of o.slots) {
      if (Math.abs(sx - x) < 0.5 && Math.abs(sy - y) < 0.5) return o.place;
    }
  }
  for (const p of PLACES_BY_AREA) {
    const [px, py, pw, ph] = p.rect;
    if (x >= px - 1 && x < px + pw + 1 && y >= py - 1 && y < py + ph + 1) return p.id;
  }
  return 'outside';
}

export function placeName(id: string): string {
  if (id === 'outside') return '野外';
  // W5：武館門口這類只有物件、沒有地點範圍的地方，用物件名
  return PLACES.find((p) => p.id === id)?.name ?? OBJECTS.find((o) => o.place === id)?.name ?? id;
}
