// BL-V04 小樣頁（#181）：主角與堂親共用 actions.json 這一份動作模板，各自只換 sheet（外觀）。
// 世界只有 walker.mjs：畫面每幀只讀 view()，經 animator.mjs 換成幀名；推進只走固定步進時鐘。
// ?board=compare 改成靜態對照板：每個動作一列，左主角、右堂親，缺的動作顯示退回的幀。
// 遮擋與選取（#181 第 4 項）：點景和人物在同一層依腳底 y 排序；點選用 sheet 的 meta.hitbox，重疊時選前面的人。
import { Application, Assets, Container, Graphics, Sprite, Text } from '../demo/vendor/pixi.min.mjs';
import { createWalker, createClock, STEP_MS } from './walker.mjs';
import { createAnimator, pathTool } from './animator.mjs';

const $ = (id) => document.getElementById(id);
const SHARED = '../spikes/shared/';
const template = await (await fetch('actions.json')).json();
const scene = await (await fetch(SHARED + 'scene.json')).json();
const IDS = Object.keys(template.characters);
const sheets = {};
for (const id of IDS) sheets[id] = await Assets.load(`out/${id}.json`);
const animators = Object.fromEntries(IDS.map((id) => [id, createAnimator(template, sheets[id].data)]));
const tex = (id, frame) => sheets[id].textures[frame];

