// v0.96 新局：主角建立畫面（經典模板／自創）、同門選擇、抉擇卡
import { STATS, VALUES, Q9, HEROES, COMPANIONS } from './hero-data.mjs';
import { budgetOf, spent, validStats, defaultStats, readHeart, companionsFor, VALUE_NAMES, resolveChoice } from './hero.mjs';
import { TRAITS } from './data.mjs';
import { NEW_TRAITS } from './hero-data.mjs';
import { ARCH, archLabel } from './archetype.mjs';
import { TYPES, typeLabel, mbtiPersonality, nearestType, MBTI_Q, quizResult } from './mbti.mjs';
import { legacyBest } from './slice.mjs';
import { SECTS, HERO_SECT } from './sect-data.mjs';
import { xiaHints } from './wuxia.mjs'; /* loop68 */
import { genHints } from './gen.mjs'; /* loop72 */
const css = `#start{position:fixed;inset:0;background:rgba(30,22,14,.88);z-index:50;overflow:auto;color:#f3e7cf;font:14px/1.5 serif}
#start .box{max-width:1640px;margin:8px auto;padding:14px 20px;background:#2b2118;border:2px solid #a07a44;border-radius:10px}
#start h1{margin:0 0 6px;font-size:24px}#start .tabs button{font-size:15px;margin-right:6px}#start .tabs .on{background:#c9a061;color:#2b2118}
#start .cards{display:flex;gap:10px;flex-wrap:wrap}#start .card{width:196px;background:#3a2c1f;border:2px solid #5a4430;border-radius:8px;padding:6px;cursor:pointer}
#start .card.on{border-color:#ffd27a;box-shadow:0 0 12px #ffd27a88}#start .card img{width:100%;height:170px;object-fit:cover;object-position:top;border-radius:5px}
#start .card b{font-size:17px}#start .small{font-size:12px;opacity:.85}#start .comp{display:flex;gap:10px;margin-top:8px}#start .comp .card{width:150px}#start .comp .card img{height:140px}
#start .stat{display:inline-block;margin:3px 10px 3px 0}#start .q{margin:3px 0}#start select{max-width:260px}#start .go{font-size:18px;padding:6px 26px;margin-top:10px;background:#c9a061;border:0;border-radius:6px}
#choice{position:fixed;left:calc((100vw - var(--pw, 410px)) / 2);top:18%;transform:translateX(-50%);width:max-content;max-width:min(560px, calc(100vw - var(--pw, 410px) - 32px));box-sizing:border-box;z-index:40;background:#2b2118;color:#f3e7cf;border:2px solid #ffd27a;border-radius:10px;padding:14px 20px;font:15px/1.6 serif;box-shadow:0 6px 30px #000a}
#choice button{display:block;margin:6px 0;width:100%;text-align:left;font-size:15px}`;
// loop35：江湖規則單一來源（勾選 id、st 欄位、spec 鍵、預設、說明）；兩個分頁共用 ruleSpec，避免漏傳／重複
export const RULES = [
  ['grow', 'grow', 'grow', true, '成長分層：練武學會慢慢累積門類造詣（拳掌、腿法、劍法），同類造詣高的人學另一門入門功夫較快；武學圖顯示人物實力圖、造詣與各武學進度'],
  ['growdr', 'growdr', 'growdr', true, '造詣邊際遞減（需成長分層）：門類造詣越高，練功、實戰再加的造詣越少（÷(1＋目前造詣×0.03)）；小成、衝關的里程碑造詣不變'],
  ['neigong', 'neigong', 'neigong', true, '最小內功：每人有內力（上限由已學內功的階決定），打坐、歇息回復；狩獵運勁加威力、重傷時運功療傷、衝關時加成功率'],
  ['ngshield', 'ngshield', 'ngshield', true, '護體真氣（需最小內功）：開局沒有內力，學了內功才有，上限與減傷隨內功的階成長；受擊先減傷、再由內力吸收，內力打空會力竭一陣子；內力也算進門派戰力。取代狩獵運勁與運功療傷'],
  ['valormid', 'valormid', 'valormid', true, '小有勇名（需門派勇名）：勇名 25～49 時先有「小有勇名」，門派戰力 ×1.02；顯示在山賊欄'],
  ['laborgrow', 'laborgrow', 'laborgrow', true, '勞作練體：砍柴、採石、挑水、施工、修柵長的力氣會進戰鬥——招式傷害 ×(1＋力氣/400)，門派戰力每人＋力氣/10；做活長的力氣每人每日超過 3 點後只拿兩成（練功不受限）'],
  ['valor', 'valor', 'valor', true, '門派勇名：迎戰山賊 +2、打退再 +2、付錢了事 −3、接挑戰帖 +2、婉拒 −2（−100～100）；≥50「勇名在外」門派戰力 ×1.05，≤−50「軟柿子」山賊威脅 ×1.1；顯示在山賊欄'],
  ['rumor', 'rumor', 'rumor', true, '傳聞預警：山賊上門前一兩日，山下茶攤會傳出風聲（只說約幾日，不說人數）；山賊欄不再直接寫下次日期；有執事時優先修柵，遠行中會提醒可召回'],
  ['prof', 'prof', 'prof', true, '熟練度十重：每門武學的入門／小成／大成／圓滿各分十重，每升一重該武學招式威力 +0.5%（升到下一階時重新從一重算）；武學圖顯示第幾重'],
  ['stewyard', 'stewyard', 'stewyard', true, '執事立樁：外功場還是空地、弟子有 4 人以上時，執事立木樁場的藍圖（6 木；需執事自主），大家就有木人樁可打、切磋練功更快'],
  ['draw', 'draw', 'draw', false, '人以群分：外向的人更愛交友、強者吸引人靠近'],
  ['stewkit', 'stewkit', 'stewkit', true, '執事顧灶：人數到 8 人以上、存飯不夠一人一頓、還是露天灶時，執事立膳房的藍圖（需執事自主）'],
  ['masterask', 'masterask', 'masterask', true, '高人指點誰由我定：勾了「重大抉擇問我」時，過路高人改成抉擇卡，由你挑一位弟子受指點'],
  ['longwatch', 'longwatch', 'longwatch', true, '哨崗久守：有人上護山哨守過之後，嚇退下山野豬的時間加倍（120→240 秒）'],
  ['paypill', 'paypill', 'paypill', true, '欠俸先賣丹：月俸結算錢不夠時，先把庫存療傷丹照市價賣給山下藥舖（受每期上限）'],
  ['cofun', 'cofun', 'cofun', true, '有伴解悶：附近有人一起練功、打坐或閒著時，不那麼悶（樂趣下降速度減半）'],
  ['cotrain', 'cotrain', 'cotrain', true, '同修作伴：附近有人一起練功或打坐時，不那麼寂寞（寂寞增加速度減半）'],
  ['mpool', 'mpool', 'mpool', true, '殘譜指點：過路高人無武學可傳時，改留一頁殘譜，講解弟子正在追的前置武學'],
  ['comp', 'compr', 'comprehend', true, '領悟：苦練與觀摩切磋可自悟、偷師他派功夫'],
  ['mentor', 'mentor', 'mentor', true, '同修請教：一起練功互相砥礪、向強者請教、結成練功搭子'],
  ['steward', 'steward', 'steward', true, '執事自主：有人睡地鋪就擴寢舍，野豬常來就蓋護山哨'],
  ['lairpow', 'lairpow', 'lairpow', true, '寨強看戰力：山寨強弱跟門派戰力走，不隨家產變強'],
  ['lift', 'lift', 'lift', true, '心情自救：心情低落時自己去閒坐、聊天或歇息'],
  ['bt25', 'bt25', 'bt25', true, '突破優先：卡瓶頸時先打坐衝關（人多升首徒後也不會只顧練功）'],
  ['letterask', 'letterask', 'letterask', true, '挑戰帖由我定奪：勾了「重大抉擇問我」時，挑戰帖改成抉擇卡（顯示勝算，應戰或婉拒）'],
  ['cropcare', 'cropcare', 'cropcare', true, '誰種誰心疼：菜被野豬拱時，只有照顧菜園的兩人難過，其他人只是聽說'],
  ['mfit', 'mfit', 'mfit', true, '因材施教：過路高人傳功時，優先傳弟子本身路數的武學'],
  ['jhrefuse', 'jhrefuse', 'jhrefuse', true, '量力而為：挑戰帖勝算明顯偏低（<3 成）時婉拒，名聲 −1、不傷心情'],
  ['qshare', 'qshare', 'qshare', true, '人多分攤：全派人數達外門兩倍時，外門每人日課少 1 點'],
  ['jhui', 'jhui', 'jhui', true, '介面：原型、同門小派、江湖事件面板（純顯示）'],
  ['jhev', 'jhev', 'jhev', true, '江湖事件：過路高人指點、挑戰帖（點到為止不受傷）'],
  ['peace', 'peace', 'peace', true, '太平與備料：巡山掃清後山賊晚來、派隊偏好搭子、柵缺料自動備料'],
];
export const ruleOn = (st, k, on) => (on ? st[k] !== false : !!st[k]);
export const ruleSpec = (st) => Object.fromEntries(RULES.filter(([, k, , on]) => ruleOn(st, k, on)).map(([, , sk]) => [sk, true]));
export function buildSpec(st, bonus = 0) {
  const R = ruleSpec(st);
  if (st.tab === 'classic') return { kind: 'template', id: st.hero, companion: st.comp, askMajor: st.ask, xiaStyle: st.xia || 'all', ...R };
  if (st.tab === 'custom') return { kind: 'custom', name: st.name, stats: st.stats, answers: st.ans, ...(st.mbti ? { mbti: st.mbti } : {}), ...(st.arch ? { arch: st.arch } : {}), ...R, companion: st.comp, askMajor: st.ask, bonus, xiaStyle: st.xia || 'all' };
  return null;
}
const SUHUI = (() => { try { return legacyBest(localStorage); } catch { return 0; } })(); // v1.7 也讀存檔裡的宿慧
const st = { tab: 'classic', hero: 'guojing', comp: null, name: '無名', stats: defaultStats(), ans: Array(9).fill(0), ask: true, mbti: '', draw: true, mbtiMode: 'none', mq: Array(MBTI_Q.length).fill(null) };
const tn = (t) => TRAITS[t]?.name || NEW_TRAITS[t]?.name || t;
const statLine = (s) => STATS.map(([k, n]) => `${n}${s?.[k] ?? '—'}`).join(' ');
const valLine = (v) => Object.entries(v || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, x]) => `${VALUE_NAMES[k]}${x > 0 ? '+' : ''}${x}`).join('・');
function compCards(heroId) {
  const ids = companionsFor(heroId); if (!ids.includes(st.comp)) st.comp = ids[0];
  return `<h3>選一位開局同門（另一位留在江湖，日後或可相遇）</h3><div class="comp">${ids.map((id) => { const c = COMPANIONS[id]; return `<div class="card ${st.comp === id ? 'on' : ''}" data-comp="${id}"><img src="assets/portraits/${id}.png"><b>${c.name}</b><div class="small">悟性${c.wu}・根骨${c.root}・${c.personality.map(tn).join('/')}</div><div class="small">${c.tag}</div></div>`; }).join('')}</div>`;
}
function render(el) {
  let h = `<div class="box"><h1>山門紀・新局：誰來開山？</h1><div class="tabs"><button data-tab="classic" class="${st.tab === 'classic' ? 'on' : ''}">經典人物</button><button data-tab="custom" class="${st.tab === 'custom' ? 'on' : ''}">自創主角（12 點＋九問問心）</button><button data-tab="plain">照舊（無名主角）</button></div>`;
  if (st.tab === 'classic') {
    h += `<div class="cards" style="margin-top:8px">${HEROES.map((x) => `<div class="card ${st.hero === x.id ? 'on' : ''}" data-hero="${x.id}"><img src="assets/portraits/${x.id}.png"><b>${x.name}</b>${x.hard ? ' <b class="hard-tag" style="color:#b33">困難</b>' : ''} <span class="small">難度${'★'.repeat(x.diff)}</span><div class="small">${statLine(x.stats)}</div><div class="small">${x.personality.map(tn).join('/')}・${valLine(x.values)}</div><div class="small">${x.tag}</div><div class="small" style="color:#ffd27a">門派：${SECTS[HERO_SECT[x.id]].plaque}</div></div>`).join('')}</div>`;
    h += compCards(st.hero);
  } else if (st.tab === 'custom') {
    const b = budgetOf(st.stats, SUHUI), left = b - spent(st.stats), r = readHeart(st.ans);
    h += `<div style="margin-top:8px">名字 <input id="st-name" value="${st.name}" maxlength="6"> 剩餘點數 <b>${left}</b>／${b}${st.stats.wu === 1 ? '（悟性 1：退 1 點，得「笨功夫」憨厚）' : ''}${SUHUI ? `　<b style="color:#9fd3ff">宿慧 +${SUHUI}（宿慧開局）</b>` : ''}<div>${STATS.map(([k, n]) => `<span class="stat">${n} <button data-st="${k}|-1">−</button> <b>${st.stats[k]}</b> <button data-st="${k}|1">＋</button></span>`).join('')}</div>`;
    h += archBlock(st);
    h += `<h3>九問問心</h3>${Q9.map((q, i) => `<div class="q">${i + 1}. ${q.q}：<select data-q9="${i}">${q.a.map((a, j) => `<option value="${j}" ${st.ans[i] === j ? 'selected' : ''}>${a[0]}</option>`).join('')}</select></div>`).join('')}`;
    h += mbtiBlock(st);
    h += `<div>→ 主價值 <b>${VALUE_NAMES[r.main]}</b>・副 <b>${VALUE_NAMES[r.sub]}</b>　特質 <b>${(st.mbti ? mbtiPersonality(st.mbti, st.stats.wu) : r.visible).map(tn).join('、')}</b>＋一個暗特質（相處後才看得出）</div></div>` + compCards(null);
  } else h += `<p>沿用 v0.95 的無名主角、林師姐、堂弟開局（不帶價值觀與同門）。</p>`;
  const ok = st.tab !== 'custom' || validStats(st.stats, SUHUI);
  h += `<fieldset class="rules"><legend>江湖規則（新局選用，舊局不受影響）</legend>`;
  h += RULES.map(([id, k, , on, label]) => `<div><label><input type="checkbox" id="st-${id}" ${ruleOn(st, k, on) ? 'checked' : ''}> ${label}</label></div>`).join('');
  h += `</fieldset>`;
  h += `<div>名俠池畫風 <select id="st-xia">${[['all', '全明星'], ['jin', '純金庸'], ['zhou', '純周星馳']].map(([k, n]) => `<option value="${k}" ${(st.xia || 'all') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
  h += `<div><label><input type="checkbox" id="st-ask" ${st.ask ? 'checked' : ''}> 重大抉擇每次詢問我（取消則依價值觀自動決定）</label></div><button class="go" id="st-go" ${ok ? '' : 'disabled'}>開山立派</button></div>`;
  el.innerHTML = h;
}
// loop13：16 型三選一：不選／答八題／直接選型（下拉保留為替代）
// loop21 武俠原型（選用）：套用一組點數＋兩個明面特質；人物只標「參考」
export function archBlock(st) {
  const tn3 = (x) => TRAITS[x]?.name || NEW_TRAITS[x]?.name || x, A = ARCH[st.arch];
  return `<div class="q">武俠原型（選用）：<select id="st-arch"><option value="">（不套用）</option>${Object.keys(ARCH).map((k) => `<option value="${k}" ${st.arch === k ? 'selected' : ''}>${archLabel(k)}</option>`).join('')}</select>${A ? `　${A.desc}；特質 <b>${A.traits.map(tn3).join('、')}</b>（點數已套用，可再調）` : ''}</div>`;
}
export function mbtiBlock(st) {
  const M = st.mbtiMode || 'none', tn2 = (x) => TRAITS[x]?.name || NEW_TRAITS[x]?.name || x;
  let h = `<h3>16 型人格（選用）</h3><div class="q">${[['none', '不選（特質照九問）'], ['quiz', '答八題'], ['pick', '直接選型']].map(([k, n]) => `<label><input type="radio" name="st-mm" data-mm="${k}" ${M === k ? 'checked' : ''}> ${n}</label>`).join('　')}</div>`;
  if (M === 'quiz') h += MBTI_Q.map((q, i) => `<div class="q">${i + 1}. ${q.q} <select data-mq="${i}"><option value="" ${st.mq[i] == null ? 'selected' : ''}>—</option>${q.a.map(([t], j) => `<option value="${j}" ${st.mq[i] === j ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`).join('') + (st.mbti ? '' : `<div class="k">還有 ${st.mq.filter((x) => x == null).length} 題沒答</div>`);
  if (M === 'pick') h += `<div class="q"><select id="st-mbti"><option value="">（請選）</option>${Object.keys(TYPES).map((k) => `<option value="${k}" ${st.mbti === k ? 'selected' : ''}>${typeLabel(k)}</option>`).join('')}</select></div>`;
  if (st.mbti) h += `<div class="q">→ ${typeLabel(st.mbti)}　特質 <b>${mbtiPersonality(st.mbti, st.stats.wu).map(tn2).join('、')}</b>（價值觀與暗特質仍看九問）</div>`;
  return h;
}
export function openStart(onStart) {
  if (!document.getElementById('st-css')) { const s = document.createElement('style'); s.id = 'st-css'; s.textContent = css; document.head.appendChild(s); }
  const el = document.createElement('div'); el.id = 'start'; document.body.appendChild(el); render(el);
  el.addEventListener('click', (e) => { const t = e.target.closest('[data-tab],[data-hero],[data-comp],[data-st],#st-go,#st-ask'); if (!t) return;
    if (t.dataset.tab) st.tab = t.dataset.tab; if (t.dataset.hero) { st.hero = t.dataset.hero; st.comp = null; } if (t.dataset.comp) st.comp = t.dataset.comp;
    if (t.dataset.st) { const [k, dv] = t.dataset.st.split('|'); const v = st.stats[k] + +dv; if (v >= 1 && v <= 5) { const n = { ...st.stats, [k]: v }; if (spent(n) <= budgetOf(n, SUHUI) || +dv < 0) st.stats = n; } }
    if (t.id === 'st-ask') st.ask = t.checked;
    if (t.id === 'st-go') { const spec = buildSpec(st, SUHUI); el.remove(); onStart(spec); return; }
    render(el); });
  el.addEventListener('change', (e) => { { const r = RULES.find(([id]) => e.target.id === `st-${id}`); if (r) st[r[1]] = e.target.checked; } if (e.target.dataset.q9) { st.ans[+e.target.dataset.q9] = +e.target.value; render(el); } if (e.target.id === 'st-name') st.name = e.target.value || '無名'; if (e.target.id === 'st-arch') { st.arch = e.target.value || ''; if (ARCH[st.arch]) st.stats = { ...ARCH[st.arch].stats }; render(el); } if (e.target.id === 'st-xia') st.xia = e.target.value; if (e.target.dataset.mm) { st.mbtiMode = e.target.dataset.mm; st.mbti = st.mbtiMode === 'quiz' ? quizResult(st.mq) || '' : st.mbtiMode === 'pick' ? st.mbti : ''; render(el); } if (e.target.dataset.mq) { st.mq[+e.target.dataset.mq] = e.target.value === '' ? null : +e.target.value; st.mbti = quizResult(st.mq) || ''; render(el); } if (e.target.id === 'st-mbti') { st.mbti = e.target.value; render(el); } });
}
export function choiceUI(S) {
  let el = document.getElementById('choice'); const ch = S.hero?.askMajor && S.choices?.[0];
  if (!ch) { el?.remove(); return false; }
  if (el?.dataset.id === ch.id) return true;
  el?.remove(); el = document.createElement('div'); el.id = 'choice'; el.dataset.id = ch.id; const hints = S.jhui ? xiaHints(ch) || genHints(ch) : null; /* loop72 收養卡 */ /* loop68：奇遇卡後果說明（隨江湖面板開關） */
  el.innerHTML = `${ch.portrait ? `<img src="${ch.portrait}" style="float:left;width:72px;height:96px;object-fit:cover;border-radius:6px;margin:0 10px 6px 0;border:1px solid #b89" onerror="this.remove()">` : ''}<b>【抉擇】${ch.title}</b><p>${ch.text}</p>${ch.opts.map((o, i) => `<button data-pick="${i}">${o}</button>${hints?.[i] ? `<div class="small" data-hint="${i}">→ ${hints[i]}</div>` : ''}`).join('')}<div class="small">本心：${valLine(S.hero.values)}（違背主價值會添一層違心）</div>`;
  el.onclick = (e) => { const b = e.target.closest('[data-pick]'); if (!b) return; resolveChoice(S, ch.id, +b.dataset.pick); el.remove(); };
  document.body.appendChild(el); return true;
}
export function heroCard(S) {
  const H = S.hero; if (!H) return ''; const d = S.ds.find((x) => x.id === 'hero'), c = S.ds.find((x) => x.id === H.companion);
  return `<div style="display:flex;gap:8px;align-items:center"><img src="assets/portraits/${H.kind === 'template' ? H.id : 'guojing'}.png" style="width:54px;height:72px;object-fit:cover;border-radius:4px;${H.kind === 'template' ? '' : 'filter:grayscale(1)'}"><div><b>${d.name}</b>　${statLine(H.stats)}<br>本心：${valLine(d.values)}　違心 ${'●'.repeat(d.wexin || 0)}${'○'.repeat(3 - (d.wexin || 0))}<br>同門：${c ? c.name : '—'}${d.pairMul > 0 ? `（默契 +${Math.round(d.pairMul * 100)}%）` : ''}</div></div>`;
}
