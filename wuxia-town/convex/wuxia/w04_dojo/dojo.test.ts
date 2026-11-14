// 武俠小鎮 W4（#556）：武館、技能、日程覆蓋的單元測試。
import {
  ACTIVITY_BY_ID,
  NEEDS_CONFIG,
  OBJECTS,
  SCHEDULES,
  activeObjects,
  blankMinutesPerDay,
  currentBlock,
  schedCtx,
} from '../w03_life/data';
import { Person, allowed, chooseNext, initLifeState } from '../w03_life';
import { FOLK_CHARACTERS } from '../w02_folk';
import { makeRng } from '../rng';
import {
  SKILL_KEYS,
  TRAINING,
  dummyLabel,
  gainPerMinute,
  initialSkills,
  strikesPerMinute,
  tierOf,
} from './data';

const ON = { 'w01-skin': true, 'w02-folk': true, 'w03-life': true, 'w04-dojo': true };
const OFF = { 'w01-skin': true, 'w02-folk': true, 'w03-life': true };

const person = (cid: string, needs: Partial<Person['needs']> = {}): Person => ({
  cid,
  home: FOLK_CHARACTERS.find((c) => c.id === cid)!.home,
  needs: { hunger: 30, fatigue: 30, boredom: 30, chore: 30, ...needs },
  blockDone: [],
});

describe('w04-dojo 物件', () => {
  test('#556 武館物件：木人樁×2、石鎖×2、梅花樁×1、教頭位（限周教頭）、沙袋×1，都在武館', () => {
    const dojo = OBJECTS.filter((o) => o.element === 'w04-dojo');
    const cap = (act: string) =>
      dojo.filter((o) => o.activities.some((a) => a.id === act)).reduce((n, o) => n + o.capacity, 0);
    expect(cap('hit_dummy')).toBe(2);
    expect(cap('lift_stone')).toBe(2);
    expect(cap('stand_post')).toBe(1);
    expect(cap('coach')).toBe(1);
    expect(cap('hit_sandbag')).toBe(1);
    for (const o of dojo) expect(o.place).toBe('dojo');
    expect(ACTIVITY_BY_ID.coach.roles).toEqual(['zhou-jiaotou']);
  });
  test('關掉 w04-dojo：世界裡沒有武館物件（res 跟 W3 相同）', () => {
    expect(Object.keys(initLifeState(OFF).res)).toEqual(
      OBJECTS.filter((o) => !o.element).map((o) => o.id),
    );
    expect(Object.keys(initLifeState(ON).res).length).toBe(activeObjects(ON).length);
    expect(activeObjects(ON).length).toBeGreaterThan(activeObjects(OFF).length);
  });
  test('練功只在日程排到時做（其他人不練）', () => {
    const state = initLifeState(ON);
    const dummy = OBJECTS.find((o) => o.id === 'dummies')!;
    const hit = ACTIVITY_BY_ID.hit_dummy;
    const ctx1 = schedCtx(ON, 1);
    // 阿青 08:00 在練功時段
    expect(allowed(person('a-qing'), dummy, hit, 480, state, ctx1)).toBe(true);
    // 阿青留白時段（10:30）不練
    expect(allowed(person('a-qing'), dummy, hit, 630, state, ctx1)).toBe(false);
    // 其他人（林嫂）不在 roles
    expect(allowed(person('lin-sao'), dummy, hit, 480, state, ctx1)).toBe(false);
  });
});

