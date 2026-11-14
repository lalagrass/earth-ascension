// 武俠小鎮 W5（#557）：記憶、心念評估、心念的日程效果與邀請倍率的單元測試。
import {
  MIND,
  Memory,
  MindPerson,
  MindState,
  THOUGHTS,
  closedOverlays,
  describeMemory,
  evaluatePerson,
  inviteMultiplier,
  mindBlocks,
  thoughtsLine,
} from './data';
import { initMindState, remember } from './index';
import { blankMinutesPerDay, currentBlock, schedCtx, OBJECTS, ACTIVITY_BY_ID, SCHEDULES, SCHEDULE_OVERLAYS, inRange } from '../w03_life/data';
import type { WuxiaState } from '../state';
import { folkSystemPrompt } from '../w02_folk/prompt';

const DAY = 1440;
const mem = (id: number, t: number, kind: Memory['kind'], extra: Partial<Memory> = {}): Memory => ({
  id,
  t,
  kind,
  weight: 1,
  ...extra,
});
const person = (cid: string, memories: Memory[] = []): MindPerson => ({
  cid,
  memories,
  thoughts: [],
  places: [],
  trainMin: 0,
});
const world = (mind: MindState | undefined, dojoOpenedAt?: number, dojo = true): WuxiaState => ({
  v: 1,
  seed: 7,
  timeScale: 60,
  enabled: { 'w01-skin': true, 'w02-folk': true, 'w03-life': true, ...(dojo ? { 'w04-dojo': true } : {}), ...(mind ? { 'w05-mind': true } : {}) },
  rng: { s: 1 } as any,
  elements: { ...(mind ? { 'w05-mind': mind } : {}), ...(dojo ? { 'w04-dojo': { openedAt: dojoOpenedAt } } : {}) },
});

describe('thoughts.json', () => {
  test('#557 表格的五個心念都在，常數照規格', () => {
    // W7 刻意改變：#559 加第 6 個心念「想拜師」（requires w07-bond）；#557 的五個照舊在前、順序不變
    expect(THOUGHTS.map((t) => t.name)).toEqual(['想學武', '想變強', '想重開武館', '想回鄉', '想打聽', '想拜師']);
    expect(THOUGHTS.filter((t) => !t.requires).map((t) => t.name)).toEqual(['想學武', '想變強', '想重開武館', '想回鄉', '想打聽']);
    expect(MIND.memorySize).toBe(200);
    expect(MIND.decayPerDay).toBe(0.9);
    expect(MIND.maxPerPerson).toBe(3);
    expect(MIND.decay).toBe(20);
    expect(MIND.windowDays).toBe(7);
  });
  test('#562 W5-10：武館門口有「張望」，屬於 w05-mind（武館沒開也在）', () => {
    const gate = OBJECTS.find((o) => o.id === 'dojo-gate')!;
    expect(gate.element).toBe('w05-mind');
    expect(gate.activities.map((a) => a.id)).toContain('gaze_dojo');
    expect(OBJECTS.find((o) => o.id === 'gate-outlook')!.activities[0].id).toBe('gaze_home');
  });
  test('心念加的時段只放在留白，而且每人每天仍有 ≥ 2 小時留白（#562 W3-5）', () => {
    for (const def of THOUGHTS) {
      for (const [cid, s] of Object.entries(def.effects.schedule ?? {})) {
        for (const [mode, blocks] of Object.entries(s)) {
          const overlays = mode === 'dojoOpen' ? ['w04-dojo'] : [];
          for (const b of blocks ?? []) {
            for (const a of b.do) expect(ACTIVITY_BY_ID[a]).toBeDefined();
            for (let m = b.from; m < b.to; m++)
              expect(currentBlock(cid, m, { overlays, day: 1 })).toBeUndefined();
          }
        }
      }
    }
    // 全部心念同時成立的最壞情況
    const all = { blocks: {} as Record<string, any[]> };
    for (const def of THOUGHTS)
      for (const [cid, s] of Object.entries(def.effects.schedule ?? {}))
        (all.blocks[cid] ??= []).push(...(s.always ?? []), ...(s.dojoOpen ?? []));
    for (const cid of Object.keys(SCHEDULES))
      expect(blankMinutesPerDay(cid, { overlays: ['w04-dojo'], day: 1, blocks: all.blocks })).toBeGreaterThanOrEqual(120);
  });
});

