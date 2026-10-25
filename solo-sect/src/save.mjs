// v0.95 存檔：逐版遷移步驟（每步只做「升到該版」需要的事），加上每次讀檔都跑的修補
import { RULES_VERSION, DISCIPLES, RECRUIT_POOL, MOOD, ECON, FACILITIES, CHORE_ACTS, DAY } from './data.mjs';
import { seedArts } from './arts.mjs';
import { affKey } from './util.mjs';
export const SAVE_VERSION = 1;
const ver = (r) => parseFloat(r);
const defs = () => Object.fromEntries(DISCIPLES.concat(RECRUIT_POOL).map((d) => [d.id, d]));
export function freshV095(o) { // 0.95 新欄位（新局與遷移共用）
  o.codex ??= {}; o.exp ??= null; o.lastExp ??= null; o.records ??= { sect: 0, who: null }; o.expN ??= 0;
  o.pace ??= { done: [], trial: null }; o.guide ??= { on: true, msg: null, seen: [] };
  o.res.page1 ??= 0; o.res.page2 ??= 0; o.res.hide ??= 0; o.res.gall ??= 0;
  for (const d of o.ds) { d.best ??= 0; d.insight ??= {}; d.away ??= false; }
  return o;
}
export const MIGRATIONS = [
  { to: '0.6', note: '心情與想法', up(o, D) { for (const d of o.ds) { d.mood ??= MOOD.base; d.thoughts ??= []; d.why ??= []; if (!d.personality?.length) d.personality = [...(D[d.id]?.personality || [])]; } } },
  { to: '0.7', note: '特質揭露、樂趣、雙向好感', up(o) { for (const d of o.ds) { d.known ??= d.personality.slice(0, 1); d.together ??= 0; d.needs.fun ??= 60; }
    if (!o.aff) { o.aff = {}; for (const [k, v] of Object.entries(o.rel || {})) { const [a, b] = k.split('|'); o.aff[affKey(a, b)] = v; o.aff[affKey(b, a)] = v; } } } },
  { to: '0.8', note: '木石錢、工地料堆、帳本', up(o) { o.cap ??= { wood: 12 }; o.res.stone ??= 0; o.res.coin ??= ECON.coinStart; o.cap.stone ??= 12; o.laborGone ??= [];
    for (const f of FACILITIES) o.fac[f.id] ??= { stage: 0, site: null };
    for (const v of Object.values(o.fac)) { const st = v.site; if (st && typeof st.delivered === 'number') v.site = { need: { wood: st.need.wood || 0, stone: 0 }, delivered: { wood: st.delivered, stone: 0 }, reserved: { wood: 0, stone: 0 }, work: st.work || 0, workNeed: st.workNeed, paused: false }; }
    for (const d of o.ds) if (d.task?.act === 'build' && (d.task.reservedWood !== undefined || d.carry?.wood)) { if (d.carry?.wood) o.res.wood += d.carry.wood; d.carry = null; d.task = null; d.path = []; d.anim = null; }
    o.day ??= Math.floor(o.t / DAY) + 1; o.ledger ??= { day: o.day, in: {}, out: {} }; o.ledgerPrev ??= null; } },
  { to: '0.85', note: '內外門與日課', up(o) { for (const d of o.ds) { d.role ??= 'disciple'; if (d.role === 'disciple') d.role = 'inner'; if (d.role !== 'laborer') { d.duties ??= [...CHORE_ACTS]; d.prio ??= 'normal'; d.chore ??= 0; d.choreDebt ??= 0; d.contrib ??= 0; } } o.choreRate ??= null; } },
  { to: '0.9', note: '根骨與武學', up(o, D) { for (const d of o.ds) { if (d.root == null) { d.root = D[d.id]?.root ?? 3; d.rootKnown = true; } seedArts(d); } } },
  { to: '0.92', note: '瓶頸旗標與每階一招', up(o) { for (const d of o.ds) seedArts(d); } },
  { to: '0.95', note: '敵人圖鑑、巡山遠征、前期里程碑', up(o) { freshV095(o); } },
];
// 每次讀檔都跑：補最基本的不變式（手改或殘缺存檔也能讀）
function repair(o, D) { o.cap ??= { wood: 12, stone: 12 }; for (const d of o.ds) { d.mood ??= MOOD.base; d.thoughts ??= []; d.why ??= []; d.needs.fun ??= 60; if (!d.personality?.length) d.personality = [...(D[d.id]?.personality || [])]; d.known ??= d.personality.slice(0, 1); } freshV095(o); }
export function migrate(o) {
  const from = o.rules || (o.ds.some((d) => 'mood' in d) ? '0.6' : '0.5'), D = defs();
  const steps = MIGRATIONS.filter((m) => ver(m.to) > ver(from));
  for (const m of steps) m.up(o, D);
  repair(o, D);
  o.migratedFrom = from === RULES_VERSION ? o.migratedFrom : from; o.rules = RULES_VERSION; o.migSteps = steps.map((m) => m.to);
  return o;
}
export function save(s) { return JSON.stringify({ ...s, fx: [] }); }
export function load(str) {
  let o; try { o = JSON.parse(str); } catch { return { ok: false, err: '存檔損毀' }; }
  if (!o || o.v !== SAVE_VERSION || !Array.isArray(o.ds)) return { ok: false, err: `不支援的存檔版本 ${o?.v}` };
  return { ok: true, state: migrate(o) };
}
