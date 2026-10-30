# H40–H42：菜園與灶的施工、現況與操作

本輪恰好三個新回合完成，未開始第四輪。主筆Cloud Codex，非作者 `/root/homestead_review`。base `649fcbf887da25514791be7b911685d8fab1f5bb`；隔離分支 `codex/solo-sect-homestead-garden-life`，實作HEAD `6842249e24db91fd2955c1665d6b3851bf5aee35`，後續提交僅交付紀錄。未push／PR／merge／部署／上傳／操作Mac。既有分支／交付全保留；不重接dev。原遠端H26成果與新本地工作分開。

## 三輪做了什麼

| 回合／實作commit | 玩家問題與完成內容 | 驗證／取捨 |
|---|---|---|
| H40／`c6f77449f61aef529f47494cf8dea8981c28cc88` | 菜園與灶只在完工整件出現。現在真交木齊且開始施工，才按真work顯土塊→畦列、石圈、改灶基座→側牆→爐口／煙道。改灶保留原露天灶能力。 | 作者459/459＋真UI12狀態、暫停／存讀。非作者新增3/3＋source/實圖。沒有新工序、成本、採石、時鐘或外觀進度計時器。 |
| H41／`baf54804883336dead850795dae883c892d99223` | 完成設施檢視只說永久效果。現在園顯真作物狀態、種子、庫存、在途與`blockReason`；灶顯真stage／真task、共用餐庫存及逐鍋`recipeReason`。 | 作者462/462＋零注入種植→收穫搬回→真一鍋；非作者3/3＋source/收據/真圖。隱藏已建設施不相干的施工路線／階段，不改資格規則。 |
| H42／`6842249e24db91fd2955c1665d6b3851bf5aee35` | 現場資訊到遠處原控制有斷點，390px尤其明顯。現場直接選既有持續農務、一鍋、一份及清除目前指派，顯成本／份數／耗時／飽腹等，按下重查資格與地塊。 | 作者466/466＋正常UI／合成UI事件競態；非作者4/4＋獨立390px fixture及作者圖核。只做adapter，不加一次性農務欄位、佇列、schema或新食譜。 |

具體範圍：`homestead-model.mjs`、`homestead-scene.mjs`（H40畫面），新`homestead-household.mjs`（只讀現況）／`homestead-household-actions.mjs`（只讀描述＋原API適配），`homestead-ui.mjs`／HTML／CSS；各有測試、browser工具、收據、圖及文件。完整變更清單在本地patch manifest。八個[模擬／內容／技能／需求／轉接／本篇邊界檔](HOMESTEAD-GARDEN-BOUNDARY.json)與base逐bytes一致；沒有新存檔欄位或介面。舊模式保留，主要新局仍獨居。

## 正常UI與真圖

作者Chromium **154.0.8037.57**／Playwright **1.62.1**。每輪獨立新局，正常按鈕／鍵盤，零資源／XP／設施／狀態注入；只讀`__homestead`作斷言。混暫停／4×／16×，世界秒不是1×壁鐘／真人完成時間。

