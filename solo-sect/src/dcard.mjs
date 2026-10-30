// loop45：弟子卡摘要（右欄最大宗）。卡片只露一行重點，細節收進 <details>（記住展開）。只用面板原本就顯示的資訊。
import { moodLabel } from './mind.mjs';
export const NEED_WARN = { hunger: [30, '餓'], energy: [30, '累'], social: [30, '寂寞'], fun: [30, '悶'] };
export function dsum(d, artName = (id) => id) {
  const n = d.needs || {}, warn = Object.entries(NEED_WARN).filter(([k, [t]]) => (n[k] ?? 100) < t).map(([, [, w]]) => w);
  return `心情 ${d.mood | 0}（${moodLabel(d.mood)}）・飽足 ${(n.hunger ?? 0) | 0}・精力 ${(n.energy ?? 0) | 0}` + (warn.length ? `・<b style="color:#b33">${warn.join('、')}</b>` : '') + (d.pendingArt ? `・<span class="mv new">可學：${artName(d.pendingArt)}</span>` : '');
}
