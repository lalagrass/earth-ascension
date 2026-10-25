import { artsSvg, setFocus, focusOf, artById, artMul, artState, topTier, chooseVariant, variantOf, stuckAt, breakChance, rustOf, starCost, guizhenOk } from './arts.mjs';
import { ARTS, TIERS, VARIANTS, AURA, BREAK, ACTIVITIES as ACTS2 } from './data.mjs';
import { startExpedition, canExpedition, codexRows, reportText, segAt, ROUTE_END, skipGuide } from './sim.mjs';
import { ROUTE, EXP, ENEMIES } from './data.mjs';
import { outers, skipsChores, emergency, quotaOf, setDuty, setPrio, canPromote, startTrial } from './sim.mjs';
import { CHORE_ACTS, CHORE_NAMES, QUOTA, PRIO, PROMOTE, RANK_NAMES } from './data.mjs';
import { isLabor, disciples, laborers, laborCap, canHire, hire, canInvite, invite, avgAff, togglePause, MATS, moodLabel, moodParts, seasonOf, aff, compat, defaultAnswers, personalityFrom, capacity, canRecruit, recruit, recruitNeed, mapStage, setPost, phaseOf, setStyle, createState, tick, startBuild, startHunt, setOrder, save, load, facDef, facStage, relKey, relStage, speedOf } from './sim.mjs';
import { ECON, ROOT, RES_NAMES, QUESTIONS, TRAITS, MAPS, POSTS, HABITAT, STYLES, NODES, EDGES, FACILITIES, ACTIVITIES, MOVES, MONSTERS } from './data.mjs';
import { EXP_STYLES } from './data.mjs';
import { styleOf, teamStyle } from './expedition.mjs';
import { openStart, choiceUI, heroCard } from './start-ui.mjs';
import { UNLOCKS, ALL_SECS, secOpen, CHAPTER1, AUTO, autosave, autoList, autoGet } from './slice.mjs';
import { MANUALS, canAssemble, assemble, learnManual, likesOf, menuOf, aspOf, ASPIRATIONS, statusIcon } from './v10.mjs';
import { routeSeg, segIndex, campsOpen, scoutOf, peaceOf } from './expedition.mjs';
import { CAMPS, ENDLESS } from './data.mjs';
import { think as think10 } from './mind.mjs';
import { SFX, ambient, setMute, isMuted, cuesFrom } from './audio.mjs';
const cv = document.getElementById('map'), g = cv.getContext('2d');
const IMG = {}; const names = ['ground', 'hall_s0', 'hall_s1', 'dorm_s0', 'dorm_s1', 'log', 'herb', 'pine', 'bamboo', 'boar', 'rat', 'hero', 'cousin', 'senior', 'master', 'bench', 'wood', 'vat', 'grass', 'woodpile', 'kitchen_s1', 'map_s0', 'map_s1', 'map_s2'];
await Promise.all(names.map((n) => new Promise((r) => { const i = new Image(); i.onload = r; i.onerror = r; i.src = `assets/${n}.${n === 'ground' || n.startsWith('map_') ? 'jpg' : 'png'}`; IMG[n] = i; })));
let S = createState(Date.now() % 100000 | 0), speed = 1, starting = true;
const newGame = () => { starting = true; openStart((spec) => { S = createState(Date.now() % 100000 | 0, spec); starting = false; panel(); }); };
window.__sect = { get S() { return S; }, set speed(v) { speed = v; }, freeze: false, panel: () => panel(), get starting() { return starting; } };
const ACT_ICON = { quarry: '⛏', spar: '🤺', cook: '🍲', deliver: '📦', rest: '💤', eat: '🍚', farm: '🌱', forage: '🌿', chop: '🪓', train: '掌', learn: '📜', build: '🔨', chat: '💬', hunt: '⚔', strike: '⚔', trial: '⚔' };
function draw() {
  const shake = S.fx.find((f) => f.kind === 'shake'); g.save(); if (shake) g.translate((Math.random() - 0.5) * 12 * shake.ttl / 0.35, (Math.random() - 0.5) * 12 * shake.ttl / 0.35);
  { const on = performance.now() < cam.until, k = 0.08; cam.z += ((on ? 1.6 : 1) - cam.z) * k; if (on) { cam.x += (cam.tx - cam.x) * k * 2; cam.y += (cam.ty - cam.y) * k * 2; } else if (cam.z < 1.02) { cam.x = 800; cam.y = 450; cam.z = 1; }
    if (cam.z > 1.001) { const cx = Math.min(1600 - 800 / cam.z, Math.max(800 / cam.z, cam.x)), cy = Math.min(900 - 450 / cam.z, Math.max(450 / cam.z, cam.y)); g.translate(800, 450); g.scale(cam.z, cam.z); g.translate(-cx, -cy); } }
  const ms = mapStage(S); g.drawImage(IMG[MAPS[ms]], 0, 0, 1600, 900);
  if (window.__debugRoads) { g.strokeStyle = 'rgba(200,60,40,.6)'; g.lineWidth = 3; for (const [a, b] of EDGES) { g.beginPath(); g.moveTo(...NODES[a]); g.lineTo(...NODES[b]); g.stroke(); } }
  const items = [];
  for (const f of FACILITIES) {
    const st = facStage(S, f.id), [x, y] = NODES[f.node], fs = S.fac[f.id];
    items.push({ y: y - 1, f: () => {
      if (f.id === 'yard') { g.fillStyle = 'rgba(180,150,100,.35)'; if (st.dummies) { g.beginPath(); g.ellipse(x, y, 45, 20, 0, 0, 7); g.fill(); }
        for (let k = 0; k < (st.dummies || 0); k++) { const dx = x - 30 + k * 26, dy = y + 4; g.fillStyle = '#6b4a2a'; g.fillRect(dx - 2, dy - 24, 5, 24); g.fillRect(dx - 8, dy - 19, 16, 3); g.fillRect(dx - 7, dy - 12, 14, 3); } }
      label(`${f.name}・${st.name}`, x, y + 22, '#3a2f24');
      if (fs.site) { const s = fs.site; label(`${s.paused ? '⏸暫停 ' : '工地 '}${MATS.filter((k) => s.need[k]).map((k) => `${RES_NAMES[k]}${s.delivered[k]}/${s.need[k]}`).join(' ')} 工${s.work.toFixed(0)}/${s.workNeed}s`, x, y + 46, '#a0461e');
        for (let k = 0; k < s.delivered.wood; k++) { g.fillStyle = '#8b5a2b'; g.fillRect(x - 46 + (k % 6) * 6, y + 52 - Math.floor(k / 6) * 4, 5, 3); }
        for (let k = 0; k < s.delivered.stone; k++) { g.fillStyle = '#8c8c8c'; g.beginPath(); g.arc(x + 16 + (k % 6) * 6, y + 54 - Math.floor(k / 6) * 4, 2.6, 0, 7); g.fill(); } }
      if (f.id === 'quarry') { g.fillStyle = '#9a9a92'; for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(x - 30 + k * 10, y + 4 - (k % 3) * 5, 8, 5, 0, 0, 7); g.fill(); } }
      if (f.id === 'shed' && fs.stage === 0) { g.strokeStyle = 'rgba(120,80,40,.6)'; g.setLineDash([4, 3]); g.strokeRect(x - 26, y - 20, 52, 26); g.setLineDash([]); }
    } });
  }
  items.push({ y: NODES.hall[1], f: () => sprite('master', NODES.hall[0] + 30, NODES.hall[1] - 6, SC) });
  for (const w of S.wild) items.push({ y: w.pos[1], f: () => { g.save(); g.globalAlpha = 0.85; g.translate(w.pos[0], w.pos[1]); g.scale(-(w.face || 1), 1); const i = IMG[MONSTERS[w.k].sprite]; g.drawImage(i, -i.width * SC / 2, -i.height * SC, i.width * SC, i.height * SC); g.restore(); } });
  for (const [k, n] of Object.entries(POSTS)) items.push({ y: NODES[k][1], f: () => { g.fillStyle = S.post === k ? '#c0392b' : 'rgba(120,80,40,.5)'; g.beginPath(); g.moveTo(NODES[k][0], NODES[k][1] - 40); g.lineTo(NODES[k][0] + 18, NODES[k][1] - 33); g.lineTo(NODES[k][0], NODES[k][1] - 26); g.fill(); g.fillRect(NODES[k][0] - 1, NODES[k][1] - 40, 2, 40); } });
  for (const m of S.mons) items.push({ y: m.pos[1], f: () => { sprite(MONSTERS[m.k].sprite, m.pos[0], m.pos[1], SC); if (!m.raid) hp(m.pos[0], m.pos[1] - 30, m.hp / m.max, '#a33'); else label('下山拱菜', m.pos[0], m.pos[1] - 40, '#a33'); } });
  for (const d of S.ds) if (!d.away) items.push({ y: d.pos[1], f: () => {
    const bob = d.path.length ? Math.sin(S.t * 10) * 2 : 0, [x, y] = d.pos;
    { const tt = topTier(d); if (tt.t >= 4) { const c = AURA[tt.a.school], gr = g.createRadialGradient(x, y - 20, 4, x, y - 20, 34 + Math.sin(S.t * 4) * 3); gr.addColorStop(0, c + 'aa'); gr.addColorStop(1, c + '00'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y - 20, 36, 42, 0, 0, 7); g.fill(); } }
    if (d.task?.act === 'meditate' && d.task.phase === 'do') { const A = ACTS2.meditate, pr = Math.min(1, d.task.timer / A.dur);
      for (let k = 0; k < 10; k++) { const an = S.t * 3 + k * 0.63, rr = 26 + 6 * Math.sin(S.t * 2 + k); g.fillStyle = `rgba(120,170,230,${0.35 + 0.4 * ((k % 3) / 3)})`; g.beginPath(); g.arc(x + Math.cos(an) * rr, y - 22 + Math.sin(an) * rr * 0.6, 2.5, 0, 7); g.fill(); }
      g.strokeStyle = '#0003'; g.lineWidth = 5; g.beginPath(); g.arc(x, y - 70, 12, 0, 7); g.stroke(); g.strokeStyle = '#4a90d9'; g.beginPath(); g.arc(x, y - 70, 12, -Math.PI / 2, -Math.PI / 2 + pr * Math.PI * 2); g.stroke(); label('衝關', x, y - 88, '#2a5a9a'); }
    g.save(); g.translate(x, y + bob); if (d.face < 0) g.scale(-1, 1); if (d.anim === 'strike') g.rotate(0.15);
    if (d.task?.phase === 'do' && d.anim === 'rest') g.rotate(-1.3);
    const im = IMG[d.sprite]; g.drawImage(im, -im.width * SC / 2, -im.height * SC, im.width * SC, im.height * SC); g.restore();
    if (d.carry?.stone) { g.fillStyle = '#8c8c8c'; g.beginPath(); g.arc(x + 10, y - 26, 6, 0, 7); g.fill(); } else if (d.carry) sprite('wood', x + 10, y - 18, 0.6);
    if (isLabor(d)) { g.fillStyle = '#2f6f9f'; g.fillRect(x - 9, y - IMG[d.sprite].height * SC + 4, 18, 4); }
    label(`${d.name}${isLabor(d) ? '（工）' : d.role === 'outer' ? '（外門）' : d.role === 'head' ? '（首徒）' : ''} ${statusIcon(d, d.task?.act === 'build' && d.task.phase !== 'do' ? '📦' : ACT_ICON[d.anim || d.task?.act] || '')}`, x, y - (IMG[d.sprite].height * SC + 4), '#222');
    if (S.hunt) hp(x, y - IMG[d.sprite].height * SC - 20, d.hp / 100, '#3a7');
  } });
  // v1.0 庫存畫成地圖上的物件：柴堆、石堆、米袋、藥簍、錢箱（數量越多堆越高）
  { const [bx, by] = NODES.court, R = S.res, piles = [['wood', '#8a5a2b', 'log'], ['stone', '#9a9a9a', 'rock'], ['food', '#e8d9a8', 'sack'], ['herb', '#5f9a3a', 'herb'], ['coin', '#d4a017', 'coin']];
    piles.forEach(([k, c, sh], i) => { const n = Math.min(8, Math.ceil((R[k] || 0) / (k === 'coin' ? 10 : 4))); if (!n) return; const x = bx - 120 + i * 30, y = by + 52;
      items.push({ y, f: () => { for (let j = 0; j < n; j++) { const yy = y - j * 5, xx = x + ((j % 2) * 6 - 3); g.fillStyle = c; g.strokeStyle = '#0006'; g.lineWidth = 1; g.beginPath();
        if (sh === 'log') g.rect(xx - 10, yy - 4, 20, 5); else if (sh === 'sack') g.ellipse(xx, yy - 3, 8, 5, 0, 0, 7); else if (sh === 'coin') g.ellipse(xx, yy - 2, 7, 3, 0, 0, 7); else g.arc(xx, yy - 3, 5.5, 0, 7); g.fill(); g.stroke(); }
        label(`${{ wood: '木', stone: '石', food: '糧', herb: '藥', coin: '錢' }[k]}${Math.floor(R[k])}`, x, y + 14, '#333'); } }); }); }
  items.sort((a, b) => a.y - b.y).forEach((i) => i.f());
  // 菜畦
  S.plots.forEach((p, i) => { const x = NODES.veg[0] + 10 + i * 18, y = NODES.veg[1] + 30; g.fillStyle = p.st === 'empty' ? '#8a6e4b' : p.st === 'ripe' ? '#5f9a3a' : `rgba(110,150,70,${0.3 + 0.5 * p.g / 90})`; g.fillRect(x, y, 15, 8); });
  // 日夜
  const ph = phaseOf(S), dark = ph.id === 'night' ? 0.38 : ph.id === 'dusk' ? 0.15 : ph.id === 'dawn' ? 0.1 : 0;
  if (dark) { g.fillStyle = ph.id === 'dusk' ? `rgba(120,60,30,${dark})` : `rgba(20,30,70,${dark})`; g.fillRect(0, 0, 1600, 900); }
  for (const f of S.fx) {
    if (f.kind === 'shake') continue;
    if (f.kind === 'break') { const k = 1 - f.ttl / 1.2; g.strokeStyle = `rgba(255,215,80,${f.ttl / 1.2})`; g.lineWidth = 5; g.beginPath(); g.arc(f.pos[0], f.pos[1] - 25, 10 + k * 70, 0, 7); g.stroke(); continue; }
    if (f.kind === 'move' && f.tier >= 1 && f.sprite) { const im = IMG[f.sprite]; if (im?.width) for (let k = 1; k <= 2; k++) { g.save(); g.globalAlpha = 0.25 / k * (f.ttl / 0.6); g.translate(f.from[0] - (f.face || 1) * 12 * k, f.from[1]); if ((f.face || 1) < 0) g.scale(-1, 1); g.drawImage(im, -im.width * SC / 2, -im.height * SC, im.width * SC, im.height * SC); g.restore(); } }
    if (f.kind === 'move' && f.tier >= 2 && f.vcolor) { g.save(); g.strokeStyle = f.vcolor; g.lineWidth = 3; g.globalAlpha = Math.min(1, f.ttl); g.setLineDash([6, 4]); g.beginPath(); g.arc(f.to[0], f.to[1] - 10, f.r * 1.4 + (1 - f.ttl) * 20, 0, 7); g.stroke(); g.restore(); }
    if (f.kind === 'move' && f.tier >= 3) { g.save(); g.globalAlpha = Math.min(1, f.ttl * 1.5); g.font = 'bold 44px serif'; g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = '#fff8e8'; g.strokeText(`「${f.name}」`, f.to[0], f.to[1] - 70); g.fillStyle = '#a0281e'; g.fillText(`「${f.name}」`, f.to[0], f.to[1] - 70); g.restore(); }
    if (f.kind === 'move') { g.strokeStyle = f.color; g.lineWidth = 4; g.globalAlpha = f.ttl / 0.6; g.beginPath(); g.moveTo(f.from[0], f.from[1] - 25); g.lineTo(f.to[0], f.to[1] - 8); g.stroke(); g.beginPath(); g.arc(f.to[0], f.to[1] - 10, f.r, 0, 7); g.stroke(); label(f.name, f.from[0], f.from[1] - 60, f.color); g.globalAlpha = 1; }
    else { g.fillStyle = 'rgba(200,40,40,.6)'; g.beginPath(); g.arc(f.pos[0], f.pos[1] - 30, 10, 0, 7); g.fill(); }
  }
  g.restore(); expBar();
}
// v0.95 巡山進度條：地圖上只畫這條（背景模擬，不出現在地圖上）
function expBar() {
  const X = S.exp, R = S.lastExp; if (!X && !R && !S.records?.sect) return;
  const x0 = 360, x1 = 1240, y = 22, W = x1 - x0, END = Math.max(ROUTE_END, X ? X.dist + 100 : 0, (S.records?.sect || 0) + 50), px = (v) => x0 + W * Math.min(1, v / END);
  g.fillStyle = 'rgba(255,248,232,.88)'; g.fillRect(x0 - 70, y - 14, W + 150, 46); g.strokeStyle = '#6b4a2a'; g.strokeRect(x0 - 70, y - 14, W + 150, 46);
  for (let i = 0; i <= segIndex(END - 1) && i < 40; i++) { const r = routeSeg(i); g.fillStyle = r.endless ? (i % 2 ? '#3d3550' : '#4a4060') : ['#b9cf9a', '#7fa36a', '#b39a72', '#6f6a7f', '#8c8a86', '#5a5248', '#c9c2d8'][i]; g.fillRect(px(r.from), y, Math.max(1, px(Math.min(r.to, END)) - px(r.from)), 10); g.fillStyle = '#3a2f24'; g.font = '11px sans-serif'; if (!r.endless || px(r.to) - px(r.from) > 40) g.fillText(r.endless ? `+${i - ROUTE.length + 1}` : r.name, px(r.from) + 3, y + 24); }
  for (const c of CAMPS) { const cx = px(ROUTE[c.seg].to); g.fillStyle = S.camps?.[c.id] ? '#c0392b' : '#9998'; g.beginPath(); g.moveTo(cx, y - 8); g.lineTo(cx - 6, y + 2); g.lineTo(cx + 6, y + 2); g.fill(); }
  g.font = 'bold 13px sans-serif'; g.fillStyle = '#3a2f24'; g.fillText('巡山', x0 - 62, y + 10);
  if (S.records?.sect) { const rx = px(S.records.sect); g.fillStyle = '#c0392b'; g.fillRect(rx - 1, y - 6, 3, 22); g.font = '11px sans-serif'; g.fillText(`★紀錄 ${S.records.sect}`, rx + 4, y - 3); }
  if (X) { const tx = px(X.dist); g.fillStyle = '#1f4e79'; g.beginPath(); g.moveTo(tx, y - 2); g.lineTo(tx - 7, y - 12); g.lineTo(tx + 7, y - 12); g.fill();
    g.fillStyle = '#1f4e79'; g.font = 'bold 12px sans-serif'; g.fillText(`${X.phase === 'out' ? '▶' : '◀ 回程'} ${X.dist.toFixed(0)} 步・${segAt(X.dist).name}`, x1 + 10, y + 10); }
  else if (R) { g.fillStyle = '#555'; g.font = '12px sans-serif'; g.fillText(`上次 ${R.dist} 步`, x1 + 10, y + 10); }
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
  const ph = phaseOf(S); const se = seasonOf(S); $('clock').textContent = `第 ${se.year} 年 ${se.name}・第 ${ph.day} 日・${ph.name}（${Math.floor(S.t % 600)}/600）・${speed}×`;
  $('res').innerHTML = `木 ${S.res.wood}/${S.cap.wood}　石 ${S.res.stone}/${S.cap.stone}　香火錢 ${S.res.coin}　菜 ${S.res.veg}　飯 ${S.res.food}　藥 ${S.res.herb}<div>名聲 ${S.rep}・弟子 ${disciples(S).length}/${capacity(S)} 床・雇工 ${laborers(S).length}/${laborCap(S)}・地圖 ${mapStage(S)}</div><div class="k">菜畦：${S.plots.map((p) => ({ empty: '空', grow: '長', ripe: '熟' })[p.st]).join(' ')}</div>`;
  $('build').innerHTML = FACILITIES.filter((f) => f.stages.length > 1).map((f) => { const st = S.fac[f.id], nx = f.stages[st.stage + 1];
    const cost = nx ? Object.entries(nx.cost).map(([k, v]) => `${RES_NAMES[k]}${v}`).join('・') : '';
    const bundle = st.site ? `<div class="k">收集包：${MATS.filter((k) => st.site.need[k]).map((k) => `${RES_NAMES[k]} ${st.site.delivered[k]}/${st.site.need[k]}${st.site.reserved[k] ? `（在途${st.site.reserved[k]}）` : ''}`).join('　')}｜工時 ${st.site.work.toFixed(0)}/${st.site.workNeed}s</div>${bar(100 * MATS.reduce((a, k) => a + st.site.delivered[k], 0) / Math.max(1, MATS.reduce((a, k) => a + st.site.need[k], 0)), '#a0461e')}` : '';
    return `<div>${f.name}：${f.stages[st.stage].name} ${nx ? (st.site ? `<button data-pause="${f.id}">${st.site.paused ? '復工' : '暫停'}</button>` : `<button data-build="${f.id}" ${(nx.rep && S.rep < nx.rep) || (nx.cost.coin || 0) > S.res.coin ? 'disabled' : ''}>藍圖：${nx.name}（${cost}${nx.rep ? '・名聲' + nx.rep : ''}）</button>`) : '✓'}${bundle}</div>`; }).join('');
  { const c = canHire(S);
    $('labor').innerHTML = `<button id="hire-go" ${c.ok ? '' : 'disabled'}>雇工（香火錢 ${ECON.hireCoin}、糧 ${ECON.hireFood}；日薪 ${ECON.wage}）</button> <span class="k">${c.ok ? `應徵：${c.next.name}` : c.why}</span>` +
      laborers(S).map((d) => { const iv = canInvite(S, d.id);
        return `<div class="card labor"><b>${d.name}</b> <span class="k">${d.task ? (d.task.act === 'build' && d.task.phase !== 'do' ? '搬料' : ACTIVITIES[d.task.act]?.name) : '待命'}｜${d.reason}${d.unpaid ? `｜欠薪 ${d.unpaid} 日` : ''}</span>
        <div class="k">性格：${d.personality.map((p) => d.known.includes(p) ? `<span title="${TRAITS[p].desc}">${TRAITS[p].name}</span>` : '？？').join('、')}｜心情 ${d.mood | 0}｜力氣 ${d.skills.strength.toFixed(0)}</div>
        <div class="k">根骨：${d.rootKnown ? `${'★'.repeat(d.root)}${'☆'.repeat(5 - d.root)} ${ROOT.names[d.root]}` : `？？（共事 ${Math.floor(d.cowork || 0)}/${ROOT.revealAt}）`}｜同門好感 ${avgAff(S, d).toFixed(0)}</div>
        <button data-invite="${d.id}" ${iv.ok ? '' : 'disabled'}>邀入外門</button> <span class="k">${iv.ok ? '可以邀請了！' : iv.why}</span></div>`; }).join('');
    $('hire-go').onclick = () => { hire(S); panel(); }; }
  { const ds = disciples(S), cur = ds.find((d) => d.id === window.__artsOf) || ds[0];
    if (cur) $('arts').innerHTML = `<select data-artsof>${ds.map((d) => `<option value="${d.id}" ${d.id === cur.id ? 'selected' : ''}>${d.name}</option>`).join('')}</select>
      <select data-focus="${cur.id}"><option value="">專修：自動（${artById(focusOf(cur) || 'basicFist').name}）</option>${Object.keys(cur.arts).map((id) => `<option value="${id}" ${cur.focus === id ? 'selected' : ''}>專修：${artById(id).name}</option>`).join('')}</select>
      <div class="k">悟性 ${cur.rootKnown ? `${cur.wu ?? cur.root}（${ROOT.names[cur.wu ?? cur.root]}）` : '未明'}｜${ARTS.filter((a) => cur.arts[a.id]).map((a) => `${a.name}×${artMul(cur, a).toFixed(2)}`).join('・')}</div>${artsSvg(cur)}
      ${ARTS.filter((a) => cur.arts[a.id]).map((a) => { const r = cur.arts[a.id], st = stuckAt(cur, a, S.t), t = artState(cur, a).tier, va = variantOf(cur, a.id, S.t), rust = rustOf(r, S.t);
        return `<div class="k artrow">${a.name}・${TIERS[t][1]} ${r.xp.toFixed(1)}${r.guizhen ? `・歸真 ${'★'.repeat(Math.min(r.stars || 0, 10))}${(r.stars || 0) > 10 ? '+' + (r.stars - 10) : ''}（${(r.sxp || 0).toFixed(1)}/${starCost(r)}）` : ''}${st ? `・<b style="color:#2a5a9a">瓶頸${st === 3 ? '（可歸真）' : ''}，衝關成功率 ${Math.round(breakChance(cur) * 100)}%${cur.mood < BREAK.moodMin || cur.needs.energy < BREAK.energyMin ? '（心情或精力不足）' : ''}</b>` : (r.btCd || 0) > S.t ? `・衝關冷卻 ${Math.ceil(r.btCd - S.t)}s` : ''}${rust > 0.01 ? `・荒疏 −${Math.round(rust * 100)}%` : ''}
          ${t >= 2 ? `<select data-variant="${cur.id}|${a.id}"><option value="">大成變式：未選</option>${VARIANTS[a.school].map((v) => `<option value="${v.id}" ${r.variant === v.id ? 'selected' : ''}>${v.name}</option>`).join('')}</select>${r.variant && !va ? '（換路重練中）' : ''}` : ''}</div>`; }).join('')}
      <div class="k">${ARTS.filter((a) => !a.secret && artState(cur, a).st === 'locked').map((a) => `${a.name}：${artState(cur, a).why}`).join('；') || '全部解鎖'}</div>`; }
  { const os = outers(S), hero = S.ds.find((d) => d.id === 'hero'), em = emergency(S);
    $('ranks').innerHTML = `<div class="k">首徒：${hero?.role === 'head' ? `主角（練功 ×${QUOTA.headTrain}）` : `未立（需外門 ≥${QUOTA.outerMin} 人且日課完成率 ≥${QUOTA.headRate * 100}%；目前外門 ${os.length}、昨日完成率 ${S.choreRate == null ? '—' : Math.round(S.choreRate * 100) + '%'}）`}</div>
      <div class="k">內門：${S.ds.filter((d) => d.role === 'inner' || d.role === 'head').map((d) => d.name).join('、')}｜${em ? '<b style="color:#b33">危機：內門暫時回來幫忙雜務</b>' : os.length >= QUOTA.outerMin ? '內門免雜務、專心練功' : `外門未滿 ${QUOTA.outerMin} 人，內門仍分擔雜務`}</div>` +
      (os.length ? os.map((d) => { const pc = canPromote(S, d.id), q = quotaOf(d);
        return `<div class="card outer"><b>${d.name}</b>（外門） <span class="k">日課 ${d.chore || 0}/${q}${d.choreDebt ? `（含順延 ${d.choreDebt}）` : ''}・貢獻 ${d.contrib || 0}・根骨 ${d.rootKnown ? '★'.repeat(d.root) + ROOT.names[d.root] : '？？'}</span>${bar(Math.min(100, 100 * (d.chore || 0) / q), '#5a9')}
        <div class="k">職司：${CHORE_ACTS.map((a) => `<label><input type="checkbox" data-duty="${d.id}" value="${a}" ${d.duties.includes(a) ? 'checked' : ''}>${CHORE_NAMES[a]}</label>`).join(' ')}
        ｜優先 <select data-prio="${d.id}">${Object.entries(PRIO).map(([k, [, n]]) => `<option value="${k}" ${d.prio === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <button data-promote="${d.id}" ${pc.ok ? '' : 'disabled'}>切磋考核入內門</button> <span class="k">${pc.ok ? `主考：${pc.ex.name}・門檻 ${PROMOTE.pass}` : pc.why}${d.trialScore ? `｜上次 ${d.trialScore}` : ''}</span></div>`; }).join('') : '<div class="k">尚無外門弟子（招收或邀雇工入門）</div>');
  }
  { const L = S.ledger, P = S.ledgerPrev, row = (x) => Object.entries(x).filter(([, v]) => v).map(([k, v]) => `${RES_NAMES[k] || k}${v}`).join('・') || '—';
    $('ledger').innerHTML = `<div class="k">今日（第 ${L.day} 日）收：${row(L.in)}</div><div class="k">今日支：${row(L.out)}</div>${P ? `<div class="k">昨日收：${row(P.in)}｜支：${row(P.out)}</div>` : ''}<div class="k">明晨預計：香火 +${ECON.coinBase + Math.floor(S.rep / ECON.coinPerRep)}・工錢 −${laborers(S).length * ECON.wage}</div>`; }
  const eco = `山中：山鼠 ${S.eco.rat.n}・野豬 ${S.eco.boar.n}`;
  $('hunt').innerHTML = S.hunt ? `${eco}<div>進行中（${POSTS[S.hunt.post]}）第 ${S.hunt.wave + 1}/${S.hunt.waves} 波：擊退 ${S.hunt.kills}・溜走 ${S.hunt.escaped}</div>` :
    `${eco}<div>守點：<select id="post">${Object.entries(POSTS).map(([k, n]) => `<option value="${k}" ${S.post === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div>${disciples(S).map((d) => `<label><input type="checkbox" class="hteam" value="${d.id}" ${(window.__team ||= new Set(['hero', 'senior'])).has(d.id) ? 'checked' : ''}>${d.name}</label>`).join(' ')}</div>
    <button id="hunt-go">上山狩獵（${3} 波）</button><div class="k">${S.lastReport || '尚無戰報'}</div>`;
  { const X = S.exp, team = (window.__exTeam ||= new Set(['hero', 'senior'])), thr = window.__exThr ?? EXP.thrDefault, R = S.lastExp;
    const nm = (o) => Object.entries(o || {}).map(([k, v]) => `${ENEMIES[k].name}×${v}`).join('、') || '無';
    const card = R ? `<div class="card"><b>戰報 #${R.n}</b>（第 ${R.day} 日・${R.team.join('、')}）<div>📏 走到 <b>${R.seg}</b> ${R.dist} 步${R.sectRec ? ' <span class="rec">★本門新紀錄</span>' : ''}</div><div>⚔ 擊倒：${nm(R.kills)}</div><div>💨 逃走：${nm(R.escaped)}</div><div>🩹 傷：${R.hurt.map(([n, l]) => n + l).join('、') || '無'}</div><div>🎒 帶回：${Object.entries(R.loot).map(([k, v]) => `${RES_NAMES[k] || k}${v}`).join(' ') || '無'}</div><div>↩ 回頭：${R.reason}</div>${R.style ? `<div>🧭 風格：<b>${EXP_STYLES[R.style].name}</b>・閃避 ${Object.values(R.evaded).reduce((a, b) => a + b, 0)}・追擊 ${R.chase.got}/${R.chase.n}・用時 ${R.time}s</div><div>🗺 清場率：${Object.entries(R.clear).map(([k, v]) => `${ROUTE.find((g) => g.id === k).name} ${Math.round(v * 100)}%${v >= 1 ? '（清山）' : ''}`).join('・') || '—'}</div><div class="story">📜 ${R.story}</div>` : ''}</div>` : '<div class="k">尚未巡山</div>';
    const sty = [...team].map((id) => S.ds.find((d) => d.id === id)).filter(Boolean), styHtml = sty.length ? `<div class="k">隊伍風格：<b>${EXP_STYLES[teamStyle(sty)].name}</b>（多數決）｜${sty.map((d) => { const o = styleOf(d); return `${d.name}${EXP_STYLES[o.id].name}：${o.why}`; }).join('；')}</div>` : '';
    const rec = `${manualHtml()}<div class="k">清場紀錄：${ROUTE.map((g) => `${g.name}${Math.round((S.records.clear?.[g.id] || 0) * 100)}%${S.records.qing?.[g.id] ? `・清山${S.records.qing[g.id]}次${peaceOf(S, g.id) ? '☮' : ''}` : ''}`).join('　')}${S.records.fastGorge != null ? `・最快到深谷 ${S.records.fastGorge}s` : ''}</div><div class="k">本門最遠：${S.records.sect || 0} 步${S.records.who ? `（${S.records.who.join('、')}）` : ''}・個人：${disciples(S).map((d) => `${d.name} ${d.best || 0}`).join('・')}</div>`;
    $('exp').innerHTML = X ? `<div>巡山中 #${X.n}：${X.team.map((id) => S.ds.find((d) => d.id === id)?.name).join('、')}・${EXP_STYLES[X.style]?.name || ''}・${X.phase === 'out' ? '前進' : '回程'} ${X.dist.toFixed(0)} 步（${segAt(X.dist).name}）・乾糧 ${X.supplies}・撤退線 ${X.thr * 100}%</div><div class="k">${rbar('體力', X.sta, EXP.sta, '#3a7')} ${rbar(`耐性${X.order ? '（巡山令）' : ''}`, X.pat, X.patMax || 100, '#c80')}${X.scout ? `　探路：${X.scout}（先手 +20%）` : ''}${X.camp ? `　自${X.camp}出發` : ''}</div><div class="k">擊倒 ${nm(X.kills)}｜逃走 ${nm(X.escaped)}｜閃過 ${nm(X.evaded)}｜追 ${X.chase?.got || 0}/${X.chase?.n || 0}</div>${rec}${card}` :
      `<div>${disciples(S).map((d) => `<label><input type="checkbox" class="xteam" value="${d.id}" ${team.has(d.id) ? 'checked' : ''}>${d.name}${d.hp < EXP.minHp ? '（傷）' : ''}</label>`).join(' ')}</div>
      ${styHtml}<div>撤退線：<select id="exthr">${EXP.thr.map((v) => `<option value="${v}" ${v === thr ? 'selected' : ''}>氣血 ${v * 100}%</option>`).join('')}</select>（心情 &lt;${EXP.moodMin} 也會回頭）</div>
      <div>乾糧：<input id="exsup" type="number" min="0" max="${Math.max(1, team.size) * EXP.supplyMax}" value="${window.__exSup ?? Math.max(1, team.size) * EXP.supplyPer}" style="width:3em"> 份（庫存糧 ${Math.floor(S.res.food)}）
      目標：<select id="extgt">${[...ROUTE.map((r) => [r.to, `${r.name}盡頭 ${r.to}`]), ['inf', '不設限（無盡）']].map(([v, n]) => `<option value="${v}" ${String(window.__exTgt ?? ROUTE[ROUTE.length - 1].to) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select>
      出發：<select id="exfrom"><option value="">山門</option>${campsOpen(S).map((c) => `<option value="${c.id}" ${window.__exFrom === c.id ? 'selected' : ''}>${c.name}（${ROUTE[c.seg].to} 步，多帶 ${EXP.campCarry}/人）</option>`).join('')}</select>
      巡山令：<select id="exord"><option value="">照性格</option>${Object.entries(EXP_STYLES).map(([k, v]) => `<option value="${k}" ${window.__exOrd === k ? 'selected' : ''}>強令${v.name}</option>`).join('')}</select>
      <span class="k">${window.__exOrd ? '（不合性格者心情 −6、主角違心；耐性上限 ×0.7）' : ''}${(() => { const sc = scoutOf(sty); return sc ? `　探路：${sc.name}（先手 +20%）` : ''; })()}</span></div>
      <button id="exp-go">派出巡山（${team.size} 人）</button> <span class="k">${canExpedition(S, [...team]).why || ''}</span>${rec}${card}`;
    if (!X) { $('exp-go').onclick = () => { const r = startExpedition(S, [...team], { thr, supplies: +$('exsup').value, target: $('extgt').value === 'inf' ? 'inf' : +$('extgt').value, from: $('exfrom').value || null, order: $('exord').value || null }); if (!r.ok) alert(r.why); panel(); }; $('exsup').onchange = (e) => { window.__exSup = +e.target.value; }; $('extgt').onchange = (e) => { window.__exTgt = e.target.value; }; $('exfrom').onchange = (e) => { window.__exFrom = e.target.value; }; $('exord').onchange = (e) => { window.__exOrd = e.target.value; panel(); }; $('exthr').onchange = (e) => { window.__exThr = +e.target.value; }; document.querySelectorAll('.xteam').forEach((c) => (c.onchange = () => { c.checked ? team.add(c.value) : team.delete(c.value); panel(); })); }
    $('codex').innerHTML = `<table class="codex"><tr><th>敵人</th><th>類</th><th>兵器</th><th>血</th><th>見/倒/逃</th><th>觀破</th></tr>${codexRows(S).map((r) => r.unknown ? `<tr class="k"><td>？？？</td><td colspan="5">未曾照面</td></tr>` : `<tr><td>${r.name}</td><td>${r.kind}</td><td>${r.weapon}</td><td>${r.hp}</td><td>${r.seen}/${r.kills}/${r.fled}</td><td>${r.insight}・${r.tier}</td></tr>`).join('')}</table>`;
    const G = S.guide; $('guide').innerHTML = G?.on && G.msg ? `<div class="guide">${G.msg}<div><button id="g-ok">知道了</button> <button id="g-off">略過所有導引</button></div></div>` : '';
    if (G?.on && G.msg) { $('g-ok').onclick = () => { skipGuide(S); panel(); }; $('g-off').onclick = () => { skipGuide(S, true); panel(); }; }
    $('pace').innerHTML = [['trial', '第1日 黃昏試煉'], ['firstExp', '第2日 第一次巡山'], ['firstBuild', '第3日 第一次動工']].map(([id, n]) => `<span class="mv ${S.pace.done.includes(id) ? 'new' : ''}">${S.pace.done.includes(id) ? '✔' : '○'} ${n}</span>`).join('') + (S.chapter?.done ? `<span class="mv new">✔ ${CHAPTER1.name}</span>` : CHAPTER1.goals.map((g) => `<span class="mv ${g.ok(S) ? 'new' : ''}">${g.ok(S) ? '✔' : '◇'} ${g.name}</span>`).join('')); }
  sliceUI();
  if (!S.hunt) { $('hunt-go').onclick = () => startHunt(S, [...window.__team]); $('post').onchange = (e) => setPost(S, e.target.value); document.querySelectorAll('.hteam').forEach((c) => (c.onchange = () => { c.checked ? window.__team.add(c.value) : window.__team.delete(c.value); })); }
  { const c = canRecruit(S); let qa = '';
    if (c.ok) { const key = c.next.id; if (window.__ansFor !== key) { window.__ans = defaultAnswers(c.next); window.__ansFor = key; }
      const pr = personalityFrom(c.next, window.__ans);
      qa = `<div class="qa"><b>三問心印・${c.next.name}</b>${QUESTIONS.map((q, i) => `<div class="k">${q.q} <select data-q="${i}">${q.a.map(([t], j) => `<option value="${j}" ${window.__ans[i] === j ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`).join('')}<div class="k">將成為：${pr.known.map((t) => TRAITS[t].name).join('、')}${pr.personality.length > pr.known.length ? '＋一項天性（相處後揭露）' : ''}（不改就用預選）</div></div>`; }
    $('recruit').innerHTML = `${qa}<button id="rec-go" ${c.ok ? '' : 'disabled'}>招收弟子（名聲 ${recruitNeed(S)}、糧 3）</button> <span class="k">${c.ok ? '' : c.why}</span>`;
    $('rec-go').onclick = () => { recruit(S, window.__ans); panel(); }; }
  $('ds').innerHTML = disciples(S).map((d) => `<div class="card"><b>${d.name}</b> <span class="k">${(() => { const L = likesOf(d), a = aspOf(d); return `愛吃${L.food}・愛喝${L.drink}${a ? `｜志向「${ASPIRATIONS[a.id].name}」${a.done ? '✔' : `：${ASPIRATIONS[a.id].goal}`}` : ''}`; })()}</span><br><span class="k">${d.adult ? '' : '（少年）'}（${RANK_NAMES[d.role] || '內門'}）${d.task ? (ACTIVITIES[d.task.act]?.name || (d.task.act === 'trial' ? '試煉' : '狩獵')) : '待命'}｜${d.reason}</span>
   <div class="k">性格：${d.personality.map((p) => d.known.includes(p) ? `<span title="${TRAITS[p].desc}">${TRAITS[p].name}</span>` : '<span title="相處久了才看得出來">？？</span>').join('、')}｜心情 ${d.mood | 0}（${moodLabel(d.mood)}）</div>${bar(d.mood, '#6a8cc7')}<div class="k" title="心情目標的組成">${moodParts(d, S).slice(1).map(([t, v]) => [d.personality.some((p) => !d.known.includes(p) && TRAITS[p].name === t) ? '某種天性' : t, v]).map(([t, v]) => `${t}${v > 0 ? '+' : ''}${v}`).join('・') || '—'}</div>
   <details class="why"><summary>為什麼${d.task ? (ACTIVITIES[d.task.act]?.name || (d.task.act === 'trial' ? '試煉' : '狩獵')) : '待命'}？</summary>${(d.why || []).map((w, i) => `<div class="k">${i + 1}. ${ACTIVITIES[w.act]?.name || w.act} <b>${w.score}</b> = 基礎${w.f.base.toFixed(0)}×作息${w.f.sched}×${w.f.text ? `［${w.f.text}］` : `性格${w.f.trait.toFixed(2)}×心情${w.f.mood}`}＋雜訊${w.f.noise.toFixed(0)}｜${w.why}</div>`).join('') || '<div class="k">玩家指派或尚未決策</div>'}</details>
   <div class="k">精力 ${d.needs.energy | 0}</div>${bar(d.needs.energy, '#d9a441')}<div class="k">飽足 ${d.needs.hunger | 0}</div>${bar(d.needs.hunger, '#7aa35a')}<div class="k">交流 ${d.needs.social | 0}</div>${bar(d.needs.social, '#c77')}<div class="k">樂趣 ${(d.needs.fun ?? 0) | 0}</div>${bar(d.needs.fun ?? 0, '#a07ac7')}
   ${d.growMul ? `<div class="k">練功倍率（${artById(d.growMul.art)?.name}）×${d.growMul.total.toFixed(2)} = 天賦${d.growMul.talent.toFixed(2)}×狀態${d.growMul.state.toFixed(2)}×外部${d.growMul.ext.toFixed(2)}${d.growMul.gate < 1 ? `×悟性門檻${d.growMul.gate}` : ''}</div>` : ''}<div class="k">主修 ${STYLES[d.style]}・掌 ${d.skills.palm.toFixed(1)}・腿 ${d.skills.leg.toFixed(1)}・腳力 ${d.skills.agility.toFixed(1)}（${speedOf(d).toFixed(0)}px/s）・力氣 ${d.skills.strength.toFixed(1)}・農 ${d.skills.farming.toFixed(1)}・廚 ${d.skills.cooking.toFixed(1)}</div>
   <div>${d.moves.map((m) => `<span class="mv">${MOVES.find((x) => x.id === m).name}</span>`).join('')}${d.pendingArt ? `<span class="mv new">可學：${artById(d.pendingArt).name}</span>` : ''}</div>
   <select data-style="${d.id}">${Object.entries(STYLES).map(([k, n]) => `<option value="${k}" ${d.style === k ? 'selected' : ''}>主修${n}</option>`).join('')}</select>
   <select data-ord="${d.id}">${ORD.map(([k, n]) => `<option value="${k}" ${(d.order || '') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`).join('');
  $('rel').innerHTML = Object.entries(S.rel).map(([k, v]) => { const [a, b] = k.split('|').map((id) => S.ds.find((d) => d.id === id).name); const [A, B] = k.split('|').map((id) => S.ds.find((d) => d.id === id)); return `<div>${a}—${b}：${relStage(v)} ${v.toFixed(0)}${S.families.includes(k) ? ' 🏠' : ''} <span class="k">（${a}→${aff(S, A, B).toFixed(0)}／${b}→${aff(S, B, A).toFixed(0)}・合拍 ${compat(A, B).toFixed(1)}/${compat(B, A).toFixed(1)}）</span></div>`; }).join('');
  $('hero').innerHTML = heroCard(S);
  $('log').innerHTML = S.log.slice(0, 30).map((l) => `<li>[${l.t}s] ${l.msg}</li>`).join('');
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-build],[data-speed],[data-pause],[data-invite],[data-promote]'); if (!b) return; if (b.dataset.promote) startTrial(S, b.dataset.promote); if (b.dataset.pause) togglePause(S, b.dataset.pause); if (b.dataset.invite) invite(S, b.dataset.invite); if (b.dataset.build) startBuild(S, b.dataset.build); if (b.dataset.speed) speed = +b.dataset.speed; panel(); });
document.addEventListener('change', (e) => { if (e.target.dataset.variant) { const [id, art] = e.target.dataset.variant.split('|'); const d = S.ds.find((x) => x.id === id); if (d && e.target.value) chooseVariant(d, art, e.target.value, S.t); panel(); return; } if ('artsof' in e.target.dataset) { window.__artsOf = e.target.value; panel(); return; } if (e.target.dataset.focus) { setFocus(S, e.target.dataset.focus, e.target.value || null); panel(); return; } if (e.target.dataset.q) { window.__ans[+e.target.dataset.q] = +e.target.value; panel(); return; } if (e.target.dataset.duty) { setDuty(S, e.target.dataset.duty, e.target.value, e.target.checked); panel(); return; } if (e.target.dataset.prio) { setPrio(S, e.target.dataset.prio, e.target.value); panel(); return; } if (e.target.dataset.style) setStyle(S, e.target.dataset.style, e.target.value); if (e.target.dataset.ord) { setOrder(S, e.target.dataset.ord, e.target.value || null); panel(); } });
$('save').onclick = () => { localStorage.setItem('solo-sect-save', save(S)); alert('已存檔'); };
$('load').onclick = () => { const r = load(localStorage.getItem('solo-sect-save') || ''); if (r.ok) S = r.state; else alert(r.err); panel(); };
$('reset').onclick = () => newGame();
$('load').addEventListener('click', () => { if (document.getElementById('start')) { document.getElementById('start').remove(); starting = false; } });
let last = performance.now(), acc = 0;
function loop(now) { acc += Math.min(0.5, (now - last) / 1000) * speed; last = now; if (starting || choiceUI(S)) acc = 0; while (acc >= 0.25) { tick(S); acc -= 0.25; }
  audioStep(); draw(); if (now - lastPanel > 400 && !window.__sect.freeze && !document.activeElement?.matches('select,input')) { panel(); lastPanel = now; } requestAnimationFrame(loop); }
function rbar(n, v, max, c) { const p = Math.max(0, Math.min(1, (v ?? 0) / (max || 1))); return `${n} <span style="display:inline-block;width:80px;height:8px;background:#ddd;vertical-align:middle"><span style="display:block;height:8px;width:${p * 80}px;background:${c}"></span></span> ${Math.max(0, Math.round(v ?? 0))}`; }
function manualHtml() {
  const ms = S.manuals || [], ps = Object.keys(MANUALS);
  return `<div class="k">秘笈殘章：${ps.map((k) => `${k === 'page1' ? '凡階' : '精階'} ${S.res[k] || 0}/${MANUALS[k].need} <button data-asm="${k}" ${canAssemble(S, k) ? '' : 'disabled'}>湊成${MANUALS[k].name}</button>`).join('　')}${ms.map((m, i) => `<div>📜《${ARTS.find((a) => a.id === m.art).name}》<select data-lm="${i}"><option value="">指定研讀…</option>${disciples(S).filter((d) => !d.arts?.[m.art]).map((d) => `<option value="${d.id}">${d.name}</option>`).join('')}</select></div>`).join('')}</div>`;
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-asm]'); if (b) { assemble(S, b.dataset.asm); panel(); } });
document.addEventListener('change', (e) => { const s = e.target.closest('[data-lm]'); if (s && s.value) { const r = learnManual(S, +s.dataset.lm, s.value, think10); if (!r.ok) alert(r.why); panel(); } });
// v1.0 鏡頭：大事件短暫拉近
const cam = { x: 800, y: 450, z: 1, tx: 800, ty: 450, until: 0 };
export function camFocus(x, y, sec = 2.5) { cam.tx = x; cam.ty = y; cam.until = performance.now() + sec * 1000; }
window.__camFocus = camFocus;
// v0.98 垂直切片：面板漸進解鎖、章節總結、自動存檔、匯出入、音效
function sliceUI() {
  for (const sec of ALL_SECS) { const el = $(sec); if (!el) continue; const on = secOpen(S, sec), h = el.previousElementSibling; el.hidden = !on; if (h?.tagName === 'H2') { h.hidden = !on; h.classList.toggle('fresh', on && S.newUnlock?.secs?.includes(sec) && S.t - S.newUnlock.t < 60); } }
  const locked = UNLOCKS.filter((u) => S.unlock && !S.unlock.includes(u.id));
  $('locks').innerHTML = locked.length ? `尚未開放：${locked.map((u) => (u.msg || '基本').split('：')[0]).join('、')}` : '';
  $('autos').innerHTML = `<option value="">— 自動存檔 —</option>` + autoList(localStorage).map((a) => `<option value="${a.i}">第${a.day}日 ${a.name || ''}（${new Date(a.at).toLocaleTimeString()}）</option>`).join('');
  $('mute').textContent = isMuted() ? '🔇 靜音' : '🔊 音效';
  if (S.chapter?.done && !S.chapter.seen && !$('chap')) chapterModal();
}
function chapterModal() {
  const m = S.chapter.summary, d = document.createElement('div'); d.id = 'chap'; d.className = 'overlay';
  d.innerHTML = `<div class="card"><h2>${CHAPTER1.name}・完成</h2><p>第 ${m.day} 日，山門總算立住了。</p><ul><li>門下：${m.people.join('、')}（${m.people.length} 人）</li><li>名聲 ${m.rep}・巡山最遠 ${m.best} 步・出巡 ${m.exps} 次</li><li>擊倒敵人 ${m.kills}・清場紀錄 ${m.qing}</li><li>庫存：錢 ${Math.round(m.coin)}・糧 ${Math.round(m.food)}</li></ul><p class="k">故事還沒完——江湖更深處還有關卡等著。</p><button id="chap-go">繼續經營</button></div>`;
  document.body.append(d); $('chap-go').onclick = () => { S.chapter.seen = true; d.remove(); SFX.click(); panel(); };
}
let lastAuto = 0; const cue = {};
function audioStep() { for (const c of cuesFrom(cue, S)) { SFX[c]?.(); const p = c === 'breakthrough' ? (S.fx.find((f) => f.kind === 'break')?.pos || NODES.yard) : c === 'record' ? NODES.gate : c === 'chapter' ? NODES.hall : null; if (p) camFocus(p[0], p[1]); }
  const rd = S.mons.find((m) => m.raid === 'go'); if (rd && cue.raid !== rd.uid) { cue.raid = rd.uid; camFocus(rd.pos[0], rd.pos[1], 2); } }
setInterval(() => { if (!S || S.t - lastAuto < AUTO.every) return; lastAuto = S.t; autosave(localStorage, save(S), { day: Math.floor(S.t / 600) + 1, name: S.hero?.name, at: Date.now() }); }, 1000);
$('autos').onchange = (e) => { if (e.target.value === '') return; const r = load(autoGet(localStorage, +e.target.value) || ''); if (r.ok) { S = r.state; lastAuto = S.t; document.getElementById('start')?.remove(); starting = false; } else alert(r.err); panel(); };
$('export').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([save(S)], { type: 'application/json' })); a.download = `solo-sect-day${Math.floor(S.t / 600) + 1}.json`; a.click(); URL.revokeObjectURL(a.href); };
$('import').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const r = load(await f.text()); if (r.ok) { S = r.state; lastAuto = S.t; document.getElementById('start')?.remove(); starting = false; } else alert('匯入失敗：' + r.err); e.target.value = ''; panel(); };
$('mute').onclick = () => { setMute(!isMuted()); ambient(!isMuted()); panel(); };
document.addEventListener('click', (e) => { if (e.target.closest('button')) { SFX.click(); if (!isMuted()) ambient(true); } }, true);
panel(); newGame(); requestAnimationFrame(loop);