const app = new Application();
await app.init({ resizeTo: window, background: '#bdc791', antialias: true, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
$('stage').appendChild(app.canvas);
const world = new Container();
app.stage.addChild(world);
const board = new URLSearchParams(location.search).get('board');

if (board === 'compare') compareBoard();
else await walkBoard();

/* ---------- 同路展示 ---------- */
async function walkBoard() {
  await Assets.load(SHARED + 'assets/' + scene.background);
  const bg = new Sprite(Assets.get(SHARED + 'assets/' + scene.background));
  bg.scale.set(1 / scene.resolution);
  world.addChild(bg);
  world.sortableChildren = true; // bg 的 zIndex 0 在最底；點景與人物都用腳底 y
  // 點景沿 V3：從 scene.json 讀樹、樹叢、石頭與水缸，和人物放在同一層。挑水路會經過 bush-a、rock-a 前後與 pine-d 樹冠下
  const prop = async (p, x, y, id) => {
    const s = new Sprite(await Assets.load(SHARED + 'assets/' + p.file));
    s.scale.set(1 / scene.resolution);
    s.anchor.set(p.ax / p.w, p.ay / p.h);
    s.position.set(x, y);
    s.zIndex = y;
    s.label = id;
    world.addChild(s);
    return s;
  };
  for (const p of scene.props) await prop(p, p.x, p.y, p.id);
  await prop(scene.vats[1], scene.places.vat.x, scene.places.vat.y, 'vat');
  const path = pathTool(scene.path.points);
  const play = scene.playback.steps;
  const common = { pathLength: path.length, speedEmpty: play[0].speed, speedLoad: play[2].speed, dipMs: play[1].ms, pourMs: play[3].ms };
  // 同一組條件；堂親從「負重上山」開始，畫面上兩人才不會疊在一起
  const walkers = { hero: createWalker(common), cousin: createWalker(Object.assign({}, common, { start: 2 })) };
  const people = {};
  for (const id of IDS) {
    const sp = new Sprite(tex(id, sheets[id].data.animations.idle[0]));
    sp.scale.set(1); // sheet 的 meta.scale 已把像素換回場景單位
    sp.label = id;
    world.addChild(sp);
    const tag = document.createElement('div');
    tag.className = `tag ${id}`;
    document.body.appendChild(tag);
    people[id] = { sp, tag, last: null };
  }
  const ring = new Graphics().ellipse(0, 1, 18, 5.5).stroke({ width: 2.4, color: 0xc8962e });
  ring.visible = false;
  world.addChild(ring);
  // 身體碰框：meta.hitbox 是幀內像素，換成以腳底為原點的場景單位；不含扁擔與桶
  const HB = Object.fromEntries(IDS.map((id) => {
    const m = sheets[id].data.meta, k = m.scale;
    return [id, { x: (m.hitbox.x - m.anchorPx.x) / k, y: (m.hitbox.y - m.anchorPx.y) / k, w: m.hitbox.w / k, h: m.hitbox.h / k }];
  }));
  const box = (id, at) => {
    const b = HB[id];
    return { x: at.x + (at.face > 0 ? b.x : -(b.x + b.w)), y: at.y + b.y, w: b.w, h: b.h };
  };
  const MIN_TAP = 44; // 螢幕上的點選範圍下限（px）：小畫面人物只有十幾 px 高，仍要點得到
  const clock = createClock();
  const ui = { playing: true, speed: 1, grown: false, frames: 0, selected: null };
  const layout = () => {
    const s = Math.min(app.screen.width / 1600, app.screen.height / 900);
    world.scale.set(s);
    world.position.set((app.screen.width - 1600 * s) / 2, (app.screen.height - 900 * s) / 2);
  };
  const render = () => {
    const out = {};
    for (const id of IDS) {
      const v = walkers[id].view();
      const pick = animators[id].pick(v, { grown: ui.grown });
      const at = path.place(v);
      const p = people[id];
      p.sp.texture = tex(id, pick.frame);
      p.sp.position.set(at.x, at.y);
      p.sp.scale.x = at.face;
      p.sp.zIndex = at.y;
      const g = world.toGlobal({ x: at.x, y: at.y - 74 });
      p.tag.style.left = `${g.x}px`; p.tag.style.top = `${g.y}px`;
      const html = `<b>${template.characters[id].label}</b>${template.actions[pick.requested].label}` +
        (pick.fallback ? ` <span class="fb">缺幀→退回「${template.actions[pick.action].label}」</span>` : '');
      if (p.last !== html) { p.tag.innerHTML = html; p.last = html; }
      p.tag.classList.toggle('sel', ui.selected === id);
      out[id] = Object.assign({}, v, at, pick);
    }
    const sel = ui.selected && out[ui.selected];
    ring.visible = !!sel;
    if (sel) { ring.position.set(sel.x, sel.y); ring.zIndex = sel.y - 0.01; }
    const panel = $('sel');
    panel.hidden = !sel;
    if (sel) {
      const html = `<b>${template.characters[ui.selected].label}</b>　正在：${template.actions[sel.requested].label}` +
        `<small>權威階段 ${sel.phase}・這段走了 ${sel.travelled.toFixed(1)}・已挑 ${sel.trips} 趟</small>`;
      if (panel.dataset.html !== html) { panel.innerHTML = html; panel.dataset.html = html; }
    }
    world.sortChildren();
    return out;
  };
  // 點選：重疊時選腳底較前（y 較大）的人；點空白處取消。只改 ui，不碰世界
  const hitTest = (sx, sy) => {
    const s = world.scale.x, w = world.toLocal({ x: sx, y: sy });
    let best = null;
    for (const id of IDS) {
      const b = box(id, last[id]);
      const padX = Math.max(0, (MIN_TAP / s - b.w) / 2), padY = Math.max(0, (MIN_TAP / s - b.h) / 2);
      if (w.x >= b.x - padX && w.x <= b.x + b.w + padX && w.y >= b.y - padY && w.y <= b.y + b.h + padY && (!best || last[id].y > last[best].y)) best = id;
    }
    return best;
  };
  const select = (id) => { ui.selected = id; last = render(); };
  layout();
  app.renderer.on('resize', layout);
  let last = render();
  app.ticker.add((t) => {
    if (ui.playing) clock.advance(t.deltaMS, ui.speed, () => { for (const id of IDS) walkers[id].step(); });
    last = render();
    ui.frames++;
  });

  // 控制：只改播放，不碰世界
  const setPlaying = (on) => { ui.playing = on; $('play').textContent = on ? '暫停' : '播放'; $('play').setAttribute('aria-pressed', String(on)); };
  $('play').onclick = () => setPlaying(!ui.playing);
  for (const b of document.querySelectorAll('[data-speed]')) b.onclick = () => {
    ui.speed = Number(b.dataset.speed);
    for (const o of document.querySelectorAll('[data-speed]')) o.setAttribute('aria-pressed', String(o === b));
  };
  $('restart').onclick = () => { for (const id of IDS) walkers[id].reset(); clock.reset(); last = render(); };
  $('grown').onchange = (e) => { ui.grown = e.target.checked; };
  app.canvas.addEventListener('click', (e) => select(hitTest(e.offsetX, e.offsetY)));

  // 給檢查腳本的唯讀狀態與確定性推進（advance 只是替時鐘多走幾步，等同播放）
  window.v04 = {
    snapshot: () => ({ ui: Object.assign({}, ui), people: Object.fromEntries(IDS.map((id) => [id, Object.assign({}, last[id], { texture: people[id].sp.texture.label })])) }),
    advance: (ms) => { const n = Math.round(ms / STEP_MS); for (let i = 0; i < n; i++) for (const id of IDS) walkers[id].step(); last = render(); return n; },
    sheets: () => Object.fromEntries(IDS.map((id) => [id, sheets[id].data.meta])),
    // 選取與遮擋的檢查用：碰框的螢幕位置、目前的繪製順序
    hitTest,
    screenBox: (id) => { const b = box(id, last[id]), a = world.toGlobal({ x: b.x, y: b.y }), z = world.toGlobal({ x: b.x + b.w, y: b.y + b.h }); return { x: a.x, y: a.y, w: z.x - a.x, h: z.y - a.y }; },
    worldBox: (id) => box(id, last[id]),
    order: () => world.children.map((c) => ({ label: c.label || '', z: c.zIndex, visible: c.visible })),
    props: () => world.children.filter((c) => c instanceof Sprite && c.label && !IDS.includes(c.label)).map((c) => { const b = c.getBounds(), a = world.toLocal({ x: b.x, y: b.y }), z = world.toLocal({ x: b.x + b.width, y: b.y + b.height }); return { label: c.label, z: c.zIndex, x: a.x, y: a.y, w: z.x - a.x, h: z.y - a.y }; }),
    STEP_MS
  };
}

/* ---------- 靜態對照板 ---------- */
function compareBoard() {
  document.body.classList.add('compare');
  app.renderer.background.color = 0xf6efe0;
  const COLX = { hero: 190, cousin: 830 }, ROW = 118, TOP = 96;
  const label = (s, x, y, size = 14, color = 0x2f2a24) => {
    const t = new Text({ text: s, style: { fontFamily: 'Noto Sans TC, WenQuanYi Zen Hei, sans-serif', fontSize: size, fill: color } });
    t.position.set(x, y); world.addChild(t); return t;
  };
  label('同一份動作模板，兩個外觀（每格是同一個框、同一個腳底錨點）', 24, 16, 22);
  label('左：主角　右：堂親。紅字＝這個人物沒有這組幀，依模板 fallback 退回後顯示的樣子（淡色）。', 24, 50, 13, 0x6b6254);
  for (const id of IDS) label(template.characters[id].label, COLX[id], TOP - 26, 15);
  Object.entries(template.actions).forEach(([aid, a], r) => {
    const y = TOP + r * ROW;
    label(`${a.label}`, 24, y + 40, 15);
    label(`${aid}・${a.loop ? '循環' : '一次'}`, 24, y + 62, 11, 0x6b6254);
    for (const id of IDS) {
      const has = animators[id].has(aid);
      const resolved = animators[id].resolve(aid).action;
      const frames = sheets[id].data.animations[resolved];
      frames.forEach((f, i) => {
        const sp = new Sprite(tex(id, f));
        sp.position.set(COLX[id] + 50 + i * 100, y + ROW - 10);
        sp.alpha = has ? 1 : 0.4;
        world.addChild(sp);
      });
      if (!has) label(`缺 → 退回「${template.actions[resolved].label}」`, COLX[id] + 30 + frames.length * 100, y + 40, 13, 0xa0461f);
    }
  });
  const fit = () => { const s = Math.min(app.screen.width / 1600, app.screen.height / 1000); world.scale.set(s); };
  fit();
  app.renderer.on('resize', fit);
  window.v04 = { ready: true };
}
