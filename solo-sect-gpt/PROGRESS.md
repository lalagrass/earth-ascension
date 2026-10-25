# 優化進行中：M1→M6

2026-10-26新增授權；單一作者GPT / Codex，GPT-6.1 Sol / high。原第一版交付仍有效，`handoff/development.done.json`保留不動。新優化從`cd38a44eac1afe5e1c508cfcbbbede7c0a6b5786`開始，各階段有新spec、正常UI證據與checkpoint；M1/M2計畫見`docs/optimization/M1-M2.md`。完成M6才總結，沒有push／PR／合併／部署。M2首輪runtime `65e0506`已通過13項政策＋54項舊回歸及16個正常UI狀態；補缺料反例時主動中止250.764秒候選，未宣稱20分鐘完成，已修提示。306650c探索270.12秒再中止作邊界修補；目前18項政策／保存／在製品交接案例、54舊回歸與最終正常UI均過，等待新候選封存。根Python53／SG dev383已通過。M3–M6尚未開始。M1已完成，runtime `6273e2682b32c1b56e3181f681afbd5e48e0fdac`，正常UI與橋行走索引見`evidence/optimization/m1/index.json`。

---

# 開發完成紀錄

2026-10-26；GPT / Codex，GPT-6.1 Sol / high；作者自校，非獨立review。

軟體第一版SL0–SL7已完成驗收。完成commit與可核索引由 `handoff/development.done.json` 指向，只有該標記是目前交付狀態；早期checkpoint已歸檔，歷史失敗及修補證據完整保留。

- 正常UI：U01主線立匾、U02保糧後返洞救人、U03成年雙意願家庭與五人十節點／mature一進一出、U04三經典主角替代節點、U05橋／召回／真正戰敗救援／九劍距離與樹幹LOS／短起手及佯攻／壞檔保護。
- 模型：49項整體回歸＋4項末輪合約＋部分履約／器械前置各1，55個不同案例通過。五seed每千tick重播、九狀態各續6000tick、三人失能／滿訪客／橋繩、原子預約／群體取消與原地成品守恆都可核。
- 呈現：341程序素材ID／來源hash，1440×900及1280×800自校；睡眠／分層屋頂／器械／出招、庫存／預約／手持／來源數量可讀。
- 效能：M2／8GiB／Chrome156，8常住＋2客、3人外出、4訓練對手，4倍600模擬秒約3.996倍、frame工作p95 13.9ms、最大間隔約167ms。故意阻塞瀏覽器2.2秒另驗經過時間不丟棄，不混入正常成績。
- 保存：手動、auto3輪換與各槽讀取、正常匯出／預覽取消／確認、刷新、壞檔及quota保護；未碰其他產品key。
- 範圍：僅solo-sect-gpt；沒有push／PR／merge／部署／8800或原checkout修改。已關閉自開8877及UI測試driver。

明示界線：未真人試玩、未獨立review、代理未聽驗音效；音訊產生／解鎖／靜音／音量訊號及視覺時機有驗證。公開IP清理及main／manual發布矩陣不在此次私人本機交付範圍。數值與節奏觀察見 `evidence/development/release/calibration.md`，不以五seed宣稱平衡分布成立。

所有規劃／spec來源與ready標記保留。開發在done後停止寫入，不自啟下一章或其他聊天。
