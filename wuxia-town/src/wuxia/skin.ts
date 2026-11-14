// 武俠小鎮 W1：前端換皮（#553）。只影響畫面，不影響規則。
import worldConfig from '../../data/wuxia/world.config.json';
import { characters as upstreamCharacters } from '../../data/characters';
import { folkCharacters, UPSTREAM_TO_FOLK } from '../../data/wuxia/characters';
import placesData from '../../data/wuxia/places.json';
import { gameMinutes, readClock, ClockReading } from '../../convex/wuxia/clock';

type WithWuxia = { wuxia?: { enabled: Record<string, boolean>; clockEpoch?: number; timeScale: number } };

/** 世界有 wuxia 欄位就以世界凍結的開關為準，否則看設定檔（世界還沒載入時的標題等）。 */
export function skinEnabled(world?: WithWuxia | null): boolean {
  if (world?.wuxia) return !!world.wuxia.enabled['w01-skin'];
  return !!(worldConfig.elements as Record<string, boolean>)['w01-skin'];
}

export function characterFor(name: string, skin: boolean) {
  if (skin) {
    const folk = folkCharacters.find((c) => c.name === (UPSTREAM_TO_FOLK[name] ?? name));
    if (folk) return folk;
  }
  return upstreamCharacters.find((c) => c.name === name);
}

export type Place = {
  id: string;
  name: string;
  rect: number[];
  entry: number[];
  kind: string;
  label?: number[];
  note?: string;
};

export const PLACES: Place[] = placesData.places as Place[];

/** 「在茶館」「在茶館附近」：在 rect 內取最小的那個；不在任何 rect 內就找 4 格內最近的。 */
export function placeHint(x: number, y: number, places: Place[] = PLACES): string | null {
  const inside = places
    .filter((p) => x >= p.rect[0] && x < p.rect[0] + p.rect[2] && y >= p.rect[1] && y < p.rect[1] + p.rect[3])
    .sort((a, b) => a.rect[2] * a.rect[3] - b.rect[2] * b.rect[3]);
  const pick = inside.find((p) => p.kind !== 'road') ?? inside[0];
  if (pick) return pick.kind === 'road' ? `在${pick.name}上` : `在${pick.name}附近`;
  let best: { p: Place; d: number } | null = null;
  for (const p of places) {
    const dx = Math.max(p.rect[0] - x, 0, x - (p.rect[0] + p.rect[2]));
    const dy = Math.max(p.rect[1] - y, 0, y - (p.rect[1] + p.rect[3]));
    const d = Math.hypot(dx, dy);
    if (d <= 4 && (!best || d < best.d)) best = { p, d };
  }
  return best ? `在${best.p.name}附近` : null;
}

export function worldClock(world: WithWuxia | undefined | null, engineTime: number | undefined): ClockReading | null {
  const w = world?.wuxia;
  if (!w || w.clockEpoch === undefined || engineTime === undefined) return null;
  return readClock(Math.max(0, gameMinutes(engineTime, w.clockEpoch, w.timeScale)));
}

/** 上游的 3 個活動（規則資料，W1 不改）在畫面上顯示成繁中。 */
const ACTIVITY_LABELS: Record<string, string> = {
  'reading a book': '讀書',
  daydreaming: '發呆',
  gardening: '種菜',
};
export function activityLabel(description: string | undefined, skin: boolean): string | undefined {
  if (!description) return undefined;
  return skin ? ACTIVITY_LABELS[description] ?? description : description;
}
