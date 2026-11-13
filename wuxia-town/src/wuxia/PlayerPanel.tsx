// 武俠小鎮 W9（#561）：玩家面板——選角色進鎮、目前模式、點到的物件可選的活動、暫停、匯出 journal、最近的操作紀錄。
// 只負責畫與回呼；送 input 由 Game.tsx（live）處理，截圖頁傳空函式。
import { ObjectDef } from '../../convex/wuxia/w03_life/data';
import { PlayerState, PlayerRec } from '../../convex/wuxia/w09_player/data';
import { readClock } from '../../convex/wuxia/clock';
import { MODE_LABEL, PLAYER_ROLES, playerActivities } from './player';

function when(gm: number) {
  const c = readClock(gm);
  return `第 ${c.day} 日 ${String(Math.floor(c.minuteOfDay / 60)).padStart(2, '0')}:${String(c.minuteOfDay % 60).padStart(2, '0')}`;
}

export function PlayerPanel(props: {
  offered: boolean;
  joined: boolean;
  state?: PlayerState;
  me?: PlayerRec;
  object?: ObjectDef;
  lastResult?: { ok: boolean; reason: string };
  onJoin: (roleId: string) => void;
  onAct: (objId: string, actId: string) => void;
  onCloseObject: () => void;
  onPause: (paused: boolean) => void;
  onExport: () => void;
  exporting?: boolean;
}) {
  if (!props.offered) return null;
  if (!props.joined) {
    return (
      <div className="wuxia-player-panel" data-testid="wuxia-player-join">
        <h3>以一個角色住進鎮上</h3>
        <div className="wuxia-player-roles">
          {PLAYER_ROLES.map((r) => (
            <button key={r.id} className="wuxia-player-btn" onClick={() => props.onJoin(r.id)}>
              {r.label}
              <small>{r.identity}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }
  const log = (props.state?.log ?? []).filter((l) => l.who === props.me?.cid).slice(-5).reverse();
  const paused = !!props.state?.paused;
  return (
    <div className="wuxia-player-panel" data-testid="wuxia-player-panel">
      <div className="wuxia-player-head">
        <span className="wuxia-player-mode">{props.me ? MODE_LABEL[props.me.mode] : '旁觀'}</span>
        {paused && <span className="wuxia-player-paused">暫停中</span>}
        <span className="wuxia-player-tools">
          <button className="wuxia-player-btn small" onClick={() => props.onPause(!paused)}>
            {paused ? '繼續' : '暫停'}
          </button>
          <button className="wuxia-player-btn small" onClick={props.onExport} disabled={props.exporting}>
            {props.exporting ? '匯出中…' : '匯出 journal'}
          </button>
        </span>
      </div>
      {props.object ? (
        <div className="wuxia-player-menu" data-testid="wuxia-object-menu">
          <div className="wuxia-player-menu-title">
            {props.object.name}
            <button className="wuxia-player-x" onClick={props.onCloseObject} aria-label="關閉">
              ×
            </button>
          </div>
          {playerActivities(props.object).length === 0 && <p className="wuxia-player-note">這裡沒有你能做的事。</p>}
          {playerActivities(props.object).map((a) => (
            <button key={a.id} className="wuxia-player-btn" onClick={() => props.onAct(props.object!.id, a.id)}>
              {a.emoji} {a.label}
              <small>{a.minutes} 分</small>
            </button>
          ))}
        </div>
      ) : (
        <p className="wuxia-player-note">點地圖上的物件（井、木人樁、床…）選要做的事；點人物可以請教、切磋、拜師。</p>
      )}
      {props.lastResult && (
        <p className={props.lastResult.ok ? 'wuxia-player-ok' : 'wuxia-player-no'}>{props.lastResult.reason}</p>
      )}
      {log.length > 0 && (
        <ul className="wuxia-player-log">
          {log.map((l, i) => (
            <li key={i} className={l.ok ? '' : 'no'}>
              <span>{when(l.t)}</span> {l.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 人物詳情裡的「請教／切磋／拜師」（玩家已進鎮、選的是別人時）。 */
export function PersonActions(props: {
  name: string;
  onAct: (kind: 'ask' | 'spar' | 'apprentice') => void;
  lastResult?: { ok: boolean; reason: string };
}) {
  return (
    <div className="wuxia-person-actions" data-testid="wuxia-person-actions">
      <button className="wuxia-player-btn" onClick={() => props.onAct('ask')}>
        請教
      </button>
      <button className="wuxia-player-btn" onClick={() => props.onAct('spar')}>
        切磋
      </button>
      <button className="wuxia-player-btn" onClick={() => props.onAct('apprentice')}>
        拜師
      </button>
      {props.lastResult && (
        <p className={props.lastResult.ok ? 'wuxia-player-ok' : 'wuxia-player-no'}>{props.lastResult.reason}</p>
      )}
    </div>
  );
}
