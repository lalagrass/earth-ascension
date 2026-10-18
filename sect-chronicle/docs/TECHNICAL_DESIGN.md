# 整合與技術契約

狀態：設計 0.2，含已批准 D6 道館開端；D1–D5 依 D6 修訂，屬已批准的 14 天切片技術基線；細部 API 與候選數值由前置任務定稿並接受審核。下列檔案均是預計新增，目前不存在。

## 1. 架構選擇

建議沿用 guwu 的無框架 JavaScript 模組風格：瀏覽器載入一般 script，Node 透過 CommonJS 測試，共享同一份純邏輯。HTML/CSS + Canvas 展示山門；DOM 呈現課表、數值與可及性控制。無建置、無外部資產、無付費服務。

正式驗證以 localhost HTTP 為主，file:// 僅作額外相容目標；不承諾不同瀏覽器在 file:// 下共享或持久保存資料。未來若要伺服器／雲端同步，另開架構決策，不先做 Python API 與 SQLite。

| 預計位置 | 單一職責 |
|---|---|
| `index.html`, `style.css` | 頁面骨架與響應式版面 |
| `js/rules.js` | 內容 ID、規則、版本、數值與取整 |
| `js/rng.js` | 可序列化 RNG；已知輸入輸出向量 |
| `js/state.js` | 新局、schema 驗證、不可變 ID |
| `js/commands.js` | 驗證／接受玩家指令；不直接推進時間 |
| `js/engine.js` | 單一時段結算、工作位與資源預約 |
| `js/story-data.js`, `js/story.js` | 有限事件資料、復甦階段、援村與招募狀態轉移 |
| `js/progression.js`, `js/combat.js` | 培養、突破與危機純計算 |
| `js/forecast.js`, `js/view.js` | 純預估與畫面資料 |
| `js/storage.js` | 存檔封套、匯入匯出、驗證與錯誤回報 |
| `js/ui.js`, `js/art.js` | DOM 輸入／展示與非權威動畫 |
| `test/*.test.js`, `tools/` | 契約、回放、策略實驗與 UI 流程 |

## 2. 世界狀態

World 至少包含：`schemaVersion`、`ruleVersion`、`rngVersion`、`seed`、`slotIndex`、`phase`、`revision`、`rngState`、`resources`、`tiles`、`disciples`、`jobs`、`reservations`、`pendingEvents`、`commandLog`、`eventLog`、`scenarioId`、`characterOptions`、`protagonistId`、`masterId`、`story`。

`story` 至少含已完成援村紀錄、已觸發事件 ID、候選邀請狀態／已接受 ID 與各自的 `joinSlotIndex`、organisationStatus（dojo／sectFounded／foundingDeferred）。靈氣階段由 slotIndex 與規則表推導；不另存會失步的手動階段。disciples 起始只含師徒兩人，候選另存；僅 active roster 可參與結算。故事欄位與角色設定皆納入 canonical state。

- `slotIndex` 從 0 起算；day = floor(slotIndex/3)+1，part = slotIndex%3。14 天情境結算完第 42 格後轉 awaitingChoice（獸患）；選陣結算後才轉 ending，之間不得再 advance；日期顯示停在第 14 天，不能出現可玩的第 15 天。
- phase：planning → resolving → planning／awaitingChoice／ending。resolving 是同步原子運算，UI 不可中途存部分狀態。
- 弟子使用不可變 ID；陣列順序、顯示排序不得改變先手權或亂數結果。
- 資源、傷勢、材料等以整數儲存；倍率用整數基點，計算最後才取整，範圍與捨入方式由 rules 統一。
- 派生數值由 selector 計算，避免保存過期戰力、突破率與風水快取。

## 3. 指令與時間契約

公開介面候選：`newWorld(seed, scenarioId, characterOptions)`、`dispatch(world, command)`、`advance(world, slots)`、`forecast(world, plan)`。全部回傳新值，不原地改輸入。

command 封套：`id`、`expectedRevision`、`type`、`payload`。成功結果含 `ok/state/events`；拒絕含 `ok:false/code/reason`，世界、RNG 與 revision 不變。重送已接受 id 回傳已處理結果，不重複扣款；過期 revision 明確拒絕，由 UI 刷新後重試。

角色選項在建世界前驗證，模板／點數非法不建立部分世界；同 seed 還須同角色設定才能比較回放。分界：SG-01 的 `state.js` 驗證結構、型別及暫定常數約束（欄位齊全、`templateId` 為已宣告字串、三屬性為整數、點數不為負且總和等於已宣告預算、兩軸性格為已宣告枚舉），使用先宣告的暫定常數 `CHARACTER_OPTION_LIMITS`；SG-02 才凍結模板預算、加點上限與性格枚舉的正式數值並升 ruleVersion。

類型：assignSlot、setDailyTemplate、queueBuild、cancelQueuedJob、queueCraft、queueBreakthrough、setDefense、chooseEvent、acceptCandidate（穩定候選 ID）。援村使用日課任務，不另開即時產出 API。新局／匯入由 storage/app 層驗證後整體替換。除明確的事件選擇外，資源與成長只在 advance 結算；排隊本身不產生成果。

### 每格固定順序

1. 若待選事件或 ending，advance 不得執行；驗證剩餘情境長度。
2. 按即將結算的 slotIndex 推導復甦階段，若有新階段寫一次性可見事件；凍結格初狀態，從課表建立意圖；建築在本格完工要到下一格可使用。
3. 驗證角色、地塊、材料、支援者與工作位；依固定輪候規則分配（等待較久優先，其次穩定 ID），與輸入陣列順序無關。
4. 原子預約整批成本與所有參與者。某工作缺任一條件時全批拒絕，不扣任何材料；改為明示的休養備案。
5. 在同一凍結快照計算效果，按穩定 job ID 消耗 RNG；不可利用前一名角色本格產出支付另一工作。
6. 一次提交扣款、工作進度、完工、角色狀態與事件；刷新派生資訊，slotIndex/revision 遞增。
7. 到日末計算日報，援村／招募條件以本格已提交結果判斷，按穩定事件 ID 排待選隊列；最終獸患優先於尚未處理的可選招募，不得因不收徒卡死結局。到危機點轉 awaitingChoice。批次推進遇到待選事件立即停，不能越過。

