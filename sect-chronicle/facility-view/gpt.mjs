import { facility, field } from './contract.mjs';
import { FACILITIES } from '../scene-shared/sources/gpt/solo-sect-gpt/src/data.mjs';
import { rects } from '../scene-shared/sources/gpt/solo-sect-gpt/src/map.mjs';
import { GPT_SHA } from '../scene-shared/adapters/gpt.mjs';
// Deliberately read-only: no GPT build/bed/queue mechanics are imported into dev.
export function gptFacilities(world) {
  const source = `gpt:${GPT_SHA}:solo-sect-gpt/src/`;
  return Object.entries(world.facilities).map(([id, state]) => {
    const f = (name, value, path, availability) => field(name, value, { source: source + path, ...(availability ? { availability } : {}) });
    const unsupported = name => f(name, null, 'world.mjs', 'unsupported');
    const r = rects[id];
    return facility({ core: 'gpt', source, nativeId: id, label: FACILITIES[id].name,
      point: { anchor: f('anchor', { x: r.rect[0], y: r.rect[1] }, `map.mjs:rects.${id}.rect`), entrance: f('entrance', r.door ? { x: r.door[0], y: r.door[1] } : null, `map.mjs:rects.${id}.door`) },
      stage: f('stage', state.stage, `state.mjs:world.facilities.${id}.stage`), stock: null,
      users: f('users', null, 'world.mjs', 'unsupported'), actorStatus: unsupported('actor.status'), activities: [],
      capabilities: { stationCapacity: unsupported('station.capacity'), stationReservations: unsupported('station.reservations'), queue: unsupported('queue'), newConstruction: unsupported('newConstruction'), commands: unsupported('commands') } });
  });
}
