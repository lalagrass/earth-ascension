import { v } from 'convex/values';
import { internal } from './_generated/api';
import { DatabaseReader, MutationCtx, mutation } from './_generated/server';
// WUXIA-PATCH(W2): 人物數改由 w02-folk 開關決定（開：data/wuxia/characters.json 6 人；關：上游 5 人）
import { descriptionsFor, W02_FOLK } from './wuxia/w02_folk';
import { isEnabled } from './wuxia/registry';
// WUXIA-PATCH(W1): 地圖改由 w01-skin 開關決定（開：山腳古鎮 data/wuxia/town-map.js；關：上游 data/gentle.js）
import { serializedMapFor } from './wuxia/w01_skin';
import { defaultWuxiaConfig, initWuxiaState } from './wuxia/state';
import { insertInput } from './aiTown/insertInput';
import { Id } from './_generated/dataModel';
import { createEngine } from './aiTown/main';
import { ENGINE_ACTION_DURATION } from './constants';
import { detectMismatchedLLMProvider } from './util/llm';

const init = mutation({
  args: {
    numAgents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    detectMismatchedLLMProvider();
    const { worldStatus, engine } = await getOrCreateDefaultWorld(ctx);
    if (worldStatus.status !== 'running') {
      console.warn(
        `Engine ${engine._id} is not active! Run "npx convex run testing:resume" to restart it.`,
      );
      return;
    }
    const shouldCreate = await shouldCreateAgents(
      ctx.db,
      worldStatus.worldId,
      worldStatus.engineId,
    );
    if (shouldCreate) {
      // WUXIA-PATCH(W2): 跟 createAgent 用同一份人物表
      const Descriptions = descriptionsFor(
        isEnabled(initWuxiaState(defaultWuxiaConfig), W02_FOLK),
      );
      const toCreate = args.numAgents !== undefined ? args.numAgents : Descriptions.length;
      for (let i = 0; i < toCreate; i++) {
        await insertInput(ctx, worldStatus.worldId, 'createAgent', {
          descriptionIndex: i % Descriptions.length,
        });
      }
    }
  },
});
export default init;

async function getOrCreateDefaultWorld(ctx: MutationCtx) {
  const now = Date.now();

  let worldStatus = await ctx.db
    .query('worldStatus')
    .filter((q) => q.eq(q.field('isDefault'), true))
    .unique();
  if (worldStatus) {
    const engine = (await ctx.db.get(worldStatus.engineId))!;
    return { worldStatus, engine };
  }

  const engineId = await createEngine(ctx);
  const engine = (await ctx.db.get(engineId))!;
  const worldId = await ctx.db.insert('worlds', {
    nextId: 0,
    agents: [],
    conversations: [],
    players: [],
  });
  const worldStatusId = await ctx.db.insert('worldStatus', {
    engineId: engineId,
    isDefault: true,
    lastViewed: now,
    status: 'running',
    worldId: worldId,
  });
  worldStatus = (await ctx.db.get(worldStatusId))!;
  // WUXIA-PATCH(W1): 跟 Game 建構子用同一份設定（world.config.json）決定地圖
  await ctx.db.insert('maps', {
    worldId,
    ...serializedMapFor(initWuxiaState(defaultWuxiaConfig).enabled),
  });
  await ctx.scheduler.runAfter(0, internal.aiTown.main.runStep, {
    worldId,
    generationNumber: engine.generationNumber,
    maxDuration: ENGINE_ACTION_DURATION,
  });
  return { worldStatus, engine };
}

async function shouldCreateAgents(
  db: DatabaseReader,
  worldId: Id<'worlds'>,
  engineId: Id<'engines'>,
) {
  const world = await db.get(worldId);
  if (!world) {
    throw new Error(`Invalid world ID: ${worldId}`);
  }
  if (world.agents.length > 0) {
    return false;
  }
  const unactionedJoinInputs = await db
    .query('inputs')
    .withIndex('byInputNumber', (q) => q.eq('engineId', engineId))
    .order('asc')
    .filter((q) => q.eq(q.field('name'), 'createAgent'))
    .filter((q) => q.eq(q.field('returnValue'), undefined))
    .first();
  if (unactionedJoinInputs) {
    return false;
  }
  return true;
}
