# 開發說明（SG-01／SG-02／SG-02A／SG-03／SG-04／SG-04A／SG-05）

本文件隨程式更新；runtime紀錄只描述已存在且已驗證的事。尚未實作的模組見 [TECHNICAL_DESIGN](TECHNICAL_DESIGN.md)。

**SG-05（已實作，待遊戲 PO 審查）**：[SG05_HANDOFF.md](SG05_HANDOFF.md)含D7決策與接手包，追蹤#95／#93；實作與驗證見下方「SG-05 新增」。版本表已更新為 schema4／rule3／rng1。瀏覽器儲存提示由 SG-07 實作。

## 執行測試

```sh
node --test sect-chronicle/test/*.test.js     # Node 24 不要用目錄參數
node sect-chronicle/tools/update-fixtures.js  # 僅在有意改版本時重產 fixture，並在 PR 說明差異
node sect-chronicle/tools/smoke.js --seed demo # 首爐丹冒煙：兩人零材料 → 建丹房 → 首爐丹 → 第 42 格危機待選
node sect-chronicle/tools/smoke.js --seed demo --breakthrough pill-support # SG-05：再加上主角修為滿 100 後排突破（plain｜pill｜pill-support）
```

根目錄檢查（CONTRIBUTING／AGENTS 指定）：`python3 -m unittest discover -s tests -v`、`node --check earth_ascension/static/m2.js`、`git diff --check`。

## 模組載入策略

`js/rng.js`、`js/rules.js`、`js/state.js`、`js/story-data.js`、`js/story.js`、`js/progression.js`、`js/commands.js`、`js/engine.js` 是無框架的 UMD 風格腳本：

- Node：`require('./js/state.js')`（state 會自行 require rng 與 rules；`rules.js` 是葉節點，不 require 任何模組，因此沒有 state↔rules 循環）。
- 瀏覽器：依序以一般 `<script>` 載入 `js/rng.js` → `js/rules.js` → `js/state.js` → `js/story-data.js` → `js/story.js` → `js/progression.js` → `js/commands.js` → `js/engine.js`；API 掛在 `globalThis.SectChronicle.Rng`／`.Rules`／`.State`／`.StoryData`／`.Story`／`.Progression`／`.Commands`／`.Engine`（`progression.js` 只依賴 rng、rules，須早於 commands）。漏載任何前置檔時，後面的檔案會丟出指名該檔的錯誤。Node 只需 `require('./js/engine.js')`（逐層 require 前置檔，沒有循環：rules←state←story-data←story←commands←engine；progression 只依賴 rng、rules，由 commands 與 engine 引用）。不需建置、不使用 ES module，`file://` 也能載入（儲存相容性另計，見技術設計）。

## 版本

| 項目 | 值 | 說明 |
|---|---|---|
| schemaVersion | 4 | 世界狀態欄位與驗證規則；SG-03 由 1 升為 2（`schedule`、log 格式），SG-04 升為 3（固定 25 格 `tiles`、新增 `inventory`、`jobs`／`reservations` 內容契約），**SG-05 升為 4**（弟子 `breakthroughs`、修為上限 100、突破 job 與 `outcome`）。schemaVersion 1～3 存檔回傳 `unknown_schema_version`，原資料不變，不遷移（D7-D） |
| ruleVersion | 3 | SG-01 暫定值 1 → SG-02 凍結的候選規則基線 2 → **SG-05 升為 3**（D7-A：`CULTIVATION_CAP`／`capCultivationGain`，數值表不變；唯一來源是 `js/rules.js`）；數值表見 [RULES.md](RULES.md) |
| rngVersion | 1 | cyrb128 播種＋sfc32，丟棄前 15 筆；`nextInt` 為拒絕抽樣 |

## SG-02 新增的契約

