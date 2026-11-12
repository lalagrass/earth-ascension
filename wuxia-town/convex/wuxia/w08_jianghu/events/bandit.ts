// 武俠小鎮 W8 事件「山賊擾鎮」（#560）：2–3 名山賊從北邊山路下來搶藥鋪；鎮民逃回家，會武的人上前（W6 判定，
// 山賊拳腳 150–250）；山賊「勢」歸 0 就逃走。沒人上前（或上前的人都打輸）則藥鋪被搶，何郎中記「被搶」。
import placesJson from '../../../../data/wuxia/places.json';
import { W04_DOJO, DojoState } from '../../w04_dojo';
import { COACH_ID } from '../../w04_dojo/data';
import { JIANGHU, rollInt, rollSkills, ActiveEvent } from '../data';
import {
  Ctx,
  EventImpl,
  addFigure,
  available,
  awake,
  enlist,
  face,
  figure,
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
  arrived,
} from '../common';

const DEF = JIANGHU.events.bandit;
const P = JIANGHU.places;
const ENTRY: Record<string, [number, number]> = Object.fromEntries(
  (placesJson as any).places.map((p: any) => [p.id, p.entry]),
);
/** 上前的人站的位置（藥鋪門口，山賊站在門前） */
const FRONT: [number, number] = [P.pharmacy[0] - 2, P.pharmacy[1]];

export function steppers(c: Ctx): string[] {
  const dojo = c.w.elements[W04_DOJO] as DojoState | undefined;
  return people(c)
    .filter((r) => awake(r) && available(c, r))
    .filter((r) => townFighter(c, r.cid).fist >= DEF.stepUpFist)
    .filter((r) => r.cid !== COACH_ID || !DEF.coachNeedsDojo || dojo?.openedAt !== undefined)
    .sort((a, b) => townFighter(c, b.cid).fist - townFighter(c, a.cid).fist || (a.cid < b.cid ? -1 : 1))
    .map((r) => r.pid);
}

