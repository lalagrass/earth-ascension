// 武俠小鎮 A2（#575）的 A 類核心測試（#575 審查補充指定的五條：A1、A2、A3、A4、A6；其餘延到 A5）。
import { runHeadless } from './headless';
import { quietConsole } from './sim';
import {
  A2State,
  Know,
  MASTER,
  MASTER_CID,
  MOVE_BY_ID,
  applyTeach,
  applyWatch,
  chainOf,
  initA2State,
} from '../../convex/wuxia/a2_master/data';
import { pickTeach } from '../../convex/wuxia/a2_master';
import type { WuxiaState } from '../../convex/wuxia/state';

quietConsole(false);

const origin = (prof: number): Know => ({ prof, from: null, via: 'origin', day: 1, flawed: false });
const body = { stance: 1000, power: 1000 };
/** 只有 w07-bond 關係（親近）的最小世界；a2-master 開著 */
function world(close: Record<string, Record<string, number>> = {}, disciples: Record<string, string> = {}): WuxiaState {
  const bonds: any = {};
  for (const a of Object.keys(close)) {
    bonds[a] = {};
    for (const b of Object.keys(close[a])) bonds[a][b] = { close: close[a][b], respect: 0, rival: 0 };
  }
  const d: any = {};
  for (const [c, m] of Object.entries(disciples)) d[c] = { master: m, since: 0, day: 1, order: 1 };
  return {
    v: 1,
    seed: 7,
    timeScale: 60,
    enabled: { 'a2-master': true, 'w07-bond': true },
    rng: { algo: 'mulberry32', s: 1 },
    elements: { 'w07-bond': { bonds, disciples: d } },
  } as any;
}

// 引擎跑：大師第 1 日進鎮的 open 劇本 9 日（教、看、練都會發生），與沒有大師的劇本
const ARRIVE1 = runHeadless({ seed: 7, minutes: 1, untilGameMinute: 9 * 1440, arriveDay: 1, scenario: 'master-open' }).summary.a2 as any;
const NONE = [7, 23].map((seed) => runHeadless({ seed, minutes: 1, untilGameMinute: 8 * 1440, scenario: 'no-master' }).summary.a2 as any);

