import { tierOf } from './events.mjs';
// v0.95 存檔：逐版遷移步驟（每步只做「升到該版」需要的事），加上每次讀檔都跑的修補
import { RULES_VERSION, DISCIPLES, RECRUIT_POOL, MOOD, ECON, FACILITIES, CHORE_ACTS, DAY } from './data.mjs';
import { seedArts } from './arts.mjs';
import { affKey } from './util.mjs';
import { sectOf } from './sect.mjs';
import { genInit } from './gen.mjs';
import { suhuiOf } from './slice.mjs';
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
  { to: '0.96', note: '主角建立：悟性／根骨拆分、價值觀、同門', up(o) { for (const d of o.ds) d.wu ??= d.root; o.hero ??= null; o.choices ??= []; o.encExclude ??= []; } },
  { to: '0.97', note: '巡山風格、守關敵、清場率紀錄', up(o) { o.records ??= {}; o.records.clear ??= {}; o.records.qing ??= {}; if (o.exp) Object.assign(o.exp, { style: o.exp.style || 'steady', styleWhy: o.exp.styleWhy || [], seg: o.exp.seg || {}, evaded: o.exp.evaded || {}, chase: o.exp.chase || { n: 0, got: 0 }, gateI: o.exp.gateI ?? 0, gates: o.exp.gates || [], events: o.exp.events || [], gorgeT: o.exp.gorgeT ?? null }); } },
  { to: '0.98', note: '漸進解鎖、第一章終點', up(o) { o.unlock ??= ['base', 'arts', 'hunt', 'exp', 'social', 'econ']; o.chapter ??= { done: false }; } },
  { to: '1.0', note: '巡山第五段起、營地、秘笈、喜好、志向', up(o) { o.camps ??= {}; o.manuals ??= []; for (const d of o.ds || []) { delete d.restUntil; } } },
  { to: '1.1', note: '名俠奇遇、招牌武學', up(o) { o.xia ??= { done: {}, declined: {}, joinT: {}, cooks: 0, lastT: -1e9, pending: null, teacher: null, left: {} }; } },
  { to: '1.2', note: '華山線：紫霞、辟邪、九劍、風清揚', up(o) { o.hs ??= { zx: 0, cave: false, carv: 0, lastCarvDay: -1, bixie: 0, bixieT: null, songN: 0, songLast: 0, siguo: false, feng: null, fengLeft: false, fengTries: 0, jealous: false, lhc: 'stay', cards: {}, arcN: 0 }; } },
  { to: '1.3', note: '江湖群像：神鵰、倚天、鹿鼎、功夫、喜劇卡、晨課令', up(o) { o.jh ??= { cards: {}, comedy: [], comedyOn: true, morningOn: true, morningDay: -1, morning: null, diao: 0, armLost: false, honey: 0, zbt: null, dfbb: 0, hy: 0, hidden: 0, gambleDay: -1, gambleSum: 0, poison: null, arcs: {}, residue: {} }; } },
  { to: '1.35', note: '門派身分：門規、鎮派設施、宿敵守關、外門武學', up(o) { o.sect ??= sectOf(o.hero); } },
  { to: '1.4', note: '第二代：成親、收養、師承、衣缽、宿慧、年齡', up(o) { o.gen ??= genInit(); for (const d of o.ds) d.age ??= d.adult ? 22 : 10; } },
  { to: '1.45', note: '返程驚獸、三級事件、弟子狀態三行', up(o) { for (const e of o.log || []) { e.tier ??= tierOf(e.msg); } if (o.exp && o.exp.phase === 'back' && !o.exp.ret) { o.exp.ret = { left: [], hits: [], staLost: 0, lost: null }; o.exp.backPos ??= o.exp.dist; } o.alert ??= null; } },
  { to: '1.5', note: '新模擬核心：統一預約表、工序、需求遲滯/厭倦、巡山召回、結構化狀態', up(o) { v150Up(o); } },
];
// 1.45→1.5 一步遷移：菜畦 busy 旗標、進行中的歇息/煮飯/切磋聊天 → s.resv；補 tired/bored
export function v150Up(o) {
  o.resv ??= {}; const R = o.resv; const take = (d, k) => { if (R[k] && R[k] !== d.id) return false; R[k] = d.id; (d.task.resv ??= []).push(k); return true; };
  (o.plots || []).forEach((p, i) => { const d = p.busy && o.ds.find((x) => x.id === p.busy); if (d?.task?.act === 'farm') { d.task.plot = i; take(d, `plot:${i}`); } delete p.busy; });
  for (const d of o.ds) { d.tired ??= (d.needs?.energy ?? 100) <= 30; d.famished ??= (d.needs?.hunger ?? 100) <= 15; d.bored ??= {}; const t = d.task; if (!t) continue;
    if (t.partner) take(d, `actor:${t.partner}`);
    if (t.act === 'rest' || t.act === 'cook') { const st = FACILITIES.find((f) => f.id === t.fac)?.stages[o.fac?.[t.fac]?.stage || 0]; const cap = t.act === 'cook' ? 1 : st?.beds ?? 1; let ok = false; for (let i = 0; i < cap && !ok; i++) ok = take(d, `${t.fac}:${t.act}:${i}`); if (!ok && t.act === 'rest') { t.floor = true; take(d, `hall:floor:${d.id}`); } else if (!ok) d.task = null; } }
}
// 每次讀檔都跑：補最基本的不變式（手改或殘缺存檔也能讀）
function repair(o, D) { // v1.7 菜庫／倉庫預留改由預約表 stock:* 推得
  delete o.vegRes; o.resv ??= {}; for (const d of o.ds || []) { const t = d.task; const k = t?.act === 'cook' && t.phase !== 'done' ? 'veg' : t?.act === 'build' && t.phase === 'fetch' && t.mat ? t.mat : null; if (!k) continue; const key = `stock:${k}:${d.id}`; t.resv ??= []; if (!t.resv.includes(key)) t.resv.push(key); o.resv[key] ??= d.id; }
 o.cap ??= { wood: 12, stone: 12 }; o.fac ??= {}; for (const f of FACILITIES) o.fac[f.id] ??= { stage: 0, site: null }; o.cap.water ??= 12; o.cap.pill ??= 10; o.res.water ??= 0; o.res.pill ??= 0; if (o.sect?.fac && o.fac?.sig) o.fac.sig.stage = 1; for (const d of o.ds) { d.mood ??= MOOD.base; d.thoughts ??= []; d.why ??= []; d.needs.fun ??= 60; if (!d.personality?.length) d.personality = [...(D[d.id]?.personality || [])]; d.known ??= d.personality.slice(0, 1); } freshV095(o); }
