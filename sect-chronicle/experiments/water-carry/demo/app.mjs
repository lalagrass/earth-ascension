// 宗門編年生活開發版：PixiJS＋HTML/CSS。場景（背景、可排序物件、兩人與影子、選取圈）畫在 Pixi；
// HUD、名冊、選單、面板、名牌、提示是 HTML/CSS。世界只有 model.mjs：畫面只讀 view()，下令只走 dispatch()，
// 推進只經 createClock() 換算的固定步進。暫停、背景、播放倍率與畫面幀率都不改結果。
import { Application, Assets, Container, Graphics, Sprite } from './vendor/pixi.min.mjs';
import { createModel, createClock, PEOPLE, STEP_MS } from './model.mjs';
import { createAnimator, pathTool } from '../template/animator.mjs';

const SHARED = '../spikes/shared/';
const t0 = performance.now();
const scene = await (await fetch(SHARED + 'scene.json')).json();
const template = await (await fetch('../template/actions.json')).json();
const IDS = PEOPLE.map((p) => p.id);
const sheets = Object.fromEntries(await Promise.all(IDS.map(async (id) => [id, await Assets.load(`../template/out/${id}.json`)])));
const animators = Object.fromEntries(IDS.map((id) => [id, createAnimator(template, sheets[id].data)]));
const profiles = { hero: { name: scene.ui.hero.name, label: '主角', role: '初學者 · 起始腳力 Lv 1' }, cousin: { name: '熟手同伴', label: '熟手', role: '熟手 · 起始腳力 Lv 3' } };
const R = scene.resolution;
const $ = (id) => document.getElementById(id);

