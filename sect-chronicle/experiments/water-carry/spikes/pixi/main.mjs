// SG-EXP-01 V2：PixiJS 試作。場景（背景、可排序物件、人物動畫、選取圈）畫在 Pixi；HUD、名冊、選單、面板、名牌是 HTML/CSS。
// 素材與資料只讀 ../shared（export.js 從 V1 來源產生），播放規則用 ../shared/playback.mjs。不接正式世界或存檔。
import { Application, Assets, Container, Graphics, Sprite } from './node_modules/pixi.js/dist/pixi.min.mjs';
import { createPlayback, STEP_MS } from '../shared/playback.mjs';

const SHARED = '../shared/';
const t0 = performance.now();
const scene = await (await fetch(SHARED + 'scene.json')).json();
const R = scene.resolution;
const $ = (id) => document.getElementById(id);

const app = new Application();
await app.init({ resizeTo: window, background: '#d7e3e2', antialias: true, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
$('stage').appendChild(app.canvas);

const files = [scene.background, ...scene.props.map((p) => p.file), ...scene.vats.map((v) => v.file), ...Object.values(scene.hero.frames)];
const tex = await Assets.load(files.map((f) => SHARED + 'assets/' + f));
const T = (f) => tex[SHARED + 'assets/' + f];

// ---------- 場景 ----------
const world = new Container();
app.stage.addChild(world);
const bg = new Sprite(T(scene.background));
bg.scale.set(1 / R);
world.addChild(bg);
const sorted = new Container();
sorted.sortableChildren = true; // 依腳底 y 排序：人物走到矮叢後面時被遮住下半身
world.addChild(sorted);

const placeSprite = (file, ax, ay, w, h, x, y) => {
  const s = new Sprite(T(file));
  s.scale.set(1 / R);
  s.anchor.set(ax / w, ay / h);
  s.position.set(x, y);
  s.zIndex = y;
  sorted.addChild(s);
  return s;
};
for (const p of scene.props) placeSprite(p.file, p.ax, p.ay, p.w, p.h, p.x, p.y);
const vatV = scene.vats[1];
const vat = placeSprite(vatV.file, vatV.ax, vatV.ay, vatV.w, vatV.h, scene.places.vat.x, scene.places.vat.y);

const H = scene.hero;
const ring = new Graphics().ellipse(0, 2, 30, 9).stroke({ width: 3, color: 0xc8962e });
ring.visible = false;
sorted.addChild(ring);
const hero = new Sprite(T(H.frames.idle));
hero.scale.set(1 / R);
hero.anchor.set(H.ax / H.w, H.ay / H.h);
sorted.addChild(hero);
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

// ---------- 狀態 ----------
const play = createPlayback(scene);
const ui = { playing: true, speed: 1, autoPaused: false, pausedByMenu: false, selected: null, menu: null, pending: null, rosterOpen: true, acc: 0 };
// ?at=<tick>：先推進到指定 tick 並暫停，用來和 Godot 版同一時刻截圖比較
const at = /[?&]at=(\d+)/.exec(location.search);
if (at) { for (let i = 0; i < Number(at[1]); i++) play.advance(); ui.playing = false; }
let v = play.view();

function hitTest(sx, sy) {
  const p = toWorld(sx, sy);
  const hb = { l: v.x - 20, r: v.x + 20, t: v.y - 78, b: v.y + 4 }; // 人物身體框（場景座標）
  if (p.x >= hb.l && p.x <= hb.r && p.y >= hb.t && p.y <= hb.b) return { kind: 'person', id: 'hero' };
  for (const [id, pl] of Object.entries(scene.places)) {
    const dx = (p.x - pl.x) / pl.rx, dy = (p.y - (pl.y - pl.ry * 0.6)) / (pl.ry * 1.6);
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
  if (drag.moved) { cam.x = drag.cx - dx / cam.zoom; cam.y = drag.cy - dy / cam.zoom; applyCam(); }
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
    return;
  }
  const k = e.key;
  if (k === ' ') { e.preventDefault(); togglePlay(); }
  else if (k === '1' || k === '2' || k === '4') setSpeed(Number(k));
  else if (k === '+' || k === '=') zoomAt(app.screen.width / 2, app.screen.height / 2, cam.zoom * 1.1);
  else if (k === '-') zoomAt(app.screen.width / 2, app.screen.height / 2, cam.zoom / 1.1);
  else if (k === '0') { Object.assign(cam, scene.camera.start); applyCam(); }
  else if (k.startsWith('Arrow')) { const s = 40 / cam.zoom; cam.x += k === 'ArrowLeft' ? -s : k === 'ArrowRight' ? s : 0; cam.y += k === 'ArrowUp' ? -s : k === 'ArrowDown' ? s : 0; applyCam(); }
  else if (k === 'r' || k === 'R') toggleRoster();
  else if (k === 'Enter' && ui.selected === 'hero') openMenu('vat');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ui.playing) { ui.playing = false; ui.autoPaused = true; ui.pausedByMenu = false; }
  renderChrome();
});
window.addEventListener('resize', applyCam);
$('play').addEventListener('click', togglePlay);
for (const b of document.querySelectorAll('[data-speed]')) b.addEventListener('click', () => setSpeed(Number(b.dataset.speed)));
$('roster-toggle').addEventListener('click', toggleRoster);

