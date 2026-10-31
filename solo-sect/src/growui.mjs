/* loop81 成長分層介面（純顯示，不寫世界狀態）：A 人物實力圖、B 門類造詣、C 個別武學。
   能力圖：固定 5 軸、固定順序、固定顯示基準（不是能力上限，也不按角色或全派最大值縮放）；不算面積。 */
import { NG, qiMax, qiOf, INNER } from './neigong.mjs';
import { profOf, profMul, profLabel, nextLvXp, PROF } from './prof.mjs';
import { ARTS, TIERS, ART_GAIN, ROOT, JH, BREAK } from './data.mjs';
import { effectTier, effectMul, artTier, stuckAt, gated, curCap, focusOf, reqMissing, fits, rustOf } from './arts.mjs';
import { CATS, CAT_ORDER, ART_CAT, mastery, levelOf, accelOf, GROW } from './growth.mjs';
export const AXES = [
  { k: 'palm', name: '掌', lo: 0, hi: 100, get: (d) => d.skills.palm, note: '掌系招式傷害、出手距離（劍招也用）' },
  { k: 'leg', name: '腿', lo: 0, hi: 100, get: (d) => d.skills.leg, note: '腿系招式傷害、出手距離' },
  { k: 'strength', name: '力氣', lo: 0, hi: 100, get: (d) => d.skills.strength, note: '守山、試煉' },
  { k: 'agility', name: '腳力', lo: 0, hi: 100, get: (d) => d.skills.agility, note: '移動速度 ×(1+值/100)' },
  { k: 'rest', name: '調息', lo: 1, hi: 1.5, get: (d, now) => (1 + ART_GAIN.restPerTier * Math.max(0, effectTier(d, 'rest') + 1)) * effectMul(d, 'rest', now), note: '常態睡眠恢復倍率（吐納）', fmt: (v) => `×${v.toFixed(2)}` },
];
/* loop106 開啟內功時才加第 6 軸「內力」（上限；基準固定＝基礎～吐納化境），關閉時維持五軸 */
export const QI_AXIS = { k: 'qi', name: '內力', lo: NG.base, hi: NG.base + NG.perTier * TIERS.length, get: (d) => qiMax(d), note: '內力上限（已學內功的階）', fmt: (v) => v.toFixed(0) };
export const axesOf = (d) => (d?.ng ? [...AXES, QI_AXIS] : AXES);
export const axisVals = (d, now = 0) => axesOf(d).map((x) => x.get(d, now));
const fmtV = (x, v) => (x.fmt ? x.fmt(v) : v.toFixed(1));
/* 圖：r＝(v−lo)/(hi−lo)，超出畫在邊上並標「超出顯示範圍」 */
export function polySvg(d, now = 0, cls = '') {
  const AXES = axesOf(d), C = 90, R = 62, n = AXES.length, ang = (i) => -Math.PI / 2 + (2 * Math.PI * i) / n, P = (i, f) => [C + R * f * Math.cos(ang(i)), C + R * f * Math.sin(ang(i))];
  const vals = axisVals(d, now), fr = vals.map((v, i) => Math.max(0, Math.min(1, (v - AXES[i].lo) / (AXES[i].hi - AXES[i].lo))));
  const grid = [0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${AXES.map((_, i) => P(i, f).join(',')).join(' ')}" fill="none" stroke="#ccc" stroke-width="${f === 1 ? 1.2 : 0.6}"/>`).join('');
  const spokes = AXES.map((_, i) => `<line x1="${C}" y1="${C}" x2="${P(i, 1)[0]}" y2="${P(i, 1)[1]}" stroke="#ddd"/>`).join('');
  const labels = AXES.map((x, i) => { const [lx, ly] = P(i, 1.28), over = vals[i] > x.hi; return `<text x="${lx}" y="${ly}" font-size="10" text-anchor="middle" dominant-baseline="middle"${over ? ' fill="#b0482e"' : ''}>${x.name} ${fmtV(x, vals[i])}${over ? '▲' : ''}</text>`; }).join('');
  return `<svg class="poly ${cls}" viewBox="-34 0 248 180" style="width:100%;max-width:248px;height:auto" role="img" aria-label="人物實力：${AXES.map((x, i) => `${x.name}${fmtV(x, vals[i])}`).join('、')}">${grid}${spokes}<polygon class="poly-shape" points="${fr.map((f, i) => P(i, f).join(',')).join(' ')}" fill="#7a9a5a" fill-opacity="0.18" stroke="#5a7a3a" stroke-width="1.6"/>${labels}</svg>`;
}
/* 合併成長提示：UI 記憶（不存檔）。換日時比較前一日起點，只有真的成長才回傳 anim＝true 與提示字串 */
export function dailyGrowth(memo, d, day, now = 0) {
  const AXES = axesOf(d), v = axisVals(d, now), m = (memo[d.id] ??= { day, start: v, msg: '', anim: false });
  if (m.day !== day) { const up = AXES.map((x, i) => [x, v[i] - m.start[i]]).filter(([x, dv]) => dv >= (x.fmt ? 0.005 : 0.05));
    m.msg = up.length ? `第 ${m.day} 日成長：${up.map(([x, dv]) => `${x.name} +${x.fmt ? dv.toFixed(2) : dv.toFixed(1)}`).join('、')}` : ''; m.animUntil = up.length ? now + 3 : -1; m.day = day; m.start = v; }
  m.anim = now < (m.animUntil ?? -1); /* 只在換日後短暫播放一次；重繪不重播 */
  return m;
}
const bar = (v, max, col) => `<span class="gbar"><span style="width:${Math.max(0, Math.min(100, (100 * v) / max))}%;background:${col}"></span></span>`;
export function powerHtml(d, memo, day, now = 0) {
  const AXES = axesOf(d), m = dailyGrowth(memo, d, day, now), over = AXES.filter((x) => x.get(d, now) > x.hi);
  const temp = [d.powMul && d.powMul !== 1 ? `兵器 ×${d.powMul.toFixed(2)}` : '', d.jhMul && d.jhMul !== 1 ? `江湖 ×${d.jhMul.toFixed(2)}` : '', d.early ? `初學加成 ×${d.early.mul}` : ''].filter(Boolean);
  return `<div class="grow-power"><b>人物實力</b>（常態能力；顯示基準固定，非能力上限）${polySvg(d, now, m.anim ? 'poly-grow' : '')}`
    + `<div class="k">${AXES.map((x) => `${x.name} ${fmtV(x, x.get(d, now))}（基準 ${x.fmt ? x.fmt(x.lo) + '–' + x.fmt(x.hi) : x.lo + '–' + x.hi}；${x.note}）`).join('<br>')}</div>`
    + (over.length ? `<div class="k warn">超出顯示範圍：${over.map((x) => x.name).join('、')}（數字照實，圖上畫在外框）</div>` : '')
    + (m.msg ? `<div class="k grow-msg">${m.msg}</div>` : '')
    + `<div class="k">狀態：生命 ${d.hp | 0}/100 ${bar(d.hp, 100, '#c55')}　精力 ${d.needs.energy | 0} ${bar(d.needs.energy, 100, '#d9a441')}　${d.ng ? `內力 ${qiOf(d) | 0}/${qiMax(d)} ${bar(qiOf(d), qiMax(d), '#5a7ab0')}` : '內力：本版沒有內力系統'}</div>`
    + `<div class="k">資質：根骨 ${d.rootKnown ? `${d.root}（${ROOT.names[d.root]}）` : '未明'}・悟性 ${d.rootKnown ? d.wu ?? d.root : '未明'}${temp.length ? `｜臨時／裝備：${temp.join('、')}（不算進圖）` : ''}</div></div>`;
}
export function catHtml(d) {
  const rows = CAT_ORDER.filter((c) => CATS[c].sup !== 'none').map((c) => { const v = mastery(d, c), src = Object.entries(d.arts || {}).filter(([id, r]) => ART_CAT[id]?.[c] && r.gm).map(([id, r]) => { const a = ARTS.find((x) => x.id === id); return `${a.name} ${Math.min(r.gm.e, GROW.cap[a.grade]).toFixed(1)}/${GROW.cap[a.grade]}${r.gm.init ? '（含開局折算）' : ''}`; });
    return `<div class="k" data-cat="${c}">${CATS[c].name} <b>${v.toFixed(1)}</b>・${levelOf(v)}${CATS[c].sup === 'part' ? '（只累積與顯示，加速未驗證）' : ''}${bar(v, 100, '#6a8ac7')}${src.length ? `<span class="k">來源：${src.join('、')}</span>` : ''}</div>`; });
  return `<div class="grow-cat"><b>門類造詣</b>（0–100；同類入門武學修練加速用，不加傷害）${rows.join('')}<div class="k">尚未支援：${CAT_ORDER.filter((c) => CATS[c].sup === 'none').map((c) => CATS[c].name).join('、')}</div></div>`;
}
/* 個別武學狀態：正在累積／達到瓶頸／冷卻中／缺前置／尚未支援／劇情修煉／已練滿 */
export function artStatus(d, a, now = 0) {
  const r = d.arts?.[a.id];
  if (!r) { const miss = reqMissing(d, a); return miss.length ? { st: 'req', text: `缺前置：${miss.join('、')}` } : { st: 'open', text: fits(d, a) ? '條件已足，等師父傳授' : '非本門路數' }; }
  if (a.layered) return { st: 'story', text: `第 ${d.zixia || 0} 層（華山劇情逐層修煉）` };
  if (a.forms) return { st: 'story', text: `已悟 ${(d.dugu || []).length} 式（對敵觀破後悟式）` };
  if (r.guizhen) return { st: 'acc', text: `返璞歸真 ★${r.stars || 0}（${(r.sxp || 0).toFixed(1)}）` };
  if ((r.btCd || 0) > now) return { st: 'cd', text: `冷卻中：衝關失敗，約 ${Math.ceil(((r.btCd - now) / 600) * 12)} 時辰後再試` };
  { const k = stuckAt(d, a, now); if (k === 3) return { st: 'stuck', text: '已練滿：可打坐悟返璞歸真' }; if (k) return { st: 'stuck', text: '已達瓶頸：需打坐突破' }; }
  if (gated(d, a) && r.xp >= curCap(d, a) - 1e-6) return { st: 'cap', text: `悟性不足（需 ${a.wuxingMin}），止於小成（本版規則）` };
  if (r.bt2 && r.xp >= 100 - 1e-6) return { st: 'full', text: '已練滿：再練只防荒疏，不加造詣' };
  return { st: 'acc', text: '正在累積' };
}
export function artsGrowHtml(d, now = 0, grow = true) {
  const f = focusOf(d), rows = ARTS.filter((a) => d.arts?.[a.id] || (!a.secret && fits(d, a) && reqMissing(d, a).length)).map((a) => {
    const r = d.arts?.[a.id], st = artStatus(d, a, now), t = r ? artTier(d, a.id) : -1, cats = Object.keys(ART_CAT[a.id] || {}).map((c) => CATS[c].name + (CATS[c].sup === 'none' ? '（尚未支援）' : '')).join('＋');
    const nxt = r && !a.layered && !a.forms && t < TIERS.length - 1 ? `・距${TIERS[t + 1][1]} ${(TIERS[t + 1][0] - r.xp).toFixed(1)}` : '';
    const moves = r ? `・招式 ${(a.techs || []).filter((m) => d.moves.includes(m)).length}/${(a.techs || []).length}` : '';
    const why = []; if (r && grow && st.st === 'acc') { const ac = accelOf(d, a, r.xp); if (ac.mul > 1) why.push(`${CATS[ac.cat].name}底子：入門修練 ×${ac.mul.toFixed(2)}`); else if (a.grade >= 3 && ac.cat) why.push('精品以上：同類底子不加速'); }
    if (r && d.pf && !r.guizhen) { const p = profOf(r.xp), nx = nextLvXp(r.xp); why.push(p.lv ? `熟練度：招式威力 +${((profMul(r.xp) - 1) * 100).toFixed(1)}%（每重 +${(PROF.perLv * 100).toFixed(1)}%）${p.stuck ? '，卡瓶頸，突破後才升階' : nx != null && p.lv < PROF.lvs ? `，第${PROF.cn[p.lv + 1]}重 xp ${nx.toFixed(1)}` : `，滿十重，xp ${nx} 升${TIERS[p.t + 1][1]}`}` : '熟練度：化境不分重'); }
    if (r && rustOf(r, now) > 0.01) why.push(`荒疏 ${(rustOf(r, now) * 100).toFixed(0)}%`);
    if (r && Object.keys(ART_CAT[a.id] || {}).every((c) => CATS[c].sup === 'none')) why.push('門類尚未支援：不累積造詣');
    return `<div class="k artgrow" data-artst="${st.st}">${f === a.id ? '◆主修 ' : ''}${a.name}（${cats}）${r ? `・${d.pf && !r.guizhen ? `<span data-prof>${profLabel(r.xp)}</span>` : TIERS[t][1]} ${r.xp.toFixed(1)}${nxt}${moves}` : ''}・<b>${st.text}</b>${why.length ? `｜${why.join('；')}` : ''}</div>`; });
  return `<div class="grow-arts"><b>個別武學</b>${rows.join('')}</div>`;
}
/* loop85 規則說明：數字直接讀 GROW，不另寫 */
export function rulesHtml() { const G = GROW, A = G.acc;
  return `<details class="grow-rules" data-keep="grow-rules"><summary>造詣怎麼算（本版規則）</summary><div class="k">`
    + `修練：熟練真的有長才算，每單位投入 ×${G.k}；對敵命中 ×${G.src.fight}（修練的 ${G.src.fight} 倍）；師父傳功每門一次 +${G.pass}。<br>`
    + `里程碑：自然練到小成 +${G.ms[0][1]}、打坐破大成 +${G.ms[1][1]}、破化境 +${G.ms[2][1]}。<br>`
    + `每門上限：入門 ${G.cap[1]}、普通 ${G.cap[2]}、精品 ${G.cap[3]}、絕學 ${G.cap[4]}；門類合計最多 100。開局已有的熟練一次折算 ×${G.init}。<br>`
    + `加速：只看「其他」同類武學的造詣，只加在入門與普通武學、熟練 ${A.fade} 以前，最多 ×${A.max}；瓶頸照樣要打坐。<br>`
    + `不給造詣：求學、高人指點、劇情直接給的熟練；瓶頸冷卻中、已練滿再練。<br>`
    + `其他本版規則：悟性不足的武學止於小成；左右互搏大成後威力 ×${JH.twin}（算在江湖倍率，不算進圖）。造詣不加傷害。</div></details>`; }
/* loop97 熟練度十重規則說明：數字由 TIERS／PROF／BREAK 推得 */
export function profRulesHtml() { const rows = TIERS.slice(0, -1).map(([lo, n], k) => { const hi = TIERS[k + 1][0]; return `<li>${n}：xp ${lo}～${hi}，每 ${((hi - lo) / PROF.lvs).toFixed(1)} xp 一重</li>`; }).join('');
  return `<details data-keep="prof-rules"><summary>熟練度十重怎麼算</summary><div class="k">每門武學的${TIERS.slice(0, -1).map((t) => t[1]).join('／')}各分十重，${TIERS[TIERS.length - 1][1]}不分重。</div><ul>${rows}</ul>`
    + `<div class="k">每升一重：該武學招式威力 +${(PROF.perLv * 100).toFixed(1)}%（十重共 +${(PROF.perLv * 900).toFixed(1)}%）；升到下一階時從一重重算，但升階本身的威力 +${(ART_GAIN.tierDmg * 100).toFixed(0)}% 比十重多，所以不會變弱。</div>`
    + `<div class="k">只影響招式實際出手（狩獵、遠行），不影響門派戰力、練功速度與造詣。卡瓶頸（xp ${BREAK.caps.join('、')}）時停在十重，要突破才升階。</div></details>`; }
export function neigongRulesHtml() {
  return `<details data-keep="ng-rules"><summary>內力怎麼算</summary><div class="k">上限＝${NG.base}＋每門已學內功 ${NG.perTier}×（階數＋1，入門算 1、${TIERS[TIERS.length - 1][1]}算 ${TIERS.length}），最多 ${NG.cap}。內功：${INNER.map((id) => ARTS.find((a) => a.id === id).name).join('、')}。只看階，不看十重、不看造詣。</div>`
    + `<div class="k">回復：打坐一次 +${NG.med}；歇息每秒 +${NG.rest}。</div>`
    + `<div class="k">用途：狩獵出手扣 ${NG.strikeCost}，該擊威力 ×${NG.strikeMul}；守點時生命 ≤${NG.healAt} 扣 ${NG.healCost} 回 ${NG.heal} 生命；卡瓶頸打坐扣 ${NG.btCost}，衝關成功率 +${Math.round(NG.btBonus * 100)}%（仍最多 90%）。內力不夠就不用。不影響門派戰力與遠行。</div></details>`; }
export const growthHtml = (d, memo, day, now, grow) => powerHtml(d, memo, day, now) + catHtml(d) + artsGrowHtml(d, now, grow) + rulesHtml() + (d.pf ? profRulesHtml() : '') + (d.ng ? neigongRulesHtml() : '');