const app = new Application();
await app.init({ resizeTo: window, background: '#bdc791', antialias: true, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
$('stage').appendChild(app.canvas);

const sharedFiles = [scene.background, ...scene.props.map((p) => p.file), ...scene.vats.map((v) => v.file)];
await Assets.load(sharedFiles.map((f) => SHARED + 'assets/' + f));
const TS = (f) => Assets.get(SHARED + 'assets/' + f);

// ---------- 路線（只是畫面換算：模型給「走到第幾成」，這裡換成場景座標） ----------
const path = pathTool(scene.path.points);
const GROWN_FROM = 3; // 本趟腳力到 Lv 3 起換成長後步態

// 人物在畫面上的樣子：全部由模型的階段與步數推出，不另存狀態
function pose(ph, level, mode, resting = false, id = 'hero') {
  const phase = mode === 'carry' && ph ? ph.name : resting ? 'rest' : 'idle';
  const view = { phase, k: ph?.k || 0, travelled: phase === 'down' || phase === 'up' ? ph.k * path.length : 0 };
  // 模型只提供階段與進度；共用動畫用實際走過的距離換幀，不另開 walker 或時鐘。
  const pick = animators[id].pick(view, { grown: level >= GROWN_FROM });
  return { ...path.place(view), ...pick, travelled: view.travelled };
}

// ---------- 場景 ----------
const world = new Container();
app.stage.addChild(world);
const bg = new Sprite(TS(scene.background));
bg.scale.set(1 / R);
world.addChild(bg);
const sorted = new Container();
sorted.sortableChildren = true; // 依腳底 y 排序：人物走到樹叢後面時被遮住
world.addChild(sorted);
const placeSprite = (file, ax, ay, w, h, x, y) => {
  const s = new Sprite(TS(file));
  s.scale.set(1 / R);
  s.anchor.set(ax / w, ay / h);
  s.position.set(x, y);
  s.zIndex = y;
  sorted.addChild(s);
  return s;
};
for (const p of scene.props) placeSprite(p.file, p.ax, p.ay, p.w, p.h, p.x, p.y);
const vatV = scene.vats[1];
const vatSprite = placeSprite(vatV.file, vatV.ax, vatV.ay, vatV.w, vatV.h, scene.places.vat.x, scene.places.vat.y);
const personSprite = (id, alpha = 1, tint) => {
  const sheet = sheets[id], h = sheet.data.meta;
  const s = new Sprite(sheet.textures[sheet.data.animations.idle[0]]);
  // Pixi 已依 meta.scale 換回場景單位；所有幀共用同一個腳底錨點。
  s.anchor.set(h.anchorPx.x / h.frameSize.w, h.anchorPx.y / h.frameSize.h);
  s.alpha = alpha;
  if (tint != null) s.tint = tint;
  sorted.addChild(s);
  return s;
};
const ghost = personSprite('hero', 0.38, 0x9aa7b4);
const ring = new Graphics().ellipse(0, 2, 18, 5.5).stroke({ width: 2.4, color: 0xc8962e });
ring.visible = false;
sorted.addChild(ring);
const sprites = Object.fromEntries(IDS.map((id) => [id, personSprite(id)]));
const placeMark = new Graphics();
world.addChild(placeMark);

// ---------- 鏡頭 ----------
const cam = Object.assign({}, scene.camera.start);
const clampZoom = (z) => Math.min(scene.camera.maxZoom, Math.max(scene.camera.minZoom, z));
const toScreen = (x, y) => ({ x: (x - cam.x) * cam.zoom + app.screen.width / 2, y: (y - cam.y) * cam.zoom + app.screen.height / 2 });
const toWorld = (sx, sy) => ({ x: (sx - app.screen.width / 2) / cam.zoom + cam.x, y: (sy - app.screen.height / 2) / cam.zoom + cam.y });
function applyCam() {
  cam.x = Math.min(scene.size.w, Math.max(0, cam.x));
  cam.y = Math.min(scene.size.h, Math.max(0, cam.y));
  world.scale.set(cam.zoom);
  world.position.set(app.screen.width / 2 - cam.x * cam.zoom, app.screen.height / 2 - cam.y * cam.zoom);
}
function zoomAt(sx, sy, z) {
  const before = toWorld(sx, sy);
  cam.zoom = clampZoom(z);
  const after = toWorld(sx, sy);
  cam.x += before.x - after.x; cam.y += before.y - after.y;
  applyCam();
}
// 窄螢幕：鏡頭跟著主角，並把主角放在 HUD 與底部抽屜之間的空處；拖曳後停止跟隨，按 0 恢復
const narrow = () => window.innerWidth <= 640;
if (narrow()) cam.zoom = 0.85;
function follow() {
  const p = positions[selectedPerson()];
  const top = document.querySelector('.hud').getBoundingClientRect().bottom;
  const drawer = [$('menu'), $('panel'), $('roster')].filter((el) => !el.hidden && el.offsetHeight).map((el) => el.getBoundingClientRect().top);
  const bottom = Math.min(window.innerHeight, ...drawer);
  const ty = p.y - 30 - ((top + bottom) / 2 - app.screen.height / 2) / cam.zoom;
  cam.x += (p.x - cam.x) * 0.12;
  cam.y += (ty - cam.y) * 0.12;
  applyCam();
}

// ---------- 狀態 ----------
let model = createModel(scene.path.length);
const clock = createClock();
const ui = { follow: narrow(), playing: true, speed: 1, autoPaused: false, pausedByMenu: false, selected: null, menu: null, menuPerson: null, rosterOpen: true, shadow: true, returnFocus: null };
let v = model.view();
let positions = Object.fromEntries(IDS.map((id) => { const p = v.people[id]; return [id, pose(p.phase, p.tripLevel, p.mode, p.resting, id)]; }));
const fx = []; // 浮字（只是畫面效果）
const selectedPerson = () => IDS.includes(ui.selected) ? ui.selected : 'hero';

// sheet 碰框是像素；換成相對腳底的場景單位，翻面時身體碰框跟著翻。
const bodies = Object.fromEntries(IDS.map((id) => {
  const h = sheets[id].data.meta, r = Number(h.scale);
  return [id, { x: (h.hitbox.x - h.anchorPx.x) / r, y: (h.hitbox.y - h.anchorPx.y) / r, w: h.hitbox.w / r, h: h.hitbox.h / r }];
}));
function bodyBox(id) {
  const p = positions[id], body = bodies[id];
  return { x: p.x + (p.face > 0 ? body.x : -(body.x + body.w)), y: p.y + body.y, w: body.w, h: body.h };
}
function tapBox(id) {
  const b = bodyBox(id);
  const px = Math.max(0, (44 / cam.zoom - b.w) / 2), py = Math.max(0, (44 / cam.zoom - b.h) / 2);
  return { x: b.x - px, y: b.y - py, w: b.w + px * 2, h: b.h + py * 2 };
}
function screenBox(b) { return { ...toScreen(b.x, b.y), w: b.w * cam.zoom, h: b.h * cam.zoom }; }
function hitTest(sx, sy) {
  const w = toWorld(sx, sy);
  let front = null;
  for (const id of IDS) {
    const b = tapBox(id);
    if (w.x >= b.x && w.x <= b.x + b.w && w.y >= b.y && w.y <= b.y + b.h && (!front || positions[id].y >= positions[front].y)) front = id;
  }
  if (front) return { kind: 'person', id: front };
  for (const [id, pl] of Object.entries(scene.places)) {
    const dx = (w.x - pl.x) / pl.rx, dy = (w.y - (pl.y - pl.ry * 0.6)) / (pl.ry * 1.6);
    if (dx * dx + dy * dy <= 1) return { kind: 'place', id };
  }
  return null;
}

// ---------- 輸入 ----------
let drag = null;
app.canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; app.canvas.setPointerCapture(e.pointerId); });
app.canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
  if (drag.moved) { ui.follow = false; cam.x = drag.cx - dx / cam.zoom; cam.y = drag.cy - dy / cam.zoom; applyCam(); }
});
app.canvas.addEventListener('pointerup', (e) => {
  const d = drag; drag = null;
  if (!d || d.moved) return;
  const hit = hitTest(e.offsetX, e.offsetY);
  if (!hit) { if (ui.menu) closeMenu(); return; }
  if (hit.kind === 'person') select(ui.selected === hit.id ? null : hit.id);
  else openMenu(hit.id);
});
app.canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, cam.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ui.menu) { e.preventDefault(); closeMenu(); return; }
  if (e.target.closest && e.target.closest('.menu')) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); moveFocus(e.key === 'ArrowDown' ? 1 : -1); }
    if (e.key === 'Tab') { e.preventDefault(); moveFocus(e.shiftKey ? -1 : 1); } // 焦點留在選單裡
    return;
  }
  if (e.target.closest && e.target.closest('input, select, textarea, [contenteditable="true"]')) return;
  if (e.target.closest && e.target.closest('button, a') && (e.key === ' ' || e.key === 'Enter')) return; // 交給按鈕／舊版連結本身
  const k = e.key;
  if (k === ' ') { e.preventDefault(); togglePlay(); }
  else if (k === '1' || k === '2' || k === '4') setSpeed(Number(k));
  else if (k === '+' || k === '=') zoomAt(app.screen.width / 2, app.screen.height / 2, cam.zoom * 1.1);
  else if (k === '-') zoomAt(app.screen.width / 2, app.screen.height / 2, cam.zoom / 1.1);
  else if (k === '0') { Object.assign(cam, scene.camera.start); if (narrow()) cam.zoom = 0.85; ui.follow = narrow(); applyCam(); }
  else if (k.startsWith('Arrow')) { const s = 40 / cam.zoom; cam.x += k === 'ArrowLeft' ? -s : k === 'ArrowRight' ? s : 0; cam.y += k === 'ArrowUp' ? -s : k === 'ArrowDown' ? s : 0; applyCam(); }
  else if (k === 'r' || k === 'R') toggleRoster();
  else if (k === 's' || k === 'S') toggleShadow();
  else if (k === 'Enter' && IDS.includes(ui.selected)) { e.preventDefault(); openMenu('vat'); } // 不讓同一次 Enter 落到剛拿到焦點的選項上
});
// 背景：一律暫停並清掉待補時間；若原本是選單造成的暫停，回來後也不會因為關選單就自己恢復播放
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (ui.playing || ui.pausedByMenu)) { ui.playing = false; ui.autoPaused = true; ui.pausedByMenu = false; }
  clock.clear();
  renderChrome();
});
window.addEventListener('resize', () => { applyCam(); measure(); });
$('play').addEventListener('click', togglePlay);
for (const b of document.querySelectorAll('[data-speed]')) b.addEventListener('click', () => setSpeed(Number(b.dataset.speed)));
$('roster-toggle').addEventListener('click', toggleRoster);
$('shadow-toggle').addEventListener('click', toggleShadow);
$('reset').addEventListener('click', reset);
$('roster').addEventListener('click', (e) => { const b = e.target.closest('[data-person]'); if (b) select(ui.selected === b.dataset.person ? null : b.dataset.person); });
$('panel').addEventListener('click', (e) => { const b = e.target.closest('[data-cmd]'); if (b) command(b.dataset.cmd); });

