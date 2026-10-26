# FEATURES.md：codex/solo-sect-grok（山門紀 solo-sect）

| 項目 | 內容 |
|---|---|
| 實際主筆／工具 | Grok Bot（executor 子代理），在 box 上用 Shell、git、node、headless Chrome＋playwright-core 撰寫；commit 作者顯示為 lalagrass。設計決定由擁有人 Yuying Chen 拍板（見 ROADMAP §5／§9.5／§11.6 等）。 |
| branch | `codex/solo-sect-grok`（單人分支：不開 PR、不併 dev、不碰 8800） |
| base dev SHA | `fb847663cef54717d9ff4a77f34841b1f1e5abdb`（與 `origin/dev` 的 merge-base，2026-10-25 04:34 台北時間；目前 origin/dev＝`148cfbb`） |
| head SHA | `77e1b2d6bb654a0a0ee4fce12651855501c63b43`（v1.4 各列的證據）；**v1.45 各列（SS-EXP-RETURN、SS-EVENT-TIERS、SS-EXP-STRIP、SS-STATUS）的證據在 v1.45 commit**（訊息 `v1.45: …`，SHA 見 PROGRESS.md v1.45 段／`git log`），artifact 在 [`artifacts/features/v145/`](artifacts/features/v145/README.md) |
| 啟動命令與入口 | 在 repo 根目錄執行 `python3 -m http.server`，開 `http://localhost:8000/solo-sect/index.html`（要用 http，不能用 file://）；入口 `index.html` → `src/main.mjs`；新局畫面在 `src/start-ui.mjs`。測試：在 `solo-sect/` 下跑 `node --test test/`。 |
| 環境版本（實際執行） | node v20.19.2、npm 11.21.1、Google Chrome 156.0.8078.47（headless）、playwright-core 1.59.1；沒有 package.json，也沒有外部相依。 |

Artifact 目錄：[`artifacts/features/77e1b2d/`](artifacts/features/77e1b2d/README.md)
- 全套測試：[`test-full.log`](artifacts/features/77e1b2d/test-full.log)，**193 項全部通過，0 失敗**（約 12 秒）。
- UI 玩家流程：腳本 [`flow-ui-expedition-save.mjs`](artifacts/features/77e1b2d/flow-ui-expedition-save.mjs)，輸出 [`flow-ui.log`](artifacts/features/77e1b2d/flow-ui.log)／[`flow-ui-result.json`](artifacts/features/77e1b2d/flow-ui-result.json)，**7/7 PASS**，截圖 [`flow-report.png`](artifacts/features/77e1b2d/flow-report.png)。
- 舊檔 fixture：`test/fixtures/v0.5…v0.92.json`。golden：`test/fixtures/golden-30d.txt`。

**狀態判定說明（請先讀）**
- `shots/` 的截圖幾乎都是 `shoot.mjs` 直接改狀態（給資源、跳時間、塞事件）後拍的，**只能算展示證據，不算玩家流程**。
- 「驗證＝通過（單元）」：同一 head 的 `node --test` 有直接呼叫模型的正反測試，**但沒有 UI 玩家流程**，所以狀態最多標「已接線」。
- 只有附了 UI 點擊流程、反例和可見證據的項目才標「已驗證」，而且只限該流程實際走過的範圍。
- 瀏覽器新局的種子是 `Date.now()`（`src/main.mjs:29`），UI 流程**無法固定種子**。所以 UI 流程只檢查結構，不檢查數值。

## 一、共同 Feature ID（各分支都會有的基礎系統）
> 註：正式 repo 還沒有共同 ID 表可以對照，下面的 `COM-*` 是本分支先定的名稱，之後可以改成對應的共同 ID。

| Feature ID | 設計來源 | 玩家短流程 | 狀態 | 驗證 | 實作檔案 | 測試命令與結果檔 | 截圖/錄影 | 已知缺口 |
|---|---|---|---|---|---|---|---|---|
| COM-START | PROTAGONIST.md；ROADMAP §5 | 新局 → 經典人物分頁 → 選郭靖 → 選同門 → 開山立派 | 已驗證 | 通過（UI 流程，限郭靖＋預設同門） | src/start-ui.mjs, src/hero.mjs, src/hero-data.mjs | `node --test test/v096.test.mjs`；flow-ui.log 步驟 1 | flow-ui.log；shots/v135-01（腳本） | 自創主角和其他 5 位經典人物沒跑 UI 流程（只有單元測試）；自創主角沒有專屬立繪 |
| COM-SAVE-MIGRATE | ROADMAP §5；PROGRESS v0.95 | 讀入舊版存檔 → 自動逐版遷移 → 續玩 | 已接線 | **77e1b2d：失敗**（P2-2 未來規則版本被改標；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元：每版都有 fixture 遷移測試）） | src/save.mjs | `node --test test/`（v095/v098/v100…v140 的遷移項）；test-full.log | 無 | 0.92 以後沒有實體 fixture 檔，是用程式產生舊形狀；沒有降版（新存檔不能給舊版讀） |
| COM-SAVE-SLOTS | PROGRESS v0.98 | 存檔 → 重整 → 讀檔；自動存檔 3 格；匯出／匯入 JSON | 已驗證（限手動存讀） | **77e1b2d：失敗**（存檔 alert 阻斷（review 未能完成往返）；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（UI：手動存→重整→讀，時間與人數一致）；自動存檔、匯出入只跑了單元） | src/slice.mjs, src/main.mjs | `node --test test/v098.test.mjs`；flow-ui.log 步驟 6 | flow-ui.log | 反例只有「讀回時間不一致就 FAIL」，沒有做壞檔匯入的 UI 反例；自動存檔按實際時間每秒檢查 |
| COM-DETERMINISM | ROADMAP §5；PROGRESS v0.95 | （開發者）同一種子跑 30 日 → 比對雜湊 | 已接線 | 通過（golden） | src/sim.mjs, src/util.mjs | `node --test test/v095.test.mjs`；`UPDATE_GOLDEN=1` 會重產；test-full.log | 無 | UI 用 Date.now 當種子，玩家沒辦法重播；規則有意改變時 golden 會重產（v0.96–v1.4 都重產過） |
| COM-MUL | PROGRESS v0.95 | 看弟子面板的「練功倍率＝天賦×狀態×外部」 | 已接線 | 通過（單元＋隨機性質測試） | src/mul.mjs | `node --test test/v095.test.mjs` | 無 | 作息是管線外的閘門 |
| COM-MIND | ROADMAP §3.1–3.3；v0.6–v0.7 | 弟子自主行動 → 面板看性格、心情、想法、決策理由 | 已接線 | 通過（單元） | src/mind.mjs, src/sim.mjs, src/social.mjs | `node --test test/sim.test.mjs` | shots/v07-*（腳本） | 樂天＋順境時心情容易接近 99；沒有長期試玩 |
| COM-SOCIAL | v0.7；ROADMAP §1B | 人際面板：好感、相容、鼓勵、道侶 | 已接線 | 通過（單元） | src/social.mjs, src/sim.mjs | `node --test test/sim.test.mjs` | shots/v07-*（腳本） | 同門默契上限 25%（設計如此） |
| COM-ECON-BUILD | ROADMAP §7.2–7.4；v0.8 | 點建造 → 料堆搬運 → 動工、可暫停；雇工；邀入外門；收支 | 已接線 | **77e1b2d：失敗**（P1-1 倉庫雙重預留、P2-1 煮飯耗力；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元）） | src/sim.mjs, src/data.mjs, src/main.mjs | `node --test test/v08.test.mjs` | shots/v08-*（腳本） | 平衡偏快（約 5 日到 S2）；院內路線沒有碰撞 |
| COM-RANKS | v0.85 | 職司／優先度；切磋考核升內門；首徒 | 已接線 | 通過（單元） | src/sim.mjs | `node --test test/v085.test.mjs` | shots/v085-*（腳本） | — |
| COM-UNLOCK | PROGRESS v0.98 | 新局 → 正常加速遊玩 → 巡山面板在約 406 秒（遊戲時間，晨課試煉完成）開放 | 已驗證（限巡山面板） | 通過（UI 流程步驟 2；單元：解鎖單調、10 分鐘內必開） | src/slice.mjs | `node --test test/v098.test.mjs`；flow-ui.log | flow-ui.log | 其他面板的解鎖時點沒用 UI 流程驗；UI 流程裡有自動按「略過導引」 |

