// 武俠小鎮 W7（#559「畫面」）：人物詳情的「關係」分頁——跟每個人的三軸條（親近／敬重／競爭，−100～100）＋「因為…」
// （該人對那人絕對值最大的那一軸，貢獻最大的 2 筆記憶），師徒、師兄弟加稱呼。PlayerDetails 與截圖頁共用；w07-bond 關閉時不顯示。
import type { WuxiaState } from '../../convex/wuxia/state';
import { describeMemory, mindOf } from '../../convex/wuxia/w05_mind/data';
import { FOLK_CHARACTERS } from '../../convex/wuxia/w02_folk';
import { placeName } from '../../convex/wuxia/w03_life/data';
import {
  AXES,
  AXIS_LABELS,
  contributions,
  siblingTitle,
  topContributions,
  zeroBond,
} from '../../convex/wuxia/w07_bond/data';
import { bondStateOf } from './bond';

const nameOf = (cid: string) => FOLK_CHARACTERS.find((c) => c.id === cid)?.name ?? cid;

function Bar(props: { v: number; axis: string }) {
  const v = Math.max(-100, Math.min(100, props.v));
  const left = v >= 0 ? 50 : 50 + v / 2;
  const width = Math.abs(v) / 2;
  return (
    <span className={`wuxia-bond-bar wuxia-bond-${props.axis}`}>
      <span className="wuxia-bond-mid" />
      <span className={`wuxia-bond-fill${v < 0 ? ' neg' : ''}`} style={{ left: `${left}%`, width: `${width}%` }} />
    </span>
  );
}

export function BondPanel(props: { wuxia?: WuxiaState; playerId?: string; gm?: number }) {
  const st = bondStateOf({ wuxia: props.wuxia });
  const mind = mindOf(props.wuxia);
  const me = props.playerId ? mind?.people[props.playerId] : undefined;
  if (!st || !mind || !me) return null;
  const row = st.bonds[me.cid] ?? {};
  const others = Object.values(mind.people)
    .map((p) => p.cid)
    .filter((c) => c !== me.cid)
    .sort();
  const gm = props.gm ?? st.minute;
  const myMaster = st.disciples[me.cid]?.master;
  return (
    <div className="wuxia-bond-panel" data-testid="wuxia-bond-panel">
      {myMaster && (
        <p className="wuxia-bond-master">
          師父：<b>{nameOf(myMaster)}</b>（第 {st.disciples[me.cid].day} 日入門）
        </p>
      )}
      {others.map((cid) => {
        const b = row[cid] ?? zeroBond();
        const axis = [...AXES].sort((x, y) => Math.abs(b[y]) - Math.abs(b[x]))[0];
        const why =
          b[axis] === 0
            ? []
            : topContributions(contributions(me, me.cid, cid, gm, st), axis, 2).map((c) =>
                c.memory ? describeMemory(c.memory, nameOf, placeName) : c.label ?? '',
              );
        const title =
          myMaster === cid
            ? '師父'
            : st.disciples[cid]?.master === me.cid
              ? '徒弟'
              : siblingTitle(st, me.cid, cid);
        return (
          <div key={cid} className="wuxia-bond-row">
            <div className="wuxia-bond-name">
              {nameOf(cid)}
              {title && <span className="wuxia-bond-title">{title}</span>}
            </div>
            {AXES.map((a) => (
              <div key={a} className="wuxia-bond-axis">
                <span className="wuxia-bond-label">{AXIS_LABELS[a]}</span>
                <Bar v={b[a]} axis={a} />
                <span className="wuxia-bond-value">{b[a]}</span>
              </div>
            ))}
            {why.length > 0 && (
              <p className="wuxia-bond-why">
                {AXIS_LABELS[axis]}因為：{why.join('；')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 人物詳情的分頁：「概況」（生活、技能、心事）與「關係」。w07-bond 關閉時只顯示概況、不顯示分頁鈕。 */
export function DetailTabs(props: {
  wuxia?: WuxiaState;
  tab: 'main' | 'bond';
  onTab: (t: 'main' | 'bond') => void;
  main: React.ReactNode;
  bond: React.ReactNode;
}) {
  if (!bondStateOf({ wuxia: props.wuxia })) return <>{props.main}</>;
  return (
    <div className="wuxia-tabs">
      <div className="wuxia-tab-bar" role="tablist">
        <button role="tab" className={props.tab === 'main' ? 'on' : ''} onClick={() => props.onTab('main')}>
          概況
        </button>
        <button role="tab" className={props.tab === 'bond' ? 'on' : ''} onClick={() => props.onTab('bond')} data-testid="wuxia-tab-bond">
          關係
        </button>
      </div>
      {props.tab === 'main' ? props.main : props.bond}
    </div>
  );
}
