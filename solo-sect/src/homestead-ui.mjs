import { ACTIONS, FACILITIES, PLACES, HOME, DAY, SAVE_KEY, offers, createHomestead, startBlueprint, setOrder, tickHomestead, saveHomestead, loadHomestead } from './homestead.mjs';
const $ = (id) => document.getElementById(id);
const ctx = $('land').getContext('2d');
let s = null, speed = 1, last = performance.now(), acc = 0, painted = 0;
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const show = (msg) => { $('message').textContent = msg; };
const stored = () => { try { return localStorage.getItem(SAVE_KEY); } catch { return null; } };
function begin(state) { s = state; speed = 1; acc = 0; $('start').style.display = 'none'; last = performance.now(); render(); }
$('resume').disabled = !stored();
$('begin').onclick = () => begin(createHomestead({ name: $('name').value, personality: $('personality').value }));
$('resume').onclick = () => { const r = loadHomestead(stored()); if (r.ok) begin(r.state); else show(r.error); };
$('new').onclick = () => { speed = 0; $('start').style.display = 'grid'; $('resume').disabled = !stored(); };
$('save').onclick = () => { if (!s) return; try { localStorage.setItem(SAVE_KEY, saveHomestead(s)); show('荒居已存檔。'); } catch { show('無法寫入本機存檔。'); } };
$('load').onclick = () => { const r = loadHomestead(stored()); if (r.ok) { s = r.state; show('荒居讀檔完成。'); render(); } else show(r.error); };
$('clear').onclick = () => { setOrder(s, null); render(); };
$('speed').onclick = (e) => { const b = e.target.closest('[data-speed]'); if (b) { speed = Number(b.dataset.speed); render(); } };
$('orders').onclick = (e) => { const b = e.target.closest('[data-act]'); if (b) { setOrder(s, b.dataset.act); render(); } };
$('build').onclick = (e) => { const b = e.target.closest('[data-build]'); if (b) { if (startBlueprint(s, b.dataset.build)) show('藍圖已立，主角會搬料施工。'); render(); } };

