// 武俠小鎮 W3（#555「畫面」）：人物詳情的生活面板——目前活動、下一件事、4 個需求條、今日做過的事。
// PlayerDetails 與截圖頁共用；w03-life 關閉時不顯示。
import type { LifeState } from '../../convex/wuxia/w03_life';
import type { ClockReading } from '../../convex/wuxia/clock';
import { NEED_KEYS, NEED_LABELS, describeCurrent, describeNext, todayDone } from './life';
import { lifeSchedCtx, schedCtx } from '../../convex/wuxia/w03_life/data';
import type { WuxiaState } from '../../convex/wuxia/state';
import { a7Of, choreMinutesToday, paidTeachers, studentKind, TEACHERS, A7 } from '../../convex/wuxia/a7_tuition/data';
import { cidName } from './a2';

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
      <PurseLine wuxia={props.wuxia} cid={person.cid} day={clock.day} />
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

/** A7（#584）：人物詳情的錢袋與「學生（付束脩／以工代學）」。a7-tuition 關閉或這人不在經濟裡（玩家）時不顯示。 */
export function PurseLine(props: { wuxia?: WuxiaState; cid: string; day: number }) {
  const st = a7Of(props.wuxia);
  if (!st || st.purse[props.cid] === undefined) return null;
  const { cid, day } = props;
  const kind = studentKind(st, cid, day);
  const paid = paidTeachers(st, cid, day);
  const chore = choreMinutesToday(st, cid, day);
  const teacher = TEACHERS.includes(cid);
  return (
    <p className="wuxia-purse" data-testid="wuxia-purse">
      <b>錢袋</b> {st.purse[cid]} 文
      {!teacher && kind === 'paid' && <span className="wuxia-student paid">・學生（付束脩：{paid.map(cidName).join('、')}，到第 {Math.max(...paid.map((t) => st.paidUntil[cid][t]))} 日）</span>}
      {!teacher && kind === 'work' && <span className="wuxia-student work">・學生（以工代學：今天替武館做滿了雜務）</span>}
      {!teacher && !kind && chore > 0 && <span className="wuxia-student">・今天替武館做了 {chore}／{A7.chore.minutes} 分鐘雜務</span>}
      {!teacher && !kind && chore === 0 && <span className="wuxia-student none">・不是學生（只能看）</span>}
    </p>
  );
}
