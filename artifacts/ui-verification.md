# Dashboard 實際瀏覽器驗證

驗證環境：本機 Python HTTP 服務 `http://127.0.0.1:18765/`，Chrome 的已連線擴充功能。透過瀏覽器可見 DOM 與真實畫面操作；截圖為瀏覽器擷取的 JPEG，沒有合成圖。

## 實際操作

1. 開啟世界總覽，看到第 12 月、101 名具名人物、靈氣知識 46 與事件／趨勢圖；保存 `world-overview-ui.jpg`。
2. 在人物建立頁輸入「周映月」，出身舊城、35 點模式（五能力各 7）、目標「建立關係」，完成 16 題並按「投放世界」。人物觀察頁顯示 ID 102、人格／價值與初始狀態。
3. 直接按「推進一個月」到第 13 月。周映月自行選擇社交，與黃辰昕建立關係，信任 12；人物觀察頁顯示目標、需求、可知資訊、各行動分數與後果。保存 `character-observer-ui.jpg`、`character-observer-full-ui.jpg`。
4. 在生命歷程頁看到投放與第 13 月行動的因果事件；保存 `life-chronicle-ui.jpg`。
5. 在世界編年史頁切換到第 12 月歷史快照，推進按鈕停用，再返回現況。發現現況月份選單錯顯第 0 月，已修正並重載確認為第 13 月；保存 `world-history-ui.jpg`。
6. 在 Dashboard 再連續點擊「推進一個月」12 次，觀察到月份依序 14–25。周映月第 25 月為 21 歲、健康 76、財富 99、工作技能 5、社交技能 9，與多名 NPC 建立關係；生命歷程含第 13–25 月逐月事件。保存 `character-after-12-top-ui.jpg`、`character-after-12-ui.jpg`、`life-after-12-ui.jpg`。
7. 組織頁顯示五個組織的成員數、資源、研究進展與近期活動。世界編年史第 25 月可回放第 13 月並返回現況。

第 14–25 月每月行動與數值另見 `ui-12-month-example.md`。

## 工具與先前錯誤

- 首次嘗試 in-app browser：`Browser is not available: iab`。
- 當時 `cua.getState()`：`js execution timed out; kernel reset`；取得 Safari：`Computer Use server error -10005: timeoutReached`。這些嘗試沒有產生 UI 驗證結果。
- 本次 `cua.listBrowsers()` 找到已連線的 Chrome extension，以支援的 `cua.createBrowserTab('chrome', ...)` 操作成功。無須使用者追加擴充功能、授權或登入。
- Shell 的 localhost 讀取在預設沙箱回傳 `curl: (7) Failed to connect ...`，而以允許本機連線的執行環境回傳 200；此為執行環境隔離，不是服務停機。服務目前在 `127.0.0.1:18765` 可用。

## 測試邊界

瀏覽器驗證涵蓋六頁可見內容、人物建立、測驗、13 次逐月按鈕、決策說明、生命歷程與歷史回放。它不等於自動化跨瀏覽器或長期平衡測試；HTTP 範例與 Python 單元測試分開記錄。