- `js/rules.js`：規則表與純計算（五行／地圖／設施、靈氣階段、修行、採集、煉丹、休養、突破、援村〔占一人一格〕、休養穩態比率估算）。全部純函式、不消耗 RNG；細節與數值見 [RULES.md](RULES.md)。
- `CHARACTER_OPTION_LIMITS`、師父屬性、起始數值、`RULE_VERSION`、`BASIS_POINTS`／`mulBp` 的權威定義移到 `rules.js`；`state.js` 只持有同一物件／函式的引用，沒有第二份定義。
- `state.js` 只接受目前的 ruleVersion（SG-05 起為 3）；ruleVersion 1 存檔回傳 `unknown_rule_version`，原資料不變，不提供遷移。
- 新局 `tiles` 在 SG-02 時為空陣列；自 SG-04（schema 3）起，新局採用 `rules.initialTiles()` 的固定 25 格版型。

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
- `Engine.advance(world, slots = 1)` → `{ok:true, state, events, advanced, stopReason, error?}`；`stopReason` 為 `completed`、`pendingEvent`（遇到待選立即停，`advanced` 是實際推進的格數）、`breakthroughResolved`（SG-05：本格有突破結果——成功或失敗——已完整提交，批次停在下一格，讓玩家調整；同格有待選事件時 `pendingEvent` 優先）或 `error`（批次中途遇到不支援的故事事件，已推進的格數保留）。
- `Engine.arbitrate({requests, resources, seats})`、`Engine.settleIntents(intents, supply)`：純仲裁；`Engine.planIntents`、`Engine.factsFor`；`Commands.validateEngineWorld`、`Commands.scheduledAction`、`Commands.payloadHash`。

**命令處理順序**（有測試）：①世界驗證（`invalid_world`）→②封套形狀（`bad_command`）→③同 id 重送：同 type＋payload 回已處理結果（`duplicate:true`，回傳目前世界、不增 revision、不重複紀錄、不覆蓋較新世界），異內容 `command_id_conflict` →④`expectedRevision`（`stale_revision`／`revision_ahead`）→⑤命令類型（`unknown_command`／`not_supported_yet`）→⑥各命令的 payload（`bad_payload`）、phase、內容驗證與套用。被拒絕的命令不寫 `commandLog`（不佔用 id）。成功的命令 revision 恰好 +1，並寫入 `commandLog`（序號連續、含 payload hash）與 `eventLog`。

**錯誤碼**：`invalid_world`、`bad_command`、`command_id_conflict`、`stale_revision`、`revision_ahead`、`unknown_command`、`not_supported_yet`、`bad_payload`、`not_planning`、`unknown_disciple`、`candidate_not_member`、`slot_out_of_range`、`slot_already_resolved`、`unknown_action`、`action_locked`、`no_pending_event`、`not_pending`、`unknown_option`、`invalid_state`、`inconsistent_result`；`advance` 另有 `bad_slots`、`awaiting_choice`、`ended`、`unsupported_story_effect`。

**課表**（`world.schedule`）：`templates`（角色 → 三個行動，對應每日早午晚）與 `overrides`（單格覆寫，依 slotIndex、角色 ID 嚴格排序）。某格的行動＝覆寫 > 範本 > 預設野外休養（明示預設）。`assignSlot` 的 `action:null` 清除覆寫、`setDailyTemplate` 的 `parts:null` 清除範本。只有 planning 可排課；已結算格、超出範圍、候選（尚未入隊）、未知／未支援行動、階段鎖定的 `gather-herb` 都被拒絕。範本可含 `gather-herb`，但套用到仍鎖定的格時以明示休養備案（事件的 `fallback: {from, reason:'locked'}`）。

**每格結算順序**（`Engine.advance`）：待選／ending 檢查 → 一次性階段事件（`evt-phase-*`，slot 0／9／18／30 的第一格）→ 從課表建立意圖 → 仲裁（等待較久優先、其次穩定 ID；參與者＋工作位＋成本整批成功或失敗；失敗轉明示休養）→ 在格初快照上計算全部效果 → 一次提交（資源、角色狀態、slotIndex／revision +1、`slotResolved` 事件）→ 日末寫 `dayReport` 並判斷待選事件（slot 8→9 的援村求援、41→42 的獸患危機；危機優先），有待選就 `awaitingChoice` 並停止批次。slotIndex 42 時只會停在危機待選，沒有第 43 格。

