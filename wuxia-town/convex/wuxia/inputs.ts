// 武俠小鎮：元素自己的 input（W6 起）。convex/aiTown/inputs.ts 合併進總表（WUXIA-PATCH(W6)）。
// handler 在引擎 step 內執行；元素關閉時不做事。
import { v } from 'convex/values';
import { inputHandler } from '../aiTown/inputHandler';
import { applyNarration, W06_SPAR } from './w06_spar';
import { applyChronicleText, W08_JIANGHU } from './w08_jianghu';

export const wuxiaInputs = {
  /** W6：LLM 寫好的切磋旁白（convex/wuxia/w06_spar/narrate.ts） */
  wuxiaSparNarration: inputHandler({
    args: { matchId: v.number(), text: v.string(), guard: v.string() },
    handler: (game, now, args) => {
      if (!game.world.wuxia?.enabled[W06_SPAR]) return null;
      return applyNarration(game, args);
    },
  }),
  /** W8：LLM 改寫好的當日鎮誌段落（convex/wuxia/w08_jianghu/rewrite.ts） */
  wuxiaChronicleText: inputHandler({
    args: { day: v.number(), text: v.string(), guard: v.string() },
    handler: (game, now, args) => {
      if (!game.world.wuxia?.enabled[W08_JIANGHU]) return null;
      return applyChronicleText(game, args);
    },
  }),
};
