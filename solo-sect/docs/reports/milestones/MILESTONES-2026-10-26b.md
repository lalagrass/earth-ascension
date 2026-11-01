# 里程碑補充 b：人物卡軌（2026-10-26 15:50，台北時間）

這份補充接在 `MILESTONES-2026-10-26.md`（v2.1–v2.5、ART）之後。依據是 #340 公版（dev `9ef497e`，PR #341 已合）和本版兩份評估：[6408140530](https://github.com/lalagrass/earth-ascension/issues/340#issuecomment-6408140530)、[6410906567](https://github.com/lalagrass/earth-ascension/issues/340#issuecomment-6410906567)。#340 仍是研究狀態，**本文件只是排程建議，不是工程授權**。每一包都要擁有人另外點頭才開工。存檔升版和手機適配排在最後。

## 總表
| 里程碑 | 主題 | 成本 | 依賴 | 驗收重點 |
|---|---|---|---|---|
| C1 | 唯讀人物卡快照＋遮罩 | 小–中 | 無（可與 v2.1 並行） | `cardSnapshot(s,d)` 純函式；golden 不變；hidden 不帶數值 |
| C2 | 人物卡 UI（兩主入口） | 中 | C1、v2.3（UI 清晰） | 生活總覽和武學成長兩頁；缺項、隱藏、未支援分開顯示 |
| C3 | 武學單一權威：arts | 中 | C1；與 v2.1 平衡相關 | `skills.palm/leg` 降為相容或衍生；35 例 longrun 的戰力偏差 ≤5% |
| C4 | 戰鬥 phase 事件 | 中 | C3 | windup/active/recover 加 hit/miss/cancel 事件；core hash 不變（只多事件） |
| C5 | 共用動作族 adapter | 大 | C4、ART、#339（未排程） | assetId→本地 URL；缺圖時退回旋轉；不改核心時長或位移 |
| C6 | 開局快照＋成長歷史（存檔） | 中 | C1、v2.5（存檔升版排最後） | initial 快照加成長事件環形紀錄；舊檔標「無開局紀錄」，不倒填 |

## C1 唯讀人物卡快照（小–中）
- **內容**：`cardSnapshot(s,d)` 依公版分組（aptitude/capability/skill/martial/state/persona/status），每項帶 semanticId、availability、raw、unit、domain、provenance。直接重用 `statusOf`。
- **遮罩**：`rootKnown=false` 時根骨與悟性輸出 hidden，不帶數值。性格只輸出已知（known）的部分。
- **標記**：agility 標成原名「腳力（移速／閃避）」並設 ambiguous；skills.leg 標成「腿法熟練（舊軌）」；gate 標「止於小成」；左右互搏標「本版倍率」。
- **驗收**：純函式、不消耗 RNG、golden 不變。單元測試要涵蓋 hidden、unsupported（耐力、營造）、known 0 值三種情況。

## C2 人物卡 UI（中）
- **內容**：桌面兩主入口，頭像 → 展開立繪（v2/post）。先天和後天雷達分開；精力、福緣、性格不放進實戰圖。
- **驗收**：所有內容走 C1 快照，DOM 不含 hidden 值。Playwright 跑一段自然遊玩流程，FEATURES 狀態才能標「已驗證」。

## C3 arts 單一權威（中）
- **內容**：招式威力和範圍改讀 arts 的階或 xp；`skills.palm/leg` 只保留相容讀取。另評估要不要讓 strength 進招式（避免和 leg 重複計分）。
- **驗收**：重生 golden（數值必然變動），35 例 longrun 偏差 ≤5%，郭靖和岳不群 ≥4/5。

## C4 戰鬥 phase 事件（中）
- **內容**：出招拆成 windup/active/recover，送出 `{actionId, actor, move, phase, result}` 事件，帶事件 ID 防止重播。miss 和 cancel 要明確。
- **驗收**：如果 C3 不改時長，core hash 不變；低幀率或暫停時不重扣、不補傷害。

## C5 共用動作族 adapter（大，掛 #339）
- **內容**：hero 和 senior 兩個動作族，各需要 idle、walk、carry、strike-palm、strike-kick、hit 這些圖格，少數招牌招式再做變體。assetId 對本地 URL 的 adapter，加上腳錨 metadata。
- **驗收**：缺圖時退回現行旋轉；動畫只讀 C4 事件。素材 provenance 和 BRIEF 例外要先核過。

## C6 開局快照＋成長歷史（中，存檔）
- **內容**：建角時記錄 initial（H.stats 和 skills 開局值）；記錄成長事件（技能、arts 階、突破），每人最多 N 筆。
- **驗收**：存檔遷移（RULES_VERSION 升版）；舊檔標「無開局紀錄」；卡片不倒填、不顯示假的 +0。

## 建議順序
v2.1 和 C1 並行 → v2.2 → v2.3 加 C2 → C3 → C4 → v2.4 → v2.5 加 C6（存檔）→ C5（等 #339 排程）。

## 未決問題（附預設值）
1. C1 要不要和 v2.1 並行？〔是，C1 不改核心〕
2. 武學權威要不要正式定為 arts？〔是，C3 做〕
3. agility 要不要拆成移速和閃避兩項？〔不拆，只標混合值〕
4. 要不要新增腿力或耐力？〔不新增，先讓 strength 評估進招式〕
5. MBTI、仙俠欄位要不要進卡？〔不進，只放 P 暫擬敘事欄〕
6. C5 等 #339？〔是，未排程前不開工〕
7. C6 成長歷史每人上限？〔每人 50 筆，環形覆蓋〕