**事件**：待選事件只能用 `chooseEvent`（payload 只有 `eventId`、`optionId`，效果取自 `story-data.js`，玩家不能傳入）。目前只執行 `showAidPrompt`（提示，不發資源）與 `setInvitationStatus`（只改邀請狀態，不新增角色）；危機的 `submitFormation` 回 `not_supported_yet`（SG-06）。

**資料欄位**：`commandLog` 項目 `{seq,id,type,payloadHash,revisionBefore,revisionAfter,eventSeqs}`；`eventLog` 項目至少 `{seq,type,slotIndex}`（本版類型：`slotAssigned`、`templateSet`、`eventChosen`、`aidPromptShown`、`invitationStatusSet`、`story`、`slotResolved`、`dayReport`、`eventRaised`）；`pendingEvents` 項目 `{id, raisedSlotIndex}`；`jobs`／`reservations` 仍留給 SG-04，本包保持空。

**本包可結算的行動**：`gather-material`、`gather-herb`、`cultivate`、`rest`、`tune-mind`（公式全部取自 `rules.js`，沒有隨機，因此整條 42 格路徑 `rngState` 保持原值）。**不支援（明確回 `not_supported_yet`）**：命令 `queueBreakthrough`（SG-05）、`setDefense`（SG-06）；行動 `breakthrough`／`support`（SG-05）。`build`／`brew`／`aid` 由 job 驅動（SG-04／SG-04A，見下節），不可排入課表（`use_job_command`）；`acceptCandidate` 自 SG-04A 起已支援。

**尚未驗證**：自然援村完成與發獎、招募入隊（`acceptCandidate`）、建造／煉丹工期、突破、危機結算與 ending、storage／UI、forecast；引擎遇到需要它們的故事事件回 `unsupported_story_effect`。20 seed × 42 格只證明核心路徑走到危機待選，不證明獸患結局，也不是完整 AC-C13／AC-C15。

## SG-04 新增（建造、煉丹、工作位與持久輪候）

命令（皆只在 `planning` 可用，只「排隊」：不推時間、不扣材料、不發成果；命令封套、去重與 revision 順序沿用 SG-03）：

| 命令 | payload | 錯誤碼（依序） |
|---|---|---|
| `queueBuild` | `{discipleId, facilityType, tileId}` | `bad_payload`、`not_planning`、`unknown_disciple`／`candidate_not_member`、`unknown_facility`／`unknown_tile`／`not_buildable`、`facility_limit`、`tile_occupied` |
| `queueCraft` | `{discipleId, recipeId, facilityJobId}` | `bad_payload`、`not_planning`、角色同上、`unknown_recipe`、`unknown_job`、`wrong_facility`、`facility_cancelled` |
| `cancelQueuedJob` | `{jobId}` | `bad_payload`、`not_planning`、`unknown_job`、`job_not_queued`（已開始／完成／取消皆不可：不倒帶、不退款、不拆建築） |

`assignSlot`／`setDailyTemplate` 排入 `build`／`brew` 回 `use_job_command`。

**採集的資源點目標（PR #91 R3）**：`assignSlot` 可加選用的 `tileId`，`setDailyTemplate` 可加選用的 `tileIds`（三個地塊 ID 或 `null`，只有採集格可非 null）。地塊必須存在（`unknown_tile`）且資源種類與行動相符（`wrong_terrain`：`gather-material`→material、`gather-herb`→herb）；非採集行動帶地塊、形狀錯誤回 `bad_payload`。沒指定時，結算使用該資源種類排序最前的資源點（`t-0-0`／`t-2-0`），是穩定預設而不是「任選有空位的點」。每個資源點各自有 `Rules.TERRAIN.workSlots`（2）個位，不同點互不借用。存放：覆寫項目多選用的 `tileId`；範本的地塊在 `schedule.templateTiles`（角色 → 長度 3 陣列）；重設／清除範本即清除舊目標。沒有 `tileId` 的舊形狀仍有效，canonical 不含該鍵。`facility_limit` 與 `tile_occupied` 把排隊、施工中與已完工的工程都算進去；取消的工程不算，ID 不重用。