describe('A2 大師入鎮與四條傳承管道（#575）', () => {
  test('A1 沒有大師的局：沒有任何人會任何太極招（seed 7、23）', () => {
    for (const a2 of NONE) {
      expect(a2.arrivedAt).toBeUndefined();
      for (const k of Object.values(a2.know) as Array<Record<string, Know>>)
        for (const id of Object.keys(k)) expect(MOVE_BY_ID[id].family).not.toBe('taiji');
      expect(a2.records.filter((r: any) => MOVE_BY_ID[r.move].family === 'taiji')).toHaveLength(0);
    }
  });

  test('A2 每一筆「教」：上限 ≤ 教的人當時 prof × 0.9，前置招與身體門檻都已滿足；師父進步後再教提高上限', () => {
    const teach = ARRIVE1.records.filter((r: any) => r.via === 'teach');
    expect(teach.length).toBeGreaterThan(0);
    for (const r of teach) {
      expect(r.cap).toBeLessThanOrEqual(Math.floor(r.fromProf * 0.9));
      expect(r.prereqOk).toBe(true);
      expect(r.bodyOk).toBe(true);
    }
    // 純規則：沒會前置招、身體不夠的不教；上限＝當時 ×0.9；教的人進步後重教提高上限
    const w = world();
    const st: A2State = initA2State();
    st.know[MASTER_CID] = { 'taiji-qishi': origin(700), 'taiji-lanquewei': origin(700), 'taiji-danbian': origin(700) };
    expect(pickTeach(w, st, undefined, MASTER_CID, 'x', { stance: 0, power: 0 })?.id).toBe('taiji-qishi');
    const r1 = applyTeach(st.know, MASTER_CID, 'x', 'taiji-qishi', 2, 0, body);
    expect(r1.cap).toBe(630);
    expect(st.know.x['taiji-qishi']).toMatchObject({ prof: 50, from: MASTER_CID, via: 'teach', flawed: false, cap: 630 });
    expect(pickTeach(w, st, undefined, MASTER_CID, 'x', { stance: 0, power: 0 })?.id).toBe('taiji-lanquewei');
    applyTeach(st.know, MASTER_CID, 'x', 'taiji-lanquewei', 2, 0, body);
    // 單鞭要下盤 60：身體不夠就不教
    expect(pickTeach(w, st, undefined, MASTER_CID, 'x', { stance: 10, power: 0 })).toBeUndefined();
    expect(pickTeach(w, st, undefined, MASTER_CID, 'x', { stance: 60, power: 0 })?.id).toBe('taiji-danbian');
    st.know[MASTER_CID]['taiji-qishi'].prof = 900;
    st.know[MASTER_CID]['taiji-danbian'].prof = 0; // 不再能教單鞭
    expect(pickTeach(w, st, undefined, MASTER_CID, 'x', body)?.id).toBe('taiji-qishi');
    expect(applyTeach(st.know, MASTER_CID, 'x', 'taiji-qishi', 3, 0, body).cap).toBe(810);
  });

  test('A3 「看」只得到難度 ≤ 2 的招，一定走樣、上限 150；被正式教過後走樣消除', () => {
    const watched = ARRIVE1.records.filter((r: any) => r.via === 'watch');
    expect(watched.length).toBeGreaterThan(0);
    for (const r of watched) {
      expect(MOVE_BY_ID[r.move].difficulty).toBeLessThanOrEqual(MASTER.watch.maxDifficulty);
      expect(r.flawed).toBe(true);
      expect(r.cap).toBe(150);
    }
    const know: Record<string, Record<string, Know>> = { [MASTER_CID]: { 'taiji-pipa': origin(940), 'taiji-qishi': origin(1000) } };
    expect(applyWatch(know, MASTER_CID, 'y', 'taiji-pipa', 5, 0)).toBeUndefined(); // 難度 3
    expect(know.y?.['taiji-pipa']).toBeUndefined();
    applyWatch(know, MASTER_CID, 'y', 'taiji-qishi', 5, 0);
    expect(know.y['taiji-qishi']).toMatchObject({ prof: 30, via: 'watch', flawed: true, cap: 150, from: MASTER_CID });
    applyTeach(know, MASTER_CID, 'y', 'taiji-qishi', 6, 0, body);
    expect(know.y['taiji-qishi']).toMatchObject({ via: 'teach', flawed: false, cap: 900 });
  });

  test('A4 跟走樣的人學到的招也是走樣（三代的鏈：甲→乙→丙→丁）', () => {
    // 甲偷看學會（走樣），之後熟練度練到 450（測試直接擺）；甲願意教乙（親近 ≥ 20），乙再教丙、丙再教丁
    const w = world({ jia: { yi: 30 }, yi: { bing: 30 }, bing: { ding: 30 } });
    const st: A2State = initA2State();
    st.know[MASTER_CID] = { 'taiji-qishi': origin(1000) };
    applyWatch(st.know, MASTER_CID, 'jia', 'taiji-qishi', 5, 0);
    st.know.jia['taiji-qishi'].prof = 450;
    let teacher = 'jia';
    for (const student of ['yi', 'bing', 'ding']) {
      expect(pickTeach(w, st, undefined, teacher, student, body)?.id).toBe('taiji-qishi');
      const r = applyTeach(st.know, teacher, student, 'taiji-qishi', 6, 0, body);
      expect(r.flawed).toBe(true);
      expect(st.know[student]['taiji-qishi'].flawed).toBe(true);
      st.know[student]['taiji-qishi'].prof = 420;
      teacher = student;
    }
    expect(chainOf(st.know, 'ding', 'taiji-qishi')).toEqual(['ding', 'bing', 'yi', 'jia', MASTER_CID]);
    // 沒有交情、不是徒弟的人不教；也不會教回自己的上游（不成環）
    expect(pickTeach(w, st, undefined, 'ding', 'zz', body)).toBeUndefined();
    expect(pickTeach(world({ ding: { jia: 99 } }), st, undefined, 'ding', 'jia', body)).toBeUndefined();
  });

  test('A6 每個人會的每一招都追得回大師或周教頭（沒有來歷不明的招）', () => {
    let n = 0;
    for (const [cid, k] of Object.entries(ARRIVE1.know) as Array<[string, Record<string, Know>]>) {
      for (const id of Object.keys(k)) {
        const chain = chainOf(ARRIVE1.know, cid, id);
        const root = chain[chain.length - 1];
        expect(ARRIVE1.know[root][id].via).toBe('origin');
        expect([MASTER_CID, 'zhou-jiaotou']).toContain(root);
        n++;
      }
    }
    expect(n).toBeGreaterThan(18);
  });
});
