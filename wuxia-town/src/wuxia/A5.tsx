// 武俠小鎮 A5（#577）：公開試玩版的畫面小件——設定頁、第一次出現的圖示說明、授權與署名頁、回報檔、引擎出錯時的提示。
// 全部只在畫面（瀏覽器）這一側：不進世界狀態、不改 hash；設定與「看過的說明」存在 localStorage。
import React, { useEffect, useState } from 'react';
import type { WuxiaState } from '../../convex/wuxia/state';
import { setVolume } from './a4sound';

// ───────────── 設定 ─────────────
export type Settings = { maxSpeed: 16 | 64; autoFocus: boolean; volume: number; labels: 'text' | 'icons'; lang: 'zh-Hant' };
export const DEFAULT_SETTINGS: Settings = { maxSpeed: 64, autoFocus: true, volume: 0.6, labels: 'text', lang: 'zh-Hant' };
const KEY = 'wuxia-settings-v1';

export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { ...DEFAULT_SETTINGS, ...s };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const subs = new Set<(s: Settings) => void>();
export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 私密視窗存不了也能玩 */
  }
  setVolume(s.volume);
  for (const f of subs) f(s);
}

export function useSettings(): [Settings, (s: Partial<Settings>) => void] {
  const [s, set] = useState(loadSettings);
  useEffect(() => {
    setVolume(s.volume);
    subs.add(set);
    return () => void subs.delete(set);
  }, []);
  return [s, (p) => saveSettings({ ...loadSettings(), ...p })];
}

export function SettingsPanel() {
  const [s, set] = useSettings();
  return (
    <div className="wuxia-a5-settings" data-testid="wuxia-settings">
      <b>設定</b>
      <label>
        倍速上限
        <select value={s.maxSpeed} onChange={(e) => set({ maxSpeed: Number(e.target.value) as 16 | 64 })} data-testid="wuxia-set-maxspeed">
          <option value={16}>16×</option>
          <option value={64}>64×</option>
        </select>
      </label>
      <label>
        <input type="checkbox" checked={s.autoFocus} onChange={(e) => set({ autoFocus: e.target.checked })} data-testid="wuxia-set-focus" />
        大事發生時鏡頭自動移過去
      </label>
      <label>
        音量
        <input type="range" min={0} max={1} step={0.1} value={s.volume} onChange={(e) => set({ volume: Number(e.target.value) })} data-testid="wuxia-set-volume" />
        <small>{s.volume === 0 ? '靜音' : `${Math.round(s.volume * 100)}%`}</small>
      </label>
      <label>
        按鈕
        <select value={s.labels} onChange={(e) => set({ labels: e.target.value as Settings['labels'] })} data-testid="wuxia-set-labels">
          <option value="text">顯示文字</option>
          <option value="icons">只顯示圖示</option>
        </select>
      </label>
      <label>
        語言
        <select value={s.lang} disabled>
          <option value="zh-Hant">繁體中文</option>
        </select>
      </label>
      <button
        className="wuxia-a1-btn"
        onClick={() => {
          try {
            localStorage.removeItem(HINT_KEY);
          } catch {
            /* */
          }
        }}
      >
        再看一次圖示說明
      </button>
    </div>
  );
}

/** 「只顯示圖示」時右上按鈕的圖示（滑鼠停留／讀屏仍有文字） */
export const BUTTON_ICON: Record<string, string> = {
  鎮況: '☷',
  鎮誌: '📜',
  武館: '⛩',
  傳承: '☯',
  動靜: '💬',
  目標: '🎯',
  進鎮: '🚪',
  我: '🙂',
  存檔: '💾',
  設定: '⚙',
};
export function Label(props: { text: string; mode: Settings['labels'] }) {
  if (props.mode === 'text' || !BUTTON_ICON[props.text]) return <>{props.text}</>;
  return (
    <span title={props.text} aria-label={props.text}>
      {BUTTON_ICON[props.text]}
    </span>
  );
}

