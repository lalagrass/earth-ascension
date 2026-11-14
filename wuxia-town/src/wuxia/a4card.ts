// 武俠小鎮 A4（#576 第 3 節）：結算卡。buildCard 只讀世界狀態（純函式）；cardSvg 畫成 1200×630 的 SVG，
// 瀏覽器用 canvas 轉 PNG 下載，wuxia:card 用 Playwright 轉 PNG。故事每條都帶 a4 事件 id。
import type { WuxiaState } from '../../convex/wuxia/state';
import { A2_MASTER } from '../../convex/wuxia/a2_master/data';
import type { A2State } from '../../convex/wuxia/a2_master/data';
import { generations, lineageTree } from '../../convex/wuxia/a2_master/lineage';
import {
  A4_PLAY,
  A4State,
  INTERVENTION_LABEL,
  SCENARIO_BY_ID,
  TIERS,
  TIER_LABEL,
  Tier,
  consequences,
  pickStory,
  storyText,
} from '../../convex/wuxia/a4_play/data';
import { profileById } from '../../convex/wuxia/w02_folk';

const nameOf = (cid: string) => profileById(cid)?.name ?? cid;
export const TOWN_NAME = '山腳鎮'; // 與首頁、鎮誌同名

export type Card = {
  town: string;
  scenario: string;
  scenarioId: string;
  seed: number;
  day: number;
  reason?: 'gold' | 'time';
  tiers: Array<{ tier: Tier; label: string; day?: number }>;
  summary: string;
  story: Array<{ id: number; day: number; text: string; ref?: { src: string; id: number } }>;
  storyText: string;
  tree: Array<{ depth: number; name: string; flawed: number; watch: boolean; teach: boolean }>;
  interventions: Array<{ id: number; day: number; label: string; target: string; after: Array<{ id: number; text: string }> }>;
};

