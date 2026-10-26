# GPT 人物與武學公版接入設計

2026-10-26，Codex 規劃，供 Claude 的 M18／M19 實作準備。GPT 固定基線 `19b5ff5eb1718c2c42ec63fdf9b1c9af752947cc`。本文件只規劃，不宣稱已接入或已發布公版 schema。

## 上游狀態與取用方式

本輪核對遠端 dev 仍為 `148cfbbb27e43475c66744d53c2451125a9111a0`；新設計位於 [PR #341](https://github.com/lalagrass/earth-ascension/pull/341)，[主研究 #340](https://github.com/lalagrass/earth-ascension/issues/340)仍標評估限定。使用者本次要求將套用與系統修改納入下一批規劃，不代表本聊天現在修改 runtime 或代共享專案批准工程。

固定提案 `6e5e69dbe3fa166f06659d7835feb510deb9f08b`：

- [人物卡](https://github.com/lalagrass/earth-ascension/blob/6e5e69dbe3fa166f06659d7835feb510deb9f08b/sect-chronicle/docs/CHARACTER_CARD_PUBLIC_PROPOSAL.md)：生活總覽／武學成長，分類、時間維度、來源與可見性。
- [武學模板](https://github.com/lalagrass/earth-ascension/blob/6e5e69dbe3fa166f06659d7835feb510deb9f08b/sect-chronicle/docs/MARTIAL_ART_PUBLIC_TEMPLATE_PROPOSAL.md)：定義、人物所學、核心與演出；取得／理解／運用分開。
- [素材提案](https://github.com/lalagrass/earth-ascension/blob/6e5e69dbe3fa166f06659d7835feb510deb9f08b/sect-chronicle/docs/CHARACTER_SHARED_ASSETS_PLAN.md)：actor／design／skin／asset 分離，固定版本與本地載入。#339 尚未成為本包素材工程。

目前是語義與版面提案，沒有可直接安裝的公共元件。先在 GPT 版做小型 adapter 和既有 UI 整理；不合別版核心、不依賴 GitHub raw 即時載入，不先建共享 package、動態公式語言或共同存檔。將上游版本、本地映射版本與待採差異寫在實作 spec；未來公版變動只改必要轉接，不翻修核心。

## 權威資料與最小修改

建議資料流：world 權威狀態 → 核心純查詢 → GPT 公版投影 → 人物／武學面板。面板操作 → 既有 command → 核心重新受理／拒絕 → 新快照。投影不持有可寫世界參照，不保存第二套人物或技能。

| 公版內容 | GPT 原來源 | 套用及必要修改 |
| --- | --- | --- |
| 身份、現在／原因／下一步 | `state.makePerson`、`person-view.situation`、`commitmentOf` | 直接用穩定 actorId；沿用情境投影與操作，補分組 metadata；不從姓名或素材認人 |
| 體魄／臂力／身法／悟性／定力 | `people[id].stats[0..4]`、創角驗證 | 明列本版語義與原尺度，當作創角基線／目前常態；未有獨立訓練增長證據，不複製成先天與後天兩組。舊角色無起始快照就缺，不能從現值反算 |
| 精力、生命、傷勢 | energy、hp/maxHp、injury | energy 原值0–10000，顯示0–100是單位換算；生命資源與傷勢分列，不能拿精力冒充耐力 |
| 用餐資訊 | meals／mealDay | 日內紀錄，不是連續飢餓值；不得製造飽足條或統一需求總分 |
| 行走與負重 | `navigation.speed`、distance、`state.bagWeight` | 讀真查詢及其世界單位，受負重、傷勢、低精力等影響；distance有既有速度階段，不叫獨立腿力／跑速／腿法。不要以各版 px/s 直接比較 |
| 武學定義與招式 | data、catalog、已安裝 content packs | artId／moveId／pack版本分開；定義不複製此人U/F/I，不把近似中文名當同武學 |
| 人物所學與真成長 | skill[art].U/F/I、sources、contexts、contentMoves | 三值原樣分列，來源可展開；sources沒有前值時只呈事件，不編造增幅或累計歷史 |
| 學習與執行條件 | `content.movePrerequisite`、`studyContent`、`martial-config.goalsFor`、combat | 分開學理、實際研讀、取得器械、已學招式與現在可出手。現有檢查分散時最小抽出共用純查詢，不能在UI照中文重新算一遍 |
| 真出招與動畫 | `combat.actionTiming`、action.phase、render／scene-art | 規則值／人物當下計算／本次action三層分開；動畫只讀真階段、事件與朝向。無動畫圖格不授予新效果 |
| 性情、家庭、師徒、目標 | 已知性情投影、relationships、families、mentorPlan | 保留雙向關係與事件來源；藏值先遮罩，不能借面板 tooltip 或操作理由洩漏。師徒目標可達性依 M17 修補 |

五項 stats 是否天生與是否可成長是兩件事；本輪不新增力量訓練、獨立耐力／腿力、承載、控制或反噬公式。公版武學第8節的條件分類可容納本版資料，沒有的項目標未支援／未評估，不畫出虛假的風險機率。

## 最小面板流程

人物卡首顯示姓名、身份、位置、現在行動、重要異常；生活總覽保留原因、下一步與合法操作。武學成長顯示本版常態能力、U/F/I、真來源與當前目標。大型立繪可缺，不為兩張卡啟動素材庫。

從阿木的基礎拳開詳情：看到已知教法與目前熟練，選合法練習；核心完成後，快照刷新 U/F/I 與來源。接著查看一招進階拳：先展示真前置，實際研讀後才出現在已學招式；設偏好仍走原 command。交手時面板可顯示本次 phase／耗能與命中紀錄，不能把武學目錄理想值當本次結果。九劍只展示本版已支援的入門與辨隙招，不把完整獨孤九劍當已交付。

選受限制角色時，可看不等於可命令；例如小禾不能因面板共用而得到練武／戰鬥按鈕。快照生成後人已出發、忙碌或失去器械，再點舊按鈕須由核心重新判定，不按快照中的 enabled 直接執行。

## 建議公版補充的可選欄位

既有分類、initial/base/effective、availability、來源、知識／施展與素材分層足夠，不再提同一批欄位為新發明。下面是供 #340 後續討論的具體增補，本次不代發留言或改共享文件。

| 增補 | 遊戲設計收益 | 最小描述與邊界 |
| --- | --- | --- |
| 快照與操作新鮮度 | 換人、暫停、忙碌後不執行過期選項 | snapshotTick／actorRevision（若有）、command intent、拒絕原因；核心總要重驗，不把token當授權 |
| 目標生命週期與可達性 | 學滿後能畢業或改方向，不再要求F100加10 | targetRef、active/completed/blocked、cap原因、合法替代操作；無此核心能力則不提供，不讓卡片決定達標 |
| 成長來源的覆蓋範圍 | 玩家分清「沒成長」與「舊紀錄已不在」 | retainedSince／truncated／來源種類及可用前後值；不是要求永久記錄全歷史或反算差額 |
| 知情與操作權限分開 | 能認識宗師、看人物但未必能替他下命令 | 可見事實與可用command分開；一個hidden旗標不足以代表命令權限 |
| 比較情境與實戰紀錄引用 | 解釋新招在哪裡有用，避免傷害總分誤導 | 條件摘要、rules/pack版本、sessionRef、觀測樣本；預估、實測、敘事分開，無證據不給勝率 |
| 條件變化通知與無法改善原因 | 玩家知道是缺器械、忙碌、已達上限，還是根本未支援 | reasonCode、作用階段、核心提供的remediation引用；沿原all/any，不新增任意條件引擎 |

這些欄位先作 GPT 擴充命名空間，是否升成公版由共享設計維護者決定。不能宣稱其他兩版都支援。若上游新版本已補相同能力，直接對齊並移除重複擴充。

## 工程成本與取捨

- **小：** 原值標籤、語義表、單位與缺項、既有 sources 展示。無新核心玩法。
- **中：** 共用唯讀查詢、人物／武學投影、兩個面板及指令轉接、隱藏資訊與過期操作反例。這是 M18/M19 主包。
- **中：** 目標可達／重定向與 session 歸屬是核心修補，分別放 M17/M20，不能只修卡片文案。
- **中至大：** 自主目標恢復、事件後續與有限重要記憶，屬 M21/M22 的玩法；不是套公版就自動得到。
- **大且延後：** 全員圖格／骨架、共用素材pipeline、腿法／內功承載與反噬、十二名經典全套武學、跨版數值對齊。不為面板先做這些。

驗收以真生活與真學習流程為主；唯讀投影不改世界、原有已知規則與命令權限不變、未知不填0、短期狀態不進稟賦雷達。公版本身不入存檔；確需新的權威資料才在該 milestone 設最小版本契約。總體存讀收尾在M23，手機另批。
