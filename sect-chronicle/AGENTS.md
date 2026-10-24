# Coding agent 接手入口

## D46最新：成熟門派反推初始道館，先交完整場景設計

擁有人已要求先以成熟門派總配置反推初始破道館，再接系統。下一包為[SCENE-04正式設計包](docs/SCENE04_HANDOFF.md)／[Grok提示詞](docs/SCENE04_GROK_PROMPT.md)，主#182／美術#184、BL-V05。成熟／初始／中期同母版、真水彩圖、合理水地門路與功能鄰接、長通勤速度差／生活動線、可分層來源與工程差異，一Grok一PR集中review，不逐張簽核。SCENE02／03既有成果沿用。

PO核對時309未有Grok工程claim／實作PR，故先本設計、#309 D45批准保留而工程順延；若核對前確已開工，回報真head保留該包、串行設計，不強停覆寫／雙claim。D46文件審合／postCI後本人182最新dev新claim／支線與隔離區；PO文件不代領圖稿。本次只授設計，不改runtime／路線／數值／8800、不自動批准床睡／膳房／建造；設計後集中選初始場景整合與309相容接續，手機與新增保存仍最後。下方舊「下一包／可立即接309」為歷史，以本節與最新issue為準，未代啟Grok。


## D45最新：統一生活補給與生活總覽／武學成長

