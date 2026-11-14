// 武俠小鎮 W7（#559）：三軸由記憶推出、心念「想拜師」的條件、師父加成、武館名號、門規「尊師」掛鉤的單元測試。
import { Memory, MindPerson, MindState, evaluatePerson } from '../w05_mind/data';
import { TRAINING, gainPerMinute } from '../w04_dojo/data';
import {
  BONDS,
  BondState,
  DOJO_NAMES,
  W07_BOND,
  bondEvalCtx,
  computeBonds,
  contributions,
  dojoNameFor,
  initBondState,
  masterBonusFor,
  mutualRival,
  siblingTitle,
  sumBond,
  topContributions,
} from './data';
import { mustAcceptInvite } from './hooks';
import type { WuxiaState } from '../state';

const DAY = 1440;
const mem = (id: number, t: number, kind: Memory['kind'], extra: Partial<Memory> = {}): Memory => ({ id, t, kind, weight: 1, ...extra });
const person = (cid: string, memories: Memory[] = [], thoughts: MindPerson['thoughts'] = []): MindPerson => ({
  cid,
  memories,
  thoughts,
  places: [],
  trainMin: 0,
});
const world = (bond: BondState | undefined, skills: Record<string, any> = {}): WuxiaState => ({
  v: 1,
  seed: 7,
  timeScale: 60,
  enabled: { 'w03-life': true, 'w04-dojo': true, 'w05-mind': true, 'w06-spar': true, ...(bond ? { [W07_BOND]: true } : {}) },
  rng: { s: 1 } as any,
  elements: { 'w04-dojo': { skills }, ...(bond ? { [W07_BOND]: bond } : {}) },
});

describe('w07-bond 三軸', () => {
  test('聊天、吃飯 → 親近 +；被拒 → 親近 −；切磋輸 → 敬重 +；記憶越舊越小', () => {
    const p = person('a-qing', [
      mem(1, 0, 'talk', { other: 'lin-sao' }),
      mem(2, 10, 'meal_with', { other: 'lin-sao' }),
      mem(3, 20, 'rejected', { other: 'lin-sao' }),
      mem(4, 30, 'spar_lost', { other: 'zhou-jiaotou' }),
    ]);
    const lin = sumBond(contributions(p, 'a-qing', 'lin-sao', 30, undefined));
    expect(lin.close).toBe(Math.round(4 + 3 - 8));
    const zhou = contributions(p, 'a-qing', 'zhou-jiaotou', 30 + 10 * DAY, undefined);
    expect(zhou[0].delta.respect).toBeCloseTo(BONDS.effects.spar_lost.respect! * Math.pow(BONDS.decayPerDay, 10), 3);
  });

  test('30 日以前的記憶不算；看到技能高很多 → 敬重、相近 → 競爭', () => {
    const p = person('a-qing', [
      mem(1, 0, 'spar_lost', { other: 'zhou-jiaotou' }),
      mem(2, 31 * DAY, 'saw_skill', { other: 'zhou-jiaotou', n: 450 }),
      mem(3, 31 * DAY, 'saw_skill', { other: 'shi-hu', n: 20 }),
      mem(4, 31 * DAY, 'saw_skill', { other: 'lin-sao', n: -120 }),
    ]);
    const gm = 31 * DAY;
    expect(sumBond(contributions(p, 'a-qing', 'zhou-jiaotou', gm, undefined))).toEqual({ close: 0, respect: 3, rival: 0 });
    expect(sumBond(contributions(p, 'a-qing', 'shi-hu', gm, undefined)).rival).toBe(3);
    expect(sumBond(contributions(p, 'a-qing', 'lin-sao', gm, undefined))).toEqual({ close: 0, respect: 0, rival: 0 });
  });

  test('切磋互有勝負 → 競爭固定項；師兄弟 → 親近 +20；夾在 −100～100', () => {
    const st = initBondState();
    st.disciples = { 'a-qing': { master: 'zhou-jiaotou', since: 0, day: 1, order: 1 }, 'shi-hu': { master: 'zhou-jiaotou', since: 5, day: 1, order: 2 } };
    const p = person('shi-hu', [mem(1, 0, 'spar_won', { other: 'a-qing' }), mem(2, 1, 'spar_lost', { other: 'a-qing' })]);
    const cs = contributions(p, 'shi-hu', 'a-qing', 2, st);
    expect(cs.map((c) => c.label).filter(Boolean)).toEqual(['切磋互有勝負（贏 1 輸 1）', '同門師兄']);
    const b = sumBond(cs);
    expect(b.close).toBe(BONDS.siblingClose);
    expect(b.rival).toBe(BONDS.mixedRival);
    expect(siblingTitle(st, 'a-qing', 'shi-hu')).toBe('師弟');
    const many = person('a-qing', Array.from({ length: 30 }, (_, i) => mem(i + 1, 0, 'spar_lost', { other: 'zhou-jiaotou' })));
    expect(sumBond(contributions(many, 'a-qing', 'zhou-jiaotou', 0, undefined)).respect).toBe(100);
  });

  test('topContributions 依絕對值排、取前 5', () => {
    const p = person('a-qing', Array.from({ length: 8 }, (_, i) => mem(i + 1, i * DAY, 'spar_lost', { other: 'zhou-jiaotou' })));
    const top = topContributions(contributions(p, 'a-qing', 'zhou-jiaotou', 8 * DAY, undefined), 'respect');
    expect(top).toHaveLength(BONDS.trace);
    expect(top.map((c) => c.memory!.id)).toEqual([8, 7, 6, 5, 4]);
  });

  test('computeBonds 每一對都有、有方向', () => {
    const mind: MindState = {
      v: 1,
      minute: 0,
      evalDay: 1,
      seq: 3,
      people: {
        p1: person('a-qing', [mem(1, 0, 'spar_lost', { other: 'zhou-jiaotou' })]),
        p2: person('zhou-jiaotou', [mem(2, 0, 'spar_won', { other: 'a-qing' })]),
      },
    };
    const b = computeBonds(mind, initBondState(), 0);
    expect(b['a-qing']['zhou-jiaotou'].respect).toBe(10);
    expect(b['zhou-jiaotou']['a-qing'].respect).toBe(0);
  });
});

