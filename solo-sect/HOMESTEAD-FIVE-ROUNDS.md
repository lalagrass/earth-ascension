# 五個新回合：把小家現有生活做得可靠、清楚

2026-10-30擁有人指派恰好五輪，H43–H45已完成不重算；每輪真UI/來源→小規格→實作→驗證/獨立審查/修復→回顧，再按結果定下一輪，不為五輪塞五批任意內容。若有用工作真的用盡明列，不造假。主筆Cloud Codex、非作者`/root/homestead_review`。核實clean base `fdae3dce1a831f10ac8eefeee6b7110fba8c46ad`，隔離分支`codex/solo-sect-homestead-five-life-rounds`，保留歷史/舊交付、不重接dev。擁有人本輪直接指派取代一般最新dev/遠端認領流程；只本地檔案/提交，不push/PR/merge/deploy/upload/Mac/付費/排程，無網路設定變更，FF/WebKit已拒403不重試或繞過。

## 既有功能盤點（不是本輪新增）

- H1–H5：獨立小地圖、吃睡採集真搬回、屋/灶/園/儲物、技能照護與藥圃；舊社交/幫手線只留相容，主入口solo不強制訪客。
- H6–H8：原轉接預演、獨立本篇slots/backup等既有功能保留，邊界/失敗/keyboard測試在舊矩陣；本輪不擴存檔/轉接系統。
- H9–H13：家園優先布局、真中文工作/缺料/永久完成紀錄、原小型長凳/花/屋頂選擇、生活夠用存量/求生優先。
- H14–H18：真solo入口、頂部庫存/施工/在途、四技能有效工作XP、省力有界、原床/餐/凳感受與自主，不新增AI引擎。
- H19–H24：三種原料相符的料理、技能＋設備解鎖、木作台/改灶/舒適床、台前加工真搬安裝、實吃實休/有限感受、完整長程與dt矩陣。
- H25–H30：指定一餐/實得回饋、平日食譜偏好、工程soft focus、純外觀配色/安全中文家名；不重做這些控制。
- H31–H39：固定地塊ghost/前後同renderer模型、真地基骨架屋頂、工程檢視/暫停/優先、真材料/部件行走方向、木作成形與多工程編號一覽；不是自由選址或尋路。
- H40–H45：園灶真成形、現場園灶/床凳真task/位置/庫存/感受及原操作；單次休息完成回自主、床部件返場位置修復、同條件屋床恢復時間估算。這些不是本輪成果。

實讀入口/方向、各輪review摘要與現行core/view/commands/scene/UI，核對功能而非只靠版本數字。最新既有可玩證據477/477屬fdae基線，不能冒成本輪新驗收。

## 第1輪H46事前規格：主做飯入口不再空按

source與非作者獨立390px fixture核：全域時間/指派的基本熱飯只按灶offer鎖，solo handler requestRecipe false不顯理由；現場/料理卡已用recipeReason。root另以正常零注入建屋灶、0菜重現亮按鈕按後world不變且無新訊息，receipt `HOMESTEAD-FIVE-BASE-UI.json`。只對齊solo原主按鈕與共用recipeReason，原因直接可見/ARIA描述，不新增panel或第二套資格；按下時仍重查，legacy保留舊持續cook。

驗收：正常UI未有灶/有灶缺菜/缺柴/材料到家可做/真完成後再缺料，三入口同源一致；禁用可讀，不靠hover；成功仍只這一鍋、反覆點/重繪不重扣料/XP，不假產出，暫停看訊息世界不變。1440/390、鍵盤/指標/無pageerror/無溢出，既有適用聚合與非作者有界審查。純UI規則接線，不改core/配方/經濟/schema，不硬加實作鏡像unit。

