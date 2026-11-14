// 武俠小鎮 W5（#557「畫面」）：人物詳情的「心事」欄——心念名稱＋強度條＋「因為…」（觸發它的 2–3 筆記憶）。
// PlayerDetails 與截圖頁共用；w05-mind 關閉或沒有心念時不顯示。
import type { WuxiaState } from '../../convex/wuxia/state';
import { THOUGHT_BY_ID, describeMemory, mindOf } from '../../convex/wuxia/w05_mind/data';
import { profileById } from '../../convex/wuxia/w02_folk';
import { placeName } from '../../convex/wuxia/w03_life/data';

// A2：名字查全部人物（原 6 位＋候選池＋大師）
const nameOf = (cid: string) => profileById(cid)?.name ?? cid;

export function MindPanel(props: { wuxia?: WuxiaState; playerId?: string }) {
  const m = mindOf(props.wuxia);
  const p = props.playerId ? m?.people[props.playerId] : undefined;
  if (!m || !p) return null;
  return (
    <div className="wuxia-mind-panel" data-testid="wuxia-mind-panel">
      <p>
        <b>心事</b>
        {p.thoughts.length === 0 && <span className="wuxia-mind-none">（沒什麼心事）</span>}
      </p>
      {p.thoughts.map((t) => {
        const causes = t.causes
          .map((id) => p.memories.find((x) => x.id === id))
          .filter((x): x is NonNullable<typeof x> => !!x)
          .slice(0, 3);
        return (
          <div key={t.id} className="wuxia-thought">
            <div className="wuxia-thought-head">
              <span className="wuxia-thought-name">{THOUGHT_BY_ID[t.id]?.name ?? t.id}</span>
              <span className="wuxia-thought-bar">
                <span className="wuxia-thought-fill" style={{ width: `${t.s}%` }} />
              </span>
              <span className="wuxia-thought-value">{t.s}</span>
            </div>
            {causes.length > 0 && (
              <p className="wuxia-thought-why">
                因為：{causes.map((c) => describeMemory(c, nameOf, placeName)).join('；')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
