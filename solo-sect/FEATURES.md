# FEATURES.md：codex/solo-sect-grok（山門紀 solo-sect）

> 第十八輪 R5／R6（#523，規則 5.5）：雙劍不再乘 1.35 傷害；任兩名持劍同伴在同一目標兩側，第二劍接第一劍收招，實際對練縮短跟進間隔。山崖資料改為高度、路線難度、最難段；攀登看力量／體重、步法火候、耐力，光壁須繞行，上坡消耗更多時間。

> 第十六輪 R8（#526／#507，規則 5.4）：外人親見才生成江湖傳聞；牌匾前只傳匿名消息，之後消息沿村路、市集與茶攤逐日移動、按 N46 記憶期限淡去。收徒看候選人處境與所聞地點，名俠／挑戰者／山賊也讀見聞；面板列目擊者、時間與傳播位置。舊數字名聲招募門檻、定日山賊時序退場。A／B／C 與 golden 見 REVIEW。



> 第二十一輪 R11（#531，規則 5.3）：自創武學靠配方；葵花、辟邪是只有一本的實物奇書，持有人不教，讀前要自宮；自宮需確認、不可逆，之後不能有後代。白身更想找譜、讀譜。見 [rare-arts.md](docs/systems/rare-arts.md)。
> 第二十輪 R10（#530，規則 5.2）：整門武學只能學來。傳承讀卷的資料列；師父傳授要有真會的人；看人只得單招；新增白身開局。見 [lineage.md](docs/systems/lineage.md)。
> 第十九輪 R7（#524，規則 5.1）：拿掉收養。成親的兩人各自決定要不要孩子，兩人都想才懷孕；懷孕影響母親做活與上陣；孩子由父母遺傳根骨、悟性，按大人年曆長大。見 [family.md](docs/systems/family.md)。
> 第十五輪 R9（#529，規則 5.0）：唯一新局是終南荒山隱居；主角自訂姓名、12 點屬性、九問和 MBTI。舊開局與其 golden／舊存檔回放已退場；跨版存檔顯示「存檔版本不符」並回到新局。下方舊版本矩陣是交付沿革，標示舊開局的列不代表現行入口；現行驗收見 REVIEW。
> 前輪 R2／R3 已整合：身體由負重、體能疲勞、營養和根骨上限推導；心法／身法卷的體魄門檻取個人成長空間一半，前卷 XP、真研讀及傳授時鐘仍在。

> 第十一輪 N45（#457；實際主筆 grass／Codex Cloud）：巡山山腳／林地在主地圖看見敵人走近逐招打，山腰與剿寨打開同規則的小地圖；前三段的兔、豬、狼、蛇、賊、獵戶均有秒數和接觸資料。逐場戰報只在真交手後結算，未完成遠段敵人見 combat.md 清單。

> 第十一輪 N43（#455；實際主筆 grass／Codex Cloud）：山賊新增來犯／喘息節奏，仍用原家底與戰力點數、適應係數和真地圖交手；山門欄顯示風聲，守山逐人擊退數併入 `waveBest`。原 3.9 存檔以 4.0 遷移保留排定事件，從戰報還原當期來犯次數。`waves.mjs --days 0,30,60 --seeds 1-20` 是 C 類報告，詳 REVIEW。

> N35 自然可達查因（#488；實際主筆 grass／Codex Cloud）：`glimmer-metrics.mjs` 加逐日可核對帳本，揭示自然 12 種子 30／60 日首悟 0／12 的原因。情境與失手確實發生，但落在單人的有效 `w` 不足；自然日程無玩家巡獵，野豬與擲石情境另以合法巡獵對照。悟招公式、門檻、模擬、規則 3.9 與 golden 不變；原始 JSON、圖和重跑指令見 REVIEW。

> N60（#492；實際主筆 grass／Codex Cloud）：以純程式繪製的低解析度像素部件套共用關節，不再以線條與圓頭代表人物。固定外觀資料與角色 id 導出頭髮、衣服、明暗和身形；師父、招式殘影也使用同一畫法。首日動作板與遮名三人盲測見 REVIEW；規則 3.9、存檔與 golden 不變。

> N59（#490；實際主筆 grass／Codex Cloud）：日常人物使用共用骨架的站／走／蹲／坐／劈／挑資料姿勢，出身同行、山賊與遠行近景統一畫法；未知狀態退站姿。純畫面，規則 3.7 與 golden 不變；可換 seed 的首日 Playwright 與 A/B 盲板見 REVIEW。

> N57（#487；已合併 PR #491；實際主筆 grass／Codex Cloud）：原糧食帳增加來源分類，逐日工具可重播 9b／9c 倉存守恆與住民／來犯的 C 類差異；舊帳遷移標為 legacy。規則 3.7，招募與糧食數量未改；詳 `docs/systems/food-ledger.md`、REVIEW。

> 第九輪 9c（#441；施工中，實際主筆 grass／Codex Cloud）：N50 出身普通同行、共用食宿／指導時間／處境招募，N38 依真接法機率即時命名白身級別；依 #445 追加讓側擊、撒土、擲石的真戰鬥情境可達，並修正 N33 新個體經驗與 N32 正式招式知識來源。規則 3.6；自然日數與名俠人頭依新驗收列 C 報告，詳 REVIEW。

> 第九輪 9b（已合併 PR #485）：N34 情境選招與輸後心願、N35 失手悟招、N36 共用應接負荷／士氣與掩體走位、N37 分層傷與局部純畫面停頓。規則 3.5；N36 人格搶攻與 N35 自然首悟日未達設計目標，詳 REVIEW；Node22 golden 與 CI 六項均通過。

> 第九輪 9a（PR #484；已通過 CI、待 Claude review）：N32 白身身體／工具起手與首隻野狗、N33 共用手熟／眼熟及已練武者過往初值、N55 真成長只改共用骨架播放。規則 3.4；影片與真人盲測仍待 reviewer。

> 第八輪已合併（#468，PR #471；實際主筆 Codex Cloud grass）：N53 實體站位、N48 共用套路姿勢、N52 成長轉接與門規作息／Kenney 介面、N49 dev 1.1.0 肖像與女角畫面。存檔規則 3.3；舊版來源與主筆紀錄保留在下表，不能代指本輪。

> 第七輪已合併（#435，PR #469）：N27 的時間截擊與進身閃、N28 的動作占用群戰、N29 的焦躁與惱羞、N30 的山賊／名功／林克時間校準、N31 的機率與常數整理。存檔規則 3.2；勿將下列舊版功能表當成新規則驗收。

| 項目 | 內容 |
|---|---|
| 實際主筆／工具 | Grok Bot（executor 子代理），在 box 上用 Shell、git、node、headless Chrome＋playwright-core 撰寫；commit 作者顯示為 lalagrass。設計決定由擁有人 Yuying Chen 拍板（見 ROADMAP §5／§9.5／§11.6 等）。 |
| branch | `codex/solo-sect-grok`（單人分支：不開 PR、不併 dev、不碰 8800） |
| base dev SHA | `fb847663cef54717d9ff4a77f34841b1f1e5abdb`（與 `origin/dev` 的 merge-base，2026-10-25 04:34 台北時間；目前 origin/dev＝`148cfbb`） |
| head SHA | `77e1b2d6bb654a0a0ee4fce12651855501c63b43`（v1.4 各列的證據）；**v1.45 各列（SS-EXP-RETURN、SS-EVENT-TIERS、SS-EXP-STRIP、SS-STATUS）的證據在 v1.45 commit**（訊息 `v1.45: …`，SHA 見 docs/reports/milestones/PROGRESS.md v1.45 段／`git log`），artifact 在 [`artifacts/features/v145/`](artifacts/features/v145/README.md) |
| 啟動命令與入口 | 在 repo 根目錄執行 `python3 -m http.server`，開 `http://localhost:8000/solo-sect/index.html`（要用 http，不能用 file://）；入口 `index.html` → `src/main.mjs`；新局畫面在 `src/start-ui.mjs`。測試：在 `solo-sect/` 下跑 `bash test/run.sh quick`（Node 22 起 `node --test test/` 不再展開目錄）。 |
| 環境版本（實際執行） | node v20.19.2、npm 11.21.1、Google Chrome 156.0.8078.47（headless）、playwright-core 1.59.1；沒有外部相依（`package.json` 只放測試指令，loop145 後加入）。 |
| 本表涵蓋範圍（#389 補註） | 各列狀態與證據綁在該列寫的 SHA，最後一批是 v2.1。v2.2–v3.3 的功能沒有逐列回填，要看 `docs/decisions/DECISIONS.md` 與 `docs/reports/balance/`。目前測試數見 README。「ROADMAP §N」指 `docs/reports/milestones/ROADMAP-HISTORY.md`。「實作檔案」欄已改成 loop144 合併後的模組名（對照見 `docs/architecture/MODULES.md` §3）。 |

