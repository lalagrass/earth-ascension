# 武俠小鎮 A1–A6 — 總驗收（FINAL-A）

實際主筆：Claude（接續 Grok）。分支 `town/wuxia`（A1–A5）＋ `claude/project-thread-pfavxm`（A5 收尾、A6），最後一步 tag `wuxia-a6`。規格：#563（產品計畫與「輕量驗收」）、#549（共用約定）、#564／#575／#574／#576／#577／#581（A1–A6）。W0–W9 的總驗收見 [FINAL.md](FINAL.md)。

## 小鎮現在能看到什麼

在 W0–W9 的水彩古鎮上多了：**單機版**（Web Worker 跑同一份規則，離線、不用後端與 LLM，倍速 1×–64×、跳到明早、存檔／匯出／回報）、**大師入鎮**（張三丰第 5 日進鎮，教、看、練、再傳四條管道，譜系樹與段位）、**無言互動**（鎮民不說話，頭上泡泡＋規則決定的 12 種互動）、**玩家牽線**（每日一點緣，指路／引薦／傳話／接濟／說情；三個劇本、三級目標、結算卡 PNG）、**可發佈**（設定頁、錯誤邊界、390 寬、回報檔、靜態發佈 workflow）、**傳承曲線修正**（看變稀有、教的門檻依難度、練招自己的曲線、目標依序靠正式傳承）。預設模式 LLM 呼叫 0 次；同 seed 同 input 同 hash（無頭、單機 Worker、Convex 三種跑法，倍速不改結果）。

## 離線驗收清單（乾淨 clone、無 Docker、無 LLM）

需求：Node 22 以上、git。不需要 Docker、Convex、LLM、金鑰，裝好後可離線。

```bash
git clone --branch claude/project-thread-pfavxm --single-branch https://github.com/lalagrass/earth-ascension.git
cd earth-ascension/wuxia-town      # owner 合進 town/wuxia 後，改成 --branch town/wuxia
npm ci
npm run wuxia:check:quick          # q1 型別、q2 單元測試（含 A1–A6 各步 A 類測試）、q3 hash 鏈、q4–q9 靜態與 parity、常數盤點
npm run build:local                # → dist-local/（純靜態，0 個後端／LLM 請求）
npm run wuxia:serve                # 打開 http://127.0.0.1:8080/ai-town/ （離線可用）
```

`wuxia:check:quick` 全綠的標準：q3 的每一行都 `ok`——seed 7 3 日 hash ＝ `7a495042…`，並且從 A6 一路往回關元素，各自等於上一步的值（下表）。想逐步看報告：

| 步 | 指令 | 預期 |
|---|---|---|
| A6 | `npm run wuxia:a6-report`（5 個 seed 並行，約 8 分鐘） | S 曲線表、B1（平均 7.0，預期 ≤ 4）、B2（0/5，預期 ≥ 3）——**兩條沒過**，見下 |
| A6 | `npm run wuxia:scenario-report -- --scenario 1 --policy none,script`（劇本 2、3 同；每個 10 局，數分鐘到半小時） | 各級達成日與達成率（C 表） |
| A6 | `WUXIA_ELEMENTS_OFF=a6-spread npm run wuxia:scenario-report -- --scenario 1 …` | A5 規則的對照 |
| A2 | `npm run wuxia:lineage -- --seed 7 --days 90` | 譜系樹（教、看、走樣、再傳） |
| A4 | `npm run wuxia:player-script -- --script docs/wuxia/fixtures/a4-s1-gold.json --seed 7 --out /tmp/p.json` | 劇本一的達成日與結算卡 |
| A5 | `npm run wuxia:e2e`、`npm run wuxia:a5-shots`、`npm run wuxia:soak`（要 Chrome／Chromium） | 瀏覽器走查、390 寬截圖、掛機記憶體 |

完整的 W0–W9 回歸仍是 `npm run wuxia:check:full`（手動，約 10–20 分鐘）；本批只跑 quick，沒有重跑 full（#563 輕量驗收）。

## 每步 tag 與 hash

預設設定（seed 7、3 遊戲日）的 hash，以及把該步元素關掉之後必須回到上一步的值（`headless --seed 7 --days 3 --off …`）：