## 二、分支獨有項（solo-sect）
| Feature ID | 設計來源 | 玩家短流程 | 狀態 | 驗證 | 實作檔案 | 測試命令與結果檔 | 截圖/錄影 | 已知缺口 |
|---|---|---|---|---|---|---|---|---|
| SS-HUNT | v0.5–v0.7 | 狩獵面板勾人 → 上山 3 波 → 野豬下山 | 已接線 | 通過（單元） | src/sim.mjs | `node --test test/sim.test.mjs` | shots/v05-*（腳本） | 野豬下山修正過族群上限 |
| SS-ARTS | ROADMAP §9；v0.9 | 練功 → 熟練 → 求學 → 武學圖 | 已接線 | 通過（單元） | src/arts.mjs, src/data.mjs | `node --test test/v09.test.mjs` | shots/v09-*（腳本） | 自動求學只限主修系；一次只排一門 |
| SS-ARTS-TIER | ROADMAP §11；v0.92 | 三招依階解鎖、瓶頸打坐衝關、歸真、大成變式 | 已接線 | 通過（單元） | src/arts.mjs | `node --test test/v092.test.mjs` | shots/v092-*（腳本） | 歸真沒有跟著 v1.2 調整 |
| SS-EXP-DISPATCH | ROADMAP §15；v0.95 | 巡山面板 → 勾 0 人按派遣（被擋）→ 勾 2 人派遣 → 背景戰鬥 → 戰報 | **已驗證** | 通過（UI 流程步驟 3–5：0 人跳「派 1–4 人」、沒有出巡；2 人出巡，約 142 秒遊戲時間後出戰報） | src/expedition.mjs, src/main.mjs | `node --test test/v095.test.mjs`；flow-ui.log | artifacts/.../flow-report.png；shots/v095-*（腳本） | 中途不能召回（沒有取消，只有撤退線和心情、體力、耐性歸零會自動回頭）；遭遇戰是批次公式，沒有地圖演出 |
| SS-EXP-STYLE | ROADMAP §15.8；v0.97 | 派遣面板看隊伍風格（性格多數決）→ 戰報顯示閃避、追擊、清場率 | 已接線 | 通過（單元；UI 流程戰報看得到「清場」風格） | src/expedition.mjs | `node --test test/v097.test.mjs` | flow-report.png；shots/v097-*（腳本） | — |
| SS-EXP-DEEP | ROADMAP §15；v1.0–v1.2 | 目標選「不設限」→ 斷崖、古洞、絕頂 → 無盡段每重 ×1.18、回一口真氣 | 已接線 | 通過（單元模擬：招牌武學隊可過第 4 重；一般武學止於 1600 內） | src/expedition.mjs, src/v10.mjs | `node --test test/v100.test.mjs test/v110.test.mjs test/v120.test.mjs` | shots/v100-01、v120-03（腳本） | 「練滿隊到第 7 重、約 3000 步」只在開發模擬看過，沒有長期試玩；平衡報告還沒跑 |
| SS-EXP-CAMP-ORDER | v1.0 | 過第三／第五段設營 → 從營地出發；巡山令強制風格 | 已接線 | 通過（單元） | src/expedition.mjs, src/main.mjs | `node --test test/v100.test.mjs` | shots/v100-02（腳本） | — |
| SS-CODEX | v0.95 | 敵人圖鑑：照面、交手累積觀破值 | 已接線 | 通過（單元；UI 流程戰報後圖鑑有更新，但沒有斷言） | src/expedition.mjs | `node --test test/v095.test.mjs` | shots/v095-03（腳本） | — |
| SS-MANUAL | v1.0 | 殘頁湊秘笈 → 指定弟子研讀 | 已接線 | 通過（單元） | src/v10.mjs | `node --test test/v100.test.mjs` | shots/v100-02（腳本） | — |
| SS-TASTE-AMBITION | REVIEW；v1.0 | 喜好合菜單加心情；志向達成得特質 | 已接線 | **77e1b2d：失敗**（外觀「愛喝undefined」；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元）） | src/v10.mjs | `node --test test/v100.test.mjs` | 無 | — |
| SS-MAP-READ | REVIEW；v1.0 | 地圖：鏡頭拉近、單一狀態圖示、庫存堆 | 已接線（顯示真實狀態，沒有指令） | 通過（單元：圖示優先序）；畫面未驗證 | src/main.mjs | `node --test test/v100.test.mjs` | shots/v100-03（腳本） | 動作沒有逐幀動畫 |
| SS-PACE-CH1 | v0.95／v0.98 | 第 1 日野豬試煉 → 前三日里程碑 → 第一章三目標 → 章節總結 | 已接線 | 通過（單元） | src/slice.mjs, src/sim.mjs | `node --test test/v095.test.mjs test/v098.test.mjs` | shots/v098-03（腳本） | 只有第一章 |
| SS-AUDIO | v0.98 | 事件音效、環境音、靜音 | 已接線 | 未跑（瀏覽器出聲沒有測；單元只測事件推導） | src/audio.mjs | `node --test test/v098.test.mjs` | 無 | 要先點一次按鈕才會啟動 |
| SS-HERO-VALUES | PROTAGONIST.md；v0.96 | 自動駕駛照價值觀行動；違心（最多 3 層）；抉擇卡詢問或自動 | 已接線 | 通過（單元） | src/hero.mjs | `node --test test/v096.test.mjs` | shots/v096-*（腳本） | — |
| SS-COMPANION | 擁有人 t100u；v0.96 | 開局同門 2–3 選 1（郭靖可選黃蓉） | 已接線 | 通過（單元）；UI 流程有點黃蓉卡，但沒有斷言她入隊 | src/start-ui.mjs, src/hero-data.mjs | `node --test test/v096.test.mjs` | shots/v096-*（腳本） | — |
| SS-TEMPLATE-RULES | ROADMAP §17；v0.97 | 韋小寶溜走、黃蓉香火錢、阿星瀕死覺醒 | 已接線 | 通過（單元） | src/expedition.mjs, src/hero.mjs | `node --test test/v097.test.mjs` | shots/v097-03（腳本） | — |
| SS-WUXIA | v1.1 | 名俠奇遇卡 → 收／婉拒（冷卻 3 日）；洪七公食誘傳降龍 | 已接線 | **77e1b2d：失敗**（P1-2 名俠離開未清任務；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元）） | src/wuxia.mjs | `node --test test/v110.test.mjs` | shots/v110-*（腳本） | 只有部分名俠能入門 |
| SS-HUASHAN | v1.2 | 岳不群紫霞九層、辟邪三卡、嵩山施壓；令狐沖、風清揚、獨孤九劍 | 已接線 | **77e1b2d：失敗**（P1-2 逐出令狐沖未清任務；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元）） | src/huashan.mjs | `node --test test/v120.test.mjs` | shots/v120-*（腳本） | 不是岳不群局時，辟邪不會交給林平之；嵩山襲擊沿用野豬襲擊；吸星大法、易筋經沒做 |
| SS-JIANGHU | v1.3 | 楊過、小龍女、周伯通、東方不敗、火雲邪神、海大富、《功夫》隱藏高手；喜劇卡、晨課令（可關） | 已接線 | 通過（單元） | src/jianghu.mjs | `node --test test/v130.test.mjs` | shots/v130-*（腳本） | 數值沒經過長期試玩 |
| SS-SECT | ROADMAP §18；擁有人 t103u；v1.35 | 主角＝門派 → 匾額、旗 → 門規、禁學、外門 ×0.7、師門質疑卡 → 鎮派設施 | 已接線 | 通過（單元） | src/sect.mjs, src/sect-data.mjs | `node --test test/v135.test.mjs` | shots/v135-*（腳本） | 設施只有一級；自創主角「多一格自選設施」沒做；門規條件簡化 |
| SS-SECT-FEUD | v1.35 | 巡山第 2、4… 道關由宿敵把守（強 15%），打贏加門派聲望 | 已接線 | 通過（單元）；UI 流程戰報出現「鐵掌幫高手（狼王）」 | src/sect.mjs, src/expedition.mjs | `node --test test/v135.test.mjs` | flow-report.png | **宿敵守關沿用原守關敵的圖和數值底（只改名稱與強度）** |
| SS-GEN-MARRY-ADOPT | ROADMAP §5（只收養、不生育）；v1.4 | 道侶＋雙向相容 → 成親 → 收養卡 → 孩童 6 歲入門 | 已接線 | 通過（單元） | src/gen.mjs | `node --test test/v140.test.mjs` | shots/v140-01（腳本） | **收養卡只在沒有孩子時才出現**（不能收第二個） |
| SS-GEN-AGE | v1.4 | 孩子每 3 日長 1 歲，14 歲成年換立繪；成人每 28 日長 1 歲 | 孩童已接線；成人年齡＝展示 | 通過（單元，只測孩童） | src/gen.mjs | `node --test test/v140.test.mjs` | shots/v140-01（腳本） | **成人年齡只有顯示**，不影響數值、不會老化 |
| SS-GEN-LINEAGE | v1.4 | 拜師 → 師父大成以上武學練 ×1.2 | 已接線 | 通過（單元） | src/gen.mjs, src/mul.mjs | `node --test test/v140.test.mjs` | shots/v140-02（腳本） | — |
| SS-GEN-SUCCEED | PROTAGONIST.md；v1.4 | 主角化境 → 「傳位退隱」 → 繼承人接掌 → 世代 +1、宿慧 +1 | 已接線 | **77e1b2d：失敗**（P1-3 一般傳人卡片 TypeError；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元）） | src/gen.mjs, src/main.mjs | `node --test test/v140.test.mjs` | shots/v140-02、v140-03（腳本） | **繼承人沒有自己的主線劇情**；傳位不能撤回 |
| SS-SUHUI | PROTAGONIST.md；v1.4 | 宿慧點數存在 localStorage → 自創新局點數 +（上限 +3） | 已接線 | 通過（單元） | src/gen.mjs, src/start-ui.mjs | `node --test test/v140.test.mjs` | shots/v140-03（腳本） | 宿慧不在存檔裡（跨局、跟著瀏覽器）；付費取得延後到 Production（ROADMAP §16） |
| SS-EXPEL | v1.35 列名單；v1.4 真移除 | 逐出抉擇 → 弟子離開（清好感、關係、家庭、隊伍） | 已接線 | **77e1b2d：失敗**（P1-2 移出未清任務；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元，含「不能移掌門」反例）） | src/gen.mjs | `node --test test/v140.test.mjs` | 無 | 逐出不能撤回 |
| SS-EXP-RETURN | ADOPTION-PLAN A1；擁有人核准數值（每段 −6 耐力、見底才掉一半、不受傷）；v1.45 | 巡山令「溜走」派出 → 帶戰利品回程 → 每經過一段未清段扣耐力 6 → 戰報「🐾 返程驚獸」 | 已驗證（限溜走帶寶回程、耐力未見底） | 通過（UI：v145 flow 步驟 4–5，實況 2 段 −12）；掉一半戰利品、無寶不引獸、清場 0 損耗、平靖段不算：只有單元 | src/expedition.mjs（returnPlan/returnStep/unclearedSegs）, src/data.mjs EXP.retSta/retLoss, src/main.mjs 戰報卡 | `node --test test/v145.test.mjs`（A1 五項）；[test-full.log](artifacts/features/v145/test-full.log)；[flow-ui.log](artifacts/features/v145/flow-ui.log) | shots/v145-02-return-raid-report.png（真實點擊流程） | UI 沒走到「耐力見底丟寶」；地圖上沒有獸群追趕畫面（v1.55 新地圖再做）；召回仍無（移到 v1.5） |
| SS-EVENT-TIERS | ADOPTION-PLAN A3；v1.45 | 事件依關鍵字分三級：C＝人物頭上氣泡、B＝地圖右側竹簡（點一下推鏡＋捲到弟子卡）、A＝暫停＋推鏡＋「知道了，繼續」 | 已驗證（A 級暫停、B 級點擊推鏡） | 通過（UI：A 級大事 0.4 秒內時間不動；點竹簡 → 弟子卡捲入視窗）；C 級氣泡只有單元（UI 沒斷言氣泡畫面） | src/events.mjs, src/util.mjs log(), src/main.mjs feed()/bubble()/focusOn(), style.css | `node --test test/v145.test.mjs`（A3 三項）；flow-ui.log | shots/v145-01（竹簡）、shots/v145-03（竹簡＋推鏡後）、artifacts/features/v145/top-alert.png（若該次有出現）；皆真實點擊流程 | 分級靠訊息關鍵字（`TOP_RX/MID_RX`），會有誤判（例：「重傷倒地」算 A 級，可能太吵）；A 級沒有關閉開關；推鏡只在人物在院內時有效 |
| SS-EXP-STRIP | ADOPTION-PLAN A3＋A16 里程軸；v1.45 | 巡山中面板顯示每段 ✔已清／⚠未清／▶進行中／·未到；地圖頂端進度條同步標 ✔⚠ | 已驗證 | 通過（UI：巡山中 ≥7 段標記可見）；狀態判定有單元 | src/expedition.mjs milestones(), src/main.mjs expBar()/巡山面板 | `node --test test/v145.test.mjs`（里程軸）；flow-ui.log 步驟 3 | shots/v145-01-patrol-strip-feed.png（真實點擊流程） | 無盡段只在走到時才列出；⚠ 的提示只在滑鼠 title |
| SS-STATUS | ADOPTION-PLAN A5；v1.45 | 弟子卡最上方三行：現在／原因／下一步＋決策層標籤（指令／巡山／生理／作息／性格） | 已驗證（限顯示存在且三行齊） | 通過（UI：點竹簡後該弟子卡含三行）；層級判定有單元 | src/status.mjs, src/main.mjs 弟子卡 | `node --test test/v145.test.mjs`（A5）；flow-ui.log 步驟 7 | shots/v145-03-status-panel.png（真實點擊流程） | 層級用 reason 文字推斷（例：「灶上該煮飯了」被標成「性格」而非「作息」）；「下一步」取評分第二名，不保證真的會做；待命時 reason 會殘留舊文字（截圖可見「名俠入門」） |
| SS-BALANCE-LONG | ROADMAP §19：排在 v1.46（v1.45 規則上的基準線） | 長時間自動試玩 → 平衡報告 | 已接線（v1.46 基準、v1.75 第二輪已跑） | **通過（不變式）**：35/35 跑完 30 日、0 違反（`artifacts/v146-baseline/longrun.log`、`longrun-results.json`；報告 `BALANCE-BASELINE-v146.md`）。限：腳本玩家只用一般指令、固定種子；平衡結論見報告，未做真人試玩；v1.75 第二輪：同腳本同矩陣 35/35 跑完、零不變式違反；對照見 BALANCE-REPORT-v175.md、artifacts/v175/ | — | — | — | 還沒做（等擁有人點頭） |
| SS-PROD | ROADMAP §16 | 版權、平台、付費點數、手機 | 規劃 | 未跑 | — | — | — | 刻意延後 |

