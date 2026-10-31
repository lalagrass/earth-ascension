import { moodLabel, ARCH } from './social.mjs';
import { DAY, ACTIVITIES, EXP_STYLES, EXP, ARTS, TIERS, ART_GAIN, ROOT, JH, BREAK } from './data.mjs';
import { LABOR, strMul, laborToday } from './economy.mjs';
import { segAt } from './world.mjs';
import { nextStep } from './core.mjs';
import { NG, NG2, qiMax, qiOf, mitOf, tenthOf, INNER, profOf, profMul, profLabel, nextLvXp, PROF, effectTier, effectMul, artTier, stuckAt, gated, curCap, focusOf, reqMissing, fits, rustOf, CATS, CAT_ORDER, ART_CAT, mastery, levelOf, accelOf, GROW } from './arts.mjs';
import { CLQ } from './bonds.mjs';
import { JHEV, letterP } from './jianghu.mjs';
// ==== （原 dcard.mjs）====
// loop45：弟子卡摘要（右欄最大宗）。卡片只露一行重點，細節收進 <details>（記住展開）。只用面板原本就顯示的資訊。
export const NEED_WARN = { hunger: [30, '餓'], energy: [30, '累'], social: [30, '寂寞'], fun: [30, '悶'] };
export function dsum(d, artName = (id) => id) {
  const n = d.needs || {}, warn = Object.entries(NEED_WARN).filter(([k, [t]]) => (n[k] ?? 100) < t).map(([, [, w]]) => w);
  return `心情 ${d.mood | 0}（${moodLabel(d.mood)}）・飽足 ${(n.hunger ?? 0) | 0}・精力 ${(n.energy ?? 0) | 0}` + (warn.length ? `・<b style="color:#b33">${warn.join('、')}</b>` : '') + (d.pendingArt ? `・<span class="mv new">可學：${artName(d.pendingArt)}</span>` : '');
}

// ==== （原 fold.mjs）====
// loop37：右欄太長（外部審查）。各區標題可點擊收合，狀態記在介面偏好（keep）；預設收合較少用的區塊。純介面。
export const FOLD_DEFAULT = { arts: true, codex: true, hunt: true, labor: true, ledger: true, rel: true };
export const foldKey = (id) => `sec-${id}`;
export const isFolded = (K, id) => (foldKey(id) in (K || {}) ? !!K[foldKey(id)] : !!FOLD_DEFAULT[id]);
export const setAll = (K, ids, folded) => { for (const id of ids) K[foldKey(id)] = folded; return K; };

// ==== （原 labor-ui.mjs）====
/* loop130 勞作練體的顯示（純字串，可在 Node 測試）。只寫玩家看得到的：今日做活長了多少、傷害倍率。 */
export const laborNote = (s, d) => (d?.lg ? `（勞作今日 ${Math.min(laborToday(d, Math.floor(s.t / DAY)), 99).toFixed(1)}/${LABOR.cap}・招式 ×${strMul(d).toFixed(2)}）` : '');

// ==== （原 status.mjs）====
// v1.45 弟子面板「現在／原因／下一步」（ADOPTION-PLAN A5）：標出是哪一層決定的（指令／巡山／生理／作息／性格）
const actName = (a) => (a === 'hunt' ? '狩獵' : a === 'trial' ? '試煉' : a === 'deliver' ? '送東西回院倉' : ACTIVITIES[a]?.name || a);
export const LAYER = { order: '指令', need: '生理', sched: '作息', duty: '職司', trait: '性格', carry: '工序' };
export function statusOf(s, d) {
  if (d.away && s.exp?.team.includes(d.id)) { const X = s.exp;
    return { layer: '巡山', now: `巡山${X.phase === 'out' ? '前進' : '回程'}：${segAt(X.dist).name} ${Math.round(X.phase === 'out' ? X.dist : X.backPos ?? X.dist)} 步`, why: X.recalled && X.phase === 'out' ? '掌門傳令召回，下一拍回頭' : X.phase === 'out' ? `掌門派出（${EXP_STYLES[X.style]?.name || ''}）` : `回頭：${X.reason}`, next: X.phase === 'out' ? `到 ${X.target >= 1e9 ? '走不動為止' : X.target + ' 步'} 或觸發撤退線就回頭` : `回山門後歇 ${EXP.cool} 秒左右${X.ret?.left?.length ? `；還要經過 ${X.ret.left.length} 段未清段` : ''}` }; }
  // v1.5：層級讀 d.decision（決策當下寫入的結構），不再用 reason 文字猜；下一步＝目前任務工序裡排著的下一步
  const now = d.task ? actName(d.task.act) : '待命';
  const why = d.reason || '—';
  const dec = d.task ? d.decision : null;
  const layer = d.order ? '指令' : !d.task ? '待命' : LAYER[dec?.layer] || '性格';
  const step = d.task ? nextStep(d.task) : null;
  const next = step ? `${step}（${actName(d.task.act)}的下一道工序）` : d.order ? `繼續「${actName(d.order)}」（指派中）` : d.task ? `做完「${actName(d.task.act)}」再重新評估` : '馬上重新評估要做什麼';
  return { layer, now, why, next };
}
export const statusHtml = (s, d) => { const x = statusOf(s, d); return `<div class="status"><div><b>現在</b>：${x.now} <span class="tag">${x.layer}</span></div><div><b>原因</b>：${x.why}</div><div><b>下一步</b>：${x.next}</div></div>`; };

