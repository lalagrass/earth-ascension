// 武俠小鎮 W6（#558）：切磋結束後的旁白 operation（action，不在引擎 step 內，可以用 Date.now）。
// 引擎在打完那一刻已經放了模板句；這裡請 LLM 寫一句（≤30 字、W2 守門、沒過重抽一次），
// 結果以 input `wuxiaSparNarration` 送回引擎，只換文字。LLM 失敗或超過預算：送回模板句（guard=template）。
import { v } from 'convex/values';
import { internalAction } from '../../_generated/server';
import { api } from '../../_generated/api';
import { budgetedChatCompletion } from '../llmBudget';
import { normalizeReply } from '../w02_folk/guard';
import { renderPrompt } from '../w02_folk';
import { checkNarration, sparNarrationPrompt } from './narration';

export const sparNarrate = internalAction({
  args: {
    worldId: v.id('worlds'),
    matchId: v.number(),
    place: v.string(),
    a: v.string(),
    b: v.string(),
    winner: v.optional(v.string()),
    loser: v.optional(v.string()),
    rounds: v.number(),
    move: v.string(),
    spectators: v.array(v.string()),
    template: v.string(),
  },
  handler: async (ctx, args) => {
    const prompt = sparNarrationPrompt(args);
    let text = args.template;
    let guard = 'template';
    let reasons: string[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const messages = [{ role: 'user' as const, content: prompt }];
      if (attempt > 0)
        messages.push({ role: 'user' as const, content: renderPrompt('spar-retry', { reasons: reasons.join('、') }) });
      const { content, fallback } = await budgetedChatCompletion(
        ctx,
        'spar.narration',
        { messages, max_tokens: 80 },
        '',
      );
      if (fallback) break;
      const t = normalizeReply(content);
      const check = checkNarration(t);
      reasons = check.reasons;
      if (check.ok) {
        text = t;
        guard = attempt === 0 ? 'pass' : 'retry';
        break;
      }
    }
    await ctx.runMutation(api.aiTown.main.sendInput, {
      worldId: args.worldId,
      name: 'wuxiaSparNarration',
      args: { matchId: args.matchId, text, guard },
    });
  },
});
