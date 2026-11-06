# 可重跑驗收

以下指令由 repo 根目錄執行，Node 22 或 24，無需下載素材／套件。工具可接受 `--seed`，標籤工具使用該種子的真實模擬快照，不以種子選擇門檻。素材檢查無隨機資料，傳入種子不影響結果。

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

## 第九輪：白身演化（進行中）

### N32 白身開局與起手表（#442）
| 指令 | 門檻 | 預期輸出 |
|---|---|---|
| `bash solo-sect/test/run.sh smoke` | exit 0 | 舊檔與新局煙測通過，schema fail 0 |
| `node --test solo-sect/test/white-body.test.mjs` | N32 小測試通過 | 白身arts為空、起手順序、豬衝撞可移步、拳不破豬霸體、第一隻狗從SOURCES走進來；非白身保留原武學 |

瀏覽器新局預設「白身開局」；可選回經典／自創／照舊。第一天黃昏留意從東北獸穴沿路走入的狗，不是從主角身旁冒出。土招在真實守點與試煉使用，不是只供工具列印的資料。N32 尚未處理 N36 士氣／N37 刀傷與奪械，詳 combat.md 邊界。


### N33 共用手熟／眼熟（#443）

| 指令 | 門檻 | 預期輸出 |
|---|---|---|
| `bash solo-sect/test/run.sh smoke` | fail=0；本milestone只新增一個N33小測試 | N33 checkpoint共12 tests；目前N55後13（schema10 + N32/N33/N55各1），50有效次gap=.5、人獸皆記n/f |
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
| **由parent於正常桌面通路恢復後** `node solo-sect/tools/blind.mjs --seed <任選整數> --url http://localhost:8814/solo-sect/tools/growth-preview.html` | 真A/B.webm各含至少10秒同動作；真人猜對，寫出至少三處差異對得上量測 | `out/blind/A.webm`、`B.webm`、`key.txt`另檔；`metrics.json`供數字對照。工具尚未執行，不是已驗收影片 |

盲測預設train；可另加`--action chop`/`water`。預設片應觀察式間停頓、重心、整套速度（晃動另有對照數字），不要以影片檔名/日數UI洩漏答案。輸出同路徑會覆寫先前同名驗收檔，請先保留已猜的結果。若preview連線阻擋，停止錄影嘗試交parent，不換host、不Shell CDP/Playwright迴避；目前正是此狀態。工具需要review環境既有Playwright/Chromium，沒有把套件加進遊戲。連兩名reviewer猜錯依#479決策，不自改3D。

受控日程與各常數理由見[combat.md N55](docs/systems/combat.md#n55成長只改共用骨架的播放474)。數字證據寫在`docs/evidence/r9-n55-growth.md`；桌面與影片驗收不得用這張表、SVG或mock Canvas測試冒充。


### N34 選招／輸後心願（#444；N37後樣本通過，非任意seed已證明）
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
