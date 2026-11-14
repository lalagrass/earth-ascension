// 武俠小鎮 A1（#564 第 1–3 項＋審查第 3、4 項）：單機版畫面。
// 首頁：小印章標題、現況副標、「開始」「讀取存檔」。遊戲：地圖佔滿視窗；左上印章＋時辰；右上三個小鈕（鎮況、鎮誌、武館）；
// 下方時間控制列（暫停、1×、4×、16×、64×、跳到明早、跳到下一件事、自動降速）；右側只在選了人時開「選中的人」，可收合。
// 引擎走 src/wuxia/engine/ 的 local 實作（Web Worker），整個畫面不連後端、不打 LLM。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, useApp } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { useElementSize } from 'usehooks-ts';
import { World } from '../../../convex/aiTown/world';
import { WorldMap } from '../../../convex/aiTown/worldMap';
import { PlayerDescription } from '../../../convex/aiTown/playerDescription';
import { AgentDescription } from '../../../convex/aiTown/agentDescription';
import { parseMap } from '../../../convex/util/object';
import { dayTint } from '../../../convex/wuxia/clock';
import { OBJECT_BY_ID } from '../../../convex/wuxia/w03_life/data';
import { defaultWuxiaConfig } from '../../../convex/wuxia/state';
import { PixiStaticMap } from '../../components/PixiStaticMap';
import PixiViewport from '../../components/PixiViewport';
import { Player } from '../../components/Player';
import type { ServerGame } from '../../hooks/serverGame';
import { ClockBadge } from '../ClockBadge';
import { PlayerCard } from '../PlayerCard';
import { SkinLayers } from '../SkinLayers';
import { TownSubtitle } from '../Shell';
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
import { BondPanel, DetailTab, DetailTabs } from '../BondPanel';
import { A2Hints, ArtPanel, LineagePanel, TaijiToggle } from '../A2Panels';
import { A2Layer } from '../A2Layer';
import { SocialLayer } from '../SocialLayer';
import { SocialFeed, SocialMenu, TranslatePop, cidOfPid, pidOfCid as pidOfCidA3 } from '../A3Panels';
import { a3StateOf, cidName } from '../a3';
import type { SocialEntry } from '../../../convex/wuxia/a3_silent/data';
import { a2StateOf } from '../a2';
import { DojoPanel } from '../DojoPanel';
import { plaqueName } from '../bond';
import { ChroniclePanel } from '../ChroniclePanel';
import { JianghuLayer } from '../JianghuLayer';
import { PlayerPanel, PersonActions } from '../PlayerPanel';
import { PLAYER_ROLES, myRec, objectAtTile, playerStateOfWorld, rolesOffered } from '../player';
import { LocalEngine } from '../engine/local';
import type { EngineView, KeyEvent, SaveFile, Speed } from '../engine';
import { SPEEDS, RULE_VERSION } from '../engine/constants';
import { SaveSlot, listSlots, putSlot, slotOf, deleteSlot } from '../engine/idb';

const LOCAL_TOKEN = 'local-player';
const SPEED_LABEL: Record<number, string> = { 0: '⏸', 1: '1×', 4: '4×', 16: '16×', 64: '64×' };

function toGame(view: EngineView): ServerGame | undefined {
  const d = view.descriptions;
  if (!d) return undefined;
  return {
    world: new World(view.world),
    playerDescriptions: parseMap(d.playerDescriptions, PlayerDescription, (p) => p.playerId),
    agentDescriptions: parseMap(d.agentDescriptions, AgentDescription, (a) => a.agentId),
    worldMap: new WorldMap(d.worldMap),
  };
}

