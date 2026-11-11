import places from '../../../data/wuxia/places.json';
import { WorldMap } from '../../aiTown/worldMap';
import { mapModuleFor, serializedMapFor } from './index';

describe('w01-skin map and places (#553)', () => {
  const town = serializedMapFor({ 'w01-skin': true });
  test('skin on → 48×36 山腳古鎮 with self-made tileset; off → upstream gentle map', () => {
    expect([town.width, town.height, town.tileDim]).toEqual([48, 36, 32]);
    expect(town.tileSetUrl).toBe('/ai-town/wuxia/tiles/town.jpg');
    expect(serializedMapFor({}).tileSetUrl).toBe('/ai-town/assets/gentle-obj.png');
    expect(mapModuleFor({ 'w01-skin': false }).mapwidth).toBe(64); // 上游 gentle 64×48
  });
  test('every place has id/name/rect/entry/kind; rect inside map; entry walkable; ids unique', () => {
    const map = new WorldMap(town);
    const blocked = (x: number, y: number) => map.objectTiles.some((l) => l[x][y] !== -1);
    const ids = new Set<string>();
    for (const p of places.places) {
      expect(typeof p.name).toBe('string');
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      const [x, y, w, h] = p.rect;
      expect(x >= 0 && y >= 0 && x + w <= 48 && y + h <= 36).toBe(true);
      const [ex, ey] = p.entry;
      expect(blocked(ex, ey)).toBe(false);
    }
    for (const id of ['teahouse', 'smithy', 'pharmacy', 'well', 'plaza', 'river', 'bridge', 'bamboo', 'mountain-path', 'dojo', 'gate', 'street']) {
      expect(ids.has(id)).toBe(true);
    }
  });
  test('bridge and gate passage are walkable; river is not', () => {
    const map = new WorldMap(town);
    const blocked = (x: number, y: number) => map.objectTiles.some((l) => l[x][y] !== -1);
    for (let y = 8; y <= 12; y++) expect(blocked(23, y)).toBe(false); // 石橋
    for (let y = 30; y <= 35; y++) expect(blocked(23, y)).toBe(false); // 城門通道
    expect(blocked(10, 10)).toBe(true); // 河
    expect(blocked(40, 10)).toBe(true);
  });
  test('town is connected: every entry reachable from the gate', () => {
    const map = new WorldMap(town);
    const blocked = (x: number, y: number) => map.objectTiles.some((l) => l[x][y] !== -1);
    const seen = new Set<string>();
    const q: Array<[number, number]> = [[23, 34]];
    seen.add('23,34');
    while (q.length) {
      const [x, y] = q.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= 48 || ny >= 36 || blocked(nx, ny) || seen.has(`${nx},${ny}`)) continue;
        seen.add(`${nx},${ny}`);
        q.push([nx, ny]);
      }
    }
    for (const p of places.places) expect([p.id, seen.has(p.entry.join(','))]).toEqual([p.id, true]);
  });
});
