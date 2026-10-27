# M37 至 M40 修補邊界與接入公版立繪

規劃作者 Codex，2026-10-27；接續實作者 Claude。先補 M31–M36 review 的三個可重現反例，再讓已存在的郭靖、令狐沖開局有可辨識的卡片外觀。每階段先 spec、實作及驗收；完成 M40 停止。

## 固定起點

- GPT 分支 `codex/solo-sect-gpt`，HEAD `fa001cedcbc0323ee9d3a21e1fbd779d764fb521`。接手若已前進，只核相關差異，不退版、不重做已修項。
- 新公版 dev `3079a03de5c2e8c79af64b0962ae3da75f274466`。相對上次 `6f959f5…`，只有 PR #370 立繪包的新合併；資源／意圖／簡介／共用樣式仍沿 M31–M36 已採版本，不為追最新重搬整套。
- PR #370 已於台北時間 2026-10-27 06:23 合 dev。14 張是研究人物卡素材，不是 14 個新開局，也沒有改 GPT／Grok 的 pin。上一份計畫的「#370 待審」是當時狀態，保留原紀錄，在本包更新採用決策。
- 只改 `solo-sect-gpt/`，單作者串行；不 push／PR／merge／部署，不改 dev、其他工作區、根依賴／CI 或共用素材。不派其他 agent。保留 `.serena/`、`solo-sect-gpt/jsconfig.json`。
- 本包延續私人遊戲原型與既有素材共用範圍，明確選用兩張已提交人物圖作 GPT 既有模板的外觀；這是本版 binding，不把上游研究資料當新玩法／公開發布／商業權利授權。保留全部來源與使用範圍記錄。

## 最新公版可採與不採

