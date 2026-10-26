// The host observes every authoritative step, even if several steps share a frame.
// No event is inferred by comparing two rendered frames.
export function createEventJournal() {
  let sequence = 0, pending = [], epoch = 0;
  return {
    reset() { epoch++; sequence = 0; pending = []; return epoch; },
    get epoch() { return epoch; },
    append(tick, kind, data, actorId) {
      const event = { id: `${epoch}:${++sequence}`, tick, kind, actorId, data: structuredClone(data) };
      pending.push(event); return event;
    },
    take() { const out = pending; pending = []; return out; },
  };
}
export function createEventCursor() {
  let epoch = null, last = 0;
  return {
    consume(snapshot) {
      const identity = `${snapshot.source}:${snapshot.epoch}`;
      if (identity !== epoch) { epoch = identity; last = 0; }
      const out = [];
      for (const event of snapshot.events) {
        const n = Number(event.id.split(':').at(-1));
        if (n > last) { out.push(event); last = n; }
      }
      return out;
    },
  };
}
