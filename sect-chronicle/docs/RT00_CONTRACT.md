# SG-RT-00：可暫停即時自主生活契約（集中提案）

狀態：**提案／待遊戲 PO 整理、擁有人定案；已按 PR #101 審查修訂；尚未實作、未驗收。候選與作者建議都不是批准**。追蹤[#99](https://github.com/lalagrass/earth-ascension/issues/99)與總單[#93](https://github.com/lalagrass/earth-ascension/issues/93)，上位文件是[D8：REALTIME_LIFE_SLICE.md](REALTIME_LIFE_SLICE.md)。

- 實際主筆：**Grok CLI，接續 Grok Bot**（與 Codex 共用同一 GitHub 帳號，非獨立審核）。初稿由 Grok Bot 依使用者 Yuying Chen 對 #93 的指派交付；本輪只修 [PR #101](https://github.com/lalagrass/earth-ascension/pull/101) 審查的四項契約缺口與決策責任，不改 runtime、fixture、CI。
- Base：dev `c46003421c9ed35a0a2666cc64cd4a9fa47d2153`（#100 合入後，post-merge CI 39120861204 成功）。本包只改 `sect-chronicle/docs/`。
- 讀法：**【現值】**＝已在程式／規則文件，附來源；**【候選】**＝本提案列出的選項；**【建議】**＝作者推薦，不是決定；**【待決】D-RT-nn**＝需遊戲PO整理、擁有人（或指定的技術複核）定案才能凍結。標【待決】的數字**不得**寫進程式當常數。
- 不重問：即時、自主、暫停可改主角工作／目標、戰鬥延後、不接付費模型（D8 已批准）。不做：戰鬥、巡山、輕功、尋路／碰撞／負重、生活屬性成長、需求條、第二境、28 天內容、新生活能力。
- 沒有世界實驗：下方所有數字不是引擎輸出。時間線與預算是「以 `rules.js` 純函式核對單位收益的手排推演」，只證明契約可以被明確執行，不證明平衡、樂趣或 RT 引擎正確。

## 0. 總覽與待決清單

六項契約（§1–§6）各自可獨立審查；§7 是兩條完整時間線，加上突破詢問的兩條短時間線；§8 是與歷史／D6／D7 的關係；§9 是分階段凍結清單與未驗證項。候選在擁有人定案前不得寫進程式。

| 編號 | 要定案的事 | 候選 | 作者建議 | 影響 |
|---|---|---|---|---|
| D-RT-01 | 一格（舊早／午／晚一段）對應幾個 tick | 12／**60**／480 | **60**（一日 180 tick） | 全部時間常數、20seed 成本 |
| D-RT-02 | 移動速度（每走一格地塊需幾 tick） | 3／**6**／10 | **6**（一格＝0.1 段；角落來回約 0.8 段） | 移動占比、首丹時間 |
| D-RT-03 | 道館（出發／休養／突破集合點）與村口位置 | 道館＝中心(2,2)、村口＝棋盤外(2,−1)／道館另設在棋盤外 | **道館(2,2)、村口(2,−1)** | 距離表、首援村時間 |
| D-RT-04 | 移動是否耗體力／心境 | **無**／每格耗體力 | **無**（不新增數值） | 疲勞與產能 |
| D-RT-05 | 工作量結算：每「工作單位」完成時一次套用舊規則 vs 每 tick 按比例 | **完成時一次**／逐 tick 比例 | **完成時一次**（沿用舊整數公式，無新取整） | 全部工作成果、取整 |
| D-RT-06 | 材料／工作位／人員預約時點與取消退款 | **出發即原子預約扣料；開工前取消全退、開工後不可倒帶**／到達才扣 | 出發即預約 | 互斥、退款、刷收益防線 |
| D-RT-07 | 手動覆寫打斷「可打斷工作」時未完成單位 | **捨棄（不扣不給）**／保留進度 | 捨棄 | 覆寫成本、去重 |
| D-RT-08 | 自主的疲勞門檻 | 體力<**60**／體力<30 | **<60**（維持 100% 效率區） | 工時比、恢復節奏 |
| D-RT-09 | 預設自主目標清單與優先序、需求估算 | 見 §3.3 | §3.3 預設表 | 無人介入的實際發展 |
| D-RT-10 | 目標耗盡後的日常維持 | **A：未提升者修行到 100；要恢復就走正式休養，穩定後才進入無效果等待（無新常數）**／B：採集到庫存上限（新數值） | A | 跨第 14 天行為、庫存增長 |
| D-RT-11 | 初始政策預設（援村、收徒、突破／丹／支援） | 見 §4.1 | §4.1「安穩發展」 | 授權邊界 |
| D-RT-12 | `ask` 政策的待選事件是否凍結世界 | 凍結等點擊（現行）／**不凍結，逾期自動選「稍後」** | 不凍結，逾期 1 日（180 tick） | 無人介入不被卡住 |
| D-RT-13 | 舊 slot 存檔相容 | **A：舊檔原樣讀取、續玩於舊 slot 模式；RT 是新 scenario／schema**／B：拒絕（同 D7）／C：轉換匯入 | A（C 只列為日後可選匯入，不是本系列範圍） | schema／rule 版本、驗證碼、舊 golden |
| D-RT-14 | RT 觀察窗與跨界檢查點 | 14 日／**15 日（2700 tick）** | 15 日 | 20seed 驗收 |
| D-RT-15 | 播放：1× 每秒幾 tick；背景頁籤 | 2／**4**／6；**自動暫停**／限額補算 | 4 tick/秒；背景自動暫停；讀檔先暫停 | UI／試玩時長 |
| D-RT-16 | 批次推進的停止條件 | 見 §1.5 | §1.5 | 玩家可介入點、回放一致 |

### 決策責任與凍結時點

