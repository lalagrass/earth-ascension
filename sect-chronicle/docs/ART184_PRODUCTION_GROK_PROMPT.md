# Grok：場景素材與雙人造型，獨立出圖後同主筆實裝

## D36目前批准與接手（2026-10-24）

擁有人已批准#279／SG-LIFE-01的M1–M4及同Grok多批次做到完成：先PR278美術兩P2補修，再連續飲水自理與最小本地存讀，下次集中review。以[正式工作包](LIFE01_HANDOFF.md)／[最新提示詞](LIFE01_GROK_PROMPT.md)為準；下方M1–M4待批准／美術完成就停止的文字是原提案與歷史範圍，不再作當前阻擋。新增功能仍等本正式文件非作者接受／Earth合dev／postCI後本人279新claim。

本輪候選串接允許同Grok自校D35後，新支線從最新dev普通merge自己checkpoint、標depends278，不逐內部批次空等；PR278維持美術唯一主PR，飲水＋存讀另同一完整主PR。這不允許自合dev／發布／改8800，未審候選不宣稱接受；下次非作者集中review後Earth按依賴整合。無執行總限時、達標早停，4h有效租期／必要差異驗證、單頁清理與單版本維持。


以[正式工作包](ART184_PRODUCTION_HANDOFF.md)為唯一範圍／A–D驗收；[D31](PARALLEL_HANDOFF.md#d31單一主筆完整工作包與集中審查)、[精簡驗證及單版本政策](VALIDATION_POLICY.md)照舊。以下可貼，未代啟／認領。

```text
你是Grok，接手earth-ascension內Sect Chronicle #184的D35「場景素材與雙人造型＋後續實裝」，#182只互連。擁有人保留Gemini完成#274／LP17，你先獨立出圖，LP17非作者接受、Earth合dev及postCI成功後由你接續有限實裝。你是同包素材、清理、烘焙與接線的唯一主筆，一個完整主PR集中review，不把樹、屋、人物、匯出分派成多次交接。

擁有人最後取消了四小時執行上限：本包不設4h／2h總時限或100分鐘凍結，做到正式工作包A–D完成。不等於永久占claim：按根CONTRIBUTING每次4h租期，到期前附新commit／draft／實圖或驗證與剩餘／下一交付續期。工具／額度／session中斷保存成果與續接點、如實回填，不假稱完成或假設會自動背景續跑，不自啟其他agent／聊天／排程。

先讀根CONTRIBUTING.md、兩層AGENTS.md、#184／182／274最新留言、docs/ART184_PRODUCTION_HANDOFF.md、D31與VALIDATION_POLICY，以及已合D32場景／三人原圖來源。先核D35文件非作者接受、Earth合dev與postCI成功；本人在184新有效claim，真身份／工具、最新dev完整base SHA、codex分支、自有worktree或clone、A/B範圍與GitHub created_at＋4h UTC，重讀無重疊再開工。不要沿D32舊claim，不另認領182。

A現在可做，不等LP17：只寫experiments/water-carry/design/art184-production/**。交統一畫風的道館灰瓦木構／石院、沿長路松竹樹石／路緣／溪岸泉池素材，地面和可遮擋物分層；以及圓潤少年藍衣紅結主角、瘦長少年橄欖褐村衣熟手的正側背及空身／負重／採藥必要關鍵姿態。保持同一臉髮、衣服／光源／比例。保存實際原圖、編輯來源、工具／prompt／引用與使用權、尺寸／錨點／分層清單及少量完整桌面合成（標概念、未接線）。需要透明的素材是真alpha，不能棋盤或白底冒充；做不到要列限制。不要只交更多全景或prompt，不逐張生成不一致的57幀當完成動畫。

原D32已定方向沿用，素材依公開dev的路線／腳底尺度設計，不能整張含固定三人的圖鋪成地圖／sprite。先確認實際GenerateImage／編輯工具可用，未可用就如實交缺口，不採購／加付費服務。A不動runtime、atlas、LP17成果、PO／小說文件或8800；不讀Gemini未公開內容。開一個draft主PR先放完整素材，內部自行看圖修一致性，不逐圖請人類簽核。

B只有#274最終非作者接受→Earth實際合dev→postCI成功才可寫runtime，不能只看綠燈／關單。核最終採用與最新dev，正常同步原分支（不force／reset他人），在184回填前置、階段與base；同PR接續。A完成但前置未過就回填B blocked、清資源暫停受阻部分，不空等或預占runtime；恢復時有效claim回填，已expired／released則重新認領。B已由D35授有限範圍，前置完成後不需再問逐圖批准。

B白名單（以experiments/water-carry為根）：demo/assets/art184-production/**、demo/app.mjs（薄素材／外觀接線）、demo/assets/long-water/scenery.mjs（材質／景物，幾何不變）、必要template/tools/bake.js的既有painter／out擴充與demo/tools/export-art184.js（有限入口復用POSE）、本層README.md、design/art184-production/**。只改確有必要者。保留LP17已交功能，不退回LP16重做；新素材另存，不覆蓋LP17或歷史來源。

原model／routes／water-layout／palm、HTML/CSS控制、template/actions.json／animator／walker／舊out、歷史spikes／design、LP17自有素材／checks／PO／Earth／小說／根CI依賴／8800只讀。保留原動作幀數／幀名／stride／fallback、腳底框／hitbox及桶簍掛點；用POSE／既有烘焙產生連續動畫，不複製引擎。人物id／UI名稱／兩人fixture不改，成長不變瘦；女孩AI、新骨架／新動作／完整三層台地或村路巡山玩法不在本包。必要越界在184說明具體缺陷和最小差異，停該部分。

A–D結果：可採用的場景與一致雙人素材；真同入口採用且人物活動／工具不漂、新舊屋樹不重影；原1700.9水路／515.2藥路、1600×1350世界、速度／精力／成長／真入帳／控制／暫停保持，1×同路同負重能看差距；來源／採用與延後／少量真圖／實測與清理齊全。不是只把概念變漂亮，也不是只套濾鏡。

驗證：A看實圖／來源／alpha／尺寸，不跑遊戲套件；B只變更JS／diff、素材／sheet契約與少量聯絡表、一段桌面真流程，未變模型與當前必要CI復用，不本地重跑141／root全套、手機／seed，不寫存在性／複製公式測試／永久runner。任何時刻一般最多一頁／一臨時服務／一本地工作，烘焙與遊戲頁依序；成功／失敗／額度或中斷都finally清自建頁／程序、還原viewport並確認，不碰8800／他人資源。

同一PR指dev，用根模板寫Grok真身份、base/head／有效claim／LP17前置證據、A–D、修改清單、少量圖／命令與exit／限制／復用與清理。完整交遊戲PO集中review，你集中修，非阻擋美化留backlog；Earth唯一queue鎖head squash／核postCI，作者不自合。工程通過後PO才更新同8800，只留當前接受版、清前次部署，不做回退入口；Git／worktree／來源與少量證據保留。#184／182母單其餘backlog不關。
```
