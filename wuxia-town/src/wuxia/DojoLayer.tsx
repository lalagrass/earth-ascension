// 武俠小鎮 W4（#556）：武館重開後院子裡的練功器具（木人樁、石鎖、梅花樁、教頭位、沙袋）與門口的「開館」紅綢。
// 全部用 Pixi Graphics 程式畫（不需要素材檔）；位置來自 data/wuxia/objects.json 的 w04-dojo 物件。w04-dojo 關閉時不畫（武館維持 W1 的封門樣子）。
import { Container, Graphics, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useCallback, useMemo } from 'react';
import { OBJECTS } from '../../convex/wuxia/w03_life/data';
import { LABEL_FONT } from './PlaceLabels';

const WOOD = 0x7a5432;
const WOOD_DARK = 0x4e3420;
const STONE = 0x8d8a82;
const STONE_DARK = 0x5d5a54;
const RED = 0xb3342a;
const INK = 0x2e261f;

function drawDummy(g: PIXI.Graphics, x: number, y: number) {
  // 木人樁：一根粗木柱＋三支短臂＋一條腿
  g.beginFill(0x000000, 0.18).drawEllipse(x, y + 13, 10, 4).endFill();
  g.lineStyle(1.5, INK, 0.9);
  g.beginFill(WOOD).drawRoundedRect(x - 5, y - 16, 10, 30, 4).endFill();
  g.beginFill(WOOD_DARK);
  g.drawRect(x - 13, y - 9, 9, 3);
  g.drawRect(x - 13, y - 2, 9, 3);
  g.drawRect(x - 11, y + 5, 7, 3);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0xffffff, 0.15).drawRect(x + 1, y - 14, 2, 26).endFill();
}

function drawStoneLock(g: PIXI.Graphics, x: number, y: number) {
  // 石鎖：方石＋上面的提把
  g.beginFill(0x000000, 0.18).drawEllipse(x, y + 6, 9, 3).endFill();
  g.lineStyle(1.5, INK, 0.9);
  g.beginFill(STONE).drawRoundedRect(x - 7, y - 4, 14, 10, 3).endFill();
  g.beginFill(0, 0).drawRoundedRect(x - 4, y - 10, 8, 8, 3).endFill();
  g.lineStyle(0);
  g.beginFill(STONE_DARK, 0.6).drawRect(x - 6, y + 2, 12, 3).endFill();
}

function drawPosts(g: PIXI.Graphics, x: number, y: number) {
  // 梅花樁：五根短木樁排成梅花
  const pts: Array<[number, number]> = [
    [0, 0],
    [-10, -6],
    [10, -6],
    [-7, 8],
    [7, 8],
  ];
  for (const [dx, dy] of pts) {
    g.beginFill(0x000000, 0.18).drawEllipse(x + dx, y + dy + 6, 5, 2).endFill();
    g.lineStyle(1.2, INK, 0.9);
    g.beginFill(WOOD).drawRect(x + dx - 3.5, y + dy - 4, 7, 10).endFill();
    g.beginFill(0xb98d5c).drawEllipse(x + dx, y + dy - 4, 3.5, 1.8).endFill();
    g.lineStyle(0);
  }
}

function drawSeat(g: PIXI.Graphics, x: number, y: number) {
  // 教頭位：一張太師椅＋旁邊的兵器架
  g.beginFill(0x000000, 0.18).drawEllipse(x, y + 10, 11, 3.5).endFill();
  g.lineStyle(1.5, INK, 0.9);
  g.beginFill(WOOD_DARK).drawRect(x - 8, y - 14, 16, 12).endFill();
  g.beginFill(WOOD).drawRect(x - 9, y - 3, 18, 6).endFill();
  g.beginFill(WOOD_DARK);
  g.drawRect(x - 8, y + 3, 3, 7);
  g.drawRect(x + 5, y + 3, 3, 7);
  g.endFill();
  // 兵器架
  g.beginFill(WOOD).drawRect(x + 13, y - 18, 3, 28).endFill();
  g.lineStyle(1.2, 0xc8c2b4, 1);
  g.moveTo(x + 18, y - 20).lineTo(x + 18, y + 8);
  g.moveTo(x + 22, y - 16).lineTo(x + 22, y + 8);
  g.lineStyle(0);
  g.beginFill(RED).drawPolygon([x + 16.5, y - 22, x + 19.5, y - 22, x + 18, y - 16]).endFill();
}

