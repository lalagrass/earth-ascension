// 武俠小鎮 W1：人物詳情的名牌＋「在○○附近」＋描述。PlayerDetails 與截圖頁共用。
import { placeHint } from './skin';

export function PlayerCard(props: {
  name?: string;
  description?: string;
  position?: { x: number; y: number };
  activity?: string;
  skin: boolean;
}) {
  const hint = props.skin && props.position ? placeHint(props.position.x, props.position.y) : null;
  return (
    <div className="wuxia-player-card">
      {hint && (
        <p className="wuxia-place-hint" data-testid="wuxia-place-hint">
          {hint}
          {props.activity ? `，${props.activity}` : ''}
        </p>
      )}
      {props.description && <p className="wuxia-desc">{props.description}</p>}
    </div>
  );
}
