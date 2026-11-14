// 武俠小鎮 A6（#581）的 A 類測試（最多 5 條）：
//   (a) 看不能看轉手  (b) 同一招看滿需 3 個不同日  (c) 教的門檻依難度  (d) 銀沒達成前金不算  (e) --off a6-spread 的 seed 7 3 日 hash ＝ A5
import { runHeadless } from './headless';
import { quietConsole } from './sim';
import { A5_HASH_SEED7_3D } from './check-quick';
import { A2State, Know, MASTER_CID, MOVE_BY_ID, initA2State } from '../../convex/wuxia/a2_master/data';
import { pickTeach } from '../../convex/wuxia/a2_master';
import { SCENARIO_BY_ID, TIERS, evalGoals } from '../../convex/wuxia/a4_play/data';
import { A6, initA6State, minTeacherProf, recordWatch, watchChance, watchDayFull, watchable } from '../../convex/wuxia/a6_spread';
import { formalGenerations } from '../../convex/wuxia/a2_master/lineage';
import type { WuxiaState } from '../../convex/wuxia/state';

quietConsole(false);

const origin = (prof: number): Know => ({ prof, from: null, via: 'origin', day: 1, flawed: false });
const taught = (prof: number, from: string): Know => ({ prof, from, via: 'teach', day: 2, flawed: false, cap: 900 });
const watched = (from: string): Know => ({ prof: 30, from, via: 'watch', day: 3, flawed: true, cap: 150 });
const body = { stance: 1000, power: 1000 };

function world(enabled: Record<string, boolean>, close: Record<string, Record<string, number>> = {}): WuxiaState {
  const bonds: any = {};
  for (const a of Object.keys(close)) {
    bonds[a] = {};
    for (const b of Object.keys(close[a])) bonds[a][b] = { close: close[a][b], respect: 0, rival: 0 };
  }
  return { v: 1, seed: 7, timeScale: 60, enabled, rng: { algo: 'mulberry32', s: 1 }, elements: { 'w07-bond': { bonds, disciples: {} } } } as any;
}
const ON = { 'a2-master': true, 'w07-bond': true, 'a4-play': true, 'a6-spread': true };
const OFF = { 'a2-master': true, 'w07-bond': true, 'a4-play': true };

