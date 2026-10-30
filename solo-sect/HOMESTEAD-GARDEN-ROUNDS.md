# 又三輪：從施工接到真正生活（2026-10-30 UTC）

擁有人新指派恰好三輪；H37–H39完成不重算。本輪主筆Cloud Codex、非作者 `/root/homestead_review`。base `649fcbf887da25514791be7b911685d8fab1f5bb`；分支 `codex/solo-sect-homestead-garden-life`。核實clean工作樹後接續，原分支／成果保留，不重接dev。只本地solo-sect工程與提交，不push／PR／merge／部署／上傳／Mac／付費／排程／網路安全變更，不重試被拒FF/WebKit下載。

## 第1輪H40事前規格

實際source與非作者核：菜園只在正式stage才有土／三排畦，灶也在stage1/2完工才整件出現，施工仍通用框。這不是重做H38木作：只補既有菜園首築、灶首築與改灶表現。

來源核[0AD Foundation真工作量／預覽分離](https://docs.wildfiregames.com/javascript/simulation/Foundation.html)（2022生成文件），延續先前[AoE視覺／占地社群討論](https://forums.ageofempires.com/t/visual-enhancement-of-buildings-without-compromising-playability/209624)對不改占地改善辨識的歷史個人觀點；本次另讀[Stardew官方1.6 changelog](https://www.stardewvalley.net/stardew-valley-1-6-update-full-changelog/)真位置／地點資訊思路，後續只借狀態對應呈現，不搬新農作／社交／季節／素材。未執行外部遊戲，來源不證明荒居好玩。

範圍：菜園按真work顯逐塊整土→畦列（施工不是種植，未正式完工不畫作物）；初灶從少量石圈到完整圈，鍋／火與料理能力仍要真stage；改灶保留可用舊灶，真work顯基座／兩側／爐口與煙道收尾。材料未交齊或work0不增長，模型預覽只畫完成設施。沿原成本、施工時間、供給、技能、需求、tick與存讀；不加採石鏈或手動新工序。

驗收：零注入UI首屋→菜園→初灶→改灶，各至少前／中／後／完成圖與真work；暫停／存讀／離開休息不增工。未完成園不能farm、灶不能cook，改灶未完不能燉菜；完成造型呼叫與原renderer配對相同。真鍋火只對應實際熱料理活動，不靠裝飾給效果。適用聚合及非作者有界審查，修復後回顧再定第2/3輪。後續優先考慮已建園／灶inspector缺即時狀態的實際決策缺口，不預填功能湊數。

### H40結果（第1輪完成）

作者 `node --test test/*.test.mjs` 459/459；新增3項聚焦全部通過。初次以嚴格相等驗0.1比例受到浮點表示失敗，改測1e-12容差後重跑，未調整遊戲工量。正常Chromium154零注入UI用暫停／4×／16×，菜園世界166.5→174.25、初灶232→241.75、改灶337.75→349.5秒，各前中後／完工12圖；每項中段暫停、原存讀後work不變，再真復工完工。倍速混用不是1×體驗耗時。完整收據`HOMESTEAD-GARDEN1-UI.json`及工具可重跑。作者三組已完成場景與原H37 renderer呼叫配對仍1003/1033/1033完全相同。

非作者 `/root/homestead_review` 獨立跑新增3/3、讀source並看菜園3段／初灶3段／改灶前中段實圖，核對材料門檻、無提前農作／鍋火／燉菜、舊灶仍可用，未見阻擋；459不是reviewer全量重跑。美感／真人理解與耐玩性未驗；FF/WebKit下載政策受阻未重試。H40不改executor／經濟／存檔schema。

## 第2輪H41事前規格

實際UI及非作者指出：已建菜園／灶的現場檢視只寫設施永久能力和「可繼續生活」，玩家必須到右欄找作物與食譜現況。只補既有檢視的即時生活資訊，不新配方／新派工／新數值。園顯待播／生長／可收與種子、菜量及在途，直接用`blockReason(farm)`解釋需求、攜物、容量、種子等阻擋；灶顯當前真正可用stage、當前做哪鍋／尚未結算、共用料理庫存與每鍋`recipeReason`。改灶未完仍說舊灶可用，不把已立藍圖當stage2。具備配方條件不等於會立刻忽略吃睡開工。

驗收：pure model不改資源／XP／任務；空／生長／成熟／容量不足／在途／飢餓精力／未建成／改灶施工及缺技能材料等truth tests；真UI零注入建屋園灶、播種→生長→採收搬回、選一鍋→真完成，文字隨真狀態更新、無早入庫、切換清掉舊資訊；鍵盤／390px窄屏，暫停看資訊不推世界。聚合／獨立review後決定第3輪。

[Stardew官方changelog](https://www.stardewvalley.net/stardew-valley-1-6-update-full-changelog/)的地點即時資訊與農作家務回饋提醒顯示要跟真狀態；[Widelands工作設施文件](https://www.widelands.org/documentation/autogen_productionsite_lua_tribes_buildings_init/)為既有工作缺料可解釋的參考，H41只用荒居共用資格函式，沒有搬入生產鏈／新依賴。來源是設計原則，不是本遊戲真人驗收。

### H41作者結果（第2輪）

新增3/3，聚合462/462（22.69秒）。測試fixture初誤用建造10XP不足Lv1，修為真門檻12；沒有改技能／資格來迎合測試。正常Chromium零注入：菜園t175待播→182.75播成生長→216.75成熟→226.75手持2菜、庫存0→230.25實入庫。灶t290.5可用→305.75料理中未產出→313.5真入庫3份基本飯。食材／種子／task明細在`HOMESTEAD-GARDEN2-UI.json`。所有檢視／窄屏切換不改world；未完成菜不當現成菜、未完成鍋不發XP。390px無橫溢出，切其他地塊不留舊生活文案。第一張窄圖截到原生select彈出清單，純腳本加Escape與明確focus後重走正常UI重拍；非遊戲缺陷。

H41非作者 `/root/homestead_review` 獨立跑3/3、讀核心與UI diff、核對正常UI receipt並看完成／390px真圖，未見阻擋；沒有獨立重跑完整UI或462。確認現場資訊到遠處原控制的操作斷點支持H42最小adapter。

## 第3輪H42事前規格（最後一輪）

實際H41走查要從左側菜園／灶現況另捲右欄找原有派工，390px時兩者相隔多張卡。非新增配方／新一次性農作：在已建菜園／灶的現場檢視接既有控制。菜園是明示「持續照料」直到清除（生長／需求會暫候），灶每道是原有「只做這一鍋」與庫存「吃這一份」，另可清除目前任何手動指派回自主生活。原卡照常可用，不另起一套任務或預約。點選地塊本身仍不派工、不暫停世界；按鈕須明確操作才會叫原API。

採[Age of Empires官方Site Based Commands](https://www.ageofempires.com/learn-to-play/match-goals-advanced-controls-xbox/)按場景對象給常用命令、縮短選擇路徑原則；不搬其自動派村民、戰爭／軍隊／radial menu。繼續採Widelands前置條件資料與Stardew真狀態回饋原則，無第三方程式素材。既有農作持續命令足夠，拒絕另加one-shot農作欄位／scheduler／存檔工程；也不為第三輪新加生產鏈。

驗收：共用唯讀action descriptions與當下資格，按下時重查真正選中且已建設施；過期／未知／其他地塊／legacy命令不作用；缺料／技能／容量／吃飽不能偷產出。連點原API冪等不重設真tasktimer；取消／改令保材料預約與在途；一次鍋／一次餐保持原完成清意圖語義，持續農作清除後不保留指派。純查操作列不改world，真派工與直接叫既有API逐tick等價（三性格固定指令／重讀／dt），原聚合不縮樣本。正常UI零注入現場種菜搬回→做一鍋與吃一份→清除／自主留居，鍵盤Enter與390px長按重繪／焦點不丟／選地不發錯命令。非作者審查修正後結案，恰好3輪，不開第4輪。
