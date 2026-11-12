// 武俠小鎮 W8 事件「小比」（#560）：武館成立 ≥ 15 日後由教頭舉辦，弟子兩兩切磋（W6 判定），鎮民來圍觀。
// 只有一個弟子時教頭親自跟他過招；還沒有弟子時教頭找武館裡最會武的人過招。
import { COACH_ID } from '../../w04_dojo/data';
import { W07_BOND } from '../../w07_bond/data';
import type { BondState } from '../../w07_bond/data';
import { JIANGHU } from '../data';
import { zhCount } from '../data';
import {
  Ctx,
  EventImpl,
  arrived,
  available,
  awake,
  enlist,
  face,
  hear,
  memo,
  newRumor,
  people,
  pidOf,
  releaseAll,
  setAct,
  startFight,
  stepFight,
  townFighter,
} from '../common';

const DEF = JIANGHU.events.xiaobi;
const P = JIANGHU.places;

function disciplesOfCoach(c: Ctx): string[] {
  const bond = c.w.elements[W07_BOND] as BondState | undefined;
  if (!bond) return [];
  return Object.entries(bond.disciples)
    .filter(([, d]) => d.master === COACH_ID)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([cid]) => cid);
}

function crowdSpot(i: number): [number, number] {
  return [P.dojoCrowd[0] - 3 + (i % 7), P.dojoCrowd[1] + Math.floor(i / 7)];
}

