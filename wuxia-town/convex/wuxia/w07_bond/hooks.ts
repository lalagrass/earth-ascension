// 武俠小鎮 W7（#559）：給上游 convex/aiTown/agent.ts 接受／拒絕邀請那裡用的兩個掛鉤（WUXIA-PATCH(W7)）。
// 只讀寫世界狀態裡的純資料（不 import 元素的 index，避免 agent.ts → w03_life → aiTown 的循環）。w07-bond 關閉時什麼都不做。
import type { Game } from '../../aiTown/game';
import { gameMinutes } from '../clock';
import { BondState, W07_BOND } from './data';

function bondState(game: Game): BondState | undefined {
  const w = game.world.wuxia;
  if (!w || !w.enabled[W07_BOND] || w.clockEpoch === undefined) return undefined;
  return w.elements[W07_BOND] as BondState | undefined;
}

function cidOf(game: Game, pid: string): string | undefined {
  const life = game.world.wuxia?.elements['w03-life'] as { people?: Record<string, { cid: string }> } | undefined;
  return life?.people?.[pid]?.cid;
}

/** 門規「尊師」：邀請人是被邀人的師父時一定接受（不擲接受機率）。 */
export function mustAcceptInvite(game: Game, inviteePid: string, inviterPid: string): boolean {
  const s = bondState(game);
  if (!s) return false;
  const invitee = cidOf(game, inviteePid);
  const inviter = cidOf(game, inviterPid);
  return !!invitee && !!inviter && s.disciples[invitee]?.master === inviter;
}

/** #559「被拒絕邀請 → 親近 −」：記下來，w07-bond 的 tick 轉成邀請人的記憶。 */
export function inviteRejected(game: Game, now: number, inviteePid: string, inviterPid: string) {
  const s = bondState(game);
  if (!s) return;
  const w = game.world.wuxia!;
  s.pendingRejects.push({ t: gameMinutes(now, w.clockEpoch!, w.timeScale), inviter: inviterPid, invitee: inviteePid });
}
