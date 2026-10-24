// D37（#184）全場水彩場景建構 → SCENE-03（#182／D41）：一張無接縫烘焙地面＋地面貼片＋人物腳底陰影＋依腳底排序的手繪景物。
// 素材唯一來源 demo/assets/scene03/manifest.json（新件在本目錄，D35／D37 既有件以相對路徑沿用；不保留舊新場景切換）。
// 只讀 layout.mjs 與權威幾何；回傳的 tick() 只改畫面（透明度、竹影搖曳、水光），暫停時凍結，不碰模型、不入存檔。
import { Container, Graphics, Sprite, TilingSprite } from '../vendor/pixi.min.mjs';
import { PROPS, DECALS, NPCS, POOL, STREAM_UP, STREAM_DOWN, STREAM_OUT, BRIDGE } from './layout.mjs';
import { STREAM_POLY } from '../assets/long-water/scenery.mjs';

export const ART_WC = 'assets/scene03/';

// tex(name) → Pixi Texture；manifest＝demo/assets/art184-watercolor/manifest.json
export function buildWatercolorScene({ world, sorted, tex, manifest }) {
  const S = 2;
  const groundSprite = new Sprite(tex('ground'));
  groundSprite.scale.set(1 / S);
  world.addChildAt(groundSprite, 0);
  // 世界外圍：淡化的同一張草地紋（只在鏡頭貼邊時看得到；不是可走區）
  const skirt = new TilingSprite({ texture: tex('skirt'), width: 4800, height: 4350 });
  skirt.position.set(-1600, -1500); skirt.tileScale.set(0.9); skirt.alpha = 0.45; // 疊在紙色畫布底上＝淡草霧，和烘焙邊緣羽化同色
  world.addChildAt(skirt, 0);
  const decals = new Container();
  world.addChildAt(decals, world.getChildIndex(groundSprite) + 1); // skirt → 不透明地面 → 貼片（橋板／後欄、藥畦、溪岸、水光）→ 提示／sorted
  const place = (p, parent) => {
    const t = tex(p.img ?? p.id), s = new Sprite(t);
    s.anchor.set(0.5, 1);
    const k = p.w ? p.w / t.width : p.h / t.height;
    s.scale.set(p.flip ? -k : k, k);
    s.position.set(p.x, p.y);
    s.zIndex = p.z ?? p.y;
    parent.addChild(s);
    return s;
  };
  for (const d of DECALS) place(d, decals);
  // 溪橋：橋板＋後欄＋橋墩在地面貼片層（人只會站在它上面）；前欄拆層 z=1060 蓋過橋上人物的腿
  const deckM = manifest.bridge_deck;
  const deck = new Sprite(tex('bridge_deck')); deck.scale.set(1 / S); deck.position.set(...deckM.world); decals.addChild(deck);
  const front = new Sprite(tex('bridge_front')); front.scale.set(1 / S); front.position.set(...deckM.world); front.zIndex = BRIDGE.front; sorted.addChild(front);
  // 水光：溪與深潭上幾道會流動的淡亮紋（暫停凍結）
  const shimmer = new Graphics();
  decals.addChildAt(shimmer, 0);
  const lines = [];
  const along = (poly, n) => { for (let i = 0; i < n; i++) { const a = poly[Math.floor(i / n * (poly.length / 2))], b = poly[poly.length - 1 - Math.floor(i / n * (poly.length / 2))]; lines.push({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, l: 10 + (i * 7) % 9, ph: i * 1.7 }); } };
  along(STREAM_UP, 5); along(STREAM_POLY, 7); along(STREAM_DOWN, 8); along(STREAM_OUT, 4);
  // SCENE-03 腳底陰影：貼片層最上面（橋板／藥畦之上、人物之下），只跟畫面腳底位置
  const feetG = new Graphics();
  decals.addChild(feetG); // 最後加入＝貼片層最上（decals 不排序，依加入順序）
  for (let i = 0; i < 6; i++) lines.push({ x: POOL.x - 50 + (i * 23) % 90, y: POOL.y - 24 + (i * 13) % 44, l: 12 + (i % 3) * 5, ph: i * 2.1, pool: true });
  const props = PROPS.map((p) => ({ p, s: place(p, sorted) }));
  const npcs = Object.fromEntries(NPCS.map((n) => [n.id, place(n, sorted)]));
  let vt = 0; // 視覺時間：只在播放中累加
  function tick(dtMs, playing, feet) {
    if (playing) vt += dtMs / 1000;
    shimmer.clear();
    feetG.clear();
    for (const f of feet) feetG.ellipse(f.x, f.y + 1, 11, 3.6).fill({ color: 0x2a2618, alpha: 0.28 }).ellipse(f.x, f.y + 1, 6.5, 2.2).fill({ color: 0x2a2618, alpha: 0.2 });
    for (const w of lines) {
      const k = (Math.sin(vt * 1.6 + w.ph) + 1) / 2, dx = w.pool ? Math.sin(vt * 0.5 + w.ph) * 4 : ((vt * 9 + w.ph * 5) % 18) - 9;
      shimmer.ellipse(w.x + dx, w.y, w.l, 1.6).fill({ color: 0xe8f4f0, alpha: 0.18 + 0.28 * k });
    }
    for (const { p, s } of props) {
      if (p.sway) s.skew.x = Math.sin(vt * 0.9 + p.x * 0.013) * 0.025;
      if (!p.fade) continue;
      const half = Math.abs(s.width) * 0.38, top = p.y - s.height * 0.92;
      const hidden = feet.some((f) => f.y < p.y - 2 && f.y > top + 30 && Math.abs(f.x - p.x) < half);
      const target = hidden ? p.fade : 1;
      s.alpha += (target - s.alpha) * Math.min(1, dtMs / 160);
    }
  }
  return { groundSprite, decals, npcs, props, tick, front, deck };
}
