// 武俠小鎮 A4（#576）：緣分點、干預選單、目標面板、前五分鐘的說書人提示、結算畫面（含匯出 PNG）。只讀狀態；干預走 wuxiaIntervene input。
import { useEffect, useMemo, useRef, useState } from 'react';
import type { WuxiaState } from '../../convex/wuxia/state';
import {
  A4_PLAY,
  A4State,
  INTERVENTIONS,
  INTERVENTION_HINT,
  INTERVENTION_LABEL,
  InterventionKind,
  PLAY,
  SCENARIO_BY_ID,
  SCENARIOS,
  TIERS,
  TIER_LABEL,
  evalGoals,
} from '../../convex/wuxia/a4_play/data';
import { COACH_CID, MASTER_CID } from '../../convex/wuxia/a2_master/data';
import { placeName } from '../../convex/wuxia/w03_life/data';
import type { JianghuState } from '../../convex/wuxia/w08_jianghu/data';
import { buildCard, cardSvg } from './a4card';
import { cidName } from './a3';
import { lifePeople } from './a2';
import { SOUND } from './a4sound';

export function a4StateOf(wuxia: WuxiaState | undefined): A4State | undefined {
  return wuxia?.enabled[A4_PLAY] ? (wuxia.elements[A4_PLAY] as A4State | undefined) : undefined;
}

/** 左上時辰旁的「緣」：●●○ */
export function YuanBadge(props: { wuxia?: WuxiaState }) {
  const st = a4StateOf(props.wuxia);
  if (!st) return null;
  return (
    <span className="wuxia-a4-yuan" data-testid="wuxia-yuan" title="緣：每天回 1 點，最多 3 點；用來指路、引薦、傳話、接濟、說情">
      緣{' '}
      {Array.from({ length: PLAY.yuan.max }, (_, i) => (
        <i key={i} className={i < st.yuan ? 'on' : ''} />
      ))}
    </span>
  );
}

export type InterveneArgs = { kind: InterventionKind; target: string; other?: string; place?: string; rid?: number };

