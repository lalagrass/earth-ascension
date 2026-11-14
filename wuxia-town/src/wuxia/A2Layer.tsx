// 武俠小鎮 A2（#575「畫面」）：地圖上的太極圖層。
// 1)「顯示太極」打開時：會太極的人腳下一圈（青＝正式學的、赭＝有走樣的招、金雙圈＝大師），圈大小隨會的招數。
// 2) 起勢 2 格動畫（public/wuxia/a2/qishi.png，tools/wuxia/bake-qishi.py 程式產生）：大師晨練／指點時頭上示範，
//    同一處在跟著練的人慢半拍（半個節拍）跟著做。只看狀態，不改規則；a2-master 關閉時不畫。
import { Container, Graphics, Sprite } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WuxiaState } from '../../convex/wuxia/state';
import { MASTER_CID, MOVE_BY_ID } from '../../convex/wuxia/a2_master/data';
import { a2StateOf, lifePeople } from './a2';

const SHEET = '/ai-town/wuxia/a2/qishi.png';
const BEAT_MS = 700;
const DEMO_ACTS = new Set(['taiji_form', 'instruct']);
const FOLLOW_ACTS = new Set(['practice_form', 'watch_form']);

function useFrames() {
  return useMemo(() => {
    const base = PIXI.BaseTexture.from(SHEET, { scaleMode: PIXI.SCALE_MODES.LINEAR });
    return [0, 1].map((i) => new PIXI.Texture(base, new PIXI.Rectangle(i * 32, 0, 32, 40)));
  }, []);
}

function Ring(props: { x: number; y: number; r: number; kind: 'master' | 'ok' | 'flawed' }) {
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      const color = props.kind === 'master' ? 0xc9a227 : props.kind === 'flawed' ? 0xb0673a : 0x2f7d73;
      g.lineStyle(2.5, color, 0.9);
      if (props.kind === 'flawed') {
        // A5（#577 第 3 節，色盲友善）：走樣不只靠橘色，另畫成虛線圈
        const n = 16;
        for (let i = 0; i < n; i += 1) {
          const a0 = (i / n) * Math.PI * 2;
          const a1 = a0 + (Math.PI * 2) / n / 2;
          g.moveTo(props.x + props.r * Math.cos(a0), props.y + props.r * 0.45 * Math.sin(a0));
          for (let k = 1; k <= 4; k++) {
            const a = a0 + ((a1 - a0) * k) / 4;
            g.lineTo(props.x + props.r * Math.cos(a), props.y + props.r * 0.45 * Math.sin(a));
          }
        }
      } else g.drawEllipse(props.x, props.y, props.r, props.r * 0.45);
      if (props.kind === 'master') {
        g.lineStyle(1.5, color, 0.7);
        g.drawEllipse(props.x, props.y, props.r + 5, (props.r + 5) * 0.45);
      }
    },
    [props.x, props.y, props.r, props.kind],
  );
  return <Graphics draw={draw} />;
}

export function A2Layer(props: { wuxia?: WuxiaState; tileDim: number; showTaiji: boolean; pos: (pid: string) => { x: number; y: number } | undefined }) {
  const st = a2StateOf({ wuxia: props.wuxia });
  const frames = useFrames();
  const people = lifePeople(props.wuxia);
  const pids = Object.keys(people).sort();
  const demo = pids.filter((pid) => people[pid].cid === MASTER_CID && people[pid].cur?.phase === 'do' && DEMO_ACTS.has(people[pid].cur?.act ?? ''));
  const followers = demo.length ? pids.filter((pid) => people[pid].cur?.phase === 'do' && FOLLOW_ACTS.has(people[pid].cur?.act ?? '')) : [];
  const animating = demo.length > 0;
  // 畫面節拍（只在畫面用牆鐘，不在引擎內）
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!animating) return;
    const id = setInterval(() => setNow(performance.now()), BEAT_MS / 4);
    return () => clearInterval(id);
  }, [animating]);
  if (!st) return null;
  const T = props.tileDim;
  const frameAt = (lag: number) => Math.floor((now - lag) / BEAT_MS) % 2;
  const rings: Array<{ pid: string; r: number; kind: 'master' | 'ok' | 'flawed' }> = [];
  if (props.showTaiji)
    for (const pid of pids) {
      const cid = people[pid].cid;
      const ks = Object.entries(st.know[cid] ?? {}).filter(([id]) => MOVE_BY_ID[id]?.family === 'taiji');
      if (!ks.length) continue;
      const kind = cid === MASTER_CID ? 'master' : ks.some(([, k]) => k.flawed) ? 'flawed' : 'ok';
      rings.push({ pid, r: T * (0.45 + 0.04 * ks.length), kind });
    }
  return (
    <Container>
      {rings.map((r) => {
        const p = props.pos(r.pid);
        if (!p) return null;
        return <Ring key={`ring-${r.pid}`} x={(p.x + 0.5) * T} y={(p.y + 0.95) * T} r={r.r} kind={r.kind} />;
      })}
      {[...demo.map((pid) => ({ pid, lag: 0 })), ...followers.map((pid) => ({ pid, lag: BEAT_MS / 2 }))].map(({ pid, lag }) => {
        const p = props.pos(pid);
        if (!p) return null;
        return (
          <Sprite
            key={`qishi-${pid}`}
            texture={frames[frameAt(lag)]}
            x={(p.x + 0.5) * T}
            y={(p.y - 0.55) * T}
            anchor={{ x: 0.5, y: 1 }}
            scale={lag ? 0.75 : 0.9}
            alpha={0.95}
          />
        );
      })}
    </Container>
  );
}
