// SG-EXP-01 V3：PixiJS＋HTML/CSS 可操作展示。場景（背景、可排序物件、人物與影子、選取圈）畫在 Pixi；
// HUD、名冊、選單、面板、名牌、提示是 HTML/CSS。世界只有 model.mjs：畫面只讀 view()，下令只走 dispatch()，
// 推進只經 createClock() 換算的固定步進。暫停、背景、播放倍率與畫面幀率都不改結果。
import { Application, Assets, Container, Graphics, Sprite } from './vendor/pixi.min.mjs';
import { createModel, createClock, speedsFor, STEP_MS } from './model.mjs';

const SHARED = '../spikes/shared/';
const t0 = performance.now();
const scene = await (await fetch(SHARED + 'scene.json')).json();
const grownFrames = await (await fetch('assets/frames.json')).json();
const R = scene.resolution;
const $ = (id) => document.getElementById(id);

const app = new Application();
await app.init({ resizeTo: window, background: '#bdc791', antialias: true, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
$('stage').appendChild(app.canvas);

const sharedFiles = [scene.background, ...scene.props.map((p) => p.file), ...scene.vats.map((v) => v.file), ...Object.values(scene.hero.frames)];
await Assets.load([...sharedFiles.map((f) => SHARED + 'assets/' + f), ...Object.values(grownFrames).map((f) => 'assets/' + f)]);
const FRAMES = { ...Object.fromEntries(Object.entries(scene.hero.frames).map(([k, f]) => [k, SHARED + 'assets/' + f])),
  ...Object.fromEntries(Object.entries(grownFrames).map(([k, f]) => [k, 'assets/' + f])) };
const T = (f) => Assets.get(f);
const TS = (f) => T(SHARED + 'assets/' + f);

// ---------- 路線（只是畫面換算：模型給「走到第幾成」，這裡換成場景座標） ----------
const pts = scene.path.points;
const segLen = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
const PATH_LEN = segLen.reduce((a, b) => a + b, 0);
function at(u) {
  let r = Math.max(0, Math.min(1, u)) * PATH_LEN;
  for (let i = 0; i < segLen.length; i++) {
    if (r <= segLen[i] || i === segLen.length - 1) {
      const k = segLen[i] ? Math.min(1, r / segLen[i]) : 0;
      return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k, dx: pts[i + 1][0] - pts[i][0] };
    }
    r -= segLen[i];
  }
}
// 每一幀走多遠（場景單位）：幀時跟著移速成比例，腳才不會在地上滑。成長後步態步幅大 25%。
const STRIDE = { empty: 110 * 60 / 1000, load: 130 * 40 / 1000, grown: 105 * 52 / 1000 };
const GROWN_FROM = 3; // 本趟腳力到 Lv 3 起換成長後步態

// 人物在畫面上的樣子：全部由模型的階段與步數推出，不另存狀態
function pose(ph, level, mode) {
  if (mode !== 'carry' || !ph) { const p = at(0); return { x: p.x, y: p.y, face: -1, frame: 'idle', back: false }; }
  const sp = speedsFor(level);
  if (ph.name === 'down' || ph.name === 'up') {
    const down = ph.name === 'down';
    const p = at(down ? ph.k : 1 - ph.k);
    const anim = down ? 'empty' : level >= GROWN_FROM ? 'grown' : 'load';
    const speed = down ? sp.empty : sp.load;
    const n = Math.floor(ph.ms * speed / 1000 / STRIDE[anim]) % 4;
    return { x: p.x, y: p.y, face: (down ? p.dx : -p.dx) >= 0 ? 1 : -1, frame: `${anim}-${n}`, back: !down };
  }
  const p = at(ph.name === 'dip' ? 1 : 0);
  return { x: p.x, y: p.y, face: ph.name === 'dip' ? -1 : 1, frame: ph.name, back: false };
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
const H = scene.hero;
const heroSprite = (alpha, tint) => {
  const s = new Sprite(T(FRAMES.idle));
  s.scale.set(1 / R);
  s.anchor.set(H.ax / H.w, H.ay / H.h);
  s.alpha = alpha;
  if (tint != null) s.tint = tint;
  sorted.addChild(s);
  return s;
};
const ghost = heroSprite(0.38, 0x9aa7b4);
const ring = new Graphics().ellipse(0, 2, 30, 9).stroke({ width: 3, color: 0xc8962e });
ring.visible = false;
sorted.addChild(ring);
const hero = heroSprite(1);
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
const ui = { follow: narrow(), playing: true, speed: 1, autoPaused: false, pausedByMenu: false, selected: null, menu: null, rosterOpen: true, shadow: true, returnFocus: null };
let v = model.view();
let p = pose(v.phase, v.tripLevel, v.mode);
const fx = []; // 浮字（只是畫面效果）

function hitTest(sx, sy) {
  const w = toWorld(sx, sy);
  if (w.x >= p.x - 20 && w.x <= p.x + 20 && w.y >= p.y - 78 && w.y <= p.y + 4) return { kind: 'person', id: 'hero' };
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
  if (e.target.closest && e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return; // 交給按鈕本身
  const k = e.key;
  if (k === ' ') { e.preventDefault(); togglePlay(); }
  else if (k === '1' || k === '2' || k === '4') setSpeed(Number(k));
  else if (k === '+' || k === '=') zoomAt(app.screen.width / 2, app.screen.height / 2, cam.zoom * 1.1);
  else if (k === '-') zoomAt(app.screen.width / 2, app.screen.height / 2, cam.zoom / 1.1);
  else if (k === '0') { Object.assign(cam, scene.camera.start); if (narrow()) cam.zoom = 0.85; ui.follow = narrow(); applyCam(); }
  else if (k.startsWith('Arrow')) { const s = 40 / cam.zoom; cam.x += k === 'ArrowLeft' ? -s : k === 'ArrowRight' ? s : 0; cam.y += k === 'ArrowUp' ? -s : k === 'ArrowDown' ? s : 0; applyCam(); }
  else if (k === 'r' || k === 'R') toggleRoster();
  else if (k === 's' || k === 'S') toggleShadow();
  else if (k === 'Enter' && ui.selected === 'hero') { e.preventDefault(); openMenu('vat'); } // 不讓同一次 Enter 落到剛拿到焦點的選項上
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
function select(id) { ui.selected = id; renderChrome(); }
function reset() {
  if (ui.menu) closeMenu(false);
  model = createModel(scene.path.length);
  clock.clear();
  v = model.view();
  fx.length = 0;
  toast('已重來：腳力回到 Lv 1、水缸 3 擔');
  renderChrome();
}

function menuOptions(id) {
  const opts = model.actions().filter((a) => !a.hidden);
  if (id === 'spring') return opts.filter((a) => a.id !== 'pourNow').concat([{ id: 'more', label: '在這裡多裝一桶', enabled: false, reason: '扁擔只掛得了兩桶' }]);
  return opts;
}
function openMenu(id) {
  if (ui.playing) { ui.playing = false; ui.pausedByMenu = true; clock.clear(); }
  ui.menu = id;
  ui.returnFocus = document.activeElement !== document.body ? document.activeElement : null;
  const pl = scene.places[id];
  const m = $('menu');
  m.innerHTML = `<h3>${pl.label}<small>${pl.sub}</small></h3><div class="muted">對象：主角 · ${scene.ui.hero.name}（腳力 Lv ${v.level}）</div>` +
    menuOptions(id).map((o) => `<button class="opt" data-cmd="${o.id}" ${o.enabled ? '' : 'disabled'}><b>${o.label}</b><span>${o.enabled ? o.detail : o.reason}</span></button>`).join('') +
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
  const r = model.dispatch(cmd);
  toast(r.ok ? `已下令：${r.text}` : `做不到：${r.reason}`);
  ui.selected = 'hero';
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
const put = (key, el, html) => { if (last[key] !== html) { last[key] = html; el.innerHTML = html; } };
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const sec = (s) => `${s.toFixed(1)} 秒`;
function bannerText() {
  if (ui.menu) return '❚❚ 已暫停　選單開著時世界不前進；下令或按 Esc 關閉';
  if (ui.autoPaused) return '❚❚ 切到背景時已自動暫停；按「繼續」或空白鍵恢復';
  if (!ui.playing) return '❚❚ 已暫停';
  return '';
}
function renderChrome() {
  $('play').textContent = ui.playing ? '❚❚ 暫停' : '▶ 繼續';
  for (const b of document.querySelectorAll('[data-speed]')) b.classList.toggle('on', Number(b.dataset.speed) === ui.speed);
  $('shadow-toggle').classList.toggle('on', ui.shadow);
  const bt = bannerText();
  $('banner').hidden = !bt;
  if ($('banner').textContent !== bt) $('banner').textContent = bt;
  $('clock').textContent = fmt(v.seconds);
  $('vat').textContent = `水缸 ${v.vat}／${v.vatCapacity} 擔`;
  $('leg').textContent = `腳力 Lv ${v.level}`;
  $('trips').textContent = `已挑 ${v.trips} 趟`;
  const narrowPanel = narrow() && ui.selected === 'hero';
  const cards = scene.ui.people.map((pp) => {
    const st = pp.id === 'hero' ? `${v.resting ? '休息' : '挑水'}・${v.status}` : pp.status;
    return `<button class="card ${ui.selected === pp.id ? 'sel' : ''}" data-person="${pp.id}"><b>${pp.name}</b><small>${st}</small>${pp.id === 'hero' && v.restOrder ? '<small class="due">待執行 1</small>' : ''}</button>`;
  }).join('');
  put('roster', $('roster'), cards);
  $('roster').classList.toggle('collapsed', !ui.rosterOpen || narrowPanel);
  const panel = $('panel');
  panel.hidden = ui.selected !== 'hero';
  if (!panel.hidden) {
    const si = v.speedsInitial, sn = v.speeds;
    const work = v.mode === 'carry' ? `挑水（持續）· 第 ${v.trips + 1} 趟` : v.resting ? '休息' : '挑水（持續）';
    const pend = v.restOrder
      ? `<div class="pending"><span><b>本趟後休息</b><br><small>本趟倒水完成時生效</small></span><button class="btn" data-cmd="cancel">取消</button></div>`
      : v.resting ? `<div class="pending"><span><b>休息中</b><br><small>不會自己出發</small></span><button class="btn" data-cmd="start">開始挑水</button></div>`
        : '<div class="muted">沒有</div>';
    put('panel', panel, `<h2>${scene.ui.hero.name}<small>${scene.ui.hero.role}</small></h2>
      <h4>目前工作</h4><div>${work}</div><div class="row"><span>${v.status}</span>${v.mode === 'carry' ? `<span class="muted">本趟用 Lv ${v.tripLevel}</span>` : ''}</div>
      <div class="bar"><i style="width:${Math.round(v.tripProgress * 100)}%"></i></div>
      <h4>待執行指令</h4>${pend}
      <h4>腳力</h4><div class="row"><b>Lv ${v.level}／${v.maxLevel}</b><span class="muted">${v.nextNeed ? `再 ${v.nextNeed - v.xp} 趟升 Lv ${v.level + 1}` : '已到上限，不會再變快'}</span></div>
      <div class="bar xp"><i style="width:${v.nextNeed ? Math.round(v.xp / v.nextNeed * 100) : 100}%"></i></div>
      <table class="cmp"><tr><td></td><td class="now">現在</td><td class="init">初始</td></tr>
        <tr><td>下山（空桶）</td><td class="now">${sn.empty.toFixed(0)}</td><td class="init">${si.empty.toFixed(0)}</td></tr>
        <tr><td>上山（負重）</td><td class="now">${sn.load.toFixed(0)}</td><td class="init">${si.load.toFixed(0)}</td></tr>
        <tr><td>整趟耗時</td><td class="now">${sec(v.tripSeconds)}</td><td class="init">${sec(v.tripSecondsInitial)}</td></tr></table>
      <div class="muted">${v.lastTrip ? `上一趟實際 ${sec(v.lastTrip.seconds)}（出發時 Lv ${v.lastTrip.level}）` : '還沒挑完第一趟'}；倍率只改播放快慢，不改上面的秒數</div>`);
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
  p = pose(v.phase, v.tripLevel, v.mode);
  if (v.trips > prev.trips) {
    fx.push({ text: '+1 擔', x: scene.places.vat.x, y: scene.places.vat.y - 70, until: performance.now() + 1600 });
    if (v.level > prev.level) fx.push({ text: `腳力升到 Lv ${v.level}`, x: p.x, y: p.y - 100, until: performance.now() + 2200 });
  }
  hero.texture = T(FRAMES[p.frame + (ui.selected === 'hero' ? '-sel' : '')] || FRAMES.idle);
  hero.scale.x = (p.face < 0 ? -1 : 1) / R;
  hero.position.set(p.x, p.y);
  hero.zIndex = p.y;
  const showGhost = ui.shadow && v.shadow && v.mode === 'carry' && v.tripLevel > 1;
  ghost.visible = !!showGhost;
  let g = null;
  if (showGhost) {
    g = pose(v.shadow, 1, 'carry');
    ghost.texture = T(FRAMES[g.frame] || FRAMES.idle);
    ghost.scale.x = (g.face < 0 ? -1 : 1) / R;
    ghost.position.set(g.x, g.y);
    ghost.zIndex = g.y - 0.02;
  }
  ring.visible = ui.selected === 'hero';
  ring.position.set(p.x, p.y); ring.zIndex = p.y - 0.01;
  vatSprite.texture = TS(scene.vats[v.vat <= 2 ? 0 : v.vat < 6 ? 1 : 2].file);
  placeMark.clear();
  if (ui.menu) { const pl = scene.places[ui.menu]; placeMark.ellipse(pl.x, pl.y - pl.ry * 0.6, pl.rx + 6, pl.ry + 4).stroke({ width: 3, color: 0xc8962e, alpha: 0.9 }); }
  tag('vat', 'place', `${scene.places.vat.label} ${v.vat}／${v.vatCapacity}`, scene.places.vat.x, scene.places.vat.y - 60);
  tag('spring', 'place', scene.places.spring.label, scene.places.spring.x, scene.places.spring.y - 40);
  tag('hero', `hero ${ui.selected === 'hero' ? 'sel' : ''}`, `主角 Lv ${v.level}`, p.x, p.y, 6);
  tag('pill', 'pill', v.mode === 'carry' ? `${v.status} ${Math.round(v.phase.k * 100)}%` : v.status, p.x, p.y - 80);
  tag('ghost', 'ghost', showGhost ? '初始腳力・不產水' : null, g ? g.x : 0, g ? g.y : 0, 6);
  tag('master', '', '師父 · 打坐', 1300, 512, 6);
  tag('senior', '', '師兄 · 掃地', 1120, 528, 6);
  const now = performance.now();
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].until < now) fx.splice(i, 1);
  for (let i = 0; i < 3; i++) { const f = fx[i]; tag(`fx${i}`, 'gain', f ? f.text : null, f ? f.x : 0, f ? f.y - (1 - (f.until - now) / 1600) * 14 : 0); }
  if (ui.follow) follow();
  placeMenu();
  if (prev.trips !== v.trips || prev.status !== v.status || prev.restOrder !== v.restOrder || prev.resting !== v.resting || frames % 15 === 0) renderChrome();
  frames++;
  if (firstFrameMs == null) firstFrameMs = performance.now() - t0;
});
applyCam();
measure();
renderChrome();

// 給自動檢查讀的唯讀狀態（不改世界）
window.demo = {
  snapshot: () => ({ tick: v.tick, seconds: v.seconds, vat: v.vat, trips: v.trips, level: v.level, xp: v.xp, mode: v.mode, status: v.status,
    phase: v.phase && v.phase.name, tripLevel: v.tripLevel, restOrder: v.restOrder, resting: v.resting, lastTrip: v.lastTrip,
    tripSeconds: v.tripSeconds, tripSecondsInitial: v.tripSecondsInitial, shadow: v.shadow && v.shadow.name, ghostVisible: ghost.visible,
    frame: p.frame, x: p.x, y: p.y, playing: ui.playing, autoPaused: ui.autoPaused, pausedByMenu: ui.pausedByMenu, speed: ui.speed,
    selected: ui.selected, menu: ui.menu, cam: { ...cam }, hidden: document.hidden,
    heroScreen: (({ x, y }) => ({ x, y: y - 40 }))(toScreen(p.x, p.y)),
    vatScreen: toScreen(scene.places.vat.x, scene.places.vat.y - 20), springScreen: toScreen(scene.places.spring.x, scene.places.spring.y - 10),
    firstFrameMs, frames, stepMs: STEP_MS }),
};
