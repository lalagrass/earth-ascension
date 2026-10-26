# Fixed source and asset provenance

Actual author of #342: GPT-6.1 Sol / high, independent Cloud `scene342_author`. Base dev: `9ef497e86a5837539cc8e461855695b0fe468dbd`. The source snapshots are test/development inputs, not a merge of either source branch or an adoption of their additional gameplay.

## Gemini

- Repository: `lalagrass/earth-ascension`; branch `plan/sect-life-architecture-redesign`.
- Fixed source: `bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9`, fetched directly in Cloud.
- `sources/gemini/manifest.json`: original repository paths and SHA-256 hashes for the exact 18-file model/routes transitive dependency graph (400,650 bytes). Source file bytes are unchanged. Fork UI, portraits and optional systems outside that graph were not copied.
- Original author attribution remains in source/history; this is the pre-existing Gemini development core. No author identity is inferred from the shared GitHub account.
- Local-source permission: the owner explicitly authorized connecting this repository's fixed committed sources in #342. No repository-wide open-source license was found; these snapshots are not represented as third-party MIT code.
- Static source observation: `model.mjs` writes `hero.lifePos` on the new life-autopilot authority path but `personView()` does not export it, while `routes.of()` tests for it. The adapter has a read-only ownership-gated fallback; stale `lifePos` must never override a newer manual command. The newer experimental autopilot also has a separate authority exception (delivery report). Its original autonomous worker loop is the verified path. No source patch or new life gameplay is hidden in the renderer.

## GPT

- Original source commit: `6cbd3e6fccb8bc376e95e2f406ce6cead2a30fdc`; original author: **Claude Opus 5.5**, per the trusted human source handoff. “GPT” names the existing core/branch, not this package's or that core's actual author.
- Source transport only: `codex/scene342-gpt-source-export`, commit `27be5b11fed8a9c33f2dc7e37c252932ebf709ac`. This branch was fetched and read, never merged.
- Transport archive `source-handoff/scene342-gpt-6cbd3e6.tar.gz` SHA-256: `bc75a8c3812af40cf0ef12be1be195936c2e43ba4e80ecac74f471771e42b0b7`.
- All 39 files from the original `SOURCE_PROVENANCE.json` were verified after extraction in the isolated Cloud source directory. The package retains only the 31-file transitive world/map dependency graph (293,484 bytes), without the original UI/render/audio/save modules. `sources/gpt/manifest.json` retains each used original hash, original author, source commit and transport hash. No source bytes are changed.
- Actual runtime authority is `src/map.mjs`; its imported layout is converted there to native runtime units and home offset. The planning-only layout object alone is not used as runtime truth.
- Owner-authorized committed-source reuse, same repository rights caveat as Gemini. No uncommitted author content was read.

## Renderer, images and notices

- Reuse the existing local PixiJS **8.14.0** vendor module at `experiments/water-carry/demo/vendor/pixi.min.mjs`. Its MIT license and bundled notices remain at `demo/vendor/LICENSE`; no dependency version or root lockfile changes.
- Reuse existing `demo/assets/art184-production/{hero,cousin}.{json,png}`, `template/actions.json`, `demo/assets/home01/manifest.json` and its declared scene03/D35/D37 image references. Foot anchors and resolution use the existing atlas metadata; no background is stretched to represent another core's map.
- GPT harness animals use the existing original D37 `art184-watercolor/{boar_walk,rat_sniff}.png`, at explicit foot anchors and display sizes. All images stay at their original local paths and original source notices.
- Map diagnostic vectors in `harness/gpt-map.mjs` are this package's view of the fixed core's exported map geometry, not third-party copied art.
- No new framework, viewport/PixiUI dependency, GPL/AGPL code, external asset library, downloaded sprite or paid service is introduced. External architecture research was background context only; no external implementation code was copied.
