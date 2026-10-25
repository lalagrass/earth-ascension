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
| SS-BALANCE-LONG | ROADMAP §19：排在 v1.46（v1.45 規則上的基準線） | 長時間自動試玩 → 平衡報告 | 規劃 | 未跑 | — | — | — | 還沒做（等擁有人點頭） |
| SS-PROD | ROADMAP §16 | 版權、平台、付費點數、手機 | 規劃 | 未跑 | — | — | — | 刻意延後 |

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
- 35 案長跑矩陣：腳本 `artifacts/review-fix/longrun.mjs` 已寫好，**依擁有人指示延後到版本完成後再跑**；只跑 smoke（seed 7 × plain、郭靖 × 3 日：2/2 通過，`longrun-results-smoke.json`）。矩陣驗證欄＝未跑。
