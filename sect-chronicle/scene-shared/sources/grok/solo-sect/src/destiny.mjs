// v2.0 A8 宿命樹檢核器：各角色主線步驟、抉擇卡文字、主線觸發條件皆在 destiny-trees.json；
// 引擎只負責（1）把卡資料與效果函式組成 CARDS（2）依序評估宣告式檢核。純重構：檢核順序、條件、亂數呼叫與原本 if 鏈完全一致。
import TREES from './destiny-trees.json' with { type: 'json' };
export { TREES };
export const buildCards = (data, fx) => Object.fromEntries(Object.entries(data).map(([id, c]) => {
  const f = fx[id]; if (!f || f.length !== c.opts.length) throw new Error(`destiny: card ${id} 效果數與選項數不符`);
  return [id, { ...c, opts: c.opts.map((o, i) => ('values' in o ? [o.label, o.values, f[i]] : [o.label, f[i]])) }];
}));
// 檢核欄位：arc [lo,hi) 主線步數區間；day 最低日；art [武學, 最低階]；unless s.jh 旗標須為假；flag s.hero 旗標須為真；
// card 觸發卡（force 強制）；then 成功後推進的主線步 [[n,文字]]。回傳 true＝本 tick 已處理（呼叫端 return）。
export function destinyStep(s, id, ctx) {
  const list = TREES.checks[id]; if (!list) return false; const n = s.hero?.arcStep || 0;
  for (const c of list) {
    if (n < c.arc[0] || n >= c.arc[1]) continue;
    if (c.flag && !s.hero[c.flag]) continue;
    if (c.art && ctx.artTier(ctx.d0, c.art[0]) < c.art[1]) continue;
    if (c.day != null && s.day < c.day) continue;
    if (c.unless && s.jh[c.unless]) continue;
    if (c.card) { if (!ctx.card(s, c.card, c.force)) continue; for (const [k, t] of c.then || []) ctx.arc(s, id, k, t); return true; }
    for (const [k, t] of c.then || []) ctx.arc(s, id, k, t); return false;
  }
  return false;
}
