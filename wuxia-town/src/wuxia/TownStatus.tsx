// 武俠小鎮 W3（#555「畫面」）：「鎮況」面板——每個地點現在有誰。疊在地圖右上角，可收合。
import { useState } from 'react';
import type { LifeState } from '../../convex/wuxia/w03_life';
import { townStatus } from './life';

export function TownStatus(props: {
  life?: LifeState;
  players: Array<{ id: string; position: { x: number; y: number } }>;
  nameOf: (id: string) => string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? true);
  if (!props.life) return null;
  const rows = townStatus(props.life, props.players, props.nameOf);
  return (
    <div className="wuxia-town-status" data-testid="wuxia-town-status">
      <button className="wuxia-town-status-title" onClick={() => setOpen(!open)}>
        鎮況 {open ? '▾' : '▸'}
      </button>
      {open && (
        <ul>
          {rows.map((r) => (
            <li key={r.place}>
              <b>{r.name}</b> {r.who.join('、')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
