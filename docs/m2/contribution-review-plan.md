# M2 修復貢獻與 PR 審核計畫

狀態：2026-10-17 擬議協作契約，供 Grok bot、Claude 與維護者使用；尚未指派、開 PR 或更改 GitHub 保護規則。基線為 `dev` 的 `a5b72374c171f2dcb95de7a904c41bcd35f96f41`。本計畫只安排 M2 收尾與下一里程碑的規劃，不授權 M3 實作。審核基線見[事前 A1–A10](acceptance.md)、[實作回顧](implementation-review-retro.md)及[補測](../../artifacts/m2-acceptance-gaps.md)。

## 工作方式

1. Grok bot 與 Claude 各自從**最新 `dev`** 建短分支，對應一組不互相踩檔的 issue。Issue 裡的修法與新數值門檻是提案，PR 須先列出選用方案、被捨棄方案與相容性代價；不能把 issue 描述直接當核准規格。
2. 每個 PR 指向 `dev`，標出 issue、基準 SHA、改動檔案、影響的 A1–A10、規則／schema／RNG 版本是否變動、舊存檔處理、同 seed canonical hash 的預期差異，以及可重跑命令與原始／摘要結果。大規模規則調整與儲存格式改造分 PR。不要把 12 個 issue 塞成一次合併。
3. 我方先做唯讀獨立 review：確認重現、差異範圍、隨機數與舊檔契約、樣本及混淆控制、M1 回歸、Chrome 關鍵路徑。發現阻擋則要求作者改 PR；由維護者在證據齊全後決定合併。未完成的候選門檻只標記未通過或待校準，不因 PR 改寫歷史基線。
4. 合併順序依契約與衝突面決定；每次合併後作者須重新基於最新 `dev` 跑受影響矩陣。維護者不直接在 `dev` 修作者的 issue；也不在 review 時替作者補一套未經比較的產品規則。

## 建議分工與依賴

這是**建議**，不是宣稱 Grok 或 Claude 已接受指派。若兩者實際擅長領域相反，可對調姓名；模組所有權與合併順序保持。

| 順序／主筆 | Issue 與 PR 邊界 | 審核重點 |
|---|---|---|
| 0／Claude：相容契約 | [#10](https://github.com/lalagrass/earth-ascension/issues/10) 規則、schema、RNG namespace 拆分；[#11](https://github.com/lalagrass/earth-ascension/issues/11) 當月玩家輸入與快照 hash 語義**另開 PR**。 | 先鎖 0.2.0 讀取／回放與未知版拒絕；定義改版與遷移。#11 先選「修訂鏈」或「月初輸入」語義並呈現舊檔代價，不能只修改 hash 字串掩蓋歷史。這是後續改規則的前置。 |
| 1／Grok：人物目標 | [#1](https://github.com/lalagrass/earth-ascension/issues/1)／[#8](https://github.com/lalagrass/earth-ascension/issues/8) 為**同一目標漏斗 PR**；[#4](https://github.com/lalagrass/earth-ascension/issues/4)／[#9](https://github.com/lalagrass/earth-ascension/issues/9) 為目標語義與備援計畫 PR，可拆兩個可獨立驗收的小 PR。 | 五類目標的進度、完成、停滯及備援行動與文字一致；任何目標轉換保留原因；用 30 seed 報每月分布與持續月數。60% 集中上限只是 issue 提案，先看基線／候選分布與玩法取捨，再鎖線。 |
| 1／Claude：有效記憶 | [#2](https://github.com/lalagrass/earth-ascension/issues/2) 獨立 PR。 | 24 筆已過 12 月作用期的舊記憶不得擠掉新重要事件；需選擇衰減或歸檔策略、保留 event ID 追溯，並重跑自然事件 6／12 月與舊檔。此為目前 P0 阻擋。 |
| 2／Grok：觀察介面 | [#5](https://github.com/lalagrass/earth-ascension/issues/5) UI 可見性單獨 PR；[#12](https://github.com/lalagrass/earth-ascension/issues/12) 的 A5 年限、A4 指標與剩餘 Chrome 項用證據 PR 補齊。#12 的 CI 子項由 #7 的 PR 驗收。 | 人格百分點變化與事件來源在真實 Chrome 可點；不能為顯著而放大人格漂移。A6 身份交換已有條件式 30 對證據，但需說清邏輯身份／RNG 鍵的限制。A4 的 0／0 不能寫成達標。 |
| 2／Claude：遷移正確性 | [#6](https://github.com/lalagrass/earth-ascension/issues/6) 分出重複舊事件映射、含待寫 WAL 的來源指紋等可測正確性修補；與 #10／#11 分支順序協調。 | 同鍵多來源不覆蓋；遷移後仍可追溯；M1 原檔位元不變；任何事件 ID 策略要證明與回放相容。 |
| 3／任一作者：效能與流程 | [#3](https://github.com/lalagrass/earth-ascension/issues/3) 先提出儲存／API 設計及遷移基準，是否實作另決；[#7](https://github.com/lalagrass/earth-ascension/issues/7) 最小 CI／PR 模板可獨立先行。 | #3 不以單一 seed 或新 1.2× 提案強行改格式；保留行動序列、歷史查詢與 0.2.0 讀取。CI 從現有測試、JS 語法與固定 seed 回放開始，跨 Python 版本另列實測證據。分支保護由維護者決定。 |

## 我方審核卡

每份 PR 結論只用「可合併／須修改／等待產品決策」；逐條附檔案位置與重現證據。最低檢查：

- 可重現：對照組為合併前 `dev`；測試固定 seed、同版兩次 hash、受影響的 30 seed×60 月，報 p50、範圍、失敗 seed 與完整判定，不只挑好看案例。規則變動時逐情境列明哪些 hash 預期改變、哪些可合法不變，核對原因與相容遷移；不能把「hash 沒變」一概當通過。
- 因果與公平：新事件引用存在、月份不越界；自然事件後 6／12 月反事實重算只證明規則因果，不能當真人行為。同步結算、邏輯身份交換與順序反轉都檢查；涉競爭改動須檢查贏家及非贏家。
- 存檔與介面：M1 0／12／60 月複本、M2 0.2.0 讀取／明確遷移、未知版拒絕、M1 六頁回歸；需改 UI 的 PR 用 Chrome 實際點來源、切歷史月、看空／已故狀態。
- 效能與成本：100 NPC×60 月 30 seed 同機配對，提供逐 seed 及異常重測分布、DB／API 大小；規則基線無 LLM、無付費呼叫。現有 3× 逐 seed 單次候選線在 seed 17 重測仍偶發超過，不得把它說成已通過。

## 合併與進入下一里程碑的門檻

優先解決 #2、#8／#1、#9／#4、#10／#11 的明確契約，再重跑 A1–A10。#3 是否屬 M2 release blocker 由實際儲存／操作需求決定；#5、#6、#7、#12 依相應 PR 證據逐條關閉。PR review 通過不等於 M2 已完整驗收；`implementation-review-retro.md` 的未決項需有處置與理由。M3 僅有[探索提案](../m3/discovery.md)，不因 M2 issue 開 PR 就自動開始。
