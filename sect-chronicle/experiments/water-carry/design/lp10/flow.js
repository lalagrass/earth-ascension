// LP-10 熱區翻稿：只切換 states.js 裡寫死的畫稿格。沒有世界時鐘、沒有 RNG、不匯入 demo/model.mjs、不寫回生活。
// 網址 ?path=A|B|C&step=0..&skill=b|e 可直接開某一格（render.js 用它輸出 PNG）。
import { loadAssets, drawScene, toScreen } from './scene.js';
import { STATES, PATHS } from './states.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const ui = { path: PATHS[q.get('path')] ? q.get('path') : 'A', step: Math.max(0, +q.get('step') || 0), skill: q.get('skill') === 'e' ? 'e' : 'b' };
const assets = await loadAssets();
const cv = $('cv'), ctx = cv.getContext('2d');

$('paths').innerHTML = Object.entries(PATHS).map(([k, p]) => `<button class="btn" data-path="${k}">${p.name}</button>`).join('');
$('paths').addEventListener('click', (e) => { const k = e.target.dataset.path; if (k) { ui.path = k; ui.step = 0; render(); } });
$('skill').addEventListener('click', (e) => { const k = e.target.dataset.skill; if (k) { ui.skill = k; render(); } });
$('prev').onclick = () => { if (ui.step > 0) { ui.step--; render(); } };
$('next').onclick = () => advance();
$('hot').onclick = () => advance();
$('panel').addEventListener('click', (e) => { if (e.target.dataset.hot) advance(); });
addEventListener('resize', () => render());
addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') advance(); if (e.key === 'ArrowLeft') $('prev').click(); });

function advance() {
  const steps = PATHS[ui.path].steps;
  ui.step = ui.step + 1 >= steps.length ? 0 : ui.step + 1;
  render();
}

function render() {
  const steps = PATHS[ui.path].steps;
  ui.step = Math.min(ui.step, steps.length - 1);
  const st = STATES[steps[ui.step]];
  const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1), narrow = W < 600;
  cv.width = W * dpr; cv.height = H * dpr;
  // 初學／熟練只換掌法格的姿勢與接觸效果；位置、路線、腳力完全相同
  const sk = { ...st, people: st.people.map((p) => p.pose ? { ...p, skill: ui.skill } : p), fx: (st.fx || []).map((f) => f.kind === 'contact' ? { ...f, skill: ui.skill } : f) };
  const [cx, cy, zk = 1] = st.cam;
  const cam = narrow ? { x: cx, y: cy + 70, zoom: 1.25 * zk } : { x: cx - 30 / zk, y: cy - 10 / zk, zoom: 1.55 * zk };
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene(ctx, assets, sk, cam, W, H);

  $('tags').innerHTML = (st.tags || []).map(([cls, text, x, y]) => {
    const [sx, sy] = toScreen(cam, W, H, x, y);
    const top = cls.startsWith('rat') ? sy : cls === 'hero' ? sy + 6 : sy;
    return `<span class="tag ${cls}" style="left:${sx}px;top:${top}px">${text}</span>`;
  }).join('');
  $('card').innerHTML = st.card || '';
  $('panel').innerHTML = st.panel || '';
  $('r-hero').textContent = st.s === 'S0' ? '挑水' : st.s === 'S5' ? '返院中' : '有限清理（設計示意）';
  const end = $('end');
  end.hidden = !st.endCard;
  if (st.endCard) end.innerHTML = `<h3>清理結束：${st.endCard.why}</h3><ul>${st.endCard.rows.map((r) => `<li>${r}</li>`).join('')}</ul><p>${st.endCard.next}</p>`;
  const hot = $('hot');
  hot.hidden = !(st.hot && st.hot.kind === 'at');
  if (!hot.hidden) { const [sx, sy] = toScreen(cam, W, H, st.hot.x, st.hot.y); hot.style.left = sx + 'px'; hot.style.top = sy + 'px'; hot.innerHTML = `<span>${st.hot.label}</span>`; hot.setAttribute('aria-label', st.hot.label); }

  for (const b of $('paths').children) b.classList.toggle('on', b.dataset.path === ui.path);
  for (const b of $('skill').children) b.classList.toggle('on', b.dataset.skill === ui.skill);
  $('step').textContent = `${PATHS[ui.path].name} · ${ui.step + 1}／${steps.length} · ${st.s} ${st.title}`;
  $('prev').disabled = ui.step === 0;
  $('next').textContent = ui.step + 1 >= steps.length ? '回到開頭 ↺' : st.hot ? `下一格（玩家：${st.hot.label}）→` : '下一格（時間推進）→';
  $('cap').textContent = st.cap;
  document.body.dataset.state = steps[ui.step];
  history.replaceState(null, '', `?path=${ui.path}&step=${ui.step}&skill=${ui.skill}`);
}
render();
document.body.dataset.ready = '1';
