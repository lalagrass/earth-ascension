// 武俠小鎮 W1：截圖頁（#553 驗收的 wuxia:shot）。
// 讀 tools/wuxia/headless.ts --state 匯出的狀態（window.__WUXIA_STATE__ 或 ?state=網址），
// 用跟 live 相同的元件畫：PixiStaticMap、Player（人物圖）、SkinLayers（日夜、地點名牌）、ClockBadge、PlayerCard。
// 只是把 Convex 的 useQuery 換成匯出的資料，不能互動、不送 input。
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Stage, useApp } from '@pixi/react';
import { Viewport } from 'pixi-viewport';
import { useElementSize } from 'usehooks-ts';
import '../../index.css';
import '../wuxia.css';
import { World } from '../../../convex/aiTown/world';
import { WorldMap } from '../../../convex/aiTown/worldMap';
import { PlayerDescription } from '../../../convex/aiTown/playerDescription';
import { AgentDescription } from '../../../convex/aiTown/agentDescription';
import { parseMap } from '../../../convex/util/object';
import { dayTint } from '../../../convex/wuxia/clock';
import { PixiStaticMap } from '../../components/PixiStaticMap';
import PixiViewport from '../../components/PixiViewport';
import { Player } from '../../components/Player';
import Button from '../../components/buttons/Button';
import type { ServerGame } from '../../hooks/serverGame';
import { ClockBadge } from '../ClockBadge';
import { PlayerCard } from '../PlayerCard';
import { SkinLayers } from '../SkinLayers';
import { TownSubtitle, TownTitle } from '../Shell';
import { activityLabel, skinEnabled, worldClock } from '../skin';
import { useViewportZoom, wholeMapScale } from '../viewport';
import { LifePanel } from '../LifePanel';
import { TownStatus } from '../TownStatus';
import { lifeOf } from '../life';

type ShotState = {
  engineTime: number;
  world: any;
  playerDescriptions: any[];
  agentDescriptions: any[];
  worldMap: any;
  hash: string;
};
type ShotOptions = { focus?: { x: number; y: number; scale: number }; selected?: string };

declare global {
  interface Window {
    __WUXIA_STATE__?: ShotState;
    __WUXIA_SHOT__?: ShotOptions;
    __WUXIA_READY__?: boolean;
  }
}

function toGame(state: ShotState): ServerGame {
  return {
    world: new World(state.world),
    playerDescriptions: parseMap(state.playerDescriptions, PlayerDescription, (p) => p.playerId),
    agentDescriptions: parseMap(state.agentDescriptions, AgentDescription, (a) => a.agentId),
    worldMap: new WorldMap(state.worldMap),
  };
}