### v1.5 新模擬核心（ROADMAP §19）
| Feature ID | 設計來源 | 玩家短流程 | 狀態 | 驗證 | 實作檔案 | 測試命令與結果檔 | 截圖/錄影 | 已知缺口 |
|---|---|---|---|---|---|---|---|---|
| SS-CORE-REGISTRY | ROADMAP §19 v1.5；DESIGN-REVIEW §3 | 新設施只加資料：階段宣告 offers/beds/slots，登錄表推出容量與時長 | 已接線 | 通過（單元） | src/core.mjs, src/data.mjs | `node --test test/v150.test.mjs` | — | 活動廣告需求（`ad`）欄位已預留但打分仍在 scoreActs，未改成純資料驅動 |
| SS-CORE-RESV | v1.5 | 床位、灶位、菜畦、切磋/聊天夥伴走同一張 s.resv；床滿打地鋪 | 已接線 | 通過（單元＋10 日每拍不變式＋長跑 smoke 9/9） | src/core.mjs, src/sim.mjs, src/lifecycle.mjs | `test/v150.test.mjs`；`artifacts/v150/longrun-smoke.json` | — | 倉庫料仍由 whReserved 從任務推得（沒搬進 s.resv）；vegRes 仍是計數器；「物資總量守恆」不變式未做 |
| SS-CORE-TOIL | v1.5 | 工序清單 stepsOf；搬料途中取消不瞬移，料拿在手上走回院倉 | 已接線 | 通過（單元） | src/core.mjs, src/lifecycle.mjs | `test/v150.test.mjs` | shots/v150-status.png（實玩） | 工序仍由 phase 推導，不是逐步執行的 step 物件；撤銷（undo）未做 |
| SS-CORE-NEEDS | v1.5 | 精力 ≤30 想睡、到 80 才起；休閒/聊天/採藥/鼓勵做完 60 秒內 ×0.3 | 已接線 | 通過（單元） | src/core.mjs, src/sim.mjs | `test/v150.test.mjs` | — | 只有精力有遲滯；飢餓沿用舊門檻 |
| SS-EXP-RECALL | v1.5（A2） | 巡山面板按「召回」→ 從目前距離回程、戰利品保留 | **已驗證** | 通過（單元＋瀏覽器實玩點擊 5/5） | src/expedition.mjs, src/main.mjs | `artifacts/v150/flow-v150.mjs` → `flow-v150-result.json` | shots/v150-exp-out.png、shots/v150-exp-recall.png（實玩） | 距離仍抽象（v1.55 才上地圖） |
| SS-STATUS-V150 | v1.5 | 弟子卡「現在／原因／下一步」：層級讀 d.decision；下一步＝目前任務排著的工序 | 已驗證 | 通過（單元＋實玩） | src/status.mjs | `test/v150.test.mjs`、`test/v145.test.mjs` | shots/v150-status.png（實玩） | — |

