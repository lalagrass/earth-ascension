# 隔壁分支與社群設計：可套用清單與版本排程（2026-10-25）

> 範圍：只整理設計、排版本，**不實作程式**。對象是 `codex/solo-sect-grok`（本文件撰寫時 head `7eb0f7a`，程式 head `77e1b2d`，193 測試）。
> 不開 PR、不合併 dev、不碰 8800。巡山維持固定難度、依深度變強，不採說書人動態調整。

## 1. 隔壁分支摘要：`plan/sect-life-architecture-redesign`

- **位置：** 只存在擁有人 Mac 本機 `~/workspace/earth-ascension`，**沒有推上 origin**（`git ls-remote` 查不到）。本文是唯讀 `git archive` 取出的內容，沒有改動該分支。
- **head：** `32c1b88adbe00e206a6590ecf4f4e47261ceb9b9`（程式最後一筆 `5136191`）；base dev `148cfbbb27e4`；共 26 個 commit、53 檔、約 +24.6k 行。工作樹另有未追蹤的 `docs/sect_ascension/`、`guwu-game/`、`sect_ascension/`，本文未讀。
- **主文件：**
  - `sect-chronicle/docs/vision/SECT_LIFE_REDESIGN_MASTERPLAN.md`（1446 行總藍圖：五支柱、Smart Object 核心、七區擴建、雙軌創角、四層決策、同圖武學、S0–S5 巡山、21 位群俠、§5 開源借鏡 18 項、§5.3 十大痛點體檢、v0.1–v1.0 路線）
  - `sect-chronicle/docs/LIFE_V01_V02_HANDOFF.md` … `LIFE_V09_V10_HANDOFF.md`（五份工程規格）
  - `sect-chronicle/FEATURES.md`（自評：8 項共同 ID 已驗證／規劃；分支獨有 6 項中 5 項「已接線」、瀏覽器截圖未跑）
- **程式：** `sect-chronicle/life/core/*.mjs`（toils、reservation、smart-objects、autopilot、persona-creation、homestead、martial-combat、outreach-social、patrol-defense、martial-evolution、alchemy-forge、legendary-clashes、grand-founding-save、destiny-engine）＋ `life/data/*.json`；測試 `sect-chronicle/test/life-v01…v10.test.js`（96 項）。
- **重要現況（取自它自己的 FEATURES.md）：** `life/core` 尚未接進 demo 畫布的小人移動；面板按鈕多為即時結算；Save Schema v1 與舊 LIFE01 存檔並存。也就是說**它的價值主要在設計與資料結構**，程式不能直接搬。
- **與我方重疊很高：** 雙軌創角、六大經典模板＋同門搭檔、掌門即門派道統、四種性格巡山流派、羅漢拳歸真／獨孤九劍、21 位群俠——這些我方 v0.96–v1.35 已有對應實作，下面只挑**我方還沒有**或**做得更好**的部分。

## 2. 候選設計表

適用性：直接套＝規則幾乎照搬；改造＝要配合我方固定難度／自走／存檔；不套＝與已定決策衝突或不值得。成本：S＜半天、M 1–2 天、L 3 天以上。

