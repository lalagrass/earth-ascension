// 武俠小鎮 A2（#575）：傳承譜系、擴散與單招追溯的純函式（UI 傳承面板與 wuxia:lineage／diffusion／art-trace 共用）。
// 只讀 A2State，不寫狀態。
import { A2State, ART_BY_ID, ARTS, Know, MOVE_BY_ID, TeachRecord, chainOf } from './data';

export type LineageEdge = {
  art: string;
  from: string;
  to: string;
  /** 這條邊上傳下去的招（招 id，照招表順序） */
  moves: string[];
  /** 有沒有正式教（teach）／只是看來的（watch） */
  teach: boolean;
  watch: boolean;
  /** 學的人這門裡還帶走樣的招數 */
  flawed: number;
  /** 再傳（正式教，但教的人自己不是開山的：#575「任何 prof ≥ 400 的人都能教」） */
  reteach: boolean;
  /** 轉手（來源自己不是開山的；含看來的） */
  secondhand: boolean;
  firstDay: number;
};

/** 誰（cid）的哪一招是從誰學來的：每人每招只留現在的來源（know.from） */
export function lineageEdges(st: A2State, art?: string): LineageEdge[] {
  const map = new Map<string, LineageEdge>();
  for (const to of Object.keys(st.know).sort()) {
    for (const id of Object.keys(st.know[to]).sort()) {
      const k = st.know[to][id];
      const m = MOVE_BY_ID[id];
      if (!m || k.via === 'origin' || !k.from || (art && m.family !== art)) continue;
      const key = `${m.family}|${k.from}|${to}`;
      const e = map.get(key) ?? { art: m.family, from: k.from, to, moves: [], teach: false, watch: false, flawed: 0, reteach: false, secondhand: false, firstDay: k.day };
      e.moves.push(id);
      if (k.via === 'teach') e.teach = true;
      if (k.via === 'watch') e.watch = true;
      if (k.flawed) e.flawed++;
      const second = !!st.know[k.from]?.[id] && st.know[k.from][id].via !== 'origin';
      if (second) e.secondhand = true;
      if (second && k.via === 'teach') e.reteach = true;
      e.firstDay = Math.min(e.firstDay, k.day);
      map.set(key, e);
    }
  }
  const order = (a: string) => ART_BY_ID[a]?.moves.map((m) => m.id) ?? [];
  const out = [...map.values()];
  for (const e of out) e.moves.sort((a, b) => order(e.art).indexOf(a) - order(e.art).indexOf(b));
  return out.sort((a, b) => a.art.localeCompare(b.art) || a.firstDay - b.firstDay || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}

/** 這門武學會的人（不含開山的）＋各自的代數（開山＝0；取所有招裡最深的一代） */
export function generations(st: A2State, art: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const cid of Object.keys(st.know).sort())
    for (const id of Object.keys(st.know[cid])) {
      if (MOVE_BY_ID[id]?.family !== art) continue;
      const g = chainOf(st.know, cid, id).length - 1;
      out[cid] = Math.max(out[cid] ?? 0, g);
    }
  return out;
}

/**
 * 正式傳承的代數（A6，#581）：只算「大師→甲→乙」每一環都是正式教（via teach）、一路回到開山的人（via origin）的招；
 * 中間有一環是看來的就不算。回傳每人（不含開山）在這門武學最深的正式代數（開山＝0）。
 */
export function formalGenerations(st: A2State, art: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const cid of Object.keys(st.know).sort())
    for (const id of Object.keys(st.know[cid])) {
      if (MOVE_BY_ID[id]?.family !== art) continue;
      const chain = chainOf(st.know, cid, id);
      const root = st.know[chain[chain.length - 1]]?.[id];
      if (!root || root.via !== 'origin') continue;
      if (!chain.slice(0, -1).every((c) => st.know[c][id].via === 'teach')) continue;
      out[cid] = Math.max(out[cid] ?? 0, chain.length - 1);
    }
  return out;
}

