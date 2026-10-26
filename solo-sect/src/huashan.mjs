// v1.2 華山線（PROTAGONIST §4.3、ROADMAP §11）：岳不群（紫霞九層、辟邪三卡、嵩山施壓、嫉令狐沖與逐出）、
// 令狐沖（模板主線＋名俠奇遇）、風清揚（思過崖傳獨孤九劍，傳完就走）
import { DAY, HS, DUGU, TIERS, MOVES } from './data.mjs';
import { learnArt, artTier } from './arts.mjs';
import { addWexin, mkComp } from './hero.mjs';
import { think } from './mind.mjs';
import { log, resAdd } from './util.mjs';
import { removeActor } from './lifecycle.mjs';
import { initPair } from './social.mjs';
import { xidOf, present } from './wuxia.mjs';
import { TREES, buildCards } from './destiny.mjs';
export const hsInit = () => ({ zx: 0, cave: false, carv: 0, lastCarvDay: -1, bixie: 0, bixieT: null, songN: 0, songLast: 0, siguo: false, feng: null, fengLeft: false, fengTries: 0, jealous: false, lhc: 'stay', cards: {}, arcN: 0 });
const heroD = (s) => s.ds.find((d) => d.id === 'hero');
const isHero = (s, id) => s.hero?.kind === 'template' && s.hero.id === id;
const find = (s, x) => s.ds.find((d) => xidOf(s, d) === x);
const once = (s, k) => { if (s.hs.cards[k]) return false; s.hs.cards[k] = true; return true; };
// ---- 抉擇卡（自動駕駛依價值觀；偽君子做虧心事一律添違心） ----
const P = (k) => `assets/portraits/${k}.png`;
// v2.0 A8：卡文字／選項／價值觀移至 destiny-trees.json；此處只留效果函式（依選項序號）
const FX = {
  lin2: [(s) => { s.hs.bixie = 2; s.align = (s.align ?? 40) - 10; const l = find(s, 'linghuchong'); if (l) bump(s, l, heroD(s), -15); }, (s) => { s.hs.bixie = -1; }],
  lin3: [(s) => bixie(s, heroD(s)), (s) => { s.hs.bixie = -1; log(s, '袈裟化作灰燼。華山派仍得一步一步練紫霞。'); }],
  song: [(s) => { s.rep = (s.rep || 0) + 1; }, (s) => { s.raidT = 1e9; s.rep = (s.rep || 0) + 3; }, (s) => { s.rep = Math.max(0, (s.rep || 0) - 5); resAdd(s, 'coin', 30); }],
  siguo: [(s) => { s.hs.siguo = true; log(s, '令狐沖背著酒葫蘆上了思過崖。'); }, () => {}],
  feng: [(s) => fengStart(s), (s) => { s.hs.fengTries = 99; }],
  cave: [(s) => { s.hs.cave = true; log(s, '【華山祕洞】開啟：每日可讀壁刻（紫霞四至六層要靠它，觀破值同時增加）'); }, (s) => { s.hs.cave = 'sealed'; }],
  expel: [(s) => expel(s), (s) => { s.hs.lhc = 'kept'; log(s, '岳不群拍拍令狐沖的肩：「華山有你，是華山的福氣。」'); }],
};
export const CARDS = buildCards(TREES.cards.huashan, FX);
function bump(s, a, b, v) { if (!a || !b) return; const k = `${a.id}>${b.id}`; s.aff[k] = Math.max(-100, Math.min(100, (s.aff[k] || 0) + v)); }
export function card(s, id) {
  if (!once(s, id) && id !== 'song') return null; const C = CARDS[id];
  const ch = { id: `hs-${id}-${Math.floor(s.t)}`, hs: id, title: `【${C.title}】`, text: C.text, opts: C.opts.map((o) => o[0]), portrait: P(C.who), at: s.t };
  s.choices ??= []; s.choices.push(ch); log(s, `【抉擇】${C.title}：${C.text}`); if (!s.hero?.askMajor) s.autoAt = s.t; return ch;
}
export function hsAutoPick(s, ch) { if (ch.hs === 'feng') return 0; const v = s.hero?.values || {}; let b = 0, bv = -1e9; CARDS[ch.hs].opts.forEach(([, dv], i) => { const sc = Object.entries(dv).reduce((a, [k, x]) => a + x * (v[k] || 0), 0); if (sc > bv) { bv = sc; b = i; } }); return b; }
export function hsResolve(s, ch, i) {
  const [text, dv, run] = CARDS[ch.hs].opts[i], d = heroD(s); s.choices = s.choices.filter((c) => c !== ch);
  if (d?.values) { for (const [k, x] of Object.entries(dv)) d.values[k] = Math.max(-50, Math.min(50, (d.values[k] || 0) + x));
    const hyp = (d.personality || []).includes('hypocrite') && (dv.xia || 0) < 0; if (hyp || Object.entries(dv).some(([k, x]) => x < 0 && (d.values[k] || 0) >= 20)) addWexin(s, d, `抉擇「${text}」${hyp ? '（人前君子，人後虧心）' : '違背本心'}`); }
  log(s, `決定：${text}`); run(s); return true;
}
// ---- 紫霞神功九層：1–3 閉關、4–6 華山祕洞壁刻、7–9 連續 7 天沒有違心（且定力 ≥4、心情 ≥60） ----
export const zxLayer = (d) => d.zixia || 0;
export function zxGate(s, d) {
  const L = zxLayer(d); if (L >= 9) return '已至第九層';
  if (L >= 3 && L < 6 && s.hs.carv < L - 2) return `要讀華山祕洞壁刻（${s.hs.carv}/${L - 2}）`;
  if (L >= 6) { const clean = (s.t - (d.lastWexinT ?? -1e9)) / DAY; if ((d.ding || 3) < HS.zxDingMin) return '定力不足 4'; if (d.mood < HS.zxMoodMin) return '心情不足 60';
    if (clean < HS.cleanDays) return `需連續 ${HS.cleanDays} 天沒有違心（目前 ${Math.max(0, clean).toFixed(1)} 天）`; }
  return null;
}
export function zxUp(s, d) {
  d.zixia = zxLayer(d) + 1; s.hs.zx = 0; learnArt(d, 'zixia', s.t); d.arts.zixia.xp = Math.min(100, d.zixia * 11 + 1); think(s, d, 'zixiaUp');
  s.fx?.push({ kind: 'zixia', pos: [...(d.pos || [800, 450])], ttl: 2.0 }); log(s, `【紫霞神功 第 ${d.zixia} 層】${d.name}閉關衝關，紫氣自頂門升起${d.zixia >= 5 ? '，劍刃隱隱泛紫' : ''}。`);
  if (d.zixia === 3 && isHero(s, 'yuebuqun')) card(s, 'cave'); if (d.zixia === 7 && isHero(s, 'yuebuqun')) arc(s, 4, '紫霞七層：偽君子能否撐過七天不虧心？');
}
// ---- 辟邪劍譜：捷徑，自宮＋斷情 ----
export function bixie(s, d) {
  s.hs.bixie = 3; s.hs.bixieT = s.t; d.duanqing = s.t; learnArt(d, 'bixie', s.t); d.arts.bixie.xp = TIERS[2][0] + 5; d.arts.bixie.bt1 = true; learnArt(d, 'bixie', s.t);
  for (const k of Object.keys(s.rel || {})) if (k.includes(d.id) && /couple|spouse|lover/.test(JSON.stringify(s.rel[k]))) delete s.rel[k];
  const n = find(s, 'ningzhongze'), y = find(s, 'yuelingshan'); if (n) { bump(s, n, d, -40); n.lockDown = true; } if (y) think(s, y, 'bixieShock');
  for (const o of s.ds) if (o !== d && o.role !== 'laborer') think(s, o, 'bixieShock');
  log(s, `【辟邪劍法】${d.name}閉門七日，再出來時嗓音尖細、出劍快如鬼魅。（斷情：從此不近道侶，寧中則好感只會往下掉）`); arc(s, 3, '辟邪：捷徑到手，人心盡失');
}
// ---- 獨孤九劍 ----
export const duguForms = (d) => (d.dugu || []).length;
export function fengFit(d) { const p = d.personality || [];
  const orthodox = p.includes('rigid') && Object.entries(d.arts || {}).some(([id, r]) => !['dugu'].includes(id) && artTier(d, id) >= 3);
  return { ok: (d.wu ?? 3) >= 4 && (p.includes('free') || p.includes('bold')) && !p.includes('worrier') && !p.includes('rigid'), orthodox }; }
