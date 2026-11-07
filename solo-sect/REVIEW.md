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
