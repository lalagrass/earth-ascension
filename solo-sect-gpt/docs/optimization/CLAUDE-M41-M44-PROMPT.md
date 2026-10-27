# Claude 接續 M41–M44 實作 prompt

請由你一位作者依序完成 GPT 獨立遊戲 M41→M44；這次委託把原 M40 停止線延伸至 M44，其他邊界保留。每階段先短規劃／spec→實作→局部反例與正常 UI→補修→實際 commit→done marker，再進下一階段。不是先交計畫就停止，也不只修一項就把整批記 done。完成 M44 後停止等下一次指派，不自行延伸、不派其他 agent。

## 工作位置與必讀

工作區 `/Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension`，分支 `codex/solo-sect-gpt`。

盤點 HEAD `d9c7810ebba6f9756c3ebacd2891a3cabd619ae6`。先核目前 HEAD／工作樹；若已前進，只補相關差異，保留既有成果與 `.serena/`、`solo-sect-gpt/jsconfig.json`，不要 reset。先讀根 CONTRIBUTING、適用 AGENTS、`solo-sect-gpt/BRIEF.md`、`solo-sect-gpt/docs/optimization/M41-M44-PLAN.md` 全文、M37–M40 delivery、PROGRESS 與對應原碼。計畫中的出口與本 prompt 同屬本次有限範圍。

只修改 `solo-sect-gpt/`，不 push／PR／merge／部署、不動 dev 或其他工作區、根契約／CI／依賴、不發對外留言、不設永久排程。沿既有 Canvas、20Hz、Q256、單一 world／命令／時鐘、五項 stats、U/F/I 與角色權限；不換引擎、不載另一版核心或共用存檔。規劃文件由 Codex 提供，實作、作者自校與證據如實具名。

## 固定公版

最新核對 dev `00f4dbe26be5765a9622957b7c6a636ab5039f96`，PR #371 已合，增加 `navigation-view`；不要因 handoff 保留「作者候選」字樣而誤認尚未合入。上批 `3079a03…` 的兩張立繪與早先面板、資源、意圖、樣式仍沿原 pin，不重搬。

以固定 SHA 讀 `sect-chronicle/docs/SCENE_NAV01_HANDOFF.md`、`navigation-view/{contract.mjs,render.mjs,style.css}` 與局部 checks。只取最小唯讀公版並記來源／hash／本地改動；不要帶 `official.mjs` 的 Gemini 規則、scene-shared harness、Pixi 或 `6cbd3e6…` 舊 GPT 核心。上游路線未提供，本包繼續 unsupported，不連端點或偷讀 raw path。

## 依序實作

**M41 修自然退場 P2。** 自然打完時 `sessionsTick` 進 exiting 並清 combatSession，但未凍結 joint 截止；第一次外部命令執行後才 jointCut，額外試拳的 200 被算進演練。正常 UI 已重現：沈禾 tick200004、7779→7579，應耗1215／回顧1415（是證據值，不硬編入未來路線）。在真正自然完成／所有權移交時、任何後續外部或自主行為前凍結；截止前最後招式／命中照算、之後耗能／傷勢／出招不算。保留人工退出與各人不同截止；重複呼叫不覆寫，不禁止正常試招掩蓋。驗自然完成無命令、同 tick 試拳、自主恢復、取消／全退、最後波次、新 exiting 立即保存續跑與 M37 先出招再退出等舊反例。優先復用 closedAt/cut/bodyAt，當階段完成保存驗證；舊檔缺歷史不反推、不編造、不靜默拒讀。交正常 UI 自然兩波→暫停→試拳→回顧。