describe('心念「想拜師」', () => {
  const setup = (respect: number, coachFist: number, thoughts: string[], master = false) => {
    const st = initBondState();
    st.bonds = { 'a-qing': { 'zhou-jiaotou': { close: 0, respect, rival: 0 } } };
    if (master) st.disciples['a-qing'] = { master: 'zhou-jiaotou', since: 0, day: 1, order: 1 };
    const w = world(st, { 'a-qing': { fist: 150 }, 'zhou-jiaotou': { fist: coachFist } });
    const p = person(
      'a-qing',
      [mem(9, 0, 'spar_lost', { other: 'zhou-jiaotou' })],
      thoughts.map((id) => ({ id, s: 50, since: 1, causes: [] })),
    );
    const mind: MindState = { v: 1, minute: 0, evalDay: 1, seq: 10, people: { p1: p } };
    // 讓 learn／stronger 條件在這次評估成立（listen ×3、tier_up），才會出現在 thoughtAny 看的「這次已有」裡
    if (thoughts.includes('stronger')) p.memories.push(mem(10, 0, 'tier_up', { what: '拳腳入門' }));
    const ctx = { gm: 0, skills: { fist: 150 } as any, enabled: w.enabled, bond: bondEvalCtx(w, mind, 'p1', 0) };
    evaluatePerson(p, ctx, 2);
    return p.thoughts.find((t) => t.id === 'apprentice');
  };
  test('敬重 ≥ 60、對方拳腳高 ≥ 200、有想變強 → 出現，對象是周教頭，因為列出切磋輸', () => {
    const t = setup(60, 350, ['stronger']);
    expect(t?.target).toBe('zhou-jiaotou');
    expect(t?.causes).toEqual([9]);
  });
  test('敬重 59、技能差 199、沒有想學武／想變強、已拜師 → 不出現', () => {
    expect(setup(59, 620, ['stronger'])).toBeUndefined();
    expect(setup(80, 349, ['stronger'])).toBeUndefined();
    expect(setup(80, 620, [])).toBeUndefined();
    expect(setup(80, 620, ['stronger'], true)).toBeUndefined();
  });
  test('w07-bond 關閉時不評估（W6 世界不變）', () => {
    const p = person('a-qing', [], []);
    evaluatePerson(p, { gm: 0, enabled: { 'w05-mind': true } }, 2);
    expect(p.thoughts.find((t) => t.id === 'apprentice')).toBeUndefined();
  });
});

describe('師父加成、競爭切磋、名號、尊師', () => {
  test('師父在場 2.0，不在場 undefined（照 W4 的教頭加成）', () => {
    const st = initBondState();
    st.disciples['a-qing'] = { master: 'zhou-jiaotou', since: 0, day: 1, order: 1 };
    const w = world(st);
    expect(masterBonusFor(w, 'a-qing', () => true)).toBe(2);
    expect(masterBonusFor(w, 'a-qing', () => false)).toBeUndefined();
    expect(masterBonusFor(w, 'shi-hu', () => true)).toBeUndefined();
    const g2 = gainPerMinute('hit_dummy', 'fist', 150, 2, 0);
    const g15 = gainPerMinute('hit_dummy', 'fist', 150, true, 0);
    expect(g2 / g15).toBeCloseTo(2 / TRAINING.coachBonus, 6);
  });
  test('彼此競爭都 ≥ 門檻才算；w07-bond 關閉時恆 false', () => {
    const st = initBondState();
    st.bonds = { a: { b: { close: 0, respect: 0, rival: 50 } }, b: { a: { close: 0, respect: 0, rival: 39 } } };
    expect(mutualRival(world(st), 'a', 'b', 40)).toBe(false);
    st.bonds.b.a.rival = 40;
    expect(mutualRival(world(st), 'a', 'b', 40)).toBe(true);
    expect(mutualRival(world(undefined), 'a', 'b', 40)).toBe(false);
  });
  test('武館名號依 seed 選、都是原創名', () => {
    expect(dojoNameFor(7)).toBe(DOJO_NAMES[7 % DOJO_NAMES.length]);
    expect(dojoNameFor(8)).not.toBe(dojoNameFor(9));
    expect(DOJO_NAMES).toContain('青石武館');
  });
  test('尊師：被師父邀請一定接受；不是師父或 w07-bond 關閉時不管', () => {
    const st = initBondState();
    st.disciples['a-qing'] = { master: 'zhou-jiaotou', since: 0, day: 1, order: 1 };
    const w = world(st);
    w.clockEpoch = 0;
    w.elements['w03-life'] = { people: { p1: { cid: 'a-qing' }, p2: { cid: 'zhou-jiaotou' }, p3: { cid: 'lin-sao' } } };
    const game = { world: { wuxia: w } } as any;
    expect(mustAcceptInvite(game, 'p1', 'p2')).toBe(true);
    expect(mustAcceptInvite(game, 'p1', 'p3')).toBe(false);
    expect(mustAcceptInvite(game, 'p2', 'p1')).toBe(false);
    delete w.enabled[W07_BOND];
    expect(mustAcceptInvite(game, 'p1', 'p2')).toBe(false);
  });
});