export function fengStudent(s) {
  const lhc = find(s, 'linghuchong'); if (lhc && !lhc.away && !fengFit(lhc).orthodox) return lhc;
  return s.ds.filter((d) => d.role !== 'laborer' && !d.away && !fengFit(d).orthodox).sort((a, b) => (fengFit(b).ok - fengFit(a).ok) || (b.wu ?? 3) - (a.wu ?? 3))[0] || null;
}
function fengStart(s) { const st = fengStudent(s); s.hs.feng = { night: 0, student: st?.id || null, lastDay: s.day }; log(s, `風清揚：「我只教三晚，第四晚跟你過招。」${st ? `（傳人：${st.name}）` : ''}`); arc(s, 2, '思過崖遇風清揚'); }
function fengStep(s, H) {
  const F = s.hs.feng; if (!F || s.day === F.lastDay) return; F.lastDay = s.day; const st = s.ds.find((d) => d.id === F.student) || fengStudent(s); if (!st) return; F.student = st.id;
  if (st.away) return; F.night++;
  if (F.night <= HS.fengNights) { log(s, `【思過崖・第 ${F.night} 晚】風清揚指點${st.name}：「活學活使，無招勝有招。」`); return; }
  const fit = fengFit(st), p = fit.orthodox ? 0 : fit.ok ? 1 : HS.softP, r = (H?.rand ? H.rand(s) : Math.random());
  if (r < p) { learnDugu(s, st, 'dg0'); for (const f of DUGU) if (formReady(s, st, f)) learnDugu(s, st, f.id); s.hs.feng = null; s.hs.fengLeft = true;
    log(s, `【獨孤九劍】第四晚對練，${st.name}劍隨意走，風清揚點頭：「總訣你懂了。」說罷飄然入崖，不知所蹤。`); arc(s, 3, '總訣式'); return; }
  s.hs.fengTries++; F.night = 0; log(s, `風清揚搖頭：「${fit.orthodox ? '你的劍已經被規矩捆死了' : '心裡掛的事太多'}。」${fit.orthodox ? '（拘謹＋正統劍法圓滿：互斥）' : `（性格不合，只有 ${Math.round(HS.softP * 100)}% 機會）`}`);
  if (s.hs.fengTries >= 3) { s.hs.feng = null; s.hs.fengLeft = true; log(s, '風清揚嘆了口氣，從此思過崖再無人影。'); }
}
export function formReady(s, d, f) { if (f.id === 'dg0') return true; if (!(d.dugu || []).includes('dg0')) return false;
  const ins = Math.max(0, ...f.foes.map((k) => s.codex?.[k]?.insight || 0)); if (ins < f.need) return false;
  return !f.inner || Object.keys(d.arts || {}).some((id) => artTier(d, id) >= 4) || zxLayer(d) >= 9; }
