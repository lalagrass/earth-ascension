# A01–A20 自主生活交付／安全節點

作者 grass / Codex `/root`。Cloud host `4e61775b9fcd`，checkout `/workspace/earth-ascension`，分支 `codex/homestead-autonomy`。
Base **bc5dc0567cb088af7fa94fbbabe7288a8ba8305c**（已發布H50）。本文件屬A20提交；精確交付head由`git rev-parse HEAD`及外部交付manifest記錄，不在提交內預猜自身hash。
只改`solo-sect/`。保留舊分支與歷史，未重接dev，未push／PR／merge／部署／Space上傳／操作Mac。

## 玩家實際能看到

新局不派工、不立藍圖，角色自行決定安家，採木、真搬料、施工、使用住處；之後自行完成菜園與灶、耕種料理、吃熱飯，選擇舒眠／庭院／收納改善。吃睡打斷後接續，沒有物資／XP注入。新自主模式是UI預設，API須`createHomestead({mode:'solo',autonomy:true})`；既有classic仍原邏輯，非猜測遷移。

角色還會在有限興趣中選擇草藥自給、嚐燉菜或安頓小家樣貌；草藥真插穗生長收成，必要時用多出的草藥恢復，不浪費唯一插穗演出。真正走到花叢／菜畦／長凳／屋前休憩。既有配方、床與感受效果未藉此放大；近期真實截頂收益只影響後來合法選擇，不是新能力buff。

玩家可只給生活方向，也可做一次實事後讓角色回生活。一次砍柴包含搬回，一次施工是一項完整工程；可明選持續。暫停／否決受到尊重，至多一個真暫候打算，可先做獨立有用的事。改方向只邀請相關缺項，不為安居後選「吃住」強加不相關庭院工程。

**內容有限**：預設兩條家園改善、三種興趣選兩項。它不是無限生活生成器。安居後可維持、休憩或由玩家邀請再經營；不以刷XP、丟食物、反覆建物、災害或每日任務充時長。A20的確解決H50沒有自主產生改善目標的程式缺口，但沒有真人證明「以後永不無聊」。

## 逐項提交與新差異

| 包 | 提交 | 實際切片 |
|---|---|---|
| A01 | ba52cc5 | 自己立首屋、備料施工，真目標與需求中斷續作 |
| A02 | 87de4ef | 自己走完菜園→灶→熱飯實吃；47ebf4f另為當時圖片暫存提交，非第二份功能 |
| A03 | 1d5dafe | 真施工XP解修屋／木床／木作台／舒適床並試用 |
| A04 | a502220 | 三性情的家園投資順序有別，無內容性情硬鎖 |
| A05 | a66e61a | 缺種子／技能／容量／暫停的真解釋與合法替代 |
| A06 | 08b267d | 真缺糧／疲倦／工作經驗有上限、衰退並影響下一選擇 |
| A07 | f2e3bdf | 主要打算後有限休憩，完成再續發展 |
| A08 | 0ead8d5 | 高層方向、否決與允許；暫停工地不自動開回 |
| A09 | 59f42aa | 有限願景與安居；真世界／人工成果對帳，履歷是首次確認時間 |
| A10 | 09636a0 | 第一組三性情無派工UI、完整矩陣、回顧與補修 |
| A11 | 7a67fbb | 下次真正需要補餐時有意試拌食，不擋主要建設 |
| A12 | ff7dc76 | 燉菜興趣自己解設備／自然料理熟練並實吃 |
| A13 | 5c08a57 | 真藥圃循環，否決貫穿舊自動維持／選菜分支 |
| A14 | 2f8710f | 以真疲倦／位置／草藥／床效率選合用調養 |
| A15 | 533b45c | 真地點、動作、感受一致的不同休憩 |
| A16 | cd7cd28 | 真到屋前選既有配色／家名，保護人工原貌與舊未知歸屬 |
| A17 | c74820e | 一次實際委派→物理成果→回自己的打算 |
| A18 | cd7e556 | 單一暫候與有限可行替代，保原願景名額／物資 |
| A19 | b95fe89 | 真使用收益形成近期偏好，所有用餐的實得收據 |
| A20 | 本提交 | 最終整段流程／版本拒讀／既有轉接相容／方向整合／評審交付 |

