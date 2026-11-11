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

## W2（#554）

| # | 原規格 | 實際做法 | 理由／回退方式 |
|---|---|---|---|
| W2-1 | 守門程式放 `convex/wuxia/w02-folk/guard.ts`；#549 §1 元素子資料夾寫成 `w03-life/`、`w04-dojo/` | 目錄改成 `convex/wuxia/w02_folk/`；W1 的 `convex/wuxia/w01-skin/` 一併改成 `w01_skin/`。元素 id（`w01-skin`、`w02-folk`，設定檔與 `world.wuxia.enabled` 裡的字串）不變。`wuxia:check` 第 10 項檢查 `convex/` 底下的路徑 | Convex 部署時模組路徑只接受英數、底線、句點，`w02-folk` 會被拒（`InvalidConfig: Path component w02-folk can only contain alphanumeric characters, underscores, or periods`）。W1 的 `w01-skin` 也有同樣問題，只是 W1 沒有部署到 Convex 實跑，所以沒被發現。之後的 W3–W9 也用底線（`w03_life/`…）。回退：無（帶連字號就無法部署） |
| W2-2 | 用雲端 LLM 實跑 20 分鐘 | 用本機 Convex 後端＋Ollama `qwen2.5:3b`（CPU）實跑 20 分鐘，匯出 `fixtures/w02-live.jsonl` | 仍沒有雲端金鑰（D1）。journal、重播、抽樣、守門比例的做法跟雲端完全相同；換成雲端只要設金鑰重跑 `tools/wuxia/live-run.sh`。中文品質雲端模型通常更好，守門比例應該只會更低 |
| W2-3 | prompt 模板放 `data/wuxia/prompts/*.txt` | 照放；另由 `npm run wuxia:gen-prompts` 把 txt 與 `anachronisms.txt` 轉成 `convex/wuxia/w02_folk/prompts.gen.ts` 給程式 import。`wuxia:check` 第 8 項與 jest 檢查兩邊同步 | Convex 打包與 jest 都不能直接 import `.txt`。改 prompt 時只改 txt，跑一次 gen-prompts 即可。回退：改回寫死在程式裡 |
| W2-4 | 守門條件：禁用詞或英文字母 | 另外加了 4 條（都是更嚴，沒有放寬）：每句（以。！？；…或換行分句，不算標點空白）超過 40 字、整則超過 120 字、空回覆、跟自己在同一段對話裡說過的話一字不差 | 「每句 40 字以內」是 #554 範圍 2 的 prompt 要求，驗收也寫了「長度」的單元測試，所以由守門檢查。重複：實測 qwen2.5:3b 很常原句重複（20 分鐘 216 則訊息的生成過程中，共有 69 次嘗試因原句重複被擋），不擋會讓對話讀起來像卡住。回退：`checkReply` 拿掉對應判斷 |
| W2-5 | 規格未提 | 守門前先清理：去掉模型自己加的「某某對某某說：」「某某：」前綴、包住整句的引號、以及替對方接下去的第二段 | 只是格式清理，清理後照樣檢查禁用詞與英文（有單元測試）。回退：`normalizeReply` 改成只 trim |
| W2-6 | LLM 失敗或超過預算用模板句；重抽一次 | LLM 失敗／超過 `LLM_DAILY_TOKEN_CAP` 時不重抽直接用模板句；第一次生成已超過 30 秒（`WUXIA_GUARD_RETRY_MS` 可調）也不重抽 | 「規則永遠不等 LLM」：慢的模型重抽會讓整段對話再卡一輪。metadata 的 `cause` 分 `llm-fallback`／`rejected`／`no-retry`，看得出原因 |
| W2-7 | 守門結果記在訊息的 metadata（`guard: pass\|retry\|template`） | `messages.metadata = { guard, reasons, attempts, cause }` | 多記每次沒過的理由，方便調 prompt 與禁用詞 |
| W2-8 | 「開關關閉時用回上游」 | `w02-folk` 宣告 `requires: ['w01-skin']`；建世界時只把「真的會生效」的元素寫進 `world.wuxia.enabled`（`pruneUnmetRequires`），所以 `--off w01-skin` 的世界仍跟 W0 逐位元組相同 | 鎮民用的是 W1 的古裝人物圖與山腳鎮地圖，沒有換皮時用不了。W1 的 skin-diff 固定關掉 `w02-folk`（它是 W1 自己的隔離測試），W2 的開關對照在 `folk-diff` |
| W2-9 | 規格未提 | 6 人的 `home`／`workplace`：林嫂 茶館／茶館、石虎 鐵匠鋪／鐵匠鋪、何郎中 藥鋪／藥鋪、老韓 西邊民居 1／茶館、阿青 西邊民居 2／小廣場、周教頭 武館／茶館（白天在茶館喝悶酒） | 規格只給身分描述。W2 只是資料，W3 起才用到；W3 可以改 |
| W2-10 | 禁用詞含「簡體字常見詞」 | 簡體部分列的是 50 個只在簡體出現的常用單字（这、们、说、么、没、时…），子字串比對，等於擋下所有含這些字的詞 | 列單字比列詞涵蓋更廣；這些字在繁體裡都不會出現，不會誤擋。繁體同義句有單元測試確認會過 |
| W2-11 | 「記憶摘要的 prompt 也改成繁中」 | 只改摘要（prompt、對話行、`摘要：`、存起來的記憶描述）；重要度評分與反思的 prompt 照上游英文 | 規格只點名摘要。反思寫出的記憶如果是英文，之後被帶進對話 prompt，產生的英文回覆會被守門擋下。若要一起改，W5（心念）時處理 |
| W2-12 | 規格未提 | 無頭模擬的人數預設改成人物表的人數（開 6 人、關 5 人）；`seed 7`／`seed 8` 的預設 hash 因此改變（見 W2.md「hash 變化」） | 規格要「起始 6 人」。`--off w02-folk` 仍重現 W1 的 hash |
| W2-13 | 規格未提 | `wuxia:shot` 判斷「有沒有遊戲時鐘」改成看實際生效的元素（原本看命令列有沒有開任何元素） | W1 的寫法在 `--off w02-folk` 時誤判成沒有時鐘，截圖時刻差 1 分鐘。修正後 `--off w02-folk` 的 W1 截圖 hash 跟 W1.md 完全一樣 |
| W2-14 | 規格未提 | `registry.test.ts` 的「預設設定只開 w01-skin」改成「W1 的設定只開 w01-skin」，另加「W2 預設開 w01-skin、w02-folk」與「關換皮時 w02-folk 不生效」 | 預設值是 W2 刻意改的；W1 那條的檢查內容沒變，只是改用明寫的 W1 設定 |
| W2-15 | 規格未提 | 無頭模擬的模板句：同一段對話裡抽到跟自己上一句一樣時換下一句（不多耗亂數）；live 的模板句也一樣避開上一句 | 讓無頭跑出來的中文對話好讀一點；開／關的 rng 消耗相同（folk-diff B 證明） |

