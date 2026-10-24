# 破道館到小門派：門派生活、同圖武學與塔防演武重新架構總藍圖

> **狀態**：架構與系統設計藍圖（基於最新 `dev` `148cfbbb27e43475c66744d53c2451125a9111a0` 資產與歷史 Issue 盤點）
> **分支**：`plan/sect-life-architecture-redesign`
> **核心願景**：融合《天下霸圖》的門派作息與擴建成就感、《模擬市民》的技能成長與人際成家溫度，以及「同圖即時武學 × 塔防式演武打獵」的實戰檢驗閉環。

---

## 一、 設計哲學：五大體驗支柱與「保留 vs 重建」

經過 M1–M2 世界模擬與 `sect-chronicle` LP01–HOME02／SOCIAL01 的迭代，我們已經非常清楚這部作品真正迷人的靈魂是什麼，以及現有原型（`experiments/water-carry/demo/`）為什麼需要一次骨架升級：

### 1.1 五大核心體驗支柱（對齊 [NORTH_STAR.md](NORTH_STAR.md) 與 [#314](https://github.com/lalagrass/earth-ascension/issues/314)）

| 支柱 | 玩家在畫面上看到什麼 | 核心樂趣來源 | 刻意不做的事 |
|---|---|---|---|
| **P1 天下霸圖式門派生活** | 弟子們在同一個山門地圖裡晨鐘暮鼓、跑來跑去，挑水、種菜、煎茶、練樁、學新武學 | 看著一個個鮮活的小人按門派作息與各自性格把山門運轉起來 | 變成只看數字報表的純文字經營，或事事都要玩家微操點擊 |
| **P2 同圖即時武學** | 不切換戰鬥場景；在外功場打木人樁、在院中同門切磋、在後山擊退野獸，全在同一張地圖直接出招 | 肉眼看得出「初學 vs 練熟」的起手快慢、掌風／劍氣範圍、步法殘影與第二式連招 | 另開回合制棋盤、滿螢幕飄 DPS 爆擊數字 |
| **P3 模擬市民式生活與成家** | 弟子做什麼長什麼技能；收工後在石凳／餐敘棚聊天、互助，關係從同門、知己走到結為道侶／家人並搬進同房 | 關係變化有真實事件記憶支撐（一起躲雨、代挑一擔水、並肩守山），而非盲刷好感條 | 無因果的送禮刷分、每 tick 呼叫 LLM 編造無中生有的台詞 |
| **P4 塔防感武學演練與狩獵** | 玩家在演武場或後山隘口擺放「陣位（守點）」與「應戰方針」，看弟子用練熟的武學自主攔截機關波次或後山獸群 | 實地驗收「這一個月練的掌法、棍法、輕功到底有沒有用」，打完帶回獸肉與一張因果清晰的戰報 | 無限刷怪割草、要求玩家手動操作每一次出招與走位 |
| **P5 從破道館一磚一瓦擴建** | 時間退回門派成立前：開局只有漏雨的破大廳、雜草院子與一口露天井；慢慢修起宿舍、膳房、菜園、藥園、外功場與後山望台 | 每個區域都由弟子真搬木石、搭鷹架施工建成；每蓋好一處，門派就多一類生活與武學活動 | 開局就是建好的大門派、點一下瞬間生出建築 |

### 1.2 現況診斷：為什麼要「保留手感與水彩資產，換掉底層骨架」？

