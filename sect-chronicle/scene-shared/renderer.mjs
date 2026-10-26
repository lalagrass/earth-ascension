import { Container, Sprite } from '../experiments/water-carry/demo/vendor/pixi.min.mjs';
import { assertSnapshot, pickActor } from './contract.mjs';
import { createEventCursor } from './events.mjs';

/** Same PixiJS 8 renderer for each adapter. Bindings own textures, never simulation. */
export function createSceneRenderer({ stage, definition, bindings }) {
  const world = new Container(), sorted = new Container();
  sorted.sortableChildren = true;
  world.addChild(sorted); stage.addChild(world);
  const actors = new Map(), layers = new Map(), cursor = createEventCursor();
  let snapshot = null;
  for (const layer of definition.layers || []) {
    const sprite = new Sprite(bindings.texture(layer.asset, layer.frame));
    sprite.position.set(layer.x, layer.y); sprite.anchor.set(layer.anchor?.x ?? 0, layer.anchor?.y ?? 0);
    if (layer.width != null) sprite.width = layer.width;
    if (layer.height != null) sprite.height = layer.height;
    sprite.alpha = layer.alpha ?? 1;
    sprite.eventMode = 'none';
    if (layer.depth == null) world.addChildAt(sprite, world.getChildIndex(sorted));
    else { sprite.zIndex = layer.depth; sorted.addChild(sprite); }
    layers.set(layer.id, sprite);
  }
  function actorSprite(a) {
    let sprite = actors.get(a.id);
    if (!sprite) { sprite = new Sprite(bindings.texture(a.asset, a.frame)); sprite.eventMode = 'none'; sorted.addChild(sprite); actors.set(a.id, sprite); }
    return sprite;
  }
  function render(next) {
    assertSnapshot(next); snapshot = next;
    const visible = new Set(next.actors.map((a) => a.id));
    for (const [id, sprite] of actors) if (!visible.has(id)) { sprite.destroy(); actors.delete(id); }
    for (const a of next.actors) {
      const sprite = actorSprite(a);
      sprite.texture = bindings.texture(a.asset, a.frame);
      sprite.anchor.set(a.anchor.x, a.anchor.y);
      sprite.scale.set((a.scale ?? 1) * a.face, a.scale ?? 1);
      sprite.position.set(a.x, a.y); sprite.zIndex = a.depth;
      sprite.rotation = a.rotation ?? 0;
      sprite.alpha = a.alpha ?? 1;
    }
    return cursor.consume(next);
  }
  return { world, sorted, actors, layers, definition, render,
    sprite: (id) => actors.get(id),
    pick(x, y, zoom) { return snapshot ? pickActor(snapshot.actors, x, y, zoom) : null; },
    get snapshot() { return snapshot; },
    destroy() { world.destroy({ children: true }); actors.clear(); layers.clear(); },
  };
}
