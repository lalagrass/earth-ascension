// 武俠小鎮 W1：疊在地圖與人物上的畫面層（日夜色調、地點名牌）。live 的 PixiGame 與截圖頁共用。
import { Container } from '@pixi/react';
import { DayNightOverlay } from './DayNightOverlay';
import { PlaceLabels } from './PlaceLabels';
import type { ClockReading } from '../../convex/wuxia/clock';

export function SkinLayers(props: {
  worldWidthPx: number;
  worldHeightPx: number;
  tileDim: number;
  zoom: number;
  clock: ClockReading | null;
}) {
  return (
    <Container eventMode="none">
      {props.clock && (
        <DayNightOverlay
          width={props.worldWidthPx}
          height={props.worldHeightPx}
          minuteOfDay={props.clock.minuteOfDay}
        />
      )}
      <PlaceLabels tileDim={props.tileDim} zoom={props.zoom} />
    </Container>
  );
}
