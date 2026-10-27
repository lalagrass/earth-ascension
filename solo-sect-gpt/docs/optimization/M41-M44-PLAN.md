# M41–M44：自然退場修補與正式場景導覽

2026-10-27；規劃／review：GPT / Codex。使用者要求核對最新 dev 公版，結合 M37–M40 review 的一項 P2，規劃下一批並整理 Claude 串行實作 prompt。本文件是規劃，尚未實作或驗收；不把 M40 done 當成本批完成。

## 固定盤點與取捨

- GPT 分支 `codex/solo-sect-gpt`，HEAD `d9c7810ebba6f9756c3ebacd2891a3cabd619ae6`。本批從此續作，不從 dev 重建、reset 或合別版核心。
- 本次 fetch 核對遠端 dev：`00f4dbe26be5765a9622957b7c6a636ab5039f96`。GitHub PR [#371](https://github.com/lalagrass/earth-ascension/pull/371) 已於 2026-10-27T12:01:29Z 合入，內容為 #367 SCENE-NAV-01。handoff 仍保留作者「待審」快照，實際 merge 狀態以 PR 與此 SHA 為準。
- 相對上批固定 dev `3079a03de5c2e8c79af64b0962ae3da75f274466`，新的公版只有場景導覽；人物、武學、設施、資源、意圖、簡介、樣式與兩張立繪的既有採用不用重搬。
- [場景導覽交接](https://github.com/lalagrass/earth-ascension/blob/00f4dbe26be5765a9622957b7c6a636ab5039f96/sect-chronicle/docs/SCENE_NAV01_HANDOFF.md)：原生邊界、當下公開人物／已知地點、鏡頭框、原選取跟隨／定位、圖層與 epoch 清理；沒有公開實際 route。
- 上游 GPT 驗證仍使用固定舊核心 `6cbd3e6…` 的 harness，不等於本分支正式入口已接入。本批接當前核心、Canvas 與同一 `index.html`，不帶入 Pixi、舊核心快照或另一個時鐘。

下一批只做一條可驗的改善：讓玩家在生活、演武與遠征間找得到人、看得懂鏡頭所在，並讓演練回顧只統計真正屬於演練的行為。小地圖是位置簡圖；它不取代現有水彩場景，不代表地形、美術或戰鬥已重做。實際路線、探索記憶、關係公版、其他研究人物、新玩法與手機另排；保存只處理本次必要相容，不做整體升版。

## 已確認的 P2

M37 的命令退出已修，但自然完成漏了另一條所有權轉換：`combat.sessionsTick` 把演練改為 `exiting`，並清除參與者 `combatSession`；`jointTick` 只在 assembling/running 偵測離開。`world.command` 又在命令執行後才呼叫 `jointCut`。因此自然退場後第一次試招會先耗能，再凍結 bodyAt，污染回顧。

獨立正常 UI 重現（當時 HEAD d9c7810）：匯入 M36 展示檔→日課安定、必要休息→阿木與沈禾皆前鋒、同時到場、A 演練→正常集合、開打→等兩波自然打完，於 exiting 暫停→沈禾人物／武學／基礎拳／試招→繼續至回顧。tick `200004`，沈禾 session 已為 null，試拳精力 `7779→7579`；回顧耗能應 `1215`，實記 `1415`，page errors 為空。另有模型重現 `1417→1617`，同為多算 200。這些數字是當次證據，不要求未來所有路線碰巧得到同一 tick／初值。

本次 review 的 291 項回歸全部通過；立繪 UI 與 M40 正常展示也過，因此不能只憑既有綠燈結案。M37 舊 UI 驅動另有搬飯觀測／按暫停的競合：等到 haulOutput 後，讀到暫停快照時已上桌，拿 undefined 當預期數量。這只是驅動待穩定，M40 正常搬飯路線已過，不宣稱第二個產品 bug。

## 串行里程碑

| 階段 | 玩家結果 | 主要工程 | 出口 | 成本 |
| --- | --- | --- | --- | --- |
| M41 | 自然打完再試招，演練回顧不算場外消耗 | 真生命週期截止與保存反例 | 自然完成／取消／人工退出及同 tick 先後都正確 | 中 |
| M42 | 當前 GPT 核心能提供安全的公版導覽快照 | 固定來源、最小本地 adapter、座標與 epoch | 不讀秘密、不改世界、不引舊核心、原生尺度正確 | 中 |
| M43 | 正式遊戲可開導覽、找人跟隨與定位既有設施 | 共用 SVG renderer 薄接同一 Canvas 入口 | 點圖只改觀看；當下可見性與鍵盤／焦點／刷新正確 | 中 |
| M44 | 一條正常生活→演武→遠征觀看流程可重走 | 累積相容、展示檔、測試驅動與交付 | 必要反例及桌面 UI、舊檔、來源與限制齊全 | 中 |

### M41 自然完成的統計截止

修改候選：`src/world.mjs`、`src/combat.mjs`、`src/joint-drill.mjs`，只有確有新增狀態／驗證需求時改 `src/save.mjs`；對應局部與 UI 測試。先追 `sessionsTick → jointTick → combatAI → movement/combat → activities` 的真實順序，選最小修法，避免 combat 與 joint 循環 import。不能只在下一個玩家命令後或最後回顧時拍快照。

要求：自然進 exiting／cancelled 與清 session 的時點，就在外部試招、自主生活或新活動能耗能前，記真正截止。截止前最後一招／命中照算，之後招式、命中、精力、傷勢不回灌。已人工退出者沿自己既有 cutoff；多人先後離開、重複終止／重複 tick 不覆寫第一次正確快照。不要靠禁止正常試招、保持假 session 或停止自主生活掩蓋問題。

模型出口：自然完成後無額外命令、同 tick 場外試拳、恢復日課／移動、人工退出、全員退出／取消、最後波次計數、不同退出者各自截止；exiting 當下未下任何外部命令就保存，解碼後續跑與原局一致。保留 M37 截止前同 tick 出手、退出後同 tick 出手等斷言。

保存：優先沿既有 closedAt/cut/bodyAt，不為修正不必要地升版。新產生的 exiting 檔必須有完整截止；一般舊檔沿既有讀法。若舊 exiting 檔缺歷史快照，不能反推真實結束精力或編造歷史；列出可證的相容處理與限制，測最早可安全截止點，不偷偷拒讀原本有效的檔。只在確實無法保持既有相容時回報具體選項。

正常 UI 另交上述兩波自然結束→暫停→試拳→回顧；觀測先固定在暫停快照，斷言實際截止前後差額，而非硬填 1215。

### M42 固定公版與當前核心唯讀轉接

只取固定 `00f4dbe…` 的 `sect-chronicle/navigation-view/{contract.mjs,render.mjs,style.css}` 及必要依賴。建議放 `vendor/public/00f4dbe/navigation-view/`，逐檔記上游 sha256、本地 hash、改動與 import 閉包於 `vendor/public/SOURCES.md`。style 的 `../public-ui/style.css` 不能留下不存在路徑；復用已鎖 6f959f5 的相同 tokens，記明 import 改寫，不重複引入整套樣式。上游測試作反例參考，不原封搬入其舊核心／Pixi 依賴。

本輪直接從固定 Git blob 核過的 sha256：

| 上游路徑（均在 sect-chronicle/） | sha256 |
| --- | --- |
| navigation-view/contract.mjs | da43ab2b915d7eed8256b0d8cdeaeea24c4cab3a7eaba2b11d29a731f2cb961a |
| navigation-view/render.mjs | c352e0b938fef1e5039ee876160921390303a9ba64403169ce57d84eca393499 |
| navigation-view/style.css | 4e7748d76eb2703fff741d8475658ea291d6eed59a64501002792bb46d9aa2f0 |
| public-ui/style.css（與 6f959f5 原檔逐位元組相同） | 58659ff5c5054d84018faf266551b6336b3ed7c2dbe3318d389096ab507fdf1a |

本地候選 `src/navigation-view.mjs`：getWorld + 當下相機／Canvas 尺寸 → 白名單 snapshot → 公版 navigationView。邊界讀當前 runtime `MAP.world`（目前 2400×1800），不從規劃文字的「1 DU=2 world units」再倍率換算。人物座標只做 Q256→DU；本地相機是 `{x,y,span}`，公版是 `{x,y,zoom}`，真 scale 為 `canvas CSS width / span`。viewport 取 Canvas 實際 CSS 寬高，排除 sidebar，不用 window 寬或 DPR bitmap 寬；框線取原相機視野與世界邊界交集，不為小地圖改相機可移範圍。

當下公開人物沿 `visibleEntity` 加正式場景原有 inactive/departed 等排除，白名單只給 id/label/x/y。不得把 raw people、known 記憶、journal、path、意圖、未揭露數值或被隱藏標籤傳進 renderer。姓名 map 也只含當前公開角色。設施第一包只收既有 `FACILITY_CARDS` 的 store/kitchen/yard，由當前合法卡片與 runtime rect/anchor 取點；不掃所有 stations、床位、未公開預留設施或背景裝飾補點。不把設施存在誤叫已建好；沿既有已知廢墟／施工可見規則。可見地點少不以假資料湊滿。

source 指本版來源／映射版本，不能冒用上游舊 GPT SHA。epoch 是 UI reader 生命週期，依 world 成功替換或時間倒退刷新；不入世界存檔。新局、手動／自動讀取、創角畫面續讀、確認匯入都需重核；失敗載入、匯入預覽／取消不能把候選世界當已換局。route 維持 unsupported 與原說明；不讀 private path、連端點、UI A*、目的地或歷史軌跡。

出口：快照與 pick 無隱藏資料、不可見→可見→不可見、layer-off 同步移除可點資料、epoch/world 替換清暫態、同 tick 更新、超界／非有限座標防護、不同 Canvas 寬高／sidebar／DPR 的鏡頭框。大量唯讀查詢與點選前後世界／RNG／journal／保存 bytes 不變；同命令 twin 續跑一致。模型 placement fixture 必須標示，不能冒充玩家正常走到那裡。

### M43 正式入口導覽與既有操作

同一 `index.html` 增加可開收「導覽」，使用公版 SVG renderer，不新建玩家入口或用研究 harness 代替。沿紙墨 tokens，在 1440×900 與 1280×800 不遮主要操作、人物卡與演練回顧；有標題、圖例、圖層、鍵盤焦點與按鈕 expanded 狀態。文字明示它是當下位置簡圖與路線未支援。原水彩 Canvas、跟隨、拖曳、縮放、家園／林緣／溪橋／古洞 presets 保留。

人物點擊：以當下投影／原可見性重新核 actorId，再沿原 selected/follow，與人物卡維持同一角色；查閱仍用既有人物入口，不給第二份選取權威。三設施點擊沿現有 facilityLocate 的真公式（rect 中心、span520、清 follow）；需要查閱可導到原建設卡，但不要點一下就指派工作。不設從小地圖空白點地移動、攻擊、傳送或開資源的新捷徑。可將既有選人／定位處理抽成小型 UI helper，別順手重構整份 ui.mjs。

跟隨與鏡頭框要在本幀 render 更新相機後對應，暫停時選人／定位／拖曳／縮放／sidebar resize 不等下一個模擬 tick；不新增 setInterval 或進世界的 step。每幀重繪不是要求全 DOM 每幀重建，沿 renderer 小量更新且避免重排／焦點跳動。

不可見與換局立刻清 marker、title、名單、下拉選項、tooltip、focus/pick surface；原本跟隨的野外人物若失去可見性，不能再用 raw 位置把相機跟過去，應清跟隨並沿現有正常選人 fallback。不能從已刪 marker 的舊 closure 取座標。原始場景的同類入口若需最小共用護欄，列明受影響範圍並驗，不新增全域知情規則。

小地圖內 pointer／wheel／Enter／Space／Escape 的操作不穿透成移動、工作或播放；保留標準控件操作和可回到開啟鈕的焦點，關圖層後不能透過舊名單或鍵盤點到已移除項目。關閉／重開同局可保留觀看偏好；換局清身份暫態。UI 偏好不進 world/save，不為此新增保存 schema 或設定同步。

出口：正常 UI 選阿木跟隨真採集／搬運→定位膳房→原卡查看在途→切演武場與自然結束回顧；暫停／1×／4×、面板開關、離開可見、兩種尺寸、鍵盤及同 tick 點選均有局部反例。所有觀看操作暫停時 world 不變；跑動時用相同命令 twin 驗，不拿兩個不同牆鐘的 world 快照硬比。

### M44 累積驗收與觀看路線

交兩段正常流程：

1. 舊 M40 展示檔匯入→導覽找阿木→原膳房做飯→跟隨真搬運並查在途／上桌→自然打完聯合演練→退出後同 tick 試拳→回顧正確。
2. 沿已完成的遠征指令準備／出門→導覽與原鏡頭觀察隊伍走到林緣／溪橋→原召回→看真返院。無需新增目標或古洞通關；若展示檔不足，正常 UI 做最小準備，不注入路線／資源／關係或已完成旗標。看不到的野獸不因導覽顯示，實際路線持續標未提供。

修 M37 舊測試的觀測競合：等待搬運後透過正常暫停控件固定世界，再以同一份快照核對 phase／bag／DOM。若已上桌就繼續合法重試流程或明確記未捕捉，不把 undefined 變 0、不放寬讓錯誤數量過關、不用頁面 evaluate 寫 world。新失敗與最後接受證據分開留存。

保留 M30/M36/M40 舊展示與途中檔，驗成功／失敗載入、預覽取消、時間倒退、不同世界相同 actorId、同局重開導覽、刷新、手動槽不被覆寫與 M41 新 exiting 途中檔。導航不增加持久世界資料；不重做保存框架。既有兩張立繪／缺圖回退、內容包缺失、既有事件 feed 只跑受影響回歸，不把此次新圖或全套舊路線重跑當必要前提。

最後交 `DELIVERY-M41-M44.md`、每階段 spec／artifact commit／done marker 與總 marker `handoff/optimization-m41-m44.done.json`。正常 UI、模型 fixture、作者自校、真人趣味分開；記實際 viewport、牆鐘、模擬 tick、啟動／展示入口與未支援項。新展示檔以正常 UI 保存。全必要出口完成才 status=done；完成 M44 停止。

## 公版回饋候選（本包不改上游）

本版需要 span→zoom、Canvas CSS viewport、成功換局 epoch 與新鮮點選的薄 adapter。可將這四項列到交付的「公版採用備註」，附真差異與來源；本次不代發 issue、不新增公共 API／route contract。route、完整探索圖或更多設施日後有核心公開契約才另包。

## 驗證與工程邊界

每階段短 spec→實作→必要反例／正常 UI→修補→實際 commit→done marker→下一階段，一位 Claude 作者，不派代理。只改 `solo-sect-gpt/`；不 push／PR／merge／部署，不動 dev、他人工作區、根 CI／依賴。沿本地 BRIEF 的私人獨立原型授權，來源公版的正式審合權不變。

保留 Canvas、20Hz、Q256、唯一世界、五項 stats、U/F/I、原權限與所有已知規則。人物／武學／資源公版版本、素材 pin 與地圖幾何不隨本包重做。若上游 dev 又前進，先列相關差異，仍依本文件固定版本，不自動把新包混入。

遵守根 CONTRIBUTING／AGENTS 的適用檢查與分層政策；本地核心以反例、單測、同命令重放、存讀、正常 UI 為主，收尾跑本版完整回歸。輸出落新 m41–m44 目錄；全套舊測試會寫歷史報告，沿既有隔離 snapshot＋正確唯讀 Git context，不竄改舊證據或跳過歷史測試。純規劃本輪未跑測試、未開服務。