function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function LocalApp() {
  const [engine, setEngine] = useState<LocalEngine>();
  const [error, setError] = useState<string>();
  const start = useCallback(async (init: { kind: 'new'; seed: number } | { kind: 'load'; save: SaveFile }) => {
    const e = new LocalEngine();
    e.onError = (m) => setError(m.split('\n')[0]);
    const r = await e.init(init.kind === 'new' ? { kind: 'new', world: { seed: init.seed } } : init);
    if (!r.ok) {
      e.dispose();
      setError(r.reason);
      return;
    }
    setError(undefined);
    // 檢查工具（tools/wuxia/local-check.ts）用：讀 hash、直接跑幾步
    (window as any).__WUXIA_ENGINE__ = e;
    setEngine(e);
  }, []);
  if (!engine)
    return <Home onStart={start} error={error} />;
  return (
    <GameScreen
      engine={engine}
      onHome={() => {
        engine.dispose();
        setEngine(undefined);
      }}
      error={error}
    />
  );
}

function Home(props: { onStart: (i: { kind: 'new'; seed: number } | { kind: 'load'; save: SaveFile }) => void; error?: string }) {
  const [slots, setSlots] = useState<SaveSlot[]>();
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const seed = Number(new URLSearchParams(location.search).get('seed') ?? defaultWuxiaConfig.seed);
  return (
    <main className="wuxia-a1-home" data-testid="wuxia-home">
      <div className="wuxia-a1-home-card">
        <h1 className="wuxia-a1-home-title">
          山腳鎮<span className="wuxia-title-seal">武俠</span>
        </h1>
        <p className="wuxia-a1-home-sub">
          <TownSubtitle skin />
        </p>
        <div className="wuxia-a1-home-actions">
          <button className="wuxia-a1-btn big" data-testid="wuxia-start" onClick={() => props.onStart({ kind: 'new', seed })}>
            開始
          </button>
          <button
            className="wuxia-a1-btn big"
            data-testid="wuxia-load"
            onClick={() => {
              setLoading(true);
              void listSlots()
                .then(setSlots)
                .catch(() => setSlots([]))
                .finally(() => setLoading(false));
            }}
          >
            讀取存檔
          </button>
        </div>
        {loading && <p>讀取中…</p>}
        {slots && (
          <div className="wuxia-a1-slots" data-testid="wuxia-slots">
            {slots.length === 0 && <p>瀏覽器裡還沒有存檔。</p>}
            {slots.map((s) => (
              <div key={s.key} className="wuxia-a1-slot">
                <button className="wuxia-a1-btn" onClick={() => props.onStart({ kind: 'load', save: s.save })}>
                  {s.kind === 'auto' ? '自動存檔' : '手動存檔'}・第 {s.day} 日・種子 {s.seed}
                  {s.ruleVersion !== RULE_VERSION && <small>（規則版本 {s.ruleVersion}，讀不了）</small>}
                </button>
                <button className="wuxia-a1-x" aria-label="刪除" onClick={() => void deleteSlot(s.key).then(() => listSlots().then(setSlots))}>
                  ×
                </button>
              </div>
            ))}
            <button className="wuxia-a1-btn" onClick={() => fileRef.current?.click()}>
              從檔案匯入…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              data-testid="wuxia-import"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                void f.text().then((t) => {
                  try {
                    props.onStart({ kind: 'load', save: JSON.parse(t) });
                  } catch {
                    props.onStart({ kind: 'load', save: {} as SaveFile });
                  }
                });
              }}
            />
          </div>
        )}
        {props.error && (
          <p className="wuxia-a1-error" data-testid="wuxia-error">
            {props.error}
          </p>
        )}
        <p className="wuxia-a1-home-foot">單機版：整個小鎮在你的瀏覽器裡跑，不需要伺服器，也不連任何語言模型。基於 AI Town（MIT）。</p>
      </div>
    </main>
  );
}

type Focus = { x: number; y: number; n: number };

