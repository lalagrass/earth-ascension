# 公版來源清單（本地採用）

固定上游：`lalagrass/earth-ascension` 提交 `ef823ac277f48d9426cc3806f74468126a9cf91d`（遠端 dev，2026-10-26 核對），以 `gh api repos/lalagrass/earth-ascension/contents/<path>?ref=<sha>` 讀取。不 merge dev、不在執行時從網路載入。該提交沒有根目錄 LICENSE 檔；這些檔案屬同一 repository 的公版目錄，本地副本保留原路徑、提交與 sha256，作者沿上游。

| 本地檔 | 上游路徑 | 上游 sha256 | 處理 |
| --- | --- | --- | --- |
| `ef823ac/character-card/contract.mjs` | `sect-chronicle/character-card/contract.mjs` | 6a9815cecf4d5d658fe4345fbc72caff64bacf5f0a435554b0768b805c23f36b | 採用；改寫：`AVAILABILITY` 加 `notApplicable` |
| `ef823ac/martial-view/contract.mjs` | `sect-chronicle/martial-view/contract.mjs` | c8b9514424f923f0ffad604eacf9bcc454cb2fc6c95d842d81fe7abe77d915dc | 採用（只加來源註解） |
| `ef823ac/martial-view/render.mjs` | `sect-chronicle/martial-view/render.mjs` | 9fb95d4581c010833ef6604a414dc9cb786aa4cc447437aa30170f82aceb7ce7 | 採用；import 改指本地 `text.mjs` |
| `ef823ac/character-card/text.mjs` | `sect-chronicle/character-card/render.mjs`（部分） | 3c8b7f0103d60acbbaf266564fc2e2e3725437540cbd51e94a4b30375277eeaa | 只摘 `labels`、`escape`、`valueText`；加「不適用」標籤；不帶 portrait 與 DOM 監聽 |
| `ef823ac/facility-view/contract.mjs` | `sect-chronicle/facility-view/contract.mjs` | f0be545ea9fa27cfd0c4e3da218e49d44e63083da64428f155db96d5ec686ba6 | 採用（M27，只加來源註解） |
| `ef823ac/event-view/contract.mjs` | `sect-chronicle/event-view/contract.mjs` | 7aacf57217f7dddfcc870ccc32e92b985c728c363c72bfac33216182526000b2 | 採用（M28，只加來源註解） |
| `ef823ac/event-view/render.mjs` | `sect-chronicle/event-view/render.mjs` | 072fa82212d3c0c60f780077bc7b55e0ebd9cd817f92e76305c0c5d6fef411dc | 採用（M28）；import 改指本地 `text.mjs` |

## 依賴閉包

`martial-view/render.mjs` → `character-card/text.mjs`；`martial-view/contract.mjs` → `character-card/contract.mjs`。`facility-view/contract.mjs` → `character-card/contract.mjs`；`event-view/render.mjs` → `character-card/text.mjs`；`event-view/contract.mjs` → `character-card/contract.mjs`。這些檔案都沒有其他 import，沒有時鐘、RNG、存檔或命令。

## 不採用

- `character-card/gpt.mjs`：import `scene-shared/sources/gpt/...` 舊核心（`GPT_SHA=6cbd3e6`），並公開所有人的五項屬性；本地改由 `src/public-view.mjs` 的 `publicCard` 綁目前核心。
- `character-card/render.mjs` 其餘、`portrait.mjs`、`style.css`：另一套卡片版面與素材解析；本版沿用 M19 面板。素材另見 M29。
- `martial-view/official.mjs`、`motion.mjs`：官方掌法規則與呈現，不是本版規則。
- `facility-view/gpt.mjs`（綁 6cbd3e6 舊核心、把使用者／容量／排隊／命令都標 unsupported）、`render.mjs`（另一套命令按鈕）：本地改由 `src/facility-view.mjs` 綁目前核心。
- `event-view/adapters.mjs`：GPT 轉接綁 6cbd3e6，並用讀到的物件集合比對環形 journal；本地改由 `src/event-feed.mjs` 以原生 `event.N` 序號為游標。
- `scene-shared/`、`assets/shared/` 的執行碼與舊核心快照：本階段不需要。