## 待 owner 決定

- **D1 預設雲端模型**：W0 沒有雲端金鑰（W2 的 20 分鐘實跑也因此改用本機 `qwen2.5:3b`，見 W2-2；有金鑰後兩份實跑都要用雲端模型重錄）。建議：先以 `gpt-4o-mini`（OpenAI，$0.15／$0.60 每百萬 token）當預設，W2 之前由 owner 提供金鑰（`npx convex env set OPENAI_API_KEY …`，把 `data/wuxia/world.config.json` 的 `embeddingDimension` 改為 1536）後重跑 `tools/wuxia/live-run.sh` 補兩個雲端模型的比較。目前程式維持上游預設（Ollama），可隨時切換、可回退。
- **D2 `LLM_DAILY_TOKEN_CAP` 建議值**：依 W0 實測量（見 W0.md）5 人每小時約用 25 萬 token（qwen2.5:1.5b 30 分鐘實測 129402 token → 每小時 247396；雲端模型回覆較長，可能更多）；建議先設 `2500000`（約 10 小時開機量，以 gpt-4o-mini 價目約 US$0.45／天），超過改模板句。目前未設定（不設上限）。
- **D3 `wuxia:shot --at` 的時刻**（W1-3）：0／600／1200 遊戲分鐘不可能剛好對到卯、午、戌。建議：把 #553 驗收改成 `--at 0,360,840`（遊戲分鐘 0＝卯正 06:00）。目前兩組截圖都在 `docs/wuxia/w01/`，改不改都不影響程式。