Artifact 目錄：[`artifacts/features/77e1b2d/`](artifacts/features/77e1b2d/README.md)
- 全套測試：[`test-full.log`](artifacts/features/77e1b2d/test-full.log)，**193 項全部通過，0 失敗**（約 12 秒）。
- UI 玩家流程：腳本 [`flow-ui-expedition-save.mjs`](artifacts/features/77e1b2d/flow-ui-expedition-save.mjs)，輸出 [`flow-ui.log`](artifacts/features/77e1b2d/flow-ui.log)／[`flow-ui-result.json`](artifacts/features/77e1b2d/flow-ui-result.json)，**7/7 PASS**，截圖 [`flow-report.png`](artifacts/features/77e1b2d/flow-report.png)。
- 舊檔 fixture：`test/fixtures/v0.5…v0.92.json`。golden：`test/golden/`（#388；舊的 `golden-30d.txt` 已在 #390 刪除）。

**狀態判定說明（請先讀）**
- `shots/` 的截圖幾乎都是 `shoot.mjs` 直接改狀態（給資源、跳時間、塞事件）後拍的，**只能算展示證據，不算玩家流程**。
- 「驗證＝通過（單元）」：同一 head 的 `node --test` 有直接呼叫模型的正反測試，**但沒有 UI 玩家流程**，所以狀態最多標「已接線」。
- 只有附了 UI 點擊流程、反例和可見證據的項目才標「已驗證」，而且只限該流程實際走過的範圍。
- 瀏覽器新局的種子是 `Date.now()`（`src/main.mjs:29`），UI 流程**無法固定種子**。所以 UI 流程只檢查結構，不檢查數值。

## 一、共同 Feature ID（各分支都會有的基礎系統）
> 註：正式 repo 還沒有共同 ID 表可以對照，下面的 `COM-*` 是本分支先定的名稱，之後可以改成對應的共同 ID。

| Feature ID | 設計來源 | 玩家短流程 | 狀態 | 驗證 | 實作檔案 | 測試命令與結果檔 | 截圖/錄影 | 已知缺口 |
|---|---|---|---|---|---|---|---|---|
| COM-START | docs/architecture/PROTAGONIST.md；ROADMAP §5 | 新局 → 經典人物分頁 → 選郭靖 → 選同門 → 開山立派 | 已驗證 | 通過（UI 流程，限郭靖＋預設同門） | src/start-ui.mjs, src/hero.mjs, src/data.mjs | `node --test test/v096.test.mjs`；flow-ui.log 步驟 1 | flow-ui.log；shots/v135-01（腳本） | 自創主角和其他 5 位經典人物沒跑 UI 流程（只有單元測試）；自創主角沒有專屬立繪 |
| COM-SAVE-MIGRATE | ROADMAP §5；PROGRESS v0.95 | 讀入舊版存檔 → 自動逐版遷移 → 續玩 | 已接線 | **77e1b2d：失敗**（P2-2 未來規則版本被改標；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元：每版都有 fixture 遷移測試）） | src/save.mjs | `node --test test/`（v095/v098/v100…v140 的遷移項）；test-full.log | 無 | 0.92 以後沒有實體 fixture 檔，是用程式產生舊形狀；沒有降版（新存檔不能給舊版讀） |
| COM-SAVE-SLOTS | PROGRESS v0.98 | 存檔 → 重整 → 讀檔；自動存檔 3 格；匯出／匯入 JSON | 已驗證（限手動存讀） | **77e1b2d：失敗**（存檔 alert 阻斷（review 未能完成往返）；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（UI：手動存→重整→讀，時間與人數一致）；自動存檔、匯出入只跑了單元） | src/world.mjs, src/main.mjs | `node --test test/v098.test.mjs`；flow-ui.log 步驟 6 | flow-ui.log | 反例只有「讀回時間不一致就 FAIL」，沒有做壞檔匯入的 UI 反例；自動存檔按實際時間每秒檢查 |
| COM-DETERMINISM | ROADMAP §5；PROGRESS v0.95 | （開發者）同一種子跑 30 日 → 比對雜湊 | 已接線 | 通過（golden） | src/sim.mjs, src/util.mjs | `node --test test/v095.test.mjs`；`UPDATE_GOLDEN=1` 會重產；test-full.log | 無 | UI 用 Date.now 當種子，玩家沒辦法重播；規則有意改變時 golden 會重產（v0.96–v1.4 都重產過） |
| COM-MUL | PROGRESS v0.95 | 看弟子面板的「練功倍率＝天賦×狀態×外部」 | 已接線 | 通過（單元＋隨機性質測試） | src/util.mjs | `node --test test/v095.test.mjs` | 無 | 作息是管線外的閘門 |
| COM-MIND | ROADMAP §3.1–3.3；v0.6–v0.7 | 弟子自主行動 → 面板看性格、心情、想法、決策理由 | 已接線 | 通過（單元） | src/social.mjs, src/sim.mjs | `node --test test/sim.test.mjs` | shots/v07-*（腳本） | 樂天＋順境時心情容易接近 99；沒有長期試玩 |
| COM-SOCIAL | v0.7；ROADMAP §1B | 人際面板：好感、相容、鼓勵、道侶 | 已接線 | 通過（單元） | src/social.mjs, src/sim.mjs | `node --test test/sim.test.mjs` | shots/v07-*（腳本） | 同門默契上限 25%（設計如此） |
| COM-ECON-BUILD | ROADMAP §7.2–7.4；v0.8 | 點建造 → 料堆搬運 → 動工、可暫停；雇工；邀入外門；收支 | 已接線 | **77e1b2d：失敗**（P1-1 倉庫雙重預留、P2-1 煮飯耗力；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元）） | src/sim.mjs, src/data.mjs, src/main.mjs | `node --test test/v08.test.mjs` | shots/v08-*（腳本） | 平衡偏快（約 5 日到 S2）；院內路線沒有碰撞 |
| COM-RANKS | v0.85 | 職司／優先度；切磋考核升內門；首徒 | 已接線 | 通過（單元） | src/sim.mjs | `node --test test/v085.test.mjs` | shots/v085-*（腳本） | — |
| COM-UNLOCK | PROGRESS v0.98 | 新局 → 正常加速遊玩 → 巡山面板在約 406 秒（遊戲時間，晨課試煉完成）開放 | 已驗證（限巡山面板） | 通過（UI 流程步驟 2；單元：解鎖單調、10 分鐘內必開） | src/world.mjs | `node --test test/v098.test.mjs`；flow-ui.log | flow-ui.log | 其他面板的解鎖時點沒用 UI 流程驗；UI 流程裡有自動按「略過導引」 |

