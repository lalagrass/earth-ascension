// loop7 M7 領悟（天下霸圖味）：自練有機會自悟下一門功夫；切磋時觀摩對手會的功夫、跨門派也能偷師。
// 只在 s.wu7 開啟時生效（golden 不變）。不用亂數，悟性決定速度。
import { ARTS } from './data.mjs';
import { artById, reqMissing, learnArt, artTier, chooseVariant } from './arts.mjs';
import { VARIANTS } from './data.mjs';
export const COMP = {
  gain: { train: 4, meditate: 6, spar: 3 }, // 每完成一次活動的領悟值
  watch: 10,                                   // 切磋時觀摩對手一門功夫
  wuMul: [0, 0.4, 0.7, 1, 1.4, 1.8],          // 悟性 1–5
  need: (a) => 60 + 40 * (a.grade || 0),      // 門檻：品階越高越難悟
  vneed: 80,                                  // loop16 變式領悟門檻（大成後、未選變式的功夫）
};
const wm = (d) => COMP.wuMul[Math.max(1, Math.min(5, d.wu ?? d.root ?? 3))];
const open = (d, a) => a && !a.secret && !d.arts?.[a.id] && !reqMissing(d, a).length;
export function compProgress(d) { return Object.entries(d.comp || {}).map(([id, v]) => ({ id, name: artById(id)?.name, v, need: COMP.need(artById(id)) })); }
function add(s, d, id, amt, how, think, log) {
  const a = artById(id); if (!open(d, a)) return null;
  (d.comp ??= {}); d.comp[id] = (d.comp[id] || 0) + amt * wm(d);
  if (d.comp[id] < COMP.need(a)) return null;
  delete d.comp[id]; learnArt(d, id, s.t); (s.compN ??= { self: 0, watch: 0 })[how === 'watch' ? 'watch' : 'self']++; think(s, d, 'epiphany', `（${a.name}）`);
  log(s, how === 'watch' ? `${d.name}看多了別人使「${a.name}」，竟自己悟了出來！` : `${d.name}苦練之間豁然開朗，自悟「${a.name}」！`);
  return a;
}
// 自悟目標：等師父教的那門優先；否則本門派可學的下一門，再不然任一門可學的
export function selfTarget(d) { if (d.pendingArt) return d.pendingArt; const c = ARTS.filter((a) => open(d, a)); return (c.find((a) => a.school === d.style) || c[0])?.id || null; }
// 活動完成時呼叫
export function comprehend(s, d, act, partner, think, log) {
  if (!s.wu7 || !COMP.gain[act]) return null;
  const tgt = selfTarget(d); let got = tgt ? add(s, d, tgt, COMP.gain[act], 'self', think, log) : null;
  if (act === 'spar' && partner) { const seen = ARTS.find((a) => partner.arts?.[a.id] && open(d, a)); if (seen) got = add(s, d, seen.id, COMP.watch, 'watch', think, log) || got; }
  return got;
}

// loop16 變式領悟：大成（tier≥2）且玩家尚未選變式的功夫，練著練著自己悟出變式；切磋時對手已有變式則觀摩學他那路。
// 不覆蓋玩家選擇；無亂數：自悟走「根骨≥悟性→剛（gang）否則→靈（ling）」。
const vOpen = (d, id) => d.arts?.[id] && !d.arts[id].variant && artTier(d, id) >= 2;
export const vLean = (d) => ((d.root ?? 3) >= (d.wu ?? 3) ? 'gang' : 'ling');
function vAdd(s, d, id, v, amt, how, think, log) {
  const r = d.arts[id]; (r.vc ??= {}); r.vc[v] = (r.vc[v] || 0) + amt * wm(d); if (r.vc[v] < COMP.vneed) return null;
  delete r.vc; if (!chooseVariant(d, id, v, s.t)) return null; const a = artById(id), vn = VARIANTS[a.school].find((x) => x.id === v).name;
  (s.compN ??= { self: 0, watch: 0 }); s.compN.variant = (s.compN.variant || 0) + 1; if (how === 'watch') s.compN.vwatch = (s.compN.vwatch || 0) + 1;
  think(s, d, 'epiphany', `（${a.name}・${vn}）`); log(s, how === 'watch' ? `${d.name}看${'對手'}使「${a.name}」的${vn}路數，心有所得，也練成了這一路！` : `${d.name}把「${a.name}」練到極熟，自己悟出了${vn}的變化！`);
  return { id, v };
}
export function comprehendVariant(s, d, act, partner, think, log) {
  if (!s.wu7 || !COMP.gain[act]) return null; let got = null;
  if (act === 'spar' && partner) { const id = Object.keys(d.arts || {}).find((k) => vOpen(d, k) && partner.arts?.[k]?.variant && !(partner.arts[k].until > s.t)); if (id) got = vAdd(s, d, id, partner.arts[id].variant, COMP.watch, 'watch', think, log); }
  if (!got) { const id = Object.keys(d.arts || {}).filter((k) => vOpen(d, k)).sort((a, b) => d.arts[b].xp - d.arts[a].xp)[0]; if (id) got = vAdd(s, d, id, vLean(d), COMP.gain[act], 'self', think, log); }
  return got;
}
