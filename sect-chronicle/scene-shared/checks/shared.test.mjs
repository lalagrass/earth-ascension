import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Container, Texture } from '../../experiments/water-carry/demo/vendor/pixi.min.mjs';
import { createSceneRenderer } from '../renderer.mjs';
import { createGeminiAdapter } from '../adapters/gemini.mjs';
import { createCamera } from '../camera.mjs';
import { createGeminiCore } from './cores.mjs';
import { pickActor } from '../contract.mjs';
const appearance = () => ({ frame: 'idle', anchor: { x: .5, y: 1 }, body: { x: -15, y: -55, w: 30, h: 55 } });
function setup(fixed = false) {
  const core = createGeminiCore(fixed), adapter = createGeminiAdapter({ getModel: () => core.model, geometry: core.geometry, source: core.source, appearance });
  const stage = new Container(), renderer = createSceneRenderer({ stage, definition: core.definition, bindings: { texture: () => Texture.EMPTY } });
  return { ...core, adapter, renderer };
}
function freeze(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) freeze(v); } return o; }
for (const fixed of [false, true]) test(`${fixed ? 'fixed Gemini' : 'official'}: same Pixi renderer consumes real water/herb round trips without writing core`, () => {
  const { model, adapter, renderer, geometry } = setup(fixed);
  assert.ok(geometry.routes.water.length > 1650);
  assert.ok(adapter.command({ actorId: 'cousin', action: 'work:herb' }).ok);
  const modes = { hero: new Set(), cousin: new Set() }, loads = new Set(), events = [];
  let iterations = 0;
  while ((model.state.people.hero.done.water < 1 || model.state.people.cousin.done.herb < 1) && iterations++ < 30000) {
    adapter.observeStep();
    if (iterations % 97 === 0) {
      const before = JSON.stringify(model.exportState(Infinity)), snapshot = freeze(adapter.snapshot());
      for (const a of snapshot.actors) { modes[a.id].add(a.action.phase); if (a.id === 'hero') loads.add(a.load); }
      events.push(...renderer.render(snapshot));
      assert.deepEqual(renderer.render(snapshot), [], 'repeated frame never replays events');
      assert.equal(JSON.stringify(model.exportState(Infinity)), before, 'Pixi cannot modify authority');
      for (const a of snapshot.actors) assert.equal(renderer.sprite(a.id).zIndex, a.y);
    }
  }
  events.push(...renderer.render(adapter.snapshot()));
  assert.ok(model.state.people.hero.done.water >= 1); assert.ok(model.state.people.cousin.done.herb >= 1);
  assert.ok(modes.hero.has('down') && modes.hero.has('dip') && modes.hero.has('up') && modes.hero.has('pour'));
  assert.ok(modes.cousin.has('herbOut') && modes.cousin.has('herbGather') && modes.cousin.has('herbBack') && modes.cousin.has('herbDeliver'));
  assert.deepEqual([...loads].sort(), [0, 1]);
  const view = model.view(); assert.ok(view.people.hero.tripSpeeds.empty < view.people.cousin.tripSpeeds.empty);
  assert.deepEqual(events.filter((e) => e.kind === 'trip').map((e) => e.data), model.state.log.filter((e) => e.kind === 'trip'));
  renderer.destroy();
});

test('render cadence and 1×/4× batch rates preserve exact state/log; paused camera has zero world progress', () => {
  const a = setup(), b = setup();
  for (const s of [a, b]) assert.ok(s.adapter.command({ actorId: 'cousin', action: 'work:herb' }).ok);
  const allA = [], allB = [];
  for (let tick = 0; tick < 10000; tick++) {
    if (tick === 2300) for (const s of [a, b]) s.adapter.command({ actorId: 'hero', action: 'restAfterTrip' });
    if (tick === 2400) for (const s of [a, b]) s.adapter.command({ actorId: 'hero', action: 'work:herb' });
    if (tick === 5500) for (const s of [a, b]) s.adapter.command({ actorId: 'hero', action: 'restAfterTrip' });
    a.adapter.observeStep(); b.adapter.observeStep();
    allA.push(...a.renderer.render(a.adapter.snapshot({ rate: 1 })));
    if (tick % 60 === 59) allB.push(...b.renderer.render(b.adapter.snapshot({ rate: 4 })));
  }
  allB.push(...b.renderer.render(b.adapter.snapshot({ rate: 4 })));
  assert.deepEqual(a.model.exportState(Infinity), b.model.exportState(Infinity));
  assert.deepEqual(allA, allB);
  assert.equal(a.model.state.people.hero.rest, 'manual');
  assert.equal(a.model.state.people.hero.pending, null, 'latest stop wins after original delivery');
  const before = JSON.stringify(a.model.exportState(Infinity)), snap = a.adapter.snapshot({ paused: true });
  const cam = createCamera({ x: 800, y: 600, zoom: 1 }, { width: 1600, height: 1350 });
  cam.resize(1440, 900); cam.state.x -= 80; cam.zoomAt(400, 200, 1.4); cam.apply(a.renderer.world);
  for (let n = 0; n < 100; n++) a.renderer.render(snap);
  assert.equal(JSON.stringify(a.model.exportState(Infinity)), before);
  assert.equal(a.renderer.sprite('hero').x, snap.actors.find((x) => x.id === 'hero').x, 'no extrapolation');
  a.renderer.destroy(); b.renderer.destroy();
});

