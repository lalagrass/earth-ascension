# SG-LIFE-01（#279）自主飲水閉環＋手動存讀

依 owner 核准包（M1–M4）在生活開發版 `/demo/` 實作；本頁只記實作內容與證據，規則數值以 `demo/model.mjs` 的 `RULES.drink` 為準。

## 批次1：自主飲水
- 水分：每人 0–100，新局 80，每遊戲秒 −0.5（模型以 1/120 點整數存，每 tick −1，無浮點漂移），≤20 為「想喝水」。
- 飲水站：現有水缸前左側（`routes.mjs` `DRINK`，院中端點出發約 39.7；停工坐著的人從座位沿原座位路接過來）。真走過去，喝 3 遊戲秒；**結算當下**水缸 ≥1 才扣 1、水分 +60（上限 100），否則記「到了水缸已沒水」。不預約。
- 同 tick 只剩 1 份水：人物迴圈依固定 ids 順序（主角→熟手），只有前者成功。
- 取代舊每 60 秒背景扣水：`rules.drink` 存在時不再走 `useEveryMs`；不疊加。舊 checks 中以定時用水當 fixture 的題目明確加 `drink: null`（註解說明語意）。
- 不致死、不降能力；口渴不阻擋工作（水缸 0 時照常挑水補缸，之後才喝），不會兩人都等水沒人挑。
- 優先序：途中一趟先交付；精力 ≤30 先恢復到 80；護院／整理／清鼠（含候補）在身時不去喝；喝水排在出發下一趟之前、休閒之前（休閒中口渴且有水會起身回來）。
- 停工者：坐著且精力 ≥80 可自己去喝，喝完回座位仍停工、不產出。玩家改令取消未喝完的水（走回已走的那段，不扣不加），並暫緩到他真去做下一件事後才再想喝。
- 畫面：面板「水分」條（20 門檻刻度）與原因／下一步、狀態列「口渴，走去水缸／喝水／喝完返回」、喝水時空手站姿＋向量小木杯（`app.mjs` `placeCup`，無新素材檔）。位置由 `routes.of` 取樣，權威 tick 不讀螢幕座標。

## 批次2：手動存讀（`demo/life-save.mjs`）
- localStorage key `earth-ascension:life01-demo:save`，`saveVersion: 1`、`compat: sg-life-01/water-carry-demo`，另存路線長度；不碰 `sect-chronicle-save-v1*` 或 viewer 資料。
- 存完整權威狀態（`model.exportState()`，紀錄保留最近 200 筆；面板仍顯示 5 筆，規則與還原不讀紀錄）。
- 讀檔：JSON → 版本／相容／幾何 → 結構（欄位集合與型別對照新局模板）→ 數值範圍 → 資源／任務一致（在途＝挑擔人數、實存＋在途 ≤ 容量、整理／清理名額與持有者）；全通過才 `model.restore()` 整份替換。讀後暫停、清時鐘、零額外 tick、不重播收穫浮字。
- 沒有存檔、額度不足、瀏覽器拒絕寫入都是一般訊息；寫入失敗不刪舊檔。
- 沒有自動讀／自動存／雲端／離線收益／遷移。
- 遺留（#215）：執行中的 `state.log` 仍無上限（舊 checks 以完整 log 計數），本包只在存檔時截到 200。

## 驗證
- CI：`node --test sect-chronicle/test/life01-demo.test.js`（水分下降、喝水結算與最後一份水、停工自理與取消、存讀逐欄等價、壞檔拒絕／沒有存檔／額度不足）。
- 純模型反例：`node design/life01/drink-counterexamples.mjs`（8/8）。
- 受飲水變更影響的舊局部 checks（`checks/model|water13|boar.test.mjs`）最小調整後通過。
- 桌機真流程（臨時本機服務＋Playwright，結束即關）：`flow/flow-log.txt`；截圖 `flow/1-hero-drink-cup.png`（喝水＋杯子）、`flow/2-panel-water-drink.png`（面板水分／原因）、`flow/3-paused-cousin-stopped.png`（主角改採藥、熟手停工）、`flow/4-after-load-paused.png`（讀檔後暫停、狀態逐欄相同）、`flow/5-bad-save-rejected.png`（未知版本被拒）。
