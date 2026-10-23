# Grok Build接手提示詞：#182完整生活地圖與圖像設計

擁有人已批准設計先行，並指定Grok專注圖像、Gemini後續整合。先讀 [正式工作包](MAP182_HANDOFF.md)，以下可直接貼；未代啟作者。舊ART184實裝prompt暫後，不是本輪任務。

```text
你是earth-ascension／Sect Chronicle #182完整道館生活地圖的設計主筆Grok Build。擁有人已同意先交總配置、畫風稿與行走預演，保留長通勤與看人物四處奔波；你專注設計圖片，Gemini後續才把圖片整合進遊戲。你有更大設計自由，可延伸更多生活功能點、外圍山徑與未來巡山區域，不必逐個點等批准才能畫。每點標現有功能／純景觀／未來候選，新增玩法與實裝範圍須看稿後再確認，不能直接寫進遊戲。

先讀root AGENTS.md、CONTRIBUTING.md、sect-chronicle/AGENTS.md、docs/DECISIONS_AND_SOURCES.md的D24、docs/MAP182_HANDOFF.md及本prompt，讀 https://github.com/lalagrass/earth-ascension/issues/182 最新內容與有效claim。核本D24文件已經非作者review、Earth PO合dev且postCI通過；記實際commit／CI。不需等PR244：那是Gemini在獨立目錄補修生活功能，原scope／期限不變，不接管或延長。PR245已接受合dev bccda780、postCI39884517733五SUCCESS，只作候選來源，不等於畫風或atlas定稿。

使用已有 /Users/chenyuying/workspace/earth-ascension-grok-art184。先確認自有目錄乾淨／無其他人在用，fetch最新origin/dev，保留原codex/art184-grok-build，從最新dev另建未占用codex/map182-dojo-design或其他codex/短分支。245可能squash，不假設原分支可ff-only；不reset／force push／刪分支或stash他人內容，有未提交先保存交接。完全不碰 /Users/chenyuying/workspace/earth-ascension-gemini-241 或其他作者branch。

本人在#182新登記Grok Build真實身份／工具、只此一包、精確白名單、base/head、GitHub created_at起4h UTC claimed_at/expires_at，重讀核最早有效claim再動手。舊prompt／目錄不等於認領，不沿舊兩小時窗口；4h是作者租期不是填滿時數。有具體進度才續期，完整交付PR回review，quota不足released，完成就停，不啟其他agent／排程或自接整合。

唯一可寫範圍 sect-chronicle/experiments/water-carry/design/map182/**：自有README／總配置來源／圖像／分鏡或短片／圖層與影響表、必要自有產圖工具。舊design/art184-grok、BL-W02、現行demo／spikes資料只讀。不要改demo、checks、共享實驗README、template／atlas／spikes、PO文件／root依賴CI／Earth、模型／路線／時鐘／工作／速度精力成長產出／掌法或8800。你不負責遊戲接線，也不必寫播放器；有設計頁只在白名單、不匯入遊戲。

先交三個可見成果：
1. 一個完整道館生活盆地總配置：生活院落、竹林→溪橋→泉眼的長挑水路、另一側藥坡／曬藥景觀、外圍山路／觀景點／村莊遠景。區域可重排與延伸，不受D23原坐標局部限制。2400×1350可作起稿比較，不是固定批准遊戲尺寸。用一個主案，場所ID／圖例／往返線與現有／景觀／候選清楚，不做龐大A/B矩陣。可加更多未來生活點或巡山視覺，但不拖欠必交。
2. 完整統一2.5D／斜俯視畫風稿，有真正建築／石材／水／植被與光影層次，至少全景與一處路段近景、桌面與390鏡頭示意。方向可參考天下霸圖場所辨識與活俠傳整體場景／人物氣氛，不複製素材；不只幾何塊套紙紋。人物在提議尺度清楚可辨，可提出特色服飾／體態候選，但不需量產全cast／方向動作atlas，也不把概念當人物canon。
3. 道館→竹林／橋→泉眼→回院的行走預演，分鏡或短片即可：同路徑同負重初學／熟練，看到跨區奔波與近景，標明設計預演／未連遊戲、1×估量及剪輯或加速。不要只原地走步、不把AI影片當真模型驗證。若選播放頁，真暫停／有限結束／重播要工作，不要為此寫遊戲引擎。

附給Gemini的短交接：可編輯配置／圖層、原圖輸出、工具／實際提示詞與來源授權、哪些僅概念／哪些可切素材、生成一致性限制；地面／樹冠／屋頂／人物腳底尺度、建議工作點掛點、鏡頭及可走意圖；現地點→新地點、路程與1×耗時估量／方法／角色等級／空手負重速度及取水交付假設。讀現行資料，不改數值。列長通勤對精力、每趟成長／產出頻率、採藥供應與護院／整理往返的影響，不偷偷加速／加收益抵銷長路。建議最小未來實裝切片與待決選項，Gemini看稿後才按擁有人確認範圍另包實作。#187舊避免拉長通勤建議被人類新方向更新，原接受稿與紙上結論保留；#245 scene-mood不同鏡頭、影片腳滑／持姿、人物與現sprite不同的限制保留，不直接套圖或裁mp4當atlas。

成本沿原則：檢視少量全景／近景、桌面＋390建議尺度與分層、來源／路線估量一致。純分鏡不造測試；若有播放器，一次核播放→暫停穩定→續播→結束穩定→重播，少量圖即可，不做每人每段排列。保護檔diff為零，必要git diff --check、python3 -m unittest discover -s tests -v、node --check earth_ascension/static/m2.js及適用CI保留；自有腳本才加必要syntax／操作。未變遊戲證據復用，SG快驗沿CI，不跑世界seed／長RT／存讀RNG、全cast全動作、引擎比較或鏡像單測。不自行付費。完整log落檔只回真exit摘要／失敗與少量圖，生成／GPU／瀏覽器限制和未驗項照實，不假稱圖已整合或全部綠。

完成必交和交接即可停止。PR指向dev按root模板寫真實作者／工具、claim期限、base/head／檔案、可看入口、來源／圖、有限驗收及未驗項，回#182交遊戲PO非作者review，再交Earth PO唯一queue鎖head合dev並核postCI。你不合dev/main、不刪作者分支、不啟停8800；預覽先確認空埠。先讓擁有人看總配置／畫風／預演，實裝範圍之後確認，由Gemini新claim整合。不要在#244或舊ART184包順便接圖，也不要因有新生活／巡山設計就加玩法。
```