**資料（schema 3）**：`tiles`＝`Rules.initialTiles()` 的 25 格；`inventory`＝`{ 'breakthrough-pill': n }`；`jobs`（`job-0001`… 依序、不刪除）項目 `{id, kind, discipleId, status, queuedSlotIndex, waited, startSlotIndex, slotsDone, completedSlotIndex, cancelledSlotIndex, target}`，`status` ∈ queued／active／done／cancelled，`target` 為 `{facilityType, tileId}`（build）或 `{recipeId, facilityJobId}`（craft）；`reservations`＝每個 active job 一筆 `{jobId, discipleId, seat, startSlotIndex, slotsTotal, paid, output}`。設施不另存欄位：已完工設施＝`status:'done'` 的 build job。`seatWaits`（依 `discipleId` 排序、每人至多一筆）＝`{discipleId, seat, waited}`：該角色對聚靈台／居所／某資源點的位已連續落選 `waited` 格（見下）；`schedule` 另含 `templateTiles`。`state.js` 的 validator 檢查 shape、引用、狀態一致性（`slotsDone = slotIndex − startSlotIndex`、`waited ≤ 排隊後經過格數`、完工格＝開工＋工期−1、煉丹開工格晚於丹房完工格）、設施上限／地塊互斥、每人至多一個 active job、工作位上限，並用 `rules.js` 重算 reservation 的成本、倍率與產出。

**每格順序（在 SG-03 之上擴充，仍是格初快照 → 仲裁 → 一次提交）**：

1. 有 active reservation 的角色強制繼續做該工作，課表在這格被忽略；不參與仲裁。
2. 其餘角色的 queued job 是開工請求：先剔除 `participant_busy`、`facility_missing`、`facility_not_ready`，其餘走 `arbitrate`（等待較久優先、其次 job ID；參與者＋工作位＋成本整批成敗）。資源取格初快照，**同格採集的產出不能支付本格新工作**。成功者開工那格扣一次成本、建立 reservation，本格即算第 1 格工期；失敗者 `waited +1`、不扣任何東西，原因寫入 `slotResolved.denied[]`。**開工失敗的明示休養備案（R2）**：被拒、且本格沒有進行中或成功開工的另一個 job 的角色，這格只執行一次休養（`action:'rest'`、`source:'job-denied'`、`fallback:{from:'build'|'brew', reason:<拒絕碼>, jobId}`），不照原課表（例如不會採集）；一人多個被拒 job 時原因取 job ID 最前者；已有進行中／成功的 job 者只執行該 job，不再休養。
3. 沒有 job 的角色依課表行動（含上述休養備案）；聚靈台修行位（1）、居所休養位（2）、**每個資源點各自的工作位（2）**固定輪候配位。**持久輪候（R1）**：對同一個位連續落選 N 格，`seatWaits` 記 `waited = N`，下一格以此仲裁（等待較久優先、同分 ID 較小者先）；取得位、改要別的位或別的行動、位不再存在時紀錄消失（重置，不累積舊債）。配不到的修行／休養回明示的野外版本（`seatFallback`），採集配不到沿用休養備案（`fallback:{from, reason:'no_seat'}`，不再另配居所位）。倍率來自 `Rules.evaluateFacilityPlacement`，只讀格初已完工的設施。
4. 一次提交：建造每格 `Rules.ACTIONS.build` 體力、煉丹每格 `brew` 體力；完工（`status:'done'`）在最後工期格末；**該格沒有使用收益，次格格初才可用**。煉丹產出在開工格以格初快照（開工者體力、技藝、丹房放置倍率）算出並存在 reservation，完工時一次發入 `inventory`。
5. 第 42 格待選時未完工的 job 保持 `active`，不提早完工；沒有新增強制休息或「禁止疲憊工作」規則。

事件：`jobQueued`、`jobCancelled`（命令）、`jobStarted`（含 `paid`、煉丹的 `output`）、`jobCompleted`（含 `readySlotIndex`、煉丹的 `output.basis`）；`slotResolved` 新增 `denied[]` 與結果的 `job`／`seat`／`multiplierBp`／`seatFallback`；`dayReport` 帶 `inventory`。全程確定性，不消耗 RNG。

