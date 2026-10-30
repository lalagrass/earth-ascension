// v0.96 新局：主角建立畫面（經典模板／自創）、同門選擇、抉擇卡
import { STATS, VALUES, Q9, HEROES, COMPANIONS } from './hero-data.mjs';
import { budgetOf, spent, validStats, defaultStats, readHeart, companionsFor, VALUE_NAMES, resolveChoice } from './hero.mjs';
import { TRAITS } from './data.mjs';
import { NEW_TRAITS } from './hero-data.mjs';
import { ARCH, archLabel } from './archetype.mjs';
import { TYPES, typeLabel, mbtiPersonality, nearestType, MBTI_Q, quizResult } from './mbti.mjs';
import { legacyBest } from './slice.mjs';
import { SECTS, HERO_SECT } from './sect-data.mjs';
const css = `#start{position:fixed;inset:0;background:rgba(30,22,14,.88);z-index:50;overflow:auto;color:#f3e7cf;font:14px/1.5 serif}
#start .box{max-width:1640px;margin:8px auto;padding:14px 20px;background:#2b2118;border:2px solid #a07a44;border-radius:10px}
#start h1{margin:0 0 6px;font-size:24px}#start .tabs button{font-size:15px;margin-right:6px}#start .tabs .on{background:#c9a061;color:#2b2118}
#start .cards{display:flex;gap:10px;flex-wrap:wrap}#start .card{width:196px;background:#3a2c1f;border:2px solid #5a4430;border-radius:8px;padding:6px;cursor:pointer}
#start .card.on{border-color:#ffd27a;box-shadow:0 0 12px #ffd27a88}#start .card img{width:100%;height:170px;object-fit:cover;object-position:top;border-radius:5px}
#start .card b{font-size:17px}#start .small{font-size:12px;opacity:.85}#start .comp{display:flex;gap:10px;margin-top:8px}#start .comp .card{width:150px}#start .comp .card img{height:140px}
#start .stat{display:inline-block;margin:3px 10px 3px 0}#start .q{margin:3px 0}#start select{max-width:260px}#start .go{font-size:18px;padding:6px 26px;margin-top:10px;background:#c9a061;border:0;border-radius:6px}
#choice{position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:40;background:#2b2118;color:#f3e7cf;border:2px solid #ffd27a;border-radius:10px;padding:14px 20px;max-width:560px;font:15px/1.6 serif;box-shadow:0 6px 30px #000a}
#choice button{display:block;margin:6px 0;width:100%;text-align:left;font-size:15px}`;
// loop35：江湖規則單一來源（勾選 id、st 欄位、spec 鍵、預設、說明）；兩個分頁共用 ruleSpec，避免漏傳／重複
export const RULES = [
  ['draw', 'draw', 'draw', false, '人以群分：外向的人更愛交友、強者吸引人靠近'],
  ['comp', 'compr', 'comprehend', true, '領悟：苦練與觀摩切磋可自悟、偷師他派功夫'],
  ['mentor', 'mentor', 'mentor', true, '同修請教：一起練功互相砥礪、向強者請教、結成練功搭子'],
  ['steward', 'steward', 'steward', true, '執事自主：有人睡地鋪就擴寢舍，野豬常來就蓋護山哨'],
  ['lairpow', 'lairpow', 'lairpow', true, '寨強看戰力：山寨強弱跟門派戰力走，不隨家產變強'],
  ['lift', 'lift', 'lift', true, '心情自救：心情低落時自己去閒坐、聊天或歇息'],
  ['bt25', 'bt25', 'bt25', true, '突破優先：卡瓶頸時先打坐衝關（人多升首徒後也不會只顧練功）'],
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
  el?.remove(); el = document.createElement('div'); el.id = 'choice'; el.dataset.id = ch.id;
  el.innerHTML = `${ch.portrait ? `<img src="${ch.portrait}" style="float:left;width:72px;height:96px;object-fit:cover;border-radius:6px;margin:0 10px 6px 0;border:1px solid #b89" onerror="this.remove()">` : ''}<b>【抉擇】${ch.title}</b><p>${ch.text}</p>${ch.opts.map((o, i) => `<button data-pick="${i}">${o}</button>`).join('')}<div class="small">本心：${valLine(S.hero.values)}（違背主價值會添一層違心）</div>`;
  el.onclick = (e) => { const b = e.target.closest('[data-pick]'); if (!b) return; resolveChoice(S, ch.id, +b.dataset.pick); el.remove(); };
  document.body.appendChild(el); return true;
}
export function heroCard(S) {
  const H = S.hero; if (!H) return ''; const d = S.ds.find((x) => x.id === 'hero'), c = S.ds.find((x) => x.id === H.companion);
  return `<div style="display:flex;gap:8px;align-items:center"><img src="assets/portraits/${H.kind === 'template' ? H.id : 'guojing'}.png" style="width:54px;height:72px;object-fit:cover;border-radius:4px;${H.kind === 'template' ? '' : 'filter:grayscale(1)'}"><div><b>${d.name}</b>　${statLine(H.stats)}<br>本心：${valLine(d.values)}　違心 ${'●'.repeat(d.wexin || 0)}${'○'.repeat(3 - (d.wexin || 0))}<br>同門：${c ? c.name : '—'}${d.pairMul > 0 ? `（默契 +${Math.round(d.pairMul * 100)}%）` : ''}</div></div>`;
}
