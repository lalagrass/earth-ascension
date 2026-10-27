# public-kit@1.0.0 — first package-wide release candidate

This is the first **package** API baseline, proposed in #375. `00f4dbe26be5765a9622957b7c6a636ab5039f96` is the legacy fixed source, **not** a historical 1.0.0 publication. A new reviewed head and, after integration, accepted SHA plus CI receipt in #375 seal the release. The source SHA is external to the content manifest to avoid a self-referential Git hash. No npm/GitHub global release or main publication is performed.

## Take only the files you need

`releases/1.0.0.json` is the reproducible inventory. Every file has bytes and SHA-256; `contentSha256` hashes the JSON payload excluding itself. Keep the repository-relative layout under `sect-chronicle/`; modules resolve relative imports and asset URLs from that layout. Do not flatten the files.

| Group | What to take | What it loads |
|---|---|---|
| DOM/data runtime | `runtime.files` closure of `index.mjs` and `style.css` | Seven existing public components, contracts/renderers, values/style, ViewWriter, asset resolver and pure camera/context helpers. **No core, host, pins or Pixi.** |
| Optional scene | `optionalScene.files` plus its license record | Existing Pixi scene renderer/contract/event cursor and exact local **Pixi 8.14.0** bundle; MIT license. No npm install, remote CDN or whole demo. |
| Your chosen asset pack | One `assetPacks.<id>.files` list | Independent versioned pin, manifest, resolver, selected pack's image/atlas-metadata bytes. Choose explicitly; do not copy all packs by default. Rights remain those of each manifest, not blanket permission for commercial redistribution. |
| Adapter examples | `adapterExamples` references | Source-specific contracts/callback mappings. These import their original core and sometimes host routes/profiles/other pins: **not** a ready-to-install consumer runtime. Replace native imports with your own adapter; no fixed-core dependency is imposed. |
| Development only | `developmentOnly` paths | Existing harness/checks/evidence/fixed-core manifests. Run centrally for proof; never ship raw world/tests/private fixtures as release runtime. |

The generic runtime does not select a portrait automatically. Resolve your own manifest's exact actor/template mapping with `Assets.portraitFor`; sprite/atlas/portrait IDs are not interchangeable identities. The legacy `character-card/portrait.mjs` remains an adapter example that eagerly imports all three mappings; it is intentionally excluded from runtime.

```js
import { Character, renderCard, Assets } from './sect-chronicle/public-kit/index.mjs';
import { pin } from './sect-chronicle/assets/shared/pins/gpt.mjs'; // explicit consumer choice
// publicView is projected by YOUR native adapter; it is not a raw world object.
root.innerHTML = renderCard(publicView);
```

Use `public-kit/scene.mjs` separately only when the consumer uses the accepted Pixi renderer. Host sizing, selection/follow, camera actions and command validation stay with that host. Importing the DOM entry attaches the existing portrait image-load/error fallback listeners when a document exists; it does not start a clock or fetch a core.

## Central v1 semantic responsibilities

Existing v1 call signatures and payload meanings are retained. Namespace exports are thin aliases over the existing functions. `DATA_CONTRACTS` identifies data schemas independently of package SemVer; old records without an explicit version property retain their documented v1 shape. There is no blanket version field rewrite.

| Boundary | Required meaning / owner |
|---|---|
| IDs and observation | Stable native actor/template/semantic IDs, never label matching. Existing source branch/full SHA remains public provenance. Optional `withObservation(record,{branch,sha,writer,mode,tick})` attaches the actual observer/writer/time, never infers them. No persistent history is added. |
| initial/base/effective | `initial` requires a trustworthy recorded starting value for **that actor**; current normal/base and current effective values are separate. Missing historical initial values stay unknown/unsupported; no reverse calculation, sample default, Persona fallback or save migration. Known `0` stays known. |
| availability/disclosure | Native disclosure policy runs **before** public payload creation, including reasons, source strings, tooltips and directly reversible derivatives. `field` masks non-known values but assumes source is already public-safe provenance; redact a private source before calling it. Formula non-use does not establish hidden status. Unknown, hidden and unsupported remain distinct; no missing safety/capacity/control claim is converted into a guarantee. |
| position holder | Worker/Persona handoff is a native responsibility. `positionForOwner` requires explicit `worker.scenePosition`, `persona.lifePos`, or `worker.routeProjection` ownership; if that owner's position is absent it returns null, never borrows another owner. The existing fixed Gemini adapter's narrow autopilot/raw-lifePos guard remains source-specific; new branches must prove manual/reset transitions, not just remove it or change SHA. |
| coordinates | Scene v1 and camera use native units, feet and region-local `[0,width]×[0,height]`. A world/region with a nonzero origin must transform **actors, public facilities and camera together**; `localNavigationInput` does exactly this for navigation, leaving body offsets/normalized anchors/zoom/viewport pixels unchanged. It clears scene art/events because it is a navigation-only projection, not a complete region renderer. Grok HOME requires its real native origin/bounds, not just width/height or a guessed old node extent. Host converts original world ↔ region local; click selection/location never sends move/work/teleport. |
| martial | Definition, learned, proficiency, current execution, native phase/result/hit and visual pose are separate. `motionIntent` consumes existing phase/steps; its `strike` is the accepted 12-tick **visual hold inside native recovery**, not an extra native phase or a hit event. Missing native phase stays unsupported; do not invent timing/damage/energy or double count movement skill as martial force. |
| asset geometry | `recipe.type=atlas-frame`: rect in atlas pixels, frame normalized foot and metadata sockets. `portrait`: image display/crop anchor, **not a collision foot**. Other sprite/prop/image use follows its explicit `anchor.space`/recipe. Scene body/collision boxes remain native core/host data; never derive them from portrait bottoms. Missing asset/mapping/rights stays the existing readable fallback, no arbitrary actor substitution. |
| optional capabilities | Routes, construction, relations and every martial condition need not exist in every core. Actual path absent → unsupported; no line-between-endpoints or UI pathfinder. Shared runtime does not make three different rules/scales equivalent. |

