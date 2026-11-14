import { ObjectType, v } from 'convex/values';
import { Conversation, serializedConversation } from './conversation';
import { Player, serializedPlayer } from './player';
import { Agent, serializedAgent } from './agent';
import { GameId, parseGameId, playerId } from './ids';
import { parseMap } from '../util/object';
// WUXIA-PATCH(W0): world 文件新增 wuxia 欄位（元素狀態＋種子亂數），跟 step diff 一起存檔
import type { WuxiaState } from '../wuxia/state';

export const historicalLocations = v.array(
  v.object({
    playerId,
    location: v.bytes(),
  }),
);

export const serializedWorld = {
  nextId: v.number(),
  conversations: v.array(v.object(serializedConversation)),
  players: v.array(v.object(serializedPlayer)),
  agents: v.array(v.object(serializedAgent)),
  historicalLocations: v.optional(historicalLocations),
  // WUXIA-PATCH(W0): 武俠元素狀態與 rng（#549 第 2、4 節）
  wuxia: v.optional(v.any()),
};
export type SerializedWorld = ObjectType<typeof serializedWorld>;

export class World {
  nextId: number;
  conversations: Map<GameId<'conversations'>, Conversation>;
  players: Map<GameId<'players'>, Player>;
  agents: Map<GameId<'agents'>, Agent>;
  historicalLocations?: Map<GameId<'players'>, ArrayBuffer>;
  // WUXIA-PATCH(W0): 武俠元素狀態與 rng
  wuxia?: WuxiaState;

  constructor(serialized: SerializedWorld) {
    const { nextId, historicalLocations } = serialized;

    this.nextId = nextId;
    this.conversations = parseMap(serialized.conversations, Conversation, (c) => c.id);
    this.players = parseMap(serialized.players, Player, (p) => p.id);
    this.agents = parseMap(serialized.agents, Agent, (a) => a.id);
    // WUXIA-PATCH(W0): 讀入 wuxia 欄位
    this.wuxia = serialized.wuxia;

    if (historicalLocations) {
      this.historicalLocations = new Map();
      for (const { playerId, location } of historicalLocations) {
        this.historicalLocations.set(parseGameId('players', playerId), location);
      }
    }
  }

  playerConversation(player: Player): Conversation | undefined {
    // WUXIA-PATCH(A1): 不每次展開成陣列（每個 tick 每人都會呼叫）；一樣回傳插入順序的第一個
    for (const c of this.conversations.values()) if (c.participants.has(player.id)) return c;
    return undefined;
  }

  serialize(): SerializedWorld {
    return {
      nextId: this.nextId,
      conversations: [...this.conversations.values()].map((c) => c.serialize()),
      players: [...this.players.values()].map((p) => p.serialize()),
      agents: [...this.agents.values()].map((a) => a.serialize()),
      historicalLocations:
        this.historicalLocations &&
        [...this.historicalLocations.entries()].map(([playerId, location]) => ({
          playerId,
          location,
        })),
      // WUXIA-PATCH(W0): 寫出 wuxia 欄位
      wuxia: this.wuxia,
    };
  }
}