## 二、分支獨有項（solo-sect）
| Feature ID | 設計來源 | 玩家短流程 | 狀態 | 驗證 | 實作檔案 | 測試命令與結果檔 | 截圖/錄影 | 已知缺口 |
|---|---|---|---|---|---|---|---|---|
| SS-HUNT | v0.5–v0.7 | 狩獵面板勾人 → 上山 3 波 → 野豬下山 | 已接線 | 通過（單元） | src/sim.mjs | `node --test test/sim.test.mjs` | shots/v05-*（腳本） | 野豬下山修正過族群上限 |
| SS-ARTS | ROADMAP §9；v0.9 | 練功 → 熟練 → 求學 → 武學圖 | 已接線 | 通過（單元） | src/arts.mjs, src/data.mjs | `node --test test/v09.test.mjs` | shots/v09-*（腳本） | 自動求學只限主修系；一次只排一門 |
| SS-ARTS-TIER | ROADMAP §11；v0.92 | 三招依階解鎖、瓶頸打坐衝關、歸真、大成變式 | 已接線 | 通過（單元） | src/arts.mjs | `node --test test/v092.test.mjs` | shots/v092-*（腳本） | 歸真沒有跟著 v1.2 調整 |
| SS-EXP-DISPATCH | ROADMAP §15；v0.95 | 巡山面板 → 勾 0 人按派遣（被擋）→ 勾 2 人派遣 → 背景戰鬥 → 戰報 | **已驗證** | 通過（UI 流程步驟 3–5：0 人跳「派 1–4 人」、沒有出巡；2 人出巡，約 142 秒遊戲時間後出戰報） | src/world.mjs, src/main.mjs | `node --test test/v095.test.mjs`；flow-ui.log | artifacts/.../flow-report.png；shots/v095-*（腳本） | 中途不能召回（沒有取消，只有撤退線和心情、體力、耐性歸零會自動回頭）；遭遇戰是批次公式，沒有地圖演出 |
| SS-EXP-STYLE | ROADMAP §15.8；v0.97 | 派遣面板看隊伍風格（性格多數決）→ 戰報顯示閃避、追擊、清場率 | 已接線 | 通過（單元；UI 流程戰報看得到「清場」風格） | src/world.mjs | `node --test test/v097.test.mjs` | flow-report.png；shots/v097-*（腳本） | — |
| SS-EXP-DEEP | ROADMAP §15；v1.0–v1.2 | 目標選「不設限」→ 斷崖、古洞、絕頂 → 無盡段每重 ×1.18、回一口真氣 | 已接線 | 通過（單元模擬：招牌武學隊可過第 4 重；一般武學止於 1600 內） | src/world.mjs, src/bonds.mjs | `node --test test/v100.test.mjs test/v110.test.mjs test/v120.test.mjs` | shots/v100-01、v120-03（腳本） | 「練滿隊到第 7 重、約 3000 步」只在開發模擬看過，沒有長期試玩；平衡報告還沒跑 |
| SS-EXP-CAMP-ORDER | v1.0 | 過第三／第五段設營 → 從營地出發；巡山令強制風格 | 已接線 | 通過（單元） | src/world.mjs, src/main.mjs | `node --test test/v100.test.mjs` | shots/v100-02（腳本） | — |
| SS-CODEX | v0.95 | 敵人圖鑑：照面、交手累積觀破值 | 已接線 | 通過（單元；UI 流程戰報後圖鑑有更新，但沒有斷言） | src/world.mjs | `node --test test/v095.test.mjs` | shots/v095-03（腳本） | — |
| SS-MANUAL | v1.0 | 殘頁湊秘笈 → 指定弟子研讀 | 已接線 | 通過（單元） | src/bonds.mjs | `node --test test/v100.test.mjs` | shots/v100-02（腳本） | — |
| SS-TASTE-AMBITION | REVIEW；v1.0 | 喜好合菜單加心情；志向達成得特質 | 已接線 | **77e1b2d：失敗**（外觀「愛喝undefined」；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元）） | src/bonds.mjs | `node --test test/v100.test.mjs` | 無 | — |
| SS-MAP-READ | REVIEW；v1.0 | 地圖：鏡頭拉近、單一狀態圖示、庫存堆 | 已接線（顯示真實狀態，沒有指令） | 通過（單元：圖示優先序）；畫面未驗證 | src/main.mjs | `node --test test/v100.test.mjs` | shots/v100-03（腳本） | 動作沒有逐幀動畫 |
| SS-PACE-CH1 | v0.95／v0.98 | 第 1 日野豬試煉 → 前三日里程碑 → 第一章三目標 → 章節總結 | 已接線 | 通過（單元） | src/world.mjs, src/sim.mjs | `node --test test/v095.test.mjs test/v098.test.mjs` | shots/v098-03（腳本） | 只有第一章 |
| SS-AUDIO | v0.98 | 事件音效、環境音、靜音 | 已接線 | 未跑（瀏覽器出聲沒有測；單元只測事件推導） | src/audio.mjs | `node --test test/v098.test.mjs` | 無 | 要先點一次按鈕才會啟動 |
| SS-HERO-VALUES | docs/architecture/PROTAGONIST.md；v0.96 | 自動駕駛照價值觀行動；違心（最多 3 層）；抉擇卡詢問或自動 | 已接線 | 通過（單元） | src/hero.mjs | `node --test test/v096.test.mjs` | shots/v096-*（腳本） | — |
| SS-COMPANION | 擁有人 t100u；v0.96 | 開局同門 2–3 選 1（郭靖可選黃蓉） | 已接線 | 通過（單元）；UI 流程有點黃蓉卡，但沒有斷言她入隊 | src/start-ui.mjs, src/data.mjs | `node --test test/v096.test.mjs` | shots/v096-*（腳本） | — |
| SS-TEMPLATE-RULES | ROADMAP §17；v0.97 | 韋小寶溜走、黃蓉香火錢、阿星瀕死覺醒 | 已接線 | 通過（單元） | src/world.mjs, src/hero.mjs | `node --test test/v097.test.mjs` | shots/v097-03（腳本） | — |
| SS-WUXIA | v1.1 | 名俠奇遇卡 → 收／婉拒（冷卻 3 日）；洪七公食誘傳降龍 | 已接線 | **77e1b2d：失敗**（P1-2 名俠離開未清任務；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元）） | src/wuxia.mjs | `node --test test/v110.test.mjs` | shots/v110-*（腳本） | 只有部分名俠能入門 |
| SS-HUASHAN | v1.2 | 岳不群紫霞九層、辟邪三卡、嵩山施壓；令狐沖、風清揚、獨孤九劍 | 已接線 | **77e1b2d：失敗**（P1-2 逐出令狐沖未清任務；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元）） | src/wuxia.mjs | `node --test test/v120.test.mjs` | shots/v120-*（腳本） | 不是岳不群局時，辟邪不會交給林平之；嵩山襲擊沿用野豬襲擊；吸星大法、易筋經沒做 |
| SS-JIANGHU | v1.3 | 楊過、小龍女、周伯通、東方不敗、火雲邪神、海大富、《功夫》隱藏高手；喜劇卡、晨課令（可關） | 已接線 | 通過（單元） | src/jianghu.mjs | `node --test test/v130.test.mjs` | shots/v130-*（腳本） | 數值沒經過長期試玩 |
| SS-SECT | ROADMAP §18；擁有人 t103u；v1.35 | 主角＝門派 → 匾額、旗 → 門規、禁學、外門 ×0.7、師門質疑卡 → 鎮派設施 | 已接線 | 通過（單元） | src/sect.mjs, src/data.mjs | `node --test test/v135.test.mjs` | shots/v135-*（腳本） | 設施只有一級；自創主角「多一格自選設施」沒做；門規條件簡化 |
| SS-SECT-FEUD | v1.35 | 巡山第 2、4… 道關由宿敵把守（強 15%），打贏加門派聲望 | 已接線 | 通過（單元）；UI 流程戰報出現「鐵掌幫高手（狼王）」 | src/sect.mjs, src/world.mjs | `node --test test/v135.test.mjs` | flow-report.png | **宿敵守關沿用原守關敵的圖和數值底（只改名稱與強度）** |
| SS-GEN-MARRY-ADOPT | R7 #524（取代 v1.4 收養） | 道侶＋雙向相容 → 成親 → 兩人各自決定 → 兩人都想才懷孕 → 足月出生 → 同一年曆長大 | 已接線 | 通過（單元） | src/family.mjs | `node --test test/unit/social/r7-family.test.mjs` | — | 收養已拿掉 |
| SS-GEN-AGE | v1.4 | 孩子每 3 日長 1 歲，14 歲成年換立繪；成人每 28 日長 1 歲 | 孩童已接線；成人年齡＝展示 | 通過（單元，只測孩童） | src/sect.mjs | `node --test test/v140.test.mjs` | shots/v140-01（腳本） | **成人年齡只有顯示**，不影響數值、不會老化 |
| SS-GEN-LINEAGE | v1.4 | 拜師 → 師父大成以上武學練 ×1.2 | 已接線 | 通過（單元） | src/sect.mjs, src/util.mjs | `node --test test/v140.test.mjs` | shots/v140-02（腳本） | — |
| SS-GEN-SUCCEED | docs/architecture/PROTAGONIST.md；v1.4 | 主角化境 → 「傳位退隱」 → 繼承人接掌 → 世代 +1、宿慧 +1 | 已接線 | **77e1b2d：失敗**（P1-3 一般傳人卡片 TypeError；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元）） | src/sect.mjs, src/main.mjs | `node --test test/v140.test.mjs` | shots/v140-02、v140-03（腳本） | **繼承人沒有自己的主線劇情**；傳位不能撤回 |
| SS-SUHUI | docs/architecture/PROTAGONIST.md；v1.4 | 宿慧點數存在 localStorage → 自創新局點數 +（上限 +3） | 已接線 | 通過（單元） | src/sect.mjs, src/start-ui.mjs | `node --test test/v140.test.mjs` | shots/v140-03（腳本） | 宿慧不在存檔裡（跨局、跟著瀏覽器）；付費取得延後到 Production（ROADMAP §16） |
| SS-EXPEL | v1.35 列名單；v1.4 真移除 | 逐出抉擇 → 弟子離開（清好感、關係、家庭、隊伍） | 已接線 | **77e1b2d：失敗**（P1-2 移出未清任務；[review](artifacts/review-fix/README.md)）→ **d2692d9：通過**（`test/v145-review.test.mjs`；通過（單元，含「不能移掌門」反例）） | src/sect.mjs | `node --test test/v140.test.mjs` | 無 | 逐出不能撤回 |
| SS-EXP-RETURN | ADOPTION-PLAN A1；擁有人核准數值（每段 −6 耐力、見底才掉一半、不受傷）；v1.45 | 巡山令「溜走」派出 → 帶戰利品回程 → 每經過一段未清段扣耐力 6 → 戰報「🐾 返程驚獸」 | 已驗證（限溜走帶寶回程、耐力未見底） | 通過（UI：v145 flow 步驟 4–5，實況 2 段 −12）；掉一半戰利品、無寶不引獸、清場 0 損耗、平靖段不算：只有單元 | src/world.mjs（returnPlan/returnStep/unclearedSegs）, src/data.mjs EXP.retSta/retLoss, src/main.mjs 戰報卡 | `node --test test/v145.test.mjs`（A1 五項）；[test-full.log](artifacts/features/v145/test-full.log)；[flow-ui.log](artifacts/features/v145/flow-ui.log) | shots/v145-02-return-raid-report.png（真實點擊流程） | UI 沒走到「耐力見底丟寶」；地圖上沒有獸群追趕畫面（v1.55 新地圖再做）；召回仍無（移到 v1.5） |
| SS-EVENT-TIERS | ADOPTION-PLAN A3；v1.45 | 事件依關鍵字分三級：C＝人物頭上氣泡、B＝地圖右側竹簡（點一下推鏡＋捲到弟子卡）、A＝暫停＋推鏡＋「知道了，繼續」 | 已驗證（A 級暫停、B 級點擊推鏡） | 通過（UI：A 級大事 0.4 秒內時間不動；點竹簡 → 弟子卡捲入視窗）；C 級氣泡只有單元（UI 沒斷言氣泡畫面） | src/util.mjs, src/util.mjs log(), src/main.mjs feed()/bubble()/focusOn(), style.css | `node --test test/v145.test.mjs`（A3 三項）；flow-ui.log | shots/v145-01（竹簡）、shots/v145-03（竹簡＋推鏡後）、artifacts/features/v145/top-alert.png（若該次有出現）；皆真實點擊流程 | 分級靠訊息關鍵字（`TOP_RX/MID_RX`），會有誤判（例：「重傷倒地」算 A 級，可能太吵）；A 級沒有關閉開關；推鏡只在人物在院內時有效 |
| SS-EXP-STRIP | ADOPTION-PLAN A3＋A16 里程軸；v1.45 | 巡山中面板顯示每段 ✔已清／⚠未清／▶進行中／·未到；地圖頂端進度條同步標 ✔⚠ | 已驗證 | 通過（UI：巡山中 ≥7 段標記可見）；狀態判定有單元 | src/world.mjs milestones(), src/main.mjs expBar()/巡山面板 | `node --test test/v145.test.mjs`（里程軸）；flow-ui.log 步驟 3 | shots/v145-01-patrol-strip-feed.png（真實點擊流程） | 無盡段只在走到時才列出；⚠ 的提示只在滑鼠 title |
| SS-STATUS | ADOPTION-PLAN A5；v1.45 | 弟子卡最上方三行：現在／原因／下一步＋決策層標籤（指令／巡山／生理／作息／性格） | 已驗證（限顯示存在且三行齊） | 通過（UI：點竹簡後該弟子卡含三行）；層級判定有單元 | src/panel-ui.mjs, src/main.mjs 弟子卡 | `node --test test/v145.test.mjs`（A5）；flow-ui.log 步驟 7 | shots/v145-03-status-panel.png（真實點擊流程） | 層級用 reason 文字推斷（例：「灶上該煮飯了」被標成「性格」而非「作息」）；「下一步」取評分第二名，不保證真的會做；待命時 reason 會殘留舊文字（截圖可見「名俠入門」） |
| SS-BALANCE-LONG | ROADMAP §19：排在 v1.46（v1.45 規則上的基準線） | 長時間自動試玩 → 平衡報告 | 已接線（v1.46 基準、v1.75 第二輪已跑） | **通過（不變式）**：35/35 跑完 30 日、0 違反（`artifacts/v146-baseline/longrun.log`、`longrun-results.json`；報告 `docs/reports/balance/BALANCE-BASELINE-v146.md`）。限：腳本玩家只用一般指令、固定種子；平衡結論見報告，未做真人試玩；v1.75 第二輪：同腳本同矩陣 35/35 跑完、零不變式違反；對照見 docs/reports/balance/BALANCE-REPORT-v175.md、artifacts/v175/ | — | — | — | 還沒做（等擁有人點頭） |
| SS-PROD | ROADMAP §16 | 版權、平台、付費點數、手機 | 規劃 | 未跑 | — | — | — | 刻意延後 |