function togglePlay() { if (ui.menu) closeMenu(false); ui.playing = !ui.playing; ui.autoPaused = false; ui.pausedByMenu = false; clock.clear(); renderChrome(); }
function setSpeed(s) { ui.speed = s; renderChrome(); }
function toggleRoster() { ui.rosterOpen = !ui.rosterOpen; renderChrome(); }
function toggleShadow() { ui.shadow = !ui.shadow; renderChrome(); }
function select(id) { ui.selected = id; if (narrow() && IDS.includes(id)) ui.follow = true; renderChrome(); }
function reset() {
  if (ui.menu) closeMenu(false);
  model = createModel(scene.path.length);
  clock.clear();
  v = model.view();
  fx.length = 0;
  toast('已重來：主角 Lv 1、熟手 Lv 3，水缸 3 擔，待執行指令已清除');
  renderChrome();
}

function menuOptions(id, person) {
  const opts = model.actions(person).filter((a) => !a.hidden);
  if (id === 'spring') return opts.filter((a) => a.id !== 'pourNow').concat([{ id: 'more', label: '在這裡多裝一桶', enabled: false, reason: '扁擔只掛得了兩桶' }]);
  return opts;
}
function openMenu(id) {
  if (ui.playing) { ui.playing = false; ui.pausedByMenu = true; clock.clear(); }
  ui.menu = id;
  ui.menuPerson = selectedPerson();
  ui.returnFocus = document.activeElement !== document.body ? document.activeElement : null;
  const pl = scene.places[id];
  const m = $('menu');
  m.innerHTML = `<h3>${pl.label}<small>${pl.sub}</small></h3><div class="muted">對象：${profiles[ui.menuPerson].name}（腳力 Lv ${v.people[ui.menuPerson].level}）</div>` +
    menuOptions(id, ui.menuPerson).map((o) => `<button class="opt" data-cmd="${o.id}" ${o.enabled ? '' : 'disabled'}><b>${o.label}</b><span>${o.enabled ? o.detail : o.reason}</span></button>`).join('') +
    '<div class="foot"><span>↑↓ 選擇　Enter 下令</span><span>Esc 關閉</span></div>';
  for (const b of m.querySelectorAll('.opt:not([disabled])')) b.addEventListener('click', () => { command(b.dataset.cmd); });
  m.hidden = false;
  document.body.classList.add('menu-open');
  placeMenu();
  m.querySelector('.opt:not([disabled])')?.focus();
  renderChrome();
}
function placeMenu() {
  if (!ui.menu || narrow()) return;
  const pl = scene.places[ui.menu], s = toScreen(pl.x, pl.y), m = $('menu');
  const w = m.offsetWidth, h = m.offsetHeight;
  // 右側有工作面板時，選單不能蓋住它：先放地點右邊；放不下就疊在面板正下方（不擋場景裡的人）；再不行才放地點左邊
  const pr = $('panel').hidden ? null : $('panel').getBoundingClientRect();
  const right = pr ? pr.left - 10 : window.innerWidth - 10;
  let x = s.x + 40, y = s.y - h / 2;
  if (x + w > right) {
    if (pr && pr.bottom + 10 + h <= window.innerHeight - 40) { x = pr.right - w; y = pr.bottom + 10; }
    else x = s.x - 40 - w;
  }
  m.style.left = `${Math.max(10, Math.min(window.innerWidth - w - 10, x))}px`;
  m.style.top = `${Math.max(60, Math.min(window.innerHeight - h - 40, y))}px`;
}
function moveFocus(d) {
  const opts = [...$('menu').querySelectorAll('.opt:not([disabled])')];
  const i = opts.indexOf(document.activeElement);
  opts[(i + d + opts.length) % opts.length]?.focus();
}
function closeMenu(resume = true) {
  ui.menu = null;
  ui.menuPerson = null;
  $('menu').hidden = true;
  document.body.classList.remove('menu-open');
  if (resume && ui.pausedByMenu) { ui.playing = true; clock.clear(); }
  ui.pausedByMenu = false;
  if (ui.returnFocus && document.contains(ui.returnFocus)) ui.returnFocus.focus();
  else if (document.activeElement && document.activeElement.closest('.menu')) document.activeElement.blur();
  ui.returnFocus = null;
  renderChrome();
}
function command(cmd) {
  const person = ui.menu ? ui.menuPerson : selectedPerson();
  const r = model.dispatch(cmd, person);
  v = model.view(); // 暫停下令也立即顯示最新意圖，不等待下一個畫面幀。
  toast(r.ok ? `${profiles[person].label}：${r.text}` : `做不到：${r.reason}`);
  ui.selected = person;
  if (ui.menu) closeMenu(); else renderChrome();
}
let toastTimer = 0;
function toast(text) { const t = $('toast'); t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2800); }

