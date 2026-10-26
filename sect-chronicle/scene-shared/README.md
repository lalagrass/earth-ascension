# Shared scene renderer — SCENE-SHARED-01

The official player entry remains `sect-chronicle/index.html` → the existing water-carry demo. It uses the accepted current-dev model, original UI/person card, and this PixiJS 8 renderer. The two fixed-source connections are development evidence, not player alternatives or a rules migration.

## Boundary

`contract.mjs` defines `SceneDefinition`, `SceneSnapshot`, `ActorView`, action phases, facilities, events and commands. Map units stay native to each core. Positions and anchors refer to feet; asset hitboxes are relative to those feet. Actor/facility/layer IDs belong to their source namespace. `bindings.texture(asset, frame)` resolves existing local textures; it has no world access.

The host owns the existing core clock and calls `adapter.observeStep()` for every authoritative step, including every step batched at a higher rate. An adapter captures the core's real event records and sends detached data to `renderer.render(snapshot)`. The renderer owns only Pixi containers, sprite placement, anchors, depth and selection. It receives no core, dispatch function, RNG or elapsed time. No interpolation is used: every displayed foot position has already been confirmed by the core. The original watercolor shimmer/sway now uses snapshot world time, so rate and pause cannot create an independent scene clock.

Commands go through each adapter to its core's existing public command API. Cameras use only map bounds and view state. Actors are picked before scenery, so foreground rails and trees do not swallow a person's click.

| Connection | Position/route authority | Time | Commands | Native map |
| --- | --- | --- | --- | --- |
| Official current dev, Gemini-derived original worker loop | model `scenePosition`, sampled through the model's existing `sense.placeOf` | existing 60 Hz `createClock`/`step` | original `dispatch(action, person)` | existing 1600×1350 watercolor map |
| Fixed Gemini `bae43412…` original worker loop | unmodified model phase and its unmodified pure `routes.of` projection | original 60 Hz model | original `dispatch(action, person)` | same published 1700.9-unit water geometry; original native coordinates |
| Fixed GPT `6cbd3e6…` | actual `world.people[id].x/y`, original route/path/collision | original 20 Hz world, `Q=256` converted only for view | original `command(world, command)` | native 2400×1800 geometry from `src/map.mjs`, including its +800 home offset |

GPT's native map diagnostic art is generated from its real corridors, facility rectangles/doors, stations, obstacles and trees. It does not resize a Gemini background. Existing local human/animal sprites illustrate the adapter; new identities or a complete art library are outside this package.

## Reproduce

From repository root:

```sh
node sect-chronicle/scene-shared/checks/shared.test.mjs
node --test sect-chronicle/test/scene-shared.test.js
python3 -m http.server 8812 --bind 127.0.0.1 --directory sect-chronicle
```

Use the single official `/` entry for the player flow. Development-only true-source evidence uses `/scene-shared/harness/` (fixed Gemini) and `/scene-shared/harness/?core=gpt` (fixed GPT). There are no links to those harnesses in the player UI. The browser check reuses one desktop page and closes its context/browser in `finally`; stop your own temporary server afterward.

Full delivery evidence and limits: [SCENE_SHARED01_DELIVERY](../docs/SCENE_SHARED01_DELIVERY.md). Sources/versions/rights: [SOURCES](SOURCES.md).
