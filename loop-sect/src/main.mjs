import { QUESTIONS, ATTRS, ATTR_TOTAL, ATTR_MIN, ATTR_MAX, TEMPLATES, AXES, TRAIT_RULES, TICKS_PER_SECOND, NEEDS, BLUEPRINTS, PILE, FOCUS } from './data.mjs';
import { axesFromAnswers, typeOf, validateAttrs, traitsOf } from './person.mjs';
import { createWorld, step, clock, companionsFor, placeBlueprint, cancelSite, setFocus, startExpedition, startTrial, canTrial } from './sim.mjs';
import { canLaunch } from './expedition.mjs';
import { LIFE_CATS, lifeShares, habitText, personEvents, EVENT_GROUPS, eventsIn, sectStats } from './chronicle.mjs';
import { blueprint } from './build.mjs';
import { effectText } from './skills.mjs';
import { aff, stageOf, prestige, kinOf, bondLabel } from './social.mjs';
import { prowess, moveLabel, comprehendable, compChance } from './martial.mjs';
import { titleOf, appeal, reasonText } from './recruit.mjs';
import { SKILLS, MOVES, DEFENSE, FARM, DUTY, FORMS } from './data.mjs';
import { dutyOf, dutyText, setDuty, assignDuty, ROLE } from './duty.mjs';
import { TILE, drawMap, drawPois, drawPeople, drawDaylight, drawObjects, drawBubbles, drawBuild, drawStrikes, drawEnemies, drawNests, drawLabels, labelBoxes, drawPlots, drawForm } from './render.mjs';
import { formOf, shapeOf, sizeOf, period } from './forms.mjs';
import { hurt, hurtText } from './injury.mjs';
import { INJURY } from './data.mjs';

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
const FACTOR_LABEL = { need: '需求', persona: '個性', work: '活計', focus: '專長', duty: '值日', sched: '作息×', dist: '距離×', noise: '隨機' };
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
  renderRoster();
  renderPanel();
  renderBuild();
  last = performance.now();
  requestAnimationFrame(frame);
}

// 名冊：人會來會走（M8），所以每次人數或身分變了就重畫；立派後前面加派名。
let rosterKey = '';
function renderRoster() {
  rosterKey = rosterSig();
  $('#roster').replaceChildren(...(state.sect ? [el('b', { class: 'sect', 'data-sect': '' }, state.sect.name)] : []),
    ...state.people.map((p) => el('button', { 'data-person': p.id, class: p.guest ? 'guest' : '', on: { click: () => { selected = p.id; renderPanel(); } } },
      (p.guest ? `${p.name}（客）` : dutyOf(state, p) ? `${p.name}·${ROLE[dutyOf(state, p)].label}` : p.name) + (hurt(p) ? '（傷）' : '') + (p.kin ? '·家' : ''))));
}
// M18：值日變了也重畫名冊。
const rosterSig = () => state.people.map((p) => `${p.id}${p.guest ? 'g' : ''}${dutyOf(state, p) ?? ''}${hurt(p) ? 'h' : ''}${p.kin ?? ''}`).join() + (state.sect?.name ?? '');

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
    const locked = !done && !site && bp.requires && !state.built.includes(bp.requires);
    if (locked) btn.disabled = true;
    return el('div', { class: 'bp' }, el('b', {}, bp.label), el('span', { class: 'cost' }, costText), btn,
      el('small', {}, locked ? `${bp.desc}；要先蓋好${blueprint(bp.requires).label}` : bp.desc));
  }), renderExpedition(), renderChronicle());
  builtSeen = state.built.length;
  eventsSeen = state.events.length;
  expSeen = expKey();
}

// M13 招式譜：一招的形狀與現在的大小（人在左邊、朝右出手）。
function formCanvas(form, v, attrs) {
  const c = el('canvas', { width: 72, height: 44, class: 'form', ...attrs });
  const g = c.getContext('2d');
  g.fillStyle = '#efe4cc'; g.fillRect(0, 0, 72, 44);
  g.fillStyle = '#3d2b1a'; g.beginPath(); g.arc(14, 22, 4, 0, Math.PI * 2); g.fill();
  drawForm(g, 14, 22, 0, shapeOf(form, sizeOf(v)), '#a8432f', 1, 20);
  return c;
}
const formPreview = (id, v) => formCanvas(formOf(id), v, { 'data-form-preview': formOf(id) });
// 四門的圖例（熟練 30 時的樣子），讓人看地圖時認得出是哪一門。
const formLegend = () => el('div', { class: 'forms', 'data-form-legend': '' }, ...Object.entries(FORMS).map(([id, f]) =>
  el('figure', {}, formCanvas(id, 30, { 'data-form': id }), el('figcaption', {}, f.label))));

