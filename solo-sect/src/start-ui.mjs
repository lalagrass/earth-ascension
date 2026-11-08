// v0.96 新局：主角建立畫面（經典模板／自創）、同門選擇、抉擇卡
import { STATS, Q9, TRAITS, NEW_TRAITS } from './data.mjs';
import { budgetOf, spent, validStats, defaultStats, readHeart, VALUE_NAMES, resolveChoice } from './hero.mjs';
import { TYPES, typeLabel, mbtiPersonality, MBTI_Q, quizResult, AXES as MBTI_AXES } from './social.mjs';
import { mountChoiceButtons } from './choice-buttons.mjs';
import { xiaHints } from './wuxia.mjs';
/* loop68 */
/* loop72 */
const css = `#start{position:fixed;inset:0;background:rgba(30,22,14,.88);z-index:50;overflow:auto;color:#f3e7cf;font:14px/1.5 serif}
#start .box{max-width:1640px;margin:8px auto;padding:14px 20px;background:#e1cea6 url("assets/ui/kenney/panel_beige.png") center/100% 100%;color:#372b20;border:8px solid transparent;border-image:url("assets/ui/kenney/panel_beige.png") 16 fill / 8px / 0 stretch}
#start h1{margin:0 0 6px;font-size:24px}#start .tabs button{font-size:15px;margin-right:6px}#start .tabs .on{background:#78572e;color:#fff8e9}
#start .cards{display:flex;gap:10px;flex-wrap:wrap}#start .card{width:196px;background:#d7c295;color:#3d301f;border:10px solid transparent;border-image:url("assets/ui/kenney/panel_beige.png") 16 fill / 10px / 0 stretch;padding:6px;cursor:pointer}
#start .card.on{outline:3px solid #8c6831;box-shadow:0 0 12px #8c683177}#start .card img{width:100%;height:170px;object-fit:cover;object-position:top;border-radius:5px}
#start .card b{font-size:17px}#start .small{font-size:12px;opacity:1}#start .comp{display:flex;gap:10px;margin-top:8px}#start .comp .card{width:150px}#start .comp .card img{height:140px}
#start .stat{display:inline-block;margin:3px 10px 3px 0}#start .q{margin:3px 0}#start select{max-width:260px}#start .go{font-size:18px;padding:6px 26px;margin-top:10px;background:#c9a061;border:0;border-radius:6px}
#choice{position:fixed;left:calc((100vw - var(--pw, 410px)) / 2);top:18%;transform:translateX(-50%);width:max-content;max-width:min(560px, calc(100vw - var(--pw, 410px) - 32px));box-sizing:border-box;z-index:40;background:#2b2118;color:#f3e7cf;border:2px solid #ffd27a;border-radius:10px;padding:14px 20px;font:15px/1.6 serif;box-shadow:0 6px 30px #000a}
#choice button{display:block;margin:6px 0;width:100%;text-align:left;font-size:15px}`;
// loop143（v2.2）：33 個工程勾選框轉正為底層規則（sim.mjs BASELINE_V22，新局一律開）；開局「江湖規則」只留 3 個宏觀選項：
// 執事自動營建（整併 steward＋stewkit＋stewyard）、重大抉擇每次詢問我（st-ask）、名俠池畫風（st-xia）。
export const RULES = [
  ['steward', 'steward', 'steward', true, '執事自動營建：有人睡地鋪或待來者缺床就擴寢舍、野豬常來就立護山哨、存飯不夠就立膳房、外功場空著就立木樁場（取消則全由你下令）'],
];
const STEWARD_KEYS = ['steward', 'stewkit', 'stewyard'];
export const ruleOn = (st, k, on) => (on ? st[k] !== false : !!st[k]);
export const ruleSpec = (st) => ({ v22: true, ...Object.fromEntries(STEWARD_KEYS.map((k) => [k, ruleOn(st, 'steward', true)])) });
export function buildSpec(st) {
  const R = ruleSpec(st);
  return { kind: 'custom', name: st.name || '無名', stats: st.stats, answers: st.ans,
    ...(st.mbti ? { mbti: st.mbti } : {}), hermitage: true, opening: st.hermitOpening,
    starterArt: ['luohanHands', 'none'].includes(st.starterArt) ? st.starterArt : 'chunyangFist', // R10：白身沒有入門拳譜
    askMajor: st.ask, ...R };
}
const st = { name: '無名', stats: defaultStats(), ans: Array(9).fill(0), ask: true, mbti: '', mbtiMode: 'none', mq: Array(MBTI_Q.length).fill(null), hermitOpening: 'xiaolongnv', starterArt: 'chunyangFist' };
const tn = (t) => TRAITS[t]?.name || NEW_TRAITS[t]?.name || t;
const STAT_DESC = { wu: '領悟與讀譜的能力', gen: '練武的根基與耐力', li: '出手與搬運的力氣', shen: '移步和避開來招的速度', ding: '面對壓力維持鎮定', fu: '奇遇與偶然所得' };
const statLine = (s) => STATS.map(([k, n]) => `<span title="${STAT_DESC[k]}">${n}${s?.[k] ?? '—'}</span>`).join(' ');
const valLine = (v) => Object.entries(v || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, x]) => `${VALUE_NAMES[k]}${x > 0 ? '+' : ''}${x}`).join('・');
function render(el) {
  const bonus = 0, left = budgetOf(st.stats, bonus) - spent(st.stats), r = readHeart(st.ans);
  let h = `<div class="box"><h1>山門紀・終南荒山隱居</h1><p>在終南茅廬做活、練功；心法和輕功須讀分卷或向會的人學。可與另一人同住，也可獨自上山；立匾後才啟用門派制度。</p>`;
  h += `<div class="q">名字 <input id="st-name" value="${st.name}" maxlength="6"></div><div class="q">開局人物 <select id="st-hermit-opening"><option value="xiaolongnv" ${st.hermitOpening === 'xiaolongnv' ? 'selected' : ''}>與小龍女同住</option><option value="huangrong" ${st.hermitOpening === 'huangrong' ? 'selected' : ''}>與黃蓉同住</option><option value="solo" ${st.hermitOpening === 'solo' ? 'selected' : ''}>獨自上山</option></select></div><div class="q">入門拳譜 <select id="st-starter-art"><option value="chunyangFist" ${st.starterArt === 'chunyangFist' ? 'selected' : ''}>全真・純陽拳</option><option value="luohanHands" ${st.starterArt === 'luohanHands' ? 'selected' : ''}>少林・羅漢拳</option><option value="none" ${st.starterArt === 'none' ? 'selected' : ''}>白身・沒有拳譜，找師父、找譜</option></select></div>`;
  h += `<div style="margin-top:8px">屬性剩餘點數 <b>${left}</b>／${budgetOf(st.stats, bonus)}${st.stats.wu === 1 ? '（悟性 1：退 1 點，得「笨功夫」憨厚）' : ''}${bonus ? `　宿慧 +${bonus}` : ''}<div>${STATS.map(([k, n]) => `<span class="stat" title="${STAT_DESC[k]}">${n} <button data-st="${k}|-1">−</button> <b>${st.stats[k]}</b> <button data-st="${k}|1">＋</button></span>`).join('')}</div>`;
  h += `<h3>九問問心</h3>${Q9.map((q, i) => `<div class="q">${i + 1}. ${q.q}：<select data-q9="${i}">${q.a.map((a, j) => `<option value="${j}" ${st.ans[i] === j ? 'selected' : ''}>${a[0]}</option>`).join('')}</select></div>`).join('')}`;
  h += mbtiBlock(st);
  h += `<div>→ 主價值 <b>${VALUE_NAMES[r.main]}</b>・副 <b>${VALUE_NAMES[r.sub]}</b>　特質 <b>${(st.mbti ? mbtiPersonality(st.mbti, st.stats.wu) : r.visible).map(tn).join('、')}</b>＋一個暗特質</div></div>`;
  h += `<fieldset class="rules"><legend>江湖規則</legend>${RULES.map(([id, k, , on, label]) => `<div><label><input type="checkbox" id="st-${id}" ${ruleOn(st, k, on) ? 'checked' : ''}> ${label}</label></div>`).join('')}<div><label><input type="checkbox" id="st-ask" ${st.ask ? 'checked' : ''}> 重大抉擇每次詢問我</label></div></fieldset>`;
  h += `<button class="go" id="st-go" ${validStats(st.stats, bonus) ? '' : 'disabled'}>開始隱居</button></div>`;
  el.innerHTML = h;
  mountChoiceButtons(el);
}
export function mbtiBlock(st) {
  const M = st.mbtiMode || 'none', tn2 = (x) => TRAITS[x]?.name || NEW_TRAITS[x]?.name || x;
  let h = `<h3>16 型人格（選用）</h3><div class="q k">${MBTI_AXES.map(([a, b, x, y]) => `${a}/${b}：${x}／${y}`).join('　')}</div><div class="q">${[['none', '不選（特質照九問）'], ['quiz', '答八題'], ['pick', '直接選型']].map(([k, n]) => `<label><input type="radio" name="st-mm" data-mm="${k}" ${M === k ? 'checked' : ''}> ${n}</label>`).join('　')}</div>`;
  if (M === 'quiz') h += MBTI_Q.map((q, i) => `<div class="q">${i + 1}. ${q.q} <select data-mq="${i}"><option value="" ${st.mq[i] == null ? 'selected' : ''}>—</option>${q.a.map(([t], j) => `<option value="${j}" ${st.mq[i] === j ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`).join('') + (st.mbti ? '' : `<div class="k">還有 ${st.mq.filter((x) => x == null).length} 題沒答</div>`);
  if (M === 'pick') h += `<div class="q"><select id="st-mbti"><option value="">（請選）</option>${Object.keys(TYPES).map((k) => `<option value="${k}" ${st.mbti === k ? 'selected' : ''}>${typeLabel(k)}</option>`).join('')}</select></div>`;
  if (st.mbti) h += `<div class="q">→ ${typeLabel(st.mbti)}　特質 <b>${mbtiPersonality(st.mbti, st.stats.wu).map(tn2).join('、')}</b>（價值觀與暗特質仍看九問）</div>`;
  return h;
}
export function openStart(onStart) {
  if (!document.getElementById('st-css')) { const s = document.createElement('style'); s.id = 'st-css'; s.textContent = css; document.head.appendChild(s); }
  const el = document.createElement('div'); el.id = 'start'; document.body.appendChild(el); render(el);
  el.addEventListener('click', (e) => { const t = e.target.closest('[data-st],#st-go,#st-ask'); if (!t) return;
    if (t.dataset.st) { const [k, dv] = t.dataset.st.split('|'); const v = st.stats[k] + +dv; if (v >= 1 && v <= 5) { const n = { ...st.stats, [k]: v }; if (spent(n) <= budgetOf(n) || +dv < 0) st.stats = n; } }
    if (t.id === 'st-ask') st.ask = t.checked;
    if (t.id === 'st-go') { const spec = buildSpec(st); el.remove(); onStart(spec); return; }
    render(el); });
  el.addEventListener('change', (e) => { { const r = RULES.find(([id]) => e.target.id === `st-${id}`); if (r) st[r[1]] = e.target.checked; } if (e.target.dataset.q9 !== undefined) { st.ans[+e.target.dataset.q9] = +e.target.value; render(el); } if (e.target.id === 'st-name') st.name = e.target.value || '無名'; if (e.target.id === 'st-hermit-opening') st.hermitOpening = e.target.value; if (e.target.id === 'st-starter-art') st.starterArt = e.target.value; if (e.target.id === 'st-xia') st.xia = e.target.value; if (e.target.dataset.mm) { st.mbtiMode = e.target.dataset.mm; st.mbti = st.mbtiMode === 'quiz' ? quizResult(st.mq) || '' : st.mbtiMode === 'pick' ? st.mbti : ''; render(el); } if (e.target.dataset.mq !== undefined) { st.mq[+e.target.dataset.mq] = e.target.value === '' ? null : +e.target.value; st.mbti = quizResult(st.mq) || ''; render(el); } if (e.target.id === 'st-mbti') { st.mbti = e.target.value; render(el); } });
}
export function choiceUI(S) {
  let el = document.getElementById('choice'); const ch = (S.hero?.askMajor || S.choices?.[0]?.forcePrompt) && S.choices?.[0];
  if (!ch) { el?.remove(); return false; }
  if (el?.dataset.id === ch.id) return true;
  el?.remove(); el = document.createElement('div'); el.id = 'choice'; el.dataset.id = ch.id; const hints = xiaHints(ch); /* loop68：奇遇卡後果說明（隨江湖面板開關） */
  el.innerHTML = `${ch.portrait ? `<img src="${ch.portrait}" style="float:left;width:72px;height:96px;object-fit:cover;border-radius:6px;margin:0 10px 6px 0;border:1px solid #b89" onerror="this.remove()">` : ''}<b>【抉擇】${ch.title}</b><p>${ch.text}</p>${ch.sect === 'hermitageFounding' ? `<label>牌匾可自訂：<input data-found-plaque placeholder="留空用道統預設"></label>${ch.doctrines?.includes('orthodox') ? '<label>正宗立匾時的主脈：<select data-found-banner><option value="hero">先學一脈</option><option value="secondary">另一路</option></select></label>' : ''}` : ''}${ch.opts.map((o, i) => `<button data-pick="${i}">${o}</button>${hints?.[i] ? `<div class="small" data-hint="${i}">→ ${hints[i]}</div>` : ''}`).join('')}<div class="small">本心：${valLine(S.hero.values)}（違背主價值會添一層違心）</div>`;
  el.onclick = (e) => { const b = e.target.closest('[data-pick]'); if (!b) return; if (ch.sect === 'hermitageFounding') ch.foundingOptions = { plaque: el.querySelector('[data-found-plaque]')?.value || '', banner: el.querySelector('[data-found-banner]')?.value || 'hero' }; resolveChoice(S, ch.id, +b.dataset.pick); el.remove(); };
  document.body.appendChild(el); return true;
}
export function heroCard(S) {
  const H = S.hero; if (!H) return ''; const d = S.ds.find((x) => x.id === 'hero'), c = S.ds.filter((x) => x !== d).sort((a, b) => (S.aff?.[`hero>${b.id}`] || 0) - (S.aff?.[`hero>${a.id}`] || 0))[0];
  return `<div style="display:flex;gap:8px;align-items:center"><img src="assets/portraits/guojing.png" style="width:54px;height:72px;object-fit:cover;border-radius:4px;filter:grayscale(1)"><div><b>${d.name}</b>　${statLine(H.stats)}<br>本心：${valLine(d.values)}　違心 ${'●'.repeat(d.wexin || 0)}${'○'.repeat(3 - (d.wexin || 0))}<br>同門：${c ? c.name : '—'}${d.pairMul > 0 ? `（默契 +${Math.round(d.pairMul * 100)}%）` : ''}</div></div>`;
}
