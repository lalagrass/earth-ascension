# 開發說明（SG-01／SG-02／SG-02A／SG-03）

本文件隨程式更新；只記錄已存在且已驗證的事。尚未實作的模組見 [TECHNICAL_DESIGN](TECHNICAL_DESIGN.md)。

## 執行測試

```sh
node --test sect-chronicle/test/*.test.js     # Node 24 不要用目錄參數
node sect-chronicle/tools/update-fixtures.js  # 僅在有意改版本時重產 fixture，並在 PR 說明差異
```

根目錄檢查（CONTRIBUTING／AGENTS 指定）：`python3 -m unittest discover -s tests -v`、`node --check earth_ascension/static/m2.js`、`git diff --check`。

## 模組載入策略

`js/rng.js`、`js/rules.js`、`js/state.js`、`js/story-data.js`、`js/commands.js`、`js/engine.js` 是無框架的 UMD 風格腳本：

- Node：`require('./js/state.js')`（state 會自行 require rng 與 rules；`rules.js` 是葉節點，不 require 任何模組，因此沒有 state↔rules 循環）。
- 瀏覽器：依序以一般 `<script>` 載入 `js/rng.js` → `js/rules.js` → `js/state.js` → `js/story-data.js` → `js/commands.js` → `js/engine.js`；API 掛在 `globalThis.SectChronicle.Rng`／`.Rules`／`.State`／`.StoryData`／`.Commands`／`.Engine`。漏載任何前置檔時，後面的檔案會丟出指名該檔的錯誤。Node 只需 `require('./js/engine.js')`（逐層 require 前置檔，沒有循環：rules←state←story-data←commands←engine）。不需建置、不使用 ES module，`file://` 也能載入（儲存相容性另計，見技術設計）。

## 版本

| 項目 | 值 | 說明 |
|---|---|---|
| schemaVersion | 2 | 世界狀態欄位與驗證規則；SG-03 由 1 升為 2（新增 `schedule`，並定義 `commandLog`／`eventLog`／`pendingEvents` 項目格式）。schemaVersion 1 存檔回傳 `unknown_schema_version`，原資料不變，不遷移 |
| ruleVersion | 2 | SG-01 暫定值 1 → **SG-02 凍結的候選規則基線 2**（唯一來源是 `js/rules.js`）；數值表見 [RULES.md](RULES.md) |
| rngVersion | 1 | cyrb128 播種＋sfc32，丟棄前 15 筆；`nextInt` 為拒絕抽樣 |

## SG-02 新增的契約

- `js/rules.js`：規則表與純計算（五行／地圖／設施、靈氣階段、修行、採集、煉丹、休養、突破、援村〔占一人一格〕、休養穩態比率估算）。全部純函式、不消耗 RNG；細節與數值見 [RULES.md](RULES.md)。
- `CHARACTER_OPTION_LIMITS`、師父屬性、起始數值、`RULE_VERSION`、`BASIS_POINTS`／`mulBp` 的權威定義移到 `rules.js`；`state.js` 只持有同一物件／函式的引用，沒有第二份定義。
- `state.js` 只接受 ruleVersion 2；ruleVersion 1 存檔回傳 `unknown_rule_version`，原資料不變，不提供遷移。
- 新局 `tiles` 仍為空陣列；`rules.initialTiles()` 提供固定版型，等 SG-04 建局時採用（本包不改 schema）。

## SG-01 提供的契約

