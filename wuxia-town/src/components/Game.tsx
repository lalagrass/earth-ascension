import { useRef, useState } from 'react';
import PixiGame from './PixiGame.tsx';

import { useElementSize } from 'usehooks-ts';
import { Stage } from '@pixi/react';
import { ConvexProvider, useConvex, useQuery } from 'convex/react';
import PlayerDetails from './PlayerDetails.tsx';
import { api } from '../../convex/_generated/api';
import { useWorldHeartbeat } from '../hooks/useWorldHeartbeat.ts';
import { useHistoricalTime } from '../hooks/useHistoricalTime.ts';
import { DebugTimeManager } from './DebugTimeManager.tsx';
import { GameId } from '../../convex/aiTown/ids.ts';
import { useServerGame } from '../hooks/serverGame.ts';
// WUXIA-PATCH(W1): 時辰顯示、換皮時的畫面框與底色
import { ClockBadge } from '../wuxia/ClockBadge.tsx';
import { skinEnabled, worldClock } from '../wuxia/skin.ts';
import { dayTint } from '../../convex/wuxia/clock.ts';
// WUXIA-PATCH(W3): 鎮況面板（每個地點現在有誰）
import { TownStatus } from '../wuxia/TownStatus.tsx';
// WUXIA-PATCH(W7): 武館面板
import { DojoPanel } from '../wuxia/DojoPanel.tsx';
// WUXIA-PATCH(W8): 山腳鎮誌面板
import { ChroniclePanel } from '../wuxia/ChroniclePanel.tsx';
import { lifeOf } from '../wuxia/life.ts';
// WUXIA-PATCH(W9): 玩家面板（選角色進鎮、點物件選活動、暫停、匯出 journal）
import { PlayerPanel } from '../wuxia/PlayerPanel.tsx';
import { myRec, playerStateOfWorld, rolesOffered } from '../wuxia/player.ts';
import { exportJournalFile } from '../wuxia/exportJournal.ts';
import { OBJECT_BY_ID } from '../../convex/wuxia/w03_life/data.ts';
// WUXIA-PATCH(A2): 傳承面板、顯示太極、角落提示
import { A2Corner } from '../wuxia/A2Panels.tsx';
import { useMutation } from 'convex/react';
import { useSendInput, waitForInput } from '../hooks/sendInput.ts';
import { toastOnError } from '../toasts.ts';

export const SHOW_DEBUG_UI = !!import.meta.env.VITE_SHOW_DEBUG_UI;

