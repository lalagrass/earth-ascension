import { HOME, HOME_VIEW, CHUNK, CHUNK_CAP, lruGet, chunkKey, chunksInView, paintChunk, clampCam, camBounds, partyPos, partyDist, trailAt, SPOTS, styledPos, fogged, inVision, leftovers, FOG_W, FOG_H, WORLD, cellColor, STYLE_PATH, cloudAt, cloudPos, cloudSpots, partyCloud, CLOUD_MAP, ZOOMS, lodOf, TRAIL_END, raidDescent, RINGS, TRAIL, POP, capOf, denDown } from './world.mjs';
import { raidMul } from './expedition.mjs';
import { sideCards, bubbles } from './events.mjs';
import { memsOf, apprCands, takePupil, pupilsOf, XIA_STYLES } from './bonds.mjs';
import { statusHtml } from './status.mjs';
import { milestones } from './expedition.mjs';
import { ARC13 } from './jianghu.mjs';
import { GEN, canSucceed, succeed, heirs, heirArt } from './gen.mjs';
import { SECTS, SECT_K, RULE_LIB } from './sect-data.mjs';
import { canBuildFac, buildFac, artKind, KIND_NAME, sectFac, rivalGate } from './sect.mjs';
import { JH, DAY as DAY13 } from './data.mjs';
import { zxGate } from './huashan.mjs';
import { HS, DUGU } from './data.mjs';
import { XIA, xiaPool, pickStudent } from './wuxia.mjs';
import { artsSvg, artHintsHtml, setFocus, focusOf, artById, artMul, artState, topTier, chooseVariant, variantOf, stuckAt, breakChance, rustOf, starCost, guizhenOk } from './arts.mjs';
import { ARTS, TIERS, VARIANTS, AURA, BREAK, ACTIVITIES as ACTS2 } from './data.mjs';
import { startExpedition, recallExpedition, canExpedition, codexRows, reportText, segAt, ROUTE_END, skipGuide } from './sim.mjs';
import { ROUTE, EXP, ENEMIES } from './data.mjs';
import { outers, skipsChores, emergency, quotaOf, setDuty, setPrio, canPromote, startTrial } from './sim.mjs';
import { CHORE_ACTS, CHORE_NAMES, QUOTA, PRIO, PROMOTE, RANK_NAMES } from './data.mjs';
import { isLabor, disciples, laborers, laborCap, canHire, hire, canInvite, invite, avgAff, togglePause, MATS, moodLabel, moodParts, seasonOf, aff, compat, defaultAnswers, personalityFrom, capacity, canRecruit, recruit, recruitNeed, mapStage, setPost, phaseOf, setStyle, createState, tick, startBuild, startHunt, setOrder, save, load, facDef, facStage, relKey, relStage, speedOf } from './sim.mjs';
import { ECON, ROOT, RES_NAMES, QUESTIONS, TRAITS, MAPS, POSTS, HABITAT, STYLES, NODES, EDGES, FACILITIES, ACTIVITIES, MOVES, MONSTERS } from './data.mjs';
import { EXP_STYLES } from './data.mjs';
import { styleOf, teamStyle } from './expedition.mjs';
import { openStart, choiceUI, heroCard } from './start-ui.mjs';
import { mountTransferManager, downloadBytes } from './transfer-manager-ui.mjs';
import { TRANSFER_KEY, slotKey, writeVerified, exportTransferBackup, validateTransferSave } from './homestead-transfer.mjs';
import { UNLOCKS, ALL_SECS, secOpen, CHAPTER1, AUTO, autosave, autoList, autoGet, suhuiOf, syncLegacy } from './slice.mjs';
import { MANUALS, canAssemble, assemble, learnManual, likesOf, menuOf, aspOf, ASPIRATIONS, statusIcon } from './v10.mjs';
import { routeSeg, segIndex, campsOpen, scoutOf, peaceOf } from './expedition.mjs';
import { CAMPS, ENDLESS } from './data.mjs';
import { think as think10 } from './mind.mjs';
import { SFX, ambient, setMute, isMuted, cuesFrom } from './audio.mjs';
const cv = document.getElementById('map'), g = cv.getContext('2d');
const IMG = {}; const names = ['ground', 'hall_s0', 'hall_s1', 'dorm_s0', 'dorm_s1', 'log', 'herb', 'pine', 'bamboo', 'boar', 'rat', 'hero', 'cousin', 'senior', 'master', 'bench', 'wood', 'vat', 'grass', 'woodpile', 'kitchen_s1', 'map_s0', 'map_s1', 'map_s2'];
await Promise.all(names.map((n) => new Promise((r) => { const i = new Image(); i.onload = r; i.onerror = r; i.src = `assets/${n}.${n === 'ground' || n.startsWith('map_') ? 'jpg' : 'png'}`; IMG[n] = i; })));
let S = createState(Date.now() % 100000 | 0), speed = 1, starting = true;
let transferMode = false, activeTransferKey = TRANSFER_KEY, activeTransferRaw = null;
let refreshTransfers = () => {};
const exitTransferMode = () => { transferMode = false; if (new URLSearchParams(location.search).has('homestead')) history.replaceState(null, '', 'index.html'); };
const newGame = (opening = false) => { if (!opening) exitTransferMode(); starting = true; openStart((spec) => { exitTransferMode(); S = createState(Date.now() % 100000 | 0, spec); starting = false; panel(); }); };
window.__sect = { get S() { return S; }, set speed(v) { speed = v; }, freeze: false, panel: () => panel(), get starting() { return starting; } };
const ACT_ICON = { quarry: '⛏', spar: '🤺', cook: '🍲', deliver: '📦', rest: '💤', eat: '🍚', farm: '🌱', forage: '🌿', chop: '🪓', train: '掌', learn: '📜', build: '🔨', chat: '💬', hunt: '⚔', strike: '⚔', trial: '⚔' };
let BUB = {};
function bubble(msg, x, y) { const m = msg.length > 18 ? msg.slice(0, 17) + '…' : msg; g.font = '12px sans-serif'; const w = g.measureText(m).width + 14; g.fillStyle = 'rgba(255,255,255,.92)'; g.strokeStyle = '#6b4a2a'; g.lineWidth = 1; g.beginPath(); g.roundRect(x - w / 2, y - 20, w, 20, 8); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x, y + 6); g.lineTo(x + 4, y); g.fill(); g.fillStyle = '#3a2f24'; g.textAlign = 'center'; g.fillText(m, x, y - 6); g.textAlign = 'left'; }
// v1.45 B 級＝右側竹簡（可點推鏡）、A 級＝暫停＋推鏡
function focusOn(id) { const d = S.ds.find((x) => x.id === id); if (!d || d.away) return false; camFocus(d.pos[0], d.pos[1] - 30, 2.5); const c = document.querySelector(`[data-dcard="${id}"]`); if (c) { c.open = true; c.scrollIntoView({ block: 'nearest' }); } return true; }
function feed() { let f = document.getElementById('feed'); if (!f) { f = document.createElement('div'); f.id = 'feed'; document.getElementById('wrap').appendChild(f); }
  const html = sideCards(S, 5).map((e) => `<div class="slip ${e.tier}" data-who="${e.who || ''}" title="點一下推鏡到相關人物">${e.tier === 'top' ? '★ ' : ''}[${e.t}s] ${e.msg}</div>`).join(''); if (f.__h !== html) { f.innerHTML = html; f.__h = html; }
  let a = document.getElementById('alert');
  if (S.alert && !a) { a = document.createElement('div'); a.id = 'alert'; a.innerHTML = `<div class="card"><b>★ 大事</b><p>${S.alert.msg}</p><button id="alert-ok">知道了，繼續</button></div>`; document.getElementById('wrap').appendChild(a); if (S.alert.who) focusOn(S.alert.who); document.getElementById('alert-ok').onclick = () => { S.alert = null; a.remove(); }; }
  if (!S.alert && a) a.remove(); }
