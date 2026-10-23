# Gemini下一包：LP-15完整採藥設計，兩小時集中交付

**本提示詞已完成，僅留沿革**：#267合dev `0403c10e`／postCI39966426048五成功，原#259設計不重做／不續舊claim。請貼[LP16新提示詞](LP16_GEMINI_PROMPT.md)，依[整合工作包](LP16_HANDOFF.md)處理下一包；下段不再是開工指令。

目標、H1–H4與A–D驗收只以[正式工作包](LP15_HANDOFF.md)為準；協作依[D31](PARALLEL_HANDOFF.md#d31單一主筆完整工作包與集中審查)，測試／清理依[VALIDATION_POLICY](VALIDATION_POLICY.md)。只先桌面，手機／平板排最後。下段可直接貼給Gemini；這份提示詞不代表已啟動或認領。

```text
你是Gemini，完整負責earth-ascension/sect-chronicle的下一包 #259／LP-15「採藥場景與動作質感」。同一主筆一次完成整包設計與必要文件，集中一個PR交review；不按畫面／動作／來源換人或逐張等批准。

先讀根CONTRIBUTING.md、根與sect-chronicle/AGENTS.md、#257／PR261／#259最新狀態、docs/LP15_HANDOFF.md、PARALLEL_HANDOFF.md的D31與VALIDATION_POLICY.md。

開工判斷：
- #257／PR261必須已非作者接受、Earth合dev及postCI成功。若尚未完成，你是原有效補修作者就先按原review／原期限補其最小桌面交付與如實證據，沿原PR，不重開2h、不擴runtime或重驗手機；若不是有效作者，只回報實際阻擋／接手狀態。不要提前畫LP15或預占259。
- 前置通過後，D29批准文件PR260及D30／測試政策已完成的部分引用既有紀錄，不重做。用自己的乾淨獨立worktree，保留原分支／未提交成果；最新dev、新codex短分支，例如codex/lp15-herb-design。在259新claim列實際主筆Gemini、完整base SHA、branch、下述範圍、前置證據與created_at＋4h UTC，確認沒有有效重疊作者。

一次交齊以下四組完成條件：
A 完整畫面：接受版LP14真場景／原人物與原坐標基線，桌面同鏡頭現況／改善對照，藥圃與藥架可分鏡。土圃、竹篩、工具與生活痕跡呼應長水路；保留人物可讀尺度與控制區，不能以新名字／矩形替身冒充接受版。一般構圖選擇自行決定並記理由。
B 動作：一組採摘→裝簍→背回→交藥四段分鏡，標腳底anchor、手簍掛點、前後遮擋、原phase／原時長與交付時點；復用角色辨識／atlas，分清空手負重。用同路同負重同倍率呈現初學／熟手，不能假造速度或新收益。
C 可採用來源：可編輯原稿、少量完整輸出、來源／作者／授權、實際生成工具／prompt／引用圖與限制，以及最小接線差異表（復用／新增圖層與幀、掛點、最低接線檔案）。不抽商業遊戲素材，不把概念全景說成可直接接的分層素材。
D 流程與誠實界線：以靜態分鏡或必要設計熱區說明兩人分工、採摘背回／交藥、路中改令與暫停跟隨；標清設計示意／合成／未連遊戲。靜態能說清就不建播放器；只有真的做互動頁才驗一段點選，有播放器才驗暫停／有限結束／重播。不能宣稱重新驗過真世界。

可寫：sect-chronicle/experiments/water-carry/design/herb-life/** 的圖稿、分鏡、可編輯來源、自有README／來源與必要設計頁。其他demo／assets／atlas／checks／共享README／模型路線／Earth／根CI依賴／小說／其他作者checkout與8800只讀。不改坐標、速度／精力／成長、產出／容量、預設工作或玩法；不重做已有採藥功能。

本包依H1–H4只授完整設計，尚未授runtime。A–C是內部步驟，可小commit／draft展示，不須逐步換人或新增文件PR；完整交稿後停止。後續選定採用差異才另列已批准的有限接線，不能在此prompt自動改demo。

驗證引用VALIDATION_POLICY：靜態實圖／來源檢查，有設計頁才變更JS語法及一段桌面操作；未變模型／root／SG結果與當前必要CI復用，不本地重跑全套、手機／seed矩陣或存在性自證。一般最多一個測試頁／一個臨時服務；完成、失敗或時間到都暫停並關閉自建頁／自有程序，還原viewport並確認，不碰8800／他人資源。

從LP15本人新T0最多120min，100min後不加scope，達標早停；4h認領不延長執行窗。完整交review無可做項即停，不等待湊滿2h；到時未完交draft／head／已做／缺口與證據，停止新工作，不自行續輪或啟其他agent／聊天／排程。

提交一個指dev的PR，根模板寫真作者、base/head、有效claim、修改檔案、A–D結果、少量圖／入口、真實測試摘要／限制與清理情況，Refs #259／#170／#184。由遊戲PO非作者集中review，同主筆集中補修；非阻擋美化留backlog，必要補修只驗差異。通過後交Earth唯一queue squash dev／核postCI，不自合併，不把自校冒充獨立review，不關182／184整體backlog或更新8800。
```
