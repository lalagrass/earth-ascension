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
| W0-13 | #562 W0-2：世界閒置 5 分鐘自己停 | 新增 `keepAlive`（設定檔，預設 false）；也可用 Convex 環境變數 `WUXIA_KEEP_ALIVE=1` 臨時開，不必改檔。開啟時 `stopInactiveWorlds` 直接略過 | 長時間實跑不用一直開瀏覽器。W0 實測期間改用 `live-run.sh` 每 60 秒 heartbeat（30 分鐘那輪中途仍被停過一次並自動重啟，重播照樣對得上） |

## 待 owner 決定

- **D1 預設雲端模型**：W0 沒有雲端金鑰。建議：先以 `gpt-4o-mini`（OpenAI，$0.15／$0.60 每百萬 token）當預設，W2 之前由 owner 提供金鑰（`npx convex env set OPENAI_API_KEY …`，改 `EMBEDDING_DIMENSION` 為 1536）後重跑 `tools/wuxia/live-run.sh` 補兩個雲端模型的比較。目前程式維持上游預設（Ollama），可隨時切換、可回退。
- **D2 `LLM_DAILY_TOKEN_CAP` 建議值**：依 W0 實測量（見 W0.md）5 人每小時約用 N 萬 token；建議先設 `300000`（約 10 小時開機量），超過改模板句。目前未設定（不設上限）。
