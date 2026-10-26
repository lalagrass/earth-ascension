# SCENE-SHARED-01 delivery (#342)

Author: GPT-6.1 Sol / high (`scene342_author`, Cloud). Reviewer: grass, a different non-author agent. Base dev: `9ef497e86a5837539cc8e461855695b0fe468dbd`. Branch: `codex/scene-shared-01`. Claim: [6411135388](https://github.com/lalagrass/earth-ascension/issues/342#issuecomment-6411135388).

Player problem: scene drawing was tied to one app's core fields, route projection and frame comparisons. The official existing entry now consumes detached snapshots through a core-neutral Pixi renderer while preserving the water/herb loop, accepted map and original person card/commands.

## Acceptance and evidence

| Group | Delivered behavior | Evidence |
| --- | --- | --- |
| A | The same `scene-shared/renderer.mjs` consumes real official-dev, fixed Gemini and fixed GPT snapshots. No core references in the renderer; source-specific adapters own read-only projection and public command translation. | `checks/shared.test.mjs`: real source water/herb return and GPT harvest→bag→store round trip; full core state unchanged by render; manifests hash every vendored source file. |
| B | Official entry retains two original workers, long 1700.9-unit water route, true empty/load speeds, original herb phases, foot anchors, foreground rail and tree occlusion, selection and existing card. | Bounded Cloud desktop flow and screenshots, recorded below after execution. |
| C | Pause leaves the full authority state unchanged while camera moves; latest command/stop wins after original delivery. Renderer never extrapolates or computes world time. Every stepped core event is captured before frame batching and consumed once. | Targeted frame-batching/pause/priority test; actual desktop pause/reassign/camera flow. |
| D | Same commands produce exactly identical state and event streams with and without rendering. GPT seeds 11/23/37/53/71 use true core RNG, native routing and invariant checks. | Targeted tests plus normal dev CI; no unrelated full RT/mobile/save matrix. |

## Source distinctions and limits

The official current-dev model is the accepted Gemini-derived **original worker loop**, not the whole fixed fork. The only model addition is a detached `scenePosition` projection through its existing core `sense.placeOf`. It changes no authority state, saved fields, RNG, routes, resource/growth/hit rules, D45 or D53. The fixed Gemini harness runs the real unmodified `bae43412…` core with its original automatic work/rest behavior. The GPT harness runs the real unmodified `6cbd3e6…` world through its native 20 Hz step and `Q=256` positions, with diagnostic art from the 2400×1800 runtime map. Neither source's extra gameplay is imported into the official demo.

**Fixed Gemini experimental life-autopilot limitation:** `model.life.setAutopilot(true); model.step(); model.step()` on a fresh fixed core reproduces `TypeError: Cannot read properties of undefined (reading 'phases')`, through `geoView` → `personAt` → `cleanStep`, because the autopilot has set legacy `motion.job` to `thatch` and `phase` to `goto`. This happens before normal `lifePos` initialization in this repro. The separate `lifePos` write / missing `personView` field / `routes.of` read is a static source observation. It is not reported as a successful autopilot rendering test. The verified original two-worker autonomy is available with that experimental mode off, as in the original fixed core's default. No gameplay repair is concealed in the renderer.

Reproduce that source limitation independently of Pixi:

```sh
node --input-type=module <<'JS'
import {createGeminiCore} from './sect-chronicle/scene-shared/checks/cores.mjs';
const {model}=createGeminiCore(true);
model.life.setAutopilot(true);
model.step(); model.step(); // upstream authority exception
JS
```

## Validation record

Targeted command: `node sect-chronicle/scene-shared/checks/shared.test.mjs` — 7/7 passed, including 5 GPT seeds and exact whole-world parity. `node --test sect-chronicle/test/scene-shared.test.js` includes these tests in the existing Node 22/24 CI. Existing `checks/model.test.mjs` passed after the view-only model addition.

Cloud desktop and CI results are filled here at final handoff. Test resources are temporary; evidence is static. No permanent polling or deployment is part of this package.
