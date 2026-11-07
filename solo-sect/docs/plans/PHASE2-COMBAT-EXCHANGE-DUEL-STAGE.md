# Phase 2 設計與實作交接規格書：硬核武俠接招拆招 × 微距交鋒特寫（Combat Exchange & Duel Micro-Stage）

> **目標分支**：`codex/solo-sect-grok`（`solo-sect/` 目錄）  
> **前置基礎**：`RULES_VERSION 4.0`（Round 7–11 接觸物理 `contact.mjs`、接法時鐘 `arts.mjs`、圍攻負載 `tactics.mjs`）＋ Phase 1 微距武道與生活實況窗（Commit `59af2e06`）  
> **核心定位**：不破壞既有決定性模擬（Zero Simulation Contamination），將玩家期望的**「菜雞互啄、高手對峙一擊破綻、原地擺頭避刃＋瞬發反掌、多敵鎖角圍攻降級、心性煩躁腦羞硬拼、林克時間與絕學異象」**完整映射為純函式交鋒遙測（`duelExchangeFrame`）與微距舞台（`#micro-stage`）雙人／多敵動態特寫演出。

---

## 一、 設計目標與玩家體驗（5 大核心武俠交鋒場景）

在 Phase 1 完成單人日常（挑水扁擔彎曲、砍柴卡斧、羅漢十八手 22 式套路與宗師淡墨重影）後，Phase 2 聚焦於**「一旦交手，微距視窗即刻化身武俠電影過招特寫鏡頭」**：

1. **場景 A：菜雞互啄（Rookie Mutual Pecking — `exchangeMode: 'rookiePecking'`）**
   * **觸發條件**：交手雙方武學層級與手熟皆低（雙方反應時間 `reaction >= 0.38s`、主修品階 `tier <= 1`，或當次接觸力道未能貫穿護體／格擋 `depth <= 0`）。
   * **微距演繹**：雙方頻繁揮砍格擋、架勢搖晃但氣血幾乎不減；刀劍／拳腳交擊處迸發**火星四濺（`clashSparks: true`）**，受方與攻方皆產生 `3px` 高頻微震（`microShiverPx: 3`），頭頂顯示「噹！兵刃交擊・毫髮無傷」，胸口劇烈起伏喘氣。
2. **場景 B：高手對峙與一擊必殺破綻（Master Standoff & One-Shot Flaw Strike — `exchangeMode: 'masterStandoff' | 'flawStrike'`）**
   * **觸發條件**：高造詣或高眼力對決（`agility >= 22` 或 `topTier >= 2`）。未出手或試探階段為 `'masterStandoff'`（沉肩斂息、眼神鎖定虛線）；當對手處於前搖末段／收招空檔（`flawWindow.open === true`）或己方觸發看破截擊（`d.sure` / `d.ring?.intercept` / 獨孤九劍破綻）時切換為 `'flawStrike'`。
   * **微距演繹**：對峙時繪製雙人目光鎖定線與氣場微瀾；一旦破綻窗口開啟，對手身上標出**紅芒破綻準星（`flawWindow.part`: `'eye' | 'hand' | 'body'`）**，主角化作一道冷冽殘影直刺破綻，觸發特寫字印「⚡ 看破破綻・一擊必殺！」。
3. **場景 C：極小代價「原地擺頭避刃」＋瞬發反擊掌（Minimal-Cost Head-Slip + Instant Counter-Palm — `dodgeTier: 'headSlip'`, `instantCounterPalm: true`）**
   * **觸發條件**：單挑或低圍攻負載（`loadL < 0.5`），且己方反應加移步佔敵前搖比例極低（`usedRatio = (reaction + step) / wind < 0.4` 或 `agility >= 25` 熟手）。若同時滿足反擊時間充裕（`reaction + strike < wind` 或 `view.canCounter === true`），觸發 `instantCounterPalm: true`。
   * **微距演繹**：主角**雙腳釘地不動（`footShiftPx: 0`）**，僅頸部與上身微側 `15°`（`headTiltDeg: 15`），敵方刀鋒／爪影貼著髮際掠過（繪製貼臉殘刃弧線）；若 `instantCounterPalm === true`，主角前手在零前搖下瞬發吐掌，掌心炸開金白氣勁波紋（反擊震退特效），字印顯示「原地擺頭・隨手一掌震飛！」。
