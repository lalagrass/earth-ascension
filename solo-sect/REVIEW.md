# 可重跑驗收

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

### N34 選招／輸後心願（#444；無傷交手門檻待N37重驗）
N33「高手認得短招」沿用原門檻 .9；N34 將同拍移步反擊從截擊欄拆成獨立 `dodgeCounter`，故測試合計兩種成功接法，沒有降低辨招成功門檻。round6-n22／round7-n27 的原始高手截鼠測試不改。
| 指令 | 門檻 | 預期輸出 |
|---|---|---|
| `bash solo-sect/test/run.sh smoke` | fail0；N34僅1個小測試 | 14/14；穩定同情境決策0，三種性格均等觀測下偏好至少2種，真交手產生心願 |
| `node solo-sect/tools/duel.mjs --a day1 --b day1 --seeds 1-20` | 交手中位≥30、沒人受傷≥70% | 每場次數、兩人受傷、喘氣；目前38/33.3782%，**後者FAIL，待N37真力門檻接入後重驗** |
| `node solo-sect/tools/duel.mjs --a day60 --b day1 --seeds 1-20` | 最小移步≥baseline3倍且>0；同拍反擊≥5 | 目前.322581對0、31反擊，pass；訓練seed1，非任意seed已證明 |
| `node solo-sect/tools/duel.mjs --seed <任選> --log out/duel.json` | reviewer任取3筆成功接法驗r+m≤T | 每拍T/r/m/margin；forced行沒有假抽樣時間，不拿它手算 |

工具不連網、無額外套件。day60會真跑60日；詳combat受控訓練/交手seed的區分。無傷關卡不過先補N37共用受力規則，不調機率湊門檻。完整自然玩法的三個性拿手招另由N38/bot12量，不以均等觀測單元測試冒充。
