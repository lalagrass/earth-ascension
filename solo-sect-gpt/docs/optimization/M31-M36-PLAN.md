# M31 至 M36 公版接入與 review 修補

規劃作者 Codex，2026-10-26；接續實作者 Claude。先修上一批三個已重現問題，再把 dev 新交付的資源、意圖、人物簡介及共用呈現接到 GPT 現有玩法。每個階段先短 spec、再實作與驗收；完成 M36 停止。

## 固定起點與公版狀態

- GPT 分支 `codex/solo-sect-gpt`，盤點 HEAD `b0ca007b00d7e78af916030c3d9a545d28e887f6`。本機已有 `.serena/`、`solo-sect-gpt/jsconfig.json`，不清理。接手時若已前進，核差異並保留已完成修補。
- 新公版固定 dev `6f959f534e9a00994f1cea7c230b4110e60db8c6`；上一批固定來源 `ef823ac…` 留存，不原地覆寫 vendor 舊版。
- 自舊來源以來，dev 新合 PR #360 可見性／即時 details、#361 資源、#362 工作與自主、#364 人物簡介、#369 共用呈現。以下只採必要契約、資料與呈現；官方核心與公版 GPT 舊快照不載入本遊戲。
- Grok 的立繪 PR #370 在本輪核對時仍 OPEN，head `bc1f10bc525596b3c668975abf1593455c90b109`。不列已發布、不成為本批前置，不自行審合或催作者。本批簡介與外觀引用沿目前可用素材；#370 的正式素材更新另列後續有限包。
- 工程只改 `solo-sect-gpt/`，不 merge dev、不修改 `sect-chronicle/` 或其他分支／產品，不 push／PR／部署、不派子代理或其他作者。保留 Canvas、20Hz、Q256、U/F/I、五項 stats 與現有權限；手機、整體存檔工程、大型新圖及完整動作庫延後。

## 新公版與 GPT 的接入差異

| 已交內容 | 固定來源路徑 | GPT 接法與限制 |
| --- | --- | --- |
| 資源五欄 | `resource-view/{contract,render,gpt}.mjs`，`docs/RESOURCE_PUBLIC_HANDOFF.md` | M31 修容量預留誤名，M32 加總覽。dev 的 GPT adapter 已明說 `dest:` 不證明貨在路上、`availableQty` 未必扣全部耗用預約；保留本核心口徑 |
| 工作與自主設定 | `intent-view/{contract,render,gpt}.mjs`，`docs/INTENT_PUBLIC_HANDOFF.md` | M33 綁目前 `intent`、`temporary`、`pendingCommands`、恢復與 owner。舊 adapter 仍 import 6cbd3e6 核心，不能直接使用 |
| 公開簡介 | `character-card/{contract,profiles,render}.mjs`，`docs/PUBLIC_PROFILE_SPEC.md` | M34 用相同介紹資料服務本版既有選人與人物卡；dev 的 hero/cousin/girl 不自動對應 leader/amu/child |
| 共用呈現與預覽 | `public-ui/{values.mjs,style.css,preview-fixtures.mjs}`，`docs/UI_PRESENTATION01_HANDOFF.md` | M35 少量樣式 tokens、值與狀態呈現。保留 GPT 版面與已加的 notApplicable，適配 imports／CSS，不整包替換人物卡 |
| 展開與焦點保存 | `public-fix/view-state.mjs` | M33／M35 借用 per-person scope 與穩定 key 原則；不保留兩套會互相搶焦點的 writer |

