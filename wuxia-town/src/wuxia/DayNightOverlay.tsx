// 武俠小鎮 W1：日夜色調（純畫面，不影響規則）。夜（戌–寅）偏藍暗、黃昏偏橘、清晨淡暖。
import { Graphics } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useCallback } from 'react';
import { dayTint } from '../../convex/wuxia/clock';

export function DayNightOverlay(props: { width: number; height: number; minuteOfDay: number }) {
  const tint = dayTint(props.minuteOfDay);
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      if (tint.alpha <= 0) return;
      g.beginFill(tint.color, tint.alpha);
      // 只蓋地圖範圍；地圖外的留白是紙色畫框，不跟著變暗
      g.drawRect(0, 0, props.width, props.height);
      g.endFill();
    },
    [tint.color, tint.alpha, props.width, props.height],
  );
  return <Graphics draw={draw} eventMode="none" />;
}