document.addEventListener('click', (e) => { const sl = e.target.closest('.slip'); if (sl && sl.dataset.who) focusOn(sl.dataset.who); });
window.__sect.focusOn = (id) => focusOn(id);
function draw() {
  BUB = bubbles(S);
  const shake = S.fx.find((f) => f.kind === 'shake'); g.save(); if (shake) g.translate((Math.random() - 0.5) * 12 * shake.ttl / 0.35, (Math.random() - 0.5) * 12 * shake.ttl / 0.35);
  { const on = performance.now() < cam.until, k = 0.08; // v1.55a 世界鏡頭：大事件短暫拉近後回到原視角；跟隨模式追巡山隊
    if (on) { if (!cam.prev) cam.prev = { x: cam.ux, y: cam.uy, z: cam.uz }; cam.z += (1.6 - cam.z) * k; cam.x += (cam.tx - cam.x) * k * 2; cam.y += (cam.ty - cam.y) * k * 2; }
    else { if (cam.prev) cam.prev = null; const pp = cam.follow && partyPos(S); if (pp) { cam.ux += (pp[0] - cam.ux) * 0.1; cam.uy += (pp[1] - 60 - cam.uy) * 0.1; } else if (cam.follow && !S.exp) cam.follow = false;
      cam.z += (cam.uz - cam.z) * 0.2; cam.x += (cam.ux - cam.x) * 0.3; cam.y += (cam.uy - cam.y) * 0.3; if (Math.abs(cam.z - cam.uz) < 1e-3) cam.z = cam.uz; }
    const c = clampCam({ x: cam.x, y: cam.y, z: cam.z }, camBounds(S)); if (!on) { const u = clampCam({ x: cam.ux, y: cam.uy, z: cam.uz }, camBounds(S)); cam.ux = u.x; cam.uy = u.y; }
    g.translate(800, 450); g.scale(c.z, c.z); g.translate(-c.x, -c.y); drawWorld(c); g.save(); g.translate(HOME.x, HOME.y); }
  const ms = mapStage(S); g.drawImage(IMG[MAPS[ms]], 0, 0, 1600, 900);
  if (window.__debugRoads) { g.strokeStyle = 'rgba(200,60,40,.6)'; g.lineWidth = 3; for (const [a, b] of EDGES) { g.beginPath(); g.moveTo(...NODES[a]); g.lineTo(...NODES[b]); g.stroke(); } }
  const items = [];
  for (const f of FACILITIES) {
    const st = facStage(S, f.id), [x, y] = NODES[f.node], fs = S.fac[f.id];
    items.push({ y: y - 1, f: () => {
      if (f.id === 'yard') { g.fillStyle = 'rgba(180,150,100,.35)'; if (st.dummies) { g.beginPath(); g.ellipse(x, y, 45, 20, 0, 0, 7); g.fill(); }
        for (let k = 0; k < (st.dummies || 0); k++) { const dx = x - 30 + k * 26, dy = y + 4; g.fillStyle = '#6b4a2a'; g.fillRect(dx - 2, dy - 24, 5, 24); g.fillRect(dx - 8, dy - 19, 16, 3); g.fillRect(dx - 7, dy - 12, 14, 3); } }
      if (f.v16) { if (fs.stage) { g.fillStyle = f.sig ? '#7a2e2e' : '#8a6a44'; g.fillRect(x - 22, y - 18, 44, 22); g.fillStyle = '#3d3f46'; g.beginPath(); g.moveTo(x - 30, y - 16); g.lineTo(x, y - 34); g.lineTo(x + 30, y - 16); g.fill(); } else { g.strokeStyle = 'rgba(120,80,40,.45)'; g.setLineDash([4, 3]); g.strokeRect(x - 22, y - 18, 44, 22); g.setLineDash([]); } } // v1.6 新建築：簡易屋頂佔位
      if (f.sig && !fs.stage) return; label(`${f.sig ? (sectFac(S)?.name || f.name) : f.name}・${st.name}`, x, y + 22, '#3a2f24');
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
    const im = IMG[d.sprite], sc = SC * (d.adult === false && d.child ? 0.62 + 0.03 * ((d.age || 6) - 6) : 1); g.drawImage(im, -im.width * sc / 2, -im.height * sc, im.width * sc, im.height * sc); g.restore(); if (d.child && !d.adult) label(`${d.age}歲`, x, y + 14, '#7a4a8a');
    if (d.carry?.stone) { g.fillStyle = '#8c8c8c'; g.beginPath(); g.arc(x + 10, y - 26, 6, 0, 7); g.fill(); } else if (d.carry) sprite('wood', x + 10, y - 18, 0.6);
    if (isLabor(d)) { g.fillStyle = '#2f6f9f'; g.fillRect(x - 9, y - IMG[d.sprite].height * SC + 4, 18, 4); }
    label(`${d.name}${isLabor(d) ? '（工）' : d.role === 'outer' ? '（外門）' : d.role === 'head' ? '（首徒）' : ''} ${statusIcon(d, d.task?.act === 'build' && d.task.phase !== 'do' ? '📦' : ACT_ICON[d.anim || d.task?.act] || '')}`, x, y - (IMG[d.sprite].height * SC + 4), '#222');
    if (S.hunt) hp(x, y - IMG[d.sprite].height * SC - 20, d.hp / 100, '#3a7');
    { const b = BUB[d.id]; if (b) bubble(b, x, y - (IMG[d.sprite].height * SC + 26)); } // v1.45 C 級事件＝頭上氣泡
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
  drawSect();
  if (S.xia?.teacher) { const [x, y] = [NODES.kitchen[0] + 60, NODES.kitchen[1] + 30], im = IMG.hero; g.save(); if (im?.width) { g.filter = 'sepia(0.8) brightness(0.8)'; g.drawImage(im, x - 22, y - 56, 44, 56); g.filter = 'none'; } g.fillStyle = '#b5651d'; g.beginPath(); g.ellipse(x + 16, y - 30, 7, 10, 0, 0, 7); g.fill(); g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#fff'; g.strokeText(`洪七公 🍶 傳功${S.xia.teacher.stage}/3`, x, y - 62); g.fillStyle = '#6a3b10'; g.fillText(`洪七公 🍶 傳功${S.xia.teacher.stage}/3`, x, y - 62); g.restore(); }
  for (const f of S.fx) {
    if (f.kind === 'shake') continue;
    // v1.1 招牌武學地圖特效：金龍盤旋／青竹棒影
    if (f.kind === 'dragon' || (f.kind === 'move' && f.mfx === 'dragon')) { const c = f.to || f.pos, L = f.kind === 'dragon' ? 2.2 : 1.0, k = 1 - f.ttl / L; g.save(); g.globalAlpha = Math.min(1, f.ttl * 1.5); g.strokeStyle = '#f2c23a'; g.lineWidth = 9; g.lineCap = 'round'; g.shadowColor = '#ffdc60'; g.shadowBlur = 18; g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 3 + k * 6, r = 20 + i * 1.6; const x = c[0] + Math.cos(a) * r, y = c[1] - 30 + Math.sin(a) * r * 0.45 - i * 0.8; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.fillStyle = '#ffe680'; g.font = 'bold 30px serif'; g.textAlign = 'center'; g.fillText('龍', c[0], c[1] - 80); g.restore(); if (f.kind === 'dragon') continue; }
    // v1.2 華山線特效：紫霞氣旋、九劍淡色劍痕（無招不浮字）、辟邪鬼魅殘影、紫氣劍刃
    if (f.kind === 'zixia') { const c = f.pos, k = 1 - f.ttl / 2; g.save(); g.globalAlpha = Math.min(1, f.ttl); g.strokeStyle = '#9b59d0'; g.shadowColor = '#c08cff'; g.shadowBlur = 16; g.lineWidth = 4; for (let r = 0; r < 3; r++) { g.beginPath(); g.ellipse(c[0], c[1] - 20 - r * 18, 26 + k * 30 + r * 8, 9 + r * 3, k * 3 + r, 0, 7); g.stroke(); } g.restore(); continue; }
    if (f.kind === 'dugu' || (f.kind === 'move' && f.mfx === 'dugu')) { const c = f.to || f.pos; g.save(); g.globalAlpha = Math.min(0.85, f.ttl * 1.4); g.strokeStyle = '#cfe0f5'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { const a = i * 2.3 + (f.seed || 0), r = 30 + (i * 37) % 50; g.beginPath(); g.moveTo(c[0] + Math.cos(a) * r, c[1] - 20 + Math.sin(a) * r * 0.6); g.lineTo(c[0] - Math.cos(a + 0.4) * r, c[1] - 20 - Math.sin(a + 0.4) * r * 0.6); g.stroke(); } g.restore(); if (f.kind === 'dugu') continue; }
    if (f.kind === 'move' && f.mfx === 'bixie') { g.save(); for (let k = 0; k < 4; k++) { g.globalAlpha = 0.35 - k * 0.07; g.fillStyle = '#d04070'; g.beginPath(); g.arc(f.from[0] + (f.to[0] - f.from[0]) * k / 4, f.from[1] - 25 + (f.to[1] - f.from[1]) * k / 4, 9, 0, 7); g.fill(); } g.restore(); }
    if (f.kind === 'move' && f.zx) { g.save(); g.strokeStyle = '#a35ce0'; g.shadowColor = '#c08cff'; g.shadowBlur = 12; g.lineWidth = 7; g.globalAlpha = f.ttl / 0.6; g.beginPath(); g.moveTo(f.from[0], f.from[1] - 25); g.lineTo(f.to[0], f.to[1] - 8); g.stroke(); g.restore(); }
    // v1.3 江湖群像招式特效：黯然（灰藍淚痕）、重劍（黑色重弧）、玉女（白絲）、獅吼（音波圈）、蛤蟆（綠色蓄勁）、葵花（紅針）等
    if (f.kind === 'move' && JH_FX[f.mfx]) { const [col, kind] = JH_FX[f.mfx], to = f.to || f.pos, k = 1 - f.ttl / 0.6; g.save(); g.globalAlpha = Math.max(0, Math.min(1, f.ttl / 0.6)); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = kind === 'heavy' ? 10 : 3; g.shadowColor = col; g.shadowBlur = 10;
      if (kind === 'ring') for (let r = 0; r < 3; r++) { g.beginPath(); g.arc(f.from[0], f.from[1] - 20, 30 + (k * 90) + r * 22, 0, 7); g.stroke(); }
      else if (kind === 'needle') for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(f.from[0], f.from[1] - 25); g.lineTo(to[0] + (i - 3) * 6, to[1] - 10 + (i % 2) * 8); g.stroke(); }
      else if (kind === 'toad') { g.globalAlpha *= 0.5; g.beginPath(); g.ellipse(to[0], to[1] - 10, 30 + k * 40, 18 + k * 20, 0, 0, 7); g.fill(); }
      else { g.beginPath(); g.moveTo(f.from[0], f.from[1] - 25); g.quadraticCurveTo((f.from[0] + to[0]) / 2, f.from[1] - 70, to[0], to[1] - 10); g.stroke(); }
      g.restore(); }
    if (f.kind === 'move' && f.mfx === 'staff') { const c = f.to; g.save(); g.globalAlpha = Math.min(1, f.ttl * 1.6); g.strokeStyle = '#4fc47a'; g.lineWidth = 5; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI + (1 - f.ttl) * 4; g.beginPath(); g.moveTo(c[0] - Math.cos(a) * 40, c[1] - 12 - Math.sin(a) * 26); g.lineTo(c[0] + Math.cos(a) * 40, c[1] - 12 + Math.sin(a) * 26); g.stroke(); } g.restore(); }
    if (f.kind === 'break') { const k = 1 - f.ttl / 1.2; g.strokeStyle = `rgba(255,215,80,${f.ttl / 1.2})`; g.lineWidth = 5; g.beginPath(); g.arc(f.pos[0], f.pos[1] - 25, 10 + k * 70, 0, 7); g.stroke(); continue; }
    if (f.kind === 'move' && f.tier >= 1 && f.sprite) { const im = IMG[f.sprite]; if (im?.width) for (let k = 1; k <= 2; k++) { g.save(); g.globalAlpha = 0.25 / k * (f.ttl / 0.6); g.translate(f.from[0] - (f.face || 1) * 12 * k, f.from[1]); if ((f.face || 1) < 0) g.scale(-1, 1); g.drawImage(im, -im.width * SC / 2, -im.height * SC, im.width * SC, im.height * SC); g.restore(); } }
    if (f.kind === 'move' && f.tier >= 2 && f.vcolor) { g.save(); g.strokeStyle = f.vcolor; g.lineWidth = 3; g.globalAlpha = Math.min(1, f.ttl); g.setLineDash([6, 4]); g.beginPath(); g.arc(f.to[0], f.to[1] - 10, f.r * 1.4 + (1 - f.ttl) * 20, 0, 7); g.stroke(); g.restore(); }
    if (f.kind === 'move' && f.tier >= 3) { g.save(); g.globalAlpha = Math.min(1, f.ttl * 1.5); g.font = 'bold 44px serif'; g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = '#fff8e8'; g.strokeText(`「${f.name}」`, f.to[0], f.to[1] - 70); g.fillStyle = '#a0281e'; g.fillText(`「${f.name}」`, f.to[0], f.to[1] - 70); g.restore(); }
    if (f.kind === 'move') { g.strokeStyle = f.color; g.lineWidth = 4; g.globalAlpha = f.ttl / 0.6; g.beginPath(); g.moveTo(f.from[0], f.from[1] - 25); g.lineTo(f.to[0], f.to[1] - 8); g.stroke(); g.beginPath(); g.arc(f.to[0], f.to[1] - 10, f.r, 0, 7); g.stroke(); label(f.name, f.from[0], f.from[1] - 60, f.color); g.globalAlpha = 1; }
    else { g.fillStyle = 'rgba(200,40,40,.6)'; g.beginPath(); g.arc(f.pos[0], f.pos[1] - 30, 10, 0, 7); g.fill(); }
  }
  g.restore(); drawWorldTop(); g.restore(); drawCloud(); expBar();
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
  if (X) for (const [i, m] of milestones(S).entries()) { if (m.st !== 'open' && m.st !== 'clear') continue; const r = routeSeg(i), mx = (px(r.from) + px(Math.min(r.to, END))) / 2; g.font = 'bold 12px sans-serif'; g.fillStyle = m.st === 'open' ? (m.hit ? '#c0392b' : '#b86a00') : '#3a7a3a'; g.fillText(m.st === 'open' ? '⚠' : '✔', mx - 5, y - 3); } // v1.45 里程軸
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
  const hint = $('transfer-hint');
  const hintKey = JSON.stringify(S.homesteadOrigin ? [S.homesteadOrigin.hutStage, S.homesteadOrigin.herbGarden, !!S.homesteadOrigin.hintsHidden, S.homesteadOrigin.lifeOnly] : null); const hintFocus = document.activeElement?.id;
  if (S.homesteadOrigin && hint.dataset.key !== hintKey) {
    hint.dataset.key = hintKey;
    const o = S.homesteadOrigin;
    hint.textContent = o.hintsHidden ? '荒居生活提示已收合。' : `原木屋休息 ${o.hutStage === 2 ? 9 : 6}→8，現為小寢舍；菜畦可直接種菜；${o.herbGarden ? '原藥田栽種能力不保留，' : ''}本篇藥圃只野採。武學自由選擇，生活工作可在弟子欄指派。存檔後保留提示選擇。`;
    const b = document.createElement('button'); b.id = 'toggle-transfer-hint'; b.textContent = o.hintsHidden ? '重看提示' : '收合提示'; hint.append(b); const life = document.createElement('button'); life.id = 'toggle-transfer-life'; life.textContent = o.lifeOnly === false ? '改為自主生活優先' : '允許自主習武'; hint.append(life);
  } else if (!S.homesteadOrigin) { hint.replaceChildren(); delete hint.dataset.key; }
  if (['toggle-transfer-hint','toggle-transfer-life'].includes(hintFocus)) document.getElementById(hintFocus)?.focus({preventScroll:true});
  $('res').innerHTML = `木 ${S.res.wood}/${S.cap.wood}　石 ${S.res.stone}/${S.cap.stone}　香火錢 ${S.res.coin}　菜 ${S.res.veg}　飯 ${S.res.food}　藥 ${S.res.herb}　水 ${S.res.water}/${S.cap.water}　療傷丹 ${S.res.pill}　鐵木 ${S.res.tiemu || 0}　靈石 ${S.res.lingshi || 0}<div>名聲 ${S.rep}・弟子 ${disciples(S).length}/${capacity(S)} 床・雇工 ${laborers(S).length}/${laborCap(S)}・地圖 ${mapStage(S)}</div><div class="k">菜畦：${S.plots.map((p) => ({ empty: '空', grow: '長', ripe: '熟' })[p.st]).join(' ')}</div>`;
  $('build').innerHTML = FACILITIES.filter((f) => f.stages.length > 1 && !f.sig).map((f) => { const st = S.fac[f.id], nx = f.stages[st.stage + 1];
    const cost = nx ? Object.entries({ ...nx.cost, ...(nx.rare || {}) }).map(([k, v]) => `${RES_NAMES[k]}${v}`).join('・') : ''; const why = nx ? buildWhy(S, f.id) : null;
    const bundle = st.site ? `<div class="k">收集包：${MATS.filter((k) => st.site.need[k]).map((k) => `${RES_NAMES[k]} ${st.site.delivered[k]}/${st.site.need[k]}${st.site.reserved[k] ? `（在途${st.site.reserved[k]}）` : ''}`).join('　')}｜工時 ${st.site.work.toFixed(0)}/${st.site.workNeed}s</div>${bar(100 * MATS.reduce((a, k) => a + st.site.delivered[k], 0) / Math.max(1, MATS.reduce((a, k) => a + st.site.need[k], 0)), '#a0461e')}` : '';
    return `<div>${f.name}：${f.stages[st.stage].name} ${nx ? (st.site ? `<button data-pause="${f.id}">${st.site.paused ? '復工' : '暫停'}</button>` : `<button data-build="${f.id}" ${why ? `disabled title="${why}"` : ''}>藍圖：${nx.name}（${cost}${nx.rep ? '・名聲' + nx.rep : ''}）</button>${why && why !== '施工中' ? `<span class="k why">${why}</span>` : ''}`) : '✓'}${bundle}</div>`; }).join('') + `<div class="lots" data-lots>地塊 ${lotsUsed(S)}/${lotsOf(S).n} <button data-lot ${lotWhy(S) ? 'disabled' : ''}>擴地（${lotCost(S)} 錢）</button> <span class="k">${lotWhy(S) || ''}</span></div>`;
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
      <div class="k">悟性 ${cur.rootKnown ? `${cur.wu ?? cur.root}（${ROOT.names[cur.wu ?? cur.root]}）` : '未明'}｜${ARTS.filter((a) => cur.arts[a.id]).map((a) => `${a.name}×${artMul(cur, a).toFixed(2)}`).join('・')}</div>${artsSvg(cur)}${artHintsHtml(cur, (k) => XIA[k]?.name || k)}
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
    $('ledger').innerHTML = `<div class="k">今日（第 ${L.day} 日）收：${row(L.in)}</div><div class="k">今日支：${row(L.out)}</div>${P ? `<div class="k">昨日收：${row(P.in)}｜支：${row(P.out)}</div>` : ''}<div class="k">明晨預計：香火 +${ECON.coinBase + Math.floor(S.rep / ECON.coinPerRep)}・工錢 −${laborers(S).length * ECON.wage}</div>${econHtml(S)}${threatHtml(S)}`; }
  const eco = `山中：山鼠 ${S.eco.rat.n}・野豬 ${S.eco.boar.n}`;
  $('hunt').innerHTML = S.hunt ? `${eco}<div>進行中（${POSTS[S.hunt.post]}）第 ${S.hunt.wave + 1}/${S.hunt.waves} 波：擊退 ${S.hunt.kills}・溜走 ${S.hunt.escaped}</div>` :
    `${eco}<div>守點：<select id="post">${Object.entries(POSTS).map(([k, n]) => `<option value="${k}" ${S.post === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div>${disciples(S).map((d) => `<label><input type="checkbox" class="hteam" value="${d.id}" ${(window.__team ||= new Set(['hero', 'senior'])).has(d.id) ? 'checked' : ''}>${d.name}</label>`).join(' ')}</div>
    <button id="hunt-go">上山狩獵（${3} 波）</button><div class="k">${S.lastReport || '尚無戰報'}</div>`;
  { const X = S.exp, team = (window.__exTeam ||= new Set(['hero', 'senior'])), thr = window.__exThr ?? EXP.thrDefault, R = S.lastExp;
    const nm = (o) => Object.entries(o || {}).map(([k, v]) => `${ENEMIES[k].name}×${v}`).join('、') || '無';
    const card = R ? `<div class="card"><b>戰報 #${R.n}</b>（第 ${R.day} 日・${R.team.join('、')}）<div>📏 走到 <b>${R.seg}</b> ${R.dist} 步${R.sectRec ? ' <span class="rec">★本門新紀錄</span>' : ''}</div><div>⚔ 擊倒：${nm(R.kills)}</div>${R.ret?.hits?.length ? `<div>🐾 返程驚獸：${R.ret.hits.join('、')}（耐力 −${R.ret.staLost}${R.ret.lost ? `，丟下 ${Object.entries(R.ret.lost).map(([k, v]) => `${k}${v}`).join(' ')}` : ''}）</div>` : R.ret ? '<div>🐾 返程平安（沒帶寶或沿路已清）</div>' : ''}<div>💨 逃走：${nm(R.escaped)}</div><div>🩹 傷：${R.hurt.map(([n, l]) => n + l).join('、') || '無'}</div><div>🎒 帶回：${Object.entries(R.loot).map(([k, v]) => `${RES_NAMES[k] || k}${v}`).join(' ') || '無'}</div><div>↩ 回頭：${R.reason}</div>${R.style ? `<div>🧭 風格：<b>${EXP_STYLES[R.style].name}</b>・閃避 ${Object.values(R.evaded).reduce((a, b) => a + b, 0)}・追擊 ${R.chase.got}/${R.chase.n}・用時 ${R.time}s</div><div>🗺 清場率：${Object.entries(R.clear).map(([k, v]) => `${(ROUTE.find((g) => g.id === k)?.name || k.replace(/^end(\d+)$/, '絕頂之上・第$1重'))} ${Math.round(v * 100)}%${v >= 1 ? '（清山）' : ''}`).join('・') || '—'}</div><div class="story">📜 ${R.story}</div>` : ''}</div>` : '<div class="k">尚未巡山</div>';
    const sty = [...team].map((id) => S.ds.find((d) => d.id === id)).filter(Boolean), styHtml = sty.length ? `<div class="k">隊伍風格：<b>${EXP_STYLES[teamStyle(sty)].name}</b>（多數決）｜${sty.map((d) => { const o = styleOf(d); return `${d.name}${EXP_STYLES[o.id].name}：${o.why}`; }).join('；')}</div>` : '';
    const ecoH = `<div class="k" data-eco>族群（現有／上限）：${RINGS.map((r) => { const e = S.pop?.[r.id]; if (!e) return ''; const c = Math.floor(capOf(S, r.id)), lo = e.n <= POP[r.id].max * 0.3; return `<span data-ring="${r.id}"${lo ? ' style="color:#b0301a"' : ''}>${r.name} ${e.n}/${c}${denDown(S, r.id) ? `（巢毀，${((e.den - S.t) / DAY13).toFixed(1)} 日後重築）` : ''}</span>`; }).join('・')}</div>`;
    const rec = `${ecoH}${xiaHtml()}${genHtml()}${sectHtml()}${hsHtml()}${jhHtml()}${manualHtml()}<div class="k">清場紀錄：${ROUTE.map((g) => `${g.name}${Math.round((S.records.clear?.[g.id] || 0) * 100)}%${S.records.qing?.[g.id] ? `・清山${S.records.qing[g.id]}次${peaceOf(S, g.id) ? '☮' : ''}` : ''}`).join('　')}${S.records.fastGorge != null ? `・最快到深谷 ${S.records.fastGorge}s` : ''}</div><div class="k">本門最遠：${S.records.sect || 0} 步${S.records.who ? `（${S.records.who.join('、')}）` : ''}・個人：${disciples(S).map((d) => `${d.name} ${d.best || 0}`).join('・')}</div>`;
    $('exp').innerHTML = X ? `<div class="ms">${milestones(S).map((m) => `<span class="m ${m.st}${m.hit ? ' hit' : ''}" title="${{ clear: '已清', open: '未清：帶寶回程會驚獸', now: '進行中', todo: '未到' }[m.st]}">${{ clear: '✔', open: '⚠', now: '▶', todo: '·' }[m.st]}${m.name}</span>`).join('')}</div><div>巡山中 #${X.n}：${X.team.map((id) => S.ds.find((d) => d.id === id)?.name).join('、')}・${EXP_STYLES[X.style]?.name || ''}・${X.phase === 'out' ? '前進' : '回程'} ${X.dist.toFixed(0)} 步（${segAt(X.dist).name}）・乾糧 ${X.supplies}・撤退線 ${X.thr * 100}%${X.phase === 'out' ? ' <button id="exp-recall">召回</button>' : X.recalled ? '（召回中）' : ''}</div><div class="k">${rbar('體力', X.sta, EXP.sta, '#3a7')} ${rbar(`耐性${X.order ? '（巡山令）' : ''}`, X.pat, X.patMax || 100, '#c80')}${X.scout ? `　探路：${X.scout}（先手 +20%）` : ''}${X.camp ? `　自${X.camp}出發` : ''}</div><div class="k">擊倒 ${nm(X.kills)}｜逃走 ${nm(X.escaped)}｜閃過 ${nm(X.evaded)}｜追 ${X.chase?.got || 0}/${X.chase?.n || 0}</div>${rec}${card}` :
      `<div>${disciples(S).map((d) => `<label><input type="checkbox" class="xteam" value="${d.id}" ${team.has(d.id) ? 'checked' : ''}>${d.name}${d.hp < EXP.minHp ? '（傷）' : ''}</label>`).join(' ')}</div>
      ${styHtml}<div>撤退線：<select id="exthr">${EXP.thr.map((v) => `<option value="${v}" ${v === thr ? 'selected' : ''}>氣血 ${v * 100}%</option>`).join('')}</select>（心情 &lt;${EXP.moodMin} 也會回頭）</div>
      <div>乾糧：<input id="exsup" type="number" min="0" max="${Math.max(1, team.size) * EXP.supplyMax}" value="${window.__exSup ?? Math.max(1, team.size) * EXP.supplyPer}" style="width:3em"> 份（庫存糧 ${Math.floor(S.res.food)}）
      目標：<select id="extgt">${[...ROUTE.map((r) => [r.to, `${r.name}盡頭 ${r.to}`]), ['inf', '不設限（無盡）']].map(([v, n]) => `<option value="${v}" ${String(window.__exTgt ?? ROUTE[ROUTE.length - 1].to) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select>
      出發：<select id="exfrom"><option value="">山門</option>${campsOpen(S).map((c) => `<option value="${c.id}" ${window.__exFrom === c.id ? 'selected' : ''}>${c.name}（${ROUTE[c.seg].to} 步，多帶 ${EXP.campCarry}/人）</option>`).join('')}</select>
      巡山令：<select id="exord"><option value="">照性格</option>${Object.entries(EXP_STYLES).map(([k, v]) => `<option value="${k}" ${window.__exOrd === k ? 'selected' : ''}>強令${v.name}</option>`).join('')}</select>
      <span class="k">${window.__exOrd ? '（不合性格者心情 −6、主角違心；耐性上限 ×0.7）' : ''}${(() => { const sc = scoutOf(sty); return sc ? `　探路：${sc.name}（先手 +20%）` : ''; })()}</span></div>
      <button id="exp-suggest">因才派巡</button> <span class="k" id="exp-why">${(window.__exWhy || []).join('；')}</span><br><button id="exp-go">派出巡山（${team.size} 人）</button> <span class="k">${canExpedition(S, [...team]).why || ''}</span>${rec}${card}`;
    if (X && $('exp-recall')) $('exp-recall').onclick = () => { recallExpedition(S); panel(); };
    if (!X) { $('exp-go').onclick = () => { const r = startExpedition(S, [...team], { thr, supplies: +$('exsup').value, target: $('extgt').value === 'inf' ? 'inf' : +$('extgt').value, from: $('exfrom').value || null, order: $('exord').value || null }); if (!r.ok) alert(r.why); panel(); }; $('exsup').onchange = (e) => { window.__exSup = +e.target.value; }; $('extgt').onchange = (e) => { window.__exTgt = e.target.value; }; $('exfrom').onchange = (e) => { window.__exFrom = e.target.value; }; $('exord').onchange = (e) => { window.__exOrd = e.target.value; panel(); }; $('exthr').onchange = (e) => { window.__exThr = +e.target.value; }; document.querySelectorAll('.xteam').forEach((c) => (c.onchange = () => { c.checked ? team.add(c.value) : team.delete(c.value); panel(); })); }
    $('codex').innerHTML = `<table class="codex"><tr><th>敵人</th><th>類</th><th>兵器</th><th>血</th><th>見/倒/逃</th><th>觀破</th></tr>${codexRows(S).map((r) => r.unknown ? `<tr class="k"><td>？？？</td><td colspan="5">未曾照面</td></tr>` : `<tr><td>${r.name}</td><td>${r.kind}</td><td>${r.weapon}</td><td>${r.hp}</td><td>${r.seen}/${r.kills}/${r.fled}</td><td>${r.insight}・${r.tier}</td></tr>`).join('')}</table>`;
    const G = S.guide; $('guide').innerHTML = !S.homesteadOrigin && G?.on && G.msg ? `<div class="guide">${G.msg}<div><button id="g-ok">知道了</button> <button id="g-off">略過所有導引</button></div></div>` : '';
    if (G?.on && G.msg) { $('g-ok').onclick = () => { skipGuide(S); panel(); }; $('g-off').onclick = () => { skipGuide(S, true); panel(); }; }
    $('pace').hidden = !!S.homesteadOrigin; $('pace').innerHTML = [['trial', '第1日 黃昏試煉'], ['firstExp', '第2日 第一次巡山'], ['firstBuild', '第3日 第一次動工']].map(([id, n]) => `<span class="mv ${S.pace.done.includes(id) ? 'new' : ''}">${S.pace.done.includes(id) ? '✔' : '○'} ${n}</span>`).join('') + (S.chapter?.done ? `<span class="mv new">✔ ${CHAPTER1.name}</span>` : CHAPTER1.goals.map((g) => `<span class="mv ${g.ok(S) ? 'new' : ''}">${g.ok(S) ? '✔' : '◇'} ${g.name}</span>`).join('')); }
  sliceUI();
  if (!S.hunt) { $('hunt-go').onclick = () => startHunt(S, [...window.__team]); $('post').onchange = (e) => setPost(S, e.target.value); document.querySelectorAll('.hteam').forEach((c) => (c.onchange = () => { c.checked ? window.__team.add(c.value) : window.__team.delete(c.value); })); }
  { const c = canRecruit(S); let qa = '';
    if (c.ok) { const key = c.next.id; if (window.__ansFor !== key) { window.__ans = defaultAnswers(c.next); window.__ansFor = key; }
      const pr = personalityFrom(c.next, window.__ans);
      qa = `<div class="qa"><b>三問心印・${c.next.name}</b>${QUESTIONS.map((q, i) => `<div class="k">${q.q} <select data-q="${i}">${q.a.map(([t], j) => `<option value="${j}" ${window.__ans[i] === j ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`).join('')}<div class="k">將成為：${pr.known.map((t) => TRAITS[t].name).join('、')}${pr.personality.length > pr.known.length ? '＋一項天性（相處後揭露）' : ''}（不改就用預選）</div></div>`; }
    $('recruit').innerHTML = `${qa}<button id="rec-go" ${c.ok ? '' : 'disabled'}>招收弟子（名聲 ${recruitNeed(S)}、糧 3）</button> <span class="k">${c.ok ? '' : c.why}</span>`;
    $('rec-go').onclick = () => { recruit(S, window.__ans); panel(); }; }
  $('ds').innerHTML = disciples(S).map((d) => `<div class="card" data-dcard="${d.id}"><b>${d.name}</b> <span class="k">${(() => { const L = likesOf(d), a = aspOf(d); return `愛吃${L.food}・愛喝${L.drink}${a ? `｜志向「${ASPIRATIONS[a.id].name}」${a.done ? '✔' : `：${ASPIRATIONS[a.id].goal}`}` : ''}`; })()}</span><br>${statusHtml(S, d)}<span class="k">${d.adult ? '' : '（少年）'}（${RANK_NAMES[d.role] || '內門'}）${d.task ? (ACTIVITIES[d.task.act]?.name || (d.task.act === 'trial' ? '試煉' : '狩獵')) : '待命'}｜${d.reason}</span>
   <div class="k">性格：${d.personality.map((p) => d.known.includes(p) ? `<span title="${TRAITS[p].desc}">${TRAITS[p].name}</span>` : '<span title="相處久了才看得出來">？？</span>').join('、')}｜心情 ${d.mood | 0}（${moodLabel(d.mood)}）</div>${bar(d.mood, '#6a8cc7')}<div class="k" title="心情目標的組成">${moodParts(d, S).slice(1).map(([t, v]) => [d.personality.some((p) => !d.known.includes(p) && TRAITS[p].name === t) ? '某種天性' : t, v]).map(([t, v]) => `${t}${v > 0 ? '+' : ''}${v}`).join('・') || '—'}</div>
   <details class="why"><summary>為什麼${d.task ? (ACTIVITIES[d.task.act]?.name || (d.task.act === 'trial' ? '試煉' : '狩獵')) : '待命'}？</summary>${(d.why || []).map((w, i) => `<div class="k">${i + 1}. ${ACTIVITIES[w.act]?.name || w.act} <b>${w.score}</b> = 基礎${w.f.base.toFixed(0)}×作息${w.f.sched}×${w.f.text ? `［${w.f.text}］` : `性格${w.f.trait.toFixed(2)}×心情${w.f.mood}`}＋雜訊${w.f.noise.toFixed(0)}｜${w.why}</div>`).join('') || '<div class="k">玩家指派或尚未決策</div>'}</details>
   <div class="k">精力 ${d.needs.energy | 0}</div>${bar(d.needs.energy, '#d9a441')}<div class="k">飽足 ${d.needs.hunger | 0}</div>${bar(d.needs.hunger, '#7aa35a')}<div class="k">交流 ${d.needs.social | 0}</div>${bar(d.needs.social, '#c77')}<div class="k">樂趣 ${(d.needs.fun ?? 0) | 0}</div>${bar(d.needs.fun ?? 0, '#a07ac7')}
   ${d.growMul ? `<div class="k">練功倍率（${artById(d.growMul.art)?.name}）×${d.growMul.total.toFixed(2)} = 天賦${d.growMul.talent.toFixed(2)}×狀態${d.growMul.state.toFixed(2)}×外部${d.growMul.ext.toFixed(2)}${d.growMul.gate < 1 ? `×悟性門檻${d.growMul.gate}` : ''}</div>` : ''}<div class="k">主修 ${STYLES[d.style]}・掌 ${d.skills.palm.toFixed(1)}・腿 ${d.skills.leg.toFixed(1)}・腳力 ${d.skills.agility.toFixed(1)}（${speedOf(d).toFixed(0)}px/s）・力氣 ${d.skills.strength.toFixed(1)}・農 ${d.skills.farming.toFixed(1)}・廚 ${d.skills.cooking.toFixed(1)}</div>
   <div>${d.moves.map((m) => `<span class="mv">${MOVES.find((x) => x.id === m).name}</span>`).join('')}${d.pendingArt ? `<span class="mv new">可學：${artById(d.pendingArt).name}</span>` : ''}</div>
   <select data-style="${d.id}">${Object.entries(STYLES).map(([k, n]) => `<option value="${k}" ${d.style === k ? 'selected' : ''}>主修${n}</option>`).join('')}</select>
   <select data-ord="${d.id}">${ORD.map(([k, n]) => `<option value="${k}" ${(d.order || '') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`).join('');
  $('rel').innerHTML = Object.entries(S.rel).map(([k, v]) => { const [a, b] = k.split('|').map((id) => S.ds.find((d) => d.id === id).name); const [A, B] = k.split('|').map((id) => S.ds.find((d) => d.id === id)); return `<div>${a}—${b}：${relStage(v)} ${v.toFixed(0)}${S.families.includes(k) ? ' 🏠' : ''} <span class="k">（${a}→${aff(S, A, B).toFixed(0)}／${b}→${aff(S, B, A).toFixed(0)}・合拍 ${compat(A, B).toFixed(1)}/${compat(B, A).toFixed(1)}）</span>${memsOf(S, A, B).slice(-2).map((m) => `<div class="k mem">📜 第${m.day}日・${m.where}：${m.text}</div>`).join('')}</div>`; }).join('') + bondsHtml(S);
  $('hero').innerHTML = heroCard(S);
  $('log').innerHTML = S.log.slice(0, 30).map((l) => `<li>[${l.t}s] ${l.msg}</li>`).join('');
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-build],[data-speed],[data-pause],[data-invite],[data-promote],[data-pupil]'); if (!b) return; if (b.dataset.pupil) { const [m, d] = b.dataset.pupil.split('|').map((id) => S.ds.find((x) => x.id === id)); takePupil(S, m, d); } if (b.dataset.promote) startTrial(S, b.dataset.promote); if (b.dataset.pause) togglePause(S, b.dataset.pause); if (b.dataset.invite) invite(S, b.dataset.invite); if (b.dataset.build) startBuild(S, b.dataset.build); if (b.dataset.speed) speed = +b.dataset.speed; panel(); });
document.addEventListener('change', (e) => { if (e.target.dataset.variant) { const [id, art] = e.target.dataset.variant.split('|'); const d = S.ds.find((x) => x.id === id); if (d && e.target.value) chooseVariant(d, art, e.target.value, S.t); panel(); return; } if ('artsof' in e.target.dataset) { window.__artsOf = e.target.value; panel(); return; } if (e.target.dataset.focus) { setFocus(S, e.target.dataset.focus, e.target.value || null); panel(); return; } if (e.target.dataset.q) { window.__ans[+e.target.dataset.q] = +e.target.value; panel(); return; } if (e.target.dataset.duty) { setDuty(S, e.target.dataset.duty, e.target.value, e.target.checked); panel(); return; } if (e.target.dataset.prio) { setPrio(S, e.target.dataset.prio, e.target.value); panel(); return; } if (e.target.dataset.style) setStyle(S, e.target.dataset.style, e.target.value); if (e.target.dataset.ord) { setOrder(S, e.target.dataset.ord, e.target.value || null); panel(); } });
// review fix：存讀檔改用非阻斷提示（原本 alert() 會卡住瀏覽器自動化與遊戲迴圈）
function toast(msg, bad = false) { let t = document.getElementById('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:99;padding:6px 14px;border-radius:6px;font-size:14px;pointer-events:none'; document.body.appendChild(t); } t.textContent = msg; t.style.background = bad ? '#7a2a1e' : '#3a5a2a'; t.style.color = '#fff'; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(() => { t.style.display = 'none'; }, 2000); }
$('save').onclick = () => { try { if (transferMode) { const r = writeVerified(localStorage, activeTransferKey, save(S), activeTransferRaw); if (!r.ok) { toast(r.error, true); if (r.recovery) { const b = exportTransferBackup(r.recovery); if (b.ok) downloadBytes(b.bytes, 'homestead-recovery.json'); } return; } activeTransferRaw = save(S); refreshTransfers(); } else localStorage.setItem('solo-sect-save', save(S)); toast(`已存檔（第 ${Math.floor(S.t / 600) + 1} 日）`); } catch (e) { toast('存檔失敗：' + e.message, true); } };
$('load').onclick = () => { try { const raw = localStorage.getItem(transferMode ? activeTransferKey : 'solo-sect-save') || ''; const r = transferMode ? validateTransferSave(raw) : load(raw); if (r.ok) { if (transferMode) activeTransferRaw = localStorage.getItem(activeTransferKey); S = r.state; lastAuto = S.t; if (!transferMode) try { syncLegacy(localStorage, S); } catch {} toast('已讀檔'); } else toast(r.error ?? r.err, true); panel(); } catch { toast('無法讀取本機存檔；目前進度保留。', true); } };
$('reset').onclick = () => newGame();
$('transfer-hint').onclick = (e) => { if (e.target.id === 'toggle-transfer-life' && S.homesteadOrigin) { S.homesteadOrigin.lifeOnly = S.homesteadOrigin.lifeOnly === false; panel(); } if (e.target.id === 'toggle-transfer-hint' && S.homesteadOrigin) { S.homesteadOrigin.hintsHidden = !S.homesteadOrigin.hintsHidden; panel(); } };
$('load').addEventListener('click', () => { if (document.getElementById('start')) { document.getElementById('start').remove(); starting = false; } });
let last = performance.now(), acc = 0;
function loop(now) { acc += Math.min(0.5, (now - last) / 1000) * speed; last = now; if (starting || choiceUI(S) || S.alert) acc = 0; feed(); while (acc >= 0.25) { tick(S); acc -= 0.25; }
  audioStep(); expToast(); fightWatch(); draw(); drawMinimap(); if (now - lastPanel > 400 && !window.__sect.freeze && !document.activeElement?.matches('select,input')) { panel(); lastPanel = now; } requestAnimationFrame(loop); }
function rbar(n, v, max, c) { const p = Math.max(0, Math.min(1, (v ?? 0) / (max || 1))); return `${n} <span style="display:inline-block;width:80px;height:8px;background:#ddd;vertical-align:middle"><span style="display:block;height:8px;width:${p * 80}px;background:${c}"></span></span> ${Math.max(0, Math.round(v ?? 0))}`; }
const JH_FX = { anran: ['#7a8ca8', 'arc'], xuantie: ['#2a2a2a', 'heavy'], yunv: ['#eef', 'arc'], kongming: ['#bcb', 'arc'], kuihua: ['#d04050', 'needle'], huagu: ['#9a8aa8', 'arc'], qiankun: ['#e0a040', 'arc'], taiji: ['#ddd', 'arc'], shihou: ['#f0d070', 'ring'], tantui: ['#a07040', 'arc'], tiexian: ['#889', 'heavy'], bagua: ['#8a6a3a', 'arc'], hama: ['#6a8a3a', 'toad'] };
function drawSect() { // v1.35 匾額＋旗幟（共用破道館地圖，只換字與色）
  const T = S.sect; if (!T) return; const [hx, hy] = NODES.hall, x = hx, y = hy - 118;
  g.save(); g.font = 'bold 20px serif'; const w = g.measureText(T.plaque).width + 28;
  g.fillStyle = '#2a1a0e'; g.fillRect(x - w / 2 - 4, y - 20, w + 8, 34); g.fillStyle = T.color; g.fillRect(x - w / 2, y - 16, w, 26);
  g.strokeStyle = '#e8c26a'; g.lineWidth = 2; g.strokeRect(x - w / 2, y - 16, w, 26); g.fillStyle = '#ffe9a8'; g.textAlign = 'center'; g.fillText(T.plaque, x, y + 4);
  for (const fx of [x - w / 2 - 34, x + w / 2 + 34]) { g.fillStyle = '#4a3420'; g.fillRect(fx - 2, y - 40, 4, 92); g.fillStyle = T.color; g.beginPath(); g.moveTo(fx + 2, y - 40); g.lineTo(fx + 40, y - 30); g.lineTo(fx + 2, y - 4); g.fill(); g.fillStyle = '#fff4d0'; g.font = 'bold 16px serif'; g.fillText(T.flag, fx + 16, y - 16); }
  if (T.fac) { const F = sectFac(S); g.font = 'bold 13px sans-serif'; g.lineWidth = 4; g.strokeStyle = '#fff'; g.strokeText(`🏯 ${F.name}`, x, y + 32); g.fillStyle = T.color; g.fillText(`🏯 ${F.name}`, x, y + 32); }
  g.restore();
}
function genHtml() { // v1.4 傳承
  const G = S.gen; if (!G) return ''; const out = [], nm = (id) => S.ds.find((d) => d.id === id)?.name || id;
  out.push(`🏛 ${S.sect?.name || '本門'}第 <b>${G.n}</b> 代掌門：${S.ds.find((d) => d.id === 'hero')?.name}　宿慧 ${'◆'.repeat(G.suhui)}${'◇'.repeat(GEN.suhuiMax - G.suhui)}（每傳一代，新開局自創 +1 點）`);
  if (G.couples.length) out.push(`💞 夫妻：${G.couples.map((c) => c.map(nm).join('＆')).join('、')}`);
  const kids = S.ds.filter((d) => d.child); if (kids.length) out.push(`🧒 第二代：${kids.map((d) => `${d.name}（${d.age}歲${d.adult ? '・已成年' : ''}；養父母 ${d.child.parents.map(nm).join('、')}；悟${d.wu}根${d.root}）`).join('、')}`);
  const ms = S.ds.filter((d) => d.master); if (ms.length) out.push(`📿 師承（師父大成武學 ×${1.2}）：${ms.map((d) => `${nm(d.master)}→${d.name}${d.lineArts?.length ? `〔${d.lineArts.map((a) => ARTS.find((x) => x.id === a)?.name).join('、')}〕` : ''}`).join('、')}`);
  if (G.lineage.length) out.push(`📜 衣缽譜：${G.lineage.map((x) => `第${x.gen}代 ${x.name} ─${x.art}→ ${x.heir}`).join('；')}`);
  const c = canSucceed(S); out.push(c.ok ? `🎎 傳衣缽：<select id="heir">${heirs(S).map((d) => `<option value="${d.id}">${d.name}</option>`).join('')}</select> 傳 ${ARTS.find((a) => a.id === heirArt(S.ds.find((d) => d.id === 'hero')))?.name} <button data-succeed="1">傳位退隱</button>` : `🎎 衣缽：${c.why}`);
  return `<div class="k"><b>傳承・第二代</b><br>${out.join('<br>')}</div>`;
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-succeed]')) { const r = succeed(S, document.getElementById('heir')?.value); if (r.ok) { try { localStorage.setItem('solo-sect-suhui', String(Math.max(+localStorage.getItem('solo-sect-suhui') || 0, S.gen.suhui))); } catch {} } else alert(r.why); panel(); } });
function sectHtml() {
  const T = S.sect; if (!T) return ''; const F = sectFac(S), c = canBuildFac(S), out = [];
  const bias = Object.entries(T.bias).map(([k, v]) => `${k}${v > 0 ? '+' : ''}${Math.round(v * 100)}%`).join('・') || '無';
  out.push(`🏮 <b style="color:${T.color}">${T.plaque}</b>　門派聲望 <b>${T.rep}</b>　流派偏向：${bias}`);
  out.push(`📜 門規：${T.rules.map((k) => { const R = RULE_LIB[k], last = T.viol[k]; return `${R.text}${R.flavor ? '' : last != null && S.t - last < 3 * DAY13 ? '<span style="color:#c0392b">（近日違反）</span>' : '<span style="color:#2e7d32">（遵守中）</span>'}`; }).join('；') || '無'}`);
  if (T.tree.length) out.push(`🥋 本門武學：${T.tree.map((id) => ARTS.find((a) => a.id === id)?.name).join('、')}${T.ban.length ? `　禁學：${T.ban.map((id) => ARTS.find((a) => a.id === id)?.name).join('、')}` : ''}`);
  const ext = []; for (const d of S.ds) for (const id of Object.keys(d.arts || {})) { const k = artKind(S, d, id); if (k === 'outside' || k === 'guest' || k === 'ban') ext.push(`${d.name}・${ARTS.find((a) => a.id === id)?.name}〔${KIND_NAME[k]}〕`); }
  if (ext.length) out.push(`🔀 外來武學（外門 ×${SECT_K.outside}，客傳不罰）：${ext.join('、')}`);
  out.push(`⚔ 宿敵：${T.rivals.map((r) => `${r}${T.beaten[r] ? `（擊退 ${T.beaten[r]}）` : ''}`).join('、') || '—'}（守巡山第 2、4… 道關）`);
  if (F) out.push(T.fac ? `🏯 鎮派設施：<b>${F.name}</b>——${F.desc}` : `🏯 ${F.name}：${F.desc}　<button data-sectfac="1" ${c.ok ? '' : 'disabled'}>建造（${Object.entries(F.cost).map(([k, v]) => `${RES_NAMES[k] || k}${v}`).join('、')}；聲望 ${SECT_K.facRep}）</button>${c.ok ? '' : `<span class="small">${c.why}</span>`}`);
  if (T.expelled.length) out.push(`🚪 逐出：${T.expelled.join('、')}`);
  return `<div class="k"><b>門派身分</b><br>${out.join('<br>')}</div>`;
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-sectfac]')) { buildFac(S); panel(); } });
function jhHtml() {
  const J = S.jh; if (!J) return ''; const out = [], nm = (id) => S.ds.find((d) => d.xia === id || (d.id === 'hero' && S.hero?.id === id));
  const yg = nm('yangguo'); if (yg) out.push(`🦅 楊過：神鵰 ${Math.min(J.diao, JH.diaoFeeds)}/${JH.diaoFeeds}${J.armLost ? '・已斷臂（玄鐵劍法）' : ''}・心情 ${Math.round(yg.mood)}（黯然 ×${(yg.jhMul || 1).toFixed(2)}）`);
  if (J.bees) out.push(`🐝 玉蜂漿 ${J.honey}`);
  if (J.zbt) out.push(`🦗 周伯通賭約：贏 ${J.zbt.wins}・輸 ${J.zbt.losses}・已教 ${J.zbt.taught.length}/2`);
  if (J.dfbb) out.push(`🪡 東方不敗：${J.dfbb === 2 ? '已擊退（葵花殘頁）' : '敗過一次，還會再來'}`);
  if (J.hy) out.push(`🐸 火雲邪神：${J.hy === 2 ? '跪地認輸（蛤蟆功殘頁）' : '敗過一次，還會再來'}`);
  if (J.casino) out.push(`🎲 賭坊抽頭累計 ${J.gambleSum}（每日上限 ${JH.gambleCap}）`);
  const hid = S.ds.filter((d) => d.hidden); if (hid.length) out.push(`🧺 深藏不露：${hid.map((d) => (d.hidden.shown ? `<b>${d.name}</b>` : '？？')).join('、')}（${hid.length}/${JH.hiddenMax}）`);
  if (J.poison) out.push('☠ 慢性化骨綿掌（三天自癒）');
  if (S.hero && ARC13[S.hero.id]) out.push(`📜 主線：${ARC13[S.hero.id].map((x, i) => (i < (S.hero.arcStep || 0) ? `<b>${x}</b>` : `<span style="opacity:.45">${x}</span>`)).join(' → ')}`);
  const wk = J.comedy.filter((t) => S.t - t < 7 * DAY13).length;
  out.push(`<label><input type="checkbox" data-jhopt="morningOn" ${J.morningOn ? 'checked' : ''}> 晨課令</label>　<label><input type="checkbox" data-jhopt="comedyOn" ${J.comedyOn ? 'checked' : ''}> 喜劇卡（本週 ${wk}/${JH.comedyWeek}）</label>`);
  return `<div class="k"><b>江湖群像</b><br>${out.join('<br>')}</div>`;
}
document.addEventListener('change', (e) => { const k = e.target?.dataset?.jhopt; if (k && S.jh) S.jh[k] = e.target.checked; });
function hsHtml() {
  const X = S.hs; if (!X) return ''; const out = [];
  for (const d of S.ds) if (d.zixia) out.push(`🟣 ${d.name}紫霞神功 第 ${d.zixia}/9 層${zxGate(S, d) ? `（${zxGate(S, d)}）` : `（閉關 ${Math.floor(X.zx)}/${HS.zxNeed * d.zixia}）`}`);
  if (X.cave === true) out.push(`🪨 華山祕洞壁刻 ${X.carv}/3`);
  if (X.bixie === 3) out.push('🩸 辟邪劍法（斷情）'); else if (X.bixie > 0) out.push(`📜 辟邪劍譜線 ${X.bixie}/3`);
  if (X.songN) out.push(`⚔ 嵩山派施壓 ${X.songN} 次`);
  if (X.feng) out.push(`🗻 思過崖：風清揚指點第 ${X.feng.night}/${HS.fengNights} 晚（傳人 ${S.ds.find((d) => d.id === X.feng.student)?.name || '—'}）`); else if (X.fengLeft) out.push('🗻 風清揚已入崖不出');
  for (const d of S.ds) if (d.dugu?.length) out.push(`🗡 ${d.name}獨孤九劍 ${d.dugu.length}/9：${DUGU.map((f) => (d.dugu.includes(f.id) ? f.name : `<span style="opacity:.4">${f.name}</span>`)).join(' ')}`);
  if (X.lhc !== 'stay') out.push(`令狐沖：${X.lhc === 'expelled' ? '已逐出師門' : '容下了'}`);
  return out.length ? `<div class="k"><b>華山線</b><br>${out.join('<br>')}</div>` : '';
}
function xiaHtml() {
  const X = S.xia; if (!X) return '';
  const pool = xiaPool(S).map((k) => `${XIA[k].name}（${XIA[k].need(S) ? '<b style="color:#c83">機緣已到</b>' : XIA[k].why}）`).join('、') || '—';
  const T = X.teacher, tt = T ? `<div class="k">🍶 ${T.name}傳功：降龍十八掌 ${T.stage}/3・黃蓉的菜 ${T.meals}/${Math.min(3, T.stage + 1)}・傳人 ${T.student ? S.ds.find((d) => d.id === T.student)?.name : (pickStudent(S)?.name || '（缺拙／剛脾性）')}</div>` : '';
  const sig = S.ds.flatMap((d) => ['xianglong', 'dagou'].filter((a) => d.arts?.[a]).map((a) => `${d.name}・${a === 'xianglong' ? '降龍十八掌' : '打狗棒法'}`)).join('、');
  return `<div class="k"><b>名俠奇遇</b>　可遇：${pool}</div>${tt}${sig ? `<div class="k">招牌武學：${sig}</div>` : ''}${Object.keys(X.left).length ? `<div class="k">已下山：${Object.keys(X.left).map((k) => XIA[k].name).join('、')}</div>` : ''}`;
}
function manualHtml() {
  const ms = S.manuals || [], ps = Object.keys(MANUALS);
  return `<div class="k">秘笈殘章：${ps.map((k) => `${k === 'page1' ? '凡階' : '精階'} ${S.res[k] || 0}/${MANUALS[k].need} <button data-asm="${k}" ${canAssemble(S, k) ? '' : 'disabled'}>湊成${MANUALS[k].name}</button>`).join('　')}${ms.map((m, i) => `<div>📜《${ARTS.find((a) => a.id === m.art).name}》<select data-lm="${i}"><option value="">指定研讀…</option>${disciples(S).filter((d) => !d.arts?.[m.art]).map((d) => `<option value="${d.id}">${d.name}</option>`).join('')}</select></div>`).join('')}</div>`;
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-asm]'); if (b) { assemble(S, b.dataset.asm); panel(); } });
document.addEventListener('change', (e) => { const s = e.target.closest('[data-lm]'); if (s && s.value) { const r = learnManual(S, +s.dataset.lm, s.value, think10); if (!r.ok) alert(r.why); panel(); } });
// v1.0 鏡頭：大事件短暫拉近
const cam = { x: HOME_VIEW.x, y: HOME_VIEW.y, z: 1, ux: HOME_VIEW.x, uy: HOME_VIEW.y, uz: 1, tx: 0, ty: 0, until: 0, follow: false, prev: null };
export function camFocus(x, y, sec = 2.5) { cam.tx = x + HOME.x; cam.ty = y + HOME.y; cam.until = performance.now() + sec * 1000; } // 傳入門派座標
export const camHome = () => { cam.follow = false; Object.assign(cam, { ux: HOME_VIEW.x, uy: HOME_VIEW.y, uz: 1 }); };
export const camFollow = (on = !cam.follow) => { cam.follow = on && !!S.exp; refreshCamUI(); };
window.__camFocus = camFocus; window.__cam = cam; window.__camHome = camHome; window.__camFollow = camFollow;
// ---- v1.55a 世界：256px 區塊第一次進視窗才畫進離屏 canvas，之後每幀只 drawImage ----
const CHUNKS = new Map(); window.__chunks = CHUNKS; const ART = { ground: IMG.ground, grass: IMG.grass, pine: IMG.pine, bamboo: IMG.bamboo };
function chunkCanvas(cx, cy) { return lruGet(CHUNKS, chunkKey(cx, cy), () => { const c = document.createElement('canvas'); c.width = c.height = CHUNK; paintChunk(c.getContext('2d'), cx, cy, ART); return c; }, CHUNK_CAP); } // v1.6 64 格 LRU
function drawWorld(c) { g.fillStyle = '#b9ad8f'; const hw = 800 / c.z, hh = 450 / c.z; g.fillRect(c.x - hw, c.y - hh, hw * 2, hh * 2);
  const lod = lodOf(c.z); drawWorld.lod = lod; const fogC = [];
  if (lod === 'far') { g.drawImage(mmBaseImg(), 0, 0, WORLD.w, WORLD.h); for (let cy = 0; cy < FOG_H; cy++) for (let cx = 0; cx < FOG_W; cx++) if (fogged(S, cx, cy)) fogC.push([cx, cy]); } // 遠景：一張烘好的環色縮圖，不建區塊
  else for (const [cx, cy] of chunksInView(c)) { if (fogged(S, cx, cy)) { fogC.push([cx, cy]); continue; } g.drawImage(chunkCanvas(cx, cy), cx * CHUNK, cy * CHUNK); }
  drawWorld.fog = fogC;
  { const path = (w, c) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.beginPath(); TRAIL.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); };
    g.save(); path(30, '#6b4f30'); path(22, '#c9a874'); g.setLineDash([3, 14]); path(6, '#a8875a'); g.restore(); } // v1.55b 山徑（黃土路＋路邊）
  if (lod !== 'far') { const pd = partyDist(S), hit = fightLog.hit; for (const sp of SPOTS) { const done = (pd != null && pd >= sp.d) || hit.has(sp.i), [x, y] = sp.pos; if (fogged(S, Math.floor(x / CHUNK), Math.floor(y / CHUNK))) continue; // 固定怪點：本趟走過＝已處理
    g.save(); g.globalAlpha = done ? 0.35 : 1; const sn = MONSTERS[sp.k]?.sprite; if (sn) sprite(sn, x, y, SC * 0.8); else { g.fillStyle = '#7a2a1a'; g.beginPath(); g.arc(x, y - 10, 11, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText(ENEMIES[sp.k].name[0], x, y - 6); }
    const gi = ROUTE.findIndex((g) => g.id === sp.ring), gn = sp.gate ? (rivalGate(S, routeSeg(gi), gi)?.gateName || sp.gate) : null, fought = fightLog.names.get(sp.i), ev = fightLog.evaded.has(sp.i);
    label(ev ? `殘・${fought}` : done ? (fought ? `✕ ${fought}` : '✕') : gn ? `守關・${gn}` : ENEMIES[sp.k].name, x, y + 14, ev ? '#c05010' : sp.gate ? '#b0301a' : '#7a1a10'); g.restore(); } }
  for (const r of RINGS) { const n = S.pop?.[r.id]?.n ?? 0, [x, y] = r.nest; g.fillStyle = '#5a2a1a'; g.beginPath(); g.arc(x, y, 16, 0, 7); g.fill(); g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#fff';
    const s = `${r.name}巢${denDown(S, r.id) ? '（毀）' : ''}・${n}/${Math.floor(capOf(S, r.id))}`; if (lod === 'far') { if (fogged(S, Math.floor(x / CHUNK), Math.floor(y / CHUNK))) continue; g.beginPath(); g.arc(x, y, 60, 0, 7); g.fill(); g.font = 'bold 80px sans-serif'; g.lineWidth = 14; g.strokeText(s, x, y - 90); g.fillStyle = '#5a2a1a'; g.fillText(s, x, y - 90); continue; } // 遠景族群圖示
    g.strokeText(s, x, y - 26); g.fillStyle = '#5a2a1a'; g.fillText(s, x, y - 26); } }
// ---- v1.55d 雲海：隊伍過了絕頂進入無盡段 → 在入口拉近轉場 → 換到一張循環雲海圖，每重繞一圈 ----
export function setZoom(k) { cam.uz = ZOOMS[k]; refreshCamUI(); } window.__setZoom = setZoom;
const cloudV = { want: null, on: false, t0: 0 }; window.__cloudV = cloudV; // want：null＝自動（跟隨中且隊伍在雲海就進），true/false＝玩家按鈕
const cloudOn = () => { const C = S && partyCloud(S); if (!C) return false; return cloudV.want ?? cam.follow; };
const PUFF = Array.from({ length: 34 }, (_, i) => { const h = (n) => ((Math.sin(i * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1; return [h(1) * 1700 - 50, h(2) * 900, 60 + h(3) * 120, 6 + h(4) * 14]; });
function drawCloud() { const on = cloudOn(), now = performance.now(); if (on !== cloudV.on) { cloudV.on = on; cloudV.t0 = now; if (on) { const e = trailAt(TRAIL_END); cam.tx = e[0]; cam.ty = e[1]; cam.until = now + 900; } }
  const cb = $('cam-cloud'); if (cb) { const C = S && partyCloud(S); cb.hidden = !C; cb.textContent = on ? '⛰ 回山圖' : '☁ 雲海'; }
  const k = Math.min(1, (now - cloudV.t0) / 900); if (!on && k >= 1) return; const a = on ? k : 1 - k; if (a <= 0) return;
  const C = partyCloud(S) || { k: 1, f: 0 }; g.save(); g.globalAlpha = a; const sc = 0.4 + 0.6 * (on ? 1 - (1 - k) ** 3 : 1); g.translate(800, 450); g.scale(sc, sc); g.translate(-800, -450);
  const bg = g.createLinearGradient(0, 0, 0, 900); bg.addColorStop(0, '#9fb6d6'); bg.addColorStop(0.55, '#e9eef6'); bg.addColorStop(1, '#f7f4ee'); g.fillStyle = bg; g.fillRect(-400, -300, 2400, 1500);
  for (const [x, y, r, sp] of PUFF.slice(0, 17)) { const xx = ((x + now / 1000 * sp) % 1800) - 100; g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(xx, y, r * 1.8, r * 0.6, 0, 0, 7); g.fill(); }
  g.fillStyle = '#7d8798'; g.beginPath(); g.ellipse(CLOUD_MAP.cx, CLOUD_MAP.cy + 40, 200, 70, 0, 0, 7); g.fill(); g.fillStyle = '#e8ecf3'; g.beginPath(); g.moveTo(640, 520); g.lineTo(800, 300); g.lineTo(960, 520); g.fill(); // 中央孤峰
  g.save(); g.strokeStyle = 'rgba(120,110,90,.55)'; g.lineWidth = 26; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i <= 120; i++) { const [x, y] = cloudPos(i / 120, C.k); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.strokeStyle = '#efe6d2'; g.lineWidth = 14; g.setLineDash([2, 16]); g.stroke(); g.restore();
  const [ex, ey] = cloudPos(0, C.k); g.fillStyle = '#6b4f30'; g.fillRect(ex - 30, ey - 8, 60, 16); label(`入口（第${C.k}重起點）`, ex, ey + 30, '#4a3a2a');
  for (const p of cloudSpots(C.k)) { const done = C.f >= p.f, [x, y] = p.pos; g.save(); g.globalAlpha = a * (done ? 0.35 : 1); g.fillStyle = p.gate ? '#8a1a10' : '#5a4a6a'; g.beginPath(); g.arc(x, y - 10, p.gate ? 18 : 12, 0, 7); g.fill(); label(done ? '✕' : p.gate ? `守關・第${C.k}重無名高手` : '雲中異獸', x, y + 16, p.gate ? '#b0301a' : '#4a3a5a'); g.restore(); }
  if (S.exp) { const X = S.exp, back = X.phase === 'back', team = X.team.map((id) => S.ds.find((d) => d.id === id)).filter(Boolean);
    team.forEach((d, i) => { const [x, y] = cloudPos(Math.max(0, C.f - i * 0.012), C.k), im = IMG[d.sprite]; if (!im?.width) return; g.save(); g.translate(x, y + Math.sin(now / 90 + i) * 2); if (back) g.scale(-1, 1); g.drawImage(im, -im.width * SC * 0.35, -im.height * SC * 0.7, im.width * SC * 0.7, im.height * SC * 0.7); g.restore(); });
    const [x, y] = cloudPos(C.f, C.k); label(`巡山隊・絕頂之上第${C.k}重 ${Math.round(C.f * 100)}%${back ? '・回程' : ''}`, x, y - 80, '#7a1a10'); }
  for (const [x, y, r, sp] of PUFF.slice(17)) { const xx = ((x + now / 1000 * sp * 1.5) % 1800) - 100; g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(xx, y, r * 2, r * 0.5, 0, 0, 7); g.fill(); }
  g.font = 'bold 34px serif'; g.textAlign = 'left'; g.fillStyle = '#3a4a6a'; g.fillText(`☁ 雲海・第${C.k}重`, 40, 860); g.restore();
  if (on && k < 1) { g.fillStyle = `rgba(255,255,255,${Math.sin(k * Math.PI) * 0.9})`; g.fillRect(0, 0, 1600, 900); } } // 拉近轉場：白霧一閃
window.__cloudOn = () => cloudOn();
function drawFog() { // v1.55c 迷霧：未探＝雲霧遮住；已探但不在視野＝淡化（只在巡山中）
  for (const [cx, cy] of drawWorld.fog || []) { const x = cx * CHUNK, y = cy * CHUNK; g.fillStyle = '#4a4a56'; g.fillRect(x - 1, y - 1, CHUNK + 2, CHUNK + 2); if (drawWorld.lod === 'far') continue; g.fillStyle = 'rgba(255,255,255,.07)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + 40 + k * 60, y + 80 + (k % 2) * 90, 50, 0, 7); g.fill(); } }
  if (S.exp && drawWorld.lod !== 'far') { g.fillStyle = 'rgba(240,236,225,.35)'; const c = { x: cam.x, y: cam.y, z: cam.z }; for (const [cx, cy] of chunksInView(c)) { const x = cx * CHUNK, y = cy * CHUNK; if (fogged(S, cx, cy) || (x < HOME.w && y >= HOME.y) || inVision(S, [x + CHUNK / 2, y + CHUNK / 2])) continue; g.fillRect(x, y, CHUNK, CHUNK); } } }
function drawWorldTop() { drawFog(); const rd = raidDescent(S, raidMul(S)); // 獸襲下山（演出）
  if (rd) { const [x, y] = rd.pos; sprite(MONSTERS[rd.k].sprite, x, y, SC); label(`${MONSTERS[rd.k].name}下山中`, x, y - 40, '#a33'); }
  const pd = partyDist(S); if (pd != null) { const X = S.exp, team = X.team.map((id) => S.ds.find((d) => d.id === id)).filter(Boolean), back = X.phase === 'back', walking = !(X.busy > 0) && !fightLog.cur;
    const sty = back ? 'steady' : X.style; team.forEach((d, i) => { const [x, y] = styledPos(Math.max(0, pd + (back ? 1 : -1) * i * (sty === 'dash' ? 2 : 4)), sty), bob = walking ? Math.sin(performance.now() / 90 + i) * 2 : 0, im = IMG[d.sprite]; if (drawWorld.lod !== 'near') { const r = drawWorld.lod === 'far' ? 34 : 12; g.fillStyle = '#d0281c'; g.strokeStyle = '#fff'; g.lineWidth = r / 4; g.beginPath(); g.arc(x + i * r * 1.6, y, r, 0, 7); g.fill(); g.stroke(); if (drawWorld.lod === 'mid') label(d.name, x + i * r * 1.6, y - 18, '#7a1a10'); return; } if (!im?.width) return;
      g.save(); g.translate(x + (i % 2 ? 10 : -10), y + bob); if (back) g.scale(-1, 1); g.drawImage(im, -im.width * SC * 0.7 / 2, -im.height * SC * 0.7, im.width * SC * 0.7, im.height * SC * 0.7); g.restore(); });
    const [x, y] = trailAt(pd); if (drawWorld.lod === 'far') { g.font = 'bold 90px sans-serif'; g.textAlign = 'center'; g.lineWidth = 14; g.strokeStyle = '#fff'; g.strokeText('巡山隊', x, y - 70); g.fillStyle = '#b0201a'; g.fillText('巡山隊', x, y - 70); } else label(`巡山隊 ${Math.round(pd)} 步${back ? '・回程' : `・${STYLE_PATH[X.style] || ''}`}`, x, y - 70, '#7a1a10');
    for (const L of leftovers(S, fightLog.evaded)) { if (!L.chasing) continue; const t0 = (fightLog.chase[L.i] ??= performance.now()), k = Math.min(1, (performance.now() - t0) / 3000), [px, py] = styledPos(pd, 'steady'), lx = L.pos[0] + (px + 30 - L.pos[0]) * k, ly = L.pos[1] + (py - L.pos[1]) * k; // 溜走的殘餘怪追上來（＝返程驚獸）
      const sn = MONSTERS[L.k]?.sprite; if (sn) sprite(sn, lx, ly, SC * 0.8); else { g.fillStyle = '#a03010'; g.beginPath(); g.arc(lx, ly - 10, 11, 0, 7); g.fill(); } label(`殘餘${fightLog.names.get(L.i) || ''}追來！`, lx, ly - 30, '#c05010'); } }
  const F = fightLog.cur; if (F) { const k = (performance.now() - F.t0) / FIGHT_MS; if (k >= 1) fightLog.cur = null; else { const [x, y] = F.pos; g.save(); // v1.55b 批次戰鬥演出：結果已由模擬算完，這裡只播 2.5 秒
      const sh = k < 0.7 ? Math.sin(k * 60) * 5 : 0, sn = MONSTERS[F.k]?.sprite, ex = x + 46 + sh; if (sn) sprite(sn, ex, y, SC * 0.9); else { g.fillStyle = '#7a2a1a'; g.beginPath(); g.arc(ex, y - 14, 15, 0, 7); g.fill(); }
      for (let i = 0; i < 3; i++) { const a = k * 9 + i * 2.1; g.strokeStyle = `rgba(255,240,200,${0.9 - k})`; g.lineWidth = 4; g.beginPath(); g.arc(x + 24, y - 24, 22 + i * 7, a, a + 1.2); g.stroke(); }
      g.globalAlpha = Math.min(1, 3 * (1 - k)); g.font = 'bold 22px serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#fff'; const s = `⚔ ${F.name}${k > 0.55 ? `・${F.res}` : ''}`; g.strokeText(s, x + 24, y - 64); g.fillStyle = '#8a1a10'; g.fillText(s, x + 24, y - 64); g.restore(); } } }
// v1.55b 讀模擬差異得知剛打了誰（不寫狀態）
const FIGHT_MS = 2500; const fightLog = { n: null, f: 0, snap: null, cur: null, hit: new Set(), names: new Map(), evaded: new Set(), chase: {} }; window.__fightLog = fightLog;
const tally = (X) => ({ kills: { ...X.kills }, evaded: { ...X.evaded }, escaped: { ...X.escaped } });
function fightWatch() { const X = S?.exp; if (!X) { fightLog.n = null; fightLog.hit.clear(); fightLog.names.clear(); fightLog.evaded.clear(); fightLog.chase = {}; return; }
  if (fightLog.n !== X.startT) { fightLog.n = X.startT; fightLog.f = X.fights; fightLog.ev = Object.values(X.evaded || {}).reduce((a, b) => a + b, 0); fightLog.snap = tally(X); fightLog.hit.clear(); fightLog.names.clear(); fightLog.evaded.clear(); fightLog.chase = {}; return; }
  const ev = Object.values(X.evaded || {}).reduce((a, b) => a + b, 0); if (X.fights === fightLog.f && ev === fightLog.ev) return;
  const now = tally(X), diff = (a, b) => Object.keys(a).find((k) => (a[k] || 0) > (b[k] || 0)); const kk = diff(now.kills, fightLog.snap.kills), ke = diff(now.evaded, fightLog.snap.evaded), kf = diff(now.escaped, fightLog.snap.escaped), k = kk || kf || ke;
  const back = X.phase === 'back', sp = back ? null : SPOTS.filter((s) => s.d <= X.dist + 0.01).pop(); if (sp) { fightLog.hit.add(sp.i); if (k) fightLog.names.set(sp.i, ENEMIES[k].name); if (ke && !kk && !kf) fightLog.evaded.add(sp.i); }
  fightLog.cur = { t0: performance.now(), k, name: k ? ENEMIES[k].name : '守關', res: (back ? '返程驚獸・' : '') + (kk ? '擊倒' : kf ? '逃了' : ke ? '閃過' : '交手'), pos: trailAt(back ? (X.backPos ?? X.dist) : X.dist) };
  fightLog.f = X.fights; fightLog.ev = ev; fightLog.snap = now; }
// 捲動：拖曳地圖、滾輪縮放（邊界由 camBounds 決定）
{ let drag = null; const k = () => Math.max(1600 / cv.clientWidth, 900 / cv.clientHeight) / cam.uz;
  cv.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY]; cv.setPointerCapture?.(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (!drag) return; const f = k(); cam.ux -= (e.clientX - drag[0]) * f; cam.uy -= (e.clientY - drag[1]) * f; drag = [e.clientX, e.clientY]; if (cam.follow) { cam.follow = false; refreshCamUI(); } });
  addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); cam.uz = Math.min(1.6, Math.max(ZOOMS.far, cam.uz * (e.deltaY > 0 ? 0.9 : 1.1))); }, { passive: false }); }
{ const bar = document.createElement('div'); bar.id = 'camui'; bar.innerHTML = '<button id="cam-home">🏯 回山門</button><button id="cam-follow">👣 跟隨隊伍</button><span class="zoom"><button data-zoom="near">近</button><button data-zoom="mid">中</button><button data-zoom="far">遠</button></span><button id="cam-cloud" hidden>☁ 雲海</button>'; $('wrap').append(bar);
  const toast = document.createElement('div'); toast.id = 'camtoast'; toast.hidden = true; $('wrap').append(toast);
  $('cam-home').onclick = () => { camHome(); refreshCamUI(); }; $('cam-follow').onclick = () => camFollow(); bar.querySelectorAll('[data-zoom]').forEach((b) => (b.onclick = () => setZoom(b.dataset.zoom)));
  $('cam-cloud').onclick = () => { cloudV.want = !cloudOn(); }; toast.onclick = () => { camFollow(true); toast.hidden = true; }; }
// v1.55c 小地圖：全世界縮圖（底圖只畫一次）＋迷霧＋門派／隊伍／巢點＋視窗框；點哪跳哪
const MM = { w: 240, h: 180 }; MM.k = MM.w / WORLD.w; let mmBase = null;
function mmBaseImg() { if (mmBase) return mmBase; mmBase = document.createElement('canvas'); mmBase.width = MM.w; mmBase.height = MM.h; const m = mmBase.getContext('2d'), st = 32;
  for (let y = 0; y < WORLD.h; y += st) for (let x = 0; x < WORLD.w; x += st) { const c = cellColor(x + st / 2, y + st / 2) || '#c9b48a'; m.fillStyle = c; m.fillRect(x * MM.k, y * MM.k, st * MM.k + 0.5, st * MM.k + 0.5); }
  m.strokeStyle = '#7a5a3a'; m.lineWidth = 1.5; m.beginPath(); TRAIL.forEach((p, i) => (i ? m.lineTo(p[0] * MM.k, p[1] * MM.k) : m.moveTo(p[0] * MM.k, p[1] * MM.k))); m.stroke(); return mmBase; }
function drawMinimap() { const cv2 = $('minimap'); if (!cv2 || !S) return; const m = cv2.getContext('2d'), k = MM.k; m.drawImage(mmBaseImg(), 0, 0);
  m.fillStyle = '#3a3a46'; for (let cy = 0; cy < FOG_H; cy++) for (let cx = 0; cx < FOG_W; cx++) if (fogged(S, cx, cy)) m.fillRect(cx * CHUNK * k, cy * CHUNK * k, CHUNK * k + 0.5, CHUNK * k + 0.5);
  m.fillStyle = '#b5332a'; m.fillRect(HOME.x * k, HOME.y * k, HOME.w * k, HOME.h * k); m.fillStyle = '#fff'; m.font = '10px sans-serif'; m.fillText('山門', 4, MM.h - 6);
  for (const r of RINGS) { const cx = Math.floor(r.nest[0] / CHUNK), cy = Math.floor(r.nest[1] / CHUNK); if (fogged(S, cx, cy)) continue; m.fillStyle = '#5a2a1a'; m.beginPath(); m.arc(r.nest[0] * k, r.nest[1] * k, 2.5, 0, 7); m.fill(); }
  const pp = partyPos(S); if (pp) { m.fillStyle = '#ff3020'; m.beginPath(); m.arc(pp[0] * k, pp[1] * k, 4, 0, 7); m.fill(); }
  const z = cam.z; m.strokeStyle = '#fff'; m.lineWidth = 1.5; m.strokeRect((cam.x - 800 / z) * k, (cam.y - 450 / z) * k, 1600 / z * k, 900 / z * k); }
export function minimapJump(mx, my) { cam.follow = false; cam.ux = mx / MM.k; cam.uy = my / MM.k; refreshCamUI(); }
window.__minimapJump = minimapJump;
{ const c = document.createElement('canvas'); c.id = 'minimap'; c.width = MM.w; c.height = MM.h; $('wrap').append(c);
  c.addEventListener('click', (e) => { const r = c.getBoundingClientRect(); minimapJump((e.clientX - r.left) * MM.w / r.width, (e.clientY - r.top) * MM.h / r.height); }); }
function refreshCamUI() { const b = $('cam-follow'); if (!b) return; b.disabled = !S?.exp; b.classList.toggle('on', cam.follow); }
let lastExpT = null; function expToast() { const X = S?.exp, t = $('camtoast'); if (X && X.startT !== lastExpT) { lastExpT = X.startT; t.textContent = '👣 巡山隊出發了——點這裡跟著看'; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 8000); } if (!X) { lastExpT = null; t.hidden = true; } refreshCamUI(); }

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
setInterval(() => { if (!S || transferMode || S.t - lastAuto < AUTO.every) return; lastAuto = S.t; autosave(localStorage, save(S), { day: Math.floor(S.t / 600) + 1, name: S.hero?.name, suhui: suhuiOf(S), at: Date.now() }); }, 1000);
$('autos').onchange = (e) => { if (e.target.value === '') return; const r = load(autoGet(localStorage, +e.target.value) || ''); if (r.ok) { exitTransferMode(); S = r.state; lastAuto = S.t; try { syncLegacy(localStorage, S); } catch {} document.getElementById('start')?.remove(); starting = false; } else alert(r.err); panel(); };
$('export').onclick = () => { if (transferMode) { const b = exportTransferBackup(save(S)); if (b.ok) { downloadBytes(b.bytes, 'homestead-current.json'); toast('已準備目前進度備份下載；請確認檔案。'); } else toast(b.error, true); return; } const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([save(S)], { type: 'application/json' })); a.download = `solo-sect-day${Math.floor(S.t / 600) + 1}.json`; a.click(); URL.revokeObjectURL(a.href); };
$('import').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const r = load(await f.text()); if (r.ok) { exitTransferMode(); S = r.state; lastAuto = S.t; try { syncLegacy(localStorage, S); } catch {} document.getElementById('start')?.remove(); starting = false; } else alert('匯入失敗：' + r.err); e.target.value = ''; panel(); };
$('mute').onclick = () => { setMute(!isMuted()); ambient(!isMuted()); panel(); };
document.addEventListener('click', (e) => { if (e.target.closest('button')) { SFX.click(); if (!isMuted()) ambient(true); } }, true);
panel(); newGame(true);
const requestedSlot = slotKey(new URLSearchParams(location.search).get('homestead'));
if (requestedSlot) {
  activeTransferKey = requestedSlot;
  let raw = null; try { raw = localStorage.getItem(activeTransferKey); } catch {}
  const r = validateTransferSave(raw || '');
  if (r.ok && r.state.homesteadOrigin) { S = r.state; activeTransferRaw = raw; transferMode = true; lastAuto = S.t; document.getElementById('start')?.remove(); starting = false; panel(); }
  else toast('荒居轉接檔無法讀取；保留原存檔。', true);
}
refreshTransfers = mountTransferManager($('transfer-manager'));
requestAnimationFrame(loop);

// v1.65 師徒與傳功面板
function bondsHtml(S) { const out = ['<h3 style="margin:6px 0 2px">師徒</h3>'];
  for (const m of S.ds) { const ps = pupilsOf(S, m); if (ps.length) out.push(`<div>🧑‍🏫 ${m.name} → 徒弟 ${ps.map((p) => p.name).join('、')}</div>`); for (const c of apprCands(S, m)) out.push(`<div><button data-pupil="${m.id}|${c.id}">${m.name}收${c.name}為徒</button></div>`); }
  const P = Object.keys(S.passed || {}); if (P.length) out.push(`<div class="k">已傳功 ${P.length} 次</div>`);
  out.push(`<div class="k" id="xia-style">名俠池畫風：${(XIA_STYLES[S.xiaStyle || 'all'] || XIA_STYLES.all).name}</div>`);
  return out.length > 2 || P.length ? out.join('') : out.join('') + '<div class="k">尚無師徒（內門與外門互有好感 30 才能收徒）</div>'; }
// v1.8 畫像新舊開關（PB-15/16/18）
import { bindPortraitSet } from './portrait-set.mjs';
try { bindPortraitSet(document, localStorage, document.getElementById('pset')); } catch (e) { console.warn('portrait set', e); }

// v1.85 市集／義學按鈕
import { econHtml, marketDo } from './economy.mjs';
import { startSchoolTrip } from './sim.mjs';
document.addEventListener('click', (e) => { const m = e.target.closest('[data-mkt]'); if (m && S) { const r = marketDo(S, m.dataset.mkt); toast(r.ok ? `成交 ${r.p}` : r.why, !r.ok); return; } if (e.target.closest('[data-school]') && S) { const r = startSchoolTrip(S); toast(r.ok ? `${r.d.name}下山義學去了` : r.why, !r.ok); } });

// v1.9 I-2 擴地、I-6 山賊勒索、A9 因才派巡
import { buildWhy, lotsUsed, lotsOf, lotCost, lotWhy, buyLot, resolveRaid } from './sim.mjs';
import { threatHtml } from './threat.mjs';
import { suggestTeam } from './expedition.mjs';
document.addEventListener('click', (e) => {
  if (!S) return; const l = e.target.closest('[data-lot]'); if (l) { const r = buyLot(S); toast(r.ok ? `擴地花了 ${r.c}` : r.why, !r.ok); panel(); return; }
  const rb = e.target.closest('[data-raid]'); if (rb) { const r = resolveRaid(S, +rb.dataset.raid); toast(!r.ok ? r.why : r.paid ? `付了 ${r.paid}` : r.win ? '打退山賊' : '敗了', !r.ok || r.win === false); panel(); return; }
  if (e.target.id === 'exp-suggest') { const g = suggestTeam(S, 2); window.__exTeam = new Set(g.ids); window.__exWhy = g.why; panel(); }
});