固定來源：[PR #370](https://github.com/lalagrass/earth-ascension/pull/370)、[立繪交付規格](https://github.com/lalagrass/earth-ascension/blob/3079a03de5c2e8c79af64b0962ae3da75f274466/sect-chronicle/docs/PUBLIC_PORTRAIT_IMPORT_SPEC.md)、[manifest](https://github.com/lalagrass/earth-ascension/blob/3079a03de5c2e8c79af64b0962ae3da75f274466/sect-chronicle/assets/shared/manifests/gemini-1.1.0.mjs)、[解析層](https://github.com/lalagrass/earth-ascension/blob/3079a03de5c2e8c79af64b0962ae3da75f274466/sect-chronicle/assets/shared/resolve.mjs)。

| 已交內容 | 本包用途與界限 |
| --- | --- |
| 14 張公開研究立繪、gemini-1.1.0 manifest 與 dev binding | 只選郭靖、令狐沖兩張。本版已有 guo／linghu 模板，不新增其他角色、劇情、權限或武學 |
| 7 張直接複用與 7 張新像素的來源分流 | 區分真正圖片來源與造型身份參照；不能從某個舊 originPath 取圖，假稱等於新 redraw |
| `recipe.type=portrait` 標為公開立繪 | 本地 resolver／UI 支援整圖，與 custom 的 idle 裁圖分開；圖像底錨不是地圖碰撞或走路腳錨 |
| 缺圖與版本化 pin | 岳不群、小禾、阿木等沒有本包對應就保留文字／既有外觀；不借臉、不生成圖、不整庫搬運 |

公開 catalog 中十四人的「可顯示圖片」不等於本版「可操作人物」。本包不載入 dev 的 scene-shared 核心／harness，不更新舊 vendor，也不採早期被擁有人退回的圖稿版本。

## M37 三個邊界修補

**玩家結果：** 暫停操作仍準確結算，搬飯不被說成沒有貨在路上，師徒紀事在保留窗內不漏。成本中。

### 演練退出要在命令當下截止

`src/joint-drill.mjs:24` 在下一次 jointTick 才建立 bodyAt。已用正常 UI 重現：暫停演練，沈禾按「自己退出」後切武學立即試拳，兩次命令都在 tick 195827；退出精力 9609、試拳後 9409，演練應計 0 卻計 200。模型亦可按 `practiceStop → attack(punch) → step` 重現。

在退出／所有權移交的當下記錄截止，不能只把下一 tick 的讀值提前一點，也不能要求玩家先繼續才能退出。先列現有退出途徑（practiceStop、stop、改派、外部切磋、倒地、結束／取消），沿唯一所有權路徑做最小修正，不另創一個活動管理器。截止後同 tick 的 moves／hits／能量／傷勢都不屬舊演練；截止前同 tick 的有效出手也不能一律抹掉，需按實際命令／事件順序辨識。

覆蓋暫停時退出→試招／切磋／工作、雙人同 tick 退出、直接結束、存檔前尚未 step，以及下一 tick 正常推進。舊 bodyAt／缺快照 null 路徑仍可讀；新增持久欄位的驗證與相容在當階段完成，不反算歷史假值。

### 成品搬運納入在途口徑

`src/resource-view.mjs:7`／facility-view 的查詢只認 phase=deliver。正常做飯時成品使用 `haulOutput`：阿木包裹 meal4、dest:table:meal 預約4，正往餐桌送，總覽卻回 known 0。

建立兩個面板共用的最小唯讀在途查詢，按真活動、包裹實物與明確目的地判斷。至少核採集 deliver、烹調／製作 haulOutput、批次 output.locations／target，以及中斷取料後的包裹；不能只把所有有貨的人算作在途，不能把容量預約當貨，也不能同一批物資加兩次。確定沒有在途才 known 0，無法判定的路徑明示缺項。保留 availableQty 的原口徑，不改生產／物流規則。

覆蓋剛出發空包、半途採集中、成品仍在鍋內、領出後搬運、分批交付、滿倉受阻、改派、另一人接續與讀檔。正常 UI 做一鍋飯，看到搬運時在途4、交付後歸零且實存上升。

### 環形紀錄中的非數字事件不能被略過

`src/event-feed.mjs:22` 在舊數字游標已被 ring 清除時，直接從下一個 event.N 開始。模型反例：先讀游標，再追加一筆 `mentor.direction-set` 及 499 筆數字事件；核心仍完整保留這500筆，adapter 只給499筆、師徒事件遺失。這是仍在保留窗內的未讀記錄，不是要求恢復已被清掉的歷史。

用有界 reader 記錄追蹤原生紀錄，保留非數字／重複 ID 與同 tick 順序；游標／暫存只屬本頁，不新增無限歷史或改核心事件 ID。覆蓋保留窗第一筆為非數字、連續非數字、同 ID 多次、500筆整窗替換、超過保留窗、重讀、成功／失敗讀檔及隱藏事件。快取／去重資料有明確上限；不能放寬 assertion 允許少一筆。

**M37 出口：** 三個原反例轉為回歸，必要正常 UI 通過；保留上批266項及歷史 evidence，不改舊結論來宣稱修好。

## M38 兩張人物立繪的本地素材包

**玩家結果：** 本版能在離線環境解析正確的郭靖與令狐沖圖片，且來源與外觀不混。成本小至中。

在複製之前先實看固定提交的兩張圖片，核對人物、年齡／故事階段與畫面構圖；若有真實不相容，先記哪張不相容與可繼續部分，不另生成或任意挑舊版本。工程幾何／人物能力不因造型改變。

| 本地目標 | dev 資產 ID 與檔案 | 固定 sha256 |
| --- | --- | --- |
| guo／郭靖 | `person.research.guojing.portrait`；`sect-chronicle/assets/shared/portraits/1.1.0/guojing.png`；864×1152 | `9ca10bf0686f8efcb1f6a446025d47ed2a1622127403b655cc43a99cde1f326c` |
| linghu／令狐沖 | `person.research.linghuchong.portrait`；`sect-chronicle/assets/shared/portraits/1.1.0/linghuchong.png`；480×640 | `55a3e9e6abd9562bbe065b9dd0fe49613b73aa729f3dee36c268ad5401ad11e2` |

兩張均為直接複用而非本輪重畫：原作者 Grok Bot，原路徑／提交依 manifest 保留；實際取用 bytes 固定以上 dev3079a03。新增本地 `gpt-local-1.1.0` 或同等明確版本、digest 與本地圖片路徑，保留 1.0.0 舊檔；既有 hero／竹石／缺女孩記錄不變，只更新本版 pin。來源記錄分原作者來源、dev 接受提交、本地採用，不冒用 gemini coreCommit 當 GPT 核心版本。

resolver 支援 portrait 整圖與既有 atlas-frame，輸出保留用途標籤；安全本地 URL、不 runtime CDN／跨 worktree symlink、不搬其他十二圖／證據截圖、不安裝新依賴。圖片為 RGB、3:4 整圖，不能宣稱透明去背／動作 atlas。

**出口：** digest／圖片 hash、尺寸與 alpha、原／衍生來源、本地離線載入及缺檔回退可核；只讀解析不改世界／RNG。原 gpt-local-1.0.0 的圖與 hash 仍通過原驗證。

## M39 選角與人物卡顯示立繪

**玩家結果：** 選郭靖／令狐沖時看得到角色，進局後人物卡沿同一外觀，背景與實際能力仍各有來源。成本中。

- 以模板 ID／canonicalIdentity 和明確 binding 接 `appearanceFor`／profiles：guo→郭靖圖、linghu→令狐沖圖。custom 保持原可用外觀，yue／小禾／阿木缺圖保持可讀回退；不能因改名成「郭靖」就變臉。
- 選人畫面顯示可辨識縮圖，人物卡可展開3:4整圖。整圖用 contain／保比例、不切掉頭臉／衣服；如需要 avatar 專門裁切，保留可核 recipe，不新畫像素。裁圖、整幅立繪、地圖程序人物分清；不把RGB背景當透明圖蓋在地圖上。
- 卡片須正確標示「立繪」或「活動圖裁切」，不能套用 custom 舊標籤。缺圖／載入失敗保留姓名、簡介、數值及操作；圖片不遮住按鈕、不使播放中面板焦點跳走。離線與切換人物不反覆啟動失敗請求。
- 同一外觀不建立第二份人物／權限，未有正式外觀的訪客繼續缺圖；資料包角色不靠同名配圖。若未來要加其他14人，是另有明確 identity binding 的後包，不在此順手解鎖。
- 新外觀只屬介面固定資料，不寫入本局存檔、不因立繪升保存格式；讀一般舊檔仍由現有模板／canonicalIdentity 決定外觀。

**出口：** 正常 UI 切 custom／guo／linghu／yue 四個既有開局，郭靖與令狐沖進局後顯示同圖；一般舊檔、custom 改名、同名普通人、缺檔、長背景、展開／收合、鍵盤與播放中刷新皆有驗證。能力預算、所學與地圖動作未改。

## M40 累積交付與相容收尾

**玩家結果：** 一條正常流程能看到新外觀與已修好的紀事、搬運及演練回顧。成本中。

沿既有入口交兩段觀看路線：新局選郭靖／令狐沖→人物卡簡介與立繪；中期展示檔→做飯成品實走／在途→師徒後續進紀事→暫停演練退出後同 tick 試招→回顧不含退出後消耗。環形500筆邊界以明標模型 fixture 驗，不把注入事件冒充正常 UI 歷史。

新展示檔由正常按鈕流程產生；舊 M36 檔、途中演練檔及上批證據保留。新局、M30／M36 舊檔續玩、新截止狀態途中存讀、壞檔拒絕、成功／失敗載入與頁面快取、刷新／槽位保護、內容包缺失、圖片缺失一併收尾。新增持久截止資料在 M37 當階段完成驗證，這裡只做整體檢查。

1440×900、1280×800 路線可重走，圖像／介面證據與模型報告分開；記實際牆鐘與模擬 tick，不以腳本播放速度冒充真人5–10分鐘體驗。回報真人趣味驗證尚未做。總交付列三項修補、兩張圖與 pin／來源、各階段 artifactCommit、啟動入口、展示檔、測試與剩餘限制。

全部必要出口通過才總 done；完成 M40 即停止。手機、整體存檔升版、場景／角色動畫重製、新地圖、新可玩經典人物、公版上游修改與 M41+ 不在本包。