function Scene(props: {
  game: ServerGame;
  width: number;
  height: number;
  time: number;
  selected?: string;
  focus?: Focus;
  showTaiji: boolean;
  onSelect: (id: string) => void;
  onTile: (x: number, y: number) => void;
  onSocial?: (e: SocialEntry) => void;
}) {
  const app = useApp();
  const viewportRef = useRef<Viewport | undefined>();
  const { width, height, tileDim } = props.game.worldMap;
  const skin = skinEnabled(props.game.world);
  const zoom = useViewportZoom(viewportRef);
  const clock = skin ? worldClock(props.game.world, props.time) : null;
  const drag = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!props.focus || !viewportRef.current) return;
    viewportRef.current.animate({
      position: new PIXI.Point(props.focus.x * tileDim, props.focus.y * tileDim),
      scale: Math.max(viewportRef.current.scale.x, 1.2),
      time: 600,
    });
  }, [props.focus?.n]);
  return (
    <PixiViewport
      app={app}
      screenWidth={props.width}
      screenHeight={props.height}
      worldWidth={width * tileDim}
      worldHeight={height * tileDim}
      viewportRef={viewportRef}
      wuxiaMinScale={skin ? wholeMapScale(props.width, props.height, width * tileDim, height * tileDim) : undefined}
    >
      <PixiStaticMap
        map={props.game.worldMap}
        onpointerdown={(e: any) => (drag.current = { x: e.screenX, y: e.screenY })}
        onpointerup={(e: any) => {
          const d = drag.current;
          drag.current = null;
          if (d && Math.hypot(d.x - e.screenX, d.y - e.screenY) > 10) return;
          const vp = viewportRef.current;
          if (!vp) return;
          const p = vp.toWorld(e.screenX, e.screenY);
          props.onTile(p.x / tileDim, p.y / tileDim);
        }}
      />
      {skin && <DojoLayer tileDim={tileDim} open={dojoOpened(props.game.world)} plaque={plaqueName(props.game.world)} />}
      {[...props.game.world.players.values()].map((p) => (
        <Player
          key={p.id}
          game={props.game}
          player={p}
          isViewer={p.human === LOCAL_TOKEN}
          onClick={(el) => el && props.onSelect(el.id)}
          historicalTime={props.time}
          wuxiaSelected={p.id === props.selected}
        />
      ))}
      {skin && (
        <A2Layer wuxia={props.game.world.wuxia} tileDim={tileDim} showTaiji={props.showTaiji} pos={(id) => props.game.world.players.get(id as any)?.position} />
      )}
      {skin && (
        <SocialLayer wuxia={props.game.world.wuxia} tileDim={tileDim} pos={(id) => props.game.world.players.get(id as any)?.position} onPick={props.onSocial} />
      )}
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
        <SkinLayers worldWidthPx={width * tileDim} worldHeightPx={height * tileDim} tileDim={tileDim} zoom={zoom} clock={clock} />
      )}
    </PixiViewport>
  );
}