export function learnDugu(s, d, id) {
  d.dugu ??= []; if (d.dugu.includes(id)) return false; d.dugu.push(id); learnArt(d, 'dugu', s.t); d.arts.dugu.xp = Math.min(100, d.dugu.length * 11 + 1); if (!d.moves.includes(id)) d.moves.push(id);
  const f = DUGU.find((x) => x.id === id); if (id === 'dg0') think(s, d, 'duguGot'); log(s, `【獨孤九劍・${f.name}】${d.name}${id === 'dg0' ? '悟通總訣' : `見識過${f.foes.map((k) => k).length ? '對應的敵人' : ''}，悟出${f.name}`}（${d.dugu.length}/9）`);
  s.fx?.push({ kind: 'dugu', pos: [...(d.pos || [800, 450])], ttl: 1.6 });
  if (d.dugu.length >= 3) arc(s, 4, '九劍湊齊三式'); return true;
}
// ---- 逐出令狐沖 ----
function expel(s) { const l = find(s, 'linghuchong'); s.hs.lhc = 'expelled'; if (!l) return; removeActor(s, l, '', { quiet: true }); s.xia && (s.xia.left.linghuchong = true);
  log(s, `【逐出師門】${l.name}跪著磕了三個頭，背起酒葫蘆下山。江湖從此多了個浪子。`); arc(s, 5, '令狐沖去留：逐出'); }
