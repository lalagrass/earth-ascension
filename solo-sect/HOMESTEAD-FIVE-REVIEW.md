# H46–H50：五輪生活控制與整合驗收

五個新回合完成，H43–H45未重算，沒有第六輪。主筆Cloud Codex、非作者`/root/homestead_review`。clean base `fdae3dce1a831f10ac8eefeee6b7110fba8c46ad`，分支`codex/solo-sect-homestead-five-life-rounds`；實作HEAD `b3f19ddd8a513c67c79f22048b4f2ad4aa0f6375`，後續只交付文件。保留歷史/成果，不重接dev。僅本地提交與工具/圖/patch；未push/PR/merge/deploy/upload/Mac/付費/排程。

## 五輪真正做了什麼

| 輪／commit | 缺口與完成內容 | 作者／非作者界線 |
|---|---|---|
| H46 `164b6d39b83d7b930281dd0cb7e328c3e39320c3` | 主基本熱飯只看灶有無，缺料仍可按卻沒新回饋。solo主入口disabled、可見原因/ARIA、按下重查，同用原recipeReason；legacy維持。 | 作者477/477＋零注入無灶→缺菜→真備料→真一鍋。非作者獨立390 fixture缺料/ready/容量/legacy四態＋source/作者圖核，未跑全477/全路線。 |
| H47 `aacafaaaeb42d2cefafc9ac9294899559c7cd5d6` | 泛用吃飯完成未清意圖，剛缺5就又吃。solo吃完一份清此意圖、實得收據；共用eatReason等價原合法state條件，主入口明示一份/缺食物/吃飽。auto吃飯保其他工作、legacy持續保留。 | 作者481/481、聚焦12、五seed舊源oracle及真採果/吃一份/再81世界秒不重吃。非作者獨立12/12＋source/作者收據圖核，未重跑五seed/全UI/481。 |
| H48 `171e34419dd7ac7dd83513c83bf0b37060eb0aea` | 開局/立藍圖/按鈕完工失效，焦點落BODY。標題、原建造/食譜group、orders給有意義fallback，tabindex=-1不加Tab站，Enter在group不下指令。 | 作者481/481＋正常solo/legacy start/build/preview/eat及料理路線。非作者獨立solo/legacy390正常新局/Enter/Tab與明示真料理結算fixture，source/圖核；非完整作者UI/481或人類輔具。 |
| H49 `7abc810afcca516656268d8dcdd327a07f31b69d` | 世界暫停、內容相同仍250ms重建全部按鈕。原四容器同markup跳過寫入，真變化仍更新，H48 fallback照常。 | 作者481/481＋正常paused身份/focus、1×行走、真採果/吃飯/建屋更新、legacy；非作者獨立390正常身份＋Enter真改令/source核。無效能量測。 |
| H50 `b3f19ddd8a513c67c79f22048b4f2ad4aa0f6375` | 新接線一起用時缺完整命令→世界契約證據。實作五條正常UI路線與public API回放工具，161停點/50命令完整JSON含log相同後記hash。不是再加玩法/面板。 | 作者481/481＋五UI路線；非作者核方法、獨立抽route5十檢查/一命令，核route1/3作者圖/主收據，未重跑其他4路/481。 |

[事前規格／盤點／每輪結果](HOMESTEAD-FIVE-ROUNDS.md)完整列H1–H45已存在的生活/技能/建造/物流/外觀/現場功能，避免重複當新成果。

## 程式與相容界線

`homestead.mjs`只改solo泛用餐一次完成/收據，並把原合法stock與hunger條件接共享`eatReason`；`homestead-content.mjs`只增加該資格helper。`homestead-ui.mjs`/HTML處理主入口、group/focus與原容器穩定，新增七行UI專用`homestead-dom.mjs`原markup WeakMap，沒有世界cache或VirtualDOM改造。其餘是對應測試、正常UI工具/收據/圖/文件。

[八檔邊界hash](HOMESTEAD-FIVE-BOUNDARY.json)：僅core/content上述窄改，技能/需求與感受定義/轉接/本篇sim-data-core六檔逐bytes不變。另以pinned base內容模組核RECIPES、BUILD_GATES、MEAL_STYLES、RESOURCE_NAMES表完全相同。無新數值、資源鏈、存檔欄位/schema/介面或依賴。有效舊v1/v2/v3仍由原測試讀取；舊solo待命eat改為實吃一份後結束是本輪明確行為修正，legacy原持續eat保留。

## 正常UI證據

Chromium154.0.8037.57／Playwright1.62.1；作者正常UI零物資/XP/狀態注入，debug只讀。使用暫停/1×/4×/16×，不是1×完成耗時或真人體驗。

