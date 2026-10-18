# 整合與技術契約

狀態：D1–D5 已批准的 14 天切片技術基線；細部 API 與候選數值由前置任務定稿並接受審核。下列檔案均是預計新增，目前不存在。

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
| `js/progression.js`, `js/combat.js` | 培養、突破與危機純計算 |
| `js/forecast.js`, `js/view.js` | 純預估與畫面資料 |
| `js/storage.js` | 存檔封套、匯入匯出、驗證與錯誤回報 |
| `js/ui.js`, `js/art.js` | DOM 輸入／展示與非權威動畫 |
| `test/*.test.js`, `tools/` | 契約、回放、策略實驗與 UI 流程 |

## 2. 世界狀態

World 至少包含：`schemaVersion`、`ruleVersion`、`rngVersion`、`seed`、`slotIndex`、`phase`、`revision`、`rngState`、`resources`、`tiles`、`disciples`、`jobs`、`reservations`、`pendingEvents`、`commandLog`、`eventLog`、`scenarioId`。

- `slotIndex` 從 0 起算；day = floor(slotIndex/3)+1，part = slotIndex%3。14 天情境結算完第 42 格後轉 ending；日期顯示停在第 14 天，不能出現可玩的第 15 天。
- phase：planning → resolving → planning／awaitingChoice／ending。resolving 是同步原子運算，UI 不可中途存部分狀態。
- 弟子使用不可變 ID；陣列順序、顯示排序不得改變先手權或亂數結果。
- 資源、傷勢、材料等以整數儲存；倍率用整數基點，計算最後才取整，範圍與捨入方式由 rules 統一。
- 派生數值由 selector 計算，避免保存過期戰力、突破率與風水快取。

## 3. 指令與時間契約

公開介面候選：`newWorld(seed, scenarioId)`、`dispatch(world, command)`、`advance(world, slots)`、`forecast(world, plan)`。全部回傳新值，不原地改輸入。

command 封套：`id`、`expectedRevision`、`type`、`payload`。成功結果含 `ok/state/events`；拒絕含 `ok:false/code/reason`，世界、RNG 與 revision 不變。重送已接受 id 回傳已處理結果，不重複扣款；過期 revision 明確拒絕，由 UI 刷新後重試。

類型：assignSlot、setDailyTemplate、queueBuild、cancelQueuedJob、queueCraft、queueBreakthrough、setDefense、chooseEvent。新局／匯入由 storage/app 層驗證後整體替換。除明確的事件選擇外，資源與成長只在 advance 結算；排隊本身不產生成果。

### 每格固定順序

1. 若待選事件或 ending，advance 不得執行；驗證剩餘情境長度。
2. 凍結格初狀態，從課表建立意圖；建築在本格完工要到下一格可使用。
3. 驗證角色、地塊、材料、支援者與工作位；依固定輪候規則分配（等待較久優先，其次穩定 ID），與輸入陣列順序無關。
4. 原子預約整批成本與所有參與者。某工作缺任一條件時全批拒絕，不扣任何材料；改為明示的休養備案。
5. 在同一凍結快照計算效果，按穩定 job ID 消耗 RNG；不可利用前一名角色本格產出支付另一工作。
6. 一次提交扣款、工作進度、完工、角色狀態與事件；刷新派生資訊，slotIndex/revision 遞增。
7. 到日末計算日報，到危機點轉 awaitingChoice。批次推進遇到待選事件立即停，不能越過。

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