4. **場景 D：多敵空間鎖角圍攻與閃避降級、心性崩潰（Multi-Attacker Angle Locking & Composure Fret Rage — `dodgeTier: 'scramble'`, `isRaging: true`）**
   * **觸發條件**：讀取 `assessLoad(s, d)` 與圍攻敵人數 `angleLockCount`。
     * `1` 敵（`loadL < 0.4`）：從容 `'headSlip'`（可反擊）。
     * `2` 敵交錯（`0.4 <= loadL < 0.8`）：側步 `'sideStep'`（消耗中，放棄反擊專注閃避）。
     * `3+` 敵同時或接續鎖角（`loadL >= 0.8` 或 `angleLockCount >= 3`）：強制降級為狼狽大閃避 `'scramble'`（大幅後躍 `footShiftPx: -18`、不可反擊 `instantCounterPalm: false`），且隨連續閃避／格擋累積 `d.fret / composure(d)`。當 `d.raging` 或 `fretRatio >= 1.0` 時觸發**惱羞硬拼（`isRaging: true`）**。
   * **微距演繹**：微距畫布四周繪製多道**紅芒鎖角威脅扇形（Threat Arcs，標示 `angleLockCount` 路夾擊）**；主角滿頭大汗連續後躍；一旦 `isRaging: true`，主角雙目泛紅、周身爆開暗紅怒氣火光，放棄閃避強行換血，字印顯示「💢 久守心浮・惱羞硬拼！」。
5. **場景 E：自動林克時間與名功絕學異象（Witch Time & Signature Art Flair — `witchSlowMo`, `zjEffect`）**
   * **觸發條件**：
     * `witchSlowMo`：`Boolean(s?.witch && (Array.isArray(s.witch) ? s.witch.length > 0 : true))` 或 `view.witch === true`。
     * `zjEffect`：偵測主角或當前招式具備之絕學特徵：
       * `'jiuyang'` / `'rebound'`：九陽神功／渾厚內力護體反震（`reboundShock === true`，即護體真氣震飛對手，`s.fx` 含 `'震'` 或 `view.rebound === true` 或修習 `jiuyang` 內功達標）。
       * `'taiji'`：太極劍／太極拳借力打力圓弧卸勁（修習 `taiji` / `taijiSword` 或 `s.fx` 含太極卸力）。
       * `'kuihua'`：葵花寶典／辟邪劍法鬼魅殘影（修習 `kuihua` / `bixie` 或高速刺擊出現 3 道品紅殘影）。
       * `'dugu'`：獨孤九劍無招破有招（修習 `dugu` 且直指敵方破綻連線）。

---

## 二、 架構原則與檔案邊界

> [!IMPORTANT]
> **零模擬污染鐵律（Zero Simulation Contamination）**  
> 1. 所有新增之交鋒遙測函式（`duelExchangeFrame` 與擴充後的 `ergonomicFrame`）必須是**純讀取函式（Read-Only Pure Projection）**，嚴禁呼叫 `s.rng()` 或改寫 `d` / `s` 內的任何模擬屬性。  
> 2. 既有 346 項 `quick` 測試、`smoke` 測試與 `docs-links.test.mjs` 必須 100% 通過。  
> 3. **不新增額外 `.mjs` 檔案**（將交鋒遙測直接實作並匯出於 `solo-sect/src/growth-playback.mjs`，視覺渲染實作於 `solo-sect/src/pose-render.mjs` 與 `solo-sect/src/paper-doll.mjs`，自動導播實作於 `solo-sect/src/main.mjs`），確保 `docs/architecture/MODULES.md` 的 19 模組契約完全不變。

### 修改與新增檔案清單
1. `solo-sect/src/growth-playback.mjs`（修改：新增並匯出 `duelExchangeFrame(d, s, view)`，並掛載於 `ergonomicFrame(...).combatDetail` 與頂層 `duel` 欄位）
2. `solo-sect/src/paper-doll.mjs`（修改：支援 `headSlip` 15° 偏頭不移腳、`instantCounterPalm` 瞬發反掌手勢、`isRaging` 怒目紅光、`clashSparks` 格擋架勢）
3. `solo-sect/src/pose-render.mjs`（修改：在 `renderMicroStage` 繪製 5 大交鋒場景特效、四維戰鬥儀表板「架勢／護體真氣／心性定力／破綻窗」、多敵鎖角威脅弧、反震金鐘氣罩、太極卸力圓、葵花殘影與獨孤破綻線）
4. `solo-sect/src/main.mjs`（修改：`drawMicroStage` 支援「🎬 自動導播・交鋒特寫」——當玩家未手動鎖定特定弟子或正處於交鋒時，自動聚焦正在出招／接招／林克時間的弟子，並更新 `#micro-caption` 戰況摘要）
5. `solo-sect/test/unit/growth/phase2-combat-exchange.test.mjs`（新增：驗證 5 大交鋒場景、四維遙測、Canvas 繪圖指令、自動導播選擇與零模擬污染）
6. `solo-sect/docs/README.md`（修改：索引本規格書）

