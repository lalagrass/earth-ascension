// 武俠小鎮 W3（#555）：無頭模擬的生活時間表與全程檢查（只讀世界狀態，不改規則）。
// 每個 step 取樣一次：每人所在地點（placeAt）＋在做什麼；同時檢查預約 ≤ capacity、選不到事做的連續時間、
// hunger > 90 的連續時間。w03-life 關掉時也照樣取樣（看得出沒有作息規律）。
import type { Game } from '../../convex/aiTown/game';
import { gameMinutes } from '../../convex/wuxia/clock';
import { OBJECTS, placeAt } from '../../convex/wuxia/w03_life/data';
import { LifeState, W03_LIFE } from '../../convex/wuxia/w03_life';
import { profileByName } from '../../convex/wuxia/w02_folk';

/** [開始遊戲分鐘, 結束遊戲分鐘（不含）, 地點 id, 活動] */
export type Segment = [number, number, string, string];

export type LifeChecks = {
  minutes: number;
  /** 任一時刻預約人數 > capacity 的次數 */
  reservationOverCapacity: number;
  /** 任一時刻「正在做」某物件活動的人數 > capacity 的次數 */
  usingOverCapacity: number;
  /** 同一座位被兩個人同時預約的次數 */
  doubleBooked: number;
  maxOccupancy: Record<string, number>;
  /** 每人最長連續「選不到事做」（遊戲分鐘） */
  maxNoChoiceMinutes: Record<string, number>;
  /** 每人最長連續 hunger > 90（遊戲分鐘） */
  maxHungerOver90Minutes: Record<string, number>;
  /** 對話最長（遊戲分鐘） */
  maxConversationMinutes: number;
};

/** 對話地點統計：茶館、飯桌（灶）、河邊的比例（#555 驗收） */
export function conversationPlaceStats(conversations: LifeTracer['conversations']) {
  const byPlace: Record<string, number> = {};
  for (const c of Object.values(conversations)) byPlace[c.place] = (byPlace[c.place] ?? 0) + 1;
  const total = Object.keys(conversations).length;
  const social = Object.values(conversations).filter(
    (c) => c.place === 'teahouse' || c.place === 'river' || c.acts.some((a) => a === 'eat'),
  ).length;
  return { total, byPlace, social, ratio: total ? social / total : null };
}

export class LifeTracer {
  timeline: Record<string, Segment[]> = {};
  checks: LifeChecks = {
    minutes: 0,
    reservationOverCapacity: 0,
    usingOverCapacity: 0,
    doubleBooked: 0,
    maxOccupancy: {},
    maxNoChoiceMinutes: {},
    maxHungerOver90Minutes: {},
    maxConversationMinutes: 0,
  };
  /** 每段對話開始時，發起人所在的地點（W3 驗收：對話發生在哪裡） */
  conversations: Record<string, { t: number; place: string; acts: string[] }> = {};
  private hungerSince: Record<string, number | undefined> = {};
  private lastMinute = -1;

  sample(game: Game, now: number) {
    const w = game.world.wuxia;
    if (!w || w.clockEpoch === undefined) return;
    const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
    if (gm === this.lastMinute) return;
    this.lastMinute = gm;
    this.checks.minutes++;
    const life = w.elements[W03_LIFE] as LifeState | undefined;
    const lifeOn = !!w.enabled[W03_LIFE] && !!life;
    for (const agent of game.world.agents.values()) {
      const player = game.world.players.get(agent.playerId);
      if (!player) continue;
      const name = game.playerDescriptions.get(player.id)?.name ?? player.id;
      const who = profileByName(name)?.id ?? name;
      const conv = game.world.playerConversation(player);
      let act: string;
      const person = life?.people[player.id];
      if (lifeOn && person) {
        const cur = person.cur;
        act = !cur ? 'idle' : cur.phase === 'do' ? cur.act : cur.phase === 'walk' ? 'walk' : 'talk';
        if (person.idleSince !== undefined) {
          const span = gm - person.idleSince;
          this.checks.maxNoChoiceMinutes[who] = Math.max(this.checks.maxNoChoiceMinutes[who] ?? 0, span);
        } else this.checks.maxNoChoiceMinutes[who] ??= 0;
        if (person.needs.hunger > 90) {
          this.hungerSince[who] ??= gm;
          const span = gm - this.hungerSince[who]!;
          this.checks.maxHungerOver90Minutes[who] = Math.max(this.checks.maxHungerOver90Minutes[who] ?? 0, span);
        } else {
          this.hungerSince[who] = undefined;
          this.checks.maxHungerOver90Minutes[who] ??= 0;
        }
      } else {
        act = conv
          ? 'talk'
          : player.activity && player.activity.until > now
            ? player.activity.description
            : player.pathfinding
              ? 'walk'
              : 'idle';
      }
      const place = placeAt(player.position.x, player.position.y);
      const segs = (this.timeline[who] ??= []);
      const last = segs[segs.length - 1];
      if (last && last[2] === place && last[3] === act && last[1] === gm) last[1] = gm + 1;
      else segs.push([gm, gm + 1, place, act]);
    }
    for (const conv of game.world.conversations.values()) {
      if (!this.conversations[conv.id]) {
        const creator = game.world.players.get(conv.creator);
        const acts = [...conv.participants.keys()].map((id) => {
          const p = life?.people[id];
          return p?.cur?.act ?? 'idle';
        });
        this.conversations[conv.id] = {
          t: gm,
          place: creator ? placeAt(creator.position.x, creator.position.y) : 'outside',
          acts,
        };
      }
      const m = gameMinutes(now, conv.created, w.timeScale);
      this.checks.maxConversationMinutes = Math.max(this.checks.maxConversationMinutes, m);
    }
    if (lifeOn) {
      for (const o of OBJECTS) {
        const seats = life!.res[o.id];
        const reserved = seats.filter((s) => s !== null);
        if (reserved.length > o.capacity || seats.length > o.capacity) this.checks.reservationOverCapacity++;
        if (new Set(reserved).size !== reserved.length) this.checks.doubleBooked++;
        const using = Object.values(life!.people).filter(
          (p) => p.cur?.phase === 'do' && p.cur.obj === o.id,
        ).length;
        if (using > o.capacity) this.checks.usingOverCapacity++;
        this.checks.maxOccupancy[o.id] = Math.max(this.checks.maxOccupancy[o.id] ?? 0, using);
      }
      // 同一個人只會佔一個座位
      const holders = new Map<string, number>();
      for (const seats of Object.values(life!.res))
        for (const s of seats) if (s) holders.set(s, (holders.get(s) ?? 0) + 1);
      for (const n of holders.values()) if (n > 1) this.checks.doubleBooked++;
    }
  }
}
