import Button from './Button';
import { toast } from 'react-toastify';
// WUXIA-PATCH(W1): 上游 assets/interact.svg 不在 repo，改用自製圖示
const interactImg = '/ai-town/wuxia/ui/join.svg';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
// import { SignInButton } from '@clerk/clerk-react';
import { ConvexError } from 'convex/values';
import { Id } from '../../../convex/_generated/dataModel';
import { useCallback } from 'react';
import { waitForInput } from '../../hooks/sendInput';
import { useServerGame } from '../../hooks/serverGame';
// WUXIA-PATCH(W9): 進鎮時選「外地少年／外地少女」（#561）
import { PLAYER_ROLES, rolesOffered } from '../../wuxia/player';

export default function InteractButton() {
  // const { isAuthenticated } = useConvexAuth();
  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const game = useServerGame(worldId);
  const humanTokenIdentifier = useQuery(api.world.userStatus, worldId ? { worldId } : 'skip');
  const userPlayerId =
    game && [...game.world.players.values()].find((p) => p.human === humanTokenIdentifier)?.id;
  const join = useMutation(api.world.joinWorld);
  const leave = useMutation(api.world.leaveWorld);
  const isPlaying = !!userPlayerId;

  const convex = useConvex();
  const joinInput = useCallback(
    async (worldId: Id<'worlds'>, wuxiaRole?: string) => {
      let inputId;
      try {
        inputId = await join({ worldId, wuxiaRole });
      } catch (e: any) {
        if (e instanceof ConvexError) {
          toast.error(e.data);
          return;
        }
        throw e;
      }
      try {
        await waitForInput(convex, inputId);
      } catch (e: any) {
        toast.error(e.message);
      }
    },
    [convex],
  );

  const joinOrLeaveGame = () => {
    if (
      !worldId ||
      // || !isAuthenticated
      game === undefined
    ) {
      return;
    }
    if (isPlaying) {
      console.log(`Leaving game for player ${userPlayerId}`);
      void leave({ worldId });
    } else {
      console.log(`Joining game`);
      void joinInput(worldId);
    }
  };
  // if (!isAuthenticated || game === undefined) {
  //   return (
  //     <SignInButton>
  //       <Button imgUrl={interactImg}>Interact</Button>
  //     </SignInButton>
  //   );
  // }
  // WUXIA-PATCH(W9): w09-player 開放時，「進鎮」換成兩個角色鈕
  if (!isPlaying && rolesOffered()) {
    return (
      <>
        {PLAYER_ROLES.map((r) => (
          <Button
            key={r.id}
            imgUrl={interactImg}
            onClick={() => worldId && game !== undefined && void joinInput(worldId, r.id)}
          >
            {`以${r.label}進鎮`}
          </Button>
        ))}
      </>
    );
  }
  return (
    <Button imgUrl={interactImg} onClick={joinOrLeaveGame}>
      {/* WUXIA-PATCH(W1): 介面繁中 */}
      {isPlaying ? '離開' : '進鎮'}
    </Button>
  );
}