各包規格／失敗與修復見[第一組](HOMESTEAD-AUTONOMY.md)及[第二組](HOMESTEAD-A11-A20.md)，不改寫歷史當時驗收結論。後續興趣／等待加入後，預設路徑有演化，最終觀測以A20為準。

## 最終真UI與量測

Node24.19.0、Playwright1.62.1、系統Chromium154.0.8037.57；真瀏覽器操作，沒有JS改資源／XP／世界狀態。

| 全新獨居、僅姓名／性情／開始／倍率 | 停點世界秒 | 觀測最低飢餓／精力 | 真實確認的家園／興趣 |
|---|---:|---|---|
| 喜靜 | 1300.5 | 34.130 / 18.750 | 先舒眠、庭院；藥圃生長時選苔綠『苔蔭小居』，真收藥；已吃拌食 |
| 開朗 | 2797.5 | 34.130 / 18.750 | 先庭院、舒眠；赭紅『晴窗小屋』與真燉菜一餐；已吃拌食 |
| 勤勞 | 1301 | 34.165 / 18.750 | 先收納／灶具、舒眠；草藥與原木『勤耕小屋』；已吃拌食 |

倍率16×與停點讀取；不是1×壁鐘耗時，也不是逐tick採樣的最低值。逐tick需求由正式矩陣另驗。勤勞原排序較偏燉菜，但A18只選可執行替代，等藥苗時會先做可完成的樣貌，消耗第二個有限興趣名額；不能仍聲稱預設所有勤勞都嚐燉菜。改相關生活方向可再考慮未做項。

[最終量測](AUTONOMY-A20-METRICS.json)／三個完整UI JSON與shots保留。作者實看過前後、花叢動作與配色變化圖；代表畫面：[喜靜現況](shots/autonomy-A20-quiet-home.png)、[喜靜打算](shots/autonomy-A20-quiet-plan.png)、[開朗現況](shots/autonomy-A20-sociable-home.png)、[勤勞現況](shots/autonomy-A20-diligent-home.png)。固定地塊，**沒有**碰撞／路徑搜尋／自由建築的能力宣稱。

人工合作另列，不混稱無指令：A08改方向／否決，A14收藥後一次方向→自然工作疲倦調養，A17一次砍柴／完整造屋／持續清除，A18只暫停／恢復床工程。A20勤勞零指令流程**結束後**，另用既有存檔→v4預覽→取消，來源世界和localStorage整體未變；未確認寫入新本篇槽。classic／legacy入口另做390px、鍵盤開始、版本3、原模式提示與不寫storage的煙測。

## 接受矩陣與審查範圍

