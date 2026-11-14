// 武俠小鎮 A4（#576）的核心測試（五條，驗收 A1–A6 挑最核心的；C 類只在 wuxia:scenario-report 報告）。
import { readFileSync } from 'node:fs';
import { runPlay, PlayScript } from './a4-play';
import { createGame, quietConsole, runOneStep, selectInputs } from './sim';
import { Session } from '../../src/wuxia/engine/session';
import { buildCard, cardSvg } from '../../src/wuxia/a4card';
import { gameMinutes, readClock } from '../../convex/wuxia/clock';
import { lifeSchedCtx } from '../../convex/wuxia/w03_life/data';
import { chooseNext } from '../../convex/wuxia/w03_life';
import type { LifeState } from '../../convex/wuxia/w03_life';
import { A4_PLAY, A4State, PLAY, SCENARIO_BY_ID, TIERS, evalGoals, intervene } from '../../convex/wuxia/a4_play';
import type { A2State } from '../../convex/wuxia/a2_master/data';
import type { SparState } from '../../convex/wuxia/w06_spar/data';
import type { JianghuState } from '../../convex/wuxia/w08_jianghu/data';
import type { MindState } from '../../convex/wuxia/w05_mind/data';

quietConsole(false);

const script = JSON.parse(readFileSync('docs/wuxia/fixtures/a4-a1.json', 'utf8')) as PlayScript;
// 劇本一，9 日（A5 以前 7 日；A6 的教學較慢、銅級要到第 8 日，見 DEVIATIONS A6-7），五種干預各一次（指路、引薦、接濟、說情、傳話）
const A = runPlay(script, 7, { days: 9 });
const wA = A.run.game.world.wuxia!;
const stA = wA.elements[A4_PLAY] as A4State;

