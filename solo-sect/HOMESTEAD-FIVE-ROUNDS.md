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
