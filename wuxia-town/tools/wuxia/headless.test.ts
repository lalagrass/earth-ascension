import { runHeadless, initialSnapshot, journalLines } from './headless';
import { replayJournal } from './replay';
import { createGame } from './sim';

describe('headless simulation and replay', () => {
  test('same seed → same hash; different seed → different hash', () => {
    const a = runHeadless({ seed: 7, minutes: 3, agents: 5 });
    const b = runHeadless({ seed: 7, minutes: 3, agents: 5 });
    const c = runHeadless({ seed: 8, minutes: 3, agents: 5 });
    expect(a.finalHash).toEqual(b.finalHash);
    expect(a.finalHash).not.toEqual(c.finalHash);
    expect(a.summary.stats.messages).toBeGreaterThan(0);
  });
  test('journal of a headless run replays to the same per-step hashes', () => {
    const run = runHeadless({ seed: 11, minutes: 2, agents: 5 });
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
