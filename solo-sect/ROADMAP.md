# 山門紀路線圖

> 這份只寫「現在在哪、接下來做什麼、等誰決定」。舊路線圖保留作歷史：
> [ROADMAP-HISTORY.md](docs/reports/milestones/ROADMAP-HISTORY.md)（v0.6–v2.5，各文件寫的「ROADMAP §N」指它）、
> [loop/ROADMAP.md](loop/ROADMAP.md)（loop engineering 輪次）、
> [ROADMAP-NEXT-2026-10-26.md](docs/reports/milestones/ROADMAP-NEXT-2026-10-26.md)。

## 現況（`27aebd6`，2026-11-02）

- 玩法版本 v3.3（loop 210）；存檔規則版本 `RULES_VERSION` 1.95，新規則以 `v22`／`v23`／`v24` 世代旗標疊在上面。
- 內容：經典主角與自創開局、16 型人格、同圖生活與建設、雇工與經濟、木柵與山賊波次、巡山遠征、88 門武學與內功十重、江湖事件與名俠、第二代傳承、門派會武與圍山。
- 最近一次驗收：[BALANCE-v330](docs/reports/balance/BALANCE-v330.md)；未達標項目見 [DECISIONS](docs/decisions/DECISIONS.md) 第 275 條。

## 進行中：文件與程式重構（索引 #395）

除 M2 外，每一步都必須讓遊戲行為一字不差（以 #388 的固定種子檢查證明）。

| 里程碑 | Issue | 內容 | 狀態 |
|---|---|---|---|
| M1 安全網＋文件對齊 | #388、#389 | 固定種子 golden 與舊存檔回放；文件對齊現況、連結檢查 | 進行中 |
| M2 收規則世代 | #390 | 舊存檔遷移到現行規則（擁有人 2026-11-02 選定），刪 30 個旗標與 v22–v24 分支 | 待 M1 |
| M3 可讀性 | #391 | 語意命名、術語表、排版 | 待 M2 |
| M4 分層 | #392 | data → rules → sim → view，消除雙向依賴，拆 `main.mjs` | 待 M3 |
| M5 測試與常青規格 | #393、#394 | 測試依系統重組；一系統一份現行規格；決策標現行／已取代 | 待 M4 |

## 待擁有人決定

- 重構期間是否暫停新玩法與平衡 loop（#395 決定 3）。
- 玩法層面未決項目：DECISIONS 第 275 條（星宿勝率、第 27 日圍山等）。

## 更新規則

里程碑狀態改變時更新上表；新的玩法版本完成時更新「現況」。歷史細節寫進 `loop/LOG.md` 與 `docs/reports/`，不寫在這裡。