- [基線](HOMESTEAD-FIVE-BASE-UI.json)：t186.5灶成0菜，全域亮/現場灰，按後仍留舊藍圖訊息，[原空按](shots/homestead-five-base-cook-no-response.png)。[H46收據](HOMESTEAD-FIVE1-UI.json)與[缺菜390](shots/homestead-primary-missing-veg-narrow.png)、[真備料](shots/homestead-primary-ready.png)、[真一鍋後又缺料](shots/homestead-primary-one-pot-done.png)：t0無灶、186.75缺2菜、311.25 ready、313.5 do、321.25成3餐。三入口一致，未預扣。
- [H47收據](HOMESTEAD-FIVE2-UI.json)：[吃一份](shots/homestead-eat-ate-one.png)t43.75果2/飽腹84.875/order null；[再81世界秒](shots/homestead-eat-after-eighty-world-seconds.png)t124.75果仍2/飽腹73.535，不因略餓再耗餐。沒有新食物grant。
- [焦點基線](HOMESTEAD-FOCUS-BASE-UI.json)開始/立屋均BODY；[H48正常focus](HOMESTEAD-FIVE3-FOCUS-UI.json)與[solo建造group](shots/homestead-focus-solo-build.png)、[legacy](shots/homestead-focus-legacy-build.png)、[最後一份後](shots/homestead-focus-solo-single-meal.png)。[正常料理focus收據](HOMESTEAD-FIVE3-RECIPE-UI.json)t321.5真結算後disabled回原recipe-basic群組，非另開新控制。
- [DOM基線](HOMESTEAD-DOM-BASE-UI.json)：paused700ms原forage參照已斷連、world同。[H49收據](HOMESTEAD-FIVE4-UI.json)：paused900ms三控制和focus保留、1×行走不變orders同node，真餐資格更新/真建屋t130.5、[完成列保留](shots/homestead-dom-built-stable.png)，legacy390亦同。不宣稱減少多少成本/延遲。
- [H50五路收據](HOMESTEAD-FIVE5-UI.json)：quiet/sociable基本家園完整路各41停點、diligent含真工地在途暫停/釋約/返倉/續工51；短路採集中改令及吃中原存讀18、preview/Escape/選地/標示純讀10。共161/50命令；[quiet](shots/homestead-replay-1-settled.png)、[sociable390](shots/homestead-replay-2-settled.png)、[diligent](shots/homestead-replay-3-settled.png)、[餐中重讀後](shots/homestead-replay-4-single-meal-after-reload.png)、[純檢視](shots/homestead-replay-5-preview-and-plan.png)。三條生活路最終世界391/391.25/386秒，不同指令/等待不能推論性情效率。此路用基本屋/餐/休息/凳；本輪未改舒適床物理，原完整舒適床矩陣仍在聚合，舊H45正常UI可復用但不改稱H50新走查。

H50每停點比較完整raw JSON含log、相同輸入與實際t的另一實例API回放；不是每拍都讀瀏覽器，也不是獨立實作另一引擎。各次真UI輸入可能因壁鐘時機產生不同t/hash；應驗當次UI與其記錄回放吻合，不把本收據hash當所有重跑的固定golden。preview-only最終hash `4842dd3fb79188c354beb15714edb62424eadd95d614f8df2fc643090a35a695` 在作者/非作者同t0抽查相同。

## 接受矩陣與命令

| 狀態 | 精確範圍 |
|---|---|
| 通過 | 在solo-sect跑`node --test test/*.test.mjs`：H46 477/477→H47/H48/H49/H50各481/481，約25.42/25.38/24.05/24.51/26.50秒。最後與UI同時跑，不作效能比較。完整輸出`/workspace/deliverables/homestead-five{1,2,3,4,5}-tests.log`。舊477不冒成本輪結果。 |
| 通過 | 新`test/homestead-generic-eat.test.mjs`4＋原meals8聚焦12/12；三成品/野果實扣一次、截頂真恢復、無XP、取消/重複/途中原load/dt、H25泛用取消指定、auto吃飯保其他工作與legacy持續。原正式48路/三性情20日/固定五組各20000拍等矩陣隨每次聚合保留，未縮樣本。 |
| 通過 | 根目錄`node solo-sect/tools/homestead-eat-pair.mjs`：pinned fdae舊core，在觀察泛用eat真完成時用原API clear作oracle，5seed各20k拍、5000世界秒；除新receipt log外所有world欄位逐拍同，[量測](HOMESTEAD-EAT-PAIR.json)。需本地git有base歷史；新資格不加新數值，不用此有界配對代替全矩陣。 |
| 通過 | 依次可重跑tools下`homestead-primary-cook-browser.mjs`、`homestead-generic-eat-browser.mjs`、`homestead-focus-browser.mjs`、`homestead-recipe-focus-browser.mjs`、`homestead-dom-browser.mjs`、`homestead-ui-replay.mjs`（從repo根`node solo-sect/tools/<file>`，先8804本地HTTP）。各正常UI、pointer/Enter/Tab/Escape、1440/390與相關legacy，無pageerror/水平溢出；390不是真手機。 |
| 通過 | H50五正常路線完整JSON/含log停點一致，model半拍外不注入UI；最終聚合481/481。非作者只抽`node solo-sect/tools/homestead-ui-replay.mjs 5`，10檢查/1命令/t0，確認min65/68、完整hash同。另核source及作者route1/3圖，不能當非作者跑了161或481。 |
| 通過 | 非作者H46獨立390四態fixture/source/圖；H47獨立12/12；H48獨立solo/legacy正常start/build/Tab及recipe真結算fixture；H49獨立900ms身份/真指派更新；H50獨立短route5。各自browser已關，沒有其自有server。全量/完整UI與pair由作者跑，不冒平台正式approval。 |
| 通過 | 語法、git diff --check、新文件相對鏈接、改動邊界hash/不變配方表；本地文字patch在乾淨base文字樹實套後逐檔與HEAD相同，精確hash/檔數由manifest記。二進位圖另列且保留，不含.git/憑證/私人存檔。 |
| 失敗 | 沒有剩餘已知阻擋。過程工具/指標問題見下，未隱去失敗或稱功能新增。 |
| 受阻 | FF/WebKit官方下載域cdn.playwright.dev與playwright.download.prss.microsoft.com先前政策403，本輪未重試或換host/代理/executor/Mac繞過，沒改網路設定。 |
| 未測 | 真人理解/喜好/耐玩、輔具使用者、真機Safari/手機、OS級IME、其他引擎、外部作品實跑/效能。本輪無遠端CI/發佈或不相關其他產品矩陣，沒做整體WCAG認證。 |

