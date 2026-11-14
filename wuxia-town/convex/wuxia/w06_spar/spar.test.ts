// 武俠小鎮 W6（#558）：切磋判定（公式、平手、20 回合上限）、勝率、旁白模板的單元測試。
// `npm test -- spar` 跑這個檔。
import {
  Fighter,
  SPAR,
  boutOutcome,
  boutView,
  firstAttacker,
  reactionChance,
  resolveExchange,
  runBout,
  startBout,
  startingShi,
  stepBout,
} from './duel';
import { checkNarration, sparNarrationPrompt, sparNarrationTemplate, zhNumber } from './narration';
import { initialSkills } from '../w04_dojo/data';
import { makeRng } from '../rng';
import { describeMemory } from '../w05_mind/data';
import { initMindState, remember } from '../w05_mind';

const F = (fist: number, stance: number, stamina: number, power = 50): Fighter => ({ fist, power, stance, stamina });
/** 依序吐出給定的亂數 */
const seq = (xs: number[]) => {
  let i = 0;
  return () => {
    if (i >= xs.length) throw new Error('rng exhausted');
    return xs[i++];
  };
};

describe('W6 spar: reaction formula (#558)', () => {
  test('reaction = clamp(0.5 + (def.fist + def.stance/2 - att.fist)/div, 0.1, 0.9)', () => {
    const div = SPAR.reaction.div;
    expect(reactionChance(F(100, 0, 0), F(100, 0, 0))).toBe(0.5);
    expect(reactionChance(F(100, 0, 0), F(130, 60, 0))).toBeCloseTo(0.5 + (130 + 30 - 100) / div, 4);
    expect(reactionChance(F(130, 0, 0), F(100, 60, 0))).toBeCloseTo(0.5 + (100 + 30 - 130) / div, 4);
  });
  test('clamped to [0.1, 0.9]', () => {
    expect(reactionChance(F(1000, 0, 0), F(0, 0, 0))).toBe(0.1);
    expect(reactionChance(F(0, 0, 0), F(1000, 1000, 0))).toBe(0.9);
    // 教頭打新手：新手幾乎躲不掉；新手打教頭：教頭幾乎都接得住
    const coach = initialSkills('zhou-jiaotou');
    const aqing = initialSkills('a-qing');
    expect(reactionChance(coach, aqing)).toBeLessThan(0.2);
    expect(reactionChance(aqing, coach)).toBe(0.9);
  });
  test('starting 勢 = 3 + stamina/250, floored', () => {
    expect(startingShi(F(0, 0, 0))).toBe(3);
    expect(startingShi(F(0, 0, 249))).toBe(3);
    expect(startingShi(F(0, 0, 250))).toBe(4);
    expect(startingShi(initialSkills('zhou-jiaotou'))).toBe(4); // 3 + 450/250 = 4.8
    expect(startingShi(F(0, 0, 1000))).toBe(7);
  });
});

describe('W6 spar: resolveExchange is the single judging interface (#562 W6-11)', () => {
  test('uses exactly 2 rng values: move, then reaction', () => {
    const a = F(100, 0, 0);
    const d = F(100, 0, 0); // p = 0.5
    expect(resolveExchange(a, d, seq([0, 0.49]))).toEqual({ move: SPAR.moves[0], p: 0.5, hit: false });
    expect(resolveExchange(a, d, seq([0.99, 0.5]))).toEqual({ move: SPAR.moves[2], p: 0.5, hit: true });
    expect(resolveExchange(a, d, seq([0.5, 0.9]))).toEqual({ move: SPAR.moves[1], p: 0.5, hit: true });
  });
  test('hit -> defender 勢 -1 and attacker keeps attacking; dodge -> swap', () => {
    const bout = startBout(F(100, 0, 0), F(100, 0, 0), 0);
    expect(boutView(bout).dots).toEqual([3, 3]);
    stepBout(bout, seq([0, 0.9])); // hit
    expect(boutView(bout).dots).toEqual([3, 2]);
    expect(bout.att).toBe(0);
    stepBout(bout, seq([0, 0.1])); // dodge
    expect(boutView(bout).dots).toEqual([3, 2]);
    expect(bout.att).toBe(1);
    stepBout(bout, seq([0, 0.9])); // b hits a
    expect(boutView(bout).dots).toEqual([2, 2]);
    expect(boutView(bout).ahead).toBeUndefined();
  });
  test('勢 reaching 0 -> that side yields; no more rounds', () => {
    const bout = startBout(F(100, 0, 0), F(100, 0, 0), 1);
    for (let i = 0; i < 3; i++) stepBout(bout, seq([0, 0.99]));
    const out = boutOutcome(bout);
    expect(out).toEqual({ done: true, winner: 1, rounds: 3, hits: [0, 3] });
    expect(stepBout(bout, seq([0, 0]))).toBeUndefined();
    expect(boutView(bout).dots).toEqual([0, 3]);
  });
  test('20-round cap -> draw (always dodging)', () => {
    const bout = startBout(F(100, 0, 0), F(100, 0, 0), 0);
    let n = 0;
    while (bout.winner === undefined) {
      stepBout(bout, seq([0, 0]));
      n++;
    }
    expect(n).toBe(SPAR.maxRounds);
    expect(SPAR.maxRounds).toBe(20);
    expect(boutOutcome(bout)).toEqual({ done: true, winner: 'draw', rounds: 20, hits: [0, 0] });
  });
  test('a draw can also come after hits on both sides', () => {
    // 每回合：擊中一次後閃開換手 -> 雙方各中幾下但都沒歸零
    const bout = startBout(F(100, 0, 1000), F(100, 0, 1000), 0); // 勢 7 對 7
    const r: number[] = [];
    for (let i = 0; i < 10; i++) r.push(0, 0.99, 0, 0.01);
    const rng = seq(r);
    while (bout.winner === undefined) stepBout(bout, rng);
    const out = boutOutcome(bout);
    expect(out.winner).toBe('draw');
    expect(out.rounds).toBe(20);
    expect(out.hits).toEqual([5, 5]);
  });
  test('first attacker coin uses one rng value', () => {
    expect(firstAttacker(seq([0.49]))).toBe(0);
    expect(firstAttacker(seq([0.5]))).toBe(1);
  });
});

