import { runHeadless, initialSnapshot, journalLines } from './headless';
import { replayJournal } from './replay';
import { createGame } from './sim';
import { skinDiff } from './skin-diff';

describe('headless simulation and replay', () => {
  test('same seed → same hash; different seed → different hash', () => {
    // W3：這個 W0 測試看的是上游漫遊聊天，w03-life 固定關（生活開啟時前 3 分鐘不會有人聊天；W3 自己的測試在 life.test.ts）
    const W2 = { 'w03-life': false };
    const a = runHeadless({ seed: 7, minutes: 3, agents: 5, elements: W2 });
    const b = runHeadless({ seed: 7, minutes: 3, agents: 5, elements: W2 });
    const c = runHeadless({ seed: 8, minutes: 3, agents: 5, elements: W2 });
    expect(a.finalHash).toEqual(b.finalHash);
    expect(a.finalHash).not.toEqual(c.finalHash);
    expect(a.summary.stats.messages).toBeGreaterThan(0);
  });
  test('journal of a headless run replays to the same per-step hashes', () => {
    const run = runHeadless({ seed: 11, minutes: 2, agents: 5, stepHashes: true });
    const journal = {
      header: {},
      snapshot: run.snapshot,
      inputs: run.queue,
      steps: run.steps,
      final: { hash: run.finalHash },
    };
    const r = replayJournal(journal);
    expect(r.firstMismatch).toBeUndefined();
    expect(r.ok).toBe(true);
    // journalLines 可以序列化
    expect(journalLines(run.snapshot, run.queue, run.steps, run.finalHash, {}).length).toBe(
      run.queue.length + run.steps.length + 3,
    );
  });
  test('engine rng lives in world.wuxia and survives save/load', () => {
    const game = createGame(initialSnapshot({ seed: 5, minutes: 1, agents: 1 }));
    game.rng();
    const saved = JSON.parse(JSON.stringify(game.world.serialize()));
    const x = game.rng();
    const snap = initialSnapshot({ seed: 5, minutes: 1, agents: 1 });
    snap.gameState.world = saved;
    const reloaded = createGame(snap);
    expect(reloaded.rng()).toEqual(x);
  });
});

describe('W1 w01-skin keeps the rules unchanged (#553)', () => {
  test('skin off reproduces the W0 world; same map on/off differs only in enabled flag + clock epoch', () => {
    const r = skinDiff(7, 3);
    expect(r.resultA.ok).toBe(true);
    expect(r.resultB.ok).toBe(true);
    expect(r.resultC.ok).toBe(true);
  });
  test('untilGameMinute stops at the requested game minute', () => {
    const run = runHeadless({ seed: 7, minutes: 0, agents: 5, untilGameMinute: 60 });
    expect(run.summary.clock!.gameMinute).toBe(60);
    expect(run.summary.clock!.label).toBe('第 1 日 辰初');
  });
});