function Scene(props: { game: ServerGame; width: number; height: number; time: number; opts: ShotOptions }) {
  const app = useApp();
  const viewportRef = useRef<Viewport | undefined>();
  const { width, height, tileDim } = props.game.worldMap;
  const skin = skinEnabled(props.game.world);
  const zoom = useViewportZoom(viewportRef);
  const clock = skin ? worldClock(props.game.world, props.time) : null;
  const focus = props.opts.focus
    ? { x: props.opts.focus.x * tileDim, y: props.opts.focus.y * tileDim, scale: props.opts.focus.scale }
    : undefined;
  return (
    <PixiViewport
      app={app}
      screenWidth={props.width}
      screenHeight={props.height}
      worldWidth={width * tileDim}
      worldHeight={height * tileDim}
      viewportRef={viewportRef}
      wuxiaMinScale={skin ? wholeMapScale(props.width, props.height, width * tileDim, height * tileDim) : undefined}
      wuxiaFocus={focus}
    >
      <PixiStaticMap map={props.game.worldMap} />
      {[...props.game.world.players.values()].map((p) => (
        <Player
          key={p.id}
          game={props.game}
          player={p}
          isViewer={false}
          onClick={() => {}}
          historicalTime={props.time}
        />
      ))}
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
}

function ShotApp({ state, opts }: { state: ShotState; opts: ShotOptions }) {
  const game = useMemo(() => toGame(state), [state]);
  const skin = skinEnabled(game.world);
  const [ref, { width, height }] = useElementSize();
  useEffect(() => {
    document.body.classList.toggle('wuxia-skin', skin);
  }, [skin]);
  const clock = skin ? worldClock(game.world, state.engineTime) : null;
  const players = [...game.world.players.values()];
  const selected = players.find((p) => p.id === opts.selected) ?? players[0];
  const desc = selected ? game.playerDescriptions.get(selected.id) : undefined;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (width > 0 && !ready) {
      const t = setTimeout(() => {
        setReady(true);
        window.__WUXIA_READY__ = true;
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [width, ready]);
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between font-body game-background">
      <div className="w-full lg:h-screen min-h-screen relative isolate overflow-hidden lg:p-8 shadow-2xl flex flex-col justify-start">
        <h1 className="mx-auto text-4xl p-3 sm:text-8xl lg:text-9xl font-bold font-display leading-none tracking-wide game-title w-full text-left sm:text-center sm:w-auto">
          <TownTitle skin={skin} />
        </h1>
        <div className="max-w-xs md:max-w-xl lg:max-w-none mx-auto my-4 text-center text-base sm:text-xl md:text-2xl text-white leading-tight shadow-solid">
          <TownSubtitle skin={skin} />
        </div>
        <div className="mx-auto w-full max-w grid grid-rows-[290px_1fr] lg:grid-rows-[1fr] lg:grid-cols-[1fr_auto] lg:grow max-w-[1400px] min-h-[480px] game-frame">
          <div className="relative overflow-hidden bg-brown-900" ref={ref}>
            {skin && <ClockBadge clock={clock} phase={clock ? dayTint(clock.minuteOfDay).phase : undefined} />}
            <TownStatus
              life={lifeOf(game.world)}
              players={players}
              nameOf={(id) => game.playerDescriptions.get(id as any)?.name ?? id}
            />
            <div className="absolute inset-0">
              <Stage width={width} height={height} options={{ backgroundColor: skin ? 0xe2d5b4 : 0x7ab5ff, antialias: true }}>
                {width > 0 && <Scene game={game} width={width} height={height} time={state.engineTime} opts={opts} />}
              </Stage>
            </div>
          </div>
          <div className="flex flex-col overflow-y-auto shrink-0 px-4 py-6 sm:px-6 lg:w-96 xl:pr-6 border-t-8 sm:border-t-0 sm:border-l-8 border-brown-900 bg-brown-800 text-brown-100">
            {selected && (
              <>
                <div className="box w-full">
                  <h2 className="bg-brown-700 p-2 font-display text-2xl sm:text-4xl tracking-wider shadow-solid text-center">
                    {desc?.name}
                  </h2>
                </div>
                <PlayerCard
                  skin={skin}
                  position={selected.position}
                  activity={activityLabel(selected.activity?.description, skin)}
                />
                <LifePanel life={lifeOf(game.world)} playerId={selected.id} clock={clock} />
                <div className="desc my-6">
                  <p className="leading-tight text-base sm:text-sm">{desc?.description}</p>
                </div>
              </>
            )}
          </div>
        </div>
        <footer className="justify-end bottom-0 left-0 w-full flex items-center mt-4 gap-3 p-6 flex-wrap pointer-events-none">
          <div className="flex gap-4 flex-grow pointer-events-none">
            <Button imgUrl="/ai-town/wuxia/ui/join.svg">進鎮</Button>
            <Button imgUrl="/ai-town/wuxia/ui/about.svg">關於</Button>
          </div>
          <small className="opacity-60">state {state.hash.slice(0, 12)}</small>
        </footer>
      </div>
    </main>
  );
}

async function boot() {
  let state = window.__WUXIA_STATE__;
  const params = new URLSearchParams(location.search);
  if (!state && params.get('state')) state = await (await fetch(params.get('state')!)).json();
  if (!state) {
    document.body.textContent = '缺少狀態：請用 npm run wuxia:shot，或在網址加 ?state=匯出的 JSON';
    return;
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ShotApp state={state} opts={window.__WUXIA_SHOT__ ?? {}} />
    </React.StrictMode>,
  );
}
void boot();
