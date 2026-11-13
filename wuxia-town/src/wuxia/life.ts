// 武俠小鎮 W3（#555）：前端讀生活狀態（w03-life）的小工具。只讀，不改規則。
import { readClock } from '../../convex/wuxia/clock';
import {
  ACTIVITY_BY_ID,
  NEED_KEYS,
  OBJECT_BY_ID,
  PLACES,
  currentBlock,
  nextBlock,
  placeAt,
  placeName,
  SchedCtx,
} from '../../convex/wuxia/w03_life/data';
import type { LifeState, Person } from '../../convex/wuxia/w03_life';

export const W03_LIFE = 'w03-life';
type WithWuxia = { wuxia?: { enabled: Record<string, boolean>; elements: Record<string, unknown> } };

export function lifeOf(world: WithWuxia | undefined | null): LifeState | undefined {
  const w = world?.wuxia;
  if (!w || !w.enabled[W03_LIFE]) return undefined;
  return w.elements[W03_LIFE] as LifeState | undefined;
}

export const NEED_LABELS: Record<string, string> = {
  hunger: '餓',
  fatigue: '累',
  boredom: '悶',
  chore: '家事',
};

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// W8：江湖事件接手鎮民時的動作（w08-jianghu events/*.ts 的 enlist／setAct），不在活動表裡
const EVENT_ACTS: Record<string, [string, string]> = {
  flee: ['😨', '躲山賊'],
  confront: ['🛡️', '迎戰山賊'],
  fight: ['🤜', '交手'],
  retreat: ['🤕', '敗退'],
  duel: ['🤛', '應戰外地俠客'],
  xiaobi: ['🥋', '小比'],
};

export function actLabel(act: string): string {
  if (act.startsWith('event:')) act = act.slice(6);
  if (EVENT_ACTS[act]) return EVENT_ACTS[act][1];
  if (act === 'talk') return '聊天';
  if (act === 'abandon') return '放棄';
  // W6：切磋與旁觀不在活動表裡
  if (act === 'spar') return '切磋';
  if (act === 'watch' || act === 'watch_spar') return '看切磋';
  if (act.startsWith('spar_end')) return '切磋收勢';
  return ACTIVITY_BY_ID[act]?.label ?? act;
}

/** 目前在做什麼（一句話）。 */
export function describeCurrent(person: Person): string {
  const cur = person.cur;
  if (!cur) return '想下一件事';
  if (cur.phase === 'talk') return '💬 聊天中';
  if (cur.phase === 'spar') return '🤜 切磋中';
  if (cur.phase === 'watch') return '👀 看切磋';
  if (cur.phase === 'event') return EVENT_ACTS[cur.act] ? EVENT_ACTS[cur.act].join(' ') : actLabel(cur.act);
  const act = ACTIVITY_BY_ID[cur.act];
  const obj = OBJECT_BY_ID[cur.obj];
  if (cur.phase === 'walk') return `走去${obj?.name ?? ''}${act ? `${act.label}` : ''}`;
  return `${act?.emoji ?? ''} ${act?.label ?? cur.act}（${obj?.name ?? ''}）`;
}

/** 下一件事：目前時段之後的下一個日程時段。 */
export function describeNext(person: Person, minuteOfDay: number, ctx?: SchedCtx): string {
  const nb = nextBlock(person.cid, minuteOfDay, ctx);
  const cb = currentBlock(person.cid, minuteOfDay, ctx);
  const now = cb ? `現在：${cb.label}（到 ${hhmm(cb.to)}）；` : '現在：留白；';
  if (!nb) return now;
  return `${now}下一段 ${hhmm(nb.from)} ${nb.label}`;
}

export function todayDone(life: LifeState, person: Person, day: number): string[] {
  return life.log
    .filter((e) => e.who === person.cid && readClock(e.t).day === day && e.act !== 'invite' && e.act !== 'spar_rest_end')
    .map((e) => {
      const c = readClock(e.t);
      return `${hhmm(c.minuteOfDay)} ${actLabel(e.act)}`;
    });
}

export function personByPlayer(life: LifeState, playerId: string): Person | undefined {
  return life.people[playerId];
}

export function placeOfPerson(person: Person | undefined, position: { x: number; y: number }): string {
  if (person?.cur?.phase === 'do') return OBJECT_BY_ID[person.cur.obj]?.place ?? placeAt(position.x, position.y);
  return placeAt(position.x, position.y);
}

/** 鎮況：每個地點現在有誰（依 places.json 順序，沒人的地點不列）。 */
export function townStatus(
  life: LifeState,
  players: Array<{ id: string; position: { x: number; y: number } }>,
  nameOf: (id: string) => string,
): Array<{ place: string; name: string; who: string[] }> {
  const byPlace = new Map<string, string[]>();
  for (const p of players) {
    const person = life.people[p.id];
    const place = placeOfPerson(person, p.position);
    const act = person?.cur
      ? person.cur.phase === 'walk'
        ? '走路'
        : actLabel(person.cur.act)
      : '';
    const list = byPlace.get(place) ?? [];
    list.push(act ? `${nameOf(p.id)}（${act}）` : nameOf(p.id));
    byPlace.set(place, list);
  }
  const order = [...PLACES.map((p) => p.id), 'outside'];
  return order
    .filter((id) => byPlace.has(id))
    .map((id) => ({ place: id, name: placeName(id), who: byPlace.get(id)! }));
}

export { NEED_KEYS };