- [H40收據](HOMESTEAD-GARDEN1-UI.json)：菜園t166.5／169／171.75／174.25；首灶232／235.25／238.5／241.75；改灶337.75／341.5／345.5／349.5秒。每項中期暫停、原存讀後work不變，再續作完成。[土塊](shots/homestead-garden-build-garden-feet-1.png)→[畦列](shots/homestead-garden-build-garden-finish-1.png)→[真完成](shots/homestead-garden-build-garden-done-1.png)；[首灶石圈](shots/homestead-garden-build-kitchen-frame-1.png)、[改灶側牆／舊灶](shots/homestead-garden-build-kitchen-frame-2.png)、[改灶完成](shots/homestead-garden-build-kitchen-done-2.png)。
- [H41收據](HOMESTEAD-GARDEN2-UI.json)：t175待播→182.75生長→216.75成熟→226.75[手上2菜、庫存0](shots/homestead-live-harvest-in-transit.png)→230.25搬回2菜；305.75料理中庫存0→313.5完成3熱飯。[生長](shots/homestead-live-growing.png)、[料理未結算](shots/homestead-live-cooking-not-produced.png)、[窄屏文字](shots/homestead-live-narrow-garden.png)。切地／鍵盤／暫停讀資訊無world變化。
- [H42收據](HOMESTEAD-GARDEN3-UI.json)：t175[現場鍵盤持續農務](shots/homestead-action-context-farm-narrow.png)，採收搬回後現場清除；306真manual一鍋、重複Enter不重置timer；313.75真扣2菜1木、入3基本熱飯；319.25吃1份剩2、手動意圖清空，主角可自主續農。[當前資格與選擇](shots/homestead-action-stove-ready.png)、[料理中](shots/homestead-action-cooking-not-produced.png)、[單次用餐後](shots/homestead-action-ate-one-narrow.png)。另合成pointer事件讓選地早於重繪，舊按鈕被拒；此為UI競態驗證，不冒稱純人工操作。390px是桌面viewport，不是真手機。

## 接受矩陣與可重跑命令

| 狀態 | 實際證據 |
|---|---|
| 通過 | 在`solo-sect/`跑`node --test test/*.test.mjs`：本次459/459→462/462→最終466/466。最終含理由修復後，約23.61秒。完整輸出`/workspace/deliverables/homestead-garden{1,2,3}-tests.log`；不把舊456改名新驗收。 |
| 通過 | 新聚焦`node --test test/homestead-garden-life.test.mjs test/homestead-household.test.mjs test/homestead-household-actions.test.mjs`各3／3／4項。真材料工量／功能未提前、現況純讀／實用階段、禁用資格、連點單次結算、在途改令釋約返倉。各檔在其回合及最後聚合實跑。 |
| 通過 | H42新增五seed各20000拍（每組5000世界秒＝20.83日），現場adapter與原命令API每拍world bytes相同，途中重讀一致；三性情均涵蓋，但不是三性情×五seed全排列。最低飢餓34.72、最低精力19.00，期末各有73／73／79／101／76次閒暇。這是特定固定指令等價與求生證據，不能當一般玩家偏好或新平衡分布。完整數字在最終log的`H42 parity`。 |
| 通過 | H42固定命令1200世界秒0.1／0.25／1秒dt回放相同；原48路20日／三性情／五seed20000拍／取消／多工地／存讀／舊模式矩陣隨本次聚合再跑，未縮樣本。沒有經濟變動，沒有另宣稱做了全新生產平衡研究。 |
| 通過 | `node tools/homestead-render-pair.mjs`：三個已完成場景與原H37 renderer呼叫1003／1033／1033相同，[H40測量](HOMESTEAD-GARDEN-RENDER-PAIR.json)。之後H41/H42未改renderer，復用此有界證據。fixture配對不等於正常UI／美感。 |
| 通過 | 從repo根跑`node solo-sect/tools/homestead-garden-build-browser.mjs`、`homestead-household-browser.mjs`、`homestead-household-actions-browser.mjs`（各前綴同上路徑），需先在8802啟動本地HTTP。作者三輪正常UI，後兩輪1440／390px，pageerror為空、無橫向溢出。H42最後用理由修復版實跑。 |
| 通過 | 非作者H40 3/3＋來源／8張作者圖；H41 3/3＋核心／UI diff／作者收據／完成與390圖；H42 4/4＋獨立390 fixture驗焦點、換地、缺木／無現成餐可見理由與ARIA描述連結，最後作者圖核。**未獨立重跑整條作者UI、466或render pair**，亦非真人輔具測試。 |
| 通過 | 語法、`git diff --check`、本輪文件本地連結；最終文字patch在乾淨base逐檔實套並比HEAD bytes。交付manifest另記實際hash與數量，不含.git／憑證／私人存檔。 |
| 失敗 | 無剩餘已知阻擋。初稿／測試／證據問題已修復，見下節；不等於不存在未知缺陷。 |
| 受阻 | Firefox/WebKit官方下載域`cdn.playwright.dev`、`playwright.download.prss.microsoft.com`先前政策403，本輪不重試／替代host／代理／executor／Mac。未改網路設定。 |
| 未測 | 真人喜好／理解／美感／耐玩、輔具使用者、真機Safari／手機、OS級IME、其他瀏覽器引擎、外部遊戲實跑／效能。本次不作效能改善宣稱，未跑其他未改產品全矩陣或遠端CI。 |

