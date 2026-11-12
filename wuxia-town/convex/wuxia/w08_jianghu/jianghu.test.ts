// 武俠小鎮 W8（#560）：傳聞文字與走樣、「鎮上有人能打」、鎮誌模板與守門、心念「聽說山賊 → 想學武」、強制山賊事件的單元測試。
import { Memory, MindPerson, evalCond, THOUGHT_BY_ID } from '../w05_mind/data';
import { JIANGHU, distortFacts, initJianghuState, isFighterRumor, rumorText, activeOut, rumorsLine } from './data';
import { checkChronicle, chronicleLines, chronicleTemplateDay, zhDay } from './chronicle';
import { storyCandidate } from './events/story';
import type { WuxiaState } from '../state';

const DAY = 1440;

describe('傳聞', () => {
  test('走樣只往大裡說、不改結局（山賊 3 人 → 5 人）', () => {
    const f = { count: 3, outcome: 'fled' as const, heroes: ['zhou-jiaotou'] };
    const g = distortFacts('bandit', f);
    expect(g.count).toBe(5);
    expect(g.outcome).toBe('fled');
    expect(f.count).toBe(3);
    expect(rumorText('bandit', f)).toBe('三個山賊下山搶藥鋪，被周教頭打跑了');
    expect(rumorText('bandit', g)).toBe('五個山賊下山搶藥鋪，被周教頭打跑了');
    expect(distortFacts('wealth', { goods: 4 }).goods).toBe(8);
    expect(distortFacts('dojo', { feat: 'reopen', coach: 'zhou-jiaotou', disciples: 0 }).disciples).toBe(2);
  });

  test('鎮上有人能打＝山賊被打跑、或俠客輸給鎮上的人', () => {
    expect(isFighterRumor('bandit', { outcome: 'fled' })).toBe(true);
    expect(isFighterRumor('bandit', { outcome: 'robbed' })).toBe(false);
    expect(isFighterRumor('xiake', { result: 'town' })).toBe(true);
    expect(isFighterRumor('xiake', { result: 'xiake' })).toBe(false);
    expect(isFighterRumor('dojo', { feat: 'reopen' })).toBe(false);
  });

  test('出鎮傳聞 outDays 日後失效', () => {
    const st = initJianghuState();
    st.out.push({ rid: 1, about: 'wealth', facts: { goods: 3 }, text: '', day: 5, gm: 0, from: 'he-langzhong' });
    expect(activeOut(st, 5 + JIANGHU.rumor.outDays)).toHaveLength(1);
    expect(activeOut(st, 6 + JIANGHU.rumor.outDays)).toHaveLength(0);
  });

  test('對話 prompt「你最近聽說」最新的在前、最多 3 則', () => {
    const st = initJianghuState();
    st.known['a-qing'] = [1, 2, 3, 4].map((i) => ({ rid: i, facts: {}, text: `事${i}`, via: 'talk' as const, hop: 1, day: i, gm: i, distorted: false }));
    const w = { enabled: { 'w08-jianghu': true }, elements: { 'w08-jianghu': st } } as unknown as WuxiaState;
    expect(rumorsLine(w, 'a-qing')).toBe('事4；事3；事2');
    expect(rumorsLine(w, 'lin-sao')).toBeUndefined();
    expect(rumorsLine({ ...w, enabled: {} } as WuxiaState, 'a-qing')).toBeUndefined();
  });

  test('說書挑老韓聽過、還沒說過、不是藥鋪進貨的最近一則', () => {
    const st = initJianghuState();
    st.rumors.push({ id: 1, about: 'dojo', text: '', truth: {}, day: 1, gm: 10 }, { id: 2, about: 'wealth', text: '', truth: {}, day: 2, gm: 20 });
    st.known['lao-han'] = [
      { rid: 1, facts: {}, text: '', via: 'talk', hop: 1, day: 1, gm: 11, distorted: false },
      { rid: 2, facts: {}, text: '', via: 'talk', hop: 1, day: 2, gm: 21, distorted: false },
    ];
    expect(storyCandidate(st)).toBe(1);
    st.told.push(1);
    expect(storyCandidate(st)).toBeUndefined();
  });
});

describe('鎮誌', () => {
  test('模板段落與中文日數', () => {
    expect(zhDay(12)).toBe('十二');
    expect(zhDay(105)).toBe('一百零五');
    expect(chronicleTemplateDay(3, [{ day: 3, gm: 0, kind: 'restock', text: '藥鋪進了五箱藥材' }])).toBe('第三日。藥鋪進了五箱藥材。');
  });
  test('改寫段落要過 W2 守門與 80 字上限', () => {
    expect(checkChronicle('第三日，藥鋪新進五箱藥材，鎮上人人稱羨。').ok).toBe(true);
    expect(checkChronicle('第3日 OK').ok).toBe(false);
    expect(checkChronicle('鎮'.repeat(81)).reasons).toContain('chronicle>80');
  });
  test('有改寫用改寫，沒有用模板', () => {
    const st = initJianghuState();
    st.chronicle.push({ day: 3, gm: 0, kind: 'restock', text: '藥鋪進了五箱藥材' }, { day: 4, gm: DAY, kind: 'dojo', text: '周教頭重開了破武館' });
    st.chronicleDays.push({ day: 4, text: '是日，周教頭重開武館。', guard: 'pass' });
    expect(chronicleLines(st)).toEqual([
      { day: 3, text: '第三日。藥鋪進了五箱藥材。', guard: 'template' },
      { day: 4, text: '是日，周教頭重開武館。', guard: 'pass' },
    ]);
  });
});

describe('心念', () => {
  const person = (memories: Memory[]): MindPerson => ({ cid: 'he-langzhong', memories, thoughts: [], places: [], trainMin: 0 });
  test('聽說山賊 → 想學武（拳腳 < 100）；聽說別的事不算', () => {
    const learn = THOUGHT_BY_ID['learn'];
    const ctx = { gm: 3 * DAY, skills: { fist: 5 } } as any;
    const bandit: Memory = { id: 9, t: 2 * DAY, kind: 'rumor', what: 'bandit', n: 4, weight: 1 };
    const dojo: Memory = { id: 8, t: 2 * DAY, kind: 'rumor', what: 'dojo', n: 2, weight: 1 };
    expect(evalCond(learn.when as any, person([bandit]), ctx).ok).toBe(true);
    expect(evalCond(learn.when as any, person([dojo]), ctx).ok).toBe(false);
    expect(evalCond(learn.when as any, person([bandit]), { ...ctx, skills: { fist: 150 } }).ok).toBe(false);
  });
});
