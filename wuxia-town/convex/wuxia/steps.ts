// 武俠小鎮 W0：step 邊界紀錄（wuxiaSteps）與 journal 起點快照（wuxiaSnapshots）。
import { Infer } from 'convex/values';
import { Id } from '../_generated/dataModel';
import { MutationCtx } from '../_generated/server';
import { wuxiaStep } from './schema';
import { initElements } from './registry';
import { initWuxiaState } from './state';

export type WuxiaStepRecord = Infer<typeof wuxiaStep>;

/**
 * 在 saveWorld mutation 裡、套用這個 step 之前呼叫。
 * 這個世界還沒有任何 wuxiaSteps 時，先把資料庫裡「套用前」的完整狀態存成快照，
 * 之後 journal export 就能從這裡開始逐 step 重播。
 */
export async function recordWuxiaStep(
  ctx: MutationCtx,
  worldId: Id<'worlds'>,
  engineId: Id<'engines'>,
  step: WuxiaStepRecord,
  loadPreStepState: () => Promise<{ engine: any; gameState: any }>,
) {
  const first = await ctx.db
    .query('wuxiaSteps')
    .withIndex('worldId', (q) => q.eq('worldId', worldId))
    .first();
  if (!first) {
    const { engine, gameState } = await loadPreStepState();
    // W1：剛建立的世界在資料庫裡還沒有 wuxia 欄位（Game 建構子才依設定檔初始化）。
    // 快照時把同一份初始狀態寫進去，重播就不用再讀「現在的」設定檔（W0 的 fixture 因此在 W1 改設定後對不上）。
    if (gameState.world && gameState.world.wuxia === undefined) {
      gameState.world.wuxia = initWuxiaState();
      initElements(gameState.world.wuxia);
    }
    const { _id, _creationTime, ...engineFields } = engine;
    await ctx.db.insert('wuxiaSnapshots', {
      worldId,
      engineId,
      generation: step.generation,
      engine: engineFields,
      gameState,
    });
  }
  await ctx.db.insert('wuxiaSteps', { worldId, engineId, ...step });
}
