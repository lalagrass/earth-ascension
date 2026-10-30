import { QUESTIONS, ATTRS, ATTR_TOTAL, ATTR_MIN, ATTR_MAX, TEMPLATES, AXES, TRAIT_RULES, TICKS_PER_SECOND, NEEDS, BLUEPRINTS, PILE, FOCUS } from './data.mjs';
import { axesFromAnswers, typeOf, validateAttrs, traitsOf } from './person.mjs';
import { createWorld, step, clock, companionsFor, placeBlueprint, cancelSite, setFocus } from './sim.mjs';
import { blueprint } from './build.mjs';
import { effectText } from './skills.mjs';
import { aff, stageOf, prestige } from './social.mjs';
import { prowess, moveLabel, comprehendable, compChance } from './martial.mjs';
import { SKILLS, MOVES, DEFENSE } from './data.mjs';
import { TILE, drawMap, drawPois, drawPeople, drawDaylight, drawObjects, drawBubbles, drawBuild, drawStrikes, drawEnemies } from './render.mjs';

const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
    else if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  for (const k of kids) e.append(k);
  return e;
};
const TRAIT_LABEL = Object.fromEntries(TRAIT_RULES.map((t) => [t.id, t]));
const FACTOR_LABEL = { need: '需求', persona: '個性', work: '活計', focus: '專長', sched: '作息×', dist: '距離×', noise: '隨機' };
const MULT = new Set(['sched', 'dist']);

// ---------- 開局 ----------
const draft = { answers: Array(QUESTIONS.length).fill(null), attrs: { gen: 5, wu: 5, shen: 5, li: 5, ding: 5 }, template: null, axesOverride: null };

function axesNow() {
  return draft.axesOverride ?? axesFromAnswers(draft.answers);
}

function renderQuiz() {
  const ol = $('#quiz');
  ol.replaceChildren(...QUESTIONS.map((q, i) => el('li', {}, q.q, el('div', { class: 'opts' },
    ...q.a.map(([text], j) => el('button', {
      class: draft.answers[i] === j ? 'on' : '', 'data-q': i, 'data-a': j,
      on: { click: () => { draft.answers[i] = j; draft.axesOverride = null; draft.template = null; renderAll(); } },
    }, text))))));
}

function renderAttrs() {
  const sum = Object.values(draft.attrs).reduce((s, v) => s + v, 0);
  $('#attr-total').textContent = `${ATTR_TOTAL}，剩 ${ATTR_TOTAL - sum}`;
  $('#attrs').replaceChildren(...ATTRS.map((a) => {
    const v = draft.attrs[a.id];
    const bump = (d) => () => {
      const nv = v + d;
      if (nv < ATTR_MIN || nv > ATTR_MAX || (d > 0 && sum >= ATTR_TOTAL)) return;
      draft.attrs[a.id] = nv; draft.template = null; renderAll();
    };
    return el('div', { class: 'attr-row', title: a.desc },
      el('span', {}, a.label), el('span', { class: 'bar' }, el('i', { style: `width:${v * 10}%` })),
      el('b', { 'data-attr': a.id }, String(v)),
      el('button', { on: { click: bump(-1) }, 'aria-label': `${a.label}減一` }, '−'),
      el('button', { on: { click: bump(1) }, 'aria-label': `${a.label}加一` }, '+'));
  }));
  const v = validateAttrs(draft.attrs);
  $('#attr-msg').textContent = v.ok ? '' : v.reason;
}

function renderTemplates() {
  $('#templates').replaceChildren(...TEMPLATES.map((t) => el('button', {
    class: draft.template === t.id ? 'on' : '', 'data-template': t.id,
    on: { click: () => { draft.template = t.id; draft.attrs = { ...t.attrs }; draft.axesOverride = { ...t.axes }; $('#name').value = t.name; renderAll(); } },
  }, el('b', {}, `${t.label}（靈感：${t.inspired}）`), t.blurb)));
}

function axisBars(axes) {
  return AXES.map((a) => el('div', { class: 'axis' }, el('span', {}, a.negLabel),
    el('span', { class: 'track' }, el('i', { style: `left:${(axes[a.id] + 1) * 50}%` })), el('span', {}, a.posLabel)));
}

function renderPreview() {
  const axes = axesNow();
  const traits = traitsOf(axes, draft.attrs);
  $('#preview').replaceChildren(el('div', { class: 'type', id: 'type' }, typeOf(axes)), ...axisBars(axes),
    el('div', { class: 'chips' }, ...traits.map((t) => el('span', { title: TRAIT_LABEL[t].desc }, TRAIT_LABEL[t].label))));
  $('#begin').disabled = !validateAttrs(draft.attrs).ok;
}

function renderAll() { renderQuiz(); renderAttrs(); renderTemplates(); renderPreview(); }

// ---------- 遊戲 ----------
let state = null;
let speed = 1;
let selected = null;
let acc = 0;
let last = 0;
let bg = null;