// M15 演武：按鈕（不能開時停用並寫原因）與最好成績。
function trialRow(p) {
  const c = canTrial(state, p);
  const doing = p.task?.kind === 'trial';
  const best = p.trialBest ? `最好：撐過 ${p.trialBest.waves} 波${p.trialBest.waves ? `，第一波 ${p.trialBest.ticks[0]} 刻` : ''}` : '還沒演武過';
  return el('div', { class: 'trial', 'data-trial-row': '' },
    el('h2', {}, '演武'),
    el('button', { 'data-trial': '', ...(c.ok ? {} : { disabled: '' }), on: { click: () => { startTrial(state, p.id); renderPanel(); } } }, doing ? '演武中' : '外功場演武'),
    el('small', { 'data-trial-why': '' }, doing ? p.actLabel : c.ok ? '木人一波比一波多，看撐得過幾波' : c.why),
    el('p', { class: 'hint', 'data-trial-best': '' }, best));
}

// M10 紀事簿：分類篩選、最近 12 筆、門派統計。
let evGroup = 'all';
function renderChronicle() {
  const list = eventsIn(state, evGroup).slice(-12).reverse();
  return el('div', { id: 'chronicle' }, el('h3', {}, '紀事'),
    el('div', { class: 'tabs' }, ...EVENT_GROUPS.map((g) => el('button', { class: evGroup === g.id ? 'on' : '', 'data-events-group': g.id, on: { click: () => { evGroup = g.id; renderBuild(); } } }, g.label))),
    el('div', { id: 'events' }, ...list.map((e) => el('p', { 'data-kind': e.kind }, `${dayText(e.tick)} ${e.text}`)), ...(list.length ? [] : [el('p', { class: 'hint' }, '還沒有這類紀事。')])),
    // M18 值日（試做中，預設關）：打開後門派自動排伙房、採集、柴火。
    el('div', { class: 'duty' }, el('button', { class: DUTY.ON ? 'on' : '', 'data-duty-toggle': '', on: { click: () => { DUTY.ON = !DUTY.ON; if (DUTY.ON) assignDuty(state); else state.duty = {}; renderBuild(); renderRoster(); } } },
      DUTY.ON ? '值日：開' : '值日：關（試做中）'),
    el('small', { 'data-duty-text': '' }, DUTY.ON ? dutyText(state) : '打開後，門派每日排伙房、採集、柴火各一人')),
    el('table', { class: 'stats', 'data-stats': '' }, ...sectStats(state).map(([k, v]) => el('tr', {}, el('td', {}, k), el('td', {}, v)))));
}

// M9 遠征面板：兩處巢穴、會去的人或擋住的原因、出發中的隊伍在哪一階段。
const PHASE = { march: '行軍中', fight: '與守衛交手', raze: '拆巢中', return: '回山中' };
let expSeen = '';
const expKey = () => (state.expedition ? `${state.expedition.nest}:${state.expedition.phase}` : '-') + state.nests.map((n) => `${+n.cleared}${+canLaunch(state, n.id).ok}`).join('');
function renderExpedition() {
  const x = state.expedition;
  const rows = state.nests.map((n) => {
    if (n.cleared) return el('div', { class: 'bp', 'data-nest-row': n.id }, el('b', {}, n.label), el('span', { class: 'done' }, '已拆'));
    if (x && x.nest === n.id) {
      const who = x.members.map((id) => state.people.find((p) => p.id === id)?.name).filter(Boolean).join('、');
      return el('div', { class: 'bp', 'data-nest-row': n.id }, el('b', {}, n.label), el('span', { class: 'phase', 'data-exp-phase': x.phase }, PHASE[x.phase]), el('small', {}, `${who}；巢 ${Math.ceil(n.hp)}/${n.hpMax}`));
    }
    const c = canLaunch(state, n.id);
    const party = (c.party ?? []).map((p) => p.name).join('、');
    const btn = el('button', { 'data-nest': n.id, on: { click: () => { startExpedition(state, n.id); renderBuild(); } } }, '出征');
    if (!c.ok) btn.disabled = true;
    return el('div', { class: 'bp', 'data-nest-row': n.id }, el('b', {}, n.label), el('span', { class: 'cost' }, `守衛 ${state.enemies.filter((e) => e.nest === n.id && e.hp > 0).length}`), btn,
      el('small', {}, c.ok ? `會去：${party}；家裡剩 ${state.people.filter((p) => !p.guest).length - c.party.length} 人顧家` : c.reason));
  });
  return el('div', { id: 'expedition' }, el('h3', {}, '遠征'), ...rows);
}

