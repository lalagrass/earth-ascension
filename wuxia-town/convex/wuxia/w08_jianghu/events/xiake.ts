// 武俠小鎮 W8 事件「外地俠客路過」（#560）：一位外地俠客（暫時人物，最多 1 位）從城門進鎮、住茶館 2–4 日，
// 每天去武館找人切磋（W6 判定），最後一天離開。每場切磋產生一則傳聞，旁觀的人親眼看到。
import { JIANGHU, cidName, rollInt, rollSkills, ActiveEvent } from '../data';
import { zhCount } from '../data';
import {
  Ctx,
  EventImpl,
  addFigure,
  arrived,
  available,
  awake,
  enlist,
  face,
  figure,
  figureAt,
  hear,
  memo,
  newRumor,
  people,
  placeOf,
  release,
  releaseAll,
  setAct,
  startFight,
  stepFight,
  townFighter,
} from '../common';

const DEF = JIANGHU.events.xiake;
const P = JIANGHU.places;

/** 俠客辰初（arriveMinuteOfDay）才從城門進鎮。 */
function arrive(c: Ctx, ev: ActiveEvent) {
    // 沒來過的人優先（名字都用過了才重複）
    const used = new Set(c.st.history.filter((h) => h.kind === 'xiake').map((h) => h.outcome.name));
    const pool = DEF.names.filter((n: string) => !used.has(n));
    const list = pool.length ? pool : DEF.names;
    const name = list[Math.floor(c.game.rng() * list.length)];
    const stay = rollInt(() => c.game.rng(), DEF.stayDays);
    const f = addFigure(c, ev, {
      kind: 'xiake',
      name,
      x: P.gate[0],
      y: P.gate[1],
      to: [...P.teahouse],
      emoji: '⚔️',
      activity: '進鎮',
      skills: rollSkills(() => c.game.rng(), DEF.skills),
    });
    ev.phase = 'stay';
    ev.data = { name, fid: f.id, stay, leaveDay: c.day + stay - 1, lastTry: 0, bouts: [], rumors: [] };
    // 新人到鎮上（W5 記憶 newcomer；林嫂的心念「想打聽」讀這個）
    for (const r of people(c)) memo(c, r.pid, 'newcomer', { other: name });
}

