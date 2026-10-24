# Gemini：LP-16 美術與採藥視覺整合，兩小時整包交付

**此提示詞已完成、僅留沿革**：PR273／#271已整合，同8800是LP16。改用[LP17提示詞](LP17_GEMINI_PROMPT.md)／[工作包](LP17_HANDOFF.md)，不沿舊claim開工。擁有人已要求只留單一接受版，[單版本政策](VALIDATION_POLICY.md#單一正式試玩版本)覆蓋下段保留LP14文字。

完成條件／採用差異／白名單以 [正式工作包](LP16_HANDOFF.md)為準；流程依 [D31](PARALLEL_HANDOFF.md#d31單一主筆完整工作包與集中審查)，測試與清理只依 [VALIDATION_POLICY](VALIDATION_POLICY.md)。下段可直接貼；不是已啟動或代認領。

```text
你是 Gemini，接手 earth-ascension/sect-chronicle 的 #271／LP-16「美術與採藥視覺整合」。同一主筆完成局部素材、PixiJS 接線、必要文件與自校，一個 PR 集中 review，不把素材／動畫／接線拆給多個作者或逐張等簽核。

先讀根 CONTRIBUTING.md、兩層 AGENTS.md、#271／#184／#182 最新狀態，sect-chronicle/docs/LP16_HANDOFF.md、PARALLEL_HANDOFF.md 的 D31、VALIDATION_POLICY.md。看 dev 的 design/herb-life 與 design/art184-scene-trio 已接受圖稿和來源。

先核 LP16 文件 PR 已非作者接受、Earth 合 dev 且 postCI 成功；未完成就回報實際阻擋，不預作圖／素材或 runtime。PR267已合0403c10e，postCI39966426048五成功；PR270已合089eb39d，postCI39966737757五成功，引用即可，不重審／重畫舊設計。用自己的乾淨 worktree，保護原分支與未提交成果；從當時最新 dev 新 codex 短分支。在271本人新claim寫真實工具／身份、完整base SHA、branch、精確檔案、前置證據，claimed_at用GitHub created_at、expires_at為+4h UTC，重讀無重疊後開工。不沿259舊claim／branch，不碰他人checkout。

玩家目標：同一生活入口，一人採藥、另一人挑水；看人物在長路奔波，採摘、裝簍、負重背回、交藥更有質感。保留長挑水路與原腳力速度差，不能縮路、換倍率或改模型來偽造變強。

一次完成工作包 A–D：
A 藥圃現有土畦／植株／竹籬精修、補陶甕與靠放工具；保留兩層八份藥架，提升竹編／藥束／背簍辨識。採Grok的暖灰石、木竹、苔綠土色方向，重繪局部可用素材，並在長水路一段石階／路緣呼應，具體改善而非只濾鏡。保留路面、腳底與互動點可讀。
B 用原atlas與渲染層呈現採摘→裝簍→背回→交藥。Gather仍4秒，k前後換姿態；Deliver仍4秒，背簍空滿、前後遮擋與掛點合理。可按工作包的建議偏移微調適配原sprite，記最終值；不新增phase、全新手部骨架或全套人物動畫。
C 原水／藥坐標、路長、世界尺寸、速度／精力／成長／預約／入帳、兩人fixture與工作控制完全不改。效果只讀view／phase／k，暫停時新效果也停，不在render寫狀態／下令。1×同路同負重看初學熟手差；真交付tick才+1，HUD／名牌／小卡誠實同步。保留選人／跟隨、改工本趟後生效、停工及自主休息。
D 同一PR交可編輯來源、小素材、實際工具／prompt／使用權與採用差異，少量同條件前後真桌面圖，寫已驗／未驗與清理。不要拿原功能當新成果、概念圖當實裝。

Grok整張JPEG含畫死三人和新地勢，只作風格／構圖參考，不能鋪成地圖／atlas或縮成靜態人物。完整三層台地換位、村路／巡山、第三女孩AI、人物全套重製、新玩法、引擎遷移與手機本包延後。原圖生成使用條款未核，不自行宣稱CC0；本包優先原創向量／小素材，不採購、不加依賴。

可寫僅以experiments/water-carry/為根：demo/app.mjs（薄視覺接線）、demo/assets/lp16/**（素材／來源／必要局部renderer）、demo/assets/long-water/scenery.mjs（材質／裝飾，原stream／bridge幾何不變）、demo/style.css（必要採藥名牌／浮字）、本層README.md、design/lp16-integration/**（少量證據／差異）；checks/herb-check.js只有既有流程確需適配才局部改，不強制。完整限制讀工作包。
model.mjs／routes.mjs／water-layout.mjs／palm.mjs／index.html、template／spikes／舊圖稿、其他checks、PO文件、根依賴CI／Earth／小說與8800只讀。遇到真正必須越界的具體缺陷，原issue說明最小差異並停該部分，不為畫面擅改模型。

驗證只補變更JS語法／diff與一段桌面真操作：同一頁看採藥一趟／簍具／真+1，必要時同條件看熟手，短看長水路連續及跟隨，暫停核新動作停住、改令仍原語義。未變模型／路線／成長復用已有證據和當前必要CI，不本地再跑root／SG全套、全工作×人物矩陣、手機或seed，不寫存在性／常數／複製公式測試，不強建runner。有具體失敗才擴最小反例。
一般最多一頁／一臨時服務／一本地測試；重用同頁。測完先暫停、留少量證據，關自建頁／停自有程序／還原viewport並確認，不能把遊戲留跑等review，不碰8800或其他人資源。

新T0最多120min，100min後不加scope，達標早停；4h認領不延長執行窗。交完整review且無可做項即停；到時未完交draft、head／成果／缺口／證據，不自續輪、啟其他agent／聊天／排程或自合dev。

PR指dev，根模板寫實際Gemini身份、base/head、有效claim、A–D完成、檔案、少量圖／真流程／exit／限制、復用證據與清理，Refs #271／184／182／170。遊戲PO非作者集中review，你集中補修，非阻擋美化回backlog；Earth唯一queue squash／核postCI，最後遊戲PO才更新同8800並保留LP14。不要關184／182整體backlog。
```