## 調整與失敗保留

1. 作者/非作者先重現做飯空按與generic連續耗餐，才修資格/完成語義，沒有把它們說成只有測試fixture錯。新餐的數值/價格/選菜策略都沒改。
2. focus基線初以`:focus`找BODY不匹配而等待，改讀document.activeElement；程序已退出，最終確認無inline node。料理圖額外捲動動態button出現detached，用原靜態容器捲到證據位置重跑，不用force或JS click繞可操作性；該真DOM無變仍換節點問題由H49另處理。
3. H50工具min初值100使0tick純預覽錯報100；改由真初始65/68起，僅重跑同preview樣本，前四路實際min更低/結果不改。主JSON明列evidenceReuse，舊全跑log保留；不是修改遊戲或事後挑seed/閾值。作者重驗副本與非作者抽查另存deliverables不同檔，不冒成同一人的範圍。

## 一手來源與採用／延後

- [AoE官方常用/現場命令](https://www.ageofempires.com/learn-to-play/match-goals-advanced-controls-xbox/)：借常用操作要能直接執行；不再複製新控制、radial menu、多人RTS或戰爭。
- [CDDA官方Activities](https://docs.cataclysmdda.org/PLAYER_ACTIVITY.html)：有限活動完成清除與multi_activity區分、取消不發成果。借生命週期，不搬backlog/自動消耗區/巨大C++架構或硬核負擔。
- [W3C Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)、[Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)：借文字解釋拒絕/有意義focus與不增加多餘Tab站原則；標準頁不是本作整體符合性或真人輔具證明。
- [Playwright Actions](https://playwright.dev/docs/input)、[actionability](https://playwright.dev/docs/actionability)：真鍵盤/可操作性與穩定節點驗證；不以force/programmatic click假裝真可用，也不只看測試數稱好玩。
- [Factorio FFF188（2017）](https://factorio.com/blog/post/fff-188)：同輸入/拍與狀態差異報告作H50原則。商業本體不是全開源；只讀歷史開發者說明，不搬網路lockstep、工廠鏈或資產，也不把當年bug稱目前仍在。
- 結案重新讀[Widelands社群#5275](https://github.com/widelands/widelands/issues/5275)：缺料工地占住builder引發是否靠更多按鈕解決的不同觀點，2025-05-31已completed/#6208。借歷史個案提醒少堆微管理與檢驗真返回路徑，不稱現行未修或玩家整體共識，不引入多工人排程。

本輪沒有第三方code/素材/新依賴。Game Accessibility Guidelines指定頁、TinyLife EatAction頁讀取失敗，未當已核內容。未執行外部遊戲。拒絕任意新內容、家具鏈、自由選址/尋路、強制社交/採石、每日任務或存檔框架。

## 五輪後只提下一步

[3–5人探索腳本](HOMESTEAD-FIVE-PLAYTEST.md)聚焦：拒絕原因是否看得懂、一次吃飯是否符合預期、動態操作後能否繼續鍵盤、穩定後願不願自行安排家園或休閒。若另行指派工程，先修實際首次卡點/誤操作，必要才漸進揭露資訊，不先加第六輪內容。其他引擎政策交環境擁有人；本輪不繞過。未開始H51，server/browser結案關閉，成果本地待取回，不假稱遠端已發布。