### v1.5 新模擬核心（ROADMAP §19）
| Feature ID | 設計來源 | 玩家短流程 | 狀態 | 驗證 | 實作檔案 | 測試命令與結果檔 | 截圖/錄影 | 已知缺口 |
|---|---|---|---|---|---|---|---|---|
| SS-CORE-REGISTRY | ROADMAP §19 v1.5；DESIGN-REVIEW §3 | 新設施只加資料：階段宣告 offers/beds/slots，登錄表推出容量與時長 | 已接線 | 通過（單元） | src/core.mjs, src/data.mjs | `node --test test/v150.test.mjs` | — | 活動廣告需求（`ad`）欄位已預留但打分仍在 scoreActs，未改成純資料驅動 |
| SS-CORE-RESV | v1.5 | 床位、灶位、菜畦、切磋/聊天夥伴走同一張 s.resv；床滿打地鋪 | 已接線 | 通過（單元＋10 日每拍不變式＋長跑 smoke 9/9） | src/core.mjs, src/sim.mjs | `test/v150.test.mjs`；`artifacts/v150/longrun-smoke.json` | — | 倉庫料仍由 whReserved 從任務推得（沒搬進 s.resv）；vegRes 仍是計數器；「物資總量守恆」不變式未做 |
| SS-CORE-TOIL | v1.5 | 工序清單 stepsOf；搬料途中取消不瞬移，料拿在手上走回院倉 | 已接線 | 通過（單元） | src/core.mjs | `test/v150.test.mjs` | shots/v150-status.png（實玩） | 工序仍由 phase 推導，不是逐步執行的 step 物件；撤銷（undo）未做 |
| SS-CORE-NEEDS | v1.5 | 精力 ≤30 想睡、到 80 才起；休閒/聊天/採藥/鼓勵做完 60 秒內 ×0.3 | 已接線 | 通過（單元） | src/core.mjs, src/sim.mjs | `test/v150.test.mjs` | — | 只有精力有遲滯；飢餓沿用舊門檻 |
| SS-EXP-RECALL | v1.5（A2） | 巡山面板按「召回」→ 從目前距離回程、戰利品保留 | **已驗證** | 通過（單元＋瀏覽器實玩點擊 5/5） | src/world.mjs, src/main.mjs | `artifacts/v150/flow-v150.mjs` → `flow-v150-result.json` | shots/v150-exp-out.png、shots/v150-exp-recall.png（實玩） | 距離仍抽象（v1.55 才上地圖） |
| SS-STATUS-V150 | v1.5 | 弟子卡「現在／原因／下一步」：層級讀 d.decision；下一步＝目前任務排著的工序 | 已驗證 | 通過（單元＋實玩） | src/panel-ui.mjs | `test/v150.test.mjs`、`test/v145.test.mjs` | shots/v150-status.png（實玩） | — |

