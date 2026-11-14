// 武俠小鎮 W0：狀態 hash（#549 第 5 節）。
// hash = sha256( 鍵排序 JSON( world.serialize() ，含 wuxia 欄位，不含 historicalLocations ) )
import type { SerializedWorld } from '../aiTown/world';
import { canonicalJson } from './canonical';
import { sha256Hex } from './sha256';

export function hashableWorld(
  world: SerializedWorld,
): Omit<SerializedWorld, 'historicalLocations'> {
  const { historicalLocations: _ignored, ...rest } = world;
  return rest;
}

export function stateHash(world: SerializedWorld): string {
  return sha256Hex(canonicalJson(hashableWorld(world)));
}
