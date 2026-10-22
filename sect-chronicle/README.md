# 宗門編年（Sect Chronicle）生活開發版

**目前主入口是生活開發版**（[#201](https://github.com/lalagrass/earth-ascension/issues/201)、[#203](https://github.com/lalagrass/earth-ascension/issues/203)，D13）：兩名真實工作者在同一張地圖自主挑水或採藥，可隨時改工作（途中改令當趟交付後生效）或本趟後停工休息，兩份工作共用腳力成長。主角初始腳力 Lv1、熟手 Lv3，沿既有 Lv5 上限；兩種體態是既有外觀，不會因升級自動變瘦。這是持續演進的主遊戲，後續累積在同一生活入口。

在 repo 根目錄啟動：

```sh
python3 -m http.server 8765 --directory sect-chronicle
```

開 <http://localhost:8765/>；穩定主入口薄導向唯一的 `experiments/water-carry/demo/` runtime，沒有第二份 app。點名冊／地圖上的兩人看實際工作、空桶／負重速度與成長；點水缸或泉水對選中的人下令（會暫停）→「本趟後休息」→恢復，該人倒完才停，另一人繼續。按「開始挑水」再出發。面板或點藥圃／藥架可把選中的人改成「採藥（持續）」：他沿東側小路到藥圃蹲採、背簍帶回院中藥架交付，再自己接下一趟；另一人可同時挑水。1／2／4×只改播放快慢。拖曳／滾輪平移縮放，390px選人後鏡頭跟隨該人；重來清除兩人意圖與在途預約。

**目前限制**：生活版尚未存檔，重整即新局；採藥是生活開發版示意值（藥架容量 8、每趟 1 份、採集／交藥沿用取水／倒水時長），藥草點不枯竭、藥草沒有用途或每日消耗，藥架滿了就清楚等待；休息是停工，沒有新增疲勞／體力恢復或完整人格／社交。舊版的修行、目標、招募與存讀尚未移植。[舊 viewer](http://localhost:8765/viewer/) 與原資料保留，生活版也有「舊版與存檔」連結；不自動讀取、匯入或覆寫 RT 存檔。示意腳力數值不改寫舊 RT 規則。上一版單人可操作基線為 dev `c51615648b6f38151ffdcb36e8b2b1a0362fe857`（LP-01）；切回該已發布 commit 仍用原 `/experiments/water-carry/demo/` 路徑，無需另一份 runtime。

局部檢查：`node --test sect-chronicle/experiments/water-carry/checks/model.test.mjs`；必要主線快驗／基本檢查仍按 [AGENTS](AGENTS.md)。開發與審查狀態以 [#197](https://github.com/lalagrass/earth-ascension/issues/197)／[#201](https://github.com/lalagrass/earth-ascension/issues/201)為準。

## 歷史設計與交接紀錄

以下保留早期提案與 D10 交接，並非目前任務狀態；最新入口與功能以上方為準。

**最新交接（D10，2026-10-19）**：RT-02 #108已合dev0875d116、postCI39161730112五項成功；目前只有自主純引擎，沒有可玩UI。擁有人已批准先做[RT-02V觀察版 #129](https://github.com/lalagrass/earth-ascension/issues/129)，讀[接手文件](docs/RT02V_HANDOFF.md)。Grok額度用盡，工作包開放待認領；本次排程文件合dev／postCI後即可登記接手，不重問產品批准。順序改為RT-02V→03→04→05。以下早期提案、SG-01及RT-00接手描述只作歷史；最新任務狀態以[#93](https://github.com/lalagrass/earth-ascension/issues/93)為準。

**RT-02V 觀察版 viewer（#129）**：在 repo 根目錄跑 `python3 -m http.server 8765 --directory sect-chronicle`，瀏覽器開 <http://localhost:8765/viewer/>。看正式世界自主生活與播放控制（暫停、1／2／4 倍）。RT-03a 起世界存在瀏覽器（暫停、每日、突破後自動保存，可立即保存、讀取、匯入匯出與備份恢復）。細節與限制見 [DEVELOPMENT](docs/DEVELOPMENT.md#sg-rt-02v-新增唯讀生活觀察版) 與 [存讀](docs/DEVELOPMENT.md#sg-rt-03a-新增正式存讀)。

**目前開發方向：D8可暫停即時自主生活。** RT-01手動核心與RT-02自主已交付；下一包是D10的唯讀觀察／播放。完整主角工作／目標編輯、瀏覽器存讀與生活試玩仍在後續RT-03～05，戰鬥延後。權威規則見[RT00_CONTRACT](docs/RT00_CONTRACT.md)，批准紀錄見[DECISIONS_AND_SOURCES](docs/DECISIONS_AND_SOURCES.md)。

歷史提案為已批准的14天切片；28天擴充、真人研究與發布未完成也未隨D10批准。原型與SG-00來源記錄保留，歷史接手提示不代表目前待辦。

一句話：從師父與主角兩人的村莊道館出發，在靈氣復甦中修行、援村與收徒，抵禦獸患，讓道館成為能保護村莊的門派。

最新設計基線 0.2：[道館成為門派修訂與交接](docs/OPENING_REVISION.md)。D6 已批准，取代開局掌門／四人開局設定；SG-02A／04A 為切片內新增工作包，28 天擴充仍未批准。

本資料夾整合兩個原型的設計，不把兩套引擎直接拼接。保留 `guwu-game` 的課表、因果說明與培養節奏，採用 `sect_ascension` 的門派視角、五行棋盤與弟子分工。先做 14 天垂直切片；28 天短戰役需真人試玩後另行批准。

## 閱讀順序

1. [遊戲設計 GDD](docs/GAME_DESIGN.md)：玩家體驗、核心循環、範圍與 UI。
2. [整合與技術契約](docs/TECHNICAL_DESIGN.md)：單一引擎、時間、指令、存檔、RNG。
3. [Milestone 與任務](docs/MILESTONES_TASKS.md)：依賴、檔案邊界、完成判準。
4. [驗收與試玩計畫](docs/ACCEPTANCE.md)：正確性、平衡、真人試玩與停止擴充條件。
5. [決策與來源紀錄](docs/DECISIONS_AND_SOURCES.md)：提案選項、既有缺陷、來源快照。
6. [Agent 接手入口](AGENTS.md)：如何認領、第一個工作包、交付格式。
7. [雙 agent 與 worktree 接手計畫](docs/PARALLEL_HANDOFF.md)：分工、啟動前置、可直接貼上的指令。

## 提案與溝通

[Agent 提案流程與 issue 格式](docs/AGENT_PROPOSALS.md)：Issue 留正式紀錄、聊天討論決策、PR 交付。非阻擋建議不暫停目前已認領工作；待定產品選項不先實作。

## 未來構想（不納入目前切片）

[生活、輕功與領地防衛 backlog](docs/FUTURE_BACKLOG.md) 對應 [#75](https://github.com/lalagrass/earth-ascension/issues/75)，僅收錄供未來再評估或其他專案使用。未排程、未批准實作，不增加 14 天切片任務或依賴。

## 交付範圍與授權

使用者已於 2026-10-18 批准 D1–D5、14 天切片及 SG-01～SG-12。文件整合已由 Codex 認領 [SG-00 #69](https://github.com/lalagrass/earth-ascension/issues/69)，在獨立文件 worktree 進行；未啟動其他 agent，未改原型程式。SG 實作主筆待認領，不以角色代號冒充已指派。

最初規劃採新資料夾：兩個參考原型目前都是工作目錄內的未追蹤檔案，直接建立乾淨 worktree 不會帶入它們；規劃文件無需複製原型程式。這不是可直接啟動的遊戲套件。

工作目錄觀察 HEAD：`6fc98a9530c9075981a7edbbd0e3ac4d82c129ee`。這不是已核對的最新遠端 dev SHA。來源快照見決策文件。

後續程式開工須依根目錄 [CONTRIBUTING.md](../CONTRIBUTING.md) 認領 issue、核對最新 dev、建短分支並向 dev 提 PR。本文 SG 系列是獨立遊戲任務，不代表主專案 M3 獲准實作。下方早期設計的候選數值須依後續決策覆蓋；D9凍結的RT值已批准，並非待選。SG-00 產品決策已完成；文件主筆 Codex 已於 #69 登記，核對的 base dev SHA 為 `fbbd3f3770f2eacf1528fb3b3beb5108c8d90910`。SG-00 已完成：文件 PR #70 於 `7510a8b` 合入 dev，#69 已關閉。設計 0.2（D6）修訂以 SG-00b 文件 PR 獨立審核，合併後 SG-01 以含 0.2 文件的 dev 為基底。依賴完成的任務可在認領後開始，不再要求重複產品批准。

## 目前進度

任務狀態以[總單#93](https://github.com/lalagrass/earth-ascension/issues/93)與已合PR／postCI為準。歷史slot SG-01～05及RT-00～02已交付；RT-02V #129開放待認領，viewer、瀏覽器存讀、完整UI、真人試玩與發布尚未完成。下一位接#129，不重做SG-00／01或RT-02修正。Earth／遊戲隔離原則保留；Claude #128架構文件不阻擋viewer，SG-14起仍未授權。