function begin() {
  const seed = Number($('#seed').value) || 1;
  const me = { name: $('#name').value.trim() || '無名', axes: axesNow(), attrs: { ...draft.attrs }, template: draft.template, protagonist: true };
  state = createWorld({ seed, people: [me, ...companionsFor(seed, draft.template)] });
  selected = state.people[0].id;
  $('#start').classList.add('hidden');
  $('#game').classList.remove('hidden');
  bg = document.createElement('canvas');
  bg.width = 1280; bg.height = 800;
  paintBg();
  $('#roster').replaceChildren(...state.people.map((p) => el('button', { 'data-person': p.id, on: { click: () => { selected = p.id; renderPanel(); } } }, p.name)));
  renderPanel();
  renderBuild();
  last = performance.now();
  requestAnimationFrame(frame);
}

let bgVersion = -1;
function paintBg() {
  const b = bg.getContext('2d');
  drawMap(b, state.map);
  drawPois(b, state.pois);
  bgVersion = state.mapVersion;
}

let builtSeen = 0;
let eventsSeen = 0;
function renderBuild() {
  const box = $('#build');
  box.replaceChildren(el('h3', {}, '營造'), ...BLUEPRINTS.map((bp) => {
    const site = state.sites.find((s) => s.bp === bp.id);
    const done = state.built.includes(bp.id);
    const cost = bp.cost ?? Object.fromEntries(Object.entries(bp.costPerCell).map(([k, v]) => [k, v * bp.cells.length]));
    const costText = Object.entries(cost).map(([k, v]) => `${k === 'wood' ? '木' : '石'}${v}`).join(' ');
    const btn = done ? el('span', { class: 'done' }, '已完工')
      : site ? el('button', { 'data-cancel': bp.id, on: { click: () => { cancelSite(state, site.id); renderBuild(); } } }, '取消')
      : el('button', { 'data-blueprint': bp.id, on: { click: () => { placeBlueprint(state, bp.id); renderBuild(); } } }, '放藍圖');
    return el('div', { class: 'bp' }, el('b', {}, bp.label), el('span', { class: 'cost' }, costText), btn, el('small', {}, bp.desc));
  }), el('div', { id: 'events' }, ...state.events.slice(-4).reverse().map((e) => el('p', {}, `第${Math.floor(e.tick / 1440) + 1}日 ${e.text}`))));
  builtSeen = state.built.length;
  eventsSeen = state.events.length;
}

function setSpeed(s) {
  speed = s;
  document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === s));
}

