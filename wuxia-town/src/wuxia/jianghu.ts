// 武俠小鎮 W8：畫面讀 w08-jianghu 狀態的小工具（關閉時回傳 undefined）。
import type { JianghuState } from '../../convex/wuxia/w08_jianghu/data';
import { W08_JIANGHU } from '../../convex/wuxia/w08_jianghu/data';

export function jianghuStateOf(world: { wuxia?: any } | undefined): JianghuState | undefined {
  const w = world?.wuxia;
  if (!w?.enabled?.[W08_JIANGHU]) return undefined;
  return w.elements?.[W08_JIANGHU] as JianghuState | undefined;
}