function togglePlay() { if (ui.menu) closeMenu(false); ui.playing = !ui.playing; ui.autoPaused = false; ui.pausedByMenu = false; ui.acc = 0; renderChrome(); }
function setSpeed(s) { ui.speed = s; renderChrome(); }
function toggleRoster() { ui.rosterOpen = !ui.rosterOpen; renderChrome(); }
function select(id) { ui.selected = id; renderChrome(); }

function openMenu(id) {
  if (ui.playing) { ui.playing = false; ui.pausedByMenu = true; }
  ui.menu = id;
  const pl = scene.places[id], opts = scene.ui.menus[id];
  const m = $('menu');
  m.innerHTML = `<h3>${pl.label}<small>${pl.sub}</small></h3><div class="muted">對象：主角 · ${scene.ui.hero.name}（腳力 ${scene.ui.hero.leg}）</div>` +
    opts.map((o, i) => `<button class="opt" data-i="${i}" ${o.enabled ? '' : 'disabled'}><b>${o.label}</b><span>${o.detail}</span></button>`).join('') +
    '<div class="foot"><span>↑↓ 選擇　Enter 下令</span><span>Esc 關閉</span></div>';
  for (const b of m.querySelectorAll('.opt:not([disabled])')) b.addEventListener('click', () => order(id, Number(b.dataset.i)));
  m.hidden = false;
  placeMenu();
  m.querySelector('.opt:not([disabled])')?.focus();
  renderChrome();
}
function placeMenu() {
  if (!ui.menu) return;
  const pl = scene.places[ui.menu], s = toScreen(pl.x, pl.y), m = $('menu');
  const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = `${Math.max(10, Math.min(window.innerWidth - w - 10, s.x + 40))}px`;
  m.style.top = `${Math.max(60, Math.min(window.innerHeight - h - 40, s.y - h / 2))}px`;
}
function moveFocus(d) {
  const opts = [...$('menu').querySelectorAll('.opt:not([disabled])')];
  const i = opts.indexOf(document.activeElement);
  opts[(i + d + opts.length) % opts.length]?.focus();
}
function closeMenu(resume = true) {
  ui.menu = null;
  $('menu').hidden = true;
  if (resume && ui.pausedByMenu) { ui.playing = true; ui.acc = 0; }
  ui.pausedByMenu = false;
  renderChrome();
}
function order(placeId, i) {
  const o = scene.ui.menus[placeId][i];
  const r = play.order('restAfterTrip');
  if (r.ok) { ui.pending = { label: o.label, when: r.when }; toast(`已下令：${o.label}（${r.when}）`); }
  ui.selected = 'hero';
  closeMenu();
}
let toastTimer = 0;
function toast(text) { const t = $('toast'); t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2500); }

// ---------- HTML 介面：只在內容變了才寫 DOM，避免播放中吃掉點擊／焦點 ----------
const last = {};
const put = (key, el, html) => { if (last[key] !== html) { last[key] = html; el.innerHTML = html; } };
function renderChrome() {
  $('play').textContent = ui.playing ? '❚❚ 暫停' : '▶ 繼續';
  for (const b of document.querySelectorAll('[data-speed]')) b.classList.toggle('on', Number(b.dataset.speed) === ui.speed);
  $('banner').hidden = !ui.menu;
  $('trips').textContent = `今日已挑 ${v.trips} 趟`;
  const cards = scene.ui.people.map((p) => {
    const st = p.id === 'hero' ? `${v.resting ? '休息' : '挑水'}・${v.label}` : p.status;
    return `<button class="card ${ui.selected === p.id ? 'sel' : ''}" data-person="${p.id}"><b>${p.name}</b><small>${st}</small>${p.id === 'hero' && ui.pending ? '<small>待執行 1</small>' : ''}</button>`;
  }).join('');
  put('roster', $('roster'), cards);
  $('roster').classList.toggle('collapsed', !ui.rosterOpen);
  const panel = $('panel');
  panel.hidden = ui.selected !== 'hero';
  if (!panel.hidden) {
    put('panel', panel, `<h2>${scene.ui.hero.name}<small>${scene.ui.hero.role}</small></h2>
      <h4>目前工作</h4><div>${v.resting ? '休息' : scene.ui.hero.work} · 第 ${v.trips + 1} 趟</div><div>${v.label}</div>
      <div class="bar"><i style="width:${Math.round(v.progress * 100)}%"></i></div>
      <h4>腳力</h4><div>${scene.ui.hero.leg}（示意，V3 才接模型）</div>
      <h4>待執行指令</h4>${ui.pending ? `<div class="pending"><span><b>${ui.pending.label}</b><br><small>${ui.pending.when}</small></span><button class="btn" id="cancel">取消</button></div>` : '<div class="muted">沒有</div>'}`);
    const c = $('cancel');
    if (c && !c.dataset.bound) { c.dataset.bound = '1'; c.addEventListener('click', () => { play.cancelOrder(); ui.pending = null; renderChrome(); }); }
  }
}
$('roster').addEventListener('click', (e) => { const b = e.target.closest('[data-person]'); if (b) select(ui.selected === b.dataset.person ? null : b.dataset.person); });