| 步 | tag（commit） | 預設 3 日 hash | 關掉該步元素 ＝ | 規則版本 |
|---|---|---|---|---|
| W9 | `wuxia-w9`（`0c926157`） | `4bc77029…` | — | — |
| A1 單機引擎 | `wuxia-a1`（`ac3aede0`） | `51df021f…` | `--off a1-base` ＝ W9 | `a1-1` |
| A2 大師 | `wuxia-a2`（`21219668`） | `7699618b…` | `--off a2-master` ＝ A1 | `a2-1` |
| A3 無言互動 | `wuxia-a3`（`435933b3`） | `a1762e45…` | `--off a3-silent` ＝ A2 | `a3-1` |
| A4 可玩 | `wuxia-a4`（`3ff2a300`） | `14abe2fc…` | `--off a4-play` ＝ A3 | `a4-1` |
| A5 可發佈 | `wuxia-a5`（`e62515b8`） | `bdb2107b…` | `--off a5-robust` ＝ A4 | `a5-1` |
| A6 傳承曲線 | `wuxia-a6`（見下「tag」） | `7a495042…` | `--off a6-spread` ＝ A5 | `a6-1` |

（每個「關掉」都是連同後面各步的元素一起關，例如 A3 那列是 `--off a3-silent,a4-play,a5-robust,a6-spread`，見 `check-quick.ts` q3。預設 30 分鐘 hash：A5 `bd608abf…`、A6 `25dcf883…`。）

**tag**：`wuxia-a5`、`wuxia-a6` 已在本機打好，但這個環境 `git push` tag 回 HTTP 403（分支推得上），所以**還沒推到遠端**（DEVIATIONS A6-10）。要補推：`git tag wuxia-a5 e62515b8 && git tag wuxia-a6 <本 PR 合進 town/wuxia 後的 A6 最後一個 commit> && git push origin wuxia-a5 wuxia-a6`。A6 最後一個 commit 見 PR。

## 代表截圖（沿用已有的，A6 只新增 1 張）

A1 [首頁](a01/a01-home.png)・[遊戲畫面](a01/a01-game.png)・[390 寬](a01/a01-390.png)；A2 [傳承面板](a02/a02-lineage.png)・[太極開關](a02/a02-art.png)；A3 [互動選單](a03/a03-menu.png)・[茶館](a03/a03-teahouse.png)；A4 [目標面板](a04/a04-goals.jpg)・[推一把](a04/a04-menu.jpg)・[結算卡](a04/card.png)；A6 [譜系樹：段位、虛線、能教提示](a06/a06-lineage.jpg)。

## C 類數字總表（只報告，沒為它們調常數）

**A1**（360 日 seed 7）：教頭對阿青敬重修補前 −36～+4、後 −43～+11；林嫂煮茶 9.20 → 8.94 次／日。效能（單核）：6 人 60 日 479 → 26.6 秒，12 人 60 日 57.2 秒。**A3**（seed 7 30 日）：互動 1896 次、11/12 種、寒暄 30.1%、拜師 3 人。**A4**（劇本一 seed 7）：照腳本第 61 日金、不干預第 80 日金（A4 規則）。

**A6 傳承曲線**（預設設定，seed 7–11 平均；「會」＝至少一招太極不是原有的）：

| 日 | A5 會／正式／只看來 | A6 會／正式／只看來 | A6 能教起勢 | 參考目標 |
|---|---|---|---|---|
| 10 | 10.6／2.8／7.8 | 6.6／3.8／2.8 | 0.0 | 2–4 人 |
| 30 | 12.0／9.8／2.2 | 11.6／9.0／2.6 | 1.6 | 4–7 |
| 60 | 12.0／10.4／1.6 | 12.0／10.6／1.4 | 6.0 | 7–10 |
| 90 | 12.0／11.2／0.8 | 12.0／10.8／1.2 | 10.0 | 9–12 |

B1 第 15 日看會的人：A5 12.0、A6 7.0（預期 ≤ 4，**沒過**）；B2 60 日內第 3 代正式傳人：A5 0/5、A6 0/5（預期 ≥ 3，**沒過**）。最深正式代數兩邊都停在 1。

**劇本達成率**（seed 7–11；銅／銀／金；括號是平均達成日）：

