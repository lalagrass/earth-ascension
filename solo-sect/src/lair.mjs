// loop19 遠征剿寨：山賊來過幾次後，執事查出山寨所在；有閒人、糧夠時自主組隊出山剿寨。
// 剿成→山賊很久不來（下次來犯延後 peaceDays）；剿敗→一人重傷、空手而回。只在 s.m9 生效（golden 不變）。
import { DAY } from './data.mjs';
import { power } from './jianghu.mjs';
import { T, points, RAID } from './threat.mjs';
import { log, resAdd } from './util.mjs';
import { mates } from './clique.mjs';
export const LAIR = { after: 3, team: 2, supply: 2, dur: DAY / 2, k: 1.0, peaceDays: 10, minHp: 60, winHurt: 0.3, cool: 5 };
const R = (s) => { const L = s.lair; L.rng = ((L.rng || ((s.seed || 1) * 4219 + 7) % 2147483647) * 16807) % 2147483647; return L.rng / 2147483647; };
const okD = (s, d) => d.role !== 'laborer' && d.adult !== false && !d.away && d.hp > LAIR.minHp && !d.order && !s.hunt?.team?.includes(d.id);
const sumPow = (s, team) => power({ ...s, ds: team });
// loop29（選用 s.lairpow）：寨子點數＝門派最強 top 人戰力×k，不再隨財富漲；預估 隊伍≈top3 的 2/3 → p≈.6
export const LAIRP = { top: 3, k: 0.45 };
export const lairOf = (s) => s.lair || null;
// 每日呼叫：條件齊就出發
export function lairDaily(s, H) {
  if (!s.m9) return null; const X = T(s); if ((X.n || 0) < LAIR.after) return null;
  const L = (s.lair ??= { found: s.day, n: 0, won: 0, next: 0, trip: null }); if (L.found === s.day && L.n === 0 && !L.logged) { L.logged = true; log(s, '【山寨】執事打聽到山賊在後山落草的寨子了，人手夠時就去剿。'); }
  if (L.trip || s.day < L.next || X.pending || s.band || X.wave || s.exp) return null;
  const need = LAIR.team * LAIR.supply; if ((s.res.food || 0) < need + 4) return null;
  const c = s.ds.filter((d) => okD(s, d)).sort((a, b) => sumPow(s, [b]) - sumPow(s, [a])); if (c.length < LAIR.team + 1) return null; // 至少留一人看家
  let team = c.slice(0, LAIR.team); if (s.draw) { const lead = c[0], m = mates(s, lead).map((id) => c.find((d) => d.id === id)).filter(Boolean); if (m.length) team = [lead, ...m].slice(0, LAIR.team); } /* loop20 同派同行 */ const pts = s.lairpow ? Math.max(1, Math.round(sumPow(s, c.slice(0, LAIRP.top)) * LAIRP.k)) : Math.max(1, Math.round(points(s) * LAIR.k)); /* loop29 寨強看戰力（選用） */ if (pts <= 0) return null; const pow = sumPow(s, team);
  resAdd(s, 'food', -need); for (const d of team) { H?.cancelTask?.(s, d, '出山剿寨'); d.away = true; d.path = []; d.reason = '出山剿寨'; }
  L.trip = { ids: team.map((d) => d.id), pts, back: s.t + LAIR.dur, pow }; L.n++;
  log(s, `【剿寨】${team.map((d) => d.name).join('、')}帶 ${need} 份糧出山剿寨（寨中約 ${pts} 點）。`); return L.trip;
}
// 每 tick：到時間就回來結算
export function lairStep(s, H) {
  const L = s.lair, tr = L?.trip; if (!tr || s.t < tr.back) return; L.trip = null;
  const team = tr.ids.map((id) => s.ds.find((d) => d.id === id)).filter(Boolean); for (const d of team) { d.away = false; d.reason = '剿寨歸來'; if (H?.gate) d.pos = [...H.gate]; }
  const p = Math.max(0.1, Math.min(0.9, tr.pow / (tr.pow + tr.pts))), win = R(s) < p; let hurt = null;
  if (!win || R(s) < LAIR.winHurt) { { hurt = team[Math.floor(R(s) * team.length)]; if (hurt) { hurt.hp = Math.min(hurt.hp, RAID.hurtHp); hurt.raidHurt = (hurt.raidHurt || 0) + 1; T(s).homeHurt++; H?.think?.(s, hurt, 'raidHurt'); } } }
  const X = T(s); if (win) { L.won++; X.next = Math.max(X.next || 0, s.day) + LAIR.peaceDays; s.rep = (s.rep || 0) + RAID.rep * 2; L.next = X.next; log(s, `【剿寨】大破山寨！山賊作鳥獸散，至少 ${LAIR.peaceDays} 日不敢來犯。名聲 +${RAID.rep * 2}${hurt ? `；${hurt.name}重傷` : ''}。`); }
  else { L.next = s.day + LAIR.cool; log(s, `【剿寨】寨子太硬，攻不下來${hurt ? `，${hurt.name}重傷` : ''}，只好先撤回。`); }
  (L.hist ??= []).push({ day: s.day, pts: tr.pts, p: +p.toFixed(2), win, hurt: hurt?.id || null });
}
