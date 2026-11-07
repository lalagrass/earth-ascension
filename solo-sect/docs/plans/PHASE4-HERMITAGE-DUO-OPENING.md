# Phase 4（M5.1）設計與實作交接規格書：荒山雙人隱居開局 × 全真純陽拳／小龍女入門武學與漸進面板（Hermitage Duo Opening & Starter Martial Lineage）

> **目標分支**：`codex/solo-sect-grok`（`solo-sect/` 目錄）  
> **所屬總綱**：[`HERMITAGE-QUANZHEN-GUMU-ROADMAP.md`](HERMITAGE-QUANZHEN-GUMU-ROADMAP.md)  
> **核心定位**：將開局體驗收斂為**「荒山雙人隱居（Hermitage Duo Mode）」**——門派經營推遲，初期山上只有主角（苦練全真入門《純陽拳》或少林《羅漢拳》）與一位帶著入門武功的伴侶（**小龍女**或**黃蓉**），兩人日出而作（挑水、砍柴、採藥、煮飯）、日落而練，伴侶隨著共同修煉逐步領悟其經典武學。

---

## 一、 設計目標與玩家體驗

1. **雙人荒山隱居開局（Deferred Sect Founding — `s.hermitage`）**
   * 當玩家以「荒山雙人隱居」模式開局（`heroSpec.hermitage: true` 或開局選擇「終南隱居・雙人開局」）：
     * 山上僅生成 **2 名角色**：`hero`（主角）＋ `partner`（伴侶：**小龍女 `xiaolongnv`** 預設，或 **黃蓉 `huangrong`**）。不生成額外的初始雜役／同鄉弟子（`origin-1`, `origin-2`）。
     * **門派制度暫緩（`s.hermitage.active === true`）**：
       * 暫不觸發門派月俸與建築失修結算（`billDue(s)` 在 `s.hermitage?.active` 期間回傳 `false`，兩人相依為命不領香火月俸）。
       * 介面自動收折尚未用到的門派大面板（如收徒考核、外門排班、下山義學、門規違心），聚焦於**「荒山茅廬生活、微距實況窗、雙人武學領悟、後山探索」**。
2. **全真派武學樹擴充與《純陽拳》微距套路（Quanzhen Martial Tree & Routine）**
   * 在 [`data.mjs`](../../src/data.mjs) 新增全真派系入門至高階武學（與既有古墓派武學樹形成終南雙脈對映）：
     * `chunyangFist`（**純陽拳**：凡品一階拳法，`mode: 'base'`, `attr: 'yang'`, 招式：`cy1 守一架`, `cy2 純陽衝拳`, `cy3 三花聚頂勢`）
     * `quanzhenXinfa`（**玄門心法**：良品二階內功，`school: 'inner'`, `attr: 'yang'`, 由外而內自《純陽拳》小成頓悟）
     * `jinyanStep`（**金雁功**：良品二階身法，`school: 'step'`, `attr: 'yang'`, 由《玄門心法》催動頓悟，輕功躍崖核心）
     * `haotianPalm`（**昊天掌**：良品二階掌法，`school: 'palm'`, `attr: 'yang'`, 前置：`chunyangFist` 小成）
     * `quanzhenSword`（**全真劍法**：精品三階劍法，`weapon: 'sword'`, `attr: 'yang'`, 前置：`chunyangFist` 小成或 `basicSword` 小成，可與小龍女《玉女劍法》觸發雙劍合璧！）
     * `xiantianGong`（**先天功**：絕品三階內功，`school: 'inner'`, `attr: 'he'`, 高崖絕頂參悟）
   * 在 [`routines.mjs`](../../src/routines.mjs) 新增 `ROUTINES.chunyang`（《純陽拳》十二式關鍵幀套路），並在 [`luohan-book.mjs`](../../src/luohan-book.mjs) 支援 `readStarterBook(d, bookId)`（相容既有 `readLuohanBook`）。
