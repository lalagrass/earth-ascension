# 決策、來源與尚未驗證的事

2026-10-25（Asia/Taipei）；實際主筆 GPT／Codex；固定 base dev `148cfbbb27e43475c66744d53c2451125a9111a0`。本次為 [BRIEF](../BRIEF.md) 正式獨立指派，未到原 issue 認領或聯絡其他作者。所有判斷是作者研究／自校，不冒充三方共識或獨立審查。

## 1. 三來源核對與採用差異

固定 SHA 是讀取基準，不表示遠端最新。文件中的作者測試紀錄與本次實查分開。本次未重跑 Grok／Gemini 測試，也未宣稱其全部功能不可用；只指出會影響新第一版的具體邊界。

| 來源／固定提交 | 本次讀取與可核查位置 | 保留／調整／不採用 |
|---|---|---|
| dev `148cfbbb27e43475c66744d53c2451125a9111a0` | `sect-chronicle/docs/vision/NORTH_STAR.md`、`docs/FUTURE_BACKLOG.md`、`MARTIAL_ARTS_RESEARCH.md`、`SIMS_LIFE_RESEARCH.md`、`LIFE_M1_EXECUTION_PLAN.md`；`experiments/water-carry/demo/model.mjs`、`routes.mjs`、`palm.mjs`、`patrol.mjs`；SCENE04 圖／plan | 保留長路、負重腳力、真起手收勢、返程預留與取消。routes 的 SEATS／TRAIN_POSTS／MEET 按 hero/cousin 綁兩人，共同端點 `(962,512)` 不能直接擴為8人。HOME02 的木／工地／床只本局是正式主線現況；本獨立版新增完整保存靠後，不去修改 dev 的承諾 |
| Grok `7eb0f7a309e9ee90612ddd0f4f8ef08faf39be47` | `solo-sect/FEATURES.md`、`DESIGN.md`、`ROADMAP.md`；`src/sim.mjs` 的 scoreActs／startBuild／cancelTask／moveStep、`expedition.mjs` 的 startExpedition／fight／expStep；`arts.mjs`、`mind.mjs`、`social.mjs`、`hero.mjs`、`save.mjs` | 保留具名雇工、共作識人、日課／危機例外、可讀理由、成長與多管道招募。FEATURES 記193測試／7 UI PASS是作者證據；shots 多用直接改狀態，作者亦有註明。遠征把角色設 away、清 path，fight 用0.5秒迴圈扣DPS，返程倒數後結束；有公式／記錄但不是全程同圖出招。本版重做同圖遠征，不搬這段戰鬥。guizhenOk 對悟性／特質的限制不採為基礎深修門檻。整包巨大武學／世代不搬 |
| Gemini／Antigravity `32c1b88adbe00e206a6590ecf4f4e47261ceb9b9` | `sect-chronicle/FEATURES.md`、`docs/vision/SECT_LIFE_REDESIGN_MASTERPLAN.md`、`docs/LIFE_V01_V02_HANDOFF.md` 至 `LIFE_V09_V10_HANDOFF.md` 五份；`life/core/` 的 reservation、smart-objects、autopilot、martial-combat、martial-evolution、patrol-defense、outreach-social、persona-creation、grand-founding-save；`life/data/` 武學／路段／候選資料 | 保留設施宣告活動、站位預約、少量鮮明人物與學習條件。部分 core 以 `node:fs` 讀資料，不能當瀏覽器可直接匯入模組。demo/model.mjs:842 `dispatchSegmentedPatrol` 按風格直接填距離、清場率、戰果；:958 `breakthroughLuohanLv10` 直接設 level=10/flawless。不得沿用成正式玩家路徑。verify-flow 是模型呼叫證據，不等同瀏覽器自然通關。多世界同步、21名俠、付費點、零前搖必中、強制原作宿命不採 |

以上是設計參考，不是整套合併或新引擎遷移。新檔案若改寫某函式／採素材，要在檔頭或資產清單記原作者、原路徑與完整 SHA；只借觀念則明記不複製。根目錄沒有可直接推論涵蓋所有美術／角色 IP 的總授權證據，不能寫成全部可商用。

## 2. 這次已做的有限決定

| ID | 決定 | 理由與異議／代價 |
|---|---|---|
| P01 | 一章、8常住＋2日訪客、單隊最多3人 | 讓多人物競爭／家庭／分工成立又可測。不是人口效能上限；有人想要大門派，第一版先把小群體做深 |
| P02 | 固定10地塊、同幾何逐棟建成，局部重排生活核心 | 原母版有空間與用途，沒有證據要求全盤換地景。自由建築更豐富但會擴牆／導航／儲存成本，後排 |
| P03 | 生活短路、採集長路，南公共口＋北外出口 | 保留通勤觀看樂趣；不全面追求最短效率。兩口帶來守護責任，外帶／止追／撤退需真測 |
| P04 | 遠征一條三段連續圖，用同一模擬與戰鬥 | 批次戰報較便宜但違背使用者核心意圖；只減渲染量，不換規則。代價是地形／同時家園狀態需一起保存 |
| P05 | 同源個體自然獸、可重複演武分離 | 天然棲地不變成刷怪機；比較成長仍有安全可重複場景。首版不模擬繁殖／遷徙生態 |
| P06 | 外門貢獻是目標，有練功與豁免；內門危機幫忙 | 階層感不以永久苦力鎖人；缺料不變成負債。保留具體職責，避免每人都一樣 |
| P07 | 三段成長、5門6動作、九劍只交一種辨隙 | 廣度與深度都可見；高悟不禁止基礎深修。少量招式比龐大技能表易驗，但內容量不等於舊分支全部武學 |
| P08 | 三經典開局模板、五代表NPC，每人兩節點；同ID互斥年輕／成熟 | 保留角色趣味及原型意圖，有限事件可開發；不強迫宿命、不做全明星資料搬家。成熟模式是有限客人，不能輾壓成長 |
| P09 | 一條救人／保糧分歧，共用所有主角的流程 | 選擇由現場物資、能力與性向產生，返院核實結果；不是為每個模板再寫完整劇本 |
| P10 | 單一狀態早訂、完整保存末段、隔離新格式與key | 避免整合後才發現兩個世界；不讀寫原存檔。未知版明拒／匯入先驗證，不靜默修到看似成功 |
| P11 | 圖層獨立、工程圖先驗；本階段不另產水彩概念圖 | 既有SCENE04已足以傳達氛圍；門、路、角色不能烘焙。新素材依具體功能缺口製作 |
| P12 | 開發各段都交正常玩家可見流程，不把模型呼叫當遊玩 | UI接線與路徑是真風險；單測綠不能代替。作者自校不是獨立review、也不是玩家好玩認證 |