### v1.55a 同圖延伸：世界與鏡頭（docs/reports/reviews/PATROL-MAP-SAMEMAP-v155.md 混合案；擁有人 t135u「照建議」）
| Feature ID | 設計來源 | 玩家短流程 | 狀態 | 驗證 | 實作檔案 | 測試命令與結果檔 | 截圖/錄影 | 已知缺口 |
|---|---|---|---|---|---|---|---|---|
| SS-WORLD-CAM | SAMEMAP §2.4；v1.55a | 拖曳地圖往右上捲 → 被邊界擋（門派＋已揭露環＋一圈）；出發只跳紙條、點紙條才跟隨；按「回山門」回門派全景 | 已驗證（限拖曳邊界、紙條跟隨、回山門） | 通過（單元＋瀏覽器實點 11/11；反例：未巡山拖不出第一環、出發不自動跟隨） | src/world.mjs camBounds/clampCam, src/main.mjs | `node --test test/v155a.test.mjs`；`artifacts/v155a/flow-v155a.mjs` → `flow-v155a-result.json` | shots/v155a-01-home.png、02-drag-bound、05-depart-toast、06-follow | 「已揭露」暫用清場紀錄／本趟走到的環推算，迷霧 bit 在 v1.55c；縮放只有滾輪連續縮放，三段 LOD 未做 |
| SS-WORLD-CHUNK | SAMEMAP §2.2；v1.55a | 世界 6400×4800、門派在左下；256px 區塊第一次進視窗才畫進離屏 canvas | 已接線 | 通過（單元：同座標同畫；無頭 Chrome 縮到 0.5 約 60fps、143 塊快取） | src/world.mjs paintChunk/chunksInView, src/main.mjs | `test/v155a.test.mjs`；flow 第 5 步 | shots/v155a-03-world-rings.png | 地形只是各環色塊＋點狀雜訊（tile 美術在 v1.55b/c）；fps 是無頭參考值，非 1440×900 桌機實測 |
| SS-ENEMY-MERGE | DESIGN-REVIEW §2.5；v1.55a | 家裡狩獵／獸襲與巡山共用 ENEMIES；MONSTERS 只是帶 home 欄位者的檢視；每種敵人標所屬環 | 已接線 | 通過（單元：數值與舊表逐欄相同；核心雜湊不變） | src/data.mjs | `test/v155a.test.mjs` | — | 家裡仍只有山鼠、野豬兩種 |
| SS-RING-POP | SAMEMAP §2.6/§3；v1.55a | 7 環各有族群數，地圖巢點顯示「某環巢・N」；巡山擊倒扣該環，定時無亂數回補 | 已接線 | 通過（單元＋實跑巡山：扣掉數＝擊倒數） | src/world.mjs popStep/popKill, src/world.mjs, src/sim.mjs | `test/v155a.test.mjs` | shots/v155a-03、04 | 族群還不影響遭遇率與獸襲頻率（刻意：保持模擬結果不變） |
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
| SS-MEM-LEDGER | v1.65 | 共同記憶帳本：聊天／切磋／巡山／傳功／收徒各寫一筆（日、地、事），每對 6 筆、全門 80 筆；人際面板列最近兩筆；聊天氣泡引用 | **已驗證** | 自然遊玩：人際面板出現「第N日・前院：…」；巡山歸來出現「並肩巡山，走到林地」（反例：自己對自己、未知種類不寫） | src/bonds.mjs src/sim.mjs src/world.mjs src/main.mjs | artifacts/v165/flow-v165.mjs | shots/v165-02-memories.png shots/v165-03-patrol-memory.png | — |
| SS-XIA-FILTER | v1.65 | 名俠池畫風濾鏡：全明星／純金庸／純周星馳（開局選單），只過濾名俠池 | **已驗證** | 實點開局選「純金庸」→ 名俠池全為金庸角色、包租公婆不在（反例：純周星馳只剩周星馳角色，單元測試） | src/bonds.mjs src/wuxia.mjs src/start-ui.mjs src/hero.mjs | artifacts/v165/flow-v165.mjs | shots/v165-01-start-style.png | — |
| SS-PASS | v1.65 | 傳功：圓滿以上的人自走帶人練同一門（名俠絕學除外），對方熟練 +15（徒弟 +20），每門每對一次、每人每日一次，好感 +6 | **已接線** | 瀏覽器：主角基礎拳改到 90（狀態修改）後自走去傳功、紀事出現【傳功】，只算畫面證據；前一輪自然遊玩曾自然發生（楊過→郭靖，絕學，之後已排除）；v1.75 長跑自然遊玩：35 案共完成 5 202 次（98% 的配對完成；v1.75 報告寫的 16 次是 log 只留 60 筆造成的誤算，v1.76 更正） | src/bonds.mjs src/sim.mjs | test/v165.test.mjs | shots/v165-04-pass.png | — |
| SS-APPRENTICE | v1.65 | 收徒：內門／首徒與外門互有好感 ≥30 → 每日自動收一名，或點「收為徒」；師父在場徒弟練功 ×1.15 | **已接線** | 瀏覽器：角色與好感為狀態修改，再實點按鈕→師徒成立、寫入記憶；另一輪看到自然形成（小石<楊過）；v1.75 長跑自然遊玩：35/35 案自然形成師徒（第 30 日 2–7 名徒弟） | src/bonds.mjs src/sim.mjs src/main.mjs | artifacts/v165/flow-v165.mjs | shots/v165-05-apprentice.png | — |
| SS-SCORE-DATA | v1.7 | 活動評分純資料：src/data.mjs 一列一活動（when 述詞、tiers、v 規格），sim 只剩解譯器與乘數管線 | **已接線** | 單元測試＋core golden 雜湊不變（重構前後評分一字不差） | src/data.mjs src/sim.mjs | test/v170.test.mjs | — |
| SS-STOCK-RESV | v1.7 | 菜庫／倉庫預留併入預約表：stock:<料>:<人> 鍵，數量依 STOCK_RESV 由任務推得；s.vegRes 移除；舊檔自動補鍵；孤兒鍵進不變式 | **已接線** | 單元測試；瀏覽器自然遊玩看到煮飯者握 stock:veg、不變式為空（預約表不在畫面上，截圖只是現場）；v1.75 長跑：70 案（相剋開／關）每拍檢查不變式，零違反 | src/core.mjs src/core.mjs src/sim.mjs src/save.mjs | artifacts/v170/flow-v170.mjs | shots/v170-01-cook-stock-resv.png |
| SS-HYST | v1.7 | 遲滯推廣為資料表 HYST：精力（30→80）之外加餓昏（15→50），吃飯第一優先跟旗走；社交／悶慌是線性評分，加遲滯無益，未加 | **已接線** | 單元測試；seed 42 行為不變 | src/core.mjs src/sim.mjs | test/v170.test.mjs | — |
| SS-SUHUI-SAVE | v1.7 | 宿慧入存檔：save 帶 legacy.suhui；開局取 localStorage／手動檔／自動檔最大；讀檔同步回 localStorage；自動檔 meta 快取 | **已接線** | 瀏覽器實點存檔→重開→自創點數 12→14（反例：無檔 12），實點讀檔→localStorage=2；但宿慧 2 是狀態修改（S.gen.suhui=2），故只算畫面證據 | src/world.mjs src/save.mjs src/start-ui.mjs src/main.mjs | artifacts/v170/flow-v170.mjs | shots/v170-02-saved-legacy.png shots/v170-03-start-suhui-from-save.png shots/v170-04-loaded-synced.png |
| SS-DAO-RING | v1.7 | 四大武道相剋環（A17）：破綻→蓄力→卸力→歸真→破綻；弟子武道＝最熟武學的 tag，敵人查 DAO.enemy；巡山傷害雙向 ×1.1／×0.9（v1.46：威脅偏低、開局弱→只取 ±10%） | **已接線** | 單元測試；瀏覽器自然巡山記下隊員與遇敵武道；A/B 五種子無系統性偏移（artifacts/v170/dao-ab.json）；v1.75 長跑 A/B（相剋開／關，35 案）：最遠步數平均 −36、擊殺 −9.2，8 案升 6 案降，落在雜訊內 | src/data.mjs src/world.mjs | artifacts/v170/dao-ab.mjs | shots/v170-05-expedition-dao.png |
| SS-FOOD-SEC | v1.76 | 糧食安全閘（FOOD_SEC）：存糧＋菜 < 每人 1.5 份 → 種菜升需求層（75），吃／睡／種／煮／療傷／守望／建造以外的活動 ×0.35 | **已接線** | 單元測試；長跑自然遊玩 35 案：前 5 日斷糧平均 3.9→0.3 天，有斷糧的案 35→10 | src/data.mjs src/sim.mjs src/data.mjs | test/v176.test.mjs artifacts/v176/ | — |
| SS-MED-SECLUDE | v1.78 | 閉關不見客：冥想中的人不會被拉去聊天／切磋／鼓勵／傳功（修岳不群因違心化解不了、心情 <30 巡山中止的回歸） | **已接線** | 單元測試（舊碼 22 次被拉、新碼 0）；30 日 35 案長跑：岳不群到 1600 3/5→4/5（另一案 1580）、心情 49.6→53.6 | src/sim.mjs src/bonds.mjs | test/v178.test.mjs artifacts/v178/ | — |
| SS-RES-AUDIT | v1.78 | 資源總量不變式：s.res 每筆寫入走白名單管道、期末＝期初＋Σ異動、永不為負（只是測試，不改模擬） | **已接線** | 單元測試 3 案 × 15 日；帳本缺口列於 docs/reports/balance/BALANCE-v178.md | test/v178.test.mjs | test/v178.test.mjs | — |
| SS-MARRY-CAP | v1.8 | 成親封頂：門派最多 5 對、喜事每 5 日一場（開局第 5 日起）、好感 ≥90、心上人唯一且互指、喜事花 100 香火錢；舊檔遷移補心上人 | **已接線** | 單元測試（上限／冷卻／錢不夠／心上人非對方 反例）；35 案 30 日平均 3.71 對（1–5）、60 日 3.80（1–5），v1.78 為 14.8／30.1 | test/v180.test.mjs | artifacts/v180/analyze30.json | — |
| SS-PASS-FREQ | v1.8 | 傳功降頻：基礎分 80→60、同一對 2 日內不重傳、當日每傳一次 ×0.3、門派每日上限 2 次（起手即佔名額） | **已接線** | 單元測試（飽和、上限反例、隔日重置）；35 案平均 0.74 次／案／日（30 日）、0.85（60 日），最大 0.90 | test/v180.test.mjs | artifacts/v180/analyze60.json | — |
| UI-A7-ARTHINT | v1.8 | A7 武學領悟線索：武學面板列出每門未學武學還差什麼（前置層級、悟性、路數）；秘傳只露剪影＋取得方式，名俠絕學寫出由哪位名俠帶來 | **已驗證** | 瀏覽器點擊流程 8/8 PASS：切換弟子後重算、反例（已學的不列、練到前置後線索消失、無頁面錯誤） | artifacts/v180/flow-v180.mjs | shots/v180-01～03 | — |
| SS-SCORE-POST | v1.8 | 評分後處理資料化：雇工／日課／糧荒／首徒的過濾與倍率改寫成 data.mjs 的 SCORE_POST 表，由 postRows 解讀 | **已接線** | golden 不變（重構那一筆）；單元測試：加一條規則就改變評分、移除後還原 | test/v180.test.mjs | — | — |
| SS-LEDGER-BOOK | v1.8 | 補記帳：BALANCE-v178 列出的帳外資源異動全部改走 resAdd/resSet 入每日帳本；不變式測試新增「帳本 Σ(入−出)＝實際異動」 | **已接線** | 3 案 × 15 日 0 筆不符；golden 只差帳本欄位（去掉 ledger 後雜湊相同） | test/v178.test.mjs | — | — |
| ART-PB-15-16-18 | v1.8 | 畫像批次後製（不重畫）：32 張去背＋背景壓淡＋人物提亮（PB-15）、外圍深色描邊（PB-16）、臉部頭像（PB-18，顯示寬 ≤72px 自動改用）；輸出 assets/portraits/v2/post/，舊圖保留，面板「畫像：舊／新」開關 | **已驗證** | 瀏覽器點擊流程：切 v2 圖片換成後製檔、小圖用頭像、再點還原、無破圖；單元測試檔案齊全 | artifacts/v180/portrait-post.py | shots/v180-04, artifacts/v180/portrait-post-sheet.png | — |
| ECON-WAGE | v1.85 | 月俸＋設施維護：每 5 日結算，月俸＝9×N^1.5（掌門 1.5、內門 1、外門 0.25，雜工不領），封頂 400；維護每設施階 6（丹房／祠堂 ×2）封頂 160；開山寬限到第 10 日（舊檔讀入另給 5 日）；欠俸兩次警告、第三次最低心情的一人離山（每案最多 1 人）；維護欠款→失修（領俸者每日心情 −3），付清即恢復 | **已接線** | test/v185（超線性、封頂、寬限、兩警告一離山＋反例、恢復）；面板預告由 flow-v185 實點看到，但欠俸警告未走 UI 流程 |
| ECON-MARKET | v1.85 | 山下市集：每 5 日一期補貨，靈草 12 份（×3）、兵器 2 把（×1.08 傷害），同期越買越貴（×1.25） | **已接線**（v1.85 初標已驗證，2026-10-26 降級） | flow-v185：實點買靈草（+3、價 5→7、剩 12→11），反例：沒錢時按鈕灰；但錢（0 與 400）是狀態修改，依狀態規則只算畫面證據。test/v185 限量與補貨回原價 |
| ECON-PILL | v1.85 | 療傷丹可賣（14 起，每賣 ×0.85，每期最多 6 顆）；存丹 >10 每 5 日陳化 10% | **已接線**（賣：v1.85 初標已驗證，2026-10-26 降級） | flow-v185 實點賣丹（丹 −1、錢 +14），但丹數 3 是狀態修改，只算畫面證據；陳化只有單元測試（含 ≤10 不陳化反例） |
| A10-SCHOOL | v1.85 | 下山義學：花 20 錢（每趟 ×1.2）派一名弟子下山 1 日，帶回想入門的人（不看名聲、仍要床位與糧），候選最多 2 | **已接線**（v1.85 初標已驗證，2026-10-26 降級） | flow-v185：實點派人、按鈕變灰（反例：不能同時兩趟）、一日後候選出現在面板；派人前錢被改成 400（狀態修改），只算畫面證據 |
| PLAIN-DORM | v1.85 | 宿舍第 3 階「大通鋪」床 10；白板開局人口可到 12（v1.8 卡 7–8） | **已接線** | 30／60 日長跑白板 5/5 都到 12 人 |
| GUOJING-HARD | v1.85 | 郭靖標【困難開局】（開局卡紅字）；前 20 日降龍掌傷害 ×1.35，降龍 xp 卡 54.9 時送一次一階衝關 | 標籤：**已驗證**（複查 2026-10-26：此步在開局畫面、任何狀態修改之前，屬完整自然操作，維持）；加成：**已接線** | flow-v185 開局卡（反例：韋小寶無標）；長跑 30 日 3/5 到 1600、60 日 5/5 |
| SS-WUWU | #401–#415 | 武無第二：招式只當形狀，威力改走扇形曲線（常見段中位數動態基準，入門相近、名功拉開）；各派武學樹與拜師關卡補完；第二批名功絕活與內功被動；豬籠城寨系列；威脅跟隨戰力與適應係數；絕活地圖浮字；名功大成高階分路；名功門內師徒傳授。規則版本 2.8 | **已接線** | `bash test/run.sh smoke` 加上 `node --test test/wuwu.test.mjs`。面板句子對過 HTML。瀏覽器截圖貼在 PR | src/artcard.mjs src/arts.mjs src/sim.mjs src/world.mjs src/panel-ui.mjs src/main.mjs src/data.mjs src/save.mjs src/bonds.mjs src/threat.mjs | test/wuwu.test.mjs | 戰報與人物面板見該 PR | 巡山逐拍接上 hit/gethit，絕活地圖呈現、高階分路、師徒傳承與戰力威脅全部接線 |
| SS-CLASH | #416–#420 | 地圖交手：三段出招與紅色前搖扇形；看破／閃／招架／中招四種接法與架勢條（打空挨重擊 ×2）；敵人只從 SOURCES 出生、分 2–3 路；4 個近戰位、應接 1–5 招與頭上金紅圈、輕功滑步；山賊拆成個人；招名浮字、首用大事記、大成滑步、化境範圍逐個判；人物面板實戰紀錄。見 docs/systems/combat.md |
| SS-CLASH2 | #423–#427 | 第五輪（規則 3.0）：山賊破柵後逐個入院交手、倒地退走；完美閃避觸發林克時間（80px 圈內敵人 ×0.3 一秒）與輕功交錯；六門絕學各改一條接法規則（只地圖戰，重複的舊 on 地圖戰略過，首用蓋字與大事記）；輕度部位傷目／手／身最多三日 | 已接上 |
| SS-CLASH3 | #428–#433 | 第六輪（規則 3.1）：人獸賊共用勁、速、霸體與相對接法；危險來招才有林克時間；抽象戰採同源期望；無柵山賊上地圖；師徒同場傳授；應接看外功、傷位看來招 | draft PR，待 CI 與 review |

