# 開發說明（SG-01／SG-02）

本文件隨程式更新；只記錄已存在且已驗證的事。尚未實作的模組見 [TECHNICAL_DESIGN](TECHNICAL_DESIGN.md)。

## 執行測試

```sh
node --test sect-chronicle/test/*.test.js     # Node 24 不要用目錄參數
node sect-chronicle/tools/update-fixtures.js  # 僅在有意改版本時重產 fixture，並在 PR 說明差異
```

根目錄檢查（CONTRIBUTING／AGENTS 指定）：`python3 -m unittest discover -s tests -v`、`node --check earth_ascension/static/m2.js`、`git diff --check`。

## 模組載入策略

`js/rng.js`、`js/rules.js` 與 `js/state.js` 是無框架的 UMD 風格腳本：

- Node：`require('./js/state.js')`（state 會自行 require rng 與 rules；`rules.js` 是葉節點，不 require 任何模組，因此沒有 state↔rules 循環）。
- 瀏覽器：依序以一般 `<script src="js/rng.js">`、`<script src="js/rules.js">`、`<script src="js/state.js">` 載入；API 掛在 `globalThis.SectChronicle.Rng`／`.Rules`／`.State`。漏載 `rules.js` 時 `state.js` 會丟出明確錯誤。不需建置、不使用 ES module，`file://` 也能載入（儲存相容性另計，見技術設計）。

## 版本

| 項目 | 值 | 說明 |
|---|---|---|
| schemaVersion | 1 | 世界狀態欄位與驗證規則 |
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

## 尚未實作（SG-03 起）

指令、時段結算、建造／煉丹的 runtime、復甦與援村流程、突破、危機、storage、UI、事件資料（SG-02A）。這些欄位（如 `tiles`、`jobs`）此時只驗證型別，內容契約由後續任務定義並視需要升版本。

## fixture

`test/fixtures/new-world.json` 保存固定 seed＋角色設定的 canonical 字串、hash 與 rngState。改動 schema／ruleVersion／rngVersion 時 hash 必然改變；PR 必須逐項解釋原因，不可只換常數。SG-02 升到 ruleVersion 2 時，7 個 hash 全部改變，唯一差異是 `ruleVersion` 欄位；`test/fixtures/new-world.v1.json` 保存 SG-01 的歷史 golden（永不重產），測試逐案證明差異只有這個欄位、rngState 不變。
