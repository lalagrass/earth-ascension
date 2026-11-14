// 武俠小鎮 A3（#574 第 5 節）：地圖上的無言互動泡泡。
// 發起方頭上：互動圖示＋話題圖示；回應方頭上：反應表情＋小字 ±關係（多人互動時每個學生都畫）。
// 圖示是程式畫的 16px（public/wuxia/a3/icons.png，tools/wuxia/bake-a3-icons.py），不用 emoji 字型。
// 點泡泡 → onPick(紀錄)（「翻成一句話」）。只看狀態，不改規則；a3-silent 關閉時不畫。
import { Container, Graphics, Sprite, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';
import './pixiTextFix';
import { useCallback, useMemo } from 'react';
import type { WuxiaState } from '../../convex/wuxia/state';
import type { SocialEntry } from '../../convex/wuxia/a3_silent/data';
import { a3StateOf, activeEntries } from './a3';
import { pidOfCid } from './a2';
import { LABEL_FONT } from './PlaceLabels';

const SHEET = '/ai-town/wuxia/a3/icons.png';
export const ICON_COL: Record<string, [number, number]> = {
  greet: [0, 0], chat: [1, 0], inquire: [2, 0], rumor: [3, 0], boast: [4, 0], ask_advice: [5, 0],
  instruct: [6, 0], complain: [7, 0], comfort: [8, 0], thank: [9, 0], apologize: [10, 0], provoke: [11, 0],
  't:art': [0, 1], 't:food': [1, 1], 't:money': [2, 1], 't:beast': [3, 1], 't:bandit': [4, 1], 't:love': [5, 1],
  't:home': [6, 1], 't:person': [7, 1], 't:rumor': [8, 1],
  'r:happy': [0, 2], 'r:angry': [1, 2], 'r:sad': [2, 2], 'r:shy': [3, 2], 'r:surprised': [4, 2],
};
const AXIS_LABEL: Record<string, string> = { close: '親', respect: '敬', rival: '爭' };

function useIcons() {
  return useMemo(() => {
    const base = PIXI.BaseTexture.from(SHEET, { scaleMode: PIXI.SCALE_MODES.NEAREST });
    const out: Record<string, PIXI.Texture> = {};
    for (const [k, [c, r]] of Object.entries(ICON_COL)) out[k] = new PIXI.Texture(base, new PIXI.Rectangle(c * 16, r * 16, 16, 16));
    return out;
  }, []);
}

function Bubble(props: { x: number; y: number; w: number; h: number; tail: boolean }) {
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.lineStyle(1.5, 0x2b2119, 1);
      g.beginFill(0xfaf4e4, 0.96);
      g.drawRoundedRect(props.x, props.y, props.w, props.h, 6);
      g.endFill();
      if (props.tail) {
        g.beginFill(0xfaf4e4, 0.96);
        g.moveTo(props.x + props.w / 2 - 4, props.y + props.h - 1);
        g.lineTo(props.x + props.w / 2, props.y + props.h + 5);
        g.lineTo(props.x + props.w / 2 + 4, props.y + props.h - 1);
        g.endFill();
      }
    },
    [props.x, props.y, props.w, props.h, props.tail],
  );
  return <Graphics draw={draw} />;
}

/** 這筆互動讓 who 對對方的關係變化小字（例：+2親）。 */
export function bondText(e: SocialEntry, who: string): string {
  return e.effects
    .filter((f) => f.k === 'bond' && f.who === who)
    .map((f: any) => `${f.d > 0 ? '+' : ''}${f.d}${AXIS_LABEL[f.axis] ?? ''}`)
    .join(' ');
}

export function SocialLayer(props: {
  wuxia?: WuxiaState;
  tileDim: number;
  pos: (pid: string) => { x: number; y: number } | undefined;
  onPick?: (e: SocialEntry) => void;
}) {
  const st = a3StateOf({ wuxia: props.wuxia });
  const icons = useIcons();
  if (!st) return null;
  const T = props.tileDim;
  const S = 20; // 畫面上每個圖示的邊長（16px 原圖 ×1.25）
  const style = new PIXI.TextStyle({ fontFamily: LABEL_FONT, fontSize: 11, fontWeight: '700', fill: 0x2b2119 });
  const entries = activeEntries(st, st.minute);
  // 同一人同時只畫最新一筆
  const seen = new Set<string>();
  const items: Array<{ key: string; pid: string; kind: 'a' | 'b'; e: SocialEntry; cid: string }> = [];
  for (const e of [...entries].reverse()) {
    for (const [cid, kind] of [[e.a, 'a'], [e.b, 'b'], ...(e.with ?? []).map((c) => [c, 'b'])] as Array<[string, 'a' | 'b']>) {
      if (seen.has(cid)) continue;
      seen.add(cid);
      const pid = pidOfCid(props.wuxia, cid);
      if (pid) items.push({ key: `${e.id}-${cid}`, pid, kind, e, cid });
    }
  }
  return (
    <Container>
      {items.map((it) => {
        const p = props.pos(it.pid);
        if (!p) return null;
        const cx = (p.x + 0.5) * T;
        const top = (p.y - 0.95) * T - S;
        const txt = it.kind === 'b' ? bondText(it.e, it.cid) : '';
        const w = it.kind === 'a' ? S * 2 + 10 : S + 8 + (txt ? txt.length * 6.5 + 4 : 0);
        const x0 = cx - w / 2;
        const first = it.kind === 'a' ? icons[it.e.kind] : icons[`r:${it.e.react}`];
        return (
          <Container key={it.key} interactive={true} cursor="pointer" pointerdown={() => props.onPick?.(it.e)}>
            <Bubble x={x0} y={top - 4} w={w} h={S + 8} tail />
            {first && <Sprite texture={first} x={x0 + 4} y={top} width={S} height={S} />}
            {it.kind === 'a' && icons[`t:${it.e.topic}`] && <Sprite texture={icons[`t:${it.e.topic}`]} x={x0 + 6 + S} y={top} width={S} height={S} />}
            {txt && <Text text={txt} x={x0 + S + 7} y={top + 4} style={style} />}
          </Container>
        );
      })}
    </Container>
  );
}