修正：巡山在模擬層也守解鎖（第一章不再在第 1 日記成）；「本門新紀錄」「重傷倒地」由頂級改為中級事件。

## 三、依賴、未完成、取消／恢復、保存邊界
- **依賴**
  - 巡山要等巡山面板解鎖（COM-UNLOCK）。
  - 名俠、華山、江湖線依主角模板和名聲、深度觸發。
  - 衣缽要先有成年內門弟子，主角也要有化境武學。
  - 生孩子要先成親，且兩人都想要。
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
| P1-1 倉庫雙重預留 | 失敗 | 是（smoke 2/2 案於 ~0.2 日違反；`repro-4b9dcd9.log` 原子取料反例失敗） | `src/core.mjs` whAvail 扣他人預留；取料原子驗證、差額釋放；invariants() | P1-1 ×2 | 通過 |
| P1-2 移出未清任務 | 失敗 | 是 | 共用 `removeActor()`（gen/wuxia/huashan/雇工）：取消自己與夥伴、退回手上物資、清 plot/隊伍/關係；byId 跳過已移出 | P1-2 ×2 | 通過 |
| P1-3 一般傳人投影 | 失敗 | 是 | 傳人補 values/wexin/known/stats；valLine/statLine 防空 | P1-3 | 通過 |
| P2-1 煮飯一拍耗盡 | 失敗 | 是 | 耗力用實際時長（灶 cookDur、傳功 learnDur） | P2-1 | 通過 |
| P2-2 未來規則改標 | 失敗 | 是 | load() 先驗 rules 是已知且不新於目前，否則拒讀、不改原檔 | P2-2 | 通過 |
| 外觀 愛喝undefined | 失敗 | 是 | likesOf 用 `>>>`（負索引） | 外觀 | 通過 |
| UI 存讀往返 | 未驗證 | alert() 阻斷 | 改非阻斷 toast | `flow-save-roundtrip.mjs` 5/5 PASS（`flow-save.log`） | 通過 |

