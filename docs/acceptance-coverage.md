# M1 驗收與測試覆蓋

本表區分五項 Python `unittest`、獨立 HTTP 操作、以及 Chrome 實際 UI 操作。HTTP 回傳成功不代表 UI 已驗證。

| 驗收要求 | 五項測試實際覆蓋 | 其他驗證 | 仍未測或限制 |
|---|---|---|---|
| Dashboard 啟動與六頁 | 無 | Chrome 看見六頁；HTTP GET `/` 200 | 其他瀏覽器、不同螢幕尺寸未驗 |
| 建人、點數、16 題、最多三人 | `test_character_budget_and_limit` 測錯誤點數、缺題、三人上限 | Chrome 建立 35 點人物並作答 16 題；HTTP 建立 30 點人物 | 40 點 UI 操作未測；題目心理效度未驗 |
| 手動推進與 NPC 自主行為 | `test_unattended_60_month_consistency` 檢查無玩家推進、成長與關係；`test_fixed_seed_reproduces_rule_result` 比對 12 月結果 | Chrome 按鈕推進 13 次並看到決策；HTTP 另推進 12 月 | 重大 Tier 2 決策未實作 |
| 世界持續變化與一致性 | `test_unattended_60_month_consistency` 驗證 60 月、趨勢、技能與關係；每月呼叫 `validate_world` | Chrome 看趨勢與組織狀態；HTTP 12 月範例 | 真實人口、經濟與靈氣校準未做；原子性故障注入未測 |
| 存檔、重啟、避免重複 | `test_atomic_restart_and_duplicate_guard` 檢查重新開啟 Store、歷史月、重複拒絕 | HTTP 服務重啟後保留第 12 月；舊月份推進回傳 400 | 未做斷電／程序中途終止測試 |
| 死亡後歷史與事件因果 | `test_dead_person_history_is_retained` 強制高齡死亡後保留紀錄 | Chrome 看人物歷程與來源；HTTP 查歷史快照 | 未涵蓋所有事件種類與長期因果品質 |
| 固定 seed 重現 | `test_fixed_seed_reproduces_rule_result` 比對同 seed 12 月完整 JSON | 20 seed 點數／人格趨勢實驗 | 規則版本跨版遷移未測 |
| 產品可玩性實際 UI | 五項測試皆無 | Chrome 完成建人、測驗、投放、連續推進、觀察決策、生命歷程、世界回放並截圖 | 尚未做自動化 UI 回歸、鍵盤操作與可及性稽核 |

完整操作紀錄與 JPEG 截圖見 `artifacts/ui-verification.md`；周映月的瀏覽器 12 次推進結果見 `artifacts/ui-12-month-example.md`。五項測試不代表全部原始願景已完成。家庭、人格隨事件演化、知識傳播、靈氣地區流動、真正 LLM 決策及小說生成仍屬未實作。
