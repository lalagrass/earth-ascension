// 武俠小鎮 W0：給 tools/wuxia/journal.ts export 用的唯讀查詢（internal，需要 admin 權限，
// 用 `npx convex run` 呼叫）。分頁讀取，避免單一查詢超過讀取上限。
import { v } from 'convex/values';
import { internalQuery, query, QueryCtx } from '../_generated/server';
import { playerJoinAllowed } from './state';
import { stateHash } from './hash';
import { Id } from '../_generated/dataModel';

const snapshotDef = {
  args: { worldId: v.id('worlds') },
  handler: async (ctx: QueryCtx, args: any) => {
    const snap = await ctx.db
      .query('wuxiaSnapshots')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (!snap) return null;
    const { _id, _creationTime, ...rest } = snap;
    return rest;
  },
};
export const snapshot = internalQuery(snapshotDef);

const stepsDef = {
  args: { worldId: v.id('worlds'), afterGeneration: v.number(), limit: v.number() },
  handler: async (ctx: QueryCtx, args: any) => {
    const rows = await ctx.db
      .query('wuxiaSteps')
      .withIndex('worldId', (q) =>
        q.eq('worldId', args.worldId).gt('generation', args.afterGeneration),
      )
      .order('asc')
      .take(args.limit);
    return rows.map(({ _id, _creationTime, worldId, engineId, ...row }) => row);
  },
};
export const steps = internalQuery(stepsDef);

const inputsDef = {
  args: { engineId: v.id('engines'), afterNumber: v.number(), limit: v.number() },
  handler: async (ctx: QueryCtx, args: any) => {
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
};
export const inputs = internalQuery(inputsDef);

/** 目前資料庫裡的 world 文件算出的 hash（引擎停下後應該等於最後一個 step 的 hash）。 */
const currentHashDef = {
  args: { worldId: v.id('worlds') },
  handler: async (ctx: QueryCtx, args: { worldId: Id<'worlds'> }) => {
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
};
export const currentHash = internalQuery(currentHashDef);

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
const messagesDef = {
  args: { worldId: v.id('worlds') },
  handler: async (ctx: QueryCtx, args: any) => {
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
    // W2：多帶 authorId 與守門 metadata（sample-dialogue 用）
    return rows.map((m) => ({
      at: m._creationTime,
      conversationId: m.conversationId,
      authorId: m.author,
      author: names.get(m.author) ?? m.author,
      text: m.text,
      metadata: m.metadata,
    }));
  },
};
export const messages = internalQuery(messagesDef);

// W9（#561）：遊戲畫面的「匯出 journal」按鈕用的公開版本（內容同上；w09-player 關閉時不提供）。
// AI Town 的世界狀態與對話本來就是公開查詢可讀的，journal 只是同一份資料加上每步的 hash 與 input 原文。
function gated<A>(def: { args: A; handler: (ctx: QueryCtx, args: any) => Promise<any> }) {
  return {
    args: def.args,
    handler: async (ctx: QueryCtx, args: any) => {
      if (!playerJoinAllowed()) throw new Error('w09-player 未開，不提供匯出');
      return await def.handler(ctx, args);
    },
  };
}
export const exportSnapshot = query(gated(snapshotDef));
export const exportSteps = query(gated(stepsDef));
export const exportInputs = query(gated(inputsDef));
export const exportCurrentHash = query(gated(currentHashDef));
export const exportMessages = query(gated(messagesDef));
