# H8 剩餘驗證與接受矩陣

本輪基線0eba4da；只續做可用工具能完成的H8補驗。未重試Firefox/WebKit下載，未繞鏡像、代理、executor或Mac；未上傳、發布或新增玩法。

## 補查發現與修正

原本篇轉接存檔寫入失敗只用兩秒toast，Chromium實測其role／aria-live皆null。現在預先建立成功狀態區（role=status、polite、atomic）與持續的存讀錯誤區（role=alert、atomic）。失敗不搶焦點，重複視覺toast對輔助科技隱藏以免重讀。錯誤只由相關存讀成功或切換遊戲context清除；無關匯出不當成錯誤已解決。這是DOM語義與可見狀態驗證，沒有宣稱真人輔具已朗讀。

獨立reviewer指出初稿會被無關成功toast清掉，且泛用遊戲錯誤會污染存檔錯誤區；作者將持續區改成saveRelated明確選用。Reviewer再指出改開普通新局仍留舊錯誤；作者在exitTransferMode清除已失去context的訊息。作者重驗失敗→匯出→重試，以及失敗→普通新局，原轉接槽位元不變。

## 接受矩陣

| 項目 | 狀態 | 證據／界線 |
|---|---|---|
| 需求、24路三日、存讀及物資回歸 | 通過（復用） | 0eba4da的77/77；本輪沒改模擬／存檔規則，未無理由重跑整組 |
| Chromium鍵盤與實際備份復原 | 通過（復用） | H8回顧已記完整走查；本輪新增檢查不取代原證據 |
| 初始具名dialog、背景inert、重複ID | 通過（新增） | Chromium154.0.8037.57，具名起始畫面且ID無重複 |
| 本篇存讀錯誤語義 | 初測失敗→已修復通過 | 原toast無role/live；現在有預建status和alert |
| Quota錯誤、超過2秒仍可讀、焦點保留 | 通過（新增） | 注入單次QuotaExceededError，還原後舊槽相同，無頁面錯誤 |
| 匯出不清除未解決錯誤、相關重試清除 | 通過（新增） | 實際按匯出並取得下載，再成功存檔確認訊息更新 |
| 回讀不符、最後有效存檔、舊手動／三auto隔離 | 通過（新增） | 注入wrong bytes，還原後逐位元一致；未碰真人資料 |
| 新局／context變更清掉過時錯誤 | 通過（新增） | 失敗後開普通新局，alert清空、原轉接槽保留 |
| Firefox153/build1538 | 受阻 | 既有官方安裝HTTP403；唯讀inventory顯示未安裝；本輪未重試 |
| WebKit26.5/build2336 | 受阻 | 同上，未執行跨引擎流程 |
| 真人／螢幕閱讀器／真機Safari或mobile | 未執行 | 不能從DOM語義或Chromium推論真人體驗 |
| 真磁碟／電源故障、跨程序原子性、全庫CI | 未執行 | 超出已驗證情境，沒有擴大聲稱 |
| 私人Space上傳 | pending／未執行 | 先前拒絕後仍無新同意，未採其他交付途徑 |

本輪重跑的檢查限於變更處：main.mjs語法、diff檢查、Chromium語義／錯誤／重試／focus及位元保留。獨立reviewer用新Chromium重驗過期存檔、focus保留、錯誤語義、匯出不清除、新局清除及原槽位元，未留具體缺陷；核心77/77保留為未受影響基線證據。

## 精確受阻目標（既有紀錄，沒有再次請求）

官方host：`cdn.playwright.dev`、`playwright.download.prss.microsoft.com`。

- `https://cdn.playwright.dev/dbazure/download/playwright/builds/firefox/1538/firefox-debian-13.zip`
- `https://cdn.playwright.dev/dbazure/download/playwright/builds/webkit/2336/webkit-debian-13.zip`
- 官方安裝器所用`https://playwright.download.prss.microsoft.com/dbazure/download/playwright/builds/...`亦被403 `Domain forbidden`拒絕。

原安裝命令exit1，沒有成功的引擎二進位。唯讀確認`/tmp/h8-browsers/firefox-1538/firefox/firefox`與`/tmp/h8-browsers/webkit-2336/pw_run.sh`不存在；PATH僅見Chromium。這是環境網路政策拒絕，不是auto-review拒絕寫檔。

## 來源復用與最小下一步

沿用H8的W3C APG、Playwright及Xbox XAG112比較。此具體狀態訊息缺口補看[W3C狀態訊息4.1.3說明](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)：採可程式辨識的成功／錯誤語義，保留操作焦點；沒有據此宣稱完整WCAG符合或實際輔具朗讀通過。

只剩兩類必要動作：環境擁有人自行處理上述官方host政策，並給出新的明確重試許可後才重跑既定跨引擎矩陣；真人／輔具使用者按H8既有腳本走查並回報實際問題。沒有證據支持新內容里程碑，現在不開始H9。