| 狀態 | 證據 |
|---|---|
| 通過 | 最終在`solo-sect/`跑`node --test test/*.test.mjs`：**538/538**；原481套件與原適用長程樣本完整保留，新增自主57項；完整stdout `/workspace/deliverables/autonomy-a20-all-final.log`，不以舊H50數字當新版通過。 |
| 通過 | 新三性情×fresh/low/full/interrupted/paused各20日，與讀檔控制完整同態；15例逐tick最低飢餓20.275。low刻意初始精力0，仍能恢復，不謊稱全程精力>0。 |
| 通過 | 五組固定LCG指令seed1–5各20000拍；木／果／菜／各料理／四技能、草藥採集／插穗／收成／使用與識藥逐拍對真實績帳，最低飢餓32.715／精力17.95。這是指令seed，本核心無隨機世界seed；不是100NPC分布研究。 |
| 通過 | 取消、在途、材料預約、完整加工／安裝、玩家暫停／方向、待生長／熟練、單一waiting、有限願景、dt.1/.25/1、前後存讀、壞觀測／未來時間／錯歸屬拒讀。 |
| 通過 | 新自主root4；classic仍root3，舊1/2/3仍支援。真固定H50讀取器拒讀4、接受classic3；真A19 root3 trace只升版本，不動世界。無備份／同步／槽位新功能。 |
| 通過 | 既有轉接來源4需有收據，白名單預演、真main loader跑一日與重讀、來源bytes不變；原H6/H7樣本保留。 |
| 通過 | 非作者`/root/autonomy_review`逐包有界審查及缺陷複審。A20獨立17項（新增4＋既有轉接/H7）和固定舊讀取器，再最新方向5/5；**沒有**冒稱非作者重跑538或三條全UI，也不是GitHub正式approval／真人驗收。 |
| 通過 | 1440／390、Enter／Tab適用動作、暫停唯讀不進時，作者GUI無pageerror／橫向溢出；語法／git diff邊界／交付完整性。不是整體WCAG或真手機認證。 |
| 失敗後修復 | 目標時間／重複紀錄、完工瞬間假下一步、試睡高精力停滯、人工成果未對帳、藥圃／燉菜否決繞過、人工口味占住興趣、等待搶首熱飯、錯取消別的試睡、指引擴張不相關工程；各包保留反例。工具錯cwd／錯假設回倉必閒置亦如實記，未用0tests或錯cwd結果當通過。 |
| 受阻 | Firefox/WebKit官方域`cdn.playwright.dev`與`playwright.download.prss.microsoft.com`先前403禁止重試／替代繞過；本輪沒重試。可讀預設Playwright兩引擎executable均ENOENT，PATH無Firefox/WebKitWebDriver；root私人cache不可讀，未繞權限，沒有聲稱全機器已無任何副本。 |
| 未測 | 真人理解／樂趣／耐玩、輔具使用者、真機Safari／手機、OS IME、Firefox/WebKit、Node22、遠端CI、外部遊戲運行／效能。沒有新依賴／外部程式素材。 |

可重跑：repo根開`python3 -m http.server 8804 --bind 127.0.0.1 --directory solo-sect`；`node solo-sect/tools/homestead-autonomy-browser.mjs A20-quiet 1300 quiet settled`（其餘性情類推）。UI工具使用Cloud已裝的Playwright絕對路徑與`/usr/bin/chromium`，不是一般玩家安裝要求。舊讀取器核對：repo根`node solo-sect/tools/homestead-autonomy-compat.mjs`（需有base歷史）。技術測試必須在`solo-sect`工作目錄跑，部分原測試用相對資產路徑。

## 來源採用／不採用

- [ReGoap](https://github.com/luxkun/ReGoap)：借目標、前置、效果、失敗後再考慮；用現有task執行，未移植C#／引入通用planner。
- [TinyLife AiSettings](https://docs.tinylifegame.com/api/TinyLife.Actions.ActionType.AiSettings.html)：基本需求以外的自主活動與條件優先；公開API不等於商業本體開源，不聲稱其已做本作建屋。
- [Veloren npc_ai](https://docs.veloren.net/veloren_rtsim/rule/npc_ai/index.html)：長程活動與controller分離；未引Rust系統／新引擎。
- [Thrive歷史討論](https://forum.revolutionarygamesstudio.com/t/utility-ai-restructuring-the-ai-system/919)：2022提案的分析／決策／執行與先修實際行為；不是已落地社群共識。

只採原則、自寫小型決策及幾何畫面；無第三方code／素材／新套件，因此不虛稱完成外部專案license／效能或遊戲試跑。

## 安全節點與下一指派

A01–A20與必要補修至此完成，停止本組。真人探索腳本見[試玩](HOMESTEAD-AUTONOMY-PLAYTEST.md)。後來另一規劃聊天轉交了**另外十輪**、擴至社交／柵欄／侵擾／武學／遠征的正式方向；協調訊息明確要求本回合只收A20，回報實際head後由parent另行dispatch。沒有把A01–A20算作新十輪，也沒有從過期H50基線重做或在本回合啟動戰鬥／NPC／路徑系統。新方向不改寫本組solo驗收歷史。未推送授權仍只限之前H50發布，不能推論為新分支的持續發布權。
