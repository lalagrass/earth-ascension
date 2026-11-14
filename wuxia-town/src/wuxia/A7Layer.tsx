// 武俠小鎮 A7（#584「畫面」）：武館水缸、柴堆的存量條，替武館挑水砍柴的人頭上的小圖示。
// 只讀狀態、畫面自己的圖形（程式畫，不用上游美術）；a7-tuition 關閉時不畫。由 A2Layer 掛上（本機版、Convex 版、截圖頁共用）。
import { Container, Graphics, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useCallback, useMemo } from 'react';
import type { WuxiaState } from '../../convex/wuxia/state';
import { CHORE_ACTS, a7Of } from '../../convex/wuxia/a7_tuition/data';
import { NEEDS_CONFIG } from '../../convex/wuxia/w03_life/data';
import { lifePeople } from './a2';

const LABEL_FONT = '"Noto Serif TC", "Noto Serif CJK TC", serif';
/** 水缸、柴堆在地圖上的格（objects.json dojo-vat／dojo-woodpile 的 tile） */
const VAT = { x: 34, y: 28 };
const WOOD = { x: 36, y: 28 };
const BAR_W = 38;

function Bar(props: { x: number; y: number; frac: number; color: number; label: string }) {
  const style = useMemo(() => new PIXI.TextStyle({ fontFamily: LABEL_FONT, fontSize: 11, fontWeight: '700', fill: '#f6e7c1' }), []);
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.beginFill(0x000000, 0.45).drawRoundedRect(props.x - 1, props.y - 1, BAR_W + 2, 8, 2).endFill();
      g.beginFill(props.frac < 0.15 ? 0xc0392b : props.color, 0.95).drawRect(props.x, props.y, Math.max(0, BAR_W * Math.min(1, props.frac)), 6).endFill();
    },
    [props.x, props.y, props.frac, props.color],
  );
  return (
    <Container>
      <Graphics draw={draw} />
      <Text text={props.label} x={props.x - 13} y={props.y - 3} style={style} />
    </Container>
  );
}

/** 柴堆（程式畫：三層疊起的圓木端面） */
function Woodpile(props: { x: number; y: number }) {
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      const logs: Array<[number, number]> = [[0, 0], [9, 0], [18, 0], [4.5, -7], [13.5, -7], [9, -14]];
      for (const [dx, dy] of logs) {
        g.beginFill(0xb98b52).lineStyle(1, 0x6b4a22, 1).drawCircle(props.x + dx, props.y + dy, 5).endFill();
        g.lineStyle(0.8, 0x8a6430, 0.9).drawCircle(props.x + dx, props.y + dy, 2.2);
      }
    },
    [props.x, props.y],
  );
  return <Graphics draw={draw} />;
}

function ChoreIcon(props: { x: number; y: number; kind: 'haul' | 'chop' }) {
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.beginFill(0xffffff, 0.9).lineStyle(1, 0x4a3a28, 1).drawCircle(props.x, props.y, 8).endFill();
      g.lineStyle(0);
      if (props.kind === 'haul') {
        g.beginFill(0x3f7fb3).drawRect(props.x - 4, props.y - 2, 8, 6).endFill();
        g.lineStyle(1.2, 0x4a3a28, 1).arc(props.x, props.y - 2, 4, Math.PI, 0);
      } else {
        g.lineStyle(2.2, 0x8a5a2a, 1).moveTo(props.x - 4, props.y + 4).lineTo(props.x + 3, props.y - 4);
        g.lineStyle(0).beginFill(0x6b7b88).drawRect(props.x + 1, props.y - 6, 5, 4).endFill();
      }
    },
    [props.x, props.y, props.kind],
  );
  return <Graphics draw={draw} />;
}

export function A7Layer(props: { wuxia?: WuxiaState; tileDim: number; pos: (pid: string) => { x: number; y: number } | undefined }) {
  const st = a7Of(props.wuxia);
  if (!st || !props.wuxia) return null;
  const T = props.tileDim;
  const life = props.wuxia.elements['w03-life'] as { stock?: Record<string, { water: number; wood: number }> } | undefined;
  const stock = life?.stock?.dojo ?? { water: 0, wood: 0 };
  const people = lifePeople(props.wuxia);
  const workers = Object.keys(people)
    .sort()
    .filter((pid) => CHORE_ACTS.includes(people[pid].cur?.act ?? ''));
  return (
    <Container eventMode="none">
      <Bar x={(VAT.x - 0.4) * T} y={(VAT.y - 0.75) * T} frac={stock.water / NEEDS_CONFIG.stock.max.water} color={0x3f7fb3} label="水" />
      <Woodpile x={(WOOD.x + 0.2) * T} y={(WOOD.y + 0.3) * T} />
      <Bar x={(WOOD.x - 0.1) * T} y={(WOOD.y - 0.85) * T} frac={stock.wood / NEEDS_CONFIG.stock.max.wood} color={0xb98b52} label="柴" />
      {workers.map((pid) => {
        const p = props.pos(pid);
        if (!p) return null;
        return <ChoreIcon key={`chore-${pid}`} x={(p.x + 0.5) * T} y={(p.y - 0.9) * T} kind={people[pid].cur!.act === 'dojo_haul' ? 'haul' : 'chop'} />;
      })}
    </Container>
  );
}
