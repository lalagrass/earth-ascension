# R11–R20：第二批十輪回顧與驗收

主筆 grass / Codex `/root`，Cloud checkout `/workspace/earth-ascension`，分支 `codex/homestead-frontier-feedback`。base `6bdc589de83a40ba92eaa0ad3d80868d2bb394d0`；R19玩法head `84d2ddd`，R20包含整合工具、證據、文字修正與交付文件，最終完整SHA見交付manifest（不預猜文件自身commit）。前十輪與A01–A20均保留且不重算。**本批恰好十輪，完成即停，不開R21。未push/PR/merge/部署/Space/Mac/付費/排程。**

## 玩家得到什麼

- 避戰不再白白打包出門。未打包可在遠征區直接取消，已出門仍真走回退糧；恢復應戰不暗清探行暫緩。
- 飽腹、精力、當前活動與唯一倍率列在常駐標頭；資訊來自原世界，不新增需求。
- 頁面初次載入時預設重要事件降1×，可關閉；真預警/出發/抵源/清源/返家才觸發，不搶焦點，玩家可再加速。最近12個重要經過不被搬運沖掉，明示只本頁/讀檔後，不跨存檔保存。
- 可優先帶已存在的熱飯/拌食/燉菜，缺時明說換現有餐；不因偏好多做一鍋，真吃/退回同身份。新optional欄位只為必要相容，沒有新存檔產品。
- 同行拒絕原因可分辨。備糧開始鎖定本次選擇；希望獨處仍可撤回意願，備糧取消無扣糧、途中解除同行不瞬移，對方真走離。直接生活命令不被避戰抹掉。
- 真A20相容工具不再綁Cloud臨時目錄；缺git歷史明確失敗，不用現在的假舊檔宣稱相容。

沒有加新敵人/配方/建物/地圖/社交鏈/排程引擎。繼續保有真物流、自主安家、守家/練武/清源換安寧的原循環。這批主要回應「看不見／來不及看見／意向不一致」，不宣稱已證明更好玩。

## 逐輪提交與證據

| 輪 | 提交 | 有界交付及驗證 |
|---|---|---|
|R11|cfd3232|避戰P2；正常UI1400s由1包/1退/4耗力變0/0/0；作者不同初修點574/574、575/575全套，最後歸屬補修38聚焦；非作者38/38。|
|R12|badbce1|真556讀取器；作者/非作者非repo cwd+含空白TMPDIR；無歷史明確失敗；正常UI搬首屋木料/暫停/390。|
|R13|6e5389c|置頂需求/活動/速度，作者鍵盤4×/pause、1440/390真圖；非作者源碼/圖/語法。產品回顧一。|
|R14|3943ca2|真事件可關降速；39聚焦，非作者reset補修7聚焦；正常UI720預警、837.5抵源、853.5清源、860.5回家。|
|R15|6caac9c|12項本頁經過；作者真6事件/讀檔同態/新v4提示清除；非作者39/39與reset源碼。|
|R16|c6c6603|備糧取消與真撤回；作者/非作者41/41；正常UIpaused零扣、真打包/退回1。產品回顧二。|
|R17|712a109|路糧優先與身份；作者582/582、44聚焦；非作者44及三餐打包/食用fixture；正常UI真選salad/打包/退回。|
|R18|98c58b4|同一資格解釋，非作者46/46及5184組等價邊界；作者真party至1500.25s。第一次即時文字失敗已修onchange/render。|
|R19|84d2ddd|避戰/暫緩/重考與退邀原子控制；作者/第一非作者52，第二非作者20；兩條P1跨控制拒讀修復。正常UI改向不清暫緩、明允後自然出發/真回家。產品回顧三。|
|R20|見manifest|整體矩陣、真UI同行退邀同拍存讀、可移植交付；下節列實際結果。|

## 非作者究竟做了什麼

`/root/autonomy_review`逐包唯讀審查/聚焦測試/複審；`/root/homestead_review`另做R11–R19累積fresh-eyes審查。不是GitHub平台APPROVE，也不是作者換名字自查。修復皆回主筆。