export const banditEvent: EventImpl = {
  start(c, ev) {
    const count = rollInt(() => c.game.rng(), DEF.count);
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const f = addFigure(c, ev, {
        kind: 'bandit',
        name: DEF.names[i] ?? `山賊${i + 1}`,
        x: P.mountain[0] - 1 + i,
        y: P.mountain[1],
        to: [P.pharmacy[0] + (i - 1), P.pharmacy[1]],
        emoji: '🗡️',
        activity: '下山',
        skills: rollSkills(() => c.game.rng(), DEF.skills),
      });
      ids.push(f.id);
    }
    ev.phase = 'approach';
    ev.data = { count, bandits: ids, left: [...ids], fled: [], queue: [], heroes: [], beaten: [], witnesses: [], fights: [], loot: 0, until: c.gm + 60 };
  },
  tick(c, ev) {
    const d = ev.data;
    if (ev.phase === 'approach') {
      const all = d.bandits.every((id: string) => !figure(c, id)?.to);
      if (!all && c.gm < d.until) return false;
      for (const id of d.bandits) {
        const f = figure(c, id);
        if (f) f.activity = '搶藥鋪';
      }
      // 鎮民：會武的上前，其他人逃回家（藥鋪自己人原地躲著）
      const up = new Set(steppers(c));
      for (const r of people(c)) {
        if (!awake(r) || !available(c, r)) continue;
        d.witnesses.push(r.cid);
        if (up.has(r.pid)) {
          enlist(c, ev, r, 'confront', '迎戰山賊', '🛡️', FRONT);
          d.queue.push(r.pid);
        } else {
          const home = r.person.home === 'pharmacy' ? undefined : ENTRY[r.person.home];
          enlist(c, ev, r, 'flee', home ? '逃回家' : '躲起來', '😨', home);
        }
      }
      ev.phase = d.queue.length ? 'gather' : 'rob';
      d.until = c.gm + 30;
      return false;
    }
    if (ev.phase === 'gather') {
      const ready = d.queue.every((pid: string) => arrived(c.game.world.players.get(pid as any)!, FRONT, 3));
      if (ready || c.gm >= d.until) ev.phase = 'fight';
      return false;
    }
    if (ev.phase === 'fight') {
      if (!ev.fight) {
        const pid = d.queue.shift();
        const fid = d.left[0];
        if (!pid || !fid) {
          ev.phase = d.left.length ? 'rob' : 'after';
          d.until = c.gm + 30;
          return false;
        }
        const f = figure(c, fid)!;
        const cid = c.life.people[pid].cid;
        ev.fight = startFight(c, { fid, name: f.name }, { pid, cid, name: cid }, f.skills!, townFighter(c, cid));
        const player = c.game.world.players.get(pid as any)!;
        face(player, f.x, f.y);
        setAct(c, { pid, person: c.life.people[pid], player, cid }, 'fight', '跟山賊交手', '🤜');
        f.activity = '交手';
        return false;
      }
      const res = stepFight(c, ev.fight);
      if (!res) return false;
      const fid = ev.fight.a.fid!;
      const pid = ev.fight.b.pid!;
      const cid = ev.fight.b.cid!;
      const f = figure(c, fid)!;
      const won = res.winner === 1;
      d.fights.push({ bandit: f.name, cid, winner: res.winner === 'draw' ? 'draw' : won ? cid : f.name, rounds: res.rounds });
      memo(c, pid, 'fought_outsider', { what: f.name, n: res.winner === 'draw' ? 0 : won ? 1 : -1 });
      const player = c.game.world.players.get(pid as any)!;
      const ref = { pid, person: c.life.people[pid], player, cid };
      if (won) {
        if (!d.heroes.includes(cid)) d.heroes.push(cid);
        d.left = d.left.filter((x: string) => x !== fid);
        d.fled.push(fid);
        f.to = [...P.mountain];
        f.leaving = true;
        f.activity = '逃回山上';
        f.emoji = '🏃';
        // 打贏的人可以再上（排回隊尾）
        d.queue.push(pid);
        setAct(c, ref, 'confront', '迎戰山賊', '🛡️');
      } else {
        d.beaten.push(cid);
        const home = c.life.people[pid].home;
        setAct(c, ref, 'retreat', res.winner === 'draw' ? '力竭退下' : '敗退', '🤕', ENTRY[home]);
        f.activity = '搶藥鋪';
      }
      delete ev.fight;
      return false;
    }
    if (ev.phase === 'rob') {
      if (d.left.length && d.loot === 0) {
        d.loot = rollInt(() => c.game.rng(), DEF.loot);
        c.st.pharmacyLoss += d.loot;
        memo(c, pidOf(c, 'he-langzhong'), 'robbed', { what: '藥材', n: d.loot });
        for (const id of d.left) {
          const f = figure(c, id);
          if (!f) continue;
          f.to = [...P.mountain];
          f.leaving = true;
          f.activity = '扛著藥材上山';
          f.emoji = '💰';
        }
      }
      ev.phase = 'after';
      d.until = c.gm + 30;
      return false;
    }
    // after：山賊走光、或 30 分鐘後收場
    const gone = d.bandits.every((id: string) => !figure(c, id));
    return gone || c.gm >= d.until + 60;
  },
  end(c, ev) {
    const d = ev.data;
    const outcome = d.left.length === 0 ? 'fled' : 'robbed';
    const truth = { count: d.count, outcome, heroes: outcome === 'fled' ? [...d.heroes] : undefined, loot: outcome === 'robbed' ? d.loot : undefined } as any;
    if (truth.heroes === undefined) delete truth.heroes;
    if (truth.loot === undefined) delete truth.loot;
    const rumor = newRumor(c, 'bandit', truth, ev.id);
    for (const cid of [...new Set<string>(d.witnesses)].sort()) hear(c, cid, rumor, 'saw');
    // 何郎中就算沒看到（睡著或在對話），藥鋪被搶他一定知道
    hear(c, 'he-langzhong', rumor, 'saw');
    releaseAll(c, ev);
    for (const id of d.bandits) c.st.figures = c.st.figures.filter((f) => f.id !== id);
    return {
      text: rumor.text.replace(/^/, '山賊擾鎮：'),
      outcome: { count: d.count, outcome, heroes: d.heroes, beaten: d.beaten, loot: d.loot, fights: d.fights, defenders: [...new Set([...d.heroes, ...d.beaten])] },
      rumors: [rumor.id],
    };
  },
};

export type BanditData = ActiveEvent['data'];