- `newWorld(seed, scenarioId?, characterOptions?)` → `{ok:true,state}` 或 `{ok:false,code,reason}`；失敗不建立部分世界。`scenarioId` 預設 `slice-14`（42 格）。建局不消耗 RNG。
- `characterOptions` 為 `{templateId, allocation:{rootBone,comprehension,craft}, personality:{risk,bond}}`。`state.js` 驗證結構與型別（欄位齊全、整數、不為負、總和等於預算、單項在上下限內、枚舉值）；SG-01 時使用暫定常數，**SG-02 起數值已凍結於 `rules.js` 的 `CHARACTER_OPTION_LIMITS`**（三模板基底總和 9、自由配點 3、單項最終 1..6、`risk`＝cautious／bold、`bond`＝independent／caring）。性格不改任何屬性或效率欄位。
- 狀態：師父（`disc-master`）與主角（`disc-protagonist`）兩人開局；候選 `cand-1`、`cand-2` 另存於 `candidates`，在接受前不在 `disciples`，不參與結算。`rosterAt(world, slotIndex)` 只回傳 `joinSlotIndex ≤ slotIndex` 的角色。
- `story`：`rescues`（援村紀錄）、`triggeredEventIds`、`invitations`（locked／invited／deferred／accepted 與 `joinSlotIndex`）、`organisationStatus`（dojo／sectFounded／foundingDeferred）。平日「守山」備戰點屬另案未批准提案，**不在 schema 內**。
- `phase`：planning、awaitingChoice、ending 可保存；`resolving` 為同步原子運算，不可保存。`slotIndex` 0..42；42 之後必須先 awaitingChoice（獸患待選），結算後才 ending，沒有第 43 格；立派／暫緩只能出現在 ending。
- `validateWorld` 對壞資料與未知版本回傳明確 `code`／`reason`／`path`，不修改輸入。所有數值必須是安全整數（拒絕小數、NaN、-0）。整棵狀態樹只能有 JSON 型別：Map／Set／Date／RegExp／Error、class 實例、型別陣列、Symbol 鍵、不可列舉屬性、getter、稀疏陣列、帶額外屬性的陣列與含 accessor（getter／setter）元素的陣列一律以 `bad_type` 拒絕（序列化會靜默遺失它們）；null 原型物件與跨 realm（例如 `vm`）的普通物件可接受。
- canonical：`canonicalize` 遞迴排序 key 的 JSON；`hashWorld` 為 SHA-256 十六進位（純 JS 實作，與 Node crypto 交叉核對）。`CANONICAL_EXCLUDED_FIELDS` 為空：不排除任何欄位，包含 `characterOptions` 與 `story`。
- 取整契約：倍率用基點（10000＝1.0），`mulBp(n, bp)` 全程 `Math.floor`，負數向下取整；複合倍率只在最後取整一次（見 RULES.md）。
- `serializeState`／`parseState` 為純函式，不碰 localStorage（SG-07）。`serializeState` 會先 `validateWorld`，不合法的 world（resolving、未知版本、非 JSON 資料）丟 `TypeError`，不輸出字串；`canonicalize`／`hashWorld` 本身只保證 JSON 子集，呼叫端若要保存仍應走 `serializeState`／`parseState`。

## SG-02A 新增（內容資料）

- `js/story-data.js`：第一章事件、效果詞彙、契約、性格文案與驗證／查詢函式（`validateStoryData`、`dueEvents`、`evaluateTrigger`、`validateChoice`、`personalityNote`、`describeEvent`）。純資料＋純函式，不用 RNG、牆鐘或 eval；Node 只 require `rules.js` 與 `state.js`。
- 瀏覽器載入順序：`rng.js` → `rules.js` → `state.js` → `story-data.js`；漏載會丟出指名檔案的錯誤。
- **版本不變**：schemaVersion 1、ruleVersion 2、rngVersion 1；內容尚未接進世界狀態，新世界不含事件字串，既有 golden 不受影響。內容自身有 `contentVersion`（1）並要求 `ruleVersion` 2。
- 事件表與契約見 [RULES.md](RULES.md) 第 10 章。

## SG-03 新增（指令、日課與時段結算）

公開 API（全部回傳新值、不修改輸入；深凍結的世界也可執行；失敗回 `{ok:false, code, reason}` 且世界、RNG、revision 不變）：

- `Commands.dispatch(world, {id, expectedRevision, type, payload})` → `{ok:true, duplicate, state, events}`。
- `Engine.advance(world, slots = 1)` → `{ok:true, state, events, advanced, stopReason, error?}`；`stopReason` 為 `completed`、`pendingEvent`（遇到待選立即停，`advanced` 是實際推進的格數）或 `error`（批次中途遇到不支援的故事事件，已推進的格數保留）。
- `Engine.arbitrate({requests, resources, seats})`、`Engine.settleIntents(intents, supply)`：純仲裁；`Engine.planIntents`、`Engine.factsFor`；`Commands.validateEngineWorld`、`Commands.scheduledAction`、`Commands.payloadHash`。

**命令處理順序**（有測試）：①世界驗證（`invalid_world`）→②封套形狀（`bad_command`）→③同 id 重送：同 type＋payload 回已處理結果（`duplicate:true`，回傳目前世界、不增 revision、不重複紀錄、不覆蓋較新世界），異內容 `command_id_conflict` →④`expectedRevision`（`stale_revision`／`revision_ahead`）→⑤命令類型（`unknown_command`／`not_supported_yet`）→⑥各命令的 payload（`bad_payload`）、phase、內容驗證與套用。被拒絕的命令不寫 `commandLog`（不佔用 id）。成功的命令 revision 恰好 +1，並寫入 `commandLog`（序號連續、含 payload hash）與 `eventLog`。

**錯誤碼**：`invalid_world`、`bad_command`、`command_id_conflict`、`stale_revision`、`revision_ahead`、`unknown_command`、`not_supported_yet`、`bad_payload`、`not_planning`、`unknown_disciple`、`candidate_not_member`、`slot_out_of_range`、`slot_already_resolved`、`unknown_action`、`action_locked`、`no_pending_event`、`not_pending`、`unknown_option`、`invalid_state`、`inconsistent_result`；`advance` 另有 `bad_slots`、`awaiting_choice`、`ended`、`unsupported_story_effect`。