// ───────────── 第一次出現的圖示說明（之後不再出現） ─────────────
const HINT_KEY = 'wuxia-hints-seen-v1';
export const ICON_HINTS: Record<string, string> = {
  yuan: '右上角旁的紅點是「緣」：每天回一點，點一個人就能用它推一把。',
  bubble: '頭上的小圖：發起的人在做什麼（左）、對方的反應與關係變化（右）。點泡泡可以翻成一句話。',
  taiji: '腳下的圈：會太極的人。金色＝張三丰，綠色實線＝學對了，橘色虛線＝學走樣了。',
  spar: '武館裡的圓點是「勢」：切磋中誰占上風；白光＝打中。',
  figure: '鎮外來的人：俠客、山賊或行商，會帶來傳聞。',
};
function seenHints(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HINT_KEY) ?? '[]');
  } catch {
    return [];
  }
}
function markSeen(k: string) {
  try {
    localStorage.setItem(HINT_KEY, JSON.stringify([...new Set([...seenHints(), k])]));
  } catch {
    /* */
  }
}

/** 畫面上目前看得到哪些圖示（只讀狀態） */
export function visibleIcons(w: WuxiaState | undefined, taijiOn: boolean): string[] {
  if (!w) return [];
  const el = w.elements as Record<string, any>;
  const out: string[] = [];
  if (w.enabled['a4-play'] && el['a4-play']?.scenario) out.push('yuan');
  const a3 = el['a3-silent'];
  if (w.enabled['a3-silent'] && a3?.log?.length) out.push('bubble');
  const a2 = el['a2-master'];
  if (taijiOn && w.enabled['a2-master'] && Object.keys(a2?.know ?? {}).length) out.push('taiji');
  if (w.enabled['w06-spar'] && el['w06-spar']?.active?.length) out.push('spar');
  if (w.enabled['w08-jianghu'] && el['w08-jianghu']?.figures?.length) out.push('figure');
  return out;
}

export function FirstHints(props: { wuxia?: WuxiaState; taiji: boolean }) {
  const [cur, setCur] = useState<string>();
  const icons = visibleIcons(props.wuxia, props.taiji);
  const next = icons.find((k) => !seenHints().includes(k));
  useEffect(() => {
    if (cur || !next) return;
    setCur(next);
    markSeen(next);
  }, [cur, next]);
  useEffect(() => {
    if (!cur) return;
    const t = setTimeout(() => setCur(undefined), 9000);
    return () => clearTimeout(t);
  }, [cur]);
  if (!cur) return null;
  return (
    <div className="wuxia-a5-hint" data-testid="wuxia-icon-hint" onClick={() => setCur(undefined)}>
      {ICON_HINTS[cur]}
    </div>
  );
}

// ───────────── 授權與署名 ─────────────
export const AI_TOWN_LICENSE = `MIT License

Copyright (c) 2023 a16z-infra

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export function CreditsPage(props: { onClose: () => void }) {
  const [credits, setCredits] = useState<string>();
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}wuxia/CREDITS.md`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then(setCredits)
      .catch(() => setCredits('（讀不到 CREDITS.md）'));
  }, []);
  return (
    <div className="wuxia-a5-credits" data-testid="wuxia-credits" role="dialog" aria-label="授權與署名">
      <div className="card">
        <button className="wuxia-a1-x close" aria-label="關閉" onClick={props.onClose}>
          ×
        </button>
        <h2>授權與署名</h2>
        <ul>
          <li>程式：基於 AI Town（a16z-infra，MIT，全文見下）；武俠小鎮的修改同樣以 MIT 釋出。</li>
          <li>字型：不打包字型檔，使用你電腦上的系統字型（思源宋體／Noto Serif TC 等）。</li>
          <li>音效：WebAudio 即時合成，沒有音檔。</li>
          <li>美術：全部是本專案自製或 CC0，逐檔登記如下；不含上游 AI Town 的美術。</li>
        </ul>
        <h3>CREDITS.md</h3>
        <pre data-testid="wuxia-credits-text">{credits ?? '讀取中…'}</pre>
        <h3>AI Town 授權</h3>
        <pre>{AI_TOWN_LICENSE}</pre>
      </div>
    </div>
  );
}

// ───────────── 回報檔：存檔＋最近 200 筆事件（不上傳） ─────────────
export type ReportEvent = { src: string; id?: number; day: number; gm: number; text: string };