export function migrate(o) {
  const from = o.rules || (o.ds.some((d) => 'mood' in d) ? '0.6' : '0.5'), D = defs();
  const steps = MIGRATIONS.filter((m) => ver(m.to) > ver(from));
  for (const m of steps) m.up(o, D);
  repair(o, D);
  o.migratedFrom = from === RULES_VERSION ? o.migratedFrom : from; o.rules = RULES_VERSION; o.migSteps = steps.map((m) => m.to);
  return o;
}
export const knownRules = (r) => typeof r === 'string' && (['0.5', '0.6', RULES_VERSION].includes(r) || MIGRATIONS.some((m) => m.to === r)) && ver(r) <= ver(RULES_VERSION);
export function save(s) { return JSON.stringify({ ...s, fx: [], legacy: { suhui: suhuiOf(s) } }); } // v1.7 宿慧隨檔
export function load(str) {
  let o; try { o = JSON.parse(str); } catch { return { ok: false, err: '存檔損毀' }; }
  if (!o || o.v !== SAVE_VERSION || !Array.isArray(o.ds)) return { ok: false, err: `不支援的存檔版本 ${o?.v}` };
  // review P2-2：規則版本必須是已知版本（不得為未來版本），否則拒讀、不動原檔
  if (o.rules != null && !knownRules(o.rules)) return { ok: false, err: `不支援的規則版本 ${o.rules}（目前 ${RULES_VERSION}）` };
  return { ok: true, state: migrate(o) };
}
