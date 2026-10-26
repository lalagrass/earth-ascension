// Source: lalagrass/earth-ascension@ef823ac277f48d9426cc3806f74468126a9cf91d sect-chronicle/facility-view/contract.mjs (see ../SOURCES.md); unchanged.
import { field } from '../character-card/contract.mjs';
export { field };
// A facility is a projection, never a reservation owner or a second command engine.
export function facility({ core, source, nativeId, label, point, stage, stock, users, actorStatus, activities, capabilities }) {
  return structuredClone({ version: 1, id: `${core}:facility:${nativeId}`, core, source, nativeId, label,
    interactionPoint: { id: `${core}:point:${nativeId}`, ...point }, stage, stock, users, actorStatus, activities, capabilities });
}
export function pickFacility(views, x, y) {
  return views.find(v => {
    const h = v.interactionPoint.hit;
    return h && ((x - h.x) / h.rx) ** 2 + ((y - h.y) / h.ry) ** 2 <= 1;
  }) || null;
}
