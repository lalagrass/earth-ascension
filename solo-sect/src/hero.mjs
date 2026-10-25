// v0.96 主角：建立、價值觀 autopilot、違心、同門、專屬主線第一步
import { STATS, STAT_BUDGET, VALUES, ACT_TAGS, VALUE_K, WEXIN, Q9, HEROES, COMPANIONS, CUSTOM_COMPANIONS, ARCS } from './hero-data.mjs';
import { NODES, MOOD, CHORE_ACTS, DAY, AWAKEN } from './data.mjs';
import { seedArts, learnArt } from './arts.mjs';
import { log } from './util.mjs';
export const heroById = (id) => HEROES.find((h) => h.id === id);
export const VALUE_NAMES = Object.fromEntries(VALUES);
export const STAT_NAMES = Object.fromEntries(STATS);
// 自創：六項 1–5，總和 = 12（悟性 1 時 13，退一點＝笨功夫）
export const budgetOf = (st) => STAT_BUDGET + (st.wu === 1 ? 1 : 0);
export const spent = (st) => STATS.reduce((a, [k]) => a + (st[k] || 0), 0);
export function validStats(st) { return STATS.every(([k]) => st[k] >= 1 && st[k] <= 5) && spent(st) === budgetOf(st); }
export function defaultStats() { return { wu: 2, gen: 2, li: 2, shen: 2, ding: 2, fu: 2 }; }
export function companionsFor(heroId) { return heroId ? heroById(heroId).companions : CUSTOM_COMPANIONS; }
// 九問 → 價值觀（主／副）＋兩個明面特質＋一個暗特質
export function readHeart(answers) {
  const v = Object.fromEntries(VALUES.map(([k]) => [k, 0])), votes = {};
  Q9.forEach((q, i) => { const a = q.a[answers?.[i] ?? 0] || q.a[0]; for (const [k, x] of Object.entries(a[1])) v[k] += x * 8; votes[a[2]] = (votes[a[2]] || 0) + 1 + (9 - i) * 0.01; });
  for (const k in v) v[k] = Math.max(-50, Math.min(50, v[k]));
  const order = Object.entries(v).sort((a, b) => b[1] - a[1]), tr = Object.entries(votes).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  return { values: v, main: order[0][0], sub: order[1][0], visible: tr.slice(0, 2), hidden: tr[2] || null };
}
export function mainSub(values) { const o = Object.entries(values).sort((a, b) => b[1] - a[1]); return [o[0][0], o[1][0]]; }
// 價值 × 行動標籤 → 天賦組的一項（只有主角有 values）
export function valueMul(d, act) { if (!d.values) return 1; const t = ACT_TAGS[act]; if (!t) return 1; return 1 + t.reduce((a, k) => a + (d.values[k] || 0), 0) * VALUE_K; }
export const valueOfAct = (d, act) => (ACT_TAGS[act] || []).reduce((a, k) => a + (d.values?.[k] || 0), 0);
export function addWexin(s, d, why) {
  if (!d.values) return false; d.lastWexinT = s.t; d.wexin = Math.min(WEXIN.max, (d.wexin || 0) + 1);
  log(s, `${d.name}心中違心（${why}）：違心 ${d.wexin}/${WEXIN.max}`); return true;
}
export function easeWexin(s, d) { if (d.wexin > 0) { d.wexin--; log(s, `${d.name}閉關靜坐，心中稍安（違心 ${d.wexin}/${WEXIN.max}）`); } }
export const wexinMood = (d) => (d.wexin ? WEXIN.mood * d.wexin * (d.classic ? WEXIN.classicMul : 1) * (1 - 0.08 * ((d.ding || 3) - 3)) : 0);
// 指派的工作與價值觀強烈牴觸時累積違心
export function onAssign(s, d, act, byPlayer) { if (!d.values || !byPlayer) return; if (valueOfAct(d, act) <= WEXIN.at) addWexin(s, d, `被派去${act}`); }