最重要的發現與修復：
1. 避戰清掉返家後的砍柴／指定料理：依指令歸屬保留生活意向，不能只按trip.phase判斷。
2. 重要提示跨新局/讀檔殘留：切世界清空、非新模式隱藏；取消新局對話不丟原觀察。
3. pending depart時改邀請使任務失格而存讀拒絕；真同行途中選獨處使joined/allowed矛盾，同樣拒讀。兩位reviewer以真R7/R18狀態各自重現，補共享setter與真取消/離開，queued/go/do/source/reload/dt反例通過。不是等下一tick掩蓋無法讀回的paused raw。

作者正常UI另抓到勾同行後文字短暫舊狀態，已即時render。每輪不同範圍證據分開記，見[累積短規格](HOMESTEAD-FEEDBACK.md)。

## 最終適用測試（本版，不借舊570/582充數）

- 作者 `node --test test/*.test.mjs`：**590/590**；完整輸出 `/workspace/deliverables/frontier-R20-all.log`。全套包含既有本篇/舊模式及原正式自主樣本，未跑無關其他產品矩陣。
- 作者 `node tools/homestead-frontier-acceptance.mjs`：**45組×4800世界秒（20日）**，3性情×3方向×fresh/low/full/interrupted/paused，**900每日真loader讀回**；固定指令seed1–5各20000quanta，.25與.1+.1+.05完全同態，三方向1秒tick回放；每quarter資源/料理包/XP/容量/lease台帳，真在途取消、暫停300s不施工。輸出 `FRONTIER-R20-METRICS.json`。min飽腹9.83；min精力0來自低需求fixture初始0，非聲稱所有需求永不為0。seed是指令LCG，世界沒有隨機抽樣，不是概率平衡結論。
- 作者可移植真相容工具從`/tmp`執行，`FRONTIER-R20-COMPAT.json`：舊A20讀自己的4、新版讀真舊4不啟新模式、舊A20拒新5、原raw不改；舊v5缺路糧偏好只補auto，壞值拒讀在單測。
- 第一非作者最終聚焦 **52/52**，並以獨立輸出重跑**同一完整45組/900讀回/5seed/dt矩陣通過**，檔案`/workspace/deliverables/frontier-R20-review-metrics.json`及`frontier-R20-review-matrix.log`；第二非作者另做20項新反例及真UI收據/腳本審查。非作者**沒有**重跑作者590或完整browser，不能當獨立590/UI。
- 真UI R20：零注入、16×與pause混用，1050s前無派工自主安家/耕作/熱飯/練步；真談天/送餐/休息/切磋/教學後，1093.25s備糧退邀並當下UI存讀、1105.75s實同行源頭退邀並當下UI存讀，全世界deepEqual。源頭前後原始快照另離線核對t/雙方XP/位置/stock不變（不是重新模擬）。1113.25s獨自清源，返家，到1500s無新侵擾；1包=1退/0吃。pageerror/consoleErrors[]，390/1440無溢出、paused世界不動，新局對話Escape保留本頁經過。`FRONTIER-R20-UI.json`保存真狀態與操作，第二非作者已讀收據，並非其自己操作。
- `FRONTIER-R20-ENTRIES.json`：作者再跑classic/legacy/plain正常入口，3/3/4且不啟新模式，新提示隱藏、390無橫溢出。最後純文字修正（R11–R20版本標籤、安寧後不再備糧、退隊用目前而非從未）另跑新局smoke/語法；不重跑未變的完整模擬。

## 來源、採用與拒絕