describe('w04-dojo 日程', () => {
  test('周教頭重開後「辰–午 武館」（07:00–12:00 指點）；關掉時是 W3 的茶館', () => {
    expect(currentBlock('zhou-jiaotou', 9 * 60, schedCtx(ON, 1))?.do).toEqual(['coach']);
    expect(currentBlock('zhou-jiaotou', 9 * 60, schedCtx(OFF, 1))?.do).toEqual(['drink_tea']);
    expect(currentBlock('zhou-jiaotou', 9 * 60)?.do).toEqual(['drink_tea']);
  });
  test('阿青有練功時段；石虎每兩天一次舉石鎖', () => {
    expect(currentBlock('a-qing', 9 * 60, schedCtx(ON, 1))?.do).toEqual(['hit_dummy']);
    expect(currentBlock('shi-hu', 960, schedCtx(ON, 1))?.do).toEqual(['lift_stone']);
    expect(currentBlock('shi-hu', 960, schedCtx(ON, 2))?.do).toEqual(['smith']);
    expect(currentBlock('shi-hu', 960, schedCtx(ON, 3))?.do).toEqual(['lift_stone']);
    let lifts = 0;
    for (let d = 1; d <= 30; d++) if (currentBlock('shi-hu', 960, schedCtx(ON, d))?.do[0] === 'lift_stone') lifts++;
    expect(lifts).toBe(15);
  });
  test('#562 W3-5 仍成立：開 w04-dojo 時每人每天至少 2 小時留白', () => {
    for (const cid of Object.keys(SCHEDULES)) {
      for (const day of [1, 2]) expect(blankMinutesPerDay(cid, schedCtx(ON, day))).toBeGreaterThanOrEqual(120);
    }
  });
  test('時段內周教頭選指點、阿青選打樁', () => {
    const state = initLifeState(ON);
    const r = makeRng(1);
    expect(chooseNext(person('zhou-jiaotou'), 480, '1:420', state, r, schedCtx(ON, 1))?.act).toBe('coach');
    expect(chooseNext(person('a-qing'), 480, '1:450', state, r, schedCtx(ON, 1))?.act).toBe('hit_dummy');
  });
});

describe('w04-dojo 技能', () => {
  test('#562 W4-7 起始技能值', () => {
    expect(initialSkills('zhou-jiaotou')).toEqual({ fist: 620, power: 480, stance: 600, stamina: 450 });
    const shi = initialSkills('shi-hu');
    expect(shi.power).toBe(420);
    for (const k of SKILL_KEYS) if (k !== 'power') expect(shi[k]).toBeLessThanOrEqual(80);
    for (const k of SKILL_KEYS) expect(initialSkills('a-qing')[k]).toBeLessThanOrEqual(30);
    for (const cid of ['lin-sao', 'he-langzhong', 'lao-han'])
      for (const k of SKILL_KEYS) expect(initialSkills(cid)[k]).toBeLessThanOrEqual(20);
    // W6「教頭對新手勝率 > 90%」、W7「技能高 200 以上才拜師」的前提
    expect(initialSkills('zhou-jiaotou').fist - 180).toBeGreaterThanOrEqual(200);
  });
  test('#556 公式：gain = base × (1 − level/1000)^2 × 教頭加成；累 > 80 減半', () => {
    const b = TRAINING.base;
    expect(gainPerMinute('hit_dummy', 'fist', 0, false, 0)).toBeCloseTo(b, 10);
    expect(gainPerMinute('hit_dummy', 'fist', 500, false, 0)).toBeCloseTo(b * 0.25, 10);
    expect(gainPerMinute('hit_dummy', 'fist', 500, true, 0)).toBeCloseTo(b * 0.25 * 1.5, 10);
    expect(gainPerMinute('hit_dummy', 'fist', 500, true, 81)).toBeCloseTo(b * 0.25 * 1.5 * 0.5, 10);
    expect(gainPerMinute('hit_dummy', 'fist', 500, true, 80)).toBeCloseTo(b * 0.25 * 1.5, 10);
    expect(gainPerMinute('hit_dummy', 'fist', 1000, true, 0)).toBe(0);
    expect(gainPerMinute('coach', 'fist', 0, false, 0)).toBe(0);
  });
  test('#556 emoji 四階、打樁數 5 + fist/40', () => {
    expect(tierOf(0).emoji).toBe('🤛');
    expect(tierOf(150).emoji).toBe('👊');
    expect(tierOf(450).emoji).toBe('💥');
    expect(tierOf(620).emoji).toBe('⚡');
    expect(tierOf(150).name).toBe('入門');
    expect(tierOf(450).name).toBe('熟練');
    expect(strikesPerMinute(0)).toBe(5);
    expect(strikesPerMinute(150)).toBe(8);
    expect(strikesPerMinute(620)).toBe(20);
    expect(dummyLabel(150)).toBe('打樁 8下/分');
  });
  test('#562 W4-8：training.json、needs.json 每個數值都有 _src（量測／推導／旋鈕）', () => {
    for (const json of [TRAINING as any, NEEDS_CONFIG as any]) {
      for (const [k, v] of Object.entries(json)) {
        if (k.startsWith('_') || k.endsWith('_src')) continue;
        if (typeof v === 'string') continue;
        const src = json[`${k}_src`];
        expect(typeof src).toBe('string');
        expect(/^(量測|推導|旋鈕)/.test(src)).toBe(true);
      }
    }
  });
});
