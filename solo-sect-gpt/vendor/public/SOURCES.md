# 公版來源清單（本地採用）

固定上游：`lalagrass/earth-ascension` 提交 `ef823ac277f48d9426cc3806f74468126a9cf91d`（遠端 dev，2026-10-26 核對），以 `gh api repos/lalagrass/earth-ascension/contents/<path>?ref=<sha>` 讀取。不 merge dev、不在執行時從網路載入。該提交沒有根目錄 LICENSE 檔；這些檔案屬同一 repository 的公版目錄，本地副本保留原路徑、提交與 sha256，作者沿上游。

| 本地檔 | 上游路徑 | 上游 sha256 | 處理 |
| --- | --- | --- | --- |
| `ef823ac/character-card/contract.mjs` | `sect-chronicle/character-card/contract.mjs` | 6a9815cecf4d5d658fe4345fbc72caff64bacf5f0a435554b0768b805c23f36b | 採用；改寫：`AVAILABILITY` 加 `notApplicable` |
| `ef823ac/martial-view/contract.mjs` | `sect-chronicle/martial-view/contract.mjs` | c8b9514424f923f0ffad604eacf9bcc454cb2fc6c95d842d81fe7abe77d915dc | 採用（只加來源註解） |
| `ef823ac/martial-view/render.mjs` | `sect-chronicle/martial-view/render.mjs` | 9fb95d4581c010833ef6604a414dc9cb786aa4cc447437aa30170f82aceb7ce7 | 採用；import 改指本地 `text.mjs` |
| `ef823ac/character-card/text.mjs` | `sect-chronicle/character-card/render.mjs`（部分） | 3c8b7f0103d60acbbaf266564fc2e2e3725437540cbd51e94a4b30375277eeaa | 只摘 `labels`、`escape`、`valueText`；加「不適用」標籤；不帶 portrait 與 DOM 監聽 |

## 依賴閉包

`martial-view/render.mjs` → `character-card/text.mjs`；`martial-view/contract.mjs` → `character-card/contract.mjs`。四個檔案都沒有其他 import，沒有時鐘、RNG、存檔或命令。

## 不採用

- `character-card/gpt.mjs`：import `scene-shared/sources/gpt/...` 舊核心（`GPT_SHA=6cbd3e6`），並公開所有人的五項屬性；本地改由 `src/public-view.mjs` 的 `publicCard` 綁目前核心。
- `character-card/render.mjs` 其餘、`portrait.mjs`、`style.css`：另一套卡片版面與素材解析；本版沿用 M19 面板。素材另見 M29。
- `martial-view/official.mjs`、`motion.mjs`：官方掌法規則與呈現，不是本版規則。
- `scene-shared/`、`assets/shared/` 的執行碼與舊核心快照：本階段不需要。
