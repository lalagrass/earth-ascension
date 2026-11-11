// 武俠小鎮 W3（#555）：生活資料（物件、需求、日程、地點）的型別與載入。純資料，引擎與前端共用。
import objectsJson from '../../../data/wuxia/objects.json';
import needsJson from '../../../data/wuxia/needs.json';
import schedulesJson from '../../../data/wuxia/schedules.json';
import placesJson from '../../../data/wuxia/places.json';

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
  activities: ActivityDef[];
};

export type ScheduleBlock = { from: number; to: number; label: string; do: string[] };
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
};
export const NEED_KEYS: Need[] = NEEDS_CONFIG.needs;
export const RESOURCES: Resource[] = ['water', 'meal', 'wood'];

export const SCHEDULES = (schedulesJson as any).schedules as Record<string, Schedule>;
export const ONCE_PER_BLOCK: string[] = (schedulesJson as any).once;

export const PLACES: PlaceDef[] = (placesJson as any).places;

export const ACTIVITY_BY_ID: Record<string, ActivityDef> = {};
for (const o of OBJECTS) for (const a of o.activities) ACTIVITY_BY_ID[a.id] = a;

export const OBJECT_BY_ID: Record<string, ObjectDef> = Object.fromEntries(
  OBJECTS.map((o) => [o.id, o]),
);

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

/** 目前時段（沒有＝留白）。 */
export function currentBlock(cid: string, minuteOfDay: number): ScheduleBlock | undefined {
  return SCHEDULES[cid]?.blocks.find((b) => inRange(minuteOfDay, [b.from, b.to]));
}

/** 下一個時段（給面板顯示「下一件事」）。 */
export function nextBlock(cid: string, minuteOfDay: number): ScheduleBlock | undefined {
  const blocks = SCHEDULES[cid]?.blocks ?? [];
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
export function blankMinutesPerDay(cid: string): number {
  let blank = 0;
  for (let m = 0; m < 1440; m++) if (!currentBlock(cid, m)) blank++;
  return blank;
}

/**
 * 位置 → 地點 id。先看是不是站在某個物件的座位上（物件自己標了地點），
 * 再看落在哪個地點的範圍（往外擴 1 格，小的地點優先），都不是就是 'outside'。
 */
const PLACES_BY_AREA = [...PLACES].sort(
  (a, b) => a.rect[2] * a.rect[3] - b.rect[2] * b.rect[3],
);
export function placeAt(x: number, y: number): string {
  for (const o of OBJECTS) {
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
  return PLACES.find((p) => p.id === id)?.name ?? id;
}
