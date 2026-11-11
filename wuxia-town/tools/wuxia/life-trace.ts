// 武俠小鎮 W3（#555）：無頭模擬的生活時間表與全程檢查（只讀世界狀態，不改規則）。
// 每個 step 取樣一次：每人所在地點（placeAt）＋在做什麼；同時檢查預約 ≤ capacity、選不到事做的連續時間、
// hunger > 90 的連續時間。w03-life 關掉時也照樣取樣（看得出沒有作息規律）。
import type { Game } from '../../convex/aiTown/game';
import { gameMinutes } from '../../convex/wuxia/clock';
import { OBJECTS, PLACES, placeAt } from '../../convex/wuxia/w03_life/data';
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
/** 茶館、河邊（地點範圍外 2 格內）或飯桌（各家的灶 2 格內）。茶館內部不可走，人都站在門口外。 */
const SOCIAL_MARGIN = 2;
const SOCIAL_RECTS = PLACES.filter((p) => p.id === 'teahouse' || p.id === 'river');
const TABLES = OBJECTS.filter((o) => o.activities.some((a) => a.id === 'eat'));
export function socialPlaceAt(x: number, y: number): string | null {
  for (const p of SOCIAL_RECTS) {
    const [px, py, pw, ph] = p.rect;
    if (x >= px - SOCIAL_MARGIN && x <= px + pw + SOCIAL_MARGIN && y >= py - SOCIAL_MARGIN && y <= py + ph + SOCIAL_MARGIN)
      return p.id;
  }
  for (const o of TABLES)
    for (const [sx, sy] of o.slots)
      if (Math.hypot(sx - x, sy - y) <= SOCIAL_MARGIN) return `table:${o.place}`;
  return null;
}
export { OBJECTS };
export const isSocialPlace = (p: string) => p === 'teahouse' || p === 'river' || p.startsWith('table:');

/**
 * 兩種算法都給：
 * - 開始地點（place）：w03-life 邀請當下兩人所在（同一地點才會邀）；
 * - 說話地點（talkPlace）：兩人 participating 期間每遊戲分鐘的位置，取最多的那個；在茶館／河邊／飯桌 2 格內算那裡。
 * 驗收（social）用說話地點；沒有 participating（被婉拒、還沒走到）的對話用開始地點。
 */
export function conversationPlaceStats(conversations: LifeTracer['conversations']) {
  const byPlace: Record<string, number> = {};
  const byTalkPlace: Record<string, number> = {};
  let social = 0;
  for (const c of Object.values(conversations)) {
    byPlace[c.place] = (byPlace[c.place] ?? 0) + 1;
    const tp = talkPlaceOf(c);
    byTalkPlace[tp] = (byTalkPlace[tp] ?? 0) + 1;
    if (isSocialPlace(tp) || (tp === c.place && c.acts.some((a) => a === 'eat'))) social++;
  }
  const total = Object.keys(conversations).length;
  return { total, byPlace, byTalkPlace, social, ratio: total ? social / total : null };
}
export function talkPlaceOf(c: { place: string; talk: Record<string, number> }): string {
  const e = Object.entries(c.talk).sort((a, b) => b[1] - a[1]);
  return e.length ? e[0][0] : c.place;
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
  conversations: Record<
    string,
    { t: number; place: string; acts: string[]; talk: Record<string, number> }
  > = {};
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
        // 地點：w03-life 的邀請紀錄（邀請當下兩人所在）；沒有就用發起人目前位置
        const creatorName = creator ? game.playerDescriptions.get(creator.id)?.name : undefined;
        const creatorCid = creatorName ? profileByName(creatorName)?.id : undefined;
        const invite = life?.log
          .slice()
          .reverse()
          .find((e) => e.act === 'invite' && e.who === creatorCid && e.t >= gm - 1);
        this.conversations[conv.id] = {
          t: gm,
          place:
            invite?.place ??
            (creator ? placeAt(creator.position.x, creator.position.y) : 'outside'),
          acts,
          talk: {},
        };
      }
      const rec = this.conversations[conv.id];
      for (const [id, m] of conv.participants) {
        if (m.status.kind !== 'participating') continue;
        const pl = game.world.players.get(id);
        if (!pl) continue;
        const tp = socialPlaceAt(pl.position.x, pl.position.y) ?? placeAt(pl.position.x, pl.position.y);
        rec.talk[tp] = (rec.talk[tp] ?? 0) + 1;
      }
      const m = gameMinutes(now, conv.created, w.timeScale);
      this.checks.maxConversationMinutes = Math.max(this.checks.maxConversationMinutes, m);
    }
    if (lifeOn) {
      for (const o of OBJECTS) {
        const seats = life!.res[o.id];
        // W4：元素沒開的物件（武館）不在這個世界
        if (!seats) continue;
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
