import * as PIXI from 'pixi.js';
import { useApp } from '@pixi/react';
import { Player, SelectElement } from './Player.tsx';
import { useEffect, useRef, useState } from 'react';
import { PixiStaticMap } from './PixiStaticMap.tsx';
import PixiViewport from './PixiViewport.tsx';
import { Viewport } from 'pixi-viewport';
import { Id } from '../../convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { useSendInput } from '../hooks/sendInput.ts';
import { toastOnError } from '../toasts.ts';
import { DebugPath } from './DebugPath.tsx';
import { PositionIndicator } from './PositionIndicator.tsx';
import { SHOW_DEBUG_UI } from './Game.tsx';
import { ServerGame } from '../hooks/serverGame.ts';
// WUXIA-PATCH(W1): 換皮的畫面層（日夜色調、地點名牌）
import { SkinLayers } from '../wuxia/SkinLayers.tsx';
// WUXIA-PATCH(W4): 武館重開後的練功器具
import { DojoLayer } from '../wuxia/DojoLayer.tsx';
// WUXIA-PATCH(W7): 武館匾額
import { plaqueName } from '../wuxia/bond.ts';
// WUXIA-PATCH(W6): 切磋的勢點、擊中白光、旁白框
import { SparLayer } from '../wuxia/SparLayer.tsx';
// WUXIA-PATCH(W8): 外人（行商、俠客、山賊）圖層
import { JianghuLayer } from '../wuxia/JianghuLayer.tsx';
// WUXIA-PATCH(W5): 武館改由心念重開，畫面看 openedAt（dojoOpened）
import { dojoOpened } from '../wuxia/dojo.ts';
import { skinEnabled, worldClock } from '../wuxia/skin.ts';
import { useViewportZoom, wholeMapScale } from '../wuxia/viewport.ts';
// WUXIA-PATCH(W9): 玩家點物件選活動（#561）
import { myRec, objectAtTile } from '../wuxia/player.ts';