export const xiakeEvent: EventImpl = {
  start(c, ev) {
    // WUXIA W8：導演卯時抽中，俠客辰初才進鎮（events.json xiake.arriveMinuteOfDay；之前漏接）
    if (c.mod < DEF.arriveMinuteOfDay) {
      ev.phase = 'wait';
      ev.data = {};
      return;
    }
    arrive(c, ev);
  },
  tick(c, ev) {
    if (ev.phase === 'wait') {
      if (c.mod >= DEF.arriveMinuteOfDay) arrive(c, ev);
      return false;
    }
    const d = ev.data;
    const f = figure(c, d.fid)!;
    if (ev.phase === 'stay') {
      if (!f.to) f.activity = '在茶館歇腳';
      if (c.day >= d.leaveDay && c.mod >= DEF.leaveMinuteOfDay) {
        f.to = [...P.gate];
        f.leaving = true;
        f.activity = '離鎮';
        ev.phase = 'leave';
        return false;
      }
      if (c.mod >= DEF.challengeMinuteOfDay && d.lastTry !== c.day && c.mod < DEF.leaveMinuteOfDay) {
        d.lastTry = c.day;
        f.to = [...P.dojoRing[0]];
        f.activity = '去武館討教';
        ev.phase = 'toDojo';
      }
      return false;
    }
    if (ev.phase === 'toDojo') {
      if (!figureAt(f, P.dojoRing[0])) return false;
      const cand = people(c)
        .filter((r) => placeOf(r) === 'dojo' && awake(r) && available(c, r))
        .filter((r) => townFighter(c, r.cid).fist >= DEF.challengeMinFist)
        .sort((a, b) => townFighter(c, b.cid).fist - townFighter(c, a.cid).fist || (a.cid < b.cid ? -1 : 1));
      if (cand.length === 0) {
        d.bouts.push({ day: c.day, opp: undefined, result: 'none' });
        f.to = [...P.teahouse];
        f.activity = '武館沒人應戰';
        ev.phase = 'stay';
        return false;
      }
      const opp = cand[0];
      enlist(c, ev, opp, 'duel', '應戰外地俠客', '🤛', P.dojoRing[1]);
      d.opp = opp.pid;
      d.until = c.gm + 20;
      ev.phase = 'approach';
      return false;
    }
    if (ev.phase === 'approach') {
      const player = c.game.world.players.get(d.opp as any)!;
      if (!arrived(player, P.dojoRing[1], 1) && c.gm < d.until) return false;
      const cid = c.life.people[d.opp].cid;
      ev.fight = startFight(c, { fid: f.id, name: f.name }, { pid: d.opp, cid, name: cid }, f.skills!, townFighter(c, cid));
      face(player, f.x, f.y);
      f.activity = '切磋';
      d.watchers = [];
      for (const r of people(c)) {
        if (r.pid === d.opp || placeOf(r) !== 'dojo' || !awake(r) || !available(c, r)) continue;
        enlist(c, ev, r, 'watch', '看俠客切磋', '👀');
        face(r.player, P.dojoRing[0][0] + 1, P.dojoRing[0][1]);
        d.watchers.push(r.pid);
      }
      ev.phase = 'duel';
      return false;
    }
    if (ev.phase === 'duel') {
      const res = stepFight(c, ev.fight!);
      if (!res) return false;
      const cid = ev.fight!.b.cid!;
      const result = res.winner === 'draw' ? 'draw' : res.winner === 1 ? 'town' : 'xiake';
      d.bouts.push({ day: c.day, opp: cid, result, rounds: res.rounds });
      memo(c, d.opp, 'fought_outsider', { what: d.name, n: result === 'draw' ? 0 : result === 'town' ? 1 : -1 });
      const rumor = newRumor(c, 'xiake', { name: d.name, opp: cid, result, rounds: res.rounds }, ev.id);
      d.rumors.push(rumor.id);
      hear(c, cid, rumor, 'saw');
      for (const pid of d.watchers) hear(c, c.life.people[pid].cid, rumor, 'saw');
      release(c, ev, d.opp);
      for (const pid of d.watchers) release(c, ev, pid);
      delete ev.fight;
      f.to = [...P.teahouse];
      f.activity = result === 'xiake' ? '得勝回茶館' : '敗興回茶館';
      ev.phase = 'stay';
      return false;
    }
    // leave：走出城門就消失
    return !figure(c, d.fid);
  },
  end(c, ev) {
    const d = ev.data;
    releaseAll(c, ev);
    c.st.figures = c.st.figures.filter((x) => x.id !== d.fid);
    const real = d.bouts.filter((b: any) => b.opp);
    const rumors = [...d.rumors];
    if (real.length === 0) {
      const rumor = newRumor(c, 'xiake', { name: d.name, result: 'none', days: d.stay }, ev.id);
      rumors.push(rumor.id);
      // 茶館老闆娘一定知道住店的客人
      hear(c, 'lin-sao', rumor, 'saw');
    }
    // 同一個對手、同一個結果併成一句：「三回敗給周教頭」
    const groups: Array<{ opp: string; result: string; n: number }> = [];
    for (const b of real) {
      const g = groups.find((x) => x.opp === b.opp && x.result === b.result);
      if (g) g.n++;
      else groups.push({ opp: b.opp, result: b.result, n: 1 });
    }
    const verb = (g: { opp: string; result: string; n: number }) =>
      `${zhCount(g.n)}回${g.result === 'town' ? `敗給${cidName(g.opp)}` : g.result === 'xiake' ? `勝了${cidName(g.opp)}` : `與${cidName(g.opp)}打平`}`;
    const text =
      real.length === 0
        ? `外地俠客${d.name}在茶館住了${zhCount(d.stay)}日，沒找到人切磋就走了`
        : `外地俠客${d.name}路過山腳鎮，住了${zhCount(d.stay)}日，到武館討教${groups.map(verb).join('、')}`;
    void setAct;
    return { text, outcome: { name: d.name, stay: d.stay, bouts: d.bouts }, rumors };
  },
};
