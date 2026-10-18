# M2 修復貢獻與 PR 審核計畫

狀態：2026-10-18 的 PO 排程快照；基線 `dev` 為 `e3c4594b9222d59d853f588c5d6841e5ca712d4c`。動態認領、審查結論及阻擋以 GitHub issue／PR 為準；跨里程碑協調見 [PO 入口 #67](https://github.com/lalagrass/earth-ascension/issues/67)。本文件維護依賴與交接規則，不授權 M3 實作。審核基線見[事前 A1–A10](acceptance.md)、[實作回顧](implementation-review-retro.md)及[補測](../../artifacts/m2-acceptance-gaps.md)。

## 本輪審查與交接順序

下表是排程，不代表 PR 已通過。既有認領由原主筆繼續；共用 GitHub 帳號不能用 assignee 代替實際主筆身份。每次合併後重新核對最新 `dev`、剩餘 PR 的 head、同檔衝突與驗收。

| 順序 | 工作 | 交接條件 |
|---|---|---|
| 1：檢查基礎 | [#65／PR #66](https://github.com/lalagrass/earth-ascension/pull/66)：內嵌 JavaScript 語法檢查。 | 審查通過後先合入；後續 UI PR 更新基底，讓檢查涵蓋實際合併結果。 |
| 2：P1 操作與因果 | [#52／PR #57](https://github.com/lalagrass/earth-ascension/pull/57) 歷史返回現況；[#53／PR #58](https://github.com/lalagrass/earth-ascension/pull/58) 區分候選行動與所選行動的記憶影響。 | 與 #66 同列首批專用技術審查。實際操作歷史／現況、跨頁、人物選取及事件來源；#58 與 #50 的事件格式要協調。 |
| 3：UI 整合 | [#50](https://github.com/lalagrass/earth-ascension/pull/50)、[#51](https://github.com/lalagrass/earth-ascension/pull/51)、[#56](https://github.com/lalagrass/earth-ascension/pull/56)、[#61](https://github.com/lalagrass/earth-ascension/pull/61)、[#59](https://github.com/lalagrass/earth-ascension/pull/59)。 | 多份改同一 `index.html`／`m2.js`，依審查所得依賴逐份整合；#50／#58／#61 先核對共同格式函式。合入後回到 [#35](https://github.com/lalagrass/earth-ascension/issues/35) 跑玩家 60 月與歷史來源操作。 |
| 4：規則證據與產品選擇 | [#4／PR #43](https://github.com/lalagrass/earth-ascension/pull/43)、[#9／PR #41](https://github.com/lalagrass/earth-ascension/pull/41)、[#36／PR #45](https://github.com/lalagrass/earth-ascension/pull/45) 與 [#49](https://github.com/lalagrass/earth-ascension/pull/49)、[#37／PR #46](https://github.com/lalagrass/earth-ascension/pull/46)。 | 先核對量測與原始來源，再列技能、健康代價、組織／職業的選項。#49 在本快照的 head `85fcc57` CI 失敗，需原作者修正後重審。實驗文件合入不等於批准係數或新玩法。 |
| 5：契約與驗收收斂 | [#2](https://github.com/lalagrass/earth-ascension/issues/2)、[#1／#8](https://github.com/lalagrass/earth-ascension/issues/8)、[#4／#9](https://github.com/lalagrass/earth-ascension/issues/9)、[#10](https://github.com/lalagrass/earth-ascension/issues/10)、[#11](https://github.com/lalagrass/earth-ascension/issues/11)、[#6](https://github.com/lalagrass/earth-ascension/issues/6)、[#3](https://github.com/lalagrass/earth-ascension/issues/3)、[#12](https://github.com/lalagrass/earth-ascension/issues/12)。 | 各 issue 明列已合入與剩餘範圍；保留未定門檻、失敗 seed、存檔及效能風險。30 開發 seed 加 10 保留 seed、100 NPC×60 月、A1–A10 證據齊全後提 milestone 驗收。 |

已有進展：CI／golden（#14）、A5 年累積檢查（#13）、版本／RNG 拆分（#17）、人格顯示（#16）、記憶名額修復（#26）、目標休整／重審（#32）與輸入快照 RFC（#24）已合入；這些是各自範圍的交付。#11 儲存實作尚未完成；#2、#8 等仍須按剩餘驗收處置。#7／#5 等 issue 在逐項核對前也不因相關 PR 已合入而直接關閉。

版本方向先鎖一條原則：**舊 0.2.0 存檔不可被靜默改標為新規則續玩**。#10 第一個 PR 僅拆開版本識別與 RNG 流，維持現有 hash；後續真的改規則時，優先提出「來源唯讀、複製到新路徑、記錄來源 hash 與版本、明示遷移結果」的方案。若遷移尚未可驗證，就清楚拒絕跨規則續玩，仍保留舊快照查閱與原版本回放途徑。這個選擇需在 #10 後續 PR 以實際舊檔測試落實，不把多版本集合等同多版本規則引擎。

#11 的設計預設以追加式玩家輸入及明確生效月份為起點，讓已封存快照和 hash 保持不可變；RFC 要比較修訂鏈方案的操作與遷移成本，特別交代「當月建立人物後立即可見」與「下一月才參與決策」的 UI 語義。未定稿前不改 `store.py`，也不把 M1 既有行為默默改掉。

## 工作方式

1. Grok bot 與 Claude 各自從**最新 `dev`** 建短分支，對應一組不互相踩檔的 issue。Issue 裡的修法與新數值門檻是提案，PR 須先列出選用方案、被捨棄方案與相容性代價；不能把 issue 描述直接當核准規格。
2. 每個 PR 指向 `dev`，標出 issue、基準 SHA、改動檔案、影響的 A1–A10、規則／schema／RNG 版本是否變動、舊存檔處理、同 seed canonical hash 的預期差異，以及可重跑命令與原始／摘要結果。大規模規則調整與儲存格式改造分 PR。不要把 12 個 issue 塞成一次合併。
3. PO／Tech Lead 依 [合併規則](../../CONTRIBUTING.md#審核合併與發布權限)獨立 review：確認重現、差異範圍、隨機數與舊檔契約、樣本及混淆控制、M1 回歸、Chrome 關鍵路徑。阻擋項交作者改 PR；已定契約且證據齊全的修復可直接 squash merge 到 `dev`。未完成的候選門檻只標記未通過或待校準，不因 PR 改寫歷史基線。
4. 合併順序依契約與衝突面決定；每次合併後作者須重新基於最新 `dev` 跑受影響矩陣。審核者不直接在 `dev` 修作者的 issue；也不在 review 時替作者補一套未經比較的產品規則。

## 模組依賴與認領邊界

- `m2.py` 的記憶、目標及計畫修復依序整合；下一位作者可先準備唯讀分析。#1／#8 共用目標漏斗問題，#4／#9 共用計畫語義，避免重複實作。
- #10 第一階段已合入，後續規則版本、遷移與舊檔仍須逐份 PR 驗證；#11 的 RFC 已合入不代表不可變快照改造完成。#6 與 #11 不同時修改同一儲存契約。
- #3 先用分布與同機配對確認儲存／API 成本；是否成為 M2 發布阻擋須有實際需求與產品決策，不以新提案門檻強改格式。
- PO 負責優先序、驗收與決策整理；專用技術審查聊天按最新 head/base 給具體證據；原主筆在原 PR 修正。擁有人決定未定玩法、M3 實作、重大相容性取捨與 `main` 發布。
- [M3 文件審查](../m3/contribution-plan.md)可平行進行，I1–I5 仍受阻。新增認領先核對 issue 留言，本文不預先替 Grok bot、Claude 或其他作者接受任務。

原有問題的驗收語義仍保留：

- #1／#8 與 #4／#9：五類目標的進度、完成、停滯、備援行動與文字一致，轉換保留原因；30 seed 報每月分布與持續月數。60% 集中上限仍是待定提案，參照[目標延伸設計](goal-evolution.md)。
- #2：過期記憶不擠掉新重要事件，保留 event ID 追溯、自然事件 6／12 月與舊檔驗證；已合入名額修復不代替完整因果驗收。
- #5／#12：人格百分點與來源可追溯，不放大漂移來製造顯著性；A4 的 0／0 不算通過，A6 證據交代邏輯身份／RNG 鍵限制。
- #6：同鍵多來源事件不可覆蓋，含待寫 WAL 的來源指紋要可驗證，M1 原檔位元不變；事件 ID 與遷移仍需回放相容證據。

## 我方審核卡

每份 PR 結論只用「可合併／須修改／等待產品決策」；逐條附檔案位置與重現證據。最低檢查：

- 可重現：對照組為合併前 `dev`；測試固定 seed、同版兩次 hash、受影響的 30 seed×60 月，報 p50、範圍、失敗 seed 與完整判定，不只挑好看案例。規則變動時逐情境列明哪些 hash 預期改變、哪些可合法不變，核對原因與相容遷移；不能把「hash 沒變」一概當通過。
- 因果與公平：新事件引用存在、月份不越界；自然事件後 6／12 月反事實重算只證明規則因果，不能當真人行為。同步結算、邏輯身份交換與順序反轉都檢查；涉競爭改動須檢查贏家及非贏家。
- 存檔與介面：M1 0／12／60 月複本、M2 0.2.0 讀取／明確遷移、未知版拒絕、M1 六頁回歸；需改 UI 的 PR 用 Chrome 實際點來源、切歷史月、看空／已故狀態。
- 效能與成本：100 NPC×60 月 30 seed 同機配對，提供逐 seed 及異常重測分布、DB／API 大小；規則基線無 LLM、無付費呼叫。現有 3× 逐 seed 單次候選線在 seed 17 重測仍偶發超過，不得把它說成已通過。

## 合併與進入下一里程碑的門檻

優先解決 #2、#8／#1、#9／#4、#10／#11 的明確契約，再重跑 A1–A10。#3 是否屬 M2 release blocker 由實際儲存／操作需求決定；#5、#6、#7、#12 依相應 PR 證據逐條關閉。PR review 通過不等於 M2 已完整驗收；`implementation-review-retro.md` 的未決項需有處置與理由。M3 仍只有[規劃提案](../m3/README.md)，不因 M2 issue 開 PR 就自動開始。
