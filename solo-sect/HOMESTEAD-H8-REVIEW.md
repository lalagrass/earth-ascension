# H8：需求恢復、鍵盤操作與瀏覽器驗證

基線9114aa9；Cloud隔離實驗。沒有推送、合併、發布或上傳。驗收原則見 HOMESTEAD-H8.md。本輪可執行工程已完成；Firefox/WebKit因環境網路政策阻擋，跨引擎驗收尚未完成。

## 挨餓原因與修正

H7勤勞獨居重現：t1140精力100、飢餓24.15、倉庫11飯，仍在寢舍夜眠。舊規則夜裡不結束休息，到t1200天亮才醒，飢餓只剩3.15；t1209降到0，t1211吃完才恢復。這不是沒飯，也不是勤勞特質扣糧，而是夜眠不響應飢餓，之後又有路程／用飯時間。

現在只對荒居起源角色：休息中飢餓不高於28且倉內真有飯時，取消休息、釋放床位，走原路去用飯。沒有瞬移或加飯；到原活動完成時才扣一份。性情打分不變，普通本篇原規則維持。缺糧時不會空造飯，仍須自行種菜烹飪。

六路各三日，原起始2飯、木屋，其餘採既有預設。下列「產／吃」為三日累積，必須滿足 `2＋產－吃＝末日庫存`。

| 路線 | 最低飢餓 | 最低精力 | 三日日終飯存 | 產／吃 |
|---|---:|---:|---|---|
| 喜靜獨居 | 24.325 | 23 | 8／10／12 | 21／11 |
| 喜靜學徒 | 16.975 | 24 | 10／12／10 | 30／22 |
| 健談獨居 | 23.8875 | 27 | 8／10／9 | 18／11 |
| 健談學徒 | 12.9375 | 31 | 10／12／10 | 30／22 |
| 勤勞獨居 | 15.7125 | 24 | 8／12／9 | 18／11 |
| 勤勞學徒 | 14.25 | 23 | 10／12／10 | 30／22 |

另各跑起始0飯低庫存、玩家中斷、玩家中斷＋中途存讀，共24路各7200tick／1800秒。全24路最低飢餓9.725、精力皆大於0、飢餓為0秒數皆0，每人實際吃睡，沒有途中補發debug物資。完整逐日糧／菜／木、各人需求與食物收支見 [HOMESTEAD-H8-METRICS.json](HOMESTEAD-H8-METRICS.json)。中斷＋重載和同流程不重載的逐日結果一致。此為固定情境首三日工程量測，不是所有開局／長期平衡證明。

## 鍵盤與存檔驗證

預演改為具名原生dialog，背景inert，焦點先在標題；Enter在標題不會確認。Tab／ShiftTab循環，Escape與可見取消按鈕均關閉並返原按鈕。起始畫面具名、背景inert、內部鍵盤循環；新增scroll避免低視窗截斷。動態重畫後保留生活指派、選槽／匯出及教學控制的焦點；藍色focus-visible outline明示位置。槽入口有包含槽號的標籤，匯入／錯誤有live status；錯誤訊息Escape可回檔案輸入。沒有刪除動作或全域Enter確認快捷鍵。

作者Chromium154.0.8037.57／Playwright1.62.1：只用Tab、ShiftTab、Enter、Space、Escape操作預演／取消／確認／選槽／匯出／匯入／回復／教學。模態期間測背景不能鍵盤操作，標題Enter無寫入，取消後原槽不變；教學toggle焦點跨重畫仍保留。真下載JSON寫入測試磁碟後匯入新瀏覽器並重載；清理失敗回復檔亦實際下載再匯入。OS檔案選擇器由Space開啟後，Playwright供給測試檔案；沒有聲稱自動化操作了真OS選檔視窗的每個按鍵。另重跑快速雙擊、雙槽／提示隔離、取消／返回／重載、QuotaExceededError、回讀不符和清理失敗訊息；本篇手動與三自動槽sentinel位元不變，無頁面錯誤。沒有觸碰真人資料。

截圖：[鍵盤預演與焦點](shots/homestead-h8-keyboard.png)、[雙槽](shots/homestead-h8-slots.png)、[回復訊息](shots/homestead-h8-recovery.png)。

聚焦＋回歸77/77：H8新增3、前輪74。包含原本篇30與荒居/H6/H7相容、備份與失敗測試。獨立reviewer已驗六路中途存讀、低糧六日、dialog/start焦點與提示控制；找到原生dialog在Tab邊界會短暫落到body，作者加dialog局部Tab邊界處理後獨立Chromium確認heading/first/last/單一返回按鈕與Escape返焦點。Reviewer最終再跑完整77/77與diff檢查，並檢視鍵盤／雙槽截圖及24路量測，未留具體缺陷。

## 跨引擎阻擋與未驗

| 引擎 | 實際狀態 |
|---|---|
| Chromium154.0.8037.57 | 上述自動化通過 |
| Playwright Firefox153.0／build1538 | 官方install下載遭HTTP403 `Domain forbidden`，exit1，未安裝／未執行 |
| Playwright WebKit26.5／build2336 | 官方install下載遭同樣HTTP403，exit1，未安裝／未執行 |

受阻目標：`cdn.playwright.dev/dbazure/download/playwright/builds/firefox/1538/firefox-debian-13.zip`、`.../webkit/2336/webkit-debian-13.zip`，官方工具自帶的`playwright.download.prss.microsoft.com`備援亦403。這是環境網路政策拒絕，不是遊戲測試失敗，也不是auto-review寫檔拒絕。沒有改走Mac、非官方下載或代理繞過；未改repo依賴。

仍未做：真人試玩／螢幕閱讀器、Firefox/WebKit實際流程、真機Safari/mobile、完整WCAG審計、真磁碟與電源故障、跨程序恰好同時寫入的原子性證明、全庫CI。

## 一手資料對照與取捨

1. [W3C APG dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)：採標題初始焦點、背景不可操作、循環Tab、Escape／可見取消與焦點返回；不把標題Enter當確認。不宣稱加role就等於完整可存取。
2. [Playwright browsers](https://playwright.dev/docs/browsers)與[accessibility testing](https://playwright.dev/docs/accessibility-testing)：用官方引擎安裝與真實狀態走查，公開每個引擎版本與失敗；其文件也提醒自動化不能取代手動／包容性使用者測試。本輪未裝額外掃描框架，未以Chromium冒充WebKit或真機Safari。
3. [Xbox XAG112 UI navigation](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112)以Grounded、Sea of Thieves等例子說明鍵盤操作與一致焦點。借可見且可預測的進入／返回順序，保留原生按鈕、輸入和連結；沒有移植遊戲程式或設計大型控制器重映射。這是文件比較，未在本環境遊玩那些遊戲。

## 後續只做尚缺的驗證

目前沒有證據支持再擴作物、角色或門派。下一步是：環境可取得官方Firefox/WebKit後，對同一備份／復原／鍵盤矩陣補驗；若仍403，保留受阻紀錄。再安排真人與螢幕閱讀器走查，針對實際發現的問題另立小修包。沒有預先製造H9功能，本輪沒有開工下一系列。

真人腳本（未執行）：不碰既有資料，先Tab進荒居並轉接；朗讀／理解住處和藥田差異；不按確認先Escape，再重開確認；獨居生活到第三日觀察需求；只用鍵盤收合重看教學、匯出JSON、用乾淨瀏覽器匯入並重載，核對角色和糧存。請記錄焦點看不見、返回位置不對、失敗訊息聽不到及難理解處；最後明確記人、裝置／瀏覽器／輔具和實際結果。
