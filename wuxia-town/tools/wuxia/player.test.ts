// 武俠小鎮 W9（#561）：w09-player 單元測試
import { runHeadless } from './headless';
import { initWuxiaState, defaultWuxiaConfig } from '../../convex/wuxia/state';
import { playerStateOf } from '../../convex/wuxia/w09_player/data';
import { readClock, gameMinutes } from '../../convex/wuxia/clock';

const JOIN = {
  name: '外地少年',
  character: 'w5',
  description: '測試',
  tokenIdentifier: 'test-player',
  wuxiaRole: 'youth-m',
};

function runWith(minutes: number, plan: (k: number, game: any, now: number) => Array<{ name: string; args: any }>) {
  let k = 0;
  const results: Array<{ name: string; value: any }> = [];
  const run = runHeadless({
    seed: 7,
    minutes,
    inject: (game, now) => plan(++k, game, now),
    onInputResult: (input, r) => results.push({ name: input.name, value: r.kind === 'ok' ? r.value : r.message }),
  });
  return { run, results };
}

describe('W9 w09-player (#561)', () => {
  test('w09-player is lazy: not in enabled until a player joins', () => {
    const w = initWuxiaState(defaultWuxiaConfig);
    expect(defaultWuxiaConfig.elements['w09-player']).toBe(true);
    expect(w.enabled['w09-player']).toBeUndefined();
    expect(playerStateOf(w)).toBeUndefined();
  });

  test('join with wuxiaRole enables w09-player and creates the player record; join without it does not', () => {
    const a = runWith(3, (k) => (k === 5 ? [{ name: 'join', args: JOIN }] : []));
    const st = playerStateOf(a.run.game.world.wuxia);
    expect(a.run.game.world.wuxia!.enabled['w09-player']).toBe(true);
    expect(st!.players.length).toBe(1);
    expect(st!.players[0].role).toBe('youth-m');
    const { wuxiaRole: _r, ...plain } = JOIN;
    const b = runWith(3, (k) => (k === 5 ? [{ name: 'join', args: plain }] : []));
    expect(b.run.game.world.wuxia!.enabled['w09-player']).toBeUndefined();
    expect(playerStateOf(b.run.game.world.wuxia)).toBeUndefined();
  });

  test('a rejected activity returns a reason; pause stops the world and the game clock', () => {
    let pid: string | undefined;
    let pausedGm: number | undefined;
    let lifeAt25: string | undefined;
    let lifeAt390: string | undefined;
    const gmOf = (game: any) => {
      const w = game.world.wuxia;
      return w.clockEpoch === undefined ? 0 : gameMinutes(game.engine.currentTime, w.clockEpoch, w.timeScale);
    };
    // 8 實分鐘＝480 步：第 20 步暫停、第 400 步繼續
    const { run, results } = runWith(8, (k, game) => {
      if (k === 2) return [{ name: 'join', args: JOIN }];
      pid ??= [...game.world.players.values()].find((p: any) => p.human)?.id;
      if (k === 10) return [{ name: 'wuxiaPlayerAct', args: { playerId: pid, kind: 'activity', obj: 'dummies', act: 'hit_dummy' } }];
      if (k === 20) {
        pausedGm = gmOf(game);
        return [{ name: 'wuxiaPlayerPause', args: { playerId: pid, paused: true } }];
      }
      if (k === 25) lifeAt25 = JSON.stringify(game.world.wuxia.elements['w03-life']);
      if (k === 390) lifeAt390 = JSON.stringify(game.world.wuxia.elements['w03-life']);
      if (k === 400) return [{ name: 'wuxiaPlayerPause', args: { playerId: pid, paused: false } }];
      return [];
    });
    const act = results.find((r) => r.name === 'wuxiaPlayerAct');
    expect(act!.value).toEqual({ ok: false, reason: '武館還沒重開' });
    // 暫停期間生活狀態一點都沒變
    expect(lifeAt390).toBe(lifeAt25);
    const log = playerStateOf(run.game.world.wuxia)!.log;
    const pause = log.find((l) => l.op === 'pause' && l.ok)!;
    const resume = log.find((l) => l.op === 'resume')!;
    expect(resume.t).toBe(pause.t);
    // 暫停約 380 實秒：繼續後時鐘從暫停那一刻接著走，480 步只走了約 100 遊戲分鐘
    const end = gmOf(run.game);
    expect(end - pausedGm!).toBeGreaterThan(60);
    expect(end - pausedGm!).toBeLessThan(110);
    expect(readClock(end).day).toBe(1);
  });
});

describe('W9 shared long run (wuxia:check)', () => {
  test('a tap at day 1 equals a standalone 1-day run (summary and hash)', () => {
    let tap: any;
    const long = runHeadless({
      seed: 7,
      minutes: 0,
      untilGameMinute: 2 * 1440,
      trace: true,
      taps: [1440],
      onTap: (_gm, t) => (tap = t),
    });
    const one = runHeadless({ seed: 7, minutes: 0, untilGameMinute: 1440, trace: true });
    expect(tap.finalHash).toBe(one.finalHash);
    expect(JSON.stringify(tap.summary)).toBe(JSON.stringify(JSON.parse(JSON.stringify(one.summary))));
    expect(long.finalHash).not.toBe(one.finalHash);
  }, 120_000);
});
