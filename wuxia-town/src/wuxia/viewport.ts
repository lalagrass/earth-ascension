// 武俠小鎮 W1：viewport 的縮放（地點名牌在縮小時反向放大，需要知道目前的縮放）。
import { MutableRefObject, useEffect, useState } from 'react';
import type { Viewport } from 'pixi-viewport';

/** 整張地圖都看得見的縮放（contain）。 */
export function wholeMapScale(screenW: number, screenH: number, worldW: number, worldH: number) {
  if (!(screenW > 0 && screenH > 0)) return 1;
  return Math.min(screenW / worldW, screenH / worldH);
}

export function useViewportZoom(ref: MutableRefObject<Viewport | undefined>) {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    let attached: Viewport | undefined;
    const update = () => attached && setZoom(attached.scale.x);
    const attach = () => {
      if (attached || !ref.current) return;
      attached = ref.current;
      attached.on('zoomed', update);
      attached.on('zoomed-end', update);
      update();
    };
    attach();
    const timer = setInterval(attach, 200);
    return () => {
      clearInterval(timer);
      attached?.off('zoomed', update);
      attached?.off('zoomed-end', update);
    };
  }, [ref]);
  return zoom;
}