let panelAt = 0;
const TABS = [['life', '概況'], ['skills', '技能'], ['social', '人際'], ['martial', '武學'], ['why', '念頭']];
let tab = 'life';
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  acc += dt * TICKS_PER_SECOND * speed;
  while (acc >= 1) { step(state); acc -= 1; }
  const ctx = $('#view').getContext('2d');
  if (state.mapVersion !== bgVersion) paintBg();
  if (state.built.length !== builtSeen || state.events.length !== eventsSeen) renderBuild();
  ctx.drawImage(bg, 0, 0);
  drawBuild(ctx, state, PILE, blueprint);
  drawObjects(ctx, state);
  drawEnemies(ctx, state, DEFENSE.FENCE_HP);
  drawPeople(ctx, state, selected);
  drawStrikes(ctx, state);
  drawBubbles(ctx, state);
  const c = clock(state);
  drawDaylight(ctx, 1280, 800, c.hour, c.minute);
  $('#clock').textContent = `第 ${c.day} 日 ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
  if (now - panelAt > 250) { renderPanel(); panelAt = now; }
  requestAnimationFrame(frame);
}

function renderPanel() {
  const p = state.people.find((x) => x.id === selected);
  if (!p) return;
  const attrs = ATTRS.map((a) => `${a.label} ${p.attrs[a.id]}`).join('　');
  const why = p.why.map((c) => el('tr', {}, el('td', {}, c.label), el('td', {}, c.score.toFixed(2)),
    el('td', { class: 'f' }, Object.entries(c.f)
      .filter(([k, v]) => (MULT.has(k) ? Math.abs(v - 1) >= 0.05 : Math.abs(v) >= 0.05))
      .map(([k, v]) => (MULT.has(k) ? `${FACTOR_LABEL[k]}${v.toFixed(2)}` : `${FACTOR_LABEL[k] ?? k}${v > 0 ? '+' : ''}${v.toFixed(1)}`)).join(' '))));
  const needs = NEEDS.map((n) => el('div', { class: 'need', 'data-need': n.id }, el('span', {}, n.label),
    el('span', { class: 'bar' }, el('i', { style: `width:${p.needs[n.id]}%;background:${p.needs[n.id] < 20 ? '#c0392b' : p.needs[n.id] < 45 ? '#d68a2e' : '#5a9a5a'}` })),
    el('b', {}, p.needs[n.id].toFixed(0))));
  const sec = (id, ...kids) => el('div', { 'data-section': id, class: tab === id ? '' : 'hidden' }, ...kids);
  const moves = MOVES.filter((m) => m.id in p.moves);
  const next = comprehendable(p);
  $('#panel').replaceChildren(
    el('h3', { 'data-panel-name': p.name }, `${p.name}${p.protagonist ? '（你）' : ''}`),
    el('p', { id: 'now' }, p.actLabel + (p.carry ? `（身上 ${p.carry} 顆莓）` : '') + (p.load.wood ? `（扛 ${p.load.wood} 木）` : '') + (p.load.stone ? `（扛 ${p.load.stone} 石）` : '')),
    p.forced ? el('p', { class: 'forced' }, `自理優先：${p.forced}`) : '',
    el('div', { class: 'tabs' }, ...TABS.map(([id, label]) => el('button', {
      class: tab === id ? 'on' : '', 'data-tab': id, on: { click: () => { tab = id; renderPanel(); } },
    }, label))),
    sec('life',
      el('div', { class: 'type' }, p.type), ...axisBars(p.axes),
      el('p', {}, attrs),
      el('div', { class: 'chips' }, ...p.traits.map((t) => el('span', { title: TRAIT_LABEL[t].desc }, TRAIT_LABEL[t].label))),
      el('h2', {}, '需求'), ...needs,
      el('h2', {}, '專長'), el('div', { class: 'focus' }, ...FOCUS.map((f) => el('button', {
        class: p.focus === f.id ? 'on' : '', 'data-focus': f.id ?? 'none',
        on: { click: () => { setFocus(state, p.id, f.id); renderPanel(); } },
      }, f.label)))),
    sec('skills', ...SKILLS.map((k) => el('div', { class: 'skill', 'data-skill': k.id }, el('span', {}, k.label),
      el('span', { class: 'bar' }, el('i', { style: `width:${p.skills[k.id]}%` })), el('b', {}, p.skills[k.id].toFixed(0)),
      el('small', {}, effectText(p, k.id))))),
    sec('social', el('h2', {}, `名望 ${prestige(p).toFixed(0)}`), ...state.people.filter((o) => o !== p).map((o) => el('div', { class: 'rel', 'data-rel': o.id },
      el('span', {}, o.name), el('b', {}, stageOf(state, p, o).label),
      el('small', {}, `我→他 ${aff(state, p, o).toFixed(0)}　他→我 ${aff(state, o, p).toFixed(0)}`)))),
    sec('martial', el('h2', {}, `武力 ${prowess(p).toFixed(1)}`),
      ...moves.map((m) => el('div', { class: 'skill', 'data-move': m.id, title: m.desc }, el('span', {}, m.label),
        el('span', { class: 'bar' }, el('i', { style: `width:${p.moves[m.id]}%` })), el('b', {}, p.moves[m.id].toFixed(0)),
        el('small', {}, `威力 ${m.power}`))),
      el('p', { class: 'hint', 'data-comp': '' }, next.length
        ? `快開竅了：練功時每次約 ${Math.round(compChance(p) * 100)}% 領悟${next.map((m) => m.label).join('或')}`
        : `下一招：${MOVES.filter((m) => m.req && !(m.id in p.moves) && Object.keys(m.req).every((k) => k in p.moves)).map((m) => `${m.label}（${Object.entries(m.req).map(([k, v]) => `${moveLabel(k)} ${v}`).join('、')}）`).join('；') || '都會了'}`)),
    sec('why', el('table', { class: 'why' }, ...why)));
}

function pickAt(ev) {
  const r = ev.target.getBoundingClientRect();
  const x = ((ev.clientX - r.left) / r.width) * 1280 / TILE - 0.5;
  const y = ((ev.clientY - r.top) / r.height) * 800 / TILE - 0.5;
  let best = null, bd = 1.2;
  for (const p of state.people) {
    const d = Math.hypot(p.x - x, p.y - 0.4 - y);
    if (d < bd) { bd = d; best = p; }
  }
  if (best) { selected = best.id; renderPanel(); }
}

renderAll();
$('#begin').addEventListener('click', begin);
document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
$('#view').addEventListener('click', pickAt);
addEventListener('keydown', (e) => {
  if (e.code === 'Space' && state && e.target.tagName !== 'INPUT') { e.preventDefault(); setSpeed(speed ? 0 : 1); }
});

// 唯讀遙測：給 headless 檢查用，回傳副本。
window.__sect = {
  snapshot: () => (state ? JSON.parse(JSON.stringify({ tick: state.tick, people: state.people, pois: state.pois, stock: state.stock, counts: state.counts, ledger: state.ledger, sites: state.sites, built: state.built, map: state.map, aff: state.aff, events: state.events, enemies: state.enemies, raids: state.raids, fenceHp: state.fenceHp })) : null),
  speed: () => speed,
  selected: () => selected,
  tileToClient: (x, y) => {
    const r = $('#view').getBoundingClientRect();
    return { x: r.left + ((x + 0.5) * TILE / 1280) * r.width, y: r.top + ((y + 0.1) * TILE / 800) * r.height };
  },
};
