# Milestone 與 task backlog

狀態：D1–D5 與 SG-01～SG-12 已於 2026-10-18 獲專案擁有人批准；SG-00 文件整合已由 Codex 認領 [#69](https://github.com/lalagrass/earth-ascension/issues/69)；SG-01 起尚未指派主筆，未完成任一實作 task。前綴 SG 避免與主專案 M1–M3 混淆。以下路徑皆相對 `sect-chronicle/`。

## 授權與實際狀態

- SG-00：產品決策已完成；最新 dev 基底與文件主筆已登記於 #69；文件合併及遊戲工作區交接仍依 #69 的完成證據判定，不以本表自動宣稱 SG-M0 完成。
- SG-01～12：範圍已授權；尚未認領，依賴未完成的任務為 Waiting dependency，非 Waiting product approval。
- SG-13：真人試玩待安排；SG-M3 只有工程部分 11～12 在本次批准範圍，不能在無真人資料時宣稱 M3 完成。
- SG-14～17／SG-M4～M5：未授權；真人試玩後另行判定，不得先做 28 天內容。
- [雙 agent 接手計畫](PARALLEL_HANDOFF.md) 定義 Earth／遊戲兩個專案的隔離，並不代表已有主筆認領；遊戲由一位 agent 依序接手，Gemini 本輪不參與。

## Milestone gates

| Milestone | 可展示成果 | 進入條件 | 退出條件 |
|---|---|---|---|
| SG-M0 範圍確認 | 本文件包、決策紀錄、issue 範圍 | 本次使用者文件指派 | SG-00 完成，D1–D5 已確認，依賴與主筆明確 |
| SG-M1 可測的經營骨架 | CLI 走完 42 格，四人採集／修行／建造／煉丹 | M0 | SG-01–04；必要設施、工作位、材料競爭與回放通過 |
| SG-M2 可玩垂直切片 | 14 天、有 UI、有突破、有結局、能續玩 | M1 | SG-05–10；新局→生產→突破→迎戰→結局完整可玩 |
| SG-M3 可理解與可靠 | 新手能看懂缺口，異常存檔不丟進度 | M2 | SG-11–13；所有 P1 缺陷解決，真人試玩紀錄完成 |
| SG-M4 28 天 MVP | 更長培養、兩種突破、三結局 | M3 試玩支持繼續、產品明確批准擴充 | SG-14–17；平衡、回放、真人與發布候選證據齊全 |
| SG-M5 後續產品化 | 手機體驗、內容與美術擴充 | MVP 複玩意願支持且另行批准 | 本輪不拆實作，避免把遠期願望當承諾 |

M1/M2 是遊戲引擎開發順序，不能解讀為主專案同名 milestone。每個 milestone 都可停下試玩，不必等 M4 才展示。

## 任務表

估量 S≈半日至一日、M≈一至兩日、L≈兩至三日的有效工程工作；只是切分尺度，不是 agent 執行時間承諾。超過 L 拆子 issue。所有測試證據均待執行。

| ID／工作 | 依賴 | 建議主筆角色／估量 | 修改檔案邊界 | 完成判準 |
|---|---|---|---|---|
| SG-00 確認產品與建立追蹤 | 無 | PO＋維護者／S | 本包 docs、issue 草稿 | 記錄 D1–D5 的決策者、日期、理由；核對最新 dev；每 issue 主筆、base SHA、檔案、DoD 明確；未批准者保持 Blocked |
| SG-01 專案骨架、schema、RNG | 00 | 引擎／M | js/state.js、rng.js；test/state、rng；開發說明 | Node 可載入；版本化新局與驗證；拒絕壞資料；固定 RNG 向量；canonical hash 定義與首份 fixture |
| SG-02 資料與五行規則 | 01 | 系統設計／M | js/rules.js；test/rules；docs/RULES.md（新增） | 列全成本／產出／工期／容量／修行／心境／突破公式與取整；五行四鄰計算；資料描述均有效果或明確純敘事；開局供應可達首丹房 |
| SG-03 指令、日課與時段結算 | 02 | 引擎／L | js/commands.js、engine.js；test/commands、engine | 新值回傳；失敗不改世界／RNG；重送不重扣；輪候與凍結快照；兩人搶最後材料不負庫存；單步與批次相同 |
| SG-04 建造、煉丹與 CLI 切片 | 03 | 引擎／M | js/engine.js；test/production；tools/smoke.js（新增） | 無丹房不能煉丹；工期、工作位、材料皆生效；完工次格可用；CLI 42 格含首爐丹，輸出種子與摘要 |
| SG-05 培養、支援與突破 | 04 | 引擎／M | js/progression.js、engine.js；test/progression | 修為上限、心境與傷勢可恢復；突破占格；丹與支援原子預約；恰好足夠材料也有加成；成功／失敗均有因果事件 |
| SG-06 危機與切片結局 | 05 | 戰鬥系統／M | js/combat.js、rules.js、engine.js；test/combat | 預告、選陣、一次結算；第 42 格後停止；低能力照常失敗結局；戰報可核對各項貢獻 |
| SG-07 存檔／讀檔／新局 | 04 | 儲存／M | js/storage.js；test/storage | 獨立 key；所有版本檢查；保留備份；quota 不假報成功；未知與損壞檔可匯出；fresh seed 正確；續玩 RNG 相同 |
| SG-08 因果 view 與預估 | 05、06 | view／M | js/view.js、forecast.js；test/view、forecast | 日課缺口、工作位等待、風水分項與日報；預覽無副作用；確定情境等於結算，隨機情境標明假設 |
| SG-09 最小可玩 UI | 06、07、08 | 前端／L | index.html、style.css、js/ui.js、art.js | 四角色三格日課、5×5 地圖、工程、倍率、事件、結局與存讀；初次無參數載入可玩；鍵盤可完成主要流程 |
| SG-10 完整切片整合 | 09 | QA／M | test/integration；tools/ui-smoke（新增）、docs/PLAYTEST_LOG.md（新增） | 用實際 UI 完成一局；保存重載；檢查單步／快轉；console 無錯；記錄環境、操作與截圖，不只呼叫 debug API |
| SG-11 新手引導與資訊收斂 | 10 | UX／M | js/view.js、ui.js、style.css | 只呈現當前目標與主要缺口；細節可展開；無材料／無位／排程失效有原因；新玩家能找到下一步 |
| SG-12 邊界回歸與穩定化 | 11 | QA＋引擎／M | test、tools；缺陷對應單一模組 | AC-C01–C10 全過；異常資料、重送、排序、倍率、續玩覆蓋；P1 為零；任何修復附反例 |
| SG-13 第一輪真人試玩 | 12 | PO／M | docs/PLAYTEST_LOG.md、DECISIONS_AND_SOURCES.md | 3–5 人觀察與問題分級；記錄完成時間、決策與複玩意願；提出繼續／縮減／重做結論；不以機器人代替真人 |
| SG-14 28 天內容與規則擴充 | 13＋擴充批准 | 系統設計／L | js/rules.js、progression.js、combat.js；相關 test | 最多六人、三境界、兩種突破、三功法、三結局；延長情境到 84 格；保存版本影響先寫清；不混入外交／戰棋 |
| SG-15 多策略平衡實驗 | 14 | 數值／M | tools/balance.js、docs/BALANCE.md（新增） | 至少六策略、配對 100 seed；報效應差、失敗例與置信區間；保留原門檻與未達結果；不改規則湊結論 |
| SG-16 第二輪試玩與內容修訂 | 15 | UX＋內容／M | 內容、view、docs/PLAYTEST_LOG.md | 驗證 28 天節奏與兩條不同有效路線；解決主要可理解性問題；修數值需回跑受影響實驗 |
| SG-17 發布候選交付 | 16 | Tech Lead／S | README、docs/RELEASE_CHECKLIST.md（新增）、打包工具 | 乾淨 checkout 可啟動；依賴／授權清楚；完整證據與已知問題；維護者判定是否發布，不能自行推 main 或部署 |

## 排程與衝突

關鍵路徑：00 → 01 → 02 → 03 → 04 → 05 → 06 → 08 → 09 → 10 → 11 → 12 → 13。

SG-07 可在 SG-04 後與 05/06 分開開發，但必須依賴已合併的 schema；跨模組契約由 Tech Lead 同步。03–06 都涉及 engine.js，必須串行，不讓多位主筆同時修改。09 不得自行加規則，缺契約回到對應 issue。若多 agent 獲准分工，使用短分支／worktree 與獨立主筆身份，不能用同帳號自我批准冒充獨立 review。

## Issue 可複製格式

標題：`[SG-XX] 任務名`

- 實際主筆／認領狀態：未認領（認領時填真實 agent 身份）。
- Base dev SHA：認領時核對並填入；不得沿用規劃 HEAD 冒充最新 dev。
- 產品決策與依賴：列 D 編號、前置 issue／PR。
- 目的、範圍、預計檔案：複製任務表並細化。
- DoD 與驗證：列 AC 編號、最小反例與實際命令。
- 不在本 issue：列容易混入的相鄰功能。
- 停止條件：依賴未合併、契約未定、需修改另一主筆檔案時先協調。
- PR 指向 dev，採根目錄模板；完成後回填證據與下個可開始的任務。
