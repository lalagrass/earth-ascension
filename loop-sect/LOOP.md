# Loop engineering 規格

本分支（`loop-sect/`）用固定的開發迴圈推進。每一輪 loop 只做一個 milestone，做完才進下一輪。目的是讓「人不在場時 AI 連續開發」也有可檢查的節奏：每輪都有寫在前面的驗收條件、機器能跑的檢查、自我審查紀錄與一個推上去的 commit。

## 一輪 loop 的七步

| 步 | 做什麼 | 產出 | 完成條件 |
|---|---|---|---|
| 1. 選題 | 從 [MILESTONES.md](MILESTONES.md) 取第一個狀態為「待做」的 milestone | log 開一節 | 只取一個；前一輪未完成不得開新輪 |
| 2. 規格 | 寫 `docs/specs/Mxx.md`：目標、玩家看到什麼、規則、資料、**驗收條件（編號 A1…）**、不做什麼 | spec 檔 | 每條驗收都能對應到一個自動測試或 headless 檢查 |
| 3. 實作 | 只改 `loop-sect/`；資料放 `src/data.mjs`，規則是純函式，畫面只讀 state | 程式 | 不加套件、不碰其他分支目錄與共用 CI |
| 4. 自動檢查 | `node --test loop-sect/test/*.test.mjs`（規則）＋ `node loop-sect/tools/soak.mjs`（多種子長跑不變量）＋ `node loop-sect/tools/headless.mjs`（真瀏覽器正常操作） | 三項都 exit 0 | 失敗就回第 3 步，不得跳過或關掉測試 |
| 5. 自我審查 | 依下方清單逐條看 diff，找到的問題修掉再跑第 4 步 | log 記下發現與修正 | 清單全勾 |
| 6. 提交 | 一個 milestone 一個（或少數幾個）commit，push 到分支 | commit SHA | push 成功 |
| 7. 記錄 | 在 [docs/LOOP_LOG.md](docs/LOOP_LOG.md) 寫：spec 連結、驗收結果表、檢查輸出摘要、審查發現、已知限制、下一輪候選 | log 節 | MILESTONES 狀態改為「完成」 |

停止條件：達到本次授權的輪數（本次為 3 輪），或某步連續修三次仍失敗（記錄卡點後停下，不硬過）。

## 自我審查清單

1. **地圖上真的發生**：面板上的變化都有對應的地圖行動（走到、拿起、搬運、做完），不直接改數字代替行動。（吸取 Gemini 分支固定戰果、直接設等級的教訓）
2. **守恆**：資源、食物、預約不憑空出現或消失；取消會歸還。
3. **不瞬移**：每 tick 位移不超過速度上限，soak 會檢查。
4. **決定論**：同種子同輸入，結果相同（soak 比對兩次雜湊）。
5. **個性有差**：不同人格在同情境下的選擇比例有可量測差異，並把理由顯示給玩家。
6. **範圍**：只改 `loop-sect/`；沒有存檔；沒有新依賴。
7. **證據不膨脹**：截圖與長輸出寫到 `loop-sect/.evidence/`（已 gitignore），commit 只留 log 摘要。（吸取 GPT 分支證據 1.69GB 的教訓）

## 檢查工具

- `test/*.test.mjs`：Node 內建 test runner，驗單一規則與反例。
- `tools/soak.mjs`：無畫面跑多個種子各數個遊戲日，檢查不變量（無 NaN、不瞬移、資源不為負、需求在範圍內、決定論、沒人長期卡住），輸出一行一種子的摘要。
- `tools/headless.mjs`：用已裝的 Playwright Chromium 開 `index.html`，走玩家正常操作（創角、開始、加速、點選人物、下建造），讀 `window.__sect`（唯讀遙測）斷言，並截一張圖到 `.evidence/`。

## 執行

```sh
python3 -m http.server 8790 --directory loop-sect   # 然後開 http://127.0.0.1:8790/
node --test loop-sect/test/*.test.mjs
node loop-sect/tools/soak.mjs
node loop-sect/tools/headless.mjs
```