/** 點人 → 干預選單：花費、「可能的結果」（不保證）、要選的對象 */
export function FateMenu(props: { wuxia?: WuxiaState; target?: string; onAct: (a: InterveneArgs) => void; lastResult?: { ok: boolean; reason: string } }) {
  const st = a4StateOf(props.wuxia);
  const [kind, setKind] = useState<InterventionKind>();
  const [other, setOther] = useState<string>('');
  const [place, setPlace] = useState('plaza');
  const [rid, setRid] = useState<number>();
  if (!st || !props.target) return null;
  const t = props.target;
  const people = Object.values(lifePeople(props.wuxia))
    .filter((p) => !(p as { player?: boolean }).player && p.cid !== t)
    .map((p) => p.cid)
    .sort();
  const jh = props.wuxia?.enabled['w08-jianghu'] ? (props.wuxia.elements['w08-jianghu'] as JianghuState | undefined) : undefined;
  const rumors = (jh?.rumors ?? []).filter((r) => !(jh!.known[t] ?? []).some((h) => h.rid === r.id)).slice(-6).reverse();
  const masters = [MASTER_CID, COACH_CID].filter((m) => m !== t);
  const allowed = (k: InterventionKind) => (t === MASTER_CID ? k === 'intro' : true);
  const send = () => {
    if (!kind) return;
    const a: InterveneArgs = { kind, target: t };
    if (kind === 'guide') a.place = place;
    if (kind === 'intro') a.other = other || people[0];
    if (kind === 'whisper') a.rid = rid ?? rumors[0]?.id;
    if (kind === 'plead') a.other = other && masters.includes(other) ? other : masters[0];
    props.onAct(a);
    SOUND.fate();
  };
  return (
    <div className="wuxia-a4-menu" data-testid="wuxia-a4-menu">
      <b>推一把</b> <YuanBadge wuxia={props.wuxia} />
      {st.ended && <p className="wuxia-a1-note">這一局已經結算。</p>}
      <div className="wuxia-a4-opts">
        {INTERVENTIONS.filter(allowed).map((k) => (
          <button
            key={k}
            className={kind === k ? 'on' : ''}
            disabled={!!st.ended || st.yuan < PLAY.costs[k]}
            onClick={() => {
              setKind(k);
              setOther('');
            }}
            data-testid={`wuxia-fate-${k}`}
          >
            {INTERVENTION_LABEL[k]}
            <small>{'●'.repeat(PLAY.costs[k])}</small>
          </button>
        ))}
      </div>
      {kind && (
        <div className="wuxia-a4-pick">
          <p className="hint">可能的結果：{INTERVENTION_HINT[kind]}</p>
          {kind === 'guide' && (
            <select value={place} onChange={(e) => setPlace(e.target.value)} data-testid="wuxia-fate-place">
              {Object.keys(PLAY.guide.places).map((p) => (
                <option key={p} value={p}>
                  明早去{placeName(p)}
                </option>
              ))}
            </select>
          )}
          {kind === 'intro' && (
            <select value={other || people[0]} onChange={(e) => setOther(e.target.value)} data-testid="wuxia-fate-other">
              {people.map((c) => (
                <option key={c} value={c}>
                  去見{cidName(c)}
                </option>
              ))}
            </select>
          )}
          {kind === 'whisper' &&
            (rumors.length ? (
              <select value={rid ?? rumors[0].id} onChange={(e) => setRid(Number(e.target.value))} data-testid="wuxia-fate-rumor">
                {rumors.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.text.slice(0, 24)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="wuxia-a1-note">鎮上的傳聞他都聽過了。</p>
            ))}
          {kind === 'plead' && (
            <select value={other || masters[0]} onChange={(e) => setOther(e.target.value)} data-testid="wuxia-fate-master">
              {masters.map((m) => (
                <option key={m} value={m}>
                  向{cidName(m)}說情
                </option>
              ))}
            </select>
          )}
          <button className="wuxia-a1-btn" onClick={send} disabled={kind === 'whisper' && !rumors.length} data-testid="wuxia-fate-go">
            花 {PLAY.costs[kind]} 點緣
          </button>
        </div>
      )}
      {props.lastResult && <p className={`wuxia-a1-note ${props.lastResult.ok ? '' : 'bad'}`}>{props.lastResult.reason}</p>}
    </div>
  );
}

/** 目標面板：劇本、三級目標的進度與達成日 */
export function GoalPanel(props: { wuxia?: WuxiaState }) {
  const st = a4StateOf(props.wuxia);
  if (!st) return null;
  if (!st.scenario) return <p className="wuxia-a1-note">自由玩：沒有目標，緣照樣可以用。回首頁選一個劇本就有目標與結算。</p>;
  const sc = SCENARIO_BY_ID[st.scenario];
  const g = evalGoals(props.wuxia!, sc);
  return (
    <div className="wuxia-a4-goals" data-testid="wuxia-a4-goals">
      <b>
        {sc.name}（第 {st.day} / {st.daysLimit ?? sc.days} 日）
      </b>
      <p className="wuxia-a1-note">{sc.intro}</p>
      {TIERS.map((t) => (
        <div key={t} className={`tier ${t} ${st.goals[t] !== undefined ? 'got' : ''}`}>
          <span className="medal">{TIER_LABEL[t]}</span>
          <span className="label">{sc.goals[t].label}</span>
          <span className="v">
            {st.goals[t] !== undefined
              ? `第 ${st.goals[t]} 日達成`
              : g[t].conds.map((c, i) => <small key={i}>{fmtCond(sc.goals[t].all[i].k, c.value, c.need)}</small>)}
          </span>
        </div>
      ))}
      <p className="wuxia-a1-note">用了 {st.used.length} 次緣{st.ended ? `；第 ${st.ended.day} 日結算` : ''}。</p>
    </div>
  );
}

const SHARE_TEXT: Record<string, string> = { townShare: '會招', flawedShare: '走樣' };
function fmtCond(kind: string, v: number, need: number) {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  if (kind === 'flawedShare') return `${SHARE_TEXT[kind]} ${pct(v)}（要 ≤ ${pct(need)}）`;
  if (kind in SHARE_TEXT) return `${SHARE_TEXT[kind]} ${pct(v)}（要 ${pct(need)}）`;
  return `${v} / ${need}`;
}

/** 前五分鐘：說書人帶三步（不擋操作），做完就放手 */
export function Tutorial(props: { wuxia?: WuxiaState; picked: boolean; taiji: boolean }) {
  const st = a4StateOf(props.wuxia);
  const [closed, setClosed] = useState(false);
  if (!st || !st.scenario || closed) return null;
  const done = [props.picked, props.taiji, st.used.some((u) => u.kind === 'guide')];
  if (done.every(Boolean)) return null;
  const i = done.findIndex((d) => !d);
  return (
    <div className="wuxia-a4-tutorial" data-testid="wuxia-a4-tutorial">
      <span className="who">說書人</span>
      <span>
        {i + 1}／3　{PLAY.tutorial[i]}
      </span>
      <button onClick={() => setClosed(true)} aria-label="不用了">
        ×
      </button>
    </div>
  );
}

/** 開場一句旁白（劇本的開場說明），20 秒後自己收起 */
export function Opening(props: { wuxia?: WuxiaState }) {
  const st = a4StateOf(props.wuxia);
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 20000);
    return () => clearTimeout(t);
  }, []);
  if (!st?.scenario || !show || st.day > 1) return null; // 讀檔回到中途不再播開場
  const sc = SCENARIO_BY_ID[st.scenario];
  return (
    <div className="wuxia-a4-opening" data-testid="wuxia-a4-opening" onClick={() => setShow(false)}>
      <b>{sc.name}</b>
      <p>{sc.intro}</p>
    </div>
  );
}