export function recentEvents(w: WuxiaState | undefined, n = 200): ReportEvent[] {
  if (!w) return [];
  const el = w.elements as Record<string, any>;
  const out: ReportEvent[] = [];
  for (const e of el['a4-play']?.events ?? []) out.push({ src: 'a4', id: e.id, day: e.day, gm: e.gm, text: e.text });
  for (const e of el['w08-jianghu']?.chronicle ?? []) out.push({ src: 'w08', id: e.event, day: e.day, gm: e.gm, text: e.text });
  for (const r of el['a2-master']?.records ?? []) out.push({ src: 'a2', id: r.id, day: r.day, gm: r.gm, text: `${r.from}→${r.to} ${r.move}（${r.via}${r.flawed ? '，走樣' : ''}）` });
  for (const r of el['w06-spar']?.history ?? []) out.push({ src: 'w06', id: r.id, day: r.day, gm: r.startGm, text: `${r.a} vs ${r.b}：${r.draw ? '平手' : `${r.winner} 勝`}` });
  for (const r of el['w07-bond']?.events ?? []) out.push({ src: 'w07', id: r.id, day: r.day, gm: r.gm, text: `${r.disciple} 拜 ${r.master}：${r.accepted ? '收' : `不收（${r.reason ?? ''}）`}` });
  for (const r of el['a3-silent']?.log ?? []) out.push({ src: 'a3', id: r.id, day: Math.floor(r.t / 1440) + 1, gm: r.t, text: `${r.a}→${r.b} ${r.kind}${r.ok ? '' : '（失敗）'}` });
  return out.sort((a, b) => a.gm - b.gm || a.src.localeCompare(b.src)).slice(-n);
}

export function makeReport(save: unknown, w: WuxiaState | undefined, extra: { error?: string; note?: string } = {}) {
  return {
    kind: 'wuxia-report',
    version: 1,
    // 只是給人看的時間戳（畫面這一側），不進世界
    createdAt: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    ...extra,
    events: recentEvents(w),
    save,
  };
}

// ───────────── 引擎出錯 ─────────────
export function CrashNotice(props: { message: string; onExport: () => void; onReport: () => void; onHome: () => void }) {
  return (
    <div className="wuxia-a5-crash" data-testid="wuxia-crash" role="alertdialog">
      <div className="card">
        <h2>小鎮停住了</h2>
        <p>引擎出了錯，畫面先停在這裡。你的存檔還在：每過一個遊戲日自動存一次，剛才出錯前的狀態也已另存一份。</p>
        <p className="wuxia-a1-note">錯誤：{props.message}</p>
        <div className="row">
          <button className="wuxia-a1-btn" onClick={props.onExport} data-testid="wuxia-crash-export">
            匯出存檔
          </button>
          <button className="wuxia-a1-btn" onClick={props.onReport} data-testid="wuxia-crash-report">
            匯出回報檔
          </button>
          <button className="wuxia-a1-btn" onClick={props.onHome} data-testid="wuxia-crash-home">
            回首頁讀檔
          </button>
        </div>
      </div>
    </div>
  );
}

/** 畫面本身丟例外時（React render）的錯誤邊界：不白屏，提示存檔還在。 */
export class ErrorBoundary extends React.Component<{ onHome: () => void; children: React.ReactNode }, { error?: string }> {
  state: { error?: string } = {};
  static getDerivedStateFromError(e: unknown) {
    return { error: (e as Error)?.message ?? String(e) };
  }
  componentDidCatch(e: unknown) {
    console.warn('wuxia: 畫面錯誤', e);
  }
  render() {
    if (this.state.error)
      return (
        <div className="wuxia-a5-crash" data-testid="wuxia-crash" role="alertdialog">
          <div className="card">
            <h2>畫面出錯了</h2>
            <p>存檔沒有受影響（每過一個遊戲日自動存一次）。回首頁按「讀取存檔」就能接著玩。</p>
            <p className="wuxia-a1-note">錯誤：{this.state.error}</p>
            <button className="wuxia-a1-btn" onClick={() => (this.setState({ error: undefined }), this.props.onHome())} data-testid="wuxia-crash-home">
              回首頁讀檔
            </button>
          </div>
        </div>
      );
    return this.props.children;
  }
}