export function buildCard(w: WuxiaState): Card | undefined {
  const st = w.elements[A4_PLAY] as A4State | undefined;
  if (!st || !st.scenario) return undefined;
  const sc = SCENARIO_BY_ID[st.scenario];
  const a2 = w.elements[A2_MASTER] as A2State | undefined;
  const story = pickStory(st);
  const gens = a2 ? generations(a2, 'taiji') : {};
  const learners = Object.values(gens).filter((g) => g > 0).length;
  const deepest = Math.max(0, ...Object.values(gens));
  const best = [...TIERS].reverse().find((t) => st.goals[t] !== undefined);
  const day = st.ended?.day ?? st.day;
  const summary = `${best ? `第 ${st.goals[best]} 日達成${TIER_LABEL[best]}級` : `${day} 日未達成目標`}；${learners} 人會太極，傳到第 ${deepest} 代；用了 ${st.used.length} 次緣`;
  return {
    town: TOWN_NAME,
    scenario: sc.name,
    scenarioId: sc.id,
    seed: w.seed,
    day,
    reason: st.ended?.reason,
    tiers: TIERS.map((t) => ({ tier: t, label: sc.goals[t].label, day: st.goals[t] })),
    summary,
    story: story.map((e) => ({ id: e.id, day: e.day, text: e.text, ref: e.ref })),
    storyText: storyText(story),
    tree: a2
      ? lineageTree(a2, 'taiji').map((l) => ({ depth: l.depth, name: nameOf(l.cid), flawed: l.edge?.flawed ?? 0, watch: !!l.edge?.watch && !l.edge?.teach, teach: !!l.edge?.teach }))
      : [],
    interventions: st.used.map((iv) => ({
      id: iv.id,
      day: iv.day,
      label: INTERVENTION_LABEL[iv.kind],
      target: nameOf(iv.target) + (iv.other ? `→${nameOf(iv.other)}` : ''),
      after: consequences(st, iv).map((e) => ({ id: e.id, text: e.text })),
    })),
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 中文按字寬折行（全形 1、半形 0.55） */
export function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  let w = 0;
  for (const ch of text) {
    const cw = /[\x00-\xff]/.test(ch) ? 0.55 : 1;
    if (w + cw > width) {
      out.push(line);
      line = '';
      w = 0;
    }
    line += ch;
    w += cw;
  }
  if (line) out.push(line);
  return out;
}

const FONT = `'Noto Serif CJK TC','Noto Serif TC','Source Han Serif TC','Noto Sans CJK TC','PingFang TC','Microsoft JhengHei',serif`;
const MEDAL: Record<Tier, string> = { bronze: '#b0703a', silver: '#9aa3ad', gold: '#d4a017' };

/** 1200×630 的結算卡 SVG（鎮名、劇本、三級目標、師承樹、一句話總結、故事、seed）。 */
export function cardSvg(c: Card): string {
  const t: string[] = [];
  const text = (x: number, y: number, s: string, size: number, fill = '#2b2118', weight = 400, anchor = 'start') =>
    t.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}">${esc(s)}</text>`);
  t.push(`<rect width="1200" height="630" fill="#f2e6cc"/>`);
  t.push(`<rect x="18" y="18" width="1164" height="594" fill="none" stroke="#7a5a3a" stroke-width="3"/>`);
  t.push(`<rect x="26" y="26" width="1148" height="578" fill="none" stroke="#7a5a3a" stroke-width="1"/>`);
  text(60, 92, `${c.town}・${c.scenario}`, 46, '#3a2514', 700);
  text(1140, 92, `第 ${c.day} 日${c.reason === 'gold' ? '・功成' : '・結算'}`, 26, '#6b4a2b', 400, 'end');
  // 三級目標
  c.tiers.forEach((x, i) => {
    const y = 140 + i * 40;
    const got = x.day !== undefined;
    t.push(`<circle cx="74" cy="${y - 9}" r="13" fill="${got ? MEDAL[x.tier] : 'none'}" stroke="${MEDAL[x.tier]}" stroke-width="3"/>`);
    const label = wrap(x.label, 19)[0] + (wrap(x.label, 19).length > 1 ? '…' : '');
    text(98, y, `${TIER_LABEL[x.tier]}　${label}`, 20, got ? '#2b2118' : '#9a8a74');
    if (got) text(590, y, `第 ${x.day} 日`, 18, '#6b4a2b', 400, 'end');
  });
  // 師承樹（左）
  text(60, 290, '師承', 24, '#3a2514', 700);
  t.push(`<line x1="60" y1="300" x2="560" y2="300" stroke="#7a5a3a" stroke-width="1"/>`);
  const rows = c.tree.slice(0, 9);
  rows.forEach((l, i) => {
    const y = 330 + i * 24;
    const x = 66 + Math.min(l.depth, 6) * 34;
    if (l.depth > 0) t.push(`<path d="M${x - 22} ${y - 20} V${y - 7} H${x - 6}" fill="none" stroke="#a08060" stroke-width="1.5"/>`);
    text(x, y, l.name + (l.watch ? '（看來的）' : '') + (l.flawed ? `　走樣 ${l.flawed}` : ''), 19, l.watch ? '#8a7a64' : '#2b2118', l.depth === 0 ? 700 : 400);
  });
  if (c.tree.length > rows.length) text(66, 330 + rows.length * 24, `……另 ${c.tree.length - rows.length} 人`, 17, '#8a7a64');
  if (!c.tree.length) text(66, 330, '（這一局沒有人學到）', 19, '#8a7a64');
  // 總結與故事（右）
  t.push(`<line x1="610" y1="120" x2="610" y2="580" stroke="#c9b28c" stroke-width="1"/>`);
  wrap(c.summary, 19).slice(0, 3).forEach((s, i) => text(640, 146 + i * 30, s, 24, '#7a2e1a', 700));
  text(640, 252, '這一局的故事', 22, '#3a2514', 700);
  wrap(c.storyText, 26).slice(0, 11).forEach((s, i) => text(640, 284 + i * 27, s, 19));
  text(60, 592, `seed ${c.seed}・同一個 seed 再玩一次，換一種牽法`, 17, '#6b4a2b');
  text(1140, 592, '武俠小鎮', 17, '#6b4a2b', 700, 'end');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="${esc(FONT)}">${t.join('')}</svg>`;
}
