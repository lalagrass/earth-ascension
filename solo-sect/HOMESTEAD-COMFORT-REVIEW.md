# H43–H45：建設真的接回吃住與自主生活

恰好三個新回合完成，不開第四輪。base `3ebe5060c8d27e6fe61dcd5f38e355966eb8fd30`，主筆Cloud Codex、非作者`/root/homestead_review`，隔離分支`codex/solo-sect-homestead-comfort-flow`。實作HEAD `9f69eeb95f89ab45f9bb961d1cd2589ae7778fc5`，後續僅交付文件。舊分支與檔案保留，未重接dev；沒有push／PR／merge／部署／上傳／Mac／付費／排程。本輪H43–H45不重算H40–H42。

## 逐輪結果與真正改變

| 回合／實作commit | 真問題與完成內容 | 證據及界線 |
|---|---|---|
| H43 `a1980bec4c863032895a31e721ee5be9fdc1beaf` | 手動休息到100仍重選休息，不能回生活。solo改一次完成清rest意圖，自主85／legacy持續不改。回歸揭露已就位床部件被返場工人拖回半路，修部件留床位／工人可獨自返場及合法go存讀，真搬運仍共位。 | 聚合471/471；5seed×20000拍pinned舊源＋真完成後顯式clear oracle逐bytes同；真UI卡住→自主搬料。非作者5/5＋原失敗seed3全20000拍/378讀檔複驗。沒有新欄位、恢復率、需求、成本或存檔功能。 |
| H44 `bc9fbfc16f5c601e98c8d21a15e74d4684d02d61` | 屋／床只說每秒+1/+5，玩家難比較價值。原建造卡與預覽加入同從30到100的目前→建好後純恢復時間，讀共用restRate與0.25拍。 | 聚合473/473；八種有效改良組合對照真core tick一致，舒適床兩屋別少35%／28.6%。標準情境估算不是實際遊玩或已使用效果。非作者2/2＋source／作者圖核。 |
| H45 `9f69eeb95f89ab45f9bb961d1cd2589ae7778fc5` | 園灶已可用，屋床凳卻只顯永久能力。原現場檢視串真位置、go/do、當下恢復率、目標、感受來源與原休息／閒暇控制；花無凳不冒充全域效果。 | 聚合477/477；新增5seed×20000拍現場adapter/原API逐拍同、途中重讀/dt；真UI同局種菜做飯吃飯→舒適床→凳花。非作者11/11，文案修後新4/4，核最終作者四圖／receipt。不是非作者完整UI／477重跑。 |

修改範圍：`homestead.mjs`三處小核心修復（solo rest完成、已到床位的部件不隨返場人移動、允許該合法go位置）；`homestead-view.mjs`／`homestead-construction.mjs`對應真活動用語；新增純讀`homestead-rest-view.mjs`；`homestead-household*.mjs`／UI／HTML／CSS適配既有設施；對應測試／工具／收據／圖／文件。完整路徑在本地patch manifest。

[邊界hash](HOMESTEAD-COMFORT-BOUNDARY.json)記錄八檔：只有上述homestead核心窄改，配方／技能／需求率與感受定義／轉接／本篇sim-data-core另外七檔逐bytes與base相同。沒有新schema、角色欄位、新儲存介面或依賴。有效舊v1/v2/v3仍由適用聚合驗；已被拒的舊損壞部件raw不自動修復，並非備份／復原專案。

## 正常UI路線與前後圖

Chromium154.0.8037.57、Playwright1.62.1。以下是作者AI正常UI，沒有資源／XP／狀態注入；只讀debug作斷言。混暫停／1×／4×／16×，世界時間不能當1×完成耗時，也不是人類喜好證據。單元／核心fixture與正常UI分開。