### v1.55a 同圖延伸：世界與鏡頭（PATROL-MAP-SAMEMAP-v155.md 混合案；擁有人 t135u「照建議」）
| Feature ID | 設計來源 | 玩家短流程 | 狀態 | 驗證 | 實作檔案 | 測試命令與結果檔 | 截圖/錄影 | 已知缺口 |
|---|---|---|---|---|---|---|---|---|
| SS-WORLD-CAM | SAMEMAP §2.4；v1.55a | 拖曳地圖往右上捲 → 被邊界擋（門派＋已揭露環＋一圈）；出發只跳紙條、點紙條才跟隨；按「回山門」回門派全景 | 已驗證（限拖曳邊界、紙條跟隨、回山門） | 通過（單元＋瀏覽器實點 11/11；反例：未巡山拖不出第一環、出發不自動跟隨） | src/world.mjs camBounds/clampCam, src/main.mjs | `node --test test/v155a.test.mjs`；`artifacts/v155a/flow-v155a.mjs` → `flow-v155a-result.json` | shots/v155a-01-home.png、02-drag-bound、05-depart-toast、06-follow | 「已揭露」暫用清場紀錄／本趟走到的環推算，迷霧 bit 在 v1.55c；縮放只有滾輪連續縮放，三段 LOD 未做 |
| SS-WORLD-CHUNK | SAMEMAP §2.2；v1.55a | 世界 6400×4800、門派在左下；256px 區塊第一次進視窗才畫進離屏 canvas | 已接線 | 通過（單元：同座標同畫；無頭 Chrome 縮到 0.5 約 60fps、143 塊快取） | src/world.mjs paintChunk/chunksInView, src/main.mjs | `test/v155a.test.mjs`；flow 第 5 步 | shots/v155a-03-world-rings.png | 地形只是各環色塊＋點狀雜訊（tile 美術在 v1.55b/c）；fps 是無頭參考值，非 1440×900 桌機實測 |
| SS-ENEMY-MERGE | DESIGN-REVIEW §2.5；v1.55a | 家裡狩獵／獸襲與巡山共用 ENEMIES；MONSTERS 只是帶 home 欄位者的檢視；每種敵人標所屬環 | 已接線 | 通過（單元：數值與舊表逐欄相同；核心雜湊不變） | src/data.mjs | `test/v155a.test.mjs` | — | 家裡仍只有山鼠、野豬兩種 |
| SS-RING-POP | SAMEMAP §2.6/§3；v1.55a | 7 環各有族群數，地圖巢點顯示「某環巢・N」；巡山擊倒扣該環，定時無亂數回補 | 已接線 | 通過（單元＋實跑巡山：扣掉數＝擊倒數） | src/world.mjs popStep/popKill, src/expedition.mjs, src/sim.mjs | `test/v155a.test.mjs` | shots/v155a-03、04 | 族群還不影響遭遇率與獸襲頻率（刻意：保持模擬結果不變） |
| SS-RAID-DESCENT | SAMEMAP §2.6；v1.55a | 獸襲到點前 20 秒，野豬從山腳巢點沿山徑走到 den，到點後照舊從 den 進菜園 | 已接線 | 通過（單元；瀏覽器流程把 raidT 推到到點前 10 秒後拍到，屬改狀態展示） | src/world.mjs raidDescent, src/main.mjs | `test/v155a.test.mjs`；flow 第 6–7 步 | shots/v155a-04-raid-descent.png | 下山段只是演出（由 raidT 推算、不存檔）；溢出觸發、其他環下山要等族群接進模擬 |

