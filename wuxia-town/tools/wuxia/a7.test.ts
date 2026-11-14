// 武俠小鎮 A7（#584）的 A 類測試（最多 5 條）：
//   (a) 錢守恆逐日誤差 0  (b) 沒付沒做工的人不會被「教」  (c) 做滿雜務當天才算學生  (d) 接濟付束脩後該人成為學生且緣 −2
//   (e) --off a7-tuition 的 seed 7 3 日 hash ＝ A6
import { runHeadless } from './headless';
import { quietConsole } from './sim';
import { Session } from '../../src/wuxia/engine/session';
import { A6_HASH_SEED7_3D } from './check-quick';
import { A2State, MASTER_CID } from '../../convex/wuxia/a2_master/data';
import { A4_PLAY, A4State, PLAY, intervene } from '../../convex/wuxia/a4_play';
import { A7, A7State, MEAL_PRICE, TUITION_PRICE, a7CanTeach, choreDone, initA7State, studentKind, totalPurse } from '../../convex/wuxia/a7_tuition';
import { dojoUse, endowment, mealHours, ordinaryNetPerDay } from '../../convex/wuxia/a7_tuition/econ';
import type { WuxiaState } from '../../convex/wuxia/state';

quietConsole(false);

const a7Of = (g: any) => g.world.wuxia.elements['a7-tuition'] as A7State;

function worldWith(st: A7State): WuxiaState {
  return { v: 1, seed: 7, timeScale: 60, enabled: { 'a7-tuition': true, 'a6-spread': true, 'w03-life': true, 'a2-master': true, 'a4-play': true }, rng: { algo: 'mulberry32', s: 1 }, elements: { 'a7-tuition': st } } as any;
}

// (a)(c) 共用同一次 20 日跑（jest 下比 tsx 慢）
let shared: ReturnType<typeof runHeadless> | undefined;
const run20 = () => (shared ??= runHeadless({ seed: 7, minutes: 1, untilGameMinute: 20 * 1440, arriveDay: 1, scenario: 'master-open' } as any));

