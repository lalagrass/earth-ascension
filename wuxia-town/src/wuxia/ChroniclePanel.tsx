// 武俠小鎮 W8（#560「畫面加『山腳鎮誌』面板，依日期列出」）：疊在畫面左下，可收合；最新的一天在最上面。
// 有 LLM 改寫的段落就用段落，沒有就用規則模板段落（convex/wuxia/w08_jianghu/chronicle.ts）。w08-jianghu 關閉時不顯示。
import { useState } from 'react';
import { chronicleLines, chronicleMajorLines } from '../../convex/wuxia/w08_jianghu/chronicle';
import { JIANGHU } from '../../convex/wuxia/w08_jianghu/data';
import { jianghuStateOf } from './jianghu';

export function ChroniclePanel(props: { world: { wuxia?: any }; defaultOpen?: boolean; max?: number }) {
  const [open, setOpen] = useState(props.defaultOpen ?? true);
  // A1（#564 審查第 4 項）：預設只列大事（武館、俠客、山賊、小比、說書），例行的（進貨、行商路過）收在「全部」
  const [all, setAll] = useState(false);
  const st = jianghuStateOf(props.world);
  if (!st) return null;
  const lines = (all ? chronicleLines(st) : chronicleMajorLines(st)).reverse().slice(0, props.max ?? 30);
  const active = st.active ? JIANGHU.events[st.active.kind].name : undefined;
  return (
    <div className="wuxia-chronicle-panel" data-testid="wuxia-chronicle-panel">
      <button className="wuxia-town-status-title" onClick={() => setOpen(!open)}>
        山腳鎮誌 {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="wuxia-chronicle-body">
          <div className="wuxia-chronicle-filter">
            <button className={all ? '' : 'on'} onClick={() => setAll(false)} data-testid="wuxia-chronicle-major">
              大事
            </button>
            <button className={all ? 'on' : ''} onClick={() => setAll(true)} data-testid="wuxia-chronicle-all">
              全部
            </button>
          </div>
          {active && <p className="wuxia-chronicle-now">此刻：{active}</p>}
          {lines.length === 0 && <p>{all ? '（尚無記事）' : '（尚無大事）'}</p>}
          {lines.map((l) => (
            <p key={l.day}>{l.text}</p>
          ))}
        </div>
      )}
    </div>
  );
}
