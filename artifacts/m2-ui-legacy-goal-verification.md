# M1 遷移後自訂目標重選：Chrome 驗證（issue #12 的 A8／A9 子項）

**性質：** 只新增證據，不改程式。補上 [`implementation-review-retro.md`](../docs/m2/implementation-review-retro.md) 寫的「遷移自訂目標的重選尚未做 Chrome 視覺操作」。腳本：[`run_m2_ui_legacy_goal_check.py`](run_m2_ui_legacy_goal_check.py)。重跑：`PYTHONPATH=. python3 artifacts/run_m2_ui_legacy_goal_check.py`；需要選用的 `playwright` 套件與 Chrome（預設 `/usr/bin/google-chrome`，可用 `--chrome` 指定）。這兩者都不是專案依賴。所有資料庫都在暫存目錄，不動正式存檔。每個 UI 步驟都是真實點擊或 `<select>` 選擇（人物列表 `data-person`、「世界編年史」的 `#historyMonth` 選單、事件來源按鈕），沒有直接呼叫頁面函式。加 `--shots artifacts/m2-ui` 會重新產生兩張卡片截圖。

## 操作與結果（審查後以最新 `dev` @ `12a809a` 重跑，Python 3.13.5，headless Chrome 連到實際本機伺服器）

| 步驟 | 結果 |
|---|---|
| 以 `initial_world(23)` 建 M1 0.1.0 存檔，玩家「舊玩家」填自由文字目標「自訂的人生願望」，推進 1 月 | 建立成功 |
| `python3 -m earth_ascension.migrate` 複製成 M2 | 來源檔 SHA-256 前後相同；複本為 0.2.0、月 1，玩家目標 `legacy_custom`、原文保留 |
| Chrome 開人物觀察頁，先點另一位 NPC（確認卡片變成 NPC），再點人物列表的玩家 `data-person="101"` | 顯示「長期目標：自訂的人生願望」「舊存檔自訂目標…已保留原文；目前以中性步驟運作，尚無專屬規則。可改選：」，有五選一下拉與「確認目標」 |
| 選「探索靈氣」並按「確認目標」 | 提示「舊目標已明確改選」；頁面顯示「長期目標：探索靈氣」、下一步「累積研究紀錄」，重選控制消失 |
| 在人物觀察頁點 `目標重選` 事件的來源按鈕（事件 ID `m2:1:110`） | 切到歷史月 1，事件列 `event-m2:1:110` 存在 |
| 核對保存狀態（API） | 目標為探索靈氣；`goal_history[0].label` 仍是「自訂的人生願望」；人物 chronicle 有 `目標重選` 事件 |
| 續推一個月 | 成功（月 1→2） |
| 「世界編年史」→ `#historyMonth` 選「第 0 月」（M1 0.1.0 快照）| 選單值為 0、快照版本 0.1.0，頁面可渲染，無錯誤；再按「返回現況」 |
| 六個頁籤逐頁點開 | 全部可渲染；頁面無 JS 錯誤 |

**結論：** 這條流程在實際瀏覽器可用；沒有發現新缺陷。變異檢查：(a) 把「確認目標」按鈕 id 改掉，腳本在第一個斷言失敗；(b) 把人物列表點擊改成不更新 `selected`，腳本在選人斷言失敗；(c) 把 `#historyMonth` 的 `onchange` 改成空函式，腳本在等待歷史月時逾時失敗。三者都在還原後恢復通過，所以檢查不是空的。

**截圖（小型驗收證據，合計約 80 KB，非 raw 資料）：** 重選前 [`m2-ui/legacy-goal-before.png`](m2-ui/legacy-goal-before.png)、重選後 [`m2-ui/legacy-goal-after.png`](m2-ui/legacy-goal-after.png)。

## 未驗證

- 只有一個 M1 存檔、一個玩家、一次重選；沒有用真實 M1 第 12／60 月存檔做（既有 `tests/test_m2.py` 的遷移測試涵蓋存檔層，不是瀏覽器）。
- 沒測遷移失敗或重複遷移的 UI 訊息、已故玩家（UI 面見 #27；API 面 `Store.set_legacy_goal` 無 `alive` 限制，已在 #12 列為後續阻擋）、手機寬度與其他瀏覽器、`expected_month` 過期時的錯誤顯示。
- 只有兩張卡片截圖，不含整頁／六頁截圖。