export async function svgToPng(svg: string): Promise<Blob> {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 630;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
}

/** 結算畫面：卡片、故事、干預的後果鏈；匯出 PNG、再來一局 */
export function SettleScreen(props: { wuxia?: WuxiaState; onAgain?: (sameSeed: boolean) => void }) {
  const st = a4StateOf(props.wuxia);
  const [open, setOpen] = useState(true);
  const endedAt = st?.ended?.gm;
  const played = useRef<number>();
  useEffect(() => {
    if (endedAt !== undefined && played.current !== endedAt) {
      played.current = endedAt;
      setOpen(true);
      SOUND.settle();
    }
  }, [endedAt]);
  const card = useMemo(() => (st?.ended && props.wuxia ? buildCard(props.wuxia) : undefined), [endedAt]);
  if (!st?.ended || !card) return null;
  if (!open)
    return (
      <button className="wuxia-a4-reopen" onClick={() => setOpen(true)} data-testid="wuxia-a4-reopen">
        結算卡
      </button>
    );
  const svg = cardSvg(card);
  const exportPng = async () => {
    const blob = await svgToPng(svg);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wuxia-${card.scenarioId}-seed${card.seed}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <div className="wuxia-a4-settle" data-testid="wuxia-a4-settle">
      <div className="card" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="side">
        <b>干預與後果</b>
        {card.interventions.length === 0 && <p className="wuxia-a1-note">這一局一次也沒推，鎮子自己長成這樣。</p>}
        <ul>
          {card.interventions.slice(-8).map((iv) => (
            <li key={iv.id}>
              第 {iv.day} 日 {iv.label} {iv.target}
              {iv.after.length > 0 && <small> → {iv.after.slice(0, 2).map((a) => a.text).join('；')}</small>}
            </li>
          ))}
        </ul>
        <div className="actions">
          <button className="wuxia-a1-btn" onClick={() => void exportPng()} data-testid="wuxia-a4-png">
            匯出 PNG
          </button>
          {props.onAgain && (
            <>
              <button className="wuxia-a1-btn" onClick={() => props.onAgain!(false)} data-testid="wuxia-a4-again">
                再來一局（換 seed）
              </button>
              <button className="wuxia-a1-btn" onClick={() => props.onAgain!(true)}>
                同 seed 換做法
              </button>
            </>
          )}
          <button className="wuxia-a1-btn" onClick={() => setOpen(false)}>
            繼續看
          </button>
        </div>
      </div>
    </div>
  );
}

/** 首頁的劇本選單 */
export function ScenarioPicker(props: { onPick: (id: string) => void }) {
  return (
    <div className="wuxia-a4-scenarios" data-testid="wuxia-a4-scenarios">
      {SCENARIOS.map((s) => (
        <button key={s.id} className="wuxia-a1-btn" onClick={() => props.onPick(s.id)} data-testid={`wuxia-play-${s.id}`}>
          <b>{s.name}</b>
          <small>
            {s.days} 日・金：{s.goals.gold.label}
          </small>
        </button>
      ))}
    </div>
  );
}

/** 目標達成時響一下 */
export function useGoalSound(wuxia?: WuxiaState) {
  const st = a4StateOf(wuxia);
  const n = st ? Object.keys(st.goals).length : 0;
  const prev = useRef(n);
  useEffect(() => {
    if (n > prev.current) SOUND.goal();
    prev.current = n;
  }, [n]);
}

/** Convex 版：右上角「目標」鈕（緣、目標面板）＋結算畫面（伺服器世界不能就地重開，沒有「再來一局」） */
export function A4Corner(props: { wuxia?: WuxiaState }) {
  const [open, setOpen] = useState(false);
  useGoalSound(props.wuxia);
  if (!a4StateOf(props.wuxia)) return null;
  return (
    <div className="wuxia-a4-corner" data-testid="wuxia-a4-corner">
      <YuanBadge wuxia={props.wuxia} />
      <button className={open ? 'on' : ''} onClick={() => setOpen(!open)} data-testid="wuxia-btn-goals">
        目標
      </button>
      {open && (
        <div className="pop">
          <GoalPanel wuxia={props.wuxia} />
        </div>
      )}
      <SettleScreen wuxia={props.wuxia} />
    </div>
  );
}
