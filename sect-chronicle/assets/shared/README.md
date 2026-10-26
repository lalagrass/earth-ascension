# Minimal local asset pins — #348

The official life card now displays the existing hero `idle-0` atlas frame. This is explicitly labelled an activity-image crop, not a newly approved portrait. The existing #345 portrait API remains the entry point. No #343 classic-character candidate is promoted.

Three **independent snapshots** live in `manifests/{gemini,gpt,grok}-1.0.0.mjs`, each selected by its own `pins/*.mjs`. Every snapshot records a fixed core commit and complete asset metadata. Official `dev` appearance uses the Gemini pin; GPT and Grok keep their own source identities and mapping tables. No branch is written to by this package. The three small metadata copies deliberately avoid one mutable mapping changing every consumer. Asset bytes stay at their already accepted repository paths.

To update an appearance, add a new versioned manifest, keep stable asset IDs, set its precise source/hash/recipe, and change **only the intended consumer's pin import and digest**. Do not edit a released version or add a `latest` alias. `verifyLocal()` rejects an in-place manifest edit or changed asset bytes. Pins clone and recursively freeze their snapshots. This is a checked repository convention, not content-addressed duplicated image storage: an in-place original-image edit will fail old pins' verification and must be published under a new local path. Never silently overwrite an old image while declaring its old digest valid.

```js
import { pin } from './pins/gpt.mjs';
import { resolveAsset, portraitFor } from './resolve.mjs';
const hero = resolveAsset(pin, 'person.hero.sheet'); // local URL, full source, frame recipe
const card = portraitFor(pin, 'gpt', 'leader');      // appearance only; no world writes
```

Run `node sect-chronicle/assets/shared/checks/verify.mjs` from repository root. It checks every pin digest, local bytes, PNG dimensions/alpha channel, atlas frame and foot anchor. Re-running produces the same SHA-256 receipts; it performs no network requests or writes. `checks/assets.test.mjs` additionally checks duplicates, missing entries/files, unknown sources, independent repinning and paired real-world results. `node --test --test-isolation=none sect-chronicle/assets/shared/checks/assets.test.mjs` gives individual test output on this Cloud Node runtime.

Contents are one existing hero atlas, three existing scenery pieces (bamboo, large/small boulder), and a **missing** adopted-girl portrait record. #345 explicitly had no production portraits, and current dev's D35 `cousin` art is documented as a village boy/senior, not proof of an adopted-girl portrait. D53's family identity is preserved: the legacy ID is not used to infer appearance. Unknown girl source/rights remain readable; `cousin`, arbitrary Grok heroes and classic names receive unsupported fallback rather than a borrowed image. No new character, identity rewrite, generated art or raster derivative is added.

Every known entry cites the original accepted D35 commit `ac7148d3a4d9f6b07cf2576b61cb4a2faad8c0df`, exact path, Grok attribution and its usage statement. The prompt record documents owner-account generation for this repository; this package does **not** establish final third-party rights or a repository-wide open-source license. See the full [handoff](../../docs/PUBLIC_ASSETS_HANDOFF.md). Runtime assets remain in their original directory; these review screenshots live only in `evidence/`.
