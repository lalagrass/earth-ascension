// 武俠小鎮 W1：地圖上的地點名牌（紙底墨框）。名牌跟著地圖移動，但縮小時會反向放大，維持可讀。
import { Container, Graphics, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useCallback, useMemo } from 'react';
import { PLACES, Place } from './skin';

export const LABEL_FONT = '"Noto Serif TC", "Noto Serif CJK TC", "Songti TC", "PMingLiU", serif';

function Label({ place, tileDim, zoom }: { place: Place; tileDim: number; zoom: number }) {
  const [lx, ly] = place.label ?? [place.rect[0] + place.rect[2] / 2, place.rect[1] - 0.15];
  const small = place.kind === 'house' || place.kind === 'landmark';
  const fontSize = small ? 13 : 16;
  const style = useMemo(
    () =>
      new PIXI.TextStyle({
        fontFamily: LABEL_FONT,
        fontSize,
        fontWeight: '700',
        fill: place.kind === 'dojo' ? '#5b4a3a' : '#2b2119',
        letterSpacing: 2,
      }),
    [fontSize, place.kind],
  );
  const text = place.name;
  const w = PIXI.TextMetrics.measureText(text, style).width + 14;
  const h = fontSize + 10;
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.beginFill(0xf4ecd6, place.kind === 'dojo' ? 0.75 : 0.92);
      g.lineStyle(1.5, 0x3a2e24, 0.9);
      g.drawRoundedRect(-w / 2, -h / 2, w, h, 3);
      g.endFill();
      if (place.kind === 'shop' || place.kind === 'gate') {
        g.lineStyle(0);
        g.beginFill(0xb3342a, 0.95); // 朱印小點
        g.drawRect(w / 2 - 6, -h / 2 + 2, 4, 4);
        g.endFill();
      }
    },
    [w, h, place.kind],
  );
  const scale = Math.max(1, 0.95 / zoom);
  return (
    <Container x={lx * tileDim} y={ly * tileDim} scale={scale}>
      <Graphics draw={draw} />
      <Text text={text} style={style} anchor={{ x: 0.5, y: 0.5 }} y={0} />
    </Container>
  );
}

export function PlaceLabels({ tileDim, zoom }: { tileDim: number; zoom: number }) {
  return (
    <Container>
      {PLACES.filter((p) => p.kind !== 'house' || zoom > 0.8).map((p) => (
        <Label key={p.id} place={p} tileDim={tileDim} zoom={zoom} />
      ))}
    </Container>
  );
}