來源核[AoE官方現場/常用命令](https://www.ageofempires.com/learn-to-play/match-goals-advanced-controls-xbox/)只借讓常用操作能直接執行的原則，不搬RTS或新controls；[W3C Understanding Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)將拒絕原因用文字指出，作資訊一致性參考，不宣稱整體WCAG認證。Game Accessibility Guidelines指定頁本次讀取失敗，未當已核內容。外部作品未執行、無第三方code/素材依賴。

後續候選（未實作/未算回合）：solo泛用吃飯可能每缺5飽腹就重耗一份、主建造/新局完成動態焦點落BODY；非作者已重現，須各先定小規格。其餘後兩輪按實際結果再定，不能預填任意新內容。

## 第2輪H47事前規格：泛用吃飯真的只吃這一份

H46走查＋非作者核：`setOrder('eat')`不帶foodRequest，完成不走manualEat收尾，飽腹90吃1份到100後order仍eat，約t46.75剛低於95又耗一份。現有指定餐已一次，但主入口沒說持續，與玩家日常自主管理不符。H47明確solo泛用eat與指定餐都一次完成即清此eat意圖，仍按原chooseFood挑現成菜或野果；未吃到不捏造收益/XP，急餓自動吃飯不可清其他工作意圖，H25泛用改令取消指定語義保留。legacy原持續eat保留，不新增request欄位/schema。

單次完成同樣留下原『這一餐』實得收據；UI主按鈕說『吃一份現成食物』，無食物/滿腹以共用eatReason顯文字、ARIA，不加panel。共用eatReason與原canDo食物/飽腹條件等價，不把低需求或空庫存靠新數值掩飾。

驗收：三成品/野果真扣1、截頂真恢復/感受/無XP、80秒內不因僅缺5再吃；auto急餓保原工程/農務意圖；取消/重複/吃途中存讀/改指定餐/legacy不變，無餐不產出。五固定seed各20000拍對pinned fdae舊核心＋觀察泛用一餐完成時顯式clear oracle，除新增收據log外world每拍同；dt/原正式長程矩陣不縮。正常UI新局實採野果搬回→按泛用一次→等飽腹低於95仍不重吃→既有工作/自主；原指定餐仍可用。鍵盤/390px/三入口條件同源及非作者review。

來源：[CDDA官方Activities](https://docs.cataclysmdda.org/PLAYER_ACTIVITY.html)區分一般活動完成清除與multi_activity重複，finish要結束、取消不給成果；只借完成/重複分離原則，不搬C++、backlog、自動消耗區或硬核壓力。TinyLife EatAction頁本次讀失敗，不當已驗其行為。外部遊戲未執行，無第三方code/素材採用。

### H46結果／第1輪完成

root基線正常UI t186.5有灶/0菜，全域cook enabled、現場disabled，按全域world不變，仍留舊藍圖訊息。修後正常UI t0無灶→186.75缺菜2（390px三入口均disabled）→311.25真菜柴入庫ready→313.5manual鍋進行→321.25真成3餐/再次缺菜；paused raw/Enter重複/pointer無額外資源/XP，無溢出/pageerror。新FIVE1-UI.json與shots/homestead-primary-*，混4×/16×/暫停不是1×體驗時間。

作者477/477（25.42秒），純UI無core數值/schema變更，不為鏡像接線再造unit。非作者source、獨立390px fixture四態（缺料/可做/共用容量不足/legacy），核可見原因/ARIA/無預扣/無溢出/pageerror並關browser；另核作者正常UI收據與真圖，未見阻擋。477/完整UI不是非作者重跑，不是人類輔具驗證。

### H47結果／第2輪完成

作者新generic-eat4＋原meals8聚焦12/12，聚合481/481（25.38秒）。pinned fdae舊core＋觀察泛用eat完成時clear oracle，五seed各2萬拍，除了新增『這一餐』log外所有world欄位逐拍相同，途中原讀檔/dt也驗；不誤稱log/canonical完整bytes同。正常390px新局採3果真搬回，t43.75按泛用只耗1、餘2，飽腹84.875/order null；t124.75（再81世界秒）仍果2、飽腹73.535，沒有稍餓就重耗。FIVE2-UI.json及homestead-eat圖，無注入、無溢出/pageerror。非作者獨立12/12＋source/作者收據/圖核，保留H25取消指定與legacy持續、auto急餓不清其他工作意圖；481、正常UI和五seed pair未由其重跑，無阻擋。

## 第3輪H48事前規格：操作完成後鍵盤不掉回頁首

非作者與root正常零注入390px鍵盤重現：按新局開始後activeElement BODY，暫停後Enter立首屋藍圖，動態按鈕被移除又落BODY。原focus恢復只為household/inspect給fallback，主建造／recipe／act在消失或disabled時也有同類風險。baseline FOCUS-BASE-UI.json。這是既有controls連貫性，不新建panel、global快捷鍵或改render架構。

範圍：新局/繼續成功後聚焦可見遊戲標題（tabindex=-1）；原建造列/食譜列給穩定programmatic group ID、tabindex=-1，不增加Tab站。按鈕消失/禁用時回同一列；main act禁用回原orders群組；household/inspect原fallback保留。有同名可用原控制仍回原控制，不能因Enter重複落在另一個會下指令的按鈕。只在真正焦點被替換時處理，不每次重繪搶focus。

驗收：開始/立藍圖/完成升級/取消預覽／一鍋完缺料／一次eat/rest禁用，主focus非BODY且上下文可見，Enter在group不產生新命令，Tab接可用控制；1440/390和legacy建造，指標正常，paused世界不變、無trap/溢出/pageerror。原核心/數值/schema不改；適用聚合與非作者審查，語法/來源/hash只核受影響部分。

來源：[W3C Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)保留意義和操作順序、允許programmatic非互動內容但避免多餘tab站；[Playwright官方Actions](https://playwright.dev/docs/input)區分鍵盤/focus與programmatic click，本輪用真Enter/Tab驗，不把DOM focus等同真人輔具認證。外部作品設計沿AoE相關操作就近的原則，不新增RTS或複製引擎。

### H48結果／第3輪完成

作者481/481（24.05秒）。正常零注入solo390/legacy1440鍵盤開始→標題，Enter立屋→原build-hut群組，群組Enter不再下令、Tab可前行，真完工與預覽Escape留上下文；solo最後一份吃完按鈕禁用→orders。另一完整園灶路線t311.25真材料ready、313.5manual鍋、321.5成3餐/失料，focused recipe控制禁用→recipe-basic群組。收據FIVE3-FOCUS/RECIPE-UI與真圖。非作者獨立390 solo/legacy新局/立藍圖/Tab/group Enter正常UI、明示recipe fixture真結算後群組focus，讀作者圖/收據；其browser已關。未獨立全481或作者兩條完整路線，非真人輔具。

工具初以:focus等BODY未match，改讀document.activeElement；舊程序已結束，無殘留inline node。料理圖額外scrollIntoView定位動態按鈕碰到detach，改捲原靜態容器重跑，沒有force/程式點擊繞資格。它揭示未變DOM仍反覆摧毀，作H49下一輪，不把H48焦點交接冒稱解決所有重繪問題。

## 第4輪H49事前規格：沒有改變的控制保持原位

走查發現即使世界暫停，原orders/build/recipes等每250ms仍整段innerHTML重建。root正常新局暫停保留forage DOM參照，700ms已斷連而world完全相同，DOM-BASE-UI.json。H48補有意義fallback，但不能讓無變控制本身不斷連；這影響連續鍵盤/指標/選字，也使真UI記錄容易遇到detached。

只在本renderer獨佔的原容器加小WeakMap原markup快取：完全相同字串不重寫，改了照常更新；限orders/build/recipes/project-rows，不作VirtualDOM、renderer/engine改寫、不cache世界或停止模擬。用原字串而非DOM序列化作比較，避免disabled=""等瀏覽器正規化讓每次誤判不同。不能用於可編輯子樹或讓資格變了仍沿舊disabled。原H48合法更新時fallback照常有效。

驗收：真UI新局paused900ms control/group身份與focus仍在、world不變；1×人物行走而控制語義未變仍同一button；真指派/原料理材料/工程/清除變了必更新，無 stale command/disabled或假world增益。1440/390指標/Enter/Tab/原H48流程，適用481聚合與非作者獨立對照；純UI不加新數值/欄位/空泛效能宣稱。來源沿[Playwright官方actionability](https://playwright.dev/docs/actionability)的可見/穩定/可收事件與DOM斷連條件，[W3C Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)連續上下文；這是互動可靠性驗證，不當真人或全無障礙認證。第5輪根據本輪整合後剩餘驗收缺口定，不加任意新內容。

### H49結果／第4輪完成

作者481/481（24.51秒）。正常390新局paused900ms保留forage/build/recipe節點及focus、world完全不變；1×人物移動但主控制未變仍同node。真採果返倉解鎖eat、一次吃完禁用/fallback→orders；t130.5真建屋後1440原建造列paused900ms保留；legacy390同樣身份保留，無溢出/pageerror。FIVE4-UI.json；不把skip同markup說成已測效能改善。

非作者讀四容器寫入所有權、原字串cache與mode/newgame更新；獨立390正常UIpaused900ms四參照存活，Enter真指派後舊按鈕斷連/new active且focus保留，證真差異仍更新；另核作者真材料/建成/legacy收據與圖，無阻擋。481/作者完整UI未由其重跑，browser已關。H48 fallback仍處理合法替換，無新數值/schema。

## 第5輪H50事前規格：完整輸入與生活規則對照（最後一輪）

H46–H49已分別修入口資格、泛用餐收尾、focus與DOM穩定；仍缺『這幾項一起用時，真正UI按鍵是否只呼叫預期命令、未默默改世界』的跨層證據。第5輪實作可重跑、有限的UI/API對照工具與結案驗收，不再加玩法/面板或為輪數擴內容。這是現有新接線的整合缺口，並非把同一組單測改名新成果。

五條零注入路徑：三性情各一條建屋→園灶→採收→做/吃→休息→長凳/清除，勤勞路含真正材料在途的暫停/續工；另一短路驗採集中改令/一份餐中原存讀，另一短路驗preview/Escape/選地/關標示純讀。全部只用正常UI，進程debug僅讀。另在Node建立同初始/姓名/性情的獨立model，按記錄的已接受原public API命令與UI實際世界拍數回放；每個停點比較完整JSON及hash（包含log），不向瀏覽器注入物資/技能/tick，不把model中間拍當每拍都讀取過瀏覽器。資格拒絕/純檢視停點不能改任何world欄位。

驗收：每條記實際command/t/world hash、所用倍速、正常UI圖、pageerror/溢出；主餐一次/原工程材料/飢餓精力/暫停與取消/讀檔/三性情皆正常。最後適用481聚合、既有五seed/48路長程/保留矩陣全留；非作者獨立看工具方法/抽查一短路與真收據（能跑才稱實跑）。發現具體差異定位最小修，沒差異也不捏造新功能。五輪到此停止，真人/其他引擎仍另列，不開第6輪。

來源：[Factorio開發者FFF188（2017）](https://factorio.com/blog/post/fff-188)介紹相同輸入/每拍狀態一致及差異報告；只借命令與狀態對照的除錯原則，Factorio是商業遊戲，不稱全開源，不搬多人/網路/工業鏈。[Playwright官方Actions](https://playwright.dev/docs/input)用可操作input/keys驗真正UI，不用programmatic click或force迴避actionability。此前CDDA活動完成/取消概念仍是有限生命週期參照。未執行外部遊戲、無第三方code/素材採用。