// 窄螢幕版面靠這兩個高度排開：橫幅在 HUD 下面、抽屜在名冊上面
function measure() {
  const st = document.documentElement.style;
  st.setProperty('--hud-h', `${document.querySelector('.hud').offsetHeight}px`);
  st.setProperty('--roster-h', `${$('roster').offsetHeight}px`);
}
new ResizeObserver(measure).observe(document.querySelector('.hud'));
new ResizeObserver(measure).observe($('roster'));

// ---------- HTML 介面：只在內容變了才寫 DOM，避免播放中吃掉點擊／焦點 ----------
const last = {};
// 內容變了要重寫時，若焦點在裡面的某個操作上，寫完後把焦點交回同一個操作（同 data-cmd／data-person）
const put = (key, el, html) => {
  if (last[key] === html) return;
  last[key] = html;
  const f = el.contains(document.activeElement) ? document.activeElement : null;
  const sel = f && (f.dataset.cmd ? `[data-cmd="${f.dataset.cmd}"]` : f.dataset.person ? `[data-person="${f.dataset.person}"]` : null);
  el.innerHTML = html;
  if (sel) el.querySelector(sel)?.focus();
};
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const sec = (s) => `${s.toFixed(1)} 秒`;
function bannerText() {
  if (ui.menu) return '❚❚ 已暫停　選單開著時世界不前進；下令或按 Esc 關閉';
  if (ui.autoPaused) return '❚❚ 切到背景時已自動暫停；按「繼續」或空白鍵恢復';
  if (!ui.playing) return '❚❚ 已暫停';
  return '';
}
function renderChrome() {
  const id = selectedPerson(), person = v.people[id], profile = profiles[id];
  $('play').textContent = ui.playing ? '❚❚ 暫停' : '▶ 繼續';
  for (const b of document.querySelectorAll('[data-speed]')) b.classList.toggle('on', Number(b.dataset.speed) === ui.speed);
  $('shadow-toggle').classList.toggle('on', ui.shadow);
  const bt = bannerText();
  $('banner').hidden = !bt;
  if ($('banner').textContent !== bt) $('banner').textContent = bt;
  $('clock').textContent = fmt(v.seconds);
  $('vat').textContent = `水缸 ${v.vat}／${v.vatCapacity} · 在途 ${v.inFlight}`;
  $('leg').textContent = `${profile.label} Lv ${person.level}`;
  $('trips').textContent = `共挑 ${IDS.reduce((n, who) => n + v.people[who].trips, 0)} 趟`;
  const cards = IDS.map((who) => {
    const p = v.people[who], info = profiles[who];
    return `<button class="card ${ui.selected === who ? 'sel' : ''}" data-person="${who}"><b>${info.name} · Lv ${p.level}</b><small>${p.status}</small>${p.restOrder ? '<small class="due">本趟後休息</small>' : ''}</button>`;
  }).join('');
  put('roster', $('roster'), cards);
  $('roster').classList.toggle('collapsed', !ui.rosterOpen);
  const panel = $('panel');
  panel.hidden = !IDS.includes(ui.selected);
  if (!panel.hidden) {
    const si = person.speedsInitial, sn = person.mode === 'carry' ? person.tripSpeeds : person.speeds;
    const work = person.mode === 'carry' ? `挑水（持續）· 第 ${person.trips + 1} 趟` : person.resting ? '休息（停工）' : '挑水（持續）';
    const pend = person.restOrder
      ? `<div class="pending"><span><b>本趟後休息</b><br><small>本趟倒水完成時生效，不影響另一人</small></span><button class="btn" data-cmd="cancel">取消</button></div>`
      : person.resting ? `<div class="pending"><span><b>休息中</b><br><small>停工中，不會自己出發</small></span><button class="btn" data-cmd="start">開始挑水</button></div>`
        : '<div class="muted">沒有</div>';
    if (!panel.firstElementChild) panel.innerHTML = '<div id="p-work"></div><h4>待執行指令</h4><div id="p-pend"></div><div id="p-leg"></div>';
    put('p-work', $('p-work'), `<h2>${profile.name}<small>${profile.role}</small></h2>
      <h4>目前工作</h4><div>${work}</div><div class="row"><span>${person.status}</span>${person.mode === 'carry' ? `<span class="muted">本趟用 Lv ${person.tripLevel}</span>` : ''}</div>
      <div class="bar"><i style="width:${Math.round(person.tripProgress * 100)}%"></i></div>`);
    put('p-pend', $('p-pend'), pend);
    put('p-leg', $('p-leg'), `<h4>腳力</h4><div class="row"><b>Lv ${person.level}／${person.maxLevel}</b><span class="muted">${person.nextNeed ? `再 ${person.nextNeed - person.xp} 趟升 Lv ${person.level + 1}` : '已到上限，不會再變快'}</span></div>
      <div class="bar xp"><i style="width:${person.nextNeed ? Math.round(person.xp / person.nextNeed * 100) : 100}%"></i></div>
      <table class="cmp"><tr><td>場景單位／秒</td><td class="now">${person.mode === 'carry' ? '本趟' : '現在'}</td><td class="init">起始 Lv ${person.initialLevel}</td></tr>
        <tr><td>下山（空桶）</td><td class="now">${sn.empty.toFixed(1)}</td><td class="init">${si.empty.toFixed(1)}</td></tr>
        <tr><td>上山（負重）</td><td class="now">${sn.load.toFixed(1)}</td><td class="init">${si.load.toFixed(1)}</td></tr>
        <tr><td>下趟預計</td><td class="now">${sec(person.tripSeconds)}</td><td class="init">${sec(person.tripSecondsInitial)}</td></tr></table>
      <div class="muted">${person.lastTrip ? `上一趟實際 ${sec(person.lastTrip.seconds)}（出發時 Lv ${person.lastTrip.level}）` : '還沒挑完第一趟'}；升級只影響下一趟，倍率只改播放快慢</div>
      ${positions[id].fallback ? `<div class="muted">動作沿用：${template.actions[positions[id].action].label}</div>` : ''}`);
  }
}