function setSpeed(s) {
  speed = s;
  document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === s));
}

let panelAt = 0;
const TABS = [['life', '概況'], ['skills', '技能'], ['social', '人際'], ['martial', '武學'], ['story', '生平'], ['why', '念頭']];
let tab = 'life';
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  acc += dt * TICKS_PER_SECOND * speed;
  while (acc >= 1) { step(state); acc -= 1; }
  const ctx = $('#view').getContext('2d');
  if (state.mapVersion !== bgVersion) paintBg();
  if (state.built.length !== builtSeen || state.events.length !== eventsSeen || expKey() !== expSeen) renderBuild();
  ctx.drawImage(bg, 0, 0);
  drawBuild(ctx, state, PILE, blueprint);
  drawNests(ctx, state);
  drawPlots(ctx, state, FARM.GROW);
  drawObjects(ctx, state);
  drawEnemies(ctx, state, DEFENSE.FENCE_HP);
  drawPeople(ctx, state, selected);
  drawStrikes(ctx, state);
  drawLabels(ctx, state, selected);
  drawBubbles(ctx, state);
  const c = clock(state);
  drawDaylight(ctx, 1280, 800, c.hour, c.minute);
  $('#clock').textContent = `第 ${c.day} 日 ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
  if (now - panelAt > 250) {
    if (rosterSig() !== rosterKey) renderRoster();
    if (!state.people.some((x) => x.id === selected)) selected = state.people[0].id;
    renderPanel(); panelAt = now;
  }
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
    identity(p),
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
      // M16 傷勢：受傷門檻以上才算受傷，條越長傷越重（滿格 = 傷重的兩倍）。
      el('div', { class: 'need', 'data-hurt': hurtText(p) }, el('span', {}, '傷勢'),
        el('span', { class: 'bar' }, el('i', { style: `width:${Math.min(100, 100 * (p.hurt ?? 0) / (2 * INJURY.HEAVY))}%;background:${hurt(p) ? '#b8322a' : '#c9a27a'}` })),
        el('b', {}, hurtText(p))),
      el('h2', {}, '專長'), el('div', { class: 'focus' }, ...FOCUS.map((f) => el('button', {
        class: p.focus === f.id ? 'on' : '', 'data-focus': f.id ?? 'none',
        on: { click: () => { setFocus(state, p.id, f.id); renderPanel(); } },
      }, f.label))),
      ...(DUTY.ON && !p.guest ? [el('h2', {}, `值日：${dutyOf(state, p) ? ROLE[dutyOf(state, p)].label : '沒排'}`),
        el('div', { class: 'focus', 'data-duty-row': '' }, ...[[null, '自動'], ...DUTY.ROLES.map((r) => [r.id, r.label]), ['none', '不排']].map(([id, label]) => el('button', {
          class: (p.dutyPin ?? null) === id ? 'on' : '', 'data-duty': id ?? 'auto',
          on: { click: () => { setDuty(state, p.id, id); renderPanel(); renderRoster(); renderBuild(); } },
        }, label)))] : [])),
    sec('skills', ...SKILLS.map((k) => el('div', { class: 'skill', 'data-skill': k.id }, el('span', {}, k.label),
      el('span', { class: 'bar' }, el('i', { style: `width:${p.skills[k.id]}%` })), el('b', {}, p.skills[k.id].toFixed(0)),
      el('small', {}, effectText(p, k.id))))),
    sec('social', el('h2', {}, `名望 ${prestige(p).toFixed(0)}`),
      kinOf(state, p) ? el('p', { class: 'identity', 'data-kin': p.kin }, `${bondLabel(p, kinOf(state, p))}：${kinOf(state, p).name}`) : '', ...state.people.filter((o) => o !== p).map((o) => el('div', { class: 'rel', 'data-rel': o.id },
      el('span', {}, o.name), el('b', {}, stageOf(state, p, o).label),
      el('small', {}, `我→他 ${aff(state, p, o).toFixed(0)}　他→我 ${aff(state, o, p).toFixed(0)}`)))),
    sec('martial', el('h2', {}, `武力 ${prowess(p).toFixed(1)}`),
      ...moves.map((m) => el('div', { class: 'skill move', 'data-move': m.id, title: m.desc }, el('span', {}, m.label),
        el('span', { class: 'bar' }, el('i', { style: `width:${p.moves[m.id]}%` })), el('b', {}, p.moves[m.id].toFixed(0)),
        el('small', { title: `威力 ${m.power}` }, `${FORMS[formOf(m.id)].label}・${period(p.moves[m.id])} 刻一招`), formPreview(m.id, p.moves[m.id]))),
      el('h2', {}, '四門出招'), formLegend(),
      trialRow(p),
      el('p', { class: 'hint', 'data-comp': '' }, next.length
        ? `快開竅了：練功時每次約 ${Math.round(compChance(p) * 100)}% 領悟${next.map((m) => m.label).join('或')}`
        : `下一招：${MOVES.filter((m) => m.req && !(m.id in p.moves) && Object.keys(m.req).every((k) => k in p.moves)).map((m) => `${m.label}（${Object.entries(m.req).map(([k, v]) => `${moveLabel(k)} ${v}`).join('、')}）`).join('；') || '都會了'}`)),
    sec('story', el('p', { class: 'hint', 'data-habits': '' }, habitText(state, p)),
      ...LIFE_CATS.map((c) => { const v = lifeShares(p)[c.id]; return el('div', { class: 'skill', 'data-life': c.id }, el('span', {}, c.label),
        el('span', { class: 'bar' }, el('i', { style: `width:${Math.round(100 * v)}%` })), el('b', {}, `${Math.round(100 * v)}%`)); }),
      el('div', { class: 'story', 'data-story': '' }, ...(personEvents(state, p).slice(-8).reverse().map((e) => el('p', {}, `${dayText(e.tick)} ${e.text}`)))
        .concat(personEvents(state, p).length ? [] : [el('p', { class: 'hint' }, '還沒有寫進紀事的事。')]))),
    sec('why', el('table', { class: 'why' }, ...why)));
}
const dayText = (tick) => `第${Math.floor(tick / 1440) + 1}日`;

// 身分列：訪客寫來訪與去留考量；同門寫身分與師父。
function identity(p) {
  const bits = [];
  const t = titleOf(state, p);
  if (p.guest) {
    const a = appeal(state, p);
    const hrs = Math.max(0, Math.ceil((p.guest.until - state.tick) / 60));
    bits.push(p.guest.leaving ? '正在下山' : `來訪中，還會待 ${hrs} 小時`);
    bits.push(`${a.join ? '想留下' : '還在猶豫'}：${reasonText(a)}`);
  } else {
    if (t) bits.push(`${state.sect.name}${t}`);
    const m = p.master && state.people.find((x) => x.id === p.master);
    if (m) bits.push(`師父：${m.name}`);
    const pupils = state.people.filter((x) => x.master === p.id).map((x) => x.name);
    if (pupils.length) bits.push(`徒弟：${pupils.join('、')}`);
  }
  return bits.length ? el('p', { class: 'identity', 'data-identity': '' }, bits.join('　')) : '';
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
  snapshot: () => (state ? JSON.parse(JSON.stringify({ tick: state.tick, people: state.people, pois: state.pois, stock: state.stock, counts: state.counts, ledger: state.ledger, sites: state.sites, built: state.built, map: state.map, aff: state.aff, events: state.events, sect: state.sect, decisions: state.decisions, enemies: state.enemies, raids: state.raids, fenceHp: state.fenceHp, nests: state.nests, plots: state.plots, expedition: state.expedition, deer: state.deer ?? null })) : null),
  speed: () => speed,
  labels: () => labelBoxes().map((b) => ({ ...b })),
  selected: () => selected,
  tileToClient: (x, y) => {
    const r = $('#view').getBoundingClientRect();
    return { x: r.left + ((x + 0.5) * TILE / 1280) * r.width, y: r.top + ((y + 0.1) * TILE / 800) * r.height };
  },
};
