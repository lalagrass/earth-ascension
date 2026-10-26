/**
 * Scene contract v1. Units are the core's native map units; all positions are feet.
 * Renderer receives data, never a core, clock, dispatch function or RNG.
 *
 * SceneDefinition: { id, width, height, layers:[{id, depth?, asset?, x,y,
 *   width?,height?,anchor?:{x,y},alpha?,selectThrough?:true}], facilities:Facility[] }
 * Facility: { id, label, x,y, entrance?:{x,y}, asset?:string }
 * SceneSnapshot: { version:1, source, epoch, tick, timeMs, paused, rate,
 *   actors:ActorView[], facilities:Facility[], events:SceneEvent[] }
 * ActorView: { id, x,y, face, depth, asset, frame, anchor:{x,y},
 *   body:{x,y,w,h}, action:{id,phase,progress,elapsedTicks?,travelled}, load, speed, label }
 * SceneEvent: { id, tick, actorId?, kind, data }. IDs survive frame batching.
 * SceneCommand: { actorId, action }. Host translates to the core's public command.
 * Snapshots contain only confirmed positions; v1 deliberately has no interpolation.
 */
export const SCENE_VERSION = 1;
export function assertSnapshot(s) {
  if (s.version !== SCENE_VERSION || !Number.isFinite(s.tick) || !Number.isFinite(s.timeMs)) throw new TypeError('Invalid scene time/version');
  if (!(s.rate > 0) || typeof s.paused !== 'boolean') throw new TypeError('Invalid scene playback');
  const ids = new Set();
  for (const a of s.actors) {
    if (typeof a.id !== 'string' || ids.has(a.id)) throw new TypeError('Actor IDs must be stable and unique');
    ids.add(a.id);
    if (![a.x, a.y, a.depth, a.anchor.x, a.anchor.y].every(Number.isFinite)) throw new TypeError(`Invalid foot position/anchor: ${a.id}`);
  }
  return s;
}
export function bodyBox(actor) {
  const scale = actor.scale ?? 1, b = actor.body;
  return { x: actor.x + (actor.face < 0 ? -b.x - b.w : b.x) * scale, y: actor.y + b.y * scale, w: b.w * scale, h: b.h * scale };
}
// Select actors before scenery, even while behind a foreground prop/bridge rail.
export function pickActor(actors, x, y, zoom = 1, minimumPixels = 44) {
  let front = null;
  for (const a of actors) {
    const b = bodyBox(a), px = Math.max(0, (minimumPixels / zoom - b.w) / 2), py = Math.max(0, (minimumPixels / zoom - b.h) / 2);
    if (x >= b.x - px && x <= b.x + b.w + px && y >= b.y - py && y <= b.y + b.h + py && (!front || a.depth >= front.depth)) front = a;
  }
  return front?.id ?? null;
}
