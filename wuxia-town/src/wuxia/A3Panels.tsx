// 武俠小鎮 A3（#574）：「鎮上動靜」面板、玩家互動選單、「翻成一句話」小窗、Convex 版角落鈕。只讀狀態，不改規則。
import { useEffect, useMemo, useState } from 'react';
import type { WuxiaState } from '../../convex/wuxia/state';
import type { SocialEntry } from '../../convex/wuxia/a3_silent/data';
import { traitsOf } from '../../convex/wuxia/a3_silent/data';
import { socialOptions } from '../../convex/wuxia/a3_silent';
import { renderSocial } from '../../convex/wuxia/a3_silent/grammar';
import { readClock } from '../../convex/wuxia/clock';
import { a3StateOf, cidName, llmFromEnv, translateEntry, Translated } from './a3';
import { lifePeople, pidOfCid } from './a2';
import { ICON_COL } from './SocialLayer';

const hhmm = (t: number) => {
  const c = readClock(t);
  return `第${c.day}日 ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
};

/** 16px 圖示（CSS 背景切圖） */
export function A3Icon(props: { k: string; size?: number }) {
  const at = ICON_COL[props.k];
  if (!at) return null;
  const s = props.size ?? 16;
  return (
    <span
      className="wuxia-a3-icon"
      style={{
        width: s,
        height: s,
        backgroundImage: `url(${import.meta.env.BASE_URL}wuxia/a3/icons.png)`,
        backgroundSize: `${12 * s}px ${3 * s}px`,
        backgroundPosition: `-${at[0] * s}px -${at[1] * s}px`,
      }}
    />
  );
}

/** 鎮上動靜：文法模板渲染的最近紀錄（新的在上）；點一行＝翻成一句話 */
export function SocialFeed(props: { wuxia?: WuxiaState; nameOf?: (cid: string) => string; onPick?: (e: SocialEntry) => void; limit?: number }) {
  const st = a3StateOf({ wuxia: props.wuxia });
  const lines = useMemo(() => {
    if (!st) return [];
    const recent = st.log.slice(-(props.limit ?? 40));
    return renderSocial(recent, props.nameOf ?? cidName, (c) => traitsOf(st, c)).reverse();
  }, [st, st?.log.length, st?.log[st.log.length - 1]?.id]);
  if (!st) return null;
  const byId = new Map(st.log.map((e) => [e.id, e]));
  return (
    <div className="wuxia-a3-feed" data-testid="wuxia-a3-feed">
      <b>鎮上動靜</b>
      {lines.length === 0 && <p className="wuxia-a2-note">還沒有動靜。</p>}
      {lines.map((l) => {
        const e = byId.get(l.id);
        return (
          <button key={l.id} className={`wuxia-a3-line ${e?.ok ? 'ok' : 'fail'}`} onClick={() => e && props.onPick?.(e)}>
            {e && <A3Icon k={e.kind} />}
            <span className="t">{hhmm(l.t)}</span> {l.text}
          </button>
        );
      })}
    </div>
  );
}

/** 玩家點人 → 這一刻做得到的互動（同一套規則），標難度 */
export function SocialMenu(props: { wuxia?: WuxiaState; me?: string; target?: string; onAct: (kind: string) => void; lastResult?: { ok: boolean; reason: string } }) {
  const st = a3StateOf({ wuxia: props.wuxia });
  if (!st || !props.me || !props.target) return null;
  const opts = socialOptions(props.wuxia, st.minute, props.me, props.target);
  return (
    <div className="wuxia-a3-menu" data-testid="wuxia-a3-menu">
      <b>互動</b>
      <div className="wuxia-a3-opts">
        {opts.map((o) => (
          <button key={o.id} onClick={() => props.onAct(o.id)} className={`d-${o.difficulty}`} data-testid={`wuxia-social-${o.id}`}>
            <A3Icon k={o.id} /> {o.label}
            <small>{o.difficulty}</small>
          </button>
        ))}
      </div>
      {props.lastResult && <p className={`wuxia-a1-note ${props.lastResult.ok ? '' : 'bad'}`}>{props.lastResult.reason}</p>}
    </div>
  );
}

/** 翻成一句話：句庫 → 可選 LLM → 文法模板（註明來源）。結果不進世界狀態 */
export function TranslatePop(props: { entry?: SocialEntry; wuxia?: WuxiaState; nameOf?: (cid: string) => string; onClose: () => void; onWho?: (cid: string) => void }) {
  const st = a3StateOf({ wuxia: props.wuxia });
  const [r, setR] = useState<Translated>();
  useEffect(() => {
    setR(undefined);
    if (!props.entry) return;
    let live = true;
    void translateEntry(props.entry, st, llmFromEnv()).then((x) => live && setR(x));
    return () => {
      live = false;
    };
  }, [props.entry?.id]);
  if (!props.entry) return null;
  const e = props.entry;
  const name = props.nameOf ?? cidName;
  return (
    <div className="wuxia-a3-translate" data-testid="wuxia-a3-translate">
      <div className="head">
        <A3Icon k={e.kind} size={20} />
        <A3Icon k={`t:${e.topic}`} size={20} />
        <button className="who" onClick={() => props.onWho?.(e.a)} data-testid="wuxia-a3-who-a">
          {name(e.a)}
        </button>
        →
        <button className="who" onClick={() => props.onWho?.(e.b)} data-testid="wuxia-a3-who-b">
          {name(e.b)}
        </button>
        <A3Icon k={`r:${e.react}`} size={20} />
        <button className="x" onClick={props.onClose} aria-label="關閉">
          ×
        </button>
      </div>
      <p className="say">{r ? (r.source === 'template' ? r.text : `${name(e.a)}：「${r.text}」`) : '翻譯中…'}</p>
      {r && <p className="src">{r.source === 'llm' ? 'LLM 翻的（存進句庫）' : r.source === 'library' ? '句庫' : r.note}</p>}
    </div>
  );
}

/** Convex 版：右上角「動靜」鈕＋面板＋翻譯小窗 */
export function A3Corner(props: { wuxia?: WuxiaState; pick?: SocialEntry; onPick: (e?: SocialEntry) => void; nameOf?: (cid: string) => string; onWho?: (cid: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!a3StateOf({ wuxia: props.wuxia })) return null;
  return (
    <div className="wuxia-a3-corner" data-testid="wuxia-a3-corner">
      <button className={open ? 'on' : ''} onClick={() => setOpen(!open)} data-testid="wuxia-btn-social">
        動靜
      </button>
      {open && <SocialFeed wuxia={props.wuxia} nameOf={props.nameOf} onPick={props.onPick} />}
      <TranslatePop entry={props.pick} wuxia={props.wuxia} nameOf={props.nameOf} onClose={() => props.onPick(undefined)} onWho={props.onWho} />
    </div>
  );
}

/** 選中的人的人物 id（給互動選單） */
export function cidOfPid(wuxia: WuxiaState | undefined, pid: string | undefined): string | undefined {
  return pid ? lifePeople(wuxia)[pid]?.cid : undefined;
}
export { pidOfCid };
