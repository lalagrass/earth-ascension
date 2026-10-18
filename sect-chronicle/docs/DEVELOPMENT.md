# 開發說明（SG-01 起）

本文件隨程式更新；只記錄已存在且已驗證的事。尚未實作的模組見 [TECHNICAL_DESIGN](TECHNICAL_DESIGN.md)。

## 執行測試

```sh
node --test sect-chronicle/test/*.test.js     # Node 24 不要用目錄參數
node sect-chronicle/tools/update-fixtures.js  # 僅在有意改版本時重產 fixture，並在 PR 說明差異
```

根目錄檢查（CONTRIBUTING／AGENTS 指定）：`python3 -m unittest discover -s tests -v`、`node --check earth_ascension/static/m2.js`、`git diff --check`。

## 模組載入策略

`js/rng.js` 與 `js/state.js` 是無框架的 UMD 風格腳本：

- Node：`require('./js/state.js')`（state 會自行 require rng）。
- 瀏覽器：依序以一般 `<script src="js/rng.js">`、`<script src="js/state.js">` 載入；API 掛在 `globalThis.SectChronicle.Rng`／`.State`。不需建置、不使用 ES module，`file://` 也能載入（儲存相容性另計，見技術設計）。

## 版本

| 項目 | 值 | 說明 |
|---|---|---|
| schemaVersion | 1 | 世界狀態欄位與驗證規則 |
| ruleVersion | 1 | **SG-01 暫定值**；SG-02 凍結正式數值時升版 |
| rngVersion | 1 | cyrb128 播種＋sfc32，丟棄前 15 筆；`nextInt` 為拒絕抽樣 |

## SG-01 提供的契約

- `newWorld(seed, scenarioId?, characterOptions?)` → `{ok:true,state}` 或 `{ok:false,code,reason}`；失敗不建立部分世界。`scenarioId` 預設 `slice-14`（42 格）。建局不消耗 RNG。
- `characterOptions` 為 `{templateId, allocation:{rootBone,comprehension,craft}, personality:{risk,bond}}`。**SG-01 只驗證結構與型別**，數值來自先宣告的暫定常數 `CHARACTER_OPTION_LIMITS`（三模板基底總和相同、自由配點 3、單項最終 1..6、`risk`＝cautious／bold、`bond`＝independent／caring）。SG-02 才凍結正式數值並升 ruleVersion。性格不改任何屬性或效率欄位。
- 狀態：師父（`disc-master`）與主角（`disc-protagonist`）兩人開局；候選 `cand-1`、`cand-2` 另存於 `candidates`，在接受前不在 `disciples`，不參與結算。`rosterAt(world, slotIndex)` 只回傳 `joinSlotIndex ≤ slotIndex` 的角色。
- `story`：`rescues`（援村紀錄）、`triggeredEventIds`、`invitations`（locked／invited／deferred／accepted 與 `joinSlotIndex`）、`organisationStatus`（dojo／sectFounded／foundingDeferred）、`defensePrepPoints`（守山備戰點，候選定義，待確認）。
- `phase`：planning、awaitingChoice、ending 可保存；`resolving` 為同步原子運算，不可保存。`slotIndex` 0..42；42 之後必須先 awaitingChoice（獸患待選），結算後才 ending，沒有第 43 格；立派／暫緩只能出現在 ending。
- `validateWorld` 對壞資料與未知版本回傳明確 `code`／`reason`／`path`，不修改輸入。所有數值必須是安全整數（拒絕小數、NaN、-0）。
- canonical：`canonicalize` 遞迴排序 key 的 JSON；`hashWorld` 為 SHA-256 十六進位（純 JS 實作，與 Node crypto 交叉核對）。`CANONICAL_EXCLUDED_FIELDS` 為空：不排除任何欄位，包含 `characterOptions` 與 `story`。
- 取整契約：倍率用基點（10000＝1.0），`mulBp(n, bp)` 全程 `Math.floor`，負數向下取整。
- `serializeState`／`parseState` 為純函式，不碰 localStorage（SG-07）。

## 不在 SG-01

規則表、指令、時段結算、建造／煉丹、復甦與援村流程、突破、危機、storage、UI。這些欄位（如 `tiles`、`jobs`）此時只驗證型別，內容契約由後續任務定義並升版本。

## fixture

`test/fixtures/new-world.json` 保存固定 seed＋角色設定的 canonical 字串、hash 與 rngState。改動 schema／ruleVersion／rngVersion 時 hash 必然改變；PR 必須逐項解釋原因，不可只換常數。