- 全套：213/213（`artifacts/review-fix/test-full.log`）。golden 重產：耗力時長與取料規則改變。`sim.test.mjs` 閒坐測試改看 seed 74–77 合計（seed 74 規則改後不再閒坐）。
- 35 案長跑矩陣：腳本 `artifacts/review-fix/longrun.mjs` 已寫好，**依擁有人指示延後到版本完成後再跑**；只跑 smoke（seed 7 × plain、郭靖 × 3 日：2/2 通過，`longrun-results-smoke.json`）。矩陣驗證欄＝未跑（d2692d9 當時）。**更新**：v1.46 於 0675f23 跑完整矩陣 35/35 通過，見 `artifacts/v146-baseline/`。
| I2-TIER | v1.9 | 三四階建築：正殿／大殿、演武場／演武廣場、大膳房要名聲門檻（25–70）＋巡山遠段才撿得到的稀有料（鐵木：峽谷 0.25、斷崖 0.35；靈石：山洞 0.3、峰頂 0.4、無盡段 0.4）；宿舍不加料門檻（白板要靠大通鋪到 12 人） | **已接線** | flow-v190：反例「鐵木不足」灰鈕＋原因、補料後實點立藍圖（鐵木 −2）；名聲／錢／料都是狀態修改，只算畫面證據。test/v190；30 日長跑無一案在第 30 日前蓋滿（中位 31），60 日也沒蓋滿 |
| I2-LOTS | v1.9 | 地塊：開局 4 塊給 v1.6 非鎮派建築用，擴地 50 錢起每次 ×1.5，上限 10；地滿時藍圖灰「沒有空地」 | **已接線** | flow-v190 實點擴地（地 4→5、錢 −50、丹房藍圖解鎖），反例：地滿灰鈕；4 座建築與錢是狀態修改。test/v190 |
| I6-RAID | v1.9 | 山賊：8 人以下不來；依家底（錢、糧、丹、草、建築階）與日數算威脅，第 8 日起約每 6±2 日；勒索金＝20＋0.6×威脅（最多現錢 35%）；半日內選付錢或迎戰，逾時自動依期望損失決定；勝 +3 名聲、40% 一人重傷；敗被搶錢 15%／糧 20% 並一人重傷；只重傷（hp≤15）不死、不傷孩童 | **已接線** | flow-v190：實點付錢（−30）、反例錢不夠灰鈕、實點迎戰（無人死）；但勒索是直接注入的待決事件（狀態修改），只算畫面證據。test/v190（<8 人不來、不死、不傷孩童）；長跑 30 日每案山門重傷 1.83、死 0、付錢比例 40% |
| A9-PATROL | v1.9 | 因才派巡：按鈕依專長、久未巡山、心情低、舊搭檔／交情、換個走法打分，列出每人理由並勾好兩人；剛回山要歇的人不選 | **已驗證** | flow-v190 完整自然操作（開局→16 倍速等巡山→實點建議→理由含「專長」、勾選＝出發隊伍→回山後再點，剛回來的兩人不再被選＝反例）。注意：長跑機器人改用它後岳不群 1600 從 4/5 掉到 2/5，故長跑預設仍用 v1.85 挑人法（見 BALANCE-v190） |
| I7-ECO | v1.95 | 生態：各環族群上限＝基本上限×(巢毀 0.5)×(1−擊殺壓力，最多 30%，每日 ×0.85 衰減)；回補＝遷入（巢在 1、巢毀 0.5）＋logistic 繁殖；上限低於現有數時逐步減少；同一趟在某環擊倒 ≥4 隻→搗巢 5 日後重築（清過不等於永久安全）；族群欄與地圖巢點顯示現有／上限、巢毀倒數，≤30% 標紅；全程無亂數 | **已驗證** | flow-v195 完整自然操作（開局→16 倍速→實點因才派巡＋派出 3 趟→山腳壓到 ≤30%→停派後回升到 ≥60%；反例：回升逐步經過 9 個不同數值，不是永久清空也不是瞬間補滿）。test/v195；長跑 30／60 日 35/35 案都有環壓到 ≤30% 且回升（中位 2.5 日）。注意：族群目前不影響遭遇（「打空就跳過」試過，郭靖 30 日 0/5，未採） |
| PATROL-OUTCOME | v1.95 | 戰報互斥欄位（patrol-defense BL-D07）：遭遇＝擊倒＋驅離（敗逃未追到）＋繞避＋其他（守關撤退等）；逃兵被追到只算擊倒；搗巢寫入戰報 | **已驗證** | flow-v195 自然巡山戰報 13＝10＋2＋0＋1；test/v195 實跑恆等式＋擊倒數＝kills 合計 |
| A8-DESTINY | v2.0 | 宿命樹資料化：岳不群、令狐沖、張無忌、韋小寶、阿星、郭靖的主線步驟名，華山／江湖 30 張抉擇卡的標題、人物、文字、選項與價值觀增減移到 `src/destiny-trees.json`；張無忌／韋小寶／阿星的主線觸發改成宣告式檢核（步數區間、日、武學階、旗標、成功後推進），由 `src/data.mjs` 的 `destinyStep` 依序評估；效果函式仍在程式，依卡 id＋選項序號對應，數目不符就丟錯。岳不群／令狐沖的辟邪、思過崖、嫉妒觸發有狀態機副作用，仍留在 `hsStep`。純重構：golden、存檔格式、規則版本不變 | 已接線 | 無 UI 流程可驗（純重構）；test/v200 卡資料與重構前快照逐欄相同＋檢核器語義；artifacts/v200/parity-v200.txt 7 種開局×3 種子 30 日存檔雜湊前後 21/21 相同；60 日長跑與 v1.95 相同；artifacts/v200/smoke-v200 Chrome 載入 JSON（200）、韋小寶開局主線列顯示 JSON 步驟名、無頁面錯誤（展示證據）、shots/v200-01-load |
| V21-PLAIN | v2.1 | 照舊開局：第 15 日「無名主線」寫進宿命樹，無人點選就走第一條，兩條都把風雷掌腿教到大成；前 10 日香火 +4，之後聲望段 ×0.6；收支「明晨預計」用同一條公式。山門重傷後下次上門再晚 2 日；第 30 日後威脅天數改對數。丹藥分開記產出、治傷、賣出、陳化。規則版與存檔版不變 | 已驗證（限開局收支數字）；主線與第 11 日以後的曲線是已接線 | 已點：照舊開局明晨 +6；反例郭靖改選穆念慈是 +2（預設黃蓉是 +4，那是同伴加成）。test/v210。60 日長跑見 BALANCE-v210：plain 最遠 551–657（未到 700）、錢的倍率達標、山門重傷平均 3.83（未進 0.5–2）、丹藥比 1.14。沒有把 11 個遊戲日點完 |

