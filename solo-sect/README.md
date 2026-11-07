# 山門紀（Solo Sect）

> **破道館開局的武俠門派生活模擬與無縫塔防**
> 純原生 ES Module + Canvas 2D + 單一權威確定性狀態機｜零外部套件相依｜500+ 項 Node 測試

---

## 遊戲願景與特色

山門紀（Solo Sect）以「破道館開局，逐步重現天下第一宗」為核心體驗，融合三大經典類型玩法：

1. **《天下霸圖》的門派經營與武學領悟**：
   * 弟子在同圖奔走生活、修練基礎套路、向師父或同門求學。
   * 獨創「人物實力／門類造詣／個別武學」三層成長模型，造詣以技入道，高階神功需同門底子支撐。
   * 涵蓋各派特色：華山劍宗快劍與氣宗以氣御劍、真陰陽逆催、經脈內傷與七傷拳機制。
2. **《模擬市民》的弟子作息與自主生活**：
   * 效用 AI（Utility AI）驅動：在精力、飢餓、社交、工作與門派危機間自主權衡。
   * 雙向好感、性格相性（灑脫、拘謹、豪爽、清冷）、心情與想法沉澱；同門互相激勵與相處羈絆。
   * 破道館從地鋪開始，逐步搬運木石、擴建膳房、小寢舍、演武場與藥圃。
3. **同地圖後山狩獵與無縫塔防**：
   * 拒絕切入橫向或回合戰鬥畫面；野獸下山襲擊與門派防禦全在同張水彩地圖無縫發生。
   * 守點佈防、迎擊外敵、修補護欄，戰後即時結算戰報與護體真氣損耗。
4. **經典武俠人物與雙人同門開局**：
   * 郭靖、岳不群、令狐沖、黃蓉、楊過、韋小寶等傳奇主角模板，搭配專屬初始同門與自創門派系統。

---

## 快速開始（一鍵本地遊玩）

本遊戲無任何 NPM 依賴或打包流程，直接以瀏覽器原生模組運行：

```bash
# 1. 於專案根目錄啟動靜態伺服器（需走 HTTP 協定，避免 CORS 限制）
python3 -m http.server 8000

# 2. 開啟瀏覽器訪問
open http://localhost:8000/solo-sect/index.html
```

### 執行單元與確定性回歸測試
```bash
cd solo-sect
bash test/run.sh quick
```
短測試依系統放在 `test/unit/`；`bash test/run.sh all` 另跑 `test/archive/` 的歷史重現與 `test/accept/` 的長跑驗收。CI 保留完整套件，快速套件耗時屬 C 類報告。

### 玩法 PR 最小驗證

改玩法時，本地先跑這一道，約 30 秒。完整矩陣交給 CI。

```bash
cd solo-sect
bash test/run.sh smoke
```

它做三件事：`test/golden/saves/` 每個存檔讀入後跑 3 日；種子 1001、1002 的新局各跑 10 日，不得有 NaN 或例外；`test/unit/save/schema-invariants.test.mjs`。步長用 6 秒（與測試框架預設相同，遊戲內一日仍是 600 秒），才能卡在時限裡。該步新寫的測試另跑，不取代這道。

### 行為鎖定（golden，#388）
重構前後遊戲行為必須一字不差。快速層已含在上面的 `node --test`；完整矩陣（新局 idle／bot／farm／exp × 8 種子 × 30 日，加 6 份 v1.0–v2.4 舊存檔回放）：
```bash
node tools/golden.mjs --check   # 或 bash test/run.sh golden；4 核約 5 分鐘
```
規則版本 2.5 起所有局（新局、照舊、舊存檔）都是同一套現行規則，沒有規則開關（#390）。只有明列「改規則」的 PR 才可 `--write` 重產，PR 須寫明哪些鍵改了、為什麼。雜湊在 `test/golden/*.json`。

---

## 技術與架構理念

全專案遵循「純資料＋純函式＋單一權威狀態」原則：

| 層級 | 核心模組 | 職責與架構承諾 |
|---|---|---|
| **資料層** | `src/data.mjs` | 路網節點、設施階段、活動、88 門武學、主角模板與門派、平衡常數。 |
| **模擬層** | `src/sim.mjs`（`tick` 編排）＋規則模組 `arts`、`economy`、`threat`、`world`、`social`、`bonds`、`sect`、`hero`、`jianghu`、`wuxia`、`core`、`util`；存檔 `save.mjs` | 單一權威 `tick(state, dt)` 推進；狀態是可序列化 JSON，固定種子可重放。不碰 DOM，可在 Node 測。 |
| **繪製與介面層** | `src/main.mjs`（Canvas、鏡頭、面板接線）、`src/panel-ui.mjs`、`src/start-ui.mjs`、`src/audio.mjs`；`index.html`、`style.css` | 讀 state 畫圖與產生面板 HTML。 |
| **測試層** | `test/unit/<系統>/`、`test/archive/`、`test/accept/`、`test/harness/`、`tools/diag/` | Node 原生測試執行器，零依賴。 |

各模組職責、目前的依賴問題與 loop144 前舊檔名對照，見 [模組地圖 (MODULES.md)](docs/architecture/MODULES.md)。

---

## 文件庫地圖（Documentation Sitemap）

專案文件採「常青規格」、「架構決策 (ADR)」與「時點快照」三層管理：

### 1. 核心規格與常青設計 (Living Architecture)
* [架構總覽與歷版設計紀錄 (DESIGN.md)](docs/architecture/DESIGN.md)
* [模組地圖與舊檔名對照 (MODULES.md)](docs/architecture/MODULES.md)
* [創角、經典主角與同門搭檔 (PROTAGONIST.md)](docs/architecture/PROTAGONIST.md)
* [巡山路線、波次與無縫防禦 (PATROL-MAP.md)](docs/architecture/PATROL-MAP.md)
* [水彩精靈圖規格與立繪清單 (ASSETS.md)](docs/architecture/ASSETS.md)

### 2. 機制詳解與系統研究 (Game Systems)
* [三層成長模型：實力／門類造詣／個別武學 (growth-layers.md)](docs/systems/growth-layers.md)
* [內功重構：護體真氣、十重修練與逆催 (neigong-rework.md)](docs/systems/neigong-rework.md)
* [競品機制調研與借鑑取捨 (evaluations/)](docs/systems/evaluations/)（暴走英雄壇、大俠立志傳）

### 3. 決策庫與驗收 (ADR & Verification)
* [架構與數值決策全紀錄 (DECISIONS.md)](docs/decisions/DECISIONS.md)：**累計 250+ 條決策紀錄**（唯一事實來源）。
* [功能驗收矩陣 (FEATURES.md)](FEATURES.md)：50+ 項功能驗收標準、短流程與自動化測試證據。
* [路線圖 (ROADMAP.md)](ROADMAP.md)：目前版本、進行中的里程碑與待擁有人決定；舊路線圖在 `docs/reports/milestones/`。
* [歷史報告庫 (docs/reports/)](docs/reports/)：收納過往版本的大規模 Seed 跑測報告、審查走查筆記。

### 4. AI Autonomous Loop 開發規範
* [執行日誌 (loop/LOG.md)](loop/LOG.md)：Loop 1～210 的改動細節與 Retro。
* [AI Agent 落檔規範 (loop/AGENTS-DOC-GUIDE.md)](loop/AGENTS-DOC-GUIDE.md)：規範 AI 代理人產出報告與追加決策的路徑。

---

## 授權與社群協議

本專案依照主倉契約遵循開源協作規範。所有設計均以玩家體驗反例與客觀測試數據為依歸。