---

## 三、 詳細規格設計

### 3.1 `solo-sect/src/growth-playback.mjs`：新增 `duelExchangeFrame(d, s = {}, view = {})`

在 `growth-playback.mjs` 中匯入所需之純讀取輔助（例如從 `./arts.mjs` 匯入 `composure`, `assessLoad`, `clashTimes`, `postureOf`, `postureMax`, `qiPow`, `topTier`，從 `./practice.mjs` 匯入 `familiarReaction`, `familiarUses`），並定義並匯出 `duelExchangeFrame(d, s = {}, view = {})`：

```js
export function duelExchangeFrame(d, s = {}, view = {})
```

#### 回傳結構契約（Return Schema）
`duelExchangeFrame(d, s, view)` 必須回傳包含以下欄位的純物件（且 `ergonomicFrame(d, s, view)` 的 `combatDetail` 必須合併此物件的所有欄位，同時在 `ergonomicFrame` 回傳值提供 `duel` 別名指向同一份資料）：

1. **基本對手與圍攻負載（Opponent & Spatial Angle Lock）**
   * `opponent`: 對手物件（優先取 `view.opponent`，否則從 `opponents(s, d)` 取最近或正在交手的敵人，若無則為 `null`）。
   * `allOpponents`: 當前圍攻 `d` 的所有敵人陣列（`view.opponents || (s && d ? opponents(s, d) : (opponent ? [opponent] : []))`）。
   * `angleLockCount`: 圍攻鎖角人數（`view.angleLockCount ?? allOpponents.length`）。
   * `loadL`: 圍攻負載值 `0 ~ 1.5`（優先取 `view.L`，否則若有 `s?.ds` 則呼叫 `assessLoad(s, d).L`，否則 `Math.min(1.2, angleLockCount * 0.35)`）。

2. **閃避代價與原地擺頭反擊（Dodge Cost & Head-Slip Counter）**
   * `usedRatio`: 反應加移步佔來招前搖比（優先取 `view.usedRatio`；若有 `opponent`，以 `familiarReaction(d, opponent, opponent?.swing?.mv || 'bodyPunch', s?.codex || {}) / (opponent?.swing?.wind || 0.45)` 計算；預設 `0.5`）。
   * `dodgeTier`: `'headSlip' | 'sideStep' | 'scramble'`
     * 若 `view.dodgeTier` 有指定且 `loadL < 0.8` 則用 `view.dodgeTier`；
     * 若 `loadL >= 0.8` 或 `angleLockCount >= 3`，強制降級為 `'scramble'`（多敵鎖角迫使狼狽大閃避）；
     * 若 `loadL >= 0.4` 或 `angleLockCount === 2`，降級為 `'sideStep'`；
     * 若 `loadL < 0.4` 且（`usedRatio < 0.4` 或 `(d?.skills?.agility || 0) >= 25`），則為 `'headSlip'`；否則為 `'sideStep'`。
   * `headTiltDeg`: 當 `dodgeTier === 'headSlip'` 時為 `15`，`'sideStep'` 為 `6`，`'scramble'` 為 `-12`。
   * `footShiftPx`: 當 `dodgeTier === 'headSlip'` 時為 `0`（**雙腳原地不動**），`'sideStep'` 為 `-8`，`'scramble'` 為 `-18`。
   * `instantCounterPalm`: 布林值。當 `dodgeTier === 'headSlip'` 且 `!isRaging` 且 `loadL < 0.5` 且（`view.canCounter === true` 或 `usedRatio < 0.35` 或 `((d?.skills?.agility || 0) >= 28 && opponent)`）時為 `true`，其餘為 `false`。