Compatible fixes in this candidate: facility value/source markup now uses the same hidden-tooltip guard as other panels; resource per-field source details redact hidden sources. Existing known values, sources, command results and renderer contracts remain available. No native disclosure rules or formulas were changed.

## Versions and immutable receipts

| Version | Controls |
|---|---|
| `public-kit@1.0.0` | Whole public API/runtime/style release |
| `contract.version` / `DATA_CONTRACTS` | Public data shape/semantics, currently v1; not package SemVer |
| Asset pin / manifest | Independent chosen art mapping, e.g. `gpt-1.0.0`, `gemini-1.1.0`; full core/image provenance is separate |
| Game save schema | Native persistence; **unchanged by this package** |

After first acceptance, never rewrite the accepted version's content. Read old content at its exact source SHA. Patch = compatible bug fix; minor = optional compatible capability; major (or explicit next-major preview) = incompatible API/meaning/visual interaction behavior. State adapter changes, appearance/focus impact and removal timing in changelog; deprecate with replacement plus a stated removal major, not permanent parallel APIs. Unaccepted breaking defaults are deferred and do not block this compatible release. A later release changes package version and adds a new manifest, retaining the old manifest at its pinned source; there are no independent widget version combinations.

A consumer receipt pins package version + **new exact source SHA** + release manifest file hash + selected asset pin path/version/manifest semantic hash + adapter identity/source SHA + native core SHA. Nothing follows `dev`/`latest`, and choosing an asset pack never silently changes adapter/core identity. The manifest file hash and `contentSha256` summary are distinct; the existing asset pin's semantic manifest hash uses `JSON.stringify(manifest)`, as before.

```sh
# Before acceptance, only on the candidate branch after changing actual runtime:
node sect-chronicle/public-kit/tools/release.mjs build --candidate
node sect-chronicle/public-kit/tools/release.mjs verify
# After committing a candidate, or after fetching the accepted SHA:
node sect-chronicle/public-kit/tools/release.mjs receipt FULL_NEW_SOURCE_SHA gpt central.fixed-gpt 6cbd3e6fccb8bc376e95e2f406ce6cead2a30fdc > /tmp/public-kit-consumer.json
```

The receipt command reads each byte via `git show SOURCE_SHA:path`, checks the full runtime/optional scene/asset closures and rejects the legacy baseline. It does not approve/publish a release or mutate source. Post the candidate/acceptance receipt with the actual head/accepted SHA and applicable CI URL in #375/PR; maintainers seal acceptance, not the author. No source SHA is inserted into a file inside the same commit.

## Changelog — 1.0.0 candidate (#375)

- First package-wide entry, explicit runtime/optional-Pixi/selected-assets closure and hashes; legacy deep imports remain usable at their pinned SHA.
- Added optional observation, explicit position-owner and nonzero-region navigation helpers; no mandatory metadata/new major. Kept data contract v1 and save schemas.
- Compatible hidden-source tooltip/details guard for facility/resource renderers; no known source loss.
- Central existing fixed-GPT harness uses thin entries, displays a caller receipt and reads true public cards. This is an isolated migration pilot, not adoption by the latest original GPT/Gemini/Grok branches.
- Breaking proposal: none in this release. Universal movement/coordinate ownership, normalized battle scales or mandatory metadata would be a separately accepted next major; deferred.
- Acceptance/source SHA/CI: authoritative new #375 and PR receipts, not the legacy base. Rights and source-specific route gaps remain.

## Release checklist

1. Confirm one valid author/claim, scope, API/visual compatibility and independent three-branch pins. Keep #372–#374 on legacy `00f4dbe…`.
2. Change only needed runtime/adapter code; explain any breaking proposal separately. Update this changelog/migration notes and package version for later releases.
3. Build candidate manifest; verify closure/missing/hash counterexamples, public-payload semantics and one true central harness. Preserve unmodified core/asset sources and reuse unaffected evidence.
4. Commit candidate. Generate receipt at that full SHA; run one bounded Cloud browser flow with that caller pin. Close owned page/context/browser/server and restore viewport.
5. Commit evidence/docs; prove runtime/manifest hashes unchanged. Generate the final PR-head receipt, and obtain current necessary CI. Grass reviews that head; author does not approve/merge.
6. Queue owner locks expected head, squash merges normally and checks accepted SHA/postCI. Generate a receipt **at accepted SHA**, post source/digest/CI; acceptance does not require rewriting version content or a follow-up documentation gate. Then stop.
7. Each consumer schedules its own small upgrade. Do not replace a global pin, edit old manifests in place, or enter another author's branch/box.

References read: [SemVer](https://semver.org/lang/zh-TW/) for public API and immutable versions, [Pixi v8 migration](https://pixijs.com/8.x/guides/migrations/v8) for explicit old→new changes, [Changesets workflow](https://changesets.dev/guide/versioning-and-publishing) for grouped version/changelog steps. Concepts only; no CLI/npm publishing dependency is installed.
