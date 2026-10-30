// v1.9 I-6 財富襲擊＋山賊勒索（ROADMAP-NEXT I-6；RimWorld 財富點數、Going Medieval 人數寬限、Songs of Syx／Kenshi 勒索可付錢）
// 威脅點數＝財富（錢＋存糧＋丹藥＋藥＋建築階數）÷div × 天數係數，封頂；全派（含雜工）<8 人時為 0（不來）。
// 山賊上門先勒索：付錢了事，或迎戰（勝率＝守方戰力／(戰力＋點數)）。只會重傷（氣血壓到 15），不會死人。
// 玩家在收支區按鈕選；半日內沒選就由執事比較勒索金與迎戰預期損失自動決定（長跑與無人值守都走這條）。
import { DAY, FACILITIES } from './data.mjs';
import { log, resAdd } from './util.mjs';
import { power } from './jianghu.mjs';
import { pickKind, kindOf } from './raidkind.mjs';
import { fenceUp, fenceHit, fenceHtml, FENCE } from './fence.mjs';
import { peaceDelay } from './peace.mjs';
import { BAND, newBand, bandWalk, defenderDps, canDefend } from './band.mjs';

export const RAID = { minPop: 8, minPopRules: 4, // loop12：開了「太平與備料」（江湖規則）的新局，山賊門檻降為 4 人＝開局人數，第 8 日起就會來
  first: 8, every: 6, jitter: 2, w: { coin: 1, food: 1, pill: 8, herb: 1, stage: 25 }, div: 2, dayK: 30, dayMax: 2, cap: 900,
  logAfter: 30, logK: 0.2, hurtCool: 2, // v2.1：第 30 日後天數係數改對數；山門重傷後下次上門再晚 hurtCool 日
  demand: { base: 20, k: 0.6, coinMax: 0.35, min: 10 }, wait: DAY / 2, hurtCost: 80, hurtHp: 15, winHurt: 0.4, steal: { coin: 0.15, food: 0.2 }, rep: 3 };
export function T(s) { return (s.threat ??= { next: RAID.first, n: 0, paid: 0, fought: 0, won: 0, homeHurt: 0, deaths: 0, pending: null, rng: 0, hist: [] }); }
const R = (s) => { const X = T(s); X.rng = ((X.rng || ((s.seed || 1) * 7477 + 29) % 2147483647) * 16807) % 2147483647; return X.rng / 2147483647; };
export const headcount = (s) => s.ds.filter((d) => !d.removed).length;
export function wealth(s) { const W = RAID.w, r = s.res; return Math.max(0, r.coin || 0) * W.coin + (r.food || 0) * W.food + (r.pill || 0) * W.pill + (r.herb || 0) * W.herb + FACILITIES.reduce((a, f) => a + (s.fac[f.id]?.stage || 0), 0) * W.stage; }
const linMul = (day) => Math.min(RAID.dayMax, 0.5 + day / RAID.dayK);
// 第 logAfter 日以前與舊線性相同；之後從當天的值接著以對數成長，不再爬到 dayMax。
export const dayMul = (s) => { const d = s.day || 0; if (d <= RAID.logAfter) return linMul(d); return Math.min(RAID.dayMax, linMul(RAID.logAfter) + Math.log(1 + (d - RAID.logAfter) / RAID.logAfter) * RAID.logK); };
export const minPopOf = (s) => (s.m9 ? RAID.minPopRules : RAID.minPop);
export function points(s) { if (headcount(s) < minPopOf(s)) return 0; return Math.min(RAID.cap, Math.round(wealth(s) / RAID.div * dayMul(s))); }
export const defense = (s) => power(s);
export const winP = (s, pts) => { const d = defense(s); return Math.max(0.1, Math.min(0.9, d / (d + pts))); };
export const demandOf = (s, pts) => Math.max(RAID.demand.min, Math.round(Math.min(Math.max(0, s.res.coin) * RAID.demand.coinMax, RAID.demand.base + pts * RAID.demand.k)));
// 自動決定：比較「勒索金」與「迎戰的預期損失」＝(1−勝率)×(被搶的錢＋糧＋一人重傷折 hurtCost)；勒索金較小且付得起才付
export const fightLoss = (s, p) => (1 - p) * (Math.max(0, s.res.coin) * RAID.steal.coin + (s.res.food || 0) * RAID.steal.food + RAID.hurtCost);
// loop4：有柵時執事先估「守方打光山賊」是否快過「山賊撞破柵」，快就迎戰；否則照舊比較
export function fenceHolds(s, pts) { if (!fenceUp(s)) return false; const dps = s.ds.filter(canDefend).reduce((a, d) => a + defenderDps(d), 0); if (dps <= 0) return false;
  const fd = Math.max(BAND.fenceDmg.min, Math.round(pts * BAND.fenceDmg.k)) / BAND.hitEvery; return pts / dps < s.fence.hp / fd; }
