import { outers, skipsChores, emergency, quotaOf, setDuty, setPrio, canPromote, startTrial } from './sim.mjs';
import { CHORE_ACTS, CHORE_NAMES, QUOTA, PRIO, PROMOTE, RANK_NAMES } from './data.mjs';
import { isLabor, disciples, laborers, laborCap, canHire, hire, canInvite, invite, avgAff, togglePause, MATS, moodLabel, moodParts, seasonOf, aff, compat, defaultAnswers, personalityFrom, capacity, canRecruit, recruit, recruitNeed, mapStage, setPost, phaseOf, setStyle, createState, tick, startBuild, startHunt, setOrder, save, load, facDef, facStage, relKey, relStage, speedOf } from './sim.mjs';
import { ECON, ROOT, RES_NAMES, QUESTIONS, TRAITS, MAPS, POSTS, HABITAT, STYLES, NODES, EDGES, FACILITIES, ACTIVITIES, MOVES, MONSTERS } from './data.mjs';
const cv = document.getElementById('map'), g = cv.getContext('2d');
const IMG = {}; const names = ['ground', 'hall_s0', 'hall_s1', 'dorm_s0', 'dorm_s1', 'log', 'herb', 'pine', 'bamboo', 'boar', 'rat', 'hero', 'cousin', 'senior', 'master', 'bench', 'wood', 'vat', 'grass', 'woodpile', 'kitchen_s1', 'map_s0', 'map_s1', 'map_s2'];
await Promise.all(names.map((n) => new Promise((r) => { const i = new Image(); i.onload = r; i.onerror = r; i.src = `assets/${n}.${n === 'ground' || n.startsWith('map_') ? 'jpg' : 'png'}`; IMG[n] = i; })));
let S = createState(Date.now() % 100000 | 0), speed = 1;
window.__sect = { get S() { return S; }, set speed(v) { speed = v; }, freeze: false, panel: () => panel() };
const ACT_ICON = { quarry: '⛏', spar: '🤺', cook: '🍲', deliver: '📦', rest: '💤', eat: '🍚', farm: '🌱', forage: '🌿', chop: '🪓', train: '掌', learn: '📜', build: '🔨', chat: '💬', hunt: '⚔', strike: '⚔' };
function draw() {
  const ms = mapStage(S); g.drawImage(IMG[MAPS[ms]], 0, 0, 1600, 900);
  if (window.__debugRoads) { g.strokeStyle = 'rgba(200,60,40,.6)'; g.lineWidth = 3; for (const [a, b] of EDGES) { g.beginPath(); g.moveTo(...NODES[a]); g.lineTo(...NODES[b]); g.stroke(); } }
  const items = [];
  for (const f of FACILITIES) {
    const st = facStage(S, f.id), [x, y] = NODES[f.node], fs = S.fac[f.id];
    items.push({ y: y - 1, f: () => {
      if (f.id === 'yard') { g.fillStyle = 'rgba(180,150,100,.35)'; if (st.dummies) { g.beginPath(); g.ellipse(x, y, 45, 20, 0, 0, 7); g.fill(); }
        for (let k = 0; k < (st.dummies || 0); k++) { const dx = x - 30 + k * 26, dy = y + 4; g.fillStyle = '#6b4a2a'; g.fillRect(dx - 2, dy - 24, 5, 24); g.fillRect(dx - 8, dy - 19, 16, 3); g.fillRect(dx - 7, dy - 12, 14, 3); } }
      label(`${f.name}・${st.name}`, x, y + 22, '#3a2f24');
      if (fs.site) { const s = fs.site; label(`${s.paused ? '⏸暫停 ' : '工地 '}${MATS.filter((k) => s.need[k]).map((k) => `${RES_NAMES[k]}${s.delivered[k]}/${s.need[k]}`).join(' ')} 工${s.work.toFixed(0)}/${s.workNeed}s`, x, y + 46, '#a0461e');
        for (let k = 0; k < s.delivered.wood; k++) { g.fillStyle = '#8b5a2b'; g.fillRect(x - 46 + (k % 6) * 6, y + 52 - Math.floor(k / 6) * 4, 5, 3); }
        for (let k = 0; k < s.delivered.stone; k++) { g.fillStyle = '#8c8c8c'; g.beginPath(); g.arc(x + 16 + (k % 6) * 6, y + 54 - Math.floor(k / 6) * 4, 2.6, 0, 7); g.fill(); } }
      if (f.id === 'quarry') { g.fillStyle = '#9a9a92'; for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(x - 30 + k * 10, y + 4 - (k % 3) * 5, 8, 5, 0, 0, 7); g.fill(); } }
      if (f.id === 'shed' && fs.stage === 0) { g.strokeStyle = 'rgba(120,80,40,.6)'; g.setLineDash([4, 3]); g.strokeRect(x - 26, y - 20, 52, 26); g.setLineDash([]); }
    } });
  }
  items.push({ y: NODES.hall[1], f: () => sprite('master', NODES.hall[0] + 30, NODES.hall[1] - 6, SC) });
  for (const w of S.wild) items.push({ y: w.pos[1], f: () => { g.save(); g.globalAlpha = 0.85; g.translate(w.pos[0], w.pos[1]); g.scale(-(w.face || 1), 1); const i = IMG[MONSTERS[w.k].sprite]; g.drawImage(i, -i.width * SC / 2, -i.height * SC, i.width * SC, i.height * SC); g.restore(); } });
  for (const [k, n] of Object.entries(POSTS)) items.push({ y: NODES[k][1], f: () => { g.fillStyle = S.post === k ? '#c0392b' : 'rgba(120,80,40,.5)'; g.beginPath(); g.moveTo(NODES[k][0], NODES[k][1] - 40); g.lineTo(NODES[k][0] + 18, NODES[k][1] - 33); g.lineTo(NODES[k][0], NODES[k][1] - 26); g.fill(); g.fillRect(NODES[k][0] - 1, NODES[k][1] - 40, 2, 40); } });
  for (const m of S.mons) items.push({ y: m.pos[1], f: () => { sprite(MONSTERS[m.k].sprite, m.pos[0], m.pos[1], SC); if (!m.raid) hp(m.pos[0], m.pos[1] - 30, m.hp / m.max, '#a33'); else label('下山拱菜', m.pos[0], m.pos[1] - 40, '#a33'); } });
  for (const d of S.ds) items.push({ y: d.pos[1], f: () => {
    const bob = d.path.length ? Math.sin(S.t * 10) * 2 : 0, [x, y] = d.pos;
    g.save(); g.translate(x, y + bob); if (d.face < 0) g.scale(-1, 1); if (d.anim === 'strike') g.rotate(0.15);
    if (d.task?.phase === 'do' && d.anim === 'rest') g.rotate(-1.3);
    const im = IMG[d.sprite]; g.drawImage(im, -im.width * SC / 2, -im.height * SC, im.width * SC, im.height * SC); g.restore();
    if (d.carry?.stone) { g.fillStyle = '#8c8c8c'; g.beginPath(); g.arc(x + 10, y - 26, 6, 0, 7); g.fill(); } else if (d.carry) sprite('wood', x + 10, y - 18, 0.6);
    if (isLabor(d)) { g.fillStyle = '#2f6f9f'; g.fillRect(x - 9, y - IMG[d.sprite].height * SC + 4, 18, 4); }
    label(`${d.name}${isLabor(d) ? '（工）' : d.role === 'outer' ? '（外門）' : d.role === 'head' ? '（首徒）' : ''} ${d.task?.act === 'build' && d.task.phase !== 'do' ? '📦' : ACT_ICON[d.anim || d.task?.act] || ''}`, x, y - (IMG[d.sprite].height * SC + 4), '#222');
    if (S.hunt) hp(x, y - IMG[d.sprite].height * SC - 20, d.hp / 100, '#3a7');
  } });
  items.sort((a, b) => a.y - b.y).forEach((i) => i.f());
  // 菜畦
  S.plots.forEach((p, i) => { const x = NODES.veg[0] + 10 + i * 18, y = NODES.veg[1] + 30; g.fillStyle = p.st === 'empty' ? '#8a6e4b' : p.st === 'ripe' ? '#5f9a3a' : `rgba(110,150,70,${0.3 + 0.5 * p.g / 90})`; g.fillRect(x, y, 15, 8); });
  // 日夜
  const ph = phaseOf(S), dark = ph.id === 'night' ? 0.38 : ph.id === 'dusk' ? 0.15 : ph.id === 'dawn' ? 0.1 : 0;
  if (dark) { g.fillStyle = ph.id === 'dusk' ? `rgba(120,60,30,${dark})` : `rgba(20,30,70,${dark})`; g.fillRect(0, 0, 1600, 900); }
  for (const f of S.fx) {
    if (f.kind === 'move') { g.strokeStyle = f.color; g.lineWidth = 4; g.globalAlpha = f.ttl / 0.6; g.beginPath(); g.moveTo(f.from[0], f.from[1] - 25); g.lineTo(f.to[0], f.to[1] - 8); g.stroke(); g.beginPath(); g.arc(f.to[0], f.to[1] - 10, f.r, 0, 7); g.stroke(); label(f.name, f.from[0], f.from[1] - 60, f.color); g.globalAlpha = 1; }
    else { g.fillStyle = 'rgba(200,40,40,.6)'; g.beginPath(); g.arc(f.pos[0], f.pos[1] - 30, 10, 0, 7); g.fill(); }
  }
}
const SC = 0.55;
function sprite(n, x, y, k = 1) { const i = IMG[n]; if (i?.width) g.drawImage(i, x - i.width * k / 2, y - i.height * k, i.width * k, i.height * k); }
function label(t, x, y, c) { g.font = '13px sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(255,250,235,.85)'; g.strokeText(t, x, y); g.fillStyle = c; g.fillText(t, x, y); g.textAlign = 'left'; }
function hp(x, y, r, c) { g.fillStyle = '#0006'; g.fillRect(x - 20, y, 40, 5); g.fillStyle = c; g.fillRect(x - 20, y, 40 * Math.max(0, r), 5); }
const $ = (id) => document.getElementById(id);
const bar = (v, c) => `<div class="bar"><i style="width:${v}%;background:${c}"></i></div>`;
const ORD = [['', '自主'], ...['train', 'spar', 'chop', 'farm', 'cook', 'forage', 'build', 'rest', 'eat'].map((k) => [k, ACTIVITIES[k].name])];
let lastPanel = 0;
function panel() {
  const ph = phaseOf(S); const se = seasonOf(S); $('clock').textContent = `第 ${se.year} 年 ${se.name}・第 ${ph.day} 日・${ph.name}（${Math.floor(S.t % 600)}/600）・${speed}×`;
  $('res').innerHTML = `木 ${S.res.wood}/${S.cap.wood}　石 ${S.res.stone}/${S.cap.stone}　香火錢 ${S.res.coin}　菜 ${S.res.veg}　飯 ${S.res.food}　藥 ${S.res.herb}<div>名聲 ${S.rep}・弟子 ${disciples(S).length}/${capacity(S)} 床・雇工 ${laborers(S).length}/${laborCap(S)}・地圖 ${mapStage(S)}</div><div class="k">菜畦：${S.plots.map((p) => ({ empty: '空', grow: '長', ripe: '熟' })[p.st]).join(' ')}</div>`;
  $('build').innerHTML = FACILITIES.filter((f) => f.stages.length > 1).map((f) => { const st = S.fac[f.id], nx = f.stages[st.stage + 1];
    const cost = nx ? Object.entries(nx.cost).map(([k, v]) => `${RES_NAMES[k]}${v}`).join('・') : '';
    const bundle = st.site ? `<div class="k">收集包：${MATS.filter((k) => st.site.need[k]).map((k) => `${RES_NAMES[k]} ${st.site.delivered[k]}/${st.site.need[k]}${st.site.reserved[k] ? `（在途${st.site.reserved[k]}）` : ''}`).join('　')}｜工時 ${st.site.work.toFixed(0)}/${st.site.workNeed}s</div>${bar(100 * MATS.reduce((a, k) => a + st.site.delivered[k], 0) / Math.max(1, MATS.reduce((a, k) => a + st.site.need[k], 0)), '#a0461e')}` : '';
    return `<div>${f.name}：${f.stages[st.stage].name} ${nx ? (st.site ? `<button data-pause="${f.id}">${st.site.paused ? '復工' : '暫停'}</button>` : `<button data-build="${f.id}" ${(nx.rep && S.rep < nx.rep) || (nx.cost.coin || 0) > S.res.coin ? 'disabled' : ''}>藍圖：${nx.name}（${cost}${nx.rep ? '・名聲' + nx.rep : ''}）</button>`) : '✓'}${bundle}</div>`; }).join('');
  { const c = canHire(S);
    $('labor').innerHTML = `<button id="hire-go" ${c.ok ? '' : 'disabled'}>雇工（香火錢 ${ECON.hireCoin}、糧 ${ECON.hireFood}；日薪 ${ECON.wage}）</button> <span class="k">${c.ok ? `應徵：${c.next.name}` : c.why}</span>` +
      laborers(S).map((d) => { const iv = canInvite(S, d.id);
        return `<div class="card labor"><b>${d.name}</b> <span class="k">${d.task ? (d.task.act === 'build' && d.task.phase !== 'do' ? '搬料' : ACTIVITIES[d.task.act]?.name) : '待命'}｜${d.reason}${d.unpaid ? `｜欠薪 ${d.unpaid} 日` : ''}</span>
        <div class="k">性格：${d.personality.map((p) => d.known.includes(p) ? `<span title="${TRAITS[p].desc}">${TRAITS[p].name}</span>` : '？？').join('、')}｜心情 ${d.mood | 0}｜力氣 ${d.skills.strength.toFixed(0)}</div>
        <div class="k">根骨：${d.rootKnown ? `${'★'.repeat(d.root)}${'☆'.repeat(5 - d.root)} ${ROOT.names[d.root]}` : `？？（共事 ${Math.floor(d.cowork || 0)}/${ROOT.revealAt}）`}｜同門好感 ${avgAff(S, d).toFixed(0)}</div>
        <button data-invite="${d.id}" ${iv.ok ? '' : 'disabled'}>邀入外門</button> <span class="k">${iv.ok ? '可以邀請了！' : iv.why}</span></div>`; }).join('');
    $('hire-go').onclick = () => { hire(S); panel(); }; }
  { const os = outers(S), hero = S.ds.find((d) => d.id === 'hero'), em = emergency(S);
    $('ranks').innerHTML = `<div class="k">首徒：${hero?.role === 'head' ? `主角（練功 ×${QUOTA.headTrain}）` : `未立（需外門 ≥${QUOTA.outerMin} 人且日課完成率 ≥${QUOTA.headRate * 100}%；目前外門 ${os.length}、昨日完成率 ${S.choreRate == null ? '—' : Math.round(S.choreRate * 100) + '%'}）`}</div>
      <div class="k">內門：${S.ds.filter((d) => d.role === 'inner' || d.role === 'head').map((d) => d.name).join('、')}｜${em ? '<b style="color:#b33">危機：內門暫時回來幫忙雜務</b>' : os.length >= QUOTA.outerMin ? '內門免雜務、專心練功' : `外門未滿 ${QUOTA.outerMin} 人，內門仍分擔雜務`}</div>` +
      (os.length ? os.map((d) => { const pc = canPromote(S, d.id), q = quotaOf(d);
        return `<div class="card outer"><b>${d.name}</b>（外門） <span class="k">日課 ${d.chore || 0}/${q}${d.choreDebt ? `（含順延 ${d.choreDebt}）` : ''}・貢獻 ${d.contrib || 0}・根骨 ${d.rootKnown ? '★'.repeat(d.root) + ROOT.names[d.root] : '？？'}</span>${bar(Math.min(100, 100 * (d.chore || 0) / q), '#5a9')}
        <div class="k">職司：${CHORE_ACTS.map((a) => `<label><input type="checkbox" data-duty="${d.id}" value="${a}" ${d.duties.includes(a) ? 'checked' : ''}>${CHORE_NAMES[a]}</label>`).join(' ')}
        ｜優先 <select data-prio="${d.id}">${Object.entries(PRIO).map(([k, [, n]]) => `<option value="${k}" ${d.prio === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <button data-promote="${d.id}" ${pc.ok ? '' : 'disabled'}>切磋考核入內門</button> <span class="k">${pc.ok ? `主考：${pc.ex.name}・門檻 ${PROMOTE.pass}` : pc.why}${d.trialScore ? `｜上次 ${d.trialScore}` : ''}</span></div>`; }).join('') : '<div class="k">尚無外門弟子（招收或邀雇工入門）</div>');
  }
  { const L = S.ledger, P = S.ledgerPrev, row = (x) => Object.entries(x).filter(([, v]) => v).map(([k, v]) => `${RES_NAMES[k] || k}${v}`).join('・') || '—';
    $('ledger').innerHTML = `<div class="k">今日（第 ${L.day} 日）收：${row(L.in)}</div><div class="k">今日支：${row(L.out)}</div>${P ? `<div class="k">昨日收：${row(P.in)}｜支：${row(P.out)}</div>` : ''}<div class="k">明晨預計：香火 +${ECON.coinBase + Math.floor(S.rep / ECON.coinPerRep)}・工錢 −${laborers(S).length * ECON.wage}</div>`; }
  const eco = `山中：山鼠 ${S.eco.rat.n}・野豬 ${S.eco.boar.n}`;
  $('hunt').innerHTML = S.hunt ? `${eco}<div>進行中（${POSTS[S.hunt.post]}）第 ${S.hunt.wave + 1}/${S.hunt.waves} 波：擊退 ${S.hunt.kills}・溜走 ${S.hunt.escaped}</div>` :
    `${eco}<div>守點：<select id="post">${Object.entries(POSTS).map(([k, n]) => `<option value="${k}" ${S.post === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div>${disciples(S).map((d) => `<label><input type="checkbox" class="hteam" value="${d.id}" ${(window.__team ||= new Set(['hero', 'senior'])).has(d.id) ? 'checked' : ''}>${d.name}</label>`).join(' ')}</div>
    <button id="hunt-go">上山狩獵（${3} 波）</button><div class="k">${S.lastReport || '尚無戰報'}</div>`;
  if (!S.hunt) { $('hunt-go').onclick = () => startHunt(S, [...window.__team]); $('post').onchange = (e) => setPost(S, e.target.value); document.querySelectorAll('.hteam').forEach((c) => (c.onchange = () => { c.checked ? window.__team.add(c.value) : window.__team.delete(c.value); })); }
  { const c = canRecruit(S); let qa = '';
    if (c.ok) { const key = c.next.id; if (window.__ansFor !== key) { window.__ans = defaultAnswers(c.next); window.__ansFor = key; }
      const pr = personalityFrom(c.next, window.__ans);
      qa = `<div class="qa"><b>三問心印・${c.next.name}</b>${QUESTIONS.map((q, i) => `<div class="k">${q.q} <select data-q="${i}">${q.a.map(([t], j) => `<option value="${j}" ${window.__ans[i] === j ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`).join('')}<div class="k">將成為：${pr.known.map((t) => TRAITS[t].name).join('、')}${pr.personality.length > pr.known.length ? '＋一項天性（相處後揭露）' : ''}（不改就用預選）</div></div>`; }
    $('recruit').innerHTML = `${qa}<button id="rec-go" ${c.ok ? '' : 'disabled'}>招收弟子（名聲 ${recruitNeed(S)}、糧 3）</button> <span class="k">${c.ok ? '' : c.why}</span>`;
    $('rec-go').onclick = () => { recruit(S, window.__ans); panel(); }; }
  $('ds').innerHTML = disciples(S).map((d) => `<div class="card"><b>${d.name}</b> <span class="k">${d.adult ? '' : '（少年）'}（${RANK_NAMES[d.role] || '內門'}）${d.task ? (ACTIVITIES[d.task.act]?.name || '狩獵') : '待命'}｜${d.reason}</span>
   <div class="k">性格：${d.personality.map((p) => d.known.includes(p) ? `<span title="${TRAITS[p].desc}">${TRAITS[p].name}</span>` : '<span title="相處久了才看得出來">？？</span>').join('、')}｜心情 ${d.mood | 0}（${moodLabel(d.mood)}）</div>${bar(d.mood, '#6a8cc7')}<div class="k" title="心情目標的組成">${moodParts(d, S).slice(1).map(([t, v]) => [d.personality.some((p) => !d.known.includes(p) && TRAITS[p].name === t) ? '某種天性' : t, v]).map(([t, v]) => `${t}${v > 0 ? '+' : ''}${v}`).join('・') || '—'}</div>
   <details class="why"><summary>為什麼${d.task ? (ACTIVITIES[d.task.act]?.name || '狩獵') : '待命'}？</summary>${(d.why || []).map((w, i) => `<div class="k">${i + 1}. ${ACTIVITIES[w.act]?.name || w.act} <b>${w.score}</b> = 基礎${w.f.base.toFixed(0)}×作息${w.f.sched}×性格${w.f.trait.toFixed(2)}×心情${w.f.mood}＋雜訊${w.f.noise.toFixed(0)}｜${w.why}</div>`).join('') || '<div class="k">玩家指派或尚未決策</div>'}</details>
   <div class="k">精力 ${d.needs.energy | 0}</div>${bar(d.needs.energy, '#d9a441')}<div class="k">飽足 ${d.needs.hunger | 0}</div>${bar(d.needs.hunger, '#7aa35a')}<div class="k">交流 ${d.needs.social | 0}</div>${bar(d.needs.social, '#c77')}<div class="k">樂趣 ${(d.needs.fun ?? 0) | 0}</div>${bar(d.needs.fun ?? 0, '#a07ac7')}
   <div class="k">主修 ${STYLES[d.style]}・掌 ${d.skills.palm.toFixed(1)}・腿 ${d.skills.leg.toFixed(1)}・腳力 ${d.skills.agility.toFixed(1)}（${speedOf(d).toFixed(0)}px/s）・力氣 ${d.skills.strength.toFixed(1)}・農 ${d.skills.farming.toFixed(1)}・廚 ${d.skills.cooking.toFixed(1)}</div>
   <div>${d.moves.map((m) => `<span class="mv">${MOVES.find((x) => x.id === m).name}</span>`).join('')}${d.pendingMove ? `<span class="mv new">可學：${MOVES.find((x) => x.id === d.pendingMove).name}</span>` : ''}</div>
   <select data-style="${d.id}">${Object.entries(STYLES).map(([k, n]) => `<option value="${k}" ${d.style === k ? 'selected' : ''}>主修${n}</option>`).join('')}</select>
   <select data-ord="${d.id}">${ORD.map(([k, n]) => `<option value="${k}" ${(d.order || '') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`).join('');
  $('rel').innerHTML = Object.entries(S.rel).map(([k, v]) => { const [a, b] = k.split('|').map((id) => S.ds.find((d) => d.id === id).name); const [A, B] = k.split('|').map((id) => S.ds.find((d) => d.id === id)); return `<div>${a}—${b}：${relStage(v)} ${v.toFixed(0)}${S.families.includes(k) ? ' 🏠' : ''} <span class="k">（${a}→${aff(S, A, B).toFixed(0)}／${b}→${aff(S, B, A).toFixed(0)}・合拍 ${compat(A, B).toFixed(1)}/${compat(B, A).toFixed(1)}）</span></div>`; }).join('');
  $('log').innerHTML = S.log.slice(0, 30).map((l) => `<li>[${l.t}s] ${l.msg}</li>`).join('');
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-build],[data-speed],[data-pause],[data-invite],[data-promote]'); if (!b) return; if (b.dataset.promote) startTrial(S, b.dataset.promote); if (b.dataset.pause) togglePause(S, b.dataset.pause); if (b.dataset.invite) invite(S, b.dataset.invite); if (b.dataset.build) startBuild(S, b.dataset.build); if (b.dataset.speed) speed = +b.dataset.speed; panel(); });
document.addEventListener('change', (e) => { if (e.target.dataset.q) { window.__ans[+e.target.dataset.q] = +e.target.value; panel(); return; } if (e.target.dataset.duty) { setDuty(S, e.target.dataset.duty, e.target.value, e.target.checked); panel(); return; } if (e.target.dataset.prio) { setPrio(S, e.target.dataset.prio, e.target.value); panel(); return; } if (e.target.dataset.style) setStyle(S, e.target.dataset.style, e.target.value); if (e.target.dataset.ord) { setOrder(S, e.target.dataset.ord, e.target.value || null); panel(); } });
$('save').onclick = () => { localStorage.setItem('solo-sect-save', save(S)); alert('已存檔'); };
$('load').onclick = () => { const r = load(localStorage.getItem('solo-sect-save') || ''); if (r.ok) S = r.state; else alert(r.err); panel(); };
$('reset').onclick = () => { S = createState(Date.now() % 100000 | 0); panel(); };
let last = performance.now(), acc = 0;
function loop(now) { acc += Math.min(0.5, (now - last) / 1000) * speed; last = now; while (acc >= 0.25) { tick(S); acc -= 0.25; }
  draw(); if (now - lastPanel > 400 && !window.__sect.freeze && !document.activeElement?.matches('select,input')) { panel(); lastPanel = now; } requestAnimationFrame(loop); }
panel(); requestAnimationFrame(loop);
