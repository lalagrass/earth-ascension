# H29–H30交付：讓這間小家有自己的樣子

2026-10-30 UTC；主筆 Cloud Codex，非作者 `/root/homestead_review`。base `e081f2b464fabfe75b01b127d460b07f159f03be`；分支 `codex/solo-sect-homestead-h29-h30`，事前規格53e0211、H29功能4eebbc3、H30功能3e8a743，最後修復與證據另有本地提交（精確交付HEAD隨報告／manifest）。原H28及已發布H26分支保留。**本輪未push、未上傳、未PR／merge／部署，未操作Mac。**

## 完成的兩包

- H29：首屋後可選原木／苔綠／赭紅；屋頂、檐線、門框及修繕屋窗框可見改變，仍保留簡屋草紋／修繕瓦紋。只改這間屋的表現，原木保持原色。不改材料／技能／需求／活動／路徑。
- H30：可選填12個Unicode字元內的小家名稱，場景與概覽一起辨認；不改主角名字。NFC、去首尾空白；文字／數字／空格／間隔號／連字號白名單，markup、控制／方向控制字元、emoji及超長輸入拒絕，不截半個surrogate。DOM用textContent，Canvas只畫文字。
- 收合的「小家的樣子」放在既有家園概覽；靜態輸入元素不隨250ms重繪重建。預覽不寫world，套用才改look；取消、Escape、收合、讀檔、新局清草稿，焦點回合理入口。恢復原貌也先預覽、再套用。世界仍依現有速度走，明示不自動暫停。
- 只用既有JSON序列化加小欄位 `look:{style,name}`；v1/v2/v3缺欄位原貌空名，私有H29單style欄補空名。非法資料拒讀；legacy僅原貌／空名且藏編輯器。沒有新存檔UI、槽位、同步、備份等工作。
- 轉接預演明說家名／配色**不成為本篇家園屬性**；原荒居仍保留，來源receipt仍含原始JSON。候選本篇除既有來源收據外完全相同，不暗示收據bytes沒有名字。

## 玩家可重走的短流程

repo根 `python3 -m http.server 8798 --bind 127.0.0.1 --directory solo-sect`，開 `http://127.0.0.1:8798/homestead.html`。

1. 一個人新局；先立簡陋木屋，讓主角採果／備柴／搬料／施工。首屋前外觀編輯停用。
2. 屋好後開「小家的樣子」，試配色及家名；Escape看取消，再重開套用。可隨時用原有暫停按鈕仔細看，不耗物資。
3. 繼續菜園、露天灶、長凳、花叢與修繕。取捨仍是日常生活與工程，不為換顏色造更多屋／練XP。
4. 世界安穩時清指派自主生活。家名／配色可以再改，原貌也合法，不把客製化清單當通關要求。

## 真實畫面與測量

[正常UI收據](HOMESTEAD-H30-UI.json)、[可重跑工具](tools/homestead-look-browser.mjs)。作者Chromium154.0.8037.57／Playwright1.62.1，**零物資／XP／狀態注入**，只讀debug作斷言；腳本混用暫停／16×，壁鐘45.583秒，不是1×耗時、真人試玩或平均完成時間。

| 停點 | 世界秒／日 | 實際結果 |
|---|---|---|
| 首屋 | 100.75／第1日 | 自然採果、砍柴、搬料與5木建屋 |
| 鍵盤套用／取消／草稿存讀 | 同100.75 | 苔綠預覽不改state；Escape後選赭紅、家名「青禾小築」；預覽另一家名時既有存檔只存已套用資料 |
| 接續生活 | 669.25／第3日 | 菜園、灶、長凳、花叢、修繕屋完成，自主閒暇；飢餓75.305、精力65.95 |
| 同狀態配色／12字家名 | 同669.25，暫停 | 原木→苔綠7906像素、原木→赭紅7898像素不同，全在屋舍區；畫布外區0差異，世界state完整不變 |
| 原貌套用／頁面重載 | 同669.25 | 除look外完整state相同；經既有存檔resume回原貌 |

首屋同視角：[原木](shots/homestead-h29-natural.png)、[苔綠](shots/homestead-h29-moss.png)、[赭紅](shots/homestead-h29-ochre.png)。完整小家：[已套用家名與生活](shots/homestead-h30-home.png)。修繕屋同停點：[原木](shots/homestead-h30-natural.png)、[苔綠](shots/homestead-h30-moss.png)、[赭紅](shots/homestead-h30-ochre.png)；[390寬編輯畫面](shots/homestead-h30-mobile-width.png)是桌面Chromium視窗寬度，不是真機手機。圖片皆實際瀏覽器，非生成稿；窗框補修後已重拍H30所有圖及正常路徑。