// ==== （原 growui.mjs）====
/* loop81 成長分層介面（純顯示，不寫世界狀態）：A 人物實力圖、B 門類造詣、C 個別武學。
   能力圖：固定 5 軸、固定順序、固定顯示基準（不是能力上限，也不按角色或全派最大值縮放）；不算面積。 */
export const AXES = [
  { k: 'palm', name: '掌', lo: 0, hi: 100, get: (d) => d.skills.palm, note: '掌系招式傷害、出手距離（劍招也用）' },
  { k: 'leg', name: '腿', lo: 0, hi: 100, get: (d) => d.skills.leg, note: '腿系招式傷害、出手距離' },
  { k: 'strength', name: '力氣', lo: 0, hi: 100, get: (d) => d.skills.strength, note: '守山、試煉' },
  { k: 'agility', name: '腳力', lo: 0, hi: 100, get: (d) => d.skills.agility, note: '移動速度 ×(1+值/100)' },
  { k: 'rest', name: '調息', lo: 1, hi: 1.5, get: (d, now) => (1 + ART_GAIN.restPerTier * Math.max(0, effectTier(d, 'rest') + 1)) * effectMul(d, 'rest', now), note: '常態睡眠恢復倍率（吐納）', fmt: (v) => `×${v.toFixed(2)}` },
];
/* loop106 開啟內功時才加第 6 軸「內力」（上限；基準固定＝基礎～吐納化境），關閉時維持五軸 */
export const QI_AXIS2 = { k: 'qi', name: '內力', lo: 0, hi: NG2.cap[NG2.cap.length - 1], get: (d) => qiMax(d), note: '內力上限（護體真氣；吐納練到化境＝100）', fmt: (v) => v.toFixed(0) }; // loop120；loop142 一版軸淘汰
export const QI_AXIS = QI_AXIS2;
export const axesOf = (d) => (d?.ng ? [...AXES, QI_AXIS2] : AXES);
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
    + `<div class="k">狀態：生命 ${d.hp | 0}/100 ${bar(d.hp, 100, '#c55')}　精力 ${d.needs.energy | 0} ${bar(d.needs.energy, 100, '#d9a441')}　${d.ng2 ? qiStatus(d, now) : d.ng ? `內力 ${qiOf(d) | 0}/${qiMax(d)} ${bar(qiOf(d), qiMax(d), '#5a7ab0')}` : '內力：本版沒有內力系統'}</div>`
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
// loop120 窄欄：氣 x/y＋條＋滑鼠提示（減傷、力竭）
export function qiStatus(d, now = 0) {
  const m = qiMax(d), tired = (d.spentUntil ?? -1) > now;
  if (!m) return `<span title="還沒學內功：沒有護體真氣">氣 0/0（未學內功）</span>`;
  return `<span title="護體真氣：受擊先減傷 ${Math.round(mitOf(d) * 100)}%，再由內力吸收；內力打空會力竭 ${NG2.spentT} 秒（受傷 ×${NG2.spentMul}）">氣 ${qiOf(d) | 0}/${m} ${bar(qiOf(d), m, '#5a7ab0')}${tired ? '（力竭）' : ''}${tenthOf(d) ? '・真氣綿長' : ''}</span>`;
}
export function neigongRules2Html() {
  return `<details data-keep="ng-rules"><summary>護體真氣怎麼算</summary><div class="k">開局沒有內力。每門已學內功依階給上限（${TIERS.map((t, i) => `${t[1]} ${NG2.cap[i]}`).join('、')}），最多 ${NG2.total}；減傷依階 ${NG2.mit.map((v) => Math.round(v * 100) + '%').join('／')}，最多 ${Math.round(NG2.mitCap * 100)}%。</div>`
    + `<div class="k">受擊（狩獵、遠行）：先減傷，再由內力吸收，不夠才扣生命；內力打空力竭 ${NG2.spentT} 秒，受傷 ×${NG2.spentMul}；任一內功練到圓滿十重或化境則「真氣綿長」，打空也不力竭（只此一項，不另加內力或減傷）。寨匪、剿寨重傷時，內力 ≥${NG2.guard} 就扣 ${NG2.guard}，生命留 ${NG2.guardHp}。門派戰力每人 +${NG2.powK}×上限。</div>`
    + `<div class="k">回復：打坐一次 +${NG.med}；歇息每秒 +${NG.rest}。衝關仍可扣 ${NG.btCost} 加成功率 +${Math.round(NG.btBonus * 100)}%。沒有運勁、運功療傷。</div></details>`; }
