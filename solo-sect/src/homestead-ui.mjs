import { ACTIONS, FACILITIES, PLACES, HOME, DAY, SAVE_KEY, offers, blockReason, visitorHere, createHomestead, startBlueprint, setOrder, setHelperOrder, inviteHelper, acceptApprentice, askHelperLeave, tickHomestead, saveHomestead, loadHomestead } from './homestead.mjs';
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
$('community').onclick = (e) => { const b = e.target.closest('[data-social]'); if (!b) return; const action = { invite: inviteHelper, apprentice: acceptApprentice, leave: askHelperLeave }[b.dataset.social]; if (action?.(s)) show('已記入荒居紀事。'); render(); };
$('helper-orders').onclick = (e) => { const b = e.target.closest('[data-helper]'); if (b) { setHelperOrder(s, b.dataset.helper === 'auto' ? null : b.dataset.helper); render(); } };

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
  g.fillStyle = '#4e754e'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(110 + i * 17, 175 + (i % 2) * 15, 8, 0, 7); g.fill(); }
  const hut = s.fac.hut;
  if (hut.stage) { g.fillStyle = hut.stage === 2 ? '#ab825b' : '#8e6847'; g.fillRect(372, 177, 142, 104); g.fillStyle = hut.stage === 2 ? '#685240' : '#564531'; g.beginPath(); g.moveTo(357, 181); g.lineTo(444, 116); g.lineTo(529, 181); g.fill(); g.fillStyle = '#422f25'; g.fillRect(431, 225, 30, 56); if (hut.stage === 2) { g.fillStyle = '#ebd5a3'; g.fillRect(389, 205, 22, 23); g.fillRect(480, 205, 22, 23); } }
  else if (hut.site) { g.strokeStyle = '#7e6c48'; g.lineWidth = 4; g.setLineDash([10, 7]); g.strokeRect(370, 172, 145, 105); g.setLineDash([]); g.fillStyle = '#a58253'; for (let i = 0; i < hut.site.delivered.wood; i++) g.fillRect(390, 260 - i * 7, 58, 6); }
  else { g.strokeStyle = '#95836a'; g.lineWidth = 2; g.setLineDash([7, 8]); g.strokeRect(370, 172, 145, 105); g.setLineDash([]); }
  // H2：菜園、露天灶、儲物棚各佔一個固定地塊。
  const garden = s.fac.garden, kitchen = s.fac.kitchen, store = s.fac.store;
  g.fillStyle = '#75593e'; g.fillRect(210, 127, 120, 78);
  if (garden.stage) { for (let i = 0; i < 4; i++) { g.fillStyle = '#9d7a4a'; g.fillRect(218, 136 + i * 17, 102, 9); if (s.plot.state !== 'empty') { g.fillStyle = s.plot.state === 'ripe' ? '#5b934d' : '#86a765'; for (let j = 0; j < 5; j++) g.fillRect(224 + j * 19, 131 + i * 17, 9, 9); } } }
  if (garden.site) { g.strokeStyle = '#f5e5b0'; g.lineWidth = 3; g.strokeRect(210, 127, 120, 78); }
  const herbGarden = s.fac.herbGarden;
  g.fillStyle = '#76634b'; g.fillRect(80, 58, 110, 66);
  if (herbGarden.stage) { for (let i = 0; i < 3; i++) { g.fillStyle = '#9c7e58'; g.fillRect(88, 67 + i * 19, 94, 7); if (s.herbPlot.state !== 'empty') { g.fillStyle = s.herbPlot.state === 'ripe' ? '#5a8b60' : '#82a883'; for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(96 + j * 19, 65 + i * 19, s.herbPlot.state === 'ripe' ? 6 : 4, 0, 7); g.fill(); } } } }
  if (herbGarden.site) { g.strokeStyle = '#f5e5b0'; g.lineWidth = 3; g.strokeRect(80, 58, 110, 66); }
  g.fillStyle = '#5f5547'; g.beginPath(); g.arc(...PLACES.kitchen, 31, 0, 7); g.fill();
  if (kitchen.stage) { g.fillStyle = '#d47b37'; g.beginPath(); g.moveTo(590, 356); g.lineTo(603, 324); g.lineTo(616, 356); g.fill(); g.fillStyle = '#efbb5f'; g.beginPath(); g.moveTo(601, 356); g.lineTo(607, 340); g.lineTo(612, 356); g.fill(); }
  if (store.stage) { g.fillStyle = '#776149'; g.fillRect(505, 437, 99, 60); g.fillStyle = '#4c3d32'; g.beginPath(); g.moveTo(493, 437); g.lineTo(555, 410); g.lineTo(617, 437); g.fill(); }
  else { g.fillStyle = '#aa8352'; for (let i = 0; i < Math.min(4, s.stock.wood); i++) g.fillRect(525, 478 - i * 7, 62, 6); }
  for (const id of ['kitchen', 'store']) if (s.fac[id].site) { g.strokeStyle = '#f5e5b0'; g.lineWidth = 3; g.strokeRect(PLACES[id][0] - 43, PLACES[id][1] - 34, 86, 68); }
  const p = s.person; g.fillStyle = '#342c27'; g.beginPath(); g.ellipse(p.pos[0], p.pos[1] + 5, 16, 7, 0, 0, 7); g.fill(); g.fillStyle = '#365677'; g.fillRect(p.pos[0] - 10, p.pos[1] - 33, 20, 35); g.fillStyle = '#e2bb8f'; g.beginPath(); g.arc(p.pos[0], p.pos[1] - 41, 11, 0, 7); g.fill(); if (p.carry) { g.fillStyle = p.carry.kind === 'wood' ? '#7f5734' : '#a44c43'; g.fillRect(p.pos[0] + 12, p.pos[1] - 25, 16, 12); }
  if (visitorHere(s) || s.helper) { const q = s.helper || { pos: PLACES.visitor, name: s.visitor.name }; g.fillStyle = '#4f3436'; g.beginPath(); g.ellipse(q.pos[0], q.pos[1] + 5, 15, 7, 0, 0, 7); g.fill(); g.fillStyle = '#9d624c'; g.fillRect(q.pos[0] - 10, q.pos[1] - 33, 20, 35); g.fillStyle = '#e4bf98'; g.beginPath(); g.arc(q.pos[0], q.pos[1] - 41, 11, 0, 7); g.fill(); if (q.carry) { g.fillStyle = '#7f5734'; g.fillRect(q.pos[0] + 12, q.pos[1] - 25, 16, 12); } g.fillStyle = '#28362a'; g.fillText(q.name, q.pos[0], q.pos[1] - 59); }
  g.font = 'bold 17px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#28362a'; for (const [text, point, lift] of [['野果叢', PLACES.berries, 56], ['林緣枯木', PLACES.wood, 95], [FACILITIES.hut.stages[hut.stage].name, PLACES.hut, 132], [FACILITIES.garden.stages[garden.stage].name, PLACES.garden, 77], [FACILITIES.kitchen.stages[kitchen.stage].name, PLACES.kitchen, 73], [FACILITIES.store.stages[store.stage].name, PLACES.store, 101]]) g.fillText(text, point[0], point[1] - lift);
  g.textAlign = 'left'; g.fillText('草藥坡', 22, 195); g.fillText(FACILITIES.herbGarden.stages[herbGarden.stage].name, 207, 72); g.textAlign = 'center';
  g.fillText(p.name, p.pos[0], p.pos[1] - 59);
  g.fillText('村路', PLACES.visitor[0], PLACES.visitor[1] + 45);
}
function render() {
  if (!s) return;
  const p = s.person, task = p.task;
  $('time').textContent = `第 ${s.day} 日 · ${Math.floor((s.t % DAY) / DAY * 24).toString().padStart(2, '0')}:00`;
  const heroReason = p.order && task?.act !== p.order ? blockReason(s, p.order) : null;
  $('status').innerHTML = `<h2>${esc(p.name)} · ${p.personality === 'quiet' ? '喜靜' : p.personality === 'diligent' ? '勤勞' : '好交往'}</h2><div>飢餓 ${Math.round(p.hunger)} / 100</div><div class="meter"><span style="width:${p.hunger}%"></span></div><div>精力 ${Math.round(p.energy)} / 100</div><div class="meter energy"><span style="width:${p.energy}%"></span></div><div class="muted">正在${task ? ACTIONS[task.act]?.name || '送回物資' : '找下一件事'} · ${task?.phase || '空閒'}${p.carry ? ` · 手上${{ wood: '木', berries: '野果', veg: '菜', herbs: '草藥' }[p.carry.kind]} ${p.carry.amount}` : ''}</div>${heroReason ? `<div class="blocked">指派暫停：${esc(heroReason)}</div>` : ''}<div class="muted">工作 ${Math.floor(p.work)} · 閒暇 ${p.leisure} · 識藥 ${p.herbalSkill}</div>`;
  $('orders').innerHTML = Object.entries(ACTIONS).filter(([id]) => id === 'talkHelper' || id === 'helperCare' ? !!s.helper : id === 'selfCare' ? p.herbalSkill > 0 || s.stock.herbs > 0 : id === 'herbFarm' ? s.fac.hut.stage > 0 : !['chat', 'gift', 'care'].includes(id) || visitorHere(s)).map(([id, a]) => { const locked = id === 'farm' ? !offers(s, 'garden', 'farm') : id === 'herbFarm' ? !offers(s, 'herbGarden', 'herbFarm') : id === 'cook' ? !offers(s, 'kitchen', 'cook') : id === 'build' ? !Object.values(s.fac).some((x) => x.site) : id === 'gift' ? !s.stock.meal || s.visitor.lastGift === s.day : id === 'care' ? !s.visitor.injury || s.visitor.cared || !s.stock.herbs : id === 'helperCare' ? s.helper?.leaving : id === 'talkHelper' ? s.helper?.leaving || s.visitor.lastChat === s.day : id === 'chat' ? s.visitor.lastChat === s.day : false; return `<button data-act="${id}" class="${p.order === id ? 'active' : ''}" ${locked ? 'disabled' : ''}>${a.name}</button>`; }).join('');
  for (const b of $('speed').querySelectorAll('button')) b.classList.toggle('active', +b.dataset.speed === speed);
  $('build').innerHTML = ['hut', 'garden', 'herbGarden', 'kitchen', 'store'].filter((id) => id === 'hut' || s.fac.hut.stage > 0).map((id) => { const f = FACILITIES[id], st = s.fac[id], site = st.site, stage = f.stages[st.stage], next = f.stages[st.stage + 1]; return `<div class="facility"><b>${f.label}：${stage.name}</b>${id === 'hut' ? `<div class="muted">休息每秒 +${stage.rest} 精力</div>` : ''}${site ? `<div>木料 ${site.delivered.wood}/${site.need.wood}，在途 ${site.reserved.wood}；施工 ${Math.floor(site.work)}/${site.workNeed}<div class="progress"><span style="width:${Math.min(100, site.work / site.workNeed * 100)}%"></span></div></div>` : next ? `<div><button data-build="${id}">建 ${next.name} · 木 ${next.cost.wood}</button></div>` : ''}</div>`; }).join('');
  const foodDays = ((s.stock.meal * 52 + s.stock.berries * 26) / ((s.helper ? 2 : 1) * .14 * DAY)).toFixed(1);
  $('stock').innerHTML = [['berries', '野果'], ['wood', '木料'], ['seeds', '種子'], ['veg', '青菜'], ['meal', '熱飯'], ['herbs', '草藥']].map(([k, n]) => `<div class="statline"><span>${n}</span><b>${s.stock[k]} / ${s.cap[k]}</b></div>`).join('') + `<p class="muted">現成食物按目前人數約可撐 ${foodDays} 日（不含田間與在途）。${s.fac.garden.stage ? `菜園：${{ empty: '待播種', growing: `生長中 ${Math.floor(s.plot.growth)}/34`, ripe: '可收成' }[s.plot.state]}` : '建好菜園才可播種'}；${s.fac.herbGarden.stage ? `藥田：${{ empty: '待插穗', growing: `生長中 ${Math.floor(s.herbPlot.growth)}/50`, ripe: '可收成' }[s.herbPlot.state]}` : '建好藥田才可插穗'}。熱飯需菜 2、木 1；收穫須搬回。</p>`;
  const v = s.visitor, h = s.helper;
  $('community').innerHTML = `<div>${esc(v.name)} · ${v.role === 'visitor' ? visitorHere(s) ? '正在村路' : '已回村' : v.role === 'helper' ? '短住幫手' : '學徒'} · 信任 ${v.trust}</div><div class="muted">${v.injury && !v.cared ? '村路扭傷可用 1 份遊戲草藥照料。' : '關係可慢慢建立；獨居也能繼續生活。'}</div><div class="row"><button data-social="invite" ${visitorHere(s) && v.trust >= 2 && v.willing && s.fac.hut.stage > 0 && v.inviteDay !== s.day ? '' : 'disabled'}>${v.apprenticeDay ? '請學徒回來' : '邀請短住'}</button><button data-social="apprentice" ${h && v.role === 'helper' && v.trust >= 4 && s.t - v.inviteTime >= DAY && h.hunger >= 30 && !h.leaving ? '' : 'disabled'}>彼此同意收徒</button><button data-social="leave" ${h && !h.leaving ? '' : 'disabled'}>請幫手回村</button></div><div class="muted">邀請需小屋、信任 2 且對方願意；收徒需信任 4、同住滿一日、雙方同意。</div>`;
  const helperReason = h?.order && h.task?.act !== h.order ? blockReason(s, h.order, 'helper') : null;
  $('helper-orders').innerHTML = h ? `<div>${esc(h.name)}：飢餓 ${Math.round(h.hunger)} · 精力 ${Math.round(h.energy)} · 雜務 ${Math.floor(h.work)} · 識藥 ${h.herbalSkill} · ${h.carry ? '正在搬運' : h.task ? ACTIONS[h.task.act]?.name || '回村' : '找事做'}</div>${helperReason ? `<div class="blocked">派工暫停：${esc(helperReason)}</div>` : ''}<div class="row">${[['auto', '自主'], ['chop', '砍柴'], ['farm', '菜園'], ...(v.role === 'apprentice' ? [['herbFarm', '藥田']] : [])].map(([id, label]) => `<button data-helper="${id}" class="${h.order === (id === 'auto' ? null : id) ? 'active' : ''}" ${(id === 'farm' && !offers(s, 'garden', 'farm')) || (id === 'herbFarm' && !offers(s, 'herbGarden', 'herbFarm')) ? 'disabled' : ''}>${label}</button>`).join('')}</div>` : '<div class="muted">目前獨居；可一直維持這樣。</div>';
  $('log').innerHTML = s.log.slice(0, 9).map((x) => `<li>第${x.day}日 · ${esc(x.msg)}</li>`).join(''); draw();
}
function loop(now) {
  if (s && speed) { acc += Math.min(0.1, (now - last) / 1000) * speed; let n = 0; while (acc >= .25 && n++ < 16) { tickHomestead(s); acc -= .25; } }
  if (s && now - painted > 250) { render(); painted = now; }
  last = now; requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
Object.defineProperty(window, '__homestead', { get: () => s });