**課表**（`world.schedule`）：`templates`（角色 → 三個行動，對應每日早午晚）與 `overrides`（單格覆寫，依 slotIndex、角色 ID 嚴格排序）。某格的行動＝覆寫 > 範本 > 預設野外休養（明示預設）。`assignSlot` 的 `action:null` 清除覆寫、`setDailyTemplate` 的 `parts:null` 清除範本。只有 planning 可排課；已結算格、超出範圍、候選（尚未入隊）、未知／未支援行動、階段鎖定的 `gather-herb` 都被拒絕。範本可含 `gather-herb`，但套用到仍鎖定的格時以明示休養備案（事件的 `fallback: {from, reason:'locked'}`）。

**每格結算順序**（`Engine.advance`）：待選／ending 檢查 → 一次性階段事件（`evt-phase-*`，slot 0／9／18／30 的第一格）→ 從課表建立意圖 → 仲裁（等待較久優先、其次穩定 ID；參與者＋工作位＋成本整批成功或失敗；失敗轉明示休養）→ 在格初快照上計算全部效果 → 一次提交（資源、角色狀態、slotIndex／revision +1、`slotResolved` 事件）→ 日末寫 `dayReport` 並判斷待選事件（slot 8→9 的援村求援、41→42 的獸患危機；危機優先），有待選就 `awaitingChoice` 並停止批次。slotIndex 42 時只會停在危機待選，沒有第 43 格。

**事件**：待選事件只能用 `chooseEvent`（payload 只有 `eventId`、`optionId`，效果取自 `story-data.js`，玩家不能傳入）。目前只執行 `showAidPrompt`（提示，不發資源）與 `setInvitationStatus`（只改邀請狀態，不新增角色）；危機的 `submitFormation` 回 `not_supported_yet`（SG-06）。

**資料欄位**：`commandLog` 項目 `{seq,id,type,payloadHash,revisionBefore,revisionAfter,eventSeqs}`；`eventLog` 項目至少 `{seq,type,slotIndex}`（本版類型：`slotAssigned`、`templateSet`、`eventChosen`、`aidPromptShown`、`invitationStatusSet`、`story`、`slotResolved`、`dayReport`、`eventRaised`）；`pendingEvents` 項目 `{id, raisedSlotIndex}`；`jobs`／`reservations` 仍留給 SG-04，本包保持空。

**本包可結算的行動**：`gather-material`、`gather-herb`、`cultivate`、`rest`、`tune-mind`（公式全部取自 `rules.js`，沒有隨機，因此整條 42 格路徑 `rngState` 保持原值）。**不支援（明確回 `not_supported_yet`）**：命令 `acceptCandidate`（SG-04A）、`queueBuild`／`cancelQueuedJob`／`queueCraft`（SG-04）、`queueBreakthrough`（SG-05）、`setDefense`（SG-06）；行動 `build`／`brew`（SG-04）、`aid`（SG-04A）、`breakthrough`／`support`（SG-05）。

**尚未驗證**：自然援村完成與發獎、招募入隊（`acceptCandidate`）、建造／煉丹工期、突破、危機結算與 ending、storage／UI、forecast；引擎遇到需要它們的故事事件回 `unsupported_story_effect`。20 seed × 42 格只證明核心路徑走到危機待選，不證明獸患結局，也不是完整 AC-C13／AC-C15。

## 尚未實作

建造／煉丹的 runtime（SG-04）、援村發獎與固定招募入隊（SG-04A）、突破（SG-05）、危機結算與 ending（SG-06）、storage、UI、forecast。`tiles`、`jobs`、`reservations` 此時只驗證型別，內容契約由後續任務定義並視需要升版本。

## fixture

`test/fixtures/new-world.json` 保存固定 seed＋角色設定的 canonical 字串、hash 與 rngState。改動 schema／ruleVersion／rngVersion 時 hash 必然改變；PR 必須逐項解釋原因，不可只換常數。SG-02 升到 ruleVersion 2 時，7 個 hash 全部改變，唯一差異是 `ruleVersion` 欄位；`test/fixtures/new-world.v1.json` 保存 SG-01 的歷史 golden（永不重產），測試逐案證明差異只有這個欄位、rngState 不變。

SG-03 升到 schemaVersion 2：`test/fixtures/new-world.json` 以 schema 2 重產（7 個 hash 全部改變，唯一差異是 `schemaVersion` 與新增的 `schedule`，rngState 不變）；SG-02 時的 schema 1／ruleVersion 2 golden 搬到 `test/fixtures/new-world.schema1-rule2.json`（歷史 golden，永不重產，案例資料與先前的 `new-world.json` 相同，只在最上方加一段說明欄位）。測試逐案證明兩者差異，並證明 `new-world.v1.json`（SG-01）與新版的差異也只有 `ruleVersion`、`schemaVersion` 與 `schedule`。
