import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGeminiCore } from '../../scene-shared/checks/cores.mjs';
import { createOfficialFacilityAdapter, OFFICIAL_BASE } from '../official.mjs';
import { facilityHtml, tooltipText } from '../render.mjs';
import { pickFacility, field } from '../contract.mjs';
import { HERB } from '../../experiments/water-carry/demo/routes.mjs';
import { SPRING_PLACE } from '../../experiments/water-carry/demo/water-layout.mjs';
import { createWorld, step, command } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/world.mjs';
import { rects } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/map.mjs';
import { gptFacilities } from '../gpt.mjs';
const scene = JSON.parse(await readFile(new URL('../../experiments/water-carry/spikes/shared/scene.json', import.meta.url)));
const places = { vat: scene.places.vat, spring: SPRING_PLACE,
  rack: { label: '藥架', ...HERB.rack, rx: 30, ry: 22 }, herb: { label: '藥圃', ...HERB.patch, rx: 70, ry: 30 } };
function setup() { const c = createGeminiCore(); return { ...c, adapter: createOfficialFacilityAdapter({ getModel: () => c.model, places }) }; }
const get = (a, id, actorId = 'hero') => a.snapshot(actorId).find(f => f.nativeId === id);
test('detached source-labelled views, stable IDs, unsupported station capabilities and unknown masking', () => {
  const { model, adapter } = setup(), before = model.exportState(Infinity);
  for (let n = 0; n < 40; n++) {
    const v = get(adapter, 'rack');
    assert.equal(v.id, 'official:facility:rack'); assert.match(v.source, new RegExp(OFFICIAL_BASE));
    assert.deepEqual(v.interactionPoint.entrance.value, { x: 962, y: 512 });
    assert.notDeepEqual(v.interactionPoint.entrance.value, v.interactionPoint.anchor.value);
    assert.equal(v.stock.amount.value, model.view().herbs);
    assert.equal(v.stock.incoming.value, model.view().herbInFlight);
    assert.equal(Object.hasOwn(v.stock,'reserved'),false,'incoming must not retain a misleading consumption alias');
    assert.equal(v.capabilities.stationReservations.availability, 'unsupported');
    assert.equal(Object.hasOwn(v.capabilities.stationReservations, 'value'), false);
    assert.equal(v.stage.availability, 'unsupported');
    const hit = v.interactionPoint.hit;
    assert.equal(pickFacility(adapter.snapshot(), hit.x, hit.y)?.id, v.id);
    assert.match(facilityHtml(v, { actorId: 'hero', actors: { hero: { name: '主角' } } }), /站位預約.*不支援/);
    assert.match(tooltipText(v), /採藥/);
    v.stock.amount.value = 999; v.users.value.push({ actorId: 'fake' });
  }
  assert.deepEqual(model.exportState(Infinity), before, 'inspection and HTML do not advance authority or generate events');
  for (const availability of ['unknown', 'hidden', 'unsupported']) assert.deepEqual(field('missing', 99, { source: 'authority', availability }), { semanticId: 'missing', layer: 'base', source: 'authority', unit: '', availability });
});
test('two official facilities use exact native commands, entrances, full long walks and stock updates with whole-state parity', () => {
  const a = setup(), b = setup();
  for (const c of [a,b]) for (const id of ['hero','cousin']) assert.ok(c.model.dispatch('restAfterTrip', id).ok);
  for (const [actorId, nativeId, action] of [['hero','vat','work:water'], ['cousin','rack','work:herb']]) {
    assert.ok(a.adapter.command({ actorId, facilityId: `official:facility:${nativeId}`, action }).ok);
    assert.ok(b.model.dispatch(action, actorId).ok);
  }
  const seen = new Set(); let count = 0;
  while ((a.model.view().people.hero.done.water < 1 || a.model.view().people.cousin.done.herb < 1) && count++ < 18000) {
    a.model.step(); b.model.step();
    const v = a.model.view();
    for (const [id, actor] of [['spring','hero'], ['vat','hero'], ['herb','cousin'], ['rack','cousin']]) {
      const f = get(a.adapter, id, actor);
      if (f.users.value.some(u => u.actorId === actor)) {
        seen.add(id);
        const p = a.geometry.of(actor, v.people[actor]), e = f.interactionPoint.entrance.value;
        assert.ok(Math.hypot(p.x - e.x, p.y - e.y) < .01, `${id} uses actual route endpoint, not artwork anchor`);
      }
    }
    if (count === 1) { assert.equal(v.people.hero.done.water, 0); assert.ok(v.people.hero.tripProgress < .01); }
    if (count % 211 === 0) {
      const before = a.model.exportState(Infinity);
      for (const f of a.adapter.snapshot()) facilityHtml(f, { actorId: 'hero', actors: { hero: { name: '主角' }, cousin: { name: '熟手' } } });
      assert.deepEqual(a.model.exportState(Infinity), before);
    }
  }
  assert.ok(count < 18000); assert.ok(count > 2000, 'long route not skipped');
  assert.deepEqual([...seen].sort(), ['herb','rack','spring','vat']);
  assert.ok(a.model.view().people.hero.done.water >= 1); assert.ok(a.model.view().people.cousin.done.herb >= 1);
  assert.deepEqual(a.model.exportState(Infinity), b.model.exportState(Infinity));
});
test('stale/foreign/duplicate commands and full stores retain the core reason; newer stop wins', () => {
  const { model, adapter } = setup();
  assert.ok(adapter.command({ actorId: 'hero', facilityId: 'official:facility:rack', action: 'work:herb' }).ok);
  const before = model.exportState(Infinity);
  assert.equal(adapter.command({ actorId: 'hero', facilityId: 'official:facility:rack', action: 'work:herb' }).ok, false);
  assert.equal(adapter.command({ actorId: 'hero', facilityId: 'official:facility:rack', action: 'build' }).ok, false);
  assert.deepEqual(model.exportState(Infinity), before);
  assert.ok(model.dispatch('restAfterTrip', 'hero').ok);
  let ticks = 0;
  while (!model.view().people.cousin.leisure && ticks++ < 30000) model.step();
  assert.ok(ticks < 30000);
  const full = get(adapter, 'vat', 'cousin');
  assert.equal(full.stock.amount.value, full.stock.capacity.value, 'real unmodified core has filled the store');
  assert.equal(full.stock.amount.value, model.view().vat);
  assert.equal(full.stock.capacity.value, model.view().vatCapacity);
  assert.equal(full.actorStatus.value.reason, model.view().people.cousin.why);
  assert.equal(model.state.people.hero.rest, 'manual');
  const option = get(adapter, 'rack').activities.find(a => a.id === 'work:herb');
  const native = model.actions('hero').find(a => a.id === option.id);
  assert.equal(option.enabled, native.enabled); assert.equal(option.reason.value, native.enabled ? native.detail : native.reason);
});
test('true GPT second-core thin adapter reads native stages/doors with no RNG/event/state mutation', () => {
  for (const seed of [11,23,37]) {
    const w = createWorld({ seed }), twin = createWorld({ seed });
    const c = { actor: 'leader', type: 'task', kind: 'gather', args: { item: 'herb' } };
    assert.ok(command(w,c).ok); assert.ok(command(twin,c).ok);
    for (let n = 0; n < 500; n++) {
      step(w); step(twin);
      if (n % 43 === 0) {
        const before = structuredClone(w), views = gptFacilities(w), hall = views.find(f => f.nativeId === 'hall');
        assert.equal(hall.stage.value, w.facilities.hall.stage);
        assert.deepEqual(hall.interactionPoint.entrance.value, { x: rects.hall.door[0], y: rects.hall.door[1] });
        assert.equal(hall.capabilities.commands.availability, 'unsupported');
        assert.equal(hall.users.availability, 'unsupported');
        assert.match(facilityHtml(hall, { actorId: 'leader', actors: { leader: { name: '真GPT' } } }), /活動指派不支援/);
        hall.stage.value = 999;
        assert.deepEqual(w,before);
      }
    }
    assert.deepEqual(w,twin, 'full RNG and event streams match without viewing');
  }
});
