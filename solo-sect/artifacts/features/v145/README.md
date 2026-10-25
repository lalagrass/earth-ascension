# artifacts/features/v145
- `test-full.log`：`node --test test/`（於 solo-sect/）在 v1.45 commit 的完整輸出，205/205 通過。
- `flow-ui-v145.mjs`：真實 UI 點擊流程（新局郭靖＋黃蓉 → 16× → 遇大事卡按「繼續」→ 巡山面板 → 勾 2 人＋巡山令「溜走」→ 派出 → 里程軸／竹簡 → 戰報返程驚獸 → 點竹簡推鏡到弟子卡）。只點按鈕、下拉、勾選；沒有用程式改遊戲狀態（暫停用 ⏸ 按鈕）。
- `flow-ui.log`／`flow-ui-result.json`：輸出 8/8 PASS。`top-alert.png`：A 級大事暫停畫面（該次有出現才會存）。
- 種子：瀏覽器新局用 `Date.now()`，流程無固定種子；「至少一段驚獸」是實況記錄，非必然。