3. **四維武道遙測（Four-Dimensional Combat Telemetry）**
   * `postureRatio`: `0 ~ 1`，主角當前架勢穩定度（`postureMax(d) > 0 ? Math.max(0, Math.min(1, postureOf(d) / postureMax(d))) : 1`；可由 `view.postureRatio` 覆寫）。
   * `oppPostureRatio`: `0 ~ 1`，對手架勢穩定度（`opponent ? (postureMax(opponent) > 0 ? Math.max(0, Math.min(1, postureOf(opponent) / postureMax(opponent))) : 1) : 1`）。
   * `qiRatio`: `0 ~ 1`，內力／真氣充盈比（`view.qiRatio ?? Math.min(1, (d?.neigong?.level || 0) / 10 + (qiPow(d) > 1 ? (qiPow(d) - 1) * 0.5 : 0))`）。
   * `reboundShock`: 布林值，是否觸發護體真氣反震（當 `view.rebound === true` 或 `(view.guard && view.force && view.guard > view.force * 1.4)` 或 `(d?.arts?.jiuyang && (view.blocked || view.shallow))` 時為 `true`）。
   * `composureMax`: 定力上限 `composure(d)`（約 `1.4 ~ 3.2`）。
   * `fretRatio`: `0 ~ 1`，心性煩躁比例 `Math.max(0, Math.min(1, (view.fret ?? d?.fret ?? 0) / composureMax))`。
   * `isRaging`: 布林值，是否腦羞硬拼（`Boolean(view.isRaging || d?.raging || (d?.rageUntil && s?.t != null && d.rageUntil > s.t) || fretRatio >= 1)`）。當 `isRaging === true` 時，`instantCounterPalm` 強制為 `false`。
   * `flawWindow`: 物件 `{ open: boolean, part: 'eye' | 'hand' | 'body' | null, progress: number }`
     * 當 `view.flawWindow` 提供時直接使用；
     * 否則當 `Boolean(d?.sure || d?.ring?.intercept || view.flawOpen)`，或對手正在收招／前搖末段（`opponent?.swing && opponent.swing.wind > 0 && (opponent.swing.t / opponent.swing.wind) >= 0.7`）且主角眼力／品階足夠（`(d?.skills?.agility || 0) >= 20 || topTier(d).t >= 2 || d?.dugu?.length > 0`）時，`open = true`，`part` 依序取 `view.flawPart || (d?.dugu?.length ? 'hand' : 'eye')`。

4. **五大交鋒模式與絕學異象分類（Exchange Mode & Signature Flair）**
   * `clashSparks`: 布林值，當發生淺層碰撞或格擋（`microShiverPx > 0` 或 `view.blocked`）時為 `true`。
   * `exchangeMode`: `'idle' | 'rookiePecking' | 'masterStandoff' | 'flawStrike' | 'headSlipCounter' | 'scrambleDefense' | 'rageAllOut'`
     * 無 `opponent` 且無 `view.exchangeMode` 時為 `'idle'`；
     * 若 `isRaging` 為 `true` ➔ `'rageAllOut'`；
     * 若 `dodgeTier === 'scramble'` ➔ `'scrambleDefense'`；
     * 若 `flawWindow.open` 為 `true` ➔ `'flawStrike'`；
     * 若 `instantCounterPalm` 為 `true` ➔ `'headSlipCounter'`；
     * 若主角或對手屬於高階對決（`topTier(d).t >= 2 || (d?.skills?.agility || 0) >= 22`）➔ `'masterStandoff'`；
     * 其餘有對手交鋒情形（初階弟子互砍、格擋微震、力道未破防）➔ `'rookiePecking'`。
   * `witchSlowMo`: 布林值，`Boolean(view.witch || (s?.witch && (Array.isArray(s.witch) ? s.witch.length > 0 : true)))`。
   * `zjEffect`: `'none' | 'dugu' | 'taiji' | 'jiuyang' | 'kuihua'`
     * 優先讀 `view.zjEffect`；
     * 若 `d?.dugu?.length > 0 || d?.arts?.dugu` ➔ `'dugu'`；
     * 若 `d?.arts?.kuihua || d?.arts?.bixie || s?.hs?.bixie === 3` ➔ `'kuihua'`；
     * 若 `d?.arts?.taiji || d?.arts?.taijiSword` ➔ `'taiji'`；
     * 若 `d?.arts?.jiuyang || reboundShock` ➔ `'jiuyang'`；
     * 否則 `'none'`。

---

### 3.2 `solo-sect/src/paper-doll.mjs`：肢體微距姿態擴充