3. **伴侶「帶著入門武功起步 ➔ 逐步修煉領悟經典」機制（Partner Progressive Awakening）**
   * **小龍女（`id: 'partner-xln'`, `xia: 'xiaolongnv'`）**：
     * **開局初始武功**：僅會入門級《古墓捕雀功》（复用或別名 `stepFeather` 入門階 XP 10）与《基礎劍法／玉女劍初篇》（`basicSword` XP 15），體力與世俗雜務經驗尚淺，但具備 `herbal: 14, agility: 16` 與「養蜂採蜜」特質。
     * **四階段領悟鏈（`checkPartnerAwakening(s, partner)`）**：
       1. **初識山居（一起生活滿 2 日或切磋 1 次）**➔ 領悟《天羅地網勢》（`tianluoPalm`，掌法＋身法）。
       2. **身輕如燕（`tianluoPalm` 達小成 Tier 1）**➔ 領悟《玉女劍法》（`yunvJian`）與《美女拳》（`meinvFist`）。
       3. **雙劍同心（`yunvJian` 達小成 Tier 1 且與主角好感 ≥ 60 或並肩作戰）**➔ 領悟《玉女素心劍》（`yunvSword`）。
       4. **陰陽合參（主角《玄門心法》達小成 Tier 1 且小龍女 `yunvSword` 達小成）**➔ 兩人於微距窗對坐合參，領悟鎮派《玉女心經》（`yunv`）！
   * **黃蓉（`id: 'partner-hr'`, `xia: 'huangrong'`，可選伴侶）**：
     * **開局初始武功**：入門《基礎拳掌》＋《逍遙遊・初篇》（`xiaoyaoStep` XP 10），具備高廚藝 `cooking: 16, herbal: 12`。
     * **四階段領悟鏈**：《落英神劍掌》（`luoyingPalm`）➔《蘭花拂穴手》（`lanhuaHand`）➔《玉簫劍法》（`yuxiaoSword`）➔《碧波心法／奇門五轉》（`biboXinfa`）。

---

## 二、 修改檔案與介面契約

1. **[`solo-sect/src/data.mjs`](../../src/data.mjs)**：
   * 於 `ARTS` 及 `MOVES` 註冊全真武學：`chunyangFist`, `quanzhenXinfa`, `jinyanStep`, `haotianPalm`, `quanzhenSword`, `xiantianGong`。
   * 於 `SECTS` 註冊 `quanzhen`（全真派）與 `zhongnan`（終南雙劍宗，供 Phase 7 開山使用）。
2. **[`solo-sect/src/routines.mjs`](../../src/routines.mjs)**：
   * 新增 `CHUNYANG_FORMS` 與 `ROUTINES.chunyang`，綁定至 `chunyangFist.routine = 'chunyang'`。
3. **[`solo-sect/src/luohan-book.mjs`](../../src/luohan-book.mjs)**：
   * 保留 `readLuohanBook(d, seconds, now)` 完全相容；新增 `readChunyangBook(d, seconds, now)` 與通用 `readStarterBook(d, artId, seconds, now)`。
4. **[`solo-sect/src/arts.mjs`](../../src/arts.mjs)**：
   * 新增並匯出 `checkPartnerAwakening(d, hero, s)`：檢查伴侶當前火候與雙人互動條件，自動解鎖下一階段經典武功並寫入日誌 `log(s, ...)`。
5. **[`solo-sect/src/sim.mjs`](../../src/sim.mjs)**：
   * `createState(seed, heroSpec)`: 當 `heroSpec?.hermitage` 為真時，初始化 `s.hermitage = { active: true, partnerId: heroSpec.partner || 'xiaolongnv', stage: 0, founded: false }`，僅建立主角（初始配《純陽拳》或《羅漢拳》入門）與指定伴侶（小龍女或黃蓉），並將兩人設為高初始好感（`aff = 55`）。
   * 每日／每次練功結算時呼叫 `checkPartnerAwakening`。
6. **[`solo-sect/src/economy.mjs`](../../src/economy.mjs)**：
   * `billDue(s, day)`：若 `s.hermitage?.active` 為真，回傳 `false`（隱居期間無月俸與建築維護催繳）。
7. **[`solo-sect/src/start-ui.mjs`](../../src/start-ui.mjs)** & **[`solo-sect/src/main.mjs`](../../src/main.mjs)**：
   * 開局介面提供「**終南荒山隱居（主角＋小龍女／黃蓉雙人開局）**」選項。
   * 隱居期間頂部標題顯示「**【荒山隱居・終南茅廬】**」與伴侶修煉進度提示。

---

## 三、 驗證與測試要求

* 新增單元測試 `solo-sect/test/unit/growth/phase4-hermitage-duo.test.mjs`：
  1. 驗證 `createState(42, { hermitage: true, partner: 'xiaolongnv' })` 只生成主角與小龍女 2 人，主角持有 `chunyangFist`，小龍女僅持有入門輕功與基礎劍法，且 `billDue(s)` 為 `false`。
  2. 驗證 `createState(42, { hermitage: true, partner: 'huangrong', starterArt: 'luohanHands' })` 支援羅漢拳＋黃蓉組合。
  3. 驗證小龍女隨武學熟練度提升，依序觸發 `checkPartnerAwakening` 解鎖 `tianluoPalm` ➔ `yunvJian` ➔ `yunvSword` ➔ `yunv`。
  4. 驗證預設 `createState(42)`（未傳 `hermitage`）100% 保持原有 3 人開局與 golden 相容。
