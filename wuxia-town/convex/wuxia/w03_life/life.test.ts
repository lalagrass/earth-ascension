// 武俠小鎮 W3（#555）：生活規則的單元測試。
import {
  ACTIVITY_BY_ID,
  OBJECTS,
  OBJECT_BY_ID,
  SCHEDULES,
  blankMinutesPerDay,
  currentBlock,
  inRange,
  placeAt,
} from './data';
import { LIFE_RULES, Person, allowed, chooseNext, initLifeState, missedBlockStart, urgency } from '.';
import { makeRng } from '../rng';
import { FOLK_CHARACTERS } from '../w02_folk';

const person = (cid: string, needs: Partial<Person['needs']> = {}): Person => {
  const home = FOLK_CHARACTERS.find((c) => c.id === cid)!.home;
  return {
    cid,
    home,
    needs: { hunger: 30, fatigue: 30, boredom: 30, chore: 30, ...needs },
    blockDone: [],
  };
};

describe('w03-life 資料', () => {
  test('每個物件的座位數＝capacity，座位都是可走格且不重疊', () => {
    const seen = new Set<string>();
    for (const o of OBJECTS) {
      expect(o.slots.length).toBe(o.capacity);
      for (const [x, y] of o.slots) {
        const key = `${x},${y}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        expect(placeAt(x, y)).toBe(o.place);
      }
    }
  });
  test('#555 起始物件都在：井、灶、床×6、茶館桌×4、說書台、鐵砧、藥櫃、茶爐、河邊石、竹林', () => {
    const ids = OBJECTS.map((o) => o.id);
    expect(ids.filter((i) => i.startsWith('bed-')).length).toBe(6);
    expect(ids.filter((i) => i.startsWith('tea-table-')).length).toBe(4);
    for (const id of ['well', 'story-stage', 'anvil', 'medicine-chest', 'tea-stove', 'river-stones', 'bamboo-grove'])
      expect(ids).toContain(id);
    expect(ACTIVITY_BY_ID.storytell.roles).toEqual(['lao-han']);
    expect(ACTIVITY_BY_ID.smith.roles).toEqual(['shi-hu']);
    expect(ACTIVITY_BY_ID.consult.roles).toEqual(['he-langzhong']);
    expect(ACTIVITY_BY_ID.brew_tea.roles).toEqual(['lin-sao']);
  });
  test('#562 W3-5：每人每天至少 2 小時沒有排定的事', () => {
    for (const cid of Object.keys(SCHEDULES)) expect(blankMinutesPerDay(cid)).toBeGreaterThanOrEqual(120);
  });
  test('每位鎮民都有日程；時段可跨午夜', () => {
    for (const c of FOLK_CHARACTERS) expect(SCHEDULES[c.id]).toBeDefined();
    expect(inRange(30, [1260, 300])).toBe(true);
    expect(inRange(600, [1260, 300])).toBe(false);
    expect(currentBlock('shi-hu', 23 * 60)?.do).toEqual(['sleep']);
  });
});

describe('w03-life 決策', () => {
  test('急迫度：≤70 為 0，70→90 線性到 3，>90 壓過日程權重＋擾動', () => {
    expect(urgency(70)).toBe(0);
    expect(urgency(80)).toBeCloseTo(1.5);
    expect(urgency(90)).toBeCloseTo(3);
    expect(urgency(91)).toBeGreaterThan(LIFE_RULES.scheduleWeight + LIFE_RULES.noise);
  });
  test('日程時段的工作會被選中（鐵匠辰時打鐵）', () => {
    const state = initLifeState();
    const p = person('shi-hu');
    const pick = chooseNext(p, 8 * 60, '1:420', state, makeRng(1));
    expect(pick?.act).toBe('smith');
  });
  test('需求 > 90 壓過日程（鐵匠打鐵時段餓到 95 → 吃飯）', () => {
    const state = initLifeState();
    const p = person('shi-hu', { hunger: 95 });
    for (let s = 1; s < 20; s++) expect(chooseNext(p, 8 * 60, '1:420', state, makeRng(s))?.act).toBe('eat');
  });
  test('座位滿了就不會被選（預約 ≤ capacity）', () => {
    const state = initLifeState();
    state.res.anvil = ['someone'];
    const p = person('shi-hu');
    const pick = chooseNext(p, 8 * 60, '1:420', state, makeRng(1));
    expect(pick?.obj).not.toBe('anvil');
    // 一個座位都不剩時回傳 undefined（選不到事做）
    for (const id of Object.keys(state.res)) state.res[id] = state.res[id].map(() => 'x');
    expect(chooseNext(p, 8 * 60, '1:420', state, makeRng(1))).toBeUndefined();
  });
  test('床、灶只給自己／自己家用；說書只有老韓', () => {
    const state = initLifeState();
    const lin = person('lin-sao');
    expect(allowed(lin, OBJECT_BY_ID['bed-shi-hu'], ACTIVITY_BY_ID.sleep, 23 * 60, state)).toBe(false);
    expect(allowed(lin, OBJECT_BY_ID['bed-lin-sao'], ACTIVITY_BY_ID.sleep, 23 * 60, state)).toBe(true);
    expect(allowed(lin, OBJECT_BY_ID['stove-smithy'], ACTIVITY_BY_ID.eat, 12 * 60, state)).toBe(false);
    expect(allowed(lin, OBJECT_BY_ID['stove-teahouse'], ACTIVITY_BY_ID.eat, 12 * 60, state)).toBe(true);
    expect(allowed(lin, OBJECT_BY_ID['story-stage'], ACTIVITY_BY_ID.storytell, 12 * 60, state)).toBe(false);
  });
  test('聽書只有在有人說書時才行', () => {
    const state = initLifeState();
    const p = person('a-qing');
    const table = OBJECT_BY_ID['tea-table-1'];
    expect(allowed(p, table, ACTIVITY_BY_ID.listen_story, 18 * 60, state)).toBe(false);
    state.people['p:9'] = { ...person('lao-han'), cur: { act: 'storytell', obj: 'story-stage', slot: 0, phase: 'do', since: 0, retries: 0 } };
    expect(allowed(p, table, ACTIVITY_BY_ID.listen_story, 18 * 60, state)).toBe(true);
  });
  test('睡覺只在日程排到或很累時（早上不會因擾動補眠）', () => {
    const state = initLifeState();
    const bed = OBJECT_BY_ID['bed-shi-hu'];
    expect(allowed(person('shi-hu'), bed, ACTIVITY_BY_ID.sleep, 6 * 60, state)).toBe(false);
    expect(allowed(person('shi-hu', { fatigue: 80 }), bed, ACTIVITY_BY_ID.sleep, 6 * 60, state)).toBe(true);
    expect(allowed(person('shi-hu'), bed, ACTIVITY_BY_ID.sleep, 23 * 60, state)).toBe(true);
  });
  test('#562 W3-4：沒飯就不能吃；煮飯繼承餓的急迫度', () => {
    const state = initLifeState();
    const p = person('shi-hu', { hunger: 95 });
    state.stock.smithy = { water: 2, wood: 2, meal: 0 };
    expect(allowed(p, OBJECT_BY_ID['stove-smithy'], ACTIVITY_BY_ID.eat, 8 * 60, state)).toBe(false);
    for (let s = 1; s < 20; s++) expect(chooseNext(p, 8 * 60, '1:420', state, makeRng(s))?.act).toBe('cook');
    // 連水也沒有：挑水繼承
    state.stock.smithy = { water: 0, wood: 2, meal: 0 };
    for (let s = 1; s < 20; s++)
      expect(chooseNext(p, 8 * 60, '1:420', state, makeRng(s))?.act).toBe('draw_water');
  });
  test('吃飯一個時段只加權一次；錯過午飯時段 2 小時內仍有權重', () => {
    const p = person('shi-hu');
    // 午飯時段 12:00–13:00
    p.blockKey = '1:720';
    p.blockDone = ['eat'];
    const state = initLifeState();
    state.minute = 400;
    for (let s = 1; s < 10; s++)
      expect(chooseNext(p, 12 * 60 + 30, '1:720', state, makeRng(s))?.act).not.toBe('eat');
    expect(missedBlockStart('shi-hu', 'eat', 13 * 60 + 30, 1000)).toBe(1000 - 30 - 60);
    expect(missedBlockStart('shi-hu', 'eat', 16 * 60, 1000)).toBeUndefined();
  });
});