- [基線收據](HOMESTEAD-COMFORT-BASE-UI.json)：走完採種／料理後，t333精力100，手動rest仍在；[需另清除的原狀態](shots/homestead-comfort-base-rest-still-commanded.png)。task同拍清空，卻每拍被rest意圖重選。
- [H43收據](HOMESTEAD-COMFORT1-UI.json)：真園灶流程後t324.25休息滿100／order null，t339.5已[自主回工程搬料](shots/homestead-comfort-rest-back-to-project.png)。另390px全新局鍵盤一次休息t12.25完成，[可見滿精神原因](shots/homestead-comfort-rest-narrow-command.png)。
- [H44收據](HOMESTEAD-COMFORT2-UI.json)：t0[首屋23.5→11.75秒](shots/homestead-value-first-house-payoff.png)，t100.75修繕11.75→8、木床11.75→10；真建園灶木床後，t301.25[鎖住舒適床10→6.5](shots/homestead-value-comfortable-bed-locked-narrow.png)，缺台仍不可確認；真加工／搬回／安裝後t514.5[真床2使用達100](shots/homestead-value-comfortable-bed-used.png)。這不是靠預覽發效果。
- [H45最終同局收據](HOMESTEAD-COMFORT3-UI.json)：t0.25[走向空地休息](shots/homestead-use-walking-to-ground-rest.png)，12.25一次完成；造屋、園灶木床，t327[真播種](shots/homestead-use-garden-sown.png)，393.5[真正manual鍋未結算](shots/homestead-use-real-cooking.png)→401.25[做成3熱飯](shots/homestead-use-hot-meal-made.png)→405.25[吃1剩2](shots/homestead-use-hot-meal-used.png)，飢餓60.825→100、暖飯感受至465.25。之後自願做台／舒適床，t602.5[床位do每秒11](shots/homestead-use-bed-in-use.png)、精力85.65→t604滿100/order null。再建凳花，t715[已真坐下但這次未完成](shots/homestead-use-bench-in-use-narrow.png)，t722.75[完成+5精力、清除回自主](shots/homestead-use-actual-comfort-cleared.png)，精力64.8→69.8，舒服／看花均至782.75（各60秒）。無新buff或全圖家具加總。

原園灶／建造卡、角色面板仍可用，沒有另起主畫面或強制導覽。屋與床同一原休息點，沒有新增路點／尋路／自由選址。閒暇持續性明示，能清除；休息達100則自然結束。留居與休閒是合法選擇，不強迫收徒或轉接。

## 接受矩陣／可重跑

| 狀態 | 真正執行／復用 |
|---|---|
| 通過 | `cd solo-sect`後`node --test test/*.test.mjs`：471→473→最終477全部通過，約23.15／23.23／24.86秒。最後含H45文案／位置反例。完整log `/workspace/deliverables/homestead-comfort{1,2,3}-tests.log`；原完整20日／48路／五組20000拍等適用矩陣均仍在聚合，未縮樣本。 |
| 通過 | 新`test/homestead-rest.test.mjs`5項（加既有construction9項14/14）、`homestead-rest-view.test.mjs`2項、`homestead-comfort-use.test.mjs`4項。auto85、manual100、legacy持續、床各級、飢餓/手料優先、改令/重複/中途存讀/dt、床部件返場/真搬運、真位置/phase/感受、滿精神/花無凳/資格/purity。 |
| 通過 | 根目錄`node solo-sect/tools/homestead-rest-pair.mjs`：讀git pinned3ebe舊核心（需該本地歷史），5seed各20k拍；舊實例只在觀察實際滿100休息完成時由原API clear，再與新版逐bytes同，49–55次manual完成／組，見[JSON](HOMESTEAD-REST-PAIR.json)。只證有界rest修復等價，不代替床升級矩陣或一般平衡。 |
| 通過 | H45額外5seed×20k（每組5000世界秒＝20.83日）新現場全類設施adapter/原API逐拍world同，三性情皆涵蓋但不是3×5全排列。最低飢餓33.285、最低精力21.85，期末閒暇367/365/353/355/346。途中load與1200世界秒固定指令0.1/0.25/1 dt相同。數字在最終log `H45 parity`，不是人類樂趣／全策略平衡。 |
| 通過 | 屋床8組相同起始位置/精力的真core fixture驗估算；舒適床原7→11恢復率時，30→100實走10→6.5秒（少35%），修繕屋10→14則7→5秒（少28.6%）。沒有削弱基本床或加飢餓來製造改善；排除步行及其他活動。 |
| 通過 | 根目錄`node solo-sect/tools/homestead-rest-browser.mjs`、`homestead-rest-value-browser.mjs`、`homestead-comfort-use-browser.mjs`（後兩者同tools前綴），需先8803本地HTTP。三條正常UI與H43窄屏小流程，最後H45完整路線含實吃/實休/實坐，無pageerror／橫向溢出，鍵盤/Enter/Escape/重繪焦點、窄viewport及換地無誤派。390px不是手機真機。 |
| 通過 | 非作者H43獨立rest5/5、原失敗growthTraffic(3)全20000拍／378load；H44獨立2/2；H45新舊合11/11，修後新4/4（含其5seed20k）。各輪讀source、作者實圖/收據複核。**本輪非作者沒有另開正常UI瀏覽器、沒有重跑作者471/473/477整體**，不能稱其做了獨立全路線/全瀏覽器驗收。 |
| 通過 | 語法、git diff --check、文件相對連結、核心變更邊界；本地文字patch在乾淨base文字樹實套後逐檔等於HEAD，hash/檔數由交付manifest記。圖片另列並留repo，未將.git／憑證／私人存檔打包。 |
| 失敗 | 無剩餘已知阻擋。初470聚合1項真失敗已保raw、定位並修復，見下；既有壞raw仍拒絕不冒稱復原。 |
| 受阻 | Firefox/WebKit官方下載`cdn.playwright.dev`、`playwright.download.prss.microsoft.com`先前政策403，本輪未重試、換host/代理/executor或Mac繞過。 |
| 未測 | 真人樂趣/理解/美感/耐玩、輔具使用者、真機Safari/手機、OS級IME、其他引擎、外部作品執行/效能。沒有正式發佈或遠端CI，未跑不相關其他產品矩陣；未宣稱效能收益。 |