export default function Game() {
  const convex = useConvex();
  const [selectedElement, setSelectedElement] = useState<{
    kind: 'player';
    id: GameId<'players'>;
  }>();
  const [gameWrapperRef, { width, height }] = useElementSize();
  // WUXIA-PATCH(A2): 「顯示太極」開關（地圖圈圈）
  const [wuxiaTaiji, setWuxiaTaiji] = useState(false);

  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const engineId = worldStatus?.engineId;

  const game = useServerGame(worldId);

  // Send a periodic heartbeat to our world to keep it alive.
  useWorldHeartbeat();

  const worldState = useQuery(api.world.worldState, worldId ? { worldId } : 'skip');
  const { historicalTime, timeManager } = useHistoricalTime(worldState?.engine);

  const scrollViewRef = useRef<HTMLDivElement>(null);
  // WUXIA-PATCH(W9): 玩家面板的狀態與 input
  const [wuxiaObject, setWuxiaObject] = useState<string>();
  const [wuxiaResult, setWuxiaResult] = useState<{ ok: boolean; reason: string }>();
  const [exporting, setExporting] = useState(false);
  const humanToken = useQuery(api.world.userStatus, worldId ? { worldId } : 'skip');
  const joinWorld = useMutation(api.world.joinWorld);
  const wuxiaAct = useSendInput(engineId!, 'wuxiaPlayerAct');
  const wuxiaPause = useSendInput(engineId!, 'wuxiaPlayerPause');

  if (!worldId || !engineId || !game) {
    return null;
  }
  // WUXIA-PATCH(W1): w01-skin 的時辰（依遊戲時鐘）
  const skin = skinEnabled(game.world);
  const clock = skin ? worldClock(game.world, historicalTime ?? worldState?.engine.currentTime) : null;
  // WUXIA-PATCH(W9)
  const humanId = [...game.world.players.values()].find((p) => p.human === humanToken)?.id;
  const me = myRec(game.world, humanId);
  const wuxiaPanel = (
    <PlayerPanel
      offered={rolesOffered()}
      joined={!!humanId}
      state={playerStateOfWorld(game.world)}
      me={me}
      object={wuxiaObject ? OBJECT_BY_ID[wuxiaObject] : undefined}
      lastResult={wuxiaResult}
      exporting={exporting}
      onJoin={(role) =>
        void toastOnError(joinWorld({ worldId, wuxiaRole: role }).then((id) => waitForInput(convex, id)))
      }
      onAct={(obj, act) => {
        if (!humanId) return;
        void toastOnError(
          wuxiaAct({ playerId: humanId, kind: 'activity', obj, act }).then((r: any) => {
            setWuxiaResult(r);
            if (r?.ok) setWuxiaObject(undefined);
          }),
        );
      }}
      onCloseObject={() => setWuxiaObject(undefined)}
      onPause={(paused) => {
        if (!humanId) return;
        void toastOnError(wuxiaPause({ playerId: humanId, paused }).then((r: any) => setWuxiaResult(r)));
      }}
      onExport={() => {
        setExporting(true);
        void toastOnError(
          exportJournalFile(convex, worldId).then((r) =>
            setWuxiaResult({ ok: true, reason: `已匯出 ${r.steps} 步（hash ${r.hash.slice(0, 12)}…）` }),
          ),
        ).finally(() => setExporting(false));
      }}
    />
  );
  return (
    <>
      {SHOW_DEBUG_UI && <DebugTimeManager timeManager={timeManager} width={200} height={100} />}
      {/* WUXIA-PATCH(W1): 換皮時手機版的畫面高一點（小鎮是 4:3） */}
      <div
        className={
          skin
            ? 'mx-auto w-full max-w grid grid-rows-[290px_1fr] lg:grid-rows-[1fr] lg:grid-cols-[1fr_auto] lg:grow max-w-[1400px] min-h-[480px] game-frame'
            : 'mx-auto w-full max-w grid grid-rows-[240px_1fr] lg:grid-rows-[1fr] lg:grid-cols-[1fr_auto] lg:grow max-w-[1400px] min-h-[480px] game-frame'
        }
      >
        {/* Game area */}
        <div className="relative overflow-hidden bg-brown-900" ref={gameWrapperRef}>
          {/* WUXIA-PATCH(W1): 十二時辰＋第幾日 */}
          {skin && <ClockBadge clock={clock} phase={clock ? dayTint(clock.minuteOfDay).phase : undefined} />}
          {/* WUXIA-PATCH(W3): 鎮況（w03-life 開啟時） */}
          <TownStatus
            life={lifeOf(game.world)}
            players={[...game.world.players.values()]}
            nameOf={(id) => game.playerDescriptions.get(id as GameId<'players'>)?.name ?? id}
          />
          {/* WUXIA-PATCH(W7): 武館面板（館名、師父、弟子、入門日；w07-bond 開啟且武館已開時） */}
          <DojoPanel wuxia={game.world.wuxia} />
          {/* WUXIA-PATCH(W8): 山腳鎮誌面板（w08-jianghu 開啟時） */}
          <ChroniclePanel world={game.world} />
          {/* WUXIA-PATCH(A2): 傳承面板、顯示太極、角落提示（a2-master 開啟時；點提示＝選中那人） */}
          <A2Corner
            wuxia={game.world.wuxia}
            taiji={wuxiaTaiji}
            onTaiji={setWuxiaTaiji}
            onPick={(pid) => setSelectedElement({ kind: 'player', id: pid as GameId<'players'> })}
          />
          <div className="absolute inset-0">
            <div className="container">
              {/* WUXIA-PATCH(W1): 換皮時底色改紙色 */}
              <Stage width={width} height={height} options={{ backgroundColor: skin ? 0xe2d5b4 : 0x7ab5ff }}>
                {/* Re-propagate context because contexts are not shared between renderers.
https://github.com/michalochman/react-pixi-fiber/issues/145#issuecomment-531549215 */}
                <ConvexProvider client={convex}>
                  <PixiGame
                    game={game}
                    worldId={worldId}
                    engineId={engineId}
                    width={width}
                    height={height}
                    historicalTime={historicalTime}
                    setSelectedElement={setSelectedElement}
                    // WUXIA-PATCH(A1): 只有選中的人頭上顯示名字與活動文字
                    wuxiaSelectedId={selectedElement?.id}
                    // WUXIA-PATCH(A2): 顯示太極
                    wuxiaTaiji={wuxiaTaiji}
                    onWuxiaObject={(id) => {
                      setWuxiaObject(id);
                      setWuxiaResult(undefined);
                    }}
                  />
                </ConvexProvider>
              </Stage>
            </div>
          </div>
        </div>
        {/* Right column area */}
        <div
          className="flex flex-col overflow-y-auto shrink-0 px-4 py-6 sm:px-6 lg:w-96 xl:pr-6 border-t-8 sm:border-t-0 sm:border-l-8 border-brown-900  bg-brown-800 text-brown-100"
          ref={scrollViewRef}
        >
          {/* WUXIA-PATCH(W9): 玩家面板（w09-player 開放時） */}
          {wuxiaPanel}
          <PlayerDetails
            worldId={worldId}
            engineId={engineId}
            game={game}
            playerId={selectedElement?.id}
            setSelectedElement={setSelectedElement}
            scrollViewRef={scrollViewRef}
            // WUXIA-PATCH(W3): 生活面板用的遊戲時鐘
            historicalTime={historicalTime ?? worldState?.engine.currentTime}
          />
        </div>
      </div>
    </>
  );
}