**CLI**：`node sect-chronicle/tools/smoke.js --seed <seed> [--template <id>]` 只用公開 `newWorld`／`dispatch`／`advance`，策略版本 `first-furnace-v1`；輸出 seed、版本、策略、命令數、首丹 slot／day（`firstPillSlot`＝丹藥首次在庫的 slotIndex）、最終 slot／phase／待選、資源與丹藥、job 與等待摘要、hash 與未實作項；退出碼 0 成功、1 策略失敗、2 用法錯誤。

**已驗證（`test/production.test.js` 與更新的既有測試）**：schema 3 的資料契約與壞資料拒絕；三個命令的成功／拒絕／重送；開工扣一次、占人工期、完工次格可用；材料不足與工作位的整批拒絕、持久輪候、參與者互斥；聚靈台／居所／丹房倍率與位滿備案；煉丹產出取開工快照；生產中途的 serialize／parse；20 個 seed × 42 格在單步、3 格、42 格批次下 hash 相同且都製出首爐丹；CLI。**已知限制**：job 之間先排隊者的 `waited` 必然不小於後排隊者，所以 job 層的優先翻轉仍只由純 `arbitrate` 測試涵蓋；設施位與資源點位的持久輪候則有生產路徑測試（`test/contention.test.js`：師父／主角輪流得聚靈台位、三人爭同一點、改去另一點、存讀、批次、陣列排序）。被配位拒絕的採集轉休養備案時不再另配居所位。**未驗證**：突破與丹藥消耗（SG-05）、獸患結算與 ending（SG-06）、storage／UI、AC-C13／C15、SG-M1、真人試玩；也未做平衡實驗（首丹時點只是本策略的一個結果，不是設計目標）。

## SG-04A 新增（復甦、援村與固定招募）

**範圍**：援村行動與一次性獎勵、兩名固定學徒的邀請與入隊、第 42 格危機優先。不含突破與支援（SG-05）、危機結算／ending／立派（SG-06）、storage／UI／forecast。**版本不變**：schemaVersion 3、ruleVersion 2、rngVersion 1、story contentVersion 1（沒有新頂層欄位；`rules.js`、`story-data.js` 不動；`new-world.json` 不變）；不消耗 RNG。

**模組**：新增 `js/story.js`（純邏輯：故事 facts、下一個到期事件、援村結算、取消落選援村、入隊、引擎層一致性、候選初始屬性來源）。載入順序 rng → rules → state → story-data → **story** → commands → engine；Node 逐層 require，沒有循環（story 不 require commands／engine）。

**命令**
- `queueAid { discipleId, optionId }`：`optionId` 是 `AID_OPTIONS` 的 `free`（零材料）或 `supplied`（`cost` 在格初快照一次扣）。援村是 job（`kind:'aid'`，target `{aidId:'village-fence', optionId}`），沿用 SG-04 的原子預約、持久 `waited` 與被拒時的明示休養備案。工期 `AID_DURATION_SLOTS`（1），所以同格開工並完工；體力取 `ACTIONS.aid`；工作位 `aid:village-fence` 容量 `AID_WORKERS`（1）。錯誤：`bad_payload`、`not_planning`、`unknown_disciple`／`candidate_not_member`、`unknown_aid_option`、`aid_locked`（第 9 格前）、`aid_completed`。`aid` 不可排入課表（`use_job_command`）。
- `acceptCandidate { candidateId }`：只在 planning、狀態 `invited` 或 `deferred`。第 42 格起 phase 只可能是待選／ending，所以危機後不再接受入隊由 `not_planning` 保證；隊伍上限四人是結構性的（只有兩名固定候選）。寫入 `invitations[id] = {status:'accepted', joinSlotIndex: world.slotIndex}`（接受當下尚未結算的格）並加入學徒；不耗 RNG、不發資源、不補發之前的產出。錯誤：`bad_payload`、`unknown_candidate`、`not_planning`、`already_accepted`、`candidate_not_invited`。同 id 重送回原結果（`duplicate:true`），新 id 再接受同一人被拒、revision 不變。`chooseEvent` 的邀請選項仍只改 `invited`／`deferred`，不直接入隊；待選時須先回 planning 才能接受。

