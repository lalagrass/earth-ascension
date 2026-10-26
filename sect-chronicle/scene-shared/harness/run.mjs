import { Application, Assets } from '../../experiments/water-carry/demo/vendor/pixi.min.mjs';
import { createSceneRenderer } from '../renderer.mjs';
import { createGeminiAdapter } from '../adapters/gemini.mjs';
import { createCamera } from '../camera.mjs';
import { createGeminiCore } from '../checks/cores.mjs';
import { createAnimator } from '../../experiments/water-carry/template/animator.mjs';
import { buildWatercolorScene } from '../../experiments/water-carry/demo/scene/watercolor.mjs';
import { createWorld } from '../sources/gpt/solo-sect-gpt/src/world.mjs';
import { createGPTAdapter, GPT_STEP_MS, gptDefinition } from '../adapters/gpt.mjs';
import { nativeGPTMap } from './gpt-map.mjs';
import { Q } from '../sources/gpt/solo-sect-gpt/src/data.mjs';
const demo = new URL('../../experiments/water-carry/demo/', import.meta.url);
const isGPT = new URL(location.href).searchParams.get('core') === 'gpt';
const world = isGPT ? createWorld({ seed: 11 }) : null;
const core = isGPT ? { model: world, definition: gptDefinition(), source: 'gpt:6cbd3e6fccb8bc376e95e2f406ce6cead2a30fdc', stepMs: GPT_STEP_MS } : createGeminiCore(true);
const { model, geometry } = core;
const template = await (await fetch(new URL('../template/actions.json', demo))).json();
const sheets = Object.fromEntries(await Promise.all(['hero', 'cousin'].map(async (id) => [id, await Assets.load(new URL(`assets/art184-production/${id}.json`, demo).href)])));
const animators = Object.fromEntries(Object.entries(sheets).map(([id, sheet]) => [id, createAnimator(template, sheet.data)]));
const app = new Application(); await app.init({ resizeTo: window, antialias: true, background: '#ded3ba' }); document.body.prepend(app.canvas);
const animalTextures = isGPT ? Object.fromEntries(await Promise.all(['boar_walk', 'rat_sniff'].map(async (id) => [id, await Assets.load(new URL(`assets/art184-watercolor/${id}.png`, demo).href)]))) : {};
const mapTexture = isGPT ? nativeGPTMap(app, world) : null;
const renderer = createSceneRenderer({ stage: app.stage, definition: core.definition, bindings: { texture: (id, frame) => id === 'gpt-native-map' ? mapTexture : animalTextures[id] || sheets[id].textures[frame] } });
let scenery;
if (!isGPT) {
  const manifestRoot = new URL('assets/home01/', demo), manifest = await (await fetch(new URL('manifest.json', manifestRoot))).json();
  await Assets.load(Object.values(manifest).map((m) => new URL(m.file, manifestRoot).href));
  scenery = buildWatercolorScene({ world: renderer.world, sorted: renderer.sorted, manifest, tex: (id) => Assets.get(new URL(manifest[id].file, manifestRoot).href) });
}
const adapter = !isGPT ? createGeminiAdapter({ getModel: () => model, geometry, source: core.source,
  appearance: (id, person, at) => {
    const phase = person.phase?.name || (person.mode === 'seated' ? 'rest' : ['toSeat', 'back', 'toFun', 'fromFun'].includes(person.mode) ? 'herbOut' : 'idle');
    const h = sheets[id].data.meta, r = Number(h.scale), pick = animators[id].pick({ phase, k: person.phase?.k || 0, travelled: at.travelled ?? 0 });
    return { frame: pick.frame, anchor: { x: h.anchorPx.x / h.frameSize.w, y: h.anchorPx.y / h.frameSize.h },
      body: { x: (h.hitbox.x - h.anchorPx.x) / r, y: (h.hitbox.y - h.anchorPx.y) / r, w: h.hitbox.w / r, h: h.hitbox.h / r } };
  },
}) : createGPTAdapter({ world, appearance: (p, state) => {
  if (p.kind !== 'human') {
    const asset = p.kind === 'boar' ? 'boar_walk' : 'rat_sniff', texture = animalTextures[asset], height = p.kind === 'boar' ? 36 : 18;
    return { asset, frame: 'static', scale: height / texture.height, anchor: { x: .5, y: .96 }, body: { x: -texture.width / 2, y: -texture.height, w: texture.width, h: texture.height } };
  }
  const id = p.id === 'leader' ? 'hero' : 'cousin', h = sheets[id].data.meta, r = Number(h.scale);
  const phase = p.moving ? state.load ? 'up' : 'down' : state.activity?.kind === 'gather' && state.activity.phase === 'gather' ? 'herbGather' : 'idle';
  const pick = animators[id].pick({ phase, k: 0, travelled: p.distance / Q });
  return { asset: id, frame: pick.frame, scale: p.kind === 'human' ? p.adult ? 1 : .7 : .5,
    anchor: { x: h.anchorPx.x / h.frameSize.w, y: h.anchorPx.y / h.frameSize.h },
    body: { x: (h.hitbox.x - h.anchorPx.x) / r, y: (h.hitbox.y - h.anchorPx.y) / r, w: h.hitbox.w / r, h: h.hitbox.h / r } };
} });
const camera = createCamera(isGPT ? { x: 1200, y: 900, zoom: .5 } : { x: 800, y: 700, zoom: .65 }, core.definition);
let accumulator = 0;
const clock = { clear() { accumulator = 0; }, feed(dtMs, rate) { accumulator += Math.min(250, Math.max(0, dtMs)) * rate; const n = Math.floor(accumulator / core.stepMs + 1e-9); accumulator -= n * core.stepMs; return n; } };
let playing = true, rate = 4, selected = null, drag;
const gather = (item) => isGPT ? adapter.command({ actorId: 'leader', action: { type: 'task', kind: 'gather', args: { item } } }) : adapter.command({ actorId: 'cousin', action: `work:${item}` });
gather('herb');
document.getElementById('source').textContent = core.source;
document.getElementById('play').onclick = () => { playing = !playing; clock.clear(); document.getElementById('play').textContent = playing ? '暫停' : '播放'; };
for (const button of document.querySelectorAll('[data-rate]')) button.onclick = () => { rate = Number(button.dataset.rate); };
document.getElementById('herb').onclick = () => gather('herb');
document.getElementById('water').onclick = () => { if (isGPT) gather('water'); else for (const actorId of ['hero', 'cousin']) adapter.command({ actorId, action: 'work:water' }); };
app.canvas.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, cx: camera.state.x, cy: camera.state.y }; app.canvas.setPointerCapture(e.pointerId); };
app.canvas.onpointermove = (e) => { if (drag) { camera.state.x = drag.cx - (e.clientX - drag.x) / camera.state.zoom; camera.state.y = drag.cy - (e.clientY - drag.y) / camera.state.zoom; } };
app.canvas.onpointerup = (e) => { if (drag && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 4) { const at = camera.toWorld(e.clientX, e.clientY); selected = renderer.pick(at.x, at.y, camera.state.zoom); } drag = null; };
app.canvas.addEventListener('wheel', (e) => { e.preventDefault(); camera.zoomAt(e.clientX, e.clientY, camera.state.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }, { passive: false });
let lastSnapshot;
app.ticker.add((t) => {
  if (playing) for (let i = clock.feed(t.deltaMS, rate); i > 0; i--) adapter.observeStep();
  lastSnapshot = adapter.snapshot({ paused: !playing, rate }); renderer.render(lastSnapshot);
  camera.resize(app.screen.width, app.screen.height); camera.apply(renderer.world);
  scenery?.tick(lastSnapshot.timeMs, lastSnapshot.actors);
  const v = isGPT ? { tick: world.tick, vat: world.inventories.vat.items.water, vatCapacity: world.inventories.vat.capacity, herbs: world.inventories.store.items.herb, herbCapacity: world.inventories.store.capacity } : model.view(); document.getElementById('state').textContent = `tick ${v.tick} · ${rate}× · ${playing ? '播放' : '暫停'}\n水 ${v.vat} / ${v.vatCapacity} · 藥 ${v.herbs} / ${v.herbCapacity}\n` + lastSnapshot.actors.filter((a) => !isGPT || ['leader','amu','child'].includes(a.id)).map((a) => `${a.id} · ${a.action.phase} · 負重 ${a.load}\n腳底 ${a.x.toFixed(1)}, ${a.y.toFixed(1)} · ${a.positionSource}`).join('\n') + `\n選取 ${selected || '—'}`;
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { playing = false; clock.clear(); } });
window.sceneHarness = { snapshot: () => structuredClone(lastSnapshot), state: () => isGPT ? structuredClone(world) : model.exportState(), pause() { playing = false; clock.clear(); } };