### v1.55b 山徑、山腳／林地素材、固定怪點、召回走回（擁有人 t136u「continue till 1.75」）
| Feature ID | 設計來源 | 玩家短流程 | 狀態 | 驗證 | 實作檔案 | 測試命令與結果檔 | 截圖/錄影 | 已知缺口 |
|---|---|---|---|---|---|---|---|---|
| SS-TRAIL | SAMEMAP §2.5；v1.55b | 派出 → 點紙條跟隨 → 隊員沿彎曲黃土山徑從 den 連續走出（無轉場），位置＝dist 在山徑上的點 | 已驗證（限山腳→林地） | 通過（單元：半徑＝dist×PX、所在環＝模擬段、山徑連續；瀏覽器實點 7/7） | src/world.mjs TRAIL/trailAt/partyPos, src/main.mjs | `node --test test/v155b.test.mjs`；`artifacts/v155b/flow-v155b.mjs` → `flow-v155b-result.json` | shots/v155b-01-walk-out.png | 遠處山徑角度變化大，取樣點間距最多約 160px（仍連續）；外 5 環要等 v1.55c 素材 |
| SS-TILES-FOOT-WOOD | v1.55b | 山腳：地面紋理＋草叢、石頭；林地：深綠＋松、竹 | 已接線 | 通過（單元：有圖貼素材、無圖退色塊、同座標同畫） | src/world.mjs paintChunk | `test/v155b.test.mjs` | shots/v155b-03-wood-ring.png | 用既有 ground/grass/pine/bamboo 素材程序拼貼，非手繪 tile；樹不跨區塊（區塊邊會略空） |
| SS-SPOTS-FIGHT | SAMEMAP §2.5；v1.55b | 山腳、林地有固定怪點（含段尾守關）；隊伍走到 → 停下 → 2.5 秒戰鬥演出（⚔ 名稱・擊倒／閃過／逃了）→ 怪點打 ✕ | 已驗證（限演出出現、怪點標記） | 通過（單元：怪點 dist＝模擬遭遇 dist，實跑遭遇都落在怪點；瀏覽器看到演出） | src/world.mjs SPOTS, src/main.mjs fightWatch | 同上 | shots/v155b-02-fight-anim.png | 怪點上畫的種類只是展示，實際對手仍由模擬亂數抽；守關若被宿敵頂替，怪點上仍顯示原守關名；四風格走位在 v1.55c |
| SS-RECALL-WALK | v1.55b | 按「召回」→ 隊伍沿同一條山徑走回 den → 回到院子、隊員重現在門派地圖 | **已驗證** | 通過（單元：回程位置單調變近並在山徑上；瀏覽器實點：召回→走回→回院子） | src/world.mjs, src/main.mjs | 同上 | shots/v155b-04-recall-walk-back.png、05-back-home | — |
| SS-TILES-ALL | v1.55c | 山坡、深谷、斷崖、古洞、絕頂五環也有素材（地面紋理＋環疊色＋松竹／岩石／水潭／洞口／積雪點綴），同座標永遠畫一樣 | **已接線** | 單元：七環各有疊色、區塊決定性。瀏覽器只走到山腳／林地，外五環沒在實點中看到 | src/world.mjs | test/v155c.test.mjs, artifacts/v155c/flow-v155c.mjs | — | 外環還沒有實點截圖 |
| SS-FOG | v1.55c | 每個區塊有迷霧（s.fog，25×19 位元、base64 約 80 字）：未探＝灰霧，已探但不在隊伍視野＝淡化；隊伍走到哪就揭開到哪；相機界線＝已探區＋1 區塊；舊檔依清場紀錄補揭 | **已接線** | 單元：開局只開山門與 den、揭霧後讀檔一樣、界線變大、不用亂數。實點：已探區塊 37→48 | src/world.mjs, src/sim.mjs, src/main.mjs | test/v155c.test.mjs, artifacts/v155c/flow-v155c.mjs | shots/v155c-01-slip-offpath-fog.png、03-minimap-jump-fog-edge.png | 改了 golden（見下）；實點在出發前改過弟子個性（為了湊出溜走／清場隊伍），所以截圖只算畫面證據 |
| SS-MINIMAP | v1.55c | 左下小地圖（240×180）：環色、山徑、迷霧、山門、巢點、隊伍紅點、白框＝目前視窗；點一下鏡頭跳到那裡並取消跟隨（仍夾在已探區內） | **已接線** | 實點：點小地圖右上 → 鏡頭 y 3803→3522、follow=false | src/main.mjs, style.css | artifacts/v155c/flow-v155c.mjs | shots/v155c-03-minimap-jump-fog-edge.png | —；實點在出發前改過弟子個性（為了湊出溜走／清場隊伍），所以截圖只算畫面證據 |
| SS-STYLE-MOVE | v1.55c | 四種走法看得出不同：清場＝繞進每個怪點；穩推＝走在山徑上；疾行＝取直線、隊形縮緊；溜走＝貼在山徑旁 46px 外。標籤寫出走法 | **已接線** | 單元：同步數下各走法位置不同。實點：溜走偏離 46px；清場偏離 38px 繞向怪點 | src/world.mjs, src/main.mjs | test/v155c.test.mjs, artifacts/v155c/flow-v155c.mjs | shots/v155c-01-slip-offpath-fog.png、05-clear-detour.png | 隊伍走法是多數決；實點時依弟子個性挑人，沒找到合適的才改個性（這一輪改了 hero）；實點在出發前改過弟子個性（為了湊出溜走／清場隊伍），所以截圖只算畫面證據 |
| SS-LEFTOVER-CHASE | v1.55c | 溜走閃過的怪點變成「殘・怪名」留在原地；回程時模擬判定的返程驚獸（X.ret.hits）若撞到那一段，這段的殘餘怪會追上隊伍（約 3 秒）。回程交手不再被誤算到外程的怪點上 | **已接線** | 單元：只有被撞到的那段會追。實點：第 2 趟回程 hits=[山腳]，有 2 隻殘餘怪在追 | src/world.mjs, src/main.mjs | test/v155c.test.mjs, artifacts/v155c/flow-v155c.mjs | shots/v155c-02-leftovers-marked.png、04-leftovers-chase.png | 返程驚獸是隨機的，第 1 趟沒遇到，要重跑；實點在出發前改過弟子個性（為了湊出溜走／清場隊伍），所以截圖只算畫面證據 |
| SS-SPOT-NAMES | v1.55c | 守關點顯示對手門派奪關後的名稱（rivalGate）；打過的點標上實際交手的怪名（✕ 野兔） | **已接線** | 實點：names=[野兔, 野豬] 顯示在怪點上 | src/main.mjs | artifacts/v155c/flow-v155c.mjs | shots/v155c-06-fought-names.png | 這一輪沒有對手奪關，所以奪關後的名稱只在程式路徑上，沒有截圖；實點在出發前改過弟子個性（為了湊出溜走／清場隊伍），所以截圖只算畫面證據 |
| SS-LOD-ZOOM | v1.55d | 三段縮放「近／中／遠」按鈕（z 1.6／1／0.3），滾輪可在中間連續縮放（最低 0.3）。近＝立繪小人；中＝紅點＋名字；遠＝一張烘好的環色縮圖＋迷霧＋大型族群圖示（巢・數量），不建新區塊 | **已驗證** | 自然遊玩實點：三顆按鈕各切到 near／mid／far；最遠 3 秒量到 60.1fps、最慢一幀 16.8ms、區塊數 38→38（反例：遠景若照畫區塊，數量會增加）；滾輪 z=0.52 | src/main.mjs, src/world.mjs, style.css | test/v155d.test.mjs, artifacts/v155d/flow-v155d.mjs | shots/v155d-01-zoom-near.png、02-zoom-mid.png、03-zoom-far.png | 文件 §2.2 的區塊 LRU 上限（64）沒做；長程巡山後區塊數到 182 |
| SS-CLOUD-SEA | v1.55d | 過了絕頂（dist≥1600）進入無盡段：在雲霧入口拉近轉場（鏡頭拉近＋白霧一閃），換到一張循環雲海圖；每重繞一圈（200 步），圈上有 3 個遭遇點＋段末守關「第 N 重無名高手」，頭尾相接，所以第 1→2→3 重連續跑 | **已接線** | 單元：重數＝模擬段 id、圈頭尾相接、每步位移<30px、強隊在模擬中連跑 3 重。實點：轉場＋第 1、2、3 重都在雲海圖上。**出發前把 4 名隊員武功改到 3000＝狀態修改**，所以只算畫面證據 | src/world.mjs, src/main.mjs | test/v155d.test.mjs, artifacts/v155d/flow-v155d.mjs | shots/v155d-04-cloud-zoom-transition.png、05-cloud-layer1.png、06-cloud-layer2.png、07-cloud-layer3.png | 只是畫面：模擬不變，golden 不變 |
| SS-CLOUD-TOGGLE | v1.55d | 在雲海時出現「⛰ 回山圖／☁ 雲海」切換鈕；跟隨中自動進雲海 | **已接線** | 實點：回山圖→on=false、再按→on=true（同一輪有改狀態，只算畫面證據） | src/main.mjs | artifacts/v155d/flow-v155d.mjs | shots/v155d-08-back-to-mountain.png | — |
| SS-BLD-WELL | v1.6 | 井（石6）：藍圖可點；建成後弟子挑水，水入庫（上限12）；煮飯有水多一份 | **已驗證** | 自然遊玩：第4日石夠→點藍圖→落成→有人在挑水（反例：未建時 registry 無 water；水滿不挑）；v1.75 長跑自然遊玩：每案挑水入庫 78–184、用掉 66–172，第 30 日存水 11–12 | src/data.mjs src/sim.mjs | artifacts/v160/flow-v160.mjs | shots/v160-01-well-blueprint.png shots/v160-02-well-water.png | — |
| SS-BLD-QUIET | v1.6 | 靜室（木6石4）：2 個打坐槽、違心消減×2、優先於外功場 | **已驗證** | 自然遊玩點藍圖→落成（優先與×2 為單元測試） | src/data.mjs src/sim.mjs | artifacts/v160/flow-v160.mjs | shots/v160-03-quiet-built.png | — |
| SS-BLD-V16-REST | v1.6 | 藏經閣（研讀、聽講快25%）、祠堂（上香 3/日、名聲）、丹房（藥材2→療傷丹，1槽）、醫館（受傷需求層：丹→藥→包紮）、客房（待客）、鐘樓（晨鐘全派心情 1/日）、哨崗（守過 120 秒內野豬被嚇回） | **已接線** | 單元測試 test/v160.test.mjs；藍圖鈕在面板可見（截圖）；v1.75 長跑自然遊玩：丹房 34/35 案有人煉藥（每案 0–32 次，產丹 0–26、用 0–16） | src/data.mjs src/sim.mjs src/core.mjs | test/v160.test.mjs | shots/v160-04-sig-activity.png（面板） | 未逐一點建 |
| SS-SIG-ACTS | v1.6 | 7 派鎮派建築活動（乞討/面壁/品酒/護聖火/收會費/收租/祭祖），資料表 SIG_ACTS，每日上限 | **已接線** | 瀏覽器：門派聲望與材料為狀態修改，再實點建造鈕→弟子自去做「沿村乞討」；只算畫面證據。七派效果為單元測試 | src/data.mjs src/sect.mjs src/sim.mjs | artifacts/v160/flow-v160.mjs | shots/v160-04-sig-activity.png | — |
| SS-CHUNK-LRU | v1.6 | 區塊快取 64 格 LRU | **已接線** | 單元測試 lruGet；瀏覽器拖地圖 37 格未達上限，僅證明不出錯 | src/world.mjs src/main.mjs | test/v160.test.mjs | shots/v160-05-chunks.png | — |
| SS-MEM-LEDGER | v1.65 | 共同記憶帳本：聊天／切磋／巡山／傳功／收徒各寫一筆（日、地、事），每對 6 筆、全門 80 筆；人際面板列最近兩筆；聊天氣泡引用 | **已驗證** | 自然遊玩：人際面板出現「第N日・前院：…」；巡山歸來出現「並肩巡山，走到林地」（反例：自己對自己、未知種類不寫） | src/bonds.mjs src/sim.mjs src/expedition.mjs src/main.mjs | artifacts/v165/flow-v165.mjs | shots/v165-02-memories.png shots/v165-03-patrol-memory.png | — |
| SS-XIA-FILTER | v1.65 | 名俠池畫風濾鏡：全明星／純金庸／純周星馳（開局選單），只過濾名俠池 | **已驗證** | 實點開局選「純金庸」→ 名俠池全為金庸角色、包租公婆不在（反例：純周星馳只剩周星馳角色，單元測試） | src/bonds.mjs src/wuxia.mjs src/start-ui.mjs src/hero.mjs | artifacts/v165/flow-v165.mjs | shots/v165-01-start-style.png | — |
| SS-PASS | v1.65 | 傳功：圓滿以上的人自走帶人練同一門（名俠絕學除外），對方熟練 +15（徒弟 +20），每門每對一次、每人每日一次，好感 +6 | **已接線** | 瀏覽器：主角基礎拳改到 90（狀態修改）後自走去傳功、紀事出現【傳功】，只算畫面證據；前一輪自然遊玩曾自然發生（楊過→郭靖，絕學，之後已排除）；v1.75 長跑自然遊玩：35 案共完成 5 202 次（98% 的配對完成；v1.75 報告寫的 16 次是 log 只留 60 筆造成的誤算，v1.76 更正） | src/bonds.mjs src/sim.mjs | test/v165.test.mjs | shots/v165-04-pass.png | — |
| SS-APPRENTICE | v1.65 | 收徒：內門／首徒與外門互有好感 ≥30 → 每日自動收一名，或點「收為徒」；師父在場徒弟練功 ×1.15 | **已接線** | 瀏覽器：角色與好感為狀態修改，再實點按鈕→師徒成立、寫入記憶；另一輪看到自然形成（小石<楊過）；v1.75 長跑自然遊玩：35/35 案自然形成師徒（第 30 日 2–7 名徒弟） | src/bonds.mjs src/sim.mjs src/main.mjs | artifacts/v165/flow-v165.mjs | shots/v165-05-apprentice.png | — |
| SS-SCORE-DATA | v1.7 | 活動評分純資料：src/score-data.mjs 一列一活動（when 述詞、tiers、v 規格），sim 只剩解譯器與乘數管線 | **已接線** | 單元測試＋core golden 雜湊不變（重構前後評分一字不差） | src/score-data.mjs src/sim.mjs | test/v170.test.mjs | — |
| SS-STOCK-RESV | v1.7 | 菜庫／倉庫預留併入預約表：stock:<料>:<人> 鍵，數量依 STOCK_RESV 由任務推得；s.vegRes 移除；舊檔自動補鍵；孤兒鍵進不變式 | **已接線** | 單元測試；瀏覽器自然遊玩看到煮飯者握 stock:veg、不變式為空（預約表不在畫面上，截圖只是現場）；v1.75 長跑：70 案（相剋開／關）每拍檢查不變式，零違反 | src/core.mjs src/lifecycle.mjs src/sim.mjs src/save.mjs | artifacts/v170/flow-v170.mjs | shots/v170-01-cook-stock-resv.png |
| SS-HYST | v1.7 | 遲滯推廣為資料表 HYST：精力（30→80）之外加餓昏（15→50），吃飯第一優先跟旗走；社交／悶慌是線性評分，加遲滯無益，未加 | **已接線** | 單元測試；seed 42 行為不變 | src/core.mjs src/sim.mjs | test/v170.test.mjs | — |
| SS-SUHUI-SAVE | v1.7 | 宿慧入存檔：save 帶 legacy.suhui；開局取 localStorage／手動檔／自動檔最大；讀檔同步回 localStorage；自動檔 meta 快取 | **已接線** | 瀏覽器實點存檔→重開→自創點數 12→14（反例：無檔 12），實點讀檔→localStorage=2；但宿慧 2 是狀態修改（S.gen.suhui=2），故只算畫面證據 | src/slice.mjs src/save.mjs src/start-ui.mjs src/main.mjs | artifacts/v170/flow-v170.mjs | shots/v170-02-saved-legacy.png shots/v170-03-start-suhui-from-save.png shots/v170-04-loaded-synced.png |
| SS-DAO-RING | v1.7 | 四大武道相剋環（A17）：破綻→蓄力→卸力→歸真→破綻；弟子武道＝最熟武學的 tag，敵人查 DAO.enemy；巡山傷害雙向 ×1.1／×0.9（v1.46：威脅偏低、開局弱→只取 ±10%） | **已接線** | 單元測試；瀏覽器自然巡山記下隊員與遇敵武道；A/B 五種子無系統性偏移（artifacts/v170/dao-ab.json）；v1.75 長跑 A/B（相剋開／關，35 案）：最遠步數平均 −36、擊殺 −9.2，8 案升 6 案降，落在雜訊內 | src/data.mjs src/expedition.mjs | artifacts/v170/dao-ab.mjs | shots/v170-05-expedition-dao.png |
| SS-FOOD-SEC | v1.76 | 糧食安全閘（FOOD_SEC）：存糧＋菜 < 每人 1.5 份 → 種菜升需求層（75），吃／睡／種／煮／療傷／守望／建造以外的活動 ×0.35 | **已接線** | 單元測試；長跑自然遊玩 35 案：前 5 日斷糧平均 3.9→0.3 天，有斷糧的案 35→10 | src/data.mjs src/sim.mjs src/score-data.mjs | test/v176.test.mjs artifacts/v176/ | — |
| SS-MED-SECLUDE | v1.78 | 閉關不見客：冥想中的人不會被拉去聊天／切磋／鼓勵／傳功（修岳不群因違心化解不了、心情 <30 巡山中止的回歸） | **已接線** | 單元測試（舊碼 22 次被拉、新碼 0）；30 日 35 案長跑：岳不群到 1600 3/5→4/5（另一案 1580）、心情 49.6→53.6 | src/sim.mjs src/bonds.mjs | test/v178.test.mjs artifacts/v178/ | — |
| SS-RES-AUDIT | v1.78 | 資源總量不變式：s.res 每筆寫入走白名單管道、期末＝期初＋Σ異動、永不為負（只是測試，不改模擬） | **已接線** | 單元測試 3 案 × 15 日；帳本缺口列於 BALANCE-v178.md | test/v178.test.mjs | test/v178.test.mjs | — |