describe('A4 玩家的位置（#576）', () => {
  test('A1＋A4：干預都是 input；同腳本同 seed 兩次 hash 相同；journal 重播相符；目標達成日可由重播重算', () => {
    expect(A.report.outcomes.filter((o) => o.ok).map((o) => o.kind).sort()).toEqual(['feed', 'guide', 'intro', 'plead', 'whisper']);
    expect(A.run.queue.filter((i) => i.name === 'wuxiaIntervene').length).toBe(A.report.outcomes.length);
    // 引薦真的促成了一次 A3 互動（由 A 發起）
    expect(stA.used.find((u) => u.kind === 'intro')?.social).toBeDefined();
    const B = runPlay(script, 7, { days: 9 });
    expect(B.run.finalHash).toBe(A.run.finalHash);
    // 重播：只用快照＋journal 裡的 input（JSON 來回一次，跟寫檔一樣），checkpoint 逐一比對；每次換日用同一個純函式重算目標
    const j = JSON.parse(JSON.stringify({ snapshot: A.run.snapshot, inputs: A.run.queue, steps: A.run.steps }));
    const game = createGame(j.snapshot);
    game.wuxiaRecordHistory = false; // 跟 Session 一樣（畫面用的位置緩衝，不進 hash）
    const sc = SCENARIO_BY_ID['s1'];
    const recomputed: Record<string, number> = {};
    let day = 0;
    let checked = 0;
    for (const step of j.steps) {
      game.engine.generationNumber = step.generation;
      game.engine.currentTime = step.prevTime;
      const r = runOneStep(game, selectInputs(game, j.inputs, step.inputsThrough ?? game.engine.processedInputNumber ?? -1), step.now, { hash: false, light: true });
      if (step.hash) {
        expect(game.wuxiaHash()).toBe(step.hash);
        checked++;
      }
      void r;
      const w = game.world.wuxia!;
      if (w.clockEpoch === undefined) continue;
      const d = readClock(gameMinutes(game.engine.currentTime!, w.clockEpoch, w.timeScale)).day;
      if (d !== day) {
        if (day > 0 && day <= 9) {
          const g = evalGoals(w, sc, recomputed);
          for (const t of TIERS) if (g[t].ok && recomputed[t] === undefined) recomputed[t] = day;
        }
        day = d;
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(game.wuxiaHash()).toBe(A.run.finalHash);
    expect(recomputed).toEqual(stA.goals);
    expect(Object.keys(stA.goals).length).toBeGreaterThan(0);
  });

  test('A2：干預只改處境——被指路的人餓 > 90 時不會去，不餓時會去', () => {
    const w = structuredClone(wA);
    const life = w.elements['w03-life'] as LifeState;
    const st = w.elements[A4_PLAY] as A4State;
    st.ended = undefined;
    const pid = Object.keys(life.people).find((p) => life.people[p].cid === 'a-qing')!;
    const person = life.people[pid];
    const day = readClock(life.minute).day;
    st.blocks = { 'a-qing': [{ day, iv: 99, from: PLAY.guide.from, to: PLAY.guide.to, label: '有人指路', do: ['watch_form'] }] };
    const ctx = lifeSchedCtx(w, day);
    // 不餓＝剛吃過（5 分鐘前）；餓 > 90＝5 小時沒吃
    const pick = (hunger: number) => {
      person.needs = { ...person.needs, hunger, fatigue: 10, boredom: 10 };
      person.blockKey = undefined;
      person.blockDone = [];
      person.lastDone = { ...(person.lastDone ?? {}), eat: life.minute - (hunger > 90 ? 300 : 5) };
      return chooseNext(person, PLAY.guide.from + 5, 'k', life, () => 0.5, ctx)?.act;
    };
    expect(pick(10)).toBe('watch_form');
    const hungry = pick(95);
    expect(hungry).not.toBe('watch_form');
    expect(['eat', 'cook', 'draw_water', 'chop_bamboo']).toContain(hungry);
    // 關掉 a4-play：同一份狀態沒有指路時段
    w.enabled[A4_PLAY] = false;
    expect(lifeSchedCtx(w, day).blocks?.['a-qing']?.some((b) => b.label === '有人指路') ?? false).toBe(false);
  });

  test('A3：緣分點不超過 3、不變負，不夠時拒絕且不扣；同一對人說情第二次被拒', () => {
    const s = Session.fresh({ seed: 7, play: 's1' });
    const st = () => s.game.world.wuxia!.elements[A4_PLAY] as A4State;
    let max = 0;
    const until = (gm: number) => {
      while (s.gameMinute() < gm) {
        s.step([]);
        const y = st()?.yuan ?? 0;
        expect(y).toBeGreaterThanOrEqual(0);
        max = Math.max(max, y);
      }
    };
    until(8 * 60);
    expect(intervene(s.game, s.game.engine.currentTime!, { kind: 'guide', target: 'a-qing', place: 'plaza' }).ok).toBe(true);
    expect(st().yuan).toBe(0);
    const r = intervene(s.game, s.game.engine.currentTime!, { kind: 'guide', target: 'a-niu', place: 'plaza' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/緣不夠/);
    expect(st().yuan).toBe(0);
    until(5 * 1440);
    expect(max).toBe(PLAY.yuan.max);
    expect(st().yuan).toBe(PLAY.yuan.max);
    expect(intervene(s.game, s.game.engine.currentTime!, { kind: 'plead', target: 'a-qing' }).ok).toBe(true);
    const seq = st().seq;
    const again = intervene(s.game, s.game.engine.currentTime!, { kind: 'plead', target: 'a-qing' });
    expect(again.ok).toBe(false);
    expect(again.reason).toMatch(/只能說情一次/);
    expect(st().yuan).toBe(PLAY.yuan.max - PLAY.costs.plead);
    expect(st().seq).toBe(seq);
    // 說情寫在師父的記憶裡（W7 由記憶重算親近）；被干預的人有「有人…」記憶
    const mind = s.game.world.wuxia!.elements['w05-mind'] as MindState;
    expect(Object.values(mind.people).some((p) => p.memories.some((m) => m.kind === 'pleaded' && m.other === 'a-qing'))).toBe(true);
    expect(Object.values(mind.people).find((p) => p.cid === 'a-qing')!.memories.filter((m) => m.kind === 'fate').length).toBe(2);
  });

  test('A5：結算卡每條故事事件都對得到事件 id（以及來源元素的紀錄）；卡片 SVG 遠小於 1 MB', () => {
    const card = buildCard(wA)!;
    expect(card.story.length).toBeGreaterThanOrEqual(PLAY.story.min);
    expect(card.story.length).toBeLessThanOrEqual(PLAY.story.max);
    const a2 = wA.elements['a2-master'] as A2State;
    const spar = wA.elements['w06-spar'] as SparState;
    const jh = wA.elements['w08-jianghu'] as JianghuState;
    for (const s of card.story) {
      const e = stA.events.find((x) => x.id === s.id);
      expect(e?.text).toBe(s.text);
      if (!s.ref) continue;
      const found =
        s.ref.src === 'a2' ? a2.records.some((r) => r.id === s.ref!.id)
        : s.ref.src === 'w06' ? spar.history.some((r) => r.id === s.ref!.id)
        : s.ref.src === 'w08' ? jh.chronicle.some((c) => c.event === s.ref!.id)
        : s.ref.src === 'a4' ? stA.used.some((u) => u.id === s.ref!.id)
        : s.ref.src === 'w07';
      expect(found).toBe(true);
    }
    for (const iv of card.interventions) for (const a of iv.after) expect(stA.events.some((e) => e.id === a.id)).toBe(true);
    const svg = cardSvg(card);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('width="1200" height="630"');
    expect(Buffer.byteLength(svg)).toBeLessThan(100 * 1024);
  });

  test('A6：不做任何干預時劇本照樣跑完並結算，結算後世界照走（結算後不再收干預）', () => {
    const N = runPlay({ scenario: 's2' }, 8, { days: 3, policy: 'none' });
    const w = N.run.game.world.wuxia!;
    const st = w.elements[A4_PLAY] as A4State;
    expect(N.report.outcomes.length).toBe(0);
    expect(st.used.length).toBe(0);
    expect(st.ended).toEqual(expect.objectContaining({ day: 3, reason: 'time' }));
    expect(buildCard(w)!.day).toBe(3);
    expect(intervene(N.run.game, N.run.game.engine.currentTime!, { kind: 'guide', target: 'a-qing' }).reason).toMatch(/結算/);
    // 結算後一天（第 4 日）照樣有人互動、時鐘照走
    expect(st.day).toBe(4);
    expect((w.elements['w03-life'] as LifeState).minute).toBeGreaterThan(st.ended!.gm);
    expect(st.ended!.day).toBe(3);
  });
});