export function mkComp(id, i) {
  const c = COMPANIONS[id], [x, y] = NODES.court;
  return seedArts({ id, name: c.name, root: c.root, wu: c.wu, rootKnown: true, style: c.style, personality: [...c.personality], known: c.personality.slice(0, 2), together: 0, mood: MOOD.base, thoughts: [], why: [], adult: true, sprite: c.sprite, traits: {},
    skills: { ...c.skills }, moves: ['fist'], pendingMove: null, needs: { energy: 80, hunger: 60, social: 50, fun: 60 }, hp: 100, at: 'court', pos: [x + 32, y + 8], path: [],
    role: 'inner', duties: [...CHORE_ACTS], prio: 'normal', chore: 0, choreDebt: 0, contrib: 0, task: null, order: null, reason: '開局同門', carry: null, cool: 0, walked: 0, face: 1, anim: null,
    best: 0, insight: {}, away: false, companion: true, portrait: `assets/portraits/${id}.png` });
}
// spec: { kind:'template', id, companion } | { kind:'custom', name, stats, answers, companion }
export function applyHero(s, spec, initPair) {
  const d = s.ds.find((x) => x.id === 'hero'); if (!d || !spec) return s;
  let H;
  if (spec.kind === 'template') {
    const T = heroById(spec.id); if (!T) throw new Error('未知模板 ' + spec.id);
    H = { kind: 'template', id: T.id, name: T.name, stats: { ...T.stats }, values: { ...T.values }, personality: [...T.personality], hidden: null, lore: T.lore, sealed: !!T.sealed, arc: T.arc };
    d.classic = true; d.portrait = `assets/portraits/${T.id}.png`; d.style = T.style;
    if (T.coinMul) s.res.coin *= T.coinMul;
  } else {
    const st = spec.stats || defaultStats(); if (!validStats(st)) throw new Error('點數不合法');
    const r = readHeart(spec.answers || []); const pers = [...r.visible]; if (st.wu === 1 && !pers.includes('honest')) pers.unshift('honest');
    H = { kind: 'custom', id: 'custom', name: spec.name || '主角', stats: { ...st }, values: r.values, personality: pers.slice(0, 2).concat(r.hidden && !pers.includes(r.hidden) ? [r.hidden] : []), hidden: r.hidden, lore: [], arc: null };
  }
  const st = H.stats; [H.main, H.sub] = mainSub(H.values);
  Object.assign(d, { name: H.name, wu: st.wu, root: H.sealed ? 1 : st.gen, ding: st.ding, values: H.values, wexin: 0, personality: H.personality, known: H.personality.slice(0, 2), traits: H.personality.includes('diligent') ? { diligent: 1.2 } : {} });
  d.skills.strength = 4 + st.li * 3; d.skills.agility = 4 + st.shen * 3; seedArts(d);
  // 同門
  const cands = companionsFor(H.kind === 'template' ? H.id : null), cid = cands.includes(spec.companion) ? spec.companion : cands[0];
  const c = mkComp(cid, s.ds.length); s.ds.push(c); for (const o of s.ds) if (o !== c) initPair(s, c, o, o === d ? 30 : 10);
  s.hero = { ...H, companion: cid, fu: st.fu, askMajor: spec.askMajor ?? true, arcStep: 0 };
  s.encExclude = [H.id, cid].filter((x) => x && x !== 'custom'); s.choices = [];
  log(s, `${H.name}帶著${c.name}來到破道館。${H.kind === 'template' ? heroById(H.id).tag : `志在${VALUE_NAMES[H.main]}、${VALUE_NAMES[H.sub]}`}`);
  return s;
}
// 名俠池：所有模板＋同門候選，扣掉已在門中者
export function encounterPool(s) { const ex = new Set(s.encExclude || []); return [...HEROES.map((h) => h.id), ...Object.keys(COMPANIONS)].filter((id, i, a) => a.indexOf(id) === i && !ex.has(id)); }
// 同門默契：郭靖＋黃蓉 練功最多 +25%（隨好感線性），其他組合 +10%
import { xiaResolve, pairBest } from './wuxia.mjs';
import { hsResolve, hsAutoPick } from './huashan.mjs';
import { jhResolve, jhAutoPick } from './jianghu.mjs';
export function pairBonus(s, d, aff) {
  if (!s.hero) return 0; return pairBest(s, d, aff, (a, b) => { const c = s.hero.companion; return (a.id === 'hero' && b.id === c) || (b.id === 'hero' && a.id === c) ? COMPANIONS[c]?.pair?.[s.hero.id] ?? 0.1 : 0; });
}
export function pairBonusOld(s, d, aff) {
  if (!s.hero) return 0; const h = s.ds.find((x) => x.id === 'hero'), c = s.ds.find((x) => x.id === s.hero.companion);
  if (!h || !c || h.away !== c.away || (d !== h && d !== c)) return 0;
  const cap = COMPANIONS[c.id]?.pair?.[s.hero.id] ?? 0.1; return cap * Math.min(1, Math.max(0, aff(s, h, c)) / 60);
}
// 專屬主線第一步：到日子就出抉擇卡；askMajor → 等玩家；否則依價值觀自動選
export function heroStep(s) {
  const H = s.hero; if (!H || !H.arc || H.arcStep > 0) return; const A = ARCS[H.arc];
  if (s.day < A.day || s.choices.some((c) => c.arc === H.arc)) return;
  const ch = { id: `${H.arc}-1`, arc: H.arc, title: A.title, text: A.text, opts: A.opts.map(([t]) => t), at: s.t };
  if (H.personality.includes('indecisive')) ch.delay = DAY * 0.5; // 優柔：自動決定要多拖半天
  s.choices.push(ch); log(s, `【抉擇】${A.title}：${A.text}`); H.arcStep = 0.5;
  if (!H.askMajor) s.autoAt = s.t + (ch.delay || 0);
}
export function autoPick(s, ch) { if (ch.xia) return 0; if (ch.jh) return jhAutoPick(s, ch); if (ch.hs) return hsAutoPick(s, ch); const A = ARCS[ch.arc], v = s.hero.values; let best = 0, bv = -1e9; A.opts.forEach(([, dv], i) => { const sc = Object.entries(dv).reduce((a, [k, x]) => a + x * (v[k] || 0), 0); if (sc > bv) { bv = sc; best = i; } }); return best; }
export function resolveChoice(s, id, i) {
  const ch = s.choices.find((c) => c.id === id); if (!ch) return false; if (ch.xia) return xiaResolve(s, ch, i); if (ch.jh) return jhResolve(s, ch, i); if (ch.hs) return hsResolve(s, ch, i); const A = ARCS[ch.arc], [text, dv, flag] = A.opts[i], d = s.ds.find((x) => x.id === 'hero');
  for (const [k, x] of Object.entries(dv)) d.values[k] = Math.max(-50, Math.min(50, (d.values[k] || 0) + x));
  [s.hero.main, s.hero.sub] = mainSub(d.values); s.hero.values = d.values;
  const [mk] = mainSub(d.values); if ((dv[mk] || 0) < 0 || Object.entries(dv).some(([k, x]) => x < 0 && (d.values[k] || 0) >= 20)) addWexin(s, d, `抉擇「${text}」違背本心`);
  s.choices = s.choices.filter((c) => c !== ch); s.hero.arcStep = 1; s.hero.flags = { ...(s.hero.flags || {}), ...(flag ? { [flag]: true } : {}) };
  if (flag) s.rep = (s.rep || 0) + 2;
  log(s, `${d.name}決定：${text}。${flag ? '（主線推進，下一步待續）' : '（主線暫緩）'}`); return true;
}
export function heroAuto(s) { if (!s.hero || s.hero.askMajor || s.autoAt == null || s.t < s.autoAt) return; for (const ch of [...s.choices]) resolveChoice(s, ch.id, autoPick(s, ch)); s.autoAt = null; }

// ---- v0.97 模板特色 ----
// 阿星覺醒：巡山瀕死或重傷時，封印的根骨解開（屬性共 +8）並起手如來神掌
export function awaken(s, d) {
  const H = s.hero; if (!H || d.id !== 'hero' || !H.sealed || H.awakened) return false;
  H.sealed = false; H.awakened = true; d.awakened = true; const st = H.stats; st.gen = AWAKEN.gen; st.li += AWAKEN.li; st.ding += AWAKEN.ding; st.shen += AWAKEN.shen;
  d.root = st.gen; d.ding = st.ding; d.skills.strength += AWAKEN.li * 3; d.skills.agility += AWAKEN.shen * 3; learnArt(d, 'rulai', s.t); d.hp = Math.max(d.hp, 60);
  log(s, `${d.name}瀕死之際，任督二脈豁然貫通！封印的根骨解開（屬性 +8），如來神掌起手式自然使出。`); return true;
}
// 黃蓉：精打細算（每日香火錢 +2）、她下廚多煮 1 份
export const econCoin = (s) => (s.hero && s.ds.some((d) => d.id === 'huangrong' && !d.away) ? 2 : 0);
export const cookBonus = (d) => (d.id === 'huangrong' ? 1 : 0);