在 `drawPaperDoll(g, d, view)` 中讀取 `view.ergo?.combatDetail`（或 `duel`）：
1. **原地擺頭避刃（`dodgeTier === 'headSlip'` 且有 `opponent`）**：
   * 雙腿與腳掌保持沉穩基準位（不後退），頭部與上胸旋轉／偏移 `headTiltDeg`（例如頭部 X 座標微偏 `-4px`、旋轉 `-0.22 rad`），展現「只擺個頭就閃過致命攻擊」的宗師從容感。
2. **瞬發反擊掌（`instantCounterPalm === true`）**：
   * 前手臂向前平推伸直，掌心處繪製一道金白雙層氣勁波紋（`g.arc` 半透明氣環），呈現「閃身同時隨手一掌打暈敵人」。
3. **腦羞硬拼（`isRaging === true`）**：
   * 角色頭部繪製赤紅怒目／額頭青筋標記，軀幹前傾 `lean + 4`，周身籠罩一層暗紅氣焰外框（`#c0392b55`）。

---

### 3.3 `solo-sect/src/pose-render.mjs`：`renderMicroStage` 五大交鋒特寫與四維儀表

在 `renderMicroStage(g, s, focalActor, opts = {})` 中整合 `duel = ergo.combatDetail`：

1. **雙人與多敵站位調整**：
   * 當 `dodgeTier === 'headSlip'` 時，`focalActorX` **不額外大幅位移**（維持基準 `110`，體現雙腳釘地、僅擺頭閃避）；
   * 當 `dodgeTier === 'sideStep'` 時，`focalActorX` 依時間微幅側移；
   * 當 `dodgeTier === 'scramble'` 時，`focalActorX` 後撤至 `92`，並伴隨急促喘息與汗珠。
2. **五大交鋒場景 Canvas 視覺特效**：
   * **菜雞互啄（`exchangeMode === 'rookiePecking'` 或 `clashSparks === true`）**：
     * 在雙人中間（`x = 180, y = groundY - 75`）繪製 4～6 道金橘色交擊火花線段（`#f39c12` / `#ffe27a`），並標註浮字 `'噹！兵刃交擊・毫髮無傷'`。
   * **高手對峙與一擊破綻（`exchangeMode === 'masterStandoff'` / `'flawStrike'`）**：
     * `'masterStandoff'`：在雙人眼部之間繪製淡青色虛線「眼神鎖定線」，地面飄起 2～3 片竹葉。
     * `'flawStrike'`（或 `flawWindow.open === true`）：在對手對應部位（`eye`: `y = groundY - 95`、`hand`: `y = groundY - 68`、`body`: `y = groundY - 75`）繪製紅色破綻準星圓環與十字線，並從主角手部／劍尖拉出一道冷冽銀白破綻穿刺線直貫準星，標註 `'⚡ 看破破綻・一擊必殺！'`。
   * **原地擺頭＋瞬發反掌（`dodgeTier === 'headSlip'` & `instantCounterPalm === true`）**：
     * 除保留「原地擺頭避刃！」殘刃掠髮線外，自主角掌心向對手胸口繪製金色掌風衝擊弧（`#f1c40f`）與擊退波紋，標註 `'✋ 隨手一掌反震！'`。
   * **多敵空間鎖角威脅弧（`angleLockCount >= 2` 或 `loadL >= 0.4`）**：
     * 在微距視窗右上、正右、右下邊緣繪製 `Math.min(4, angleLockCount)` 道紅色鎖角威脅扇形／箭頭指向主角，並於右上角顯示徽章 `'⚠ 眾敵鎖角 ×' + angleLockCount`。
   * **心性崩潰腦羞硬拼（`isRaging === true`）**：
     * 主角周身繪製暗紅怒氣光環，頂部副標或浮字顯示 `'💢 久守心浮・惱羞硬拼！'`。
   * **名功絕學異象（`zjEffect !== 'none'` 或 `reboundShock === true`）**：
     * `'jiuyang'` / `reboundShock`：主角周身繪製渾厚金鐘氣罩（金色半透明橢圓護罩 `#f2c23a`），受擊處炸開反震波紋，標註 `'🔔 九陽護體・反震敵手'`。
     * `'taiji'`：主角身前繪製黑白／淡青雙魚圓弧卸力軌跡，標註 `'☯ 四兩撥千斤'`。
     * `'kuihua'`：在主角與對手之間繪製 3 道品紅高速殘影圓點／掠影（`#d04070`），標註 `'🪡 來去無蹤'`。
     * `'dugu'`：繪製九劍淡藍無招劍氣縱橫線（`#cfe0f5`），標註 `'🗡 無招勝有招'`。