describe('A7 束脩與以工代學（#584）', () => {
  test('(a) 錢守恆：逐日全鎮錢總和 ＝ 開局＋收入＋接濟−飯錢，誤差 0；錢袋不為負、都是整數；推導出的常數合理', () => {
    const st = a7Of(run20().game);
    expect(st.ledger.length).toBeGreaterThanOrEqual(18);
    for (const l of st.ledger) expect(l.err).toBe(0);
    expect(totalPurse(st)).toBe(st.endow + st.income + st.aid - st.spent);
    for (const v of Object.values(st.purse)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
    expect(st.moved).toBeGreaterThan(0); // 束脩轉手發生過，且不改變總和
    // 推導：飯錢＝工價×做一頓飯的工時、初始錢袋＝7 日的（收入−飯錢）、束脩＝30 日積蓄的一半
    expect(mealHours()).toBeCloseTo(0.3125, 6);
    expect(MEAL_PRICE).toBe(Math.round(A7.wage * 0.3125));
    expect(TUITION_PRICE).toBe(Math.round(0.5 * 30 * ordinaryNetPerDay()));
    expect(endowment('lin-sao')).toBeGreaterThan(0);
    expect(dojoUse().water).toBeCloseTo((A7.mealsPerDay * 1) / 4, 6);
  });

  test('(b) 沒付沒做工的人不會被「教」：引擎跑 30 日，兩位師父每一筆正式教的學生，那天都付過束脩或做滿雜務；也有人只能看', () => {
    const s = Session.fresh({ seed: 7, play: 's1' });
    const a2 = () => s.game.world.wuxia!.elements['a2-master'] as A2State;
    let seen = 0;
    let taught = 0;
    while (s.gameMinute() < 30 * 1440) {
      s.step([]);
      const st = a7Of(s.game);
      const recs = a2().records;
      for (; seen < recs.length; seen++) {
        const r = recs[seen];
        if (r.via !== 'teach' || (r.from !== MASTER_CID && r.from !== 'zhou-jiaotou') || st.purse[r.to] === undefined) continue;
        taught++;
        const paid = (st.paidUntil[r.to]?.[r.from] ?? -1) >= r.day;
        const worked = st.chore[r.to]?.[0] === r.day && choreDone(st, r.to, r.day);
        expect(paid || worked).toBe(true);
      }
    }
    expect(taught).toBeGreaterThan(0);
    // 純函式：沒付沒做工 → 不能教；付了或做滿 → 能教；其他人（不收束脩）再傳不管
    const w = worldWith(initA7State());
    const st = w.elements["a7-tuition"] as A7State;
    st.day = 5;
    st.purse = { x: 10 };
    expect(a7CanTeach(w, MASTER_CID, 'x')).toBe(false);
    st.paidUntil.x = { [MASTER_CID]: 5 };
    expect(a7CanTeach(w, MASTER_CID, 'x')).toBe(true);
    expect(a7CanTeach(w, 'zhou-jiaotou', 'x')).toBe(false); // 只付了大師
    expect(a7CanTeach(w, 'someone-else', 'x')).toBe(true);
  });

  test('(c) 做滿雜務當天才算學生：差 1 分鐘不算、做滿算、隔天重算；水缸柴堆見底那天付了束脩的人也要先做滿', () => {
    const st = initA7State();
    const w = worldWith(st);
    st.day = 9;
    st.purse = { x: 0, y: 0 };
    st.chore.x = [9, A7.chore.minutes - 1];
    expect(studentKind(st, 'x', 9)).toBeUndefined();
    expect(a7CanTeach(w, MASTER_CID, 'x')).toBe(false);
    st.chore.x = [9, A7.chore.minutes];
    expect(studentKind(st, 'x', 9)).toBe('work');
    expect(a7CanTeach(w, 'zhou-jiaotou', 'x')).toBe(true); // 以工代學對武館（兩位師父）都算
    expect(studentKind(st, 'x', 10)).toBeUndefined(); // 隔天重算
    st.paidUntil.y = { [MASTER_CID]: 9 + A7.tuition.days - 1 };
    expect(studentKind(st, 'y', 20)).toBe('paid');
    st.fetchDay = 20;
    expect(studentKind(st, 'y', 20)).toBeUndefined(); // 水缸見底：先去挑水
    st.chore.y = [20, A7.chore.minutes];
    expect(studentKind(st, 'y', 20)).toBe('paid');
    // 引擎：跑 20 日，有人做滿雜務並因此學到招（以工代學）
    const real = a7Of(run20().game);
    expect(real.log.some((l) => l.kind === 'work')).toBe(true);
    expect(Object.values(real.learned).includes('work')).toBe(true);
  });

  test('(d) 接濟「替他付這個月束脩」：該人成為學生、師父收到束脩、緣 −2（同一個月不能重複付）', () => {
    const s = Session.fresh({ seed: 7, play: 's1' });
    const a4 = () => s.game.world.wuxia!.elements[A4_PLAY] as A4State;
    while (s.gameMinute() < 2 * 1440 + 12 * 60) s.step([]);
    const yuan = a4().yuan;
    expect(yuan).toBeGreaterThanOrEqual(PLAY.costs.feed);
    const st = a7Of(s.game);
    const before = st.purse[MASTER_CID];
    expect(studentKind(st, 'a-qing', st.day, MASTER_CID)).not.toBe('paid');
    const r = intervene(s.game, s.game.engine.currentTime!, { kind: 'feed', target: 'a-qing', tuition: MASTER_CID });
    expect(r.ok).toBe(true);
    expect(a4().yuan).toBe(yuan - 2);
    expect(studentKind(st, 'a-qing', st.day, MASTER_CID)).toBe('paid');
    expect(st.purse[MASTER_CID]).toBe(before + TUITION_PRICE);
    expect(st.aid).toBe(TUITION_PRICE);
    const again = intervene(s.game, s.game.engine.currentTime!, { kind: 'feed', target: 'a-qing', tuition: MASTER_CID });
    expect(again.ok).toBe(false);
    expect(a4().yuan).toBe(yuan - 2); // 失敗不扣緣
    for (let i = 0; i < 1500; i++) s.step([]); // 接濟進來的錢也守恆
    expect(a7Of(s.game).ledger.every((l) => l.err === 0)).toBe(true);
  });

  test('(e) --off a7-tuition：seed 7 3 日 hash ＝ A6 的值（元素關掉跟 A6 逐位元組相同）', () => {
    const r = runHeadless({ seed: 7, minutes: 1, untilGameMinute: 3 * 1440, elements: { 'a7-tuition': false } } as any);
    expect(r.finalHash).toBe(A6_HASH_SEED7_3D);
  });
});
