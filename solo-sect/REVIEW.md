# 可重跑驗收

## 第十一輪 N45：巡山前三段與剿寨逐招（#457）

實作 grass／Codex Cloud。山腳由主地圖上緣原 `DEN` 獸穴進場、林地由既有巢側接近；山腰及山寨另開 300×200 小地圖。隊伍及敵人的真位置每拍移動，`interceptOpening`、`resolveSwing`、`shieldHit`、原護體與出招冷卻決定結果。敵人、招式、前搖、勁、霸體及型的資料表見 [combat.md](docs/systems/combat.md)。圖只讀 `s.exp.bout`／`s.lair.trip.bout` 的權威狀態，沒有演出側的另擲勝負。

真遊戲畫布截圖：[山腳主地圖](artifacts/r11/n45/foot-main-map.png)、[山寨小地圖](artifacts/r11/n45/lair-small-map.png)。離線重拍：`PW=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node solo-sect/tools/r11-visual-check.mjs --seed=17 --out=solo-sect/artifacts/r11/n45`；`--seed` 可改任何整數，輸出 [`visual-check.json`](artifacts/r11/n45/visual-check.json) 的 `errors` 必須是空陣列。該工具不改模擬與素材，畫布只在本機 Chromium 繪製。

| 類 | 指令（repo 根目錄） | 門檻與預期輸出 |
|---|---|---|
| A 真來源／逐招 | `bash solo-sect/test/run.sh smoke` | exit 0；唯一 N45 小測試用正常 `startExpedition` 進第一段，敵人位置等於既有 `DEN`，下一拍距離縮短，交手交換數大於零，交手結束前不繼續行軍；剿寨也在小地圖以逐招得出布林勝負。 |
| A 時間與點數 | 任意 seed 正常派巡；檢查存檔的 `exp.bout.strikes` 及 `lair.trip.bout.strikes` | 每筆有 `at/who/target/move/reaction`，`at` 非遞減；同一敵人只在自己的 `cool` 到期後再起手。山寨進場賊人數由原每人 40 點、最少 2／最多 8 推得，總血量仍為 `trip.pts`。 |
| B 受力 | smoke 內既有 N35／N37 測試及山門紀 CI 中的 N27 回歸 | 地圖逐招使用原 `resolveSwing` 和 `contact.damageFactor`；命中後用原 `CLASH.heavy`、`guardOf`、`shieldHit`。沒有額外命中率或門派勝率係數。 |
| C 自然日程 | `docker run --rm -v "$PWD:/work" -w /work node:22-bookworm-slim node solo-sect/tools/bot12.mjs solo-sect --json` | 12 種子同工具、同 Node 22 的自然山賊、狩獵和巡山結果與 N43 分開列；C 結果只回報，不為貼近比例調常數。原始輸出在本輪 artifacts；CI 快測及 golden 是發 PR 後的正式門檻。 |

尚未補的敵人：深谷黑熊／山賊頭目；斷崖禿鷲／崖猿；古洞洞蝠群／巨蟒；絕頂瘋癲劍客／崖猿；白猿、古洞蟒王、劍塚守者、無盡段守者與大型分舵多波。這些路徑的舊期望值結算仍屬過渡，沒有將其輸出畫成已逐招。山腰以上地圖的四邊入場只在遠段使用，未讓門派內的敵人從四周憑空出現。

舊測試變更：本 milestone 尚未改舊斷言；若山門紀發現真正受新規則影響的假設，逐項列在本節並保留原驗收語意。舊名 → 新名：修改的 `world.mjs`／`threat.mjs` 交戰入口未引入輪次數字名稱，新增 `startMapBout`、`stepMapBout`、`bout`；舊 `fight` 留給明列未完成的遠段。最沒把握的三處：四方入場對山腰可讀性（用真場景邊界而非隨機憑空生成）；野豬群的三頭分血使個別受力不同於舊批次 HP（總值守舊）；剿寨真交手會把原戰力擲勝負改成可觀察的時間交手，舊日程數字可能大幅改變，按 C 類真實回報。

## 第十一輪 N43：來犯期、喘息期與單波紀錄（#455）

本節由 grass／Codex Cloud 實作。威脅點數與既有適應公式沒有修改；大威脅從第 8 日開始依本作七日一季、原重傷冷卻兩日循環，每次至少隔原排程最短的四日，同一期至多兩次。第二波若隔期才重來，按實際上山日占新一期名額。已在地圖上交手的山賊不因換期消失；野狗、偷菜野豬不受山賊週期限制。新常數的來源、世界理由見 [combat.md](docs/systems/combat.md)。

| 類 | 指令（repo 根目錄） | 門檻及預期輸出 |
|---|---|---|
| A 時序 | `bash solo-sect/test/run.sh smoke` | exit 0；`N43 喘息期不排大威脅` 通過：第 15 日不排大威脅、餘黨順延至第 17 日、同一期兩次之間至少四日且至多兩次；其他 smoke 仍通過。 |
| A 遷移 | 山門紀 CI 的 `rules-upgrade` 與 golden check | 3.9 存檔升 4.0 後保留原 `next`、`hist`、`pending` 與現場 `band`，在本期重建已上山次數；Node 22 重產 golden 後檢查全綠。 |
| B 點數未改 | `git diff <base> HEAD -- solo-sect/src/threat.mjs`，檢查 `points`、`threatBreakdown`、`winP` | 原點數和預估函式未修改；新增的時間層只決定何時生成 pending。 |
| C 自然山賊 | `docker run --rm -v "$PWD:/work" -w /work node:22-bookworm-slim node solo-sect/tools/raid-rhythm.mjs --days 30`，任意種子加 `--seed 17` | 逐季列真交手、受傷與週期大威脅次數；原始 12 種子輸出在 [raid-rhythm-12x30.json](artifacts/r11/n43/raid-rhythm-12x30.json)。每季至少一次傷者是 C 目標，差距須如實回報。 |
| C `waveBest` | `docker run --rm -v "$PWD:/work" -w /work node:22-bookworm-slim node solo-sect/tools/waves.mjs --days 0,30,60 --seeds 1-20`，或以 `--seed 17` 驗任意一例 | 第 0、30、60 日各複製自然狀態並正常派前三人出獵；輸出中位／Q1／Q3、未結束探針；原始結果在 [waves-1-20.json](artifacts/r11/n43/waves-1-20.json)。嚴格成長與三倍是 C 目標。 |
| C bot12 | `docker run --rm -v "$PWD:/work" -w /work node:22-bookworm-slim node solo-sect/tools/bot12.mjs solo-sect --json` | 同 Node 22、同 12 種子，原始 [base](artifacts/r11/n43/bot12-base.json) 與 [N43 head](artifacts/r11/n43/bot12-n43.json)；自然日常山賊與有柵探針分母分列，勝率與預估中位數的兩成差為 C 參考。 |

舊測試變更：`test/unit/economy/v190.test.mjs` 原本同一遊戲日重複呼叫 `threatDaily` 四十次來做傷亡守恆探針；N43 每期有限次大威脅，所以改由原 pending 資料列明確建立每次待決事件，原「不死人、孩子不受傷、付錢及戰鬥統計」斷言保持。`test/accept/v222.test.mjs` 原餘黨撞一般來犯探針排在第 5 日，現在屬首個喘息期，改到第 8 日真來犯期，仍斷言撞期延後一天與後續結算。沒有改動第六／七輪受保護的截鼠原斷言。

本輪 N43 自然 12 種子各 30 日：已完整觀察的第 8 日後季節有 36 季，其中 **20/36** 季至少一次守山有人受傷；時間窗內超過兩次大威脅為 **0**。每季受傷原目標未達，原因是排程只規定有壓力，未保證每次戰鬥都傷人；守柵、守者出招、山賊是否付錢與戰後冷卻都會改變實傷。沒有把傷人寫成保底事件。`waveBest` 第 0、30、60 日中位數 **0／2／3**，Q1 **0／2／2.75**，Q3 **1／3／4**；方向嚴格上升。第 0 日中位為零，無法把「第 60 日至少三倍」作有意義的倍率比較；該日 9/20 場在 900 遊戲秒內未完成，原始記錄含 `unfinished`。這些都是 C 平衡報告，不冒充 A/B 通過。

| bot12 C 指標（同 Node 22） | #502 base | N43 head |
|---|---:|---:|
| 自然日常山賊：已結算／真迎戰／勝／受傷 | 75／73／65／22 | 71／69／62／23 |
| 自然真迎戰勝率／來犯時 `winP` 中位數 | 65/73＝89.0%／100% | 62/69＝89.9%／100% |
| 有柵獨立探針：場／勝／守住／受傷 | 96／89／28／27 | 96／89／26／28 |
| 30 日威脅點數中位／末日勝算中位／惱羞次數 | 216／0.933／282 | 220／0.957／264 |

自然迎戰勝率與來犯時預估中位相差約 10.1 個百分點，落在原兩成 C 參考差以內；但兩者統計量不同，不能宣稱逐場校準。守柵探針仍只有 26/96 守住，與 N43 的排程無直接因果，因探針把現場固定為已有來犯；實際靠木柵耐久、修理與守者逐招在地圖上抵住。N45/N44 會擴充地圖交手及組織權杖，不為此 C 數字加門派勝率係數。

舊名 → 新名：此 milestone 修改到的時序名稱 `T` 原為既有威脅存取函式，保持既有 API；新欄位均用 `rhythmCycle`、`rhythmStrikes`、`lastBigDay` 語意命名，沒有新增輪次編號函式。最沒把握的三處：舊存檔若恰在第二波待發，跨期時歸入哪一期（按真正再上山日）；第 0 日尚無出獵能力時 `waveBest` 的零中位無法作有意義的三倍分母（保留原值）；季節受傷高度取決於當日自然弟子與木柵狀態，僅報實際數據，不為 C 比例另加勝率或傷害係數。

## N60：共用骨架上的分層像素人物（#492，純畫面）

實際主筆 grass／Codex Cloud；疊在第十輪 #499。玩家問題：主角、阿禾、石生和山賊原本同是線條身體與圓頭，很難一眼分辨。現在開白身新局，走路、練功、對練、打雜時，頭、髮、衣身、上下臂腿與手持物逐塊跟著原骨架移動；外觀色、髮型與體型從資料列／穩定 id 取得，沒有每人動作分支。像素部件由本倉程式原創，對照 `cousin.png` 的輪廓與受光；無新增外部素材。規則 3.9、存檔及 golden 必須不變。

