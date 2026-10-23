# Gemini：LP-17 道館場景與雙人美術，兩小時整包交付

[正式工作包](LP17_HANDOFF.md)是驗收／採用／白名單唯一來源；沿 [D31](PARALLEL_HANDOFF.md#d31單一主筆完整工作包與集中審查)與 [VALIDATION_POLICY](VALIDATION_POLICY.md)。以下可直接貼，未代啟或認領。

```text
你是Gemini，接手earth-ascension內Sect Chronicle的 #274／LP-17「道館場景與雙人美術整合」。目標是同一可玩生活入口的整體場景與活動人物都更接近Grok D32，保留長通勤與原速度差。一位主筆完成新素材／烘焙／接線／必要文件，一個PR集中review，不拆成場景、人物、匯出三次交接，也不逐張等PO簽核。

先讀根CONTRIBUTING.md、兩層AGENTS.md、#274／184／182最新狀態、docs/LP17_HANDOFF.md、D31與VALIDATION_POLICY，以及design/art184-scene-trio圖稿／來源。LP16／PR273已合dev a363c7b，postCI39976283668五成功，是現可玩基線，不重做LP16。

先核本LP17文件已非作者接受／Earth合dev／postCI成功，再本人新claim。用自己乾淨worktree、當時最新dev新codex短分支，保護舊branch／未提交成果，不碰他人checkout。在274寫真身份與工具、完整base SHA、branch、精確範圍／前置、claimed_at用GitHub created_at、expires_at為+4h UTC；重讀無重疊再開工。不沿271舊租期，不預占其他包。

本批一起做：
1. 原位道館／院落重繪灰瓦、木柱窗格、石基／石院與少量生活細節；原紅白大色塊要有可辨的結構與材質改善，不只套濾鏡。
2. 院落到竹林坡路、溪橋泉眼的植被組團、石木與水岸材質連續，呼應Grok暖灰、木竹、苔綠土色。長路仍1700.9、藥路515.2、世界1600×1350；原座標／可走區／橋前後遮擋不動，不搬三層台地或新增捷徑。
3. 兩位活動小人重繪：圓潤少年主角藍衣紅結、努力但初學；瘦長少年熟手橄欖褐村衣、髮型與衣褶更有特色。要真正套在現有走路／負重／工作動作上，不只立繪／頭像，不把Grok圖裁下當靜態人物。沿現有id／UI稱呼，女孩／第三AI與canon不加入，升級不變瘦。
4. 沿原POSE／動作名／幀數／stride／fallback，用新外觀烘兩人sheet；衣袖與借用掌法手臂、桶簍色彩／掛點協調，LP16採摘裝簍照舊。原hero30幀／cousin27幀，共框190×214、腳底(90,184)、各自原hitbox與桶掛點契約保留，不截頭／掉幀／漂腳。不新增骨架、姿勢狀態／步頻或第二時鐘。

技術方向：復用現有SVG／Pixi與template/tools/bake.js；新painter、場景／人物輸出及manifest放demo/assets/lp17/**，runtime只讀新素材。若需要，為原bake加可選painter／out目錄或一個局部demo/tools/export-lp17.js，保持預設歷史行為與同一姿勢來源，不複製整套動畫引擎。原template/out與歷史design/source／spikes只讀。
背景已含道館／地面，props另y排序，替換前盤點；不可新舊雙屋頂／雙樹殘影、固定人或圖上不可走建築擋真路。Grok全景只作風格／構圖參考，不整張鋪地圖；優先原創重繪，不採購／加依賴或等待新圖像服務。兩小時不保證逐像素原畫筆觸，但不能把調色冒稱完整重繪。

白名單以experiments/water-carry為根：demo/app.mjs、demo/assets/lp17/**、demo/assets/long-water/scenery.mjs（僅材質／景物）、template/tools/bake.js（僅可選新painter／輸出及清理）、必要demo/tools/export-lp17.js、本層README.md、design/lp17-integration/**。其他模型／routes／water-layout／palm、HTML/CSS控制、template/actions.json／animator／walker／out、舊素材／checks／PO／Earth／小說／根CI與8800只讀。必要越界在原issue說明具體原因與最小差異，停該部分，不為畫面改規則。

完成以工作包A–D：整體場景有明顯重繪且路／人可讀；雙人新造型真套原動作、腳底工具穩；原長路／速度／精力／成長／真入帳與操作保留；可編輯來源、實際工具／使用權、少量同條件前後桌面圖／雙人細節與證據同PR交齊。一般美術選擇自行決定記理由，不再先交設計PR等另一人接。

驗證只檢變更JS／diff、匯出error、必要新sheet metadata／邊界與少量聯絡表，再同一桌面頁1×看兩人長路速度差／選人跟隨、新景段、原改工到採藥／真交付／暫停。慢段可加速等待，但標清楚，不能把4×說成1×節奏驗證。原模型／路線／選幀邏輯未改就復用既有證據和當前必要CI；不要再本地跑141／root全套、手機或seed，不造存在性／常數／複製公式測試／永久runner。
烘焙頁和遊戲頁依序重用／關閉，最多一頁、一臨時服務／一本地工作；成功／失敗／時間到都finally關自有browser／程序，測完先暫停並清理／還原viewport，不留頁跑等review，不碰8800與他人服務。

新T0最多120min，100min後不加scope，達標早停。未完交draft／head／真成果／缺口與證據，不自續輪／啟其他agent／聊天／排程。用根PR模板指dev，寫Gemini真身份、base/head、有效claim、A–D、修改清單、少量真圖／方法／exit／復用與清理，Refs #274／184／182／170。遊戲PO集中review，你集中補修；非阻擋美化回backlog，Earth唯一queue squash／核postCI，不能自合dev。

擁有人已取消試玩回退版本：只維持同一8800當前接受版，不做舊入口、版本選單、常駐舊快照／備份tar。工程接受／合dev／postCI後由遊戲PO更新並清舊部署副本；Git歷史、來源／作者branch／worktree與必要審查證據保留。你不操作8800，不關184／182母單。
```
