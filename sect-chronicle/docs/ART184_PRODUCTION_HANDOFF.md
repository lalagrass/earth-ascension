# D35：Grok場景素材與雙人造型，出圖後接續實裝

主追蹤 [#184](https://github.com/lalagrass/earth-ascension/issues/184)，配置關聯 [#182](https://github.com/lalagrass/earth-ascension/issues/182)；[Grok提示詞](ART184_PRODUCTION_GROK_PROMPT.md)。擁有人於2026-10-24批准保留Gemini完成#274、Grok先獨立出圖，LP17通過後同一主筆接續實裝；最後補充「不用再限制時間四小時，就做到完成」。**本包不設4h／2h執行總上限、100分鐘凍結或按時停止；完成下面A–D才算完成。**

## 完整交付與並行方式

- Gemini繼續[#274／LP17](LP17_HANDOFF.md)，作者／範圍／既有期限不變。Grok不接其branch、demo/assets/lp17、未公開成果，不要求它等待新圖或重做。
- 本D35文件非作者接受→Earth合dev／postCI後，Grok本人在#184核有效作者，從當時最新dev、新codex分支／獨立worktree或自有clone新claim。#182只互連，不重複占claim。文件發布不等於已啟Grok。
- **同一Grok完成兩階段、一個完整主PR**：A先在獨立目錄出實圖，開draft PR展示整包；B在前置通過後同步最新dev、把採用素材與接線補進同PR，集中最終review。內部小commit／自校，不按樹、屋、人物、匯出換人或拆交接。
- A不必等LP17。B只在#274最終head非作者接受、Earth實際合dev且postCI成功後開始；先讀最終採用／掛點與最新dev，不憑issue關閉或PR綠燈猜已完成。B已獲本D35有限授權，不再逐圖／逐步請人類簽核；新玩法或幾何變更仍超出範圍。
- A交齊但LP17尚未完成，回填成果／head、標B blocked，清資源暫停受阻部分，不循環空等／預占runtime。之後同Grok依最新依賴接續；claim仍有效就回填階段／base，released／expired則重新認領，不能自重置舊期限。可跨session完成，不保證平台會自動續跑；不建立agent／排程。

## 一批要做的內容與取捨

| 重點 | 必做的可採用素材 | 本輪不擴大 |
|---|---|---|
| 場景主材質 | 沿目前道館／院落位置，灰瓦木構、石基石院、竹木作業物；與LP16藥圃／竹架及LP17已採用物件協調 | 不另做全圖新構圖競賽、不搬三層台地、不改房屋功能／村路／巡山系統 |
| 長路景物套件 | 同視角／光源／比例的松竹、樹石／路緣、溪岸泉池細節；地面與前景遮擋物分開，保持長路清楚 | 不把路縮短、加捷徑或畫出與實際導航矛盾的牆／崖 |
| 雙人造型資產 | 圓潤約13歲主角、藍衣紅結、少年臉與努力神情；較瘦長熟手少年、橄欖褐村衣／髮型；正側背與空身／負重／採藥關鍵姿態保持同一人 | 姓名／人物id／UI身份不改。堂弟村居偶訪仍作視覺來源，不改兩人fixture；女孩／第三AI、完整村民與新動作另排 |
| 接回真遊戲 | B用新素材替換最有價值的屋舍／景物與雙人外觀，完整保留LP17功能、原動作與長路速度差 | 不只交更多概念圖、不裁全景固定人物成sprite，不重造引擎／骨架或把變強畫成變瘦 |

先以已接受的 [Grok D32原圖](../experiments/water-carry/design/art184-scene-trio/README.md)作一致參考，結合公開dev的地圖／腳底尺度。出圖額度／編輯工具需如實確認；文字額度恢復不代表任何工具都可用。可用既有工具反覆修正手、桶繩、衣服與建物細節，不自行採購或開外部付費服務。

## 階段A：獨立出圖與素材規格

唯一可寫：`sect-chronicle/experiments/water-carry/design/art184-production/**`。交一個統一主案的素材與完整桌面合成、雙人關鍵姿態／細節、來源／實際prompt／工具及使用權；不強制固定張數、大量A/B或全57幀逐張生成。

- 保存實際生成原圖與必要清理／可編輯來源，分清概念、可直接載入、尚需去背／對齊的素材。需要透明的物件交真alpha，不把棋盤底或白邊當透明；若工具做不到就明列限制，不假稱已可用。
- 輸出清單寫尺寸、場景顯示比例、腳底／物件錨點、地面／可遮擋物分層及建議放置；一張合成圖說明與真UI／人物尺度的關係，標清合成、非已實裝。
- 雙人用同一外觀參考做必要編輯，優先讓臉髮、衣料、體態及持物一致。生成關鍵姿態不是完整動畫；後續B沿既有POSE與烘焙工具完成連續幀，不能讓每幀換一張臉或衣服。
- 不修改任何runtime、素材atlas、LP17工具／來源、PO／小說文件或8800；不讀Gemini未公開成果。可以只讀公開commit／dev，不必為畫圖開遊戲服務或跑模型測試。

## 階段B：LP17接受後，同Grok實裝

在PR記#274最終review、merge SHA／postCI，普通同步最新dev（不force push／reset他人分支），補最終採用／延後表。以LP17真正交付為基線，保留其工作、畫面控制、資產選擇與工具契約，不退回LP16重做。若只需新素材／painter便不改bake。

以 `sect-chronicle/experiments/water-carry/` 為根，B額外白名單：

- `demo/assets/art184-production/**`：選定素材、原創painter／manifest、新sheet與來源README；不覆蓋LP17／歷史來源。
- `demo/app.mjs`：素材載入、背景／props替換、人物外觀與必要可視掛點／衣袖色彩薄接線；原命令與模型推進不改。
- `demo/assets/long-water/scenery.mjs`：只替換材質／裝飾，保留stream／bridge幾何與前後遮擋契約。
- `template/tools/bake.js`：只在LP17已接受的擴充點上增加必要painter／out支持、保持預設行為；`demo/tools/export-art184.js`可作一個有限匯出入口，復用POSE，不複製動畫引擎。
- 本層`README.md`與`design/art184-production/**`：實際採用、必要少量真圖／聯絡表、來源與驗證摘要。

`model.mjs`、`routes.mjs`、`water-layout.mjs`、`palm.mjs`、HTML／CSS控制、`template/actions.json`／animator／walker／舊out、歷史spikes／design、LP17自有素材、checks、Earth／小說／根依賴CI／PO文件與8800只讀。必要越界在#184列具體原因與最小差異，停該部分，不用畫面需求改世界。

## A–D完成條件與集中review

| 組 | 完成判準 |
|---|---|
| A 素材與風格 | 有實際場景素材、雙人一致外觀及完整合成，分層／比例／錨點與來源可接手；不是只交prompt、更多全景或小幅濾鏡 |
| B 真正接線 | LP17前置成功後，同入口真使用選定屋舍／景物與活動雙人素材；保留所有現有動作、幀名／幀數、fallback／stride、原框腳底／hitbox與桶簍掛點，不掉幀／漂腳／新舊殘影。模型未變，只有視覺改善 |
| C 長路與操作 | 保留1700.9水路、515.2藥路、1600×1350世界與原坐標／速度／精力／成長／帳目。1×同路同負重仍可看差距；工作切換、跟隨、真交付與暫停維持。渲染只讀權威狀態、不加第二個時鐘 |
| D 完整可整合 | 來源／實際使用權、採用／延後、少量真桌面前後圖與驗證／清理同PR交付；非作者集中review、Grok集中補修、必要CI通過、Earth唯一queue合dev／postCI。#184／182母單其餘backlog不關 |

沿 [VALIDATION_POLICY](VALIDATION_POLICY.md)：A看實圖／alpha／來源／尺寸，不跑遊戲、root／SG／seed或手機；B只變更JS／diff、新素材與sheet契約、少量聯絡表及一段桌面真流程。未變模型與當前CI復用，**不本地重跑141／root全套**，不新增存在性／複製公式測試或永久runner。一般最多一頁／一臨時服務／一本地工作，烘焙與遊戲頁依序清理；成功、失敗、額度或中斷都清自建頁／程序、還原viewport並確認，不動8800。

## 做到完成與認領管理

沒有固定執行總時限，達成A–D就交付，避免把剩餘額度用於無關新圖／新玩法。根契約每次claim的4h是可續的作者租期，不是四小時必須交成品的倒數；到期前在#184附新commit／draft／實圖或驗證、剩餘與下一交付，按留言created_at＋4h續期。逾期／釋出依根流程重新認領；不無證據囤積名額，review等待不當失聯。

額度／工具／平台中斷就保存head、原圖／來源、已做／缺口與續接點，不能假稱已完成或假設離線會自動續跑。不得自啟其他agent／聊天／排程。原作者可恢復同包，先核最新依賴與claim，不改Gemini LP17原2h承諾。

最終PR→遊戲PO集中review→同Grok補修→Earth唯一queue。工程接受／合dev／postCI後由PO更新同8800，按[單版本政策](VALIDATION_POLICY.md#單一正式試玩版本)只留當前接受版，清前次自有部署；Git歷史／作者worktree與少量證據保留，不另建回退入口。
