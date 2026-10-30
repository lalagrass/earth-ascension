# 新三輪交付：先看想蓋的家，再看它慢慢成形（H37–H39）

2026-10-30 UTC。實際主筆Cloud Codex、非作者 `/root/homestead_review`。base `2d7e312d382d5a79d78d3456bc468b8c09092430`；分支 `codex/solo-sect-homestead-construction-choices`。前H31–H36已完成，本次沒有把它們重算新里程碑。[本次逐輪事前規格／回顧](HOMESTEAD-CHOICES-ROUNDS.md)。H37 fdfa6cc、H38 1b5df34，H39與最終文件／畫面HEAD由交付manifest／git精確記錄。

**恰好三個新回合完成；本地提交，未push／PR／merge／部署／上傳／Mac／付費／排程。歷史分支及成果保留，不重接dev，不開第四輪。**

## 實際增加的玩家價值

| 新輪 | 缺口與實作 | 保留的界線 |
|---|---|---|
| 1／H37 | 舊地塊預覽已有位置／文字，但沒有成品；現在同一renderer畫『目前造型／完工示意』，看得到屋頂門窗、灶、床的差別及真設施效果。 | 不是再做地塊預覽。深複製視圖kind=homestead-preview，不能當真存檔；資格／成本只讀真world。模型不畫人物、施工、火或假活動，未解鎖也可看但不能確認。 |
| 2／H38 | 原本只有首屋分段；現在既有長凳、木作台、倉棚按真work長出支腳、桌腿／棚架、台面／棚頂。 | 只三種已有木作，不新增建物或施工工序；料未齊／work0不成形，正式stage才有功能。已完成幾何與原版相同。 |
| 3／H39 | 多工地要逐一找；現在『已立工程一覽』與固定編號地圖互相對照，知道目前作業、暫停、待料、待加工／搬部件／安裝。 | 列表不是工作隊列，不重排自主或搶料。點編號／列只開舊inspector；原有優先／暫停控制照舊。標示可關，完整狀態留可讀HTML一覽。 |

[八個核心檔案邊界](HOMESTEAD-CHOICES-BOUNDARY.json)：homestead／配方／技能／需求／轉接／本篇sim-data-core逐bytes與base相同。沒有新的保存欄位或存檔介面；新視圖、列表、checkbox均不寫world。不加入社交／採石／戰爭／生產鏈、自由選址、碰撞或繞路器。

## 真UI流程與圖

作者每輪獨立新局、正常按鈕／鍵盤，零物資／XP／設施／狀態注入，只讀debug作斷言；Chromium154.0.8037.57／Playwright1.62.1。三條混暫停／4×／16×流程是AI驗證，不能把世界時間或混速壁鐘說成1×耗時／真人體驗。

- **H37**：[收據](HOMESTEAD-CHOICE1-UI.json)。t0看首屋成品、t100.75簡屋→修繕對照並真升級，t504.25第3日已有屋2／菜園／灶／木床，預覽缺木作台的舒適床（不能確認）與改灶。模型前後通道差91405／74264／64781／34649，同一停點無world變動。[改前](shots/homestead-choice-before.png)、[首屋](shots/homestead-choice-first-preview.png)、[修繕前後](shots/homestead-choice-upgrade-preview.png)、[床局部](shots/homestead-choice-locked-bed-preview.png)、[灶](shots/homestead-choice-stove-preview.png)。
- **H38**：[收據](HOMESTEAD-CHOICE2-UI.json)。長凳0.25→2.75→5.5→完工；木作台0.25→3.5→6.75→完工；倉棚0.25→3.5→6.75→完工，t346.75第2日皆完成。每項中期暫停／讀檔不增工，倉容直到正式stage1才8→20。例圖：[長凳骨架](shots/homestead-woodwork-bench-frame.png)、[木作台骨架](shots/homestead-woodwork-workbench-frame.png)、[棚架](shots/homestead-woodwork-store-frame.png)、[棚頂](shots/homestead-woodwork-store-finish.png)、[完成](shots/homestead-woodwork-store-done.png)；每個設施另有feet/frame/finish/done四圖。
- **H39**：[收據](HOMESTEAD-CHOICE3-UI.json)。首屋後立倉棚／長凳／花叢，暫停長凳、優先花叢；一覽對照地圖、鍵盤點列與窄屏指標點編號只檢視，存讀保留三工程／一暫停；完成列移除、鍵盤焦點回下拉；最後全完成0工程仍可安居。[三工程](shots/homestead-projects-three-existing-projects.png)、[當前／暫停／待料](shots/homestead-projects-current-paused-waiting.png)、[390寬剩暫停工程](shots/homestead-projects-paused-last-project.png)、[完成](shots/homestead-projects-all-finished.png)。390圖為桌面viewport，非真手機。

## 接受矩陣