export const xiaobiEvent: EventImpl = {
  start(c, ev) {
    ev.phase = 'wait';
    ev.data = { pairs: [], results: [], spectators: [], fighters: [], wins: {} };
  },
  tick(c, ev) {
    const d = ev.data;
    if (ev.phase === 'wait') {
      if (c.mod < DEF.startMinuteOfDay) return false;
      const coach = people(c).find((r) => r.cid === COACH_ID);
      if (!coach) return true;
      if (!awake(coach) || !available(c, coach)) {
        // 教頭有事就晚一點開（最多等到酉時）
        return c.mod >= 1080;
      }
      const dis = disciplesOfCoach(c);
      let fighters: string[];
      if (dis.length >= 2) {
        fighters = dis;
        for (let i = 0; i < dis.length; i++) for (let j = i + 1; j < dis.length; j++) d.pairs.push([dis[i], dis[j]]);
      } else if (dis.length === 1) {
        fighters = [COACH_ID, dis[0]];
        d.pairs.push([COACH_ID, dis[0]]);
      } else {
        const best = people(c)
          .filter((r) => r.cid !== COACH_ID && awake(r) && available(c, r) && townFighter(c, r.cid).fist >= 50)
          .sort((a, b) => townFighter(c, b.cid).fist - townFighter(c, a.cid).fist || (a.cid < b.cid ? -1 : 1))[0];
        fighters = best ? [COACH_ID, best.cid] : [COACH_ID];
        if (best) d.pairs.push([COACH_ID, best.cid]);
      }
      d.mode = dis.length >= 2 ? 'disciples' : dis.length === 1 ? 'coach-disciple' : 'coach-open';
      let i = 0;
      for (const r of people(c)) {
        if (!awake(r) || !available(c, r)) continue;
        if (fighters.includes(r.cid)) {
          enlist(c, ev, r, 'xiaobi', '小比', '🥋', crowdSpot(i++));
          d.fighters.push(r.cid);
        } else {
          enlist(c, ev, r, 'watch', '看小比', '👀', crowdSpot(i++));
          d.spectators.push(r.cid);
        }
      }
      d.pairs = d.pairs.filter(([a, b]: string[]) => d.fighters.includes(a) && d.fighters.includes(b));
      d.until = c.gm + DEF.gatherMinutes;
      ev.phase = 'gather';
      return false;
    }
    if (ev.phase === 'gather') {
      if (c.gm < d.until) return false;
      ev.phase = 'next';
    }
    if (ev.phase === 'next') {
      const pair = d.pairs.shift();
      if (!pair) {
        d.until = c.gm + 20;
        ev.phase = 'after';
        return false;
      }
      d.cur = pair;
      for (let k = 0; k < 2; k++) {
        const pid = pidOf(c, pair[k])!;
        const player = c.game.world.players.get(pid as any)!;
        setAct(c, { pid, person: c.life.people[pid], player, cid: pair[k] }, 'xiaobi', '小比', '🥋', P.dojoRing[k]);
      }
      d.until = c.gm + 10;
      ev.phase = 'approach';
      return false;
    }
    if (ev.phase === 'approach') {
      const pa = c.game.world.players.get(pidOf(c, d.cur[0]) as any)!;
      const pb = c.game.world.players.get(pidOf(c, d.cur[1]) as any)!;
      if (!(arrived(pa, P.dojoRing[0], 1) && arrived(pb, P.dojoRing[1], 1)) && c.gm < d.until) return false;
      face(pa, pb.position.x, pb.position.y);
      face(pb, pa.position.x, pa.position.y);
      ev.fight = startFight(
        c,
        { pid: pidOf(c, d.cur[0]), cid: d.cur[0], name: d.cur[0] },
        { pid: pidOf(c, d.cur[1]), cid: d.cur[1], name: d.cur[1] },
        townFighter(c, d.cur[0]),
        townFighter(c, d.cur[1]),
      );
      ev.phase = 'fight';
      return false;
    }
    if (ev.phase === 'fight') {
      const res = stepFight(c, ev.fight!);
      if (!res) return false;
      const [a, b] = d.cur;
      const winner = res.winner === 'draw' ? undefined : res.winner === 0 ? a : b;
      const loser = res.winner === 'draw' ? undefined : res.winner === 0 ? b : a;
      d.results.push({ a, b, winner: winner ?? 'draw', rounds: res.rounds });
      if (winner && loser) {
        d.wins[winner] = (d.wins[winner] ?? 0) + 1;
        memo(c, pidOf(c, winner), 'spar_won', { other: loser, place: 'dojo' });
        memo(c, pidOf(c, loser), 'spar_lost', { other: winner, place: 'dojo' });
      } else {
        memo(c, pidOf(c, a), 'spar_draw', { other: b, place: 'dojo' });
        memo(c, pidOf(c, b), 'spar_draw', { other: a, place: 'dojo' });
      }
      for (const sp of d.spectators)
        memo(c, pidOf(c, sp), 'spar_seen', winner ? { other: winner, what: loser, n: 1, place: 'dojo' } : { other: a, what: b, n: 0, place: 'dojo' });
      delete ev.fight;
      ev.phase = 'next';
      return false;
    }
    return c.gm >= d.until;
  },
  end(c, ev) {
    const d = ev.data;
    releaseAll(c, ev);
    const dis = disciplesOfCoach(c);
    const ranked = Object.entries(d.wins as Record<string, number>).sort(
      (x, y) => y[1] - x[1] || townFighter(c, y[0]).fist - townFighter(c, x[0]).fist || (x[0] < y[0] ? -1 : 1),
    );
    const winner = ranked[0]?.[0] ?? (d.results.length ? undefined : COACH_ID);
    if (!d.fighters.length) return { text: '周教頭想辦小比，臨時有事作罷', outcome: { held: false }, rumors: [] };
    const rumor = newRumor(c, 'dojo', { feat: 'xiaobi', coach: COACH_ID, disciples: dis.length, winner: winner ?? COACH_ID }, ev.id);
    for (const cid of [...d.fighters, ...d.spectators].sort()) hear(c, cid, rumor, 'saw');
    return {
      text: `武館小比：${rumor.text}，圍觀${zhCount(d.spectators.length)}人`,
      outcome: { held: true, mode: d.mode, results: d.results, winner, spectators: d.spectators },
      rumors: [rumor.id],
    };
  },
};