test('occluded actors remain selectable, foreground depth and foot anchor stay independent', () => {
  const s = setup(); s.model.step(); const snap = s.adapter.snapshot(); s.renderer.render(snap);
  const a = snap.actors[0];
  assert.equal(s.renderer.sprite(a.id).anchor.y, a.anchor.y);
  const front = [...snap.actors].reverse().sort((a, b) => b.depth - a.depth)[0];
  assert.equal(pickActor(snap.actors, front.x, front.y - 15), front.id);
  s.renderer.destroy();
});

test('fixed Gemini upstream files retain exact SHA-256 provenance', async () => {
  const root = new URL('../sources/gemini/', import.meta.url), manifest = JSON.parse(await readFile(new URL('manifest.json', root)));
  for (const [path, expected] of Object.entries(manifest.files)) assert.equal(createHash('sha256').update(await readFile(new URL(path, root))).digest('hex'), expected, path);
});


test('real GPT fixed core: native-map collection round trip, same renderer, deterministic seed/commands and all events', async () => {
  const { createWorld } = await import('../sources/gpt/solo-sect-gpt/src/world.mjs');
  const { createGPTAdapter, gptDefinition } = await import('../adapters/gpt.mjs');
  const { walkable } = await import('../sources/gpt/solo-sect-gpt/src/map.mjs');
  for (const seed of [11, 23, 37, 53, 71]) {
    const w = createWorld({ seed }), twin = createWorld({ seed });
    const a = createGPTAdapter({ world: w, appearance: () => ({ ...appearance(), asset: 'hero' }) });
    const b = createGPTAdapter({ world: twin, appearance: () => ({ ...appearance(), asset: 'hero' }) });
    const definition = gptDefinition(), renderer = createSceneRenderer({ stage: new Container(), definition: { ...definition, layers: [] }, bindings: { texture: () => Texture.EMPTY } });
    assert.equal(definition.width, 2400); assert.equal(definition.height, 1800);
    assert.ok(a.command({ actorId: 'leader', action: { type: 'task', kind: 'gather', args: { item: 'herb' } } }).ok);
    assert.ok(b.command({ actorId: 'leader', action: { type: 'task', kind: 'gather', args: { item: 'herb' } } }).ok);
    const phases = new Set(), deliveries = [], visited = new Set();
    let delivered = false;
    for (let i = 0; i < 2000 && !delivered; i++) {
      a.observeStep(); b.observeStep();
      if (i % 20 === 19) {
        const before = JSON.stringify(w), snap = freeze(a.snapshot({ rate: 4 }));
        const actor = snap.actors.find((p) => p.id === 'leader'); phases.add(actor.action.phase); visited.add(`${Math.round(actor.x)},${Math.round(actor.y)}`);
        assert.ok(walkable(w, actor.x, actor.y));
        const events = renderer.render(snap); deliveries.push(...events.filter((e) => e.kind === 'transfer' && e.data.from === 'bag.leader' && e.data.to === 'store' && e.data.item === 'herb'));
        delivered = deliveries.length > 0;
        assert.equal(JSON.stringify(w), before);
      }
    }
    assert.ok(delivered, `seed ${seed}: actual bag→store delivery`);
    assert.ok(phases.has('walking') && phases.has('gather'));
    assert.ok(visited.size > 10); assert.equal(w.inventories.store.items.herb, 6);
    assert.deepEqual(w, twin, `seed ${seed}: renderer changes no RNG, hits, routes, resources or result`);
    renderer.destroy();
  }
});

test('GPT source transport retains the original committed runtime hashes', async () => {
  const root = new URL('../sources/gpt/', import.meta.url), manifest = JSON.parse(await readFile(new URL('manifest.json', root)));
  for (const [path, expected] of Object.entries(manifest.files)) assert.equal(createHash('sha256').update(await readFile(new URL(path, root))).digest('hex'), expected, path);
});