## 3. 社群／開源查核與適用限制

本輪直接讀下列頁面，查核日2026-10-25。外站動態頁不承諾永遠不變；沒有安裝／實玩這些遊戲，也沒有移植其碼、素材或文字。技術結論以專案／開發者來源為主，社群只支持「有人提出這種偏好」，不當成共識。

| 來源 | 查核所得（簡要意譯） | 本版採用／限制 |
|---|---|---|
| [RimWorld Steam 討論：How do you do base design?](https://steamcommunity.com/app/294100/discussions/0/3808408158825922960/)（2023-08-01） | 有人先全面規劃，有人主張緊湊多用途房，也有人重自然聚落與視覺，反對過度整齊／killbox | 保留異議：短生活路＋長採集路是本作取捨，沒有「玩家都喜歡效率」結論；單討論串、無量化樣本 |
| [Eremite Devlog 3](https://eremitegames.com/devlog-3-smouldering-city-world-map-and-more/)（2021-04-28，當時WIP） | 明分世界選址與即時聚落層，biome改變資源／威脅／獎勵與地形 | 借每段地形有目的的配置；本作不採重置聚落與另一套世界戰鬥，開發日誌非現行完整規格 |
| [Mindustry 專案](https://github.com/Anuken/Mindustry)、[官方 Wiki](https://mindustrygame.github.io/wiki/) | 專案以自動化生產與塔防為核心；Wiki 是內容／貢獻入口 | 借供給支撐防衛與可讀來路，未核每種敵人的pathfinding，不宣稱本作路圖因此可玩。此次 deeper introduction URL 取用失敗，沒有用它作論據 |
| [FreeSO Project Structure](https://github.com/riperiperi/FreeSO/wiki/Project-Structure)（頁記2020-06-12） | 分模擬Entities／指令／序列化與LotView畫面，世界和畫面表示分層 | 借單一人物事實與唯讀呈現；不搬VM、網路同步、原遊戲物件或大型架構。年代較早，不當成2026最新API |
| [CDDA Martial Arts JSON](https://docs.cataclysmdda.org/JSON/MARTIALART_JSON.html) | style、technique與條件／效果分開，可傳授與學習有資料欄位 | 借少量招式資料化與可用條件，沒有證明即時命中／獨孤九劍規則，這些是本版設計 |
| [Wildermyth Writer’s Guide](https://wildermyth.com/wiki/Writer%27s_Guide) | history、motivation、hooks與可查aspects可支撐角色事件選角 | 借性格／經歷觸發有限事件；不搬其Lore、劇情或任務戰鬥，也不推論每個事件都需要大量人格維度 |

授權核對限本次讀到的repo根文件：[Mindustry LICENSE](https://github.com/Anuken/Mindustry/blob/master/LICENSE) 為GPLv3文字；[FreeSO LICENSE.md](https://github.com/riperiperi/FreeSO/blob/master/LICENSE.md) 為MPL2.0，且[README](https://github.com/riperiperi/FreeSO)說明執行依賴原遊戲檔案；[CDDA LICENSE.txt](https://github.com/CleverRaven/Cataclysm-DDA/blob/master/LICENSE.txt)主體CC BY-SA3.0、字型等另列。這些都不是任意可商用素材包。此處只借設計觀念，未複製外部碼／素材；真要引入需重新核具體檔案、版本與義務。Wildermyth／Eremite／Steam內容作閱讀引用，沒有推定可重用授權。

## 4. 候選值、風險與真正阻塞

候選值：一日600s、20點五屬性、60–90分鐘、人口8＋2、5門6動作、1DU=2WU、人物半徑6DU、道路28–48DU、有限配方／建設成本、各階成長時長。這些可由spec／開發在本章範圍內校準並記錄，無需逐項重新請示。調整不能掩蓋失敗樣本；先記原假設、實測、改因與再驗。

尚未驗證：8＋2人的擁塞、傷員窄橋／全隊失能救援可達性、同時家園＋遠征效能、60–90分鐘內容節奏、第一版戰鬥平衡、資產錨點實際對齊。交給後續明確驗收，不把這些未實作驗證誤寫為規劃被阻塞。

真正阻塞 `remainingDecisions = []`。公開發行IP處理、外部花費、dev整合／main發布都在本版之外，不掛成spec開工前必答問題。研究來源不足的機制已限為本版設計假說，未因研究缺少共識而停止可逆工作。