修正：巡山在模擬層也守解鎖（第一章不再在第 1 日記成）；「本門新紀錄」「重傷倒地」由頂級改為中級事件。

## 三、依賴、未完成、取消／恢復、保存邊界
- **依賴**
  - 巡山要等巡山面板解鎖（COM-UNLOCK）。
  - 名俠、華山、江湖線依主角模板和名聲、深度觸發。
  - 衣缽要先有成年內門弟子，主角也要有化境武學。
  - 收養要先成親。
- **取消／恢復**
  - 巡山出發後不能取消，只會自動回頭。
  - 抉擇卡可以選「詢問／自動」，但選了不能撤回。
  - 婉拒名俠會冷卻 3 日。
  - 傳位、逐出都不能撤回。
  - 喜劇卡、晨課令、導引可以關，也可以再開。
- **保存邊界**
  - 整局狀態都在存檔 JSON 裡（RULES 1.4，遷移從 0.6 起，一版一版跑）。
  - 進行中的巡山會跟著存檔。
  - `byId` 查表不存。
  - 宿慧和靜音設定存在 localStorage，不在存檔裡。
  - 自動存檔 3 格輪替，每 60 模擬秒一次。

## 四、AI 開發效率（可核對資料）
| 項目 | 值 |
|---|---|
| 精確模型版本 | 未量測（只能確認是 Grok Bot） |
| 提示詞版本 | 未量測（沒有版本化的提示詞；擁有人訊息見對話紀錄 t91u–t105u） |
| 執行時間 | git 時間戳：第一個 commit `b342974` 2026-10-25 04:50 → v1.4 `77e1b2d` 14:24（台北時間），共 40 個 commit；實際投入工時未量測 |
| token／費用 | 未量測 |
| 人工介入 | 擁有人做設計決定（多半回「照建議」），沒有改程式碼；實際介入次數與時間未量測 |
| 自評分數 | 不提供 |


