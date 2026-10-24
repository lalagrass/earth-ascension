# earth-ascension雲端PO／review環境

依[D48](DECISIONS_AND_SOURCES.md#d48遊戲po與review預設雲端執行2026-10-25)，用途為遊戲PO規劃、GitHub審查及必要的遠端畫面驗證；[角色交接](CLOUD_PO_HANDOFF.md)／[給Dot提示詞](DOT_GAME_PO_PROMPT.md)。本設定不是Grok HOME01的開發環境或新前置。

## D51：既有環境啟動限制更新

擁有人已批准grass接手純遊戲review／dev合併，[正式規則](GAME_PR_GRASS_TRANSFER_PLAN.md)。原環境不重建；只更新Start skill／用途中的Earth-only／一律不合併文字，install script、工具、唯一repo、必要網路、正式憑證、Only me保持。**實際更新／保存／發布狀態由原設定聊天回讀與#67切換紀錄確認；本文不能冒稱已發布。**

Start skill須先讀最新origin/dev根CONTRIBUTING／AGENTS及移交規則，再核#67生效與唯一active票。只有Earth整合本正式權限PR／必要postCI、Cloud更新實際發布、grass接手收據齊，Earth公布cutover後，才允許grass對非本人主筆的已批准純遊戲PR鎖head正常squash→dev並核postCI。根／共用／混合／權限及main不在此授權；不能force/admin/跳CI。設定啟動不自合PR，只有明確任務才做正常動作，不造空PR試權限。

Cloud task可能沿舊上下文，不假設環境發布會修改正在執行任務；grass收明確新提示詞後核最新契約。保dirty tree與作者成果，不摸Grok工作區／分支；不自啟遊戲、測試、server、輪詢／排程，不擴網路／secret或複製Mac憑證。已有#333 ready證據復用，只核最新差異與整合，#330 M1全done交摘要清理休息；Mac仍只真人。

## 設定規格

| 項目 | 值／要求 |
| --- | --- |
| 名稱 | `earth-ascension 私人遊戲 PO／review`（用途：Sect Chronicle PO／Review） |
| Repository | 只選`lalagrass/earth-ascension`，不附帶其他repo；環境私人Only me，不改repo可見性 |
| 執行位置 | Work in＝Cloud，使用已發布environment；Local／Worktree仍在Mac，不當作雲端 |
| 基底 | GitHub預設分支實為`main`，**日常PO／review必須核當時最新`origin/dev`**；設定時fetch dev並準備dev，不推main／dev |
| 工具 | Git、GitHub連接器或gh CLI、Node22、Python>=3.12；圖稿檢視／烘焙需要Pillow＋NumPy及繁中字型，實際版本列在setup結果 |
| 畫面檢查 | 優先環境已備瀏覽器；缺少時才於雲端安裝單一headless Chromium工具，不改repo依賴／lockfile。只必要時起一個預覽服務／頁，驗完暫停並關閉 |
| Repo安裝 | 根pyproject無第三方runtime依賴；無根package.json，不在repo根執行npm install。Pixi舊spike的package／lock只按需要讀，不為review全部重裝／重跑spike |
| 預設啟動 | **不啟遊戲、不跑全測試、不起常駐server／輪詢器**。setup只版本／可讀存取／路徑輕量冒煙 |
| 網路 | 依環境可用控制，必要GitHub讀寫與套件來源即可；不無理由開所有目的地。GitHub讀寫取現有授權，權限不足回報，不能改走Mac或從本機複製token／登入資料 |
| 秘密 | 不把token／cookie／私鑰寫repo、prompt或log；需要憑證用帳號正式連接／環境secret設定。工具成功clone公共repo不代表已有issue留言／push權限 |
| 合併 | 技術帳號可能可寫，但D51已批准grass純遊戲dev squash；操作須正式權限PR/postCI、Start skill實際保存發布、grass收據及#67唯一cutover。生效前仍Earth；main／根／共用／混合／權限類仍Earth |

GitHub Connector安裝是帳號端授權，與選本環境唯一repo分開；不要因個人帳號還能看其他repo就附加進本環境。沒有本次指示，不修改其他安裝、repo或雲端環境。

## 可貼入環境設定對話的指令

> 建立私人earth-ascension環境，只附加lalagrass/earth-ascension。這是Sect Chronicle遊戲PO/review環境，全部命令和瀏覽器在Cloud，不連Mac；grass純遊戲dev合併依D51與#67正式cutover生效；生效前仍Earth，main／根／共用／混合／權限PR不授grass。repo預設main，但請fetch當時最新dev並以dev準備設定／日常審查。準備Git、GitHub存取工具、Node22、Python>=3.12；圖稿工具Pillow/NumPy與繁中字型，必要headless Chromium只在雲端安裝。環境設定階段不要改repo、commit/push、建立PR或執行遊戲；日後明確授權的PO文件／review／純遊戲整合依最新dev根契約及#67執行；不要在根目錄npm install，不全部安裝spikes，不啟遊戲/背景server或跑全測試。做版本與dev可讀存取的輕量冒煙，記實際版本／成功及缺少的權限。公共repo可clone不代表有寫入權限。設定Install script為可重入的工具準備；Start skill不自動啟服務。保持私人，使用必要網路與正式secret管道、不抄本機token。報告完成後由我在介面確認並Publish；發布後以新Cloud任務核environment／dev／讀取，不動Grok的HOME01分支與工作區。沒有必要不要建立排程或多個review任務。

## 完成判準與狀態記錄

以下三層分開，不能以repo文件PR合併宣稱環境已發布：

1. **帳號授權**：使用者親自完成GitHub App授權；Cloud repo selector確實出現earth-ascension。
2. **環境準備／發布**：設定結果實際列repo／工具／檢查結果；介面顯示已發布並可在環境選擇器選到。將名稱、發布時間、已驗／未驗寫交付，勿貼秘密。
3. **PO接手**：Dot使用已發布環境，回報所選環境、最新dev SHA、可讀repo／issue／PR及缺少權限。只有受影響的review需測才跑，不因接手先重演HOME01。

**實際設定狀態（2026-10-25台北）**：使用者親自完成GitHub授權，repo selector可選earth-ascension；單一repo環境已保存並在UI確認「已發佈」與「僅限本人」；重新載入後，新對話的「雲端／選取環境」選單可選此環境，已選取確認但未送出新任務。這是既有grass Dot可使用的工作環境，**沒有新建第二個Dot，也沒有改動grass現有任務**。發布不等於grass已接手遊戲PO，仍須貼接手提示詞並取得最小回報。

- 遠端設定工作實際執行於Cloud sandbox `/workspace/earth-ascension`，以detached `origin/dev` 7ea5ac38dac6bf41fbf79979773242ba56c2bff3準備；工作目錄乾淨，未改repo或啟動遊戲。
- 已驗Git 2.52.0、gh 2.46.0、Node 22.22.0、Python 3.12.14；Pillow 12.3.0／NumPy 2.3.5與Noto Sans CJK TC載入成功，Install script可重入。工具安裝於repo外`/workspace/po-tools`；既有Chromium 154.0.8037.57未啟動。
- Start skill原核最新dev、保dirty tree、Cloud執行與Earth唯一queue（以下為原發布快照，D51更新狀態另列）；不自啟服務／測試。未來明確授權的PO文件可claim／codex分支／PR，review不改作者分支；必要Cloud臨時localhost可用，Mac localhost不可作review後備。
- 網路保持套件來源與單一額外`api.github.com`，未開全網路、未加secret或複製Mac憑證。Git fetch成功；發布前GitHub API Forbidden，發布後於同一遠端Cloud工作區，repo／issue309／PR326三個API均HTTP200，已無重現網路／API憑證阻擋。只驗讀取，未用試寫留言／push驗證寫入；後續授權文件任務按正式工具能力處理，不把Git clone當API寫入已驗。
- 帳號設定的發布證據與repo文件交付分開；這輪未自動啟grass遊戲任務、排程或另一reviewer。必要Cloud瀏覽器工具與GitHub寫入能力仍須接手時確認。設定對話回覆的「尚未Publish／Forbidden／ACL未驗」是發布前快照，已由實際UI及發布後三個HTTP200結果更新。

## 官方來源

[Cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environments)說明建立、設定、Publish與新任務隔離；[Codex environments](https://learn.chatgpt.com/docs/environments/modes)區分Local／Worktree與Cloud，且本機檔案／程序／登入不會自動搬入；[Dot tasks and memory](https://learn.chatgpt.com/docs/dots/tasks-and-memory)說明切換電腦不會搬移已有任務。依實際帳號UI與權限設定，不杜撰API／環境ID。