describe('心念評估', () => {
  test('想學武：近 7 日聽書 ≥3 次＋拳腳 < 100 才出現；拳腳 ≥ 100 不出現', () => {
    const p = person('a-qing', [mem(1, 100, 'listen'), mem(2, 1600, 'listen')]);
    expect(evaluatePerson(p, { gm: 2 * DAY, skills: { fist: 20 } }, 3)).toEqual([]);
    p.memories.push(mem(3, 2 * DAY + 900, 'listen'));
    const ch = evaluatePerson(p, { gm: 3 * DAY, skills: { fist: 20 } }, 4);
    expect(ch).toEqual([{ cid: 'a-qing', thought: '想學武', kind: 'appear', s: 40 }]);
    expect(p.thoughts[0].causes.sort()).toEqual([1, 2, 3]);
    const q = person('a-qing', [mem(1, 100, 'listen'), mem(2, 1600, 'listen'), mem(3, 2000, 'listen')]);
    expect(evaluatePerson(q, { gm: 3 * DAY, skills: { fist: 120 } }, 4)).toEqual([]);
  });
  test('7 日以外的記憶不算；條件不成立每日 −20，到 0 消失', () => {
    // 用石虎（阿青還有「想回鄉」會干擾）
    const p = person('shi-hu', [mem(1, 100, 'listen'), mem(2, 200, 'listen'), mem(3, 300, 'listen')]);
    evaluatePerson(p, { gm: DAY, skills: { fist: 0 } }, 2);
    expect(p.thoughts[0].s).toBe(40);
    evaluatePerson(p, { gm: 2 * DAY, skills: { fist: 0 } }, 3);
    expect(p.thoughts[0].s).toBe(55);
    const kinds: string[] = [];
    for (let d = 9; d <= 12; d++) kinds.push(...evaluatePerson(p, { gm: d * DAY, skills: { fist: 0 } }, d).map((c) => `${c.kind}${c.s}`));
    expect(kinds).toEqual(['fade35', 'fade15', 'vanish0']);
    expect(p.thoughts).toEqual([]);
  });
  test('每人最多 3 個心念（留強的）', () => {
    const p = person('a-qing');
    p.thoughts = [
      { id: 'learn', s: 90, since: 1, causes: [] },
      { id: 'stronger', s: 80, since: 1, causes: [] },
      { id: 'homesick', s: 70, since: 1, causes: [] },
    ];
    p.memories = [mem(1, 100, 'listen'), mem(2, 200, 'listen'), mem(3, 300, 'listen'), mem(4, 400, 'tier_up')];
    evaluatePerson(p, { gm: 2 * DAY, skills: { fist: 0 } }, 3);
    expect(p.thoughts.length).toBeLessThanOrEqual(3);
  });
  test('想重開武館只看周教頭；有人在武館外徘徊 ≥ 2 次', () => {
    const coach = person('zhou-jiaotou', [mem(1, 500, 'loiter_seen', { other: 'a-qing' })]);
    expect(evaluatePerson(coach, { gm: DAY }, 2)).toEqual([]);
    coach.memories.push(mem(2, DAY + 500, 'loiter_seen', { other: 'a-qing' }));
    expect(evaluatePerson(coach, { gm: 2 * DAY }, 3).map((c) => c.thought)).toEqual(['想重開武館']);
    const other = person('shi-hu', [...coach.memories]);
    expect(evaluatePerson(other, { gm: 2 * DAY, skills: { fist: 0 } }, 3).map((c) => c.thought)).not.toContain('想重開武館');
  });
  test('想回鄉：阿青連續 5 日沒聊天', () => {
    const p = person('a-qing', [mem(1, 100, 'talk', { other: 'lin-sao' })]);
    expect(evaluatePerson(p, { gm: 4 * DAY, skills: { fist: 0 } }, 5)).toEqual([]);
    expect(evaluatePerson(p, { gm: 5 * DAY + 100, skills: { fist: 0 } }, 6).map((c) => c.thought)).toEqual(['想回鄉']);
  });
  test('想打聽：林嫂在有新人到鎮時', () => {
    const p = person('lin-sao', [mem(1, 3000, 'newcomer', { other: 'x' })]);
    expect(evaluatePerson(p, { gm: 3 * DAY }, 4).map((c) => c.thought)).toEqual(['想打聽']);
  });
});

describe('記憶', () => {
  test('環形 200 筆、id 遞增；--drop-memory 的 id 不寫入但照樣佔號', () => {
    const s = initMindState();
    s.people.p = person('a-qing');
    s.drop = [3];
    for (let i = 0; i < 205; i++) remember(s, 'p', i, 'first_visit', { place: `x${i}` });
    expect(s.people.p.memories.length).toBe(200);
    expect(s.people.p.memories.some((m) => m.id === 3)).toBe(false);
    expect(s.seq).toBe(206);
  });
  test('聽書同一遊戲日併成一筆；丟掉的那天整天不記', () => {
    const s = initMindState();
    s.people.p = person('a-qing');
    remember(s, 'p', 700, 'listen');
    remember(s, 'p', 800, 'listen');
    remember(s, 'p', DAY + 700, 'listen');
    expect(s.people.p.memories.map((m) => [m.id, m.n ?? 1])).toEqual([[1, 2], [2, 1]]);
    const d = initMindState();
    d.people.p = person('a-qing');
    d.drop = [1];
    remember(d, 'p', 700, 'listen');
    remember(d, 'p', 800, 'listen');
    remember(d, 'p', DAY + 700, 'listen');
    expect(d.people.p.memories.map((m) => m.id)).toEqual([2]);
  });
  test('說明文字', () => {
    expect(describeMemory(mem(1, 900, 'listen', { place: 'teahouse', n: 2 }), (c) => c, () => '茶館')).toBe('第 1 日 聽書 2 場（茶館）');
    expect(describeMemory(mem(1, DAY, 'loiter_seen', { other: 'a-qing', place: 'dojo-gate' }), () => '阿青', () => '武館門口')).toBe(
      '第 2 日 阿青在武館外徘徊（武館門口）',
    );
  });
});