## 審查修復與失敗嘗試

1. **非作者實際發現並修復**：禁用理由只在`button.title`，鍵盤／觸控難取。改每項可見文字、用`textContent`及ARIA描述ID連結，獨立390px fixture核缺木／無料理等理由與無溢出。不是僅用顏色／hover傳意。
2. H40初測0.1比例浮點嚴格相等失敗，改斷言容差1e-12，未改真工量。H41測試建造XP fixture10不足Lv1，修為實際門檻12，未改技能規則。
3. H41窄圖原截到原生select彈出清單，腳本加Escape與明確focus後重走正常路徑重拍。H42初腳本把自主鍋當已指定鍋；依原API首次單鍋會換意圖，改先取得manual真task再驗重複Enter不重置。以上是測試／證據修正，不冒稱遊戲缺陷。
4. 曾兩次本地工具工作目錄誤設造成找不到test／檔案，沒有覆寫其他路徑，改正cwd後執行並以最終log為準。未用失敗命令的空輸出宣稱通過。

## 外部對照、採用與延後

| 第一手來源 | 真正採用與限制 |
|---|---|
| [0AD Foundation](https://docs.wildfiregames.com/javascript/simulation/Foundation.html) | 分開施工預覽與真work/buildprogress；H40只用荒居既有材料與工量。文件2022生成，不是現版0AD執行／效能審計。無第三方code／資產採用。 |
| [AoE玩家2022–2023視覺／可玩性討論](https://forums.ageofempires.com/t/visual-enhancement-of-buildings-without-compromising-playability/209624) | 固定占地內改善辨識、有不同玩家意見。延續前輪已核的歷史個人觀點，不當整體共識或現行bug。本輪不擴碰撞、自由選址、戰爭。 |
| [Widelands Production Sites](https://www.widelands.org/documentation/autogen_productionsite_lua_tribes_buildings_init/) | inputs與programs前置條件／動畫分開；H41/H42用共用資格函式與真庫存，不造第二套規則。延後生產鏈、工人與新排程。開源身份不代表要搬整個經濟。 |
| [Stardew官方1.6 changelog](https://www.stardewvalley.net/stardew-valley-1-6-update-full-changelog/) | 即時地點資訊；歷史修復「說澆水但未做」及不需澆水仍澆，提醒文案對應真結果。採園／灶現在狀態與實入庫，不搬社交／季節／新作物，也不把歷史修復稱當前未修bug。此次已取得完整頁。 |
| [AoE官方Site Based Commands](https://www.ageofempires.com/learn-to-play/match-goals-advanced-controls-xbox/) | 場景對象給相關常用命令可縮短操作路徑；H42接既有控制，選地本身不自動派人。不搬radial menu、自動多村民、軍隊、戰鬥與時間壓力。 |

這些來源支持設計假設，沒有執行外部遊戲、抄第三方程式或素材。沒有新授權依賴。三輪維持獨居求生→自己經營小家，沒有為進展強制社交／採石／新存檔系統。

## 到此停止；下一提案不是第四輪

先用[3–5人探索腳本](HOMESTEAD-GARDEN-PLAYTEST.md)觀察施工三段是否看得懂、田間／在途／入庫能否分清、現場按鈕是否減少翻找，以及持續／單次語義能否辨認。若後續另指派工程，只處理實際首次卡點或誤操作；例如若現場資訊太長，再依觀察做漸進揭露，不先塞新配方／家具／自由地圖。環境擁有人可另處理其他引擎政策；本輪不重試被拒下載。發佈／push／上傳仍需新的具體授權。
