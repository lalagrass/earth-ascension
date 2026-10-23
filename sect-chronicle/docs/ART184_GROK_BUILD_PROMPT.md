# Grok Build接手提示詞：#184 V1–V4局部美術整合

## D24更新：本實裝包暫後，勿直接按下方舊prompt開工

擁有人最新決策見 [D24](DECISIONS_AND_SOURCES.md#d24-182-完整道館生活地圖設計與美術分工批准2026-10-23)：先由Grok Build交[#182完整道館生活地圖設計](MAP182_HANDOFF.md)／[新圖像設計提示詞](MAP182_GROK_BUILD_PROMPT.md)，保留長通勤並可延伸功能點／未來巡山。**Grok專注設計圖片，Gemini才是後續整合主筆**；看稿後由擁有人確認實裝範圍，再更新工程工作包並本人新claim。

下方D23的V1–V4範圍／證據留作歷史與後續候選，不自動執行。#245已合dev bccda780、postCI39884517733通過；#244原補修不變，但其完成不會自動解鎖本舊包。新#182純設計不等#244，D24文件合dev／postCI即可按新工作包認領；本文件不授Grok接demo或操作8800。

批准來源 [D23](DECISIONS_AND_SOURCES.md#d23-184-局部美術整合-v1v4-批准2026-10-23)，精確範圍與六項驗收以 [正式工作包](ART184_HANDOFF.md)為準。擁有人貼給Grok Build；未代啟作者。**這不是#245原補修的替代prompt；先補修通過再接本新包。**

```text
【歷史封存：不要執行本舊整合指令。先讀D24及MAP182_HANDOFF.md；Grok本輪只做圖像設計，後續整合改由Gemini並等待新範圍批准。本框後文僅保留D23歷史。】
你是earth-ascension內Sect Chronicle #184「泉池—石階局部美術整合」主筆Grok Build。擁有人2026-10-23已批准V1–V4，不重問：同鏡頭局部材質比較；遠景／地面可烘、遮擋物分層、舊角色動畫保留；薄整合同生活入口且不改生活規則／最新控制；保留上版並做局部驗證。整體畫風／人物canon沒有因此全定稿。

先從repo根讀AGENTS.md、CONTRIBUTING.md、sect-chronicle/AGENTS.md、sect-chronicle/docs/DECISIONS_AND_SOURCES.md的D23、sect-chronicle/docs/ART184_HANDOFF.md與本prompt、#184／#241及PR #244／#245全部最新留言。GitHub來源：https://github.com/lalagrass/earth-ascension/issues/184 。

開工前核三個前置：本次D23文件已由Earth PO審查合dev且postCI通過；#244休閒清鼠返院補修的新head經非作者review、Earth合dev及postCI通過；#245預演到10秒仍播放補修的新head也經同流程完成。每個都記實際head／接受review／dev merge與CI到#184。舊head五綠、文件已合、作者說修了或只push，都不是依賴解除。任一未完成就停止本新包，記blocked與剩餘依賴，不寫新素材／runtime、不預占新claim，也不反覆問已批V1–V4。原#245補修仍按原scope／期限先完成，本prompt不延長其期限。

專用worktree已建立：/Users/chenyuying/workspace/earth-ascension-grok-art184。原codex/art184-grok-build分支屬#245，保留且不要把本包塞進原PR。三前置完成後，確認自己的目錄乾淨／無他人接手、fetch最新origin/dev，再從origin/dev新建codex/art184-v1-v4-integration或另一個未占用codex/短分支。前包squash後原分支可能分歧，不能假設可ff-only，不reset／force push／刪分支或stash別人的檔案。有未提交成果先保存／交接，不盲目切換。Gemini的/Users/chenyuying/workspace/earth-ascension-gemini-241完全不動；同repo的refs仍共享，不改別人的branch。

本人核無有效重疊作者，在#184登記真實Grok Build／工具、這一個包、base/head、精確檔案、GitHub created_at起4h，重讀確認最早有效claim再動手。4h是作者租期，不要求用滿；有進度才續期，完成PR轉review，quota不足released。這是新單包，不承接Gemini或舊Grok時間窗口，不啟其他agent／排程或自動接下一片。

先讀已接受#245來源：既有同鏡頭布局、scene-mood材質參考、人物與影片限制。做泉池—石階這一小段的水面、石板、苔草、邊緣與光影，先交同鏡頭／同站位／同狀態疊舊人物的新舊比較，附來源SHA和坐標。scene-mood.jpg不同鏡頭，不能直接拉伸用；不只調色／套紙紋。V1交可看成果後，可沿批准方向接V2/V3，不等全部程式完成才展示、不新增逐圖人類簽核；重大偏離另提案。

場景沿最新scene.json原點／尺寸／resolution（目前1600×900、2倍輸出），原路線、地點、人物腳底與碰框不變。遠景／地面可烘；水缸／樹／屋頂等仍分層按原腳底排序，HUD／人物／名牌／需遮擋互動物不重複烘背景。可合成舊底圖的新版本但保留舊資產，不改spikes輸入。舊sprite、縮放、幀框、左右翻、腳底與工具掛點保留，107px圖框不等可見角色高度。新立繪、透明人物皮、正式動畫／全朝向另片；不裁mp4當atlas。原創／授權清楚素材優先，保存可編輯來源、實際生成提示與工具／來源授權，不能只交prompts或把概念圖說成可用素材。不得自行開付費服務。

只改experiments/water-carry下：design/art184-integration/**（新來源／比較／必要工具）、demo/assets/art184/**（新素材）、demo/app.mjs的最小載入與背景／地面組裝、必要checks/art184-check.js、實驗README。完整保留README最新紀錄。舊design/art184-grok/**、demo/model.mjs/routes.mjs/palm.mjs/index.html/style.css、template／atlas／spikes、舊js/viewer/storage、Earth／root依賴CI與PO文件都不改。需要擴檔先說原因與最小替代，不順手重構。不能因美術刪掉最新LP11/12鼠列、掌法卡、自主／人工控制或改UI語義；不改世界時鐘、路線、速度、精力、產出、掌法、模型／碰框，也不造第二時鐘或素材框架。

依正式工作包六項有限驗收：新舊同位置實圖／可編輯來源；一前一後遮擋與原角色／選取無跳；同入口自然挑水／採藥交付；一次桌面＋390看點人／工作點／原控制可達與暫停零進度；同環境記尺寸／bytes／紋理數／初屏及短段畫面成本配對；保護檔diff為零、必要語法／根檢查／SG快驗與CI。圖稿只驗圖／來源／連結；實裝才補局部真操作。未變LP12模型、原人物動畫／時間政策及世界證據復用，不再重演完整清鼠／長恢復，不跑新seed／長RT／存讀RNG或全命令×人物×時相、不寫鏡像測試。沒有既定FPS門檻則報真實量測差異，不自創保證或降門檻。完整log留檔，回摘要／真exit、失敗與少量圖，GPU／CDP限制如實。

必要命令：python3 -m unittest discover -s tests -v；node --check earth_ascension/static/m2.js；node --test sect-chronicle/test/*.test.js；git diff --check，以及受影響的app／局部腳本syntax與視覺驗證。保留適用CI，不拿舊head綠燈代新merge結果。沒有世界／RNG／存檔變更，不新增長矩陣；若碰到契約改動先停並提案。

完成這一包即停止。PR指向dev，用root模板寫真作者／claim、base/head／檔案、來源／短流程與圖、六項證據／復用、保留調整延後及未驗限制。回#184/#67交遊戲PO非作者review，再由Earth PO唯一queue鎖head合dev、核postCI。你不合dev/main、不刪作者分支、不啟停8800；另確認空埠預覽。只有本包接受與postCI後，遊戲PO才更新同一8800並保留上一已接受生活版。
```
