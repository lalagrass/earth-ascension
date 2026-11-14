// 武俠小鎮 W0：新增的資料表。
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const wuxiaStep = v.object({
  generation: v.number(),
  startTs: v.number(),
  endTs: v.number(),
  now: v.number(),
  // 以下為重播需要、規格之外加記的欄位（見 docs/wuxia/W0.md）。
  prevTime: v.optional(v.number()),
  numTicks: v.number(),
  inputsThrough: v.optional(v.number()),
  processedInputNumber: v.optional(v.number()),
  hash: v.string(),
});

export const wuxiaTables = {
  // 每個 engine step 一筆：step 邊界與 step 結束時的狀態 hash。
  wuxiaSteps: defineTable({
    worldId: v.id('worlds'),
    engineId: v.id('engines'),
    ...wuxiaStep.fields,
  }).index('worldId', ['worldId', 'generation']),

  // 該世界第一筆 wuxiaSteps 寫入前的完整狀態（journal 的起點）。
  wuxiaSnapshots: defineTable({
    worldId: v.id('worlds'),
    engineId: v.id('engines'),
    generation: v.number(),
    engine: v.any(),
    gameState: v.any(),
  }).index('worldId', ['worldId', 'generation']),

  // LLM 花費紀錄（LLM_DAILY_TOKEN_CAP）。day = UTC 日期 YYYY-MM-DD。
  wuxiaLlmUsage: defineTable({
    day: v.string(),
    kind: v.string(),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    estimated: v.boolean(),
    ms: v.number(),
    fallback: v.boolean(),
  }).index('day', ['day']),
};