// ---- 主線（岳不群 5 步、令狐沖 5 步） ----
export const ARC_YUE = TREES.arcs.yuebuqun;
export const ARC_LHC = TREES.arcs.linghuchong;
function arc(s, n, text) { const H = s.hero; if (!H || H.kind !== 'template' || !['yuebuqun', 'linghuchong'].includes(H.id)) return; if ((H.arcStep || 0) >= n) return; H.arcStep = n; s.rep = (s.rep || 0) + 2; log(s, `【主線 ${n}/5】${text}`); }
// ---- 每 tick ----
export function hsStep(s, dt, H) {
  s.hs ??= hsInit(); const X = s.hs, d = heroD(s), yue = isHero(s, 'yuebuqun'), lhcH = isHero(s, 'linghuchong');
  // 開局：岳不群帶紫霞第一層
  if (yue && d && !d.zixia) { d.zixia = 1; learnArt(d, 'zixia', s.t); d.arts.zixia.xp = 12; }
  // 紫霞衝關：打坐／練功累積
  for (const p of s.ds) if (p.zixia && !p.away && ['meditate', 'train'].includes(p.task?.act)) { X.zx += dt; if (X.zx >= HS.zxNeed * zxLayer(p) && !zxGate(s, p)) zxUp(s, p); }
  for (const p of s.ds) if (p.arts?.zixia) p.arts.zixia.xp = Math.min(100, zxLayer(p) * 11 + 1);
  // 壁刻：每天讀一次
  if (X.cave === true && X.carv < 3 && s.day !== X.lastCarvDay && d && !d.away) { X.lastCarvDay = s.day; X.carv += HS.carvPer; for (const k of ['hermit', 'swordtomb', 'bandit', 'chief']) { s.codex[k] ??= { seen: 0, kills: 0, fled: 0, insight: 0 }; s.codex[k].insight += HS.carvInsight; } log(s, `讀華山祕洞壁刻（${X.carv}）：五嶽劍法與破法一一印在心裡。`); }
  // 力量倍率（紫霞每層 +3%，辟邪隨斷情天數上升）
  for (const p of s.ds) { let m = 1 + HS.zxPow * zxLayer(p); if (p.duanqing != null) m *= 1 + Math.min(HS.bixieCap, (s.t - p.duanqing) / DAY * HS.bixieDayPow); p.powMul = m; if (p.lockDown) { const n = find(s, 'ningzhongze'); if (n) bump(s, n, p, -0.002); } }
  // 九劍：每天檢查一次，見過的敵人夠多就悟出新式
  if (s.day !== X.duguDay) { X.duguDay = s.day; for (const p of s.ds) if (p.dugu?.length) for (const f of DUGU) if (!p.dugu.includes(f.id) && formReady(s, p, f)) learnDugu(s, p, f.id); }
  fengStep(s, H);
  if (s.choices?.some((c) => c.hs)) return; // 一次一張
  if (yue) {
    const H0 = s.hero; if (H0.flags?.lin && !find(s, 'linpingzhi') && !X.cards.linJoin) { X.cards.linJoin = true; const l = mkComp('linpingzhi', s.ds.length); Object.assign(l, { companion: false, reason: '投靠', xia: 'linpingzhi' }); s.ds.push(l); for (const o of s.ds) if (o !== l) initPair(s, l, o, 10); log(s, '林平之磕頭拜師，成了華山弟子。'); X.bixie = 1; X.linT = s.t; }
    if (X.bixie === 1 && s.t - X.linT >= DAY && card(s, 'lin2')) return;
    if (X.bixie === 2 && card(s, 'lin3')) { arc(s, 2, '暗查劍譜'); return; }
    if (s.day >= 3 && s.day - X.songLast >= HS.songEvery) { X.songLast = s.day; X.songN++; card(s, 'song'); return; }
    const lhc = find(s, 'linghuchong');
    if (lhc && s.day >= 4 && !X.cards.siguo) { card(s, 'siguo'); return; }
    if (lhc && X.lhc === 'stay' && d && ((lhc.dugu?.length || 0) >= 1 || (lhc.skills.palm > d.skills.palm + 10))) { if (!X.jealous) { X.jealous = true; think(s, d, 'jealous'); log(s, `${d.name}看著${lhc.name}練劍，臉上笑著，心裡發酸。（嫉）`); } card(s, 'expel'); return; }
  }
  // 風清揚：令狐沖上了思過崖（岳不群罰）、令狐沖主角選了「進洞」、或令狐沖以名俠身分入門一天後
  const lhc = find(s, 'linghuchong');
  if (!X.feng && !X.fengLeft && X.fengTries < 3 && !X.cards.feng && lhc && (X.siguo || (lhcH && s.hero.flags?.feng) || (lhc.xia && s.t - (s.xia?.joinT?.linghuchong ?? s.t) >= DAY))) { card(s, 'feng'); return; }
  if (lhcH && d && duguForms(d) >= 3 && !X.cards.free) { X.cards.free = true; arc(s, 5, '自立門戶：被逐出華山的浪子，在破道館掛起自己的匾'); }
}
