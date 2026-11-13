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
import { DojoLayer } from '../DojoLayer';
import { SkillPanel } from '../SkillPanel';
import { MindPanel } from '../MindPanel';
import { dojoOf, dojoOpened } from '../dojo';
import { SparLayer } from '../SparLayer';
import { BondPanel, DetailTabs } from '../BondPanel';
import { DojoPanel } from '../DojoPanel';
import { plaqueName } from '../bond';
import { ChroniclePanel } from '../ChroniclePanel';
import { JianghuLayer } from '../JianghuLayer';
import { PlayerPanel, PersonActions } from '../PlayerPanel';
import { myRec, playerStateOfWorld, rolesOffered } from '../player';
import { OBJECT_BY_ID } from '../../../convex/wuxia/w03_life/data';

type ShotState = {
  engineTime: number;
  world: any;
  playerDescriptions: any[];
  agentDescriptions: any[];
  worldMap: any;
  hash: string;
};
type ShotOptions = {
  focus?: { x: number; y: number; scale: number };
  selected?: string;
  /** W4：盲測用，不顯示時辰（左上角）與狀態 hash */
  blind?: boolean;
  /** W6：GIF 逐格——畫面上不疊時辰牌與鎮況（只截地圖） */
  gif?: boolean;
  /** W7：人物詳情開哪個分頁（'bond'＝關係） */
  tab?: 'main' | 'bond';
  /** W9：玩家自己的 player id（玩家面板顯示他）；menu＝開著哪個物件的活動選單 */
  me?: string;
  menu?: string;
};

declare global {
  interface Window {
    __WUXIA_STATE__?: ShotState;
    __WUXIA_SHOT__?: ShotOptions;
    __WUXIA_READY__?: boolean;
    __WUXIA_FRAME__?: (s: ShotState | null, time?: number) => void;
    __WUXIA_FRAME_DONE__?: number;
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
      {skin && <DojoLayer tileDim={tileDim} open={dojoOpened(props.game.world)} plaque={plaqueName(props.game.world)} />}
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
      {skin && <JianghuLayer world={props.game.world} tileDim={tileDim} time={props.time} />}
      {skin && (
        <SparLayer
          world={props.game.world}
          time={props.time}
          tileDim={tileDim}
          pos={(id) => props.game.world.players.get(id as any)?.position}
        />
      )}
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

function ShotApp({ state: initial, opts }: { state: ShotState; opts: ShotOptions }) {
  // W6：GIF 逐格——截圖工具用 __WUXIA_FRAME__(狀態, 畫面時間) 換格，畫好後 __WUXIA_FRAME_DONE__ 加一
  const [frame, setFrame] = useState<{ state: ShotState; time?: number; n: number }>({ state: initial, n: 0 });
  const state = frame.state;
  useEffect(() => {
    window.__WUXIA_FRAME__ = (s: ShotState | null, time?: number) =>
      setFrame((f) => ({ state: s ?? f.state, time, n: f.n + 1 }));
  }, []);
  useEffect(() => {
    if (frame.n === 0) return;
    requestAnimationFrame(() => requestAnimationFrame(() => (window.__WUXIA_FRAME_DONE__ = frame.n)));
  }, [frame.n]);
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
  if (opts.gif) {
    // W6：GIF 只要地圖——畫布佔滿整個視窗
    return (
      <div ref={ref} style={{ position: 'fixed', inset: 0 }}>
        <Stage width={width} height={height} options={{ backgroundColor: skin ? 0xe2d5b4 : 0x7ab5ff, antialias: true }}>
          {width > 0 && <Scene game={game} width={width} height={height} time={frame.time ?? state.engineTime} opts={opts} />}
        </Stage>
      </div>
    );
  }
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
            {skin && !opts.blind && !opts.gif && <ClockBadge clock={clock} phase={clock ? dayTint(clock.minuteOfDay).phase : undefined} />}
            {!opts.gif && (
              <TownStatus
                life={lifeOf(game.world)}
                players={players}
                nameOf={(id) => game.playerDescriptions.get(id as any)?.name ?? id}
              />
            )}
            {!opts.gif && <DojoPanel wuxia={game.world.wuxia} />}
            {!opts.gif && <ChroniclePanel world={game.world} max={8} />}
            <div className="absolute inset-0">
              <Stage width={width} height={height} options={{ backgroundColor: skin ? 0xe2d5b4 : 0x7ab5ff, antialias: true }}>
                {width > 0 && <Scene game={game} width={width} height={height} time={frame.time ?? state.engineTime} opts={opts} />}
              </Stage>
            </div>
          </div>
          <div className="flex flex-col overflow-y-auto shrink-0 px-4 py-6 sm:px-6 lg:w-96 xl:pr-6 border-t-8 sm:border-t-0 sm:border-l-8 border-brown-900 bg-brown-800 text-brown-100">
            {opts.me !== undefined && (
              <PlayerPanel
                offered={rolesOffered()}
                joined={!!opts.me}
                state={playerStateOfWorld(game.world)}
                me={myRec(game.world, opts.me)}
                object={opts.menu ? OBJECT_BY_ID[opts.menu] : undefined}
                onJoin={() => {}}
                onAct={() => {}}
                onCloseObject={() => {}}
                onPause={() => {}}
                onExport={() => {}}
              />
            )}
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
                {opts.me && selected.id !== opts.me && myRec(game.world, opts.me) && (
                  <PersonActions name={desc?.name ?? ''} onAct={() => {}} />
                )}
                <DetailTabs
                  wuxia={game.world.wuxia}
                  tab={opts.tab ?? 'main'}
                  onTab={() => {}}
                  bond={<BondPanel wuxia={game.world.wuxia} playerId={selected.id} />}
                  main={
                    <>
                      <LifePanel
                        life={lifeOf(game.world)}
                        playerId={selected.id}
                        clock={clock}
                        enabled={game.world.wuxia?.enabled}
                        wuxia={game.world.wuxia}
                      />
                      <SkillPanel dojo={dojoOf(game.world)} life={lifeOf(game.world)} playerId={selected.id} />
                      <MindPanel wuxia={game.world.wuxia} playerId={selected.id} />
                    </>
                  }
                />
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
          {!opts.blind && <small className="opacity-60">state {state.hash.slice(0, 12)}</small>}
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
