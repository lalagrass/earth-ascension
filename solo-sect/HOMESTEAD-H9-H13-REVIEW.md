# H9–H13 交付回顧

交付後產品方向已更新為獨居生活核心，見 [最新方向與差異](HOMESTEAD-DIRECTION.md)。本回顧描述47e0e5e已做成果，不能把既有同伴選項當成後續必做主線。

主筆 Cloud Codex；base `fd85aa65a71af74642daec20222273f866291336`，本地 `codex/solo-sect-homestead-h9-h13`。原分支與歷史文件保留；H8記的未授權擴功能／上傳等狀態是當時快照，本輪新指派只授權此範圍。未推送、PR、合併、部署或上傳。

## 玩家現在能做什麼

| 包 | 可見交付 |
|---|---|
| H9 | 家園、吃住與建造優先；中文工作對象／暫候原因；當前→升級後的具體效果與缺料；可收合下一步提示 |
| H10 | 木屋與修繕差異、工地架／交料／進度、作物幼苗至成熟、實存木料與儲物箱、睡眠／閒坐姿勢；只有料理才有火光。持續成果清單由設施狀態衍生 |
| H11 | 屋前長凳2木／8秒（閒坐位置，無額外增益）與庭院花叢3木／10秒（外觀），順序自選，獨居可完成。固定地塊，沿既有取料／搬料／施工 |
| H12 | 自主維持適量吃住物資後可閒暇；需要時先做飯／補燃料，再接工程。勤勞仍多備柴；手動指派可超過自主目標。沒有新增腐敗、維護、排班或任務系統 |
| H13 | 新局→首屋→安居→個人家園→留居完整AI流程、理解與點擊小修、真人探索腳本。留居、交往、既有轉接皆可選 |

現有存檔入口不變；新地塊只是現有資料的必要預設與合法性驗證，未新增任何匯出／備份／槽位／同步功能。長凳與花叢不轉入本篇，原預覽如實列出，原荒居保留。

## 實際流程與畫面

最終版 Chromium（154.0.8037.57，Playwright1.62.1）正常UI使用「小禾／喜靜」、暫停／16×，**沒有注入資源或改世界狀態**：首屋t100.25；菜園t174.25；灶t248.5；倉棚t358.5；修繕t528.25；長凳t588；花叢t674.75。再留居三日並到長凳閒坐，終點第6日t1205、飯4／果2／木2／菜4、飢餓78.3、精力89、閒暇42。無pageerror；用既有存檔看轉接預覽，明示外觀不帶入，Escape取消後仍可住。這是單條AI操作證據，混速不代表真人耗時／樂趣或所有開局平衡。

- [新局](shots/homestead-h13-start.png) → [第一個家](shots/homestead-h13-first-home.png) → [自己的小家](shots/homestead-h13-my-home.png)。同視角Canvas，資訊欄會隨操作捲動。
- [長凳閒坐](shots/homestead-h11-bench.png)；[多工程正確說明](shots/homestead-h13-projects.png)（後者為明列fixture）。
- H10 [料理中](shots/homestead-h10-cooking.png)／[冷灶](shots/homestead-h10-after.png)是呈現fixture，不冒充正常建造。

完整步驟與真人紀錄表見 [HOMESTEAD-PLAYTEST.md](HOMESTEAD-PLAYTEST.md)。重跑UI用 `node solo-sect/tools/homestead-home-browser.mjs`，需先依腳本啟本機HTTP、已有Playwright與Chromium；可用 `PLAYWRIGHT_MODULE`、`CHROMIUM_PATH`、`HOMESTEAD_URL` 指向已安裝環境，不會自行安裝引擎。輸出只含本輪合成試玩資料。

## 行為量測與範圍

[H12逐日資料](HOMESTEAD-H12-METRICS.json)：18情境各20日，三性格×獨居／學徒×低庫存／滿倉／中斷，各另跑不重載對照，最終相同。逐拍驗木料投入／在途／庫存／耗柴與飯產／吃／庫存守恆。最低飢餓35.39、最低精力17，零飢餓0秒，兩項小工程皆完成且有閒暇。低庫存獨居產15吃12末存3；雙人產30吃26末存4。滿倉情境允許先消耗既有存量，不強迫無必要收成；低庫存另有至少六次收成，避免用滿倉存活冒稱可持續。