**狀態轉移與去重**
- 援村：queued → done（同格）→ **同一提交**內記錄 `rescues[{id, completedSlotIndex, rewardClaimed:true}]` 並發 `Rules.aidReward(optionId)`；去重鍵＝`triggeredEventIds` 的 `evt-aid-complete`＋rescues（`reward:village-fence`）。求援提示（`showAidPrompt`）不發獎也不鎖定選項。完成後其餘排隊中的援村 job 在同一提交取消（`jobCancelled`，`reason:'aid_taken'`；取消格內的落選不計入 `waited`）。
- 邀請：locked → invited／deferred（`chooseEvent`）→ accepted（`acceptCandidate`）；`evt-invite-cand-N` 登記在 `triggeredEventIds` 保證每位只提示一次。
- 引擎層一致性（`Story.validateWorld`，由 `Commands.validateEngineWorld` 呼叫）：rescues ↔ 已完成援村 job（完成格、`rewardClaimed`）↔ `evt-aid-complete` 必須一致；最多一個完成的援村、完成後不得有排隊中的援村；有邀請進度必須有對應事件；固定學徒屬性必須取自 `CANDIDATE_PROFILES`。

**事件優先序（每格提交後的固定點迴圈，上限 16 輪）**：援村完成（任何格）先於所有待選提示；待選提示只在日末／最後一格升起，依 story-data 的優先序（危機 > cand-1 > cand-2 > 求援），**一次一個、處理後重新推導**，所以 cand-2 緊接 cand-1 且各提示一次。第 42 格危機優先：邀請不再提示（也不標為已觸發）；不推第 43 格，危機中 `acceptCandidate` 回 `not_planning`。階段事件仍在格初處理，時點不變。

**候選初始屬性來源（待遊戲 PO 核對）**：最終 dev 沒有凍結的學徒屬性表，故只引用 `rules.js` 既有模板、不新增數值——cand-1（偏生產）＝`herb-child` 2/3/4、cand-2（偏護村）＝`farmer-child` 4/2/3；體力／心境／修為／傷勢取 `START_VALUES`，無配點、無成長。只有 `story.js` 的 `CANDIDATE_PROFILES` 一張表；若 PO 另訂來源只改這張表與對應測試。

**手工 fixture**：`test/helpers.js` 提供 `withDoneAid`、`apprentice`、`withInvitation`；`commands`／`contention`／`engine` 測試的援村與學徒 fixture 改走它（援村紀錄現在必須有對應的完成 job）。`aid` 行動與 `acceptCandidate` 命令不再回 `not_supported_yet`。

**冒煙**：`tools/smoke.js` 保留 `first-furnace-v1`（不帶旗標時行為不變），新增故事路線 `village-recruit-v1`：`--aid none|free|supplied`、`--aid-from <slot>`、`--recruit 0|1|2`、`--accept-delay <slots>`。摘要含援村完成與獎勵、邀請選擇、入隊格、最終階段、hash、未驗證項；失敗以非零結束（1 策略失敗、2 用法錯誤）；只用公開 `State.newWorld`／`Commands.dispatch`／`Engine.advance`。

**已驗證（`test/story.test.js` 與更新的既有測試）**：queueAid 驗證與零材料／備料援村（含費用原子預約、同格採集不能支付、材料恰好／不足）；同格多人與不同選項競爭（等待較久者勝、落選取消、只發一份獎）；與建造互斥；重送／新 id 重複；邊界 8/9、17/18、29/30 的階段事件與修行收益、逐格／批次／每格存讀一致；援村早於日 7、晚於日 7、最後一格；cand-1 然後 cand-2 各一次；acceptCandidate 驗證與 `joinSlotIndex`、延後接受、四人上限；入隊前不是勞動力；0／1／2 人路線都到危機待選且危機中不可接受；各待選／中途狀態的 serialize／parse；壞資料各自被拒；21 seed × 42 格故事矩陣（兩兩配對覆蓋表由測試計算驗證）在單步／3 格／42 格批次下 hash 相同；CLI。**未驗證**：候選初始屬性的產品取值（只是引用現有模板）、突破與支援（SG-05）、獸患結算／ending／立派（SG-06）、storage／UI、AC-C13 除狀態外的部分、真人試玩、平衡（援村獎勵與入隊時機只是策略結果，不是設計目標）。

