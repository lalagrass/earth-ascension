# Gemini接手提示詞：LP-13 長挑水路

**狀態：W1–W4待擁有人確認，本提示詞目前只能用於閱讀／評估，不可認領或寫runtime。** PO將在人類確認後更新批准文件與[#254](https://github.com/lalagrass/earth-ascension/issues/254)；該批准文件經非作者review、Earth合dev及postCI通過才解鎖。提案文件合併、PR250接受或舊prompt不解鎖本片。完整取捨／數值／白名單／驗收見[工作包](LP13_HANDOFF.md)。以下整段可複製。

```text
你是Gemini，接手earth-ascension/sect-chronicle的LP-13長挑水路切片（#254，父單#182）。先讀根CONTRIBUTING.md、根／子專案AGENTS.md、最新issue與PR留言、LP13_HANDOFF.md及DECISIONS_AND_SOURCES.md的D26和後續批准紀錄。

開工門檻：W1–W4須有人類確認、PO批准文件與issue一致，文件經非作者review→Earth唯一queue合dev→postCI通過。若尚未完成，只回報缺哪一項並停runtime；可以列唯讀疑點，不重問已選的長路／同入口方向，不自己補批。這則prompt不是認領、不代啟其他agent。

門檻完成後，核對當前有效作者與4h期限；用自己的獨立乾淨worktree，從最新origin/dev新codex/短分支，在#254先登記Gemini本人、精確檔案、base SHA、branch及GitHub created_at起4h UTC期限，再次確認無較早有效重疊claim才開工。不要續推#250／#248舊分支，不碰別人checkout、未提交成果或8800，不reset／force push。沿用公開素材時保留Grok／Gemini原作者與來源。

目標：同一生活demo入口可看兩人在長路上真走、真挑水與成長，熟手更快，主角下一趟變快。長通勤是玩家想看的內容，不能為縮短等候偷偷加速、縮圖或提高收益。

按工作包當前已批准值執行；若仍採本提案：
- 既有1600×900院落與HOME(962,512)不搬，只向南延伸世界到1600×1350。
- 單程water約1700、範圍1650–1750：院落→竹林→溪橋→石階／泉眼，原路返院。採藥、座位、休閒、護院與清鼠幾何保留。不直接採整張2400×1350概念配置。
- 原速度、精力／休息、每趟產出與成長、人工改令及LP12自主政策不改。精力0仍完成本趟後休息是既有行為，不能順手改成途中休息。每趟鎖速、交付後下一趟才用新等級；不按路長多發XP。
- 只做水路必需的新地面／竹林／溪橋／泉眼與少量前景層；保留人物atlas、工具與步態。先交院落連南段的實圖小樣及掛點，再有限接線；同一批准範圍不必逐張另要簽核。素材能力不足就明寫缺口，不交假成品。

PR250的JPG／PNG／影片是概念來源，不是可直接鋪底的分層資產；內含人物和壓縮距離。不要直接拉伸舊背景或概念圖。新圖記實際工具／模型、來源授權／作者、輸入與原始prompt／輸出；未知如實記，不能捏造已遺失的舊prompt。天下霸圖的生活動線、活俠傳的整體氣氛只作參考，不抽取商業素材。

接線：新增demo自有water-layout.mjs或JSON（二擇一）作水路points、world size、泉眼掛點及圖層的唯一來源。pathTool求實際長度，同源供模型耗時、畫面取樣／腳底、初始影子與動畫距離。不能模型仍讀730.6、畫面另走1700。保持現有單60Hz、view／dispatch、真位置與單tick移動預算；鏡頭不影響感知／結果。舊scene生成檔、template／atlas／spikes只讀。

沿PixiJS＋HTML與原demo，補長路的跟隨／拖曳縮放／恢復跟隨。桌面與390保持人物可讀、兩端可達、HUD／選人／暫停／倍率／工作／休息與LP12控制可用，不把世界fit到人物成小點。原泉池若留景觀須移除原有效取水熱區，只新泉眼可用。橋、樹與人物前後遮擋、取水／倒水腳底要對齊。

可改檔案依LP13_HANDOFF.md有限白名單：demo自有layout、demo/assets/long-water/**、app.mjs／routes.mjs、必要index／既有樣式、局部checks與實驗README。model.mjs／palm.mjs／RULES原則上不改；需要模型語義／其他工作幾何／依賴／白名單外內容先列最小差異交PO，不先做。不要新增引擎、通用尋路／Queue／ECS、功能點、巡山、人格、存讀或全場景／人物重畫。

驗收按工作包A–D，只補有意義缺口：真路長同源；同負重初學／熟手首趟耗時；主角交付後成長且下一趟變快；路中改採藥／停工在原趟後執行，自主休息續工／人工停工維持，交付／預約／成長不重複，候補只院中受理。實際路長須重算，不把紙上估量當實測。

測試與輸出成本：沿既有checks，必要局部反例、SG快驗node --test sect-chronicle/test/*.test.js、根python3 -m unittest discover -s tests -v、node --check earth_ascension/static/m2.js、變更JS語法、git diff --check及當前CI保留。一次桌面＋390真操作涵蓋兩端鏡頭、暫停／恢復與改工；未變掌法／素材／背景頁政策等證據復用。無新差異不跑全幀×等級×工作、世界長seed矩陣或遷移。log落檔只看摘要／失敗和少量圖，保留真exit／GPU限制，不能為綠燈放寬驗收。

建議從本人新認領開工起最多120min、100min後不加範圍，達標早停。4h租期不延長執行窗口；若超時／素材缺口，交可審draft、head／已跑證據／未完成項與下一步，不自接下一包或啟子agent／排程。

PR指向dev，用根PR模板列實際主筆Gemini、base/head、claim、修改檔案、來源、實際耗時／路長、短操作URL、測試摘要與限制，連#254／#182。回填issue為review或blocked；不可自己合dev。等遊戲PO非作者驗收→Earth唯一queue合併→postCI後，由遊戲PO更新8800並保留LP12。本次交付到這裡即停。
```
