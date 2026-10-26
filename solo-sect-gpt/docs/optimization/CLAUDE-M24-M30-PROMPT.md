# 給 Claude 的串行實作 prompt

以下整段可直接交給 Claude：

---

請接續 GPT 獨立門派遊戲，依序完成 M24→M30；這是有限實作委託，每個 milestone 都要先短 spec、實作、驗收、修補並提交，再進下一個。不要只交計畫，不另派 agent，不開永久 loop；M30 完成就停止回交。

工作區：`/Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension`

分支：`codex/solo-sect-gpt`

本包盤點 HEAD：`fa203b22e2d6efec3c66f3ebcd3b407c6ae4b626`。先核當前 HEAD／工作樹；若已前進，只補相關差異，不退版、不覆寫他人變更。不要清理既有 `.serena/`、`solo-sect-gpt/jsconfig.json`。

先讀根 CONTRIBUTING.md、`solo-sect-gpt/BRIEF.md`、`solo-sect-gpt/docs/optimization/M24-M30-PLAN.md`、M17–M23 交付與相關階段文件、PROGRESS、當前原碼。以 M24–M30 計畫為本次範圍；原 M23 停止線由此有限委託延伸至 M30，其餘獨立實驗邊界保留。只修改 `solo-sect-gpt/`，不修改其他核心、共用目錄、根依賴或 CI，不 push／PR／merge／部署，不對外留言。

公版來源固定為遠端 dev `ef823ac277f48d9426cc3806f74468126a9cf91d`。讀計畫所連固定來源與實際依賴；可按固定 SHA 取得必要檔案，不 merge dev、不追動態 latest。公版 GPT adapter 仍綁 `6cbd3e6...` 舊核心，禁止把 `scene-shared/sources/gpt` 或另一個 model／clock／command loop 載入本遊戲。採用必要純契約／呈現時在本目錄建立來源清單與本地依賴閉包，保留授權／來源，adapter 綁目前核心，不冒用舊 SHA。

依序完成：

1. **M24 活動所有權修補**：取消方向談話不被舊 callback 復活；離開聯合演練後的新切磋不被舊 session 結束／取消清掉。按計畫的正常命令序列建立回歸，檢查雙方狀態、路徑、目標與統計，不只布林值。
2. **M25 補玩法驗收**：守線與前攔的真實用途／代價成立；修無效自主候選重選，證明傷後恢復能回原目標。明確允許原演練有限遭遇參數調整；先登記比較、保留失敗結果，不改全域成長或造假結果。時間窗依真恢復規則安排。
3. **M26 人物／武學公版接入**：沿現有 public-view 與 situation，保留 M20–M22 功能，維持五項 stats、U/F/I、sources 及可見性；命令由現核心重驗，不重建第二套面板核心。
4. **M27 設施卡**：三個既有設施，真實入口／在場與途中角色／物資歸屬／阻塞原因／合法派工。未知容量不填 0，不為公版新增假的排隊機制。
5. **M28 近期紀事**：有界快取與原生事件投影，事件→人物／設施連結；hidden 不能經列、計數、時間或 ID 洩漏；換世界與成功讀檔 reset，失敗讀檔保留原狀。不能反推歷史因果。
6. **M29 有限素材與動作**：來源確認後採少量固定版本本地素材；外觀綁定明確、缺圖回退。保留 Canvas／原生 phase，不換引擎、不生成新圖、不把 idle 圖當全套動畫，不用呈現改角色權限或戰鬥規則。
7. **M30 累積驗收與存讀收尾**：正常 UI 可達的新 showcase、5–10 分鐘路線、各階段證據與限制，手機及完整素材庫延後。

每階段先寫 `docs/optimization/Mxx.md`，列玩家問題、真實來源與目前缺口、修改檔案、權威狀態／保存影響、正反流程、驗收出口及事前比較。實作中可在這個有限範圍內修 bug、調整結構與必要 fixture；不要為了避免做必要工作而只留下 exception。若核心出口確實受權限、產品決策或不可取得依賴阻擋，記具體 blocker 與已有成果後回交，不自行擴大範圍或宣稱完成。

沿既有 CONTRIBUTING／測試政策執行適用檢查，優先受影響回歸、純投影不變性、活動／session 所有權、可見性、資料包與存讀相容。必要檢查不得省略；不因純呈現反覆跑無關長矩陣。模型測試、正常瀏覽器 UI、真人主觀評估分開記，不能互相冒充。測試輸出落檔，報摘要及失敗反例。UI 用空閒隔離埠，避免占用 8800 或中斷他人服務。

新證據放 `evidence/optimization/m24/` 至 `m30/`，不改舊失敗資料。新增持久狀態時當階段就做保存／驗證／相容處理；整體存讀收尾在 M30。一般卡片／紀事暫存不寫入權威存檔。展示檔必須正常流程取得，模型注入 fixture 只能標作測試。

各階段提交範圍內檔案，先有實際 artifact commit，再寫 `handoff/optimization-mxx.done.json`，包含 status、作者 Claude、base、artifactCommit、spec、測試／正常 UI 證據、限制。標記本身可用後續小提交保存，避免填未存在或自我引用的 SHA。未達出口只能 checkpoint／blocked；不能用 turn 完成或未獲接受的 done_with_exception 代替。

最後交 `docs/optimization/DELIVERY-M24-M30.md` 與 `handoff/optimization-m24-m30.done.json`，列各階段狀態、固定來源、本地採用清單、啟動指令／入口、正常 UI 路線／展示檔、驗收與剩餘限制。全部出口通過才總 done。M30 後停止，等待下一次指派。

---