| # | 來源 | 內容 | 適用性 | 理由 | 影響我方檔案／系統 | 成本 | 建議版本 |
|---|---|---|---|---|---|---|---|
| A1 | 隔壁 MASTERPLAN §5.3 體檢六；[DCSS Orb run](http://crawl.chaosforge.org/Orb_run) | **靈物散香・返程驚獸**：溜走流帶回深山珍寶時，回程每經過未清段要再檢定一次（扣耐力或掉一半戰利品）；先清場再溜走則 0 損耗 | 改造 | 補上我方「溜走流」可無限刷寶的漏洞，且強化郭靖＋韋小寶互補；檢定是固定值，不隨玩家強弱變動 | `src/expedition.mjs`（回程段、`evaded` 記錄）、`data.mjs` EXP 常數、戰報 | M | v1.45 |
| A2 | 隔壁 FEATURES 已知缺口（我方 FEATURES 也列）；[RimWorld Caravan](https://rimworldwiki.com/wiki/Caravan) | **巡山召回**：手動召回時從當前位置原路走回，不瞬移；已取得戰利品保留 | 直接套 | 我方 FEATURES 列為缺口；隔壁 PATROL01 已驗證過同規則 | `expedition.mjs`、`main.mjs` 巡山面板、存檔欄位 `exp.recall` | S | v1.45 |
| A3 | 隔壁 §5.3 體檢一；[RimWorld Letters](https://rimworldwiki.com/wiki/Letters)；[OpenTTD news](https://wiki.openttd.org/en/Manual/Game%20mechanics#news) | **三級事件分流**：C 只冒氣泡、B 右側竹簡可點跳鏡頭、A（名俠來訪、辟邪抉擇、破招）暫停或推鏡 | 改造 | 自走模式下玩家容易錯過高光；我方目前事件全進同一 log | `main.mjs`（log/卡片 UI）、`sim.mjs` 事件標級 | M | v1.45 |
| A4 | 隔壁 §5.2 優化二；[FreeSO](https://github.com/riperiperi/FreeSO) | **遲滯＋飽和衰減**：需求進出門檻分離（≤30 去睡、≥80 才起），同一休閒做完 60 秒內吸引力 −70% | 直接套 | 我方價值觀自走若無衰減會重複同一件事；純參數，不破壞個性驅動 | `mind.mjs`、`sim.mjs` 決策評分；需更新 golden hash | S | v1.45 |
| A5 | 隔壁 §2.4(1) 四層仲裁；我方 REVIEW 的可讀性需求 | **「現在／原因／下一步」三行**：面板標出觸發的是哪一層（指令／生理／作息／性格） | 改造 | 我方已有分層，缺可讀說明；直接加強「個性驅動」的可信度 | `mind.mjs` 回傳 reason、`main.mjs` 弟子面板 | S | v1.45 |
| A6 | 隔壁 §2.4(3)；[RimWorld Thoughts（Memory social）](https://rimworldwiki.com/wiki/Thoughts) | **共同記憶帳本**：每點好感對應一筆有時地的共同經歷（並肩巡山、代挑水、同桌吃飯），聊天氣泡從帳本取材 | 改造 | 我方 social 只有數值；帳本讓道侶／收養更有故事，也能給戰報引用 | `social.mjs`、`sim.mjs`、存檔遷移（新增 `mem[]`，上限 N 筆） | M | v1.5 |
| A7 | 隔壁 §5.2 優化五；[天下霸圖（巴哈姆特）](https://acg.gamer.com.tw/acgDetail.php?s=1594)；[ToME4](https://te4.org/) | **領悟線索透明**：未領悟武學顯示剪影＋明確條件（某招 Lv3＋某內功 Lv2＋地點） | 直接套 | 我方武學圖對未解鎖只顯示「？」；透明化是霸圖社群最常抱怨的點 | `arts.mjs`、`main.mjs` 武學圖 | S | v1.5 |
| A8 | 隔壁 §5.3 體檢四；`life/data/destiny-trees.json` | **宿命樹資料化**：岳不群、韋小寶等的階段解鎖與抉擇改成 JSON，引擎一個檢核器 | 改造 | 我方 `huashan.mjs`、`jianghu.mjs`、`wuxia.mjs` 已有逐角色 if；資料化後加角色不改程式 | `huashan.mjs`、`jianghu.mjs`、`wuxia.mjs`→新 `destiny.mjs`＋資料檔；golden 不應變 | L | v1.6 |
| A9 | 隔壁 §5.3 體檢九；[ONI 優先度](https://oxygennotincluded.wiki.gg/wiki/Priority) | **因才派巡**：自走掌門依需求選人（獸患高→清場流；前段已清＋缺靈草→溜走流；守關強敵→劍癡流） | 改造 | 我方自動派遣只看可用與戰力；和 A1 搭配才有意義 | `expedition.mjs` 自動派遣、`hero.mjs` 自走 | M | v1.5 |
| A10 | 隔壁 §2.4(4)；[DF Guildhall 公開講學](https://dwarffortresswiki.org/index.php/Guildhall)；[了不起的修仙模擬器](https://store.steampowered.com/app/955900/) | **下山義學識人＋外門雜務定額**：外門每日做滿雜務後才自由；內門與主角對雜務權重 0（缺糧警報除外） | 改造 | 我方已有外門／內門與 quota，缺「下山識人」招募管道與內門免雜務規則 | `sim.mjs`、`sect.mjs`、`main.mjs` | M | v1.5 |
| A11 | 隔壁 §5.3 體檢五（跨周目）；[太吾繪卷 傳承](https://store.steampowered.com/app/838350/)；[鬼谷八荒 輪迴](https://store.steampowered.com/app/1468810/) | **跨周目傳家寶**：上一局著書的鎮派絕學或神兵，下局花宿慧點帶入 | 改造 | 我方已有宿慧（v1.4，但只在 localStorage）；先把宿慧寫進存檔再談傳家寶 | `save.mjs`、`hero.mjs`、宿慧 | M | v1.6 |
| A12 | 隔壁 §5.3 體檢二（畫風濾鏡） | **江湖畫風濾鏡**：全明星／純金庸／純周星馳 | 改造 | 便宜且符合「怎麼經典怎麼來」；只過濾名俠池 | `wuxia.mjs`、`jianghu.mjs`、開局 UI | S | v1.5 |
| A13 | 隔壁 §2.1、§5.2 優化一；[RimWorld JobDriver/Toil](https://rimworldwiki.com/wiki/Modding_Tutorials/Toils) | **Smart Object＋五步原子工序＋預約守恆** | 不套（現階段） | 全面改寫模擬核心，會動 golden、存檔與幾乎所有測試；我方工作分派已穩定。只借「在途貨物取消時退回、不瞬移」這條規則 | — | L | 不排（記入 §16 之後再議） |
| A14 | 隔壁 §5.3 體檢二「說書人節奏閥門」；[RimWorld Storyteller](https://rimworldwiki.com/wiki/AI_Storytellers) | 依建築階段與冷卻控制名俠出現節奏 | 不套（威脅節奏部分）／已有（名俠冷卻） | 擁有人已否決說書人；我方名俠已有固定冷卻 3 日與條件門檻，屬固定規則，不動 | — | — | — |
| A15 | 隔壁 §5.3 體檢五「支持者課金包」 | 付費解鎖全模板、全屬性 | 不套 | 付費已延後到 Production milestone（§16） | — | — | — |
| A16 | 隔壁 §5.3 體檢一「10 秒確定性重播」、§5.3 體檢八 PiP 子母窗 | 名場面快照重播；巡山畫中畫 | 不套（重播）／改造（里程軸） | 我方巡山是背景模擬＋戰報（已定），不在地圖上跑小人，PiP 無畫面可跟；改為巡山面板的**里程軸**（S1✔ S2✔ S3 進行中）即可，併入 A3 | `main.mjs` 巡山面板 | S | v1.45（併 A3） |
| A17 | 隔壁 §5.3 體檢十「四大武道相剋環」 | 破綻→蓄力→卸力→歸真→破綻 | 改造（延後） | 有趣但會動戰鬥平衡，先等長時間平衡試玩（SS-BALANCE-LONG）的數據 | `arts.mjs`、`expedition.mjs` 戰鬥 | M | v1.6（看試玩結果） |
| A18 | 隔壁 v0.3 膳房／名菜／釀酒（`homestead.mjs`） | 菜園、四階名菜、乾糧袋 | 不套（乾糧已有） | 我方巡山已有乾糧與營地帶糧；名菜可留給喜好系統，不新增菜園系統 | — | — | — |

## 3. 與我方已定決策的衝突

1. **說書人節奏（A14）**：隔壁用 RimWorld Storyteller 控制名俠與威脅節奏；擁有人 t94u 已否決動態調整。我方只保留固定冷卻與條件門檻。
2. **課金（A15）**：隔壁設計了支持者包；我方付費延後到 Production。
3. **核心重寫（A13）**：隔壁主張另起 60Hz Smart Object 核心；我方是已驗證的 vanilla JS 模擬＋golden hash，重寫風險遠大於收益。
4. **巡山呈現（A16）**：隔壁讓小人在地圖上跑並開 PiP；我方已定「背景模擬＋戰報」。
5. **跨周目（A11）**：隔壁讓天命點可課金取得；我方宿慧只靠遊玩取得、上限 +3。

## 4. 版本排程（v1.4 之後，依優先序）

| 版本 | 主題 | 內容 | 前置 |
|---|---|---|---|
| **v1.45** | 巡山補洞＋看得懂 | A2 召回、A1 返程驚獸、A3 三級事件＋A16 里程軸、A4 遲滯衰減、A5 現在／原因／下一步 | 無；A4 要重產 golden |
| **v1.46** | 長時間平衡試玩 | 原先提議的 SS-BALANCE-LONG，在 v1.45 規則上跑，產出平衡報告 | v1.45 |
| **v1.5** | 人情與門派運作 | A6 共同記憶帳本、A9 因才派巡、A10 下山義學＋內門免雜務、A7 領悟線索、A12 畫風濾鏡 | v1.45（A9 依賴 A1） |
| **v1.6** | 資料化與傳承 | A8 宿命樹 JSON、A11 宿慧入存檔＋傳家寶、A17 相剋環（視試玩數據） | v1.46 報告 |

每版照 FEATURES.md 範本交付，三張截圖；能做真實 UI 流程的才標「已驗證」。

## 5. 需要擁有人決定（最多 3 項）

1. **返程驚獸的懲罰強度**：預設＝每經過一段未清段扣耐力 6，耐力不足才掉一半戰利品（不受傷、不陣亡）。替代：直接受傷。
2. **長時間平衡試玩放在 v1.45 之前還是之後**：預設＝之後（v1.46），因為 v1.45 會改巡山規則，先試玩數據會作廢。
3. **隔壁分支的程式要不要直接借用**：預設＝只借設計與資料結構，不複製程式（它尚未接進畫布、存檔格式不同，且分支沒推上 origin）。

## 6. 參考連結

- 隔壁分支（本機）：`plan/sect-life-architecture-redesign` @ `32c1b88`
- RimWorld：[Thoughts](https://rimworldwiki.com/wiki/Thoughts)、[Letters](https://rimworldwiki.com/wiki/Letters)、[Caravan](https://rimworldwiki.com/wiki/Caravan)、[AI Storytellers](https://rimworldwiki.com/wiki/AI_Storytellers)
- Dwarf Fortress：[Guildhall](https://dwarffortresswiki.org/index.php/Guildhall)
- The Sims 開源重製：[FreeSO](https://github.com/riperiperi/FreeSO)
- DCSS：[Orb run](http://crawl.chaosforge.org/Orb_run)
- ONI：[Priority](https://oxygennotincluded.wiki.gg/wiki/Priority)
- 太吾繪卷 [Steam 838350](https://store.steampowered.com/app/838350/)、鬼谷八荒 [Steam 1468810](https://store.steampowered.com/app/1468810/)、了不起的修仙模擬器 [Steam 955900](https://store.steampowered.com/app/955900/)
- ToME4：[te4.org](https://te4.org/)、OpenTTD：[wiki](https://wiki.openttd.org/)

> 社群連結多數沿用隔壁 MASTERPLAN §5.1 的引用與公開 wiki 頁面，本次未逐頁重新抓取驗證。
