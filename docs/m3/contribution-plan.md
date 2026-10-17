# M3 協作與可認領任務

狀態：2026-10-17 的**規劃與認領規則**；[M3 追蹤 issue #18](https://github.com/lalagrass/earth-ascension/issues/18) 與 D1–D4 文件任務已建立，**尚未指派主筆，也不授權 M3 程式實作**。產品範圍與驗收以 [Creator Directions 提案](creator-briefs.md)為準；[組織演化](discovery.md)仍是備選，不與本輪混做。M2 的[未結驗收](../m2/implementation-review-retro.md)及[修復 PR 審核計畫](../m2/contribution-review-plan.md)先於 M3 開工。

## 認領與審核契約

1. [追蹤 issue #18](https://github.com/lalagrass/earth-ascension/issues/18) 下的 D1–D4 各有**獨立可驗收**的 issue；在每筆寫明「可認領：文件」、依賴、預計修改檔案、驗收與停止條件。任務代號不是自動指派，I1–I5 仍標「受阻：不得實作」，目前未開實作 issue。依賴關係須在 issue 中明列；若使用 GitHub 的子 issue／blocked by 功能，仍以文字說明原因。
2. Grok bot、Claude 或其他貢獻者先在 issue 留言認領，註明**實際主筆名稱**、單一 PR 範圍、預計碰的檔案與目前 `dev` SHA；確認無人重疊後才開分支／draft PR。兩個代理若共用 `lalagrass` GitHub 帳號，assignee 不能代表實際主筆，issue 留言與 PR 描述必須明寫「Grok bot／Claude／人類」及使用的工具。認領不是規格核准；主筆暫停時應在 issue 交代已做部分，讓維護者重新開放。
3. 每 issue 一位主筆、一個小 PR，PR 指向 `dev`。另一位貢獻者可唯讀複核，PO／Tech Lead 依[共用合併規則](../../CONTRIBUTING.md#審核合併與發布權限)直接處理已定範圍且證據齊全的文件 PR；需定玩法與契約的提案保持 draft 或等待產品決策。同一 GitHub 帳號下的自我留言不能冒充平台上的獨立核准。不要同時讓兩個 PR 改 `m2.py`、`store.py` 或同一存檔契約。
4. PR 描述要有 issue、主筆身份、base SHA、完成範圍、未做項目、版本／舊檔／固定 seed 影響、可重跑證據與未決決策。審核只給「可合併／須修改／等待產品決策」，附位置和反例；主筆更新後按新 head 重審。即使 CI 綠燈，行為、瀏覽器、遷移和多 seed 驗收仍按變更範圍補足。每次合併後，後續 PR 以新 `dev` 重跑受影響檢查。

認領留言可直接用：「主筆：Grok bot／Claude／人類；範圍：D1 等單一項目；預計檔案：…；依賴／待決策：…；base dev SHA：…；預計 PR：…」。開 draft PR 時回填連結；若需改動已被另一主筆認領的契約，先在兩筆 issue 說清先後順序。

## 現在可認領：只做文件或驗收設計

這四項互不替對方定產品規則；主筆提交的是可供決策的選項與證據。維護者最後把相容結論併回 [M3 提案](creator-briefs.md)。不得在這些 PR 夾帶 M3 程式、資料遷移或付費模型呼叫。

| 代號 | 單一 PR 的交付 | 完成判準／檔案邊界 |
|---|---|---|
| [D1 #19：開放方向驗收](https://github.com/lalagrass/earth-ascension/issues/19) | 方向語料的類別與標記準則、兩名盲評者 0–2 分規則、同方向不同人物及不同方向同人物的 fixture 設計；涵蓋不可驗證方向的正確暫緩。 | 描述至少 40 句開發語料與 10 句**由維護者另存、開發者未見**的確認語料如何抽樣、封存及評分；不在公開 repo 曝露確認題內容。只改 M3 驗收文件，不改引擎。 |
| [D2 #20：行動與證據盤點](https://github.com/lalagrass/earth-ascension/issues/20) | 逐一列現有研究、修習、交流、工作等行動可支持的假說、缺少的觀察能力及成本；提出兩個語義不同、可用有界規則檢驗的首批方向，並列無法支援者的明確原因。 | 用現有 `m2.py`、資料模型和事件來源佐證；不把通用 `practice_basis` 冒充「古武學」證據；新結果／功能只是提案，不能改世界規則。 |
| [D3 #21：操作與進度草圖](https://github.com/lalagrass/earth-ascension/issues/21) | 玩家輸入／撤回、角色採納／暫緩、進度、證據、100% 三種結果、歷史來源與既有功能前置的畫面流程。 | 清楚區分「完成工作百分比」與「證據可信度」；無檢驗方法時沒有假進度；含健康／生計優先及空狀態。只做草圖或文件，不改 UI 程式。 |
| [D4 #22：輸入與回放 RFC](https://github.com/lalagrass/earth-ascension/issues/22) | 比較 append-only 輸入修訂、共同月初快照、同月截止、規則／資料／RNG 版本和 M1／M2 舊檔路徑的方案。 | 依 [#10](https://github.com/lalagrass/earth-ascension/issues/10)、[#11](https://github.com/lalagrass/earth-ascension/issues/11) 列相容性與交易邊界；若前置 PR 未合併，只能交選項與待定點，不能宣稱契約已鎖或修改 `store.py`。 |

## 受阻：M2 收斂與 M3 範圍批准後才可開實作 PR

進入條件：#10／#11 的版本與輸入契約、[#2](https://github.com/lalagrass/earth-ascension/issues/2) 記憶、[#1／#8](https://github.com/lalagrass/earth-ascension/issues/8) 目標、[#4／#9](https://github.com/lalagrass/earth-ascension/issues/9) 計畫的修復 PR 經審核處置，M2 A1–A10 重驗並記錄剩餘風險；維護者確認 M3 首批可檢驗方向、結果與解鎖邊界。缺任一契約時只討論設計，不把下列項目改標為可實作。

| 代號／先決項 | 預計的單一 PR 邊界與驗收 |
|---|---|
| I1：方向輸入；依 D4、#10／#11 | 自己人物的輸入／修訂／撤回與交易邊界；重送、舊檔、月初 hash 和無輸入回歸。不可直接改世界事實。 |
| I2：角色提案；依 I1、D1／D2 | 無 LLM baseline 的候選問題、步驟及有理由暫緩；人格／經歷配對、有限情報、同月共同快照和 trace。不得所有方向只加同一研究權重。 |
| I3：研究專案；依 I2、D2 | 事前權重的工作進度、可檢驗題目證據、100% 支持／不支持／不足的裁定；重複無效行動不加進度，無規則方向不造假；新增功能另須產品批准及版本化規則。 |
| I4：Dashboard；依 I1–I3、D3 | 輸入、人物推測、計畫進度、證據和結果分欄，點到當時已知的事件；真實瀏覽器操作、歷史月、空／死亡人物及 M1 六頁回歸。 |
| I5：整合驗收；依 I1–I4 | 兩種可支援方向與不可支援方向的配對、30 seed×60 月回放、100 NPC 效能、M1／M2 舊檔及無方向基線；公布失敗 seed，未校準門檻不得事後改成通過。 |

## 維護者保留的決策

- M3 是否正式採「開放方向與角色自主探索」作首要主題；D1–D4 不等於開工授權。
- 首批兩個可檢驗方向、100% 結果裁定表、新功能的前置／成本／效果，及未知題目的正確暫緩語義。不能為了故事或進度滿格補造成功。
- 版本／遷移及固定 seed 契約；是否在測量無 LLM baseline 後另行批准零付費影子實驗。正式付費或全員 LLM 不在此 backlog。
