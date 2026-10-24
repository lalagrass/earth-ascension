import { capacity, canRecruit, recruit, recruitNeed, mapStage, setPost, phaseOf, setStyle, createState, tick, startBuild, startHunt, setOrder, save, load, facDef, facStage, relKey, relStage, speedOf } from './sim.mjs';
import { MAPS, POSTS, HABITAT, STYLES, NODES, EDGES, FACILITIES, ACTIVITIES, MOVES, MONSTERS } from './data.mjs';
const cv = document.getElementById('map'), g = cv.getContext('2d');
const IMG = {}; const names = ['ground', 'hall_s0', 'hall_s1', 'dorm_s0', 'dorm_s1', 'log', 'herb', 'pine', 'bamboo', 'boar', 'rat', 'hero', 'cousin', 'senior', 'master', 'bench', 'wood', 'vat', 'grass', 'woodpile', 'kitchen_s1', 'map_s0', 'map_s1', 'map_s2'];
await Promise.all(names.map((n) => new Promise((r) => { const i = new Image(); i.onload = r; i.onerror = r; i.src = `assets/${n}.${n === 'ground' || n.startsWith('map_') ? 'jpg' : 'png'}`; IMG[n] = i; })));
let S = createState(Date.now() % 100000 | 0), speed = 1;
window.__sect = { get S() { return S; }, set speed(v) { speed = v; } };
const ACT_ICON = { spar: '🤺', cook: '🍲', deliver: '📦', rest: '💤', eat: '🍚', farm: '🌱', forage: '🌿', chop: '🪓', train: '掌', learn: '📜', build: '🔨', chat: '💬', hunt: '⚔', strike: '⚔' };
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
      if (fs.site) { const s = fs.site; label(`工地 木${s.delivered}/${s.need.wood} 工${s.work.toFixed(0)}/${s.workNeed}s`, x, y + 46, '#a0461e'); }
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
    if (d.carry) sprite('wood', x + 10, y - 18, 0.6);
    label(`${d.name} ${ACT_ICON[d.anim || d.task?.act] || ''}`, x, y - (IMG[d.sprite].height * SC + 4), '#222');
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
  const ph = phaseOf(S); $('clock').textContent = `第 ${ph.day} 日・${ph.name}（${Math.floor(S.t % 600)}/600）・${speed}×`;
  $('res').innerHTML = `木 ${S.res.wood}/${S.cap.wood}　菜 ${S.res.veg}　飯 ${S.res.food}　藥 ${S.res.herb}<div>名聲 ${S.rep}・弟子 ${S.ds.length}/${capacity(S)} 床・地圖 ${mapStage(S)}</div><div class="k">菜畦：${S.plots.map((p) => ({ empty: '空', grow: '長', ripe: '熟' })[p.st]).join(' ')}</div>`;
  $('build').innerHTML = FACILITIES.filter((f) => f.stages.length > 1).map((f) => { const st = S.fac[f.id], nx = f.stages[st.stage + 1];
    return `<div>${f.name}：${f.stages[st.stage].name} ${nx ? `<button data-build="${f.id}" ${st.site || (nx.rep && S.rep < nx.rep) ? 'disabled' : ''}>${st.site ? '施工中' : `修成${nx.name}（木${nx.cost.wood}${nx.rep ? '・名聲' + nx.rep : ''}）`}</button>` : '✓'}</div>`; }).join('') + '';
  const eco = `山中：山鼠 ${S.eco.rat.n}・野豬 ${S.eco.boar.n}`;
  $('hunt').innerHTML = S.hunt ? `${eco}<div>進行中（${POSTS[S.hunt.post]}）第 ${S.hunt.wave + 1}/${S.hunt.waves} 波：擊退 ${S.hunt.kills}・溜走 ${S.hunt.escaped}</div>` :
    `${eco}<div>守點：<select id="post">${Object.entries(POSTS).map(([k, n]) => `<option value="${k}" ${S.post === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div>${S.ds.map((d) => `<label><input type="checkbox" class="hteam" value="${d.id}" ${(window.__team ||= new Set(['hero', 'senior'])).has(d.id) ? 'checked' : ''}>${d.name}</label>`).join(' ')}</div>
    <button id="hunt-go">上山狩獵（${3} 波）</button><div class="k">${S.lastReport || '尚無戰報'}</div>`;
  if (!S.hunt) { $('hunt-go').onclick = () => startHunt(S, [...window.__team]); $('post').onchange = (e) => setPost(S, e.target.value); document.querySelectorAll('.hteam').forEach((c) => (c.onchange = () => { c.checked ? window.__team.add(c.value) : window.__team.delete(c.value); })); }
  { const c = canRecruit(S); $('recruit').innerHTML = `<button id="rec-go" ${c.ok ? '' : 'disabled'}>招收弟子（名聲 ${recruitNeed(S)}、糧 3）</button> <span class="k">${c.ok ? '下一位：' + c.next.name : c.why}</span>`; $('rec-go').onclick = () => { recruit(S); panel(); }; }
  $('ds').innerHTML = S.ds.map((d) => `<div class="card"><b>${d.name}</b> <span class="k">${d.adult ? '' : '（少年）'}${d.task ? (ACTIVITIES[d.task.act]?.name || '狩獵') : '待命'}｜${d.reason}</span>
   <div class="k">精力 ${d.needs.energy | 0}</div>${bar(d.needs.energy, '#d9a441')}<div class="k">飽足 ${d.needs.hunger | 0}</div>${bar(d.needs.hunger, '#7aa35a')}<div class="k">交流 ${d.needs.social | 0}</div>${bar(d.needs.social, '#c77')}
   <div class="k">主修 ${STYLES[d.style]}・掌 ${d.skills.palm.toFixed(1)}・腿 ${d.skills.leg.toFixed(1)}・腳力 ${d.skills.agility.toFixed(1)}（${speedOf(d).toFixed(0)}px/s）・力氣 ${d.skills.strength.toFixed(1)}・農 ${d.skills.farming.toFixed(1)}・廚 ${d.skills.cooking.toFixed(1)}</div>
   <div>${d.moves.map((m) => `<span class="mv">${MOVES.find((x) => x.id === m).name}</span>`).join('')}${d.pendingMove ? `<span class="mv new">可學：${MOVES.find((x) => x.id === d.pendingMove).name}</span>` : ''}</div>
   <select data-style="${d.id}">${Object.entries(STYLES).map(([k, n]) => `<option value="${k}" ${d.style === k ? 'selected' : ''}>主修${n}</option>`).join('')}</select>
   <select data-ord="${d.id}">${ORD.map(([k, n]) => `<option value="${k}" ${(d.order || '') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`).join('');
  $('rel').innerHTML = Object.entries(S.rel).map(([k, v]) => { const [a, b] = k.split('|').map((id) => S.ds.find((d) => d.id === id).name); return `<div>${a}—${b}：${relStage(v)} ${v.toFixed(0)}${S.families.includes(k) ? ' 🏠' : ''}</div>`; }).join('');
  $('log').innerHTML = S.log.slice(0, 30).map((l) => `<li>[${l.t}s] ${l.msg}</li>`).join('');
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-build],[data-speed]'); if (!b) return; if (b.dataset.build) startBuild(S, b.dataset.build); if (b.dataset.speed) speed = +b.dataset.speed; panel(); });
document.addEventListener('change', (e) => { if (e.target.dataset.style) setStyle(S, e.target.dataset.style, e.target.value); if (e.target.dataset.ord) { setOrder(S, e.target.dataset.ord, e.target.value || null); panel(); } });
$('save').onclick = () => { localStorage.setItem('solo-sect-save', save(S)); alert('已存檔'); };
$('load').onclick = () => { const r = load(localStorage.getItem('solo-sect-save') || ''); if (r.ok) S = r.state; else alert(r.err); panel(); };
$('reset').onclick = () => { S = createState(Date.now() % 100000 | 0); panel(); };
let last = performance.now(), acc = 0;
function loop(now) { acc += Math.min(0.5, (now - last) / 1000) * speed; last = now; while (acc >= 0.25) { tick(S); acc -= 0.25; }
  draw(); if (now - lastPanel > 400 && !document.activeElement?.matches('select,input')) { panel(); lastPanel = now; } requestAnimationFrame(loop); }
panel(); requestAnimationFrame(loop);
