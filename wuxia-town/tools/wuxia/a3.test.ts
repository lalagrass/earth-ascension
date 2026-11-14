// 武俠小鎮 A3（#574）的核心測試（五條：驗收 A 四項＋B 類；C 類只在 wuxia:social-report 報告）。
import { runHeadless } from './headless';
import { quietConsole } from './sim';
import { LLM_OPS } from './social-run';
import { stateHash } from '../../convex/wuxia/hash';
import { GRAMMAR, renderSocial } from '../../convex/wuxia/a3_silent/grammar';
import { INTERACTIONS, traitsOf } from '../../convex/wuxia/a3_silent/data';
import type { A3State } from '../../convex/wuxia/a3_silent/data';
import type { MindState } from '../../convex/wuxia/w05_mind/data';
import { translateEntry } from '../../src/wuxia/a3';

quietConsole(false);

// 一局 9 遊戲日（預設設定，a3-silent 開）；大師第 1 日進鎮，請教／指點／教都會發生
const run = runHeadless({ seed: 7, minutes: 1, untilGameMinute: 14 * 1440, arriveDay: 1 }); // A7：要付束脩或做工才被教，第一筆教在第 10 日，9 日改 14 日（DEVIATIONS A7-13）
const w = run.game.world.wuxia!;
const st = w.elements['a3-silent'] as A3State;
const mind = w.elements['w05-mind'] as MindState;
const name = (c: string) => c;

describe('A3 無言互動', () => {
  test('A：預設 0 次 LLM、0 場 AI Town 對話；「翻成一句話」開不開 LLM，世界 hash 不變', async () => {
    for (const op of LLM_OPS) expect(run.summary.stats.operations[op] ?? 0).toBe(0);
    expect(run.summary.stats.conversationsStarted ?? 0).toBe(0);
    expect(st.log.length).toBeGreaterThan(100);
    const before = stateHash(run.game.world.serialize());
    const llm = async (p: string) => `（假 LLM）${p.length}`;
    for (const e of st.log.slice(-30)) {
      await translateEntry(e, st, llm);
      await translateEntry(e, st);
    }
    expect(stateHash(run.game.world.serialize())).toBe(before);
    expect(before).toBe(run.finalHash);
  });

  test('A：每一筆關係變化都追得到互動 id（log 的 bond 效果 ↔ W5 social 記憶 n）', () => {
    const memById = new Map<number, { owner: string; m: any }>();
    for (const p of Object.values(mind.people)) for (const m of p.memories) memById.set(m.id, { owner: p.cid, m });
    const logIds = new Set(st.log.map((e) => e.id));
    let checked = 0;
    for (const e of st.log) {
      for (const fx of e.effects) {
        if (fx.k !== 'bond') continue;
        expect(fx.mem).toBeDefined();
        const hit = memById.get(fx.mem!);
        if (!hit) continue; // 記憶環 200 筆，舊的可能已擠掉
        expect(hit.owner).toBe(fx.who);
        expect(hit.m.kind).toBe('social');
        expect(hit.m.n).toBe(e.id);
        expect(hit.m.what).toMatch(new RegExp(`^${e.kind}\\.${e.ok ? 'ok' : 'fail'}\\.[ab]$`));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(50);
    // 反過來：記憶裡每筆 social 都對得到紀錄（紀錄環 1000 筆內的）
    const firstLog = st.log[0].id;
    for (const { m } of memById.values()) if (m.kind === 'social' && m.n >= firstLog) expect(logIds.has(m.n)).toBe(true);
  });

  test('A：鎮上動靜每種互動×成敗至少 4 句，同一句型不連續超過 2 次', () => {
    for (const def of INTERACTIONS) {
      expect(GRAMMAR.forms[def.id].ok.length).toBeGreaterThanOrEqual(4);
      expect(GRAMMAR.forms[def.id].fail.length).toBeGreaterThanOrEqual(4);
    }
    const lines = renderSocial(st.log, name, (c) => traitsOf(st, c));
    expect(lines.length).toBe(st.log.length);
    let run3 = 0;
    for (let i = 2; i < lines.length; i++) if (lines[i].form === lines[i - 1].form && lines[i].form === lines[i - 2].form) run3++;
    expect(run3).toBe(0);
    // 最壞情況：同一筆紀錄連續 5 次
    const same = Array.from({ length: 5 }, () => st.log[0]);
    const r = renderSocial(same, name, (c) => traitsOf(st, c)).map((x) => x.form);
    for (let i = 2; i < r.length; i++) expect(r[i] === r[i - 1] && r[i] === r[i - 2]).toBe(false);
  });

  test('B：成敗＝logistic＋game.rng()，實測成功次數落在公式的 99.9% 信賴區間', () => {
    let kinds = 0;
    for (const [kind, s] of Object.entries(st.stats)) {
      if (s.n < 20 || s.pVar <= 0) continue;
      kinds++;
      const z = (s.ok - s.pSum) / Math.sqrt(s.pVar);
      expect([kind, Math.abs(z) <= 3.29]).toEqual([kind, true]);
    }
    expect(kinds).toBeGreaterThanOrEqual(4);
  });

  test('A：請教成功＝指點的入口；A2 的教只發生在指點時段的師生之間', () => {
    const a2 = w.elements['a2-master'] as any;
    const instructs = st.log.filter((e) => e.kind === 'instruct' && e.ok);
    expect(st.log.some((e) => e.kind === 'instruct' && e.cause !== undefined && st.log.find((x) => x.id === e.cause)?.kind === 'ask_advice')).toBe(true);
    const teaches = a2.records.filter((r: any) => r.via === 'teach' && r.gm >= st.log[0].t);
    expect(teaches.length).toBeGreaterThan(0);
    for (const r of teaches) {
      // 這次教之前 90 分鐘內有開過以 from 為老師、to 在學生名單的指點
      const ok = instructs.some(
        (e) => e.a === r.from && (e.b === r.to || e.with?.includes(r.to)) && e.t <= r.gm && r.gm - e.t <= 90,
      ) || st.log.some((e) => e.kind === 'ask_advice' && e.ok && e.a === r.to && e.b === r.from && e.t <= r.gm && r.gm - e.t <= 90);
      expect([r.from, r.to, r.gm, ok]).toEqual([r.from, r.to, r.gm, true]);
    }
  });
});