| 狀態 | 實跑／復用的精確範圍 |
|---|---|
| 通過 | 在solo-sect `node --test test/*.test.mjs`：本次 **450/450 → 452/452 → 456/456**（約22.23／21.73／22.57秒）。最後456於床工序／badge命中修復後實跑。完整log `/workspace/deliverables/homestead-choice{1,2,3}-tests.log`；原48路20日／五seed20000拍／dt／守恆／取消／舊模式／存讀矩陣仍隨聚合，不把舊447改名新結果或縮原樣本。 |
| 通過 | 新模型測試3→5例；列表4例。深複製／預覽kind拒真存檔、首屋與屋/灶/床1→2、模型無人物／工地／火、材料/工量成形與功能不提前；列表真狀態／固定編號／完成移除／床加工搬運安裝／marker中心命中；三性情各10日讀列表與途中重讀，全world bytes與不讀列表的控制相同。10日只證新只讀層無副作用，不取代既有正式20日矩陣。 |
| 通過 | [完工繪圖原始呼叫配對](HOMESTEAD-RENDER-PAIR.json)：以git讀fdfa6cc原renderer（非兩份現版），三個日夜／配色fixture，1003／1033／1033呼叫序列完全相同，證已建外觀未被成形重寫。作者自動化fixture，不是正常遊玩／美感實驗。 |
| 通過 | 三輪作者正常UI；預覽／點列／編號／關標示無world變動；暫停／續讀／資格與真材料一致；1440／390無橫向溢出或pageerror，鍵盤焦點／Enter／Escape可用。舊核心／schema不變，source SHA可查；上一輪5固定seed20日對照仍是上一輪證據，未另冒稱本輪重測新分布。 |
| 通過 | 非作者分輪獨立model3/3、model5/5、projects4/4（另既有construction9/9）；各有有界Chromium短流程／明示fixture及圖複核。自行核新局預覽、關標示／點列／鍵盤、九工地390圖；無狀態變動／溢出／pageerror。**非作者沒重跑作者三條完整路線、全部456或render-pair**，後者僅唯讀核資料／source。 |
| 通過 | 語法、git diff --check、文件本地連結、文字patch實套到base及HEAD文字bytes核對。 |
| 失敗 | 無剩餘已知阻擋。初稿可讀性／腳本時機問題已修並複驗，見下節。 |
| 受阻 | Firefox／WebKit先前官方下載cdn.playwright.dev、playwright.download.prss.microsoft.com政策403不變，未重試／換端點／代理／executor／Mac。 |
| 未測 | 真人樂趣／理解、美感、輔具使用者、真機Safari／手機、OS級IME、其他引擎、外部遊戲執行／效能。450/452/456不證明願意回來；本次不作效能改善宣稱。未改其他產品，未跑Earth／sect-chronicle無關全矩陣／遠端CI。 |

## 審查修復與取捨

1. H37床縮圖原裁到門、像窗戶換色：改同一實景床面局部並明標床墊／枕頭；不另畫虛構床。非作者核新圖與3/3。前置原因／加工說明補句點，模型不畫工地／料理火加實際斷言。
2. H38棚交木堆靠隔壁木作台，進度條貼地名：木堆移左側、條移標籤上方；正常UI重拍、5/5及完工配對再過，非作者核真圖解決；其餘452復用未變模擬證據。
3. H39窄畫布長狀態字太小：改較大編號、完整狀態留HTML一覽，badge與地名避讓，不以顏色單獨表示狀態。非作者九工地fixture圖確認；編號幾何與點選共用projectMarker，避免顯示在外框外卻點不到；原plotAt保留。床部件改待加工／待搬部件／待安裝。四測與有界UI複驗，最後456通過。
4. 作者初腳本在world完工同拍立即要求DOM列消失，碰上既有250ms繪製節奏；改等列實際移除再驗焦點，沒有改世界完成時機。窄屏圖以viewport拍攝，避免整頁過長縮到不能讀；桌面整景仍fullPage。

## 來源採用／延後

- [0AD Foundation](https://docs.wildfiregames.com/javascript/simulation/Foundation.html)：預覽實體與真工量分開，文件標有2022生成時間，非現版玩法／效能審計。使用原renderer／只讀投影；不搬其code、資產、多人／領土規則。
- [Tiny Glade開發者頁](https://store.steampowered.com/app/2198150/Tiny_Glade/?l=english)：先看樣貌、可改主意；不抄自由建築或取消荒居生存，不把商業遊戲當全開源。
- [AoE玩家2022–2023討論](https://forums.ageofempires.com/t/visual-enhancement-of-buildings-without-compromising-playability/209624)：在原占地內改善樣貌與可讀性，也有不同意見；只作個人歷史設計參考，不是當代bug或整體共識。
- [AoE官方無障礙](https://www.ageofempires.com/age-ii-de-accessibility/)：物件高亮／名稱可讀原則；採可關編號＋HTML文字，不聲稱已做narrator或完整無障礙驗收。
- Going Medieval腳手架正文未取得，只見搜尋片段，未當已核完整來源。未下載外部素材／引擎；沒有第三方程式或素材授權採用。

## 停在第三輪與下一提案

本次H37–H39完成，不自動H40／第四輪。[真人探索腳本](HOMESTEAD-CHOICES-PLAYTEST.md)優先看：是否能從前後圖說明建設價值、分清真進度／預覽、從列表定位暫停與當前工程，以及是否感到更有自己的家。

若後續另指派工程，候選可只評估菜園整地／灶台建設的生活辨識（目前未在H38涵蓋），依真工作與原模型延伸；不直接變成更多配方、採石、社交或自由擺放。任意選址仍缺碰撞／屋內使用點／工作入口／連通規則，不能用本次視覺範圍與編號宣稱已有尋路。推送與發布仍需新授權。
