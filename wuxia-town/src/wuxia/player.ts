// 武俠小鎮 W9（#561）：玩家操作畫面用的純函式（live 與截圖頁共用）。
import { activeObjects, ObjectDef, ActivityDef } from '../../convex/wuxia/w03_life/data';
import { PLAYER, PLAYER_ROLES, PlayerState, PlayerRec, W09_PLAYER } from '../../convex/wuxia/w09_player/data';
import { playerJoinAllowed } from '../../convex/wuxia/state';

type WithWuxia = { wuxia?: { enabled: Record<string, boolean>; elements: Record<string, unknown> } };

export { PLAYER_ROLES };

/** 這個部署允許選角色進鎮（world.config.json 的 w09-player）。 */
export function rolesOffered(): boolean {
  return playerJoinAllowed();
}

export function playerStateOfWorld(world: WithWuxia | undefined | null): PlayerState | undefined {
  const w = world?.wuxia;
  if (!w?.enabled[W09_PLAYER]) return undefined;
  return w.elements[W09_PLAYER] as PlayerState | undefined;
}

export function myRec(world: WithWuxia | undefined | null, pid: string | undefined): PlayerRec | undefined {
  if (!pid) return undefined;
  return playerStateOfWorld(world)?.players.find((p) => p.pid === pid);
}

/** 點到的格子上（物件格或使用格）有沒有物件；只算這個世界有的物件。 */
export function objectAtTile(
  world: WithWuxia | undefined | null,
  x: number,
  y: number,
): ObjectDef | undefined {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  const objs = activeObjects(world?.wuxia?.enabled);
  return (
    objs.find((o) => o.tile[0] === tx && o.tile[1] === ty) ??
    objs.find((o) => o.slots.some(([sx, sy]) => sx === tx && sy === ty))
  );
}

/** 玩家可以對這個物件選的活動（鎮民的本業不列）。 */
export function playerActivities(obj: ObjectDef): ActivityDef[] {
  return obj.activities.filter((a) => a.roles.includes('*') || PLAYER.acts.includes(a.id));
}

export const MODE_LABEL: Record<string, string> = { manual: '親自操作', auto: '規則代管中' };
