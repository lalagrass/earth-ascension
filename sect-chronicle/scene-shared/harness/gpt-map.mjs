// Native map diagnostic art from the fixed source's actual runtime map exports.
// This is not Gemini art resized to fit. Doors, wall collision and routes keep DU.
import { Graphics } from '../../experiments/water-carry/demo/vendor/pixi.min.mjs';
import { MAP, corridors, rects, stations, geometry, trees } from '../sources/gpt/solo-sect-gpt/src/map.mjs';
export function nativeGPTMap(app, world) {
  const g = new Graphics().rect(0, 0, ...MAP.world).fill(0xcac5a8);
  g.rect(0, 800, 1600, 1000).fill(0xc5c19a);
  for (const c of corridors) { g.poly(c.points.flat(), false).stroke({ width: c.width, color: 0xe6d6af }); g.poly(c.points.flat(), false).stroke({ width: 1, color: 0xb1a485 }); }
  // Pond and its native plank opening, declared by terrain() in the fixed map.
  g.ellipse(300, 1645, 230, 145).fill(0x678e91);
  g.rect(260, 1515, 38, 280).fill(0xb79f76);
  g.rect(1870, 0, 70, 1800).fill(0x678e91).rect(1870, 425, 70, 30).fill(0xb79f76);
  for (const [id, f] of Object.entries(rects)) {
    const [x, y, width, height] = f.rect;
    g.rect(x, y, width, height).fill({ color: id === 'hall' || world.facilities[id].stage ? 0xd8c49b : 0xb4b08d, alpha: .8 });
    g.rect(x, y, width, height).stroke({ color: 0x8b8168, width: 1 });
    if (f.door) g.circle(...f.door, 8).fill(0xf4e5bd);
  }
  for (const [x, y, width, height] of geometry(world)) g.rect(x, y, width, height).fill(0x796f58);
  for (const t of trees) g.ellipse(t.x, t.y - 13, 13, 18).fill({ color: 0x5e7950, alpha: .7 });
  for (const p of Object.values(stations)) g.circle(...p, 3).fill(0x8a5b39);
  const texture = app.renderer.generateTexture({ target: g, resolution: 1 });
  g.destroy(); return texture;
}
