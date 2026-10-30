# 自主生活 A01–A20

主筆 grass / Codex `/root`；Cloud `/workspace/earth-ascension`。
本輪擁有人直接指派（規劃聊天轉交），base bc5dc0567cb088af7fa94fbbabe7288a8ba8305c；隔離 `codex/homestead-autonomy`。
本輪只本地提交，不推送／PR／合併／部署。修改 solo-sect 自主決策、必要相容、UI、相關測試與證據。歷史 H23/H28 不自主立工程結論保留；本輪新模式明確獲准自主立工程。

新 UI 獨居局啟用自主發展；API 預設與舊檔仍 classic，`?classic` 保留原路徑；`?legacy` 不改社交舊路徑。沒有新存檔介面。

## A01 規格（實作前）
問題：現有 pick 不會產生工程。新局只有吃果、發呆。
差異：持續 shelter 目標自主立首屋藍圖，沿舊備料／搬運／施工；不給資源與XP。飲食／精力優先，安全取消工作保留已交料／工量，恢復後續作。UI 讀真進展／受阻。
驗收：新局僅 start／倍率，600世界秒內首屋完工且實際歇息；飢餓不歸零。中斷／在途存讀／暫停保留，老檔預設無新規劃器。時間切分等價。
範圍：homestead-autonomy.mjs、core/UI 連接、autonomy 測試／正常瀏覽器工具；不改引擎、材料配方、收入／耗用。

## 路線
A01安家 → A02熱飯供應 → A03跨前置吃住改善 → A04性情順序 → A05障礙恢復 → A06真經驗影響 → A07工作休閒節奏 → A08高層方向／否決 → A09有限安居願景 → A10整體無指令與介入驗收。
A10完成後依實際缺口規劃 A11–A20 並繼續實作，不等批准；A20交付停止。

## 來源（本輪已核讀，不是外部遊戲實跑）
- https://github.com/luxkun/ReGoap ：採目標／前置／效果／失敗重規劃原則，自寫小型決策，無C#移植。
- https://docs.tinylifegame.com/api/TinyLife.Actions.ActionType.AiSettings.html ：需求以外的自主優先度概念；商業本體非開源，不聲稱已有建屋AI。
- https://docs.veloren.net/veloren_rtsim/rule/npc_ai/index.html ：長活動與controller分離，保留本作task執行。不搬Rust。
- https://forum.revolutionarygamesstudio.com/t/utility-ai-restructuring-the-ai-system/919 ：2022歷史提案，分析／選擇／執行分離，不當成已落地共識。
無第三方程式／素材／新依賴。

A01作者驗證：3/3聚焦；修驗證前聚合483/483（舊481＋A01二例），兩個讀取／文字補修後聚焦重驗。正常UI只開始／倍率16×，首屋102.5世界秒、262.75秒時已用屋內休息，觀測最低飢餓37.49／精力21.85；不是1×壁鐘時長。新圖與AUTONOMY-A01-UI.json保留。非作者獨立2例＋在途中斷探針，指出未來時間／重複完成和起始假完成文字，作者已修。真人樂趣／FF/WebKit未驗，不用此證明有趣。
A01非作者複審：3/3＋390px正常start→pause初始文字、400ms暫停不進時、無溢出／pageerror；兩項修復通過。未重跑全483或作者完整屋舍流程。

## A02 規格（base ba52cc5）
問題：有屋仍只採果；差異：hotFood 持續目標解出菜園→灶→真播種／收菜／備柴／料理→實吃熱飯。吃到才完成，不以建好灶冒充供應鏈。危急先吃果，之後續原目標；最多一個自主工地。新增最小實吃計數與拒讀，舊自主資料預設0，classic無變。驗收零派工1200世界秒內完成並吃熱飯；材料與XP只從原執行器產生，dt／存讀一致。
A02作者4/4；非作者獨立4/4＋菜園暫停250秒完整保留／未偷立灶／恢復後熱飯實吃，缺欄預設0、負數／非整數／非有限拒讀。正常新局UI真鏈與圖見AUTONOMY-A02-UI.json（僅開始／倍率）；非作者未跑瀏覽器／聚合。未核真人好玩。
