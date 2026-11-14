// 武俠小鎮 W6（#558）：切磋的畫面層——頭上「勢」圓點、擊中白光與「中！」、打完後的旁白框。
// 疊在人物上面；只看 src/wuxia/spar.ts（勢經由 boutView），w06-spar 關閉時不畫。
import { Container, Graphics, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useCallback } from 'react';
import { FLASH_MS, sparFx, sparOffset } from './spar';
import { LABEL_FONT } from './PlaceLabels';

type Props = {
  world: any;
  time: number;
  tileDim: number;
  /** playerId → 目前位置（tile） */
  pos: (id: string) => { x: number; y: number } | undefined;
};

const RED = 0xb3342a;
const INK = 0x2e261f;

function Dots(props: { x: number; y: number; n: number; max: number }) {
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      const r = 4;
      const gap = 11;
      const w = (props.max - 1) * gap;
      for (let i = 0; i < props.max; i++) {
        const cx = props.x - w / 2 + i * gap;
        g.lineStyle(1.5, INK, 0.95);
        g.beginFill(i < props.n ? RED : 0xf3ead6, i < props.n ? 1 : 0.85);
        g.drawCircle(cx, props.y, r);
        g.endFill();
      }
    },
    [props.x, props.y, props.n, props.max],
  );
  return <Graphics draw={draw} />;
}

function Flash(props: { x: number; y: number; a: number }) {
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      if (props.a <= 0) return;
      g.beginFill(0xffffff, 0.85 * props.a);
      const r = 18 + 10 * (1 - props.a);
      const pts: number[] = [];
      for (let i = 0; i < 16; i++) {
        const ang = (Math.PI * 2 * i) / 16;
        const rr = i % 2 === 0 ? r : r * 0.45;
        pts.push(props.x + Math.cos(ang) * rr, props.y + Math.sin(ang) * rr);
      }
      g.drawPolygon(pts);
      g.endFill();
    },
    [props.x, props.y, props.a],
  );
  return <Graphics draw={draw} />;
}

/** 旁白框：上緣在 y（畫在兩人腳下，不擋頭上的勢點） */
function Bubble(props: { x: number; y: number; text: string }) {
  const style = new PIXI.TextStyle({
    fontFamily: LABEL_FONT,
    fontSize: 15,
    fill: INK,
    wordWrap: true,
    wordWrapWidth: 260,
    breakWords: true,
    lineHeight: 20,
  });
  const metrics = PIXI.TextMetrics.measureText(props.text, style);
  const w = Math.min(280, metrics.width + 20);
  const h = metrics.height + 14;
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.lineStyle(2, INK, 0.9);
      g.beginFill(0xfaf3e0, 0.96);
      g.drawRoundedRect(props.x - w / 2, props.y, w, h, 6);
      g.endFill();
    },
    [props.x, props.y, w, h],
  );
  return (
    <Container>
      <Graphics draw={draw} />
      <Text text={props.text} x={props.x - w / 2 + 10} y={props.y + 7} style={style} />
    </Container>
  );
}

export function SparLayer({ world, time, tileDim, pos }: Props) {
  const fxs = sparFx(world, time);
  if (fxs.length === 0) return null;
  const px = (id: string) => {
    const p = pos(id);
    if (!p) return undefined;
    const o = sparOffset(world, id, time, tileDim, pos);
    return { x: p.x * tileDim + tileDim / 2 + o.dx, y: p.y * tileDim + tileDim / 2 + o.dy };
  };
  return (
    <Container>
      {fxs.map((fx) => {
        const m = fx.match;
        const pa = px(m.a);
        const pb = px(m.b);
        if (!pa || !pb) return null;
        const items: JSX.Element[] = [];
        if (fx.view) {
          items.push(<Dots key="da" x={pa.x} y={pa.y - tileDim * 1.45} n={fx.view.dots[0]} max={fx.view.max[0]} />);
          items.push(<Dots key="db" x={pb.x} y={pb.y - tileDim * 1.45} n={fx.view.dots[1]} max={fx.view.max[1]} />);
        }
        if (fx.hit && fx.since !== undefined && fx.since >= 0 && fx.since < FLASH_MS && fx.defender) {
          const d = px(fx.defender)!;
          const a = 1 - fx.since / FLASH_MS;
          items.push(<Flash key="f" x={d.x} y={d.y - 6} a={a} />);
          items.push(
            <Text
              key="t"
              text="中！"
              x={d.x + 10}
              y={d.y - tileDim * 1.1 - 10 * (1 - a)}
              alpha={Math.min(1, a * 1.5)}
              style={new PIXI.TextStyle({ fontFamily: LABEL_FONT, fontSize: 18, fontWeight: '700', fill: 0xffffff, stroke: INK, strokeThickness: 4 })}
            />,
          );
        }
        if (m.phase === 'rest' && m.narration) {
          items.push(<Bubble key="n" x={(pa.x + pb.x) / 2} y={Math.max(pa.y, pb.y) + tileDim * 0.7} text={m.narration.text} />);
        }
        return <Container key={m.id}>{items}</Container>;
      })}
    </Container>
  );
}