|核對的一手/官方社群來源|實際採用|未採用／限制|
|---|---|---|
|[CDDA活動](https://docs.cataclysmdda.org/PLAYER_ACTIVITY.html)|活動中斷/取消/恢復要還原真狀態，沿原task/物流|未抄GPL程式/加入排程器；讀文件，不是跑該遊戲。|
|[Stonehearth AI](https://stonehearth.github.io/modding_guide/modding_guide/advanced/ai/index.html)|可用條件與真正執行同源、需求中斷/預約仍有效|不移植商業本體，不擴村民系統。|
|[Factorio官方wiki Alerts](https://wiki.factorio.com/Alerts)|可配置重要提示與持續狀態分開，玩家仍可控制|官方wiki是社群維護文件；沒有把其短通知時長或設計當所有玩家共識，不抄內容/音效。|
|[AgeII可用性](https://www.ageofempires.com/age-ii-de-accessibility/)|最常用資訊與操作容易取得|不等於完整無障礙驗收，不加大RTS引擎。|
|[TinyLife FoodType](https://docs.tinylifegame.com/api/TinyLife.Skills.FoodType.html)/[Relationship](https://docs.tinylifegame.com/api/TinyLife.Relationship.html)|真料理身份/效果、主角想邀不等對方可同行|公開API不是商業本體開源，不抄程式；不擴關係樹。|
|[Node tmpdir](https://nodejs.org/api/os.html#ostmpdir)/[W3C status](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)|標準臨時路徑、重要結果status且不搶焦點|未測Mac/Windows/輔具，只Linux跨目錄/含空白路徑；沒把每tick需求當live訊息播報。|

本批沒有新增第三方程式/素材/依賴；既有PathFinding MIT子集與授權/provenance原樣保留。使用者提供前版570/570與739s安寧觀察只是外部回饋線索，不假稱本作者跑過，也沒讀到Mac私有報告/缺失截圖。來源比較是文件/部分程式研究，不是外部遊戲執行或性能量測。

## 限制與下一步

真人喜好/理解/願不願再看、完整輔具、真Safari/手機、其他OS未測。Firefox/WebKit原官方下載域`cdn.playwright.dev`、`playwright.download.prss.microsoft.com`政策403仍受阻，未重試/換途徑。本版仍只有一個家、一種敵人、一位同伴、一處獸徑，不是完整16型/門派/自由建築或世界地圖。新5依然沒有本篇轉接契約，預覽誠實拒絕，舊轉接功能未擴張。

下次只建議3–5位每人20–30分鐘探索：是否看得到想看的發展、降速預設是否干擾、能否預測避戰/暫緩/同行與路糧選擇。依原話再決定產品；不是市場結論。**不自動開始下一輪。**

## 狀態矩陣

|通過|590單測、作者/非作者45×20日/900讀回/5seed、52聚焦、真UI完整路線/存讀/鍵盤操作、3舊入口、可移植真舊reader|
|---|---|
|已修復，不列殘留失敗|避戰空跑/生活指令被清、跨世界提示、同行即時文字、備糧/途中退邀拒讀|
|受阻|Firefox/WebKit官方下載政策403，未重試或繞過|
|未測|真人好玩/理解/長期留存、全鍵盤/輔具使用者、真Safari/手機、Mac/Windows、遠端CI/性能成本|

## 真圖與試玩

[R12原操作位置](shots/frontier-R12.png) → [R13需求/活動/速度](shots/frontier-R13.png)、[390窄圖](shots/frontier-R13-narrow.png)。
[R14重要事件降速](shots/frontier-R14-clear.png)、[R15真經過](shots/frontier-R15-history.png)、[R17路糧](shots/frontier-R17.png)。
[R20真同行源頭](shots/frontier-R20-source.png)、[安寧](shots/frontier-R20-peace.png)、[窄屏](shots/frontier-R20-narrow.png)。主流程圖在最後版本字幕修正前產生，玩法/資源規則相同；[最新字幕新局smoke](shots/frontier-R20-smoke.png)另外保留。

[可移植啟動/短流程](HOMESTEAD-FEEDBACK-RUN.md)。交付只留Cloud本地ZIP/patch/manifest，並非已上傳附件。SHA與下載/發布仍須使用實際交付記錄，不能把Cloud路徑當別台機器已有檔案。