擁有人已批准統一補給；PO核309無Grok工程claim／支線／PR，併修尚未開工原[#309](https://github.com/lalagrass/earth-ascension/issues/309)。讀[正式包](docs/LIFE03_HANDOFF.md)／[Grok提示詞](docs/LIFE03_GROK_PROMPT.md)：撤獨立口渴衰減／自主喝水及水分主條，主要日常狀態為精力，休息與手動一次茶為補給，水藥是物資。茶水1＋藥草1、煮6秒／喝4秒、精力＋40上限100與不疊坐休保留，取消舊水分＋60；不加飢餓／營養／農獵新鏈。面板固定人物資訊＋生活總覽／武學成長，真資料／小事可讀，必要局部整理同包。

308已發布同8800，D45文件審合／postCI後才本人309新claim／當時最新dev新支線；不沿舊D44 prompt。若發現核對前已開工成果，先回報、保留該包另排新方向，不覆寫。只讀舊保存格式／最小相容與guard保資料，不升存檔；長通勤速度差、整包集中review／精簡驗證／單一版本保持，手機與新增保存最後。下方水分回饋／待選A/B為歷史，以D45有限更新為準，未代啟Grok。

## D44已批准：先收尾308，再整包SG-LIFE-03

擁有人已同意MS1–MS4及茶示意值，主[#309](https://github.com/lalagrass/earth-ascension/issues/309)，[正式包](docs/LIFE03_HANDOFF.md)／[Grok提示詞](docs/LIFE03_GROK_PROMPT.md)。水1＋藥草1、煮6秒／喝4秒，完成水分＋60／精力＋40各上限100、不疊坐休；茶用途、現在／原因來源／下一步與真成長小事卡、必要局部意圖整理一Grok一PR。U3／MS待批字樣在本有限批准範圍解除，其他母題不解鎖。

先原305／PR308最終補修非作者接受／Earth合dev／postCI且PO更新唯一8800，本批准文件審合／postCI後才本人309新claim／當時最新dev新支線與隔離區；不占308原scope／期限或增加DoD，不預占後包。原長通勤／體態速度差／玩法保留，茶一次手動、完成返院待命，較新改令／停工優先；新暫態限本局、不升存檔，手機與新增保存最後。整包集中review／精簡驗證／清理／唯一queue與單版本照正式包，沒有代啟Grok。下方「待確認」為舊提案狀態。

## D43目前下一整包：SG-TRAIN-01已批准

擁有人明確同意T1–T4，主[#305](https://github.com/lalagrass/earth-ascension/issues/305)，讀[正式包](docs/TRAIN01_HANDOFF.md)／[Grok提示詞](docs/TRAIN01_GROK_PROMPT.md)。LIFE02／PR302＋304已接受／合dev5dd0222／postCI成功並發布同8800，不重做下方D42或場景。**本批准文件非作者接受→Earth合dev／postCI後**Grok本人305新claim／當時最新dev新codex支線、自有隔離工作區，沒有代啟或預占工程。

一Grok完整訓練模型／場景動作／成長回饋／最小UI／原清鼠巡山接線一主PR，做到A–D完成再交回。已批准示意12秒完整單位／6單位／每秒1精力、原掌法novice→adept節奏；必要自理後只續有效目標、達標返院休息待命、最新改派／停工不被搶回，原當趟資源進度保留。新進度／目標限本局，結果沿原palm合法欄位，不升v3或改life-save；最小guard／載入原子性、移除玩家fixture UI但保留測試API依正式包。原幾何／長通勤／體態速度與玩法不變，手機／新增保存最後。

必要指令意圖局部整理同包，不建通用架構；四組驗收／白名單依正式包，集中review、直接反例／證據復用、一頁一服務清理、Earth唯一queue與單一試玩版本保留。無2h／4h開發總限時，4h為可附具體進度續claim，review／queue不續租；達標停，不啟後包。

## D42已批准：SG-LIFE-02自主補水與一次同門招呼

擁有人已確認P1–P4，主[#300](https://github.com/lalagrass/earth-ascension/issues/300)，讀[正式工作包](docs/LIFE02_HANDOFF.md)／[Grok提示詞](docs/LIFE02_GROK_PROMPT.md)。SCENE-03／PR298已接受、Earth合dev ef84c60／postCI40077720968成功並更新唯一8800，不重做下方歷史等待。批准即時有效，正式包公開後Grok核無重疊作者、本人300新claim／當時最新dev新codex支線、自有隔離工作區；文件queue不另加開工gate，PO文件claim不占runtime，未代啟bot。

同Grok完整模型／雙人真招呼回應／最小UI／接線／必要局部整理一主PR：自主補水實存≤3啟動、6結束、實存＋在途6不新增自主出發，原手動持續工作與容量8保留；雙方自主有空才4秒招呼，完成一趟新工作才再發起，人工改派／停工不被搶回。新方針／互動只本局，不升存檔；有限guard不覆寫舊檔、載入成功才重設暫態／暫停，失敗不動當局。原幾何／長通勤／速度與玩法保留，完整社交／人格／床睡／真武學等未授；手機與新增保存末位。白名單／四組驗收依正式包，無全面重構或全矩陣前置。一人整包集中review、精簡驗證／清理、4h可續租期／待審不續租、Earth唯一queue與單版本維持；沒有開發總限時。

## D41已批准下一包：296通過後整包整合新山居場景

擁有人同意[SCENE-03正式包](docs/SCENE03_HANDOFF.md)／[Grok提示詞](docs/SCENE03_GROK_PROMPT.md)，主182、來源184。先原Grok完成296三P2、最終head非作者接受／Earth合dev／postCI並由PO更新唯一8800，再本人182新claim、當時最新dev新codex支線／自有工作區接續；原296 scope／補修窗口不變，本文件可先整合，不作296前置，也不另以本文件queue增加等待。未滿前置可讀資料，不先畫圖／烘焙／預演或占工程。

一Grok一PR完整素材／分層／視覺renderer與接線，實際院落／藥圃／西坡／長路水系落地，不再先交概念稿等逐張簽核。世界1600×1350與原水藥路、最終接受巡山幾何／端點、長通勤／體態速度與玩法保留；model／routes／water-layout／palm／patrol／patrol-layout／life-save與版本key只讀，不加保存升版／遷移。293設計只採本次選定美術差異，床睡／新AI／擴圖仍未授。四組驗收、必要局部視覺整理／缺圖補、集中review／證據復用／單頁清理／Earth唯一queue／單一試玩版照正式包，未代啟或預占Grok。

## D40未來存讀後排：不打斷已開工290

擁有人最新澄清：「他在工作了，不用急著取消，後續排定計劃時，把存檔部分移除，排到backlog最後」。**Grok已認領#290的原範圍照常，包括既定v2／v1相容與必要驗收；不取消、不停用、不倒回成果、不重置原claim。** PO先前要求本290抽掉存讀的即時留言已撤回／更正，PATROL01正式包與提示詞仍有效，不等本政策文件合併才繼續。

後續尚未定案／未開工的工作包，以可見生活、場景與玩法為目標，不再自動加存檔升版、遷移或擴充保存／相容驗收作共同前置。統一列[FUTURE_BACKLOG最後BL-P02](docs/FUTURE_BACKLOG.md#bl-p02新增存讀升版與遷移最後)；另獲擁有人確認才排期。既有資料與已交功能不因此刪除或靜默破壞，真遇不相容先列最小處置與取捨，不能用此政策假稱新狀態可存、清檔或忽略已承諾驗收。原集中review、必要差異驗證與單一試玩版不變。

## 2026-10-24目前接續：先交回293補修，再同Grok整包290

第一版D36／282與D37／289已接受、Earth合dev `4f0bf8f`／postCI40056166835五項成功，唯一8800已更新並清舊部署；D38正式文件亦已整合。擁有人本輪批准Grok先按原review／原窗口收尾293標註裁切，推新head與必要證據、#182回填review後，即可#290本人新claim／當時最新dev新分支接續[巡山正式包](docs/PATROL01_HANDOFF.md)／[最新提示詞](docs/PATROL01_GROK_PROMPT.md)。不等293審合／postCI或本提示詞更新合併才開發，不重做第一版／預占未開工工程。PO文件claim不占作者設計／runtime；同作者串行、原補修責任與根認領規則保留。

290一主筆一PR完整交路線、對手、耗能返程、戰報、必要保存與水彩接線；PF1–PF4／原長路速度與數值不變。293新全景／宿舍仍獨立設計，未授整圖替換、床位睡眠／建造。集中review、必要差異驗證／證據復用／清理、Earth唯一queue與單一試玩版照舊。下方「等第一版」為已完成的歷史前置，不能再次阻擋接續。

## D39新增獨立場景設計：不更動原第一版／巡山

擁有人直接要求Grok再次重設完整場景、納backlog與水系合理性，另研究宿舍床位。讀[#182設計整包](docs/SCENE02_HANDOFF.md)／[Grok提示詞](docs/SCENE02_GROK_PROMPT.md)及[床位開源研究](docs/ROOM_BEDS_RESEARCH.md)。同Grok交完289／本輪必要補修可於等待整合期間182新claim、只寫design/art182-scene02/**；不等新文件merge或290實裝才畫圖，PO#75文件claim不占圖稿目錄，不能同時互改runtime。

新包交全景／水源至下游／坡地與門路、宿舍一床→雙床／擴房、行走分鏡、backlog狀態與整合差異／來源。只是設計與研究，沒有床位／睡眠／建造runtime批准，不能改demo／路線／D38值／存檔／8800。原282／289審查與必要補修、第一版出口／290接續照舊；新圖不加原第一版DoD或成巡山硬前置。整包集中review／少量圖文驗證／單頁清理／4h可續租期／Earth唯一queue維持。

## D38下一包已批准：第一版後巡山與返院戰報

擁有人同意PF1–PF4，讀[#290正式包](docs/PATROL01_HANDOFF.md)／[Grok提示詞](docs/PATROL01_GROK_PROMPT.md)與[D38](docs/DECISIONS_AND_SOURCES.md#d38sg-patrol-01-pf1pf4批准2026-10-24)。Grok先收尾#279／PR282及#184／PR289，兩部分接受／Earth合dev／postCI且PO記單一8800第一版更新、本文件接受／整合／postCI後，再290新claim／最新dev新支線。未到前置不預占工程；本文件不擋原第一版／不改原作者租期，D37不等282合併可接續的批准保留。

一條西坡路、有限林鼠與同一豬、真移動迎敵／留回程、人工召回與真戰報，模型／場景／UI／必要v1→v2相容同作者一PR整包。不逐項交接；只新巡山有示意值，原長路／速度／玩法保留，完整安全區／繁殖／人傷掉落XP／輕功仍未授。規劃文件不代表工程已啟動。集中review、差異驗證／清理、4h可續租期、Earth唯一queue與單一試玩版照舊。

## D37最新：Grok全場景水彩整包與自主權

擁有人已批准[全場景工作包](docs/ART184_WATERCOLOR_HANDOFF.md)／[Grok提示詞](docs/ART184_WATERCOLOR_GROK_PROMPT.md)，主184／配置182／生活閉環279。**排程更正立即生效**：取消先等PR282接受／合dev／postCI才可開發全場景的誤設等待。同Grok現在可184新claim，最新dev新支線普通merge本人282公開候選、標depends282及已知阻擋，接續完整場景；原282缺陷仍在原支線修好再同步，原補修期限不重置。兩候選最後集中review、Earth依282→場景整合／postCI才發布；不再等本更正文件PR合併才動手。PR278只是已交的局部素材整合，第一版另需D37整張真遊戲地圖風格一致，不追溯改278驗收。

Grok可在遊戲層自主整理場景／renderer／資產管線／必要等價介面、改場景設計，並增加本次觀看／操作相關功能，詳正式包；不再只准薄接線，也不逐模組請示。長通勤／速度差／玩法與存讀相容保留；新增世界規則、跨Earth／小說／根依賴付費等仍按原權限，不清空backlog。既有素材優先、缺圖補，一作者完整交付集中review，必要差異驗證與清理／Earth唯一queue／單一8800／無執行總限時但4hclaim可續照舊。此文件／prompt不代表已啟bot或新圖已交付。

## D36最新：美術收尾後連續飲水與存讀，完成後集中review

擁有人已明確批准「包含：美術收尾＋SG-LIFE-01，採M1–M4建議」，讀[正式工作包](docs/LIFE01_HANDOFF.md)／[可貼Grok提示詞](docs/LIFE01_GROK_PROMPT.md)。舊#279待決與D35完成即停止於美術的安排被本有限批准更新；PR278兩P2仍須原Grok先修，不因產品批准變成已接受。

正式文件非作者接受／Earth合dev／postCI後本人#279新claim；同Grok先D35自校checkpoint，再從最新dev新支線普通merge本人美術checkpoint、標depends278，連續完成飲水＋存讀一主PR。不每個內部批次等review，也不自合dev／更新8800；下次非作者集中review、Earth按依賴整合。沒有執行總限時、完成早停，4h租期可憑進度續；仍不得自啟agent／排程或預占未開始後包。D35範圍以原包收尾，飲水／存讀只用LIFE01新白名單。


## D35最新：Grok獨立素材後接實裝，做到完成

擁有人保留Gemini完成#274，另批准[#184完整工作包](docs/ART184_PRODUCTION_HANDOFF.md)／[Grok提示詞](docs/ART184_PRODUCTION_GROK_PROMPT.md)。D35文件接受／Earth合dev／postCI後Grok本人184新claim，A僅design/art184-production/**可並行出圖；B等LP17最終非作者接受／Earth合dev／postCI後，同Grok依新白名單接續同一主PR。不要改Gemini作者／scope／原期限或未公開成果，182只互連。

本Grok包不設4h／2h執行總上限、100min凍結，按A–D做到完成；根契約4h是可附新證據續的認領租期，不是交付倒數。受阻／額度中斷保存成果與續接點，不空等或自啟agent／排程。長通勤／原模型速度／動作契約、D31整包集中review、精簡驗證與單一試玩版本照舊，未代啟Grok。下方D34的Gemini2h不套用這個Grok包。

## D34目前下一包：場景與雙人美術，正式試玩只留一版

LP16／PR273已合dev `a363c7b`／postCI39976283668五成功，#271結案。下一包[#274／LP17工作包](docs/LP17_HANDOFF.md)／[Gemini提示詞](docs/LP17_GEMINI_PROMPT.md)：道館院落、長路環境與兩位活動人物一起改善，一位Gemini完整素材／烘焙／接線PR集中review。本文件非作者接受／Earth合dev／postCI後本人最新dev新claim，不沿LP16舊prompt。長通勤、原幾何／速度／成長與動作契約保留；全台地搬遷／女孩AI／新玩法延後。

擁有人已取消試玩回退入口，按[單版本政策](docs/VALIDATION_POLICY.md#單一正式試玩版本)：同8800只維持當前接受版，不常駐舊部署快照／備份tar／版本選單；更新後清自有舊部署副本，Git歷史／來源／作者worktree與少量證據保留。下方歷史「保留LP14／上一版」不再是當前要求。D31整包、兩小時早停、精簡驗證與清理照舊，未代啟Gemini。

## D33目前下一包：Gemini整合美術與採藥視覺

#267／LP15設計已合dev `0403c10e`／postCI39966426048五成功；#270／D32候選已合dev `089eb39d`／postCI39966737757五成功。下一包為[#271／LP16正式工作包](docs/LP16_HANDOFF.md)／[Gemini兩小時提示詞](docs/LP16_GEMINI_PROMPT.md)，本文件非作者接受／Earth合dev／postCI後本人新claim。下方「Gemini收尾267／等待257」是歷史狀態，不重做已完成前置或沿舊prompt開工。

同一主筆整包完成藥圃／藥架／簍具／四段採藥視覺與長水路局部材質呼應，一個PR集中review。原長路、坐標、模型／速度／成長與兩人fixture不變；Grok全景只作風格參考，不直接當地圖／atlas，不實裝三層台地換位或女孩AI。白名單與四組驗收以LP16為準；D31、桌面優先與精簡驗證照舊，8800只在工程接受／合dev／postCI後由PO更新。#184／182母單保持OPEN，未代啟Gemini。

## D32最新美術分工：Grok完整場景與三人設計，Gemini保留LP15收尾

擁有人已批准[D32](docs/DECISIONS_AND_SOURCES.md#d32grok完整場景與三人人物設計批准2026-10-23)，讀[#184正式設計包](docs/ART184_SCENE_TRIO_HANDOFF.md)／[Grok接手提示詞](docs/ART184_GROK_BOT_PROMPT.md)，聯繫#182／小說#251。Grok可自由提出更合理的道館、村落通路、長通勤與外圍山林配置，完整主視覺與三人同框一包交付，不把線框／規格表當出圖。

女孩自幼被收養且受大家疼愛，穿著較好、清秀有靈氣，內向但溫柔親切、會鼓勵主角；堂弟**住村莊，偶爾上山**，不是道館固定居民或每天三人工作隊。姓名仍為小說工作名，三人圖不自動增遊戲角色／規則；小說PO獨立同步其人設文件。

本D32文件接受／Earth合dev／postCI後Grok本人在#184新claim，只寫design/art184-scene-trio/**；不等#267合併才可做獨立新設計。Gemini仍原主筆／原期限收尾#259／PR267，不換人、不重做；兩者檔案分離。Grok不接runtime，Gemini後續依選定差異與另定工程範圍整合，不自動採全圖／換路線／加女孩AI。D31整包集中review、D30桌面優先及VALIDATION_POLICY照舊；下方D25的Gemini改圖分工不再支配本新包，舊成果／來源保留。

## D31目前協作方式：一位主筆完成整包，集中review

依擁有人[批准D31](docs/DECISIONS_AND_SOURCES.md#d31單一主筆完整工作包與集中審查2026-10-23)，以[完整工作包流程](docs/PARALLEL_HANDOFF.md#d31單一主筆完整工作包與集中審查)為準：一個玩家目標、3–5組驗收、一位主筆、一個PR。主筆在已批准範圍自行完成畫面／行為／接線及必要文件，內部拆commit與自校，不按按鈕／圖稿／接線步驟另派人、另開審批或文件PR。非作者集中列阻擋、同主筆集中補修，非阻擋美化與重構留backlog。

驗證只補受影響部分；作者證據可供review，審查者核diff及可信度，不重複全套。Earth仍是唯一dev queue；不自行啟其他agent、合併或擴新玩法。下一包Gemini讀[LP15工作包](docs/LP15_HANDOFF.md)／[提示詞](docs/LP15_GEMINI_PROMPT.md)：先完成#257原補正，整合後才新claim #259，整包交桌面採藥設計。**既有明示設計先行的界線保留，本流程不自授LP15 runtime。** 下方逐任務小PR等歷史文字不得解讀成同包內每步都要交接。

## 測試方法必讀：單一頁面、差異驗證、結束清理

所有遊戲作者與PO依[VALIDATION_POLICY](docs/VALIDATION_POLICY.md#統一執行步驟與資源上限)規劃／執行／收尾，工作包只列當次風險與例外，不再自行附全套測試／設備要求。純文件不開瀏覽器；一般最多一個本地測試分頁、一個臨時服務、一套本地測試，重用同頁。

測完先暫停、存少量證據，成功／失敗／時間到都關閉自建頁與自有臨時程序、還原viewport並確認；預設不留常駐遊戲頁，只有使用者明確要求才保留一個暫停頁。不碰使用者頁／其他作者服務／正式8800，不整個關Chrome／Codex。逾時或機器變慢停止新增測試，最多一次最小清理確認後如實回報，不反覆開頁／重試。未變證據／當前CI復用與必要高風險驗證沿原政策。

## D30最高優先：桌面生活先行，手機與冗餘驗證延後（2026-10-23）

擁有人直接要求把手機這類項目排最後並簡化驗證，見[D30](docs/DECISIONS_AND_SOURCES.md#d30桌面生活優先平台末位與精簡驗證2026-10-23)／[#262](https://github.com/lalagrass/earth-ascension/issues/262)。**當前只以桌面作產品驗收；舊段落的390必交／必驗不再是門檻。** 手機／平板／觸控／全面跨裝置排最末位BL-P01，既有適配保留。

按[唯一優先序](docs/VISIBLE_DELIVERY_PLAN.md#d30目前唯一執行優先序)與[局部驗證政策](docs/VALIDATION_POLICY.md)：只驗改動直接風險，一段桌面操作及必要回歸；未變模型與當前CI復用，作者／PO不重複本地全套，不加自證／長矩陣／全架構audit。必要CI與真實資料／原指令／暫停、來源、非作者review／唯一queue照舊。

#257／PR261先按桌面重審；#259仍等257接受／合dev／postCI後才Gemini新claim，只先桌面採藥完整稿，不先改路線／數值或runtime。下方D28／D29的手機字樣保留批准沿革但受D30更新，不能再拿手機遮擋阻擋桌面交付；其他白名單／作者期限與2h上限不變。

## D29最新批准：LP-15採藥場景與動作質感，等LP14後先畫稿（2026-10-23）

H1–H4已批准，見[D29](docs/DECISIONS_AND_SOURCES.md#d29lp-15-採藥場景與動作質感-h1h4批准2026-10-23)／[#259](https://github.com/lalagrass/earth-ascension/issues/259)／[正式包](docs/LP15_HANDOFF.md)／[Gemini提示詞](docs/LP15_GEMINI_PROMPT.md)。藥圃→藥架完整稿與採摘／裝簍／背回／交藥分鏡，原坐標／路線／數值／角色保留；採藥既有功能不重做。

**#257最終版及本批准文件，各自非作者接受→Earth合dev→postCI後才Gemini新claim；畫稿／素材／預演也不可提前。** #257原O1–O4與期限不變，本文件可先獨立合。本人最新dev／新codex分支／新4h認領，只design/herb-life/**；先設計PR停止，PO選採用差異再列接線包，不先改demo／atlas／模型／8800或沿舊租期。沒有逐張人類必簽，H1–H4不重問。

本人新T0最多120min／100min不加scope／達標早停，4h不延長；必要根CI／少量圖與流程真操作、未變證據復用／摘要真exit，不加長矩陣。未代啟agent，採藥用途／新工作仍候選；下方D28管理當前LP14，歷史狀態讀最新issue。

## D28最新批准：LP-14生活觀察介面O1–O4（2026-10-23）

擁有人已同意O1–O4，見[D28](docs/DECISIONS_AND_SOURCES.md#d28lp-14-生活觀察介面-o1o4批准2026-10-23)／[#257](https://github.com/lalagrass/earth-ascension/issues/257)／[正式工作包](docs/LP14_HANDOFF.md)／[Gemini兩小時提示詞](docs/LP14_GEMINI_PROMPT.md)。簡潔HUD／院落近況、人物小卡、進階按需與可見跟隨控制，同場景先桌面390畫面／流程再薄接線；原模型／命令／數值／工作／路線／存檔與控制效果保留，不加玩法／全圖重畫。

**文件可獨立先合，LP14製作／runtime仍須本批准文件及#256的390遮擋修正版各自非作者接受→Earth唯一queue合dev→postCI通過，Gemini才本人最新dev新claim／新分支；不重問O1–O4，也不把文件綠燈當依賴解除。** #256原Gemini只補現有390可讀性、不等本文件、原scope／期限不變，不能把W4修正延到LP14。c34d413是尚有P2的狀態快照，開工讀#254最新接受head，不用其舊CI代替。

LP14僅design/life-observation/**、demo/index／style／app必要呈現與鏡頭控制、局部checks及實驗README；不動model/routes/palm/layout、素材／atlas或Earth。兩小時從LP14本人新T0算、100min後不加範圍／達標早停，4h不延長窗口；非作者review／Earth唯一queue保留。必要局部／SG快驗／根CI與桌面390、未變證據復用／摘要真exit，不跑無關長矩陣、不啟其他agent／排程或改8800。下方D27仍管理LP13原有限實作，D25等舊prompt是歷史。

## D27最新批准：LP-13長挑水路 W1–W4（2026-10-23）

擁有人已同意W1–W4，見[D27](docs/DECISIONS_AND_SOURCES.md#d27lp-13-長挑水路-w1w4批准2026-10-23)／[#254](https://github.com/lalagrass/earth-ascension/issues/254)／[正式工作包](docs/LP13_HANDOFF.md)／[Gemini提示詞](docs/LP13_GEMINI_PROMPT.md)。原院落／HOME保留，世界只南延1600×1350、水路單程1650–1750／約1700；原速度／每趟成長／產出與精力政策不改，明確接受0精力仍完成本趟後休息；只必需乾淨水路圖層與鏡頭薄接線，原人物與其他生活幾何／LP12控制保留。**產品前置已解除，不重問四項；本批准PR255合dev／postCI後，Gemini本人從最新dev新claim／新分支實作。** 未代啟作者、不改8800。

PR250設計已合dev dff6f310／postCI39906919235五SUCCESS；LP12／PR244已交付、8800仍LP12 e611037。下方D25舊設計prompt／補修為完成沿革、PR248只留來源，不重做或沿舊claim接線；原提案head5561cf4綠燈不取代本批准前置。新片只有限白名單／單一權威路長與60Hz，不偷加速或改平衡；必要局部／SG快驗／根CI、桌面390、未變證據復用／摘要真exit，沿120min／100min後不加範圍／達標早停，不自接下一包。

## D25最新改派：#182設計／改圖由Gemini接手（2026-10-23）

擁有人因Grok額度不足明確改派，讀 [D25](docs/DECISIONS_AND_SOURCES.md#d25-182-設計與改圖改由gemini接手2026-10-23)、[#182](https://github.com/lalagrass/earth-ascension/issues/182)、[工作包](docs/MAP182_HANDOFF.md)／[Gemini提示詞](docs/MAP182_GEMINI_PROMPT.md)。下方D24「Grok專注圖像」是原分工；現在Gemini接剩餘設計／改圖與PR248四項P2，Grok成果與原分支／review保留，不冒稱本人released，不等原Grok期限。

本D25文件合dev／postCI後本人新claim，從最新dev新分支沿用公開d56acd3、保留Grok來源，建接續PR連248；舊PR不續推／不自行關。只design/map182/**，可沿用乾淨的原grok-art184美術worktree，不動gemini-241。建議244補修先送review再接圖，圖修不等244合併，原scope／期限不變。長通勤與設計自由保留，實裝仍看稿後確認；不改demo／checks／共享README或8800，不代啟作者／接線。只驗局部／必要根檢查及CI，未變證據復用。

## D24：完整地圖設計先行，Grok畫圖／Gemini後續整合（2026-10-23）

最新批准見 [D24](docs/DECISIONS_AND_SOURCES.md#d24-182-完整道館生活地圖設計與美術分工批准2026-10-23)、[#182](https://github.com/lalagrass/earth-ascension/issues/182)、[正式工作包](docs/MAP182_HANDOFF.md)／[Grok Build提示詞](docs/MAP182_GROK_BUILD_PROMPT.md)。Grok主筆完整道館生活地圖總配置、畫風稿與長路線行走預演（分鏡／短片即可）；保留長通勤／看人物奔波，允許自由延伸生活功能點、外圍山徑與未來巡山構想。每點標現有／景觀／未來候選，不逐點加簽核，也不把設計當新玩法批准。

本D24文件經非作者review／Earth唯一queue合dev／postCI後，Grok本人新claim，只寫`sect-chronicle/experiments/water-carry/design/map182/**`；不等#244才可畫稿。復用自己的乾淨grok-art184 worktree、保留245舊分支，從最新dev另開例如`codex/map182-dojo-design`，不操作Gemini目錄／branch。#245已合dev bccda780／postCI39884517733通過；#244原補修scope／期限不變。不得改demo、checks、共享README、atlas／spikes、模型／依賴或8800。

**D23與舊ART184 prompt的下一步已被本節更新**：先交#182設計給擁有人看，實裝範圍之後確認，再由Gemini新包／新claim整合；不能在#244通過後自行啟動舊Grok局部runtime。Grok以圖片與來源交接為主，不要求寫遊戲程式；若設計播放器則只在白名單、標未連遊戲且真暫停／有限結束。必要根檢查／CI、少量可讀性與受影響預演驗證保留，未變證據復用、摘要真exit，不跑長矩陣或自接下一包。

## D23：#184 泉池—石階局部美術 V1–V4已批准（2026-10-23）

讀 [D23](docs/DECISIONS_AND_SOURCES.md#d23-184-局部美術整合-v1v4-批准2026-10-23)、[#184](https://github.com/lalagrass/earth-ascension/issues/184)、[正式工作包](docs/ART184_HANDOFF.md)與 [Grok Build提示詞](docs/ART184_GROK_BUILD_PROMPT.md)。擁有人同意V1–V4，後續主筆Grok Build。先同鏡頭泉池—石階小對照，再分層薄整合同生活入口；舊人物／動畫、原模型路線／碰框與LP11／LP12控制保留。不是全場景、人物皮、玩法或UI重排。

**前置受阻**：本次批准文件、#244休閒返院補修、#245預演到期不停補修，均須新head非作者接受→Earth唯一queue合dev→postCI通過，才可本人認領任何本新包製作／runtime。文件可先獨立合併，不把文件綠燈或舊PR綠燈當解鎖；原作者原scope補修不受本文件阻擋，不重問V1–V4。

Grok已有獨立worktree `/Users/chenyuying/workspace/earth-ascension-grok-art184`；#245原分支保留，前置完成且自有目錄乾淨／無重疊作者後從最新dev另建codex/新分支／新4h認領。不要在原PR加整合提交，不因squash分歧reset／force push。Gemini `/Users/chenyuying/workspace/earth-ascension-gemini-241`完全不動。只改工作包白名單的新design/art184-integration/**、demo/assets/art184/**、app背景接線、必要局部檢查與實驗README；model/routes/palm、atlas/template/spikes、其他UI與root不動。

必要局部實圖／真操作與根檢查／SG快驗／CI保留，未變證據復用，摘要／真exit／GPU限制照實，不重跑世界長矩陣。不代啟作者／其他agent／排程，完成本包即停；接受／postCI後才由遊戲PO更同8800保留上版。下方D10 quota與PARALLEL_HANDOFF早期「Gemini不參與」為歷史；本次明確安排僅更新這個有限美術包，不重啟#93或接管#241。

## D22：LP-12 自主清鼠與玩家覆寫 L1–L4 已批准（2026-10-23）

讀 [D22](docs/DECISIONS_AND_SOURCES.md#d22lp-12-自主清鼠與玩家覆寫-l1l4-批准2026-10-23)、[#241](https://github.com/lalagrass/earth-ascension/issues/241)、[LP12正式工作包](docs/LP12_HANDOFF.md)／[Gemini提示詞](docs/LP12_GEMINI_PROMPT.md)。擁有人已同意L1–L4，後續主筆Gemini；本次批准文件合dev／postCI後才本人新認領runtime，不重問四項，不沿舊Claude／LP11窗口，未代啟作者。

每人允許預設關，候補不占名額；完整交付／必要恢復80／休閒真返院後重驗，人工及停工叫回優先，依既有自主護院→整理→清鼠→下一趟工作順序。auto/manual來源分清，玩家有效改令抑制當人到明確重新允許；關auto保manual，恢復自主只解LP05叫回；候補與來源不改LP07／09識別。沿原掌法卡一個控制與短理由，不加人格／HP／XP／繁殖／存讀。

LP11 #238／PR242已交dev a7e485f／postCI39842008077五SUCCESS，8800是LP11並保留LP09。LP12只demo/**、必要checks/**與實驗README，不用dispatch假裝人工自主接單、保留單tick移動預算／模型真位置與原掌法值，不造第二時鐘／通用Queue或大拆。新T0最多2h／100min不新包／早停、4h不延長，必要局部／SG快驗／根CI與一次桌面390、未變證據復用／摘要輸出／真exit保留；非作者review→Earth唯一queue→postCI才更入口保留LP11，不自合dev或啟其他agent。

## D21：LP-11 手動掌法清鼠 K1–K4 已批准（2026-10-22）

讀 [D21](docs/DECISIONS_AND_SOURCES.md#d21lp-11-手動掌法清鼠-k1k4-批准2026-10-22)、[#238](https://github.com/lalagrass/earth-ascension/issues/238)、[LP11工作包](docs/LP11_HANDOFF.md)／[Claude提示詞](docs/LP11_CLAUDE_PROMPT.md)。擁有人已批准K1–K4及本片示意值，不重問；LP10 #220／PR237設計已合dev1c82218、postCI39805538262五SUCCESS，舊CI不一致解除。D20只設計的限制在D21有限包更新，不授整串戰鬥／生態。

本次批准文件合dev／postCI後可本人新認領runtime，未代啟Claude。手動一份清理含等待至返院，原趟／恢復80／院中出發、停工與guard-fix互斥；模型真位置／28掌距／一次接觸擊倒，初學起手48tick收勢36、熟練24／18，起手一次扣2精力。三鼠／固定世界50逼近或100目擊察覺、逃速120、出界不追／穩定ID、取消真返院／down保留／僅新局重設；精確語義沿工作包，無HP／戰鬥XP／人傷／收益／繁殖或存讀。

只demo/**、必要checks/**及實驗README，不搬翻稿STATES當世界、不由render判命中／讀畫面座標。單60Hz、沿現有腳力與生活來源；最小必要掌法疊圖／去工具，不重畫atlas／大拆框架。新T0最多120min／100min後不開新包／早停、4h不延長2h，不沿LP10。局部與主線快驗／根CI、一次桌面390保留、未變證據復用／真exit照實；非作者review→Earth唯一queue→postCI才更8800並保留LP09，不代啟子agent／排程或自合dev。

## D20：LP-10 掌法視覺與點選設計 Q1–Q4 已批准（2026-10-22）

先讀 [D20](docs/DECISIONS_AND_SOURCES.md#d20lp-10-掌法畫面稿與點選流程-q1q4-批准2026-10-22)、[#220](https://github.com/lalagrass/earth-ascension/issues/220)、[LP10 工作包](docs/LP10_HANDOFF.md)與 [Claude 提示詞](docs/LP10_CLAUDE_PROMPT.md)。擁有人同意 Q1–Q4，本次批准同步文件合 dev／postCI 後可本人新認領 **設計交付**，不重問四項；未代啟 Claude。LP09 #232／PR235 已交付 dev167a981／postCI39788194427五 SUCCESS，8800仍為已接受的生活版。

本輪只做完整掌法畫面、短分鏡與點選流程：同生活場景、一式掌法、約三隻測試弱鼠、初學／熟練節奏對照、目標逃走／有限追擊、玩家叫停及回生活。可用設計專用 HTML 熱區切換畫稿，不連模型／世界時間，明標未連遊戲。只在工作包指定 design 路徑交圖／來源／流程，不改 demo、入口、atlas、Earth、CI依賴或8800。

Q1–Q4 不授權真傷害／鼠群 runtime、HP／攻擊間隔／精力或成長值，不自動接可操作遊戲包；合法出發／恢復、權威命中、測試鼠重設等隨稿列待決。無自動殺敵、人傷、偷糧、掉落、戰鬥XP或繁殖，不把腳力當傷害。新T0最多120分鐘／100分鐘後不開新包／早停、4h不延長2h；少量設計路徑與必要瀏覽器／根檢查，未變證據復用，真exit／GPU限制照實。非作者review→Earth PO唯一queue→postCI，設計接受不等遊戲可玩或授權下一階段。

## D19：LP-09 自主整理護欄N1–N4已批准（2026-10-22）

擁有人已同意N1–N4，讀[D19](docs/DECISIONS_AND_SOURCES.md#d19lp-09-自主整理護欄-n1n4-批准2026-10-22)、[#232](https://github.com/lalagrass/earth-ascension/issues/232)、[LP09工作包](docs/LP09_HANDOFF.md)及[Claude兩小時prompt](docs/LP09_CLAUDE_PROMPT.md)。LP08 #228／PR231已交付，候選PR233已合dev／postCI；本次批准同步文件合dev／postCI後本人核最新dev／有效作者、新worktree新認領，不重問四項，未代啟Claude。

每人自主整理獨立允許預設關，順手1階／累積3階可交換；安全時先候補不占額，完整原趟／恢復80後院中合法才正式受理，人工／已出發不搶。真接觸含marks封頂後都開新輪，全隊最新機會最多一次自主受理；有效人工fix結束當輪且仍可明派，舊任務結果不誤關新輪，auto/manual來源清楚、不假裝人工覆寫。

有效人工改工／取消／叫回等只抑制當人到新真碰撞，停工待停工／LP05叫回／必要恢復仍優先；拒絕不改，恢復自主不清抑制或已用機會。關auto整理保manual，改反應立即重評未受理候補、不重啟正式行動，護院與整理設定分開。精確候補取消、原指令／LP07本訪識別與返院順序沿工作包，不造萬用中斷／通用Queue。

沿D18既有真fix路／480tick／8精力與可察覺flee安全中止、D16原判效；本次只新增自主政策，材料耐久／鼠群／巡山／人格／存讀未批。新T0最多120min／100min後不開新包／達標早停、4h不延長2h、不沿LP08；非作者review／Earth PO唯一queue／postCI保留，不自行合dev或動8800。必要局部／主線快驗／根檢查／CI及一次桌面＋390px保留，未變證據復用／log摘要／strict真exit與GPU限制照實，不全矩陣追綠，#215不是大拆gate。

## D18：LP-08 單次護欄整理R1–R4已批准（2026-10-22）

擁有人已明確同意R1–R4，讀[D18](docs/DECISIONS_AND_SOURCES.md#d18lp-08-護欄損痕整理-r1r4-批准2026-10-22)、[#228](https://github.com/lalagrass/earth-ascension/issues/228)、[LP08工作包](docs/LP08_HANDOFF.md)與[Claude兩小時prompt](docs/LP08_CLAUDE_PROMPT.md)。LP07 #218／PR227已交付，規劃PR229已合dev／postCI；本次批准同步文件合dev／postCI後，Claude本人核最新dev／有效作者、新worktree認領。產品已批不重問，8秒／8精力為已批本片示意值，下面歷史未批限制只在此有限範圍更新，未代啟作者。

一次人工派遣、單一未完成名額，完整原趟／必要恢復80後院中才出發，真走既有護欄路／動手480tick只清一階外觀損痕／返院；僅動手共耗8精力，無材料／XP／產物／工作趟次或耐久／防禦buff。可察覺sniff／approach／prep及仍可見flee均阻擋／中止未完成效果，走完當前腿返院、不退成本、不自動補做；用既有固定場景可見界線，不讀畫外／不靠active=false當安全，不隨camera改感知。單模型tick判效，同tick威脅先失效本片未完成效果，不重排D16原判效。

專用取消只取消本次整理，不擴LP05／LP07原取消成萬用中斷；有效人工整理沿P3清該人候補／記本訪抑制，拒絕不改政策。停工／待停工與正式guard不被搶，LP05叫回與必要恢復來源保留；護院允許／傾向不當整理開關，返院重查最新工作／護院／容量。精確交接與六組驗收沿工作包，不另建Queue／人格核心／第二時鐘。

本輪本人實際認領開工新T0最多120min、100min後不開新包、提早達標停，4h租期不延長2h，不沿LP07。必要局部／主線快驗／根檢查／CI及桌面＋390px保留，未變證據復用／log摘要／strict真exit與GPU限制照實，不加全矩陣追綠。#215短回訪非大拆gate；自主維修／真建造／鼠群／巡山／人格／存讀未因此批准。非作者review／Earth PO唯一queue／postCI保留，不自行合dev或動他人8800服務。

## D17：LP-07 自主護院修訂版P1–P4已批准（2026-10-22）

擁有人已明確同意修訂版P1–P4，讀[D17](docs/DECISIONS_AND_SOURCES.md#d17lp-07-自主護院修訂版-p1p4-批准2026-10-22)、[#218](https://github.com/lalagrass/earth-ascension/issues/218)、[LP07工作包](docs/LP07_HANDOFF.md)與[Claude prompt](docs/LP07_CLAUDE_PROMPT.md)。本次批准同步文件合dev／postCI後，Claude本人核最新dev／有效作者、新worktree短分支認領；不重問四項，不用下方歷史「自主未批准」擋有限本片，未代啟作者。

兩人／一野豬／同入口／60Hz，允許預設關、熟手主動／主角受擾可交換；看可見靠近與本訪hits，不用全局marks。自主先記意願不占名額，完整交付／必要恢復80後、院中合法能出發才正式受理；每人每訪最多一次，ready同tick只選一人，不搶已出發／人工明派。人工guard仍沿D16工作中預占，來源auto/manual分清；候補未出發過期不假稱到場晚到。

有效人工改工／開始／停工／取消／LP05叫回清候補、抑制該人本訪；拒絕不改政策，恢復自主不清抑制／停工／必要恢復，關允許只取消auto保manual。新訪不能解除既有停工／叫回來源。已批精確交接沿工作包，不另建萬用取消／Queue／第二時鐘。D16獸值／路長與驅離零精力收益／XP不改，接受受擾可能晚到，不造成功；修護、鼠群／真傷害／巡山／人格／存讀未因此批准。

本輪新T0從Claude實際認領開工算，120min上限、100min後不開新包、提早達標停，4h租期不延長2h，不沿LP06舊窗。必要局部驗收／一次桌面＋390px與主線快驗／根檢查／CI保留，未變證據復用、不重跑原30分鐘近似矩陣；log摘要／失敗／少量圖、strict真exit與GPU限制保留。非作者review／Earth PO唯一queue／postCI、#215非阻擋與不大拆契約維持，不自己合dev或動他人8800服務。

## D16：LP-06 狀態驅動野豬騷擾與驅離已批准（2026-10-22）

擁有人已同意四項方向並委託PO整理示意值／驗收及Claude兩小時prompt，隨後明確修正獸行為不按固定回訪，而是破壞耗精力、累了／感到威脅逃走、回棲地恢復後再判誘因。讀[D16](docs/DECISIONS_AND_SOURCES.md#d16lp-06-野豬騷擾與驅離2026-10-22)、[#213](https://github.com/lalagrass/earth-ascension/issues/213)、[LP06工作包](docs/LP06_HANDOFF.md)與[Claude prompt](docs/LP06_CLAUDE_PROMPT.md)。一獸／非關鍵護欄有上限損痕／一次驅離／同入口及60Hz，無人傷、建物失效、真傷害／假血條或追殺。

方向與PO受委託示意值已落定，不重問原四項、不用舊提案「待決策」擋住；本次批准同步文件合dev／postCI後，Claude本人核最新dev／有效認領並從獨立worktree短分支只接LD01。獸精力／威脅／資源誘因與精確值沿工作包，沒有首訪／回訪倒數；不自行添血條／戰鬥XP或改門檻追綠。人仍完整交付、必要恢復至80與手動停工優先，返院重查容量／最新工作，LP05叫回與恢復自主不被破壞。

本次LP06實際認領開工起新T0，120min上限、100min後不開新包、提早達標停；4h租期不延長2h，非作者review／Earth PO唯一queue／postCI保留，不代啟Claude。LP05 #208／PR #212已交付／postCI通過，下面D15舊「待開工」不是新窗口來源。

[技術債池#215](https://github.com/lalagrass/earth-ascension/issues/215)收非阻擋發現的檔案／影響／最小整理建議；約三個生活功能切片後短盤點為PO回訪建議，非本包全架構audit／新gate或重構授權。只做當前正確性必要的最小整理，其他留單照常開發，不順手大拆、建通用JobQueue或套舊RT #117。

## D15：LP-05 偏好休閒與玩家叫回已批准（2026-10-22）

擁有人已明確同意P1–P4並委託更新文件／#208與Claude兩小時prompt，來源見[D15](docs/DECISIONS_AND_SOURCES.md#d15lp-05-偏好休閒與玩家叫回2026-10-22)。接[#208](https://github.com/lalagrass/earth-ascension/issues/208)／[LP05工作包](docs/LP05_HANDOFF.md)／[Claude prompt](docs/LP05_CLAUDE_PROMPT.md)：實存滿且無合法工作時兩偏好休閒，有容量回原工作；玩家可叫回待命／恢復自主，後者不能解玩家停工。兩人／同入口／單60Hz、精力與收益邊界沿工作包，不擴聊天、途中分心、完整需求、存讀或新引擎。

產品前置已解除，不重問P1–P4。本次批准同步文件合dev／postCI後，Claude可本人核最新dev／有效認領、獨立worktree開發；舊規劃PR #209合併不替代本次文件前置。新的T0從本次LP05實際認領開工記，最多120min、100min後不開新包、提早達標即停，4h租期不延長；非作者review／Earth PO唯一queue／必要測試與輸出成本維持，尚未代啟作者。LP04 #205／PR #207已交付，下面D14的舊接手狀態不重啟其窗口。

## D14：LP-04 精力與自主恢復已批准（2026-10-22）

擁有人已同意先做 [#205](https://github.com/lalagrass/earth-ascension/issues/205)：自主休息後續工，玩家明確叫停維持停工，並委託遊戲PO整理精力示意值／驗收與Claude兩小時prompt。讀 [LP04工作包](docs/LP04_HANDOFF.md)及[Claude prompt](docs/LP04_CLAUDE_PROMPT.md)。這是單一生活runtime的一項精力需求，不是整套需求／社交／自選工作AI；D13／LP03「不加體力恢復」是上一輪邊界，本次有限範圍不受其阻擋。既有兩人、挑水／採藥、腳力與存檔邊界保留。

本輪示意值由PO依委託選定：兩人100起、工作每遊戲秒−1、交付後≤30自動恢復、坐下每秒＋5、≥80續工；手動停工可恢復至100但不自動解除。精確狀態／指令／邊界以工作包為準，不能自行調閾值追綠。文件合dev／postCI後Claude可按最新#205認領，尚未代啟動；實際開工起最多2h，最後20分鐘不開新包，提早達標即停，既有4h認領不延長這個窗口。非作者review與Earth PO唯一dev queue保留。

## D13：兩小時生活開發循環與主入口方向（2026-10-22）

擁有人已要求 Codex 主開發、非作者 review、Earth PO 合 dev 後續下一小包，最長約兩小時，提早達標即停；並明確說「生活展示會取代正式遊戲入口」。讀 [工作包](docs/LIFE_LOOP_HANDOFF.md)／[D13](docs/DECISIONS_AND_SOURCES.md#d13生活主入口與兩小時開發循環2026-10-22)／[#197](https://github.com/lalagrass/earth-ascension/issues/197)。本輪先 LP-01 共用人物呈現，再 LP-02 雙人挑水、停工休息、既有腳力成長與生活主入口；只認領目前一包，未合 dev／postCI 不接後包。Codex 主筆替代先前預定 Claude 的未認領後續，不接管他人有效工作。

本輪可以依 issue 薄整合既有 `demo/`、人物素材及動畫到持續演進的生活版，LP-02可新增 `sect-chronicle/index.html` 與入口說明；舊 viewer／RT核心與存檔保留，不自動轉檔、不覆寫，也不宣稱全部舊功能已移植。用一個生活權威模型／固定步進，不匯入第二套 walker 時鐘。工作成長／初始 Lv1 與 Lv3 沿既有展示數值，並非正式RT平衡定案；採藥／砍柴／戰鬥、完整體力恢復、人格／社交與新畫風不擴進本輪。下面 D11 的「僅獨立原型」及「不自行啟動agent」歷史限制，以本次人類明確批准的有限範圍為準；唯一 queue、有效認領與測試成本契約保留。

本次窗口 UTC 2026-10-21 16:56–18:56（台北10/22 00:56–02:56），18:36後不開新包；完成／時間到即保存交付並停止，不為填滿時間加功能。超時未完不假稱完成；休眠、網路或額度中斷可保存接手點，不保證無條件持續。

## D12：逐步可見交付、驗證後整合

依 [交付規劃](docs/VISIBLE_DELIVERY_PLAN.md)與[D12](docs/DECISIONS_AND_SOURCES.md#d12逐步可見交付與驗證後整合2026-10-20)：每包一個玩家問題、短流程、可見證據與保留／調整／延後／捨棄判定；驗證後擬正式採用才排整合到同一主要入口，只留參考可歸檔／記回訪條件。#155 是第一個視覺／操作參照來源，沿下節 D11 建立標準；未交圖稿／選型不得聲稱已驗收。後續候選先看規劃表與原 backlog，不自動開工或重建正式世界。

#139／#154 按原 DoD 審查，#140 原前置保持，不將本流程或未交付參照追溯成 UI 重做 gate。保護現有 #155 V1 認領與 experiments 檔案；下一包依實際證據與有效認領安排，不預占後段租期。這次流程批准不額外批准正式成長、人格、社交或換引擎。

## SG-EXP-01：已批准 UI／視覺切片（D11，取代舊純挑水包）

擁有人於 2026-10-20 更正並批准 [#155](https://github.com/lalagrass/earth-ascension/issues/155)：**先交完整畫面稿 → 比較 PixiJS 與 Godot → 做可操作 UI／視覺展示**。讀[工作包／最新 Claude prompt](docs/EXPERIMENT_WATER_CARRY.md)與[決策 D11](docs/DECISIONS_AND_SOURCES.md#d11sg-exp-01-ui視覺切片2026-10-20)。挑水、成長與跑步是完整介面的驗證情境；舊「只挑水、固定 Canvas、不准評估新引擎」與舊 prompt 已被取代，不照舊功能清單開工。

Claude 僅改 `sect-chronicle/experiments/water-carry/` 的設計圖／素材、兩條技術小試作與一條最終展示，可在該處使用原型依賴／Godot project；不改正式 `js/`、`viewer/`、storage、主線測試、root CI／依賴或 Earth。獨立模型不寫正式 world／RNG／存檔；原型選型不批准正式引擎遷移或整份 GDD／完整成長、輕功、戰鬥等新系統。

V1 交兩張完整狀態畫面／可編輯來源與動作設計，V2 同素材／同場景比較製作與接線成本並推薦路線，V3 才接極小模型完成操作。先交每段可看成果，串行小 PR；不是一次做完程式才給人看。未回覆不新增每段批准 gate，重大偏離另提案；測試／輸出依工作包分段，未變主線長矩陣不重跑。

預定 Claude 接手不等於已認領。開始核對 #155／#139／#154 最新狀態，從最新 dev 的獨立 worktree／短分支登記目前階段與精確檔案／四小時期限，不承襲 #139 租期或預占後段。#154 待審時可做本包，需補修則先 checkpoint／釋出原型 active 再串行；不動 #154 checkout，不提前開 #140。RT-04／05 依賴與 DoD 不變。本輪只更新工作包與授權紀錄，不代 Claude 開工。

## 認領有效期限（優先於下方歷史作者指派）

依根目錄 [認領期限與接手](../CONTRIBUTING.md#認領期限與接手)：預設 4 小時，具體進度可續期，額度不足可立即釋出；過期後下一位在原 issue 登記並核對即可接手。恢復 session／推送前先重讀有效主筆；不搶改原分支或 worktree。完整待審 PR 不因審查等待過期，受阻後包不因作者過期解鎖。下方歷史姓名不永久保留工作，現況以 issue 最新有效認領及產品依賴為準；本節不重排已完成任務。

## D10下一工作包：RT-02V開放待認領（優先於下方歷史prompt）

擁有人已於2026-10-19明確選「先做 viewer（建議）」，並因Grok額度用盡要求保持開放待接手。批准來源見[決策D10](docs/DECISIONS_AND_SOURCES.md)。**不要再指定Grok或自行啟動其他agent；核心實作仍一次只有一位已登記主筆。**

RT-02 #107／PR #108已合dev0875d116且postCI39161730112五項成功。下一包為[RT-02V #129](https://github.com/lalagrass/earth-ascension/issues/129)，讀[RT02V_HANDOFF](docs/RT02V_HANDOFF.md)。本排程／交接文件合dev且postCI成功後可認領，無新的產品待決；保護原worktree／未提交修改，從最新dev建短分支、記實際身份／base／檔案，不重做已完成R1–R4。

順序：RT-02V觀察版→RT-03存讀／因果資料→RT-04完整介入UI→RT-05試玩。觀察版只做正式新局、地圖／角色工作／既有原因與D9播放控制，不改規則／schema／RNG、不存讀、不改主角工作／目標。真實瀏覽器固定seed2700tick與控制器邊界驗證，未改引擎矩陣證據復用。

Claude #128三份架構文件有獨立主筆邊界；不寫其檔案，也不等待架構提案才做viewer。下方指定Grok、RT-03先行及RT-00／01尚待開工文字是歷史接手提示，以本節與#129最新狀態為準。

## D9凍結接續（2026-10-18，優先於下方歷史prompt）

擁有人已批准P1–P4，權威[RT00_CONTRACT.md](docs/RT00_CONTRACT.md)與[批准紀錄D9](docs/DECISIONS_AND_SOURCES.md#d9rt-00-p1p4-產品契約凍結2026-10-18)。不重問已批時間／移動／取消／自主預設及舊檔B。Grok CLI接續Grok Bot原#93認領；#99凍結文件合dev與postCI後，由遊戲PO建立RT-01 issue／prompt。不要重做RT-00、先寫RT-02～05或把文件批准當實作通過。

RT入口採P4=B：拒絕舊slot檔並保留原檔；歷史slot引擎／golden及20seed×42回歸保留，不做雙模式續玩UI或轉換。RT-01先交tick／移動／工作／手動核心與canonical續玩證據；自主RT-02、瀏覽器存讀RT-03、UI RT-04、試玩RT-05。每包小PR、前置合dev／postCI後續接。沿相關測試優先、必要3/5seed、證據復用／摘要輸出；高風險完整適用20seed×2700tick驗收保留，未交付情境不冒稱通過。

## D8產品方向（優先於下方早期時段／backlog交接）

擁有人已批准[可暫停即時自主生活](docs/REALTIME_LIFE_SLICE.md)：戰鬥延後；初始條件／目標設定後無人介入可持續發展，玩家可暫停改主角工作／目標。從RT-00 #99／總單#93接續，不依舊prompt先寫SG-06或重做已完成SG-01～05。現由Grok CLI接續，維持單一核心主筆。

新RT的真移動／工作共用單一權威JS世界時間，自主策略只讀可見資訊並走正式指令；render不改世界，暫停零進度。這取代「行走只作動畫／按格才能產出」對新模式的限制，不授權並行兩套權威引擎或slot＋tick雙重收益。RT-00時間／工量／移動／政策與人工覆寫／舊檔B已依D9凍結；保留舊回歸／golden。BL-M01／A01只提取最小真移動與規則式自主範圍，其餘backlog、戰鬥／輕功／第二境與28天新內容仍未批准。

先讀根目錄 [AGENTS.md](../AGENTS.md)、[CONTRIBUTING.md](../CONTRIBUTING.md) 與本資料夾 [README](README.md)。此處補充獨立遊戲契約，不覆蓋根目錄規則。

## 協調與整合

遊戲 PO 為另一個 Astra 聊天，管理 SG 產品範圍、任務、驗收與試玩；Earth PO 兼任唯一共用合併佇列負責人。作者／遊戲 PO 將 ready PR 與審查證據交到 [#67](https://github.com/lalagrass/earth-ascension/issues/67)，由 queue owner 依根目錄 CONTRIBUTING 整合到 dev。各 PO 不互相指派另一產品的實作；本次更新不變更既有產品批准。

## 如何提出建議

依 [提案與溝通流程](docs/AGENT_PROPOSALS.md) 分流並使用其中 issue／留言格式：任務內實作選擇留原 issue；改玩法、語義或範圍另開 Proposal；未來靈感先留 #75。**非阻擋建議記錄後繼續已批准且已認領工作**，不擅加 DoD／依賴；真正阻擋只停受影響部分，說明最小所需決策與可繼續項目。無回覆不等於批准，已批准範圍不重問。決策回填 issue 並同步必要文件；每次標明實際身份，共用帳號不當成獨立審核。ready PR 依上節交 #67，不自行合併。

## 目前可以做什麼

專案擁有人已於 2026-10-18 在本對話批准 D1–D5 與 14 天切片 SG-01～SG-12，見 [批准紀錄](docs/DECISIONS_AND_SOURCES.md)。不得再次把這些任務標成「等待產品批准」。SG-01 已由 Grok Bot 在 #71 認領，其餘實作任務以各 issue 登記為準；開始前完成 issue／主筆／base dev SHA 登記及依賴檢查。SG-13 真人試玩需後續安排，SG-14～17 與發布仍未授權。

- 實際主筆、issue、base dev SHA、修改檔案、依賴與驗收證據必須寫入 PR，採根目錄 PR 模板。
- 新程式限制於 `sect-chronicle/`。不要改 `earth_ascension/`、`guwu-game/`、`sect_ascension/`，不要將原型檔案整批搬入。
- 若來源檔不在你的 checkout，先讀 [來源紀錄](docs/DECISIONS_AND_SOURCES.md)；缺少的原型不是可以自行編造的實作。本次批准包含依新契約獨立實作，不必因原型未入庫重問授權；若需要移植原型程式，核對唯讀來源快照。
- 統一JavaScript純引擎與單一權威世界時間；舊slot基線及新D8 RT契約依各自模式驗證，同一世界不重複結算。不得同時啟動 Python tick 引擎或另一套月／週制引擎。
- UI 只能送指令與顯示引擎結果；動畫、預覽、倍率不能消耗 RNG 或修改世界。
- 不得把候選數值、範例 JSON、期望測試結果寫成已實測結果。不得事後改門檻讓報告變綠。
- 不自動呼叫其他 coding agent；若維護者安排多 agent，按任務檔案邊界分工，同檔採串行整合。

## 最新設計修訂

D6「道館成為門派」已由專案擁有人批准，見 [OPENING_REVISION.md](docs/OPENING_REVISION.md)。按設計 0.2 開發，不再沿用四人開局或開局掌門。先核對本地文件差異、#71 與既有 PR 進度，補缺而非重寫。SG-02A／04A 已在批准的 14 天切片範圍內；28 天仍未授權。

## 未來構想不是實作指派

[FUTURE_BACKLOG.md](docs/FUTURE_BACKLOG.md)／[#75](https://github.com/lalagrass/earth-ascension/issues/75) 僅供未來評估，除D8提取的最小真移動與規則式自主生活外，BL項目仍未排程／未批准實作。不要加入生活能力成長、輕功、靈材科技或領地巡防，也不要預留其schema／API。現行 D6 靈氣復甦與獸患契約照常開發；此 backlog 不新增依賴、不阻擋切片。SG-13 真人試玩後仍須專案擁有人另行批准個別項目。

## 第一個接手工作包

1. 讀 README 與 [雙 agent 接手計畫](docs/PARALLEL_HANDOFF.md)，核對已批准的 14 天範圍。
2. 先讀 SG-00 #69 的最新完成紀錄，已完成的文件合併與工作區交接不要重做；核對最新 dev 並登記自己的 SG-01 issue／主筆；不是重新詢問 D1–D5。
3. 遊戲 agent 在獨立 worktree 從 SG-01 開始；Earth agent 留在自己的 checkout 做原本已認領任務。Gemini 本輪不參與，SG 任務沒有對 Gemini 的依賴。
4. 每任務獨立小 PR，前置合併後才開始依賴任務；不搶改另一位 agent 的檔案。

## 每個 PR 的回報

- 任務／issue、主筆身份、base SHA、修改檔案。
- 改前問題 → 改後行為；採用與捨棄方案。
- ruleVersion、schemaVersion、rngVersion 與舊檔影響。
- 實際命令、結果、失敗 seed、瀏覽器／遷移證據。
- 完成與未完成判準；不可只報測試數量。
- 下一個可認領任務、依賴與需產品判定的地方。

## 測試 seed 與成本

依共用 [分層測試政策](../docs/testing-policy.md) 執行開發 3 seed／一般局部行為 PR 5 seed 冒煙；一般單測／golden與dev CI保留；20seed×2700tick長RT矩陣改在main／manual full，執行 `node --test sect-chronicle/test/acceptance/*.test.js`。AC-C01 與未來獲准階段的 SG-15 樣本不縮減，正式量測照原規格；高風險先驗受影響反例／相容／hash，有不明回歸再擴驗。未交付的流程不能宣稱已測；完整輸出落檔，agent 優先讀摘要與失敗案例。

## 檢查

文件階段：相對連結、任務依賴、狀態與數值來源、`git diff --check`。程式階段跑快驗 `node --test sect-chronicle/test/*.test.js`（共用 CI Node 22／24）及相關瀏覽器驗證；發布前完整層另跑 `node --test sect-chronicle/test/acceptance/*.test.js`。dev快驗與SG-01未交付時的bootstrap訊息都不是完整矩陣通過。另跑根目錄要求的 `python3 -m unittest discover -s tests -v`、`node --check earth_ascension/static/m2.js`、`git diff --check`。原型回歸可用 `node --test guwu-game/test/*.test.js`（Node 24 下不要使用目錄作為測試參數）。新增未追蹤文件仍需額外掃描空白，因為 git diff 不涵蓋它們。
