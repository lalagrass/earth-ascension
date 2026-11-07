# 診斷腳本

這些工具只供按需量測，不由 `test/run.sh quick` 執行。從 `solo-sect/` 執行 `node tools/diag/<檔名> [參數]`；需要較細步長時設 `SS_DT=0.25`。舊參數用法見各腳本開頭。

| 檔案 | 用途 |
|---|---|
| `diag-8p.mjs` | 八人規模的每日狀態、心情與資源分箱 |
| `diag-ab-sum.mjs` | 彙總 diag-ab 的配對輸出 |
| `diag-ab.mjs` | 同種子對照規則開關的戰鬥與經濟 |
| `diag-boar.mjs` | 統計野豬入院、哨崗與菜園損害 |
| `diag-coin-first.mjs` | 追蹤首場剿寨的錢與亂數來源 |
| `diag-combo.mjs` | 組合早期規則開關的摘要 |
| `diag-grow-macro.mjs` | 長日程成長分層效果 |
| `diag-grow.mjs` | 固定武學狀態的造詣成長 |
| `diag-hunger.mjs` | 逐時間段追蹤餓、食物與活動 |
| `diag-hurt.mjs` | 比較江湖事件有無時的受傷來源 |
| `diag-lair-calib.mjs` | 山寨戰力與抽樣校準 |
| `diag-letter.mjs` | 統計挑戰帖與應戰結果 |
| `diag-master.mjs` | 統計過路高人傳功及阻因 |
| `diag-mfit.mjs` | 比較因材施教開關 |
| `diag-moodcap.mjs` | 檢查心情目標碰到上限的原因 |
| `diag-need.mjs` | 按身份與活動拆解需求不足 |
| `diag-ng-hunt.mjs` | 狩獵中內功進展與效果 |
| `diag-prof-hunt.mjs` | 狩獵中專業技能使用 |
| `diag-readwu.mjs` | 有藏經閣時比較讀武學 |
| `diag-routes.mjs` | 同等練功時數的專精路線比較 |
| `diag-toggle-sum.mjs` | 彙總 diag-toggle 的逐局輸出 |
| `diag-toggle.mjs` | 逐局輸出單條規則開關配對 |
| `diag-v22.mjs` | v2.2 每局三十日基準摘要 |
| `diag-v225.mjs` | v2.25 商隊與經濟逐局摘要 |
| `diag-v23.mjs` | v2.3 名俠、專業與內功逐局摘要 |
| `diag-v24-v25.mjs` | 各策略與門派的平衡輸出 |
| `diag-wage.mjs` | 逐月追蹤俸給與欠俸離山 |
| `par-8p.mjs` | 分段啟動 `diag-8p.mjs` 並合併原始累計。 |
