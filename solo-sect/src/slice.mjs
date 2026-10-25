// v0.98 可玩切片：漸進解鎖面板、第一章終點、存檔輪替（純函式，可在 Node 測試）
import { log } from './util.mjs';
import { ROUTE } from './data.mjs';
// 面板解鎖：開局只看到建造／弟子／紀事；前 10 分鐘內（1× 速）一定能派巡山
export const UNLOCKS = [
  { id: 'base', secs: ['build', 'ds'], when: () => true, msg: null },
  { id: 'arts', secs: ['arts'], when: (s) => s.t >= 120 || s.pace?.done.includes('trial'), msg: '武學圖：看看弟子練到哪一層' },
  { id: 'hunt', secs: ['hunt'], when: (s) => s.t >= 240, msg: '後山狩獵：野豬會下山拱菜，帶人去守點' },
  { id: 'exp', secs: ['exp', 'codex'], when: (s) => s.t >= 480 || s.pace?.trial === 'done', msg: '巡山遠征與敵人圖鑑：派 1–4 人上山，看能走多遠' },
  { id: 'social', secs: ['rel', 'recruit'], when: (s) => s.t >= 600 || (s.rep || 0) >= 5, msg: '人際與招收：名聲夠了就能收徒' },
  { id: 'econ', secs: ['ledger', 'labor', 'ranks'], when: (s) => s.t >= 900 || Object.values(s.fac).some((f) => f.site || f.stage > 0), msg: '收支、工寮與內外門：門派開始像個樣子' },
];
export const ALL_SECS = UNLOCKS.flatMap((u) => u.secs);
export function unlockStep(s) {
  s.unlock ??= [];
  for (const u of UNLOCKS) if (!s.unlock.includes(u.id) && u.when(s)) { s.unlock.push(u.id); if (u.msg) { log(s, `【新面板】${u.msg}`); s.newUnlock = u.id; } }
}
export const secOpen = (s, sec) => !s.unlock || UNLOCKS.some((u) => s.unlock.includes(u.id) && u.secs.includes(sec));
// 第一章「立足山門」：三個目標全達成 → 章節完成總結，可繼續玩
export const CHAPTER1 = { name: '第一章・立足山門', goals: [
  { id: 'gate', name: `巡山越過${ROUTE[1].gateName}（${ROUTE[1].to} 步）`, ok: (s) => (s.records?.sect || 0) >= ROUTE[1].to },
  { id: 'build', name: '設施累計升級 2 次', ok: (s) => Object.values(s.fac).reduce((a, f) => a + f.stage, 0) >= 2 },
  { id: 'people', name: '門下弟子 4 人以上', ok: (s) => s.ds.filter((d) => d.role !== 'laborer').length >= 4 },
] };
export function chapterStep(s) {
  if (s.chapter?.done) return;
  s.chapter ??= { done: false };
  if (!CHAPTER1.goals.every((g) => g.ok(s))) return;
  const day = Math.floor(s.t / 600) + 1, ds = s.ds.filter((d) => d.role !== 'laborer');
  s.chapter = { done: true, seen: false, t: Math.round(s.t), day, summary: { day, people: ds.map((d) => d.name), rep: s.rep, best: s.records.sect, exps: s.expN || 0, kills: Object.values(s.codex || {}).reduce((a, c) => a + c.kills, 0), qing: Object.values(s.records.qing || {}).reduce((a, b) => a + b, 0), coin: s.res.coin, food: s.res.food } };
  s.rep = (s.rep || 0) + 5; log(s, `【${CHAPTER1.name}】完成！第 ${day} 日，門下 ${ds.length} 人，巡山最遠 ${s.records.sect} 步。（名聲 +5，可繼續經營）`);
}
// 存檔輪替：autosave 寫入 3 格輪替（store：有 getItem/setItem 的物件）
export const AUTO = { keys: 3, prefix: 'solo-sect-auto-', every: 60 };
export function autosave(store, str, meta) {
  const idx = ((+store.getItem(AUTO.prefix + 'i') || 0) + 1) % AUTO.keys;
  store.setItem(AUTO.prefix + idx, str); store.setItem(AUTO.prefix + idx + '-meta', JSON.stringify(meta)); store.setItem(AUTO.prefix + 'i', String(idx)); return idx;
}
export function autoList(store) {
  const out = []; for (let i = 0; i < AUTO.keys; i++) { const m = store.getItem(AUTO.prefix + i + '-meta'); if (m) out.push({ i, ...JSON.parse(m) }); }
  return out.sort((a, b) => b.at - a.at);
}
export const autoGet = (store, i) => store.getItem(AUTO.prefix + i);
// v1.5 測試/腳本用：直接開啟巡山解鎖（模擬層 canExpedition 已守解鎖）
export const openExp = (s) => { if (s.unlock && !s.unlock.includes('exp')) s.unlock.push('exp'); return s; };
