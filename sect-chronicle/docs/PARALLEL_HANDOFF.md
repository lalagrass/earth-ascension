# Earth 主專案與遊戲子專案的隔離接手計畫

## D33目前核心作者與整合包

已核#267／270合dev及各五項postCI成功；Gemini原#259收尾完成，不續舊claim。下一完整工程包為[#271／LP16](LP16_HANDOFF.md)／[提示詞](LP16_GEMINI_PROMPT.md)：本文件非作者接受／Earth合dev／postCI後，Gemini本人最新dev新claim，一位主筆同時完成局部素材、採藥視覺與長水路材質呼應、接線及必要文件，一個PR集中review。未代啟／預占，沒有另派Grok改同批檔案。

只寫LP16白名單，原模型／路線／atlas與長通勤速度差保留，完整地圖／第三角色延後；舊D32設計作者分工成為已交付歷史。依D31復用未變證據、必要當前CI與唯一queue，作者不更新8800；工程接受／實際合dev／postCI後遊戲PO更新同入口。#184／182母單保持OPEN。

## D32目前分工：Grok新視覺包，Gemini收尾原設計

擁有人已批准[D32](DECISIONS_AND_SOURCES.md#d32grok完整場景與三人人物設計批准2026-10-23)。主追蹤#184、配置連#182，讀[正式工作包](ART184_SCENE_TRIO_HANDOFF.md)與[Grok提示詞](ART184_GROK_BOT_PROMPT.md)。

| 主筆 | 本輪範圍／交接 |
|---|---|
| Grok（實際入口於claim自述） | D32文件接受／Earth合dev／postCI後本人#184新claim，只design/art184-scene-trio/**；整包主視覺、三人同框、女孩表情與來源配置說明，一個設計PR。可與267不同檔案並行，不自行接runtime |
| Gemini | 原#259／PR267的design/herb-life/**收尾，沿原作者／期限與review，不因Grok回來換人或加大重畫。後續整合另依選定差異／批准範圍新claim |
| 小說PO | 依人類跨聊天授權同步#251人物：女孩受寵／衣著較好、內向溫柔親切；堂弟村居偶訪。管理小說人設／必要旁註，遊戲PO與Grok不改小說檔 |
| 遊戲PO／Earth PO | 遊戲PO集中審設計與選採用差異；Earth保留唯一dev queue／當前CI與postCI。藝術設計合併不自動替換8800或宣稱角色已入遊戲 |

本地Grok可復用自有乾淨美術worktree（舊grok-art184），從最新dev新codex分支並保留舊branch；託管bot按repo／issue／新branch工作，不假裝能用本機絕對路徑。不要碰Gemini worktree、未提交內容或未公開圖。新總圖可自由提改配置／功能點，但標現況／景觀／未來候選與整合差異，不擅改遊戲幾何、規則或角色數量。

下方D31方法沿用；D25的Gemini接圖是歷史交接，現在只保留#267原範圍，新設計依本D32。女孩設定不使堂弟變長住，三人同框只代表一次聚在道館的視覺參考。

## D31：單一主筆完整工作包與集中審查

2026-10-23擁有人已批准，來源見[D31](DECISIONS_AND_SOURCES.md#d31單一主筆完整工作包與集中審查2026-10-23)／[#265](https://github.com/lalagrass/earth-ascension/issues/265)。本節是目前遊戲協作流程，覆蓋下方歷史「每個小task交接」的解讀，不改根契約或既有明示產品前置。

### 一包如何切與開發

- 以一個可見玩家結果切包，開工一次確認目標、3–5組完成條件、範圍／檔案、前置與時間；例如同一角色「採藥→疲累休息→恢復續工→畫面看懂原因」，不是把按鈕／精力條／移動分給不同人。範例不是新增玩法批准。
- 一個issue、一位實際主筆、一條短分支、一個交付PR。主筆負責整個已批准範圍的畫面、行為、接線、必要驗證與文件；可自行拆內部步驟／commit，用draft展示進度，但不強制每步交外部審批、換作者或另開文件PR。
- 依根契約從最新dev與有效claim開始；同包普通實作選擇依既有授權處理。只在新玩法／數值語義、相容性或白名單等未授權邊界停受影響部分，提出最小取捨；不擅擴範圍。既有明示「先交設計、再確認接線」仍只交完整設計包，不能靠本流程改成runtime。
- 兩小時包最多120min，100min後不加scope、達標早停；用少量進度紀錄＋Git保存已做／剩餘／證據，不建重複交接日誌。完整交review無可做項就停；到時未完交draft與缺口，不假稱完成、不自行再開一輪。原4h認領與補修規則保留。
- 核心實作一次一位主筆。只有已安排、檔案及契約獨立的研究／美術／另一產品才平行，用獨立worktree；不為每個內部步驟新建worktree，不讓多位一起改生活入口。不自行啟動其他agent／聊天／排程。

### 集中review與合併

1. 作者完成整包與自校，PR一次列3–5組驗收結果、實際head/base、少量可見證據、未完成與限制；必要文件同PR更新，不把作者自校冒充獨立review。
2. 遊戲PO／非作者讀完整受影響diff，核對證據，**一次整理已發現阻擋清單**。錯誤資料、命令／暫停副作用、原DoD缺漏、來源不實及相容風險需補；非阻擋美化／個人偏好／可選重構標建議並集中留backlog，不邊審邊擴DoD。新head有新問題可追加，說明新差異／發現原因，不承諾只准一輪。
3. 同一主筆集中補修，回填新head與對應結果。審查者重看差異與必要反例，復用未變結果；缺證據先指出可復用的最小補件，不一律要求作者重跑或另做一套示意稿。受影響的原驗收仍須成立。
4. 通過後一次將ready PR與審查結論交[#67](https://github.com/lalagrass/earth-ascension/issues/67)／Earth唯一queue。Earth依根契約核範圍、head/base、當前合併結果／必要CI並squash dev，不再重做一整輪遊戲體驗驗收；若有新差異、失敗或證據疑點仍補查。queue確認postCI後，遊戲PO回填結果；runtime入口由PO按既有權限更新並保留上版。

驗證、單一測試頁／服務、復用與收尾只引用[VALIDATION_POLICY](VALIDATION_POLICY.md)，工作包只加本次直接風險／例外。短進度是資訊，普通步驟不用等PO回覆；真正產品取捨仍交原決策者。

### 可複製的完整工作包提示格式

```text
你是<實際主筆>，完整負責<issue／一個玩家結果>。
先讀根及遊戲AGENTS／CONTRIBUTING、原issue最新狀態、正式工作包。
目標與完成條件：<3–5組可見結果>。
允許修改與保留邊界：<檔案／原規則／明示設計或實裝範圍>。
前置：<真實依賴與有效主筆>；通過後最新dev、新短分支與有效claim。
同一主筆完成整包，內部小commit／自校，不按步驟拆人、PR或逐張審批。
沿已批准的時間上限；完成即停，未完留head／已做／剩餘／證據，不自行續輪。
驗證依VALIDATION_POLICY，只補本次直接風險，引用未變結果／當前CI，測完清理。
交一個指dev的PR，附真作者／head/base／驗收／限制與必要同包文件。
非作者集中review→同主筆集中補修→Earth唯一queue／postCI；不自行合併。
新產品決策只停受影響部分，非阻擋建議留原issue／backlog後繼續。
```

**下一包Gemini**：先按[LP14提示詞](LP14_GEMINI_PROMPT.md)完成#257／PR261原補正；接受／Earth合dev／postCI後，依[LP15正式包](LP15_HANDOFF.md)與[可貼提示詞](LP15_GEMINI_PROMPT.md)新claim #259。由Gemini一次交整包桌面採藥設計；仍不自授接線，不逐張換人review。

## D30交接更新：桌面優先與最小必要驗證

[D30](DECISIONS_AND_SOURCES.md#d30桌面生活優先平台末位與精簡驗證2026-10-23)／[#262](https://github.com/lalagrass/earth-ascension/issues/262)更新平台與成本優先序。Codex遊戲PO只10MD，不碰Gemini PR261／未提交成果；Gemini先按桌面完成#257，#259仍等前置後本人新claim，只先桌面採藥設計。舊手機必交／必驗移末位BL-P01，不延長作者期限，不為文件審合停止已有桌面工作。

[局部驗證政策](VALIDATION_POLICY.md)覆蓋下方每包桌面390／全套重跑敘述：只驗改動直接風險，復用未變資料與當前CI，保留必要CI／非作者review／Earth唯一queue；不新建全裝置或矩陣runner，不把自校當獨立審查。原路線／數值／來源、worktree隔離與8800權限不變。

## D29最新交接：Gemini先完成LP14，LP15前置通過後才新認領（2026-10-23）

[批准D29](DECISIONS_AND_SOURCES.md#d29lp-15-採藥場景與動作質感-h1h4批准2026-10-23)／[#259](https://github.com/lalagrass/earth-ascension/issues/259)／[工作包](LP15_HANDOFF.md)／[Gemini prompt](LP15_GEMINI_PROMPT.md)。Codex遊戲PO只6MD批准同步；Gemini當前#257原O1–O4／期限不變，不動其worktree、未公開成果或branch。

LP15任何畫稿／素材／預演須#257最終接受／Earth合dev／postCI及本文件同流程完成後，才本人最新dev、新codex分支／新4h claim。可復用自己乾淨worktree但保護LP14分支與成果，不reset／force push／沿舊租期，不預占後包。只design/herb-life/**先設計PR，PO選採用差異再列有限接線，不動demo／atlas／共享README或8800。

本人新T0最多2h、100min後不加scope、達標早停，4h不延長；不啟其他agent／排程。確認空埠設計預覽，原同8800由PO保留接受版；設計／工程／美感與正式整合分開，必要檢查／未變證據復用／摘要真exit。下方D28等舊狀態讀各issue最新紀錄，不以歷史快照重做已完成補修。

## D28最新交接：#256補修先行，Gemini後續接LP14（2026-10-23）

擁有人同意O1–O4及兩小時有限循環，見[D28](DECISIONS_AND_SOURCES.md#d28lp-14-生活觀察介面-o1o4批准2026-10-23)／[#257](https://github.com/lalagrass/earth-ascension/issues/257)／[正式工作包](LP14_HANDOFF.md)／[Gemini prompt](LP14_GEMINI_PROMPT.md)。下方D25等設計分工留歷史，不用舊claim或prompt啟動新包。

| 角色／工作 | 現行邊界 |
|---|---|
| Gemini：#254／PR256 | 仍原作者／原分支的390可讀性有限補修，c34d413尚有P2；只按#254最新review／期限續修，不等D28文件、不插LP14設計或新UI，不碰PO文件 |
| Codex遊戲PO：codex/lp14-observation-approved | 只6MD批准同步／工作包與prompt，與256的runtime檔無重疊；交Earth非作者審合文件，不動Gemini checkout／branch |
| Gemini：LP14新工作 | 本批准文件及256修正版各自非作者接受→Earth合dev→postCI後，核最新dev／有效作者、新4h claim／新codex分支，才做畫稿與接線。未代啟／未預占後包；只LP14白名單 |

可重用自己的乾淨獨立worktree，但保留256原branch／未提交成果，不因squash分歧reset／force push／切他人分支，也不在子資料夾git init。新包兩小時從本人新T0算、100min後不加scope／達標停，4h不延長窗口，不啟其他agent／排程或自合dev。作者用確認空埠預覽，8800仍由PO在runtime接受／Earth合dev／postCI後更換並保留上一版。必要局部／SG快驗／根CI與桌面390、未變證據復用及摘要真exit，無額外大拆或長矩陣。

## D25最新分工：Gemini接手#182圖像設計與改圖（2026-10-23）

擁有人因Grok quota不足明確改派，依 [D25](DECISIONS_AND_SOURCES.md#d25-182-設計與改圖改由gemini接手2026-10-23)／[更新工作包](MAP182_HANDOFF.md)／[Gemini提示詞](MAP182_GEMINI_PROMPT.md)。下方D24的Grok圖像／Gemini整合改為歷史分工；Gemini現在接PR248剩餘設計與四項P2，保留Grok公開成果／原分支／審查，另從最新dev新claim／新接續PR。只design/map182/**，可沿乾淨的原grok-art184美術worktree，不能碰Gemini gemini-241 checkout或混244檔案。

建議先244原補修回review，再等審查時接圖；設計不等244合併、其原期限不變。D25文件審合／postCI後本人認領，不代啟作者。保留長通勤／觀看奔波、可自由延伸生活點與未來巡山構想；先交設計，擁有人看稿後確認實裝範圍，未授新玩法／遊戲接線或8800更新。必要局部驗收／CI與輸出成本沿原則，未變證據復用、不大重畫或跑長矩陣。

## 2026-10-23 D24最新分工：Grok圖像設計、Gemini功能與後續整合

以 [D24](DECISIONS_AND_SOURCES.md#d24-182-完整道館生活地圖設計與美術分工批准2026-10-23)、[#182](https://github.com/lalagrass/earth-ascension/issues/182)、[MAP182工作包](MAP182_HANDOFF.md)／[Grok提示詞](MAP182_GROK_BUILD_PROMPT.md)為準；下方D23及更早quota／分工保留歷史，不作開工指令。

| 實際主筆／目錄 | 當前範圍與交接 |
|---|---|
| Grok Build：`/Users/chenyuying/workspace/earth-ascension-grok-art184` | #245已合；保留原codex/art184-grok-build。D24文件合dev／postCI、目錄乾淨且無重疊作者後，從最新origin/dev另開codex/map182-dojo-design、新4h認領#182。**僅design/map182/**圖稿／來源／分鏡或短片，不寫遊戲程式。不等#244才可設計 |
| Gemini：`/Users/chenyuying/workspace/earth-ascension-gemini-241` | 先依原#241／PR244 scope與期限補修；Grok不動其檔。後續待#182看稿、擁有人確認實裝範圍與新工作包，再本人新claim整合圖像，不塞入244 |
| Codex遊戲PO：自有PO checkout／codex/map182-design-approved | 本次9MD批准同步／交接；非作者review與Earth唯一queue後回填issue，不代啟作者 |

Grok可自由擴完整道館／生活點／未來巡山視覺，分清現有與未來候選。設計與功能補修不重疊檔案可並行；未來Gemini才接地圖、路線、圖層與素材，本次未授runtime。D23／#184局部實裝暫後，舊Grok prompt不可因#244合併就自啟；整合主筆已換Gemini，須新範圍與認領。

兩個worktree各有index／檔案但refs共享；不reset／force push／stash他人內容或切他人分支，原245經squash後不假設可ff-only同步。Grok只在新設計目錄寫自有README／來源，不改共享實驗README／demo／checks或Gemini的branch。各自用確認空埠預覽，8800仍由遊戲PO維護已接受生活版；不新建repo、不啟其他agent／排程或自接下一包。

## 2026-10-23 D23現行分工：Gemini生活核心、Grok Build有限美術

以 [D23](DECISIONS_AND_SOURCES.md#d23-184-局部美術整合-v1v4-批准2026-10-23)、[#184](https://github.com/lalagrass/earth-ascension/issues/184)／[#241](https://github.com/lalagrass/earth-ascension/issues/241)及 [正式工作包](ART184_HANDOFF.md)／[Grok Build提示詞](ART184_GROK_BUILD_PROMPT.md)為本輪入口。下方2026-10-18的Grok單核心／Gemini quota與示意路徑是歷史，不能用來重分配當前有效作者。

| 角色／工作目錄 | 本輪所有權與下一步 |
|---|---|
| Gemini：`/Users/chenyuying/workspace/earth-ascension-gemini-241`，`gemini/lp12-rat-autonomy` | #241／PR244有限補修；精確檔案／期限看原claim和最新審查。Grok、PO不寫此checkout或處理未提交成果 |
| Grok Build：`/Users/chenyuying/workspace/earth-ascension-grok-art184`，`codex/art184-grok-build` | #184／PR245原美術包／到期播放補修，只原design/art184-grok/**。本次V1–V4不是加到此PR的範圍 |
| Codex遊戲PO：自有PO checkout／`codex/art184-v1-v4-approved` | 本次僅7MD批准同步、工作包與prompt，不改以上兩位作者的檔案；交Earth唯一queue審核整合 |

批准文件可先合；本文件與PR244／245各新head非作者接受、合dev及postCI後，Grok才在自己的乾淨worktree從最新dev另開例如`codex/art184-v1-v4-integration`的新分支、新4h認領V1–V4。保留原245分支；squash後不要為了同步而reset／force push或切別人的branch。若新runtime已有重疊作者先協調，不預占後包。

本包只允許新design/art184-integration/**、demo/assets/art184/**與必要app背景接線／局部檢查／實驗README（依正式白名單）；模型與其他UI不動。兩個checkout／index分離，但Git refs共用，仍不能操作他人branch／worktree。各自確認空預覽埠、使用自有輸出；8800由遊戲PO在接受／postCI後更新並保留上版，作者不啟停他人服務。不在子資料夾git init，不拆repo／換引擎，不啟其他agent或排程。

## 2026-10-18歷史交接（保留來源，現況以上方D23為準）

**D8最新交接優先**：[REALTIME_LIFE_SLICE.md](REALTIME_LIFE_SLICE.md)與RT-00 #99／總單#93取代下方從SG-01或先SG-06的舊啟動prompt。仍由原Grok單一核心agent串行，Earth PO唯一整合負責人；Gemini不參與。戰鬥延後，先交可暫停即時自主生活的契約、核心、存讀、UI與試玩；不因即時改造同時派多agent搶engine。

更新：2026-10-18。使用者澄清：並行是「一位開發上層 Earth 模擬、一位開發下層遊戲」，不是兩位一起拆 SG 任務。Gemini quota 已用完，本輪不參與；任何任務與審核不得依賴 Gemini。產品分工已由擁有人於同日指定：Earth PO（Codex，本 PO 聊天）管理 Earth 並兼任唯一共用合併佇列負責人；另一個 Astra 聊天為遊戲 PO。開發主筆仍以各 issue 的實際認領為準。

## 1. 建議：同一 repo，兩個分開的 worktree

保留 `sect-chronicle/` 作為 Earth repo 內的子專案，不在子資料夾 `git init`，暫不拆成另一個 repo 或 submodule。

示意路徑（尚未建立）：

```text
workspace/
  earth-ascension/                  # 既有 checkout：Earth agent 使用
    earth_ascension/                # 主模擬
    tests/                         # 主模擬測試
    sect-chronicle/                 # 已合併的遊戲版本；Earth agent 不修改
  earth-ascension-game/             # 另一個 worktree：遊戲 agent 使用
    earth_ascension/                # 完整 checkout 中仍有主模擬；遊戲 agent 不修改
    sect-chronicle/                 # 遊戲 agent 的工作範圍／常用 cwd
```

第二個 worktree 放在既有 repo 外側的同層目錄，或工具管理的獨立位置；不要建立在既有 `sect-chronicle/` 裡。worktree 分離的是整個 checkout，不是只把一個子資料夾切出去。兩者共享 Git 歷史與物件，但有各自的分支、index 和工作檔案。

只把兩位 agent 的 cwd 設成父／子資料夾仍然共用相同 index 與分支，容易互相 checkout、stage 或提交對方內容；因此不建議作為並行隔離方式。

## 2. 檔案所有權與分支

| 角色 | 開發範圍 | 分支與 PR | 不在其範圍 |
|---|---|---|---|
| Earth agent | 原本已認領的 Earth issue，例如 earth_ascension/、主專案 tests/ 與對應 docs/m2 或 docs/m3 文件 | 各 issue 短分支，PR 指向 dev | sect-chronicle/；未批准的 Earth M3 實作 |
| 遊戲 agent | sect-chronicle/ 下的文件、js、test、tools、HTML/CSS；SG-01～SG-12 | 例如 codex/sg-01-foundation，每個任務一個小 PR，指向 dev | 主模擬、根目錄 tests/、兩個舊原型、SG-14 起擴充 |

根目錄 AGENTS.md、CONTRIBUTING.md、CI、依賴設定與共用啟動腳本屬共用檔案；需要修改時另開協調 issue，指定單一主筆。遊戲測試放 `sect-chronicle/test/`，不要混入根目錄 Python tests。

工作範圍是協作規則，不是檔案權限沙箱。每次提交用明確檔案路徑 stage，核對 staged diff，避免 `git add .` 混入其他未追蹤原型。

## 3. 啟動順序

1. 先將核准文件作為獨立文件提交／PR，按根目錄流程合入 dev。第一批文件已由 #70 合入（`7510a8b`）；設計 0.2（D6）修訂另以 SG-00b 文件 PR 獨立審核，合併後以含 0.2 文件的 dev SHA 為 SG-01 基底。
2. 文件 PR 只納入 `sect-chronicle/` 的 Markdown，不把 guwu-game/、sect_ascension/ 或其他使用者未追蹤資料一起提交。登記實際主筆、文件 issue 與最新 dev SHA。
3. 遊戲 agent 從含批准文件的最新 dev 建立獨立 worktree 和 SG-01 短分支。保留現有 Earth checkout，不自動切換其分支或搬移其未提交變更。
4. 遊戲 agent 從自己的 worktree 閱讀根目錄契約，再以 `sect-chronicle/` 為日常 cwd。確認 `git rev-parse --show-toplevel` 指向遊戲 worktree，不是原 Earth 目錄。
5. 註冊 SG-01 issue／實際主筆與基底後開始；SG-01～12 已批准，不重問 D1–D5。SG 任務按既定依賴依序完成，由同一遊戲 agent 接手即可。
6. 每個 PR 合入 dev 後，下一任務由最新 dev 建新短分支；可在乾淨的遊戲 worktree 繼續，無需每個 task 都新增 worktree。若有未提交變更先妥善保存，不強制 reset。

舊原型不是新遊戲的 runtime 依賴，無須為了啟動遊戲 worktree 而整包複製。必要時由原工作目錄唯讀參考；來源 hash 見決策文件。若執行環境無法讀取原型，報告缺少的參考，依已批准契約實作，不假稱已完成原型回歸。

## 4. 合併與執行隔離

- Earth 與遊戲可同時開發，SG 開發不依賴 Earth M3 實作批准；也不能反過來把 SG 的授權當成 Earth M3 授權。
- 兩邊都往 dev 提 PR；各產品 PO／審查者準備證據，由 Earth PO 作為唯一共用 queue owner 依貢獻契約安排並執行 squash merge，不要求已退出的 Gemini 核准。共用帳號下的自我留言不算獨立審核。
- 功能分支不互相合入，也不互相 cherry-pick 未合併的程式；各自更新已核對的 dev。共用契約若有變動，更新基底後重跑受影響檢查。
- 每專案一個核心實作工作包；文件及唯讀審查可平行。ready PR 交共用 [#67](https://github.com/lalagrass/earth-ascension/issues/67) 佇列。基底無關文件前進時，按 CONTRIBUTING 記錄 head/base/merge tree，可復用未受影響的審查證據；必要 CI 仍驗證當前合併結果，不機械式要求所有作者更新。
- 各自在自己的 checkout 執行測試。遊戲 worktree 跑本地遊戲測試與根目錄要求的 Earth 回歸；它不會測到另一 checkout 尚未提交的 Earth 改動。共用 CI 的 `game-test` 以 Node 22／24 跑 `node --test sect-chronicle/test/*.test.js`；SG-01 未合入且 `js/`、`test/` 都不存在時僅記錄 bootstrap，任一目錄出現後缺測試即失敗。
- 若同時啟動兩個網頁服務，使用不同埠，避免 localStorage origin 混淆；遊戲維持獨立存檔 key。開發伺服器的實際埠由啟動文件記錄，不沿用原型埠作硬假設。
- SG-00 文件整合與工作區交接進度以 [#69](https://github.com/lalagrass/earth-ascension/issues/69) 為準；本文件不代表已啟動或訊息通知其他 agent。

## 5. 可直接交給遊戲 agent 的接手訊息

更新：原交接訊息須搭配 [設計 0.2 開端修訂](OPENING_REVISION.md)。D6 已批准；接手保留並納入本地文件修訂，不再按四人開局／開局掌門實作。Earth／遊戲 worktree 隔離及 Gemini 不參與的安排不變。

> 接手 Earth Ascension repo 內的 sect-chronicle 子專案。專案擁有人已於 2026-10-18 批准 D1–D5、D6（設計 0.2「道館成為門派」）、14 天切片與 SG-01～SG-12（含新增 SG-02A／SG-04A），不需要重問產品授權；28 天擴充未批准。請同時讀 sect-chronicle/docs/OPENING_REVISION.md，不再按四人開局或開局掌門實作。請讀根目錄 AGENTS.md、CONTRIBUTING.md 及 sect-chronicle/AGENTS.md、README 與 docs/PARALLEL_HANDOFF.md。先確認批准文件已納入 dev，依貢獻流程登記 issue、實際主筆與 base dev SHA，使用獨立遊戲 worktree；保留既有 Earth checkout 不動。從 SG-01 開始，按依賴逐任務交付小 PR 到 dev。程式與測試僅修改 sect-chronicle/，不要改 Earth 模擬或兩個舊原型。Gemini 本輪不參與，不得等待或分派任務給 Gemini。交付附實際測試、版本影響與未完成項；SG-12 完成後交付可試玩的切片與真人試玩交接，不自行開發 SG-14。

Earth agent 不需要因遊戲啟動改變原本任務；只需知悉 `sect-chronicle/` 已由另一工作區負責。未經使用者授權，本文件不代表可向另一 chat 發送訊息或新建 chat。
