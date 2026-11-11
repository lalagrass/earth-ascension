// 武俠小鎮 W0：給 tools/wuxia/journal.ts export 用的唯讀查詢（internal，需要 admin 權限，
// 用 `npx convex run` 呼叫）。分頁讀取，避免單一查詢超過讀取上限。
import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';
import { stateHash } from './hash';

export const snapshot = internalQuery({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const snap = await ctx.db
      .query('wuxiaSnapshots')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (!snap) return null;
    const { _id, _creationTime, ...rest } = snap;
    return rest;
  },
});

export const steps = internalQuery({
  args: { worldId: v.id('worlds'), afterGeneration: v.number(), limit: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('wuxiaSteps')
      .withIndex('worldId', (q) =>
        q.eq('worldId', args.worldId).gt('generation', args.afterGeneration),
      )
      .order('asc')
      .take(args.limit);
    return rows.map(({ _id, _creationTime, worldId, engineId, ...row }) => row);
  },
});

export const inputs = internalQuery({
  args: { engineId: v.id('engines'), afterNumber: v.number(), limit: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('inputs')
      .withIndex('byInputNumber', (q) =>
        q.eq('engineId', args.engineId).gt('number', args.afterNumber),
      )
      .order('asc')
      .take(args.limit);
    return rows.map(({ _id, number, name, args: inputArgs, received, returnValue }) => ({
      _id,
      number,
      name,
      args: inputArgs,
      received,
      returnValue,
    }));
  },
});

/** 目前資料庫裡的 world 文件算出的 hash（引擎停下後應該等於最後一個 step 的 hash）。 */
export const currentHash = internalQuery({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) throw new Error(`No world ${args.worldId}`);
    const { _id, _creationTime, historicalLocations, ...rest } = world;
    const engineStatus = await ctx.db
      .query('worldStatus')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .unique();
    const engine = engineStatus ? await ctx.db.get(engineStatus.engineId) : null;
    return {
      hash: stateHash(rest as any),
      generationNumber: engine?.generationNumber,
      running: engine?.running,
      engineId: engineStatus?.engineId,
    };
  },
});

export const defaultWorld = internalQuery({
  args: {},
  handler: async (ctx) => {
    const status = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    return status && { worldId: status.worldId, engineId: status.engineId, status: status.status };
  },
});

/** 實測報告用：某世界的對話訊息（含說話者名字）。 */
export const messages = internalQuery({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('messages')
      .withIndex('conversationId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const names = new Map<string, string>();
    for (const d of await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect()) {
      names.set(d.playerId, d.name);
    }
    return rows.map((m) => ({
      at: m._creationTime,
      conversationId: m.conversationId,
      author: names.get(m.author) ?? m.author,
      text: m.text,
    }));
  },
});
