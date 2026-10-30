# 新的三輪：讓建設接回吃住與自主生活

2026-10-30，擁有人再次指派恰好三輪，H40–H42不重算。本輪主筆Cloud Codex，非作者`/root/homestead_review`。base `3ebe5060c8d27e6fe61dcd5f38e355966eb8fd30`，核實clean後隔離分支`codex/solo-sect-homestead-comfort-flow`，保留全部舊分支與成果，不重接dev。範圍只solo-sect，本地提交／測試／圖／patch，沒有push／PR／merge／部署／上傳／Mac／付費／排程或網路設定變更。現行資料／配方／地塊沿用；不做自由選址、強制社交、戰爭、採石、新存檔系統、大生產鏈。FF/WebKit403不重試、不換端點／executor繞過。

## 全流程檢視與第1輪H43事前規格

先檢視原source與正常UI建屋→菜園播種／成熟／搬回→灶料理→手動休息，沒有資源／XP／狀態注入。原H42已把園灶狀態及控制接起來，這輪不能重做相同面板當新進展。具體source問題：solo手動`order=rest`到100，rest分支只清task、不清order，下一拍又由手動意圖開始rest，必須另清除才能回原生活／工程。原UI只說「歇息」，沒有提示這種持續命令；自主休息到85本來就正常結束。正常UI重現收據另留`HOMESTEAD-COMFORT-BASE-UI.json`，不把source推論當已執行證據。

H43最小改動：solo手動休息到原100目標，清這次rest意圖回自主，原急餓／攜物先回仍沿pick/task；自主到85不改，其他原指派因疲勞休息不可被清掉，legacy原持續rest保留。UI明示「歇到精神恢復（一次）」以及完成回自主；不用新flag/schema/API/需求數值或新休息面板。精神已滿UI灰掉並有可見理由，避免無用途命令。沒有改房屋／床休息率、飲食或技能效果。

驗收：solo首屋/無屋/床兩級manual休息真到100只清rest，完成後接回已立工程或日常；auto85與非rest玩家意圖、legacy持續語義不改。急餓／攜物／改令／重複點／中段原存讀，無無限躺回／提前感受／XP；既有資料不添欄位。五固定seed配對只將舊版manual完成時加clear作oracle，world逐拍等價；不同dt回放及原完整適用聚合。真UI完整生活流程再休息，達標後不需手動clear，可由舊工程接續；鍵盤／390px。每輪非作者審查修復，再按結果定後兩輪，不預先塞新內容。

來源：[Yuka RestGoal原始碼](https://raw.githubusercontent.com/Mugen87/yuka/master/examples/goal/src/Goals.js)例子restDuration後COMPLETED、terminate重設疲勞，借『目標完成要回控制流程』；不搬其計時、瞬間清疲勞或引擎。[Stonehearth開發者2017 Alpha20](https://store.steampowered.com/news/posts/?appids=253250&enddate=1484876676)以實吃／床／遮蔽對應可檢查thoughts，借建設實際使用回饋，不搬情緒工作倍率／房間／軍事。來源是歷史設計與開源code閱讀，未跑外部遊戲。TinyLife SleepAction頁與Exile205本次讀取失敗，不當已核本文或當前共識；不藉來源失敗安裝依賴。

### H43結果／第1輪完成

基線正常UI重現t333精力100但order仍rest；task在每拍內即清空，初腳本誤期待task=rest，改斷言order/energy與null task後重走記錄。新版零注入全流程t324.25達100/order null，t339.5自主接續長凳工程；另390px全新局鍵盤休息t12.25完成、無溢出或pageerror。無需再按清除。完整UI混暫停/4×/16×，不當1×體驗耗時。

原聚合真失敗1/470：H24 seed3/tick3975床部件部分安裝work0.75已就位，工人從別處回屋時install/go把部件拉到工人位置，途中原存讀被拒。失敗raw保`/workspace/deliverables/homestead-rest-seed3-before-fix.json`。最小修：部件一旦在床位便留在床位；工人可單獨回屋續裝，loader允許該合法go狀態，未就位的真搬運仍與人同位，do仍要求人到床位。活動/路線說明分清人返場與搬部件。沒有新欄位或自動修復壞檔。之前已受拒的損壞raw不冒稱恢復；舊有效檔維持。新增反例work0/.75已就位與真在途，兼驗文字/存讀。

最後聚合471/471（23.15秒）、rest5項與construction9項聚焦14/14。pinned3ebe舊core加『觀察真manual滿100時顯式clear』oracle五seed各20000拍，與新版world逐拍bytes同，中途存讀/dt相容；受影響床升級另外原H24五seed完整矩陣覆蓋，不拿這個簡化oracle代替。非作者獨立rest5/5、完整growthTraffic seed3 20000拍／378次讀檔、source/作者正常UI收據，無阻擋；不是非作者全471或整條UI重跑。指出『缺糧先吃』只在開始下一任務選擇，作者改明示『開始歇息前』，未新增休息中斷規則。

## 第2輪H44事前規格：建造前能比較少等多久

H43全流程看原屋/床卡：只有每秒+1/+5與總恢復率，玩家要自行換算同一段休息究竟縮短多少，且滿精神看升級時目前缺量0更難比較。H44只把既有屋/床改良的效益接進原建造卡與前後模型說明，不新面板、家具、需求或buff。

純讀`restComparison`：相同屋內位置、同從30精力到手動原100，讀共用`restRate`算原0.25世界拍取整的純恢復秒數，現有→建好後（只投影一個stage，連原床/屋組合）。明示標準情境估算，不含走路/其他活動，不是已使用、1×壁鐘或遊玩實測；不把鎖住的預覽變真能力。原成本/資格/物流/技能/存讀不變。當前精神滿也看同一個非0/0例子。

驗收：屋0→1/1→2和床0→1/1→2，各有效屋/床組合，估算與兩個相同起始位置/精力的實際核心tick fixture達100時間一致；舒適床既有改善不弱化基本床，至少20%原目標保持。查詢多次/暫停/存讀/預覽不動world，legacy/非休息設施不混進此說明。正常UI零注入看首屋/修繕/木床/舒適床資格與前後估算，至少真做一項且真休息；鍵盤/390px/焦點，聚合和非作者審查。第3輪依此結果再定。

來源：本輪另核[Tiny Life FurnitureType.TypeSettings](https://docs.tinylifegame.com/api/TinyLife.Objects.FurnitureType.TypeSettings.html)的RestoreNeedModifier只對當前互動物件生效、OnDescription可列說明，借『物件真使用效果與可讀介紹同源』而不搬倍率/程式/資產（商業本體非全開源）；延續Stonehearth床/住處實使用thoughts的歷史原則。本作只用自己的restRate與固定參照，不假造外部遊戲的床數值，也不加情緒工作倍率。