describe('W6 spar: win rates (#558 驗收)', () => {
  const rate = (a: Fighter, b: Fighter, n: number, seed: number) => {
    const rng = makeRng(seed);
    let w = 0;
    let d = 0;
    for (let i = 0; i < n; i++) {
      const o = boutOutcome(runBout(a, b, rng));
      if (o.winner === 0) w++;
      if (o.winner === 'draw') d++;
    }
    return { win: w / n, draw: d / n };
  };
  test('coach vs beginner > 90% (both directions of who challenges)', () => {
    const coach = initialSkills('zhou-jiaotou');
    const aqing = initialSkills('a-qing');
    expect(rate(coach, aqing, 2000, 7).win).toBeGreaterThan(0.9);
    expect(1 - rate(aqing, coach, 2000, 7).win - rate(aqing, coach, 2000, 7).draw).toBeGreaterThan(0.9);
    // 阿青練到 30 日的程度（拳腳 ~160）仍打不過教頭
    expect(rate(F(160, 10, 60), coach, 2000, 8).win).toBeLessThan(0.1);
  });
  test('close (fist gap < 50, other skills equal) -> 40-60%', () => {
    for (const gap of [0, 10, 25, 40, 49]) {
      const r = rate(F(100, 50, 50), F(100 + gap, 50, 50), 4000, 11 + gap);
      expect(r.win).toBeGreaterThanOrEqual(0.4);
      expect(r.win).toBeLessThanOrEqual(0.6);
      const back = rate(F(100 + gap, 50, 50), F(100, 50, 50), 4000, 31 + gap);
      expect(back.win).toBeGreaterThanOrEqual(0.4);
      expect(back.win).toBeLessThanOrEqual(0.6);
    }
  });
  test('deterministic for a seed', () => {
    const a = runBout(F(120, 40, 60), F(150, 30, 40), makeRng(5));
    const b = runBout(F(120, 40, 60), F(150, 30, 40), makeRng(5));
    expect(a).toEqual(b);
  });
});

describe('W6 spar: narration templates and memories', () => {
  const names = (c: string) => ({ 'a-qing': '阿青', 'zhou-jiaotou': '周教頭', 'shi-hu': '石虎' })[c] ?? c;
  test('every template <= 30 chars and passes the W2 guard', () => {
    for (let id = 1; id <= 8; id++) {
      for (const rounds of [1, 4, 12, 20]) {
        for (const move of SPAR.moves) {
          const win = sparNarrationTemplate(id, { winner: 'zhou-jiaotou', loser: 'a-qing', a: 'a-qing', b: 'zhou-jiaotou', rounds, move }, names);
          const draw = sparNarrationTemplate(id, { a: 'a-qing', b: 'shi-hu', rounds, move }, names);
          for (const t of [win, draw]) expect(checkNarration(t)).toEqual({ ok: true, reasons: [] });
        }
      }
    }
  });
  test('narration guard rejects long or latin text', () => {
    expect(checkNarration('周教頭一拳收勢').ok).toBe(true);
    expect(checkNarration('周教頭一拳收勢，阿青退了三步，拱手認輸，院子裡的人都拍手叫好，連聲稱讚').ok).toBe(false);
    expect(checkNarration('周教頭 wins').ok).toBe(false);
  });
  test('Chinese numerals', () => {
    expect([1, 9, 10, 12, 20].map(zhNumber)).toEqual(['一', '九', '十', '十二', '二十']);
  });
  test('prompt states the rule-decided result', () => {
    const p = sparNarrationPrompt({ place: 'dojo', a: '阿青', b: '周教頭', winner: '周教頭', loser: '阿青', rounds: 4, move: '拳', spectators: [] });
    expect(p).toContain('周教頭贏，阿青認輸');
    expect(p).toContain('武館院子');
    expect(p).toContain('過了四招');
  });
  test('spar memories: remember returns the id; descriptions', () => {
    const m = initMindState();
    m.people.p1 = { cid: 'a-qing', memories: [], thoughts: [], places: [], trainMin: 0 };
    const id = remember(m, 'p1', 100, 'spar_lost', { other: 'zhou-jiaotou', place: 'dojo' });
    expect(id).toBe(1);
    expect(m.people.p1.memories[0]).toMatchObject({ id: 1, kind: 'spar_lost', other: 'zhou-jiaotou', weight: 1.5 });
    expect(describeMemory(m.people.p1.memories[0], names, () => '武館')).toBe('第 1 日 切磋輸給周教頭（武館）');
    const seen = { id: 2, t: 100, kind: 'spar_seen' as const, other: 'zhou-jiaotou', what: 'a-qing', n: 1, weight: 1 };
    expect(describeMemory(seen, names)).toBe('第 1 日 看到周教頭勝阿青');
    expect(describeMemory({ ...seen, n: 0 }, names)).toBe('第 1 日 看到周教頭與阿青打平');
    expect(remember(m, 'nobody', 100, 'spar_won')).toBeUndefined();
  });
});