export const raidAuto = (s) => { const P = T(s).pending; if (P?.noPay) return 1; if (P && fenceHolds(s, P.pts)) return 1; return P && s.res.coin >= P.demand && P.demand < fightLoss(s, P.p) ? 0 : 1; };
// 每日一次（sim 換日時呼叫）：到期就看點數，>0 才上門
export function threatDaily(s) {
  const X = T(s); if (X.pending || (s.day || 0) < X.next) return null;
  X.next = s.day + RAID.every + Math.floor(R(s) * (2 * RAID.jitter + 1)) - RAID.jitter;
  if (s.m9) X.next += peaceDelay(s); // loop9 巡山太平→山賊延後
  let pts = points(s); if (pts <= 0) return null;
  const kind = s.m9 ? pickKind(R(s)) : null, K = kindOf(kind); if (K) pts = Math.max(1, Math.round(pts * K.pts)); // loop17 類型
  X.n++; const demand = K ? Math.round(demandOf(s, pts) * K.demand) : demandOf(s, pts), p = winP(s, pts);
  X.pending = { n: X.n, pts, demand, p: +p.toFixed(2), at: s.t, until: s.t + RAID.wait, day: s.day, ...(kind ? { kind } : {}), ...(K?.noPay ? { noPay: true } : {}) };
  if (K?.noPay) { log(s, `【${K.name}】一夥山賊（威脅 ${pts}）趁夜摸上山來，不談價錢！迎戰勝算約 ${Math.round(p * 100)}%。`); return X.pending; }
  log(s, `${K ? `【${K.name}】` : ''}【山賊勒索】一夥山賊盯上本門的家底（威脅 ${pts}）：「留下 ${demand} 兩香火錢，保你們平安。」迎戰勝算約 ${Math.round(p * 100)}%（半日內不決定就由執事代為處置）`);
  return X.pending;
}
export function threatStep(s, H) { const P = T(s).pending; if (P && s.t >= P.until) raidResolve(s, raidAuto(s), H, true); }
function hurtOne(s, H) {
  const c = s.ds.filter((d) => d.role !== 'laborer' && d.adult !== false && !d.away && d.hp > RAID.hurtHp); // 孩子不上陣 if (!c.length) return null;
  const d = c[Math.floor(R(s) * c.length)]; d.hp = Math.min(d.hp, RAID.hurtHp); d.raidHurt = (d.raidHurt || 0) + 1; const X = T(s); X.homeHurt++; X.next = (X.next || s.day || 0) + RAID.hurtCool; H?.think?.(s, d, 'raidHurt'); return d;
}
// i：0 付錢、1 迎戰；付不起就只能迎戰
function raidLose(s, H, who) { const K = kindOf(T(s).cur), m = K?.steal ?? 1; const c = Math.floor(Math.max(0, s.res.coin) * RAID.steal.coin * m), f = Math.floor((s.res.food || 0) * RAID.steal.food * m); if (c) resAdd(s, 'coin', -c); if (f) resAdd(s, 'food', -f); const hurt = K && !K.loseHurt ? null : hurtOne(s, H); log(s, `${who}迎戰山賊——敗了：被搶走 ${c} 錢、${f} 飯${hurt ? `，${hurt.name}重傷` : ''}（不會死人）。`); return hurt; }
// loop3：地圖上的山賊；每 tick 呼叫。守柵者＝task.act 'defend' 且已在柵邊動手
export function bandStep(s, dt, H) {
  const b = s.band; if (!b) return; const X = T(s); if (b.kind || X.cur) X.cur = b.kind;
  if (b.state === 'go') { if (bandWalk(b, dt)) { b.state = 'siege'; log(s, '山賊圍住了菜園木柵，開始撞柵！'); } return; }
  const defs = s.ds.filter((d) => d.task?.act === 'defend' && d.task.phase === 'do');
  const dmg = defs.reduce((a, d) => a + defenderDps(d), 0) * dt; b.hp -= dmg; b.defDealt += dmg;
  if (b.hp <= 0) { s.band = null; X.won++; s.rep = (s.rep || 0) + RAID.rep; log(s, `守柵迎敵——${defs.map((d) => d.name).join('、') || '眾人'}把山賊打退了！名聲 +${RAID.rep}。`); X.hist.push({ ...(X.cur ? { kind: X.cur } : {}), n: b.n, day: b.day, pts: b.pts, fight: 'win', hurt: null, map: true, fence: s.fence?.hp ?? 0 }); return; }
  b.clock += dt; if (b.clock < BAND.hitEvery) return; b.clock -= BAND.hitEvery;
  const fd = Math.max(BAND.fenceDmg.min, Math.round(b.pts * BAND.fenceDmg.k)); b.fenceDealt += fd;
  if (fenceHit(s, fd, '山賊', true).held) return;
  // loop14（方案 A）：柵破不再直接判敗，改回原勝率公式 winP 擲骰（與無柵同規則）
  s.band = null; const win = R(s) < winP(s, Math.max(1, b.hp)); let hurt = null; /* 用剩餘山賊戰力（守柵已削弱的部分算數） */
  if (win) { X.won++; s.rep = (s.rep || 0) + RAID.rep; if (R(s) < RAID.winHurt * (kindOf(X.cur)?.winHurt ?? 1)) hurt = hurtOne(s, H); log(s, `木柵被撞破，眾人短兵相接——打退了山賊！名聲 +${RAID.rep}${hurt ? `；${hurt.name}重傷` : ''}。`); }
  else hurt = raidLose(s, H, '木柵被撞破，');
  X.hist.push({ ...(X.cur ? { kind: X.cur } : {}), n: b.n, day: b.day, pts: b.pts, fight: win ? 'win' : 'lose', hurt: hurt?.id || null, map: true, broke: true });
}
export function raidResolve(s, i, H, auto = false) {
  const X = T(s), P = X.pending; if (!P) return { ok: false, why: '沒有山賊上門' };
  X.pending = null; const who = auto ? '執事代為決定：' : ''; if (P.kind || X.cur) X.cur = P.kind;
  if (i === 0 && !P.noPay && s.res.coin >= P.demand) { resAdd(s, 'coin', -P.demand); X.paid++; X.hist.push({ ...(X.cur ? { kind: X.cur } : {}), n: P.n, day: P.day, pts: P.pts, pay: P.demand }); log(s, `${who}付了 ${P.demand} 兩，山賊點完錢下山去了。`); return { ok: true, paid: P.demand }; }
  if (fenceUp(s)) { X.fought++; s.band = newBand(P, FENCE.node); if (P.kind) s.band.kind = P.kind; log(s, `${who}決定迎戰：${P.n > 0 ? '' : ''}一夥山賊（${P.pts}）從山門朝菜園木柵殺來！`); return { ok: true, band: true }; } // loop3：有柵改上地圖
  X.fought++; const win = R(s) < P.p; let hurt = null;
  if (win) { X.won++; s.rep = (s.rep || 0) + RAID.rep; if (R(s) < RAID.winHurt * (kindOf(X.cur)?.winHurt ?? 1)) hurt = hurtOne(s, H); log(s, `${who}迎戰山賊——打退了！名聲 +${RAID.rep}${hurt ? `；${hurt.name}重傷` : ''}。`); }
  else hurt = raidLose(s, H, who);
  X.hist.push({ ...(X.cur ? { kind: X.cur } : {}), n: P.n, day: P.day, pts: P.pts, fight: win ? 'win' : 'lose', hurt: hurt?.id || null}); return { ok: true, win, hurt: hurt?.id || null };
}
export function threatHtml(s) {
  const X = T(s), P = X.pending, pts = points(s), n = headcount(s);
  const head = `<div class="threat" data-threat><b>山賊</b>：${s.band ? `【${s.band.state === 'go' ? '正沿山路逼近' : '正在撞柵'}，山賊 ${Math.max(0, Math.round(s.band.hp))}/${s.band.max}】` : ''}${n < RAID.minPop ? `門裡才 ${n} 人，山賊還看不上（${RAID.minPop} 人起）` : `家底 ${Math.round(wealth(s))}，威脅 ${pts}（戰力 ${Math.round(defense(s))}）；下次約第 ${X.next} 日`}・來過 ${X.n} 次（付錢 ${X.paid}／迎戰 ${X.fought}，勝 ${X.won}）・山門重傷 ${X.homeHurt}`;
  if (!P) return head + '</div>' + fenceHtml(s);
  return `${head}<div class="raid-ask" data-raid-ask>${kindOf(P.kind) ? `【${kindOf(P.kind).name}】${kindOf(P.kind).desc}；` : ''}${P.noPay ? '不談價錢：' : `山賊要 ${P.demand} 兩：<button data-raid="0" ${s.res.coin < P.demand ? 'disabled' : ''}>付錢了事</button>`} <button data-raid="1">迎戰（勝算 ${Math.round(P.p * 100)}%）</button></div></div>${fenceHtml(s)}`;
}