export const neigongRulesHtml = neigongRules2Html; // loop142 一版說明淘汰
export const growthHtml = (d, memo, day, now, grow) => powerHtml(d, memo, day, now) + catHtml(d) + artsGrowHtml(d, now, grow) + rulesHtml() + (d.pf ? profRulesHtml() : '') + (d.ng ? neigongRules2Html() : '');

// ==== （原 jhui.mjs）====
// loop34 介面可讀性（選用，s.jhui）：原型、同門小派、江湖事件三塊面板。純顯示：只讀狀態、不寫狀態、不抽亂數；golden 不變。
// 只顯示玩家已知的資訊：未看清根骨（rootKnown=false）的新弟子，原型也不揭露（原型會洩漏根骨／悟性區間）。
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const live = (s) => (s.ds || []).filter((d) => !d.removed);
const ACT = { train: '練功', meditate: '打坐', spar: '切磋' };
export const archKnown = (s, d) => !!d.arch && !!ARCH[d.arch] && (d.id === 'hero' || d.rootKnown !== false);
// 弟子卡上的原型行：已知→名稱（參考）＋一句傾向；未知→提示共事後才看得出
export function archLine(s, d) {
  if (!d.arch || !ARCH[d.arch]) return '';
  if (!archKnown(s, d)) return `<div class="k">原型：？？（共事久了才看得出）</div>`;
  const A = ARCH[d.arch]; return `<div class="k" title="${esc(A.desc)}">原型：${esc(A.name)}（參考：${esc(A.ref)}）— ${esc(A.desc)}</div>`;
}
export function archPanel(s) {
  const ds = live(s).filter((d) => d.arch && ARCH[d.arch]); if (!ds.length) return '<div class="k">門中尚無帶原型的弟子（自創主角可選原型；開「人以群分」後新弟子會帶原型）。</div>';
  const known = ds.filter((d) => archKnown(s, d)), hidden = ds.length - known.length, by = {};
  for (const d of known) (by[d.arch] ??= []).push(d.name);
  const rows = Object.entries(by).map(([id, ns]) => `<tr><td>${esc(ARCH[id].name)}</td><td class="k">參考：${esc(ARCH[id].ref)}</td><td>${ns.map(esc).join('、')}</td><td class="k">${esc(ARCH[id].desc)}</td></tr>`).join('');
  return `<table class="codex"><tr><th>原型</th><th>參考</th><th>弟子</th><th>傾向</th></tr>${rows}</table>${hidden ? `<div class="k">另有 ${hidden} 人原型未明（共事久了才看得出）。</div>` : ''}`;
}
export function cliquePanel(s) {
  if (!s.draw) return '<div class="k">未開「人以群分」，不會結小派。</div>';
  const cs = s.cliques || [], name = (id) => live(s).find((d) => d.id === id);
  const head = `<div class="k">好感彼此都很高的一群人會結成小派；同派的人一起${CLQ.acts.map((a) => ACT[a]).join('／')}時進步略快，剿寨也優先同行。感情淡了就會散。</div>`;
  if (!cs.length) return head + `<div class="k">目前沒有小派。${s.cliqueN ? `（曾結成 ${s.cliqueN} 派，都已散了）` : ''}</div>`;
  return head + cs.map((c) => { const ms = c.ids.map(name).filter(Boolean);
    const now = ms.filter((d) => CLQ.acts.includes(d.task?.act)), same = Object.entries(now.reduce((a, d) => ((a[d.task.act] = (a[d.task.act] || 0) + 1), a), {})).filter(([, n]) => n >= 2);
    return `<div class="card"><b>${esc(c.name)}</b> <span class="k">第 ${c.day} 日結成・${ms.length} 人</span><div>${ms.map((d) => esc(d.name)).join('、')}</div>${same.length ? `<div class="k">正一起${same.map(([a, n]) => `${ACT[a]}（${n} 人）`).join('、')}，進步略快</div>` : ''}</div>`; }).join('');
}
const recent = (s, tag, n) => (s.log || []).filter((l) => l.msg?.startsWith(tag)).slice(0, n);
export function jhevPanel(s) {
  if (!s.jhev) return '<div class="k">未開「江湖事件」。</div>';
  const E = typeof s.jhev === 'object' ? s.jhev : { m: 0, l: 0, lw: 0 }, day = s.day || 1, M = JHEV.master, L = JHEV.letter;
  const est = day >= L.after ? `若今日有人下挑戰帖，勝算約 ${Math.round(letterP(s, day) * 100)}%（看門中前三人的武功）` : `第 ${L.after} 日後才會有人下挑戰帖`;
  const rows = [
    `<div>過路高人：來過 ${E.m || 0} 次${E.t ? `，傳武學 ${E.t} 套` : ''}${E.mv ? `，點撥招式 ${E.mv} 招` : ''}${E.pg ? `，留殘譜 ${E.pg} 頁` : ''}<span class="k">（第 ${M.after} 日起偶爾來訪）</span></div>`,
    `<div>挑戰帖：應戰 ${E.l || 0} 次，勝 ${E.lw || 0}・敗 ${(E.l || 0) - (E.lw || 0)}${E.lr ? `・婉拒 ${E.lr}` : ''}<span class="k">（點到為止，不會受傷；勝了得名聲與彩頭，敗了掉一點名聲）</span></div>`,
    `<div class="k">${est}</div>`];
  const ev = [...recent(s, '【過路高人】', 3), ...recent(s, '【挑戰帖】', 3)].sort((a, b) => b.t - a.t).slice(0, 4);
  return rows.join('') + (ev.length ? `<ul class="k">${ev.map((l) => `<li>第 ${Math.floor(l.t / DAY) + 1} 日：${esc(l.msg)}</li>`).join('')}</ul>` : '<div class="k">還沒遇過江湖事件。</div>');
}
// loop35：折疊狀態由呼叫端保存（closed[key]=true 表示玩家收合過）；預設展開
export const JHUI_KEYS = ['arch', 'clique', 'jhev'];
export function jhuiHtml(s, closed = {}) {
  if (!s.jhui) return '';
  const sec = (k, title, body) => `<details data-keep="jhui-${k}"${closed[`jhui-${k}`] ? '' : ' open'}><summary>${title}</summary>${body}</details>`;
  return sec('arch', '原型', archPanel(s)) + sec('clique', '同門小派', cliquePanel(s)) + sec('jhev', '江湖事件', jhevPanel(s));
}

// ==== （原 modalq.mjs）====
// loop36：阻斷視窗排隊（外部審查 P2：首次巡山戰報與東方不敗抉擇同時彈出、互相遮住）。
// 一次只顯示一個；已開著的那個先看完。待顯示的依序：大事（剛發生的事，含戰報）→ 抉擇 → 章節總結。純介面，不碰模擬。
export const MODAL_ORDER = ['alert', 'choice', 'chap'];
export function pickModal({ cur = null, alert = false, choice = false, chap = false } = {}) {
  const want = { alert, choice, chap };
  if (cur && want[cur]) return cur;
  return MODAL_ORDER.find((k) => want[k]) || null;
}
export const pending = (S) => ({ alert: !!S?.alert, choice: !!(S?.hero?.askMajor && S?.choices?.[0]), chap: !!(S?.chapter?.done && !S.chapter.seen) });
