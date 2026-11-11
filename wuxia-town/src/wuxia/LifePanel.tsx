// 武俠小鎮 W3（#555「畫面」）：人物詳情的生活面板——目前活動、下一件事、4 個需求條、今日做過的事。
// PlayerDetails 與截圖頁共用；w03-life 關閉時不顯示。
import type { LifeState } from '../../convex/wuxia/w03_life';
import type { ClockReading } from '../../convex/wuxia/clock';
import { NEED_KEYS, NEED_LABELS, describeCurrent, describeNext, todayDone } from './life';
import { lifeSchedCtx, schedCtx } from '../../convex/wuxia/w03_life/data';
import type { WuxiaState } from '../../convex/wuxia/state';

export function LifePanel(props: {
  life?: LifeState;
  playerId?: string;
  clock: ClockReading | null;
  /** W4：元素開關（日程覆蓋，例如 w04-dojo 開啟時周教頭的「武館指點」） */
  enabled?: Record<string, boolean>;
  /** W5：世界的武俠狀態（心念加的時段、武館還沒重開時擋下的覆蓋）；給了就優先用 */
  wuxia?: WuxiaState;
}) {
  const { life, playerId, clock } = props;
  if (!life || !playerId || !clock) return null;
  const person = life.people[playerId];
  if (!person) return null;
  const done = todayDone(life, person, clock.day);
  return (
    <div className="wuxia-life-panel" data-testid="wuxia-life-panel">
      <p className="wuxia-life-now">
        <b>正在</b> {describeCurrent(person)}
      </p>
      <p className="wuxia-life-next">{describeNext(person, clock.minuteOfDay, props.wuxia ? lifeSchedCtx(props.wuxia, clock.day) : schedCtx(props.enabled, clock.day))}</p>
      <div className="wuxia-needs">
        {NEED_KEYS.map((k) => {
          const v = Math.round(person.needs[k]);
          return (
            <div key={k} className="wuxia-need">
              <span className="wuxia-need-label">{NEED_LABELS[k]}</span>
              <span className="wuxia-need-bar">
                <span
                  className={`wuxia-need-fill${v > 90 ? ' hot' : v > 70 ? ' warm' : ''}`}
                  style={{ width: `${v}%` }}
                />
              </span>
              <span className="wuxia-need-value">{v}</span>
            </div>
          );
        })}
      </div>
      {done.length > 0 && (
        <div className="wuxia-life-done">
          <b>今日做過</b>
          <ol>
            {done.slice(-12).map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
