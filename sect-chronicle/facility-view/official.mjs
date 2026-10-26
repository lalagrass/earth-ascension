import { facility, field } from './contract.mjs';
import { HERB, SEATS, FUN, GUARD } from '../experiments/water-carry/demo/routes.mjs';
import { WATER_POINTS } from '../experiments/water-carry/demo/water-layout.mjs';
export const OFFICIAL_BASE = '23b511db75f2fb2862241194a8a999aa357534aa';
const root = `dev:${OFFICIAL_BASE}:sect-chronicle/experiments/water-carry/demo/`;
// Display anchors and standing entrances are intentionally distinct (e.g. rack).
const bindings = {
  vat: { job: 'water', commands: ['work:water', 'fill', 'pourNow'], phases: ['pour'], entry: WATER_POINTS[0], path: 'water-layout.mjs:WATER_POINTS[0]' },
  spring: { job: 'water', commands: ['work:water', 'fill'], phases: ['dip'], entry: WATER_POINTS.at(-1), path: 'water-layout.mjs:WATER_POINTS.at(-1)' },
  rack: { job: 'herb', commands: ['work:herb'], phases: ['herbDeliver'], entry: HERB.points[0], path: 'routes.mjs:HERB.points[0]' },
  herb: { job: 'herb', commands: ['work:herb'], phases: ['herbGather'], entry: HERB.points.at(-1), path: 'routes.mjs:HERB.points.at(-1)' },
  bench: { commands: ['restAfterTrip'], modes: ['seated'], entries: Object.fromEntries(Object.entries(SEATS).filter(([id]) => id !== 'bench').map(([id, s]) => [id, s.points.at(-1)])), path: 'routes.mjs:SEATS.<actor>.points.at(-1)' },
  fence: { commands: ['guard', 'fix', 'fixCancel'], modes: ['guardWait', 'shout', 'fix'], entry: GUARD.points.at(-1), path: 'routes.mjs:GUARD.points.at(-1)' },
  view: { commands: ['recall', 'resume'], modes: ['fun'], actor: 'hero', entry: FUN.hero.points.at(-1), path: 'routes.mjs:FUN.hero.points.at(-1)' },
  yard: { commands: ['recall', 'resume'], modes: ['fun'], actor: 'cousin', entry: FUN.cousin.points.at(-1), path: 'routes.mjs:FUN.cousin.points.at(-1)' },
};
export function createOfficialFacilityAdapter({ getModel, places }) {
  function snapshot(actorId = 'hero') {
    const model = getModel(), v = model.view(), options = model.actions(actorId);
    return Object.entries(bindings).filter(([id]) => places[id]).map(([id, b]) => {
      const pl = places[id], src = `${root}model.mjs:view`, f = (name, value, path, unit = '', availability) => field(name, value, { source: path || src, unit, ...(availability ? { availability } : {}) });
      const unsupported = name => f(name, null, src, '', 'unsupported');
      const store = id === 'vat' ? ['vat', 'vatCapacity', 'inFlight', '擔'] : id === 'rack' ? ['herbs', 'herbCapacity', 'herbInFlight', '份'] : null;
      const users = Object.values(v.people).filter(p => (b.phases?.includes(p.phase?.name) || b.modes?.includes(p.mode)) && (!b.actor || p.id === b.actor) && !(id === 'bench' && p.bed)).map(p => ({ actorId: p.id, phase: p.phase?.name || p.mode, status: p.status, source: `${src}.people.${p.id}` }));
      const entry = b.entries ? b.entries[actorId] : b.entry;
      return facility({ core: 'official', source: `${root}model.mjs`, nativeId: id, label: pl.label,
        point: { anchor: f('anchor', { x: pl.x, y: pl.y }, `${root}app.mjs:places.${id}`, '場景單位'),
          entrance: f('entrance', entry ? { x: entry[0], y: entry[1] } : null, `${root}${b.path}`, '場景單位'),
          hit: { x: pl.x, y: pl.y - pl.ry * .6, rx: pl.rx, ry: pl.ry * 1.6 } },
        stage: unsupported('stage'),
        stock: store ? { amount: f('stock.amount', v[store[0]], `${src}.${store[0]}`, store[3]), capacity: f('stock.capacity', v[store[1]], `${src}.${store[1]}`, store[3]), reserved: f('stock.reserved', v[store[2]], `${src}.${store[2]}`, `在途${store[3]}`) } : null,
        users: f('users', users, `${src}.people:原地工作階段`),
        actorStatus: f('actor.status', { current: v.people[actorId]?.status, reason: v.people[actorId]?.why, next: v.people[actorId]?.next }, `${src}.people.${actorId}.{status,why,next}`),
        activities: options.filter(a => b.commands.includes(a.id) && !a.hidden).map(a => ({ ...a, source: `${root}model.mjs:actions(${actorId}).${a.id}`, reason: f('activity.reason', a.enabled ? a.detail : a.reason, `${root}model.mjs:actions(${actorId}).${a.id}`) })),
        capabilities: { stationCapacity: unsupported('station.capacity'), stationReservations: unsupported('station.reservations'), queue: unsupported('queue'), newConstruction: unsupported('newConstruction') } });
    });
  }
  return { snapshot, command({ actorId, facilityId, action }) {
    const view = snapshot(actorId).find(v => v.id === facilityId);
    const option = view?.activities.find(a => a.id === action);
    if (!option || !option.enabled) return { ok: false, reason: option?.reason.value || '此設施不支援這項指派' };
    // Re-read legal core commands at dispatch time; no UI capacity arithmetic.
    return getModel().dispatch(action, actorId);
  } };
}