function drawSandbag(g: PIXI.Graphics, x: number, y: number) {
  // 沙袋：木架吊一個布袋
  g.lineStyle(1.5, INK, 0.9);
  g.beginFill(WOOD_DARK);
  g.drawRect(x - 12, y - 22, 3, 32);
  g.drawRect(x + 9, y - 22, 3, 32);
  g.drawRect(x - 12, y - 24, 24, 3);
  g.endFill();
  g.moveTo(x, y - 21).lineTo(x, y - 15);
  g.beginFill(0xc9b48a).drawRoundedRect(x - 6, y - 15, 12, 20, 5).endFill();
  g.lineStyle(0);
  g.beginFill(0x000000, 0.15).drawEllipse(x, y + 11, 10, 3).endFill();
}

/** 門口：蓋住 W1 的封條，掛上紅綢（座標是 town.jpg 上封條的位置，像素）。 */
function drawGate(g: PIXI.Graphics) {
  g.lineStyle(1.2, INK, 0.8);
  g.beginFill(0x5a3b22).drawRect(1250, 842, 58, 52).endFill();
  g.lineStyle(1, 0x3a2614, 0.8);
  g.moveTo(1279, 842).lineTo(1279, 894);
  g.lineStyle(0);
  g.beginFill(0xd8b04a).drawCircle(1274, 870, 2).drawCircle(1284, 870, 2).endFill();
  // 紅綢
  g.beginFill(RED, 0.95);
  g.drawPolygon([1246, 836, 1312, 836, 1306, 846, 1279, 852, 1252, 846]);
  g.drawPolygon([1250, 844, 1256, 844, 1254, 866, 1248, 866]);
  g.drawPolygon([1302, 844, 1308, 844, 1310, 866, 1304, 866]);
  g.endFill();
  g.beginFill(0xe04a38).drawCircle(1279, 846, 6).endFill();
}

const DRAW: Record<string, (g: PIXI.Graphics, x: number, y: number) => void> = {
  dummies: drawDummy,
  'stone-locks': drawStoneLock,
  'plum-posts': drawPosts,
  'coach-seat': drawSeat,
  sandbag: drawSandbag,
};

/** 器具畫在座位旁邊：木人樁、沙袋在座位右邊一格（人面向右打），石鎖在腳邊，其他在座位上。 */
function spots(tileDim: number): Array<{ id: string; x: number; y: number }> {
  const out: Array<{ id: string; x: number; y: number }> = [];
  for (const o of OBJECTS) {
    if (o.element !== 'w04-dojo') continue;
    for (const [sx, sy] of o.slots) {
      const cx = sx * tileDim + tileDim / 2;
      const cy = sy * tileDim + tileDim / 2;
      if (o.id === 'dummies' || o.id === 'sandbag') out.push({ id: o.id, x: cx + tileDim * 0.85, y: cy - 2 });
      else if (o.id === 'stone-locks') out.push({ id: o.id, x: cx + 11, y: cy + 10 });
      else if (o.id === 'coach-seat') out.push({ id: o.id, x: cx, y: cy - 4 });
      else out.push({ id: o.id, x: cx, y: cy + 6 });
    }
  }
  return out;
}

export function DojoLayer(props: { tileDim: number; open: boolean }) {
  const list = useMemo(() => spots(props.tileDim), [props.tileDim]);
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      if (!props.open) return;
      drawGate(g);
      for (const s of list) DRAW[s.id]?.(g, s.x, s.y);
    },
    [list, props.open],
  );
  const style = useMemo(
    () =>
      new PIXI.TextStyle({
        fontFamily: LABEL_FONT,
        fontSize: 14,
        fontWeight: '700',
        fill: '#f6e7c1',
        letterSpacing: 2,
      }),
    [],
  );
  if (!props.open) return null;
  return (
    <Container eventMode="none">
      <Graphics draw={draw} />
      <Text text="開館" x={1279} y={872} anchor={{ x: 0.5, y: 0.5 }} style={style} />
    </Container>
  );
}