**M42 最小本地導航包與唯讀投影。** 建議 `vendor/public/00f4dbe/navigation-view/` 與 `src/navigation-view.mjs`。記上游／本地 hash、修改與依賴閉包，修 CSS import 指向已有固定 tokens。接目前 world，runtime `MAP.world` 現為2400×1800；Q256只轉DU，camera span轉zoom＝Canvas CSS width/span，viewport用Canvas CSS寬高，不用window或DPR bitmap。人物沿正式可見／inactive／departed排除，只交id/label/x/y，名字表也限公開人物；不傳known記憶、path、journal、秘密。地點只先收原 `FACILITY_CARDS` 三處store/kitchen/yard的已知點，不掃背景／床位／未公開設施。world成功替換或tick倒退才換epoch，失敗load／預覽取消保留原世界語義；不把epoch寫進存檔。驗隱藏／可見／再隱藏、layer-off pick、換局、座標／框線、唯讀不改world/RNG，fixture和正常UI分開。

**M43 接正式遊戲導覽。** 同一index入口，用公版SVG、紙墨tokens，可開收、人物／設施圖層、鏡頭框與明示無route。點人重核當下可見後沿原selected/follow，沿原卡查閱；點三設施只沿原facilityLocate相機公式，可開既有卡但不指派工作。不增加move／attack／teleport捷徑，不重做水彩場景或相機。跟隨／鏡頭框與本幀render同源，暫停時選取定位／拖縮／sidebar resize立即更新，不新增世界tick或timer。不可見時刪marker/title/list/tooltip/pick/focus；失去可見的舊跟隨不能繼續偷用raw位置；成功換局清暫態與舊closure。鍵盤／pointer／wheel不穿透成走路、工作或播放，保留標準控件與關閉焦點返回。驗1440×900、1280×800，播放／暫停、人物切換／圖層、同tick操作、失去可見與換局；暫停觀看不改world，跑動以同命令twin核對。

**M44 累積正常流程與交付。** 路線A：M40舊展示→導覽找阿木→原膳房做飯→跟隨真搬運、在途／上桌→自然演練後同tick試拳→正確回顧。路線B：既有指令準備遠征→真走林緣／溪橋→原召回→返院，導覽不顯示未見人物、不提供假路線；不新增目標。必要準備全由正常UI完成，不注入world／資源／關係／完成旗標。穩定M37舊驅動搬飯觀測：正常暫停後核同一快照phase／bag／DOM，已上桌則合法重試或如實未捕捉，不把undefined當0、不放寬斷言。保存舊M30/M36/M40與途中檔證據；驗成功／失敗讀取、預覽取消、新局同actorId、tick倒退、刷新／槽位、新exiting檔與導航清理，不做整體升版。

## 交付標準

每階段先交 `docs/optimization/Mxx.md`：玩家問題、檔案、權威／順序／來源、相容、正反流程與出口；必要實作與驗收通過後先取得真 artifact commit，再寫 `handoff/optimization-mxx.done.json`，包含作者/base/artifactCommit/spec/模型/UI/保存證據/限制。marker可另提交，不能引用未存在或自己才要產生的SHA。M41必要出口未過不要跨到M42。

遵守根契約與分層測試，優先新反例、既有回歸、順序／所有權、同命令twin與保存；純導航不需要新增長seed量測。最後跑本版完整回歸，保留歷史失敗與報告；會重寫舊證據的套件用隔離snapshot與正確唯讀Git context，不能跳過或讓runtime配合環境錯誤。新輸出放 `evidence/optimization/m41/`–`m44/`。用空閒隔離埠，不碰8800／他人服務／既有存檔；沿既有本分支正常UI驗證方式，finally關自有頁、browser、server。

最後交 `docs/optimization/DELIVERY-M41-M44.md` 與 `handoff/optimization-m41-m44.done.json`：P2反例與修正、固定公版及local hash、各artifact、啟動命令、正常UI展示檔與兩條路線、實際viewport／牆鐘／模擬tick、測試和限制。作者自校不冒稱獨立review，真人趣味未做就明寫。未知路線、更多設施、公版關係、全角色動畫、新地圖、手機與整體保存升版不在本包。

全部必要出口通過才總done。若真權限／相容取捨／外部依賴阻擋，交具體checkpoint和已完成證據，不以例外自動跳過、不自行擴包。完成M44停止，等待下一次指派。