const tagEls = {};
function tag(id, cls, text, x, y, dy = 0) {
  let el = tagEls[id];
  if (!el) { el = tagEls[id] = document.createElement('div'); $('tags').appendChild(el); }
  if (el.className !== `tag ${cls}`) el.className = `tag ${cls}`;
  if (el.textContent !== text) el.textContent = text;
  const s = toScreen(x, y);
  el.style.left = `${Math.round(s.x)}px`; el.style.top = `${Math.round(s.y + dy)}px`;
}

// ---------- 每幀 ----------
let frames = 0, firstFrameMs = null;
app.ticker.add((t) => {
  if (ui.playing) {
    ui.acc += Math.min(250, t.deltaMS) * ui.speed; // 單幀長空檔只算上限，不追趕
    while (ui.acc >= STEP_MS) { play.advance(); ui.acc -= STEP_MS; }
  }
  const prevTrips = v.trips, prevResting = v.resting;
  v = play.view();
  if (prevResting !== v.resting && v.resting) ui.pending = null;
  hero.texture = T(H.frames[v.frame + (ui.selected === 'hero' ? '-sel' : '')] || H.frames.idle);
  hero.scale.x = (v.face < 0 ? -1 : 1) / R;
  hero.position.set(v.x, v.y);
  hero.zIndex = v.y;
  ring.visible = ui.selected === 'hero';
  ring.position.set(v.x, v.y); ring.zIndex = v.y - 0.01;
  vat.texture = T(scene.vats[v.vatLevel].file);
  placeMark.clear();
  if (ui.menu) { const pl = scene.places[ui.menu]; placeMark.ellipse(pl.x, pl.y - pl.ry * 0.6, pl.rx + 6, pl.ry + 4).stroke({ width: 3, color: 0xc8962e, alpha: 0.9 }); }
  tag('vat', 'place', scene.places.vat.label, scene.places.vat.x, scene.places.vat.y - 60);
  tag('spring', 'place', scene.places.spring.label, scene.places.spring.x, scene.places.spring.y - 40);
  tag('hero', `hero ${ui.selected === 'hero' ? 'sel' : ''}`, '主角', v.x, v.y, 6);
  tag('pill', 'pill', `${v.label} ${Math.round(v.progress * 100)}%`, v.x, v.y - 80);
  tag('master', '', '師父 · 打坐', 1300, 512, 6);
  tag('senior', '', '師兄 · 掃地', 1120, 528, 6);
  placeMenu();
  if (prevTrips !== v.trips || frames % 15 === 0) renderChrome();
  frames++;
  if (firstFrameMs == null) firstFrameMs = performance.now() - t0;
});
applyCam();
renderChrome();

// 給自動檢查讀的唯讀狀態（不改世界）
window.spike = {
  engine: 'pixi',
  snapshot: () => ({ tick: play.state.tick, x: v.x, y: v.y, frame: v.frame, face: v.face, label: v.label, trips: v.trips, resting: v.resting,
    playing: ui.playing, autoPaused: ui.autoPaused, speed: ui.speed, selected: ui.selected, menu: ui.menu, pending: ui.pending, cam: { ...cam },
    heroScreen: (({ x, y }) => ({ x, y: y - 40 }))(toScreen(v.x, v.y)),
    vatScreen: toScreen(scene.places.vat.x, scene.places.vat.y - 20), springScreen: toScreen(scene.places.spring.x, scene.places.spring.y - 10),
    firstFrameMs, frames }),
  toScreen, hitTest,
};
