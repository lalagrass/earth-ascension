// 武俠小鎮 W0：LLM 每日 token 上限（LLM_DAILY_TOKEN_CAP）與模板句後備（#549 第 6 節）。
// 規則決定「做什麼」，LLM 只決定「說什麼」：超過上限或 LLM 失敗時直接回模板句，不重試、不等待。
// 這裡只在 action 裡執行（不是引擎 step），所以可以用 Date.now()。
import { v } from 'convex/values';
import { ActionCtx, internalMutation, internalQuery, query } from '../_generated/server';
import { makeFunctionReference } from 'convex/server';
import { chatCompletion, getLLMConfig, LLMMessage } from '../util/llm';

export type BudgetKind =
  | 'conversation.start'
  | 'conversation.continue'
  | 'conversation.leave'
  | 'memory.summary'
  | 'memory.importance'
  | 'memory.reflection';

/** 未設定、空字串、非正數 → 不設上限（跟上游行為一致）。 */
export function parseTokenCap(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const cap = Number(raw);
  if (!Number.isFinite(cap) || cap <= 0) return null;
  return Math.floor(cap);
}

export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** 沒有 usage 回傳時的粗估：中日韓字元 1 token、其他 4 字元 1 token。 */
export function estimateTokens(text: string): number {
  let cjk = 0;
  for (const ch of text) {
    if (/[\u3000-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(ch)) cjk++;
  }
  return cjk + Math.ceil((text.length - cjk) / 4);
}

export function overCap(used: number, cap: number | null): boolean {
  return cap !== null && used >= cap;
}

const ZH_TW_HINT = '請用繁體中文回答。';

function withLanguageHint(kind: BudgetKind, messages: LLMMessage[]): LLMMessage[] {
  // W0 實測用：WUXIA_REPLY_IN_ZH_TW=1 時，對話類 system prompt 多加一句「請用繁體中文回答」。
  if (process.env.WUXIA_REPLY_IN_ZH_TW !== '1' || !kind.startsWith('conversation.')) {
    return messages;
  }
  const out = messages.map((m) => ({ ...m }));
  const system = out.find((m) => m.role === 'system');
  if (system) {
    system.content = `${system.content}\n${ZH_TW_HINT}`;
  } else {
    out.unshift({ role: 'system', content: ZH_TW_HINT });
  }
  // 小模型常忽略 system 裡的語言要求（W0 實測），最後一則 user 訊息也補同一句。
  const lastUser = [...out].reverse().find((m) => m.role === 'user');
  if (lastUser) {
    lastUser.content = `${ZH_TW_HINT}\n${lastUser.content}`;
  }
  return out;
}

const usedTodayRef = makeFunctionReference<'query', { day: string }, number>(
  'wuxia/llmBudget:usedToday',
);
const recordUsageRef = makeFunctionReference<
  'mutation',
  {
    day: string;
    kind: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimated: boolean;
    ms: number;
    fallback: boolean;
  },
  null
>('wuxia/llmBudget:recordUsage');

/**
 * 取代 chatCompletion 的非串流呼叫：先查今天用量，超過上限就回 fallback；
 * 呼叫失敗也回 fallback（不丟例外，讓 agent 照常把訊息當 input 送回引擎）。
 */
export async function budgetedChatCompletion(
  ctx: ActionCtx,
  kind: BudgetKind,
  body: Parameters<typeof chatCompletion>[0] & { stream?: false },
  fallback: string,
): Promise<{ content: string; fallback: boolean }> {
  const cap = parseTokenCap(process.env.LLM_DAILY_TOKEN_CAP);
  const day = utcDay(Date.now());
  let model = body.model ?? 'unknown';
  try {
    model = body.model ?? getLLMConfig().chatModel;
  } catch {
    // 設定錯誤時照樣走下面的 try，讓錯誤變成模板句。
  }
  if (cap !== null) {
    const used = await ctx.runQuery(usedTodayRef, { day });
    if (overCap(used, cap)) {
      await ctx.runMutation(recordUsageRef, {
        day,
        kind,
        model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimated: false,
        ms: 0,
        fallback: true,
      });
      return { content: fallback, fallback: true };
    }
  }
  const start = Date.now();
  try {
    const messages = withLanguageHint(kind, body.messages);
    const result = await chatCompletion({ ...body, messages, stream: false });
    const promptText = messages.map((m) => m.content ?? '').join('\n');
    const usage = result.usage;
    const promptTokens = usage?.prompt_tokens ?? estimateTokens(promptText);
    const completionTokens = usage?.completion_tokens ?? estimateTokens(result.content);
    await ctx.runMutation(recordUsageRef, {
      day,
      kind,
      model,
      promptTokens,
      completionTokens,
      totalTokens: usage?.total_tokens ?? promptTokens + completionTokens,
      estimated: !usage,
      ms: result.ms,
      fallback: false,
    });
    return { content: result.content, fallback: false };
  } catch (e: any) {
    console.error(`LLM ${kind} failed, using template: ${e?.message ?? e?.error?.message ?? e}`);
    await ctx.runMutation(recordUsageRef, {
      day,
      kind,
      model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimated: false,
      ms: Date.now() - start,
      fallback: true,
    });
    return { content: fallback, fallback: true };
  }
}

export const usedToday = internalQuery({
  args: { day: v.string() },
  handler: async (ctx, args) => {
    let total = 0;
    for await (const row of ctx.db
      .query('wuxiaLlmUsage')
      .withIndex('day', (q) => q.eq('day', args.day))) {
      total += row.totalTokens;
    }
    return total;
  },
});

export const recordUsage = internalMutation({
  args: {
    day: v.string(),
    kind: v.string(),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    estimated: v.boolean(),
    ms: v.number(),
    fallback: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('wuxiaLlmUsage', args);
    return null;
  },
});

/** 前端角落顯示「說書人歇息中」用（W0 先提供查詢，畫面在之後的步驟接）。 */
export const status = query({
  args: {},
  handler: async (ctx) => {
    const cap = parseTokenCap(process.env.LLM_DAILY_TOKEN_CAP);
    const day = utcDay(Date.now());
    let used = 0;
    for await (const row of ctx.db
      .query('wuxiaLlmUsage')
      .withIndex('day', (q) => q.eq('day', day))) {
      used += row.totalTokens;
    }
    return { day, cap, used, resting: overCap(used, cap) };
  },
});

/** 實測報告用：某天各 kind／model 的用量與平均延遲。 */
export const report = internalQuery({
  args: { day: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('wuxiaLlmUsage')
      .withIndex('day', (q) => q.eq('day', args.day))
      .collect();
    return rows.map(({ _id, _creationTime, ...r }) => ({ ...r, at: _creationTime }));
  },
});