## SG-05 新增（修為封頂、突破與支援）

**範圍**（#95、D7）：修為上限 100、突破 job（本人＋可選一枚丹＋可選支援者）、成功鎖定與失敗重試、滿／已提升的修行轉明示休養、版本升級與舊開發存檔拒絕。不含 combat／境界戰力、storage／UI、第二境、28 天內容。

**版本**：schemaVersion 3→**4**、ruleVersion 2→**3**；rngVersion 1、story contentVersion 1 不變。ruleVersion 只因新增修為上限常數與函式而升（`Rules.CULTIVATION_CAP`＝100、`capCultivationGain`），既有數值（成功率、失敗保留 70%、傷勢 +15、行動成本）一個都沒改。schema 4：每位弟子新增 `breakthroughs`（0｜1）；新 job 種類 `breakthrough`（done 時多一個 `outcome`）；驗證 `cultivation ≤ 100`。舊檔（schema 1～3 或 rule 1～2）由既有版本檢查明確拒絕（`unknown_schema_version`／`unknown_rule_version`），輸入不變，不遷移、不截斷、不補欄位；瀏覽器端的原檔保留／備份／重開提示是 SG-07。

**公開 API**：
- 命令 `queueBreakthrough { discipleId, usePill: boolean, supporterId: string|null }`：只排隊。拒絕碼 `bad_payload`、`not_planning`、`unknown_disciple`／`candidate_not_member`（含支援者）、`self_support`、`already_breakthrough`、`not_ready`（修為 <100）、`breakthrough_pending`（同人已有排隊中的突破）。丹藥數量不在排隊時檢查。`breakthrough`／`support` 行動不能排進課表（`use_job_command`）。
- `progression.js`（純函式）：`eligibility`、`cultivationBlock`、`judge(roll, chanceBp)`（`roll < chanceBp` 成功）、`sample(rngState)`、`resolve(snapshot, {pill, supporter}, rngState)`、`validateWorld`、`ROLL_RANGE`（10000）。
- `Rules.capCultivationGain(cultivation, gain) → { applied, overflow }`。
- 世界：`disciples[].breakthroughs`；`jobs[]`（kind `breakthrough`）的 `target { usePill, supporterId }` 與 `outcome { result, mindAtStart, chanceBp, roll, cultivationBefore, cultivationAfter, injuryBefore, injuryAfter }`。境界狀態＝`breakthroughs`，不是修為（滿 100 但未成功者與已成功者可區分）。
- 事件：`jobQueued`／`jobStarted`（`paid` 含 `breakthrough-pill`）／`breakthroughResolved`（機率分項、`roll`、結果、修為與傷勢前後）／`jobCompleted`；`slotResolved.results[]` 修行封頂時多 `cultivationOverflow`，轉休養時 `fallback { from: 'cultivate', reason: 'cultivation_full'｜'breakthrough_done' }`。

**行為**：
- 開工（格初快照，與既有 job 同一仲裁）：參與者＝本人＋支援者，成本＝可選一枚丹，整批成敗；落選（`insufficient_resource`／`participant_busy`）不扣丹、不抽樣、本人這格明示休養並記 `waited`。支援者占自己的一格（`support`，體力 −10），不能兼工作。突破占一格，同格開工同格完成。恰好一丹扣到 0 仍套用加成。
- 抽樣：每個真正開工的突破恰好一次邏輯抽樣 `Rng.nextInt(state, 10000)`，依 job ID 順序；機率讀格初心境（扣行動心境前）。成功：修為保留 100、`breakthroughs=1`；失敗：100→70、傷勢 +15（夾上限 100）；主角 −20 體力／−5 心境。可恢復並再修至 100 後重試；每人最多一次**成功**提升。
- 修行：實得 `min(公式收益, 100−格初修為)`，仍付一格修行成本；格初已滿 100 或已提升者的修行意圖在配位前轉明示休養（不占聚靈台、不扣修行成本、不改課表）。
- 一致性（`Commands.validateEngineWorld`）：outcome 的機率／結果／前後修為傷勢可由 `rules.js` 重算；`breakthroughs` 必須等於成功突破 job 數；排隊中的突破其本人必須修為 100 且未成功；同人至多一個排隊中突破。支援者必須在突破排隊格當時或之前已入隊（`joinSlotIndex ≤ queuedSlotIndex`，入隊當格可支援；對 queued 與 done 都檢查，不必重播 eventLog）。

