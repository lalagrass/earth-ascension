# 生活開發版與挑水切片素材（SG-EXP-01）

原始工作單 [#155](https://github.com/lalagrass/earth-ascension/issues/155) 的 UI／2.5D 原型與素材保留在這裡。D13／[#197](https://github.com/lalagrass/earth-ascension/issues/197) 已將同一 `demo/` runtime 接續為主遊戲生活開發版；設計候選與技術小樣仍各自保留，不自動採用。

**生活主入口**：repo 根目錄跑 `python3 -m http.server 8765 --directory sect-chronicle`，開 <http://localhost:8765/>，會導向同一生活 runtime。亦可在本目錄跑 `python3 -m http.server 8798`，開 `/demo/`。兩人各自挑水或採藥（LP-03）／成長／精力低時自己去石凳恢復再回原工作（LP-04）／存放處實存滿時各去喜好處（主角看山、熟手舒展筋骨），有空位自己回、可叫回或恢復自主（LP-05）／本趟後停工，主角 Lv1、熟手 Lv3，水缸與藥架都含在途預約；共用一個60Hz時鐘。名冊可切換兩人，窄畫面跟隨所選人物。

目前無存檔，重整即新局；不承接或覆寫舊RT資料，舊修行／目標／招募等尚未移植，[舊viewer](../../viewer/)可保留原功能與存檔。體態是既有外觀，休息是停工，沒有新增減重／疲勞／社交系統。LP-01已發布單人基線 commit `c51615648b6f38151ffdcb36e8b2b1a0362fe857` 的同一路徑可回訪。

| 階段 | 狀態 | 入口 |
|---|---|---|
| V1 完整畫面稿與動作設計 | 已交，待人看 | [design/V1.md](design/V1.md) |
| V2 PixiJS／Godot 同場景比較 | 已交，推薦 PixiJS＋HTML/CSS，待審 | [design/V2.md](design/V2.md)；試作在 [spikes/](spikes/) |
| LP-02 雙人生活主入口（[#201](https://github.com/lalagrass/earth-ascension/issues/201)） | 本版實作；審查／合併見 issue | `/demo/`，由 `sect-chronicle/index.html` 導向同一 runtime；上方列實際功能與限制 |
| LP-03 採藥與工作切換（[#203](https://github.com/lalagrass/earth-ascension/issues/203)） | 本版實作；審查／合併見 issue | 同一 `/demo/`；藥圃、小路、藥架與背簍是簡單原創圖形，採藥幀由 `template/actions.json` 重烘（舊幀不變）；瀏覽器流程 `checks/herb-check.js` |
| LP-04 精力、可見休息與自主續工（[#205](https://github.com/lalagrass/earth-ascension/issues/205)） | 本版實作；審查／合併見 issue | 同一 `/demo/`；精力示意值見 [LP04_HANDOFF](../../docs/LP04_HANDOFF.md)。松樹下長石凳兩個固定座位（`demo/routes.mjs` 的 `SEATS`，簡單原創圖形）；往返用空手步態、由模型計時。熟手用模板「坐下歇」幀，主角 sheet 沒有坐姿，暫用採藥蹲姿並在面板標明，未重烘 atlas。停工＝走去座位坐著、回滿也不自己開工；舊「本趟後休息」改名「本趟後停工」。瀏覽器流程 `checks/rest-check.js` |
| LP-05 滿庫後偏好休閒與玩家叫回（[#208](https://github.com/lalagrass/earth-ascension/issues/208)） | 本版實作；審查／合併見 issue | 同一 `/demo/`；規則與驗收見 [LP05_HANDOFF](../../docs/LP05_HANDOFF.md)。觀景石（院子西側草坡）與道館門前空地兩個固定點（`demo/routes.mjs` 的 `FUN`，簡單原創圖形）；往返借採藥空手步態、由模型計時。模板新增「看山」背影與「舒展筋骨」4 幀循環（`template/actions.json` 的 extraPoses，重烘後舊幀逐像素不變）。一個空位只叫輪到的人回去；叫回待命到返院後一趟完成，恢復自主不解停工。瀏覽器流程 `checks/leisure-check.js` |
| V3 可操作展示（歷史基線） | 已合 dev | [design/V3.md](design/V3.md)；入口 `python3 -m http.server 8770` 後開 `/demo/` |
| BL-V03 第 1 步：山路與主角改前／改後（[#177](https://github.com/lalagrass/earth-ascension/issues/177)） | 已合 dev，待擁有人看 | [design/BL-V03.md](design/BL-V03.md)；靜態圖稿，未換進展示 |
| BL-L03 長住堂親：角色卡、同路對照、指點分鏡（[#180](https://github.com/lalagrass/earth-ascension/issues/180)） | 已合 dev，靜態設計 | [design/BL-L03.md](design/BL-L03.md)；設計圖稿，沒有新增正式角色 |
| BL-V04 兩人共用一組挑水動作（[#181](https://github.com/lalagrass/earth-ascension/issues/181)） | 已合 dev，實驗小樣 | [design/BL-V04.md](design/BL-V04.md)；小樣在 [template/](template/)，`python3 -m http.server 8771` 後開 `/template/` |
| BL-W02 道館往東接一塊藥圃：配置草圖（[#182](https://github.com/lalagrass/earth-ascension/issues/182)） | 已合 dev，靜態配置圖 | [design/BL-W02.md](design/BL-W02.md)；只是配置圖，沒有可走的新場景 |
| N1f 工作之後自己的生活：兩段流程分鏡（[#188](https://github.com/lalagrass/earth-ascension/issues/188)） | 已合 dev，分鏡圖稿 | [design/N1F.md](design/N1F.md)；沒有自主或社交實作 |
| 主角立繪＋兩種表情（[#184](https://github.com/lalagrass/earth-ascension/issues/184) 第 1 項） | 已合 dev，靜態候選 | [design/PORTRAIT.md](design/PORTRAIT.md)；靜態立繪候選，未定畫風 |
| 立繪放進現有介面＋圓臉 B 版（[#184](https://github.com/lalagrass/earth-ascension/issues/184) 第 2 項） | 已交，待人看 | [design/PORTRAIT-UI.md](design/PORTRAIT-UI.md)；疊在 V3 截圖上的合成示意，沒有改展示程式 |
| BL-V03 第 2 步：空桶／負重走路改前／改後（[#177](https://github.com/lalagrass/earth-ascension/issues/177)） | 已交，待審 | [design/BL-V03-WALK.md](design/BL-V03-WALK.md)；動態對照 `design/walk/preview.html`，未換進展示 |
| 整體畫風比較：同一挑水畫面，現況 vs 新風格候選（[#184](https://github.com/lalagrass/earth-ascension/issues/184)） | 已交，待審 | [design/STYLE-SCENE.md](design/STYLE-SCENE.md)；靜態候選，未換進展示 |