function GameScreen(props: { engine: LocalEngine; onHome: () => void; error?: string }) {
  const { engine } = props;
  const [view, setView] = useState<EngineView>();
  const [toast, setToast] = useState<string>();
  const [selected, setSelected] = useState<string>();
  const [detailOpen, setDetailOpen] = useState(true);
  const [panel, setPanel] = useState<'status' | 'chronicle' | 'dojo' | 'lineage' | 'social' | 'me' | 'save'>();
  const [social, setSocial] = useState<SocialEntry>();
  const [tab, setTab] = useState<DetailTab>('main');
  const [taiji, setTaiji] = useState(false);
  const [obj, setObj] = useState<string>();
  const [result, setResult] = useState<{ ok: boolean; reason: string }>();
  const [autoSlow, setAutoSlow] = useState(true);
  const [focus, setFocus] = useState<Focus>();
  const [lastSpeed, setLastSpeed] = useState<Speed>(1);
  const [ref, { width, height }] = useElementSize();
  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast((x) => (x === t ? undefined : x)), 3500);
  };
  useEffect(() => {
    const off = engine.subscribe((v, events: KeyEvent[]) => {
      setView(v);
      for (const e of events) {
        showToast(e.label);
        if (e.at) setFocus((f) => ({ x: e.at!.x, y: e.at!.y, n: (f?.n ?? 0) + 1 }));
      }
    });
    const offDay = engine.onNewDay((day) => {
      // 自動存檔：每遊戲日一次（覆寫同一格）
      void engine.save(`第 ${day} 日自動存檔`).then((s) => putSlot(slotOf(s, 'auto', new Date().toISOString())));
    });
    engine.setSpeed(1);
    return () => {
      off();
      offDay();
    };
  }, [engine]);
  const game = useMemo(() => (view ? toGame(view) : undefined), [view]);
  if (!view || !game) return <div className="wuxia-a1-loading">小鎮準備中…</div>;
  const skin = skinEnabled(game.world);
  const clock = skin ? worldClock(game.world, view.engineTime) : null;
  const players = [...game.world.players.values()];
  const me = players.find((p) => p.human === LOCAL_TOKEN);
  const myRecord = myRec(game.world, me?.id);
  const sel = players.find((p) => p.id === selected);
  const desc = sel ? game.playerDescriptions.get(sel.id) : undefined;
  const speed = view.speed;
  const setSpeed = (s: Speed) => {
    if (s > 0) setLastSpeed(s);
    engine.setSpeed(s);
  };
  const act = (args: any) =>
    void engine.sendInput('wuxiaPlayerAct', { human: LOCAL_TOKEN, ...args }).then((r: any) => {
      const v = r?.kind === 'ok' ? r.value : r;
      const res = v && typeof v === 'object' && 'ok' in v ? v : { ok: r?.kind !== 'error', reason: r?.message ?? '已送出' };
      setResult(res);
      if (res.ok) setObj(undefined);
    });
  // A2：點提示／譜系裡的名字＝選中那人並把鏡頭移過去
  const pickPerson = (pid: string) => {
    setSelected(pid);
    setDetailOpen(true);
    const p = game.world.players.get(pid as any);
    if (p) setFocus((f) => ({ x: p.position.x, y: p.position.y, n: (f?.n ?? 0) + 1 }));
  };
  // A3：人物 id → 名字（玩家角色用進鎮時的名字）
  const nameOfCid = (cid: string) => {
    const pid = Object.keys(lifeOf(game.world)?.people ?? {}).find((k) => lifeOf(game.world)!.people[k].cid === cid);
    return (pid && game.playerDescriptions.get(pid as any)?.name) || cidName(cid);
  };
  // A3：點動靜的一行＝翻成一句話，鏡頭移到發起的人（不開人物詳情）
  const pickSocial = (e: SocialEntry) => {
    setSocial(e);
    const pid = pidOfCidA3(game.world.wuxia, e.a);
    const p = pid ? game.world.players.get(pid as any) : undefined;
    if (p) setFocus((f) => ({ x: p.position.x, y: p.position.y, n: (f?.n ?? 0) + 1 }));
  };
  const togglePanel = (p: typeof panel) => setPanel((x) => (x === p ? undefined : p));
  const manualSave = async () => {
    const s = await engine.save('手動存檔');
    await putSlot(slotOf(s, 'manual', new Date().toISOString()));
    showToast('已存檔（瀏覽器）');
  };
  return (
    <div className="wuxia-a1-game" data-testid="wuxia-game">
      <div className="wuxia-a1-map" ref={ref}>
        <Stage width={width} height={height} options={{ backgroundColor: 0xe2d5b4, antialias: true }}>
          {width > 0 && (
            <Scene
              game={game}
              width={width}
              height={height}
              time={view.engineTime}
              selected={selected}
              focus={focus}
              showTaiji={taiji}
              onSelect={(id) => {
                setSelected(id);
                setDetailOpen(true);
              }}
              onSocial={setSocial}
              onTile={(x, y) => {
                if (!me) return;
                const o = myRecord ? objectAtTile(game.world, x, y) : undefined;
                if (o) {
                  setObj(o.id);
                  setResult(undefined);
                  setPanel('me');
                  return;
                }
                void engine.sendInput('moveTo', { playerId: me.id, destination: { x: Math.floor(x), y: Math.floor(y) } });
              }}
            />
          )}
        </Stage>
      </div>
      {/* 左上：印章＋時辰 */}
      <div className="wuxia-a1-seal-row">
        <button className="wuxia-a1-seal" title="回首頁" onClick={props.onHome} data-testid="wuxia-seal">
          山腳鎮
        </button>
        {clock && <ClockBadge clock={clock} phase={dayTint(clock.minuteOfDay).phase} />}
      </div>
      {/* 右上：三個小鈕＋進鎮、存檔 */}
      <div className="wuxia-a1-corner">
        <button className={panel === 'status' ? 'on' : ''} onClick={() => togglePanel('status')} data-testid="wuxia-btn-status">
          鎮況
        </button>
        <button className={panel === 'chronicle' ? 'on' : ''} onClick={() => togglePanel('chronicle')} data-testid="wuxia-btn-chronicle">
          鎮誌
        </button>
        <button className={panel === 'dojo' ? 'on' : ''} onClick={() => togglePanel('dojo')} data-testid="wuxia-btn-dojo">
          武館
        </button>
        {a2StateOf(game.world) && (
          <button className={panel === 'lineage' ? 'on' : ''} onClick={() => togglePanel('lineage')} data-testid="wuxia-btn-lineage">
            傳承
          </button>
        )}
        {a3StateOf(game.world) && (
          <button className={panel === 'social' ? 'on' : ''} onClick={() => togglePanel('social')} data-testid="wuxia-btn-social">
            動靜
          </button>
        )}
        {a2StateOf(game.world) && <TaijiToggle on={taiji} onChange={setTaiji} />}
        {rolesOffered() && (
          <button className={panel === 'me' ? 'on' : ''} onClick={() => togglePanel('me')} data-testid="wuxia-btn-me">
            {me ? '我' : '進鎮'}
          </button>
        )}
        <button className={panel === 'save' ? 'on' : ''} onClick={() => togglePanel('save')} data-testid="wuxia-btn-save">
          存檔
        </button>
      </div>
      {panel && (
        <div className="wuxia-a1-popover" data-testid={`wuxia-pop-${panel}`}>
          {panel === 'status' && (
            <TownStatus life={lifeOf(game.world)} players={players} nameOf={(id) => game.playerDescriptions.get(id as any)?.name ?? id} />
          )}
          {panel === 'chronicle' && <ChroniclePanel world={game.world} />}
          {panel === 'lineage' && <LineagePanel wuxia={game.world.wuxia} onPick={pickPerson} />}
          {panel === 'social' && <SocialFeed wuxia={game.world.wuxia} nameOf={nameOfCid} onPick={pickSocial} />}
          {panel === 'dojo' && (dojoOpened(game.world) ? <DojoPanel wuxia={game.world.wuxia} /> : <p className="wuxia-a1-note">武館還沒重開。</p>)}
          {panel === 'me' && (
            <PlayerPanel
              offered={rolesOffered()}
              joined={!!me}
              state={playerStateOfWorld(game.world)}
              me={myRecord}
              object={obj ? OBJECT_BY_ID[obj] : undefined}
              lastResult={result}
              onJoin={(roleId) => {
                const role = PLAYER_ROLES.find((r) => r.id === roleId)!;
                void engine.sendInput('join', {
                  name: role.label,
                  character: role.sprite,
                  description: role.identity,
                  tokenIdentifier: LOCAL_TOKEN,
                  wuxiaRole: role.id,
                });
              }}
              onAct={(o, a) => act({ kind: 'activity', obj: o, act: a })}
              onCloseObject={() => setObj(undefined)}
              onPause={(p) => setSpeed(p ? 0 : lastSpeed)}
              onExport={() => void engine.save('匯出').then((s) => download(`shanjiao-day${Math.floor(Math.max(0, s.gameMinute) / 1440) + 1}.json`, s))}
            />
          )}
          {panel === 'save' && (
            <div className="wuxia-a1-savemenu" data-testid="wuxia-savemenu">
              <button className="wuxia-a1-btn" onClick={() => void manualSave()} data-testid="wuxia-save-now">
                存到瀏覽器
              </button>
              <button
                className="wuxia-a1-btn"
                data-testid="wuxia-export"
                onClick={() =>
                  void engine.save('匯出').then((s) => download(`shanjiao-day${Math.floor(Math.max(0, s.gameMinute) / 1440) + 1}.json`, s))
                }
              >
                匯出存檔檔案
              </button>
              <button className="wuxia-a1-btn" onClick={props.onHome}>
                回首頁（讀取其他存檔）
              </button>
              <p className="wuxia-a1-note">每過一個遊戲日自動存一次。規則版本 {RULE_VERSION}。</p>
            </div>
          )}
        </div>
      )}
      {/* 右側：選中的人（可收合） */}
      {sel && (
        <aside className={`wuxia-a1-detail ${detailOpen ? '' : 'closed'}`} data-testid="wuxia-detail">
          <div className="wuxia-a1-detail-head">
            <button onClick={() => setDetailOpen(!detailOpen)} aria-label="收合">
              {detailOpen ? '▸' : '◂'}
            </button>
            <b>{desc?.name}</b>
            <button onClick={() => setSelected(undefined)} aria-label="關閉">
              ×
            </button>
          </div>
          {detailOpen && (
            <div className="wuxia-a1-detail-body">
              <PlayerCard skin={skin} position={sel.position} activity={activityLabel(sel.activity?.description, skin)} />
              {me && sel.id !== me.id && myRecord && (
                <PersonActions name={desc?.name ?? ''} lastResult={result} onAct={(kind) => act({ kind, target: sel.id })} />
              )}
              {me && sel.id !== me.id && myRecord && (
                <SocialMenu
                  wuxia={game.world.wuxia}
                  me={myRecord.cid}
                  target={cidOfPid(game.world.wuxia, sel.id)}
                  onAct={(kind) => act({ kind: 'social', act: kind, target: sel.id })}
                />
              )}
              <DetailTabs
                wuxia={game.world.wuxia}
                tab={tab}
                onTab={setTab}
                bond={<BondPanel wuxia={game.world.wuxia} playerId={sel.id} />}
                art={<ArtPanel wuxia={game.world.wuxia} playerId={sel.id} />}
                main={
                  <>
                    <LifePanel life={lifeOf(game.world)} playerId={sel.id} clock={clock} enabled={game.world.wuxia?.enabled} wuxia={game.world.wuxia} />
                    <SkillPanel dojo={dojoOf(game.world)} life={lifeOf(game.world)} playerId={sel.id} />
                    <MindPanel wuxia={game.world.wuxia} playerId={sel.id} />
                  </>
                }
              />
              <p className="wuxia-a1-desc">{desc?.description}</p>
            </div>
          )}
        </aside>
      )}
      {/* 下方：時間控制列 */}
      <div className="wuxia-a1-timebar" data-testid="wuxia-timebar">
        {SPEEDS.map((s) => (
          <button key={s} className={speed === s && !view.skipping ? 'on' : ''} onClick={() => setSpeed(s)} data-testid={`wuxia-speed-${s}`}>
            {SPEED_LABEL[s]}
          </button>
        ))}
        <button className={view.skipping === 'morning' ? 'on' : ''} onClick={() => engine.skip('morning')} data-testid="wuxia-skip-morning">
          跳到明早
        </button>
        <button className={view.skipping === 'next-event' ? 'on' : ''} onClick={() => engine.skip('next-event')} data-testid="wuxia-skip-event">
          跳到下一件事
        </button>
        <label className="wuxia-a1-auto">
          <input
            type="checkbox"
            checked={autoSlow}
            onChange={(e) => {
              setAutoSlow(e.target.checked);
              engine.setAutoSlow(e.target.checked);
            }}
          />
          大事自動慢下來
        </label>
      </div>
      <A2Hints wuxia={game.world.wuxia} onPick={pickPerson} />
      <TranslatePop
        entry={social}
        wuxia={game.world.wuxia}
        nameOf={nameOfCid}
        onClose={() => setSocial(undefined)}
        onWho={(cid) => {
          const pid = pidOfCidA3(game.world.wuxia, cid);
          if (pid) pickPerson(pid);
        }}
      />
      {toast && <div className="wuxia-a1-toast">{toast}</div>}
      {props.error && <div className="wuxia-a1-error floating">{props.error}</div>}
    </div>
  );
}