## 驗收矩陣與證據界線

| 狀態 | 本輪實際檢查 |
|---|---|
| 通過 | 在solo-sect：`node --test test/*.test.mjs` **438/438**，21.70秒；完整輸出 `/workspace/deliverables/homestead-h30-tests.log`。包含原本篇／legacy／轉接與長程矩陣，不把舊432直接改稱本輪。末次只再加own-style欄位guard／反例，重跑受影響look **6/6**；其餘聚合檔未變，復用該438結果。 |
| 通過 | `node --test solo-sect/test/homestead-look.test.mjs`：3性情從零、低糧立屋並接續四項工程，各20日，逐拍移除look後**完整state相同**；每47拍換色／家名、每503拍讀檔也不改原自主／工量／資源／XP／位置／日常。這是呈現無副作用對照，不宣稱新平衡。原48路20日及五seed各20000拍等仍隨聚合重跑，不另編造新48路數值。 |
| 通過 | v1/v2/v3缺欄／H29短欄位、合法新欄、未知style／額外欄位／非字串／legacy客製化拒讀；NFC、12非BMP字、13字、HTML／方向／控制字元；預演白名單與來源不變；純renderer不改state。 |
| 通過 | 作者完整UI、鍵盤Tab／Enter／Escape、重繪600–750ms不吃字、快速關閉重開、reset／cancel／save／load／reload；1440與390寬無橫向溢出，pageerror空。原有暫停時t不變，外觀不開建造／指派。 |
| 通過 | 非作者實跑look6/6、獨立Chromium兩寬度**正常新局首屋零注入**，12非BMP／13字與markup、鍵盤／焦點、預覽存檔與轉接提示；修繕窗框則用隔離fixture像素核對（不是自然升級流程）。未獨立重跑作者45秒全路徑或全部438，勿合併冒稱。 |
| 通過 | 改動mjs語法、git diff --check、文件本地連結、交付文字patch實際套到base並核變動檔bytes。 |
| 失敗 | 無剩餘已知阻擋；發現過的問題見下節，均修復，不掩蓋失敗初稿。 |
| 受阻 | Firefox／WebKit未安裝，先前官方下載cdn.playwright.dev、playwright.download.prss.microsoft.com政策403仍有效；未重試／換端點／proxy／executor／Mac。 |
| 未測 | 真人對外觀／命名的理解與美感／樂趣、OS級中文IME、輔具使用者、真機Safari／手機、其他瀏覽器引擎、外部參考遊戲的執行／效能；390只驗viewport。沒有改其他產品，不跑Earth／sect-chronicle無關全矩陣；無遠端CI／發布。 |

## 審查與修復

1. 作者第一輪UI發現details toggle事件可在快速重開後重設草稿：改summary同步開始草稿，toggle僅缺草稿時初始化；取消／再開／套用正常UI反例通過。
2. 作者單測發現null名稱與驗證失敗sentinel相等，可能通過：加明確string檢查；非法資料拒讀與setter不改狀態通過。最後也加own-style，拒繼承style＋額外own欄的直接API畸形物件。
3. 非作者P3：承諾門窗配色但stage2窗仍棕色。補非原木窗框／中線；原木保持原#866b49。非作者獨立像素：natural[134,107,73]／moss[168,184,153]／ochre[225,185,123]；預覽不改world。作者再跑正常UI與聚合，重拍H30圖。最後own-style非作者唯讀核guard與反例，未重跑測試。

## 來源、取捨、下一輪

[事前來源與範圍](HOMESTEAD-H29-H30.md)：本次核Tiny Glade開發者可逆外觀原則、Unified Dyes小型調色資料與Stonehearth mod作者2014姓名／外觀編輯描述。不把個人社群mod當整體玩家共識，不搬程式／美術，不加染料鏈、社交／採石／大客製系統。Nintendo頁本次逾時，未當完整來源。自動測試不證明好看或願意回來。

H30到此停止。擁有人下一個方向已整理為[世紀帝國建設感評估與兩包候選](HOMESTEAD-CONSTRUCTION-NEXT.md)：先固定地塊預覽，再以真實搬料／工量呈現地基→框架→屋頂；自由選址會牽動目前沒有的碰撞／繞路與生活入口連通，延後。**本輪沒有實作H31/H32**。
