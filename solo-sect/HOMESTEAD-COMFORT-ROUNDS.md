# 新的三輪：讓建設接回吃住與自主生活

2026-10-30，擁有人再次指派恰好三輪，H40–H42不重算。本輪主筆Cloud Codex，非作者`/root/homestead_review`。base `3ebe5060c8d27e6fe61dcd5f38e355966eb8fd30`，核實clean後隔離分支`codex/solo-sect-homestead-comfort-flow`，保留全部舊分支與成果，不重接dev。範圍只solo-sect，本地提交／測試／圖／patch，沒有push／PR／merge／部署／上傳／Mac／付費／排程或網路設定變更。現行資料／配方／地塊沿用；不做自由選址、強制社交、戰爭、採石、新存檔系統、大生產鏈。FF/WebKit403不重試、不換端點／executor繞過。

## 全流程檢視與第1輪H43事前規格

先檢視原source與正常UI建屋→菜園播種／成熟／搬回→灶料理→手動休息，沒有資源／XP／狀態注入。原H42已把園灶狀態及控制接起來，這輪不能重做相同面板當新進展。具體source問題：solo手動`order=rest`到100，rest分支只清task、不清order，下一拍又由手動意圖開始rest，必須另清除才能回原生活／工程。原UI只說「歇息」，沒有提示這種持續命令；自主休息到85本來就正常結束。正常UI重現收據另留`HOMESTEAD-COMFORT-BASE-UI.json`，不把source推論當已執行證據。

H43最小改動：solo手動休息到原100目標，清這次rest意圖回自主，原急餓／攜物先回仍沿pick/task；自主到85不改，其他原指派因疲勞休息不可被清掉，legacy原持續rest保留。UI明示「歇到精神恢復（一次）」以及完成回自主；不用新flag/schema/API/需求數值或新休息面板。精神已滿UI灰掉並有可見理由，避免無用途命令。沒有改房屋／床休息率、飲食或技能效果。

驗收：solo首屋/無屋/床兩級manual休息真到100只清rest，完成後接回已立工程或日常；auto85與非rest玩家意圖、legacy持續語義不改。急餓／攜物／改令／重複點／中段原存讀，無無限躺回／提前感受／XP；既有資料不添欄位。五固定seed配對只將舊版manual完成時加clear作oracle，world逐拍等價；不同dt回放及原完整適用聚合。真UI完整生活流程再休息，達標後不需手動clear，可由舊工程接續；鍵盤／390px。每輪非作者審查修復，再按結果定後兩輪，不預先塞新內容。

來源：[Yuka RestGoal原始碼](https://raw.githubusercontent.com/Mugen87/yuka/master/examples/goal/src/Goals.js)例子restDuration後COMPLETED、terminate重設疲勞，借『目標完成要回控制流程』；不搬其計時、瞬間清疲勞或引擎。[Stonehearth開發者2017 Alpha20](https://store.steampowered.com/news/posts/?appids=253250&enddate=1484876676)以實吃／床／遮蔽對應可檢查thoughts，借建設實際使用回饋，不搬情緒工作倍率／房間／軍事。來源是歷史設計與開源code閱讀，未跑外部遊戲。TinyLife SleepAction頁與Exile205本次讀取失敗，不當已核本文或當前共識；不藉來源失敗安裝依賴。