describe('A6 傳得開也傳得久（#581）', () => {
  test('(a) 看不能看轉手：只有正式學會（教）或開山的人看得到；引擎跑 20 日沒有任何「從看來的人身上看」', () => {
    const know = { m: { q: origin(1000) }, a: { q: taught(120, 'm') }, b: { q: watched('a') } };
    expect(watchable(know, 'm', 'q')).toBe(true);
    expect(watchable(know, 'a', 'q')).toBe(true);
    expect(watchable(know, 'b', 'q')).toBe(false); // 看來的人不能再被看
    expect(watchable(know, 'zz', 'q')).toBe(false);
    const a2 = runHeadless({ seed: 7, minutes: 1, untilGameMinute: 20 * 1440, arriveDay: 1, scenario: 'master-open' }).summary.a2 as A2State;
    let watchEdges = 0;
    for (const to of Object.keys(a2.know))
      for (const [id, k] of Object.entries(a2.know[to])) {
        if (k.via !== 'watch') continue;
        watchEdges++;
        expect(a2.know[k.from!]?.[id]?.via).not.toBe('watch');
      }
    expect(watchEdges).toBeGreaterThan(0); // 看還是會發生，只是稀有
  });

  test('(b) 同一招看滿需要 3 個不同遊戲日：一天最多算 4 次，10 次最少 3 日；機率＝好武×(1−0.15×(難度−1))', () => {
    const st = initA6State();
    for (let i = 0; i < 30; i++) expect(recordWatch(st, 'x', 'm', 1, 10)).toBe(false); // 同一天再多次也不會
    expect(watchDayFull(st, 'x', 'm', 1)).toBe(true);
    expect(recordWatch(st, 'x', 'm', 2, 10)).toBe(false); // 4 + 1
    for (let i = 0; i < 3; i++) expect(recordWatch(st, 'x', 'm', 2, 10)).toBe(false); // 4 + 4
    expect(st.watch.x.m).toEqual([[1, 4], [2, 4]]);
    expect(recordWatch(st, 'x', 'm', 3, 10)).toBe(false); // 4 + 4 + 1
    expect(recordWatch(st, 'x', 'm', 3, 10)).toBe(true); // 4 + 4 + 2 ＝ 10、3 個不同日
    expect(st.watch.x).toBeUndefined();
    expect(A6.watch.days).toBe(3);
    expect(watchChance(0.8, 1)).toBeCloseTo(0.8, 6);
    expect(watchChance(0.8, 2)).toBeCloseTo(0.8 * 0.85, 6);
    expect(watchChance(1, 5)).toBeCloseTo(0.4, 6);
  });

  test('(c) 教的門檻依難度：120＋70×(難度−1)（起勢 120、難度 5 的 400）；關閉時全部 400', () => {
    expect([1, 2, 3, 4, 5].map(minTeacherProf)).toEqual([120, 190, 260, 330, 400]);
    const close = { ding: { jia: 50 } };
    const st = (prof: number, id: string): A2State => {
      const s = initA2State();
      s.know = { ding: { [id]: taught(prof, MASTER_CID) }, jia: {} };
      return s;
    };
    const pick = (w: WuxiaState, s: A2State) => pickTeach(w, s, undefined, 'ding', 'jia', body)?.id;
    expect(pick(world(ON, close), st(119, 'taiji-qishi'))).toBeUndefined();
    expect(pick(world(ON, close), st(120, 'taiji-qishi'))).toBe('taiji-qishi');
    expect(MOVE_BY_ID['taiji-lanquewei'].difficulty).toBe(2);
    const s2 = st(189, 'taiji-lanquewei');
    s2.know.jia = { 'taiji-qishi': taught(50, MASTER_CID) };
    expect(pick(world(ON, close), s2)).toBeUndefined();
    s2.know.ding['taiji-lanquewei'].prof = 190;
    expect(pick(world(ON, close), s2)).toBe('taiji-lanquewei');
    expect(MOVE_BY_ID['taiji-yunshou'].difficulty).toBe(5);
    // a6 關閉：120 還是教不了起勢（A2 的 400）
    expect(pick(world(OFF, close), st(120, 'taiji-qishi'))).toBeUndefined();
    expect(pick(world(OFF, close), st(400, 'taiji-qishi'))).toBe('taiji-qishi');
  });

  test('(d) 銀沒達成前金不算：金級的條件都成立，銀還沒達成就不算；正式第 3 代要每一環都是教', () => {
    const sc = SCENARIO_BY_ID.s1;
    // 鎮上 12 人都正式會起勢（townShare 100%、沒有走樣），但沒有第 3 代 → 銅成立、銀不成立、金條件成立但被鎖
    const people: any = {};
    const know: any = { [MASTER_CID]: { 'taiji-qishi': origin(1000) } };
    for (let i = 0; i < 12; i++) {
      people[`p${i}`] = { cid: `c${i}` };
      know[`c${i}`] = { 'taiji-qishi': taught(60, MASTER_CID) };
    }
    const w: any = {
      enabled: { ...ON, 'w03-life': true },
      elements: { 'a2-master': { ...initA2State(), know }, 'w03-life': { people }, 'w07-bond': { bonds: {}, disciples: {} } },
    };
    let g = evalGoals(w, sc);
    expect(g.bronze.ok).toBe(true);
    expect(g.silver.ok).toBe(false);
    expect(g.gold.conds.every((c) => c.ok)).toBe(true);
    expect(g.gold.ok).toBe(false); // 銀沒達成，金不算
    // 銀達成後（done 記了達成日）金才算
    g = evalGoals(w, sc, { bronze: 7 });
    expect(g.gold.ok).toBe(false);
    g = evalGoals(w, sc, { bronze: 7, silver: 20 });
    expect(g.gold.ok).toBe(true);
    // a6 關閉（A5）：不分先後，金條件成立就算
    const off = { ...w, enabled: { ...w.enabled, 'a6-spread': false } };
    expect(evalGoals(off, sc).gold.ok).toBe(true);
    // 正式第 3 代：大師→c0→c1 都是教＝2；c1 若是看 c0 的就不算
    const a2 = w.elements['a2-master'] as A2State;
    a2.know.c1['taiji-qishi'] = taught(60, 'c0');
    expect(formalGenerations(a2, 'taiji').c1).toBe(2);
    expect(evalGoals(w, sc, { bronze: 7 }).silver.ok).toBe(true);
    a2.know.c1['taiji-qishi'] = watched('c0');
    expect(formalGenerations(a2, 'taiji').c1).toBeUndefined();
    expect(evalGoals(w, sc, { bronze: 7 }).silver.ok).toBe(false);
    for (const t of TIERS) expect(sc.goalsA6![t].label.length).toBeGreaterThan(0);
  });

  test('(e) --off a6-spread：seed 7 3 日 hash ＝ A5 的值（元素關掉跟 A5 逐位元組相同）', () => {
    const r = runHeadless({ seed: 7, minutes: 1, untilGameMinute: 3 * 1440, elements: { 'a6-spread': false } } as any);
    expect(r.finalHash).toBe(A5_HASH_SEED7_3D);
  });
});