function draw() {
  if (!s) return;
  const g = ctx, w = 900, h = 560;
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#d5e4ce'); sky.addColorStop(1, '#9db47f'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#8d9f72'; for (let i = 0; i < 26; i++) { const x = 20 + i * 37, y = 48 + ((i * 71) % 460); g.beginPath(); g.ellipse(x, y, 21, 9, (i % 3) * .6, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = '#c8b98a'; g.lineWidth = 38; g.lineCap = 'round'; g.beginPath(); g.moveTo(...PLACES.berries); g.quadraticCurveTo(430, 440, ...HOME); g.quadraticCurveTo(620, 420, ...PLACES.wood); g.stroke();
  g.fillStyle = '#786744'; g.beginPath(); g.ellipse(...HOME, 75, 45, 0, 0, Math.PI * 2); g.fill();
  // 野果、樹木、固定住處地塊。
  for (let i = 0; i < 5; i++) { const x = 105 + i * 24, y = 316 + (i % 2) * 35; g.fillStyle = '#456b40'; g.beginPath(); g.arc(x, y, 23, 0, 7); g.fill(); g.fillStyle = '#b24f45'; for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(x - 11 + j * 11, y - 5 + (j % 2) * 9, 4, 0, 7); g.fill(); } }
  for (let i = 0; i < 5; i++) { const x = 670 + i * 30, y = 210 + (i % 2) * 65; g.fillStyle = '#6b4c35'; g.fillRect(x - 6, y, 12, 68); g.fillStyle = '#3f6641'; g.beginPath(); g.arc(x, y - 8, 31, 0, 7); g.fill(); }
  const hut = s.fac.hut;
  if (hut.stage) { g.fillStyle = hut.stage === 2 ? '#ab825b' : '#8e6847'; g.fillRect(372, 177, 142, 104); g.fillStyle = hut.stage === 2 ? '#685240' : '#564531'; g.beginPath(); g.moveTo(357, 181); g.lineTo(444, 116); g.lineTo(529, 181); g.fill(); g.fillStyle = '#422f25'; g.fillRect(431, 225, 30, 56); if (hut.stage === 2) { g.fillStyle = '#ebd5a3'; g.fillRect(389, 205, 22, 23); g.fillRect(480, 205, 22, 23); } }
  else if (hut.site) { g.strokeStyle = '#7e6c48'; g.lineWidth = 4; g.setLineDash([10, 7]); g.strokeRect(370, 172, 145, 105); g.setLineDash([]); g.fillStyle = '#a58253'; for (let i = 0; i < hut.site.delivered.wood; i++) g.fillRect(390, 260 - i * 7, 58, 6); }
  else { g.strokeStyle = '#95836a'; g.lineWidth = 2; g.setLineDash([7, 8]); g.strokeRect(370, 172, 145, 105); g.setLineDash([]); }
  // H2：菜園、露天灶、儲物棚各佔一個固定地塊。
  const garden = s.fac.garden, kitchen = s.fac.kitchen, store = s.fac.store;
  g.fillStyle = '#75593e'; g.fillRect(210, 127, 120, 78);
  if (garden.stage) { for (let i = 0; i < 4; i++) { g.fillStyle = '#9d7a4a'; g.fillRect(218, 136 + i * 17, 102, 9); if (s.plot.state !== 'empty') { g.fillStyle = s.plot.state === 'ripe' ? '#5b934d' : '#86a765'; for (let j = 0; j < 5; j++) g.fillRect(224 + j * 19, 131 + i * 17, 9, 9); } } }
  if (garden.site) { g.strokeStyle = '#f5e5b0'; g.lineWidth = 3; g.strokeRect(210, 127, 120, 78); }
  g.fillStyle = '#5f5547'; g.beginPath(); g.arc(...PLACES.kitchen, 31, 0, 7); g.fill();
  if (kitchen.stage) { g.fillStyle = '#d47b37'; g.beginPath(); g.moveTo(590, 356); g.lineTo(603, 324); g.lineTo(616, 356); g.fill(); g.fillStyle = '#efbb5f'; g.beginPath(); g.moveTo(601, 356); g.lineTo(607, 340); g.lineTo(612, 356); g.fill(); }
  if (store.stage) { g.fillStyle = '#776149'; g.fillRect(505, 437, 99, 60); g.fillStyle = '#4c3d32'; g.beginPath(); g.moveTo(493, 437); g.lineTo(555, 410); g.lineTo(617, 437); g.fill(); }
  else { g.fillStyle = '#aa8352'; for (let i = 0; i < Math.min(4, s.stock.wood); i++) g.fillRect(525, 478 - i * 7, 62, 6); }
  for (const id of ['kitchen', 'store']) if (s.fac[id].site) { g.strokeStyle = '#f5e5b0'; g.lineWidth = 3; g.strokeRect(PLACES[id][0] - 43, PLACES[id][1] - 34, 86, 68); }
  const p = s.person; g.fillStyle = '#342c27'; g.beginPath(); g.ellipse(p.pos[0], p.pos[1] + 5, 16, 7, 0, 0, 7); g.fill(); g.fillStyle = '#365677'; g.fillRect(p.pos[0] - 10, p.pos[1] - 33, 20, 35); g.fillStyle = '#e2bb8f'; g.beginPath(); g.arc(p.pos[0], p.pos[1] - 41, 11, 0, 7); g.fill(); if (p.carry) { g.fillStyle = p.carry.kind === 'wood' ? '#7f5734' : '#a44c43'; g.fillRect(p.pos[0] + 12, p.pos[1] - 25, 16, 12); }
  g.font = 'bold 17px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#28362a'; for (const [text, point, lift] of [['野果叢', PLACES.berries, 56], ['林緣枯木', PLACES.wood, 95], [FACILITIES.hut.stages[hut.stage].name, PLACES.hut, 132], [FACILITIES.garden.stages[garden.stage].name, PLACES.garden, 77], [FACILITIES.kitchen.stages[kitchen.stage].name, PLACES.kitchen, 73], [FACILITIES.store.stages[store.stage].name, PLACES.store, 101]]) g.fillText(text, point[0], point[1] - lift);
  g.fillText(p.name, p.pos[0], p.pos[1] - 59);
}
function render() {
  if (!s) return;
  const p = s.person, task = p.task;
  $('time').textContent = `第 ${s.day} 日 · ${Math.floor((s.t % DAY) / DAY * 24).toString().padStart(2, '0')}:00`;
  $('status').innerHTML = `<h2>${esc(p.name)} · ${p.personality === 'quiet' ? '喜靜' : p.personality === 'diligent' ? '勤勞' : '好交往'}</h2><div>飢餓 ${Math.round(p.hunger)} / 100</div><div class="meter"><span style="width:${p.hunger}%"></span></div><div>精力 ${Math.round(p.energy)} / 100</div><div class="meter energy"><span style="width:${p.energy}%"></span></div><div class="muted">正在${task ? ACTIONS[task.act]?.name || '送回物資' : '找下一件事'} · ${task?.phase || '空閒'}${p.carry ? ` · 手上${{ wood: '木', berries: '野果', veg: '菜' }[p.carry.kind]} ${p.carry.amount}` : ''}</div><div class="muted">工作 ${Math.floor(p.work)} · 閒暇 ${p.leisure}</div>`;
  $('orders').innerHTML = Object.entries(ACTIONS).map(([id, a]) => { const locked = id === 'farm' ? !offers(s, 'garden', 'farm') : id === 'cook' ? !offers(s, 'kitchen', 'cook') : id === 'build' ? !Object.values(s.fac).some((x) => x.site) : false; return `<button data-act="${id}" class="${p.order === id ? 'active' : ''}" ${locked ? 'disabled' : ''}>${a.name}</button>`; }).join('');
  for (const b of $('speed').querySelectorAll('button')) b.classList.toggle('active', +b.dataset.speed === speed);
  $('build').innerHTML = ['hut', 'garden', 'kitchen', 'store'].map((id) => { const f = FACILITIES[id], st = s.fac[id], site = st.site, stage = f.stages[st.stage], next = f.stages[st.stage + 1]; return `<div class="facility"><b>${f.label}：${stage.name}</b>${id === 'hut' ? `<div class="muted">休息每秒 +${stage.rest} 精力</div>` : ''}${site ? `<div>木料 ${site.delivered.wood}/${site.need.wood}，在途 ${site.reserved.wood}；施工 ${Math.floor(site.work)}/${site.workNeed}<div class="progress"><span style="width:${Math.min(100, site.work / site.workNeed * 100)}%"></span></div></div>` : next ? `<div><button data-build="${id}" ${id !== 'hut' && s.fac.hut.stage === 0 ? 'disabled title="先蓋簡陋木屋"' : ''}>建 ${next.name} · 木 ${next.cost.wood}</button></div>` : ''}</div>`; }).join('');
  $('stock').innerHTML = [['berries', '野果'], ['wood', '木料'], ['seeds', '種子'], ['veg', '青菜'], ['meal', '熱飯']].map(([k, n]) => `<div class="statline"><span>${n}</span><b>${s.stock[k]} / ${s.cap[k]}</b></div>`).join('') + `<p class="muted">${s.fac.garden.stage ? `菜園：${{ empty: '待播種', growing: `生長中 ${Math.floor(s.plot.growth)}/34`, ripe: '可收成' }[s.plot.state]}` : '建好菜園才可播種'}。野外與田裡收穫須搬回住處。</p>`;
  $('log').innerHTML = s.log.slice(0, 9).map((x) => `<li>第${x.day}日 · ${esc(x.msg)}</li>`).join(''); draw();
}
function loop(now) {
  if (s && speed) { acc += Math.min(0.1, (now - last) / 1000) * speed; let n = 0; while (acc >= .25 && n++ < 16) { tickHomestead(s); acc -= .25; } }
  if (s && now - painted > 250) { render(); painted = now; }
  last = now; requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
Object.defineProperty(window, '__homestead', { get: () => s });
