# 模組地圖（src/ 現況）

> 量測於 `27aebd6`（#389）。loop144 把 63 個檔合併成下表 19 個；舊文件、LOG 與決策裡的舊模組名，用本頁最後的對照表找到現在的位置。
> 分層與依賴方向的整理見 #392（C3）；完成後本頁同步更新。`test/docs-links.test.mjs` 會檢查常青文件裡的 `.mjs` 引用都存在。

## 1. 模組與職責

| 模組 | 職責 | 有 DOM？ |
|---|---|---|
| `data.mjs` | 全部靜態資料：路網節點／邊、設施與階段、活動、88 門武學、怪物／波次／巡山路段、主角模板與門派、評分表、立繪清單、命譜樹、平衡常數、`RULES_VERSION`（2.5） | 否 |
| `util.mjs` | 共用小工具：`clone`／`dist`／`clamp`、關係鍵、事件紀錄與三級分流、種子雜湊、乘數組合 | 否 |
| `core.mjs` | 統一預約表（設施槽位、搬運預約）、工序步驟、任務取消與角色移出的共用收尾 | 否 |
| `sim.mjs` | **單一權威 `tick(s, dt)`**：建立狀態 `createState`、每日管線、活動評分 `scoreActs` 與任務推進；組合其他規則模組 | 否 |
| `arts.mjs` | 武學成長：熟練／階段、瓶頸衝關、領悟、讀書、三層成長（造詣）、內功（真氣、護體、十重、催動）、招式乘數 | 否 |
| `economy.mjs` | 錢糧與經濟：工錢／維護費、市集、雇工、執事自動營建、太平、季節、搬運加成 | 否 |
| `threat.mjs` | 侵擾與塔防：山賊類型、木柵／石牆、波次、匪寨、勝率與迎戰 | 否 |
| `world.mjs` | 同圖大世界：座標、區塊、環帶生態、鏡頭邊界、巡山遠征（背景模擬） | 否（只算資料，畫圖在 `main.mjs`） |
| `social.mjs` | 人際：好感與相容、關係階段、吸引與聊天對象、心情與想法、16 型人格、原型、師徒請教 | 否 |
| `bonds.mjs` | 共同記憶帳本、小圈子、傳功、秘笈殘章合成、喜好與志向 | 否 |
| `sect.mjs` | 門派與傳承：第二代（成親、收養、師承、衣缽）、門派勇名 `valor` | 否 |
| `hero.mjs` | 主角建立：六屬性、價值觀、問心、同門候選、價值觀乘數 | 否 |
| `jianghu.mjs` | 江湖事件卡、反派、戰力 `power()`、出手帳 | 否 |
| `wuxia.mjs` | 名俠奇遇、華山線 | 否 |
| `save.mjs` | 存檔、逐版遷移 `MIGRATIONS`（2.4／2.5 把舊局升到現行規則、刪世代旗標與規則開關）、讀檔 | 否 |
| `main.mjs` | 瀏覽器入口：Canvas 畫圖、鏡頭、小地圖、迷霧、面板 HTML、輸入、自動存檔、測試掛勾 | 是 |
| `panel-ui.mjs` | 弟子卡、成長／江湖／雇工面板、狀態列、折疊 | 是（產生 HTML 字串） |
| `start-ui.mjs` | 新局畫面：經典主角／自創／照舊（無具名主角，同樣是現行規則）、同門、江湖規則 | 是 |
| `audio.mjs` | WebAudio 即時合成音效 | 是 |

規則模組（`arts` 到 `wuxia`）目前互相 import，有 7 組雙向依賴（見 #392）；改一個系統前先看誰 import 它：`grep -l "from './<模組>.mjs'" src/*.mjs`。

## 2. 測試與工具

| 位置 | 內容 |
|---|---|
| `test/*.test.mjs` | 快速套件（`bash test/run.sh quick`），依版本命名；依系統重組見 #393 |
| `test/archive/` | loop 歷史回歸（`run.sh archive`） |
| `test/accept/` | 長跑驗收（`run.sh accept`） |
| `test/harness/` | 長跑與診斷腳本（`bot.mjs`、`diag-*.mjs`），平衡報告用 |
| `test/fixtures/` | 舊存檔樣本與 golden 雜湊 |
| `shoot.mjs` | 截圖腳本（需 playwright-core，非遊戲依賴） |

## 3. 舊模組名對照（loop144，`59ba262`）

依各檔內 `// ==== （原 xxx.mjs）====` 標記整理。舊名只出現在歷史紀錄裡；常青文件引用舊名時，同一行要寫出現在的模組。

| 舊模組 | 現在 |
|---|---|
| `archetype.mjs` | `social.mjs` |
| `band.mjs` | `threat.mjs` |
| `breakthru.mjs` | `arts.mjs` |
| `clique.mjs` | `bonds.mjs` |
| `comprehend.mjs` | `arts.mjs` |
| `dcard.mjs` | `panel-ui.mjs` |
| `destiny.mjs` | `data.mjs` |
| `draw.mjs` | `social.mjs` |
| `events.mjs` | `util.mjs` |
| `expedition.mjs` | `world.mjs` |
| `fence.mjs` | `threat.mjs` |
| `fold.mjs` | `panel-ui.mjs` |
| `gen.mjs` | `sect.mjs` |
| `growth.mjs` | `arts.mjs` |
| `growui.mjs` | `panel-ui.mjs` |
| `hero-data.mjs` | `data.mjs` |
| `huashan.mjs` | `wuxia.mjs` |
| `jhevents.mjs` | `jianghu.mjs` |
| `jhui.mjs` | `panel-ui.mjs` |
| `labor.mjs` | `economy.mjs` |
| `labor-ui.mjs` | `panel-ui.mjs` |
| `lair.mjs` | `threat.mjs` |
| `lifecycle.mjs` | `core.mjs` |
| `lift.mjs` | `economy.mjs` |
| `mbti.mjs` | `social.mjs` |
| `mentor.mjs` | `social.mjs` |
| `mind.mjs` | `social.mjs` |
| `modalq.mjs` | `panel-ui.mjs` |
| `mul.mjs` | `util.mjs` |
| `neigong.mjs` | `arts.mjs` |
| `peace.mjs` | `economy.mjs` |
| `portrait-set.mjs` | `data.mjs` |
| `prof.mjs` | `arts.mjs` |
| `raidkind.mjs` | `threat.mjs` |
| `readwu.mjs` | `arts.mjs` |
| `score-data.mjs` | `data.mjs` |
| `season.mjs` | `economy.mjs` |
| `sect-data.mjs` | `data.mjs` |
| `seedmix.mjs` | `util.mjs` |
| `slice.mjs` | `world.mjs` |
| `status.mjs` | `panel-ui.mjs` |
| `steward.mjs` | `economy.mjs` |
| `v10.mjs` | `bonds.mjs` |
| `valor.mjs` | `sect.mjs` |