在現有 [model.mjs](../../experiments/water-carry/demo/model.mjs)（約 1,740 行閉包）與 [routes.mjs](../../experiments/water-carry/demo/routes.mjs) 中，我們已經成功驗證了這套遊戲最寶貴的手感：
- **已驗證並 100% 保留的資產**：
  1. **長通勤與負重／腳力速度差**（[D26–D27](../DECISIONS_AND_SOURCES.md)：空手 60→84/s、負重 40→64/s，「成長即速度」肉眼可見）。
  2. **同圖武學節奏**（[palm.mjs](../../experiments/water-carry/demo/palm.mjs)、[#305 TRAIN01](https://github.com/lalagrass/earth-ascension/issues/305)：起手 Windup 48→24 tick、收勢 Recover 36→18 tick、掌距與逐隻換目標）。
  3. **有目的的生態個體與返程餘裕**（[patrol.mjs](../../experiments/water-carry/demo/patrol.mjs)、[#290 PATROL01](https://github.com/lalagrass/earth-ascension/issues/290)：野豬與林鼠有棲地、有威脅值、會逃離；巡山會算返程精力餘裕並產出真戰報）。
  4. **水彩山居母版與分階段美術資產**（[#323 SCENE-04](../../experiments/water-carry/design/scene04-masterplan/README.md) 的 S0 破道館 → S1 可居住 → S2 成熟門派三階段同母版水彩圖、`art184-watercolor`、`home01`、`home02`、`scene03` 與 `template/animator.mjs` 角色動畫烘培管線）。

- **必須重構的結構瓶頸**：
  1. **兩人寫死（`PEOPLE = [hero, cousin]`）**：反應傾向 `AUTO_REACT`、座位 `SEATS.hero`、休閒 `FUN.cousin`、練樁 `TRAIN_POSTS.hero` 全部按 ID 寫死，無法擴展到 6–12 名常住弟子與訪客。
  2. **活動狀態機碎片化**：每加一個玩法（飲水、泡茶、砍柴、修房、清鼠、招呼）就要在 `model.mjs` 手寫一組 `toXxx / xxx / fromXxx` 與專屬 `want / accept / suppress / cancel` 分支，N 個弟子 × 7 大區域 × 多門武學會讓分支組合爆炸。
  3. **單一端點手畫折線（`(962, 512)`）**：所有路線強行從院中水缸旁同一點出發以防瞬移；一旦弟子要從「宿舍」直接去「膳房」吃飯再去「外功場」練樁，手畫折線便無法支撐。

---

## 二、 核心系統重構架構（New Simulation Core Architecture）

我們建議在 `sect-chronicle/life/core/` 另起一套**資料驅動、確定性 60Hz Tick** 的模擬核心（S0 階段先將現有挑水、採藥、泡茶、砍柴修寢舍、練掌同感移植，驗收通過後凍結舊 `demo/` 作為對照組）。

```mermaid
flowchart TB
    subgraph DataLayer["1. 靜態規則與內容資料表 (Declarative Registries)"]
        ZoneReg["區域與建築階段表\n(Zones & Facility Stages S0→S2)"]
        SmartObjReg["設施活動廣告表\n(Smart Object Advertisements)"]
        MartialReg["武學與招式資料表\n(Arts, Moves, HitShapes)"]
        PersonaReg["性格、八卦心印與判詞庫\n(8D Profile + Bagua + Poems)"]
    end

    subgraph WorldState["2. 權威世界狀態 (Single Deterministic State @ 60Hz)"]
        Clock["時辰與門派作息鐘\n(Time, Shichen, Sect Schedule)"]
        MapGrid["三層空間地圖\n(Zone + NavGraph/A* + Stations)"]
        ResBroker["通用預約與庫存守恆器\n(Reservation & Inventory Broker)"]
        Disciples["弟子與訪客實體池\n(N Disciples: Needs/Skills/Persona/Intent)"]
        Ecology["後山棲地與演武波次器\n(Habitats, Beasts, Drill Waves)"]
        SocialLedger["因果記憶與關係帳本\n(Memories, Bonds, Households)"]
    end

    subgraph TickPipeline["3. 每 Tick 固定結算管線 (Deterministic System Order)"]
        S1["① 時辰推進與棲地/波次生成"] --> S2["② 感知與威脅掃描 (Perception)"]
        S2 --> S3["③ 四層決策仲裁器 (4-Tier Decision Arbiter)"]
        S3 --> S4["④ 預約鎖定與路網尋路 (Reservation & Pathing)"]
        S4 --> S5["⑤ 移動與負重/輕功步進 (Locomotion)"]
        S5 --> S6["⑥ 設施活動與同圖招式判定 (Activity & Combat)"]
        S6 --> S7["⑦ 成長、記憶與戰報入帳 (Progression & Ledger)"]
    end

    subgraph ViewLayer["4. 2.5D 水彩渲染與互動層 (PixiJS + HTML Inspector)"]
        SceneView["SCENE-04 分階段水彩底圖 + Y-Sort 遮擋"]
        CharAnim["Template 角色動作幀 + 招式地圖特效 (掌風/劍氣)"]
        UIInspector["可解釋面板 (現在/原因/下一步 + 命譜心印 + 戰報)"]
    end

    DataLayer --> TickPipeline
    WorldState <--> TickPipeline
    WorldState -->|純函式唯讀投影 view()| ViewLayer
    ViewLayer -->|玩家指令 Command| S3
```

---

### 2.1 模擬核心 A1：設施宣告活動（Smart Objects）與通用預約守恆器

借鏡《模擬市民》原始設計的 **Object Advertisement（物件廣告）** 與 [#315 (A1)](https://github.com/lalagrass/earth-ascension/issues/315)：**「能做什麼」定義在設施（Facility）上，而不是寫死在人身上。**

#### (1) 設施與活動宣告結構
每個設施依其當前建設階段（`wild` 荒廢、`ruin` 破損、`repair` 施工中、`built` Lv1、`expanded` Lv2）暴露可用的互動站位（Stations）與活動（Activities）：

```javascript
// 設施與活動資料化示意（純資料，無閉包耦合）
export const FACILITIES = {
  'fac.yard': {
    name: '外功演練場',
    zone: 'outerYard',
    stages: {
      S0: { state: 'wild', stations: [], activities: ['clearWeeds'] },
      S1: { state: 'basic', stations: ['post1', 'post2'], activities: ['drillMove', 'spar'] },
      S2: { state: 'built', stations: ['post1', 'post2', 'post3', 'post4', 'rack', 'defSlot1', 'defSlot2'], activities: ['drillMove', 'spar', 'martialWaveDrill'] }
    }
  },
  'fac.kitchen': {
    name: '膳房',
    zone: 'westYard',
    stages: {
      S0: { state: 'basic', stations: ['vat', 'teaStove'], activities: ['fetchWater', 'brewTea', 'sipTea'] },
      S1: { state: 'built', stations: ['vat', 'teaStove', 'stove1'], activities: ['fetchWater', 'brewTea', 'sipTea', 'cookMeal'] }
    }
  }
};
```

#### (2) 統一的四段式活動生命週期（Universal Activity Lifecycle）
所有日常工作、修繕、練功、泡茶、聊天都走同一個狀態機，徹底消滅手寫 `toXxx / xxx / fromXxx` 的同步 bug：
1. **`approach`（前往站位／採集點）**：出發時向 `ReservationBroker` 原子預約「目標站位 + 所需原料／存放空間」，並按當前「空手／負重 × 腳力／輕功等級」鎖定移動速度。
2. **`work / active`（站位執行）**：抵達站位後面向目標，播放對應動作（`chop`、`cook`、`palmDrill`、`chat`），按秒扣除／恢復精力並累積進度。
3. **`deliver / commit`（交付與成長）**：若是搬運類（挑水、採藥、砍柴、獵肉），沿回程路徑負重走回存放站位，**到位瞬間原子完成：釋放預約、實存 +1、對應技能經驗 +1**。
4. **`interrupt / cancel`（統一中斷守恆規則）**：
   - 沿用 LP04–HOME02 驗證過的黃金律：**「最新玩家指令優先；已拿到手上的在途貨物（in-flight）支援合法交付或安全退回工地／倉庫；取消去程時從當前真實座標折返，絕不瞬移。」**

---

### 2.2 地圖、七大門派區域與尋路 A2：從破道館長成完整山門

直接對接 `dev` 分支已完成的 [SCENE-04 母版配置 (`plan.json`)](../../experiments/water-carry/design/scene04-masterplan/source/plan.json) 與 [#316 (A2)](https://github.com/lalagrass/earth-ascension/issues/316)、[#321 (A7)](https://github.com/lalagrass/earth-ascension/issues/321)，將你期望的七大區域放進**同一張連續水彩大地圖**：

#### (1) 七大核心區域與三階段演進表（從破道館 S0 到成熟門派 S2）

| 區域 | 對應 `SCENE-04` 設施 ID | **S0：破道館開局（荒蕪求生）** | **S1：道館初立（溫飽與外功）** | **S2：門派成形（百藝、成家與塔防演武）** |
|---|---|---|---|---|
| **① 大廳區** | `fac.hall`、`fac.quiet` | **破頂正堂**：屋頂漏雨、師徒打地鋪暫住；首個任務是砍柴修補屋頂 | **修葺正堂**：可晨鐘早課、師父傳授基礎武學、接待山下訪客 | **三清正殿＋後院靜室**：藏經研讀、每旬「三問心印」立志、門派議事 |
| **② 練外功區** | `fac.yard` | **雜草前坪**：僅有一塊泥地可空手練架子，需先除草整地 | **夯土演練場**：立起 2 座木人樁（`post1/2`），可練掌法與雙人切磋 | **青石演武坪**：4 樁＋兵器架（棍／劍）＋**演武陣位（可開機關／傀儡波次演練）** |
| **③ 宿舍區** | `fac.dorm.a`、`fac.dorm.b` | **殘垣側屋**：屋頂坍塌（`dorm_broken.png`），無法入住 | **小寢舍甲（2 床）**：修好後認領專屬床位（`bed-A/B`），夜間安睡加速回精 | **東西廂房（8–12 床）＋道侶雙人房**：支援新弟子入住，親密達標可結契同住一室 |
| **④ 膳房與水系** | `fac.kitchen`、`fac.dining`、`fac.store`、`wat.*` | **露天井＋青石水缸＋小茶爐**：從潭南石階挑水入缸、煎藥茶解乏 | **膳房大陶灶＋柴房**：燒柴煮菜飯，滿足弟子「飽足」需求 | **膳房＋八仙桌餐敘棚**：午晚膳同門圍桌共食、閒聊增進感情，可燉獵肉大補湯 |
| **⑤ 藥園與藥房** | `fac.garden` (北)、`fac.herbstore`、`rt.farherb` | **荒廢舊藥畦**：僅能去西南溪橋外的遠藥坡採野生草藥 | **開墾藥圃＋晾藥架**：院內種植基礎靈草、晾乾備用 | **百草園＋煉藥房**：培育高階藥材，熬製金創藥、清心茶與破障湯 |
| **⑥ 菜園** | `fac.garden` (南) | **碎石坡地**：尚未開墾，滿地野草與山鼠嗅探 | **四季菜畦**：播種、引水灌溉、收割青菜送入膳房（種→收→煮→吃閉環） | **靈泉梯田**：由專職或偏好農藝的弟子照料，穩定供應全派十餘人口糧 |
| **⑦ 後山打獵與山門** | `fac.gate`、`fac.tower`、`risk.backwood` | **無門山徑**：西坡與北徑常有野豬拱欄、山鼠偷藥 | **木樁山門＋巡山小徑**：可派弟子沿西坡／北徑巡山驅獸 | **山門樓＋後山望台＋獵場隘口**：設守點陣位，進行**後山狩獵（產出獸肉／毛皮）與獸潮塔防** |

#### (2) 路網與尋路設計：Waypoint 走廊 ＋ 局部 A*（兼顧任意移動與長通勤美感）
- **為什麼不用純自由網格 A* 取代一切？** 因為現有挑水路（1700.9 單位，經過竹林坡、溪橋、潭南石階）與遠採藥路是精心設計的水彩觀賞動線。
- **混合尋路方案（Hybrid Corridor + Portal Graph）**：
  - **院外長路（Scenic Corridors）**：保留 `SCENE-04` `plan.json` 的 `water`、`farherb`、`patrol`、`village` 折線作為低成本主幹道。
  - **院內與跨區（Portal Graph + 16px Local Grid A*）**：院落開口（`gap.south` 院南口、`gap.gate` 山門、`gap.fence_w` 西院廊、`gap.shed` 餐敘棚通道）與各建築門口（`door`）連成導航圖（NavGraph）。弟子從「宿舍甲 bed-1」走到「膳房 stove」再走到「外功場 post2」，由導航圖算出最短路徑並平滑插值；途中若被玩家改派，直接從**當前真實 `(x, y)`** 尋路前往新目標，徹底告別「必須先走回 (962, 512) 院中端點」的限制！
  - **輕功捷徑（Qinggong Shortcuts）**：地圖上標註特殊地形邊（如 `step_stones` 踏石渡溪、`rock_ledge` 岩壁躍點、矮牆翻越點），只有 `輕功 ≥ Lv3` 的弟子在尋路時可將該邊視為連通，直接飛身躍過，在畫面上展現武林高手的瀟灑動線！

---

### 2.3 人物性格生成系統、命譜判詞與「三問心印」A3（整合 #5、#38、#106、#163）

你在歷史 Issue 中留下最有趣的設計之一，就是把 `earth_ascension` M2 的 **8 維性格與經歷漂移（[#5](https://github.com/lalagrass/earth-ascension/issues/5)、[#38](https://github.com/lalagrass/earth-ascension/issues/38)）**，與 **16 型人格／道家八卦心性／古風批命判詞（[#106](https://github.com/lalagrass/earth-ascension/issues/106)）** 以及 **每旬三問心印（[#163](https://github.com/lalagrass/earth-ascension/issues/163)）** 結合起來。

我們將它設計為**職責分明的三層架構**，既好玩、有記憶點，又遵守「不綁死行為、不強迫彈窗打擾」的原則：

```mermaid
flowchart LR
    subgraph Layer1["第一層：性格數值與經歷核心 (Trait & Drift Core)"]
        Gen["創角／弟子生成\n• 預設原型 (#38)\n• 情境問答\n• 隨機招募種子"] --> Vec8["八維性格向量\n開放/盡責/外向/親和\n穩定/探索/安全/關懷"]
        Mem["真實生活與戰鬥經歷\n(Memories v2)"] -->|有界微調 #5\n12月累計上限 ±0.10| Vec8
    end

    subgraph Layer2["第二層：道家心性與命譜投影 (#106 Narrative Projection)"]
        Vec8 --> MBTI["16型傾向 × 八大心性稱號\n如【玄同澄照】【抱樸守拙】\n【太上仁心】【狂狷任誕】"]
        Vec8 --> Poem["天命道鑑・古風批命詩\n依真實特質與已發生大事生成\n(絕不編造未發生事件)"]
    end

    subgraph Layer3["第三層：三問心印與自主決策 (#163 Heart Seal & AI)"]
        Vec8 -->|預設自動勾選\n懶人無須操作即可續進| Q3["旬首三問 (外求/入世/銳意)\n映射八卦心印 ☰☷☳☴☲☵☶☱"]
        Q3 --> Tier4["第 4 層自由時段權重\n影響收工後愛去哪裡、\n跟誰聊天、喜歡練什麼"]
    end
```

#### (1) 第一層：弟子性格生成與「經歷塑造性格」（Inherited from `earth_ascension/m2.py`）
- **生成方式**：
  - **主角創角**：提供像 [#38](https://github.com/lalagrass/earth-ascension/issues/38) 一樣的「一鍵人物原型（如：格物書生、守拙匠人、任俠少年、仁心醫徒）」或 3～6 道直覺情境題，生成基礎八維向量 `profile_base` 與 2～3 個顯性性格標籤（Traits）。
  - **弟子／村民生成**：每個 NPC 入場時由世界 Seed 決定其先天八維性格、身世背景（如：過勞工程師、村醫之女、好武少年）與「人生追求（Aspiration）」。
- **經歷微調（Bounded Personality Drift，沿用 #5）**：
  - 性格不是死板的常數！當弟子經歷重大事件（例如：第一次獨力擊退野豬、在後山受傷被師兄背回、連續十天修繕屋頂完工），會寫入 `profile_changes` 並附帶事件來源 ID，讓性格隨歲月微幅成長（受滑動視窗上限保護，不會突然性格崩壞）。

#### (2) 第二層：現代 16 型 × 道家心性稱號 × 古風判詞（#106）
- 在人物面板的【命譜心印】分頁，將八維性格投影為玩家一眼有感的雙重標籤与四句古風判詞：
  - **【玄同澄照】（分析／格物型）**：偏好研究藏經、改良爐灶水路；自由時間愛去靜室看書或觀察泉眼。
  - **【抱樸守拙】（守護／勤勉型）**：看不得水缸見底或屋頂漏雨；自由時間常順手整理護欄、劈柴備料。
  - **【太上仁心】（關懷／外交型）**：偏好照看藥園、泡茶待客；同門精力低時會主動關心鼓勵（如 [#337](https://github.com/lalagrass/earth-ascension/issues/337) 小女孩的溫柔陪伴）。
  - **【狂狷任誕】（挑戰／豪邁型）**：熱愛打木人樁、找同門切磋、主動請纓去後山巡獵；收工後愛爬上望台看山。

#### (3) 第三層：三問心印（#163 旬首立志 —— 預設按性格自動預選，不卡遊戲節奏！）
- 每旬（10 遊戲日）或玩家隨時點開大廳香案，有三道處世之問（已修正 [#163](https://github.com/lalagrass/earth-ascension/issues/163) 的爻位順序：`bit0 初爻＝外求/內省`、`bit1 中爻＝入世/獨善`、`bit2 上爻＝銳意/順應`）：
  - `111 乾為天【積極進取】`（偏外功與巡獵）、`000 坤為地【抱樸守拙】`（偏營造與農事）、`001 震為雷【雷厲風行】`、`110 巽為風【閒雲野鶴】`（偏看山飲茶悟道）、`101 離為火【紅塵歷練】`（偏接待訪客與社交）、`010 坎為水【險中求道】`、`100 艮為山【深居簡出】`、`011 兌為澤【春風化雨】`（偏指點同門與共食）。
- **關鍵 UX 守則（落實擁有人於 #163 的指示）**：
  - 系統會直接根據角色的「當前性格」**預先勾好三問答案**。
  - 到了旬首，只在大廳與頂部顯示一行溫和的卦象橫幅（如：`當旬心印：☴ 巽為風【閒雲野鶴】`），**完全不彈出強制對話框、不暫停世界**；想改方針的玩家隨時點開改，想放著看小人過日子的玩家零操作就能順暢推進！

---

### 2.4 弟子決策分層、技能成長與模擬市民式人際成家（A3 & A5）

#### (1) 四層決策仲裁器（4-Tier Decision Arbiter，延續 #313 可讀性）
每個弟子在任意時刻的行為都由高到低經四層仲裁，且面板清楚顯示**「現在在做什麼 ／ 為什麼（哪一層觸發） ／ 下一步打算」**：

| 優先層級 | 觸發條件 | 行為範例 | 面板可讀解釋範例 |
|---|---|---|---|
| **Tier 1：玩家明確指令** | 玩家手動指派工作、調度守點、邀約聊天 | 「去修繕膳房」「去演練場練《青松掌》」「跟阿秀聊天」 | `正在：修繕膳房｜原因：掌門親自指派｜下一步：完工後回院` |
| **Tier 2：必要生理自理** | 精力 ≤ 30、飽足 ≤ 25、或深夜亥時就寢 | 回自己認領的床位睡覺、去茶爐喝藥茶、去膳房盛飯吃 | `正在：回宿舍甲 bed-1 歇息｜原因：精力降至 28/100｜下一步：恢復至 80 後續接採藥` |
| **Tier 3：門派作息與職責** | 依門派時辰表（卯時早課、辰～午職責、午膳、未～申練武） | 樵夫去砍柴補庫、廚子在午時前生火做飯、弟子集合外功場練樁 | `正在：外功場打木人樁｜原因：未時門派武課｜下一步：酉時自由活動` |
| **Tier 4：性格與心印自主休閒** | 職責配額已滿（如水缸已達標）或酉時自由時段 | 【閒雲野鶴】去觀景石看山、【太上仁心】找同門泡茶聊天、半途偶遇熟人寒暄兩句 | `正在：與小師妹在石凳閒聊｜原因：自由時段・心印【春風化雨】｜下一步：戌時散步` |

#### (2) 「做什麼長什麼」可見技能系統（Skill Progression）
不搞抽象的綜合戰力值，每一項技能都直接反映在**動畫速度、移動動線或產出品質**上：
- **身法體魄類**：
  - `腳力 (Leg Strength)`：挑水、搬木、遠途採集提升 ➔ 空手與負重移動速度顯著變快（Lv1 40/s → Lv5 64/s）。
  - `輕功 (Qinggong)`：走梅花樁、山徑巡邏提升 ➔ 解鎖踏石渡溪、翻越矮牆與險坡捷徑，戰鬥中閃避位移更快。
  - `體魄 (Physique)`：砍柴、營造、外功抗打提升 ➔ 精力上限與負重單趟攜帶量提升（如一趟挑兩擔水）。
- **百藝生活類**：
  - `農藝 / 藥理`：種菜、採藥提升 ➔ 作物生長照料更快、採集時認出伴生珍稀靈草。
  - `庖廚 / 茶道`：煮飯、煎茶提升 ➔ 做出的飯菜與靈茶提供更長效的飽足與回精速率。
  - `營造`：修屋、築牆提升 ➔ 工地施工讀條加快、消耗木石更省。

#### (3) 從閒聊、互助到「結契成家」的人際關係網（#188、#319、#337、NPC 招募草案）
- **關係不是憑空跳數字，而是「共同記憶帳本（Shared Memory Ledger）」**：
  - 兩人只有在**空間上真實走近、面向彼此、雙方皆有空檔**時才會觸發互動（沿用 `#300 LIFE02` 與 `#337 SOCIAL01` 的 2s 發話 + 2s 回應氣泡機制，加 30 秒同對冷卻防刷）。
  - **記憶事件來源**：`共飲一壺靈茶`、`同桌吃午飯`、`精力見底時代挑一擔水（互助）`、`外功場點到為止切磋`、`後山巡獵並肩擊退野豬`、`受挫時溫柔鼓勵`。
- **兩條關係成長軌道（嚴格區分親情與道侶）**：
  1. **成年同門／訪客軌道**：`萍水相逢 (0) ➔ 同門相識 (1) ➔ 莫逆知己 (3，需共同經歷一次互助或並肩作戰) ➔ 結契道侶 / 成家 (5，雙向性格契合且皆成年)`。
  2. **師徒／長幼親情軌道（如 #337 道館收養的小女孩）**：`收養照料 ➔ 平日相伴 ➔ 親如家人（兄妹／師徒溫馨羈絆）`，永遠走純粹的家庭親情與守護路線。
- **「拉進一個家庭」的具體生活表現**：
  - **山下村民點化入門（#152 / `NPC_LIFE_RECRUITMENT_DRAFT`）**：住在山腳的堂親或訪客（如竹科休養工程師、村醫之女）平時會沿東南村路（`rt.village`）來訪求茶或看診；當相處記憶足夠且門派建好空床位時，可邀請他們正式加入門派大家庭（保留其原本世俗練就的醫術／工匠技能！）。
  - **結為道侶／同住一房**：兩位成年弟子結為道侶（或親人同住）後，可分配至擴建後的**雙人廂房**，夜晚回同一間房歇息，日常自由時段有更高機率結伴散步、同桌吃飯，在後山演武時若伴侶受襲會優先觸發「護衛伴侶」反應！

---

### 2.5 同圖武學系統與「塔防式」演武／後山打獵（A4 & A6）

這是將「門派養成」與「戰鬥爽感」無縫縫合的核心創新：**沒有獨立的戰鬥引擎，練樁、切磋、演武場塔防、後山打獵全部共用同一套同圖招式與站位系統。**

```mermaid
flowchart LR
    subgraph MartialData["同圖武學資料層 (A4)"]
        Art["武學套路 (Art)\n• 青松掌法 (扇形擊退)\n• 齊眉棍法 (橫掃群控)\n• 飛燕劍訣 (遠距直線)\n• 踏雪輕功 (閃避移速)"]
        Prof["熟練度內插 (Lv0 初學 → Lv5 大成)\n• 起手 Windup 縮短 (48t → 20t)\n• 招式範圍擴大 (28px → 42px)\n• 解鎖套路第 2、3 式連招"]
        Art --> Prof
    end

    subgraph SameMap["三大同圖應用場景 (共用幾何碰撞與動畫)"]
        Prof --> Drill["① 外功場練樁 & 同門切磋\n對木人樁累積熟練度；\n雙人切磋點到為止、驗收拆招"]
        Prof --> TDDrill["② 演武場塔防試陣 (無傷檢驗)\n擺放弟子陣位與方針，\n迎擊多波次木傀儡／闖陣師兄"]
        Prof --> Hunt["③ 後山隘口防衛 & 狩獵 (真生態)\n駐守望台／山道隘口或主動掃蕩，\n擊退鼠群、野豬、山狼，帶回獸肉"]
    end
```

#### (1) 同圖武學：招式資料化與肉眼可見的熟練度差距（#318 A4）
每門武學包含 2～3 式招式（Moves），每式定義明確的**三段時間軸（`windup 起手 → active 出招判定 → recover 收勢`）**與**幾何命中形狀（`shape`）**：

| 武學套路 | 招式範例 | 幾何判定形狀 (權威座標) | 初學 (Novice) 表現 | 練熟／大成 (Adept/Master) 表現 | 塔防／狩獵定位 |
|---|---|---|---|---|---|
| **《青松掌法》** | 第一式：推山掌<br>第二式：疊浪掌 | **扇形 (Cone)**<br>半徑 28→38，夾角 50°→75° | 起手慢（0.8s）、掌風短，一次只能拍退一隻近身野鼠 | 起手快（0.4s）、掌風帶青色氣浪，可同時震退扇形內 2–3 隻野獸並銜接第二式 | **近戰守點／護衛**：守在隘口正面擊退衝鋒野豬 |
| **《齊眉棍法》** | 第一式：橫掃千軍<br>第二式：立劈華山 | **圓弧／周身 (Circle/Arc)**<br>半徑 36→48，夾角 140° | 揮棍沉重、收勢破綻長 | 棍影連綿，大範圍橫掃減速並擊倒成群山鼠／木傀儡 | **群控清場（AOE Tower）**：放在轉角或雙路交匯處清理群怪 |
| **《流雲劍訣》** | 第一式：穿雲刺<br>第二式：劍氣縱橫 | **直線長距 (Line/Ray)**<br>長 55→85，寬 16 | 僅能刺擊前方單一目標 | 劍尖吐出尺許劍氣，隔空貫穿直線上的敵人 | **遠程狙擊／後排輸出**：站在望台或前排師兄身後安全輸出 |
| **《踏雪無痕》** | 身法：掠影步 | **位移／閃避 (Dash)** | 僅小幅提升平日走路速度 | 敵人撲擊前搖時自動側滑閃避，平日可直接跳過溪石捷徑 | **游擊／巡山斥候**：高速拉怪、支援漏網之魚 |

- **學會 ≠ 練熟**：師父在大廳傳授或讀藏經閣秘笈只是「學會（Lv0）」；必須在外功場打木人樁、與同門切磋、或實戰出招，才能把熟練度練上去，讓玩家在畫面上親眼看到弟子從「笨拙慢拍」變成「行雲流水」。

#### (2) 結合「塔防感」的武學演練與後山打獵（#320 A6 + `PATROL_DEFENSE_RESEARCH`）
為什麼傳統門派經營遊戲練完功常覺得空虛？因為缺少一個**「像塔防一樣直觀擺陣、看弟子用自己練出的武功守住路線」**的實地檢驗場！我們將它設計為兩種互補模式，且**完全建構在同一個地圖與活動核心上**：

1. **模式 A：演武場／山門「機關與闖陣演練」（可隨時開啟、無重傷損失的塔防沙盒）**
   - **怎麼玩**：當外功場或山門擴建完成後，玩家可點擊【開啟武學演練】，選擇演練劇本（例如：「第一關：百獸木傀儡陣」、「第二關：雙路夾擊試煉」、「第三關：鄰派師兄踢館切磋」）。
   - **塔防式佈陣（Deployment & Doctrines）**：
     - 地圖上標示出清楚的**來襲路線（Lanes）**與**陣位守點（Defense Slots，如：山門前坪、石橋頭、大廳階前）**。
     - 玩家把弟子拖放到守點上（就像塔防擺放英雄塔！），並為每位弟子設定簡單明瞭的**戰術方針**：
       - `【固守陣眼】`：寸步不離守點，敵人進入招式範圍才出手（適合棍法／劍訣弟子守隘口）。
       - `【迎擊攔截】`：主動上前一小段攔住衝鋒目標，打退後立即退回守點（適合掌法／高體魄大師兄當肉盾）。
       - `【游走護衛】`：緊跟在指定同門（如小師妹或後排弟子）身側，誰靠近就拍飛誰。
   - **即時觀看樂趣**：開陣後，玩家不用手忙腳亂點技能，而是喝著茶看弟子們各顯神通——「你看大師兄把《青松掌》練到大成後，起手快了一倍，野豬還沒撞上護欄就被一掌拍翻；二師姐在後面用《流雲劍訣》精準補刀！」

2. **模式 B：後山狩獵與獸潮防衛（真生態、產出獸肉與戰報）**
   - **平時狩獵（主動出擊）**：派遣 1～3 名弟子組成狩獵小隊，從東北山門（`fac.gate`）沿山徑前往後山望台（`fac.tower`）與獵場（`risk.backwood`）。弟子用學會的武學獵捕野豬、山雞、山鹿，成功後**親手扛著獸肉與毛皮走下山**送進膳房與倉庫！若精力低於返程安全線，小隊會自主掩護撤退。
   - **季節／突發獸潮（被動塔防）**：當後山棲地累積威脅或入冬覓食時，望台會提前預警「今日申時將有野豬群自北徑下山，意圖衝擊菜園與水缸」。玩家可提前敲響山門警鐘，讓弟子進入預設的守點陣位，加上自己修建的木籬護欄（`LP08`）、拒馬與望台，打一場真實的保衛戰！
   - **因果戰報（Battle Report）**：每次演練或狩獵結束，彈出結構化戰報——記錄守住幾波、誰在哪個守點使出哪一招擊退了哪隻野獸、誰因為初學起手太慢被撞退休養、一共帶回多少獸肉。玩家看完戰報，立刻知道「接下來該讓誰去外功場把第二式練熟、或者去膳房多煮一鍋肉湯補精力」。

---

## 三、 從破道館到門派大成：分階段開發路線圖（S0 ～ S6）

為了確保每一步都像先前的 `LP04–HOME02` 一樣**「每一包都能在瀏覽器直接看到、玩到，且不破壞既有手感」**，我們將整個重構與擴建拆解為 **7 個可獨立驗收的里程碑（S0–S6）**：

| 階段 | 里程碑名稱 | 玩家在畫面上玩到什麼 | 核心技術與系統交付 | 複用的 `dev` 資產與對應 Issue |
|---|---|---|---|---|
| **S0** | **新核心同感移植**<br>*(Parity Slice)* | 現有山居畫面、師徒兩人挑水／採藥／泡茶／砍柴修寢舍／練掌，手感與路長與舊版 100% 一致，但底層已換成 N 人資料與設施廣告核心 | 建立 `sect-chronicle/life/core/`：`SmartObject` 設施表、`ReservationBroker`、導航圖＋走廊尋路、4 層決策仲裁器；舊 `demo/` 凍結為對照組 | `art184-watercolor`、`home01`、`home02`、`SCENE-04` S0 底圖；[#314](https://github.com/lalagrass/earth-ascension/issues/314)、[#315](https://github.com/lalagrass/earth-ascension/issues/315)、[#316](https://github.com/lalagrass/earth-ascension/issues/316) |
| **S1** | **破道館開局與性格心印**<br>*(Ruined Dojo & Persona)* | 新開局只有漏雨大廳、荒草院落與師徒＋小女孩 3 人；創角／查看「八維性格＋道家心性稱號＋古風批命詩＋三問心印（預設自動勾選）」；動手除草、砍柴修好大廳屋頂與第一間雙人寢舍 | 實裝三層性格與三問心印系統（#106、#163）、門派時辰作息鐘（卯時早課～亥時就寢）、設施狀態機（`wild → ruin → repair → built`） | `SCENE-04` `S0-clean.jpg`、`home01/dojo_hall_s0.png`、`home02/dorm_*`；[#106](https://github.com/lalagrass/earth-ascension/issues/106)、[#163](https://github.com/lalagrass/earth-ascension/issues/163)、[#321](https://github.com/lalagrass/earth-ascension/issues/321) |
| **S2** | **人間煙火：菜園、膳房與藥園**<br>*(homestead & Upkeep)* | 開墾東南菜園與藥園、修復西院膳房大陶灶與餐敘棚；看到弟子「挑水灌溉 → 種菜收成 → 膳房生火煮飯 → 午時圍桌共食」與「採藥 → 晾藥 → 煎靈茶」的完整生活循環 | 新增「飽足（Hunger）」需求與「農藝、庖廚、藥理」技能成長；實裝餐敘棚多人同桌共食與席間閒聊 | `SCENE-04` `S1-clean.jpg`、`lp16` 藥圃、`home01/tea_stove.png`；[#160](https://github.com/lalagrass/earth-ascension/issues/160)、[#317](https://github.com/lalagrass/earth-ascension/issues/317) |
| **S3** | **同圖武學：外功場、傳功與切磋**<br>*(Same-Map Martial Arts)* | 擴建大廳前東側「外功演練場」（木人樁＋兵器架）；師父在大廳傳授《青松掌法》第二式與《齊眉棍法》；弟子打樁練熟、同門在院中點到為止切磋，肉眼看出起手變快、掌風變大、輕功跳過溪石 | 武學與招式資料化（`arts.mjs`：扇形／圓弧／直線幾何碰撞、熟練度參數內插）、地圖招式特效層（掌風、棍影）、輕功地形捷徑 | `palm.mjs`、`train01.mjs`、`template/actions.json`；[#305](https://github.com/lalagrass/earth-ascension/issues/305)、[#318](https://github.com/lalagrass/earth-ascension/issues/318) |
| **S4** | **同門情誼、村民點化與成家**<br>*(Sims Social & Household)* | 山腳村民（堂親、工程師、村醫之女）沿村路來訪喝茶求診；收工後弟子依性格聊天、互助代勞；累積真實記憶事件後，點化村民拜師入門，成年知己結為道侶搬入雙人廂房，形成門派大家庭 | 因果關係記憶帳本（`SocialLedger`）、兩條關係軌道（親情守護 vs 成年道侶）、村民自主追求與點化入門儀式、雙人房床位同住分配 | `#337 SOCIAL01`、[#188](https://github.com/lalagrass/earth-ascension/issues/188)、[#319](https://github.com/lalagrass/earth-ascension/issues/319)、`NPC_LIFE_RECRUITMENT_DRAFT` |
| **S5** | **塔防演武與後山狩獵**<br>*(TD Martial Drill & Hunt)* | 建起東北山門與後山望台；在演武場擺放弟子守點與方針，迎擊機關傀儡波次檢驗武學；派狩獵隊上後山打獵扛回獸肉加菜，並在獸潮來襲時擺陣守衛山門，結算詳細因果戰報 | 守點陣位（`DefenseSlot`）與三種應戰方針（固守／迎擊／護衛）、演武波次腳本器、後山生態棲地與獸肉掉落搬運、結構化戰報 UI | `patrol.mjs`、`SCENE-04` `S2-clean.jpg` 望台與山門；[#219](https://github.com/lalagrass/earth-ascension/issues/219)、[#290](https://github.com/lalagrass/earth-ascension/issues/290)、[#320](https://github.com/lalagrass/earth-ascension/issues/320) |
| **S6** | **宗門氣象與傳承存檔**<br>*(Sect Mastery & Persistence)* | 6–10 名各具性格與專長的弟子在完整 S2 山門中井然有序地生活、授業、成家、守山；大師兄能代師父指點新入門師弟；支援完整新核心版本化存讀檔與回放 | 資深弟子代授課機制、新核心 `save v1` 序列化與 deterministic replay 驗證、窄螢幕／手機版面適配 | `life-save.mjs`、`SCENE-04` 全圖 23 設施完成態 |

---

## 四、 關鍵資料結構規格預覽（Data Contracts Preview）

為了讓後續每個階段都能乾淨實作，新核心統一採用純 JSON 可序列化的資料結構：

```javascript
// 1. 弟子實體結構 (Disciple Entity)
const discipleExample = {
  id: 'disc.hero',
  name: '沈清源',
  role: 'senior',          // 'master' | 'senior' | 'disciple' | 'adopted_kin' | 'visiting_npc'
  ageGroup: 'adult',       // 'adult' | 'youth' (決定關係軌道：youth 僅限親情/同門守護)
  persona: {
    base: { open: 0.75, conscientious: 0.80, extravert: 0.45, agreeable: 0.70, stable: 0.65, explore: 0.80, safe: 0.50, care: 0.75 },
    current: { /* 隨重大記憶微調，受滑動上限保護 */ },
    changes: [{ tick: 14400, eventId: 'evt.boar_repel_1', delta: { stable: +0.03, explore: +0.02 } }],
    archetype: 'INTP',
    daoTitle: '玄同澄照',
    natalPoem: ['松風入硯洗凡塵', '靜觀泉脈悟天真'],
    heartSeal: {
      code: 0b110,         // ☴ 巽為風【閒雲野鶴】（預設由 current 性格自動推導預選，玩家可隨時改）
      overriddenByPlayer: false
    }
  },
  needs: {
    energy: { current: 78, max: 100, restAt: 30, backAt: 80 },
    satiety: { current: 85, max: 100, hungryAt: 25 } // S2 膳房完工後啟用
  },
  skills: {
    legStrength: { level: 3, exp: 4, nextExp: 6 },
    physique: { level: 2, exp: 1, nextExp: 4 },
    qinggong: { level: 1, exp: 0, nextExp: 3 },
    herbalism: { level: 2, exp: 3, nextExp: 4 },
    farming: { level: 1, exp: 0, nextExp: 2 },
    cooking: { level: 1, exp: 0, nextExp: 2 },
    construction: { level: 2, exp: 2, nextExp: 4 }
  },
  martial: {
    equippedArt: 'art.pine_palm',
    arts: {
      'art.pine_palm': {
        level: 3,          // 0=初學, 3=熟練, 5=大成
        moves: {
          'move.push_mountain': { proficiency: 0.85 },
          'move.wave_palm': { proficiency: 0.30 }
        }
      }
    },
    defenseDoctrine: 'intercept' // 'hold' 固守 | 'intercept' 迎擊 | 'protect' 護衛
  },
  housing: {
    roomId: 'fac.dorm.a',
    bedId: 'bed-1',
    householdId: 'house.founders'
  },
  decision: {
    tier: 3,               // 1=玩家指令, 2=必要自理, 3=門派作息, 4=心印自主偏好
    currentActivity: { facilityId: 'fac.yard', activityId: 'drillMove', stationId: 'post1', phase: 'active', progressTicks: 240 },
    pendingIntent: null,
    explain: {
      doing: '在外功場演練《青松掌・推山掌》',
      reason: '未時門派武課（心印【積極進取】偏好）',
      nextPlan: '酉時去茶爐泡藥茶，與阿秀閒聊'
    }
  }
};
```

---

## 五、 建議立刻可拍板的決策點（供擁有人確認）

這份藍圖已將你的想法與專案過去累積的最佳設計（`SCENE-04` 三階段母版、`#106/#163` 性格心印、`#314–#321` A1–A7 提案、`#337` 溫馨親情與 `#330` 砍柴修屋）完全對齊。若準備啟動下一階段，只需確認三個輕量取捨：

1. **新核心起點（S0）**：是否同意在 `sect-chronicle/life/core/` 另起資料驅動核心，先用現有 `SCENE-04` S0 破道館水彩圖把「挑水、採藥、泡茶、砍柴修屋、練掌」做到同感移植，再開始疊加 S1 性格心印與 S2 菜園膳房？（不影響目前正在進行的 `#337 SOCIAL01` 收尾）。
2. **一日時長與門派作息表**：建議 `1×` 速度下 **1 遊戲日 ＝ 6 分鐘真實時間**（每時辰 30 秒，支援 1×／2×／4×／暫停），剛好能讓弟子在一天內跑完「早課 → 挑水／種菜長通勤 → 午膳聊天 → 下午練樁／巡山 → 傍晚自由泡茶 → 夜間回床睡覺」的完整模擬市民節奏。
3. **塔防演武的操作粒度**：確認採用**「玩家戰前擺放陣位（守點）＋設定三種戰術方針（固守／迎擊／護衛），開打後弟子依自身武學熟練度與性格自主出招」**，讓玩家專注於養成與佈陣的成就感，而不必像動作遊戲一樣手動按技能鍵。
