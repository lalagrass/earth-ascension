import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
// WUXIA-PATCH(W1): 上游 assets/close.svg 不在 repo（授權不明），改用自製圖示；人物詳情加「在○○附近」
const closeImg = '/ai-town/wuxia/ui/close.svg';
import { PlayerCard } from '../wuxia/PlayerCard';
import { activityLabel, skinEnabled, worldClock } from '../wuxia/skin';
// WUXIA-PATCH(W3): 生活面板（目前活動、下一件事、需求條、今日做過的事）
import { LifePanel } from '../wuxia/LifePanel';
// WUXIA-PATCH(W4): 技能面板（4 個技能與階級名）
import { SkillPanel } from '../wuxia/SkillPanel';
// WUXIA-PATCH(W5): w05-mind 的心事欄
import { MindPanel } from '../wuxia/MindPanel';
// WUXIA-PATCH(W7): 「關係」分頁
import { BondPanel, DetailTabs } from '../wuxia/BondPanel';
import { useState as useWuxiaState } from 'react';
import { dojoOf } from '../wuxia/dojo';
import { lifeOf } from '../wuxia/life';
import { SelectElement } from './Player';
import { Messages } from './Messages';
import { toastOnError } from '../toasts';
import { useSendInput } from '../hooks/sendInput';
import { Player } from '../../convex/aiTown/player';
import { GameId } from '../../convex/aiTown/ids';
import { ServerGame } from '../hooks/serverGame';

