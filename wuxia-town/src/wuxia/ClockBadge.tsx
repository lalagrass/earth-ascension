// 武俠小鎮 W1：時辰顯示（十二時辰＋第幾日），依遊戲時鐘（#549 §3）。
import type { ClockReading } from '../../convex/wuxia/clock';

const PHASE_ICON: Record<string, string> = { night: '☾', dusk: '◐', dawn: '◑', day: '☀' };

export function ClockBadge({ clock, phase }: { clock: ClockReading | null; phase?: string }) {
  if (!clock) return null;
  return (
    <div className="wuxia-clock pointer-events-none" data-testid="wuxia-clock">
      <span className="wuxia-clock-seal">{clock.shichen}</span>
      <span className="wuxia-clock-text">
        第 {clock.day} 日 · {clock.shichen}時
        <small>
          {' '}
          {clock.half}　{String(clock.hour).padStart(2, '0')}:{String(clock.minute).padStart(2, '0')}{' '}
          {phase ? PHASE_ICON[phase] ?? '' : ''}
        </small>
      </span>
    </div>
  );
}