describe('心念的效果', () => {
  const withThought = (cid: string, id: string): MindState => {
    const s = initMindState();
    s.people.p = { ...person(cid), thoughts: [{ id, s: 50, since: 1, causes: [] }] };
    return s;
  };
  test('w05-mind 關閉：沒有額外時段、不擋武館覆蓋、倍率 1（跟 W4 相同）', () => {
    const w = world(undefined, 0);
    expect(mindBlocks(w)).toBeUndefined();
    expect(closedOverlays(w)).toBeUndefined();
    expect(inviteMultiplier(undefined, 'p', 'zhou-jiaotou', false)).toBe(1);
  });
  test('武館沒開：w04-dojo 的日程覆蓋不生效，想學武的阿青去武館門口張望', () => {
    const w = world(withThought('a-qing', 'learn'));
    expect(closedOverlays(w)).toEqual(['w04-dojo']);
    const ctx = schedCtx(w.enabled, 3, { blocks: mindBlocks(w), closed: closedOverlays(w) });
    expect(currentBlock('zhou-jiaotou', 9 * 60, ctx)?.do).toEqual(['drink_tea']);
    expect(currentBlock('a-qing', 630, ctx)?.do).toContain('gaze_dojo');
  });
  test('武館開了：周教頭辰–午武館，想學武的阿青加練', () => {
    const w = world(withThought('a-qing', 'learn'), 100);
    const ctx = schedCtx(w.enabled, 3, { blocks: mindBlocks(w), closed: closedOverlays(w) });
    expect(currentBlock('zhou-jiaotou', 9 * 60, ctx)?.do).toEqual(['coach']);
    expect(currentBlock('a-qing', 630, ctx)?.do).toEqual(['hit_dummy', 'hit_sandbag']);
    expect(currentBlock('a-qing', 8 * 60, ctx)?.do).toEqual(['hit_dummy']);
  });
  test('W6: stronger adds 1 hour right after the dojo training (10-11 alone, 11-12 when learn holds 10-11)', () => {
    const alone = world(withThought('a-qing', 'stronger'), 100);
    const ctxA = schedCtx(alone.enabled, 3, { blocks: mindBlocks(alone), closed: closedOverlays(alone) });
    expect(currentBlock('a-qing', 630, ctxA)?.label).toBe('武館加練（想變強）');
    expect(currentBlock('a-qing', 690, ctxA)).toBeUndefined();
    const m = withThought('a-qing', 'learn');
    m.people.p.thoughts.push({ id: 'stronger', s: 50, since: 1, causes: [] });
    const both = world(m, 100);
    const ctxB = schedCtx(both.enabled, 3, { blocks: mindBlocks(both), closed: closedOverlays(both) });
    expect(currentBlock('a-qing', 630, ctxB)?.do).toEqual(['hit_dummy', 'hit_sandbag']);
    expect(currentBlock('a-qing', 690, ctxB)?.label).toBe('武館加練（想變強）');
    expect(mindBlocks(both)!['a-qing'].length).toBe(2);
  });
  test('想學武：對周教頭邀請機率 ×2；其他人 ×1', () => {
    const m = withThought('a-qing', 'learn');
    expect(inviteMultiplier(m, 'p', 'zhou-jiaotou', false)).toBe(2);
    expect(inviteMultiplier(m, 'p', 'lin-sao', false)).toBe(1);
  });
  test('對話 prompt 的心事', () => {
    const w = world(withThought('a-qing', 'learn'));
    expect(thoughtsLine(w, 'p')).toBe('想學武（強度 50）');
    expect(thoughtsLine(w, 'q')).toBeUndefined();
    expect(thoughtsLine(world(undefined), 'p')).toBeUndefined();
  });
});

describe('跟 LLM 的接法', () => {
  const base = {
    stage: 'start' as const,
    player: { name: '阿青' },
    otherPlayer: { name: '周教頭' },
    agent: null,
    otherAgent: null,
    hasMemories: false,
    memoryWithOtherPlayer: false,
  };
  test('有心念時 prompt 多一句「你最近的心事」；沒有時跟 W4 相同', () => {
    const withT = folkSystemPrompt({ ...base, thoughts: '想學武（強度 70）' });
    expect(withT).toContain('你最近的心事：想學武（強度 70）');
    expect(folkSystemPrompt(base)).not.toContain('心事');
    expect(folkSystemPrompt({ ...base, thoughts: undefined })).toBe(folkSystemPrompt(base));
  });
});
