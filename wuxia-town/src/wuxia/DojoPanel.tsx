// 武俠小鎮 W7（#559「畫面」）：「武館」面板——館名、師父、弟子名單、入門日。疊在鎮況下面，可收合。
// w07-bond 關閉或武館還沒開時不顯示；還沒收徒時顯示「尚無弟子」。
import { useState } from 'react';
import type { WuxiaState } from '../../convex/wuxia/state';
import { profileById } from '../../convex/wuxia/w02_folk';
import { COACH_ID } from '../../convex/wuxia/w04_dojo/data';
import { disciplesOf } from '../../convex/wuxia/w07_bond/data';
import { bondStateOf } from './bond';

// A2：名字查全部人物（原 6 位＋候選池＋大師）
const nameOf = (cid: string) => profileById(cid)?.name ?? cid;

export function DojoPanel(props: { wuxia?: WuxiaState; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(props.defaultOpen ?? true);
  const st = bondStateOf({ wuxia: props.wuxia });
  const dojo = props.wuxia?.elements['w04-dojo'] as { openedAt?: number } | undefined;
  if (!st || dojo?.openedAt === undefined) return null;
  const masters = [...new Set([COACH_ID, ...Object.values(st.disciples).map((d) => d.master)])].sort((a, b) =>
    a === COACH_ID ? -1 : b === COACH_ID ? 1 : a < b ? -1 : 1,
  );
  return (
    <div className="wuxia-dojo-panel" data-testid="wuxia-dojo-panel">
      <button className="wuxia-town-status-title" onClick={() => setOpen(!open)}>
        武館 {open ? '▾' : '▸'}
      </button>
      {open && (
        <div>
          <p className="wuxia-dojo-name">{st.dojoName ?? '（還沒掛匾）'}</p>
          {masters.map((m) => {
            const ds = disciplesOf(st, m);
            return (
              <div key={m}>
                <p>
                  <b>師父</b> {nameOf(m)}
                </p>
                <ul>
                  {ds.length === 0 && <li>尚無弟子</li>}
                  {ds.map((d, i) => (
                    <li key={d}>
                      {i === 0 ? '大弟子' : `第 ${i + 1} 個弟子`} {nameOf(d)}・第 {st.disciples[d].day} 日入門
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
