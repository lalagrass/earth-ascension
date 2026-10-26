import { SCENE_VERSION } from '../contract.mjs';
import { createEventJournal } from '../events.mjs';

/**
 * Boundary for the Gemini family. Only this adapter sees a core and its pure
 * authoritative route projection. The renderer receives detached plain data.
 * getModel supports the official entry's existing reset/load workflow.
 */
export function createGeminiAdapter({ getModel, geometry, appearance, source, facilities = [], stepMs = 1000 / 60 }) {
  const journal = createEventJournal();
  let lastLogIndex = getModel().state.log.length;
  function capture() {
    const log = getModel().state.log;
    for (const record of log.slice(lastLogIndex)) journal.append(record.tick, record.kind, record, record.person);
    lastLogIndex = log.length;
  }
  function observeStep(step = () => getModel().step()) { step(); capture(); }
  function snapshot({ view = getModel().view(), paused = false, rate = 1 } = {}) {
    const model = getModel();
    capture();
    const actors = Object.values(view.people).map((person) => {
      const raw = model.state.people[person.id];
      // bae4341 writes lifePos on the authority path but omits it from personView.
      // Gate the raw fallback on actual autopilot ownership: lifePos is stale once
      // a newer manual command disables autopilot. No source bytes are patched.
      const lifeOwns = !!model.life?.autopilotActive && person.id === 'hero';
      const at = person.scenePosition || (lifeOwns && raw.lifePos ? raw.lifePos : geometry.of(person.id, person));
      const look = appearance(person.id, person, at);
      return {
        id: person.id, x: at.x, y: at.y, face: at.face ?? 1, depth: at.y,
        asset: look.asset ?? person.id, frame: look.frame, anchor: { ...look.anchor }, body: { ...look.body },
        scale: look.scale ?? 1, rotation: look.rotation ?? 0,
        motion: look.motion ? structuredClone(look.motion) : null,
        action: { id: person.job, phase: person.phase?.name || person.mode, progress: person.phase?.k ?? 0, travelled: at.travelled ?? 0 },
        load: ['up', 'pour', 'herbBack', 'herbDeliver', 'woodBack', 'woodDeliver'].includes(person.phase?.name) ? 1 : raw.carrying ? 1 : 0,
        speed: person.tripSpeeds ? { ...person.tripSpeeds } : null,
        label: person.status, positionSource: lifeOwns ? 'core.lifePos' : person.scenePosition ? 'core.scenePosition' : 'core.routeProjection',
      };
    });
    return { version: SCENE_VERSION, source, epoch: journal.epoch, tick: view.tick, timeMs: view.tick * stepMs, paused, rate,
      actors, facilities: structuredClone(facilities), events: journal.take() };
  }
  // UI commands preserve the core's original action IDs and validation/priority.
  function command({ actorId, action }) { const result = getModel().dispatch(action, actorId); capture(); return result; }
  return { snapshot, command, observeStep, reset() { lastLogIndex = getModel().state.log.length; return journal.reset(); } };
}
