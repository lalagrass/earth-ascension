# 武俠小鎮：與規格不同之處（DEVIATIONS）

依 owner 2026-11-12 指示：規格錯、做不到或矛盾時，選最接近原意、可回退的做法繼續，記在這裡並在該 W issue 留言。
需要 owner 決定的事項先做建議選項，列在最後「待 owner 決定」。

## W0（#552）

| # | 原規格 | 實際做法 | 理由／回退方式 |
|---|---|---|---|
| W0-1 | 移除 `public/assets/` 下的上游美術與音樂 | 另外也移除 `assets/`（UI 圖、a16z／Convex 標誌）、`public/favicon.ico`、`src/editor/` 的 png，共 48 檔；全部改由 `tools/wuxia/fetch-upstream-assets.sh` 本機下載 | #549 寫「上游美術不進 repo」；這些檔同樣來自上游且授權未寫明。回退：從清單挑檔 commit 即可 |
| W0-2 | `wuxiaSteps` 每筆 `{generation, startTs, endTs, now}` | 多記 `prevTime`、`numTicks`、`inputsThrough`、`processedInputNumber`、`hash`；另加 `wuxiaSnapshots` 表存第一個 step 之前的完整狀態 | 只有四欄無法精確重播：live 的 `loadInputs` 只讀到 step 當下已寫入的 input、`startEngine` 會強制前跳時間；每步 hash 讓重播能指出第一個不符的 step。快照是 journal 的起點 |
| W0-3 | `--minutes 30` | 解讀為引擎時間 30 分鐘（1 step＝1 秒，共 1800 step），不是遊戲時辰 | W0 不改玩法、尚未使用遊戲時鐘；與 live 實測「30 分鐘」同一尺度 |
| W0-4 | 用 Docker 自架 Convex | box 沒有 Docker；改用 Convex CLI 的本機後端（`CONVEX_AGENT_MODE=anonymous npx convex dev`，同一個開源 convex-backend 執行檔，不需帳號） | 行為等同自架；Docker 路徑仍是上游原有的 `docker-compose.yml`，沒有改 |
| W0-5 | 雲端模型實測、至少比較兩個模型 | 沒有雲端 API 金鑰（只有使用者能提供），先用本機 Ollama 跑兩個開源模型（Qwen2.5 1.5B／0.5B Instruct，CPU）各 30 分鐘，量 token、延遲、中文樣本；雲端花費用量測的 token 數 × 官方公開價目推估 | 見「待 owner 決定」D1。`w0-live.jsonl` 來自真的 Convex＋真的 LLM（本機模型），重播不需要 LLM，驗收意義相同 |
| W0-6 | `LLM_DAILY_TOKEN_CAP` | 未設定或 ≤0 視為不設上限（跟上游一致）；只計對話與記憶的 chat 呼叫，embedding 不計；「今天」以 UTC 日期計 | 規格沒給預設值與範圍。建議值見 D2 |
| W0-7 | 超過上限時畫面角落顯示「說書人歇息中」（#549 §6） | W0 只提供 `wuxia/llmBudget:status` 查詢（含 `resting`），畫面留到之後接 UI 的步驟 | #552 範圍 7 只要求模板句；W0 不改畫面 |
| W0-8 | 元素開關讀 `data/wuxia/world.config.json` | 世界建立時把開關與 seed 凍結進 `world.wuxia.enabled`；之後改設定檔只影響新世界 | 重播不能依賴設定檔目前的內容。回退：改成每 tick 讀設定檔 |
| W0-9 | `Date.now()` 只修 `game.ts:270/:288` | 照修（改用 step 的引擎時間）；`engineInsertInput` 與 `agentSendMessage` 的 `Date.now()` 保留 | 那兩處是寫 input 的 mutation，不在 step 內，值已存在 inputs 表、journal 原樣帶出 |
| W0-10 | 規格未提 | 對話 prompt 的「用繁體中文回答」用環境變數 `WUXIA_REPLY_IN_ZH_TW=1` 開啟，預設關 | 規格說實測時加一句即可；預設不改上游 prompt |
| W0-11 | 規格未提 | `.github/workflows/wuxia-town.yml` 經 GitHub 連接器（REST contents API）提交，其餘 commit 用 git push | 本機 git 憑證缺 `workflow` 權限，無法 push workflow 檔；內容相同 |
| W0-12 | #562 W0-1：embedding 維度寫死在 `convex/util/llm.ts:7` | 改成 `data/wuxia/world.config.json` 的 `embeddingDimension`（預設 1024＝Ollama `mxbai-embed-large`）；換供應商時一起改（OpenAI 1536、Together 768），並清 `memoryEmbeddings`／`memories`／`embeddingsCache`（`testing:wipeAllTables` 不清 `embeddingsCache`，要另外清） | 向量索引維度在 schema 部署時固定，只能用打包時就確定的設定檔，不能用執行期環境變數。回退：把常數改回寫死 |
| W0-13 | #562 W0-2：世界閒置 5 分鐘自己停 | 新增 `keepAlive`（設定檔，預設 false）；也可用 Convex 環境變數 `WUXIA_KEEP_ALIVE=1` 臨時開，不必改檔。開啟時 `stopInactiveWorlds` 直接略過 | 長時間實跑不用一直開瀏覽器。W0 實測期間改用 `live-run.sh` 每 60 秒 heartbeat（qwen2.5:1.5b 30 分鐘那輪中途仍被停過一次並自動重啟，重播照樣對得上）；qwen2.5:0.5b 那輪改設 `WUXIA_KEEP_ALIVE=1` 實測 keepAlive |

