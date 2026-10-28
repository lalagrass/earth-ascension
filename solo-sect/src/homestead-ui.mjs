import { ACTIONS, FACILITIES, PLACES, HOME, DAY, SAVE_KEY, createHomestead, startBlueprint, setOrder, tickHomestead, saveHomestead, loadHomestead } from './homestead.mjs';
const $ = (id) => document.getElementById(id);
const ctx = $('land').getContext('2d');
let s = null, speed = 1, last = performance.now(), acc = 0, painted = 0;
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const show = (msg) => { $('message').textContent = msg; };
const stored = () => { try { return localStorage.getItem(SAVE_KEY); } catch { return null; } };
function begin(state) { s = state; $('start').style.display = 'none'; last = performance.now(); render(); }
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
  if (hut.stage) { g.fillStyle = '#8e6847'; g.fillRect(372, 177, 142, 104); g.fillStyle = '#564531'; g.beginPath(); g.moveTo(357, 181); g.lineTo(444, 116); g.lineTo(529, 181); g.fill(); g.fillStyle = '#422f25'; g.fillRect(431, 225, 30, 56); }
  else if (hut.site) { g.strokeStyle = '#7e6c48'; g.lineWidth = 4; g.setLineDash([10, 7]); g.strokeRect(370, 172, 145, 105); g.setLineDash([]); g.fillStyle = '#a58253'; for (let i = 0; i < hut.site.delivered.wood; i++) g.fillRect(390, 260 - i * 7, 58, 6); }
  else { g.strokeStyle = '#95836a'; g.lineWidth = 2; g.setLineDash([7, 8]); g.strokeRect(370, 172, 145, 105); g.setLineDash([]); }
  const p = s.person; g.fillStyle = '#342c27'; g.beginPath(); g.ellipse(p.pos[0], p.pos[1] + 5, 16, 7, 0, 0, 7); g.fill(); g.fillStyle = '#365677'; g.fillRect(p.pos[0] - 10, p.pos[1] - 33, 20, 35); g.fillStyle = '#e2bb8f'; g.beginPath(); g.arc(p.pos[0], p.pos[1] - 41, 11, 0, 7); g.fill(); if (p.carry) { g.fillStyle = p.carry.kind === 'wood' ? '#7f5734' : '#a44c43'; g.fillRect(p.pos[0] + 12, p.pos[1] - 25, 16, 12); }
  g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#28362a'; for (const [text, point] of [['野果叢', PLACES.berries], ['林緣枯木', PLACES.wood], [hut.stage ? '簡陋木屋' : hut.site ? '木屋工地' : '住處空地', PLACES.hut]]) g.fillText(text, point[0], point[1] - 75);
  g.fillText(p.name, p.pos[0], p.pos[1] - 59);
}
function render() {
  if (!s) return;
  const p = s.person, site = s.fac.hut.site, task = p.task, stage = FACILITIES.hut.stages[s.fac.hut.stage];
  $('time').textContent = `第 ${s.day} 日 · ${Math.floor((s.t % DAY) / DAY * 24).toString().padStart(2, '0')}:00`;
  $('status').innerHTML = `<h2>${esc(p.name)} · ${p.personality === 'quiet' ? '喜靜' : p.personality === 'diligent' ? '勤勞' : '好交往'}</h2><div>飢餓 ${Math.round(p.hunger)} / 100</div><div class="meter"><span style="width:${p.hunger}%"></span></div><div>精力 ${Math.round(p.energy)} / 100</div><div class="meter energy"><span style="width:${p.energy}%"></span></div><div class="muted">正在${task ? ACTIONS[task.act]?.name || '送回物資' : '找下一件事'} · ${task?.phase || '空閒'}${p.carry ? ` · 手上${p.carry.kind === 'wood' ? '木' : '野果'} ${p.carry.amount}` : ''}</div><div class="muted">工作 ${p.work} · 閒暇 ${p.leisure}</div>`;
  $('orders').innerHTML = Object.entries(ACTIONS).map(([id, a]) => `<button data-act="${id}" class="${p.order === id ? 'active' : ''}">${a.name}</button>`).join('');
  for (const b of $('speed').querySelectorAll('button')) b.classList.toggle('active', +b.dataset.speed === speed);
  $('build').innerHTML = `<b>${stage.name}</b><div class="muted">${s.fac.hut.stage ? '屋內休息效率：每秒 +6 精力' : '席地休息效率：每秒 +3 精力'}</div>${site ? `<div>木料 ${site.delivered.wood}/${site.need.wood}，在途 ${site.reserved.wood}；施工 ${Math.floor(site.work)}/${site.workNeed}<div class="progress"><span style="width:${Math.min(100, site.work / site.workNeed * 100)}%"></span></div></div>` : s.fac.hut.stage ? '' : '<button data-build="hut">立簡陋木屋藍圖 · 木 5</button>'}`;
  $('stock').innerHTML = `<div class="statline"><span>野果</span><b>${s.stock.berries} / ${s.cap.berries}</b></div><div class="statline"><span>木料</span><b>${s.stock.wood} / ${s.cap.wood}</b></div><p class="muted">野外會再生；物資須搬回住處才入庫。</p>`;
  $('log').innerHTML = s.log.slice(0, 9).map((x) => `<li>第${x.day}日 · ${esc(x.msg)}</li>`).join(''); draw();
}
function loop(now) {
  if (s && speed) { acc += Math.min(0.1, (now - last) / 1000) * speed; let n = 0; while (acc >= .25 && n++ < 16) { tickHomestead(s); acc -= .25; } }
  if (s && now - painted > 250) { render(); painted = now; }
  last = now; requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
Object.defineProperty(window, '__homestead', { get: () => s });
