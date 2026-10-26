import { Q, HZ, FACILITIES } from '../sources/gpt/solo-sect-gpt/src/data.mjs';
import { command, step } from '../sources/gpt/solo-sect-gpt/src/world.mjs';
import { bagWeight } from '../sources/gpt/solo-sect-gpt/src/state.mjs';
import { speed } from '../sources/gpt/solo-sect-gpt/src/navigation.mjs';
import { MAP, rects } from '../sources/gpt/solo-sect-gpt/src/map.mjs';
import { createEventJournal } from '../events.mjs';
import { visibleEntity } from '../sources/gpt/solo-sect-gpt/src/view.mjs';
import { gptJournalVisible } from './gpt-visibility.mjs';
import { SCENE_VERSION } from '../contract.mjs';
export const GPT_SHA = '6cbd3e6fccb8bc376e95e2f406ce6cead2a30fdc';
export const GPT_STEP_MS = 1000 / HZ;
export const gptDefinition = () => ({ id: 'gpt-native', width: MAP.world[0], height: MAP.world[1],
  layers: [{ id: 'native-map', asset: 'gpt-native-map', x: 0, y: 0 }],
  facilities: Object.entries(rects).map(([id, f]) => ({ id, label: FACILITIES[id].name, x: f.rect[0], y: f.rect[1], entrance: f.door ? { x: f.door[0], y: f.door[1] } : null })) });
/** Thin projection over the original 20Hz world. No rules, route or state copies. */
export function createGPTAdapter({ world, appearance }) {
  const journal = createEventJournal();
  let lastEvent = world.journal.at(-1)?.id;
  function capture() {
    const index = world.journal.findIndex((e) => e.id === lastEvent);
    const records = index < 0 ? world.journal : world.journal.slice(index + 1);
    for (const e of records) if (gptJournalVisible(world, e)) journal.append(e.tick, e.type, e, e.actors?.[0]);
    lastEvent = world.journal.at(-1)?.id;
  }
  function snapshot({ paused = false, rate = 1 } = {}) {
    capture();
    const actors = Object.values(world.people).filter((p) => p.residence !== 'departed' && !p.inactive && visibleEntity(world, p)).map((p) => {
      const activity = world.activities[p.activity], load = bagWeight(world, p), phase = p.action?.phase || (p.moving ? 'walking' : activity?.phase || p.pose || 'idle');
      const look = appearance(p, { load, phase, activity });
      return { id: p.id, x: p.x / Q, y: p.y / Q, depth: p.y / Q, face: Math.cos(p.angle * Math.PI / 180) < 0 ? -1 : 1,
        asset: look.asset, frame: look.frame, anchor: { ...look.anchor }, body: { ...look.body }, scale: look.scale ?? 1,
        action: { id: activity?.kind || p.action?.move || 'idle', phase, progress: null, elapsedTicks: activity?.progress ?? 0, travelled: p.distance / Q },
        load, speed: speed(world, p), label: p.name, positionSource: 'core.fixedPointPosition' };
    });
    return { version: SCENE_VERSION, source: `gpt:${GPT_SHA}`, epoch: journal.epoch, tick: world.tick, timeMs: world.tick * GPT_STEP_MS,
      paused, rate, actors, facilities: gptDefinition().facilities, events: journal.take() };
  }
  return { snapshot, observeStep() { step(world); capture(); },
    command({ actorId, action }) { const result = command(world, { ...structuredClone(action), actor: actorId }); capture(); return result; },
    reset() { lastEvent = world.journal.at(-1)?.id; journal.reset(); },
  };
}