## W1（#553）

| # | 原規格 | 實際做法 | 理由／回退方式 |
|---|---|---|---|
| W1-1 | 用 Tiled 手畫 48×36 地圖 | 地圖由 `tools/wuxia/bake-tiles.py` 依 `data/wuxia/places.json` 程式烘焙，直接寫出 Tiled 格式的原檔（`data/wuxia/tiled/town.tmj`＋`town-tiles.tsj`，可用 Tiled 開啟、編輯），再用上游 `data/convertMap.js` 轉成 `data/wuxia/town-map.js`（`tools/wuxia/build-map.sh` 一鍵重產） | box 上沒有 Tiled 的圖形介面；程式烘焙可重現、可改。回退：在 Tiled 開 `town.tmj` 手改後重跑 `convertMap.js` 即可 |
| W1-2 | tileset 由小塊 tile 拼成 | tileset 是整張水彩底圖切成 32px 的 1728 格（每格只用一次），`objmap` 層標出 675 格不可走 | 依 #562 W1 要跟既有的水彩美術一致、不要通用像素 RPG 風；手繪感的底圖沒法用重複小 tile 拼。地圖格式、尋路、convertMap 都不變。回退：改成小 tile 拼圖只需換 tileset 與 bgtiles |
| W1-3 | `--at 0,600,1200` 對應卯、午、戌 | 遊戲分鐘 0＝第 1 日卯正（06:00），0／600／1200 實際是卯正、申正、第 2 日丑正。照原指令截了一組，另外加跑 `--at 0,360,840`（卯正、午正、戌正）一組 | 不管把遊戲分鐘 0 設在哪個時刻，相隔 600 分鐘（10 小時）的三點都不可能剛好是卯（5–7 時）、午（11–13 時）、戌（19–21 時）。兩組都留著，三張日夜色調都明顯不同。見「待 owner 決定」D3 |
| W1-4 | 規格未提 | W0 的 live fixture 快照沒有 `wuxia` 欄位；重播時改用 W0 錄製時的設定（不開任何元素、seed 7、timeScale 60），而不是讀現在的設定檔。另外 `steps.ts` 讓之後的新快照一定帶 `wuxia` | W1 把 `w01-skin` 預設打開後，舊快照若照現行設定重建會多出時鐘、與錄製時不同，第 0 步就對不上。這是讓 W0 回歸照舊通過的修正，沒有改 W0 的 hash 或放寬比對 |
| W1-5 | 開與關的 hash「只差在地圖相關欄位」 | `tools/wuxia/skin-diff.ts`（也在 `wuxia:check` 第 7 項）分三段證明：A 關＝W0 原值；B 同一張地圖開／關只差 `wuxia.enabled.w01-skin`、`wuxia.clockEpoch`；C 各用各的地圖時的差異欄位全部列出（位置、路徑、相遇與對話、rng 消耗都是地圖不同的連鎖結果） | 換地圖後人物出生點與路徑不同，會連帶改變誰遇到誰；只看最終 hash 無法分出「地圖造成」與「規則改了」，所以多做 B（同地圖）來隔離規則 |
| W1-6 | 遊戲時鐘 epoch（#549 §3） | 第一個 tick 才把 `world.wuxia.clockEpoch` 設成當時引擎時間，而且只在有元素開啟時才設 | 不開元素時世界狀態跟 W0 完全相同（A 段的 hash 與 W0 一致）。回退：改在建世界時設定 |
| W1-7 | 主要 UI 改繁中 | 按鈕、人物詳情、說話中等文字不論換皮開關都是繁中；關掉換皮時才顯示音樂鈕（上游背景音樂不在 repo，要本機下載） | 介面文字不是美術；開關只負責地圖與人物圖（#553 範圍 6） |
| W1-8 | 武館（W4 才啟用） | 畫成破舊、門口貼封條、圍牆西側塌一角；門口那格可走（`entry` 可達），裡面暫時沒有規則 | 讓 W4 直接沿用，不必改地圖 |
| W1-9 | tileset 優先程式產生，不夠用 Kenney 等 CC0 | 程式畫地面、河、街、城門、石橋、井、招牌、燈籠、封條；房舍、樹、竹、石、牆面材質取自本專案自製水彩分支（`codex/art184-watercolor-grok` @ `16e2892c`、`codex/art184-production-grok` @ `032f09a9`）的縮小副本，沒有用任何第三方素材 | #562 W1 指定沿用這些自製水彩；來源逐檔記在 `public/wuxia/CREDITS.md` 與 `tools/wuxia/art-src/SOURCES.json` |
| W1-10 | 規格未提 | 截圖頁放在 `src/wuxia/shot/index.html`（只給 Vite dev server 用，不進正式 build） | 新東西只放 `src/wuxia/` 等目錄（#549 §1） |
| W1-11 | 開關關掉要能用回原版 | 有做也驗過（本機下載上游素材後截圖，畫面就是原版地圖與人物），但這張截圖**沒有 commit** | 截圖裡就是上游美術，不能放進 repo。無頭狀態的對照放在 W1.md（A 段 hash 與 W0 相同） |