工作至少占一格。具體工期／成本由 SG-02 交付規則表，需保證開局能透過免費採集與休養走到首座丹房。突破丹與支援只在工作開始時鎖定，結算讀取 reservation，不能在扣費後再次檢查是否付得起。

### 隨機與預估

單一版本化 RNG，保存完整狀態。接受但不涉及機率的課表編輯不消耗 RNG；失敗指令、動畫、預覽、滑鼠懸停不消耗 RNG。禁止把每次點擊次數當成重新播種來源。

forecast 在複製狀態上使用相同確定性公式，但隨機工作回報可能範圍／機率及假設，不讀取未來抽樣結果。不用複製 RNG 預知即將發生的事件。純確定情境的預估必須等於實際；有事件時日報解釋偏差。

## 4. 存檔與相容

新封套 `format: sect-chronicle` + schema/rule/rng versions + checksum + 完整狀態。使用獨立 localStorage key `sect-chronicle-save-v1`；不讀寫 guwu 或 Python 原型存檔。

保存新內容前先序列化與驗證；保留上一份可讀備份，讀入損壞檔不自動刪除。未知版本拒絕並提供匯出原始資料。localStorage quota／權限／JSON 錯誤要顯示「尚未保存」，不得顯示成功。新局明確建立指定 seed，不走舊檔 fallback。

保存時間：每個已提交時段、事件選擇、課表編輯；可 debounce 編輯，但必須顯示尚未保存並提供立即儲存。匯出 JSON 作為跨瀏覽器備份。舊格式遷移本版不做；日後新增需版本化純函式與 fixture。

## 5. 原型取用策略

可參考 guwu 的 RNG、公式拆分、範本、因果 view、測試工具結構；可移植 sect 的五行關係表與建築資料意圖。先寫新契約測試再移植，不直接 require 兩個原型，也不保留月制相容分支。

不可照搬：付費護法二次檢查、fresh 載回 v2、無丹爐煉丹、免費即時歷練、全資源同格採集、描述未生效的特質。原型既有通關率不能當整合版基線。

## 6. 狀態與動畫分離

角色視覺位置在工作位間插值；切片明確不模擬走路時間。實際工作位顯示占用與等待原因，不以動畫位置判定產出。播放倍率只控制 advance 的呼叫頻率；同指令序列在單步／1×／4×／批次後 canonical state 相同。

canonical state 包含世界與 RNG、排隊及待選事件，排除播放倍率、畫面分頁、牆鐘時間與動畫進度。命令紀錄保留接受序號；hash schema 由 SG-01 定義，不能為修測試任意排除有影響欄位。

## 7. 設計 0.2 版本處理

採用 [D6 契約](OPENING_REVISION.md)。接受候選是可回放指令，入隊以 `joinSlotIndex`（接受當下尚未結算的 `slotIndex`，即下一次 advance 要結算的那格）為準，從該格起可排課與結算；禁止對 `joinSlotIndex` 之前已結算的格補發產出；`phase` 非 planning（含 awaitingChoice 的獸患待選與 ending）時 `acceptCandidate` 回傳拒絕。事件獎勵與入隊以已處理 ID 去重，存讀檔須保存待選狀態與已處理狀態。

若骨架尚未實作，直接以新結構建立首版；若已存在可用存檔／fixture，先列 schema／ruleVersion 影響，提出有測試的遷移或明確拒絕並保留原檔，不假設沒有玩家存檔。不得為套新劇情靜默刪除角色或將失敗結局變成成功。

## 8. SG-03 實作契約（細部）

本節是 SG-03 對 §2–3 的細部落實；與 [DEVELOPMENT.md](DEVELOPMENT.md) 一致，且以後者與測試為準。

- **模組**：`js/commands.js`（`dispatch`、世界的引擎層驗證、課表查詢）與 `js/engine.js`（`advance`、仲裁、意圖、故事 facts）。載入順序 rng → rules → state → story-data → commands → engine。
- **schema 2**：新增 `schedule`（`templates`＋排序的 `overrides`）；`commandLog`、`eventLog`、`pendingEvents` 有固定項目格式與序號連續性驗證。舊 schema 存檔明確拒絕、不遷移。
- **去重與 revision**：同 id 重送先於 revision 檢查；回傳的是已處理結果與目前世界，不倒退。被拒絕的命令不寫紀錄。revision：命令成功 +1、每結算一格 +1。
- **結算／仲裁**：每格從格初快照計算所有效果；仲裁以「等待較久、其次穩定 ID」排序，參與者／工作位／成本整批成功或失敗，失敗轉明示休養。本包沒有持久的等待計數與工作位（SG-04 隨 `jobs`／`reservations` 定義），現階段所有意圖 `waited = 0`。
- **停止**：待選事件（slot 8→9 求援、41→42 危機）使 phase 轉 `awaitingChoice`，批次立即停止；危機與 ending 的結算由 SG-06 接入。
- **事件資料**：引擎只消費 `story-data.js` 的 `dueEvents`／`validateChoice`／宣告的效果；對尚未有 runtime 的效果（援村發獎、危機佈陣、結局）一律明確拒絕。
- **不使用 RNG**：本包的行動都是確定性公式，`rngState` 全程不變。
