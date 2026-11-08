# 成就與時間線（#488 成就一）

`src/achievement-record.mjs` 以 WeakMap 旁帳觀察既有 `recordDeed`、`log`、`recordRumor` 與圖鑑 `seeEnemy` 的真正擊倒。每種事件記總次數、首次日、首次人物、逐日次數與單日最大次數。旁帳不寫入 `s`，不抽 RNG，不改任何獎勵或交手。UI 存檔另帶 `uiAchievementRecord`，讀檔時還原旁帳並刪去臨時欄位；工具只在本次模擬記錄。舊存檔原本沒有完整歷史旁帳，已被裁掉的事蹟與過期傳聞無從準確重建；畫面標明不完整，且不把讀檔當日現有武學或立匾資格冒充首次發生。

`milestones.mjs` 的 `MILESTONES` 將已有事件鍵對應到人可讀的經歷；門派和個人時間線與 `playability-report.mjs` 讀同一張表。`achievements.mjs` 的 `ACHIEVEMENTS` 是二十個 `{id,name,kind,when}` 資料列，四類為進度、挑戰、生活與隱藏；`when` 只給事件鍵和累積次數。達成日是事件累積跨過門檻的當日，隱藏項達成前不列。成就不提供任何數值獎勵。

個人年表用人物 `id` 區分同名者。原日誌只有文字，兩人同名時不能從字串可靠判定是哪一位，因此該筆只記門派事件，不猜個人歸屬；事蹟與圖鑑擊倒有明確人物參照，仍可分開記。

這輪沒有新增玩法常數或隨機公式。二十項是 #488 指定的 15–25 項範圍內的內容量；門檻 1、2、3 分別表示首次、再做一次及三次，均由該項描述語義決定，非平衡乘數。既有 `RULES_VERSION` 與 golden 保持原樣。

參考：[Cataclysm DDA 的事件串流、統計及成就資料列](https://docs.cataclysmdda.org/JSON/JSON_INFO.html#scores-achievements-and-conducts)；[Dungeon Crawl: Stone Soup 伺服器的 milestone 顯示](https://github.com/crawl/crawl/blob/master/crawl-ref/source/webserver/README.md)。借其以事件統計呈現經歷的概念，不複製數字、文案或程式碼。
