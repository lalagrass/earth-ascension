// 武俠小鎮 A1（#564）的 A 類核心測試（#563 輕量驗收：最多 5 個）。
import { LocalCore } from '../../src/wuxia/engine/core';
import { loadSave } from '../../src/wuxia/engine/save';
import { runHeadless } from './headless';
import { auditAll, auditJson } from './const-audit';
import { repeatFactor, type Person } from '../../convex/wuxia/w03_life';
import { contributions, initBondState } from '../../convex/wuxia/w07_bond/data';
import type { Memory, MindPerson } from '../../convex/wuxia/w05_mind/data';
import { quietConsole } from './sim';

quietConsole(false);
const STEPS = 240;
const reference = runHeadless({ seed: 7, minutes: STEPS / 60 }).finalHash;

function runAt(speed: 0 | 1 | 4 | 16 | 64) {
  const core = new LocalCore();
  core.init({ kind: 'new', world: { seed: 7 } });
  core.autoSlow = false;
  if (speed === 0) core.advance(STEPS);
  else {
    core.setSpeed(speed);
    while (core.session.k < STEPS) {
      if ((16 / 1000) * speed > STEPS - core.session.k) core.advance(STEPS - core.session.k);
      else core.frame(16);
    }
  }
  return core;
}

describe('A1 單機引擎與第一系列修補', () => {
  test('A2 單機 LocalCore 直接跑／1×／16×／64× 的 hash 都等於無頭（倍速不改變結果）', () => {
    for (const s of [0, 1, 16, 64] as const) expect(runAt(s).hash()).toBe(reference);
  });

  test('A3 存檔（JSON 來回）→ 讀檔 → 續跑 ＝ 不中斷；規則版本不同的存檔被拒絕並說明', () => {
    const core = new LocalCore();
    core.init({ kind: 'new', world: { seed: 7 } });
    core.advance(STEPS / 2);
    const file = JSON.parse(JSON.stringify(core.save('t')));
    const again = new LocalCore();
    expect(again.init({ kind: 'load', save: file })).toEqual({ ok: true });
    again.advance(STEPS / 2);
    expect(again.hash()).toBe(reference);
    const r = loadSave({ ...file, ruleVersion: 'w9-0' });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/規則版本/);
  });

  test('A5 常數盤點：data/wuxia/*.json 每個數值都有 _src；沒有的會被抓出來', () => {
    expect(auditAll().issues).toEqual([]);
    expect(auditJson('x.json', { a: 1, b: 2, b_src: '旋鈕：測試', c: { d: [3] }, c_src: '亂寫' }).map((i) => i.path).sort()).toEqual(['.c_src', 'a', 'c.d[0]']);
  });

  test('a1-base：同一活動連做超過 3 次日程權重遞減（第 4 次 ×0.5、第 5 次 ×0.25），睡覺與別的活動不受影響', () => {
    const p = { cid: 'lin-sao', home: 'teahouse', needs: {} as any, blockDone: [] } as Person;
    expect(repeatFactor(p, 'brew_tea')).toBe(1);
    p.streak = ['brew_tea', 2];
    expect(repeatFactor(p, 'brew_tea')).toBe(1);
    p.streak = ['brew_tea', 3];
    expect(repeatFactor(p, 'brew_tea')).toBe(0.5);
    p.streak = ['brew_tea', 4];
    expect(repeatFactor(p, 'brew_tea')).toBe(0.25);
    expect(repeatFactor(p, 'drink_tea')).toBe(1);
    p.streak = ['sleep', 6];
    expect(repeatFactor(p, 'sleep')).toBe(1);
  });

  test('a1-base：師父對同一徒弟的「徒弟違規」每遊戲日最多算一次（關閉時照舊每筆都算）', () => {
    const mem = (id: number, t: number): Memory => ({ id, t, kind: 'disciple_violated', weight: 1, other: 'a-qing' }) as Memory;
    const p = { cid: 'zhou-jiaotou', memories: [mem(1, 100), mem(2, 200), mem(3, 1440 + 100)], thoughts: [], places: [], trainMin: 0 } as MindPerson;
    const respect = (on: boolean) => {
      const st = initBondState();
      if (on) st.violationPerDay = 1;
      return contributions(p, 'zhou-jiaotou', 'a-qing', 1440 + 200, st).filter((c) => c.memory).length;
    };
    expect(respect(false)).toBe(3);
    expect(respect(true)).toBe(2);
  });
});
