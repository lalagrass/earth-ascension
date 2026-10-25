# 後續優化路線（v1.8 起）— 2026-10-26

- 狀態：**只規劃，未改遊戲程式**（擁有人 pt138u「參考社群或開源或其他 branch，規劃後續優化方向」）。
- 輸入：`BALANCE-REPORT-v175.md`、`BALANCE-FIX-v176.md`（v1.76 長跑數字）、`PORTRAIT-BACKLOG-2026-10-25.md` §7／§7.1、`ADOPTION-PLAN-2026-10-25.md`（A7–A10 未做）、`ROADMAP.md` v1.5 列的 v1.55 延後項。
- 量測：所有驗收數字都用同一套長跑：`artifacts/review-fix/longrun.mjs 30`（35 案＝7 開局×5 種子）＋`artifacts/v175/longrun-extra.mjs`（傳功用 `s.passed` 計；**不可用 s.log 數事件，只留 60 筆**）。
- 連結：2026-10-26 以 curl/搜尋核對可開（200）；fandom／wiki.gg 對本機 403，改引官方 wiki 或搜尋結果核到的內容頁。只借設計觀念，不搬程式或素材。

## 0. v1.76 基準（本文所有「現況」）

| 指標 | v1.76 | 目標（本文提議） |
|---|---|---|
| 錢 第 30 日／第 10 日 | 4.6×（第 30 日 1026–2576） | ≤2.0× |
| 建築到頂日 | 第 4–8 日（16/17 階） | 第 15 日前 ≤70%；第 25 日仍有可蓋 |
| 道侶 | 平均 14.5 對（4–21） | 3–5 對 |
| 傳功完成 | 6 799 次／35 案（每案每日 5–6） | 每案每日 ≤1.5 |
| 岳不群到 1600 | 3/5（最低 901） | ≥4/5 |
| 郭靖到 1600／最遠 | 1/5／1444 | ≥3/5／≥1500 |
| plain 人數／最遠 | 7／482–551 | ≥10／≥700 |
| 獸襲重傷／倒地 | 0 | 每案 0.5–2 次山門內重傷，死亡 0 |
| 族群（ring） | 7 區全滿、沒有一區被清到 0 | 每案 ≥1 區被壓到 ≤30% 上限 |
| 存丹 第 30 日 | 0–10（產多用少） | 產用比 ≤1.3 |
| 無盡段 | 0 案 | 35 案皆有「不設目標」組 |
| 前 5 日斷糧 | 0.3 天（維持） | ≤1 天（不退步） |

## 1. 各問題：前例 → 建議 → 成本 → 預期指標

成本：S＜半天、M 1–2 天、L 3 天以上（同 ADOPTION-PLAN）。