| 類 | 指令（repo 根目錄） | 門檻／預期輸出 |
|---|---|---|
| A 首日真畫布 | `PW=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node solo-sect/tools/n59-visual-check.mjs --seed=17 --out=solo-sect/artifacts/n60/day-1` | 任一正整數 seed；從開局跑完首日，各觀測到的主角 task.act/phase 都截真地圖並拼[對照板 WebP](artifacts/n60/day-1/contact-sheet.webp)（工具產 PNG，以 `magick ... -quality 84` 等尺轉存）；在場人物每步均有姿勢、map 整張 `hero.png`／`cousin.png` 繪製次數 0。seed 17：16 種、7200 次、缺姿勢 0、整張圖 0；[原始統計](artifacts/n60/day-1/visual-check.json)。 |
| A 遮名三人 | `PW=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node solo-sect/tools/n60-blind-board.mjs --seed=17` | 先看同框[遮名圖](artifacts/n60/three-blind.webp)，不看 [有名圖](artifacts/n60/three-named.webp) 配對三人；再讀獨立[答案](artifacts/n60/blind-answer.json)。替換正整數 seed 仍要有三人、同一套分層圖。 |
| A/B 資產及規則 | `node solo-sect/tools/check-assets.mjs`；CI `bash solo-sect/test/run.sh quick`、`bash solo-sect/test/run.sh golden` | 所有新增的像素部件在執行時由 `paper-doll.mjs` 自繪，無第三方檔案；資產清冊通過。純畫面不新增抽樣式、`RULES_VERSION` 仍 3.9，golden hash 與 #499 完全相同。 |
| C 同尺 bot12 | Node 22：`node solo-sect/tools/bot12.mjs solo-sect --json` | [#499 base](artifacts/n60/bot12-base.json)／[N60 head](artifacts/n60/bot12-head.json) 原始輸出逐位相同；不拿 C 值調參。擁有人對畫風的評價待真人看圖，不當自動通過。 |

舊名 → 新名：`drawPoseActor` 仍是共用入口；線條／圓頭繪製退為無 DOM 的測試後備，實際畫布改用 `drawPaperDoll`；原 `IMG.hero` 師父特例與招式殘影整張圖改共用分層。最沒把握三處：低解析度關節旋轉會出現鋸齒；多位名俠以穩定 id 配色而非每人手繪衣服；擁有人覺得「像阿禾那樣好看」只能靠真實畫面回饋判斷，工程證據不能替代審美。

## N59：日常人物共用骨架（#490，純畫面）

實際主筆 grass／Codex Cloud。原問題是 `hero.png` 5×6 動作表在非練功時被當單張人物畫；現在活動資料選站、走、蹲、坐、劈、挑，缺資料回站姿。角色、出身同行與近景山賊／遠行人物都共用骨架；沒有模擬變更、RULES_VERSION 仍 3.7，`test/golden` 三檔與 30 日 fixture 均不變。

| 類 | 指令（repo 根目錄） | 門檻／預期輸出 |
|---|---|---|
| A 真畫布一日 | `PW=/path/to/playwright-core/index.mjs node solo-sect/tools/n59-visual-check.mjs --seed=17` | 換任意正整數 seed：白身開局跑到第 2 日，每個觀測到的主角 `task.act/phase` 截一張真地圖畫面，所有在場人物每步 `displayPose` 非空；整張 `hero.png`／`cousin.png` 的 map `drawImage` 次數 0。seed 17 實測 16 種、7200 次姿勢檢查、0 次整張圖。seed 777 同為 16 種、7200 次、0 次。 |
| A 盲板 | `git worktree add --detach /tmp/n59-base e0c4cf6`；以同一 seed 對舊樹執行上條工具，加 `--root=/tmp/n59-base/solo-sect --out=/tmp/n59-base-shots --baseline`；再執行 `PW=… node solo-sect/tools/n59-blind-board.mjs --base=/tmp/n59-base-shots --seed=17` | 先只看 [A/B 盲板](artifacts/n59/blind-board.png)，逐行辨認一致骨架，再讀獨立[答案](artifacts/n59/blind-answers.json)。seed 17 舊版 6015/7200 次無姿勢、96 次整張圖；本版 0／0。工具同樣接受任意 seed。 |
| B | 無新的抽樣公式。 | 無公式門檻。 |
| C bot12 | `node solo-sect/tools/bot12.mjs solo-sect --json` | [N57 base](artifacts/n59/bot12-base.json) 與 [N59 head](artifacts/n59/bot12-head.json) 原始輸出逐位相同；名俠第 10／30 日中位 0／0、自然山賊 5 場。畫面 PR 不拿 C 數字調參。 |

[第 1 日 16 種 task/phase 對照板](artifacts/n59/contact-sheet.png)與[每種原圖](artifacts/n59/states/)；[原始 Playwright 統計](artifacts/n59/visual-check.json)。A/B 的左右標籤只寫 A／B，答案另存，不在板上揭露。`white-body.test.mjs` 只把 N55 原共用姿勢表名稱 `WORK_POSES` 更新為擴充後的 `DAILY_POSES`；熟練畫面差異斷言保留，沒有放寬。

## N57：糧食收支查因（#487，規則 3.7）

實際主筆 grass／Codex Cloud。N57 只在原帳本標糧食來源，沒有改產出、消耗、招募機率或門檻。舊檔 3.6→3.7 把未標來源的原總額列為 `legacy`；庫存不變。世界內理由：灶房烹出的飯要供日常三餐，送飯和來客同席是額外真消耗；三人小門派的產出因而很難存到下一位入門的一日份。詳 [逐日原帳與機制](docs/systems/food-ledger.md)。

| 類 | 指令（repo 根目錄） | 門檻／預期輸出 |
|---|---|---|
| A 逐日守恆 | `node solo-sect/tools/food-ledger.mjs --seed=17 --days=30 --json` | 任意整數 seed：每行 `closing-opening=incoming-outgoing`；`balanceError=0`、`sourceError=0`。 |
| A 舊檔遷移 | `bash solo-sect/test/run.sh smoke` 與 CI quick 的 `n57-food-ledger.test.mjs` | 庫存不變，原帳來源標 `legacy`，重複遷移不重計。 |
| C 同版 bot | `node solo-sect/tools/bot12.mjs solo-sect --json` | 與 9c base 數值相同；原始 [base](artifacts/n57/bot12-base.json)、[head](artifacts/n57/bot12-head.json)。人數／來犯只報數字。 |
| C 舊新版差異 | `node solo-sect/tools/food-ledger.mjs <9b 或 9c 的 solo-sect 絕對目錄> --seed=1001 --days=30 --json` | 9b 第 10／30 日住民中位 15／29、名俠 7／11、來犯 84；9c 住民 3／3、名俠 0／0、來犯 5；兩版每日帳差皆 0。原始 [9b](artifacts/n57/ledger-9b-1001.json)、[9c](artifacts/n57/ledger-9c-1001.json)，其餘種子同目錄。 |

9b 同 seed 1001 30 日入 1739／出 1743／收盤 2；9c 入 378／出 374／收盤 10。9c 支出 311 日常餐、36 次端飯、27 份來客；9b 固定 3 份招募，9c 全門加候選人一日份 14。9c 第 10 日僅存 9，未達入門條件；`51d9feb` 已移除共餐重記，現行逐日守恆不支持再次扣糧的假說。12 種子 9c 第 10／30 日存糧中位皆 10，均不足 14；這是 C 類結果，沒有調參。畫面仍在既有資源頁看「昨日收支」，本 PR 的來源明細可由 JSON 讀。

正常遊戲第 11 日的[門派收支畫面](artifacts/n57/ledger-ui.png)與[畫面原數](artifacts/n57/ledger-ui.json)可用 `PW=/tmp/ss-playwright/node_modules/playwright-core/index.mjs node solo-sect/tools/n57-shots.mjs` 重拍；頁面只顯示原有的倉存與昨日總帳，來源分類是 JSON 帳本的稽核欄。

首次 CI quick 630/631：`v220.test.mjs` 的 30 日完整存檔 hash 仍釘 3.6 的序列化內容。3.7 增加 `foodBySource` 後，Node 22 同一 seed 42 的新 hash 為 `01c88b908115b6aa`；只重產 `golden-30d-v22.txt`，原斷言和測試場景不改。bot12 base/head 原始輸出逐位相同，並非藉新 hash 掩蓋糧食數值回歸。

## 第九輪 9c：N50／N38 與 #445 新增情境可達性（規則 3.6）

本輪承接已由擁有人合併的 #485（merge `4885eb8`），實際主筆 grass／Codex Cloud。N50 出身普通同行、共同食宿與真雙人指導時數及同一招募公式；N38 用真接法機率即時命名等級，沒有第二套 XP。N33 新生者過往手眼熟不再沿用他人的記憶，N32 正式譜必須來自真授藝或教材。#445 追加的三種悟招情境修在同一輪；悟招難度、失手時 `w=4p(1−p)` 和原始 N22／N27 高手截鼠斷言不變。

9c 的 A 規則由 `bash solo-sect/test/run.sh smoke` 的原 N35 小測試擴充驗證：真閃野豬衝撞後以踢招側擊，負傷或失衡被逼住時撒土，山路上真撿石並於敵人在途時起手投出。野豬只選真射程內的招，倖存者假衝不能同場無限重複；投石與側擊把起手時的真情境保留到出手，不造出不存在的來敵。N50／N38 各只有一個本 milestone 小測試；最終 smoke 與 CI 數字見本節後續驗收表。

完整量測指令從 repo 根目錄執行：

```sh
bash solo-sect/test/run.sh smoke
node solo-sect/tools/bot12.mjs solo-sect --json
node solo-sect/tools/white-body.mjs --seed 17 --days 30 --check
node solo-sect/tools/glimmer-metrics.mjs --days=60
node solo-sect/tools/glimmer-metrics.mjs --days=60 --hunt-every=3
docker run --rm -v "$PWD":/repo -w /repo node:22-bookworm-slim node solo-sect/tools/golden.mjs --write --tier all
```

`glimmer-metrics` 不注入敵人、熟練或血量。純經營 bot 不主動出獵；`--hunt-every=3` 是玩家每三日選一次正常出獵的輸入，兩者不混稱。兩者皆只將真 `resolveSwing` 的情境次數列 C；首次悟招日期、白身級名到達日與名俠人頭也按 #441/#445 的新版驗收列 C，不靠改常數湊目標。截圖由 `PW=/tmp/ss-playwright/node_modules/playwright-core/index.mjs node solo-sect/tools/round9c-shots.mjs` 從正常頁面取得：[人物卡](artifacts/round9c/people.png)／[入門原因](artifacts/round9c/admission.png)；[原始畫面文字](artifacts/round9c/shots.json)。

規則 3.6 遷移保留舊名單與已學武學，為舊角色補 `timeToday`／`guidanceTotal`；新局同行仍由出身真資料產生。Node 22 是 CI 的 canonical golden runtime；Node 24 的前輪 N33 浮點計算曾有 1 ULP 差異，不混用兩版 hash。

9c 第一輪完整 CI（[run 42326710710](https://github.com/lalagrass/earth-ascension/actions/runs/42326710710)）quick 572 過、57 敗，golden 因 quick 失敗跳過。舊測試多處默認開局有林師姐／堂弟、指定名俠當場入門；N50 正式開局已改為出身同行與共用招募，因此舊機制測試改用 `test/harness/historical-party.mjs` 明確建出所需歷史角色，原交手、劇情和人際斷言保留。真實回歸另修：新同行者剛建立時缺 `best`／`insight`／`away`，讀檔才補，破壞現行存讀冪等；義學帶回的候選被固定招募名冊擋在後面，未能優先走共用食宿與師父驗算。第七輪群戰探針現在明確安排洪七公第三段傳藝後量亢龍時間，避免把 N50 不再保證見到師父誤當成群戰機制失敗。訪客共餐原本已走 `resAdd` 自動記帳，資源稽核失敗是新合法管道未列白名單；再加一次 `book` 會重複記帳，已撤回。舊 v2.2 三十日存檔 hash 隨正式新開局改變，Node 22 重產 `test/fixtures/golden-30d-v22.txt`，不改早期 `golden-30d.txt`。後續 CI 結果仍待核對。

本輪觸及舊招募／練功程式的可讀名稱：`fnv29 → stableTraitHash`、`RECRUIT29 → RECRUIT_TRAIT_VARIATION`、`trained31 → trainedArt`。歷史文件中的舊名保留為當時紀錄；舊存檔鍵 `v29n` 仍照 3.6 遷移讀取，不靠改鍵名破壞回放。

bot12 取已合併 9b 的相同工具重跑 base，與 9c head 的[完整原始輸出](artifacts/round9c/bot12-head-final.json)對照（[base](artifacts/round9c/bot12-base.json)）。第10／30日常住名俠中位數為 **7／11 → 0／0**，後者兩日均低於 N50 原 C 目標；候選人的拒絕理由明記「存糧不足全門一日」，例如 9.0/14.0，並保留每人床位／師父空檔／處境效用。這是食宿共用門檻對舊免費名俠的真影響，沒有為湊人頭轉動出現頻率。其餘 C 指標：單人狩獵擊退 317→259、溜走 139→318、失血 9→55；**有柵探針** 96/96→94/96，守柵 26→88，重傷 28→4；**自然日常山賊** 84/84→4/5、重傷 20→3，兩個分母不能混用。自然山賊戰數隨招募和威脅點數 687→0 一起下降，五場的勝率不可和前輪 84 場當同分布的強弱結論。巫時自然 1→0、柵探針 1→29，惱羞 125→149，常見武學 DPS 中位 144.4→492.8（樣本 155→2）；後一個中位數因新規則讓該類僅餘兩人，不能代表通常武學被整體加強。相較 9c 首版，義學帶回的人現在先走共用招募，因此同源 bot 路線改變，柵探針由 96/96 變 94/96；這是 C 觀測而非另設勝率係數，原始 JSON 保留每戰原因。

N38 指定 seed17 的[自然 30 日原始輸出](artifacts/round9c/white-body-seed17-final.json)：A 類每筆即時級名與機率投影一致，`rulePass=true`；ISTJ／INTP／ESTP 首到 1 級分別為 d8／d2／d3，3／4／5 級均在 d8，2 級未到，單人對豬逼退日皆 null。拿手招依真交手選招次數分別為揮拳／踢／踢，故三人格只有兩種最常用招。原設計日期與單豬日未達 C 目標，d8 出現正式級名與原江湖葵花殘頁、後續授藝事件有關，不能誤寫為土招自然磨練。Node 22 重產 golden quick 4、full 32、舊檔矩陣皆相符（[原始日誌](artifacts/round9c/golden-write-node22.log)）；本地 smoke 19/19（[日誌](artifacts/round9c/smoke.log)），完整 quick 與 golden 仍由 PR CI 驗證。

N35 [純經營日程 12 種子 × 60 日](artifacts/round9c/glimmer-60-final.json) 的六情境「出現／失手」為奪械 286/190、側擊 0/0、掃 51/20、摔 10/5、撒土 108/80、擲石 0/0；主角首悟日 12 人皆 null。這個日程沒有玩家主動出獵，故沒有野豬衝撞或山路撿石，不能把零次說成招式規則不可能。固定野豬閃後踢、被逼住失手與來敵時擲石三段真 `resolveSwing` 都在原 N35 小測試中出現，A 由 smoke 通過。下段同種子、每三日正常出獵的 C 原始檔另列主動玩法數字，不會把輸入隱藏在「自然 bot」名下。

[同一 12 種子 × 60 日、玩家每三日選一次正常出獵](artifacts/round9c/glimmer-hunt-12seed-final.json) 的六情境「出現／失手」為奪械 470/313、側擊 0/0、掃 67/33、摔 628/183、撒土 461/276、擲石 220/64。141 次真出獵中有 561 次野豬衝撞、2 次真閃，主角真閃 0 次，因此沒有主角側擊情境；排定野豬閃後踢的 A 測試仍能在真 `resolveSwing` 觸發。這組 C 顯示該情境在正常主動出獵下仍極罕見，不能把 A 可達性誤寫成自然已常見；12 人首悟仍全 null，與第 7–10 日原 C 目標有明顯偏差。現有難度門檻與只在失手時累積的規則未改；交 reviewer 與擁有人決定是否要再改世界規則。

| 類 | 指令 | 預期輸出／本輪觀測 |
|---|---|---|
| A N50／N35／N38 | `bash solo-sect/test/run.sh smoke` | exit 0、19/19；N50 容量剩一只收一人，N35 三段排定真交手可觸發，N38 名稱隨機率變。 |
| A N38、C 日期 | `node solo-sect/tools/white-body.mjs --seed 17 --days 30 --check` | exit 0、`rulePass=true`；`balanceTargets` 分項與每人首達日見原始 JSON，不以日期作 exit gate。 |
| C N50／戰鬥 | `node solo-sect/tools/bot12.mjs solo-sect --json` | 列 12 種子名俠 d10/d30 及探針／自然戰各自分母；與同版工具 9b base 對照如上。 |
| C N35 | `node solo-sect/tools/glimmer-metrics.mjs --days=60` 及加 `--hunt-every=3` | 每種子真情境與首悟日，兩日程分列；後者六種情境均非零，但首悟 null。 |
| golden | Node22 `node solo-sect/tools/golden.mjs --write --tier all` | quick4、full32、saves 全相符，PR 山門紀 job 仍需全綠。 |

以下指令由 repo 根目錄執行；需要比對逐位元組 golden hash 時用 CI 相同的 Node 22，其他功能驗收可用 Node 22 或 24，無需下載素材／套件。N33 的長尾反應運算在兩版 V8 有末位浮點差異，規則公式保持原樣，不能混用不同 runtime 產生的 golden。工具可接受 `--seed`，標籤工具使用該種子的真實模擬快照，不以種子選擇門檻。素材檢查無隨機資料，傳入種子不影響結果。

## 第八輪：N53／N48／N52／N49，N54 review 修正（#468、#482）

N54 僅改顯示、素材及驗收入口；以 `4ebe9e5` 為前版。推進 P1 可讀的門派生活、P2 看懂在練的招式。

| 指令 | 門檻 | 預期輸出 |
|---|---|---|
| `bash solo-sect/test/run.sh smoke` | 結束碼 0 | 六份舊檔各 3 日、兩種子各 10 日 `ok`；結構測試 `fail 0` |
| `cd solo-sect && node tools/golden.mjs --check` | 與已提交 golden 完全相符 | 結束碼 0，無差異（完整矩陣交 CI 山門紀 job） |
| `node solo-sect/tools/label-overlap.mjs --seed 你選的整數 --day 10 --phase dawn` | `overlaps = 0`、`heroShown = true`、`revealChecks = true` | JSON 列出 `shown` 每個文字框（left/right/top/bottom）、被收起的 `hidden`；主角在 shown，每個被收起人物選中後可顯示。至少換三個種子 |
| `node solo-sect/tools/check-assets.mjs --seed 你選的整數` | 每檔有明確來源與允許授權；肖像 ≤ 12,000,000 bytes、長邊 ≤512、無 old | `assets OK: 168/168 licensed; portraits … bytes <= 12000000; longest side <= 512; old absent` |
| `du -sh solo-sect/assets/portraits` | ≤ 12 MB | `12M`（du 含磁碟區塊取整；精確 bytes 以前一指令為準） |
| `git diff 4ebe9e5 HEAD -- solo-sect/src/data.mjs solo-sect/src/save.mjs solo-sect/test/golden solo-sect/test/fixtures/golden-30d-v22.txt` | 空輸出 | N54 沒改規則 3.3、遷移或 golden；亦未修改其他模擬檔 |

### 標籤盲測（離線示意，不冒充遊戲實拍）

1. 執行 `node solo-sect/tools/label-overlap.mjs --seed 你選的整數 --day 10 --phase dawn --blind-out /tmp/n54-blind > /tmp/n54-metrics.json`。
2. 只開 `/tmp/n54-blind/A.svg`、`B.svg`，猜哪份收起碰撞文字。兩圖用同一真實快照、同一人物位置／文字，圓點只代表人物，不是遊戲立繪；未避讓組是本輪候選文字的完整集合，不是舊版實拍。
3. 猜完才讀獨立 `/tmp/n54-blind/answers.json`。A/B 由 seed 的 SHA-256 決定順序，可重跑；不是人工挑圖。數字見獨立 `/tmp/n54-metrics.json`，新圖兩兩交集數必為 0。

### 遊戲畫面操作

`python3 -m http.server 8123 --directory solo-sect`，開 `http://localhost:8123`（不要用 8800）。開始郭靖開局，早課外功場可看到名字與招式合成一行；外門／首徒身分只在人物卡。滑過被收起人物，該人的單行文字取得優先權、完整文字亦在 tooltip；在人物選單選中亦可顯示。設施、庫存、山賊與下山野獸常駐文字共用碰撞表。短暫傷害字、招式特效不是常駐頭上標籤。

切「紀錄」捲到底：必有 `Delapouite / game-icons.net（CC BY 3.0；圖示去背、改深棕色）・霞鶩文楷（OFL）・Kenney（CC0）`。頁面與素材執行不連網；外部連結僅供使用者主動查看授權。

### 本次紀錄與限制

- 肖像從 81,382,280 bytes 瘦身，122 張 PNG；LANCZOS 長邊 512、96 色量化（由原圖一次轉換，保留 PNG 透明度）。第三方權利仍未核實，#481 決定；此檢查不等於商用權利清查。精確肖像目錄大小 11,387,898 bytes；素材 168/168 有清冊。
- 本地三種子結果：17 顯示21／收起15；904 顯示19／收起18；20261106 顯示20／收起16；三者 overlaps=0、heroShown=true、revealChecks=true。
- 本地僅 smoke 與上述小型驗收，不跑完整 golden 或 bot12 矩陣；完整 quick + golden 在 CI 驗證。
- 保守字格可多收一些標籤，換取不同離線字型環境仍不相撞。`window.__sect.labels` 可讀當幀真正使用的框；投影縮放是同一仿射轉換，不改交集結果。

## 第九輪 9a：白身、手眼熟與可見成長（#441）

| 指令 | 門檻 | 預期輸出 |
|---|---|---|
| `bash solo-sect/test/run.sh quick` | 全部 pass，fail 0 | N14/N16/N22/N27 舊截擊護欄與新 N32/N33/N55 同時通過；N33 不改舊截鼠斷言 |
| `cd solo-sect && node tools/golden.mjs --check` | quick/full/saves 與已提交 golden 完全相符 | 結束碼 0，所有格 `ok`；3.4 變更回放 hash，須用本輪 golden |
| `node --test solo-sect/test/rules-upgrade.test.mjs solo-sect/test/v095.test.mjs` | fail 0 | 3.3 舊檔逐版遷移到 3.4、現有武學不消失、同種子可重播 |

### N32 白身開局與起手表（#442）
| 指令 | 門檻 | 預期輸出 |
|---|---|---|
| `bash solo-sect/test/run.sh smoke` | exit 0 | 舊檔與新局煙測通過，schema fail 0 |
| `node --test solo-sect/test/white-body.test.mjs` | N32 小測試通過 | 白身arts為空、起手順序、豬衝撞可移步、拳不破豬霸體、第一隻狗從SOURCES走進來；非白身保留原武學 |

瀏覽器新局預設「白身開局」；可選回經典／自創／照舊。第一天黃昏留意從東北獸穴沿路走入的狗，不是從主角身旁冒出。土招在真實守點與試煉使用，不是只供工具列印的資料。N32 尚未處理 N36 士氣／N37 刀傷與奪械，詳 combat.md 邊界。


### N33 共用手熟／眼熟（#443）

| 指令 | 門檻 | 預期輸出 |
|---|---|---|
| `bash solo-sect/test/run.sh smoke` | fail=0；本milestone只新增一個N33小測試 | 13/13（schema10 + N32/N33/N55各1），50有效次gap=.5、人獸皆記n/f；高手過往初值與同類招折算 |
| `node solo-sect/tools/practice-probe.mjs --seed <任選整數>` | `pass:true`，before.stand介於.1–.3，after20.stand>.5 | 20筆真resolveSwing事件含p/w，初次stand=.2；after4及after20反應縮短 |
| 上一指令連跑兩次並比較stdout | byte-identical | 同種子相同20次抽樣及事件，不依賴作者檔案 |

probe是「充分休息、沒有惱羞/在途攻擊」的20次獨立新狗**單招**診斷，刻意隔離眼熟；不是宣稱20場完整戰鬥存活率或已驗N36嚇退。畫面尚未桌面驗證。完整戰鬥/平衡由第九輪收尾bot12與CI驗，不以工具對照取代遊戲整合。


### N55 共用骨架真成長播放（#474；影片／真人盲測待補）

| 指令 | 門檻 | 預期輸出 |
|---|---|---|
| `bash solo-sect/test/run.sh smoke` | fail=0；只新增一個N55小測試 | 13/13，參數唯讀、同動作同序列、Canvas座標因真參數改變 |
| `node solo-sect/tools/growth-metrics.mjs --seed <任選整數> --days 1,60` | 前五欄每欄朝合理方向減少≥25%，`pass=true` | 劈柴停頓、挑水傾角、髖高、三式秒數、直拳前搖；另列式間停頓/晃動、事件數與SHA256 |
| 上一指令同seed連跑兩次，至少另換兩種seed | stdout完全相同、三種seed皆pass | 不依賴作者的snapshot；每次真跑60日，需等待約數分鐘，非完整測試矩陣 |
| `node solo-sect/tools/check-poses.mjs` | errors空、pass=true | 列出79組序列，熟練不產生第二份，所有姿勢都存在 |
| `node solo-sect/tools/check-assets.mjs` | missing=0，168/168 | 全素材授權仍可離線查；此milestone無新asset |
| `node solo-sect/tools/blind.mjs --seed <任選整數> --out out/blind`，再由真人於正常 UI 匯入 A/B 各錄製 10 秒 | 真 A/B.webm 各至少 10 秒同動作；真人猜對且三處差異對得上量測 | CLI 只產 A.json/B.json、metrics.json、key.txt，明印 videosCreated=0/NOT_RUN；影片與真人結果須另驗 |

盲測預設 train；可另加 `--action chop`／`water`。先記三處差異，才讀 key.txt。輸出同路徑會覆寫前次檔案，請用不同 out。正常頁面透過 File API 匯入、MediaRecorder/canvas.captureStream 下載 WebM；CLI 不啟動瀏覽器。錄影或真人盲測尚未執行；連兩名 reviewer 猜錯依 #479 決策，不自改 3D。

受控日程與各常數理由見[combat.md N55](docs/systems/combat.md#n55成長只改共用骨架的播放474)。數字證據寫在`docs/evidence/r9-n55-growth.md`；桌面與影片驗收不得用這張表、SVG或mock Canvas測試冒充。

本輪本地結果：smoke 13/13；quick 623 passed、0 failed；golden 重產 quick 4 格／full 32 格／舊檔並回報「全部相符」；`check-poses.mjs` 79 組、0 錯；`check-assets.mjs` 168/168。三種子 N55 前五欄均超過 25% 差距，原始資料與 hash 見上述證據文件。N55 影片與真人盲測仍待 reviewer。

| 舊測試與改動 | 為何規則改變，保留的驗收 |
|---|---|
| N14 招架抽樣 `.5 → .1` | N33 的 log-logistic 長尾使陌生、悟性 1 的中位反應 `.477` 秒加格架 `.1` 秒大於 `.5` 秒來招；`.1` 分位反應 `.292` 秒加格架能趕上、加移步 `.25` 秒趕不上。測試仍查雙方架勢與氣血，並新增三條時間窗斷言。 |
| 名功破架勢抽樣 `.99 → .5` | `.99` 分位反應已超過 1 秒玄鐵前搖，無格架可破；`.5` 能格架。新增兩個分位時間窗斷言，仍查玄鐵與降龍的架勢歸零。 |
| 巡山單種子距離嚴格次序 | N33 交手學習改變遭遇結果與後續亂數路徑，因此 60/90 的一次行程距離不再嚴格排序。仍驗 0 級比 60/90 均短、三檔 `dpsOf` 嚴格遞增、90 級四人隊至少入深谷。 |
| 撤退線整趟距離次序 | 提早用乾糧療傷與遭遇路徑分岔可使完整行程距離倒轉；改在同一局面、同一氣血與無補給下直接驗 70% 先回頭而 30% 繼續，並保留完整行程的決定性檢查。 |

`round6-n22.test.mjs` 與 `round7-n27.test.mjs` 的高手截鼠原始測試未改；兩者由 quick 原斷言通過。

CI Node 22 與本地 Node 24 初次出現四個 golden hash 差異：`exp-1001-emei`、舊檔 v2.2／v2.3／v2.4 的回放；其他 619 項在 Node 22 通過。直接比較 5 日與 10 日 `exp-1001-emei` 的完整存檔，各自唯一差異都是 `practice.families.cut` 的 1 ULP（5 日 `5.242397237275723`／`5.242397237275724`）；v2.2 舊檔回放的完整存檔也只在 `bswing.wind` 差 1 ULP（`0.006841791166913072`／`0.006841791166913073`）。兩者均在 N33 浮點時間／手熟計算路徑，未見不同的事件或決策。依 CI runtime Node 22 重產 canonical golden，不改 `w=4p(1−p)`、不改時間機制或原始高手截鼠斷言。

### N34 選招／輸後心願（#444；N37後樣本通過，非任意seed已證明）
N33「高手認得短招」沿用原門檻 .9；第九輪首輪 CI 揭出移步接招誤搶先於更快的截擊，已恢復 N27「截擊先於進身閃」的秒數順序。`dodgeCounter` 保留作不同動作時間窗的獨立紀錄，不從截擊成功率扣除。round6-n22／round7-n27 的原始高手截鼠測試不改。
| 指令 | 門檻 | 預期輸出 |
|---|---|---|
| `bash solo-sect/test/run.sh smoke` | fail0；N34僅1個小測試 | 14/14；穩定同情境決策0，三種性格均等觀測下偏好至少2種，真交手產生心願 |
| `node solo-sect/tools/duel.mjs --a day1 --b day1 --seeds 1-20` | 交手中位≥30、沒人受傷≥70% | 每場次數、兩人受傷、喘氣；N34原38/33.3782% FAIL；N37後428/75.793184%，樣本pass，沒有降低70% |
| `node solo-sect/tools/duel.mjs --a day60 --b day1 --seeds 1-20` | 最小移步≥baseline3倍且>0；同拍反擊≥5 | N37後0.311320755對0.081074977、33反擊，樣本pass；訓練seed1，非任意seed已證明 |
| `node solo-sect/tools/duel.mjs --seed <任選> --log out/duel.json` | reviewer任取3筆成功接法驗r+m≤T | 每拍T/r/m/margin；forced行沒有假抽樣時間，不拿它手算 |

工具不連網、無額外套件。day60會真跑60日；詳combat受控訓練/交手seed的區分。無傷關卡不過先補N37共用受力規則，不調機率湊門檻。完整自然玩法的三個性拿手招另由N38/bot12量，不以均等觀測單元測試冒充。


### N35 悟招資料／真效果（#445；完整日數與勝率待整輪量測）
| 指令 | 門檻 | 預期輸出 |
|---|---|---|
| `bash solo-sect/test/run.sh smoke` | fail0、N35只1小測試 | 15/15；不失手不累積、p.9平均慢13.8889倍、普通悟性fixture24份學會側擊且真打斷、人敵都可悟 |
| 第九輪收尾bot12 60日（N38擴充） | 第一招約d7–10作護欄；弱敵p≥.9的12seed皆無悟招 | **尚未量測，不宣稱通過**；不得以單元fixture或理論平均取代完整輸出 |
| N37共用力層接入後對豬重驗 | 側擊前後完整勝率提高 | **待做**；現在只驗繞霸體/打斷，不將其說成勝率已量出 |

新招與詞彙表見combat N35。掉落武器已進主畫面Canvas繪製、可真撿起；本worker沒有桌面實拍。PR最沒把握處需保留difficulty72/96/48的初始練習量假設與自然玩法尚待校準，不造達標日。


### N36 共用負荷／士氣／走位（#446）
| 指令 | 門檻 | 預期輸出 |
|---|---|---|
| `bash solo-sect/test/run.sh smoke` | fail0，只新增1個N36小測試 | 16/16；同一人四狗空地L≥1、樹邊L<1、超載無反擊、倖存者uid/n保留、一步沒有瞬移 |
| `node solo-sect/tools/waves.mjs --seed <任選整數> --log out/waves.json` | 所有L≥1的接法counter=false；每個指定trait的1及2路各有counter；四狗open≥1而cover<1 | `summary.pass`真/假照實；log每拍含L/reaction/counter，所有defense列可獨立重新加總；讀下方測量邊界 |
| `node solo-sect/tools/waves.mjs --seed <任選整數> --trait calm,rash --log out/waves-traits.json` | 急躁的N29惱羞搶攻次數與損血多於穩定者；超載仍無反擊 | `personality.calmRush/rashRush`、`calmHpLost/rashHpLost`；總attacks另外列，不能偷換指標 |
| 相同seed重跑同一條waves指令比較stdout | byte-identical | 不讀作者工作目錄/快取、無新套件，固定.25步 |

回查#446原文：「reviewer 檢查所有 L ≥ 1 的拍都沒有反擊；1 到 2 人同時進攻時有反擊。」正文沒有允許aggregate，先前用整包任一性格過的判法不足，已撤回；預設normal，每個指定trait各自檢查1/2路。c23d645的normal seed17零反擊為歷史FAIL；N37後1路2次、2路0，仍未通過，不以別的trait遮過。工具真跑受控60日練功/勞動後才入場，不是自然自動玩法。1/2路在真山門兩席、4路在空地，已起手者不會因掩體消失。四狗負荷probe用20次真接法形成眼熟，列receptionHp；未知白身初次反應.6秒，不假稱本來就接得住.4秒狗咬。追擊列是共享移動機制的幾何探針，**不是已驗完整跑/不跑被咬比例**；自然玩法比例仍待整輪bot12/補驗。新工具沿現有60日指派場景，需數分鐘，並非完整suite。

尚待parent正常桌面：狩獵喊來的同門沿山路到場、靠可見樹/大殿牆改近戰席、狗追跑者、敵退到出口後再來保留疤與假衝。未取得實拍，不把Canvas單元測試或SVG算畫面驗收；N55影片仍未產生。c23d645歷史表在N37前；N37起工具損血經真力層，不以舊數字充當新驗收。

本N36樣本、命令、逐拍JSON雜湊與normal單情境FAIL見[事件量測](docs/evidence/r9-n36-waves.md)。不是CI或自然玩法已驗。


### N37 共用真受力／傷口／重心與純顯示停頓（#448）
| 指令 | 門檻 | 預期輸出 |
|---|---|---|
| `bash solo-sect/test/run.sh smoke` | fail0，N37只新增一個小測試 | 17/17；連擋破綻/側別筋骨傷/雙接觸面分力/唯讀顯示皆同一test |
| `node solo-sect/tools/contact.mjs --seed <任選整數> --log out/contact.json` | `pass=true`；重心0後破綻秒數符合body資料；同腳狗/豬傷層及退距不同；顯示開/關state SHA256相同 | force40三次招架、1.45秒破綻；狗傷筋82.5px、豬無傷16.5px；白拳.1秒/成人骨力尺度.5秒/四人.288675秒 |
| 同contact命令連跑兩次 | stdout位元相同 | 不讀作者檔案、沒有外部相依；fixture控制招架窗口，不冒充自然勝率 |
| 上面N34兩條duel指令 | 原始≥30/≥70%、高手≥3倍且>0/≥5次反擊門檻不變 | 見最新證據；只是訓練seed1+20交手seed樣本，不是任意seed都已驗 |
| 上面N36 normal waves指令 | 每seed/trait的1/2路都須反擊、超載0反擊 | **seed17兩路0反擊，FAIL保留**；不因N34過就宣稱整輪完成 |

程式整合與常數論述見[combat](docs/systems/combat.md#n37-真力分層傷回正與局部停頓448)，最新樣本/失敗/原始JSON雜湊見[證據](docs/evidence/r9-n37-contact.md)。全部真地圖交手、反擊、試煉、範圍、轉勁、山賊與duel/waves共用力層；不是獨立demo。`injuryDaily28 → injuryDaily`為本milestone舊名整理。

待parent正常桌面通路：真交手雙方局部停頓/受方震動較大、旁人持續動；筋/骨傷那隻手不能正常出招；同腳狗/豬退距差。可用既有診斷入口`window.__sect.hitstop=false`切純顯示對照，**本worker沒有開UI/實拍**，不要Shell browser或繞過預覽403。N55影片/真人盲測仍欠；hitstop開關state相同不代表整輪玩法golden相同，3.4收尾還要重產。

N35/N37媒介後續修正：`bash solo-sect/test/run.sh smoke`門檻fail0，預期仍17 tests，N37原test包含irritant來源力10000仍無組織傷/推退/偏移；`CONTACT_MEDIA`為通用schema，#445撒土只觸發原blind/dishonor，非按招名判斷。N37上表數字是22e35eb checkpoint，整輪最終量測仍須另跑。

## 第九輪 9b 最終可重跑狀態（規則 3.5；#444/#445/#446/#448）

這節取代上方 N34/N36/N37 開工時的 checkpoint 數字。資料使用 9a head `79e5c96` 為 base，9b 當前程式為 head；受控探針與自然 bot12 分開，不將失敗寫成通過。所有命令從 repo 根目錄執行；golden 須 Node 22（CI runtime）。

| 指令 | 原門檻 | 本輪結果／原始輸出 |
|---|---|---|
| `bash solo-sect/test/run.sh smoke` | fail0 | 17/17；N34–N37 每步至多一個新增小測試。 |
| `node solo-sect/tools/duel.mjs --a day1 --b day1 --seeds 1-20` | 中位交手≥30；無皮破以上接觸≥70% | 中位390；無皮破以上91.660%；喘氣10；[原始輸出](artifacts/round9b/duel-day1-final.json)。瘀青計為中招、不計受傷；上方數字是舊 checkpoint。 |
| `node solo-sect/tools/duel.mjs --a day60 --b day1 --seeds 1-20` | 最小進身閃≥day1三倍且>0；同拍反擊≥5 | 最小進身閃0.538462對0（原始比值無定義，絕對門檻達到），反擊28；[原始輸出](artifacts/round9b/duel-day60-final.json)。此為訓練seed1，未證明任意seed。 |
| `node solo-sect/tools/duel.mjs --seed <任選整數> --log out/duel.json` | 任取3筆成功接法驗 `r+m≤T` | 每拍輸出T/r/m/margin，forced行不冒充真抽樣；reviewer仍須任意seed複核。 |
| `node solo-sect/tools/waves.mjs --seed 17 --trait normal --log out/waves.json` | `L≥1` 拍反擊0；1、2路各有反擊 | 依正常 tick 山賊先起手、同一 `interceptOpening` 起手截擊的修正後，seed17 的1路3次、2路5次，seed23 為4次、5次，超載反擊皆0；[seed17摘要](artifacts/round9b/waves-normal-17-summary.json)／[逐拍](artifacts/round9b/waves-normal-17.json)、[seed23摘要](artifacts/round9b/waves-normal-23-final-summary.json)／[逐拍](artifacts/round9b/waves-normal-23-final.json)。 |
| `node solo-sect/tools/waves.mjs --seed 17/23 --trait calm,rash --log out/waves.json` | 兩者1/2路各有反擊；急躁搶攻與受傷均較多 | seed17 冷靜/急躁搶攻11/3、失血3.52/84.57；seed23 搶攻10/5、失血31.71/77.52。兩種子各人格在1、2路均有反擊，超載反擊皆0；**人格搶攻方向兩種子均未達**。[seed17摘要](artifacts/round9b/waves-after-ci-17-summary.json)／[逐拍](artifacts/round9b/waves-after-ci-17.json)、[seed23摘要](artifacts/round9b/waves-final-23-summary.json)／[逐拍](artifacts/round9b/waves-final-23.json)。 |
| `node solo-sect/tools/contact.mjs --seed 29` | 破架長破綻、狗/豬不同傷與退距、hitstop開關state hash相同 | 3次真招架、1.45秒破綻；狗傷筋退82.5px、豬無傷退16.5px；兩hash相同，pass=true；[原始輸出](artifacts/round9b/r9b-contact29.json)。 |
| `node solo-sect/tools/glimmer-metrics.mjs --wu=3 --days=60` | 普通悟性首招約第7–10日 | 沿 bot12 真日程，12種子主角悟性均3，60日首悟仍全為 null、最大進度0.619，**未達首悟日數**；含六種情境逐種子次數的[原始輸出](artifacts/round9b/glimmer-ordinary-60.json)。 |
| 弱敵限定 p≥0.9、12種子60日 | 每個種子均不悟 | 目前未建立只打弱敵的真實日程，**尚未驗證**。固定種子的小測試僅證明每次失手的期望增量 `w(1−p)` 在 p=.9 比 p=.5 慢13.89倍；自然日程[原始輸出](artifacts/round9b/glimmer-bot12-60.json)並非弱敵限定，不能代替。 |
| `docker run --rm -v "$PWD":/repo -w /repo node:22-bookworm-slim node solo-sect/tools/golden.mjs --write --tier all` | 重產 quick/full/舊檔，回報相符 | quick4、full32、saves已重產且相符；[輸出](artifacts/round9b/golden-write-node22.log)。 |

`node solo-sect/tools/bot12.mjs solo-sect --json` 的 9a base / 9b head 原始輸出是 [base](artifacts/round9b/bot12-base.json)／[head](artifacts/round9b/bot12-head.json)：單人狩獵擊退 275→342、溜走 155→151、失血 1637→25；**有柵探針** 96 場均勝，但柵守住 92→34，重傷 1→24；**自然日常山賊** 72/72→78/78，重傷 24→27。兩個分母與情境分開。探針巫時 0→4，當前 head 自然日程另記 1 次（base 版本未量自然值），所以不能把探針4次說成日常自然發生4次。惱羞 102→105、破勢 120→134，常見武學 DPS 中位 112.7→107.9，winP 中位 0.998→0.996。N37 的 `contactImpact` 令未過皮破門檻的命中 `damageFactor=0`，可能拉長守柵者擊退山賊的時間；這是柵守率下滑的機制推論，仍需 reviewer 檢查守柵手感，不能因 96/96 勝利掩蓋退化。

`waves.mjs`原本將主角排在 bandit 前面，並漏掉起手截擊，與遊戲 `tick` 的 bandStep→弟子及 `interceptOpening` 不同；修正這兩個探針錯誤後再按 N36 原門檻量。負荷式另外把未出手者的剩餘冷卻與靠近時間並行計算；士氣人數劣勢改為佔交戰總人數比例，避免健康的冷靜者在兩敵入場當拍就憑空恐慌退場。兩次修正後仍有上述人格門檻未達；按新版附件停止額外調數字，交給 reviewer 看逐拍資料。

N35 的 firstDay 目標在自然 bot12 日程沒有達到。12 種子 × 60 日的「母招＋情境」出現／失手次數（全體；主角）是：奪械 1124/523；主角93/56，側身打肋 0/0；主角0/0，掃 450/245；主角2/0，摔 36/12；主角4/1，撒土 0/0；主角0/0，擲石開場 0/0；主角0/0。奪械雖有 56 次主角失手，累計 w 只有 0.234（12 種子合計），比難度72/悟性3的單人門檻24遠；其餘多數情境根本未觸發。只在工具狀態啟用 `captureTechniqueContexts` 計數，並無獎勵或額外 RNG。保留門檻72/96/48及失手才加原w的世界規則，不為表格直接降低難度或讓成功刷悟招。弱敵限定60日需另作真實交戰日程；不以這份自然bot12冒充。

畫面：`PW=/path/to/playwright-core/index.mjs node solo-sect/tools/round9b-shots.mjs` 在正常遊戲頁面開局，使用真Canvas renderer與 `contactImpact` 取得[靠樹](artifacts/round9b/cover.png)及[受力傷筋](artifacts/round9b/contact.png)截圖；其受控佈局／傷層見[輸出](artifacts/round9b/shots.json)。圖片是受控局面，不是自然玩法或真人盲測影片。N55 的真人盲測仍由 #484 reviewer 核對。

### 首輪 CI 回歸與原規則對照

[run 42310766790](https://github.com/lalagrass/earth-ascension/actions/runs/42310766790) 的 quick 為 609 過、18 敗，golden 因 quick 失敗跳過。下列是修正原因，重跑結果須以新 head CI 為準；未把舊斷言改成較容易過的門檻。

以 9a head `79e5c96` 為 good、初版 9b `6a9daf6` 為 bad，在獨立 worktree 對原始測試執行 `git bisect run bash -c 'node --test --test-name-pattern="<測試名>" <測試檔>'`，最早失敗提交：round6-n22／round7-n27 高手截鼠及 N31b 四賊截擊是 `933e8ed`（N34）；N14 招架是 `933e8ed`，N14 重擊與看破是 `904c040`（N37）；N15 第五隻外圈是 `832b92d`（N36），N28 四敵貼身位是 `f7ff11f`（N36 後修）；狩獵戰報是 `f7ff11f`，野豬回山是 `832b92d`。每次 bisect 後重設，沒有修改上述受保護的兩個測試。

| 原驗收 | 實際原因與處理 |
|---|---|
| N14 看破、招架、重擊；N22/N27 高手截鼠；N31b 人海截擊 | N34 的進身閃搶先於更快截擊，N37 反擊接觸重複扣架勢、重擊後沒有沿 N14 回半條。恢復秒數先後、雙方招架架勢與物種重心資料；**round6-n22／round7-n27 原始測試零修改**。 |
| N15 第五隻外圈；N28 四敵記錄 | N36 掩體範圍過寬讓原守點也只留一席；收窄到既有近身半徑。第五隻現在逐拍真走到外圈，既有測試多等一拍驗證距離，不准瞬移。 |
| 狩獵 200 秒戰報／族群；野豬回山；腿法學招 | N37 的真痛暈使全隊退場後仍因 HP>25 被當作在場，結算卡住；全員離開守點即讓在途個體逃回族群、完成戰報。N32 野豬衝撞已由招式前搖／位移決定，恢復野豬在地圖上原步速 28。 |
| 3.5 遷移、資源帳、新規則 golden | 舊版本測試的完整 migSteps 需含 3.5；首犬戰利品 `finishTrial` 用 `resAdd` 記帳，新增白名單來源；有意變更的 v2.2 三十日 hash 與 Node 22 golden 重產。 |

`bash solo-sect/test/run.sh smoke` 最新 17/17；Node 22 針對 N14/N15/N22/N27/狩獵的 44 項診斷測試、N31b 探針皆過。這些局部結果不是完整 CI 的替代品。

### 2026-11-07 驗收改寫：A／B 擋合併，C 列數字

依 #441、#444–#446 的同日更新，上方寫「門檻」的設計目標（無傷比例、三倍、悟招日數、個性搶攻方向）現屬 **C 平衡報告**。保留實測和未達原目標的事實，不為貼近目標改常數。A 是固定抽樣的規則檢查；B 是公式或 99.9% 信賴區間檢查，兩者接到山門紀 quick。指令：`node solo-sect/tools/r9b-acceptance.mjs --seed=17`，可換任何整數種子；原始輸出見 [17](artifacts/round9b/acceptance-17.json)、[23](artifacts/round9b/acceptance-23.json)。`bash solo-sect/test/run.sh quick` 在 CI 先執行 seed17，再跑既有單測；本地每步仍只跑 smoke。此工具固定排場，數字不冒充自然日程或設計平衡比例。

`duel.mjs` 的 `summary.balanceTargets` 保留舊七成／三倍／五次數字的達標與否供 C 報告，`summary.pass`／退出碼只檢查成功接法的 `r+m≤T` 及第60日最小閃接比例沒有比第1日反向下降。`waves.mjs` 的 `personality.balanceDirection` 逐項列搶攻與失血方向；依 #446 明文例外，即使搶攻方向相反也不改 `summary.pass`／退出碼，A 類超載與一、二路反擊仍擋。其他輪次的一般 C 類若方向相反，仍依各該 issue 擋合併。

上方連結的兩份 duel 摘要與 seed17/23 waves 摘要、逐拍 JSON 已用此版工具在 Node 22 重產。seed17 人格搶攻方向為 `false`、失血方向為 `true`，但波次 A 類 `summary.pass=true`、退出碼 0；證據欄位已與新版驗收分層一致。舊 seed23 逐拍檔來自不同 V8，換 Node 22 後僅末位浮點數有差，事件與總數不變。

| 類 | 排場、公式與通過條件 | seed17 實測 |
|---|---|---|
| N34 A | 同樣 0.4 秒來招，反應取中位；第1日 `r+step>T`，第60日 `r+step+strike<T` 且真 `resolveSwing` 側身反擊。 | 第1日 `0.600+0.250>0.400`，中招；第60日 `0.233+0.100+0.004<0.400`，側身反擊。 |
| N34 B | 每次重置交手人物，真 `resolveSwing` 抽 5,000 次；截擊事件 `read` 比例應在 `clashOdds.read ± [3.290526731√(p(1−p)/5000)+1/5000]`。後一項是離散抽樣連續性餘量。 | 公式 `0.078613`、實測 `0.079400`、半寬 `0.012724`；99.9% 區間內。 |
| N35 A/B | 固定野豬衝撞情境，成功不累積；失手每次只加當拍 `4p(1−p)`，到 `difficulty/wu=24` 才悟側身打肋。另用實際山賊來招，把當拍 `hit.learning.p` 轉成防守成功率核算奪械進度。 | `p=.35` 失手加 `0.91`；`p=.5` 到門檻才悟。真來招防守 `p=.5`，進度加 `1`。 |
| N36 A/B | 真山門兩席排一、二人，空地排四人；反應固定中位。逐列驗 `L=Σneed/(window+travel)`；`L<1` 反擊，`L≥1` 無反擊。 | 單人 `L=0.333333`、雙人 `0.666667` 均側身反擊；四人 `1.333333` 無反擊。每列 `need=0.233028`、`window=0.699083`、`travel=0`，可手算三筆。 |

N34 的 `duel.mjs --log` 仍輸出每拍的 `T/r/m/margin` 供 reviewer 任取三筆核算 `r+m≤T`；本工具的 B 抽樣則直接核對真 `resolveSwing` 與公式。N35 的「普通悟性第7–10日首悟」在自然12種子60日樣本仍為全 null；六種情境的出現／失手數見上方及原始 JSON。`p≥.9` 的弱敵期望速度是勢均力敵的 `1/13.8889`；沒有建立弱敵專用自然日程，不把自然樣本冒充它。N36 急躁者在兩個受控種子搶攻較少、損血較多，方向與原設計目標不同；逐拍記錄仍供 review，依更新後 C 類不阻擋合併。

守柵與惱羞的變化另以同一 Node 22 bot12 在中間提交逐步量測。下表「重傷」只指 **有柵探針**，不是自然日常山賊的 78 場。

| 規則切點 | 柵守住／96 | 探針重傷 | 惱羞次數 | 原始輸出 |
|---|---:|---:|---:|---|
| 9a 基線 `79e5c96` | 92 | 1 | 102 | [JSON](artifacts/round9b/bot12-base.json) |
| N34 後 `933e8ed` | 79 | 4 | 157 | [JSON](artifacts/round9b/bot12-at-n34.json) |
| N35 後 `eaa66dd` | 79 | 4 | 157 | [JSON](artifacts/round9b/bot12-at-n35.json) |
| N36 後 `832b92d` | 56 | 15 | 163 | [JSON](artifacts/round9b/bot12-pre-n37.json) |
| N37 初版 `904c040` | 18 | 31 | 2180 | [JSON](artifacts/round9b/bot12-at-n37.json) |
| 9b 修正後 head | 34 | 24 | 105 | [JSON](artifacts/round9b/bot12-head.json) |

這是逐提交的**行為差**，未把各項差全歸給單一機制。可定位的規則鏈是：N34 的選招決策占用起手時間；N36 讓應接負荷與掩體／士氣選擇占用同一人物的時間；N37 把未達皮破門檻的接觸 `damageFactor` 設為 0，這類命中不再扣氣血，山賊需要更多次有效接觸才退場，守柵者因此多承受來招。N37 初版惱羞 2180 是修復前的異常量，不代表最終規則；修復後 105 對基線 102，已不再四倍暴增。最終柵守率 34/96 與重傷 24 仍明顯劣於基線，屬 C 類需擁有人審閱的手感與平衡結果，不把 96/96 勝利當作守住柵。兩條第七輪高手截鼠原測試完全未改，在 CI quick 原斷言通過。

### 第九輪 9c：N50 出身同伴與共用招募（#464，施工中）

`bash solo-sect/test/run.sh smoke` 要 fail 0；唯一 N50 小測試排出四住客／五床，一人真入門後第二人因床位不足被共用招募拒絕，候選查詢不改 state。`node solo-sect/tools/bot12.mjs solo-sect --json` 加入 `recruitment.day10Med/day30Med/bySeed` 及真指導時數，與上一輪 head 同命令對照。d10、d30 數字依 #441 新 A/B/C 改寫只列 C 報告，原始單種子 checkpoint 不能冒充 bot12 中位數。人物卡須顯示同伴關係句與名俠不能來的食宿／師父／處境原因；尚待正常桌面驗證。舊存檔同伴保留，3.6 遷移與 golden 在收尾處核對。

### 第九輪 9c：N38 即時白身等級（#449，施工中）

`bash solo-sect/test/run.sh smoke` 要 fail 0，唯一 N38 小測試驗「同一接法機率一改即改級名」、不存 level/XP、不消耗逃敵。`node solo-sect/tools/white-body.mjs --seed 17 --days 30` 應輸出每人格每日各級機率、首次過線日與真交手最常用招；第3–5日狗、第10–15日豬、第20–30日刀賊是新版 #441 C 平衡數字，不能以固定日數決定 `--check` 退出碼。`node solo-sect/tools/bot12.mjs solo-sect --json` 對 12 種子統計各級日數與三人格拿手招，並與上一輪同尺對照。白身即時級名須由正常人物卡可見；受控工具 JSON 不是畫面實拍。原 seed17 自然日程 checkpoint 見 [證據](docs/evidence/r9-n38-levels.md)，其中舊版 `--check` FAIL 是舊 C 門檻，尚待按新驗收修正；不將它冒充新 A/B 失敗。

### T1 測試精簡（#393）
- A：PR 的山門紀 CI 依序跑 `bash solo-sect/test/run.sh quick`、`node solo-sect/tools/golden.mjs --check`、`bash solo-sect/test/run.sh accept`，各為 0 fail；archive／parked 不在 PR CI。#496 記錄 parked 的 20 個原斷言與後續決策。
- A 證據：[CI 42344255454](https://github.com/lalagrass/earth-ascension/actions/runs/42344255454/job/128318451650)：quick 330/330、golden「全部相符」、accept 301/301；同一 run 的另外五個 job 也全過。
- A：`node solo-sect/tools/golden.mjs --check`；門檻所有新局與舊檔 hash 完全相同；預期「全部相符」。本 PR 不改模擬或 golden 資料。
- A：`cd solo-sect && node --test test/unit/social/story-data.test.mjs`；門檻每個宿命樹資料列都有可達的觸發與聲明的卡／主線結果，缺卡或旗標門檻錯誤即失敗。
- C：`bash solo-sect/test/run.sh quick`；記錄項數與秒數，20 秒只作目標報告。搬移／暫停逐項原因見 `docs/evidence/t1-moves.tsv` 與 #496；診斷用途見 `tools/diag/README.md`。

### N58 收徒三層（#489）

- A：`bash solo-sect/test/run.sh smoke`，門檻 0 fail。`test/unit/social/n58-admission.test.mjs` 用排定情境檢查閉門 30 日不收、付糧／錢或做工、無支付與工作就下山並返、少年郭靖和普通人共用入門、師父相熟後才主考。舊 N50「四人／五床，第一名俠可入、第二名俠不可入」原斷言不改；fixture 明選廣收，以單獨檢查真床位。
- A：`node solo-sect/tools/golden.mjs --check`，門檻 quick／full／舊存檔全部相符；規則改成 3.8，Node 22 用 `node solo-sect/tools/golden.mjs --write --tier all` 重產。30 日現行規則的獨立 fixture 亦用 Node 22 的 `UPDATE_GOLDEN_V22=1 node --test solo-sect/test/accept/v220.test.mjs` 重產（`01c88b908115b6aa → 3715f9cf5336af75`）；原斷言不改。`MIGRATIONS` 對舊局只加收徒方針，自產計數不倒推，不改已有人與庫存。[兩份原始日誌](artifacts/n58/golden-write-node22.log)、[v2.2 fixture 日誌](artifacts/n58/golden-v22-node22.log)。
- A：PR 山門紀 job `quick → golden → accept` 均 0 fail；以 PR 最新 head CI 為準。
- B：沒有新增概率期望值，故本輪無 B 比例檢查。
- C：`node solo-sect/tools/n58-report.mjs solo-sect --json` 以 0.25 秒步長、1001–1012 種子列第 10／30 日門人數、少年名俠數、下山打工人次；可加 `--seed=17` 換種子。不以固定日數或人頭作 A/B 門檻。前版與本版使用同一工具、同一種子及 bot。[前版原始輸出](artifacts/n58/bot12-base.json)第 10／30 日中位門人 3／3、少年 0／0、下山 0／0；[本版](artifacts/n58/bot12-head.json)為 8／10、少年 0／0、下山 0／0。這組自動 bot 的主角是郭靖，故不會再出現同名少年郭靖候選；有支付或有工作者亦不會下山。兩條路徑另由 A 情境驗證，C 如實列零。
- C 全量護欄：`node solo-sect/tools/bot12.mjs solo-sect --json`；[T1 base](artifacts/n58/bot12-full-base.json)／[N58 head](artifacts/n58/bot12-full-head.json) 用相同工具與 1001–1012 種子。自然山賊 4/5 → 78/82、有柵探針 94/96 → 90/96、柵留住 88 → 29、惱羞 149 → 326、威脅點中位 0 → 267；這些是 C 數字，未改威脅公式或敵人出現規則。收徒帶來更多武學與家底，使既有威脅公式從零啟動並增強來犯；柵較常被攻破，列為 review 風險，不以勝率係數補回。

新常數與既有係數的意義見 [收徒系統](docs/systems/recruitment.md)。畫面操作：在門規作息選「閉門」再看招收按鈕禁用；改「廣收」、擴床後看候選人繳束脩或做工，點按才入門。可觀察人口上限與名聲／自產分數變化。

首次 PR CI [run 42347301548](https://github.com/lalagrass/earth-ascension/actions/runs/42347301548) 的 quick 為 331/332；唯一失敗是 `v145-review.test.mjs` 的 `migSteps` 明列清單仍停在 3.7。新規則有意增加 3.8，故只在期望清單加 `3.8`，原「未來版本拒讀、原檔不變」及完整遷移清單斷言保留，沒有改模擬來掩蓋錯誤。

第二次 [run 42347561563](https://github.com/lalagrass/earth-ascension/actions/runs/42347561563) quick 與 golden 通過；accept 292/301，九項舊情境要明確表達 N58 的合法規則變化：

| 舊驗收 | 新情境或期望的原因 |
|---|---|
| `sim.test` 招收 | 阿青自帶 3 糧入庫後扣當餐；下一位沒束脩且零存糧時須下山打工，不再檢查全門一日存糧。 |
| `v08.test` 低根骨雇工 | 原 fixture 弟子三床已滿；先建弟子床再檢查低根骨仍被拒。 |
| `v085.test` 升內門、失敗冷卻（2 項） | 原 fixture 未交代師父相熟；明設性情全知與既有師父好感門檻，再保留原根骨、貢獻、考核與冷卻斷言。 |
| `v145.test`、`v150.test` 舊檔（2 項） | 完整遷移版本清單有意增加 3.8；原遷移結果與版本拒讀斷言不動。 |
| `v178.test` 三個 15 日種子（3 項） | 束脩是新增合法糧／錢入帳管道，列入白名單；原非負、期初＋異動、每日帳本守恆逐項斷言不動。 |

## N58 小修：當日工作格與束脩換算（#488）

實際主筆 grass／Codex Cloud。base 為 #497 已合併的 `270f746`。Claude 在 #497 複審指出，舊 `plots.length > 0` 讓四塊正在種或被預約的菜畦仍算可做工，無束脩候選無法走下山路徑。現在 `availableAdmissionWork` 查各菜畦真狀態與 `plot:i` 預約，再查未滿庫、當下無工作／預約的林緣和石場；成功入門的抵食宿工作會按日記格，避免同日重複承諾。僅管新人的食宿承諾，不縮現有門人的工序容量。錢 3 是原 `ECON.wage=2` 的一日半食宿及指導時辰機會成本，不是虛構的飯食市價；飯仍真扣。公式及限制見 [收徒系統](docs/systems/recruitment.md)。

- A：`bash test/run.sh smoke`，21/21；新增一支小測試驗菜畦全預約、木石滿庫後無工，`recruit` 真使候選下山，隔 `DAY` 帶糧回來；同測試驗 3.8→3.81 空工作預約欄。原 N58 及 N50 斷言不改。
- CI 首輪 quick 與 golden 通過，accept 300/301；唯一失敗是 `v220` 的三十日**完整存檔**雜湊仍釘 3.8。新增當日 `workBooked` 欄和規則版 3.81 會改序列化內容，即使同尺 bot12 的戰鬥、招收和資源數字不變。Node 22 同一 seed 42 重產 `golden-30d-v22.txt` 為 `65e97bad8cee89c7`；測試情境和相等斷言保留；[CI 42351968626](https://github.com/lalagrass/earth-ascension/actions/runs/42351968626) 六個 job 全綠。
- A：Node 22 `docker run --rm -v "$PWD":/repo -w /repo/solo-sect node:22-bookworm-slim node tools/golden.mjs --write`；quick 4、full 32、舊檔 6 格更新。每格存檔 hash 因規則 3.81 與新欄改變，完整模擬輸出差異由 CI `golden --check` 核對。
- B：無新增機率或權重，工作格是已預約／可工作與否的確定性判斷。
- C：`node tools/bot12.mjs . --json > artifacts/n58-fix/bot12-head.json`；[原 #497 3.8 輸出](artifacts/n58/bot12-full-head.json)與[3.81 輸出](artifacts/n58-fix/bot12-head.json)。12 種子 30 日，原版／小修：自然下山 0／0、常駐名俠第 10／30 日中位 3／3→3／3、日常山賊 78/82→78/82、有柵探針 90/96→90/96、柵留住 29→29、惱羞 326→326、威脅點中位 267→267。bot 的正常日程未填滿所有工作格，因此這 12 種子沒有下山；A 的合法滿格情境證明路徑可達，不把零次改報成有發生。

舊名→新名：本小修沒有碰到帶輪次編號的函式名；新入口是 `availableAdmissionWork` 與 `bookAdmissionWork`。最沒把握的三處：一個物理林緣／石場每日只承諾一位新人的食宿班，舊工作 AI 本身仍可多人使用；本 bot 的自然下山仍為零，因為工作格沒有被填滿；舊 3.8 已收人沒有可追溯的當日工作格，遷移補空欄而不捏造預約。畫面沿用 #497 的[入門說明截圖](artifacts/n58/admission-ui.png)，本次條件的可見證據在招收按鈕的「先下山做工」提示與 A 小測試。

## 第十輪：N40 一本譜、N41 一生專練、N42 共用成長（#441）

實際主筆 grass／Codex Cloud。前置 #498 N58 小修已合進本分支，沒有 rebase。Node 22 以規則 3.9 重產 quick 4、full 32、舊檔 6 格 golden；三十日全開郭靖舊基準完整存檔 hash 同 seed 42 由 3.81 的 `65e97bad8cee89c7` 重產為 `51c2171f42228370`，原情境和相等斷言不動。公式、歷史名稱來源與常數理由見 [combat.md](docs/systems/combat.md)。畫面見[成長首行](artifacts/r10/growth-panel.webp)。

| 驗收 | 指令與門檻 | 預期／實測 |
|---|---|---|
| A N40 | `bash test/run.sh smoke`；一支小測試，同一譜交給有／無白身交手經驗者 | 有經驗者讀得較快，22 段讀完才取得正式羅漢十八手；無需下載圖像。 |
| A N41 | 同一 smoke；一支小測試 | 同時練一門比五門生鏽慢；六階要實戰與套路同時累積。 |
| A N42 | 同一 smoke；一支小測試 | 面板前搖、反應下限與真交手讀同一值；同等身體與火候時名功可及前搖比常見武學短。整合後 24/24。 |
| A 舊檔 | `bash test/run.sh accept` 的原版本遷移斷言及 `node tools/golden.mjs --check`；CI 執行 | 3.8→3.81→3.9 依序遷移，既有武學、手眼熟、XP 不抹；歸真星數換成 lifetime。以本輪 CI 最終 head 為準。 |
| B | `node --test test/unit/growth/n42-substrate.test.mjs`；規則確定性，無新抽樣率 | 武學 fanR 只縮可達時間下限，不乘傷害或勝率；反應抽樣與解析勝算共用下限。 |
| C | Node 22：`node tools/bot12.mjs . --json`；1001–1012 種子，各 30 日 | [#498 base 原始輸出](artifacts/r10/bot12-base.json)／[3.9 head 原始輸出](artifacts/r10/bot12-head.json)；下表只報數，不拿 C 目標調常數。 |

| C 指標 | #498 base | 3.9 head |
|---|---:|---:|
| 入門 DPS 中位（樣本） | 58.5（43） | 43.9（4） |
| 常見 DPS 中位（樣本） | 106.8（28） | 44.1（41） |
| 名門 DPS 中位（樣本） | 127.4（5） | 91.1（1） |
| 一流 DPS 中位（樣本） | 229.5（18） | 72.4（14） |
| 絕頂 DPS 中位（樣本） | 216.1（16） | 140.0（25） |
| 自悟整門／觀摩／變式／詞綴／N35 | 58／359／506／558／0 | 0／0／0／0／0 |
| 自然山賊勝場／場次 | 78／82 | 65／73 |
| 有柵探針勝場／場次、柵留住 | 90／96、29 | 89／96、28 |

DPS 下降的主要規則原因是撤去十重、星數、同類造詣及小成／圓滿等重複出手倍率，且普通日課不再自悟整門。名門／常見 30 日樣本比從 1.19 升到 2.07；但 head 名門只有一人，不能把比值當穩定平衡結論。每個樣本的 seed、人物、所用武學、XP 和 DPS 都在兩份原始 JSON 的 `tierDetails`。自悟事件完全歸零，N35 自然日程也仍為零，未達「全派 5–15 次」C 參考值；N35 需真實吃虧情境，不另加掉落機率或保底。普通日程強度下降使山賊場數、勝場改變；有柵探針與自然戰分母分列。

首次 CI quick 的五項舊測試對照；保留原測試檔、原場景與核心斷言，只把已變的規則寫明：

| 舊測試 | 分類與處理理由 |
|---|---|
| `v155d` 雲海三重 | 舊 fixture 只把外功技能抬至 3000，N42 後不再提供護體；給強隊既有的紫霞護體七重，仍必須連續到第三重，並不降低距離斷言。 |
| `v092` 歸真 | N42 星數是生涯累積，不能再加 4% 傷害；斷言改為星數增長而出手力相等。 |
| `v092` 迅捷變式 | 既有迅捷冷卻恰為 0.8，舊 `<0.8` 與資料列不符；改成精確等於 0.8，仍驗半日重選。 |
| `v31` 造詣實戰 | N42 撤去身法冷卻及外功傷害的第二層倍率；內力、回氣、內勁、腳程斷言原樣保留，改驗前兩者不重複疊乘。 |
| `v32` 規則說明 | 原字句改為單一勁目標；仍驗舊誤述不出現及新規則完整字句出現。 |
| `accept/sim` 掌／腿傳授 | N42 禁止日課自悟整門武學，師父按待學列逐門傳；延長自由時段仍限定於第 2 日，保留學到指定招、不誤學掌招的斷言，另驗日誌確實由師父傳授。 |

舊名 → 新名：`shenfaCd24` → N33 `practiceWindow` 的時間下限；`catDmg24` → `forceTarget` 的單一勁目標；`profMul` 和 `GUIZHEN.star` 不再進出手傷害，但保留舊檔讀取。最沒把握的三處：名門 head 只有一個樣本；整門自悟拿掉後 N35 在自動日程沒有自然發生；各段 DPS 降幅大，但公式重複倍率已撤，不為接近 C 數字補第二層係數。N40 只借指定的 22 段名稱，不使用未確認授權的圖或現代說明文字。

## N35 自然悟招逐日查因（#488／#499 review 後續）

實際主筆 grass／Codex Cloud；承接 #501。只加診斷帳本與離線圖，`RULES_VERSION` 3.9、悟招難度／`w`、模擬及 golden 不變。[30 日 12 種子](artifacts/n35-natural/default-30.json)、[60 日 12 種子](artifacts/n35-natural/default-60.json)、[30 日合法巡獵 seed 1001](artifacts/n35-natural/hunt-every-3-seed1001.json)、[悟性 3 對照](artifacts/n35-natural/wu3-30.json)均為 Node 22 原始輸出；[對照圖](artifacts/n35-natural/ledger.png)由同一資料生成。

| 類別 | 指令＋門檻 | 預期輸出 |
|---|---|---|
| A 逐日對帳 | 在 `solo-sect/` 執行 `node tools/glimmer-metrics.mjs --seed=17 --days=30 > /tmp/n35-17.json`；任意整數 seed；`bash test/run.sh smoke` | 工具正常退出，`rows[0].daily.length===30`；六招每日 `seen/lost/heroSeen/heroLost` 加總精確等於末日 `contexts`；主角逐日 `gains.heroW` 之和與保存的所有 `progress` 相等，差低於 `1e-8`；原 N35 smoke 仍驗失手才加 `4p(1−p)`。對帳不成立則工具直接 throw。 |
| A 正常玩法對照 | `node tools/glimmer-metrics.mjs --seed=1001 --days=30 --hunt-every=3 > /tmp/n35-hunt.json` | `hunts=10`、野豬衝撞 `boarCharges=52`、擲石開場匹配 `contexts.stoneOpening.seen=15`、主角失手 1；無 debug 注入敵人或進度。此行是固定 seed 的記錄，其他 seed 只要求逐日對帳。 |
| B 原公式 | `bash test/run.sh smoke`，原 N35 小測試；對任意 seed 查看 `daily[*].gains` | 成功不加權，真失手每次 `w=4p(1−p)`；本 PR 沒新增概率或遊戲公式。 |
| C 自然 30／60 日 | `node tools/glimmer-metrics.mjs --days=30`、`--days=60`，Node 22；原始檔如上 | 30／60 日首悟均 0/12；六招匹配／失手見下表，逐日已存在人物的進度回退均為 0。C 參考 5–15 次僅列數字，不當規則門檻。 |
| C 悟性對照 | `node tools/glimmer-metrics.mjs --days=30 --wu=3`，Node 22 | 12 種子首悟仍 0/12；最高全門單招進度比 50.3%。此樣本驗悟性 3 不自動跨線，不冒充一般玩家所有玩法。 |
| C bot12 對照 | 從 repo 根目錄 `docker run --rm -v "$PWD:/work" -w /work node:22-bookworm-slim node solo-sect/tools/bot12.mjs solo-sect --json` | [#501 base](artifacts/n35-natural/bot12-base.json)／[N35 head](artifacts/n35-natural/bot12-head.json) 同 12 種子、同 Node 22，原始 JSON 逐位相同；因只改工具及文件。 |

| 真情境（全體匹配／失手） | 自然 30 日 | 自然 60 日 |
|---|---:|---:|
| 奪械 | 521／251 | 1452／853 |
| 側身打肋 | 0／0 | 0／0 |
| 掃 | 99／51 | 265／111 |
| 摔 | 74／19 | 94／26 |
| 撒土 | 162／119 | 541／407 |
| 擲石開場 | 0／0 | 0／0 |

| bot12 C 指標 | #501 base | N35 head |
|---|---:|---:|
| N35 自然悟招 | 0 | 0 |
| 自然山賊勝場／交手 | 65／73 | 65／73 |
| 惱羞次數 | 282 | 282 |
| `winP` | 0.933 | 0.933 |

逐日結果：自然 bot 每日僅建寢舍、可收則收，無玩家下達巡獵，所以野豬衝撞與擲石開場為零。其餘情境並非零，但進度分散到不同人物／招式，且極端勝算的失手一次 `w` 很小。30 日全門最高單招為門檻 16.2%；60 日最高 `19.756/24=82.3%`，主角最高單招只 `4.464`；逐日帳無重置。合法巡獵 seed 1001 的擲石情境匹配 15 次、主角失手 1 次，進度 `0.842/24`；側擊的 `afterDodge` 和 `opponentCharge` 分別出現，但同一拍未同時成立。這是規則組合造成的 C 結果，不調難度、概率、敵人來源。規則理由及參考見 [combat.md](docs/systems/combat.md#n35-自然首悟逐日查因488規則-39-不變)。

圖重產：在 `solo-sect/` 設 `PW=/path/to/playwright-core/index.mjs` 執行 `node tools/n35-ledger-chart.mjs`；它只在本機把已有 JSON 畫成 PNG，遊戲不載入 Playwright。舊名 → 新名：本次觸及的函式與欄位無帶輪次編號舊名；新增 `daily`、`heroProgress`、`gains` 語意欄位。最沒把握三處：① 12 種子自然 bot 不代表玩家主動巡獵，故另外公開正常狩獵對照；② 60 日全門最高者已達 82.3%，更長日程可能悟招，不能聲稱永遠不可達；③ 側擊合取條件在這一個狩獵 seed 仍未同拍成立，需更多真實走位樣本才能估 C 頻率。

## N61 六軸人物卡（#493）

實際主筆 grass／Codex Cloud。承接已合併 #500；只讀 UI 成長資料，規則 3.9、模擬與 golden 不變。六軸的物理含義、尺度與素材見 [可見成長 UI](docs/systems/visible-growth-ui.md)和 [素材授權](assets/ui/LICENSES.md)。遊戲首日[人物卡實拍](artifacts/n61/live-card.png)、[滑過同門疊圖](artifacts/n61/compare-card.png)，第 1／60 日[遮名盲板](artifacts/n61/blind.png)及[分離答案](artifacts/n61/blind-answer.json)。

| 類別 | 指令＋門檻 | 預期輸出 |
|---|---|---|
| A 六軸獨立 | `bash test/run.sh smoke`；`test/unit/growth/n61-card.test.mjs` 一支小測試 | 六軸名稱固定；改一軸底層原值只動同一根軸，其他五根精確相同。 |
| A 30 日讀檔 | 同一 smoke；以 `save({...S,uiGrowthHistory})` 再 `load` | 第 31 日取第 1 日的原始快照，重新讀檔與原值深度相等，圖有現在及歷史兩層。 |
| A 同源 | `node tools/growth-metrics.mjs --seed 17 --days 1,60 --json` | `cardAxes[*].raw` 與人物卡 `battleMetrics` 是同一函式；`display` 與 SVG `battleAxisValues` 同源。seed 改任意正整數仍讀同一來源；[seed 17 原始輸出](artifacts/n61/growth-metrics-seed17.json)。 |
| A 盲測 | `PW=/path/to/playwright-core/index.mjs node tools/n61-blind-card.mjs --seed=17 --out=artifacts/n61`；遮名板不顯日期 | 兩卡一張日 1、一張日 60；先判形狀，再開獨立 `blind-answer.json`，seed 17：A=60、B=1。seed 777 重跑的[板](artifacts/n61/seed777/blind.png)與[答案](artifacts/n61/seed777/blind-answer.json)：A=1、B=60。 |
| B | 沒有新概率、抽樣或遊戲公式 | 不適用；六軸比例只是畫面顯示。 |
| C | `node tools/bot12.mjs . --json`，Node 22、相同 12 種子；見[base](artifacts/n61/bot12-base.json)／[head](artifacts/n61/bot12-head.json) | 純 UI 變動，`cmp` 原始 JSON 逐位相同；美觀和可讀性留給擁有人目視。 |

舊名 → 新名：本次沒有更動帶輪次編號的程式名稱；新增 `battleMetrics`、`battleAxisValues` 與 `uiGrowthHistory`。最沒把握的三處：身與耐包含當下疲勞，30 日線可能縮小而非單調成長；敵人的勁依既有碰撞勁每 10 點折一倍，與人的武學勁是比較尺度而非勝率；盲板第 60 日合法日程可能得到其他武學，形狀只表示當日真資料，不鎖死招式種類。

## 第十一輪 N51：有理由的登門與地圖逐招（#465）

| 類 | 指令（repo 根目錄） | 門檻與預期輸出 |
|---|---|---|
| A 准入／時間 | `bash solo-sect/test/run.sh smoke` | exit 0；`n51-visitor.test.mjs` 在第八日且威脅點數足夠時仍須證明「沒葵花殘頁、名聲未達正殿」不登門；有理由才出卡且卡寫理由，接受後先建立地圖 `bout`，勝負不在選項當下產生；3.9 舊未決敵意卡遷移時撤回。 |
| A 來源／受力 | 同一 smoke 小測試及任意 seed 的 `s.jh.visitor.bout` | 來源等於 `SOURCES.gate` 的世界座標，敵人逐招 `exchanges > 0`，勝負只在 HP 耗盡或既有 90 秒時限後決定；成年江湖客不進弟子表。 |
| B 共用公式 | `bash solo-sect/test/run.sh smoke` 及 CI 山門紀 quick | 准入讀 N43 原 `points(s)`、來犯期和名額；出招讀 N27–N28 `interceptOpening`／`resolveSwing`，沒有獨立勝率項。 |
| C 自然 12 種子 | `docker run --rm -v "$PWD:/work" -w /work node:22-bookworm-slim node solo-sect/tools/bot12.mjs solo-sect --json` | `visitors.bySeed` 列第一次登門日與是否擊退；第 30 日內大多不來是 C 參考，無登門時擊退率為 null，不宣稱為零勝率。原始結果見 `artifacts/r11/n51/`。 |

同一入門通路的 `VISITOR_INCIDENTS` 各有 `reasonAny`、威脅強度、勝／敗／婉拒後果；非敵意卡的逐張核對在 `combat.md`。舊名 → 新名：`villain()` → `startVisitorFight`／`finishVisitorFight`；舊門派戰力 `JH.dfbbPow`／`JH.hyPow` 已淘汰；新增狀態名均表用途。最沒把握三處：（一）強者對點數的 HP 量尺會使多數自然 30 日沒有登門，照 C 只回報；（二）90 秒僵持計敗沿用 N45 小地圖超時規則；（三）現有非敵意喜劇卡保留原獨立結果，將其規則逐張列在文檔而不假裝是敵意戰鬥。

| bot12 C 指標（同 Node 22、12 種子 × 30 日） | #502 base | 第十一輪 head |
|---|---:|---:|
| dfbb 第 30 日前登門／被擊退 | 12/12／12/12 | 0/12／無樣本 |
| 自然日常山賊：結算／真迎戰／勝／受傷 | 75／73／65／22 | 74／74／65／25 |
| 有柵獨立探針：場／勝／守住／受傷 | 96／89／28／27 | 96／91／35／29 |
| 第 30 日威脅點數中位／末日勝算中位 | 216／0.933 | 221／0.957 |

原始 [base](artifacts/r11/n51/bot12-base.json) 與 [head](artifacts/r11/n51/bot12-head.json) 同用 `docker run --rm -v "$PWD:/work" -w /work node:22-bookworm-slim node solo-sect/tools/bot12.mjs solo-sect --json` 產生；base 在 #502 的同版工具上執行。dfbb 無樣本時擊退率是 `null`，不得寫成 0%；自然山賊與有柵探針分母不同。登門變少由名聲／被欺線索、N43 來犯期及同一威脅點數必須足以承接白猿敵人造成，未調抽樣率。守柵探針由 28/96 至 35/96，仍主要靠原木柵耐久、修理和現場逐招，而非來犯節奏本身。

N51 離線畫面盲測：`PW=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node solo-sect/tools/r11-visual-check.mjs --seed=17 --out=solo-sect/artifacts/r11/n51 --visitor`；先看 [A](artifacts/r11/n51/blind/A.png) 和 [B](artifacts/r11/n51/blind/B.png)，判斷哪張是有來由的登門卡、哪張是接受後的真地圖交手，再看獨立[答案](artifacts/r11/n51/blind/answers.json)。任意整數 seed 由 SHA-256 決定順序，`visual-check.json` 的 `errors` 必須為空；兩張皆由正常頁面的畫布及卡片直接截取。

Node 22 `node solo-sect/tools/golden.mjs --write` 重產 quick 4 格、full 32 格及六份舊檔載入矩陣，皆顯示「全部相符」。4.0 版本欄、N43 時序、N45/N51 地圖交手與 N44 站位會改變整局狀態，故三個 golden 檔的 hash 均有變動；純畫面 N60/N61 的規則未在此變更。正式 quick、golden、accept 仍以本 PR 的山門紀 CI 為準。

## 第十一輪 N44：同伴站位、掩護與攻擊權杖（#456）

| 類 | 指令（repo 根目錄） | 門檻與預期輸出 |
|---|---|---|
| A 固定分位 | `bash solo-sect/test/run.sh smoke` | exit 0；`n44-teamwork.test.mjs` 的同一 .5 反應分位、同一四狗站位，分立者中招 4、背靠背者 2；來招前搖 1 秒且同伴空手時 .01 分位可幫正在出手者截擊。 |
| A 權杖 | 同一 smoke 測試 | 250 點流寇山賊在同一後院短交手的 `tokenPeak` 大於零且不超 `tokenLimit=2`；組織 4 與貼身位 2 的公式仍輸出 2。 |
| B 時間與眼熟 | CI 山門紀 quick／N33／N27 原測試 | `ringCapacity` 只限制真貼身位；開放地形仍按 N28 計所有可見來招。援護調用同一 N33 眼熟量尺、同一截擊反應與出手秒數，不加門派傷害倍率。 |
| C 人海探針 | `docker run --rm -v "$PWD:/work" -w /work node:22-bookworm-slim node solo-sect/tools/round7-crowd.mjs > solo-sect/artifacts/r11/n44/crowd-before.json`；加權杖後改用 `--tokens` 存 `crowd-after.json` | 同一第 20 日郭靖與 100 固定反應分位、每位四個獨立冷卻循環；兩份原始輸出與 PR 並列，僅報方向，嘍囉人海變弱是預期。 |

舊名 → 新名：沒有在這次修改範圍新增輪次編號名稱；`ringCapacity` 加可選狀態以讀同伴站位，`loadFromForecast` 同步使用。最沒把握三處：（一）沒有顯式玩家陣型命令，先以可見兩步內站位自然形成背靠背；（二）共同練與好感只影響反應殘量，不另外製造傷害加成；（三）人海探針以同一輪流時程演算權杖，最終自然頻率由 bot12 另列，C 偏差不調常數。

N44 第七輪人海探針同一郭靖、同一固定分位與四個獨立冷卻循環；`--tokens` 只給持權杖者排前搖，未持者等空出權杖，並保留原 `bandSyncDelay`。原始 [前](artifacts/r11/n44/crowd-before.json)／[後](artifacts/r11/n44/crowd-after.json)：

| 對手／錯相 | 人數 | 權杖前中招率 | 權杖後中招率 |
|---|---:|---:|---:|
| 持刀嘍囉／同刻 | 4／6 | .265／.622 | 0／0 |
| 持刀嘍囉／錯相 | 4／6 | .113／.626 | 0／0 |
| 同級好手／同刻 | 4／6 | .876／.917 | .876／.917 |
| 同級好手／錯相 | 4／6 | .876／.917 | .876／.917 |

嘍囉兩枚權杖讓第 20 日郭靖有時間截掉每招；有組織好手四枚權杖仍壓得住，同級好手的實際中招率方向未反轉。這是 C 類量測，不以零值調新常數。權杖排程與真 `bandClash` 共用來源組織及站位公式；真人防守的地圖路徑、士氣、熟練會另受狀態影響。

N51 舊驗收更新：`test/accept/v130.test.mjs` 的原場景只把日數設為 8、以一次總戰力／10% 骰在選卡瞬間判勝，與 #465 明確的新規則衝突。新場景明確造出正殿名聲、四名常住者與足夠同一威脅點數；先斷言理由卡與未結算的地圖交手，再把敵方或我方 HP 固定為已敗情境，分別斷言殘頁、斷情、未招收、落敗不死。舊成果斷言仍在，勝負因果改讀地圖結果，不以調低門檻維持舊故事。

CI 首輪 `r9b-acceptance.mjs` 的 N34 高手 A 情境失敗：N51 登門需有理由和足夠來犯點數，原第 60 日經營日程不再碰巧拿到葵花；主角技能雖 100，`arts` 為空，反應 0.6 秒而非高手 0.1014 秒。這不是 N34 反應公式回歸。驗收改為在同一第 60 日自然身體快照上，以既有 `learnArt` 和 `TIERS[3][0]` 明確建立高手火候；高手中位「側身即反擊」與新手來不及的原斷言不變，B 類仍從公式算期望與 99.9% 信賴區間。自然日程的江湖客頻率仍按 C 原樣另列。

CI 第二輪 quick 的 2 項失敗屬接線：`tools/diag/diag-v24-v25.mjs` 尚匯入本輪已按「改到哪整理到哪」改名的 `strikeLedger33`，改為 `strikeLedger` 後原 power／診斷斷言不變；`v145-review.test.mjs` 的舊檔遷移清單原止於 3.9，本輪版本 4.0 已有真遷移，故預期序列補 4.0，未來版本拒讀與原檔不變的斷言仍保留。