上表路徑均以[固定 dev](https://github.com/lalagrass/earth-ascension/tree/6f959f534e9a00994f1cea7c230b4110e60db8c6/sect-chronicle)為準。各 handoff 的「候選／待審」文字可能是作者當時收據；是否已交付依上述實際合併狀態辨識。這些公版是介面能力，不授予新的遊戲規則。

## M31 修補三個 review 反例

**玩家結果：** 師徒經歷可回看、演練耗能有正確歸屬、採集預約不冒充搬運成果。成本中。

1. **師徒紀事遺漏** — `src/event-feed.mjs:17` 以 `num(e.id)>cursor` 假設所有 ID 為 event.N。但 `state.event` 允許 data.id 覆寫，正常師徒完成事件 ID 是 `mentor.first-lesson`／`mentor.direction-set`，轉數字成 NaN，被整批略過。優先修唯讀 reader：原生 ID 保留為來源引用，adapter 游標／唯一識別兼容非數字與重複 ID，不擅自重寫既有歷史或全核心 ID。覆蓋正常定向談話、重定方向後同類事件、同 tick、500 筆 ring rollover、重複讀取、成功／失敗讀檔與隱藏事件；不可只塞一個新格式 fixture。
2. **退出後身體統計串場** — `src/joint-drill.mjs:38` 直到整場結束才拿目前 energy／injury 算原參與者差值。重現：M23 展示檔、既有 rested fixture，amu 前攔＋shen 守線、flank 集合開始→shen `practiceStop` 退出→另打三拳→`endDrill`。退出能量 9946、結束 9330，演練應計 0，卻計 616。依參與截止時點凍結身體量，連同 hits／moves 歸屬保持一致；覆蓋退出後切磋、工作、休息、受傷及途中存讀。若舊途中檔已退出但缺截止快照，明示該段不可重建，不反算假值。新增持久欄位當階段就驗證／相容；不得等 M36。
3. **目的容量預留誤當在途** — `src/facility-view.mjs:15` 把 dest reservation 當 incoming，`ui.mjs` 寫「正在送來」。新局採木後一 tick，phase=gather、背包空，就顯示木4。先改成正確「預留入庫容量」，與已存在 source 耗用預約分開；真正搬運若無可靠查詢就 unknown／unsupported，不強制算一個數。M32 才擴總覽，不能把本 bug 留到那裡才修。

**出口：** 三條反例各轉針對性回歸與一段必要正常 UI；保留 M24／M28 舊測試與失敗紀錄。前次 235 項回歸可過仍未涵蓋上述問題，不能以測試數量代替反例。舊 M30 marker 保留作歷史，於新交付列修補對應。

## M32 資源總覽連回真正派工

**玩家結果：** 不必來回找面板，就能區分家中物資、耗用預約、供料口徑與缺料改善入口。成本中。

- 採新 ResourceView 契約與適用 renderer，重新綁本版核心，先做水、木、藥、菜、餐五項；只顯示各自公開倉位（vat／store／table），不加總野外庫存、陌生人包裹或尚未發現物資。
- 每欄保留單位／來源／可見性。amount 為現地實物；capacity 依本核心每品項口徑；reserved 精確讀 source reservation；available 保留 `availableQty` 原同 tick 語義，不能改稱可自由支用淨庫存。容量預留另列，既有經營簿的 carried／site／other 不與總覽重複相加。
- incoming 只有可驗證「哪個人／哪件物／哪個目的地」的實物才提供。本包可增加共用純查詢，但不能新增物流／預約規則；證據不足則沿 dev GPT 的 unsupported，畫面明示與容量預留不同。
- 用途讀真 RECIPES／既有施工需求，連到 M27 設施或同一角色操作；點擊只定位／選人或送現有命令，不複製派工與消耗公式。現有經營簿保留長期摘要職責。

**出口：** 正常 UI 完成缺菜→定位倉庫派採集→真交付→做飯／用餐，實存及耗用預約沿核心變化。測缺料、目的地滿、預約取消、0、同 tick 供料、途中改派與無 incoming 查詢；讀總覽前後世界／RNG 相同。

## M33 同一人物的工作目標與自主控制

**玩家結果：** 看懂「現在做什麼、原本要做什麼、做完回哪裡」，停工、休養與恢復自主的差異清楚。成本中。

- 採 IntentView／請求驗證與適用 renderer，沿目前 `situation`／`describeLife`／`commitmentOf`、現有 policy／roles／auto 命令。呈現 `intent`、臨時工作 `temporary`、人工 stop、自主開關、必要恢復及已受理的本人 pendingCommands；不新建 JobQueue 或 AI，不把 GPT 多筆排程改成官方唯一 pending。
- 現在活動原因、政策偏好來源與恢復原因分欄，沒有政策原因查詢就 unsupported，不能挪用當前動作 reason。遠征召回、演練退出、共享活動限制沿原 owner gate，不創造泛用「全部中斷」捷徑。
- 公版按鈕綁 actorId、穩定 commandId 及快照 payload。切人、狀態變更、按鈕過期時重取目前命令並核 expected actor，最後只經既有 command 一次；不能同時觸發新舊 handler。每人物最近回覆只存本頁，成功換世界清掉、失敗讀檔保留。
- 整理人物頁重複 stop／resume／auto／臨時工作呈現，保留其他既有授課、照料、師徒、家庭、演練操作，不把有用控制藏進另一個開發入口。

**出口：** 正常 UI 走原工作→臨時工作→回原安排、必要休養→續作、明確停工→恢復自主；至少兩名角色切換，舊按鈕不套新人物。模型覆蓋 pending、共享 owner、失能／未成年／成熟訪客權限、重複點擊及同命令 twin 不變性。按 GPT 真規則驗收，不要求它模仿官方 manual 語義。

## M34 選人與人物卡共用公開簡介

**玩家結果：** 選開局時認識這個人的生活特色，進局後仍能看到同一背景，實際成長另有紀錄。成本中。

- 採 `sanitizeProfile` 與 profile 呈現責任，擴現有模板資料，不新增第二套模板。先做現有四個開局 custom／guo／linghu／yue；短介與背景、作品／改編版本／故事階段、來源、design／skin／portrait 引用分開。能力摘要讀表單目前實際配點及本局真開局配置，不在文案重抄效果。
- 公版 catalog 不等於可玩清單：郭靖／令狐沖可核階段後借文字，岳不群與自創缺對應時補本版公開文字與來源；不為湊十二人或功夫名單新增可選角色。不能把「本作尚無開局」等 dev 研究頁說明照貼到 GPT 已能選的角色。
- 遊戲人物以 canonicalIdentity／本局模板與明確 binding 連介紹，不用 displayName 猜。custom 改名不變 profile；同名訪客不冒充主角。選人後介紹保持背景，現在關係／所學／師徒與家庭記錄仍讀本局權威資料。
- 對小禾及一名普通門人各給本版公開簡介，與 dev girl／cousin 無自動同人對應。隱藏性格／未來劇情／未揭露身分不進公開資料、alt 或檔名引用。短介／背景去掉工程及「未實裝」說明，這些移到來源或開發文件。
- 本批使用現有已接受外觀與缺圖回退；新圖採用不以角色名自動配對。不引入 PR #370 待審 runtime，不生成新圖；正式立繪更新留後包。

**出口：** 正常 UI 四個既有開局可切換並看簡介，選定後人物卡顯示對應背景；既有點數預算、問卷與保存資料不因介紹改變。覆蓋舊檔、custom 改名、同名、長文字、escaping、缺介紹／圖及未揭露資訊。不可把介紹文字寫進世界作第二份狀態。

## M35 共用紙墨呈現與穩定操作

**玩家結果：** 人物、武學、資源、設施及紀事讀起來一致，播放時閱讀／鍵盤操作不被刷新打斷。成本中。

- 固定採用新 public-ui 的必要值呈現與少量 tokens；保留 notApplicable 的本地擴充。hidden 不帶 raw value／tooltip，known 0／false 與 unknown／unsupported／hidden／notApplicable 不混。不要因升 renderer 而破壞舊 vendor imports。
- 樣式限公版區域，檢查 `:root`、select／button 等 selector 對既有表單、存檔預覽及對話框的影響；不重排整張遊戲 UI、不換框架／Canvas／字型服務。
- 以一套本頁狀態管理 details／焦點：人物依 actor scope、資源全局、武學依人物＋條目、設施依 facility；相同人刷新保留，切人不串，換世界清掉已失效狀態。選項改動、檔案 input 與正在填寫的表單不可被定時重繪吞掉。
- 可在本地增加明標開發用的元件預覽頁，沿 production renderer 驗長文字、缺圖與各 availability；示意按鈕不 dispatch 核心。它不替代正常遊戲驗收，也不成第二玩家入口。

**出口：** 1440×900、1280×800 正常播放中驗展開、Tab／Enter／Space、選人、資源、disabled 原因與命令結果；零 page error，既有存檔選檔及資料包操作仍可用。新增預覽如有，明確標 fixture 與真 UI 證據差別。

## M36 累積交付與相容收尾

**玩家結果：** 從介紹選角到自主經營、成長與演練，一條正常路線可連續體驗本批成果。成本中。

交新 showcase 與 5–10 分鐘閱讀路線：選人簡介→進局看人物背景／目標→資源缺口→設施派工／真交付→臨時工作與續作→師徒後續進近期紀事→聯合演練途中退出／另作活動→回顧只計參與段。新局選角與中期示範檔可分兩段，不能假稱從零新局五分鐘完成全部中期條件。

模型 fixtures 與正常 UI 示範分開；示範檔由可達 UI 流程保存，不注入資源、完成旗標或既有關係。保留 M30 舊檔及原失敗記錄。新增持久欄位在當階段處理，這裡收尾驗新局、M23／M30 舊檔、M31 途中退出檔、成功／失敗讀檔、刷新、槽位保護與內容包缺失。存檔全面升版與手機仍最後另案。

總文件列三項修補、採用／改寫／延後來源、各 artifactCommit、測試與正常 UI、啟動入口、展示檔、剩餘限制與真人趣味評估狀態。只在全部必要出口通過時總 done；完成後停止 M36，不自啟 M37。

## 給後續公版維護者的本地建議

這些只列需求，不在本批修改上游或對外發文：

1. Event adapter 接受非 event.N 的原生 ID、同類事件重複及有限歷史；提供 adapter sequence／sourceRef 的明確語義。
2. ResourceView 可另外表達容量預留與在途口徑，讓各核心說清楚「出發額度／實物搬運」；available 保留原查詢用途，不能默認 amount−reserved。
3. Profile 的「研究可選」「玩家可選」「本局可控制」分清；不同版的 playable 需本地能力判定，敘事文字避免嵌入特定版未實裝聲明。
4. Intent 的 current／原目標／臨時工作／pending／政策 reason 分層，adapter 以注入查詢接目前核心，減少綁定舊快照的 imports。

正式立繪後包的入口：先核 PR #370 是否已合 dev、實際接受 SHA／pin／來源／使用範圍，再定一份 GPT 外觀 binding 清單；無對應、不符階段或缺圖者保持回退。這項未納入 M31–M36 必要交付，不因它等待而阻塞三項修補或資源／意圖工作。
