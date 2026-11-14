// 武俠小鎮 A2（#575「畫面」）：傳承面板（譜系樹＋會的人數曲線＋可點的邊→單招追溯）、人物詳情「武學」分頁、
// 角落提示（可點→選中那個人）、「顯示太極」開關。本機版（LocalApp）與 Convex 版（Game.tsx）共用；a2-master 關閉時都不顯示。
import { useState } from 'react';
import type { WuxiaState } from '../../convex/wuxia/state';
import { ARTS, ART_BY_ID, MOVE_BY_ID } from '../../convex/wuxia/a2_master/data';
import type { A2State } from '../../convex/wuxia/a2_master/data';
import { rankOf } from '../../convex/wuxia/a6_spread/data';
import { artTrace, diffusion, generations, lineageTree } from '../../convex/wuxia/a2_master/lineage';
import { a2StateOf, cidName, pidOfCid } from './a2';
import { a7Of } from '../../convex/wuxia/a7_tuition/data';

function Curve(props: { points: Array<[number, number]>; max: number }) {
  const W = 220;
  const H = 46;
  const pts = props.points;
  if (pts.length < 2) return <p className="wuxia-a2-note">（還沒有每日紀錄）</p>;
  const x = (i: number) => 4 + (i * (W - 8)) / (pts.length - 1);
  const y = (v: number) => H - 4 - (v * (H - 10)) / Math.max(1, props.max);
  const d = pts.map(([, v], i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg className="wuxia-a2-curve" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-label="會的人數曲線">
      <path d={d} fill="none" stroke="#7a2a20" strokeWidth={2} />
      <text x={4} y={10} fontSize={9} fill="#5a4630">
        第 {pts[0][0]} 日
      </text>
      <text x={W - 4} y={10} fontSize={9} fill="#5a4630" textAnchor="end">
        第 {pts[pts.length - 1][0]} 日：{pts[pts.length - 1][1]} 人
      </text>
    </svg>
  );
}

/** A7（#584）：這條邊上正式教的招是付束脩（束脩）還是以工代學（以工）學來的；兩種都有寫「束脩＋以工」，師父不收束脩的再傳寫「免」 */
function edgeFee(learned: Record<string, 'paid' | 'work'>, cid: string, moves: string[]): string {
  const kinds = new Set(moves.map((m) => learned[`${cid}|${m}`]).filter(Boolean));
  if (kinds.size === 0) return '免';
  return [...kinds].map((k) => (k === 'paid' ? '束脩' : '以工')).join('＋');
}

/** 這人這門武學最高的熟練度（段位用） */
function bestProf(st: A2State, cid: string, art: string): number {
  return Math.max(0, ...Object.entries(st.know[cid] ?? {}).filter(([id]) => MOVE_BY_ID[id]?.family === art).map(([, k]) => k.prof));
}

/** 傳承面板：每門武學一棵樹；點名字＝選中那人；點「←」那條邊＝看那條邊第一招的追溯 */
export function LineagePanel(props: { wuxia?: WuxiaState; onPick?: (pid: string) => void }) {
  const st = a2StateOf({ wuxia: props.wuxia });
  const [art, setArt] = useState(ARTS[0].id);
  const [trace, setTrace] = useState<{ cid: string; move: string }>();
  if (!st) return null;
  const rows = diffusion(st, cidName);
  const row = rows.find((r) => r.art === art)!;
  const gens = generations(st, art);
  const tree = lineageTree(st, art);
  const pick = (cid: string) => {
    const pid = pidOfCid(props.wuxia, cid);
    if (pid) props.onPick?.(pid);
  };
  const a7 = a7Of(props.wuxia);
  const t = trace ? artTrace(st, trace.cid, trace.move) : undefined;
  return (
    <div className="wuxia-a2-lineage" data-testid="wuxia-a2-lineage">
      <div className="wuxia-tab-bar" role="tablist">
        {ARTS.map((a) => (
          <button key={a.id} role="tab" className={a.id === art ? 'on' : ''} onClick={() => (setArt(a.id), setTrace(undefined))}>
            {a.name}
          </button>
        ))}
      </div>
      <p className="wuxia-a2-note">
        {st.arrivedAt === undefined ? '大師還沒進鎮。' : `${cidName(ART_BY_ID.taiji.origin)}第 ${Math.floor(st.arrivedAt / 1440) + 1} 日進鎮。`}
        會的人 {row.learners}・教 {row.teach}・看 {row.watch}・再傳 {row.reteach}・走樣 {row.flawed} 招
      </p>
      <Curve points={row.curve} max={Math.max(1, ...row.curve.map((p) => p[1]))} />
      <p className="wuxia-a2-finger" title="故事指紋">{row.fingerprint}</p>
      <ul className="wuxia-a2-tree">
        {tree.length === 0 && <li>（還沒有人會）</li>}
        {tree.map((l, i) => (
          <li key={i} style={{ paddingLeft: `${l.depth * 0.9}rem` }}>
            <button className="wuxia-a2-name" onClick={() => pick(l.cid)}>
              {cidName(l.cid)}
            </button>
            {/* A7（#584）：束脩元素開著時不強調代數（owner：傳承分出幾代沒有價值），邊標「束脩／以工」 */}
            {!a7 && <span className="wuxia-a2-gen">{gens[l.cid] ? `${gens[l.cid]} 代` : '開山'}</span>}
            {a7 && !gens[l.cid] && <span className="wuxia-a2-gen">開山</span>}
            {!!gens[l.cid] && (
              <span className={`wuxia-a2-rank ${rankOf(bestProf(st, l.cid, art))}`} title="熟練段位：入門＜120、小成 120–400、大成 ≥400（小成起就能教起勢）">
                {rankOf(bestProf(st, l.cid, art))}
              </span>
            )}
            {l.edge && (
              <button
                className={`wuxia-a2-edge${l.edge.flawed ? ' flawed' : ''}${l.edge.watch && !l.edge.teach ? ' watch' : ''}`}
                data-testid="wuxia-a2-edge"
                title="看這條傳承"
                onClick={() => setTrace({ cid: l.cid, move: l.edge!.moves[0] })}
              >
                ← {l.edge.teach && l.edge.watch ? '教＋看' : l.edge.teach ? '教' : '看'}
                {a7 && l.edge.teach ? `・${edgeFee(a7.learned, l.cid, l.edge.moves)}` : ''}
                {l.edge.reteach ? '・再傳' : ''} {l.edge.moves.length} 招{l.edge.flawed ? `（走樣 ${l.edge.flawed}）` : ''}
              </button>
            )}
          </li>
        ))}
      </ul>
      {t && trace && (
        <div className="wuxia-a2-trace" data-testid="wuxia-a2-trace">
          <b>
            {cidName(trace.cid)}的『{MOVE_BY_ID[trace.move].name}』
          </b>
          <ol>
            {t.chain.map((s) => (
              <li key={s.cid}>
                {cidName(s.cid)}：{s.via === 'origin' ? '開山' : `${s.via === 'teach' ? '跟' : '看'}${cidName(s.from!)}${s.via === 'teach' ? '學' : '打'}`}
                ，第 {s.day} 日・熟練 {Math.round(s.prof)}
                {s.cap !== undefined ? `／上限 ${s.cap}` : ''}
                {s.flawed ? '・走樣' : ''}
              </li>
            ))}
          </ol>
          <button className="wuxia-a2-name" onClick={() => setTrace(undefined)}>
            收起
          </button>
        </div>
      )}
    </div>
  );
}

/** 人物詳情「武學」分頁：會的招（熟練條、上限、走樣、跟誰學）與由招推導的拳腳 */
export function ArtPanel(props: { wuxia?: WuxiaState; playerId?: string }) {
  const st = a2StateOf({ wuxia: props.wuxia });
  const people = (props.wuxia?.elements['w03-life'] as { people?: Record<string, { cid: string }> } | undefined)?.people;
  const cid = props.playerId ? people?.[props.playerId]?.cid : undefined;
  if (!st || !cid) return null;
  const know = st.know[cid] ?? {};
  const skills = (props.wuxia?.elements['w04-dojo'] as { skills?: Record<string, { stance: number; power: number; fist: number }> } | undefined)?.skills?.[cid];
  const interest = st.interest[cid];
  return (
    <div className="wuxia-a2-art" data-testid="wuxia-a2-art">
      {skills && (
        <p>
          拳腳 <b>{skills.fist}</b>（身體＋招數推導）
          {interest !== undefined && `・對太極的興趣 ${Math.round(interest)}`}
        </p>
      )}
      {ARTS.map((art) => {
        const ms = art.moves.filter((m) => know[m.id]);
        if (!ms.length) return null;
        return (
          <div key={art.id}>
            <p className="wuxia-a2-artname">{art.name}</p>
            {ms.map((m) => {
              const k = know[m.id];
              const cap = k.cap ?? 1000;
              return (
                <div key={m.id} className="wuxia-a2-move">
                  <span className="wuxia-a2-mname">
                    {m.name}
                    <small>（難 {m.difficulty}）</small>
                  </span>
                  <span className={`wuxia-a2-bar${k.flawed ? ' flawed' : ''}`}>
                    <span style={{ width: `${Math.min(100, k.prof / 10)}%` }} />
                    <i style={{ left: `${Math.min(100, cap / 10)}%` }} />
                  </span>
                  <span className="wuxia-a2-mval">
                    {Math.round(k.prof)}
                    {k.via === 'origin' ? '・開山' : `・${k.via === 'teach' ? '跟' : '看'}${cidName(k.from!)}`}
                    {k.flawed ? '・走樣' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
      {Object.keys(know).length === 0 && <p className="wuxia-a2-note">還不會任何招。</p>}
    </div>
  );
}

/** 角落提示：最近 3 則（拜師、偷學、教招、改投、大師進鎮）；點一下選中那個人 */
export function A2Hints(props: { wuxia?: WuxiaState; onPick?: (pid: string) => void }) {
  const st = a2StateOf({ wuxia: props.wuxia });
  if (!st || !st.hints.length) return null;
  const last = st.hints.slice(-3).reverse();
  return (
    <div className="wuxia-a2-hints" data-testid="wuxia-a2-hints">
      {last.map((h) => (
        <button
          key={h.id}
          className={`wuxia-a2-hint ${h.kind}`}
          onClick={() => {
            const pid = h.who ? pidOfCid(props.wuxia, h.who) : undefined;
            if (pid) props.onPick?.(pid);
          }}
        >
          第 {Math.floor(h.gm / 1440) + 1} 日　{h.text}
        </button>
      ))}
    </div>
  );
}

/** Convex 版右上角：「傳承」面板開關＋「顯示太極」 */
export function A2Corner(props: { wuxia?: WuxiaState; taiji: boolean; onTaiji: (on: boolean) => void; onPick?: (pid: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!a2StateOf({ wuxia: props.wuxia })) return null;
  return (
    <div className="wuxia-a2-corner" data-testid="wuxia-a2-corner">
      <button className={open ? 'on' : ''} onClick={() => setOpen(!open)} data-testid="wuxia-btn-lineage">
        傳承
      </button>
      <TaijiToggle on={props.taiji} onChange={props.onTaiji} />
      {open && <LineagePanel wuxia={props.wuxia} onPick={props.onPick} />}
      <A2Hints wuxia={props.wuxia} onPick={props.onPick} />
    </div>
  );
}

export function TaijiToggle(props: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="wuxia-a2-toggle" data-testid="wuxia-taiji-toggle">
      <input type="checkbox" checked={props.on} onChange={(e) => props.onChange(e.target.checked)} />
      顯示太極
    </label>
  );
}