**RNG**：突破是 rngVersion 1 的第一個消費者（之前整條 42 格路徑 `rngState` 不變）。沒有突破的路徑 `rngState` 仍保持初值。

**已驗證**（`test/progression.test.js` 與更新的既有測試）：版本與舊檔拒絕；封頂與溢出；滿／已提升轉休養；queueBreakthrough 的拒絕與重送；單人成功／失敗／重試；丹與支援（恰好一丹、支援不兼工）；格初心境邊界；同丹與同支援者競爭、進行中預約占用；同格多突破的抽樣順序；outcome／提升次數矛盾拒絕；20 seed × 42 格（單步＝3 格＝批次、抽樣次數＝開工突破數、存讀）；smoke CLI 突破路線；突變檢查（含基準對照）。**未驗證**：真人試玩與平衡（成功率、時機只是 seed＋策略的結果）；瀏覽器儲存（SG-07）；境界戰力／危機結算（SG-06）。

## 尚未實作

危機結算與 ending（SG-06）、storage／瀏覽器備份與重開提示（SG-07）、UI、forecast。下一境條件未定，沒有第二境；境界戰力換算屬 SG-06。
## fixture

SG-05 升到 schemaVersion 4／ruleVersion 3：`test/fixtures/new-world.json` 以新版本重產（7 個 hash 全部改變，rngState 不變；差異只有 `ruleVersion`、`schemaVersion` 與每位弟子新增的 `breakthroughs: 0`）；SG-04／SG-04A 時的 schema 3／rule 2 golden 原樣搬到 `test/fixtures/new-world.schema3-rule2.json`（不再重產，用來證明舊開發存檔被明確拒絕）。

`test/fixtures/new-world.json` 保存固定 seed＋角色設定的 canonical 字串、hash 與 rngState。改動 schema／ruleVersion／rngVersion 時 hash 必然改變；PR 必須逐項解釋原因，不可只換常數。SG-02 升到 ruleVersion 2 時，7 個 hash 全部改變，唯一差異是 `ruleVersion` 欄位；`test/fixtures/new-world.v1.json` 保存 SG-01 的歷史 golden（永不重產），測試逐案證明差異只有這個欄位、rngState 不變。

SG-03 升到 schemaVersion 2：`test/fixtures/new-world.json` 以 schema 2 重產（7 個 hash 全部改變，唯一差異是 `schemaVersion` 與新增的 `schedule`，rngState 不變）；SG-02 時的 schema 1／ruleVersion 2 golden 搬到 `test/fixtures/new-world.schema1-rule2.json`（歷史 golden，永不重產，案例資料與先前的 `new-world.json` 相同，只在最上方加一段說明欄位）。測試逐案證明兩者差異，並證明 `new-world.v1.json`（SG-01）與新版的差異也只有 `ruleVersion`、`schemaVersion` 與 `schedule`。

SG-04 升到 schemaVersion 3：`test/fixtures/new-world.json` 以 schema 3 重產（7 個 hash 全部改變，唯一差異是 `schemaVersion`、固定 25 格 `tiles`、新增的 `inventory`、`seatWaits`（空陣列）與 `schedule.templateTiles`（空物件），rngState 不變）；SG-03 的 schema 2／ruleVersion 2 golden 搬到 `test/fixtures/new-world.schema2-rule2.json`（歷史 golden，永不重產，案例資料與先前的 `new-world.json` 相同，只在最上方加一段說明欄位）。測試證明 schema 2 golden 以 `unknown_schema_version` 被拒，並逐案證明它與較舊的 `new-world.schema1-rule2.json`、`new-world.v1.json` 和新版的差異只在版本與新增欄位（`schedule`、`tiles`、`inventory`，v1 另有 `ruleVersion`）。
