// 武俠小鎮 W8：外人（行商、外地俠客、山賊）的畫面層。外人不是 AI Town 的玩家（不聊天、不佔人數），
// 由 w08-jianghu 在引擎裡移動；這裡用自繪的小人（斗笠／頭巾、袍色）＋名牌＋頭上表情畫出來。不用任何外部美術。
import { Container, Graphics, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useCallback } from 'react';
import type { Figure } from '../../convex/wuxia/w08_jianghu/data';
import { jianghuStateOf } from './jianghu';
import { LABEL_FONT } from './PlaceLabels';

const ROBE: Record<Figure['kind'], number> = { merchant: 0x8a6a43, xiake: 0x2f5d7c, bandit: 0x5a2a22 };
const INK = 0x2e261f;

function Body(props: { kind: Figure['kind']; x: number; y: number; t: number }) {
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      const { x, y } = props;
      // 影子
      g.beginFill(0x000000, 0.18);
      g.drawEllipse(x, y + 13, 9, 3.5);
      g.endFill();
      // 袍子
      g.lineStyle(1.5, INK, 0.9);
      g.beginFill(ROBE[props.kind]);
      g.drawPolygon([x - 8, y + 12, x + 8, y + 12, x + 5, y - 2, x - 5, y - 2]);
      g.endFill();
      // 頭
      g.beginFill(0xf0d2b0);
      g.drawCircle(x, y - 7, 5);
      g.endFill();
      // 斗笠（俠客）／頭巾（山賊）／扁擔（行商）
      if (props.kind === 'xiake') {
        g.beginFill(0xc9a96a);
        g.drawPolygon([x - 11, y - 9, x + 11, y - 9, x, y - 17]);
        g.endFill();
      } else if (props.kind === 'bandit') {
        g.beginFill(0x1e1a18);
        g.drawRect(x - 5.5, y - 12, 11, 4);
        g.endFill();
      } else {
        g.lineStyle(2, 0x5b4128, 1);
        g.moveTo(x - 13, y + 1);
        g.lineTo(x + 13, y - 1);
        g.lineStyle(1.5, INK, 0.9);
        g.beginFill(0xb88a4a);
        g.drawRect(x - 15, y + 1, 6, 6);
        g.drawRect(x + 9, y - 1, 6, 6);
        g.endFill();
      }
    },
    [props.kind, props.x, props.y],
  );
  return <Graphics draw={draw} />;
}

/**
 * A1（#564 審查第 3 項）：同一格（四捨五入）上同種外人合併成一個名牌「山賊 ×2」，身體錯開半格；
 * 名牌只寫名字（活動文字不顯示，頭上 emoji 表示在做什麼），不再疊字。
 */
export function groupFigures(figures: Figure[]): Array<{ key: string; figures: Figure[]; label: string }> {
  const groups = new Map<string, Figure[]>();
  for (const f of figures) {
    const k = `${f.kind}:${Math.round(f.x)},${Math.round(f.y)}`;
    const g = groups.get(k) ?? [];
    g.push(f);
    groups.set(k, g);
  }
  return [...groups].map(([key, fs]) => ({
    key,
    figures: fs,
    label: fs.length === 1 ? fs[0].name : `${KIND_NAME[fs[0].kind]} ×${fs.length}`,
  }));
}
const KIND_NAME: Record<Figure['kind'], string> = { merchant: '行商', xiake: '俠客', bandit: '山賊' };

export function JianghuLayer(props: { world: any; tileDim: number; time: number }) {
  const st = jianghuStateOf(props.world);
  if (!st || st.figures.length === 0) return null;
  const nameStyle = new PIXI.TextStyle({ fontFamily: LABEL_FONT, fontSize: 12, fill: 0xfaf3e0, stroke: INK, strokeThickness: 3 });
  const emojiStyle = new PIXI.TextStyle({ fontSize: 16 });
  return (
    <Container>
      {groupFigures(st.figures).map((g) => {
        const f0 = g.figures[0];
        const x = f0.x * props.tileDim + props.tileDim / 2;
        const y = f0.y * props.tileDim + props.tileDim / 2;
        return (
          <Container key={g.key}>
            {g.figures.map((f, i) => (
              <Body key={f.id} kind={f.kind} x={x + (i - (g.figures.length - 1) / 2) * props.tileDim * 0.5} y={y} t={props.time} />
            ))}
            <Text text={f0.emoji} x={x} y={y - 30} anchor={{ x: 0.5, y: 0.5 }} style={emojiStyle} />
            <Text text={g.label} x={x} y={y + 22} anchor={{ x: 0.5, y: 0.5 }} style={nameStyle} />
          </Container>
        );
      })}
    </Container>
  );
}
