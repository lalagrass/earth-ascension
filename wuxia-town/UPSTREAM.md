# UPSTREAM：wuxia-town 的上游來源與修補清單

- 上游：[a16z-infra/ai-town](https://github.com/a16z-infra/ai-town)（MIT，`LICENSE` 原檔保留）
- 固定 commit：`1b2f7d8b824c7bc679017a091d9d45ba3dc3029e`（2026-11-04，PR #312 merge）
- 匯入方式：`git archive 1b2f7d8`，只要檔案，不含上游 git 歷史（W0，#552）
- 武俠小鎮新增的東西只放在 `convex/wuxia/`、`data/wuxia/`、`src/wuxia/`、`tools/wuxia/`、`docs/wuxia/`、`public/wuxia/`（#549 第 1 節）。

## 沒有匯入的上游檔案（授權不明，#548／#549）

清單在 `tools/wuxia/upstream-assets.txt`（48 個檔）。本機要跑原版畫面時執行 `bash tools/wuxia/fetch-upstream-assets.sh`，
檔案會被 `.gitignore` 排除，不可 commit。

- `public/assets/**`（人物 `32x32folk.png`、tileset、spritesheets、`background.mp3`、字型、`tilemap.json`）
- `assets/**`（UI 圖：a16z／Convex 標誌、背景、框線 svg）
- `public/favicon.ico`
- `src/editor/spritesheets/*.png`、`src/editor/tilesets/*.png`（地圖編輯器用的上游 tileset）

## 修補清單

每處修改在原始碼裡都有 `// WUXIA-PATCH(Wn): 理由`（JSON 檔不能寫註解的例外另註明）。

| 步驟 | 檔案 | 修改 | 理由 |
|---|---|---|---|
| W0 | `.gitignore` | 排除上游美術、`tools/wuxia/out/` | 上游美術不進 repo |
| W0 | `convex/aiTown/world.ts` | `serializedWorld` 加 `wuxia: v.optional(v.any())`；`World` 讀寫 `wuxia` | 元素狀態與 rng 跟 step diff 一起存檔（#549 §2、§4） |
| W0 | `convex/aiTown/game.ts` | 建構子初始化 `world.wuxia`；新增 `rng()`、`rngUuid()`、`wuxiaHash()`；`tick` 末尾 `runElements`；`saveStep` 帶 step 紀錄＋hash；`saveWorld` 寫 `wuxiaSteps`（第一筆時存 `wuxiaSnapshots`）；`saveDiff` 的 `ended` 改用 step 時間（原 :270／:288） | 種子亂數、元素掛鉤、step 邊界、重播 |
| W0 | `convex/engine/abstractGame.ts` | `runStep` 的模擬迴圈抽成 `simulateStep()`（邏輯不變），回傳 step 邊界；`saveStep` 多一個參數；新增 `WuxiaStepBoundary` 型別 | 無頭模擬／重播跑同一段程式；記 step 邊界 |
| W0 | `convex/aiTown/agent.ts` | 接受邀請機率（原 :114）改 `game.rng()`；三處訊息 id（原 :174／:195／:222）改 `game.rngUuid()` | 引擎內不得用全域亂數 |
| W0 | `convex/aiTown/player.ts` | 尋路退避（原 :154）、出生位置（原 :193-194）、朝向（原 :211）改 `game.rng()` | 同上 |
| W0 | `convex/schema.ts` | 加入 `wuxiaTables`（`wuxiaSteps`、`wuxiaSnapshots`、`wuxiaLlmUsage`） | 新表 |
| W0 | `convex/util/llm.ts` | `chatCompletion` 多回傳 `usage`；明寫實作回傳型別 | `LLM_DAILY_TOKEN_CAP` 計量 |
| W0 | `convex/agent/conversation.ts` | 三個 `chatCompletion` 改 `budgetedChatCompletion`（模板句後備） | 每日上限、LLM 失敗用模板句 |
| W0 | `convex/agent/memory.ts` | 摘要／重要度／反思改 `budgetedChatCompletion`；`calculateImportance` 多收 `ctx` | 同上 |
| W0 | `convex/tsconfig.json` | `resolveJsonModule: true` | `convex/wuxia/state.ts` 讀 `data/wuxia/world.config.json` |
| W0 | `package.json`（JSON 無法加註解） | `wuxia:headless`、`wuxia:replay`、`wuxia:journal`、`wuxia:hash`、`wuxia:check` 指令；devDependency `tsx` | 工具（#552 範圍 6） |
| W0 | `package-lock.json`（JSON） | 跟著 `tsx` 更新 | 同上 |
| W0 | `convex/util/llm.ts` | `EMBEDDING_DIMENSION` 改讀 `data/wuxia/world.config.json` 的 `embeddingDimension`（預設 1024） | #562 W0-1：原本寫死 1024，換雲端模型要改程式；改了要清表 |
| W0 | `convex/world.ts` | `stopInactiveWorlds` 在 `keepAlive`（設定檔或 `WUXIA_KEEP_ALIVE=1`）開啟時不停世界 | #562 W0-2：沒有瀏覽器時 5 分鐘會自己停；長時間實跑要開 |
| W0 | `convex/_generated/api.d.ts`（產生檔） | `npx convex dev` 重新產生，多了 `wuxia/*` 模組 | Convex 產生檔 |
| W1 | `convex/init.ts` | 建世界時的地圖改用 `serializedMapFor(initWuxiaState(defaultWuxiaConfig).enabled)`（`w01-skin` 開：`data/wuxia/town-map.js`；關：上游 `data/gentle.js`） | #553 換皮；關掉時用回原版地圖 |
| W1 | `package.json`（JSON 無法加註解） | `wuxia:skin-diff`、`wuxia:shot` 指令；devDependency `playwright-core` | #553 驗收工具 |
| W1 | `package-lock.json`（JSON） | 跟著 `playwright-core` 更新 | 同上 |
| W1 | `index.html` | `lang="zh-Hant"`、標題「山腳鎮」、圖示改自製 `public/wuxia/ui/about.svg`；拿掉上游的流量統計 script | #553 介面繁中；上游 favicon 不在 repo |
| W1 | `src/main.tsx` | 載入 `src/wuxia/wuxia.css` | 換皮樣式 |
| W1 | `src/App.tsx` | 拿掉 a16z／Convex 標誌、星星、說明圖示與 `PoweredByConvex`；標題「山腳鎮」與副標；說明改成繁中「關於」頁（註明基於 AI Town，MIT）；`w01-skin` 開時 body 加 `wuxia-skin`、不顯示音樂鈕 | #553 介面繁中、拿掉標誌；上游美術與音樂不在 repo |
| W1 | `src/components/Game.tsx` | 畫面左上角時辰（`ClockBadge`）；換皮時手機版畫面高 290px、Pixi 底色改紙色 | #553 十二時辰＋第幾日 |
| W1 | `src/components/PixiGame.tsx` | 疊上 `SkinLayers`（日夜色調、地點名牌）；傳 `wuxiaMinScale` 讓畫面能縮到看見整張小鎮 | #553 日夜、店名 |
| W1 | `src/components/PixiViewport.tsx` | 新增 `wuxiaMinScale`、`wuxiaFocus` 兩個 prop（不傳給 Viewport）；換皮時第一次置中顯示整張小鎮，截圖頁可指定焦點 | 同上；截圖 |
| W1 | `src/components/Player.tsx` | 人物圖改由 `characterFor()` 決定（換皮開：`public/wuxia/characters/folk.png`；關：上游） | #553 古裝人物；關掉換回原版 |
| W1 | `src/components/PlayerDetails.tsx` | 關閉圖示改自製；顯示「在○○附近」；活動名稱與按鈕文字繁中 | #553 地點表只用在畫面；介面繁中 |
| W1 | `src/components/Messages.tsx` | 「說話中…」 | 介面繁中 |
| W1 | `src/components/FreezeButton.tsx` | 「暫停／繼續」、自製圖示 | 介面繁中；上游圖示不在 repo |
| W1 | `src/components/buttons/InteractButton.tsx` | 「進鎮／離開」、自製圖示 | 同上 |
| W1 | `src/components/buttons/MusicButton.tsx` | 自製圖示、繁中提示 | 同上 |
| W2 | `convex/aiTown/agentInputs.ts` | `createAgent` 的人物改用 `descriptionsFor(w02-folk 是否開)`（開：`data/wuxia/characters.json`；關：上游 `Descriptions`），開關讀 `world.wuxia.enabled` | #554 範圍 1；重播不讀設定檔 |
| W2 | `convex/init.ts` | 建人物的人數改用同一份人物表（開 6 人、關 5 人） | 同上 |
| W2 | `convex/aiTown/player.ts` | `Player.join` 的人物圖檢查也接受古裝人物圖名（`data/wuxia/characters.ts` 的 w1–w8） | 鎮民直接用 W1 的古裝人物圖 |
| W2 | `convex/agent/conversation.ts` | w02-folk 開時 start／continue／leave 改用 `data/wuxia/prompts/*.txt` 組的繁中古風 prompt（人物 voice／taboo、每句 40 字、不知現代事物）、過用詞守門（重抽一次→人物模板句）；三個函式改回傳 `{ text, metadata }`；`queryPromptData` 多回傳 `wuxiaFolk`；`previousMessages` 可指定行格式 | #554 範圍 2、3 |
| W2 | `convex/agent/memory.ts` | w02-folk 開時記憶摘要的 prompt、對話行、`摘要：` 提示與記憶描述改繁中；`loadConversation` 多回傳 `wuxiaFolk` | #554「不做」：記憶摘要的 prompt 也改繁中（邏輯不變） |
| W2 | `convex/aiTown/agentOperations.ts` | `agentGenerateMessage` 把守門 `metadata` 傳給 `agentSendMessage` | 守門結果記在訊息上 |
| W2 | `convex/aiTown/agent.ts` | `agentSendMessage` 多收 `metadata`（選填），寫進 `messages` | 同上 |
| W2 | `convex/schema.ts` | `messages` 表加 `metadata: v.optional(v.any())` | 同上 |
| W2 | `package.json`（JSON 無法加註解） | `wuxia:folk-diff`、`wuxia:gen-prompts`、`wuxia:sample-dialogue` 指令 | #554 驗收工具 |
| W3 | `convex/aiTown/agent.ts` | `Agent.tick`：w03-life 開啟時不發 `agentDoSomething`（不漫遊、不隨機活動、不由 action 找人聊天），改由 `convex/wuxia/w03_life` 在引擎 tick 內選事、預約、走路、計時，並在閒暇地點發起邀請 | #555「決策」：取代 `agentDoSomething` 的漫遊／隨機活動 |
| W3 | `package.json`（JSON 無法加註解） | `wuxia:day-report`、`wuxia:life-diff`、`wuxia:life-report` 指令 | #555 驗收工具 |
| W3 | `src/components/Character.tsx` | 多一個選填 `label`，顯示在頭上 emoji 上方 | #555「畫面」：人物頭上顯示活動 emoji＋標籤 |
| W3 | `src/components/Player.tsx` | w03-life 開啟、活動進行中時，把活動名稱（已是繁中）當 `label` 傳給 `Character` | 同上 |
| W3 | `src/components/PlayerDetails.tsx` | 多收 `historicalTime`；名牌下面加 `src/wuxia/LifePanel`（目前活動、下一件事、4 個需求條、今日做過的事） | #555「畫面」：人物詳情面板 |
| W3 | `src/components/Game.tsx` | 地圖右上角加 `src/wuxia/TownStatus`（鎮況：每個地點現在有誰）；把 `historicalTime` 傳給 `PlayerDetails` | #555「畫面」：鎮況面板 |
| W4 | `src/components/Character.tsx` | 多一個選填 `pose`（spritesheet 的動畫鍵）；有給就用那組動畫並一直播放 | #556「畫面」：打樁時播出拳動作圖 |
| W4 | `src/components/Player.tsx` | w04-dojo 開啟、正在打樁時傳 `pose='punch'`（`src/wuxia/dojo.ts` 的 `poseFor`） | 同上 |
| W4 | `src/components/PixiGame.tsx` | 人物下面疊 `src/wuxia/DojoLayer`（木人樁、石鎖、梅花樁、教頭座、沙包、門口「開館」紅綢），只在 w04-dojo 開啟時畫 | #556「武館重開」 |
| W4 | `src/components/PlayerDetails.tsx` | 名牌下加 `src/wuxia/SkillPanel`（4 個技能 /10 一位小數＋階級名）；把 `enabled` 傳給 `LifePanel`（下一件事依武館日程） | #556「畫面」：角色面板顯示技能與階級 |
| W4 | `package.json`（JSON 無法加註解） | `wuxia:skill-report`、`wuxia:dojo-diff` 指令 | #556 驗收工具 |
| W5 | `convex/agent/conversation.ts` | `queryPromptData` 多回傳 `wuxiaThoughts`（`w05_mind/data.ts` 的 `thoughtsLine`，w05-mind 關閉或沒有心念時 undefined）；三個 `folkSystemPrompt` 呼叫多傳 `thoughts` | #557「跟 LLM 的接法」：prompt 加「你最近的心事：想學武（強度 70）」；心念只影響說什麼，不回寫規則 |
| W5 | `src/components/PixiGame.tsx` | 武館開張的畫面層改看 `dojoOpened`（`openedAt` 有值），不是只看 w04-dojo 開關 | #557：武館改由心念重開，重開前維持破落 |
| W5 | `src/components/PlayerDetails.tsx` | 技能面板下加 `src/wuxia/MindPanel`（心事：心念、強度條、因為…）；`LifePanel` 多傳 `wuxia`（下一件事含心念加的時段） | #557「畫面」 |
| W5 | `package.json`（JSON 無法加註解） | `wuxia:mind-report`、`wuxia:mind-trace`、`wuxia:mind-diff` 指令 | #557 驗收工具 |
| W6 | `convex/aiTown/inputs.ts` | 併入 `convex/wuxia/inputs.ts` 的 `wuxiaSparNarration`（LLM 旁白結果寫回切磋紀錄） | #558「LLM 旁白一句」：LLM 結果照上游慣例以 input 回到引擎，重播時直接餵回 |
| W6 | `convex/aiTown/agent.ts` | `runAgentOperation` 多一個 `wuxiaSparNarrate` → `internal.wuxia.w06_spar.narrate.sparNarrate` | 同上：旁白在 action 裡打 LLM（W2 守門＋30 字），失敗就保留模板句 |
| W6 | `convex/_generated/api.d.ts`（產生檔） | `npx convex dev --once` 重新產生，多了 `wuxia/inputs`、`wuxia/w06_spar/*` | Convex 產生檔 |
| W6 | `src/components/Player.tsx` | 人物座標加上 `src/wuxia/spar.ts` 的 `sparOffset`（攻方前衝半格、守方後退或側身、輸家收勢時退半格；w06-spar 關閉時恆為 0） | #558「畫面」：攻方前衝半格、守方後退 |
| W6 | `src/components/PixiGame.tsx` | 人物上面疊 `src/wuxia/SparLayer`（勢點、擊中白光與「中！」、旁白框），w06-spar 關閉時不畫 | #558「畫面」 |
| W6 | `package.json`（JSON 無法加註解） | `wuxia:spar-sim`、`wuxia:spar-report`、`wuxia:spar-diff` 指令；devDependencies 加 `gifenc`（MIT）、`pngjs`（MIT）、`@types/pngjs`（MIT） | #558 驗收工具；`wuxia:shot --gif` 編 GIF |
| W6 | `package-lock.json`（JSON） | 跟著上面三個 devDependencies 更新 | 同上 |

## 上游刻意保留不改的隨機／時間

- `convex/aiTown/agentOperations.ts`：action（不在 step 內），結果以 input 寫進 inputs 表，重播直接餵回（#549 §4）。
- `convex/engine/abstractGame.ts` 的 `engineInsertInput`（`received: Date.now()`）、`convex/aiTown/agent.ts` 的 `agentSendMessage`（`timestamp: Date.now()`）：都是 mutation 寫 input，不在 step 內；值存在 inputs 表，journal 原樣帶出。
- `convex/aiTown/main.ts` 的 `Date.now()`：決定 step 的 `now`，每個 step 的 `now` 記在 `wuxiaSteps`。