同輸入20日獨居前後比較：莓20→2、健談飯15→2、勤勞木20→5；喜靜閒暇495→549、健談439→511、勤勞451→536。這是指定情境的減少無需家務，不能推論全玩家體驗。自主目標是補庫觸發值，單批產出／在途可超目標，並非新容量硬鎖。飯每人2約可供3.1日熱量，另留果2；木2供料理、雙人3、勤勞5保留性情，皆為試玩值。工程需求可超過平日木目標，人物會補料，不需每日懲罰。

## 審查與修復

非作者 `/root/homestead_review` 唯讀審查，不冒稱GitHub APPROVE。實際找到並修正：

1. site在途木料卻說「採回入庫」：分工地交料與野採入庫，新增反例。
2. 多工地時提示固定第一項，與正在施工者不同：優先實際build目標，再已交齊工地，最後待料工程。
3. 兩張工地各把同一庫存說成足夠：明示材料共用／搬出前未保留、分已交齊與在途，加合計待料與總短缺。

作者另補已吃飽／無食物／訪客不在／今日已互動的暫候原因，避免指派無效但說明空白；這些不改決策。長按跨重繪的按鈕不會被替換、暫停2.2秒世界位元相同、鍵盤焦點保留；真頁重驗無錯誤。沒有只靠新增測試宣稱耐玩。

## 驗收狀態

- **通過**：本輪適用荒居／轉接／H7／H8與本篇核心聚合、材料／需求矩陣、舊資料必要相容、Chromium正常UI與針對性鍵盤／長按／多工程、語法／diff。精確命令與數量附本輪規格最終節點；H8舊77/77未直接冒充本輪證據。
- **初測失敗後修復或釐清**：上述提示缺陷；舊H5測試硬寫莓8和離開後租用者一定null，因新目標與合法接手改驗糧帳／備糧／離開者釋放；全solo測試初跑repo cwd的兩個立繪相對路徑失敗，正確solo-sect cwd針對v096/v180重驗15/15。沒有刪除素材斷言或改資料湊綠。
- **受阻／未重試**：Firefox與WebKit既有官方下載HTTP403，`cdn.playwright.dev`、`playwright.download.prss.microsoft.com`。只使用已裝Chromium，沒有鏡像／代理／Mac規避。
- **未測**：3–5位真人20–30分鐘探索、真實輔具／真機Safari／手機、所有開局與無限長期經濟、真磁碟／斷電／跨程序原子性、其它產品全庫CI。本輪不開發存檔機制，也不假稱這些通過。

## 外部比較與取捨

來源由獨立reviewer核對；沒有搬外部程式、美術或數值。

- [Animal Crossing官方Create](https://animalcrossing.nintendo.com/new-horizons/create/)：採小投入留在住處的可見選擇，落成長凳與植栽；延後任意地形／室內自由編輯。
- [Vintage Story 1.15官方Homesteading更新](https://www.vintagestory.at/blog.html/news/the-homesteading-update-v1150-1151-r287/)：採設施能力與生產狀態可見相連；不搬水肥、畜牧與大型生存負擔，不稱整款遊戲完全開源。
- [Widelands Production Sites文件](https://www.widelands.org/documentation/autogen_productionsite_lua_tribes_buildings_init/)有inputs、programs與缺料通知：採確實缺料與工作說明，仍用現有物流。[指定map文件](https://www.widelands.org/documentation/autogen_wl_map/)擷取逾時／代理403，未讀內容、不據此聲稱精確庫存演算法，未繞過限制。
- [Stonehearth ACE專案](https://github.com/StonehearthACE-team/stonehearth_ace)及[社群公告](https://discourse.stonehearth.net/t/ace-authorized-community-expansion-project/36671/1)：採橫向家園選擇並保持清楚低微操；原版商業遊戲與mod MIT標示分開看，不複製任何資產／程式。
- [Stardew官方論壇指定討論](https://forums.stardewvalley.net/threads/i-do-not-have-time-for-anything.20279/)與[Steam指定討論](https://steamcommunity.com/app/413150/discussions/0/1678064284144574795/)：是個別玩家的時間壓力／雜務回饋；採可暫停、倍速、無硬期限與夠用即閒，不稱社群共識或已玩過比較作品。

## 停止點

H13完成後不新增H14。下一步只有取得真人探索回饋、由環境擁有人解決跨引擎政策後按既有範圍補驗，以及修實際缺陷。新推送／上傳／正式整合須另有授權；本輪成果可由本地分支與提交取回。