## Review 修正紀錄（GPT review，reviewed `77e1b2d` → 修正 head `d2692d9`）
失敗歷史保留：上表受影響列的驗證欄先記 77e1b2d 失敗，再記修正後狀態。證據目錄 `artifacts/review-fix/`。

| 發現 | 77e1b2d | 重現（4b9dcd9） | 修正 | 回歸測試 | d2692d9 |
|---|---|---|---|---|---|
| P1-1 倉庫雙重預留 | 失敗 | 是（smoke 2/2 案於 ~0.2 日違反；`repro-4b9dcd9.log` 原子取料反例失敗） | `src/lifecycle.mjs` whAvail 扣他人預留；取料原子驗證、差額釋放；invariants() | P1-1 ×2 | 通過 |
| P1-2 移出未清任務 | 失敗 | 是 | 共用 `removeActor()`（gen/wuxia/huashan/雇工）：取消自己與夥伴、退回手上物資、清 plot/隊伍/關係；byId 跳過已移出 | P1-2 ×2 | 通過 |
| P1-3 一般傳人投影 | 失敗 | 是 | 傳人補 values/wexin/known/stats；valLine/statLine 防空 | P1-3 | 通過 |
| P2-1 煮飯一拍耗盡 | 失敗 | 是 | 耗力用實際時長（灶 cookDur、傳功 learnDur） | P2-1 | 通過 |
| P2-2 未來規則改標 | 失敗 | 是 | load() 先驗 rules 是已知且不新於目前，否則拒讀、不改原檔 | P2-2 | 通過 |
| 外觀 愛喝undefined | 失敗 | 是 | likesOf 用 `>>>`（負索引） | 外觀 | 通過 |
| UI 存讀往返 | 未驗證 | alert() 阻斷 | 改非阻斷 toast | `flow-save-roundtrip.mjs` 5/5 PASS（`flow-save.log`） | 通過 |

- 全套：213/213（`artifacts/review-fix/test-full.log`）。golden 重產：耗力時長與取料規則改變。`sim.test.mjs` 閒坐測試改看 seed 74–77 合計（seed 74 規則改後不再閒坐）。
- 35 案長跑矩陣：腳本 `artifacts/review-fix/longrun.mjs` 已寫好，**依擁有人指示延後到版本完成後再跑**；只跑 smoke（seed 7 × plain、郭靖 × 3 日：2/2 通過，`longrun-results-smoke.json`）。矩陣驗證欄＝未跑（d2692d9 當時）。**更新**：v1.46 於 0675f23 跑完整矩陣 35/35 通過，見 `artifacts/v146-baseline/`。