## 審查、失敗與修復

1. **真回歸失敗**：H24 seed3/tick3975在床已安裝0.75工量後，返場go把部件拖到[341.358,193.087]，loader要求已安裝部件留床位而拒。失敗raw `/workspace/deliverables/homestead-rest-seed3-before-fix.json`（合成種子情境，非私人玩家檔）。作者定位、非作者獨立重現；修部件就位後不再跟人走，loader允許人獨自返場的合法go、不放寬有工量卻偏離床位的損壞raw；work0真在途仍跟人。非作者完整重跑原seed並驗拒壞位置，最後477整體通過。
2. **非作者文案修正**：休息『缺糧先吃』明確成開始前優先，沒有暗示既有休息每拍都餓醒；空地go不再暗示有床，改『尚未開始休息』；do但不在床位不假說正在前往或已使用。作者修後聚焦/整體/最終正常UI再跑，非作者核最終四張圖和收據。
3. **測試／工具修正**：早期H43 until在空task即符合、取料人在HOME返倉一拍就完成，原斷言不適用，修測試而未改玩法；基線初期待task持續rest，但它每拍內清task，改驗order仍rest。曾兩次cwd誤用導致找不到檔，沒有改其他路徑，以改正後結果為準。H45補同局實際農作／做飯／吃飯後再用床凳，沒有僅用建成數字算完整生活。
4. H41/H42舊UI工具的『選hut後無生活資訊』斷言同步H45新增正當內容；原純函式測試改用仍無生活資訊的store。這是明確擴充範圍，不是放過誤派或縮正式seed樣本。

## 外部參照與取捨

- [Yuka RestGoal source](https://raw.githubusercontent.com/Mugen87/yuka/master/examples/goal/src/Goals.js)：有限目標完成後把控制交回流程。借結構，沒有搬計時/瞬間清疲勞/goal引擎或新依賴；這是閱讀原始碼，不是已跑Yuka效能。
- [Stonehearth開發者2017 Alpha20](https://store.steampowered.com/news/posts/?appids=253250&enddate=1484876676)：實吃、床、遮蔽可反映在可檢視thoughts。借把生活改善連到真使用與回饋；不抄工作情緒倍率、房間、戰鬥、多人，也不把歷史設計當現行bug。
- [Tiny Life FurnitureType.TypeSettings](https://docs.tinylifegame.com/api/TinyLife.Objects.FurnitureType.TypeSettings.html)：ActionSpots、RestoreNeedModifier當前互動物件限制、OnDescription。借同源效果/說明與實際使用位置；商業本體非全開源，不搬C#/倍率/素材。SleepAction頁本次讀失敗，不聲稱已核其行為；成功取得TypeSettings文件另列。
- [Stardew論壇2023時間壓力討論](https://forums.stardewvalley.net/threads/i-do-not-have-time-for-anything.20279/)：個別玩家談時間不足，也有人建議少種、慢來、自選活動。提醒休閒是選擇而非增加家務；不是全社群共識、荒居人類證據或授權加日程壓力。Exile205本次抓取失敗，未當新一手結論。

沒有第三方程式／資產採用或新依賴。拒絕新排班器、無限成長表、額外家具鏈、強制情緒勞動、新存檔框架、社交／採石與自由建築擴張。

## 到此停止與下一提案

先用[3–5人探索腳本](HOMESTEAD-COMFORT-PLAYTEST.md)看：能否理解標準休息時間、看出真走路／使用、分清一次與持續、在吃住穩定後自願休閒或再選改善。不同意見保留；這仍不是市場驗證。

若後續另指派工程，優先處理實際首次卡點／誤操作。若資訊過長才做漸進揭露，但保留可見禁用理由；不先假定需要新內容或新數值。其他引擎由環境擁有人處理政策，本輪不繞過。未開始H46／第四輪，沒有新的發佈授權；server與browser收尾關閉，成果留本地可取回。
