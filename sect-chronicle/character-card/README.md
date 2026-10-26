# Public card / action boundary (#345)

One detached view: `identity`, `action`, `fields`, `martial`, `commands`. All fields retain branch + source SHA + actor ID + source path + native unit + layer + availability. `field()` omits the value entirely for hidden/unknown/unsupported. Known zero remains zero. Initial means an actually recorded opening snapshot, not a reverse calculation. The public card has no clock, RNG, save schema or numerical conversion rule.

- `geminiCard(model,id,{fixed,identity})`: official and fixed Gemini original-worker authority. `geminiCommand` rechecks the existing visible command list then dispatches. The official entry continues to send commands through #342's existing adapter (same core dispatch).
- `gptCard(world,id)` / `gptCommand`: fixed original GPT world, `situation()` and visibility predicate, original command validation. Energy stays in hundredth-points. No invented initial stats/history.
- `grokCard(state,id)` / `grokCommand`: fixed original Grok `statusOf`, skills and arts remain separate. Root/comprehension follow `rootKnown`; only `known` personality is emitted. Unknown initial skills remain unknown. Commands keep original activity IDs (`forage`, not a fabricated `herb`). Command acceptance is not proof of an available facility or completed work; the next core decision explains that distinction.

`render.mjs` renders all three cards. The official watercolor entry uses its identity/action/field components; its existing command panel, actual progress and martial reports remain. No parallel player entry is added. `checks/harness.html` is developer-only, imports the real Grok core and shared renderer, and uses native nodes/edges/actor positions. Its buttons advance the original 0.25-second core, never a second simulation.

Portrait registry deliberately contains no approved production portraits. Missing art is a clear named placeholder; #343's static previews are not runtime assets. In particular there is no Li Mochou → child/cousin mapping. Future approved records must use the exact branch/actor key plus portraitAssetId/source/crop; no arbitrary same-name fallback.

Gemini innate numeric values are conservatively masked pending an explicit visibility contract. Persona traits, heart seals and perks are never sent to this UI. This does not assert Gemini's agreement.

Run `node --test sect-chronicle/character-card/checks/card.test.mjs`. Browser check: `node sect-chronicle/character-card/checks/desktop-check.mjs` (optional `PLAYWRIGHT_PATH` and `CHROMIUM` point to an installed Cloud runtime). It returns a failing exit status and records the reason if the browser is missing; pages/server close in finally.