## 素材（M29，放在 `assets/shared/`）

| 本地檔 | 上游 | 上游 sha256 | 處理 |
| --- | --- | --- | --- |
| `assets/shared/resolve.mjs` | `sect-chronicle/assets/shared/resolve.mjs` | eea9e811dc3c13db0836f5cff3b986857fad702a7a0c29e1416cb3c913bef34f | 採用；改寫：合法本地路徑前綴改為 `assets/shared/`，來源路徑另以 `sect-chronicle/` 驗證 |
| `assets/shared/manifest-gpt-local-1.0.0.mjs` | 由 `sect-chronicle/assets/shared/manifests/gpt-1.0.0.mjs` 派生 | 6e892877931d57e18d770826a80aba1fdc40bd17f1958e1fae59e46f08cbc4ee | 新版本號；`coreCommit` 改為本分支 a1bb5be…；每筆保留上游原路徑（`upstreamPath`）、原提交 ac7148d…、作者、權利、用途、腳錨與 sha256 |
| `assets/shared/pin-gpt-local.mjs` | 仿 `pins/gpt.mjs` | — | 鎖本地 manifest 檔的 sha256 |
| `assets/shared/ef823ac/{hero.png,hero.json,bamboo.png,boulder_l.png,boulder_s.png}` | `sect-chronicle/experiments/water-carry/demo/assets/art184-production/` | 與 manifest 各筆相同 | 位元組原樣複製，不另存裁圖 |

權利照上游記錄：owner-reuse-documented; third-party-rights-unverified。hero 圖集只用 `idle-0` 一格作卡片，不當走路或出招圖集。

## 第二個固定來源：dev 6f959f5（M31–M36）

固定 `lalagrass/earth-ascension` 提交 `6f959f534e9a00994f1cea7c230b4110e60db8c6`，以 `gh api` 按 SHA 讀取。放在 `vendor/public/6f959f5/`，上面 ef823ac 的檔案保留不動（舊介面仍在用）。

| 本地檔 | 上游路徑 | 上游 sha256 | 處理 |
| --- | --- | --- | --- |
| `6f959f5/character-card/contract.mjs` | `sect-chronicle/character-card/contract.mjs` | 61e52cbd433e70a3ccef1391cd9c86f42cae881fae4853a1994e7942d3110d6e | 採用（M32）；改寫：`AVAILABILITY` 加 `notApplicable`；含 `sanitizeProfile` |
| `6f959f5/public-ui/values.mjs` | `sect-chronicle/public-ui/values.mjs` | beefc2246ed938f364d9917d1901471bd236c68c3c002c5f8de4ab76777b79e4 | 採用（M32）；改寫：加「不適用」標籤 |
| `6f959f5/resource-view/contract.mjs` | `sect-chronicle/resource-view/contract.mjs` | b4bf4c760744592b6886e0dec05620b0c32681ec781f00a2e9e020651e15b184 | 採用（M32） |
| `6f959f5/resource-view/render.mjs` | `sect-chronicle/resource-view/render.mjs` | f33e293436aa325f0483a0e255014b2cb65b890280024a197dffd3041e1ffe35 | 採用（M32） |

依賴閉包：`resource-view/render.mjs` → `public-ui/values.mjs`；`resource-view/contract.mjs` → `character-card/contract.mjs`；沒有其他 import。

不採用：`resource-view/gpt.mjs`（import `scene-shared/sources/gpt` 舊核心）；本地 `src/resource-view.mjs` 綁目前核心，並沿它對本核心的說明（`dest:` 不是在途、`availableQty` 不是淨額）。