export default function PlayerDetails({
  worldId,
  engineId,
  game,
  playerId,
  setSelectedElement,
  scrollViewRef,
  historicalTime,
}: {
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
  game: ServerGame;
  playerId?: GameId<'players'>;
  setSelectedElement: SelectElement;
  scrollViewRef: React.RefObject<HTMLDivElement>;
  // WUXIA-PATCH(W3): 生活面板要用遊戲時鐘
  historicalTime?: number;
}) {
  const humanTokenIdentifier = useQuery(api.world.userStatus, { worldId });
  // WUXIA-PATCH(W7): 人物詳情的分頁（概況／關係）
  const [wuxiaTab, setWuxiaTab] = useWuxiaState<'main' | 'bond'>('main');

  const players = [...game.world.players.values()];
  const humanPlayer = players.find((p) => p.human === humanTokenIdentifier);
  const humanConversation = humanPlayer ? game.world.playerConversation(humanPlayer) : undefined;
  // Always select the other player if we're in a conversation with them.
  if (humanPlayer && humanConversation) {
    const otherPlayerIds = [...humanConversation.participants.keys()].filter(
      (p) => p !== humanPlayer.id,
    );
    playerId = otherPlayerIds[0];
  }

  const player = playerId && game.world.players.get(playerId);
  const playerConversation = player && game.world.playerConversation(player);

  const previousConversation = useQuery(
    api.world.previousConversation,
    playerId ? { worldId, playerId } : 'skip',
  );

  const playerDescription = playerId && game.playerDescriptions.get(playerId);

  const startConversation = useSendInput(engineId, 'startConversation');
  const acceptInvite = useSendInput(engineId, 'acceptInvite');
  const rejectInvite = useSendInput(engineId, 'rejectInvite');
  const leaveConversation = useSendInput(engineId, 'leaveConversation');

  if (!playerId) {
    return (
      <div className="h-full text-xl flex text-center items-center p-4">
        {/* WUXIA-PATCH(W1): 介面繁中 */}
        點地圖上的人物，看他在哪裡、聊了什麼。
      </div>
    );
  }
  if (!player) {
    return null;
  }
  const isMe = humanPlayer && player.id === humanPlayer.id;
  const canInvite = !isMe && !playerConversation && humanPlayer && !humanConversation;
  const sameConversation =
    !isMe &&
    humanPlayer &&
    humanConversation &&
    playerConversation &&
    humanConversation.id === playerConversation.id;

  const humanStatus =
    humanPlayer && humanConversation && humanConversation.participants.get(humanPlayer.id)?.status;
  const playerStatus = playerConversation && playerConversation.participants.get(playerId)?.status;

  const haveInvite = sameConversation && humanStatus?.kind === 'invited';
  const waitingForAccept =
    sameConversation && playerConversation.participants.get(playerId)?.status.kind === 'invited';
  const waitingForNearby =
    sameConversation && playerStatus?.kind === 'walkingOver' && humanStatus?.kind === 'walkingOver';

  const inConversationWithMe =
    sameConversation &&
    playerStatus?.kind === 'participating' &&
    humanStatus?.kind === 'participating';

  const onStartConversation = async () => {
    if (!humanPlayer || !playerId) {
      return;
    }
    console.log(`Starting conversation`);
    await toastOnError(startConversation({ playerId: humanPlayer.id, invitee: playerId }));
  };
  const onAcceptInvite = async () => {
    if (!humanPlayer || !humanConversation || !playerId) {
      return;
    }
    await toastOnError(
      acceptInvite({
        playerId: humanPlayer.id,
        conversationId: humanConversation.id,
      }),
    );
  };
  const onRejectInvite = async () => {
    if (!humanPlayer || !humanConversation) {
      return;
    }
    await toastOnError(
      rejectInvite({
        playerId: humanPlayer.id,
        conversationId: humanConversation.id,
      }),
    );
  };
  const onLeaveConversation = async () => {
    if (!humanPlayer || !inConversationWithMe || !humanConversation) {
      return;
    }
    await toastOnError(
      leaveConversation({
        playerId: humanPlayer.id,
        conversationId: humanConversation.id,
      }),
    );
  };
  // const pendingSuffix = (inputName: string) =>
  //   [...inflightInputs.values()].find((i) => i.name === inputName) ? ' opacity-50' : '';

  const pendingSuffix = (s: string) => '';
  return (
    <>
      <div className="flex gap-4">
        <div className="box w-3/4 sm:w-full mr-auto">
          <h2 className="bg-brown-700 p-2 font-display text-2xl sm:text-4xl tracking-wider shadow-solid text-center">
            {playerDescription?.name}
          </h2>
        </div>
        <a
          className="button text-white shadow-solid text-2xl cursor-pointer pointer-events-auto"
          onClick={() => setSelectedElement(undefined)}
        >
          <h2 className="h-full bg-clay-700">
            <img className="w-4 h-4 sm:w-5 sm:h-5" src={closeImg} />
          </h2>
        </a>
      </div>
      {/* WUXIA-PATCH(W1): 「在茶館附近」（w01-skin 開啟時，依 data/wuxia/places.json） */}
      <PlayerCard skin={skinEnabled(game.world)} position={player.position} />
      {/* WUXIA-PATCH(W7): 分頁「概況」（W3–W5 的面板）／「關係」（w07-bond 開啟時才有分頁鈕） */}
      <DetailTabs
        wuxia={game.world.wuxia}
        tab={wuxiaTab}
        onTab={setWuxiaTab}
        bond={<BondPanel wuxia={game.world.wuxia} playerId={player.id} />}
        main={
          <>
            {/* WUXIA-PATCH(W3): w03-life 的生活面板 */}
            <LifePanel
              life={lifeOf(game.world)}
              playerId={player.id}
              clock={worldClock(game.world, historicalTime ?? Date.now())}
              enabled={game.world.wuxia?.enabled}
              wuxia={game.world.wuxia}
            />
            {/* WUXIA-PATCH(W4): w04-dojo 的技能面板 */}
            <SkillPanel dojo={dojoOf(game.world)} life={lifeOf(game.world)} playerId={player.id} />
            {/* WUXIA-PATCH(W5): w05-mind 的心事欄（心念＋強度＋因為） */}
            <MindPanel wuxia={game.world.wuxia} playerId={player.id} />
          </>
        }
      />
      {canInvite && (
        <a
          className={
            'mt-6 button text-white shadow-solid text-xl cursor-pointer pointer-events-auto' +
            pendingSuffix('startConversation')
          }
          onClick={onStartConversation}
        >
          <div className="h-full bg-clay-700 text-center">
            <span>上前攀談</span>
          </div>
        </a>
      )}
      {waitingForAccept && (
        <a className="mt-6 button text-white shadow-solid text-xl cursor-pointer pointer-events-auto opacity-50">
          <div className="h-full bg-clay-700 text-center">
            <span>等對方回應…</span>
          </div>
        </a>
      )}
      {waitingForNearby && (
        <a className="mt-6 button text-white shadow-solid text-xl cursor-pointer pointer-events-auto opacity-50">
          <div className="h-full bg-clay-700 text-center">
            <span>走過去…</span>
          </div>
        </a>
      )}
      {inConversationWithMe && (
        <a
          className={
            'mt-6 button text-white shadow-solid text-xl cursor-pointer pointer-events-auto' +
            pendingSuffix('leaveConversation')
          }
          onClick={onLeaveConversation}
        >
          <div className="h-full bg-clay-700 text-center">
            <span>告辭</span>
          </div>
        </a>
      )}
      {haveInvite && (
        <>
          <a
            className={
              'mt-6 button text-white shadow-solid text-xl cursor-pointer pointer-events-auto' +
              pendingSuffix('acceptInvite')
            }
            onClick={onAcceptInvite}
          >
            <div className="h-full bg-clay-700 text-center">
              <span>答應</span>
            </div>
          </a>
          <a
            className={
              'mt-6 button text-white shadow-solid text-xl cursor-pointer pointer-events-auto' +
              pendingSuffix('rejectInvite')
            }
            onClick={onRejectInvite}
          >
            <div className="h-full bg-clay-700 text-center">
              <span>婉拒</span>
            </div>
          </a>
        </>
      )}
      {!playerConversation && player.activity && player.activity.until > Date.now() && (
        <div className="box flex-grow mt-6">
          <h2 className="bg-brown-700 text-base sm:text-lg text-center">
            {/* WUXIA-PATCH(W1): 活動名稱顯示繁中（規則資料不改） */}
            {activityLabel(player.activity.description, skinEnabled(game.world))}
          </h2>
        </div>
      )}
      <div className="desc my-6">
        <p className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm">
          {!isMe && playerDescription?.description}
          {isMe && <i>這是你。</i>}
          {!isMe && inConversationWithMe && (
            <>
              <br />
              <br />（<i>正在跟你說話</i>）
            </>
          )}
        </p>
      </div>
      {!isMe && playerConversation && playerStatus?.kind === 'participating' && (
        <Messages
          worldId={worldId}
          engineId={engineId}
          inConversationWithMe={inConversationWithMe ?? false}
          conversation={{ kind: 'active', doc: playerConversation }}
          humanPlayer={humanPlayer}
          scrollViewRef={scrollViewRef}
        />
      )}
      {!playerConversation && previousConversation && (
        <>
          <div className="box flex-grow">
            <h2 className="bg-brown-700 text-lg text-center">上一段談話</h2>
          </div>
          <Messages
            worldId={worldId}
            engineId={engineId}
            inConversationWithMe={false}
            conversation={{ kind: 'archived', doc: previousConversation }}
            humanPlayer={humanPlayer}
            scrollViewRef={scrollViewRef}
          />
        </>
      )}
    </>
  );
}