export const PixiGame = (props: {
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
  game: ServerGame;
  historicalTime: number | undefined;
  width: number;
  height: number;
  setSelectedElement: SelectElement;
  // WUXIA-PATCH(W9): 點到物件時交給玩家面板（不給＝上游行為）
  onWuxiaObject?: (objId: string) => void;
  // WUXIA-PATCH(A1): 選中的人（頭上才顯示活動文字）
  wuxiaSelectedId?: string;
}) => {
  // PIXI setup.
  const pixiApp = useApp();
  const viewportRef = useRef<Viewport | undefined>();

  const humanTokenIdentifier = useQuery(api.world.userStatus, { worldId: props.worldId }) ?? null;
  const humanPlayerId = [...props.game.world.players.values()].find(
    (p) => p.human === humanTokenIdentifier,
  )?.id;

  const moveTo = useSendInput(props.engineId, 'moveTo');

  // Interaction for clicking on the world to navigate.
  const dragStart = useRef<{ screenX: number; screenY: number } | null>(null);
  const onMapPointerDown = (e: any) => {
    // https://pixijs.download/dev/docs/PIXI.FederatedPointerEvent.html
    dragStart.current = { screenX: e.screenX, screenY: e.screenY };
  };

  const [lastDestination, setLastDestination] = useState<{
    x: number;
    y: number;
    t: number;
  } | null>(null);
  const onMapPointerUp = async (e: any) => {
    if (dragStart.current) {
      const { screenX, screenY } = dragStart.current;
      dragStart.current = null;
      const [dx, dy] = [screenX - e.screenX, screenY - e.screenY];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        console.log(`Skipping navigation on drag event (${dist}px)`);
        return;
      }
    }
    if (!humanPlayerId) {
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const gameSpacePx = viewport.toWorld(e.screenX, e.screenY);
    const tileDim = props.game.worldMap.tileDim;
    const gameSpaceTiles = {
      x: gameSpacePx.x / tileDim,
      y: gameSpacePx.y / tileDim,
    };
    setLastDestination({ t: Date.now(), ...gameSpaceTiles });
    const roundedTiles = {
      x: Math.floor(gameSpaceTiles.x),
      y: Math.floor(gameSpaceTiles.y),
    };
    // WUXIA-PATCH(W9): 用角色進鎮的玩家點到物件 → 開活動選單（不走路；選了活動才走過去做）
    if (props.onWuxiaObject && myRec(props.game.world, humanPlayerId)) {
      const obj = objectAtTile(props.game.world, gameSpaceTiles.x, gameSpaceTiles.y);
      if (obj) {
        props.onWuxiaObject(obj.id);
        return;
      }
    }
    console.log(`Moving to ${JSON.stringify(roundedTiles)}`);
    await toastOnError(moveTo({ playerId: humanPlayerId, destination: roundedTiles }));
  };
  const { width, height, tileDim } = props.game.worldMap;
  const players = [...props.game.world.players.values()];
  // WUXIA-PATCH(W1): w01-skin 的畫面層所需資料
  const skin = skinEnabled(props.game.world);
  const zoom = useViewportZoom(viewportRef);
  const clock = skin ? worldClock(props.game.world, props.historicalTime ?? props.game.world.wuxia?.clockEpoch) : null;

  // Zoom on the user’s avatar when it is created
  useEffect(() => {
    if (!viewportRef.current || humanPlayerId === undefined) return;

    const humanPlayer = props.game.world.players.get(humanPlayerId)!;
    viewportRef.current.animate({
      position: new PIXI.Point(humanPlayer.position.x * tileDim, humanPlayer.position.y * tileDim),
      scale: 1.5,
    });
  }, [humanPlayerId]);

  return (
    <PixiViewport
      app={pixiApp}
      screenWidth={props.width}
      screenHeight={props.height}
      worldWidth={width * tileDim}
      worldHeight={height * tileDim}
      viewportRef={viewportRef}
      // WUXIA-PATCH(W1): 換皮時可縮小到看見整張小鎮
      wuxiaMinScale={skin ? wholeMapScale(props.width, props.height, width * tileDim, height * tileDim) : undefined}
    >
      <PixiStaticMap
        map={props.game.worldMap}
        onpointerup={onMapPointerUp}
        onpointerdown={onMapPointerDown}
      />
      {/* WUXIA-PATCH(W4): 武館器具畫在地圖上、人物下面（w04-dojo 開啟時）；W5：重開後才畫 */}
      {/* WUXIA-PATCH(W7): 收徒後武館掛匾（plaqueName，w07-bond 關閉時 undefined） */}
      {skin && <DojoLayer tileDim={tileDim} open={dojoOpened(props.game.world)} plaque={plaqueName(props.game.world)} />}
      {players.map(
        (p) =>
          // Only show the path for the human player in non-debug mode.
          (SHOW_DEBUG_UI || p.id === humanPlayerId) && (
            <DebugPath key={`path-${p.id}`} player={p} tileDim={tileDim} />
          ),
      )}
      {lastDestination && <PositionIndicator destination={lastDestination} tileDim={tileDim} />}
      {players.map((p) => (
        <Player
          key={`player-${p.id}`}
          game={props.game}
          player={p}
          isViewer={p.id === humanPlayerId}
          onClick={props.setSelectedElement}
          historicalTime={props.historicalTime}
          wuxiaSelected={p.id === props.wuxiaSelectedId}
        />
      ))}
      {/* WUXIA-PATCH(W8): 外人畫在人物旁（w08-jianghu 關閉或沒有外人時不畫） */}
      {skin && <JianghuLayer world={props.game.world} tileDim={tileDim} time={props.historicalTime ?? Date.now()} />}
      {/* WUXIA-PATCH(W6): 切磋畫面層疊在人物上面（w06-spar 關閉時不畫） */}
      {skin && (
        <SparLayer
          world={props.game.world}
          time={props.historicalTime ?? Date.now()}
          tileDim={tileDim}
          pos={(id) => props.game.world.players.get(id as any)?.position}
        />
      )}
      {/* WUXIA-PATCH(W1): 日夜色調與地點名牌疊在人物上面 */}
      {skin && (
        <SkinLayers
          worldWidthPx={width * tileDim}
          worldHeightPx={height * tileDim}
          tileDim={tileDim}
          zoom={zoom}
          clock={clock}
        />
      )}
    </PixiViewport>
  );
};
export default PixiGame;