| 劇本、做法 | A5 規則 | A6 規則 |
|---|---|---|
| 一 不干預 | 5/5（7.6）、5/5（4.4）、0/5 | 5/5（7.0）、0/5、0/5 |
| 一 照腳本 | 5/5（7.0）、5/5（4.2）、0/5 | 5/5（7.8）、0/5、0/5 |
| 二 不干預 | 5/5（5.4）、3/5（33.3）、0/5 | 5/5（7.8）、3/5（58.0）、2/5（68.0） |
| 二 照腳本 | 5/5（5.4）、3/5（15.0）、0/5 | 5/5（8.0）、3/5（83.7）、1/5（88.0） |
| 三 不干預 | 0/5、0/5、5/5（7.0） | 2/5（83.0）、2/5（83.5）、2/5（83.5） |
| 三 照腳本 | 0/5、0/5、5/5（6.8） | 1/5（67.0）、1/5、1/5 |

A5 欄是 `WUXIA_ELEMENTS_OFF=a6-spread` 跑同樣的 seed 與腳本。A6 讓劇本三不再跳過銅銀（A5 全是第 5–9 日直接金，銅銀 0/5），劇本二銀金 A5 沒金、A6 不干預 2/5；代價是劇本一銀、金到不了（銀要第 3 代正式傳人，B2 沒過），而且照腳本沒有比不干預好（玩家插手沒用）。詳見 `A6.md`。

**A5**：e2e、soak 與 30 分鐘走查的秒數在工具輸出裡（本機量，真人電腦會不同，A5-12），沒有進 repo。

## 偏離摘要

完整表在 [DEVIATIONS.md](DEVIATIONS.md)（A1-1…A6-10）。幾條最重要的：

- **A6 B 類兩條沒過**（A6-4、A6-5）：判定沒放寬、沒加機制。看太容易（B1 7.0）；大師 open 時把基本招教給全鎮，非大師的人沒有缺招的學生，所以沒有第 3 代正式傳人（B2 0/5）。
- **`practice.base` 推導了三輪**（A6-3）：0.09 → 0.14 → 0.25，每輪的假設與量測都留在 `a6.json` 的 `_src`。
- **tag 推不上去**（A6-10）：環境限制。
- A5：靜態發佈要 workflow 檔在 main 才能手動觸發（A5-8）；卡路讓步用放到最近空格（A5-3）；`check:full` 的 W 組改在 W9 設定跑（A5-5）。
- A4：`a4.test` 的劇本一從 7 日改 9 日（A6-7，每條斷言都在）。

## 待 owner 決定（都已先做建議選項，可回退）

D1 預設雲端模型・D2 `LLM_DAILY_TOKEN_CAP`・D3 `wuxia:shot --at`・D4 技能成長的 1 年目標・D5 想學武要不要只給阿青・D6 切磋勝率分母・D7 切磋圍觀・D8 拜師後練功增長怎麼量・D9 外人要不要變 AI Town 人物・D10 請教的規則・D11 匯出 journal 公開查詢（W 系列，見 DEVIATIONS 該節）；A2 練習速度（**A6 已處理**：base 0.25、門檻依難度）；A4 結算卡分享；A5 靜態發佈要不要公開；A5 卡路處理；A5 劇本目標難度（**A6 已改成依序**，結果見 C 表）。**A6 新增兩條**：
1. **看太容易（B1）**：維持（建議）／累計次數 10 → 約 25／每人每天每招只算 1 次／看了某一招後同一天不再累計別招。
2. **沒有第 3 代正式傳人（B2）、劇本一銀金到不了**：維持，看 G1（建議）／大師 open 時一次只教少數人、其他人排隊／劇本一銀級改成不用第 3 代（例如徒弟教出第一個學生就算）。

## 乾淨 clone 實測

2026-11-14，`/home/user/wuxia-verify`，`git clone --branch claude/project-thread-pfavxm --single-branch`（`d11be58e`，這之後只加了文件）：

- clone 12 秒；`npm ci` 10 秒（EXIT 0）。
- `npm run wuxia:check:quick`：**EXIT 0，`passed 139.6 秒`**（同時有其他背景工作；單元測試 255 個全過，q3 的 9 行 hash 全 `ok`，q8 三組 parity 全 `ok`，q9 34 個資料檔每個數值都有 `_src`）。
- `npm run build:local`：EXIT 0，7 秒；`npm run wuxia:serve`：`http://127.0.0.1:8080/ai-town/` 回 200。
- 沒有重跑 `wuxia:check:full`（輕量驗收只要 quick）。