const tagEls = {};
function tag(id, cls, text, x, y, dy = 0) {
  let el = tagEls[id];
  if (!el) { el = tagEls[id] = document.createElement('div'); $('tags').appendChild(el); }
  if (text == null) { el.hidden = true; return; }
  el.hidden = false;
  if (el.className !== `tag ${cls}`) el.className = `tag ${cls}`;
  if (el.textContent !== text) el.textContent = text;
  const s = toScreen(x, y);
  el.style.left = `${Math.round(s.x)}px`; el.style.top = `${Math.round(s.y + dy)}px`;
}

// ---------- 每幀 ----------
let frames = 0, firstFrameMs = null;
app.ticker.add((t) => {
  if (ui.playing) { const n = clock.feed(t.deltaMS, ui.speed); for (let i = 0; i < n; i++) model.step(); }
  const prev = v;
  v = model.view();
  for (const id of IDS) {
    const person = v.people[id], p = pose(person.phase, person.tripLevel, person.mode, person.resting, id);
    positions[id] = p;
    const sprite = sprites[id];
    sprite.texture = sheets[id].textures[p.frame];
    sprite.scale.x = p.face;
    sprite.position.set(p.x, p.y);
    sprite.zIndex = p.y;
    if (person.trips > prev.people[id].trips) {
      fx.push({ text: `${profiles[id].label} +1 擔`, x: scene.places.vat.x, y: scene.places.vat.y - 70, until: performance.now() + 1600 });
      if (person.level > prev.people[id].level) fx.push({ text: `${profiles[id].label}腳力 Lv ${person.level}`, x: p.x, y: p.y - 100, until: performance.now() + 2200 });
    }
    tag(id, `hero ${ui.selected === id ? 'sel' : ''}`, `${profiles[id].label} Lv ${person.level}`, p.x, p.y, 6);
    tag(`${id}-pill`, 'pill', person.mode === 'carry' ? `${person.status} ${Math.round(person.phase.k * 100)}%` : person.status, p.x, p.y - 80);
  }
  const h = v.people.hero;
  const showGhost = ui.shadow && v.shadow && h.mode === 'carry' && h.tripLevel > h.initialLevel;
  ghost.visible = !!showGhost;
  let g = null;
  if (showGhost) {
    g = pose(v.shadow, h.initialLevel, 'carry');
    ghost.texture = sheets.hero.textures[g.frame];
    ghost.scale.x = g.face;
    ghost.position.set(g.x, g.y);
    ghost.zIndex = g.y - 0.02;
  }
  const selected = IDS.includes(ui.selected) && positions[ui.selected];
  ring.visible = !!selected;
  if (selected) { ring.position.set(selected.x, selected.y); ring.zIndex = selected.y - 0.01; }
  vatSprite.texture = TS(scene.vats[v.vat <= 2 ? 0 : v.vat < 6 ? 1 : 2].file);
  placeMark.clear();
  if (ui.menu) { const pl = scene.places[ui.menu]; placeMark.ellipse(pl.x, pl.y - pl.ry * 0.6, pl.rx + 6, pl.ry + 4).stroke({ width: 3, color: 0xc8962e, alpha: 0.9 }); }
  tag('vat', 'place', `${scene.places.vat.label} ${v.vat}／${v.vatCapacity} · 在途 ${v.inFlight}`, scene.places.vat.x, scene.places.vat.y - 60);
  tag('spring', 'place', scene.places.spring.label, scene.places.spring.x, scene.places.spring.y - 40);
  tag('ghost', 'ghost', showGhost ? '主角初始影子・不產水' : null, g ? g.x : 0, g ? g.y : 0, 6);
  tag('master', '', '師父 · 打坐', 1300, 512, 6);
  tag('senior', '', '師兄 · 掃地', 1120, 528, 6);
  const now = performance.now();
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].until < now) fx.splice(i, 1);
  for (let i = 0; i < 3; i++) { const f = fx[i]; tag(`fx${i}`, 'gain', f ? f.text : null, f ? f.x : 0, f ? f.y - (1 - (f.until - now) / 1600) * 14 : 0); }
  if (ui.follow) follow();
  placeMenu();
  if (IDS.some((id) => prev.people[id].trips !== v.people[id].trips || prev.people[id].status !== v.people[id].status || prev.people[id].restOrder !== v.people[id].restOrder || prev.people[id].resting !== v.people[id].resting) || frames % 15 === 0) renderChrome();
  frames++;
  if (firstFrameMs == null) firstFrameMs = performance.now() - t0;
});
applyCam();
measure();
renderChrome();

