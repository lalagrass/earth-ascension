// 武俠小鎮：元素自己的 input（W6 起）。convex/aiTown/inputs.ts 合併進總表（WUXIA-PATCH(W6)）。
// handler 在引擎 step 內執行；元素關閉時不做事。
import { v } from 'convex/values';
import { inputHandler } from '../aiTown/inputHandler';
import { applyNarration, W06_SPAR } from './w06_spar';
import { applyChronicleText, W08_JIANGHU } from './w08_jianghu';
import { playerAct, setPaused } from './w09_player';
import { intervene } from './a4_play';

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
  /** W9：玩家的操作（點物件選活動、對人請教／切磋／拜師）。playerId 或 human（tokenIdentifier）擇一。回傳 { ok, reason } */
  wuxiaPlayerAct: inputHandler({
    args: {
      playerId: v.optional(v.string()),
      human: v.optional(v.string()),
      kind: v.string(),
      obj: v.optional(v.string()),
      act: v.optional(v.string()),
      target: v.optional(v.string()),
    },
    handler: (game, now, args) => playerAct(game, now, args),
  }),
  /** W9：單人世界暫停／繼續（#562 W9-14） */
  wuxiaPlayerPause: inputHandler({
    args: { playerId: v.optional(v.string()), human: v.optional(v.string()), paused: v.boolean() },
    handler: (game, now, args) => setPaused(game, now, args),
  }),
  /** A4（#576）：玩家花緣做一個干預（指路／引薦／傳話／接濟／說情）。回傳 { ok, reason, id } */
  wuxiaIntervene: inputHandler({
    args: {
      kind: v.string(),
      target: v.string(),
      other: v.optional(v.string()),
      place: v.optional(v.string()),
      rid: v.optional(v.number()),
      tuition: v.optional(v.string()),
    },
    handler: (game, now, args) => intervene(game, now, args),
  }),
};