下表的作者建議只供遊戲 PO 整理，不是批准。請合成四包交給擁有人，不要拆成 16 題。已批准的即時、自主、暫停改主角工作／目標、戰鬥延後，以及 D6／D7（含 [D7-C 明示轉休養](DECISIONS_AND_SOURCES.md#d7sg-05-修為與突破處置已批准2026-10-18)）不在這四包裡重問。

| 包 | 包含 | 為何要擁有人看 | 不晚於 |
|---|---|---|---|
| 時間與試玩節奏 | D-RT-01、02、03、14、15 | 一段幾個 tick、走一格多快、道館與村口放哪、觀察窗多長、離開頁面或讀檔後世界進不進，會改玩家感覺到的一天與趕路 | 01、02、03、14 在 RT-01 前。15 在 RT-04 前；RT-01 不得把「每秒幾個 tick」寫進世界 |
| 工作誠信 | D-RT-04、06、07 | 移動耗不耗體、何時扣料與退款、打斷進行中的單位要不要留進度，會改玩家能否白跑、退料或中斷刷收益 | RT-01 前 |
| 無人介入的授權邊界 | D-RT-08、09、10、11、12 | 多累才休養、預設先做哪些目標、目標做完之後做什麼、援村／收徒／突破的許可、詢問會不會把世界停住 | RT-02 前。若 D-RT-12 改選「凍結等點擊」，RT-01 的 `needsDecision` 會出現，這包就要提前到 RT-01 前定案。建議路徑是不凍結 |
| 舊檔 | D-RT-13 | 舊 schema4／rule3 是原樣續玩、拒絕，還是轉換匯入 | RT-01 前 |

D-RT-05（單位完成時一次套用舊整數公式）與 D-RT-16（批次停止條件）不單列成新的擁有人題。05 是為了不發明新取整，沿用已批准公式；16 的 `breakthroughResolved` 沿 SG-05 R1，`needsDecision` 只在授權邊界包選了凍結時才存在。兩項仍寫在契約裡，遊戲 PO 複核時可一併看。若要把 05 改成逐 tick 比例，才升級為產品題。

可由技術複核記錄、不請擁有人重選：tick 內處理順序（§1.3）、同 tick 仲裁排序、突破抽樣時點與順序（§2.6）、設施自完工後下一個決策點起可用（§2.3）、體力／心境快照取該單位開工時（§2.2）。

## 1. 世界時間

### 1.1 整數 tick 與換算

- 世界時鐘 `clock.tick`：非負整數，＝「已完整處理的 tick 數」。`tick = t` 的世界代表時間 `t` 之前的 tick 都已提交。世界不存牆鐘、播放倍率、暫停旗標或畫面幀數。
- 常數（**待決** D-RT-01，下表以建議值 60 為例）：`TICKS_PER_SLOT = 60`、`SLOTS_PER_DAY = 3【現值】`（GAME_DESIGN §3）、`TICKS_PER_DAY = 180`。
- 對應：`slotEq(t) = floor(t / 60)`（舊 slotIndex 的等價物，只用來查舊規則表）；`day(t) = floor(t / 180) + 1`；`part(t) = slotEq(t) mod 3`（0 早、1 午、2 晚）。介面只顯示「第 N 天 早／午／晚」與段內進度，**不發明時鐘時間**；tick 不是秒。
- 為何 60：可被 2、3、4、5、6、10、12、15、20、30 整除，移動速度與單位工作量都落在整數；一日 180、14 日 2520、15 日 2700 tick，20 seed 的完整視窗約 54,000 tick 步，純 JS 可行。12 太粗（走一格 1–2 tick 難以區分遠近）；480（一段＝8 小時、一分鐘一 tick）可行，但每個 seed 的 15 日視窗是 15×3×480＝21,600 tick 步（建議值 2,700 步的 8 倍），對 RT-01～05 的測試成本沒有對應收益。

### 1.2 時間驅動的舊內容換算（【現值】來源 rules.js／story-data.js）

| 項目 | 舊（slotIndex） | RT（tick，D-RT-01 取 60） |
|---|---|---|
| 初兆 omen 開始（草藥解鎖、援村開放） | 9 | 540（第 4 天 早） |
| 顯化 manifest 開始 | 18 | 1080（第 7 天 早） |
| 獸患升溫 surge 開始 | 30 | 1800（第 11 天 早） |
| 村口求援事件（`evt-village-plea`） | 8→9 | tick 540 起，政策決定處理（§4） |
| 候選邀請 cand-1／cand-2 | 17→18 起、需已援村 | tick 1080 起、需已援村；cand-2 在 cand-1 邀請之後 |
| 危機 `evt-beast-crisis`（slot 41→42） | 42 格強制待選／終局 | **RT 世界不觸發、不終局**（D8；戰鬥延後） |
| 結局 `evt-ending-*` | 危機結果 | **RT 世界沒有結局** |

RT 需要的規則改動（記入 ruleVersion，見 §5）：`Rules.phaseAt(slotIndex)` 與各公式現在對 `slotIndex > 42` 丟 `RangeError`（`MAX_SLOT_INDEX = 42`）。RT 另提供以 `slotEq` 查表且**不設上限**的版本：第 11 天（slotEq ≥ 30）之後一直停在「獸患升溫」階段（修行係數 18000、靈草基礎量 5）。`threatLevel` 在 RT 世界**沒有消費者**，只是舊表欄位。

### 1.3 固定步進與 tick 內處理順序

`advanceTicks(world, n)` 逐 tick 執行 `step`；`step` 處理 `t = world.clock.tick`，完成後 `tick = t + 1`、`revision + 1`（revision 的完整規則見 §5.3）。每個 tick 的順序固定：

1. **到期事件**：到達 tick `t` 的階段切換、故事事件（求援、邀請、§4.5 突破詢問）→ 依 §4 的政策自動處理或進入待選；`ask` 逾期在此依政策預設解決。建議路徑不凍結世界，也不進入 `awaitingChoice`。
2. **預約仲裁**：以「tick `t` 開始時的世界快照」（含前一 tick 已提交的產出）收集請求——手動命令（優先類 0）→ 政策動作 → 自主決策（優先類 1，只對閒置、無手動鎖的角色）——整批以 SG-04 的 `arbitrate()` 語意（參與者＋工作位＋成本整批成敗）判定；同類內依「已等待 tick 數 desc、請求 id asc」。拒絕者記原因與 `waited`，**同 tick 不再重試**。
3. **推進**：所有已預約的活動各推進 1 tick（移動走完一步、工作量 +1）；工作單位在本 tick 末端完成者，其效果在本 tick 提交，**下一 tick 起才可被他人／自己的決策看到**。
4. **提交與驗證**：`clock.tick = t + 1`；事件以 `tick = t` 記錄；一致性驗證（§5.4）。

同 tick 內的結果與角色處理順序無關：決策讀的是 `t` 開始的快照；任何會產生分歧的並列都有固定排序鍵（角色 id、活動 id）。**RNG 只在突破完成時消耗**（§2.6），自主決策與仲裁**不抽樣、不偷讀 RNG 狀態**。

### 1.4 暫停、恢復、倍率、背景頁籤（【待決】D-RT-15）

- 暫停＝控制器不呼叫 `advanceTicks`；世界沒有「暫停中」狀態。暫停時 `clock.tick`、位置、工作進度、資源、庫存、`rngState` 皆不變。倍率（1×／2×／4×）只決定控制器每個真實時間片呼叫幾個 tick，不進世界、不進 canonical、不進 hash。
- 暫停中可 `dispatch` 命令：驗證與記錄照常（`expectedRevision`／命令 id 去重），只改「意圖類」欄位（手動命令、目標、政策，見 §2.5、§3.4），**不產生任何成果**；意圖在恢復後的第一個 `step` 的階段 2 生效。
- 播放速率【候選】1× 每秒 2／4／6 tick；**建議 4**：一個舊段 15 秒、一日 45 秒、15 日 11.25 分鐘（14 日 10.5 分鐘），落在 GAME_DESIGN §3 的 10–15 分鐘目標（該目標「須真人量測」，這只是換算）；2× 約 5.6 分鐘、4× 約 2.8 分鐘（15 日）。
- 背景頁籤【建議】自動暫停、回到前景維持暫停，不以牆鐘補算；讀檔後預設暫停。補算屬可選（需上限），不在本契約。

### 1.5 批次推進與停止條件（【待決】D-RT-16）

`advanceTicks` 回傳 `{ ok, state, events, advancedTicks, stopReason, error? }`。停止條件【建議】：

| stopReason | 條件 | 說明 |
|---|---|---|
| `completed` | 推進滿 n tick | 正常 |
| `needsDecision` | 僅在 D-RT-12 選「凍結」時使用：本 tick 產生需玩家選擇的待選事件 | 建議方案（不凍結）下**不會出現**；`ask` 事件只是通知，不停止批次 |
| `breakthroughResolved` | 本 tick 有突破結果（成功／失敗）已提交 | 沿 SG-05 R1：停在結果之後一 tick，不越過 |
| `error` | 批次中途遇到不合法內部狀態 | 已提交的 tick 保留 |

批次大小不影響結果：同一組命令序列在「逐 tick」、「任意切塊」、「一次到終點」三種執行下世界與 RNG 一致（切塊只在停止條件與命令點之外自由）。UI 可另設玩家警戒線（例如「任何缺口出現就停」）——那是控制器層設定，不是世界狀態。

### 1.6 事件時間與舊模式

- RT 世界的事件／日誌改用 `tick`（及 `day`、`part` 衍生欄位）；`slotResolved`／`dayReport` 等舊事件**不出現在 RT 世界**。「日報」可在 `tick mod 180 = 179` 的處理末端產生，內容是該日各角色／庫存摘要（選擇器，不是結算來源）。
- 舊 slot 模式（schema4／rule3，`slice-14`）完整保留；`Engine.advance` 遇 RT 世界回 `wrong_mode`，`advanceTicks` 遇 slot 世界同樣回 `wrong_mode`，**同一世界只由一套引擎驅動**，不可能出現 slot＋tick 雙重收益。

## 2. 移動與工作

### 2.1 最小地圖與位置

- 沿用 5×5 `tiles`【現值】（`Rules.initialTiles`、`MAP_TERRAIN`：靈材點 (0,0)(0,4)(4,0)；靈草點 (2,0)(2,4)(4,4)；其餘 19 格可建，五行 `(2×row+col) mod 5`）。
- 位置是整數格座標 `pos = { r, c }`；距離＝曼哈頓格數。兩個特殊節點（【待決】D-RT-03）：**道館**＝中心格 (2,2)（同時仍是一格可建地塊；道館不是工作位、不占地塊、可站任意多人）；**村口**＝棋盤外 (2,−1)，經 (2,0) 進出（與道館距離 3）。
- 路線是確定性的 L 形：先走行（r）再走列（c）；沒有尋路、碰撞、負重。角色一次移動一格，**不能在格中途停下**：打斷（覆寫／取消）在目前這一步走完時生效（延遲 < 單步 tick）。
- 移動速度【待決】D-RT-02：每格 `STEP_TICKS`（候選 3／6／10，建議 6）。

道館 (2,2) 到各處的格數與單程 tick（STEP_TICKS 候選對照）：

| 目的地 | 格數 | 3 | **6** | 10 |
|---|---|---|---|---|
| 靈材點 (0,0)／(0,4)／(4,0) | 4 | 12 | **24** | 40 |
| 靈草點 (2,0)／(2,4) | 2 | 6 | **12** | 20 |
| 靈草點 (4,4) | 4 | 12 | **24** | 40 |
| 村口 (2,−1) | 3 | 9 | **18** | 30 |
| 最遠可建格（角落鄰格，例 (0,1)） | 3 | 9 | **18** | 30 |
| 任兩角落之間（最遠） | 8 | 24 | **48** | 80 |

移動**不耗體力／心境**、沒有產出，移動中不能採集、建造、支援（互斥；【待決】D-RT-04，不新增數值）。

### 2.2 活動（activity）與工作單位

RT 世界以統一的 `activities[]` 取代 slot 世界的「課表意圖＋jobs」。種類沿用現有行動【現值】（`Rules.ACTIONS`）：`gather-material`、`gather-herb`、`cultivate`、`rest`、`tune-mind`（只限手動，自主不用）、`build`、`brew`、`aid`、`breakthrough`、`support`（突破者的支援，由突破派生）。

- **工作單位（unit）**＝`TICKS_PER_SLOT` 個工作 tick＝舊的「一格」。每種活動的總工量＝舊 `durationSlots × 60`：採集／修行／休養／調心／援村／突破 1 單位；聚靈台、居所 2；丹房 3（`FACILITIES.*.durationSlots`）；凝氣丹 2（`RECIPES.*.durationSlots`）；突破 1（`BREAKTHROUGH_DURATION_SLOTS`）。
- 採集／修行／休養可以是「重複 n 單位」的單一活動（n≥1，中途可被打斷，見 §2.5），避免每單位重走路；建造、煉丹、援村、突破的 n 固定。
- **效果在單位完成時一次套用**（【待決】D-RT-05）：用該單位**開工 tick 的快照**（體力／心境／傷勢、`slotEq(開工 tick)` 的階段、設施倍率）呼叫與 slot 引擎同一組純函式（`gatherYield`、`cultivationGain`＋`capCultivationGain`、`applyRest`、`applyActionCost`…），體力／心境成本同時扣除，沒有逐 tick 比例、沒有新取整。多單位的 `brew` 產出用**第一單位開工快照**一次結算於完成時（RULES §7 把「多格工作取哪一格體力」留給引擎；本契約定案為第一單位，並使預估在開工時可算）。
- 修行：在聚靈台完工且取得其 1 個工作位時，於聚靈台格工作並套放置倍率；否則在道館做「野外版」（倍率 10000），沿 `assignSeats` 語意。休養：居所完工且取得 2 個休養位之一時在居所格，否則在道館野外休養（免費、永遠可用）。
- **D7-C 明示轉休養**（已批准，見 [D7](DECISIONS_AND_SOURCES.md#d7sg-05-修為與突破處置已批准2026-10-18)，不是新候選）：請求 tick 的快照上，修為已滿 100 或已成功提升時，**已經形成的修行意圖**在配位前改為正式 `rest` 活動。`Progression.cultivationBlock` 只提供原因：已成功提升優先，回 `breakthrough_done`；否則滿 100 回 `cultivation_full`。活動帶 `fallback: { from: 'cultivate', reason }`。有居所空位則走居所休養位與輪候，否則道館野外休養。不占聚靈台、不扣修行的體力／心境、不加修為、不多發一份效果，也不改排突破、採集或支援。這不是拒絕：`orderActivity` 接受該指令，`manualOrder.kind` 仍記 `cultivate`，階段 2 才轉成休養請求，不回 `cultivationBlock` 錯誤。轉換看執行當下快照；其間若突破失敗已掉到 70，就照常修行。
- **與自主選擇分開**：決策函式可以根本不輸出修行（§3.3：政策 `auto` 時改排突破，`ask` 時不排、改由 §4.5 詢問，`off` 或已無需求則等到恢復條件也不成立才進入等待）。那是「沒有修行意圖」。一旦意圖是修行，且快照已滿或已提升，只能走上一條 fallback。

| 活動 | 地點 | 工作位（沿 SG-04 容量） | 預約的成本 | 單位效果來源 |
|---|---|---|---|---|
| gather-material／herb | 對應資源點格 | 每點 2 | 無 | `gatherYield`；體力 −15／單位 |
| cultivate | 聚靈台格（有位）／道館 | 聚靈台 1／無 | 無 | `cultivationGain`，封頂 100；體力 −10、心境 −3／單位 |
| rest | 居所格（有位）／道館 | 居所 2／無 | 無 | `applyRest` |
| build | 目標可建地塊 | 該地塊 1 人（`BUILD_WORKERS`） | 設施成本（靈材） | 完工後設施可用；體力 −15／單位 |
| brew | 丹房格（已完工） | 丹房 1 | 配方成本（靈草 6＋靈材 2） | `brewOutput`；體力 −10／單位 |
| aid | 村口 | 1 人（`AID_WORKERS`） | 備料做法靈材 4／徒手無 | 一次性獎勵（發獎去重鍵不變）；體力 −15 |
| breakthrough | 道館 | 本人＋可選支援者 | 可選 1 枚丹 | §2.6 |
| support | 道館 | 派生，占支援者 | 無 | 體力 −10 |

### 2.3 生命週期與預約

狀態：`requested → traveling → working → done`，另有 `cancelled`、`denied`（只留事件，不留活動）。

1. **請求**（階段 2）：手動命令／政策動作／自主決策各產生一個請求，帶參與者、工作位、成本。整批仲裁；成功即**原子預約**：扣成本、占工作位與所有參與者、建立活動（`traveling`，若已在目的地則直接 `working`）。失敗：不扣、不占、記 `waited`＋原因（`insufficient_resource`、`no_seat`、`participant_busy`、`facility_not_ready`、`blocked`）。預約在**出發時**成立（【待決】D-RT-06）：旅途中工作位與材料已屬於該活動，別人不能搶，也避免白跑。
2. **traveling**：每 tick 推進移動；走完最後一步的 tick 末端到達，**下一 tick 起開始累積工作**（到達同 tick 不算工）。突破需本人與支援者都到道館才開始，先到者顯示「等待夥伴」。
3. **working**：每 tick `workTicks + 1`；每滿 60 個工作 tick 完成一個單位並套用效果（§2.2）；總單位完成＝`done`，同 tick 末端釋放工作位與參與者；下一 tick 的階段 2 決策看見釋放與產出。
4. **取消／被覆寫**（`cancelled`）：
   - 尚未開始工作（`traveling`）：**全額退還**預約成本、釋放，沒有任何產出——淨效果為零，不能刷收益。
   - 工作中且為**可打斷**活動（採集／修行／休養／調心）：已完成的單位保留；**進行中的單位進度捨棄、不扣成本、不給產出**（【待決】D-RT-07）。
   - 工作中且為**承諾型**活動（build、brew、aid、breakthrough/support）：**不可取消或覆寫**（沿 SG-04「已開始不可倒帶」）。手動命令被接受但標記 `pending`，保存 §2.5 的完整 payload，待該活動結束後按該 payload 生效，不改讀當時的政策；介面顯示「將於 tick X 完成後執行」。
5. **完成後**：角色閒置，下一 tick 的階段 2 由手動鎖或自主決策接手；沒有「完成即白站」的空檔 tick（同 tick 末端完成，下一 tick 決策並出發）。
6. **設施可用時點**：建造完成單位在 tick `t` 提交，`tick = t + 1` 的階段 2 起該設施可被預約（舊制是「完工次格」，等價於下一個決策點）。未完工不可預約（`facility_not_ready`，同 SG-04）。

### 2.4 互斥與去重（沿原規則，不新增）

- 同一角色同一時刻只有一個活動（含移動、支援）；同一工作位同時不超過容量；材料不會因並行預約變負；同 tick 爭搶依 §1.3 的排序，落敗者不扣費、不抽樣、記 `waited`。該 tick 沒有其他活動的角色，改做一次正式 `rest`，`fallback: { from: <原 kind>, reason: <拒絕碼> }`（沿 SG-04 明示休養備案），事件原因寫 `rest:job-denied`。不在 `wait` 裡回復。休養單位結束後的下一次決策才可以再等或再請。
- 去重：命令 `id` 與 `expectedRevision` 規則同現行（同 id 同內容重送回原結果；不同內容拒絕）；手動請求每次只產生一個活動；活動 id `act-0001…` 依序編號；一次性獎勵（援村、收徒、突破成功）沿既有去重鍵；`done`／`cancelled` 的活動不可再被推進或再發獎。
- 沒有 slot＋tick 雙重收益：RT 世界沒有 `schedule`、沒有 `slotResolved`，活動是唯一產出來源（驗證拒絕同時帶兩套欄位的世界）。

### 2.5 手動命令（暫停或執行中皆可）

沿用現行命令封包 `{ id, expectedRevision, type, payload }`，新增：

| 命令 | payload | 說明 |
|---|---|---|
| `orderActivity` | 見下方完整形狀 | 對**指定角色**下手動指令。接受時把驗證過的完整 payload 寫入 `manualOrder`（`pending`），階段 2 才轉請求。成功後該角色進入**手動鎖**（自主不為其決策） |
| `cancelManualOrder` | `{ discipleId }` | 取消手動鎖並讓角色恢復自主（承諾型活動不中斷，待其結束後恢復） |
| `setGoals` | `{ goals }` | 取代整份目標清單（§3.2）；不打斷進行中的活動 |
| `setPolicy` | `{ policy }` | 取代政策（§4.1）；對之後的事件／決策生效，不回溯已處理事件 |
| `chooseEvent`、`acceptCandidate` | 沿現行 | 手動處理待選事件／收徒（政策也走同一驗證） |

`orderActivity` 的 payload 在接受時驗證並凍結。`target` 依 kind：採集 `{ tileId }`；建造 `{ facilityType, tileId }`；煉丹 `{ recipeId }`；援村 `{ optionId: 'free'|'supplied' }`；修行、休養、調心、突破為 `{}`。`units` 省略時為 1；建造／煉丹／援村／突破的單位數固定，傳了不同值就拒絕。

突破另有兩個與 `target` 平級的欄位，缺欄不等於 false／null：

| 欄位 | 手動突破 | 其他 kind |
|---|---|---|
| `usePill` | 必須是布林。`true` 表示出發預約時扣 1 枚丹，庫存不足則整批落選、不扣、不抽樣、不改成無丹。`false` 表示不用丹 | 必須缺席。寫了就 `bad_payload` |
| `supporterId` | 必須是已存在的角色 id，或明確的 `null`（不帶支援者）。有 id 時，預約仍重驗入隊與空閒；不合格就整批落選，不換成別人 | 必須缺席 |

自主或政策產生的突破請求不走這個手動封包，但在決策／同意的那個 tick 就把 `usePill` 與 `supporterId` 寫成同樣的明確值，再放進活動；之後空著的欄位不存在。`setPolicy` 只影響之後新的決策與新的同意，不改已接受的 `manualOrder`、已排隊或進行中的活動。`commandLog` 對接受的命令保存這份完整 payload（含 `false` 與 `null`），不存成會丟掉這兩欄的摘要。被拒絕的命令仍不寫 `commandLog`。

因此：暫停時下達突破、在承諾型工作結束前一直 `pending`、或在 `pending` 期間存讀，恢復後仍按原指令扣丹、綁定原支援者。驗收見 §6.4。

- **主角優先權**：玩家只能下手動指令給**主角**（D8「改主角工作／目標」）；其他角色維持自主，但玩家可 `setGoals` 影響全隊需求。（【建議】先限主角；開放全隊手動屬擴充，需 PO 另行批准。）
- **生效時點**：暫停期間接受 → 恢復後第一個 `step` 階段 2 生效；執行中接受 → 下一個 `step` 階段 2 生效。承諾型活動則排到其結束。可打斷活動的捨棄規則見 §2.3-4。
- **手動鎖的結束**：手動活動 `done`、指令失效（資源／工作位／前置不再成立，記 `invalid` 與原因，不改做另一種工作）、玩家 `cancelManualOrder`，三者之一。結束的同 tick 末端，下一 tick 階段 2 自主恢復決策，並產生可見事件 `autonomyResumed { discipleId, reason }`。D7-C 不是失效：修行指令仍接受，活動改為休養（§2.2），休養完成後才結束手動鎖。仲裁落選後的那一次休養備案（§2.4）也不是改去做另一項工作。
- **不被 AI 覆寫、不重送刷進度**：手動鎖期間自主不為該角色發任何命令；自主命令 id 固定格式 `auto-{tick}-{discipleId}-{n}`，同一 `(tick, discipleId)` 至多一個；手動命令被拒絕或 `invalid` 不會自動重試。

### 2.6 突破（D7 保留）

- 手動、同意詢問或自主排突破時，請求上都已有明確的 `usePill`（布林）與 `supporterId`（id 或 `null`），來源見 §2.5 與 §4.5。本人須修為 100 且未成功提升（`Progression.eligibility`，同 D7）；至多一個排隊／進行中的突破；支援者須在突破請求 tick 前已入隊（`joinTick ≤ 請求 tick`，沿 SG-05 R2）。預約讀的是這份凍結欄位，不讀當下政策。
- 預約（出發時）整批原子：本人＋支援者＋可選一枚丹；任何一方忙碌或丹不足整批落選且**不扣丹、不抽樣**。支援者得到派生 `support` 活動（前往道館，占其工作，體力 −10），不能兼工。
- 開工：雙方都到道館後的下一 tick。工作 1 單位。**完成時（單位末端）抽樣一次** `Rng.nextInt(state, 10000)`，同 tick 多個突破依活動 id 排序抽樣；機率用開工 tick 的心境快照（`Rules.breakthroughChance`，現值）。結果規則不變：成功修為保留 100、`breakthroughs = 1`；失敗 100→70、傷勢 +15；成本照舊（本人體力 −20、心境 −5）。`outcome` 欄位沿 SG-05（`result、mindAtStart、chanceBp、roll、cultivationBefore/After、injuryBefore/After`）。
- 突破結果提交後 `advanceTicks` 以 `breakthroughResolved` 停止（§1.5）。

## 3. 自主生活

### 3.1 原則

自主是**純函式** `decide(snapshot, disciple, goals, policy) → 請求 | 等待`，每個 tick 的階段 2 對「閒置、無手動鎖」的角色按角色 id 順序呼叫。只讀：玩家看得到的世界狀態（庫存、設施、位置、各人體力／心境／傷勢／修為、進行中預約、已入隊名單、政策、目標）與公開規則表（含已公布的靈氣階段表）。**不讀 RNG、不讀未來、不讀未觸發的故事內容、不直接寫世界**；輸出是與玩家相同的正式請求，走相同驗證、預約與去重。沒有隨機性：同一快照同一輸出。

### 3.2 目標（goals）資料

`goals[]` 是**有序**清單，玩家以 `setGoals` 整份取代（`goalsRevision` +1）。每個目標 `{ id, kind, ...參數 }`，狀態（`pending／active／done／blocked(原因)`）由世界衍生，不另存。第一版 kind（只涵蓋現有內容，不新增玩法）：

| kind | 參數 | 完成條件 |
|---|---|---|
| `buildFacility` | `facilityType` | 該設施已完工 |
| `stockPills` | `count` | 庫存凝氣丹 ≥ count |
| `aid` | — | 援村已完成（做法由政策決定） |
| `recruit` | — | 兩名固定學徒皆已入隊或被政策／玩家明確放棄 |
| `cultivateTo100` | `discipleId` 或全隊 | 該人修為 100 或已成功提升 |
| `breakthrough` | `discipleId` 或全隊 | 該人已成功提升（失敗可重試） |

### 3.3 預設目標與決策規則（【待決】D-RT-09）

【建議】預設目標表（可由玩家在開局設定、暫停時修改）：

1. `buildFacility` 丹房（建於 `evaluateFacilityPlacement` 倍率最高的可建格，同分取 tile id 小者——現值最佳是 `t-0-1`，11500）。
2. `stockPills` 2（師徒各一次突破）。
3. `aid`（做法由政策）。
4. `recruit`。
5. `cultivateTo100` 全隊。
6. `breakthrough` 全隊（政策允許才執行）。

聚靈台與居所**不在預設表**（玩家可加）。每個閒置角色依序套用規則，第一個成立者即輸出：

- **R1 恢復**：體力 < 60【待決】D-RT-08（候選 30），或傷勢 ≥ 30（與傷勢效率分段同界）→ 休養（有居所位則居所，否則道館野外）。一次一單位，單位末端重新判斷；體力回到 ≥ 60 且傷勢 < 30 才離開。（60 是效率 100% 區的下界，原因可讀：「體力低於 60 會降效」；30 則等於現行規則的「重度降效」界線，工時更長、產出較波動，需實驗才知哪個總產出較好——本契約不做實驗，列為候選。）
- **R2 目標需求**：依目標順序，檢查「還缺什麼」，把**需求**分配給能服務它的角色（需求已被進行中預約覆蓋就不重複派人）：
  - `buildFacility`：設施尚未排入 → 材料足夠就請求 `build`（出發即預約扣料）；材料不足則產生**靈材需求** = 成本 − 庫存 − 進行中預期產出。
  - `stockPills`：庫存 < count → 丹房已完工且材料夠一爐（靈草 6＋靈材 2）→ `brew`；否則產生靈草／靈材需求（靈草階段未解鎖時**不產生**靈草需求，這個目標暫時 `blocked(herb_locked)`，不空等也不亂走）。每爐預期產出以 `BREW_MIN_OUTPUT = 1` 保守計；完成後重新判斷，已達標就不再開下一爐。
  - `aid`：政策允許、`tick ≥ 540`、未完成、無進行中 → 請求 `aid`（`auto-free` 徒手；`auto-supplied` 材料夠才做，不足則產生靈材需求）。
  - `cultivateTo100`／`breakthrough`：修為 < 100 且未提升 → `cultivate`。修為 100 且未提升且政策 `auto` → 請求 `breakthrough`，並在這個決策 tick 把 `usePill`、`supporterId` 寫成明確的布林與 id 或 `null`。政策 `ask` → 不請求突破，詢問由 §4.5 在階段 1 開啟。政策 `off` 或已成功提升 → 不請求修行，也不請求突破。決策函式不對已滿或已提升者輸出 `cultivate`；若仍輸出，由 §2.2 轉成休養，不得改道成突破。
  - 資源需求以「該角色現在體力的預期單位產出」（`gatherYield` 等純函式）估算，**依角色 id 順序**逐一分配到需求被覆蓋為止；採集地點取距離最近、工作位有空者，同距取 tile id 小者。
- **R3 保底進度**：沒有任何目標需求可服務，且修為 < 100 且未提升 → 修行。
- **R4 等待**：其他情況 → `wait { reason, sinceTick }`，原因可讀（`goals_done`、`blocked:herb_locked`、`breakthrough_ask_open`、`breakthrough_later`、`cultivation_full`）。不排活動、不移動、不發命令、不呼叫 `applyRest`，也不改體力、心境、傷勢或庫存。人留在當下格子。R1 先處理恢復，所以進入等待時恢復條件不成立。等待期間若新目標或復查使恢復條件成立，必須先離開等待，再走正式活動。

**重新判斷的時機**（避免忙迴圈與抖動）：只有「閒置」角色才判斷；可打斷活動只在**單位邊界**重新判斷；承諾型活動完成前不判斷；`wait` 角色只在世界簽章改變（庫存、設施、位置、階段、名單、目標／政策修訂、事件）或每 `TICKS_PER_SLOT` 個 tick 復查；每角色每 tick 至多一次決策、至多發一個請求；被拒絕的請求同 tick 不重發，下一 tick 看到 `waited` 後自然落到恢復或等待。

### 3.4 人工覆寫與恢復

見 §2.5。重點：玩家可暫停改主角工作（`orderActivity`）與目標（`setGoals`）；手動鎖期間自主不介入該角色；手動活動完成／失效／取消後自主在下一 tick 恢復並產生 `autonomyResumed`；`setGoals` 不打斷進行中的活動，其影響在角色下一次決策才出現；承諾型活動不被覆寫。

### 3.5 不做的事

不做需求條、性格 AI、學習／風險偏好、LLM、全隊手動排程器、複雜資源預測。性格兩軸維持純敘事（D1）。`tune-mind`（調心）只在手動可用，自主不選。

## 4. 無人介入

### 4.1 初始政策（【待決】D-RT-11）

`policy` 在開局設定、隨時可用 `setPolicy` 改。欄位與值：

| 欄位 | 值 | 效果 |
|---|---|---|
| `aid` | `auto-free`／`auto-supplied`／`ask`／`off` | 村口求援：自動以徒手（零成本）或備料（靈材 4）援村、詢問、或不援村 |
| `recruit` | `auto-accept`／`ask`／`off` | 邀請出現時自動 `acceptCandidate`、詢問、或不收（候選維持 `deferred`，玩家日後仍可接受） |
| `breakthrough` | `auto`／`ask`／`off` | 修為 100 且未提升時自動排突破、詢問（§4.5）、或不排。沒有 `never` |
| `breakthroughPill` | `use`／`never` | 有庫存丹就用／不用 |
| `breakthroughSupport` | `auto`／`never` | 有閒置同門就支援／不支援 |

【建議】預設預設集「安穩發展」＝`aid: auto-free`、`recruit: auto-accept`、`breakthrough: auto`、`breakthroughPill: use`、`breakthroughSupport: auto`；另一預設集「全部詢問」＝三項 `ask`。每個值都在**開局設定畫面可見並由玩家確認**；沒有任何未授權的靜默決定（`off`／`never` 是玩家的明確選擇）。以上預設值屬**新玩法語義**，交 PO 整理、擁有人定案。

### 4.2 事件預設

| 舊事件 | RT 預設處理 |
|---|---|
| 階段事件（`evt-phase-*`） | 只寫入事件日誌的**通知**，不待選、不需點擊 |
| 村口求援 `evt-village-plea` | `aid` 政策自動處理；`ask` 時成為待選通知（見下） |
| 邀請 `evt-invite-cand-1/2` | `recruit` 政策自動接受（`acceptCandidate`，`joinTick`＝處理 tick，不補發產出）；`ask` 見下 |
| 突破詢問 | 不是舊故事表裡的事件。`breakthrough: ask` 走 §4.5，不進入 slot 的 `awaitingChoice` |
| 危機／結局 | **不觸發** |

`ask` 的待選事件【待決】D-RT-12：**建議不凍結世界**——事件掛在 `pendingEvents`，玩家可隨時 `chooseEvent`；超過 `ASK_EXPIRY_TICKS`（建議 180＝一日）仍未處理則自動採「稍後」選項（零成本、不改世界資源；援村維持可做，候選維持 `deferred`，突破詢問進入 §4.5 的 cooldown），並寫 `askExpired`。這讓「無人介入」在任何政策下都不會被一次點擊卡死，同時不替玩家做有成本的決定。替代方案（凍結世界等點擊，同現行 `awaitingChoice`）會讓無人介入驗收在第一個 `ask` 事件停住，不採。突破詢問的同意、逾期、去重與重新詢問不沿用這段的舊事件 id，見 §4.5。

### 4.3 安全後續（每一種停滯都有可讀去向）

| 情況 | 行為 | 可見原因 |
|---|---|---|
| 缺材料／缺靈草 | 產生採集需求並去採；階段未解鎖則該目標 `blocked(herb_locked)`，改做其他目標或修行 | 目標卡片「缺 N」 |
| 疲勞／傷勢達 R1 | 正式 `rest` 活動（含必要移動與工時），不是等待 | `rest:low_stamina`／`rest:injury` |
| 收到修行意圖，且快照已滿 100 或已成功提升 | D7-C：該意圖轉正式休養活動（§2.2），不拒絕 | `fallback.from = cultivate`，reason `cultivation_full` 或 `breakthrough_done` |
| 自主看到滿 100 且未提升 | 不輸出修行。`auto` 排突破；`ask` 走 §4.5；`off` 則在沒有恢復需求時進入無效果等待 | `breakthrough` 請求，或 `wait: cultivation_full` |
| 無工作位 | 落選記 `waited`，該 tick 改做一次正式休養；工作位釋放後下一決策再請，輪候 `waited` 優先 | `denied: no_seat`，接著 `rest:job-denied` |
| 丹不足／無支援者 | 只在該次請求的凍結欄位就是不用丹／不支援時，才無丹或無人突破。凍結要丹或指定支援者而資格不夠：整批落選，不改寫欄位、不空轉 | `insufficient_resource` 或 `participant_busy` |
| 目標耗盡 | 先處理恢復與未完成的突破，穩定後才等待（§4.4） | 休養活動，或 `wait: goals_done` |

無重試忙迴圈（§3.3、§4.5）；無永久死鎖：每個角色每個 tick 不是「有活動」就是「有原因的等待」，並有復查 tick；工作位與材料只在預約成功時占用，取消／完成時釋放。等待不負責恢復。

### 4.4 目標耗盡與日常維持（【待決】D-RT-10）

休養活動和等待是兩種狀態，不能同時成立（§5.4）。休養會移動、占位、消耗工作 tick，並在單位完成時呼叫 `applyRest`。等待不移動、不占位、不發命令、不產生效果；人留在進入等待的那一格，體力、心境、傷勢與庫存都不因等待本身改變。

- **建議 A**（仍是候選）：目標全部完成後，尚未提升者繼續修行到 100，再依政策排突破或詢問。除此之外只允許下面的轉移，不引入新常數，也不假造無限內容。
  1. 恢復條件成立（§3.3 R1）→ 先離開等待或閒置，走正式 `rest`（含前往居所或道館的移動）。來源是 `rest:low_stamina` 或 `rest:injury`。
  2. 收到修行意圖且已滿或已提升 → 只走 §2.2 的 D7-C 休養，不進入「邊等邊恢復」。
  3. 恢復條件不成立，也沒有可執行的突破或詢問動作 → 進入 `wait`，原因 `goals_done`。不回道館，不在道館野外暗中休養。
  4. 復查（世界簽章改變，或每 `TICKS_PER_SLOT`）若恢復條件再次成立，先結束等待再開始休養。休養單位完成後若仍然沒有需求，重新進入 `goals_done` 等待。
- 世界繼續走 tick，不終局、不卡。玩家隨時 `setGoals`；新目標在下一次決策生效，不從等待裡直接產出。代價是「放著不管」到恢復穩定之後，角色停在原地，直到有新目標或再次需要休養。
- 替代 B：維持模式持續採集／煉丹到庫存上限 N（新數值，需 PO／擁有人定值，並決定這些庫存的用途）。能多一點日常感，但新增數值。不建議在第一版，也不是本輪可自行批准的方案。
- 無論 A／B，跨第 14 天邊界（tick 2520）世界都只是繼續；第 11 天起的階段固定為「獸患升溫」（§1.2），沒有獸患事件、沒有立派／敗局。禁止的寫法是：`wait: goals_done` 同時又在道館野外把體力回復。那樣會繞過統一的活動結算。

### 4.5 突破詢問（`breakthrough: ask`）

現行 `story-data.js`（contentVersion 1）沒有突破待選事件，而且 slot 契約是「待選就 `awaitingChoice`、停止 advance」。RT 不把突破詢問塞進那張 slot 表，也不靠 `phase: awaitingChoice`。詢問是 RT 擴充資料，由 RT-02 照本節加入；本 PR 不改 `story-data.js`。slot 載入器若看到 `kind: breakthroughAsk` 必須拒絕。

**靜態模板**（只存在於 RT 擴充，不進 `slice-14`）：

| 欄位 | 值 |
|---|---|
| 模板 id | `evt-breakthrough-ask` |
| kind | `breakthroughAsk` |
| pending | true |
| narrativeOnly | true（正文不得含數字） |
| 選項 | `opt-breakthrough-agree`「現在突破」，唯一效果 `{ type: 'orderBreakthrough' }`；`opt-breakthrough-later`「稍後再說」，`effects: []` |
| 正文 | 標題「可以嘗試突破了」。內文只說明修為到了這一境的門口，可現在突破或先放著 |

`orderBreakthrough` 不是資源發放，也不是新玩法。它只表示同意時改走與 `orderActivity` 相同的正式請求。效果上不帶 `usePill`／`supporterId`；`chooseEvent` 的 payload 仍只有 `eventId` 與 `optionId`，玩家不能夾帶丹或支援者。

**實例**掛在 `pendingEvents`，每個角色至多一筆未關閉：`id = evt-breakthrough-ask/${discipleId}/${generation}`，並存 `discipleId`、`generation`（從 1 起）、`raisedTick`、`expiresTick = raisedTick + ASK_EXPIRY_TICKS`。`story.breakthroughAsks[discipleId]` 記 `generation`、`openEventId`、`lastDisposition`（`agree`／`later`／`expired`／`agree_invalid`）、`cooldownUntilTick`。沒有這筆紀錄＝從未詢問。

**開啟**在 tick 階段 1，先處理逾期，再開新詢問。條件是政策 `breakthrough === 'ask'`、`Progression.eligibility` 通過、該角色沒有未關閉詢問、沒有 pending 或進行中的突破、也沒有手動突破指令，且 cooldown 已過。同一 tick 同一角色至多一筆。人正在做別的活動也可以詢問：詢問不是活動，不占工作位，也不暫停其他人。

**去重**：已有 `openEventId` 就不再掛。不用全局 `onceKey` 把此人永久問死；此 kind 帶 slot 用的一次性 `onceKey` 則驗證失敗。實例 id 重複，或同一角色兩筆未關閉，載入直接拒絕。

**同意**可用 `chooseEvent`，暫停或進行中皆可。暫停不推進 `expiresTick`。

1. 關閉這筆詢問。不抽 RNG。
2. 用選擇當下的快照重驗資格。已不滿 100、已成功提升，或已有突破在排隊 → 不建立指令，`lastDisposition = agree_invalid`，原因寫進事件，`cooldownUntilTick = 處理 tick + ASK_EXPIRY_TICKS`。
3. 資格仍在：`lastDisposition = agree`。依選擇當下的政策寫成明確值，凍結進 `manualOrder`（§2.5）。其後 `setPolicy` 不改寫。`breakthroughPill === 'use'` 且還有至少 1 枚未被預約的丹 → `usePill: true`，否則 `false`。`breakthroughSupport === 'auto'` → `supporterId` 取已入隊、非本人、當下閒置、id 最小者，沒有則 `null`。政策值 `never` 寫成 `false` 或 `null`，不是缺欄。
4. 這份 `manualOrder` 走 §2.3。丹在出發預約時才扣；支援者仍須符合 `joinTick` 與空閒，否則整批落選、不扣丹、不抽樣、不換人。落選同樣記 `agree_invalid` 並進入 cooldown，避免下一 tick 再掛同一問。
5. 角色若正在承諾型活動，指令保持 `pending`，直到該活動結束仍用這份凍結欄位。

**稍後與逾期**相同：零資源變化、不建立突破、不回復體力。`lastDisposition` 為 `later` 或 `expired`，`cooldownUntilTick = 處理 tick + ASK_EXPIRY_TICKS`。逾期在階段 1 處理並寫 `askExpired`。建議路徑不設 `awaitingChoice`，也不讓 `advanceTicks` 停在 `needsDecision`。

**重新詢問**：cooldown 結束後若仍符合開啟條件，`generation + 1` 再開一筆。成功突破後資格不再成立，不再詢問。失敗掉到 70 之後，在再次滿 100 之前不詢問；再次符合時新開一代，不必再吃「稍後」那段 cooldown（中間隔著的是修行）。cooldown 與逾期都沿用 `ASK_EXPIRY_TICKS`，不另設常數。

**自主**：政策為 `ask` 時，決策函式不輸出 `breakthrough`。詢問開著、人已恢復、又沒有別的需求 → `wait`，原因 `breakthrough_ask_open`。稍後或逾期的 cooldown 內、同樣無其他需求 → `wait`，原因 `breakthrough_later`。兩種等待都不移動、不 `applyRest`。需要恢復時仍先走 R1 的正式休養，詢問可以同時掛著。

**驗證邊界**（RT-02 加資料時必須滿足；本 PR 只寫契約）：模板是待選，且 options 恰好上面兩項；稍後效果為空；同意只有 `orderBreakthrough`；`narrativeOnly` 與現有「claims 或 narrativeOnly 恰好其一」一致；正文無數字；不引用危機、結局或 slot 觸發；`chooseEvent` 對未知 id、已關閉實例，或對不上 `discipleId`／`generation` 的選擇拒絕，且世界不變。slot 的效果詞彙不新增 `orderBreakthrough`。

兩條短時間線見 §7.3、§7.4。

## 5. 資料與相容

### 5.1 版本與 scenario（【待決】D-RT-13）

| 項目 | 舊 slot 世界【現值】 | RT 世界（提案） |
|---|---|---|
| scenarioId | `slice-14` | `life-rt` |
| schemaVersion | 4 | **5** |
| ruleVersion | 3 | **4**（新增 RT 時間／移動／工量常數與無上限階段查表；**既有數值表一個都不改**） |
| rngVersion | 1 | 1（演算法與向量不變；RT 只規定消費者與順序，§2.6） |
| story contentVersion | 1（要求 ruleVersion 3） | 1（資料不變；RT 以 §1.2 換算表引用，`requiresRuleVersion` 需接受 3 與 4 的**明確配對**，不放寬為任意版本） |

驗證以「（scenarioId, schemaVersion, ruleVersion）」三元組白名單判斷：`(slice-14, 4, 3)` 走舊引擎、`(life-rt, 5, 4)` 走 RT 引擎，其他組合（含 life-rt 配 schema 4、slice-14 配 schema 5）一律以現行風格的明確錯誤碼拒絕，**不靜默換算、不就地升級**。

### 5.2 RT 世界欄位（草案；RT-01 凍結時以此為準）

在共用欄位（`seed`、`resources`、`inventory`、`tiles`、`disciples`、`story`、`commandLog`、`eventLog`、`rngState`、`pendingEvents`、`characterOptions`、`protagonistId`、`masterId`、`revision`）之外：

- `clock: { tick }`。
- `policy`、`goals[]`、`goalsRevision`（§3、§4）。
- 每位弟子新增：`pos { r, c }`、`activityId`（null｜`act-nnnn`）、`manualOrder`、`autonomy { decisionSeq, wait: null | { reason, sinceTick, recheckTick } }`；`joinSlotIndex` 改 `joinTick`（舊欄位不存在於 RT 世界）。`manualOrder` 為 null，或 `{ seq, commandId, status: pending|active, kind, target, units, requestedTick, usePill?, supporterId? }`。`usePill` 與 `supporterId` 只在 `kind === 'breakthrough'` 時出現，而且必須出現：前者是布林，後者是 id 或 `null`。其他 kind 帶了這兩欄就拒絕。缺欄不得在載入時補成 `false`。
- `activities[]`：`{ id, discipleId, kind, target, units, unitsDone, workTicks, status, origin: manual|auto|policy, manualSeq, requestedTick, departTick, arriveTick, startTick, completedTick, waited, paid, snapshot, fallback, usePill, supporterId, outcome, partner }`。`snapshot` 存工作開工時的體力／心境／傷勢。`fallback` 為 null，或 `{ from, reason }`（D7-C 或仲裁落選後的休養）。突破活動的 `usePill` 為布林、`supporterId` 為 id 或 `null`，並與 `paid` 裡的丹一致；其他活動不帶這兩欄。`outcome` 只有突破（欄位同 SG-05）；`partner` 為突破／支援的對方 id。
- `story.breakthroughAsks`：`{ [discipleId]: { generation, openEventId, lastDisposition, cooldownUntilTick } }`，語意見 §4.5。沒有出現的角色＝從未詢問。
- `reservations[]`（工作位與參與者）、`seatWaits[]`（沿 SG-04 輪候）。
- **沒有**：`slotIndex`、`schedule`、`jobs`（舊）、`phase: awaitingChoice` 的凍結語意（`ask` 僅 `pendingEvents`，§4.2、§4.5）。

### 5.3 revision 與命令

沿現行 `expectedRevision`／命令 id 規則。revision 在**每個已提交 tick**（`step`）與**每個被接受的命令**各 +1，因此依舊畫面下的命令在世界前進後會被明確拒絕（與 slot 引擎「每格 +1」同語意）；暫停期間接受的命令只遞增 revision，不遞增 tick。被拒絕的命令不寫 `commandLog`、不改世界。`commandLog` 記 `origin`（`manual／auto／policy`）、tick、id，以及接受時的完整 payload。突破必須能從日誌讀回 `usePill` 與 `supporterId`，`false` 和 `null` 都要留著，不能改成摘要。

### 5.4 一致性驗證（必須拒絕的壞狀態，草案）

位置在棋盤＋村口範圍內、與活動／移動進度相容；`tick` 非負整數；每位弟子至多一個活動；活動 `unitsDone ≤ units`、`workTicks` 與 `unitsDone` 吻合；`traveling` 的 `arriveTick` 與出發 tick／位置／速度吻合；`done` 的活動不得仍占工作位／參與者；工作位占用不超容量；庫存／資源非負；`paid` 與重算成本一致（`done`／`cancelled` 退款帳平）；突破 `outcome` 可由 `rules.js` 重算（沿 SG-05）；`breakthroughs` 等於成功突破活動數；成功者修為 = 100；支援者 `joinTick ≤` 請求 tick；`manualOrder` 與 `activities` 引用一致；`autonomy.wait` 與 `activityId` 互斥；事件 `tick` 單調、`revision` 與已提交 tick／命令數吻合；不得同時含 slot 欄位。違反一律回明確碼並保持輸入不變。

另須拒絕：突破的 `manualOrder` 或活動缺 `usePill`／`supporterId`，或把缺欄補成 `false`；非突破卻帶這兩欄；`usePill: true` 但 `paid` 沒有扣到 1 枚丹，或 `usePill: false` 卻扣了丹；`fallback` 存在時活動不是 `rest`，或 D7-C 的 `manualOrder.kind` 不是 `cultivate`；`wait` 非空的同一段 tick 內出現 `applyRest` 或體力／心境／傷勢變化，且沒有對應的 `rest` 單位完成事件；同一角色兩筆未關閉的突破詢問，或詢問實例對不上 `breakthroughAsks`；RT 世界出現 `awaitingChoice`。等待期間的位置必須保持不變。

### 5.5 canonical、hash、存讀與續玩

- canonical 沿現行規則（key 排序、整數、陣列依 id／序號排序）。控制器狀態（暫停、倍率、背景頁籤、UI 選取）**不在世界、不入 hash**。
- 任意 tick 邊界（旅行中、工作中、休養／自主轉換、手動指令 `pending`、突破停點）都可 `serializeState`→`parseState`；續玩與不中斷在同 seed、同命令序列下世界與 `rngState` 完全一致。壞引用／時間／工量／目標／政策拒絕載入。
- 瀏覽器儲存、備份／匯出、不覆蓋原檔與重開提示沿 SG-07 責任，在 RT-03 接上；RT-00 不定 UI。

### 5.6 舊 schema4／rule3 存檔選項

| 選項 | 內容 | 優點 | 風險 |
|---|---|---|---|
| **A（建議）** | 舊世界**原樣讀取與續玩**於舊 slot 引擎（程式碼保留、舊測試與 golden 不動）；RT 是**新** scenario＋schema＋rule；兩者用三元組白名單分流，不互轉 | 不丟資料、不靜默換算、舊回歸與 20×42 格測試完整保留；RT 與舊結果不要求相同 | 要長期維護兩個引擎的載入分流與測試；UI 需標示「舊模式存檔」 |
| B | 同 D7：舊檔一律明確拒絕並保留原檔 | 最簡單 | 擁有人已說明不要自動套用 D7 策略；舊進度只能放著 |
| C | 轉換匯入：舊檔 → 新 RT 世界（位置＝道館、`tick = slotIndex×60`、舊 job／預約映射） | 舊進度可延續到 RT | 映射規則多（進行中預約、`joinSlotIndex`、`waited`、日課表丟棄）、易產生靜默錯誤；需要另行設計與逐欄驗證 |

【建議】A；C 若日後要做，需**另開包**、明確匯入（保留原檔、顯示差異），不在 RT-01～05。歷史 golden：舊 `new-world.json`（schema4／rule3）與 schema3／rule2 的歷史檔不動；RT 另建新 fixture 檔名，不重產舊檔。

## 6. 可核對規則與實驗

### 6.1 現值與來源（RT 直接沿用，不改）

| 項目 | 值 | 來源 |
|---|---|---|
| 地圖 | 5×5；靈材 (0,0)(0,4)(4,0)、靈草 (2,0)(2,4)(4,4)；資源點 2 位 | `Rules.MAP_TERRAIN`、`TERRAIN` |
| 設施 | 聚靈台 靈材 6／2 單位／工作位 1；丹房 12／3／1；居所 8／2／休養位 2；各限 1 | `Rules.FACILITIES` |
| 採集 | 靈材基礎 4、靈草依階段（omen 4、manifest／surge 5）× 技藝係數 × 體力係數；體力 −15 | `gatherYield`、`ACTIONS` |
| 修行 | 10 × 階段 × 悟性 × … × 體力 × 心境 × 傷勢；上限 3.0、最少 1；封頂 100；體力 −10、心境 −3 | `cultivationGain`、`CULTIVATION_CAP` |
| 煉丹 | 凝氣丹：靈草 6＋靈材 2、2 單位、產出 2×技藝×體力×丹房倍率（最少 1）；體力 −10 | `RECIPES`、`brewOutput` |
| 休養 | 野外 體力 +30、心境 +5、傷勢 −10；居所 +45／+8／−20 | `REST_WILD`、`REST_RESIDENCE` |
| 援村 | 1 人 1 單位；徒手 +靈材 3 靈草 2 聲望 1；備料（靈材 4）+8／5／2；`tick ≥ 540` | `AID_*` |
| 突破 | 100 修為、機率 5000＋丹 2000＋支援 1500＋心境≥60 500（上限 9500）、失敗 70%／傷勢 +15、體力 −20／心境 −5、支援 −10 | `Rules.breakthroughChance` 等 |
| 起始值 | 師徒體力 100／心境 60／修為 0／傷勢 0；師父屬性 5／5／5 | `START_VALUES`、`MASTER_ATTRIBUTES` |

### 6.2 RT 新常數一覽（全部【待決】，不得先寫進程式）

`TICKS_PER_SLOT`（建議 60）、`STEP_TICKS`（建議 6）、道館／村口座標（建議 (2,2)／(2,−1)）、`REST_BELOW_STAMINA`（建議 60）、`REST_AT_INJURY`（建議 30）、`ASK_EXPIRY_TICKS`（建議 180）、`WAIT_RECHECK_TICKS`（建議＝`TICKS_PER_SLOT`）、`OBSERVATION_TICKS`（建議 2700）、`MAX_BATCH_TICKS`（技術上限，建議 `TICKS_PER_DAY` 的整數倍，如 180）。換算原則：**一單位工作＝舊一格**，所有成本／產出由舊純函式在單位完成時給，沒有新增任何與收益相關的數值；唯一新增的「慢」來自移動 tick。

### 6.3 最小新局的時間預算（手排推演，非引擎輸出）

手排規則＝§3.3 預設目標＋R1 門檻 60，師父（根骨／悟性／技藝 5／5／5）與預設主角（道館學徒＋均分：4／5／3），道館 (2,2)，丹房建 `t-0-1`，採靈材於 `t-0-0`、靈草於 `t-2-0`，援村徒手。以 `rules.js` 純函式逐單位核對收益（臨時計算腳本，未入庫；沒有 RNG、沒有突破）。tick 為世界時鐘值。

| STEP_TICKS | 兩人採完靈材 | 丹房完工（可用） | 兩人採完靈草 | 首批丹完成（顆數；誰煉） | 援村完成（誰去） |
|---|---|---|---|---|---|
| 3 | 132 | 315 | 630 | 759（2；主角） | 765（師父） |
| **6** | **144** | **330** | **660** | **798（2；主角）** | **810（師父）** |
| 10 | 160 | 350 | 700 | 790（2；師父） | 770（主角） |

說明：①對照舊 slot 手排（RULES §7：丹房第 4 格末完工、首爐丹第 12 格可用且**只有 1 顆**）：RT 的丹房晚約 15–50 tick（<1 段）；首批丹 759–798 tick＝約第 12.7–13.3 段，晚約 1 段，但開爐者體力 ≥ 60（R1 先休養，體力 52 的師父讓位給體力 65 的主角）使產量為 2 顆；②援村在 540 之後才開放；預設目標順序讓丹的供應先於援村，完成約在 765–810 tick（段 12.75–13.5）；③誰煉丹、誰援村、完成先後會隨 STEP_TICKS 與迴圈邊界對齊而變（例如 S＝10 時師父煉丹、主角援村），這是手排的偶然，**不是**速度規律，也說明手排不能代替引擎量測；④之後（收徒、修行到 100、突破）未手排，需 RT-02 引擎與 §6.4 矩陣量測，這裡不宣稱 15 日內能完成。時間預算沒有「必勝」要求（D8），只要求每一步都可解釋。

### 6.4 RT 驗收矩陣（【待決】D-RT-14 觀察窗；凍結提案）

- **觀察窗**：`OBSERVATION_TICKS = 2700`（15 日，含 14 日邊界 tick 2520 並多走一日）。檢查點：540（草藥解鎖／援村開放）、1080（邀請可出現）、1800（獸患階段起）、2520（舊危機邊界；RT 不觸發）、2700（窗末）。窗長與換算先凍結，不事後縮短。
- **seed／情境**：至少 20 seed `rt-dev-000..019`（字串 seed）；`characterOptions` 沿 smoke 的 `optionsForIndex(i)` 輪替模板／配點；政策輪替：「安穩發展」10、「全部詢問」5、自訂（援村 `off`／收徒 `ask`／突破 `off`／丹 `never`／支援 `never` 等）5。`breakthrough` 的合法值只有 `auto`／`ask`／`off`，沒有 `never`。無人介入為主，另有暫停介入腳本（固定 tick 下命令，seed 內以字串決定，不用世界 RNG）。
- **每個檢查點的不變式**：資源／庫存非負；位置合法；每位已入隊弟子「有活動」或「有原因的等待」；預設政策下不凍結（無 `awaitingChoice`）；`ask` 事件逾期後自動「稍後」；`validateWorld` 通過；序列化往返 hash 相同；沒有 slot 欄位；沒有 ending。
- **等價性**：同 seed、同 tick 命令序列：逐 tick＝切塊（3、60、180、變動長度模擬 render 頻率）＝一次到終點，世界 hash 與 `rngState` 一致；不同播放倍率（控制器餵 tick 的方式不同）一致；任意隨機選定的 tick（含旅行中、工作中、`manualOrder pending`、突破停點）存讀後續玩一致。
- **正向行為**：暫停零進度（`tick`、位置、`workTicks`、資源、`rngState` 全不變，只有 revision／commandLog／意圖欄位變）；真移動耗時（未到不工作、旅行中不兼採集／建造／支援）；人工覆寫（可打斷活動的捨棄規則、承諾型 `pending`、手動鎖與 `autonomyResumed`）；資源與座位互斥（同 tick 爭搶只合法者開工）；取消／重送／改令不刷收益（`traveling` 取消淨零、`done` 不可再發獎）；突破去重與一次成功上限；收徒 `joinTick` 前不勞動／不支援。
- **D7-C 手動修行**（兩種都要，都不是 `cultivationBlock` 拒絕）：①修為已 100、尚未成功提升，玩家下 `cultivate` → 指令接受，活動為 `rest`，`fallback.reason = cultivation_full`；不扣修行的體力／心境，修為仍是 100，不占聚靈台，不多一份效果。②已成功提升後再下同樣指令 → 同樣轉休養，`reason = breakthrough_done`，不排第二次突破、不加修為。兩種都走休養的工時、容量與輪候。
- **pending 突破存讀**：暫停時對主角下突破，`usePill: true`、`supporterId` 為某一已入隊角色；接著 `setPolicy` 把丹與支援改成 `never`；在承諾型工作結束前把世界 `serializeState`／`parseState`。恢復後預約仍扣 1 枚丹並綁定原支援者，不按新政重算。對照組 `usePill: false`、`supporterId: null` 則不扣丹、不綁人，即使政策是 `use`／`auto` 且庫存有丹。缺欄的手動突破在接受時就是 `bad_payload`，世界不變。
- **突破詢問**：照 §7.3、§7.4。全程 `ask` 且無人選擇時，世界不進入 `awaitingChoice`，同一角色不會每個復查 tick 各掛一筆；逾期是稍後，不扣丹。暫停後同意一次：重驗資格，凍結當下的丹與支援者，成功後不再詢問。
- **休養與等待**：建議 A 下，目標耗盡且恢復條件已不成立時，`activityId === null`、`autonomy.wait.reason === goals_done`，連續 `TICKS_PER_SLOT` 個 tick 的位置、體力、心境、傷勢與庫存不變。若復查時恢復條件成立，下一次決策必須先出現 `rest` 活動，`applyRest` 只記在該單位完成的事件上，不能記在 `wait` 上。跨 tick 2520 仍滿足「有活動或有原因的等待」且二者互斥。
- **舊世界**：`slice-14`（schema4／rule3）全部既有測試、golden、20 seed×42 格**原樣保留並通過**；舊檔在 RT 載入器下走舊分流或明確拒絕不合法組合；不要求 RT 與舊 slot 的經濟結果相同，也不把舊通過搬成 RT 通過。
- 成本：沿[分層測試政策](../../docs/testing-policy.md)：RT-01～04 的日常迭代先跑相關單測與 3／5 seed；時間／schema／結算屬高風險，**接受前跑完整 20 seed 窗**與 CI，完整輸出落檔，只報命令、exit、head／base／版本、seed／策略／時長與失敗。

## 7. 事件時間線（手排示意）

共同設定：S＝6、TICKS_PER_SLOT＝60、道館 (2,2)、預設政策「安穩發展」、預設目標、預設主角（4／5／3）。tick＝世界時鐘值；「做 X」均指**預約成功**後出發。數值由 `rules.js` 純函式核對，**不是引擎輸出**。

### 7.1 時間線 A：全程無人介入（到首批丹與援村）

| tick | 角色 | 事件與原因 |
|---|---|---|
| 0 | 師父／主角 | 兩人閒置。R2：丹房目標缺靈材 12 → 靈材需求（師父預期 4／單位、主角 3／單位，兩人 2 單位共 14 ≥ 12）→ 兩人預約 `t-0-0`（2 位）出發，各 4 格＝24 tick |
| 24→144 | 師父／主角 | 到達，各採 2 單位：144 完成，靈材 14（師父 4＋4、主角 3＋3）；體力 100→70 |
| 144 | 師父 | 需求：建丹房 → 出發即扣靈材 12（庫存 14→2）→ 往 `t-0-1`（1 格＝6 tick）→ 150 開工建造 3 單位 |
| 144 | 主角 | 建造已有人；靈草／援村尚未開放；R3 保底進度 → 回道館（24 tick）修行 |
| 330 | 師父 | 丹房完工、可預約。體力 25 < 60 → R1 休養：往道館（3 格＝18）→ 348 起兩單位休養（+31 ×2）→ 468 體力 87 |
| 168–528 | 主角 | 修行／休養循環：體力降到 50 即休養（R1），回到 80 再修行；每單位後重判（單位邊界） |
| 468–588 | 師父 | 靈草尚未解鎖（階段 faint）→ R3 修行 2 單位，體力 67 |
| 588 | 師父／主角 | 540 已過、靈草解鎖。目標 `stockPills` 缺靈草 6：依 id 分配，師父（預期 4）＋主角（預期 3）→ 兩人預約 `t-2-0`（2 格＝12 tick）出發 |
| 600→660 | 師父／主角 | 採靈草 1 單位：師父 +4、主角 +3＝7；體力 67→52、80→65 |
| 660 | 主角 | 體力 65 ≥ 60；`stockPills` 缺口已被填滿（靈草 7、靈材 2）、丹房已完工 → 預約煉丹（出發即扣 靈草 6＋靈材 2；庫存剩靈草 1）→ 往 `t-0-1`（3 格＝18）→ 678 開工，2 單位（開工體力 65 → 預估 2 顆） |
| 660 | 師父 | 體力 52 < 60 → R1 先休養（R1 優先於目標，所以不拿 52 體力去開爐）：往道館 12 tick → 672 起休養 → 732 體力 83 |
| 732 | 師父 | 休養完成、閒置。`aid`（政策 `auto-free`、tick ≥ 540、未完成、無進行中）→ 預約村口，往 (2,−1)（3 格＝18）→ 750 開工 |
| 798 | 主角 | 煉丹完成：凝氣丹 +2（庫存 2）；`stockPills 2` 完成；事件 `jobCompleted` |
| 810 | 師父 | 援村完成（1 單位）：發一次獎勵 靈材 +3、靈草 +2、聲望 +1（去重鍵 `reward:village-fence`）；體力 68 → 之後回道館 |
| 之後 | 全隊 | `aid` 完成後 tick 1080 起邀請事件由 `recruit: auto-accept` 自動處理（本線不延伸）；修為到 100 後 `breakthrough: auto` 自動排（有丹、有支援者）。目標耗盡後 §4.4 |

可說明：為何工作（目標需求）、為何休養（體力 <60）、為何先修行（保底進度）、為何不空等（未解鎖就 `blocked(herb_locked)` 並做別的）、為何主角煉丹而師父援村（師父體力 52 先被 R1 拉去休養）。去重：所有請求由 `(tick, disciple)` 唯一決策產生；援村獎勵、丹產出只在活動 `done` 當 tick 發一次。

### 7.2 時間線 B：暫停介入（同一世界，tick 200 暫停改主角工作）

接 7.1：tick 200 時主角在道館修行第 1 單位進行中（168→228，工作進度 32/60），體力 70，師父正在建丹房（承諾型）。

| 步驟 | tick | 事件 |
|---|---|---|
| 1 | 200 | 玩家暫停（控制器停止 `advanceTicks`）。世界 `tick=200`、位置、進度、資源、`rngState` 不變 |
| 2 | 200 | 玩家 `orderActivity { id:'u-1', discipleId:主角, kind:'gather-material', target:{tileId:'t-4-0'}, units:2 }`：驗證通過（主角、材料點存在、未滿 100 無關）→ 主角 `manualOrder pending`，revision +1。世界 **tick 仍 200、不產出、不動位置** |
| 3 | 200 | 玩家誤對丹房下 `orderActivity{kind:'brew'}`（丹房未完工）→ **被拒絕**（`facility_not_ready`），不寫 `commandLog`、世界不變 |
| 4 | 200 | 玩家重送 `u-1`（同 id 同內容）→ 回原結果，不新增 `manualOrder`；改內容重送 → 以現行規則拒絕 |
| 5 | 200→201 | 玩家恢復。`step(200)` 階段 2：`manualOrder` 轉請求，主角的修行是可打斷活動 → **進行中單位 32 tick 進度捨棄、不扣體力、不給修為**；`t-4-0` 有空位 → 原子預約成功、主角取得手動鎖；階段 3：開始移動（路線 (2,2)→(3,2)→(4,2)→(4,1)→(4,0)，4 格＝24 tick） |
| 6 | 224 | 主角到達（200 出發；到達同 tick 不算工）。自主在整段手動鎖期間不為主角發任何命令 |
| 7 | 224→344 | 採靈材 2 單位：單位 1 開工體力 70 → +3（技藝 3、體力係數 100%）；單位 2 開工體力 55（30–59 區間 80%）→ +3；共 +6，體力 40 |
| 8 | 344 | 手動活動 `done`：釋放工作位、手動鎖結束；事件 `autonomyResumed { reason:'manual-done' }`。下一 tick 階段 2：體力 40 < 60 → R1 休養（往道館 24 tick）。**沒有重複領取**：`act-xxxx` 已 `done` 不可再推進；主角不會「補做」被捨棄的修行單位 |
| 9 | 之後 | 師父不受影響（丹房 tick 330 照常完工）；`setGoals` 若在暫停時改過，只在角色下一次決策才影響行為，不打斷任何進行中活動 |

承諾型例子：（在時間線 A 上）若玩家在 tick 700 對**正在煉丹**的主角下手動命令，命令被接受為 `pending`，介面顯示「將於 tick 798 完成後執行」，煉丹不被打斷、不退料、不刷成果。若該命令是突破，`pending` 上的 `usePill`／`supporterId` 按 §2.5 原樣保留到 798 之後。

### 7.3 短時間線：全部詢問、無人介入

政策三項都是 `ask`，丹 `use`、支援 `auto`。這裡只寫突破詢問，不重排 §7.1。數字仍是契約推演，不是引擎輸出。

| tick | 事件 |
|---|---|
| T | 主角修為 100、尚未提升、沒有活動。階段 1 開啟 `evt-breakthrough-ask/主角/1`，`expiresTick = T+180`。世界不凍結，其他人照常工作。階段 2 不排突破。體力未低於休養門檻、傷勢也未達休養線，又沒有其他需求 → `wait`，原因 `breakthrough_ask_open`。`activityId` 為空，體力不變 |
| T+180 | 無人選擇。階段 1 逾期＝稍後：不扣丹、不綁支援、不抽樣、不回復。`cooldownUntilTick = T+360`。等待原因改為 `breakthrough_later` |
| T+360 | cooldown 結束，人仍滿 100、政策仍是 `ask` → 開啟 generation 2。不是每個復查 tick 各掛一筆 |

### 7.4 短時間線：暫停後批准一次突破

接 §7.3 的 tick T。假設當時還有 1 枚未被預約的丹，以及一名已入隊且閒置的同門。

| tick | 事件 |
|---|---|
| T+10 | 玩家暫停。`tick` 仍是 T+10，詢問不逾期。`chooseEvent` 選同意。重驗仍滿 100；凍結 `usePill: true` 與該同門的 `supporterId`，`lastDisposition = agree`。接著 `setPolicy` 把丹與支援改成 `never`，不改這份 `manualOrder` |
| T+10 | 存讀。pending 仍是同意當下的丹與支援者 |
| 恢復後的第一個 step | 預約成功才扣 1 枚丹並綁定該支援者，不按 `never` 重算。完成時抽樣一次。成功後不再詢問。若恢復時丹已被別人預約，整批落選，不改成無丹突破，並進入 cooldown |

## 8. 與歷史、D6、D7 的關係

- 保留：D6 師徒兩人開局、復甦階段、援村後兩名固定學徒（`joinTick` 才工作）、無永久死亡、單一 JS 權威引擎與單一版本 RNG；D7 修為上限 100、突破成功保留 100、最多一次成功、失敗 70%／傷勢 +15、結果去重、舊 slot 引擎、歷史 golden 與 20 seed×42 格測試。
- D7-C 在 RT 仍是明示轉休養（§2.2），不是把滿修為或已提升的修行意圖拒絕掉。自主另選突破或等待，和「已經收到修行意圖之後的 fallback」是兩件事。
- 休養活動與等待分開（§4.4）。等待不回復。這不改 D7 的數值。
- 取代（僅新 RT 模式）：D2「一格一行動」作為權威時間契約、「行走只做動畫」、SG-06 先行的順序。
- 不做：戰鬥、獸患、立派／敗局、第二境、28 天內容、巡山／輕功、生活屬性成長、需求條、付費模型、尋路／碰撞／負重、全隊手動排程、歷史存檔自動轉換（C 選項）。
- 不改任何舊數值；不覆寫舊 fixture／golden。

## 9. 給 RT-01 的凍結清單與未驗證項

**分階段凍結。不是 16 項全部定案才准寫 RT-01。** 候選在定案前都不得寫進程式當常數。分組與理由見 §0。

- RT-01 開工：本文件已合入 dev、該次 post-merge CI 成功，且時間包的 D-RT-01、02、03、14、工作誠信包的 04、06、07、舊檔包的 13 已定案。D-RT-05 沿「單位完成時一次套用」實作，D-RT-16 沿 §1.5 實作，二者不另等一題批准。D-RT-15 的播放數字不進 RT-01，也不得寫進世界。
- RT-02 開工：RT-01 已合入且 post-merge CI 成功，且授權邊界包的 08、09、10、11、12 已定案。若 12 改選凍結世界，則改列 RT-01 的開工條件，本文件須先改 `needsDecision`。
- RT-04 開工：RT-03 已合入且 post-merge CI 成功，且 D-RT-15 已定案。RT-03 不新增上述產品題。
- 某一包未定案時，只停依賴它的實作。本輪之後 RT-01 仍然受阻。不把作者建議當成擁有人已批准。

RT-01 範圍＝§1、§2、§5.1–5.4 的 runtime 與公開 API、`advanceTicks`、手動命令、驗證器與對應測試／fixture；不含自主（RT-02）、儲存介面（RT-03）、UI（RT-04）。§4.5 的詢問資料隨 RT-02，不在 RT-01 先寫進 slot 故事表。

**本包未驗證／未決**：①所有 RT 新常數的最終值（§6.2）與其對 14 日內可達性的影響——只有手排推演（§6.3、§7），沒有引擎、沒有 seed 量測；②「首批丹之後」（收徒、修行至 100、突破）在 15 日內是否可達；③自主預設表與 R1 門檻對產能的取捨；④`ask` 逾期策略與預設政策是否符合擁有人對「未授權決定」的界線；⑤story-data 的 RT 引用方式（`requiresRuleVersion` 的配對寫法）；⑥舊檔選項 A 的長期維護成本；⑦UI 預估顯示與暫停編輯流程屬 RT-04；⑧真人試玩屬 RT-05。**未宣稱任何驗收項通過**；`ACCEPTANCE.md`／D8 驗收仍為未通過。