// 唯讀觀測；沒有測試專用世界推進或寫入接口。
function personSnapshot(id) {
  const person = v.people[id], p = positions[id], sprite = sprites[id], b = bodyBox(id);
  return { ...person, phase: person.phase && person.phase.name, phaseProgress: person.phase?.k || 0,
    frame: p.frame, action: p.action, requestedAction: p.requested, fallback: p.fallback, face: p.face, travelled: p.travelled, x: p.x, y: p.y,
    screen: toScreen(b.x + b.w / 2, b.y + b.h / 2), bodyScreen: screenBox(b), tapScreen: screenBox(tapBox(id)), footScreen: toScreen(p.x, p.y),
    sprite: { resolution: sprite.texture.source.resolution, width: sprite.texture.orig.width, height: sprite.texture.orig.height,
      anchor: { x: sprite.anchor.x, y: sprite.anchor.y }, scale: { x: sprite.scale.x, y: sprite.scale.y }, z: sprite.zIndex,
      bounds: ((b) => ({ x: b.x, y: b.y, w: b.width, h: b.height }))(sprite.getBounds()) },
  };
}
window.demo = {
  snapshot: () => {
    const people = Object.fromEntries(IDS.map((id) => [id, personSnapshot(id)]));
    return { ...people.hero, people, tick: v.tick, seconds: v.seconds, vat: v.vat, vatCapacity: v.vatCapacity, inFlight: v.inFlight,
      shadow: v.shadow && v.shadow.name, ghostVisible: ghost.visible,
      playing: ui.playing, autoPaused: ui.autoPaused, pausedByMenu: ui.pausedByMenu, speed: ui.speed,
      selected: ui.selected, menu: ui.menu, menuPerson: ui.menuPerson, cam: { ...cam }, hidden: document.hidden,
      heroScreen: people.hero.screen,
      vatScreen: toScreen(scene.places.vat.x, scene.places.vat.y - 20), springScreen: toScreen(scene.places.spring.x, scene.places.spring.y - 10),
      firstFrameMs, frames, stepMs: STEP_MS,
    };
  },
};