### N54 第八輪畫面修正
- 頭上每人一行，依選中／主角／交手／練功等資料優先序避讓；滑過找回被收起文字。
- 肖像512px、刪除舊備份；逐檔授權與12MB護欄接CI。紀錄分頁底部署名致謝。
- 可重跑驗收見 [REVIEW.md 第八輪](REVIEW.md#第八輪n53n48n52n49n54-review-修正468482)。

### 第九輪 N37 checkpoint
共用真力/體重/部位→瘀青、皮破、筋傷、骨傷；瘀青只痛，筋骨按手側限制出招。招架/推力偏移重心，歸零有資料化長破綻。地圖人/獸/賊、試煉、反擊、範圍及duel/waves接同規則；局部hitstop唯讀且開關不改模擬。程式工具不代表桌面實拍或N55盲測通過，整輪及剩餘數值關卡尚未驗畢。

#### N50（第九輪）
新局兩位普通同行由出身/共用關係資料產生，舊存檔不換人。名俠與普通弟子共用食宿、師父實際可挪時辰、雙方處境與s.aff；可遇不等於可加入。指導真占兩人的站位/時間，缺課拖慢練功並留下念頭。三日三卡撤銷，無名俠硬上限。bot12常住名俠d10/d30護欄與桌面待驗，非宣稱整輪完成。

#### N38（第九輪工程checkpoint）
人物卡級名直接讀同一交手引擎的接法能力過半，不存等級/XP；逃敵優先、沒有才用標準敵人工廠。公開白身人格可重跑自然30日到達日與真最常用招，原始失敗保留。不是自然全場勝率，所有護欄/CI/第九輪收尾尚未全過；見REVIEW與r9-n38-levels證據。

### T1 測試整理（#393）
`test/unit/<系統>/` 便於按成長、經濟、威脅、人際、存檔和介面找回歸；`test/accept/` 保留長跑，`test/archive/` 保留通過的舊 bug 重現。#495 發現的 20 個失敗斷言保存在 `test/parked/`，由 #496 逐項追蹤，PR CI 暫不執行。`tools/diag/README.md` 列出每支診斷腳本用途。這是開發者測試入口，玩家模擬、畫面、規則 3.7 和 golden 均不改。

### N58 收徒三層（#489）

門規作息面板加收徒方針與人口上限；招收面板顯示名聲／自產成績、候選人的束脩或做工條件。付不起又無工作時可下山打工再返；少年郭靖作為普通候選資料列，帶基礎拳，不走長成名俠入門捷徑。外門若做工抵食宿每天多一項日課；師父了解全部性情並有足夠好感才願主考內門。規則 3.8 的公式與來源見 [recruitment.md](docs/systems/recruitment.md)。

N58 小修（3.81）：做工抵食宿讀當日未預約的實際工作格；同日兩位新人不共用同一格。錢 3 是相對原雇工日俸 2 的食宿與教學機會成本，非飯食市價；真飯仍須入庫才可用。

### 第十輪：羅漢拳與共用成長（#441）

藏經閣逐段讀《羅漢十八手》，掌握後人物卡可見六個一生修行階名與實戰、套路數。兩者都累積才升階；荒疏受同時練幾門影響。成長首行直接列本式前搖、反應下限、勁的真值；手眼熟平滑改善。普通日課不再彈出自悟整門、變式或字訣。規則 3.9 的公式、拳譜出處與舊檔換算見 [combat.md](docs/systems/combat.md)。

### N61 人物卡與能力圖（#493）

右欄人物卡把紙娃娃肖像、名字、門中身分、目前任務與六軸能力放在第一層；技能條、同門關係、性格及六軸原始數字可展開。淡線記入門日／30 日前，地圖人物與敵人或門人卡滑過時疊對手。快、眼、勁讀 N42 的真實底層，身、耐、招由同一轉接函式算出；`growth-metrics.mjs` 也讀該函式。歷史只在 UI 存檔附欄，不改模擬、規則 3.9 或 golden。

### N62 後山出獵（#504）

門規可准許或禁止弟子私自下山；弟子卡可明確指定出獵或巡山。允許時，糧食不足與練招心願各由原效用資料列決定：缺糧追可取糧且負荷較低的獵物，練招走本人能到的前三段路徑。出發理由與追蹤目標記在決策、日誌及戰報；前三段沿 N45 同尺地圖逐招交手。N35 悟招仍用既有規則，其設計重審和深谷補段已移至 backlog #506。規則常數與 4.1 遷移見 [自主出獵](docs/systems/autonomous-foray.md)。

- N51：東方不敗／火雲邪神有可讀登門理由，從山門邊緣走入；玩家應戰會看見逐招地圖結果。

- N44：弟子靠近可互相護住身後；熟識同伴在前搖間有機會截擊來招，山賊與獸群依來源組織程度輪流壓上。

### 第十二輪：人際記憶與四階設施（#458）

救過、並肩撐過圍攻、切磋落敗、拉住惱羞和傳藝，都會在人物卡留下可讀的原因；短期想法會淡去，大事保留。受救者的好感也進入同伴眼熟與掩護反應。一般可建設施和自然工作點從荒廢、修復、Lv1 到 Lv2，站位、治傷與守點效果讀取當前階段；擴建面板由弟子說明下一處的用處。版本與數值來源見[人際記憶](docs/systems/social-memory.md)及[設施階段](docs/systems/facility-stages.md)。

### Phase 4：終南荒山雙人隱居（#509）

新局可選主角與小龍女或黃蓉在終南茅廬起步，不帶出身同行者。主角起手純陽拳或羅漢拳；同住者只帶入門招，後續分卷需讀或由會的人教。隱居期無門派月俸與維護催繳，門派面板初始收折；全真武學與純陽拳十二式只在新路線出現。舊開局的模擬與 golden 保持原樣；Phase 4 的原設計及 R3 更新見[荒山雙人隱居](docs/systems/hermitage.md)。

### Phase 5：雜務、疲勞與藥膳（#510）

隱居角色做活可練體魄，疲勞滿了須休息或用藥膳；沒有藥膳，做活體魄停在 18。採藥後煮飯自動入藥，用飯減疲勞並在當天開更多恢復週期，讓體魄最多到 36。微距畫面以四階呈現動作逐漸俐落、痠痛與藥氣。舊門派局行為保持原樣；規則 4.4 和常數來源見[體魄與藥膳](docs/systems/body-condition.md)。

### Phase 6：由外而內、輕功與三階山崖（#511）

隱居主角把純陽拳或羅漢十八手練至既有 XP／體魄前置後，還要完成對應心法卷的真研讀；心法與身法前置滿足後再讀輕功卷。資源欄逐項顯示前置與已學標記。輕功提高荒山腳程，按身法火候逐階開三崖；角色可實際走上去採藥、挑靈泉、練功或拓錄高崖石刻卷，回山讀完才學會。舊局路線、武學候選與 golden 保持原樣；原 Phase 6 與 R3 更新見[山崖與輕功](docs/systems/cliff-qinggong.md)。

### Phase 7：雙人開山與雙堂傳承（#512）

首日即有「立匾開山」按鈕，由玩家選時機與道統，不自動彈卡。雙堂合宗把兩脈武學都列為本門正宗，新收弟子依性格與根骨分堂拜師；正宗立匾僅讓掌門、該脈授師與首徒讀另一脈秘傳；無名派則廣納兩脈。開山日重算十日俸期、名聲 +10、全派鼓舞，收徒、擴建和市集開始可用。雙劍合璧只在合宗且同場持兩脈劍招時提供指定倍率。Phase 7 原流程與 R3 更新見[隱居到開山](docs/systems/hermitage.md)。
