# solo-sect 文件庫索引（Doc Sitemap）

歡迎查閱 `solo-sect`（山門紀）文件體系。本文件庫依照開源標準分為三大區塊：

---

## 1. 常青設計規格（`docs/architecture/` & `docs/systems/`）
隨遊戲最新版本持續更新的權威規格與規則解說：
* [`architecture/MODULES.md`](architecture/MODULES.md)：`src/` 19 個模組的職責、依賴現況與 loop144 前舊檔名對照。
* [`architecture/DESIGN.md`](architecture/DESIGN.md)：架構原則（純資料＋純函式＋單一權威狀態）、Smart Object 設施系統、效用 AI，以及 v0.1–v1.0 各版設計紀錄。
* [`architecture/PROTAGONIST.md`](architecture/PROTAGONIST.md)：傳奇角色與自創主角開局設定、初始同門搭檔。
* [`architecture/PATROL-MAP.md`](architecture/PATROL-MAP.md)：巡山路線、S0-S5 距離波次與後山戰鬥圖。
* [`architecture/ASSETS.md`](architecture/ASSETS.md)：立繪資產提示詞與水彩素材來源。
* [`systems/growth-layers.md`](systems/growth-layers.md)：實力／門類造詣／個別武學三層防膨脹成長模型。
* [`systems/neigong-rework.md`](systems/neigong-rework.md)：真氣護體、十重突破、品階難度與逆催規則。
* [`systems/evaluations/`](systems/evaluations/)：競品調研（暴走英雄壇、大俠立志傳）之借鑑與取捨分析。

---

## 2. 決策庫與驗收矩陣（`docs/decisions/` & 根目錄）
不可變的架構決策與驗收狀態：
* [`decisions/DECISIONS.md`](decisions/DECISIONS.md)：**全域決策唯一事實來源（SSOT）**，涵蓋 250+ 條決策、理由與影響反例。
* [`../FEATURES.md`](../FEATURES.md)：全功能驗收矩陣，記載玩家短流程與自動化測試紀錄。
* [`../ROADMAP.md`](../ROADMAP.md)：目前版本、進行中里程碑與待擁有人決定。舊路線圖見 [`reports/milestones/`](reports/milestones/)。
* [`plans/NEXT-MILESTONES.md`](plans/NEXT-MILESTONES.md)：下一階段提案（武無第二、少跑測試），含開源資料查證與交接提示詞（#401）。

---

## 3. 歷史時點快照（`docs/reports/`）
封存特定版本的大規模驗收、平衡跑測與審查紀錄（僅供歷史稽核）：
* [`reports/balance/`](reports/balance/)：歷次平衡跑測報告（v146 ～ v210）。
* [`reports/milestones/`](reports/milestones/)：歷次里程碑交付紀錄與舊版進度檔。
* [`reports/reviews/`](reports/reviews/)：過往跨模組走查、美術審查與工作室評估筆記。

---

## 4. AI 開發規範
* [`../loop/AGENTS-DOC-GUIDE.md`](../loop/AGENTS-DOC-GUIDE.md)：引導 Grok、Gemini、Claude 等自主循環代理人的文件落檔協議。
