// 武俠小鎮 A1：「重要事件」偵測（#564 第 2 項：拜師、切磋、外人進鎮時自動降速並聚焦；「跳到下一件事」）。
// 只讀世界狀態的計數器（各元素的 seq／history），不寫入，hash 不變。
import { W06_SPAR, SparState } from '../../../convex/wuxia/w06_spar/data';
import { W07_BOND, BondState } from '../../../convex/wuxia/w07_bond/data';
import { W08_JIANGHU, JianghuState } from '../../../convex/wuxia/w08_jianghu/data';

export type KeyEventKind = 'spar' | 'bow' | 'jianghu';
export type KeyEvent = { kind: KeyEventKind; label: string; at?: { x: number; y: number } };

export type EventMarks = { spar: number; bow: number; jianghu: number };

type W = { wuxia?: { elements: Record<string, unknown> }; players?: any };

export function eventMarks(world: W): EventMarks {
  const el = world.wuxia?.elements ?? {};
  const spar = el[W06_SPAR] as SparState | undefined;
  const bond = el[W07_BOND] as BondState | undefined;
  const jh = el[W08_JIANGHU] as JianghuState | undefined;
  return { spar: spar?.seq ?? 0, bow: bond?.seq ?? 0, jianghu: jh?.seq ?? 0 };
}

const JIANGHU_LABEL: Record<string, string> = { xiake: '外地俠客進鎮', bandit: '山賊進鎮', xiaobi: '武館小比', story: '說書人來了' };

/** 兩次標記之間發生的重要事件（位置：切磋雙方中點、外人位置；給畫面聚焦用）。 */
export function keyEventsBetween(
  before: EventMarks,
  world: W,
  posOf: (playerId: string) => { x: number; y: number } | undefined,
): KeyEvent[] {
  const now = eventMarks(world);
  const out: KeyEvent[] = [];
  const el = world.wuxia?.elements ?? {};
  if (now.spar > before.spar) {
    const st = el[W06_SPAR] as SparState;
    const m = st.active[st.active.length - 1];
    const a = m && posOf(m.a);
    out.push({ kind: 'spar', label: '切磋開始', at: a });
  }
  if (now.bow > before.bow) {
    const st = el[W07_BOND] as BondState;
    const at = st.active && posOf(st.active.a);
    out.push({ kind: 'bow', label: '拜師', at });
  }
  if (now.jianghu > before.jianghu) {
    const st = el[W08_JIANGHU] as JianghuState;
    const kind = st.active?.kind;
    if (kind) {
      const f = st.figures.find((x) => x.kind === kind) ?? st.figures[st.figures.length - 1];
      out.push({ kind: 'jianghu', label: JIANGHU_LABEL[kind] ?? '江湖事件', at: f ? { x: f.x, y: f.y } : undefined });
    }
  }
  return out;
}