### I-1 錢沒有出口（P1）
- **前例**
  - [OpenTTD 經濟](https://wiki.openttd.org/en/Manual/Economy)、[基礎建設維護](https://wiki.openttd.org/en/Archive/Community/Infrastructure%20maintenance)：維護費 ≈ C·N^1.5，越大越貴；另有通膨。
  - [Songs of Syx 交易／國庫](https://songsofsyx.com/wiki/index.php/Trading)：國庫每年正負各 10% 被抹掉；傭兵日薪。
  - [Against the Storm 女王不耐](https://wiki.hoodedhorse.com/Against_the_Storm/Queen's_Impatience)：叫商人第一次 +0.5，每次加倍（成本遞增）。
  - [RimWorld Hospitality](https://github.com/OrionFive/Hospitality)（模組）：訪客進來花錢，等於讓「別人」把錢帶進來、也給你買東西的對象。
  - [DF 貴族／敕令](https://dwarffortresswiki.org/index.php/Mandate)：升階貴族會提出指定物品需求，是中後期的「被動支出」。
- **建議**（三件，依序）
  1. **月俸**：內門、師父、長老每 5 日領俸（依位階），付不出→心境降、可能離山。這是固定支出，隨人數超線性增長（借 OpenTTD 的 N^1.5，但上限封頂）。
  2. **建築維護**：每座建築每 5 日維護費，丹房、祠堂高一級；沒付→效率降一半（不拆除）。
  3. **主動花錢的選擇**：山下市集（買靈草／兵器／書）、請名俠講學（按次漸貴，借 AtS 加倍）、香火捐（換聲望）。
- **成本**：M（1、2 共用一個 upkeep 結算＋資料表）；3 是 M。
- **預期指標**：第 30 日／第 10 日 ≤2.0×；第 30 日錢 ≥0 的案 35/35（不能把人逼破產）；離山因欠俸 ≤1 人／案。

### I-2 建築第 4–8 日到頂（P1）
- **前例**
  - [RimWorld 財富](https://rimworldwiki.com/wiki/Wealth)與[襲擊點數](https://rimworldwiki.com/wiki/Raid_points)：蓋越多越值錢、襲擊越強，建造本身有代價。
  - Going Medieval：[JSON 檔說明](https://goingmedieval.fandom.com/wiki/JSON_Files)列 `BuildingWealthMultipliers`（影響力等級靠累積財富）。
  - [Banished 住房](https://banished-wiki.com/wiki/Housing)：建造跟人口週期綁在一起，一次蓋太多會讓同齡潮一起老去。
  - 太吾繪卷（[Steam](https://store.steampowered.com/app/838350/)）、了不起的修仙模擬器（[Steam](https://store.steampowered.com/app/955900/)）：建築分階，高階要「名聲／境界／特殊材料」門檻。
- **建議**
  - 第 3、4 階擴建要**聲望門檻＋稀有料**（巡山遠段掉落的鐵木、靈石），把建築接到巡山進度。
  - 鎮派建築走正常藍圖流程。
  - 加「建築槽位」上限：擴地要花錢（同時是 I-1 的出口）。
- **成本**：M。
- **預期指標**：
  - 第 10 日建成比例 ≤60%，第 20 日 ≤85%。
  - 第 25 日仍有可蓋項的案 ≥25/35。
  - 到頂日中位數 ≥第 18 日。

### I-3 成親太多（P2）
- **前例**
  - [RimWorld 婚姻](https://rimworldwiki.com/wiki/Marriage)：求婚有被拒機率，被拒有心情懲罰。
  - [RimWorld 社交](https://rimworldwiki.com/wiki/Social)：關係要時間累積。
  - [DF 婚姻](https://dwarffortresswiki.org/index.php/Marriage)：要長期好感，且多數矮人一生不結。
  - 活俠傳（[結緣攻略](https://smilin.net/LoM-wiki/event/pursuit/girl0)）：要好感 ≥60、心上人鎖定、事件觸發，且扣 200 貢獻度，成親是一件**有代價的大事件**。
- **建議**
  - 門派級冷卻：每 5 日最多 1 對。
  - 好感門檻拉高，並加「心上人」唯一鎖定。
  - 成親需掌門同意＋花錢辦喜事（I-1 出口）。
  - 被拒加一個短期心情懲罰（RimWorld 式）。
- **成本**：S（冷卻＋門檻）；M（加喜事與被拒）。
- **預期指標**：道侶 3–5 對（範圍 1–8）；第 10 日前成親 ≤1 對。

### I-4 傳功太頻繁（P2，v1.76 新發現）
- **前例**
  - [DF 公會講學](https://dwarffortresswiki.org/index.php/Guildhall)：講學是排程活動，不是隨時想做就做。
  - [FreeSO](https://github.com/riperiperi/FreeSO)（ADOPTION A4）：飽和衰減。
- **建議**
  - 傳功基礎分 80→60（v1.75 報告原提案）。
  - 同一對師徒冷卻 1 日。
  - 每位師父每日 ≤1 次。
  - 套 A4 的飽和衰減。
- **成本**：S。
- **預期指標**：每案每日傳功 ≤1.5；練功／研讀總量不降超過 10%；前 5 日斷糧不退步。

### I-5 岳不群退步、郭靖弱、plain 弱（P1／P2）
- **前例**
  - [Against the Storm 難度表](https://wiki.hoodedhorse.com/Against_the_Storm/Beginner%27s_Guide)：直接標「Settler／Pioneer／Veteran／Viceroy」差異，玩家知道為什麼難。
  - [Kenshi](https://store.steampowered.com/app/233860/)：開局（例如「Nameless」「Holy Sword」）明說難度，弱開局是故意的，而且有明確成長路徑。
  - [DF 移民](https://dwarffortresswiki.org/index.php/Noble)／[Banished 遊民](https://banished-wiki.com/wiki/Nomad)：人口靠事件流入，不靠模板。
- **建議**
  - **岳不群**：先查因（v1.76 糧荒閘門 ×0.35 是否壓到他的紫霞功修練或華山劇情）。在 longrun-extra 加每開局的「糧荒閘門觸發日數」與「被壓活動分佈」；若是閘門造成，把劇情任務加進 `keep`。成本 S。
  - **郭靖**：補一位早期同門（黃蓉已在），或讓降龍掌前 10 日有保底傷害。也可以接受他偏難，把開局卡標成「困難」。成本 S–M。
  - **plain**：A10 下山義學識人（招募管道）＋名俠池開放給自創主角。成本 M。
- **預期指標**：
  - 岳不群到 1600 ≥4/5。
  - 郭靖到 1600 ≥3/5，或標成困難並寫明。
  - plain 人數 ≥10，最遠 ≥700。

### I-6 獸襲沒有威脅、財富不影響襲擊（P2）
- **前例**
  - [RimWorld 襲擊點數](https://rimworldwiki.com/wiki/Raid_points)：點數＝財富曲線（0→14k 為 0，400k≈2400，1M≈4200）×適應因子×難度；[說書人](https://rimworldwiki.com/wiki/Storyteller)控制節奏。
  - Going Medieval：`DaysFromStartMultipliers`（700 日後 ×15）；`workerCountMultipliers`（3 人時 ×0、4 人時 ×0.5，見[社群拆檔](https://www.reddit.com/r/goingmedieval/comments/1py63bh/question_answered_on_why_youre_not_getting_raids/)）。
  - [Songs of Syx 劫掠者](https://songsofsyx.wiki.gg/wiki/Raider)：人口到 200 才開始；比較「庫存＋錢」與軍力，決定勒索或進攻，可以付錢了事。
  - [Kenshi 飢餓盜匪](https://kenshi.fandom.com/wiki/Hungry_Bandit)：只搶食物，可付錢改善關係，有明確動機。
  - [DF 圍城](https://dwarffortresswiki.org/index.php/Siege)：由財富與人口觸發。
  - [Cataclysm DDA](https://github.com/CleverRaven/Cataclysm-DDA)：怪物進化／屍潮隨時間升級（[文件](https://docs.cataclysmdda.org/)）。
- **建議**
  - 威脅點數＝f(錢＋存糧＋丹藥＋建築數)×天數係數，有上限，並設**人數 <8 時 ×0** 的寬限（借 Going Medieval）。
  - 新增「山賊勒索」：付錢（I-1 出口）或迎戰，借 Songs of Syx／Kenshi。
  - 野獸只搶糧（借 Kenshi）。
  - 先照 v1.75 #8 把「山門內受傷」和「巡山歸隊傷員」分開統計。
- **成本**：M（點數＋勒索）；S（分開統計）。
- **預期指標**：
  - 山門內重傷每案 0.5–2 次，死亡 0。
  - 被勒索時付錢的案 30–70%（兩種選擇都有人走）。
  - 富的開局（阿星）遇襲強度 ≥ plain 的 2×。

### I-7 族群不會減少（P3）
- **前例**
  - [Veloren](https://github.com/veloren/veloren)：rtsim 讓野外族群與經濟持續模擬。
  - Against the Storm [Blightrot](https://wiki.hoodedhorse.com/Against_the_Storm/Blightrot)：污染要專人清除，不清會擴散。
  - 本 repo `origin/codex/autonomy-ecology-backlog`（有界鼠群生態）與 `origin/codex/patrol-defense-backlog` `PATROL_DEFENSE_RESEARCH.md`（BL-D07：清過不等於永久安全、驅離不等於根除、個體 ID 不重生）。
- **建議**
  - 繁殖率依「距上限」與「巢穴存在」決定。
  - 加入巢穴：清巢→該區上限暫降 50%，持續 5 日。
  - 擊殺累計影響上限。
- **成本**：M。
- **預期指標**：每案 ≥1 區被壓到 ≤30%，且 5 日內回升（不是永久清空）。

### I-8 丹藥過剩（P3）
- **前例**
  - Songs of Syx：交易用「出口倉」換東西。
  - OpenTTD [車站貨物會散逸](https://wiki.openttd.org/en/Manual/Stations)（囤積有損失）。
  - 了不起的修仙模擬器：丹藥有品階與用途分流。
- **建議**
  - 療傷丹可賣到山下市集（錢入，平衡 I-1 時要算進去）。
  - 存丹 >10 開始陳化（每 5 日 −10%）。
  - 自動派發給練功傷者。
- **成本**：S。
- **預期指標**：產用比 ≤1.3；第 30 日存丹 ≤6。

### I-9 無盡段沒測（測試面，先做）
- **前例**：RimWorld 的財富曲線在後期才會發威；Going Medieval 的天數乘數要跑到幾百日才看得出來。後期問題只能靠長跑發現。
- **建議**
  - longrun 加「不設目標」組：60 日、35 案。
  - longrun-extra 加：
    - 每 10 日的錢、建築、族群、傷亡快照
    - 每開局的糧荒閘門觸發日數
    - 傳功／成親的每日分佈
  - 產出固定欄位 JSON，供後面每版比較。
- **成本**：S。
- **預期指標**：35/35 跑完、0 不變式違規；之後每版報告都附「60 日」欄。

### I-10 ADOPTION 未做項
| ID | 內容 | 前例 | 成本 | 排入 | 指標 |
|---|---|---|---|---|---|
| A7 | 領悟線索透明 | [ToME4](https://te4.org/)、天下霸圖社群抱怨 | S | v1.8 | UI 點擊流程截圖＋反例（才能標已驗證） |
| A9 | 因才派巡 | [ONI 優先度](https://oxygennotincluded.wiki.gg/wiki/Priority) | M | v1.9（配 I-6、I-7） | 派巡流派分佈不再單一；最遠平均不降 |
| A10 | 下山義學＋外門雜務定額、內門免雜務 | [DF Guildhall](https://dwarffortresswiki.org/index.php/Guildhall)、了不起的修仙模擬器 | M | v1.85（解 plain） | plain 人數 ≥10；前 5 日斷糧不退步 |
| A8 | 宿命樹資料化 | 隔壁 redesign 分支 `destiny-trees.json` | L | v2.0 | golden 不變（純重構） |

### I-11 v1.55 延後缺口（ROADMAP v1.5 列）
| 項目 | 建議 | 成本 | 排入 |
|---|---|---|---|
| 活動打分改純資料（ad） | v1.76 已有 `score-data.mjs`，把剩下的 if 移完 | M | v1.8（I-4、I-3 都要改分數，先資料化省事） |
| 倉庫料／vegRes 併入 resv | 借 redesign 分支「在途貨物取消退回、不瞬移」與 logistics 草案的「實存／預約／在途分帳」 | M | v1.9 |
| 物資總量守恆不變式 | 先加測試，不改行為 | S | v1.8 |
| 工序 undo | 同上，跟 resv 一起 | M | v1.9 |
| 飢餓遲滯 | 已部分被 FOOD_SEC 取代；補進出分離門檻（A4 式） | S | v1.8 |
| 錢出口、成親冷卻、plain 招人、郭靖難度 | 見 I-1、I-3、I-5 | — | — |

### I-12 美術線（PORTRAIT-BACKLOG v1.5 剩餘）
- PB-15～17、PB-18／PB-05、PB-19 是**獨立美術任務**，不阻擋玩法版本。
  - PB-15～17：批次去背、描邊、主色。
  - PB-18／PB-05：頭像。
  - PB-19：漫符差分。
- 前例：活俠傳的情緒差分；本 repo `origin/codex/art184-*`、`lp17-scene-character-*` 分支的水彩流程與核准交接。
- **建議**：
  - v1.8 同步做 PB-15/16/18：腳本批次輸出到 `assets/portraits/v2/`，維持新舊並存開關。
  - v1.85 做 PB-17＋PB-10（小人主色）。
  - PB-08／09 重畫等擁有人選風格。
- **成本**：M（批次）；L（重畫）。
- **指標**：PB-06 縮圖表 32/32 可辨；64px 頭像盲認 ≥80%（自評）。

## 2. 其他分支比較（本 repo origin）

| 分支 | 對本計畫有用的部分 | 採用 |
|---|---|---|
| `codex/patrol-defense-backlog`（`PATROL_DEFENSE_RESEARCH.md`） | 有邊界掃蕩、返程估算、戰報欄位互斥（擊倒／驅離／逃脫）；Mindustry／Zero-K 撤退設計 | I-6、I-7 的戰報與「清過不等於安全」規則 |
| `codex/logistics-upkeep-draft`（`LOGISTICS_UPKEEP_DRAFT.md`） | 人口維持成本、實存／預約／在途分帳、避免「缺水→沒力搬水」不可逆循環 | I-1（要有寬限和恢復路徑）、I-11 resv |
| `codex/autonomy-ecology-backlog` | 有界鼠群生態、自主照護 | I-7 |
| `codex/sg-management-reference-backlog` | 經營參考與 FUTURE_BACKLOG | 對照用，無新增 |
| `plan/sect-life-architecture-redesign`（只在擁有人本機，內容已記在 ADOPTION-PLAN §1；本次**未**存取 Mac） | Smart Object、宿命樹 JSON、七區擴建 | A8、I-2 分階擴建 |
| `codex/map182-gemini-*`、`gemini/lp11/lp12` | 地圖修正與鼠群自主 | I-7 參考；不搬程式 |

## 3. 版本順序

每版都要做到：全測試綠；golden 變動要說明原因；用同一套 35 案長跑＋extra 驗收；不改的指標不能退步超過 10%（前 5 日斷糧 ≤1 天、不變式 0 違規）。

| 版本 | 目標 | 內容 | 驗收（長跑） |
|---|---|---|---|
| **v1.78** | 先能量後期 | I-9 無盡段 60 日組＋extra 新欄位；守恆不變式測試；岳不群退步查因 | 35/35 跑完 60 日；岳不群原因有數字；golden 不變 |
| **v1.8** | 社交節奏 | 分數資料化收尾；I-4 傳功降頻；I-3 成親冷卻＋門檻；飢餓遲滯；A7 線索透明；美術 PB-15/16/18 | 傳功 ≤1.5／案／日；道侶 3–5；岳不群 ≥4/5 |
| **v1.85** | 錢有出口 | I-1 月俸＋維護＋市集；I-8 丹藥販售／陳化；A10 義學＋內門免雜務；I-5 plain／郭靖；PB-17／PB-10 | 錢 ≤2.0×；破產 0；plain ≥10 人；郭靖 ≥3/5 或標困難 |
| **v1.9** | 中期內容與威脅 | I-2 三四階擴建＋聲望／稀有料＋槽位；I-6 財富襲擊＋勒索；A9 因才派巡；resv 併倉＋undo | 到頂中位 ≥第 18 日；山門重傷 0.5–2、死亡 0；付錢率 30–70% |
| **v1.95** | 生態 | I-7 巢穴＋族群上限回饋；戰報互斥欄位 | ≥1 區壓到 ≤30% 且會回升；60 日組錢仍 ≤2.5× |
| **v2.0** | 重構與傳承 | A8 宿命樹 JSON；60 日平衡總檢 | golden 不變（純重構）；60 日全部指標達標 |

## 4. 待擁有人決定（括號內為預設）

1. **錢出口的嚴厲程度**：欠俸會不會讓人離山？（**會，但每案最多 1 人，且先有 2 次警告**）
2. **財富襲擊會不會死人**？（**不會死，只重傷；死亡留到無盡段的高難度**）
3. **成親目標 3–5 對**，是否改成「每 10 人 1 對」隨人數調整？（**固定 3–5，冷卻每 5 日 1 對**）
4. **郭靖**：要補強還是保留「困難開局」並標示？（**先標困難＋小補降龍掌早期傷害；目標 ≥3/5**）
5. **山下市集**是否讓錢能直接買到靈草／兵器（可能讓巡山變得不重要）？（**可買，但每 5 日限量、價格遞增**）
6. **無盡段長度**：60 日夠嗎？（**60 日；之後視結果加 120 日抽樣 7 案**）
7. **美術**：v1.8 先做批次後製（PB-15/16/18），重畫（PB-07/08/09）等風格定案？（**是**）
8. **A8 宿命樹**是否排到 v2.0？（**是；它不改玩法，延後風險最低**）
9. **v1.78 插在 v1.8 前**（先補量測）是否同意？（**同意；沒有 60 日數據，I-1／I-2／I-6 的目標無法驗**）

## 5. 參考連結（2026-10-26 核對）

- RimWorld：[Raid points](https://rimworldwiki.com/wiki/Raid_points)、[Wealth](https://rimworldwiki.com/wiki/Wealth)、[Storyteller](https://rimworldwiki.com/wiki/Storyteller)、[Marriage](https://rimworldwiki.com/wiki/Marriage)、[Social](https://rimworldwiki.com/wiki/Social)；模組 [Hospitality](https://github.com/OrionFive/Hospitality)、[Combat Extended](https://github.com/CombatExtended-Continued/CombatExtended)（只當「深化戰鬥要整套換」的反例，不採用）
- Dwarf Fortress：[Siege](https://dwarffortresswiki.org/index.php/Siege)、[Mandate](https://dwarffortresswiki.org/index.php/Mandate)、[Noble](https://dwarffortresswiki.org/index.php/Noble)、[Marriage](https://dwarffortresswiki.org/index.php/Marriage)、[Economy](https://dwarffortresswiki.org/index.php/Economy)、[Guildhall](https://dwarffortresswiki.org/index.php/Guildhall)
- Kenshi：[Steam](https://store.steampowered.com/app/233860/)、[Hungry Bandit](https://kenshi.fandom.com/wiki/Hungry_Bandit)
- Against the Storm：[Queen's Impatience](https://wiki.hoodedhorse.com/Against_the_Storm/Queen's_Impatience)、[Beginner's Guide（Hostility／難度表）](https://wiki.hoodedhorse.com/Against_the_Storm/Beginner%27s_Guide)、[Blightrot](https://wiki.hoodedhorse.com/Against_the_Storm/Blightrot)
- Songs of Syx：[Steam](https://store.steampowered.com/app/1162750/)、[Raider](https://songsofsyx.wiki.gg/wiki/Raider)、[Trading／Treasury](https://songsofsyx.com/wiki/index.php/Trading)
- Going Medieval：[Steam](https://store.steampowered.com/app/1029780/)、[JSON Files](https://goingmedieval.fandom.com/wiki/JSON_Files)、[社群拆檔 workerCountMultipliers](https://www.reddit.com/r/goingmedieval/comments/1py63bh/question_answered_on_why_youre_not_getting_raids/)
- Banished：[Steam](https://store.steampowered.com/app/242920/)、[Housing](https://banished-wiki.com/wiki/Housing)、[Nomad](https://banished-wiki.com/wiki/Nomad)
- 太吾繪卷：[Steam](https://store.steampowered.com/app/838350/)；了不起的修仙模擬器：[Steam](https://store.steampowered.com/app/955900/)；活俠傳：[結緣攻略 wiki](https://smilin.net/LoM-wiki/event/pursuit/girl0)
- 開源：[OpenTTD](https://github.com/OpenTTD/OpenTTD)（[Economy](https://wiki.openttd.org/en/Manual/Economy)、[Infrastructure maintenance](https://wiki.openttd.org/en/Archive/Community/Infrastructure%20maintenance)、[Stations](https://wiki.openttd.org/en/Manual/Stations)）、[Simutrans](https://github.com/simutrans/simutrans)、[Cataclysm DDA](https://github.com/CleverRaven/Cataclysm-DDA)（[docs](https://docs.cataclysmdda.org/)）、[Veloren](https://github.com/veloren/veloren)、[FreeSO](https://github.com/riperiperi/FreeSO)
- 限制：
  - Simutrans、Combat Extended、Veloren 只核到 repo 首頁，沒有逐行讀原碼。
  - 太吾、了不起的修仙模擬器的建築階層描述來自遊戲經驗與商店頁，未逐條核對 wiki。
  - fandom／wiki.gg 頁對本機 curl 回 403，內容以搜尋結果摘要核對。
