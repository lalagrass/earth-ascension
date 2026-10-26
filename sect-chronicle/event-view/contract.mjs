import { field } from '../character-card/contract.mjs';
export const EVENT_VIEW_VERSION = 1; // Presentation only; never a world/save schema.
export const RECENT_LIMIT = 24, CACHE_LIMIT = 120;
export function eventView({ id, source, stream, tick, unit, kind, sequence, actors = [], facility = null, action = null, category = 'life', result = null, reason = null, visibility = 'known' }) {
  if (!id || !source || !Number.isFinite(tick) || !unit) throw Error('Event provenance required');
  const f = (key, value) => field(key, value, { source: `${source}:${stream}`, availability: visibility === 'known' ? (value == null ? 'unknown' : 'known') : visibility });
  // Mask before retention, filtering, links, tooltip or DOM serialization.
  return { version: EVENT_VIEW_VERSION, id, source, stream, sequence, tick, unit, visibility,
    kind: visibility === 'known' ? kind : null, category: visibility === 'known' ? category : null,
    actors: visibility === 'known' ? [...actors] : [], facility: visibility === 'known' ? facility : null,
    action: visibility === 'known' ? action : null, result: f('event.result', result), reason: f('event.reason', reason) };
}
export function createRecentEvents({ capacity = CACHE_LIMIT } = {}) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) throw Error('Invalid UI cache bound');
  let identity = null, rows = [], ids = new Set(), watermarks = new Map();
  return {
    reset() { identity = null; rows = []; ids.clear(); watermarks.clear(); },
    ingest({ source, epoch, events }) {
      const key = `${source}:${epoch}`;
      if (identity !== key) { identity = key; rows = []; ids.clear(); watermarks.clear(); }
      for (const e of events) {
        if (e.source !== source) throw Error('Mixed event sources');
        if (!Number.isSafeInteger(e.sequence) || e.sequence < 1) throw Error('Event cursor required');
        if (e.sequence <= (watermarks.get(e.stream) || 0)) continue;
        if (!watermarks.has(e.stream) && watermarks.size >= 8) throw Error('Too many UI event streams');
        watermarks.set(e.stream, e.sequence);
        if (ids.has(e.id)) continue;
        rows.push(structuredClone(e)); ids.add(e.id);
        if (rows.length > capacity) ids.delete(rows.shift().id);
      }
    },
    list({ actorId = null, category = 'all', limit = RECENT_LIMIT } = {}) {
      const n = Math.min(RECENT_LIMIT, Math.max(0, Number.isInteger(limit) ? limit : RECENT_LIMIT));
      return structuredClone(rows.filter(e => (!actorId || e.actors.includes(actorId)) && (category === 'all' || e.category === category)).slice(-n || rows.length).reverse()).slice(0,n);
    },
    get size() { return rows.length; }, get dedupSize() { return ids.size; }, get cursorSize() { return watermarks.size; },
  };
}