## 待 owner 決定

- **D1 預設雲端模型**：W0 沒有雲端金鑰。建議：先以 `gpt-4o-mini`（OpenAI，$0.15／$0.60 每百萬 token）當預設，W2 之前由 owner 提供金鑰（`npx convex env set OPENAI_API_KEY …`，把 `data/wuxia/world.config.json` 的 `embeddingDimension` 改為 1536）後重跑 `tools/wuxia/live-run.sh` 補兩個雲端模型的比較。目前程式維持上游預設（Ollama），可隨時切換、可回退。
- **D2 `LLM_DAILY_TOKEN_CAP` 建議值**：依 W0 實測量（見 W0.md）5 人每小時約用 25 萬 token（qwen2.5:1.5b 30 分鐘實測 129402 token → 每小時 247396；雲端模型回覆較長，可能更多）；建議先設 `2500000`（約 10 小時開機量，以 gpt-4o-mini 價目約 US$0.45／天），超過改模板句。目前未設定（不設上限）。
- **D3 `wuxia:shot --at` 的時刻**（W1-3）：0／600／1200 遊戲分鐘不可能剛好對到卯、午、戌。建議：把 #553 驗收改成 `--at 0,360,840`（遊戲分鐘 0＝卯正 06:00）。目前兩組截圖都在 `docs/wuxia/w01/`，改不改都不影響程式。