3. **底部戰鬥雙軌儀表（架勢平衡儀 ＋ 定力／護體真氣條）**：
   * 保留原有 `y = 194` 的「重心平衡儀」；
   * 當處於交鋒狀態（`opponent != null` 或 `isRaging` 或 `reboundShock`）時，在 `y = 180` 增繪一條緊湊的**「定力／真氣護體微距條」**（顯示 `定力` 與 `煩躁度 fretRatio`，或 `真氣護體`），讓玩家一眼看懂「為何高手被 4 人圍攻會從原地擺頭變成狼狽大閃、最後心浮氣躁硬拼掉血」。

---

### 3.4 `solo-sect/src/main.mjs`：自動導播聚焦（Auto-Director Combat Spotlight）

新增純輔助函式 `selectMicroStageFocal(S, preferredId = null)`（可匯出供單測驗證）：
* 當場上有弟子正在激烈交鋒——即 `!d.away` 且滿足 `Boolean(d.swing || d.bswing || d.raging || (d.ring && S.t - d.ring.t < 1.5))`——且玩家並未剛才手動釘選正在練功的特定弟子時（或當 `preferredId` 該名弟子不在交鋒而另有弟子正在交鋒時，若 `!window.__microPinned`），自動回傳 `{ actor: combatDisciple, autoDirected: true }`；否則回傳 `{ actor: preferredDisciple, autoDirected: false }`。
* 在 `drawMicroStage()` 中使用此選擇器，當 `autoDirected === true` 或主角正在交戰時，`#micro-caption` 自動顯示交鋒模式摘要（如 `🎬 交鋒特寫【主角 vs 山賊】原地擺頭避刃・隨手一掌反震`）。

---

## 四、 驗收與自動化測試要求（Verification Plan）

實作完成後必須新增 `solo-sect/test/unit/growth/phase2-combat-exchange.test.mjs`，涵蓋以下斷言：

1. **場景 A（菜雞互啄）**：初階弟子對戰且淺層碰撞／格擋時，`duelExchangeFrame` 回傳 `exchangeMode: 'rookiePecking'`、`clashSparks: true`、`microShiverPx === 3.0`。
2. **場景 B（高手對峙與看破破綻一擊必殺）**：高身法／高階武學弟子面對處於前搖末段（或 `d.sure = true` / 獨孤九劍）的對手時，`flawWindow.open === true`、`exchangeMode === 'flawStrike'`，且指定破綻部位（`'eye' | 'hand' | 'body'`）。
3. **場景 C（原地擺頭避刃＋瞬發反掌）**：單挑（`loadL < 0.4`）且高眼力／低 `usedRatio` 時，`dodgeTier === 'headSlip'`、`footShiftPx === 0`、`headTiltDeg === 15`、`instantCounterPalm === true`、`exchangeMode === 'headSlipCounter'`。
4. **場景 D（多敵鎖角圍攻降級與腦羞硬拼）**：
   * 1 敵 ➔ `'headSlip'`；2 敵（`L = 0.55`）➔ `'sideStep'`；3～4 敵鎖角（`L >= 0.85` 或 `angleLockCount = 4`）➔ `'scramble'`、`footShiftPx < 0`、`instantCounterPalm === false`、`exchangeMode === 'scrambleDefense'`。
   * 當 `d.fret >= composure(d)` 或 `d.raging = true` 時，`isRaging === true`、`exchangeMode === 'rageAllOut'`、`instantCounterPalm === false`。
5. **場景 E（林克時間與四大絕學異象）**：驗證 `s.witch` 觸發 `witchSlowMo === true`，以及 `jiuyang`（含 `reboundShock`）、`taiji`、`kuihua`、`dugu` 對應之 `zjEffect` 與 `renderMicroStage` Canvas 繪製指令不拋錯。
6. **零模擬污染（Zero Simulation Contamination）**：呼叫 `duelExchangeFrame`、`ergonomicFrame` 與 `renderMicroStage` 前後，`JSON.stringify(state)` 與 `state.rng` 完全不變。
7. **全套既有測試通過**：
   * `node --test solo-sect/test/unit/growth/phase1-micro-stage.test.mjs solo-sect/test/unit/growth/phase2-combat-exchange.test.mjs solo-sect/test/unit/interface/docs-links.test.mjs`
   * `bash solo-sect/test/run.sh smoke`
   * `bash solo-sect/test/run.sh quick`
   * `git diff --check`