export type TreeLine = { depth: number; cid: string; edge?: LineageEdge };
/** 譜系樹：開山的人為根，依邊往下（同一人有多位來源時，每位來源底下各列一次；不重複展開已列過的子樹） */
export function lineageTree(st: A2State, art: string): TreeLine[] {
  const edges = lineageEdges(st, art);
  const root = ART_BY_ID[art]?.origin;
  const lines: TreeLine[] = [];
  const expanded = new Set<string>();
  const walk = (cid: string, depth: number, edge?: LineageEdge) => {
    lines.push({ depth, cid, edge });
    if (expanded.has(cid)) return;
    expanded.add(cid);
    for (const e of edges.filter((x) => x.from === cid)) walk(e.to, depth + 1, e);
  };
  if (root && st.know[root]) walk(root, 0);
  // 不在根底下的（例如來源已不在世界裡）也列出來
  for (const e of edges) if (!expanded.has(e.from) && !lines.some((l) => l.cid === e.from)) walk(e.from, 0);
  return lines;
}

export type Diffusion = {
  art: string;
  name: string;
  learners: number;
  teach: number;
  watch: number;
  reteach: number;
  flawed: number;
  deepest: number;
  /** 故事指紋：首學、首次轉傳、最深代數、改投——一眼看出這局的傳承故事 */
  fingerprint: string;
  curve: Array<[number, number]>;
};

const recDay = (r: TeachRecord) => `第 ${r.day} 日`;

export function diffusion(st: A2State, nameOf: (cid: string) => string = (c) => c): Diffusion[] {
  return ARTS.map((art) => {
    const gens = generations(st, art.id);
    const learners = Object.keys(gens).filter((c) => gens[c] > 0);
    let teach = 0;
    let watch = 0;
    let reteach = 0;
    let flawed = 0;
    for (const cid of learners)
      for (const [id, k] of Object.entries(st.know[cid]) as Array<[string, Know]>) {
        if (MOVE_BY_ID[id]?.family !== art.id) continue;
        if (k.via === 'teach') teach++;
        if (k.via === 'watch') watch++;
        if (k.flawed) flawed++;
        if (k.via === 'teach' && k.from && st.know[k.from]?.[id] && st.know[k.from][id].via !== 'origin') reteach++;
      }
    const recs = st.records.filter((r) => MOVE_BY_ID[r.move]?.family === art.id && !r.again);
    const first = recs[0];
    const second = recs.find((r) => r.from !== art.origin);
    const deepest = Math.max(0, ...Object.values(gens));
    const deepCid = Object.keys(gens).find((c) => gens[c] === deepest && deepest > 0);
    const sw = st.switches.filter((s) => s.toMaster === art.origin || s.fromMaster === art.origin);
    const parts = [
      first ? `首學 ${nameOf(first.to)}（${first.via === 'watch' ? '看' : '教'}，${recDay(first)}）` : '首學 —',
      second ? `首次轉傳 ${nameOf(second.from)}→${nameOf(second.to)}（${second.via === 'watch' ? '看' : '教'}，${recDay(second)}）` : '首次轉傳 —',
      deepest > 0 ? `最深 ${deepest} 代（${nameOf(deepCid!)}）` : '最深 —',
      sw.length ? `改投 ${sw.map((s) => `${nameOf(s.disciple)} ${nameOf(s.fromMaster)}→${nameOf(s.toMaster)} 第 ${s.day} 日`).join('、')}` : '改投 無',
    ];
    return {
      art: art.id,
      name: art.name,
      learners: learners.length,
      teach,
      watch,
      reteach,
      flawed,
      deepest,
      fingerprint: parts.join('｜'),
      curve: st.daily.map((d) => [d.day, d.learners[art.id] ?? 0] as [number, number]),
    };
  });
}

export type TraceStep = { cid: string; via: Know['via']; from: string | null; day: number; prof: number; cap?: number; flawed: boolean };
/** 某人某招一路追回開山的人；另附這人這招的所有紀錄（教、看、重教） */
export function artTrace(st: A2State, cid: string, move: string): { chain: TraceStep[]; records: TeachRecord[]; rootIsOrigin: boolean } {
  const chain = chainOf(st.know, cid, move)
    .map((c) => ({ c, k: st.know[c]?.[move] }))
    .filter((x) => x.k)
    .map(({ c, k }) => ({ cid: c, via: k!.via, from: k!.from, day: k!.day, prof: k!.prof, cap: k!.cap, flawed: k!.flawed }));
  const last = chain[chain.length - 1];
  return { chain, records: st.records.filter((r) => r.move === move && r.to === cid), rootIsOrigin: !!last && last.via === 'origin' };
}
