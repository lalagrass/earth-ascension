# RT-02V：唯讀生活viewer交接

追蹤[#129](https://github.com/lalagrass/earth-ascension/issues/129)，最新狀態以issue為準。此檔是已批准範圍／可認領交接，不代表viewer已實作。

## 狀態與批准來源

專案擁有人於2026-10-19在遊戲PO聊天明確選擇 **「先做 viewer（建議）」**，採用#110的唯讀生活viewer前移；Codex遊戲PO轉錄。只改交付順序，不改D9 P1–P4、R1–R4、版本或玩法。新順序：**RT-02 → RT-02V觀察版 → RT-03存讀／因果資料 → RT-04完整介入UI → RT-05完整生活試玩**。

前置RT-02 #107／PR #108已完成：受審head `90d7c0094f9d6effd49bdba4760411d333a16d59` squash合dev **`0875d116e774cf2b53c6c36d160465b460302b1d`**；[postCI39161730112](https://github.com/lalagrass/earth-ascension/actions/runs/39161730112)五jobs成功，merge tree `a8864fcd09e87fe5944c3ad8e3bd424d730c0d08` 與受審內容一致。遊戲PO已讀本SHA的CI日誌，Python各53、Node各322。#107已結案。

**產品已批准；實作開工只待本次排程／交接文件PR合dev且postCI通過。** 文件由Codex遊戲PO主筆；viewer實作依擁有人最新指示保持開放待認領：Grok額度用盡，不再指定Grok，也不啟動或指派其他agent。作者先登記真實身份／新鮮base／實際檔案；不重問P1–P4或viewer順序。

## 本包目的

從正式新局看見師父與主角自行移動、採集、建造、修行、休養、援村與收徒，能指出誰在哪、正在做什麼、進度及等待原因。讓擁有人先觀察生活節奏；這是可操作播放的**觀察版**，沒有存讀或手動改工作，不宣稱完整RT-04／05或樂趣／平衡驗收完成。

## 任務與檔案邊界

| Task | 交付 | 驗收重點 |
|---|---|---|
| V-01 正式引擎接線與畫面 | 5×5地圖＋村口、人物身分／位置、旅行與工作進度、體力／心境／修為、庫存／設施、事件與現有等待／fallback原因 | 只讀正式世界；選取人物只改UI；不另算產出、編故事原因或讀未來RNG |
| V-02 播放控制器 | seed與開局安穩發展政策／目標可見，按開始確認；暫停／繼續、1／2／4倍；背景自動暫停、回前景仍暫停 | 1×每秒4tick；只用Realtime.createWorld／advanceTicks等公開API；breakthroughResolved只結束API批次，正確續推剩餘量；不離線補算 |
| V-03 真實瀏覽器交接 | localhost啟動命令、真實操作／截圖／console／seed／政策／head／環境／時長／失敗紀錄，更新已交付入口文件 | 正式新局走2700tick含2520跨界；暫停／背景／純render零世界進度，工作／恢復／無效果等待可區分 |

建議新增`sect-chronicle/viewer/index.html`、必要`controller.js`、`view.js`、樣式，以及有必要的controller測試；少量檔案即可，不強迫全塞HTML。無框架、無build、無付費或遠端資產。透過既有UMD依賴順序載入`../js/`，不要複製引擎。實際模組命名可按現況細化，認領時登記。

本包不改`js/realtime.js`、`autonomy.js`、`rules.js`的結算／schema／RNG，不做#117的kernel搬移。若發現引擎缺陷，用具體反例另拆修復，不在viewer補發成果。

「唯讀」指不提供遊戲指令編輯：不改主角工作／目標／政策，不回應詢問、不手動收徒；播放仍經正式API推世界，render不直接寫世界。開局顯示並確認現有安穩發展預設，不做完整模板配點／政策編輯器。pendingEvents若有資料，只讀呈現；詢問照既有逾期流程處理。介面明示觀察版無保存、重新整理會重開；不做localStorage／匯入／匯出或假存檔按鈕。

## DoD

- [ ] 無參數localhost入口可開，從seed建立正式RT新局；安穩發展初始政策／目標在開始前可見並由開始操作確認。主要控制可用鍵盤。
- [ ] 人物位置、工作／旅行工量、庫存、設施、事件均對應同一正式world；同名角色仍可辨識。若做視覺插值只改畫面，不改pos／path／工時。
- [ ] 1/2/4倍只影響控制器餵tick；相同tick序列下world hash／rng一致。pause、render／選取不推tick／工作／資源／RNG。背景暫停清掉待補的牆鐘時間，回前景維持暫停；恢復不追趕離線時長。
- [ ] breakthroughResolved正確接續剩餘tick，不多算、不遺漏、不永久停播；error不繼續推進並顯示可核對錯誤，不偽裝成功。
- [ ] 既有原因碼／fallback／autonomy.wait可讀；剛完成待下一tick決策可顯示「待決策」，不直接替角色安排工作，不暗中休養。
- [ ] 一個固定seed安穩發展以真實瀏覽器從正式入口走完整2700tick，包含移動、工作、援村／收徒、恢復與2520跨界；記錄實際發生與未驗項，不以debug注入finished世界冒充操作。其他政策呈現可用正式引擎產生的狀態做局部測試，不要求本包新增政策編輯器。
- [ ] 相關controller／顯示驗證及真實瀏覽器操作通過，必要CI成功；未改引擎的20seed矩陣／歷史golden證據可復用，不把每個UI動作展成完整矩陣。
- [ ] README／DEVELOPMENT記真實啟動方式及觀察版限制，附head／base／版本、採用與捨棄方案、證據摘要及完整log位置。一個小PR→dev；遊戲PO審查，Earth PO合dev／postCI後才接後續包。

## 成本、排除與協作

日常先相關測試，必要3／5seed冒煙；不追測試項數／突變數或重複矩陣。根CI仍依當時已合規則執行，不自行套用#113 skip提案。若碰時間／schema／結算，回到高風險完整適用驗收；完整stdout落/tmp或artifact，只報命令、exit、head/base、seed／政策／時長、瀏覽器及失敗。

不做RT-03瀏覽器保存／因果預估、不做RT-04工作／目標／事件選擇與完整開局UI、不宣稱RT-05／SG-13真人試玩完成。不做戰鬥、巡山、安全區、輕功、人格AI／八卦、生活能力成長、第二境、28天或付費模型；#75／#104–106／#116–122不增加前置或schema。

Claude #128只做架構Stage A三份文件；保護其`docs/architecture/PORTFOLIO_BOUNDARIES.md`、`sect-chronicle/docs/ARCHITECTURE.md`、`novel-chronicle/docs/TECHNICAL_DESIGN.md`，不等待其設計才做viewer，也不在驗收中替換核心引擎。小說與Earth另案，不互相指派實作。viewer控制器／畫面日後給RT-04沿用，RT-03儲存不依賴viewer DOM。

## 可貼給下一位coding agent的接手prompt

> 沿#93認領本RT-02V #129開放工作包，明寫你實際使用的agent身份；Grok額度用盡，不假稱接續中的Grok或另一位主筆已啟動。先讀根／遊戲AGENTS、CONTRIBUTING、testing-policy、D10與RT02V_HANDOFF、本issue，以及#107／PR #108完成紀錄。使用者已明確選「先做 viewer」，D9 P1–P4不重問。先確認排程／交接文件PR已合最新dev且postCI成功；若仍pending，維持Ready-after-dependency並回報具體PR／CI，不做依賴程式或重問產品批准；不要強制重設任何工作區。保護原作者worktree與未提交修改，從最新dev建codex/rt-02v-life-viewer，登記真實身份、base、檔案。只交V-01～03：正式新局／5×5地圖與角色工作觀察、seed及安穩發展設定可見確認、D9暫停／1/2/4倍與背景暫停、事件與既有原因展示；控制器只呼叫公開API、render純讀，breakthroughResolved續推剩餘tick，不離線補算。不要改引擎、複製規則、造產出、加存檔／手動工作編輯或架構搬移。用真實瀏覽器由正式入口觀察固定seed2700tick與控制器邊界，相關測試優先、未改引擎證據復用，必要CI保留，完整輸出落檔只報摘要，不追項數／突變數。避開Claude #128三份設計文件，架構提案不阻擋viewer。交單一小PR→dev，附真實啟動命令、版本、head/base、瀏覽器／截圖／失敗與觀察版限制；遊戲PO審查、Earth PO整合／postCI，不自行合併或派其他agent。前置完成後開始本已授權小包，不只交計畫。
