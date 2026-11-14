// 武俠小鎮 W8（#560）：亥時的鎮誌改寫 operation（action，不在引擎 step 內，可以用 Date.now）。
// 引擎已先放了模板段落；這裡請 LLM 改寫成 80 字內古風段落（W2 守門、沒過重抽一次），
// 結果以 input `wuxiaChronicleText` 送回引擎，只換文字。LLM 失敗或超過預算：送回模板段落（guard=template）。
import { v } from 'convex/values';
import { internalAction } from '../../_generated/server';
import { api } from '../../_generated/api';
import { budgetedChatCompletion } from '../llmBudget';
import { normalizeReply } from '../w02_folk/guard';
import { renderPrompt } from '../w02_folk';
import { checkChronicle, chroniclePrompt } from './chronicle';

export const chronicleRewrite = internalAction({
  args: {
    worldId: v.id('worlds'),
    day: v.number(),
    entries: v.array(v.string()),
    template: v.string(),
  },
  handler: async (ctx, args) => {
    const prompt = chroniclePrompt(args.day, args.entries);
    let text = args.template;
    let guard = 'template';
    let reasons: string[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const messages = [{ role: 'user' as const, content: prompt }];
      if (attempt > 0)
        messages.push({ role: 'user' as const, content: renderPrompt('chronicle-retry', { reasons: reasons.join('、') }) });
      const { content, fallback } = await budgetedChatCompletion(ctx, 'jianghu.chronicle', { messages, max_tokens: 200 }, '');
      if (fallback) break;
      const t = normalizeReply(content);
      const check = checkChronicle(t);
      reasons = check.reasons;
      if (check.ok) {
        text = t;
        guard = attempt === 0 ? 'pass' : 'retry';
        break;
      }
    }
    await ctx.runMutation(api.aiTown.main.sendInput, {
      worldId: args.worldId,
      name: 'wuxiaChronicleText',
      args: { day: args.day, text, guard },
    });
  },
});
